---
title: "Node.js 강의 v3 "
description: "강의"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의"]
notes: true
notionId: "37a7cf19-a364-80e9-a619-c7c7a6e070c3"
---
# 프론트엔드 개발자를 위한 Node.js TCP/UDP 소켓과 네트워크 코어


## 0. 이 강의의 핵심 한 문장

> 네트워크 프로그래밍은 단순히 “요청을 보내고 응답을 받는 코드”가 아니라,
>
> **내 프로세스의 메모리 버퍼가 OS 커널, 포트, IP, 라우터, 다른 프로세스의 버퍼와 연결되는 흐름을 설계하는 일**이다.
>
>

프론트엔드 개발자는 `fetch`, WebSocket, API 요청, CORS, HTTP 상태 코드에는 익숙하지만, 그 아래에서 실제로 데이터가 어떻게 이동하는지는 잘 모르는 경우가 많다.


이 강의는 브라우저 Network 탭에서 보던 요청 하나를 Node.js의 `net`, `dgram`, `stream`, `Buffer`, `process`를 통해 직접 해부하는 것을 목표로 한다.


---


## 1. 강의 대상


이 강의는 다음과 같은 개발자를 대상으로 한다.

- React, Next.js, Vite, API 요청, WebSocket 사용 경험이 있는 프론트엔드 개발자
- Node.js를 개발 서버나 빌드 도구 정도로 사용해본 개발자
- HTTP는 알지만 TCP, UDP, Socket, Port는 추상적으로만 알고 있는 개발자
- 브라우저의 네트워크 요청이 실제로 어떤 계층을 거쳐 서버에 도착하는지 알고 싶은 개발자
- 대용량 파일 업로드, 실시간 통신, WebSocket, CDN, DNS, NAT의 원리를 깊게 이해하고 싶은 개발자

---


## 2. 이 강의에서 다루는 핵심 질문


```plain text
브라우저에서 fetch('/api')를 호출하면 실제로 어떤 계층을 지나갈까?

localhost와 127.0.0.1은 왜 다를 수 있을까?

0.0.0.0으로 서버를 띄운다는 말은 정확히 무슨 뜻일까?

HTTP는 아는데 TCP socket은 뭘까?

TCP는 데이터를 메시지 단위로 보내줄까, byte stream으로 흘려보낼까?

왜 TCP에서는 데이터가 쪼개지거나 뭉쳐서 도착할까?

UDP는 왜 빠르지만 위험할까?

대용량 파일 업로드에서 메모리 폭발은 네트워크와 어떻게 연결될까?
```


---


## 3. Part 1, Part 2, Part 3 연결 지도



| 이전 파트 | 배운 내용 | Part 3에서 확장되는 내용 |
| --- | --- | --- |
| Part 1 | V8, Buffer, EventEmitter, OS 시스템 콜 | 소켓도 결국 OS 자원이고 이벤트 기반으로 다룬다 |
| Part 1 | 인코딩, UTF-8, Buffer | 네트워크 데이터도 Buffer chunk로 들어온다 |
| Part 2 | Readable, Writable, Duplex, Transform | TCP socket은 Duplex Stream으로 이해한다 |
| Part 2 | Backpressure, `write()`, `drain` | 네트워크가 느릴 때도 배압 제어가 필요하다 |
| Part 2 | Pipeline, 대용량 파일 처리 | OOM 없는 TCP 파일 업로더로 확장한다 |
| Part 2 | Chunk 파편화 | TCP 단편화와 병합 문제를 프로토콜 설계로 해결한다 |



Part 3의 핵심은 **“스트림이 네트워크를 만나는 순간”**이다.


---


## 4. 전체 목차



| 파트 | 주제 | 핵심 질문 |
| --- | --- | --- |
| 1 | 네트워크 인프라와 계층 모델 | 브라우저 요청은 어떤 계층을 지나 서버에 도착하는가? |
| 2 | TCP 서버 엔진 | Node.js `net` 모듈로 TCP 서버를 직접 만들 수 있는가? |
| 3 | 주소와 포트 | localhost, 127.0.0.1, 0.0.0.0, port는 무엇이 다른가? |
| 4 | Duplex Socket | TCP socket은 왜 읽기와 쓰기를 동시에 하는가? |
| 5 | 다중 접속과 세션 관리 | 여러 클라이언트를 어떻게 구분하고 라우팅하는가? |
| 6 | 커스텀 프로토콜 | TCP stream에서 메시지 경계를 어떻게 직접 정의하는가? |
| 7 | NDJSON과 누적 버퍼링 | 쪼개지거나 뭉쳐서 온 데이터를 어떻게 복원하는가? |
| 8 | 보안과 예외 처리 | 평문 전송, 악성 데이터, 좀비 소켓을 어떻게 방어하는가? |
| 9 | NAT, DNS, IPv6 | 내 로컬 서버는 왜 외부에서 바로 접근되지 않는가? |
| 10 | UDP | 신뢰성을 버리고 속도를 얻는다는 것은 무엇인가? |
| 11 | TCP 파일 업로더 | 대용량 파일을 OOM 없이 전송하려면 어떻게 해야 하는가? |



---


# Section 1. 네트워크의 서막: 브라우저 요청에서 소켓까지


## 핵심 질문

> 브라우저에서 `fetch()`를 호출하면 실제로 무슨 일이 일어나는가?

프론트엔드 개발자는 보통 다음 코드 수준에서 네트워크를 생각한다.


