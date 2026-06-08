---
title: "i18nexus는 i18next보다 빠른가? 질문을 조금 바꿔야 한다"
pubDate: 2026-05-30T00:00:00.000Z
notionId: "3747cf19-a364-801f-98e6-ff38fc411177"
---
국제화 라이브러리를 비교할 때 가장 먼저 떠오르는 질문은 보통 이렇다.


> "i18nexus가 i18next보다 빠른가?"


하지만 이 질문은 조금 거칠다. i18next는 오랫동안 검증된 범용 i18n 엔진이고,


plural, context, fallback language chain, interpolation, nesting,


post-processing 같은 기능을 런타임에서 폭넓게 처리한다.


i18nexus의 방향은 다르다. i18nexus는 "모든 i18n 문제를 런타임에서 해결하는


거대한 엔진"이라기보다, React 애플리케이션에서 자주 쓰는 번역 흐름을 core와


tools가 함께 관리하도록 만든 얇은 런타임에 가깝다.


그래서 더 정확한 질문은 이것이다.


> "React 앱에서 단순하고 타입 안전한 namespace lookup을 반복할 때,


> i18nexus는 어떤 성능 특성을 가지며, tools와 core의 결합은 어떤 안정성을


> 만들어내는가?"


## 결론부터


i18nexus의 강점은 hot path다. 컴포넌트가 렌더 중 `t("key")`를 반복해서


호출하는 순간, i18nexus는 이미 만들어진 translation snapshot에서 단순 객체


lookup을 수행한다.


반대로 i18next는 `t()` 호출 시점에 namespace, fallback, interpolation,


pluralization, context, post-processing 등 더 많은 런타임 기능을 처리할 수


있는 구조다. 이 범용성은 강점이지만, 단순 lookup만 놓고 보면 비용이 더 크다.


다만 i18nexus가 모든 면에서 항상 빠르다는 뜻은 아니다. i18nexus는 language나


namespace data가 바뀔 때 fallback namespace와 requested namespace를 합쳐


render snapshot을 만든다. namespace가 아주 크면 이 snapshot 생성 비용이


눈에 띌 수 있다.


요약하면 다음과 같다.

- i18nexus는 반복적인 `t()` 호출 hot path에서 매우 가볍다.
- i18next는 더 많은 i18n 기능을 런타임에 처리하는 범용 엔진이다.
- i18nexus는 snapshot 생성 시점에 비용을 먼저 내고, 이후 lookup을 싸게 만든다.
- 큰 namespace를 자주 바꾸는 앱에서는 i18nexus도 namespace 크기 관리가 필요하다.
- i18nexus의 진짜 차별점은 "빠른 lookup"만이 아니라 tools와 core가 같은

계약을 공유한다는 점이다.


시니어 관점에서 이 글의 핵심은 "우리가 이겼다"가 아니라 "어떤 비용을 어디로


옮겼는가"다. i18nexus는 런타임 기능 폭을 줄이고, source extraction과 generated


types, namespace loading 계약을 앞으로 당겨서 hot path를 단순하게 만든다. 이


trade-off를 이해해야 성능 수치도 정직하게 읽을 수 있다.


## 테스트 방법


현재 워크스페이스 기준으로 작은 Node microbenchmark를 추가했다.


```plain text
node scripts/benchmark-i18n-performance.mjs
```


비교 대상은 다음과 같다.

- i18nexus core의 `translateFromSnapshot()`
- i18next의 `getFixedT("en", "home")`로 만든 fixed `t`
- 단순 key lookup
- interpolation 포함 lookup
- React render 중 snapshot/bound function을 새로 준비하는 비용

측정 환경은 다음과 같다.

- Node.js: `v22.20.0`
- i18next: `23.16.8`
- react-i18next: `13.5.0`
- 언어: `en`, `ko`
- namespace: `common`, `home`
- fallback namespace: `common`

주의할 점도 있다. 이 테스트는 브라우저 React Profiler가 아니라 Node


microbenchmark다. 따라서 "절대적인 제품 성능"이 아니라 "런타임 함수 호출


경로의 상대적 비용"을 보기 위한 테스트로 읽어야 한다.


또 하나 중요하다. 아래 표는 단순 승패표가 아니다.

- `i18nexus t simple lookup`과 `i18next fixedT simple lookup`은 실제 `t()` 호출

hot path 비용을 비교한다.

- `i18nexus resolve snapshot per render`와 `i18next getFixedT per render`는

같은 일을 비교하는 항목이 아니다. i18nexus snapshot 생성은 fallback/requested


namespace를 병합해 lookup map을 만드는 작업이고, i18next `getFixedT()`는


language/namespace가 고정된 함수를 준비하는 작업에 가깝다.

- 따라서 render-path 항목은 "i18nexus가 느리다"는 결론이 아니라, i18nexus가

