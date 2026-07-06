import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { portfolioProfile, portfolioProjects, resumeExperiences, resumeFeatureProject } from '../data/portfolio';

type HotspotId = 'iphone' | 'macbook' | 'notebook' | 'desk';
type PhoneAppId = 'career' | 'projects' | 'demos';

type DemoApp = {
  id: string;
  title: string;
  caption: string;
  src: string;
  href: string;
};

const HOTSPOTS: Record<HotspotId, { label: string; detail: string; tone: string }> = {
  iphone: {
    label: 'iPhone',
    detail: '경력과 프로젝트를 앱처럼 탐색합니다.',
    tone: '#7dd3fc'
  },
  macbook: {
    label: 'Desktop',
    detail: '데스크톱 화면에서 포트폴리오를 탐색합니다.',
    tone: '#c4b5fd'
  },
  notebook: {
    label: 'Notebook',
    detail: '블로그와 문제 해결 기록을 모아 봅니다.',
    tone: '#facc15'
  },
  desk: {
    label: 'Desk',
    detail: '핵심 역량과 작업 방식을 요약합니다.',
    tone: '#86efac'
  }
};

const PRIMARY_HOTSPOT: HotspotId = 'macbook';
const INTERACTIVE_HOTSPOTS: HotspotId[] = [PRIMARY_HOTSPOT];
const isInteractiveHotspot = (id: HotspotId) => id === PRIMARY_HOTSPOT;

const FOCUS_CAMERA: Record<HotspotId | 'idle', { position: THREE.Vector3; target: THREE.Vector3 }> = {
  idle: {
    position: new THREE.Vector3(-0.78, 2.55, 4.7),
    target: new THREE.Vector3(-0.78, 1.28, -0.82)
  },
  iphone: {
    position: new THREE.Vector3(2.3, 2.05, 2.6),
    target: new THREE.Vector3(0.92, 1.38, -0.52)
  },
  macbook: {
    position: new THREE.Vector3(-0.78, 2.04, 2.75),
    target: new THREE.Vector3(-0.78, 1.72, -1.04)
  },
  notebook: {
    position: new THREE.Vector3(2.85, 2.05, 2.5),
    target: new THREE.Vector3(1.78, 1.2, -0.42)
  },
  desk: {
    position: new THREE.Vector3(0.4, 2.7, 4.4),
    target: new THREE.Vector3(0, 1.05, -0.58)
  }
};

const demoApps: DemoApp[] = [
  {
    id: 'football',
    title: 'FootballSquare',
    caption: '매치 생성, 브래킷, floating chat mock',
    src: '/demos/football-square-demo.html',
    href: '/about/football-square'
  },
  {
    id: 'bus',
    title: 'BusLive',
    caption: '실시간 위치, 정류장 채팅, 도착 예측 mock',
    src: '/demos/bus-live-demo.html',
    href: '/about/incheon-bus'
  },
  {
    id: 'dmap',
    title: 'DMap',
    caption: '지도 썸네일, 동적 지도 전환 mock',
    src: '/demos/portfolio-dmap-demo.html',
    href: '/about/dmap-map-grid'
  }
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const createCanvasTexture = (draw: (ctx: CanvasRenderingContext2D, size: number) => void) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const makeScreenTexture = (type: 'phone' | 'macbook') =>
  createCanvasTexture((ctx, size) => {
    if (type === 'macbook') {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#09090b');
      gradient.addColorStop(0.58, '#121316');
      gradient.addColorStop(1, '#1f2937');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.font = '800 30px sans-serif';
      ctx.fillText('한만욱', 36, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.font = '700 15px monospace';
      ctx.fillText('frontend', 126, 46);

      const nav = ['글', '소개', '3D소개', '태그'];
      ctx.font = '700 15px sans-serif';
      nav.forEach((item, index) => {
        ctx.fillStyle = index === 1 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.52)';
        ctx.fillText(item, 310 + index * 46, 46);
      });

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 70);
      ctx.lineTo(size - 30, 70);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.font = '700 13px monospace';
      ctx.fillText('PRODUCT FRONTEND', 38, 116);

      const headline = ['대규모 제품의 UX 결함과', '성능 병목을 끝까지 추적하는', '프론트엔드 개발자.'];
      ctx.font = '800 34px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      headline.forEach((line, index) => ctx.fillText(line, 38, 160 + index * 43));

      ctx.font = '500 17px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.58)';
      ctx.fillText('Android WebView · LCP · i18n Automation · Open Source', 40, 304);

      const cards = [
        ['15%p', 'Android UX'],
        ['50%', 'LCP 개선'],
        ['13K+', 'i18Nexus'],
        ['91.2%', 'Solid LCP']
      ];
      cards.forEach(([value, label], index) => {
        const x = 38 + (index % 2) * 222;
        const y = 338 + Math.floor(index / 2) * 74;
        ctx.fillStyle = 'rgba(255,255,255,0.075)';
        roundRect(ctx, x, y, 196, 54, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.11)';
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '800 23px sans-serif';
        ctx.fillText(value, x + 16, y + 32);
        ctx.fillStyle = 'rgba(255,255,255,0.54)';
        ctx.font = '700 13px sans-serif';
        ctx.fillText(label, x + 84, y + 32);
      });

      const shine = ctx.createRadialGradient(330, 180, 10, 330, 180, 240);
      shine.addColorStop(0, 'rgba(125,211,252,0.24)');
      shine.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = 'rgba(125,211,252,0.34)';
      ctx.lineWidth = 3;
      roundRect(ctx, 24, 24, size - 48, size - 48, 26);
      ctx.stroke();

      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#075985');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px sans-serif';
    ctx.fillText('Resume', 44, 78);
    ctx.font = '500 22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText(portfolioProfile.role, 46, 116);

    const colors = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#f87171'];
    for (let index = 0; index < 6; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 48 + col * 138;
      const y = 168 + row * 126;
      ctx.fillStyle = colors[index];
      roundRect(ctx, x, y, 86, 86, 22);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(['EX', 'PR', 'DX', 'OS', '3D', 'AI'][index], x + 26, y + 53);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 4;
    roundRect(ctx, 30, 28, size - 60, size - 56, 38);
    ctx.stroke();
  });

const makeNotebookTexture = () =>
  createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#f8f4df';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#d6cda8';
    ctx.lineWidth = 3;
    for (let y = 74; y < size; y += 44) {
      ctx.beginPath();
      ctx.moveTo(34, y);
      ctx.lineTo(size - 34, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#334155';
    ctx.font = '700 34px sans-serif';
    ctx.fillText('Debug Notes', 44, 56);
    ctx.font = '500 22px sans-serif';
    ctx.fillText('LCP 50%', 56, 134);
    ctx.fillText('Android Back Stack', 56, 180);
    ctx.fillText('i18n AST Automation', 56, 226);
    ctx.fillText('WebGL Map Grid', 56, 272);
  });

const makeClockTexture = () =>
  createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#0b0f14';
    roundRect(ctx, 28, 156, size - 56, 200, 34);
    ctx.fill();
    ctx.shadowColor = '#a7f3ff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#dffbff';
    ctx.font = '800 104px monospace';
    ctx.fillText('22:50', 72, 288);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 8;
    roundRect(ctx, 28, 156, size - 56, 200, 34);
    ctx.stroke();
  });

