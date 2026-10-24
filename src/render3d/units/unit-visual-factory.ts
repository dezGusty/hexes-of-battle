import * as THREE from 'three';
import { Creature, CreatureType } from '../../battle/creature';
import { UnitVisualFormat } from '../types';
import { IUnitVisual } from './unit-visual-interface';
import { BillboardStaticVisual } from './billboard-static-visual';
import { MeshRigidVisual } from './mesh-rigid-visual';
import { MeshSkeletalVisual } from './mesh-skeletal-visual';
import { BillboardAnimatedVisual } from './billboard-animated-visual';
import { SquadVisual3D } from './squad-visual-3d';

export interface UnitAssetCatalog {
  unitsImage?: HTMLImageElement;
  spriteFrames?: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

export class UnitVisualFactory {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private catalog: UnitAssetCatalog = {};

  constructor(catalog?: UnitAssetCatalog) {
    if (catalog) {
      this.catalog = catalog;
    }
  }

  public setCatalog(catalog: UnitAssetCatalog): void {
    this.catalog = catalog;
  }

  public async loadCatalogAssets(
    imageSrc: string = 'units_160x320.png',
    jsonSrc: string = 'unitsspritesheet.json'
  ): Promise<void> {
    try {
      const resp = await fetch(jsonSrc);
      const data = await resp.json();
      if (data && data.frames) {
        this.catalog.spriteFrames = data.frames;
      }
      if (data?.meta?.image) {
        imageSrc = data.meta.image;
      }
    } catch (e) {
      console.warn('Could not load sprite sheet JSON:', e);
    }

    const tryLoadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    try {
      let img: HTMLImageElement;
      try {
        img = await tryLoadImage(imageSrc);
      } catch {
        img = await tryLoadImage('/' + imageSrc.replace(/^\.?\//, ''));
      }
      this.catalog.unitsImage = img;
      this.textureCache.clear();
    } catch (e) {
      console.warn('Could not load sprite image:', e);
    }
  }

  public setSpritesheet(spritesheet: any): void {
    if (!spritesheet) return;
    if (spritesheet.data?.frames) {
      this.catalog.spriteFrames = spritesheet.data.frames;
    }
    const resource = spritesheet.textureSource?.resource ?? spritesheet.baseTexture?.resource?.source;
    if (resource && (resource instanceof HTMLImageElement || resource instanceof HTMLCanvasElement || resource instanceof ImageBitmap)) {
      this.catalog.unitsImage = resource as any;
      this.textureCache.clear();
    }
  }

  /**
   * Creates a full 3D squad representation for a creature based on its model count and visual format.
   */
  public createSquadVisual(creature: Creature): SquadVisual3D {
    const modelCount = Math.max(1, creature.stats.model_count);
    const visuals: IUnitVisual[] = [];

    // Format can be configured per creature type or defaulted to BILLBOARD_STATIC
    const format = this.determineFormat(creature);

    for (let i = 0; i < modelCount; i++) {
      const isHeroCommander = creature.stats.is_hero && i === 0;
      visuals.push(this.createSingleModelVisual(creature, format, isHeroCommander));
    }

    return new SquadVisual3D(creature, visuals);
  }

  private determineFormat(creature: Creature): UnitVisualFormat {
    // Check traits or metadata for format overrides
    if (creature.hasTrait('format_skeletal_3d')) return UnitVisualFormat.FULL_3D_SKELETAL;
    if (creature.hasTrait('format_rigid_3d')) return UnitVisualFormat.FULL_3D_RIGID;
    if (creature.hasTrait('format_animated_2d')) return UnitVisualFormat.BILLBOARD_ANIMATED;
    return UnitVisualFormat.BILLBOARD_STATIC;
  }

  private createSingleModelVisual(
    creature: Creature,
    format: UnitVisualFormat,
    isHeroCommander: boolean
  ): IUnitVisual {
    switch (format) {
      case UnitVisualFormat.FULL_3D_RIGID:
        return this.createRigid3DModel(creature, isHeroCommander);

      case UnitVisualFormat.FULL_3D_SKELETAL:
        return this.createSkeletal3DModel(creature);

      case UnitVisualFormat.BILLBOARD_ANIMATED:
        return this.createAnimatedBillboard(creature);

      case UnitVisualFormat.BILLBOARD_STATIC:
      default:
        return this.createStaticBillboard(creature, isHeroCommander);
    }
  }

  private createStaticBillboard(creature: Creature, isHeroCommander: boolean): BillboardStaticVisual {
    const frameName = this.getFrameNameForCreature(creature.creatureType, isHeroCommander);
    const texture = this.getTextureForFrame(frameName, creature.creatureType);

    const isMonster = creature.creatureType === CreatureType.BEHEMOTH;
    const width = isMonster ? 1.8 : isHeroCommander ? 0.9 : 0.7;
    const height = isMonster ? 2.4 : isHeroCommander ? 1.5 : 1.3;

    return new BillboardStaticVisual({
      texture,
      width,
      height,
      initialFacing: creature.facingDirection,
    });
  }

  private createRigid3DModel(creature: Creature, isHero: boolean): MeshRigidVisual {
    const group = new THREE.Group();
    const isMonster = creature.creatureType === CreatureType.BEHEMOTH;

    // Procedural placeholder stylized 3D geometry
    const bodyColor = creature.armyAlignment === 0 ? 0x3366cc : 0xcc3333;
    const armorColor = isHero ? 0xffcc00 : 0x888899;

    const bodyGeo = isMonster
      ? new THREE.ConeGeometry(0.8, 2.0, 6)
      : new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = isMonster ? 1.0 : 0.4;
    group.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(isMonster ? 0.4 : 0.18, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: armorColor });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = isMonster ? 2.2 : 0.95;
    group.add(headMesh);

    return new MeshRigidVisual({
      meshOrGroup: group,
      scale: isMonster ? 1.2 : 0.9,
      initialFacing: creature.facingDirection,
    });
  }

  private createSkeletal3DModel(_creature: Creature): MeshSkeletalVisual {
    // Minimal fallback skinned mesh
    const geometry = new THREE.CylinderGeometry(0.2, 0.25, 1.0, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0x5588cc });
    const mesh = new THREE.Mesh(geometry, material);
    return new MeshSkeletalVisual({
      model: mesh,
      animations: [],
    });
  }

