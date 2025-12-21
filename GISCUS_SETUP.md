# Giscus 댓글 시스템 설정 가이드

Giscus는 GitHub Discussions를 기반으로 한 댓글 시스템입니다.

## 1. GitHub 저장소 설정

1. GitHub 저장소(`manNomi/blog`)로 이동
2. **Settings** → **General** → **Features** 섹션으로 이동
3. **Discussions** 체크박스를 활성화
4. 저장소에 Discussions가 활성화되면 자동으로 생성됩니다

## 2. Giscus 앱 설치

1. https://giscus.app 접속
2. 다음 정보를 입력:
   - **Repository**: `manNomi/blog`
   - **Discussion category**: `Comments` (또는 원하는 카테고리)
   - **Page ↔️ Discussions mapping**: `pathname` (URL 경로 기반)
   - **Discussion term**: `pathname` (또는 원하는 매핑 방식)
   - **Theme**: `light` (또는 `dark`, `auto`)
   - **Language**: `ko` (한국어)
   - **Enable reactions**: ✅ 체크
   - **Emit metadata**: ❌ 체크 해제
   - **Input position**: `bottom`

3. **Generate** 버튼 클릭

## 3. 설정값 확인

Giscus가 생성한 설정값을 확인합니다:

- `data-repo`: `manNomi/blog`
- `data-repo-id`: `R_kgDOLhYQJQ` (예시, 실제 값은 Giscus에서 확인)
- `data-category-id`: `DIC_kwDOLhYQJc4CgKqF` (예시, 실제 값은 Giscus에서 확인)

## 4. 코드에 반영

`src/components/Comments.tsx` 파일에서 다음 값들을 Giscus에서 생성한 실제 값으로 업데이트:

```tsx
script.setAttribute('data-repo-id', 'YOUR_ACTUAL_REPO_ID');
script.setAttribute('data-category-id', 'YOUR_ACTUAL_CATEGORY_ID');
```

## 5. 테스트

1. 블로그 포스트 페이지로 이동
2. 페이지 하단에 댓글 섹션이 표시되는지 확인
3. 댓글을 작성해보고 GitHub Discussions에 반영되는지 확인

## 문제 해결

### 댓글이 표시되지 않는 경우

1. **GitHub Discussions 활성화 확인**
   - 저장소 Settings → Features → Discussions가 활성화되어 있는지 확인

2. **Giscus 앱 설치 확인**
   - https://github.com/settings/installations 에서 Giscus 앱이 설치되어 있는지 확인

3. **카테고리 확인**
   - GitHub Discussions에서 "Comments" 카테고리가 생성되어 있는지 확인

4. **브라우저 콘솔 확인**
   - 개발자 도구(F12) → Console에서 에러 메시지 확인

### 댓글이 중복으로 표시되는 경우

- `data-strict` 속성을 `'1'`로 변경하여 엄격 모드 활성화

## 참고 자료

- Giscus 공식 문서: https://github.com/giscus/giscus
- Giscus 설정 페이지: https://giscus.app

