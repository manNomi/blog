---
title: "Video Streaming over QUIC"
pubDate: 2026-06-09T00:00:00.000Z
notes: true
notionId: "3737cf19-a364-80df-a0c4-c81cc9523973"
---
# Video Streaming Over QUIC: A Comprehensive Study


## QUIC 기반 비디오 스트리밍 종합 연구 — Notion용 한국어 해석 Markdown

> 📌 **문서 유형**: Notion Import용 한국어 해석 Markdown
>
> 📄 **원문**: Jashanjot Singh Sidhu, Abdelhak Bentaleb. 2026. _Video Streaming Over QUIC: A Comprehensive Study_. ACM Transactions on Multimedia Computing, Communications and Applications, Vol. 22, No. 4, Article 94.
>
>
> 🔗 **DOI**: 10.1145/3793674
>
>
> 🧭 **작성 방식**: 문장별 직역이 아니라, 논문 스터디·발표·리뷰에 바로 쓰기 쉽도록 핵심 논리, 실험 설계, 결과, 한계, 실무적 의미를 한국어로 풀어쓴 해석본입니다.
>
>

---


## 목차

1. [먼저 보는 핵심 요약](about:blank#0-%EB%A8%BC%EC%A0%80-%EB%B3%B4%EB%8A%94-%ED%95%B5%EC%8B%AC-%EC%9A%94%EC%95%BD)
2. [초록 해석](about:blank#1-%EC%B4%88%EB%A1%9D-%ED%95%B4%EC%84%9D)
3. [문제 배경](about:blank#2-%EB%AC%B8%EC%A0%9C-%EB%B0%B0%EA%B2%BD)
4. [관련 연구와 논문의 차별점](about:blank#3-%EA%B4%80%EB%A0%A8-%EC%97%B0%EA%B5%AC%EC%99%80-%EB%85%BC%EB%AC%B8%EC%9D%98-%EC%B0%A8%EB%B3%84%EC%A0%90)
5. [방법론](about:blank#4-%EB%B0%A9%EB%B2%95%EB%A1%A0)
6. [평가 대상: QUIC 구현체, 혼잡 제어, ABR](about:blank#5-%ED%8F%89%EA%B0%80-%EB%8C%80%EC%83%81-quic-%EA%B5%AC%ED%98%84%EC%B2%B4-%ED%98%BC%EC%9E%A1-%EC%A0%9C%EC%96%B4-abr)
7. [성능 평가 결과](about:blank#6-%EC%84%B1%EB%8A%A5-%ED%8F%89%EA%B0%80-%EA%B2%B0%EA%B3%BC)
8. [QUIC Friendliness: 다중 클라이언트 공정성](about:blank#7-quic-friendliness-%EB%8B%A4%EC%A4%91-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8-%EA%B3%B5%EC%A0%95%EC%84%B1)
9. [Ablation Study](about:blank#8-ablation-study)
10. [최적 QUIC + CC 조합](about:blank#9-%EC%B5%9C%EC%A0%81-quic--cc-%EC%A1%B0%ED%95%A9)
11. [핵심 결론과 시사점](about:blank#10-%ED%95%B5%EC%8B%AC-%EA%B2%B0%EB%A1%A0%EA%B3%BC-%EC%8B%9C%EC%82%AC%EC%A0%90)
12. [한계와 향후 연구](about:blank#11-%ED%95%9C%EA%B3%84%EC%99%80-%ED%96%A5%ED%9B%84-%EC%97%B0%EA%B5%AC)
13. [논문을 읽을 때 주의할 점](about:blank#12-%EB%85%BC%EB%AC%B8%EC%9D%84-%EC%9D%BD%EC%9D%84-%EB%95%8C-%EC%A3%BC%EC%9D%98%ED%95%A0-%EC%A0%90)
14. [부록 A. 원문 그림·표 해석](about:blank#%EB%B6%80%EB%A1%9D-a-%EC%9B%90%EB%AC%B8-%EA%B7%B8%EB%A6%BC%ED%91%9C-%ED%95%B4%EC%84%9D)
15. [부록 B. 핵심 용어 정리](about:blank#%EB%B6%80%EB%A1%9D-b-%ED%95%B5%EC%8B%AC-%EC%9A%A9%EC%96%B4-%EC%A0%95%EB%A6%AC)
16. [부록 C. 발표·리뷰용 요약 문장](about:blank#%EB%B6%80%EB%A1%9D-c-%EB%B0%9C%ED%91%9C%EB%A6%AC%EB%B7%B0%EC%9A%A9-%EC%9A%94%EC%95%BD-%EB%AC%B8%EC%9E%A5)
17. [부록 D. 실무 적용 체크리스트](about:blank#%EB%B6%80%EB%A1%9D-d-%EC%8B%A4%EB%AC%B4-%EC%A0%81%EC%9A%A9-%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8)

---


# 0. 먼저 보는 핵심 요약


이 논문은 **비디오 스트리밍에서 QUIC 구현체와 혼잡 제어 알고리즘이 실제 사용자 QoE에 어떤 영향을 주는지**를 종합적으로 평가한다.


단순히 “QUIC이 TCP보다 빠르다”를 말하는 논문이 아니다. 오히려 이 논문의 핵심은 다음에 가깝다.

> **같은 QUIC 표준, 같은 혼잡 제어 알고리즘을 사용해도 구현체가 다르면 비디오 품질과 지연, 공정성이 크게 달라진다.**

논문은 7개 QUIC 구현체와 여러 혼잡 제어 알고리즘을 조합하여, 4K HTTP Adaptive Streaming 환경에서 VoD와 Low-Latency Live Streaming을 모두 평가한다. 실험은 하나의 서버가 여러 클라이언트에게 동시에 비디오를 제공하는 **single-server multi-client 환경**에서 진행된다.


## 한 줄 결론


**비디오 스트리밍에서 중요한 것은 “QUIC을 쓰느냐”가 아니라, 어떤 QUIC 구현체가 어떤 혼잡 제어 알고리즘과 어떤 ABR 알고리즘을 만나느냐이다.**


## 핵심 포인트

- QUIC은 HTTP/3의 기반 transport protocol이며, 현재 YouTube, Facebook 같은 대형 서비스에서 비디오 전달에 사용된다.
- QUIC 표준은 같아도 구현체마다 언어, 동시성 모델, pacing 지원, ECN 지원, qlog 지원, TLS 스택, multi-client 처리 방식이 다르다.
- 같은 Cubic, Reno, BBR를 써도 구현체가 다르면 VMAF와 RTT, rebuffering이 달라진다.
- VoD에서는 안정적 throughput과 높은 품질이 중요하고, LLL에서는 짧은 segment와 작은 buffer 때문에 지연과 적응 속도가 더 중요하다.
- MVFST, QUINN, PICOQUIC은 전반적으로 강한 성능을 보였다.
- AIOQUIC은 Python 기반 구현과 높은 RTT 때문에 상대적으로 낮은 성능을 보였다.
- LSQUIC과 XQUIC은 multi-client 지원 한계 때문에 확장성 측면에서 부적합한 모습을 보였다.
- TQUIC은 pacing 부재 때문에 일부 상황에서 불리했지만, LLL에서는 BBR3와 결합할 때 비교적 좋은 결과도 보였다.
- AQM은 큰 영향을 주지 않았고, ECN은 약간의 개선을 보였으며, QUIC과 TCP는 큰 성능 저하 없이 공존 가능했다.
- 저자들은 향후 QUIC 혼잡 제어와 ABR을 분리해서 최적화하기보다, cross-layer 방식으로 함께 설계해야 한다고 주장한다.

## 논문이 던지는 질문



| 질문 | 논문의 답 |
| --- | --- |
| QUIC 구현체가 달라지면 비디오 품질도 달라지는가? | 그렇다. 같은 CC 알고리즘이어도 구현체 차이로 VMAF가 크게 달라질 수 있다. |
| 혼잡 제어 알고리즘만 잘 고르면 되는가? | 아니다. 구현 언어, 동시성 처리, pacing, multi-client 설계가 같이 영향을 준다. |
| VoD와 low-latency live streaming에서 최적 조합이 같은가? | 아니다. VoD와 LLL은 buffer, segment duration, latency 요구가 달라 최적 CC가 다르다. |
| 라우터 AQM을 바꾸면 QUIC 스트리밍 성능이 크게 좋아지는가? | 논문 실험에서는 영향이 작았다. |
| ECN은 도움이 되는가? | 약간의 VMAF 개선이 있었지만, 일반적인 조건에서는 제한적이었다. |
| QUIC과 TCP가 같은 네트워크에서 공존 가능한가? | 실험에서는 큰 성능 저하 없이 공존했다. |
| 최종적으로 필요한 것은 무엇인가? | QUIC CC와 ABR을 함께 고려하는 cross-layer 설계와 Media over QUIC 같은 통합적 접근이다. |



---


# 1. 초록 해석


QUIC transport protocol은 전통적인 TCP 기반 웹 전송 방식보다 낮은 지연과 개선된 성능을 목표로 하는 중요한 진화다. QUIC 구현체가 계속 늘어나고 있기 때문에, 특히 비디오 스트리밍 환경에서 각 구현체의 성능을 이해하는 것이 중요하다.


이 논문은 여러 QUIC 구현체를 종합적으로 분석한다. 특히 transport-layer의 혼잡 제어 성능과 그것이 HTTP Adaptive Streaming, 즉 HAS에 미치는 영향을 살펴본다. 실험은 하나의 서버가 여러 클라이언트에게 동시에 서비스를 제공하는 single-server multi-client 환경에서 수행된다.


저자들은 trace-driven 실험을 통해 서로 다른 QUIC 혼잡 제어 구현이 adaptive bitrate 알고리즘에 어떤 영향을 주는지 분석한다. 비디오 스트리밍 시나리오는 두 가지다.

1. **Video-on-Demand, VoD**
2. **Low-Latency Live Streaming, LLL**

논문은 QUIC 혼잡 제어 구현체, 라우터의 queue management, QUIC stream 간 협력/경쟁 관계가 다양한 네트워크 조건에서 사용자 QoE에 어떤 영향을 주는지 분석한다.


결과는 명확하다. 동일한 혼잡 제어 알고리즘이라도 QUIC 구현체가 다르면 성능 차이가 크며, 이는 비디오 스트리밍 QoE에 직접적인 영향을 준다. 따라서 저자들은 QUIC 혼잡 제어와 ABR을 통합적으로 고려하는 intelligent cross-layer design이 필요하다고 주장한다.


---


# 2. 문제 배경


## 2.1 왜 QUIC 기반 비디오 스트리밍이 중요한가


비디오 스트리밍은 인터넷 트래픽에서 매우 큰 비중을 차지한다. 논문은 Ericsson의 보고서를 인용하여, 2024년 말까지 비디오 스트리밍이 모바일 데이터 트래픽의 74%를 차지할 것으로 전망된다고 설명한다.


Amazon Prime Video, Netflix, Meta, YouTube 같은 대형 OTT 플랫폼은 막대한 비디오 트래픽을 생성한다. 이들은 DASH나 HLS 같은 **HTTP Adaptive Streaming, HAS** 기술을 사용한다.


HAS의 기본 아이디어는 간단하다.


```plain text
네트워크 상황이 좋으면 높은 bitrate segment를 요청한다.
네트워크 상황이 나쁘면 낮은 bitrate segment를 요청한다.
버퍼가 부족하면 안정성을 우선한다.
버퍼가 충분하면 품질을 올린다.
```


이 결정은 클라이언트 쪽의 **Adaptive Bitrate, ABR** 알고리즘이 수행한다.


## 2.2 기존에는 TCP가 기본이었다


전통적으로 HAS 기반 비디오 스트리밍은 TCP 위에서 동작했다. 하지만 최근에는 QUIC과 HTTP/3가 빠르게 확산되면서, 비디오 전달에도 QUIC이 점점 중요해졌다.


QUIC은 UDP 위에서 동작하지만, 신뢰성 있는 전송, 혼잡 제어, 암호화, stream multiplexing 등을 자체적으로 제공한다.


## 2.3 QUIC의 주요 장점


논문은 QUIC의 주요 특징으로 다음을 언급한다.



| 기능 | 의미 | 비디오 스트리밍에서의 기대 효과 |
| --- | --- | --- |
| Multiplexing | 여러 stream을 하나의 connection에서 처리 | HTTP/2의 head-of-line blocking 문제 완화 |
| 0-RTT | 재연결 시 왕복 지연 감소 | 빠른 세션 시작 |
| Connection migration | 네트워크 변경 시 연결 유지 | 모바일 환경에서 안정적 스트리밍 |
| Prioritization | stream 우선순위 조정 | 중요한 segment를 먼저 전달 가능 |
| UDP 기반 | transport 계층을 애플리케이션에서 더 유연하게 제어 | 새로운 혼잡 제어와 media delivery stack 설계 가능 |



## 2.4 그런데 QUIC은 하나가 아니다


QUIC은 표준화되었지만, 구현체는 다양하다.


예를 들어:

- Google 계열 구현체
- Cloudflare의 quiche
- Meta의 MVFST
- Microsoft의 MSQUIC
- Tencent의 TQUIC
- Cloudflare, Akamai, Alibaba 계열 구현체
- Rust 기반 QUINN
- C 기반 PICOQUIC, LSQUIC, XQUIC
- Python 기반 AIOQUIC

문제는 이 구현체들이 모두 표준을 따르더라도 내부 설계가 다르다는 점이다.


```plain text
같은 QUIC 표준
≠ 같은 성능
≠ 같은 지연
≠ 같은 공정성
≠ 같은 video QoE
```


## 2.5 이 논문의 핵심 문제의식


비디오 스트리밍에서는 서버 쪽 QUIC 혼잡 제어가 전송률을 결정하고, 클라이언트 쪽 ABR 알고리즘이 다음 segment의 bitrate를 결정한다.


이 둘은 서로 독립적으로 보이지만 실제로는 강하게 연결되어 있다.


```plain text
QUIC CC가 전송률과 RTT를 바꿈
↓
클라이언트가 관측하는 throughput과 buffer 상태가 바뀜
↓
ABR이 선택하는 bitrate가 바뀜
↓
VMAF, rebuffering, latency, QoE가 바뀜
```


따라서 QUIC 구현체의 세부 차이는 단순한 transport 성능 차이를 넘어, 사용자가 체감하는 비디오 품질 차이로 이어진다.


---


# 3. 관련 연구와 논문의 차별점


## 3.1 기존 연구의 초점


기존 QUIC 연구들은 주로 다음을 다뤘다.

- QUIC interoperability 테스트
- TCP+TLS+HTTP/2와 QUIC의 일반 성능 비교
- 고속 10G 네트워크에서 QUIC 성능
- QUIC의 congestion responsiveness
- QUIC과 DASH의 초기 성능 평가
- HTTP/3 기반 media streaming 성능
- QUIC의 connection establishment, security, reliability

이 연구들은 유용하지만, 대부분 다음 한계를 가진다.

1. 특정 QUIC 구현체의 기본 혼잡 제어만 사용한다.
2. 여러 구현체의 같은 CC가 어떻게 다르게 동작하는지 비교하지 않는다.
3. 비디오 스트리밍의 ABR과 QoE까지 연결해 분석하지 않는다.
4. multi-client streaming 환경에서 확장성을 충분히 보지 않는다.
5. VoD와 Low-Latency Live Streaming을 동시에 종합적으로 다루지 않는다.

## 3.2 이 논문의 차별점


이 논문은 다음을 종합적으로 본다.



| 분석 대상 | 설명 |
| --- | --- |
| QUIC 구현체 | AIOQUIC, MVFST, LSQUIC, PICOQUIC, QUINN, TQUIC, XQUIC |
| 혼잡 제어 알고리즘 | Cubic, Reno, BBR, BBR2, BBR3, Copa, Copa2, DCubic, FastCC, Prague 등 |
| 스트리밍 모드 | VoD, Low-Latency Live Streaming |
| 클라이언트 수 | 5개 클라이언트 동시 접속 |
| 네트워크 trace | Netflix 5G, LTE Belgium, Cascade, 고변동 4G/5G trace 등 |
| QoE 지표 | VMAF, rebuffering duration ratio, RTT, throughput fairness |
| 추가 실험 | AQM, ECN, TCP cross-traffic, QUIC throughput estimation, cross-layer tuning |



논문이 주장하는 핵심 차별점은 다음과 같다.

> **QUIC 구현체의 내부 설계 차이가 혼잡 제어의 실제 동작을 바꾸고, 이것이 ABR과 QoE까지 연쇄적으로 영향을 준다는 것을 체계적으로 보여 준다.**

---


# 4. 방법론


## 4.1 전체 실험 구조


저자들은 기존 **Vegvisir** 평가 프레임워크를 확장했다.


원문 Figure 1은 실험 구조를 보여 준다. 구성은 다음과 같다.


```plain text
QUIC Server
    ↓
TC Netem Shaper / Router
    ↓
Client 1
Client 2
Client 3
Client 4
Client 5
```


즉, 하나의 서버가 하나의 shaper/router를 거쳐 5개 클라이언트에게 동시에 비디오를 제공한다. 논문은 이를 **SS-MC, Single Server Multi Client** 환경이라고 부른다.


라우터 역할을 하는 shaper는 Linux `tc Netem`을 사용하여 네트워크 조건을 재현한다.


## 4.2 왜 single-server multi-client인가


실제 스트리밍 서비스는 한 서버 또는 CDN edge가 여러 클라이언트를 동시에 처리한다. 따라서 1:1 connection만 보면 구현체의 확장성 문제가 드러나지 않을 수 있다.


이 논문은 5개 클라이언트가 동시에 요청하는 상황에서 다음을 본다.

- 서버가 여러 QUIC connection을 제대로 처리하는가
- 클라이언트 간 throughput이 공정하게 분배되는가
- 특정 구현체가 multi-client에서 병목을 만드는가
- 같은 CC라도 구현체의 동시성 모델에 따라 결과가 달라지는가

## 4.3 스트리밍 모드


논문은 두 가지 모드를 평가한다.



| 모드 | Segment duration | Max buffer | 의미 |
| --- | --- | --- | --- |
| VoD | 4초 | 60초 | 일반 VOD. 큰 버퍼로 throughput 변동을 흡수 가능 |
| LLL | 2초 | 6초 | 저지연 라이브 스트리밍. 작은 버퍼 때문에 빠른 적응이 중요 |



VoD는 buffer가 크므로 약간의 전송률 변동을 흡수할 수 있다. 반면 LLL은 buffer가 작아 delay, packet pacing, bandwidth estimation이 더 민감하게 작용한다.


## 4.4 실험 시나리오


논문 Table 1은 6개 시나리오를 정리한다.



| Mode | Scenario | 설명 | Segment / Buffer |
| --- | --- | --- | --- |
| VoD | A | 같은 network trace, 같은 ABR | 4초 / 60초 |
| VoD | B | 같은 network trace, 다른 ABR | 4초 / 60초 |
| VoD | C | 다른 network trace, 같은 ABR | 4초 / 60초 |
| LLL | D | 같은 network trace, 같은 ABR | 2초 / 6초 |
| LLL | E | 같은 network trace, 다른 ABR | 2초 / 6초 |
| LLL | F | 다른 network trace, 같은 ABR | 2초 / 6초 |



본문은 주로 Scenario A와 D를 중심으로 설명하고, B/C/E/F는 부록에서 다룬다.


## 4.5 네트워크 trace


원문 Figure 2는 세 가지 주요 network trace를 보여 준다.



| Trace | 특징 | 평균 throughput | 표준편차 |
| --- | --- | --- | --- |
| Netflix 5G | 높은 throughput, 증가 구간과 변동 존재 | 약 30.1 Mbps | 약 15.8 |
| LTE Belgium | 중간 throughput, 상대적으로 낮은 표준편차 | 약 20.0 Mbps | 약 5.1 |
| Cascade | 단계적 변화와 급격한 drop 존재 | 약 30.6 Mbps | 약 15.8 |



논문은 이 trace들을 통해 안정적 환경, moderate fluctuation 환경, 갑작스러운 throughput drop 환경을 비교한다.


## 4.6 비디오 콘텐츠


실험에는 **Moment of Intensity, MoI**라는 4K 비디오가 사용된다.

- 최대 해상도: 3840×2160
- bitrate ladder: 0.5 Mbps ~ 40 Mbps
- 각 streaming session 길이: 약 100초
- qlog와 4K 콘텐츠 때문에 한 시나리오에서 약 70GB 데이터가 발생

100초라는 길이는 모든 동작을 완전히 대표하지는 않지만, throughput, delay, CC 영향, ABR 적응을 관찰하기에 충분한 균형점으로 선택되었다.


## 4.7 실험 환경


논문은 Ubuntu 22.04.4 LTS가 설치된 물리 머신에서 Docker 기반으로 실험했다.

- GPU: NVIDIA GeForce RTX 3060
- CPU: 24-core
- Memory: 64GB
- client, shaper, server 각각 Docker container로 구성
- Docker Compose network 6개로 SS-MC 구성
- shaper는 Token Bucket Filter와 PFIFO를 기본 사용

---


# 5. 평가 대상: QUIC 구현체, 혼잡 제어, ABR


## 5.1 평가된 QUIC 구현체


논문은 전체 QUIC 구현체 목록을 검토한 뒤, 실험에는 주로 다음 7개를 사용한다.



| 구현체 | 언어 | 동시성 모델 | 특징 |
| --- | --- | --- | --- |
| AIOQUIC | Python | Threads | 구현은 간단하지만 RTT가 높고 multi-client에서 느림 |
| MVFST | C++ | Async I/O, folly | Meta 계열. 강한 성능, 낮은 RTT, 다양한 CC 지원 |
| LSQUIC | C | Single-threaded | 낮은 RTT 가능하지만 multi-client 확장성 한계 |
| PICOQUIC | C | Threads | 다양한 CC 지원, ECN 지원, 전반적으로 강함 |
| QUINN | Rust | Async I/O, tokio | Rust 기반, lightweight async 구조, LLL에서 강점 |
| TQUIC | Rust | Multi-threaded | BBR3/Copa 지원. pacing 부재가 약점 |
| XQUIC | C | Single-threaded | multi-client handling 문제, HTTP/3 callback context 문제 |



## 5.2 구현체별 지원 혼잡 제어


논문 Table 2는 구현체별 CC 지원을 정리한다. 주요 실험 대상만 추리면 다음과 같다.



| 구현체 | 지원 CC |
| --- | --- |
| AIOQUIC | Cubic, Reno |
| MVFST | BBR, BBR2, Cubic, Reno, Copa, Copa2 |
| LSQUIC | Cubic, BBR, Adaptive |
| PICOQUIC | BBR, BBR3, Cubic, Reno, DCubic, FastCC, Prague |
| QUINN | BBR, Cubic, Reno |
| TQUIC | BBR, BBR3, Copa, Cubic |
| XQUIC | BBR, BBR2, Cubic, Reno, Copa |



## 5.3 구현체 차이가 중요한 이유


일반적으로 “Cubic을 쓴다”, “BBR을 쓴다”라고 말하면 같은 동작을 기대하기 쉽다. 하지만 논문은 그렇게 단순하지 않다고 말한다.


같은 CC라도 구현체마다 다르다.


```plain text
혼잡 제어 알고리즘 이름은 같음
↓
하지만 pacing 구현, ACK 처리, threading, async I/O, TLS handling, stream scheduling이 다름
↓
결과적으로 RTT, throughput, fairness, QoE가 달라짐
```


즉, 이 논문의 핵심은 **algorithm-level 비교가 아니라 implementation-level 비교**다.


## 5.4 ABR 알고리즘


클라이언트 쪽 ABR 알고리즘은 다음을 사용했다.



| 유형 | 알고리즘 | 설명 |
| --- | --- | --- |
| Heuristic | BBA2-C | buffer 기반. stall prevention 로직 포함 |
| Heuristic | CON | 최근 2개 throughput sample 평균 사용 |
| Heuristic | EXP | 최근 10개 sample의 exponential moving average 사용 |
| Learning-based | Pensieve+ | 강화학습 기반 Pensieve를 10개 bitrate level에 맞게 재학습하고 stall logic 추가 |
| Learning-based | Merina+ | meta reinforcement learning 기반 Merina를 10개 bitrate level에 맞게 재학습하고 stall logic 추가 |



본문의 핵심 실험은 주로 **Pensieve+**를 사용한다.


## 5.5 QoE 지표


논문은 주로 다음 지표를 사용한다.



| 지표 | 의미 |
| --- | --- |
| VMAF | Netflix가 제안한 perceptual video quality metric. 높을수록 좋음 |
| RD, Rebuffering Duration Ratio | 전체 재생 시간 중 rebuffering이 차지하는 비율. 낮을수록 좋음 |
| RTT | round-trip time. 낮을수록 전송 반응이 빠름 |
| Throughput | client별 전송량. 높은 값뿐 아니라 fairness도 중요 |



논문은 ITU-P.1203 QoE 모델은 1080p 한계가 있고, P.1204는 실험적 제약이 있어 제외했다고 설명한다. 따라서 4K 평가에는 VMAF와 RD가 핵심 지표로 사용된다.


---


# 6. 성능 평가 결과


# 6.1 Scenario A: VoD, 같은 trace, 같은 ABR


Scenario A는 VoD 환경에서 모든 클라이언트가 같은 network trace와 같은 ABR을 사용하는 조건이다.


## 6.1.1 전체 요약


VoD 결과에서 가장 중요한 메시지는 다음이다.

> **VoD 성능 차이는 단순히 CC 알고리즘 선택보다 구현체 수준의 설계 차이에서 크게 발생한다.**

같은 CC를 사용해도 구현체에 따라 VMAF가 최대 20점 가까이 차이날 수 있다. 이는 사용자에게 체감될 수 있는 수준이다.


영향을 주는 구현체 요인은 다음과 같다.

- 구현 언어의 효율성
- concurrency model
- pacing 지원 여부
- ACK 처리 방식
- multi-client scheduling
- RTT
- TLS/SSL 처리 방식
- HTTP/3 context 관리

## 6.1.2 Netflix 5G trace 결과


원문 Figure 3은 Netflix 5G trace에서 VoD + Pensieve+ 조건의 평균 VMAF를 보여 준다.


### AIOQUIC


AIOQUIC은 Cubic과 Reno 모두 비슷한 VMAF를 보였다. 다만 Cubic은 더 공격적으로 bandwidth를 탐색하기 때문에 변동성이 더 컸다.


AIOQUIC은 HyStart를 구현하지 않기 때문에 Cubic의 slow start가 multi-client 환경에서 transient unfairness를 만들 수 있다. 또한 Python 기반 구현으로 인해 RTT가 다른 구현체보다 훨씬 높게 나타난다.


### MVFST


MVFST는 BBR, BBR2, Cubic, Reno, Copa, Copa2 전반에서 높은 VMAF를 보였다.


같은 Cubic/Reno를 쓰더라도 AIOQUIC보다 평균 약 6 VMAF point 높았다. 논문은 이 차이가 JND, 즉 사람이 알아차릴 수 있는 품질 차이를 넘는다고 해석한다.


주된 이유는 다음과 같다.

- C++ 기반의 낮은 오버헤드
- 빠른 packet processing
- 낮은 latency
- 효율적인 async I/O
- multi-client 처리 효율

### PICOQUIC


PICOQUIC은 BBR, Cubic, DCubic, Reno, FastCC에서 대체로 안정적인 성능을 보였다. 다만 BBR3와 Prague는 약간 뒤처졌다.


PICOQUIC의 강점은 다양한 CC 지원과 C 기반 효율성이다. Cubic/Reno 사용 시 AIOQUIC보다 유의미하게 높은 품질을 보였다.


### LSQUIC


LSQUIC은 RTT는 낮지만 single-threaded 설계 때문에 multi-client 환경에서 확장성이 부족했다.


BBR에서는 낮은 VMAF를 보였고, Cubic에서는 상대적으로 개선되었다. 그러나 여러 client를 동시에 처리하는 상황에서는 구조적 한계가 명확했다.


### QUINN


QUINN은 Rust 기반 async I/O 구조 덕분에 BBR, Cubic, Reno 모두에서 안정적인 성능을 보였다.


AIOQUIC보다 높은 VMAF를 보였고, MVFST 및 PICOQUIC과 유사한 수준으로 평가되었다.


### TQUIC


TQUIC은 BBR/BBR3에서 다른 구현체보다 낮은 VMAF를 보였다. 논문은 주요 원인으로 pacing support 부족을 지적한다.


pacing이 없으면 packet이 burst 형태로 전송되고, queue buildup, RTT 변동, throughput 불안정이 발생할 수 있다.


### XQUIC


XQUIC은 비정상적으로 낮은 결과를 보였다. 특히 Cubic, Reno, Copa에서 매우 낮은 VMAF를 기록했다.


주요 원인은 다음과 같이 분석된다.

- multi-client handling 취약
- HTTP/3 callback context를 새 connection마다 덮어쓰는 문제
- SSL handshake scheduling 비효율
- 동시 요청 처리 시 RTT 급증

저자들은 LSQUIC과 XQUIC을 이후 분석에서 제외한다. multi-client 확장성 한계가 너무 커 공정한 비교가 어렵기 때문이다.


## 6.1.3 Cascade trace 결과


원문 Figure 4는 Cascade trace에서의 결과다.


Cascade trace는 안정적인 구간과 갑작스러운 throughput drop이 섞여 있다. 이 trace는 CC와 구현체가 갑작스러운 rate change에 얼마나 잘 적응하는지 드러낸다.


### 주요 결과

- MVFST와 PICOQUIC은 전반적으로 안정적이었다.
- PICOQUIC의 FastCC는 갑작스러운 drop에 적응하지 못해 VMAF가 낮았다.
- QUINN은 Netflix 5G보다 VMAF가 다소 낮아졌다. 비동기 구조가 급격한 throughput 변화에 즉각 대응하는 데 약간 지연을 만들 수 있다고 해석한다.
- TQUIC에서는 BBR3와 Copa가 BBR보다 더 좋은 성능을 보였다.
- TQUIC+Cubic은 Cascade trace에서 MVFST/PICOQUIC과 유사한 수준까지 올라왔다. 안정적 baseline에서는 HyStart++와 ACK clocking이 유리하게 작동한 것으로 해석된다.

### Cascade trace에서의 메시지

> **갑작스러운 throughput drop이 있는 환경에서는 smooth pacing과 graceful degradation이 중요하다.**

## 6.1.4 LTE Belgium trace 결과


원문 Figure 5는 LTE Belgium trace에서의 결과다.


LTE Belgium은 평균 throughput이 약 20 Mbps이고 표준편차가 낮다. 흥미로운 점은 20 Mbps 평균 throughput임에도 40 Mbps bitrate level의 segment를 다운로드할 수 있었다는 것이다.


그 이유는 다음과 같다.

- 비디오는 variable bitrate, VBR, 로 인코딩되어 있다.
- 40 Mbps는 전체 평균 bitrate이고, 실제 segment 크기는 콘텐츠 복잡도에 따라 더 작을 수 있다.
- VoD는 60초 buffer가 있어 throughput 변동을 흡수할 수 있다.
- Pensieve+가 segment size를 효율적으로 활용한다.

### LTE Belgium trace에서의 메시지

> **충분한 평균 throughput과 낮은 표준편차가 있으면 구현체 차이가 일부 가려질 수 있다.**

즉, 네트워크 headroom이 충분하면 덜 효율적인 구현체도 비교적 높은 VMAF를 달성할 수 있다.


---


# 6.2 Scenario D: LLL, 같은 trace, 같은 ABR


Scenario D는 Low-Latency Live Streaming 환경이다.


VoD와 달리 LLL은 다음 특징을 가진다.

- segment duration: 2초
- max buffer: 6초
- rebuffering과 delay에 민감
- 빠른 throughput estimation과 pacing이 중요
- 공격적인 ramp-up이 오히려 품질 저하를 만들 수 있음

## 6.2.1 전체 요약


LLL에서는 VoD와 다른 결과가 나타난다.

> **LLL은 buffer가 작기 때문에 aggressive CC보다 delay-sensitive하고 안정적으로 적응하는 CC가 유리한 경우가 많다.**

또한 implementation architecture의 영향이 더 커진다. packet delivery가 조금만 늦어도 buffer가 작기 때문에 playback에 직접 영향을 줄 수 있다.


## 6.2.2 Netflix 5G trace 결과


원문 Figure 6은 Netflix 5G trace에서 LLL + Pensieve+ 조건의 VMAF를 보여 준다.


### AIOQUIC


AIOQUIC에서는 Reno가 Cubic보다 좋은 VMAF를 보였다.


LLL의 작은 buffer에서는 Cubic의 공격적인 ramp-up이 부정적으로 작용할 수 있다. bandwidth를 과대평가하면 packet loss나 delay가 발생하고, 작은 buffer에서는 이 영향이 곧바로 품질 저하로 이어진다.


### MVFST


MVFST는 모든 CC에서 안정적이고 높은 VMAF를 보였다. Cubic/Reno에서도 AIOQUIC보다 훨씬 높았다.


C++ 기반 구현과 낮은 RTT, 효율적인 async I/O가 다시 강점으로 작용한다.


### PICOQUIC


PICOQUIC은 BBR, BBR3, Cubic, Reno, Prague에서 좋은 결과를 보였다. 하지만 DCubic과 FastCC는 LLL에서 뒤처졌다.


이유는 다음과 같다.

- DCubic은 보수적으로 ramp-up하여 bandwidth를 충분히 활용하지 못할 수 있다.
- FastCC는 공격적 probing 때문에 packet loss와 delay를 만들 수 있다.
- 작은 segment와 작은 buffer가 이러한 문제를 증폭한다.

### QUINN


QUINN은 LLL에서도 안정적이다. Rust async I/O 구조 덕분에 MVFST/PICOQUIC과 유사한 결과를 보였다.


### TQUIC


흥미롭게도 TQUIC은 VoD와 반대되는 양상을 보였다. LLL에서는 BBR과 BBR3가 Cubic보다 좋은 VMAF를 보였다.


논문은 pacing 부재가 항상 나쁜 것만은 아니며, LLL의 제한된 buffer와 BBR/BBR3의 delay-based 특성이 특정 조건에서 맞아떨어질 수 있다고 해석한다. 다만 Cubic과 Copa는 BBR/BBR3보다 낮았다.


## 6.2.3 Cascade trace 결과


원문 Figure 7은 Cascade trace의 LLL 결과다.


### 주요 결과

- AIOQUIC은 Netflix 5G와 비슷한 양상을 보였다.
- MVFST에서는 Copa2가 상대적으로 좋은 성능을 보였다.
- BBR은 갑작스러운 drop에서 bandwidth estimation과 pacing 때문에 약간 손해를 보았다.
- PICOQUIC에서는 BBR3와 DCubic이 가장 높은 VMAF를 보였다.
- QUINN+BBR은 MVFST/PICOQUIC보다 약간 높은 VMAF를 보였다.
- TQUIC에서는 BBR3, Cubic, Copa가 비슷한 수준이었다.

### Cascade trace에서의 LLL 메시지

> **LLL + 갑작스러운 throughput drop 환경에서는 hybrid 방식의 CC, 예를 들어 BBR3나 DCubic, 가 강점을 보일 수 있다.**

## 6.2.4 LTE Belgium trace 결과


원문 Figure 8은 LTE Belgium trace에서 LLL 결과를 보여 준다.


VoD와 마찬가지로 대부분 구현체는 안정적인 VMAF를 보였다. 하지만 예외가 있었다.

- PICOQUIC+DCubic은 한 클라이언트에서 severe rebuffering을 유발했다.
- PICOQUIC+Prague는 두 클라이언트에서 큰 rebuffering이 나타났다.

원인은 LTE Belgium trace의 특성이다.

- 평균 throughput은 충분하다.
- 하지만 작고 빈번한 변동이 있다.
- LLL은 buffer가 작다.
- DCubic은 보수적 recovery로 bandwidth를 과소사용한다.
- Prague는 delay 변화에 민감하게 반응해 불필요하게 rate를 낮춘다.

### LTE Belgium trace에서의 LLL 메시지

> **LLL에서는 보수적인 CC가 항상 안전하지 않다. multi-client 환경에서 bandwidth를 과소추정하면 일부 client가 심각한 rebuffering을 겪을 수 있다.**

## 6.2.5 LLL vs VoD 비교


논문은 평균적으로 LLL에서 VoD보다 더 높은 VMAF가 관찰되었다고 말한다.


직관적으로는 LLL이 더 어렵게 느껴지지만, 이 실험에서는 다음 이유로 LLL의 VMAF가 높았다.

- LLL segment는 2초로 VoD의 절반이다.
- segment 크기가 작아 더 빠르게 다운로드할 수 있다.
- 같은 network trace에서 더 작은 segment는 adaptation을 빠르게 만든다.
- Pensieve+가 더 많은 ultra-HD segment를 선택할 수 있었다.

---


# 7. QUIC Friendliness: 다중 클라이언트 공정성


## 7.1 Friendliness란 무엇인가


논문에서 QUIC friendliness는 여러 QUIC flow가 동시에 존재할 때, 각 client가 공정한 throughput과 성능을 얻는지를 의미한다.


단순히 평균 throughput이 높아도 특정 client만 많이 받고 다른 client가 굶는다면 streaming service 관점에서는 좋지 않다.


```plain text
좋은 QUIC 서버 구현체
= 높은 평균 품질
+ 낮은 RTT
+ 낮은 rebuffering
+ client 간 공정한 throughput
```


## 7.2 VoD에서의 friendliness 결과


원문 Figure 9는 Netflix 5G trace + VoD + Pensieve+ 조건의 client별 throughput boxplot을 보여 준다.


### AIOQUIC


AIOQUIC+Cubic은 일부 client에게 불공정했다. Cubic의 공격적인 ramp-up이 특정 flow에 더 많은 bandwidth를 배정하고, 다른 client에게는 낮은 share를 남긴다.


반면 AIOQUIC+Reno는 더 보수적인 특성 때문에 client 간 bandwidth가 비교적 균등했다.


### TQUIC


TQUIC+BBR/BBR3는 delay sensitivity로 인해 client 간 순간적인 차이가 생겼다. Copa는 평균 throughput이 높지만 변동성도 컸다.


### MVFST와 QUINN


MVFST와 QUINN은 CC 선택과 관계없이 client 간 throughput이 비교적 일관적이었다.


이는 efficient asynchronous concurrency management 덕분이라고 해석된다.


### LSQUIC


LSQUIC은 single-threaded 구조 때문에 multi-client 환경에서 resource allocation이 비효율적이었다.


특히 Adaptive CC에서는 일부 client가 높은 throughput을 얻고, 다른 client는 매우 낮은 throughput을 얻었다.


### XQUIC


XQUIC은 모든 client에서 낮은 throughput을 보였다. 앞서 언급한 SSL handshake scheduling 문제와 HTTP/3 callback context 문제가 QoE를 직접 악화시켰다.


### PICOQUIC


PICOQUIC은 MVFST, QUINN과 유사하게 여러 CC에서 client 간 fairness를 잘 유지했다.


## 7.3 핵심 해석

> **다중 클라이언트 스트리밍에서 공정성은 CC 알고리즘보다 구현체의 connection handling 구조에 더 크게 좌우된다.**

즉, streaming server를 고를 때는 “BBR 지원 여부”만 보면 안 된다. 더 중요한 것은 다음이다.

- multi-client를 async로 잘 처리하는가
- connection scheduling이 안정적인가
- stream별 state 관리가 정확한가
- SSL/TLS handshake가 concurrent하게 처리되는가
- pacing과 ACK handling이 안정적인가

---


# 8. Ablation Study


Ablation Study는 본 실험에서 드러난 한계를 더 깊게 보기 위해 특정 요소만 바꿔 보는 추가 실험이다.


논문은 특히 LLL 환경을 중심으로 다음을 본다.

1. 고변동 4G/5G trace
2. Router AQM strategy
3. ECN marking
4. QUIC throughput estimation
5. QUIC과 TCP cross-traffic
6. Best QUIC+CC 조합

---


# 8.1 고변동 4G/5G 네트워크의 영향


원문 Figure 10 왼쪽은 고변동 4G/5G trace에서 VMAF와 RD를 비교한다.


이 trace는 여러 real-world 4G/5G trace를 조합해 만들었고, 평균 throughput은 137 Mbps, 표준편차는 ±67 Mbps로 매우 크다. inter-variation time은 1초다.


### 결과

- MVFST와 QUINN이 가장 높은 VMAF와 낮은 rebuffering을 보였다.
- PICOQUIC은 약간 뒤처졌고 일부 rebuffering이 있었다.
- TQUIC은 MVFST/QUINN보다 약 3× JND 수준으로 VMAF가 낮았다.
- AIOQUIC은 PICOQUIC과 유사한 VMAF를 보였지만 rebuffering이 컸다.

### 해석


고변동 네트워크에서는 빠른 적응이 핵심이다.


MVFST와 QUINN의 async non-blocking concurrency management는 급격한 throughput 변화에 빠르게 대응했다. 반면 AIOQUIC은 Python 기반 구현과 긴 RTT 때문에 timely CC decision이 어려웠고, rebuffering이 커졌다.


---


# 8.2 Router AQM 전략의 영향


원문 Figure 10 오른쪽은 라우터의 AQM 전략이 QUIC 성능에 미치는 영향을 보여 준다.


비교 대상은 다음이다.

- 좋은 조합: MVFST+Copa
- 나쁜 조합: TQUIC+Cubic
- trace: Cascade
- ABR: Pensieve+
- mode: LLL

평가한 AQM은 다음과 같다.

- PFIFO
- PIE
- FQ_CoDel

### 결과


AQM 전략은 RD에 약 0.2% 수준의 작은 영향만 보였고, VMAF에는 큰 영향을 주지 않았다.


### 해석


논문 조건에서는 QUIC CC 성능이 router AQM보다 구현체와 CC 조합에 더 크게 좌우되었다.


즉, AQM이 나쁜 구현체의 구조적 문제를 크게 보완하지 못했다.


---


# 8.3 ECN marking의 영향


ECN은 packet loss가 발생하기 전에 congestion signal을 전달해 혼잡 제어가 더 일찍 반응하도록 돕는 기능이다.


논문에서 ECN을 fully support하는 구현체는 LSQUIC, PICOQUIC, QUINN이라고 설명한다. 하지만 LSQUIC은 확장성 문제가 있어 ECN 실험에서는 PICOQUIC과 QUINN을 중심으로 본다.


원문 Figure 11 왼쪽은 Cascade trace + LLL + Pensieve+ 조건에서 ECN 효과를 보여 준다.


### 결과


ECN은 VMAF를 약간 개선했다.


다만 Cascade trace는 평균 throughput이 충분히 좋은 편이라 효과가 작았다. 논문은 더 심하게 혼잡한 link에서는 ECN 효과가 커질 수 있다고 해석한다.


---


# 8.4 QUIC throughput estimation


논문은 클라이언트 측 QUIC-GO가 추정한 throughput이 실제 trace와 잘 맞는지도 확인했다.


원문 Figure 11 오른쪽은 Netflix 5G와 LTE Belgium trace의 실제 throughput과 추정 throughput을 비교한다.


### 결과


QUIC-GO의 throughput estimation은 실제 trace와 잘 일치했다.


### 해석


따라서 본 실험에서 관찰된 QoE 차이는 클라이언트 throughput estimation 오류 때문이라기보다는, QUIC 구현체와 CC 동작 차이 때문이라고 해석한다.


---


# 8.5 QUIC flow와 TCP cross-traffic의 공존


원문 Figure 12는 QUIC flow와 TCP Cubic flow가 같은 네트워크에서 공존할 때의 throughput을 보여 준다.


실험 조건은 다음과 같다.

- 5개의 TCP Cubic flow 추가
- 각 TCP flow는 1:1 streaming session
- MVFST와 QUINN 비교
- VoD와 LLL 모두 평가
- Netflix 5G trace
- Pensieve+ ABR

### 결과


QUIC traffic은 TCP throughput을 크게 해치지 않았다.


TCP throughput이 약간 더 높게 보이기도 했지만, QUIC은 multiplexing과 낮은 latency, concurrent connection handling에서 장점을 보였다.


### 해석


논문은 QUIC과 TCP가 고수요 상황에서도 큰 성능 저하 없이 공존 가능하다고 본다.


---


# 9. 최적 QUIC + CC 조합


논문 Table 4는 각 구현체와 CC 조합의 평균 VMAF를 VoD와 LLL에 대해 정리한다.


## 9.1 구현체별 주요 VMAF 요약



| QUIC 구현체 | CC | VoD VMAF | LLL VMAF | 해석 |
| --- | --- | --- | --- | --- |
| AIOQUIC | Cubic | 73.57 | 80.74 | VoD에서는 Cubic이 낫지만 전체적으로 낮은 편 |
| AIOQUIC | Reno | 68.57 | 85.79 | LLL에서는 Reno가 Cubic보다 유리 |
| MVFST | BBR | 86.09 | 88.84 | VoD 최상위 |
| MVFST | BBR2 | 84.74 | 89.62 | 안정적 |
| MVFST | Cubic | 83.96 | 90.47 | LLL에서도 강함 |
| MVFST | Reno | 85.45 | 90.43 | 안정적 |
| MVFST | Copa | 85.25 | 91.59 | LLL 최고 |
| MVFST | Copa2 | 85.71 | 90.85 | 안정적 |
| PICOQUIC | BBR3 | 81.50 | 90.38 | LLL에서 강함 |
| PICOQUIC | BBR | 82.74 | 85.57 | VoD는 무난, LLL은 상대적으로 낮음 |
| PICOQUIC | Cubic | 84.08 | 87.98 | VoD에서 좋은 편 |
| PICOQUIC | DCubic | 81.39 | 실패/불안정 | LLL LTE Belgium에서 문제 |
| PICOQUIC | Reno | 82.73 | 86.27 | 무난 |
| PICOQUIC | FastCC | 78.60 | 81.50 | 공격적 probing으로 불리 |
| PICOQUIC | Prague | 81.63 | 실패/불안정 | LLL에서 rebuffering 문제 |
| QUINN | BBR | 80.77 | 91.56 | LLL에서 매우 강함 |
| QUINN | Cubic | 80.57 | 88.93 | 안정적 |
| QUINN | Reno | 80.16 | 89.37 | 안정적 |
| TQUIC | BBR | 66.72 | 84.52 | VoD에서는 낮음 |
| TQUIC | BBR3 | 71.80 | 86.27 | LLL에서는 상대적으로 개선 |
| TQUIC | Cubic | 77.02 | 80.16 | VoD에서는 TQUIC 내 최고, LLL에서는 낮음 |
| TQUIC | Copa | 75.31 | 83.44 | 중간 |



## 9.2 모드별 최적 조합



| 모드 | 최적 조합 | 이유 |
| --- | --- | --- |
| VoD | MVFST + BBR | 가장 높은 평균 VMAF. 안정적 throughput과 구현 효율이 강점 |
| LLL | MVFST + Copa | 가장 높은 평균 VMAF. latency와 throughput 균형이 좋음 |
| LLL 대안 | QUINN + BBR | MVFST+Copa와 거의 비슷한 수준. Rust async 구조의 장점 |
| PICOQUIC 권장 | VoD: Cubic / LLL: BBR3 | C 기반 효율성과 다양한 CC 지원 |
| AIOQUIC 권장 | VoD: Cubic / LLL: Reno | 다만 전체 성능은 낮은 편 |
| TQUIC 권장 | VoD: Cubic / LLL: BBR3 | pacing 부재를 고려해야 함 |



## 9.3 핵심 해석

> **최고 조합은 상황에 따라 다르다. VoD와 LLL은 요구사항이 달라 같은 CC가 항상 최선이 아니다.**

VoD는 큰 buffer를 사용하므로 stable throughput과 높은 bitrate 유지가 중요하다. LLL은 buffer가 작으므로 latency, packet pacing, 빠른 adaptation이 더 중요하다.


---


# 10. 핵심 결론과 시사점


## 10.1 같은 CC라도 구현체가 다르면 다르게 동작한다


이 논문의 가장 중요한 결론이다.


Cubic, Reno, BBR 같은 알고리즘 이름만 보고 성능을 예측하면 안 된다.


동일한 CC라도 다음 요인에 따라 실제 동작이 달라진다.

- pacing 구현 여부
- ACK handling
- slow start / HyStart / HyStart++ 구현
- asynchronous I/O 구조
- thread scheduling
- TLS handshake 처리
- HTTP/3 context 관리
- qlog/logging overhead
- flow control 설정

## 10.2 구현 언어와 런타임 오버헤드가 중요하다


논문은 C++/Rust 기반 구현체가 Python 기반 AIOQUIC보다 전반적으로 더 좋은 성능을 보였다고 정리한다.

- MVFST: C++ 기반, 낮은 RTT, 높은 VMAF
- QUINN: Rust 기반, async tokio 사용, LLL에서 강점
- PICOQUIC: C 기반, 다양한 CC 지원, 균형 잡힌 성능
- AIOQUIC: Python 기반, RTT가 높고 multi-client에서 불리

단, 이것은 언어만의 문제가 아니라 구현체 전체 설계의 결과로 봐야 한다.


## 10.3 Async I/O는 multi-client streaming에서 강하다


MVFST와 QUINN은 client 간 fairness가 좋았다.


논문은 효율적인 asynchronous concurrency management가 multi-client 환경에서 안정적인 resource distribution을 가능하게 한다고 본다.


## 10.4 Pacing은 기본 기능에 가깝다


TQUIC은 pacing support가 없거나 제한적이어서 bursty transmission 문제가 발생했다.


pacing이 없으면 다음 문제가 생길 수 있다.


```plain text
패킷 burst 전송
↓
queue buildup
↓
RTT 변동 증가
↓
throughput estimation 불안정
↓
ABR이 잘못된 bitrate 선택
↓
VMAF 저하 또는 rebuffering 증가
```


## 10.5 AQM과 ECN은 보조적이다


라우터 AQM 전략은 실험 조건에서 큰 QoE 차이를 만들지 않았다. ECN은 VMAF를 약간 개선했지만, 결정적 수준은 아니었다.


즉, 문제의 본질은 네트워크 장비 설정보다 QUIC 구현체와 CC/ABR의 상호작용에 더 가까웠다.


## 10.6 Cross-layer 설계가 필요하다


저자들은 QUIC과 ABR을 따로 최적화하는 방식에 한계가 있다고 본다.


현재 구조는 대략 이렇다.


```plain text
QUIC CC는 네트워크 상태를 보고 전송률을 결정
ABR은 client throughput과 buffer만 보고 bitrate 결정
둘은 서로의 의도를 충분히 모름
```


저자들이 원하는 방향은 다음이다.


```plain text
QUIC 서버가 media segment 정보와 client requirement를 알고
ABR이 transport-level signal을 활용하고
CC가 content type과 QoE 목표를 반영하는 구조
```


논문은 AIOQUIC을 수정하여 maximum segment chunk size를 flow control limit에 반영한 실험을 수행했다. 원문 Figure 14에 따르면 이 수정 버전 AIOQUIC*는 기존 대비 VMAF가 16% 증가하고 RTT가 84% 감소했다.


이 결과는 cross-layer metric sharing의 가능성을 보여 준다.


---


# 11. 한계와 향후 연구


논문도 여러 한계를 명시한다.


## 11.1 평가한 구현체 수의 한계


현재 약 15개 QUIC 구현체가 있지만, 논문은 7개만 실험했다. 일부 구현체는 multi-client 지원이 부족하거나 client/server 지원이 제한되어 제외되었다.


## 11.2 QUIC 기능 전체를 다룬 것은 아니다


다음 기능은 본격적으로 평가하지 않았다.

- prioritization
- 0-RTT
- connection migration
- multipath QUIC
- browser-specific effects
- client-side QUIC implementation 차이

## 11.3 콘텐츠 유형의 한계


평가는 4K 비디오 중심이다.


저자들은 향후 다음 콘텐츠를 다룰 계획이라고 언급한다.

- 8K video
- 360도 video
- volumetric video
- ultra-low latency media

## 11.4 QoE 모델의 한계


논문은 VMAF와 RD를 주로 사용했다. 하지만 QoE는 다음 요소도 포함할 수 있다.

- startup delay
- quality switching frequency
- latency to live edge
- user engagement
- viewport quality
- audio/video sync
- subjective preference

## 11.5 실제 배포 환경과의 차이


실험은 Docker와 tc-Netem 기반 emulation 환경이다. 실제 CDN, browser, mobile OS, radio condition, ISP routing, server load balancer 환경에서는 다른 결과가 나올 수 있다.


---


# 12. 논문을 읽을 때 주의할 점


## 12.1 “QUIC이 TCP보다 무조건 좋다”는 논문이 아니다


이 논문은 QUIC의 장점을 말하지만, 핵심은 QUIC 자체가 아니라 **QUIC 구현체별 차이**다.


따라서 결론은 다음에 가깝다.


```plain text
QUIC을 쓰면 좋아진다 ❌
좋은 QUIC 구현체와 적절한 CC/ABR 조합을 써야 좋아진다 ✅
```


## 12.2 “BBR이 항상 좋다”도 아니다


VoD에서는 MVFST+BBR이 최고였지만, LLL에서는 MVFST+Copa가 최고였다. PICOQUIC에서는 LLL에서 BBR3가 좋았고, AIOQUIC에서는 LLL에서 Reno가 Cubic보다 좋았다.


즉, 최적 CC는 다음에 따라 달라진다.

- 구현체
- 네트워크 trace
- VoD인지 LLL인지
- buffer 크기
- segment duration
- ABR 알고리즘
- multi-client 여부

## 12.3 실무에서는 구현체의 버전과 설정이 더 중요할 수 있다


논문이 특정 구현체의 한계를 지적하지만, QUIC 구현체는 빠르게 발전한다. 논문 실험 당시의 버그나 설계 문제가 현재 버전에서 바뀌었을 수 있다.


따라서 실무에서는 논문 결과를 그대로 복사하기보다, 자기 서비스 환경에서 직접 benchmark해야 한다.


## 12.4 실험은 HTTP/3 전체보다는 QUIC transport layer에 초점이 있다


논문은 HTTP/3가 QUIC 위에 동작한다는 점을 전제로 하지만, 주 분석은 QUIC transport layer의 CC와 구현체 성능이다.


따라서 실제 browser 기반 HLS/DASH stack, player behavior, CDN behavior까지 완전히 포함한 end-to-end 평가라고 보기는 어렵다.


---


# 부록 A. 원문 그림·표 해석


## Figure 1. Extended Vegvisir Emulation Setup


원문 4쪽의 Figure 1은 실험 topology를 보여 준다.


```plain text
Rightnet: QUIC Servers
    ↓
TC Netem Shaper
    ↓
Leftnet1~5: QUIC-GO Clients
```


핵심은 하나의 QUIC 서버 구현체가 5개 클라이언트에게 동시에 video segment를 제공한다는 점이다. 중간 shaper는 bandwidth, delay, loss, queue 등을 제어한다.


## Figure 2. Network Traces


원문 5쪽의 Figure 2는 Netflix 5G, LTE Belgium, Cascade trace의 throughput 변화를 보여 준다.

- Netflix 5G: 시간이 지나며 throughput이 증가하고 특정 구간에서 급증
- LTE Belgium: 평균은 낮지만 변동 폭이 비교적 작음
- Cascade: 계단형 변화와 갑작스러운 drop이 존재

이 trace 차이가 각 QUIC 구현체와 CC의 약점을 드러낸다.


## Table 1. Experimental Scenarios


원문 5쪽의 Table 1은 VoD/LLL에서 같은 trace·다른 trace, 같은 ABR·다른 ABR 조합을 정리한다.


본문은 A와 D를 중심으로 하고, 나머지는 부록에서 보조 분석으로 제시한다.


## Table 2. Summary of QUIC Implementations


원문 7쪽의 Table 2는 각 QUIC 구현체가 어떤 CC를 지원하고, multi-client와 ECN 지원 여부, 알려진 issue를 정리한다.


이 표에서 중요한 점은 “QUIC 구현체가 다 같은 수준이 아니다”라는 것이다. 어떤 구현체는 multi-client 지원이 부족하고, 어떤 구현체는 qlog를 지원하지 않으며, 어떤 구현체는 특정 CC가 없다.


## Table 3. QUIC Stack Features


원문 7쪽의 Table 3은 언어, 동시성 모델, pacing, multipath, ECN, qlog, TLS/SSL backend를 비교한다.


논문 결과를 이해하려면 이 표가 중요하다. VMAF 차이는 단순히 CC 때문이 아니라 이 stack-level 차이에서 많이 발생한다.


## Figure 3~5. VoD VMAF 분석

- Figure 3: Netflix 5G trace, VoD
- Figure 4: Cascade trace, VoD
- Figure 5: LTE Belgium trace, VoD

세 그림 모두 같은 ABR인 Pensieve+를 사용한다. 구현체별로 CC를 바꿨을 때 평균 VMAF가 어떻게 달라지는지를 보여 준다.


## Figure 6~8. LLL VMAF 분석

- Figure 6: Netflix 5G trace, LLL
- Figure 7: Cascade trace, LLL
- Figure 8: LTE Belgium trace, LLL

LLL에서는 작은 buffer와 짧은 segment duration 때문에 VoD와 다른 양상이 나타난다. 특히 Reno, Copa, BBR3 같은 조합이 상황에 따라 더 유리해진다.


## Figure 9. QUIC Friendliness


원문 16쪽의 Figure 9는 5개 client의 throughput 분포를 boxplot으로 보여 준다.


MVFST, QUINN, PICOQUIC은 client 간 비교적 균등한 throughput을 보인다. 반면 LSQUIC과 XQUIC은 multi-client handling 문제 때문에 불공정하거나 낮은 throughput을 보인다.


## Figure 10. High Volatility와 AQM


원문 18쪽의 Figure 10은 두 가지를 보여 준다.

- 왼쪽: 고변동 4G/5G trace에서 VMAF와 RD
- 오른쪽: PFIFO, PIE, FQ_CoDel 같은 AQM이 성능에 미치는 영향

고변동 환경에서는 MVFST와 QUINN이 강하고, AQM 변화는 큰 효과를 만들지 않았다.


## Figure 11. ECN과 Throughput Estimation


원문 19쪽의 Figure 11은 ECN이 약간의 VMAF 개선을 제공하고, QUIC-GO의 throughput estimation이 실제 trace와 잘 맞는다는 점을 보여 준다.


## Figure 12. QUIC vs TCP Flow Comparison


원문 20쪽의 Figure 12는 QUIC과 TCP가 같은 네트워크에서 공존할 때의 throughput을 보여 준다. 결과적으로 QUIC traffic이 TCP를 심하게 방해하지 않았다.


## Figure 13. RTT Comparison


원문 20쪽의 Figure 13은 구현체별 RTT를 비교한다.


AIOQUIC과 XQUIC은 RTT가 매우 높게 나타났고, MVFST, PICOQUIC, QUINN, TQUIC은 상대적으로 낮은 RTT를 보였다.


## Figure 14. Cross-Layer QUIC Server


원문 21쪽의 Figure 14는 AIOQUIC을 connection-aware 방식으로 수정했을 때의 효과를 보여 준다.


AIOQUIC*는 기존 AIOQUIC보다 VMAF가 16% 증가하고 RTT가 84% 감소했다. 이는 cross-layer 정보 공유가 QUIC 기반 streaming 성능을 크게 개선할 수 있음을 시사한다.


## Appendix Figures B1~B4


부록의 B1~B4는 추가 시나리오를 보여 준다.

- B1: VoD, 같은 trace, 다른 ABR
- B2: VoD, 다른 trace, 같은 ABR
- B3: LLL, 같은 trace, 다른 ABR
- B4: LLL, 다른 trace, 같은 ABR

주요 결론은 본문과 유사하다. MVFST와 QUINN이 강하고, AIOQUIC은 RTT 문제로 뒤처지며, TQUIC은 상황별 편차가 있다.


## Figure C1. LLL Friendliness


원문 28쪽 Figure C1은 LLL에서의 client 간 throughput fairness를 보여 준다.


VoD와 유사하게 MVFST와 QUINN이 robust하고, XQUIC과 LSQUIC은 multi-client scalability 한계가 드러난다.


## Figure D1. Detailed Vegvisir Setup


원문 29쪽 Figure D1은 Docker bridge, shaper interface, client interface, IP subnet 구성을 자세히 보여 준다.


이 그림은 실험이 단순한 benchmark가 아니라 reproducible한 emulation setup 위에서 수행되었음을 설명한다.


---


# 부록 B. 핵심 용어 정리



| 용어 | 의미 |
| --- | --- |
| QUIC | UDP 위에서 동작하는 modern transport protocol. HTTP/3의 기반 |
| HTTP/3 | QUIC 위에서 동작하는 HTTP 최신 버전 |
| HAS | HTTP Adaptive Streaming. 네트워크 상황에 맞게 bitrate를 바꾸는 스트리밍 방식 |
| DASH | MPEG Dynamic Adaptive Streaming over HTTP |
| HLS | Apple HTTP Live Streaming |
| ABR | Adaptive Bitrate. 다음 segment의 bitrate를 결정하는 알고리즘 |
| CC | Congestion Control. 네트워크 혼잡에 따라 전송률을 제어하는 알고리즘 |
| Cubic | 대표적인 loss-based congestion control |
| Reno | 전통적인 TCP congestion control. 보수적이고 공정한 경향 |
| BBR | bottleneck bandwidth와 RTT를 추정해 전송률을 조절하는 모델 기반 CC |
| BBR2 / BBR3 | BBR의 개선 버전 |
| Copa | delay와 throughput 사이의 trade-off를 조절하는 CC |
| Copa2 | Copa 개선 버전 |
| DCubic | delay-based Cubic variant |
| FastCC | 공격적 bandwidth probing 특성이 있는 CC |
| Prague | low-latency와 ECN/L4S 맥락에서 등장하는 delay-sensitive CC |
| VMAF | Video Multi-Method Assessment Fusion. Netflix가 개발한 지각 품질 지표 |
| RD | Rebuffering Duration Ratio. 재생 중 버퍼링 비율 |
| RTT | Round Trip Time. 왕복 지연 시간 |
| AQM | Active Queue Management. 라우터 queue 관리 방식 |
| PFIFO | Packet First-In First-Out queue discipline |
| PIE | Proportional Integral Controller Enhanced AQM |
| FQ_CoDel | Flow Queue Controlled Delay AQM |
| ECN | Explicit Congestion Notification. packet loss 전 congestion signal 전달 |
| qlog | QUIC/HTTP/3 debugging과 analysis를 위한 log format |
| MoQ | Media over QUIC. QUIC 기반 media delivery stack 표준화 작업 |
| Pacing | packet을 burst로 보내지 않고 일정하게 spacing하여 전송하는 방식 |
| HyStart / HyStart++ | slow start를 더 안전하게 종료하기 위한 기법 |



---


# 부록 C. 발표·리뷰용 요약 문장


## 30초 요약


이 논문은 7개 QUIC 구현체와 다양한 혼잡 제어 알고리즘을 4K adaptive video streaming 환경에서 비교한다. 결과적으로 같은 CC 알고리즘이라도 구현체의 언어, 동시성 모델, pacing, multi-client handling에 따라 VMAF, RTT, fairness가 크게 달라졌다. VoD에서는 MVFST+BBR이, LLL에서는 MVFST+Copa가 가장 좋은 결과를 보였고, QUINN과 PICOQUIC도 강한 성능을 보였다. 논문은 QUIC과 ABR을 분리해서 최적화하는 기존 방식보다 cross-layer 설계가 필요하다고 결론짓는다.


## 1분 요약


비디오 스트리밍은 인터넷 트래픽의 대부분을 차지하며, HTTP/3와 QUIC의 도입으로 transport layer의 선택이 QoE에 직접적인 영향을 미치게 되었다. 이 논문은 AIOQUIC, MVFST, LSQUIC, PICOQUIC, QUINN, TQUIC, XQUIC 등 다양한 QUIC 구현체를 대상으로 VoD와 low-latency live streaming을 평가했다. 핵심 결과는 QUIC 표준이나 CC 알고리즘 이름만으로 성능을 예측할 수 없다는 것이다. 같은 Cubic이나 BBR도 구현체에 따라 VMAF와 RTT가 크게 달라졌다. 특히 MVFST와 QUINN은 async I/O 구조 덕분에 높은 품질과 client 간 fairness를 보였고, AIOQUIC은 높은 RTT, LSQUIC과 XQUIC은 multi-client 한계가 드러났다. 연구는 future media streaming stack에서는 QUIC CC와 ABR을 함께 고려하는 cross-layer design이 필요하다고 주장한다.


## 논문 기여 4가지

1. 다양한 QUIC 구현체와 CC 조합을 비디오 스트리밍 관점에서 체계적으로 평가했다.
2. QUIC CC가 ABR 결정과 QoE에 미치는 영향을 VoD와 LLL 모두에서 분석했다.
3. AQM, ECN, 4G/5G 변동성, TCP cross-traffic 같은 현실적 조건을 추가 평가했다.
4. 구현체별 강점과 약점을 비교해 상황별 QUIC+CC 선택에 대한 실질적 가이드를 제공했다.

## 리뷰 코멘트로 쓸 수 있는 장점

- 단순 transport benchmark가 아니라 video QoE까지 연결해 분석했다.
- 동일 CC가 구현체별로 다르게 동작한다는 중요한 사실을 실험적으로 보였다.
- multi-client 환경을 고려해 실제 streaming server 확장성에 가까운 조건을 만들었다.
- VoD와 LLL을 분리하여 서로 다른 성능 요구를 비교했다.
- AQM, ECN, TCP coexistence, cross-layer tuning까지 포함해 분석 범위가 넓다.

## 리뷰 코멘트로 쓸 수 있는 한계

- Docker/tc-Netem 기반 emulation이므로 실제 CDN/browser/mobile deployment와 차이가 있다.
- 7개 구현체만 평가했고, QUICHE, MSQUIC 등 일부 중요한 구현체는 제한적으로만 다뤄졌다.
- VMAF와 RD 중심이라 startup delay, live edge latency, quality switching frequency 같은 QoE 요소는 제한적으로 반영된다.
- 구현체의 특정 버그나 실험 당시 버전 문제가 결과에 영향을 주었을 가능성이 있다.
- client-side QUIC 구현 차이와 browser stack 차이는 충분히 분석하지 않았다.

---


# 부록 D. 실무 적용 체크리스트


## D.1 QUIC 기반 스트리밍 서버를 고를 때

- [ ] 단일 client benchmark만 보지 않는다.
- [ ] multi-client 동시 접속에서 throughput fairness를 측정한다.
- [ ] RTT 평균뿐 아니라 tail latency와 variance를 확인한다.
- [ ] pacing 지원 여부를 확인한다.
- [ ] qlog 또는 충분한 transport-level logging이 가능한지 확인한다.
- [ ] ECN 지원 여부를 확인하되, 과대평가하지 않는다.
- [ ] TLS handshake와 HTTP/3 context가 concurrent connection에서 안정적인지 본다.
- [ ] 구현체별 기본 CC가 무엇인지 확인한다.
- [ ] 같은 CC라도 구현체별 동작이 다른지 직접 테스트한다.

## D.2 VoD 서비스라면

- [ ] 큰 buffer를 활용해 안정적인 high-bitrate delivery를 목표로 한다.
- [ ] throughput stability와 평균 VMAF를 우선한다.
- [ ] MVFST+BBR, PICOQUIC+Cubic, QUINN+BBR 같은 조합을 후보로 테스트한다.
- [ ] VBR encoding에서 실제 segment size와 nominal bitrate가 다르다는 점을 ABR에 반영한다.
- [ ] rebuffering이 거의 없는 환경에서는 VMAF 차이가 핵심 품질 지표가 될 수 있다.

## D.3 Low-Latency Live Streaming이라면

- [ ] buffer가 작기 때문에 RTT와 pacing을 더 중요하게 본다.
- [ ] aggressive ramp-up CC가 항상 좋은 것은 아니다.
- [ ] MVFST+Copa, QUINN+BBR, PICOQUIC+BBR3 같은 조합을 후보로 테스트한다.
- [ ] segment duration이 짧을수록 request frequency가 늘어나므로 server concurrency 처리 능력을 확인한다.
- [ ] 작은 throughput fluctuation에도 conservative CC가 bandwidth를 과소추정할 수 있는지 확인한다.

## D.4 ABR 설계 관점

- [ ] ABR이 nominal bitrate만 보지 않고 실제 segment size를 활용하도록 한다.
- [ ] transport-level RTT, pacing, congestion signal을 ABR에 반영할 수 있는지 검토한다.
- [ ] QUIC qlog를 ABR 학습/진단에 활용한다.
- [ ] throughput estimation 오류와 CC/implementation 문제를 구분한다.
- [ ] learning-based ABR은 특정 server behavior에 overfit되지 않도록 다양한 QUIC 구현체에서 학습/평가한다.

## D.5 네트워크/인프라 관점

- [ ] AQM 변경만으로 streaming QoE 문제가 해결된다고 기대하지 않는다.
- [ ] ECN은 혼잡 링크에서 도움이 될 수 있지만, 구현체와 CC가 이를 제대로 활용해야 한다.
- [ ] QUIC과 TCP coexistence를 실제 traffic mix에서 검증한다.
- [ ] CDN edge에서 QUIC implementation choice가 QoE에 미치는 영향을 별도로 측정한다.
- [ ] 5G/4G trace는 평균 throughput뿐 아니라 variance와 drop pattern을 함께 본다.

## D.6 이 논문을 기반으로 추가 실험을 한다면

- [ ] 실제 browser 기반 HTTP/3 streaming player에서 재현한다.
- [ ] CDN edge 환경에서 동일 실험을 반복한다.
- [ ] 8K, 360도, volumetric video를 추가한다.
- [ ] startup delay와 live latency를 QoE에 포함한다.
- [ ] client-side QUIC implementation 차이를 분석한다.
- [ ] MoQ stack에서 같은 질문을 반복한다.
- [ ] congestion control과 ABR을 함께 최적화하는 cross-layer model을 구현한다.

---


# 최종 정리


이 논문의 핵심은 QUIC을 하나의 단일 기술로 보면 안 된다는 것이다. QUIC 표준이 같아도 구현체의 내부 구조와 혼잡 제어 세부 동작이 다르면 비디오 스트리밍 QoE는 크게 달라진다.


특히 multi-client 환경에서는 평균 throughput보다 더 중요한 문제가 드러난다. 특정 구현체는 낮은 RTT를 보이지만 다중 클라이언트 fairness가 나쁘고, 특정 구현체는 좋은 CC를 지원하지만 pacing이 없어 bursty transmission 문제가 생긴다. 반대로 MVFST와 QUINN처럼 async I/O 기반으로 connection을 효율적으로 처리하는 구현체는 높은 VMAF와 안정적인 fairness를 보였다.


따라서 QUIC 기반 스트리밍 시스템을 설계할 때는 “QUIC을 도입한다”에서 끝나면 안 된다. 구현체, CC, ABR, 콘텐츠 유형, buffer 정책, 네트워크 trace를 함께 고려해야 한다. 논문이 제안하는 방향은 transport와 application layer를 분리해서 최적화하는 기존 방식에서 벗어나, QUIC CC와 ABR이 정보를 공유하는 cross-layer design으로 나아가는 것이다.

