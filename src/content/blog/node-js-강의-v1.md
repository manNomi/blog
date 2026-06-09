---
title: "Node.js 강의 v1 "
description: "Node"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "37a7cf19-a364-80e9-82f8-ce21726a1e11"
---
아래는 제공해주신 목차를 **프론트엔드 3년차 개발자**에게 맞춰 재구성한 **Node.js 내부 원리 강의자료 1차 초안**입니다.


목표는 “Node를 써본 사람”이 **브라우저 지식 → Node 런타임 → OS/I/O/메모리 → 실무 장애 대응**으로 자연스럽게 이동하도록 만드는 것입니다.


---


# **강의자료 초안**


## **프론트엔드 개발자를 위한 Node.js 내부 원리: V8, 이벤트 루프, Buffer, OS까지**


## **0. 강의 대상 정의**


이 강의의 학습자는 다음과 같은 사람입니다.


React, Next.js, Vite, npm, pnpm, ESLint, 테스트 도구 등을 사용하면서 Node.js를 매일 접하지만, Node.js를 “서버 실행기” 또는 “패키지 설치 도구” 정도로만 이해하고 있습니다. 브라우저의 렌더링, 이벤트 루프, Web API, 비동기 처리 개념은 어느 정도 알고 있지만, Node.js가 브라우저 밖에서 어떻게 파일을 읽고, 네트워크 요청을 받고, 운영체제와 통신하고, 메모리를 다루는지는 약합니다.


따라서 이 강의는 Node.js 문법 강의가 아니라, **브라우저 지식을 Node.js 내부 구조로 확장하는 강의**입니다.


---


# **1. 강의 전체 메시지**


## **한 문장 핵심**


Node.js는 “브라우저 밖으로 나온 JavaScript”가 아니라,


**V8 엔진 위에 OS, 파일 시스템, 네트워크, 메모리 제어 능력을 붙인 런타임**이다.


Node.js 공식 문서도 Node.js를 서버, 웹 앱, CLI, 스크립트를 만들 수 있는 크로스 플랫폼 JavaScript 런타임으로 설명하며, Chrome의 핵심 엔진인 V8을 브라우저 밖에서 실행한다고 설명합니다. 또한 Node.js 앱은 요청마다 새 스레드를 만들기보다 단일 프로세스와 비동기 I/O 원칙을 중심으로 동작합니다.


---


# **2. 강의 구조**


## **전체 목차**



| **파트** | **주제** | **핵심 질문** |
| --- | --- | --- |
| 1 | 브라우저를 탈출한 JavaScript | 브라우저와 Node.js는 무엇이 같고 무엇이 다른가? |
| 2 | V8, C++ 바인딩, libuv | JavaScript가 어떻게 OS 기능을 호출하는가? |
| 3 | 비동기 논블로킹과 이벤트 루프 | 왜 Node.js는 적은 스레드로 많은 요청을 처리하는가? |
| 4 | 모듈 시스템과 ESM | import/export는 실제로 어떤 경계를 만드는가? |
| 5 | Node.js 코어 모듈 | path, os, fs, http, events는 왜 중요한가? |
| 6 | NPM 생태계와 의존성 | package.json과 lockfile은 왜 실무 장애와 연결되는가? |
| 7 | EventEmitter와 사건 기반 설계 | Node.js의 많은 API는 왜 이벤트 기반인가? |
| 8 | 이진 데이터와 인코딩 | 문자열은 왜 깨지고, Buffer는 왜 필요한가? |
| 9 | Buffer와 메모리 | JS 객체와 바이너리 메모리는 어떻게 다른가? |
| 10 | 파일 시스템 자동화 프로젝트 | OS 이벤트, 파서, 큐, 디바운싱을 어떻게 결합하는가? |



---


# **3. 강의 진행 전략**


## **프론트엔드 개발자에게 맞춘 연결 방식**


이 강의에서는 매번 브라우저 지식에서 출발합니다.



| **프론트엔드에서 익숙한 것** | **Node.js에서 연결할 개념** |
| --- | --- |
| 브라우저 이벤트 루프 | Node.js 이벤트 루프 |
| Web API | Node.js Core API |
| DOM 이벤트 | EventEmitter |
| fetch, setTimeout | libuv, timers, poll, check |
| Blob, ArrayBuffer | Buffer |
| UTF-8, URL encoding | 인코딩과 디코딩 |
| Vite, Next.js dev server | http, fs, path, npm |
| 빌드 도구 설정 | package.json, ESM, dependency graph |
| 메모리 누수 디버깅 | V8 heap, external memory, Buffer |



---


# **4. 파트별 강의자료**


---


## **Part 1. 브라우저를 탈출한 JavaScript**


### **학습 목표**


수강자는 이 파트를 마친 뒤 다음을 설명할 수 있어야 합니다.


