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

## 원본 도메인 상수

사육표준·환기 기준·24절기 같은 도메인 상수는 원본 `khmass-liturgy/pb` 의
`index.html` 에 인라인으로 박혀 있었다. 손으로 옮기지 않고 스크립트로 뽑았다 —
분량 때문이 아니라 **틀려도 모르기 때문**이다(품종표는 숫자 하나가 어긋나도
화면에서는 그럴듯해 보인다).

```bash
npm run extract:constants     # 원본을 내려받아 src/data/ 로 추출
npm run format                # 뽑은 뒤 한 번 돌린다
```

뽑고 나면 `src/data/` 는 우리 것이다. 생성물이지만 다시 만들지 않으므로
CI 의 drift 검사 대상이 아니다(`src/types/` 와 다른 점). 고칠 일이 생기면
해당 파일을 직접 고친다.

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

이미 있는 것을 다시 만들지 않는다.

- `pipeline/core/rss.py` — RSS/Atom 읽기. 피드 날짜는 시간대가 붙은 것과 붙지
  않은 것이 섞여 오는데, 그 규칙이 여기 한 곳에만 있다. 직접 파싱하지 않는다.
- `pipeline/core/translate.py` — 영→한. 실패하면 원문을 남기므로, 부르는 쪽은
  직전 산출물의 원문을 키로 재번역 여부를 정한다(`reuses_previous`).
- `pipeline/core/http.py` 의 `Session` — 쿠키를 잇는 POST 가 필요할 때.

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

## 아이콘·미리보기

`public/` 의 **SVG 가 원본이고 PNG 는 사본**이다. 모양을 고칠 일이 생기면
SVG 를 고치고 개발 서버에서 `/scripts/gen-icons.html` 을 열어 다시 굽는다
(캔버스로 구워 내려받는 페이지다 — 래스터라이저를 의존성으로 들이지 않으려고
이렇게 한다).

- `icon.svg` → `icon-192.png` · `icon-512.png` · `favicon-32.png`
- `icon-maskable.svg` → `icon-maskable-512.png` · `apple-touch-icon.png`
  (운영체제가 제 모양대로 잘라 내므로 알맹이를 가운데 66% 안에 둔다)
- `og-card.svg` → `og-card.png` (1200×630, 링크 미리보기)

원본은 아이콘을 manifest 안에 base64 로 넣어 49KB 짜리 JSON 을 만들었다.
여기서는 파일로 둔다 — 필요한 크기만, 캐시해 가며 받는다.

`og:url`·`og:image` 는 절대 주소여야 해서 배포 워크플로가 `VITE_SITE_URL` 을
채우고 `vite.config.ts` 의 `siteMeta` 가 `index.html` 에 넣는다.

## 접근성·성능

- **탭바는 키보드로 돈다.** 좌우 화살표로 한 칸씩(끝에서 반대편으로), Home·End
  로 양 끝으로. 포커스는 활성 탭 하나만 받는다(roving tabindex).
  `src/app/tab-keys.test.ts` 가 붙잡고 있다.
- **명암비는 WCAG AA 를 넘긴다.** 원본에서 물려받은 색 중 흰 바탕에 글자로
  얹으면 3:1 안팎이던 것들(밝은 금색·주황)은 글자용 짝을 따로 뒀다
  (`--color-ink-*`). 띠·점·배경에는 원색을 그대로 쓴다. 수집 산출물에서 오는
  매체 색처럼 우리가 고를 수 없는 색은 `inkFrom()` 으로 낮춰서 글자에 쓴다.
  훑어볼 때는 `scripts/contrast-audit.js` 를 콘솔에 붙여 넣고
  `await auditAllTabs()`.
- **초기 번들에 예산이 있다.** `npm run budget` — `dist/index.html` 이 실제로
  거는 것만 세어 gzip 130KB 를 넘으면 실패한다. CI 가 매번 돌린다.

## 인증 붙이기

유료서비스 탭은 `src/lib/auth.ts` 의 `AuthAdapter` 하나만 보고 그린다.
지금 꽂힌 `nullAuthAdapter` 는 언제나 로그아웃이고 로그인 수단이 0개다 —
인증을 흉내 내지 않는다(`docs/decisions/0002-유료서비스-인증-자리.md`).

붙일 때 할 일은 두 가지다.

1. `AuthAdapter` 를 구현한다. 화면이 보는 것은 네 상태(`checking` ·
   `signed-out` · `pending` · `approved`)와 로그인 수단 목록뿐이다.
   승인 여부는 **이미 판정된 값으로** 담아야 한다 — 브라우저가 명단을
   내려받아 맞춰 보는 방식은 쓰지 않는다.
2. `auth.ts` 맨 아래 `authAdapter` 한 줄을 새 구현으로 바꾼다.

`getState()` 는 상태가 같으면 같은 객체를 돌려줘야 한다(`useSyncExternalStore`).

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
