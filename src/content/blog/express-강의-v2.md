---
title: "Express 강의 v2"
description: "Express"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "37a7cf19-a364-80cd-baeb-c444b8828fbb"
---
# Node.js & Express Part 2 강의자료


## Express.js 엔진 내부 동작 원리와 MyExpress 클론 프로젝트


---


## 0. 강의 포지셔닝


Part 1이 **Express를 사용하는 법**을 배우는 과정이었다면, Part 2는 **Express처럼 동작하는 미니 웹 프레임워크를 직접 구현하는 과정**입니다.


이 강의의 핵심 질문은 다음입니다.

> `app.get()`, `app.use()`, `next()`, `req.params`, `res.json()`, `express.static()`은 내부적으로 어떻게 동작할까?

Express는 마법이 아닙니다.


Node.js의 `http` 서버 위에 올라간 **라우팅, 미들웨어, 요청/응답 확장, 정적 파일 처리, 에러 처리 추상화 계층**입니다.


이 강의에서는 그 추상화 계층을 직접 만들어봅니다.


---


## 1. Part 1과 Part 2의 차이


### Part 1: Express 사용자 되기


Part 1에서는 Express를 사용해 서버를 구현했습니다.


```javascript
app.use(express.json());

app.get('/memos', (req, res) => {
  res.json({ memos: [] });
});
```


주요 학습 내용은 다음과 같습니다.

- HTTP 요청/응답 이해
- Node.js 기본 HTTP 서버 구현
- Express 라우팅 사용
- 미들웨어 사용
- JSON/Form 데이터 처리
- Params/Query String 처리
- Router 분리
- 에러 처리
- CRUD 프로젝트 구현

---


### Part 2: Express 구현자 되기


Part 2에서는 Express처럼 동작하는 구조를 직접 구현합니다.


```javascript
const app = myExpress();

app.use(myExpress.json());

app.get('/memos/:id', (req, res) => {
  res.json({
    memoId: req.params.id
  });
});

app.listen(3000);
```


주요 학습 내용은 다음과 같습니다.

- `app` 객체 직접 만들기
- `app.use()` 구현
- `app.get()`, `app.post()` 구현
- 미들웨어 체인 구현
- `next()` 구현
- 에러 미들웨어 구현
- `req.params` 구현
- `req.body` 구현
- `res.status()`, `res.json()`, `res.send()` 구현
- 정적 파일 서버 구현
- `Router` 객체 구현
- 템플릿 렌더링 구현
- 보안 처리와 테스트 자동화 구현

---


## 2. 강의 전체 메시지


이 강의의 중심 문장은 다음입니다.

> Express는 결국 “요청을 받아서 등록된 함수 목록을 순서대로 실행하는 엔진”이다.

이를 코드 관점으로 보면 다음과 같습니다.


```plain text
요청이 들어온다
  ↓
등록된 layer 목록을 앞에서부터 확인한다
  ↓
현재 요청과 path/method가 맞는 layer를 찾는다
  ↓
일반 미들웨어면 실행한다
  ↓
라우트 핸들러면 실행한다
  ↓
next()가 호출되면 다음 layer로 이동한다
  ↓
에러가 발생하면 에러 미들웨어만 찾는다
  ↓
응답이 끝나면 흐름이 종료된다
```


---


## 3. 전체 아키텍처


```plain text
┌────────────────────────────────────────────┐
│              Browser / Client               │
│ fetch('/users/1')                           │
└──────────────────────┬─────────────────────┘
                       │ HTTP Request
                       ▼
┌────────────────────────────────────────────┐
│              Node.js http Server            │
│ http.createServer((req, res) => {})         │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│                MyExpress app                │
│ app(req, res)                               │
│ app.use() / app.get() / app.listen()        │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│          Router / Middleware Stack          │
│ [logger]                                    │
│ [jsonParser]                                │
│ [static]                                    │
│ [GET /users/:id]                            │
│ [errorHandler]                              │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│              Handler 실행                   │
│ req.params                                  │
│ req.body                                    │
│ res.status().json()                         │
└────────────────────────────────────────────┘
```


---


## 4. Express 사용 코드와 MyExpress 구현 목표 비교



| Express에서 쓰던 것 | MyExpress에서 직접 만들 것 |
| --- | --- |
| `express()` | `createApplication()` |
| `app.listen()` | `http.createServer(app).listen()` |
| `app.use()` | 미들웨어 stack 등록 |
| `app.get()` | method/path 기반 route 등록 |
| `next()` | 다음 layer로 이동하는 dispatcher |
| `req.params` | 동적 URL 매칭 결과 저장 |
| `req.query` | URL query string 파싱 |
| `req.body` | 요청 body stream 파싱 |
| `res.status()` | `res.statusCode` 래핑 |
| `res.json()` | `JSON.stringify()` + Content-Type |
| `res.send()` | 문자열/객체/Buffer 응답 처리 |
| `express.static()` | 파일 읽기 + MIME + 보안 검사 |
| `express.Router()` | 독립적인 router stack |
| 에러 미들웨어 | `(err, req, res, next)` 체인 |



---


# Section 1. MyExpress 워밍업


## 1.1 요청과 응답 구조 이해


프론트엔드에서 보던 API 호출은 다음과 같습니다.


```javascript
const response = await fetch('/users/1');
const data = await response.json();
```


서버 입장에서는 다음 정보가 들어옵니다.


```plain text
method: GET
url: /users/1
headers: ...
body: 없음
```


Node.js 기본 서버는 다음처럼 만들 수 있습니다.