“JavaScript는 언어이고, 브라우저와 Node.js는 각각 다른 실행 환경이다.”


### **핵심 개념**


JavaScript 자체는 파일을 읽거나, 포트를 열거나, OS 정보를 가져오는 능력이 없습니다. 브라우저에서는 DOM, fetch, localStorage, Web API가 그 역할을 합니다. Node.js에서는 `fs`, `http`, `path`, `os`, `events`, `process` 같은 Node API가 그 역할을 합니다.


브라우저와 Node.js는 모두 JavaScript를 실행하지만, 제공하는 “호스트 API”가 다릅니다. Node.js는 V8 엔진을 브라우저 밖에서 실행하고, 표준 라이브러리를 통해 비동기 I/O를 제공합니다.


### **강의 슬라이드 흐름**


### **Slide 1. 우리가 Node.js를 오해하는 이유**


프론트엔드 개발자에게 Node.js는 보통 이런 모습으로 등장합니다.


```bash
npm install
npm run dev
npm run build
node server.js
```


그래서 Node.js를 “패키지 설치기” 또는 “개발 서버 실행기”처럼 느끼기 쉽습니다.


하지만 실제로 Node.js는 다음을 제어합니다.


```plain text
JavaScript 코드
  ↓
V8 엔진
  ↓
Node.js C++ 바인딩
  ↓
libuv / Core Module
  ↓
운영체제
  ↓
파일, 네트워크, 메모리, 프로세스
```


### **Slide 2. 브라우저와 Node.js 비교**



| **구분** | **브라우저** | **Node.js** |
| --- | --- | --- |
| JS 엔진 | V8, SpiderMonkey 등 | V8 |
| 주요 목적 | UI, DOM, 사용자 상호작용 | 서버, CLI, 파일 처리, 자동화 |
| 호스트 API | DOM, fetch, localStorage | fs, http, net, os, path |
| 보안 모델 | 샌드박스 중심 | OS 자원 접근 가능 |
| 대표 이벤트 | click, input, load | request, data, error, close |
| 파일 접근 | 제한적 | 직접 가능 |



### **실습 코드**


```javascript
// browser-vs-node.js

console.log(globalThis);

// 브라우저에서는 document가 있지만 Node.js에는 없다.
console.log(typeof document);

// Node.js에는 process가 있다.
console.log(process.platform);
console.log(process.version);
console.log(process.versions.v8);
```


### **강의 포인트**


프론트엔드 개발자는 브라우저에서 `window`, `document`, `fetch`, `setTimeout`을 자연스럽게 씁니다. 하지만 이들은 JavaScript 문법이 아니라 브라우저가 제공하는 기능입니다.


Node.js에서는 `window`와 `document` 대신 `process`, `Buffer`, `fs`, `http`가 등장합니다. 이 차이를 이해하면 Node.js가 갑자기 낯선 기술이 아니라, “다른 호스트 환경에서 돌아가는 JavaScript”로 보이기 시작합니다.


---


## **Part 2. V8, C++ 바인딩, libuv**


### **학습 목표**


수강자는 Node.js가 단순히 JS 엔진만으로 구성된 것이 아니라, V8과 Node Core, libuv, OS가 결합된 런타임이라는 것을 이해합니다.


### **핵심 개념**


V8은 JavaScript 코드를 컴파일하고 실행하며, 객체 메모리 할당과 가비지 컬렉션을 담당합니다. V8 공식 문서는 V8이 JavaScript 소스 코드를 컴파일하고 실행하며, 객체 메모리를 할당하고 더 이상 필요 없는 객체를 가비지 컬렉션한다고 설명합니다.


하지만 V8만으로는 파일 읽기, 네트워크 소켓, 프로세스 정보 접근 같은 일을 할 수 없습니다. 이때 Node.js의 C++ 계층과 libuv가 등장합니다. libuv는 비동기 I/O에 초점을 둔 크로스 플랫폼 라이브러리로, Node.js를 위해 개발되었고 여러 런타임에서도 사용됩니다.


### **슬라이드 흐름**


### **Slide 1. V8은 무엇을 하는가?**


```plain text
JavaScript 코드
  ↓
파싱
  ↓
바이트코드 / 최적화된 기계어
  ↓
실행
  ↓
객체 메모리 관리
  ↓
GC
```


V8의 관심사는 주로 “JavaScript 실행”입니다.


### **Slide 2. V8이 하지 않는 일**


V8은 이런 일을 직접 하지 않습니다.


```plain text
파일 열기
네트워크 포트 열기
OS 메모리 정보 가져오기
디렉터리 감시하기
프로세스 종료 코드 다루기
```


이런 일은 Node.js가 제공하는 API와 운영체제의 도움으로 이루어집니다.