```javascript
const response = await fetch('/api/users');
const users = await response.json();
```


하지만 실제로는 더 많은 계층을 거친다.


```plain text
JavaScript fetch()
  ↓
브라우저 네트워크 스택
  ↓
DNS 조회
  ↓
TCP 연결
  ↓
TLS 협상
  ↓
HTTP 요청 직렬화
  ↓
IP 패킷
  ↓
라우터 / NAT / 인터넷
  ↓
서버 OS 커널
  ↓
Node.js TCP socket
  ↓
HTTP parser 또는 직접 만든 protocol parser
  ↓
내 JavaScript 콜백
```


## 핵심 정리


프론트엔드에서는 HTTP를 “요청/응답 객체”로 본다.


```plain text
GET /users
headers
body
status code
```


하지만 TCP 관점에서는 다음이 중요하다.


```plain text
byte stream
연결
포트
소켓
버퍼
backpressure
```


---


# Section 2. 계층 모델과 4-Tuple 소켓 식별


## 핵심 질문

> 서버는 수많은 연결 중에서 특정 클라이언트를 어떻게 구분하는가?

네트워크 연결은 보통 다음 네 가지 값으로 구분한다.


```plain text
source IP
source port
destination IP
destination port
```


이것을 4-Tuple이라고 부를 수 있다.


```plain text
클라이언트 1:
192.168.0.10:53122 → 203.0.113.10:443

클라이언트 2:
192.168.0.11:53123 → 203.0.113.10:443
```


같은 서버의 같은 443 포트에 접속해도, 클라이언트 IP와 클라이언트 포트가 다르면 서로 다른 연결로 구분할 수 있다.


## 프론트엔드 연결


브라우저에서 여러 탭이 같은 사이트에 요청을 보내도 서버는 각각의 TCP 연결을 구분한다.


```plain text
브라우저 탭 A → 서버 443
브라우저 탭 B → 서버 443
모바일 앱     → 서버 443
```


서버 포트는 같아도 연결은 다를 수 있다.


---


# Section 3. 순수 Node.js TCP 서버 만들기


## 핵심 질문

> Express 없이도 서버를 만들 수 있는가?

가능하다.


Express나 NestJS는 훨씬 위의 추상화다.


여기서는 Node.js의 `net` 모듈로 TCP 서버를 직접 만든다.


## TCP Echo Server


```javascript
import net from 'node:net';

const PORT = 4000;
const HOST = '127.0.0.1';

const server = net.createServer(socket => {
  console.log('client connected:', {
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
  });

  socket.write('Welcome to Node TCP server\n');

  socket.on('data', chunk => {
    console.log('received:', chunk);
    console.log('as text:', chunk.toString('utf8'));

    socket.write(`echo:${chunk}`);
  });

  socket.on('error', error => {
    console.error('socket error:', error.code);
  });

  socket.on('close', hadError => {
    console.log('client closed:', { hadError });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`TCP server listening on${HOST}:${PORT}`);
});
```


## TCP Client


```javascript
import net from 'node:net';

const socket = net.createConnection(
  {
    host: '127.0.0.1',
    port: 4000,
  },
  () => {
    console.log('connected to server');
    socket.write('hello server\n');
  }
);

socket.on('data', chunk => {
  console.log('from server:', chunk.toString('utf8'));
});

socket.on('error', error => {
  console.error('client error:', error.code);
});

socket.on('close', () => {
  console.log('connection closed');
});
```


## 핵심 정리


```plain text
socket은 EventEmitter처럼 이벤트를 낸다.
socket은 data 이벤트로 Buffer를 받는다.
socket은 write()로 데이터를 보낸다.
socket은 읽기와 쓰기를 모두 한다.
즉, socket은 Duplex Stream처럼 사고해야 한다.
```


---


# Section 4. localhost, 127.0.0.1, 0.0.0.0


## 핵심 질문

> 서버를 `127.0.0.1`에 띄우는 것과 `0.0.0.0`에 띄우는 것은 무엇이 다른가?

## 개념 정리


```plain text
127.0.0.1
  내 컴퓨터 자신을 가리키는 루프백 주소

localhost
  보통 127.0.0.1 또는 ::1로 해석되는 이름

0.0.0.0
  서버 바인딩에서 모든 IPv4 인터페이스에 listen하겠다는 의미
```


## 예시


```javascript
server.listen(4000, '127.0.0.1');
```


이 경우 보통 내 컴퓨터 내부에서만 접근하기 좋다.


```javascript
server.listen(4000, '0.0.0.0');
```


이 경우 내 컴퓨터의 여러 네트워크 인터페이스에서 접근 가능하게 열 수 있다.


단, 방화벽, 공유기 NAT, 포트포워딩, 클라우드 보안그룹 설정은 별도다.


## 프론트엔드 연결


Vite나 Next.js dev server에서 다음 옵션을 본 적이 있을 수 있다.


```bash
vite --host 0.0.0.0
next dev -H 0.0.0.0
```


이는 외부 기기에서도 내 개발 서버에 접근할 수 있도록 바인딩하겠다는 의미에 가깝다.


---


# Section 5. 포트와 에페머럴 포트


## 핵심 질문

> 서버는 4000번 포트에서 기다리는데, 클라이언트 포트는 누가 정하는가?

서버는 보통 고정 포트에서 기다린다.


```plain text
HTTP  : 80
HTTPS : 443
개발 서버: 3000, 5173, 4000 등
```


