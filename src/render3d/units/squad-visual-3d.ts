import * as THREE from 'three';
import { Creature } from '../../battle/creature';
import { HexDirection } from '../../shared/hex-map';
import { IUnitVisual } from './unit-visual-interface';
import { UnitAnimationState } from '../types';
import { MoraleState } from '../../battle/combat-rules';
import { DamageIndicatorType, createDamageIndicatorCanvas } from '../../ui/indicator-icon-utils';

export interface FloatingText3D {
  sprite: THREE.Sprite;
  startPos: THREE.Vector3;
  elapsedMs: number;
  durationMs: number;
  riseSpeed: number;
}

export function getHexDirectionWorldAngle(direction: HexDirection): number {
  switch (direction) {
    case HexDirection.EAST:
      return 0;
    case HexDirection.SOUTHEAST:
      return Math.PI / 3;
    case HexDirection.SOUTHWEST:
      return (2 * Math.PI) / 3;
    case HexDirection.WEST:
      return Math.PI;
    case HexDirection.NORTHWEST:
      return (4 * Math.PI) / 3;
    case HexDirection.NORTHEAST:
      return (5 * Math.PI) / 3;
    case HexDirection.NONE:
    default:
      return 0;
  }
}

export function getHexDirectionRotationY(direction: HexDirection): number {
  const worldAngle = getHexDirectionWorldAngle(direction);
  return worldAngle === 0 ? 0 : 2 * Math.PI - worldAngle;
}

/**
 * Manages the entire multi-model squad representation in 3D space,
 * including individual model positions, overhead bars, floating combat text,
 * and movement interpolation.
 */
export class SquadVisual3D {
  public readonly rootGroup: THREE.Group = new THREE.Group();
  public readonly creature: Creature;

  public models: IUnitVisual[] = [];
  private modelOffsets: THREE.Vector3[] = [];
  private currentFacing: HexDirection = HexDirection.EAST;
  private aliveCount: number = 0;
  private maxCount: number = 0;
  private prevMoraleState?: MoraleState;

  // Overhead Status UI
  private overheadGroup: THREE.Group = new THREE.Group();
  private hpBarMesh!: THREE.Mesh;
  private staminaBarMesh!: THREE.Mesh;
  private barBgMesh!: THREE.Mesh;
  private countSprite?: THREE.Sprite;

  // Floating text queue
  private floatingTexts: FloatingText3D[] = [];

  // Damage indicators configuration and tracking
  public showDamageIndicators: boolean = true;
  private lastHealth: number = 0;
  private lastStamina: number = 0;
  private lastMorale: number = 0;
  private indicatorStaggerIndex: number = 0;
  private lastIndicatorTime: number = 0;

  // Movement animation interpolation
  private isMoving: boolean = false;
  private movePath: THREE.Vector3[] = [];
  private moveTargetIndex: number = 0;
  private moveSpeed: number = 5.0; // units per second
  private onMoveComplete?: () => void;

  constructor(creature: Creature, modelVisuals: IUnitVisual[]) {
    this.creature = creature;
    this.models = modelVisuals;
    this.maxCount = Math.max(1, creature.stats.model_count);
    this.aliveCount = creature.aliveModelCount;
    this.currentFacing =
      creature.facingDirection !== HexDirection.NONE ? creature.facingDirection : HexDirection.EAST;

    const typeName = Creature.CREATURE_NAMES[creature.creatureType] || `Type${creature.creatureType}`;
    this.rootGroup.name = `Squad_${typeName}_Army${creature.armyAlignment}`;
    this.overheadGroup.name = `OverheadUI_${typeName}`;

    this.calculateFormationOffsets(this.currentFacing);
    this.setupModels();
    this.setupOverheadBars();

    this.rootGroup.add(this.overheadGroup);
    this.overheadGroup.position.set(0, 1.2, 0);

    this.lastHealth = this.creature.isAlive ? Math.max(0, creature.stats.remaining_health) : 0;
    this.lastStamina = Math.max(0, creature.stats.stamina);
    this.lastMorale = creature.stats.morale;

    this.updateStats(false);
  }

