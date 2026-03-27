---
title: "Relay × React Activity GC 크래시"
pubDate: 2026-01-02T00:00:00.000Z
pinned: true
notionId: "32f7cf19-a364-8094-b013-ff863acbf713"
---> Relay Store의 GC가 React Activity의 "hidden은 unmount가 아니다"라는 전제를 무시하면 어떤 일이 벌어지는지 살펴봐요. 프로덕션 크래시 발견부터 Relay 내부 코드 디버깅, 그리고 Store·훅 두 레이어의 해결책 도출까지의 기록이에요.

---


## 이 글의 동기


웹뷰 메인 페이지는 **리스트(List)와 지도(Map) 두 가지 뷰**를 토글 형식으로 전환하는 구조예요. 문제는 지도 뷰가 초기 렌더에 불필요하게 포함되어 있었다는 점이에요. 사용자가 리스트만 보고 있어도 지도 컴포넌트가 함께 마운트되어 초기 로딩 성능을 잡아먹고 있었어요.


이를 개선하기 위해 **React Activity API를 도입**했어요. Activity로 감싸면 hidden 상태의 컴포넌트를 렌더 트리에서 제외하면서도, 전환 시 상태를 보존한 채 빠르게 복귀할 수 있어요. 토글 형식의 뷰 전환에 딱 맞는 해결책이었어요.


**배포 후 일부 사용자에게서 크래시가 발생했어요.** 지도 ↔ 리스트 전환 시 앱이 죽었어요. 즉시 롤백하고, 원인 분석을 시작했어요.


분석 과정에서 팀 내에 GC 동작을 공유하면서, Relay Store의 GC 메커니즘을 처음 인지하게 되었어요.


**이때 알게 된 것들:**

- react-relay 훅들은 내부적으로 `retain()` → unmount 시 `dispose()` 수행
- `gcReleaseBufferSize`(기본 10)로 unmount된 쿼리 데이터를 임시 보관
- 버퍼 초과 시 가장 오래된 데이터부터 GC

그런데 같은 시기, facebook/relay main 브랜치에 중요한 커밋 2개가 머지됐어요:

- **`3b167d7f`**: `ENABLE_ACTIVITY_COMPATIBILITY: true` 기본 활성화
- **`a0680e86`**: useFragment Activity edge case 수정

**그러나** 이 변경은 npm 배포 버전(v20.1.1)에 **포함되지 않았어요.** 이것이 나중에 큰 문제가 돼요.


---


## 1. 사전 지식 — Relay Store 내부 구조


트러블슈팅을 따라가려면 Relay Store의 GC 메커니즘을 먼저 알아야 해요.


### 1.1 Store 핵심 필드


```javascript
// RelayModernStore.js
_roots: Map<string, {
  operation: OperationDescriptor,
  refCount: number,     // 이 쿼리를 retain 중인 컴포넌트 수
  epoch: ?number,       // 마지막 store write epoch
  fetchTime: ?number,   // 마지막 fetch 시각 (Date.now())
}>

_releaseBuffer: Array<string>   // refCount=0이지만 아직 GC 안 된 쿼리 ID
_gcReleaseBufferSize: number    // 기본값 10
```


### 1.2 GC 3단계 흐름


```javascript
[retain] → refCount++ → _roots에 entry 생성
[dispose] → refCount-- → 0이 되면 _releaseBuffer에 push
[_collect] → _roots에 없는 레코드 전부 삭제 (Mark-and-Sweep)
```


핵심: **`refCount=0`** **+** **`_releaseBuffer`** **초과 →** **`_roots.delete()`** **→ GC → Store 데이터 삭제**


---


## 2. 프로덕션 크래시 — 무엇이 터졌는가


웹뷰 메인 페이지에서 **지도(Map) ↔ 리스트(List) Activity 전환** 시 크래시가 발생했어요.


```javascript
TypeError: Cannot destructure property '~~~' of
'~~~~~(...)' as it is undefined.
    at ~~~~~ (~~~~~.tsx:125:1)
```


**증상:**

- `useLazyLoadQuery`로 가져온 데이터가 `undefined`
- Activity hidden → visible 복귀 시 발생
- `usePaginationFragment`에서도 unmount 경고 동반

어디서부터 손을 대야 할지 감이 안 왔어요. 일단 Store 내부에서 무슨 일이 벌어지는지부터 추적했어요.