반면 클라이언트가 서버에 접속할 때는 OS가 임시 포트를 자동으로 할당한다.


이 포트를 에페머럴 포트라고 부를 수 있다.


```plain text
client 192.168.0.10:53122 → server 203.0.113.10:443
```


여기서 `53122`는 보통 클라이언트 OS가 임시로 고른 포트다.


## 핵심 정리


`remotePort`는 유저 ID가 아니다.


```javascript
console.log(socket.remoteAddress, socket.remotePort);
```


이 값은 연결 식별에는 도움이 되지만, 애플리케이션 유저를 안정적으로 식별하는 값은 아니다.


```plain text
나쁜 설계:
remotePort를 유저 ID로 사용

좋은 설계:
로그인 ID, 닉네임, 세션 토큰, 애플리케이션 레벨 ID를 별도로 설계
```


---


# Section 6. 표준 입출력과 CLI 클라이언트


## 핵심 질문

> 터미널 입력을 TCP socket에 바로 흘려보낼 수 있을까?

가능하다.


```plain text
process.stdin  → Readable Stream
socket         → Duplex Stream
process.stdout → Writable Stream
```


## CLI 클라이언트 예시


```javascript
import net from 'node:net';
import { stdin, stdout } from 'node:process';

const socket = net.createConnection(
  {
    host: '127.0.0.1',
    port: 4000,
  },
  () => {
    stdout.write('connected. type message:\n');
  }
);

stdin.setEncoding('utf8');

stdin.on('data', input => {
  socket.write(input);
});

socket.on('data', chunk => {
  stdout.write(`server:${chunk.toString('utf8')}`);
});

socket.on('close', () => {
  stdout.write('\nconnection closed\n');
  process.exit(0);
});
```


## 핵심 정리


터미널은 단순한 입력창이 아니다.


Node.js에서는 표준 입력과 표준 출력도 스트림이다.


```plain text
키보드 입력
  ↓
process.stdin
  ↓
TCP socket
  ↓
서버
  ↓
TCP socket
  ↓
process.stdout
```


---


# Section 7. 다중 접속 브로드캐스팅 서버


## 핵심 질문

> 여러 클라이언트가 들어오면 서버는 메시지를 어떻게 중계할까?

처음에는 배열로 관리할 수 있다.


```javascript
const clients = [];
```


하지만 연결이 많아지고 특정 유저를 찾아야 한다면 배열의 선형 탐색이 병목이 될 수 있다.


```javascript
const clients = new Map();
```


`Map`을 쓰면 애플리케이션 레벨의 유저 ID를 key로 두고 socket을 관리할 수 있다.


## 다중 접속 채팅 서버 예시


```javascript
import net from 'node:net';
import { randomUUID } from 'node:crypto';

const clients = new Map();

function broadcast(senderId, message) {
  for (const [clientId, client] of clients) {
    if (clientId === senderId) {
      continue;
    }

    client.socket.write(`[${senderId}]${message}`);
  }
}

const server = net.createServer(socket => {
  const clientId = randomUUID();

  clients.set(clientId, {
    socket,
    joinedAt: Date.now(),
  });

  socket.write(`your id:${clientId}\n`);
  broadcast(clientId, `${clientId} joined\n`);

  socket.on('data', chunk => {
    const message = chunk.toString('utf8');
    broadcast(clientId, message);
  });

  socket.on('error', error => {
    console.error('socket error:', clientId, error.code);
  });

  socket.on('close', () => {
    clients.delete(clientId);
    broadcast(clientId, `${clientId} left\n`);
  });
});

server.listen(4000, '127.0.0.1', () => {
  console.log('chat server listening on 127.0.0.1:4000');
});
```


## 핵심 정리


```plain text
TCP 연결 식별자와 애플리케이션 유저 식별자는 다르다.

TCP:
remoteAddress, remotePort, localAddress, localPort

Application:
userId, nickname, sessionId, roomId
```


이 둘을 분리해야 실무 시스템이 안정된다.


---


# Section 8. TCP는 메시지가 아니라 Byte Stream이다


## 핵심 질문

> 내가 `socket.write('hello')`를 한 번 호출하면, 상대도 반드시 `data` 이벤트 한 번으로 받을까?

아니다.


TCP는 메시지 박스를 그대로 전달하는 방식이 아니라, 연속적인 byte stream으로 이해해야 한다.


## 예시


보내는 쪽:


```javascript
socket.write('A');
socket.write('B');
socket.write('C');
```


받는 쪽은 이렇게 받을 수 있다.


```plain text
data: "ABC"
```


또는 이렇게 받을 수도 있다.


```plain text
data: "A"
data: "BC"
```


대용량 데이터라면 한 메시지가 여러 chunk로 쪼개질 수도 있다.


```plain text
보낸 쪽:
{"type":"chat","message":"hello"}\n

받는 쪽:
chunk 1: {"type":"chat",
chunk 2: "message":"hello"}\n
```


## 핵심 정리

> TCP는 메시지 경계를 보존해주지 않는다.
>
> 메시지 경계는 애플리케이션 프로토콜이 직접 정의해야 한다.
>
>

---


# Section 9. NDJSON 기반 커스텀 프로토콜


## 핵심 질문

> TCP stream에서 메시지 경계를 어떻게 만들까?

가장 단순하고 실용적인 방법 중 하나는 NDJSON이다.


```plain text
{"type":"join","name":"kim"}\n
{"type":"chat","message":"hello"}\n
{"type":"leave"}\n
```


