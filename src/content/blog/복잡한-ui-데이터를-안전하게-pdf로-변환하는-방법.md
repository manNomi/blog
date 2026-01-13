---
title: "복잡한 UI 데이터를 안전하게 PDF로 변환하는 방법"
pubDate: 2026-01-13T15:53:58.388Z
notionId: "2cd7cf19-a364-8028-8ea0-c734baebfa3e"
---
![1*gQJrNzm1oApK8t2asjS8rw.png](https://cdn-images-1.medium.com/max/1600/1*gQJrNzm1oApK8t2asjS8rw.png)


### 들어가며


건설 현장 문서 관리 시스템을 개발하면서 사진대지 PDF 발행 기능이 필요했습니다. 이 과정에서 구버전 PDF 라이브러리를 발견하고 마이그레이션을 진행했으며, 신규 기능 개발 중 예상치 못한 이미지 처리 문제를 해결한 경험을 공유합니다.

> 우리는 뷰어뿐 아니라, 리액트 컴포넌트를 PDF로 변환하는 기능이 필요했습니다.
> 만약 화면을 캡처하는 방식으로 PDF를 생성한다면 텍스트가 이미지 형태로 변환되어
> 텍스트 검색·복사·추출이 불가능
> 기존에는 서버에서 해당 작업을 처리했었는데 서버 사용량을 줄이는 상황이 되어서 최대한 서버의 부하를 줄이고 서버 작업 속도 상승을 위해 프론트엔드에서 해당 작업을 해주기로 결정했습니다

---


### 1. 기존 시스템 분석


### 기존 코드 조사


pdf 관련 컴포넌트가 무엇이 있는지 리스크가 무엇이 있는지 선제적으로 흐름 파악을 해야했습니다.


pdf 관련 lib은 한개로 `react-pdf-js` 이며 사용하는 컴포넌트는 `DocumentViewer` **단 1개** 였습니다!


다행히도 pdf 뷰어가 중앙화가 되어있어서 리스크가 적게 작업이 가능했습니다.


```plain text
// 발견된 코드: PDF 뷰어
import PDFViewer from 'react-pdf-js';
```


```plain text
const DocumentViewer = ({ pdfUrl }) => {
  return <PDFViewer file={pdfUrl} page={currentPage} />;
};
```


뷰어를 자세히 보기위해 코드를 자세히 본 결과 react-pdf-js가 오래된 라이브러리임을 알 수 있었습니다.


### 2. react-pdf-js 상태 조사


```plain text
Last publish: 2019년 6월 (6년 전)
GitHub: 업데이트 중단
보안 취약점: 3건
```


react-pdf-js에 pdf 제작 기능이 있다면 가져갈려고 했지만 뷰어 역할만을 해주고 있고 아래와 같은 이유로 인해 라이브러리를 교체하는것을 건의해야겠다는 판단을 했습니다.


**1) 개발 중단 & 업데이트 부재**


**2) 구버전 PDF.js 기반**


**3) 기능 한계 → PDF 뷰잉만 가능 하며** 주석·텍스트 선택·양식 지원 없는 상태


### 3. 건의하기!


이제 테크 리드에게 라이브러리 교체에 대해 설명해야 합니다.


이때는 **무엇을 얼마나 조사했고, 왜 해당 결정을 내리게 되었는지**를 명확히 전달하는 것이 중요합니다.


충분히 근거를 준비해 설득하면 대화가 훨씬 빠르고 수월하게 진행됩니다.


테크 리드도 그만큼 맥락을 이해하고 공감해 주기 때문입니다.


**Q1: “기존 뷰어 교체 리스크는 클까요?”**


```plain text
A: 매우 낮습니다.
   - 의존성: DocumentViewer 1개 컴포넌트만
   - 테스트: 컴포넌트 단위 테스트로 충분
   - 영향 범위: 제한적
```


**Q2: “react-pdf/render 러닝 커브는 어떤가요?”**


```plain text
A: 거의 없습니다.
생성 (@react-pdf/renderer):
<Document>
  <Page>
    <Text>Hello PDF!</Text>
  </Page>
</Document>
```


```plain text
→ React 컴포넌트 만들듯이 작성
```


**Q3: “왜 클라이언트에서 생성하고자 하나요?”**


```plain text
A: 개발 일정 때문입니다.
```


```plain text
서버 방식:
- 백엔드 API 개발 필요
- 현재 백엔드 팀 바쁨
- 협업 일정 조율 필요
- 예상: 2-3주
```


