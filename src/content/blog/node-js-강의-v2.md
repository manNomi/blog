---
title: "Node.js 강의 v2"
description: "강의"
pubDate: 2026-06-09T00:00:00.000Z
tags: ["강의"]
notes: true
notionId: "37a7cf19-a364-8088-889f-d6238ca3da9f"
---
# 프론트엔드 개발자를 위한 Node.js Stream 아키텍처와 대용량 데이터 처리


## 0. 이 강의의 핵심 한 문장


스트림은 대용량 데이터를 **한 번에 소유하지 않고**, 작은 조각으로 흘려보내며 메모리, CPU, I/O 속도 차이를 조율하는 Node.js의 데이터 파이프라인 아키텍처다.


Node.js에서 큰 데이터를 한 번에 메모리에 올리는 방식은 큰 파일이나 네트워크 요청에서 비효율적이고 리소스를 많이 사용한다. 반면 스트림은 데이터를 `chunk` 단위로 처리해 메모리 사용량을 안정적으로 유지한다.


---


## 1. 대상 학습자


이 강의는 다음과 같은 프론트엔드 개발자를 대상으로 한다.

- React, Next.js, Vite 사용 경험이 있는 개발자
- pnpm, npm, dev server, API route 사용 경험이 있는 개발자
- 파일 업로드, 이미지 처리, 로그 출력, fetch 응답 처리 경험이 있는 개발자
- 브라우저에서 `Blob`, `File`, `ArrayBuffer`, `fetch`, `ReadableStream` 같은 개념을 접해본 개발자
- Node.js 서버에서 대용량 데이터를 안전하게 처리하는 감각을 만들고 싶은 개발자

프론트엔드 개발자는 보통 다음 코드가 왜 위험한지 처음에는 체감하기 어렵다.


```javascript
const file = await fs.readFile('10GB-video.mp4');
```


이 코드는 로컬에서는 단순히 “느린 코드”처럼 보일 수 있다. 하지만 운영 서버에서는 다음 문제로 이어질 수 있다.

- 메모리 폭발
- GC 압박
- 요청 지연
- 프로세스 종료
- 동시 요청 시 서버 전체 장애

따라서 이 강의의 목표는 단순히 `pipe()` 문법을 배우는 것이 아니다.


목표는 다음 흐름을 이해하는 것이다.


```plain text
대용량 파일
  ↓
작은 chunk
  ↓
Readable Stream
  ↓
Transform Stream
  ↓
Writable Stream
  ↓
backpressure
  ↓
안전한 pipeline
```


---


## 2. Part 1과 Part 2의 연결


Part 1이 **“Node.js는 어떻게 OS와 메모리에 접근하는가?”** 를 다뤘다면, Part 2는 **“거대한 데이터를 메모리에 올리지 않고 어떻게 흘려보내는가?”** 를 다룬다.



| Part 1에서 배운 내용 | Part 2에서 확장되는 것 |
| --- | --- |
| Buffer | chunk의 실체 |
| fs 모듈 | 파일 Readable / Writable Stream |
| EventEmitter | `data`, `end`, `error`, `drain`, `finish` 이벤트 |
| 이벤트 루프 | I/O 완료와 콜백 흐름 |
| OS 시스템 콜 | `open`, `read`, `write`, `close` 흐름 |
| 인코딩 | chunk 경계에서 글자가 깨지는 문제 |
| OOM | 대용량 파일을 통째로 읽을 때 발생하는 문제 |



Part 1이 **Node.js의 신체 구조**였다면, Part 2는 **Node.js가 무거운 물건을 들지 않고 컨베이어 벨트로 옮기는 방법**이다.


---


## 3. 강의 전체 목차



| 파트 | 주제 | 핵심 질문 |
| --- | --- | --- |
| 1 | 스트림이 필요한 이유 | 왜 `readFile`로 대용량 파일을 처리하면 위험한가? |
| 2 | 스트림의 4가지 타입 | Readable, Writable, Duplex, Transform은 각각 무엇인가? |
| 3 | Writable Stream | 쓰는 쪽은 언제 “그만 보내”라고 말하는가? |
| 4 | Readable Stream | 읽는 쪽은 어떻게 데이터를 밀거나 당기는가? |
| 5 | chunk 파편화와 StringDecoder | 왜 한글이 chunk 경계에서 깨질 수 있는가? |
| 6 | pipe와 pipeline | 단순 연결과 안전한 중앙 통제는 무엇이 다른가? |
| 7 | zlib 압축 파이프라인 | 압축은 I/O 최적화인가, CPU 비용인가? |
| 8 | Zero-Copy와 Buffer subarray | chunk를 자를 때마다 새 Buffer를 복사해야 하는가? |
| 9 | allocUnsafe와 보안 | 빠른 Buffer 할당은 왜 위험할 수 있는가? |
| 10 | Custom Writable / Readable | 직접 스트림 엔진을 만들려면 무엇을 구현해야 하는가? |
| 11 | Duplex와 Transform | TCP 소켓과 실시간 변환은 왜 스트림의 확장인가? |
| 12 | 최종 프로젝트 | 대용량 로그 / 파일 처리 파이프라인 구축 |



---


## 4. 강의 톤


강의에서는 과장된 표현보다 실무에서 판단 가능한 기준을 중심으로 설명한다.


### 마케팅식 표현

> AI가 결코 이해하지 못하는 OS 커널, V8 엔진, 물리 메모리를 통제한다.

### 강의용 표현

