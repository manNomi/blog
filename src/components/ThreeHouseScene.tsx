import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
    label: 'MacBook',
    detail: '제품 문제 해결과 DX 자동화 기록을 엽니다.',
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

const FOCUS_CAMERA: Record<HotspotId | 'idle', { position: THREE.Vector3; target: THREE.Vector3 }> = {
  idle: {
    position: new THREE.Vector3(4.6, 3.1, 5.9),
    target: new THREE.Vector3(0, 1.1, -0.55)
  },
  iphone: {
    position: new THREE.Vector3(2.3, 2.05, 2.6),
    target: new THREE.Vector3(0.92, 1.38, -0.52)
  },
  macbook: {
    position: new THREE.Vector3(-2.35, 2.0, 2.9),
    target: new THREE.Vector3(-0.8, 1.45, -0.82)
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
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, type === 'phone' ? '#0f172a' : '#111827');
    gradient.addColorStop(1, type === 'phone' ? '#075985' : '#3b0764');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px sans-serif';
    ctx.fillText(type === 'phone' ? 'Resume' : 'Work OS', 44, 78);
    ctx.font = '500 22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText(type === 'phone' ? portfolioProfile.role : 'Product Frontend', 46, 116);

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
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.width = '100%';
    viewport.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeff1f2);
    scene.fog = new THREE.Fog(0xeff1f2, 7, 13);

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

    const wallMaterial = makeMaterial(0xe5e1da, { roughness: 0.86 });
    const floorMaterial = makeMaterial(0xb7a48c, { roughness: 0.82 });
    const woodMaterial = makeMaterial(0x8a6246, { roughness: 0.68 });
    const darkMaterial = makeMaterial(0x17191f, { roughness: 0.44, metalness: 0.25 });
    const metalMaterial = makeMaterial(0xb9c0c7, { roughness: 0.36, metalness: 0.5 });
    const paperMaterial = makeMaterial(0xf9f1d1, { roughness: 0.95 });
    const greenMaterial = makeMaterial(0x7a9f72, { roughness: 0.88 });
    const room = new THREE.Group();
    scene.add(room);

    room.add(createBox(7.8, 0.12, 5.2, floorMaterial, [0, -0.06, 0]));
    room.add(createBox(7.8, 3.15, 0.12, wallMaterial, [0, 1.5, -2.62]));
    room.add(createBox(0.12, 3.15, 5.2, wallMaterial, [-3.9, 1.5, 0]));
    room.add(createBox(7.4, 0.035, 2.1, makeMaterial(0xd8cec0, { roughness: 0.9 }), [0.1, 0.015, 1.15]));
    room.add(createBox(2.4, 0.025, 1.42, makeMaterial(0x28313a, { roughness: 0.88 }), [0.4, 0.03, 0.55]));

    const cork = createBox(1.85, 1.02, 0.07, makeMaterial(0xc8965f, { roughness: 0.8 }), [1.78, 1.92, -2.55]);
    room.add(cork);
    const noteColors = [0xfff0b3, 0xc7d2fe, 0xfbcfe8, 0xbbf7d0, 0xfed7aa] as const;
    for (let index = 0; index < 5; index += 1) {
      const note = createBox(0.34, 0.2, 0.025, makeMaterial(noteColors[index] ?? noteColors[0]), [
        1.15 + (index % 3) * 0.43,
        1.72 + Math.floor(index / 3) * 0.28,
        -2.5
      ]);
      room.add(note);
    }

    const shelf = createBox(1.8, 0.1, 0.42, woodMaterial, [-1.92, 2.22, -2.38]);
    room.add(shelf);
    const bookColors = [0x334155, 0x475569, 0x94a3b8] as const;
    for (let index = 0; index < 6; index += 1) {
      room.add(
        createBox(0.12, 0.48 + (index % 2) * 0.08, 0.28, makeMaterial(bookColors[index % bookColors.length] ?? bookColors[0]), [
          -2.62 + index * 0.18,
          2.52,
          -2.38
        ])
      );
    }

    const deskGroup = new THREE.Group();
    deskGroup.name = 'desk hotspot';
    room.add(deskGroup);
    const tabletop = createBox(4.25, 0.18, 1.45, woodMaterial, [0, 1.02, -0.7]);
    const frontPanel = createBox(4.1, 0.32, 0.08, makeMaterial(0x6c4d37), [0, 0.78, 0.01]);
    addHotspotMesh('desk', tabletop);
    addHotspotMesh('desk', frontPanel);
    deskGroup.add(tabletop, frontPanel);
    [
      [-1.85, 0.46, -1.25],
      [1.85, 0.46, -1.25],
      [-1.85, 0.46, -0.13],
      [1.85, 0.46, -0.13]
    ].forEach((position) => deskGroup.add(createBox(0.18, 1.0, 0.18, woodMaterial, position as [number, number, number])));

    const macbook = new THREE.Group();
    macbook.name = 'macbook hotspot';
    macbook.position.set(-0.78, 1.16, -0.78);
    deskGroup.add(macbook);
    const macBase = createBox(1.62, 0.06, 1.04, metalMaterial, [0, 0, 0.2], [-0.05, 0, 0]);
    const trackpad = createBox(0.42, 0.012, 0.32, makeMaterial(0xdce2e8, { metalness: 0.35 }), [0, 0.04, 0.42], [-0.05, 0, 0]);
    const macScreen = createBox(1.52, 0.86, 0.055, darkMaterial, [0, 0.58, -0.3], [-0.2, 0, 0]);
    const screenTexture = makeScreenTexture('macbook');
    const macScreenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 0.66),
      new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false })
    );
    macScreenPlane.position.set(0, 0.6, -0.266);
    macScreenPlane.rotation.x = -0.2;
    addHotspotMesh('macbook', macBase);
    addHotspotMesh('macbook', macScreen);
    macbook.add(macBase, trackpad, macScreen, macScreenPlane);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        macbook.add(createBox(0.105, 0.01, 0.045, darkMaterial, [-0.48 + col * 0.14, 0.048, 0.03 + row * 0.105], [-0.05, 0, 0]));
      }
    }

    const iphone = new THREE.Group();
    iphone.name = 'iphone hotspot';
    iphone.position.set(0.95, 1.32, -0.5);
    iphone.rotation.set(-0.06, -0.24, 0.03);
    deskGroup.add(iphone);
    const phoneBody = createBox(0.48, 0.86, 0.055, darkMaterial, [0, 0.14, 0]);
    const phoneScreenTexture = makeScreenTexture('phone');
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.39, 0.68),
      new THREE.MeshBasicMaterial({ map: phoneScreenTexture, toneMapped: false })
    );
    phoneScreen.position.set(0, 0.15, 0.031);
    const phoneStand = createBox(0.62, 0.05, 0.26, metalMaterial, [0, -0.32, -0.08]);
    const phoneStem = createBox(0.08, 0.36, 0.08, metalMaterial, [0, -0.16, -0.08]);
    addHotspotMesh('iphone', phoneBody);
    addHotspotMesh('iphone', phoneStand);
    iphone.add(phoneBody, phoneScreen, phoneStand, phoneStem);

    const notebook = new THREE.Group();
    notebook.name = 'notebook hotspot';
    notebook.position.set(1.74, 1.12, -0.55);
    notebook.rotation.y = -0.2;
    deskGroup.add(notebook);
    const notebookBase = createBox(0.92, 0.055, 0.68, paperMaterial, [0, 0.03, 0]);
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
      makeMaterial(0xf4f4f5, { roughness: 0.62 })
    );
    mugBody.castShadow = true;
    mugBody.receiveShadow = true;
    mug.add(mugBody);
    const mugHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 10, 24, Math.PI * 1.25),
      makeMaterial(0xf4f4f5, { roughness: 0.62 })
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
    lamp.add(createBox(0.09, 0.78, 0.09, darkMaterial, [0, 0.27, 0]));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.28, 32), makeMaterial(0xf4f4f5, { roughness: 0.58 }));
    shade.position.set(0, 0.78, 0);
    shade.rotation.x = Math.PI;
    shade.castShadow = true;
    lamp.add(shade);
    const lampLight = new THREE.PointLight(0xffe7b0, 7, 4);
    lampLight.position.set(2.42, 2.0, -1.0);
    scene.add(lampLight);

    const hotspotDots = new Map<HotspotId, THREE.Mesh>();
    const dotGeometry = new THREE.SphereGeometry(0.06, 24, 12);
    const dotPositions: Record<HotspotId, [number, number, number]> = {
      iphone: [0.95, 2.0, -0.42],
      macbook: [-0.78, 2.06, -0.74],
      notebook: [1.78, 1.55, -0.42],
      desk: [0, 1.42, 0.1]
    };
    (Object.keys(dotPositions) as HotspotId[]).forEach((id) => {
      const dot = new THREE.Mesh(
        dotGeometry,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(HOTSPOTS[id].tone),
          transparent: true,
          opacity: 0.72
        })
      );
      dot.position.set(...dotPositions[id]);
      dot.userData.hotspot = id;
      clickableMeshes.push(dot);
      hotspotDots.set(id, dot);
      scene.add(dot);
    });

    const hemisphere = new THREE.HemisphereLight(0xf7fbff, 0x8b735d, 1.85);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff0d2, 3.6);
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
    const fill = new THREE.PointLight(0xa7c7ff, 1.6, 8);
    fill.position.set(2.5, 2.4, 2.6);
    scene.add(fill);

    const setRendererSize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(520, Math.floor(rect.height));
      const isNarrow = width < 720;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (selectedRef.current == null) {
        const idle = isNarrow
          ? { position: new THREE.Vector3(5.3, 3.2, 6.7), target: new THREE.Vector3(0.12, 1.12, -0.58) }
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

    const selectHotspot = (hotspot: HotspotId | null) => {
      selectedRef.current = hotspot;
      const focus = FOCUS_CAMERA[hotspot ?? 'idle'];
      desiredCamera.position.copy(focus.position);
      desiredCamera.target.copy(focus.target);
      setSelectedHotspot(hotspot);
      if (hotspot === 'iphone') setActivePhoneApp('career');
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

      return (item?.object.userData.hotspot as HotspotId | undefined) ?? null;
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

      controls.update();
      renderer.render(scene, camera);
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
    };
  }, []);

  const selectHotspotFromUi = (hotspot: HotspotId) => {
    sceneSelectRef.current?.(hotspot);
  };

  return (
    <div className="relative min-h-[680px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] md:min-h-[720px]">
      <div ref={viewportRef} className="absolute inset-0" aria-label="3D 포트폴리오 방" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(180deg,transparent_58%,color-mix(in_oklab,var(--bg)_86%,transparent))]" />

      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 md:left-6 md:top-6">
        {(Object.keys(HOTSPOTS) as HotspotId[]).map((hotspot) => (
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
        <span className="mono">{hoveredHotspot ? HOTSPOTS[hoveredHotspot].detail : selectedHotspot ? HOTSPOTS[selectedHotspot].detail : 'object ready'}</span>
      </div>

      {selectedHotspot && (
        <aside className="absolute bottom-4 right-4 top-auto z-10 w-[min(420px,calc(100%-2rem))] rounded-[22px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] p-3 shadow-[var(--shadow)] backdrop-blur-xl md:bottom-6 md:right-6 md:top-6 md:w-[420px]">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="mono text-[0.66rem]" style={{ color: 'var(--text-faint)' }}>
                selected object
              </div>
              <h2 className="m-0 text-[1.1rem] font-bold leading-tight tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
                {HOTSPOTS[selectedHotspot].label}
              </h2>
            </div>
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
    <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mono ml-2 text-[0.68rem]">workstation</span>
      </div>
      <div className="space-y-3 p-4">
        {projects.slice(0, 4).map((project) => (
          <a key={project.slug} href={`/about/${project.slug}`} className="block rounded-[14px] border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)]">
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
