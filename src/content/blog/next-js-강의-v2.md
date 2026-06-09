---
title: "Next.js 강의 v2"
description: "Next"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "37a7cf19-a364-80cf-8c1a-dc2d2014b37a"
---
전제: React, TypeScript, App Router 기본 라우팅, Server / Client Component 개념은 이미 알고 있다고 가정한다.


목표: 기능 사용법을 다시 외우는 것이 아니라, Next.js가 왜 이런 추상화를 만들었고 내부적으로 어떤 파이프라인으로 동작하는지 설명할 수 있게 만든다.


버전 기준: Next.js 16 계열 / React 19.2 계열 / App Router / Cache Components 기준


주의: Next.js 16에서는 `middleware.ts`가 `proxy.ts`로 이름이 바뀌는 흐름, Cache Components, `use cache`, `cacheLife`, `updateTag`, `revalidateTag(tag, profile)` 같은 최신 캐시 모델을 중심으로 설명한다. 기존 프로젝트를 위해 이전 캐싱 모델도 함께 비교한다.


---


## 0. 강의 설계 원칙


이 강의는 “Next.js 기능 백과사전”이 아니다.


수강생이 이미 `route.ts`, Server Actions, `revalidatePath`, `@modal`, `(..)photo` 같은 문법을 본 적 있다는 전제에서 시작한다.


수업의 핵심 질문은 다음과 같다.


```plain text
1. 이 기능은 어떤 웹/CS 문제를 해결하려고 태어났는가?
2. Next.js는 이 문제를 React Server Components, HTTP, 캐시, 라우팅 트리 위에서 어떻게 푸는가?
3. 실무에서는 어떤 옵션 조합에서 깨지고, 어떻게 디버깅해야 하는가?
4. API Route / fetch / Server Action / Route Handler / 캐시 무효화 중 무엇을 선택해야 하는가?
5. 사용자 경험 관점에서 hard navigation, soft navigation, streaming, optimistic update는 어떻게 연결되는가?
```


---


## 전체 커리큘럼 개요


```plain text
Section 1. Route Handlers: Next.js를 API 서버로 쓰기
  01. RESTful API와 HTTP 메서드의 본질
  02. Route Handlers 기초와 API 검증
  03. URL vs URI, Path Variable과 Query String
  04. 동적 Route Handler와 데이터 렌더링
  05. Memoization과 HTTP 캐시 제어
  06. Route Handlers 캐싱과 Request Memoization
  07. 이벤트 기반 아키텍처와 Webhook
  08. 외부 연동용 RESTful API 구축

Section 2. Server Actions & Modern Mutation
  09. HTML Form 전송의 역사와 RPC의 부활
  10. API Route의 종말? Server Actions의 실제 의미
  11. useFormStatus와 물리적 중복 제출 방지
  12. useActionState와 서버 응답 상태 브릿지
  13. revalidatePath와 Mutation 후 캐시 파괴
  14. useOptimistic과 낙관적 UI
  15. HTTP Stateless와 Cookie 보안 속성
  16. Server Action 내부 cookies() 제어
  17. HTTP 300 Redirect와 PRG 패턴
  18. redirect()와 NEXT_REDIRECT 제어 흐름

Section 3. Caching Revolution
  19. 데이터 신선도 vs 성능: 렌더링의 딜레마
  20. Dynamic by default와 Opt-in Caching
  21. Time-based Revalidation과 ISR / SWR
  22. Macro Caching의 한계와 Micro Caching
  23. use cache 지시어와 컴포넌트 단위 캐싱
  24. TTL과 PPR의 연결
  25. cacheLife와 PPR 하이브리드 아키텍처
  26. Cache Invalidation이라는 난제
  27. revalidatePath: 경로 기반 무효화
  28. Surrogate Keys와 cacheTag
  29. revalidateTag / updateTag 정밀 무효화

Section 4. Advanced Routing
  30. Micro-frontends와 Parallel Rendering
  31. Parallel Routes와 default.tsx
  32. State와 URL의 동기화 딜레마
  33. Intercepting Routes 기초
  34. Soft vs Hard Navigation 렌더링 분기
  35. Parallel + Intercepting Routes 모달 아키텍처
  36. Browser History Stack과 Navigation Control
  37. URL 상태 기반 모달 닫기와 뒤로 가기 제어
```


---


# Section 1. Route Handlers: Next.js를 API 서버로 쓰기


## Section 핵심 메시지


Route Handler는 “Next.js 안에 API 몇 개 넣는 편의 기능”이 아니다.


프론트엔드 애플리케이션과 외부 시스템 사이에 위치하는 **HTTP boundary**다.


이 섹션에서는 Next.js App Router가 UI route와 API route를 같은 파일 시스템 라우팅 모델 안에 넣었을 때 생기는 장점과 제약을 다룬다.


```plain text
UI route
app/products/[id]/page.tsx
→ HTML / RSC Payload / Client navigation에 참여

API route
app/api/products/[id]/route.ts
→ Request / Response / HTTP method / status code 중심
→ layout, loading, error boundary에 참여하지 않음
```


---


## 01강. RESTful API와 HTTP 메서드의 본질


### 한 줄 목표


REST는 “URL 예쁘게 짓기”가 아니라 리소스, 표현, 메서드, 상태 전이의 계약이라는 점을 이해한다.


### 핵심 개념

- Resource: 서버가 식별 가능한 대상
- Representation: JSON, HTML, 이미지처럼 리소스를 표현하는 형식
- Method semantics: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Idempotency: 같은 요청을 여러 번 보내도 결과가 같은가
- Safety: 서버 상태를 변경하지 않는가
- Status code: 클라이언트와 서버 사이의 제어 신호

### 강사용 설명 흐름


```plain text
클라이언트는 서버의 내부 함수를 호출하지 않는다.
클라이언트는 URI로 리소스를 지칭하고, HTTP method로 의도를 전달한다.
서버는 status code와 body로 결과를 표현한다.
```


React 개발자는 종종 `fetch('/api/createPost')`처럼 RPC식 엔드포인트를 만든다. 이 방식이 항상 나쁜 것은 아니지만, RESTful API 설계에서는 “동사 endpoint”보다 “명사 resource + method”를 우선한다.


```plain text
나쁜 예시
POST /api/createPost
POST /api/deletePost

좋은 예시
POST   /api/posts
DELETE /api/posts/:id
```


### 데모 코드


```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ posts: [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json(
      { error: 'title is required' },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { id: crypto.randomUUID(), ...body },
    { status: 201 },
  );
}
```


### 실무 함정

- `GET`에 mutation을 넣으면 프리패치, 캐시, 크롤러, 로그 재시도와 충돌한다.
- `POST`를 모든 요청에 쓰면 캐시와 observability가 어려워진다.
- status code를 항상 200으로 주면 클라이언트 에러 처리와 모니터링이 흐려진다.

### 수강생 질문


```plain text
GET /api/orders?status=pending
POST /api/orders/search
둘 중 무엇이 더 나은가?
검색 조건이 복잡해지고 body가 필요하면 어떻게 바뀌는가?
```


---


## 02강. Route Handlers 기초: GET, POST와 API 검증


### 한 줄 목표


`route.ts`가 어떤 규칙으로 HTTP entrypoint가 되고, Request/Response API 위에서 어떻게 방어선을 만드는지 이해한다.


### mental model


```plain text
app/api/agents/route.ts
  export async function GET() {}
  export async function POST() {}

요청이 들어오면 Next.js 라우터가 URL segment와 HTTP method를 기준으로
해당 named export를 선택한다.
```


### 반드시 강조할 공식 동작

- Route Handler는 `app` 디렉터리 안에서만 사용한다.
- `route.ts`는 같은 segment의 `page.tsx`와 공존할 수 없다.
- 지원 메서드는 `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`다.
- unsupported method는 405 응답을 만든다.
- Route Handler는 layout이나 client-side navigation tree에 참여하지 않는다.

### 데모 코드: 요청 검증 방어선


