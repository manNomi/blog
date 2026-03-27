---
title: "Cloudflare Workers + TanStack Start — 빌드/배포 파이프라인의 복합 버그를 해부하다"
pubDate: 2026-01-16T00:00:00.000Z
notionId: "32f7cf19-a364-801e-9af7-f20b1af09282"
---> `realty-web`의 SSR 인프라를 Vercel에서 Cloudflare Workers로 마이그레이션하면서, CJS/ESM interop 빌드 실패부터 Turborepo 캐시 충돌, Worker 이름 이중 suffix까지 — Cloudflare Workers + TanStack Start + Turborepo 3개 도구가 맞물리는 지점에서 발생한 복합적인 문제들을 해결한 기록이에요.

---


## 이 글의 동기


어드민은 TanStack Start 기반 SSR을 Cloudflare Workers에 배포하는 구조예요. 


기존 Vercel에서 Cloudflare Workers로 마이그레이션하면서, 빌드/런타임 환경 차이로 인한 다양한 이슈가 발생했어요.


Node.js 런타임에서는 문제없던 코드들이 Cloudflare Workers의 ESM-only 런타임(`workerd`)에서 깨지기 시작했고, 빠르게 변화하는 TanStack Start의 breaking change까지 겹치면서 문제가 복합적으로 얽혔어요.


12월 말부터 1월 중순까지 약 2주간, **17개 PR**(테스트 PR 포함)을 통해 이 문제들을 하나씩 해결했어요.


---


## 1. 전체 타임라인


| **내용**                                |
| ------------------------------------- |
| CJS interop 패턴 빌드 수정                  |
| Cloudflare/TanStack 최신화 (최종)          |
| Relay loader 타입/SSR 비활성화              |
| CI 워크플로우 수정 (Turborepo 캐시 이슈)         |
| wrangler.toml 설정 수정                   |
| vite.config worker name 주석 처리         |
| wrangler + GitHub Actions 워크플로우 통합 수정 |


---


## 2. 사전 지식 — 왜 Cloudflare Workers에서 문제가 터지는가


Cloudflare Workers는 Node.js가 아닌 **자체 런타임(****`workerd`****)**을 사용해요. 핵심 차이는 다음과 같아요:

- **ESM-only 런타임** — Node.js에서 문제없던 CJS 패키지가 번들링 후 네임스페이스 import에서 깨져요
- **제한된 DOM 구현** — `miniflare`의 DOM 폴리필은 Node.js SSR과 동작이 달라요
- **로컬 재현 불가** — `wrangler dev`로 로컬 개발은 가능하지만, 프리뷰/프로덕션 배포에서만 드러나는 이슈가 많아요

이 특성 때문에, 한 문제를 고치면 다른 레이어에서 새 문제가 드러나는 연쇄적인 디버깅이 필요했어요.


---


## 3. 해결한 문제들


### 3.1 CJS/ESM Interop 빌드 실패 


**문제:** Cloudflare Workers(ESM 환경)에서 CJS 패키지를 사용할 때 빌드 후 런타임 에러가 발생했어요. Vite/Rollup이 ESM → CJS interop 코드를 생성할 때 `.default`가 중복되는 버그예요:


```javascript
// ❌ 생성된 버그 코드 (double .default)
_interopRequireDefault$X.default.default

// ✅ 올바른 코드
_interopRequireDefault$X.default
```


relay 버전을 올리게 되면서 빌드 후 코드가 변경되게 되었어요. 


기존 `fix-build.mjs`라는 후처리 스크립트가 `$Q` suffix만 처리하고 있어서, relay 외 다른 CJS 패키지에서 동일한 interop 에러가 발생했어요.


**해결:** 정규식을 `$A`~`$Z` 모든 대문자 suffix를 처리하도록 확장했어요. 동시에 Relay 패키지를 20.1.0으로 업그레이드하여 근본적 호환성을 개선했어요.


> 💡 Vite의 `cjsInterop` 플러그인으로 해결하려 했으나 불완전했어요.   
> 빌드 후처리 스크립트는 증상만 치료하는 임시방편이었고, 이후 스택 최신화로 근본 해결돼요.


---


### 3.2 TanStack Start + Cloudflare Vite Plugin 통합


**문제:**

- TanStack Start가 빠르게 업데이트되면서 라우터 초기화 방식이 변경됐어요 (싱글톤 → 팩토리 패턴 → 프레임워크 자체 관리)
- `@cloudflare/vite-plugin`이 TanStack Start의 SSR 번들과 충돌했어요
- 기존 빌드 결과물이 `.output/` 디렉토리에 생성되는 구조에서, 새 버전은 Vite 플러그인이 자동 관리하는 구조로 변경됐어요

