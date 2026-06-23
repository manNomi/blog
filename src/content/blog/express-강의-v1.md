---
title: "Express 강의 v1"
description: "Express"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "37a7cf19-a364-800a-9eeb-cf0ab277f86d"
---
# Node.js & Express Part 1 강의자료


## Express.js 기초부터 심화까지: 프론트엔드 개발자를 위한 서버 개발 입문


---


## 0. 강의 포지셔닝


이 강의는 단순히 Express 문법을 외우는 강의가 아닙니다.


프론트엔드 개발자가 평소에 사용하던 `fetch`, API 호출, CSR/SSR, 쿠키, 라우팅, 상태 관리 개념을 서버 관점으로 뒤집어 보면서 다음 질문에 답할 수 있게 만드는 것이 목표입니다.

> 브라우저에서 요청을 보내면, 서버 내부에서는 실제로 무슨 일이 일어나는가?

최종적으로는 Express를 사용해 회원가입, 로그인, 로그아웃, 메모 CRUD API를 직접 구현합니다.


다만 프로젝트를 바로 시작하지 않고, 먼저 **Express 없이 Node.js만으로 서버를 만들어본 뒤**, Express가 어떤 불편함을 해결해주는지 이해하는 순서로 진행합니다.


---


## 1. 수강자 전제


이 강의의 학습자는 다음과 같은 상태라고 가정합니다.

- 프론트엔드 실무 경험이 있습니다.
- `fetch`, `axios`, REST API 호출 경험이 있습니다.
- 브라우저 렌더링, 이벤트 루프, 비동기 처리, CSR/SSR 개념은 어느 정도 알고 있습니다.
- Node.js 설치, npm 사용, 간단한 CLI 조작은 할 수 있습니다.
- 하지만 Node.js 서버의 내부 동작, HTTP 요청 처리, 미들웨어, 라우터 구조, 에러 처리, 인증 흐름은 추상적으로 느껴집니다.

따라서 이 강의는 완전 입문자용 JavaScript 수업이 아니라, **프론트엔드 개발자가 서버 개발자로 사고를 확장하는 수업**으로 설계합니다.


---


## 2. 강의 전체 목표


수강 후에는 다음을 할 수 있어야 합니다.

- HTTP 요청과 응답의 구조를 설명할 수 있다.
- Node.js 기본 `http` 모듈로 서버를 만들 수 있다.
- Express가 Node.js 기본 서버의 어떤 불편함을 해결하는지 설명할 수 있다.
- `app.get`, `app.post`, `app.use`의 차이를 이해한다.
- 미들웨어 체인의 흐름과 `next()`의 의미를 설명할 수 있다.
- `req.params`, `req.query`, `req.body`, `req.cookies`를 구분해서 사용할 수 있다.
- JSON 요청과 HTML Form 요청의 차이를 이해한다.
- EJS를 사용해 서버에서 HTML을 렌더링할 수 있다.
- Router를 기능 단위로 분리할 수 있다.
- 404, 500 에러 처리 미들웨어를 구성할 수 있다.
- 회원가입, 로그인, 로그아웃, 메모 CRUD API를 직접 구현할 수 있다.

---


## 3. 강의 전체 흐름


```plain text
브라우저에서 fetch를 쓴다
        ↓
HTTP 요청이 네트워크를 타고 서버로 간다
        ↓
Node.js HTTP 서버가 요청을 받는다
        ↓
직접 라우팅하고, 직접 파일을 읽고, 직접 응답한다
        ↓
반복되는 코드가 많아진다
        ↓
Express가 라우팅, 미들웨어, 응답 처리를 추상화한다
        ↓
라우터를 기능별로 분리한다
        ↓
에러 처리와 인증 처리를 미들웨어화한다
        ↓
CRUD 프로젝트를 완성한다
```


---


## 4. Part 1의 핵심 문장

> Express는 Node.js HTTP 서버 위에서 요청 처리 흐름을 구조화해주는 얇은 프레임워크다.

Express는 마법이 아닙니다.


Node.js만으로도 서버를 만들 수 있습니다.


하지만 Node.js만 사용하면 다음 작업을 직접 처리해야 합니다.


```plain text
요청 method 확인
요청 URL 비교
정적 파일 읽기
Content-Type 설정
JSON body 파싱
Form body 파싱
라우터 분리
404 처리
500 처리
쿠키 파싱
응답 형식 통일
```


Express는 이런 반복 작업을 더 읽기 쉬운 구조로 만들어줍니다.


---


# Section 1. 여정의 시작


## 1.1 프론트엔드 개발자가 서버를 배워야 하는 이유


프론트엔드 개발자는 보통 API를 “호출하는 쪽”에서 봅니다.


```javascript
const response = await fetch('/api/memos');
const data = await response.json();
```


하지만 백엔드 관점에서는 이 요청이 다음처럼 보입니다.


```javascript
app.get('/api/memos', (req, res) => {
  res.json(memos);
});
```


즉, 프론트엔드에서 보던 `fetch()`의 반대편에 있는 코드가 바로 서버 코드입니다.


---


## 1.2 프론트엔드와 백엔드 관점 비교



| 프론트엔드 관점 | 백엔드 관점 |
| --- | --- |
| `fetch('/api/users')` | `app.get('/api/users')` |
| 요청을 보낸다 | 요청을 받는다 |
| 응답을 파싱한다 | 응답을 만든다 |
| 상태 코드를 확인한다 | 상태 코드를 결정한다 |
| 쿠키를 브라우저가 저장한다 | 쿠키를 응답 헤더로 내려준다 |
| 에러 메시지를 보여준다 | 에러 응답 형식을 설계한다 |



