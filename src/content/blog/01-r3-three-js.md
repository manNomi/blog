---
title: "01-R3 Three.js"
description: "Three.js 학습 "
pubDate: 2026-06-29T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "38e7cf19-a364-807e-9e70-e325a66ba5f7"
---
# 01. 프론트 개발자를 위한 Three.js/R3F 기초


이 문서는 DOM과 React에 익숙한 프론트엔드 개발자가 Three.js와 React Three Fiber를 읽기 위한 첫 번째 문서다. 핵심은 “HTML 요소를 배치한다”에서 “3D 객체를 Scene Graph에 배치한다”로 사고를 바꾸는 것이다.


## 1. 화면을 그리는 네 가지 방식


웹에서 화면을 그리는 방식은 크게 DOM, SVG, Canvas 2D, WebGL로 나눌 수 있다.



| 방식 | 화면에 남는 것 | 잘 맞는 일 | 클릭 처리 |
| --- | --- | --- | --- |
| DOM | HTML 노드 | 문서, 폼, 버튼, 접근성 UI | 브라우저가 대상 노드를 안다 |
| SVG | 벡터 도형 노드 | 아이콘, 2D 차트, 다이어그램 | 각 도형이 이벤트를 받는다 |
| Canvas 2D | 픽셀 결과 | 드로잉, 단순 게임, 빠른 2D 렌더링 | 개발자가 좌표 판정을 만든다 |
| WebGL | GPU가 그린 픽셀 | 3D 모델, shader, 대량 렌더링 | Raycaster 같은 계산이 필요하다 |



프론트엔드에서 Three.js를 처음 볼 때 가장 중요한 문장은 이것이다.


```plain text
Canvas 안의 mesh는 DOM 노드가 아니다.
```


`div`, `button`, `svg circle`은 브라우저가 개별 노드로 알고 있다. 하지만 WebGL로 그린 박스나 신발 모델은 화면에 픽셀로만 남는다. 어떤 3D 오브젝트를 클릭했는지는 Raycaster가 계산한다.


## 2. 프론트 용어를 Three.js 용어로 번역하기



| 프론트 감각 | Three.js/R3F 감각 |
| --- | --- |
| React root | `Canvas` |
| DOM tree | Scene Graph |
| HTML element | `Object3D`, `Mesh`, `Light`, `Camera` |
| wrapper div | `group` |
| CSS layout | `position`, `rotation`, `scale` |
| CSS style | `Material` |
| image/background | `Texture` |
| model asset | GLB/GLTF |
| click target | Raycaster hit |
| requestAnimationFrame | render loop, `useFrame` |
| React state | HTML UI와 Canvas가 공유하는 앱 상태 |



R3F JSX는 DOM을 만드는 JSX처럼 보이지만, 실제 결과물은 Three.js 객체다.


```typescript
<mesh position={[0, 0.7, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="#2563eb" />
</mesh>
```


이 코드는 `div`를 만드는 것이 아니라 `THREE.Mesh`, `THREE.BoxGeometry`, `THREE.MeshStandardMaterial`을 Scene Graph에 붙인다.


## 3. 프로젝트 세팅


Vite + React + TypeScript 프로젝트에서 시작한다.


```bash
npm create vite@latest r3f-study -- --template react-ts
cd r3f-study
npm install three @react-three/fiber @react-three/drei
npm run dev
```


기본 구조는 이렇게 읽는다.


```plain text
src/main.tsx
  -> src/App.tsx
    -> Canvas
      -> Scene component
        -> mesh / light / camera controls
```


`main.tsx`는 React 앱을 DOM root에 붙인다.


```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```


`App.tsx` 안에서 `Canvas`가 Three.js 세계의 진입점이 된다.


```typescript
import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <main className="app">
      <Canvas camera={{ position: [3, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={1.8} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      </Canvas>
    </main>
  )
}
```


## 4. Canvas, Scene, Camera, Renderer


Three.js의 최소 구조는 네 가지다.


```plain text
Scene: 3D 객체가 들어가는 세계
Camera: 그 세계를 바라보는 시점
Renderer: Scene + Camera를 Canvas 픽셀로 그리는 엔진
Mesh: Geometry + Material을 가진 3D 물체
```


Vanilla Three.js로 쓰면 관계가 노골적으로 보인다.


```typescript
import * as THREE from 'three'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(4, 3, 6)

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: '#2563eb' })
const mesh = new THREE.Mesh(geometry, material)

scene.add(mesh)
renderer.render(scene, camera)
```


