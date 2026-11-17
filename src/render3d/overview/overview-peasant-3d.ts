import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { applyUnitRimLighting } from '../units/unit-rim-lighting';

export const OVERVIEW_PEASANT_GLB_PATH = 'models/units/peasant_rigged.glb';
const IDLE_PROBABILITY = 0.85;
const IDLE_CLIP_NAMES = ['idle_stance', 'idle_wipe_forehead', 'idle_shift_weight'] as const;
const ALL_PEASANT_CLIP_NAMES = [
  ...IDLE_CLIP_NAMES,
  'combat_defensive_stance',
  'combat_move_advance',
  'combat_attack_poke',
] as const;

interface CachedPeasantGlb {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

let cachedPeasantGlb: CachedPeasantGlb | null = null;
let peasantGlbPromise: Promise<CachedPeasantGlb | null> | null = null;

function nextRand(state: number): { value: number; next: number } {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return { value: next / 4294967296, next };
}

/**
 * Preloads `models/units/peasant_rigged.glb` once so global overview armies
 * and the battle map share the single rigged, textured peasant model.
 */
export function preloadOverviewPeasantGlb(basePath: string = ''): Promise<CachedPeasantGlb | null> {
  if (cachedPeasantGlb) {
    return Promise.resolve(cachedPeasantGlb);
  }
  if (peasantGlbPromise) {
    return peasantGlbPromise;
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const loader = new GLTFLoader();
  const url = basePath ? `${basePath.replace(/\/$/, '')}/${OVERVIEW_PEASANT_GLB_PATH}` : OVERVIEW_PEASANT_GLB_PATH;

  peasantGlbPromise = new Promise<CachedPeasantGlb | null>((resolve) => {
    try {
      loader.load(
        url,
        (gltf) => {
          if (gltf?.scene) {
            cachedPeasantGlb = {
              scene: gltf.scene,
              animations: gltf.animations ?? [],
            };
            resolve(cachedPeasantGlb);
          } else {
            resolve(null);
          }
        },
        undefined,
        () => {
          peasantGlbPromise = null;
          resolve(null);
        }
      );
    } catch {
      peasantGlbPromise = null;
      resolve(null);
    }
  });

  return peasantGlbPromise;
}

function populateGroupFromGlb(group: THREE.Group, template: CachedPeasantGlb, seed: number): void {
  group.clear();
  const cloned = SkeletonUtils.clone(template.scene);
  cloned.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      if (mesh.material) {
        const origMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const clonedMats = origMats.map((origMat) => {
          const matClone = origMat.clone() as THREE.MeshStandardMaterial;
          matClone.transparent = false;
          matClone.opacity = 1.0;
          applyUnitRimLighting(matClone);
          return matClone;
        });
        mesh.material = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];
      }
    }
  });
  group.add(cloned);

  const mixer = new THREE.AnimationMixer(cloned);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of template.animations) {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    actions[clip.name] = action;
  }

  const idleClips = IDLE_CLIP_NAMES.filter((name) => Boolean(actions[name]));
  const stanceAction = actions['idle_stance'] ?? (idleClips[0] ? actions[idleClips[0]] : undefined);
  let activeAction: THREE.AnimationAction | null = null;

  const setStaticStancePose = () => {
    mixer.stopAllAction();
    if (stanceAction) {
      stanceAction.reset();
      stanceAction.setEffectiveWeight(1);
      stanceAction.setEffectiveTimeScale(0);
      stanceAction.time = 0;
      stanceAction.play();
      mixer.update(0);
    }
    activeAction = stanceAction ?? null;
  };

  const playAnimation = (name: string, fadeDuration = 0.25): THREE.AnimationAction | null => {
    const next = actions[name];
    if (!next) return null;
    next.reset();
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();
    if (activeAction && activeAction !== next) {
      activeAction.crossFadeTo(next, fadeDuration, false);
    }
    activeAction = next;
    return next;
  };

  setStaticStancePose();

  // Desynced initial animation state (85% no animation, 15% random idle animation)
  const r0 = nextRand(seed * 48271 + 17);
  const r1 = nextRand(r0.next);
  let state: 'none' | 'playing' = 'none';
  let duration = 5.5 + r0.value * 4.5;
  let elapsed = r1.value * duration;
  let rngState = r1.next;

  group.userData.peasantController = {
    actions,
    mixer,
    playAnimation: (name: string, fade?: number) => playAnimation(name, fade),
    update: (dt: number) => mixer.update(dt),
  };

  group.userData.updateAnimation = (dt: number) => {
    elapsed += dt;

    if (elapsed >= duration) {
      if (state === 'none') {
        const rRoll = nextRand(rngState);
        const rChoice = nextRand(rRoll.next);
        rngState = rChoice.next;
        elapsed = 0;

        if (rRoll.value >= IDLE_PROBABILITY && idleClips.length > 0) {
          const clipName = idleClips[Math.floor(rChoice.value * idleClips.length) % idleClips.length];
          const action = playAnimation(clipName, 0.25);
          state = 'playing';
          duration = action ? Math.max(0.5, action.getClip().duration) : 1.5;
        } else {
          state = 'none';
          duration = 1.5 + rChoice.value * 2.5;
        }
      } else {
        const rNext = nextRand(rngState);
        rngState = rNext.next;
        state = 'none';
        elapsed = 0;
        duration = 1.5 + rNext.value * 2.5;
        setStaticStancePose();
      }
    }

    if (state === 'playing') {
      mixer.update(dt);
    }
  };
}

/**
 * Returns the rigged, textured `peasant_rigged.glb` model for the global overview map
 * and Model Explorer, with cow-style occasional idle animations (85% static, 15% random idle).
 */
export function createOverviewPeasantModel(seed = 707): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewPeasant';

  if (cachedPeasantGlb) {
    populateGroupFromGlb(group, cachedPeasantGlb, seed);
  } else {
    const placeholder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b5c49, roughness: 0.9 })
    );
    placeholder.name = 'PeasantGlbPlaceholder';
    placeholder.position.y = 0.25;
    group.add(placeholder);

    const fallbackMixer = new THREE.AnimationMixer(group);
    const fallbackActions: Record<string, THREE.AnimationAction> = {};
    for (const clipName of ALL_PEASANT_CLIP_NAMES) {
      const clip = new THREE.AnimationClip(clipName, 1.5, []);
      fallbackActions[clipName] = fallbackMixer.clipAction(clip);
    }
    group.userData.peasantController = {
      actions: fallbackActions,
      mixer: fallbackMixer,
      playAnimation: (name: string) => fallbackActions[name] ?? null,
      update: (dt: number) => fallbackMixer.update(dt),
    };
    group.userData.updateAnimation = (dt: number) => fallbackMixer.update(dt);

    void preloadOverviewPeasantGlb().then((loaded) => {
      if (loaded) {
        populateGroupFromGlb(group, loaded, seed);
      }
    });
  }

  return group;
}