> AI가 생성한 스트림 코드를 검토할 때, 이 코드가 backpressure를 지키는지, 에러 시 리소스를 정리하는지, 대용량 데이터에서 메모리가 선형 증가하지 않는지 판단할 수 있어야 한다.

이렇게 표현하면 학습자는 과장보다 **실제로 무엇을 판단할 수 있게 되는가**에 집중할 수 있다.


---


## 5. 수강 전 환경 안내


권장 실습 환경은 다음과 같다.

- Node.js v22 LTS 이상
- 가능하면 Node.js v24 LTS
- `package.json`에는 `"type": "module"` 사용
- 모든 실습은 ESM 기준으로 작성

운영 환경에서는 Active LTS 또는 Maintenance LTS 버전을 사용하는 것이 권장된다.


---


# Section 1. 스트림의 탄생과 하드웨어의 교감


## 핵심 질문


왜 10GB 파일을 처리할 때 `fs.readFile()`은 위험하고, `createReadStream()`은 안전한가?


## 학습 목표


이 섹션 이후 수강자는 다음을 설명할 수 있어야 한다.

- 파일 전체를 메모리에 올리는 방식은 입력 크기에 따라 메모리 사용량이 증가한다.
- 스트림은 데이터를 작은 chunk로 나누어 처리한다.
- 스트림은 대용량 파일, 네트워크 요청, HTTP 응답, 압축, 암호화 등에 사용된다.
- Node.js 스트림은 EventEmitter를 기반으로 동작하며 처리 단계마다 이벤트를 발생시킨다.

---


## Slide 1. 나쁜 코드에서 출발하기


```javascript
import { readFile } from 'node:fs/promises';

const video = await readFile('./big-video.mp4');

console.log(video.length);
```


이 코드는 작동한다.


하지만 중요한 질문은 **“작동하느냐”** 가 아니라 **“얼마나 큰 파일까지 안전하냐”** 이다.


```plain text
100MB  → 괜찮을 수 있음
1GB    → 위험해지기 시작
10GB   → 대부분의 서버에서 치명적
동시 요청 10개 → 거의 확실히 위험
```


### 설명 포인트


프론트엔드에서 비슷한 실수를 떠올릴 수 있다.


```javascript
const data = hugeArray.map(...).filter(...).reduce(...);
```


작은 데이터에서는 문제가 없다. 하지만 데이터가 커지면 브라우저가 멈출 수 있다.


Node.js 서버에서도 동일한 문제가 발생한다. 차이는 서버가 멈추면 사용자 한 명이 아니라 전체 요청이 영향을 받는다는 점이다.


---


## Slide 2. 스트림의 사고방식


### 잘못된 방식


```plain text
10GB 파일 전체를 RAM에 올린다.
그다음 처리한다.
```


### 스트림 방식


```plain text
64KB 읽는다.
처리한다.
쓴다.

다음 64KB 읽는다.
처리한다.
쓴다.

반복한다.
```


스트림의 본질은 단순히 **파일을 작게 쪼개는 기능**이 아니다.


더 정확히는 다음과 같다.

> 데이터 생산자와 소비자 사이에 흐름 제어가 가능한 파이프라인을 만든다.

---


## 실습 1. readFile과 stream 메모리 비교


### readFile 방식


```javascript
// readfile-memory.js
import { readFile } from 'node:fs/promises';

function printMemory(label) {
  const memory = process.memoryUsage();

  console.log(label, {
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    arrayBuffers: `${Math.round(memory.arrayBuffers / 1024 / 1024)}MB`,
  });
}

printMemory('before');

const data = await readFile('./large.log');

printMemory('after');

console.log(data.length);
```


### stream 방식


```javascript
// stream-memory.js
import { createReadStream } from 'node:fs';

function printMemory(label) {
  const memory = process.memoryUsage();

  console.log(label, {
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    arrayBuffers: `${Math.round(memory.arrayBuffers / 1024 / 1024)}MB`,
  });
}

printMemory('before');

let total = 0;

const stream = createReadStream('./large.log');

stream.on('data', chunk => {
  total += chunk.length;
});

stream.on('end', () => {
  printMemory('after');
  console.log(total);
});
```


### 실습 해설


여기서 중요한 것은 `heapUsed`만 보면 안 된다는 점이다.


`Buffer`는 V8 heap 바깥의 `external`, `arrayBuffers` 영역과도 연결된다. 따라서 대용량 파일 처리에서는 다음 값을 함께 확인해야 한다.

- `rss`
- `heapUsed`
- `external`
- `arrayBuffers`

---


# Section 2. 스트림의 4가지 타입


## 핵심 질문


Node.js Stream의 Readable, Writable, Duplex, Transform은 각각 어떤 방향의 파이프인가?


---


## 스트림 4종류



| 타입 | 방향 | 비유 | 대표 예시 |
| --- | --- | --- | --- |
| Readable | 읽기 | 물을 퍼올리는 펌프 | `fs.createReadStream`, `req`, `stdin` |
| Writable | 쓰기 | 물이 빠지는 배수구 | `fs.createWriteStream`, `res`, `stdout` |
| Duplex | 읽기 + 쓰기 | 양방향 전화기 | TCP socket |
| Transform | 읽기 + 쓰기 + 변환 | 정수 필터 | gzip, 암호화, CSV parser |



`Duplex`와 `Transform`은 모두 Readable이면서 Writable이다.


따라서 내부적으로 다음을 각각 유지한다.