한 줄에 JSON 객체 하나를 넣고, `\n`을 메시지 구분자로 사용한다.


## 메시지 인코딩


```javascript
export function encodeMessage(message) {
  return `${JSON.stringify(message)}\n`;
}
```


## 누적 버퍼링 파서


TCP에서는 한 줄이 한 번에 오지 않을 수 있으므로, socket마다 누적 버퍼가 필요하다.


```javascript
import { StringDecoder } from 'node:string_decoder';

const MAX_BUFFER_SIZE = 1024 * 1024;

export function createNdjsonParser(onMessage, onError) {
  const decoder = new StringDecoder('utf8');
  let buffer = '';

  function parseLines() {
    let newlineIndex = buffer.indexOf('\n');

    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.trim().length > 0) {
        try {
          onMessage(JSON.parse(line));
        } catch (error) {
          onError(error);
        }
      }

      newlineIndex = buffer.indexOf('\n');
    }

    if (buffer.length > MAX_BUFFER_SIZE) {
      onError(new Error('Protocol buffer overflow'));
    }
  }

  return {
    write(chunk) {
      buffer += decoder.write(chunk);
      parseLines();
    },

    end() {
      buffer += decoder.end();
      parseLines();

      if (buffer.trim().length > 0) {
        onError(new Error('Incomplete message at connection end'));
      }
    },
  };
}
```


## 왜 StringDecoder를 쓰는가?


TCP chunk 경계는 UTF-8 문자 경계와 일치하지 않을 수 있다.


한글이나 이모지 같은 멀티바이트 문자가 chunk 중간에서 잘릴 수 있으므로, 텍스트 프로토콜을 만들 때는 `StringDecoder`를 사용해 불완전한 멀티바이트 문자를 안전하게 이어붙이는 것이 좋다.


---


# Section 10. 프로토콜 기반 채팅 서버 리팩토링


## 핵심 질문

> 문자열 파싱이 아니라, 메시지 타입 기반으로 라우팅하려면 어떻게 해야 할까?

문자열을 직접 자르는 방식은 위험하다.


```plain text
/login kim
/message hello
```


처음에는 괜찮지만, 메시지가 복잡해질수록 취약해진다.


더 나은 방식은 JSON 메시지 타입을 두는 것이다.


```json
{"type":"join","name":"kim"}
{"type":"chat","message":"hello"}
{"type":"rename","name":"lee"}
```


## 메시지 라우팅 서버 예시


```javascript
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { createNdjsonParser } from './create-ndjson-parser.js';
import { encodeMessage } from './encode-message.js';

const clients = new Map();

function send(socket, message) {
  socket.write(encodeMessage(message));
}

function broadcast(senderId, message) {
  for (const [clientId, client] of clients) {
    if (clientId === senderId) {
      continue;
    }

    send(client.socket, message);
  }
}

function handleMessage(clientId, message) {
  const client = clients.get(clientId);

  if (!client) {
    return;
  }

  switch (message.type) {
    case 'join': {
      client.name = message.name;

      broadcast(clientId, {
        type: 'system',
        message: `${client.name} joined`,
      });

      break;
    }

    case 'chat': {
      broadcast(clientId, {
        type: 'chat',
        from: client.name ?? clientId,
        message: message.message,
      });

      break;
    }

    default: {
      send(client.socket, {
        type: 'error',
        message: `unknown message type:${message.type}`,
      });
    }
  }
}

const server = net.createServer(socket => {
  const clientId = randomUUID();

  const parser = createNdjsonParser(
    message => handleMessage(clientId, message),
    error => {
      send(socket, {
        type: 'error',
        message: error.message,
      });

      socket.destroy();
    }
  );

  clients.set(clientId, {
    socket,
    name: null,
  });

  send(socket, {
    type: 'welcome',
    clientId,
  });

  socket.on('data', chunk => {
    parser.write(chunk);
  });

  socket.on('end', () => {
    parser.end();
  });

  socket.on('error', error => {
    console.error('socket error:', clientId, error.code);
  });

  socket.on('close', () => {
    clients.delete(clientId);
  });
});

server.listen(4000, '127.0.0.1', () => {
  console.log('protocol server listening on 127.0.0.1:4000');
});
```


## 핵심 정리


이제 HTTP 없이도 작은 애플리케이션 프로토콜을 만들 수 있다.


```plain text
Transport:
TCP

Application Protocol:
NDJSON

Message Types:
welcome
join
chat
system
error
```


이 경험을 하고 나면 HTTP, WebSocket, SSE, gRPC도 “마법”이 아니라 “정해진 규칙에 따라 바이트를 해석하는 프로토콜”로 보이기 시작한다.


---


# Section 11. 보안과 예외 처리


## 핵심 질문

> 직접 만든 TCP 서버는 어떤 위험에 노출될까?

실습용 TCP 서버는 기본적으로 평문이다.


```plain text
client → hello → server
```


네트워크 중간에서 볼 수 있는 환경이라면 내용이 노출될 수 있다.


실무에서는 TLS, 인증, 권한 검증, 입력 제한, rate limit, timeout, 로그 마스킹 같은 방어가 필요하다.


## 반드시 넣어야 할 방어 로직


```plain text
1. error 이벤트 처리
2. close 이벤트에서 Map 정리
3. 메시지 최대 크기 제한
4. JSON parse 실패 처리
5. 알 수 없는 type 거부
6. idle timeout 설정
7. 비정상 연결 destroy
8. 평문 민감정보 전송 금지
```