```typescript
// app/api/devices/route.ts
import { NextResponse } from 'next/server';

const VALID_TYPES = ['laptop', 'tablet', 'phone'] as const;

type DeviceType = (typeof VALID_TYPES)[number];

function isDeviceType(value: unknown): value is DeviceType {
  return typeof value === 'string' && VALID_TYPES.includes(value as DeviceType);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ message: 'Body must be an object' }, { status: 400 });
  }

  const payload = body as { name?: unknown; type?: unknown };

  if (typeof payload.name !== 'string') {
    return NextResponse.json({ message: 'name is required' }, { status: 422 });
  }

  if (!isDeviceType(payload.type)) {
    return NextResponse.json({ message: 'type is invalid' }, { status: 422 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
```


### 실무 판단 기준


Route Handler가 적합한 경우:


```plain text
- 외부 시스템이 호출하는 endpoint가 필요하다.
- Webhook을 받아야 한다.
- 모바일 앱, 외부 파트너, CLI 등 React UI 밖의 consumer가 있다.
- streaming / file / image / sitemap / OpenGraph 같은 non-UI response가 필요하다.
```


Server Action이 더 적합한 경우:


```plain text
- 같은 Next.js 앱의 form submit/mutation만 처리한다.
- mutation 후 RSC tree refresh/revalidation이 필요하다.
- API URL을 클라이언트에 노출하고 싶지 않다.
```


### 미션


“AI 에이전트 통제 센터” API를 만든다.


```plain text
GET  /api/agents       → 에이전트 목록
POST /api/agents       → 새 에이전트 등록
GET  /api/agents/[id]  → 개별 에이전트 상태
```


검증 조건:


```plain text
- name은 2자 이상
- model은 허용 목록 중 하나
- temperature는 0 이상 2 이하
- 잘못된 JSON은 400
- 의미상 잘못된 값은 422
```


---


## 03강. URL vs URI, Path Variable과 Query String


### 한 줄 목표


동적 segment와 query string의 역할을 구분하고, 캐시 key와 라우팅 key 관점에서 해석한다.


### 핵심 모델


```plain text
Path parameter
/api/instances/i-123
→ 리소스의 identity

Query string
/api/instances?region=ap-northeast-2&status=running
→ 같은 collection에 대한 projection/filter/sort
```


### Next.js 관점


```typescript
// app/api/instances/[id]/route.ts
export async function GET(
  _request: Request,
  context: RouteContext<'/api/instances/[id]'>,
) {
  const { id } = await context.params;
  return Response.json({ id });
}
```


```typescript
// app/api/instances/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get('region');
  const status = url.searchParams.get('status');

  return Response.json({ region, status });
}
```


### 깊게 다룰 포인트

- path는 라우터가 segment matching에 사용한다.
- query string은 route matching 이후 request-specific data로 해석한다.
- query string을 읽으면 결과가 request에 따라 달라지므로 캐시 key 설계가 중요해진다.
- `URLSearchParams`는 문자열 기반이다. 숫자/boolean/enum parsing은 직접 해야 한다.

### 실무 함정


```plain text
/api/products/123?currency=KRW
```


이 URL에서 product id는 identity지만 currency는 representation variant다. 캐시를 설계할 때 `product:123`만 tag로 걸면 currency별 응답이 섞일 수 있다.


---


## 04강. 동적 Route Handler와 데이터 렌더링 실전


### 한 줄 목표


동적 Route Handler와 Server Component page가 같은 데이터를 어떻게 공유하고, 각각 어떤 소비자에게 적합한지 비교한다.


### 비교


```plain text
Server Component page
- UI를 반환한다.
- RSC Payload와 HTML 생성에 참여한다.
- layout/loading/error boundary 안에서 동작한다.

Route Handler
- HTTP response를 반환한다.
- 외부 consumer가 호출할 수 있다.
- layout tree와 분리되어 있다.
```


### 데모 구조


```plain text
app/
  instances/
    [id]/
      page.tsx
  api/
    instances/
      [id]/
        route.ts
lib/
  instances.ts
```


```typescript
// lib/instances.ts
export async function getInstance(id: string) {
  return {
    id,
    cpu: Math.round(Math.random() * 100),
    memory: Math.round(Math.random() * 100),
    checkedAt: new Date().toISOString(),
  };
}
```


```typescript
// app/instances/[id]/page.tsx
import { getInstance } from '@/lib/instances';

export default async function InstancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const instance = await getInstance(id);

  return <pre>{JSON.stringify(instance, null, 2)}</pre>;
}
```


```typescript
// app/api/instances/[id]/route.ts
import { getInstance } from '@/lib/instances';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/instances/[id]'>,
) {
  const { id } = await context.params;
  const instance = await getInstance(id);

  return Response.json(instance);
}
```


### 수업 포인트


동일한 domain function을 UI route와 API route에서 공유하면 중복을 줄일 수 있다.


하지만 인증/인가/캐시 정책은 각 entrypoint에서 다시 검증해야 한다.


---


## 05강. Memoization과 HTTP 캐시 제어


### 한 줄 목표


메모이제이션, HTTP cache, framework cache, RSC request memoization을 구분한다.


### 네 가지 캐시를 분리해서 설명


```plain text
1. Request memoization
   같은 render pass 안에서 동일 요청 dedupe

2. Data cache / server cache
   여러 요청 사이에서 fetch 결과 또는 use cache 결과 재사용

3. HTTP cache
   브라우저/CDN이 Cache-Control 기반으로 response 재사용

4. Client router cache
   Next.js client navigation에서 RSC payload / route segment 재사용
```


### 실무에서 자주 생기는 오해


```plain text
"한 번만 요청됐네? 캐시된 건가?"
```


아닐 수 있다.

- 같은 render pass 안에서 dedupe된 것일 수 있다.
- 다음 HTTP request에서도 살아있으면 persistent cache다.
- 브라우저 devtools에서 안 보이는 서버 내부 fetch일 수 있다.
- route handler response cache와 내부 fetch cache는 다르다.

### 데모


```typescript
// lib/products.ts
export async function getProduct(id: string) {
  console.log('fetch product', id);
  const res = await fetch(`https://example.com/products/${id}`);
  return res.json();
}
```


```typescript
// app/products/[id]/page.tsx
import { getProduct } from '@/lib/products';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const a = await getProduct(id);
  const b = await getProduct(id);

  return <pre>{JSON.stringify({ a, b }, null, 2)}</pre>;
}
```


강의에서는 `logging.fetches`와 server log를 함께 보며 HIT/MISS/SET의 차이를 관찰한다.


---


## 06강. Route Handlers 캐싱과 Request Memoization


### 한 줄 목표


Route Handler의 response caching과 내부 data caching은 별개라는 점을 이해한다.


### 공식 동작 기준


Route Handler는 기본적으로 캐시되지 않는다. 단, `GET`은 route config 등을 통해 caching에 opt-in할 수 있다. `POST`, `PUT`, `PATCH`, `DELETE` 같은 mutation method는 캐시되지 않는다.


### 데모 1: 동적 Route Handler


```typescript
// app/api/clock/route.ts
export async function GET() {
  return Response.json({ now: new Date().toISOString() });
}
```


새로고침할 때마다 바뀐다.


### 데모 2: force-static


```typescript
// app/api/build-info/route.ts
export const dynamic = 'force-static';

export async function GET() {
  return Response.json({ builtAt: new Date().toISOString() });
}
```


빌드/캐시 정책에 따라 응답이 재사용될 수 있다.


### 데모 3: Cache Components 모델의 helper 추출


```typescript
// app/api/products/route.ts
import { cacheLife } from 'next/cache';

export async function GET() {
  const products = await getCachedProducts();
  return Response.json(products);
}

async function getCachedProducts() {
  'use cache';
  cacheLife('hours');

  return db.product.findMany();
}
```


강의 포인트:


```plain text
use cache는 Route Handler body 안에 직접 넣는 것이 아니라
캐시하고 싶은 async helper/component/function scope에 둔다.
```


---


## 07강. 이벤트 기반 아키텍처와 Webhook


### 한 줄 목표


Webhook은 “내가 호출하는 API”가 아니라 “외부 시스템이 내 서버를 호출하는 역방향 이벤트 채널”임을 이해한다.


### mental model


```plain text
Polling
내 서버 → 외부 서버: 새 데이터 있나요?