```javascript
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(req.method);
  console.log(req.url);
  console.log(req.headers);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Hello Server');
});

server.listen(3000);
```


여기서 중요한 점은 `req`와 `res`가 단순 객체가 아니라 **stream 기반 객체**라는 점입니다.


요청 body는 한 번에 완성된 객체로 들어오지 않습니다.


`data` 이벤트로 조각 단위로 들어오고, `end` 이벤트가 발생해야 전체 body를 다 받은 것입니다.


---


## 1.2 직접 라우팅 구현하기


처음에는 이렇게 구현할 수 있습니다.


```javascript
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.end('Home');
    return;
  }

  if (req.method === 'GET' && req.url === '/users') {
    res.end('Users');
    return;
  }

  if (req.method === 'POST' && req.url === '/users') {
    res.end('Create User');
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});
```


이 코드는 작동하지만 문제가 있습니다.

- 라우트가 많아질수록 `if` 문이 계속 늘어납니다.
- method와 path 비교가 반복됩니다.
- 동적 라우팅 처리가 어렵습니다.
- 공통 로직을 넣기 어렵습니다.
- 에러 처리가 흩어집니다.

그래서 라우터 테이블을 만듭니다.


```javascript
const routes = [
  {
    method: 'GET',
    path: '/',
    handler: (req, res) => {
      res.end('Home');
    }
  },
  {
    method: 'GET',
    path: '/users',
    handler: (req, res) => {
      res.end('Users');
    }
  }
];
```


요청이 들어오면 배열에서 맞는 route를 찾습니다.


```javascript
function handleRequest(req, res) {
  const route = routes.find((item) => {
    return item.method === req.method && item.path === req.url;
  });

  if (!route) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  route.handler(req, res);
}
```


이 구조가 Express 라우터의 출발점입니다.


---


## 1.3 `app.get()` 만들기


사용자는 배열을 직접 만지지 않고 다음처럼 쓰고 싶어합니다.


```javascript
app.get('/users', (req, res) => {
  res.end('Users');
});
```


이를 위해 `app.get()`은 내부적으로 route table에 데이터를 추가하는 함수가 됩니다.


```javascript
function createApp() {
  const routes = [];

  function app(req, res) {
    const route = routes.find((item) => {
      return item.method === req.method && item.path === req.url;
    });

    if (!route) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    route.handler(req, res);
  }

  app.get = function get(path, handler) {
    routes.push({
      method: 'GET',
      path,
      handler
    });
  };

  return app;
}
```


사용 예시는 다음과 같습니다.


```javascript
const app = createApp();

app.get('/', (req, res) => {
  res.end('Home');
});

http.createServer(app).listen(3000);
```


핵심은 다음입니다.


```plain text
app.get()은 요청을 처리하는 함수가 아니다.
app.get()은 요청이 들어왔을 때 실행할 handler를 미리 등록하는 함수다.
```


---


# Section 2. 미들웨어 체인 구현


## 2.1 미들웨어의 본질


Express에서 미들웨어는 요청과 응답 사이를 지나가는 함수입니다.


```javascript
app.use((req, res, next) => {
  console.log('logger');
  next();
});

app.get('/', (req, res) => {
  res.send('home');
});
```


흐름은 다음과 같습니다.


```plain text
GET /
  ↓
logger middleware
  ↓ next()
GET / handler
  ↓
response
```


프론트엔드 관점에서는 Axios interceptor나 Next.js middleware와 비슷하게 볼 수 있습니다.

- 요청 전 공통 처리
- 인증 검사
- 로그 기록
- body 파싱
- 응답 전후 처리
- 에러 변환

---


## 2.2 `next()` 구현하기


가장 중요한 부분입니다.


미들웨어 체인은 결국 **배열과 인덱스**입니다.


```javascript
const stack = [
  loggerMiddleware,
  jsonParserMiddleware,
  routeHandler
];
```


`next()`는 현재 인덱스를 하나 증가시키고 다음 함수를 실행합니다.


```javascript
function runMiddlewares(req, res, stack) {
  let index = 0;

  function next() {
    const middleware = stack[index];

    index += 1;

    if (!middleware) {
      return;
    }

    middleware(req, res, next);
  }

  next();
}
```


이것이 미들웨어 체인의 핵심입니다.


```plain text
next()
  = 다음 함수 실행 버튼
```


---


## 2.3 `next()`를 호출하지 않으면?


```javascript
app.use((req, res, next) => {
  console.log('여기서 멈춤');
});

app.get('/', (req, res) => {
  res.send('home');
});
```


흐름은 다음과 같습니다.


```plain text
GET /
  ↓
첫 번째 미들웨어 실행
  ↓
next() 없음
  ↓
라우터까지 도달하지 않음
  ↓
응답도 없으면 브라우저는 계속 대기
```


미들웨어는 둘 중 하나를 해야 합니다.


```plain text
1. next()로 다음 단계에 넘긴다.
2. res.end(), res.send(), res.json()으로 응답을 끝낸다.
```


---


## 2.4 req와 res를 미들웨어에서 조작하기


미들웨어는 `req`와 `res`를 가공할 수 있습니다.


```javascript
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.get('/', (req, res) => {
  res.end(`요청 시간:${req.requestTime}`);
});
```


인증 미들웨어도 같은 원리입니다.


```javascript
app.use((req, res, next) => {
  req.user = {
    id: 1,
    name: 'Kim'
  };

  next();
});

app.get('/me', (req, res) => {
  res.end(`Hello${req.user.name}`);
});
```


