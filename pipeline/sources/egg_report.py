"""다봄 게시판의 '주간 계란 수급 정보' PDF 수집.

세 단계를 거친다.

    list.do    게시판 목록에서 가장 최근 글의 번호·제목·게시일
    detail.do  그 글의 첨부 번호
    attachfileDownload.do  PDF 본문

PDF 를 다시 내려받는 비용이 크지 않아 매번 받아 읽는다. 대신 내용이
지난주와 같으면 write_json 이 파일을 건드리지 않으므로 커밋은 생기지 않는다.
"""

from __future__ import annotations

import io
import re
from typing import Any

from pypdf import PdfReader

from pipeline.core.errors import ParseError
from pipeline.core.html import normalize
from pipeline.core.http import fetch_bytes, fetch_text
from pipeline.core.source import Source
from pipeline.schemas.egg_report import EggReport

BOARD_INFO_NO = "0159"
LIST_URL = f"https://www.ekapepia.com/v3/board/list.do?menuSn=51&boardInfoNo={BOARD_INFO_NO}"
DETAIL_URL = (
    "https://www.ekapepia.com/v3/board/detail.do?boardInfoNo={info}&boardNo={no}&dmlType=SELECT"
)
ATTACH_URL = "https://www.ekapepia.com/common/attachfile/attachfileDownload.do?attachNo={no}"

#: 목록의 각 글은 `goBoardView('00041083')` 로 열린다. 첫 번째가 최신 글이다.
_BOARD_NO = re.compile(r"goBoardView\(\s*'(\d+)'\s*\)")
_ATTACH_NO = re.compile(r"attachNo=(\d+)")

_SECTION = re.compile(r"^[ \t]*(\d)[ \t]{1,4}(\S[^\n]{0,40}?)[ \t]*$", re.M)
_ISSUE = re.compile(r"제\s*(\d{4}-\d+)\s*호")
_PERIOD = re.compile(r"\(\s*(\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*~\s*\d{1,2}\.\s*\d{1,2}\.)\s*\)")
_ORG_BULLET = re.compile(r"^\s*-\s*\(([^)]{2,20})\)\s*(.*)$")
_HEADLINE = re.compile(r"^\s*◆\s*(.+)$")
_ARROW_BULLET = re.compile(r"^\s*▶\s*(.+)$")
#: PDF 쪽 번호. 원문은 각 쪽 끝에 `- 5 -` 를 찍는다.
_PAGE_FOOTER = re.compile(r"^-\s*\d+\s*-$")


def latest_post(html: str) -> str:
    match = _BOARD_NO.search(html)
    if not match:
        raise ParseError("게시판 목록에서 글 번호를 찾지 못했습니다")
    return match.group(1)


def post_title(html: str, board_no: str) -> tuple[str | None, str | None]:
    """목록 HTML 에서 그 글의 제목과 게시일을 집는다."""
    at = html.find(f"goBoardView('{board_no}')")
    if at < 0:
        return None, None
    block = html[at : at + 900]
    title = re.search(r"<p>([^<]{4,120})</p>", block)
    posted = re.search(r"(\d{4}-\d{2}-\d{2})", block)
    return (
        normalize(title.group(1)) if title else None,
        posted.group(1) if posted else None,
    )


def attach_no(html: str) -> str:
    match = _ATTACH_NO.search(html)
    if not match:
        raise ParseError("게시글에서 첨부 번호를 찾지 못했습니다")
    return match.group(1)


def pdf_text(raw: bytes) -> str:
    if raw[:4] != b"%PDF":
        raise ParseError("첨부가 PDF 가 아닙니다 — 게시판 구조가 바뀌었을 수 있습니다")
    try:
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as error:  # noqa: BLE001 - pypdf 는 다양한 예외를 던진다
        raise ParseError(f"PDF 텍스트를 뽑지 못했습니다: {error}") from error