  public getModelOffsets(): readonly THREE.Vector3[] {
    return this.modelOffsets;
  }

  public getFacing(): HexDirection {
    return this.currentFacing;
  }

  /**
   * Computes squad formation offsets so soldiers stand in ranks perpendicular
   * to the squad's facing direction (`direction`).
   * - `forwardOffset` (> 0 for front rank, < 0 for rear ranks) is along the facing vector.
   * - `lateralOffset` (soldiers side-by-side in a rank) is along the perpendicular rank vector.
   */
  private calculateFormationOffsets(direction: HexDirection = this.currentFacing): void {
    const count = this.models.length;
    this.modelOffsets = [];

    const effectiveDir = direction !== HexDirection.NONE ? direction : HexDirection.EAST;
    const worldAngle = getHexDirectionWorldAngle(effectiveDir);

    // Forward unit vector in world XZ plane (pointing toward target hex in facing direction)
    const fwdX = Math.cos(worldAngle);
    const fwdZ = Math.sin(worldAngle);
    // Lateral / Rank unit vector in world XZ plane (perpendicular to forward vector)
    const latX = -Math.sin(worldAngle);
    const latZ = Math.cos(worldAngle);

    const toWorldOffset = (forwardOffset: number, lateralOffset: number): THREE.Vector3 => {
      return new THREE.Vector3(
        forwardOffset * fwdX + lateralOffset * latX,
        0,
        forwardOffset * fwdZ + lateralOffset * latZ
      );
    };

    if (count <= 1) {
      this.modelOffsets.push(new THREE.Vector3(0, 0, 0));
      return;
    }

    if (count === 2) {
      // Single front rank of 2 soldiers standing side-by-side perpendicular to facing
      this.modelOffsets.push(toWorldOffset(0.03, -0.3));
      this.modelOffsets.push(toWorldOffset(-0.03, 0.3));
      return;
    }

    if (count === 3) {
      // Single front rank of 3 soldiers standing side-by-side perpendicular to facing
      this.modelOffsets.push(toWorldOffset(0.03, -0.35));
      this.modelOffsets.push(toWorldOffset(-0.03, 0));
      this.modelOffsets.push(toWorldOffset(0.03, 0.35));
      return;
    }

    if (count === 4) {
      // 2 ranks of 2 soldiers (rank width wider than depth)
      const sLat = 0.34;
      const sFwd = 0.25;
      const df = 0.03;
      // Front rank (r = 0, +sFwd)
      this.modelOffsets.push(toWorldOffset(sFwd + df, -sLat));
      this.modelOffsets.push(toWorldOffset(sFwd - df, sLat));
      // Rear rank (r = 1, -sFwd)
      this.modelOffsets.push(toWorldOffset(-sFwd - df, -sLat));
      this.modelOffsets.push(toWorldOffset(-sFwd + df, sLat));
    } else if (count <= 6) {
      // 2 ranks of 3 soldiers (3 wide along rank perpendicular to facing, 2 deep)
      const sLat = 0.32;
      const sFwd = 0.25;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          if (this.modelOffsets.length < count) {
            const staggerFwd = (c % 2 === 0 ? 0.03 : -0.03) * (r % 2 === 0 ? 1 : -1);
            const fwd = (0.5 - r) * (sFwd * 2) + staggerFwd;
            const lat = (c - 1) * sLat;
            this.modelOffsets.push(toWorldOffset(fwd, lat));
          }
        }
      }
    } else if (count <= 8) {
      // 2 ranks of 4 soldiers (4 wide along rank perpendicular to facing, 2 deep)
      const sLat = 0.25;
      const sFwd = 0.28;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            const staggerFwd = ((c % 2 === 0 ? 0.03 : -0.03) + (c - 1.5) * 0.01) * (r % 2 === 0 ? 1 : -1);
            const fwd = (0.5 - r) * sFwd + staggerFwd;
            const lat = (c - 1.5) * sLat;
            this.modelOffsets.push(toWorldOffset(fwd, lat));
          }
        }
      }
    } else if (count <= 12) {
      // 3 ranks of 4 soldiers (4 wide along rank perpendicular to facing, 3 deep)
      const sLat = 0.23;
      const sFwd = 0.21;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            const staggerFwd = ((c % 2 === 0 ? 0.025 : -0.025) + (c - 1.5) * 0.008) * (r % 2 === 0 ? 1 : -1);
            const fwd = (1.0 - r) * sFwd + staggerFwd;
            const lat = (c - 1.5) * sLat;
            this.modelOffsets.push(toWorldOffset(fwd, lat));
          }
        }
      }
    } else {
      // 4 ranks of 4 soldiers (up to 16, wider lateral rank spacing than forward depth spacing)
      const sLat = 0.22;
      const sFwd = 0.18;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            const staggerFwd = ((c % 2 === 0 ? 0.02 : -0.02) + (c - 1.5) * 0.006) * (r % 2 === 0 ? 1 : -1);
            const fwd = (1.5 - r) * sFwd + staggerFwd;
            const lat = (c - 1.5) * sLat;
            this.modelOffsets.push(toWorldOffset(fwd, lat));
          }
        }
      }
    }
  }

  private setupModels(): void {
    this.models.forEach((model, index) => {
      const offset = this.modelOffsets[index] || new THREE.Vector3(0, 0, 0);
      model.object3D.position.copy(offset);
      this.rootGroup.add(model.object3D);
    });
  }

  private applyFormationOffsets(): void {
    this.models.forEach((model, index) => {
      const offset = this.modelOffsets[index];
      if (offset) {
        model.object3D.position.copy(offset);
      }
    });
  }

  private setupOverheadBars(): void {
    const barWidth = 1.0;
    const barHeight = 0.08;

    // Background plate
    const bgGeo = new THREE.PlaneGeometry(barWidth + 0.04, barHeight * 2 + 0.06);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.barBgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.overheadGroup.add(this.barBgMesh);

    // Health Bar (Green)
    const hpGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    hpGeo.translate(barWidth * 0.5, 0, 0);
    const hpMat = new THREE.MeshBasicMaterial({ color: 0x22cc44, side: THREE.DoubleSide });
    this.hpBarMesh = new THREE.Mesh(hpGeo, hpMat);
    this.hpBarMesh.position.set(-barWidth * 0.5, barHeight * 0.5 + 0.01, 0.001);
    this.overheadGroup.add(this.hpBarMesh);

    // Stamina Bar (Cyan/Blue)
    const stGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    stGeo.translate(barWidth * 0.5, 0, 0);
    const stMat = new THREE.MeshBasicMaterial({ color: 0x3399ff, side: THREE.DoubleSide });
    this.staminaBarMesh = new THREE.Mesh(stGeo, stMat);
    this.staminaBarMesh.position.set(-barWidth * 0.5, -barHeight * 0.5 - 0.01, 0.001);
    this.overheadGroup.add(this.staminaBarMesh);

    this.updateCountText();
  }

  private updateCountText(): void {
    if (this.countSprite) {
      this.overheadGroup.remove(this.countSprite);
      this.countSprite.material.dispose();
      this.countSprite.geometry.dispose();
      this.countSprite = undefined;
    }

    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 128, 64);

    const moraleState = this.creature.moraleState;
    const countStr = `${this.aliveCount}/${this.maxCount}`;

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textMetrics = ctx.measureText(countStr);
    const textWidth = textMetrics.width;

    const iconSize = 28; // Renders to ~20x20 screen pixels in 3D world view
    const gap = 6;
    const totalW = iconSize + gap + textWidth;
    const startX = Math.round((128 - totalW) / 2);
    const iconX = startX;
    const iconY = Math.round((64 - iconSize) / 2);
    const textX = startX + iconSize + gap;
    const textY = 32;

    this.drawMoraleIcon(ctx, moraleState, iconX, iconY, iconSize);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(countStr, textX, textY);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.countSprite = new THREE.Sprite(mat);
    this.countSprite.scale.set(0.6, 0.3, 1);
    this.countSprite.position.set(0, 0.22, 0);
    this.overheadGroup.add(this.countSprite);
  }

  private drawMoraleIcon(
    ctx: CanvasRenderingContext2D,
    state: MoraleState,
    x: number,
    y: number,
    size: number
  ): void {
    const img = getMoraleImage(state, () => {
      this.updateCountText();
    });

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, size, size);
      return;
    }

    drawMoraleVector(ctx, state, x, y, size);
  }

  public get isEliminated(): boolean {
    return !this.creature.isAlive || this.aliveCount <= 0;
  }

  public get hasActiveEffects(): boolean {
    return this.floatingTexts.length > 0;
  }

  public updateStats(showIndicators: boolean = this.showDamageIndicators): void {
    const prevAlive = this.aliveCount;
    this.aliveCount = this.creature.isAlive ? this.creature.aliveModelCount : 0;

    const isDead = !this.creature.isAlive || this.aliveCount <= 0;

    const curHp = this.creature.isAlive ? Math.max(0, this.creature.stats.remaining_health) : 0;
    const curSt = Math.max(0, this.creature.stats.stamina);
    const curMo = this.creature.stats.morale;

    const hpDelta = curHp - this.lastHealth;
    const stDelta = curSt - this.lastStamina;
    const moDelta = curMo - this.lastMorale;

    if (showIndicators && this.showDamageIndicators) {
      if (hpDelta !== 0) {
        this.addDamageIndicator('health', hpDelta);
      }
      if (stDelta !== 0) {
        this.addDamageIndicator('stamina', stDelta);
      }
      if (moDelta !== 0) {
        this.addDamageIndicator('morale', moDelta);
      }
    }

    this.lastHealth = curHp;
    this.lastStamina = curSt;
    this.lastMorale = curMo;

    if (isDead) {
      this.overheadGroup.visible = false;
      this.models.forEach((model) => {
        model.object3D.visible = false;
        model.setCasualtyFade(0.0);
      });
      return;
    }

    this.overheadGroup.visible = true;

    // Health ratio
    const maxHp = Math.max(1, this.creature.stats.health);
    const currHp = Math.max(0, this.creature.stats.remaining_health);
    const hpRatio = Math.max(0, Math.min(1, currHp / maxHp));
    this.hpBarMesh.scale.x = hpRatio;

    // Stamina ratio
    const maxSt = Math.max(1, this.creature.stats.max_stamina);
    const currSt = Math.max(0, this.creature.stats.stamina);
    const stRatio = Math.max(0, Math.min(1, currSt / maxSt));
    this.staminaBarMesh.scale.x = stRatio;

    // Color code HP bar
    const hpMat = this.hpBarMesh.material as THREE.MeshBasicMaterial;
    if (hpRatio < 0.25) hpMat.color.setHex(0xdd2222);
    else if (hpRatio < 0.5) hpMat.color.setHex(0xddaa22);
    else hpMat.color.setHex(0x22cc44);

    // Hide casualty models in the squad
    this.models.forEach((model, idx) => {
      if (idx < this.aliveCount) {
        model.object3D.visible = true;
        model.setCasualtyFade(1.0);
      } else {
        model.object3D.visible = false;
        model.setCasualtyFade(0.0);
      }
    });

    const currentMorale = this.creature.moraleState;
    if (prevAlive !== this.aliveCount || this.prevMoraleState !== currentMorale) {
      this.prevMoraleState = currentMorale;
      this.updateCountText();
    }
  }

  /**
   * Adds a floating damage/stat indicator with an icon and +/- sign,
   * starting from the position of the healthbar and rising quickly over 0.4 seconds.
   */
  public addDamageIndicator(type: DamageIndicatorType, delta: number): void {
    if (!this.showDamageIndicators || delta === 0) return;
    if (typeof document === 'undefined') return;

    const canvas = createDamageIndicatorCanvas(type, delta);
    if (!canvas) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.95, 0.285, 1);

    const now = Date.now();
    if (now - this.lastIndicatorTime > 600) {
      this.indicatorStaggerIndex = 0;
    }
    this.lastIndicatorTime = now;

    const staggerOffsets = [0, -0.38, 0.38, -0.76, 0.76];
    const xOffset = staggerOffsets[this.indicatorStaggerIndex % staggerOffsets.length];
    this.indicatorStaggerIndex++;

    // Starting from the position of the healthbar (overheadGroup y = 1.2)
    const startPos = new THREE.Vector3(xOffset, 1.22, 0.05);
    sprite.position.copy(startPos);
    this.rootGroup.add(sprite);

    this.floatingTexts.push({
      sprite,
      startPos,
      elapsedMs: 0,
      durationMs: 400, // 0.4 seconds duration
      riseSpeed: 0.75, // quick upward travel typical of video games
    });
  }

  public setFacing(direction: HexDirection): void {
    const effectiveDir = direction !== HexDirection.NONE ? direction : this.currentFacing;
    this.currentFacing = effectiveDir;
    this.calculateFormationOffsets(effectiveDir);
    this.applyFormationOffsets();
    this.models.forEach((m) => m.setFacing(effectiveDir));
  }

  public playAnimation(state: UnitAnimationState, durationMs: number = 500): void {
    if (this.isEliminated) return;
    this.models.forEach((m, idx) => {
      if (idx < this.aliveCount) {
        m.playAnimation(state, durationMs);
      }
    });
  }

  public addFloatingCombatText(text: string, colorHex: string = '#ff4444', durationMs: number = 1200): void {
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = colorHex;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.35, 1);

    const startPos = new THREE.Vector3(0, 1.4, 0);
    sprite.position.copy(startPos);
    this.rootGroup.add(sprite);

    this.floatingTexts.push({
      sprite,
      startPos,
      elapsedMs: 0,
      durationMs,
      riseSpeed: 0.8,
    });
  }

  public moveToPath(pathWorldPositions: THREE.Vector3[], onComplete?: () => void): void {
    if (pathWorldPositions.length === 0) return;
    this.movePath = pathWorldPositions;
    this.moveTargetIndex = 0;
    this.isMoving = true;
    this.onMoveComplete = onComplete;
    this.playAnimation('walk');
  }

  public update(deltaMs: number, camera: THREE.Camera): void {
    if (!this.isEliminated) {
      // Update individual models
      this.models.forEach((m) => m.update(deltaMs));

      // Make overhead bars face camera (billboard effect)
      this.overheadGroup.quaternion.copy(camera.quaternion);
    }

    // Process floating combat texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.elapsedMs += deltaMs;
      const p = ft.elapsedMs / ft.durationMs;
      if (p >= 1) {
        this.rootGroup.remove(ft.sprite);
        if (ft.sprite.material.map) {
          ft.sprite.material.map.dispose();
        }
        ft.sprite.material.dispose();
        this.floatingTexts.splice(i, 1);
      } else {
        ft.sprite.position.y = ft.startPos.y + p * ft.riseSpeed;
        const opacity = p < 0.6 ? 1.0 : Math.max(0, 1.0 - (p - 0.6) / 0.4);
        ft.sprite.material.opacity = opacity;
      }
    }

    // Process movement along path
    if (this.isMoving && this.moveTargetIndex < this.movePath.length) {
      const target = this.movePath[this.moveTargetIndex];
      const step = (this.moveSpeed * deltaMs) / 1000;
      const dist = this.rootGroup.position.distanceTo(target);

      if (dist <= step) {
        this.rootGroup.position.copy(target);
        this.moveTargetIndex++;
        if (this.moveTargetIndex >= this.movePath.length) {
          this.isMoving = false;
          this.playAnimation('idle');
          if (this.onMoveComplete) this.onMoveComplete();
        }
      } else {
        const dir = new THREE.Vector3().subVectors(target, this.rootGroup.position).normalize();
        this.rootGroup.position.addScaledVector(dir, step);
      }
    }
  }

  public dispose(): void {
    this.models.forEach((m) => m.dispose());
    this.floatingTexts.forEach((ft) => {
      this.rootGroup.remove(ft.sprite);
      if (ft.sprite.material.map) {
        ft.sprite.material.map.dispose();
      }
      ft.sprite.material.dispose();
    });
    this.barBgMesh.geometry.dispose();
    (this.barBgMesh.material as THREE.Material).dispose();
    this.hpBarMesh.geometry.dispose();
    (this.hpBarMesh.material as THREE.Material).dispose();
    this.staminaBarMesh.geometry.dispose();
    (this.staminaBarMesh.material as THREE.Material).dispose();
    if (this.countSprite) {
      this.countSprite.geometry.dispose();
      this.countSprite.material.dispose();
    }
  }
}