- 읽기 버퍼
- 쓰기 버퍼

대표적으로 `net.Socket`은 Duplex Stream이다. 읽는 쪽은 받은 데이터를 소비하고, 쓰는 쪽은 소켓에 데이터를 보낸다.


---


## Slide. 프론트엔드 비유


브라우저에서 파일 업로드를 생각해보자.


```plain text
사용자 파일 선택
  ↓
브라우저가 파일을 조각으로 읽음
  ↓
네트워크로 전송
  ↓
서버가 요청 body를 받음
  ↓
서버가 디스크나 클라우드 스토리지에 저장
```


여기에는 이미 스트림 사고가 숨어 있다.


```plain text
브라우저 File / Blob
  ↓
HTTP Request Body
  ↓
Node.js req: Readable
  ↓
파일 저장 stream: Writable
```


---


# Section 3. Writable Stream과 Backpressure


## 핵심 질문


쓰는 쪽이 느리면, 읽는 쪽은 어떻게 멈춰야 하는가?


`Backpressure`는 데이터를 받는 쪽이 처리 속도를 따라가지 못할 때 버퍼 뒤쪽에 데이터가 쌓이는 문제다.


읽는 쪽이 쓰는 쪽보다 너무 빠르면 write queue가 길어진다. 처리 완료 전까지 더 많은 데이터를 메모리에 보관해야 하므로 메모리 사용량이 증가한다.


---


## 가장 중요한 규칙


```plain text
writable.write(chunk)가 false를 반환하면,
더 쓰지 말고 'drain' 이벤트를 기다린다.
```


`write()`가 `false`를 반환했다는 것은 다음 의미다.

> 쓰기 대상이 지금 속도를 따라오지 못하니 잠깐 멈춰라.

이 신호를 무시하면 Node.js가 계속 chunk를 버퍼링한다. 그 결과 메모리 사용량이 증가하고, 최악의 경우 프로세스가 중단될 수 있다.


---


## 실습 2. Backpressure를 무시한 코드


```javascript
import { createWriteStream } from 'node:fs';

const writable = createWriteStream('./output.txt', {
  highWaterMark: 16 * 1024,
});

for (let i = 0; i < 1_000_000; i += 1) {
  writable.write(`line${i}\n`);
}

writable.end();
```


이 코드는 빠르게 보일 수 있다. 하지만 내부적으로 쓰기 버퍼가 계속 쌓일 수 있다.


---


## 실습 3. Backpressure를 존중한 코드


```javascript
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';

const writable = createWriteStream('./output.txt', {
  highWaterMark: 16 * 1024,
});

for (let i = 0; i < 1_000_000; i += 1) {
  const canContinue = writable.write(`line${i}\n`);

  if (!canContinue) {
    await once(writable, 'drain');
  }
}

writable.end();
```


이 코드는 느린 코드가 아니다.


이 코드는 **하드웨어의 처리 속도를 존중하는 코드**다.


```plain text
CPU: 더 보낼 수 있어!
디스크: 아직 못 썼어.
Writable: false 반환
내 코드: drain까지 대기
디스크: 버퍼 비웠어.
Writable: drain 발생
내 코드: 다시 write
```


---


## highWaterMark 설명


`highWaterMark`는 “여기까지 버퍼링하면 조심하라”는 기준점이다.


엄격한 메모리 제한이 아니라 threshold에 가깝다.


```javascript
const writable = createWriteStream('./output.txt', {
  highWaterMark: 64 * 1024,
});
```


강의에서는 다음처럼 설명할 수 있다.

> highWaterMark는 물탱크의 절대 크기가 아니다.
>
> “이 정도 차면 더 붓지 말자”는 경고선에 가깝다.
>
>

---


# Section 4. Readable Stream과 Flow Control


## 핵심 질문


Readable Stream은 데이터를 언제 밀어내고, 언제 멈추는가?


Readable Stream은 데이터를 소비하는 방식에 따라 흐름이 바뀐다.


```javascript
stream.on('data', chunk => {
  // flowing mode
});
```


```javascript
for await (const chunk of stream) {
  // async iterator
}
```


`data` 이벤트 리스너가 붙거나 `pipe()`가 호출되면 Readable Stream은 flowing mode로 전환되어 데이터를 방출한다.


또한 Readable Stream은 async iterable로 사용할 수 있으므로 `for await...of`로 chunk를 순차 소비할 수 있다.


---


## 실습 4. data 이벤트 방식


```javascript
import { createReadStream } from 'node:fs';

const readable = createReadStream('./large.log', {
  highWaterMark: 64 * 1024,
});

readable.on('data', chunk => {
  console.log('chunk:', chunk.length);
});

readable.on('end', () => {
  console.log('done');
});
```


이 방식은 직관적이다.


하지만 처리 로직이 복잡해지면 이벤트 기반 코드가 흩어질 수 있다.


---


## 실습 5. for await…of 방식


```javascript
import { createReadStream } from 'node:fs';

const readable = createReadStream('./large.log', {
  highWaterMark: 64 * 1024,
});

let total = 0;

for await (const chunk of readable) {
  total += chunk.length;
  console.log('chunk:', chunk.length);
}

console.log('total:', total);
```


---


## 프론트엔드 연결


프론트엔드 개발자는 이미 이런 사고에 익숙하다.


```javascript
for await (const chunk of response.body) {
  // browser ReadableStream 처리
}
```


Node.js에서도 같은 사고로 큰 데이터를 순차적으로 처리할 수 있다.