## Timeout 예시


```javascript
socket.setTimeout(60_000);

socket.on('timeout', () => {
  socket.write(encodeMessage({
    type: 'error',
    message: 'idle timeout',
  }));

  socket.destroy();
});
```


## 핵심 정리


네트워크 서버에서 예외 처리는 “친절함”이 아니라 생존 조건이다.


```plain text
클라이언트가 정상 종료하지 않을 수 있다.
중간 네트워크가 끊길 수 있다.
쓰레기 데이터가 들어올 수 있다.
JSON이 깨질 수 있다.
메시지가 무한히 길어질 수 있다.
```


---


# Section 12. NAT, 사설 IP, 포트포워딩


## 핵심 질문

> 내 컴퓨터에서는 서버가 열렸는데, 왜 외부에서는 접속이 안 될까?

가정용 네트워크에서는 보통 내 컴퓨터가 사설 IP를 가진다.


```plain text
192.168.0.10
10.0.0.5
172.16.x.x
```


외부 인터넷에서 직접 접근 가능한 주소는 보통 공유기나 클라우드 인스턴스가 가진 공인 IP다.


```plain text
내 노트북: 192.168.0.10
공유기:    공인 IP 보유
인터넷:    공유기의 공인 IP까지만 직접 접근 가능
```


외부에서 내 노트북의 서버로 들어오려면 보통 다음이 필요하다.


```plain text
1. 서버가 0.0.0.0에 바인딩되어 있음
2. OS 방화벽 허용
3. 공유기 포트포워딩
4. ISP 또는 클라우드 네트워크 정책 허용
```


## 프론트엔드 연결


프론트엔드 개발자는 “내 개발 서버가 내 폰에서 안 열린다”를 자주 겪는다.


이 문제는 React나 Vite 문제가 아니라 다음 문제일 수 있다.


```plain text
서버 바인딩 문제
방화벽 문제
NAT 문제
포트포워딩 문제
같은 네트워크에 있지 않은 문제
```


---


# Section 13. DNS와 글로벌 트래픽


## 핵심 질문

> 사용자가 `example.com`을 입력하면 서버 IP는 어떻게 찾아갈까?

브라우저는 도메인 이름을 그대로 TCP 연결에 쓰지 않는다.


먼저 IP 주소를 알아야 한다.


```plain text
example.com
  ↓ DNS lookup
93.184.216.34
  ↓ TCP connect
93.184.216.34:443
```


## Node.js DNS 조회 예시


```javascript
import dns from 'node:dns/promises';

const result = await dns.lookup('example.com');
console.log(result);
```


```javascript
import dns from 'node:dns/promises';

const records = await dns.resolve4('example.com');
console.log(records);
```


## GSLB 개념


GSLB는 도메인 이름을 항상 같은 IP로만 돌려주는 것이 아니라, 다음 조건에 따라 다른 IP를 줄 수 있는 글로벌 트래픽 분산 전략으로 이해하면 좋다.


```plain text
사용자의 위치
서버 상태
장애 상황
트래픽 정책
리전 상태
```


예시:


```plain text
한국 사용자 → 서울 리전
일본 사용자 → 도쿄 리전
미국 사용자 → 버지니아 리전
장애 발생 → 다른 리전으로 우회
```


프론트엔드 개발자가 CDN, 이미지 최적화, Edge Runtime, 글로벌 배포를 이해할 때 DNS/GSLB 감각은 매우 중요하다.


---


# Section 14. IPv6와 차세대 주소 체계


## 핵심 질문

> IPv6는 단순히 주소가 길어진 것일까?

IPv4는 32비트 주소 체계다.


```plain text
192.168.0.10
```


IPv6는 128비트 주소 체계다.


```plain text
2001:db8:85a3::8a2e:370:7334
```


## 핵심 정리


IPv6는 “외워야 할 새 주소 표기법”이 아니다.


```plain text
IPv4 시대:
주소 부족
NAT 보편화
사설망 / 공인망 구분이 실무에서 중요

IPv6 시대:
훨씬 넓은 주소 공간
자동 주소 설정
NAT 의존도 감소 가능
클라우드와 모바일 네트워크에서 중요성 증가
```


다만 실무에서는 IPv4와 IPv6가 함께 존재하는 dual stack 환경을 자주 만나므로, 둘을 분리해서 이해해야 한다.


---


# Section 15. UDP 소켓


## 핵심 질문

> TCP가 신뢰성을 보장한다면, UDP는 왜 사용할까?

UDP는 연결을 맺고 byte stream을 유지하는 방식이 아니라 datagram 단위로 데이터를 보낸다.


## TCP와 UDP 비교



| 구분 | TCP | UDP |
| --- | --- | --- |
| 연결 | 연결 지향 | 비연결 |
| 데이터 모델 | byte stream | datagram |
| 순서 보장 | 보장 | 보장하지 않음 |
| 재전송 | 있음 | 기본 없음 |
| 메시지 경계 | 직접 설계 필요 | datagram 단위 |
| 사용 예 | HTTP/1.1, HTTP/2, 파일 전송 | 게임 위치 업데이트, DNS, 실시간 일부 통신 |



## UDP Server