**해결 과정** :

1. `@cloudflare/vite-plugin` 도입, `vite-plugin-cjs-interop` 제거
2. TanStack Start/Vite 버전 업데이트
3. 엔트리 포인트를 `client.tsx`로 변경, `RouterProvider` 사용 방식으로 전환
4. router 싱글톤 패턴 적용 → 테스트 → 다시 제거 (최신 TanStack Start가 자체 관리)
5. 개발 모드에서 cloudflare/tanstackStart 플러그인 비활성화 (로컬 개발 속도)
6. start 스크립트 간소화
7. 레거시 `fix-build.mjs` 스크립트 최종 삭제

> ⚠️ **왜 테스트 PR이 5개나 필요했나:** Cloudflare Workers 환경은 로컬 `wrangler dev`로 완전 재현이 불가능해요. 프리뷰 배포에서만 확인 가능한 이슈들이 있었어요:  
> - env별 Worker 이름 suffix 규칙 (`{name}-{env}`)  
>   
> - `wrangler.toml`의 `main` 필드가 패키지 스펙파이어인지 실제 경로인지에 따른 동작 차이  
>   
> - GitHub Actions에서 `--env` 옵션 주입 시 이름 중복 문제


**핵심 설정 변경:**


```typescript
// ❌ AS-IS (v1.128)
tanstackStart({
  customViteReactPlugin: true,  // deprecated in v1.145
  target: 'cloudflare-module',  // deprecated
}),
cjsInterop({
  dependencies: ['@sentry/react', 'react-relay', 'relay-runtime', ...],
}),

// ✅ TO-BE (v1.145)
cloudflare({
  viteEnvironment: { name: 'ssr' },
  config() {
    return {
      name: WORKER_NAME,
      vars: { VITE_STAGE: STAGE },
    };
  },
}),
tanstackStart(),  // 옵션 없이 사용
```


**제거된 의존성:**

- ~~`vite-plugin-cjs-interop`~~ — Vite 7.0의 ESM 호환성 개선으로 불필요해요
- ~~`fix-build.mjs`~~ (Post-build regex script) — 삭제

최종 변경: 주로 레거시 코드 삭제가 커요


---


### 3.5 Relay Loader 타입 캐스팅 및 SSR 비활성화 (#5146)


**문제:** TanStack Router의 `loader`에서 Relay의 `loadQuery` 반환값을 사용하면 타입 에러가 발생했어요. 기존에는 `as any`로 우회하고 있었어요 (FIXME 태그).


**원인:** TanStack Router의 loader는 직렬화 가능한(serializable) 값만 반환할 수 있는데, Relay의 `loadQuery` 결과에는 함수가 포함돼요. SSR 모드에서 직렬화를 강제하기 때문에 타입 에러가 발생했어요.


**해결:** router 설정에서 `ssr: false` 옵션을 추가하여 직렬화 요구를 제거했어요. `as any` 캐스팅도 완전 제거했어요. 


> 💡 **기술 포인트:** 실제로 이 프로젝트는 SSR을 사용하지 않으면서 SSR 모드가 켜져 있어서 불필요한 타입 제약이 걸려 있었어요. `ssr: false` 설정으로 Relay와 TanStack Router의 타입 호환성 문제를 근본적으로 해결했어요.


---


### 3.6 Turborepo 캐시 + Wrangler 배포 충돌


**문제:** Turborepo 캐시 히트 시 `wrangler deploy`가 실패했어요.


**원인 분석:**


```javascript
// 정상 플로우:
wrangler.toml (main = "@tanstack/react-start/server-entry")  ← 패키지 스펙파이어
  ↓ vite build (plugin이 스펙파이어를 실제 경로로 resolve)
  ↓ dist/server/wrangler.json (실제 경로로 변환됨)
  ↓ wrangler deploy ✅

// Turborepo 캐시 히트 시:
빌드 스킵 (resolve 과정 미실행)
  → dist/server/wrangler.json은 캐시에서 복원됨
  → Wrangler가 소스 wrangler.toml을 읽으면 resolve 안 된 스펙파이어를 만나 실패 ❌
```


**해결:** GitHub Actions 워크플로우에서 Wrangler가 빌드 산출물의 `wrangler.json`을 읽도록 deploy 명령어를 수정했어요.