`t()` 호출 비용을 줄이기 위해 snapshot 생성 시점에 어떤 비용을 지불하는지


보여주는 항목이다.


## 결과 1: namespace당 1,000개 key


```plain text
i18nexus t simple lookup                        12,359,628 ops/sec         80.91 ns/op
i18next fixedT simple lookup                    686,125.27 ops/sec      1,457.46 ns/op
i18nexus t interpolation                      4,906,347.03 ops/sec        203.82 ns/op
i18next fixedT interpolation                    512,282.34 ops/sec      1,952.05 ns/op
i18nexus resolve snapshot per render              1,479.38 ops/sec    675,960.58 ns/op
i18next getFixedT per render                143,626,570.92 ops/sec          6.96 ns/op
```


단순 lookup에서는 i18nexus가 훨씬 가볍다. 이유는 간단하다.


```plain text
snapshot[key] || key
```


거의 이 수준의 경로로 끝난다. interpolation도 `{{name}}` 형태의 단순 치환만


수행하므로 i18next의 범용 interpolation pipeline보다 가볍다.


하지만 snapshot 생성 비용은 반대다. i18nexus는 fallback namespace와 requested


namespace를 합쳐 하나의 lookup snapshot을 만든다. namespace당 1,000개 key가


있으면 이 병합 비용이 크게 보인다.


이것은 i18nexus의 약점이자 의도된 trade-off다.

- i18nexus: render snapshot을 만들 때 한 번 비용을 내고, 이후 `t()`를 싸게 호출한다.
- i18next: `getFixedT()` 자체는 매우 싸지만, 실제 `t()` 호출에서 더 많은 런타임

resolution을 수행한다.


따라서 이 결과를 제품 문구로 바꿀 때는 조심해야 한다.


```plain text
나쁜 문장: i18nexus는 i18next보다 18배 빠르다.
좋은 문장: 단순 namespace lookup hot path에서는 i18nexus의 snapshot 기반 t()가
          i18next fixedT보다 훨씬 적은 호출 비용을 보였다.
```


## 결과 2: namespace당 100개 key


```plain text
i18nexus t simple lookup                     23,665,138.29 ops/sec         42.26 ns/op
i18next fixedT simple lookup                    669,113.75 ops/sec      1,494.51 ns/op
i18nexus t interpolation                       5,251,094.2 ops/sec        190.44 ns/op
i18next fixedT interpolation                    685,108.96 ops/sec      1,459.62 ns/op
i18nexus resolve snapshot per render             26,486.97 ops/sec     37,754.41 ns/op
i18next getFixedT per render                141,877,378.22 ops/sec          7.05 ns/op
```


namespace 크기가 100개 수준이면 snapshot 생성 비용도 훨씬 작아진다. 실제 앱에서


namespace를 페이지/도메인 단위로 잘게 유지한다면 i18nexus의 trade-off가 더


유리해진다.


여기서 중요한 방향성이 나온다.


> i18nexus는 "큰 전역 번역 파일 하나"보다 "작은 namespace 여러 개"에서 더


> 자연스럽다.


이 방향은 tools가 namespace 기반으로 key를 추출하고, core가 lazy namespace


loading을 처리하는 구조와도 잘 맞는다.


## 왜 hot path가 빠른가


i18nexus의 React hook은 `t()` 자체를 reactive primitive로 만들지 않는다.


언어 변경이나 namespace load가 발생하면 Provider context가 바뀌고, React


컴포넌트가 다시 렌더된다. 렌더 중 hook은 현재 language와 namespace data로


translation snapshot을 만든다.


그 후 `t()`는 이 snapshot을 닫아둔 함수다.


```plain text
language / namespace change
        ↓
Provider context update
        ↓
React rerender
        ↓
useTranslation() resolves snapshot
        ↓
t(key) does cheap lookup from snapshot
```


이 구조의 장점은 명확하다.

- `t()` 호출마다 namespace fallback 계산을 반복하지 않는다.
- `t()` 호출마다 전체 resource tree를 탐색하지 않는다.
- React render snapshot 단위로 동작하므로 디버깅하기 쉽다.
- `useMemo` / `useCallback`으로 같은 snapshot에서는 `t` identity를 안정적으로

유지할 수 있다.


대신 snapshot을 새로 만들어야 하는 순간에는 비용이 든다.

- language 변경
- namespace lazy load 완료
- fallback namespace 변경
- provider translation data 변경

따라서 i18nexus의 성능 전략은 "모든 순간을 평균적으로 처리"하는 것이 아니라,


"렌더 중 반복 호출되는 hot path를 최대한 단순하게 만든다"에 가깝다.


## i18next와의 차이


i18next는 더 넓은 문제를 푼다.

- namespace parsing
- fallback language chain
- plural
- context
- interpolation
- nesting
- postProcess
- missing key handling
- plugin ecosystem

