---
title: "next를 vite로 빌드하는 vinext"
description: "vinext 버그를 수정"
pubDate: 2026-06-09T00:00:00.000Z
notionId: "37a7cf19-a364-80ce-8b1e-c77742806d0f"
---
# **undefined 하나에서 시작한 Vinext 기여기:** **`useRouter().bfcacheId`****를 placeholder에서 실제 semantics까지 구현하기**


Vinext에 기여하게 된 시작은 아주 작은 에러였다.


Next.js App Router 코드를 Vinext 환경에서 돌리던 중 `useRouter().bfcacheId`를 읽는 코드가 깨졌다. 값이 없었다. 정확히는 Vinext의 `next/navigation` shim이 `useRouter()` 반환 객체에 `bfcacheId` 필드를 노출하지 않고 있었고, 이 필드를 참조하거나 destructuring하는 사용자 코드와 라이브러리는 `undefined`를 만나게 됐다.


처음에는 “필드 하나 추가하면 끝나는 문제 아닌가?”라고 생각했다. 하지만 이 작업은 결국 두 개의 PR로 이어졌다. 첫 번째 PR에서는 undefined 문제를 막기 위한 placeholder를 추가했고, 두 번째 PR에서는 Next.js App Router에 가까운 `bfcacheId` 동작 자체를 Vinext 방식으로 구현했다.


Vinext는 Next.js API surface를 Vite 위에서 다시 구현하는 프로젝트다. README에서도 “The Next.js API surface, reimplemented on Vite”라고 설명하고, Cloudflare Workers 배포도 기본 흐름으로 제공한다. 동시에 이 프로젝트는 Next.js의 fork가 아니라, Next.js public API를 Vite 기반으로 다시 구현하는 대안 구현체라고 명시하고 있다.


그래서 이번 작업의 핵심은 단순히 “Next.js에 있는 속성 하나를 흉내 내기”가 아니었다. Next.js가 사용자에게 보여주는 observable behavior를 Vinext의 전혀 다른 내부 구조 위에서 맞추는 일이었다.


## **1. 문제 발견:** **`useRouter().bfcacheId`****가 없다**


문제의 출발점은 `useRouter()`였다.


Next.js App Router에서는 `next/navigation`의 `useRouter()`가 라우터 객체를 반환한다. 여기에 새로 `bfcacheId`라는 필드가 추가됐다. 이 값은 현재 route segment에 스코프가 잡힌 opaque string identifier이고, React `key`로 사용하면 fresh navigation에서는 state preservation을 끊고, browser back/forward에서는 이전 상태를 복원하는 데 활용할 수 있다. Vinext의 tracking issue도 이 값을 “현재 route segment에 scoped된 opaque string identifier”로 설명한다.


예를 들면 이런 코드다.


```typescript
"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const { bfcacheId } = useRouter();

  return <form key={bfcacheId}>{/* ... */}</form>;
}
```


Next.js 기준으로는 이 코드가 정상이다. 하지만 Vinext에서는 당시 `useRouter()`가 반환하는 객체에 `bfcacheId`가 없었기 때문에, 이 값을 읽는 코드가 깨질 수 있었다.


이때 관련 이슈를 찾아보니 이미 Vinext repo에 `Add useRouter().bfcacheId for opting out of state preservation`라는 tracking issue가 열려 있었다. 이슈는 2026년 5월 12일 GitHub Actions bot이 열었고, `nextjs-tracking` label이 붙어 있었다. 이슈 본문에는 Next.js upstream 변경, Vinext에 미치는 영향, 그리고 우선적으로 해야 할 follow-up까지 정리되어 있었다.


즉, 내가 마주친 undefined 문제는 단순한 로컬 버그가 아니라 Next.js canary 변화가 Vinext shim에 아직 반영되지 않은 compatibility gap이었다.


## **2. 첫 번째 PR: 일단 깨지지 않게 만들기**


그래서 첫 번째 PR을 만들었다.


PR 제목은 `fix(shims): add placeholder useRouter bfcacheId`였고, 2026년 5월 14일 `cloudflare/vinext`의 `main` 브랜치에 머지됐다. PR #1192는 1개 커밋으로 구성된 작은 변경이었다.


이 PR의 목표는 full behavior 구현이 아니었다. 우선 `useRouter().bfcacheId`를 참조하는 코드가 더 이상 깨지지 않도록 API surface를 맞추는 것이었다.


