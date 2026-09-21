"""이미지에서 글자와 그 위치를 읽는다.

원본은 Node 서브프로세스(`sharp` + `tesseract.js`)를 띄웠지만 여기서는
파이썬 안에서 끝낸다. `rapidocr-onnxruntime` 은 모델(16MB)을 wheel 에 담아
오므로 **수집 도중 제3자에게서 내려받는 것이 없고**, tesseract 처럼 러너에
시스템 패키지를 깔아야만 돌아가는 것도 아니라 로컬과 CI 가 똑같이 동작한다.

무거운 의존성(onnxruntime·opencv)이라 `ocr` 엑스트라로 떼어 두고 여기서
**늦게 import** 한다. 레지스트리가 모든 수집원 모듈을 훑기 때문에, 모듈
꼭대기에서 import 하면 OCR 과 무관한 수집 작업까지 이 패키지를 요구하게 된다.

글자만이 아니라 **좌표를 함께** 돌려주는 것이 요점이다. 좌표가 있으면
잘라내기 좌표를 코드에 박지 않고도 표의 행·열을 되살릴 수 있다.
"""

from __future__ import annotations

import statistics
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from functools import cache
from typing import Any

from pipeline.core.errors import CollectError


@dataclass(frozen=True)
class TextBox:
    """읽어 낸 글자 한 덩어리와 그 외곽 사각형."""

    text: str
    left: float
    top: float
    right: float
    bottom: float
    #: 0~1. 낮으면 잘못 읽었을 가능성이 크다.
    score: float

    @property
    def center_x(self) -> float:
        return (self.left + self.right) / 2

    @property
    def center_y(self) -> float:
        return (self.top + self.bottom) / 2

    @property
    def width(self) -> float:
        return self.right - self.left

    @property
    def height(self) -> float:
        return self.bottom - self.top


@cache
def _engine() -> Any:
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as error:  # pragma: no cover - 엑스트라 미설치 환경
        raise CollectError(
            "OCR 엔진이 없습니다. `uv run --extra ocr python -m pipeline run ...` 로 실행하세요."
        ) from error
    return RapidOCR()


def read_text_boxes(image: bytes) -> list[TextBox]:
    """이미지 바이트에서 글자 상자를 읽는다. 위→아래, 왼→오 순서로 정렬해 돌려준다."""
    # 엔진이 바이트를 그대로 받는다. 중간에 Pillow 로 열었다 다시 넘기면
    # 재인코딩 과정에서 결과가 미세하게 달라질 수 있어 원본 바이트를 그냥 준다.
    result, _ = _engine()(image)

    boxes: list[TextBox] = []
    for polygon, text, score in result or []:
        xs = [float(point[0]) for point in polygon]
        ys = [float(point[1]) for point in polygon]
        boxes.append(
            TextBox(
                # 원문 숫자 사이에 공백이 끼어 들어오는 일이 잦다. 붙여서 본다.
                text="".join(str(text).split()),
                left=min(xs),
                top=min(ys),
                right=max(xs),
                bottom=max(ys),
                score=float(score),
            )
        )

    boxes.sort(key=lambda box: (box.top, box.left))
    return boxes


def cluster_centers(values: Iterable[float], tolerance: float) -> list[float]:
    """가까운 좌표끼리 묶어 대표값(중앙값) 목록을 만든다.

    표의 열 위치를 픽셀로 박아 두지 않기 위해 쓴다. 이미지 크기가 바뀌어도
    같은 표라면 열 개수는 그대로이므로, 개수를 검사하는 쪽이 훨씬 안전하다.
    """
    groups: list[list[float]] = []
    for value in sorted(values):
        if groups and value - groups[-1][-1] <= tolerance:
            groups[-1].append(value)
        else:
            groups.append([value])
    return [statistics.median(group) for group in groups]


def nearest_index(centers: Sequence[float], value: float) -> int:
    return min(range(len(centers)), key=lambda index: abs(centers[index] - value))


__all__ = ["TextBox", "cluster_centers", "nearest_index", "read_text_boxes"]
