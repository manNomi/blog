---
title: "SVG가 DOM에 그려질때 "
description: "svg 학습"
pubDate: 2026-06-30T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "38f7cf19-a364-80e6-aec1-d8e431d75be5"
---
# **DOM 렌더링과 SVG 렌더링은 뭐가 다를까? React와 Next.js 기준으로 정리해보기**
프론트엔드 개발을 하다 보면 이런 상황을 자주 만난다.


```typescript
<img src="/logo.svg" alt="logo" />
```


이렇게 하면 잘 보이는데, 어떤 프로젝트에서는 또 이렇게 쓰고 싶어진다.


```typescript
import LogoIcon from "@/assets/logo.svg";

<LogoIcon className="text-blue-500" />;
```


그런데 이건 그냥 되지 않고 `@svgr/webpack`, `react-svg`, `vite-plugin-svgr` 같은 라이브러리나 번들러 설정이 필요할 때가 있다.


처음 보면 이상하다.


SVG는 브라우저가 원래 지원하는 거 아닌가?


왜 React에서는 SVG를 쓰려고 라이브러리를 깔아야 하지?


Next.js에서는 왜 또 설정이 다르지?


이 질문을 이해하려면 먼저 **DOM 렌더링과 SVG 렌더링의 차이**를 잡아야 한다. 다만 시작부터 한 가지를 정확히 하고 가자.


엄밀히 말하면 “DOM 렌더링 vs SVG 렌더링”은 완전히 같은 층위의 비교는 아니다. **DOM은 브라우저가 문서를 메모리상에서 표현하는 모델**이고, **SVG는 그 DOM 안에 들어올 수 있는 벡터 그래픽 마크업 언어**다. MDN도 DOM을 HTML, SVG, XML 문서를 객체 트리로 표현하고 스크립트가 접근할 수 있게 해주는 모델로 설명한다. SVG 역시 DOM, CSS, JavaScript와 함께 동작하는 XML 기반 벡터 그래픽 언어다.


그래서 더 정확한 표현은 이렇다.


일반 HTML 요소 렌더링과 inline SVG 요소 렌더링은 어떻게 다른가?


그리고 React/Next.js에서는 SVG 파일을 어떤 방식으로 다루는가?


---


## **1. DOM은 “화면에 그릴 문서 구조”다**


브라우저는 HTML을 받으면 문자열 그대로 화면에 그리지 않는다. 먼저 HTML을 파싱해서 DOM 트리를 만든다.


```html
<div class="card">
  <h1>Hello</h1>
  <button>Click</button>
</div>
```


브라우저 내부에서는 대략 이런 트리 구조가 된다.


```plain text
div.card
 ├─ h1
 │   └─ "Hello"
 └─ button
     └─ "Click"
```


이 DOM 트리에 CSSOM이 결합되고, 브라우저는 렌더 트리, 레이아웃, 페인트 같은 과정을 거쳐 실제 픽셀을 화면에 그린다. MDN은 이 과정을 “HTML, CSS, JavaScript를 화면의 픽셀로 변환하는 단계”라고 설명하며, DOM, CSSOM, render tree, layout 등이 이 경로에 포함된다고 설명한다.


일반 HTML 요소는 대체로 **박스 모델**을 기준으로 렌더링된다.


```html
<div>
  <p>문장입니다</p>
  <button>버튼</button>
</div>
```


여기서 브라우저가 주로 고민하는 것은 이런 것들이다.


```plain text
이 div의 width는 얼마인가?
p는 어느 줄에 배치되는가?
button의 높이는 얼마인가?
flex/grid/block 흐름에서 어디에 놓이는가?
```


즉 HTML DOM 렌더링은 기본적으로 **문서 흐름, 레이아웃, 박스, 텍스트, 폼 UI**에 강하다.


---


## **2. SVG는 “좌표계 안에 그리는 벡터 그래픽”이다**


반면 SVG는 문서 레이아웃보다 **그래픽**을 표현하기 위한 언어다.


```html
<svg width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="tomato" />
</svg>
```


이 SVG는 일반적인 `div`, `p`, `button`과 달리 내부에 좌표계가 있다.


