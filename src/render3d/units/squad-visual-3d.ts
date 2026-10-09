import * as THREE from 'three';
import { Creature } from '../../battle/creature';
import { HexDirection } from '../../shared/hex-map';
import { IUnitVisual } from './unit-visual-interface';
import { UnitAnimationState } from '../types';

export interface FloatingText3D {
  sprite: THREE.Sprite;
  startPos: THREE.Vector3;
  elapsedMs: number;
  durationMs: number;
  riseSpeed: number;
}

/**
 * Manages the entire multi-model squad representation in 3D space,
 * including individual model positions, overhead bars, floating combat text,
 * and movement interpolation.
 */
export class SquadVisual3D {
  public readonly rootGroup: THREE.Group = new THREE.Group();
  public readonly creature: Creature;

  private models: IUnitVisual[] = [];
  private modelOffsets: THREE.Vector3[] = [];
  private aliveCount: number = 0;
  private maxCount: number = 0;

  // Overhead Status UI
  private overheadGroup: THREE.Group = new THREE.Group();
  private hpBarMesh!: THREE.Mesh;
  private staminaBarMesh!: THREE.Mesh;
  private barBgMesh!: THREE.Mesh;
  private countSprite?: THREE.Sprite;

  // Floating text queue
  private floatingTexts: FloatingText3D[] = [];

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

    this.calculateFormationOffsets();
    this.setupModels();
    this.setupOverheadBars();

    this.rootGroup.add(this.overheadGroup);
    this.overheadGroup.position.set(0, 1.6, 0);

    this.updateStats();
  }

  private calculateFormationOffsets(): void {
    const count = this.models.length;
    this.modelOffsets = [];

    if (count <= 1) {
      this.modelOffsets.push(new THREE.Vector3(0, 0, 0));
      return;
    }

    if (count === 4) {
      // 2x2 grid
      const s = 0.35;
      this.modelOffsets.push(new THREE.Vector3(-s, 0, -s));
      this.modelOffsets.push(new THREE.Vector3(s, 0, -s));
      this.modelOffsets.push(new THREE.Vector3(-s, 0, s));
      this.modelOffsets.push(new THREE.Vector3(s, 0, s));
    } else if (count === 6) {
      // 3x2 grid (hero in center)
      const sx = 0.32;
      const sz = 0.28;
      this.modelOffsets.push(new THREE.Vector3(-sx, 0, -sz));
      this.modelOffsets.push(new THREE.Vector3(0, 0, -sz));
      this.modelOffsets.push(new THREE.Vector3(sx, 0, -sz));
      this.modelOffsets.push(new THREE.Vector3(-sx, 0, sz));
      this.modelOffsets.push(new THREE.Vector3(0, 0, sz));
      this.modelOffsets.push(new THREE.Vector3(sx, 0, sz));
    } else if (count <= 8) {
      // 4x2 grid
      const sx = 0.25;
      const sz = 0.3;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            this.modelOffsets.push(new THREE.Vector3((c - 1.5) * sx, 0, (r - 0.5) * sz));
          }
        }
      }
    } else if (count <= 12) {
      // 4x3 grid
      const sx = 0.22;
      const sz = 0.22;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            this.modelOffsets.push(new THREE.Vector3((c - 1.5) * sx, 0, (r - 1.0) * sz));
          }
        }
      }
    } else {
      // 4x4 grid (up to 16)
      const s = 0.2;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.modelOffsets.length < count) {
            this.modelOffsets.push(new THREE.Vector3((c - 1.5) * s, 0, (r - 1.5) * s));
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
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`${this.aliveCount}/${this.maxCount}`, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.countSprite = new THREE.Sprite(mat);
    this.countSprite.scale.set(0.6, 0.3, 1);
    this.countSprite.position.set(0, 0.22, 0);
    this.overheadGroup.add(this.countSprite);
  }

  public get isEliminated(): boolean {
    return !this.creature.isAlive || this.aliveCount <= 0;
  }

  public get hasActiveEffects(): boolean {
    return this.floatingTexts.length > 0;
  }

  public updateStats(): void {
    const prevAlive = this.aliveCount;
    this.aliveCount = this.creature.isAlive ? this.creature.aliveModelCount : 0;

    const isDead = !this.creature.isAlive || this.aliveCount <= 0;

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

    if (prevAlive !== this.aliveCount) {
      this.updateCountText();
    }
  }

  public setFacing(direction: HexDirection): void {
    this.models.forEach((m) => m.setFacing(direction));
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

    const startPos = new THREE.Vector3(0, 1.8, 0);
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
        ft.sprite.material.dispose();
        this.floatingTexts.splice(i, 1);
      } else {
        ft.sprite.position.y = ft.startPos.y + p * ft.riseSpeed;
        ft.sprite.material.opacity = 1.0 - Math.pow(p, 2);
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
