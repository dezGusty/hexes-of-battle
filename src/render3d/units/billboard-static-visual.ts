import * as THREE from 'three';
import { HexDirection } from '../../shared/hex-map';
import { UnitAnimationState, UnitVisualFormat } from '../types';
import { IUnitVisual } from './unit-visual-interface';

export interface BillboardStaticOptions {
  texture: THREE.Texture;
  width?: number;
  height?: number;
  yOffset?: number;
  initialFacing?: HexDirection;
}

/**
 * 2D Static Image Billboard with procedural tilting, bobbing, squashing,
 * lunging, and damage wobbles to simulate alive 3D unit animation.
 */
export class BillboardStaticVisual implements IUnitVisual {
  public readonly format = UnitVisualFormat.BILLBOARD_STATIC;
  public readonly object3D: THREE.Group = new THREE.Group();

  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private animState: UnitAnimationState = 'idle';
  private animTimer: number = 0;
  private animDuration: number = 0;

  // Base transform anchors
  private baseScaleY: number = 1.0;
  private baseScaleX: number = 1.0;
  private yOffset: number = 0;

  constructor(options: BillboardStaticOptions) {
    const width = options.width ?? 0.7;
    const height = options.height ?? 1.3;
    this.yOffset = options.yOffset ?? height * 0.5;

    const geometry = new THREE.PlaneGeometry(width, height);
    // Shift geometry origin so anchor is at bottom center
    geometry.translate(0, height * 0.5, 0);

    this.material = new THREE.MeshBasicMaterial({
      map: options.texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.object3D.add(this.mesh);

    if (options.initialFacing) {
      this.setFacing(options.initialFacing);
    }
  }

  public setFacing(direction: HexDirection, _cameraFacing: boolean = true): void {
    // Mirror billboard horizontally if facing west-side directions
    const isWest =
      direction === HexDirection.WEST ||
      direction === HexDirection.NORTHWEST ||
      direction === HexDirection.SOUTHWEST;

    this.baseScaleX = isWest ? -1.0 : 1.0;
    this.mesh.scale.x = this.baseScaleX;
  }

  public playAnimation(state: UnitAnimationState, durationMs: number = 500): void {
    this.animState = state;
    this.animTimer = 0;
    this.animDuration = durationMs;

    if (state === 'attack_melee') {
      this.mesh.position.set(0, 0, 0);
    } else if (state === 'hit') {
      this.material.color.setHex(0xff6666);
    } else if (state === 'idle') {
      this.material.color.setHex(0xffffff);
      this.mesh.position.set(0, 0, 0);
      this.mesh.rotation.set(0, 0, 0);
    }
  }

  public setCasualtyFade(opacity: number): void {
    this.material.opacity = Math.max(0, Math.min(1, opacity));
  }

  public update(deltaMs: number): void {
    this.animTimer += deltaMs;
    const sec = this.animTimer / 1000;

    switch (this.animState) {
      case 'idle': {
        // Subtle breathing squash and gentle idle sway
        const breath = Math.sin(sec * 3.0) * 0.03;
        this.mesh.scale.y = this.baseScaleY + breath;
        this.mesh.scale.x = this.baseScaleX * (1.0 - breath * 0.5);
        this.mesh.rotation.z = Math.sin(sec * 1.5) * 0.02;
        break;
      }

      case 'walk': {
        // Energetic step bouncing and tilt
        const bounce = Math.abs(Math.sin(sec * 8.0)) * 0.12;
        const tilt = Math.sin(sec * 8.0) * 0.1;
        this.mesh.position.y = bounce;
        this.mesh.rotation.z = tilt;
        this.mesh.scale.y = this.baseScaleY * (1.0 + Math.sin(sec * 16.0) * 0.05);
        break;
      }

      case 'attack_melee': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        // Lunge forward (along Z/X) and tilt down sharply, then recover
        if (progress < 0.4) {
          const p = progress / 0.4;
          this.mesh.position.z = -Math.sin(p * Math.PI * 0.5) * 0.4;
          this.mesh.rotation.x = -p * 0.25;
          this.mesh.scale.y = this.baseScaleY * (1.0 + p * 0.1);
        } else {
          const p = (progress - 0.4) / 0.6;
          this.mesh.position.z = -Math.cos(p * Math.PI * 0.5) * 0.4;
          this.mesh.rotation.x = -(1.0 - p) * 0.25;
          this.mesh.scale.y = this.baseScaleY;
        }

        if (progress >= 1) {
          this.playAnimation('idle');
        }
        break;
      }

      case 'attack_ranged': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        // Pull back, release with recoil hop
        if (progress < 0.3) {
          const p = progress / 0.3;
          this.mesh.position.z = p * 0.15;
          this.mesh.rotation.x = p * 0.1;
        } else if (progress < 0.6) {
          const p = (progress - 0.3) / 0.3;
          this.mesh.position.z = (1.0 - p) * 0.15 - 0.05;
          this.mesh.position.y = Math.sin(p * Math.PI) * 0.08;
        } else {
          this.mesh.position.set(0, 0, 0);
          this.mesh.rotation.set(0, 0, 0);
        }

        if (progress >= 1) {
          this.playAnimation('idle');
        }
        break;
      }

      case 'hit': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        // Rapid shudder and recoil backward
        const shake = Math.sin(this.animTimer * 0.05) * 0.08 * (1.0 - progress);
        this.mesh.position.x = shake;
        this.mesh.position.z = (1.0 - progress) * 0.15;
        this.mesh.rotation.z = shake * 1.5;

        if (progress >= 1) {
          this.material.color.setHex(0xffffff);
          this.playAnimation('idle');
        }
        break;
      }

      case 'die': {
        const progress = Math.min(1, this.animTimer / Math.max(1, this.animDuration));
        // Tip over backward onto ground and fade out
        this.mesh.rotation.x = -progress * (Math.PI * 0.45);
        this.mesh.position.y = -progress * (this.yOffset * 0.5);
        this.setCasualtyFade(1.0 - progress);
        break;
      }

      case 'rest': {
        // Soothing gentle breathing with slight upward float
        const floatY = Math.sin(sec * 2.0) * 0.05;
        this.mesh.position.y = floatY;
        this.mesh.scale.y = this.baseScaleY + Math.sin(sec * 2.0) * 0.04;
        break;
      }

      case 'panicked': {
        // Trembling vibration
        const tremble = (Math.random() - 0.5) * 0.04;
        this.mesh.position.x = tremble;
        this.mesh.rotation.z = tremble * 2.0;
        break;
      }
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
