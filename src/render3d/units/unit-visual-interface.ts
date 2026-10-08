import * as THREE from 'three';
import { HexDirection } from '../../shared/hex-map';
import { UnitAnimationState, UnitVisualFormat } from '../types';

export interface IUnitVisual {
  readonly format: UnitVisualFormat;
  readonly object3D: THREE.Object3D;

  update(deltaMs: number): void;
  playAnimation(state: UnitAnimationState, durationMs?: number): void;
  setFacing(direction: HexDirection, cameraFacing?: boolean): void;
  setCasualtyFade(opacity: number): void;
  dispose(): void;
}