---


## 1.3 이 강의에서 서버를 바라보는 기준


서버는 거창한 것이 아니라 다음 일을 하는 프로그램입니다.


```plain text
요청을 받는다
  ↓
요청 정보를 읽는다
  ↓
필요한 처리를 한다
  ↓
응답 상태와 응답 본문을 만든다
  ↓
클라이언트에게 돌려준다
```


Express 서버도 결국 이 흐름에서 벗어나지 않습니다.


---


# Section 2. Pre-Express: 서버 기초부터 다지기


## 2.1 HTTP는 브라우저와 서버의 공통 언어다


브라우저와 서버는 직접 JavaScript 객체를 주고받지 않습니다.


둘 사이에서는 HTTP라는 약속된 형식으로 요청과 응답이 오갑니다.


### HTTP 요청 구조


```plain text
GET /memos?keyword=node HTTP/1.1
Host: localhost:3000
Accept: application/json
Cookie: token=abc.def.ghi
```


서버 입장에서 관심 있는 정보는 크게 네 가지입니다.


```plain text
method  → GET, POST, PUT, PATCH, DELETE
url     → /memos?keyword=node
headers → Content-Type, Cookie, Authorization ...
body    → POST/PUT/PATCH 요청에서 전달되는 데이터
```


---


### HTTP 응답 구조


```plain text
HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": 1, "content": "Node.js 공부하기" }
]
```


응답에서 중요한 정보는 다음과 같습니다.


```plain text
status code → 200, 201, 400, 401, 404, 500
headers     → Content-Type, Set-Cookie ...
body        → HTML, JSON, text, file ...
```


---


## 2.2 HTTP 메서드 이해



| 메서드 | 의미 | 예시 |
| --- | --- | --- |
| GET | 리소스 조회 | 메모 목록 조회 |
| POST | 리소스 생성 | 새 메모 작성 |
| PUT | 리소스 전체 교체 | 메모 전체 수정 |
| PATCH | 리소스 일부 수정 | 메모 내용만 수정 |
| DELETE | 리소스 삭제 | 메모 삭제 |



프론트엔드에서 다음 요청을 보냈다면:


```javascript
await fetch('/memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Express 공부하기'
  })
});
```


서버에서는 다음 라우터가 받아야 합니다.


```javascript
app.post('/memos', (req, res) => {
  const { content } = req.body;

  res.status(201).json({
    message: '메모 생성 완료',
    content
  });
});
```


---


## 2.3 HTTP 상태 코드


상태 코드는 서버가 클라이언트에게 처리 결과를 알려주는 숫자입니다.



| 상태 코드 | 의미 | 예시 |
| --- | --- | --- |
| 200 | OK | 조회 성공 |
| 201 | Created | 생성 성공 |
| 400 | Bad Request | 잘못된 입력 |
| 401 | Unauthorized | 로그인 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복 또는 충돌 |
| 500 | Internal Server Error | 서버 내부 오류 |



프론트엔드에서는 `response.ok`로 성공 여부를 확인할 수 있습니다.


```javascript
const response = await fetch('/memos');

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}
```


서버에서는 상태 코드를 직접 결정합니다.


```javascript
res.status(404).json({
  error: {
    code: 'MEMO_NOT_FOUND',
    message: '메모를 찾을 수 없습니다.'
  }
});
```


---


## 2.4 Node.js는 브라우저 밖에서 JavaScript를 실행하는 런타임이다


프론트엔드 개발자는 JavaScript를 브라우저에서 실행해왔습니다.


브라우저에서는 다음 API를 사용합니다.


```javascript
document.querySelector();
localStorage.getItem();
window.addEventListener();
fetch();
```


Node.js에서는 DOM이 없습니다.


대신 서버 프로그램을 만들기 위한 API가 있습니다.


```javascript
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
```


즉, JavaScript 언어 자체가 바뀐 것이 아니라 **실행 환경이 바뀐 것**입니다.


```plain text
JavaScript 문법
  ├─ 브라우저 런타임: DOM, BOM, Web API
  └─ Node.js 런타임: fs, http, path, process, stream
```


---


## 2.5 Node.js 이벤트 루프를 서버 관점으로 이해하기


프론트엔드 개발자는 이미 이런 경험이 있습니다.


```javascript
console.log('A');

setTimeout(() => {
  console.log('B');
}, 0);

console.log('C');
```


출력은 다음과 같습니다.


```plain text
A
C
B
```


서버에서도 비슷합니다.


다만 서버에서는 비동기 작업의 대상이 DOM 이벤트가 아니라 주로 다음입니다.


```plain text
파일 읽기
데이터베이스 조회
네트워크 요청
타이머
소켓 연결
```


서버 요청 처리 관점의 이벤트 루프는 다음과 같습니다.


```plain text
클라이언트 요청 도착
        ↓
Node.js가 request 이벤트 감지
        ↓
요청 핸들러 실행
        ↓
파일 읽기 / DB 조회 같은 비동기 작업 위임
        ↓
이벤트 루프는 다른 요청도 계속 받을 수 있음
        ↓
비동기 작업 완료
        ↓
콜백 또는 Promise 후속 작업 실행
        ↓
응답 전송
```


