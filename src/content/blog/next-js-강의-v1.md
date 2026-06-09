---
title: "Next.js  강의 v1"
description: "Next"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "37a7cf19-a364-80a2-83e3-ea6841d8cd52"
---
대상: 3년차 이상 프론트엔드 개발자


목표: 이미 알고 있는 Next.js 기능을 “왜 이렇게 설계됐는가”, “내부에서 어떤 경로로 동작하는가”, “실무에서 어디서 깨지는가” 중심으로 재구성한다.


버전 기준: Next.js 16 / React 19 계열을 기준으로 하되, Next.js 15에서 도입된 async Request APIs(`params`, `searchParams`, `cookies`, `headers`, `draftMode`)와 기존 캐싱 모델도 함께 다룬다.


---


## 강의 전체 컨셉


이 강의는 API 사용법 나열이 아니라 “라우터와 렌더러의 사고방식”을 훈련하는 과정이다.


수강생이 최종적으로 설명할 수 있어야 하는 질문은 다음과 같다.

1. 왜 Next.js는 React 라이브러리 위에 프레임워크 계층을 얹는가?
2. App Router에서 URL은 어떻게 segment tree, layout tree, page, loading/error/not-found boundary로 변환되는가?
3. 최초 접근과 이후 soft navigation에서 HTML, RSC Payload, JS bundle, hydration은 각각 어떤 역할을 하는가?
4. Server Component와 Client Component의 경계는 번들 그래프, 데이터 흐름, 직렬화 가능성에 어떤 영향을 주는가?
5. static/dynamic은 “페이지 단위”가 아니라 왜 “컴포넌트/데이터 단위 스펙트럼”으로 이해해야 하는가?
6. 캐싱은 `fetch` 옵션 하나의 문제가 아니라 prerender, RSC Payload, HTML, client router cache, revalidation의 일관성 문제라는 것을 어떻게 디버깅할 것인가?

---


# Section 1. Next.js의 철학과 렌더링 패러다임


## 01강. Library vs Framework: 제어의 역전과 Next.js의 탄생 배경


### 핵심 메시지


React는 UI를 선언적으로 표현하는 라이브러리다. 반면 Next.js는 라우팅, 빌드, 렌더링, 데이터 로딩, 배포 산출물, 성능 최적화의 흐름을 프레임워크가 소유한다. 이 차이는 “무엇을 import하느냐”가 아니라 “누가 애플리케이션 실행 순서를 결정하느냐”의 차이다.


### 수업에서 잡아야 할 mental model


```plain text
Library
내 코드가 React를 호출한다.
내가 라우팅, 번들링, 데이터 로딩, 배포 전략을 조합한다.

Framework
Next.js가 내 파일을 읽고, route tree를 만들고,
렌더링 위치와 시점, 캐싱, prefetch, build output을 결정한다.
내 코드는 convention 안에 끼워 넣는 조각이 된다.
```


### 깊게 다룰 내용

- IoC는 “제어권 상실”이 아니라 “반복되는 제품 수준 의사결정을 프레임워크에 위임하는 것”이다.
- Next.js는 React 앱에서 반복되던 문제를 흡수했다.
    - 라우팅
    - code splitting
    - SSR/SSG/ISR
    - 이미지/폰트/스크립트 최적화
    - API boundary
    - 서버/클라이언트 컴포넌트 경계
    - 캐싱과 revalidation
- App Router 이후 Next.js는 “React를 위한 SSR 프레임워크”에서 “React Server Components를 제품화한 애플리케이션 프레임워크”로 이동했다.

### 강의용 질문

- React 앱에서 라우터를 직접 구성할 때 개발자가 가져가는 자유와 비용은 무엇인가?
- Next.js의 파일 규칙은 왜 DX 기능이 아니라 runtime contract인가?
- 프레임워크 convention을 깨는 순간 어떤 최적화가 사라지는가?

### 실습/데모


같은 “상품 상세 페이지”를 두 방식으로 비교한다.


```typescript
// 순수 React + React Router의 사고방식
<Route path="/products/:id" element={<ProductDetail />} />

// Next.js의 사고방식
app/products/[id]/page.tsx
```


수강생에게 질문한다.


```plain text
위 두 구조에서 누가 URL과 컴포넌트 매핑을 알고 있는가?
누가 code splitting 단위를 만들 수 있는가?
누가 build 단계에서 미리 알 수 있는 정보가 더 많은가?
```


---


## 02강. Routing Evolution: 수동 지도에서 파일 시스템 라우팅으로