즉, `req.user`, `req.body`, `req.params`는 처음부터 존재하는 것이 아니라 미들웨어나 라우터 매칭 과정에서 추가되는 값입니다.


---


# Section 3. MyExpress 코어 설계


## 3.1 createApplication 설계


목표 사용 코드는 다음과 같습니다.


```javascript
import myExpress from './my-express/index.js';

const app = myExpress();

app.use(myExpress.json());

app.get('/', (req, res) => {
  res.send('Hello MyExpress');
});

app.listen(3000, () => {
  console.log('Server running');
});
```


이를 만들기 위해 `myExpress()`는 app 객체를 반환해야 합니다.


```javascript
// my-express/create-application.js
import http from 'node:http';
import { createRouter } from './router.js';
import { enhanceResponse } from './response.js';

export function createApplication() {
  const router = createRouter();
  const settings = new Map();

  function app(req, res) {
    enhanceResponse(res, settings);
    router.handle(req, res);
  }

  app.use = function use(path, ...handlers) {
    router.use(path, ...handlers);
    return app;
  };

  app.get = function get(path, ...handlers) {
    router.route('GET', path, handlers);
    return app;
  };

  app.post = function post(path, ...handlers) {
    router.route('POST', path, handlers);
    return app;
  };

  app.patch = function patch(path, ...handlers) {
    router.route('PATCH', path, handlers);
    return app;
  };

  app.delete = function remove(path, ...handlers) {
    router.route('DELETE', path, handlers);
    return app;
  };

  app.set = function set(key, value) {
    settings.set(key, value);
    return app;
  };

  app.getSetting = function getSetting(key) {
    return settings.get(key);
  };

  app.listen = function listen(port, callback) {
    const server = http.createServer(app);
    return server.listen(port, callback);
  };

  return app;
}
```


핵심은 `app`이 객체처럼 보이지만 사실 함수라는 점입니다.


```javascript
function app(req, res) {
  router.handle(req, res);
}
```


Node.js HTTP 서버는 요청이 들어올 때 이 app 함수를 실행합니다.


```javascript
http.createServer(app);
```


---


## 3.2 HTTP 메서드 자동 바인딩


`get`, `post`, `patch`, `delete`를 매번 직접 만들면 반복됩니다.


```javascript
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

for (const method of methods) {
  app[method.toLowerCase()] = function register(path, ...handlers) {
    router.route(method, path, handlers);
    return app;
  };
}
```


이렇게 하면 다음 API를 만들 수 있습니다.


```javascript
app.get('/users', getUsers);
app.post('/users', createUser);
app.patch('/users/:id', updateUser);
app.delete('/users/:id', deleteUser);
```


---


# Section 4. Router 구현


## 4.1 Layer 개념


Express의 핵심 구조를 단순화하면 `Layer` 배열입니다.


```plain text
stack = [
  Layer { type: 'middleware', path: '/', handler: logger },
  Layer { type: 'middleware', path: '/', handler: jsonParser },
  Layer { type: 'route', method: 'GET', path: '/users/:id', handler: getUser },
  Layer { type: 'error', path: '/', handler: errorHandler }
]
```


각 Layer는 다음 정보를 가집니다.


```javascript
{
  type: 'route' | 'middleware',
  method: 'GET',
  path: '/users/:id',
  handler: Function
}
```


---


## 4.2 createRouter 기본 구조


```javascript
// my-express/router.js
import { matchPath } from './utils/match-path.js';

export function createRouter() {
  const stack = [];

  function use(path, ...handlers) {
    if (typeof path === 'function') {
      handlers = [path];
      path = '/';
    }

    for (const handler of handlers) {
      stack.push({
        type: 'middleware',
        method: null,
        path,
        handler
      });
    }
  }

  function route(method, path, handlers) {
    for (const handler of handlers) {
      stack.push({
        type: 'route',
        method,
        path,
        handler
      });
    }
  }

  function handle(req, res) {
    let index = 0;

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;

    req.path = pathname;
    req.query = Object.fromEntries(requestUrl.searchParams.entries());

    function next(error) {
      const layer = stack[index];
      index += 1;

      if (!layer) {
        if (error) {
          res.statusCode = error.statusCode || 500;
          res.end(error.message || 'Internal Server Error');
          return;
        }

        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const matched = matchLayer(layer, req, pathname);

      if (!matched) {
        next(error);
        return;
      }

      const isErrorHandler = layer.handler.length === 4;

      if (error) {
        if (!isErrorHandler) {
          next(error);
          return;
        }

        layer.handler(error, req, res, next);
        return;
      }

      if (isErrorHandler) {
        next();
        return;
      }

      try {
        const result = layer.handler(req, res, next);

        if (result && typeof result.then === 'function') {
          result.catch(next);
        }
      } catch (err) {
        next(err);
      }
    }

    next();
  }

  function matchLayer(layer, req, pathname) {
    if (layer.type === 'middleware') {
      return pathname.startsWith(layer.path);
    }

    if (layer.method !== req.method) {
      return false;
    }

    const result = matchPath(layer.path, pathname);

    if (!result.matched) {
      return false;
    }

    req.params = result.params;
    return true;
  }

  return {
    use,
    route,
    handle
  };
}
```


이 코드에서 가장 중요한 흐름은 다음입니다.


```plain text
next(error)
  ↓
다음 layer를 꺼낸다
  ↓
path/method가 맞는지 확인한다
  ↓
error가 있으면 에러 미들웨어만 실행한다
  ↓
error가 없으면 일반 미들웨어/라우터만 실행한다
  ↓
handler가 Promise를 반환하면 catch(next)를 붙인다
```


