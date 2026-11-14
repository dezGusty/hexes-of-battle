import * as THREE from 'three';
import { applyUnitRimLighting } from './unit-rim-lighting';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CreatureType } from '../../battle/creature';
import {
  BARBARIAN_TEXTURE_SIZE,
  BARBARIAN_TEXTURE_PATHS,
  BarbarianTexturePart,
  getBarbarianPartTexture,
  getBarbarianPartMaterial,
  applyBarbarianUVMapping,
} from './barbarian-textures';
import {
  HUMANOID_TEXTURE_SIZE,
  HUMANOID_TEXTURE_PATHS,
  getHumanoidPartTexture,
  getHumanoidPartMaterial,
  applyHumanoidUVMapping,
  generatePeasantFacePixels,
  generatePeasantClothPixels,
  generatePeasantPitchforkPixels,
  generateArcherFacePixels,
  generateArcherClothingPixels,
  generateArcherBowPixels,
  generateSpearmanFacePixels,
  generateSpearmanArmorPixels,
  generateSpearmanGearPixels,
} from './humanoid-unit-textures';
import {
  TREE_TEXTURE_SIZE,
  TREE_TEXTURE_PATHS,
  TreeTexturePart,
  getTreePartTexture,
  applyTreeUVMapping,
  generateTreeBarkPixels,
  generateTreeFoliagePixels,
} from './tree-textures';

export {
  BARBARIAN_TEXTURE_SIZE,
  BARBARIAN_TEXTURE_PATHS,
  type BarbarianTexturePart,
  getBarbarianPartTexture,
  getBarbarianPartMaterial,
  applyBarbarianUVMapping,
  HUMANOID_TEXTURE_SIZE,
  HUMANOID_TEXTURE_PATHS,
  getHumanoidPartTexture,
  getHumanoidPartMaterial,
  applyHumanoidUVMapping,
  generatePeasantFacePixels,
  generatePeasantClothPixels,
  generatePeasantPitchforkPixels,
  generateArcherFacePixels,
  generateArcherClothingPixels,
  generateArcherBowPixels,
  generateSpearmanFacePixels,
  generateSpearmanArmorPixels,
  generateSpearmanGearPixels,
  TREE_TEXTURE_SIZE,
  TREE_TEXTURE_PATHS,
  type TreeTexturePart,
  getTreePartTexture,
  applyTreeUVMapping,
  generateTreeBarkPixels,
  generateTreeFoliagePixels,
};

/**
 * Average 3D height of standard humanoid units in world space (feet at y=0 to helmet top at y=1.20).
 * Forest trees are scaled to ~75% of this height (~0.90 world units).
 */
/**
 * Global size scale for unit visuals.
 * Resized down from 0.7 to 75% of current size (0.7 * 0.75 = 0.525).
 */
export const UNIT_SIZE_SCALE = 0.525;
export const AVERAGE_UNIT_3D_HEIGHT = 1.20;
export const FOREST_TREE_TARGET_HEIGHT = AVERAGE_UNIT_3D_HEIGHT * 0.75; // 0.90

/**
 * Canonical 7 unit keys that have dedicated 3D models enabled.
 * HEAVY_KNIGHTS, HERO_COMMANDER, and BEHEMOTH are intentionally excluded for now.
 */
export const SUPPORTED_3D_UNIT_KEYS: readonly string[] = [
  'peasant',
  'peasant_archer',
  'swordsman',
  'spearman',
  'crossbowman',
  'barbarian',
  'slinger',
  'healer',
  'maceman',
  'armored_knight',
];

export const IGNORED_3D_UNIT_KEYS: readonly string[] = [
  'heavy_knights',
  'hero_commander',
  'behemoth',
];

export function normalizeUnitKey(type: CreatureType | string | number): string {
  const raw = String(type).toLowerCase().trim().replace(/-/g, '_');
  switch (raw) {
    case '0':
    case 'peasant':
      return 'peasant';
    case '1':
    case '5':
    case 'peasant_archer':
    case 'archer':
      return 'peasant_archer';
    case '2':
    case 'swordsman':
    case 'swordman':
      return 'swordsman';
    case '3':
    case 'spearman':
      return 'spearman';
    case '4':
    case 'crossbowman':
      return 'crossbowman';
    case '6':
    case 'barbarian':
      return 'barbarian';
    case '7':
    case 'heavy_knights':
      return 'heavy_knights';
    case '8':
    case 'behemoth':
      return 'behemoth';
    case '9':
    case 'hero_commander':
      return 'hero_commander';
    case '10':
    case 'slinger':
      return 'slinger';
    case '11':
    case 'healer':
      return 'healer';
    case '12':
    case 'maceman':
      return 'maceman';
    case '13':
    case 'armored_knight':
    case 'armoredknight':
    case 'armored-knight':
      return 'armored_knight';
    default:
      return raw;
  }
}

export function isUnit3DModelSupported(type: CreatureType | string | number): boolean {
  const key = normalizeUnitKey(type);
  if (IGNORED_3D_UNIT_KEYS.includes(key)) return false;
  return SUPPORTED_3D_UNIT_KEYS.includes(key);
}

export const UNIT_GLB_PATHS: Record<string, string> = {
  peasant: 'models/units/peasant.glb',
  peasant_archer: 'models/units/peasant_archer.glb',
  swordsman: 'models/units/swordsman.glb',
  spearman: 'models/units/spearman.glb',
  crossbowman: 'models/units/crossbowman.glb',
  barbarian: 'models/units/barbarian.glb',
  slinger: 'models/units/slinger.glb',
  healer: 'models/units/healer.glb',
  maceman: 'models/units/maceman.glb',
  armored_knight: 'models/units/armored_knight.glb',
};

let sharedWhiteMap: THREE.DataTexture | null = null;
export function getSharedWhiteTexture(): THREE.DataTexture {
  if (!sharedWhiteMap) {
    sharedWhiteMap = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    sharedWhiteMap.colorSpace = THREE.SRGBColorSpace;
    sharedWhiteMap.needsUpdate = true;
  }
  return sharedWhiteMap;
}

let sharedUnitOpaqueMaterial: THREE.MeshStandardMaterial | null = null;
export function getSharedUnitOpaqueMaterial(): THREE.MeshStandardMaterial {
  if (!sharedUnitOpaqueMaterial) {
    sharedUnitOpaqueMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.68,
      metalness: 0.14,
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      map: getSharedWhiteTexture(),
    });
    sharedUnitOpaqueMaterial.userData = { isSharedAsset: true };
    applyUnitRimLighting(sharedUnitOpaqueMaterial);
  }
  return sharedUnitOpaqueMaterial;
}

const sharedColorMaterialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
function makeMat(color: number, roughness = 0.75, metalness = 0.08): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness}_${metalness}`;
  let mat = sharedColorMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      map: getSharedWhiteTexture(),
    });
    mat.userData = { isSharedAsset: true };
    applyUnitRimLighting(mat);
    sharedColorMaterialCache.set(key, mat);
  }
  return mat;
}

export type ColorCode =
  | string
  | number
  | [number, number, number]
  | [number, number, number, number]
  | { r: number; g: number; b: number; a?: number }
  | { red: number; green: number; blue: number; alpha?: number };

export interface PlayerColorsConfig {
  player1?: ColorCode;
  player2?: ColorCode;
  hero?: ColorCode;
  [key: string]: ColorCode | undefined;
}

const DEFAULT_PLAYER_COLORS = {
  player1: 0x2f63c7,
  player2: 0xc73636,
  hero: 0xd4af37,
};

const currentPlayerColors = { ...DEFAULT_PLAYER_COLORS };

export function parseColorToHex(input: any, defaultHex: number = 0x2f63c7): number {
  if (input === undefined || input === null) return defaultHex;

  if (typeof input === 'number') {
    return Math.floor(input) & 0xffffff;
  }

  if (Array.isArray(input)) {
    if (input.length >= 3) {
      let [r, g, b] = input;
      if (r <= 1 && g <= 1 && b <= 1 && (r % 1 !== 0 || g % 1 !== 0 || b % 1 !== 0)) {
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
      }
      const nr = Math.min(255, Math.max(0, Math.round(r)));
      const ng = Math.min(255, Math.max(0, Math.round(g)));
      const nb = Math.min(255, Math.max(0, Math.round(b)));
      return (nr << 16) | (ng << 8) | nb;
    }
  }

  if (typeof input === 'object') {
    const r = input.r ?? input.red;
    const g = input.g ?? input.green;
    const b = input.b ?? input.blue;
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      let [nr, ng, nb] = [r, g, b];
      if (nr <= 1 && ng <= 1 && nb <= 1 && (nr % 1 !== 0 || ng % 1 !== 0 || nb % 1 !== 0)) {
        nr = Math.round(nr * 255);
        ng = Math.round(ng * 255);
        nb = Math.round(nb * 255);
      }
      const fr = Math.min(255, Math.max(0, Math.round(nr)));
      const fg = Math.min(255, Math.max(0, Math.round(ng)));
      const fb = Math.min(255, Math.max(0, Math.round(nb)));
      return (fr << 16) | (fg << 8) | fb;
    }
  }

  if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase();

    // RGB / RGBA: e.g. "rgb(47, 99, 199)" or "rgba(47, 99, 199, 1.0)"
    const rgbMatch = trimmed.match(/^rgba?\s*\(\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*[, ]\s*([0-9.]+)/);
    if (rgbMatch) {
      let r = parseFloat(rgbMatch[1]);
      let g = parseFloat(rgbMatch[2]);
      let b = parseFloat(rgbMatch[3]);
      if (r <= 1 && g <= 1 && b <= 1 && (r % 1 !== 0 || g % 1 !== 0 || b % 1 !== 0)) {
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
      }
      const nr = Math.min(255, Math.max(0, Math.round(r)));
      const ng = Math.min(255, Math.max(0, Math.round(g)));
      const nb = Math.min(255, Math.max(0, Math.round(b)));
      return (nr << 16) | (ng << 8) | nb;
    }

    // Hex: e.g. "#2f63c7" or "0x2f63c7" or "2f63c7"
    let hexStr = trimmed;
    if (hexStr.startsWith('0x')) hexStr = hexStr.slice(2);
    else if (hexStr.startsWith('#')) hexStr = hexStr.slice(1);

    if (hexStr.length >= 6) {
      const parsed = parseInt(hexStr.slice(0, 6), 16);
      if (!isNaN(parsed)) return parsed;
    } else if (hexStr.length === 3) {
      const r = parseInt(hexStr[0] + hexStr[0], 16);
      const g = parseInt(hexStr[1] + hexStr[1], 16);
      const b = parseInt(hexStr[2] + hexStr[2], 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r << 16) | (g << 8) | b;
      }
    }
  }

  return defaultHex;
}

export function parseColorToRgba(
  input: any,
  defaultHex: number = 0x2f63c7
): { r: number; g: number; b: number; a: number } {
  let alpha = 1.0;
  if (Array.isArray(input) && input.length >= 4 && typeof input[3] === 'number') {
    alpha = input[3];
  } else if (typeof input === 'object' && input !== null) {
    if (typeof (input.a ?? input.alpha) === 'number') {
      alpha = input.a ?? input.alpha;
    }
  } else if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase();
    const rgbaMatch = trimmed.match(/^rgba\s*\(\s*[0-9.]+\s*[, ]\s*[0-9.]+\s*[, ]\s*[0-9.]+\s*[,/ ]\s*([0-9.]+)\s*\)/);
    if (rgbaMatch) {
      alpha = parseFloat(rgbaMatch[1]);
    }
  }
  const hex = parseColorToHex(input, defaultHex);
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return { r, g, b, a: alpha };
}

let proceduralUnitTemplateCache: Map<string, THREE.Mesh> = new Map();
let glbUnitTemplateCache: WeakMap<THREE.Object3D, Map<string, THREE.Mesh>> = new WeakMap();

export function configurePlayerColors(config?: PlayerColorsConfig | any): void {
  if (!config) return;

  const p1 = config.player1 ?? config['0'] ?? config.p1 ?? config.blue ?? config.player_1;
  const p2 = config.player2 ?? config['1'] ?? config.p2 ?? config.red ?? config.player_2;
  const hero = config.hero ?? config.gold;

  if (p1 !== undefined) {
    currentPlayerColors.player1 = parseColorToHex(p1, DEFAULT_PLAYER_COLORS.player1);
  }
  if (p2 !== undefined) {
    currentPlayerColors.player2 = parseColorToHex(p2, DEFAULT_PLAYER_COLORS.player2);
  }
  if (hero !== undefined) {
    currentPlayerColors.hero = parseColorToHex(hero, DEFAULT_PLAYER_COLORS.hero);
  }

  proceduralUnitTemplateCache.clear();
  glbUnitTemplateCache = new WeakMap();
}

export function resetPlayerColorsToDefault(): void {
  currentPlayerColors.player1 = DEFAULT_PLAYER_COLORS.player1;
  currentPlayerColors.player2 = DEFAULT_PLAYER_COLORS.player2;
  currentPlayerColors.hero = DEFAULT_PLAYER_COLORS.hero;
  proceduralUnitTemplateCache.clear();
  glbUnitTemplateCache = new WeakMap();
}

export function getPlayerColorsConfig(): { player1: number; player2: number; hero: number } {
  return { ...currentPlayerColors };
}

function tryLoadInitialPlayerColorsFromDisk(): void {
  try {
    const proc = (globalThis as any).process;
    if (proc?.versions?.node) {
      const req = (globalThis as any).require;
      if (typeof req === 'function') {
        const fs = req('fs');
        const path = req('path');
        const p = path.resolve(proc.cwd(), 'public/combat_config.json');
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
          if (raw.playerColors || raw.player_colors || raw.teamColors) {
            configurePlayerColors(raw.playerColors ?? raw.player_colors ?? raw.teamColors);
          }
        }
      }
    }
  } catch {
    // Ignore in browser or when bundler treeshakes
  }
}
tryLoadInitialPlayerColorsFromDisk();

export function getTeamColorHex(armyAlignment: number, isHero: boolean = false): number {
  if (isHero) return currentPlayerColors.hero;
  return armyAlignment === 0 ? currentPlayerColors.player1 : currentPlayerColors.player2;
}

/**
 * Names of articulated limb nodes that animate independently in MeshRigidVisual.
 * All other decorative child meshes (helmets, trim, pauldrons, hands, boots,
 * quivers, tabards, belts, weapon blades/tines/guards, shield bosses, etc.)
 * are baked into their parent articulated limb's BufferGeometry with vertex colors
 * so adding geometric detail never increases draw calls or scene-graph overhead.
 */
export const ARTICULATED_LIMB_NAMES: ReadonlySet<string> = new Set([
  'Torso',
  'Clothing',
  'Head',
  'Arm_L',
  'Arm_R',
  'Leg_L',
  'Leg_R',
  'Weapon',
  'Shield',
  'Horse_Leg_Front_L',
  'Horse_Leg_Front_R',
  'Horse_Leg_Rear_L',
  'Horse_Leg_Rear_R',
]);

/**
 * Prepares a uncompacted Barbarian hierarchy (either procedural or loaded from GLB)
 * by applying custom UV projections for the 256x256 face, skin, clothing, and weapon
 * textures, grouping torso garments under the `Clothing` limb node, and setting the
 * Head sphere's base color to white so the full-color face texture is un-tinted.
 */
function prepareBarbarianHierarchyBeforeCompaction(rootMesh: THREE.Mesh): void {
  let clothingNode: THREE.Mesh | null = null;
  const clothingSubMeshes: THREE.Mesh[] = [];

  for (const child of rootMesh.children) {
    if (!(child as THREE.Mesh).isMesh) continue;
    const mesh = child as THREE.Mesh;
    const lower = mesh.name.toLowerCase();
    if (mesh.name === 'Clothing') {
      clothingNode = mesh;
    } else if (
      lower.includes('tabard') ||
      lower.includes('belt') ||
      lower.includes('fur') ||
      lower.includes('mantle')
    ) {
      clothingSubMeshes.push(mesh);
    }
  }

  if (!clothingNode && clothingSubMeshes.length > 0) {
    // Promote the first garment mesh (e.g. Tabard_Team) to `Clothing` and parent the rest under it
    clothingNode =
      clothingSubMeshes.find((m) => m.name.toLowerCase().includes('tabard')) ??
      clothingSubMeshes[0];
    for (const sub of clothingSubMeshes) {
      if (sub !== clothingNode) {
        rootMesh.remove(sub);
        clothingNode.add(sub);
      }
    }
    clothingNode.userData = { ...clothingNode.userData, originalPartName: clothingNode.name };
    clothingNode.name = 'Clothing';
  } else if (clothingNode && clothingSubMeshes.length > 0) {
    for (const sub of clothingSubMeshes) {
      rootMesh.remove(sub);
      clothingNode.add(sub);
    }
  }

  rootMesh.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    if (!mesh.geometry) return;
    // Clone geometry if shared so UV edits do not mutate other templates
    mesh.geometry = mesh.geometry.clone();

    const rawName = (mesh.userData?.originalPartName ?? mesh.name).toLowerCase();
    const parentName = (mesh.parent?.name ?? '').toLowerCase();

    if (mesh.name === 'Head' || rawName.includes('ear')) {
      applyBarbarianUVMapping(mesh.geometry, 'head_face');
      // Use white vertex color on the face sphere so barbarian_face.png's true colors appear
      mesh.material = makeMat(0xffffff, 0.72, 0.0);
    } else if (
      rawName.includes('helmet') ||
      rawName.includes('horn') ||
      parentName.includes('helmet')
    ) {
      applyBarbarianUVMapping(mesh.geometry, 'helmet_horn');
    } else if (mesh.name === 'Torso' || rawName.includes('neck')) {
      applyBarbarianUVMapping(mesh.geometry, 'torso_skin');
    } else if (
      mesh.name === 'Arm_L' ||
      mesh.name === 'Arm_R' ||
      rawName.includes('hand') ||
      rawName.includes('bracer') ||
      rawName.includes('pauldron') ||
      parentName.startsWith('arm_')
    ) {
      if (mesh.name !== 'Weapon' && !parentName.includes('weapon')) {
        applyBarbarianUVMapping(mesh.geometry, 'arm_skin');
      }
    } else if (rawName.includes('fur') || rawName.includes('mantle')) {
      applyBarbarianUVMapping(mesh.geometry, 'fur_mantle');
    } else if (rawName.includes('belt')) {
      applyBarbarianUVMapping(mesh.geometry, 'belt');
    } else if (mesh.name === 'Clothing' || rawName.includes('tabard') || rawName.includes('loincloth')) {
      applyBarbarianUVMapping(mesh.geometry, 'tabard');
    } else if (
      mesh.name === 'Leg_L' ||
      mesh.name === 'Leg_R' ||
      rawName.includes('boot') ||
      parentName.startsWith('leg_')
    ) {
      applyBarbarianUVMapping(mesh.geometry, 'leg_clothing');
    } else if (mesh.name === 'Weapon' && !rawName.includes('blade')) {
      applyBarbarianUVMapping(mesh.geometry, 'axe_shaft');
    } else if (rawName.includes('blade') || parentName === 'weapon') {
      applyBarbarianUVMapping(mesh.geometry, 'axe_blade');
    }
  });
}

function getBarbarianLimbMaterial(limbName: string): THREE.MeshStandardMaterial {
  switch (limbName) {
    case 'Head':
      return getBarbarianPartMaterial('face');
    case 'Weapon':
      return getBarbarianPartMaterial('weapon');
    case 'Clothing':
    case 'Leg_L':
    case 'Leg_R':
      return getBarbarianPartMaterial('clothing');
    case 'Torso':
    case 'Arm_L':
    case 'Arm_R':
    default:
      return getBarbarianPartMaterial('skin');
  }
}

/**
 * Prepares uncompacted peasant, archer, and spearman meshes with custom UV projections
 * and ensures face sphere materials are set to un-tinted white for accurate texture rendering.
 */
function prepareHumanoidHierarchyBeforeCompaction(
  rootMesh: THREE.Mesh,
  unitKey: string
): void {
  rootMesh.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    if (!mesh.geometry) return;
    mesh.geometry = mesh.geometry.clone();

    const rawName = (mesh.userData?.originalPartName ?? mesh.name).toLowerCase();
    const parentName = (mesh.parent?.name ?? '').toLowerCase();

    if (unitKey === 'peasant') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_head_face');
        mesh.material = makeMat(0xffffff, 0.76, 0.05);
      } else if (rawName.includes('hood') || rawName.includes('helmet') || rawName.includes('hair')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_hood');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (
        rawName.includes('hand') ||
        rawName.includes('neck') ||
        rawName.includes('ear') ||
        rawName.includes('forearm') ||
        (mesh.name.startsWith('Arm_') && rawName.includes('hand'))
      ) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_leg');
      } else if (mesh.name === 'Weapon' && !rawName.includes('head') && !rawName.includes('tine')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_pitchfork_shaft');
      } else if (rawName.includes('head') || rawName.includes('tine') || rawName.includes('cross') || parentName === 'weapon') {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_pitchfork_head');
      }
    } else if (unitKey === 'peasant_archer') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'archer_head_face');
        mesh.material = makeMat(0xffffff, 0.74, 0.05);
      } else if (rawName.includes('cap') || rawName.includes('helmet') || rawName.includes('hat')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_cap');
        mesh.material = makeMat(0xffffff, 0.74, 0.05);
      } else if (rawName.includes('feather')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_feather');
        mesh.material = makeMat(0xffffff, 0.74, 0.05);
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest') || rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_belt');
      } else if (rawName.includes('quiver') || rawName.includes('arrow')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_quiver');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('bracer') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('forearm') || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('bow') || rawName.includes('string')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_bow');
      }
    } else if (unitKey === 'spearman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_head_face');
        mesh.material = makeMat(0xffffff, 0.68, 0.15);
      } else if (rawName.includes('kettle') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_helmet');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest') || rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_belt');
      } else if (rawName.includes('javelin')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_javelin');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (rawName.includes('bracer') || rawName.includes('vambrace') || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_arm');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot') || rawName.includes('greave')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('spear') || rawName.includes('tip') || rawName.includes('sauroter')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_spear');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('boss') || rawName.includes('rim')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_shield');
      }
    } else if (unitKey === 'swordsman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_head_helmet');
        mesh.material = makeMat(0xffffff, 0.38, 0.78);
      } else if (
        rawName.includes('helmet') ||
        rawName.includes('dome') ||
        rawName.includes('visor') ||
        rawName.includes('cross') ||
        rawName.includes('aventail') ||
        rawName.includes('slit') ||
        rawName.includes('plume') ||
        rawName.includes('crest')
      ) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_helmet_part');
      } else if (
        mesh.name === 'Torso' ||
        rawName.includes('tabard') ||
        rawName.includes('surcoat') ||
        rawName.includes('cuirass') ||
        rawName.includes('fauld')
      ) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_belt');
      } else if (rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_pauldron');
      } else if (rawName.includes('hand') || rawName.includes('gauntlet')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_gauntlet');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('vambrace') || rawName.includes('couter')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_arm');
      } else if (
        mesh.name === 'Leg_L' ||
        mesh.name === 'Leg_R' ||
        rawName.includes('boot') ||
        rawName.includes('sabaton') ||
        rawName.includes('poleyn') ||
        rawName.includes('greave')
      ) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('sword') || rawName.includes('blade') || rawName.includes('guard') || rawName.includes('pommel')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_sword');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('boss') || rawName.includes('rim')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_shield');
      }
    } else if (unitKey === 'healer') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_head_face');
        mesh.material = makeMat(0xffffff, 0.76, 0.05);
      } else if (rawName.includes('hood') || rawName.includes('coif') || rawName.includes('helmet') || rawName.includes('headband')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_hood');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest') || rawName.includes('stole')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (rawName.includes('satchel') || rawName.includes('strap') || rawName.includes('pouch') || rawName.includes('flap') || rawName.includes('vial') || rawName.includes('buckle')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_satchel');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('pauldron') || rawName.includes('armband') || rawName.includes('bracer')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('knife') || rawName.includes('blade') || rawName.includes('guard') || rawName.includes('dagger') || rawName.includes('grip') || rawName.includes('tip')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_knife');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('buckler') || rawName.includes('boss') || rawName.includes('rim')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_shield');
      }
    } else if (unitKey === 'maceman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_head_face');
        mesh.material = makeMat(0xffffff, 0.76, 0.05);
      } else if (rawName.includes('kettle') || rawName.includes('helmet') || rawName.includes('coif') || rawName.includes('cap') || rawName.includes('hood')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_coif');
      } else if (rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_collar');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('gambeson') || rawName.includes('vest')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_belt');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('bracer') || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot') || rawName.includes('greave')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('mace') || rawName.includes('flange') || rawName.includes('spike') || rawName.includes('pommel') || rawName.includes('haft') || rawName.includes('shaft')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_mace');
      }
    } else if (unitKey === 'slinger') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_head_face');
        mesh.material = makeMat(0xffffff, 0.74, 0.05);
      } else if (rawName.includes('headband')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (rawName.includes('hair')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_hood');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest') || rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (rawName.includes('pouch') || rawName.includes('strap')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_satchel');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('bracer') || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot') || rawName.includes('greave') || rawName.includes('sandal')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('sling') || rawName.includes('stone') || rawName.includes('cord')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_pitchfork_shaft');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('buckler') || rawName.includes('boss') || rawName.includes('rim')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_shield');
      }
    } else if (unitKey === 'crossbowman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_head_face');
        mesh.material = makeMat(0xffffff, 0.72, 0.08);
      } else if (rawName.includes('kettle') || rawName.includes('helmet') || rawName.includes('coif')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_helmet');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('vest') || rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_belt');
      } else if (rawName.includes('pavise')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_shield');
      } else if (rawName.includes('pouch') || rawName.includes('quarrel')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_satchel');
      } else if (rawName.includes('hand') || rawName.includes('ear') || rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('bracer') || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot') || rawName.includes('greave')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('crossbow') || rawName.includes('prod') || rawName.includes('stirrup') || rawName.includes('bolt') || rawName.includes('stock') || rawName.includes('string')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_bow');
      }
    } else if (unitKey === 'armored_knight') {
      if (mesh.name === 'Head' || rawName.includes('helm') || rawName.includes('visor')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_great_helm');
      } else if (mesh.name === 'Torso' || rawName.includes('cuirass') || rawName.includes('gorget')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_plate_torso');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R' || rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_plate_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R') {
        applyHumanoidUVMapping(mesh.geometry, 'knight_plate_leg');
      } else if (rawName.includes('horse_leg')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_horse_leg');
      } else if (rawName.includes('barding')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_horse_barding');
      } else if (mesh.name === 'Shield' || rawName.includes('shield')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_shield');
      } else if (rawName.includes('saddle')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_saddle');
      } else if (rawName.includes('neck')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_horse_neck');
      } else if (rawName.includes('horse_head')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_horse_head');
      } else if (rawName.includes('weapon') || rawName.includes('mace')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_mace');
      } else if (mesh.name === 'Root' || rawName.includes('horse')) {
        applyHumanoidUVMapping(mesh.geometry, 'knight_horse_body');
      }
    }
  });
}

function getUnitLimbMaterial(
  unitKey: string | undefined,
  limbName: string
): THREE.MeshStandardMaterial {
  if (!unitKey) return getSharedUnitOpaqueMaterial();

  switch (unitKey) {
    case 'barbarian':
      return getBarbarianLimbMaterial(limbName);
    case 'peasant':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('peasant_face', 0.76, 0.05);
        case 'Weapon':
          return getHumanoidPartMaterial('peasant_pitchfork', 0.58, 0.35);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02);
      }
    case 'peasant_archer':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('archer_face', 0.74, 0.05);
        case 'Weapon':
          return getHumanoidPartMaterial('archer_bow', 0.62, 0.15);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('archer_clothing', 0.82, 0.04);
      }
    case 'spearman':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('spearman_face', 0.68, 0.25);
        case 'Weapon':
        case 'Shield':
          return getHumanoidPartMaterial('spearman_gear', 0.52, 0.45);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('spearman_armor', 0.72, 0.20);
      }
    case 'swordsman':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('swordsman_helmet', 0.38, 0.78);
        case 'Weapon':
          return getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72);
        case 'Shield':
          return getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72, THREE.DoubleSide);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('swordsman_armor', 0.45, 0.65);
      }
    case 'healer':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('peasant_face', 0.76, 0.05);
        case 'Weapon':
          return getHumanoidPartMaterial('healer_gear', 0.45, 0.70);
        case 'Shield':
          return getHumanoidPartMaterial('healer_gear', 0.58, 0.35);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02);
      }
    case 'maceman':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('spearman_face', 0.76, 0.05);
        case 'Weapon':
          return getHumanoidPartMaterial('maceman_gear', 0.40, 0.65);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('maceman_armor', 0.82, 0.05);
      }
    case 'slinger':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('spearman_face', 0.74, 0.05);
        case 'Weapon':
          return getHumanoidPartMaterial('spearman_gear', 0.65, 0.20);
        case 'Shield':
          return getHumanoidPartMaterial('spearman_gear', 0.60, 0.35);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02);
      }
    case 'crossbowman':
      switch (limbName) {
        case 'Head':
          return getHumanoidPartMaterial('spearman_face', 0.72, 0.08);
        case 'Weapon':
          return getHumanoidPartMaterial('spearman_gear', 0.50, 0.55);
        case 'Torso':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('spearman_armor', 0.70, 0.22);
      }
    case 'armored_knight':
      switch (limbName) {
        case 'Weapon':
          return getHumanoidPartMaterial('armored_knight_gear', 0.40, 0.72);
        case 'Shield':
          return getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72);
        case 'Root':
        case 'Horse_Body':
        case 'Horse_Head':
        case 'Horse_Neck':
        case 'Horse_Barding':
        case 'Horse_Tail':
        case 'Saddle':
        case 'Horse_Leg_Front_L':
        case 'Horse_Leg_Front_R':
        case 'Horse_Leg_Rear_L':
        case 'Horse_Leg_Rear_R':
          return getHumanoidPartMaterial('armored_knight_gear', 0.65, 0.20);
        case 'Torso':
        case 'Head':
        case 'Arm_L':
        case 'Arm_R':
        case 'Leg_L':
        case 'Leg_R':
        default:
          return getHumanoidPartMaterial('armored_knight_armor', 0.28, 0.88);
      }
    default:
      return getSharedUnitOpaqueMaterial();
  }
}

/**
 * Computes smooth, crease-aware vertex normals on a BufferGeometry so spherical and
 * cylindrical surfaces (such as helmets, heads, pauldrons, shields, and limbs) are
 * smoothly shaded without visible facet seams, while preserving crisp 90-degree edges.
 */
export function smoothGeometryNormals(
  geometry: THREE.BufferGeometry,
  creaseAngleRad: number = (75 * Math.PI) / 180
): void {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr || posAttr.count === 0) return;

  const vCount = posAttr.count;
  const indexAttr = geometry.getIndex();
  const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor(vCount / 3);

  // 1. Accumulate area-weighted face normals per vertex index
  const rawNormals = new Float32Array(vCount * 3);
  for (let t = 0; t < triCount; t++) {
    const i0 = indexAttr ? indexAttr.getX(t * 3) : t * 3;
    const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

    const ax = posAttr.getX(i1) - posAttr.getX(i0);
    const ay = posAttr.getY(i1) - posAttr.getY(i0);
    const az = posAttr.getZ(i1) - posAttr.getZ(i0);

    const bx = posAttr.getX(i2) - posAttr.getX(i0);
    const by = posAttr.getY(i2) - posAttr.getY(i0);
    const bz = posAttr.getZ(i2) - posAttr.getZ(i0);

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    rawNormals[i0 * 3] += nx;
    rawNormals[i0 * 3 + 1] += ny;
    rawNormals[i0 * 3 + 2] += nz;

    rawNormals[i1 * 3] += nx;
    rawNormals[i1 * 3 + 1] += ny;
    rawNormals[i1 * 3 + 2] += nz;

    rawNormals[i2 * 3] += nx;
    rawNormals[i2 * 3 + 1] += ny;
    rawNormals[i2 * 3 + 2] += nz;
  }

  const unitNormals = new Float32Array(vCount * 3);
  for (let v = 0; v < vCount; v++) {
    const nx = rawNormals[v * 3];
    const ny = rawNormals[v * 3 + 1];
    const nz = rawNormals[v * 3 + 2];
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-8) {
      unitNormals[v * 3] = nx / len;
      unitNormals[v * 3 + 1] = ny / len;
      unitNormals[v * 3 + 2] = nz / len;
    } else {
      unitNormals[v * 3 + 1] = 1;
    }
  }

  // 2. Group coincident vertices by quantized 3D position and weld normals within creaseAngleRad
  const posBuckets = new Map<string, number[]>();
  for (let v = 0; v < vCount; v++) {
    const qx = Math.round(posAttr.getX(v) * 10000);
    const qy = Math.round(posAttr.getY(v) * 10000);
    const qz = Math.round(posAttr.getZ(v) * 10000);
    const key = `${qx},${qy},${qz}`;
    let bucket = posBuckets.get(key);
    if (!bucket) {
      bucket = [];
      posBuckets.set(key, bucket);
    }
    bucket.push(v);
  }

  const cosThreshold = Math.cos(creaseAngleRad);
  const smoothed = new Float32Array(vCount * 3);

  for (const bucket of posBuckets.values()) {
    if (bucket.length === 1) {
      const v = bucket[0];
      smoothed[v * 3] = unitNormals[v * 3];
      smoothed[v * 3 + 1] = unitNormals[v * 3 + 1];
      smoothed[v * 3 + 2] = unitNormals[v * 3 + 2];
      continue;
    }
    for (let a = 0; a < bucket.length; a++) {
      const v = bucket[a];
      const vnx = unitNormals[v * 3];
      const vny = unitNormals[v * 3 + 1];
      const vnz = unitNormals[v * 3 + 2];

      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let b = 0; b < bucket.length; b++) {
        const u = bucket[b];
        const dot =
          vnx * unitNormals[u * 3] +
          vny * unitNormals[u * 3 + 1] +
          vnz * unitNormals[u * 3 + 2];
        if (dot >= cosThreshold) {
          sx += rawNormals[u * 3];
          sy += rawNormals[u * 3 + 1];
          sz += rawNormals[u * 3 + 2];
        }
      }
      const len = Math.hypot(sx, sy, sz);
      if (len > 1e-8) {
        smoothed[v * 3] = sx / len;
        smoothed[v * 3 + 1] = sy / len;
        smoothed[v * 3 + 2] = sz / len;
      } else {
        smoothed[v * 3] = vnx;
        smoothed[v * 3 + 1] = vny;
        smoothed[v * 3 + 2] = vnz;
      }
    }
  }

  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(smoothed, 3));
}

/**
 * Merges an array of { mesh, relMatrix } into a single indexed BufferGeometry
 * with baked RGB vertex colors (`color` attribute) and smoothed normals.
 */
export function mergeMeshesWithVertexColors(
  items: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }>
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (const { mesh, relMatrix } of items) {
    if (!mesh.geometry) continue;
    const g = mesh.geometry.clone();
    g.applyMatrix4(relMatrix);
    smoothGeometryNormals(g);

    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const matColor = (mat as THREE.MeshStandardMaterial)?.color ?? new THREE.Color(0xffffff);
    const cr = matColor.r;
    const cg = matColor.g;
    const cb = matColor.b;

    const posAttr = g.getAttribute('position');
    if (!posAttr || posAttr.count === 0) continue;
    const normAttr = g.getAttribute('normal');
    const uvAttr = g.getAttribute('uv');
    const colAttr = g.getAttribute('color');
    const vertexOffset = positions.length / 3;

    for (let v = 0; v < posAttr.count; v++) {
      positions.push(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
      normals.push(
        normAttr ? normAttr.getX(v) : 0,
        normAttr ? normAttr.getY(v) : 1,
        normAttr ? normAttr.getZ(v) : 0
      );
      uvs.push(uvAttr ? uvAttr.getX(v) : 0, uvAttr ? uvAttr.getY(v) : 0);
      colors.push(
        colAttr ? colAttr.getX(v) * cr : cr,
        colAttr ? colAttr.getY(v) * cg : cg,
        colAttr ? colAttr.getZ(v) * cb : cb
      );
    }

    const indexAttr = g.getIndex();
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i++) {
        indices.push(vertexOffset + indexAttr.getX(i));
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(vertexOffset + i);
      }
    }

    g.dispose();
    if (!mesh.geometry.userData?.isSharedAsset) {
      mesh.geometry.dispose();
    }
  }

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  mergedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  mergedGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  mergedGeo.setIndex(indices);
  mergedGeo.computeBoundingSphere();
  mergedGeo.userData = { isSharedAsset: true };
  return mergedGeo;
}

/**
 * Compacts an articulated unit hierarchy in-place by merging all non-articulated
 * decorative child meshes into their parent articulated limb (`Torso`, `Head`,
 * `Arm_L`, `Arm_R`, `Leg_L`, `Leg_R`, `Weapon`, `Shield`) and assigning the shared
 * opaque vertex-color material.
 */
export function compactArticulatedUnitHierarchy(
  rootMesh: THREE.Mesh,
  unitKey?: string
): THREE.Mesh {
  const effectiveUnitKey = unitKey ?? rootMesh.userData?.unitKey;
  const isBarbarian = effectiveUnitKey === 'barbarian';
  const isHumanoidTextured =
    effectiveUnitKey === 'peasant' ||
    effectiveUnitKey === 'peasant_archer' ||
    effectiveUnitKey === 'spearman' ||
    effectiveUnitKey === 'swordsman' ||
    effectiveUnitKey === 'healer' ||
    effectiveUnitKey === 'maceman' ||
    effectiveUnitKey === 'slinger' ||
    effectiveUnitKey === 'crossbowman' ||
    effectiveUnitKey === 'armored_knight';

  if (isBarbarian) {
    prepareBarbarianHierarchyBeforeCompaction(rootMesh);
  } else if (isHumanoidTextured && effectiveUnitKey) {
    prepareHumanoidHierarchyBeforeCompaction(rootMesh, effectiveUnitKey);
  }

  const articulatedNodes: THREE.Mesh[] = [];
  const visitPostOrder = (node: THREE.Object3D) => {
    for (const child of node.children) {
      visitPostOrder(child);
    }
    if ((node as THREE.Mesh).isMesh && (node === rootMesh || ARTICULATED_LIMB_NAMES.has(node.name))) {
      articulatedNodes.push(node as THREE.Mesh);
    }
  };
  visitPostOrder(rootMesh);

  for (const partMesh of articulatedNodes) {
    const items: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
      { mesh: partMesh, relMatrix: new THREE.Matrix4().identity() },
    ];
    const directChildrenToRemove: THREE.Object3D[] = [];

    const collectDecorative = (parent: THREE.Object3D, parentRelMatrix: THREE.Matrix4) => {
      for (const child of parent.children) {
        if (ARTICULATED_LIMB_NAMES.has(child.name)) {
          continue;
        }
        child.updateMatrix();
        const childRelMatrix = new THREE.Matrix4().multiplyMatrices(parentRelMatrix, child.matrix);
        if ((child as THREE.Mesh).isMesh) {
          items.push({ mesh: child as THREE.Mesh, relMatrix: childRelMatrix });
        }
        collectDecorative(child, childRelMatrix);
        if (parent === partMesh) {
          directChildrenToRemove.push(child);
        }
      }
    };

    collectDecorative(partMesh, new THREE.Matrix4().identity());

    for (const child of directChildrenToRemove) {
      partMesh.remove(child);
    }

    partMesh.geometry = mergeMeshesWithVertexColors(items);
    partMesh.material = getUnitLimbMaterial(effectiveUnitKey, partMesh.name);
    partMesh.castShadow = true;
    partMesh.receiveShadow = false;
  }

  return rootMesh;
}

/**
 * Clones a compacted articulated unit template, sharing its cached BufferGeometries
 * and shared opaque MeshStandardMaterial across all soldiers of that unit/team.
 */
function cloneCompactedUnitTemplate(template: THREE.Mesh): THREE.Mesh {
  const cloned = template.clone(true);
  cloned.userData = { ...template.userData };
  return cloned;
}

function transformSwordsmanKiteShieldGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  // Lean forward (~12.5 deg) in shield-local space, rotate 45 deg outward (front-left), attach at Arm_L_Hand
  geo.rotateZ(-0.22);
  geo.rotateY(Math.PI * 0.25);
  geo.translate(0.08, -0.26, -0.06);
  return geo;
}

/**
 * Builds a medieval kite shield BufferGeometry (broad rounded top arch tapering to a pointed tip)
 * attached to Arm_L_Hand, rotated 45 degrees and leaning slightly forward, with front/back/bevelled edges.
 */
function createKiteShieldGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.34);
  shape.quadraticCurveTo(0.135, -0.04, 0.15, 0.14);
  shape.quadraticCurveTo(0.13, 0.23, 0, 0.25);
  shape.quadraticCurveTo(-0.13, 0.23, -0.15, 0.14);
  shape.quadraticCurveTo(-0.135, -0.04, 0, -0.34);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.018);
  geo.rotateY(Math.PI * 0.5);
  transformSwordsmanKiteShieldGeometry(geo);
  smoothGeometryNormals(geo);
  return geo;
}

function buildSwordsmanKiteShieldMesh(
  matTeam: THREE.MeshStandardMaterial,
  matBrass: THREE.MeshStandardMaterial
): THREE.Mesh {
  const shieldMat = matTeam.clone();
  shieldMat.side = THREE.DoubleSide;
  const shieldMesh = new THREE.Mesh(createKiteShieldGeometry(), shieldMat);
  shieldMesh.name = 'Shield';

  const bossGeo = new THREE.SphereGeometry(0.052, 14, 10);
  bossGeo.translate(0.025, 0.08, 0);
  transformSwordsmanKiteShieldGeometry(bossGeo);
  const bossMesh = new THREE.Mesh(bossGeo, matBrass);
  bossMesh.name = 'Shield_Boss';
  shieldMesh.add(bossMesh);

  return shieldMesh;
}

/**
 * Clones a loaded Blender GLB scene hierarchy, applies faction team colors,
 * compacts decorative sub-parts into the articulated limbs, and caches the result.
 */
export function instantiateGlbUnitTemplate(
  templateScene: THREE.Object3D,
  unitKey: string,
  armyAlignment: number,
  isHero: boolean = false
): THREE.Mesh {
  let perSceneCache = glbUnitTemplateCache.get(templateScene);
  if (!perSceneCache) {
    perSceneCache = new Map();
    glbUnitTemplateCache.set(templateScene, perSceneCache);
  }
  const cacheKey = `${unitKey}_${armyAlignment}_${isHero ? 1 : 0}`;
  const cached = perSceneCache.get(cacheKey);
  if (cached) {
    return cloneCompactedUnitTemplate(cached);
  }

  const cloned = templateScene.clone(true);
  const teamHex = getTeamColorHex(armyAlignment, isHero);
  const whiteMap = getSharedWhiteTexture();

  cloned.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      if (mesh.material) {
        const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const matClone = origMat.clone() as THREE.MeshStandardMaterial;
        matClone.transparent = false;
        matClone.opacity = 1.0;
        applyUnitRimLighting(matClone);
        if (!matClone.map) {
          matClone.map = whiteMap;
        }
        const isShieldMetalPart =
          mesh.name.toLowerCase().includes('boss') ||
          mesh.name.toLowerCase().includes('rim') ||
          mesh.name.toLowerCase().includes('grip');
        const isArcherHat =
          mesh.name.toLowerCase().includes('hunting_hat') ||
          origMat.name?.toLowerCase().includes('hatgreen');
        if (
          !isArcherHat &&
          (origMat.name?.toLowerCase().includes('team') ||
            mesh.name.toLowerCase().includes('team') ||
            mesh.name.toLowerCase().includes('barding') ||
            origMat.name?.toLowerCase().includes('barding') ||
            (mesh.name.toLowerCase().includes('shield') && !isShieldMetalPart) ||
            mesh.name.toLowerCase().includes('hood') ||
            mesh.name.toLowerCase().includes('cap') ||
            mesh.name.toLowerCase().includes('pavise') ||
            mesh.name.toLowerCase().includes('headband') ||
            mesh.name.toLowerCase().includes('armband'))
        ) {
          matClone.color.setHex(teamHex);
        }
        mesh.material = matClone;
      }
    }
  });

  // Find primary root mesh: for mounted cavalry (armored_knight), use the warhorse Root mesh; otherwise use Torso
  let rootMeshCandidate: THREE.Mesh | null = null;
  if (unitKey === 'armored_knight') {
    cloned.traverse((node) => {
      if (!rootMeshCandidate && (node as THREE.Mesh).isMesh && (node.name === 'Root' || node.name.startsWith('Horse'))) {
        rootMeshCandidate = node as THREE.Mesh;
      }
    });
  }

  if (!rootMeshCandidate) {
    cloned.traverse((node) => {
      if (!rootMeshCandidate && (node as THREE.Mesh).isMesh && node.name.startsWith('Torso')) {
        rootMeshCandidate = node as THREE.Mesh;
      }
    });
  }

  let rootMesh: THREE.Mesh;
  if (rootMeshCandidate) {
    rootMesh = rootMeshCandidate as THREE.Mesh;
    if (rootMesh.parent) {
      rootMesh.parent.remove(rootMesh);
    }
    if (unitKey !== 'armored_knight') {
      rootMesh.name = 'Torso';
    }
  } else {
    // Fallback wrapper mesh if Torso/Root wasn't top-level
    const wrapperGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.36, 8);
    wrapperGeo.translate(0, 0.56, 0);
    rootMesh = new THREE.Mesh(wrapperGeo, makeMat(teamHex));
    rootMesh.name = unitKey === 'armored_knight' ? 'Root' : 'Torso';
    rootMesh.add(cloned);
  }

  if (unitKey === 'swordsman') {
    const shieldNode = rootMesh.getObjectByName('Shield');
    if (shieldNode && (shieldNode as THREE.Mesh).isMesh) {
      const shieldMesh = shieldNode as THREE.Mesh;
      shieldMesh.clear();
      shieldMesh.position.set(0, 0, 0);
      shieldMesh.rotation.set(0, 0, 0);
      shieldMesh.scale.set(1, 1, 1);
      const kiteShield = buildSwordsmanKiteShieldMesh(makeMat(teamHex), makeMat(0xc8a44d, 0.35, 0.85));
      shieldMesh.geometry = kiteShield.geometry;
      shieldMesh.material = kiteShield.material;
      for (const child of [...kiteShield.children]) {
        shieldMesh.add(child);
      }
    }
  }

  compactArticulatedUnitHierarchy(rootMesh, unitKey);
  rootMesh.userData = {
    ...rootMesh.userData,
    unitKey,
    source: 'blender_glb',
    height: AVERAGE_UNIT_3D_HEIGHT,
  };

  perSceneCache.set(cacheKey, rootMesh);
  return cloneCompactedUnitTemplate(rootMesh);
}

/**
 * Loads all 7 Blender-generated unit .glb models asynchronously.
 */
export async function loadBlenderUnitGlbTemplates(
  basePath: string = ''
): Promise<Map<string, THREE.Object3D>> {
  const templates = new Map<string, THREE.Object3D>();
  if (typeof window === 'undefined' && typeof fetch === 'undefined') {
    return templates;
  }

  const loader = new GLTFLoader();
  const entries = Object.entries(UNIT_GLB_PATHS);

  await Promise.all(
    entries.map(async ([unitKey, relPath]) => {
      const url = basePath ? `${basePath.replace(/\/$/, '')}/${relPath}` : relPath;
      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
        if (gltf?.scene) {
          templates.set(unitKey, gltf.scene);
        }
      } catch {
        // Fallback procedural 3D mesh remains active when offline or in unit tests
      }
    })
  );

  return templates;
}

/**
 * Synchronously constructs an articulated low-poly 3D unit model matching the exact
 * Blender hierarchy (Torso -> Head, Arm_L, Arm_R, Leg_L, Leg_R, Weapon, Shield)
 * for the 7 supported unit types:
 * peasant, peasant_archer, swordsman, spearman, crossbowman, barbarian, slinger.
 */
function createProceduralArmoredKnightTemplate(teamColor: number, _isHero: boolean): THREE.Mesh {
  const matSteel = getHumanoidPartMaterial('armored_knight_armor', 0.28, 0.88);
  const matGear = getHumanoidPartMaterial('armored_knight_gear', 0.65, 0.20);
  const matWeapon = getHumanoidPartMaterial('armored_knight_gear', 0.40, 0.72);
  const matTeam = makeMat(teamColor, 0.65, 0.15);

  // 1. Warhorse Root Body (center at y = 0.44)
  const horseBodyGeo = new THREE.CylinderGeometry(0.17, 0.19, 0.62, 14);
  horseBodyGeo.rotateZ(Math.PI * 0.5);
  horseBodyGeo.translate(0, 0.44, 0);
  const horseRoot = new THREE.Mesh(horseBodyGeo, matGear);
  horseRoot.name = 'Root';

  // Front chest sphere & rear rump sphere
  const chestGeo = new THREE.SphereGeometry(0.185, 14, 10);
  chestGeo.scale(1.05, 0.95, 1.0);
  chestGeo.translate(0.28, 0.45, 0);
  horseRoot.add(new THREE.Mesh(chestGeo, matGear));

  const rumpGeo = new THREE.SphereGeometry(0.180, 14, 10);
  rumpGeo.scale(1.05, 0.95, 1.0);
  rumpGeo.translate(-0.28, 0.46, 0);
  horseRoot.add(new THREE.Mesh(rumpGeo, matGear));

  // Barding / Caparison draped over the horse flank (player team colored!)
  const bardingGeo = new THREE.BoxGeometry(0.72, 0.32, 0.40);
  bardingGeo.translate(0, 0.36, 0);
  const bardingMesh = new THREE.Mesh(bardingGeo, matTeam);
  bardingMesh.name = 'Horse_Barding';
  horseRoot.add(bardingMesh);

  // Muscular Arched Neck & Steel Crinet
  const neckGeo = new THREE.CylinderGeometry(0.10, 0.13, 0.36, 12);
  neckGeo.rotateZ(-0.64);
  neckGeo.translate(0.30, 0.58, 0);
  const neckMesh = new THREE.Mesh(neckGeo, matGear);
  neckMesh.name = 'Horse_Neck';

  // Segmented Crinet neck armor plates along crest
  const crinetGeo = new THREE.BoxGeometry(0.24, 0.08, 0.12);
  crinetGeo.rotateZ(-0.64);
  crinetGeo.translate(0.32, 0.64, 0);
  neckMesh.add(new THREE.Mesh(crinetGeo, matSteel));
  horseRoot.add(neckMesh);

  // Warhorse Head & Muzzle (Angled FORWARD and DOWN, not looking up at the sky!)
  // Axis slopes from poll at (0.38, 0.76) down to muzzle at (0.58, 0.50)
  const headGeo = new THREE.CylinderGeometry(0.040, 0.075, 0.28, 12);
  headGeo.rotateZ(-2.25);
  headGeo.translate(0.48, 0.63, 0);
  const horseHeadMesh = new THREE.Mesh(headGeo, matGear);
  horseHeadMesh.name = 'Horse_Head';

  // Distinctive large circular jaw cheeks (ganache) at lower-back head
  for (const zSign of [-1, 1]) {
    const jowlGeo = new THREE.SphereGeometry(0.062, 10, 8);
    jowlGeo.scale(1.0, 0.9, 0.45);
    jowlGeo.translate(0.38, 0.64, zSign * 0.062);
    horseHeadMesh.add(new THREE.Mesh(jowlGeo, matGear));
  }

  // Squared equine muzzle with nostrils
  const muzzleGeo = new THREE.BoxGeometry(0.08, 0.07, 0.07);
  muzzleGeo.rotateZ(-0.60);
  muzzleGeo.translate(0.58, 0.51, 0);
  horseHeadMesh.add(new THREE.Mesh(muzzleGeo, matGear));

  // Armored Chamfron plate fitted along forehead and nasal slope
  const chanfronGeo = new THREE.BoxGeometry(0.24, 0.035, 0.12);
  chanfronGeo.rotateZ(-0.62);
  chanfronGeo.translate(0.48, 0.65, 0);
  horseHeadMesh.add(new THREE.Mesh(chanfronGeo, matSteel));

  // Forehead Chanfron spike projecting forward
  const spikeGeo = new THREE.ConeGeometry(0.016, 0.12, 8);
  spikeGeo.rotateZ(-1.35);
  spikeGeo.translate(0.51, 0.69, 0);
  horseHeadMesh.add(new THREE.Mesh(spikeGeo, matSteel));

  // Alert equine ears atop poll
  for (const zSign of [-1, 1]) {
    const earGeo = new THREE.ConeGeometry(0.020, 0.085, 6);
    earGeo.rotateZ(-0.15);
    earGeo.rotateX(zSign * 0.20);
    earGeo.translate(0.36, 0.76, zSign * 0.048);
    horseHeadMesh.add(new THREE.Mesh(earGeo, matGear));
  }
  horseRoot.add(horseHeadMesh);

  // Horse Tail
  const tailGeo = new THREE.CylinderGeometry(0.045, 0.015, 0.32, 8);
  tailGeo.rotateZ(0.38);
  tailGeo.translate(-0.04, -0.11, 0);
  const tailMesh = new THREE.Mesh(tailGeo, matGear);
  tailMesh.name = 'Horse_Tail';
  tailMesh.position.set(-0.36, 0.46, 0);
  horseRoot.add(tailMesh);

  // Saddle & Stirrup Straps
  const saddleGeo = new THREE.BoxGeometry(0.26, 0.10, 0.28);
  saddleGeo.translate(0.02, 0.55, 0);
  const saddleMesh = new THREE.Mesh(saddleGeo, matGear);
  saddleMesh.name = 'Saddle';
  horseRoot.add(saddleMesh);

  // 4 Horse Legs as articulated limbs (pivots at shoulder/hip height y = 0.44 extending to ground y = 0.0)
  const legPositions: Array<[string, number, number]> = [
    ['Horse_Leg_Front_L', 0.24, 0.14],
    ['Horse_Leg_Front_R', 0.24, -0.14],
    ['Horse_Leg_Rear_L', -0.25, 0.14],
    ['Horse_Leg_Rear_R', -0.25, -0.14],
  ];
  for (const [legName, lx, lz] of legPositions) {
    const legGeo = new THREE.CylinderGeometry(0.058, 0.042, 0.24, 10);
    legGeo.translate(0, -0.12, 0);
    const legMesh = new THREE.Mesh(legGeo, matGear);
    legMesh.name = legName;
    legMesh.position.set(lx, 0.44, lz);

    const lowerLegGeo = new THREE.CylinderGeometry(0.040, 0.032, 0.22, 10);
    lowerLegGeo.translate(0, -0.32, 0);
    legMesh.add(new THREE.Mesh(lowerLegGeo, matGear));

    const hoofGeo = new THREE.CylinderGeometry(0.042, 0.038, 0.05, 10);
    hoofGeo.translate(0, -0.42, 0);
    legMesh.add(new THREE.Mesh(hoofGeo, matGear));

    horseRoot.add(legMesh);
  }

  // 2. Armored Knight Rider (seated in saddle at y = 0.74)
  const torsoGeo = new THREE.BoxGeometry(0.18, 0.28, 0.26);
  const torsoMesh = new THREE.Mesh(torsoGeo, matSteel);
  torsoMesh.name = 'Torso';
  torsoMesh.position.set(0.02, 0.74, 0);

  // Team tabard / surcoat over cuirass
  const tabardGeo = new THREE.BoxGeometry(0.19, 0.26, 0.27);
  const tabardMesh = new THREE.Mesh(tabardGeo, matTeam);
  tabardMesh.name = 'Tabard_Team';
  torsoMesh.add(tabardMesh);

  // Pauldrons on shoulders
  for (const zSign of [-1, 1]) {
    const pGeo = new THREE.SphereGeometry(0.085, 12, 8);
    pGeo.scale(1.1, 1.0, 0.9);
    pGeo.translate(0, 0.11, zSign * 0.18);
    const pMesh = new THREE.Mesh(pGeo, matSteel);
    pMesh.name = 'Pauldrons';
    torsoMesh.add(pMesh);
  }

  // Knight Great Helm on Head
  const helmGeo = new THREE.SphereGeometry(0.115, 16, 12);
  helmGeo.scale(1.02, 1.12, 1.0);
  const headMesh = new THREE.Mesh(helmGeo, matSteel);
  headMesh.name = 'Head';
  headMesh.position.set(0, 0.29, 0);

  const bucketGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.12, 14);
  bucketGeo.translate(0, -0.04, 0);
  headMesh.add(new THREE.Mesh(bucketGeo, matSteel));

  const visorSlitGeo = new THREE.BoxGeometry(0.02, 0.016, 0.13);
  visorSlitGeo.translate(0.11, -0.01, 0);
  headMesh.add(new THREE.Mesh(visorSlitGeo, matWeapon));
  torsoMesh.add(headMesh);

  // Knight Mounted Legs (Left & Right astride horse in stirrups)
  for (const [legName, zSign] of [['Leg_L', 1], ['Leg_R', -1]] as const) {
    const thighGeo = new THREE.CylinderGeometry(0.065, 0.052, 0.26, 10);
    thighGeo.rotateX(zSign * 0.61);
    thighGeo.rotateY(zSign * 0.26);
    thighGeo.translate(0.06, -0.12, zSign * 0.18);
    const legMesh = new THREE.Mesh(thighGeo, matSteel);
    legMesh.name = legName;

    const greaveGeo = new THREE.CylinderGeometry(0.050, 0.040, 0.24, 10);
    greaveGeo.rotateX(zSign * 0.17);
    greaveGeo.translate(0.12, -0.31, zSign * 0.19);
    legMesh.add(new THREE.Mesh(greaveGeo, matSteel));

    const bootGeo = new THREE.BoxGeometry(0.06, 0.09, 0.07);
    bootGeo.translate(0.14, -0.42, zSign * 0.19);
    legMesh.add(new THREE.Mesh(bootGeo, matSteel));

    torsoMesh.add(legMesh);
  }

  // Arm_L (holding reins / shield)
  const armLGeo = new THREE.CylinderGeometry(0.052, 0.042, 0.26, 10);
  armLGeo.rotateZ(0.61);
  armLGeo.rotateX(-0.44);
  armLGeo.translate(0.10, 0.01, 0.17);
  const armLMesh = new THREE.Mesh(armLGeo, matSteel);
  armLMesh.name = 'Arm_L';

  // Medieval Heater Shield (player team colored!)
  const shieldGeo = new THREE.BoxGeometry(0.04, 0.36, 0.26);
  shieldGeo.rotateY(0.42);
  shieldGeo.translate(0.12, -0.05, 0.14);
  const shieldMesh = new THREE.Mesh(shieldGeo, matTeam);
  shieldMesh.name = 'Shield';

  // Steel perimeter rim
  const rimGeo = new THREE.BoxGeometry(0.045, 0.38, 0.024);
  rimGeo.rotateY(0.42);
  rimGeo.translate(0.12, -0.05, 0.27);
  shieldMesh.add(new THREE.Mesh(rimGeo, matSteel));

  // Central shield boss (dome)
  const bossGeo = new THREE.SphereGeometry(0.045, 12, 8);
  bossGeo.translate(0.14, 0.02, 0.14);
  shieldMesh.add(new THREE.Mesh(bossGeo, matWeapon));

  armLMesh.add(shieldMesh);
  torsoMesh.add(armLMesh);

  // Arm_R (holding heavy flanged mace)
  const armRGeo = new THREE.CylinderGeometry(0.052, 0.042, 0.26, 10);
  armRGeo.rotateZ(-0.61);
  armRGeo.rotateX(0.35);
  armRGeo.translate(0.06, 0.06, -0.18);
  const armRMesh = new THREE.Mesh(armRGeo, matSteel);
  armRMesh.name = 'Arm_R';

  // Mace
  const maceGeo = new THREE.CylinderGeometry(0.018, 0.020, 0.72, 10);
  maceGeo.rotateZ(0.70);
  maceGeo.translate(0.14, 0.20, -0.04);
  const weaponMesh = new THREE.Mesh(maceGeo, matWeapon);
  weaponMesh.name = 'Weapon';

  const maceHeadGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.16, 12);
  maceHeadGeo.rotateZ(0.70);
  maceHeadGeo.translate(0.36, 0.46, -0.04);
  weaponMesh.add(new THREE.Mesh(maceHeadGeo, matWeapon));

  for (let i = 0; i < 6; i++) {
    const flangeGeo = new THREE.BoxGeometry(0.075, 0.14, 0.014);
    flangeGeo.rotateX((i * Math.PI) / 3);
    flangeGeo.rotateZ(0.70);
    flangeGeo.translate(0.36, 0.46, -0.04);
    weaponMesh.add(new THREE.Mesh(flangeGeo, matWeapon));
  }

  const pommelGeo = new THREE.SphereGeometry(0.034, 10, 8);
  pommelGeo.translate(-0.11, -0.11, -0.04);
  weaponMesh.add(new THREE.Mesh(pommelGeo, matWeapon));

  armRMesh.add(weaponMesh);
  torsoMesh.add(armRMesh);

  horseRoot.add(torsoMesh);

  compactArticulatedUnitHierarchy(horseRoot, 'armored_knight');
  horseRoot.userData = {
    unitKey: 'armored_knight',
    source: 'procedural_3d',
    height: AVERAGE_UNIT_3D_HEIGHT,
  };

  return horseRoot;
}

export function buildArticulatedUnit3DMesh(
  creatureType: CreatureType | string | number,
  armyAlignment: number = 0,
  isHero: boolean = false
): THREE.Mesh {
  const unitKey = normalizeUnitKey(creatureType);
  const cacheKey = `${unitKey}_${armyAlignment}_${isHero ? 1 : 0}`;
  const cached = proceduralUnitTemplateCache.get(cacheKey);
  if (cached) {
    return cloneCompactedUnitTemplate(cached);
  }

  const teamColor = getTeamColorHex(armyAlignment, isHero);

  if (unitKey === 'armored_knight') {
    const template = createProceduralArmoredKnightTemplate(teamColor, isHero);
    proceduralUnitTemplateCache.set(cacheKey, template);
    return cloneCompactedUnitTemplate(template);
  }

  const matSkin = makeMat(0xdeb38e, 0.75, 0.0);
  const matTeam = makeMat(teamColor, 0.68, 0.08);
  const matCloth = makeMat(0x6b4c30, 0.88, 0.0);
  const matLeather = makeMat(0x57361c, 0.78, 0.05);
  const matDarkLeather = makeMat(0x2e1f14, 0.82, 0.05);
  const matIron = makeMat(0x7a828c, 0.38, 0.82);
  const matSteel = makeMat(0xb8bfc9, 0.28, 0.88);
  const matChainmail = makeMat(0x616873, 0.52, 0.75);
  const matBrass = makeMat(0xd1a63d, 0.32, 0.85);
  const matWood = makeMat(0x754f29, 0.82, 0.02);
  const matFur = makeMat(0x473d33, 0.92, 0.0);
  const matFeather = makeMat(0xe6e0d1, 0.70, 0.0);
  const matStone = makeMat(0x858078, 0.85, 0.05);

  const isMuscular = unitKey === 'barbarian';
  const hasPauldrons =
    unitKey === 'swordsman' ||
    unitKey === 'crossbowman' ||
    unitKey === 'spearman' ||
    unitKey === 'barbarian' ||
    unitKey === 'peasant_archer';

  let torsoMat = matCloth;
  let legMat = matCloth;
  let armMat = matCloth;

  if (unitKey === 'swordsman') {
    torsoMat = matChainmail;
    legMat = matChainmail;
    armMat = matChainmail;
  } else if (unitKey === 'spearman') {
    torsoMat = matLeather;
    legMat = matCloth;
    armMat = matChainmail;
  } else if (unitKey === 'crossbowman') {
    torsoMat = matDarkLeather;
    legMat = matCloth;
    armMat = matLeather;
  } else if (unitKey === 'peasant_archer') {
    torsoMat = matLeather;
  } else if (unitKey === 'barbarian') {
    torsoMat = matSkin;
    legMat = matLeather;
    armMat = matSkin;
  } else if (unitKey === 'slinger') {
    armMat = matSkin;
  }

  // 1. Root Torso Mesh (y = 0.38..0.82)
  const isSlender = unitKey === 'healer' || unitKey === 'peasant' || unitKey === 'maceman' || unitKey === 'slinger';
  const chestRadius = isMuscular ? 0.19 : isSlender ? 0.138 : 0.165;
  const waistRadius = isSlender ? 0.108 : 0.14;
  const torsoGeo = new THREE.CylinderGeometry(chestRadius, waistRadius, 0.42, 16);
  torsoGeo.translate(0, 0.59, 0);
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
  torsoMesh.name = 'Torso';
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;

  // Team-colored tabard / surcoat on torso
  const tabardGeo = new THREE.BoxGeometry(0.22, 0.34, isSlender ? 0.14 : 0.18);
  tabardGeo.translate(0.02, 0.56, 0);
  const tabardMesh = new THREE.Mesh(tabardGeo, matTeam);
  tabardMesh.name = 'Tabard_Team';
  torsoMesh.add(tabardMesh);

  // Leather belt
  const beltGeo = new THREE.CylinderGeometry(isSlender ? 0.118 : 0.155, isSlender ? 0.118 : 0.155, 0.045, 16);
  beltGeo.translate(0, 0.44, 0);
  const beltMesh = new THREE.Mesh(beltGeo, matDarkLeather);
  beltMesh.name = 'Belt';
  torsoMesh.add(beltMesh);

  // Connecting neck between torso and head
  const neckGeo = new THREE.CylinderGeometry(0.048, 0.054, 0.12, 14);
  neckGeo.translate(0, 0.84, 0);
  const neckMesh = new THREE.Mesh(neckGeo, matSkin);
  neckMesh.name = 'Neck';
  torsoMesh.add(neckMesh);

  // 2. Head (pivot at y = 0.91)
  const headGeo = unitKey === 'swordsman'
    ? new THREE.CylinderGeometry(0.138, 0.144, 0.22, 18)
    : new THREE.SphereGeometry(0.125, 20, 14);
  const headMesh = new THREE.Mesh(headGeo, unitKey === 'swordsman' ? matSteel : matSkin);
  headMesh.name = 'Head';
  headMesh.position.set(0, 0.91, 0);
  torsoMesh.add(headMesh);

  // 3. Legs (Leg_L at z = -0.085, Leg_R at z = +0.085, pivot at y = 0.38 extending down to y = 0.0)
  for (const [legName, zSign] of [
    ['Leg_L', -1],
    ['Leg_R', 1],
  ] as const) {
    const legGeo = new THREE.CylinderGeometry(0.068, 0.052, 0.28, 12);
    legGeo.translate(0, -0.14, 0);
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.name = legName;
    legMesh.position.set(0, 0.38, zSign * 0.085);

    const bootGeo = new THREE.BoxGeometry(0.13, 0.12, 0.085);
    bootGeo.translate(0.02, -0.32, 0);
    const bootMesh = new THREE.Mesh(bootGeo, matDarkLeather);
    bootMesh.name = `${legName}_Boot`;
    legMesh.add(bootMesh);

    torsoMesh.add(legMesh);
  }

  // 4. Arms (Arm_L at z = -0.195, Arm_R at z = +0.195, pivot at y = 0.74)
  const createArm = (armName: string, zSign: number): THREE.Mesh => {
    const armGeo = new THREE.CylinderGeometry(0.058, 0.046, 0.27, 12);
    armGeo.translate(0.02, -0.13, 0);
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.name = armName;
    armMesh.position.set(0, 0.74, zSign * 0.195);

    if (hasPauldrons) {
      const pauldronGeo = new THREE.SphereGeometry(unitKey === 'swordsman' ? 0.088 : 0.075, 16, 12);
      const pauldronMesh = new THREE.Mesh(pauldronGeo, matSteel);
      pauldronMesh.name = `${armName}_Pauldron`;
      armMesh.add(pauldronMesh);
    }

    const handGeo = unitKey === 'swordsman'
      ? new THREE.BoxGeometry(0.075, 0.085, 0.075)
      : new THREE.SphereGeometry(0.045, 16, 12);
    handGeo.translate(0.04, -0.26, 0);
    const handMesh = new THREE.Mesh(handGeo, unitKey === 'swordsman' ? matSteel : matSkin);
    handMesh.name = `${armName}_Hand`;
    armMesh.add(handMesh);

    torsoMesh.add(armMesh);
    return armMesh;
  };

  const armL = createArm('Arm_L', -1);
  const armR = createArm('Arm_R', 1);

  // 5. Unit-specific headgear, shields, quivers, and weapons
  switch (unitKey) {
    case 'peasant': {
      // Bare-headed tousled hair (no hood covering the face)
      const hairGeo = new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
      hairGeo.translate(0, 0.03, 0);
      const hairMesh = new THREE.Mesh(hairGeo, makeMat(0x382212, 0.88, 0.04));
      hairMesh.name = 'Hair';
      headMesh.add(hairMesh);

      // Bare head ears
      for (const ez of [-0.12, 0.12]) {
        const earGeo = new THREE.BoxGeometry(0.02, 0.045, 0.02);
        earGeo.translate(0, 0, ez);
        const earMesh = new THREE.Mesh(earGeo, matSkin);
        earMesh.name = ez < 0 ? 'Ear_L' : 'Ear_R';
        headMesh.add(earMesh);
      }

      // Pitchfork in Arm_R
      const shaftGeo = new THREE.CylinderGeometry(0.02, 0.022, 1.12, 12);
      shaftGeo.rotateZ(-0.28);
      shaftGeo.translate(0.14, 0.05, 0);
      const weaponMesh = new THREE.Mesh(shaftGeo, matWood);
      weaponMesh.name = 'Weapon';

      const crossGeo = new THREE.BoxGeometry(0.03, 0.03, 0.18);
      crossGeo.translate(0.28, 0.48, 0);
      const crossMesh = new THREE.Mesh(crossGeo, matIron);
      weaponMesh.add(crossMesh);

      for (const tz of [-0.07, 0, 0.07]) {
        const tineGeo = new THREE.ConeGeometry(0.012, 0.22, 10);
        tineGeo.rotateZ(-0.28);
        tineGeo.translate(0.32, 0.58, tz);
        weaponMesh.add(new THREE.Mesh(tineGeo, matIron));
      }
      armR.add(weaponMesh);
      break;
    }

    case 'peasant_archer': {
      // Hunter hat & feather
      const matHunterGreen = makeMat(0x234d20, 0.82, 0.04);
      const capGeo = new THREE.ConeGeometry(0.135, 0.18, 16);
      capGeo.translate(-0.01, 0.10, 0);
      const capMesh = new THREE.Mesh(capGeo, matHunterGreen);
      capMesh.name = 'Hunting_Hat';
      headMesh.add(capMesh);

      // Modeled ears on head
      for (const ez of [-0.12, 0.12]) {
        const earGeo = new THREE.BoxGeometry(0.02, 0.045, 0.02);
        earGeo.translate(0, 0, ez);
        const earMesh = new THREE.Mesh(earGeo, matSkin);
        earMesh.name = ez < 0 ? 'Ear_L' : 'Ear_R';
        headMesh.add(earMesh);
      }

      // Golden to reddish-orange feather
      const featherGeo = new THREE.BoxGeometry(0.12, 0.05, 0.015);
      featherGeo.translate(-0.05, 0.14, -0.09);
      const fPos = featherGeo.getAttribute('position');
      const fCols = new Float32Array(fPos.count * 3);
      for (let i = 0; i < fPos.count; i++) {
        const fx = fPos.getX(i);
        const t = Math.max(0, Math.min(1, (0.01 - fx) / 0.12));
        fCols[i * 3] = 1.0 * (1 - t) + 0.88 * t;
        fCols[i * 3 + 1] = 0.82 * (1 - t) + 0.18 * t;
        fCols[i * 3 + 2] = 0.15 * (1 - t) + 0.06 * t;
      }
      featherGeo.setAttribute('color', new THREE.BufferAttribute(fCols, 3));
      const featherMesh = new THREE.Mesh(featherGeo, makeMat(0xffffff, 0.70, 0.0));
      featherMesh.name = 'Feather';
      headMesh.add(featherMesh);

      // Quiver on back
      const quiverGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.36, 14);
      quiverGeo.rotateZ(0.25);
      quiverGeo.translate(-0.15, 0.64, -0.05);
      const quiverMesh = new THREE.Mesh(quiverGeo, matDarkLeather);
      quiverMesh.name = 'Quiver';
      torsoMesh.add(quiverMesh);

      // Curved Longbow in Arm_L
      const bowGeo = new THREE.TorusGeometry(0.36, 0.018, 10, 18, Math.PI * 0.85);
      bowGeo.rotateY(Math.PI * 0.5);
      bowGeo.translate(0.16, -0.22, 0);
      const bowMesh = new THREE.Mesh(bowGeo, matWood);
      bowMesh.name = 'Weapon';
      armL.add(bowMesh);
      break;
    }

    case 'swordsman': {
      // Full Helmet Armor (Sugarloaf / Great Helm with ocular visor slits, brass cross, & aventail)
      // 1. Sugarloaf pointed dome cap on top
      const domeGeo = new THREE.ConeGeometry(0.142, 0.16, 18);
      domeGeo.translate(0, 0.12, 0);
      smoothGeometryNormals(domeGeo);
      const domeMesh = new THREE.Mesh(domeGeo, matSteel);
      domeMesh.name = 'Helmet_Dome';
      headMesh.add(domeMesh);

      // 2. Main cylindrical helmet body enclosing entire head/face
      const bucketGeo = new THREE.CylinderGeometry(0.144, 0.148, 0.24, 18);
      bucketGeo.translate(0, -0.02, 0);
      smoothGeometryNormals(bucketGeo);
      const bucketMesh = new THREE.Mesh(bucketGeo, matSteel);
      bucketMesh.name = 'Helmet';
      headMesh.add(bucketMesh);

      // 3. Protruding visor ocular brow plate
      const visorGeo = new THREE.BoxGeometry(0.045, 0.045, 0.24);
      visorGeo.translate(0.130, 0.025, 0);
      const visorMesh = new THREE.Mesh(visorGeo, matSteel);
      visorMesh.name = 'Helmet_Visor';
      headMesh.add(visorMesh);

      // 4. Narrow horizontal eye slits (deep dark ocular opening)
      const slitGeo = new THREE.BoxGeometry(0.015, 0.016, 0.20);
      slitGeo.translate(0.148, 0.025, 0);
      const slitMesh = new THREE.Mesh(slitGeo, matDarkLeather);
      slitMesh.name = 'Helmet_Slit';
      headMesh.add(slitMesh);

      // 5. Reinforcing brass cross / nasal strip along front face
      const vertCrossGeo = new THREE.BoxGeometry(0.025, 0.22, 0.032);
      vertCrossGeo.translate(0.140, -0.02, 0);
      headMesh.add(new THREE.Mesh(vertCrossGeo, matBrass));

      const horizCrossGeo = new THREE.BoxGeometry(0.025, 0.032, 0.22);
      horizCrossGeo.translate(0.140, 0.025, 0);
      headMesh.add(new THREE.Mesh(horizCrossGeo, matBrass));

      // 6. Chainmail aventail / coif draping from helmet base over the neck
      const aventailGeo = new THREE.CylinderGeometry(0.146, 0.180, 0.14, 18);
      aventailGeo.translate(0, -0.12, 0);
      smoothGeometryNormals(aventailGeo);
      const aventailMesh = new THREE.Mesh(aventailGeo, matChainmail);
      aventailMesh.name = 'Helmet_Aventail';
      headMesh.add(aventailMesh);

      // 6b. Helmet crest / plume in player team color
      const plumeGeo = new THREE.ConeGeometry(0.045, 0.18, 8);
      plumeGeo.rotateZ(0.35);
      plumeGeo.translate(-0.06, 0.22, 0);
      const plumeMesh = new THREE.Mesh(plumeGeo, matTeam);
      plumeMesh.name = 'Plume_Team';
      headMesh.add(plumeMesh);

      // 7. Steel breastplate / cuirass overlay on torso
      const cuirassGeo = new THREE.CylinderGeometry(0.182, 0.155, 0.26, 16);
      cuirassGeo.translate(0.015, 0.62, 0);
      smoothGeometryNormals(cuirassGeo);
      const cuirassMesh = new THREE.Mesh(cuirassGeo, matSteel);
      cuirassMesh.name = 'Cuirass';
      torsoMesh.add(cuirassMesh);

      // 8. Articulated steel faulds at waist
      const fauldGeo = new THREE.CylinderGeometry(0.162, 0.180, 0.10, 16);
      fauldGeo.translate(0, 0.44, 0);
      smoothGeometryNormals(fauldGeo);
      const fauldMesh = new THREE.Mesh(fauldGeo, matSteel);
      fauldMesh.name = 'Faulds';
      torsoMesh.add(fauldMesh);

      // Kite Shield on Arm_L (solid extruded kite profile + DoubleSide to prevent backface culling)
      armL.add(buildSwordsmanKiteShieldMesh(matTeam, matBrass));

      // Steel Arming Sword in Arm_R
      const bladeGeo = new THREE.ConeGeometry(0.035, 0.72, 8);
      bladeGeo.rotateZ(-0.45);
      bladeGeo.translate(0.25, 0.10, 0);
      const swordMesh = new THREE.Mesh(bladeGeo, matSteel);
      swordMesh.name = 'Weapon';

      const guardGeo = new THREE.BoxGeometry(0.038, 0.035, 0.24);
      guardGeo.translate(0.08, -0.20, 0);
      swordMesh.add(new THREE.Mesh(guardGeo, matBrass));

      const pommelGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12);
      pommelGeo.translate(0.02, -0.32, 0);
      swordMesh.add(new THREE.Mesh(pommelGeo, matSteel));
      armR.add(swordMesh);
      break;
    }

    case 'spearman': {
      // Wide-brimmed Kettle Helm
      const domeGeo = new THREE.SphereGeometry(0.136, 20, 14);
      domeGeo.translate(0, 0.04, 0);
      const helmMesh = new THREE.Mesh(domeGeo, matIron);
      helmMesh.name = 'Helmet_Kettle';
      const brimGeo = new THREE.CylinderGeometry(0.14, 0.21, 0.035, 18);
      brimGeo.translate(0, 0.02, 0);
      helmMesh.add(new THREE.Mesh(brimGeo, matIron));
      headMesh.add(helmMesh);

      // Modeled ears on head
      for (const ez of [-0.12, 0.12]) {
        const earGeo = new THREE.BoxGeometry(0.02, 0.045, 0.02);
        earGeo.translate(0, 0, ez);
        const earMesh = new THREE.Mesh(earGeo, matSkin);
        earMesh.name = ez < 0 ? 'Ear_L' : 'Ear_R';
        headMesh.add(earMesh);
      }

      // Connecting neck
      const neckGeo = new THREE.CylinderGeometry(0.046, 0.052, 0.10, 12);
      neckGeo.translate(0, 0.84, 0);
      const neckMesh = new THREE.Mesh(neckGeo, matSkin);
      neckMesh.name = 'Neck';
      torsoMesh.add(neckMesh);

      // Round Bossed Shield on Arm_L, angled 45 degrees towards the left
      const shieldGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 18);
      shieldGeo.rotateX(Math.PI * 0.5);
      shieldGeo.rotateY(-Math.PI * 0.25);
      shieldGeo.translate(0.08, -0.18, -0.08);
      const shieldMesh = new THREE.Mesh(shieldGeo, matTeam);
      shieldMesh.name = 'Shield';

      const bossGeo = new THREE.SphereGeometry(0.058, 16, 12);
      bossGeo.translate(0.10, -0.18, -0.06);
      const bossMesh = new THREE.Mesh(bossGeo, matIron);
      bossMesh.name = 'Shield_Boss';
      shieldMesh.add(bossMesh);

      armL.add(shieldMesh);

      // Long Ash Spear in Arm_R
      const spearGeo = new THREE.CylinderGeometry(0.018, 0.020, 1.38, 12);
      spearGeo.rotateZ(-0.32);
      spearGeo.translate(0.18, 0.12, 0);
      const spearMesh = new THREE.Mesh(spearGeo, matWood);
      spearMesh.name = 'Weapon';

      const tipGeo = new THREE.ConeGeometry(0.035, 0.24, 8);
      tipGeo.rotateZ(-0.32);
      tipGeo.translate(0.42, 0.78, 0);
      const tipMesh = new THREE.Mesh(tipGeo, matSteel);
      tipMesh.name = 'Weapon_Tip';
      spearMesh.add(tipMesh);
      armR.add(spearMesh);

      // Spare Javelin on back
      const javGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.86, 10);
      javGeo.translate(-0.14, 0.65, 0);
      const javMesh = new THREE.Mesh(javGeo, matWood);
      javMesh.name = 'Javelin_Back';
      torsoMesh.add(javMesh);
      break;
    }

    case 'crossbowman': {
      // Shoulder Pads (Pauldron_L, Pauldron_R)
      const pauldronLGeo = new THREE.SphereGeometry(0.07, 14, 10);
      pauldronLGeo.scale(0.85, 0.65, 0.95);
      pauldronLGeo.translate(0, 0.02, 0);
      const pauldronL = new THREE.Mesh(pauldronLGeo, matLeather);
      pauldronL.name = 'Pauldron_L';
      armL.add(pauldronL);

      const pauldronRGeo = new THREE.SphereGeometry(0.07, 14, 10);
      pauldronRGeo.scale(0.85, 0.65, 0.95);
      pauldronRGeo.translate(0, 0.02, 0);
      const pauldronR = new THREE.Mesh(pauldronRGeo, matLeather);
      pauldronR.name = 'Pauldron_R';
      armR.add(pauldronR);

      // Kettle Helmet
      const helmGeo = new THREE.SphereGeometry(0.138, 20, 14);
      helmGeo.translate(0, 0.03, 0);
      const helmMesh = new THREE.Mesh(helmGeo, matIron);
      helmMesh.name = 'Helmet';
      headMesh.add(helmMesh);

      // Pavise on back
      const paviseGeo = new THREE.BoxGeometry(0.04, 0.42, 0.28);
      paviseGeo.translate(-0.14, 0.62, 0);
      const paviseMesh = new THREE.Mesh(paviseGeo, matTeam);
      paviseMesh.name = 'Back_Pavise';
      torsoMesh.add(paviseMesh);

      // Crossbow in Arm_R
      const stockGeo = new THREE.BoxGeometry(0.46, 0.075, 0.055);
      stockGeo.translate(0.24, -0.22, 0);
      const xbowMesh = new THREE.Mesh(stockGeo, matWood);
      xbowMesh.name = 'Weapon';

      const prodGeo = new THREE.BoxGeometry(0.045, 0.032, 0.44);
      prodGeo.translate(0.42, -0.19, 0);
      xbowMesh.add(new THREE.Mesh(prodGeo, matSteel));
      armR.add(xbowMesh);
      break;
    }

    case 'barbarian': {
      // Fur Pelt Mantle draped heavily over shoulders
      const furGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.17, 16);
      furGeo.translate(-0.01, 0.74, 0);
      const furMesh = new THREE.Mesh(furGeo, matFur);
      furMesh.name = 'Fur_Mantle';
      torsoMesh.add(furMesh);

      // Connecting bull neck
      const neckGeo = new THREE.CylinderGeometry(0.052, 0.056, 0.10, 12);
      neckGeo.translate(0, 0.84, 0);
      const neckMesh = new THREE.Mesh(neckGeo, matSkin);
      neckMesh.name = 'Neck';
      torsoMesh.add(neckMesh);

      // Player-colored war tabard / loincloth
      const tabardGeo = new THREE.BoxGeometry(0.22, 0.26, 0.18);
      tabardGeo.translate(0.01, 0.40, 0);
      const tabardMesh = new THREE.Mesh(tabardGeo, matTeam);
      tabardMesh.name = 'Tabard_Team';
      torsoMesh.add(tabardMesh);

      // Studded leather belt
      const beltGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.045, 16);
      beltGeo.translate(0, 0.495, 0);
      const beltMesh = new THREE.Mesh(beltGeo, matLeather);
      beltMesh.name = 'Belt';
      torsoMesh.add(beltMesh);

      // Horned Iron Helmet
      const helmGeo = new THREE.SphereGeometry(0.138, 20, 14);
      helmGeo.translate(0, 0.04, 0);
      const helmMesh = new THREE.Mesh(helmGeo, matIron);
      helmMesh.name = 'Helmet_Horned';
      for (const zSign of [-1, 1]) {
        const hornGeo = new THREE.ConeGeometry(0.032, 0.18, 12);
        hornGeo.rotateX(zSign * 0.65);
        hornGeo.translate(0.02, 0.12, zSign * 0.14);
        helmMesh.add(new THREE.Mesh(hornGeo, matFeather));
      }

      // Modeled ears on head
      for (const ez of [-0.12, 0.12]) {
        const earGeo = new THREE.BoxGeometry(0.02, 0.045, 0.02);
        earGeo.translate(0, 0, ez);
        const earMesh = new THREE.Mesh(earGeo, matSkin);
        earMesh.name = ez < 0 ? 'Ear_L' : 'Ear_R';
        headMesh.add(earMesh);
      }
      headMesh.add(helmMesh);

      // Studded bracers on arms
      for (const arm of [armL, armR]) {
        const bracerGeo = new THREE.CylinderGeometry(0.062, 0.052, 0.11, 12);
        bracerGeo.translate(0.03, -0.21, 0);
        const bracerMesh = new THREE.Mesh(bracerGeo, matLeather);
        bracerMesh.name = `${arm.name}_Bracer`;
        arm.add(bracerMesh);
      }

      // Double-Bitted Battleaxe in Arm_R
      const shaftGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.95, 12);
      shaftGeo.rotateZ(-0.36);
      shaftGeo.translate(0.16, 0.04, 0);
      const axeMesh = new THREE.Mesh(shaftGeo, matWood);
      axeMesh.name = 'Weapon';

      const bladeGeo = new THREE.BoxGeometry(0.28, 0.22, 0.035);
      bladeGeo.rotateZ(-0.36);
      bladeGeo.translate(0.30, 0.34, 0);
      const bladeMesh = new THREE.Mesh(bladeGeo, matSteel);
      bladeMesh.name = 'Axe_Blade';
      axeMesh.add(bladeMesh);
      armR.add(axeMesh);
      break;
    }

    case 'slinger': {
      // Shoulder Pads (Pauldron_L, Pauldron_R)
      const pauldronLGeo = new THREE.SphereGeometry(0.07, 14, 10);
      pauldronLGeo.scale(0.85, 0.65, 0.95);
      pauldronLGeo.translate(0, 0.02, 0);
      const pauldronL = new THREE.Mesh(pauldronLGeo, matLeather);
      pauldronL.name = 'Pauldron_L';
      armL.add(pauldronL);

      const pauldronRGeo = new THREE.SphereGeometry(0.07, 14, 10);
      pauldronRGeo.scale(0.85, 0.65, 0.95);
      pauldronRGeo.translate(0, 0.02, 0);
      const pauldronR = new THREE.Mesh(pauldronRGeo, matLeather);
      pauldronR.name = 'Pauldron_R';
      armR.add(pauldronR);

      // Headband
      const bandGeo = new THREE.CylinderGeometry(0.132, 0.132, 0.04, 18);
      bandGeo.translate(0, 0.04, 0);
      const bandMesh = new THREE.Mesh(bandGeo, matTeam);
      bandMesh.name = 'Headband';
      headMesh.add(bandMesh);

      // Stone Pouch at hip
      const pouchGeo = new THREE.SphereGeometry(0.075, 16, 12);
      pouchGeo.translate(0.03, 0.42, 0.12);
      torsoMesh.add(new THREE.Mesh(pouchGeo, matLeather));

      // Small Buckler on Arm_L
      const bucklerGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 18);
      bucklerGeo.rotateX(Math.PI * 0.5);
      bucklerGeo.translate(0.08, -0.20, -0.08);
      const bucklerMesh = new THREE.Mesh(bucklerGeo, matBrass);
      bucklerMesh.name = 'Shield';
      armL.add(bucklerMesh);

      // Braided Sling & Stone in Arm_R
      const slingGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.34, 12);
      slingGeo.translate(0.08, -0.40, 0.02);
      const slingMesh = new THREE.Mesh(slingGeo, matLeather);
      slingMesh.name = 'Weapon';

      const stoneGeo = new THREE.IcosahedronGeometry(0.045, 2);
      stoneGeo.translate(0.09, -0.56, 0.04);
      slingMesh.add(new THREE.Mesh(stoneGeo, matStone));
      armR.add(slingMesh);
      break;
    }

    case 'healer': {
      // 1. Cloth Coif / Physician Cowl on Head
      const coifGeo = new THREE.SphereGeometry(0.138, 20, 14);
      coifGeo.translate(-0.01, 0.02, 0);
      const coifMesh = new THREE.Mesh(coifGeo, matTeam);
      coifMesh.name = 'Helmet_Coif';
      headMesh.add(coifMesh);

      // 2. Remedies Satchel at Hip / Torso
      const satchelPouchGeo = new THREE.BoxGeometry(0.12, 0.14, 0.08);
      satchelPouchGeo.translate(0.08, 0.40, -0.16);
      smoothGeometryNormals(satchelPouchGeo);
      const satchelMesh = new THREE.Mesh(satchelPouchGeo, matLeather);
      satchelMesh.name = 'Satchel';

      // Satchel flap
      const flapGeo = new THREE.BoxGeometry(0.125, 0.065, 0.085);
      flapGeo.translate(0.08, 0.44, -0.16);
      satchelMesh.add(new THREE.Mesh(flapGeo, matDarkLeather));

      // Bronze buckle
      const buckleGeo = new THREE.BoxGeometry(0.035, 0.03, 0.02);
      buckleGeo.translate(0.145, 0.42, -0.16);
      satchelMesh.add(new THREE.Mesh(buckleGeo, matBrass));

      // Shoulder strap slung diagonally across torso
      const strapGeo = new THREE.BoxGeometry(0.028, 0.46, 0.015);
      strapGeo.rotateZ(0.42);
      strapGeo.rotateY(0.25);
      strapGeo.translate(0.09, 0.60, -0.05);
      satchelMesh.add(new THREE.Mesh(strapGeo, matDarkLeather));

      // Herbal remedy vial in side loop
      const vialGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.065, 10);
      vialGeo.translate(0.08, 0.44, -0.10);
      satchelMesh.add(new THREE.Mesh(vialGeo, makeMat(0x33cc66, 0.25, 0.1)));
      torsoMesh.add(satchelMesh);

      // 3. Simple Shield (Round Wooden Buckler on Arm_L)
      const shieldGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.028, 16);
      shieldGeo.rotateZ(Math.PI * 0.5);
      shieldGeo.translate(0.09, -0.18, -0.08);
      smoothGeometryNormals(shieldGeo);
      const shieldMesh = new THREE.Mesh(shieldGeo, matWood);
      shieldMesh.name = 'Shield';

      // Iron rim around buckler
      const rimGeo = new THREE.TorusGeometry(0.18, 0.014, 8, 18);
      rimGeo.rotateY(Math.PI * 0.5);
      rimGeo.translate(0.09, -0.18, -0.08);
      shieldMesh.add(new THREE.Mesh(rimGeo, matIron));

      // Iron boss in center of shield
      const bossGeo = new THREE.SphereGeometry(0.05, 14, 10);
      bossGeo.translate(0.105, -0.18, -0.08);
      shieldMesh.add(new THREE.Mesh(bossGeo, matIron));
      armL.add(shieldMesh);

      // 4. Remedy Knife / Dagger in Arm_R
      // Steel blade
      const bladeGeo = new THREE.BoxGeometry(0.015, 0.22, 0.038);
      bladeGeo.rotateZ(-0.45);
      bladeGeo.translate(0.12, -0.10, 0);
      smoothGeometryNormals(bladeGeo);
      const knifeMesh = new THREE.Mesh(bladeGeo, matSteel);
      knifeMesh.name = 'Weapon';

      // Blade tip
      const tipGeo = new THREE.ConeGeometry(0.022, 0.08, 6);
      tipGeo.rotateZ(-0.45);
      tipGeo.translate(0.19, -0.03, 0);
      smoothGeometryNormals(tipGeo);
      knifeMesh.add(new THREE.Mesh(tipGeo, matSteel));

      // Brass bolster / guard
      const guardGeo = new THREE.BoxGeometry(0.028, 0.025, 0.075);
      guardGeo.rotateZ(-0.45);
      guardGeo.translate(0.05, -0.17, 0);
      knifeMesh.add(new THREE.Mesh(guardGeo, matBrass));

      // Wrapped grip
      const gripGeo = new THREE.CylinderGeometry(0.02, 0.022, 0.10, 10);
      gripGeo.rotateZ(-0.45);
      gripGeo.translate(0.015, -0.21, 0);
      knifeMesh.add(new THREE.Mesh(gripGeo, matDarkLeather));
      armR.add(knifeMesh);
      break;
    }

    case 'maceman': {
      // 1. Padded Arming Cap / Gambeson Coif on Head
      const coifGeo = new THREE.SphereGeometry(0.138, 20, 14);
      coifGeo.translate(-0.01, 0.02, 0);
      const coifMesh = new THREE.Mesh(coifGeo, matCloth);
      coifMesh.name = 'Helmet_Coif';
      headMesh.add(coifMesh);

      // Gambeson Collar / Padded Shoulder Mantle on Torso
      const collarGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.12, 14);
      collarGeo.translate(0, 0.72, 0);
      const collarMesh = new THREE.Mesh(collarGeo, matCloth);
      collarMesh.name = 'Gambeson_Collar';
      torsoMesh.add(collarMesh);

      // Two-handed stance (no shield, holds mace with both hands):
      // Left Arm angled forward across chest towards the mace haft
      armL.rotation.set(0.35, 0.45, -0.65);
      // Right Arm angled forward holding the upper haft
      armR.rotation.set(0.40, -0.25, 0.50);

      // 2. Two-Handed Heavy Flanged Mace on Arm_R:
      const maceHaftGeo = new THREE.CylinderGeometry(0.022, 0.020, 0.95, 12);
      maceHaftGeo.translate(0.14, 0.08, -0.06);
      maceHaftGeo.rotateZ(-0.45);
      const maceMesh = new THREE.Mesh(maceHaftGeo, matWood);
      maceMesh.name = 'Weapon';

      // Flanged head core
      const headCoreGeo = new THREE.CylinderGeometry(0.045, 0.040, 0.18, 12);
      headCoreGeo.translate(0.38, 0.32, -0.06);
      headCoreGeo.rotateZ(-0.45);
      maceMesh.add(new THREE.Mesh(headCoreGeo, matSteel));

      // 6 steel flanges
      for (let i = 0; i < 6; i++) {
        const flangeAngle = (i * Math.PI) / 3;
        const flangeGeo = new THREE.BoxGeometry(0.08, 0.16, 0.018);
        flangeGeo.rotateY(flangeAngle);
        flangeGeo.translate(0.38, 0.32, -0.06);
        flangeGeo.rotateZ(-0.45);
        maceMesh.add(new THREE.Mesh(flangeGeo, matSteel));
      }

      // Piercing top spike
      const spikeGeo = new THREE.ConeGeometry(0.024, 0.14, 8);
      spikeGeo.translate(0.48, 0.44, -0.06);
      spikeGeo.rotateZ(-0.45);
      maceMesh.add(new THREE.Mesh(spikeGeo, matSteel));

      // Weighted pommel counterweight
      const pommelGeo = new THREE.SphereGeometry(0.038, 10, 8);
      pommelGeo.translate(-0.14, -0.42, -0.06);
      maceMesh.add(new THREE.Mesh(pommelGeo, matSteel));

      armR.add(maceMesh);
      break;
    }


  }

  compactArticulatedUnitHierarchy(torsoMesh, unitKey);
  torsoMesh.userData = {
    unitKey,
    source: 'procedural_3d',
    height: AVERAGE_UNIT_3D_HEIGHT,
  };

  proceduralUnitTemplateCache.set(cacheKey, torsoMesh);
  return cloneCompactedUnitTemplate(torsoMesh);
}

export type ForestTreeVariant =
  | 'pine'
  | 'pine_2'
  | 'pine_3'
  | 'pine_4'
  | 'pine_5'
  | 'oak'
  | 'birch'
  | 'willow'
  | 'maple'
  | 'card_pine'
  | 'card_oak'
  | 'card_birch'
  | 'card_willow'
  | 'card_maple';

export interface TreeWindUniforms {
  uWindTime: { value: number };
  uWindDir: { value: THREE.Vector2 };
  uWindStrength: { value: number };
}

export const sharedTreeWindUniforms: TreeWindUniforms = {
  uWindTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(Math.cos(Math.PI * 0.25), Math.sin(Math.PI * 0.25)) },
  uWindStrength: { value: 1.0 },
};

export function updateTreeWindState(
  windAngleRad: number,
  windStrength: number,
  deltaSeconds?: number
): void {
  if (deltaSeconds !== undefined) {
    sharedTreeWindUniforms.uWindTime.value += deltaSeconds;
  }
  sharedTreeWindUniforms.uWindDir.value.set(Math.cos(windAngleRad), Math.sin(windAngleRad));
  sharedTreeWindUniforms.uWindStrength.value = Math.max(0.1, windStrength);
}

let sharedTreeTrunkMaterial: THREE.MeshStandardMaterial | null = null;
let sharedTreeFoliageMaterial: THREE.MeshStandardMaterial | null = null;
let sharedTreeFoliageCardMaterial: THREE.MeshStandardMaterial | null = null;
let sharedTreeFoliageCardDepthMaterial: THREE.MeshDepthMaterial | null = null;
const forestTreeTemplateCache: Map<ForestTreeVariant, THREE.Group> = new Map();

function injectFoliageWindShader(material: THREE.Material, cacheKey: string): void {
  material.customProgramCacheKey = () => cacheKey;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = sharedTreeWindUniforms.uWindTime;
    shader.uniforms.uWindDir = sharedTreeWindUniforms.uWindDir;
    shader.uniforms.uWindStrength = sharedTreeWindUniforms.uWindStrength;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
float heightFactor = clamp(position.y / 0.90, 0.0, 1.0);
float bendFactor = heightFactor * heightFactor;

vec4 worldPos = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float treePhase = worldPos.x * 1.4 + worldPos.z * 1.1;

// Branch & canopy sway (speed reduced to 50%)
float swayCycle = sin(uWindTime * (1.1 + uWindStrength * 0.5) + treePhase);
float gustCycle = sin(uWindTime * 0.6 + worldPos.x * 0.4 + worldPos.z * 0.4);
float swayAmt = (0.04 + 0.05 * uWindStrength) * bendFactor * (0.65 + 0.35 * swayCycle) + (0.025 * uWindStrength * gustCycle * bendFactor);

// High-frequency leaves rustling:
// Speed reduced to 50% of previous value (4.25 + 2.25 * strength vs 8.5 + 4.5 * strength)
float rustleFreq = uWindTime * (4.25 + uWindStrength * 2.25);
float rustle = sin(rustleFreq + position.x * 14.0 + position.z * 12.0) * cos(rustleFreq * 0.75 + position.y * 13.0);
// Intensity reduced to 25% of previous value (0.0035 + 0.0045 * strength vs 0.014 + 0.018 * strength)
float rustleAmt = rustle * (0.0035 + 0.0045 * uWindStrength) * heightFactor;

transformed.x += (uWindDir.x * swayAmt) + rustleAmt * (0.8 + uWindDir.x * 0.4);
transformed.z += (uWindDir.y * swayAmt) + rustleAmt * (0.8 + uWindDir.y * 0.4);
transformed.y += rustleAmt * 0.35 - abs(swayAmt) * 0.20;
`
    );
  };
}

