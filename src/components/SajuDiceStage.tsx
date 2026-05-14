import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as CANNON from 'cannon-es';

type SajuDiceStageProps = {
  diceCount: number;
  rollSignal: number;
  onRollStart: () => void;
  onRollResult: (values: number[]) => void;
};

type DiceObject = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material[]>;
  outline: THREE.Mesh;
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  body: CANNON.Body;
  spinOffset: number;
  isReturning: boolean;
};

const FRUSTUM_SIZE = 22;
const SAFE_LIMIT = 8.8;
const WALL_DISTANCE = 11.5;
const BOX_SIZE = 2.35;
const dicePalette = ['#EAA14D', '#E05A47', '#4D9BEA', '#5FB376', '#D869A8', '#F2C94C', '#8D6FE8', '#FFFFFF'];
const faceValues = [1, 6, 2, 5, 3, 4];
const faceNormals = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1)
];

export default function SajuDiceStage({ diceCount, rollSignal, onRollStart, onRollResult }: SajuDiceStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rollRef = useRef<(() => void) | null>(null);
  const previousSignalRef = useRef(rollSignal);
  const onRollStartRef = useRef(onRollStart);
  const onRollResultRef = useRef(onRollResult);

  useEffect(() => {
    onRollStartRef.current = onRollStart;
    onRollResultRef.current = onRollResult;
  }, [onRollStart, onRollResult]);

  useEffect(() => {
    if (rollSignal === previousSignalRef.current) return;
    previousSignalRef.current = rollSignal;
    rollRef.current?.();
  }, [rollSignal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const root: HTMLDivElement = container;

    let animationId = 0;
    let isHolding = false;
    let needsResultCheck = false;
    let isRolling = false;
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -14);
    const diceObjects: DiceObject[] = [];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F6F3EB');

    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 1000);
    camera.position.set(48, 48, 48);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.userSelect = 'none';
    renderer.domElement.setAttribute('aria-label', '주사위 굴림 캔버스');
    root.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.9);
    const keyLight = new THREE.DirectionalLight('#ffffff', 0.55);
    keyLight.position.set(8, 16, 10);
    scene.add(ambientLight, keyLight);

    const world = new CANNON.World();
    world.gravity.set(0, -38, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as unknown as { iterations: number }).iterations = 20;
    world.allowSleep = true;

    const wallMaterial = new CANNON.Material('wall');
    const diceMaterial = new CANNON.Material('dice');
    world.addContactMaterial(
      new CANNON.ContactMaterial(wallMaterial, diceMaterial, {
        friction: 0.32,
        restitution: 0.58
      })
    );

    createPhysicsWalls(world, wallMaterial);
    createDice();
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    rollRef.current = rollFromCenter;
    animate();

    return () => {
      rollRef.current = null;
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.cancelAnimationFrame(animationId);
      disposeDice();
      renderer.dispose();
      renderer.domElement.remove();
    };

    function resize() {
      const rect = root.getBoundingClientRect();
      const width = Math.max(300, Math.floor(rect.width));
      const height = Math.max(300, Math.floor(rect.height));
      const aspect = width / height;

      camera.left = (-FRUSTUM_SIZE * aspect) / 2;
      camera.right = (FRUSTUM_SIZE * aspect) / 2;
      camera.top = FRUSTUM_SIZE / 2;
      camera.bottom = -FRUSTUM_SIZE / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function createDice() {
      const geometry = new RoundedBoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE, 4, 0.36);
      const outlineGeometry = geometry.clone();
      const shadowGeometry = new THREE.CircleGeometry(BOX_SIZE * 0.62, 32);
      const shape = new CANNON.Box(new CANNON.Vec3(BOX_SIZE / 2, BOX_SIZE / 2, BOX_SIZE / 2));
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#725349', side: THREE.BackSide });
      const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#725349', transparent: true, opacity: 0.18 });

      for (let index = 0; index < diceCount; index += 1) {
        const color = dicePalette[index % dicePalette.length];
        const materials = [1, 6, 2, 5, 3, 4].map((number) => new THREE.MeshBasicMaterial({ map: createDiceTexture(number, color) }));
        const mesh = new THREE.Mesh(geometry, materials);
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        const startX = (index - (diceCount - 1) / 2) * 2.45;
        const body = new CANNON.Body({
          mass: 5,
          material: diceMaterial,
          shape,
          position: new CANNON.Vec3(startX, BOX_SIZE + 0.8, 0),
          sleepSpeedLimit: 0.45
        });

        body.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        outline.scale.setScalar(1.055);
        scene.add(mesh, outline, shadow);
        world.addBody(body);
        diceObjects.push({ mesh, outline, shadow, body, spinOffset: 0, isReturning: false });
      }
    }

    function disposeDice() {
      diceObjects.forEach((object) => {
        scene.remove(object.mesh, object.outline, object.shadow);
        world.removeBody(object.body);
        object.mesh.geometry.dispose();
        object.outline.geometry.dispose();
        object.shadow.geometry.dispose();
        object.mesh.material.forEach((material) => {
          const mappedMaterial = material as THREE.MeshBasicMaterial;
          mappedMaterial.map?.dispose();
          mappedMaterial.dispose();
        });
        disposeMaterial(object.outline.material);
        disposeMaterial(object.shadow.material);
      });
      diceObjects.length = 0;
    }

    function handlePointerDown(event: PointerEvent) {
      event.preventDefault();
      isHolding = true;
      needsResultCheck = false;
      isRolling = true;
      onRollStartRef.current();
      updateMousePosition(event);

      diceObjects.forEach((object) => {
        object.body.wakeUp();
        object.spinOffset = Math.random() * 100;
        object.isReturning = false;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isHolding) return;
      event.preventDefault();
      updateMousePosition(event);
    }

    function handlePointerUp() {
      if (!isHolding) return;
      isHolding = false;
      releaseDice();
    }

    function updateMousePosition(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function rollFromCenter() {
      if (isRolling) return;
      isRolling = true;
      isHolding = false;
      needsResultCheck = false;
      onRollStartRef.current();

      diceObjects.forEach((object, index) => {
        object.isReturning = false;
        object.body.wakeUp();
        object.body.position.set((index - (diceObjects.length - 1) / 2) * 2.3, 9 + Math.random() * 4, (Math.random() - 0.5) * 4);
        object.body.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        applyThrowForce(object.body);
      });

      window.setTimeout(() => {
        needsResultCheck = true;
      }, 650);
    }

    function releaseDice() {
      diceObjects.forEach((object) => {
        const { body } = object;
        const isOutside = Math.abs(body.position.x) > SAFE_LIMIT || Math.abs(body.position.z) > SAFE_LIMIT;

        if (isOutside) {
          object.isReturning = true;
          return;
        }

        body.wakeUp();
        applyThrowForce(body);
      });

      window.setTimeout(() => {
        needsResultCheck = true;
      }, 650);
    }

    function animate() {
      animationId = window.requestAnimationFrame(animate);

      if (isHolding) {
        raycaster.setFromCamera(mouse, camera);
        const targetPoint = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(dragPlane, targetPoint);

        if (intersect) {
          const time = performance.now() * 0.01;

          diceObjects.forEach((object, index) => {
            const offsetX = Math.sin(time + index) * 1.0;
            const offsetZ = Math.cos(time + index * 2) * 1.0;
            object.body.position.x += (targetPoint.x + offsetX - object.body.position.x) * 0.25;
            object.body.position.y += (14 - object.body.position.y) * 0.25;
            object.body.position.z += (targetPoint.z + offsetZ - object.body.position.z) * 0.25;
            object.body.quaternion.setFromEuler(time * 2 + object.spinOffset, time * 3 + object.spinOffset, time * 1.5);
            object.body.velocity.set(0, 0, 0);
            object.body.angularVelocity.set(0, 0, 0);
            object.isReturning = false;
          });
        }
      } else {
        const time = performance.now() * 0.01;

        diceObjects.forEach((object) => {
          if (!object.isReturning) return;

          object.body.position.x += (0 - object.body.position.x) * 0.15;
          object.body.position.z += (0 - object.body.position.z) * 0.15;
          object.body.position.y += (12 - object.body.position.y) * 0.1;
          object.body.quaternion.setFromEuler(time * 5, time * 5, 0);
          object.body.velocity.set(0, 0, 0);
          object.body.angularVelocity.set(0, 0, 0);

          if (Math.abs(object.body.position.x) < SAFE_LIMIT && Math.abs(object.body.position.z) < SAFE_LIMIT) {
            object.isReturning = false;
            object.body.wakeUp();
            applyThrowForce(object.body);
          }
        });

        world.step(1 / 60);
      }

      syncMeshes();

      if (needsResultCheck && diceObjects.every(isDiceStopped)) {
        needsResultCheck = false;
        isRolling = false;
        onRollResultRef.current(calculateResult(diceObjects));
      }

      renderer.render(scene, camera);
    }

    function syncMeshes() {
      diceObjects.forEach(({ mesh, outline, shadow, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        outline.position.copy(mesh.position);
        outline.quaternion.copy(mesh.quaternion);
        shadow.position.x = body.position.x;
        shadow.position.z = body.position.z;

        const height = Math.max(0, body.position.y - 1);
        shadow.scale.setScalar(Math.max(0.45, 1 - height * 0.04));
        shadow.material.opacity = Math.max(0, 0.2 - height * 0.012);
      });
    }
  }, [diceCount]);

  return <div ref={containerRef} className="h-[300px] w-full overflow-hidden rounded-md border border-line bg-[#F6F3EB] sm:h-[340px] md:h-[460px]" />;
}

