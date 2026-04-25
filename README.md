# 기술 블로그

Notion을 CMS로 활용한 정적 기술 블로그입니다.

> 배포 테스트: 2024-12-19

## 기술 스택

- Astro
- Notion API
- Vercel (배포)

## 주요 기능

- Notion 연동 자동 동기화
- 이미지 자동 다운로드
- 핀 게시물 기능
- 태그 필터링
- 조회수 카운터
- 읽기 시간 표시
- 댓글 (Giscus)
- 공유 기능 (SNS, 링크 복사)
- 사주 연애운 이메일 리포트 (요청 큐/비동기 처리)
- 오늘의 개발 판세 자동 갈무리 (`news.hada.io` 피드 기반)
- SEO 최적화 (Open Graph, Sitemap)
- 크림 색상 테마

## 설정

### Notion 데이터베이스 속성

| 속성        | 타입         | 필수 |
| ----------- | ------------ | ---- |
| Name        | Title        | 필수 |
| Status      | Select       | 필수 |
| Created     | Date         | 필수 |
| Description | Text         | 선택 |
| Tags        | Multi-select | 선택 |
| Cover       | Files        | 선택 |
| Pinned      | Checkbox     | 선택 |
| edit        | Checkbox     | 선택 |

### 환경 변수

`.env` 파일 생성:

```
NOTION_TOKEN=your_token
NOTION_DATABASE_ID=your_database_id

# Saju (email queue flow)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_SERVER_FALLBACK_PUBLIC=true
EMAIL_PROVIDER=console
RESEND_API_KEY=
EMAIL_FROM=
TURNSTILE_SECRET_KEY=
JOB_PROCESSOR_SECRET=

# Trend (Codex analysis optional)
CODEX_MODEL=
```

### 사주 처리 플로우

- `/saju`에서 요청 등록 → `POST /api/saju-requests`
- 워커/크론이 `POST /api/saju-requests/process` 호출하여 queued 요청 처리
- 처리 완료 시 이메일 발송, 상태 조회는 `GET /api/saju-requests/:id?token=...`

### Giscus 댓글 설정

1. GitHub 저장소 Discussions 활성화
2. https://giscus.app 에서 설정
3. `src/components/Comments.tsx` 파일에서 설정값 수정:
   - data-repo
   - data-repo-id
   - data-category-id

## 개발

```bash
npm install
npm run sync:check  # 변경 여부만 확인 (다운로드/파일쓰기 없음)
npm run sync:notion:edited  # edit=true인 글 중 변경된 글만 동기화
npm run sync:notion:all  # Published 글 전체 강제 동기화
npm run trend:once  # news.hada.io 피드 수집 + Codex 분석(실패 시 폴백)
npm run trend:once:heuristic  # 규칙 기반 분석만 사용
npm run trend:once:codex  # Codex 분석 강제(실패 시 에러)
npm run dev
```

### 오늘의 개발 판세 (/trends)

- 수집원: `https://news.hada.io/rss/news`
- 결과 파일: `src/data/trends/hada-today.json`
- 페이지: `/trends`
- `trend:once` 실행 시 Codex CLI 분석을 우선 시도하고, 실패하면 규칙 기반 분석으로 자동 폴백합니다.

### Codex Automation 실행 예시

- 자동화 작업에서 아래 한 줄만 실행하면 됩니다.

```bash
npm run trend:once
```

### Notion 동기화 변경 감지

- `npm run sync:check`는 Notion의 Published 페이지 스냅샷을 마지막 동기화 매니페스트(`.notion-sync-manifest.json`)와 비교합니다.
- `npm run sync:notion:edited`는 `Status=Published AND edit=true` 조건의 페이지만 대상으로 변경분을 동기화합니다.
- `npm run sync:notion:all`은 Published 전체를 강제로 다시 동기화합니다.
- 변경이 없으면 자동으로 동기화를 건너뜁니다.

### GitHub Actions 동기화

- `Deploy to Production` 워크플로우는 빌드/배포만 수행합니다.
- `Sync Notion Content (Manual)` 워크플로우를 수동 실행해서 동기화합니다.
  - 기본: edit 체크된 글만 동기화
  - `full_sync=true`: Published 전체 동기화

### PR 작성 규칙

- PR 작성/갱신 규칙은 `AGENTS.md`를 따릅니다.
- PR 본문 포맷은 `.github/pull_request_template.md`를 사용합니다.

## 배포

```bash
npm run build
```

`npm run build`는 내부적으로 변경 여부를 확인하고 변경된 페이지만 동기화한 뒤 빌드합니다.

## 프로젝트 구조

```
blog/
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   └── sync-notion.mjs
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── PostCard.astro
│   │   ├── ViewCounter.tsx
│   │   ├── Comments.tsx
│   │   └── ShareButtons.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── BlogPost.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── posts.astro
│   │   ├── blog/[...slug].astro
│   │   └── api/views/[slug].ts
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   └── readingTime.ts
│   └── content/
│       ├── config.ts
│       └── blog/
├── astro.config.mjs
└── package.json
```
