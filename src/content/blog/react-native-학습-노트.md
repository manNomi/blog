---
title: "React Native 학습 노트"
description: "rn"
pubDate: 2026-06-08T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "3797cf19-a364-8012-bf31-c388d7c66ab0"
---
# React Native 학습 노트: 섹션 1-7 통합 정리

> 이 문서는 섹션 1부터 섹션 7까지의 강의 노트를 노션 한 페이지에 붙여넣기 좋게 재구성한 통합 정리다.
>
> 핵심 흐름은 `React 지식 재사용 -> React Native 환경 적응 -> 앱 UI 구현 -> 반응형/플랫폼 대응 -> 내비게이션 -> 앱 전역 상태 관리`다.
>
>

---


## 전체 로드맵



| 섹션 | 주제 | 핵심 질문 |
| --- | --- | --- |
| 1 | React Native와 Expo 시작 | React Native는 웹 React와 무엇이 같고 무엇이 다른가? |
| 2 | 핵심 컴포넌트, 스타일링, 상태, 목록 | HTML/CSS 대신 어떤 컴포넌트와 스타일 시스템을 쓰는가? |
| 3 | 디버깅 | 브라우저가 아닌 모바일 앱은 어떻게 디버깅하는가? |
| 4 | 숫자 맞히기 게임 앱 | RN 기본기를 실제 앱 구조로 어떻게 조합하는가? |
| 5 | 반응형, 방향, 플랫폼, 상태바 | 화면 크기, 회전, 키보드, 플랫폼 차이에 어떻게 대응하는가? |
| 6 | React Navigation | 여러 화면 사이를 어떻게 자연스럽게 이동시키는가? |
| 7 | Context와 Redux | 여러 화면이 공유하는 상태를 어떻게 관리하는가? |



---


## 가장 큰 관점 전환


React Native는 React를 새로 배우는 것이 아니라, React를 브라우저 DOM이 아닌 모바일 네이티브 UI에 연결하는 방식이다.


```plain text
웹 React
React + react-dom
-> 브라우저 DOM
-> HTML / CSS / browser event

React Native
React + react-native
-> iOS / Android 네이티브 UI
-> View / Text / Pressable / native event
```


프론트엔드 개발자가 계속 가져가는 것은 React의 사고방식이다.

- 컴포넌트
- JSX
- props
- state
- hooks
- 조건부 렌더링
- 이벤트 핸들러
- 리스트 렌더링
- 컴포넌트 분리
- Context / Redux 같은 전역 상태 관리

새로 익혀야 하는 것은 렌더링 대상과 모바일 환경이다.

- DOM이 없다.
- HTML 태그를 쓸 수 없다.
- CSS 파일과 cascade가 없다.
- 브라우저 DevTools만으로 끝나지 않는다.
- 실제 기기, 에뮬레이터, 시뮬레이터에서 확인한다.
- 키보드, safe area, status bar, 화면 회전, 플랫폼 차이를 직접 고려한다.

---


## 섹션 1. React Native와 Expo 시작


### 한 줄 요약


React Native는 React의 컴포넌트와 상태 관리 방식을 그대로 사용하되, 결과물을 브라우저 DOM이 아니라 iOS와 Android의 네이티브 UI로 렌더링한다.


### 핵심 내용

- React Native는 React 기반 모바일 앱 프레임워크다.
- JSX로 작성한 RN 컴포넌트는 각 플랫폼의 네이티브 UI 요소로 연결된다.
- JavaScript 로직은 앱 내부 JS 런타임에서 실행된다.
- Expo는 RN 프로젝트 생성, 실행, 기기 미리보기, 네이티브 기능 접근을 쉽게 해주는 도구다.
- 웹에서는 `localhost` 브라우저가 중심이지만, RN에서는 Expo Go, Android Emulator, iOS Simulator가 중심이다.

### Expo 프로젝트 흐름


```bash
npx create-expo-app --template blank
npm start
```


자주 보는 파일은 다음과 같다.



| 항목 | 역할 |
| --- | --- |
| `App.js` | 앱 루트 컴포넌트 |
| `app.json` | Expo 앱 설정 |
| `assets` | 이미지, 아이콘, 폰트 등 정적 자산 |
| `package.json` | 의존성, 실행 스크립트 |



### 프론트엔드 관점 포인트

- `react-dom` 대신 `react-native`가 렌더링 환경을 담당한다.
- 웹의 HTML/CSS 지식은 직접 사용되지 않지만, 레이아웃과 컴포넌트 사고는 이어진다.
- iOS Simulator는 macOS와 Xcode가 필요하다.
- 실제 기기에서 Expo Go로 QR 코드를 스캔해 빠르게 확인할 수 있다.

### 섹션 1 체크리스트

- [ ] React Native가 React를 네이티브 UI에 연결하는 프레임워크임을 설명할 수 있다.
- [ ] Expo의 역할을 Vite/Next CLI 같은 개발 도구 관점에서 이해한다.
- [ ] `App.js`, `app.json`, `assets`, `package.json`의 역할을 구분한다.
- [ ] 브라우저 대신 기기/시뮬레이터에서 앱을 확인하는 흐름에 익숙하다.

---


## 섹션 2. 핵심 컴포넌트, 스타일링, 상태, 목록


### 한 줄 요약


React Native의 핵심 컴포넌트, 스타일링, 이벤트, 상태, 목록 렌더링을 사용해 첫 모바일 앱을 만들며 웹 React와 네이티브 앱 개발의 차이를 익히는 섹션이다.


