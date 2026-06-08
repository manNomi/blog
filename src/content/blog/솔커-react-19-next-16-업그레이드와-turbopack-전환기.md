---
title: "솔커 React 19, Next 16 업그레이드와 Turbopack 전환기"
pubDate: 2026-05-26T00:00:00.000Z
tags: ["솔리드 커넥션"]
notionId: "36c7cf19-a364-803a-8552-f19b4c06d17a"
---
# React 19, Next 16 업그레이드와 Turbopack 전환기


최근 `solid-connect-web`의 웹 앱을 React 19와 Next 16으로 올리는 작업을 진행했다. 처음 목표는 단순히 React 버전을 올리는 것이었지만, 실제로는 Next peer dependency, App Router 타입 변경, Sentry instrumentation, SVG loader, Turbopack 전환까지 이어지는 꽤 큰 호환성 작업이 됐다.


이번 글은 작업하면서 바뀐 내용, 마주친 문제, 해결 방법, 그리고 Turbopack 전환 후 빌드 시간이 얼마나 줄었는지를 정리한 기록이다.


## 업그레이드 버전


기존 웹 앱은 대략 아래 조합이었다.


```json
{
  "next": "^14.2.35",
  "react": "^18",
  "react-dom": "^18"
}
```


업그레이드 후에는 다음 조합이 됐다.


```json
{
  "next": "^16.2.6",
  "react": "^19.2.6",
  "react-dom": "^19.2.6"
}
```


React 19만 단독으로 올릴 수는 없었다. 기존 `next@14.2.35`는 React 18 peer dependency에 묶여 있었기 때문에 React 19를 쓰려면 Next도 함께 올려야 했다. 그래서 React 업그레이드 PR에는 Next 16 호환 작업도 같이 포함됐다.


## PR 구성


작업은 두 개의 PR로 나눴다.

- #533: React 19 업그레이드 및 Next 16 필수 호환 작업
- #534: Next 16 기본 Turbopack build 전환

처음부터 Turbopack까지 한 번에 넣지 않고, 먼저 webpack 기반으로 React 19 + Next 16 빌드를 안정화했다. 이후 별도 PR에서 Turbopack 전환만 분리했다. 이렇게 나눈 이유는 리뷰 범위를 줄이고, 문제가 생겼을 때 원인을 분리하기 위해서였다.


## 주요 변경 사항


### 1. React 19, Next 16 패키지 업그레이드


`apps/web/package.json`에서 React, ReactDOM, Next 관련 패키지를 올렸다.


```json
{
  "next": "^16.2.6",
  "react": "^19.2.6",
  "react-dom": "^19.2.6",
  "@next/third-parties": "^16.2.6",
  "@next/bundle-analyzer": "^16.2.6"
}
```


타입 패키지도 React 19 기준으로 맞췄다.


```json
{
  "@types/react": "19.2.15",
  "@types/react-dom": "19.2.3"
}
```


### 2. App Router page props 변경 대응


Next 16에서는 App Router의 `params`, `searchParams` 타입이 더 엄격해졌다.


기존에는 이런 식으로 바로 접근하던 코드가 있었다.


```typescript
const Page = ({ params }: { params: { id: string } }) => {
  const id = params.id;
};
```


Next 16 기준에 맞춰 Promise 형태로 처리했다.


```typescript
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
};
```


동적 라우트 페이지들에서 이런 변경이 필요했다.

- `/community/[boardCode]`
- `/community/[boardCode]/[postId]`
- `/mentor/[id]`
- `/mentor/chat/[chatId]`
- `/university/[homeUniversity]`

### 3. `cookies()` async 처리


`next/headers`의 `cookies()`도 async 기반으로 맞췄다.


```typescript
const isServerStateLogin = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  return !!(refreshToken && !isTokenExpired(refreshToken));
};
```


### 4. `revalidateTag` API 변경 대응


Next 16에서는 `revalidateTag`의 두 번째 인자가 요구된다.


기존 코드:


```typescript
revalidateTag(tag);
```


변경 후:


```typescript
revalidateTag(tag, { expire: 0 });
```


처음에는 `"max"`를 넣는 방식도 검토했지만, 기존 단일 인자 호출은 즉시 만료에 가까운 의도였기 때문에 `{ expire: 0 }`로 맞췄다.


### 5. Server Component 안의 `ssr: false` 제거


Next 16에서는 Server Component에서 아래 패턴이 더 엄격하게 막힌다.


```typescript
const ClientOnlyComponent = dynamic(() => import("./ClientOnlyComponent"), {
  ssr: false,
});
```


기존에는 이 패턴이 여러 페이지에 있었다. 빌드가 실패했기 때문에 정적 import로 바꾸거나, 이미 `"use client"`인 컴포넌트 boundary 안에서 처리되도록 정리했다.


예를 들어:


```typescript
import LoginContent from "./LoginContent";
```


처럼 바꿨다.


### 6. `FileList is not defined` 해결


성적 제출 폼의 Zod schema에서 `FileList`를 직접 참조하고 있었다.


```typescript
z.instanceof(FileList)
```


