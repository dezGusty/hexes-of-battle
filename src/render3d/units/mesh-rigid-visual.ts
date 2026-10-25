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
  private baseScale: number = 0.7;

  // Articulated sub-part references (populated if present on 3D unit mesh)
  private headPart: THREE.Object3D | null = null;
  private armLPart: THREE.Object3D | null = null;
  private armRPart: THREE.Object3D | null = null;
  private legLPart: THREE.Object3D | null = null;
  private legRPart: THREE.Object3D | null = null;
  public weaponPart: THREE.Object3D | null = null;
  public shieldPart: THREE.Object3D | null = null;
  private restRotations: Map<THREE.Object3D, THREE.Euler> = new Map();

  constructor(options: MeshRigidOptions) {
    this.model = options.meshOrGroup;
    this.baseScale = options.scale ?? 0.7;
    this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
    this.object3D.add(this.model);

    this.cacheArticulatedParts();

    if (options.initialFacing) {
      this.setFacing(options.initialFacing);
    }
  }

  public get mesh(): THREE.Mesh {
    if ((this.model as THREE.Mesh).isMesh) {
      return this.model as THREE.Mesh;
    }
    let found: THREE.Mesh | null = null;
    this.model.traverse((child) => {
      if (!found && (child as THREE.Mesh).isMesh) {
        found = child as THREE.Mesh;
      }
    });
    return found ?? (this.model as unknown as THREE.Mesh);
  }

  public get material(): THREE.Material {
    const m = this.mesh;
    if (m && m.material) {
      return Array.isArray(m.material) ? m.material[0] : m.material;
    }
    return new THREE.MeshBasicMaterial();
  }

  private cacheArticulatedParts(): void {
    this.model.traverse((child) => {
      switch (child.name) {
        case 'Head':
          this.headPart = child;
          break;
        case 'Arm_L':
          this.armLPart = child;
          break;
        case 'Arm_R':
          this.armRPart = child;
          break;
        case 'Leg_L':
          this.legLPart = child;
          break;
        case 'Leg_R':
          this.legRPart = child;
          break;
        case 'Weapon':
          this.weaponPart = child;
          break;
        case 'Shield':
          this.shieldPart = child;
          break;
      }
      if (
        child.name === 'Head' ||
        child.name === 'Arm_L' ||
        child.name === 'Arm_R' ||
        child.name === 'Leg_L' ||
        child.name === 'Leg_R' ||
        child.name === 'Weapon' ||
        child.name === 'Shield'
      ) {
        this.restRotations.set(child, child.rotation.clone());
      }
    });
  }

  private resetLimbRotations(): void {
    this.restRotations.forEach((euler, part) => {
      part.rotation.copy(euler);
    });
  }

  public setFacing(direction: HexDirection, _cameraFacing: boolean = false): void {
    // In Three.js right-handed coordinates (+X = East, +Y = Up, +Z = South),
    // rotating local forward (+X) by rotation.y = theta produces world direction (cos(theta), 0, -sin(theta)).
    // Thus theta = (2*PI - worldAngle) % (2*PI):
    const angleMap: Record<HexDirection, number> = {
      [HexDirection.EAST]: 0,
      [HexDirection.NORTHEAST]: Math.PI / 3,
      [HexDirection.NORTHWEST]: (2 * Math.PI) / 3,
      [HexDirection.WEST]: Math.PI,
      [HexDirection.SOUTHWEST]: (4 * Math.PI) / 3,
      [HexDirection.SOUTHEAST]: (5 * Math.PI) / 3,
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
      this.resetLimbRotations();
    }
  }

  private currentOpacity: number = 1.0;

  public setCasualtyFade(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));
    this.model.visible = clamped > 0;
    if (Math.abs(clamped - this.currentOpacity) < 1e-4) {
      return;
    }
    this.currentOpacity = clamped;

    const isOpaque = clamped >= 1.0;
    this.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const curMat = mesh.material as THREE.Material;
          if (!isOpaque && curMat.userData?.isSharedAsset) {
            const clonedMat = curMat.clone();
            clonedMat.userData = { ...curMat.userData, isSharedAsset: false };
            mesh.material = clonedMat;
          }
          const mat = mesh.material as THREE.Material;
          const nextTransparent = !isOpaque;
          if (mat.transparent !== nextTransparent) {
            mat.transparent = nextTransparent;
            mat.needsUpdate = true;
          }
          mat.opacity = clamped;
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
        if (this.armRPart) {
          const restZ = this.restRotations.get(this.armRPart)?.z ?? 0;
          this.armRPart.rotation.z = restZ + Math.sin(sec * 2.5) * 0.04;
        }
        if (this.armLPart) {
          const restZ = this.restRotations.get(this.armLPart)?.z ?? 0;
          this.armLPart.rotation.z = restZ - Math.sin(sec * 2.5) * 0.03;
        }
        break;
      }

      case 'walk': {
        const stride = Math.sin(sec * 10.0);
        const bounce = Math.abs(stride) * 0.08;
        const tilt = stride * 0.06;
        this.model.position.y = bounce;
        this.model.rotation.z = tilt;
        this.model.rotation.x = stride * 0.04;

        if (this.legLPart) this.legLPart.rotation.z = stride * 0.52;
        if (this.legRPart) this.legRPart.rotation.z = -stride * 0.52;
        if (this.armLPart) this.armLPart.rotation.z = -stride * 0.42;
        if (this.armRPart) this.armRPart.rotation.z = stride * 0.42;
        break;
      }

      case 'attack_melee': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        if (progress < 0.35) {
          const p = progress / 0.35;
          this.model.position.x = Math.sin(p * Math.PI * 0.5) * 0.45;
          this.model.rotation.z = -p * 0.25;
          if (this.armRPart) this.armRPart.rotation.z = p * 1.15;
          if (this.armLPart) this.armLPart.rotation.z = -p * 0.35;
        } else {
          const p = (progress - 0.35) / 0.65;
          this.model.position.x = Math.cos(p * Math.PI * 0.5) * 0.45;
          this.model.rotation.z = -(1.0 - p) * 0.25;
          if (this.armRPart) this.armRPart.rotation.z = (1.0 - p) * -0.85;
          if (this.armLPart) this.armLPart.rotation.z = (1.0 - p) * -0.35;
        }
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'attack_ranged': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        if (progress < 0.3) {
          const p = progress / 0.3;
          this.model.position.x = -p * 0.16;
          this.model.rotation.z = p * 0.14;
          if (this.armLPart) this.armLPart.rotation.z = p * 0.85;
          if (this.armRPart) this.armRPart.rotation.z = p * 0.65;
        } else if (progress < 0.6) {
          this.model.position.x = 0.08;
          this.model.position.y = 0.05;
          if (this.armLPart) this.armLPart.rotation.z = 0.85;
          if (this.armRPart) this.armRPart.rotation.z = -0.35;
        } else {
          this.model.position.set(0, 0, 0);
          this.model.rotation.set(0, 0, 0);
          this.resetLimbRotations();
        }
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'hit': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        const shake = Math.sin(this.animTimer * 0.06) * 0.08 * (1.0 - progress);
        this.model.position.z = shake;
        this.model.rotation.y = shake * 2.0;
        this.model.position.x = -(1.0 - progress) * 0.15;
        if (this.headPart) this.headPart.rotation.z = -0.25 * (1.0 - progress);
        if (progress >= 1) this.playAnimation('idle');
        break;
      }

      case 'die': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        this.model.rotation.z = -progress * (Math.PI * 0.45);
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
        if (this.armLPart) this.armLPart.rotation.z = 0.7 + tremble * 5.0;
        if (this.armRPart) this.armRPart.rotation.z = 0.7 - tremble * 5.0;
        break;
      }
    }
  }

  public dispose(): void {
    this.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry && !mesh.geometry.userData?.isSharedAsset) {
          mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if (!m.userData?.isSharedAsset) m.dispose();
          });
        } else if (mesh.material && !mesh.material.userData?.isSharedAsset) {
          mesh.material.dispose();
        }
      }
    });
  }
}
