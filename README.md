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
pipeline/       Python 수집 스크립트 (P1부터)
data/           수집 워크플로가 커밋하는 JSON 산출물
```

데이터는 GitHub Actions 가 수집해 `data/` 에 커밋하고, 화면은 런타임에
`raw.githubusercontent.com` 에서 그 JSON 을 읽는다. 데이터가 갱신돼도 사이트를
다시 빌드하지 않는다.

## 개발

```bash
npm install
npm run dev
```

| 명령                | 설명                      |
| ------------------- | ------------------------- |
| `npm run dev`       | 개발 서버                 |
| `npm run build`     | 타입 검사 + 프로덕션 빌드 |
| `npm run typecheck` | 타입 검사만               |
| `npm run lint`      | ESLint                    |
| `npm run format`    | Prettier 적용             |
| `npm test`          | Vitest 1회 실행           |

## 탭 추가하기

1. `src/features/<id>/index.tsx` 에 기본 내보내기 컴포넌트를 만든다.
2. `src/lib/tabs.ts` 의 `TABS` 배열에 한 줄 추가한다.

그 외에 손댈 곳은 없다. 라우팅·헤더 탭바·해시 파싱이 모두 이 배열을 읽는다.

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