### **Slide 3. Node.js 런타임 구조**


```plain text
내 JavaScript 코드
  ↓
Node.js API: fs.readFile, http.createServer, Buffer
  ↓
Node.js 내부 C++ 바인딩
  ↓
libuv
  ↓
OS syscall / kernel API
  ↓
disk, network, memory
```


### **프론트엔드 연결 설명**


브라우저에서 `fetch()`를 호출하면 실제 네트워크는 브라우저 엔진이 처리합니다.


Node.js에서 `fs.readFile()`을 호출하면 실제 파일 접근은 Node.js와 libuv, 운영체제가 처리합니다.


즉, JavaScript 코드는 “요청서”를 작성하고, 실제 일은 런타임과 OS가 합니다.


---


## **Part 3. 비동기 논블로킹과 이벤트 루프**


### **학습 목표**


수강자는 다음 오해를 바로잡아야 합니다.


“Node.js는 싱글 스레드니까 한 번에 하나밖에 못 한다.”


정확히는, JavaScript 콜백 실행은 주로 하나의 메인 흐름에서 이루어지지만, I/O 대기와 완료 통지는 OS와 libuv가 맡습니다. Node.js는 요청마다 새 스레드를 만들지 않고, 비동기 I/O 원칙으로 많은 연결을 처리할 수 있습니다.


### **핵심 개념**


Node.js 이벤트 루프에는 timers, pending callbacks, poll, check, close callbacks 같은 단계가 있습니다. Node.js 공식 문서는 이벤트 루프의 단계와 `setTimeout`, `setImmediate`, I/O 콜백의 실행 관계를 설명합니다. 특히 Node.js 20에 포함된 libuv 1.45.0 이후에는 timer 실행 위치가 바뀌어, 타이머가 poll phase 이후에만 실행됩니다. 이 때문에 Node 18과 Node 20 이상에서 `setTimeout`과 `setImmediate` 실습 결과가 달라질 수 있습니다.


### **슬라이드 흐름**


### **Slide 1. 동기 코드의 문제**


```javascript
console.log('A');

while (Date.now() < start + 5000) {
  // 5초 동안 CPU 점유
}

console.log('B');
```


이 코드는 5초 동안 메인 실행 흐름을 붙잡습니다.


서버라면 그동안 다른 요청의 콜백도 처리하기 어려워집니다.


### **Slide 2. 비동기 코드는 “나중에 실행할 콜백을 등록”한다**


```javascript
console.log('A');

setTimeout(() => {
  console.log('B');
}, 1000);

console.log('C');
```


출력:


```plain text
A
C
B
```


중요한 것은 “Node.js가 B를 까먹은 것이 아니라, 나중에 실행할 작업으로 등록했다”는 점입니다.


### **Slide 3. 이벤트 루프 6단계 개념도**


```plain text
┌──────────────────────┐
│ timers               │ setTimeout, setInterval
├──────────────────────┤
│ pending callbacks    │ 일부 시스템 콜백
├──────────────────────┤
│ idle, prepare        │ 내부 사용
├──────────────────────┤
│ poll                 │ I/O 대기 및 I/O 콜백
├──────────────────────┤
│ check                │ setImmediate
├──────────────────────┤
│ close callbacks      │ socket close 등
└──────────────────────┘
```


### **실습 코드**


```javascript
console.log('script start');

setTimeout(() => {
  console.log('setTimeout');
}, 0);

setImmediate(() => {
  console.log('setImmediate');
});

Promise.resolve().then(() => {
  console.log('promise');
});

process.nextTick(() => {
  console.log('nextTick');
});

console.log('script end');
```


### **강의 포인트**


이 실습에서 수강자는 단순히 출력 순서를 외우면 안 됩니다.


목표는 다음 질문에 답하는 것입니다.


```plain text
1. 지금 실행 중인 동기 코드는 무엇인가?
2. 나중에 실행될 콜백은 어디에 등록되는가?
3. microtask는 언제 끼어드는가?
4. I/O 안에서 setImmediate와 setTimeout의 순서는 왜 달라질 수 있는가?
5. CPU 작업은 왜 이벤트 루프를 막는가?
```


---


## **Part 4. 모듈 시스템과 ESM**


### **학습 목표**


수강자는 CommonJS, ESM, IIFE, 모듈 스코프, barrel export의 의미를 이해합니다.


Node.js 공식 문서는 CommonJS를 Node.js에서 원래 사용하던 모듈 시스템으로 설명하고, Node.js가 브라우저와 다른 JavaScript 런타임에서 사용하는 ECMAScript Modules 표준도 지원한다고 설명합니다.


또한 ESM은 JavaScript 코드를 재사용하기 위한 공식 표준 모듈 포맷이며 `import`, `export` 문으로 정의됩니다.


