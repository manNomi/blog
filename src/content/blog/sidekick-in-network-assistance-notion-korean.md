---
title: "Sidekick_In_Network_Assistance_Notion_Korean"
pubDate: 2026-06-09T00:00:00.000Z
notes: true
notionId: "3737cf19-a364-8085-b295-cad3b091ea73"
---
# Sidekick: In-Network Assistance for Secure End-to-End Transport Protocols

> **논문**: _Sidekick: In-Network Assistance for Secure End-to-End Transport Protocols_
>
> **저자**: Gina Yuan, Matthew Sotoudeh, David K. Zhang, Michael Welzl, David Mazières, Keith Winstein
>
>
> **학회**: NSDI 2024
>
>
> **주제**: QUIC/WebRTC처럼 암호화된 end-to-end transport protocol에서, 패킷 내용을 복호화하지 않고도 중간 네트워크 장비가 성능 개선 정보를 제공하는 방법
>
>

---


## 0. 한 줄 요약


QUIC 같은 최신 전송 프로토콜은 헤더와 상태를 암호화해서 middlebox가 TCP PEP처럼 개입할 수 없는데, 이 논문은 **기존 보안 전송 연결은 그대로 둔 채**, 옆에 별도의 **sidekick connection**을 만들어 중간 프록시가 “내가 어떤 opaque packet들을 봤는지”를 `quACK`이라는 압축된 형태로 알려주고, endpoint가 그 정보를 이용해 **빠른 재전송, ACK 절감, path-aware congestion control**을 수행하도록 한다.


---


## 1. 이 논문이 풀려는 문제


### 1.1 기존 TCP 세계에서는 PEP가 있었다


전통적인 TCP에서는 중간 네트워크 장비가 TCP 헤더와 sequence number를 볼 수 있었다. 그래서 위성 링크, Wi-Fi, 셀룰러망처럼 특성이 나쁜 구간에서 **Performance Enhancing Proxy, PEP**가 다음과 같은 일을 할 수 있었다.

- TCP 연결을 여러 구간으로 나눔
- 손실이 자주 나는 구간에서 빠르게 재전송
- congestion control을 구간별로 다르게 적용
- ACK을 대신 보내거나, segment를 재구성
- 고지연/고손실 링크에서 성능 보완

즉, TCP PEP는 “end-to-end 원칙”을 어느 정도 깨는 대신 실제 네트워크 환경에서 성능을 올리는 실용적 장치였다.


### 1.2 하지만 PEP는 ossification을 만든다


문제는 middlebox가 TCP 내부 구조를 가정하고 동작한다는 점이다. middlebox가 “TCP는 이렇게 생겼어야 한다”고 가정하면, 새로운 TCP 옵션이나 확장 기능이 배포될 때 그 트래픽을 drop하거나 오동작할 수 있다.


이를 **protocol ossification**, 즉 프로토콜 경직화라고 부른다.


```plain text
TCP 확장 시도
↓
중간 장비가 모르는 옵션/동작을 이상 트래픽으로 오해
↓
패킷 drop 또는 변조
↓
새 프로토콜 배포 어려움
```


이런 이유로 QUIC, WebRTC/SRTP, Mosh/SSP 같은 최신 전송 프로토콜은 transport header와 payload를 암호화하고 인증한다. 이 논문은 이런 프로토콜을 **opaque transport protocol**이라고 부른다.


### 1.3 QUIC은 middlebox 문제를 해결했지만 PEP의 장점도 잃었다


QUIC은 UDP 위에서 동작하고, 전송 계층 상태를 암호화한다. 이 덕분에 middlebox가 QUIC 내부를 임의로 해석하거나 방해하기 어렵다.


하지만 그 결과 다음 문제도 생긴다.


```plain text
QUIC 패킷은 암호화되어 있음
↓
middlebox는 sequence number를 모름
↓
어떤 패킷이 빠졌는지 알 수 없음
↓
TCP PEP처럼 빠른 재전송/ACK 대행/분할 연결 최적화 불가
```


논문의 핵심 질문은 이것이다.

> **전송 프로토콜의 end-to-end 보안성과 wire format은 유지하면서, 중간 네트워크 장비의 성능 보조 기능을 다시 가져올 수 있을까?**

---


## 2. 핵심 아이디어: Sidekick Protocol


Sidekick은 기존 QUIC/WebRTC 같은 연결을 바꾸지 않는다. 대신 그 연결 옆에 별도의 보조 연결을 둔다.


```plain text
Base connection
= 실제 QUIC / WebRTC / opaque transport connection
= end-to-end 암호화됨
= wire format 변경 없음

Sidekick connection
= endpoint와 중간 proxy 사이의 보조 연결
= proxy가 관측한 패킷 정보를 endpoint에게 알려줌
= base connection 자체를 복호화하거나 수정하지 않음
```


### 2.1 논문 Figure 1 구조


논문 Figure 1은 다음 구조를 보여준다.


```plain text
Data Sender  ───── Base connection ───── Proxy ───── Base connection ───── Data Receiver
     ↑                                      │
     └──────────── Sidekick connection ◀────┘
                         quACK
```


프록시는 base connection의 패킷을 관측하지만, 그 안의 cleartext sequence number를 볼 수 없다. 대신 패킷의 opaque identifier를 기반으로 “내가 본 패킷 집합”을 quACK으로 요약해 sender에게 보낸다.