### 웹 요소와 RN 컴포넌트 대응



| 웹 개념 | React Native |
| --- | --- |
| `div` | `View` |
| 텍스트 태그 | `Text` |
| `input` | `TextInput` |
| `button` | `Button`, `Pressable` |
| `img` | `Image` |
| 스크롤 컨테이너 | `ScrollView` |
| 긴 목록 | `FlatList` |
| 팝업/오버레이 | `Modal` |



가장 중요한 규칙은 텍스트는 반드시 `Text` 컴포넌트 안에 있어야 한다는 점이다.


```javascript
// 잘못된 방식
<View>Hello</View>

// 올바른 방식
<View>
  <Text>Hello</Text>
</View>
```


### 스타일링


React Native에는 CSS 파일 대신 JavaScript 스타일 객체를 사용한다.


```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1e085a',
  },
});
```


주요 차이:

- `background-color`가 아니라 `backgroundColor`처럼 camelCase를 쓴다.
- 숫자 값은 디바이스 밀도를 고려한 논리 픽셀처럼 다뤄진다.
- CSS cascade가 없다.
- 부모 `View`의 글자색이 자식 `Text`에 자동 상속되지 않는다.
- 모든 컴포넌트가 모든 스타일 속성을 지원하지는 않는다.
- iOS와 Android에서 같은 스타일이 다르게 보일 수 있다.

### Flexbox


RN 레이아웃의 중심은 Flexbox다. 단, 기본 방향이 웹과 다르다.


```plain text
웹 CSS Flexbox 기본 방향: row
React Native Flexbox 기본 방향: column
```


자주 쓰는 패턴:


```javascript
container: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
}
```


### 이벤트와 상태


React의 상태 관리 패턴은 그대로 쓴다.


```javascript
const [enteredGoalText, setEnteredGoalText] = useState('');
```


웹과 다른 이벤트 이름:


```javascript
<TextInput
  onChangeText={setEnteredGoalText}
  value={enteredGoalText}
/>

<Button title="Add Goal" onPress={addGoalHandler} />
```


```plain text
웹: onChange / onClick
RN: onChangeText / onPress
```


### ScrollView와 FlatList


`ScrollView`는 내부 항목을 모두 렌더링한다.

- 짧고 제한된 콘텐츠에 적합하다.
- 긴 동적 목록에는 비효율적일 수 있다.

`FlatList`는 긴 목록에 적합하다.


```javascript
<FlatList
  data={courseGoals}
  renderItem={(itemData) => (
    <GoalItem text={itemData.item.text} />
  )}
  keyExtractor={(item) => item.id}
/>
```


### 컴포넌트 분리 흐름


```plain text
App
-> 전체 상태와 목표 목록 관리

GoalInput
-> 목표 입력 UI와 입력 상태 관리

GoalItem
-> 개별 목표 항목 렌더링과 삭제 이벤트 연결
```


### 섹션 2 체크리스트

- [ ] `View`, `Text`, `TextInput`, `Button`, `Pressable`, `Image`, `Modal`의 역할을 구분한다.
- [ ] RN 스타일 객체와 CSS의 차이를 설명할 수 있다.
- [ ] Flexbox 기본 방향이 `column`임을 기억한다.
- [ ] `onChangeText`, `onPress`를 자연스럽게 사용할 수 있다.
- [ ] `ScrollView`와 `FlatList`의 차이를 알고 목록 성능을 고려한다.
- [ ] 상태와 콜백을 props로 내려 컴포넌트를 분리할 수 있다.

---


## 섹션 3. 디버깅


### 한 줄 요약


React Native 디버깅은 웹에서 익숙한 에러 메시지 읽기, `console.log`, DevTools 활용 습관을 모바일 앱 실행 환경에 맞게 옮겨 쓰는 과정이다.


### 디버깅 기본 순서


```plain text
1. 에러 메시지를 읽는다.
2. 터미널 로그를 확인한다.
3. 스택트레이스에서 직접 만든 컴포넌트를 찾는다.
4. console.log로 값과 흐름을 확인한다.
5. Expo 개발자 메뉴를 연다.
6. 필요하면 Chrome DevTools나 React DevTools를 사용한다.
7. 공식 문서로 컴포넌트 prop 사용법을 확인한다.
```


### 에러 메시지 읽기


RN 에러는 앱 화면과 터미널에 표시된다. 중요한 단서는 보통 다음이다.

- 어떤 컴포넌트에서 문제가 났는가
- 어떤 prop이나 값이 문제인가
- 어떤 파일/컴포넌트 흐름에서 발생했는가

스택트레이스에서는 RN 내부 코드보다 직접 만든 컴포넌트 이름을 찾는 것이 중요하다.


### console.log


```javascript
console.log('현재 입력값:', enteredGoalText);
```


출력은 `npm start`를 실행한 터미널에서 확인한다.


확인할 수 있는 것:

- 컴포넌트 렌더링 시점
- 이벤트 핸들러 호출 여부
- state 값 변화
- props 전달 여부
- 여러 기기에서 실행될 때 로그가 여러 번 찍히는 이유

### Expo 단축키



| 단축키 | 역할 |
| --- | --- |
| `a` | Android Emulator에서 앱 열기 |
| `i` | iOS Simulator에서 앱 열기 |
| `r` | 앱 새로고침 |
| `m` | 개발자 메뉴 열기/닫기 |
| `?` | 단축키 목록 보기 |



### 개발자 메뉴


여는 방법:


```plain text
터미널: m
iOS Simulator: Command + D
Android Emulator: Ctrl + M
```


