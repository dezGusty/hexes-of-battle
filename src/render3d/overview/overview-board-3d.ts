import * as THREE from 'three';
import { OverviewCampaign } from '../../overview/overview-campaign';
import {
  OverviewHex,
  OverviewTerrainType,
} from '../../overview/overview-types';
import { Coords } from '../../shared';
import {
  buildLowPolyForestTreeMesh,
  updateTreeWindState,
} from '../units/unit-mesh-builder';
import {
  createOverviewAgricultureModel,
  createOverviewCombinedArmyVisual,
  createOverviewDefenseModel,
  createOverviewResourceBuildingModel,
  createOverviewSettlementModel,
} from './overview-models-3d';
import {
  classifyOverviewPathTurn,
  createOverviewPathArrowGeometry,
  OverviewPathSegmentKind,
} from './overview-path-arrows';
import {
  createBillowingFogLayerMaterial,
  createFogMaskTexture,
} from './overview-fog-shader';
import {
  createEadorWaterMaterial,
  createProceduralWaterNormalTexture,
} from './overview-water-shader';
import { updateOverviewCowAnimation } from './overview-cow-3d';
import { updateOverviewWheatWind } from './overview-wheat-field-3d';
import {
  createOverviewBlendedTerrainMaterial,
  createOverviewHighlightGridTexture,
  createOverviewTerrainAtlas,
  createOverviewTerrainGridTexture,
  getTerrainVariationIndex,
  OVERVIEW_LAND_TERRAINS,
  OVERVIEW_TERRAIN_TEXTURE_CONFIG,
  OverviewTerrainAtlasHandle,
  updateOverviewTerrainGridCell,
} from './overview-terrain-shader';

export { OVERVIEW_TERRAIN_TEXTURE_CONFIG };

const WATER_SURFACE_Y = 0.08;

function getTerrainHeight(terrain: OverviewTerrainType): number {
  switch (terrain) {
    case 'mountain':
      return 1.05;
    case 'hill':
      return 0.54;
    case 'deep_forest':
      return 0.26;
    case 'forest':
      return 0.24;
    case 'swamp':
      return 0.15;
    case 'water':
      return -0.24;
    default:
      return 0.22;
  }
}

function getTerrainNoiseAmp(terrain: OverviewTerrainType): number {
  switch (terrain) {
    case 'mountain':
      return 0.18;
    case 'hill':
      return 0.095;
    case 'deep_forest':
      return 0.055;
    case 'forest':
      return 0.045;
    case 'swamp':
      return 0.025;
    case 'water':
      return 0.015;
    default:
      return 0.04;
  }
}

export class OverviewBoard3D {
  public readonly group = new THREE.Group();
  public readonly hexRadius: number = 1.0;

  private readonly tilesGroup = new THREE.Group();
  private readonly gridBordersGroup = new THREE.Group();
  private readonly treesGroup = new THREE.Group();
  private readonly coordsGroup = new THREE.Group();
  private readonly landmarksGroup = new THREE.Group();
  private readonly armiesGroup = new THREE.Group();
  private readonly overlaysGroup = new THREE.Group();
  private readonly movePathGroup = new THREE.Group();
  private readonly hoveredRegionBordersGroup = new THREE.Group();
  private readonly fogGroup = new THREE.Group();

  public readonly tileMeshes: THREE.Mesh[] = [];
  private readonly tileMeshMap = new Map<string, THREE.Mesh>();
  private terrainMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private readonly armyGroups: Map<string, THREE.Group> = new Map();
  private readonly terrainMaterials = new Map<
    OverviewTerrainType,
    THREE.MeshStandardMaterial
  >();
  private terrainAtlas: OverviewTerrainAtlasHandle | null = null;
  private terrainGridTex: THREE.DataTexture | null = null;
  private highlightGridTex: THREE.DataTexture | null = null;
  private landTerrainMaterial: THREE.MeshStandardMaterial | null = null;
  private readonly terrainTextures = new Map<string, THREE.Texture>();
  private waterMaterial: THREE.ShaderMaterial | null = null;
  private waterNormalA: THREE.DataTexture | null = null;
  private waterNormalB: THREE.DataTexture | null = null;
  private readonly waterShoreSteps = new Map<string, number>();
  private readonly waterHexHeights: number[] = [];
  private windTime = 0;
  private windAngleRad = Math.PI * 0.25;
  private windStrength = 1.0;
  private readonly animatedUnits: THREE.Object3D[] = [];
  private readonly animatedCows: THREE.Object3D[] = [];
  private readonly animatedFlagPivots: THREE.Object3D[] = [];
  private readonly animatedFlagCloths: THREE.Mesh[] = [];
  private fogMaskTexture: THREE.DataTexture | null = null;
  private readonly fogLayerMaterials: THREE.ShaderMaterial[] = [];
  private fogMapMin = new THREE.Vector2();
  private fogMapSize = new THREE.Vector2();
  private readonly pathArrowGeometries = new Map<
    OverviewPathSegmentKind,
    THREE.BufferGeometry
  >();
  private pathArrowMaterial: THREE.MeshBasicMaterial | null = null;

  private simpleTreesEnabled = false;
  private showGrid = true;
  private showCoords = false;
  private hoveredRegionId: string | null = null;

  private readonly mapWidth: number;
  private readonly mapHeight: number;

  constructor(private readonly campaign: OverviewCampaign) {
    this.mapWidth = campaign.mapWidth;
    this.mapHeight = campaign.mapHeight;
    this.group.name = 'OverviewBoard3D';

    this.coordsGroup.visible = this.showCoords;

    this.group.add(
      this.tilesGroup,
      this.gridBordersGroup,
      this.treesGroup,
      this.coordsGroup,
      this.landmarksGroup,
      this.armiesGroup,
      this.overlaysGroup,
      this.movePathGroup,
      this.hoveredRegionBordersGroup,
      this.fogGroup
    );

    this.buildTiles();
    this.rebuildTrees();
    this.rebuildCoords();
    this.rebuildLandmarks();
    this.syncArmies();
    this.buildFogOfWarLayers();
  }