---


# Section 5. 동적 라우팅과 req.params 구현


## 5.1 목표


사용자는 이렇게 작성하고 싶어합니다.


```javascript
app.get('/users/:id', (req, res) => {
  res.json({
    userId: req.params.id
  });
});
```


요청은 다음과 같습니다.


```plain text
GET /users/10
```


결과는 다음과 같습니다.


```json
{
  "userId": "10"
}
```


---


## 5.2 matchPath 구현


```javascript
// my-express/utils/match-path.js
export function matchPath(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return {
      matched: false,
      params: {}
    };
  }

  const params = {};

  for (let i = 0; i < patternParts.length; i += 1) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return {
        matched: false,
        params: {}
      };
    }
  }

  return {
    matched: true,
    params
  };
}
```


테스트:


```javascript
console.log(matchPath('/users/:id', '/users/10'));
```


결과:


```javascript
{
  matched: true,
  params: {
    id: '10'
  }
}
```


---


## 5.3 프론트엔드 개발자 관점 설명


프론트엔드 라우터에서도 다음 패턴을 자주 사용합니다.


```plain text
/users/:id
```


React Router에서도 `/users/:id`는 실제 URL `/users/10`과 매칭되고 `id = 10`을 뽑아냅니다.


Express도 본질적으로 같은 일을 합니다.


```plain text
패턴: /users/:id
요청: /users/10
결과: req.params.id = "10"
```


---


# Section 6. res 객체 확장


## 6.1 Node.js 기본 응답


Node.js 기본 응답은 다음처럼 씁니다.


```javascript
res.statusCode = 200;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ message: 'ok' }));
```


Express에서는 이렇게 씁니다.


```javascript
res.status(200).json({ message: 'ok' });
```


Part 2에서는 이 편의 메서드를 직접 만듭니다.


---


## 6.2 res.status(), res.json(), res.send()


```javascript
// my-express/response.js
export function enhanceResponse(res, settings) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.set = function set(name, value) {
    res.setHeader(name, value);
    return res;
  };

  res.json = function json(data) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    res.end(JSON.stringify(data));
  };

  res.send = function send(body) {
    if (Buffer.isBuffer(body)) {
      res.end(body);
      return;
    }

    if (typeof body === 'object') {
      res.json(body);
      return;
    }

    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }

    res.end(String(body));
  };
}
```


사용 예시는 다음과 같습니다.


```javascript
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Hello MyExpress'
  });
});
```


핵심은 다음입니다.


```plain text
res.json()
  = Content-Type 설정
  + JSON.stringify()
  + res.end()
```


---


# Section 7. JSON Body Parser 구현


## 7.1 프론트엔드 요청


```javascript
await fetch('/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Kim'
  })
});
```


서버에서는 `req.body`가 자동으로 생기지 않습니다.


Node.js의 request body는 stream으로 들어옵니다.


따라서 `data` 이벤트로 chunk를 모으고, `end` 이벤트가 발생했을 때 JSON으로 파싱해야 합니다.


---


## 7.2 body 읽기 유틸


```javascript
// my-express/utils/read-body.js
export function readBody(req, options = {}) {
  const limit = options.limit ?? 1024 * 1024;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;

    req.on('data', (chunk) => {
      received += chunk.length;

      if (received > limit) {
        const error = new Error('Payload Too Large');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      resolve(body);
    });

    req.on('error', reject);
  });
}
```


---


## 7.3 json 미들웨어


```javascript
// my-express/middlewares/json.js
import { readBody } from '../utils/read-body.js';

export function json(options = {}) {
  return async function jsonParser(req, res, next) {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('application/json')) {
      next();
      return;
    }

    try {
      const rawBody = await readBody(req, options);

      req.body = rawBody ? JSON.parse(rawBody) : {};

      next();
    } catch (error) {
      error.statusCode = error.statusCode || 400;
      next(error);
    }
  };
}
```


사용 예시는 다음과 같습니다.


```javascript
app.use(myExpress.json());

app.post('/users', (req, res) => {
  res.status(201).json({
    body: req.body
  });
});
```


흐름은 다음과 같습니다.


```plain text
POST /users
  ↓
Content-Type 확인
  ↓
req stream에서 chunk 수집
  ↓
end 이벤트
  ↓
JSON.parse()
  ↓
req.body 생성
  ↓
next()
  ↓
라우터 실행
```


---


## 7.4 중요한 보안 포인트: body size limit


Body parser에 크기 제한이 없으면 사용자가 매우 큰 요청 본문을 보내 서버 메모리를 과도하게 사용할 수 있습니다.


따라서 실습에서도 기본 limit을 둡니다.


```javascript
app.use(myExpress.json({ limit: 1024 * 1024 }));
```


생각해볼 질문은 다음입니다.


```plain text
1GB짜리 JSON을 요청 body로 보내면 서버는 어떻게 될까?
요청 body를 전부 메모리에 모으는 방식은 언제 위험할까?
실무에서는 왜 body size limit이 필요할까?
```


---


# Section 8. URL-Encoded Body Parser 구현


HTML form 요청은 JSON이 아닙니다.


```html
<form method="POST" action="/login">
  <input name="username"/>
  <input name="password" type="password"/>
  <button>로그인</button>
</form>
```


전송 형식은 다음과 같습니다.


```plain text
username=kim&password=1234
```


구현은 다음과 같습니다.


