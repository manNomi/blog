---
title: "Relay × React Activity GC 크래시"
pubDate: 2026-01-02T00:00:00.000Z
tags: ["당근마켓"]
pinned: true
notionId: "32f7cf19-a364-8094-b013-ff863acbf713"
---> 당근 부동산에 합류하고 가장 먼저 진행했던 디버깅입니다.
>
> 기존에 React Activity를 도입한 후 프로덕션에서 유저가 크래시를 겪게 되었고, 이를 해결하기 위해 일시적으로 Activity를 사용하지 않도록 설정했었습니다.
>
>
> 메인 피드의 성능을 높이기 위해 Activity를 다시 도입하고자 원인과 결과를 분석했으며, 팀에 공유한 내용을 기록합니다.
>
>

---


## 당부의 메인 페이지 분석


당근부동산의 메인 페이지는 **리스트(List)와*지도(Map) 두 가지 뷰**를 토글 형식으로 전환하는 구조입니다. 문제는 지도 뷰가 초기 렌더에 불필요하게 포함되어 있었다는 점입니다. 사용자가 리스트만 보고 있어도 지도 컴포넌트가 함께 마운트되어 초기 로딩 성능을 저하시키고 있었습니다.


이를 개선하기 위해 **React Activity API를 도입**했습니다. Activity로 감싸면 hidden 상태의 컴포넌트를 렌더 트리에서 제외하면서도, 전환 시 상태를 보존한 채 빠르게 복귀할 수 있습니다. 토글 형식의 뷰 전환에 적합한 해결책이었습니다.


**배포 후 일부 사용자에게서 크래시가 발생했습니다.** 지도 ↔ 리스트 전환 시 앱이 종료되었습니다. 즉시 롤백한 뒤 원인 분석을 시작했습니다.


---


## 유저 flow 분석


Sentry에는 유저가 어떤 flow를 탔는지 영상으로 record해주는 기능이 존재합니다. 그러나 웹뷰의 경우 성능과 메모리상의 이유로 해당 기능을 사용하고 있지 않았고, 유저의 로그를 통해서만 확인할 수 있는 상황이었습니다.


크래시가 발생한 유저들의 대부분은 한 가지 공통점을 가지고 있었습니다.

> 여러 페이지를 방문한 Heavy 유저

여러 페이지를 방문했다면 의심할 수 있는 것은 메모리 이슈와 Relay의 GC가 올바르게 동작하지 않는 문제였습니다.


---


## 그렇다면 무엇이 터졌는가?


웹뷰 메인 페이지에서 **지도(Map) ↔*리스트(List) Activity 전환** 시 발생했던 크래시의 예시 에러 트레이스입니다.


```javascript
TypeError: Cannot destructure property '~~~' of
'~~~~~(...)' as it is undefined.
    at ~~~~~ (~~~~~.tsx:125:1)
```

- `useLazyLoadQuery`로 가져온 데이터가 `undefined`였습니다.
- Activity hidden → visible 복귀 시 발생했습니다.

Relay의 query로 가져온 데이터가 비어 있었고, 당연히 데이터가 있을 것이라고 가정되어 있던 코드에는 가드가 없었기 때문에 크래시가 발생했습니다.


어디서부터 손을 대야 할지 감이 오지 않았습니다. 우선 Store 내부에서 무슨 일이 벌어지는지부터 추적했습니다.


---


## 사전지식 1. Relay Store 내부 구조 학습


Relay는 팀에 합류하면서 처음 사용하게 된 프레임워크였기 때문에, 학습에 다소 시간이 필요했습니다.


분석 과정에서 팀 내에 GC 동작을 공유하면서, Relay Store의 GC 메커니즘을 처음 인지하게 되었습니다.

> • react-relay 훅들은 내부적으로 `retain()` → unmount 시 `dispose()`를 수행합니다.
> • `gcReleaseBufferSize`는 기본값 10이며, unmount된 쿼리 데이터를 임시로 보관합니다.
> • 버퍼 초과 시 가장 오래된 데이터부터 GC됩니다.

트러블슈팅을 따라가려면 Relay Store의 GC 메커니즘을 먼저 알아야 합니다.


![%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2026-04-25_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_10.49.52.png](/images/relay-react-activity-gc-크래시-0.png)


---


### Relay의 Store는 기본적으로 두 가지 핵심 키워드를 이해해야 합니다