```plain text
viewBox="0 0 100 100"

x: 0 ---------------- 100
y: 0
|
|
|
100
```


그리고 그 좌표계 안에서 `circle`, `rect`, `path`, `line`, `text` 같은 SVG 전용 요소를 그린다.


```html
<svg>
  <rect x="10" y="10" width="80" height="40" />
  <circle cx="50" cy="50" r="20" />
  <path d="M10 80 L90 80" />
</svg>
```


MDN은 SVG를 “2차원 벡터 그래픽을 설명하기 위한 XML 기반 마크업 언어”라고 설명하고, 어떤 크기에서도 깨끗하게 렌더링될 수 있는 이미지 포맷이라고 설명한다.


여기서 핵심은 이거다.


```plain text
HTML 요소 = 페이지 안의 박스와 문서 흐름
SVG 요소 = SVG 좌표계 안의 도형과 경로
```


`<svg>` 태그 자체는 HTML 문서 안에서 하나의 요소처럼 배치된다. 즉 바깥에서는 `width`, `height`, `display`, `margin` 같은 레이아웃 영향을 받는다. 하지만 `<svg>` 내부의 `path`, `circle`, `rect`는 일반 HTML 박스처럼 주변 문서 흐름에 참여하지 않는다. 이들은 SVG viewport 안에서 좌표와 도형 규칙에 따라 그려진다.


---


## **3. inline SVG와 SVG 이미지 파일은 다르다**


여기서 실무에서 가장 많이 헷갈리는 지점이 나온다.


SVG를 쓰는 방법은 크게 두 가지다.


첫 번째는 **이미지 파일로 쓰는 방식**이다.


```html
<img src="/logo.svg" alt="logo" />
```


두 번째는 **inline SVG로 DOM 안에 직접 넣는 방식**이다.


```html
<svg width="24" height="24" viewBox="0 0 24 24">
  <path d="..." fill="currentColor" />
</svg>
```


둘 다 화면에는 SVG가 보인다. 하지만 브라우저와 React 입장에서는 꽤 다르다.


### **SVG를 이미지로 쓰는 경우**


```typescript
<img src="/icons/search.svg" alt="search" />
```


이 경우 DOM에는 `img` 하나만 들어간다.


```html
<img src="/icons/search.svg" alt="search" />
```


SVG 파일 내부의 `path`, `circle`, `rect`는 현재 페이지의 DOM에 직접 들어와 있는 것이 아니다. 브라우저는 `/icons/search.svg`를 이미지 리소스로 불러와서 `img` 자리에 그린다.


그래서 이런 제어가 어렵다.


```css
img path {
  fill: red;
}
```


왜냐하면 현재 문서 DOM 안에는 `path`가 없기 때문이다. 그냥 `img`만 있다.


### **inline SVG로 쓰는 경우**


```typescript
<svg className="text-red-500" viewBox="0 0 24 24">
  <path d="..." fill="currentColor" />
</svg>
```


이 경우 DOM 안에 실제로 `svg`와 `path`가 들어온다.


```html
<svg class="text-red-500">
  <path fill="currentColor"></path>
</svg>
```


그래서 CSS, props, 이벤트, 애니메이션 제어가 쉬워진다.


```typescript
<SearchIcon className="text-blue-500 hover:text-red-500" />
```


단, SVG 내부의 `fill`이나 `stroke`가 `#000`, `black`처럼 하드코딩되어 있으면 `className="text-blue-500"`을 줘도 색이 안 바뀔 수 있다. 보통 아이콘 컴포넌트로 쓰려면 SVG 내부를 이렇게 맞춘다.


```typescript
<svg viewBox="0 0 24 24" fill="none">
  <path d="..." stroke="currentColor" />
</svg>
```


SVG의 `currentColor`는 `fill`, `stroke` 같은 속성이 현재 CSS `color` 값을 간접적으로 쓰게 해줄 수 있다. MDN도 SVG의 `color` 속성이 `fill`, `stroke` 등에 `currentColor` 값을 제공하는 데 쓰일 수 있다고 설명한다.


---


## **4. React에서 SVG는 특별한 게 아니라 JSX로 표현되는 DOM 요소다**