---


## 3. 원인 추적 — Store 안에서 벌어진 일


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
  → Store에 데이터 없음 → undefined 반환 → 💥 CRASH
```


### 3.2 왜 Suspense가 이걸 못 잡는가?

- Suspense는 **Promise throw**만 catch해요
- Relay가 GC된 데이터에 접근하면 `undefined`를 반환해요 (Promise가 아니에요)
- → Suspense 우회 → 컴포넌트에서 직접 `undefined` 접근 → 크래시

이걸 파악하고 나서야 비로소 문제의 전체 구조가 보이기 시작했어요. **Relay는 "hidden = unmount"로 간주하고 GC를 돌리는데, React Activity는 "hidden ≠ unmount"를 전제해요.** 두 가정이 정면으로 충돌하고 있었어요.


---


## 4. 긴급 대응 — 프로덕션 크래시 막기


원인 규명과 병행해서, 프로덕션 크래시를 즉시 막기 위한 조치를 먼저 적용했어요.


| 방법                              | 효과                  | 한계             |
| ------------------------------- | ------------------- | -------------- |
| `gcReleaseBufferSize: 10 → 200` | GC 빈도 대폭 감소         | 버퍼 초과 시 여전히 문제 |
| Null Safety (optional chaining) | 크래시 100% 방지         | 데이터 누락은 그대로    |
| 200ms 지연 로드                     | Activity 전환 완료 후 쿼리 | UX 약간의 지연      |


크래시는 멈췄어요. 하지만 이건 임시방편이에요. 버퍼 200개가 초과되면 같은 문제가 다시 터져요. **근본 원인을 해결해야 했어요.**


---


## 5. 딥다이브 — 두 저장소의 생명주기 불일치


### 5.1 캐시와 Store, 각자 다른 TTL


긴급 대응을 하면서 동시에 더 깊이 파고들었어요. 그리고 **진짜 원인**을 발견했어요 — `gcReleaseBufferSize` 문제만이 아니었어요.


Relay에는 **두 개의 저장소**가 있고, 각각 데이터를 다른 기준으로 만료시켜요:


```javascript
// QueryResource._cache: useEffect cleanup 시 5분 TTL로 보존
// Store._recordSource: gcReleaseBufferSize 초과 시 즉시 GC

캐시: ████████████████████████████████░░░░  (5분)
Store: ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (버퍼 10개 초과 시)
       │      │
       │      └─ Store GC됨
       └─ 캐시는 아직 있음 → HIT → check() 건너뜀 → 💥
```


**캐시는 HIT인데 Store는 비어있는** 모순적 상태가 만들어져요. 한 레이어만 봐서는 절대 발견할 수 없는 문제였어요.


### 5.2 React 실행 순서가 만드는 함정


```javascript
A unmount + B mount 시: [B render] → [A cleanup] → [B setup]
// render가 cleanup보다 먼저 실행된다!
```


**프로덕션 크래시 시나리오 (Map ↔ List):**

1. Map visible → MapQuery retain (refCount=1)
2. List로 전환 (Map hidden) → dispose → refCount=0 → 버퍼 추가
3. List에서 11개+ 쿼리 실행 → 버퍼 초과 → MapQuery의 `_roots` 삭제 → Store GC
4. Map으로 빠른 복귀 → **캐시 HIT** + **Store 비어있음** → 💥 CRASH

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


`maybeHiddenOrFastRefresh` 패턴으로 Activity hidden을 감지하려 하지만, **실패하는 조건**이 있어요:


```javascript
느린 전환: cleanup → flag=true → visible → Effect 2 감지 → forceUpdate ✅
빠른 전환: cleanup 실행 전 visible → flag=false → GC된 데이터 접근 → 💥
```


---


## 6. 근본 해결 (1) — Store 레이어: shouldRetainWithinTTL


Hook별 Activity 호환 전략을 체계적으로 분석하면서 **`shouldRetainWithinTTL_EXPERIMENTAL`****의 중요성**을 발견했어요.


### 6.1 기본 GC vs. TTL 모드


```javascript
// shouldRetainWithinTTL=false (기본) → 크래시 발생
dispose() → refCount=0 → _releaseBuffer.push()
  → 버퍼 초과 or stale → _roots.delete() → GC → 데이터 삭제