  public hexToWorld(x: number, y: number): THREE.Vector3 {
    const widthSpacing = this.hexRadius * Math.sqrt(3);
    const heightSpacing = this.hexRadius * 1.5;

    const worldX =
      (x + (Math.abs(y) % 2) * 0.5 - (this.mapWidth - 1) * 0.5) * widthSpacing;
    const worldZ = (y - (this.mapHeight - 1) * 0.5) * heightSpacing;
    return new THREE.Vector3(worldX, 0, worldZ);
  }

  private worldToNearestHexUnclamped(wx: number, wz: number): Coords {
    const widthSpacing = this.hexRadius * Math.sqrt(3);
    const heightSpacing = this.hexRadius * 1.5;
    const px = wx + (this.mapWidth - 1) * 0.5 * widthSpacing;
    const pz = wz + (this.mapHeight - 1) * 0.5 * heightSpacing;
    const qf = ((Math.sqrt(3) / 3) * px - (1 / 3) * pz) / this.hexRadius;
    const rf = ((2 / 3) * pz) / this.hexRadius;
    const sf = -qf - rf;
    let rx = Math.round(qf);
    let ry = Math.round(rf);
    const rz = Math.round(sf);
    const dx = Math.abs(rx - qf);
    const dy = Math.abs(ry - rf);
    const dz = Math.abs(rz - sf);
    if (dx > dy && dx > dz) {
      rx = -ry - rz;
    } else if (dy > dz) {
      ry = -rx - rz;
    }
    const odd = Math.abs(ry) % 2;
    const hx = rx + Math.floor((ry - odd) / 2);
    const hy = ry;
    return {
      x: Math.max(0, Math.min(this.mapWidth - 1, hx)),
      y: Math.max(0, Math.min(this.mapHeight - 1, hy)),
    };
  }

  public worldToHex(pos: THREE.Vector3): Coords | null {
    const candidate = this.worldToNearestHexUnclamped(pos.x, pos.z);
    const w = this.hexToWorld(candidate.x, candidate.y);
    const dSq = (pos.x - w.x) ** 2 + (pos.z - w.z) ** 2;
    return dSq <= this.hexRadius * this.hexRadius * 1.15 ? candidate : null;
  }

  private sampleTerrainNoise2D(x: number, z: number): number {
    const hash = (ix: number, iz: number) => {
      const h = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
      return h - Math.floor(h);
    };
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz);
    const b = hash(ix + 1, iz);
    const c = hash(ix, iz + 1);
    const d = hash(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  private sampleTerrainFbm(wx: number, wz: number): number {
    let value = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < 3; i++) {
      value += amp * (this.sampleTerrainNoise2D(wx * freq, wz * freq) * 2 - 1);
      freq *= 2.03;
      amp *= 0.5;
    }
    return value;
  }

  public sampleElevationAtWorld(wx: number, wz: number): number {
    const centerCoords = this.worldToNearestHexUnclamped(wx, wz);
    const nearestHex = this.campaign.hexes[centerCoords.x][centerCoords.y];
    const nearestCenter = this.hexToWorld(centerCoords.x, centerCoords.y);

    const oddOffsets: ReadonlyArray<[number, number]> = [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [0, 1],
      [1, 1],
    ];
    const evenOffsets: ReadonlyArray<[number, number]> = [
      [0, 0],
      [1, 0],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];
    const offsets = Math.abs(centerCoords.y) % 2 === 1 ? oddOffsets : evenOffsets;

    const sigma = this.hexRadius * 0.82;
    const invTwoSigmaSq = 1 / (2 * sigma * sigma);
    let sumH = 0;
    let sumNoiseAmp = 0;
    let sumW = 0;

    for (const [dx, dy] of offsets) {
      const nx = centerCoords.x + dx;
      const ny = centerCoords.y + dy;
      const h = this.campaign.getHex({ x: nx, y: ny });
      if (!h) continue;
      const hp = this.hexToWorld(nx, ny);
      const dSq = (wx - hp.x) ** 2 + (wz - hp.z) ** 2;
      const w = Math.exp(-dSq * invTwoSigmaSq);
      sumH += w * getTerrainHeight(h.terrain);
      sumNoiseAmp += w * getTerrainNoiseAmp(h.terrain);
      sumW += w;
    }

    const macroH = sumW > 0 ? sumH / sumW : getTerrainHeight(nearestHex.terrain);
    const noiseAmp = sumW > 0 ? sumNoiseAmp / sumW : getTerrainNoiseAmp(nearestHex.terrain);
    const noise = this.sampleTerrainFbm(wx * 1.35, wz * 1.35) * noiseAmp;
    let elevation = macroH + noise;

    // Level flat-pad around occupied hexes (settlements, resource buildings, defenses)
    // so structures never float on one side or sink into slopes on the other.
    if (
      nearestHex.isSettlement ||
      nearestHex.resourceBuilding ||
      nearestHex.isDefenseHex
    ) {
      const dist = Math.hypot(wx - nearestCenter.x, wz - nearestCenter.z);
      const padInner = this.hexRadius * 0.42;
      const padOuter = this.hexRadius * 0.85;
      const t = Math.min(1, Math.max(0, (dist - padInner) / (padOuter - padInner)));
      const padMask = t * t * (3 - 2 * t);
      const centerBaseY = getTerrainHeight(nearestHex.terrain);
      elevation = centerBaseY * (1 - padMask) + elevation * padMask;
    }

    return elevation;
  }

  public getSurfaceY(hex: OverviewHex): number {
    if (hex.terrain === 'water') {
      return WATER_SURFACE_Y;
    }
    const pos = this.hexToWorld(hex.coords.x, hex.coords.y);
    return this.sampleElevationAtWorld(pos.x, pos.z);
  }

