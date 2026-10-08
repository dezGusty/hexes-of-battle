import * as THREE from 'three';
import { HexDirection } from '../../shared/hex-map';
import { UnitAnimationState, UnitVisualFormat } from '../types';
import { IUnitVisual } from './unit-visual-interface';

export interface MeshRigidOptions {
  meshOrGroup: THREE.Object3D;
  scale?: number;
  initialFacing?: HexDirection;
}

/**
 * Full 3D Model with procedural / rigid animations (non-skeletal keyframed/procedural
 * hops, tilts, lunges, and damage recoil).
 */
export class MeshRigidVisual implements IUnitVisual {
  public readonly format = UnitVisualFormat.FULL_3D_RIGID;
  public readonly object3D: THREE.Group = new THREE.Group();

  private model: THREE.Object3D;
  private animState: UnitAnimationState = 'idle';
  private animTimer: number = 0;
  private animDuration: number = 0;
  private baseScale: number = 1.0;

  constructor(options: MeshRigidOptions) {
    this.model = options.meshOrGroup;
    this.baseScale = options.scale ?? 1.0;
    this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
    this.object3D.add(this.model);

    if (options.initialFacing) {
      this.setFacing(options.initialFacing);
    }
  }

  public setFacing(direction: HexDirection, _cameraFacing: boolean = false): void {
    const angleMap: Record<HexDirection, number> = {
      [HexDirection.EAST]: 0,
      [HexDirection.SOUTHEAST]: Math.PI / 3,
      [HexDirection.SOUTHWEST]: (2 * Math.PI) / 3,
      [HexDirection.WEST]: Math.PI,
      [HexDirection.NORTHWEST]: (4 * Math.PI) / 3,
      [HexDirection.NORTHEAST]: (5 * Math.PI) / 3,
      [HexDirection.NONE]: 0,
    };
    const targetAngle = angleMap[direction] ?? 0;
    this.object3D.rotation.y = targetAngle;
  }

  public playAnimation(state: UnitAnimationState, durationMs: number = 500): void {
    this.animState = state;
    this.animTimer = 0;
    this.animDuration = durationMs;

    if (state === 'idle') {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
    }
  }

  public setCasualtyFade(opacity: number): void {
    this.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.Material;
          mat.transparent = true;
          mat.opacity = Math.max(0, Math.min(1, opacity));
        }
      }
    });
  }

  public update(deltaMs: number): void {
    this.animTimer += deltaMs;
    const sec = this.animTimer / 1000;

    switch (this.animState) {
      case 'idle': {
        const breath = Math.sin(sec * 3.0) * 0.02;
        this.model.scale.set(
          this.baseScale * (1.0 - breath * 0.5),
          this.baseScale * (1.0 + breath),
          this.baseScale * (1.0 - breath * 0.5)
        );
        this.model.position.y = breath * 0.5;
        break;
      }

      case 'walk': {
        const bounce = Math.abs(Math.sin(sec * 8.0)) * 0.1;
        const tilt = Math.sin(sec * 8.0) * 0.08;
        this.model.position.y = bounce;
        this.model.rotation.z = tilt;
        this.model.rotation.x = Math.sin(sec * 8.0) * 0.05;
        break;
      }

      case 'attack_melee': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        if (progress < 0.35) {
          const p = progress / 0.35;
          this.model.position.z = Math.sin(p * Math.PI * 0.5) * 0.5;
          this.model.rotation.x = p * 0.3;
        } else {
          const p = (progress - 0.35) / 0.65;
          this.model.position.z = Math.cos(p * Math.PI * 0.5) * 0.5;
          this.model.rotation.x = (1.0 - p) * 0.3;
        }
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'attack_ranged': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        if (progress < 0.3) {
          const p = progress / 0.3;
          this.model.position.z = -p * 0.2;
          this.model.rotation.x = -p * 0.15;
        } else if (progress < 0.6) {
          this.model.position.z = 0.1;
          this.model.position.y = 0.05;
        } else {
          this.model.position.set(0, 0, 0);
          this.model.rotation.set(0, 0, 0);
        }
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'hit': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        const shake = Math.sin(this.animTimer * 0.06) * 0.08 * (1.0 - progress);
        this.model.position.x = shake;
        this.model.rotation.y = shake * 2.0;
        this.model.position.z = -(1.0 - progress) * 0.15;
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'die': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        this.model.rotation.x = progress * (Math.PI * 0.45);
        this.model.position.y = -progress * 0.3;
        this.setCasualtyFade(1.0 - progress);
        break;
      }

      case 'rest': {
        const breath = Math.sin(sec * 2.0) * 0.04;
        this.model.position.y = breath;
        break;
      }

      case 'panicked': {
        const tremble = (Math.random() - 0.5) * 0.03;
        this.model.position.x = tremble;
        this.model.rotation.z = tremble * 3.0;
        break;
      }
    }
  }

  public dispose(): void {
    this.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  }
}
