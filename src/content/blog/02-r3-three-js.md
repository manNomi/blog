---
title: "02-R3 Three.js"
description: "Three.js 학습 "
pubDate: 2026-06-29T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "38e7cf19-a364-80e0-bb8f-c4434bf25e34"
---
# 02. 렌더링, Material, Light, Interaction


이 문서는 3D 물체를 “보이게 만드는 것”과 “사용자 입력에 반응하게 만드는 것”을 묶는다. Geometry, Material, Light, Camera, Controls, Raycaster를 하나의 화면 품질 흐름으로 읽는다.


## 1. Geometry와 Material


`Mesh`는 `Geometry + Material`이다.


```plain text
Geometry: 형태 데이터
Material: 표면이 빛과 색에 반응하는 방식
Mesh: Geometry와 Material을 가진 3D 오브젝트
```


```typescript
<mesh>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="#2563eb" />
</mesh>
```


같은 geometry라도 material이 바뀌면 완전히 다르게 보인다.


```typescript
function MaterialComparison() {
  return (
    <>
      <mesh position={[-1.4, 0.7, 0]}>
        <sphereGeometry args={[0.6, 48, 24]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>

      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.6, 48, 24]} />
        <meshStandardMaterial color="#f97316" roughness={0.28} metalness={0.25} />
      </mesh>

      <mesh position={[1.4, 0.7, 0]}>
        <sphereGeometry args={[0.6, 48, 24]} />
        <meshPhysicalMaterial color="#f97316" roughness={0.18} metalness={0.35} clearcoat={0.7} />
      </mesh>
    </>
  )
}
```


Material 구분:



| Material | 특징 | 쓸 때 |
| --- | --- | --- |
| `meshBasicMaterial` | 조명 없이 보인다 | 디버깅, flat style |
| `meshLambertMaterial` | 단순 diffuse | 가벼운 조명 표현 |
| `meshPhongMaterial` | shininess highlight | 고전적인 반짝임 |
| `meshStandardMaterial` | PBR 기본 | 제품 화면 기본값 |
| `meshPhysicalMaterial` | clearcoat/transmission | 더 현실적인 표면 |
| `meshNormalMaterial` | normal 방향을 색으로 표시 | geometry 방향 디버깅 |
| `meshDepthMaterial` | camera 깊이 표시 | clipping/depth 확인 |
| `meshToonMaterial` | toon shading | 스타일 표현 |
| `meshMatcapMaterial` | 조명 없이 matcap 이미지 기반 | 빠른 스타일 재질 |



## 2. Geometry 공유와 primitive


같은 geometry를 여러 mesh가 공유할 수 있다.


```typescript
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

function SharedGeometryBoxes() {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <>
      {[-1.4, 0, 1.4].map((x) => (
        <mesh key={x} geometry={geometry} position={[x, 0.7, 0]}>
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      ))}
    </>
  )
}
```


이미 만들어진 Three.js 객체를 붙일 때는 `primitive`를 쓴다.


```typescript
const helper = useMemo(() => new THREE.AxesHelper(2), [])

return <primitive object={helper} />
```


## 3. Light와 Environment


Standard/Physical material은 빛과 environment가 있어야 표면 정보가 살아난다.


```typescript
<ambientLight intensity={0.28} />
<hemisphereLight args={['#ffffff', '#64748b', 0.45]} />
<directionalLight castShadow position={[4, 6, 4]} intensity={2.1} />
<Environment preset="studio" />
```


조명의 역할:



| Light | 느낌 | 용도 |
| --- | --- | --- |
| `ambientLight` | 방향 없는 전체 밝기 | 너무 어두운 장면 방지 |
| `hemisphereLight` | 하늘/바닥색 혼합 | 자연스러운 기본광 |
| `directionalLight` | 태양 같은 방향광 | 제품 그림자 |
| `pointLight` | 전구처럼 퍼짐 | 국소 강조 |
| `spotLight` | 원뿔 조명 | 무대 조명 |
| `Environment` | 주변 반사 정보 | PBR 제품 표면 |



그림자는 세 조건이 함께 맞아야 한다.


```typescript
<Canvas shadows>
  <directionalLight castShadow position={[4, 6, 4]} intensity={2} />

  <mesh castShadow receiveShadow>
    <boxGeometry />
    <meshStandardMaterial color="#2563eb" />
  </mesh>

  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[8, 8]} />
    <shadowMaterial transparent opacity={0.22} />
  </mesh>
</Canvas>
```


체크:


```plain text
Canvas shadows
light castShadow
object castShadow
receiver receiveShadow
```


## 4. Renderer 옵션


Renderer 설정은 품질과 성능을 동시에 바꾼다.


```typescript
<Canvas
  dpr={[1, 2]}
  shadows
  gl={{ antialias: true }}
>
  <Scene />
</Canvas>
```


핵심 옵션:


```plain text
dpr: 내부 렌더 버퍼 픽셀 수
antialias: 가장자리 계단 현상 완화
shadows: shadow map 계산 활성화
toneMapping: 밝기/색을 화면에 맞게 압축
```


DPR은 비용이 제곱으로 커진다.


```plain text
CSS size: 800 x 600
DPR 1: 800 x 600 = 480,000 pixels
DPR 2: 1600 x 1200 = 1,920,000 pixels
```


모바일에서는 `dpr={[1, 1.5]}`나 `dpr={[1, 2]}`처럼 상한을 둔다.


## 5. Camera와 Controls


