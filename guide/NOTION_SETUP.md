# 🔗 Notion 연결 초간단 가이드

## 📌 전체 과정 (3단계)

```
1. Notion Integration 만들기
2. 데이터베이스 만들고 연결하기
3. .env 파일에 정보 입력하기
```

---

## 1단계: Integration 만들기 (1분)

### ① 사이트 접속
```
https://www.notion.so/my-integrations
```

### ② 버튼 클릭
```
"+ New integration" 버튼 클릭
```

### ③ 정보 입력
```
Name: Blog (아무 이름이나 OK)
Type: Internal 선택
Submit 클릭
```

### ④ 토큰 복사
```
"Internal Integration Token" 복사
secret_로 시작하는 긴 문자열

⚠️ 복사한 토큰 어딘가에 임시 저장!
```

---

## 2단계: 데이터베이스 만들기 (2분)

### ① Notion에서 새 페이지
```
Notion 앱/웹 → 새 페이지 만들기
페이지 이름: "기술 블로그"
```

### ② 데이터베이스 추가
```
페이지 안에서 /table 입력
"Table - Full page" 선택
```

### ③ 속성(열) 설정

**첫 번째 열 (Title)**
- 이미 있음, 이름만 "Title"로 변경

**나머지 추가 (우측 + 버튼 클릭)**

| 속성 이름 | 타입 | 설명 |
|----------|------|------|
| Description | Text | 글 요약 설명 |
| Status | Select | 발행 상태 (Draft/Published) |
| Tags | Multi-select | 여러 태그 선택 |
| Created | Date | 작성 날짜 |
| Cover | Files & media | 썸네일 이미지 |
| Pinned | Checkbox | 메인에 고정 여부 |

**Status 속성 옵션 추가:**
- `Draft` (회색)
- `Published` (초록색) ← **필수!**

### ④ Integration 연결
```
데이터베이스 페이지 우측 상단 ... (점 3개) 클릭
→ "Connections" 또는 "Add connections"
→ 1단계에서 만든 "Blog" 선택
```

### ⑤ 데이터베이스 ID 복사
```
브라우저 주소창 URL 보기:
https://notion.so/workspace/여기32자리영숫자가ID?v=...
                          ↑------- 이 부분 복사 ------↑

⚠️ 복사한 ID 어딘가에 임시 저장!
```

---

## 3단계: .env 파일 만들기 (30초)

프로젝트 폴더 최상위에 `.env` 파일 생성:

```bash
NOTION_TOKEN=secret_여기에1단계에서복사한토큰붙여넣기
NOTION_DATABASE_ID=여기에2단계에서복사한32자리ID붙여넣기
```

**예시:**
```bash
NOTION_TOKEN=secret_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
NOTION_DATABASE_ID=1234567890abcdef1234567890abcdef
```

---

## ✅ 테스트하기

### ① Notion에 샘플 글 작성
```
데이터베이스에서 "+ New" 클릭

Title: 테스트 글
Status: Published ⭐ (필수!)
Created: 오늘 날짜

→ Title 클릭해서 페이지 열기
→ "안녕하세요 테스트입니다" 작성
```

### ② 동기화 실행
```bash
npm install
npm run sync:notion
```

**성공 메시지:**
```
🚀 Notion 동기화 시작...
📄 1개의 게시물을 찾았습니다.
📝 처리 중: 테스트 글
  ✓ 저장 완료: 테스트-글.md
✨ 동기화 완료!
```

### ③ 블로그 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:4321` 확인!

---

## 🚨 자주 하는 실수

### ❌ "Unauthorized" 에러
```
→ Integration 연결 안 함
→ 2단계 ④번 다시 확인
```

### ❌ "글이 안 나와요"
```
→ Status가 "Published"가 아님
→ Notion에서 Status 확인
```

### ❌ ".env 파일이 안 보여요"
```
→ 숨김 파일이라 안 보일 수 있음
→ VSCode에서는 보임
→ 터미널: ls -la 로 확인
```

### ❌ "Database not found"
```
→ 데이터베이스 ID가 잘못됨
→ URL에서 다시 복사
```

---

## 📝 완료 체크리스트

- [ ] https://notion.so/my-integrations 에서 Integration 생성
- [ ] Token 복사 (secret_로 시작)
- [ ] Notion에 데이터베이스 생성
- [ ] 7개 속성 추가 (Title, Description, Status, Tags, Created, Cover, Pinned)
- [ ] Status에 "Published" 옵션 추가
- [ ] 데이터베이스에 Integration 연결
- [ ] 데이터베이스 ID 복사
- [ ] 프로젝트에 .env 파일 생성
- [ ] NOTION_TOKEN과 NOTION_DATABASE_ID 입력
- [ ] 샘플 글 작성 (Status: Published)
- [ ] npm run sync:notion 실행
- [ ] 완료!

---

## 💡 추가 팁

### 이미지 추가하기
1. **커버 이미지**: Cover 속성에 파일 업로드 (썸네일로 사용됨)
2. **본문 이미지**: 페이지 안에서 `/image` 입력 후 업로드
3. **GIF**: 일반 이미지처럼 업로드하면 자동으로 애니메이션 재생

### 글 고정하기
- Pinned 체크박스를 체크하면 메인 페이지 "주요 글" 섹션에 표시됩니다
- 최대 3개까지 고정 가능

### 태그 활용하기
- Tags는 여러 개 선택 가능
- 블로그의 `/posts` 페이지에서 태그별 필터링 가능
- 태그별 글 개수도 자동으로 표시됨

---

## 🔄 일상적인 사용법

### 새 글 작성 시
1. Notion 데이터베이스에서 "+ New" 클릭
2. Title, Description, Tags, Created 입력
3. Status: **Published** 선택 (중요!)
4. 페이지 열어서 본문 작성
5. 터미널에서 `npm run sync:notion` 실행
6. 완료!

### 글 수정 시
1. Notion에서 글 수정
2. 터미널에서 `npm run sync:notion` 실행
3. 완료!

### 글 숨기기
1. Status를 "Draft"로 변경
2. `npm run sync:notion` 실행
3. 블로그에서 사라짐

---

## 📞 문제 해결

문제가 발생하면:
1. `.env` 파일에 토큰과 ID가 올바른지 확인
2. Notion에서 Integration이 데이터베이스에 연결되어 있는지 확인
3. Status가 "Published"인지 확인
4. `npm run sync:notion` 실행 시 에러 메시지 확인

그래도 안 되면 이슈 등록해주세요!