사용 목적:

- 앱 새로고침
- 원격 JS 디버깅
- 개발 도구 실행
- 앱 홈 이동

### React DevTools


React Native에서는 독립 실행형 React DevTools를 사용할 수 있다.


```bash
npm install -g react-devtools
react-devtools
```


확인 가능한 것:

- 컴포넌트 트리
- props
- state
- state 수정에 따른 UI 변화

### 섹션 3 체크리스트

- [ ] RN 에러 메시지에서 컴포넌트와 prop 단서를 찾을 수 있다.
- [ ] 터미널 로그와 앱 화면 에러를 함께 확인한다.
- [ ] Expo 개발자 메뉴를 열 수 있다.
- [ ] `console.log`로 이벤트와 상태 흐름을 추적할 수 있다.
- [ ] 독립 실행형 React DevTools의 용도를 안다.

---


## 섹션 4. 숫자 맞히기 게임 앱


### 한 줄 요약


React Native 기본 컴포넌트와 React 상태 관리 지식을 바탕으로 숫자 맞히기 게임 앱을 만들며 모바일 앱다운 화면 구성, 커스텀 UI, 에셋, 폰트, 아이콘, 목록, 상태 기반 화면 전환을 종합적으로 연습한다.


### 앱 화면 흐름


```plain text
StartGameScreen
-> 사용자가 숫자 입력

GameScreen
-> 앱이 숫자를 추측하고 사용자가 higher/lower 피드백 제공

GameOverScreen
-> 라운드 수와 선택 숫자 표시
-> 새 게임 시작
```


### 상태 기반 화면 전환


이 섹션에서는 React Navigation 없이 `App`의 상태로 화면을 바꾼다.


```javascript
let screen =<StartGameScreen onPickNumber={pickedNumberHandler} />;

if (userNumber) {
  screen = (
    <GameScreen
      userNumber={userNumber}
      onGameOver={gameOverHandler}
    />
  );
}

if (gameIsOver && userNumber) {
  screen = (
    <GameOverScreen
      roundsNumber={guessRounds}
      userNumber={userNumber}
      onStartNewGame={startNewGameHandler}
    />
  );
}
```


간단한 앱에서는 충분하지만, 뒤로가기, 스택, 탭, 헤더, 딥링크가 필요해지면 React Navigation 같은 라이브러리가 필요하다.


### 커스텀 버튼


기본 `Button` 대신 `Pressable`, `View`, `Text`로 직접 버튼을 만든다.


```javascript
<Pressable
  onPress={onPress}
  android_ripple={{ color: Colors.primary600 }}
  style={({ pressed }) =>
    pressed
      ? [styles.buttonInnerContainer, styles.pressed]
      : styles.buttonInnerContainer
  }
>
  <Text style={styles.buttonText}>{children}</Text>
</Pressable>
```


플랫폼별 피드백:

- Android: `android_ripple`
- iOS: `Pressable`의 `pressed` 상태 기반 opacity

### 재사용 UI 컴포넌트


```plain text
components/ui
-> PrimaryButton
-> Title
-> Card
-> InstructionText

components/game
-> NumberContainer
-> GuessLogItem
```


`style` prop을 외부에서 받아 기본 스타일과 병합하는 패턴이 중요하다.


```javascript
function InstructionText({ children, style }) {
  return (
    <Text style={[styles.instructionText, style]}>
      {children}
    </Text>
  );
}
```


### 입력 검증과 Alert


사용자 입력은 문자열로 들어오므로 숫자로 변환하고 검증한다.


```plain text
입력값 읽기
-> 숫자로 변환
-> 1~99 범위인지 확인
-> 유효하지 않으면 Alert 표시
-> 유효하면 게임 화면으로 이동
```


### 게임 로직


앱은 사용자가 선택한 숫자를 직접 맞히는 것이 아니라, 범위를 좁히며 추측한다.


```plain text
minBoundary / maxBoundary
-> higher/lower 피드백에 따라 범위 업데이트
-> 새 난수 생성
-> 정답이면 game over 처리
```


`useEffect`는 추측값이 사용자 숫자와 같아졌을 때 게임 종료 콜백을 실행하는 데 사용한다.


### 에셋과 시각 요소


사용한 요소:

- `expo-linear-gradient`로 배경 그라데이션
- `ImageBackground`로 배경 이미지 오버레이
- `@expo/vector-icons`로 아이콘 버튼
- `expo-font`로 커스텀 폰트
- `SafeAreaView`로 안전 영역 처리

### 추측 로그


라운드별 추측 기록을 배열 상태로 관리하고 `FlatList`로 렌더링한다.


```plain text
currentGuess
-> allGuesses 배열에 추가
-> FlatList로 GuessLogItem 렌더링
-> 라운드 번호와 추측 숫자 표시
```


### 섹션 4 체크리스트

- [ ] 상태 기반 조건부 렌더링으로 간단한 화면 전환을 구현할 수 있다.
- [ ] `Pressable`로 커스텀 버튼과 플랫폼별 눌림 피드백을 만들 수 있다.
- [ ] 공통 UI 컴포넌트와 도메인 컴포넌트를 구분할 수 있다.
- [ ] 입력값 검증과 `Alert` 사용 흐름을 이해한다.
- [ ] `useEffect`로 게임 종료 같은 side effect를 처리할 수 있다.
- [ ] 이미지, 배경, 아이콘, 폰트, safe area를 앱 UI에 적용할 수 있다.
- [ ] `FlatList`로 게임 로그 목록을 렌더링할 수 있다.

---