Perspective Camera는 원근감을 만든다.


```typescript
<Canvas camera={{ position: [4, 2.4, 6], fov: 42, near: 0.1, far: 100 }}>
  <OrbitControls target={[0, 0.7, 0]} />
</Canvas>
```


Orthographic Camera는 거리에 따른 크기 변화가 없다. 제품 정면, 에디터, 아이소메트릭 뷰에 잘 맞는다.


```typescript
import { OrthographicCamera } from '@react-three/drei'

<OrthographicCamera makeDefault position={[4, 3, 6]} zoom={80} near={0.1} far={100} />
```


OrbitControls는 카메라를 target 중심으로 움직인다.


```typescript
<OrbitControls
  makeDefault
  enablePan={false}
  minDistance={2.6}
  maxDistance={7}
  target={[0, 0.35, 0]}
/>
```


제품이 이상하게 화면 밖으로 밀리면 `camera.position`과 `OrbitControls target`을 함께 확인한다.


## 6. Dolly, Zoom, Camera Rig


Dolly는 카메라 위치가 가까워지는 움직임이다. Zoom은 projection 배율이 바뀌는 확대다.


선택된 파트에 따라 카메라가 부드럽게 이동하는 rig:


```typescript
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

type ProductPart = 'upper' | 'sole' | 'lace' | 'logo'

const lookAtTarget = new THREE.Vector3(0, 0.35, 0)

export function ProductCameraRig({ selectedPart }: { selectedPart: ProductPart }) {
  const { camera } = useThree()
  const positions = useMemo(
    () => ({
      upper: new THREE.Vector3(3.6, 1.8, 5.2),
      sole: new THREE.Vector3(3.2, 0.8, 3.4),
      lace: new THREE.Vector3(1.2, 1.15, 2.4),
      logo: new THREE.Vector3(-1.4, 1.1, 2.6),
    }),
    [],
  )

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-delta * 4)
    camera.position.lerp(positions[selectedPart], alpha)
    camera.lookAt(lookAtTarget)
  })

  return null
}
```


React state는 `selectedPart`를 갖고, `useFrame`은 camera object를 움직인다.


## 7. Animation


애니메이션은 CSS transition과 다르다. 렌더 루프 안에서 3D 객체 값을 바꾼다.


```typescript
function FloatingLogo() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    mesh.rotation.y += delta * 0.8
    mesh.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.08
  })

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[0.45, 0.12, 48, 12]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
  )
}
```


`delta`는 이전 프레임 이후 흐른 시간이다. 속도에 곱하면 프레임률이 달라도 비슷한 초당 이동량을 만든다.


## 8. Interaction과 Raycaster


R3F 이벤트는 DOM 이벤트처럼 보이지만 Raycaster 교차 결과를 기반으로 한다.


```typescript
<mesh
  name="Shoe_Upper"
  onClick={(event) => {
    event.stopPropagation()
    console.log(event.object.name)
    console.log(event.point.toArray())
    console.log(event.distance)
  }}
>
  <boxGeometry />
  <meshStandardMaterial color="#2563eb" />
</mesh>
```


이벤트에서 자주 쓰는 값:


```plain text
event.object: Raycaster가 맞춘 Object3D
event.point: 표면 hit point의 월드 좌표
event.distance: ray 시작점에서 hit point까지의 거리
```


빈 공간 클릭은 `onPointerMissed`로 처리한다.


```typescript
<Canvas onPointerMissed={() => setSelectedPart('upper')}>
  <ProductScene />
</Canvas>
```


앞 오브젝트를 눌렀는데 뒤 오브젝트도 반응하면 `event.stopPropagation()`을 확인한다.


## 9. 3D 위치에 DOM 붙이기


제품 라벨, 툴팁, CTA는 DOM으로 만드는 편이 접근성과 스타일링에 유리하다. Drei `Html`은 DOM 요소를 3D 월드 좌표에 붙인다.


```typescript
import { Html } from '@react-three/drei'

function ProductHotspot({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <>
      <mesh position={[0.8, 1.1, 0.4]} onClick={onSelect}>
        <sphereGeometry args={[0.06, 24, 12]} />
        <meshBasicMaterial color={selected ? '#f97316' : '#2563eb'} />
      </mesh>

      <Html position={[0.8, 1.25, 0.4]} center transform occlude>
        <button type="button" onClick={onSelect}>
          Upper
        </button>
      </Html>
    </>
  )
}
```


주의:


```plain text
Html 안쪽은 DOM 이벤트를 받는다.
3D marker는 Raycaster 이벤트를 받는다.
둘은 React state로 합친다.
```


## 10. 화면이 이상할 때 확인 순서


```plain text
1. Canvas 부모 높이가 있는가
2. mesh가 Scene 안에 있는가
3. Camera가 mesh를 보고 있는가
4. near/far clipping에 걸리지 않았는가
5. material이 light를 필요로 하는데 light가 없는가
6. scale이 너무 작거나 큰가
7. Raycaster 이벤트 전파가 의도와 맞는가
```


기본 디버그 장치:


```typescript
function DebugBoundary() {
  return (
    <>
      <gridHelper args={[10, 10]} />
      <axesHelper args={[2]} />
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial wireframe color="#e11d48" />
      </mesh>
    </>
  )
}
```


## 11. 이 문서 이후 읽을 것


다음 문서는 모델 파일, texture, shader, 성능, 배포 검증을 다룬다.


```plain text
03-assets-performance-debug-production.md
```