```javascript
// my-express/middlewares/urlencoded.js
import { readBody } from '../utils/read-body.js';

export function urlencoded(options = {}) {
  return async function urlencodedParser(req, res, next) {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('application/x-www-form-urlencoded')) {
      next();
      return;
    }

    try {
      const rawBody = await readBody(req, options);
      const params = new URLSearchParams(rawBody);

      req.body = Object.fromEntries(params.entries());

      next();
    } catch (error) {
      error.statusCode = error.statusCode || 400;
      next(error);
    }
  };
}
```


사용 예시는 다음과 같습니다.


```javascript
app.use(myExpress.urlencoded());

app.post('/login', (req, res) => {
  res.json({
    username: req.body.username
  });
});
```


---


# Section 9. 정적 파일 서버 구현


## 9.1 정적 파일 서버의 목표


Express에서는 다음 한 줄로 정적 파일을 제공합니다.


```javascript
app.use(express.static('public'));
```


MyExpress에서는 직접 구현합니다.


```javascript
app.use(myExpress.static('public'));
```


정적 파일 서버가 해야 할 일은 다음입니다.

- 요청 URL을 파일 경로로 변환한다.
- 파일이 존재하는지 확인한다.
- 디렉터리 접근인지 확인한다.
- MIME 타입을 결정한다.
- 파일을 stream으로 응답한다.
- 없는 파일이면 `next()`로 넘긴다.
- 경로 조작 공격을 막는다.

---


## 9.2 MIME 타입 판별


```javascript
// my-express/utils/get-content-type.js
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function getContentType(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return mimeTypes[ext] || 'application/octet-stream';
}
```


---


## 9.3 static 미들웨어 구현


```javascript
// my-express/middlewares/static.js
import fs from 'node:fs';
import path from 'node:path';
import { getContentType } from '../utils/get-content-type.js';

export function staticMiddleware(root) {
  const absoluteRoot = path.resolve(root);

  return function serveStatic(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const decodedPathname = decodeURIComponent(requestUrl.pathname);

    const filePath = path.resolve(
      absoluteRoot,
      `.${decodedPathname}`
    );

    const isInsideRoot =
      filePath === absoluteRoot || filePath.startsWith(`${absoluteRoot}${path.sep}`);

    if (!isInsideRoot) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        next();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', getContentType(filePath));

      const stream = fs.createReadStream(filePath);

      stream.on('error', next);

      stream.pipe(res);
    });
  };
}
```


---


## 9.4 Path Traversal 설명


공격자는 다음처럼 요청할 수 있습니다.


```plain text
GET /../../.env
GET /../../package.json
```


잘못 구현된 정적 파일 서버는 public 폴더 밖의 파일을 읽어줄 수 있습니다.


그래서 반드시 다음 검사가 필요합니다.


```javascript
const absoluteRoot = path.resolve(root);
const filePath = path.resolve(absoluteRoot, `.${decodedPathname}`);

const isInsideRoot =
  filePath === absoluteRoot || filePath.startsWith(`${absoluteRoot}${path.sep}`);
```


핵심 메시지는 다음입니다.


```plain text
사용자가 보낸 URL을 그대로 파일 경로로 믿으면 안 된다.
항상 서버가 허용한 root 디렉터리 안에 있는지 확인해야 한다.
```


---


# Section 10. 에러 처리 미들웨어 구현


## 10.1 일반 미들웨어와 에러 미들웨어


일반 미들웨어는 다음과 같습니다.


```javascript
function logger(req, res, next) {
  next();
}
```


에러 미들웨어는 다음과 같습니다.


```javascript
function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message
  });
}
```


에러 처리 미들웨어는 인자가 4개입니다.


```plain text
(err, req, res, next)
```


---


## 10.2 next(error)의 의미


```javascript
app.get('/error', (req, res, next) => {
  next(new Error('Something wrong'));
});
```


흐름은 다음과 같습니다.


```plain text
next(error)
  ↓
일반 미들웨어는 건너뛴다
  ↓
에러 미들웨어를 찾는다
  ↓
errorHandler(err, req, res, next) 실행
```


---


## 10.3 MyExpress 에러 처리 흐름


라우터의 `next(error)` 내부에서 다음처럼 분기합니다.


```javascript
if (error) {
  if (!isErrorHandler) {
    next(error);
    return;
  }

  layer.handler(error, req, res, next);
  return;
}
```


일반 흐름은 다음과 같습니다.


```plain text
error 없음
  ↓
일반 미들웨어와 라우터 실행
  ↓
에러 미들웨어는 건너뜀
```


에러 흐름은 다음과 같습니다.


```plain text
error 있음
  ↓
일반 미들웨어와 라우터 건너뜀
  ↓
에러 미들웨어만 실행
```


---


## 10.4 커스텀 에러 핸들러


```javascript
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});
```


실무에서는 API 응답 형식을 통일하기 위해 커스텀 에러 핸들러를 마지막에 두는 것이 일반적입니다.


---


# Section 11. express.Router() 구현


## 11.1 왜 Router가 필요한가?


처음에는 모든 라우트를 app에 직접 붙입니다.


```javascript
app.get('/users', getUsers);
app.post('/users', createUser);

app.get('/products', getProducts);
app.post('/products', createProduct);

app.get('/orders', getOrders);
app.post('/orders', createOrder);
```


규모가 커지면 기능별로 분리해야 합니다.


```plain text
routes/
  users.route.js
  products.route.js
  categories.route.js
  carts.route.js
  orders.route.js
  payments.route.js
  reviews.route.js
```


사용자는 이렇게 쓰고 싶어합니다.


```javascript
const usersRouter = myExpress.Router();

usersRouter.get('/', getUsers);
usersRouter.get('/:id', getUser);

app.use('/users', usersRouter);
```


