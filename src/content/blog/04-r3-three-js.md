---
title: "04-R3 Three.js"
description: "Three.js 학습 "
pubDate: 2026-06-29T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "38e7cf19-a364-8050-ac9c-d9f95b7266da"
---
# 04. 제품 커스터마이저 실전 워크북


이 문서는 작은 신발 제품 커스터마이저를 만든다고 가정하고 R3F 구조를 끝까지 조립한다. 목표는 예쁜 데모가 아니라 “프론트 앱에서 3D 제품 기능을 어떤 파일 구조로 만들고 설명할 수 있는가”다.


## 1. 최종 구조


```plain text
src/
  App.tsx
  index.css
  entities/
    productParts.ts
  scene/
    ProductScene.tsx
    ProductCameraRig.tsx
    ProductModel.tsx
    GltfProductModel.example.tsx
  ui/
    ColorPanel.tsx
```


흐름:


```plain text
HTML UI state
  -> Canvas props
    -> Scene composition
      -> Model mesh material
      -> Camera rig
      -> Pointer event
  -> HTML UI update
```


## 2. 제품 파트 타입과 상수


`entities/productParts.ts`


```typescript
export type ProductPart = 'upper' | 'sole' | 'lace' | 'logo'

export type ProductPartMeta = {
  label: string
  nodeName: string
  roughness: number
  metalness: number
}

export const PRODUCT_PARTS: Record<ProductPart, ProductPartMeta> = {
  upper: {
    label: 'Upper',
    nodeName: 'Shoe_Upper',
    roughness: 0.34,
    metalness: 0.08,
  },
  sole: {
    label: 'Sole',
    nodeName: 'Shoe_Sole',
    roughness: 0.72,
    metalness: 0.02,
  },
  lace: {
    label: 'Lace',
    nodeName: 'Shoe_Lace',
    roughness: 0.46,
    metalness: 0,
  },
  logo: {
    label: 'Logo',
    nodeName: 'Shoe_Logo',
    roughness: 0.18,
    metalness: 0.3,
  },
}

export const PRODUCT_COLORS = [
  '#f8fafc',
  '#111827',
  '#2563eb',
  '#f97316',
  '#22c55e',
  '#e11d48',
]

export const INITIAL_PART_COLORS: Record<ProductPart, string> = {
  upper: '#2563eb',
  sole: '#111827',
  lace: '#f8fafc',
  logo: '#f97316',
}
```


기준:


```plain text
UI label, GLB nodeName, material 수치를 한 파일에서 관리한다.
Blender에서 mesh 이름이 바뀌면 nodeName만 고친다.
```


## 3. App에서 상태 소유하기


`App.tsx`


```typescript
import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ProductScene } from './scene/ProductScene'
import { ColorPanel } from './ui/ColorPanel'
import { INITIAL_PART_COLORS, type ProductPart } from './entities/productParts'

function SceneFallback() {
  return (
    <mesh position={[0, 0.65, 0]}>
      <boxGeometry args={[1.8, 0.8, 0.8]} />
      <meshBasicMaterial wireframe color="#94a3b8" />
    </mesh>
  )
}

export default function App() {
  const [selectedPart, setSelectedPart] = useState<ProductPart>('upper')
  const [partColors, setPartColors] = useState(INITIAL_PART_COLORS)

  function changeSelectedColor(color: string) {
    setPartColors((prev) => ({
      ...prev,
      [selectedPart]: color,
    }))
  }

  return (
    <main className="app-shell">
      <section className="scene-shell" aria-label="3D product scene">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [3.6, 1.8, 5.2], fov: 38, near: 0.1, far: 80 }}
          onPointerMissed={() => setSelectedPart('upper')}
        >
          <Suspense fallback={<SceneFallback />}>
            <ProductScene
              selectedPart={selectedPart}
              partColors={partColors}
              onSelectPart={setSelectedPart}
            />
          </Suspense>
        </Canvas>
      </section>

      <ColorPanel
        selectedPart={selectedPart}
        partColors={partColors}
        onSelectPart={setSelectedPart}
        onChangeColor={changeSelectedColor}
      />
    </main>
  )
}
```


