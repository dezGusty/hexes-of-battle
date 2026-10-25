import * as THREE from 'three';
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
    sharedColorMaterialCache.set(key, mat);
  }
  return mat;
}

export function getTeamColorHex(armyAlignment: number, isHero: boolean = false): number {
  if (isHero) return 0xd4af37;
  return armyAlignment === 0 ? 0x2f63c7 : 0xc73636;
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

    if (mesh.name === 'Head') {
      applyBarbarianUVMapping(mesh.geometry, 'head_face');
      // Use white vertex color on the face sphere so barbarian_face.png's true colors appear
      mesh.material = makeMat(0xffffff, 0.72, 0.0);
    } else if (
      rawName.includes('helmet') ||
      rawName.includes('horn') ||
      parentName.includes('helmet')
    ) {
      applyBarbarianUVMapping(mesh.geometry, 'helmet_horn');
    } else if (mesh.name === 'Torso') {
      applyBarbarianUVMapping(mesh.geometry, 'torso_skin');
    } else if (
      mesh.name === 'Arm_L' ||
      mesh.name === 'Arm_R' ||
      rawName.includes('hand') ||
      parentName.startsWith('arm_')
    ) {
      if (mesh.name !== 'Weapon' && !parentName.includes('weapon')) {
        applyBarbarianUVMapping(mesh.geometry, 'arm_skin');
      }
    } else if (rawName.includes('fur') || rawName.includes('mantle')) {
      applyBarbarianUVMapping(mesh.geometry, 'fur_mantle');
    } else if (rawName.includes('belt')) {
      applyBarbarianUVMapping(mesh.geometry, 'belt');
    } else if (mesh.name === 'Clothing' || rawName.includes('tabard')) {
      applyBarbarianUVMapping(mesh.geometry, 'tabard');
    } else if (
      mesh.name === 'Leg_L' ||
      mesh.name === 'Leg_R' ||
      rawName.includes('boot') ||
      parentName.startsWith('leg_')
    ) {
      applyBarbarianUVMapping(mesh.geometry, 'leg_clothing');
    } else if (mesh.name === 'Weapon') {
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
      } else if (rawName.includes('hood') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_hood');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (rawName.includes('hand') || (mesh.name.startsWith('Arm_') && rawName.includes('hand'))) {
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
      } else if (rawName.includes('cap') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_cap');
      } else if (rawName.includes('feather')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_feather');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_belt');
      } else if (rawName.includes('quiver') || rawName.includes('arrow')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_quiver');
      } else if (rawName.includes('hand')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'archer_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('bow')) {
        applyHumanoidUVMapping(mesh.geometry, 'archer_bow');
      }
    } else if (unitKey === 'spearman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_head_face');
        mesh.material = makeMat(0xffffff, 0.68, 0.15);
      } else if (rawName.includes('kettle') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_helmet');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_belt');
      } else if (rawName.includes('javelin')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_javelin');
      } else if (rawName.includes('hand')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('spear') || rawName.includes('tip')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_spear');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('boss')) {
        applyHumanoidUVMapping(mesh.geometry, 'spearman_shield');
      }
    } else if (unitKey === 'swordsman') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_head_helmet');
        mesh.material = makeMat(0xffffff, 0.38, 0.78);
      } else if (rawName.includes('helmet') || rawName.includes('dome') || rawName.includes('visor') || rawName.includes('cross') || rawName.includes('aventail') || rawName.includes('slit')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_helmet_part');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('cuirass') || rawName.includes('fauld')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_belt');
      } else if (rawName.includes('pauldron')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_pauldron');
      } else if (rawName.includes('hand') || rawName.includes('gauntlet')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_gauntlet');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot') || rawName.includes('poleyn') || rawName.includes('greave')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('sword') || rawName.includes('blade') || rawName.includes('guard') || rawName.includes('pommel')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_sword');
      } else if (mesh.name === 'Shield' || rawName.includes('shield') || rawName.includes('boss')) {
        applyHumanoidUVMapping(mesh.geometry, 'swordsman_shield');
      }
    } else if (unitKey === 'healer') {
      if (mesh.name === 'Head') {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_head_face');
        mesh.material = makeMat(0xffffff, 0.76, 0.05);
      } else if (rawName.includes('hood') || rawName.includes('coif') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_hood');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_torso');
      } else if (rawName.includes('belt')) {
        applyHumanoidUVMapping(mesh.geometry, 'peasant_belt');
      } else if (rawName.includes('satchel') || rawName.includes('strap') || rawName.includes('pouch') || rawName.includes('flap') || rawName.includes('vial') || rawName.includes('buckle')) {
        applyHumanoidUVMapping(mesh.geometry, 'healer_satchel');
      } else if (rawName.includes('hand')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
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
      } else if (rawName.includes('coif') || rawName.includes('cap') || rawName.includes('hood') || rawName.includes('helmet')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_coif');
      } else if (rawName.includes('collar')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_collar');
      } else if (mesh.name === 'Torso' || rawName.includes('tabard') || rawName.includes('gambeson')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_torso');
      } else if (rawName.includes('hand')) {
        applyHumanoidUVMapping(mesh.geometry, 'humanoid_hand');
      } else if (mesh.name === 'Arm_L' || mesh.name === 'Arm_R') {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_arm');
      } else if (mesh.name === 'Leg_L' || mesh.name === 'Leg_R' || rawName.includes('boot')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_gambeson_leg');
      } else if (mesh.name === 'Weapon' || rawName.includes('mace') || rawName.includes('flange') || rawName.includes('spike') || rawName.includes('pommel') || rawName.includes('haft') || rawName.includes('shaft')) {
        applyHumanoidUVMapping(mesh.geometry, 'maceman_mace');
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
        case 'Shield':
          return getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72);
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
    case 'armored_knight':
      switch (limbName) {
        case 'Weapon':
          return getHumanoidPartMaterial('armored_knight_gear', 0.40, 0.72);
        case 'Root':
        case 'Horse_Barding':
        case 'Saddle':
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

const proceduralUnitTemplateCache: Map<string, THREE.Mesh> = new Map();
const glbUnitTemplateCache: WeakMap<THREE.Object3D, Map<string, THREE.Mesh>> = new WeakMap();

/**
 * Clones a compacted articulated unit template, sharing its cached BufferGeometries
 * and shared opaque MeshStandardMaterial across all soldiers of that unit/team.
 */
function cloneCompactedUnitTemplate(template: THREE.Mesh): THREE.Mesh {
  const cloned = template.clone(true);
  cloned.userData = { ...template.userData };
  return cloned;
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
        if (!matClone.map) {
          matClone.map = whiteMap;
        }
        if (
          origMat.name?.toLowerCase().includes('team') ||
          mesh.name.toLowerCase().includes('team') ||
          mesh.name.toLowerCase().includes('shield') ||
          mesh.name.toLowerCase().includes('hood') ||
          mesh.name.toLowerCase().includes('cap') ||
          mesh.name.toLowerCase().includes('pavise') ||
          mesh.name.toLowerCase().includes('headband')
        ) {
          matClone.color.setHex(teamHex);
        }
        mesh.material = matClone;
      }
    }
  });

  // Find Torso mesh as the primary root mesh so object3D.children[0] is a THREE.Mesh
  let torsoMesh: THREE.Mesh | null = null;
  cloned.traverse((node) => {
    if (!torsoMesh && (node as THREE.Mesh).isMesh && node.name.startsWith('Torso')) {
      torsoMesh = node as THREE.Mesh;
    }
  });

  let rootMesh: THREE.Mesh;
  if (torsoMesh) {
    rootMesh = torsoMesh as THREE.Mesh;
    if (rootMesh.parent) {
      rootMesh.parent.remove(rootMesh);
    }
    rootMesh.name = 'Torso';
  } else {
    // Fallback wrapper mesh if Torso wasn't top-level
    const wrapperGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.36, 8);
    wrapperGeo.translate(0, 0.56, 0);
    rootMesh = new THREE.Mesh(wrapperGeo, makeMat(teamHex));
    rootMesh.name = 'Torso';
    rootMesh.add(cloned);
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
  const hasPauldrons = unitKey === 'swordsman' || unitKey === 'crossbowman';

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
  const chestRadius = isMuscular ? 0.19 : 0.165;
  const waistRadius = 0.14;
  const torsoGeo = new THREE.CylinderGeometry(chestRadius, waistRadius, 0.42, 16);
  torsoGeo.translate(0, 0.59, 0);
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
  torsoMesh.name = 'Torso';
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;

  // Team-colored tabard / surcoat on torso
  const tabardGeo = new THREE.BoxGeometry(0.22, 0.34, 0.18);
  tabardGeo.translate(0.02, 0.56, 0);
  const tabardMesh = new THREE.Mesh(tabardGeo, matTeam);
  tabardMesh.name = 'Tabard_Team';
  torsoMesh.add(tabardMesh);

  // Leather belt
  const beltGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.045, 16);
  beltGeo.translate(0, 0.44, 0);
  const beltMesh = new THREE.Mesh(beltGeo, matDarkLeather);
  beltMesh.name = 'Belt';
  torsoMesh.add(beltMesh);

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
      // Hood
      const hoodGeo = new THREE.SphereGeometry(0.135, 20, 14);
      hoodGeo.translate(-0.01, 0.03, 0);
      const hoodMesh = new THREE.Mesh(hoodGeo, matTeam);
      hoodMesh.name = 'Helmet_Hood';
      headMesh.add(hoodMesh);

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
      // Archer cap & feather
      const capGeo = new THREE.ConeGeometry(0.135, 0.18, 16);
      capGeo.translate(-0.01, 0.10, 0);
      const capMesh = new THREE.Mesh(capGeo, matTeam);
      capMesh.name = 'Helmet_Cap';
      headMesh.add(capMesh);

      const featherGeo = new THREE.BoxGeometry(0.12, 0.05, 0.015);
      featherGeo.translate(-0.05, 0.14, -0.09);
      headMesh.add(new THREE.Mesh(featherGeo, matFeather));

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

      // Heater Shield on Arm_L
      const shieldGeo = new THREE.BoxGeometry(0.045, 0.42, 0.32);
      shieldGeo.translate(0.10, -0.18, -0.09);
      const shieldMesh = new THREE.Mesh(shieldGeo, matTeam);
      shieldMesh.name = 'Shield';
      const bossGeo = new THREE.SphereGeometry(0.058, 16, 12);
      bossGeo.translate(0.125, -0.16, -0.09);
      shieldMesh.add(new THREE.Mesh(bossGeo, matBrass));
      armL.add(shieldMesh);

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

      // Round Bossed Shield on Arm_L
      const shieldGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 18);
      shieldGeo.rotateX(Math.PI * 0.5);
      shieldGeo.translate(0.09, -0.18, -0.10);
      const shieldMesh = new THREE.Mesh(shieldGeo, matTeam);
      shieldMesh.name = 'Shield';
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
      spearMesh.add(new THREE.Mesh(tipGeo, matSteel));
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
      // Fur Pelt Mantle
      const furGeo = new THREE.CylinderGeometry(0.23, 0.19, 0.16, 16);
      furGeo.translate(-0.01, 0.74, 0);
      const furMesh = new THREE.Mesh(furGeo, matFur);
      furMesh.name = 'Fur_Mantle';
      torsoMesh.add(furMesh);

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
      headMesh.add(helmMesh);

      // Double-Bitted Battleaxe in Arm_R
      const shaftGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.95, 12);
      shaftGeo.rotateZ(-0.36);
      shaftGeo.translate(0.16, 0.04, 0);
      const axeMesh = new THREE.Mesh(shaftGeo, matWood);
      axeMesh.name = 'Weapon';

      const bladeGeo = new THREE.BoxGeometry(0.28, 0.22, 0.035);
      bladeGeo.rotateZ(-0.36);
      bladeGeo.translate(0.30, 0.34, 0);
      axeMesh.add(new THREE.Mesh(bladeGeo, matSteel));
      armR.add(axeMesh);
      break;
    }

    case 'slinger': {
      // Headband
      const bandGeo = new THREE.CylinderGeometry(0.132, 0.132, 0.04, 18);
      bandGeo.translate(0, 0.04, 0);
      const bandMesh = new THREE.Mesh(bandGeo, matTeam);
      bandMesh.name = 'Headband';
      headMesh.add(bandMesh);

      // Stone Pouch at hip
      const pouchGeo = new THREE.SphereGeometry(0.075, 16, 12);
      pouchGeo.translate(0.04, 0.42, 0.15);
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

    case 'armored_knight': {
      // Warhorse Root body
      const horseBodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.62, 12);
      horseBodyGeo.rotateZ(Math.PI * 0.5);
      horseBodyGeo.translate(0, -0.28, 0);
      const horseMesh = new THREE.Mesh(horseBodyGeo, matWood);
      horseMesh.name = 'Horse_Body';

      // 4 Horse legs
      const legPositions = [
        [0.24, 0.14],
        [0.24, -0.14],
        [-0.24, 0.14],
        [-0.24, -0.14],
      ];
      for (const [lx, lz] of legPositions) {
        const hlegGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.44, 8);
        hlegGeo.translate(lx, -0.50, lz);
        horseMesh.add(new THREE.Mesh(hlegGeo, matWood));
      }

      // Horse Head & Neck
      const hneckGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.38, 8);
      hneckGeo.rotateZ(-0.65);
      hneckGeo.translate(0.32, -0.10, 0);
      horseMesh.add(new THREE.Mesh(hneckGeo, matWood));

      torsoMesh.add(horseMesh);

      // Knight Great Helm on head
      const helmGeo = new THREE.SphereGeometry(0.13, 16, 12);
      helmGeo.translate(0, 0.04, 0);
      headMesh.add(new THREE.Mesh(helmGeo, matSteel));

      // Right Arm raised with Heavy Flanged Mace
      armR.rotation.set(0.35, -0.30, 0.45);
      const maceGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.72, 8);
      maceGeo.translate(0.18, -0.22, 0.90);
      maceGeo.rotateZ(-0.45);
      const maceMesh = new THREE.Mesh(maceGeo, matWood);
      maceMesh.name = 'Weapon';

      const mheadGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.16, 8);
      mheadGeo.translate(0.36, 0.25, 0);
      mheadGeo.rotateZ(-0.45);
      maceMesh.add(new THREE.Mesh(mheadGeo, matSteel));
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