React에서는 JSX를 사용해서 HTML과 비슷한 마크업을 JavaScript 안에 작성한다. React 공식 문서도 JSX를 “JavaScript 파일 안에서 HTML 같은 마크업을 작성하게 해주는 문법 확장”이라고 설명한다.


그래서 React에서는 이런 HTML도 가능하고,


```typescript
function Button() {
  return <button>Click</button>;
}
```


이런 SVG도 가능하다.


```typescript
function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="..." fill="currentColor" />
    </svg>
  );
}
```


React 공식 문서도 React DOM이 브라우저 내장 HTML 컴포넌트와 SVG 컴포넌트를 모두 지원한다고 설명한다.


즉 React 입장에서 `<svg>`, `<path>`, `<circle>`은 이상한 문법이 아니다. 그냥 JSX로 표현 가능한 브라우저 내장 요소다.


다만 JSX에서는 HTML/SVG 속성명을 JavaScript 객체 키처럼 다루기 때문에 일부 속성명이 camelCase가 된다.


```typescript
// HTML/SVG 원본
<path stroke-width="2" fill-rule="evenodd" />

// JSX
<path strokeWidth={2} fillRule="evenodd" />
```


React 문서는 JSX에서 많은 HTML/SVG 속성이 camelCase로 작성된다고 설명하며, 예시로 `stroke-width` 대신 `strokeWidth`를 사용한다고 안내한다.


---


## **5. 그럼 왜** **`@svgr/webpack`** **같은 게 필요한가?**


여기서 중요한 구분이 나온다.


React는 이것을 이해한다.


```typescript
function Icon() {
  return (
    <svg>
      <path d="..." />
    </svg>
  );
}
```


하지만 React가 기본적으로 이것을 자동 이해하는 것은 아니다.


```typescript
import Icon from "./icon.svg";

<Icon />;
```


왜냐하면 `icon.svg`는 JavaScript 파일도 아니고 React 컴포넌트도 아니다. 그냥 SVG 파일이다.


이 파일을 import했을 때 무엇으로 해석할지는 React가 아니라 **번들러**가 결정한다.


```plain text
import icon from "./icon.svg";
```


이 코드를 번들러가 이렇게 볼 수도 있다.


```typescript
const icon = "/assets/icon.abc123.svg";
```


그러면 이렇게 써야 한다.


```typescript
<img src={icon} alt="icon" />
```


반대로 번들러가 SVG 파일을 React 컴포넌트로 변환하도록 설정되어 있다면 이렇게 쓸 수 있다.


```typescript
import Icon from "./icon.svg";

<Icon className="text-red-500" />;
```


이 변환을 해주는 대표 도구가 **SVGR**다. SVGR 공식 문서는 SVG를 React 컴포넌트로 변환하는 도구라고 설명한다.


정리하면 이렇다.


```plain text
React는 inline <svg> JSX를 렌더링할 수 있다.

하지만 .svg 파일을 import했을 때
그 파일을 URL로 볼지,
React 컴포넌트로 변환할지는
번들러 설정의 문제다.
```


---


## **6. React에서 SVG를 쓰는 대표적인 방식**


React 프로젝트에서 SVG를 쓰는 방법은 보통 네 가지다.


### **1. img 태그로 쓰기**


```typescript
function Logo() {
  return <img src="/logo.svg" alt="Company logo" />;
}
```


가장 단순하다. 로고, 일러스트, 정적인 이미지에 좋다.


장점은 별도 설정이 거의 필요 없고 브라우저 캐시도 잘 탄다는 점이다. 단점은 SVG 내부 `path` 색상이나 stroke를 React props로 제어하기 어렵다는 점이다.


---


### **2. SVG를 JSX 안에 직접 작성하기**


```typescript
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  );
}
```


이 방식은 아이콘이 작고 단순할 때 좋다. `className`, `onClick`, `aria-*`, `fill`, `stroke` 등을 직접 제어할 수 있다.


---


### **3. SVGR로 SVG 파일을 React 컴포넌트로 import하기**