### **슬라이드 흐름**


### **Slide 1. 모듈이 없던 시절의 문제**


```javascript
// a.js
var count = 0;

// b.js
var count = 100;
```


브라우저에서 여러 script 파일을 전역으로 로드하면 이름 충돌이 발생할 수 있습니다.


### **Slide 2. IIFE의 등장**


```javascript
const counterModule = (() => {
  let count = 0;

  return {
    increase() {
      count += 1;
      return count;
    },
  };
})();

console.log(counterModule.increase());
```


IIFE는 전역 오염을 막고, 내부 상태를 숨깁니다.


### **Slide 3. CommonJS**


```javascript
// math.cjs
function add(a, b) {
  return a + b;
}

module.exports = { add };
```


```javascript
// app.cjs
const { add } = require('./math.cjs');

console.log(add(1, 2));
```


### **Slide 4. ESM**


```javascript
// math.js
export function add(a, b) {
  return a + b;
}
```


```javascript
// app.js
import { add } from './math.js';

console.log(add(1, 2));
```


```json
{
  "type": "module"
}
```


### **프론트엔드 연결 설명**


프론트엔드 개발자는 이미 ESM에 익숙합니다.


```javascript
import React from 'react';
import { useState } from 'react';
```


Node.js의 ESM은 이 익숙한 방식으로 서버 코드, CLI 코드, 자동화 스크립트도 구성할 수 있게 합니다.


### **실무 포인트**


Barrel export는 편리하지만, 프로젝트가 커지면 의존성 방향이 흐려질 수 있습니다.


```javascript
// index.js
export * from './user.service.js';
export * from './user.repository.js';
export * from './user.validator.js';
```


처음에는 깔끔하지만, 무분별하게 사용하면 “어디서 무엇을 가져오는지” 추적하기 어려워집니다.


강의에서는 barrel을 “무조건 쓰지 말라”가 아니라, “공개 API 경계를 만들 때만 의도적으로 쓰자”로 설명합니다.


---


## **Part 5. Node.js 코어 모듈 맛보기**


### **학습 목표**


수강자는 Node.js의 기본 모듈이 단순 유틸리티가 아니라 운영체제, 파일 시스템, 네트워크, 이벤트 구조로 들어가는 관문이라는 것을 이해합니다.


### **핵심 모듈**



| **모듈** | **역할** | **프론트엔드 연결** |
| --- | --- | --- |
| `path` | 경로 조합, 확장자, 파일명 처리 | 빌드 산출물 경로 |
| `os` | CPU, 메모리, 플랫폼 정보 | 배포 환경 진단 |
| `fs` | 파일 읽기, 쓰기, 감시 | 코드 생성기, 로그 처리 |
| `events` | 이벤트 기반 설계 | DOM 이벤트와 유사 |
| `http` | 서버 생성 | dev server, API server |



Node.js의 `fs` 모듈은 동기, 콜백, Promise 기반 형태를 모두 제공합니다.


### **실습 코드**


```javascript
import path from 'node:path';
import os from 'node:os';

console.log(path.join('src', 'components', 'Button.jsx'));
console.log(path.extname('app.test.js'));
console.log(os.platform());
console.log(os.cpus().length);
console.log(os.totalmem());
```


### **강의 포인트**


`path.join()`은 단순 문자열 합치기가 아닙니다.


Windows와 macOS/Linux의 경로 구분자는 다릅니다.


```plain text
Windows: C:\Users\name\project
Unix:    /Users/name/project
```


프론트엔드 프로젝트에서 경로 처리를 대충 하면, “내 컴퓨터에서는 되는데 CI에서는 안 되는 문제”가 생길 수 있습니다.


---


## **Part 6. NPM 생태계와 의존성 아키텍처**


### **학습 목표**


수강자는 `package.json`, `dependencies`, `devDependencies`, `package-lock.json`, SemVer의 의미를 실무 관점에서 이해합니다.


npm 공식 문서는 `package.json`의 `dependencies`가 패키지명과 버전 범위를 매핑하는 객체라고 설명하며, 테스트 도구나 트랜스파일러 같은 개발 시간 도구는 일반 dependencies가 아니라 devDependencies에 넣으라고 안내합니다.


`package-lock.json`은 npm이 `node_modules` 또는 `package.json`을 수정하는 작업에서 자동 생성되며, 이후 설치에서 동일한 dependency tree를 재현하기 위한 정보를 담습니다.


### **슬라이드 흐름**


### **Slide 1. package.json은 프로젝트의 신분증이다**


```json
{
  "name": "node-internals-class",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node src/index.js"
  },
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```


### **Slide 2. dependencies와 devDependencies**


```plain text
dependencies
  실제 런타임에 필요한 패키지
  예: express, fastify, pg

devDependencies
  개발, 테스트, 빌드에 필요한 패키지
  예: eslint, vitest, typescript
```