중요한 점은 **프록시가 QUIC 패킷을 수정하지 않는다는 것**이다. 실제 재전송, congestion window 조정, ACK 절감 활용은 모두 endpoint가 한다.


---


## 3. Sidekick이 노리는 3가지 시나리오


논문은 Sidekick의 유용성을 세 가지 상황에서 평가한다.


---


### 3.1 시나리오 1: Low-Latency Media


### 상황


기차 안에서 Wi-Fi를 통해 WebRTC 음성 통화를 한다고 가정한다.


네트워크 경로는 대략 이렇게 나뉜다.


```plain text
노트북 → Wi-Fi AP → 셀룰러/WAN → 상대방 서버 또는 peer
```


여기서 Wi-Fi 구간은 다음 특성을 가진다.

- 지연은 낮음
- 손실은 높음

반면 WAN/셀룰러 구간은 다음 특성을 가진다.

- 지연은 높음
- 손실은 낮음

### 기존 end-to-end 방식의 문제


패킷이 Wi-Fi 구간에서 손실되어도 receiver가 NACK을 보내고 sender가 다시 보내려면 end-to-end RTT를 기다려야 한다.


```plain text
Wi-Fi에서 패킷 손실
↓
receiver가 손실 감지
↓
NACK이 end-to-end로 돌아감
↓
sender가 재전송
↓
긴 RTT 때문에 media buffer delay 증가
```


### Sidekick 방식


Wi-Fi AP에 있는 sidekick proxy가 sender에게 “이 패킷은 나한테 안 왔다”는 정보를 빠르게 알려준다. sender는 receiver의 NACK을 기다리지 않고 빠르게 재전송할 수 있다.


```plain text
Wi-Fi 구간에서 손실 발생
↓
AP sidekick이 quACK으로 알려줌
↓
sender가 빠르게 재전송
↓
de-jitter buffer delay 감소
```


### 결과


실험에서 Sidekick은 latency-sensitive audio stream의 de-jitter delay를 크게 줄였다.

- 에뮬레이션: 99th percentile de-jitter delay가 **48.6 ms → 2.2 ms**로 감소
- 실제 환경: **2.3초 → 204 ms**로 감소

---


### 3.2 시나리오 2: Connection-Splitting PEP Emulation


### 상황


같은 기차 환경에서 사용자가 QUIC 기반 HTTP/3로 큰 파일을 업로드한다고 가정한다.


TCP라면 AP에 split TCP PEP를 두어 다음처럼 성능을 높일 수 있다.


```plain text
Client ─ TCP connection 1 ─ PEP ─ TCP connection 2 ─ Server
```


PEP는 Wi-Fi 구간 손실을 빠르게 감지하고, WAN 구간 congestion window는 별도로 키운다.


### QUIC에서는 왜 안 되나?


QUIC은 전송 상태가 암호화되어 있으므로 PEP가 QUIC 연결을 쪼개거나 sequence number 기반으로 개입할 수 없다.


### Sidekick 방식


Sidekick proxy는 quACK을 통해 sender에게 “어느 구간에서 손실이 발생했는지”를 간접적으로 알려준다. sender는 이 정보를 이용해 **PACUBIC**이라는 path-aware congestion control을 수행한다.


핵심은 다음이다.


```plain text
손실이 sender ↔ proxy 근거리 구간에서 발생했는가?
아니면 proxy 이후 먼 구간에서 발생했는가?
```


이 구분을 알면 congestion window를 더 똑똑하게 조절할 수 있다.


### 결과


에뮬레이션에서 1% random loss가 sender와 proxy 사이의 near path segment에 있을 때, HTTP/3 QUIC upload는 Sidekick을 사용해 end-to-end QUIC 대비 **3.6배 goodput**을 달성했다.


실제 환경에서는 50 MB HTTP/3 upload에서 약 **50% goodput 향상**을 보였다.


---


### 3.3 시나리오 3: ACK Reduction


### 상황


배터리 기반 IoT 기기나 모바일 기기가 Wi-Fi로 대용량 파일을 다운로드한다고 가정한다. receiver가 자주 ACK을 보내면 Wi-Fi radio가 자주 깨어나야 하므로 에너지 소모가 커진다.


ACK 빈도를 줄이면 에너지는 아낄 수 있지만, sender가 다음 정보를 늦게 받는다.

- 패킷 손실 여부
- flow-control window 진행 상황
- congestion-control feedback

따라서 throughput이 떨어질 수 있다.


### Sidekick 방식


Wi-Fi AP의 sidekick proxy가 receiver 대신 더 자주 quACK을 보낸다.


중요한 구분은 다음이다.


```plain text
quACK
= proxy가 패킷을 봤다는 신호
= sender가 congestion/flow window를 진행하는 데 사용 가능

end-to-end ACK
= receiver가 실제로 받았다는 신호
= sender가 retransmission buffer에서 데이터를 삭제하는 데 필요
```


즉, sender는 quACK을 믿고 window는 앞으로 밀 수 있지만, end-to-end 신뢰성 계약을 지키기 위해 데이터 삭제는 receiver의 실제 ACK을 기다린다.


### 결과


에뮬레이션에서 Sidekick은 receiver가 보내는 packet, 대부분 ACK, 수를 **96% 줄이면서도 8.5 Mbps 이상의 goodput**을 유지했다.


---


## 4. 기술적 난점: 암호화된 패킷을 어떻게 ACK할 것인가?


TCP에서는 ACK이 쉽다.