이 코드는 브라우저에서는 문제 없지만, 서버 프리렌더 환경에서는 `FileList`가 없어서 빌드가 실패한다.


해결 후:


```typescript
const isFileList = (value: unknown): value is FileList =>
  typeof FileList !== "undefined" && value instanceof FileList;

file: z.custom<FileList>(isFileList, "증명서 파일을 첨부해주세요.");
```


### 7. 깨진 favicon 교체


Next 16 빌드에서 기존 `favicon.ico`를 더 엄격하게 검사하면서 실패했다.


원인은 ICO 헤더의 크기 정보와 내부 PNG 크기 정보가 맞지 않는 파일이었다. 프로젝트에 이미 정상 ICO 파일이 있어서 `src/app/favicon.ico`를 정상 파일로 교체했다.


### 8. Sentry instrumentation 정리


Next 16 기준으로 Sentry 설정도 정리했다.


기존:


```plain text
sentry.client.config.ts
sentry.server.config.ts
sentry.edge.config.ts
```


변경 후:


```plain text
src/instrumentation.ts
src/instrumentation-client.ts
sentry.server.config.ts
sentry.edge.config.ts
```


`instrumentation.ts`에서는 server/edge 설정을 등록했다.


```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```


클라이언트 쪽에는 router transition hook도 추가했다.


```typescript
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```


### 9. `middleware.ts`를 `proxy.ts`로 이전


Next 16에서는 `middleware` file convention이 deprecated 경고를 낸다.


기존:


```plain text
src/middleware.ts
```


변경:


```plain text
src/proxy.ts
```


함수명도 바꿨다.


```typescript
export function proxy(request: NextRequest) {
  // ...
}
```


## Turbopack 전환


React 19 + Next 16 업그레이드 PR에서는 일단 안정성을 위해 webpack build를 유지했다.


```json
{
  "build": "next build --webpack"
}
```


그 이유는 프로젝트가 SVG를 `@svgr/webpack`으로 React 컴포넌트처럼 import하고 있었기 때문이다. Next 16의 기본 production build는 Turbopack이라 기존 webpack rule만으로는 SVG 처리가 되지 않았다.


별도 PR에서 Turbopack 설정을 추가했다.


```javascript
const nextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};
```


그 후 build script를 다시 기본값으로 되돌렸다.


```json
{
  "build": "next build",
  "analyze": "ANALYZE=true next build"
}
```


## 빌드 시간 변화


정확한 벤치마크 환경은 아니고, 로컬 push hook과 동일한 작업 흐름에서 관찰한 compile 단계 기준이다.


webpack build:


```plain text
Next.js 16.2.6 (webpack)
✓ Compiled successfully in 14.7s
```


Turbopack build:


```plain text
Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 7.5s
```


정리하면:



| 빌드 방식 | Compile 시간 |
| --- | --- |
| webpack | 14.7s |
| Turbopack | 7.5s |



약 49% 감소했고, 체감상 거의 2배 가까이 빨라졌다.


물론 전체 build 시간은 static page generation, trace collection, CI hook, admin build까지 포함되면 더 복잡해진다. 그래도 Next compile 단계만 보면 Turbopack 전환 효과는 꽤 분명했다.


## 검증한 명령어


웹 앱 기준으로 아래 명령을 모두 통과했다.


```bash
pnpm --filter @solid-connect/web lint:check
pnpm --filter @solid-connect/web typecheck
pnpm --filter @solid-connect/web ci:check
pnpm --filter @solid-connect/web build
```


push hook에서도 web/admin의 CI parity check와 build가 통과했다.


## 작업하면서 얻은 교훈


React 메이저 업그레이드는 React만 올리는 일이 아니었다. 실제로는 Next, Sentry, App Router 타입, 빌드 도구, asset 처리까지 같이 움직였다.


특히 이번 작업에서 중요했던 포인트는 세 가지였다.


첫째, peer dependency를 먼저 확인해야 한다. React 19를 쓰려면 Next 14를 유지하기 어렵기 때문에 Next 업그레이드는 사실상 필수였다.


둘째, 빌드는 단계적으로 안정화해야 한다. 처음부터 React 19, Next 16, Turbopack까지 한 번에 넣었다면 원인 파악이 훨씬 어려웠을 것이다.


셋째, Turbopack 전환은 단순히 `next build`로 바꾸는 일이 아니다. 기존 webpack loader에 기대고 있던 부분, 특히 SVG import 같은 자산 처리 경로를 명시적으로 옮겨줘야 한다.


## 마무리


이번 업그레이드로 `apps/web`은 React 19와 Next 16 최신 조합으로 올라갔다. 또한 별도 PR에서 Turbopack build까지 통과시켜 Next 16 기본 빌더로 전환할 준비도 끝냈다.


최종적으로는 다음 순서로 머지하면 된다.

1. React 19 + Next 16 호환 PR 머지
2. Turbopack build 전환 PR 머지

빌드 속도도 개선됐고, Next 16의 최신 컨벤션 경고도 대부분 정리됐다. 단순 버전업으로 시작했지만, 결과적으로는 앞으로의 프론트엔드 유지보수 기반을 한 단계 정리한 작업이었다.
