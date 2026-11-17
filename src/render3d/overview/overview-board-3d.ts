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
import { getWindThresholds } from '../decorations/wind-system';
import {
  createOverviewAgricultureModel,
  createOverviewBridgeModel,
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
  createEadorRiverMaterial,
  createEadorWaterMaterial,
  createProceduralWaterNormalTexture,
} from './overview-water-shader';
import { updateOverviewCowAnimation } from './overview-cow-3d';
import { preloadOverviewPeasantGlb } from './overview-peasant-3d';
import { updateOverviewWheatWind } from './overview-wheat-field-3d';
import {
  buildOverviewMeadowClusterGeometry,
  getOverviewFieldstoneMaterial,
  getOverviewMeadowMaterial,
  updateOverviewMeadowWind,
} from './overview-grassland-decor-3d';
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

const WATER_SURFACE_Y = -0.02;

export function getTerrainHeight(terrain: OverviewTerrainType): number {
  switch (terrain) {
    case 'mountain':
      return 1.575; // +50% max elevation (was 1.05)
    case 'hill':
      return 0.918; // +70% hill height (was 0.54)
    case 'deep_forest':
      return 0.26;
    case 'forest':
      return 0.24;
    case 'swamp':
      return 0.15;
    case 'water':
      return -0.36; // +50% deeper min elevation (was -0.24)
    default:
      return 0.22;
  }
}

export function getTerrainNoiseAmp(terrain: OverviewTerrainType): number {
  switch (terrain) {
    case 'mountain':
      return 0.27;
    case 'hill':
      return 0.1425;
    case 'deep_forest':
      return 0.0825;
    case 'forest':
      return 0.0675;
    case 'swamp':
      return 0.0375;
    case 'water':
      return 0.0225;
    default:
      return 0.06;
  }
}

export class OverviewBoard3D {
  public readonly group = new THREE.Group();
  public readonly hexRadius: number = 1.0;

  private readonly tilesGroup = new THREE.Group();
  private readonly gridBordersGroup = new THREE.Group();
  private readonly treesGroup = new THREE.Group();
  private readonly meadowDecorGroup = new THREE.Group();
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
  private riverMesh: THREE.Mesh | null = null;
  private roadMesh: THREE.Mesh | null = null;
  private roadTexture: THREE.DataTexture | null = null;
  private roadMaterial: THREE.MeshStandardMaterial | null = null;
  private readonly riverSegments: Array<{ ax: number; az: number; bx: number; bz: number }> = [];
  private readonly riverCenters: Array<{ x: number; z: number }> = [];
  private readonly roadSegments: Array<{
    ax: number;
    az: number;
    bx: number;
    bz: number;
    skipBridge?: boolean;
  }> = [];
  private readonly roadCenters: Array<{ x: number; z: number; hasBridge: boolean }> = [];
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
  private riverMaterial: THREE.ShaderMaterial | null = null;
  private meadowInstancedCount = 0;
  private fieldstoneInstancedCount = 0;
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
    void preloadOverviewPeasantGlb();
    this.mapWidth = campaign.mapWidth;
    this.mapHeight = campaign.mapHeight;
    this.group.name = 'OverviewBoard3D';

    this.coordsGroup.visible = this.showCoords;