> 💡 **기술 포인트:** `@cloudflare/vite-plugin`이 빌드 시점에 `wrangler.toml`의 스펙파이어를 resolve해서 별도의 `wrangler.json`을 생성하는데, Turborepo 캐시가 이 과정을 스킵하면서 발생하는 엣지 케이스예요. **Cloudflare + TanStack Start + Turborepo 3개 도구의 빌드 파이프라인이 맞물리는 지점**에서의 문제였어요.


---


### 3.7 Worker 이름 중복 배포 버그 


**문제:** `wrangler deploy --env alpha` 실행 시 Worker 이름이 `client-alpha-alpha`로 이중 suffix가 붙는 문제가 있었어요.


**원인:**

1. 이전에 suffix가 안 붙는 버그를 해결하려고 `vite.config.ts`에 `WORKER_NAME = 'client-web-production' | 'client-web-alpha'`를 하드코딩했어요
2. 이후 Turborepo 대응으로 `--env` 옵션이 추가되면서, Wrangler가 `{name}-{env}` 규칙을 자동 적용했어요
3. 결과: `realty-web-alpha`(하드코딩) + `-alpha`(`--env`) = **`client-web-alpha-alpha`**

**해결:**

- `wrangler.toml`에서 `name` 필드와 env 섹션을 제거했어요
- `vite.config.ts`의 `WORKER_NAME` 하드코딩을 제거했어요
- 이름과 환경을 빌드 시점이 아닌 Cloudflare CLI 옵션(`--env`)으로만 제어하도록 통일했어요
- GitHub Actions 워크플로우를 이 변경에 맞춰 업데이트했어요

---


## 4. Cloudflare SDK 소스 코드 분석


이 작업의 핵심 전환점은 **Cloudflare Workers SDK의 내부 코드를 직접 분석**한 거예요. 공식 문서만으로는 이해할 수 없는 동작들이 있었어요.


### Redirected Configuration 패턴


```javascript
wrangler.toml (개발자 작성)
  ↓ Vite 빌드 시 (@cloudflare/vite-plugin)
dist/server/wrangler.json (자동 생성, 실제 배포에 사용)
  ↓
wrangler deploy
```


### SDK 소스 분석 경로


Cloudflare Workers SDK(`packages/vite-plugin-cloudflare/src/`)를 직접 분석하여 확인한 내용이에요:

1. **`plugin-config.ts`** — `config()` 커스터마이저가 `defu`로 병합되는 구조예요
2. **`workers-configs.ts`** — `unstable_readConfig()`에서 env 파라미터 전달 방식이에요
3. **`validation.ts`** — `@nonInheritable` 속성으로 인해 `vars`가 환경 미지정 시 빈 객체 `{}`로 반환되는 원인이에요

```typescript
// packages/workers-utils/src/config/validation.ts:1444-1453
vars: notInheritable(
  diagnostics, topLevelEnv, rawConfig, rawEnv, envName,
  "vars", validateVars(envName),
  {}  // 👈 기본값: 빈 객체 — 환경 미지정 시 vars 상속 안 됨
)
```


### 소스 분석으로 발견한 추가 배포 이슈 4가지

1. **환경변수 미배포** — `@nonInheritable` 속성 때문에 `vars`가 빈 객체 → `config()` 커스터마이저로 직접 주입했어요
2. **compatibility_flags 중복** — `...workerConfig` 스프레드로 `["nodejs_compat", "nodejs_compat"]` 발생 → 스프레드를 제거하고, `defu` 자동 병합을 활용했어요
3. **Worker 이름 오류** — top-level `name = "realty-web"` 만 사용됨 → `[env.alpha]`, `[env.production]`에 `name`을 명시했어요
4. **name이 vars에 들어감** — config 구조 실수로 worker 이름이 환경변수에 할당 → `name`은 최상위, `vars` 안에 `VITE_STAGE`만 넣도록 수정했어요

---


## 5. 최종 결과


### 빌드 파이프라인 비교


```bash
# ❌ AS-IS (fix-build 포함, 3단계)
1. Install dependencies
2. Build (Vite)
3. Post-build fix (fix-build.js) ← CJS interop 버그 수정
4. Deploy: wrangler deploy .output/server/index.mjs --assets .output/public

# ✅ TO-BE (fix-build 제거, 2단계)
1. Install dependencies
2. Build (Vite) → dist/ 자동 생성
3. Deploy: wrangler deploy  ← 설정은 wrangler.toml + @cloudflare/vite-plugin이 처리
```


### Before vs. After