### 핵심 메시지


파일 시스템 라우팅은 단순한 편의 기능이 아니다. URL, layout nesting, loading/error boundary, static params, metadata, route handler를 하나의 segment tree로 묶기 위한 정적 분석 가능한 구조다.


### mental model


```plain text
app/
  layout.tsx
  page.tsx
  dashboard/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx
    settings/
      page.tsx

URL /dashboard/settings
→ root layout
→ dashboard layout
→ dashboard loading/error boundary
→ settings page
```


### 깊게 다룰 내용

- 폴더는 URL segment를 만든다.
- `page.tsx` 또는 `route.ts`가 있어야 public route가 된다.
- `layout.tsx`는 하위 segment를 감싸며, navigation 중 state를 보존한다.
- `loading.tsx`는 해당 segment에 Suspense boundary를 만든다.
- `error.tsx`는 해당 segment 이하를 Error Boundary로 감싼다.
- `not-found.tsx`는 `notFound()` throw 흐름의 fallback UI다.
- 파일 구조는 routing + rendering + streaming + error recovery의 통합 DSL이다.

### 실무 함정

- `app/foo/_components/Button.tsx`는 private folder이므로 라우팅에서 제외된다.
- `(marketing)` 같은 route group은 URL에 나타나지 않지만 layout boundary에는 영향을 준다.
- route group을 여러 root layout 용도로 쓰면 그룹 간 이동은 full page load가 될 수 있다.
- 서로 다른 route group 안에서 같은 URL을 만들면 충돌한다.

### 실습/데모


```plain text
app/
  (shop)/
    layout.tsx
    products/page.tsx
  (marketing)/
    layout.tsx
    about/page.tsx
```


질문:


```plain text
/shop은 만들어지는가?
/products와 /about은 어떤 layout을 쓰는가?
(shop), (marketing)은 URL에 남는가?
(shop)과 (marketing)의 root layout이 다르면 navigation은 soft인가 hard인가?
```


---


## 03강. Rendering Mechanics: CSR, SSR, RSC의 차이


### 핵심 메시지


CSR, SSR, RSC는 “렌더링 위치”만 다른 것이 아니다. 데이터 요청 시점, JS bundle 크기, hydration 대상, navigation payload가 모두 다르다.


### 비교표



| 방식 | 서버가 보내는 것 | 브라우저가 해야 할 일 | 대표 비용 |
| --- | --- | --- | --- |
| CSR | 빈 shell + JS | JS 다운로드 후 데이터 fetch 후 render | 느린 FCP, waterfall |
| SSR | HTML + JS | 즉시 표시 후 hydration | 모든 interactive tree의 JS 필요 |
| RSC | HTML + RSC Payload + 필요한 client JS | Server Component 결과와 Client Component를 reconcile/hydrate | 경계 설계 복잡도 |



### RSC 동작 흐름


```plain text
1. 서버에서 Server Component 실행
2. 결과를 RSC Payload로 직렬화
3. Client Component 위치와 JS reference 포함
4. 초기 로드에서는 HTML preview + RSC Payload + JS를 사용
5. 이후 navigation에서는 HTML 전체가 아니라 RSC Payload 중심으로 tree를 갱신
```


### 강의 포인트

- Server Component는 브라우저로 컴포넌트 코드가 가지 않는다.
- Client Component는 서버에서도 초기 HTML 생성에 참여할 수 있지만, hydration을 위해 JS가 필요하다.
- `"use client"`는 “이 파일부터 client module graph의 entry가 된다”는 뜻이다.
- `"use server"`는 Server Component 지시어가 아니라 Server Function/Action 지시어다.
- RSC는 SSR 대체물이 아니라 SSR과 결합되는 새로운 컴포넌트 프로토콜이다.

### 코드 데모


```typescript
// app/posts/[id]/page.tsx
import LikeButton from './LikeButton';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });

  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton initialCount={post.likes} />
    </article>
  );
}
```


```typescript
// app/posts/[id]/LikeButton.tsx
'use client';

import { useState } from 'react';

export default function LikeButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```


수강생에게 확인시킬 것:


```plain text
db query는 어디서 실행되는가?
LikeButton의 JS는 브라우저로 가는가?
Page 컴포넌트 코드 자체는 브라우저 번들에 들어가는가?
initialCount는 어떤 조건을 만족해야 하는가?
```


---


# Section 2. 브라우저 생명력과 네비게이션 경험


## 04강. Hydration Deep Dive


### 핵심 메시지


