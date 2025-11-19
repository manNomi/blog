# Vercel KV (Redis) 설정 가이드

이 가이드는 블로그의 조회수와 좋아요 기능을 위해 Vercel KV를 설정하는 방법을 설명합니다.

## 🎯 Vercel KV란?

**Vercel KV**는 Vercel이 제공하는 서버리스 Redis 데이터베이스입니다.

- ✅ **영속적 데이터 저장** (서버 재시작해도 데이터 유지)
- ✅ **빠른 속도** (메모리 기반 데이터베이스)
- ✅ **무료 티어** (월 30,000 명령어)
- ✅ **자동 스케일링**
- ✅ **환경 변수 자동 설정**

---

## 📋 사전 요구사항

- Vercel 계정
- Vercel에 배포된 프로젝트 (`manNomi/blog`)

---

## 🚀 설정 단계

### 1단계: Vercel KV 스토어 생성

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택: `manNomi/blog`

2. **Storage 탭으로 이동**
   - 상단 메뉴에서 **Storage** 클릭
   - 또는 직접 이동: https://vercel.com/mannomi/blog/stores

3. **Create Database 클릭**
   - **KV (Redis compatible)** 선택
   - 데이터베이스 이름 입력 (예: `blog-kv`)
   - 리전 선택: **Asia Pacific (Tokyo)** 또는 **Asia Pacific (Seoul)** (가까운 곳)

4. **Create** 버튼 클릭

5. **프로젝트 연결**
   - "Connect to Project" 클릭
   - `blog` 프로젝트 선택
   - **Connect** 클릭

### 2단계: 환경 변수 자동 설정 확인

Vercel KV를 프로젝트에 연결하면 다음 환경 변수가 **자동으로** 설정됩니다:

```bash
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

**확인 방법:**
1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. `KV_REST_API_*` 환경 변수 3개 확인

### 3단계: 로컬 개발 환경 설정 (선택사항)

로컬에서 테스트하려면 환경 변수를 `.env` 파일에 추가:

1. Vercel CLI 설치 및 로그인
   ```bash
   npm install -g vercel
   vercel login
   ```

2. 환경 변수 가져오기
   ```bash
   vercel env pull .env
   ```

3. 생성된 `.env` 파일 확인
   ```bash
   cat .env
   ```

### 4단계: 배포 및 테스트

1. **코드 푸시**
   ```bash
   git push
   ```

2. **Vercel 자동 배포 대기** (약 2-3분)

3. **배포된 사이트에서 테스트**
   - 포스트 페이지 방문
   - 조회수가 증가하는지 확인
   - 좋아요 버튼 클릭 테스트

4. **Vercel KV 대시보드에서 데이터 확인**
   - Storage → `blog-kv` → Data Browser
   - `views:*`, `likes:*` 키 확인

---

## 🔑 Redis 키 구조

블로그에서 사용하는 Redis 키 구조:

### 조회수
```
views:{slug}           → 숫자 (조회수)

예시:
views:hello-world      → 123
views:react-tutorial   → 456
```

### 좋아요
```
likes:{slug}           → 숫자 (좋아요 수)
likes:{slug}:users     → Set (좋아요 누른 사용자 IP 목록)

