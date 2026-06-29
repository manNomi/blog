---
title: "03-R3 Three.js"
description: "Three.js 학습 "
pubDate: 2026-06-29T00:00:00.000Z
tags: ["강의자료"]
notes: true
notionId: "38e7cf19-a364-805e-8bc6-e8118c80bb2d"
---
# 03. 에셋, 성능, 디버깅, 배포


이 문서는 Three.js/R3F를 실제 프론트 프로젝트에 붙일 때 필요한 운영 감각을 다룬다. GLB 모델, texture, shader, resource cleanup, performance, smoke test까지 하나의 배포 흐름으로 묶는다.


## 1. 모델 파일 파이프라인


웹 제품 화면에서는 OBJ/FBX보다 GLB가 다루기 쉽다.


```plain text
Blender / 3D tool
  -> origin 정리
  -> scale 적용
  -> Y-up 기준 확인
  -> mesh name 정리
  -> texture 포함 여부 확인
  -> GLB export
  -> public/models/product.glb
```


모델 준비 체크:


```plain text
origin이 제품 중심 근처인가
scale이 웹 장면 기준으로 너무 작거나 크지 않은가
axis 방향이 맞는가
mesh name이 앱 도메인으로 매핑 가능한가
texture 경로가 안정적인가
bounding box가 기대한 크기인가
```


mesh name은 UI 상태와 연결되므로 중요하다.


```typescript
type ProductPart = 'body' | 'sole' | 'laces' | 'logo'

const MODEL_PART_BY_NODE_NAME: Record<string, ProductPart> = {
  Shoe_Body: 'body',
  Shoe_Heel: 'body',
  Shoe_Sole: 'sole',
  Shoe_Lace_1: 'laces',
  Shoe_Lace_2: 'laces',
  Shoe_Logo: 'logo',
}
```


## 2. GLB 로딩


Vite 기준으로 `public/models/shoe.glb`는 런타임에서 `/models/shoe.glb`로 접근한다.


```typescript
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

type ProductGLTF = {
  nodes: Record<string, THREE.Mesh>
  materials: Record<string, THREE.Material>
}

export function ProductModel() {
  const gltf = useGLTF('/models/shoe.glb') as unknown as ProductGLTF
  const upper = gltf.nodes.Shoe_Upper

  return (
    <group dispose={null}>
      <mesh geometry={upper.geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#2563eb" />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/shoe.glb')
```


`dispose={null}`은 loader cache가 가진 리소스를 subtree unmount 때 R3F가 임의로 dispose하지 않게 하는 패턴이다.


## 3. GLB geometry와 React-controlled material


제품 커스터마이저에서는 geometry는 GLB에서 가져오고, material은 React state로 다시 선언하는 패턴이 좋다.


```typescript
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

type ProductPart = 'upper' | 'sole' | 'lace' | 'logo'

const PRODUCT_PARTS: Record<ProductPart, { label: string; nodeName: string }> = {
  upper: { label: 'Upper', nodeName: 'Shoe_Upper' },
  sole: { label: 'Sole', nodeName: 'Shoe_Sole' },
  lace: { label: 'Lace', nodeName: 'Shoe_Lace' },
  logo: { label: 'Logo', nodeName: 'Shoe_Logo' },
}

type ProductGLTF = {
  nodes: Record<string, THREE.Mesh>
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
              emissive={selectedPart === part ? partColors[part] : '#000000'}
              emissiveIntensity={selectedPart === part ? 0.18 : 0}
            />
          </mesh>
        )
      })}
    </group>
  )
}
```


바뀌는 것은 geometry 공급원뿐이다.


```plain text
boxGeometry -> gltf.nodes[nodeName].geometry
```


React state, click event, material 연결은 그대로 유지된다.


## 4. Suspense와 fallback


GLB, HDR, 큰 texture는 비동기로 도착한다. 빈 Canvas를 막기 위해 fallback을 둔다.


```typescript
import { Suspense } from 'react'

function ModelFallback() {
  return (
    <mesh position={[0, 0.65, 0]}>
      <boxGeometry args={[1.8, 0.8, 0.8]} />
      <meshBasicMaterial wireframe color="#94a3b8" />
    </mesh>
  )
}

function ProductScene() {
  return (
    <Suspense fallback={<ModelFallback />}>
      <ProductModel />
    </Suspense>
  )
}
```


DOM fallback과 3D fallback은 다르다.


```plain text
DOM fallback: Canvas/chunk가 아직 준비되지 않은 상태
3D fallback: Canvas 안에서 모델을 기다리는 상태
```


## 5. Texture


Texture는 3D 표면에 입히는 이미지 데이터다. CSS `background-image`처럼 느껴질 수 있지만 UV, wrap, repeat, filtering, material slot이 함께 작동한다.


```typescript
function createStripeTexture(color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context가 필요합니다.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = color

  for (let x = -128; x < 128; x += 24) {
    ctx.fillRect(x, 0, 12, 128)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.center.set(0.5, 0.5)
  return texture
}

function PatternMaterial({ color }: { color: string }) {
  const map = useMemo(() => createStripeTexture(color), [color])

  useEffect(() => {
    return () => {
      map.dispose()
    }
  }, [map])

  return <meshStandardMaterial color="#ffffff" map={map} roughness={0.35} />
}
```


주의:


```plain text
repeat을 쓰려면 wrapS/wrapT를 RepeatWrapping으로 설정한다.
직접 만든 texture는 cleanup에서 dispose한다.
texture 색을 그대로 보고 싶으면 material color는 흰색에 가깝게 둔다.
```


## 6. Shader와 uniform


Material prop 조합으로 부족할 때 shader를 쓴다. Shader는 GPU에서 정점과 픽셀을 계산하는 코드다.


