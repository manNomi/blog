---
title: "🗺️ 구글 지도 18개를 동시에 렌더링하려다 마주한 WebGL 지옥 탈출기"
description: "다중지도 렌더링 해결프로세스 "
pubDate: 2024-12-31T00:00:00.000Z
tags: ["DMAP"]
notionId: "2af7cf19-a364-80ed-8af5-f8bad16e275a"
---> mapId 하나 때문에 2주를 날린 이야기 - 벡터 지도부터 정적 지도까지의 여정

![image.png](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-0.png)


## 🎯 프로젝트 배경


DMAP 프로젝트에서 인스타그램 피드 같은 3×3 그리드로 가로만 3열인 지도 썸네일을 무한 스크롤로 보여주는 프로필 페이지를 만들고 있었습니다. PM이 만든 Widget이 벡터 지도였고, 화려한 3D 효과에 매료되어 그대로 사용했습니다.


처음 구글 지도를 사용하는 터라 공식 문서의 예제 코드를 그대로 따라했습니다.


```javascript
function initMap(): void {
  const map = new google.maps.Map(
    document.getElementById("map") as HTMLElement,
    {
      center: {
        lat: 37.7893719,
        lng: -122.3942,
      },
      zoom: 16,
      heading: 320,
      tilt: 47.5,
      mapId: "90f87356969d889c", // 이 한 줄이 모든 문제의 시작
    }
  );
}
```


당시엔 `mapId`가 단순히 맞춤 스타일을 적용하는 ID 정도로만 생각했습니다. 하지만 이것이 **벡터 지도**를 활성화하는 키였고, 곧 벌어질 재앙을 전혀 예상하지 못했죠.


## 🚨 문제 발생: 16개의 벽


### mapId vs mapType의 차이


처음엔 이 둘의 차이를 제대로 이해하지 못했습니다.

- **mapId**: Google Cloud 콘솔에서 생성한 사용자 정의 지도 스타일 ID (벡터 지도 활성화)
- **mapType**: 기본 지도 렌더링 방식 (roadmap, satellite, hybrid, terrain)

테마에 어울리는 멋진 지도를 원했던 저희 팀은 쉽게 접근할 수 있는 `mapId`를 선택했고, 이는 곧 벡터 지도를 불러오는 선택이었습니다.


### WebGL 컨텍스트 한계의 실체


벡터 지도는 **WebGL 컨텍스트**를 사용해서 3D 렌더링을 수행합니다. 문제는 브라우저에서 지원하는 WebGL 컨텍스트의 최대 개수가 **약 18개**로 제한된다는 점이었죠.


한 화면에 최대 18개의 지도를 동시 렌더링하는 상황에서, 16개를 넘어가는 순간...


![image-1.png](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-1.png)

> 오류로 인해 지도 요소가 죽어버린 모습 지도 요소가 정말 죽어버렸습니다. 지도 렌더링이 삭제 되었습니다.
>
> ![%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2025-07-23_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_11.48.21.png](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-2.png)
>
>

## 🔧 시행착오의 연속 - 6가지 실패한 해결책


### 1. WebGL 컨텍스트 수동 해제 시도


첫 번째 접근은 WebGL 컨텍스트를 직접 관리하는 것이었습니다.


해당 지도의 부모의 자식 canvas를 찾아서 webgl을 초기화 시키는것입니다. 