---


# Section 5. Chunk 파편화와 StringDecoder


## 핵심 질문


스트림은 chunk로 나누어 읽는데, 글자가 chunk 경계에서 잘리면 어떻게 되는가?


프론트엔드 개발자는 문자열을 “문자 단위”로 생각하기 쉽다. 하지만 스트림은 “바이트 단위”로 자른다.


예를 들어 UTF-8에서 한글 한 글자는 보통 여러 바이트다.


```plain text
안
  ↓ UTF-8
EC 95 88
```


그런데 chunk가 이렇게 잘릴 수 있다.


```plain text
chunk 1: EC 95
chunk 2: 88
```


이때 각 chunk를 바로 `toString('utf8')` 하면 문자가 깨질 수 있다.


---


## 나쁜 코드


```javascript
import { createReadStream } from 'node:fs';

const readable = createReadStream('./korean.txt', {
  highWaterMark: 2,
});

readable.on('data', chunk => {
  console.log(chunk.toString('utf8'));
});
```


`highWaterMark: 2`는 일부러 문제를 만들기 위한 설정이다.


UTF-8 한글이 3바이트로 표현될 때, 2바이트씩 자르면 글자 중간이 잘린다.


---


## 좋은 코드: StringDecoder


`node:string_decoder` 모듈은 Buffer를 문자열로 디코딩할 때 UTF-8, UTF-16 같은 멀티바이트 문자가 중간에서 깨지지 않도록 내부 버퍼를 사용한다.


불완전한 멀티바이트 문자는 다음 `write()` 또는 `end()` 호출까지 내부 버퍼에 보관된다.


```javascript
import { createReadStream } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

const decoder = new StringDecoder('utf8');

const readable = createReadStream('./korean.txt', {
  highWaterMark: 2,
});

readable.on('data', chunk => {
  const text = decoder.write(chunk);
  console.log(text);
});

readable.on('end', () => {
  const rest = decoder.end();

  if (rest) {
    console.log(rest);
  }
});
```


---


## 강의 포인트


스트림은 단순히 “쪼개서 읽기”가 아니다.


쪼개진 데이터를 논리적으로 다시 이어붙이는 책임까지 이해해야 한다.


```plain text
물리적 chunk 경계 !== 논리적 문자 경계
물리적 chunk 경계 !== CSV row 경계
물리적 chunk 경계 !== JSON object 경계
물리적 chunk 경계 !== 영상 frame 경계
```


이 문장을 반드시 강조한다.


---


# Section 6. Pipe와 Pipeline


## 핵심 질문


`readable.pipe(writable)`만 쓰면 충분한가?


`pipe()`는 매우 편리하다.


```javascript
import { createReadStream, createWriteStream } from 'node:fs';

createReadStream('./input.txt')
  .pipe(createWriteStream('./output.txt'));
```


하지만 `pipe()`만으로는 에러 처리와 자원 정리가 애매해질 수 있다.


Readable Stream에서 에러가 발생했을 때 Writable destination이 자동으로 닫히지 않을 수 있다. 따라서 메모리 누수나 파일 descriptor 누수를 막기 위해 각 stream을 직접 닫아야 하는 상황이 생길 수 있다.


---


## Pipeline 사용


```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

await pipeline(
  createReadStream('./input.txt'),
  createWriteStream('./output.txt')
);
```


`pipeline()`은 여러 스트림을 연결하고, 실패 시 정리까지 중앙에서 다룰 수 있는 더 안전한 방식이다.


에러가 발생하면 완료된 스트림 일부를 제외하고 각 스트림에 `stream.destroy(err)`를 호출해 정리한다.


---


## 강의용 비유


```plain text
pipe()
  파이프를 손으로 이어 붙이는 방식

pipeline()
  전체 수도관을 중앙 제어실에 등록하는 방식
  중간 파이프가 터지면 전체 라인을 정지하고 정리한다
```


---


# Section 7. Zlib과 압축 파이프라인


## 핵심 질문


압축은 항상 좋은가?


압축은 네트워크 전송량과 디스크 사용량을 줄일 수 있다.


하지만 CPU를 사용한다.


```plain text
압축 전:
  디스크 / 네트워크 부담 큼
  CPU 부담 작음

압축 후:
  디스크 / 네트워크 부담 작음
  CPU 부담 큼
```


Node.js의 `node:zlib` 모듈은 Gzip, Deflate / Inflate, Brotli, Zstd 압축 기능을 제공한다.


압축과 해제는 Node.js Streams API를 기반으로 동작한다.


---


## 실습 6. gzip 압축


```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('./large.log'),
  createGzip(),
  createWriteStream('./large.log.gz')
);

console.log('compressed');
```


---


## 실습 7. 압축 벤치마크


```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGzip, createBrotliCompress } from 'node:zlib';
import { performance } from 'node:perf_hooks';

async function compress(name, transform, output) {
  const start = performance.now();

  await pipeline(
    createReadStream('./large.log'),
    transform,
    createWriteStream(output)
  );

  const end = performance.now();
  const result = await stat(output);

  console.log(name, {
    time: `${Math.round(end - start)}ms`,
    size: `${Math.round(result.size / 1024 / 1024)}MB`,
  });
}

await compress('gzip', createGzip(), './large.log.gz');
await compress('brotli', createBrotliCompress(), './large.log.br');
```


---


## 강의 포인트


결과를 단순히 “Brotli가 더 좋다”, “gzip이 더 빠르다”로 외우면 안 된다.


