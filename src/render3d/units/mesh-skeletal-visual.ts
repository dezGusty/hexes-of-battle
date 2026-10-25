import * as THREE from 'three';
import { HexDirection } from '../../shared/hex-map';
import { UnitAnimationState, UnitVisualFormat } from '../types';
import { IUnitVisual } from './unit-visual-interface';

export interface MeshSkeletalOptions {
  model: THREE.Object3D;
  animations: THREE.AnimationClip[];
  scale?: number;
  initialFacing?: HexDirection;
}

/**
 * Full 3D Model with skeletal bone hierarchy and Three.js AnimationMixer.
 */
export class MeshSkeletalVisual implements IUnitVisual {
  public readonly format = UnitVisualFormat.FULL_3D_SKELETAL;
  public readonly object3D: THREE.Group = new THREE.Group();

  private model: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentState: UnitAnimationState = 'idle';

  constructor(options: MeshSkeletalOptions) {
    this.model = options.model;
    const scale = options.scale ?? 0.7;
    this.model.scale.set(scale, scale, scale);
    this.object3D.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);

    options.animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      const name = clip.name.toLowerCase();
      this.actions.set(name, action);
    });

    if (options.initialFacing) {
      this.setFacing(options.initialFacing);
    }

    this.playAnimation('idle');
  }

  public setFacing(direction: HexDirection, _cameraFacing: boolean = false): void {
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

  public playAnimation(state: UnitAnimationState, _durationMs?: number): void {
    if (this.currentState === state && this.currentAction?.isRunning()) return;
    this.currentState = state;

    // Try finding matching clip name (e.g. "idle", "walk", "attack")
    let targetAction = this.actions.get(state);
    if (!targetAction) {
      // Fallback searches
      for (const [key, action] of this.actions.entries()) {
        if (key.includes(state)) {
          targetAction = action;
          break;
        }
      }
    }

    if (targetAction) {
      if (this.currentAction && this.currentAction !== targetAction) {
        this.currentAction.fadeOut(0.2);
      }
      targetAction.reset();
      if (state === 'die') {
        targetAction.clampWhenFinished = true;
        targetAction.loop = THREE.LoopOnce;
      } else if (state === 'attack_melee' || state === 'attack_ranged' || state === 'hit') {
        targetAction.loop = THREE.LoopOnce;
      } else {
        targetAction.loop = THREE.LoopRepeat;
      }
      targetAction.fadeIn(0.2).play();
      this.currentAction = targetAction;
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
    this.mixer.update(deltaMs / 1000);
  }

  public dispose(): void {
    this.mixer.stopAllAction();
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