```javascript
// WebGL 컨텍스트 초기화 시도
const cleanupMap = () => {
  const canvases = document.querySelectorAll("canvas");
  canvases.forEach((canvas) => {
    const canvas = document.querySelector(`#canvas${id} canvas`);
    const context = canvas.getContext("webgl") || canvas.getContext("webgl2");
  });

  if (mapInstanceRef.current) {
    mapInstanceRef.current = null;
    const canvas = document.querySelector(`#canvas${id} canvas`);
    if (canvas) {
      const context = canvas.getContext("webgl") || canvas.getContext("webgl2");
      if (context) {
        context.getExtension("WEBGL_lose_context")?.loseContext();
      }
    }
  }
};
```


**실패 이유**: 구글 맵스가 WebGL 컨텍스트를 내부적으로 어떻게 관리하는지 알 수 없었고, 한 개의 WebGL 컨텍스트가 한 개의 지도와 1:1 대응되지 않는다는 사실을 몰랐습니다.

> WebGL 컨텍스트를 아무리 강제로 해제해도 스크롤이 계속돼 컨텍스트 수가 **16개를 초과하는 순간**, 일부 지도 인스턴스가 무작위로 사라졌습니다.
>
> ![webgl_%E1%84%8F%E1%85%A2%E1%84%89%E1%85%B1_%E1%84%8E%E1%85%A9%E1%84%80%E1%85%B5%E1%84%92%E1%85%AA_%E1%84%8B%E1%85%A9%E1%84%85%E1%85%B2%E1%84%85%E1%85%A9_%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%92%E1%85%A1%E1%86%AB_%E1%84%8B%E1%85%A7%E1%86%BC%E1%84%89%E1%85%A1%E1%86%BC.gif](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-3.gif)
>
>
> IntersectionObserver로 감시하지 않는 요소의 canvas까지 초기화했지만, 문제는 해결되지 않았습니다.
>
> ![%E1%84%92%E1%85%AA%E1%84%86%E1%85%A7%E1%86%AB_%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8_2025-01-06_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_7.52.59.gif](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-4.gif)
>
>

### 2. Key 기반 강제 리렌더링


React의 key 속성을 이용해서 스크롤할 때마다 보이는 지도만 리렌더링하는 방식을 시도했습니다.


화면에서 보이지않는 부분은 컴포넌트를 언마운트 시켰습니다.


```javascript
// 스크롤할 때마다 key 값 변경으로 리렌더링 유도
const [mapKey, setMapKey] = useState(0);

useEffect(() => {
  // 스크롤 이벤트 감지 시
  if (isVisible) {
    setMapKey(prev => prev + 1);
  }
}, [isVisible]);
```


**문제점**:

1. **과도한 API 호출**: 스크롤할 때마다 새로운 Google Maps 인스턴스 생성
2. **깜빡임 현상**: 지도가 해제되고 다시 로드되면서 화면이 번쩍임
3. **성능 저하**: 연속적인 스크롤 시 버벅거림 발생

### 3. 스켈레톤 UI + 로딩 컴포넌트


WebGL 컨텍스트가 안정화될 때까지 로딩 컴포넌트를 보여주고, 스크롤 중에는 정적 지도로 대체하는 방식을 시도했습니다.


```javascript
const [isMapLoading, setIsMapLoading] = useState(true);
const [webglContextCount, setWebglContextCount] = useState(0);

useEffect(() => {
  // WebGL 컨텍스트 개수 모니터링
  const checkWebGLContext = () => {
    const canvases = document.querySelectorAll('canvas');
    let contextCount = 0;

    canvases.forEach(canvas => {
      const context = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (context) contextCount++;
    });

    setWebglContextCount(contextCount);
    setIsMapLoading(contextCount > 16);
  };

  checkWebGLContext();
}, []);
```


이 방법은 실제로 작동했고 오류도 발생하지 않았습니다! 하지만...


![%E1%84%92%E1%85%AA%E1%84%86%E1%85%A7%E1%86%AB_%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8_2025-01-08_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_2.34.14.gif](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-5.gif)


**사용자 경험이 너무 떨어진다**는 판단으로 채택하지 않았습니다. 스크롤 플로우가 계속 끊기는 느낌이었거든요.


### 4. Canvas 캡처 방식


HTML2Canvas를 사용해서 지도를 이미지로 변환해 캐싱하는 방식도 시도했습니다.


```javascript
import html2canvas from 'html2canvas';

const captureMapAsImage = async (mapElement) => {
  try {
    const canvas = await html2canvas(mapElement);
    const imageUrl = canvas.toDataURL();
    return imageUrl;
  } catch (error) {
    console.error('Map capture failed:', error);
  }
};
```


**실패 이유**: html2canvas 자체도 WebGL 컨텍스트를 사용하기 때문에 근본적인 해결책이 되지 못했습니다.


### 5. 지도 인스턴스 재사용 (거의 성공)


3×3 배열 한 세트를 재활용하면서 좌표값만 교체하는 방식을 시도했습니다.


```javascript
const mapInstances = useRef(Array(9).fill(null));
const [currentDataSet, setCurrentDataSet] = useState([]);