```plain text
클라이언트 방식:
- 프론트엔드만으로 완결
- 백엔드 일정 영향 없음
- 즉시 시작 가능
- 예상: 1주
```

> “좋습니다 라이브러리 교체하고 같이 테스트 해봅시다”

이제 신규기능 개발을 시작해야합니다.


테스트는 충분히 거쳤으니 문제가 없을것이라 판단했었습니다.


---


### 신규 기능 개발


이번 프로젝트에서 우리는 사용자가 사진을 업로드하고, 항목을 추가하며, 임시 저장까지 가능한 **인터랙티브 Word-like 에디터**를 만들었습니다. 또한, 사용자가 업로드한 이미지를 교체할 수 있는 **이미지 스왑 기능**도 요구되었습니다.


이 과정에서 직면한 핵심 과제는 **복잡한 UI 속 다양한 로직을 PDF로 안전하게 변환하는 것**이었습니다.

- **주요 기능 요구사항**
1. 사진 업로드 및 관리
2. 항목(텍스트/메모 등) 자동 조작
3. 임시 저장 기능
4. 이미지 교체(스왑) 기능
- 임시저장된 이미지와 서버이미지또한 스위칭 해서 저장이 되며 사용자가 드래그한 이미지 또한 관리
- 다양한 이미지 포맷을 대처 가능한 pdf 를 만들어야합니다.

결과적으로, 단순히 PDF를 만드는 것이 아니라, **사용자의 인터랙션과 비동기 데이터를 안전하게 PDF로 매핑하는 구조**를 설계해야 했습니다


