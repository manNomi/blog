---
title: "alias로 번들 사이즈 조금이라두 챙겨보기 "
pubDate: 2025-12-31T00:00:00.000Z
notionId: "32f7cf19-a364-80c5-96e6-d2a8822ff9f5"
---> 💡 `lodash`를 `lodash-es`로 바꾸는 것만으로 번들 사이즈를 **non-gzip 기준 90kb** 줄일 수 있었어요. 이 글에서는 그 과정에서 겪은 시행착오와 실질적인 적용 방법을 공유해요.

---


## 배경: lodash, 왜 문제인가


프론트엔드 프로젝트에서 `lodash`는 거의 글로벌 전세계 올림픽같은 유틸리티 라이브러리예요. 하지만 번들 분석기를 돌려보면, **lodash가 차지하는 비중이 생각보다 크다**는 걸 알 수 있어요.


핵심 원인은 **Tree Shaking이 제대로 동작하지 않기 때문**이에요.


```javascript
// ❌ CJS 모듈 — 전체 lodash가 번들에 포함됨
import _ from 'lodash';
const result = _.get(obj, 'a.b.c');
```


`lodash`는 CommonJS(CJS) 모듈 형태로 배포되기 때문에, Webpack이나 Vite 같은 번들러가 사용하지 않는 함수를 제거(Tree Shaking)하기 어려워요. 결과적으로 `_.get` 하나만 써도 **lodash 전체가 번들에 포함**될 수 있어요.


---


## 해결 방법: lodash → lodash-es Alias


가장 간단하면서도 효과적인 방법은 **번들러의 alias 설정**을 활용하는 거예요.


### Vite


```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      lodash: 'lodash-es',
    },
  },
});
```


### Webpack


```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      lodash: 'lodash-es',
    },
  },
};
```


> ✅ 이 한 줄의 설정만으로, 프로젝트 전체에서 `import _ from 'lodash'` 또는 `import { get } from 'lodash'` 구문이 자동으로 **ESM 버전인** **`lodash-es`****로 치환**돼요. 기존 코드를 하나도 수정하지 않아도 돼요.


### 왜 lodash-es인가?


`lodash-es`는 lodash의 **ESModule 버전**이에요. ESM은 모듈 간 의존성이 정적으로 분석 가능하기 때문에, 번들러가 사용하지 않는 함수를 정확히 걸러낼 수 있어요.


| **항목**       | **lodash (CJS)** | **lodash-es (ESM)** |
| ------------ | ---------------- | ------------------- |
| 모듈 시스템       | CommonJS         | ES Modules          |
| Tree Shaking | ❌ 제한적            | ✅ 완전 지원             |
| 번들 사이즈 영향    | 전체 포함 가능성 높음     | 사용한 함수만 포함          |
| API 호환성      | 동일               | 동일                  |


---


## 결과: 90kb 감량


alias 설정 적용 후 번들 분석기로 비교해 본 결과, **non-gzip 기준 약 90kb**가 줄어든 것을 확인했어요.


> 📊 **Before:** lodash 전체가 번들에 포함 → 불필요한 함수들까지 모두 적재  
> **After:** lodash-es alias 적용 → 실제 사용하는 함수만 번들에 포함, **약 90kb 감소**


---


## es-toolkit은 안 되나요?


처음에는 Toss에서 만든 **es-toolkit**으로의 전면 교체도 검토했어요. es-toolkit은 lodash 대비 번들 사이즈가 훨씬 작고, TypeScript 네이티브 지원, 더 나은 성능 등 장점이 많아요.


하지만 실제 적용 과정에서 **빌드 실패** 문제가 발생했어요.


> ⚠️ es-toolkit의 `compact` 함수가 기존 lodash의 `compact`와 동작이 다르거나 호환되지 않아 빌드가 깨졌어요. 비슷한 케이스가 formik 프로젝트에서도 보고된 바 있어요.  
> → [formik/issues/2602](https://github.com/jaredpalmer/formik/issues/2602)


대체 라이브러리로의 마이그레이션은 **함수 단위의 호환성 검증**이 필수적이며, 당장은 lodash-es alias가 가장 안전하고 효과적인 선택이었어요.


---


## 주의할 점


### 1. lodash/fp 모듈 호환성


`lodash/fp`를 사용하는 경우, 단순 alias만으로는 호환이 되지 않을 수 있어요. FP 모듈은 별도의 빌드 구조를 가지고 있기 때문에, alias 적용 전에 FP 사용 여부를 확인하세요.


### 2. 서드파티 라이브러리의 lodash 의존성


프로젝트 코드뿐 아니라 **node_modules 내 서드파티 라이브러리**가 lodash를 직접 의존하는 경우, alias가 해당 라이브러리에도 적용돼요. 대부분 문제없이 동작하지만, 간혹 CJS 전용 기능에 의존하는 라이브러리에서 문제가 발생할 수 있으므로 빌드 후 **E2E 테스트 또는 QA**를 거치는 것이 좋아요.


### 3. lodash-es 버전 관리


`lodash-es`는 lodash와 동일한 메인테이너가 관리하며 API가 동일해요. 다만, lodash 생태계 전체가 최근 수년간 업데이트가 뜸한 상태이므로 장기적으로는 대체 라이브러리(es-toolkit, radashi 등)로의 점진적 전환도 고려해볼 만해요.


---


## 마무리


번들 최적화는 거창한 리팩토링 없이도 **설정 한 줄**로 큰 효과를 낼 수 있어요.


`lodash`를 쓰고 있다면, 번들 분석기를 한 번 돌려보세요. 생각보다 많은 공간을 차지하고 있을 거예요. 그리고 `resolve.alias` 한 줄이면 그 문제를 바로 해결할 수 있어요.

> _작은 설정 하나가 사용자 경험을 바꿔요._ 
