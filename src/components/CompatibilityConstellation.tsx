import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const MBTI_TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ'
] as const;

type MbtiType = (typeof MBTI_TYPES)[number];

type Person = {
  id: string;
  name: string;
  mbti: MbtiType;
};

type PairScore = {
  id: string;
  from: Person;
  to: Person;
  score: number;
  label: string;
  summary: string;
  color: string;
};

type NodeRenderItem = {
  person: Person;
  position: THREE.Vector3;
};

const DEFAULT_PEOPLE: Person[] = [
  { id: 'minji', name: '민지', mbti: 'ENFP' },
  { id: 'jiho', name: '지호', mbti: 'INTJ' },
  { id: 'haeun', name: '하은', mbti: 'ISFJ' },
  { id: 'doyun', name: '도윤', mbti: 'ESTP' }
];

const idealPairKeys = new Set([
  'ENFP-INFJ',
  'INFJ-ENFP',
  'ENTP-INTJ',
  'INTJ-ENTP',
  'INFP-ENFJ',
  'ENFJ-INFP',
  'ISFP-ESFJ',
  'ESFJ-ISFP',
  'ISTJ-ESFP',
  'ESFP-ISTJ',
  'ENTJ-INTP',
  'INTP-ENTJ'
]);

const accentByScore = {
  high: '#5ee7a7',
  mid: '#f6c85f',
  low: '#f87171'
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPairLabel(score: number) {
  if (score >= 84) return '강한 끌림';
  if (score >= 72) return '편안한 호흡';
  if (score >= 58) return '천천히 맞추기';
  return '리듬 조율 필요';
}

function hasFinalConsonant(value: string) {
  const lastCharacter = value.trim().charAt(value.trim().length - 1);
  const code = lastCharacter.charCodeAt(0) - 0xac00;

  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function asSubject(value: string) {
  return `${value}${hasFinalConsonant(value) ? '은' : '는'}`;
}

function asPartner(value: string) {
  return `${value}${hasFinalConsonant(value) ? '과' : '와'}`;
}

function getPairSummary(score: number, from: Person, to: Person) {
  const pairName = `${asPartner(from.name)} ${asSubject(to.name)}`;

  if (score >= 84) return `${pairName} 서로의 빈칸을 밝게 채우는 흐름이에요.`;
  if (score >= 72) return `${pairName} 대화 속도가 안정적으로 맞는 편이에요.`;
  if (score >= 58) return `${pairName} 기준을 맞추면 좋은 연결로 자랄 수 있어요.`;
  return `${pairName} 표현 방식과 속도를 먼저 조율하는 게 좋아요.`;
}

function getPairColor(score: number) {
  if (score >= 80) return accentByScore.high;
  if (score >= 62) return accentByScore.mid;
  return accentByScore.low;
}

function scorePair(from: Person, to: Person): PairScore {
  let score = 48;

  score += from.mbti[0] === to.mbti[0] ? 4 : 9;
  score += from.mbti[1] === to.mbti[1] ? 16 : -5;
  score += from.mbti[2] === to.mbti[2] ? 8 : 5;
  score += from.mbti[3] === to.mbti[3] ? 5 : 8;

  if (idealPairKeys.has(`${from.mbti}-${to.mbti}`)) {
    score += 12;
  }

  const namePulse = (hashString(`${from.name}:${to.name}`) % 19) - 7;
  const finalScore = clamp(score + namePulse, 28, 98);

  return {
    id: `${from.id}-${to.id}`,
    from,
    to,
    score: finalScore,
    label: getPairLabel(finalScore),
    summary: getPairSummary(finalScore, from, to),
    color: getPairColor(finalScore)
  };
}

function buildPairs(people: Person[]) {
  const pairs: PairScore[] = [];

  for (let fromIndex = 0; fromIndex < people.length; fromIndex += 1) {
    for (let toIndex = fromIndex + 1; toIndex < people.length; toIndex += 1) {
      pairs.push(scorePair(people[fromIndex], people[toIndex]));
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}

function createLabelSprite(text: string, detail: string, active: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = active ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.78)';
  context.font = '700 34px Noto Sans KR, Apple SD Gothic Neo, sans-serif';
  context.textAlign = 'center';
  context.fillText(text, 160, 48);
  context.fillStyle = active ? 'rgba(94, 231, 167, 0.95)' : 'rgba(255, 255, 255, 0.48)';
  context.font = '600 22px Noto Sans KR, Apple SD Gothic Neo, sans-serif';
  context.fillText(detail, 160, 84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.62, 0.65, 1);

  return sprite;
}

function createGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(94, 231, 167, 0.24)');
  gradient.addColorStop(0.38, 'rgba(246, 200, 95, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(7.2, 7.2, 1);

  return sprite;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material];

  materials.forEach((item) => {
    Object.values(item as unknown as Record<string, unknown>).forEach((value) => {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    });
    item.dispose();
  });
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object: THREE.Object3D) => {
    const disposable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    if (disposable.geometry) {
      disposable.geometry.dispose();
    }
    if (disposable.material) {
      disposeMaterial(disposable.material);
    }
  });
}

