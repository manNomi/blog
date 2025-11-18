# 📋 Notion 데이터베이스 구조

## 데이터베이스 속성 (Properties)

블로그 시스템이 사용하는 Notion 데이터베이스의 필수 속성들입니다.

---

## 필수 속성 (Required)

### 1. Title
- **타입**: Title
- **설명**: 글 제목
- **예시**: "React Hooks 완벽 가이드"
- **필수 여부**: ✅ 필수

### 2. Status
- **타입**: Select
- **설명**: 글 발행 상태
- **옵션**:
  - `Published` (초록색) - 블로그에 표시됨
  - `Draft` (회색) - 블로그에 숨김
- **필수 여부**: ✅ 필수
- **주의**: "Published"로 설정된 글만 블로그에 표시됩니다!

### 3. Created
- **타입**: Date
- **설명**: 글 작성일
- **예시**: 2024-01-15
- **필수 여부**: ✅ 필수
- **참고**: 자동으로 생성일 기준 정렬됩니다

---

## 선택 속성 (Optional)

### 4. Description
- **타입**: Text
- **설명**: 글 요약 설명 (한 줄)
- **예시**: "useState, useEffect부터 커스텀 훅까지 React Hooks의 모든 것"
- **사용처**:
  - 카드 미리보기
  - SEO 메타 설명
- **권장 길이**: 50-150자

### 5. Tags
- **타입**: Multi-select
- **설명**: 글 분류 태그 (여러 개 선택 가능)
- **예시**: React, JavaScript, Frontend
- **사용처**:
  - 태그 필터링
  - 관련 글 추천
- **권장**: 2-5개

### 6. Cover
- **타입**: Files & media
- **설명**: 썸네일 이미지
- **지원 형식**: JPG, PNG, WebP, GIF
- **사용처**:
  - 메인 페이지 카드
  - 글 목록 썸네일
  - SNS 공유 이미지
- **권장 크기**: 1200x600px (2:1 비율)

### 7. Pinned
- **타입**: Checkbox
- **설명**: 메인 페이지 고정 여부
- **기본값**: 체크 안 됨
- **사용처**: 메인 페이지 "주요 글" 섹션
- **제한**: 최대 3개까지 표시

---

## 데이터베이스 예시

| Title | Status | Tags | Created | Description | Cover | Pinned |
|-------|--------|------|---------|-------------|-------|--------|
| React Hooks 가이드 | Published | React, JavaScript | 2024-01-15 | useState부터 시작하는 Hooks | cover.jpg | ✓ |
| TypeScript 제네릭 | Published | TypeScript | 2024-01-10 | 제네릭 완벽 정리 | - | - |
| Next.js 13 가이드 | Published | Next.js, React | 2024-01-05 | App Router 소개 | cover2.jpg | ✓ |
| 미완성 글 | Draft | - | 2024-01-01 | 작성 중... | - | - |

---

## 데이터 흐름

```
Notion 데이터베이스
    ↓
npm run sync:notion
    ↓
src/content/blog/*.md (Markdown 파일 생성)
    ↓
Astro 빌드
    ↓
정적 HTML 생성
    ↓
블로그 페이지
```

---

## 필터링 규칙

동기화 스크립트는 다음 규칙으로 글을 가져옵니다:

```javascript
// 오직 Status가 "Published"인 글만
Status = "Published"

// Created 날짜 기준 내림차순 정렬
Sort by: Created (newest first)
```

---

## Frontmatter 변환

Notion 속성이 Markdown Frontmatter로 변환됩니다:

**Notion:**
```
Title: React Hooks 가이드
Description: useState부터...
Status: Published
Tags: React, JavaScript
Created: 2024-01-15
Cover: cover.jpg
Pinned: true
```

**Markdown:**
```yaml
---
title: "React Hooks 가이드"
description: "useState부터..."
pubDate: 2024-01-15T00:00:00.000Z
heroImage: "/images/react-hooks-가이드-hero.jpg"
tags: ["React", "JavaScript"]
pinned: true
notionId: "abc123..."
---
```

---

## 이미지 처리

### Cover 이미지
- Notion의 Cover 속성 → `heroImage`
- 자동으로 `/public/images/`에 다운로드
- 파일명: `{글제목}-hero.{확장자}`

### 본문 이미지
- Notion 페이지 내 이미지 → 자동 다운로드
- 파일명: `{글제목}-{순번}.{확장자}`
- Markdown 경로 자동 변경

---

## 데이터베이스 뷰 설정 (선택)

Notion에서 편리한 관리를 위한 뷰 추가:

### 1. 발행된 글만 보기
```
Filter: Status = Published
Sort: Created (newest)
```

### 2. 고정된 글 보기
```
Filter: Pinned = Checked
```

### 3. 태그별 보기
```
Group by: Tags
```

### 4. 작성 중인 글
```
Filter: Status = Draft
```

---

## 속성 변경 시 주의사항

⚠️ **속성 이름 변경 금지**

다음 속성 이름은 코드에서 사용되므로 변경하면 안 됩니다:
- `Title` (또는 `Name`)
- `Description`
- `Status`
- `Tags`
- `Created`
- `Cover`
- `Pinned`

속성 이름을 변경하려면 `scripts/sync-notion.mjs` 파일도 함께 수정해야 합니다.

---

## 확장 가능한 속성

필요에 따라 추가할 수 있는 속성들:

### Author (Select)
```
글 작성자 (여러 작성자가 있을 때)
```

### Category (Select)
```
대분류 카테고리
예: Tutorial, Review, News
```

### ReadTime (Number)
```
예상 읽기 시간 (분)
자동 계산되므로 불필요
```

### Views (Number)
```
조회수 (선택사항)
현재는 API로 관리됨
```

---

## 문제 해결

### "속성을 찾을 수 없습니다"
- 속성 이름 철자 확인
- 대소문자 구분 확인
- Notion과 코드 속성명 일치 확인

### "날짜 형식이 잘못되었습니다"
- Created 속성이 Date 타입인지 확인
- 날짜 값이 비어있지 않은지 확인

### "이미지가 다운로드되지 않습니다"
- Notion에서 이미지 업로드 확인
- 인터넷 연결 확인
- 이미지 URL 접근 권한 확인
