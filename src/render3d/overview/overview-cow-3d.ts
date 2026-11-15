import * as THREE from 'three';

export type CowAnimState = 'idle' | 'graze' | 'wag_tail';

export interface CowAnimationData {
  isOverviewCow: true;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  state: CowAnimState;
  elapsed: number;
  duration: number;
  rngState: number;
  idleProbability: number;
}

const cowHideTextureCache = new Map<number, THREE.DataTexture>();

function nextRand(state: number): { value: number; next: number } {
  let x = (state | 0) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return { value: ((x >>> 0) % 100000) / 100000, next: x >>> 0 };
}

/**
 * Generates a 128x128 black-and-white Holstein cowhide DataTexture
 * in the crisp 2010-2015 DX9 style.
 */
function getHolsteinCowTexture(variant: number): THREE.DataTexture {
  const key = ((variant % 4) + 4) % 4;
  const cached = cowHideTextureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const data = new Uint8Array(size * size * 4);

  // Deterministic organic black spot centers per variant
  const spots: Array<{ u: number; v: number; ru: number; rv: number }> = [];
  let rng = 1009 + key * 7919;
  for (let i = 0; i < 11; i++) {
    const r1 = nextRand(rng);
    const r2 = nextRand(r1.next);
    const r3 = nextRand(r2.next);
    const r4 = nextRand(r3.next);
    rng = r4.next;
    spots.push({
      u: r1.value,
      v: r2.value,
      ru: 0.09 + r3.value * 0.14,
      rv: 0.08 + r4.value * 0.13,
    });
  }

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let inSpot = false;
      for (let s = 0; s < spots.length; s++) {
        const sp = spots[s];
        // Toroidal wrap distance
        let du = Math.abs(u - sp.u);
        if (du > 0.5) du = 1.0 - du;
        let dv = Math.abs(v - sp.v);
        if (dv > 0.5) dv = 1.0 - dv;
        const wobble =
          Math.sin((u + s * 0.17) * Math.PI * 6) * 0.02 +
          Math.cos((v + s * 0.23) * Math.PI * 6) * 0.02;
        const d = (du / sp.ru) ** 2 + (dv / sp.rv) ** 2 + wobble * 3.0;
        if (d < 1.0) {
          inSpot = true;
          break;
        }
      }

      const grain = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 10;
      const idx = (y * size + x) * 4;
      if (inSpot) {
        data[idx] = Math.max(16, Math.min(42, 26 + grain));
        data[idx + 1] = Math.max(16, Math.min(42, 28 + grain));
        data[idx + 2] = Math.max(20, Math.min(48, 32 + grain));
      } else {
        data[idx] = Math.max(215, Math.min(250, 238 + grain));
        data[idx + 1] = Math.max(210, Math.min(246, 234 + grain));
        data[idx + 2] = Math.max(200, Math.min(238, 224 + grain));
      }
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cowHideTextureCache.set(key, tex);
  return tex;
}

export function countGroupTriangles(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geo = obj.geometry;
      if (geo.index) {
        total += geo.index.count / 3;
      } else {
        const pos = geo.getAttribute('position');
        if (pos) total += pos.count / 3;
      }
    }
  });
  return Math.round(total);
}

/**
 * Creates a ~500-triangle 2010-2015 DX9-style black-and-white cow mesh
 * with articulated headPivot (grazing) and tailPivot (fly-swatting wag).
 * Facing +Z by default, standing with hooves at y = 0.
 */