Webhook
외부 서버 → 내 서버: 이벤트가 발생했습니다.
```


### 강의 핵심


Webhook Route Handler에서 중요한 것은 UI 렌더링이 아니라 수신 안정성이다.


```plain text
- signature 검증
- idempotency key 처리
- raw body 필요 여부
- 빠른 2xx 응답
- 내부 queue로 위임
- 재시도 중복 처리
```


### 데모 코드


```typescript
// app/api/webhooks/reviews/route.ts
import { NextResponse } from 'next/server';

const processed = new Set<string>();

export async function POST(request: Request) {
  const eventId = request.headers.get('x-event-id');

  if (!eventId) {
    return NextResponse.json({ message: 'Missing event id' }, { status: 400 });
  }

  if (processed.has(eventId)) {
    return NextResponse.json({ duplicated: true });
  }

  const payload = await request.json();

  //TODO: validate signature
  //TODO: enqueue durable job
  processed.add(eventId);

  return NextResponse.json({ received: true });
}
```


### 실무 함정

- 인메모리 `Set`은 serverless/edge 환경에서 durable하지 않다.
- 외부 플랫폼은 실패 시 같은 이벤트를 여러 번 보낸다.
- Webhook은 반드시 idempotent하게 설계해야 한다.
- UI 업데이트는 webhook 수신과 분리하고, tag/path revalidation 또는 queue worker에서 처리한다.

---


## 08강. 외부 연동용 RESTful API 구축 실전


### 한 줄 목표


Route Handler, 검증, 캐싱, webhook, UI를 하나의 풀스택 파이프라인으로 연결한다.


### 통합 프로젝트: Review Bridge Dashboard


```plain text
외부 교육 플랫폼 → POST /api/webhooks/reviews
관리자 UI → /admin/reviews
공개 API → GET /api/reviews
내부 저장소 → lib/reviews.ts
```


### 파일 구조


```plain text
app/
  api/
    reviews/
      route.ts
    webhooks/
      reviews/
        route.ts
  admin/
    reviews/
      page.tsx
lib/
  reviews.ts
  validators.ts
```


### 수업 흐름

1. webhook으로 review 수신
2. 유효성 검증
3. 저장소에 append
4. 관리자 page에서 읽기
5. public API에서 JSON 반환
6. mutation 이후 revalidation 연결은 Section 2/3에서 확장

### 체크리스트


```plain text
[ ] 잘못된 JSON에 400을 반환한다.
[ ] signature 또는 secret header를 검증한다.
[ ] event id로 중복 이벤트를 무시한다.
[ ] webhook은 빠르게 2xx를 반환한다.
[ ] UI와 API가 같은 domain function을 공유한다.
[ ] entrypoint별 인증/인가를 따로 둔다.
```


---


# Section 2. Server Actions & Modern Mutation


## Section 핵심 메시지


Server Action은 “API Route를 안 만들어도 되는 문법”이 아니다.


React/Next.js가 mutation을 form, transition, server function, RSC refresh와 하나의 roundtrip으로 결합한 모델이다.


```plain text
전통적인 mutation
Client state → fetch POST → JSON response → client cache invalidate → refetch → UI update

Server Action mutation
<form action={serverAction}> → POST → server mutation → revalidate/refresh → updated RSC tree 반환
```


---


## 09강. HTML Form 전송의 역사와 RPC의 부활


### 한 줄 목표


Server Action을 이해하기 위해 HTML form, progressive enhancement, RPC의 장단점을 연결한다.


### 역사적 흐름


```plain text
HTML form
- 브라우저가 FormData를 만들고 서버에 submit
- JavaScript 없이도 동작

SPA fetch mutation
- JS가 form state를 들고 fetch
- pending/error/success/retry를 직접 관리

Server Actions
- form action에 서버 함수를 직접 연결
- React/Next가 action 호출과 UI 갱신을 통합
```


### 강의 포인트


Server Action은 RPC처럼 보인다. 그러나 일반 RPC와 달리 React render pipeline에 붙어 있다. mutation 후 단순 JSON만 받는 것이 아니라, revalidation된 UI tree를 받을 수 있다.


### 데모


```typescript
// app/actions.ts
'use server';

export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  // validate + mutate
}
```


```typescript
// app/posts/new/page.tsx
import { createPost } from '@/app/actions';

export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  );
}
```


### 토론 질문


```plain text
Server Action은 REST를 대체하는가?
외부 모바일 앱이 같은 mutation을 호출해야 한다면 어떤 boundary가 필요한가?
```


정답 방향:


```plain text
- 앱 내부 mutation: Server Action 적합
- 외부 consumer/API contract: Route Handler 적합
- 둘 다 필요하면 domain service를 공유하고 entrypoint를 분리한다.
```


---


## 10강. API Route의 종말과 Server Actions의 실제 의미


### 한 줄 목표


Server Action은 API Route의 완전한 종말이 아니라, UI-local mutation을 위한 더 높은 수준의 entrypoint임을 이해한다.


### 공식 동작 포인트

- Server Function은 서버에서 실행되는 async function이다.
- 클라이언트에서 네트워크 요청을 통해 호출할 수 있으므로 async여야 한다.
- mutation context에서는 Server Action이라고 부른다.
- 내부적으로 POST로 호출된다.
- 직접 POST 요청으로도 닿을 수 있으므로 인증/인가를 Server Function 안에서 반드시 확인해야 한다.

### 보안 강조


잘못된 예시:


```typescript
// 로그인된 사용자에게만 버튼을 보여줬으니 안전하다고 착각
<form action={deleteAccount}>
  <button>Delete</button>
</form>
```


올바른 예시:


```typescript
// app/actions/account.ts
'use server';

import { auth } from '@/lib/auth';

export async function deleteAccount() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  await db.user.delete({ where: { id: session.user.id } });
}
```


### architectural boundary


```plain text
Server Action이 숨겨주는 것
- API URL 관리
- fetch boilerplate
- JSON parsing boilerplate
- mutation 후 UI refresh 연결

Server Action이 대신 해주지 않는 것
- 인증/인가
- 입력 검증
- idempotency
- transaction
- domain invariant
```


---


## 11강. useFormStatus와 펜딩 상태 UI 제어


### 한 줄 목표


`useFormStatus`는 form 제출 상태를 가장 가까운 parent form 기준으로 읽는 hook임을 이해한다.


### 핵심 규칙


```plain text
useFormStatus는 반드시 form의 자식 컴포넌트에서 호출해야 한다.
같은 컴포넌트에서 form을 렌더하고 바로 useFormStatus를 호출하면 기대대로 동작하지 않는다.
```


### 데모


```typescript
// app/ui/submit-button.tsx
'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending, data, method } = useFormStatus();

  return (
    <button disabled={pending} aria-disabled={pending}>
      {pending ? `Submitting ${method.toUpperCase()}...` : 'Submit'}
    </button>
  );
}
```


```typescript
// app/devices/page.tsx
import { registerDevice } from './actions';
import { SubmitButton } from './submit-button';

export default function Page() {
  return (
    <form action={registerDevice}>
      <input name="serial" />
      <SubmitButton />
    </form>
  );
}
```


### 실무 함정

- 버튼 disabled만으로 보안을 보장할 수 없다. 서버에서도 중복 요청을 막아야 한다.
- `pending`은 UX lock이지 transaction lock이 아니다.
- 실제 중복 방지는 idempotency key, unique constraint, transaction으로 해야 한다.

### 미션


“보안 기기 등록 시스템”을 만든다.


```plain text
- form submit 중 버튼 비활성화
- 제출 중 serial 값을 보여주기
- 서버에서 중복 serial 거부
- 같은 요청을 두 번 보내도 DB가 오염되지 않도록 설계
```


---


## 12강. useActionState와 서버 액션 결과 렌더링


### 한 줄 목표


`useActionState`를 서버 mutation의 결과 상태를 client component에 연결하는 reducer-action 모델로 이해한다.


### mental model


```plain text
useState
client event → setState(next)

useActionState
form/action submit → server/client action(previousState, payload) → return nextState
```


### 데모


```typescript
// app/auth/actions.ts
'use server';