Hydration은 “HTML을 다시 렌더링하는 것”이 아니라, 서버가 만든 DOM을 React가 소유권 있게 이어받고 event handler를 연결하는 과정이다. 서버 HTML과 클라이언트 최초 render 결과는 같아야 한다.


### 단계별 흐름


```plain text
1. 서버가 HTML을 보냄
2. 브라우저가 HTML을 파싱해 화면 표시
3. JS bundle 다운로드/실행
4. React가 기존 DOM을 대상으로 hydrateRoot 수행
5. event handler 연결
6. 이후부터 React가 DOM 업데이트 소유
```


### Hydration mismatch가 생기는 대표 원인

- 잘못된 HTML nesting
- render 중 `window`, `localStorage`, `document` 사용
- `Date.now()`, `Math.random()`처럼 서버/클라이언트 결과가 달라지는 값 사용
- `typeof window !== 'undefined'` 분기 자체가 render 결과를 바꿈
- 브라우저 확장 프로그램 또는 CDN이 HTML을 수정
- CSS-in-JS 설정 불일치

### 해결 전략


```typescript
// 1. client-only 분기는 useEffect 이후로 이동
'use client';

import { useEffect, useState } from 'react';

export function ClientOnlyValue() {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    setValue(window.localStorage.getItem('theme'));
  }, []);

  return <span>{value ?? 'loading...'}</span>;
}
```


```typescript
// 2. 정말 SSR을 끄고 싶을 때만 dynamic ssr false
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });
```


```typescript
// 3. 피할 수 없는 text 차이만 escape hatch 사용
<time suppressHydrationWarning>{new Date().toISOString()}</time>
```


### 강의에서 강조할 말


`useEffect`는 mismatch를 숨기는 도구가 아니라 “서버와 클라이언트 최초 render를 동일하게 만든 뒤, mount 이후 browser-only 값을 반영하는 도구”다.


---


## 05강. Navigation Experience: Hard vs Soft Navigation


### 핵심 메시지


Next.js의 App Router navigation은 서버 렌더링 앱을 SPA처럼 느끼게 만들기 위한 프로토콜이다. 전체 HTML을 다시 받는 대신, 공유 layout은 유지하고 바뀌는 segment의 RSC Payload를 받아 React tree를 갱신한다.


### Hard navigation


```plain text
브라우저 주소 이동
→ document 요청
→ HTML 새로 받음
→ JS 다시 로드
→ React root 새로 hydrate
→ 메모리 state/scroll/input 대부분 초기화
```


### Soft navigation


```plain text
<Link> 클릭 또는 router.push()
→ prefetch/cache 확인
→ 필요한 route segment의 RSC Payload 요청
→ 공유 layout 유지
→ 변경 segment만 교체
→ Client Component state 중 유지 가능한 부분 보존
```


### Next.js 16에서 더 강조할 점

- Link가 viewport에 들어오면 자동 prefetch가 작동한다.
- Next.js 16은 shared layout을 중복 prefetch하지 않고, 이미 cache에 있는 부분은 다시 받지 않는 incremental prefetching을 강화했다.
- `router.refresh()`는 현재 route를 서버에 다시 요청하지만, 클라이언트는 RSC Payload를 merge하므로 영향 없는 client state나 scroll을 잃지 않는다.
- Cache Components가 켜진 경우 React `<Activity>`를 활용해 최근 route를 hidden 상태로 보존하는 navigation 경험이 추가된다.

### 고급 토론


`useRouter().bfcacheId` 같은 identity 값은 왜 필요한가?


```plain text
fresh navigation에서는 state reset을 원할 수 있다.
browser back/forward에서는 이전 state 복원을 원할 수 있다.
즉, “같은 URL인가?”보다 “같은 navigation entry인가?”가 더 중요한 경우가 있다.
```


---


# Section 3. 프로젝트 뼈대 구축과 정적 라우팅


## 06강. System Setup & CLI


### 핵심 메시지


초기 세팅은 단순 설치가 아니라 “어떤 빌드러, 라우터, 타입 시스템, lint 규칙, 디렉터리 전략을 프레임워크 contract로 받아들일 것인가”를 결정하는 단계다.


### 실무 기준 세팅


```bash
pnpm create next-app@latest nexus \
  --ts \
  --eslint \
  --app \
  --src-dir \
  --tailwind
```


### CLI에서 짚을 것

