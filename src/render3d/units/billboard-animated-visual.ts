import * as THREE from 'three';
import { HexDirection } from '../../shared/hex-map';
import { UnitAnimationState, UnitVisualFormat } from '../types';
import { IUnitVisual } from './unit-visual-interface';

export interface AnimatedSpriteFrame {
  texture: THREE.Texture;
  durationMs: number;
}

export interface BillboardAnimatedOptions {
  animations: {
    idle?: AnimatedSpriteFrame[];
    walk?: AnimatedSpriteFrame[];
    attack_melee?: AnimatedSpriteFrame[];
    attack_ranged?: AnimatedSpriteFrame[];
    hit?: AnimatedSpriteFrame[];
    die?: AnimatedSpriteFrame[];
  };
  width?: number;
  height?: number;
  yOffset?: number;
  initialFacing?: HexDirection;
}

/**
 * 2D Billboard with multi-frame flipbook animations for different directions/actions.
 */
export class BillboardAnimatedVisual implements IUnitVisual {
  public readonly format = UnitVisualFormat.BILLBOARD_ANIMATED;
  public readonly object3D: THREE.Group = new THREE.Group();

  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private options: BillboardAnimatedOptions;

  private currentState: UnitAnimationState = 'idle';
  private currentFrameIndex: number = 0;
  private frameTimer: number = 0;

  constructor(options: BillboardAnimatedOptions) {
    this.options = options;
    const width = options.width ?? 0.8;
    const height = options.height ?? 1.4;

    const geometry = new THREE.PlaneGeometry(width, height);
    geometry.translate(0, height * 0.5, 0);

    const initialTexture = options.animations.idle?.[0]?.texture ?? new THREE.Texture();
    this.material = new THREE.MeshBasicMaterial({
      map: initialTexture,
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
    const isWest =
      direction === HexDirection.WEST ||
      direction === HexDirection.NORTHWEST ||
      direction === HexDirection.SOUTHWEST;

    this.mesh.scale.x = isWest ? -1.0 : 1.0;
  }

  public playAnimation(state: UnitAnimationState, _durationMs: number = 500): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.applyCurrentFrame();
  }

  public setCasualtyFade(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));
    this.material.opacity = clamped;
    this.mesh.visible = clamped > 0;
  }

  public update(deltaMs: number): void {
    const frames = (this.options.animations as any)[this.currentState] as AnimatedSpriteFrame[] | undefined;
    if (!frames || frames.length === 0) return;

    this.frameTimer += deltaMs;
    const currentFrame = frames[this.currentFrameIndex];
    const frameDur = currentFrame?.durationMs ?? 100;

    if (this.frameTimer >= frameDur) {
      this.frameTimer -= frameDur;
      this.currentFrameIndex = (this.currentFrameIndex + 1) % frames.length;
      this.applyCurrentFrame();
    }
  }

  private applyCurrentFrame(): void {
    const frames = (this.options.animations as any)[this.currentState] as AnimatedSpriteFrame[] | undefined;
    if (frames && frames[this.currentFrameIndex]) {
      this.material.map = frames[this.currentFrameIndex].texture;
      this.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