### **Slide 3. SemVer**


SemVer는 일반적으로 다음 형식을 사용합니다.


```plain text
MAJOR.MINOR.PATCH
```


```plain text
1.2.3
│ │ │
│ │ └─ PATCH: 버그 수정
│ └─── MINOR: 하위 호환 기능 추가
└───── MAJOR: 깨지는 변경
```


Semantic Versioning 공식 명세는 버전을 `X.Y.Z` 형태로 두고, 공개 API 변경 성격에 따라 major, minor, patch를 증가시키는 규칙을 설명합니다.


### **실무 메시지**


프론트엔드 개발자에게 의존성 관리는 빌드 속도 문제가 아닙니다.


실무에서는 다음과 직결됩니다.


```plain text
- 배포 서버에서만 빌드 실패
- 동료 컴퓨터에서만 테스트 실패
- lockfile 충돌
- minor 업데이트 후 런타임 오류
- transitive dependency 취약점
```


---


## **Part 7. EventEmitter와 사건 기반 설계**


### **학습 목표**


수강자는 EventEmitter를 단순 API가 아니라 Node.js 스타일의 핵심 설계 패턴으로 이해합니다.


Node.js의 `EventEmitter`는 `emit()`으로 이벤트를 발생시키고, 등록된 listener 함수에 인자를 전달합니다. 일반 함수 listener에서 `this`는 해당 EventEmitter 인스턴스를 가리키도록 설정됩니다.


### **브라우저 연결**


브라우저에서는 이렇게 씁니다.


```javascript
button.addEventListener('click', () => {
  console.log('clicked');
});
```


Node.js에서는 이렇게 씁니다.


```javascript
emitter.on('data', () => {
  console.log('data received');
});
```


둘 다 핵심 구조는 같습니다.


```plain text
사건 이름
  ↓
리스너 등록
  ↓
사건 발생
  ↓
리스너 실행
```


### **EventEmitter 직접 구현**


```javascript
class MyEventEmitter {
  #events = new Map();

  on(eventName, listener) {
    if (!this.#events.has(eventName)) {
      this.#events.set(eventName, []);
    }

    this.#events.get(eventName).push(listener);
    return this;
  }

  emit(eventName, ...args) {
    const listeners = this.#events.get(eventName);

    if (!listeners) {
      return false;
    }

    for (const listener of listeners) {
      listener(...args);
    }

    return true;
  }

  off(eventName, targetListener) {
    const listeners = this.#events.get(eventName);

    if (!listeners) {
      return this;
    }

    const filtered = listeners.filter(
      listener => listener !== targetListener
    );

    this.#events.set(eventName, filtered);
    return this;
  }

  once(eventName, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(eventName, wrapper);
    };

    this.on(eventName, wrapper);
    return this;
  }
}
```


### **실습**


```javascript
const emitter = new MyEventEmitter();

emitter.on('login', user => {
  console.log(`${user.name} logged in`);
});

emitter.once('boot', () => {
  console.log('server booted');
});

emitter.emit('boot');
emitter.emit('boot');

emitter.emit('login', { name: 'Jin' });
```


### **강의 포인트**


EventEmitter는 단순히 콜백 배열이 아닙니다.


관심사를 분리하는 방식입니다.


```plain text
로그인 발생
  ├─ 로그 기록
  ├─ 알림 발송
  ├─ 세션 갱신
  └─ 분석 이벤트 전송
```


로그인 로직은 “로그인 사건”만 발생시키고, 나머지는 각 listener가 담당합니다.


---


## **Part 8. 이진 데이터와 인코딩**


### **학습 목표**


수강자는 문자열, 바이트, 인코딩, 디코딩, UTF-8의 관계를 이해합니다.


### **핵심 메시지**


컴퓨터는 문자열을 직접 저장하지 않습니다.


문자열은 결국 숫자로 매핑되고, 숫자는 바이트로 저장됩니다.


```plain text
문자
  ↓
문자 코드
  ↓
인코딩 규칙
  ↓
바이트
  ↓
저장 / 전송
```


### **예시**


```javascript
const text = 'A';
const buffer = Buffer.from(text, 'utf8');

console.log(buffer);
console.log(buffer.toString('hex'));
```


출력 예시:


```plain text
<Buffer 41>
41
```


`A`는 UTF-8에서 1바이트 `0x41`로 표현됩니다.


### **한글 예시**


```javascript
const text = '가';
const buffer = Buffer.from(text, 'utf8');

console.log(buffer);
console.log(buffer.toString('hex'));
```


한글은 UTF-8에서 보통 여러 바이트로 표현됩니다.


### **강의 포인트**


프론트엔드 개발자는 보통 문자열을 화면에 출력하는 데 익숙합니다.


