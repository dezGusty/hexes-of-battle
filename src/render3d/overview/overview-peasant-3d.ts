import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { applyUnitRimLighting } from '../units/unit-rim-lighting';
import { applyRiggedTeamAndBannerShader, getSharedWhiteTexture, parseColorToHex } from '../units/unit-mesh-builder';

export const OVERVIEW_PEASANT_GLB_PATH = 'models/units/peasant_rigged.glb';
export const OVERVIEW_SPEARMAN_GLB_PATH = 'models/units/spearman_rigged.glb';
const IDLE_PROBABILITY = 0.85;
const PEASANT_IDLE_CLIPS = ['idle_stance', 'idle_wipe_forehead', 'idle_shift_weight'] as const;
const ALL_PEASANT_CLIP_NAMES = [
  ...PEASANT_IDLE_CLIPS,
  'combat_defensive_stance',
  'combat_move_advance',
  'combat_attack_poke',
] as const;

const SPEARMAN_IDLE_CLIPS = ['idle_stance'] as const;
const ALL_SPEARMAN_CLIP_NAMES = [
  'idle_stance',
  'combat_defensive_stance',
  'combat_move_advance',
  'combat_attack_poke',
  'death',
] as const;

interface CachedRiggedGlb {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

interface OverviewRiggedUnitSpec {
  glbPath: string;
  groupName: string;
  placeholderName: string;
  idleClipNames: readonly string[];
  allClipNames: readonly string[];
}

export interface OverviewPeasantOptions {
  playerColor?: string | number;
  bannerName?: string;
}

const sharedOverviewMaterialCache = new WeakMap<THREE.Material, Map<string, THREE.MeshStandardMaterial>>();

function nextRand(state: number): { value: number; next: number } {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return { value: next / 4294967296, next };
}

function createOverviewRiggedUnitHelpers(spec: OverviewRiggedUnitSpec) {
  let cachedGlb: CachedRiggedGlb | null = null;
  let glbPromise: Promise<CachedRiggedGlb | null> | null = null;

  const preload = (basePath: string = ''): Promise<CachedRiggedGlb | null> => {
    if (cachedGlb) {
      return Promise.resolve(cachedGlb);
    }
    if (glbPromise) {
      return glbPromise;
    }
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    const loader = new GLTFLoader();
    const url = basePath ? `${basePath.replace(/\/$/, '')}/${spec.glbPath}` : spec.glbPath;

    glbPromise = new Promise<CachedRiggedGlb | null>((resolve) => {
      try {
        loader.load(
          url,
          (gltf) => {
            if (gltf?.scene) {
              cachedGlb = {
                scene: gltf.scene,
                animations: gltf.animations ?? [],
              };
              resolve(cachedGlb);
            } else {
              resolve(null);
            }
          },
          undefined,
          () => {
            glbPromise = null;
            resolve(null);
          }
        );
      } catch {
        glbPromise = null;
        resolve(null);
      }
    });

    return glbPromise;
  };

  const populateGroupFromGlb = (
    group: THREE.Group,
    template: CachedRiggedGlb,
    seed: number,
    options?: OverviewPeasantOptions
  ): void => {
    group.clear();
    const teamColorHex = options?.playerColor !== undefined ? parseColorToHex(options.playerColor) : 0x8c929a;
    const resolvedBanner = options?.bannerName ?? 'banner7.png';
    group.userData.teamColorHex = teamColorHex;
    group.userData.bannerName = resolvedBanner;

    const whiteMap = getSharedWhiteTexture();
    const cloned = SkeletonUtils.clone(template.scene);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        const hasMaskColor = Boolean(mesh.geometry?.attributes?.color);
        const hasUv1 = Boolean(mesh.geometry?.attributes?.uv1);
        const matKey = hasMaskColor ? `${teamColorHex}_${resolvedBanner}` : 'shared';
        if (mesh.material) {
          const origMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const sharedMats = origMats.map((origMat) => {
            let matMap = sharedOverviewMaterialCache.get(origMat);
            if (!matMap) {
              matMap = new Map();
              sharedOverviewMaterialCache.set(origMat, matMap);
            }
            let cachedMat = matMap.get(matKey);
            if (!cachedMat) {
              cachedMat = origMat.clone() as THREE.MeshStandardMaterial;
              cachedMat.transparent = false;
              cachedMat.opacity = 1.0;
              cachedMat.vertexColors = false;
              cachedMat.userData = { ...cachedMat.userData, isSharedAsset: true };
              applyUnitRimLighting(cachedMat);
              if (!cachedMat.map) {
                cachedMat.map = whiteMap;
              }
              if (hasMaskColor) {
                applyRiggedTeamAndBannerShader(cachedMat, teamColorHex, resolvedBanner, hasUv1);
              }
              matMap.set(matKey, cachedMat);
            }
            return cachedMat;
          });
          mesh.material = Array.isArray(mesh.material) ? sharedMats : sharedMats[0];
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

    const idleClips = spec.idleClipNames.filter((name) => Boolean(actions[name]));
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

    const r0 = nextRand(seed * 48271 + 17);
    const r1 = nextRand(r0.next);
    let state: 'none' | 'playing' = 'none';
    let duration = 5.5 + r0.value * 4.5;
    let elapsed = r1.value * duration;
    let rngState = r1.next;

    const controller = {
      actions,
      mixer,
      playAnimation: (name: string, fade?: number) => playAnimation(name, fade),
      update: (dt: number) => mixer.update(dt),
    };
    group.userData.peasantController = controller;

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
  };

  const createModel = (seed = 707, options?: OverviewPeasantOptions): THREE.Group => {
    const group = new THREE.Group();
    group.name = spec.groupName;
    group.userData.teamColorHex = options?.playerColor !== undefined ? parseColorToHex(options.playerColor) : 0x8c929a;
    group.userData.bannerName = options?.bannerName ?? 'banner7.png';

    if (cachedGlb) {
      populateGroupFromGlb(group, cachedGlb, seed, options);
    } else {
      const placeholder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b5c49, roughness: 0.9 })
      );
      placeholder.name = spec.placeholderName;
      placeholder.position.y = 0.25;
      group.add(placeholder);

      const fallbackMixer = new THREE.AnimationMixer(group);
      const fallbackActions: Record<string, THREE.AnimationAction> = {};
      for (const clipName of spec.allClipNames) {
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

      void preload().then((loaded) => {
        if (loaded) {
          populateGroupFromGlb(group, loaded, seed, options);
        }
      });
    }

    return group;
  };