```javascript
import dgram from 'node:dgram';

const server = dgram.createSocket('udp4');

server.on('message', (message, remoteInfo) => {
  console.log('received:', {
    message: message.toString('utf8'),
    from: `${remoteInfo.address}:${remoteInfo.port}`,
  });

  server.send(
    Buffer.from(`echo:${message}`),
    remoteInfo.port,
    remoteInfo.address
  );
});

server.on('error', error => {
  console.error('udp server error:', error);
  server.close();
});

server.bind(41234, () => {
  console.log('udp server listening on 41234');
});
```


## UDP Client


```javascript
import dgram from 'node:dgram';

const client = dgram.createSocket('udp4');

const message = Buffer.from('hello udp');

client.send(message, 41234, '127.0.0.1', error => {
  if (error) {
    console.error(error);
    client.close();
  }
});

client.on('message', message => {
  console.log('from server:', message.toString('utf8'));
  client.close();
});
```


## 핵심 정리


```plain text
TCP:
정확성이 중요할 때

UDP:
지연 시간이 더 중요하고, 일부 손실을 애플리케이션이 감당할 수 있을 때
```


파일 전송에는 일반적으로 TCP가 적합하다.


반면 실시간 위치 업데이트처럼 최신 상태가 더 중요한 경우에는 UDP 또는 UDP 기반 프로토콜이 의미를 가질 수 있다.


---


# Section 16. HTTP/3와 QUIC 맛보기


## 핵심 질문

> UDP는 신뢰성이 없다는데, HTTP/3는 왜 UDP 기반 QUIC을 사용할까?

이 파트는 깊게 구현하기보다 큰 그림을 잡는 것이 좋다.


```plain text
UDP:
가벼운 datagram 전송

QUIC:
UDP 위에 연결 관리, 암호화, 흐름 제어, 손실 복구 등을 얹은 현대적 전송 프로토콜

HTTP/3:
QUIC 위에서 동작하는 HTTP
```


## 핵심 정리


UDP 자체는 신뢰성을 보장하지 않는다.


하지만 UDP 위에 애플리케이션 또는 프로토콜 레이어가 신뢰성, 암호화, 흐름 제어를 다시 설계할 수 있다.

> 프로토콜은 주어진 것만 쓰는 것이 아니라,
>
> 요구사항에 맞게 계층을 쌓아 설계하는 것이다.
>
>

---


# Section 17. TCP 파일 업로더와 Backpressure


## 핵심 질문

> 10GB 파일을 TCP로 보낼 때, 왜 `readFile()`로 읽으면 안 되는가?

나쁜 예시는 다음과 같다.


```javascript
const file = await readFile('./10gb.mp4');
socket.write(file);
```


이 코드는 파일 전체를 메모리에 올린다.


대용량 파일과 동시 요청이 만나면 OOM으로 이어질 수 있다.


## 올바른 방향


```plain text
파일 Readable Stream
  ↓
TCP Socket Writable side
  ↓
write() 반환값 확인
  ↓
false면 pause
  ↓
drain이면 resume
```


---


## 수동 Backpressure 파일 전송 클라이언트


```javascript
import net from 'node:net';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node src/upload/client.js <file-path>');
  process.exit(1);
}

const fileInfo = await stat(filePath);

const socket = net.createConnection(
  {
    host: '127.0.0.1',
    port: 5000,
  },
  async () => {
    const header = {
      type: 'file',
      filename: path.basename(filePath),
      size: fileInfo.size,
    };

    socket.write(`${JSON.stringify(header)}\n`);

    const fileStream = createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    for await (const chunk of fileStream) {
      const canContinue = socket.write(chunk);

      if (!canContinue) {
        await once(socket, 'drain');
      }
    }

    socket.end();
  }
);

socket.on('close', () => {
  console.log('upload connection closed');
});

socket.on('error', error => {
  console.error('upload error:', error.code);
});
```


## 핵심 정리


이 코드는 단순히 파일을 보내는 코드가 아니다.


이 코드는 **디스크 읽기 속도와 네트워크 쓰기 속도 사이의 차이를 조율하는 코드**다.


```plain text
디스크가 빠르게 읽음
  ↓
네트워크가 느리게 보냄
  ↓
socket.write()가 false 반환
  ↓
파일 읽기 루프 대기
  ↓
drain 발생
  ↓
다시 전송
```


---


# 최종 프로젝트 1. 멀티플레이어 CLI 채팅 서버


## 목표


```plain text
1. TCP 서버를 띄운다.
2. 여러 클라이언트가 접속한다.
3. 각 클라이언트에 userId를 부여한다.
4. NDJSON 프로토콜로 메시지를 주고받는다.
5. Map으로 세션을 관리한다.
6. 특정 유저에게 whisper를 보낸다.
7. 전체 방에 broadcast한다.
8. close/error 이벤트에서 세션을 정리한다.
9. 잘못된 JSON과 너무 큰 메시지를 방어한다.
```


## 메시지 예시


```json
{"type":"join","name":"kim"}
{"type":"chat","message":"hello"}
{"type":"whisper","to":"user-id","message":"secret"}
{"type":"leave"}
```


## 배우는 것


```plain text
TCP socket
Duplex Stream
EventEmitter
NDJSON
누적 버퍼링
Map 세션 관리
broadcast
예외 처리
프로토콜 설계
```


---


# 최종 프로젝트 2. OOM 없는 TCP 파일 업로더


## 목표


```plain text
1. 클라이언트가 파일 메타데이터 header를 보낸다.
2. 서버가 header를 먼저 파싱한다.
3. 이후 raw file bytes를 파일로 저장한다.
4. 파일 전체를 메모리에 올리지 않는다.
5. write() false와 drain으로 수동 배압을 제어한다.
6. pipe 버전으로 리팩토링한다.
7. 파일 크기와 수신 크기를 비교해 무결성을 검증한다.
8. 중간 종료, 잘못된 header, 과도한 header 크기를 방어한다.
```


