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
    const scale = options.scale ?? 1.0;
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

  public setCasualtyFade(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));
    this.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.Material;
          mat.transparent = true;
          mat.opacity = clamped;
        }
      }
    });
    this.model.visible = clamped > 0;
  }

  public update(deltaMs: number): void {
    this.mixer.update(deltaMs / 1000);
  }

  public dispose(): void {
    this.mixer.stopAllAction();
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