type LoginState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; userId: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email.includes('@')) {
    return { status: 'error', message: 'Invalid email' };
  }

  const user = await db.user.findByEmail(email);

  if (!user || !verify(password, user.passwordHash)) {
    return { status: 'error', message: 'Invalid credentials' };
  }

  return { status: 'success', userId: user.id };
}
```


```typescript
// app/auth/login-form.tsx
'use client';

import { useActionState } from 'react';
import { login } from './actions';

const initialState = { status: 'idle' } as const;

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction}>
      <input name="email" />
      <input name="password" type="password" />
      <button disabled={isPending}>Login</button>
      {state.status === 'error' && <p role="alert">{state.message}</p>}
    </form>
  );
}
```


### 고급 포인트

- `previousState`는 서버 action이 “이전 제출 결과”를 알게 하는 bridge다.
- `initialState`는 serializable해야 한다.
- 여러 action dispatch는 순차 실행될 수 있다.
- thrown error는 Error Boundary로 가고, expected error는 return state로 처리하는 것이 좋다.

---


## 13강. revalidatePath와 Mutation 후 캐시 파괴


### 한 줄 목표


mutation 후 “DB는 바뀌었는데 화면은 그대로”인 문제를 경로 기반 무효화로 해결한다.


### 문제 상황


```plain text
1. /posts가 정적 또는 캐시된 데이터로 렌더링된다.
2. Server Action으로 새 post를 만든다.
3. DB에는 저장됐지만 /posts UI는 이전 RSC/cache를 재사용한다.
4. 사용자 입장에서는 저장이 안 된 것처럼 보인다.
```


### 해결


```typescript
// app/posts/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '');

  await db.post.create({ data: { title } });

  revalidatePath('/posts');
  redirect('/posts');
}
```


### 강의 포인트


`revalidatePath('/posts')`는 path 단위로 “다음 렌더에서 다시 계산해야 한다”는 신호를 준다.


Server Action에서 호출하면 현재 보고 있는 path에 대해서는 UI가 즉시 업데이트될 수 있다. Route Handler에서 호출하면 다음 방문 시점에 revalidation된다.


### 실무 함정

- `redirect()` 이후 코드는 실행되지 않는다. revalidation은 redirect 전에 해야 한다.
- dynamic route pattern을 revalidate할 때는 `'page' | 'layout'` 타입 인자가 필요할 수 있다.
- 너무 넓은 layout path를 revalidate하면 많은 하위 페이지가 영향을 받는다.

---


## 14강. useOptimistic과 낙관적 UI 업데이트


### 한 줄 목표


`useOptimistic`은 네트워크 성공을 기다리지 않고 임시 UI 상태를 보여주되, 실제 source of truth와 수렴하도록 설계하는 hook임을 이해한다.


### mental model


```plain text
사용자 클릭
→ optimistic state 즉시 반영
→ Server Action 실행
→ 성공: 실제 데이터가 optimistic state와 수렴
→ 실패: 실제 데이터 기준으로 롤백 + 에러 표시
```


### 데모: 장바구니 수량 변경


```typescript
'use client';

import { useOptimistic, startTransition } from 'react';
import { updateCartQuantity } from './actions';

type CartItem = { id: string; name: string; quantity: number };

export function Cart({ items }: { items: CartItem[] }) {
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (current, payload: { id: string; delta: number }) =>
      current.map((item) =>
        item.id === payload.id
          ? { ...item, quantity: item.quantity + payload.delta }
          : item,
      ),
  );

  function increment(id: string) {
    startTransition(async () => {
      updateOptimistic({ id, delta: 1 });
      await updateCartQuantity(id, 1);
    });
  }

  return (
    <ul>
      {optimisticItems.map((item) => (
        <li key={item.id}>
          {item.name}: {item.quantity}
          <button onClick={() => increment(item.id)}>+</button>
        </li>
      ))}
    </ul>
  );
}
```


### 실패 처리 설계


```plain text
- optimistic update는 optimistic할 뿐 확정이 아니다.
- 서버 실패 시 toast/error state를 보여준다.
- parent props가 재검증되어 내려오면 optimistic state는 source of truth와 수렴한다.
- 재고/결제/권한처럼 실패 가능성이 높은 작업은 더 보수적인 UI가 필요하다.
```


---


## 15강. HTTP 무상태성(Stateless)과 쿠키 보안 속성


### 한 줄 목표


HTTP 서버는 기본적으로 사용자를 기억하지 않으며, cookie/session/token은 이 무상태성 위에 얹는 신분증 계층임을 이해한다.


### 쿠키 속성


```plain text
HttpOnly   → client JavaScript에서 document.cookie로 읽을 수 없음
Secure     → HTTPS에서만 전송
SameSite   → cross-site 요청에 쿠키 전송 제한
Path       → 쿠키가 전송될 path scope
Max-Age/Expires → 수명
```


### 강의 포인트


클라이언트 상태에 auth 정보를 저장하면 XSS에 취약하다.


서버에서 HttpOnly cookie를 설정하면 client JS가 토큰을 직접 읽지 못한다. 하지만 CSRF, SameSite, origin 검증, 서버 인가 검증이 함께 필요하다.


### 데모


```typescript
// app/auth/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function setSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set('session', signSession(userId), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}
```


---


## 16강. Server Action 내 cookies() 제어


### 한 줄 목표


Server Action에서 쿠키를 set/delete하면, Next.js가 현재 RSC tree를 서버에서 다시 렌더해 cookie-dependent UI를 업데이트할 수 있음을 이해한다.


### 데모: 학습 환경 설정


```typescript
// app/settings/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function updateTheme(formData: FormData) {
  const theme = String(formData.get('theme') ?? 'light');
  const cookieStore = await cookies();

  cookieStore.set('theme', theme, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}