R3F에서는 같은 구조가 JSX가 된다.


```typescript
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function RotatingBox() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.8
  })

  return (
    <mesh ref={meshRef} castShadow position={[0, 0.7, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#2563eb" />
    </mesh>
  )
}

export function BasicScene() {
  return (
    <Canvas shadows camera={{ position: [4, 3, 6], fov: 45, near: 0.1, far: 100 }}>
      <ambientLight intensity={0.35} />
      <directionalLight castShadow position={[4, 7, 4]} intensity={1.7} />
      <RotatingBox />
      <OrbitControls target={[0, 0.7, 0]} />
    </Canvas>
  )
}
```


`Canvas`는 WebGLRenderer, 기본 Scene, 기본 Camera, resize 처리, render loop, R3F reconciler를 연결한다.


## 5. Object3D와 Scene Graph


`Scene`, `Group`, `Mesh`, `Camera`, `Light`는 모두 `Object3D` 계열이다. 그래서 `position`, `rotation`, `scale`을 갖고 부모-자식 관계를 가진다.


```typescript
<group name="Product" position={[0, 0, 0]} rotation={[0, -0.2, 0]}>
  <mesh name="Upper" position={[0, 0.55, 0]}>
    <boxGeometry args={[2, 0.6, 0.8]} />
    <meshStandardMaterial color="#2563eb" />
  </mesh>

  <mesh name="Sole" position={[0, 0.15, 0]}>
    <boxGeometry args={[2.3, 0.25, 0.9]} />
    <meshStandardMaterial color="#111827" />
  </mesh>
</group>
```


`Upper`와 `Sole`의 `position`은 부모 `Product` group 기준 local 좌표다. 부모 group을 회전시키면 자식들의 local position은 그대로지만 world position은 바뀐다.


월드 좌표를 확인할 때는 `getWorldPosition`을 쓴다.


```typescript
function WorldPositionLogger() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const world = new THREE.Vector3()
    mesh.getWorldPosition(world)
    console.log('local', mesh.position.toArray())
    console.log('world', world.toArray())
  })

  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh ref={meshRef} position={[1.5, 0.7, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  )
}
```


## 6. 좌표, 라디안, Vector3


Three.js는 3D 좌표계를 쓴다.


```plain text
x: 좌우
y: 위아래
z: 앞뒤
```


회전값은 degree가 아니라 radian이다.


```typescript
<mesh rotation={[0, Math.PI / 2, 0]} />
```


`Vector3`는 mutable object다. 단순 대입은 복사가 아니다.


```typescript
const a = new THREE.Vector3(1, 2, 3)
const b = a
b.x = 10

console.log(a.x) // 10
```


복사본이 필요하면 `clone()`을 쓴다.


```typescript
const copied = a.clone()
```


카메라 턴테이블이나 원형 배치는 `sin`/`cos`로 만든다.


```typescript
const angle = Math.PI / 4
const radius = 3

const x = Math.sin(angle) * radius
const z = Math.cos(angle) * radius
```


부드러운 이동은 `lerp`와 delta 기반 damping으로 만든다.


```typescript
useFrame((_, delta) => {
  const alpha = 1 - Math.exp(-delta * 4)
  mesh.position.lerp(targetPosition, alpha)
})
```


## 7. React state와 useFrame의 경계


React state가 맞는 값:


```plain text
selectedPart
partColors
openPanel
loading/error state
사용자가 선택한 모드
```


`ref + useFrame`이 맞는 값:


```plain text
rotation.y
camera.position
shader uTime
hover 효과의 미세한 scale animation
매 프레임 보간 값
```


피해야 하는 코드:


```typescript
function BadRotation() {
  const [rotationY, setRotationY] = useState(0)

  useFrame(() => {
    setRotationY((value) => value + 0.01)
  })

  return <mesh rotation={[0, rotationY, 0]} />
}
```


권장 코드:


```typescript
function GoodRotation() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.8
  })

  return <mesh ref={meshRef} />
}
```


핵심 문장:


```plain text
React state는 의미 있는 앱 상태를 가진다.
useFrame은 매 프레임 바뀌는 Three.js 객체 값을 다룬다.
```


## 8. 이 문서 이후 읽을 것


다음 문서는 렌더링 품질과 사용자 입력을 다룬다.


```plain text
02-rendering-material-light-interaction.md
```