중요한 메시지는 다음입니다.

> Node.js는 I/O 작업을 기다리는 동안 서버 전체를 멈추지 않는다.

하지만 CPU를 오래 점유하는 동기 작업은 이벤트 루프를 막습니다.


```javascript
app.get('/slow', (req, res) => {
  const start = Date.now();

  while (Date.now() - start < 5000) {
    // 5초 동안 이벤트 루프 점유
  }

  res.send('done');
});
```


이 코드는 한 요청을 처리하는 동안 다른 요청의 처리를 지연시킬 수 있습니다.


---


## 2.6 첫 Node.js 서버 만들기


```javascript
// server.js
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });

  res.end('<h1>Hello Node Server</h1>');
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```


실행:


```bash
node server.js
```


브라우저에서 접속:


```plain text
http://localhost:3000
```


---


## 2.7 req와 res 이해


```javascript
http.createServer((req, res) => {
  // req: 클라이언트가 보낸 요청
  // res: 서버가 클라이언트에게 보낼 응답
});
```


`req`에서 읽을 수 있는 정보:


```javascript
req.method;
req.url;
req.headers;
```


`res`로 할 수 있는 일:


```javascript
res.statusCode = 200;
res.setHeader('Content-Type', 'text/plain');
res.end('Hello');
```


---


## 2.8 직접 라우팅 구현하기


라우팅은 요청의 길을 나누는 작업입니다.


```plain text
GET /          → 홈
GET /about     → 소개 페이지
GET /memos     → 메모 목록
POST /memos    → 메모 생성
```


Node.js만으로 구현하면 다음과 같습니다.


```javascript
import http from 'node:http';

const server = http.createServer((req, res) => {
  const { method, url } = req;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (method === 'GET' && url === '/') {
    res.statusCode = 200;
    res.end('<h1>홈 페이지</h1>');
    return;
  }

  if (method === 'GET' && url === '/about') {
    res.statusCode = 200;
    res.end('<h1>소개 페이지</h1>');
    return;
  }

  if (method === 'GET' && url === '/memos') {
    res.statusCode = 200;
    res.end('<h1>메모 목록</h1>');
    return;
  }

  res.statusCode = 404;
  res.end('<h1>404 Not Found</h1>');
});

server.listen(3000);
```


여기서 느껴야 할 불편함은 다음입니다.


```plain text
if 문이 계속 늘어난다.
method와 url 비교가 반복된다.
동적 URL 처리도 어렵다.
공통 로직을 넣기 어렵다.
```


바로 이 지점에서 Express의 필요성이 생깁니다.


---


## 2.9 정적 파일 직접 서빙하기


브라우저가 HTML을 받으면 HTML 안에 있는 CSS와 JS 파일을 다시 요청합니다.


```html
<link rel="stylesheet" href="/style.css"/>
<script src="/main.js"></script>
```


브라우저 요청 흐름:


```plain text
GET /
        ↓
HTML 응답
        ↓
브라우저가 HTML 파싱
        ↓
GET /style.css
GET /main.js
        ↓
CSS, JS 응답
```


Node.js로 직접 정적 파일을 서빙하면 다음과 같습니다.


```javascript
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const publicDir = path.join(process.cwd(), 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(publicDir, urlPath);

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const data = await fs.readFile(filePath);

    res.writeHead(200, {
      'Content-Type': contentType
    });

    res.end(data);
  } catch (error) {
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8'
    });

    res.end('<h1>파일을 찾을 수 없습니다</h1>');
  }
});

server.listen(3000, () => {
  console.log('http://localhost:3000');
});
```


흐름은 다음과 같습니다.


```plain text
사용자 요청: GET /style.css
        ↓
public/style.css 경로 계산
        ↓
파일 확장자 확인
        ↓
Content-Type 결정
        ↓
fs.readFile()
        ↓
파일 있음?
  ├─ YES → 200 응답 + 파일 데이터
  └─ NO  → 404 응답
```


Express에서는 이 작업을 한 줄로 처리합니다.


```javascript
app.use(express.static('public'));
```


---


# Section 3. Express 101: 웹 서버 구축 기본기


## 3.1 Express는 무엇인가?


Express는 Node.js HTTP 서버 위에서 웹 서버 개발을 편하게 해주는 프레임워크입니다.


프론트엔드 개발자 관점으로 비유하면 다음과 같습니다.


```plain text
Node.js http 모듈
  = DOM API를 직접 조작하는 느낌

Express
  = React/Vue/Svelte 같은 프레임워크를 쓰는 느낌
```


Node.js만으로도 서버를 만들 수 있습니다.


하지만 Express를 쓰면 라우팅, 미들웨어, 요청 본문 처리, 정적 파일 서빙, 에러 처리 등을 더 구조적으로 작성할 수 있습니다.


---


## 3.2 첫 Express 서버


```javascript
// src/app.js
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('<h1>Hello Express</h1>');
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```


Node.js 기본 서버와 비교해봅니다.


```javascript
// Node.js http
if (method === 'GET' && url === '/') {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello</h1>');
}
```


```javascript
// Express
app.get('/', (req, res) => {
  res.send('<h1>Hello</h1>');
});
```


Express는 “요청 method와 path를 확인해서 적절한 핸들러를 실행하는 작업”을 대신해줍니다.


---


## 3.3 라우팅


라우팅은 요청의 목적지를 정하는 작업입니다.