1. releaseBuffer는 “최근에 해제된 쿼리 루트(operation id)”를 잠깐 보관하는 캐시입니다.
2. gcScheduler는 “실제 GC 작업을 언제/어떻게 나누어 실행할지”를 담당합니다.

**> releaseBuffer가 왜 필요할까요?**

1. `dispose()`로 refCount가 0이 되자마자 바로 지우면, 화면 왕복(뒤로가기/탭 전환) 시 같은 데이터를 다시 fetch할 가능성이 커집니다.
2. 그래서 Relay는 refCount가 0이 된 루트를 releaseBuffer에 넣어 잠깐 살려둘 수 있습니다.
3. 버퍼 용량을 넘을 때만 오래된 것부터 GC 대상으로 넘깁니다.
4. 기본 버퍼 크기는 10입니다.

**> gcScheduler가 왜 필요할까요?**

1. GC를 즉시 동기로 실행하면 메인 스레드를 오래 점유할 수 있습니다.
2. Relay는 `_collect()`를 제너레이터로 실행하고, root 하나를 마킹할 때마다 `yield`하여 작업을 쪼갭니다.

    → GC를 **중단/재개 가능한 실행 단위**로 만든 형태입니다.

3. gcScheduler가 다음 step을 다시 예약하면서 분할 실행합니다.
4. 이미 GC가 실행 중이면 중복 예약을 막습니다.

**> 둘이 함께 있을 때의 이점입니다.**

1. 네트워크 이점: 바로 다시 보는 데이터는 재사용할 수 있어 re-fetch를 줄입니다.
2. UX 이점: GC를 분할 실행해 프레임 드랍과 버벅임을 줄입니다.
3. 메모리 이점: 무한 보관이 아니라 버퍼 크기와 TTL 기준으로 결국 정리됩니다.

**fetch 후 캐싱 관점입니다.**

1. fetch 결과가 `notify(sourceOperation)`로 들어오면 `fetchTime`이 기록됩니다.
2. 쿼리를 `retain`하지 않았더라도, releaseBuffer에 공간이 있으면 임시 root로 넣어 “짧은 재사용”이 가능합니다.
3. `queryCacheExpirationTime`이 지나면 stale로 판단되고, 이후 dispose/GC 경로에서 더 적극적으로 수거됩니다.

**refCount / dispose 중심 흐름입니다.**

1. `retain(operation)` 호출 시 해당 operation의 `refCount`가 올라갑니다.
2. `dispose()` 호출 시 `refCount`가 내려갑니다. 같은 disposable의 `dispose()`는 한 번만 유효합니다.
3. `refCount > 0`이면 GC 대상이 아닙니다.
4. `refCount == 0`이면 일단 releaseBuffer로 들어가서 잠깐 살아 있습니다.
5. 버퍼가 꽉 차면 가장 오래된 operation을 버퍼에서 빼고 GC를 스케줄합니다.
6. GC는 남아 있는 root(operation)에서 도달 가능한 record만 마킹하고, 나머지를 삭제합니다.
> 같은 쿼리를 2번 `retain`하면 `refCount = 2`가 됩니다.
>
> 한 번 `dispose`하면 `refCount = 1`이므로 삭제되지 않습니다.
>
>
> 두 번째 `dispose`하면 `refCount = 0`이 되지만, 바로 삭제되는 것이 아니라 버퍼로 이동합니다.
>
>
> 이후 다른 쿼리들이 해제되어 버퍼가 넘치면, 오래된 것부터 GC 대상이 됩니다.
>
>

---


## 사전지식 2. React Activity


기본적인 Activity는 아래와 같은 규칙을 따릅니다.

1. Activity는 UI를 **언마운트하지 않고** visible/hidden 상태로 전환하는 경계입니다.
2. API는 `<Activity mode="visible|hidden">`이며, `hidden` prop은 받지 않습니다.
3. 내부적으로는 Activity가 자식을 Offscreen Fiber로 감싸서 동작합니다.
4. `mode="hidden"`일 때는 숨김 트리를 OffscreenLane으로 지연 렌더링 또는 프리렌더링할 수 있습니다.
5. DOM 커밋 시에는 실제로 host 노드에 `display: none` 등을 적용해 화면에서 숨깁니다.
6. 포털 안의 자식도 Activity 숨김 전파 대상입니다.