const createBox = (
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
};

const createRoundedBox = (
  width: number,
  height: number,
  depth: number,
  radius: number,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  segments = 4
) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
};

const createCylinder = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  radialSegments = 32
) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
};

export default function ThreeHouseScene() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotId | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotId | null>(null);
  const [activePhoneApp, setActivePhoneApp] = useState<PhoneAppId>('career');
  const [activeDemo, setActiveDemo] = useState<DemoApp>(demoApps[0]);
  const selectedRef = useRef<HotspotId | null>(null);
  const hoveredRef = useRef<HotspotId | null>(null);
  const sceneSelectRef = useRef<((hotspot: HotspotId | null) => void) | null>(null);

  const featuredProjects = useMemo(
    () => portfolioProjects.filter((project) => ['i18nexus', 'solid-connection', 'football-square', 'incheon-bus', 'dmap-map-grid'].includes(project.slug)),
    []
  );

  useEffect(() => {
    selectedRef.current = selectedHotspot;
  }, [selectedHotspot]);

  useEffect(() => {
    hoveredRef.current = hoveredHotspot;
  }, [hoveredHotspot]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frameId = 0;
    let disposed = false;
    const clickableMeshes: THREE.Mesh[] = [];
    const hotspotMaterials = new Map<HotspotId, THREE.MeshStandardMaterial[]>();
    const pointer = new THREE.Vector2(10, 10);
    const raycaster = new THREE.Raycaster();
    const occlusionRaycaster = new THREE.Raycaster();
    const occlusionDirection = new THREE.Vector3();
    const desiredCamera = {
      position: FOCUS_CAMERA.idle.position.clone(),
      target: FOCUS_CAMERA.idle.target.clone()
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.width = '100%';
    viewport.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.inset = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRenderer.domElement.style.height = '100%';
    cssRenderer.domElement.style.overflow = 'hidden';
    cssRenderer.domElement.style.width = '100%';
    viewport.appendChild(cssRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0f);
    scene.fog = new THREE.Fog(0x090a0f, 5.6, 13.2);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.copy(FOCUS_CAMERA.idle.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 8.6;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.copy(FOCUS_CAMERA.idle.target);
    controls.update();

    const addHotspotMesh = (id: HotspotId, mesh: THREE.Mesh) => {
      if (!isInteractiveHotspot(id)) return;
      mesh.userData.hotspot = id;
      clickableMeshes.push(mesh);
      const material = mesh.material;
      const materials = Array.isArray(material) ? material : [material];
      const standardMaterials = materials.filter((item): item is THREE.MeshStandardMaterial => item instanceof THREE.MeshStandardMaterial);
      hotspotMaterials.set(id, [...(hotspotMaterials.get(id) ?? []), ...standardMaterials]);
    };

    const makeMaterial = (color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.74,
        metalness: 0.05,
        ...options
      });

    const wallMaterial = makeMaterial(0x2b2a31, { roughness: 0.9 });
    const floorMaterial = makeMaterial(0x201a18, { roughness: 0.86 });
    const woodMaterial = makeMaterial(0x6a472f, { roughness: 0.7 });
    const darkMaterial = makeMaterial(0x17191f, { roughness: 0.44, metalness: 0.25 });
    const metalMaterial = makeMaterial(0x6b7280, { roughness: 0.42, metalness: 0.55 });
    const paperMaterial = makeMaterial(0xc9b98e, { roughness: 0.95 });
    const greenMaterial = makeMaterial(0x47633f, { roughness: 0.88 });
    const windowFrameMaterial = makeMaterial(0x8c6948, { roughness: 0.7 });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x7da9bd,
      roughness: 0.18,
      metalness: 0.02,
      transparent: true,
      opacity: 0.24
    });
    const blackMaterial = makeMaterial(0x08090d, { roughness: 0.56, metalness: 0.12 });
    const linenMaterial = makeMaterial(0xd8d4ca, { roughness: 0.96 });
    const cabinetMaterial = makeMaterial(0x2a2c33, { roughness: 0.82 });
    const softGrayMaterial = makeMaterial(0x8d8d93, { roughness: 0.98 });
    const warmFabricMaterial = makeMaterial(0xbeb4a4, { roughness: 0.98 });
    const room = new THREE.Group();
    scene.add(room);

    room.add(createBox(7.8, 0.12, 5.2, floorMaterial, [0, -0.06, 0]));
    room.add(createBox(7.8, 3.15, 0.12, wallMaterial, [0, 1.5, -2.62]));
    room.add(createBox(0.12, 3.15, 5.2, wallMaterial, [-3.9, 1.5, 0]));
    room.add(createBox(7.4, 0.035, 2.1, makeMaterial(0x2a211d, { roughness: 0.9 }), [0.1, 0.015, 1.15]));
    room.add(createBox(2.4, 0.025, 1.42, makeMaterial(0x090b10, { roughness: 0.88 }), [0.4, 0.03, 0.55]));

    const addWindow = (centerX: number, centerY: number, width: number, height: number) => {
      const pane = createBox(width, height, 0.026, glassMaterial, [centerX, centerY, -2.535]);
      pane.castShadow = false;
      room.add(pane);
      room.add(createRoundedBox(width + 0.14, 0.075, 0.055, 0.018, windowFrameMaterial, [centerX, centerY + height / 2 + 0.04, -2.505]));
      room.add(createRoundedBox(width + 0.14, 0.075, 0.055, 0.018, windowFrameMaterial, [centerX, centerY - height / 2 - 0.04, -2.505]));
      room.add(createRoundedBox(0.075, height + 0.16, 0.055, 0.018, windowFrameMaterial, [centerX - width / 2 - 0.04, centerY, -2.505]));
      room.add(createRoundedBox(0.075, height + 0.16, 0.055, 0.018, windowFrameMaterial, [centerX + width / 2 + 0.04, centerY, -2.505]));
      room.add(createRoundedBox(0.04, height, 0.05, 0.014, windowFrameMaterial, [centerX, centerY, -2.498]));
    };

    addWindow(1.1, 1.7, 1.18, 1.58);
    addWindow(2.72, 1.7, 1.02, 1.58);

    const hangingRail = createCylinder(0.023, 0.023, 1.7, metalMaterial, [1.85, 2.7, -2.45], [0, 0, Math.PI / 2], 18);
    room.add(hangingRail);
    const clothesColors = [0x1e293b, 0x3f2e24, 0x27272a, 0x334155, 0x14537a] as const;
    clothesColors.forEach((color, index) => {
      room.add(createRoundedBox(0.24, 0.62, 0.08, 0.04, makeMaterial(color, { roughness: 0.9 }), [1.25 + index * 0.28, 2.36, -2.38]));
    });

    const bed = new THREE.Group();
    bed.position.set(-2.35, 0.18, 0.88);
    room.add(bed);
    bed.add(createRoundedBox(1.62, 0.24, 2.08, 0.08, blackMaterial, [0, 0.2, 0.12]));
    bed.add(createRoundedBox(1.5, 0.18, 1.86, 0.08, makeMaterial(0x515158, { roughness: 0.9 }), [0, 0.42, 0.12]));
    bed.add(createRoundedBox(1.38, 0.15, 1.16, 0.1, linenMaterial, [0, 0.56, 0.38], [0.02, 0, 0]));
    bed.add(createRoundedBox(0.62, 0.13, 0.34, 0.09, makeMaterial(0xf1eee6, { roughness: 0.97 }), [-0.38, 0.62, -0.62], [0.02, -0.08, 0.04]));
    bed.add(createRoundedBox(0.62, 0.13, 0.34, 0.09, makeMaterial(0xf1eee6, { roughness: 0.97 }), [0.36, 0.62, -0.62], [0.02, 0.06, -0.03]));
    bed.add(createRoundedBox(0.86, 0.18, 0.44, 0.12, softGrayMaterial, [0.08, 0.74, -0.2], [0, 0.06, 0.01]));
    bed.add(createRoundedBox(1.22, 0.11, 0.78, 0.09, warmFabricMaterial, [0, 0.68, 0.54], [0.05, 0, 0]));
    bed.add(createCylinder(0.045, 0.045, 1.34, makeMaterial(0xd7d0c6, { roughness: 0.98 }), [0, 0.75, -0.1], [0, 0, Math.PI / 2], 24));
    bed.add(createRoundedBox(1.7, 0.78, 0.12, 0.06, blackMaterial, [0, 0.62, -0.94]));

    const sideDrawer = new THREE.Group();
    sideDrawer.position.set(-1.2, 0.15, -0.75);
    room.add(sideDrawer);
    sideDrawer.add(createRoundedBox(0.44, 0.88, 0.54, 0.04, cabinetMaterial, [0, 0.43, 0]));
    for (let index = 0; index < 3; index += 1) {
      sideDrawer.add(createRoundedBox(0.3, 0.024, 0.035, 0.012, metalMaterial, [0, 0.22 + index * 0.22, 0.29]));
    }

    const bedsideLamp = new THREE.Group();
    bedsideLamp.position.set(-1.2, 1.02, -0.74);
    room.add(bedsideLamp);
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe2a6, transparent: true, opacity: 0.96 })
    );
    lampBulb.position.set(0.22, 0.1, 0);
    bedsideLamp.add(lampBulb);
    const lampHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xffc879, transparent: true, opacity: 0.18, depthWrite: false })
    );
    lampHalo.position.copy(lampBulb.position);
    bedsideLamp.add(lampHalo);
    bedsideLamp.add(createCylinder(0.16, 0.2, 0.1, makeMaterial(0x4b3322, { roughness: 0.65 }), [0.22, -0.09, 0], [0, 0, 0], 32));
    const bedsideGlow = new THREE.PointLight(0xffd08a, 5.8, 3.7);
    bedsideGlow.position.set(-0.98, 1.22, -0.72);
    bedsideGlow.castShadow = true;
    bedsideGlow.shadow.mapSize.set(512, 512);
    scene.add(bedsideGlow);

    const wallShelf = new THREE.Group();
    wallShelf.position.set(-2.55, 2.3, -2.46);
    room.add(wallShelf);
    wallShelf.add(createRoundedBox(1.1, 0.07, 0.28, 0.025, makeMaterial(0xd8d3ca, { roughness: 0.78 }), [0, 0, 0]));
    for (let index = 0; index < 5; index += 1) {
      wallShelf.add(createRoundedBox(0.09, 0.34, 0.18, 0.02, makeMaterial([0x334155, 0x1f2937, 0x64748b, 0x374151, 0x475569][index] ?? 0x334155), [-0.38 + index * 0.13, 0.23, 0.02]));
    }

    const digitalClock = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.24),
      new THREE.MeshBasicMaterial({ map: makeClockTexture(), toneMapped: false, transparent: true })
    );
    digitalClock.position.set(-1.8, 1.78, -2.49);
    room.add(digitalClock);

    const wallStand = new THREE.Group();
    wallStand.position.set(2.6, 2.3, -2.46);
    room.add(wallStand);
    wallStand.add(createCylinder(0.026, 0.026, 0.72, blackMaterial, [0, 0, 0], [0, 0, Math.PI / 2 - 0.28], 18));
    wallStand.add(createCylinder(0.024, 0.024, 0.54, blackMaterial, [0.3, -0.26, 0], [0, 0, 0], 18));
    const wallShade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 28), makeMaterial(0xe5e7eb, { roughness: 0.55 }));
    wallShade.position.set(-0.42, -0.12, 0);
    wallShade.rotation.set(Math.PI * 0.72, 0, -0.28);
    wallShade.castShadow = true;
    wallStand.add(wallShade);
    const wallLight = new THREE.SpotLight(0xfff1cc, 7.2, 6.8, Math.PI * 0.28, 0.62, 1.0);
    wallLight.position.set(2.18, 2.18, -2.2);
    wallLight.target.position.set(1.0, 1.05, -0.55);
    wallLight.castShadow = true;
    wallLight.shadow.mapSize.set(768, 768);
    scene.add(wallLight);
    scene.add(wallLight.target);

    const shelfDivider = new THREE.Group();
    shelfDivider.position.set(2.95, 0.1, 0.62);
    room.add(shelfDivider);
    [-0.36, 0.36].forEach((x) => shelfDivider.add(createCylinder(0.028, 0.028, 1.55, blackMaterial, [x, 0.82, 0], [0, 0, 0], 18)));
    for (let index = 0; index < 4; index += 1) {
      shelfDivider.add(createRoundedBox(0.86, 0.045, 0.54, 0.025, makeMaterial(0x34363d, { roughness: 0.76 }), [0, 0.24 + index * 0.38, 0]));
    }

    const bigRug = createRoundedBox(2.75, 0.032, 2.05, 0.08, makeMaterial(0x414148, { roughness: 0.96 }), [-0.95, 0.055, 0.92]);
    room.add(bigRug);
    for (let index = 0; index < 12; index += 1) {
      room.add(createRoundedBox(2.55, 0.008, 0.018, 0.006, makeMaterial(index % 2 === 0 ? 0x5a5a62 : 0x303036, { roughness: 0.9 }), [-0.95, 0.075, 0.02 + index * 0.15]));
    }

    const curtainMaterial = makeMaterial(0x5f7080, { roughness: 0.94 });
    for (let index = 0; index < 7; index += 1) {
      room.add(createCylinder(0.042, 0.042, 1.88, curtainMaterial, [3.38 + Math.sin(index) * 0.02, 1.54, -2.3 + index * 0.04], [0, 0, 0], 18));
    }

    const cork = createRoundedBox(1.85, 1.02, 0.07, 0.045, makeMaterial(0x68472d, { roughness: 0.84 }), [1.78, 1.92, -2.55]);
    room.add(cork);
    const noteColors = [0xfff0b3, 0xc7d2fe, 0xfbcfe8, 0xbbf7d0, 0xfed7aa] as const;
    for (let index = 0; index < 5; index += 1) {
      const note = createRoundedBox(0.34, 0.2, 0.025, 0.012, makeMaterial(noteColors[index] ?? noteColors[0]), [
        1.15 + (index % 3) * 0.43,
        1.72 + Math.floor(index / 3) * 0.28,
        -2.5
      ]);
      room.add(note);
    }

    const shelf = createRoundedBox(1.8, 0.1, 0.42, 0.035, woodMaterial, [-1.92, 2.22, -2.38]);
    room.add(shelf);
    const bookColors = [0x334155, 0x475569, 0x94a3b8] as const;
    for (let index = 0; index < 6; index += 1) {
      room.add(
        createRoundedBox(0.12, 0.48 + (index % 2) * 0.08, 0.28, 0.018, makeMaterial(bookColors[index % bookColors.length] ?? bookColors[0]), [
          -2.62 + index * 0.18,
          2.52,
          -2.38
        ])
      );
    }

    const deskGroup = new THREE.Group();
    deskGroup.name = 'desk hotspot';
    room.add(deskGroup);
    const tabletop = createRoundedBox(4.25, 0.18, 1.45, 0.08, woodMaterial, [0, 1.02, -0.7]);
    const frontPanel = createRoundedBox(4.1, 0.32, 0.08, 0.035, makeMaterial(0x3b2718), [0, 0.78, 0.01]);
    addHotspotMesh('desk', tabletop);
    addHotspotMesh('desk', frontPanel);
    deskGroup.add(tabletop, frontPanel);
    [
      [-1.85, 0.46, -1.25],
      [1.85, 0.46, -1.25],
      [-1.85, 0.46, -0.13],
      [1.85, 0.46, -0.13]
    ].forEach((position) => deskGroup.add(createCylinder(0.085, 0.085, 1.0, woodMaterial, position as [number, number, number], [0, 0, 0], 24)));

    const macbook = new THREE.Group();
    macbook.name = 'macbook hotspot';
    macbook.position.set(-0.78, 1.16, -0.78);
    deskGroup.add(macbook);
    const macBase = createRoundedBox(1.62, 0.06, 1.04, 0.055, metalMaterial, [0, 0, 0.2], [-0.05, 0, 0]);
    const trackpad = createRoundedBox(0.42, 0.012, 0.32, 0.025, makeMaterial(0xdce2e8, { metalness: 0.35 }), [0, 0.04, 0.42], [-0.05, 0, 0]);
    const screenHitMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
    const macScreenHitArea = createRoundedBox(2.05, 1.16, 0.062, 0.065, screenHitMaterial, [0, 0.7, -0.34], [-0.18, 0, 0]);
    macScreenHitArea.castShadow = false;
    macScreenHitArea.receiveShadow = false;
    const macScreenFrame = new THREE.Group();
    macScreenFrame.position.set(0, 0.7, -0.34);
    macScreenFrame.rotation.x = -0.18;
    macScreenFrame.add(createRoundedBox(2.08, 0.13, 0.076, 0.045, darkMaterial, [0, 0.54, 0]));
    macScreenFrame.add(createRoundedBox(2.08, 0.13, 0.076, 0.045, darkMaterial, [0, -0.54, 0]));
    macScreenFrame.add(createRoundedBox(0.13, 1.16, 0.076, 0.045, darkMaterial, [-0.98, 0, 0]));
    macScreenFrame.add(createRoundedBox(0.13, 1.16, 0.076, 0.045, darkMaterial, [0.98, 0, 0]));
    const screenTexture = makeScreenTexture('macbook');
    const macScreenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.84, 0.94),
      new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false, transparent: true, opacity: 0.035 })
    );
    macScreenPlane.position.set(0, 0.72, -0.304);
    macScreenPlane.rotation.x = -0.18;
    const monitorElement = document.createElement('div');
    Object.assign(monitorElement.style, {
      width: '920px',
      height: '470px',
      overflow: 'hidden',
      borderRadius: '22px',
      background: '#05070a',
      border: '1px solid rgba(148, 163, 184, 0.28)',
      filter: 'brightness(1.12) contrast(1.06) saturate(1.04)',
      boxShadow: '0 0 34px rgba(125, 211, 252, 0.24), inset 0 0 28px rgba(255, 255, 255, 0.06)',
      pointerEvents: 'none',
      transition: 'opacity 160ms ease',
      userSelect: 'none'
    });
    const monitorIframe = document.createElement('iframe');
    monitorIframe.src = '/';
    monitorIframe.title = '한만욱 포트폴리오 실제 홈 화면';
    monitorIframe.loading = 'eager';
    monitorIframe.referrerPolicy = 'same-origin';
    Object.assign(monitorIframe.style, {
      width: '100%',
      height: '100%',
      border: '0',
      display: 'block',
      background: '#08090d',
      pointerEvents: 'inherit'
    });
    monitorElement.appendChild(monitorIframe);
    const monitorObject = new CSS3DObject(monitorElement);
    monitorObject.position.set(0, 0.72, -0.3);
    monitorObject.rotation.x = -0.18;
    monitorObject.scale.setScalar(0.002);
    addHotspotMesh('macbook', macBase);
    addHotspotMesh('macbook', macScreenHitArea);
    macbook.add(macBase, trackpad, macScreenHitArea, macScreenFrame, macScreenPlane, monitorObject);
    const monitorGlow = new THREE.PointLight(0x77ddff, 3.8, 3.4);
    monitorGlow.position.set(-0.78, 1.92, -0.32);
    scene.add(monitorGlow);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        macbook.add(createRoundedBox(0.105, 0.01, 0.045, 0.012, darkMaterial, [-0.48 + col * 0.14, 0.048, 0.03 + row * 0.105], [-0.05, 0, 0]));
      }
    }

    const iphone = new THREE.Group();
    iphone.name = 'iphone hotspot';
    iphone.position.set(0.95, 1.32, -0.5);
    iphone.rotation.set(-0.06, -0.24, 0.03);
    deskGroup.add(iphone);
    const phoneBody = createRoundedBox(0.48, 0.86, 0.055, 0.055, darkMaterial, [0, 0.14, 0]);
    const phoneScreenTexture = makeScreenTexture('phone');
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.39, 0.68),
      new THREE.MeshBasicMaterial({ map: phoneScreenTexture, toneMapped: false })
    );
    phoneScreen.position.set(0, 0.15, 0.031);
    const phoneStand = createRoundedBox(0.62, 0.05, 0.26, 0.035, metalMaterial, [0, -0.32, -0.08]);
    const phoneStem = createCylinder(0.04, 0.04, 0.36, metalMaterial, [0, -0.16, -0.08], [0, 0, 0], 20);
    addHotspotMesh('iphone', phoneBody);
    addHotspotMesh('iphone', phoneStand);
    iphone.add(phoneBody, phoneScreen, phoneStand, phoneStem);

    const notebook = new THREE.Group();
    notebook.name = 'notebook hotspot';
    notebook.position.set(1.74, 1.12, -0.55);
    notebook.rotation.y = -0.2;
    deskGroup.add(notebook);
    const notebookBase = createRoundedBox(0.92, 0.055, 0.68, 0.035, paperMaterial, [0, 0.03, 0]);
    const notebookCover = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.56),
      new THREE.MeshBasicMaterial({ map: makeNotebookTexture(), toneMapped: false })
    );
    notebookCover.rotation.x = -Math.PI / 2;
    notebookCover.position.set(0, 0.064, 0);
    addHotspotMesh('notebook', notebookBase);
    notebook.add(notebookBase, notebookCover);

    const mug = new THREE.Group();
    mug.position.set(-1.75, 1.18, -0.42);
    deskGroup.add(mug);
    const mugBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.32, 32),
      makeMaterial(0x9ca3af, { roughness: 0.62 })
    );
    mugBody.castShadow = true;
    mugBody.receiveShadow = true;
    mug.add(mugBody);
    const mugHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 10, 24, Math.PI * 1.25),
      makeMaterial(0x9ca3af, { roughness: 0.62 })
    );
    mugHandle.position.set(0.17, 0.01, 0);
    mugHandle.rotation.y = Math.PI / 2;
    mug.add(mugHandle);

    const plant = new THREE.Group();
    plant.position.set(-3.0, 0.25, -1.9);
    room.add(plant);
    plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.35, 24), makeMaterial(0xa16207)));
    for (let index = 0; index < 8; index += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), greenMaterial);
      leaf.position.set(Math.cos(index) * 0.22, 0.28 + (index % 3) * 0.08, Math.sin(index * 1.6) * 0.18);
      leaf.scale.set(1.2, 0.55, 0.82);
      plant.add(leaf);
    }

    const lamp = new THREE.Group();
    lamp.position.set(2.42, 1.16, -1.0);
    deskGroup.add(lamp);
    lamp.add(createCylinder(0.045, 0.045, 0.78, darkMaterial, [0, 0.27, 0], [0, 0, 0], 24));
    lamp.add(createCylinder(0.2, 0.24, 0.08, blackMaterial, [0, -0.14, 0], [0, 0, 0], 32));
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.3, 40),
      makeMaterial(0xffeed8, { roughness: 0.5, emissive: 0xffb765, emissiveIntensity: 0.22 })
    );
    shade.position.set(0, 0.78, 0);
    shade.rotation.x = Math.PI;
    shade.castShadow = true;
    lamp.add(shade);
    const deskBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.98 })
    );
    deskBulb.position.set(0, 0.66, 0);
    lamp.add(deskBulb);
    const deskHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xffad5f, transparent: true, opacity: 0.15, depthWrite: false })
    );
    deskHalo.position.copy(deskBulb.position);
    lamp.add(deskHalo);
    const lampLight = new THREE.PointLight(0xffbd76, 12.4, 5.8);
    lampLight.position.set(2.42, 1.88, -1.0);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.set(768, 768);
    scene.add(lampLight);
    const lightPool = new THREE.Mesh(
      new THREE.CircleGeometry(0.82, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb86b, transparent: true, opacity: 0.16, depthWrite: false })
    );
    lightPool.position.set(2.03, 1.122, -0.72);
    lightPool.rotation.x = -Math.PI / 2;
    deskGroup.add(lightPool);

    const hotspotDots = new Map<HotspotId, THREE.Mesh>();
    const dotGeometry = new THREE.SphereGeometry(0.06, 24, 12);
    const dotPositions: Array<[HotspotId, [number, number, number]]> = [
      ['macbook', [-1.46, 1.32, -0.18]]
    ];
    dotPositions.forEach(([id, position]) => {
      const dot = new THREE.Mesh(
        dotGeometry,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(HOTSPOTS[id].tone),
          transparent: true,
          opacity: 0.72
        })
      );
      dot.position.set(...position);
      dot.userData.hotspot = id;
      clickableMeshes.push(dot);
      hotspotDots.set(id, dot);
      scene.add(dot);
    });

    const hemisphere = new THREE.HemisphereLight(0x758299, 0x1a120e, 0.92);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xbfd4ff, 1.05);
    sun.position.set(-3.2, 5.5, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 15;
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    scene.add(sun);
    const fill = new THREE.PointLight(0x6f8cf5, 1.55, 8);
    fill.position.set(2.5, 2.4, 2.6);
    scene.add(fill);
    const warmBounce = new THREE.PointLight(0xffc88a, 1.35, 5.8);
    warmBounce.position.set(-1.15, 1.6, 0.18);
    scene.add(warmBounce);

    const monitorSamples = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-360, 160, 0),
      new THREE.Vector3(360, 160, 0),
      new THREE.Vector3(-360, -160, 0),
      new THREE.Vector3(360, -160, 0)
    ];

    const isDescendantOf = (object: THREE.Object3D, parent: THREE.Object3D) => {
      let current: THREE.Object3D | null = object;
      while (current) {
        if (current === parent) return true;
        current = current.parent;
      }

      return false;
    };

    const isOccludingObject = (object: THREE.Object3D) => {
      if (!(object instanceof THREE.Mesh)) return false;
      if (isDescendantOf(object, macbook)) return false;

      const material = object.material;
      const materials = Array.isArray(material) ? material : [material];

      return materials.some((item) => !(item.transparent && item.opacity <= 0.05));
    };

    const getMonitorOcclusionRatio = () => {
      const blockedCount = monitorSamples.reduce((count, sample) => {
        const worldPoint = monitorObject.localToWorld(sample.clone());
        const distance = camera.position.distanceTo(worldPoint);
        occlusionDirection.subVectors(worldPoint, camera.position).normalize();
        occlusionRaycaster.set(camera.position, occlusionDirection);
        occlusionRaycaster.far = Math.max(0.1, distance - 0.06);
        const isBlocked = occlusionRaycaster.intersectObjects(room.children, true).some((entry) => isOccludingObject(entry.object));

        return count + (isBlocked ? 1 : 0);
      }, 0);

      return blockedCount / monitorSamples.length;
    };

    const setRendererSize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(520, Math.floor(rect.height));
      const isNarrow = width < 720;
      renderer.setSize(width, height, false);
      cssRenderer.setSize(width, height);
      camera.aspect = width / height;
      if (selectedRef.current == null) {
        const idle = isNarrow
          ? { position: new THREE.Vector3(-0.78, 3.0, 6.4), target: new THREE.Vector3(-0.78, 1.22, -0.78) }
          : FOCUS_CAMERA.idle;
        camera.position.copy(idle.position);
        controls.target.copy(idle.target);
        desiredCamera.position.copy(idle.position);
        desiredCamera.target.copy(idle.target);
      }
      camera.updateProjectionMatrix();
      controls.update();
    };

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(viewport);
    setRendererSize();

    const syncMonitorTheme = () => {
      try {
        const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        const monitorDocument = monitorIframe.contentDocument;
        if (!monitorDocument) return;
        monitorDocument.documentElement.dataset.theme = theme;
        monitorDocument.documentElement.classList.toggle('dark', theme === 'dark');
      } catch {
        // Same-origin iframe is expected here; ignore browser edge cases without breaking the 3D room.
      }
    };
    monitorIframe.addEventListener('load', syncMonitorTheme);
    window.addEventListener('themechange', syncMonitorTheme);

    const selectHotspot = (hotspot: HotspotId | null) => {
      if (hotspot && !isInteractiveHotspot(hotspot)) return;
      selectedRef.current = hotspot;
      const focus = FOCUS_CAMERA[hotspot ?? 'idle'];
      desiredCamera.position.copy(focus.position);
      desiredCamera.target.copy(focus.target);
      setSelectedHotspot(hotspot);
    };
    sceneSelectRef.current = selectHotspot;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getHotspotFromPointer = () => {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes, false);
      const item = intersects.find((entry) => entry.object.userData.hotspot);
      const hotspot = item?.object.userData.hotspot as HotspotId | undefined;

      return hotspot && isInteractiveHotspot(hotspot) ? hotspot : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event);
      const nextHotspot = getHotspotFromPointer();
      if (nextHotspot !== hoveredRef.current) {
        hoveredRef.current = nextHotspot;
        setHoveredHotspot(nextHotspot);
      }
      renderer.domElement.style.cursor = nextHotspot ? 'pointer' : 'grab';
    };

    const handlePointerLeave = () => {
      hoveredRef.current = null;
      setHoveredHotspot(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const handlePointerDown = () => {
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerUp = (event: PointerEvent) => {
      updatePointer(event);
      const nextHotspot = getHotspotFromPointer();
      renderer.domElement.style.cursor = nextHotspot ? 'pointer' : 'grab';
      if (nextHotspot) selectHotspot(nextHotspot);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let previousFrame = performance.now();
    let elapsedTime = 0;
    const render = () => {
      const now = performance.now();
      const delta = Math.min((now - previousFrame) / 1000, 0.05);
      previousFrame = now;
      elapsedTime += delta;
      const selected = selectedRef.current;
      const hovered = hoveredRef.current;
      const cameraLerp = clamp01(delta * 2.8);
      const targetLerp = clamp01(delta * 3.2);

      if (selected) {
        camera.position.lerp(desiredCamera.position, cameraLerp);
        controls.target.lerp(desiredCamera.target, targetLerp);
      }

      hotspotMaterials.forEach((materials, id) => {
        const active = selected === id;
        const hover = hovered === id;
        materials.forEach((material) => {
          material.emissive.set(active || hover ? HOTSPOTS[id].tone : '#000000');
          material.emissiveIntensity = active ? 0.18 : hover ? 0.1 : 0;
        });
      });

      hotspotDots.forEach((dot, id) => {
        const material = dot.material as THREE.MeshBasicMaterial;
        const active = selected === id;
        const hover = hovered === id;
        material.opacity = active ? 0.95 : hover ? 0.82 : 0.58;
        dot.scale.setScalar(active ? 1.45 : hover ? 1.22 : 1 + Math.sin(elapsedTime * 2.2 + id.length) * 0.04);
      });
      const monitorOcclusionRatio = getMonitorOcclusionRatio();
      const monitorIsHidden = monitorOcclusionRatio >= 0.6;
      monitorElement.style.opacity = monitorIsHidden ? '0' : String(1 - monitorOcclusionRatio * 0.42);
      monitorElement.style.pointerEvents = selected === 'macbook' && !monitorIsHidden ? 'auto' : 'none';

      controls.update();
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
      if (!disposed) frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      resizeObserver.disconnect();
      monitorIframe.removeEventListener('load', syncMonitorTheme);
      window.removeEventListener('themechange', syncMonitorTheme);
      sceneSelectRef.current = null;
      controls.dispose();
      scene.traverse((object) => {
        if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        if ('material' in object) {
          const material = object.material as THREE.Material | THREE.Material[];
          const disposeMaterial = (item: THREE.Material) => {
            Object.values(item).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            item.dispose();
          };
          if (Array.isArray(material)) {
            material.forEach(disposeMaterial);
          } else {
            disposeMaterial(material);
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      cssRenderer.domElement.remove();
    };
  }, []);

  const selectHotspotFromUi = (hotspot: HotspotId) => {
    sceneSelectRef.current?.(hotspot);
  };

  return (
    <div className="relative min-h-[680px] overflow-hidden rounded-[30px] border border-white/10 bg-[#07080c] shadow-[var(--shadow)] md:min-h-[720px]">
      <div ref={viewportRef} className="absolute inset-0" aria-label="3D 포트폴리오 방" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_34%_26%,rgba(125,211,252,0.14),transparent_25%),radial-gradient(circle_at_72%_38%,rgba(255,184,107,0.22),transparent_25%),linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.44)_100%)]" />

      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 md:left-6 md:top-6">
        {INTERACTIVE_HOTSPOTS.map((hotspot) => (
          <button
            key={hotspot}
            type="button"
            className="pill bg-[color-mix(in_oklab,var(--bg)_68%,transparent)] backdrop-blur-md"
            data-active={selectedHotspot === hotspot ? 'true' : undefined}
            onClick={() => selectHotspotFromUi(hotspot)}
          >
            {HOTSPOTS[hotspot].label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 hidden rounded-md border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] px-3 py-2 text-[0.72rem] backdrop-blur-md md:block" style={{ color: 'var(--text-dim)' }}>
        <span className="mono">
          {hoveredHotspot
            ? HOTSPOTS[hoveredHotspot].detail
            : selectedHotspot
              ? '실제 포트폴리오 화면을 클릭해 탐색할 수 있습니다.'
              : 'Desktop 화면을 클릭해 3D 소개를 엽니다.'}
        </span>
      </div>

      {selectedHotspot && (
        <aside className="absolute bottom-4 right-4 top-auto z-10 w-[min(420px,calc(100%-2rem))] rounded-[28px] border border-white/10 bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] p-2 shadow-[var(--shadow)] backdrop-blur-xl md:bottom-6 md:right-6 md:top-6 md:w-[420px] md:p-3">
          <div className="mb-2 flex justify-end px-1">
            <button type="button" className="pill h-8" onClick={() => sceneSelectRef.current?.(null)}>
              닫기
            </button>
          </div>

          {selectedHotspot === 'iphone' && (
            <PhoneResumeApp
              activeApp={activePhoneApp}
              setActiveApp={setActivePhoneApp}
              activeDemo={activeDemo}
              setActiveDemo={setActiveDemo}
              featuredProjects={featuredProjects}
            />
          )}

          {selectedHotspot === 'macbook' && <MacbookPanel projects={featuredProjects} />}
          {selectedHotspot === 'notebook' && <NotebookPanel />}
          {selectedHotspot === 'desk' && <DeskPanel />}
        </aside>
      )}
    </div>
  );
}

function PhoneResumeApp({
  activeApp,
  setActiveApp,
  activeDemo,
  setActiveDemo,
  featuredProjects
}: {
  activeApp: PhoneAppId;
  setActiveApp: (app: PhoneAppId) => void;
  activeDemo: DemoApp;
  setActiveDemo: (demo: DemoApp) => void;
  featuredProjects: typeof portfolioProjects;
}) {
  return (
    <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-[34px] border-[10px] border-[#15171b] bg-[#0b0d10] shadow-2xl">
      <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-[#15171b]" />
      <div className="m-3 overflow-hidden rounded-[24px] bg-[#f5f5f0] text-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <div className="text-[0.62rem] uppercase tracking-[0.16em] text-zinc-500">resume os</div>
            <strong className="text-sm">{portfolioProfile.name}</strong>
          </div>
          <span className="rounded-full bg-zinc-950 px-2 py-1 text-[0.62rem] text-white">FE</span>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { id: 'career', label: '경력', mark: 'EX' },
            { id: 'projects', label: '프로젝트', mark: 'PR' },
            { id: 'demos', label: '데모', mark: 'DM' }
          ].map((app) => (
            <button
              key={app.id}
              type="button"
              className={`rounded-[18px] border p-2 text-left transition ${activeApp === app.id ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-800'}`}
              onClick={() => setActiveApp(app.id as PhoneAppId)}
            >
              <span className="mb-2 grid h-9 w-9 place-items-center rounded-[12px] bg-sky-100 text-[0.68rem] font-bold text-sky-900">{app.mark}</span>
              <span className="block text-[0.72rem] font-semibold">{app.label}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-auto border-t border-zinc-200 bg-white p-3">
          {activeApp === 'career' && (
            <div className="space-y-2">
              {resumeExperiences.map((experience) => (
                <a key={experience.slug} href={`/about/${experience.slug}`} className="block rounded-[16px] border border-zinc-200 p-3 transition hover:border-zinc-400">
                  <div className="text-[0.68rem] text-zinc-500">{experience.period}</div>
                  <strong className="mt-1 block text-sm leading-tight">{experience.company}</strong>
                  <p className="mt-1 line-clamp-2 text-[0.72rem] leading-[1.45] text-zinc-600">{experience.highlights[0]?.metric || experience.role}</p>
                </a>
              ))}
            </div>
          )}

          {activeApp === 'projects' && (
            <div className="space-y-2">
              {featuredProjects.map((project) => (
                <a key={project.slug} href={`/about/${project.slug}`} className="block rounded-[16px] border border-zinc-200 p-3 transition hover:border-zinc-400">
                  <div className="text-[0.68rem] text-zinc-500">{project.eyebrow}</div>
                  <strong className="mt-1 block text-sm leading-tight">{project.title}</strong>
                  <p className="mt-1 line-clamp-2 text-[0.72rem] leading-[1.45] text-zinc-600">{project.metrics[0]?.value} · {project.metrics[0]?.label}</p>
                </a>
              ))}
            </div>
          )}

          {activeApp === 'demos' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {demoApps.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    className={`rounded-[14px] border px-2 py-2 text-[0.62rem] font-semibold leading-tight ${activeDemo.id === demo.id ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}
                    onClick={() => setActiveDemo(demo)}
                  >
                    {demo.title}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-[18px] border border-zinc-200 bg-zinc-100">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
                  <div>
                    <strong className="block text-[0.72rem] leading-tight">{activeDemo.title}</strong>
                    <span className="block text-[0.6rem] text-zinc-500">{activeDemo.caption}</span>
                  </div>
                  <a href={activeDemo.href} className="shrink-0 rounded-full bg-zinc-950 px-2 py-1 text-[0.6rem] text-white">
                    상세
                  </a>
                </div>
                <iframe
                  key={activeDemo.id}
                  src={activeDemo.src}
                  title={`${activeDemo.title} 데모 앱`}
                  className="h-[360px] w-full bg-white"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MacbookPanel({ projects }: { projects: typeof portfolioProjects }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[color-mix(in_oklab,var(--surface)_86%,transparent)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="space-y-3 p-4">
        {projects.slice(0, 4).map((project) => (
          <a key={project.slug} href={`/about/${project.slug}`} className="block rounded-[20px] border border-white/10 bg-[color-mix(in_oklab,var(--bg)_35%,transparent)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[color-mix(in_oklab,var(--surface)_72%,transparent)]">
            <div className="mono text-[0.66rem]" style={{ color: 'var(--text-faint)' }}>
              {project.period}
            </div>
            <strong className="mt-1 block text-[0.95rem]" style={{ color: 'var(--text)' }}>
              {project.title}
            </strong>
            <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.55]" style={{ color: 'var(--text-dim)' }}>
              {project.summary}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function NotebookPanel() {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mono mb-3 text-[0.68rem]" style={{ color: 'var(--text-faint)' }}>
        selected notes
      </div>
      <div className="space-y-2.5">
        {resumeFeatureProject.links.map((link) => (
          <a key={link.href} href={link.href} className="block rounded-[14px] border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)]">
            <strong className="text-[0.9rem]" style={{ color: 'var(--text)' }}>
              {link.label}
            </strong>
            <p className="mt-1 text-[0.76rem] leading-[1.5]" style={{ color: 'var(--text-dim)' }}>
              I18Nexus와 프론트엔드 문제 해결을 글 단위로 확인합니다.
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function DeskPanel() {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mono mb-3 text-[0.68rem]" style={{ color: 'var(--text-faint)' }}>
        profile snapshot
      </div>
      <h3 className="m-0 text-[1.1rem] font-bold leading-tight tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
        {portfolioProfile.headline}
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {portfolioProfile.focus.map((item) => (
          <span key={item} className="pill">
            {item}
          </span>
        ))}
      </div>
      <a href="/about" className="pill mt-5 h-9" style={{ color: 'var(--text)', borderColor: 'var(--border-strong)' }}>
        소개 페이지 →
      </a>
    </div>
  );
}