| 비교 항목              | 기존 (Post-build Fix)        | 최종 (스택 최신화)                               |
| ------------------ | -------------------------- | ----------------------------------------- |
| **CJS interop 해결** | 빌드 후 정규식으로 패치              | Vite 7.0 + @cloudflare/vite-plugin이 근본 해결 |
| **빌드 파이프라인**       | build → fix → deploy (3단계) | build → deploy (2단계)                      |
| **유지보수**           | 정규식 패턴 관리 필요               | 추가 관리 불필요                                 |
| **안정성**            | Vite 업데이트 시 깨질 위험          | 공식 플러그인 기반으로 안정적                          |


---


## 6. 회고 — 왜 이 작업이 어려웠는가


### 3개 도구의 교차점


Cloudflare Workers + TanStack Start + Turborepo — 각각은 잘 동작하지만, **3개가 맞물리는 빌드/배포 파이프라인에서 예측할 수 없는 문제**가 발생했어요. 한 도구의 설정을 변경하면 다른 도구와의 상호작용에서 새로운 문제가 드러났어요.


### 로컬에서 재현 불가


Cloudflare Workers 환경 특유의 제약 때문에 로컬 `wrangler dev`로는 완전 재현이 불가능했어요. 프리뷰 배포를 통한 검증이 필수였고, 이것이 테스트 PR이 5개나 필요했던 이유예요.


### 빠르게 변하는 프레임워크


TanStack Start가 v1.128 → v1.145 사이에 라우터 초기화 방식, 빌드 결과물 구조, 진입점까지 모두 바뀌었어요. breaking change를 따라가면서 프로덕션 안정성을 유지하는 것 자체가 도전이었어요.


### 결국 배운 것

1. **SDK 소스 코드를 직접 읽어라** — 공식 문서만으로는 `@nonInheritable`, Redirected Configuration 같은 내부 동작을 이해할 수 없었어요
2. **임시 패치보다 스택 최신화** — Post-build script는 증상 치료, Vite 7.0 + TanStack Start v1.145 업그레이드가 근본 해결이에요
3. **`defu`** **병합 패턴 이해** — `config()` 커스터마이저 반환 값이 우선순위를 가지며, `...workerConfig` 스프레드는 중복 문제를 유발해요
4. **SSR에서 싱글톤은 금물** — 사용자 A의 Relay 캐시가 사용자 B에게 노출될 수 있는 보안 위험이 있어요
5. **`StartClient`** **vs** **`RouterProvider`** — 서버 전용 API(`AsyncLocalStorage`)가 브라우저에서 터지는 문제에 주의해야 해요

---


## 7. 관련 이슈 & 레퍼런스


### 공개 이슈

- [vitejs/vite#13899](https://github.com/vitejs/vite/issues/13899) — Vite CJS interop 버그 (2023년부터 알려진 이슈)
- [vitejs/vite#14158](https://github.com/vitejs/vite/issues/14158) — SSR에서 CJS npm 패키지 처리 실패
- [rolldown/rolldown#7973](https://github.com/rolldown/rolldown/issues/7973) — CJS-ESM interop 버그 (Vite 8에서도 수정 중)
- [nitrojs/nitro#1679](https://github.com/nitrojs/nitro/issues/1679) — Nitro 유사 패턴
- [facebook/relay#4935](https://github.com/facebook/relay/pull/4935) — Relay 20.x ESM 변경
- [StackOverflow: TanStack Start + Relay + Cloudflare](https://stackoverflow.com/questions/79754373/sr-is-not-a-function-when-deploying-tanstack-start-app-using-relay-on-cloudfla) — 동일 이슈 보고

### 공개 도구 & 문서

- [TanStack Start Cloudflare Hosting 가이드](https://tanstack.com/start/latest/docs/framework/react/hosting#cloudflare-workers)
- [Cloudflare Vite Plugin 공식 문서](https://developers.cloudflare.com/workers/vite-plugin/)
- [Cloudflare Workers SDK 소스](https://github.com/cloudflare/workers-sdk) — `packages/vite-plugin-cloudflare/src/` 분석
- [@cloudflare/unenv-preset](https://www.npmjs.com/package/@cloudflare/unenv-preset) — Workers Node.js 호환 폴리필
- [Cloudflare Blog: Introducing the Vite Plugin](https://blog.cloudflare.com/introducing-the-cloudflare-vite-plugin/)
- [vite-plugin-cjs-interop](https://github.com/cyco130/vite-plugin-cjs-interop) — CJS default export 언래핑 플러그인 (제거됨)
