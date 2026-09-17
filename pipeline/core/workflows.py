"""수집 워크플로 YAML 생성.

워크플로를 손으로 관리하지 않는 이유는 두 가지다.

1. 수집원이 늘 때마다 YAML 을 복사하면 크론 주석과 실제 크론이 어긋난다.
2. 수집원마다 워크플로를 따로 두면 비슷한 시각에 끝나며 같은 저장소에
   동시에 push 해 충돌한다.

주기 그룹 하나당 워크플로 하나를 만들고, 그 그룹의 수집원을 한 번에 실행한
뒤 **커밋을 한 번만** 한다.
"""

from __future__ import annotations

from pathlib import Path

from pipeline.core.schedule import SCHEDULE_GROUPS, ScheduleGroup
from pipeline.registry import sources_in_group

HEADER = (
    "# 이 파일은 `uv run python -m pipeline gen-workflows` 가 만든다. 직접 고치지 않는다.\n"
    "# 주기를 바꾸려면 pipeline/core/schedule.py 를,\n"
    "# 수집원을 추가하려면 pipeline/sources/ 에 파일을 만든다.\n"
)


def workflow_filename(group: ScheduleGroup) -> str:
    return f"collect-{group.id.replace('_', '-')}.yml"


def render(group: ScheduleGroup) -> str:
    members = sources_in_group(group.id)
    source_list = "\n".join(f"      #   - {s.id}: {s.title}" for s in members)
    ids = " ".join(s.id for s in members)

    crons = "\n".join(f'    - cron: "{cron}"  # {group.kst_note}' for cron in group.cron)

    return f"""{HEADER}
name: 수집 · {group.title}

on:
  schedule:
{crons}
  workflow_dispatch:

permissions:
  contents: write

# 수집 워크플로끼리 같은 저장소에 동시에 push 하지 않도록 하나로 묶는다.
concurrency:
  group: collect-data
  cancel-in-progress: false

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: astral-sh/setup-uv@v6
        with:
          python-version: "3.12"
          enable-cache: true

      # 이 그룹에 속한 수집원:
{source_list}
      #
      # --keep-going: 한 수집원이 실패해도 나머지를 마저 돌린다. 실패한
      # 수집원은 직전 커밋 값을 유지하고 stale 로 표시된다(파일을 비우지 않는다).
      - name: 수집 실행
        run: uv run python -m pipeline run {ids} --keep-going

      - name: 산출물 검증
        if: always()
        run: uv run python -m pipeline validate

      - name: 결과 커밋
        if: always()
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git diff --staged --quiet && echo "변경 없음" && exit 0
          git commit -m "📊 {group.title} 수집 ($(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M KST'))"
          # concurrency 로 대부분 막히지만, 수동 실행이 겹칠 수 있어 재시도를 남긴다.
          for attempt in 1 2 3; do
            git pull --rebase --autostash origin "${{{{ github.ref_name }}}}" && git push && exit 0
            echo "푸시 재시도 $attempt"
            sleep 5
          done
          exit 1
"""


def expected_files() -> dict[str, str]:
    """생성되어야 할 파일 이름 -> 내용. 수집원이 없는 그룹은 만들지 않는다."""
    return {
        workflow_filename(group): render(group)
        for group in SCHEDULE_GROUPS.values()
        if sources_in_group(group.id)
    }


def write_all(out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for name, content in expected_files().items():
        path = out_dir / name
        if not path.exists() or path.read_text(encoding="utf-8") != content:
            path.write_text(content, encoding="utf-8", newline="\n")
            written.append(path)
    return written


def drift(out_dir: Path) -> list[str]:
    """생성 결과와 저장소 내용이 다른 파일 이름. CI 가 이 목록이 비었는지 본다."""
    problems: list[str] = []
    for name, content in expected_files().items():
        path = out_dir / name
        if not path.exists():
            problems.append(f"{name} (없음)")
        elif path.read_text(encoding="utf-8") != content:
            problems.append(f"{name} (내용 다름)")
    return problems
