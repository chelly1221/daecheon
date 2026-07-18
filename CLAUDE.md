# CLAUDE.md

## 프로젝트 목적
한화리조트 대천 파로스로 떠나는 2026-08-04 ~ 08-06 그룹 여행 플래너.
모바일 우선(최대 폭 430px), 한국어/중국어 이중 언어. 고정 멤버 5명이 홈(D-day·날씨·숙소),
액티비티, 준비물(공용/개인 체크리스트), 맛집·카페를 공유하고 편집한다.
여러 기기 간 실시간 동기화(2초 폴링 룸 문서 + "수정 중" presence)를 지원한다.

## 명령어
- `npm install` — 루트에서 워크스페이스(client, server) 전체 설치
- `npm run dev` — server(3001) + Vite dev server 동시 실행 (Vite가 `/api`를 3001로 프록시)
- `npm run build` — 클라이언트 빌드 (`client/dist`) + `tsc --noEmit` 타입 체크
- `npm run start` — 프로덕션 서버 실행 (`PORT` 기본 3001, API + 빌드된 클라이언트 제공)

## 구조
- `client/` — Vite + React 18 + TypeScript(strict). 인라인 style + 작은 전역 CSS로 프로토타입을 그대로 재현.
  - `src/App.tsx` — 상태/파생값/핸들러 오케스트레이션
  - `src/hooks/useSync.ts` — 룸 동기화(폴링·디바운스 push·heartbeat·presence)
  - `src/hooks/useWeather.ts` — Open-Meteo 예보 (+ 하드코딩 폴백)
  - `src/i18n.ts`, `src/data.ts`, `src/types.ts`, `src/viewmodels.ts`, `src/css.ts`
  - `src/components/` — 화면/모달/시트 컴포넌트
- `server/` — Node 20 + Express(ESM). 룸 문서 CRUD(`/api/rooms/:id`), 원자적 파일 저장 + 메모리 캐시.
- `data/` — 룸 문서 JSON 저장소(런타임 생성, git 무시).
- `design/` — 원본 디자인 프로토타입(참고용).

## 배포
배포는 별도 서버에서 이루어진다. 이 저장소는 코드만 담고 있으며(데이터는 `data/` 볼륨에 보존),
`Dockerfile` + `docker-compose.yml`로 빌드/구동한다. 자세한 내용은 README.md 참고.
