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
- SEO 최적화 (Open Graph, Sitemap)
- 크림 색상 테마

## 설정

### Notion 데이터베이스 속성

| 속성 | 타입 | 필수 |
|------|------|------|
| Name | Title | 필수 |
| Status | Select | 필수 |
| Created | Date | 필수 |
| Description | Text | 선택 |
| Tags | Multi-select | 선택 |
| Cover | Files | 선택 |
| Pinned | Checkbox | 선택 |

### 환경 변수

`.env` 파일 생성:

```
NOTION_TOKEN=your_token
NOTION_DATABASE_ID=your_database_id
```

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
npm run sync:notion
npm run dev
```

## 배포

```bash
npm run sync:notion
npm run build
```

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
