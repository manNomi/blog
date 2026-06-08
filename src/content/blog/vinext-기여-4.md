---
title: "vinext 기여 4"
pubDate: 2026-05-30T00:00:00.000Z
notionId: "3747cf19-a364-8064-a04c-e2242add52bd"
---
# vinext에서 `useRouter().bfcacheId`를 구현하며 배운 것


최근 Cloudflare의 [vinext](https://github.com/cloudflare/vinext)에서 App Router의 `useRouter().bfcacheId` 동작을 구현하는 PR을 작업했다.


vinext는 Next.js의 API surface를 Vite 기반으로 다시 구현하고, Cloudflare Workers에 배포할 수 있게 만드는 프로젝트다. 즉, 단순히 “비슷하게 동작하는 라우터”를 만드는 것이 아니라, Next.js 앱이 기대하는 미묘한 런타임 동작까지 최대한 맞춰야 한다.


이번 작업도 처음에는 `useRouter()`에 `bfcacheId` 하나를 추가하는 일처럼 보였다. 하지만 실제로는 App Router의 navigation identity, browser history state, redirect lifecycle, intercepted route, catch-all route, hard reload semantics까지 연결된 작업이었다.


## 왜 이 작업을 했나


Next.js App Router에는 `useRouter().bfcacheId`라는 값이 있다.


이 값은 사용자에게 직접 의미 있는 데이터라기보다는, 현재 라우터 cache entry의 identity를 나타내는 opaque id에 가깝다. 사용자는 이 값을 key로 사용해 navigation 간 state preservation이나 reset 경계를 제어할 수 있다.


예를 들어 fresh navigation에서는 새로운 id가 생겨야 하고, browser back/forward에서는 이전 entry의 id가 복원되어야 한다. 반대로 `router.refresh()`, search param만 바뀌는 navigation, hash-only navigation 같은 경우에는 불필요하게 id가 바뀌면 안 된다.


vinext가 Next.js compatibility를 목표로 한다면, 이런 작지만 중요한 observable behavior도 맞춰야 한다. 그래서 이번 PR의 핵심 목표는 vinext App Router에서도 Next.js와 유사한 `useRouter().bfcacheId` semantics를 제공하는 것이었다.


## 내가 구현한 핵심 구조


Next.js는 내부적으로 App Router cache tree의 `CacheNode`에 `bfcacheId`를 저장한다. 하지만 vinext는 Next.js의 내부 구현을 그대로 갖고 있지 않다. Vite와 React Server Components 기반으로 App Router를 재구성하고 있기 때문에, 같은 user-visible behavior를 다른 구조로 만들어야 했다.


그래서 vinext에서는 `BfcacheIdMap`이라는 별도 map을 만들었다.


개념적으로는 이런 형태다.


```typescript
{
  "layout:/nextjs-compat/use-router-bfcache-id/[group]": "_b_1_",
  "page:/nextjs-compat/use-router-bfcache-id/[group]/[page]": "_b_2_"
}
```


각 segment/layout/page에 대응되는 key를 만들고, 해당 key에 bfcache id를 부여한다. 그리고 이 map을 browser history state에 저장했다.


이렇게 한 이유는 back/forward navigation 때문이다. 사용자가 뒤로 가거나 앞으로 갈 때는 새 id를 만드는 것이 아니라, 해당 history entry가 가지고 있던 id를 복원해야 한다. vinext는 이 정보를 in-memory CacheNode에서 읽을 수 없기 때문에, `window.history.state`에 vinext-owned bfcache metadata를 저장하는 방식을 택했다.


이후 browser route tree와 SSR route tree에 bfcache context를 연결했다.

- `BfcacheIdMapContext`는 현재 route tree 전체의 id map을 제공한다.
- `BfcacheSegmentIdContext`는 현재 React subtree가 어떤 segment에 속하는지 알려준다.
- `useRouter()`는 mounted `AppRouterContext` router를 읽고, 거기에 가장 가까운 segment의 `bfcacheId`를 얹어 반환한다.

처음에는 단순히 module-level router singleton에 `bfcacheId`를 붙이면 된다고 생각할 수 있다. 하지만 리뷰 과정에서 이 방식은 문제가 있다는 점이 드러났다. `useRouter()`는 실제로 mounted `AppRouterContext`의 router를 authority로 삼아야 한다. 그래야 custom router method나 instrumentation이 보존된다.


그래서 최종 구조는 “context router를 그대로 사용하되, 현재 segment의 `bfcacheId`만 추가하는 방식”으로 정리됐다.


## 구현하면서 까다로웠던 부분


가장 까다로운 부분은 “언제 id를 유지하고, 언제 새로 만들어야 하는가”였다.


fresh `router.push()`나 `router.replace()`는 새 page entry를 만드는 navigation이므로 새 id가 필요하다. browser back/forward는 과거 entry로 돌아가는 것이므로 history state에 저장된 id를 복원해야 한다. `router.refresh()`는 같은 entry를 다시 fetch하는 것이므로 id가 유지되어야 한다. search param만 바뀌는 navigation도 같은 page segment로 취급되어야 한다.


여기까지는 비교적 명확하다. 하지만 App Router에는 edge case가 많다.


catch-all route에서는 하나의 route segment가 URL path 여러 조각을 소비할 수 있다. 단순히 tree depth만 보고 pathname prefix를 자르면 `/docs/a/b`와 `/docs/a/c` 같은 navigation에서 잘못 같은 identity로 판단할 수 있다.


intercepted route와 parallel slot도 문제가 됐다. slot 자체의 owner는 같아도, 그 안에서 활성화된 route가 바뀌면 fresh identity가 필요하다. 예를 들어 `/photo/1`이 `@modal`에 intercepted된 상태에서 `/photo/2`로 이동하면, 같은 modal slot이라도 안의 active page는 달라진 것이다.


그래서 segment identity 계산을 별도 helper로 모으고, catch-all-aware pathname consumption과 active slot route identity를 반영했다.


## hard reload와 history state 충돌


또 하나의 중요한 문제는 hard reload였다.


vinext는 bfcache id를 history state에 저장한다. 그런데 hard reload가 일어나면 JavaScript document lifetime이 새로 시작된다. 이때 이전 document에서 저장한 id를 그대로 믿으면, 새 document의 id counter와 충돌할 수 있다.


리뷰 중에 이 문제가 꽤 중요하게 다뤄졌다. 예를 들어 `/x/1`에서 시작해 `/x/2`로 이동한 뒤 `/x/2`에서 hard reload를 하면, 이전 history entry의 id와 새 document의 초기 id가 충돌할 수 있다.


최종적으로는 version-gating 방식을 도입했다.


browser document가 시작될 때 현재 bfcache version을 계산하고, history state에 저장된 version과 현재 version이 맞을 때만 id를 복원한다. hard reload 이후에는 새 document lifetime으로 간주해 이전 document의 stale id를 무조건 신뢰하지 않는다.


또한 hard reload 시 public id는 Next.js parity에 맞춰 `_b_0_`로 reset되도록 했다. 내부적으로는 `"0"` sentinel을 사용하고, public hook에서는 `"_b_0_"` 형식으로 포맷한다.


이 부분도 처음에는 혼란스러울 수 있었다. map 안에는 내부 sentinel `"0"`과 minted id `"_b_N_"`이 함께 존재하기 때문이다. 그래서 shared constant와 formatting helper를 두고, 이 dual representation을 명시적으로 문서화했다.


## redirect와 bfcache id의 관계


작업 중 예상보다 중요해진 부분이 redirect lifecycle이었다.


vinext의 bfcache 복원 규칙은 대략 다음 우선순위를 가진다.


```plain text
restored > currentValue > mint
```


즉 browser traversal에서는 history state에서 복원한 id가 가장 우선한다. 이건 back/forward semantics에는 맞다. 사용자가 과거 entry로 돌아가는 것이므로, 그 entry의 id가 authoritative해야 한다.


하지만 traversal 중 redirect가 발생하면 이야기가 달라진다.


예를 들어 사용자가 back을 했는데, 그 target이 서버 redirect를 통해 다른 URL로 이동한다면, 원래 history entry의 restored id를 redirected target에 그대로 적용하면 안 된다. target href가 바뀌었기 때문이다.


그래서 redirect가 current href를 바꾸는 모든 경로에서 `restoredBfcacheIds`를 clear하도록 했다. 이렇게 해야 redirected payload는 stale history-state id를 물려받지 않고 fresh identity를 계산할 수 있다.


이 과정에서 bfcacheId와 직접 관련이 없는 redirect lifecycle 문제도 같이 드러났다.

- cached visited-response redirect가 terminal payload처럼 취급될 수 있었다.
- flight redirect에서 `currentHistoryMode`와 `currentPrevNextUrl` bookkeeping이 stale해질 수 있었다.

이 변경은 bfcache coherence를 위해 필요했지만, 사실 모든 App Router 사용자에게 영향을 주는 navigation behavior change다. 그래서 PR description에도 이 부분을 별도 redirect lifecycle fix로 분리해 명시했다.


## 메인테이너가 얹은 보강 작업


내가 초기 구현과 리뷰 피드백 반영을 진행한 뒤, maintainer인 James가 여러 커밋을 추가로 얹었다.


이 작업들은 기능의 방향을 바꾼다기보다, edge case correctness와 유지보수성을 더 단단하게 만드는 성격이었다.


첫 번째로, invisible tree-path segment를 bfcache identity 계산에서 제외했다. App Router route tree에는 URL에 직접 드러나지 않는 segment가 있을 수 있다. 이런 segment가 identity 계산에 섞이면 user-visible path 기준의 bfcache identity가 흔들릴 수 있다. maintainer 커밋에서는 이 부분을 보정했다.


두 번째로, `isInvisibleSegment` 관련 로직을 browser-safe utility로 옮겼다. bfcache identity 계산은 browser runtime에서도 쓰이기 때문에, server-only 의존성이 섞이지 않도록 경계를 정리한 것이다.


세 번째로, catch-all segment predicate를 routing module 내부 구현으로 숨겼다. 외부 API surface를 불필요하게 넓히지 않고, route parsing 관련 세부 구현을 module-private으로 유지하기 위한 정리였다.


마지막으로, version-gate가 version 없는 stale bfcache state를 거부하는 케이스를 테스트로 고정했다. 이건 특히 중요했다. history state 기반 구현에서는 오래된 session history나 이전 document에서 남은 metadata를 어떻게 다룰지가 핵심 안정성 포인트이기 때문이다.


즉 maintainer 작업은 “내 구현이 동작한다”에서 한 단계 더 나아가, “프로젝트 구조 안에서 안전하게 오래 유지될 수 있다”에 가까워지도록 다듬은 작업이었다.


## 리뷰를 통해 해결된 문제들


이번 PR은 여러 차례 리뷰를 거치면서 점점 형태가 좋아졌다.


초기에는 `useRouter()`가 module-level singleton에 가까운 값을 반환했지만, 리뷰를 통해 실제 `AppRouterContext`를 authority로 삼는 구조로 바뀌었다.


초기 bfcache id format도 public shape와 internal sentinel이 뒤섞여 있었는데, shared constants와 formatter로 의도를 명확히 했다.


hard reload 이후 persisted id를 어떻게 다룰지에 대해서도 논의가 있었다. 처음에는 history state에 있는 id를 복원하는 것이 자연스러워 보였지만, Next.js parity와 cross-document collision을 고려해 hydration sentinel reset과 version-gated restoration이 더 적절한 방식으로 정리됐다.


intercepted slot identity도 리뷰 덕분에 보강됐다. slot owner만 보면 같은 slot으로 보이지만, active route가 달라지면 실제 사용자가 보는 page identity도 달라진다. 이 차이를 반영하지 않으면 modal이나 parallel route에서 state가 잘못 보존될 수 있다.


또한 Next.js의 Activity 기반 form-state preservation test를 그대로 port하지 않은 이유도 명확히 문서화했다. vinext는 아직 React Activity를 구현하지 않았기 때문에, push 후 back에서 DOM state preservation까지 보장하지 않는다. 대신 현재 PR에서는 bfcache id identity semantics를 검증하고, search-param navigation처럼 Activity 없이도 DOM state가 유지되는 경우만 테스트했다.


## 결과적으로 생긴 것


이번 작업을 통해 vinext App Router는 Next.js의 `useRouter().bfcacheId`에 가까운 observable semantics를 갖게 됐다.


이제 fresh push/replace에서는 새 bfcache id가 만들어진다. browser back/forward에서는 이전 history entry의 id가 복원된다. refresh, search-param-only, hash-only navigation에서는 불필요하게 id가 바뀌지 않는다. hard reload 이후에도 stale history-state id가 새 document에 잘못 적용되지 않도록 version gate가 동작한다.


또한 intercepted routes, catch-all routes, parallel slots, server actions, redirect traversal 같은 App Router edge case에 대한 테스트가 추가됐다.


개인적으로 이번 작업에서 가장 흥미로웠던 점은, Next.js와 동일한 내부 구조를 갖지 않아도 동일한 observable behavior를 만들 수 있다는 점이었다. Next.js는 CacheNode 기반으로 bfcache id를 저장하지만, vinext는 history state 기반 map으로 이를 재구성했다. 구현 방식은 다르지만, 사용자 입장에서 보이는 navigation identity semantics는 맞춰야 했다.


이런 작업은 단순히 기능 하나를 추가하는 일이 아니라, 프레임워크의 “작은 동작”이 얼마나 많은 런타임 경계와 연결되어 있는지 확인하는 과정이었다. 그리고 오픈소스 PR에서 maintainer가 마지막에 얹은 커밋들은 그 경계를 프로젝트답게 다듬는 과정이었다.


내가 만든 것은 기능의 뼈대와 대부분의 compatibility behavior였고, maintainer가 더한 것은 그 뼈대가 vinext의 라우팅 구조 안에서 더 정확하고 안전하게 작동하도록 하는 보강이었다.


그런 점에서 이번 PR은 단순히 `useRouter().bfcacheId`를 추가한 작업이라기보다, vinext App Router의 navigation identity layer를 한 단계 정교하게 만든 작업에 가까웠다.
