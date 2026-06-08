---
title: "vinext 기여 1"
pubDate: 2026-05-29T00:00:00.000Z
notionId: "36c7cf19-a364-80ba-862e-fa1f8c386ce0"
---
---


# **Vinext** **`useRouter().bfcacheId`** **placeholder 지원 추가**


## **한 줄 요약**


Vinext의 `next/navigation` shim이 Next.js 최신 `useRouter().bfcacheId` API를 지원하도록, App Router singleton과 관련 타입에 `bfcacheId` 필드를 추가하고 우선 `"0"` placeholder 값을 반환하도록 수정했다.


## **PR 정보**


PR은 `fix(shims): add placeholder useRouter bfcacheId`라는 제목으로 2026년 5월 14일 `cloudflare/vinext`의 `main` 브랜치에 머지되었다. 변경 범위는 TypeScript 파일 4개, 총 `+12 / -0`의 작은 shim 호환성 수정이다.


```plain text
PR: cloudflare/vinext#1192
상태: merged
PR head commit: 478500f fix(shims): add useRouter bfcacheId placeholder
main merge commit: 275f8bd
```


## **배경**


Next.js 쪽에서 App Router의 `useRouter()` 반환값에 `bfcacheId`라는 새 필드가 추가되었다. 이 값은 현재 route segment에 스코프가 잡힌 opaque string identifier이며, fresh `push` 또는 `replace` navigation으로 주변 segment가 새로 생성되면 바뀌고, browser back/forward, `router.refresh()`, search param-only navigation, hash-only navigation에서는 유지되는 의미를 가진다.


Next.js 문서 변경에서는 이 값을 React `key`로 사용하면 fresh navigation에서는 state preservation을 끊고, back/forward navigation에서는 기존 상태를 복원하는 용도로 사용할 수 있다고 설명한다. 다만 일반적인 경우에는 명시적인 state reset이나 데이터 기반 key를 우선 사용하고, `bfcacheId`는 기존 코드베이스 마이그레이션 같은 상황에서 마지막 수단으로 쓰는 것을 권장한다.


예시는 다음과 같다.


```typescript
"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const { bfcacheId } = useRouter();

  return <form key={bfcacheId}>{/* ... */}</form>;
}
```


## **Vinext에서 왜 수정이 필요했나?**


Vinext는 `next/navigation`과 App Router client runtime 일부를 shim으로 다시 구현하고 있다. 그래서 Next.js의 public API surface에 새 필드가 추가되면, Vinext의 runtime 객체와 타입 선언도 같이 따라가야 한다.


문제는 외부 라이브러리나 사용자 코드가 아래처럼 `bfcacheId`를 참조하거나 destructuring할 수 있다는 점이다.


```typescript
const router = useRouter();

router.bfcacheId;
```


또는:


```typescript
const { bfcacheId } = useRouter();
```


Vinext shim에 이 필드가 없으면 런타임에서는 값이 없고, 타입 레벨에서도 `AppRouterInstance` 또는 `next/navigation`의 `useRouter()` 반환 타입과 맞지 않게 된다. 관련 tracking issue에서도 Vinext가 `next/navigation`과 App Router client runtime을 재구현하기 때문에 `useRouter()`의 return type과 runtime에 `bfcacheId: string`을 노출해야 한다고 정리되어 있다.


## **이번 PR에서 한 일**


이번 PR은 full semantics 구현이 아니라, **API surface compatibility**를 먼저 맞추는 변경이다. PR 설명에서도 Next.js의 새 `useRouter().bfcacheId` 필드와 호환되도록 Vinext가 안정적인 `"0"` placeholder를 반환한다고 정리되어 있다. 이 값은 typed consumer나 `bfcacheId`를 destructuring하는 라이브러리가 깨지지 않도록 하기 위한 최소 구현이다.


핵심 변경은 네 가지다.


첫 번째로, `packages/vinext/src/shims/navigation.ts`의 App Router singleton에 `bfcacheId: "0"`이 추가되었다. 이 객체는 `useRouter()`가 반환하는 runtime 객체이므로, 실제 사용자 코드에서 `router.bfcacheId`를 읽었을 때 `"0"`이 반환된다.


```typescript
const _appRouter = {
  bfcacheId: "0",

  push(href: string, options?: { scroll?: boolean }): void {
    // ...
  },

  // ...
};
```


두 번째로, `packages/vinext/src/shims/next-shims.d.ts`의 `next/navigation` module declaration에 `bfcacheId: string`이 추가되었다. 이 변경으로 Vinext 환경에서 `useRouter()`를 import해 사용하는 코드가 TypeScript 상에서도 `bfcacheId` 필드를 정상적으로 인식할 수 있다.


```typescript
declare module "next/navigation" {
  export function useRouter(): {
    bfcacheId: string;
    push(href: string, options?: { scroll?: boolean }): void;
    replace(href: string, options?: { scroll?: boolean }): void;
    back(): void;
    forward(): void;
    refresh(): void;
    // ...
  };
}
```


세 번째로, 내부 호환 타입인 `AppRouterInstance`에도 `bfcacheId: string`이 추가되었다. 이 타입은 `packages/vinext/src/shims/internal/app-router-context.ts`에 있으며, Clerk나 `next-intl` 같은 third-party library와의 App Router compatibility에도 영향을 줄 수 있는 내부 타입 표면이다. PR 리뷰 코멘트에서도 runtime 값, public shim type, internal compatibility type 세 위치에 모두 필드를 추가한 점을 확인하고 있다.