중요한 질문은 다음이다.

- 지금 병목은 네트워크인가?
- 지금 병목은 디스크인가?
- 지금 병목은 CPU인가?
- 요청마다 압축하는가?
- 한 번 압축하고 캐시할 수 있는가?

압축은 비용이 큰 작업이다. 매 요청마다 압축하는 것보다 압축 결과를 캐시하는 것이 더 효율적일 수 있다.


---


# Section 8. Zero-Copy와 Buffer subarray


## 핵심 질문


chunk를 자를 때마다 새 Buffer를 복사해야 하는가?


Part 1에서 Buffer를 배웠다면, Part 2에서는 Buffer를 **복사하지 않고 바라보는 방식**을 배운다.


```javascript
const original = Buffer.from('hello world');

const view = original.subarray(0, 5);

console.log(view.toString()); // hello
```


`buf.subarray()`는 원본과 같은 메모리를 참조하는 새 Buffer view를 반환한다.


따라서 새 Buffer view를 수정하면 원본 메모리에도 영향이 갈 수 있다.


---


## 복사와 View 차이


```javascript
const original = Buffer.from('hello');

const view = original.subarray(0, 2);
const copy = Uint8Array.prototype.slice.call(original, 0, 2);

original[0] = 0x48; // H

console.log(view.toString()); // He
console.log(Buffer.from(copy).toString()); // he
```


---


## 강의 포인트


Zero-Copy는 “무조건 좋은 기술”이 아니다.


### 장점

- 복사 비용 감소
- CPU 낭비 감소
- 메모리 할당 감소

### 주의점

- 원본이 바뀌면 view도 영향을 받는다.
- 참조가 오래 살아 있으면 큰 원본 Buffer가 GC되지 못할 수 있다.
- 보안 민감 데이터에서는 조심해야 한다.

---


# Section 9. allocUnsafe와 보안


## 핵심 질문


빠른 Buffer 할당은 왜 위험할 수 있는가?


```javascript
const buffer = Buffer.allocUnsafe(1024);
```


`allocUnsafe()`는 빠를 수 있지만 초기화되지 않은 메모리를 반환한다.


해당 메모리 구간에 민감한 이전 데이터가 남아 있을 수 있다. 완전히 덮어쓰지 않고 읽으면 이전 데이터가 노출될 수 있으므로 주의해야 한다.


---


## 안전한 사용 규칙


```javascript
const buffer = Buffer.allocUnsafe(1024);

// 반드시 전체 영역을 덮어쓴다.
buffer.fill(0);
```


또는 처음부터 안전하게 할당한다.


```javascript
const buffer = Buffer.alloc(1024);
```


---


## 강의 포인트


실무 기준은 단순하다.


```plain text
성능이 정말 중요하고,
즉시 전체 내용을 덮어쓸 수 있고,
민감 데이터가 섞이지 않는 맥락이면 allocUnsafe를 검토한다.

그 외에는 Buffer.alloc을 기본으로 쓴다.
```


---


# Section 10. Custom Writable Stream


## 핵심 질문


내가 직접 쓰기 스트림을 만들려면 무엇을 구현해야 하는가?


Writable Stream의 핵심은 `_write()`다.


```javascript
import { Writable } from 'node:stream';

class UppercaseWritable extends Writable {
  _write(chunk, encoding, callback) {
    console.log(chunk.toString().toUpperCase());
    callback();
  }
}

const writable = new UppercaseWritable();

writable.write('hello');
writable.write('stream');
writable.end();
```


---


## OS 자원과 연결된 Writable


```javascript
import { Writable } from 'node:stream';
import fs from 'node:fs';

class FileWritable extends Writable {
  constructor(filename) {
    super();

    this.filename = filename;
    this.fd = null;
  }

  _construct(callback) {
    fs.open(this.filename, 'w', (error, fd) => {
      if (error) {
        callback(error);
        return;
      }

      this.fd = fd;
      callback();
    });
  }

  _write(chunk, encoding, callback) {
    fs.write(this.fd, chunk, callback);
  }

  _final(callback) {
    console.log('all writes finished');
    callback();
  }

  _destroy(error, callback) {
    if (!this.fd) {
      callback(error);
      return;
    }

    fs.close(this.fd, closeError => {
      callback(closeError || error);
    });
  }
}
```


---


## 강의 포인트


이 코드는 단순히 “파일 쓰기 클래스”가 아니다.


운영 서버에서 중요한 생명주기를 담고 있다.


```plain text
_construct
  파일을 연다.
  fd를 얻는다.

_write
  데이터를 쓴다.

_final
  마지막 남은 데이터를 정리한다.

_destroy
  에러가 나도 fd를 닫는다.
```


`_construct()`는 비동기 리소스 초기화를 위해 사용할 수 있다. `_write()` 같은 내부 호출은 `_construct()`의 callback 이후로 지연된다.


`_final()`은 stream이 닫히기 전 남은 데이터를 쓰거나 리소스를 정리할 때 유용하다. callback이 호출될 때까지 `finish` 이벤트가 지연된다.


---


# Section 11. Custom Readable Stream


## 핵심 질문


내가 직접 읽기 스트림을 만들려면 무엇을 구현해야 하는가?


Readable Stream의 핵심은 `_read()`다.


모든 Readable Stream 구현은 내부 리소스에서 데이터를 가져오기 위해 `_read()`를 구현해야 한다. 데이터가 준비되면 `this.push(dataChunk)`로 읽기 큐에 넣는다.