export function getSharedTreeMaterials(): {
  trunkMat: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  foliageCardMat: THREE.MeshStandardMaterial;
  foliageCardDepthMat: THREE.MeshDepthMaterial;
} {
  if (!sharedTreeTrunkMaterial) {
    sharedTreeTrunkMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getTreePartTexture('bark'),
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: false,
      transparent: false,
    });
    sharedTreeTrunkMaterial.userData = { isSharedAsset: true, treePart: 'bark' };
    sharedTreeTrunkMaterial.customProgramCacheKey = () => 'TreeTrunkWindShader';

    sharedTreeTrunkMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = sharedTreeWindUniforms.uWindTime;
      shader.uniforms.uWindDir = sharedTreeWindUniforms.uWindDir;
      shader.uniforms.uWindStrength = sharedTreeWindUniforms.uWindStrength;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
// Trunk and branch wind reaction: base (y=0) anchored to ground, higher limbs sway
float heightFactor = clamp(position.y / 0.90, 0.0, 1.0);
float bendFactor = heightFactor * heightFactor;

vec4 worldPos = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float treePhase = worldPos.x * 1.4 + worldPos.z * 1.1;

// Wind sway oscillation (speed reduced to 50%)
float swayCycle = sin(uWindTime * (1.1 + uWindStrength * 0.5) + treePhase);
float gustCycle = sin(uWindTime * 0.6 + worldPos.x * 0.4 + worldPos.z * 0.4);
float swayAmt = (0.025 + 0.035 * uWindStrength) * bendFactor * (0.7 + 0.3 * swayCycle) + (0.015 * uWindStrength * gustCycle * bendFactor);