```javascript
element.textContent = '안녕하세요';
```


하지만 서버와 네트워크에서는 문자열이 다음 형태로 움직입니다.


```plain text
안녕하세요
  ↓ UTF-8 인코딩
EC 95 88 EB 85 95 ED 95 98 EC 84 B8 EC 9A 94
  ↓ 네트워크 전송
  ↓ UTF-8 디코딩
안녕하세요
```


인코딩과 디코딩의 규칙이 어긋나면 글자가 깨집니다.


---


## **Part 9. Buffer와 메모리**


### **학습 목표**


수강자는 Buffer를 문자열 처리 도구가 아니라, 바이너리 데이터와 메모리 제어 도구로 이해합니다.


Node.js 공식 문서는 Buffer를 고정 길이 바이트 시퀀스를 표현하는 객체로 설명하며, Buffer가 JavaScript의 `Uint8Array` 하위 클래스라고 설명합니다.


또한 Node.js의 `process.memoryUsage()`에서 `arrayBuffers`는 ArrayBuffer, SharedArrayBuffer, Node.js Buffer에 할당된 메모리를 가리키며 `external` 값에도 포함됩니다.


### **슬라이드 흐름**


### **Slide 1. 문자열과 Buffer는 다르다**


```javascript
const text = 'hello';
const buffer = Buffer.from(text);

console.log(text);
console.log(buffer);
```


```plain text
hello
<Buffer 68 65 6c 6c 6f>
```


### **Slide 2. Buffer.alloc**


```javascript
const buffer = Buffer.alloc(10);

console.log(buffer);
```


출력:


```plain text
<Buffer 00 00 00 00 00 00 00 00 00 00>
```


`Buffer.alloc()`은 초기화된 메모리를 만듭니다.


### **Slide 3. Buffer.allocUnsafe**


```javascript
const buffer = Buffer.allocUnsafe(10);

console.log(buffer);
```


`allocUnsafe()`는 더 빠를 수 있지만, 기존 메모리 내용이 남아 있을 수 있으므로 반드시 덮어써야 합니다.


```javascript
const buffer = Buffer.allocUnsafe(10);
buffer.fill(0);
```


### **메모리 관찰 실습**


```javascript
function printMemory(label) {
  const memory = process.memoryUsage();

  console.log(label, {
    rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(memory.external / 1024 / 1024) + 'MB',
    arrayBuffers: Math.round(memory.arrayBuffers / 1024 / 1024) + 'MB',
  });
}

printMemory('before');

const buffers = [];

for (let i = 0; i < 10; i += 1) {
  buffers.push(Buffer.alloc(10 * 1024 * 1024));
}

printMemory('after');
```


### **강의 포인트**


프론트엔드에서는 메모리 문제를 주로 다음처럼 봅니다.


```plain text
React 컴포넌트가 너무 많이 렌더링됨
이벤트 리스너가 해제되지 않음
DOM 노드가 GC되지 않음
```


Node.js에서는 여기에 더해 다음을 봐야 합니다.


```plain text
대용량 파일을 한 번에 Buffer로 읽음
이미지/동영상 처리 중 Buffer가 누적됨
stream 대신 readFile을 사용함
external memory가 증가함
```


---


## **Part 10. 파일 시스템과 OS 시스템 콜**


### **학습 목표**


수강자는 `fs` API를 단순 파일 읽기 함수가 아니라, 운영체제와 통신하는 창구로 이해합니다.


### **핵심 개념**


파일을 읽는다는 것은 단순히 JavaScript 함수 하나가 실행되는 일이 아닙니다.


```plain text
JavaScript: fs.readFile 요청
  ↓
Node.js 내부 API
  ↓
libuv
  ↓
운영체제
  ↓
파일 시스템
  ↓
디스크
  ↓
완료 이벤트
  ↓
콜백 또는 Promise resolve
```


### **세 가지 파일 API 스타일**


```javascript
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

// 1. callback
fs.readFile('./hello.txt', 'utf8', (error, data) => {
  if (error) {
    console.error(error);
    return;
  }

  console.log(data);
});

// 2. promise
const data = await fsPromises.readFile('./hello.txt', 'utf8');
console.log(data);

// 3. sync
const syncData = fs.readFileSync('./hello.txt', 'utf8');
console.log(syncData);
```


### **선택 기준**



| **방식** | **언제 쓰는가** | **주의점** |
| --- | --- | --- |
| Promise | 일반적인 애플리케이션 코드 | 에러 처리 필요 |
| Callback | 오래된 코드, 스트림/저수준 API와 함께 | 콜백 중첩 주의 |
| Sync | CLI 초기화, 설정 파일 로딩, 짧은 스크립트 | 서버 요청 처리 중 사용 금지 |