    this.group.add(
      this.tilesGroup,
      this.gridBordersGroup,
      this.treesGroup,
      this.meadowDecorGroup,
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
    this.rebuildMeadowDecorations();
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

  private sampleDistanceToSegments(
    wx: number,
    wz: number,
    segments: ReadonlyArray<{ ax: number; az: number; bx: number; bz: number }>
  ): number {
    let minDist = Infinity;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const vx = s.bx - s.ax;
      const vz = s.bz - s.az;
      const lenSq = vx * vx + vz * vz;
      if (lenSq < 1e-6) continue;
      let t = ((wx - s.ax) * vx + (wz - s.az) * vz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = s.ax + t * vx;
      const pz = s.az + t * vz;
      const d = Math.hypot(wx - px, wz - pz);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  public sampleBaseElevationAtWorld(wx: number, wz: number): number {
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

  public sampleElevationAtWorld(wx: number, wz: number): number {
    let elevation = this.sampleBaseElevationAtWorld(wx, wz);

    // Carve smooth riverbeds along center-to-center river channels
    if (this.riverSegments.length > 0 && elevation > -0.15) {
      const riverDist = this.sampleDistanceToSegments(wx, wz, this.riverSegments);
      const channelRadius = 0.36;
      if (riverDist < channelRadius) {
        const u = riverDist / channelRadius;
        const smooth = 1 - u * u * (3 - 2 * u);
        elevation -= smooth * 0.16;
      }
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

  private collectRiverAndRoadSegments(): void {
    this.riverSegments.length = 0;
    this.riverCenters.length = 0;
    this.roadSegments.length = 0;
    this.roadCenters.length = 0;

    const seenRiver = new Set<string>();
    const seenRoad = new Set<string>();

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        const posA = this.hexToWorld(x, y);

        if (hex.hasRiver && !hex.isLake) {
          this.riverCenters.push({ x: posA.x, z: posA.z });
        }
        if (hex.riverConnections) {
          for (const nb of hex.riverConnections) {
            const key =
              x < nb.x || (x === nb.x && y < nb.y)
                ? `${x},${y}-${nb.x},${nb.y}`
                : `${nb.x},${nb.y}-${x},${y}`;
            if (seenRiver.has(key)) continue;
            seenRiver.add(key);
            const posB = this.hexToWorld(nb.x, nb.y);
            this.riverSegments.push({
              ax: posA.x,
              az: posA.z,
              bx: posB.x,
              bz: posB.z,
            });
          }
        }

        if (hex.hasRoad) {
          this.roadCenters.push({
            x: posA.x,
            z: posA.z,
            hasBridge: Boolean(hex.hasBridge),
          });
        }
        if (hex.roadConnections) {
          for (const nb of hex.roadConnections) {
            const key =
              x < nb.x || (x === nb.x && y < nb.y)
                ? `${x},${y}-${nb.x},${nb.y}`
                : `${nb.x},${nb.y}-${x},${y}`;
            if (seenRoad.has(key)) continue;
            seenRoad.add(key);
            const posB = this.hexToWorld(nb.x, nb.y);
            this.roadSegments.push({
              ax: posA.x,
              az: posA.z,
              bx: posB.x,
              bz: posB.z,
            });
          }
        }
      }
    }
  }

  public getRiverMesh(): THREE.Mesh | null {
    return this.riverMesh;
  }

  public getRoadMesh(): THREE.Mesh | null {
    return this.roadMesh;
  }

  private buildRiverWaterGeometry(): THREE.BufferGeometry | null {
    const positions: number[] = [];
    const uvs: number[] = [];
    const shoreDists: number[] = [];
    const indices: number[] = [];

    const halfWidth = 0.24; // Narrower river (~0.48 total width)
    const segsAcross = 4;

    const appendCurvedRiver = (
      p0x: number,
      p0z: number,
      cpx: number,
      cpz: number,
      p1x: number,
      p1z: number,
      segsAlong: number,
      vStart: number,
      vEnd: number
    ) => {
      const baseIdx = positions.length / 3;
      for (let ia = 0; ia <= segsAlong; ia++) {
        const t = ia / segsAlong;
        const invT = 1 - t;
        const cx = invT * invT * p0x + 2 * invT * t * cpx + t * t * p1x;
        const cz = invT * invT * p0z + 2 * invT * t * cpz + t * t * p1z;
        let tx = 2 * invT * (cpx - p0x) + 2 * t * (p1x - cpx);
        let tz = 2 * invT * (cpz - p0z) + 2 * t * (p1z - cpz);
        if (Math.hypot(tx, tz) < 1e-5) {
          tx = p1x - p0x;
          tz = p1z - p0z;
        }
        const nLen = Math.max(1e-5, Math.hypot(tx, tz));
        const nx = -tz / nLen;
        const nz = tx / nLen;
        const flowV = vStart + (vEnd - vStart) * t;

        for (let ic = 0; ic <= segsAcross; ic++) {
          const tc = ic / segsAcross; // 0..1 across river
          const across = (tc - 0.5) * 2; // -1..1
          const wx = cx + nx * across * halfWidth;
          const wz = cz + nz * across * halfWidth;
          const bankY = this.sampleBaseElevationAtWorld(wx, wz);
          const waterY = Math.max(WATER_SURFACE_Y, bankY - 0.065);

          positions.push(wx, waterY, wz);
          uvs.push(tc, flowV);
          shoreDists.push((1 - Math.abs(across)) * 0.45);
        }
      }

      const stride = segsAcross + 1;
      for (let ia = 0; ia < segsAlong; ia++) {
        for (let ic = 0; ic < segsAcross; ic++) {
          const i0 = baseIdx + ia * stride + ic;
          const i1 = i0 + 1;
          const i2 = i0 + stride;
          const i3 = i2 + 1;
          indices.push(i0, i1, i2, i1, i3, i2);
        }
      }
    };

    const mergeHubCenters: Array<{ x: number; z: number }> = [];

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (!hex.hasRiver || hex.isLake || !hex.riverConnections || hex.riverConnections.length === 0) {
          continue;
        }
        const center = this.hexToWorld(x, y);
        const selfElev = hex.elevation ?? 0;
        const upstream: Coords[] = [];
        const downstream: Coords[] = [];

        for (const nb of hex.riverConnections) {
          const nbHex = this.campaign.getHex(nb);
          const nbElev = nbHex?.elevation ?? 0;
          if (!nbHex?.isLake && nbElev >= selfElev) {
            upstream.push(nb);
          } else {
            downstream.push(nb);
          }
        }

        if (upstream.length === 1 && downstream.length === 1) {
          const posUp = this.hexToWorld(upstream[0].x, upstream[0].y);
          const posDown = this.hexToWorld(downstream[0].x, downstream[0].y);
          const midUx = (posUp.x + center.x) * 0.5;
          const midUz = (posUp.z + center.z) * 0.5;
          const midDx = (center.x + posDown.x) * 0.5;
          const midDz = (center.z + posDown.z) * 0.5;
          appendCurvedRiver(midUx, midUz, center.x, center.z, midDx, midDz, 12, 0.0, 2.0);
        } else {
          for (const u of upstream) {
            const posU = this.hexToWorld(u.x, u.y);
            const midUx = (posU.x + center.x) * 0.5;
            const midUz = (posU.z + center.z) * 0.5;
            appendCurvedRiver(
              midUx,
              midUz,
              (midUx + center.x) * 0.5,
              (midUz + center.z) * 0.5,
              center.x,
              center.z,
              6,
              0.0,
              1.0
            );
          }
          for (const d of downstream) {
            const posD = this.hexToWorld(d.x, d.y);
            const midDx = (center.x + posD.x) * 0.5;
            const midDz = (center.z + posD.z) * 0.5;
            appendCurvedRiver(
              center.x,
              center.z,
              (center.x + midDx) * 0.5,
              (center.z + midDz) * 0.5,
              midDx,
              midDz,
              6,
              1.0,
              2.0
            );
          }
          mergeHubCenters.push({ x: center.x, z: center.z });
        }
      }
    }

    if (positions.length === 0) return null;

    // Hub discs at river sources, merges, and mouths
    const radialSegs = 12;
    for (const c of mergeHubCenters) {
      const centerIdx = positions.length / 3;
      const bankY = this.sampleBaseElevationAtWorld(c.x, c.z);
      const centerWaterY = Math.max(WATER_SURFACE_Y, bankY - 0.065);
      positions.push(c.x, centerWaterY, c.z);
      uvs.push(0.5, 0.5);
      shoreDists.push(0.45);

      for (let r = 0; r < radialSegs; r++) {
        const ang = (r / radialSegs) * Math.PI * 2;
        const wx = c.x + Math.cos(ang) * halfWidth;
        const wz = c.z + Math.sin(ang) * halfWidth;
        const rBankY = this.sampleBaseElevationAtWorld(wx, wz);
        positions.push(wx, Math.max(WATER_SURFACE_Y, rBankY - 0.065), wz);
        uvs.push(0.0, 0.5);
        shoreDists.push(0.0);
      }

      for (let r = 0; r < radialSegs; r++) {
        const next = (r + 1) % radialSegs;
        indices.push(centerIdx, centerIdx + 1 + next, centerIdx + 1 + r);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('aShoreDist', new THREE.Float32BufferAttribute(shoreDists, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private createOverviewRoadTexture(): THREE.DataTexture {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const edgeDist = Math.abs(u - 0.5) * 2; // 0 at center, 1 at edge
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const grain = ((n - Math.floor(n)) - 0.5) * 24;
        const cobble = Math.sin(x * 0.55) * Math.cos(y * 0.45) * 12;
        const idx = (y * size + x) * 4;
        data[idx] = Math.max(55, Math.min(185, 134 - edgeDist * 26 + cobble + grain));
        data[idx + 1] = Math.max(45, Math.min(165, 114 - edgeDist * 22 + cobble + grain * 0.85));
        data[idx + 2] = Math.max(35, Math.min(140, 88 - edgeDist * 18 + cobble * 0.8 + grain * 0.7));
        data[idx + 3] = edgeDist > 0.88 ? Math.round((1 - (edgeDist - 0.88) / 0.12) * 255) : 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private buildRoadNetworkGeometry(): THREE.BufferGeometry | null {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const halfWidth = 0.13;

    const appendCurvedStrip = (
      p0x: number,
      p0z: number,
      cpx: number,
      cpz: number,
      p1x: number,
      p1z: number,
      segs: number
    ) => {
      const baseIdx = positions.length / 3;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const invT = 1 - t;
        // Quadratic Bezier point B(t)
        const cx = invT * invT * p0x + 2 * invT * t * cpx + t * t * p1x;
        const cz = invT * invT * p0z + 2 * invT * t * cpz + t * t * p1z;
        // Derivative B'(t) for tangent
        let tx = 2 * invT * (cpx - p0x) + 2 * t * (p1x - cpx);
        let tz = 2 * invT * (cpz - p0z) + 2 * t * (p1z - cpz);
        const len = Math.hypot(tx, tz);
        if (len < 1e-5) {
          tx = p1x - p0x;
          tz = p1z - p0z;
        }
        const nLen = Math.max(1e-5, Math.hypot(tx, tz));
        const nx = -tz / nLen;
        const nz = tx / nLen;

        for (let ic = 0; ic <= 1; ic++) {
          const across = ic === 0 ? -1 : 1;
          const wx = cx + nx * across * halfWidth;
          const wz = cz + nz * across * halfWidth;
          const groundY = this.sampleElevationAtWorld(wx, wz);
          positions.push(wx, groundY + 0.022, wz);
          uvs.push(ic, t * 2.0);
        }
      }

      for (let i = 0; i < segs; i++) {
        const i0 = baseIdx + i * 2;
        const i1 = i0 + 1;
        const i2 = i0 + 2;
        const i3 = i2 + 1;
        // +Y upward normal winding
        indices.push(i0, i1, i2, i1, i3, i2);
      }
    };

    const junctionCenters: Array<{ x: number; z: number }> = [];

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (!hex.hasRoad || !hex.roadConnections || hex.roadConnections.length === 0) {
          continue;
        }
        const center = this.hexToWorld(x, y);
        const conns = hex.roadConnections;

        if (conns.length === 2) {
          // Smooth C1 Quadratic Bezier curve from edge midpoint A -> hex center -> edge midpoint B
          const posA = this.hexToWorld(conns[0].x, conns[0].y);
          const posB = this.hexToWorld(conns[1].x, conns[1].y);
          const midAx = (posA.x + center.x) * 0.5;
          const midAz = (posA.z + center.z) * 0.5;
          const midBx = (center.x + posB.x) * 0.5;
          const midBz = (center.z + posB.z) * 0.5;
          appendCurvedStrip(midAx, midAz, center.x, center.z, midBx, midBz, 12);
        } else {
          // Endpoint (1 connection) or 3+ way junction: connect each edge midpoint smoothly to hex center
          for (const nb of conns) {
            const posN = this.hexToWorld(nb.x, nb.y);
            const midX = (posN.x + center.x) * 0.5;
            const midZ = (posN.z + center.z) * 0.5;
            appendCurvedStrip(
              midX,
              midZ,
              (midX + center.x) * 0.5,
              (midZ + center.z) * 0.5,
              center.x,
              center.z,
              6
            );
          }
          if (!hex.hasBridge) {
            junctionCenters.push({ x: center.x, z: center.z });
          }
        }
      }
    }

    if (positions.length === 0) return null;

    const radialSegs = 12;
    for (const c of junctionCenters) {
      const centerIdx = positions.length / 3;
      const cy = this.sampleElevationAtWorld(c.x, c.z) + 0.022;
      positions.push(c.x, cy, c.z);
      uvs.push(0.5, 0.5);

      for (let r = 0; r < radialSegs; r++) {
        const ang = (r / radialSegs) * Math.PI * 2;
        const wx = c.x + Math.cos(ang) * halfWidth;
        const wz = c.z + Math.sin(ang) * halfWidth;
        positions.push(wx, this.sampleElevationAtWorld(wx, wz) + 0.022, wz);
        uvs.push(0.5 + Math.cos(ang) * 0.4, 0.5 + Math.sin(ang) * 0.4);
      }

      for (let r = 0; r < radialSegs; r++) {
        const next = (r + 1) % radialSegs;
        indices.push(centerIdx, centerIdx + 1 + next, centerIdx + 1 + r);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private buildTiles(): void {
    this.collectRiverAndRoadSegments();
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
          getTerrainVariationIndex(x, y),
          Boolean(hex.isAgriculturalPlot && hex.agricultureOption === 'wheat')
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
    this.riverMaterial = createEadorRiverMaterial(
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

    const riverGeo = this.buildRiverWaterGeometry();
    if (riverGeo && this.riverMaterial) {
      const riverMesh = new THREE.Mesh(riverGeo, this.riverMaterial);
      riverMesh.name = 'OverviewRiverWater';
      riverMesh.receiveShadow = true;
      riverMesh.userData = { isOverviewRiverWater: true };
      this.riverMesh = riverMesh;
      this.tilesGroup.add(riverMesh);
    }

    const roadGeo = this.buildRoadNetworkGeometry();
    if (roadGeo) {
      this.roadTexture = this.createOverviewRoadTexture();
      this.roadMaterial = new THREE.MeshStandardMaterial({
        map: this.roadTexture,
        transparent: true,
        alphaTest: 0.25,
        roughness: 0.92,
        metalness: 0.02,
      });
      const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
      roadMesh.name = 'OverviewRoadNetwork';
      roadMesh.receiveShadow = true;
      this.roadMesh = roadMesh;
      this.tilesGroup.add(roadMesh);
    }
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
        getTerrainVariationIndex(x, y),
        Boolean(hex.isAgriculturalPlot && hex.agricultureOption === 'wheat')
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
    updateOverviewMeadowWind(this.windTime, this.windAngleRad, this.windStrength);

    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value += dt;
      if (cameraPos) {
        this.waterMaterial.uniforms.uCameraPos.value.copy(cameraPos);
      }
    }
    if (this.riverMaterial) {
      this.riverMaterial.uniforms.uTime.value += dt;
      if (cameraPos) {
        this.riverMaterial.uniforms.uCameraPos.value.copy(cameraPos);
      }
    }

    for (const fogMat of this.fogLayerMaterials) {
      fogMat.uniforms.uTime.value += dt;
    }

    // Animate army & settlement flags reacting to wind direction and strength
    this.updateFlagWindMeshes();

    // Subtle idle breathing/bobbing/sway for overview units (or skeletal mixer if rigged)
    for (const unit of this.animatedUnits) {
      if (typeof unit.userData.updateAnimation === 'function') {
        (unit.userData.updateAnimation as (delta: number) => void)(dt);
        continue;
      }
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

  public updateFlagWindMeshes(overrideStrength?: number): void {
    const strength = overrideStrength ?? this.windStrength;
    const thresholds = getWindThresholds();
    const calmThreshold = Math.min(0.45, thresholds.mediumStrengthThreshold * 0.45);
    const tRaw = Math.max(
      0,
      Math.min(
        1,
        (strength - calmThreshold) /
          Math.max(0.05, thresholds.mediumStrengthThreshold - calmThreshold)
      )
    );
    // 0 = low/no wind (textile drops along pole into a cone), 1 = above medium wind (extended)
    const extendFactor = tRaw * tRaw * (3 - 2 * tRaw);
    const dropFactor = 1 - extendFactor;
    const freqStrength = Math.min(strength, thresholds.strongStrengthThreshold);

    for (const pivot of this.animatedFlagPivots) {
      pivot.rotation.y =
        -this.windAngleRad +
        Math.sin(this.windTime * 2.2) * 0.08 * freqStrength * extendFactor;
    }

    for (const cloth of this.animatedFlagCloths) {
      const basePositions = cloth.userData.basePositions as Float32Array | undefined;
      const flagWidth = (cloth.userData.flagWidth as number) || 0.34;
      const flagHeight = (cloth.userData.flagHeight as number) || 0.2;
      const phase = (cloth.userData.flagPhase as number) || 0;
      const posAttr = cloth.geometry.getAttribute('position');
      if (!basePositions || !posAttr) continue;

      const halfH = Math.max(0.01, flagHeight * 0.5);
      for (let i = 0; i < posAttr.count; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const u = Math.max(0, Math.min(1, bx / flagWidth));
        const vNorm = Math.max(-1, Math.min(1, by / halfH));

        // Extended wind-blown wave (active when wind is above medium strength)
        const wave =
          Math.sin(u * 5.5 - this.windTime * (4.5 + freqStrength * 4.0) + phase) *
          0.045 *
          freqStrength *
          u;

        // Gravity-draped cone shape along the pole (active when wind is low or none)
        const droopedX = bx * 0.08 + u * (0.042 - vNorm * 0.014);
        const droopedY = by * (1 - 0.15 * u) - u * flagWidth * 0.92;
        const droopedZ =
          bz + Math.sin(u * Math.PI * 3.0 + phase) * 0.022 * u * (1.1 - vNorm * 0.3);

        posAttr.setX(i, droopedX * dropFactor + bx * extendFactor);
        posAttr.setY(i, droopedY * dropFactor + by * extendFactor);
        posAttr.setZ(i, droopedZ * dropFactor + (bz + wave) * extendFactor);
      }
      posAttr.needsUpdate = true;
      cloth.geometry.computeVertexNormals();
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

  public getMeadowDecorCount(): number {
    return this.meadowInstancedCount;
  }

  public getFieldstoneCount(): number {
    return this.fieldstoneInstancedCount;
  }

  public rebuildMeadowDecorations(): void {
    this.disposeGroupChildren(this.meadowDecorGroup);
    this.meadowInstancedCount = 0;
    this.fieldstoneInstancedCount = 0;

    const pseudoRand = (a: number, b: number) => {
      const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
      return s - Math.floor(s);
    };

    const meadowPlacements: Array<{
      x: number;
      y: number;
      z: number;
      rotY: number;
      scaleXZ: number;
      scaleY: number;
      atlasOffset: number;
      color: THREE.Color;
    }> = [];

    const stonePlacements: Array<{
      x: number;
      y: number;
      z: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      sx: number;
      sy: number;
      sz: number;
      color: THREE.Color;
    }> = [];

    const stonePalette = [0x7b7a74, 0x6b6e68, 0x8a8478, 0x64686e];

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (
          hex.terrain !== 'grassland' ||
          hex.isSettlement ||
          hex.isDefenseHex ||
          hex.resourceBuilding ||
          hex.isAgriculturalPlot ||
          hex.isLake
        ) {
          continue;
        }

        const center = this.hexToWorld(x, y);
        const seed = x * 73 + y * 139 + 7;

        // 5-8 meadow grass & wildflower clusters per open grassland hex
        const clusterCount = 5 + Math.floor(pseudoRand(seed, 1) * 4);
        for (let i = 0; i < clusterCount; i++) {
          const ang = pseudoRand(seed + i, 2) * Math.PI * 2;
          const rad = (0.18 + pseudoRand(seed + i, 3) * 0.56) * this.hexRadius;
          const wx = center.x + Math.cos(ang) * rad;
          const wz = center.z + Math.sin(ang) * rad;

          if (
            this.riverSegments.length > 0 &&
            this.sampleDistanceToSegments(wx, wz, this.riverSegments) < 0.34
          ) {
            continue;
          }
          if (
            this.roadSegments.length > 0 &&
            this.sampleDistanceToSegments(wx, wz, this.roadSegments) < 0.22
          ) {
            continue;
          }

          const wy = this.sampleElevationAtWorld(wx, wz);
          const isFlower = pseudoRand(seed + i, 4) < 0.42;
          const col = new THREE.Color(isFlower ? 0xffffff : 0xdde8c8);
          col.offsetHSL(
            (pseudoRand(seed + i, 5) - 0.5) * 0.04,
            (pseudoRand(seed + i, 6) - 0.5) * 0.08,
            (pseudoRand(seed + i, 7) - 0.5) * 0.12
          );

          meadowPlacements.push({
            x: wx,
            y: wy,
            z: wz,
            rotY: pseudoRand(seed + i, 8) * Math.PI * 2,
            scaleXZ: 0.78 + pseudoRand(seed + i, 9) * 0.48,
            scaleY: 0.72 + pseudoRand(seed + i, 10) * 0.52,
            atlasOffset: isFlower ? 0.5 : 0.0,
            color: col,
          });
        }

        // Occasional 1-3 small fieldstones on ~45% of open grassland hexes
        if (pseudoRand(seed, 20) < 0.45) {
          const stoneCount = 1 + Math.floor(pseudoRand(seed, 21) * 3);
          const baseAng = pseudoRand(seed, 22) * Math.PI * 2;
          const baseRad = (0.2 + pseudoRand(seed, 23) * 0.46) * this.hexRadius;
          const bx = center.x + Math.cos(baseAng) * baseRad;
          const bz = center.z + Math.sin(baseAng) * baseRad;

          for (let s = 0; s < stoneCount; s++) {
            const wx = bx + (pseudoRand(seed + s, 24) - 0.5) * 0.16;
            const wz = bz + (pseudoRand(seed + s, 25) - 0.5) * 0.16;
            if (
              this.riverSegments.length > 0 &&
              this.sampleDistanceToSegments(wx, wz, this.riverSegments) < 0.34
            ) {
              continue;
            }
            if (
              this.roadSegments.length > 0 &&
              this.sampleDistanceToSegments(wx, wz, this.roadSegments) < 0.22
            ) {
              continue;
            }
            const wy = this.sampleElevationAtWorld(wx, wz);
            const cHex = stonePalette[Math.floor(pseudoRand(seed + s, 26) * stonePalette.length)];
            stonePlacements.push({
              x: wx,
              y: wy + 0.012,
              z: wz,
              rotX: (pseudoRand(seed + s, 27) - 0.5) * 0.5,
              rotY: pseudoRand(seed + s, 28) * Math.PI * 2,
              rotZ: (pseudoRand(seed + s, 29) - 0.5) * 0.5,
              sx: 0.7 + pseudoRand(seed + s, 30) * 0.7,
              sy: 0.42 + pseudoRand(seed + s, 31) * 0.32,
              sz: 0.7 + pseudoRand(seed + s, 32) * 0.7,
              color: new THREE.Color(cHex),
            });
          }
        }
      }
    }

    const dummy = new THREE.Object3D();

    if (meadowPlacements.length > 0) {
      const meadowGeo = buildOverviewMeadowClusterGeometry();
      const atlasOffsets = new Float32Array(meadowPlacements.length);
      const meadowMesh = new THREE.InstancedMesh(
        meadowGeo,
        getOverviewMeadowMaterial(),
        meadowPlacements.length
      );
      meadowMesh.name = 'OverviewMeadowInstanced';
      meadowMesh.castShadow = false;
      meadowMesh.receiveShadow = true;

      for (let i = 0; i < meadowPlacements.length; i++) {
        const p = meadowPlacements[i];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
        dummy.updateMatrix();
        meadowMesh.setMatrixAt(i, dummy.matrix);
        meadowMesh.setColorAt(i, p.color);
        atlasOffsets[i] = p.atlasOffset;
      }
      meadowGeo.setAttribute(
        'aAtlasOffset',
        new THREE.InstancedBufferAttribute(atlasOffsets, 1)
      );
      meadowMesh.instanceMatrix.needsUpdate = true;
      if (meadowMesh.instanceColor) meadowMesh.instanceColor.needsUpdate = true;
      this.meadowDecorGroup.add(meadowMesh);
      this.meadowInstancedCount = meadowPlacements.length;
    }

    if (stonePlacements.length > 0) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.055, 0);
      const stoneMesh = new THREE.InstancedMesh(
        stoneGeo,
        getOverviewFieldstoneMaterial(),
        stonePlacements.length
      );
      stoneMesh.name = 'OverviewFieldstonesInstanced';
      stoneMesh.castShadow = false;
      stoneMesh.receiveShadow = true;

      for (let i = 0; i < stonePlacements.length; i++) {
        const s = stonePlacements[i];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(s.rotX, s.rotY, s.rotZ);
        dummy.scale.set(s.sx, s.sy, s.sz);
        dummy.updateMatrix();
        stoneMesh.setMatrixAt(i, dummy.matrix);
        stoneMesh.setColorAt(i, s.color);
      }
      stoneMesh.instanceMatrix.needsUpdate = true;
      if (stoneMesh.instanceColor) stoneMesh.instanceColor.needsUpdate = true;
      this.meadowDecorGroup.add(stoneMesh);
      this.fieldstoneInstancedCount = stonePlacements.length;
    }
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
            x * 97 + y * 31 + 1,
            { includeSoilBase: false }
          );
          model.position.set(pos.x, surfaceY, pos.z);
          const instMat = new THREE.Matrix4();
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
              child instanceof THREE.InstancedMesh
            ) {
              for (let i = 0; i < child.count; i++) {
                child.getMatrixAt(i, instMat);
                const ix = instMat.elements[12];
                const iz = instMat.elements[14];
                const groundDelta =
                  this.sampleElevationAtWorld(pos.x + ix, pos.z + iz) - surfaceY;
                instMat.elements[13] = groundDelta;
                child.setMatrixAt(i, instMat);
              }
              child.instanceMatrix.needsUpdate = true;
            } else if (child.name === 'WheatHayBale') {
              const hayWorldY = this.sampleElevationAtWorld(
                pos.x + child.position.x,
                pos.z + child.position.z
              );
              child.position.y = hayWorldY - surfaceY + 0.036;
            }
          });
          this.landmarksGroup.add(model);
        } else if (hex.isDefenseHex && region && region.defenseTier !== 'none') {
          const model = createOverviewDefenseModel(region.defenseTier);
          model.position.set(pos.x, surfaceY, pos.z);
          this.landmarksGroup.add(model);
        }

        if (hex.hasBridge) {
          const bridge = createOverviewBridgeModel();
          const bankY = this.sampleBaseElevationAtWorld(pos.x, pos.z);
          const waterY = Math.max(WATER_SURFACE_Y, bankY - 0.085);
          bridge.position.set(pos.x, waterY, pos.z);

          if (hex.roadConnections && hex.roadConnections.length > 0) {
            const firstPos = this.hexToWorld(
              hex.roadConnections[0].x,
              hex.roadConnections[0].y
            );
            let dirX = firstPos.x - pos.x;
            let dirZ = firstPos.z - pos.z;
            if (hex.roadConnections.length >= 2) {
              const secondPos = this.hexToWorld(
                hex.roadConnections[1].x,
                hex.roadConnections[1].y
              );
              dirX = secondPos.x - firstPos.x;
              dirZ = secondPos.z - firstPos.z;
            }
            bridge.rotation.y = Math.atan2(-dirZ, dirX);
          }
          this.landmarksGroup.add(bridge);
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

    interface Edge2D {
      ax: number;
      az: number;
      bx: number;
      bz: number;
      startKey: string;
      endKey: string;
      used: boolean;
    }

    const ptKey = (px: number, pz: number) =>
      `${Math.round(px * 1000)},${Math.round(pz * 1000)}`;

    const edges: Edge2D[] = [];
    const byStart = new Map<string, Edge2D[]>();

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.campaign.hexes[x][y];
        if (hex.regionId !== regionId) continue;

        const pos = this.hexToWorld(x, y);
        const offsets = Math.abs(y) % 2 === 1 ? oddOffsets : evenOffsets;

        for (const [dx, dy] of offsets) {
          const nx = x + dx;
          const ny = y + dy;
          const neighbor = this.campaign.getHex({ x: nx, y: ny });
          if (neighbor && neighbor.regionId === regionId) continue;

          const nPos = this.hexToWorld(nx, ny);
          const theta = Math.atan2(nPos.z - pos.z, nPos.x - pos.x);
          // Pointy-top hex edge endpoints (oriented CCW around hex center)
          const a0 = theta - Math.PI / 6;
          const a1 = theta + Math.PI / 6;
          const ax = pos.x + Math.cos(a0) * this.hexRadius;
          const az = pos.z + Math.sin(a0) * this.hexRadius;
          const bx = pos.x + Math.cos(a1) * this.hexRadius;
          const bz = pos.z + Math.sin(a1) * this.hexRadius;

          const edge: Edge2D = {
            ax,
            az,
            bx,
            bz,
            startKey: ptKey(ax, az),
            endKey: ptKey(bx, bz),
            used: false,
          };
          edges.push(edge);
          const list = byStart.get(edge.startKey) ?? [];
          list.push(edge);
          byStart.set(edge.startKey, list);
        }
      }
    }

    if (edges.length === 0) return;

    // Stitch directed edges into continuous closed boundary loops
    const loops: Array<Array<{ x: number; z: number }>> = [];
    for (const startEdge of edges) {
      if (startEdge.used) continue;
      const loop: Array<{ x: number; z: number }> = [];
      let curr: Edge2D | undefined = startEdge;
      let guard = 0;
      while (curr && !curr.used && guard <= edges.length) {
        guard++;
        curr.used = true;
        loop.push({ x: curr.ax, z: curr.az });
        const candidates = byStart.get(curr.endKey);
        curr = candidates?.find((e) => !e.used);
      }
      if (loop.length >= 3) {
        loops.push(loop);
      }
    }

    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xa81212,
      side: THREE.DoubleSide,
    });

    const halfWidth = 0.055;
    const heightOffset = 0.045;

    for (const rawLoop of loops) {
      // Smooth sharp 120-deg hex corners with 2 passes of Chaikin corner-cutting
      let smoothed = rawLoop;
      for (let pass = 0; pass < 2; pass++) {
        const nextLoop: Array<{ x: number; z: number }> = [];
        const n = smoothed.length;
        for (let i = 0; i < n; i++) {
          const p0 = smoothed[i];
          const p1 = smoothed[(i + 1) % n];
          nextLoop.push({
            x: p0.x * 0.75 + p1.x * 0.25,
            z: p0.z * 0.75 + p1.z * 0.25,
          });
          nextLoop.push({
            x: p0.x * 0.25 + p1.x * 0.75,
            z: p0.z * 0.25 + p1.z * 0.75,
          });
        }
        smoothed = nextLoop;
      }

      // Subdivide long segments so the border hugs terrain elevation continuously
      const denseLoop: Array<{ x: number; z: number }> = [];
      const m = smoothed.length;
      for (let i = 0; i < m; i++) {
        const p0 = smoothed[i];
        const p1 = smoothed[(i + 1) % m];
        const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        const steps = Math.max(1, Math.ceil(dist / 0.14));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          denseLoop.push({
            x: p0.x + (p1.x - p0.x) * t,
            z: p0.z + (p1.z - p0.z) * t,
          });
        }
      }

      const count = denseLoop.length;
      if (count < 3) continue;

      const positions: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i <= count; i++) {
        const pPrev = denseLoop[(i - 1 + count) % count];
        const pCurr = denseLoop[i % count];
        const pNext = denseLoop[(i + 1) % count];

        const tx = pNext.x - pPrev.x;
        const tz = pNext.z - pPrev.z;
        const len = Math.max(1e-5, Math.hypot(tx, tz));
        const nx = -tz / len;
        const nz = tx / len;

        for (const side of [-1, 1]) {
          const wx = pCurr.x + nx * side * halfWidth;
          const wz = pCurr.z + nz * side * halfWidth;
          const wy =
            Math.max(WATER_SURFACE_Y, this.sampleElevationAtWorld(wx, wz)) +
            heightOffset;
          positions.push(wx, wy, wz);
        }
      }

      for (let i = 0; i < count; i++) {
        const i0 = i * 2;
        const i1 = i0 + 1;
        const i2 = i0 + 2;
        const i3 = i2 + 1;
        indices.push(i0, i1, i2, i1, i3, i2);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const borderMesh = new THREE.Mesh(geo, borderMat);
      borderMesh.name = `RegionBorder_${regionId}`;
      borderMesh.renderOrder = 5;
      this.hoveredRegionBordersGroup.add(borderMesh);
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
    this.disposeGroupChildren(this.meadowDecorGroup);
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
    this.riverMesh = null;
    this.roadMesh = null;
    this.roadMaterial?.dispose();
    this.roadMaterial = null;
    this.roadTexture?.dispose();
    this.roadTexture = null;
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
    this.riverMaterial?.dispose();
    this.riverMaterial = null;
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