```


```typescript
// app/layout.tsx
import { cookies } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value ?? 'light';

  return (
    <html data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
```


### 실무 함정

- `cookies()`는 request-time API다. 이 값을 읽는 위치는 static/dynamic 판단에 영향을 준다.
- cached scope 안에서 request-specific API를 직접 읽는 것은 피하고, 필요한 값은 밖에서 읽어 인자로 넘기는 패턴을 사용한다.
- cookie set/delete는 response header 변경이다. streaming 이후에는 set이 불가능한 경우가 있으므로 mutation boundary에서 처리한다.

---


## 17강. HTTP 300번대와 PRG 패턴


### 한 줄 목표


mutation 후 redirect는 UX 편의가 아니라 중복 제출 방지와 history 정리를 위한 HTTP 패턴임을 이해한다.


### PRG 패턴


```plain text
POST /posts
→ mutate
→ 303 See Other /posts
→ GET /posts
```


효과:


```plain text
- 새로고침 시 POST 재전송 방지
- URL을 canonical page로 정리
- 성공 화면을 GET route로 표현
```


### 강의 포인트


Server Action에서 redirect를 사용하면 mutation 이후 사용자의 route를 제어할 수 있다. 이때 revalidation과 redirect 순서가 중요하다.


```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProposal(formData: FormData) {
  const proposal = await db.proposal.create({
    data: { title: String(formData.get('title') ?? '') },
  });

  revalidatePath('/proposals');
  redirect(`/proposals/${proposal.id}`);
}
```


---


## 18강. redirect() 함수와 NEXT_REDIRECT 제어 흐름


### 한 줄 목표


`redirect()`는 값을 반환하는 함수가 아니라 framework-handled control-flow exception을 던지는 함수임을 이해한다.


### 핵심 규칙


```plain text
try {
  await mutate();
  redirect('/done'); // 나쁜 패턴: catch가 NEXT_REDIRECT를 잡을 수 있음
} catch (e) {
  return { error: 'failed' };
}
```


더 안전한 패턴:


```typescript
'use server';

import { redirect } from 'next/navigation';

export async function submit(formData: FormData) {
  let nextUrl: string | null = null;

  try {
    const result = await mutate(formData);
    nextUrl = `/items/${result.id}`;
  } catch {
    return { status: 'error', message: 'Submit failed' };
  }

  redirect(nextUrl);
}
```


### 강의 포인트

- `redirect()`는 `NEXT_REDIRECT`를 던지고 route segment rendering을 종료한다.
- `return redirect()`가 필요하지 않다.
- expected error는 return state로 처리한다.
- 실제 예외와 redirect control flow를 같은 catch에서 처리하면 버그가 생긴다.

### 미션


“어드민 게이트웨이”를 만든다.


```plain text
- 로그인 안 된 사용자는 /login으로 redirect
- 권한 부족은 expected error로 표시
- mutation 성공 시 /admin/dashboard로 redirect
- try/catch가 NEXT_REDIRECT를 삼키지 않도록 플래그 패턴 사용
```


---


# Section 3. Caching Revolution


## Section 핵심 메시지


Next.js 캐시는 `force-cache` 하나로 설명할 수 없다.


Next.js 16의 Cache Components는 “기본적으로 동적이고, 필요한 부분만 명시적으로 캐시하는” 방향으로 이동했다.


```plain text
이전 사고방식
페이지를 static으로 만들까, dynamic으로 만들까?

새 사고방식
어떤 데이터/컴포넌트/route output을 어떤 수명으로 캐시할까?
어떤 부분은 Suspense/PPR로 request-time에 스트리밍할까?
```


---


## 19강. 웹 렌더링의 딜레마: 데이터 신선도 vs 성능


### 한 줄 목표


성능과 신선도는 trade-off이며, Next.js의 렌더링/캐시 API는 이 trade-off를 명시화하는 도구임을 이해한다.


### 스펙트럼


```plain text
항상 최신
- 매 요청마다 DB/API 호출
- 느리고 비용 큼
- 실시간 대시보드, 개인화 데이터

완전히 정적
- 빌드 또는 캐시 결과 재사용
- 빠르고 저렴
- 문서, 마케팅 페이지, 거의 안 바뀌는 카탈로그

중간 지대
- 일정 시간 캐시
- stale을 먼저 주고 background revalidate
- tag/path로 필요할 때만 invalidation
```


### 수강생 질문


```plain text
상품 가격은 캐시해도 되는가?
상품 상세 설명은?
재고는?
로그인한 사용자의 장바구니는?
```


각 데이터마다 freshness requirement가 다르기 때문에 같은 페이지 안에서도 캐시 정책이 달라져야 한다.


---


## 20강. 무조건적 동적 렌더링과 Opt-in Caching


### 한 줄 목표


Cache Components 환경에서 data fetching은 기본적으로 prerender에서 제외되고, `use cache`로 명시한 부분만 캐시한다는 모델을 이해한다.


### Next.js 16 방향


```plain text
cacheComponents: true
→ request-time data가 기본
→ cache할 route/component/function만 'use cache'로 표시
→ Suspense boundary를 통해 uncached data를 스트리밍
```


### 설정


```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```


### 데모: 동적 데이터


```typescript
export default async function DashboardPage() {
  const metrics = await db.metric.findMany();

  return <Metrics metrics={metrics} />;
}
```


Cache Components가 켜져 있으면 이런 uncached data 접근은 prerender shell과 분리되어 request-time rendering/streaming 대상으로 생각해야 한다.


### 실무 기준


```plain text
개인화 / 권한 / 세션 / 실시간 데이터
→ 기본 dynamic, Suspense로 격리

공용 카탈로그 / 문서 / 통계 snapshot
→ 'use cache' + cacheLife + cacheTag
```


---


## 21강. 시간 기반 캐시 갱신 전략: ISR & SWR


### 한 줄 목표


TTL 기반 revalidation은 “정확히 N초마다 갱신”이 아니라 “stale을 허용하며 재생성 타이밍을 제어하는 전략”임을 이해한다.


### 이전 모델 예시


```typescript
export default async function Page() {
  const res = await fetch('https://api.example.com/rates', {
    next: { revalidate: 10 },
  });

  const rates = await res.json();
  return <Rates rates={rates} />;
}
```


### Cache Components 모델 예시


```typescript
import { cacheLife } from 'next/cache';

export async function getRates() {
  'use cache';
  cacheLife('seconds');

  return db.rates.findMany();
}
```


### SWR 사고방식


```plain text
1. 캐시가 있으면 즉시 stale 데이터 반환
2. 백그라운드에서 fresh 데이터 생성
3. 다음 요청부터 fresh 데이터 사용
```


### 실무 판단


```plain text
환율/주식/재고처럼 시간 민감한 데이터
→ 짧은 TTL 또는 dynamic

블로그/문서/상품 설명
→ 긴 TTL + on-demand invalidation
```


---


## 22강. 매크로 캐싱의 한계와 마이크로 캐싱


### 한 줄 목표


페이지 단위 caching은 복잡한 대시보드에서 너무 거칠며, component/function 단위 cache가 필요한 이유를 이해한다.


### 문제 예시


```plain text
/dashboard
- Header: 사용자별, dynamic
- KPI Summary: 1분마다 갱신
- 공지사항: 하루 단위 캐시
- 실시간 알림: no-store
```


페이지 전체를 static/dynamic으로만 나누면 너무 많은 것을 포기해야 한다.


### 해법


```plain text
- stable shell은 cache
- 느린 공용 데이터는 component/function cache
- 개인화/실시간 데이터는 Suspense boundary로 request-time stream
```


### 도식


```plain text
Page shell             cached
 ├─ MarketingBanner    cached for days
 ├─ KPI Summary        cached for minutes
 ├─ NotificationCount  dynamic
 └─ UserMenu           dynamic/private
```


---


## 23강. use cache 지시어를 활용한 마이크로 캐싱


### 한 줄 목표


`use cache`는 route, component, function의 return value를 cacheable하게 표시하는 directive이며, cache key가 어떻게 만들어지는지 이해한다.


### 기본 예시


```typescript
export async function getProducts(category: string) {
  'use cache';

  return db.product.findMany({ where: { category } });
}
```


### cache key 구성 mental model


```plain text
cache key ≈ build id + function id + serialized arguments + captured closure values
```


### component output cache


```typescript
export async function ProductRail({ category }: { category: string }) {
  'use cache';

  const products = await db.product.findMany({ where: { category } });

  return (
    <section>
      <h2>{category}</h2>
      {products.map((product) => (
        <article key={product.id}>{product.name}</article>
      ))}
    </section>
  );
}
```


### 중요한 제약

- cached scope 안에서 request-time API를 직접 읽지 않는다.
- cookies/headers는 밖에서 읽고 serializable argument로 넘긴다.
- props/arguments가 cache key가 된다.
- 너무 많은 unique argument는 cache explosion을 만든다.

---


## 24강. TTL과 동적 데이터 스트리밍(PPR)


### 한 줄 목표


PPR은 static과 dynamic 중 하나를 고르는 모델이 아니라, 같은 route 안에서 static shell과 dynamic hole을 분리하는 모델임을 이해한다.


### mental model


```plain text
Build time
→ static shell 생성
→ dynamic 부분은 Suspense fallback으로 구멍 처리

Request time
→ shell 즉시 전달
→ dynamic 부분을 렌더하고 stream으로 채움
```


### 예시


```typescript
import { Suspense } from 'react';

export default function ProductPage() {
  return (
    <main>
      <StaticProductHero />
      <Suspense fallback={<StockSkeleton />}>
        <LiveStock />
      </Suspense>
    </main>
  );
}
```


```typescript
async function LiveStock() {
  const stock = await db.stock.findUnique({ where: { sku: 'sku_1' } });
  return <p>남은 재고: {stock.quantity}</p>;
}
```


### 강의 포인트


PPR을 “로딩 스피너가 빠른 기술”로 설명하면 부족하다. 핵심은 route output을 static shell과 request-time dynamic work로 분리해, TTFB/initial paint와 freshness를 동시에 잡는 것이다.


---


## 25강. cacheLife와 완벽한 PPR 아키텍처


### 한 줄 목표


`cacheLife`로 component/function cache의 stale/revalidate/expire profile을 결정하고, PPR shell과 결합한다.


### 예시


```typescript
import { cacheLife } from 'next/cache';

export async function getGlobalPerformance() {
  'use cache';
  cacheLife('minutes');

  return db.analytics.summary();
}
```


```typescript
import { Suspense } from 'react';
import { getGlobalPerformance } from '@/lib/analytics';

async function GlobalPerformanceCard() {
  const data = await getGlobalPerformance();
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function DashboardPage() {
  return (
    <main>
      <h1>Global Performance</h1>
      <Suspense fallback={<p>Loading metrics...</p>}>
        <GlobalPerformanceCard />
      </Suspense>
    </main>
  );
}
```


### profile 선택 기준


```plain text
seconds → 실시간성에 가까운 데이터
minutes → 자주 바뀌는 feed, KPI
hours   → 하루 여러 번 바뀌는 데이터
 days   → 문서/블로그/카탈로그
max     → 거의 변하지 않는 데이터 + on-demand invalidation 중심
```


### 실무 함정

- 너무 짧은 cacheLife는 “캐시가 있지만 사실상 매번 재계산”이 될 수 있다.
- 너무 긴 cacheLife는 mutation 후 stale data UX를 만든다.
- time-based와 on-demand를 함께 설계해야 한다.

---


## 26강. 캐시 무효화라는 CS 난제


### 한 줄 목표


캐시는 저장보다 무효화가 어렵고, Next.js의 revalidation API는 무효화 범위를 표현하는 언어임을 이해한다.


### 세 가지 무효화 축


```plain text
1. Path-based invalidation
   /posts, /products/[id]

2. Tag-based invalidation
   posts, product:123, user:42

3. Time-based invalidation
   10s, minutes, hours, days
```


### 선택 기준


```plain text
path
→ 특정 화면을 다시 렌더해야 한다.

tag
→ 같은 데이터가 여러 화면에 흩어져 있다.

time
→ 약간 stale해도 되고 업데이트 이벤트를 모른다.
```


### 예시


```plain text
상품명이 바뀐다.
영향 화면:
- /products
- /products/[id]
- /categories/[slug]
- /admin/products

path만 쓰면 여러 경로를 모두 알아야 한다.
tag product:123을 쓰면 데이터 기준으로 정밀 타격할 수 있다.
```


---


## 27강. 온디맨드 재검증 1: revalidatePath


### 한 줄 목표


`revalidatePath`가 page/layout/route handler cache에 미치는 영향을 구분한다.


### 기본 예시


```typescript
'use server';

import { revalidatePath } from 'next/cache';

export async function deleteSuggestion(id: string) {
  await db.suggestion.delete({ where: { id } });

  revalidatePath('/suggestions');
}
```


### layout invalidation


```typescript
revalidatePath('/dashboard', 'layout');
```


주의:


```plain text
layout invalidation은 해당 layout 아래의 nested layouts/pages까지 영향을 줄 수 있다.
```


### Route Handler에서 호출하는 경우


```typescript
// app/api/admin/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { path } = await request.json();
  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```


Route Handler에서는 즉시 모든 dynamic segment를 재계산하지 않고, 다음 방문 시점에 revalidation이 일어나는 식으로 이해한다.


---


## 28강. Surrogate Keys와 cacheTag


### 한 줄 목표


CDN의 surrogate key 개념을 Next.js의 `cacheTag`로 연결하고, 데이터 중심 무효화를 설계한다.


### mental model


```plain text
Cache entry A: /products page output
tags: products, product:1, product:2

Cache entry B: /products/1 output
tags: product:1

product:1 변경
→ product:1 tag를 가진 entry만 invalidation
```


### 기본 예시


```typescript
import { cacheLife, cacheTag } from 'next/cache';

export async function getProduct(id: string) {
  'use cache';
  cacheLife('days');
  cacheTag('products', `product:${id}`);

  return db.product.findUnique({ where: { id } });
}
```


### tag 설계 규칙


```plain text
- collection tag: products, posts, reviews
- entity tag: product:123, post:abc
- relation tag: user:42:cart, category:shoes
- 너무 broad한 tag만 쓰면 무효화 폭이 커진다.
- 너무 fine-grained한 tag만 쓰면 invalidation 관리가 어려워진다.
```


---


## 29강. revalidateTag / updateTag 정밀 타격


### 한 줄 목표


`revalidateTag`와 `updateTag`의 consistency 모델 차이를 이해한다.


### 차이


```plain text
revalidateTag(tag, profile)
→ stale-while-revalidate 성격
→ 약간 stale해도 괜찮은 콘텐츠에 적합

updateTag(tag)
→ Server Action 전용
→ read-your-own-writes 필요할 때 적합
→ 사용자가 방금 바꾼 값을 즉시 봐야 하는 인터랙션에 적합
```


### 예시: revalidateTag


```typescript
// app/api/cms/webhook/route.ts
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { postId } = await request.json();

  revalidateTag('posts', 'max');
  revalidateTag(`post:${postId}`, 'max');

  return Response.json({ ok: true });
}
```


### 예시: updateTag


```typescript
// app/posts/actions.ts
'use server';

import { updateTag } from 'next/cache';

export async function updatePost(id: string, formData: FormData) {
  await db.post.update({
    where: { id },
    data: { title: String(formData.get('title') ?? '') },
  });

  updateTag(`post:${id}`);
  updateTag('posts');
}
```


### 실무 판단표



| 상황 | 추천 |
| --- | --- |
| CMS webhook으로 문서 갱신 | `revalidateTag(tag, 'max')` |
| 사용자가 프로필 수정 후 즉시 확인 | `updateTag(userTag)` |
| 특정 화면 하나만 다시 계산 | `revalidatePath(path)` |
| notification count 같은 uncached data만 refresh | Server Action의 `refresh()` |



---


# Section 4. Advanced Routing


## Section 핵심 메시지


고급 라우팅은 “폴더 이름 특수문자 외우기”가 아니다.


URL, browser history, layout state preservation, soft/hard navigation 분기를 설계하는 기술이다.


```plain text
Parallel Routes
→ 한 layout 안에서 여러 slot을 동시에/조건부 렌더링

Intercepting Routes
→ 현재 context를 유지한 채 다른 route segment를 가져와 overlay

History Stack
→ modal open/close, back/forward, deep link UX의 기반
```


---


## 30강. Micro-frontends와 Parallel Rendering


### 한 줄 목표


Parallel Routes를 micro-frontend 흉내가 아니라 화면의 독립 슬롯과 장애 격리 관점에서 이해한다.


### mental model


```plain text
app/dashboard/layout.tsx
  children      → main content
  @analytics    → analytics slot
  @team         → team slot
  @notifications→ notification slot
```


각 slot은 독립 route subtree를 가질 수 있다.


### 왜 필요한가


```plain text
- 대시보드의 여러 영역이 서로 다른 데이터 수명/권한/에러를 가진다.
- 특정 슬롯이 느려도 전체 page를 막지 않게 할 수 있다.
- slot별 loading/error/default를 둘 수 있다.
```


---


## 31강. Parallel Routes 기초와 default.tsx 역할


### 한 줄 목표


`@folder`는 URL segment가 아니라 slot이며, unmatched slot을 처리하기 위해 `default.tsx`가 필요하다는 점을 이해한다.


### 구조


```plain text
app/dashboard/
  layout.tsx
  page.tsx
  @analytics/
    page.tsx
    loading.tsx
    error.tsx
    default.tsx
  @team/
    page.tsx
    default.tsx
```


```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div className="grid">
      <main>{children}</main>
      <aside>{analytics}</aside>
      <section>{team}</section>
    </div>
  );
}
```


### default.tsx


```typescript
// app/dashboard/@analytics/default.tsx
export default function Default() {
  return null;
}
```


### 강의 포인트

- slot folder는 URL path에 나타나지 않는다.
- Next.js 16에서는 parallel route slot의 `default.js/tsx` 요구가 더 엄격해졌다.
- default는 hard reload 또는 unmatched slot 상태에서 fallback 역할을 한다.

---


## 32강. State와 URL의 동기화 딜레마


### 한 줄 목표


모달, 탭, 필터, 선택 항목을 local state에 둘지 URL에 둘지 판단하는 기준을 세운다.


### 판단 기준


```plain text
local state가 적합한 경우
- 새로고침/공유/뒤로 가기 의미가 없음
- 일시적 UI 상태
- hover, accordion open 등