이 기능들은 제품에 따라 필수일 수 있다. 예를 들어 복잡한 plural rule, 다양한


post processor, 장기간 축적된 i18next plugin이 필요한 팀이라면 i18next의


범용성이 더 큰 장점이다.


i18nexus는 이와 다른 포지션을 잡는다.

- React 앱에서 자주 쓰는 namespace/key lookup을 단순하게 유지한다.
- TypeScript key inference를 제품의 핵심 경험으로 둔다.
- tools가 source code에서 key를 추출하고, core가 같은 namespace 계약으로

런타임을 처리한다.

- lazy loading과 fallback namespace를 core의 Provider 흐름에 직접 연결한다.

즉 i18nexus는 "i18next보다 기능이 많은 i18n 엔진"이 아니라, "React 코드베이스에


번역 workflow를 강하게 결합한 i18n toolkit"에 가깝다.


## core와 tools의 결합이 만드는 견고함


i18nexus에서 더 중요한 차별점은 core와 tools가 같은 계약을 본다는 점이다.


일반적인 i18n 도입에서는 이런 일이 자주 생긴다.

- 코드에서는 `useTranslation("home")`을 쓴다.
- locale 파일은 `common.json`에 섞여 있다.
- key는 문자열이라 오타가 나도 컴파일에서 잡히지 않는다.
- namespace 파일은 동적으로 로드되지만, 어떤 namespace가 존재하는지 타입은 모른다.
- fallback namespace 정책은 문서에는 있지만 runtime과 generated file이 따로 논다.

i18nexus가 줄이려는 위험은 바로 이 간극이다.


tools는 source code를 읽어 key와 namespace를 추출한다. 그리고 locale 파일과


type definition, runtime entrypoint를 생성할 수 있다. core는 같은 namespace,


fallbackNamespace, loadNamespace 계약을 Provider와 hook에서 사용한다.


이 결합이 만들어내는 안정성은 다음과 같다.

- `useTranslation("home")`이 실제 `home` namespace load로 이어진다.
- generated type은 `"home"` namespace의 key를 좁혀준다.
- fallback namespace key는 타입과 런타임 양쪽에서 같은 의미를 가진다.
- lazy mode에서는 필요한 namespace를 자동으로 요청한다.
- in-flight guard가 같은 namespace의 중복 load를 막는다.
- namespace load 실패 후에도 빈 namespace로 graceful하게 수렴해 무한 retry를 피한다.
- tools가 만든 파일 구조와 core가 읽는 구조가 일치한다.

이것은 단순한 DX 개선이 아니다. 대규모 코드베이스에서 i18n 버그는 대부분


"번역 함수가 느려서"보다 "계약이 어긋나서" 발생한다.


```plain text
source code key
  ↕
generated type
  ↕
locale namespace file
  ↕
runtime loadNamespace
  ↕
React useTranslation(namespace)
```


i18nexus는 이 다섯 레이어를 하나의 workflow로 묶으려 한다.


좀 더 실무적으로 보면 core-tools 결합은 다음 실패 모드를 줄인다.



| 실패 모드 | 일반적인 증상 | i18nexus가 두는 가드레일 |
| --- | --- | --- |
| key 오타 | 배포 후 화면에 key 문자열 노출 | generated key type, namespace별 key inference |
| namespace/file 구조 불일치 | lazy import 실패, fallback만 노출 | tools가 namespace 파일 구조와 runtime entrypoint 생성 |
| fallback 정책 불일치 | 타입은 통과하지만 런타임에서 key 누락 | fallbackNamespace를 type/runtime 양쪽 계약으로 사용 |
| 중복 namespace 요청 | 같은 namespace를 여러 컴포넌트가 중복 로드 | Provider의 in-flight namespace guard |
| 생성물과 core API의 version skew | generated index가 type-check 실패 | core/tools compatibility test로 잡아야 하는 영역 |
| Google Sheets/CSV 컬럼 순서 불일치 | `en`, `ko` 번역값 뒤섞임 | 헤더 기반 언어 컬럼 매핑과 roundtrip test 필요 |
| 서버/클라이언트 namespace 계약 불일치 | Server Component와 Client Component 번역 차이 | `i18nexus/server`와 client entrypoint의 namespace 공유 |
|   |   |   |



이 표에서 중요한 것은 마지막 두 줄이다. i18nexus의 결합성은 공짜가 아니다. 결합된


만큼 compatibility test가 부족하면 실패도 더 크게 느껴진다. 그래서 core와 tools는


따로 잘 동작하는 것보다, 함께 생성하고 함께 type-check되는 fixture가 훨씬 중요하다.


## 성능보다 더 중요한 견고함


실제 사용자가 느끼는 안정성은 보통 다음 질문에서 갈린다.

