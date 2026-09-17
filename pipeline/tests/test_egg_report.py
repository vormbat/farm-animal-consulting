"""주간 계란 수급 정보 PDF 파서 골든 테스트.

픽스처는 PDF 원본이 아니라 거기서 뽑아낸 텍스트다. 우리가 붙잡아야 할 것은
pypdf 의 추출 결과가 아니라 그 텍스트를 절·문단으로 가르는 우리 규칙이고,
텍스트로 두면 무엇이 달라졌는지 diff 로 바로 보인다.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.sources.egg_report import (
    attach_no,
    latest_post,
    parse_report,
    pdf_text,
    post_title,
)

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


@pytest.fixture(scope="module")
def report() -> dict:
    text = (FIXTURES / "ekape_egg_report_58.txt").read_text(encoding="utf-8")
    return parse_report(text)


class Test게시판:
    LIST = """
    <li><a onClick="goBoardView('00041083')">
      <p>9월 7일 주간 계란 수급 정보(58차)</p><span>2026-09-15</span></a></li>
    <li><a onClick="goBoardView('00041073')">
      <p>8월 31일 주간 계란 수급 정보(57차)</p><span>2026-09-08</span></a></li>
    """

    def test_맨_위_글이_최신이다(self) -> None:
        assert latest_post(self.LIST) == "00041083"

    def test_제목과_게시일을_집는다(self) -> None:
        title, posted = post_title(self.LIST, "00041083")
        assert title == "9월 7일 주간 계란 수급 정보(58차)"
        assert posted == "2026-09-15"

    def test_두_번째_글도_제_것을_집는다(self) -> None:
        title, posted = post_title(self.LIST, "00041073")
        assert title == "8월 31일 주간 계란 수급 정보(57차)"
        assert posted == "2026-09-08"

    def test_글이_없으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="글 번호"):
            latest_post("<html><body>등록된 게시물이 없습니다</body></html>")

    def test_첨부가_없으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="첨부 번호"):
            attach_no("<html><body>본문만 있음</body></html>")


class TestPDF:
    def test_PDF_가_아니면_ParseError(self) -> None:
        # 게시판이 로그인 페이지를 돌려주는 경우가 이렇게 잡힌다.
        with pytest.raises(ParseError, match="PDF"):
            pdf_text(b"<html>login required</html>")


class Test보고서:
    def test_머리_정보를_읽는다(self, report: dict) -> None:
        assert report["issue"] == "제2026-58호"
        assert report["period"] == "2026. 9. 7. ~ 9. 13."
        assert report["headline"] == "왕·특란 강보합, 대란 보합, 잔알 공급우위로 약보합세"

    def test_다섯_절을_번호_순서대로_가른다(self, report: dict) -> None:
        assert [s["number"] for s in report["sections"]] == [1, 2, 3, 4, 5]
        assert report["sections"][1]["title"] == "유통 동향"

    def test_요약_형식_절을_읽는다(self, report: dict) -> None:
        # '<요약>' 아래의 `- (기관) 문단` 형식
        second = report["sections"][1]["bullets"]
        assert [b["org"] for b in second] == ["식용란선별포장업협회", "한국계란산업협회"]
        assert second[0]["text"].startswith("현재 계란 생산량은")

    def test_표_형식_절도_읽는다(self, report: dict) -> None:
        # 왼쪽 칸에 기관 이름, 오른쪽에 ▶ 문단이 여러 개인 형식
        fifth = report["sections"][4]["bullets"]
        assert len(fifth) >= 8
        assert fifth[0]["org"] == "축산물품질평가원"
        assert any(b["org"] == "대한양계협회" for b in fifth)

    def test_기관_이름이_문장_조각으로_더럽혀지지_않는다(self, report: dict) -> None:
        # '예상됨.' 같은 짧은 이어짐 줄이 이름으로 새면 여기서 걸린다.
        orgs = {b["org"] for s in report["sections"] for b in s["bullets"] if b["org"]}
        assert orgs == {
            "대한양계협회",
            "식용란선별포장업협회",
            "축산물품질평가원",
            "한국계란산업협회",
        }

    def test_쪽_번호_뒤의_머리말이_문단에_붙지_않는다(self, report: dict) -> None:
        last = report["sections"][4]["bullets"][-1]["text"]
        assert "- 5 -" not in last
        assert last.endswith("전망됨.")

    def test_끊긴_문장을_한_문단으로_잇는다(self, report: dict) -> None:
        # PDF 는 화면 폭에 맞춰 문장을 끊는다. 이어 붙이지 않으면 문단이 토막난다.
        first = report["sections"][0]["bullets"][1]["text"]
        assert "\n" not in first
        assert len(first) > 80

    def test_숫자_표만_있는_절은_문단이_비어_있다(self, report: dict) -> None:
        # 4절은 산지가격 표뿐이다. 표를 문단으로 잘못 읽으면 여기서 걸린다.
        assert report["sections"][3]["bullets"] == []

    def test_절_제목이_없으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="절 제목"):
            parse_report("주간 계란 수급 정보\n내용 없음")