export function createOverviewCowModel(seed: number = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = `OverviewCow_${seed}`;

  const hideTex = getHolsteinCowTexture(seed);
  const hideMat = new THREE.MeshStandardMaterial({
    map: hideTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1d1f24,
    roughness: 0.75,
    metalness: 0.05,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf0ece2,
    roughness: 0.8,
    metalness: 0.02,
  });
  const muzzleMat = new THREE.MeshStandardMaterial({
    color: 0xd99f98,
    roughness: 0.7,
    metalness: 0.02,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xc9be9f,
    roughness: 0.65,
    metalness: 0.08,
  });
  const hoofMat = new THREE.MeshStandardMaterial({
    color: 0x26221e,
    roughness: 0.85,
    metalness: 0.06,
  });

  // 1. Torso: barrel-chested DX9-style cow body
  const torsoGeo = new THREE.SphereGeometry(0.24, 9, 6);
  torsoGeo.scale(0.88, 0.92, 1.55);
  const torso = new THREE.Mesh(torsoGeo, hideMat);
  torso.position.set(0, 0.44, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Udder (~24 tris)
  const udder = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 6, 4),
    muzzleMat
  );
  udder.scale.set(1.0, 0.72, 1.1);
  udder.position.set(0, 0.24, -0.14);
  group.add(udder);

  // 2. 4 Legs + Hooves (24 + 12 = 36 tris each -> 144 tris)
  const legOffsets: Array<[number, number]> = [
    [-0.12, 0.2],
    [0.12, 0.2],
    [-0.12, -0.2],
    [0.12, -0.2],
  ];
  for (let i = 0; i < legOffsets.length; i++) {
    const [lx, lz] = legOffsets[i];
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.032, 0.28, 5, 1),
      i % 2 === 0 ? whiteMat : hideMat
    );
    leg.position.set(lx, 0.17, lz);
    leg.castShadow = true;
    group.add(leg);

    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.038, 0.05, 5, 1),
      hoofMat
    );
    hoof.position.set(lx, 0.025, lz);
    group.add(hoof);
  }

  // 3. Head Pivot (for grazing / lowering head animation)
  const headPivot = new THREE.Group();
  headPivot.name = 'CowHeadPivot';
  headPivot.position.set(0, 0.48, 0.31);
  group.add(headPivot);

  // Neck (32 tris)
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.22, 8, 1),
    hideMat
  );
  neck.rotation.x = Math.PI * 0.28;
  neck.position.set(0, 0.04, 0.08);
  headPivot.add(neck);

  // Skull (64 tris)
  const skullGeo = new THREE.SphereGeometry(0.125, 8, 6);
  skullGeo.scale(0.88, 0.92, 1.12);
  const skull = new THREE.Mesh(skullGeo, hideMat);
  skull.position.set(0, 0.1, 0.19);
  skull.castShadow = true;
  headPivot.add(skull);

  // Snout / Muzzle (32 tris)
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.088, 0.13, 8, 1),
    muzzleMat
  );
  muzzle.rotation.x = Math.PI * 0.58;
  muzzle.position.set(0, 0.05, 0.31);
  headPivot.add(muzzle);

  // Ears (2 x 16 = 32 tris)
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.046, 5, 4),
      blackMat
    );
    ear.scale.set(1.3, 0.45, 0.65);
    ear.position.set(side * 0.12, 0.14, 0.16);
    ear.rotation.z = side * -0.35;
    headPivot.add(ear);

    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.085, 5),
      hornMat
    );
    horn.position.set(side * 0.085, 0.21, 0.17);
    horn.rotation.z = side * -0.55;
    horn.rotation.x = 0.25;
    headPivot.add(horn);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 5, 4),
      blackMat
    );
    eye.position.set(side * 0.088, 0.12, 0.25);
    headPivot.add(eye);
  }

  // 4. Tail Pivot (for fly-swatting wag animation)
  const tailPivot = new THREE.Group();
  tailPivot.name = 'CowTailPivot';
  tailPivot.position.set(0, 0.5, -0.35);
  tailPivot.rotation.x = 0.22;
  group.add(tailPivot);

  const tailShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.011, 0.24, 5, 1),
    whiteMat
  );
  tailShaft.position.set(0, -0.12, -0.02);
  tailPivot.add(tailShaft);

  const tailTuft = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.075, 5),
    blackMat
  );
  tailTuft.rotation.x = Math.PI;
  tailTuft.position.set(0, -0.25, -0.02);
  tailPivot.add(tailTuft);

  // Desynced initial animation state (85% idle, 15% random action)
  const r0 = nextRand(seed * 48271 + 17);
  const r1 = nextRand(r0.next);
  const initialIdleDuration = 5.5 + r0.value * 4.5;
  const animData: CowAnimationData = {
    isOverviewCow: true,
    headPivot,
    tailPivot,
    state: 'idle',
    elapsed: r1.value * initialIdleDuration,
    duration: initialIdleDuration,
    rngState: r1.next,
    idleProbability: 0.85,
  };
  group.userData = animData;

  return group;
}

export function triggerOverviewCowAnimation(
  cow: THREE.Object3D,
  anim: 'graze' | 'wag_tail'
): void {
  const data = cow.userData as CowAnimationData | undefined;
  if (!data?.isOverviewCow) return;
  data.state = anim;
  data.elapsed = 0;
  data.duration = anim === 'graze' ? 1.35 : 0.95;
}

export function updateOverviewCowAnimation(
  cow: THREE.Object3D,
  dtSeconds: number
): void {
  const data = cow.userData as CowAnimationData | undefined;
  if (!data?.isOverviewCow) return;

  data.elapsed += dtSeconds;

  if (data.elapsed >= data.duration) {
    if (data.state === 'idle') {
      // Transition: 85% chance to remain idle for another interval, 15% chance to play a random animation
      const rRoll = nextRand(data.rngState);
      const rChoice = nextRand(rRoll.next);
      data.rngState = rChoice.next;
      data.elapsed = 0;

      if (rRoll.value >= data.idleProbability) {
        if (rChoice.value < 0.5) {
          data.state = 'graze';
          data.duration = 1.35;
        } else {
          data.state = 'wag_tail';
          data.duration = 0.95;
        }
      } else {
        data.state = 'idle';
        data.duration = 1.0 + rChoice.value * 1.5;
      }
    } else {
      // Action finished -> return to idle
      const rNext = nextRand(data.rngState);
      data.rngState = rNext.next;
      data.state = 'idle';
      data.elapsed = 0;
      data.duration = 1.2 + rNext.value * 1.8;
    }
  }

  const tNorm = Math.min(1, Math.max(0, data.elapsed / Math.max(0.001, data.duration)));

  if (data.state === 'graze') {
    // Smoothly lower head to eat grass and raise back up
    const envelope = Math.sin(tNorm * Math.PI);
    const munch = Math.sin(data.elapsed * 16.0) * 0.06 * envelope;
    data.headPivot.rotation.x = 0.62 * envelope + munch;
    data.tailPivot.rotation.z *= 0.85;
    data.tailPivot.rotation.x = 0.22;
  } else if (data.state === 'wag_tail') {
    // Brisk tail wag to clear flies
    const envelope = Math.sin(tNorm * Math.PI);
    data.tailPivot.rotation.z = Math.sin(data.elapsed * 24.0) * 0.58 * envelope;
    data.tailPivot.rotation.x = 0.22 - 0.35 * envelope;
    data.headPivot.rotation.x *= 0.85;
  } else {
    // Idle: subtle breathing/resting pose
    data.headPivot.rotation.x = Math.sin(data.elapsed * 1.1) * 0.015;
    data.tailPivot.rotation.z = 0;
    data.tailPivot.rotation.x = 0.22;
  }
}