- `next dev`: 개발 서버, HMR, Turbopack 기본 사용
- `next build`: route별 static/dynamic 결과 확인
- `next start`: production server
- `next typegen`: routes/pages/layouts/route handlers 타입 생성
- `next experimental-analyze`: Turbopack bundle 분석

### 빌드 출력 읽기


```plain text
○  Static    prerendered as static content
ƒ  Dynamic   server-rendered on demand
```


강의에서는 “왜 이 route가 dynamic이 되었는가?”를 계속 질문해야 한다.


---


## 07강. Project Structure


### 핵심 메시지


`app` 디렉터리 안의 모든 파일이 route가 되지는 않는다. route를 public하게 만드는 것은 `page.tsx`와 `route.ts`다. 따라서 colocation은 App Router의 기본 설계다.


### 추천 구조


```plain text
src/
  app/
    layout.tsx
    page.tsx
    (marketing)/
    dashboard/
      layout.tsx
      page.tsx
      _components/
      _lib/
  components/
  lib/
  server/
```


### 설명 포인트

- `app/foo/bar.tsx`는 route가 아니다.
- `app/foo/page.tsx`가 있어야 `/foo`가 생긴다.
- `_folder`는 private implementation detail이다.
- `(group)`은 URL에 나타나지 않지만 layout 경계를 만들 수 있다.
- `src`는 선택 사항이며 프로젝트 설정 파일과 앱 코드를 분리할 때 유용하다.

---


## 08강. Pages & Layouts


### 핵심 메시지


Page는 route의 leaf UI이고, Layout은 segment 사이에 남아 있는 persistent shell이다.


### 데모 구조


```plain text
app/
  layout.tsx
  dashboard/
    layout.tsx
    page.tsx
    reports/page.tsx
```


```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <Sidebar />
      <main>{children}</main>
    </section>
  );
}
```


### 확인 포인트

- `/dashboard`에서 `/dashboard/reports`로 이동해도 `Sidebar`는 재마운트되지 않는다.
- layout에 둔 client state는 유지된다.
- page에 둔 state는 leaf segment가 바뀌면 사라진다.

---


## 09강. Layout Deep Dive


### 핵심 메시지


Layout은 “공통 UI 재사용”이 아니라 segment-level persistence boundary다. 상태 보존을 원하면 어디에 Client Component boundary를 둘지 함께 설계해야 한다.


### 실습: 상태가 유지되는 대시보드 사이드바


```typescript
// app/dashboard/DashboardShell.tsx
'use client';

import { useState } from 'react';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button onClick={() => setCollapsed((v) => !v)}>toggle</button>
      <aside>{collapsed ? 'mini' : 'full'}</aside>
      <main>{children}</main>
    </div>
  );
}
```


```typescript
// app/dashboard/layout.tsx
import DashboardShell from './DashboardShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```


### 토론

- Client Shell을 root layout에 올리면 어떤 JS 비용이 생기는가?
- Dashboard segment layout에만 두면 어떤 state preservation을 얻는가?
- 검색창, 탭, 사이드바, modal state는 각각 어디에 두어야 하는가?

---


# Section 4. 동적 라우팅과 파라미터 제어


## 10강. Dynamic Routes 기초


### 핵심 메시지


`[id]`는 문자열 param 하나를 runtime 또는 build-time에 route tree에 주입하는 규칙이다. Next.js 15+에서는 `params`가 Promise이므로 Server Component에서 `await params`로 읽는다.


```typescript
// app/products/[id]/page.tsx
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return <h1>Product {id}</h1>;
}
```


### 왜 async인가?


Request-specific 값(`params`, `searchParams`, `cookies`, `headers`)은 dynamic rendering과 관련된다. Next.js 15부터 이 API들이 async가 되면서, 프레임워크가 요청 의존성이 없는 부분을 먼저 준비하고 요청 의존 부분을 나중에 처리할 여지를 갖는다.


---


## 11강. Dynamic Routes 실전


### 핵심 메시지


동적 route의 핵심은 “URL param을 데이터 key로 바꾸는 boundary”다. 여기서 validation, notFound, metadata, caching 전략이 결정된다.


```typescript
import { notFound } from 'next/navigation';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return <ProductDetail product={product} />;
}
```


### 실무 체크

- param은 신뢰할 수 없는 사용자 입력이다.
- `notFound()`는 해당 segment의 not-found UI로 흐름을 이동시킨다.
- 상세 페이지의 metadata도 같은 param을 사용하므로 data fetch 중복 제거 전략이 필요하다.
- `generateStaticParams`를 쓰면 hot path를 build/prerender 대상으로 올릴 수 있다.