예시:
likes:hello-world             → 42
likes:hello-world:users       → {"192.168.1.1", "10.0.0.1", ...}
```

---

## 📊 Vercel KV 무료 티어 제한

| 항목 | 무료 티어 | 설명 |
|------|----------|------|
| 월간 명령어 수 | 30,000개 | 약 1,000 페이지뷰/일 지원 |
| 데이터 저장 용량 | 256 MB | 충분한 용량 |
| 데이터 전송 | 100 MB/월 | 일반적으로 충분 |
| 동시 연결 | 30개 | 충분한 수준 |

**참고:** 트래픽이 많아지면 Pro 플랜 고려 ($20/월)

---

## 🔧 데이터 관리

### 데이터 확인 (Vercel Dashboard)

1. Vercel → Storage → `blog-kv`
2. **Data Browser** 탭
3. 키 검색: `views:*` 또는 `likes:*`

### 데이터 삭제 (필요시)

**모든 조회수 초기화:**
```bash
# Vercel CLI로 KV 접속
vercel env pull
```

Vercel Dashboard → Data Browser에서 개별 키 삭제 가능

### 데이터 백업 (선택사항)

Vercel KV는 자동 백업을 제공하지 않으므로, 중요한 데이터는 별도로 백업하는 것을 권장합니다.

---

## 🐛 문제 해결

### "Failed to fetch views" 에러

**원인:**
- Vercel KV가 프로젝트에 연결되지 않았거나
- 환경 변수가 설정되지 않음

**해결:**
1. Vercel Dashboard → Storage → KV → Connect to Project
2. Settings → Environment Variables에서 `KV_REST_API_*` 확인
3. 재배포: `git push` 또는 Vercel Dashboard에서 "Redeploy"

### 로컬 개발시 "Failed to update views" 에러

**원인:**
- 로컬에 환경 변수 없음

**해결:**
```bash
vercel env pull .env
npm run dev
```

또는 에러를 무시하고 개발 (프로덕션에서만 작동)

### 조회수/좋아요가 증가하지 않음

**원인:**
- API 라우트가 제대로 호출되지 않음
- Vercel KV 연결 오류

**해결:**
1. 브라우저 개발자 도구(F12) → Network 탭 확인
2. `/api/views/` 또는 `/api/likes/` 요청 확인
3. 응답 코드 확인 (200 OK 여야 함)
4. Vercel 로그 확인: Vercel Dashboard → Deployments → Logs

### 무료 티어 제한 초과

**증상:**
- "Rate limit exceeded" 에러

**해결:**
1. Vercel Dashboard → Storage → `blog-kv` → Usage 확인
2. 트래픽이 많으면 Pro 플랜 업그레이드 고려
3. 또는 조회수 증가 로직을 최적화 (예: 중복 카운트 방지)

---

## 💰 비용 예측

**일일 페이지뷰별 월간 명령어 수:**

| 일일 페이지뷰 | 월간 명령어 수 | 무료 티어 |
|-------------|--------------|----------|
| 100 | 3,000 | ✅ 충분 |
| 500 | 15,000 | ✅ 충분 |
| 1,000 | 30,000 | ⚠️ 한계 |
| 2,000 | 60,000 | ❌ 초과 |

**계산식:**
- 조회수: 1 페이지뷰 = 1 명령어 (INCR)
- 좋아요 조회: 1 페이지뷰 = 2 명령어 (GET + SISMEMBER)
- 좋아요 클릭: 1 클릭 = 3-4 명령어 (SADD/SREM + INCR/DECR)

---

## 🔒 보안 고려사항

1. **환경 변수 보호**
   - `.env` 파일을 `.gitignore`에 추가 (이미 추가됨)
   - 환경 변수를 절대 공개 저장소에 커밋하지 않기

2. **Rate Limiting**
   - 현재 구현은 IP 기반 중복 좋아요 방지
   - 필요시 API Rate Limiting 추가 고려

3. **데이터 검증**
   - API에서 slug 파라미터 검증 (현재 구현됨)

---

## 📚 추가 자료

- [Vercel KV 공식 문서](https://vercel.com/docs/storage/vercel-kv)
- [Redis 명령어 참고](https://redis.io/commands)
- [@vercel/kv SDK 문서](https://vercel.com/docs/storage/vercel-kv/kv-reference)

---

## ✅ 체크리스트

설정이 완료되었는지 확인:

- [ ] Vercel KV 스토어 생성 완료
- [ ] 프로젝트에 KV 연결 완료
- [ ] 환경 변수 자동 설정 확인 (`KV_REST_API_*`)
- [ ] 코드 푸시 및 배포 완료
- [ ] 포스트 페이지에서 조회수 증가 확인
- [ ] 좋아요 버튼 작동 확인
- [ ] Vercel KV Data Browser에서 데이터 확인

모든 항목이 체크되면 설정이 완료된 것입니다!
