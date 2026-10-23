import * as THREE from 'three';
import { HexDirection, HexFlankStatus, HexMap, HexMapHelpers } from '../shared/hex-map';
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
  public freezePreviews: boolean = false;

  private hillClusters: Map<string, number> = new Map();
  private clusterElevations: Map<number, number> = new Map();
  private hillMesaRadii: Map<string, number> = new Map();

  private materials: Record<string, THREE.Material> = {};
  private sideMaterial: THREE.Material = new THREE.MeshStandardMaterial({
    color: 0x33281e,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
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

    this.group.name = 'HexBoard';
    this.facingIndicatorGroup.name = 'FacingIndicator';
    this.attackPreviewGroup.name = 'AttackPreview';
    this.pathPreviewGroup.name = 'PathPreview';
    this.gridBordersGroup.name = 'GridBorders';
    this.coordsGroup.name = 'CoordsLabels';

    this.hoverMesh = this.createHighlightHexMesh(0xffffff, 0.4);
    this.hoverMesh.name = 'TileHoverMesh';
    this.hoverMesh.visible = false;
    this.group.add(this.hoverMesh);

    this.selectedRingMesh = this.createRingMesh(0xffcc00);
    this.selectedRingMesh.name = 'TileSelectedRing';
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
      side: THREE.DoubleSide,
    });
    this.materials['water'] = new THREE.MeshStandardMaterial({
      color: 0x2266aa,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
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

      const [grassTex, forestTex, dirtTex, swampTex, waterTex] = await Promise.all([
        loadTex(`${basePath}grass.jpg`),
        loadTex(`${basePath}forest.jpg`),
        loadTex(`${basePath}dirt.jpg`),
        loadTex(`${basePath}swamp.jpg`),
        loadTex(`${basePath}water.jpg`),
      ]);

      this.materials['grass'] = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.8 });
      this.materials['forest'] = new THREE.MeshStandardMaterial({ map: forestTex, roughness: 0.85 });
      this.materials['dirt'] = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.9, side: THREE.DoubleSide });
      this.materials['swamp'] = new THREE.MeshStandardMaterial({ map: swampTex, roughness: 0.85, metalness: 0.05 });
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
    }

    return [this.sideMaterial, topMat, this.sideMaterial];
  }

  public isHill(x: number, y: number): boolean {
    let terrain: TerrainType = TerrainType.PLAIN;
    if (this.getTerrain) {
      terrain = this.getTerrain(x, y);
    } else if (typeof (this.hexMap as any).getTerrain === 'function') {
      terrain = (this.hexMap as any).getTerrain(x, y);
    }
    return terrain === TerrainType.HILL;
  }

  public getHillMesaRadius(x: number, y: number): number {
    return this.hillMesaRadii.get(`${x},${y}`) ?? this.hexRadius * 0.77;
  }

  /**
   * Clusters connected adjacent hills together via BFS and assigns
   * uniform elevation across each connected hill cluster to ensure
   * continuous ridge elevation with no downward/upward dip.
   */
  private computeHillClusters(): void {
    this.hillClusters.clear();
    this.clusterElevations.clear();
    this.hillMesaRadii.clear();

    let nextClusterId = 1;
    const visited = new Set<string>();

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        if (this.isHill(x, y)) {
          const clusterId = nextClusterId++;
          const queue: Coords[] = [{ x, y }];
          visited.add(key);
          this.hillClusters.set(key, clusterId);

          while (queue.length > 0) {
            const curr = queue.shift()!;
            for (let d = 1; d <= 6; d++) {
              const nextCoord = HexMapHelpers.directionCoordsMap[d as HexDirection]?.(curr);
              if (!nextCoord) continue;
              if (
                nextCoord.x >= 0 &&
                nextCoord.x < this.hexMap.width &&
                nextCoord.y >= 0 &&
                nextCoord.y < this.hexMap.height
              ) {
                const nKey = `${nextCoord.x},${nextCoord.y}`;
                if (!visited.has(nKey) && this.isHill(nextCoord.x, nextCoord.y)) {
                  visited.add(nKey);
                  this.hillClusters.set(nKey, clusterId);
                  queue.push(nextCoord);
                }
              }
            }
          }

          // Deterministic uniform elevation for all hills in this connected cluster (0.28 to 0.35)
          const clusterHash = ((clusterId * 2654435761) >>> 0) % 1000;
          const elevation = 0.29 + (clusterHash / 1000) * 0.06;
          this.clusterElevations.set(clusterId, elevation);
        }
      }
    }

    // Precompute mesa plateau radius per hill tile with subtle variation (20% larger: ~0.744 to 0.804 * hexRadius)
    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        if (this.isHill(x, y)) {
          const tileHash = (((x * 374761393 + y * 668265263) >>> 0) % 1000) / 1000;
          const rTop = this.hexRadius * (0.744 + tileHash * 0.06);
          this.hillMesaRadii.set(`${x},${y}`, rTop);
        }
      }
    }
  }

  /**
   * Generates a procedural mesa hill geometry with:
   * 1. Flat top mesa plateau of radius rTop at cluster elevation for unit placement.
   * 2. Full plateau extension along shared boundaries with adjacent hills (seamless ridge).
   * 3. Multi-tier organic slopes descending to y = 0 on non-hill edges.
   * 4. Vertical bluff/cliff sealing quads at transition corners.
   * 5. Subterranean foundation skirts below y = 0 to match neighboring tile skirts.
   * 6. Computed smooth vertex normals for natural hill lighting.
   */
  private createHillTileGeometry(x: number, y: number): THREE.BufferGeometry {
    const elevation = this.getHexElevation(x, y);
    const rTop = this.getHillMesaRadius(x, y);
    const R = this.hexRadius;
    const skirtBottom = -this.hexHeight;

    // Check which of the 6 edges border another hill
    const isHillNeighbor: boolean[] = [];
    const edgeDirections: HexDirection[] = [
      HexDirection.EAST,       // Edge 0: Corner 5 (330°) to Corner 0 (30°)
      HexDirection.SOUTHEAST,  // Edge 1: Corner 0 (30°) to Corner 1 (90°)
      HexDirection.SOUTHWEST,  // Edge 2: Corner 1 (90°) to Corner 2 (150°)
      HexDirection.WEST,       // Edge 3: Corner 2 (150°) to Corner 3 (210°)
      HexDirection.NORTHWEST,  // Edge 4: Corner 3 (210°) to Corner 4 (270°)
      HexDirection.NORTHEAST,  // Edge 5: Corner 4 (270°) to Corner 5 (330°)
    ];

    for (let e = 0; e < 6; e++) {
      const dir = edgeDirections[e];
      const neighborCoord = HexMapHelpers.directionCoordsMap[dir]?.({ x, y });
      let neighborIsHill = false;
      if (
        neighborCoord &&
        neighborCoord.x >= 0 &&
        neighborCoord.x < this.hexMap.width &&
        neighborCoord.y >= 0 &&
        neighborCoord.y < this.hexMap.height
      ) {
        neighborIsHill = this.isHill(neighborCoord.x, neighborCoord.y);
      }
      isHillNeighbor.push(neighborIsHill);
    }

    // Corner angles for pointy-topped hex: 30°, 90°, 150°, 210°, 270°, 330°
    const cosK: number[] = [];
    const sinK: number[] = [];
    for (let k = 0; k < 6; k++) {
      const angle = ((k * 60 + 30) * Math.PI) / 180;
      cosK.push(Math.cos(angle));
      sinK.push(Math.sin(angle));
    }

    const topIndices: number[] = [];
    const skirtIndices: number[] = [];
    const positions: number[] = [];
    const uvs: number[] = [];

    const addVertex = (px: number, py: number, pz: number, u?: number, v?: number): number => {
      const idx = positions.length / 3;
      positions.push(px, py, pz);
      if (u !== undefined && v !== undefined) {
        uvs.push(u, v);
      } else {
        uvs.push(px / (2 * R) + 0.5, pz / (2 * R) + 0.5);
      }
      return idx;
    };

    const addTopTriangle = (i1: number, i2: number, i3: number) => {
      topIndices.push(i1, i2, i3);
    };

    const addSkirtTriangle = (i1: number, i2: number, i3: number) => {
      skirtIndices.push(i1, i2, i3);
    };

    // 1. Center of the mesa top plateau
    const vCenter = addVertex(0, elevation, 0);

    // 2. Inner mesa hexagon vertices (at rTop, height = elevation)
    const topK: number[] = [];
    for (let k = 0; k < 6; k++) {
      topK.push(addVertex(cosK[k] * rTop, elevation, sinK[k] * rTop));
    }

    // Mesa top center fan (6 triangles, upward facing normals)
    for (let k = 0; k < 6; k++) {
      addTopTriangle(vCenter, topK[(k + 1) % 6], topK[k]);
    }

    // 3. For each edge e = 0..5:
    // Start corner c1 = (e + 5) % 6, end corner c2 = e
    for (let e = 0; e < 6; e++) {
      const c1 = (e + 5) % 6;
      const c2 = e;
      const isHill = isHillNeighbor[e];

      if (isHill) {
        // Connected to an adjacent hill: flat plateau extends to hex boundary at elevation
        const b1High = addVertex(cosK[c1] * R, elevation, sinK[c1] * R);
        const b2High = addVertex(cosK[c2] * R, elevation, sinK[c2] * R);

        // Quad between [topK[c1], topK[c2]] and [b1High, b2High]
        addTopTriangle(topK[c1], topK[c2], b2High);
        addTopTriangle(topK[c1], b2High, b1High);
      } else {
        // Bordering non-hill: natural slope descending to y = 0 at hex boundary
        const rMid = (rTop + R) * 0.5;
        const yMid = elevation * 0.44;

        // Subtle deterministic organic variation on mid-tier slope points
        const seed1 = (((x * 127 + y * 311 + e * 73) * 16807) >>> 0) % 1000;
        const seed2 = (((x * 241 + y * 563 + e * 97) * 16807) >>> 0) % 1000;
        const var1 = (seed1 / 1000 - 0.5) * 0.03;
        const var2 = (seed2 / 1000 - 0.5) * 0.03;

        const m1 = addVertex(
          cosK[c1] * rMid * (1 + var1),
          yMid + var1 * 0.2 * elevation,
          sinK[c1] * rMid * (1 + var1)
        );
        const m2 = addVertex(
          cosK[c2] * rMid * (1 + var2),
          yMid + var2 * 0.2 * elevation,
          sinK[c2] * rMid * (1 + var2)
        );

        const b1Low = addVertex(cosK[c1] * R, 0, sinK[c1] * R);
        const b2Low = addVertex(cosK[c2] * R, 0, sinK[c2] * R);

        // Upper slope tier (from topK to m)
        addTopTriangle(topK[c1], topK[c2], m2);
        addTopTriangle(topK[c1], m2, m1);

        // Lower slope tier (from m to bLow)
        addTopTriangle(m1, m2, b2Low);
        addTopTriangle(m1, b2Low, b1Low);

        // Subterranean foundation skirt below y = 0 down to skirtBottom
        const s1 = addVertex(cosK[c1] * R * 0.97, skirtBottom, sinK[c1] * R * 0.97);
        const s2 = addVertex(cosK[c2] * R * 0.97, skirtBottom, sinK[c2] * R * 0.97);

        addSkirtTriangle(b1Low, b2Low, s2);
        addSkirtTriangle(b1Low, s2, s1);
      }
    }

    // 4. Transitions at corners where hill-neighbor edge meets non-hill-neighbor edge
    for (let k = 0; k < 6; k++) {
      const ePrev = k;
      const eNext = (k + 1) % 6;
      const prevIsHill = isHillNeighbor[ePrev];
      const nextIsHill = isHillNeighbor[eNext];

      if (prevIsHill && !nextIsHill) {
        // Corner k: ePrev is high plateau, eNext is sloping down
        const bHigh = addVertex(cosK[k] * R, elevation, sinK[k] * R);
        const bLow = addVertex(cosK[k] * R, 0, sinK[k] * R);
        // Cliff face sealing the transition
        addTopTriangle(topK[k], bLow, bHigh);
      } else if (!prevIsHill && nextIsHill) {
        // Corner k: ePrev is sloping down, eNext is high plateau
        const bLow = addVertex(cosK[k] * R, 0, sinK[k] * R);
        const bHigh = addVertex(cosK[k] * R, elevation, sinK[k] * R);
        // Cliff face sealing the transition
        addTopTriangle(topK[k], bHigh, bLow);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const combinedIndices = [...topIndices, ...skirtIndices];
    geometry.setIndex(combinedIndices);

    // Group 1: Plateau top, slopes, and cliffs using materialIndex = 1 (dirt terrain material)
    geometry.addGroup(0, topIndices.length, 1);
    // Group 0: Foundation skirt below y=0 using materialIndex = 0 (side material)
    if (skirtIndices.length > 0) {
      geometry.addGroup(topIndices.length, skirtIndices.length, 0);
    }

    // Compute smooth normals across terrain slopes
    geometry.computeVertexNormals();

    return geometry;
  }

  private buildBoard(): void {
    this.computeHillClusters();

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

        const tileMaterials = this.getTileMaterials(terrain);
        const pos = this.hexToWorld(x, y);

        let mesh: THREE.Mesh;
        if (terrain === TerrainType.HILL) {
          const hillGeometry = this.createHillTileGeometry(x, y);
          mesh = new THREE.Mesh(hillGeometry, tileMaterials);
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.receiveShadow = true;
          mesh.userData = { hexX: x, hexY: y, isHexTile: true };

          // Crease wireframe outlining the mesa plateau rim
          const edges = new THREE.EdgesGeometry(hillGeometry, 25);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x182a20, transparent: true, opacity: 0.6 })
          );
          mesh.add(line);
        } else {
          let elevation = 0;
          if (terrain === TerrainType.WATER) {
            elevation = -0.08;
          } else if (terrain === TerrainType.SWAMP) {
            elevation = -0.04;
          }

          mesh = new THREE.Mesh(hexGeometry, tileMaterials);
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
        }

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
        const elevation = this.getHexElevation(x, y);

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
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
        const isHill = this.isHill(x, y);
        const elevation = this.getHexElevation(x, y);
        const pos = this.hexToWorld(x, y);

        if (isHill) {
          // On hill mesa, border outlines the smaller playable mesa hexagon
          const rTop = this.getHillMesaRadius(x, y);
          const hillOuter = rTop * 0.995;
          const hillInner = Math.max(0.05, hillOuter - thicknessWorld);
          const hillRingGeo = new THREE.RingGeometry(hillInner, hillOuter, 6, 1, Math.PI / 6);
          hillRingGeo.rotateX(-Math.PI * 0.5);

          const hillBorderMesh = new THREE.Mesh(hillRingGeo, borderMat);
          hillBorderMesh.position.set(pos.x, pos.y + elevation + 0.003, pos.z);
          this.gridBordersGroup.add(hillBorderMesh);
        } else {
          const borderMesh = new THREE.Mesh(ringGeo, borderMat);
          borderMesh.position.set(pos.x, pos.y + elevation + 0.003, pos.z);
          this.gridBordersGroup.add(borderMesh);
        }
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
    const elev = this.getHexElevation(coords.x, coords.y);
    const isHill = this.isHill(coords.x, coords.y);
    const scale = isHill ? this.getHillMesaRadius(coords.x, coords.y) / (this.hexRadius * 0.98) : 1.0;
    this.hoverMesh.scale.set(scale, 1, scale);
    this.hoverMesh.position.set(worldPos.x, elev + 0.03, worldPos.z);
    this.hoverMesh.visible = true;
  }

  public setSelectedUnitHex(coords: Coords | null, facing?: HexDirection): void {
    if (!coords) {
      this.selectedRingMesh.visible = false;
      this.facingIndicatorGroup.visible = false;
      return;
    }

    const worldPos = this.hexToWorld(coords.x, coords.y);
    const elev = this.getHexElevation(coords.x, coords.y);
    const isHill = this.isHill(coords.x, coords.y);
    const scale = isHill ? this.getHillMesaRadius(coords.x, coords.y) / (this.hexRadius * 0.95) : 1.0;
    this.selectedRingMesh.scale.set(scale, 1, scale);
    this.selectedRingMesh.position.set(worldPos.x, elev + 0.02, worldPos.z);
    this.selectedRingMesh.visible = true;

    if (facing !== undefined && facing !== HexDirection.NONE) {
      const topWorldPos = new THREE.Vector3(worldPos.x, elev, worldPos.z);
      this.updateFacingIndicator(topWorldPos, facing, isHill ? this.getHillMesaRadius(coords.x, coords.y) : undefined);
    } else {
      this.facingIndicatorGroup.visible = false;
    }
  }

  private updateFacingIndicator(worldPos: THREE.Vector3, facing: HexDirection, mesaRadius?: number): void {
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
    const baseRadius = mesaRadius ?? this.hexRadius;
    const dist = baseRadius * 0.72;

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
      mesh.name = `Reach_Walkable[${c.x},${c.y}]`;
      const pos = this.hexToWorld(c.x, c.y);
      const elev = this.getHexElevation(c.x, c.y);
      const isHill = this.isHill(c.x, c.y);
      if (isHill) {
        const scale = this.getHillMesaRadius(c.x, c.y) / (this.hexRadius * 0.98);
        mesh.scale.set(scale, 1, scale);
      }
      mesh.position.set(pos.x, elev + 0.015, pos.z);
      this.group.add(mesh);
      this.overlayMeshes.set(key, mesh);
    });

    // Attackable (Orange / Red)
    attackableCells.forEach((c) => {
      const key = `atk_${c.x},${c.y}`;
      const mesh = this.createHighlightHexMesh(0xee4433, 0.38);
      mesh.name = `Reach_Attackable[${c.x},${c.y}]`;
      const pos = this.hexToWorld(c.x, c.y);
      const elev = this.getHexElevation(c.x, c.y);
      const isHill = this.isHill(c.x, c.y);
      if (isHill) {
        const scale = this.getHillMesaRadius(c.x, c.y) / (this.hexRadius * 0.98);
        mesh.scale.set(scale, 1, scale);
      }
      mesh.position.set(pos.x, elev + 0.02, pos.z);
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
    } else if (typeof (this.hexMap as any).getTerrain === 'function') {
      terrain = (this.hexMap as any).getTerrain(x, y);
    }
    if (terrain === TerrainType.WATER) return -0.08;
    if (terrain === TerrainType.HILL) {
      const clusterId = this.hillClusters.get(`${x},${y}`);
      if (clusterId !== undefined) {
        return this.clusterElevations.get(clusterId) ?? 0.32;
      }
      return 0.32;
    }
    if (terrain === TerrainType.SWAMP) return -0.04;
    return 0;
  }

  /**
   * Returns a subtle front-back (Z) offset for units sitting on adjacent hexes
   * (especially on the same horizontal East-West row) to prevent billboard z-fighting and clipping.
   */
  public getUnitFrontBackOffset(x: number, y: number): number {
    return (x % 2 === 0 ? 0.035 : -0.035) + (y % 2 === 0 ? 0.015 : -0.015);
  }

  public hexToWorldWithElevation(x: number, y: number, offsetForUnit: boolean = false): THREE.Vector3 {
    const v = this.hexToWorld(x, y);
    v.y = this.getHexElevation(x, y);
    if (offsetForUnit) {
      v.z += this.getUnitFrontBackOffset(x, y);
    }
    return v;
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
      targetRing.name = `Ranged_Target_OuterRing[${targetCoords.x},${targetCoords.y}]`;
      targetRing.position.set(targetWorld.x, targetWorld.y + targetElev + 0.03, targetWorld.z);
      this.attackPreviewGroup.add(targetRing);

      const innerRingGeo = new THREE.RingGeometry(this.hexRadius * 0.35, this.hexRadius * 0.45, 16);
      innerRingGeo.rotateX(-Math.PI * 0.5);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide });
      const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRingMesh.name = `Ranged_Target_InnerRing[${targetCoords.x},${targetCoords.y}]`;
      innerRingMesh.position.set(targetWorld.x, targetWorld.y + targetElev + 0.035, targetWorld.z);
      this.attackPreviewGroup.add(innerRingMesh);
    } else {
      // Melee Target Ring
      const targetRing = this.createRingMesh(colorHex);
      targetRing.name = `Attack_Target_Ring[${targetCoords.x},${targetCoords.y}]`;
      targetRing.position.set(targetWorld.x, targetWorld.y + targetElev + 0.025, targetWorld.z);
      this.attackPreviewGroup.add(targetRing);

      // 2. Highlight the origin approach tile and draw a 3D arrow towards target
      const originWorld = this.hexToWorld(originCoords.x, originCoords.y);
      const originElev = this.getHexElevation(originCoords.x, originCoords.y);

      // Origin hex highlight
      const originHexMesh = this.createHighlightHexMesh(colorHex, 0.45);
      originHexMesh.name = `Attack_Origin_Hex[${originCoords.x},${originCoords.y}]`;
      originHexMesh.position.set(originWorld.x, originWorld.y + originElev + 0.02, originWorld.z);
      this.attackPreviewGroup.add(originHexMesh);

      // Directional 3D Arrow pointing from origin to target
      const dirX = targetWorld.x - originWorld.x;
      const dirZ = targetWorld.z - originWorld.z;
      const angle = Math.atan2(dirZ, dirX);

      const arrowGroup = new THREE.Group();
      arrowGroup.name = 'Attack_Directional_Arrow';

      // Arrow cone head pointing along +X initially
      const coneGeo = new THREE.ConeGeometry(0.24, 0.48, 8);
      coneGeo.rotateZ(-Math.PI * 0.5);
      const coneMat = new THREE.MeshBasicMaterial({ color: pulseColor });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.name = 'Attack_Arrow_ConeHead';
      coneMesh.position.set(this.hexRadius * 0.42, 0, 0);
      arrowGroup.add(coneMesh);

      // Arrow shaft
      const shaftGeo = new THREE.BoxGeometry(0.38, 0.05, 0.14);
      const shaftMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      shaftMesh.name = 'Attack_Arrow_Shaft';
      shaftMesh.position.set(this.hexRadius * 0.15, 0, 0);
      arrowGroup.add(shaftMesh);

      arrowGroup.rotation.y = -angle;
      arrowGroup.position.set(originWorld.x, originWorld.y + originElev + 0.04, originWorld.z);
      this.attackPreviewGroup.add(arrowGroup);
    }

    this.attackPreviewGroup.visible = true;
  }

  public clearAttackPreview(): void {
    if (this.freezePreviews) return;
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
    if (!this.freezePreviews) {
      this.clearPathPreview();
    }
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
        const colorHex = isEnd ? 0xffea00 : 0xffaa00;

        // Waypoint disc
        const discGeo = new THREE.CylinderGeometry(radius, radius, 0.05, 12);
        const discMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.9,
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        discMesh.name = isEnd ? `Waypoint_Destination[${pt.x},${pt.y}]` : `Waypoint_${i}[${pt.x},${pt.y}]`;
        discMesh.position.copy(nodePos);
        this.pathPreviewGroup.add(discMesh);

        // Glowing core dot
        const coreGeo = new THREE.SphereGeometry(radius * 0.45, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.name = `Waypoint_Core_${i}[${pt.x},${pt.y}]`;
        coreMesh.position.set(nodePos.x, nodePos.y + 0.03, nodePos.z);
        this.pathPreviewGroup.add(coreMesh);

        // Destination ring
        if (isEnd) {
          const endRingGeo = new THREE.RingGeometry(this.hexRadius * 0.45, this.hexRadius * 0.65, 16);
          endRingGeo.rotateX(-Math.PI * 0.5);
          const endRingMat = new THREE.MeshBasicMaterial({
            color: 0xffea00,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          });
          const endRingMesh = new THREE.Mesh(endRingGeo, endRingMat);
          endRingMesh.name = `Waypoint_Destination_Ring[${pt.x},${pt.y}]`;
          endRingMesh.position.set(nodePos.x, nodePos.y + 0.01, nodePos.z);
          this.pathPreviewGroup.add(endRingMesh);
        }
      }
    }

    // Connecting Trail Line
    if (linePoints.length >= 2) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.95,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      lineMesh.name = 'Path_Trail_Line';
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