function buildNodePositions(people: Person[]) {
  const radius = 2.34 + people.length * 0.1;

  return people.map((person, index): NodeRenderItem => {
    const angle = (index / people.length) * Math.PI * 2 - Math.PI / 2;
    const nameOffset = ((hashString(person.name) % 9) - 4) / 10;

    return {
      person,
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.58,
        Math.sin(angle * 2 + nameOffset) * 0.62
      )
    };
  });
}

function ConstellationCanvas({
  people,
  pairs,
  selectedPersonId,
  onSelect
}: {
  people: Person[];
  pairs: PairScore[];
  selectedPersonId: string;
  onSelect: (personId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.35, 10.6);

    const root = new THREE.Group();
    root.rotation.x = -0.12;
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffffff, 0.76);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x5ee7a7, 2.4, 18);
    keyLight.position.set(-4, 3, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xf6c85f, 1.3, 16);
    fillLight.position.set(4, -2, 4);
    scene.add(fillLight);

    const glow = createGlowSprite();
    if (glow) {
      glow.position.set(0, -0.1, -1.2);
      root.add(glow);
    }

    const starCount = 180;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [new THREE.Color('#ffffff'), new THREE.Color('#5ee7a7'), new THREE.Color('#f6c85f'), new THREE.Color('#8ac4ff')];

    for (let index = 0; index < starCount; index += 1) {
      const seed = hashString(`${people.length}-${index}`);
      starPositions[index * 3] = ((seed % 1000) / 1000 - 0.5) * 10.4;
      starPositions[index * 3 + 1] = (((seed >> 3) % 1000) / 1000 - 0.5) * 6.8;
      starPositions[index * 3 + 2] = -2.8 - (((seed >> 6) % 1000) / 1000) * 2.6;

      const color = starPalette[seed % starPalette.length];
      starColors[index * 3] = color.r;
      starColors[index * 3 + 1] = color.g;
      starColors[index * 3 + 2] = color.b;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    root.add(stars);

    const nodeItems = buildNodePositions(people);
    const positionById = new Map(nodeItems.map((item) => [item.person.id, item.position]));
    const nodeMeshes: THREE.Mesh[] = [];

    pairs.forEach((pair) => {
      const from = positionById.get(pair.from.id);
      const to = positionById.get(pair.to.id);
      if (!from || !to) return;

      const selected = pair.from.id === selectedPersonId || pair.to.id === selectedPersonId;
      const mid = from.clone().add(to).multiplyScalar(0.5);
      mid.z += 0.34 + pair.score / 340;

      const curve = new THREE.CatmullRomCurve3([from, mid, to]);
      const geometry = new THREE.TubeGeometry(curve, 28, selected ? 0.026 : 0.012 + pair.score / 6200, 8, false);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pair.color),
        transparent: true,
        opacity: selected ? 0.84 : 0.2 + pair.score / 520,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.Mesh(geometry, material);
      root.add(line);
    });

    nodeItems.forEach(({ person, position }, index) => {
      const active = person.id === selectedPersonId;
      const nodeColor = active ? '#5ee7a7' : index % 3 === 0 ? '#f6c85f' : index % 3 === 1 ? '#8ac4ff' : '#ffffff';
      const geometry = new THREE.SphereGeometry(active ? 0.18 : 0.135, 28, 28);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(nodeColor),
        emissive: new THREE.Color(nodeColor),
        emissiveIntensity: active ? 1.4 : 0.62,
        roughness: 0.36,
        metalness: 0.18
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData.personId = person.id;
      root.add(mesh);
      nodeMeshes.push(mesh);

      const haloGeometry = new THREE.SphereGeometry(active ? 0.34 : 0.24, 24, 24);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(nodeColor),
        transparent: true,
        opacity: active ? 0.13 : 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(position);
      root.add(halo);

      const label = createLabelSprite(person.name, person.mbti, active);
      if (label) {
        label.position.copy(position);
        label.position.y -= 0.48;
        label.position.z += 0.08;
        root.add(label);
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setRendererSize = () => {
      const width = Math.max(container.clientWidth, 320);
      const height = Math.max(container.clientHeight, 360);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObjects(nodeMeshes, false)[0];
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default';

      return hit;
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event);
    };

    const handlePointerLeave = () => {
      renderer.domElement.style.cursor = 'default';
    };

    const handlePointerDown = (event: PointerEvent) => {
      const hit = updatePointer(event);
      const personId = hit?.object.userData.personId;
      if (typeof personId === 'string') {
        onSelect(personId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(container);
    setRendererSize();

    let frameId = 0;
    const startedAt = performance.now();

    const renderFrame = () => {
      const elapsed = (performance.now() - startedAt) / 1000;

      root.rotation.y = Math.sin(elapsed * 0.18) * 0.2;
      root.rotation.x = -0.12 + Math.sin(elapsed * 0.13) * 0.035;
      stars.rotation.z = elapsed * 0.018;

      nodeMeshes.forEach((mesh, index) => {
        const active = mesh.userData.personId === selectedPersonId;
        const pulse = 1 + Math.sin(elapsed * 1.8 + index) * (active ? 0.09 : 0.045);
        mesh.scale.setScalar(pulse);
      });

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onSelect, pairs, people, selectedPersonId]);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />;
}

export default function CompatibilityConstellation() {
  const [people, setPeople] = useState<Person[]>(DEFAULT_PEOPLE);
  const [name, setName] = useState('');
  const [mbti, setMbti] = useState<MbtiType>('ENFP');
  const [selectedPersonId, setSelectedPersonId] = useState(DEFAULT_PEOPLE[0].id);
  const [error, setError] = useState('');

  const pairs = useMemo(() => buildPairs(people), [people]);
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0];
  const selectedPairs = pairs.filter((pair) => pair.from.id === selectedPerson.id || pair.to.id === selectedPerson.id);
  const topPair = pairs[0];
  const lowPair = pairs[pairs.length - 1];

  const renderSummaryCards = () =>
    topPair ? (
      <>
        <article className="rounded-md border border-emerald-200/24 bg-black/30 p-3 backdrop-blur-md">
          <p className="text-xs text-emerald-100/72">가장 밝은 연결</p>
          <p className="mt-1 text-sm font-semibold">
            {topPair.from.name} × {topPair.to.name} · {topPair.score}점
          </p>
          <p className="mt-1 text-xs leading-[1.5] text-white/58">{topPair.summary}</p>
        </article>

        {lowPair && lowPair.id !== topPair.id && (
          <article className="rounded-md border border-amber-200/18 bg-black/30 p-3 backdrop-blur-md">
            <p className="text-xs text-amber-100/70">조율이 필요한 연결</p>
            <p className="mt-1 text-sm font-semibold">
              {lowPair.from.name} × {lowPair.to.name} · {lowPair.score}점
            </p>
            <p className="mt-1 text-xs leading-[1.5] text-white/58">{lowPair.summary}</p>
          </article>
        )}
      </>
    ) : null;

  const addPerson = () => {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('이름은 2자 이상 입력해 주세요.');
      return;
    }

    if (people.length >= 8) {
      setError('별자리는 최대 8명까지 한눈에 볼 수 있어요.');
      return;
    }

    const nextPerson: Person = {
      id: `${Date.now()}-${hashString(`${trimmedName}-${mbti}`)}`,
      name: trimmedName.slice(0, 12),
      mbti
    };

    setPeople((prev) => [...prev, nextPerson]);
    setSelectedPersonId(nextPerson.id);
    setName('');
    setError('');
  };

  const removePerson = (personId: string) => {
    if (people.length <= 2) {
      setError('궁합 그래프에는 최소 2명이 필요해요.');
      return;
    }

    setPeople((prev) => {
      const nextPeople = prev.filter((person) => person.id !== personId);
      if (selectedPersonId === personId) {
        setSelectedPersonId(nextPeople[0].id);
      }
      return nextPeople;
    });
    setError('');
  };

  const resetPeople = () => {
    setPeople(DEFAULT_PEOPLE);
    setSelectedPersonId(DEFAULT_PEOPLE[0].id);
    setName('');
    setMbti('ENFP');
    setError('');
  };

  return (
    <section className="relative isolate overflow-hidden rounded-md border border-[color:var(--border)] bg-[radial-gradient(circle_at_20%_0%,rgba(94,231,167,0.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(246,200,95,0.12),transparent_30%),linear-gradient(135deg,rgba(16,18,22,0.98),rgba(26,27,30,0.94))] text-white shadow-[0_18px_70px_rgba(0,0,0,0.28)] animate-panel-reveal">
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative grid min-h-[720px] gap-5 px-4 py-5 md:min-h-[620px] md:grid-cols-[minmax(280px,360px)_1fr] md:px-6 md:py-6">
        <div className="z-10 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-emerald-200/80">Compatibility Constellation</p>
            <h2 className="mt-2 text-[28px] font-semibold leading-[1.12] md:text-[36px]">궁합 별자리</h2>
            <p className="mt-3 text-sm leading-[1.65] text-white/68">
              이름과 MBTI를 넣으면 사람들을 별자리처럼 배치하고, 관계의 온도를 연결선으로 보여줍니다.
            </p>
          </div>

          <div className="grid gap-3 rounded-md border border-white/10 bg-black/24 p-3 backdrop-blur-md">
            <div className="grid gap-2 sm:grid-cols-[1fr_116px] md:grid-cols-1">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-white/62">이름</span>
                <input
                  type="text"
                  value={name}
                  maxLength={12}
                  placeholder="예: 수빈"
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addPerson();
                    }
                  }}
                  className="h-10 rounded-md border border-white/12 bg-white/8 px-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-emerald-200/70 focus:ring-2 focus:ring-emerald-200/20"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-white/62">MBTI</span>
                <select
                  value={mbti}
                  onChange={(event) => setMbti(event.target.value as MbtiType)}
                  className="h-10 rounded-md border border-white/12 bg-white/8 px-3 text-sm text-white outline-none transition focus:border-emerald-200/70 focus:ring-2 focus:ring-emerald-200/20"
                >
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-zinc-950 text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addPerson} className="h-10 rounded-md bg-emerald-200 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-100">
                별 추가
              </button>
              <button type="button" onClick={resetPeople} className="h-10 rounded-md border border-white/14 bg-white/8 px-4 text-sm font-semibold text-white/82 transition hover:bg-white/14">
                초기화
              </button>
            </div>

            {error && <p className="rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {people.map((person) => {
              const active = person.id === selectedPerson.id;

              return (
                <span
                  key={person.id}
                  className={`inline-flex h-9 items-center overflow-hidden rounded-full border text-xs font-semibold transition ${
                    active ? 'border-emerald-200 bg-emerald-200 text-zinc-950' : 'border-white/12 bg-white/8 text-white/78 hover:bg-white/14'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedPersonId(person.id)} className="flex h-full items-center gap-2 pl-3 pr-2">
                    <span>{person.name}</span>
                    <span className={active ? 'text-zinc-700' : 'text-white/46'}>{person.mbti}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${person.name} 제거`}
                    onClick={() => removePerson(person.id)}
                    className={`grid h-5 w-5 place-items-center rounded-full text-[13px] transition ${
                      active ? 'bg-zinc-950/10 text-zinc-800 hover:bg-zinc-950/18' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    ×
                  </button>
                  <span className="w-2" aria-hidden="true" />
                </span>
              );
            })}
          </div>

          <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/50">선택한 별</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {selectedPerson.name} <span className="text-sm text-emerald-200">{selectedPerson.mbti}</span>
                </p>
              </div>
              {topPair && <strong className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-emerald-100">최고 {topPair.score}점</strong>}
            </div>

            <div className="grid gap-2">
              {selectedPairs.slice(0, 3).map((pair) => {
                const partner = pair.from.id === selectedPerson.id ? pair.to : pair.from;

                return (
                  <article key={pair.id} className="rounded-md border border-white/9 bg-white/[0.06] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {partner.name} <span className="text-xs text-white/46">{partner.mbti}</span>
                      </p>
                      <span className="text-sm font-bold" style={{ color: pair.color }}>
                        {pair.score}점
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-[1.55] text-white/58">{pair.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-md md:min-h-0">
          <ConstellationCanvas people={people} pairs={pairs} selectedPersonId={selectedPerson.id} onSelect={setSelectedPersonId} />

          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-xs text-white/62 backdrop-blur-md">
            별을 눌러 관계 보기
          </div>

          {topPair && <div className="pointer-events-none absolute bottom-3 left-3 right-3 hidden gap-2 md:grid md:grid-cols-2">{renderSummaryCards()}</div>}
        </div>

        {topPair && <div className="grid gap-2 md:hidden">{renderSummaryCards()}</div>}
      </div>
    </section>
  );
}