---


## 12강. Search Params 기초


### 핵심 메시지


`searchParams`는 path identity가 아니라 request/query state다. 서버에서 읽으면 Server Component 렌더링 입력이 되고, 클라이언트에서 읽으면 URL 상태와 UI 상태를 연결한다.


```typescript
// app/products/page.tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page = '1' } = await searchParams;
  const products = await searchProducts({ q, page: Number(page) });

  return <ProductList products={products} />;
}
```


### 강의 포인트

- `params`는 route segment에서 온다.
- `searchParams`는 query string에서 온다.
- 서버에서 읽으면 route render의 input이 된다.
- 클라이언트에서 `useSearchParams()`를 쓰면 Client Component boundary와 Suspense를 고려해야 한다.
- query string은 bookmark/share 가능한 UI state로 적합하다.

---


## 13강. Search Params 실전: HTML form 기반 서버 검색


### 핵심 메시지


검색은 꼭 client state와 debounced fetch로만 만들 필요가 없다. URL query를 source of truth로 두면 HTML form submit만으로 서버 사이드 검색이 가능하다.


```typescript
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams;
  const results = await search(q);

  return (
    <>
      <form action="/products">
        <input name="q" defaultValue={q} />
        <button>Search</button>
      </form>
      <SearchResults results={results} />
    </>
  );
}
```


### 실무 토론

- 검색어 입력 중 UX는 client state가 더 낫다.
- 검색 결과 URL 공유/뒤로가기는 searchParams가 더 낫다.
- 서버 검색은 SEO/initial render에 유리하다.
- 복잡한 필터는 form, URLSearchParams, server validation schema를 함께 설계한다.

---


## 14강. Catch-all Segments 기초


### 핵심 메시지


`[...slug]`는 남은 path segment를 배열로 받는다. 문서, 카테고리, 파일 탐색기처럼 depth가 유동적인 IA에 적합하다.


```typescript
// app/docs/[...slug]/page.tsx
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params;
  return <DocPage path={slug.join('/')} />;
}
```


### optional catch-all


```plain text
app/docs/[[...slug]]/page.tsx
/docs           → { slug: undefined }
/docs/a         → { slug: ['a'] }
/docs/a/b       → { slug: ['a', 'b'] }
```


### 실무 함정

- `string[] | undefined` 타입을 제대로 처리해야 한다.
- catch-all은 route priority와 충돌 가능성을 만든다.
- path traversal, encoded slash, slug normalization을 서버에서 검증해야 한다.

---


## 15강. Catch-all 실전: Breadcrumb 위키 엔진


### 핵심 메시지


Catch-all route의 진짜 가치는 URL 구조를 데이터 구조로 바꾸는 데 있다.


```typescript
function Breadcrumb({ slug = [] }: { slug?: string[] }) {
  const items = slug.map((part, index) => ({
    label: part,
    href: '/docs/' + slug.slice(0, index + 1).join('/'),
  }));

  return (
    <nav>
      <a href="/docs">Docs</a>
      {items.map((item) => (
        <a key={item.href} href={item.href}>{item.label}</a>
      ))}
    </nav>
  );
}
```


### 미션 설계


“중첩 카테고리 기술 블로그”

- `/blog/frontend/react/rsc?level=advanced`
- catch-all로 category path 처리
- searchParams로 난이도/정렬/태그 처리
- breadcrumb 생성
- 존재하지 않는 경로는 `notFound()`
- 상위 카테고리 metadata와 leaf metadata 병합

---


# Section 5. 아키텍처 심화 및 컴포넌트 설계 패턴


## 16강. Route Groups & Private Folders


### 핵심 메시지


Route Group은 URL을 바꾸지 않고 layout tree를 바꾸는 도구다. Private Folder는 라우터에게 “이 폴더는 implementation detail”이라고 알려주는 도구다.


### 예시


```plain text
app/
  (marketing)/
    layout.tsx
    page.tsx
    pricing/page.tsx
  (app)/
    layout.tsx
    dashboard/page.tsx
  _components/
    Button.tsx
```


### 다룰 caveat

- `(marketing)/about/page.tsx`와 `(shop)/about/page.tsx`는 둘 다 `/about`이므로 충돌한다.
- multiple root layout 간 이동은 full page load가 될 수 있다.
- private folder는 colocation 필수 조건은 아니지만, 팀 컨벤션과 naming conflict 방지에 유용하다.

---


## 17강. Server vs Client Component


### 핵심 메시지