const MORALE_ICON_PATHS: Record<MoraleState, string> = {
  [MoraleState.HIGH]: 'morale/morale_high.png',
  [MoraleState.STEADY]: 'morale/morale_steady.png',
  [MoraleState.WAVERING]: 'morale/morale_wavering.png',
  [MoraleState.PANICKED]: 'morale/morale_panicked.png',
  [MoraleState.ROUTING]: 'morale/morale_routing.png',
};

const moraleImageCache = new Map<string, HTMLImageElement>();

function getMoraleImage(state: MoraleState, onLoaded?: () => void): HTMLImageElement | undefined {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const path = MORALE_ICON_PATHS[state] || MORALE_ICON_PATHS[MoraleState.STEADY];
  let img = moraleImageCache.get(path);
  if (!img) {
    img = new Image();
    img.src = path;
    if (onLoaded) {
      img.onload = () => onLoaded();
    }
    moraleImageCache.set(path, img);
  } else if (!img.complete && onLoaded) {
    const prevOnload = img.onload;
    img.onload = (e) => {
      if (prevOnload) (prevOnload as any)(e);
      onLoaded();
    };
  }
  return img;
}

export function drawMoraleVector(
  ctx: CanvasRenderingContext2D,
  state: MoraleState,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 48;
  ctx.scale(s, s);

  if (state === MoraleState.ROUTING) {
    // Running figure in black
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(30, 9, 4, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.beginPath();
    ctx.moveTo(29, 14);
    ctx.lineTo(22, 26);
    ctx.stroke();

    // Back leg
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(14, 28);
    ctx.lineTo(6, 36);
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(28, 33);
    ctx.lineTo(26, 43);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(28, 16);
    ctx.lineTo(18, 19);
    ctx.lineTo(16, 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(28, 16);
    ctx.lineTo(35, 19);
    ctx.lineTo(39, 26);
    ctx.stroke();
  } else {
    const color = (state === MoraleState.PANICKED) ? '#ea3838' : (state === MoraleState.WAVERING ? '#f1c40f' : '#2ecc71');
    ctx.fillStyle = color;

    const yShift = (state === MoraleState.HIGH) ? 2 : 0;

    // Body & tail
    ctx.beginPath();
    ctx.moveTo(24, 18 + yShift);
    ctx.lineTo(29, 24 + yShift);
    ctx.lineTo(27, 33 + yShift);
    ctx.lineTo(24, 37 + yShift);
    ctx.lineTo(21, 33 + yShift);
    ctx.lineTo(19, 24 + yShift);
    ctx.closePath();
    ctx.fill();

    // Tail feathers
    ctx.beginPath();
    ctx.moveTo(20, 34 + yShift);
    ctx.lineTo(24, 43 + yShift);
    ctx.lineTo(28, 34 + yShift);
    ctx.closePath();
    ctx.fill();

    // Head & beak
    ctx.beginPath();
    ctx.arc(24, 15 + yShift, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(25, 13.5 + yShift);
    ctx.lineTo(31, 15.5 + yShift);
    ctx.lineTo(25, 17.5 + yShift);
    ctx.closePath();
    ctx.fill();

    // Wings
    if (state === MoraleState.HIGH || state === MoraleState.STEADY) {
      // Wings raised
      ctx.beginPath();
      ctx.moveTo(22, 23 + yShift);
      ctx.lineTo(16, 20 + yShift);
      ctx.lineTo(9, 13 + yShift);
      ctx.lineTo(4, 7 + yShift);
      ctx.lineTo(8, 12 + yShift);
      ctx.lineTo(6, 17 + yShift);
      ctx.lineTo(11, 18 + yShift);
      ctx.lineTo(9, 23 + yShift);
      ctx.lineTo(14, 23 + yShift);
      ctx.lineTo(12, 28 + yShift);
      ctx.lineTo(18, 27 + yShift);
      ctx.lineTo(22, 28 + yShift);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(26, 23 + yShift);
      ctx.lineTo(32, 20 + yShift);
      ctx.lineTo(39, 13 + yShift);
      ctx.lineTo(44, 7 + yShift);
      ctx.lineTo(40, 12 + yShift);
      ctx.lineTo(42, 17 + yShift);
      ctx.lineTo(37, 18 + yShift);
      ctx.lineTo(39, 23 + yShift);
      ctx.lineTo(34, 23 + yShift);
      ctx.lineTo(36, 28 + yShift);
      ctx.lineTo(30, 27 + yShift);
      ctx.lineTo(26, 28 + yShift);
      ctx.closePath();
      ctx.fill();

      if (state === MoraleState.HIGH) {
        drawStar(ctx, 24, 5, 5, 4.5, 2.0, color);
      }
    } else if (state === MoraleState.WAVERING) {
      // Wings straight
      ctx.beginPath();
      ctx.moveTo(21, 22);
      ctx.lineTo(14, 20);
      ctx.lineTo(8, 20);
      ctx.lineTo(2, 21);
      ctx.lineTo(7, 24);
      ctx.lineTo(4, 27);
      ctx.lineTo(10, 27);
      ctx.lineTo(8, 30);
      ctx.lineTo(15, 29);
      ctx.lineTo(13, 33);
      ctx.lineTo(19, 30);
      ctx.lineTo(21, 27);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(27, 22);
      ctx.lineTo(34, 20);
      ctx.lineTo(40, 20);
      ctx.lineTo(46, 21);
      ctx.lineTo(41, 24);
      ctx.lineTo(44, 27);
      ctx.lineTo(38, 27);
      ctx.lineTo(40, 30);
      ctx.lineTo(33, 29);
      ctx.lineTo(35, 33);
      ctx.lineTo(29, 30);
      ctx.lineTo(27, 27);
      ctx.closePath();
      ctx.fill();
    } else if (state === MoraleState.PANICKED) {
      // Wings lowered
      ctx.beginPath();
      ctx.moveTo(21, 22);
      ctx.lineTo(16, 24);
      ctx.lineTo(11, 28);
      ctx.lineTo(5, 37);
      ctx.lineTo(9, 34);
      ctx.lineTo(7, 40);
      ctx.lineTo(12, 36);
      ctx.lineTo(11, 42);
      ctx.lineTo(15, 37);
      ctx.lineTo(18, 33);
      ctx.lineTo(21, 27);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(27, 22);
      ctx.lineTo(32, 24);
      ctx.lineTo(37, 28);
      ctx.lineTo(43, 37);
      ctx.lineTo(39, 34);
      ctx.lineTo(41, 40);
      ctx.lineTo(36, 36);
      ctx.lineTo(37, 42);
      ctx.lineTo(33, 37);
      ctx.lineTo(30, 33);
      ctx.lineTo(27, 27);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

