import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

const MODEL_URL = 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb';
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function ThreeHouseScene() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let mounted = true;
    let frameId = 0;
    let mixer: THREE.AnimationMixer | null = null;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    viewport.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xd9dddf, 0.035);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(5.2, 2.6, 7.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.34;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 15;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0.1, 0.78, 0.05);
    controls.update();

    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    const uniforms = sky.material.uniforms;
    uniforms.turbidity.value = 0.8;
    uniforms.rayleigh.value = 2.8;
    uniforms.mieCoefficient.value = 0.004;
    uniforms.mieDirectionalG.value = 0.72;
    uniforms.sunPosition.value.set(-0.72, 0.2, 0.58);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const skyEnvironment = pmrem.fromScene(scene).texture;
    scene.environment = skyEnvironment;

    const ambient = new THREE.HemisphereLight(0xdfe8ff, 0x43403a, 1.55);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff2d6, 3.8);
    sun.position.set(-6, 7, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 24;
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -7;
    scene.add(sun);

    const rimLight = new THREE.PointLight(0x75f7ff, 3.2, 13);
    rimLight.position.set(4.2, 2.2, -3.4);
    scene.add(rimLight);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.85, 4.35, 0.16, 96),
      new THREE.MeshStandardMaterial({
        color: 0x1f2428,
        metalness: 0.1,
        roughness: 0.78,
        envMapIntensity: 0.7
      })
    );
    platform.position.set(0.2, -0.08, 0);
    platform.receiveShadow = true;
    scene.add(platform);

    const platformGlow = new THREE.Mesh(
      new THREE.RingGeometry(3.9, 4.08, 128),
      new THREE.MeshBasicMaterial({
        color: 0x65f4c7,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    platformGlow.rotation.x = -Math.PI / 2;
    platformGlow.position.y = 0.012;
    scene.add(platformGlow);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    loader.setDRACOLoader(dracoLoader);

    setLoadState('loading');
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (!mounted) return;

        const model = gltf.scene;
        model.position.set(0.58, 0.18, -0.16);
        model.rotation.y = -0.1;
        model.scale.setScalar(0.0118);
        model.traverse((child) => {
          if ('isMesh' in child && child.isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const material = mesh.material;
            if (Array.isArray(material)) {
              material.forEach((item) => {
                if ('envMapIntensity' in item) item.envMapIntensity = 1.05;
              });
            } else if (material && 'envMapIntensity' in material) {
              material.envMapIntensity = 1.05;
            }
          }
        });
        scene.add(model);

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
        }

        setProgress(100);
        setLoadState('ready');
      },
      (event) => {
        if (!mounted || event.total <= 0) return;
        setProgress(Math.min(98, Math.round((event.loaded / event.total) * 100)));
      },
      () => {
        if (!mounted) return;
        setLoadState('error');
      }
    );

    const setRendererSize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(420, Math.floor(rect.height));
      const isNarrow = width < 560;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.set(isNarrow ? 6.4 : 5.2, isNarrow ? 3.05 : 2.6, isNarrow ? 12.2 : 7.2);
      controls.target.set(isNarrow ? 0.18 : 0.1, isNarrow ? 0.92 : 0.78, 0.05);
      camera.updateProjectionMatrix();
      controls.update();
    };

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(viewport);
    setRendererSize();

    let lastFrame = performance.now();
    const render = () => {
      const now = performance.now();
      const delta = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      mixer?.update(delta);
      platformGlow.rotation.z += delta * 0.1;
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      mounted = false;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      dracoLoader.dispose();
      skyEnvironment.dispose();
      pmrem.dispose();
      scene.traverse((object) => {
        if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        if ('material' in object) {
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const isLoading = loadState === 'idle' || loadState === 'loading';

  return (
    <div className="group relative min-h-[560px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] md:min-h-[640px]">
      <div ref={viewportRef} className="absolute inset-0" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,transparent_54%,color-mix(in_oklab,var(--bg)_82%,transparent))]" />

      <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 md:left-6 md:top-6">
        <span className="pill bg-[color-mix(in_oklab,var(--bg)_68%,transparent)] backdrop-blur-md">orbit</span>
        <span className="pill bg-[color-mix(in_oklab,var(--bg)_68%,transparent)] backdrop-blur-md">keyframes</span>
        <span className="pill bg-[color-mix(in_oklab,var(--bg)_68%,transparent)] backdrop-blur-md">sky light</span>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5 md:p-7">
        <div className="max-w-[560px]">
          <p className="eyebrow mb-2">Three.js Scene</p>
          <h2 className="m-0 text-[clamp(1.45rem,2.8vw,2.55rem)] font-bold leading-[1.03] tracking-[-0.04em]" style={{ color: 'var(--text)' }}>
            움직이는 작은 도시를 블로그 안으로.
          </h2>
          <p className="mt-3 max-w-[46ch] text-[0.88rem] leading-[1.65]" style={{ color: 'var(--text-dim)' }}>
            드래그로 시점을 돌리고 휠로 가까이 다가가 볼 수 있는 GLTF 기반 Three.js 하우스 씬입니다.
          </p>
        </div>
      </div>

      <div className="absolute right-4 top-4 hidden max-w-[280px] rounded-md border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_74%,transparent)] px-3 py-2 text-[0.68rem] leading-[1.5] backdrop-blur-md md:block" style={{ color: 'var(--text-dim)' }}>
        <span className="mono">Model</span>{' '}
        <a className="underline decoration-[var(--border-strong)] underline-offset-4" href="https://artstation.com/artwork/1AGwX" target="_blank" rel="noreferrer">
          Littlest Tokyo
        </a>{' '}
        by{' '}
        <a className="underline decoration-[var(--border-strong)] underline-offset-4" href="https://artstation.com/glenatron" target="_blank" rel="noreferrer">
          Glen Fox
        </a>
        , CC Attribution.
      </div>

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--bg)_62%,transparent)] backdrop-blur-sm">
          <div className="w-[min(280px,72vw)] rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <p className="mono mb-3">loading model · {progress}%</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full rounded-full bg-[var(--text)] transition-[width] duration-300" style={{ width: `${Math.max(8, progress)}%` }} />
            </div>
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] p-6 text-center backdrop-blur-sm">
          <div className="max-w-[360px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>모델을 불러오지 못했습니다.</p>
            <p className="mt-2 text-sm leading-[1.6]" style={{ color: 'var(--text-dim)' }}>네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