```typescript
import SearchIcon from "@/assets/search.svg";

function SearchButton() {
  return (
    <button>
      <SearchIcon className="size-5 text-zinc-500" aria-hidden="true" />
      검색
    </button>
  );
}
```


아이콘 시스템을 만들 때 가장 흔한 방식이다.


디자이너가 준 `.svg` 파일을 매번 JSX로 복붙하지 않아도 되고, 컴포넌트처럼 사용할 수 있다. 대신 빌드 설정이 필요하고, SVG 마크업이 JavaScript 번들 안으로 들어올 수 있으므로 너무 크고 복잡한 SVG를 대량으로 넣는 것은 조심해야 한다.


---


### **4.** **`react-svg`****로 런타임에 SVG를 주입하기**


```typescript
import { ReactSVG } from "react-svg";

function Icon() {
  return <ReactSVG src="/icons/search.svg" />;
}
```


`react-svg`는 SVG URL을 받아 SVG 마크업을 가져온 뒤 DOM에 주입하는 방식이다. npm 문서도 이 컴포넌트가 주어진 URL에서 SVG를 fetch한 뒤 DOM에 inject한다고 설명한다.


이 방식은 외부 SVG 파일을 inline처럼 다루고 싶을 때 쓸 수 있다. 다만 런타임 fetch와 주입 과정이 있으므로, 앱 내부 아이콘 시스템에는 보통 SVGR 방식이 더 단순하다.


---


## **7. Next.js에서는 SVG를 어떻게 써야 할까?**


Next.js에서는 SVG 사용 방식이 조금 더 나뉜다.


### **1.** **`public`** **폴더에 넣고** **`img`****로 쓰기**


가장 단순한 방법이다.


```plain text
public/
  logo.svg
```


```typescript
export default function Header() {
  return <img src="/logo.svg" alt="Company logo" />;
}
```


Next.js는 `public` 디렉터리의 정적 파일을 루트 경로에서 참조할 수 있게 제공한다. 예를 들어 `public/logo.svg`는 `/logo.svg`로 접근할 수 있다.


로고, 파트너사 배너, 큰 일러스트처럼 내부 색상 제어가 필요 없는 SVG라면 이 방식이 제일 편하다.


---


### **2.** **`next/image`****로 SVG를 쓰는 경우**


Next.js에는 이미지 최적화를 위한 `<Image />` 컴포넌트가 있다.


```typescript
import Image from "next/image";

export default function Page() {
  return (
    <Image
      src="/logo.svg"
      alt="Company logo"
      width={120}
      height={40}
    />
  );
}
```


다만 SVG는 PNG/JPG처럼 리사이징해서 최적화할 대상이 아니다. SVG는 벡터 포맷이라 크기를 바꿔도 손실 없이 렌더링될 수 있고, HTML/CSS와 비슷한 기능을 포함할 수 있어 보안 이슈도 고려해야 한다. Next.js 공식 문서도 SVG를 기본적으로 최적화하지 않는 이유로 “손실 없이 리사이즈 가능한 벡터 포맷”이라는 점과 “HTML/CSS와 유사한 기능으로 인해 CSP 없이 취약점이 생길 수 있다”는 점을 든다. 또한 SVG를 다룰 때는 `unoptimized` 사용을 권장하며, `src`가 `.svg`로 끝나면 이 처리가 자동으로 적용된다고 설명한다.


실무 기준으로는 이렇게 보면 된다.


```plain text
그냥 SVG를 보여주기만 한다
→ img 태그로 충분한 경우가 많음

이미지 크기, layout shift 방지, Next Image API와 통일성이 필요하다
→ next/image 사용 가능

SVG 내부 path 색상을 바꾸고 싶다
→ next/image가 아니라 inline SVG 또는 SVGR
```


---


### **3. Next.js에서 SVGR 쓰기**


Next.js에서 SVG 파일을 React 컴포넌트처럼 쓰고 싶다면 SVGR 설정을 붙인다.


```bash
npm install --save-dev @svgr/webpack
```


그다음 `next.config.js`에서 SVG를 컴포넌트로 변환하도록 설정한다. SVGR의 Next.js 문서는 `@svgr/webpack`을 사용해 Next.js에서 SVG를 React 컴포넌트로 import하는 방법을 안내한다.