Server/Client Component 구분은 “서버에서 렌더되느냐”가 아니라 “어떤 module graph에 포함되느냐”의 문제다.


### Server Component에 적합

- DB/API 접근
- secret 사용
- markdown 변환, 무거운 라이브러리 사용
- JS bundle 축소
- streaming

### Client Component에 적합

- `useState`, `useEffect`
- event handler
- browser API
- custom hook
- context provider consumer
- interactive widget

### 핵심 문장


`"use client"`를 붙인 파일부터 그 import subtree는 client bundle 후보가 된다. 큰 layout 전체에 붙이는 것은 “편하다”가 아니라 “많은 코드를 브라우저로 보내겠다”는 선언이다.


---


## 18강. Composition Pattern


### 핵심 메시지


Server Component와 Client Component는 상속 관계가 아니라 composition 관계다. Client Component에 Server Component를 children/slot으로 전달하면, interactivity shell 안에 server-rendered content를 넣을 수 있다.


```typescript
// Client Component
'use client';

export function Modal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <div>{children}</div>}
    </>
  );
}
```


```typescript
// Server Component
export default async function Page() {
  const cart = await getCart();

  return (
    <Modal>
      <CartSummary cart={cart} />
    </Modal>
  );
}
```


### 금지 패턴


```typescript
'use client';

import ServerOnlyDataComponent from './ServerOnlyDataComponent'; // 대개 잘못된 방향
```


### 권장 패턴


```typescript
// Server parent가 data를 가져오고
// Client child는 serializable props 또는 children을 받는다.
```


### 실무 함정

- Client Component props는 직렬화 가능해야 한다.
- Server Component에서 React context를 직접 consume하는 모델은 아니다.
- Provider는 가능한 깊게 배치해야 static optimization을 더 많이 살릴 수 있다.

---


# Section 6. Special Files: 견고한 서비스의 안전장치


## 19강. Custom 404: `not-found.tsx`


### 핵심 메시지


404는 “route 없음”과 “data 없음”을 구분해야 한다. `notFound()`는 렌더링 중 특정 segment에서 not-found UI로 흐름을 이동시키는 제어 흐름이다.


```typescript
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return <ProductDetail product={product} />;
}
```


### 강의 포인트

- streamed response에서는 status code가 이미 나갔을 수 있어 200이 될 수 있다.
- non-streamed response에서는 404를 반환한다.
- `global-not-found`는 unmatched route 전체에 대한 404이며 layout 렌더링을 건너뛰는 성격이 있다.

---


## 20강. Loading UI: `loading.tsx`


### 핵심 메시지


`loading.tsx`는 “로딩 컴포넌트 파일”이 아니라 route segment 단위 Suspense fallback convention이다. 서버에서 해당 segment content가 stream될 동안 즉시 fallback을 보여준다.


```typescript
// app/feed/loading.tsx
export default function Loading() {
  return <FeedSkeleton />;
}
```


### 동작 포인트

- fallback UI는 prefetch될 수 있어 navigation 즉시 표시된다.
- navigation은 interruptible하다.
- shared layout은 새 segment가 로딩되는 동안에도 interactive 상태를 유지한다.
- 너무 무거운 loading UI는 fallback의 의미를 잃는다.

### 실습

- `/videos` 목록에서 `/videos/[id]` 상세로 이동
- 상세 page에서 artificial delay
- `loading.tsx` 유무에 따른 UX 비교
- 네트워크 throttling으로 prefetch 완료 전/후 비교

---


## 21강. Error UI: `error.tsx`


### 핵심 메시지


`error.tsx`는 route segment를 감싸는 React Error Boundary다. 따라서 반드시 Client Component여야 하며, recovery callback을 통해 해당 segment를 다시 렌더링할 수 있다.


```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section>
      <h2>Something went wrong</h2>
      <button onClick={() => unstable_retry()}>Try again</button>
    </section>
  );
}
```


### 설명 포인트

- segment 안에서 throw된 runtime error를 fallback UI로 전환한다.
- 상위 layout까지 죽이지 않고 부분 복구가 가능하다.
- root layout의 error는 `global-error.tsx`가 필요하다.
- production에서는 sensitive error detail이 client로 노출되지 않도록 digest 중심으로 다뤄야 한다.

---


# Section 7. 데이터 페칭과 렌더링 최적화


## 22강. Server Component Fetching


### 핵심 메시지


App Router에서 Server Component는 async 함수가 될 수 있고, 필요한 위치에서 직접 데이터를 await할 수 있다. prop drilling을 줄이고 data dependency를 UI 근처에 배치한다.