```plain text
sequence number 100까지 받음
그리고 120, 121, 122도 받음
```


하지만 QUIC 같은 opaque transport에서는 middlebox가 cleartext sequence number를 볼 수 없다.


그러면 proxy는 어떤 식으로 “내가 이 패킷들을 봤다”고 sender에게 알려야 할까?


단순한 방법은 패킷마다 hash를 만들어서 전부 보내는 것이다. 하지만 이는 오버헤드가 너무 크다.


이 논문은 이 문제를 **quACK problem**으로 정의한다.


---


## 5. quACK 문제 정의


논문에서 quACK 문제는 수학적으로 이렇게 표현된다.


```plain text
S = sender가 보낸 패킷 identifier들의 multiset
R = proxy가 실제로 받은 패킷 identifier들의 subset
목표 = proxy가 작은 정보를 sender에게 보내면,
      sender가 S \ R, 즉 빠진 패킷들을 복원할 수 있어야 함
```


여기서 sender는 자신이 보낸 S를 알고 있다. proxy는 받은 R만 알고 있다. proxy는 R 전체를 보내지 않고, 작은 요약값만 보내야 한다.


---


## 6. Packet Identifier


Sidekick은 QUIC 내부 sequence number를 보지 않는다. 대신 패킷 자체에서 deterministic한 identifier를 만든다.


가능한 방식은 두 가지다.

1. 전체 payload를 hash한다.
2. QUIC payload가 이미 pseudorandom하므로, 고정 offset의 앞 b bytes를 identifier로 사용한다.

논문은 성능상 두 번째 방법도 가능하다고 본다. 단, 이 경우 해당 bytes가 충분히 random하게 보인다는 가정이 필요하다.


### Identifier 크기와 collision


identifier가 너무 작으면 충돌 가능성이 있다. 논문 Table 1에 따르면 n = 25개 패킷을 고려할 때 collision probability는 다음과 같다.



| Identifier 크기 | Collision probability |
| --- | --- |
| 1 byte | 0.090 |
| 2 bytes | 0.0004 |
| 4 bytes | 5.6e-09 |
| 8 bytes | 거의 0 |



논문은 실험에서 주로 **4-byte identifier**를 사용한다. 이유는 collision 확률이 사실상 무시 가능하면서도 overhead가 작기 때문이다.


---


## 7. 왜 단순한 방법은 안 되는가?


논문은 몇 가지 strawman을 검토한다.


### 7.1 Strawman 1: 받은 identifier를 전부 echo


```plain text
proxy가 받은 모든 packet ID를 sender에게 보냄
```


장점은 단순함이다. 하지만 단점이 크다.

- 패킷마다 ACK성 메시지가 필요
- link overhead 증가
- quACK 자체가 손실되면 sender가 패킷을 잘못 lost로 판단할 수 있음
- TCP로 보내면 reliability는 생기지만 TCP header/ACK overhead가 더 커짐

### 7.2 Strawman 2: 받은 identifier 전체의 cumulative hash


```plain text
proxy가 받은 packet ID들을 정렬/결합해서 hash만 보냄
sender가 가능한 subset들을 전부 해시해서 비교
```


이 방법은 데이터 크기는 작지만 decoding cost가 폭발한다. 빠진 패킷 수가 조금만 늘어도 가능한 subset 조합 수가 너무 많아진다.


---


## 8. Power Sum 기반 quACK


이 논문의 핵심 기술은 **power sum polynomial equations**를 이용한 quACK이다.


### 8.1 직관


가장 단순한 경우, 빠진 패킷이 하나뿐이라고 하자.


```plain text
sender가 보낸 ID 합계 - proxy가 받은 ID 합계 = 빠진 ID
```


빠진 패킷이 여러 개라면 단순한 합만으로는 부족하다. 그래서 1차 합, 2차 합, 3차 합, … 을 보낸다.


```plain text
1st power sum = Σ x
2nd power sum = Σ x²
3rd power sum = Σ x³
...
```


proxy가 받은 R에 대한 power sum을 보내면 sender는 자신이 보낸 S에 대한 power sum과 비교해 빠진 element들을 복원할 수 있다.


### 8.2 quACK format


실제 power sum quACK은 다음 필드를 포함한다.



| 필드 | 의미 |
| --- | --- |
| t개의 b-byte power sums | 빠진 패킷을 복원하기 위한 요약값 |
| 4-byte count | proxy가 받은 packet 수 |
| b-byte last received identifier | 마지막으로 받은 element. in-flight 패킷과 실제 hole을 구분하기 위한 최적화 |



논문에서 선호하는 설정은 다음이다.


```plain text
b = 4 bytes
threshold t = 10
quACK size = 4 + 4 + 4*10 = 48 bytes
```


즉, 48 bytes로 TCP의 cumulative ACK + selective ACK와 비슷한 정보를 opaque packet에 대해 표현한다.


---


## 9. quACK microbenchmark


논문은 power sum quACK이 실제 packet processing에 충분히 가벼운지 측정했다.


기본 설정은 다음과 같다.


```plain text
n = 25 outstanding packets
t = 10 missing packet threshold
b = 4-byte identifiers
CPU = Intel Xeon E5 @ 2.30GHz
```


결과는 다음과 같다.



| 방법 | Encode time | Decode time |
| --- | --- | --- |
| Strawman 1a/1c | 1 ns/pkt | 0 |
| Strawman 1b | 51 ns/pkt | 0 |
| Strawman 2 | 27 ns/pkt | 830 ms |
| Power Sum | 33 ns/pkt | 2.82 µs |