```typescript
export type AppRouterInstance = {
  bfcacheId: string;
  back(): void;
  forward(): void;
  refresh(): void;
  // ...
};
```


네 번째로, `useRouter().bfcacheId`가 안정적인 placeholder로 노출되는지 테스트가 추가되었다. 테스트는 `useRouter()`를 두 번 호출한 뒤, `bfcacheId`가 string인지, 값이 `"0"`인지, 여러 호출 사이에서도 같은 값으로 유지되는지 확인한다.


```typescript
it("useRouter() exposes the stable bfcacheId placeholder", async () => {
  const { useRouter } = await import("../packages/vinext/src/shims/navigation.js");

  const first = useRouter();
  const second = useRouter();

  expect(typeof first.bfcacheId).toBe("string");
  expect(first.bfcacheId).toBe("0");
  expect(second.bfcacheId).toBe(first.bfcacheId);
});
```


## **왜** **`"0"`****인가?**


`"0"`은 완전한 `bfcacheId` semantics를 구현한 값이 아니라, 우선 호환성을 맞추기 위한 안정적인 placeholder다.


Next.js upstream에서도 기본 App Router instance에는 `bfcacheId: '0'` default value가 들어가고, 실제 route segment별 값은 runtime에서 제공된다는 주석이 추가되었다.


Vinext tracking issue에서도 초기 hydration tree와 Pages Router adapter에서는 placeholder string `'0'`이 사용되며, counter는 실제 client-side navigation에서만 진행된다고 설명한다. Vinext 입장에서는 우선 이 placeholder를 반환하는 것만으로도 `bfcacheId`를 destructuring하는 consumer가 깨지는 문제를 막을 수 있다.


즉, 이번 PR의 목적은 다음과 같다.


```plain text
Next.js API에 bfcacheId가 생김
→ Vinext shim에도 같은 필드가 있어야 함
→ 아직 segment-cache 기반 full semantics는 없음
→ 일단 "0" placeholder로 런타임/타입 호환성 확보
```


## **하지 않은 것**


이번 PR은 `bfcacheId`의 full behavior를 구현하지 않았다.


Next.js에서 `bfcacheId`는 segment-cache, CacheNode, browser history state와 연결된 동작을 가진다. tracking issue에서는 이 값이 closest CacheNode에서 파생되고, 실제 값은 `_b_<n>_` 형태이며, back/forward에서는 BFCache entry에서 복원되고, fresh route change에서는 새 id가 만들어진다고 설명한다.


따라서 Vinext에서 완전한 parity를 맞추려면 이후에 다음 동작들이 추가로 필요하다.


```plain text
- segment별 bfcache id 생성
- router.push() / router.replace()로 새 segment 진입 시 id 변경
- browser back/forward 시 이전 id 복원
- router.refresh()에서 id 보존
- search param-only navigation에서 id 보존
- hash-only navigation에서 id 보존
```


실제로 PR #1192 이후 follow-up으로 `Implement segment-scoped useRouter bfcacheId semantics` PR #1197이 열렸고, 이 PR은 segment-scoped 값 구현, history state에 bfcache id map 저장, back/forward 복원, hash/search-param navigation과 refresh에서 id 보존 등을 다루는 후속 작업으로 설명되어 있다.


## **변경 파일**


이번 PR에서 변경된 파일은 4개다. GitHub files changed 화면에서도 아래 파일들이 표시된다.


```plain text
packages/vinext/src/shims/navigation.ts
packages/vinext/src/shims/next-shims.d.ts
packages/vinext/src/shims/internal/app-router-context.ts
tests/shims.test.ts
```


파일별 역할은 다음과 같이 정리할 수 있다.


```plain text
navigation.ts
→ useRouter()가 반환하는 runtime App Router singleton에 bfcacheId: "0" 추가

next-shims.d.ts
→ next/navigation의 public useRouter() 타입에 bfcacheId: string 추가

internal/app-router-context.ts
→ 내부 AppRouterInstance compatibility type에 bfcacheId: string 추가

tests/shims.test.ts
→ useRouter().bfcacheId가 "0"이고 안정적으로 유지되는지 테스트 추가
```


## **검증**


PR 설명에 포함된 검증 커맨드는 다음과 같다.


```bash
CI=true pnpm test tests/shims.test.ts -t "useRouter"

pnpm exec vp check packages/vinext/src/shims/navigation.ts packages/vinext/src/shims/next-shims.d.ts packages/vinext/src/shims/internal/app-router-context.ts tests/shims.test.ts
```


## **정리**


이번 변경은 기능적으로는 작지만, Next.js compatibility 관점에서는 중요한 shim 업데이트다.


Next.js의 `next/navigation` `useRouter()`에 `bfcacheId`가 추가되면서, Vinext도 같은 필드를 runtime과 type surface에 노출해야 했다. PR #1192는 완전한 segment-scoped semantics를 구현하지는 않고, 우선 `"0"` placeholder를 반환하도록 만들어 사용자 코드와 외부 라이브러리가 깨지지 않게 했다.


결과적으로 아래 코드는 Vinext에서도 타입 에러나 런타임 문제 없이 동작할 수 있게 되었다.


```typescript
const router = useRouter();

console.log(router.bfcacheId); // "0"
```


다만 `"0"`은 placeholder일 뿐이며, fresh navigation마다 id가 바뀌고 back/forward에서는 복원되는 Next.js의 full behavior는 후속 segment-cache 구현에서 다뤄야 한다.
