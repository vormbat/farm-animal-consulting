# 농장동물 컨설팅

양계(산란계·육계) 농가와 컨설턴트를 위한 대시보드. 산지시세 · 날씨 · 환기가이드 ·
사양 컨설팅 · 질병 · HPAI 통계 · 축산 뉴스를 한 화면에 모은다.

`khmass-liturgy.github.io/pb` 의 단일 파일 구현을 Vite + React + TypeScript +
Tailwind + shadcn/ui 로 재구축한 것이다.

## 구조

```
src/
  app/          앱 셸(헤더·탭바·푸터), 탭 전환, 에러 바운더리
  features/     탭 = 폴더 1개
  components/   공통 표현 컴포넌트 (ui/ 는 shadcn CLI 가 생성)
  lib/          탭 레지스트리 · 데이터 클라이언트 · 포맷 · 스토리지
  data/         정적 도메인 상수 (사육표준, 환기 기준, 절기)
  types/        수집 스키마에서 생성된 타입 (직접 고치지 않는다)
pipeline/
  core/         HTTP·HTML 파싱·KST 시각·되돌리기·원자적 쓰기·주기 그룹
  schemas/      Pydantic 모델 = 데이터 계약의 단일 진실원
  sources/      수집원 1개 = 파일 1개
  tests/        파서 골든 테스트
schemas/        모델에서 생성된 JSON Schema (생성물)
fixtures/       파서 테스트용 원문 스냅샷
data/           수집 워크플로가 커밋하는 JSON 산출물
```

### 데이터가 흐르는 길

```
pipeline/sources/*.py  --(GitHub Actions, 주기 그룹별)-->  data/*.json 커밋
                                                              |
                     화면이 런타임에 raw.githubusercontent.com 에서 읽음
```

데이터가 갱신돼도 사이트를 다시 빌드하지 않는다. 배포 워크플로는 `data/**`
변경을 무시한다.

계약은 한 방향으로만 흐른다.

```
Pydantic 모델  ->  schemas/*.schema.json  ->  src/types/data.d.ts
```

모델을 고치면 `npm run gen:types` 로 아래까지 내려보낸다. 잊고 머지하면 CI 가 잡는다.

## 개발

```bash
npm install
npm run dev
```

수집 파이프라인은 [uv](https://docs.astral.sh/uv/) 가 Python 3.12 를 알아서
받아 쓴다. 따로 설치할 것은 없다.

| 명령                    | 설명                                      |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | 개발 서버 (로컬 `data/` 를 그대로 읽는다) |
| `npm run build`         | 타입 검사 + 프로덕션 빌드                 |
| `npm run typecheck`     | 타입 검사만                               |
| `npm run lint`          | ESLint                                    |
| `npm run format`        | Prettier 적용                             |
| `npm test`              | Vitest 1회 실행                           |
| `npm run pipeline -- …` | 수집 CLI (아래 참고)                      |
| `npm run gen:types`     | 모델 → JSON Schema → TS 타입              |
| `npm run gen:workflows` | 수집 워크플로 YAML 재생성                 |

```bash
npm run pipeline -- list                              # 등록된 수집원
npm run pipeline -- run broiler_price_today           # 하나 실행
npm run pipeline -- run --all --keep-going            # 전부 실행
npm run pipeline -- run broiler_price_today --dry-run # 파일 안 쓰고 확인만
npm run pipeline -- validate                          # data/ 가 계약과 맞는지
uv run pytest -q                                      # 파서 골든 테스트
```

## 탭 추가하기

1. `src/features/<id>/index.tsx` 에 기본 내보내기 컴포넌트를 만든다.
2. `src/lib/tabs.ts` 의 `TABS` 배열에 한 줄 추가한다.

그 외에 손댈 곳은 없다. 라우팅·헤더 탭바·해시 파싱이 모두 이 배열을 읽는다.

## 수집원 추가하기

1. `pipeline/schemas/<name>.py` 에 `SourcePayload` 를 상속한 모델을 만든다.
2. `pipeline/sources/<name>.py` 에 파싱 함수와 `SOURCE = Source(...)` 를 둔다.
   주기는 `pipeline/core/schedule.py` 의 그룹 이름 중에서 고른다.
3. `npm run gen:types && npm run gen:workflows`

레지스트리가 파일을 찾아 등록하므로 중앙 목록에 손댈 곳은 없다.

수집 함수가 하는 일은 **파싱뿐**이다. 되돌리기·시각 찍기·검증·원자적 쓰기는
`run_source` 가 맡는다.

무거운 의존성이 필요하면 `Source` 에 적는다. 워크플로 생성기가 그 수집원이
속한 주기 그룹에만 설치 단계를 넣으므로, 나머지 수집은 계속 가볍게 돈다.

```python
SOURCE = Source(
    ...,
    extras=frozenset({"ocr"}),        # pyproject 의 optional-dependencies
    apt_packages=frozenset({"libgl1"}),  # 러너에 깔 시스템 패키지
)
```

OCR 이 필요한 수집원은 로컬에서도 엑스트라를 켜고 돌린다.

```bash
uv run --extra ocr python -m pipeline run pullet_price
```

### 지켜지는 규약

- **부분 실패가 정상 데이터를 지우지 않는다.** 값을 못 모은 항목은 `None` 으로
  남기면 직전 커밋 값으로 메워지고 `stale_fields` 에 이름이 남는다. 화면은
  값을 감추지 않고 '갱신 실패 · 이전 값' 만 덧붙인다. 사이트에 닿지도 못하면
  파일 전체를 이전 내용 그대로 둔다 — 절대 비우지 않는다.
- **모든 시각은 KST.** 러너는 UTC 이므로 `datetime.now()` 를 직접 부르지 않고
  `pipeline/core/clock.py` 를 거친다.
- **크론은 UTC 로 쓰되 KST 환산을 주석에 남긴다.** 워크플로가 생성물이라 둘이
  어긋날 수 없다.
- **테스트는 살아 있는 사이트를 때리지 않는다.** `fixtures/` 의 스냅샷으로 돈다.

## 지켜야 할 계약

이 사이트는 farm-pro 의 "가금컨설팅" 메뉴 안에 **iframe 으로** 들어간다.
부모 화면이 탭을 지정하는 통로가 두 개 있고, 둘 다 바꾸면 안 된다.

- `...#vent` — `src` 의 해시만 바꿔도 페이지를 다시 읽지 않고 탭이 바뀐다.
  슬래시 없는 `#vent` 형식이다(`#/vent` 아님). 이 때문에 HashRouter 를 쓰지 않는다.
- `postMessage({ pbTab: 'vent' })`

임베드 상태(`window.self !== window.top`)에서는 제목 줄을 숨기고 탭바만 남긴다.

`src/app/useTabNavigation.test.ts` 가 이 계약을 붙잡고 있다.

## 배포

`main` 에 푸시하면 GitHub Pages 로 배포된다(`.github/workflows/deploy.yml`).
`VITE_BASE` 와 `VITE_DATA_REPO` 는 워크플로가 저장소 컨텍스트에서 채우므로
저장소 이름을 바꿔도 손댈 곳이 없다. 로컬에서 다른 저장소의 데이터를 보려면
`.env.local` 에 `VITE_DATA_REPO` 를 적는다(`.env.example` 참고).