### **강의 포인트**


서버 요청 핸들러 안에서 sync API를 남발하면 메인 흐름을 막을 수 있습니다.


```javascript
import http from 'node:http';
import fs from 'node:fs';

const server = http.createServer((req, res) => {
  const data = fs.readFileSync('./large-file.txt', 'utf8');
  res.end(data);
});

server.listen(3000);
```


이 코드는 단순하지만, 요청이 몰리면 위험합니다.


강의에서는 “동작하는 코드”와 “운영 가능한 코드”의 차이를 강조합니다.


---


# **5. 최종 프로젝트: 자동화 커맨드 센터**


## **프로젝트 목표**


수강자는 마지막에 다음 기능을 직접 구현합니다.


```plain text
1. 특정 명령 파일을 감시한다.
2. 파일에 명령어가 추가되면 읽는다.
3. 정규표현식으로 명령을 파싱한다.
4. 명령에 따라 파일을 생성/삭제한다.
5. 연속 이벤트 폭주를 디바운싱한다.
6. 작업 큐로 race condition을 막는다.
7. 마지막 읽은 offset을 기억해 새 명령만 처리한다.
```


## **명령어 예시**


```plain text
CREATE ./output/hello.txt "Hello Node"
DELETE ./output/old.txt
APPEND ./output/log.txt "new log line"
```


## **프로젝트 구조**


```plain text
node-command-center/
  package.json
  src/
    index.js
    watcher.js
    parser.js
    queue.js
    file-actions.js
    logger.js
  commands.txt
  output/
```


## **핵심 코드 스케치**


### **parser.js**


```javascript
export function parseCommand(line) {
  const createPattern = /^CREATE\s+(.+?)\s+"(.+)"$/;
  const deletePattern = /^DELETE\s+(.+)$/;
  const appendPattern = /^APPEND\s+(.+?)\s+"(.+)"$/;

  let match = line.match(createPattern);

  if (match) {
    return {
      type: 'CREATE',
      path: match[1],
      content: match[2],
    };
  }

  match = line.match(deletePattern);

  if (match) {
    return {
      type: 'DELETE',
      path: match[1],
    };
  }

  match = line.match(appendPattern);

  if (match) {
    return {
      type: 'APPEND',
      path: match[1],
      content: match[2],
    };
  }

  return {
    type: 'UNKNOWN',
    raw: line,
  };
}
```


### **queue.js**


```javascript
export class TaskQueue {
  #queue = [];
  #running = false;

  enqueue(task) {
    this.#queue.push(task);
    this.#run();
  }

  async #run() {
    if (this.#running) {
      return;
    }

    this.#running = true;

    while (this.#queue.length > 0) {
      const task = this.#queue.shift();
      await task();
    }

    this.#running = false;
  }
}
```


### **debounce.js**


```javascript
export function debounce(callback, delay) {
  let timerId = null;

  return (...args) => {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
```


## **프로젝트에서 배우는 것**


이 프로젝트는 단순 파일 자동화가 아닙니다.


앞에서 배운 모든 내용을 연결합니다.



| **배운 내용** | **프로젝트에서의 사용** |
| --- | --- |
| 이벤트 루프 | 파일 변경 이벤트 처리 |
| EventEmitter 사고방식 | 감시자와 작업 실행 분리 |
| Buffer/인코딩 | 파일 읽기와 문자열 디코딩 |
| fs 모듈 | 생성, 삭제, 추가 쓰기 |
| OS 이벤트 | 파일 변경 감시 |
| Queue | 동시성 충돌 방지 |
| Debouncing | 이벤트 폭주 방어 |
| Regex | 명령어 파싱 |
| ESM | 모듈 구조화 |



---


# **6. 강의별 미션 구성**


## **Mission 1. 비동기 출력 순서 예측**


다음 코드의 출력 순서를 예측하고 이유를 설명합니다.


```javascript
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve().then(() => console.log('C'));

process.nextTick(() => console.log('D'));

console.log('E');
```


정답만 맞히는 것이 아니라, 다음 문장으로 설명하게 합니다.


```plain text
A와 E는 동기 코드다.
D와 C는 현재 실행 흐름 이후 우선 처리된다.
B는 timer callback이다.
```


---


## **Mission 2. EventEmitter 직접 구현**


요구사항:


```plain text
1. on(eventName, listener)
2. emit(eventName, ...args)
3. off(eventName, listener)
4. once(eventName, listener)
5. 없는 이벤트 emit 시 false 반환
```


추가 질문:


```plain text
왜 listener를 배열로 관리할까?
왜 eventName을 key로 쓰는 객체 또는 Map이 적합할까?
off를 구현할 때 순회 중 배열을 수정하면 어떤 문제가 생길까?
```


---


## **Mission 3. 깨진 문자열 복원**


