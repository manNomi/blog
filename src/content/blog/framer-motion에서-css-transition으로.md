---
title: "Framer Motion에서 CSS Transition으로"
pubDate: 2026-01-16T00:00:00.000Z
notionId: "32f7cf19-a364-8058-a586-fb77b7db1ae3"
---
## 들어가며


프론트엔드에서 애니메이션은 사용자 경험의 핵심입니다. 하지만 잘못된 애니메이션 구현은 오히려 **사용자 경험을 크게 저하**시킬 수 있습니다.


이 글에서는 지도 화면에서 리스트 뷰 전환 시 **CPU 4x Slowdown부터 눈에 띄게 버벅이던 문제**를 발견하고, Framer Motion에서 CSS Transition으로 전환하여 해결한 과정을 공유합니다.


---


## 문제 발견: 지도 클릭 시 버벅임


부동산 메인 화면에서 지도를 클릭하면 리스트 뷰가 슬라이드 애니메이션과 함께 나타납니다. 그런데 **CPU 4x Slowdown 환경부터 명확한 버벅임**이 발생했고, 6x 환경에서는 사용이 불편할 정도로 프레임 드랍이 심했습니다.


원인을 추적해보니, 리스트 뷰의 show/hide 애니메이션을 **Framer Motion의** **`VisibilityMotion`** **컴포넌트**로 처리하고 있었습니다.


```javascript
// ❌ As-Is: Framer Motion 기반 애니메이션
<VisibilityMotion
  show= y: 0 
  hide= y: "100%" 
  initial="show"
  animate={isOpen ? 'show' : 'hide'}
  durationType="large"
  {...(!withAnimation && { transition: { duration: 0 } })}
>
  {children}
</VisibilityMotion>
```


---


## 원인 분석: 왜 Framer Motion이 느렸을까?


### 브라우저 렌더링 파이프라인


핵심은 **메인 스레드 점유**에 있습니다. 브라우저의 렌더링 파이프라인을 살펴보면:


```javascript
┌──────────────────────────────────────────────────────┐
│              메인 스레드 (Main Thread)                  │
│  JavaScript → Style → Layout → Paint                 │
│  Framer Motion은 여기서 매 프레임 값을 계산하고 DOM에 적용  │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│           컴포지터 스레드 (Compositor Thread)            │
│  Composite (GPU)                                     │
│  CSS Transition의 transform/opacity는 여기서 보간 + 실행  │
└──────────────────────────────────────────────────────┘
```


### Framer Motion의 동작 방식


Framer Motion은 기본적으로 **JavaScript Animation**을 사용합니다:


```javascript
매 프레임마다 (requestAnimationFrame 기반):
1. JSAnimation.tick() → 현재 시간 기준 y 값 계산 (easing 적용)
2. MotionValue 업데이트 → 구독자들에게 알림
3. element.style.transform = "translateY(50%)" 직접 설정
4. 스타일 재계산 (Style Recalculation)
5. 컴포지트 (GPU 렌더링)
```


Framer Motion 내부에는 **Web Animations API(WAAPI)**를 통한 GPU 가속 경로가 있지만, 다음 조건을 **모두** 만족해야만 사용됩니다:

- `opacity`, `transform`, `filter`, `clipPath` 중 하나
- `onUpdate` 콜백 없음
- spring의 damping이 0이 아님
- `repeatType`이 "mirror"가 아님
- `inertia` 타입이 아님

대부분의 실제 사용 케이스에서 이 조건을 충족하지 못해 **JS 애니메이션으로 폴백**됩니다.


### 메인 스레드 블로킹의 영향


```javascript
// Framer Motion - 메인 스레드가 바쁘면 애니메이션도 버벅임
<motion.div animate= y: 0 >
  <HeavyList />  {/* 렌더링 중 메인 스레드 블로킹 */}
</motion.div>
// → JS가 다음 프레임 값을 계산하지 못해 애니메이션 프레임 드랍

// CSS Transition - 메인 스레드와 독립적
<div style= transform: "translateY(0)" >
  <HeavyList />  {/* 렌더링 중이어도 */}
</div>
// → 컴포지터 스레드가 독립적으로 애니메이션 계속 진행
```


---


## 개선: CSS Transition으로 전환


제스처나 복잡한 스프링 애니메이션이 아닌 **단순한 show/hide 전환**이었기 때문에, CSS Transition으로 충분히 처리할 수 있다고 판단했습니다.


변경 포인트:

- `VisibilityMotion`(Framer Motion) → 순수 `<div>` + CSS `transition`
- `will-change-transform`으로 브라우저에 GPU 레이어 승격 힌트
- `withAnimation` prop의 기본값을 `true`로 설정하여 일관된 동작 보장

---


## 프레임 타임라인 비교


### Framer Motion (CPU 4x throttling 시)


```javascript
Frame 1: JS계산(8ms) + Style(3ms) + Composite(1ms) = 12ms ✅
Frame 2: JS계산(8ms) + Style(8ms) + Composite(1ms) = 17ms ⚠️ 약간 지연
Frame 3: JS계산(8ms) + HeavyRender(20ms) + Composite(1ms) = 29ms ❌ 드랍
         ↑ 자식 컴포넌트 렌더링이 끼어들면 프레임 드랍
```


### CSS Transition (CPU 4x throttling 시)


```javascript
Frame 1: Composite(2ms) = 2ms ✅
Frame 2: Composite(2ms) = 2ms ✅  ← HeavyRender가 진행 중이어도
Frame 3: Composite(2ms) = 2ms ✅  ← 컴포지터는 독립적으로 60fps 유지
```


---


## 결과


CSS Transition으로 전환한 결과, **CPU 6x Slowdown 환경에서도 부드러운 60fps 애니메이션**을 유지할 수 있게 되었습니다.


변경 사항도 매우 가볍습니다:

- **+10줄, -18줄** — Framer Motion 의존성을 제거하고 순수 CSS로 대체
- 리스트 뷰의 기능 변경 없이 **애니메이션 성능만 개선**

---


## 그렇다면 언제 Framer Motion을 써야 할까?


CSS Transition이 항상 답은 아닙니다. Framer Motion이 필요한 경우:

- **Spring 애니메이션** — 물리 기반의 자연스러운 움직임
- **Gesture 연동** — 드래그, 스와이프와 애니메이션 연결
- **AnimatePresence** — 컴포넌트 언마운트 시 exit 애니메이션
- **Layout 애니메이션** — FLIP 기반 레이아웃 전환
- **복잡한 시퀀스** — 여러 요소의 조율된 애니메이션
> 단순한 show/hide, fade-in/out 같은 전환에는 **CSS Transition이 성능상 압도적으로 유리**합니다. 애니메이션의 복잡도에 맞는 도구를 선택하는 것이 중요합니다.