`push()`가 `false`를 반환하면 더 밀어 넣지 말고 다음 `_read()` 호출까지 기다려야 한다.


---


## 간단한 Readable


```javascript
import { Readable } from 'node:stream';

class NumberReadable extends Readable {
  #current = 0;

  _read() {
    this.#current += 1;

    if (this.#current > 5) {
      this.push(null);
      return;
    }

    this.push(`${this.#current}\n`);
  }
}

const readable = new NumberReadable();

for await (const chunk of readable) {
  console.log(chunk.toString());
}
```


---


## 파일 기반 Custom Readable


```javascript
import { Readable } from 'node:stream';
import fs from 'node:fs';

class FileReadable extends Readable {
  constructor(filename) {
    super();

    this.filename = filename;
    this.fd = null;
    this.position = 0;
  }

  _construct(callback) {
    fs.open(this.filename, 'r', (error, fd) => {
      if (error) {
        callback(error);
        return;
      }

      this.fd = fd;
      callback();
    });
  }

  _read(size) {
    const buffer = Buffer.alloc(size);

    fs.read(this.fd, buffer, 0, size, this.position, (error, bytesRead) => {
      if (error) {
        this.destroy(error);
        return;
      }

      if (bytesRead === 0) {
        this.push(null);
        return;
      }

      this.position += bytesRead;

      this.push(buffer.subarray(0, bytesRead));
    });
  }

  _destroy(error, callback) {
    if (!this.fd) {
      callback(error);
      return;
    }

    fs.close(this.fd, closeError => {
      callback(closeError || error);
    });
  }
}
```


---


# Section 12. Transform Stream


## 핵심 질문


흘러가는 데이터를 중간에서 어떻게 바꾸는가?


Transform Stream은 읽기와 쓰기를 모두 하면서, 입력 chunk를 출력 chunk로 바꾼다.


```plain text
Readable
  ↓
Transform
  ↓
Writable
```


예시는 다음과 같다.


```plain text
파일 읽기
  ↓
대문자로 변환
  ↓
파일 쓰기
```


---


## 실습 8. 대문자 변환 Transform


```javascript
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';

class UppercaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    const output = chunk.toString().toUpperCase();

    callback(null, output);
  }
}

await pipeline(
  createReadStream('./input.txt'),
  new UppercaseTransform(),
  createWriteStream('./output.txt')
);
```


---


## 실습 9. In-place 변환


텍스트가 아니라 바이트 단위 데이터를 다룬다면 새 Buffer를 만들지 않고 기존 chunk를 직접 바꿀 수 있다.


```javascript
import { Transform } from 'node:stream';

class CaesarCipherTransform extends Transform {
  constructor(shift = 3) {
    super();

    this.shift = shift;
  }

  _transform(chunk, encoding, callback) {
    for (let i = 0; i < chunk.length; i += 1) {
      const code = chunk[i];

      if (code >= 97 && code <= 122) {
        chunk[i] = ((code - 97 + this.shift) % 26) + 97;
      }
    }

    callback(null, chunk);
  }
}
```


---


## 강의 포인트


이 실습은 암호화 알고리즘 강의가 아니다.


목표는 다음을 이해하는 것이다.


```plain text
chunk는 Buffer다.
Buffer는 바이트 배열이다.
바이트 배열은 index로 직접 수정할 수 있다.
새 메모리를 만들지 않고 변환할 수도 있다.
하지만 원본 변경의 위험도 함께 생긴다.
```


---


# Section 13. Duplex Stream과 TCP 사고방식


## 핵심 질문


읽기와 쓰기가 동시에 가능한 스트림은 왜 네트워크와 연결되는가?


Duplex는 읽기도 하고 쓰기도 한다.


```plain text
내가 서버에 데이터 보냄  → writable side
서버가 나에게 데이터 보냄 → readable side
```


TCP socket이 대표적인 Duplex Stream이다.


---


## 프론트엔드 연결


브라우저 WebSocket을 떠올리면 쉽다.


```javascript
socket.send('hello');

socket.onmessage = event => {
  console.log(event.data);
};
```


Node.js TCP socket도 개념적으로는 비슷하다.


```plain text
send / write
receive / data
```


다만 TCP socket은 더 낮은 레벨에서 byte stream을 다룬다.


---


# Section 14. 최종 프로젝트 설계


## 프로젝트명


대용량 로그 스트림 처리 파이프라인


## 프로젝트 목표


다음 요구사항을 만족하는 Node.js 프로그램을 만든다.

1. 대용량 로그 파일을 한 번에 메모리에 올리지 않는다.
2. Readable Stream으로 chunk 단위로 읽는다.
3. StringDecoder로 UTF-8 문자 깨짐을 방지한다.
4. 줄 단위로 로그를 복원한다.
5. 특정 레벨(ERROR, WARN)만 필터링한다.
6. Transform Stream으로 원하는 형태로 변환한다.
7. gzip으로 압축한다.
8. pipeline으로 전체 스트림을 안전하게 연결한다.
9. 처리 중 에러가 나면 모든 리소스를 정리한다.
10. 메모리 사용량을 측정한다.

---


## 프로젝트 구조


```plain text
node-stream-lab/
  package.json
  src/
    index.js
    transforms/
      line-splitter.js
      log-filter.js
      log-format.js
    utils/
      memory.js
  data/
    app.log
  output/
    error.log.gz