```javascript
app.get('/', (req, res) => {
  res.send('홈');
});

app.get('/users', (req, res) => {
  res.send('유저 목록');
});

app.post('/users', (req, res) => {
  res.send('유저 생성');
});
```


REST 관점에서는 다음과 같이 설계할 수 있습니다.


```plain text
GET    /memos       → 메모 목록 조회
GET    /memos/:id   → 메모 상세 조회
POST   /memos       → 메모 생성
PATCH  /memos/:id   → 메모 수정
DELETE /memos/:id   → 메모 삭제
```


서버에서는 이렇게 받습니다.


```javascript
app.get('/memos', getMemos);
app.get('/memos/:id', getMemo);
app.post('/memos', createMemo);
app.patch('/memos/:id', updateMemo);
app.delete('/memos/:id', deleteMemo);
```


---


## 3.4 미들웨어란?


미들웨어는 요청과 응답 사이에 끼어드는 함수입니다.


```plain text
요청
 ↓
미들웨어 1
 ↓
미들웨어 2
 ↓
라우터 핸들러
 ↓
응답
```


Express에서 미들웨어는 보통 다음 형태입니다.


```javascript
function logger(req, res, next) {
  console.log(req.method, req.url);
  next();
}
```


```javascript
app.use(logger);
```


---


## 3.5 미들웨어를 프론트엔드 개념으로 비유하기



| 프론트엔드 개념 | Express 미들웨어와의 유사점 |
| --- | --- |
| Axios interceptor | 요청/응답 사이에서 공통 처리 |
| React Router guard | 특정 페이지 진입 전 검사 |
| Next.js middleware | 요청이 라우트에 도달하기 전 처리 |
| Error Boundary | 공통 에러 처리 |



단, Express 미들웨어는 반드시 `next()` 호출 여부를 신경 써야 합니다.


```javascript
app.use((req, res, next) => {
  console.log('1번 미들웨어');
  next();
});

app.use((req, res, next) => {
  console.log('2번 미들웨어');
  next();
});

app.get('/', (req, res) => {
  res.send('홈');
});
```


요청 흐름:


```plain text
GET /
 ↓
1번 미들웨어
 ↓ next()
2번 미들웨어
 ↓ next()
GET / 라우터
 ↓
응답
```


---


## 3.6 next()를 호출하지 않으면?


```javascript
app.use((req, res, next) => {
  console.log('여기서 멈춤');
  // next() 없음
});

app.get('/', (req, res) => {
  res.send('홈');
});
```


이 경우 요청은 다음 라우터까지 도달하지 않습니다.


```plain text
GET /
 ↓
미들웨어 실행
 ↓
next() 없음
 ↓
응답도 없음
 ↓
브라우저는 계속 대기
```


미들웨어는 두 가지 중 하나를 해야 합니다.


```plain text
1. next()를 호출해서 다음 단계로 넘긴다.
2. res.send(), res.json(), res.end() 등으로 응답을 끝낸다.
```


---


## 3.7 요청 로그 미들웨어 만들기


```javascript
function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.method}${req.originalUrl}${res.statusCode} -${duration}ms`);
  });

  next();
}

app.use(requestLogger);
```


출력 예시는 다음과 같습니다.


```plain text
GET /memos 200 - 4ms
POST /memos 201 - 8ms
GET /wrong-page 404 - 1ms
```


---


## 3.8 express.static()


Part 2 이전에 꼭 이해해야 하는 것이 `express.static()`입니다.


```javascript
app.use(express.static('public'));
```


이 코드는 다음 요청들을 자동으로 처리합니다.


```plain text
GET /style.css
GET /main.js
GET /logo.png
```


폴더 구조:


```plain text
public/
  index.html
  style.css
  main.js
```


브라우저가 `/style.css`를 요청하면 Express는 `public/style.css` 파일을 찾아 응답합니다.


---


## 3.9 express.json()


프론트엔드에서 JSON을 보낼 때:


```javascript
await fetch('/memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Node.js 공부'
  })
});
```


Express에서 JSON body를 읽으려면 다음 미들웨어가 필요합니다.


```javascript
app.use(express.json());
```


이후 라우터에서 `req.body`를 사용할 수 있습니다.


```javascript
app.post('/memos', (req, res) => {
  console.log(req.body);

  res.status(201).json({
    message: '메모 생성 완료'
  });
});
```


흐름은 다음과 같습니다.


```plain text
POST /memos
Content-Type: application/json
Body: {"content":"Node.js 공부"}
        ↓
express.json()
        ↓
req.body = { content: "Node.js 공부" }
        ↓
app.post('/memos')
        ↓
res.status(201).json(...)
```


---


## 3.10 express.urlencoded()


HTML form은 기본적으로 JSON이 아니라 URL encoded 형식으로 데이터를 보낼 수 있습니다.


```html
<form method="POST" action="/login">
  <input name="username"/>
  <input name="password" type="password"/>
  <button>로그인</button>