![1*2pvgwisfC0hQBSBj3KXiGw.gif](https://cdn-images-1.medium.com/max/1600/1*2pvgwisfC0hQBSBj3KXiGw.gif)


### PDF 생성 로직


```plain text
// utils/convert.ts
import { pdf, createElement } from "@react-pdf/renderer";
```


```plain text
export const convertPdf = async (formData) => {
  const documentElement = createElement(PhotoLayoutPdfDocument, { formData });
  const pdfBlob = await pdf(documentElement).toBlob();
```


```plain text
return new File([pdfBlob], `${formData.title}.pdf`, {
    type: "application/pdf",
  });
};
```


초기에 완성후 pdf를 생성했는데 slack이 왔습니다

> “만욱님 이미지가 안보이는데요 ?”

그럴리가 없는데.. 제가 테스트 했을때는 문제가 없었었는데 API를 붙이고 내부 이미지를 통해 테스트를할때 문제가 발생했습니다.


### 이미지가 사라진 이유


테스트를 반복하며 확인한 결과,


텍스트와 레이아웃은 정상적으로 렌더링되었지만 **이미지 영역만 빈 공간으로 출력**되는 문제가 있었습니다.


특히 **서버에서 전달받은 이미지 URL**에 대해 문제가 발생했습니다


### 원인 : 타이밍 문제


결론적으로, 원인은 **네트워크 타이밍 이슈**였습니다.


```plain text
시간 →
PDF 렌더링:    [시작]──────[완료] (200ms)
이미지 다운로드: [시작]────────────[완료] (500ms)
                                     ↑
                          너무 느려서 놓침!
```


**왜 이런 일이?**


`@react-pdf/renderer`는 PDF 렌더링과 이미지 다운로드를 **동시에** 시작합니다.

- PDF 렌더링: 200ms
- 이미지 다운로드: 500–1000ms (CDN에서)

결과: 이미지가 도착하기 전에 PDF 생성이 끝나버립니다!


그러면 blob url 이미지는 문제가 없었어야 했는데 …?


blob url이 문제가 있는 이유를 찾다보니 다음과 같은 이슈를 찾았습니다.

> Blob URL(Object URL)이란
> 브라우저 메모리에 저장된 데이터를 가리키는
>
> **임시 URL**
>
>
> **URL 형태로 즉시 표시하거나 다운로드**
>
>
> 브라우저 메모리에 존재 →
>
> **네트워크 요청 없음**
>
>

이 방식은 “즉시 미리보기”에는 매우 유용하지만, **PDF 생성 과정에서는 오히려 치명적인 문제를 유발합니다.**


### react-pdf 내부 구조와의 충돌


@react-pdf/renderer의 <Image> 컴포넌트는 내부적으로 이미지 소스를 fetch()를 통해 로드합니다.


서버 이미지의 경우 fetch를 통해 이미지를 가져오지만 늦어지는경우 이미지가 로드되지 않고 pdf가 발행되는 것입니다.


blob url의 경우 **근본적인 문제는 메모리 누수입니다.**


Blob URL은 URL.createObjectURL(blob)로 생성되는데, 이 URL은 명시적으로 해제하지 않으면


**메모리에 계속 남아있는 객체 참조를 유지**합니다.


즉, PDF를 한 번 생성할 때마다 Blob 객체가 새로 생기고, 그에 대응하는 URL이 메모리에 쌓여가며


결국 **브라우저 메모리를 잠식하게 됩니다.**


---


### 근본적 해결: Blob URL을 쓰지 말자


결국 Blob URL 방식은

- 메모리 누수 위험이 크고, 생성·해제 타이밍을 제어하기 어렵다는 점에서

**PDF 렌더링용 이미지 소스로는 부적합**하다는 결론에 도달했습니다.


따라서 이 비동기 타이밍 이슈를 해결하기 위해서는 **이미지를 사전에 로드해 두는 전략**이 필요했습니다.

> “이미지를 먼저 다운로드하고, Base64 형태로 변환해서 넘기면 어떨까?”

Base64는 이미지 데이터를 문자열 형태로 인코딩해 포함하는 방식이기 때문에, PDF 생성 시점에는 이미 데이터가 온전히 준비된 상태가 됩니다.


즉, **네트워크 속도나 렌더링 타이밍과 상관없이 이미지가 반드시 표시되는 구조**가 만들어지는 것입니다.

- **이미지 다운로드 → Base64 변환 → PDF 생성**
> Base64(Data URL)이란

**이미지 바이너리 데이터를 문자열로 인코딩한 형태**입니다. 즉, data:image/jpeg;base64,…. 처럼 문자열 자체에 이미지가 **내장(inline)** 되어 있습니다.


**추가적인 네트워크 요청이 필요하지 않습니다.**


Base64는 Blob과 서버 url 대비 **CORS 회피**와 **비동기 데이터 관리** 측면에서 유리합니다. 반면 Blob URL 이 지양되는 주된 이유는 `fetch`와의 비호환성 때문이 아니라, **URL 해제가 누락되어 발생하는 심각한 메모리 누수** 때문입니다.


### Base64 변환 함수


```plain text
// utils/files/imageToBase64.ts
export const imageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      // JPEG 압축 (품질 80%)
      const dataURL = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataURL);
    };
    img.onerror = () => resolve(url); // 실패 시 원본
    img.src = url;
  });
};    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      // JPEG 압축 (품질 80%)
      const dataURL = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataURL);
    };
    img.onerror = () => resolve(url); // 실패 시 원본
    img.src = url;
  });
};
```


### 개선 후 타이밍


```plain text
이미지 1: [다운로드]──────[완료]
이미지 2:       [다운로드]──────[완료]
이미지 3:             [다운로드]──────[완료]
                                        ↓
                              모든 준비 완료!
                                        ↓
PDF 렌더링:                        [시작]──[완료]
```


```plain text
결과: 이미지가 모두 준비된 후 PDF 생성 ✅
```


---


### 최종 결과


결과 적으로 이미지가 pdf 에서 보이지 않던 버그를 수정하고 텍스트도 올바르게 만드는 등 솔루션에서 pdf를 word처럼 작성하되 이 작성이 매우 자동화 되도록 구현이 되었습니다.


### 마무리


비동기 작업은 반드시 **처리 순서와 타이밍**을 고려해야 합니다.


특히 네트워크 요청은 예측 불가능성이 높기 때문에, 중요 데이터는 **사전에 준비**해 두는 접근이 안정성을 높입니다.


불가능한 구현은 없습니다. 언제나 비슷한 문제를 가진 사람들을 찾고 이들에게 도움받으며 같이 성장하는 것이 중요할것 입니다!

> 참고자료
>
> [_https://github.com/diegomura/react-pdf/issues/1884_](https://github.com/diegomura/react-pdf/issues/1884)
>
>
> [_https://github.com/diegomura/react-pdf/issues/929_](https://github.com/diegomura/react-pdf/issues/929)
>
>
> [_https://github.com/diegomura/react-pdf/issues/2340_](https://github.com/diegomura/react-pdf/issues/2340)
>
>
> [_https://github.com/diegomura/react-pdf/issues/1252_](https://github.com/diegomura/react-pdf/issues/1252)
>
>