개념적으로는 이런 식이다.


```javascript
// next.config.js
module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },
};
```


다만 실제 프로젝트에서는 Next.js의 기존 이미지 로더와 충돌하지 않도록 `?url`로 import하는 경우는 파일 URL로 남기고, 나머지는 SVGR 컴포넌트로 처리하는 식의 설정을 쓰는 경우가 많다.


```typescript
import LogoUrl from "./logo.svg?url";
import SearchIcon from "./search.svg";

<img src={LogoUrl} alt="logo" />;
<SearchIcon className="size-5 text-blue-500" />;
```


이렇게 나누면 하나의 프로젝트 안에서 두 가지 방식을 같이 쓸 수 있다.


```plain text
.svg?url
→ 이미지 URL로 사용

.svg
→ React 컴포넌트로 사용
```


Next.js는 custom webpack 설정을 지원하지만, 공식 문서에서는 webpack 설정 변경이 semver 보장 대상이 아니므로 주의하라고 안내한다.


---


### **4. Turbopack을 쓰는 Next.js 프로젝트라면**


Next.js에서 Turbopack을 쓰는 경우에는 webpack 설정만으로는 개발 환경에서 기대한 대로 동작하지 않을 수 있다. 현재 Next.js 문서는 Turbopack의 `rules` 설정에서 `@svgr/webpack` loader를 사용해 `.svg` 파일을 React 컴포넌트로 import하는 예시를 제공한다. 다만 Turbopack은 webpack loader API의 핵심 subset만 구현하며, JavaScript 코드를 반환하는 loader만 지원한다고 설명한다.


예시는 이런 형태다.


```javascript
// next.config.js
module.exports = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};
```


즉 Next.js에서 SVG 컴포넌트 import가 안 될 때는 “React가 SVG를 모른다”가 아니라 보통 이 문제다.


```plain text
현재 번들러가 .svg 파일을
URL로 처리하고 있는가?
React 컴포넌트로 변환하고 있는가?
webpack 설정만 했는데 dev는 Turbopack으로 돌고 있지는 않은가?
```


---


## **8. App Router, Server Component, Client Component 관점**


Next.js App Router에서는 기본적으로 페이지와 레이아웃이 Server Component다. Next.js 공식 문서도 기본적으로 layouts와 pages가 Server Components이며, 상태, 이벤트 핸들러, 브라우저 API가 필요할 때 Client Components를 사용한다고 설명한다.


그래서 SVG 아이콘도 이렇게 생각하면 된다.


### **정적인 아이콘**


```typescript
import SearchIcon from "@/assets/search.svg";

export default function Header() {
  return (
    <div>
      <SearchIcon className="size-5 text-zinc-500" aria-hidden="true" />
      검색
    </div>
  );
}
```


이건 단순히 SVG 마크업을 렌더링하는 것이므로 Server Component에서도 사용할 수 있다.


### **이벤트가 있는 SVG**


```typescript
"use client";

import CloseIcon from "@/assets/close.svg";

export default function CloseButton() {
  return (
    <button onClick={() => console.log("close")}>
      <CloseIcon className="size-5" />
    </button>
  );
}
```


이 경우는 `onClick`이 있으므로 Client Component가 필요하다. Next.js 문서도 state, event handlers, browser-only API가 필요할 때 Client Component를 사용한다고 안내한다.


여기서 중요한 점은 SVG 자체가 Client Component를 요구하는 게 아니라는 것이다.


```plain text
정적인 SVG 렌더링
→ Server Component 가능

SVG에 onClick, hover state, animation state, useEffect 등이 붙음
→ Client Component 필요
```


---


## **9. 실무 선택 기준**


결국 SVG를 어떤 방식으로 쓸지는 “얼마나 제어해야 하는가”로 결정하면 된다.


### **단순 이미지라면**


```typescript
<img src="/logo.svg" alt="Company logo" />
```


로고, 브랜드 이미지, 큰 일러스트처럼 내부 색상이나 path를 건드릴 필요가 없다면 이게 가장 단순하다.


---


### **아이콘 시스템이라면**