</form>
```


서버에서는 다음 미들웨어를 사용합니다.


```javascript
app.use(express.urlencoded({ extended: true }));
```


라우터:


```javascript
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  res.send(`${username}님 로그인 시도`);
});
```


JSON 요청과 Form 요청 비교:



| 요청 종류 | Content-Type | Express 미들웨어 |
| --- | --- | --- |
| JSON API | `application/json` | `express.json()` |
| HTML Form | `application/x-www-form-urlencoded` | `express.urlencoded()` |



---


## 3.11 Params


URL path 안에 들어있는 동적 값입니다.


```javascript
app.get('/users/:userId', (req, res) => {
  const { userId } = req.params;

  res.json({
    userId
  });
});
```


요청:


```plain text
GET /users/10
```


결과:


```json
{
  "userId": "10"
}
```


주의할 점은 `req.params`의 값은 기본적으로 문자열이라는 점입니다.


```javascript
const userId = Number(req.params.userId);
```


---


## 3.12 Query String


검색, 필터, 정렬, 페이지네이션에 자주 사용합니다.


```plain text
GET /memos?keyword=node&page=1&limit=10
```


서버:


```javascript
app.get('/memos', (req, res) => {
  const { keyword, page = '1', limit = '10' } = req.query;

  res.json({
    keyword,
    page: Number(page),
    limit: Number(limit)
  });
});
```


Params와 Query String 비교:



| 구분 | 예시 | 용도 |
| --- | --- | --- |
| Params | `/memos/1` | 특정 리소스 식별 |
| Query String | `/memos?keyword=node` | 검색, 필터링, 정렬, 페이지네이션 |



---


# Section 4. Express 201: 뷰 엔진과 라우터 구조화


## 4.1 CSR과 SSR 다시 보기


프론트엔드 개발자에게 CSR/SSR은 익숙한 개념입니다.


하지만 Express를 배우면서는 이 개념을 서버 관점에서 다시 봐야 합니다.


### CSR


```plain text
브라우저
 ↓
GET /
 ↓
서버는 빈 HTML + JS 번들 전달
 ↓
브라우저가 JS 실행
 ↓
fetch로 API 요청
 ↓
화면 렌더링
```


CSR에서는 서버가 주로 JSON API를 제공합니다.


### SSR


```plain text
브라우저
 ↓
GET /memos
 ↓
서버가 데이터 조회
 ↓
서버가 HTML 완성
 ↓
브라우저는 완성된 HTML 수신
```


Express + EJS는 전통적인 SSR 방식입니다.


---


## 4.2 EJS 시작하기


설정:


```javascript
app.set('view engine', 'ejs');
app.set('views', 'src/views');
```


라우터:


```javascript
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Express 강의',
    username: '현수'
  });
});
```


`src/views/home.ejs`:


```plain text
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title><%= title %></title>
</head>
<body>
  <h1><%= username %>님, 반갑습니다.</h1>
</body>
</html>
```


EJS 렌더링 흐름:


```plain text
GET /
 ↓
app.get('/')
 ↓
res.render('home', data)
 ↓
views/home.ejs에 data 주입
 ↓
HTML 문자열 생성
 ↓
브라우저로 응답
```


---


## 4.3 EJS 기본 문법


값 출력:


```plain text
<h1><%= title %></h1>
```


조건문:


```plain text
<% if (isLoggedIn) { %>
  <p>로그인 상태입니다.</p>
<% } else { %>
  <p>로그인이 필요합니다.</p>
<% } %>
```


반복문:


```plain text
<ul>
  <% memos.forEach((memo) => { %>
    <li><%= memo.content %></li>
  <% }) %>
</ul>
```


include:


```plain text
<%- include('partials/header') %>

<main>
  <h1>메인 콘텐츠</h1>
</main>

<%- include('partials/footer') %>
```


---


## 4.4 라우터 분리


처음에는 모든 코드를 `app.js`에 작성해도 됩니다.


```javascript
app.get('/users', ...);
app.post('/users/register', ...);
app.post('/users/login', ...);
app.get('/memos', ...);
app.post('/memos', ...);
app.patch('/memos/:id', ...);
app.delete('/memos/:id', ...);
```


하지만 기능이 많아지면 `app.js`가 너무 커집니다.


그래서 기능 단위로 라우터를 분리합니다.


```plain text
src/
  app.js
  routes/
    users.route.js
    memos.route.js
  middlewares/
    auth.middleware.js
    error.middleware.js
  data/
    users.json
    memos.json
```


`src/routes/users.route.js`:


```javascript
import { Router } from 'express';

const router = Router();

router.post('/register', (req, res) => {
  res.json({ message: '회원가입' });
});

router.post('/login', (req, res) => {
  res.json({ message: '로그인' });
});

router.get('/logout', (req, res) => {
  res.json({ message: '로그아웃' });
});

export default router;
```


`src/app.js`:


```javascript
import express from 'express';
import usersRouter from './routes/users.route.js';

const app = express();

app.use(express.json());
app.use('/users', usersRouter);

app.listen(3000);
```


최종 URL은 다음과 같습니다.


```plain text
POST /users/register
POST /users/login
GET  /users/logout
```


---


## 4.5 다양한 응답 방식


문자열 또는 HTML 응답:


```javascript
res.send('문자열 응답');
```


JSON 응답:


```javascript
res.json({
  message: 'JSON 응답'
});
```


상태 코드와 JSON 응답:


```javascript
res.status(201).json({
  message: '생성 완료'
});
```


리다이렉트:


```javascript
res.redirect('/login');
```


EJS 렌더링:


```javascript
res.render('home', {
  title: '홈'
});
```


프론트엔드 개발자에게 중요한 패턴은 `res.status().json()`입니다.


```javascript
return res.status(400).json({
  error: {
    code: 'INVALID_INPUT',
    message: 'content는 필수입니다.'
  }
});
```


프론트엔드에서는 이렇게 처리할 수 있습니다.


```javascript
const response = await fetch('/memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: '' })
});

