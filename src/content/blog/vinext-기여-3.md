---
title: "vinext 기여 3"
pubDate: 2026-05-30T00:00:00.000Z
tags: ["오픈소스"]
notes: true
notionId: "36e7cf19-a364-8076-96fa-c6a893c9d618"
---
---


[https://github.com/cloudflare/vinext/pull/1626](https://github.com/cloudflare/vinext/pull/1626)


# **Vinext App Router stale search params 회귀 테스트 추가**


## **한 줄 요약**


Next.js upstream에서 발생했던 `router.replace()` 후 이전 search params가 되살아나는 segment cache 버그를 Vinext에서도 검증하기 위해, 동일한 재현 시나리오를 App Router E2E fixture와 Playwright 테스트로 추가했다. Vinext 런타임 코드는 수정하지 않았고, 현재 구현에서는 해당 문제가 재현되지 않음을 테스트로 고정했다.


## **PR 정보**


PR은 `test(app-router): cover stale search params on clean replace (#1621)`라는 제목으로 2026년 5월 28일 `cloudflare/vinext`의 `main` 브랜치에 머지되었다. 변경 범위는 테스트/fixture 파일 5개, 총 `+105 / -0`의 test-only 변경이다.


```plain text
PR: cloudflare/vinext#1626
상태: merged
PR head commit: 18c2184 test(app-router): cover clean replace after search load
main merge commit: 07be579
관련 이슈: cloudflare/vinext#1621
```


## **배경**


Next.js App Router의 segment cache에서 search params가 잘못 복원되는 버그가 있었다.


문제의 핵심은 cache write key를 만들 때 **요청 URL의 search string**이 아니라, 서버가 실제 렌더링에 사용한 `renderedSearch`를 기준으로 삼았다는 점이다.


예를 들어 static page처럼 search params에 의존하지 않는 route에서는 `/?query=param`으로 요청해도 렌더링 관점의 search는 빈 문자열이 될 수 있다. 이때 cache entry가 clean URL과 같은 슬롯에 저장되면, 나중에 `router.replace("/")`로 search 없는 URL로 이동했는데도 이전 `?query=param`이 다시 살아날 수 있다.


재현 흐름은 다음과 같다.


```plain text
1. /?query=param 으로 직접 진입
2. <Link href="/dummy-page-1"> 클릭
3. <Link href="/dummy-page-2"> 클릭
4. dummy-page-2에서 router.replace("/") 호출

Expected: /
Buggy:    /?query=param
```


Next.js에서는 이 문제를 [vercel/next.js@a7877d7](https://github.com/vercel/next.js/commit/a7877d776b8a8cb0a5556d84ec75df99b5bdea70)에서 수정했다.


## **Vinext에서 왜 확인이 필요했나?**


Vinext는 Next.js App Router API와 client navigation runtime 일부를 자체적으로 구현한다. 따라서 Next.js upstream에서 App Router cache 관련 버그가 수정되면, Vinext에도 같은 문제가 있는지 확인해야 한다.


관련 이슈 [#1621](https://github.com/cloudflare/vinext/issues/1621)에서도 Vinext의 route cache write path가 `renderedSearch`와 비슷한 값을 기준으로 keying하고 있는지 확인하고, 필요하다면 upstream regression test를 포팅하라고 정리되어 있었다.


조사 결과 Vinext의 현재 App Router visited/prefetch cache 경로는 요청 RSC URL을 기준으로 keying하고 있었다. 이 RSC URL은 `url.pathname + url.search`를 기반으로 만들어지기 때문에, 요청 URL에 포함된 search string이 cache key에 반영된다.


즉, Next.js upstream에서 문제가 됐던 `renderedSearch` 기반 cache write 버그는 Vinext에서는 재현되지 않았다.


## **이번 PR에서 한 일**


이번 PR은 runtime fix가 아니라 **regression coverage 추가**다.


첫 번째로, upstream 재현 흐름을 Vinext fixture에 추가했다.


```plain text
tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/
```


이 fixture는 세 개의 화면으로 구성된다.


```plain text
page.tsx
→ 최초 진입 페이지. 현재 useSearchParams() 값을 화면에 출력하고 dummy-page-1로 이동하는 Link 제공

dummy-page-1/page.tsx
→ dummy-page-2로 이동하는 Link 제공

dummy-page-2/page.tsx
→ useRouter().replace(...)로 search 없는 원래 route로 돌아가는 버튼 제공
```


두 번째로, `useSearchParams()` 값까지 검증하기 위해 client component를 추가했다.


```typescript
"use client";

import { useSearchParams } from "next/navigation";

export function SearchInfo() {
  const searchParams = useSearchParams();

  return <p id="search-params">{searchParams.toString()}</p>;
}
```


세 번째로, Playwright E2E 테스트를 추가했다.


```typescript
await page.goto(`${BASE}${ROUTE}?query=param`);
await waitForAppRouterHydration(page);
await expect(page.locator("#search-params")).toHaveText("query=param");

await page.click("#link-to-dummy-1");
await page.click("#link-to-dummy-2");
await page.click("#go-home");

await expect(page.locator("#search-params")).toHaveText("");

await expect
  .poll(() => {
    const url = new URL(page.url());
    return { pathname: url.pathname, search: url.search };
  })
  .toEqual({ pathname: ROUTE, search: "" });
```


이 테스트는 두 가지를 동시에 확인한다.


```plain text
브라우저 URL
→ search string이 비어 있어야 함

useSearchParams()
→ 이전 query=param이 남아 있으면 안 됨
```


## **왜 런타임 코드는 수정하지 않았나?**


이 PR에서 중요한 점은 **문제가 재현되지 않았다는 것**이다.


Vinext의 App Router navigation cache는 현재 request URL의 search를 포함한 RSC URL을 cache key로 사용한다. 그래서 `?query=param`이 붙은 요청과 search 없는 clean URL 요청이 같은 cache entry로 충돌하지 않는다.


따라서 runtime code를 고치는 대신, 이 동작을 테스트로 고정했다.


정리하면 다음 흐름이다.


```plain text
Next.js upstream에서 stale search params 버그 발생
→ Vinext에도 같은 cache key 문제가 있는지 확인
→ Vinext는 request search 기반 keying이라 재현되지 않음
→ 동일 재현 시나리오를 E2E 테스트로 추가
→ 향후 cache/navigation refactor에서 회귀하지 않도록 보호
```


## **하지 않은 것**


이번 PR은 Next.js segment cache 전체 동작을 Vinext에 구현하지 않았다.


또한 `renderedSearch`와 request search를 threading하는 runtime patch도 하지 않았다. Vinext의 현재 cache 구조에서는 해당 문제가 나타나지 않았기 때문이다.


즉, 이번 변경의 목적은 다음이 아니다.


```plain text
- Next.js segment-cache full parity 구현
- App Router cache key 구조 변경
- visited/prefetch cache runtime 수정
```


이번 PR의 목적은 명확히 다음이다.


```plain text
- upstream regression scenario를 Vinext에 포팅
- Vinext에서 stale search params가 복원되지 않음을 검증
- 향후 navigation cache 변경에 대한 안전망 추가
```


## **변경 파일**


이번 PR에서 추가된 파일은 5개다.


```plain text
tests/e2e/app-router/nextjs-compat/stale-search-params-on-replace-regression.spec.ts

tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/page.tsx
tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/search-info.tsx
tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/dummy-page-1/page.tsx
tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/dummy-page-2/page.tsx
```


파일별 역할은 다음과 같다.


```plain text
stale-search-params-on-replace-regression.spec.ts
→ upstream 재현 흐름을 Playwright E2E로 검증

page.tsx
→ 최초 진입 페이지. 현재 search params 출력 + dummy-page-1 Link 제공

search-info.tsx
→ useSearchParams() 값을 화면에 노출하는 client component

dummy-page-1/page.tsx
→ dummy-page-2로 이동하는 Link 제공

dummy-page-2/page.tsx
→ router.replace(clean URL)를 호출하는 client page
```


## **검증**


PR에서 확인한 검증 커맨드는 다음과 같다.


```bash
vp check tests/e2e/app-router/nextjs-compat/stale-search-params-on-replace-regression.spec.ts \\
  tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/search-info.tsx \\
  tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/page.tsx \\
  tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/dummy-page-1/page.tsx \\
  tests/fixtures/app-basic/app/nextjs-compat/stale-search-params-on-replace-regression/dummy-page-2/page.tsx
```


```bash
PLAYWRIGHT_PROJECT=app-router playwright test \\
  tests/e2e/app-router/nextjs-compat/stale-search-params-on-replace-regression.spec.ts \\
  --project app-router \\
  --reporter=list
```


두 검증 모두 통과했다.


## **정리**


이번 변경은 기능 수정이라기보다는 compatibility regression guard에 가깝다.


Next.js upstream에서는 App Router segment cache가 request search가 아닌 `renderedSearch`로 cache write를 keying하면서, `router.replace()` 이후 이전 search params가 되살아나는 버그가 있었다. Vinext도 App Router navigation cache를 자체 구현하고 있기 때문에 같은 문제가 있는지 확인할 필요가 있었다.


확인 결과 Vinext는 현재 request URL의 search를 포함한 RSC URL 기준으로 cache를 keying하고 있어 같은 문제가 재현되지 않았다. 그래서 런타임 코드는 수정하지 않고, upstream 재현 시나리오를 E2E 테스트로 추가해 현재 동작을 고정했다.


결과적으로 아래 동작이 Vinext에서 보장된다.


```plain text
/?query=param 에서 시작
→ 여러 App Router navigation 수행
→ router.replace(clean URL)
→ 최종 URL과 useSearchParams() 모두 search params 없이 깨끗해야 함
```


작은 test-only PR이지만, App Router cache/navigation 쪽은 회귀가 눈에 잘 띄지 않는 영역이라 이런 테스트가 꽤 중요하다. 앞으로 Vinext의 navigation cache 구조가 바뀌더라도, 이전 search params가 clean replace 이후 되살아나는 문제는 이 테스트가 잡아줄 수 있다.