def _bullets(body: str) -> list[dict[str, Any]]:
    """한 절 안의 문단들.

    원문은 절마다 문단을 두 가지 방식으로 적는다.

        <요약> 아래  →  `◆ 한 줄 요약` 과 `- (기관명) 문단`
        표 형식      →  왼쪽 칸에 기관 이름, 오른쪽 칸에 `▶ 문단` 여러 개

    둘을 다 읽는다. PDF 는 문장을 화면 폭에 맞춰 끊어 놓으므로, 새 문단이
    시작되기 전까지의 줄은 앞 문단에 이어 붙인다. 그러지 않으면 화면에서
    문장이 엉뚱한 곳에서 잘린다.
    """
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    bullets: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    #: 표 형식에서 왼쪽 칸의 기관 이름. 뒤따르는 ▶ 문단들이 모두 이 기관의 말이다.
    table_org: str | None = None

    index = 0
    while index < len(lines):
        line = lines[index]

        # 표 머리글. 여기서 멈추지 않는 이유는 '□ 협회 조사 동향' 처럼
        # 머리글 아래에 본문이 이어지는 절이 있기 때문이다.
        # 쪽 번호('- 5 -')를 만나면 그 쪽의 문단은 거기서 끝난다. 이걸 넘기면
        # 다음 쪽 머리말이 앞 문단 끝에 달라붙는다.
        if (
            line.startswith(("□", "<참고>", "<요약>", "(단위", "*"))
            or _PAGE_FOOTER.match(line)
            or line in ("협회 의견", "기관 의견", "참고")
        ):
            current = None
            index += 1
            continue

        headline = _HEADLINE.match(line)
        if headline:
            current = {"org": None, "text": headline.group(1).strip()}
            bullets.append(current)
            index += 1
            continue

        org_bullet = _ORG_BULLET.match(line)
        if org_bullet:
            current = {"org": org_bullet.group(1).strip(), "text": org_bullet.group(2).strip()}
            bullets.append(current)
            index += 1
            continue

        arrow = _ARROW_BULLET.match(line)
        if arrow:
            current = {"org": table_org, "text": arrow.group(1).strip()}
            bullets.append(current)
            index += 1
            continue

        # 기관 이름 칸인지 판단한다. 이름은 '식용란선별' / '포장업협회' 처럼
        # 여러 줄로 쪼개져 나오고 바로 뒤에 ▶ 문단이 붙는다. 뒤를 내다보지 않고
        # 길이만으로 가르면, '증가하였음.' 같은 짧은 이어짐 줄까지 이름으로 새어
        # 앞 문단이 잘린다.
        run: list[str] = []
        ahead = index
        while ahead < len(lines) and len(run) < 3 and _looks_like_org_fragment(lines[ahead]):
            run.append(lines[ahead])
            ahead += 1
        if run and ahead < len(lines) and _ARROW_BULLET.match(lines[ahead]):
            table_org = "".join(run)
            current = None
            index = ahead
            continue

        if current is not None:
            current["text"] = f"{current['text']} {line}"
        index += 1

    for bullet in bullets:
        bullet["text"] = normalize(bullet["text"])
    return [bullet for bullet in bullets if bullet["text"]]


#: 이 보고서는 문장을 '…했음.' '…예상됨.' 처럼 명사형으로 끝낸다.
#: 기관 이름은 그렇게 끝나지 않으므로, 이걸로 문장 끝 조각을 걸러낸다.
_SENTENCE_TAIL = ("음", "임", "함", "됨", "함.", ".", ",")


def _looks_like_org_fragment(line: str) -> bool:
    """기관 이름 칸의 한 조각인가.

    짧고, 띄어쓰기가 없고, 숫자가 없고, 문장처럼 끝나지 않아야 한다.
    마지막 조건이 없으면 '예상됨.' 같은 짧은 이어짐 줄이 이름으로 새어
    앞 문단이 잘리고 다음 문단의 기관 이름이 더럽혀진다.
    """
    if len(line) > 12 or " " in line or any(ch.isdigit() for ch in line):
        return False
    return not line.endswith(_SENTENCE_TAIL)


def parse_report(text: str) -> dict[str, Any]:
    matches = list(_SECTION.finditer(text))
    if not matches:
        raise ParseError("보고서에서 절 제목(1 생산 동향 …)을 찾지 못했습니다")

    sections: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end() : end]
        sections.append(
            {
                "number": int(match.group(1)),
                "title": normalize(match.group(2)),
                "bullets": _bullets(body),
            }
        )

    issue = _ISSUE.search(text)
    period = _PERIOD.search(text)
    headline = next(
        (
            bullet["text"]
            for section in sections
            for bullet in section["bullets"]
            if bullet["org"] is None
        ),
        None,
    )

    return {
        "issue": f"제{issue.group(1)}호" if issue else None,
        "period": normalize(period.group(1)) if period else None,
        "headline": headline,
        "sections": sections,
    }


def collect() -> dict[str, Any]:
    listing = fetch_text(LIST_URL)
    board_no = latest_post(listing)
    title, posted_at = post_title(listing, board_no)

    detail_url = DETAIL_URL.format(info=BOARD_INFO_NO, no=board_no)
    attachment = attach_no(fetch_text(detail_url))
    pdf_url = ATTACH_URL.format(no=attachment)

    parsed = parse_report(pdf_text(fetch_bytes(pdf_url, timeout=60)))

    return {
        "title": title or "주간 계란 수급 정보",
        "posted_at": posted_at,
        "post_url": detail_url,
        "pdf_url": pdf_url,
        **parsed,
    }


SOURCE = Source(
    id="egg_report",
    title="주간 계란 수급 정보(다봄)",
    output="price/egg_report.json",
    model=EggReport,
    schedule="daily_0900",
    source_url=LIST_URL,
    collect=collect,
    # 호수·기간·머리글은 원문 서식이 바뀌면 빌 수 있지만, 그것만으로
    # 전체를 되돌릴 이유는 없다. 본문(sections)이 핵심이다.
    optional=frozenset({"issue", "period", "headline", "posted_at", "pdf_url"}),
)
