import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type LadderRung = {
  id: string;
  from: number;
  to: number;
  y: number;
};

type LadderPoint = {
  column: number;
  y: number;
};

type LadderTrace = {
  resultIndex: number;
  points: LadderPoint[];
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const TOP_Y = 7;
const BOTTOM_Y = -7;
const COLUMN_GAP = 3.2;
const DEFAULT_PLAYERS = ['만욱', '친구 A', '친구 B', '친구 C', '친구 D', '친구 E'];
const DEFAULT_RESULTS = ['커피 사기', '오늘 행운', '청소 면제', '간식 당첨', '리뷰 당첨', '다시 뽑기'];
const PATH_COLOR = '#f8f4e8';
const RUNG_COLOR = '#d3b17a';
const RAIL_COLOR = '#8ba6ff';
const RESULT_COLOR = '#f06c64';

export default function LadderGamePage() {
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState(() => DEFAULT_PLAYERS.slice(0, 4));
  const [results, setResults] = useState(() => DEFAULT_RESULTS.slice(0, 4));
  const [seed, setSeed] = useState(20260625);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const rungs = useMemo(() => buildRungs(playerCount, seed), [playerCount, seed]);
  const trace = useMemo(() => (selectedIndex === null ? null : traceLadder(selectedIndex, rungs, playerCount)), [playerCount, rungs, selectedIndex]);
  const resultText = trace ? getSafeLabel(results, trace.resultIndex, `결과 ${trace.resultIndex + 1}`) : null;
  const selectedPlayer = selectedIndex === null ? null : getSafeLabel(players, selectedIndex, `참가자 ${selectedIndex + 1}`);

  const handleCountChange = (nextCount: number) => {
    const safeCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, nextCount));
    setPlayerCount(safeCount);
    setPlayers((current) => resizeList(current, safeCount, (index) => DEFAULT_PLAYERS[index] ?? `참가자 ${index + 1}`));
    setResults((current) => resizeList(current, safeCount, (index) => DEFAULT_RESULTS[index] ?? `결과 ${index + 1}`));
    setSelectedIndex(null);
    setSeed(Date.now());
  };

  const shuffleLadder = () => {
    setSelectedIndex(null);
    setSeed(Date.now());
  };

  const pickRandomStart = () => {
    setSelectedIndex(Math.floor(Math.random() * playerCount));
  };

  return (
    <div className="grid gap-5 text-[var(--text)]">
      <section className="saju-card overflow-hidden px-5 py-7 md:px-8 md:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">3D Ladder Game</p>
            <h1 className="mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[52px]">사다리타기</h1>
            <p className="mt-4 max-w-[690px] text-[15px] leading-[1.7] text-[var(--text-dim)] md:text-[17px]">
              참가자와 결과를 입력하고, 명화풍 배경 위의 입체 사다리 경로를 따라갑니다. 캔버스를 드래그하면 z축 깊이까지 돌려볼 수 있습니다.
            </p>
          </div>

          <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm md:min-w-[260px]">
            <span className="text-xs font-semibold text-[var(--text-faint)]">현재 결과</span>
            {trace ? (
              <strong className="text-[20px] leading-[1.25] tracking-[-0.02em] text-[var(--text)]">
                {selectedPlayer} → {resultText}
              </strong>
            ) : (
              <span className="leading-[1.55] text-[var(--text-dim)]">참가자를 선택하면 경로와 결과가 표시됩니다.</span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="grid content-start gap-4">
          <section className="saju-card grid gap-4 px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Setup</p>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">참가자와 결과</h2>
              </div>
              <label className="grid gap-1 text-xs text-[var(--text-dim)]">
                인원
                <select value={playerCount} onChange={(event) => handleCountChange(Number(event.target.value))} className="saju-input h-9 min-w-[84px] appearance-none text-sm">
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => MIN_PLAYERS + index).map((count) => (
                    <option key={count} value={count}>
                      {count}명
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3">
              {Array.from({ length: playerCount }, (_, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-[var(--text-dim)]">참가자 {index + 1}</span>
                    <input
                      value={players[index] ?? ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlayers((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                      }}
                      maxLength={14}
                      className="saju-input h-10"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-[var(--text-dim)]">결과 {index + 1}</span>
                    <input
                      value={results[index] ?? ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setResults((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                      }}
                      maxLength={18}
                      className="saju-input h-10"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={shuffleLadder} className="btn-pill-dark h-11 flex-1 transition-transform duration-200 hover:-translate-y-0.5">
                새 사다리
              </button>
              <button type="button" onClick={pickRandomStart} className="btn-pill-soft h-11 flex-1 transition-transform duration-200 hover:-translate-y-0.5">
                랜덤 시작
              </button>
            </div>
          </section>

          <section className="saju-card grid gap-3 px-5 py-5 md:px-6 md:py-6">
            <div>
              <p className="eyebrow">Start</p>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">누가 출발할까요?</h2>
            </div>

            <div className="grid gap-2">
              {Array.from({ length: playerCount }, (_, index) => {
                const active = selectedIndex === index;
                const label = getSafeLabel(players, index, `참가자 ${index + 1}`);

                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={active}
                    data-active={active ? 'true' : undefined}
                    onClick={() => setSelectedIndex(index)}
                    className="saju-choice flex min-h-[48px] items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="truncate font-semibold">{label}</span>
                    <span className="mono">{active ? 'selected' : `#${index + 1}`}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="saju-card overflow-hidden p-3 md:p-4">
          <LadderStage
            count={playerCount}
            players={players}
            results={results}
            rungs={rungs}
            trace={trace}
            selectedIndex={selectedIndex}
            seed={seed}
          />
        </section>
      </section>
    </div>
  );
}

function LadderStage({
  count,
  players,
  results,
  rungs,
  trace,
  selectedIndex,
  seed
}: {
  count: number;
  players: string[];
  results: string[];
  rungs: LadderRung[];
  trace: LadderTrace | null;
  selectedIndex: number | null;
  seed: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const configKey = JSON.stringify({ count, players, results, rungs, trace, selectedIndex, seed });

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const rootElement = root;

    let animationId = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    camera.position.set(8.4, 7.6, 15.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('aria-label', '3D 사다리타기 캔버스');
    rootElement.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 26;
    controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.82);
    const keyLight = new THREE.DirectionalLight('#fff7dd', 1.4);
    const rimLight = new THREE.DirectionalLight('#9fb8ff', 0.9);
    keyLight.position.set(4, 10, 8);
    rimLight.position.set(-8, 5, -6);
    scene.add(ambientLight, keyLight, rimLight);

    const backdropTexture = createPaintingTexture(seed);
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 18, 1, 1),
      new THREE.MeshBasicMaterial({ map: backdropTexture, transparent: true, opacity: 0.94 })
    );
    backdrop.position.set(0, 0, -6.4);
    scene.add(backdrop);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11.5, 72),
      new THREE.MeshBasicMaterial({ color: '#0f1117', transparent: true, opacity: 0.42 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = BOTTOM_Y - 1.28;
    scene.add(floor);

    const railMaterial = new THREE.MeshStandardMaterial({
      color: RAIL_COLOR,
      roughness: 0.42,
      metalness: 0.12,
      emissive: '#1f2d58',
      emissiveIntensity: 0.38
    });
    const rungMaterial = new THREE.MeshStandardMaterial({
      color: RUNG_COLOR,
      roughness: 0.5,
      metalness: 0.18,
      emissive: '#4d3216',
      emissiveIntensity: 0.24
    });
    const inactiveMaterial = new THREE.MeshStandardMaterial({
      color: '#60636f',
      roughness: 0.68,
      transparent: true,
      opacity: 0.5
    });
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: PATH_COLOR,
      roughness: 0.28,
      metalness: 0.1,
      emissive: '#fff0b5',
      emissiveIntensity: 0.82
    });
    const resultMaterial = new THREE.MeshStandardMaterial({
      color: RESULT_COLOR,
      roughness: 0.32,
      emissive: '#6d1c1a',
      emissiveIntensity: 0.46
    });

    for (let column = 0; column < count; column += 1) {
      const top = positionForColumn(column, count, TOP_Y);
      const bottom = positionForColumn(column, count, BOTTOM_Y);
      scene.add(createCylinderBetween(top, bottom, 0.055, selectedIndex === null || selectedIndex === column ? railMaterial : inactiveMaterial));
      scene.add(createSphere(top, 0.14, selectedIndex === column ? resultMaterial : railMaterial));
      scene.add(createSphere(bottom, 0.14, trace?.resultIndex === column ? resultMaterial : railMaterial));

      const topLabel = createTextSprite(getSafeLabel(players, column, `참가자 ${column + 1}`), selectedIndex === column ? PATH_COLOR : '#d9dbe3');
      topLabel.position.set(top.x, TOP_Y + 0.82, top.z);
      scene.add(topLabel);

      const bottomLabel = createTextSprite(getSafeLabel(results, column, `결과 ${column + 1}`), trace?.resultIndex === column ? '#fff7e8' : '#c7c9d1');
      bottomLabel.position.set(bottom.x, BOTTOM_Y - 0.72, bottom.z);
      scene.add(bottomLabel);
    }

    for (const rung of rungs) {
      const from = positionForColumn(rung.from, count, rung.y);
      const to = positionForColumn(rung.to, count, rung.y);
      scene.add(createCylinderBetween(from, to, 0.04, rungMaterial));
    }

    const pathVectors = trace ? trace.points.map((point) => positionForColumn(point.column, count, point.y)) : [];
    if (pathVectors.length > 1) {
      for (let index = 0; index < pathVectors.length - 1; index += 1) {
        scene.add(createCylinderBetween(pathVectors[index], pathVectors[index + 1], 0.105, pathMaterial));
      }

      for (const point of pathVectors) {
        scene.add(createSphere(point, 0.12, pathMaterial));
      }
    }

    const runner = pathVectors.length > 1 ? createSphere(pathVectors[0], 0.24, resultMaterial) : null;
    if (runner) scene.add(runner);

    const axes = new THREE.AxesHelper(2.8);
    axes.position.set(-8.7, BOTTOM_Y - 0.82, 4.2);
    scene.add(axes);

    const hint = createTextSprite('drag to rotate · z axis', '#eef0f5', 430, 96);
    hint.position.set(4.8, TOP_Y + 1.2, 4.4);
    hint.scale.set(3.4, 0.76, 1);
    scene.add(hint);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(rootElement);
    resize();

    const animationStartedAt = performance.now();
    const pathLengths = getPathLengths(pathVectors);

    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      controls.update();

      if (runner && pathLengths.total > 0) {
        const elapsedSeconds = (performance.now() - animationStartedAt) / 1000;
        const distance = (elapsedSeconds * 2.4) % pathLengths.total;
        runner.position.copy(getPointAtDistance(pathVectors, pathLengths.cumulative, distance));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };

    function resize() {
      const rect = rootElement.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rootElement.clientWidth || rect.width));
      const height = Math.max(1, Math.floor(rootElement.clientHeight || rect.height));
      if (width < 560) {
        camera.position.set(4.8, 7.4, 20.5);
        camera.fov = 47;
      } else {
        camera.position.set(8.4, 7.6, 15.2);
        camera.fov = 42;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }, [configKey]);

  return (
    <div className="relative min-h-[540px] overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg)] sm:min-h-[620px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-medium text-white/80 shadow-soft backdrop-blur">
        3D view
      </div>
    </div>
  );
}

function buildRungs(count: number, seed: number) {
  const random = mulberry32(seed);
  const levels = count * 4 + 4;
  const rungs: LadderRung[] = [];
  let previousFrom = -1;

  for (let level = 0; level < levels; level += 1) {
    const y = TOP_Y - ((level + 1) / (levels + 1)) * (TOP_Y - BOTTOM_Y);
    if (random() < 0.12) continue;

    let from = Math.floor(random() * (count - 1));
    if (from === previousFrom && count > 3 && random() < 0.72) {
      from = (from + 1 + Math.floor(random() * (count - 2))) % (count - 1);
    }

    previousFrom = from;
    rungs.push({ id: `${seed}-${level}-${from}`, from, to: from + 1, y });
  }

  return rungs;
}

function traceLadder(startIndex: number, rungs: LadderRung[], count: number): LadderTrace {
  let column = Math.min(count - 1, Math.max(0, startIndex));
  const points: LadderPoint[] = [{ column, y: TOP_Y + 0.36 }];

  for (const rung of [...rungs].sort((a, b) => b.y - a.y)) {
    points.push({ column, y: rung.y + 0.22 });
    if (rung.from === column || rung.to === column) {
      const nextColumn = rung.from === column ? rung.to : rung.from;
      points.push({ column, y: rung.y });
      points.push({ column: nextColumn, y: rung.y });
      column = nextColumn;
    }
  }

  points.push({ column, y: BOTTOM_Y - 0.36 });
  return { resultIndex: column, points };
}

function positionForColumn(column: number, count: number, y: number) {
  const x = (column - (count - 1) / 2) * COLUMN_GAP;
  const z = Math.sin((column + 1) * 1.18) * 1.05 + Math.cos(y * 0.42 + column) * 0.28;
  return new THREE.Vector3(x, y, z);
}

function createCylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(0.001, direction.length());
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createSphere(position: THREE.Vector3, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  mesh.position.copy(position);
  return mesh;
}

function createTextSprite(text: string, color = '#eef0f5', width = 360, height = 120) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (context) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(5, 7, 12, 0.62)';
    roundRect(context, 8, 18, width - 16, height - 36, 28);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = color;
    context.font = '700 32px Pretendard, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text.slice(0, 16), width / 2, height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6, 0.88, 1);
  return sprite;
}

function createPaintingTexture(seed: number) {
  const random = mulberry32(seed + 901);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(0.45, '#1e1b2d');
    gradient.addColorStop(1, '#35211d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 1024);

    const palette = ['#ec6f55', '#f3c46b', '#316a9d', '#7b3f86', '#f1ede1', '#274c43'];

    for (let index = 0; index < 24; index += 1) {
      context.save();
      context.translate(random() * 1024, random() * 1024);
      context.rotate((random() - 0.5) * Math.PI);
      context.globalAlpha = 0.14 + random() * 0.24;
      context.fillStyle = palette[Math.floor(random() * palette.length)];
      context.fillRect(-180 - random() * 120, -24 - random() * 48, 360 + random() * 260, 48 + random() * 120);
      context.restore();
    }

    for (let index = 0; index < 18; index += 1) {
      context.beginPath();
      context.globalAlpha = 0.14 + random() * 0.22;
      context.lineWidth = 8 + random() * 26;
      context.strokeStyle = palette[Math.floor(random() * palette.length)];
      const startX = random() * 1024;
      const startY = random() * 1024;
      context.moveTo(startX, startY);
      context.bezierCurveTo(random() * 1024, random() * 1024, random() * 1024, random() * 1024, random() * 1024, random() * 1024);
      context.stroke();
    }

    context.globalAlpha = 0.22;
    context.strokeStyle = '#f7efe5';
    context.lineWidth = 3;
    for (let index = 0; index < 12; index += 1) {
      context.beginPath();
      context.arc(510 + (random() - 0.5) * 160, 480 + (random() - 0.5) * 180, 80 + random() * 220, random() * Math.PI, random() * Math.PI * 2);
      context.stroke();
    }

    context.globalAlpha = 0.16;
    context.fillStyle = '#05070c';
    context.fillRect(0, 0, 1024, 1024);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getPathLengths(points: THREE.Vector3[]) {
  const cumulative = [0];
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    total += points[index - 1].distanceTo(points[index]);
    cumulative.push(total);
  }

  return { cumulative, total };
}

function getPointAtDistance(points: THREE.Vector3[], cumulative: number[], distance: number) {
  for (let index = 1; index < cumulative.length; index += 1) {
    if (distance <= cumulative[index]) {
      const previousDistance = cumulative[index - 1];
      const segmentLength = Math.max(0.001, cumulative[index] - previousDistance);
      const ratio = (distance - previousDistance) / segmentLength;
      return new THREE.Vector3().lerpVectors(points[index - 1], points[index], ratio);
    }
  }

  return points[points.length - 1]?.clone() ?? new THREE.Vector3();
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> & {
      material?: THREE.Material | THREE.Material[];
      geometry?: THREE.BufferGeometry;
    };

    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      const mappedMaterial = material as THREE.Material & { map?: THREE.Texture };
      mappedMaterial.map?.dispose();
      material.dispose();
    }
  });
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function resizeList(list: string[], size: number, fallback: (index: number) => string) {
  return Array.from({ length: size }, (_, index) => list[index] ?? fallback(index));
}

function getSafeLabel(list: string[], index: number, fallback: string) {
  return list[index]?.trim() || fallback;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}