```typescript
export default async function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```


### 깊게 다룰 내용

- Server Component에서 `fetch`, ORM, DB query 사용 가능
- 동일한 render tree 내의 동일 fetch는 memoization 대상이 될 수 있다.
- uncached data는 rendering을 block하므로 Suspense/streaming 설계가 필요하다.
- client fetching이 나쁜 것이 아니라, initial payload/SEO/interaction timing 기준으로 선택해야 한다.

---


## 23강. Caching Strategy


### 핵심 메시지


Next.js 16의 방향은 암묵적 캐싱보다 명시적 캐싱이다. Cache Components를 켜면 기본적으로 uncached data fetching은 prerender에서 제외되고, 캐시하고 싶은 함수/컴포넌트에 `"use cache"`를 명시한다.


```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```


```typescript
// data-level cache
import { cacheLife } from 'next/cache';

export async function getProducts() {
  'use cache';
  cacheLife('hours');

  return db.product.findMany();
}
```


```typescript
// UI-level cache
export default async function Page() {
  'use cache';
  cacheLife('hours');

  const products = await db.product.findMany();
  return <ProductList products={products} />;
}
```


### 이전 모델도 함께 설명


기존 모델에서는 다음을 조합했다.


```typescript
fetch(url, { cache: 'force-cache' });
fetch(url, { cache: 'no-store' });
fetch(url, { next: { revalidate: 3600 } });

export const dynamic = 'force-dynamic';
export const revalidate = 60;
```


### 수업에서 계속 물어볼 질문


```plain text
이 데이터는 사용자별인가?
얼마나 오래 stale해도 되는가?
mutation 직후 read-your-writes가 필요한가?
HTML과 RSC Payload가 같은 cache freshness를 가져야 하는가?
client router cache와 server cache를 혼동하고 있지 않은가?
```


---


## 24강. ISR & Revalidation


### 핵심 메시지


Revalidation은 “캐시 삭제”가 아니라 stale content를 어떻게 갱신하고 사용자에게 언제 fresh content를 보여줄지 결정하는 정책이다.


### Next.js 16 Cache Components 기준


```typescript
import { cacheTag, cacheLife } from 'next/cache';

export async function getProducts() {
  'use cache';
  cacheLife('hours');
  cacheTag('products');

  return db.product.findMany();
}
```


```typescript
'use server';

import { revalidateTag, updateTag } from 'next/cache';

export async function publishProduct() {
  await db.product.create(...);

  // eventual consistency 허용: stale을 즉시 주고 background revalidate
  revalidateTag('products', 'max');

  // Server Action 내부에서 즉시 fresh read가 필요하면
  // updateTag('products');
}
```


### 구분



| API | 사용 위치 | 의미 |
| --- | --- | --- |
| `cacheLife` | `'use cache'` scope | time-based freshness |
| `cacheTag` | `'use cache'` scope | invalidation label |
| `revalidateTag(tag, profile)` | server | SWR 방식 invalidation |
| `updateTag(tag)` | Server Action | read-your-writes |
| `revalidatePath(path)` | server | path 단위 invalidation |



### 실무 토론

- 상품 목록은 `revalidateTag('products', 'max')`가 적합할 수 있다.
- 내 프로필 수정 직후 화면은 `updateTag`가 적합하다.
- 금융/재고/권한 데이터는 stale 허용 시간을 매우 짧게 잡거나 동적으로 렌더링한다.

---


## 25강. generateStaticParams


### 핵심 메시지


`generateStaticParams`는 동적 route의 일부 또는 전체 param set을 build/prerender 시점에 알려주는 함수다. 모든 path를 미리 만들 수도 있고, 인기 path만 만들고 나머지는 runtime에서 생성할 수도 있다.


```typescript
export async function generateStaticParams() {
  const posts = await getPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  return <Post slug={slug} />;
}
```


### 전략


```plain text
전체 정적 생성
→ docs, changelog, 마케팅 페이지

상위 N개만 정적 생성
→ 상품/블로그 hot path

빈 배열 반환
→ build time에는 만들지 않고 runtime에서 static generation/revalidation 대상화

dynamicParams = false
→ 생성되지 않은 path는 404
```


### 실무 함정

- 항상 배열을 반환해야 한다.
- child segment의 `generateStaticParams`는 parent가 만든 params 조합마다 실행될 수 있다.
- `params` 타입은 여전히 runtime input으로 검증해야 한다.
- SEO 대상 path와 long-tail path를 분리해 생각한다.