```javascript
const bytes = Buffer.from([
  0xec, 0x95, 0x88,
  0xeb, 0x85, 0x95,
]);

console.log(bytes.toString('utf8'));
```


질문:


```plain text
이 바이트는 어떤 문자열인가?
왜 한글 한 글자가 여러 바이트를 차지하는가?
hex로 보면 어떤 형태인가?
```


---


## **Mission 4. 대용량 파일 처리 리팩토링**


나쁜 코드:


```javascript
const data = await fs.readFile('./large.log', 'utf8');
const lines = data.split('\n');

for (const line of lines) {
  console.log(line);
}
```


개선 방향:


```plain text
파일 전체를 한 번에 메모리에 올리지 않는다.
stream 또는 offset 기반 읽기를 고려한다.
처리 단위를 작게 나눈다.
메모리 사용량을 관찰한다.
```


---


# **7. 강의 톤앤매너**


## **피해야 할 설명**


```plain text
Node.js는 싱글 스레드라서 빠릅니다.
비동기는 그냥 나중에 실행됩니다.
Buffer는 문자열 변환할 때 씁니다.
NPM은 패키지 설치 도구입니다.
EventEmitter는 이벤트 등록하는 객체입니다.
```


## **권장 설명**


```plain text
Node.js는 요청마다 스레드를 늘리는 방식 대신, 이벤트 루프와 비동기 I/O로 대기 시간을 관리합니다.
비동기는 “실행을 미루는 것”이 아니라, 런타임과 OS에게 작업을 위임하고 완료 시점에 콜백을 다시 스케줄링하는 방식입니다.
Buffer는 문자열 도구가 아니라 바이트 배열을 다루는 저수준 데이터 구조입니다.
NPM은 코드 설치기가 아니라 의존성 그래프와 실행 환경을 고정하는 생태계 도구입니다.
EventEmitter는 관심사를 분리하는 사건 기반 설계의 기본 단위입니다.
```


---


# **8. 첫 강의 오프닝 스크립트**


여러분은 이미 Node.js를 많이 써봤습니다.


`npm install`도 해봤고, `npm run dev`도 해봤고, Next.js나 Vite 서버도 실행해봤을 겁니다.


그런데 질문을 하나 해보겠습니다.


`fs.readFile()`을 호출하면 JavaScript가 직접 하드디스크를 읽을까요?


`setTimeout()`의 콜백은 어디에 있다가 다시 실행될까요?


`Buffer.alloc(1GB)`를 하면 V8 heap이 터지는 걸까요, 아니면 OS 메모리가 먼저 압박을 받을까요?


이 질문에 답할 수 있어야 Node.js를 “사용하는 사람”에서 “통제하는 사람”으로 넘어갈 수 있습니다.


이 강의에서는 Node.js 문법을 새로 배우지 않습니다.


대신 여러분이 이미 알고 있는 JavaScript와 브라우저 이벤트 루프 지식을 바탕으로, Node.js가 운영체제와 어떻게 대화하는지, 파일과 네트워크와 메모리를 어떻게 다루는지 끝까지 추적해보겠습니다.


---


# **9. 전체 강의의 최종 학습 성과**


수강자는 강의 후 다음을 설명할 수 있어야 합니다.


```plain text
1. Node.js와 브라우저 런타임의 차이
2. V8이 하는 일과 하지 않는 일
3. libuv와 이벤트 루프가 필요한 이유
4. setTimeout, setImmediate, Promise, process.nextTick의 실행 순서 차이
5. CommonJS와 ESM의 차이
6. package.json과 package-lock.json의 역할
7. EventEmitter를 직접 구현할 수 있는 이유
8. 문자열, 바이트, 인코딩, UTF-8의 관계
9. Buffer가 메모리에 미치는 영향
10. fs의 sync, callback, promise API 선택 기준
11. 파일 감시, 파싱, 큐, 디바운싱을 결합한 자동화 시스템 설계
```


---


# **10. 정리**


이 강의의 핵심은 Node.js API를 많이 외우는 것이 아닙니다.


핵심은 다음 흐름을 머릿속에 그리는 것입니다.


```plain text
내 JavaScript 코드
  ↓
V8이 실행
  ↓
Node.js API 호출
  ↓
C++ 바인딩 / libuv
  ↓
운영체제
  ↓
파일, 네트워크, 메모리
  ↓
완료 이벤트
  ↓
이벤트 루프
  ↓
콜백 / Promise 재실행
```


프론트엔드 개발자에게 Node.js 내부 원리를 가르칠 때 가장 좋은 접근은 “서버 개발자가 되어라”가 아닙니다.


더 좋은 접근은 이것입니다.


브라우저에서 이미 알고 있던 런타임 감각을


운영체제와 메모리까지 확장하자.