```typescript
import SearchIcon from "@/icons/search.svg";

<SearchIcon className="size-5 text-zinc-500" aria-hidden="true" />;
```


버튼 아이콘, 네비게이션 아이콘, 상태별 색상 변경이 필요한 아이콘이라면 SVGR 방식이 좋다.


이때 SVG 내부는 가능하면 이렇게 관리한다.


```typescript
<path d="..." fill="currentColor" />
```


또는 stroke 아이콘이면 이렇게 한다.


```typescript
<path d="..." stroke="currentColor" />
```


그래야 Tailwind나 CSS의 `color` 값으로 아이콘 색상을 쉽게 바꿀 수 있다.


---


### **외부 SVG를 inline처럼 다뤄야 한다면**


```typescript
import { ReactSVG } from "react-svg";

<ReactSVG src="/icons/remote-icon.svg" />;
```


외부 파일을 런타임에 가져와서 DOM에 주입해야 하는 특수한 상황이라면 `react-svg` 같은 방식도 고려할 수 있다.


---


### **복잡한 차트나 그래픽이라면**


직접 SVG를 JSX로 그리거나, 차트 라이브러리의 SVG 렌더링을 사용하는 편이 낫다.


```typescript
<svg viewBox="0 0 400 200">
  <line x1="0" y1="100" x2="400" y2="100" />
  <circle cx="100" cy="80" r="4" />
  <circle cx="200" cy="40" r="4" />
  <circle cx="300" cy="120" r="4" />
</svg>
```


이 경우 SVG는 단순 이미지가 아니라 UI의 일부이자 데이터 시각화 레이어가 된다.


---


## **10. 접근성도 같이 생각하자**


SVG가 의미 있는 이미지라면 접근성 이름이 필요하다.


```typescript
<svg role="img" aria-label="검색" viewBox="0 0 24 24">
  <path d="..." />
</svg>
```


반대로 버튼 안에 텍스트가 있고 SVG가 장식용이라면 숨기는 편이 좋다.


```typescript
<button>
  <SearchIcon aria-hidden="true" />
  검색
</button>
```


ARIA의 `img` role은 여러 요소를 하나의 이미지로 인식하게 할 때 사용할 수 있고, 접근 가능한 이름을 제공하기 위해 `aria-label`을 사용할 수 있다. MDN은 텍스트 없는 SVG 아이콘 버튼 같은 경우 `aria-label`이 접근 가능한 이름을 제공하는 데 쓰일 수 있다고 설명한다.


---


## **결론**


DOM 렌더링과 SVG 렌더링의 차이를 한 문장으로 정리하면 이렇다.


```plain text
HTML DOM 렌더링은 문서와 UI 박스를 배치하는 렌더링이고,
SVG 렌더링은 좌표계 안에 벡터 도형을 그리는 렌더링이다.
```


그리고 React/Next.js에서 SVG가 헷갈리는 이유는 SVG 자체 때문이 아니라 `.svg` 파일을 어떻게 import할지의 문제다.


```plain text
<img src="/icon.svg" />
→ SVG를 이미지 파일로 사용

<svg><path /></svg>
→ SVG를 inline DOM 요소로 사용

import Icon from "./icon.svg"; <Icon />
→ SVG 파일을 React 컴포넌트로 변환해서 사용
```


그래서 실무에서는 이렇게 고르면 된다.


```plain text
로고, 일러스트, 정적 이미지
→ public + img

내부 색상, 크기, hover, props 제어가 필요한 아이콘
→ SVGR

외부 SVG를 런타임에 inline 주입해야 함
→ react-svg

Next.js에서 SVG 이미지를 next/image로 다룸
→ SVG 최적화와 보안 정책을 이해하고 사용

Next.js App Router에서 이벤트가 있는 SVG
→ Client Component 필요
```


핵심은 이거다.


SVG는 브라우저가 원래 렌더링할 수 있다.


하지만 `.svg` 파일을 React 컴포넌트처럼 쓰려면 변환 과정이 필요하다.


그 변환을 해주는 게 SVGR이고, Next.js에서는 사용하는 번들러에 맞게 설정해야 한다.