URL state가 적합한 경우
- 공유 가능해야 함
- 새로고침 후 복원되어야 함
- browser back/forward와 연결되어야 함
- 서버 데이터 fetching key가 됨
```


### 예시


```plain text
/products?category=shoes&sort=price
→ URL state 적합

상품 카드 hover 상태
→ local state 적합

/feed에서 photo modal open
→ URL state가 적합하지만 feed context도 유지하고 싶음
→ Intercepting + Parallel Routes
```


---


## 33강. Intercepting Routes 기초


### 한 줄 목표


Intercepting Routes는 현재 layout context 안에서 다른 route를 로드하는 routing override임을 이해한다.


### convention


```plain text
(.)       same level
(..)      one level above
(..)(..)  two levels above
(...)     root app directory 기준
```


### 예시


```plain text
app/
  feed/
    page.tsx
    @modal/
      (..)photo/
        [id]/
          page.tsx
  photo/
    [id]/
      page.tsx
```


feed에서 `/photo/123`으로 client navigation하면:


```plain text
- URL은 /photo/123
- UI는 feed 위에 modal overlay
```


브라우저 주소창에 `/photo/123`을 직접 입력하거나 새로고침하면:


```plain text
- 전체 photo detail page 렌더
- interception 없음
```


---


## 34강. Soft vs Hard Navigation 렌더링 분기


### 한 줄 목표


같은 URL도 “어떻게 도착했는가”에 따라 다른 UI로 보일 수 있음을 이해한다.


### 비교


```plain text
Soft navigation
- Next.js client router가 route transition 수행
- 기존 layout state/context 유지
- intercepting route가 동작할 수 있음
- modal overlay 가능

