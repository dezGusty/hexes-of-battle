import * as THREE from 'three';
import { HexDirection, HexFlankStatus, HexMap } from '../shared/hex-map';
import { Coords } from '../shared';
import { TerrainType } from '../battle/terrain-types';

export interface HexBoard3DOptions {
  showGrid?: boolean;
  borderThickness?: number;
  borderColor?: string;
  showCoords?: boolean;
  coordsFontSize?: number;
  coordsFontFamily?: string;
  coordsColor?: string;
  coordsStrokeColor?: string;
  coordsStrokeWidth?: number;
  getTerrain?: (x: number, y: number) => TerrainType;
}

export class HexBoard3D {
  public readonly group: THREE.Group = new THREE.Group();
  public readonly hexMap: HexMap;

  // Hex dimensions in 3D
  public readonly hexRadius: number = 1.0;
  public readonly hexHeight: number = 0.25;

  private tileMeshes: Map<string, THREE.Mesh> = new Map();
  private overlayMeshes: Map<string, THREE.Mesh> = new Map();
  private gridBordersGroup: THREE.Group = new THREE.Group();
  private coordsGroup: THREE.Group = new THREE.Group();
  private hoverMesh: THREE.Mesh;
  private selectedRingMesh: THREE.Mesh;
  private facingIndicatorGroup: THREE.Group = new THREE.Group();
  private attackPreviewGroup: THREE.Group = new THREE.Group();
  private pathPreviewGroup: THREE.Group = new THREE.Group();

  private showGrid: boolean = true;
  private borderThickness: number = 2.5;
  private borderColor: string = '#000000';

  private showCoords: boolean = true;
  private coordsFontSize: number = 14;
  private coordsFontFamily: string = 'GustysSerpents, sans-serif';
  private coordsColor: string = '#ffffff';
  private coordsStrokeColor: string = '#000000';
  private coordsStrokeWidth: number = 3;

  private getTerrain?: (x: number, y: number) => TerrainType;

  private materials: Record<string, THREE.Material> = {};
  private sideMaterial: THREE.Material = new THREE.MeshStandardMaterial({
    color: 0x33281e,
    roughness: 0.9,
    metalness: 0.1,
  });

  constructor(
    hexMap: HexMap,
    options?: HexBoard3DOptions
  ) {
    this.hexMap = hexMap;
    if (options?.showGrid !== undefined) this.showGrid = options.showGrid;
    if (options?.borderThickness !== undefined) this.borderThickness = options.borderThickness;
    if (options?.borderColor !== undefined) this.borderColor = options.borderColor;

    if (options?.showCoords !== undefined) this.showCoords = options.showCoords;
    if (options?.coordsFontSize !== undefined) this.coordsFontSize = options.coordsFontSize;
    if (options?.coordsFontFamily !== undefined) this.coordsFontFamily = options.coordsFontFamily;
    if (options?.coordsColor !== undefined) this.coordsColor = options.coordsColor;
    if (options?.coordsStrokeColor !== undefined) this.coordsStrokeColor = options.coordsStrokeColor;
    if (options?.coordsStrokeWidth !== undefined) this.coordsStrokeWidth = options.coordsStrokeWidth;
    if (options?.getTerrain !== undefined) this.getTerrain = options.getTerrain;

    this.initMaterials();

    this.hoverMesh = this.createHighlightHexMesh(0xffffff, 0.4);
    this.hoverMesh.visible = false;
    this.group.add(this.hoverMesh);

    this.selectedRingMesh = this.createRingMesh(0xffcc00);
    this.selectedRingMesh.visible = false;
    this.group.add(this.selectedRingMesh);

    this.group.add(this.facingIndicatorGroup);
    this.group.add(this.attackPreviewGroup);
    this.group.add(this.pathPreviewGroup);
    this.group.add(this.gridBordersGroup);
    this.group.add(this.coordsGroup);

    this.buildBoard();
  }