## 배우는 것


```plain text
stream-based file upload
TCP byte stream
header/body protocol
Buffer parsing
backpressure
OOM 방어
파일 시스템
소켓 예외 처리
```


---


# 미션 구성


## Mission 1. TCP 서버와 클라이언트 만들기


### 요구사항


```plain text
1. net.createServer로 TCP 서버를 만든다.
2. net.createConnection으로 클라이언트를 만든다.
3. 클라이언트가 보낸 데이터를 서버가 echo한다.
4. remoteAddress, remotePort를 출력한다.
5. close/error 이벤트를 처리한다.
```


### 핵심 질문


```plain text
HTTP 서버와 TCP 서버는 무엇이 다른가?
data 이벤트에서 받은 값은 왜 문자열이 아니라 Buffer인가?
```


---


## Mission 2. localhost와 0.0.0.0 비교


### 요구사항


```plain text
1. 서버를 127.0.0.1에 바인딩한다.
2. 서버를 0.0.0.0에 바인딩한다.
3. 같은 Wi-Fi에 있는 다른 기기에서 접근을 시도한다.
4. 방화벽과 네트워크 설정 영향을 기록한다.
```


### 핵심 질문


```plain text
localhost는 네트워크 바깥에서 접근 가능한 주소인가?
0.0.0.0은 목적지 주소인가, 바인딩 주소인가?
```


---


## Mission 3. TCP 메시지 경계 깨뜨리기


### 요구사항


```plain text
1. 클라이언트에서 JSON 메시지를 여러 번 write한다.
2. 서버에서 data 이벤트가 몇 번 발생하는지 관찰한다.
3. 메시지가 합쳐지거나 쪼개져도 파싱되도록 NDJSON parser를 만든다.
```


### 핵심 질문


```plain text
TCP는 메시지 단위를 보존하는가?
왜 애플리케이션 프로토콜이 필요한가?
```


---


## Mission 4. Map 기반 세션 관리


### 요구사항


```plain text
1. 클라이언트 접속 시 randomUUID를 부여한다.
2. clients Map에 socket을 저장한다.
3. 접속 종료 시 Map에서 제거한다.
4. 모든 클라이언트에게 broadcast한다.
5. 특정 userId에게만 whisper를 보낸다.
```


### 핵심 질문


```plain text
remotePort를 유저 ID로 쓰면 왜 위험한가?
배열 관리와 Map 관리의 차이는 무엇인가?
```


---


## Mission 5. UDP Ping-Pong


### 요구사항


```plain text
1. dgram으로 UDP 서버를 만든다.
2. 클라이언트가 ping 메시지를 보낸다.
3. 서버가 pong을 보낸다.
4. rinfo.address와 rinfo.port를 출력한다.
```


### 핵심 질문


```plain text
UDP는 연결을 맺는가?
UDP는 메시지 경계를 보존하는가?
UDP는 순서와 전달을 보장하는가?
```


---


## Mission 6. TCP 파일 업로더


### 요구사항


```plain text
1. 클라이언트가 파일 header를 먼저 보낸다.
2. 서버는 header 이후 raw bytes를 파일로 저장한다.
3. 파일 전체를 메모리에 올리지 않는다.
4. write() false 시 socket.pause()를 호출한다.
5. drain 시 socket.resume()을 호출한다.
6. 수신 크기와 header의 size를 비교한다.
```


### 핵심 질문


```plain text
대용량 파일 업로드에서 OOM은 왜 발생하는가?
네트워크가 디스크보다 느릴 때 어떤 일이 생기는가?
```


---


# 반드시 잡아야 할 오해


## 오해 1. HTTP와 TCP는 비슷한 것이다


정확히는 다르다.


```plain text
TCP:
전송 계층의 연결과 byte stream

HTTP:
TCP 또는 QUIC 위에서 동작하는 애플리케이션 프로토콜
```


HTTP는 “무엇을 요청하고 어떻게 응답할지”의 규칙이고, TCP는 “연결된 두 프로세스 사이에 바이트를 신뢰성 있게 흘려보내는 방식”이다.


---


## 오해 2. TCP는 내가 보낸 메시지 단위 그대로 받는다


아니다.


```plain text
socket.write(JSON1)
socket.write(JSON2)

받는 쪽:
JSON1 일부
JSON1 나머지 + JSON2 일부
JSON2 나머지
```


TCP에서는 메시지 경계를 직접 설계해야 한다.


---


## 오해 3. UDP는 TCP보다 무조건 좋거나 나쁘다


아니다.


```plain text
TCP:
정확성이 중요할 때

UDP:
지연 시간이 더 중요하고, 일부 손실을 애플리케이션이 감당할 수 있을 때
```


---


## 오해 4. 0.0.0.0은 접속할 주소다


보통 서버 바인딩 문맥에서 `0.0.0.0`은 “모든 IPv4 인터페이스에서 listen하겠다”는 의미다.


클라이언트가 접속할 때는 실제 IP 주소를 사용해야 한다.


```plain text
예:
192.168.0.10
공인 IP
도메인 주소
```


---


## 오해 5. 소켓 error는 예외 처리 안 해도 된다


안 된다.


네트워크는 항상 실패할 수 있다.