## 섹션 5. 반응형, 화면 방향, 플랫폼, 상태바


### 한 줄 요약


React Native에서 웹의 미디어 쿼리와 CSS 반응형 사고를 그대로 사용할 수는 없지만, `Dimensions`, `useWindowDimensions`, `KeyboardAvoidingView`, `ScrollView`, `Platform`, 플랫폼별 파일, `StatusBar`를 조합해 다양한 화면 크기, 방향, 플랫폼에 대응하는 적응형 UI를 만들 수 있다.


### 크기 제약과 퍼센트 단위


웹의 `max-width`와 비슷한 사고를 RN에서도 쓸 수 있다.


```javascript
title: {
  width: 300,
  maxWidth: '80%',
}
```


```plain text
큰 화면
-> 300 사용

작은 화면
-> 부모 너비의 80%까지만 사용
```


퍼센트 값은 부모 컨테이너 기준이다. 크기를 줄인 뒤 가운데 정렬이 깨지면 부모의 `alignItems`도 함께 조정해야 한다.


### Dimensions API


`Dimensions.get('window')`로 현재 화면 크기를 읽는다.


```javascript
import { Dimensions } from 'react-native';

const deviceWidth = Dimensions.get('window').width;
```


조건부 스타일에 사용할 수 있다.


```javascript
padding: deviceWidth < 380 ? 12 : 24
```


주의할 점:

- 파일 최상단에서 한 번 읽으면 초기값처럼 동작한다.
- 앱 실행 중 기기 방향이 바뀌어도 자동으로 다시 계산되지 않는다.
- 동적 회전 대응에는 `useWindowDimensions`가 더 적합하다.

### 이미지 크기와 원형 마스크


이미지가 `width: '100%'`, `height: '100%'`를 갖고 있어도 실제 크기는 부모 컨테이너가 결정한다.


원형 이미지는 세 값이 함께 움직여야 한다.


```javascript
const imageSize = deviceWidth < 380 ? 150 : 300;

imageContainer: {
  width: imageSize,
  height: imageSize,
  borderRadius: imageSize / 2,
}
```


퍼센트 단위는 너비와 높이 기준이 달라질 수 있으므로 원형 이미지에는 조심해야 한다.


### 화면 방향 설정


Expo의 `app.json`에서 화면 방향을 설정한다.


```json
{
  "expo": {
    "orientation": "default"
  }
}
```


설정 의미:



| 값 | 의미 |
| --- | --- |
| `portrait` | 세로 고정 |
| `landscape` | 가로 고정 |
| `default` | 기기 방향에 따라 전환 |



가로 모드를 허용하면 UI가 자동으로 좋아지는 것이 아니라, 높이 부족과 키보드 겹침 같은 문제가 드러난다.


### useWindowDimensions


화면 크기나 방향 변경에 동적으로 대응하려면 훅을 사용한다.


```javascript
const { width, height } = useWindowDimensions();
```


동적 스타일 예시:


```javascript
const marginTopDistance = height < 380 ? 30 : 100;

<View style={[styles.rootContainer, { marginTop: marginTopDistance }]} />
```


구분:


```plain text
Dimensions.get()
-> 초기 화면 크기 기준 분기

useWindowDimensions()
-> 회전과 크기 변경에 즉시 반응
```


### 키보드와 스크롤 대응


모바일에서는 키보드가 입력창과 버튼을 가릴 수 있다.


```javascript
<ScrollView style={styles.screen}>
  <KeyboardAvoidingView behavior="position" style={styles.screen}>
    ...
  </KeyboardAvoidingView>
</ScrollView>
```


역할:

- `KeyboardAvoidingView`: 키보드가 열릴 때 UI를 밀어 올림
- `ScrollView`: 화면이 부족할 때 사용자가 스크롤해서 버튼까지 접근 가능

### 가로 모드 레이아웃 구조 변경


단순히 margin이나 fontSize만 줄이는 것이 아니라 JSX 구조를 바꿀 수도 있다.


```plain text
세로
-> NumberContainer
-> Card 안에 higher/lower 버튼
-> 로그 목록

가로
-> 버튼 / NumberContainer / 버튼을 한 줄 배치
-> 불필요한 안내 문구 제거
-> 로그 목록 공간 확보
```


### GameOverScreen 개선


게임 오버 화면에서는 이미지가 버튼을 밀어내지 않도록 화면 너비와 높이를 모두 고려한다.


```javascript
let imageSize = 300;

if (width < 380) {
  imageSize = 150;
}

if (height < 400) {
  imageSize = 80;
}

const imageStyle = {
  width: imageSize,
  height: imageSize,
  borderRadius: imageSize / 2,
};
```


전체 화면은 `ScrollView`로 감싸 버튼 접근성을 보장한다.


### Platform API


플랫폼별 스타일 분기는 `Platform.OS` 또는 `Platform.select()`로 처리한다.


```javascript
borderWidth: Platform.OS === 'android' ? 2 : 0
```


```javascript
borderWidth: Platform.select({
  ios: 0,
  android: 2,
})
```


### 플랫폼별 파일


파일 이름에 플랫폼 확장자를 붙일 수 있다.


```plain text
Title.android.js
Title.ios.js
colors.android.js
colors.ios.js
```


import할 때는 플랫폼 확장자를 쓰지 않는다.


```javascript
import Title from '../components/Title';
```


React Native가 실행 플랫폼에 맞는 파일을 자동 선택한다.


### StatusBar


Expo의 `StatusBar`로 상태바 스타일을 제어한다.


