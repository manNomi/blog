---
title: "React Compiler 도입"
pubDate: 2026-01-12T14:30:26.163Z
notionId: "2cd7cf19-a364-802f-b3b7-f410efbd3024"
---
![1*s2DJaXzcBACanvz9jzzJkA.png](https://cdn-images-1.medium.com/max/1600/1*s2DJaXzcBACanvz9jzzJkA.png)


사내 프로젝트에 React Compiler(RC)를 도입하며 겪었던 경험과 해결 과정을 공유합니다.


React Compiler는 `useMemo`, `useCallback` 같은 수동 최적화를 자동으로 처리해주는 강력한 도구이지만, 실제 도입 과정에서 예상치 못한 문제들을 마주하게 되었습니다.


### React Compiler란?


React Compiler는 개발자가 작성한 React 코드를 자동으로 최적화하여 성능을 향상시키는 도구입니다. 기존에 개발자가 직접 `useMemo`, `useCallback`을 사용해 수동으로 하던 최적화 작업을 컴파일러가 대신 처리해줍니다.


### 동작 원리


React Compiler의 최적화 과정은 크게 세 단계로 나뉩니다.


**1단계: 코드의 의미 이해하기 (파싱 & 시맨틱 분석)**


컴파일러는 작성된 JSX 코드를 컴퓨터가 이해할 수 있는 구조로 분석합니다.

- **코드 파싱**: 코드를 추상 구문 트리(AST)로 변환
- **시맨틱 분석**: React의 규칙에 따라 코드의 의미를 파악
- `useState`의 상태(state)와 부모로부터 받은 props 식별
- Hook의 호출 관계와 의존성 파악
- 값의 가변성(mutable/immutable) 추론

이 과정에서 코드는 HIR(High-level Intermediate Representation)이라는 중간 형태로 변환됩니다.


**2단계: 최적화 계획 수립**


컴파일러는 코드의 의미를 바탕으로 최적화 계획을 세웁니다.

- **의존성 분석**: 어떤 값이 변했을 때 어떤 부분이 재계산되어야 하는지 추적
- **메모이제이션 계획**: 의존성 분석을 바탕으로 캐싱 전략 수립

**3단계: 최적화된 코드 생성**


계획에 따라 메모이제이션 로직이 포함된 새로운 JavaScript 코드를 생성합니다.


```typescript
// 컴파일러가 생성한 코드 예시
function MyComponent(props) {
  // 값이 변경되었는지 확인
  const c_0 = $[0] !== props.value;
  let a;
  if (c_0) {
    // 변경되었다면 계산을 다시 하고 캐시에 저장
    a = expensiveCalculation(props.value);
    $[0] = props.value;
    $[1] = a;
  } else {
    // 변경되지 않았다면 캐시에서 이전 결과값 가져옴
    a = $[1];
  }
  // ...
}
```


### 발견한 문제: React Hook Form과의 충돌


### 문제 상황


프로젝트에 React Compiler를 적용한 후, React Hook Form의 `watch` 메서드를 사용할 때 메모이제이션이 제대로 작동하지 않는 현상을 발견했습니다.


두 개의 거의 동일한 컴포넌트를 비교해보면 문제가 명확히 드러납니다.


**PublicPage 컴포넌트 (메모이제이션 정상 작동)**


```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ButtonTest } from './Button'

export const PublicPage = () => {
  const [count, setCount] = useState(0)
  const handleClick = () => {
    setCount((prev) => prev + 1)
  }
  return (
    <div>
      This is a public page.
      <div>
        <p>{count}</p>
        <ButtonTest onClick={handleClick} />
      </div>
    </div>
  )
}
```


![1*EUeBd5KH8WWfmuo7oHuqNw.gif](https://cdn-images-1.medium.com/max/1200/1*EUeBd5KH8WWfmuo7oHuqNw.gif)


![1*gTTBrLxuRls60xGgJoyxHA.png](https://cdn-images-1.medium.com/max/1600/1*gTTBrLxuRls60xGgJoyxHA.png)


**PrivatePage 컴포넌트 (메모이제이션 작동 안 함)**


```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ButtonTest } from './Button'
export const PrivatePage = () => {
  const { watch } = useForm({
    defaultValues: { test: '' },
  })
const test = watch('test')  // 이 한 줄의 차이!
const [count, setCount] = useState(0)
  const handleClick = () => {
    setCount((prev) => prev + 1)
  }
  return (
    <div>
      This is a private page.
      <div>
        <p>{count}</p>
        <ButtonTest onClick={handleClick} />
      </div>
    </div>
  )
}
```


단순히 `watch('test')`를 호출하는 것만으로도 React Compiler의 메모이제이션이 생략되는 버그가 발생했습니다.


![1*Au_hyXkkxxGcGiI6bXLg3A.gif](https://cdn-images-1.medium.com/max/1200/1*Au_hyXkkxxGcGiI6bXLg3A.gif)


![1*lRWx-sNOu7s4ILbCQrIvTQ.png](https://cdn-images-1.medium.com/max/1600/1*lRWx-sNOu7s4ILbCQrIvTQ.png)


### 원인 분석


React Compiler는 Hook을 다음과 같은 방식으로 감지합니다:

1. **Hook 이름 패턴 매칭**: `isHookName()` 함수를 통해 "use"로 시작하는 함수를 Hook으로 인식
2. **알려진 Hook 레지스트리**: `DEFAULT_GLOBALS`와 `customHooks` 설정을 통해 등록된 Hook들을 추적
3. **Hook 종류 분류**: `useMemo`, `useCallback`, `useEffect` 등 특정 Hook들은 특별한 처리

문제는 React Hook Form의 `watch` 메서드가 React Compiler의 Hook 레지스트리에 등록되지 않아, 컴파일러가 이를 제대로 인식하지 못한다는 점이었습니다.


### 해결 방법


해결방법을 찾기위해 일단 react-hook-form의 이슈를 찾았습니다.


문제를 해결하기 위해 먼저 React Hook Form의 GitHub 저장소를 확인했고, [Issue #12298](https://github.com/react-hook-form/react-hook-form/issues/12298)에서 동일한 문제를 다루고 있음을 발견했습니다.


### 이슈의 핵심 내용


이슈는 2024년 10월 4일에 개설되었으며, React Compiler 사용 시 React Hook Form이 “React의 규칙”을 위반하여 발생하는 문제를 다루고 있습니다. 특히 Hook의 반환값이 불변(immutable)해야 한다는 규칙을 위반하는 것이 주요 원인이었습니다.


### 주요 문제점

1. **watch API**: `watch`가 "use"로 시작하지 않아 React Compiler가 이를 Hook으로 인식하지 못함
2. **control 객체**: `Controller` 컴포넌트 사용 시 `control`이 메모이제이션되어 `field.onChange`가 값을 업데이트하지 못하는 현상
3. **기타 API**: `getFieldState`, `formState` 등 여러 API에서 유사한 문제 발생

### 커뮤니티의 임시 해결책들


이슈 스레드에서 커뮤니티는 다양한 우회 방법을 제안했습니다:


**1. ‘use no memo’ 프래그마 사용**


```typescript
function Component() {
  'use no memo'  // 해당 컴포넌트의 컴파일 비활성화
  const form = useForm()
  // rest of component
}
```


이 방법은 가장 확실하지만, React Compiler의 이점을 전혀 활용할 수 없다는 단점이 있습니다.


**2. watch를 useWatch로 리네이밍**


```typescript
const { watch: useWatch } = useForm<>();
const thisWayWatchWorks = useWatch("myField")
```


커뮤니티 멤버 mauricedoepke가 발견한 간단하면서도 효과적인 방법입니다. `watch`를 `useWatch`로 리네이밍하면 React Compiler가 이를 Hook으로 인식하여 올바르게 메모이제이션을 처리합니다.


**3. Babel 플러그인 사용**


커뮤니티 멤버가 `useForm`을 참조하는 모든 함수를 자동으로 컴파일에서 제외하는 Babel 플러그인을 제작했습니다.


**4. ESLint 플러그인**


[eslint-plugin-use-no-memo](https://www.npmjs.com/package/eslint-plugin-use-no-memo)를 사용하여 `useForm()`을 사용하는 컴포넌트에 자동으로 'use no memo'를 추가하도록 강제할 수 있습니다.


**5. 컴파일러 설정 조정**


```typescript
// React Compiler 설정
{
  enableAssumeHooksFollowRulesOfReact: false
}
```


이 설정은 커스텀 Hook을 포함하는 모든 컴포넌트의 메모이제이션을 건너뛰게 만듭니다. 최적은 아니지만 일부 컴포넌트에서는 여전히 혜택을 받을 수 있습니다.


### 공식 해결책: v8.0.0-alpha.5


이슈 스레드에서 메인테이너 bluebill1049가 2024년 10월에 [v8.0.0-alpha.5 릴리스](https://github.com/react-hook-form/react-hook-form/releases/tag/v8.0.0-alpha.5)를 공유했습니다. 이 알파 버전에서는 React Compiler와의 호환성 문제가 근본적으로 해결되었습니다.


### 알파 버전의 개선사항

- Hook 이름 규칙을 준수하도록 내부 구조 개선
- React Compiler가 올바르게 메모이제이션을 적용할 수 있도록 수정
- 별도의 우회책(`'use no memo'`, 리네이밍 등) 없이도 정상 작동

### 프로덕션 사용 사례


이슈의 한 사용자는 다음과 같이 보고했습니다:

> “v8.0.0-alpha.5 버전을 프로덕션에서 사용하고 있으며 아무런 문제를 발견하지 못했습니다. 저는 일반적으로 Controller를 사용하지 않고 watch, register 등과 form context만 사용합니다.”

이는 알파 버전임에도 불구하고 실제 환경에서 안정적으로 작동할 수 있음을 시사합니다.


실제로 알파버전을 테스트 진행했고 올바르게 동작하는것을 확인했습니다.


![1*gAL9DeS4D8AgSJz6bUxh0w.png](https://cdn-images-1.medium.com/max/1600/1*gAL9DeS4D8AgSJz6bUxh0w.png)


### 저희가 내린 결론


다양한 해결책을 검토한 결과, 저희 팀은 **watch를 useWatch로 리네이밍하는 방식**을 채택하기로 결정했습니다.


### 의사결정 배경

1. **안정성 우선**: v8.0.0-alpha.5는 아직 알파 버전이므로, 프로덕션 환경에 바로 적용하기에는 리스크가 있다고 판단했습니다.
2. **최소한의 코드 변경**: ‘use no memo’를 사용하면 React Compiler의 이점을 완전히 포기해야 하지만, useWatch 리네이밍은 간단한 변경만으로 컴파일러와 호환됩니다.
3. **즉시 적용 가능**: 별도의 패키지 업데이트나 설정 변경 없이 기존 코드베이스에서 바로 적용할 수 있습니다.
4. **향후 마이그레이션 용이**: React Hook Form v8이 정식 릴리즈되면 리네이밍 코드를 제거하고 원래 방식으로 되돌릴 수 있습니다.

기존 코드 →


```typescript
export const PrivatePage = () => {
  const { watch } = useForm({
    defaultValues: { test: '' },
  })
  const test = watch('test')  // 문제 발생
  // ...
}
```


변경된 코드 →


```typescript
export const PrivatePage = () => {
  const { watch: useWatch } = useForm({
    defaultValues: { test: '' },
  })
  const test = useWatch('test')  // 정상 작동!
  // ...
}
```


### 향후 계획


React Hook Form v8 정식 버전이 릴리즈되면:

1. **패키지 업데이트**: 안정화된 v8.x 버전으로 업그레이드
2. **코드 정리**: useWatch 리네이밍 코드를 원래의 watch로 되돌림

이러한 단계적 접근 방식을 통해 안정성을 유지하면서도 React Compiler의 이점을 최대한 활용할 수 있게 되었습니다.


### 결론!


### 1. 새로운 도구 도입 시 충분한 테스트 필요


React Compiler와 같은 최적화 도구를 도입할 때는 프로젝트에서 사용 중인 주요 라이브러리들과의 호환성을 충분히 검증해야 합니다.


### 2. 커뮤니티와 적극적으로 소통


비슷한 문제를 겪은 다른 개발자들이 있을 수 있습니다. GitHub 이슈를 검색하고 필요시 새로운 이슈를 등록하는 것이 도움이 됩니다.


### 3. 알파/베타 버전도 고려


안정성이 중요한 프로덕션 환경에서는 조심스럽지만, 최신 알파 버전에서 중요한 버그 수정이 이루어지는 경우가 있습니다. 충분한 테스트를 거친 후 도입을 고려할 수 있습니다.


### 마무리


React Compiler는 성능 최적화를 자동화해주는 강력한 도구이지만, 아직 발전 중인 기술입니다.


실제 프로젝트에 도입할 때는 사용 중인 라이브러리들과의 호환성을 꼼꼼히 확인하고, 발견한 문제들을 커뮤니티와 공유하는 것이 중요합니다.


![1*_mmnEHWGUeBJ94z5Xpqumg.jpeg](https://cdn-images-1.medium.com/max/1600/1*_mmnEHWGUeBJ94z5Xpqumg.jpeg)


이번 경험을 통해 React Compiler의 내부 동작 원리를 더 깊이 이해할 수 있었고, 앞으로 비슷한 문제를 더 빠르게 해결할 수 있는 기반을 마련했습니다.


### 참고 자료

- [React Hook Form Issue #12298](https://github.com/react-hook-form/react-hook-form/issues/12298)
- [React Compiler Environment.ts](https://github.com/facebook/react/blob/main/compiler/packages/babel-plugin-react-compiler/src/HIR/Environment.ts)
- [React Hook Form v8.0.0-alpha.5 Release](https://github.com/react-hook-form/react-hook-form/releases/tag/v8.0.0-alpha.5)
- [StackBlitz 재현 예제](https://stackblitz.com/edit/vitejs-vite-dbrfdshf?file=src%2FApp.tsx)