핵심:


```plain text
selectedPart와 partColors는 Canvas 밖에서 소유한다.
HTML UI와 3D mesh가 같은 state를 읽는다.
```


## 4. Canvas 크기 CSS


`index.css`


```css
.app-shell {
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  background: #eef2f7;
  color: #0f172a;
}

.scene-shell {
  min-height: 100svh;
  position: relative;
}

.scene-shell canvas {
  display: block;
}

.color-panel {
  min-height: 100svh;
  display: grid;
  align-content: center;
  gap: 20px;
  padding: 24px;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
}

@media (max-width: 820px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .scene-shell {
    min-height: 58svh;
  }

  .color-panel {
    min-height: auto;
    border-left: 0;
    border-top: 1px solid #e2e8f0;
  }
}
```


Canvas가 비어 보일 때 첫 확인은 wrapper 높이다.


## 5. Scene Root


`scene/ProductScene.tsx`


```typescript
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { ProductModel } from './ProductModel'
import { ProductCameraRig } from './ProductCameraRig'
import type { ProductPart } from '../entities/productParts'

type ProductSceneProps = {
  selectedPart: ProductPart
  partColors: Record<ProductPart, string>
  onSelectPart: (part: ProductPart) => void
}

export function ProductScene({
  selectedPart,
  partColors,
  onSelectPart,
}: ProductSceneProps) {
  return (
    <>
      <color attach="background" args={['#eef2f7']} />
      <ambientLight intensity={0.28} />
      <directionalLight castShadow position={[4, 6, 4]} intensity={2.1} />
      <Environment preset="studio" />

      <ProductCameraRig selectedPart={selectedPart} />
      <ProductModel
        selectedPart={selectedPart}
        partColors={partColors}
        onSelectPart={onSelectPart}
      />

      <ContactShadows position={[0, -0.2, 0]} opacity={0.36} scale={5} blur={2.6} far={2.5} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2.6}
        maxDistance={7}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0.35, 0]}
      />
    </>
  )
}
```


Scene Root에서는 새 state를 만들지 않는다. 장면을 조립하고 props를 내려보낸다.


## 6. 기본 geometry 제품 모델


`scene/ProductModel.tsx`