  private initMaterials(): void {
    this.materials['grass'] = new THREE.MeshStandardMaterial({
      color: 0x3d7a42,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.materials['forest'] = new THREE.MeshStandardMaterial({
      color: 0x2e5c33,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.materials['dirt'] = new THREE.MeshStandardMaterial({
      color: 0x8a6d45,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.materials['water'] = new THREE.MeshStandardMaterial({
      color: 0x2266aa,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.materials['mountain'] = new THREE.MeshStandardMaterial({
      color: 0x5a636e,
      roughness: 0.7,
      metalness: 0.2,
    });
    this.materials['swamp'] = new THREE.MeshStandardMaterial({
      color: 0x4a5438,
      roughness: 0.85,
      metalness: 0.1,
    });
  }

  public async loadTerrainAssets(
    basePath: string = 'textures/terrain/'
  ): Promise<void> {
    if (typeof document === 'undefined') return;

    try {
      const loader = new THREE.TextureLoader();
      const loadTex = (url: string) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.magFilter = THREE.LinearFilter;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              resolve(tex);
            },
            undefined,
            (err) => reject(err)
          );
        });

      const [grassTex, forestTex, dirtTex, swampTex, mountainTex, waterTex] = await Promise.all([
        loadTex(`${basePath}grass.jpg`),
        loadTex(`${basePath}forest.jpg`),
        loadTex(`${basePath}dirt.jpg`),
        loadTex(`${basePath}swamp.jpg`),
        loadTex(`${basePath}mountain.jpg`),
        loadTex(`${basePath}water.jpg`),
      ]);

      this.materials['grass'] = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 });
      this.materials['forest'] = new THREE.MeshStandardMaterial({ map: forestTex, roughness: 0.85 });
      this.materials['dirt'] = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.9 });
      this.materials['swamp'] = new THREE.MeshStandardMaterial({ map: swampTex, roughness: 0.85, metalness: 0.05 });
      this.materials['mountain'] = new THREE.MeshStandardMaterial({ map: mountainTex, roughness: 0.75, metalness: 0.1 });
      this.materials['water'] = new THREE.MeshStandardMaterial({
        map: waterTex,
        roughness: 0.15,
        metalness: 0.3,
        transparent: true,
        opacity: 0.88,
      });

      this.rebuildBoard();
    } catch (e) {
      console.warn('Could not load hex terrain assets:', e);
    }
  }

  public rebuildBoard(): void {
    // Remove existing tile meshes
    this.tileMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    this.tileMeshes.clear();
    this.buildBoard();
  }

  /**
   * Converts grid hex (x, y) to 3D world space (X, Y, Z).
   * Hexagons are oriented pointy-topped (pointy towards North/South, flat on East/West),
   * allowing units to move in a straight line horizontally (East/West).
   */
  public hexToWorld(x: number, y: number): THREE.Vector3 {
    const widthSpacing = this.hexRadius * Math.sqrt(3);
    const heightSpacing = this.hexRadius * 1.5;

    const worldX = (x + (Math.abs(y) % 2) * 0.5 - (this.hexMap.width - 1) * 0.5) * widthSpacing;
    const worldZ = (y - (this.hexMap.height - 1) * 0.5) * heightSpacing;

    return new THREE.Vector3(worldX, 0, worldZ);
  }