가장 중요한 점은 `useInsertionEffect`에서의 차이점입니다.

1. Activity의 visible ↔ hidden **가시성 토글 자체만으로는** `useInsertionEffect`를 다시 실행하거나 언마운트/마운트하지 않습니다.
2. 하지만 hidden 상태에서라도 자식이 업데이트되어 프리렌더되면, `useInsertionEffect`는 **cleanup + setup**이 실행될 수 있습니다.
3. 실제 마운트/언마운트 또는 트리 삭제 시에는 당연히 `useInsertionEffect`가 동작합니다.

---


문제를 파고들면서 먼저 확인한 것은, Relay 훅들이 Activity를 **같은 방식으로** 처리하지 않는다는 점이었습니다.


즉 `use~~` 훅이 하나의 공통 규칙으로 동작하는 것이 아니라, 훅마다 hidden/visible 전환을 다르게 해석하고 있었습니다.


핵심 분기점은 `useQueryLoader`의 Activity 호환 실험 경로였습니다.


여기서 핵심은 플래그인 `ENABLE_ACTIVITY_COMPATIBILITY`였습니다.


일반적인 Relay의 fetching 훅들은 대부분 `useEffect` cleanup에서 dispose하는 방식으로 작동합니다.


Relay 팀은 `ENABLE_ACTIVITY_COMPATIBILITY`가 켜지면 `useQueryLoader_EXPERIMENTAL` 경로를 타도록 했고, 여기서 Relay는 “진짜 unmount”를 잡기 위해 `useInsertionEffect` cleanup을 사용하려고 했습니다.


그런데 여기서 바로 막혔습니다. Relay 공식 커밋 메시지에 이미 아래 내용이 명시되어 있었습니다.