```typescript
import type { ThreeEvent } from '@react-three/fiber'
import type { ProductPart } from '../entities/productParts'
import { PRODUCT_PARTS } from '../entities/productParts'

type ProductModelProps = {
  selectedPart: ProductPart
  partColors: Record<ProductPart, string>
  onSelectPart: (part: ProductPart) => void
}

function PartMaterial({
  part,
  selected,
  color,
}: {
  part: ProductPart
  selected: boolean
  color: string
}) {
  const meta = PRODUCT_PARTS[part]

  return (
    <meshStandardMaterial
      color={color}
      roughness={meta.roughness}
      metalness={meta.metalness}
      emissive={selected ? color : '#000000'}
      emissiveIntensity={selected ? 0.18 : 0}
    />
  )
}

function PartMesh({
  part,
  selected,
  color,
  onSelectPart,
}: {
  part: ProductPart
  selected: boolean
  color: string
  onSelectPart: (part: ProductPart) => void
}) {
  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelectPart(part)
  }

  if (part === 'sole') {
    return (
      <mesh name={PRODUCT_PARTS.sole.nodeName} castShadow receiveShadow position={[0, 0.08, 0]} onClick={select}>
        <boxGeometry args={[2.35, 0.26, 0.92]} />
        <PartMaterial part={part} selected={selected} color={color} />
      </mesh>
    )
  }

  if (part === 'lace') {
    return (
      <group name={PRODUCT_PARTS.lace.nodeName}>
        {[-0.42, 0, 0.42].map((x) => (
          <mesh key={x} castShadow receiveShadow position={[x, 0.68, 0.04]} rotation={[0, 0.18, 0]} onClick={select}>
            <boxGeometry args={[0.12, 0.08, 0.78]} />
            <PartMaterial part={part} selected={selected} color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  if (part === 'logo') {
    return (
      <mesh
        name={PRODUCT_PARTS.logo.nodeName}
        castShadow
        receiveShadow
        position={[-0.86, 0.62, 0.48]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={select}
      >
        <torusGeometry args={[0.16, 0.024, 12, 48]} />
        <PartMaterial part={part} selected={selected} color={color} />
      </mesh>
    )
  }

  return (
    <mesh name={PRODUCT_PARTS.upper.nodeName} castShadow receiveShadow position={[0, 0.48, 0]} onClick={select}>
      <boxGeometry args={[2.08, 0.62, 0.82]} />
      <PartMaterial part={part} selected={selected} color={color} />
    </mesh>
  )
}

export function ProductModel({
  selectedPart,
  partColors,
  onSelectPart,
}: ProductModelProps) {
  return (
    <group position={[0, -0.2, 0]} rotation={[0, -0.18, 0]}>
      {(Object.keys(PRODUCT_PARTS) as ProductPart[]).map((part) => (
        <PartMesh
          key={part}
          part={part}
          selected={selectedPart === part}
          color={partColors[part]}
          onSelectPart={onSelectPart}
        />
      ))}
    </group>
  )
}
```


중요한 부분:


```plain text
mesh click -> event.stopPropagation -> onSelectPart(part)
selectedPart -> emissive highlight
partColors[part] -> material color
```


## 7. Camera Rig


`scene/ProductCameraRig.tsx`


```typescript
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { ProductPart } from '../entities/productParts'

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


`selectedPart`는 React state지만 camera position은 매 프레임 바뀌므로 `useFrame`에서 직접 보간한다.


## 8. HTML ColorPanel


`ui/ColorPanel.tsx`


```typescript
import { PRODUCT_COLORS, PRODUCT_PARTS, type ProductPart } from '../entities/productParts'

type ColorPanelProps = {
  selectedPart: ProductPart
  partColors: Record<ProductPart, string>
  onSelectPart: (part: ProductPart) => void
  onChangeColor: (color: string) => void
}