if (!response.ok) {
  const errorData = await response.json();
  alert(errorData.error.message);
}
```


---


## 4.6 쿠키


HTTP는 무상태입니다.


따라서 서버는 기본적으로 “이전 요청을 보낸 사용자가 누구였는지” 기억하지 않습니다.


그래서 쿠키를 사용합니다.


```plain text
1. 사용자가 로그인 요청
2. 서버가 로그인 성공 확인
3. 서버가 Set-Cookie 헤더로 토큰 전달
4. 브라우저가 쿠키 저장
5. 이후 요청마다 Cookie 헤더 자동 포함
6. 서버가 쿠키를 보고 사용자 식별
```


Express에서 쿠키 내려주기:


```javascript
res.cookie('token', token, {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60
});
```


쿠키 읽기:


```javascript
import cookieParser from 'cookie-parser';

app.use(cookieParser());

app.get('/me', (req, res) => {
  const token = req.cookies.token;

  res.json({ token });
});
```


---


# Section 5. Express 301: 에러 처리와 예외 대응


## 5.1 404 처리


404는 “서버가 죽었다”는 뜻이 아닙니다.


서버는 정상적으로 동작했지만, 요청한 경로에 해당하는 리소스를 찾지 못했다는 뜻입니다.


```javascript
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '요청한 리소스를 찾을 수 없습니다.'
    }
  });
});
```


중요한 점은 404 미들웨어를 라우터 등록 이후에 둬야 한다는 것입니다.


```javascript
app.use('/users', usersRouter);
app.use('/memos', memosRouter);

// 모든 라우터를 통과했는데도 응답이 없으면 404
app.use(notFoundHandler);
```


---


## 5.2 500 처리


500은 서버 내부에서 예외가 발생했을 때 사용합니다.


```javascript
app.get('/error', (req, res) => {
  throw new Error('서버 내부 오류');
});
```


Express 에러 미들웨어는 다음과 같습니다.


```javascript
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.'
    }
  });
});
```


에러 미들웨어의 특징은 인자가 4개라는 점입니다.


```plain text
(err, req, res, next)
```


일반 미들웨어와 구분되는 중요한 기준입니다.


---


## 5.3 async 에러 처리


비동기 코드에서는 `try/catch`를 사용해 에러를 `next(error)`로 넘길 수 있습니다.


```javascript
app.get('/memos', async (req, res, next) => {
  try {
    const memos = await readMemos();

    res.json(memos);
  } catch (error) {
    next(error);
  }
});
```


공통 래퍼를 만들 수도 있습니다.


```javascript
const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
```


사용:


```javascript
app.get('/memos', asyncHandler(async (req, res) => {
  const memos = await readMemos();

  res.json(memos);
}));
```


---


# Section 6. Memo 프로젝트: CRUD로 Express 완전 정복


## 6.1 프로젝트 목표


최종 프로젝트는 파일 기반 JSON 저장소를 사용하는 간단한 메모 서버입니다.


DB를 바로 도입하지 않는 이유는 다음과 같습니다.


```plain text
1. 서버 요청/응답 흐름에 집중하기 위해
2. 라우터와 미들웨어 구조를 먼저 이해하기 위해
3. CRUD의 본질을 단순한 데이터 저장소로 확인하기 위해
```


최종 기능은 다음과 같습니다.


```plain text
회원가입
로그인
로그아웃
내 정보 조회
메모 목록 조회
메모 생성
메모 수정
메모 삭제
```


---


## 6.2 프로젝트 폴더 구조


```plain text
express-memo-server/
  package.json
  src/
    app.js
    routes/
      users.route.js
      memos.route.js
    middlewares/
      auth.middleware.js
      ensure-data-file-exists.middleware.js
      error.middleware.js
    utils/
      file-db.js
      jwt.js
    data/
      users.json
      memos.json
    views/
      login.ejs
      memos.ejs
    public/
      style.css
      main.js
```


---


## 6.3 데이터 구조


`users.json`:


```json
[
  {
    "id": "u_1",
    "username": "kim",
    "password": "$2b$10$hashedPassword"
  }
]
```


`memos.json`:


```json
[
  {
    "id": "m_1",
    "userId": "u_1",
    "content": "Express 공부하기",
    "createdAt": "2026-06-09T10:00:00.000Z",
    "updatedAt": "2026-06-09T10:00:00.000Z"
  }
]
```


---


## 6.4 API 명세



| Method | URL | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/users/register` | 회원가입 | 불필요 |
| POST | `/users/login` | 로그인 | 불필요 |
| GET | `/users/logout` | 로그아웃 | 필요 |
| GET | `/users/me` | 내 정보 조회 | 필요 |
| GET | `/memos` | 내 메모 목록 조회 | 필요 |
| POST | `/memos` | 메모 생성 | 필요 |
| PATCH | `/memos/:memoId` | 메모 수정 | 필요 |
| DELETE | `/memos/:memoId` | 메모 삭제 | 필요 |



---


## 6.5 app.js


```javascript
import express from 'express';
import cookieParser from 'cookie-parser';

import usersRouter from './routes/users.route.js';
import memosRouter from './routes/memos.route.js';

import { ensureDataFileExists } from './middlewares/ensure-data-file-exists.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.static('src/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(ensureDataFileExists);

app.use('/users', usersRouter);
app.use('/memos', memosRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```


