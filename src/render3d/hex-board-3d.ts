import * as THREE from 'three';
import { HexDirection, HexMap } from '../shared/hex-map';
import { Coords } from '../shared';
import { TerrainType } from '../battle/terrain-types';

export class HexBoard3D {
  public readonly group: THREE.Group = new THREE.Group();
  public readonly hexMap: HexMap;

  // Hex dimensions in 3D
  public readonly hexRadius: number = 1.0;
  public readonly hexHeight: number = 0.25;

  private tileMeshes: Map<string, THREE.Mesh> = new Map();
  private overlayMeshes: Map<string, THREE.Mesh> = new Map();
  private gridBordersGroup: THREE.Group = new THREE.Group();
  private hoverMesh: THREE.Mesh;
  private selectedRingMesh: THREE.Mesh;
  private facingIndicatorGroup: THREE.Group = new THREE.Group();

  private showGrid: boolean = true;
  private borderThickness: number = 2.5;
  private borderColor: string = '#000000';

  private materials: Record<string, THREE.Material> = {};
  private sideMaterial: THREE.Material = new THREE.MeshStandardMaterial({
    color: 0x33281e,
    roughness: 0.9,
    metalness: 0.1,
  });

  constructor(
    hexMap: HexMap,
    options?: { showGrid?: boolean; borderThickness?: number; borderColor?: string }
  ) {
    this.hexMap = hexMap;
    if (options?.showGrid !== undefined) this.showGrid = options.showGrid;
    if (options?.borderThickness !== undefined) this.borderThickness = options.borderThickness;
    if (options?.borderColor !== undefined) this.borderColor = options.borderColor;

    this.initMaterials();

    this.hoverMesh = this.createHighlightHexMesh(0xffffff, 0.4);
    this.hoverMesh.visible = false;
    this.group.add(this.hoverMesh);

    this.selectedRingMesh = this.createRingMesh(0xffcc00);
    this.selectedRingMesh.visible = false;
    this.group.add(this.selectedRingMesh);

    this.group.add(this.facingIndicatorGroup);
    this.group.add(this.gridBordersGroup);

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
    imageSrc: string = 'hex_terrain.png',
    jsonSrc: string = 'hex_terrain.json'
  ): Promise<void> {
    if (typeof document === 'undefined') return;

    try {
      const resp = await fetch(jsonSrc);
      const json = await resp.json();
      const frames = json.frames;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = (err) => reject(err);
        }
      });

      const createTerrainTexture = (frameKey: string) => {
        const f = frames[frameKey]?.frame;
        if (!f) return null;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, 128, 128);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        return texture;
      };

      const terrain1 = createTerrainTexture('terrain_1.png');
      const terrain2 = createTerrainTexture('terrain_2.png');
      const terrain3 = createTerrainTexture('terrain_3.png');
      const terrain4 = createTerrainTexture('terrain_4.png');
      const terrain5 = createTerrainTexture('terrain_5.png');

      if (terrain1) this.materials['grass'] = new THREE.MeshStandardMaterial({ map: terrain1, roughness: 0.8 });
      if (terrain2) this.materials['forest'] = new THREE.MeshStandardMaterial({ map: terrain2, roughness: 0.8 });
      if (terrain3) this.materials['dirt'] = new THREE.MeshStandardMaterial({ map: terrain3, roughness: 0.85 });
      if (terrain4) this.materials['swamp'] = new THREE.MeshStandardMaterial({ map: terrain4, roughness: 0.85 });
      if (terrain5) this.materials['water'] = new THREE.MeshStandardMaterial({ map: terrain5, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 });

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
   */
  public hexToWorld(x: number, y: number): THREE.Vector3 {
    // Pointy-topped / flat-topped matching HexMap layout
    const widthSpacing = this.hexRadius * 1.5;
    const heightSpacing = this.hexRadius * Math.sqrt(3);

    const worldX = (x - (this.hexMap.width - 1) * 0.5) * widthSpacing;
    const worldZ = (y + (x % 2) * 0.5 - (this.hexMap.height - 1) * 0.5) * heightSpacing;

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
    // Rotate so edges match the grid orientation
    hexGeometry.rotateY(Math.PI / 6);

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        let terrain: TerrainType = TerrainType.PLAIN;
        if (typeof (this.hexMap as any).getTerrain === 'function') {
          terrain = (this.hexMap as any).getTerrain(x, y);
        }

        let elevation = 0;
        if (terrain === TerrainType.WATER) {
          elevation = -0.08;
        } else if (terrain === TerrainType.HILL) {
          elevation = 0.12;
        } else if (terrain === TerrainType.SWAMP) {
          elevation = -0.04;
        } else if (terrain === TerrainType.MOUNTAIN) {
          elevation = 0.25;
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

    const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 6);
    ringGeo.rotateX(-Math.PI * 0.5);
    ringGeo.rotateY(Math.PI / 6);

    const borderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.borderColor),
      side: THREE.DoubleSide,
      depthTest: true,
    });

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        let terrain: TerrainType = TerrainType.PLAIN;
        if (typeof (this.hexMap as any).getTerrain === 'function') {
          terrain = (this.hexMap as any).getTerrain(x, y);
        }

        let elevation = 0;
        if (terrain === TerrainType.WATER) elevation = -0.08;
        else if (terrain === TerrainType.HILL) elevation = 0.12;
        else if (terrain === TerrainType.SWAMP) elevation = -0.04;
        else if (terrain === TerrainType.MOUNTAIN) elevation = 0.25;

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
    geo.rotateY(Math.PI / 6);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createRingMesh(colorHex: number): THREE.Mesh {
    const geo = new THREE.RingGeometry(this.hexRadius * 0.75, this.hexRadius * 0.95, 6);
    geo.rotateX(-Math.PI * 0.5);
    geo.rotateY(Math.PI / 6);
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

    // Position arrow on outer edge of hex in facing direction
    const angleMap: Record<HexDirection, number> = {
      [HexDirection.EAST]: 0,
      [HexDirection.SOUTHEAST]: Math.PI / 3,
      [HexDirection.SOUTHWEST]: (2 * Math.PI) / 3,
      [HexDirection.WEST]: Math.PI,
      [HexDirection.NORTHWEST]: (4 * Math.PI) / 3,
      [HexDirection.NORTHEAST]: (5 * Math.PI) / 3,
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

  public dispose(): void {
    this.tileMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    this.clearReachOverlays();
  }
}