```


---


## line-splitter.js


```javascript
import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export class LineSplitter extends Transform {
  constructor() {
    super({
      readableObjectMode: true,
    });

    this.decoder = new StringDecoder('utf8');
    this.leftover = '';
  }

  _transform(chunk, encoding, callback) {
    const text = this.leftover + this.decoder.write(chunk);
    const lines = text.split('\n');

    this.leftover = lines.pop() ?? '';

    for (const line of lines) {
      this.push(line);
    }

    callback();
  }

  _flush(callback) {
    const rest = this.leftover + this.decoder.end();

    if (rest) {
      this.push(rest);
    }

    callback();
  }
}
```


---


## log-filter.js


```javascript
import { Transform } from 'node:stream';

export class LogFilter extends Transform {
  constructor(levels = ['ERROR']) {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
    });

    this.levels = new Set(levels);
  }

  _transform(line, encoding, callback) {
    const shouldKeep = [...this.levels].some(level =>
      line.includes(`[${level}]`)
    );

    if (shouldKeep) {
      this.push(line);
    }

    callback();
  }
}
```


---


## log-format.js


```javascript
import { Transform } from 'node:stream';

export class LogFormat extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
    });
  }

  _transform(line, encoding, callback) {
    callback(null, `${line}\n`);
  }
}
```


---


## memory.js


```javascript
export function printMemory(label) {
  const memory = process.memoryUsage();

  console.log(label, {
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    arrayBuffers: `${Math.round(memory.arrayBuffers / 1024 / 1024)}MB`,
  });
}
```


---


## index.js


```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

import { LineSplitter } from './transforms/line-splitter.js';
import { LogFilter } from './transforms/log-filter.js';
import { LogFormat } from './transforms/log-format.js';
import { printMemory } from './utils/memory.js';

printMemory('before');

await pipeline(
  createReadStream('./data/app.log', {
    highWaterMark: 64 * 1024,
  }),
  new LineSplitter(),
  new LogFilter(['ERROR', 'WARN']),
  new LogFormat(),
  createGzip(),
  createWriteStream('./output/error.log.gz')
);

printMemory('after');

console.log('done');
```


---


# Section 15. 미션 구성


## Mission 1. readFile vs stream 메모리 비교


### 요구사항

1. 500MB 이상의 더미 파일을 만든다.
2. `readFile` 방식으로 읽고 메모리를 출력한다.
3. `createReadStream` 방식으로 읽고 메모리를 출력한다.
4. `rss`, `heapUsed`, `external`, `arrayBuffers` 차이를 기록한다.

### 학습 질문

- `heapUsed`만 보면 왜 부족한가?
- Buffer 메모리는 어디에 반영되는가?
- 파일 크기가 커질 때 두 방식의 메모리 패턴은 어떻게 다른가?

---


## Mission 2. Backpressure 수동 처리


### 요구사항

1. Writable Stream을 만든다.
2. `highWaterMark`를 작게 설정한다.
3. `write()` 반환값이 `false`일 때 `drain`을 기다린다.
4. `drain`을 기다리지 않은 코드와 비교한다.

### 핵심 답변


```plain text
write()가 false를 반환한다는 것은
“쓰기 대상이 지금 속도를 따라오지 못하니 잠깐 멈춰라”는 신호다.
```


---


## Mission 3. UTF-8 파편화 복구


### 요구사항

1. 한글이 포함된 파일을 만든다.
2. `highWaterMark`를 1 또는 2로 설정한다.
3. `chunk.toString()` 방식의 깨짐을 확인한다.
4. `StringDecoder`로 복구한다.

---


## Mission 4. pipe를 pipeline으로 리팩토링


### 나쁜 코드


```javascript
createReadStream('./input.txt')
  .pipe(createGzip())
  .pipe(createWriteStream('./input.txt.gz'));
```


### 좋은 코드


```javascript
await pipeline(
  createReadStream('./input.txt'),
  createGzip(),
  createWriteStream('./input.txt.gz')
);
```


### 학습 질문

- 중간 Transform에서 에러가 나면 어떻게 되는가?
- 파일 descriptor는 정리되는가?
- 왜 중앙 통제 방식이 실무에서 더 안전한가?

---


## Mission 5. Custom Transform 구현


### 요구사항

1. 입력 텍스트를 줄 단위로 나눈다.
2. `ERROR` 라인만 통과시킨다.
3. 결과를 gzip으로 압축한다.
4. 전체를 `pipeline`으로 연결한다.

---


# Section 16. 프론트엔드 개발자를 위한 연결 포인트


## 1. 브라우저의 영상 재생


브라우저에서 영상을 볼 때 전체 영상을 다 다운로드한 뒤 재생하지 않는다.


```plain text
일부 데이터 다운로드
  ↓
버퍼링
  ↓
재생
  ↓
다음 데이터 다운로드
  ↓
계속 재생
```


Node.js Stream도 같은 사고다.


---


## 2. 파일 업로드


프론트엔드에서 사용자가 2GB 영상을 업로드한다고 해보자.


```plain text
사용자 File
  ↓
HTTP request body
  ↓
Node.js request stream
  ↓
storage write stream
```


이때 서버가 request body 전체를 메모리에 올리면 위험하다.


---


## 3. Next.js / API Route와 연결


프론트엔드 개발자가 Next.js나 BFF 서버를 다룬다면 다음 질문이 중요하다.

- 파일 업로드 API가 body 전체를 메모리에 올리는가?
- 이미지 변환을 stream으로 처리하는가?
- 압축을 요청마다 새로 하는가?
- 응답을 chunk 단위로 보낼 수 있는가?

---


## 4. Web Streams와 Node Streams


Node.js에는 Node Stream과 Web Streams를 서로 변환하는 유틸리티가 있다.


```plain text
브라우저 ReadableStream
  ↔