  private createAnimatedBillboard(creature: Creature): BillboardAnimatedVisual {
    const frameName = this.getFrameNameForCreature(creature.creatureType, false);
    const texture = this.getTextureForFrame(frameName, creature.creatureType);
    return new BillboardAnimatedVisual({
      animations: {
        idle: [{ texture, durationMs: 400 }],
      },
      initialFacing: creature.facingDirection,
    });
  }

  public getFrameNameForCreature(type: CreatureType | string | number, isHero: boolean): string {
    if (isHero) return 'swordman_right.png';

    const normalized = String(type).toLowerCase().replace(/_/g, '-');

    if (normalized === '0' || normalized === 'peasant') return 'peasant_fork_right.png';
    if (normalized === '1' || normalized === 'peasant-archer' || normalized === 'archer') return 'peasant_archer_right.png';
    if (normalized === '2' || normalized === 'swordsman' || normalized === 'swordman') return 'swordman_right.png';
    if (normalized === '3' || normalized === 'spearman') return 'spearman_right.png';
    if (normalized === '4' || normalized === 'crossbowman') return 'crossbowman_right.png';
    if (normalized === '6' || normalized === 'barbarian') return 'barbarian_right.png';
    if (normalized === '7' || normalized === 'heavy-knights') return 'halberdier_left.png';
    if (normalized === '8' || normalized === 'behemoth') return 'rock_elemental_left.png';
    if (normalized === '9' || normalized === 'hero-commander') return 'swordman_right.png';

    return 'peasant_fork_right.png';
  }

  private getTextureForFrame(frameName: string, creatureType: CreatureType): THREE.Texture {
    if (this.textureCache.has(frameName)) {
      return this.textureCache.get(frameName)!;
    }

    if (typeof document !== 'undefined') {
      if (this.catalog.unitsImage && this.catalog.spriteFrames?.[frameName]) {
        const f = this.catalog.spriteFrames[frameName].frame;
        const canvas = document.createElement('canvas');
        canvas.width = f.w;
        canvas.height = f.h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, f.w, f.h);
          ctx.drawImage(this.catalog.unitsImage, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          this.textureCache.set(frameName, texture);
          return texture;
        }
      }

      // Transparent fallback procedural canvas texture (clean transparent background, never solid blue)
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 80;
      fallbackCanvas.height = 160;
      const fctx = fallbackCanvas.getContext('2d');
      if (fctx) {
        fctx.clearRect(0, 0, 80, 160);
        fctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
        fctx.beginPath();
        fctx.arc(40, 35, 14, 0, Math.PI * 2);
        fctx.fill();
        fctx.fillRect(28, 55, 24, 65);
        fctx.fillStyle = '#111111';
        fctx.font = 'bold 11px sans-serif';
        fctx.textAlign = 'center';
        fctx.fillText(String(creatureType).substring(0, 5), 40, 85);

        const texture = new THREE.CanvasTexture(fallbackCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textureCache.set(frameName, texture);
        return texture;
      }
    }

    const dataTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    dataTexture.needsUpdate = true;
    this.textureCache.set(frameName, dataTexture);
    return dataTexture;
  }
}
