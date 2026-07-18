# 대천 파로스 여행 🌊

한화리조트 대천 파로스로 떠나는 **2026. 8. 4 (화) ~ 8. 6 (목) · 2박 3일** 그룹 여행 플래너입니다.
모바일 우선(최대 폭 430px) · 한국어/중국어 이중 언어 웹앱.

## 이게 뭔가요

- 첫 방문 시 **"누구세요?"** 화면에서 멤버(石甜筒 · 3ちゃん · 7ちゃん · 그르 · 치반)를 고르면
  선택이 **이 기기에** 저장돼요. 나중에 홈 우측 상단 프로필 버튼으로 바꿀 수 있어요.
- 4개 탭
  - **홈** — D-day, 보령 머드축제 안내, 3일 날씨(Open-Meteo 실시간 + 폴백), 숙소 정보 & 리조트 링크
  - **액티비티** — 추천 액티비티 카드 (추가/수정/삭제)
  - **준비물** — 공용/개인 준비물 체크리스트. 공용은 담당자 지정, 개인은 멤버별 체크
  - **맛집 · 카페** — 맛집/카페 카드 (추가/수정/삭제)
- 항목은 하단 시트로 추가/수정/삭제. 한(ko)/중(zh) 언어 토글 지원.
- **여러 기기 실시간 동기화** — 룸 문서를 2초마다 폴링/반영하고, 다른 기기가 편집 중이면
  노란색 **"~수정 중"** 칩이 표시돼요.

## 기술 스택

npm workspaces 모노레포.

- `client/` — Vite + React 18 + TypeScript(strict). CSS 프레임워크/UI 라이브러리 없이
  인라인 스타일 + 작은 전역 CSS로 디자인을 그대로 재현. Google Fonts(Jua, Noto Sans KR/SC),
  Material Symbols Rounded 사용.
- `server/` — Node 20 + Express(ESM). 룸 문서 저장 API + (프로덕션에서) 빌드된 클라이언트 서빙.

## 개발 설정

```bash
npm install        # 루트에서 실행 → client, server 워크스페이스 전체 설치
npm run dev        # server(:3001) + Vite dev server 동시 실행
```

- Vite dev server가 열리면(기본 http://localhost:5173) 접속하세요.
- Vite는 `/api` 요청을 `http://localhost:3001`(Express)로 프록시합니다.

## 빌드 & 실행 (프로덕션)

```bash
npm run build      # client/dist 생성 + tsc --noEmit 타입 체크
npm run start      # PORT(기본 3001)에서 API + 빌드된 클라이언트 서빙
# http://localhost:3001 접속
```

`npm run start`는 `NODE_ENV=production` 또는 `--serve-client` 플래그일 때
`client/dist`를 정적 서빙하고, `/api/*`를 제외한 모든 경로를 `index.html`로 SPA 폴백합니다.

## Docker 배포

```bash
docker compose up -d --build
# http://<host>:3001
```

- `Dockerfile`은 멀티스테이지(클라이언트 빌드 → 슬림 런타임)로, 런타임에서 `node server/index.js`를 실행하며 3001 포트를 노출합니다.
- `docker-compose.yml`은 `./data`를 컨테이너의 `/app/data`에 볼륨 마운트하여 룸 데이터를 보존하고,
  `restart: unless-stopped`로 재기동합니다.

> 배포는 코드가 저장된 서버와 **다른 서버**에서 이루어집니다. 이 저장소는 코드만 담고 있고,
> 실제 데이터는 배포 환경의 `data/` 볼륨에 저장됩니다.

## 룸 / 데이터 저장 설명

- **룸 ID** 기본값: `paros-daecheon-2026-x7k3q9`.
  URL 해시로 덮어쓸 수 있어요 → `#room=<원하는-ID>` (해시가 우선). 선택된 ID는
  localStorage(`paros-room`)에 저장되고, 해시가 없으면 자동으로 `#room=`을 채워 넣습니다.
  룸 ID는 `^[A-Za-z0-9-]{1,64}$` 형식이어야 합니다.
- **동기화 모델**: 2초 폴링(탭이 숨겨져 있거나 push 중이면 건너뜀), 로컬 변경 500ms 뒤 디바운스 push,
  15초 heartbeat. 문서 형태는 `{ activities, packing, foods, presence, updatedAt }`이며
  `updatedAt` 기준 **last-write-wins**로 병합합니다.
- **presence**: 기기별(localStorage `paros-dev`, 8자 랜덤) 항목 `{ mid, ts, tab, ed, edTs }`.
  최근 15초 내 같은 항목을 편집 중인 다른 기기가 있으면 "수정 중" 칩을 표시하고,
  120초 넘은 항목은 정리합니다.
- **API**
  - `GET /api/rooms/:id` → 저장된 JSON(200) 또는 404
  - `PUT /api/rooms/:id` → JSON 본문(최대 1MB) 저장 후 204
  - 잘못된 `:id` → 400
- **서버 저장소**: 저장소 루트의 `data/<id>.json`. 임시 파일 + `rename`으로 원자적으로 기록하며,
  재읽기를 줄이기 위해 메모리 캐시를 사용합니다. `data/`는 git에서 무시됩니다.

## 로컬 저장 키 (브라우저)

- `paros-trip-2026-v1` — `{ me, activities, packing, foods }`
- `paros-lang` — `'ko' | 'zh'`
- `paros-room` — 현재 룸 ID
- `paros-dev` — 기기 식별자