```typescript
const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uMix;
  varying vec2 vUv;

  void main() {
    vec3 blue = vec3(0.15, 0.35, 1.0);
    vec3 orange = vec3(1.0, 0.45, 0.05);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0);
    vec3 color = mix(blue, orange, vUv.y * uMix + pulse * 0.2);
    gl_FragColor = vec4(color, 1.0);
  }
`
```


R3F에서 uniform을 갱신한다.


```typescript
function ShaderSurface({ mix }: { mix: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTime: { value: 0 },
          uMix: { value: mix },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}
```


흐름:


```plain text
React state -> uniform -> shader -> GPU pixel
```


## 7. 성능 기준


Three.js 성능은 React 성능과 다른 축을 가진다.


```plain text
draw call
Object3D count
triangle count
texture size
DPR
shadow map
postprocessing
React state와 useFrame 경계
```


같은 geometry/material을 수백 번 반복한다면 `InstancedMesh`를 고려한다.


```typescript
function InstancedBoxes() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return

    for (let index = 0; index < 100; index += 1) {
      const x = (index % 10) - 4.5
      const z = Math.floor(index / 10) - 4.5
      matrix.makeTranslation(x, 0.5, z)
      mesh.setMatrixAt(index, matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [matrix])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 100]}>
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshStandardMaterial color="#38bdf8" />
    </instancedMesh>
  )
}
```


성능 판단:


```plain text
리소스 객체 수를 줄이고 싶다 -> geometry/material 공유
draw call을 줄이고 싶다 -> InstancedMesh
픽셀 계산 비용을 줄이고 싶다 -> DPR/shadow/postprocessing 조절
React 리렌더 비용을 줄이고 싶다 -> useFrame에서 매 프레임 setState 금지
```


## 8. Resource lifecycle


직접 만든 geometry, material, texture는 GPU 리소스를 잡을 수 있다.


```typescript
function ManualResource() {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2563eb' }),
    [],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} />
}
```


기준:


```plain text
JSX로 선언한 geometry/material: 보통 R3F가 unmount 때 정리
useMemo/new THREE로 직접 만든 리소스: cleanup 고려
useGLTF loader cache: dispose={null} 패턴 고려
```


## 9. 디버깅 루틴


빈 화면을 보면 GLB 탓으로 바로 가지 않는다.


```plain text
1. Canvas wrapper 크기
2. DebugBoundary wireframe
3. Camera position/target
4. near/far clipping
5. light/material 관계
6. GLB path
7. nodeName
8. scale/origin/bounding box
```


GLB 진단 코드:


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
size가 너무 작다 -> scale 문제
center가 원점에서 멀다 -> origin/camera target 문제
nodes에 기대한 이름이 없다 -> mesh name 매핑 문제
basic material은 보인다 -> light/material 문제
wireframe도 안 보인다 -> camera/canvas/clipping 문제
```


## 10. 프론트 통합


라우트 컴포넌트는 HTML UI와 Canvas를 함께 소유한다.


```typescript
import { Suspense, lazy, useState } from 'react'

const ProductCanvas = lazy(() => import('./ProductCanvas'))

export function ProductRoute() {
  const [selectedPart, setSelectedPart] = useState<ProductPart>('upper')
  const [partColors, setPartColors] = useState(INITIAL_PART_COLORS)

  return (
    <main className="product-route">
      <section className="product-canvas-shell" aria-label="3D product preview">
        <Suspense fallback={<div role="status">Loading 3D preview</div>}>
          <ProductCanvas
            selectedPart={selectedPart}
            partColors={partColors}
            onSelectPart={setSelectedPart}
          />
        </Suspense>
      </section>

      <ColorPanel
        selectedPart={selectedPart}
        partColors={partColors}
        onSelectPart={setSelectedPart}
        onChangeColor={(color) =>
          setPartColors((prev) => ({
            ...prev,
            [selectedPart]: color,
          }))
        }
      />
    </main>
  )
}
```


SSR 프레임워크에서는 Canvas를 client-only 경계에 둔다.


```typescript
'use client'

import { Canvas } from '@react-three/fiber'

export function ProductCanvas() {
  return <Canvas>{/* scene */}</Canvas>
}
```


## 11. Smoke test


DOM 테스트만으로는 WebGL 장면이 실제로 그려졌는지 알기 어렵다. Canvas screenshot 픽셀 분포를 검사한다.


```javascript
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Product/i }).waitFor()

  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ state: 'visible' })

  const buffer = await canvas.screenshot()
  const png = PNG.sync.read(buffer)

  let colorfulPixels = 0

  for (let index = 0; index < png.data.length; index += 4) {
    const red = png.data[index]
    const green = png.data[index + 1]
    const blue = png.data[index + 2]
    const alpha = png.data[index + 3]

    if (alpha > 0 && Math.max(red, green, blue) - Math.min(red, green, blue) > 12) {
      colorfulPixels += 1
    }
  }

  assert.ok(colorfulPixels > 800, `expected nonblank canvas, got${colorfulPixels}`)
} finally {
  await browser.close()
}
```


## 12. 배포 전 점검


```plain text
npm run build
npm run lint
npm run qa:smoke
```


추가 체크:


```plain text
Canvas wrapper가 desktop/mobile에서 충분한 크기인가
GLB 경로가 public/CDN 기준으로 맞는가
Suspense fallback이 빈 화면을 막는가
HTML 버튼으로도 모든 주요 조작이 가능한가
DPR과 shadow 비용이 모바일에서 과하지 않은가
직접 만든 texture/geometry/material cleanup이 있는가
```


## 13. 이 문서 이후 읽을 것


마지막 문서는 제품 커스터마이저를 직접 구현하는 통합 예제다.


```plain text
04-product-configurator-workbook.md
```

