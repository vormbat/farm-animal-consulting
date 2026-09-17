"""수집 파이프라인 명령줄.

uv run python -m pipeline list
uv run python -m pipeline run broiler_price_today
uv run python -m pipeline run --all --keep-going
uv run python -m pipeline validate
uv run python -m pipeline gen-schemas
uv run python -m pipeline gen-workflows [--check]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from pipeline.core import workflows
from pipeline.core.errors import CollectError
from pipeline.core.output import read_previous
from pipeline.core.schedule import SCHEDULE_GROUPS, get_group
from pipeline.core.source import Source, run_source
from pipeline.registry import all_sources, get_source, sources_in_group

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA_ROOT = REPO_ROOT / "data"
DEFAULT_SCHEMA_ROOT = REPO_ROOT / "schemas"
DEFAULT_WORKFLOW_ROOT = REPO_ROOT / ".github" / "workflows"


def cmd_list(_: argparse.Namespace) -> int:
    for group_id, group in SCHEDULE_GROUPS.items():
        members = sources_in_group(group_id)
        if not members:
            continue
        print(f"\n[{group.title}] {group.kst_note}")
        for source in members:
            print(f"  {source.id:<24} {source.output:<32} {source.title}")

    orphans = [s for s in all_sources() if s.schedule not in SCHEDULE_GROUPS]
    if orphans:
        print("\n[주기 그룹 없음]")
        for source in orphans:
            print(f"  {source.id}")
    print()
    return 0


def _selected(args: argparse.Namespace) -> list[Source]:
    if args.all:
        return list(all_sources())
    if args.schedule:
        get_group(args.schedule)
        return list(sources_in_group(args.schedule))
    if not args.source_ids:
        raise SystemExit("수집원 id 를 지정하거나 --all / --schedule 을 쓰세요.")
    return [get_source(source_id) for source_id in args.source_ids]


def cmd_run(args: argparse.Namespace) -> int:
    data_root = Path(args.data_root)
    failures: list[str] = []

    for source in _selected(args):
        if args.dry_run:
            # 파일을 건드리지 않고 수집·검증까지만 해 본다.
            try:
                fresh = source.collect()
                source.model.model_validate(
                    {
                        **fresh,
                        "collected_at": "1970-01-01 00:00 KST",
                        "source_url": source.source_url,
                    }
                )
            except (CollectError, ValidationError) as error:
                failures.append(source.id)
                print(f"✗ {source.id}: {error}")
                if not args.keep_going:
                    break
            else:
                print(f"✓ {source.id}: 수집·검증 통과 (파일은 쓰지 않음)")
            continue

        try:
            outcome = run_source(source, data_root)
        except CollectError as error:
            failures.append(source.id)
            print(f"✗ {source.id}: {error}")
            if not args.keep_going:
                break
        else:
            mark = "·" if not outcome.changed else "✓"
            print(f"{mark} {source.id}: {outcome.message} -> {outcome.path}")
            if outcome.fell_back:
                failures.append(source.id)

    if failures:
        print(f"\n실패한 수집원: {', '.join(failures)}", file=sys.stderr)
        return 1
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    data_root = Path(args.data_root)
    problems: list[str] = []

    for source in all_sources():
        path = data_root / source.output
        payload = read_previous(path)
        if payload is None:
            if path.exists():
                problems.append(f"{source.output}: 읽을 수 없거나 JSON 객체가 아닙니다")
            else:
                print(f"· {source.id}: 아직 수집 전 ({source.output} 없음)")
            continue
        try:
            source.model.model_validate(payload)
        except ValidationError as error:
            problems.append(f"{source.output}:\n{error}")
        else:
            stale = payload.get("stale_fields") or []
            suffix = f" (되돌린 항목: {', '.join(stale)})" if stale else ""
            print(f"✓ {source.id}: 계약 통과{suffix}")

    for problem in problems:
        print(f"✗ {problem}", file=sys.stderr)
    return 1 if problems else 0


def cmd_gen_schemas(args: argparse.Namespace) -> int:
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    index = []
    for source in all_sources():
        schema = source.model.model_json_schema()
        name = f"{source.id}.schema.json"
        (out_dir / name).write_text(
            json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
        index.append(
            {
                "id": source.id,
                "title": source.title,
                "output": source.output,
                "typeName": source.model.__name__,
                "schema": name,
            }
        )
        print(f"✓ {name}")

    (out_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"✓ index.json ({len(index)}개)")
    return 0


def cmd_gen_workflows(args: argparse.Namespace) -> int:
    out_dir = Path(args.out)
    if args.check:
        problems = workflows.drift(out_dir)
        if problems:
            print("워크플로가 최신이 아닙니다:", file=sys.stderr)
            for problem in problems:
                print(f"  ✗ {problem}", file=sys.stderr)
            print("\ngen-workflows 를 다시 실행하세요.", file=sys.stderr)
            return 1
        print("✓ 워크플로가 최신입니다")
        return 0

    written = workflows.write_all(out_dir)
    if not written:
        print("· 변경 없음")
    for path in written:
        print(f"✓ {path.name}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="pipeline", description="농장동물 컨설팅 데이터 수집")
    sub = parser.add_subparsers(dest="command", required=True)

    listing = sub.add_parser("list", help="등록된 수집원을 주기별로 보여준다")
    listing.set_defaults(func=cmd_list)

    run = sub.add_parser("run", help="수집원을 실행해 산출 JSON 을 갱신한다")
    run.add_argument("source_ids", nargs="*", help="실행할 수집원 id")
    run.add_argument("--all", action="store_true", help="등록된 수집원 전부")
    run.add_argument("--schedule", help="이 주기 그룹에 속한 수집원 전부")
    run.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    run.add_argument("--dry-run", action="store_true", help="파일을 쓰지 않고 수집·검증만")
    run.add_argument("--keep-going", action="store_true", help="하나가 실패해도 나머지를 마저 실행")
    run.set_defaults(func=cmd_run)

    validate = sub.add_parser("validate", help="data/ 의 산출물이 계약과 맞는지 확인")
    validate.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    validate.set_defaults(func=cmd_validate)

    schemas = sub.add_parser("gen-schemas", help="Pydantic 모델에서 JSON Schema 생성")
    schemas.add_argument("--out", default=str(DEFAULT_SCHEMA_ROOT))
    schemas.set_defaults(func=cmd_gen_schemas)

    gen_workflows = sub.add_parser("gen-workflows", help="수집 워크플로 YAML 생성")
    gen_workflows.add_argument("--out", default=str(DEFAULT_WORKFLOW_ROOT))
    gen_workflows.add_argument(
        "--check", action="store_true", help="생성하지 않고 최신인지 확인만 (CI 용)"
    )
    gen_workflows.set_defaults(func=cmd_gen_workflows)

    return parser


def _force_utf8_output() -> None:
    """윈도우 콘솔 기본 코드페이지(cp949)에서 한글·기호 출력이 터지는 것을 막는다.

    개발자마다 PYTHONIOENCODING 을 걸어 두게 하는 대신 여기서 한 번에 처리한다.
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="replace")


def main(argv: list[str] | None = None) -> int:
    _force_utf8_output()
    args = build_parser().parse_args(argv)
    return int(args.func(args))