```javascript
import { StatusBar } from 'expo-status-bar';

<>
  <StatusBar style="light" />
  <AppContent />
</>
```


화면 전체 배경이 어두우면 `light`, 밝으면 `dark`를 선택한다.


### 섹션 5 체크리스트

- [ ] `width`, `maxWidth`, 퍼센트 단위를 조합해 작은 화면 대응을 할 수 있다.
- [ ] `Dimensions.get()`과 `useWindowDimensions()`의 차이를 안다.
- [ ] 원형 이미지는 width, height, borderRadius를 함께 조정해야 함을 이해한다.
- [ ] `KeyboardAvoidingView`와 `ScrollView`를 조합해 키보드 겹침 문제를 줄일 수 있다.
- [ ] 화면 방향에 따라 스타일뿐 아니라 JSX 구조도 바꿀 수 있다.
- [ ] `Platform.OS`, `Platform.select`, 플랫폼별 파일 패턴을 이해한다.
- [ ] Expo `StatusBar`로 상태바 색상을 제어할 수 있다.

---


## 섹션 6. React Navigation


### 한 줄 요약


React Navigation을 사용해 React Native 앱의 화면 전환을 웹의 URL 라우팅이 아닌 모바일 앱의 네이티브 내비게이션 패턴으로 이해하고, Stack, Drawer, Tabs, params, screen options, header actions, nested navigators를 조합해 여러 화면을 가진 앱 구조를 설계한다.


### 웹 라우팅과 모바일 내비게이션의 차이


```plain text
웹
-> URL 입력
-> 링크 클릭
-> /categories/:id 같은 path 중심

모바일 앱
-> 버튼/터치
-> 화면 stack 이동
-> drawer/tabs 전환
-> 뒤로가기 제스처와 헤더
```


### Meals 앱 화면 흐름


초기 흐름:


```plain text
CategoriesScreen
-> MealsOverviewScreen
-> MealDetailScreen
```


즐겨찾기 추가 후 최종 흐름:


```plain text
Stack
-> DrawerNavigator
   -> Categories
   -> Favorites
-> MealsOverview
-> MealDetail
```


### React Navigation 설치


기본 패키지:


```bash
npm install @react-navigation/native
npx expo install react-native-screens react-native-safe-area-context
```


Native Stack:


```bash
npx expo install @react-navigation/native-stack
```


Drawer:


```bash
npm install @react-navigation/drawer
```


Bottom Tabs:


```bash
npm install @react-navigation/bottom-tabs
```


### NavigationContainer


앱 전체 내비게이션 설정을 감싼다.


```javascript
<NavigationContainer>
  <Stack.Navigator>
    ...
  </Stack.Navigator>
</NavigationContainer>
```


### Native Stack Navigator


```javascript
const Stack = createNativeStackNavigator();

<Stack.Navigator>
  <Stack.Screen
    name="MealsCategories"
    component={CategoriesScreen}
  />
  <Stack.Screen
    name="MealsOverview"
    component={MealsOverviewScreen}
  />
</Stack.Navigator>
```


`name`은 화면 식별자다. 웹의 route path 대신 navigation action에서 사용한다.


### 화면 이동


Screen으로 등록된 컴포넌트는 `navigation` prop을 받는다.


```javascript
function CategoriesScreen({ navigation }) {
  function pressHandler() {
    navigation.navigate('MealsOverview');
  }
}
```


중첩 컴포넌트에서 직접 이동해야 하면 `useNavigation()`을 사용할 수 있다.


```javascript
const navigation = useNavigation();
```


### params 전달과 route


이동하면서 데이터를 넘긴다.


```javascript
navigation.navigate('MealsOverview', {
  categoryId: itemData.item.id,
});
```


대상 화면에서 읽는다.


```javascript
function MealsOverviewScreen({ route }) {
  const catId = route.params.categoryId;
}
```


params는 화면을 그리는 데 필요한 작은 식별자에 적합하다.


```plain text
적합
-> categoryId
-> mealId

부적합
-> 즐겨찾기 전체 목록
-> 로그인 사용자
-> 장바구니
```


### 데이터 필터링


카테고리 id를 기준으로 meals를 필터링한다.


```javascript
const displayedMeals = MEALS.filter((mealItem) => {
  return mealItem.categoryIds.indexOf(catId) >= 0;
});
```


### CategoryGridTile


카테고리는 `FlatList`의 `numColumns`로 2열 그리드를 만든다.


```javascript
<FlatList
  data={CATEGORIES}
  keyExtractor={(item) => item.id}
  renderItem={renderCategoryItem}
  numColumns={2}
/>
```


`Pressable`을 사용해 터치 가능한 grid tile을 구성하고, Android ripple과 iOS opacity 피드백을 준다.


### MealItem


Meal 목록은 별도 `MealItem` 컴포넌트로 렌더링한다.


구성:

- 원격 이미지
- 제목
- 조리 시간
- 난이도
- 가격 수준
- 눌림 피드백
- 상세 화면으로 이동

원격 이미지는 반드시 크기를 지정해야 한다.


```javascript
<Image
  source={{ uri: imageUrl }}
  style={styles.image}
/>
```


### screenOptions와 options


공통 화면 설정은 Navigator의 `screenOptions`에 둔다.


```javascript
<Stack.Navigator
  screenOptions={{
    headerStyle: { backgroundColor: '#351401' },
    headerTintColor: 'white',
    contentStyle: { backgroundColor: '#3f2f25' },
  }}
>
```


개별 화면 설정은 `Stack.Screen`의 `options`에 둔다.