PR 설명에도 이 의도가 분명히 적혀 있다. Next.js의 새 `useRouter().bfcacheId` 필드와 호환되도록 Vinext가 안정적인 `"0"` placeholder를 반환하고, typed consumer나 `bfcacheId`를 destructuring하는 라이브러리가 깨지지 않게 하는 변경이었다.


변경은 작지만 필요한 위치가 여러 곳이었다.


첫 번째로, 실제 런타임 객체에 값을 추가했다.


```typescript
const _appRouter = {
  bfcacheId: "0",

  push(href: string, options?: { scroll?: boolean }): void {
    // ...
  },

  // ...
};
```


두 번째로, `next/navigation` shim의 public type에도 `bfcacheId: string`을 추가했다.


```typescript
declare module "next/navigation" {
  export function useRouter(): {
    bfcacheId: string;
    push(href: string, options?: { scroll?: boolean }): void;
    replace(href: string, options?: { scroll?: boolean }): void;
    back(): void;
    forward(): void;
    refresh(): void;
  };
}
```


세 번째로, 내부 compatibility type인 `AppRouterInstance`에도 같은 필드를 추가했다.


```typescript
export type AppRouterInstance = {
  bfcacheId: string;
  back(): void;
  forward(): void;
  refresh(): void;
  // ...
};
```


마지막으로 테스트를 추가했다. `useRouter()`를 두 번 호출했을 때 `bfcacheId`가 string이고, 값이 `"0"`이며, 여러 호출 사이에서도 안정적으로 유지되는지 확인했다. PR의 files changed 화면에서도 `app-router-context.ts`, `navigation.ts`, `next-shims.d.ts`, `tests/shims.test.ts` 네 파일이 바뀌었고, 테스트는 `"0"` placeholder의 안정성을 검증한다.


이 PR은 작았지만 역할이 분명했다.


`undefined`를 없앴다.


```typescript
const router = useRouter();

console.log(router.bfcacheId); // "0"
```


이제 사용자 코드나 외부 라이브러리가 `bfcacheId`를 destructuring해도 바로 깨지지는 않는다.


하지만 동시에 이건 진짜 구현은 아니었다. `"0"`은 placeholder일 뿐이었다.


## **3. placeholder로는 부족했던 이유**


첫 번째 PR을 머지하고 나면 당장 에러는 사라진다. 하지만 `bfcacheId`의 의미는 아직 없다.


Next.js에서 `bfcacheId`는 단순히 “항상 같은 문자열”이 아니다. tracking issue에 정리된 upstream semantics를 보면, 이 값은 layout이나 page에서 읽는 위치에 따라 가까운 CacheNode에서 파생되고, back/forward, `router.refresh()`, search-param-only navigation, hash-only navigation에서는 안정적으로 유지된다. 반대로 fresh `push`나 `replace`로 새로운 segment가 만들어질 때는 바뀌어야 한다. 형식도 `_b_<n>_` 형태를 따른다.


즉, placeholder `"0"`은 “없는 필드 때문에 터지는 문제”는 해결하지만, “navigation identity를 나타내는 값”으로는 충분하지 않았다.


예를 들어 사용자가 아래처럼 `bfcacheId`를 React `key`로 사용한다고 해보자.


```typescript
const { bfcacheId } = useRouter();

return <Form key={bfcacheId} />;
```


이때 fresh navigation에서는 새로운 key가 필요하다. 그래야 이전 화면의 local state를 그대로 들고 가지 않는다. 반대로 browser back/forward에서는 이전 entry의 key가 복원되어야 한다. 그래야 사용자가 뒤로 갔을 때 이전 상태가 되살아난다.


항상 `"0"`만 반환하면 이 차이를 표현할 수 없다.


그래서 두 번째 작업은 “필드를 추가하는 것”이 아니라 “값이 언제 바뀌고 언제 유지되어야 하는지”를 구현하는 일이 됐다.


## **4. 두 번째 PR: 실제** **`bfcacheId`** **semantics 구현**


두 번째 PR은 `feat(app-router): support useRouter bfcacheId semantics`라는 제목으로 진행했다. PR #1588은 25개 커밋으로 구성됐고, 2026년 6월 2일 `main`에 머지됐다.


PR 설명의 Summary는 이 작업의 핵심을 잘 보여준다.