```plain text
상대가 갑자기 종료
Wi-Fi 끊김
방화벽 차단
포트 이미 사용 중
잘못된 데이터 전송
파일 저장 중 실패
```


소켓 서버에서는 `error`, `close`, `end`, `timeout` 처리가 기본이다.


---


# 프론트엔드 개발자에게 연결되는 지점


## 1. fetch와 TCP


```javascript
await fetch('/api/users');
```


이 한 줄 아래에는 다음이 숨어 있다.


```plain text
DNS
TCP
TLS
HTTP
server socket
request parser
response stream
```


---


## 2. WebSocket과 Duplex


브라우저 WebSocket:


```javascript
socket.send('hello');

socket.onmessage = event => {
  console.log(event.data);
};
```


Node TCP socket:


```javascript
socket.write('hello');

socket.on('data', chunk => {
  console.log(chunk);
});
```


둘 다 “양방향 통신”이라는 감각으로 연결할 수 있다.


---


## 3. 파일 업로드


프론트엔드에서 파일 업로드를 구현할 때:


```javascript
const formData = new FormData();
formData.append('file', file);

await fetch('/upload', {
  method: 'POST',
  body: formData,
});
```


서버에서는 이 요청 body를 어떻게 처리하느냐에 따라 메모리 사용량이 크게 달라진다.


```plain text
나쁜 방향:
업로드 전체를 메모리에 올림

좋은 방향:
stream으로 읽고 storage로 흘려보냄
```


---


## 4. CDN, GSLB, Edge


프론트엔드 배포에서 자주 듣는 단어들이다.


```plain text
CDN
Edge
Region
DNS
GSLB
Latency
Failover
```


이 강의를 배우면 이 단어들이 단순 인프라 용어가 아니라, 사용자의 요청이 어떤 네트워크 경로로 흘러가는지와 연결된다.


---


# 첫 강의 오프닝 스크립트


여러분은 이미 네트워크를 매일 사용하고 있습니다.


`fetch()`를 호출하고, API 응답을 받고, WebSocket으로 실시간 메시지를 받고, 이미지를 CDN에서 불러옵니다.


그런데 질문을 하나 해보겠습니다.


`fetch()` 아래에는 무엇이 있을까요?


브라우저는 어떻게 서버의 IP를 찾을까요?


TCP 연결은 어떻게 만들어질까요?


Node.js 서버는 들어온 데이터를 문자열로 받을까요, Buffer로 받을까요?


내가 `socket.write()`를 한 번 호출하면 상대도 반드시 한 번의 메시지로 받을까요?


이 강의에서는 Express나 NestJS를 쓰지 않습니다.


대신 Node.js의 `net`과 `dgram` 모듈로 TCP/UDP 소켓을 직접 열어봅니다.


우리는 HTTP 이전 단계로 내려갑니다.


포트, IP, socket, Buffer, stream, backpressure, DNS, NAT를 직접 연결해서 보겠습니다.


목표는 네트워크 이론을 암기하는 것이 아닙니다.


목표는 브라우저 Network 탭에서 보던 요청 하나를, 운영체제와 네트워크 계층까지 추적할 수 있는 시야를 얻는 것입니다.


---


# 최종 학습 성과


이 강의를 마친 수강자는 다음을 설명하고 구현할 수 있어야 한다.


```plain text
1. HTTP와 TCP의 차이
2. TCP socket이 stream 기반으로 동작하는 이유
3. Node.js net 모듈로 TCP 서버와 클라이언트 만들기
4. localhost, 127.0.0.1, 0.0.0.0의 차이
5. port와 ephemeral port의 역할
6. 4-Tuple 기반 연결 식별
7. process.stdin/stdout과 socket을 연결한 CLI 통신
8. 다중 클라이언트 세션 관리
9. Map 기반 O(1) 세션 조회 구조
10. TCP stream에서 메시지 경계가 깨지는 이유
11. NDJSON 기반 커스텀 프로토콜 설계
12. 누적 버퍼링과 StringDecoder 기반 안전한 파싱
13. 소켓 close/error/timeout 처리
14. NAT와 사설 IP, 포트포워딩의 의미
15. DNS lookup과 resolve의 차이
16. IPv4와 IPv6의 큰 그림
17. UDP socket 서버와 클라이언트 구현
18. TCP와 UDP의 실무 선택 기준
19. TCP 파일 업로더에서 backpressure 제어
20. OOM 없는 대용량 네트워크 전송 구조
```


---


# 최종 메시지


네트워크는 추상적인 구름이 아니다.


내 프로세스의 Buffer가 OS 커널을 지나, 포트와 IP를 달고, 라우터와 NAT를 통과해, 다른 프로세스의 Buffer에 도착하는 물리적 흐름이다.


최종적으로 머릿속에 남겨야 할 그림은 이것이다.


```plain text
Browser / CLI Client
  ↓
Application Message
  ↓
JSON / NDJSON / Custom Protocol
  ↓
TCP Socket or UDP Datagram
  ↓
Node.js Buffer
  ↓
OS Kernel
  ↓
IP / Port
  ↓
NAT / Router / DNS
  ↓
Remote OS Kernel
  ↓
Remote Node.js Socket
  ↓
Application Parser
```


Part 1에서 Node.js의 런타임과 메모리를 열었고,


Part 2에서 대용량 데이터의 흐름을 배웠다면,


Part 3에서는 그 흐름이 네트워크를 타고 다른 컴퓨터까지 이동하는 방식을 배운다.