  private computeWaterShoreSteps(): void {
    this.waterShoreSteps.clear();
    const queue: Coords[] = [];

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (hex.terrain !== 'water') {
          this.waterShoreSteps.set(`${x},${y}`, 0);
          queue.push({ x, y });
        }
      }
    }

    const oddOffsets: ReadonlyArray<[number, number]> = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [0, 1],
      [1, 1],
    ];
    const evenOffsets: ReadonlyArray<[number, number]> = [
      [1, 0],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curDist = this.waterShoreSteps.get(`${cur.x},${cur.y}`) ?? 0;
      const offsets = Math.abs(cur.y) % 2 === 1 ? oddOffsets : evenOffsets;
      for (const [dx, dy] of offsets) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const neighbor = this.campaign.getHex({ x: nx, y: ny });
        if (!neighbor) continue;
        const key = `${nx},${ny}`;
        if (!this.waterShoreSteps.has(key)) {
          this.waterShoreSteps.set(key, curDist + 1);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  private getHeightfieldBounds(): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    const widthSpacing = this.hexRadius * Math.sqrt(3);
    const heightSpacing = this.hexRadius * 1.5;
    const minX = -(this.mapWidth - 1) * 0.5 * widthSpacing - this.hexRadius * 1.05;
    const maxX = (this.mapWidth - 1) * 0.5 * widthSpacing + this.hexRadius * 1.55;
    const minZ = -(this.mapHeight - 1) * 0.5 * heightSpacing - this.hexRadius * 1.1;
    const maxZ = (this.mapHeight - 1) * 0.5 * heightSpacing + this.hexRadius * 1.1;
    return { minX, maxX, minZ, maxZ };
  }

  private buildTerrainHeightfieldGeometry(): THREE.BufferGeometry {
    const { minX, maxX, minZ, maxZ } = this.getHeightfieldBounds();
    const step = this.hexRadius / 3.5;
    const cols = Math.max(16, Math.ceil((maxX - minX) / step));
    const rows = Math.max(16, Math.ceil((maxZ - minZ) / step));
    const vertCount = (cols + 1) * (rows + 1);

    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const hexCoords = new Float32Array(vertCount * 2);
    const tileCenters = new Float32Array(vertCount * 2);

    for (let r = 0; r <= rows; r++) {
      const tz = r / rows;
      const wz = minZ + tz * (maxZ - minZ);
      for (let c = 0; c <= cols; c++) {
        const tx = c / cols;
        const wx = minX + tx * (maxX - minX);
        const idx = r * (cols + 1) + c;
        const wy = this.sampleElevationAtWorld(wx, wz);

        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = wy;
        positions[idx * 3 + 2] = wz;

        uvs[idx * 2] = tx;
        uvs[idx * 2 + 1] = tz;

        const hc = this.worldToNearestHexUnclamped(wx, wz);
        const center = this.hexToWorld(hc.x, hc.y);
        hexCoords[idx * 2] = hc.x;
        hexCoords[idx * 2 + 1] = hc.y;
        tileCenters[idx * 2] = center.x;
        tileCenters[idx * 2 + 1] = center.z;
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c;
        const i1 = i0 + 1;
        const i2 = i0 + (cols + 1);
        const i3 = i2 + 1;
        // Counter-clockwise winding for +Y up normal
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aHexCoord', new THREE.BufferAttribute(hexCoords, 2));
    geo.setAttribute('aTileCenter', new THREE.BufferAttribute(tileCenters, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private buildWaterPlaneGeometry(
    landWorldPositions: THREE.Vector3[]
  ): THREE.BufferGeometry {
    const { minX, maxX, minZ, maxZ } = this.getHeightfieldBounds();
    const step = this.hexRadius * 0.5;
    const cols = Math.max(12, Math.ceil((maxX - minX) / step));
    const rows = Math.max(12, Math.ceil((maxZ - minZ) / step));
    const vertCount = (cols + 1) * (rows + 1);

    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const shoreDists = new Float32Array(vertCount);
    const halfHexFlatWidth = this.hexRadius * Math.sqrt(3) * 0.5;
    const maxSearchSq = (this.hexRadius * 4.5) ** 2;

    for (let r = 0; r <= rows; r++) {
      const tz = r / rows;
      const wz = minZ + tz * (maxZ - minZ);
      for (let c = 0; c <= cols; c++) {
        const tx = c / cols;
        const wx = minX + tx * (maxX - minX);
        const idx = r * (cols + 1) + c;

        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = wz;

        uvs[idx * 2] = tx;
        uvs[idx * 2 + 1] = tz;

        let minDist = 2.0;
        for (let j = 0; j < landWorldPositions.length; j++) {
          const lp = landWorldPositions[j];
          const dx = wx - lp.x;
          const dz = wz - lp.z;
          const dSq = dx * dx + dz * dz;
          if (dSq > maxSearchSq) continue;
          const edgeDist = Math.max(0, Math.sqrt(dSq) - halfHexFlatWidth);
          if (edgeDist < minDist) {
            minDist = edgeDist;
          }
        }
        shoreDists[idx] = minDist;
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c;
        const i1 = i0 + 1;
        const i2 = i0 + (cols + 1);
        const i3 = i2 + 1;
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aShoreDist', new THREE.BufferAttribute(shoreDists, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private buildTiles(): void {
    this.computeWaterShoreSteps();
    this.waterHexHeights.length = 0;
    this.tileMeshMap.clear();
    this.tileMeshes.length = 0;

    const landWorldPositions: THREE.Vector3[] = [];
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (hex.terrain !== 'water') {
          landWorldPositions.push(this.hexToWorld(x, y));
        } else {
          const steps = this.waterShoreSteps.get(`${x},${y}`) ?? 1;
          this.waterHexHeights.push(
            steps <= 1 ? 0.13 : steps === 2 ? 0.1 : 0.07
          );
        }
      }
    }

    this.terrainAtlas = createOverviewTerrainAtlas();
    this.terrainGridTex = createOverviewTerrainGridTexture(this.mapWidth, this.mapHeight);
    this.highlightGridTex = createOverviewHighlightGridTexture(
      this.mapWidth,
      this.mapHeight
    );
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        updateOverviewTerrainGridCell(
          this.terrainGridTex,
          x,
          y,
          hex.terrain,
          getTerrainVariationIndex(x, y)
        );
      }
    }
    this.terrainGridTex.needsUpdate = true;

    this.landTerrainMaterial = createOverviewBlendedTerrainMaterial(
      this.terrainAtlas.texture,
      this.terrainGridTex,
      this.mapWidth,
      this.mapHeight,
      this.hexRadius,
      this.highlightGridTex
    );

    this.waterNormalA = createProceduralWaterNormalTexture(128, 0.0, 1.0);
    this.waterNormalB = createProceduralWaterNormalTexture(128, 1.7, 1.4);
    this.waterMaterial = createEadorWaterMaterial(
      this.waterNormalA,
      this.waterNormalB
    );

    const terrainGeo = this.buildTerrainHeightfieldGeometry();
    const terrainMesh = new THREE.Mesh(terrainGeo, this.landTerrainMaterial);
    terrainMesh.name = 'OverviewTerrainHeightfield';
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    terrainMesh.userData = { isOverviewTerrainHeightfield: true };
    this.terrainMesh = terrainMesh;
    this.tilesGroup.add(terrainMesh);
    this.tileMeshes.push(terrainMesh);

    const waterGeo = this.buildWaterPlaneGeometry(landWorldPositions);
    const waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    waterMesh.name = 'OverviewWaterPlane';
    waterMesh.position.y = WATER_SURFACE_Y;
    waterMesh.receiveShadow = true;
    waterMesh.userData = { isOverviewWaterPlane: true };
    this.waterMesh = waterMesh;
    this.tilesGroup.add(waterMesh);
    this.tileMeshes.push(waterMesh);
  }

  public updateHexTerrain(x: number, y: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    const hex = this.campaign.hexes[x][y];
    if (this.terrainGridTex) {
      updateOverviewTerrainGridCell(
        this.terrainGridTex,
        x,
        y,
        hex.terrain,
        getTerrainVariationIndex(x, y)
      );
      this.terrainGridTex.needsUpdate = true;
    }

    if (this.terrainMesh) {
      const center = this.hexToWorld(x, y);
      const updateRadiusSq = (this.hexRadius * 2.4) ** 2;
      const posAttr = this.terrainMesh.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const wx = posAttr.getX(i);
        const wz = posAttr.getZ(i);
        const dSq = (wx - center.x) ** 2 + (wz - center.z) ** 2;
        if (dSq <= updateRadiusSq) {
          posAttr.setY(i, this.sampleElevationAtWorld(wx, wz));
        }
      }
      posAttr.needsUpdate = true;
      this.terrainMesh.geometry.computeVertexNormals();
    }
    this.rebuildTrees();
  }

  public getTerrainMesh(): THREE.Mesh | null {
    return this.terrainMesh;
  }

  public getWaterMesh(): THREE.Mesh | null {
    return this.waterMesh;
  }

  public getHighlightGridTexture(): THREE.DataTexture | null {
    return this.highlightGridTex;
  }

  public getLandTerrainMaterial(): THREE.MeshStandardMaterial | null {
    return this.landTerrainMaterial;
  }

  public getTerrainGridTexture(): THREE.DataTexture | null {
    return this.terrainGridTex;
  }

  public async loadTerrainAssets(
    basePath: string = 'textures/terrain/'
  ): Promise<void> {
    if (typeof document === 'undefined') return;

    const loader = new THREE.TextureLoader();
    const loadTex = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      });

    const uniqueFiles = Array.from(
      new Set(
        Object.values(OVERVIEW_TERRAIN_TEXTURE_CONFIG).flatMap(
          (cfg) => cfg.variations
        )
      )
    );

    await Promise.all(
      uniqueFiles.map(async (file) => {
        if (this.terrainTextures.has(file)) return;
        try {
          const tex = await loadTex(`${basePath}${file}`);
          this.terrainTextures.set(file, tex);
        } catch {
          // Keep fallback solid color if texture fails to load
        }
      })
    );

    if (this.terrainAtlas) {
      OVERVIEW_LAND_TERRAINS.forEach((terrain, row) => {
        const variations = OVERVIEW_TERRAIN_TEXTURE_CONFIG[terrain].variations;
        variations.forEach((file, col) => {
          const tex = this.terrainTextures.get(file);
          if (tex && tex.image) {
            this.terrainAtlas?.paintImageToCell(
              row,
              col,
              tex.image as CanvasImageSource
            );
          }
        });
      });
    }

    const waterTex = this.terrainTextures.get(
      OVERVIEW_TERRAIN_TEXTURE_CONFIG.water.file
    );
    if (waterTex && this.waterMaterial) {
      const prev = this.waterMaterial.uniforms.uDiffuseMap.value as THREE.Texture | undefined;
      if (prev && prev !== waterTex) {
        prev.dispose();
      }
      this.waterMaterial.uniforms.uDiffuseMap.value = waterTex;
      this.waterMaterial.uniforms.uHasDiffuseMap.value = 1;
    }
  }

  public update(deltaMS: number, cameraPos?: THREE.Vector3): void {
    const dt = deltaMS * 0.001;
    this.windTime += dt;
    this.windAngleRad = Math.PI * 0.25 + Math.sin(this.windTime * 0.22) * 0.35;
    this.windStrength =
      0.9 +
      Math.sin(this.windTime * 0.55) * 0.32 +
      Math.sin(this.windTime * 1.3) * 0.12;

    updateTreeWindState(this.windAngleRad, this.windStrength, dt);
    updateOverviewWheatWind(this.windTime, this.windAngleRad, this.windStrength);

    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value += dt;
      if (cameraPos) {
        this.waterMaterial.uniforms.uCameraPos.value.copy(cameraPos);
      }
    }

    for (const fogMat of this.fogLayerMaterials) {
      fogMat.uniforms.uTime.value += dt;
    }

    // Animate army & settlement flags reacting to wind direction and strength
    for (const pivot of this.animatedFlagPivots) {
      pivot.rotation.y =
        -this.windAngleRad +
        Math.sin(this.windTime * 2.2) * 0.08 * this.windStrength;
    }

    for (const cloth of this.animatedFlagCloths) {
      const basePositions = cloth.userData.basePositions as Float32Array | undefined;
      const flagWidth = (cloth.userData.flagWidth as number) || 0.34;
      const phase = (cloth.userData.flagPhase as number) || 0;
      const posAttr = cloth.geometry.getAttribute('position');
      if (!basePositions || !posAttr) continue;

      for (let i = 0; i < posAttr.count; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const u = Math.max(0, Math.min(1, bx / flagWidth));
        const wave =
          Math.sin(u * 5.5 - this.windTime * (4.5 + this.windStrength * 4.0) + phase) *
          0.045 *
          this.windStrength *
          u;
        const droop =
          -(1.0 - Math.min(1.0, this.windStrength * 0.75)) * 0.05 * u;
        posAttr.setY(i, by + droop);
        posAttr.setZ(i, bz + wave);
      }
      posAttr.needsUpdate = true;
    }

    // Subtle idle breathing/bobbing/sway for overview units (matching battle map idle feel)
    for (const unit of this.animatedUnits) {
      const baseScale = (unit.userData.baseScale as number) || 0.38;
      const phase = (unit.userData.idlePhase as number) || 0;
      const breath = Math.sin(this.windTime * 2.2 + phase);
      const bob = Math.sin(this.windTime * 2.2 + phase + 0.6) * 0.012;
      unit.scale.set(
        baseScale * (1 - breath * 0.025),
        baseScale * (1 + breath * 0.035),
        baseScale * (1 - breath * 0.025)
      );
      unit.position.y = Math.max(0, bob);
      unit.rotation.y = Math.sin(this.windTime * 0.9 + phase) * 0.06;
    }

    for (const cow of this.animatedCows) {
      updateOverviewCowAnimation(cow, dt);
    }
  }

  public getWindState(): { angleRad: number; strength: number } {
    return { angleRad: this.windAngleRad, strength: this.windStrength };
  }

  public getAnimatedFlagCount(): number {
    return this.animatedFlagCloths.length;
  }

  public getAnimatedUnitCount(): number {
    return this.animatedUnits.length;
  }

  public getWaterMaterial(): THREE.ShaderMaterial | null {
    return this.waterMaterial;
  }

  public getWaterHexHeights(): number[] {
    return [...this.waterHexHeights];
  }

  public setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    this.gridBordersGroup.visible = visible;
    const shader = this.landTerrainMaterial?.userData?.shader;
    if (shader?.uniforms?.uShowGrid) {
      shader.uniforms.uShowGrid.value = visible ? 1.0 : 0.0;
    }
  }

  public isGridVisible(): boolean {
    return this.showGrid;
  }

  public setCoordsVisible(visible: boolean): void {
    this.showCoords = visible;
    this.coordsGroup.visible = visible;
  }

  public isCoordsVisible(): boolean {
    return this.showCoords;
  }

  public setSimpleTreesEnabled(enabled: boolean): void {
    if (this.simpleTreesEnabled === enabled) return;
    this.simpleTreesEnabled = enabled;
    this.rebuildTrees();
  }

  public isSimpleTreesEnabled(): boolean {
    return this.simpleTreesEnabled;
  }

  private createSimpleTreeMesh(heightScale: number): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * heightScale, 0.08 * heightScale, 0.45 * heightScale, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 })
    );
    trunk.position.y = 0.225 * heightScale;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.32 * heightScale, 0.95 * heightScale, 6),
      new THREE.MeshStandardMaterial({ color: 0x2e5e29, roughness: 0.85 })
    );
    crown.position.y = 0.72 * heightScale;
    group.add(trunk, crown);
    return group;
  }

  private seededHexRandom(x: number, y: number, salt: number): number {
    let h = ((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((salt + 1) * 83492791);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  private rebuildTrees(): void {
    this.disposeGroupChildren(this.treesGroup);
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (hex.terrain !== 'forest' && hex.terrain !== 'deep_forest') continue;
        const pos = this.hexToWorld(x, y);
        const treeCount =
          hex.terrain === 'deep_forest'
            ? 10 + Math.floor(this.seededHexRandom(x, y, 0) * 5)
            : 8 + Math.floor(this.seededHexRandom(x, y, 0) * 7);
        const baseScale = (hex.terrain === 'deep_forest' ? 0.42 : 0.34) * 2;
        const hasBuilding = Boolean(
          hex.resourceBuilding || hex.isSettlement || hex.isDefenseHex
        );
        const minCenterDist = hex.resourceBuilding === 'lumber_camp' || hasBuilding ? 0.48 : 0.16;
        const maxCenterDist = 0.76;
        const minTreeSpacing = 0.21;
        const placedOffsets: Array<{ dx: number; dz: number }> = [];

        for (let t = 0; t < treeCount; t++) {
          const r1 = this.seededHexRandom(x, y, t * 3 + 1);
          const scale = baseScale * (0.85 + r1 * 0.3);
          const tree = this.simpleTreesEnabled
            ? this.createSimpleTreeMesh(scale * 2.2)
            : buildLowPolyForestTreeMesh(t % 2 === 0 ? 'pine' : 'pine_2', scale);

          let chosenDx = 0;
          let chosenDz = 0;
          let bestMinDist = -1;
          for (let attempt = 0; attempt < 18; attempt++) {
            const ra = this.seededHexRandom(x, y, t * 40 + attempt * 2 + 10);
            const rr = this.seededHexRandom(x, y, t * 40 + attempt * 2 + 11);
            const angle =
              ((t + attempt * 0.37) / treeCount) * Math.PI * 2 + (ra - 0.5) * 0.85;
            // Area-uniform radial distribution so trees don't bunch at the center
            const dist = Math.sqrt(
              minCenterDist * minCenterDist +
                rr * (maxCenterDist * maxCenterDist - minCenterDist * minCenterDist)
            );
            const dx = Math.cos(angle) * dist;
            const dz = Math.sin(angle) * dist;

            let nearest = Infinity;
            for (const p of placedOffsets) {
              const d = Math.hypot(dx - p.dx, dz - p.dz);
              if (d < nearest) nearest = d;
            }
            if (nearest >= minTreeSpacing) {
              chosenDx = dx;
              chosenDz = dz;
              break;
            }
            if (nearest > bestMinDist) {
              bestMinDist = nearest;
              chosenDx = dx;
              chosenDz = dz;
            }
          }

          placedOffsets.push({ dx: chosenDx, dz: chosenDz });
          const treeY = this.sampleElevationAtWorld(
            pos.x + chosenDx,
            pos.z + chosenDz
          );
          tree.position.set(pos.x + chosenDx, treeY, pos.z + chosenDz);
          tree.userData.hexCoords = { x, y };
          tree.userData.baseScale = baseScale;
          tree.userData.localOffset = { x: chosenDx, z: chosenDz };
          this.treesGroup.add(tree);
        }
      }
    }
  }

  private rebuildCoords(): void {
    this.disposeGroupChildren(this.coordsGroup);
    if (typeof document === 'undefined') return;

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        const pos = this.hexToWorld(x, y);
        const surfaceY = this.getSurfaceY(hex);

        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 40;
        const ctx = canvas.getContext?.('2d');
        if (!ctx) continue;

        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(`${x},${y}`, 48, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${x},${y}`, 48, 20);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
        });
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.27), mat);
        label.rotation.x = -Math.PI / 2;
        label.position.set(pos.x, surfaceY + 0.03, pos.z + 0.42);
        this.coordsGroup.add(label);
      }
    }
  }

  public rebuildLandmarks(): void {
    this.disposeGroupChildren(this.landmarksGroup);

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        const region = this.campaign.getRegionById(hex.regionId);
        const pos = this.hexToWorld(x, y);
        const surfaceY = this.getSurfaceY(hex);

        if (hex.isSettlement && region?.settlementTier) {
          const owner = region.ownerPlayerId
            ? this.campaign.getPlayer(region.ownerPlayerId)
            : undefined;
          const model = createOverviewSettlementModel(
            region.settlementTier,
            owner?.color ?? '#8c929a'
          );
          model.position.set(pos.x, surfaceY, pos.z);
          this.landmarksGroup.add(model);
        } else if (hex.resourceBuilding) {
          const model = createOverviewResourceBuildingModel(hex.resourceBuilding);
          model.position.set(pos.x, surfaceY, pos.z);
          this.landmarksGroup.add(model);
        } else if (hex.isAgriculturalPlot) {
          const model = createOverviewAgricultureModel(
            hex.agricultureOption ?? 'none',
            x * 97 + y * 31 + 1
          );
          model.position.set(pos.x, surfaceY, pos.z);
          model.traverse((child) => {
            if (child.userData?.isOverviewCow) {
              const cowWorldY = this.sampleElevationAtWorld(
                pos.x + child.position.x,
                pos.z + child.position.z
              );
              child.position.y = cowWorldY - surfaceY;
            } else if (child.userData?.isCattleFencePart) {
              const fenceWorldY = this.sampleElevationAtWorld(
                pos.x + child.position.x,
                pos.z + child.position.z
              );
              const baseLocalY = Number(child.userData.baseLocalY ?? 0);
              child.position.y = fenceWorldY - surfaceY + baseLocalY;
            } else if (
              child.userData?.isOverviewWheatMesh &&
              child instanceof THREE.Mesh
            ) {
              const wPos = child.geometry.getAttribute(
                'position'
              ) as THREE.BufferAttribute;
              for (let vi = 0; vi < wPos.count; vi++) {
                const vx = wPos.getX(vi);
                const vz = wPos.getZ(vi);
                const groundDelta =
                  this.sampleElevationAtWorld(pos.x + vx, pos.z + vz) - surfaceY;
                wPos.setY(vi, wPos.getY(vi) + groundDelta);
              }
              wPos.needsUpdate = true;
            }
          });
          this.landmarksGroup.add(model);
        } else if (hex.isDefenseHex && region && region.defenseTier !== 'none') {
          const model = createOverviewDefenseModel(region.defenseTier);
          model.position.set(pos.x, surfaceY, pos.z);
          this.landmarksGroup.add(model);
        }
      }
    }
    this.refreshAnimatedReferences();
  }

  private refreshAnimatedReferences(): void {
    this.animatedUnits.length = 0;
    this.animatedCows.length = 0;
    this.animatedFlagPivots.length = 0;
    this.animatedFlagCloths.length = 0;

    const collect = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if (obj.userData?.isOverviewUnit) {
          this.animatedUnits.push(obj);
        } else if (obj.userData?.isOverviewCow) {
          this.animatedCows.push(obj);
        } else if (obj.userData?.isOverviewFlagPivot) {
          this.animatedFlagPivots.push(obj);
        } else if (obj.userData?.isOverviewFlagCloth && obj instanceof THREE.Mesh) {
          this.animatedFlagCloths.push(obj);
        }
      });
    };

    collect(this.landmarksGroup);
    collect(this.armiesGroup);
  }

  public syncArmies(): void {
    this.disposeGroupChildren(this.armiesGroup);
    this.armyGroups.clear();

    for (const army of this.campaign.armies) {
      if (army.squads.length === 0) continue;
      if (army.ownerPlayerId !== 'player' && !this.campaign.isHexVisible(army.coords)) {
        continue;
      }
      const hex = this.campaign.getHex(army.coords);
      if (!hex) continue;
      const owner = this.campaign.getPlayer(army.ownerPlayerId);
      const pos = this.hexToWorld(army.coords.x, army.coords.y);
      const surfaceY = this.getSurfaceY(hex);

      const visual = createOverviewCombinedArmyVisual(
        army,
        owner?.color ?? '#8c929a'
      );
      visual.position.set(pos.x, surfaceY, pos.z);
      this.armiesGroup.add(visual);
      this.armyGroups.set(army.id, visual);
    }
    this.refreshAnimatedReferences();
    this.updateFogOfWar();
  }

  private buildFogOfWarLayers(): void {
    const topLeft = this.hexToWorld(0, 0);
    const bottomRight = this.hexToWorld(this.mapWidth - 1, this.mapHeight - 1);
    const pad = this.hexRadius * 5.0;

    this.fogMapMin.set(topLeft.x - pad, topLeft.z - pad);
    const maxX = bottomRight.x + this.hexRadius * Math.sqrt(3) * 0.5 + pad;
    const maxZ = bottomRight.z + pad;
    this.fogMapSize.set(maxX - this.fogMapMin.x, maxZ - this.fogMapMin.y);

    this.fogMaskTexture = createFogMaskTexture(96);

    const layerConfigs = [
      {
        y: 0.58,
        scrollSpeed: new THREE.Vector2(0.016, 0.011),
        noiseScale: 0.24,
        opacity: 0.84,
        seedOffset: 0.0,
      },
      {
        y: 0.86,
        scrollSpeed: new THREE.Vector2(-0.022, 0.015),
        noiseScale: 0.34,
        opacity: 0.72,
        seedOffset: 17.3,
      },
      {
        y: 1.16,
        scrollSpeed: new THREE.Vector2(0.013, -0.019),
        noiseScale: 0.48,
        opacity: 0.56,
        seedOffset: 41.9,
      },
    ];

    const centerX = this.fogMapMin.x + this.fogMapSize.x * 0.5;
    const centerZ = this.fogMapMin.y + this.fogMapSize.y * 0.5;
    const planeGeo = new THREE.PlaneGeometry(this.fogMapSize.x, this.fogMapSize.y);
    planeGeo.rotateX(-Math.PI * 0.5);
    planeGeo.userData.isSharedAsset = true;

    layerConfigs.forEach((cfg, idx) => {
      const mat = createBillowingFogLayerMaterial({
        fogMask: this.fogMaskTexture!,
        mapMin: this.fogMapMin,
        mapSize: this.fogMapSize,
        scrollSpeed: cfg.scrollSpeed,
        noiseScale: cfg.noiseScale,
        layerOpacity: cfg.opacity,
        seedOffset: cfg.seedOffset,
      });
      this.fogLayerMaterials.push(mat);

      const layerMesh = new THREE.Mesh(planeGeo, mat);
      layerMesh.position.set(centerX, cfg.y, centerZ);
      layerMesh.renderOrder = 10 + idx;
      layerMesh.userData.isOverviewFogLayer = true;
      this.fogGroup.add(layerMesh);
    });

    this.updateFogOfWar();
  }

  public updateFogOfWar(): void {
    if (!this.fogMaskTexture) return;
    const data = this.fogMaskTexture.image.data as Uint8Array;
    const size = this.fogMaskTexture.image.width;
    const visibleKeys = this.campaign.getVisibleHexKeys();

    const visibleWorldCenters: Array<{ x: number; z: number }> = [];
    for (const key of visibleKeys) {
      const [sx, sy] = key.split(',').map(Number);
      const w = this.hexToWorld(sx, sy);
      visibleWorldCenters.push({ x: w.x, z: w.z });
    }

    const innerClear = this.hexRadius * 0.72;
    const outerFull = this.hexRadius * 1.7;
    const invRange = 1 / Math.max(0.001, outerFull - innerClear);

    for (let py = 0; py < size; py++) {
      const v = py / (size - 1);
      const wz = this.fogMapMin.y + v * this.fogMapSize.y;
      for (let px = 0; px < size; px++) {
        const u = px / (size - 1);
        const wx = this.fogMapMin.x + u * this.fogMapSize.x;

        let minDist = Infinity;
        for (let i = 0; i < visibleWorldCenters.length; i++) {
          const c = visibleWorldCenters[i];
          const dx = wx - c.x;
          const dz = wz - c.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDist) {
            minDist = dSq;
          }
        }
        const dist = Math.sqrt(minDist);
        const t = Math.max(0, Math.min(1, (dist - innerClear) * invRange));
        const fogVal = t * t * (3 - 2 * t);
        const byte = Math.round(fogVal * 255);
        const idx = (py * size + px) * 4;
        data[idx] = byte;
        data[idx + 1] = byte;
        data[idx + 2] = byte;
        data[idx + 3] = 255;
      }
    }

    this.fogMaskTexture.needsUpdate = true;
  }

  public getFogLayerCount(): number {
    return this.fogGroup.children.length;
  }

  public getFogLayerMaterials(): THREE.ShaderMaterial[] {
    return [...this.fogLayerMaterials];
  }

  public getFogMaskTexture(): THREE.DataTexture | null {
    return this.fogMaskTexture;
  }

  public getArmyVisualCount(): number {
    return this.armyGroups.size;
  }

  public setReachableHexes(reachableKeys: Iterable<string>): void {
    this.disposeGroupChildren(this.overlaysGroup);
    if (!this.highlightGridTex) return;

    const data = this.highlightGridTex.image.data as Uint8Array;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0; // clear reachable channel
      data[i + 3] = 255;
    }

    for (const key of reachableKeys) {
      const [sx, sy] = key.split(',').map(Number);
      if (
        Number.isNaN(sx) ||
        Number.isNaN(sy) ||
        sx < 0 ||
        sx >= this.mapWidth ||
        sy < 0 ||
        sy >= this.mapHeight
      ) {
        continue;
      }
      const idx = (sy * this.mapWidth + sx) * 4;
      data[idx] = 255;
    }
    this.highlightGridTex.needsUpdate = true;
  }

  private disposeGroupChildren(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          if (!obj.geometry?.userData?.isSharedAsset) {
            obj.geometry?.dispose();
          }
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (!m.userData?.isSharedAsset) m.dispose();
            });
          } else if (obj.material && !obj.material.userData?.isSharedAsset) {
            obj.material.dispose();
          }
        }
      });
    }
  }

  public setHoveredRegion(regionId: string | null): void {
    if (this.hoveredRegionId === regionId) return;
    this.hoveredRegionId = regionId;
    this.disposeGroupChildren(this.hoveredRegionBordersGroup);
    if (!regionId) return;

    const borderMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    const borderGeo = new THREE.BoxGeometry(this.hexRadius * 1.02, 0.055, 0.085);

    const oddOffsets: ReadonlyArray<[number, number]> = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [0, 1],
      [1, 1],
    ];
    const evenOffsets: ReadonlyArray<[number, number]> = [
      [1, 0],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (hex.regionId !== regionId) continue;

        const pos = this.hexToWorld(x, y);
        const surfaceY = this.getSurfaceY(hex);
        const offsets = Math.abs(y) % 2 === 1 ? oddOffsets : evenOffsets;

        for (const [dx, dy] of offsets) {
          const nx = x + dx;
          const ny = y + dy;
          const neighbor = this.campaign.getHex({ x: nx, y: ny });
          if (neighbor && neighbor.regionId === regionId) continue;

          const nPos = this.hexToWorld(nx, ny);
          const dirX = nPos.x - pos.x;
          const dirZ = nPos.z - pos.z;
          const midX = pos.x + dirX * 0.5;
          const midZ = pos.z + dirZ * 0.5;
          const neighborY = neighbor ? this.getSurfaceY(neighbor) : surfaceY;

          const bar = new THREE.Mesh(borderGeo, borderMat);
          bar.position.set(midX, Math.max(surfaceY, neighborY) + 0.03, midZ);
          // Edge runs perpendicular to (dirX, dirZ): (-dirZ, dirX)
          bar.rotation.y = -Math.atan2(dirX, -dirZ);
          this.hoveredRegionBordersGroup.add(bar);
        }
      }
    }
  }

  public getHoveredRegionId(): string | null {
    return this.hoveredRegionId;
  }

  public getHoveredRegionBorderCount(): number {
    return this.hoveredRegionBordersGroup.children.length;
  }

  private getPathArrowGeometry(
    kind: OverviewPathSegmentKind
  ): THREE.BufferGeometry {
    let geo = this.pathArrowGeometries.get(kind);
    if (!geo) {
      geo = createOverviewPathArrowGeometry(kind, this.hexRadius);
      geo.userData.isSharedAsset = true;
      this.pathArrowGeometries.set(kind, geo);
    }
    return geo;
  }

  private getPathArrowMaterial(): THREE.MeshBasicMaterial {
    if (!this.pathArrowMaterial) {
      this.pathArrowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.pathArrowMaterial.userData.isSharedAsset = true;
    }
    return this.pathArrowMaterial;
  }

  public setMovePath(path: Coords[]): void {
    this.disposeGroupChildren(this.movePathGroup);
    if (path.length < 2) return;

    const mat = this.getPathArrowMaterial();
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const hex = this.campaign.getHex(curr);
      if (!hex) continue;

      const posCurr = this.hexToWorld(curr.x, curr.y);
      const y = this.getSurfaceY(hex) + 0.055;
      let kind: OverviewPathSegmentKind;
      let inDir: THREE.Vector2;

      if (i === 0) {
        const posNext = this.hexToWorld(path[1].x, path[1].y);
        inDir = new THREE.Vector2(
          posNext.x - posCurr.x,
          posNext.z - posCurr.z
        ).normalize();
        kind = 'start';
      } else if (i === path.length - 1) {
        const posPrev = this.hexToWorld(path[i - 1].x, path[i - 1].y);
        inDir = new THREE.Vector2(
          posCurr.x - posPrev.x,
          posCurr.z - posPrev.z
        ).normalize();
        kind = 'end';
      } else {
        const posPrev = this.hexToWorld(path[i - 1].x, path[i - 1].y);
        const posNext = this.hexToWorld(path[i + 1].x, path[i + 1].y);
        inDir = new THREE.Vector2(
          posCurr.x - posPrev.x,
          posCurr.z - posPrev.z
        ).normalize();
        const outDir = new THREE.Vector2(
          posNext.x - posCurr.x,
          posNext.z - posCurr.z
        ).normalize();
        kind = classifyOverviewPathTurn(inDir, outDir);
      }

      const geo = this.getPathArrowGeometry(kind);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(posCurr.x, y, posCurr.z);
      mesh.rotation.y = -Math.atan2(inDir.y, inDir.x);
      mesh.userData.pathKind = kind;
      this.movePathGroup.add(mesh);
    }
  }

  public getMovePathSegmentKinds(): OverviewPathSegmentKind[] {
    return this.movePathGroup.children.map(
      (child) => child.userData.pathKind as OverviewPathSegmentKind
    );
  }

  public dispose(): void {
    for (const child of this.fogGroup.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    this.disposeGroupChildren(this.fogGroup);
    for (const mat of this.fogLayerMaterials) {
      mat.dispose();
    }
    this.fogLayerMaterials.length = 0;
    this.fogMaskTexture?.dispose();
    this.fogMaskTexture = null;
    this.disposeGroupChildren(this.hoveredRegionBordersGroup);
    this.disposeGroupChildren(this.movePathGroup);
    this.disposeGroupChildren(this.overlaysGroup);
    this.disposeGroupChildren(this.armiesGroup);
    this.disposeGroupChildren(this.landmarksGroup);
    this.disposeGroupChildren(this.coordsGroup);
    this.disposeGroupChildren(this.treesGroup);
    this.disposeGroupChildren(this.gridBordersGroup);
    this.disposeGroupChildren(this.tilesGroup);
    for (const geo of this.pathArrowGeometries.values()) {
      geo.dispose();
    }
    this.pathArrowGeometries.clear();
    this.pathArrowMaterial?.dispose();
    this.pathArrowMaterial = null;
    for (const mat of this.terrainMaterials.values()) {
      mat.dispose();
    }
    this.terrainMaterials.clear();
    this.landTerrainMaterial?.dispose();
    this.landTerrainMaterial = null;
    this.terrainAtlas?.dispose();
    this.terrainAtlas = null;
    this.terrainGridTex?.dispose();
    this.terrainGridTex = null;
    this.highlightGridTex?.dispose();
    this.highlightGridTex = null;
    this.terrainMesh = null;
    this.waterMesh = null;
    this.tileMeshMap.clear();
    for (const tex of this.terrainTextures.values()) {
      tex.dispose();
    }
    this.terrainTextures.clear();
    if (this.waterMaterial) {
      const diffuse = this.waterMaterial.uniforms.uDiffuseMap.value as THREE.Texture | undefined;
      if (diffuse && !Array.from(this.terrainTextures.values()).includes(diffuse)) {
        diffuse.dispose();
      }
      this.waterMaterial.dispose();
      this.waterMaterial = null;
    }
    this.waterNormalA?.dispose();
    this.waterNormalA = null;
    this.waterNormalB?.dispose();
    this.waterNormalB = null;
    this.tileMeshes.length = 0;
    this.armyGroups.clear();
    this.animatedUnits.length = 0;
    this.animatedCows.length = 0;
    this.animatedFlagPivots.length = 0;
    this.animatedFlagCloths.length = 0;
  }
}