이 PR은 App Router shim에 segment-scoped `useRouter().bfcacheId` semantics를 구현하고, back/forward traversal에서 이전 id를 복원할 수 있도록 Vinext-owned bfcache id map을 history state에 저장했다. 또한 browser/SSR route tree에 bfcache context를 제공하고, mounted `AppRouterContext` router 위에 contextual `bfcacheId`를 얹는 방식으로 구현됐다.


여기서 중요한 차이가 있다.


Next.js는 내부에 CacheNode와 segment-cache 모델이 있다. tracking issue에서도 Next.js 쪽 변경 파일로 `CacheNode.bfcacheId`, `navigation.ts`의 가까운 CacheNode 기반 read, `segment-cache/bfcache.ts`의 BFCache entry persistence 등이 언급된다.


하지만 Vinext는 Next.js 내부 구현을 그대로 가져온 프로젝트가 아니다. Vinext는 Vite 위에서 Next.js API surface를 다시 구현한다. README에서도 Vinext는 Next.js fork가 아니며, public API를 Vite 기반으로 다시 구현하는 대안 구현이라고 설명한다.


그래서 Next.js처럼 CacheNode에 `bfcacheId`를 저장하는 방식이 아니라, Vinext의 라우팅 구조에 맞는 별도 identity layer가 필요했다.


내가 잡은 방향은 `BfcacheIdMap`이었다.


개념적으로는 이런 구조다.


```typescript
{
  "layout:/nextjs-compat/use-router-bfcache-id/[group]": "_b_1_",
  "page:/nextjs-compat/use-router-bfcache-id/[group]/[page]": "_b_2_"
}
```


각 layout/page/segment에 대응되는 key를 만들고, 그 key에 bfcache id를 부여한다. 그리고 이 map을 browser history state에 저장한다.


이렇게 한 이유는 browser back/forward 때문이다. 사용자가 뒤로 가거나 앞으로 갈 때는 새 id를 만들면 안 된다. 그 history entry가 원래 갖고 있던 id를 복원해야 한다. Vinext는 Next.js의 CacheNode 구조를 그대로 갖고 있지 않기 때문에, session history entry에 Vinext-owned metadata를 저장하는 방식으로 같은 user-visible behavior를 만들었다.


## **5.** **`useRouter()`****는 singleton이 아니라 context router를 기준으로**


구현하면서 처음 크게 정리된 부분은 `useRouter()`의 기준이었다.


첫 번째 placeholder PR에서는 module-level App Router singleton에 `bfcacheId: "0"`을 붙이면 충분했다. 하지만 실제 semantics를 구현하려면 그 방식은 부족했다.


`useRouter()`는 mounted `AppRouterContext`의 router를 기준으로 해야 했다. 그래야 custom router method나 instrumentation이 보존된다. PR #1588 설명에도 이 점이 compatibility note로 명시되어 있다. `useRouter()`는 기존 module-level singleton이 아니라 mounted context router를 감싼 memoized wrapper를 반환하고, 여기에 가장 가까운 segment의 `bfcacheId`만 얹는다.


이 구조가 중요했던 이유는 `bfcacheId`만 맞추려고 router 객체 전체의 출처를 바꿔버리면, 다른 router method의 동작이 깨질 수 있기 때문이다.


최종 구조는 이렇게 정리됐다.


```typescript
const contextRouter = useContext(AppRouterContext);
const bfcacheId = useNearestSegmentBfcacheId();

return useMemo(
  () => ({
    ...contextRouter,
    bfcacheId,
  }),
  [contextRouter, bfcacheId],
);
```


정확한 코드는 다르지만 의도는 이렇다.


router method의 authority는 `AppRouterContext`에 둔다. `useRouter()`는 그 router를 그대로 존중한다. 그리고 현재 segment의 contextual `bfcacheId`만 추가한다.


## **6. 가장 어려웠던 부분: 언제 id를 유지하고, 언제 새로 만들 것인가**


이 작업에서 가장 어려운 부분은 id 생성 자체가 아니었다.


진짜 어려운 건 조건이었다.


`bfcacheId`는 다음 상황에서 유지되어야 한다.


```plain text
- browser back/forward
- router.refresh()
- search-param-only navigation
- hash-only navigation
- server action이 refresh를 호출하는 경우
```


반대로 다음 상황에서는 바뀌어야 한다.


```plain text
- fresh router.push()
- fresh router.replace()
- 주변 segment가 새로 생성되는 route change
```