export function ColorPanel({
  selectedPart,
  partColors,
  onSelectPart,
  onChangeColor,
}: ColorPanelProps) {
  return (
    <aside className="color-panel">
      <div className="part-buttons" role="group" aria-label="Product parts">
        {(Object.keys(PRODUCT_PARTS) as ProductPart[]).map((part) => (
          <button
            key={part}
            type="button"
            aria-pressed={selectedPart === part}
            onClick={() => onSelectPart(part)}
          >
            {PRODUCT_PARTS[part].label}
          </button>
        ))}
      </div>

      <div className="swatches" role="group" aria-label="Part colors">
        {PRODUCT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${PRODUCT_PARTS[selectedPart].label} ${color}`}
            className={partColors[selectedPart] === color ? 'selected' : ''}
            style={{ backgroundColor: color }}
            onClick={() => onChangeColor(color)}
          />
        ))}
      </div>

      <output>{partColors[selectedPart]}</output>
    </aside>
  )
}
```


Canvas 안의 mesh 클릭만이 유일한 입력 경로가 되면 안 된다. HTML 버튼으로도 제품 파트와 색상을 조작할 수 있어야 한다.


## 9. GLB로 교체하기


`public/models/shoe.glb`를 둔 뒤 `GltfProductModel`로 바꾼다.


```typescript
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { PRODUCT_PARTS, type ProductPart } from '../entities/productParts'

type ProductGLTF = {
  nodes: Record<string, THREE.Mesh>
  materials: Record<string, THREE.Material>
}

export function GltfProductModel({
  selectedPart,
  partColors,
  onSelectPart,
}: {
  selectedPart: ProductPart
  partColors: Record<ProductPart, string>
  onSelectPart: (part: ProductPart) => void
}) {
  const gltf = useGLTF('/models/shoe.glb') as unknown as ProductGLTF

  return (
    <group dispose={null} scale={1.65} position={[0, -0.48, 0]}>
      {(Object.keys(PRODUCT_PARTS) as ProductPart[]).map((part) => {
        const meta = PRODUCT_PARTS[part]
        const node = gltf.nodes[meta.nodeName]
        if (!node) return null

        function select(event: ThreeEvent<MouseEvent>) {
          event.stopPropagation()
          onSelectPart(part)
        }

        return (
          <mesh key={part} geometry={node.geometry} castShadow receiveShadow onClick={select}>
            <meshStandardMaterial
              color={partColors[part]}
              roughness={meta.roughness}
              metalness={meta.metalness}
              emissive={selectedPart === part ? partColors[part] : '#000000'}
              emissiveIntensity={selectedPart === part ? 0.18 : 0}
            />
          </mesh>
        )
      })}
    </group>
  )
}

useGLTF.preload('/models/shoe.glb')
```


`ProductScene.tsx`에서 import만 바꾸면 된다.


```typescript
import { GltfProductModel as ProductModel } from './GltfProductModel.example'
```


## 10. DebugBoundary


화면이 비면 아래를 임시로 넣는다.


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


GLB 진단:


```typescript
useEffect(() => {
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  console.log({
    size: size.toArray(),
    center: center.toArray(),
    nodes: Object.keys(gltf.nodes),
  })
}, [gltf])
```


판단:


```plain text
wireframe도 안 보임 -> Canvas size, camera, clipping
wireframe은 보이고 GLB만 안 보임 -> path, nodeName, scale, origin
basic material은 보이고 standard가 어두움 -> light/environment
```


## 11. 완료 판정


명령:


```bash
cd examples/r3f-product-starter
npm install
npm run build

cd ../../playground
npm run qa:smoke
npm run build
npm run lint
```


설명 가능해야 하는 흐름:


```plain text
HTML part button
  -> selectedPart 변경
  -> ProductScene props 변경
  -> ProductModel material/emissive 변경
  -> ProductCameraRig camera position 변경

3D mesh click
  -> Raycaster hit
  -> event.stopPropagation()
  -> onSelectPart(part)
  -> HTML UI pressed state 변경

GLB 교체
  -> useGLTF('/models/shoe.glb')
  -> PRODUCT_PARTS[part].nodeName
  -> gltf.nodes[nodeName].geometry
  -> React-controlled material
```


## 12. 최종 자기 설명


아래 문장을 코드 없이 말로 설명할 수 있으면 프론트 개발자 기준의 R3F 제품 기능 이해는 통과다.


```plain text
React 앱에서 R3F를 쓰면 Canvas가 Three.js renderer, scene, camera 경계를 만든다.
HTML UI는 DOM으로 유지하고 선택 파트와 색상 같은 의미 있는 상태는 React state가 가진다.
Canvas 안의 mesh는 DOM 노드가 아니라 Object3D이고 클릭은 Raycaster 결과로 들어온다.
GLB 모델은 useGLTF로 불러오고 내부 mesh 이름을 앱의 도메인 파트로 매핑한다.
geometry는 형태, material은 표면 반응이며 standard material은 light와 environment가 필요하다.
카메라 연출은 selectedPart를 읽고 useFrame에서 camera.position을 보간한다.
매 프레임 움직이는 값은 React state가 아니라 ref와 useFrame에서 처리한다.
화면이 비면 Canvas 크기, camera, light/material, clipping, scale, nodeName 순서로 좁힌다.
```