- 이 key가 존재하는지 IDE가 알려주는가?
- 이 namespace가 lazy load될 때 중복 요청이 나는가?
- 언어를 바꿨을 때 이미 로드한 namespace가 모든 언어에 대해 준비되어 있는가?
- fallback namespace가 타입과 런타임에서 같은 방식으로 병합되는가?
- generated 파일의 import path가 실제 output path와 일치하는가?
- CSV나 Google Sheets roundtrip에서 언어 컬럼이 뒤섞이지 않는가?

i18nexus의 core-tools 결합은 이 질문들에 답하기 위한 구조다. 성능 최적화는 그


위에 얹힌 장점이다.


다르게 말하면, i18nexus의 판매 포인트는 이렇게 잡는 편이 안전하다.


> "i18nexus는 단순 lookup hot path가 빠른 React i18n runtime이다. 하지만 더


> 중요한 장점은 core와 tools가 같은 namespace/type/loading 계약을 공유해서,


> 번역 workflow 전체가 덜 흔들리도록 만든다는 점이다."


이 문장은 다소 덜 화려하지만 더 오래 간다. 시니어 엔지니어는 보통 "빠르다"보다


"어떤 조건에서 빠르고, 어떤 실패를 줄이며, 어떤 trade-off를 감수하는가"를 본다.


i18nexus는 이 질문에 답할 수 있어야 한다.


## 약점도 분명하다


i18nexus가 더 보강해야 할 부분도 있다.


첫째, i18next만큼의 범용 i18n 기능을 제공하지 않는다. pluralization, context,


post-processing, nesting 같은 고급 기능이 중요한 제품에서는 i18next가 더 안정적일


수 있다.


둘째, snapshot 생성 비용은 namespace 크기에 비례한다. namespace 하나에 수천 개


key를 몰아넣고 자주 언어를 바꾸는 앱이라면 비용이 커질 수 있다. i18nexus는 작은


namespace와 lazy loading을 전제로 사용할 때 더 자연스럽다.


셋째, tools와 core의 결합은 장점이지만 version skew에는 취약할 수 있다. tools가


생성한 타입과 core가 기대하는 Provider API가 어긋나면 오히려 혼란이 생긴다.


따라서 core/tools는 함께 검증되는 compatibility test가 계속 필요하다.


넷째, 이 글의 benchmark는 Node microbenchmark다. 실제 브라우저, React 렌더링,


Next.js App Router, dynamic import waterfall, bundle size까지 포함한 end-to-end


측정은 별도로 해야 한다.


## 앞으로의 성능 방향


i18nexus가 성능과 안정성을 모두 가져가려면 다음 방향이 좋다.

1. namespace를 작게 유지하는 것을 문서와 tools 기본값으로 유도한다.
2. snapshot merge 비용을 줄이기 위해 namespace/language별 memo cache를 검토한다.
3. lazy namespace load 후 모든 configured language를 로드하는 정책을 유지하되,

큰 앱에서는 language별 lazy loading 옵션도 검토한다.

1. core/tools compatibility fixture를 CI에 추가해 generated entrypoint가 실제

core type과 항상 컴파일되게 한다.

1. Node microbenchmark뿐 아니라 React Profiler 기반 benchmark를 추가한다.
2. bundle size와 cold start를 i18next/react-i18next와 같이 비교한다.

## 마무리


i18nexus는 i18next를 단순히 대체하려는 라이브러리라기보다, 다른 선택지를 제안하는


라이브러리다.


i18next는 강력한 범용 i18n 엔진이다. 기능 폭과 생태계가 넓다.


i18nexus는 React 코드베이스에서 번역 key, namespace, generated type, lazy load,


fallback policy를 하나의 workflow로 묶는다. 그 결과 hot path는 단순해지고,


tools와 core가 같은 계약을 공유하면서 실무에서 자주 생기는 i18n 불일치를 줄인다.


따라서 i18nexus를 설명할 때 가장 좋은 문장은 이것에 가깝다.


> "i18nexus는 가장 많은 i18n 기능을 가진 런타임이 아니라, React 앱에서 번역


> workflow를 타입과 도구로 단단히 묶고, 렌더 중 반복되는 lookup을 매우 가볍게


> 만드는 toolkit이다."


참고


[https://oliveyoung.tech/2025-07-22/what-is-MFE-part1/?keyword=마이크로](https://oliveyoung.tech/2025-07-22/what-is-MFE-part1/?keyword=%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C)


[https://oliveyoung.tech/2025-11-06/what-is-MFE-part2/](https://oliveyoung.tech/2025-11-06/what-is-MFE-part2/)


[https://oliveyoung.tech/2025-11-10/what-is-MFE-part3/?keyword=마이크로](https://oliveyoung.tech/2025-11-10/what-is-MFE-part3/?keyword=%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C)