PR #1588은 이 동작을 구현하기 위해 history state에 bfcache id map을 저장하고, hash-only navigation에서는 bfcache metadata를 보존하며, refresh/search-param navigation 같은 케이스에서 leaf `bfcacheId`가 안정적으로 유지되는지 검증했다.


이게 단순하지 않았던 이유는 App Router에 edge case가 많기 때문이다.


예를 들어 catch-all route가 있다.


```plain text
/docs/[...slug]
```


이 route는 URL path segment 여러 개를 하나의 route segment가 소비할 수 있다. 단순히 tree depth만 보고 pathname prefix를 자르면 `/docs/a/b`와 `/docs/a/c` 같은 케이스에서 identity를 잘못 계산할 수 있다.


intercepted route와 parallel slot도 있었다. slot 자체는 같아 보여도 그 안에서 active route가 바뀌면 사용자가 보는 page identity는 바뀐 것이다. 예를 들어 modal slot 안에서 `/photo/1`에서 `/photo/2`로 이동하면, 같은 `@modal` slot이라도 안의 활성 route가 달라졌기 때문에 fresh identity가 필요하다.


그래서 PR에는 active slot route identity, intercepted/parallel slot, catch-all-aware pathname consumption 같은 처리가 들어갔다. PR 설명의 feedback addressed 섹션도 active slot route identity, intercepted/parallel slot bfcache ids, programmatic `router.push()`/`router.replace()` coverage 등을 별도로 언급한다.


## **7. hard reload 문제: history state를 그대로 믿을 수 없다**


또 하나 까다로웠던 부분은 hard reload였다.


Vinext는 bfcache id map을 `window.history.state`에 저장한다. 그러면 browser back/forward에서는 이전 entry의 id를 복원할 수 있다.


하지만 hard reload가 일어나면 상황이 달라진다. 문서가 새로 시작되면서 JavaScript runtime lifetime도 새로 시작된다. 그런데 이전 document lifetime에서 저장된 history state를 그대로 믿으면, 새 document의 id counter와 충돌할 수 있다.


예를 들어 이런 흐름을 생각할 수 있다.


```plain text
1. /x/1 진입
2. /x/2로 push
3. /x/2에서 hard reload
4. 다시 back/forward
```


이때 이전 document에서 저장한 id와 새 document에서 다시 시작한 id가 충돌하면, 서로 다른 navigation entry가 같은 identity를 갖는 문제가 생길 수 있다.


그래서 PR에서는 version-gated history restoration을 도입했다. 현재 document의 bfcache version과 history state에 저장된 version이 맞을 때만 id를 복원한다. PR 설명에서도 hard reload 이후에는 zero sentinel reset을 의도적으로 문서화하고, cross-document id collision을 피하기 위해 version-gated restoration을 사용한다고 적혀 있다.


또한 public shape도 정리했다.


내부 map에서는 hydration sentinel로 raw `"0"`을 사용한다. 하지만 public hook에서는 이를 `"_b_0_"` 형태로 포맷한다. freshly minted id는 `"_b_N_"` 형태를 따른다. PR #1588의 feedback addressed 섹션도 public zero sentinel을 `"_b_0_"`으로 포맷하고, 내부 zero sentinel constant를 공유하도록 정리했다고 설명한다.


즉 내부 표현과 public 표현을 분리했다.


```plain text
internal sentinel: "0"
public bfcacheId: "_b_0_"
fresh ids: "_b_1_", "_b_2_", ...
```


이 작은 차이를 명확히 하지 않으면 테스트도 헷갈리고, 나중에 유지보수하는 사람도 왜 `"0"`과 `"_b_0_"`이 같이 존재하는지 이해하기 어렵다.


## **8. redirect lifecycle까지 건드리게 된 이유**


작업 중 예상보다 커진 부분은 redirect였다.


처음에는 `bfcacheId`만 구현하면 될 것 같았다. 그런데 browser traversal 중 redirect가 발생하면 stale id를 잘못 적용할 수 있었다.


예를 들어 사용자가 back을 눌렀다. Vinext는 target history entry에서 `restoredBfcacheIds`를 읽어온다. 그런데 그 target이 서버 redirect를 통해 다른 URL로 이동한다면, 원래 entry의 id를 redirect target에 그대로 적용하면 안 된다. target href가 달라졌기 때문이다.