function createPhysicsWalls(world: CANNON.World, material: CANNON.Material) {
  const floorBody = new CANNON.Body({ mass: 0, material });
  floorBody.addShape(new CANNON.Plane());
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(floorBody);

  const createWall = (x: number, z: number, rotation: number) => {
    const body = new CANNON.Body({ mass: 0, material });
    body.addShape(new CANNON.Plane());
    body.position.set(x, 0, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
    world.addBody(body);
  };

  createWall(WALL_DISTANCE, 0, -Math.PI / 2);
  createWall(-WALL_DISTANCE, 0, Math.PI / 2);
  createWall(0, -WALL_DISTANCE, 0);
  createWall(0, WALL_DISTANCE, Math.PI);
}

function createDiceTexture(number: number, colorHex: string) {
  const size = 256;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = size;
  canvas.height = size;

  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = colorHex;
  context.fillRect(0, 0, size, size);

  const isTraditional = colorHex === '#FFFFFF';
  const dotColor = isTraditional ? (number === 1 || number === 4 ? '#E03E3E' : '#331e18') : '#FFFFFF';
  const dotSize = number === 1 && isTraditional ? size / 3.4 : size / 5;
  const center = size / 2;
  const q1 = size / 4;
  const q3 = (size * 3) / 4;

  context.fillStyle = dotColor;

  const drawDot = (x: number, y: number) => {
    context.beginPath();
    context.arc(x, y, dotSize / 2, 0, Math.PI * 2);
    context.fill();
  };

  if (number === 1) drawDot(center, center);
  if (number === 2) {
    drawDot(q1, q1);
    drawDot(q3, q3);
  }
  if (number === 3) {
    drawDot(q1, q1);
    drawDot(center, center);
    drawDot(q3, q3);
  }
  if (number === 4) {
    drawDot(q1, q1);
    drawDot(q3, q1);
    drawDot(q1, q3);
    drawDot(q3, q3);
  }
  if (number === 5) {
    drawDot(q1, q1);
    drawDot(q3, q1);
    drawDot(center, center);
    drawDot(q1, q3);
    drawDot(q3, q3);
  }
  if (number === 6) {
    drawDot(q1, q1);
    drawDot(q3, q1);
    drawDot(q1, center);
    drawDot(q3, center);
    drawDot(q1, q3);
    drawDot(q3, q3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function applyThrowForce(body: CANNON.Body) {
  const xDist = -body.position.x;
  const zDist = -body.position.z;

  body.velocity.set(xDist * 1.45 + (Math.random() - 0.5) * 15, -14 - Math.random() * 10, zDist * 1.45 + (Math.random() - 0.5) * 15);
  body.angularVelocity.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 34, (Math.random() - 0.5) * 34);
}

function calculateResultForDice(mesh: THREE.Mesh) {
  let maxDot = -Infinity;
  let resultValue = 1;

  faceNormals.forEach((normal, index) => {
    const worldNormal = normal.clone().applyQuaternion(mesh.quaternion);
    if (worldNormal.y > maxDot) {
      maxDot = worldNormal.y;
      resultValue = faceValues[index];
    }
  });

  return resultValue;
}

function calculateResult(diceObjects: DiceObject[]) {
  return diceObjects.map(({ mesh }) => calculateResultForDice(mesh));
}

function isDiceStopped(object: DiceObject) {
  return (
    !object.isReturning &&
    object.body.velocity.lengthSquared() <= 0.1 &&
    object.body.angularVelocity.lengthSquared() <= 0.1
  );
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}