해석하면 다음과 같다.

- Power Sum은 echo 방식보다 조금 복잡하지만 충분히 빠르다.
- Cumulative hash 방식은 decode가 사실상 불가능하다.
- Power Sum은 크기와 계산량 사이에서 매우 좋은 trade-off를 제공한다.

---


## 10. Robin: 논문에서 구현한 Sidekick Protocol


논문은 quACK을 사용하는 구체적인 sidekick protocol을 **Robin**이라고 부른다.


Robin은 다음 기능을 제공한다.

1. sidekick proxy discovery
2. protocol parameter configuration
3. loss detection
4. path-aware congestion control
5. reset/fallback mechanism

---


## 11. PEP Discovery Mechanism


Sidekick proxy를 찾는 방식은 두 가지로 나뉜다.


### 11.1 Explicit configuration


예를 들어 Apple iCloud Private Relay나 MASQUE 같은 구조에서는 proxy가 명시적으로 설정될 수 있다. 이런 경우 session establishment 단계에서 quACK 지원 여부를 협상할 수 있다.


### 11.2 Transparent proxy discovery


일반적인 셀룰러망이나 Wi-Fi AP에서는 proxy가 투명하게 배치될 수 있다. 이 경우 sender는 sidekick 지원 여부를 알아내야 한다.


논문의 현재 설계는 다음과 같다.


```plain text
sender가 sidekick-request marker가 포함된 distinguished packet 전송
↓
proxy가 이를 감지
↓
proxy가 sidekick-reply marker, session ID, proxy address/port를 sender에게 응답
↓
sender는 별도 UDP port로 proxy와 sidekick connection 시작
```


논문은 향후 UDP options가 표준화되면 out-of-band signaling이 더 깔끔하다고 본다.


---


## 12. Security 고려사항


### 12.1 Reflection amplification attack


sidekick은 proxy가 sender에게 추가 packet을 보내는 구조이므로 reflection amplification 위험이 있다.


논문은 이를 완화하기 위해 quACK에 다음을 포함한다.

- quota
- updated session ID

이를 통해 실제 sender만 session을 계속 확장하거나 설정을 바꿀 수 있게 한다.


### 12.2 악의적 PEP


악의적 proxy가 잘못된 quACK을 보낼 수 있다. 하지만 중요한 점은 다음이다.

- credible한 정보는 on-path proxy만 만들 수 있다.
- sender는 end-to-end metric과 proxy feedback을 함께 보고 판단할 수 있다.
- sender는 언제든 sidekick 사용을 중단하고 base protocol의 end-to-end mechanism으로 fallback할 수 있다.
- proxy는 sidekick이 없을 때보다 base traffic을 더 적극적으로 조작할 권한을 얻지는 않는다.

---


## 13. Sender Behavior


### 13.1 Loss detection


quACK을 decode하면 sender는 proxy가 받은 packet identifier 집합을 알 수 있다. 하지만 받지 못한 나머지가 반드시 drop된 것은 아니다. 아직 in-flight일 수도 있고, reordering일 수도 있다.


Robin은 TCP의 3-duplicate ACK rule과 유사한 방식을 사용한다.


```plain text
어떤 packet 이후에 보낸 3개 이상의 packet이 proxy에 도착했는데,
그 packet만 아직 도착하지 않았다면 lost로 판단
```


더 정교한 방식으로는 TCP RACK-TLP 같은 timeout 기반 loss detection도 가능하다고 언급한다.


### 13.2 Reset


quACK decode가 실패하거나 빠진 패킷 수가 threshold t를 넘으면 sender는 proxy에게 reset을 요청할 수 있다.


```plain text
m > t
↓
quACK으로 빠진 패킷 복원 불가
↓
sender가 reset 요청
↓
새로운 quACK 상태로 재시작
```


항상 안전한 fallback은 sidekick을 무시하고 원래 end-to-end protocol만 사용하는 것이다.


---


## 14. PACUBIC: Path-Aware CUBIC


PACUBIC은 이 논문의 congestion control 기여다.


기본 CUBIC은 loss를 보면 congestion event로 보고 congestion window를 줄인다. 문제는 loss의 원인이 반드시 bottleneck congestion이 아닐 수 있다는 점이다.


예를 들어 Wi-Fi 구간의 random loss는 congestion window를 줄인다고 해결되지 않는다.


```plain text
Wi-Fi random loss
↓
CUBIC은 congestion으로 오해
↓
cwnd 감소
↓
throughput 하락
```


Sidekick은 손실이 어느 path segment에서 발생했는지 더 잘 알려준다. PACUBIC은 이 정보를 이용해 congestion window를 조절한다.


### 14.1 핵심 변수


```plain text
r = near path RTT / end-to-end RTT
```


r은 전체 in-flight bytes 중 near segment가 차지하는 비율의 proxy로 사용된다.


### 14.2 quACK으로 감지된 loss인 경우


기본 CUBIC 상수:


```plain text
β* = 0.7
C* = 0.4
```


PACUBIC은 near path loss가 감지되면 다음 상수를 쓴다.


```plain text
β = 1 - r(1 - β*)
C = C* / r³
```


의미는 다음과 같다.

- 전체 end-to-end window를 크게 줄이지 않는다.
- 손실이 발생한 구간에 해당하는 비율만큼만 window 감소를 반영한다.
- 낮은 지연 구간에서는 더 빠른 feedback이 오므로 window 성장도 다르게 조절한다.