---


## 26강. generateMetadata


### 핵심 메시지


Metadata는 UI의 부속물이 아니라 HTML response의 일부다. 그래서 `metadata`와 `generateMetadata`는 Server Component 쪽에서만 지원된다.


```typescript
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.ogImage],
    },
  };
}
```


### 강의 포인트

- metadata는 root부터 leaf까지 순서대로 평가되고 shallow merge된다.
- nested object는 뒤 segment가 덮어쓴다.
- `metadataBase` 없이 relative URL을 쓰면 문제를 만들 수 있다.
- Next.js는 streaming metadata를 지원한다. 일반 UI를 먼저 보내고 metadata를 나중에 append할 수 있지만, HTML-limited bot에는 blocking behavior를 유지한다.
- Cache Components가 켜진 경우 metadata도 다른 component와 같은 caching/dynamic 규칙을 따른다.

### 실무 토론

- `generateMetadata`와 page에서 같은 데이터를 두 번 fetch하는가?
- Open Graph image는 파일 기반 Metadata API로 빼는 게 나은가?
- personalization metadata가 정말 필요한가?
- bot별 metadata streaming behavior를 이해하고 있는가?

---


# 통합 미션 설계안


## 미션 1. Nexus — 상태가 유지되는 B2B 대시보드


목표:

- `(app)` route group
- dashboard nested layout
- client shell state preservation
- server data fetching
- loading/error/not-found boundary
- searchParams 기반 필터

구조:


```plain text
app/
  (app)/
    dashboard/
      layout.tsx
      page.tsx
      reports/page.tsx
      customers/[id]/page.tsx
      loading.tsx
      error.tsx
```


평가 기준:

- `/dashboard` ↔︎ `/dashboard/reports` 이동 시 sidebar state 유지
- customer id가 없으면 segment not-found
- reports filter는 URL query에 보존
- server/client boundary가 과도하게 위로 올라가지 않음

---


## 미션 2. Tech-Flow — 상품 목록/상세/검색/SEO


목표:

- `[id]` dynamic route
- searchParams 기반 검색
- `generateStaticParams`로 hot products prerender
- `generateMetadata`로 상품별 SEO
- 캐싱/재검증 정책 설계

평가 기준:

- 상품 상세가 build output에서 static/dynamic 중 어디로 분류되는지 설명
- 상품 업데이트 후 목록/상세의 revalidation 전략 제시
- form submit 기반 검색과 client-side filter의 trade-off 설명

---


## 미션 3. Cloud File Explorer — catch-all + breadcrumb


목표:

- `[[...path]]` optional catch-all
- breadcrumb
- 확장자/filter searchParams
- 권한/존재 여부 검증
- loading/error boundary

평가 기준:

- `/files`, `/files/a/b/c` 모두 처리
- `path?: string[]` 타입 안전 처리
- path traversal 방어
- 존재하지 않는 folder는 notFound
- breadcrumb href가 정상적으로 누적 생성

---


# 강의 운영 팁


## 각 강의의 권장 구성


```plain text
1. 1분: 오늘의 오해 하나 제시
2. 3분: mental model
3. 5~8분: 내부 동작 흐름
4. 5분: 코드 데모
5. 3분: 실무 함정
6. 2분: 체크 질문
```


## 수강생에게 반복해서 던질 질문

- 이 코드는 서버에서 실행되는가, 브라우저에서 실행되는가, 둘 다인가?
- 이 컴포넌트의 JS가 client bundle에 들어가는가?
- 이 route는 static인가 dynamic인가, 왜 그런가?
- 이 fetch는 request마다 실행되는가, 캐시되는가, revalidate되는가?
- navigation 중 어떤 layout이 유지되는가?
- 이 에러는 loading/error/not-found 중 어느 boundary로 흐르는가?
- 이 URL 상태는 path segment인가 search param인가 client state인가?

---


# 참고 자료

- Next.js 16 release notes: Cache Components, Turbopack stable, enhanced routing/navigation, new caching APIs
- Next.js App Router docs: Layouts and Pages, Project Structure, Linking and Navigating
- Next.js docs: Server and Client Components, Fetching Data, Caching, Revalidating
- Next.js docs: Dynamic Routes, generateStaticParams, generateMetadata
- Next.js docs: loading.js, error.js, not-found.js
- Next.js docs: Async Dynamic APIs in Next.js 15
- React docs: Server Components, hydrateRoot
- Next.js docs: Hydration error guide