// shouldRetainWithinTTL=true → 크래시 방지 가능
dispose() → refCount=0 → _releaseBuffer.push() → _roots 유지!
  → GC 실행돼도 TTL 내면 mark → 보존
```


| 설정                            | dispose() 시 _roots | GC 시 동작          | Activity 복귀 시    |
| ----------------------------- | ------------------ | ---------------- | ---------------- |
| `shouldRetainWithinTTL=false` | **삭제** (버퍼 경유)     | 레코드 삭제           | 💥 데이터 없음 → 크래시  |
| `shouldRetainWithinTTL=true`  | **유지**             | TTL 내면 mark → 보존 | ✅ 데이터 있음 → 즉시 렌더 |


### 6.2 TTL 모드의 3가지 변경점


**변경점 1: dispose 시** **`_roots`** **삭제하지 않음**


```javascript
if (rootEntryIsStale) {
  if (!this._shouldRetainWithinTTL_EXPERIMENTAL) {
    this._roots.delete(id);  // false일 때만 삭제
  }
  this.scheduleGC();
}
```


→ refCount=0이어도 `_roots`에 entry가 살아있어 GC 시 mark 가능해요


**변경점 2: GC 시 TTL 기반 수집 판정**


```javascript
// _collect() 내부
const recordHasExpired =
  fetchTime == null ||
  fetchTime <= Date.now() - _queryCacheExpirationTime;

const recordShouldBeCollected =
  recordHasExpired && refCount === 0 && !inReleaseBuffer;