### 14.3 end-to-end ACK으로 감지된 loss인 경우


일반 CUBIC처럼 동작한다.


즉, PACUBIC은 split TCP PEP의 두 개 congestion window를 하나의 endpoint-side congestion window로 근사하려는 heuristic이다.


---


## 15. 구현


논문은 Robin을 실제로 구현했다.



| 모듈 | 언어 | LOC |
| --- | --- | --- |
| QuACK library | Rust | 1772 |
| Media server/client + integration | Rust | 478 |
| quiche client integration | Rust | 1821 |
| libcurl client integration | C | 1459 |
| Proxy sidekick binary | Rust | 833 |



총 구현 규모는 약 6363 LOC이다.


### 15.1 Low-latency media application

- Rust로 간단한 audio streaming client/server 구현
- client가 20 ms마다 240 bytes packet 전송
- 대략 96 kbit/s audio stream을 모델링
- sequence number는 wire에서 암호화됨
- receiver는 빠진 sequence가 있으면 NACK 전송
- sidekick이 있으면 quACK 기반 빠른 재전송 수행

### 15.2 HTTP/3 file upload application

- libcurl HTTP client 사용
- Cloudflare의 QUIC 구현체 quiche 사용
- nginx webserver 사용
- client만 sidekick 기능을 위해 수정
- server는 변경하지 않음

수정된 quiche는 quACK 정보를 이용해 다음을 조정한다.

- retransmission behavior
- congestion window
- flow-control window
- PACUBIC

### 15.3 Proxy implementation


프록시는 raw socket으로 네트워크 인터페이스의 incoming packet을 sniff한다. 각 flow의 socket pair를 HashMap으로 관리하고, 요청된 sidekick connection에 대해 quACK을 누적/전송한다.


---


## 16. 실험 환경


논문은 두 가지 환경에서 평가했다.


### 16.1 Emulated environment

- mininet 사용
- tc로 delay, loss, bandwidth 설정
- 두 구간 path 모델링

```plain text
Client → Proxy → Server
Link 1 = sender와 proxy 사이
Link 2 = proxy와 receiver 사이
```


### 16.2 Real-world environment


논문 Figure 3은 실제 실험 환경을 보여준다.


```plain text
Laptop Client
↓ lossy Wi-Fi link
Wi-Fi AP + Sidekick + Cellular Modem
↓ high-latency cellular path
AWS Server
```


사용 장비는 다음과 같다.

- Client: Lenovo ThinkPad, Ubuntu 22.04.3, Intel i7, 16GB memory
- AP: Lenovo Yoga, Ubuntu 20.04.6, Intel i5, 4GB memory
- Wi-Fi: 2.4GHz hotspot
- WAN: JEXtream cellular modem with 5G data plan
- Server: nearest AWS datacenter

실제 환경은 사무실에서 금요일 오후에 측정되어, 주변 Wi-Fi 간섭과 셀룰러 변동성이 존재한다.


---


## 17. 실험 시나리오 정리



| 시나리오 | Link 1 | Link 2 | quACK interval | threshold | 성공 지표 |
| --- | --- | --- | --- | --- | --- |
| Low-latency media | 1 ms delay, 3.6% loss, 100 Mbit/s | 25 ms delay, 0% loss, 10 Mbit/s | 2 packets | 8 | de-jitter buffer tail latency 감소 |
| Connection-splitting PEP emulation | 1 ms delay, 1% loss, 100 Mbit/s | 25 ms delay, 0% loss, 10 Mbit/s | 30 ms | 10 | 높은 throughput, split TCP PEP와 유사한 fairness |
| ACK reduction | 25 ms delay, 0% loss, 10 Mbit/s | 1 ms delay, 0% loss, 100 Mbit/s | 15 ms | 50 | receiver ACK 빈도 감소와 high throughput 유지 |



---


## 18. 주요 결과


### 18.1 Low-latency media


논문 Figure 4a의 에뮬레이션 결과:


```plain text
99th percentile de-jitter delay
Simple E2E: 48.6 ms
Sidekick: 2.2 ms
감소율: 약 95%
```


실제 환경 Figure 8a 결과:


```plain text
99th percentile de-jitter delay
Simple E2E: 2.3 seconds
Sidekick: 204 ms
감소율: 약 91%
```


해석:

- 손실이 가까운 Wi-Fi 구간에서 발생할 때 효과가 매우 크다.
- end-to-end NACK을 기다리는 대신 near path feedback으로 빠르게 재전송하기 때문이다.

---


### 18.2 Connection-splitting PEP emulation


논문 Figure 4b의 에뮬레이션 결과:


```plain text
1% random loss on near path segment
10 MB HTTP/3 upload
Sidekick 사용 시 QUIC E2E 대비 3.6x goodput
```


논문 Figure 8b의 실제 환경 결과:


```plain text
50 MB HTTP/3 upload
Sidekick 사용 시 약 50% goodput 향상
```


해석:

- QUIC은 기본적으로 손실 위치를 모르므로 모든 손실을 end-to-end congestion event처럼 다룬다.
- Sidekick + PACUBIC은 near path random loss와 far path congestion loss를 구분하는 데 도움을 준다.
- 따라서 TCP split PEP와 비슷한 성능을 endpoint-side에서 근사할 수 있다.

---