const updateMapPositions = (newData) => {
  mapInstances.current.forEach((map, index) => {
    if (map && newData[index]) {
      map.setCenter(newData[index].position);
      map.setZoom(newData[index].zoom);
    }
  });
};
```


![%E1%84%92%E1%85%AA%E1%84%86%E1%85%A7%E1%86%AB_%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8_2025-01-17_%E1%84%8B%E1%85%A9%E1%84%8C%E1%85%A5%E1%86%AB_10.55.34.gif](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-6.gif)


이 방법은 꽤 효과적이었습니다! 하지만...


**치명적 결함**: 우리 기획에는 **탭이 2개**가 있었습니다.

- 탭 A: 3×3 = 9개
- 탭 B: 3×3 = 9개
- **총 18개** → 안전한 16개 한계 초과
- 애니메이션 구현이 생각보다 까다로웠습니다 
세로 열이 긴 디바이스의 경우 9개 이상을 보여줘야하고 
탭 이동시에 애니메이션도 고려해야하기 때문이었습니다

### 6. 모든 시도의 한계


결국 어떤 방법을 써도 WebGL 컨텍스트 한계를 근본적으로 해결할 수 없었습니다. 구글 맵스 내부 동작을 완전히 제어할 수 없었고, 벡터 지도를 고집하는 한 이 문제는 피할 수 없었죠.


## 💡 전환점: 비용 구조의 발견


근본적인 해결책으로 돌아갔습니다 


webgl 컨텍스트가 발생하는 문제와 벡터지도를 우리가 왜 쓰고 있는지…


문제 해결의 실마리는 **구글 맵스 API 비용 구조**를 자세히 살펴보면서 찾았습니다.



| API 타입 | 무료 한도 | 초과 비용 | 특징 |
| --- | --- | --- | --- |
| **동적 지도** | 월 28,000회 | $7/1,000호출 | 인터랙션 가능, 줌/팬 |
| **정적 지도** | 월 100,000회 | $2/1,000호출 | 이미지 형태, 조작 불가 |
| **벡터 지도** | 동적 지도와 동일 | 동적보다 3-4배 비쌈 | WebGL 기반, 3D 효과 |



프로필 페이지에서 **스크롤이 필요 없는 썸네일 용도**로 벡터 지도를 쓰고 있다는 게 말이 안 됐습니다.


그리고... 이때 무서운 일이 벌어졌습니다.


## 💸 과금 폭탄 사건


디버깅 과정에서 구글 맵스를 과도하게 호출하다가...


**$200+ 청구서**가 날아왔습니다! 😱


![%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2025-01-21_%E1%84%8B%E1%85%A9%E1%84%8C%E1%85%A5%E1%86%AB_1.52.31.png](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-7.png)


![%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2025-01-21_%E1%84%8B%E1%85%A9%E1%84%8C%E1%85%A5%E1%86%AB_3.17.15.png](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-8.png)


학생에게는 너무나도 가혹한 금액이었죠. 구글 메일을 자주 확인하지 않았던 터라 더욱 당황스러웠습니다.


다행히 구글 고객지원팀에서 상황을 이해해 주셨고, 학생 개발자라는 점을 고려해서 **2월 5일자로 원만히 해결**되었습니다.


이 사건으로 **API 비용 모니터링과 한도 설정의 중요성**을 뼈저리게 깨달았습니다.


---


## 🔄 중간해결책: 벡터 → 동적 → 정적지도로의 단계적 전환

> WebGL 한계를 피해 안전지대로 향하는 3단계 여정

## 🎯 전환 배경


6가지 시도가 모두 실패한 후, 근본적인 접근 방식의 변화가 필요하다는 것을 깨달았습니다. 벡터 지도를 고집하는 한 WebGL 컨텍스트 한계는 피할 수 없는 벽이었죠.


그래서 **단계적 다운그레이드 전략**을 선택했습니다.


## 🗺️ 1단계: 벡터 지도 → 동적 지도


### 변경 이유

- **WebGL 컨텍스트 문제 해결**: 동적 지도는 WebGL을 사용하지 않음
- **3D 효과 포기**: 화려함보다 안정성 우선 + 본래 기능에 미포함된 3D 효과가 필요 없었습니다
- **인터랙션 유지**: 줌, 팬 등 기본적인 지도 조작은 여전히 가능

### 코드 변경사항


**Before (벡터 지도)**


```javascript
const map = new google.maps.Map(mapContainer, {
  center: { lat: 37.7893719, lng: -122.3942 },
  zoom: 16,
  heading: 320,
  tilt: 47.5,
  mapId: "90f87356969d889c", // 벡터 지도 활성화 키
});
```


**After (동적 지도)**


```javascript
const map = new google.maps.Map(mapContainer, {
  center: { lat: 37.7893719, lng: -122.3942 },
  zoom: 16,
  mapType: 'roadmap', // 기본 래스터 지도
  // mapId 제거 → 벡터 지도 비활성화
});
```


### 1단계 결과


✅ **성공**: WebGL 컨텍스트 오류 완전 해결


✅ **성공**: 18개 지도 동시 렌더링 가능


⚠️ **우려**: API 호출 비용 여전히 높음 ($7/1k 호출)


⚠️ **우려**: 무한 스크롤 시 과금 폭탄 위험성


클릭시 해당위치에서 동적지도를 확대해서 조작이 가능하게끔 수정했습니다 


![%E1%84%89%E1%85%A2%E1%84%85%E1%85%A9%E1%84%8B%E1%85%AE%E1%86%AB_%E1%84%8B%E1%85%A2%E1%84%82%E1%85%B5%E1%84%86%E1%85%A6%E1%84%8B%E1%85%B5%E1%84%89%E1%85%A7%E1%86%AB.gif](/images/구글-지도-18개를-동시에-렌더링하려다-마주한-webgl-지옥-탈출기-9.gif)


## 💰 2단계: 동적 지도 → 정적 지도


### 전환 계기: 비용 구조 분석


1단계에서 WebGL 문제는 해결했지만, 새로운 문제가 보였습니다.



| 지도 타입 | 무료 한도 | 초과 시 비용 | 프로필 피드 적합성 |
| --- | --- | --- | --- |
| **벡터** | 28,000회/월 | $7/1k (+ 3-4배 추가) | ❌ WebGL 한계 |
| **동적** | 28,000회/월 | $7/1k | 🤔 과금 위험 |
| **정적** | 100,000회/월 | $2/1k | ✅ 썸네일 용도에 최적 |



### 핵심 깨달음


**"프로필 피드 썸네일에 인터랙션이 꼭 필요한가?"**


사용자가 프로필 피드에서 하는 행동:

1. 빠르게 훑어보기 (썸네일 역할)
2. 관심 있는 지도 클릭
3. **상세 보기에서만 실제 조작**

썸네일 단계에서는 줌이나 팬 기능이 오히려 **불필요한 UX 복잡성**만 증가시켰습니다.


### 코드 변경사항


**Before (동적 지도)**


```javascript
// 각 카드마다 동적 지도 인스턴스 생성
const MapCard = ({ location }) => {
  const mapRef = useRef(null);

  useEffect(() => {
    const map = new google.maps.Map(mapRef.current, {
      center: location,
      zoom: 15,
      mapType: 'roadmap'
    });
  }, [location]);

  return <div ref={mapRef} className="w-full h-40" />;
};
```


**After (정적 지도)**


```javascript
// 단순한 이미지 태그로 대체
const MapCard = ({ location }) => {
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${location.lat},${location.lng}` +
    `&zoom=15` +
    `&size=300x200` +
    `&maptype=roadmap` +
    `&key=${API_KEY}`;

  return (
    <img
      src={staticMapUrl}
      alt="Map thumbnail"
      className="w-full h-40 object-cover cursor-pointer"
      onClick={() => openDetailView(location)}
    />
  );
};
```


### 2단계 결과


✅ **성공**: 로딩 속도 대폭 개선 (이미지 로딩이 지도 렌더링보다 빠름)


✅ **성공**: 메모리 사용량 크게 감소


✅ **성공**: API 비용 거의 무료 수준 (100k/월 무료)


❌ **손실**: 썸네일에서 직접적인 지도 조작 불가


## 🔄 하이브리드 해결책: 정적 + 동적 조합


### 문제 인식


정적 지도만으로는 **사용자 경험이 아쉬웠습니다**. 지도를 자세히 보고 싶을 때 조작할 수 없다는 점이 큰 단점이었죠.


### 해결 아이디어


**"썸네일은 정적으로, 상세 보기는 동적으로"**


### 구현 전략


### 1. 전역 동적 지도 1개 준비


```javascript
// App.tsx - 애플리케이션 전체에서 단 1개만 존재
const DynamicMapProvider = () => {
  const dynamicMapRef = useRef(null);

  useEffect(() => {
    // 앱 시작 시 1번만 생성
    const mapContainer = document.getElementById('global-dynamic-map');
    dynamicMapRef.current = new google.maps.Map(mapContainer, {
      zoom: 15,
      disableDefaultUI: true
    });
  }, []);

  return (
    <>
      <div id="global-dynamic-map" className="hidden fixed inset-0 z-50" />
      {/* 나머지 앱 컴포넌트들 */}
    </>
  );
};
```


### 2. 썸네일 클릭 시 동적 지도 활성화


```javascript
const handleThumbnailClick = (location) => {
  // 1. 숨겨진 동적 지도에 위치 설정
  dynamicMapRef.current.setCenter(location);
  dynamicMapRef.current.setZoom(15);

  // 2. 모달/풀스크린으로 표시
  const dynamicMapContainer = document.getElementById('global-dynamic-map');
  dynamicMapContainer.classList.remove('hidden');

  // 3. 부드러운 애니메이션 효과
  gsap.fromTo(dynamicMapContainer,
    { opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1, duration: 0.3 }
  );
};
```

- 해당 기능에도 분명한 한계가 있었습니다.
- 썸네일을 클릭할 때마다 지도를 담고 있는 컨테이너가 한 번씩 다시 렌더링되지만, 이는 동적 지도를 계속 띄워 두었을 때 발생하는 비용보다 훨씬 적다고 판단했습니다.

### 최종 성능 비교



| 단계 | 지도 타입 | WebGL 사용 | API 호출 | 메모리 사용 | 사용자 경험 |
| --- | --- | --- | --- | --- | --- |
| **1단계** | 벡터 (18개) | ⚠️ 18개 | 💸 매우 높음 | 🔴 매우 높음 | ⚠️ 자주 깨짐 |
| **2단계** | 동적 (18개) | ✅ 0개 | 💸 높음 | 🟡 높음 | ✅ 안정적 |
| **3단계** | 정적 (18개) | ✅ 0개 | ✅ 거의 무료 | ✅ 낮음 | ⚠️ 조작 불가 |
| **최종** | 정적(18개) + 동적(1개) | ✅ 1개 | ✅ 거의 무료 | ✅ 중간 | ✅ 최적 |



## 🎓 단계별 전환에서 얻은 교훈


### 1. 점진적 개선의 힘


한 번에 완벽한 해결책을 찾으려 하지 말고, **단계적으로 문제를 분해**해서 접근하는 것이 효과적이었습니다.


### 2. 트레이드오프 인식


각 단계마다 **무엇을 얻고 무엇을 잃는지** 명확히 파악하는 것이 중요했습니다.

- 벡터 → 동적: 3D 효과 포기 vs 안정성 확보
- 동적 → 정적: 직접 조작 포기 vs 비용/성능 최적화

### 3. 사용자 관점에서 재평가


기술적 욕심(벡터 지도의 3D 효과)보다 **실제 사용 패턴**을 고려한 설계가 더 나은 결과를 만들었습니다.


### 4. 하이브리드 접근법의 유효성


**두 가지 기술의 장점만 취하는 조합**이 종종 최적해가 될 수 있다는 점을 배웠습니다.


---


_이런 단계적 접근 방식이 비슷한 문제를 겪는 다른 개발자들에게도 도움이 되길 바랍니다!_


## 🏆 최종 해결책: 하이브리드 접근법


### 핵심 아이디어


**"썸네일은 정적 지도로 가볍게, 상세 보기는 동적 지도 1개로"**


```plain text
📱 피드 화면 (정적 지도)              🗺️ 상세 보기 (동적 지도 1개)
┌─────┬─────┬─────┐                   ┌─────────────────────┐
│ IMG │ IMG │ IMG │                   │                     │
├─────┼─────┼─────┤    클릭 →          │    Interactive      │
│ IMG │ IMG │ IMG │                   │    Google Map       │
├─────┼─────┼─────┤                   │    (줌/팬 가능)      │
│ IMG │ IMG │ IMG │                   │                     │
└─────┴─────┴─────┘                   └─────────────────────┘
```


### 구현 세부사항


```javascript
export default function TrackingImageTabContainer({ displayTrackingImage }) {
  const [picked, setPicked] = useState(null);
  const { show, hide } = useMap();

  const open = (img) => {
    setPicked(img);
    show(img.lat, img.lng, img.zoom);
  };

  const close = () => {
    setPicked(null);
    hide();
  };

  return (
    <>
      {displayTrackingImage.public.map((img) => (
        <TrackingImageBox 
          key={img.idx} 
          trackingImageData={img} 
          onClick={() => open(img)} 
        />
      ))}
      
      {displayTrackingImage.private.map((img) => (
        <TrackingImageBox 
          key={img.idx} 
          trackingImageData={img} 
          onClick={() => open(img)} 
        />
      ))}

      {picked &&
        ReactDOM.createPortal(
          <STYLE.ModalOverlay onClick={close} />,
          document.body
        )}
    </>
  );
}2. 숨겨진 동적 지도 (전역 싱글톤)
```


## 📊 Before & After 비교



| 항목 | Before (벡터 18개) | After (정적 + 동적 1개) |
| --- | --- | --- |
| **WebGL 컨텍스트** | 16개 초과 시 크래시 | 항상 1개로 안정 |
| **초기 로딩 속도** | 매우 느림 (18개 벡터 지도) | 빠름 (정적 이미지) |
| **메모리 사용량** | 높음 | 낮음 |
| **API 호출 빈도** | 페이지 로드마다 18번 | 썸네일 로드 + 필요시 1번 |
| **월 예상 비용** | $50-200 위험 | 거의 무료 |
| **사용자 경험** | 깨짐, 오류 발생 | 부드러운 전환, 안정적 |
| **인터랙션** | 모든 지도에서 가능 | 선택한 지도에서만 가능 |



## 🎓 회고: 2주간의 삽질에서 얻은 교훈


### 1. 라이브러리 스펙을 제대로 파악하자


구글 맵스 문서를 자세히 읽어보니 **"페이지당 하나의 지도 사용을 권장"**한다고 명시되어 있었습니다. 처음부터 이를 알았다면 2주의 시간을 절약할 수 있었을 것입니다.


### 2. 비용은 기능 설계와 함께 고려해야 한다


아무리 멋진 기능이라도 과금 폭탄이 터지면 서비스할 수 없습니다. API 비용 구조를 미리 파악하고 예산을 고려한 설계가 필수입니다.


### 3. 커뮤니케이션의 중요성


`mapId` 값을 제거하면 문제가 해결된다는 것을 알았지만, 그 **원리(벡터 → 래스터 변환)**를 팀장에게 설득력 있게 설명하지 못했습니다. 기술적 지식뿐만 아니라 **소통 능력**도 함께 키워야 한다는 점을 깨달았습니다.


### 4. 모니터링과 알림 설정은 필수


GCP Billing 알림과 API 사용량 한도를 설정해두지 않으면 언제든 과금 폭탄을 맞을 수 있습니다.


```javascript
// 실제 운영에서 사용한 API 사용량 모니터링 코드
const monitorApiUsage = () => {
  let dailyCallCount = 0;
  const DAILY_LIMIT = 1000;

  const logApiCall = (apiType) => {
    dailyCallCount++;
    console.log(`${apiType} API 호출: ${dailyCallCount}/${DAILY_LIMIT}`);

    if (dailyCallCount > DAILY_LIMIT * 0.8) {
      console.warn('⚠️ API 사용량이 80%를 초과했습니다!');
      // 알림 로직 구현
    }
  };

  return { logApiCall };
};
```


### 5. 단계적 다운그레이드의 지혜


처음엔 가장 화려한 벡터 지도부터 시작했지만, 결국 **정적 지도 + 필요시 동적 지도**라는 실용적 해결책에 도달했습니다. 때로는 기술적 욕심을 내려놓고 **사용자 가치에 집중**하는 것이 더 나은 결과를 만들어냅니다.


---


## 🚀 마무리


“멋진 기술도 좋지만 안정적인 서비스가 우선”이라는 교훈 뒤에는,


**‘요금 vs 사용자 경험’이라는 트레이드오프를 기술적 설계로 풀어냈다**는 사실이 있습니다.


정적 지도 + 전역 1개의 동적 지도로 하이브리드 아키텍처를 구성해

- **과금 리스크는 줄이고** (정적: 무료 한도↑ / 동적: 1회만 호출)
- **경험 품질은 유지·개선**(썸네일은 빠르게, 상세는 부드럽게 조작)했습니다.

앞으로도 화려함보다 실용성, **트레이드오프를 해결하는 기술적 선택**을 우선하겠습니다.


---


### 🔗 참고 자료

- [Google Maps JavaScript API - Vector Maps](https://developers.google.com/maps/documentation/javascript/vector-map)
- [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static)
- [WebGL Context Limits](https://webglstats.com/)

_비슷한 문제로 고민하는 개발자들에게 이 글이 도움이 되길 바랍니다. 더 좋은 해결책이나 궁금한 점이 있다면 댓글로 공유해 주세요! 🙏_