Hard navigation
- 주소창 직접 입력 / 새로고침
- 서버가 해당 URL을 entrypoint로 렌더
- feed context 없음
- full page 렌더
```


### 수업 데모

1. `/feed`에서 사진 클릭 → `/photo/1` URL + modal
2. 새 탭에서 `/photo/1` 열기 → full page
3. modal 상태에서 새로고침 → full page
4. 뒤로 가기 → `/feed`로 복귀

### 실무 함정

- modal 내부에서 `router.push('/photo/2')`를 할 때 feed context가 유지되는지 확인해야 한다.
- hard reload fallback page가 반드시 존재해야 한다.
- modal close는 단순 `setOpen(false)`가 아니라 history stack과 URL을 같이 고려해야 한다.

---


## 35강. Parallel + Intercepting Routes 모달 아키텍처


### 한 줄 목표


인스타그램 스타일 모달은 Parallel Routes로 slot을 만들고 Intercepting Routes로 route를 overlay하는 조합임을 이해한다.


### 구조


```plain text
app/
  layout.tsx
  feed/
    page.tsx
    @modal/
      default.tsx
      (..)photo/
        [id]/
          page.tsx
  photo/
    [id]/
      page.tsx
```


```typescript
// app/feed/@modal/default.tsx
export default function Default() {
  return null;
}
```


```typescript
// app/feed/@modal/(..)photo/[id]/page.tsx
import { PhotoModal } from '@/app/ui/photo-modal';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PhotoModal id={id} />;
}
```


### close 동작


```typescript
'use client';

import { useRouter } from 'next/navigation';

export function ModalCloseButton() {
  const router = useRouter();
  return <button onClick={() => router.back()}>Close</button>;
}
```


### 왜 router.back인가


모달 open이 history stack에 push되었다면 close는 이전 entry로 돌아가는 것이 가장 자연스럽다.


단, 사용자가 modal URL에 직접 진입한 경우 `router.back()`은 앱 밖으로 나갈 수 있으므로 fallback 전략이 필요하다.


---


## 36강. Browser History Stack의 본질


### 한 줄 목표


브라우저 history stack을 이해해야 모달, 탭, 뒤로 가기, replace/push 전략을 설계할 수 있다.


### 모델


```plain text
초기: /feed
push: /photo/1
push: /photo/2
back: /photo/1
back: /feed
forward: /photo/1
```


### push vs replace


```plain text
push
→ 새 history entry 추가
→ 뒤로 가기로 이전 상태 복원 가능

replace
→ 현재 entry 교체
→ 필터 debounce, 로그인 redirect callback 정리에 적합
```


### 사용 사례


```plain text
검색 필터
- 사용자가 의미 있는 상태를 만들면 push
- 타이핑 중 debounce query는 replace 고려

모달
- card click으로 open하면 push
- close는 back

인증 redirect
- login 성공 후 replace로 login page를 history에서 제거
```


---


## 37강. URL 상태 기반의 우아한 모달 닫기 및 뒤로 가기 제어


### 한 줄 목표


modal close는 UI state 변경이 아니라 navigation intent이며, URL/history/context를 함께 다뤄야 함을 이해한다.


### 문제


```typescript
setModalOpen(false)
```


이 방식은 URL이 `/photo/1`인 상태에서 modal만 사라질 수 있다. 새로고침/공유/뒤로 가기와 불일치가 생긴다.


### 해결 패턴


```typescript
'use client';

import { useRouter } from 'next/navigation';

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div role="dialog" aria-modal="true">
      <button onClick={() => router.back()}>Close</button>
      {children}
    </div>
  );
}
```


### fallback close 전략


```typescript
'use client';

import { useRouter } from 'next/navigation';

export function SafeCloseButton({ fallback = '/feed' }: { fallback?: string }) {
  const router = useRouter();

  function close() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }

  return <button onClick={close}>Close</button>;
}
```


### 주의


`window.history.length`는 완벽한 “이전 entry가 내 앱인지” 판별자가 아니다. 실무에서는 referrer, search param, modal open source, custom history marker 등을 조합해야 할 수 있다.


---


# 18개 심화 미션 설계안


## Mission 1. API 방어선 구축


Route Handler로 외부 요청을 받는 AI Agent registry API를 만든다.


평가:


```plain text
[ ] HTTP method별 handler 분리
[ ] request body 검증
[ ] status code 구분
[ ] unsupported method 확인
[ ] NextResponse.json 사용
```


## Mission 2. 실시간 인스턴스 모니터링


`/api/instances/[id]`와 `/instances/[id]`를 연결한다.


평가:


```plain text
[ ] params async 처리
[ ] query string filter 처리
[ ] no-store/dynamic 데이터 설계
[ ] UI route와 API route의 domain function 공유
```


## Mission 3. 네트워크 엑스레이


동일 Server Component render pass에서 중복 fetch가 어떻게 dedupe되는지 log로 확인한다.


평가:


```plain text
[ ] fetch logging 활성화
[ ] request memoization과 persistent cache 구분
[ ] HIT/MISS/SET 해석
```


## Mission 4. Webhook Bridge


외부 review webhook을 수신하고 관리자 대시보드에 반영한다.


평가:


```plain text
[ ] idempotency key
[ ] signature/header 검증
[ ] 빠른 2xx 응답
[ ] durable queue 필요성 설명
```


## Mission 5. Full CRUD Prompt Repository


Route Handler 기반 CRUD와 Client Component dashboard를 구성한다.


평가:


```plain text
[ ] GET/POST/PATCH/DELETE 분리
[ ] optimistic UI 없이 서버 응답 기반 UI 갱신
[ ] 클라이언트 fetch boundary와 서버 domain boundary 분리
```


## Mission 6. useFormStatus 보안 UI 락킹


중복 제출을 UI에서 막고 서버에서도 unique constraint로 방어한다.


## Mission 7. useActionState 인가 코드 발급


서버가 validation state를 반환하고 client는 별도 useState 없이 렌더링한다.


## Mission 8. Mutation Pipeline


Server Action → DB mutation → revalidatePath → redirect 순서를 구현한다.


## Mission 9. Optimistic Cart


`useOptimistic`으로 장바구니 수량을 즉시 반영하고 실패 시 롤백한다.


## Mission 10. Secure Cookie Control Center


Server Action에서 HttpOnly cookie를 설정하고 layout에서 초기 theme/session을 읽는다.


## Mission 11. Safe Redirection


`NEXT_REDIRECT`가 try/catch에 잡히지 않도록 제어 흐름을 설계한다.


## Mission 12. 통합 기술 제안 포털


Route Handler, Server Action, cookie, redirect, revalidation을 모두 포함한 작은 풀스택 앱을 만든다.


## Mission 13. Opt-in Caching


Cache Components를 켜고 dynamic by default / use cache opt-in 차이를 증명한다.


## Mission 14. Time-based Revalidation


`cacheLife('seconds')` 또는 `fetch(..., { next: { revalidate } })`로 SWR 동작을 관찰한다.


## Mission 15. PPR Hybrid Dashboard


정적 shell + Suspense dynamic hole + cached component를 조합한다.


## Mission 16. revalidatePath Suggestion Box


삭제/수정 후 특정 path만 revalidate한다.


## Mission 17. Surrogate Key Review System


`cacheTag`, `revalidateTag`, `updateTag`를 비교 적용한다.


## Mission 18. Parallel Routes Portal


`@analytics`, `@team`, `@notifications` slot을 만들고 default/error/loading을 분리한다.


## Mission 19. Intercepting Modal Feed


Feed context를 유지하는 modal과 hard reload full page fallback을 모두 구현한다.


---


# 강의 진행용 핵심 비교표


## Route Handler vs Server Action



| 기준 | Route Handler | Server Action |
| --- | --- | --- |
| 주 소비자 | 외부 HTTP client, webhook, 앱 내부 fetch | 같은 Next.js 앱의 form/event mutation |
| 입력 | Request, URL, headers, body | FormData, bound args, serializable args |
| 출력 | Response / JSON / stream / file | mutation 결과 state 또는 updated UI tree |
| HTTP 의미 | 명시적 method/status/header 설계 | 내부적으로 POST 기반 호출 |
| 인증 | handler 내부에서 검증 | action 내부에서 검증 |
| 적합 | Public API, BFF, webhook | UI-local mutation, form submit, revalidation |



## revalidatePath vs revalidateTag vs updateTag vs refresh



| API | 범위 | consistency | 사용 위치 | 적합한 상황 |
| --- | --- | --- | --- | --- |
| `revalidatePath` | route path / layout | path 중심 | Server Function, Route Handler | 특정 화면/경로 무효화 |
| `revalidateTag(tag, profile)` | tagged cache entries | SWR / eventual | Server Function, Route Handler | CMS/webhook, 공개 콘텐츠 갱신 |
| `updateTag` | tagged cache entries | read-your-own-writes | Server Action | 사용자가 방금 수정한 값 즉시 반영 |
| `refresh` | uncached data refresh | cache를 건드리지 않음 | Server Action | notification count 같은 dynamic data refresh |



## useFormStatus vs useActionState vs useOptimistic vs useTransition



| Hook | 해결 문제 | 핵심 포인트 |
| --- | --- | --- |
| `useFormStatus` | form 제출 pending 상태 | parent form 안의 child에서 호출 |
| `useActionState` | action 결과를 state로 연결 | previousState + action payload |
| `useOptimistic` | 네트워크 전 즉시 UI 반영 | action 진행 중 임시 state |
| `useTransition` | non-blocking update | navigation/mutation 중 UI 응답성 유지 |



## Cache Components 사고방식


```plain text
cacheComponents: true