### 18.3 ACK reduction


논문 Figure 4c의 결과:


```plain text
receiver가 보내는 packet 수 약 96% 감소
8.5 Mbit/s 이상 goodput 유지
```


해석:

- receiver radio wake-up을 줄여 에너지 절감 가능성이 있다.
- sender는 quACK을 이용해 window를 진행하지만, reliability buffer 삭제는 end-to-end ACK을 기다린다.
- 따라서 performance와 end-to-end reliability를 분리한다.

---


### 18.4 Fairness


논문 Figure 6은 QUIC+Sidekick이 TCP+PEP와 유사한 goodput pattern을 보임을 보여준다.


핵심 해석:

- 성능 향상이 단순히 unfair하게 bandwidth를 더 많이 가져가서 생긴 것이 아님
- PACUBIC은 split CUBIC과 비슷한 congestion behavior를 근사함
- 손실률이 높아지면 near path가 bottleneck이 되면서 QUIC+Sidekick과 TCP+PEP 모두 성능이 하락

---


### 18.5 Proxy CPU overhead


논문 Table 6에 따르면, proxy에서 packet processing overhead의 대부분은 quACK 계산이 아니라 packet sniffing 자체다.



| 작업 | 25-byte payload cycles | 비율 |
| --- | --- | --- |
| Sniff Packet | 22417 | 97.6% |
| Table Lookup | 247 | 1.1% |
| Parse ID | 23 | 0.1% |
| Encode ID | 74 | 0.3% |
| Other | 213 | 0.9% |



실제 측정 처리량:


```plain text
25-byte payload: 464k packets/s
1468-byte payload: 5.5 Gbit/s, 458k packets/s
single core 기준
```


해석:

- quACK encoding 비용은 매우 작다.
- 병목은 raw packet capture / NIC read overhead다.
- Wi-Fi AP나 cellular base station 같은 edge router에는 현실적이라고 본다.
- core router 수준에서는 kernel bypass, hardware offload, RSS scaling 등이 필요하다.

---


### 18.6 Link overhead


Power Sum quACK은 proxy → sender 방향 packet 수를 약 **3–9%** 증가시킨다.


반면 strawman 방식은 proxy packet 수를 최대 10배까지 증가시킬 수 있다.


논문 Figure 7의 핵심은 다음이다.


```plain text
Power Sum quACK
= 성공 지표 달성
= strawman 대비 훨씬 작은 link overhead
= ACK reduction scenario에서도 proxy overhead를 제한
```


---


## 19. 이 논문의 진짜 기여


### 19.1 기여 1: 보안 전송 프로토콜을 바꾸지 않는 PEP 대안


기존 PEP는 transport protocol 내부를 이해하고 개입했다. Sidekick은 base protocol을 변경하지 않고, packet도 수정하지 않는다.


```plain text
기존 PEP
= TCP sequence number를 읽고 연결에 개입

Sidekick
= opaque packet을 그대로 두고, 옆 채널로 관측 정보만 제공
```


이 점이 ossification 문제를 줄인다.


### 19.2 기여 2: quACK


암호화된 packet에 대해 cumulative ACK + selective ACK 비슷한 정보를 48 bytes 수준으로 압축하는 수학적 도구를 제시했다.


이것이 없으면 sidekick protocol은 매 packet ID를 전부 보내야 해서 실용성이 떨어진다.


### 19.3 기여 3: 실제 QUIC/WebRTC 계열 응용에 적용


논문은 단순 이론이 아니라 다음을 실제 구현했다.

- WebRTC 유사 low-latency media
- Cloudflare quiche 기반 HTTP/3 QUIC client
- libcurl integration
- Rust proxy
- emulation + real-world Wi-Fi/cellular 실험

### 19.4 기여 4: PACUBIC


손실 위치를 반영하는 path-aware congestion control heuristic을 제안했다.


---


## 20. 중요한 해석: Sidekick은 QUIC을 “복호화”하지 않는다


이 논문을 잘못 읽으면 “middlebox가 다시 QUIC을 들여다보게 하자는 것인가?”라고 볼 수 있다. 하지만 의도는 반대에 가깝다.


Sidekick은 다음을 하지 않는다.

- QUIC header 복호화
- QUIC packet number 읽기
- packet 내용 변조
- endpoint 인증 우회
- base protocol wire format 변경
- receiver 대신 end-to-end reliability를 완료 처리

대신 다음만 한다.

- opaque packet identifier를 관측
- “나는 이런 packet들을 봤다”는 요약 정보를 sender에게 전송
- sender가 그 정보를 transport logic에 참고

즉, 권한은 여전히 endpoint에 있다.


---


## 21. 기존 PEP와의 차이



| 항목 | TCP PEP | Sidekick |
| --- | --- | --- |
| base protocol 이해 필요 | 높음 | 낮음 |
| sequence number 접근 | 필요 | 불필요 |
| packet 변조 | 가능 | 하지 않음 |
| protocol ossification 위험 | 큼 | 낮추려 함 |
| endpoint 협력 | 없어도 가능 | 필요 |
| QUIC 적용 | 어려움 | 가능 |
| 보안 모델 | middlebox 개입 | end-to-end 유지 |



---


## 22. 어떤 상황에서 유용한가?


Sidekick은 모든 네트워크에서 자동으로 좋은 기술이 아니다. 특히 다음 조건에서 유용하다.

