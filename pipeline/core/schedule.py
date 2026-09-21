"""수집 주기 그룹.

수집원마다 워크플로를 따로 두면 서로 비슷한 시각에 끝나면서 같은 저장소에
동시에 push 하다 충돌한다(원본이 `git pull --rebase` 재시도 루프를 넣어야 했던 이유).

주기가 같은 수집원을 한 그룹으로 묶어 **워크플로 하나가 순서대로 실행하고
마지막에 한 번만 커밋**한다. 수집원은 자기 그룹 이름만 고르면 된다.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScheduleGroup:
    id: str
    title: str
    #: GitHub Actions cron 은 UTC 다. KST 환산은 kst_note 에 적고
    #: 워크플로를 생성할 때 주석으로 함께 써 넣는다.
    cron: tuple[str, ...]
    kst_note: str


SCHEDULE_GROUPS: dict[str, ScheduleGroup] = {
    "daily_0900": ScheduleGroup(
        id="daily_0900",
        title="매일 아침",
        cron=("0 0 * * *",),
        kst_note="매일 09:00 KST",
    ),
    "daily_1320": ScheduleGroup(
        id="daily_1320",
        title="매일 오후",
        # 대한양계협회 금일 육계시세는 당일 오후 1시에 올라온다. 20분 여유를 둔다.
        cron=("20 4 * * *",),
        kst_note="매일 13:20 KST",
    ),
    "monthly": ScheduleGroup(
        id="monthly",
        title="매달",
        # 협회가 같은 게시물의 이미지를 매달 갈아 끼우는데 날짜가 들쭉날쭉하다.
        # 월초·중순 두 번 확인해 늦게 올라와도 그달 안에 잡히게 한다.
        cron=("30 22 2,13 * *",),
        kst_note="매달 3일·14일 07:30 KST",
    ),
    "weekday_hourly": ScheduleGroup(
        id="weekday_hourly",
        title="평일 장중 매시",
        cron=("5 0-9,13-21 * * 1-5", "5 0 * * 6,0"),
        kst_note="평일 09~18 · 22~06 KST 매시 5분, 주말 09:00 KST 1회",
    ),
}


def get_group(group_id: str) -> ScheduleGroup:
    try:
        return SCHEDULE_GROUPS[group_id]
    except KeyError:
        known = ", ".join(sorted(SCHEDULE_GROUPS))
        raise KeyError(f"모르는 주기 그룹 '{group_id}'. 등록된 그룹: {known}") from None
