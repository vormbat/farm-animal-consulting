"""산란계 중추가격 파서 골든 테스트.

표가 그림 안에 있는 수집원이라 검증이 두 갈래다.

1. **표 복원 로직**은 OCR 결과를 얼려 둔 픽스처(`kegg_pullet_boxes.json`)로
   검증한다. OCR 엔진이 없어도 돌아가므로 기본 CI 가 가벼워지고, 실패했을 때
   "OCR 이 틀렸나 복원이 틀렸나"가 바로 갈린다.
2. **OCR 자체**는 원본 이미지로 한 번 확인한다. 엔진(ocr 엑스트라)이 없으면
   건너뛴다.
"""

from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.core.ocr import TextBox
from pipeline.sources.pullet_price import latest_point, parse_post, parse_table

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
BOXES = FIXTURES / "kegg_pullet_boxes.json"
IMAGE = FIXTURES / "kegg_pullet_table.jpg"
POST = FIXTURES / "kegg_pullet_view3.html"


@pytest.fixture(scope="module")
def boxes() -> list[TextBox]:
    return [TextBox(**item) for item in json.loads(BOXES.read_text(encoding="utf-8"))]


@pytest.fixture(scope="module")
def html() -> str:
    return POST.read_text(encoding="utf-8")


def test_본문_이미지와_제목을_읽는다(html: str) -> None:
    assert parse_post(html) == {
        "title": "중추가격",
        "image_url": "https://kegg.or.kr/upload/c3442c64b342d0753b378a1c93911f06.jpg",
    }


def test_공유용_섬네일을_본문_이미지로_착각하지_않는다(html: str) -> None:
    # og:image 는 본문 표가 아니라 카카오 공유 썸네일이다. 페이지 위쪽에 있어
    # 범위를 좁히지 않으면 그쪽을 먼저 집는다.
    assert "e6385b4f1d5c3bbd949f4fd7b6cf399b" in html
    assert "e6385b4f1d5c3bbd949f4fd7b6cf399b" not in parse_post(html)["image_url"]


def test_본문_이미지가_없으면_ParseError() -> None:
    with pytest.raises(ParseError, match="표 이미지를 찾지 못했습니다"):
        parse_post("<html><body><p>점검 중</p></body></html>")


def test_연도_여섯_줄을_최신순으로_읽는다(boxes: list[TextBox]) -> None:
    assert [row["year"] for row in parse_table(boxes)] == [2026, 2025, 2024, 2023, 2022, 2021]


def test_아직_안_나온_달은_비워_둔다(boxes: list[TextBox]) -> None:
    current = parse_table(boxes)[0]
    assert current["months"] == [6400, 6400, 6560, 6900, 6900, 7020, 7400, *[None] * 5]
    assert current["average"] == 6797


def test_지난_해는_열두_달이_모두_찬다(boxes: list[TextBox]) -> None:
    for row in parse_table(boxes)[1:]:
        assert None not in row["months"], row["year"]


def test_모든_줄이_원문_평균과_맞는다(boxes: list[TextBox]) -> None:
    # 이 테스트가 통과한다는 것은 곧 표의 모든 숫자를 제대로 읽었다는 뜻이다.
    for row in parse_table(boxes):
        filled = [month for month in row["months"] if month is not None]
        assert abs(sum(filled) // len(filled) - row["average"]) <= 1, row["year"]


def test_그래프_범례의_연도를_표의_행으로_세지_않는다(boxes: list[TextBox]) -> None:
    # 이미지 위쪽 꺾은선 그래프에도 2021~2026 범례와 축 눈금 숫자가 있다.
    legend = [box for box in boxes if box.text == "2026" and box.top < 1200]
    assert legend, "픽스처에 그래프 범례가 있어야 이 테스트가 의미 있다"
    assert len(parse_table(boxes)) == 6


def test_값을_잘못_읽으면_검산에서_걸린다(boxes: list[TextBox]) -> None:
    # 2021년 3월 5,900 을 6,900 으로 잘못 읽은 상황. 평균이 어긋나므로
    # 화면에 올라가는 대신 이전 값을 유지해야 한다.
    broken = [
        replace(box, text="6,900") if (box.text == "5,900" and box.top > 1400) else box
        for box in boxes
    ]
    assert any(box.text == "6,900" and box.top > 1400 for box in broken)
    with pytest.raises(ParseError, match="검산 실패"):
        parse_table(broken)


def test_열이_열셋이_아니면_ParseError(boxes: list[TextBox]) -> None:
    # 협회가 표에서 평균 열을 빼는 식으로 모양을 바꾸면 조용히 밀려 읽히는
    # 대신 여기서 멈춰야 한다.
    without_average = [box for box in boxes if box.left < 1700]
    with pytest.raises(ParseError, match="열이 13개"):
        parse_table(without_average)


def test_표를_못_찾으면_ParseError() -> None:
    with pytest.raises(ParseError, match="연도 행"):
        parse_table([])


def test_값이_있는_가장_최근_달을_고른다(boxes: list[TextBox]) -> None:
    assert latest_point(parse_table(boxes)) == (2026, 7, 7400)


def test_올해_값이_아직_없으면_지난해에서_찾는다() -> None:
    years = [
        {"year": 2027, "months": [None] * 12, "average": 0},
        {"year": 2026, "months": [*[6400] * 11, 7400], "average": 6483},
    ]
    assert latest_point(years) == (2026, 12, 7400)


def test_원본_이미지에서_같은_표가_나온다() -> None:
    """OCR 엔진까지 포함한 확인. `uv run --extra ocr pytest` 에서만 돈다."""
    pytest.importorskip("rapidocr_onnxruntime", reason="ocr 엑스트라가 설치되지 않았습니다")
    from pipeline.core.ocr import read_text_boxes

    rows = parse_table(read_text_boxes(IMAGE.read_bytes()))
    assert latest_point(rows) == (2026, 7, 7400)
    assert [row["average"] for row in rows] == [6797, 6091, 5402, 5389, 5491, 6545]
