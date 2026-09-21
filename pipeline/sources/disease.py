"""The Poultry Site — 「Diseases of Poultry」 수집 + 한글 번역.

## 왜 미리 번역해 두는가

브라우저에서 그때그때 번역하지 않는다. 무료 번역 엔드포인트는 호출이 몰리면
IP 단위로 막히고, 그러면 사용자가 검색할 때마다 실패해 기능 자체를 못 쓰게 된다.
수집 시점에 번역까지 끝내 결과만 정적 JSON 으로 내려준다.

## 증분 번역

전체 영문이 17만자쯤 되어 매번 다시 번역하면 낭비이고 차단도 부른다. 직전
산출물을 받아(`reuses_previous`) **영문이 그대로인 문단은 기존 번역을 재사용**한다.
이번 실행에서 일부 번역이 실패해도 영문을 그대로 두므로 다음 실행이 빈 곳만
채운다 — 회차를 거듭하며 완성된다.

## 한글 검색

제목 기계번역만으로는 현장 병명으로 검색이 안 걸린다(MAREK'S DISEASE →
"마렉의 병"). 그래서 주요 질병에는 수의 현장에서 실제로 쓰는 이름을
`KO_ALIASES` 에 직접 넣고, 있으면 그쪽을 표제어로 쓴다. 원문 제목이 전부
대문자라 기계번역이 약어까지 망가뜨리는 문제(`(IB)` → `(Ib)`)도 이걸로 피한다.
"""

from __future__ import annotations

import html as html_module
import re
import time
import urllib.parse
from collections.abc import Mapping
from typing import Any

from pipeline.core.errors import ParseError
from pipeline.core.http import Session, fetch_text
from pipeline.core.source import Source
from pipeline.schemas.disease import DiseaseBook

BASE = "https://www.thepoultrysite.com"
INDEX_URL = f"{BASE}/publications/diseases-of-poultry"

NOTE = "영문 원문을 기계번역한 것으로, 진단·처방의 근거로 쓰기 전에 원문 확인이 필요합니다."

#: 본문이 아닌 공통 문구. 뉴스레터 안내가 전 문서에 붙어 있어 넓게 잡는다.
BOILERPLATE = re.compile(
    r"Global Ag Media provides|Sign up to our|newsletter|^©|cookie|privacy policy", re.I
)

#: 칠면조 전용 질병 등 국내 양계 컨설팅에서 쓸 일이 없는 항목.
#: 여기 두지 않으면 다음 수집 때 원문에서 다시 긁혀 되살아난다.
EXCLUDE_SLUGS = frozenset(
    {
        "haemorrhagic-enteritis-of-turkeys",
        "spontaneous-rupture-of-the-caudial-renal-artery-in-turkeys",
        "round-heart-in-turkeys-dilated-cardiomyopathy",
        "gizzard-impaction-in-turkey-poults",
        "acute-propanebutane-intoxication",
        "riemerella-anatipestifer-infections",
        "adenocarcinomatosis",
    }
)

#: 현장에서 쓰는 한글 병명. 키는 URL 슬러그(고정값)라 사이트 제목이 바뀌어도 맞는다.
KO_ALIASES: dict[str, list[str]] = {
    "escherichia-coli-infections": ["대장균증", "대장균 감염", "콜리바실로시스"],
    "salmonelloses": ["살모넬라증", "살모넬라"],
    "paratyphoid-infections": ["파라티푸스"],
    "fowl-cholera": ["가금 콜레라", "닭콜레라"],
    "mycoplasma": ["마이코플라스마", "만성호흡기병", "CRD", "MG", "MS"],
    "necrotic-enteritis": ["괴사성 장염"],
    "botulism": ["보툴리즘", "보툴리누스"],
    "avian-tuberculosis": ["가금 결핵"],
    "egg-drop-syndrome-1976": ["산란저하증후군", "EDS", "감란증후군"],
    "infectious-bursal-disease-gumboro": ["전염성 F낭병", "감보로", "IBD", "감보로병"],
    "infectious-bronchitis-ib": ["전염성 기관지염", "IB"],
    "fowl-pox": ["계두", "가금 두창"],
    "laryngotracheitis": ["전염성 후두기관염", "ILT"],
    "swollen-head-syndrome": ["종창두증후군", "부어오른 머리 증후군", "SHS"],
    "infectious-encephalomyelitis": ["전염성 뇌척수염", "AE"],
    "newcastle-disease": ["뉴캐슬병", "뉴캣슬병", "ND", "가금 뉴캐슬"],
    "reovirus-infections": ["레오바이러스", "바이러스성 관절염"],
    "virusinduced-neoplastic-diseases-mareks-disease": ["마렉병", "마렉씨병", "MD"],
    "lymphoid-leukosis": ["림프성 백혈병", "임파구성 백혈병"],
    "coccidiosis": ["콕시듐증", "콕시디아", "구포자충증"],
    "histomonosis": ["히스토모나스", "흑두병"],
    "ascaridiosis": ["회충증"],
    "knemidokoptosis": ["닭 옴진드기증", "각기병(다리비늘진드기)"],
    "aspergillosis": ["아스페르길루스증", "곰팡이성 폐렴"],
    "candidiasis": ["칸디다증"],
    "aflatoxicosis": ["아플라톡신 중독"],
    "fusariotoxicoses": ["푸사리움 독소중독", "곰팡이독소"],
    "vitamin-e-deficiency": ["비타민E 결핍"],
    "fatty-liver-haemorrhagic-syndrome": ["지방간 출혈 증후군", "FLHS"],
    "slipped-tendon-perosis": ["건활탈", "페로시스"],
    "gout": ["통풍", "요산증"],
    "cage-layer-fatigue": ["케이지 산란계 피로증", "골연화"],
    "deep-pectoral-myopathy": ["심부 흉근병증", "녹색근육병"],
    "amyloidosis": ["아밀로이드증"],
    "pulmonary-hypertension-ascitis-syndrome-in": ["복수증", "폐동맥고혈압증후군"],
    "gastrointestinal-impaction": ["소화관 폐색"],
}