  return { preload, createModel };
}

const peasantHelpers = createOverviewRiggedUnitHelpers({
  glbPath: OVERVIEW_PEASANT_GLB_PATH,
  groupName: 'OverviewPeasant',
  placeholderName: 'PeasantGlbPlaceholder',
  idleClipNames: PEASANT_IDLE_CLIPS,
  allClipNames: ALL_PEASANT_CLIP_NAMES,
});

const spearmanHelpers = createOverviewRiggedUnitHelpers({
  glbPath: OVERVIEW_SPEARMAN_GLB_PATH,
  groupName: 'OverviewSpearman',
  placeholderName: 'SpearmanGlbPlaceholder',
  idleClipNames: SPEARMAN_IDLE_CLIPS,
  allClipNames: ALL_SPEARMAN_CLIP_NAMES,
});

/**
 * Preloads `models/units/peasant_rigged.glb` once so global overview armies
 * and the battle map share the single rigged, textured peasant model.
 */
export function preloadOverviewPeasantGlb(basePath: string = ''): Promise<CachedRiggedGlb | null> {
  return peasantHelpers.preload(basePath);
}

/**
 * Returns the rigged, textured `peasant_rigged.glb` model for the global overview map
 * and Model Explorer, with cow-style occasional idle animations (85% static, 15% random idle).
 */
export function createOverviewPeasantModel(
  seed = 707,
  options?: OverviewPeasantOptions
): THREE.Group {
  return peasantHelpers.createModel(seed, options);
}

/**
 * Preloads `models/units/spearman_rigged.glb` once so global overview armies
 * and the battle map share the single rigged, textured spearman model.
 */
export function preloadOverviewSpearmanGlb(basePath: string = ''): Promise<CachedRiggedGlb | null> {
  return spearmanHelpers.preload(basePath);
}

/**
 * Returns the rigged, textured `spearman_rigged.glb` model for the global overview map
 * and Model Explorer, with player color bound to the helmet and player banner bound to the shield.
 */
export function createOverviewSpearmanModel(
  seed = 809,
  options?: OverviewPeasantOptions
): THREE.Group {
  return spearmanHelpers.createModel(seed, options);
}