Node.js Readable Stream
```


즉, 스트림은 백엔드만의 개념이 아니라 브라우저, 서버, 네트워크를 관통하는 데이터 흐름 모델이다.


---


# Section 17. 강의에서 반드시 잡아야 할 오해


## 오해 1. 스트림은 빠르게 만드는 기술이다


정확히는 아니다.


스트림의 1차 목적은 **메모리 사용량을 입력 크기와 분리하는 것**이다.


속도는 상황에 따라 빨라질 수도, 느려질 수도 있다.


```plain text
readFile:
  전체를 한 번에 읽고 처리
  메모리 많이 사용
  단순함

stream:
  조각으로 읽고 처리
  메모리 안정적
  흐름 제어 필요
```


---


## 오해 2. highWaterMark는 메모리 제한이다


아니다.


`highWaterMark`는 threshold이지, 엄격한 메모리 상한선이 아니다.


---


## 오해 3. pipe만 쓰면 에러 처리도 자동으로 완벽하다


아니다.


단순 `pipe()`에서는 에러 시 모든 destination이 자동으로 닫히지 않을 수 있다.


실무에서는 `pipeline()`을 기본으로 사용하는 편이 안전하다.


---


## 오해 4. chunk는 항상 문자열이다


아니다.


인코딩을 지정하지 않으면 일반적으로 `Buffer`를 받는다.


---


## 오해 5. Transform은 map 함수와 같다


비슷하지만 더 복잡하다.


```plain text
Array.map:
  이미 메모리에 있는 배열을 변환

Transform Stream:
  아직 다 도착하지 않은 데이터를
  chunk 단위로 받으며
  backpressure를 지키면서
  순차적으로 변환
```


---


# Section 18. 첫 강의 오프닝 스크립트


여러분은 이미 Node.js를 많이 사용해봤습니다.


`npm run dev`, `vite`, `next dev`, 파일 업로드 API, 이미지 처리, 로그 저장, 배포 스크립트까지 모두 Node.js 위에서 돌아갑니다.


그런데 질문을 하나 해보겠습니다.

> 10GB짜리 파일을 서버에서 처리해야 한다면 어떻게 하시겠습니까?

가장 쉬운 코드는 이것입니다.


```javascript
await fs.readFile('10gb.mp4');
```


하지만 이 코드는 실무에서 서버를 터뜨릴 수 있습니다.


파일 하나만 처리하면 괜찮아 보여도, 요청이 동시에 들어오는 순간 메모리는 입력 크기와 요청 수에 비례해서 증가합니다.


스트림은 이 문제를 해결하기 위한 Node.js의 핵심 아키텍처입니다.


스트림은 거대한 데이터를 한 번에 들고 있지 않습니다. 작은 조각으로 읽고, 처리하고, 쓰고, 상대가 느리면 기다립니다.


이 강의에서는 `pipe()`를 외우지 않습니다.


우리는 데이터가 어디에서 생기고, 어디로 흐르고, 언제 멈추고, 언제 다시 흐르는지 추적합니다.


오늘부터 Node.js를 **파일을 읽는 도구**가 아니라, **메모리와 I/O 속도를 조율하는 데이터 파이프라인 엔진**으로 보겠습니다.


---


# Section 19. 최종 학습 성과


이 Part 2를 마친 수강자는 다음을 설명하고 구현할 수 있어야 한다.

1. `readFile` 방식과 `stream` 방식의 메모리 차이
2. Readable, Writable, Duplex, Transform Stream의 역할
3. chunk와 Buffer의 관계
4. `highWaterMark`가 threshold인 이유
5. `write()` false와 `drain` 이벤트의 의미
6. backpressure를 무시했을 때 메모리가 증가하는 이유
7. chunk 경계에서 UTF-8 문자가 깨지는 원리
8. StringDecoder가 불완전한 멀티바이트 문자를 보관하는 방식
9. `pipe`와 `pipeline`의 차이
10. zlib 압축 파이프라인 구성
11. 압축의 CPU / I/O trade-off
12. Buffer subarray 기반 zero-copy 사고방식
13. `allocUnsafe`의 성능상 장점과 보안상 위험
14. Custom Writable Stream 구현
15. Custom Readable Stream 구현
16. Transform Stream으로 실시간 데이터 변환
17. Duplex Stream과 TCP 소켓의 연결
18. 대용량 로그 처리 파이프라인 설계

---


# Section 20. Part 2의 최종 메시지


대용량 데이터를 처리하는 실력은 **큰 서버를 쓰는 능력**이 아니라, **큰 데이터를 작게 흘려보내는 능력**이다.


마지막으로 이 흐름을 머릿속에 남겨야 한다.


```plain text
파일 / 네트워크 / stdin
  ↓
Readable Stream
  ↓
chunk
  ↓
Buffer
  ↓
Transform Stream
  ↓
backpressure
  ↓
pipeline
  ↓
Writable Stream
  ↓
파일 / 네트워크 / stdout
```


Part 1에서 Node.js의 내부 구조를 열었다면, Part 2에서는 그 구조 위에서 대용량 데이터가 안전하게 흐르는 법을 배운다.