```


→ TTL 이내면 mark돼요 → GC에서 살아남아요


**변경점 3:** **`_roots`** **삭제가 사실상 no-op**


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


> 🔴 **주의:** `_roots`는 **operation request identifier**로 키잉되어 있고, sweep phase의 `dataID`는 **store record ID** (예: `"client:root"`, `"4"`)예요. 이 두 네임스페이스는 **완전히 다르므로** `this._roots.delete(dataID)`는 **실질적으로 항상 no-op**이에요.  
> 결론: `shouldRetainWithinTTL=true`일 때, `_roots` 엔트리는 dispose()에서도 삭제되지 않고 GC에서도 삭제되지 않아 **사실상 영구 보존**돼요. entry 자체가 가볍기 때문에 의도된 설계로 보여요.


### 6.3 시나리오별 비교


| 시나리오                          | hidden 전환                                | visible 복귀                      | 결과                        |
| ----------------------------- | ---------------------------------------- | ------------------------------- | ------------------------- |
| **기본 (둘 다 false)**            | dispose → _roots 삭제 → GC → 데이터 삭제        | store 비어있음 → Suspense → refetch | ❌ 매번 refetch, 빠른 전환 시 크래시 |
| **TTL=true, expiration=null** | dispose → _roots 유지 → GC 실행 안 함          | store 데이터 항상 존재 → 즉시 렌더링        | ⚠️ 메모리 해제 안 됨             |
| **TTL=true, expiration=5분**   | dispose → _roots 유지 → GC 실행돼도 TTL 내 mark | TTL 내: 즉시 렌더 / TTL 초과: refetch  | ✅ **Activity 최적 설정**      |
| **TTL=false, buffer=200**     | dispose → buffer에 push (200개 여유)         | buffer에 있는 동안 정상 사용             | ⚠️ 임시방편 (버퍼 초과 시 여전히 문제)  |


### 6.4 fetchTime === null 함정


> ⚠️ **`fetchTime`** **설정에는 2가지 분기가 있어요:**  
> ```javascript  
> // RelayModernStore.notify() — 분기 1: 기존 entry  
> const rootEntry = this._roots.get(id);  
> if (rootEntry != null) {  
>   rootEntry.fetchTime = Date.now();  
> }  
> // 분기 2: entry 없을 때 임시 생성 (쿼리 + 버퍼 여유 시)  
> else if (operationKind === 'query' &&  
>          gcReleaseBufferSize > 0 &&  
>          releaseBuffer.length < gcReleaseBufferSize) {  
>   this._roots.set(id, {  
>     operation, refCount: 0, epoch, fetchTime: Date.now()  
>   });  
>   this._releaseBuffer.push(id);  
> }  
> ```  
>   
> → retain 없이 fetch만 한 쿼리도 버퍼 여유가 있으면 **임시 root entry가 생성**되어 TTL 보호를 받을 수 있어요.


> 🔴 **`fetchTime === null`****의 동작이 dispose()와 _collect()에서 정반대예요:**  
> - **dispose()**: `fetchTime != null` 조건 → null이면 `rootEntryIsStale = false` → **버퍼에 push (삭제 아님)**  
>   
> - **_collect()**: `fetchTime == null` 조건 → null이면 `recordHasExpired = true` → **GC 대상 (만료 취급)**  
>   
> 이 불일치 때문에 `gcReleaseBufferSize=0`이면 dispose → 즉시 버퍼 overflow → scheduleGC → `_collect()`에서 fetchTime=null을 만료 취급 → **TTL 모드에서도 데이터 삭제!** 따라서 `gcReleaseBufferSize ≥ 1`을 유지해야 해요.


---


## 7. 근본 해결 (2) — 훅 레이어: ENABLE_ACTIVITY_COMPATIBILITY


Store 레이어만으로는 부족해요. 훅 레이어에서도 Activity를 인식해야 해요.


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


이상적인 설계라면 이랬어야 해요:


```javascript
// 이상적 전략:
useInsertionEffect cleanup → 진짜 unmount에서만 dispose
useEffect cleanup → Activity hidden에서도 실행 → 타이머 기반 지연 dispose
// → 두 훅의 cleanup 타이밍 차이를 이용해 Activity hidden vs. 진짜 unmount를 구별
```


**그러나 React에 미해결 버그가 있어요.** [React #26670](https://github.com/facebook/react/issues/26670) — Suspense boundary가 fallback으로 전환될 때 `useInsertionEffect`의 cleanup 함수가 호출되지 않는 문제예요. 이 버그 때문에:

- Suspense fallback 전환 시 `useInsertionEffect` cleanup이 **아예 누락**
- retain/dispose 카운팅이 틀어질 수 있어요
- `useInsertionEffect`를 "진짜 unmount 감지용"으로 **신뢰할 수 없어요**

결국 Relay 팀은 `useInsertionEffect` 기반 전략을 완성하지 못했고, `useEffect` cleanup + `maybeHiddenOrFastRefresh` 같은 **우회적 패턴**에 머물러 있는 상태예요.


### 7.3 ENABLE_ACTIVITY_COMPATIBILITY 플래그 히스토리


| 버전          | 날짜         | 변경                                              |
| ----------- | ---------- | ----------------------------------------------- |
| **v18.0.0** | 2024.08.30 | `ENABLE_USE_FRAGMENT_EXPERIMENTAL: false` 최초 도입 |
| **v18.1.0** | 2024.09.11 | 이름 변경 → `ENABLE_ACTIVITY_COMPATIBILITY`         |
| **main**    | 2025.09.03 | 기본값 `true`로 변경 (**npm 미배포**)                    |


우리가 쓰는 npm 버전에서는 이 플래그가 `false`예요. DefinitelyTyped 타입에도 미반영이라 `as any` 캐스팅이 필요해요.


### 7.4 Relay 팀은 왜 이 문제를 완전히 해결하지 못했는가


| Option                     | 시도               | 실패 이유                                   |
| -------------------------- | ---------------- | --------------------------------------- |
| handleMissedUpdates        | GC 변경 감지         | GC는 epoch를 업데이트하지 않아 감지 불가              |
| GC 시 epoch 업데이트            | 모든 subscriber 알림 | 수천 개 record 삭제 시 re-render 폭풍           |
| useInsertionEffect cleanup | 진짜 unmount만 감지   | React #26670 — Suspense 전환 시 cleanup 누락 |
| Activity 전용 로직             | re-attach 감지     | React internals 접근 불가                   |

> 플래그 이름이 본질을 말해줘요: _"Temporary flag to experiment to enable compatibility"_

---


## 8. 24개 테스트 매트릭스로 검증하다


`Activity-crash-matrix-test.js` 24개 테스트로 모든 설정 조합 × 시나리오를 검증했어요:


| **#** | **시나리오**                    | **GC** | **데이터** | **이유**                             |
| ----- | --------------------------- | ------ | ------- | ---------------------------------- |
| 1–6   | Activity hide (모든 설정 조합)    | ❌      | ✅       | useEffect cleanup 미실행 → dispose 없음 |
| 7–8   | Unmount + gcBuffer=0        | ✅      | ❌       | refCount=0 → 즉시 GC                 |
| 9–10  | Unmount + gcBuffer=10       | ❌      | ✅       | 버퍼에 보관                             |
| 11–14 | Unmount + TTL=true, TTL 내   | ✅      | ✅       | GC 실행되나 TTL이 삭제 막음                 |
| 15–18 | Unmount + TTL=true, TTL 초과  | ✅      | ❌       | TTL 만료 → 삭제                        |
| 19–20 | Unmount + TTL=false (긴 TTL) | ✅      | ❌       | 플래그 false → TTL 무시                 |
| 21–22 | Activity hide + COMPAT=true | ❌      | ✅       | cleanup 미실행 → 5분 타이머 시작 안 됨        |
| 23–24 | Suspense 중 unmount          | ✅      | ❌       | permanentRetain 미호출 → 즉시 GC        |


**핵심 발견:**

> `React.unstable_Activity mode="hidden"`은 이 실험적 React 버전에서 `useEffect` cleanup을 **즉시 트리거하지 않아요.** 따라서 Activity hide 만으로는 GC가 발생하지 않으며, **실제 GC는 완전한 unmount에서만 발생해요.**

---


## 9. 최종 적용 설정


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


| 옵션                                   | 타입            | 기본값              | 역할                                          |
| ------------------------------------ | ------------- | ---------------- | ------------------------------------------- |
| `shouldRetainWithinTTL_EXPERIMENTAL` | boolean       | false            | refCount=0 시 _roots 즉시 삭제 방지, TTL 기반 GC로 전환 |
| `queryCacheExpirationTime`           | ?number (ms)  | null             | TTL 만료 기준. null이면 무한 TTL (GC 실행 안 함)        |
| `gcReleaseBufferSize`                | number        | 10               | refCount=0 항목 임시 보관 버퍼 크기                   |
| `gcScheduler`                        | (run) => void | resolveImmediate | GC 실행 스케줄러                                  |


---


## 10. 회고 — 왜 이 문제가 어려웠는가


### 아키텍처 충돌이라는 본질


이건 단순 버그가 아니었어요. **두 라이브러리의 설계 철학이 정면으로 충돌**한 문제였어요.

- **Relay**: "unmount된 컴포넌트의 데이터는 GC해도 된다"
- **React Activity**: "hidden된 컴포넌트는 unmount가 아니다, 다시 보여줄 수 있다"

이 두 가정이 양립할 수 없어서 Relay 팀도 완전한 해결책을 내지 못했고, 실험적 플래그로만 대응한 상태예요. 거기에 React 자체의 `useInsertionEffect` 버그(#26670)까지 겹치면서, 훅 레이어에서의 깔끔한 해결도 막혀버렸어요.


### 두 저장소의 생명주기 불일치


`QueryResource._cache`와 `Store._recordSource`가 각자 다른 기준으로 데이터를 관리하면서, **캐시는 HIT인데 Store는 비어있는** 모순적 상태가 만들어졌어요. 한 레이어만 봐서는 절대 발견할 수 없는 문제였어요.


### 소스코드를 읽어야만 이해할 수 있는 문제


공식 문서에는 `gcReleaseBufferSize`와 `ENABLE_ACTIVITY_COMPATIBILITY`의 상호작용이 설명되어 있지 않아요. `RelayModernStore.js`의 `_collect()`, `__gc()`, `retain()`, `release()` 코드를 직접 읽고 흐름을 추적해야만 전체 그림이 보였어요.


### 재현 조건의 까다로움

- "빠른 전환"이어야 발생 (cleanup 실행 전 visible 복귀)
- 11개+ 쿼리가 실행되어 버퍼가 초과되어야 해요
- 특정 화면 조합에서만 발생해요

이 조건들이 동시에 충족되어야 크래시가 발생하므로, 단순 QA로는 재현이 어려웠어요.


### 결국 배운 것


프레임워크 간 경계에서 발생하는 문제는 어느 한쪽의 문서만 읽어서는 답이 나오지 않아요. **양쪽의 소스코드를 열어서 실행 흐름을 직접 추적하는 것**만이 유일한 해결 경로였어요. 그리고 그 과정에서 React 쪽의 미해결 이슈(`useInsertionEffect` cleanup 누락)까지 발견하게 되면서, 이 문제가 단순히 "우리 코드의 버그"가 아니라 **생태계 차원의 호환성 과제**임을 확인할 수 있었어요.