---


## 11.2 Router도 작은 app이다


Router는 독립적인 stack을 가진 객체입니다.


```javascript
export function createRouter() {
  const stack = [];

  return {
    use,
    route,
    handle,
    get(path, ...handlers) {
      route('GET', path, handlers);
      return this;
    },
    post(path, ...handlers) {
      route('POST', path, handlers);
      return this;
    }
  };
}
```


중요한 관점은 다음입니다.


```plain text
app도 router를 가진다.
router도 stack을 가진다.
app.use('/users', usersRouter)는 router를 하나의 미들웨어처럼 연결하는 것이다.
```


---


## 11.3 서브 라우터 연결 흐름


```javascript
app.use('/users', usersRouter);
```


요청은 다음과 같습니다.


```plain text
GET /users/10
```


흐름은 다음과 같습니다.


```plain text
app router
  ↓
/users prefix 매칭
  ↓
usersRouter.handle() 호출
  ↓
usersRouter 내부에서 /10 또는 /:id 매칭
  ↓
handler 실행
```


단순 구현에서는 서브 라우터에 들어가기 전에 mount path를 잘라낼 수 있습니다.


```javascript
function mountRouter(mountPath, router) {
  return function mountedRouter(req, res, next) {
    const originalUrl = req.url;

    if (!req.url.startsWith(mountPath)) {
      next();
      return;
    }

    req.url = req.url.slice(mountPath.length) || '/';

    router.handle(req, res, (error) => {
      req.url = originalUrl;
      next(error);
    });
  };
}
```


---


# Section 12. EJS 템플릿 렌더링 구현


## 12.1 목표


Express에서는 다음처럼 씁니다.


```javascript
app.set('views', 'views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('home', {
    title: 'MyExpress'
  });
});
```


MyExpress에서도 비슷하게 만듭니다.


---


## 12.2 res.render 구현


```javascript
// my-express/response.js
import path from 'node:path';
import ejs from 'ejs';

export function enhanceResponse(res, settings) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.render = async function render(viewName, data = {}) {
    const viewsDir = settings.get('views') || 'views';
    const viewEngine = settings.get('view engine') || 'ejs';

    if (viewEngine !== 'ejs') {
      throw new Error(`Unsupported view engine:${viewEngine}`);
    }

    const filePath = path.join(process.cwd(), viewsDir, `${viewName}.ejs`);
    const html = await ejs.renderFile(filePath, data);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  };

  res.json = function json(data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };

  res.send = function send(body) {
    if (typeof body === 'object') {
      res.json(body);
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(String(body));
  };
}
```


주의할 점은 `res.render()`가 async일 수 있다는 것입니다.


따라서 라우터에서 Promise 에러를 잡아야 합니다.


```javascript
try {
  const result = layer.handler(req, res, next);

  if (result && typeof result.then === 'function') {
    result.catch(next);
  }
} catch (error) {
  next(error);
}
```


---


# Section 13. 보안 설계


Part 2에서 보안 파트는 굉장히 중요합니다.


프레임워크를 직접 만들면 편의성뿐 아니라 위험도 직접 책임져야 하기 때문입니다.


---


## 13.1 요청 본문 크기 제한


위험은 다음과 같습니다.


```plain text
아주 큰 JSON body를 보내 서버 메모리를 고갈시킬 수 있다.
```


대응은 다음과 같습니다.


```javascript
app.use(myExpress.json({
  limit: 1024 * 1024
}));
```


응답 상태 코드는 다음을 사용할 수 있습니다.


```plain text
413 Payload Too Large
```


---


## 13.2 Path Traversal 방지


위험한 요청 예시는 다음과 같습니다.


```plain text
GET /../../.env
```


대응은 다음과 같습니다.


```javascript
const absoluteRoot = path.resolve(root);
const filePath = path.resolve(absoluteRoot, `.${decodedPathname}`);

if (!filePath.startsWith(`${absoluteRoot}${path.sep}`)) {
  res.statusCode = 403;
  res.end('Forbidden');
  return;
}
```


---


## 13.3 에러 정보 노출 방지


개발 환경에서는 자세한 에러 정보를 확인할 수 있습니다.


```json
{
  "error": {
    "message": "Cannot read properties of undefined",
    "stack": "..."
  }
}
```


운영 환경에서는 내부 정보를 숨겨야 합니다.


```json
{
  "error": {
    "message": "Internal Server Error"
  }
}
```


구현은 다음과 같습니다.


```javascript
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.statusCode || 500).json({
    error: {
      message: isProduction ? 'Internal Server Error' : err.message,
      stack: isProduction ? undefined : err.stack
    }
  });
});
```


---


## 13.4 MIME 타입 보안


잘못된 MIME 타입은 브라우저가 파일을 의도와 다르게 해석하게 만들 수 있습니다.


예를 들어 JavaScript 파일을 HTML처럼 내려주거나, 사용자 업로드 파일을 실행 가능한 스크립트처럼 해석하게 만들면 위험해질 수 있습니다.


따라서 정적 파일 응답 시 반드시 Content-Type을 명시합니다.


```javascript
res.setHeader('Content-Type', getContentType(filePath));
```


추가로 다음 헤더도 설명할 수 있습니다.


```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
```


---


# Section 14. 아키텍처 개선


처음 구현은 함수와 객체 중심으로 시작합니다.


```plain text
createApplication()
createRouter()
stack 배열
plain object layer
```


이후 클래스로 개선합니다.


```plain text
Application class
Router class
Layer class
```