1. [59b2a6e8ae21](https://github.com/facebook/relay/commit/59b2a6e8ae211d87e4dd7f7f2ce784896fd15065) (2024-09-12)

    `useQueryLoader()` and `refetch()` compatibility with `<Activity>`


    커밋 본문에 “suspended tree에서 `useInsertionEffect` cleanup이 실행되지 않는 React 버그가 있어, 일반 `useEffect` cleanup에 5분 타이머 fallback을 추가했다”는 설명이 직접 나옵니다.

2. [186c917a0e39](https://github.com/facebook/relay/commit/186c917a0e39c480c663b5707d9ae5b71510cf2d) (2024-09-17)

    Call cleanup of insertion effects when hidden (#30954)


    Relay 저장소에 React 동기화로 들어온 커밋이며, visible → offscreen → removed 경로에서 insertion cleanup이 누락되던 문제를 수정했다고 적혀 있습니다.


    이 커밋은 React 이슈 [#26670](https://github.com/facebook/react/issues/26670), PR [#30954](https://github.com/facebook/react/pull/30954)와 연결됩니다.


즉 정리하면, Relay는 처음부터 `useInsertionEffect`를 “진짜 언마운트 감지”에 쓰고 싶었지만, Suspense/Offscreen 경계에서 cleanup 누락 이슈가 있어서 **타이머 우회 전략**을 함께 넣은 상태였습니다.


---


이 지점에서 디버깅 관점이 선명해졌습니다.

- Activity는 hidden일 때 트리를 “삭제”하지 않고 “오프스크린”으로 다루려 합니다.
- Relay GC는 refCount/retain-dispose 기준으로 “해제 가능한지”를 판단합니다.
- 그런데 cleanup 타이밍이 훅마다 다르고(`useQueryLoader`, `useLazyLoadQueryNode`, `useFragmentInternal`), React의 insertion cleanup 누락 이슈까지 겹치면, hidden/visible 전환 중 Store 수명주기와 컴포넌트 기대 수명주기가 어긋납니다.

결국 이 크래시는 단순히 “GC가 빨라서” 발생한 것이 아니었습니다.

- *Activity(가시성 전환)와 Relay(데이터 해제 타이밍)의 경계가 훅별로 다르게 구현된 상태에서, insertionEffect cleanup 신뢰성 이슈가 겹쳐 발생한 문제였습니다.

[https://github.com/facebook/react/issues/26670](https://github.com/facebook/react/issues/26670)


---


## Store 안에서 벌어진 일


### 3.1 Activity 전환 시 Store 흐름


```javascript
[기본 설정: shouldRetainWithinTTL=false]

Map Activity visible
  → useLazyLoadQuery 렌더 → temporaryRetain() → refCount: 0→1
  → Effect 커밋 → permanentRetain() → refCount: 1→2→1
  → 정상 상태: refCount=1

Map Activity hidden
  → useEffect cleanup 실행
  → permanentRetainDisposable.dispose()
  → refCount: 1→0
  → rootEntryIsStale 판정 (fetchTime + TTL)
    ├─ stale → _roots.delete(MapQueryID) → scheduleGC()
    └─ not stale → _releaseBuffer.push(MapQueryID)
         └─ 버퍼 초과 시 → _roots.delete(oldest) ← 💀 → scheduleGC()
  → _collect() → Map 관련 레코드 전부 삭제

Map Activity visible 복귀
  → 컴포넌트 재사용 시도
  → Store에 데이터 없음 → undefined 반환 → CRASH
```


### 3.2 왜 Suspense가 이걸 못 잡는가?

- Suspense는 **Promise throw**만 catch합니다.
- Relay가 GC된 데이터에 접근하면 `undefined`를 반환합니다. Promise가 아닙니다.
- 따라서 Suspense를 우회하고, 컴포넌트에서 직접 `undefined`에 접근하면서 크래시가 발생합니다.

---


## 5. 딥다이브 — 두 저장소의 생명주기 불일치


### 5.1 캐시와 Store, 각자 다른 TTL


긴급 대응을 하면서 동시에 더 깊이 파고들었습니다. 그리고 **진짜 원인**을 발견했습니다. `gcReleaseBufferSize`문제만이 아니었습니다.


Relay에는 **두 개의 저장소**가 있고, 각각 데이터를 다른 기준으로 만료시킵니다.


```javascript
// QueryResource._cache: useEffect cleanup 시 5분 TTL로 보존
// Store._recordSource: gcReleaseBufferSize 초과 시 즉시 GC

캐시: ████████████████████████████████░░░░  (5분)
Store: ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (버퍼 10개 초과 시)
       │      │
       │      └─ Store GC됨
       └─ 캐시는 아직 있음 → HIT → check() 건너뜀 → CRASH
```


**캐시는 HIT인데 Store는 비어 있는** 모순적 상태가 만들어집니다.
한 레이어만 봐서는 절대 발견할 수 없는 문제였습니다.


### 5.2 React 실행 순서가 만드는 함정


```javascript
A unmount + B mount 시: [B render] → [A cleanup] → [B setup]
// render가 cleanup보다 먼저 실행된다!
```


**프로덕션 크래시 시나리오(Map ↔ List)입니다.**

1. Map visible → MapQuery retain (`refCount=1`)
2. List로 전환(Map hidden) → dispose → `refCount=0` → 버퍼 추가
3. List에서 11개 이상 쿼리 실행 → 버퍼 초과 → MapQuery의 `_roots` 삭제 → Store GC
4. Map으로 빠른 복귀 → **캐시 HIT** + **Store 비어 있음** → CRASH

### 5.3 useLazyLoadQueryNode의 3개 Effect


```javascript
// Effect 1 (deps=[])
useEffect(() => {
  return () => { maybeHiddenOrFastRefresh.current = true; };
}, []);

// Effect 2 (deps=[environment, cacheIdentifier])
useEffect(() => {
  if (maybeHiddenOrFastRefresh.current === true) {
    forceUpdate(n => n + 1); // Activity re-show → 재렌더
    return;
  }
  const disposable = QueryResource.retain(preparedResult);
  return () => disposable.dispose(); // unmount 시 GC 대상
}, [environment, cacheIdentifier]);
```


`maybeHiddenOrFastRefresh` 패턴으로 Activity hidden을 감지하려 하지만, **실패하는 조건**이 있습니다.


```javascript
느린 전환: cleanup → flag=true → visible → Effect 2 감지 → forceUpdate ✅
빠른 전환: cleanup 실행 전 visible → flag=false → GC된 데이터 접근 → CRASH
```


---


## 6. 근본 해결 (1) — Store 레이어: shouldRetainWithinTTL


Hook별 Activity 호환 전략을 체계적으로 분석하면서 **`shouldRetainWithinTTL_EXPERIMENTAL`****의 중요성**을 발견했습니다.


### 6.1 기본 GC vs. TTL 모드


```javascript
// shouldRetainWithinTTL=false (기본) → 크래시 발생
dispose() → refCount=0 → _releaseBuffer.push()
  → 버퍼 초과 or stale → _roots.delete() → GC → 데이터 삭제

// shouldRetainWithinTTL=true → 크래시 방지 가능
dispose() → refCount=0 → _releaseBuffer.push() → _roots 유지!
  → GC 실행돼도 TTL 내면 mark → 보존
```



| 설정 | dispose() 시 _roots | GC 시 동작 | Activity 복귀 시 |
| --- | --- | --- | --- |
| `shouldRetainWithinTTL=false` | **삭제** (버퍼*경유) | 레코드 삭제 | 데이터 없음 → 크래시 |
| `shouldRetainWithinTTL=true` | **유지** | TTL 내면 mark → 보존 | ✅ 데이터 있음 → 즉시 렌더 |



### 6.2 TTL 모드의 3가지 변경점


**변경점 1: dispose 시** **`_roots`****를 삭제하지 않습니다.**


```javascript
if (rootEntryIsStale) {
  if (!this._shouldRetainWithinTTL_EXPERIMENTAL) {
    this._roots.delete(id);  // false일 때만 삭제
  }
  this.scheduleGC();
}
```


→ `refCount=0`이어도 `_roots`에 entry가 살아 있어 GC 시 mark 가능합니다.


**변경점 2: GC 시 TTL 기반으로 수집 여부를 판단합니다.**


```javascript
// _collect() 내부
const recordHasExpired =
  fetchTime == null ||
  fetchTime <= Date.now() - _queryCacheExpirationTime;

const recordShouldBeCollected =
  recordHasExpired && refCount === 0 && !inReleaseBuffer;
```


→ TTL 이내면 mark됩니다. 즉, GC에서 살아남습니다.


**변경점 3:** **`_roots`** **삭제가 사실상 no-op입니다.**


```javascript
// _collect() sweep phase 내부
const storeIDs = this._recordSource.getRecordIDs();
for (const dataID of storeIDs) {       // ← recordSource의 record ID!
  if (!references.has(dataID)) {
    this._recordSource.remove(dataID);
    if (this._shouldRetainWithinTTL_EXPERIMENTAL) {
      this._roots.delete(dataID);      // ← record ID로 삭제 시도
    }
  }
}
```


**주의:** `_roots`는 **operation request identifier**로 키잉되어 있고, sweep phase의 `dataID`는 **store record ID**입니다. 예를 들어 `"client:root"`, `"4"` 등이 이에 해당합니다. 이 두 네임스페이스는 **완전히 다르므로**`this._roots.delete(dataID)`는 **실질적으로 항상 no-op**입니다.


결론적으로 `shouldRetainWithinTTL=true`일 때, `_roots` 엔트리는 `dispose()`에서도 삭제되지 않고 GC에서도 삭제되지 않아 **사실상 영구 보존**됩니다. entry 자체가 가볍기 때문에 의도된 설계로 보입니다.


### 6.3 시나리오별 비교



| 시나리오 | hidden 전환 | visible 복귀 | 결과 |
| --- | --- | --- | --- |
| **기본 (둘 다 false)** | dispose → _roots 삭제 → GC → 데이터 삭제 | store 비어 있음 → Suspense → refetch | 매번 refetch, 빠른 전환 시 크래시 |
| **TTL=true, expiration=null** | dispose → _roots*유지 → GC 실행 안 함 | store 데이터 항상 존재 → 즉시 렌더링 | 메모리 해제 안 됨 |
| **TTL=true, expiration=5분** | dispose → _roots*유지 → GC 실행돼도 TTL 내 mark | TTL 내: 즉시 렌더 / TTL 초과: refetch | **Activity 최적 설정** |
| **TTL=false, buffer=200** | dispose → buffer에 push (200개*여유) | buffer에 있는 동안 정상 사용 | 임시방편 (버퍼 초과 시 여전히 문제) |



### 6.4 fetchTime === null 함정


**`fetchTime`** **설정에는 2가지 분기가 있습니다.**


```javascript
// RelayModernStore.notify() — 분기 1: 기존 entry
const rootEntry = this._roots.get(id);
if (rootEntry != null) {
  rootEntry.fetchTime = Date.now();
}
// 분기 2: entry 없을 때 임시 생성 (쿼리 + 버퍼 여유 시)
else if (operationKind === 'query' &&
         gcReleaseBufferSize > 0 &&
         releaseBuffer.length < gcReleaseBufferSize) {
  this._roots.set(id, {
    operation, refCount: 0, epoch, fetchTime: Date.now()
  });
  this._releaseBuffer.push(id);
}
```


→ retain 없이 fetch만 한 쿼리도 버퍼 여유가 있으면 **임시 root entry가 생성**되어 TTL 보호를 받을 수 있습니다.


**`fetchTime === null`****의 동작이 dispose()와 _collect()에서_정반대입니다.**

- **dispose()**: `fetchTime != null` 조건 → null이면 `rootEntryIsStale = false` → **버퍼에 push됩니다. 삭제되지 않습니다.**
- **_collect()**: `fetchTime == null` 조건 → null이면 `recordHasExpired = true` → **GC 대상, 즉 만료로 취급됩니다.**

이 불일치 때문에 `gcReleaseBufferSize=0`이면 dispose → 즉시 버퍼 overflow → scheduleGC → `_collect()`에서 `fetchTime=null`을 만료로 취급 → **TTL 모드에서도 데이터가 삭제됩니다.** 따라서 `gcReleaseBufferSize ≥ 1`을 유지해야 합니다.


---


## 7. 근본 해결 (2) — 훅 레이어: ENABLE_ACTIVITY_COMPATIBILITY


Store 레이어만으로는 부족합니다. 훅 레이어에서도 Activity를 인식해야 합니다.


### 7.1 두 레이어의 역할 분담


```javascript
ENABLE_ACTIVITY_COMPATIBILITY (훅 레이어)
  → Activity hidden을 실제 unmount로 처리하지 않음
  → useEffect cleanup → 5분 타이머 시작 (즉시 dispose 대신)

shouldRetainWithinTTL_EXPERIMENTAL (Store 레이어)
  → refCount=0이어도 TTL 기반으로 데이터 보존
  → 두 설정이 함께 작동해야 Activity 전체 동작 완성
```


### 7.2 useInsertionEffect를 쓸 수 없는 이유


이상적인 설계라면 아래와 같아야 했습니다.


```javascript
// 이상적 전략:
useInsertionEffect cleanup → 진짜 unmount에서만 dispose
useEffect cleanup → Activity hidden에서도 실행 → 타이머 기반 지연 dispose
// → 두 훅의 cleanup 타이밍 차이를 이용해 Activity hidden vs. 진짜 unmount를 구별
```


**그러나 React에 미해결 버그가 있습니다.** [React #26670](https://github.com/facebook/react/issues/26670)은 Suspense boundary가 fallback으로 전환될 때 `useInsertionEffect`의 cleanup 함수가 호출되지 않는 문제입니다. 이 버그 때문에 다음과 같은 문제가 발생합니다.

- Suspense fallback 전환 시 `useInsertionEffect` cleanup이 **아예 누락**됩니다.
- retain/dispose 카운팅이 틀어질 수 있습니다.
- `useInsertionEffect`를 “진짜 unmount 감지용”으로 **신뢰할 수 없습니다.**

결국 Relay 팀은 `useInsertionEffect` 기반 전략을 완성하지 못했고, `useEffect` cleanup + `maybeHiddenOrFastRefresh` 같은 **우회적 패턴**에 머물러 있는 상태입니다.


### 7.3 ENABLE_ACTIVITY_COMPATIBILITY 플래그 히스토리



| 버전 | 날짜 | 변경 |
| --- | --- | --- |
| **v18.0.0** | 2024.08.30 | `ENABLE_USE_FRAGMENT_EXPERIMENTAL: false` 최초 도입 |
| **v18.1.0** | 2024.09.11 | 이름 변경 → `ENABLE_ACTIVITY_COMPATIBILITY` |
| **main** | 2025.09.03 | 기본값 `true`로 변경 (**npm 미배포**) |



우리가 쓰는 npm 버전에서는 이 플래그가 `false`입니다. DefinitelyTyped 타입에도 미반영되어 있어 `as any` 캐스팅이 필요합니다.


### 7.4 Relay 팀은 왜 이 문제를 완전히 해결하지 못했는가



| Option | 시도 | 실패 이유 |
| --- | --- | --- |
| handleMissedUpdates | GC 변경 감지 | GC는 epoch를 업데이트하지 않아 감지 불가 |
| GC 시 epoch 업데이트 | 모든 subscriber 알림 | 수천 개 record 삭제 시 re-render 폭풍 |
| useInsertionEffect cleanup | 진짜 unmount만 감지 | React #26670 — Suspense 전환 시 cleanup 누락 |
| Activity 전용 로직 | re-attach 감지 | React internals 접근 불가 |


> 플래그 이름이 본질을 말해줍니다.
>
> _"Temporary flag to experiment to enable compatibility"_
>
>

---


## 8. 최종 적용 설정


### Store + 훅 레이어 통합 설정


```javascript
// Store 레이어
const store = new Store(new RecordSource(), {
  shouldRetainWithinTTL_EXPERIMENTAL: true,
  queryCacheExpirationTime: 5 * 60 * 1000, // 5분
  gcReleaseBufferSize: 10, // 기본값 유지 권장 (0이면 fetchTime===null 시 TTL 보호 실패)
});

// 훅 레이어
RelayFeatureFlags.ENABLE_ACTIVITY_COMPATIBILITY = true;
```


### 설정 조합 가이드



| 옵션 | 타입 | 기본값 | 역할 |
| --- | --- | --- | --- |
| `shouldRetainWithinTTL_EXPERIMENTAL` | boolean | false | refCount=0 시 _roots 즉시 삭제 방지, TTL 기반 GC로 전환 |
| `queryCacheExpirationTime` | ?number (ms) | null | TTL 만료 기준. null이면 무한 TTL (GC 실행 안 함) |
| `gcReleaseBufferSize` | number | 10 | refCount=0 항목 임시 보관 버퍼 크기 |
| `gcScheduler` | (run) => void | resolveImmediate | GC 실행 스케줄러 |



---


## 9. 회고 — 왜 이 문제가 어려웠는가


### 아키텍처 충돌이라는 본질


이것은 단순 버그가 아니었습니다. **두 라이브러리의 설계 철학이 정면으로 충돌**한 문제였습니다.

- **Relay**: “unmount된 컴포넌트의 데이터는 GC해도 된다”
- **React Activity**: “hidden된 컴포넌트는 unmount가 아니다. 다시 보여줄 수 있다”

이 두 가정이 양립할 수 없었기 때문에 Relay 팀도 완전한 해결책을 내지 못했고, 실험적 플래그로만 대응한 상태입니다. 여기에 React 자체의 `useInsertionEffect` 버그(#26670)까지 겹치면서, 훅 레이어에서의 깔끔한 해결도 막혀버렸습니다.


### 두 저장소의 생명주기 불일치


`QueryResource._cache`와 `Store._recordSource`가 각자 다른 기준으로 데이터를 관리하면서, **캐시는 HIT인데 Store는 비어 있는** 모순적 상태가 만들어졌습니다. 한 레이어만 봐서는 절대 발견할 수 없는 문제였습니다.


### 소스코드를 읽어야만 이해할 수 있는 문제


공식 문서에는 `gcReleaseBufferSize`와 `ENABLE_ACTIVITY_COMPATIBILITY`의 상호작용이 설명되어 있지 않습니다. `RelayModernStore.js`의 `_collect()`, `__gc()`, `retain()`, `release()` 코드를 직접 읽고 흐름을 추적해야만 전체 그림이 보였습니다.


### 재현 조건의 까다로움

- “빠른 전환”이어야 발생합니다. cleanup 실행 전 visible 복귀가 필요합니다.
- 11개 이상 쿼리가 실행되어 버퍼가 초과되어야 합니다.
- 특정 화면 조합에서만 발생합니다.

이 조건들이 동시에 충족되어야 크래시가 발생하므로, 단순 QA로는 재현이 어려웠습니다.


### 결국 배운 것


프레임워크 간 경계에서 발생하는 문제는 어느 한쪽의 문서만 읽어서는 답이 나오지 않습니다. **양쪽의 소스코드를 열어서 실행 흐름을 직접 추적하는 것**만이 유일한 해결 경로였습니다. 그리고 그 과정에서 React 쪽의 미해결 이슈(`useInsertionEffect` cleanup 누락)까지 발견하게 되면서, 이 문제가 단순히 “우리 코드의 버그”가 아니라 **생태계 차원의 호환성 과제**임을 확인할 수 있었습니다.