let sharedTreeTrunkMaterial: THREE.MeshStandardMaterial | null = null;
let sharedTreeFoliageMaterial: THREE.MeshStandardMaterial | null = null;
const forestTreeTemplateCache: Map<'pine' | 'oak', THREE.Group> = new Map();

export function getSharedTreeMaterials(): {
  trunkMat: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
} {
  if (!sharedTreeTrunkMaterial) {
    sharedTreeTrunkMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getTreePartTexture('bark'),
      roughness: 0.92,
      metalness: 0.0,
      flatShading: false,
      transparent: false,
    });
    sharedTreeTrunkMaterial.userData = { isSharedAsset: true, treePart: 'bark' };
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
  }
  return { trunkMat: sharedTreeTrunkMaterial, foliageMat: sharedTreeFoliageMaterial };
}

/**
 * Builds a low-poly 3D forest tree (pine or oak) with total height ~0.90 world units
 * (75% of the 1.20 average humanoid unit height).
 * Compacts all foliage tiers/clusters into a single vertex-colored `Foliage` mesh
 * and caches the template per variant so all forest trees share geometries and materials.
 */
export function buildLowPolyForestTreeMesh(
  variant: 'pine' | 'oak' = 'pine',
  heightScale: number = 1.0
): THREE.Group {
  let templateGroup = forestTreeTemplateCache.get(variant);
  if (!templateGroup) {
    templateGroup = new THREE.Group();
    templateGroup.name = variant === 'pine' ? 'ForestTree_Pine' : 'ForestTree_Oak';

    const { trunkMat, foliageMat } = getSharedTreeMaterials();
    const identityMat = new THREE.Matrix4().identity();

    if (variant === 'pine') {
      const trunkGeo = new THREE.CylinderGeometry(0.042, 0.065, 0.28, 10);
      applyTreeUVMapping(trunkGeo, 'trunk');
      trunkGeo.translate(0, 0.14, 0);
      smoothGeometryNormals(trunkGeo);
      trunkGeo.userData = { isSharedAsset: true };
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.name = 'Trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      templateGroup.add(trunkMesh);

      const pineDark = makeMat(0x2d8236, 0.86, 0.0);
      const pineMid = makeMat(0x3fa548, 0.84, 0.0);
      const pineLight = makeMat(0x58cb62, 0.82, 0.0);

      const tier1Geo = new THREE.ConeGeometry(0.26, 0.34, 12);
      applyTreeUVMapping(tier1Geo, 'pine_foliage');
      tier1Geo.translate(0, 0.40, 0);
      const tier2Geo = new THREE.ConeGeometry(0.21, 0.30, 12);
      applyTreeUVMapping(tier2Geo, 'pine_foliage');
      tier2Geo.translate(0, 0.59, 0);
      const tier3Geo = new THREE.ConeGeometry(0.15, 0.26, 12);
      applyTreeUVMapping(tier3Geo, 'pine_foliage');
      tier3Geo.translate(0, 0.77, 0);

      const foliageGeo = mergeMeshesWithVertexColors([
        { mesh: new THREE.Mesh(tier1Geo, pineDark), relMatrix: identityMat },
        { mesh: new THREE.Mesh(tier2Geo, pineMid), relMatrix: identityMat },
        { mesh: new THREE.Mesh(tier3Geo, pineLight), relMatrix: identityMat },
      ]);
      const foliageMesh = new THREE.Mesh(foliageGeo, foliageMat);
      foliageMesh.name = 'Foliage_Pine';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      templateGroup.add(foliageMesh);
    } else {
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
    }

    forestTreeTemplateCache.set(variant, templateGroup);
  }

  const treeGroup = templateGroup.clone(true);
  treeGroup.scale.setScalar(heightScale);
  treeGroup.userData = {
    isForestTree: true,
    variant,
    baseHeight: FOREST_TREE_TARGET_HEIGHT,
    height: FOREST_TREE_TARGET_HEIGHT * heightScale,
  };
  return treeGroup;
}