_LINK = re.compile(
    r'href="(/publications/diseases-of-poultry/(\d+)/([^"#?]+))"[^>]*>([\s\S]{0,200}?)</a>'
)
_TAGS = re.compile(r"<[^>]+>")
_SCRIPTS = re.compile(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>")
_FIG_BLOCK = re.compile(r'<div class="fig">([\s\S]*?)<div class="break">')
_PARAGRAPH = re.compile(r"<p[^>]*>([\s\S]*?)</p>")
_IMG = re.compile(r"<img[^>]+>")
_LEADING_FIGURE_NUMBERS = re.compile(r"^((?:\d{1,4}\.\s*)+)")


def clean_text(raw: str) -> str:
    """태그를 걷고 앞머리 그림번호를 뗀다.

    원문은 문단 앞에 그림번호를 붙여 둔다("255.256.257. The Newcastle disease…").
    화면에서는 뜻이 없어 버린다.
    """
    text = html_module.unescape(_TAGS.sub("", raw))
    text = re.sub(r"\s+", " ", text).strip()
    match = _LEADING_FIGURE_NUMBERS.match(text)
    return text[match.end() :].strip() if match else text


def parse_index(html: str) -> list[dict[str, str]]:
    """목록 페이지에서 질병 문서 목록을 뽑는다."""
    found: dict[str, dict[str, str]] = {}
    for match in _LINK.finditer(html):
        doc_id, slug = match.group(2), match.group(3)
        title = clean_text(match.group(4))
        if doc_id not in found or (not found[doc_id]["title_en"] and title):
            found[doc_id] = {
                "id": doc_id,
                "slug": slug,
                "title_en": title,
                "url": BASE + match.group(1),
            }
    rows = [found[key] for key in sorted(found, key=int) if found[key]["slug"] not in EXCLUDE_SLUGS]
    if not rows:
        raise ParseError("질병 목록이 비었습니다 — 사이트 구조가 바뀌었을 수 있습니다")
    return rows


def _content_image(block: str) -> str | None:
    """블록 안 첫 본문 사진. 같은 CDN 에 로고(svg)도 올라와 있어 걸러 낸다."""
    for tag in _IMG.findall(block):
        match = re.search(r'src="([^"]+)"', tag) or re.search(r'data-src="([^"]+)"', tag)
        if not match:
            continue
        url = match.group(1)
        if not url.startswith("http") or "globalagmedia.com" not in url:
            continue
        if url.lower().endswith(".svg") or "logo" in url.lower():
            continue
        return url
    return None


def parse_detail(html: str) -> list[dict[str, Any]]:
    """상세 페이지에서 (문단, 사진) 짝을 뽑는다."""
    start = html.find("<h1")
    segment = _SCRIPTS.sub("", html[start if start > 0 else 0 :])

    rows: list[dict[str, Any]] = []
    blocks = _FIG_BLOCK.findall(segment)
    if blocks:
        # 원문은 사진 한 장과 그 설명을 <div class="fig"> 한 덩어리로 묶어 둔다.
        # 이 구조를 따라가면 어느 사진이 어느 설명의 것인지 정확히 맞는다
        # (그림번호로 짝지으려 했더니 대부분의 문서에 번호가 아예 없었다).
        for block in blocks:
            body = " ".join(_PARAGRAPH.findall(block))
            text = clean_text(body)
            if len(text) < 25 or BOILERPLATE.search(text):
                continue
            rows.append({"en": text, "image": _content_image(block)})
    else:
        for raw in _PARAGRAPH.findall(segment):
            text = clean_text(raw)
            if len(text) > 40 and not BOILERPLATE.search(text):
                rows.append({"en": text, "image": None})
    return rows


# ── 번역 ──────────────────────────────────────────────────────────────────
# 무료 엔드포인트는 호출이 몰리면 막힌다. 하나만 쓰면 그날 번역이 통째로
# 실패하므로 성격이 다른 둘을 차례로 시도하고, 그래도 안 되면 영문을 남긴다.


def _translate_clients5(session: Session, text: str) -> str | None:
    query = urllib.parse.urlencode({"client": "dict-chrome-ex", "sl": "en", "tl": "ko", "q": text})
    payload = session.get_json(f"https://clients5.google.com/translate_a/t?{query}", timeout=20)
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, str):
            return first
        if isinstance(first, list):
            return "".join(part for part in first if isinstance(part, str))
    return None