```javascript
<Stack.Screen
  name="MealDetail"
  component={MealDetailScreen}
  options={{ title: 'About the Meal' }}
/>
```


화면별 `options`가 공통 `screenOptions`보다 우선한다.


### 동적 options


선택된 카테고리 이름처럼 화면 데이터에 따라 헤더 제목이 달라질 때 사용한다.


```javascript
useLayoutEffect(() => {
  navigation.setOptions({
    title: categoryTitle,
  });
}, [navigation, categoryTitle]);
```


`useEffect`보다 `useLayoutEffect`를 쓰면 화면 전환 애니메이션 중 제목이 늦게 바뀌는 느낌을 줄일 수 있다.


### MealDetailScreen


`route.params.mealId`로 선택된 meal을 찾고 상세 정보를 렌더링한다.


```javascript
const mealId = route.params.mealId;
const selectedMeal = MEALS.find((meal) => meal.id === mealId);
```


상세 화면 구성:

- 이미지
- 제목
- `MealDetails`
- Ingredients
- Steps

재사용 컴포넌트:


```plain text
MealDetails
-> duration / complexity / affordability 표시

Subtitle
-> Ingredients / Steps 제목

List
-> ingredients / steps 배열 출력
```


상세 내용이 길어질 수 있으므로 전체 화면은 `ScrollView`로 감싼다.


### headerRight와 IconButton


헤더 오른쪽에 즐겨찾기 버튼을 추가한다.


```javascript
navigation.setOptions({
  headerRight: () => (
    <IconButton
      icon="star"
      color="white"
      onPress={changeFavoriteStatusHandler}
    />
  ),
});
```


`IconButton`은 `Pressable`과 `Ionicons`로 만든다.


```javascript
<Pressable onPress={onPress}>
  <Ionicons name={icon} size={24} color={color} />
</Pressable>
```


### Drawer Navigator


사이드 드로어 패턴을 제공한다.


```javascript
const Drawer = createDrawerNavigator();

<Drawer.Navigator>
  <Drawer.Screen
    name="Welcome"
    component={WelcomeScreen}
  />
  <Drawer.Screen
    name="User"
    component={UserScreen}
  />
</Drawer.Navigator>
```


Drawer는 기본 헤더와 메뉴 버튼을 제공한다.


화면에서 드로어를 직접 열 수도 있다.


```javascript
navigation.toggleDrawer();
```


### Bottom Tabs Navigator


하단 탭으로 주요 섹션을 전환한다.


```javascript
const BottomTabs = createBottomTabNavigator();

<BottomTabs.Navigator
  screenOptions={{
    tabBarActiveTintColor: '#3c0a6b',
  }}
>
```


탭 아이콘은 `tabBarIcon`으로 설정한다.


```javascript
options={{
  tabBarIcon: ({ color, size }) => (
    <Ionicons name="home" color={color} size={size} />
  ),
}}
```


### Nested Navigators


여러 Navigator를 조합할 수 있다.


```plain text
Stack
-> DrawerNavigator
   -> Categories
   -> Favorites
-> MealsOverview
-> MealDetail
```


주의할 점:

- 각 Navigator는 자체 header를 만들 수 있다.
- 중첩하면 header가 두 개 생길 수 있다.
- 필요 없는 header는 `headerShown: false`로 숨긴다.

```javascript
<Stack.Screen
  name="Drawer"
  component={DrawerNavigator}
  options={{ headerShown: false }}
/>
```


Drawer의 콘텐츠 배경은 Stack의 `contentStyle`이 아니라 `sceneContainerStyle`을 사용한다.


### 섹션 6 체크리스트

- [ ] `NavigationContainer`와 Navigator/Screen 구조를 이해한다.
- [ ] `navigation.navigate()`로 화면 이동을 구현할 수 있다.
- [ ] `route.params`로 전달된 식별자를 읽을 수 있다.
- [ ] params와 앱 전역 상태의 차이를 구분한다.
- [ ] `screenOptions`, `options`, `navigation.setOptions()`의 차이를 안다.
- [ ] 헤더에 버튼을 추가하고 화면 내부 로직과 연결할 수 있다.
- [ ] Stack, Drawer, Bottom Tabs의 사용 목적을 구분한다.
- [ ] nested navigators에서 header 중복을 해결할 수 있다.

---


## 섹션 7. Context와 Redux로 앱 전역 상태 관리


### 한 줄 요약


여러 화면이 공유해야 하는 즐겨찾기 상태를 Context API와 Redux Toolkit 두 방식으로 구현하며, React Native에서도 앱 전역 상태 관리는 React 웹 앱에서 쓰던 Context/Redux 지식이 거의 그대로 적용됨을 확인한다.


### 왜 전역 상태가 필요한가


Meals 앱에는 두 화면이 같은 상태를 공유해야 한다.


```plain text
MealDetailScreen
-> 현재 meal을 favorite으로 추가/삭제
-> favorite 여부에 따라 별 아이콘 변경

FavoritesScreen
-> favorite meal 목록 표시
-> favorite이 없으면 empty state 표시
```


이 상태는 특정 화면에만 두면 안 된다.


```plain text
로컬 상태
-> 한 화면에서만 필요

앱 전역 상태
-> 여러 화면에서 읽고 변경
```


이번 섹션에서 관리하는 전역 상태는 favorite meal id 배열이다.


```javascript
['m1', 'm3']
```


### params와 전역 상태의 차이