- sender와 가까운 구간에 손실이 많다.
- 그 뒤에 고지연 WAN/셀룰러/위성 구간이 있다.
- receiver의 end-to-end feedback을 기다리면 너무 늦다.
- middlebox가 on-path에 있고, endpoint가 그 정보를 활용할 수 있다.
- base protocol이 QUIC/WebRTC처럼 opaque라 기존 PEP가 개입할 수 없다.

좋은 예시는 다음이다.


```plain text
Wi-Fi + cellular backhaul
기차/비행기/선박 네트워크
위성망
mmWave 또는 5G wireless segment
battery-powered receiver
low-latency media
QUIC upload over lossy access link
```


---


## 23. 한계


### 23.1 단일 path 중심


논문은 기본적으로 하나의 path 위에 하나의 sidekick proxy가 있는 상황을 다룬다.


Multipath QUIC, 여러 PEP가 있는 경로, path가 자주 바뀌는 상황은 충분히 다루지 못했다.


### 23.2 far path loss에는 약함


Sidekick proxy가 sender 가까이에 있을 때, proxy 이후 far path에서 손실이 발생하면 sender는 더 빠른 정보를 얻지 못한다.


논문도 이런 경우에는 proxy가 receiver로부터 quACK을 받거나, buffer/retransmit 기능이 추가되어야 한다고 언급한다.


### 23.3 배포 난이도


Sidekick은 다음 둘 다 수정되어야 한다.

- client application 또는 transport stack
- middlebox / proxy

따라서 단순히 브라우저나 서버 설정만으로 켜는 기능은 아니다. IETF 수준의 discovery protocol과 wire format 표준화가 필요하다.


### 23.4 PACUBIC은 heuristic


PACUBIC은 split CUBIC을 꽤 잘 근사하지만 완전히 동일하지 않다. 특히 loss가 far path에서 발생하는 경우나 복잡한 congestion-control 경쟁 상황에서는 더 분석이 필요하다.


### 23.5 실험 범위 제한


실제 환경 실험은 제한된 Wi-Fi/cellular 환경에서 수행되었다. 더 다양한 무선 환경, 위성망, 상용망, 브라우저, 실제 대규모 QUIC 서비스에서는 추가 검증이 필요하다.


---


## 24. 비판적 읽기


### 24.1 “보안을 유지한다”는 말의 의미


Sidekick은 QUIC payload를 복호화하지 않으므로 cryptographic privacy는 유지된다. 하지만 traffic pattern과 packet identifier 기반의 side-channel 정보는 존재한다.


따라서 완전한 privacy-preserving이라고 보기보다는 다음에 가깝다.

> **base protocol의 암호화와 wire-format 독립성을 유지하면서, on-path observation을 endpoint가 선택적으로 활용하게 하는 구조**

### 24.2 deployment가 가장 큰 문제


논문은 기술적 feasibility를 잘 보여주지만, 실제 배포에는 다음 장벽이 있다.

- client QUIC stack 수정 필요
- proxy discovery 표준화 필요
- proxy를 운영할 주체 필요
- 보안 정책과 abuse 방지 필요
- application별로 quACK을 어떻게 쓸지 정해야 함

즉, quACK 자체는 멋진 수학적/시스템적 아이디어지만, Sidekick 생태계가 생기려면 표준화와 인프라 협력이 필요하다.


### 24.3 QUIC 철학과의 긴장


QUIC은 middlebox를 의도적으로 배제한 프로토콜이다. Sidekick은 middlebox가 직접 개입하지 않게 설계했지만, 여전히 “네트워크가 endpoint에 조언한다”는 구조를 만든다.


이것은 QUIC의 anti-ossification 철학과 PEP의 실용적 장점 사이에서 타협점을 찾으려는 시도다.


---


## 25. 실무 관점 체크리스트


### Sidekick이 맞을 가능성이 높은 경우

- [ ] QUIC/WebRTC 기반 서비스다.
- [ ] 성능 병목이 end-to-end 서버가 아니라 access network다.
- [ ] sender와 가까운 무선 구간에서 loss가 자주 난다.
- [ ] low-latency media나 interactive streaming이다.
- [ ] ACK 빈도를 줄이면 배터리 이득이 크다.
- [ ] proxy/AP/base station을 제어할 수 있다.
- [ ] client transport stack을 수정할 수 있다.

### Sidekick이 애매한 경우

- [ ] 병목이 서버 CPU 또는 application logic이다.
- [ ] 손실이 proxy 이후 far path에서 주로 발생한다.
- [ ] client를 수정할 수 없다.
- [ ] path가 multipath로 자주 바뀐다.
- [ ] 모든 traffic이 이미 충분히 안정적이다.
- [ ] proxy를 신뢰하거나 운영할 주체가 없다.

---


## 26. 용어 정리



| 용어 | 의미 |
| --- | --- |
| Opaque transport protocol | QUIC처럼 middlebox가 transport header/state를 읽을 수 없는 암호화된 전송 프로토콜 |
| PEP | Performance Enhancing Proxy. TCP 성능 개선을 위해 중간에서 연결을 보조하거나 분할하는 장비 |
| Ossification | middlebox가 특정 프로토콜 구조를 강하게 가정해 새로운 확장을 막는 현상 |
| Base connection | 실제 QUIC/WebRTC 등 end-to-end 전송 연결 |
| Sidekick connection | endpoint와 proxy 사이의 보조 연결 |
| quACK | opaque packet들에 대한 압축 ACK 표현 |
| Power sum | packet identifier들의 x, x², x³ … 합을 이용해 빠진 element를 복원하는 수학적 표현 |
| PACUBIC | quACK을 이용해 손실 위치를 반영하는 CUBIC 변형 |
| De-jitter buffer | media packet arrival jitter를 완화하기 위한 수신 버퍼 |
| ACK reduction | receiver가 보내는 ACK 빈도를 줄이는 기법 |
| Split TCP | TCP 연결을 middlebox에서 둘 이상으로 나누는 PEP 방식 |