---


## 14.1 Application 클래스


```javascript
import http from 'node:http';
import { Router } from './router.js';

export class Application {
  constructor() {
    this.router = new Router();
    this.settings = new Map();
  }

  use(path, ...handlers) {
    this.router.use(path, ...handlers);
    return this;
  }

  get(path, ...handlers) {
    this.router.route('GET', path, handlers);
    return this;
  }

  post(path, ...handlers) {
    this.router.route('POST', path, handlers);
    return this;
  }

  set(key, value) {
    this.settings.set(key, value);
    return this;
  }

  handle(req, res) {
    this.router.handle(req, res);
  }

  listen(port, callback) {
    const server = http.createServer((req, res) => {
      this.handle(req, res);
    });

    return server.listen(port, callback);
  }
}
```


---


## 14.2 Router 클래스


```javascript
export class Router {
  constructor() {
    this.stack = [];
  }

  use(path, ...handlers) {
    if (typeof path === 'function') {
      handlers = [path];
      path = '/';
    }

    for (const handler of handlers) {
      this.stack.push({
        type: 'middleware',
        path,
        handler
      });
    }

    return this;
  }

  route(method, path, handlers) {
    for (const handler of handlers) {
      this.stack.push({
        type: 'route',
        method,
        path,
        handler
      });
    }

    return this;
  }

  handle(req, res, done) {
    // 기존 next 기반 dispatcher 이동
  }
}
```


---


## 14.3 IIFE와 Singleton 설명


IIFE는 내부 변수를 외부에 노출하지 않는 데 유용합니다.


```javascript
const myExpress = (() => {
  const privateConfig = {};

  function createApplication() {
    // ...
  }

  return createApplication;
})();
```


Singleton은 하나의 인스턴스를 공유하고 싶을 때 사용할 수 있습니다.


```javascript
class ConfigStore {
  static instance;

  constructor() {
    if (ConfigStore.instance) {
      return ConfigStore.instance;
    }

    this.values = new Map();
    ConfigStore.instance = this;
  }
}
```


다만 수업에서는 다음을 반드시 경고해야 합니다.


```plain text
Singleton은 전역 상태를 줄이는 도구라기보다,
하나의 전역 인스턴스를 의도적으로 공유하는 패턴에 가깝다.

테스트 격리, 멀티 앱 인스턴스, 서버리스 환경에서는 오히려 문제가 될 수 있다.
```


따라서 MyExpress에서는 다음 기준을 제안합니다.


```plain text
프레임워크 내부 유틸: IIFE로 은닉 가능
애플리케이션 인스턴스: 매번 새로 만들 수 있어야 함
설정 저장소: app 인스턴스별로 분리하는 것이 안전함
```


---


# Section 15. 실전 API 라우터 구성


Part 2 커리큘럼에서는 Users, Products, Categories, Carts, Orders, Payments, Reviews 라우터를 구성합니다.


이 부분의 목적은 쇼핑몰을 완성하는 것이 아니라 **Router 분리 구조를 체득하는 것**입니다.


---


## 15.1 폴더 구조


```plain text
src/
  index.js
  my-express/
    index.js
    create-application.js
    router.js
    response.js
    middlewares/
      json.js
      urlencoded.js
      static.js
      logger.js
  routes/
    users.route.js
    products.route.js
    categories.route.js
    carts.route.js
    orders.route.js
    payments.route.js
    reviews.route.js
```


---


## 15.2 index.js


```javascript
import myExpress from './my-express/index.js';

import usersRouter from './routes/users.route.js';
import productsRouter from './routes/products.route.js';
import categoriesRouter from './routes/categories.route.js';
import cartsRouter from './routes/carts.route.js';
import ordersRouter from './routes/orders.route.js';
import paymentsRouter from './routes/payments.route.js';
import reviewsRouter from './routes/reviews.route.js';

const app = myExpress();

app.use(myExpress.logger());
app.use(myExpress.json());
app.use(myExpress.urlencoded());
app.use(myExpress.static('public'));

app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/carts', cartsRouter);
app.use('/orders', ordersRouter);
app.use('/payments', paymentsRouter);
app.use('/reviews', reviewsRouter);

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found'
    }
  });
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message
    }
  });
});

app.listen(3000, () => {
  console.log('MyExpress server running on http://localhost:3000');
});
```


---


## 15.3 users.route.js


```javascript
import myExpress from '../my-express/index.js';

const router = myExpress.Router();

const users = [
  {
    id: '1',
    name: 'Kim'
  }
];

router.get('/', (req, res) => {
  res.json({
    users
  });
});

router.get('/:id', (req, res) => {
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    res.status(404).json({
      error: {
        message: 'User not found'
      }
    });
    return;
  }

  res.json({
    user
  });
});

router.post('/', (req, res) => {
  const newUser = {
    id: String(Date.now()),
    name: req.body.name
  };

  users.push(newUser);

  res.status(201).json({
    user: newUser
  });
});

export default router;
```


---


# Section 16. API 테스트 자동화


## 16.1 왜 테스트를 넣는가?


프레임워크를 직접 만들면 한 부분을 수정했을 때 다른 기능이 깨지기 쉽습니다.


예를 들어 다음을 수정하면:


```plain text
router.handle()
```


영향을 받는 기능은 다음과 같습니다.

- 일반 라우팅
- 동적 라우팅
- 미들웨어 순서
- 에러 처리
- 서브 라우터
- 404 처리

그래서 최소한의 API 테스트 스크립트를 만듭니다.


---


## 16.2 http.request 기반 테스트 함수