그래서 redirect hop이 target href를 바꾸는 경우 `restoredBfcacheIds`를 clear하도록 했다.


PR 설명에서도 redirect lifecycle fixes가 별도 섹션으로 정리되어 있다. cached visited-response redirect를 terminal payload처럼 취급하지 않고 실제 redirect hop을 따라가게 했고, flight redirect에서는 `currentHistoryMode`와 `currentPrevNextUrl` bookkeeping을 다시 맞추도록 했다. 또한 traversal navigation에서 redirect target이 바뀌면 `restoredBfcacheIds`를 clear해 stale history-state id가 redirect payload에 적용되지 않게 했다.


이 부분은 `bfcacheId` 구현에서 출발했지만, 사실 모든 App Router navigation 사용자에게 영향을 줄 수 있는 browser navigation behavior fix였다.


리뷰에서도 이 지점이 중요하게 다뤄졌다. review comment는 cached redirect following과 flight redirect history bookkeeping이 실제로는 non-bfcache navigation behavior change이므로 PR description에 별도 observable bug로 명시하거나 분리하라고 지적했다. 이후 PR 설명에 redirect lifecycle fixes 섹션이 추가됐다.


이 경험이 흥미로웠다. 하나의 API field를 구현하다 보니, 결국 라우터의 redirect lifecycle까지 검증하게 됐다.


## **9. Next.js와 달라서 힘들었던 점**


이번 작업에서 가장 크게 느낀 건, Next.js와 Vinext의 내부 구조 차이다.


Next.js는 자기 내부의 CacheNode, LayoutRouterContext, segment-cache, BFCache entry에 직접 접근할 수 있다. tracking issue에 정리된 upstream 변경도 `CacheNode.bfcacheId`, closest CacheNode 기반 `useRouter()` read, segment-cache BFCache entry persistence 같은 구조를 기반으로 한다.


하지만 Vinext는 그 내부 구조를 그대로 갖고 있지 않다. Vinext는 Next.js의 public API를 Vite 위에서 다시 구현하는 프로젝트이고, README에서도 “bug-for-bug parity”가 아니라 pragmatic compatibility를 목표로 한다고 설명한다.


그래서 구현 방식은 달라야 했다.


Next.js에서는 “이미 있는 CacheNode에 id를 붙인다”에 가깝다면, Vinext에서는 “현재 route tree와 history state를 이용해 user-visible identity layer를 새로 만든다”에 가까웠다.


이 차이 때문에 어려웠던 지점은 크게 네 가지였다.


첫째, 같은 API를 다른 자료구조로 구현해야 했다. Next.js의 CacheNode를 그대로 쓸 수 없으니 `BfcacheIdMap`, segment key, history state persistence, route tree context를 조합해야 했다.


둘째, navigation 종류를 구분해야 했다. push/replace, refresh, back/forward, hash-only, search-param-only navigation은 모두 비슷해 보이지만 `bfcacheId` 관점에서는 서로 다른 의미를 가진다.


셋째, route identity 계산이 단순한 URL 비교가 아니었다. catch-all, optional catch-all, route groups, invisible segments, parallel routes, intercepted routes까지 고려해야 했다.


넷째, Next.js의 일부 테스트를 그대로 가져올 수 없었다. PR #1588 설명에도 Next.js Activity-backed form-state-on-back assertion은 Vinext가 React Activity를 구현하기 전까지 의도적으로 제외했다고 적혀 있다. 대신 같은 segment의 input state가 search-param navigation에서 유지되고, leaf `bfcacheId`가 stable한지는 검증했다.


결국 이 작업은 “Next.js 코드를 보고 그대로 옮긴다”가 아니었다.


Next.js가 보장하는 사용자 관찰 가능 동작을 이해하고, Vinext의 구조에서 그 동작을 다시 설계하는 일이었다.


## **10. 리뷰를 거치면서 바뀐 것들**


PR #1588은 한 번에 끝나지 않았다.


처음에는 기본적인 segment-scoped id 생성과 history state 복원을 구현했다. 이후 리뷰를 거치면서 구조가 계속 다듬어졌다.


가장 중요한 피드백은 `useRouter()`의 authority였다. module-level singleton이 아니라 mounted `AppRouterContext` router를 기준으로 하고, contextual `bfcacheId`만 얹는 구조가 됐다.


또 sentinel 표현도 정리했다. 내부 `"0"`과 public `"_b_0_"`이 섞여 보이지 않도록 shared constant와 formatter를 두었다.


