# 🚀 Notion + Astro 기술 블로그

Notion을 CMS로 사용하는 정적 블로그입니다. Notion에서 글을 작성하면 자동으로 동기화되어 블로그에 표시됩니다.

## ✨ 특징

- 📝 Notion에서 편하게 글 작성
- 🖼️ 이미지 자동 다운로드 및 최적화
- ⚡ Astro의 빠른 정적 사이트 생성
- 🎨 깔끔한 블로그 레이아웃
- 🏷️ 태그 지원

## 🛠️ 설정 방법

### 1단계: Notion Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations) 페이지 접속
2. "+ New integration" 클릭
3. 이름 입력 (예: "My Blog Integration")
4. **Internal Integration Token** 복사 (나중에 사용)

### 2단계: Notion 데이터베이스 생성

블로그 게시물을 관리할 데이터베이스를 만듭니다.

**필수 속성:**
- `Name` 또는 `Title` (제목) - Title 타입
- `Status` (상태) - Select 타입
  - 옵션: "Draft", "Published"
- `Created` (작성일) - Date 타입

**선택 속성:**
- `Description` (설명) - Text 타입
- `Tags` (태그) - Multi-select 타입
- `Cover` (커버 이미지) - Files 타입

**데이터베이스 예시:**

| Name | Status | Created | Tags | Description | Cover |
|------|--------|---------|------|-------------|-------|
| 첫 번째 글 | Published | 2025-01-01 | React, TypeScript | 설명... | [이미지] |

### 3단계: Integration 연결

1. 생성한 데이터베이스 페이지 열기
2. 우측 상단 `⋯` (더보기) 클릭
3. "Add connections" → 생성한 Integration 선택
4. 데이터베이스 ID 복사
   - URL: `https://notion.so/[workspace]/[DATABASE_ID]?v=...`
   - `DATABASE_ID` 부분을 복사

### 4단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5단계: 패키지 설치

```bash
npm install
```

### 6단계: Notion 동기화

```bash
npm run sync:notion
```

이 명령어를 실행하면:
- Notion 데이터베이스에서 `Status`가 `Published`인 게시물 가져오기
- Markdown으로 변환
- 이미지 다운로드 및 `public/images/` 저장
- `src/content/blog/` 에 마크다운 파일 생성

### 7단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:4321` 접속

## 📁 프로젝트 구조

```
blog/
├── public/
│   └── images/              # 다운로드된 이미지
├── scripts/
│   └── sync-notion.mjs      # Notion 동기화 스크립트
├── src/
│   ├── content/
│   │   ├── blog/            # 블로그 포스트 (자동 생성)
│   │   └── config.ts        # Content Collections 설정
│   ├── layouts/
│   │   └── BlogPost.astro   # 블로그 포스트 레이아웃
│   └── pages/
│       ├── index.astro      # 홈페이지 (게시물 목록)
│       └── blog/
│           └── [...slug].astro  # 동적 블로그 포스트 페이지
├── .env                     # 환경 변수 (git에 커밋하지 않음)
├── .env.example             # 환경 변수 예시
├── astro.config.mjs         # Astro 설정
└── package.json
```

## 🔄 워크플로우

1. **Notion에서 글 작성**
   - 데이터베이스에 새 페이지 추가
   - 내용 작성
   - `Status`를 "Published"로 변경

2. **동기화**
   ```bash
   npm run sync:notion
   ```

3. **빌드 및 배포**
   ```bash
   npm run build
   ```

## 🚀 배포

### Vercel (추천)

1. GitHub에 프로젝트 푸시
2. [Vercel](https://vercel.com) 접속
3. "New Project" → GitHub 저장소 선택
4. 환경 변수 설정:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
5. **Build Command:** `npm run sync:notion && npm run build`
6. Deploy 클릭

### Netlify

1. GitHub에 프로젝트 푸시
2. [Netlify](https://netlify.com) 접속
3. "New site from Git" → 저장소 선택
4. 빌드 설정:
   - **Build command:** `npm run sync:notion && npm run build`
   - **Publish directory:** `dist`
5. 환경 변수 추가
6. Deploy

### Cloudflare Pages

1. GitHub에 프로젝트 푸시
2. [Cloudflare Pages](https://pages.cloudflare.com) 접속
3. "Create a project" → 저장소 선택
4. 빌드 설정:
   - **Build command:** `npm run sync:notion && npm run build`
   - **Build output directory:** `dist`
5. 환경 변수 추가
6. Deploy

## 🎨 커스터마이징

### 스타일 변경

- `src/layouts/BlogPost.astro` - 블로그 포스트 레이아웃
- `src/pages/index.astro` - 홈페이지 디자인

### Notion 속성 추가

1. Notion 데이터베이스에 새 속성 추가
2. `scripts/sync-notion.mjs`의 `getPageProperty()` 호출 부분 수정
3. `src/content/config.ts`에 스키마 추가

## 🐛 트러블슈팅

### 이미지가 안 보여요

- Notion에서 이미지 URL이 유효한지 확인
- `public/images/` 폴더에 이미지가 다운로드되었는지 확인
- 동기화 스크립트 재실행: `npm run sync:notion`

### Notion API 오류

- `NOTION_TOKEN`이 올바른지 확인
- Integration이 데이터베이스에 연결되어 있는지 확인
- 데이터베이스 ID가 맞는지 확인

### 빌드 실패

- Node.js 버전 확인 (18 이상 권장)
- `node_modules` 삭제 후 재설치: `rm -rf node_modules && npm install`

## 📚 참고 자료

- [Astro 공식 문서](https://docs.astro.build)
- [Notion API 문서](https://developers.notion.com)
- [Content Collections 가이드](https://docs.astro.build/en/guides/content-collections/)

## 💡 팁

- **자동 동기화**: GitHub Actions를 사용하면 Notion 업데이트 시 자동 배포 가능
- **빌드 최적화**: 이미지가 많으면 Astro의 이미지 최적화 플러그인 사용 권장
- **SEO**: `astro.config.mjs`에서 사이트 메타데이터 설정

---

문제가 있거나 질문이 있으면 이슈를 남겨주세요! 🚀