def _translate_gtx(session: Session, text: str) -> str | None:
    query = urllib.parse.urlencode({"client": "gtx", "sl": "en", "tl": "ko", "dt": "t", "q": text})
    payload = session.get_json(
        f"https://translate.googleapis.com/translate_a/single?{query}", timeout=20
    )
    return "".join(part[0] for part in payload[0] if part[0])


TRANSLATORS = (_translate_clients5, _translate_gtx)


def translate(session: Session, text: str) -> str | None:
    """영→한. 모두 실패하면 None — 부르는 쪽이 영문을 그대로 둔다."""
    for translator in TRANSLATORS:
        try:
            result = (translator(session, text) or "").strip()
            if result:
                return result
        except Exception:  # noqa: BLE001 - 번역 실패는 수집 실패가 아니다
            continue
    return None


def previous_by_slug(previous: Mapping[str, Any] | None) -> dict[str, dict[str, Any]]:
    """직전 산출물을 슬러그로 찾을 수 있게 편다."""
    if not previous:
        return {}
    return {row["slug"]: row for row in previous.get("diseases", []) if row.get("slug")}


def merge_translations(
    session: Session | None,
    paragraphs: list[dict[str, Any]],
    old: Mapping[str, Any],
) -> list[dict[str, Any]]:
    """영문이 같은 문단은 기존 번역을 그대로 쓰고, 새 문단만 번역한다."""
    known = {row["en"]: row.get("ko") for row in old.get("paragraphs", [])}

    merged: list[dict[str, Any]] = []
    for row in paragraphs:
        reused = known.get(row["en"])
        if reused and reused != row["en"]:
            merged.append({**row, "ko": reused})
            continue
        translated = translate(session, row["en"]) if session else None
        if translated:
            time.sleep(0.4)
        # 번역이 없으면 영문을 그대로 둔다. 다음 실행이 이 문단만 다시 시도한다.
        merged.append({**row, "ko": translated or row["en"]})
    return merged


def collect(previous: Mapping[str, Any] | None = None) -> dict[str, Any]:
    index = parse_index(fetch_text(INDEX_URL, use_proxies=False))
    old_by_slug = previous_by_slug(previous)
    session = Session()

    diseases: list[dict[str, Any]] = []
    for item in index:
        slug = item["slug"]
        old = old_by_slug.get(slug, {})

        try:
            paragraphs = parse_detail(fetch_text(item["url"], use_proxies=False))
        except Exception:  # noqa: BLE001 - 한 종이 막혀도 나머지는 모은다
            paragraphs = []

        if not paragraphs and old.get("paragraphs"):
            # 본문을 못 받았으면 이전 것을 그대로 들고 간다.
            diseases.append(dict(old))
            continue
        if not paragraphs:
            continue

        aliases = KO_ALIASES.get(slug, [])
        if aliases:
            title_ko = aliases[0]
        elif old.get("title_en") == item["title_en"] and old.get("title_ko"):
            title_ko = old["title_ko"]
        else:
            title_ko = translate(session, item["title_en"].title()) or item["title_en"]

        diseases.append(
            {
                **item,
                "title_ko": title_ko,
                "aliases": aliases,
                "paragraphs": merge_translations(session, paragraphs, old),
            }
        )

    if not diseases:
        raise ParseError("질병을 한 종도 모으지 못했습니다")

    return {"note": NOTE, "count": len(diseases), "diseases": diseases}


SOURCE = Source(
    id="disease",
    title="양계질병 사전(The Poultry Site)",
    output="disease/diseases.json",
    model=DiseaseBook,
    # 원문은 참고서라 거의 바뀌지 않는다. 매달 확인하면 충분하다.
    schedule="monthly",
    source_url=INDEX_URL,
    collect=collect,
    reuses_previous=True,
)