hard reload 이후 stale history state를 거부하는 version gate도 보강됐다. maintainer가 마지막에 추가한 커밋 중 하나는 version 없는 stale bfcache state를 거부하는 regression test를 고정했다. 해당 커밋 설명은 version key가 없는 history entry를 current로 취급하지 않도록 해, 이전 구현의 `?? 0` coercion이 만들 수 있던 cross-document stale-id hole을 막는다고 설명한다.


maintainer인 James가 얹은 후속 커밋들도 의미가 있었다.


invisible tree-path segment를 bfcache identity 계산에서 제외했고, `isInvisibleSegment` helper를 browser-safe routing utils로 옮겼다. catch-all segment predicate도 module-private으로 정리했다. PR files changed 화면의 커밋 목록에서도 이 maintainer 커밋들이 Jun 2에 추가된 것을 확인할 수 있다.


이 과정은 오픈소스 PR에서 리뷰가 왜 중요한지 보여줬다.


내 구현이 기능의 뼈대를 만들었다면, 리뷰와 maintainer 커밋은 그 뼈대가 프로젝트 구조 안에서 오래 유지될 수 있도록 경계를 정리했다.


## **11. 결과적으로 생긴 것**


최종적으로 Vinext App Router는 `useRouter().bfcacheId`에 대해 Next.js에 가까운 observable semantics를 갖게 됐다.


이제 Vinext에서는 다음 동작을 기대할 수 있다.


```plain text
fresh push/replace
→ 새로운 bfcacheId 생성

browser back/forward
→ 해당 history entry의 이전 bfcacheId 복원

router.refresh()
→ bfcacheId 유지

search-param-only navigation
→ bfcacheId 유지

hash-only navigation
→ bfcacheId 유지

hard reload 이후 stale history state
→ version gate로 거부

redirected traversal
→ stale restored id clear
```


PR #1588의 tests 섹션에는 type/check, unit test, browser entry test, Playwright E2E test가 포함되어 있고, E2E fixture는 `use-router-bfcache-id.spec.ts`로 별도 작성됐다.


또한 final review에서는 이 PR이 여러 review round를 거쳤고, context-owned `useRouter()`, shared sentinel constants, catch-all-aware segment counting, version-gate 보강 등이 반영됐다고 정리했다. 같은 comment는 `app-browser-entry.test.ts -t bfcache`와 `shims.test.ts -t useRouter`가 green이었다고도 언급한다.


## **12. 마무리: 작은 undefined에서 navigation identity layer까지**


이번 기여는 작은 undefined에서 시작했다.


처음에는 `useRouter().bfcacheId`가 없어서 깨지는 문제였다. 그래서 첫 PR에서는 `bfcacheId: "0"` placeholder를 추가했다. runtime 객체, public shim type, internal compatibility type, 테스트까지 맞춰서 Next.js의 새 API surface를 Vinext에서도 읽을 수 있게 했다.


하지만 거기서 끝내면 실제 semantics는 없다.


그래서 두 번째 PR에서는 segment-scoped id, history state persistence, browser traversal restore, hard reload version gate, redirect lifecycle coherence, catch-all/intercepted/parallel route identity까지 다루게 됐다.


이번 작업을 하면서 가장 크게 배운 것은 compatibility layer의 무게였다.


겉으로 보이는 API는 작다.


```typescript
const { bfcacheId } = useRouter();
```


하지만 이 한 줄 뒤에는 route segment identity, browser history entry, server action refresh, redirect lifecycle, route tree rendering context가 모두 연결되어 있었다.


Vinext는 Next.js와 같은 내부 구조를 갖고 있지 않다. 그렇기 때문에 더 흥미로웠다. 같은 구현을 복사하는 것이 아니라, 같은 사용자 경험을 다른 구조 위에서 만들어야 했다.


결국 이 두 PR은 단순히 `bfcacheId`라는 필드 하나를 추가한 작업이 아니었다.


첫 번째 PR은 Vinext가 최신 Next.js API surface를 따라가도록 만든 compatibility fix였다.


두 번째 PR은 Vinext App Router에 navigation identity layer를 추가한 작업이었다.


그리고 나에게는 오픈소스에서 “작은 버그를 고치는 일”이 어떻게 프레임워크 내부 동작을 깊게 이해하는 기회로 이어질 수 있는지 보여준 경험이었다.

