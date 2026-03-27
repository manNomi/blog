---
title: "overlay-kit 의 의도인가 버그인가 ? "
pubDate: 2026-03-13T00:00:00.000Z
notionId: "32f7cf19-a364-804d-a9af-c1708e29d149"
---> 선언적 오버레이 라이브러리(overlay-kit)를 SPA 프레임워크(Activity 기반) 환경에 도입하면서 발견한 아키텍처 충돌과 해결 과정이에요.
> React Portal의 이벤트 버블링 원리, 클로저 스냅샷 문제, 그리고 전체 마이그레이션 기록을 다루고 있어요.

### 🔗 관련 링크

- [overlay-kit Issue #221](https://github.com/toss/overlay-kit/issues/221)
- [overlay-kit PR #220](https://github.com/toss/overlay-kit/pull/220)

---


## 1. 배경 — 왜 overlay-kit인가?


기존에 오버레이(바텀시트, 다이얼로그 등)를 열기 위해 직접 `useState`로 `open` 상태를 관리하는 방식에는 문제가 있었어요.

- `useState` + `onClose` 등 **보일러플레이트 코드가 반복**돼요
- SPA 프레임워크의 Connected Push 사용 시 **애니메이션 타이밍 우회**를 위해 `await delay(250)` 같은 핵이 필요했어요
- 디자인 시스템 v3의 바텀시트·다이얼로그가 `open` 상태를 **외부에서 주입받는 Controlled 패턴**으로 바뀌면서, 선언적 오버레이 관리 도구와의 궁합이 더 좋아졌어요

overlay-kit은 이러한 문제를 깔끔하게 해결해요:


```javascript
import { overlay } from 'overlay-kit';

const result = await overlay.openAsync(({ isOpen, close, unmount }) => (
  <Dialog
    open={isOpen}
    onConfirm={() => close(true)}
    onClose={() => close(false)}
    onExit={unmount}
  />
));
// result: true 또는 false
```


---


## 2. 사전 지식 — React Portal과 이벤트 버블링


overlay-kit의 동작을 이해하려면 React Portal의 핵심 원리를 먼저 알아야 해요.


### 2.1 DOM 트리 vs React 트리


Portal로 렌더링된 컴포넌트는 **물리적으로는** 지정된 DOM 노드(예: `body` 아래 `#modal-root`)로 이동하지만, **논리적으로는** React 트리에서 부모 컴포넌트의 자식으로 유지돼요.


```html
<!-- DOM 구조: #app-root와 #modal-root는 형제(sibling) -->
<div id="app-root"></div>
<div id="modal-root"></div>
```


```javascript
// React 코드
<Parent>
  <Modal>   {/* Portal로 #modal-root에 렌더링 */}
    <Child />
  </Modal>
</Parent>
```


이 경우:

- **DOM 관점**: `Parent`는 `#app-root`에, `Modal`은 `#modal-root`에 존재하며 서로 형제 관계예요
- **React 관점**: `Parent` → `Modal` → `Child`의 부모-자식 관계가 유지돼요

### 2.2 이벤트 버블링 방향


React의 Synthetic Event(합성 이벤트)는 **실제 DOM 위치와 무관하게 React 컴포넌트 계층을 따라 버블링**돼요. Portal 내부의 `Child`를 클릭하면 DOM상으로는 형제인 `Parent`의 `onClick` 핸들러가 실행돼요.


| 측면                   | DOM 트리          | React 트리           |
| -------------------- | --------------- | ------------------ |
| **Portal 위치**        | body 아래로 물리적 이동 | 부모 컴포넌트 아래 논리적 유지  |
| **Synthetic Events** | DOM 구조를 따르지 않아요 | React 계층을 따라 버블링돼요 |
| **Context 접근**       | 영향 없어요          | 정상 작동해요            |
| **State 공유**         | React 트리로 전달돼요  | 정상 전달돼요            |
| **Native Events**    | 버블링 안 돼요        | 버블링 안 돼요           |


> ⚠️ **주의: 네이티브 이벤트는 달라요.** `form`의 `onSubmit`처럼 브라우저 네이티브 이벤트는 React 합성 이벤트가 아니기 때문에, Portal 내부의 버튼이 Portal 외부의 form에 제출 이벤트를 버블링시키지 않아요.


---


## 3. 🔴 핵심 충돌 — 이벤트 버스 × Activity 동시 유지


overlay-kit은 모듈 전역 이벤트 버스(mitt) 기반으로 동작해요. 문제는 SPA 프레임워크가 **Activity 전환 시 이전 Activity와 현재 Activity를 동시에 DOM에 유지**한다는 점이에요.


### 충돌 시나리오


```javascript
// Activity A (hidden) + Activity B (visible) 동시 DOM 유지

// Activity A 내부: OverlayProvider → mitt 이벤트 구독
// Activity B 내부: OverlayProvider → 동일한 mitt 이벤트 구독

overlay.open(...)  // mitt.emit('open', ...)
// → Activity A의 OverlayProvider도 수신 → 오버레이 1개
// → Activity B의 OverlayProvider도 수신 → 오버레이 1개
// 💥 결과: overlay.open() 1회 호출에 오버레이 2개 열림!
```


### 원인 분석


overlay-kit의 설계는 **하나의 React 앱에 하나의 OverlayProvider**를 가정해요. 그러나 SPA 프레임워크의 Activity 모델에서는:

1. 각 Activity가 독립적인 React 서브트리로 렌더링돼요
2. Activity 전환 시 이전 Activity는 hidden 상태로 DOM에 남아있어요
3. 두 Activity 모두 동일한 모듈 전역 이벤트 버스를 구독 중이에요

이는 **"전역 싱글톤 이벤트 버스 + 멀티 컨텍스트 렌더링"**의 구조적 충돌이에요.


### 해결: Activity별 독립 Overlay Context


overlay-kit이 제공하는 실험적 API인 `experimental_createOverlayContext()`를 활용하여, **각 Activity에 독립된 overlay context를 생성**함으로써 이벤트 버스 충돌을 제거했어요.


```javascript
// ❌ 기존: 모듈 전역 이벤트 버스 공유
import { overlay } from 'overlay-kit';
// → 모든 Activity가 같은 이벤트를 수신

// ✅ 해결: experimental_createOverlayContext()로 Activity별 독립 context 생성
import { experimental_createOverlayContext } from 'overlay-kit';

const ActivityOverlayWrapper = ({ children }) => {
  const [overlayContext] = useState(() => experimental_createOverlayContext());
  return (
    <ActivityOverlayContext.Provider value={overlayContext}>
      <overlayContext.OverlayProvider>{children}</overlayContext.OverlayProvider>
    </ActivityOverlayContext.Provider>
  );
};
// → 각 Activity가 독립된 이벤트 버스 인스턴스를 가짐
// → hidden Activity는 현재 Activity의 이벤트를 수신하지 않음
```


---


## 4. 클로저 스냅샷 문제


overlay-kit 도입 시 가장 흔한 실수는 **클로저 캡처**예요.


### Context vs 클로저의 차이

- **Context**: React 트리를 통해 동적으로 구독되므로 항상 최신 값이에요
- **클로저**: `overlay.open()` 호출 시점에 콜백 함수의 외부 변수가 스냅샷으로 캡처돼요

```javascript
// ❌ 클로저 문제 — data는 호출 시점의 값으로 고정
const [data, setData] = useState(initialData);

overlay.open(({ isOpen, close }) => (
  <BottomSheet open={isOpen} onOpenChange={() => close()}>
    <Content data={data} />  {/* data가 변경되어도 반영 안 돼요 */}
  </BottomSheet>
));
```


```javascript
// ✅ Context는 정상 동작 — React 트리를 통해 구독
overlay.open(({ isOpen, close }) => (
  <BottomSheet open={isOpen} onOpenChange={() => close()}>
    <ContextAwareContent />  {/* useContext 값은 항상 최신이에요 */}
  </BottomSheet>
));
```


### 해결 방법


**1.** **`useRef`****로 참조 최신화**


클로저에 캡처된 값이 stale해지는 것을 방지하기 위해, 동적으로 변하는 데이터는 `useRef`에 저장하고 오버레이 콜백 내부에서 `ref.current`로 접근해요.


**2. Context를 통한 접근**


React Context는 트리를 통해 구독되므로 항상 최신 값을 받을 수 있어요. 오버레이 내부에서 필요한 데이터를 Context로 접근하면 클로저 스냅샷 문제를 우회할 수 있어요.


**3. overlay-kit을 사용하지 않고 직접 호출**


위 방법으로도 해결이 어려운 경우, 기존 방식으로 오버레이를 직접 제어해요.


```javascript
// ✅ 직접 상태 관리 — 동적 props가 필요한 경우
const [open, setOpen] = useState(false);

<BottomSheetRoot open={open} onOpenChange={setOpen}>
  <BottomSheetTrigger asChild>{children}</BottomSheetTrigger>
  <Portal>
    <BottomSheetContent>
      <Content data={dynamicData} />  {/* 항상 최신이에요 */}
    </BottomSheetContent>
  </Portal>
</BottomSheetRoot>
```


---


## 5. close vs unmount — 생명주기 이해


overlay-kit에서 또 하나 주의할 점은 `close`와 `unmount`의 차이예요.


| 함수        | 동작                             | 사용 시점           |
| --------- | ------------------------------ | --------------- |
| `close`   | 오버레이를 닫지만 **상태는 유지**해요         | 닫기 애니메이션이 필요할 때 |
| `unmount` | 오버레이를 **즉시 제거**해요 (cleanup 포함) | 닫기 애니메이션 완료 후   |


### useOverlay 훅의 자동 처리


실제로는 `useOverlay()` 훅이 `close` → `unmount` 타이밍을 **자동으로 처리**해요. 사용하는 쪽에서는 `close()`만 호출하면, 내부에서 `duration` 옵션에 따라 `setTimeout(unmount, duration)`이 자동 실행돼요.


```javascript
// useOverlay 내부 구현 (간략화)
close: () => {
  close();
  if (duration > 0) {
    setTimeout(unmount, duration);  // 자동 처리
  } else {
    unmount();
  }
}
```


따라서 `openAsync` 사용 시에도 `close(value)` 호출이 Promise를 resolve한 뒤 `unmount`가 순서대로 실행되므로, 정상 사용 시 Promise가 pending 상태에 빠지지 않아요.


> 💡 **핵심:** 사용하는 쪽에서는 `close`만 호출하면 돼요. `unmount`를 직접 다룰 필요가 없어요.


---


## 6. 2-tier 오버레이 시스템 설계


오버레이 시스템은 용도에 따라 두 계층으로 분리하여 설계했어요.


| 계층             | 훅                   | 용도                                                                   |
| -------------- | ------------------- | -------------------------------------------------------------------- |
| `useOverlay()` | BottomSheet, 복잡한 모달 | `openAsync`로 값 반환 가능, `duration`  • `exitOnUnmount` 옵션으로 언마운트 타이밍 관리 |
| `useDialog()`  | AlertDialog, 간단한 확인 | 객체 옵션 기반, 단순한 확인/취소 흐름에 최적화                                          |


이렇게 계층을 나누면 **복잡한 오버레이는** **`useOverlay`****로 세밀하게 제어**하고, **단순한 확인 다이얼로그는** **`useDialog`****로 간결하게 처리**할 수 있어요.


---


## 7. 마이그레이션 — useOverlay


기존 오버레이 관리 방식에서 overlay-kit 기반의 `useOverlay()` 훅으로 전환하고, 팀에 공유했어요.


### 사용 시 주의사항

1. **클로저로 인한 stale 값 주의** — `useRef` 또는 Context를 통해 회피해요

---


## 8. 인사이트


### 🌐 전역 싱글톤의 위험성


overlay-kit의 이벤트 버스 충돌은 **"전역 싱글톤이 멀티 컨텍스트 환경에서 깨진다"**는 고전적 문제의 변형이에요. 모듈 레벨 전역 상태(`mitt`)를 사용하는 라이브러리는 단일 React 앱을 가정하는 경우가 많고, Activity 기반 SPA 프레임워크처럼 여러 서브트리를 동시에 유지하는 환경에서는 예상치 못한 충돌이 발생해요.

> **교훈:** 외부 라이브러리 도입 시, 해당 라이브러리의 **상태 스코프 가정**(전역 vs 인스턴스)이 우리 아키텍처와 호환되는지 반드시 확인해야 해요.

### 📸 스냅샷 vs 구독의 멘탈 모델


overlay-kit의 클로저 문제는 결국 **"스냅샷 기반"과 "구독 기반"의 차이**를 이해하는 문제예요.

- `overlay.open(callback)` → callback은 호출 시점의 스냅샷이에요
- `useContext()` → React 트리를 통한 실시간 구독이에요
- 같은 오버레이 내부에서도 이 두 모델이 공존하기 때문에, **어떤 값이 스냅샷이고 어떤 값이 구독인지** 명확히 구분해야 버그를 예방할 수 있어요.

### 🔄 마이그레이션은 전수조사가 핵심


100건+ 오버레이 호출을 하나하나 감사한 결과:

- **변환 실패 2건**이라는 수용 가능한 수준을 사전에 파악했어요
- **15건의 잠재적 버그**를 마이그레이션 과정에서 발견·수정했어요
- 나머지 49건은 "전환할 필요 없음"이라는 판단 근거를 확보했어요

전수조사 없이 마이그레이션했다면 런타임 버그로 돌아왔을 거예요.


### 📐 결론: 라이브러리의 가정을 파악하라


모든 라이브러리는 **암묵적 가정**을 가지고 있어요. overlay-kit은 "하나의 앱에 하나의 Provider"를, React Portal은 "이벤트는 React 트리를 따른다"를 가정해요. 이러한 가정이 우리 아키텍처와 충돌할 때, 소스코드를 읽고 내부 동작을 파악하는 것만이 근본적인 해결책을 찾는 길이에요.