기본값:
- request-time data는 dynamic
- uncached data는 Suspense boundary 안에서 stream
- 명시적으로 cache할 부분만 'use cache'

도구:
- 'use cache'
- cacheLife
- cacheTag
- revalidateTag(tag, profile)
- updateTag
```


---


# 실무 디버깅 체크리스트


## “데이터가 안 바뀐다”


```plain text
[ ] DB mutation이 실제로 성공했는가?
[ ] Server Action 이후 revalidatePath/revalidateTag/updateTag를 호출했는가?
[ ] redirect 전에 revalidation을 호출했는가?
[ ] cacheTag가 cached function/component 안에서 실제로 호출되는가?
[ ] tag 이름이 mutation 쪽과 read 쪽에서 동일한가?
[ ] revalidateTag를 Next.js 16 방식으로 profile과 함께 호출했는가?
[ ] client router cache가 남아 있어 router.refresh가 필요한 상황인가?
```


## “갑자기 dynamic이 됐다”


```plain text
[ ] page/layout에서 cookies(), headers(), searchParams 등을 읽는가?
[ ] cached scope 안에서 request-time API를 직접 읽는가?
[ ] Math.random(), Date.now(), request.url 같은 non-deterministic 값이 있는가?
[ ] DB/API 호출이 use cache 밖에 있는가?
[ ] Suspense boundary가 빠져서 uncached data가 route 전체를 block하는가?
```


## “Server Action이 위험해 보인다”


```plain text
[ ] action 내부에서 auth/session을 다시 확인하는가?
[ ] object ownership을 검증하는가?
[ ] input validation을 서버에서 수행하는가?
[ ] idempotency/unique constraint가 있는가?
[ ] action을 직접 POST로 호출해도 안전한가?
```


## “모달 뒤로 가기가 이상하다”


```plain text
[ ] 모달 open에 push를 썼는가, replace를 썼는가?
[ ] close가 local state 변경이 아니라 navigation으로 처리되는가?
[ ] hard reload fallback page가 존재하는가?
[ ] @modal/default.tsx가 존재하는가?
[ ] intercepting convention이 file-system depth가 아니라 route segment depth 기준임을 확인했는가?
```


---


# 강의용 오프닝 스크립트


```plain text
Next.js를 어느 정도 써본 개발자는 대부분 page.tsx, route.ts, Server Action, revalidatePath를 알고 있습니다.
그런데 실무에서 어려운 문제는 문법을 몰라서가 아닙니다.

왜 어떤 페이지는 캐시되고 어떤 페이지는 매번 렌더링되는가?
왜 DB는 바뀌었는데 UI는 그대로인가?
왜 redirect를 try/catch에 넣으면 이상하게 동작하는가?
왜 모달을 local state로 열면 새로고침과 뒤로 가기에서 망가지는가?

이번 Part 2에서는 바로 그 지점을 다룹니다.
Next.js를 단순한 React 확장 도구가 아니라,
HTTP, RSC, 캐시, 브라우저 히스토리, 서버 mutation을 하나의 시스템으로 조립하는 프레임워크로 보겠습니다.
```


---


# 수료 기준 제안


수강생은 다음 질문에 코드와 함께 답할 수 있어야 한다.


```plain text
1. Route Handler와 Server Action을 어떤 기준으로 나눌 것인가?
2. mutation 이후 stale UI를 어떻게 revalidate할 것인가?
3. revalidatePath, revalidateTag, updateTag의 차이를 설명할 수 있는가?
4. Cache Components가 켜진 상태에서 dynamic data와 cached data를 어떻게 배치할 것인가?
5. PPR에서 static shell과 dynamic hole을 어떻게 나눌 것인가?
6. useFormStatus/useActionState/useOptimistic/useTransition의 역할을 구분할 수 있는가?
7. Intercepting Routes modal이 soft navigation과 hard navigation에서 다르게 보이는 이유를 설명할 수 있는가?
8. browser history stack을 기준으로 modal close를 설계할 수 있는가?
```


---


# 공식 문서 참고 링크

- Next.js 16 release: https://nextjs.org/blog/next-16
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js Mutating Data / Server Functions: https://nextjs.org/docs/app/getting-started/mutating-data
- Next.js Forms with Server Actions: https://nextjs.org/docs/app/guides/forms
- Next.js Caching with Cache Components: https://nextjs.org/docs/app/getting-started/caching
- Next.js `use cache`: https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js `cacheComponents`: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- Next.js `cacheLife`: https://nextjs.org/docs/app/api-reference/functions/cacheLife
- Next.js `cacheTag`: https://nextjs.org/docs/app/api-reference/functions/cacheTag
- Next.js `revalidatePath`: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- Next.js `revalidateTag`: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- Next.js `updateTag`: https://nextjs.org/docs/app/api-reference/functions/updateTag
- Next.js PPR Platform Guide: https://nextjs.org/docs/app/guides/ppr-platform-guide
- Next.js Parallel Routes: https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes
- Next.js Intercepting Routes: https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes
- React `useFormStatus`: https://react.dev/reference/react-dom/hooks/useFormStatus
- React `useActionState`: https://react.dev/reference/react/useActionState
- React `useOptimistic`: https://react.dev/reference/react/useOptimistic
- React `useTransition`: https://react.dev/reference/react/useTransition