  /**
   * Converts 3D world space coordinates to closest hex (x, y).
   */
  public worldToHex(pos: THREE.Vector3): Coords | null {
    let closestCoords: Coords | null = null;
    let minDistanceSq = Infinity;

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const wPos = this.hexToWorld(x, y);
        const distSq = (pos.x - wPos.x) ** 2 + (pos.z - wPos.z) ** 2;
        if (distSq < minDistanceSq && distSq < (this.hexRadius * 0.95) ** 2) {
          minDistanceSq = distSq;
          closestCoords = { x, y };
        }
      }
    }
    return closestCoords;
  }

  private getTileMaterials(terrain: TerrainType): THREE.Material[] {
    let topMat = this.materials['grass'];
    if (terrain === TerrainType.WATER) {
      topMat = this.materials['water'];
    } else if (terrain === TerrainType.FOREST) {
      topMat = this.materials['forest'] || this.materials['grass'];
    } else if (terrain === TerrainType.HILL) {
      topMat = this.materials['dirt'];
    } else if (terrain === TerrainType.SWAMP) {
      topMat = this.materials['swamp'];
    } else if (terrain === TerrainType.MOUNTAIN) {
      topMat = this.materials['mountain'];
    }

    return [this.sideMaterial, topMat, this.sideMaterial];
  }

  private buildBoard(): void {
    const hexGeometry = new THREE.CylinderGeometry(
      this.hexRadius,
      this.hexRadius * 0.96,
      this.hexHeight,
      6
    );

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        let terrain: TerrainType = TerrainType.PLAIN;
        if (this.getTerrain) {
          terrain = this.getTerrain(x, y);
        } else if (typeof (this.hexMap as any).getTerrain === 'function') {
          terrain = (this.hexMap as any).getTerrain(x, y);
        }

        let elevation = 0;
        if (terrain === TerrainType.WATER) {
          elevation = -0.08;
        } else if (terrain === TerrainType.HILL) {
          elevation = 0.25;
        } else if (terrain === TerrainType.SWAMP) {
          elevation = -0.04;
        } else if (terrain === TerrainType.MOUNTAIN) {
          elevation = 0.50;
        }

        const tileMaterials = this.getTileMaterials(terrain);
        const mesh = new THREE.Mesh(hexGeometry, tileMaterials);
        const pos = this.hexToWorld(x, y);
        mesh.position.set(pos.x, pos.y + elevation - this.hexHeight * 0.5, pos.z);
        mesh.receiveShadow = true;
        mesh.userData = { hexX: x, hexY: y, isHexTile: true };

        // Subtle edge wireframe
        const edges = new THREE.EdgesGeometry(hexGeometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x182a20, transparent: true, opacity: 0.6 })
        );
        mesh.add(line);

        this.group.add(mesh);
        this.tileMeshes.set(`${x},${y}`, mesh);
      }
    }

    this.rebuildGridBorders();
    this.rebuildCoords();
  }

  public setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    this.gridBordersGroup.visible = visible;
  }

  public isGridVisible(): boolean {
    return this.showGrid;
  }

  public setGridBorderThickness(thickness: number): void {
    this.borderThickness = thickness;
    this.rebuildGridBorders();
  }

  public setGridBorderColor(colorHex: string): void {
    this.borderColor = colorHex;
    this.rebuildGridBorders();
  }

  public setCoordsVisible(visible: boolean): void {
    this.showCoords = visible;
    this.coordsGroup.visible = visible;
  }

  public isCoordsVisible(): boolean {
    return this.showCoords;
  }

  public rebuildCoords(): void {
    while (this.coordsGroup.children.length > 0) {
      const child = this.coordsGroup.children[0] as THREE.Mesh;
      this.coordsGroup.remove(child);
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).map?.dispose();
            m.dispose();
          });
        } else {
          ((child.material as THREE.MeshBasicMaterial).map)?.dispose();
          child.material.dispose();
        }
      }
    }

    if (typeof document === 'undefined') return;

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        let terrain: TerrainType = TerrainType.PLAIN;
        if (this.getTerrain) {
          terrain = this.getTerrain(x, y);
        } else if (typeof (this.hexMap as any).getTerrain === 'function') {
          terrain = (this.hexMap as any).getTerrain(x, y);
        }

        let elevation = 0;
        if (terrain === TerrainType.WATER) elevation = -0.08;
        else if (terrain === TerrainType.HILL) elevation = 0.25;
        else if (terrain === TerrainType.SWAMP) elevation = -0.04;
        else if (terrain === TerrainType.MOUNTAIN) elevation = 0.50;

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 128, 64);
          ctx.font = `bold ${this.coordsFontSize * 2}px ${this.coordsFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = `${x},${y}`;
          if (this.coordsStrokeWidth > 0) {
            ctx.strokeStyle = this.coordsStrokeColor;
            ctx.lineWidth = this.coordsStrokeWidth * 2;
            ctx.strokeText(text, 64, 32);
          }

          ctx.fillStyle = this.coordsColor;
          ctx.fillText(text, 64, 32);

          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const mat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
          });

          const geo = new THREE.PlaneGeometry(0.85, 0.42);
          geo.rotateX(-Math.PI * 0.5);

          const mesh = new THREE.Mesh(geo, mat);
          const pos = this.hexToWorld(x, y);
          mesh.position.set(pos.x, pos.y + elevation + 0.005, pos.z);
          this.coordsGroup.add(mesh);
        }
      }
    }

    this.coordsGroup.visible = this.showCoords;
  }

  public rebuildGridBorders(): void {
    while (this.gridBordersGroup.children.length > 0) {
      const child = this.gridBordersGroup.children[0] as THREE.Mesh;
      this.gridBordersGroup.remove(child);
      child.geometry?.dispose();
    }

    const thickness = this.borderThickness;
    const thicknessWorld = thickness > 0.3 ? (thickness / 60.0) * this.hexRadius : thickness;
    const outerRadius = this.hexRadius * 0.995;
    const innerRadius = Math.max(0.05, outerRadius - thicknessWorld);

    const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 6, 1, Math.PI / 6);
    ringGeo.rotateX(-Math.PI * 0.5);

    const borderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.borderColor),
      side: THREE.DoubleSide,
      depthTest: true,
    });

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        let terrain: TerrainType = TerrainType.PLAIN;
        if (this.getTerrain) {
          terrain = this.getTerrain(x, y);
        } else if (typeof (this.hexMap as any).getTerrain === 'function') {
          terrain = (this.hexMap as any).getTerrain(x, y);
        }

        let elevation = 0;
        if (terrain === TerrainType.WATER) elevation = -0.08;
        else if (terrain === TerrainType.HILL) elevation = 0.25;
        else if (terrain === TerrainType.SWAMP) elevation = -0.04;
        else if (terrain === TerrainType.MOUNTAIN) elevation = 0.50;

        const borderMesh = new THREE.Mesh(ringGeo, borderMat);
        const pos = this.hexToWorld(x, y);
        borderMesh.position.set(pos.x, pos.y + elevation + 0.003, pos.z);
        this.gridBordersGroup.add(borderMesh);
      }
    }
    this.gridBordersGroup.visible = this.showGrid;
  }

  private createHighlightHexMesh(colorHex: number, opacity: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(this.hexRadius * 0.98, this.hexRadius * 0.98, 0.04, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createRingMesh(colorHex: number): THREE.Mesh {
    const geo = new THREE.RingGeometry(this.hexRadius * 0.75, this.hexRadius * 0.95, 6, 1, Math.PI / 6);
    geo.rotateX(-Math.PI * 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  public setHoverHex(coords: Coords | null): void {
    if (!coords) {
      this.hoverMesh.visible = false;
      return;
    }
    const worldPos = this.hexToWorld(coords.x, coords.y);
    this.hoverMesh.position.set(worldPos.x, 0.03, worldPos.z);
    this.hoverMesh.visible = true;
  }

  public setSelectedUnitHex(coords: Coords | null, facing?: HexDirection): void {
    if (!coords) {
      this.selectedRingMesh.visible = false;
      this.facingIndicatorGroup.visible = false;
      return;
    }

    const worldPos = this.hexToWorld(coords.x, coords.y);
    this.selectedRingMesh.position.set(worldPos.x, 0.02, worldPos.z);
    this.selectedRingMesh.visible = true;

    if (facing !== undefined && facing !== HexDirection.NONE) {
      this.updateFacingIndicator(worldPos, facing);
    } else {
      this.facingIndicatorGroup.visible = false;
    }
  }

  private updateFacingIndicator(worldPos: THREE.Vector3, facing: HexDirection): void {
    while (this.facingIndicatorGroup.children.length > 0) {
      const child = this.facingIndicatorGroup.children[0];
      this.facingIndicatorGroup.remove(child);
    }

    const arrowGeo = new THREE.ConeGeometry(0.18, 0.4, 3);
    arrowGeo.rotateX(Math.PI * 0.5);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);

    // Position arrow on outer edge of hex in facing direction (pointy-topped)
    const angleMap: Record<HexDirection, number> = {
      [HexDirection.EAST]: 0,
      [HexDirection.SOUTHEAST]: Math.PI / 6,
      [HexDirection.SOUTHWEST]: (5 * Math.PI) / 6,
      [HexDirection.WEST]: Math.PI,
      [HexDirection.NORTHWEST]: (7 * Math.PI) / 6,
      [HexDirection.NORTHEAST]: (11 * Math.PI) / 6,
      [HexDirection.NONE]: 0,
    };
    const angle = angleMap[facing] ?? 0;
    const dist = this.hexRadius * 0.72;

    arrowMesh.position.set(Math.cos(angle) * dist, 0.04, Math.sin(angle) * dist);
    arrowMesh.rotation.y = -angle + Math.PI * 0.5;

    this.facingIndicatorGroup.position.copy(worldPos);
    this.facingIndicatorGroup.add(arrowMesh);
    this.facingIndicatorGroup.visible = true;
  }

  /**
   * Highlights walkable and attackable tiles.
   */
  public updateReachOverlays(walkableCells: Coords[], attackableCells: Coords[]): void {
    // Clear existing overlays
    this.overlayMeshes.forEach((mesh) => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.overlayMeshes.clear();

    // Walkable (Cyan / Soft Blue)
    walkableCells.forEach((c) => {
      const key = `${c.x},${c.y}`;
      const mesh = this.createHighlightHexMesh(0x33aacc, 0.28);
      const pos = this.hexToWorld(c.x, c.y);
      mesh.position.set(pos.x, 0.015, pos.z);
      this.group.add(mesh);
      this.overlayMeshes.set(key, mesh);
    });

    // Attackable (Orange / Red)
    attackableCells.forEach((c) => {
      const key = `atk_${c.x},${c.y}`;
      const mesh = this.createHighlightHexMesh(0xee4433, 0.38);
      const pos = this.hexToWorld(c.x, c.y);
      mesh.position.set(pos.x, 0.02, pos.z);
      this.group.add(mesh);
      this.overlayMeshes.set(key, mesh);
    });
  }

  public clearReachOverlays(): void {
    this.updateReachOverlays([], []);
  }

  public worldVectorToHexDirection(dx: number, dz: number): HexDirection {
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) return HexDirection.NONE;

    let angle = Math.atan2(dz, dx);
    if (angle < 0) angle += Math.PI * 2;

    const deg = (angle * 180) / Math.PI;

    if (deg >= 30 && deg < 90) return HexDirection.SOUTHEAST;
    if (deg >= 90 && deg < 150) return HexDirection.SOUTHWEST;
    if (deg >= 150 && deg < 210) return HexDirection.WEST;
    if (deg >= 210 && deg < 270) return HexDirection.NORTHWEST;
    if (deg >= 270 && deg < 330) return HexDirection.NORTHEAST;
    return HexDirection.EAST;
  }

  public getHexElevation(x: number, y: number): number {
    let terrain: TerrainType = TerrainType.PLAIN;
    if (this.getTerrain) {
      terrain = this.getTerrain(x, y);
    }
    if (terrain === TerrainType.WATER) return -0.08;
    if (terrain === TerrainType.HILL) return 0.25;
    if (terrain === TerrainType.SWAMP) return -0.04;
    if (terrain === TerrainType.MOUNTAIN) return 0.50;
    return 0;
  }

  public setAttackPreview(
    targetCoords: Coords,
    originCoords: Coords | null,
    flankStatus: HexFlankStatus = HexFlankStatus.NONE
  ): void {
    this.clearAttackPreview();

    // Determine color based on flank status
    let colorHex = 0xee3333; // Normal: Crimson
    let pulseColor = 0xff6666;
    if (flankStatus === HexFlankStatus.BACKSTAB) {
      colorHex = 0xff6600; // Backstab: Vibrant Orange-Gold
      pulseColor = 0xffaa22;
    } else if (flankStatus === HexFlankStatus.FLANK) {
      colorHex = 0xffbb00; // Flank: Yellow-Amber
      pulseColor = 0xffee44;
    }

    // 1. Highlight target enemy hex
    const targetWorld = this.hexToWorld(targetCoords.x, targetCoords.y);
    const targetElev = this.getHexElevation(targetCoords.x, targetCoords.y);

    if (!originCoords) {
      // Ranged Target Reticle: Double ring with targeting brackets
      const targetRing = this.createRingMesh(0xee2222);
      targetRing.position.set(targetWorld.x, targetWorld.y + targetElev + 0.03, targetWorld.z);
      this.attackPreviewGroup.add(targetRing);

      const innerRingGeo = new THREE.RingGeometry(this.hexRadius * 0.35, this.hexRadius * 0.45, 16);
      innerRingGeo.rotateX(-Math.PI * 0.5);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide });
      const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRingMesh.position.set(targetWorld.x, targetWorld.y + targetElev + 0.035, targetWorld.z);
      this.attackPreviewGroup.add(innerRingMesh);
    } else {
      // Melee Target Ring
      const targetRing = this.createRingMesh(colorHex);
      targetRing.position.set(targetWorld.x, targetWorld.y + targetElev + 0.025, targetWorld.z);
      this.attackPreviewGroup.add(targetRing);

      // 2. Highlight the origin approach tile and draw a 3D arrow towards target
      const originWorld = this.hexToWorld(originCoords.x, originCoords.y);
      const originElev = this.getHexElevation(originCoords.x, originCoords.y);

      // Origin hex highlight
      const originHexMesh = this.createHighlightHexMesh(colorHex, 0.45);
      originHexMesh.position.set(originWorld.x, originWorld.y + originElev + 0.02, originWorld.z);
      this.attackPreviewGroup.add(originHexMesh);

      // Directional 3D Arrow pointing from origin to target
      const dirX = targetWorld.x - originWorld.x;
      const dirZ = targetWorld.z - originWorld.z;
      const angle = Math.atan2(dirZ, dirX);

      const arrowGroup = new THREE.Group();

      // Arrow cone head pointing along +X initially
      const coneGeo = new THREE.ConeGeometry(0.24, 0.48, 8);
      coneGeo.rotateZ(-Math.PI * 0.5);
      const coneMat = new THREE.MeshBasicMaterial({ color: pulseColor });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.set(this.hexRadius * 0.42, 0, 0);
      arrowGroup.add(coneMesh);

      // Arrow shaft
      const shaftGeo = new THREE.BoxGeometry(0.38, 0.05, 0.14);
      const shaftMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      shaftMesh.position.set(this.hexRadius * 0.15, 0, 0);
      arrowGroup.add(shaftMesh);

      arrowGroup.rotation.y = -angle;
      arrowGroup.position.set(originWorld.x, originWorld.y + originElev + 0.04, originWorld.z);
      this.attackPreviewGroup.add(arrowGroup);
    }

    this.attackPreviewGroup.visible = true;
  }

  public clearAttackPreview(): void {
    while (this.attackPreviewGroup.children.length > 0) {
      const child = this.attackPreviewGroup.children[0] as THREE.Mesh;
      this.attackPreviewGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }
    this.attackPreviewGroup.visible = false;
  }

  public setPathPreview(path: Coords[]): void {
    this.clearPathPreview();
    if (!path || path.length <= 1) return;

    const linePoints: THREE.Vector3[] = [];

    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      const pos = this.hexToWorld(pt.x, pt.y);
      const elev = this.getHexElevation(pt.x, pt.y);
      const nodePos = new THREE.Vector3(pos.x, pos.y + elev + 0.04, pos.z);
      linePoints.push(nodePos);

      // Waypoint markers for intermediate & destination tiles (after start)
      if (i > 0) {
        const isEnd = i === path.length - 1;
        const radius = isEnd ? 0.26 : 0.18;
        const colorHex = isEnd ? 0x00ffcc : 0x00d4ff;

        // Waypoint disc
        const discGeo = new THREE.CylinderGeometry(radius, radius, 0.05, 12);
        const discMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.9,
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        discMesh.position.copy(nodePos);
        this.pathPreviewGroup.add(discMesh);

        // Glowing core dot
        const coreGeo = new THREE.SphereGeometry(radius * 0.45, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.set(nodePos.x, nodePos.y + 0.03, nodePos.z);
        this.pathPreviewGroup.add(coreMesh);

        // Destination ring
        if (isEnd) {
          const endRingGeo = new THREE.RingGeometry(this.hexRadius * 0.45, this.hexRadius * 0.65, 16);
          endRingGeo.rotateX(-Math.PI * 0.5);
          const endRingMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          });
          const endRingMesh = new THREE.Mesh(endRingGeo, endRingMat);
          endRingMesh.position.set(nodePos.x, nodePos.y + 0.01, nodePos.z);
          this.pathPreviewGroup.add(endRingMesh);
        }
      }
    }

    // Connecting Trail Line
    if (linePoints.length >= 2) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.95,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      this.pathPreviewGroup.add(lineMesh);
    }

    this.pathPreviewGroup.visible = true;
  }

  public clearPathPreview(): void {
    while (this.pathPreviewGroup.children.length > 0) {
      const child = this.pathPreviewGroup.children[0] as THREE.Mesh;
      this.pathPreviewGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }
    this.pathPreviewGroup.visible = false;
  }

  public dispose(): void {
    this.tileMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    while (this.gridBordersGroup.children.length > 0) {
      const child = this.gridBordersGroup.children[0] as THREE.Mesh;
      this.gridBordersGroup.remove(child);
      child.geometry?.dispose();
    }
    while (this.coordsGroup.children.length > 0) {
      const child = this.coordsGroup.children[0] as THREE.Mesh;
      this.coordsGroup.remove(child);
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).map?.dispose();
            m.dispose();
          });
        } else {
          ((child.material as THREE.MeshBasicMaterial).map)?.dispose();
          child.material.dispose();
        }
      }
    }
    this.clearReachOverlays();
    this.clearAttackPreview();
    this.clearPathPreview();
  }
}