```plain text
route.params
-> 현재 화면을 여는 데 필요한 작은 식별자
-> categoryId
-> mealId

app-wide state
-> 여러 화면에서 공유하고 계속 변하는 상태
-> favoriteMealIds
-> 로그인 사용자
-> 장바구니
-> 테마
```


### Context API 방식


폴더:


```plain text
store/context/favorites-context.js
```


Context 객체는 상태의 공개 API를 정의한다.


```javascript
export const FavoritesContext = createContext({
  ids: [],
  addFavorite: (id) => {},
  removeFavorite: (id) => {},
});
```


Provider는 실제 상태와 함수를 관리한다.


```javascript
function FavoritesContextProvider({ children }) {
  const [favoriteMealIds, setFavoriteMealIds] = useState([]);

  function addFavorite(id) {
    setFavoriteMealIds((currentFavIds) => [
      ...currentFavIds,
      id,
    ]);
  }

  function removeFavorite(id) {
    setFavoriteMealIds((currentFavIds) =>
      currentFavIds.filter((mealId) => mealId !== id)
    );
  }

  const value = {
    ids: favoriteMealIds,
    addFavorite,
    removeFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
```


Provider는 앱에서 필요한 범위를 감싼다.


```javascript
<FavoritesContextProvider>
  <NavigationContainer>
    ...
  </NavigationContainer>
</FavoritesContextProvider>
```


### Context 소비


`MealDetailScreen`에서 favorite 여부 계산:


```javascript
const favoriteMealsContext = useContext(FavoritesContext);

const mealIsFavorite =
  favoriteMealsContext.ids.includes(mealId);
```


토글:


```javascript
if (mealIsFavorite) {
  favoriteMealsContext.removeFavorite(mealId);
} else {
  favoriteMealsContext.addFavorite(mealId);
}
```


`FavoritesScreen`에서 원본 데이터 필터링:


```javascript
const favoriteMeals = MEALS.filter((meal) =>
  favoriteMealsContext.ids.includes(meal.id)
);
```


### MealsList 추출


`MealsOverviewScreen`과 `FavoritesScreen`이 같은 목록 UI를 쓰므로 `MealsList`로 추출한다.


```plain text
components/MealsList/MealsList.js
components/MealsList/MealItem.js
```


화면의 책임:


```plain text
MealsOverviewScreen
-> categoryId로 displayedMeals 선택
-> MealsList에 items 전달

FavoritesScreen
-> favorite ids로 favoriteMeals 선택
-> MealsList에 items 전달

MealsList
-> FlatList 렌더링

MealItem
-> 개별 meal UI와 detail 이동
```


### Empty state


즐겨찾기가 없을 때는 빈 리스트 대신 안내 문구를 보여준다.


```javascript
if (favoriteMeals.length === 0) {
  return (
    <View style={styles.rootContainer}>
      <Text style={styles.text}>
        You have no favorite meals yet.
      </Text>
    </View>
  );
}
```


### Redux Toolkit 방식


설치:


```bash
npm install @reduxjs/toolkit react-redux
```


폴더:


```plain text
store/redux/store.js
store/redux/favorites.js
```


store:


```javascript
const store = configureStore({
  reducer: {
    favoriteMeals: favoritesReducer,
  },
});
```


앱에 Provider 적용:


```javascript
<Provider store={store}>
  <NavigationContainer>
    ...
  </NavigationContainer>
</Provider>
```


favorite slice:


```javascript
const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: {
    ids: [],
  },
  reducers: {
    addFavorite: (state, action) => {
      state.ids.push(action.payload.id);
    },
    removeFavorite: (state, action) => {
      const index = state.ids.indexOf(action.payload.id);
      state.ids.splice(index, 1);
    },
  },
});
```


actions export:


```javascript
export const addFavorite = favoritesSlice.actions.addFavorite;
export const removeFavorite = favoritesSlice.actions.removeFavorite;
export default favoritesSlice.reducer;
```


### Redux 상태 읽기


```javascript
const favoriteMealIds = useSelector((state) =>
  state.favoriteMeals.ids
);
```


### Redux action dispatch


```javascript
const dispatch = useDispatch();

dispatch(addFavorite({ id: mealId }));
dispatch(removeFavorite({ id: mealId }));
```


### Context와 Redux 비교



| 항목 | Context API | Redux Toolkit |
| --- | --- | --- |
| 설치 | React 내장 | 별도 설치 필요 |
| 구조 | Context + Provider + useState | Store + Slice + Provider |
| 상태 변경 | 직접 만든 함수 호출 | action dispatch |
| 읽기 | `useContext` | `useSelector` |
| 변경 | context의 함수 | `useDispatch` |
| 적합한 경우 | 간단한 공유 상태 | 상태 규모가 크고 액션 흐름이 명확해야 하는 앱 |



### 섹션 7 체크리스트

- [ ] route params와 app-wide state의 차이를 설명할 수 있다.
- [ ] Context Provider를 어디에 배치해야 하는지 판단할 수 있다.
- [ ] Context에서 상태와 상태 변경 함수를 함께 공급할 수 있다.
- [ ] 즐겨찾기 id 배열로 원본 데이터를 필터링할 수 있다.
- [ ] 목록 UI를 `MealsList`로 추출해 재사용할 수 있다.
- [ ] Redux Toolkit의 `configureStore`, `createSlice`, `Provider` 흐름을 이해한다.
- [ ] `useSelector`로 상태를 읽고 `useDispatch`로 action을 보낼 수 있다.

---


## 전체 기술 패턴 요약


### 1. 컴포넌트와 렌더링