```javascript
// test/request.js
import http from 'node:http';

export function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        method: options.method,
        path: options.path,
        headers: options.headers
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
```


---


## 16.3 JSON 요청 테스트


```javascript
import { request } from './request.js';

const response = await request({
  method: 'POST',
  path: '/users',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Lee'
  })
});

console.log(response.statusCode);
console.log(response.body);
```


---


## 16.4 테스트 시나리오


```plain text
GET /users
  → 200

GET /users/1
  → 200
  → req.params.id 정상 동작

GET /unknown
  → 404

POST /users with JSON
  → req.body 정상 파싱

POST /login with urlencoded
  → req.body 정상 파싱

GET /style.css
  → 정적 파일 응답
  → Content-Type: text/css

GET /../../.env
  → 403

GET /error
  → 에러 미들웨어 실행
  → 500
```


---


# Section 17. 수강 후 설명할 수 있어야 하는 것


수강 후에는 다음 질문에 답할 수 있어야 합니다.

- `app.get()`은 내부적으로 무엇을 저장하는가?
- `app.use()`와 `app.get()`은 무엇이 다른가?
- `next()`는 어떻게 다음 미들웨어를 실행하는가?
- `next(error)`를 호출하면 왜 에러 미들웨어로 이동하는가?
- 에러 미들웨어는 왜 인자가 4개인가?
- `req.body`는 처음부터 존재하는 값인가?
- JSON 요청 본문은 왜 stream으로 읽어야 하는가?
- `req.params`는 어떤 과정을 거쳐 만들어지는가?
- `res.json()`은 내부적으로 무엇을 하는가?
- `express.static()`은 단순히 `fs.readFile`만 하는 기능인가?
- Path Traversal은 왜 위험한가?
- Router는 app과 어떤 점이 비슷한가?
- 서브 라우터는 어떻게 mount path 아래에 연결되는가?
- 프레임워크 내부 구조를 알면 다른 백엔드 프레임워크를 이해하는 데 왜 도움이 되는가?

---


# Section 18. Part 1 + Part 2 통합 로드맵


## Part 1: Express 사용자 되기


```plain text
1. HTTP 이해
2. Node.js 기본 서버
3. Express 라우팅
4. 미들웨어
5. req/res
6. JSON/Form/Params/Query
7. Router 분리
8. Cookie/JWT
9. CRUD 프로젝트
```


---


## Part 2: Express 구현자 되기


```plain text
1. app 객체 구현
2. router stack 구현
3. middleware chain 구현
4. next() 구현
5. error middleware 구현
6. req.params 구현
7. req.body parser 구현
8. res helper 구현
9. static middleware 구현
10. Router 구현
11. render 구현
12. security 개선
13. architecture 개선
14. test 자동화
```


---


# Section 19. 프론트엔드 개발자에게 맞춘 핵심 비유


## 19.1 Express Router는 React Router와 비슷하다


```plain text
React Router:
  URL과 컴포넌트를 매칭한다.

Express Router:
  URL과 handler 함수를 매칭한다.
```


```plain text
/users/:id
  ↓
id 추출
  ↓
params에 저장
```


---


## 19.2 Middleware는 Axios interceptor와 비슷하다


```plain text
Axios interceptor:
  요청/응답 전후 공통 처리

Express middleware:
  요청/응답 사이 공통 처리
```


예시는 다음과 같습니다.

- 로그 기록
- 인증 검사
- JSON 파싱
- 에러 변환
- 정적 파일 응답

---


## 19.3 req는 브라우저의 Request와 비슷하지만 Node stream이다


프론트엔드에서는 `Request` 객체를 다룹니다.


```javascript
fetch('/api', {
  method: 'POST',
  body: JSON.stringify(data)
});
```


서버에서는 그 반대편을 받습니다.


```javascript
req.on('data', chunk => {});
req.on('end', () => {});
```


즉, 브라우저에서 한 번에 보낸 것처럼 보이는 body도 서버 내부에서는 chunk 단위로 들어옵니다.


---


## 19.4 res는 Response 객체를 직접 조립하는 도구다


프론트엔드에서는 응답을 받습니다.


```javascript
const response = await fetch('/api');
await response.json();
```


서버에서는 응답을 만듭니다.


```javascript
res.statusCode = 200;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify(data));
```


Express는 이를 더 편하게 만들어줍니다.


```javascript
res.status(200).json(data);
```


---


# 20. 최종 정리


Part 2의 본질은 Express API를 더 많이 외우는 것이 아닙니다.


핵심은 다음입니다.


```plain text
Express는 요청을 받는다.
등록된 stack을 순서대로 돈다.
path와 method를 비교한다.
맞는 handler를 실행한다.
next()로 흐름을 이어간다.
error가 있으면 에러 흐름으로 전환한다.
req와 res를 편하게 쓰도록 확장한다.
body, static, render, router를 미들웨어와 헬퍼로 제공한다.
```


이 구조가 보이면 Express뿐 아니라 다음 프레임워크도 더 쉽게 이해됩니다.

- Fastify
- NestJS
- Koa
- Hono
- Next.js Route Handler
- Django
- Flask
- Spring Boot

결국 서버 프레임워크의 공통 구조는 다음입니다.


```plain text
Request
  → Middleware Pipeline
  → Router Matching
  → Handler
  → Response
  → Error Handler
```


이 Part 2 강의는 프론트엔드 개발자가 백엔드 서버를 “사용하는 수준”에서 벗어나, **요청 처리 엔진 자체를 설계하는 관점**을 갖게 만드는 강의입니다.