transformed.x += uWindDir.x * swayAmt;
transformed.z += uWindDir.y * swayAmt;
transformed.y -= abs(swayAmt) * 0.15;
`
      );
    };
  }
  if (!sharedTreeFoliageMaterial) {
    sharedTreeFoliageMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getTreePartTexture('foliage'),
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.0,
      flatShading: false,
      transparent: false,
    });
    sharedTreeFoliageMaterial.userData = { isSharedAsset: true, treePart: 'foliage' };
    injectFoliageWindShader(sharedTreeFoliageMaterial, 'TreeFoliageWindShader');
  }
  if (!sharedTreeFoliageCardMaterial) {
    sharedTreeFoliageCardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getTreePartTexture('foliage_cards'),
      vertexColors: true,
      alphaTest: 0.45,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: false,
    });
    sharedTreeFoliageCardMaterial.userData = { isSharedAsset: true, treePart: 'foliage_cards' };
    injectFoliageWindShader(sharedTreeFoliageCardMaterial, 'TreeFoliageCardWindShader');
  }
  if (!sharedTreeFoliageCardDepthMaterial) {
    sharedTreeFoliageCardDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: getTreePartTexture('foliage_cards'),
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    });
    sharedTreeFoliageCardDepthMaterial.userData = { isSharedAsset: true, treePart: 'foliage_cards_depth' };
    injectFoliageWindShader(sharedTreeFoliageCardDepthMaterial, 'TreeFoliageCardDepthWindShader');
  }
  return {
    trunkMat: sharedTreeTrunkMaterial,
    foliageMat: sharedTreeFoliageMaterial,
    foliageCardMat: sharedTreeFoliageCardMaterial,
    foliageCardDepthMat: sharedTreeFoliageCardDepthMaterial,
  };
}

type FoliageCardAtlasQuadrant = 'broadleaf' | 'pine' | 'birch' | 'willow';

interface FoliageCardSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  color: number;
}

/**
 * Builds a merged, vertex-colored BufferGeometry of crossed/layered alpha-tested foliage cards
 * mapped to the specified quadrant of `tree_foliage_cards.png`.
 */
function buildFoliageCardGeometry(
  quadrant: FoliageCardAtlasQuadrant,
  cards: FoliageCardSpec[]
): THREE.BufferGeometry {
  // UV bounds with a slight inset to avoid bleeding across atlas quadrants
  let u0 = 0.01;
  let u1 = 0.49;
  let v0 = 0.01;
  let v1 = 0.49;
  if (quadrant === 'pine') {
    u0 = 0.51;
    u1 = 0.99;
    v0 = 0.01;
    v1 = 0.49;
  } else if (quadrant === 'birch') {
    u0 = 0.01;
    u1 = 0.49;
    v0 = 0.51;
    v1 = 0.99;
  } else if (quadrant === 'willow') {
    u0 = 0.51;
    u1 = 0.99;
    v0 = 0.51;
    v1 = 0.99;
  }

  const identityMat = new THREE.Matrix4().identity();
  const items: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [];

  for (const c of cards) {
    // 2x2 segments allow smooth wind bending & leaf rustle across the card surface
    const geo = new THREE.PlaneGeometry(c.w, c.h, 2, 2);
    const uvAttr = geo.getAttribute('uv');
    for (let i = 0; i < uvAttr.count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      uvAttr.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
    }
    if (c.rotX) geo.rotateX(c.rotX);
    if (c.rotZ) geo.rotateZ(c.rotZ);
    if (c.rotY) geo.rotateY(c.rotY);
    geo.translate(c.x, c.y, c.z);
    items.push({ mesh: new THREE.Mesh(geo, makeMat(c.color, 0.85, 0.0)), relMatrix: identityMat });
  }

  return mergeMeshesWithVertexColors(items);
}

const TREE_VARIANT_NAMES: Record<ForestTreeVariant, string> = {
  pine: 'ForestTree_Pine',
  pine_2: 'ForestTree_Pine2',
  pine_3: 'ForestTree_Pine3',
  pine_4: 'ForestTree_Pine4',
  pine_5: 'ForestTree_Pine5',
  oak: 'ForestTree_Oak',
  birch: 'ForestTree_Birch',
  willow: 'ForestTree_Willow',
  maple: 'ForestTree_Maple',
  card_pine: 'ForestTree_CardPine',
  card_oak: 'ForestTree_CardOak',
  card_birch: 'ForestTree_CardBirch',
  card_willow: 'ForestTree_CardWillow',
  card_maple: 'ForestTree_CardMaple',
};

interface StarPyramidTierSpec {
  y: number;
  outerRadius: number;
  height: number;
  rotY: number;
  color: number;
}

interface PineVariantConfig {
  trunkTopRadius: number;
  trunkBottomRadius: number;
  trunkHeight: number;
  starPoints: 5 | 6 | 7;
  innerRatio: number;
  tiers: StarPyramidTierSpec[];
}

const PINE_VARIANT_CONFIGS: Record<'pine' | 'pine_2' | 'pine_3' | 'pine_4' | 'pine_5', PineVariantConfig> = {
  pine: {
    trunkTopRadius: 0.036,
    trunkBottomRadius: 0.060,
    trunkHeight: 0.26,
    starPoints: 6,
    innerRatio: 0.54,
    tiers: [
      { y: 0.21, outerRadius: 0.270, height: 0.24, rotY: 0, color: 0x244a3f },
      { y: 0.36, outerRadius: 0.225, height: 0.22, rotY: Math.PI / 6, color: 0x2c5749 },
      { y: 0.50, outerRadius: 0.180, height: 0.20, rotY: 0, color: 0x356654 },
      { y: 0.63, outerRadius: 0.135, height: 0.18, rotY: Math.PI / 6, color: 0x3f755f },
      { y: 0.75, outerRadius: 0.088, height: 0.16, rotY: 0, color: 0x4a866c },
    ],
  },
  pine_2: {
    trunkTopRadius: 0.032,
    trunkBottomRadius: 0.054,
    trunkHeight: 0.25,
    starPoints: 5,
    innerRatio: 0.50,
    tiers: [
      { y: 0.20, outerRadius: 0.220, height: 0.21, rotY: 0, color: 0x264d42 },
      { y: 0.33, outerRadius: 0.190, height: 0.19, rotY: Math.PI / 5, color: 0x2e5b4d },
      { y: 0.45, outerRadius: 0.160, height: 0.18, rotY: (Math.PI * 2) / 5, color: 0x366957 },
      { y: 0.57, outerRadius: 0.130, height: 0.17, rotY: Math.PI / 5, color: 0x3f7762 },
      { y: 0.68, outerRadius: 0.098, height: 0.15, rotY: 0, color: 0x48856d },
      { y: 0.79, outerRadius: 0.068, height: 0.14, rotY: Math.PI / 5, color: 0x529378 },
    ],
  },
  pine_3: {
    trunkTopRadius: 0.042,
    trunkBottomRadius: 0.068,
    trunkHeight: 0.26,
    starPoints: 7,
    innerRatio: 0.58,
    tiers: [
      { y: 0.21, outerRadius: 0.300, height: 0.27, rotY: 0, color: 0x2b5341 },
      { y: 0.38, outerRadius: 0.240, height: 0.24, rotY: Math.PI / 7, color: 0x34624b },
      { y: 0.53, outerRadius: 0.175, height: 0.21, rotY: 0, color: 0x3e7156 },
      { y: 0.68, outerRadius: 0.110, height: 0.19, rotY: Math.PI / 7, color: 0x498162 },
    ],
  },
  pine_4: {
    trunkTopRadius: 0.036,
    trunkBottomRadius: 0.058,
    trunkHeight: 0.24,
    starPoints: 7,
    innerRatio: 0.46,
    tiers: [
      { y: 0.19, outerRadius: 0.260, height: 0.23, rotY: 0, color: 0x20443d },
      { y: 0.34, outerRadius: 0.215, height: 0.21, rotY: 0.28, color: 0x285249 },
      { y: 0.48, outerRadius: 0.170, height: 0.19, rotY: 0.56, color: 0x316155 },
      { y: 0.61, outerRadius: 0.125, height: 0.18, rotY: 0.84, color: 0x3b7162 },
      { y: 0.74, outerRadius: 0.080, height: 0.16, rotY: 1.12, color: 0x46816f },
    ],
  },
  pine_5: {
    trunkTopRadius: 0.038,
    trunkBottomRadius: 0.062,
    trunkHeight: 0.25,
    starPoints: 6,
    innerRatio: 0.52,
    tiers: [
      { y: 0.20, outerRadius: 0.255, height: 0.21, rotY: 0, color: 0x274f43 },
      { y: 0.33, outerRadius: 0.215, height: 0.19, rotY: Math.PI / 6, color: 0x2f5d4e },
      { y: 0.45, outerRadius: 0.175, height: 0.18, rotY: 0.25, color: 0x386c59 },
      { y: 0.57, outerRadius: 0.140, height: 0.17, rotY: Math.PI / 6 + 0.25, color: 0x427b65 },
      { y: 0.68, outerRadius: 0.105, height: 0.15, rotY: 0.5, color: 0x4c8a71 },
      { y: 0.78, outerRadius: 0.072, height: 0.14, rotY: Math.PI / 6 + 0.5, color: 0x57997d },
    ],
  },
};

/**
 * Builds an open-bottom star-based pyramid BufferGeometry (only side faces, no base cap).
 * Used for stacked low-poly pine tree bough tiers.
 */
function createStarPyramidGeometry(
  starPoints: 5 | 6 | 7,
  outerRadius: number,
  innerRadius: number,
  height: number,
  rotationY: number = 0
): THREE.BufferGeometry {
  const numPerimeter = starPoints * 2;
  const perimeter: Array<[number, number, number]> = [];
  for (let k = 0; k < numPerimeter; k++) {
    const angle = (k / numPerimeter) * Math.PI * 2 + rotationY;
    const r = k % 2 === 0 ? outerRadius : innerRadius;
    perimeter.push([Math.cos(angle) * r, 0, Math.sin(angle) * r]);
  }

  const positions: number[] = [];
  for (let k = 0; k < numPerimeter; k++) {
    const curr = perimeter[k];
    const next = perimeter[(k + 1) % numPerimeter];
    // Outward-facing CCW winding: apex -> next -> curr
    positions.push(0, height, 0, next[0], next[1], next[2], curr[0], curr[1], curr[2]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  applyTreeUVMapping(geo, 'pine_foliage');
  return geo;
}

/**
 * Builds a low-poly 3D forest tree (opaque low-poly or alpha-tested foliage cards) with total height ~0.90 world units
 * (75% of the 1.20 average humanoid unit height).
 * Compacts all foliage tiers/clusters into a single vertex-colored `Foliage` mesh
 * and caches the template per variant so all forest trees share geometries and materials.
 */
export function buildLowPolyForestTreeMesh(
  variant: ForestTreeVariant = 'pine',
  heightScale: number = 1.0
): THREE.Group {
  let templateGroup = forestTreeTemplateCache.get(variant);
  if (!templateGroup) {
    templateGroup = new THREE.Group();
    templateGroup.name = TREE_VARIANT_NAMES[variant];

    const { trunkMat, foliageMat, foliageCardMat, foliageCardDepthMat } = getSharedTreeMaterials();
    const identityMat = new THREE.Matrix4().identity();

    if (
      variant === 'pine' ||
      variant === 'pine_2' ||
      variant === 'pine_3' ||
      variant === 'pine_4' ||
      variant === 'pine_5'
    ) {
      const cfg = PINE_VARIANT_CONFIGS[variant];
      const trunkGeo = new THREE.CylinderGeometry(
        cfg.trunkTopRadius,
        cfg.trunkBottomRadius,
        cfg.trunkHeight,
        10
      );
      applyTreeUVMapping(trunkGeo, 'trunk');
      trunkGeo.translate(0, cfg.trunkHeight * 0.5, 0);
      smoothGeometryNormals(trunkGeo);
      trunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const tierItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [];
      for (const tier of cfg.tiers) {
        const tierGeo = createStarPyramidGeometry(
          cfg.starPoints,
          tier.outerRadius,
          tier.outerRadius * cfg.innerRatio,
          tier.height,
          tier.rotY
        );
        tierGeo.translate(0, tier.y, 0);
        tierItems.push({
          mesh: new THREE.Mesh(tierGeo, makeMat(tier.color, 0.85, 0.0)),
          relMatrix: identityMat,
        });
      }

      const foliageGeo = mergeMeshesWithVertexColors(tierItems);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Pine';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'oak') {
      const trunkGeo = new THREE.CylinderGeometry(0.050, 0.075, 0.36, 10);
      applyTreeUVMapping(trunkGeo, 'trunk');
      trunkGeo.translate(0, 0.18, 0);
      smoothGeometryNormals(trunkGeo);
      trunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const oakMain = makeMat(0x48b83c, 0.85, 0.0);
      const oakAccent = makeMat(0x62d454, 0.82, 0.0);

      const crownMainGeo = new THREE.IcosahedronGeometry(0.25, 2);
      applyTreeUVMapping(crownMainGeo, 'oak_foliage');
      crownMainGeo.scale(1.08, 0.95, 1.05);
      crownMainGeo.translate(0, 0.58, 0);

      const foliageItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(crownMainGeo, oakMain), relMatrix: identityMat },
      ];

      for (const [cx, cy, cz, r] of [
        [0.12, 0.52, 0.08, 0.17],
        [-0.11, 0.54, -0.09, 0.16],
        [0.02, 0.75, -0.04, 0.15],
      ]) {
        const subGeo = new THREE.IcosahedronGeometry(r, 2);
        applyTreeUVMapping(subGeo, 'oak_foliage');
        subGeo.translate(cx, cy, cz);
        foliageItems.push({ mesh: new THREE.Mesh(subGeo, oakAccent), relMatrix: identityMat });
      }

      const foliageGeo = mergeMeshesWithVertexColors(foliageItems);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Oak';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'birch') {
      // 1. Slender birch trunk (12 segments, 3 height segments, graceful curve)
      const trunkGeo = new THREE.CylinderGeometry(0.024, 0.038, 0.44, 12, 3);
      const pos = trunkGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const ny = Math.max(0, y) / 0.44;
        pos.setX(i, pos.getX(i) + Math.sin(ny * Math.PI) * 0.016);
      }
      trunkGeo.computeVertexNormals();
      trunkGeo.translate(0, 0.22, 0);

      const birchBark = makeMat(0xf0ede6, 0.90, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, birchBark), relMatrix: identityMat },
      ];

      // 3 ascending limbs
      const limbDefs = [
        { y: 0.28, len: 0.15, angleZ: -0.42, angleY: 0.5 },
        { y: 0.35, len: 0.14, angleZ: 0.45, angleY: 2.5 },
        { y: 0.40, len: 0.12, angleZ: -0.38, angleY: -1.8 },
      ];
      for (const limb of limbDefs) {
        const limbGeo = new THREE.CylinderGeometry(0.009, 0.016, limb.len, 6);
        limbGeo.translate(0, limb.len * 0.5, 0);
        limbGeo.rotateZ(limb.angleZ);
        limbGeo.rotateY(limb.angleY);
        limbGeo.translate(0, limb.y, 0);
        trunkItems.push({ mesh: new THREE.Mesh(limbGeo, birchBark), relMatrix: identityMat });
      }

      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      // 4 airy foliage clusters with early autumn palette: luminous gold, yellow-green, warm ochre, amber
      const birchGold = makeMat(0xe8c734, 0.82, 0.0);   // Golden yellow crown
      const birchGreen = makeMat(0x9fc838, 0.84, 0.0);  // Lingering late-summer yellow-green
      const birchOchre = makeMat(0xdfa628, 0.83, 0.0);  // Warm autumn ochre
      const birchAmber = makeMat(0xd88824, 0.82, 0.0);  // Amber with hint of orange

      const topCrownGeo = new THREE.IcosahedronGeometry(0.18, 2);
      topCrownGeo.scale(0.9, 1.15, 0.9);
      topCrownGeo.translate(0.01, 0.68, 0.0);

      const foliageItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(topCrownGeo, birchGold), relMatrix: identityMat },
      ];

      const birchClusters = [
        { x: 0.10, y: 0.50, z: 0.05, r: 0.13, mat: birchGreen },
        { x: -0.09, y: 0.54, z: 0.07, r: 0.12, mat: birchOchre },
        { x: 0.02, y: 0.58, z: -0.09, r: 0.12, mat: birchAmber },
      ];
      for (const cl of birchClusters) {
        const subGeo = new THREE.IcosahedronGeometry(cl.r, 2);
        subGeo.translate(cl.x, cl.y, cl.z);
        foliageItems.push({ mesh: new THREE.Mesh(subGeo, cl.mat), relMatrix: identityMat });
      }

      const foliageGeo = mergeMeshesWithVertexColors(foliageItems);
      applyTreeUVMapping(foliageGeo, 'oak_foliage');
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Birch';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'willow') {
      // 1. Gnarled curved trunk (14 segments, 3 height segments)
      const trunkGeo = new THREE.CylinderGeometry(0.052, 0.084, 0.36, 14, 3);
      const pos = trunkGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const ny = Math.max(0, y) / 0.36;
        pos.setX(i, pos.getX(i) + Math.sin(ny * Math.PI * 0.8) * 0.022);
        pos.setZ(i, pos.getZ(i) + Math.cos(ny * Math.PI * 0.8) * 0.016);
      }
      trunkGeo.computeVertexNormals();
      trunkGeo.translate(0, 0.18, 0);

      const willowBark = makeMat(0x564230, 0.92, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, willowBark), relMatrix: identityMat },
      ];

      // 4 arching limbs in 4 directions
      const limbAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (const ang of limbAngles) {
        const limbGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.18, 8);
        limbGeo.translate(0, 0.09, 0);
        limbGeo.rotateZ(0.65);
        limbGeo.rotateY(ang);
        limbGeo.translate(0, 0.28, 0);
        trunkItems.push({ mesh: new THREE.Mesh(limbGeo, willowBark), relMatrix: identityMat });
      }

      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      // Cascading weeping willow fronds with early autumn palette: olive-lime, golden-yellow, chartreuse, amber-ochre, russet-bronze
      const willowLime = makeMat(0x7e9e38, 0.84, 0.0);       // Olive-lime green
      const willowGold = makeMat(0xd4be3a, 0.83, 0.0);       // Pale golden-yellow frond
      const willowChartreuse = makeMat(0x9eb838, 0.84, 0.0); // Chartreuse yellow-green
      const willowOchre = makeMat(0xc89832, 0.83, 0.0);      // Warm amber-ochre
      const willowRusset = makeMat(0xa4782e, 0.85, 0.0);     // Russet-tinted bronze

      const domeGeo = new THREE.IcosahedronGeometry(0.24, 2);
      domeGeo.scale(1.15, 0.80, 1.15);
      domeGeo.translate(0, 0.52, 0);

      const foliageItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(domeGeo, willowLime), relMatrix: identityMat },
      ];

      // 4 hanging clusters draped downwards with early autumn gradient
      const willowFronds = [
        { x: 0.16, y: 0.38, z: 0.0, mat: willowGold },
        { x: -0.16, y: 0.39, z: 0.0, mat: willowChartreuse },
        { x: 0.0, y: 0.37, z: 0.16, mat: willowOchre },
        { x: 0.0, y: 0.38, z: -0.16, mat: willowRusset },
      ];
      for (const cl of willowFronds) {
        const frondGeo = new THREE.IcosahedronGeometry(0.14, 2);
        frondGeo.scale(0.75, 1.45, 0.75);
        frondGeo.translate(cl.x, cl.y, cl.z);
        foliageItems.push({ mesh: new THREE.Mesh(frondGeo, cl.mat), relMatrix: identityMat });
      }

      const foliageGeo = mergeMeshesWithVertexColors(foliageItems);
      applyTreeUVMapping(foliageGeo, 'oak_foliage');
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Willow';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'maple') {
      // 1. Sturdy flared hardwood maple trunk
      const trunkGeo = new THREE.CylinderGeometry(0.046, 0.076, 0.32, 12, 2);
      trunkGeo.translate(0, 0.16, 0);
      smoothGeometryNormals(trunkGeo);

      const mapleBark = makeMat(0x654732, 0.90, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, mapleBark), relMatrix: identityMat },
      ];

      // 4 branch forks
      const forkDefs = [
        { len: 0.16, angleZ: -0.50, angleY: 0.3 },
        { len: 0.15, angleZ: 0.52, angleY: 1.8 },
        { len: 0.14, angleZ: -0.45, angleY: -1.4 },
        { len: 0.13, angleZ: 0.40, angleY: -2.8 },
      ];
      for (const fork of forkDefs) {
        const forkGeo = new THREE.CylinderGeometry(0.014, 0.024, fork.len, 6);
        forkGeo.translate(0, fork.len * 0.5, 0);
        forkGeo.rotateZ(fork.angleZ);
        forkGeo.rotateY(fork.angleY);
        forkGeo.translate(0, 0.24, 0);
        trunkItems.push({ mesh: new THREE.Mesh(forkGeo, mapleBark), relMatrix: identityMat });
      }

      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      // Autumn maple crown (5 overlapping clusters: golden-yellow -> lingering yellow-green -> bright orange -> deep brown-red/crimson -> warm russet)
      const mapleAmber = makeMat(0xedb82b, 0.83, 0.0);    // Golden yellow-amber
      const mapleGreen = makeMat(0x86b032, 0.84, 0.0);    // Lingering late-summer yellow-green
      const mapleOrange = makeMat(0xdf6c22, 0.82, 0.0);   // Bright autumn orange
      const mapleBrownRed = makeMat(0xa42d1e, 0.80, 0.0); // Deep brown-red / crimson
      const mapleRust = makeMat(0xc85222, 0.81, 0.0);     // Warm russet red-orange

      const mainCrownGeo = new THREE.IcosahedronGeometry(0.25, 2);
      mainCrownGeo.scale(1.10, 0.95, 1.10);
      mainCrownGeo.translate(0, 0.60, 0);

      const foliageItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(mainCrownGeo, mapleAmber), relMatrix: identityMat },
      ];

      const clusters = [
        { x: 0.15, y: 0.52, z: 0.10, r: 0.17, mat: mapleGreen },
        { x: -0.14, y: 0.54, z: -0.08, r: 0.16, mat: mapleBrownRed },
        { x: -0.06, y: 0.50, z: 0.15, r: 0.16, mat: mapleOrange },
        { x: 0.08, y: 0.53, z: -0.14, r: 0.15, mat: mapleRust },
      ];
      for (const cl of clusters) {
        const subGeo = new THREE.IcosahedronGeometry(cl.r, 2);
        subGeo.translate(cl.x, cl.y, cl.z);
        foliageItems.push({ mesh: new THREE.Mesh(subGeo, cl.mat), relMatrix: identityMat });
      }

      const foliageGeo = mergeMeshesWithVertexColors(foliageItems);
      applyTreeUVMapping(foliageGeo, 'oak_foliage');
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Maple';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'card_pine') {
      // Tapered conifer trunk visible between layered pine bough cards
      const trunkGeo = new THREE.CylinderGeometry(0.012, 0.056, 0.78, 8);
      applyTreeUVMapping(trunkGeo, 'trunk');
      trunkGeo.translate(0, 0.39, 0);
      smoothGeometryNormals(trunkGeo);
      trunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const pineCards: FoliageCardSpec[] = [];
      const tiers = [
        { y: 0.30, w: 0.44, h: 0.24, tilt: 0.48, color: 0x244a3f },
        { y: 0.44, w: 0.37, h: 0.22, tilt: 0.44, color: 0x2c5749 },
        { y: 0.57, w: 0.30, h: 0.20, tilt: 0.40, color: 0x356654 },
        { y: 0.69, w: 0.22, h: 0.18, tilt: 0.34, color: 0x3f755f },
        { y: 0.80, w: 0.14, h: 0.15, tilt: 0.18, color: 0x4a866c },
      ];
      for (let ti = 0; ti < tiers.length; ti++) {
        const t = tiers[ti];
        const baseYaw = ti * 0.62;
        // 3 crossed/angled cards per tier for full 360-degree silhouette
        for (let ci = 0; ci < 3; ci++) {
          pineCards.push({
            x: 0,
            y: t.y,
            z: 0,
            w: t.w,
            h: t.h,
            rotX: ci === 0 ? t.tilt : -t.tilt * 0.65,
            rotY: baseYaw + (ci * Math.PI) / 3,
            color: t.color,
          });
        }
      }

      const foliageGeo = buildFoliageCardGeometry('pine', pineCards);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageCardMat);
      foliageMesh.name = 'Foliage_CardPine';
      foliageMesh.customDepthMaterial = foliageCardDepthMat;
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'card_oak') {
      // Sturdy oak trunk + 4 thick spreading branches
      const trunkGeo = new THREE.CylinderGeometry(0.044, 0.072, 0.38, 10);
      trunkGeo.translate(0, 0.19, 0);
      smoothGeometryNormals(trunkGeo);
      const oakBark = makeMat(0x5c422c, 0.92, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, oakBark), relMatrix: identityMat },
      ];
      for (const [angY, angZ, len] of [
        [0.4, -0.58, 0.18],
        [2.0, 0.54, 0.17],
        [3.6, -0.52, 0.16],
        [5.1, 0.50, 0.15],
      ]) {
        const limbGeo = new THREE.CylinderGeometry(0.016, 0.028, len, 6);
        limbGeo.translate(0, len * 0.5, 0);
        limbGeo.rotateZ(angZ);
        limbGeo.rotateY(angY);
        limbGeo.translate(0, 0.28, 0);
        trunkItems.push({ mesh: new THREE.Mesh(limbGeo, oakBark), relMatrix: identityMat });
      }
      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const oakCards: FoliageCardSpec[] = [];
      const clusters = [
        { x: 0.0, y: 0.62, z: 0.0, w: 0.40, h: 0.36, color: 0x4cb840 },
        { x: 0.14, y: 0.52, z: 0.09, w: 0.30, h: 0.28, color: 0x3fa334 },
        { x: -0.13, y: 0.54, z: -0.10, w: 0.30, h: 0.28, color: 0x58c74a },
        { x: -0.08, y: 0.50, z: 0.13, w: 0.28, h: 0.26, color: 0x44ad38 },
        { x: 0.04, y: 0.72, z: -0.05, w: 0.28, h: 0.26, color: 0x69d65a },
      ];
      for (let i = 0; i < clusters.length; i++) {
        const cl = clusters[i];
        const yaw = i * 0.72;
        oakCards.push(
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: 0.18, rotY: yaw, color: cl.color },
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: -0.18, rotY: yaw + Math.PI * 0.5, color: cl.color }
        );
      }

      const foliageGeo = buildFoliageCardGeometry('broadleaf', oakCards);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageCardMat);
      foliageMesh.name = 'Foliage_CardOak';
      foliageMesh.customDepthMaterial = foliageCardDepthMat;
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'card_birch') {
      // Slender curved white-barked trunk + 3 ascending limbs
      const trunkGeo = new THREE.CylinderGeometry(0.020, 0.036, 0.48, 10, 3);
      const pos = trunkGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const ny = Math.max(0, y) / 0.48;
        pos.setX(i, pos.getX(i) + Math.sin(ny * Math.PI) * 0.018);
      }
      trunkGeo.computeVertexNormals();
      trunkGeo.translate(0, 0.24, 0);

      const birchBark = makeMat(0xf0ede6, 0.90, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, birchBark), relMatrix: identityMat },
      ];
      for (const limb of [
        { y: 0.30, len: 0.16, angleZ: -0.42, angleY: 0.5 },
        { y: 0.38, len: 0.15, angleZ: 0.45, angleY: 2.5 },
        { y: 0.44, len: 0.13, angleZ: -0.38, angleY: -1.8 },
      ]) {
        const limbGeo = new THREE.CylinderGeometry(0.008, 0.015, limb.len, 6);
        limbGeo.translate(0, limb.len * 0.5, 0);
        limbGeo.rotateZ(limb.angleZ);
        limbGeo.rotateY(limb.angleY);
        limbGeo.translate(0, limb.y, 0);
        trunkItems.push({ mesh: new THREE.Mesh(limbGeo, birchBark), relMatrix: identityMat });
      }
      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const birchCards: FoliageCardSpec[] = [];
      const clusters = [
        { x: 0.01, y: 0.70, z: 0.0, w: 0.30, h: 0.34, color: 0xebd038 },
        { x: 0.10, y: 0.52, z: 0.06, w: 0.24, h: 0.26, color: 0xa4cc3a },
        { x: -0.09, y: 0.56, z: 0.07, w: 0.23, h: 0.25, color: 0xe3ac2a },
        { x: 0.02, y: 0.60, z: -0.09, w: 0.23, h: 0.25, color: 0xdc8d26 },
      ];
      for (let i = 0; i < clusters.length; i++) {
        const cl = clusters[i];
        const yaw = i * 0.85;
        birchCards.push(
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: 0.12, rotY: yaw, color: cl.color },
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: -0.12, rotY: yaw + Math.PI * 0.5, color: cl.color }
        );
      }

      const foliageGeo = buildFoliageCardGeometry('birch', birchCards);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageCardMat);
      foliageMesh.name = 'Foliage_CardBirch';
      foliageMesh.customDepthMaterial = foliageCardDepthMat;
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'card_willow') {
      // Gnarled curved trunk + 4 arching limbs
      const trunkGeo = new THREE.CylinderGeometry(0.048, 0.080, 0.38, 12, 3);
      const pos = trunkGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const ny = Math.max(0, y) / 0.38;
        pos.setX(i, pos.getX(i) + Math.sin(ny * Math.PI * 0.8) * 0.022);
        pos.setZ(i, pos.getZ(i) + Math.cos(ny * Math.PI * 0.8) * 0.016);
      }
      trunkGeo.computeVertexNormals();
      trunkGeo.translate(0, 0.19, 0);

      const willowBark = makeMat(0x564230, 0.92, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, willowBark), relMatrix: identityMat },
      ];
      for (const ang of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
        const limbGeo = new THREE.CylinderGeometry(0.016, 0.026, 0.19, 8);
        limbGeo.translate(0, 0.095, 0);
        limbGeo.rotateZ(0.68);
        limbGeo.rotateY(ang);
        limbGeo.translate(0, 0.29, 0);
        trunkItems.push({ mesh: new THREE.Mesh(limbGeo, willowBark), relMatrix: identityMat });
      }
      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      // Hanging curtain cards draped around the arching limbs
      const willowCards: FoliageCardSpec[] = [
        { x: 0, y: 0.58, z: 0, w: 0.38, h: 0.30, rotX: 0.35, rotY: 0.3, color: 0x86a83a },
        { x: 0, y: 0.58, z: 0, w: 0.38, h: 0.30, rotX: -0.35, rotY: 0.3 + Math.PI * 0.5, color: 0x9eb838 },
      ];
      const curtains = [
        { x: 0.17, y: 0.39, z: 0.0, color: 0xd4be3a },
        { x: -0.17, y: 0.40, z: 0.0, color: 0x9eb838 },
        { x: 0.0, y: 0.38, z: 0.17, color: 0xc89832 },
        { x: 0.0, y: 0.39, z: -0.17, color: 0xa4782e },
        { x: 0.12, y: 0.41, z: 0.12, color: 0x8aa838 },
        { x: -0.12, y: 0.41, z: -0.12, color: 0xc4aa36 },
      ];
      for (let i = 0; i < curtains.length; i++) {
        const cr = curtains[i];
        const yaw = i * 0.55;
        willowCards.push(
          { x: cr.x, y: cr.y, z: cr.z, w: 0.22, h: 0.38, rotY: yaw, color: cr.color },
          { x: cr.x, y: cr.y, z: cr.z, w: 0.22, h: 0.38, rotY: yaw + Math.PI * 0.5, color: cr.color }
        );
      }

      const foliageGeo = buildFoliageCardGeometry('willow', willowCards);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageCardMat);
      foliageMesh.name = 'Foliage_CardWillow';
      foliageMesh.customDepthMaterial = foliageCardDepthMat;
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else if (variant === 'card_maple') {
      // Flared hardwood trunk + 4 branch forks
      const trunkGeo = new THREE.CylinderGeometry(0.044, 0.074, 0.34, 10, 2);
      trunkGeo.translate(0, 0.17, 0);
      smoothGeometryNormals(trunkGeo);

      const mapleBark = makeMat(0x654732, 0.90, 0.0);
      const trunkItems: Array<{ mesh: THREE.Mesh; relMatrix: THREE.Matrix4 }> = [
        { mesh: new THREE.Mesh(trunkGeo, mapleBark), relMatrix: identityMat },
      ];
      for (const fork of [
        { len: 0.16, angleZ: -0.50, angleY: 0.3 },
        { len: 0.15, angleZ: 0.52, angleY: 1.8 },
        { len: 0.14, angleZ: -0.45, angleY: -1.4 },
        { len: 0.13, angleZ: 0.40, angleY: -2.8 },
      ]) {
        const forkGeo = new THREE.CylinderGeometry(0.014, 0.024, fork.len, 6);
        forkGeo.translate(0, fork.len * 0.5, 0);
        forkGeo.rotateZ(fork.angleZ);
        forkGeo.rotateY(fork.angleY);
        forkGeo.translate(0, 0.25, 0);
        trunkItems.push({ mesh: new THREE.Mesh(forkGeo, mapleBark), relMatrix: identityMat });
      }
      const mergedTrunkGeo = mergeMeshesWithVertexColors(trunkItems);
      applyTreeUVMapping(mergedTrunkGeo, 'trunk');
      mergedTrunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const mapleCards: FoliageCardSpec[] = [];
      const clusters = [
        { x: 0.0, y: 0.62, z: 0.0, w: 0.42, h: 0.36, color: 0xedb82b },
        { x: 0.15, y: 0.52, z: 0.10, w: 0.30, h: 0.28, color: 0x86b032 },
        { x: -0.14, y: 0.54, z: -0.08, w: 0.29, h: 0.28, color: 0xa42d1e },
        { x: -0.06, y: 0.50, z: 0.15, w: 0.29, h: 0.27, color: 0xdf6c22 },
        { x: 0.08, y: 0.53, z: -0.14, w: 0.28, h: 0.26, color: 0xc85222 },
      ];
      for (let i = 0; i < clusters.length; i++) {
        const cl = clusters[i];
        const yaw = i * 0.68;
        mapleCards.push(
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: 0.20, rotY: yaw, color: cl.color },
          { x: cl.x, y: cl.y, z: cl.z, w: cl.w, h: cl.h, rotX: -0.20, rotY: yaw + Math.PI * 0.5, color: cl.color }
        );
      }

      const foliageGeo = buildFoliageCardGeometry('broadleaf', mapleCards);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageCardMat);
      foliageMesh.name = 'Foliage_CardMaple';
      foliageMesh.customDepthMaterial = foliageCardDepthMat;
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    }

    forestTreeTemplateCache.set(variant, templateGroup);
  }

  const treeGroup = templateGroup.clone(true);
  if (variant.startsWith('card_')) {
    const { foliageCardDepthMat } = getSharedTreeMaterials();
    treeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.startsWith('Foliage_Card')) {
        child.customDepthMaterial = foliageCardDepthMat;
      }
    });
  }
  treeGroup.scale.setScalar(heightScale);
  treeGroup.userData = {
    isForestTree: true,
    variant,
    baseHeight: FOREST_TREE_TARGET_HEIGHT,
    height: FOREST_TREE_TARGET_HEIGHT * heightScale,
  };
  return treeGroup;
}