---


## 6.6 파일 DB 유틸


`src/utils/file-db.js`:


```javascript
import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data');

export async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const data = await fs.readFile(filePath, 'utf-8');

  return JSON.parse(data);
}

export async function writeJson(fileName, data) {
  const filePath = path.join(dataDir, fileName);
  const json = JSON.stringify(data, null, 2);

  await fs.writeFile(filePath, json);
}
```


---


## 6.7 데이터 파일 자동 생성 미들웨어


`src/middlewares/ensure-data-file-exists.middleware.js`:


```javascript
import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'src/data');

export async function ensureDataFileExists(req, res, next) {
  try {
    await fs.mkdir(dataDir, { recursive: true });

    const files = ['users.json', 'memos.json'];

    for (const file of files) {
      const filePath = path.join(dataDir, file);

      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, '[]');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
```


---


## 6.8 JWT 유틸


`src/utils/jwt.js`:


```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-secret';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h'
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
```


실무에서는 `JWT_SECRET`을 코드에 직접 쓰지 않고 환경 변수로 관리해야 합니다.


```plain text
.env
JWT_SECRET=...
```


---


## 6.9 인증 미들웨어


`src/middlewares/auth.middleware.js`:


```javascript
import { verifyToken } from '../utils/jwt.js';

export function authenticateUser(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.'
        }
      });
    }

    const payload = verifyToken(token);

    req.user = {
      id: payload.id,
      username: payload.username
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.'
      }
    });
  }
}
```


인증 흐름은 다음과 같습니다.


```plain text
요청 도착
 ↓
Cookie에 token 있음?
 ├─ NO  → 401 응답
 └─ YES
      ↓
   JWT 검증
      ↓
   유효함?
    ├─ NO  → 401 응답
    └─ YES
         ↓
      req.user 저장
         ↓
      next()
         ↓
      보호된 라우터 실행
```


---


## 6.10 Users Router


`src/routes/users.route.js`:


```javascript
import { Router } from 'express';
import bcrypt from 'bcrypt';

import { readJson, writeJson } from '../utils/file-db.js';
import { signToken } from '../utils/jwt.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'username과 password는 필수입니다.'
        }
      });
    }

    const users = await readJson('users.json');

    const duplicatedUser = users.find((user) => user.username === username);

    if (duplicatedUser) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATED_USERNAME',
          message: '이미 사용 중인 username입니다.'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: `u_${Date.now()}`,
      username,
      password: hashedPassword
    };

    users.push(newUser);

    await writeJson('users.json', users);

    res.status(201).json({
      message: '회원가입 성공',
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const users = await readJson('users.json');
    const user = users.find((item) => item.username === username);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '아이디 또는 비밀번호가 올바르지 않습니다.'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '아이디 또는 비밀번호가 올바르지 않습니다.'
        }
      });
    }

    const token = signToken({
      id: user.id,
      username: user.username
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60
    });

    res.json({
      message: '로그인 성공'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/logout', authenticateUser, (req, res) => {
  res.clearCookie('token');

  res.json({
    message: '로그아웃 성공'
  });
});

router.get('/me', authenticateUser, (req, res) => {
  res.json({
    user: req.user
  });
});

export default router;
```


---


## 6.11 Memos Router


`src/routes/memos.route.js`:


```javascript
import { Router } from 'express';

import { readJson, writeJson } from '../utils/file-db.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/', async (req, res, next) => {
  try {
    const memos = await readJson('memos.json');

    const myMemos = memos.filter((memo) => memo.userId === req.user.id);

    res.json({
      memos: myMemos
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'content는 필수입니다.'
        }
      });
    }

    const memos = await readJson('memos.json');

    const now = new Date().toISOString();

    const newMemo = {
      id: `m_${Date.now()}`,
      userId: req.user.id,
      content,
      createdAt: now,
      updatedAt: now
    };

    memos.push(newMemo);

    await writeJson('memos.json', memos);

    res.status(201).json({
      message: '메모 생성 성공',
      memo: newMemo
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:memoId', async (req, res, next) => {
  try {
    const { memoId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'content는 필수입니다.'
        }
      });
    }

    const memos = await readJson('memos.json');

    const memo = memos.find(
      (item) => item.id === memoId && item.userId === req.user.id
    );

    if (!memo) {
      return res.status(404).json({
        error: {
          code: 'MEMO_NOT_FOUND',
          message: '메모를 찾을 수 없습니다.'
        }
      });
    }

    memo.content = content;
    memo.updatedAt = new Date().toISOString();

    await writeJson('memos.json', memos);

    res.json({
      message: '메모 수정 성공',
      memo
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:memoId', async (req, res, next) => {
  try {
    const { memoId } = req.params;

    const memos = await readJson('memos.json');

    const memoIndex = memos.findIndex(
      (item) => item.id === memoId && item.userId === req.user.id
    );

    if (memoIndex === -1) {
      return res.status(404).json({
        error: {
          code: 'MEMO_NOT_FOUND',
          message: '메모를 찾을 수 없습니다.'
        }
      });
    }

    memos.splice(memoIndex, 1);

    await writeJson('memos.json', memos);

    res.json({
      message: '메모 삭제 성공'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```


---


## 6.12 에러 미들웨어


`src/middlewares/error.middleware.js`:


```javascript
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '요청한 경로를 찾을 수 없습니다.'
    }
  });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || '서버 내부 오류가 발생했습니다.'
    }
  });
}
```


---


# Section 7. 수업 중 반드시 강조할 포인트


## 7.1 Express는 마법이 아니다


Express는 Node.js 서버 위에서 동작합니다.


```plain text
Node.js http 서버
        ↓
Express app
        ↓
Middleware chain
        ↓
Router
        ↓
Handler
        ↓
Response
```


Express를 잘 이해하려면 Express 코드만 볼 것이 아니라, Express가 없을 때 우리가 직접 해야 했던 일을 떠올려야 합니다.


```plain text
직접 method 확인
직접 URL 비교
직접 body 파싱
직접 static 파일 읽기
직접 Content-Type 설정
직접 404 처리
직접 에러 응답 처리
```


Express는 이 반복 작업을 구조화해주는 도구입니다.


---


## 7.2 req는 요청의 정보, res는 응답을 만드는 도구


```javascript
app.post('/memos/:memoId', (req, res) => {
  console.log(req.params.memoId);
  console.log(req.query);
  console.log(req.body);
  console.log(req.cookies);

  res.status(200).json({
    message: '성공'
  });
});
```


`req`에서 읽습니다.


```plain text
req.params
req.query
req.body
req.headers
req.cookies
req.user
```


`res`로 응답합니다.


```plain text
res.send()
res.json()
res.status()
res.cookie()
res.clearCookie()
res.redirect()
res.render()
```


---


## 7.3 미들웨어 순서는 결과를 바꾼다


잘못된 순서:


```javascript
app.use('/memos', memosRouter);
app.use(express.json());
```


이렇게 쓰면 `/memos` 라우터 안에서 `req.body`를 못 읽을 수 있습니다.


올바른 순서:


```javascript
app.use(express.json());
app.use('/memos', memosRouter);
```


흐름:


```plain text
요청
 ↓
express.json()
 ↓
req.body 생성
 ↓
memosRouter
```


---


## 7.4 인증은 라우터 안에 흩뿌리지 말고 미들웨어로 분리한다


나쁜 예:


```javascript
router.get('/memos', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: '로그인 필요' });
  }

  // 메모 조회
});

router.post('/memos', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: '로그인 필요' });
  }

  // 메모 생성
});
```


좋은 예:


```javascript
router.use(authenticateUser);

router.get('/', getMemos);
router.post('/', createMemo);
router.patch('/:memoId', updateMemo);
router.delete('/:memoId', deleteMemo);
```


---


# Section 8. 학습자에게 던질 질문


수업 중간마다 다음 질문을 던지면 좋습니다.


```plain text
프론트엔드에서 fetch('/memos')를 호출하면 서버에서는 어떤 라우터가 실행될까?

req.params와 req.query는 언제 다르게 써야 할까?

express.json()을 라우터보다 뒤에 등록하면 어떤 문제가 생길까?

인증 로직을 모든 라우터에 직접 쓰면 어떤 유지보수 문제가 생길까?

404 에러와 500 에러는 무엇이 다를까?

쿠키는 서버가 저장하는 걸까, 브라우저가 저장하는 걸까?

JWT를 localStorage에 저장하는 방식과 httpOnly cookie에 저장하는 방식은 어떤 차이가 있을까?

CSR에서 API 서버는 JSON을 주고, SSR에서 서버는 HTML을 준다는 말은 어떤 의미일까?
```


---


# Section 9. Part 1 최종 정리


이 강의에서 가장 중요한 변화는 다음입니다.


처음에는 서버를 이렇게 봅니다.


```plain text
프론트엔드가 데이터를 요청하는 어딘가
```


수업이 끝나면 이렇게 보게 됩니다.


```plain text
HTTP 요청을 받아
미들웨어 체인을 통과시키고
라우터에서 비즈니스 로직을 실행한 뒤
상태 코드와 응답 본문을 설계해서 돌려주는 프로그램
```


Express는 서버 개발의 끝이 아니라 시작입니다.


이 강의의 목적은 Express 문법 암기가 아니라, 다음 구조를 머릿속에 남기는 것입니다.


```plain text
Request
  → Middleware
  → Router
  → Handler
  → Data Access
  → Response
  → Error Handler
```


이 구조가 보이면, 나중에 NestJS, Fastify, Next.js Route Handler, Remix action/loader, Hono 같은 다른 서버 프레임워크를 만나도 훨씬 빠르게 이해할 수 있습니다.


---


# Section 10. Part 2로 이어지는 연결점


Part 1에서는 Express를 이렇게 사용했습니다.


```javascript
app.use(express.json());

app.get('/memos/:id', (req, res) => {
  res.json({
    id: req.params.id
  });
});
```


Part 2에서는 이 질문으로 넘어갑니다.


```plain text
express.json()은 내부에서 req.body를 어떻게 만드는가?

app.get()은 내부적으로 무엇을 등록하는가?

req.params는 언제, 어디서 생기는가?

res.json()은 실제로 어떤 헤더와 body를 만드는가?

next()는 어떻게 다음 미들웨어를 실행하는가?

express.static()은 어떻게 파일을 찾아서 응답하는가?
```


즉, Part 1은 **Express 사용자 되기**이고, Part 2는 **Express 구현자 되기**입니다.


```plain text
Part 1: Express를 사용해 서버를 만든다.
Part 2: Express처럼 동작하는 서버 프레임워크를 직접 만든다.
```

