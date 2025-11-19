# Giscus 댓글 시스템 설정 가이드

이 가이드는 블로그에 Giscus 댓글 시스템을 설정하는 방법을 설명합니다.

## 📋 사전 요구사항

- GitHub 저장소: `manNomi/blog`
- GitHub 계정 권한: 저장소 관리자 권한 필요

---

## 🚀 설정 단계

### 1단계: GitHub Discussions 활성화

1. GitHub 저장소로 이동: https://github.com/manNomi/blog
2. **Settings** 탭 클릭
3. **Features** 섹션에서 **Discussions** 체크박스 활성화
4. 저장

### 2단계: Giscus 앱 설치

1. Giscus GitHub App 페이지 방문: https://github.com/apps/giscus
2. **Install** 버튼 클릭
3. 설치할 저장소 선택:
   - "Only select repositories" 선택
   - `manNomi/blog` 저장소 선택
4. **Install** 클릭하여 설치 완료

### 3단계: Giscus 설정값 생성

1. Giscus 설정 페이지 방문: https://giscus.app
2. **Repository** 입력란에 `manNomi/blog` 입력
3. 페이지 하단에서 생성된 스크립트 확인

#### 필요한 값:

```html
<script src="https://giscus.app/client.js"
        data-repo="manNomi/blog"
        data-repo-id="R_kgDO..."        <!-- 이 값 복사 -->
        data-category="General"
        data-category-id="DIC_kwDO..."  <!-- 이 값 복사 -->
        ...
</script>
```

**복사해야 할 값:**
- `data-repo-id`: `R_kgDO` 로 시작하는 ID
- `data-category-id`: `DIC_kwDO` 로 시작하는 ID

### 4단계: 코드에 설정값 적용

`src/components/Comments.tsx` 파일 수정:

**수정 전:**
```tsx
script.setAttribute('data-repo-id', 'R_kgDONYour_Repo_ID'); // TODO
script.setAttribute('data-category-id', 'DIC_kwDONYour_Category_ID'); // TODO
```

**수정 후:**
```tsx
script.setAttribute('data-repo-id', 'R_kgDO실제ID입력'); // 3단계에서 복사한 값
script.setAttribute('data-category-id', 'DIC_kwDO실제ID입력'); // 3단계에서 복사한 값
```

### 5단계: 배포 및 테스트

1. 변경사항 커밋 및 푸시
   ```bash
   git add src/components/Comments.tsx
   git commit -m "chore: Giscus 설정값 업데이트"
   git push
   ```

2. Vercel 자동 배포 대기 (약 2-3분)

3. 배포된 사이트에서 포스트 페이지 방문

4. 페이지 하단에 Giscus 댓글창 확인

---

## 🎨 설정 옵션 설명

현재 적용된 설정:

```tsx
script.setAttribute('data-mapping', 'pathname');           // URL 경로별로 댓글 구분
script.setAttribute('data-strict', '0');                  // 엄격 모드 비활성화
script.setAttribute('data-reactions-enabled', '1');       // 리액션 활성화
script.setAttribute('data-emit-metadata', '0');           // 메타데이터 전송 비활성화
script.setAttribute('data-input-position', 'bottom');     // 입력창 위치: 하단
script.setAttribute('data-theme', 'preferred_color_scheme'); // 시스템 테마 자동 감지
script.setAttribute('data-lang', 'ko');                   // 한국어 UI
```

### 커스터마이징 옵션

#### 테마 변경
- `'light'`: 라이트 모드 고정
- `'dark'`: 다크 모드 고정
- `'preferred_color_scheme'`: 시스템 설정 따라감 (권장)

#### 댓글 매핑 방식
- `'pathname'`: URL 경로 기준 (현재 설정)
- `'url'`: 전체 URL 기준
- `'title'`: 페이지 제목 기준
- `'og:title'`: Open Graph 제목 기준

#### 카테고리 변경
Discussions에서 원하는 카테고리 생성 후 Giscus 설정 페이지에서 선택

---

## ✅ 확인 사항

댓글 시스템이 제대로 작동하는지 확인:

- [ ] 포스트 페이지 하단에 Giscus 위젯 표시
- [ ] GitHub 계정으로 로그인 가능
- [ ] 댓글 작성 가능
- [ ] 작성된 댓글이 GitHub Discussions에 표시됨
- [ ] 다크모드 전환시 테마 자동 변경

---

## 🔧 문제 해결

### 댓글창이 안 보여요
1. 브라우저 콘솔(F12)에서 에러 확인
2. `data-repo-id`와 `data-category-id`가 올바른지 확인
3. GitHub Discussions가 활성화되어 있는지 확인
4. Giscus 앱이 설치되어 있는지 확인

### "Discussion not found" 에러
- Discussions 카테고리가 존재하는지 확인
- `data-category-id`가 올바른지 확인

### 로딩이 계속돼요
- 네트워크 연결 확인
- 저장소가 Public인지 확인 (Private 저장소는 Giscus 사용 불가)

---

## 📚 추가 자료

- [Giscus 공식 문서](https://giscus.app)
- [GitHub Discussions 문서](https://docs.github.com/en/discussions)
- [댓글 관리 대시보드](https://github.com/manNomi/blog/discussions)

---

## 💡 팁

1. **알림 설정**: GitHub에서 Discussions 알림을 받으려면
   - 저장소 → Settings → Notifications → "Participating and @mentions" 활성화

2. **댓글 관리**: GitHub Discussions에서 직접 댓글 수정/삭제 가능

3. **스팸 방지**: GitHub Settings → Moderation에서 차단 규칙 설정 가능

4. **리액션 분석**: Discussions에서 어떤 글이 인기있는지 확인 가능