---


## 27. 논문 그림/표 요약



| 위치 | 내용 | 해석 |
| --- | --- | --- |
| Figure 1 | base connection과 sidekick connection 구조 | 프록시는 opaque packet을 보고 quACK을 sender에게 보냄 |
| Table 1 | identifier collision probability | 4 bytes면 n=25에서 collision 가능성이 매우 낮음 |
| Table 2 | strawman과 power sum 비교 | power sum은 cumulative이고 compact하며 decode도 현실적 |
| Table 3 | microbenchmark | power sum quACK은 33 ns/pkt encode, 2.82 µs decode |
| Figure 2 | bit width, threshold, missing packet 수에 따른 성능 | decode는 후보/누락 수에 비례, encode는 threshold에 비례 |
| Table 4 | 구현 LOC | 연구 프로토타입이지만 실제 QUIC stack에 통합됨 |
| Table 5 | 실험 시나리오 | low-latency media, PEP emulation, ACK reduction 세 가지 |
| Figure 4 | 에뮬레이션 성능 결과 | Sidekick이 latency/goodput/ACK reduction에서 모두 개선 |
| Figure 6 | fairness 평가 | QUIC+Sidekick이 TCP+PEP와 유사한 패턴 |
| Table 6 | proxy CPU overhead | quACK보다 packet sniffing이 병목 |
| Figure 7 | link overhead | power sum quACK이 strawman보다 훨씬 낮은 overhead |
| Figure 8 | 실제 환경 실험 | de-jitter 91% 감소, upload goodput 50% 향상 |
| Figure 9 | PACUBIC appendix | loss 위치 기반 cwnd 변화가 split CUBIC과 유사 |



---


## 28. 공부용 질문

1. QUIC은 왜 middlebox가 transport header를 못 보게 만들었는가?
2. TCP PEP는 왜 성능은 좋지만 ossification을 유발하는가?
3. Sidekick은 기존 PEP와 어떤 점에서 다르게 보안성을 유지하는가?
4. quACK은 왜 단순 ACK ID echo보다 효율적인가?
5. Power sum quACK에서 threshold t가 너무 작으면 어떤 문제가 생기는가?
6. sender가 quACK을 받았다고 해서 왜 retransmission buffer에서 데이터를 삭제하면 안 되는가?
7. PACUBIC은 왜 near path loss와 end-to-end loss를 다르게 처리하는가?
8. Sidekick이 far path loss에는 왜 덜 효과적인가?
9. 이 구조를 실제 브라우저 QUIC stack에 넣으려면 어떤 표준화가 필요한가?
10. Sidekick이 privacy나 traffic analysis 측면에서 새로 만드는 위험은 무엇인가?

---


## 29. 내 식으로 다시 설명하면


이 논문은 “QUIC에서도 TCP PEP 같은 걸 다시 하자”가 아니다. 정확히는 다음에 가깝다.

> **QUIC의 암호화와 end-to-end 구조를 건드리지 않고, 네트워크가 endpoint에게 ’내가 본 것’을 요약해서 알려주면 endpoint가 알아서 더 똑똑하게 행동할 수 있지 않을까?**

그래서 Sidekick은 전송 연결을 가로채는 PEP라기보다, endpoint에게 네트워크 경로 정보를 제공하는 **보조 관측 채널**이다.


논문에서 가장 중요한 발명은 quACK이다. 왜냐하면 opaque packet 환경에서는 “어떤 packet을 봤다/못 봤다”를 표현하는 것 자체가 어렵기 때문이다. quACK이 없다면 sidekick은 overhead가 너무 큰 단순 echo protocol이 되었을 가능성이 크다.


---


## 30. 최종 요약


Sidekick은 QUIC/WebRTC처럼 암호화된 transport protocol에서 기존 TCP PEP의 성능상 장점을 일부 되살리기 위한 설계다. 핵심은 base protocol을 수정하거나 복호화하지 않고, 별도 sidekick connection을 통해 proxy가 관측한 opaque packet 정보를 quACK으로 압축해 sender에게 전달하는 것이다.


Power sum 기반 quACK은 48 bytes 수준으로 여러 packet의 수신 상태를 표현하며, 33 ns/pkt encoding과 약 3 µs decoding으로 실용적인 성능을 보였다. 이를 활용한 Robin protocol은 low-latency media에서 de-jitter delay를 크게 낮추고, QUIC upload에서 split TCP PEP와 유사한 성능을 근사하며, ACK reduction으로 receiver의 ACK 송신 빈도를 크게 줄였다.


다만 이 접근은 client/proxy 협력과 표준화가 필요하고, single-path 및 sender 가까운 손실 구간에서 특히 유효하다. 따라서 Sidekick은 범용 QUIC 가속기라기보다, **opaque transport 시대에 middlebox assistance를 보안성과 프로토콜 진화 가능성을 해치지 않는 방식으로 재설계하려는 연구**로 보는 것이 적절하다.

