# 📚 블로그 가이드

이 폴더는 Astro + Notion 기술 블로그의 사용 가이드를 포함합니다.

## 📖 가이드 목록

### 1. [Notion 연결 가이드](./NOTION_SETUP.md)
Notion Integration 설정부터 블로그 연동까지 전체 과정을 단계별로 설명합니다.

**포함 내용:**
- Integration 생성 방법
- 데이터베이스 설정
- 환경 변수 설정
- 테스트 및 문제 해결

### 2. [데이터베이스 구조](./DATABASE_STRUCTURE.md)
Notion 데이터베이스의 속성 구조와 각 필드의 역할을 설명합니다.

**포함 내용:**
- 필수/선택 속성 상세 설명
- 데이터 변환 과정
- 이미지 처리 방법
- 확장 가능한 속성

---

## 🚀 빠른 시작

### 1. Notion 설정 (5분)
```bash
1. Integration 만들기
2. 데이터베이스 생성
3. .env 파일 설정
```

자세한 내용: [NOTION_SETUP.md](./NOTION_SETUP.md)

### 2. 첫 글 작성 (3분)
```bash
1. Notion 데이터베이스에 "+ New" 클릭
2. Title, Status(Published), Created 입력
3. 페이지 열어서 본문 작성
4. npm run sync:notion 실행
```

### 3. 블로그 실행
```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:4321` 확인!

---

## 📁 프로젝트 구조

```
blog/
├── src/
│   ├── components/       # 재사용 컴포넌트
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PostCard.astro
│   │   └── ...
│   ├── layouts/          # 레이아웃
│   │   ├── BaseLayout.astro
│   │   └── BlogPost.astro
│   ├── pages/            # 페이지 (라우팅)
│   │   ├── index.astro          # 메인 페이지
│   │   ├── posts.astro          # 글 목록
│   │   └── blog/[slug].astro    # 글 상세
│   ├── content/          # 블로그 콘텐츠
│   │   └── blog/         # Notion에서 동기화된 .md 파일
│   └── styles/           # 스타일
│       └── global.css
├── public/               # 정적 파일
│   └── images/           # Notion 이미지 저장소
├── scripts/
│   └── sync-notion.mjs   # Notion 동기화 스크립트
├── guide/                # 📚 이 폴더
│   ├── README.md
│   ├── NOTION_SETUP.md
│   └── DATABASE_STRUCTURE.md
├── .env                  # 환경 변수 (gitignore)
├── astro.config.mjs      # Astro 설정
└── package.json          # 프로젝트 설정
```

---

## 🛠️ 주요 명령어

### 개발
```bash
npm run dev           # 개발 서버 실행 (http://localhost:4321)
npm run build         # 프로덕션 빌드
npm run preview       # 빌드 미리보기
```

### Notion 동기화
```bash
npm run sync:notion   # Notion에서 글 가져오기
```

### 배포 (Vercel)
```bash
# Git push만 하면 자동 배포됨
git push origin main
```

---

## 🎨 디자인 시스템

### 색상
- **배경**: #FBF9F4 (크림)
- **카드**: #FFFFFF (화이트)
- **액센트**: #8B7355 (브라운)
- **텍스트**: #1A1A1A (다크)

### 주요 기능
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 다크모드 없음 (크림 테마 고정)
- 부드러운 애니메이션
- 태그 필터링
- 조회수 카운터
- Giscus 댓글

---

## 📝 콘텐츠 작성 팁

### 썸네일 이미지
- **권장 크기**: 1200x600px (2:1 비율)
- **형식**: JPG, PNG, WebP
- **출처**: Unsplash, Pexels 등 무료 이미지 사이트

### 태그 작성
- **개수**: 2-5개 권장
- **일관성**: 태그명 통일 (예: "JavaScript" vs "javascript")
- **예시**: React, TypeScript, JavaScript, Frontend, Tutorial

### 글 제목
- **길이**: 10-50자 권장
- **명확성**: 글 내용을 정확히 표현
- **예시**: "React Hooks 완벽 가이드", "TypeScript 제네릭 이해하기"

### 설명 (Description)
- **길이**: 50-150자 권장
- **내용**: 글의 핵심 요약
- **SEO**: 검색 엔진 최적화에 중요

---

## 🔧 커스터마이징

### 색상 변경
`src/styles/global.css` 파일 수정:
```css
:root {
  --bg-primary: #FBF9F4;      /* 배경색 */
  --accent-primary: #8B7355;  /* 액센트 색 */
}
```

### 메인 페이지 수정
`src/pages/index.astro` 파일 수정

### 소셜 링크 변경
`src/components/Footer.astro` 파일 수정

### 사이트 정보 변경
`astro.config.mjs` 파일의 `site` 수정

---

## 🌐 배포

### Vercel 배포 (권장)
1. GitHub에 코드 푸시
2. Vercel에서 "Import Project"
3. 자동 배포 완료!
4. 환경 변수 설정:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`

### Netlify 배포
1. GitHub 연결
2. Build command: `npm run build`
3. Publish directory: `dist`
4. 환경 변수 설정

---

## ❓ FAQ

### Q1. 글이 블로그에 안 보여요
**A:** Status가 "Published"인지 확인하고 `npm run sync:notion` 실행

### Q2. 이미지가 깨져요
**A:** `npm run sync:notion`을 다시 실행하면 이미지 재다운로드

### Q3. 태그 필터가 작동 안 해요
**A:** JavaScript가 활성화되어 있는지 확인

### Q4. 조회수가 초기화돼요
**A:** 현재 인메모리 방식이라 서버 재시작 시 초기화됨 (Redis 연동 권장)

### Q5. 댓글이 안 보여요
**A:** `src/components/Comments.tsx`에서 Giscus 설정 확인

---

## 🐛 문제 해결

### Integration 에러
```bash
Error: Unauthorized
→ Notion Integration이 데이터베이스에 연결되었는지 확인
```

### 빌드 에러
```bash
Error: getStaticPaths required
→ astro.config.mjs에 output: 'hybrid' 설정 확인
```

### 동기화 에러
```bash
Error: Database not found
→ .env의 NOTION_DATABASE_ID 확인
```

---

## 📞 지원

문제가 발생하면:
1. [NOTION_SETUP.md](./NOTION_SETUP.md) 가이드 확인
2. [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) 속성 확인
3. GitHub Issues에 문의

---

## 🎯 다음 단계

- [ ] Notion 연결 완료
- [ ] 첫 글 작성
- [ ] 로컬에서 테스트
- [ ] Vercel 배포
- [ ] 도메인 연결
- [ ] Google Analytics 추가 (선택)
- [ ] Giscus 댓글 설정 (선택)

---

**Happy Blogging! 🚀**