```plain text
HTML 태그
-> React Native 핵심 컴포넌트

CSS 파일
-> StyleSheet 객체

DOM 이벤트
-> onPress / onChangeText 등 네이티브 이벤트
```


### 2. 레이아웃


```plain text
기본 레이아웃
-> View + Flexbox

제한된 스크롤
-> ScrollView

긴 목록
-> FlatList

안전 영역
-> SafeAreaView

키보드 회피
-> KeyboardAvoidingView
```


### 3. UI 피드백


```plain text
Android 눌림
-> android_ripple

iOS 눌림
-> Pressable pressed style

아이콘
-> @expo/vector-icons

상태바
-> expo-status-bar
```


### 4. 반응형과 플랫폼


```plain text
작은 화면
-> width / maxWidth / 조건부 스타일

회전 대응
-> useWindowDimensions

가로/세로 구조 변경
-> 조건부 JSX

플랫폼 차이
-> Platform.OS / Platform.select / .ios.js / .android.js
```


### 5. 내비게이션


```plain text
앞으로/뒤로 이동
-> Native Stack

큰 섹션 전환
-> Drawer

주요 화면 탭 전환
-> Bottom Tabs

화면 데이터 전달
-> route.params

헤더 설정
-> options / screenOptions / setOptions
```


### 6. 전역 상태


```plain text
간단한 공유 상태
-> Context API

명시적 액션 기반 상태
-> Redux Toolkit

화면 열기용 식별자
-> route params

여러 화면이 공유하는 변화하는 데이터
-> global state
```


---


## 실무 관점에서 특히 중요한 판단 기준


### ScrollView와 FlatList



| 상황 | 선택 |
| --- | --- |
| 짧고 고정된 콘텐츠 | `ScrollView` |
| 길어질 수 있는 동적 목록 | `FlatList` |
| 상세 페이지 전체 스크롤 | `ScrollView` |
| 검색 결과/상품 목록/로그 | `FlatList` |



### Dimensions와 useWindowDimensions



| 상황 | 선택 |
| --- | --- |
| 앱 시작 시점 크기만 필요 | `Dimensions.get()` |
| 화면 회전/크기 변경에 반응 | `useWindowDimensions()` |
| 스타일 객체를 파일 밖에서 고정 | `Dimensions.get()` 가능 |
| 컴포넌트 렌더링마다 최신 크기 필요 | `useWindowDimensions()` |



### Params와 전역 상태



| 데이터 | 어디에 둘까? |
| --- | --- |
| `mealId` | `route.params` |
| `categoryId` | `route.params` |
| 즐겨찾기 목록 | Context/Redux |
| 로그인 사용자 | Context/Redux |
| 장바구니 | Redux 또는 Context |
| 헤더 제목 | options 또는 setOptions |



### Context와 Redux



| 상황 | 추천 |
| --- | --- |
| 작은 앱, 단순 상태 | Context |
| 여러 화면에서 몇 개 값 공유 | Context |
| 상태 변경 종류가 많음 | Redux Toolkit |
| 디버깅 가능한 action 흐름 필요 | Redux Toolkit |
| 팀에서 상태 구조를 명확히 관리해야 함 | Redux Toolkit |



---


## 최종 복습 질문

1. React Native가 `react-dom` 대신 사용하는 렌더링 대상은 무엇인가?
2. `View` 안에 문자열을 바로 넣으면 왜 문제가 되는가?
3. RN에서 `onClick` 대신 어떤 이벤트를 사용하는가?
4. `ScrollView`와 `FlatList`는 언제 구분해서 써야 하는가?
5. RN Flexbox의 기본 `flexDirection`은 웹과 어떻게 다른가?
6. Expo 개발자 메뉴는 어떻게 열 수 있는가?
7. 상태 기반 화면 전환과 React Navigation의 차이는 무엇인가?
8. `Pressable`의 `pressed` 값은 어떤 UI 피드백에 유용한가?
9. 원격 이미지를 렌더링할 때 왜 width/height가 필요한가?
10. `Dimensions.get()`과 `useWindowDimensions()`의 차이는 무엇인가?
11. 가로 모드에서는 왜 스타일뿐 아니라 JSX 구조도 바꿀 수 있는가?
12. `Platform.select()`는 어떤 상황에서 쓰는가?
13. `NavigationContainer`는 앱에서 어떤 역할을 하는가?
14. `navigation.navigate()`의 두 번째 인자는 무엇인가?
15. `route.params`는 어떤 데이터에 적합한가?
16. `screenOptions`와 `options`의 우선순위는 어떻게 되는가?
17. 동적 헤더 제목 설정에 `useLayoutEffect`를 쓰는 이유는 무엇인가?
18. Stack, Drawer, Bottom Tabs는 각각 어떤 내비게이션 패턴인가?
19. nested navigator에서 header가 두 개 생기면 어떻게 해결하는가?
20. Context는 상태 저장소인가, 전달 통로인가?
21. Redux Toolkit의 `createSlice`는 무엇을 함께 정의하는가?
22. `useSelector`와 `useDispatch`의 역할은 무엇인가?
23. favorite meal id 배열로 실제 meal 목록을 어떻게 구하는가?
24. `MealsList`처럼 화면 로직에서 목록 UI를 분리하면 어떤 장점이 있는가?

---


## 한 문장 결론


React Native 학습의 핵심은 React 문법을 다시 배우는 것이 아니라, 이미 알고 있는 React 사고방식을 모바일 네이티브 환경의 컴포넌트, 스타일, 터치, 화면 크기, 내비게이션, 전역 상태 관리 방식에 맞게 재배치하는 것이다.

