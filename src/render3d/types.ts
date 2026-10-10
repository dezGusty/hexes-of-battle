import * as THREE from 'three';

/**
 * Supported rendering formats for unit graphical representation.
 */
export enum UnitVisualFormat {
  /** Full 3D model with skeletal bone animations (glTF / SkinnedMesh) */
  FULL_3D_SKELETAL = 'FULL_3D_SKELETAL',
  /** Full 3D model with procedural/rigid non-skeletal keyframe animations (tilts, bobs, squash/stretch) */
  FULL_3D_RIGID = 'FULL_3D_RIGID',
  /** Billboard plane with 2D directional frame flipbook animations */
  BILLBOARD_ANIMATED = 'BILLBOARD_ANIMATED',
  /** Billboard plane with static 2D image (procedural tilt, bob, sway, squash for animation) */
  BILLBOARD_STATIC = 'BILLBOARD_STATIC',
}

export type UnitAnimationState =
  | 'idle'
  | 'walk'
  | 'attack_melee'
  | 'attack_ranged'
  | 'hit'
  | 'die'
  | 'rest'
  | 'panicked';

export interface UnitVisualConfig {
  format: UnitVisualFormat;
  modelUrl?: string;
  textureUrl?: string;
  spriteFrameName?: string;
  scale?: number;
  yOffset?: number;
  shadows?: boolean;
}

export interface SingleProjectileTrajectory {
  targetPos: THREE.Vector3;
  sourcePos?: THREE.Vector3;
  apexHeight?: number;
  durationMs?: number;
  onImpact?: () => void;
}

export interface ProjectileTrajectoryParams {
  sourcePos: THREE.Vector3;
  targetPos?: THREE.Vector3;
  projectiles?: SingleProjectileTrajectory[];
  durationMs: number;
  apexHeight: number;
  projectileType: 'arrow' | 'bolt' | 'spear' | 'magic' | 'stone';
  volleyCount?: number;
  scatterOffset?: THREE.Vector3;
  onImpact?: () => void;
}

export interface Camera3DConfig {
  fov: number;
  near: number;
  far: number;
  initialDistance: number;
  minDistance: number;
  maxDistance: number;
  initialPitch: number; // in radians
  minPitch: number;
  maxPitch: number;
}
