import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HexDirection, HexFlankStatus, HexMap, HexMapHelpers } from '../shared/hex-map';
import { Coords } from '../shared';
import { TerrainType } from '../battle/terrain-types';
import {
  AVERAGE_UNIT_3D_HEIGHT,
  FOREST_TREE_TARGET_HEIGHT,
  buildLowPolyForestTreeMesh,
  getTreePartTexture,
  applyTreeUVMapping,
  smoothGeometryNormals,
  ForestTreeVariant,
  updateTreeWindState,
} from './units/unit-mesh-builder';
import { createSelectedHaloTexture } from './units/selected-halo-texture';
import {
  createRetreatFlagMesh,
  updateRetreatFlagWind,
  setRetreatFlagWindState,
  getPlayerBanner,
  createBannerSubTexture,
  setSharedBannersTexture,
  getSharedBannersTexture,
} from './decorations/retreat-flag-3d';
import {
  BATTLE_TERRAIN_TEXTURE_CONFIG,
  OVERVIEW_LAND_TERRAINS,
  createOverviewBlendedTerrainMaterial,
  createOverviewTerrainAtlas,
  createOverviewTerrainGridTexture,
  getTerrainVariationIndex,
  updateOverviewTerrainGridCell,
} from './overview/overview-terrain-shader';
import type { OverviewTerrainType } from '../overview/overview-types';
import {
  BattleLocationType,
  BoardWorldBounds,
  getOuterApronColorHex,
  normalizeBattleLocationType,
  populateOuterEnvironmentDecorations,
} from './decorations/battle-environment-3d';
import { WindState } from './decorations/wind-system';
import { GrassFieldSystem, GrassModelType, GrassClumpInstanceData } from './decorations/grass-system-3d';
import { BlowingLeavesSystem } from './decorations/blowing-leaves-3d';
import { updateOverviewWheatWind } from './overview/overview-wheat-field-3d';
import { TerrainSplattingContext } from './terrain-splatting';

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
  getRetreatPoints?: (armyIndex: number) => Coords[];
  getArmyBanner?: (armyIndex: number) => string;
  majorTerrainType?: BattleLocationType | string;
  getMajorTerrainType?: () => BattleLocationType | string;
  getWindState?: () => WindState;
  blendTransitionWidth?: number;
  blendNoiseStrength?: number;
  simpleTrees?: boolean;
}

export class HexBoard3D {
  public readonly group: THREE.Group = new THREE.Group();
  public readonly hexMap: HexMap;

  // Hex dimensions in 3D
  public readonly hexRadius: number = 1.0;
  public readonly hexHeight: number = 0.25;

  private tileMeshes: Map<string, THREE.Mesh> = new Map();
  private tileMeshList: THREE.Mesh[] = [];
  private continuousTerrainMesh: THREE.Mesh | null = null;
  private overviewTerrainAtlas: ReturnType<typeof createOverviewTerrainAtlas> | null = null;
  private overviewTerrainGridTex: THREE.DataTexture | null = null;
  private overviewTerrainTextures: Map<string, THREE.Texture> = new Map();
  private highlightOverlayTexture: THREE.Texture | null = null;
  private overlayMeshes: Map<string, THREE.Mesh> = new Map();
  private gridBordersGroup: THREE.Group = new THREE.Group();
  private coordsGroup: THREE.Group = new THREE.Group();
  public readonly forestTreesGroup: THREE.Group = new THREE.Group();
  private forestTreesByHex: Map<string, THREE.Object3D[]> = new Map();
  private forestTreeTemplates: Partial<Record<ForestTreeVariant, THREE.Object3D>> = {};
  private simpleTrees: boolean = false;
  public readonly retreatFlagsGroup: THREE.Group = new THREE.Group();
  public readonly outerDecorationsGroup: THREE.Group = new THREE.Group();
  public readonly grassSystem: GrassFieldSystem = new GrassFieldSystem();
  public readonly blowingLeavesSystem: BlowingLeavesSystem = new BlowingLeavesSystem();
  private animatedFlagCloths: THREE.Mesh[] = [];
  private animatedWindmillSails: THREE.Object3D[] = [];
  private windTime: number = 0;
  private getRetreatPoints?: (armyIndex: number) => Coords[];
  private getArmyBanner?: (armyIndex: number) => string;
  private majorTerrainType: BattleLocationType = BattleLocationType.FARM;
  private getMajorTerrainTypeFn?: () => BattleLocationType | string;
  private getWindStateFn?: () => WindState;
  private currentWindAngleRad: number = Math.PI * 0.25;
  private currentWindStrength: number = 1.0;
  private bannersTexture?: THREE.Texture;
  private hoverMesh: THREE.Mesh;
  private selectedRingMesh: THREE.Mesh;
  public readonly selectedHaloMesh: THREE.Mesh;
  private selectedHaloAnchor: { x: number; z: number; elev: number } | null = null;
  private facingIndicatorGroup: THREE.Group = new THREE.Group();
  private attackPreviewGroup: THREE.Group = new THREE.Group();
  private pathPreviewGroup: THREE.Group = new THREE.Group();
  public readonly rangePerimeterGroup: THREE.Group = new THREE.Group();
  public readonly enemyRangePerimeterGroup: THREE.Group = new THREE.Group();

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

  private blendTransitionWidth: number = 0.38;
  private blendNoiseStrength: number = 0.08;
  private blendedTileMaterials: THREE.Material[] = [];

  private hillClusters: Map<string, number> = new Map();
  private clusterElevations: Map<number, number> = new Map();
  private hillMesaRadii: Map<string, number> = new Map();
  private hillMaskTexture: THREE.Texture | null = null;

  private materials: Record<string, THREE.Material> = {};
  private terrainSplatting!: TerrainSplattingContext;
  private sideMaterial: THREE.Material = new THREE.MeshStandardMaterial({
    color: 0x33281e,
    roughness: 0.88,
    metalness: 0.05,
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
    if (options?.getRetreatPoints !== undefined) this.getRetreatPoints = options.getRetreatPoints;
    if (options?.getArmyBanner !== undefined) this.getArmyBanner = options.getArmyBanner;
    if (options?.majorTerrainType !== undefined) {
      this.majorTerrainType = normalizeBattleLocationType(options.majorTerrainType);
    }
    if (options?.getMajorTerrainType !== undefined) {
      this.getMajorTerrainTypeFn = options.getMajorTerrainType;
    }
    if (options?.getWindState !== undefined) {
      this.getWindStateFn = options.getWindState;
      const initialWind = options.getWindState();
      if (initialWind) {
        this.currentWindAngleRad = initialWind.angleRad;
        this.currentWindStrength = initialWind.strength;
      }
    }
    if (options?.blendTransitionWidth !== undefined) this.blendTransitionWidth = options.blendTransitionWidth;
    if (options?.blendNoiseStrength !== undefined) this.blendNoiseStrength = options.blendNoiseStrength;

    this.terrainSplatting = new TerrainSplattingContext(
      this.hexMap,
      this.hexRadius,
      (x, y) => this.getTerrainAt(x, y),
      (x, y) => this.hexToWorld(x, y)
    );
    this.terrainSplatting.setGridGlowVisible(this.showGrid);

    this.initMaterials();

    this.group.name = 'HexBoard';
    this.facingIndicatorGroup.name = 'FacingIndicator';
    this.attackPreviewGroup.name = 'AttackPreview';
    this.pathPreviewGroup.name = 'PathPreview';
    this.gridBordersGroup.name = 'GridBorders';
    this.coordsGroup.name = 'CoordsLabels';
    this.forestTreesGroup.name = 'ForestTrees';
    this.retreatFlagsGroup.name = 'RetreatFlags';
    this.outerDecorationsGroup.name = 'OuterDecorations';

    this.hoverMesh = this.createProjectedHexMesh(0, 0, 0, this.hexRadius * 0.96, 0xffffff, 0.36);
    this.hoverMesh.name = 'TileHoverMesh';
    this.hoverMesh.visible = false;
    this.group.add(this.hoverMesh);

    this.selectedRingMesh = this.createRingMesh(0xffcc00);
    this.selectedRingMesh.name = 'TileSelectedRing';
    this.selectedRingMesh.visible = false;
    this.group.add(this.selectedRingMesh);

    const haloTexture = createSelectedHaloTexture();
    const haloDiameter = this.hexRadius * 2.0;
    const haloGeo = new THREE.PlaneGeometry(haloDiameter, haloDiameter, 4, 4);
    haloGeo.rotateX(-Math.PI * 0.5);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTexture,
      transparent: true,
      opacity: 0.2975,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.selectedHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.selectedHaloMesh.name = 'TileSelectedHalo';
    this.selectedHaloMesh.renderOrder = 5;
    this.selectedHaloMesh.visible = false;
    this.group.add(this.selectedHaloMesh);

    this.group.add(this.facingIndicatorGroup);
    this.group.add(this.attackPreviewGroup);
    this.group.add(this.pathPreviewGroup);
    this.rangePerimeterGroup.name = 'RangePerimeter';
    this.group.add(this.rangePerimeterGroup);
    this.enemyRangePerimeterGroup.name = 'EnemyRangePerimeter';
    this.group.add(this.enemyRangePerimeterGroup);
    this.group.add(this.gridBordersGroup);
    this.group.add(this.coordsGroup);
    this.group.add(this.forestTreesGroup);
    this.group.add(this.retreatFlagsGroup);
    this.group.add(this.outerDecorationsGroup);
    this.group.add(this.grassSystem.group);
    this.group.add(this.blowingLeavesSystem.group);

    this.simpleTrees = options?.simpleTrees ?? false;
    this.buildBoard();
  }

  public setSimpleTreesEnabled(enabled: boolean): void {
    if (this.simpleTrees === enabled) return;
    this.simpleTrees = enabled;
    this.rebuildBoard();
  }

  public isSimpleTreesEnabled(): boolean {
    return this.simpleTrees;
  }

  private attachTerrainSplatting(mat: THREE.MeshStandardMaterial, key: string): THREE.MeshStandardMaterial {
    mat.customProgramCacheKey = () => `EadorTerrainSplat_${key}`;
    mat.onBeforeCompile = (shader) => {
      this.terrainSplatting.applyToShader(shader);
    };
    return mat;
  }

  private initMaterials(): void {
    this.attachTerrainSplatting(this.sideMaterial as THREE.MeshStandardMaterial, 'side');

    this.materials['grass'] = this.attachTerrainSplatting(new THREE.MeshStandardMaterial({
      color: 0x3d7a42,
      roughness: 0.82,
      metalness: 0.06,
    }), 'grass');
    this.materials['forest'] = this.attachTerrainSplatting(new THREE.MeshStandardMaterial({
      color: 0x2e5c33,
      roughness: 0.85,
      metalness: 0.06,
    }), 'forest');
    this.materials['dirt'] = this.attachTerrainSplatting(new THREE.MeshStandardMaterial({
      color: 0x8a6d45,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }), 'dirt');
    this.materials['water'] = new THREE.MeshStandardMaterial({
      color: 0x2266aa,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.materials['swamp'] = this.attachTerrainSplatting(new THREE.MeshStandardMaterial({
      color: 0x4a5438,
      roughness: 0.85,
      metalness: 0.06,
    }), 'swamp');
  }

  public async loadTerrainAssets(
    basePath: string = 'textures/terrain/'
  ): Promise<void> {
    if (typeof document === 'undefined') return;

    // Load optional Blender-exported low-poly forest tree GLB templates
    try {
      const gltfLoader = new GLTFLoader();
      const applyTreeGlbMaterials = (root: THREE.Object3D, variant: 'pine' | 'oak') => {
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const isTrunk = mesh.name.toLowerCase().includes('trunk');
            if (!mesh.geometry.getAttribute('uv')) {
              applyTreeUVMapping(
                mesh.geometry,
                isTrunk ? 'trunk' : variant === 'pine' ? 'pine_foliage' : 'oak_foliage'
              );
            }
            smoothGeometryNormals(mesh.geometry);
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat) {
              mat.flatShading = false;
              if (!mat.map) {
                mat.map = getTreePartTexture(isTrunk ? 'bark' : 'foliage');
                if (isTrunk) {
                  mat.color.setHex(0xffffff);
                }
              }
              mat.needsUpdate = true;
            }
          }
        });
      };
      const loadTreeGlb = (url: string) =>
        new Promise<THREE.Object3D>((resolve, reject) => {
          gltfLoader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => reject(err)
          );
        });
      await Promise.all([
        loadTreeGlb('models/terrain/forest_oak.glb')
          .then((scene) => {
            applyTreeGlbMaterials(scene, 'oak');
            this.forestTreeTemplates.oak = scene;
          })
          .catch(() => { }),
      ]);
    } catch {
      // Fallback procedural low-poly tree builder remains active
    }

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
      const mountainTex = await loadTex(`${basePath}mountain.jpg`).catch(() => undefined);

      // Load high-resolution (512x512) Eador-style battle terrain textures (4 variants per terrain)
      const battleFiles = Array.from(
        new Set(
          OVERVIEW_LAND_TERRAINS.flatMap(
            (t) => BATTLE_TERRAIN_TEXTURE_CONFIG[t]?.variations ?? []
          )
        )
      );
      await Promise.all(
        battleFiles.map(async (file) => {
          if (this.overviewTerrainTextures.has(file)) return;
          try {
            const tex = await loadTex(`${basePath}${file}`);
            this.overviewTerrainTextures.set(file, tex);
          } catch {
            // Keep fallback color if texture fails to load
          }
        })
      );
      this.paintOverviewAtlasTextures();

      this.terrainSplatting.setLoadedDiffuseTextures({
        grass: grassTex,
        dirt: dirtTex,
        rock: mountainTex,
      });

      this.materials['grass'] = this.attachTerrainSplatting(
        new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.82, metalness: 0.05 }),
        'grass_tex'
      );
      this.materials['forest'] = this.attachTerrainSplatting(
        new THREE.MeshStandardMaterial({ map: forestTex, roughness: 0.85, metalness: 0.05 }),
        'forest_tex'
      );
      this.materials['dirt'] = this.attachTerrainSplatting(
        new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.88, metalness: 0.04, side: THREE.DoubleSide }),
        'dirt_tex'
      );
      this.materials['swamp'] = this.attachTerrainSplatting(
        new THREE.MeshStandardMaterial({ map: swampTex, roughness: 0.85, metalness: 0.05 }),
        'swamp_tex'
      );
      this.materials['water'] = new THREE.MeshStandardMaterial({
        map: waterTex,
        roughness: 0.15,
        metalness: 0.3,
        transparent: true,
        opacity: 0.88,
      });

      await loadTex('banners.png')
        .catch(() => loadTex(`${basePath}banners.png`))
        .then((bannersTex) => {
          bannersTex.minFilter = THREE.LinearFilter;
          bannersTex.magFilter = THREE.LinearFilter;
          bannersTex.generateMipmaps = false;
          bannersTex.needsUpdate = true;
          this.bannersTexture = bannersTex;
          setSharedBannersTexture(bannersTex);
        })
        .catch(() => { });

      this.rebuildBoard();
    } catch (e) {
      console.warn('Could not load hex terrain assets:', e);
    }
  }

  public getTileMeshes(): THREE.Object3D[] {
    return this.tileMeshList;
  }

  public getTerrainSplatting(): TerrainSplattingContext {
    return this.terrainSplatting;
  }

  public rebuildBoard(): void {
    this.terrainSplatting.rebuildSplatMap(
      this.hexMap,
      this.hexRadius,
      (x, y) => this.getTerrainAt(x, y),
      (x, y) => this.hexToWorld(x, y)
    );
    // Clean up dynamic blended materials
    this.blendedTileMaterials.forEach((m) => m.dispose());
    this.blendedTileMaterials = [];

    // Remove existing tile meshes
    if (this.continuousTerrainMesh) {
      this.group.remove(this.continuousTerrainMesh);
      this.continuousTerrainMesh.geometry.dispose();
      (this.continuousTerrainMesh.material as THREE.Material).dispose();
      this.continuousTerrainMesh = null;
    }
    this.overviewTerrainAtlas?.texture.dispose();
    this.overviewTerrainAtlas = null;
    this.overviewTerrainGridTex?.dispose();
    this.overviewTerrainGridTex = null;

    this.tileMeshes.forEach((m) => {
      this.group.remove(m);
      if (!m.geometry.userData?.isSharedAsset) {
        m.geometry.dispose();
      }
    });
    this.tileMeshes.clear();
    this.tileMeshList = [];
    this.clearForestTrees();
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

  public getTerrainAt(x: number, y: number): TerrainType {
    if (this.getTerrain) {
      return this.getTerrain(x, y);
    }
    if (typeof (this.hexMap as any).getTerrain === 'function') {
      return (this.hexMap as any).getTerrain(x, y);
    }
    return TerrainType.PLAIN;
  }

  private getTileMaterials(terrain: TerrainType, x?: number, y?: number): THREE.Material[] {
    let topMat = this.materials['grass'];
    if (terrain === TerrainType.WATER) {
      topMat = this.materials['water'];
    } else if (terrain === TerrainType.HILL) {
      topMat = this.getBlendedHillMaterial(x, y);
    } else if (terrain === TerrainType.FOREST || terrain === TerrainType.SWAMP) {
      topMat = this.getBlendedTileMaterial(terrain, x, y);
    }

    return [this.sideMaterial, topMat, this.sideMaterial];
  }

  private getBlendedTileMaterial(terrain: TerrainType, x?: number, y?: number): THREE.Material {
    const terrainKey = terrain === TerrainType.FOREST ? 'forest' : 'swamp';
    const fallbackMat = this.materials[terrainKey] || this.materials['grass'];

    if (x === undefined || y === undefined) {
      return fallbackMat;
    }

    const edgeDirections: HexDirection[] = [
      HexDirection.EAST,       // Edge 0
      HexDirection.SOUTHEAST,  // Edge 1
      HexDirection.SOUTHWEST,  // Edge 2
      HexDirection.WEST,       // Edge 3
      HexDirection.NORTHWEST,  // Edge 4
      HexDirection.NORTHEAST,  // Edge 5
    ];

    const edgeTransitions: number[] = [0, 0, 0, 0, 0, 0];
    let hasTransition = false;

    for (let k = 0; k < 6; k++) {
      const dir = edgeDirections[k];
      const neighborCoord = HexMapHelpers.directionCoordsMap[dir]?.({ x, y });
      if (
        neighborCoord &&
        neighborCoord.x >= 0 &&
        neighborCoord.x < this.hexMap.width &&
        neighborCoord.y >= 0 &&
        neighborCoord.y < this.hexMap.height
      ) {
        const neighborTerrain = this.getTerrainAt(neighborCoord.x, neighborCoord.y);
        // For forest and swamp hexagons, blend towards neighbouring grass/plain hexes
        if (neighborTerrain === TerrainType.PLAIN) {
          edgeTransitions[k] = 1.0;
          hasTransition = true;
        }
      }
    }

    if (!hasTransition) {
      return fallbackMat;
    }

    return this.createBlendedTerrainMaterial(terrain, x, y, edgeTransitions);
  }

  private createBlendedTerrainMaterial(
    terrain: TerrainType,
    x: number,
    y: number,
    edgeTransitions: number[]
  ): THREE.MeshStandardMaterial {
    const terrainKey = terrain === TerrainType.FOREST ? 'forest' : 'swamp';
    const overlayMat = (this.materials[terrainKey] as THREE.MeshStandardMaterial) || null;
    const grassMat = (this.materials['grass'] as THREE.MeshStandardMaterial) || null;

    const baseGrassColor = grassMat ? grassMat.color : new THREE.Color(0x3d7a42);
    const baseGrassMap = grassMat?.map || null;

    const overlayColor = overlayMat
      ? overlayMat.color.clone()
      : new THREE.Color(terrain === TerrainType.FOREST ? 0x2e5c33 : 0x4a5438);
    const overlayRoughness = overlayMat ? overlayMat.roughness : 0.85;
    const overlayMetalness = overlayMat ? overlayMat.metalness : (terrain === TerrainType.FOREST ? 0.1 : 0.05);
    const overlayMap = overlayMat?.map || null;

    const blendedMat = new THREE.MeshStandardMaterial({
      color: overlayColor,
      roughness: overlayRoughness,
      metalness: overlayMetalness,
      map: overlayMap,
    });

    const pos = this.hexToWorld(x, y);

    blendedMat.userData = {
      isBlendedTerrain: true,
      terrainType: terrain,
      edgeTransitions: [...edgeTransitions],
      hexCoords: { x, y },
    };

    blendedMat.customProgramCacheKey = () => `HexTerrainBlend_${terrainKey}_Eador`;

    blendedMat.onBeforeCompile = (shader) => {
      this.terrainSplatting.applyToShader(shader);

      shader.uniforms.uBaseColor = { value: baseGrassColor };
      shader.uniforms.uBaseMap = { value: baseGrassMap };
      shader.uniforms.uHasBaseMap = { value: baseGrassMap ? 1.0 : 0.0 };
      shader.uniforms.uTileCenter = { value: new THREE.Vector2(pos.x, pos.z) };
      shader.uniforms.uHexRadius = { value: this.hexRadius };
      shader.uniforms.uEdgeTransitions = { value: [...edgeTransitions] };
      shader.uniforms.uTransitionWidth = { value: this.blendTransitionWidth };
      shader.uniforms.uNoiseStrength = { value: this.blendNoiseStrength };

      blendedMat.userData.shader = shader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
varying vec2 vTerrainWorldXZ;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vTerrainWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
varying vec2 vTerrainWorldXZ;
uniform vec3 uBaseColor;
uniform sampler2D uBaseMap;
uniform float uHasBaseMap;
uniform vec2 uTileCenter;
uniform float uHexRadius;
uniform float uEdgeTransitions[6];
uniform float uTransitionWidth;
uniform float uNoiseStrength;

float terrainEdgeHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float terrainEdgeNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = terrainEdgeHash(i);
  float b = terrainEdgeHash(i + vec2(1.0, 0.0));
  float c = terrainEdgeHash(i + vec2(0.0, 1.0));
  float d = terrainEdgeHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  vec2 localPos = vTerrainWorldXZ - uTileCenter;
  float apothem = uHexRadius * 0.86602540378;

  // Organic noise perturbation along hex edges
  float n = (terrainEdgeNoise(vTerrainWorldXZ * 4.0) - 0.5) * uNoiseStrength;

  // 6 edge outward normals for pointy-topped hex:
  // Edge 0: East, 1: Southeast, 2: Southwest, 3: West, 4: Northwest, 5: Northeast
  vec2 edgeNorms[6];
  edgeNorms[0] = vec2(1.0, 0.0);
  edgeNorms[1] = vec2(0.5, 0.8660254);
  edgeNorms[2] = vec2(-0.5, 0.8660254);
  edgeNorms[3] = vec2(-1.0, 0.0);
  edgeNorms[4] = vec2(-0.5, -0.8660254);
  edgeNorms[5] = vec2(0.5, -0.8660254);

  float overlayAlpha = 1.0;
  for (int k = 0; k < 6; k++) {
    if (uEdgeTransitions[k] > 0.01) {
      float proj = dot(localPos, edgeNorms[k]);
      float normDist = (proj / apothem) + n;
      float t = smoothstep(1.0 - uTransitionWidth, 1.0, normDist);
      overlayAlpha *= (1.0 - t * uEdgeTransitions[k]);
    }
  }

  vec4 baseTerrainColor = vec4(uBaseColor, 1.0);
  #ifdef USE_MAP
    if (uHasBaseMap > 0.5) {
      vec4 baseTexColor = texture2D(uBaseMap, vMapUv);
      baseTerrainColor *= baseTexColor;
    }
  #endif

  diffuseColor = mix(baseTerrainColor, diffuseColor, overlayAlpha);
}`
      );
    };

    this.blendedTileMaterials.push(blendedMat);
    return blendedMat;
  }

  public getTileEdgeTransitions(x: number, y: number): number[] | null {
    const mesh = this.tileMeshes.get(`${x},${y}`);
    return mesh?.userData?.edgeTransitions ?? null;
  }

  public isTileBlended(x: number, y: number): boolean {
    const transitions = this.getTileEdgeTransitions(x, y);
    return transitions ? transitions.some((w: number) => w > 0) : false;
  }

  public isHill(x: number, y: number): boolean {
    return this.getTerrainAt(x, y) === TerrainType.HILL;
  }

  public getHillMesaRadius(x: number, y: number): number {
    return this.hillMesaRadii.get(`${x},${y}`) ?? this.hexRadius * 0.77;
  }

  public isSwamp(x: number, y: number): boolean {
    return this.getTerrainAt(x, y) === TerrainType.SWAMP;
  }

  public getSwampInsetRadius(_x?: number, _y?: number): number {
    return this.hexRadius * 0.76;
  }

  public getSwampDepression(_x?: number, _y?: number): number {
    return -0.08;
  }

  /**
   * Deterministically returns one of 3 distinct hill model variations (0, 1, or 2)
   * based on the hex tile coordinates.
   */
  public getHillVariation(x: number, y: number): number {
    return Math.abs((x * 7 + y * 13 + 1)) % 3;
  }

  /**
   * Calculates a 3D displacement vector for an inner hexagon point in a given variation.
   * Displacements are bounded within 3% of hex size (2 * hexRadius) in any direction,
   * combining components in X, Y, and Z axes.
   */
  public getHillInnerHexDisplacement(
    variation: number,
    pointIndex: number
  ): { dx: number; dy: number; dz: number } {
    const hexSize = this.hexRadius * 2;
    const maxDisp = 0.03 * hexSize; // 3% of hex size (0.06 with radius 1.0)
    const varIdx = Math.abs(variation) % 3;

    // Distinct deterministic seeds per variation and point
    const seed = ((varIdx + 1) * 137 + (pointIndex + 1) * 59) % 1000;
    const phi = (seed / 1000) * Math.PI * 2;
    const theta = (((seed * 3) % 1000) / 1000 - 0.5) * Math.PI * 0.7; // pitch angle in Y
    const mag = maxDisp * (0.65 + 0.3 * (((seed * 7) % 1000) / 1000));

    // Combined 3D displacement vector with non-zero X, Y, and Z components
    const dx = Math.cos(phi) * Math.cos(theta) * mag;
    const dy = Math.sin(theta) * mag * 0.45;
    const dz = Math.sin(phi) * Math.cos(theta) * mag;

    return { dx, dy, dz };
  }

  /**
   * Returns or generates the shared procedural transparency mask texture for hill tops.
   * Center has high grass opacity (white), smoothly falling off towards the outer edges (black/dirt).
   */
  public getHillMaskTexture(): THREE.Texture {
    if (!this.hillMaskTexture) {
      this.hillMaskTexture = this.createHillTransparencyMaskTexture();
    }
    return this.hillMaskTexture;
  }

  private createHillTransparencyMaskTexture(size = 256): THREE.Texture {
    let texture: THREE.Texture;
    const center = size / 2;
    const maxRadius = size * 0.44;

    const pixels = new Uint8Array(size * size * 4);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - center;
        const dy = py - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normDist = dist / maxRadius;

        // Subtle organic noise for natural edge irregularity
        const nx = (px / size) * 8.0;
        const ny = (py / size) * 8.0;
        const hash = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
        const noise = (hash - Math.floor(hash) - 0.5) * 0.16;

        // Mask value: 1.0 at center (grassy), smoothly fading to 0.0 at outer sides (dirt)
        // Center (0.0 to 0.34) is grassy; 0.34 to 0.84 transitions; > 0.84 is dirt
        const t = Math.max(0, Math.min(1, (normDist + noise - 0.34) / (0.84 - 0.34)));
        const smoothT = t * t * (3 - 2 * t);
        const grassAlpha = 1.0 - smoothT;

        const val = Math.round(grassAlpha * 255);
        const idx = (py * size + px) * 4;
        pixels[idx] = val;     // R
        pixels[idx + 1] = val; // G
        pixels[idx + 2] = val; // B
        pixels[idx + 3] = 255; // A
      }
    }

    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.createImageData(size, size);
          imgData.data.set(pixels);
          ctx.putImageData(imgData, 0, 0);
          texture = new THREE.CanvasTexture(canvas);
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          return texture;
        }
      } catch {
        // Fallback to DataTexture
      }
    }

    texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Creates a blended material for hill hexes using mud/hill texture as base
   * overlaid with grass hex texture via a transparency mask (center grassy, outer sides dirt).
   */
  public getBlendedHillMaterial(x?: number, y?: number): THREE.Material {
    const mudMat = (this.materials['dirt'] as THREE.MeshStandardMaterial) || null;
    const grassMat = (this.materials['grass'] as THREE.MeshStandardMaterial) || null;

    const baseMudColor = mudMat?.color ? mudMat.color.clone() : new THREE.Color(0x6e5138);
    const baseMudMap = mudMat?.map || null;

    const overlayGrassColor = grassMat?.color ? grassMat.color.clone() : new THREE.Color(0x3d7a42);
    const overlayGrassMap = grassMat?.map || null;

    const maskTex = this.getHillMaskTexture();

    const blendedMat = new THREE.MeshStandardMaterial({
      color: baseMudColor,
      map: baseMudMap,
      roughness: mudMat ? mudMat.roughness : 0.9,
      metalness: mudMat ? mudMat.metalness : 0.05,
      side: THREE.DoubleSide,
    });

    const pos = x !== undefined && y !== undefined ? this.hexToWorld(x, y) : new THREE.Vector3(0, 0, 0);
    const rTop = x !== undefined && y !== undefined ? this.getHillMesaRadius(x, y) : this.hexRadius * 0.77;

    blendedMat.userData = {
      isHillBlendedMaterial: true,
      terrainType: TerrainType.HILL,
      baseTexture: baseMudMap,
      overlayTexture: overlayGrassMap,
      transparencyMask: maskTex,
      mudColor: baseMudColor,
      grassColor: overlayGrassColor,
      mesaRadius: rTop,
      tileCoords: x !== undefined && y !== undefined ? { x, y } : undefined,
    };

    blendedMat.customProgramCacheKey = () => 'HexTerrainBlend_Hill_Eador';

    blendedMat.onBeforeCompile = (shader) => {
      this.terrainSplatting.applyToShader(shader);

      shader.uniforms.uMudColor = { value: baseMudColor };
      shader.uniforms.uMudMap = { value: baseMudMap };
      shader.uniforms.uHasMudMap = { value: baseMudMap ? 1.0 : 0.0 };

      shader.uniforms.uGrassColor = { value: overlayGrassColor };
      shader.uniforms.uGrassMap = { value: overlayGrassMap };
      shader.uniforms.uHasGrassMap = { value: overlayGrassMap ? 1.0 : 0.0 };

      shader.uniforms.uMaskMap = { value: maskTex };
      shader.uniforms.uHasMaskMap = { value: maskTex ? 1.0 : 0.0 };

      shader.uniforms.uTileCenter = { value: new THREE.Vector2(pos.x, pos.z) };
      shader.uniforms.uMesaRadius = { value: rTop };
      shader.uniforms.uHexRadius = { value: this.hexRadius };

      blendedMat.userData.shader = shader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
varying vec2 vTerrainWorldXZ;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vTerrainWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
varying vec2 vTerrainWorldXZ;
uniform vec3 uMudColor;
uniform sampler2D uMudMap;
uniform float uHasMudMap;
uniform vec3 uGrassColor;
uniform sampler2D uGrassMap;
uniform float uHasGrassMap;
uniform sampler2D uMaskMap;
uniform float uHasMaskMap;
uniform vec2 uTileCenter;
uniform float uMesaRadius;
uniform float uHexRadius;

float hillTerrainNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453123);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453123);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453123);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453123);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  float maskAlpha = 0.0;
  #ifdef USE_MAP
    if (uHasMaskMap > 0.5) {
      maskAlpha = texture2D(uMaskMap, vMapUv).r;
    }
  #endif
  if (uHasMaskMap <= 0.5) {
    vec2 localPos = vTerrainWorldXZ - uTileCenter;
    float dist = length(localPos);
    float normDist = dist / max(0.001, uMesaRadius);
    float n = (hillTerrainNoise(vTerrainWorldXZ * 4.0) - 0.5) * 0.22;
    maskAlpha = 1.0 - smoothstep(0.32, 0.82, normDist + n);
  }

  // Base mud / dirt color
  vec4 mudColor = vec4(uMudColor, 1.0);
  #ifdef USE_MAP
    if (uHasMudMap > 0.5) {
      mudColor *= texture2D(uMudMap, vMapUv);
    }
  #endif

  // Overlay grass color
  vec4 grassColor = vec4(uGrassColor, 1.0);
  if (uHasGrassMap > 0.5) {
    grassColor *= texture2D(uGrassMap, vMapUv);
  }

  // Final blend: mud base with grass overlay masked by transparency
  diffuseColor = mix(mudColor, grassColor, maskAlpha);
}`
      );
    };

    this.blendedTileMaterials.push(blendedMat);
    return blendedMat;
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

          // Deterministic uniform elevation for all hills in this connected cluster (reduced to 66%: ~0.19 to 0.23)
          const clusterHash = ((clusterId * 2654435761) >>> 0) % 1000;
          const elevation = 0.19 + (clusterHash / 1000) * 0.04;
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
  /**
   * Generates a procedural mesa hill geometry with:
   * 1. 3 distinct model variations with organic 3D displacements on inner hexagon points (bounded by 3% of hex size).
   * 2. Additional subdivision points, concentric ring, and edge midpoints for natural smoothing and roundness.
   * 3. Flat top mesa plateau with subtle crowning of radius rTop at cluster elevation for unit placement.
   * 4. Full plateau extension along shared boundaries with adjacent hills (seamless ridge).
   * 5. Multi-tier organic slopes descending to y = 0 on non-hill edges with cosine S-curve curvature.
   * 6. Vertical bluff/cliff sealing quads at transition corners.
   * 7. Subterranean foundation skirts below y = 0 to match neighboring tile skirts.
   * 8. Computed smooth vertex normals for natural hill lighting.
   */
  public createHillTileGeometry(x: number, y: number, variation?: number): THREE.BufferGeometry {
    const varIndex = variation !== undefined ? (Math.abs(variation) % 3) : this.getHillVariation(x, y);
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

    // 1. Center of the mesa top plateau with subtle organic crowning for roundness
    const crownHeight = 0.02 * elevation;
    const vCenter = addVertex(0, elevation + crownHeight, 0);

    // 2. Inner mesa hexagon points (12 points around rim at rTop: 6 corners and 6 midpoints)
    // Corners k = 0..5 at indices 2*k; midpoints of edge e at indices (2*e + 11) % 12
    const rimNominal: { x: number; y: number; z: number }[] = [];
    for (let k = 0; k < 6; k++) {
      // Corner k
      rimNominal.push({
        x: cosK[k] * rTop,
        y: elevation,
        z: sinK[k] * rTop,
      });
      // Midpoint between corner k and next corner (k+1)%6
      const nextK = (k + 1) % 6;
      rimNominal.push({
        x: (cosK[k] + cosK[nextK]) * 0.5 * rTop,
        y: elevation,
        z: (sinK[k] + sinK[nextK]) * 0.5 * rTop,
      });
    }

    // Add 3D displacements to inner hexagon points bounded within 3% of hex size
    const topK: number[] = [];
    for (let i = 0; i < 12; i++) {
      const pt = rimNominal[i];
      const disp = this.getHillInnerHexDisplacement(varIndex, i);
      topK.push(addVertex(pt.x + disp.dx, pt.y + disp.dy, pt.z + disp.dz));
    }

    // Intermediate concentric ring at 0.5 * rTop for smoothing and gradual dome slope
    const ringK: number[] = [];
    const ringY = elevation + crownHeight * 0.6;
    for (let i = 0; i < 12; i++) {
      const pt = rimNominal[i];
      const disp = this.getHillInnerHexDisplacement(varIndex, i);
      ringK.push(
        addVertex(
          pt.x * 0.5 + disp.dx * 0.4,
          ringY + disp.dy * 0.4,
          pt.z * 0.5 + disp.dz * 0.4
        )
      );
    }

    // Mesa top center fan to intermediate ring (12 triangles)
    for (let i = 0; i < 12; i++) {
      const nextI = (i + 1) % 12;
      addTopTriangle(vCenter, ringK[nextI], ringK[i]);
    }

    // Intermediate ring to inner hexagon rim (24 triangles: 12 quads)
    for (let i = 0; i < 12; i++) {
      const nextI = (i + 1) % 12;
      addTopTriangle(ringK[i], ringK[nextI], topK[nextI]);
      addTopTriangle(ringK[i], topK[nextI], topK[i]);
    }

    // 3. For each edge e = 0..5:
    // Start corner c1 = (e + 5) % 6, end corner c2 = e
    for (let e = 0; e < 6; e++) {
      const c1 = (e + 5) % 6;
      const c2 = e;
      const isHill = isHillNeighbor[e];

      const startRimIdx = (2 * e + 10) % 12;
      const midRimIdx = (2 * e + 11) % 12;
      const endRimIdx = (2 * e) % 12;

      const r1Idx = topK[startRimIdx];
      const rMidIdx = topK[midRimIdx];
      const r2Idx = topK[endRimIdx];

      const b1x = cosK[c1] * R;
      const b1z = sinK[c1] * R;
      const b2x = cosK[c2] * R;
      const b2z = sinK[c2] * R;
      const bMidx = (b1x + b2x) * 0.5;
      const bMidz = (b1z + b2z) * 0.5;

      if (isHill) {
        // Connected to adjacent hill: flat plateau extends to hex boundary at elevation
        const b1High = addVertex(b1x, elevation, b1z);
        const bMidHigh = addVertex(bMidx, elevation, bMidz);
        const b2High = addVertex(b2x, elevation, b2z);

        // Quad between [r1Idx, rMidIdx] and [b1High, bMidHigh]
        addTopTriangle(r1Idx, rMidIdx, bMidHigh);
        addTopTriangle(r1Idx, bMidHigh, b1High);

        // Quad between [rMidIdx, r2Idx] and [bMidHigh, b2High]
        addTopTriangle(rMidIdx, r2Idx, b2High);
        addTopTriangle(rMidIdx, b2High, bMidHigh);
      } else {
        // Bordering non-hill: natural smooth slope descending to y = 0 at hex boundary
        // Tier 1 (t = 0.35) and Tier 2 (t = 0.70) with cosine S-curve easing
        const t1 = 0.35;
        const t2 = 0.70;
        const y1 = elevation * (0.5 + 0.5 * Math.cos(Math.PI * t1));
        const y2 = elevation * (0.5 + 0.5 * Math.cos(Math.PI * t2));

        // Subtle deterministic variation on slope intermediate points
        const seed1 = (((x * 127 + y * 311 + e * 73 + varIndex * 19) * 16807) >>> 0) % 1000;
        const seed2 = (((x * 241 + y * 563 + e * 97 + varIndex * 23) * 16807) >>> 0) % 1000;
        const var1 = (seed1 / 1000 - 0.5) * 0.02 * R;
        const var2 = (seed2 / 1000 - 0.5) * 0.02 * R;

        const pRim1 = rimNominal[startRimIdx];
        const pRimMid = rimNominal[midRimIdx];
        const pRim2 = rimNominal[endRimIdx];

        // Tier 1 points
        const m1_1 = addVertex(
          pRim1.x * (1 - t1) + b1x * t1 + var1,
          y1,
          pRim1.z * (1 - t1) + b1z * t1 + var1
        );
        const mMid_1 = addVertex(
          pRimMid.x * (1 - t1) + bMidx * t1,
          y1,
          pRimMid.z * (1 - t1) + bMidz * t1
        );
        const m2_1 = addVertex(
          pRim2.x * (1 - t1) + b2x * t1 + var2,
          y1,
          pRim2.z * (1 - t1) + b2z * t1 + var2
        );

        // Tier 2 points
        const m1_2 = addVertex(
          pRim1.x * (1 - t2) + b1x * t2 + var1 * 0.5,
          y2,
          pRim1.z * (1 - t2) + b1z * t2 + var1 * 0.5
        );
        const mMid_2 = addVertex(
          pRimMid.x * (1 - t2) + bMidx * t2,
          y2,
          pRimMid.z * (1 - t2) + bMidz * t2
        );
        const m2_2 = addVertex(
          pRim2.x * (1 - t2) + b2x * t2 + var2 * 0.5,
          y2,
          pRim2.z * (1 - t2) + b2z * t2 + var2 * 0.5
        );

        // Boundary base at y = 0
        const b1Low = addVertex(b1x, 0, b1z);
        const bMidLow = addVertex(bMidx, 0, bMidz);
        const b2Low = addVertex(b2x, 0, b2z);

        // Slopes Tier 0 -> Tier 1
        addTopTriangle(r1Idx, rMidIdx, mMid_1);
        addTopTriangle(r1Idx, mMid_1, m1_1);
        addTopTriangle(rMidIdx, r2Idx, m2_1);
        addTopTriangle(rMidIdx, m2_1, mMid_1);

        // Slopes Tier 1 -> Tier 2
        addTopTriangle(m1_1, mMid_1, mMid_2);
        addTopTriangle(m1_1, mMid_2, m1_2);
        addTopTriangle(mMid_1, m2_1, m2_2);
        addTopTriangle(mMid_1, m2_2, mMid_2);

        // Slopes Tier 2 -> Ground Boundary (y = 0)
        addTopTriangle(m1_2, mMid_2, bMidLow);
        addTopTriangle(m1_2, bMidLow, b1Low);
        addTopTriangle(mMid_2, m2_2, b2Low);
        addTopTriangle(mMid_2, b2Low, bMidLow);

        // Foundation skirts below y = 0 down to skirtBottom
        const s1 = addVertex(b1x * 0.97, skirtBottom, b1z * 0.97);
        const sMid = addVertex(bMidx * 0.97, skirtBottom, bMidz * 0.97);
        const s2 = addVertex(b2x * 0.97, skirtBottom, b2z * 0.97);

        addSkirtTriangle(b1Low, bMidLow, sMid);
        addSkirtTriangle(b1Low, sMid, s1);
        addSkirtTriangle(bMidLow, b2Low, s2);
        addSkirtTriangle(bMidLow, s2, sMid);
      }
    }

    // 4. Transitions at corners where hill-neighbor edge meets non-hill-neighbor edge
    for (let k = 0; k < 6; k++) {
      const ePrev = k;
      const eNext = (k + 1) % 6;
      const prevIsHill = isHillNeighbor[ePrev];
      const nextIsHill = isHillNeighbor[eNext];

      const cornerRimIdx = topK[(2 * k) % 12];
      const bHigh = addVertex(cosK[k] * R, elevation, sinK[k] * R);
      const bLow = addVertex(cosK[k] * R, 0, sinK[k] * R);

      if (prevIsHill && !nextIsHill) {
        addTopTriangle(cornerRimIdx, bLow, bHigh);
      } else if (!prevIsHill && nextIsHill) {
        addTopTriangle(cornerRimIdx, bHigh, bLow);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const combinedIndices = [...topIndices, ...skirtIndices];
    geometry.setIndex(combinedIndices);

    // Group 1: Plateau top, slopes, and cliffs using materialIndex = 1 (blended hill terrain material)
    geometry.addGroup(0, topIndices.length, 1);
    // Group 0: Foundation skirt below y=0 using materialIndex = 0 (side material)
    if (skirtIndices.length > 0) {
      geometry.addGroup(topIndices.length, skirtIndices.length, 0);
    }

    geometry.userData = {
      isHillGeometry: true,
      variation: varIndex,
      elevation,
      mesaRadius: rTop,
    };

    // Compute smooth normals across rounded terrain slopes
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Generates a procedural swamp tile geometry as an inverted hill hex:
   * 1. Outer hex boundary at radius R is at y = 0 (exact same level as grass/plain hexes).
   * 2. Inset smaller hexagon of radius rInset at lower elevation (depression basin).
   * 3. Organic slopes descending from y = 0 on non-swamp edges down to the inset basin floor.
   * 4. Full basin extension along shared boundaries with adjacent swamps (seamless wetland pool).
   * 5. Transition cliff/slope sealing quads at transition corners.
   * 6. Subterranean foundation skirts below y = 0.
   * 7. Computed smooth vertex normals for natural marsh lighting.
   */
  public createSwampTileGeometry(x: number, y: number): THREE.BufferGeometry {
    const R = this.hexRadius;
    const rInset = this.getSwampInsetRadius(x, y);
    const depression = this.getSwampDepression(x, y);
    const skirtBottom = -this.hexHeight;

    // Check which of the 6 edges border another swamp
    const isSwampNeighbor: boolean[] = [];
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
      let neighborIsSwamp = false;
      if (
        neighborCoord &&
        neighborCoord.x >= 0 &&
        neighborCoord.x < this.hexMap.width &&
        neighborCoord.y >= 0 &&
        neighborCoord.y < this.hexMap.height
      ) {
        neighborIsSwamp = this.isSwamp(neighborCoord.x, neighborCoord.y);
      }
      isSwampNeighbor.push(neighborIsSwamp);
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

    // 1. Center of the sunken swamp basin
    const vCenter = addVertex(0, depression, 0);

    // 2. Inset hexagon rim (12 points around inset at rInset, height = depression: 6 corners + 6 midpoints)
    const insetPoints: { x: number; y: number; z: number }[] = [];
    for (let k = 0; k < 6; k++) {
      // Corner k
      insetPoints.push({
        x: cosK[k] * rInset,
        y: depression,
        z: sinK[k] * rInset,
      });
      // Midpoint between corner k and next corner (k+1)%6
      const nextK = (k + 1) % 6;
      insetPoints.push({
        x: (cosK[k] + cosK[nextK]) * 0.5 * rInset,
        y: depression,
        z: (sinK[k] + sinK[nextK]) * 0.5 * rInset,
      });
    }

    const insetK: number[] = [];
    for (let i = 0; i < 12; i++) {
      const pt = insetPoints[i];
      insetK.push(addVertex(pt.x, pt.y, pt.z));
    }

    // Inset basin floor fan (12 triangles connecting center to inset rim)
    for (let i = 0; i < 12; i++) {
      const nextI = (i + 1) % 12;
      addTopTriangle(vCenter, insetK[nextI], insetK[i]);
    }

    // 3. For each edge e = 0..5:
    // Start corner c1 = (e + 5) % 6, end corner c2 = e
    for (let e = 0; e < 6; e++) {
      const c1 = (e + 5) % 6;
      const c2 = e;
      const isNeighborSwamp = isSwampNeighbor[e];

      const startRimIdx = (2 * e + 10) % 12;
      const midRimIdx = (2 * e + 11) % 12;
      const endRimIdx = (2 * e) % 12;

      const in1Idx = insetK[startRimIdx];
      const inMidIdx = insetK[midRimIdx];
      const in2Idx = insetK[endRimIdx];

      const b1x = cosK[c1] * R;
      const b1z = sinK[c1] * R;
      const b2x = cosK[c2] * R;
      const b2z = sinK[c2] * R;
      const bMidx = (b1x + b2x) * 0.5;
      const bMidz = (b1z + b2z) * 0.5;

      if (isNeighborSwamp) {
        // Connected to adjacent swamp: depression floor extends to hex boundary at depression
        const b1Low = addVertex(b1x, depression, b1z);
        const bMidLow = addVertex(bMidx, depression, bMidz);
        const b2Low = addVertex(b2x, depression, b2z);

        // Quad between [in1Idx, inMidIdx] and [b1Low, bMidLow]
        addTopTriangle(in1Idx, inMidIdx, bMidLow);
        addTopTriangle(in1Idx, bMidLow, b1Low);

        // Quad between [inMidIdx, in2Idx] and [bMidLow, b2Low]
        addTopTriangle(inMidIdx, in2Idx, b2Low);
        addTopTriangle(inMidIdx, b2Low, bMidLow);

        // Foundation skirt below depression down to skirtBottom
        const s1 = addVertex(b1x * 0.97, skirtBottom, b1z * 0.97);
        const sMid = addVertex(bMidx * 0.97, skirtBottom, bMidz * 0.97);
        const s2 = addVertex(b2x * 0.97, skirtBottom, b2z * 0.97);

        addSkirtTriangle(b1Low, bMidLow, sMid);
        addSkirtTriangle(b1Low, sMid, s1);
        addSkirtTriangle(bMidLow, b2Low, s2);
        addSkirtTriangle(bMidLow, s2, sMid);
      } else {
        // Bordering non-swamp: linear depth slope down from y = 0 at hex boundary to depression at inset hex
        const b1High = addVertex(b1x, 0, b1z);
        const bMidHigh = addVertex(bMidx, 0, bMidz);
        const b2High = addVertex(b2x, 0, b2z);

        // Linear depth slope quads from hex boundary (y = 0) directly to inner inset hexagon (y = depression)
        addTopTriangle(b1High, in1Idx, inMidIdx);
        addTopTriangle(b1High, inMidIdx, bMidHigh);
        addTopTriangle(bMidHigh, inMidIdx, in2Idx);
        addTopTriangle(bMidHigh, in2Idx, b2High);

        // Foundation skirt below y = 0 down to skirtBottom
        const s1 = addVertex(b1x * 0.97, skirtBottom, b1z * 0.97);
        const sMid = addVertex(bMidx * 0.97, skirtBottom, bMidz * 0.97);
        const s2 = addVertex(b2x * 0.97, skirtBottom, b2z * 0.97);

        addSkirtTriangle(b1High, bMidHigh, sMid);
        addSkirtTriangle(b1High, sMid, s1);
        addSkirtTriangle(bMidHigh, b2High, s2);
        addSkirtTriangle(bMidHigh, s2, sMid);
      }
    }

    // 4. Transitions at corners where swamp-neighbor edge meets non-swamp-neighbor edge
    for (let k = 0; k < 6; k++) {
      const ePrev = k;
      const eNext = (k + 1) % 6;
      const prevIsSwamp = isSwampNeighbor[ePrev];
      const nextIsSwamp = isSwampNeighbor[eNext];

      const cornerInsetIdx = insetK[(2 * k) % 12];
      const bHigh = addVertex(cosK[k] * R, 0, sinK[k] * R);
      const bLow = addVertex(cosK[k] * R, depression, sinK[k] * R);

      if (prevIsSwamp && !nextIsSwamp) {
        addTopTriangle(cornerInsetIdx, bLow, bHigh);
      } else if (!prevIsSwamp && nextIsSwamp) {
        addTopTriangle(cornerInsetIdx, bHigh, bLow);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const combinedIndices = [...topIndices, ...skirtIndices];
    geometry.setIndex(combinedIndices);

    // Group 1: Basin floor and slopes using materialIndex = 1 (swamp terrain material)
    geometry.addGroup(0, topIndices.length, 1);
    // Group 0: Foundation skirt below y=0 using materialIndex = 0 (side material)
    if (skirtIndices.length > 0) {
      geometry.addGroup(topIndices.length, skirtIndices.length, 0);
    }

    geometry.userData = {
      isSwampGeometry: true,
      depression,
      insetRadius: rInset,
    };

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
    hexGeometry.userData = { isSharedAsset: true };

    const sharedHexEdges = new THREE.EdgesGeometry(hexGeometry);
    sharedHexEdges.userData = { isSharedAsset: true };

    const sharedEdgeLineMat = new THREE.LineBasicMaterial({
      color: 0x182a20,
      transparent: true,
      opacity: 0.6,
    });
    sharedEdgeLineMat.userData = { isSharedAsset: true };

    this.tileMeshList = [];

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const terrain = this.getTerrainAt(x, y);
        const tileMaterials = this.getTileMaterials(terrain, x, y);
        const pos = this.hexToWorld(x, y);
        const edgeTransitions = (tileMaterials[1] as any)?.userData?.edgeTransitions ?? [0, 0, 0, 0, 0, 0];

        let mesh: THREE.Mesh;
        if (terrain === TerrainType.HILL) {
          const hillGeometry = this.createHillTileGeometry(x, y);
          mesh = new THREE.Mesh(hillGeometry, tileMaterials);
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.receiveShadow = true;
          mesh.userData = {
            hexX: x,
            hexY: y,
            isHexTile: true,
            terrainType: terrain,
            edgeTransitions,
            hillVariation: this.getHillVariation(x, y),
          };

          // Crease wireframe outlining the mesa plateau rim
          const edges = new THREE.EdgesGeometry(hillGeometry, 25);
          const line = new THREE.LineSegments(edges, sharedEdgeLineMat);
          line.updateMatrix();
          line.matrixAutoUpdate = false;
          mesh.add(line);
        } else if (terrain === TerrainType.SWAMP) {
          const swampGeometry = this.createSwampTileGeometry(x, y);
          mesh = new THREE.Mesh(swampGeometry, tileMaterials);
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.receiveShadow = true;
          mesh.userData = {
            hexX: x,
            hexY: y,
            isHexTile: true,
            terrainType: terrain,
            edgeTransitions,
            isSwamp: true,
          };

          const edges = new THREE.EdgesGeometry(swampGeometry, 25);
          const line = new THREE.LineSegments(edges, sharedEdgeLineMat);
          line.updateMatrix();
          line.matrixAutoUpdate = false;
          mesh.add(line);
        } else {
          let elevation = 0;
          if (terrain === TerrainType.WATER) {
            elevation = -0.08;
          }

          mesh = new THREE.Mesh(hexGeometry, tileMaterials);
          mesh.position.set(pos.x, pos.y + elevation - this.hexHeight * 0.5, pos.z);
          mesh.receiveShadow = true;
          mesh.userData = { hexX: x, hexY: y, isHexTile: true, terrainType: terrain, edgeTransitions };

          // Subtle edge wireframe sharing geometry and material
          const line = new THREE.LineSegments(sharedHexEdges, sharedEdgeLineMat);
          line.updateMatrix();
          line.matrixAutoUpdate = false;
          mesh.add(line);
        }

        mesh.visible = false;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        this.group.add(mesh);
        mesh.updateMatrixWorld(true);

        this.tileMeshes.set(`${x},${y}`, mesh);
        this.tileMeshList.push(mesh);
      }
    }

    this.buildContinuousTerrainMesh();

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        if (this.getTerrainAt(x, y) === TerrainType.FOREST) {
          const pos = this.hexToWorld(x, y);
          this.populateForestTreesForHex(x, y, pos, this.getHexElevation(x, y));
        }
      }
    }

    this.rebuildGridBorders();
    this.rebuildCoords();
    this.rebuildRetreatFlags();
    this.rebuildOuterDecorations();
    this.rebuildGrassField();
    this.updateTreeCanopiesForBlowingLeaves();
  }

  /**
   * Populates a deterministic cluster of 3 to 5 low-poly 3D trees on a FOREST hex.
   * Each tree is ~75% as tall as the average humanoid unit (FOREST_TREE_TARGET_HEIGHT = 0.90
   * vs AVERAGE_UNIT_3D_HEIGHT = 1.20), arranged toward the outer ring of the hex so
   * units occupying the forest remain clearly visible.
   */
  private populateForestTreesForHex(
    x: number,
    y: number,
    worldPos: THREE.Vector3,
    elevation: number
  ): void {
    const key = `${x},${y}`;
    const tileSeed = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const treeCount = 3 + (tileSeed % 3); // 3, 4, or 5 trees per forest hex
    const baseAngleOffset = ((tileSeed % 360) * Math.PI) / 180;
    const treesForHex: THREE.Object3D[] = [];

    // Symmetric scale variations around 1.0 so the average height is exactly 0.75 * AVERAGE_UNIT_3D_HEIGHT
    const scaleOffsets = [0.0, -0.06, 0.06, -0.04, 0.04];

    const treeVariants: ForestTreeVariant[] = this.simpleTrees
      ? ['card_pine', 'card_oak', 'card_birch', 'card_willow', 'card_maple']
      : ['pine', 'pine_2', 'pine_3', 'pine_4', 'pine_5', 'oak', 'birch', 'willow', 'maple'];

    for (let i = 0; i < treeCount; i++) {
      const subSeed = (((tileSeed + i * 2654435761) >>> 0) % 1000) / 1000;
      const variant: ForestTreeVariant = treeVariants[(tileSeed + i) % treeVariants.length];
      const heightScale = 1.0 + scaleOffsets[i % scaleOffsets.length];
      const treeHeight = FOREST_TREE_TARGET_HEIGHT * heightScale;

      let treeObj: THREE.Object3D;
      const glbTpl = this.forestTreeTemplates[variant];
      if (glbTpl) {
        treeObj = glbTpl.clone(true);
        treeObj.scale.set(heightScale, heightScale, heightScale);
      } else {
        treeObj = buildLowPolyForestTreeMesh(variant, heightScale);
      }

      // Place trees along the outer ring (0.50 .. 0.74 * hexRadius) with angular spacing
      const angle =
        baseAngleOffset + (i * 2 * Math.PI) / treeCount + (subSeed - 0.5) * 0.32;
      const radialDist = this.hexRadius * (0.52 + (subSeed * 0.22));
      const tx = worldPos.x + Math.cos(angle) * radialDist;
      const tz = worldPos.z + Math.sin(angle) * radialDist;

      treeObj.position.set(tx, worldPos.y + elevation, tz);
      treeObj.rotation.y = subSeed * Math.PI * 2;
      treeObj.userData = {
        ...treeObj.userData,
        isForestTree: true,
        treeVariant: variant,
        hexX: x,
        hexY: y,
        treeHeight,
        averageUnitHeight: AVERAGE_UNIT_3D_HEIGHT,
        relativeToUnitHeight: treeHeight / AVERAGE_UNIT_3D_HEIGHT,
      };

      treeObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        child.updateMatrix();
        child.matrixAutoUpdate = false;
      });
      this.forestTreesGroup.add(treeObj);
      treeObj.updateMatrixWorld(true);
      treesForHex.push(treeObj);
    }

    this.forestTreesByHex.set(key, treesForHex);
  }

  public getForestTreesForHex(x: number, y: number): THREE.Object3D[] {
    return this.forestTreesByHex.get(`${x},${y}`) ?? [];
  }

  private clearForestTrees(): void {
    while (this.forestTreesGroup.children.length > 0) {
      const child = this.forestTreesGroup.children[0];
      this.forestTreesGroup.remove(child);
      child.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          if (mesh.geometry && !mesh.geometry.userData?.isSharedAsset) {
            mesh.geometry.dispose();
          }
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (!m.userData?.isSharedAsset) m.dispose();
            });
          } else if (mesh.material && !mesh.material.userData?.isSharedAsset) {
            mesh.material.dispose();
          }
        }
      });
    }
    this.forestTreesByHex.clear();
  }

  public setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    this.gridBordersGroup.visible = visible;
    this.terrainSplatting.setGridGlowVisible(visible);
  }

  public isGridVisible(): boolean {
    return this.showGrid;
  }

  public setGridBorderThickness(thickness: number): void {
    this.borderThickness = thickness;
    this.buildContinuousTerrainMesh();

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        if (this.getTerrainAt(x, y) === TerrainType.FOREST) {
          const pos = this.hexToWorld(x, y);
          this.populateForestTreesForHex(x, y, pos, this.getHexElevation(x, y));
        }
      }
    }

    this.rebuildGridBorders();
  }

  public setGridBorderColor(colorHex: string): void {
    this.borderColor = colorHex;
    this.buildContinuousTerrainMesh();

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        if (this.getTerrainAt(x, y) === TerrainType.FOREST) {
          const pos = this.hexToWorld(x, y);
          this.populateForestTreesForHex(x, y, pos, this.getHexElevation(x, y));
        }
      }
    }

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
        const pos = this.hexToWorld(x, y);

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
            depthWrite: false,
          });

          const coordGeo = new THREE.PlaneGeometry(0.85, 0.42, 4, 4);
          coordGeo.rotateX(-Math.PI * 0.5);
          const cPosAttr = coordGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < cPosAttr.count; i++) {
            const lx = cPosAttr.getX(i);
            const lz = cPosAttr.getZ(i);
            cPosAttr.setY(i, this.sampleElevationAtWorld(pos.x + lx, pos.z + lz) - elevation);
          }
          cPosAttr.needsUpdate = true;

          const mesh = new THREE.Mesh(coordGeo, mat);
          mesh.position.set(pos.x, pos.y + elevation + 0.015, pos.z);
          mesh.updateMatrix();
          mesh.matrixAutoUpdate = false;
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

    const linePositions: number[] = [];
    const r = this.hexRadius * 0.992;
    const subSegs = 3;

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const pos = this.hexToWorld(x, y);
        for (let e = 0; e < 6; e++) {
          const a0 = (e * Math.PI) / 3 + Math.PI / 6;
          const a1 = (((e + 1) % 6) * Math.PI) / 3 + Math.PI / 6;
          const x0 = pos.x + Math.cos(a0) * r;
          const z0 = pos.z + Math.sin(a0) * r;
          const x1 = pos.x + Math.cos(a1) * r;
          const z1 = pos.z + Math.sin(a1) * r;
          for (let s = 0; s < subSegs; s++) {
            const t0 = s / subSegs;
            const t1 = (s + 1) / subSegs;
            const sx0 = x0 + (x1 - x0) * t0;
            const sz0 = z0 + (z1 - z0) * t0;
            const sx1 = x0 + (x1 - x0) * t1;
            const sz1 = z0 + (z1 - z0) * t1;
            linePositions.push(
              sx0, this.sampleElevationAtWorld(sx0, sz0) + 0.008, sz0,
              sx1, this.sampleElevationAtWorld(sx1, sz1) + 0.008, sz1
            );
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.borderColor),
      transparent: true,
      opacity: 0.45,
      linewidth: this.borderThickness,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.name = 'ProjectedHexGridLines';
    this.gridBordersGroup.add(lines);
    this.gridBordersGroup.visible = this.showGrid;
  }

  public getHighlightOverlayTexture(): THREE.Texture | null {
    if (this.highlightOverlayTexture) return this.highlightOverlayTexture;
    if (typeof document === 'undefined') return null;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    const cx = size * 0.5;
    const cy = size * 0.5;
    const r = size * 0.45;
    const cornerRadius = size * 0.06;

    // Pointy-top hex corners matching Three.js hex orientation (angles 30, 90, 150, 210, 270, 330 deg)
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k * Math.PI) / 3 + Math.PI / 6;
      pts.push({
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
      });
    }

    const traceRoundedHex = () => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const prev = pts[(i + 5) % 6];
        const curr = pts[i];
        const next = pts[(i + 1) % 6];
        const d1x = prev.x - curr.x;
        const d1y = prev.y - curr.y;
        const len1 = Math.hypot(d1x, d1y) || 1;
        const d2x = next.x - curr.x;
        const d2y = next.y - curr.y;
        const len2 = Math.hypot(d2x, d2y) || 1;
        const sx = curr.x + (d1x / len1) * cornerRadius;
        const sy = curr.y + (d1y / len1) * cornerRadius;
        const ex = curr.x + (d2x / len2) * cornerRadius;
        const ey = curr.y + (d2y / len2) * cornerRadius;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
        ctx.quadraticCurveTo(curr.x, curr.y, ex, ey);
      }
      ctx.closePath();
    };

    traceRoundedHex();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fill();

    traceRoundedHex();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.highlightOverlayTexture = tex;
    return tex;
  }

  private createProjectedHexMesh(
    worldCenterX: number,
    worldCenterZ: number,
    centerElev: number,
    radius: number,
    colorHex: number,
    opacity: number
  ): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 4, 4);
    geo.rotateX(-Math.PI * 0.5);
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      posAttr.setY(i, this.sampleElevationAtWorld(worldCenterX + lx, worldCenterZ + lz) - centerElev);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      map: this.getHighlightOverlayTexture(),
      transparent: true,
      opacity: Math.min(1, opacity * 1.35 * 0.7 * 0.85),
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    return new THREE.Mesh(geo, mat);
  }

  private projectRingGeometryToHex(mesh: THREE.Mesh, cx: number, cz: number, centerElev: number): void {
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sx = mesh.scale.x;
    const sz = mesh.scale.z;
    const theta = mesh.rotation.y;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i) * sx;
      const lz = posAttr.getZ(i) * sz;
      const wx = cx + lx * cos + lz * sin;
      const wz = cz - lx * sin + lz * cos;
      const wy = this.sampleElevationAtWorld(wx, wz);
      posAttr.setY(i, wy - centerElev);
    }
    posAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  private createRingMesh(colorHex: number): THREE.Mesh {
    const innerR = this.hexRadius * 0.75;
    const outerR = this.hexRadius * 0.95;
    const segsPerEdge = 4;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let e = 0; e < 6; e++) {
      const a0 = (e * Math.PI) / 3 + Math.PI / 6;
      const a1 = (((e + 1) % 6) * Math.PI) / 3 + Math.PI / 6;
      const ix0 = Math.cos(a0) * innerR;
      const iz0 = Math.sin(a0) * innerR;
      const ix1 = Math.cos(a1) * innerR;
      const iz1 = Math.sin(a1) * innerR;
      const ox0 = Math.cos(a0) * outerR;
      const oz0 = Math.sin(a0) * outerR;
      const ox1 = Math.cos(a1) * outerR;
      const oz1 = Math.sin(a1) * outerR;

      for (let s = 0; s < segsPerEdge; s++) {
        const t0 = s / segsPerEdge;
        const t1 = (s + 1) / segsPerEdge;
        const base = positions.length / 3;
        positions.push(
          ix0 + (ix1 - ix0) * t0, 0, iz0 + (iz1 - iz0) * t0,
          ox0 + (ox1 - ox0) * t0, 0, oz0 + (oz1 - oz0) * t0,
          ix0 + (ix1 - ix0) * t1, 0, iz0 + (iz1 - iz0) * t1,
          ox0 + (ox1 - ox0) * t1, 0, oz0 + (oz1 - oz0) * t1
        );
        indices.push(base, base + 1, base + 3);
        indices.push(base, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
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
    this.hoverMesh.scale.set(1, 1, 1);
    this.projectRingGeometryToHex(this.hoverMesh, worldPos.x, worldPos.z, elev);
    this.hoverMesh.position.set(worldPos.x, elev + 0.035, worldPos.z);
    this.hoverMesh.visible = true;
  }

  public setSelectedUnitHex(coords: Coords | null, facing?: HexDirection): void {
    if (!coords) {
      this.selectedRingMesh.visible = false;
      this.selectedHaloMesh.visible = false;
      this.selectedHaloAnchor = null;
      this.facingIndicatorGroup.visible = false;
      return;
    }

    const worldPos = this.hexToWorld(coords.x, coords.y);
    const elev = this.getHexElevation(coords.x, coords.y);
    const isHill = this.isHill(coords.x, coords.y);
    const isSwamp = this.isSwamp(coords.x, coords.y);
    const scale = isHill
      ? this.getHillMesaRadius(coords.x, coords.y) / (this.hexRadius * 0.95)
      : (isSwamp ? this.getSwampInsetRadius(coords.x, coords.y) / (this.hexRadius * 0.95) : 1.0);

    this.selectedRingMesh.scale.set(scale, 1, scale);
    this.projectRingGeometryToHex(this.selectedRingMesh, worldPos.x, worldPos.z, elev);
    this.selectedRingMesh.position.set(worldPos.x, elev + 0.02, worldPos.z);
    this.selectedRingMesh.visible = false;

    this.selectedHaloAnchor = { x: worldPos.x, z: worldPos.z, elev };
    this.selectedHaloMesh.scale.set(scale, 1, scale);
    this.projectRingGeometryToHex(this.selectedHaloMesh, worldPos.x, worldPos.z, elev);
    this.selectedHaloMesh.position.set(worldPos.x, elev + 0.08, worldPos.z);
    this.selectedHaloMesh.visible = true;

    if (facing !== undefined && facing !== HexDirection.NONE) {
      const topWorldPos = new THREE.Vector3(worldPos.x, elev, worldPos.z);
      const indicatorRadius = isHill
        ? this.getHillMesaRadius(coords.x, coords.y)
        : (isSwamp ? this.getSwampInsetRadius(coords.x, coords.y) : undefined);
      this.updateFacingIndicator(topWorldPos, facing, indicatorRadius);
    } else {
      this.facingIndicatorGroup.visible = false;
    }
  }

  /**
   * Updates animations on the board, including rotating the selected unit halo disc
   * (30 seconds for a full 360 degree rotation).
   */
  public update(deltaMS: number): void {
    this.terrainSplatting.updateTime(deltaMS);

    if (this.selectedHaloMesh && this.selectedHaloMesh.visible) {
      const deltaAngle = (2 * Math.PI * deltaMS) / 30000;
      this.selectedHaloMesh.rotation.y = (this.selectedHaloMesh.rotation.y + deltaAngle) % (2 * Math.PI);
      if (this.selectedHaloAnchor) {
        this.projectRingGeometryToHex(
          this.selectedHaloMesh,
          this.selectedHaloAnchor.x,
          this.selectedHaloAnchor.z,
          this.selectedHaloAnchor.elev
        );
      }
    }

    this.windTime += deltaMS * 0.001;
    if (this.getWindStateFn) {
      const currentWind = this.getWindStateFn();
      if (currentWind) {
        this.currentWindAngleRad = currentWind.angleRad;
        this.currentWindStrength = currentWind.strength;
      }
    }
    updateOverviewWheatWind(this.windTime, this.currentWindAngleRad, this.currentWindStrength);
    const terrainShader = (this.continuousTerrainMesh?.material as any)?.userData?.shader;
    if (terrainShader?.uniforms?.uTime) {
      terrainShader.uniforms.uTime.value = this.windTime;
    }

    if (this.animatedFlagCloths.length > 0) {
      for (let i = 0; i < this.animatedFlagCloths.length; i++) {
        updateRetreatFlagWind(
          this.animatedFlagCloths[i],
          this.windTime,
          this.currentWindStrength,
          this.currentWindAngleRad
        );
      }
    }

    if (this.animatedWindmillSails.length > 0) {
      const sailDeltaAngle = (2 * Math.PI * deltaMS) / 14000;
      for (let i = 0; i < this.animatedWindmillSails.length; i++) {
        this.animatedWindmillSails[i].rotation.z =
          (this.animatedWindmillSails[i].rotation.z - sailDeltaAngle) % (2 * Math.PI);
      }
    }

    // Update wind-animated instanced grass field sway
    this.grassSystem.update(deltaMS);

    // Update tree wind swaying (trunk & branches & leaf flutter) and blowing leaves system
    const deltaSec = Math.max(0.001, deltaMS * 0.001);
    updateTreeWindState(this.currentWindAngleRad, this.currentWindStrength, deltaSec);
    this.blowingLeavesSystem.update(deltaMS);
  }

  public setWindState(windAngleRad: number, windStrength: number = 1.0): void {
    this.currentWindAngleRad = windAngleRad;
    this.currentWindStrength = windStrength;
    for (let i = 0; i < this.animatedFlagCloths.length; i++) {
      setRetreatFlagWindState(this.animatedFlagCloths[i], windAngleRad, windStrength);
    }
    this.grassSystem.setWindState(windAngleRad, windStrength);
    this.blowingLeavesSystem.setWindState(windAngleRad, windStrength);
    updateTreeWindState(windAngleRad, windStrength);
  }

  public getWindState(): { angleRad: number; strength: number } {
    return {
      angleRad: this.currentWindAngleRad,
      strength: this.currentWindStrength,
    };
  }

  public setMajorTerrainType(locationType: BattleLocationType | string): void {
    this.majorTerrainType = normalizeBattleLocationType(locationType, this.majorTerrainType);
    const shader = (this.continuousTerrainMesh?.material as any)?.userData?.shader;
    if (shader?.uniforms?.uOuterGroundColor?.value) {
      shader.uniforms.uOuterGroundColor.value.setHex(getOuterApronColorHex(this.majorTerrainType));
    }
    this.rebuildOuterDecorations();
  }

  public getMajorTerrainType(): BattleLocationType {
    if (this.getMajorTerrainTypeFn) {
      return normalizeBattleLocationType(this.getMajorTerrainTypeFn(), this.majorTerrainType);
    }
    return this.majorTerrainType;
  }

  public getBoardWorldBounds(): BoardWorldBounds {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const pos = this.hexToWorld(x, y);
        if (pos.x - this.hexRadius < minX) minX = pos.x - this.hexRadius;
        if (pos.x + this.hexRadius > maxX) maxX = pos.x + this.hexRadius;
        if (pos.z - this.hexRadius < minZ) minZ = pos.z - this.hexRadius;
        if (pos.z + this.hexRadius > maxZ) maxZ = pos.z + this.hexRadius;
      }
    }

    if (!Number.isFinite(minX)) {
      minX = -10;
      maxX = 10;
      minZ = -8;
      maxZ = 8;
    }

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      centerX: (minX + maxX) * 0.5,
      centerZ: (minZ + maxZ) * 0.5,
    };
  }

  public rebuildOuterDecorations(): void {
    this.clearOuterDecorations();
    const locationType = this.getMajorTerrainType();
    const bounds = this.getBoardWorldBounds();
    const { animatedWindmillSails } = populateOuterEnvironmentDecorations(
      this.outerDecorationsGroup,
      locationType,
      bounds,
      this.hexHeight,
      this.forestTreeTemplates,
      this.simpleTrees
    );
    this.animatedWindmillSails = animatedWindmillSails;
    this.rebuildGrassField();
    this.updateTreeCanopiesForBlowingLeaves();
  }

  /**
   * Scans all forest trees on the board and outer scenery trees to register their canopy
   * positions with the blowing leaves particle system.
   */
  public updateTreeCanopiesForBlowingLeaves(): void {
    const canopies: THREE.Vector3[] = [];
    this.forestTreesGroup.traverse((obj) => {
      if (obj.userData?.isForestTree) {
        const h = (obj.userData.treeHeight ?? 0.9) * 0.75;
        canopies.push(new THREE.Vector3(obj.position.x, obj.position.y + h, obj.position.z));
      }
    });
    this.outerDecorationsGroup.traverse((obj) => {
      if (
        obj.userData?.decorationType === 'forest_tree' ||
        obj.userData?.decorationType === 'plains_tree'
      ) {
        canopies.push(new THREE.Vector3(obj.position.x, obj.position.y + 0.75, obj.position.z));
      }
    });
    this.blowingLeavesSystem.setTreeCanopyPositions(canopies);
  }

  /**
   * Rebuilds the lightweight instanced grass field across playable plain/forest hexes
   * and perimeter meadows, orienting and swaying in the direction of the wind.
   */
  public rebuildGrassField(): void {
    this.grassSystem.clear();
    const positions: GrassClumpInstanceData[] = [];

    // Deterministic pseudo-random seed helper
    const seededRand = (seed: number) => {
      const s = Math.sin(seed * 91.345 + 0.123) * 43758.5453;
      return s - Math.floor(s);
    };

    // 1. Scatter grass clumps on playable PLAIN and FOREST tiles (excluding WATER)
    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const terrain = this.getTerrainAt(x, y);
        if (terrain === TerrainType.WATER) continue;

        const worldPos = this.hexToWorld(x, y);
        const elev = this.getHexElevation(x, y);
        const tileSeed = ((x * 73856093) ^ (y * 19349663)) >>> 0;

        // 2 to 4 grass clumps per eligible hex tile placed near edges/corners so center remains readable (doubled frequency)
        const clumpCount = 2 + (tileSeed % 3);
        for (let i = 0; i < clumpCount; i++) {
          const subSeed = (tileSeed + i * 179) >>> 0;
          const angle = (seededRand(subSeed) * Math.PI * 2);
          const dist = this.hexRadius * (0.38 + seededRand(subSeed + 1) * 0.40);
          const gx = worldPos.x + Math.cos(angle) * dist;
          const gz = worldPos.z + Math.sin(angle) * dist;
          const gy = worldPos.y + elev;
          const scale = 0.85 + seededRand(subSeed + 2) * 0.35;
          const rotY = seededRand(subSeed + 3) * Math.PI * 2;
          const modelType: GrassModelType = ((subSeed + i) % 3) as GrassModelType;

          positions.push({ x: gx, y: gy, z: gz, scale, rotationY: rotY, modelType });
        }
      }
    }

    // 2. Scatter perimeter grass clumps on outer ground apron (doubled count: 72 clumps)
    const bounds = this.getBoardWorldBounds();
    const margin = 2.4;
    const groundY = -this.hexHeight + 0.005;
    const outerCount = 72;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i * Math.PI * 2) / outerCount + seededRand(i * 13) * 0.15;
      const baseSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 0.5 + margin;
      const dist = baseSpan + seededRand(i * 29) * 8.5;
      const gx = bounds.centerX + Math.cos(angle) * dist;
      const gz = bounds.centerZ + Math.sin(angle) * dist;
      const scale = 0.95 + seededRand(i * 47) * 0.45;
      const rotY = seededRand(i * 53) * Math.PI * 2;
      const modelType: GrassModelType = (i % 3) as GrassModelType;

      positions.push({ x: gx, y: groundY, z: gz, scale, rotationY: rotY, modelType });
    }

    this.grassSystem.setWindState(this.currentWindAngleRad, this.currentWindStrength);
    this.grassSystem.buildGrassField(positions);
  }

  private clearOuterDecorations(): void {
    while (this.outerDecorationsGroup.children.length > 0) {
      const child = this.outerDecorationsGroup.children[0];
      this.outerDecorationsGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry && !mesh.geometry.userData?.isSharedAsset) {
            mesh.geometry.dispose();
          }
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (!m.userData?.isSharedAsset) m.dispose();
            });
          } else if (mesh.material && !mesh.material.userData?.isSharedAsset) {
            mesh.material.dispose();
          }
        }
      });
    }
    this.animatedWindmillSails = [];
  }

  public setRetreatPointsProvider(provider: (armyIndex: number) => Coords[]): void {
    this.getRetreatPoints = provider;
    this.rebuildRetreatFlags();
  }

  public setArmyBannerProvider(provider: (armyIndex: number) => string): void {
    this.getArmyBanner = provider;
    this.rebuildRetreatFlags();
  }

  public getBannerForArmy(armyIndex: number): string {
    if (this.getArmyBanner) {
      return this.getArmyBanner(armyIndex);
    }
    return getPlayerBanner(armyIndex);
  }

  /**
   * Rebuilds all retreat flags on their configured hexagon coordinates.
   * Flags are purely decorative pass-through objects and do not block squad placement.
   */
  public rebuildRetreatFlags(): void {
    const sharedSource = this.bannersTexture?.source ?? getSharedBannersTexture()?.source;
    const disposeMaterialMapIfStandalone = (m: any) => {
      const map = m?.map;
      if (map && !map.userData?.isSharedBannerAtlas && (!sharedSource || map.source !== sharedSource)) {
        map.dispose?.();
      }
    };

    while (this.retreatFlagsGroup.children.length > 0) {
      const child = this.retreatFlagsGroup.children[0];
      this.retreatFlagsGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              disposeMaterialMapIfStandalone(m);
              m.dispose();
            });
          } else if (mesh.material) {
            disposeMaterialMapIfStandalone(mesh.material);
            mesh.material.dispose();
          }
        }
      });
    }
    this.animatedFlagCloths = [];

    const atlasTex = this.bannersTexture ?? getSharedBannersTexture();

    // Place square war standard flags for army 0 and army 1
    for (const armyIndex of [0, 1]) {
      const points = this.getRetreatPointsForArmy(armyIndex);
      const bannerName = this.getBannerForArmy(armyIndex);
      const bannerTexture = atlasTex
        ? createBannerSubTexture(atlasTex, bannerName)
        : undefined;
      for (const pt of points) {
        if (pt.x < 0 || pt.x >= this.hexMap.width || pt.y < 0 || pt.y >= this.hexMap.height) {
          continue;
        }
        const flag = createRetreatFlagMesh(armyIndex, pt.x, pt.y, bannerName, bannerTexture);
        const worldPos = this.hexToWorld(pt.x, pt.y);
        const elevation = this.getHexElevation(pt.x, pt.y);

        // Position flagpole closer to the hex edge:
        // - Aligned centrally on the North-South axis (z = 0)
        // - To the side of the nearest map edge on the East-West axis (west for left player, east for right player)
        const offset = this.getRetreatFlagOffset(armyIndex, pt.x, pt.y);
        flag.position.set(worldPos.x + offset.x, worldPos.y + elevation, worldPos.z + offset.z);

        this.retreatFlagsGroup.add(flag);

        const cloth = flag.getObjectByName('Cloth') as THREE.Mesh;
        if (cloth) {
          setRetreatFlagWindState(cloth, this.currentWindAngleRad, this.currentWindStrength);
          this.animatedFlagCloths.push(cloth);
        }
      }
    }
  }

  /**
   * Calculates the local position offset for a retreat flag within its hex tile.
   * Aligned centrally on the North-South axis (z = 0) and positioned towards the nearest
   * map edge on the East-West axis (west for left-side player, east for right-side player).
   */
  public getRetreatFlagOffset(armyIndex: number, hexX: number, _hexY?: number): { x: number; z: number } {
    const distToWestEdge = hexX;
    const distToEastEdge = (this.hexMap.width - 1) - hexX;
    let isWest: boolean;
    if (distToWestEdge < distToEastEdge) {
      isWest = true;
    } else if (distToEastEdge < distToWestEdge) {
      isWest = false;
    } else {
      isWest = (armyIndex === 0);
    }

    const edgeDistance = this.hexRadius * 0.68;
    return {
      x: isWest ? -edgeDistance : edgeDistance,
      z: 0,
    };
  }

  private getRetreatPointsForArmy(armyIndex: number): Coords[] {
    if (this.getRetreatPoints) {
      return this.getRetreatPoints(armyIndex);
    }
    const pts: Coords[] = [];
    const edgeX = armyIndex === 0 ? 0 : Math.max(0, this.hexMap.width - 1);
    for (let y = 0; y < this.hexMap.height; y++) {
      pts.push({ x: edgeX, y });
    }
    return pts;
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

    // Position arrow on outer edge midpoint of hex in facing direction (pointy-topped)
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
    const baseRadius = mesaRadius ?? this.hexRadius;
    const dist = baseRadius * 0.72;

    arrowMesh.position.set(Math.cos(angle) * dist, 0.065, Math.sin(angle) * dist);
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

    // Walkable (Cyan / Soft Blue) projected onto continuous elevation
    walkableCells.forEach((c) => {
      const key = `${c.x},${c.y}`;
      const pos = this.hexToWorld(c.x, c.y);
      const elev = this.getHexElevation(c.x, c.y);
      const mesh = this.createProjectedHexMesh(pos.x, pos.z, elev, this.hexRadius * 0.96, 0x33aacc, 0.28);
      mesh.name = `Reach_Walkable[${c.x},${c.y}]`;
      mesh.position.set(pos.x, elev + 0.029, pos.z);
      this.group.add(mesh);
      this.overlayMeshes.set(key, mesh);
    });

    // Attackable (Orange / Red) projected onto continuous elevation
    attackableCells.forEach((c) => {
      const key = `atk_${c.x},${c.y}`;
      const pos = this.hexToWorld(c.x, c.y);
      const elev = this.getHexElevation(c.x, c.y);
      const mesh = this.createProjectedHexMesh(pos.x, pos.z, elev, this.hexRadius * 0.96, 0xee4433, 0.38);
      mesh.name = `Reach_Attackable[${c.x},${c.y}]`;
      mesh.position.set(pos.x, elev + 0.032, pos.z);
      this.group.add(mesh);
      this.overlayMeshes.set(key, mesh);
    });
  }

  public clearReachOverlays(): void {
    this.updateReachOverlays([], []);
  }

  public getOverlayMesh(key: string): THREE.Mesh | undefined {
    return this.overlayMeshes.get(key);
  }

  /**
   * Renders a semi-transparent perimeter wall and glowing boundary rim along the outer perimeter
   * of a given range matrix (e.g. ranged squad weapon attack range or active ranged skill reach).
   */
  public updateRangePerimeter(
    rangeMatrix: number[][],
    colorHex: number = 0x44aacc,
    wallHeight: number = 0.35
  ): void {
    this.clearRangePerimeter();

    if (!rangeMatrix || rangeMatrix.length === 0) return;

    this.buildRangePerimeterMeshesIntoGroup(
      this.rangePerimeterGroup,
      rangeMatrix,
      colorHex,
      wallHeight,
      'RangePerimeterWall',
      'RangePerimeterLines'
    );
  }

  /**
   * Renders a semi-transparent perimeter wall and rim lines along the outer attack range
   * perimeter of an enemy archer when selected in the enemy stats panel.
   */
  public updateEnemyRangePerimeter(
    rangeMatrix: number[][],
    colorHex: number = 0xff4444,
    wallHeight: number = 0.35
  ): void {
    this.clearEnemyRangePerimeter();

    if (!rangeMatrix || rangeMatrix.length === 0) return;

    this.buildRangePerimeterMeshesIntoGroup(
      this.enemyRangePerimeterGroup,
      rangeMatrix,
      colorHex,
      wallHeight,
      'EnemyRangePerimeterWall',
      'EnemyRangePerimeterLines'
    );
  }

  private buildRangePerimeterMeshesIntoGroup(
    targetGroup: THREE.Group,
    rangeMatrix: number[][],
    colorHex: number,
    wallHeight: number,
    wallName: string,
    linesName: string
  ): void {
    const edgeDirections: HexDirection[] = [
      HexDirection.EAST,       // Edge 0: Corner 5 (330°) to Corner 0 (30°)
      HexDirection.SOUTHEAST,  // Edge 1: Corner 0 (30°) to Corner 1 (90°)
      HexDirection.SOUTHWEST,  // Edge 2: Corner 1 (90°) to Corner 2 (150°)
      HexDirection.WEST,       // Edge 3: Corner 2 (150°) to Corner 3 (210°)
      HexDirection.NORTHWEST,  // Edge 4: Corner 3 (210°) to Corner 4 (270°)
      HexDirection.NORTHEAST,  // Edge 5: Corner 4 (270°) to Corner 5 (330°)
    ];

    const wallPositions: number[] = [];
    const linePositions: number[] = [];

    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        if ((rangeMatrix[x]?.[y] ?? 0) <= 0) continue;

        const center = this.hexToWorld(x, y);
        const elev = this.getHexElevation(x, y);
        const isHill = this.isHill(x, y);
        const isSwamp = this.isSwamp(x, y);
        const R = (isHill ? this.getHillMesaRadius(x, y) : (isSwamp ? this.getSwampInsetRadius(x, y) : this.hexRadius)) * 0.98;
        const yBase = elev + 0.02;
        const yTop = yBase + wallHeight;

        for (let e = 0; e < 6; e++) {
          const dir = edgeDirections[e];
          const neighbor = HexMapHelpers.directionCoordsMap[dir]?.({ x, y });
          const isOutside =
            !neighbor ||
            neighbor.x < 0 ||
            neighbor.x >= this.hexMap.width ||
            neighbor.y < 0 ||
            neighbor.y >= this.hexMap.height ||
            (rangeMatrix[neighbor.x]?.[neighbor.y] ?? 0) <= 0;

          if (isOutside) {
            const k1 = (e + 5) % 6;
            const k2 = e;
            const a1 = ((k1 * 60 + 30) * Math.PI) / 180;
            const a2 = ((k2 * 60 + 30) * Math.PI) / 180;

            const c1x = center.x + R * Math.cos(a1);
            const c1z = center.z + R * Math.sin(a1);
            const c2x = center.x + R * Math.cos(a2);
            const c2z = center.z + R * Math.sin(a2);

            // Wall quad (two triangles, double-sided)
            // Triangle 1: (c1, yBase), (c2, yBase), (c2, yTop)
            wallPositions.push(c1x, yBase, c1z);
            wallPositions.push(c2x, yBase, c2z);
            wallPositions.push(c2x, yTop, c2z);
            // Triangle 2: (c1, yBase), (c2, yTop), (c1, yTop)
            wallPositions.push(c1x, yBase, c1z);
            wallPositions.push(c2x, yTop, c2z);
            wallPositions.push(c1x, yTop, c1z);

            // Top glowing rim line
            linePositions.push(c1x, yTop, c1z);
            linePositions.push(c2x, yTop, c2z);

            // Base contour line
            linePositions.push(c1x, yBase, c1z);
            linePositions.push(c2x, yBase, c2z);

            // Vertical corner posts
            linePositions.push(c1x, yBase, c1z);
            linePositions.push(c1x, yTop, c1z);
            linePositions.push(c2x, yBase, c2z);
            linePositions.push(c2x, yTop, c2z);
          }
        }
      }
    }

    if (wallPositions.length > 0) {
      const wallGeo = new THREE.BufferGeometry();
      wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
      wallGeo.computeVertexNormals();

      const wallMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.name = wallName;
      wallMesh.raycast = () => { };
      targetGroup.add(wallMesh);

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });

      const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      lineSegments.name = linesName;
      lineSegments.raycast = () => { };
      targetGroup.add(lineSegments);
    }
  }

  public clearRangePerimeter(): void {
    this.clearPerimeterGroup(this.rangePerimeterGroup);
  }

  public clearEnemyRangePerimeter(): void {
    this.clearPerimeterGroup(this.enemyRangePerimeterGroup);
  }

  private clearPerimeterGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh | THREE.LineSegments;
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
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

  public getContinuousTerrainMesh(): THREE.Mesh | null {
    return this.continuousTerrainMesh;
  }

  private sampleTerrainFbm(x: number, z: number): number {
    const hash = (ix: number, iz: number) => {
      const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
      return n - Math.floor(n);
    };
    const valueNoise = (px: number, pz: number) => {
      const ix = Math.floor(px);
      const iz = Math.floor(pz);
      const fx = px - ix;
      const fz = pz - iz;
      const ux = fx * fx * (3 - 2 * fx);
      const uz = fz * fz * (3 - 2 * fz);
      const a = hash(ix, iz);
      const b = hash(ix + 1, iz);
      const c = hash(ix, iz + 1);
      const d = hash(ix + 1, iz + 1);
      return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
    };
    return valueNoise(x, z) * 0.65 + valueNoise(x * 2.13 + 7.3, z * 2.13 - 4.1) * 0.35;
  }

  private getBattleTerrainBaseHeight(terrain: TerrainType): number {
    switch (terrain) {
      case TerrainType.HILL:
        return 0.70;
      case TerrainType.FOREST:
        return 0.06;
      case TerrainType.SWAMP:
        return -0.27;
      case TerrainType.WATER:
        return -0.38;
      case TerrainType.PLAIN:
      default:
        return 0.0;
    }
  }

  private getBattleTerrainNoiseAmp(terrain: TerrainType): number {
    switch (terrain) {
      case TerrainType.HILL:
        return 0.14;
      case TerrainType.FOREST:
        return 0.065;
      case TerrainType.SWAMP:
        return 0.038;
      case TerrainType.WATER:
        return 0.022;
      case TerrainType.PLAIN:
      default:
        return 0.06;
    }
  }

  private getBattleTerrainVertexColor(terrain: TerrainType): [number, number, number] {
    switch (terrain) {
      case TerrainType.HILL:
        return [0.48, 0.44, 0.32];
      case TerrainType.FOREST:
        return [0.24, 0.38, 0.18];
      case TerrainType.SWAMP:
        return [0.25, 0.32, 0.22];
      case TerrainType.WATER:
        return [0.14, 0.31, 0.44];
      case TerrainType.PLAIN:
      default:
        return [0.35, 0.5, 0.24];
    }
  }

  private findNearestHexCoords(wx: number, wz: number): { x: number; y: number } {
    const colSpacing = Math.sqrt(3) * this.hexRadius;
    const rowSpacing = 1.5 * this.hexRadius;
    const origin = this.hexToWorld(0, 0);
    const approxY = Math.round((wz - origin.z) / rowSpacing);
    const cy = Math.max(0, Math.min(this.hexMap.height - 1, approxY));
    const xShift = Math.abs(cy) % 2 === 1 ? colSpacing * 0.5 : 0;
    const approxX = Math.round((wx - origin.x - xShift) / colSpacing);
    const cx = Math.max(0, Math.min(this.hexMap.width - 1, approxX));
    return { x: cx, y: cy };
  }

  public sampleElevationAtWorld(wx: number, wz: number): number {
    const nearest = this.findNearestHexCoords(wx, wz);
    const cx = nearest.x;
    const cy = nearest.y;

    const oddOffsets: ReadonlyArray<[number, number]> = [
      [0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1],
    ];
    const evenOffsets: ReadonlyArray<[number, number]> = [
      [0, 0], [1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1],
    ];
    const offsets = Math.abs(cy) % 2 === 1 ? oddOffsets : evenOffsets;

    const sigma = this.hexRadius * 0.78;
    const invTwoSigmaSq = 1 / (2 * sigma * sigma);
    let sumH = 0;
    let sumNoise = 0;
    let sumW = 0;

    for (const [dx, dy] of offsets) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= this.hexMap.width || ny < 0 || ny >= this.hexMap.height) continue;
      const hp = this.hexToWorld(nx, ny);
      const dSq = (wx - hp.x) ** 2 + (wz - hp.z) ** 2;
      const w = Math.exp(-dSq * invTwoSigmaSq);
      const t = this.getTerrainAt(nx, ny);
      sumH += w * this.getBattleTerrainBaseHeight(t);
      sumNoise += w * this.getBattleTerrainNoiseAmp(t);
      sumW += w;
    }

    const baseTerrain = this.getTerrainAt(cx, cy);
    const macroH = sumW > 0 ? sumH / sumW : this.getBattleTerrainBaseHeight(baseTerrain);
    const noiseAmp = sumW > 0 ? sumNoise / sumW : this.getBattleTerrainNoiseAmp(baseTerrain);
    const noise = this.sampleTerrainFbm(wx * 1.35, wz * 1.35) * noiseAmp;
    const rawElev = macroH + noise;

    // Outside the playable hex bounds, smoothly trend elevation toward 0 and blend into the outer apron
    const topLeft = this.hexToWorld(0, 0);
    const bottomRight = this.hexToWorld(Math.max(0, this.hexMap.width - 1), Math.max(0, this.hexMap.height - 1));
    const boardMinX = Math.min(topLeft.x, bottomRight.x) - this.hexRadius * 0.5;
    const boardMaxX = Math.max(topLeft.x, bottomRight.x) + this.hexRadius * 0.5;
    const boardMinZ = Math.min(topLeft.z, bottomRight.z) - this.hexRadius * 0.5;
    const boardMaxZ = Math.max(topLeft.z, bottomRight.z) + this.hexRadius * 0.5;

    const dxOut = Math.max(boardMinX - wx, wx - boardMaxX, 0);
    const dzOut = Math.max(boardMinZ - wz, wz - boardMaxZ, 0);
    const dOut = Math.max(dxOut, dzOut);
    if (dOut <= this.hexRadius * 0.65) {
      return rawElev;
    }

    const taperT = Math.min(1, (dOut - this.hexRadius * 0.65) / (this.hexRadius * 3.6));
    const smoothTaper = taperT * taperT * (3 - 2 * taperT);
    const rimDropT = Math.min(1, Math.max(0, (dOut - this.hexRadius * 4.2) / (this.hexRadius * 1.3)));
    const rimDrop = -0.155 * (rimDropT * rimDropT * (3 - 2 * rimDropT));
    return rawElev * (1 - smoothTaper) + rimDrop;
  }

  private buildContinuousTerrainMesh(): void {
    if (this.continuousTerrainMesh) {
      this.group.remove(this.continuousTerrainMesh);
      this.continuousTerrainMesh.geometry.dispose();
      (this.continuousTerrainMesh.material as THREE.Material).dispose();
      this.continuousTerrainMesh = null;
    }
    this.overviewTerrainAtlas?.texture.dispose();
    this.overviewTerrainAtlas = null;
    this.overviewTerrainGridTex?.dispose();
    this.overviewTerrainGridTex = null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        const p = this.hexToWorld(x, y);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
    }
    const boardMinX = minX;
    const boardMaxX = maxX;
    const boardMinZ = minZ;
    const boardMaxZ = maxZ;
    const pad = this.hexRadius * 5.5;
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;

    const step = this.hexRadius / 3.0;
    const cols = Math.max(16, Math.ceil((maxX - minX) / step));
    const rows = Math.max(16, Math.ceil((maxZ - minZ) / step));
    const vertCount = (cols + 1) * (rows + 1);

    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    const sigma = this.hexRadius * 0.78;
    const invTwoSigmaSq = 1 / (2 * sigma * sigma);
    const oddOffsets: ReadonlyArray<[number, number]> = [
      [0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1],
    ];
    const evenOffsets: ReadonlyArray<[number, number]> = [
      [0, 0], [1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1],
    ];

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
        uvs[idx * 2] = wx * 0.35;
        uvs[idx * 2 + 1] = wz * 0.35;

        const nearest = this.findNearestHexCoords(wx, wz);
        const cx = nearest.x;
        const cy = nearest.y;
        const offsets = Math.abs(cy) % 2 === 1 ? oddOffsets : evenOffsets;
        let cr = 0;
        let cg = 0;
        let cb = 0;
        let cw = 0;
        for (const [dx, dy] of offsets) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= this.hexMap.width || ny < 0 || ny >= this.hexMap.height) continue;
          const hp = this.hexToWorld(nx, ny);
          const dSq = (wx - hp.x) ** 2 + (wz - hp.z) ** 2;
          const w = Math.exp(-dSq * invTwoSigmaSq);
          const [tr, tg, tb] = this.getBattleTerrainVertexColor(this.getTerrainAt(nx, ny));
          cr += w * tr;
          cg += w * tg;
          cb += w * tb;
          cw += w;
        }
        if (cw > 0) {
          colors[idx * 3] = cr / cw;
          colors[idx * 3 + 1] = cg / cw;
          colors[idx * 3 + 2] = cb / cw;
        } else {
          const [tr, tg, tb] = this.getBattleTerrainVertexColor(this.getTerrainAt(cx, cy));
          colors[idx * 3] = tr;
          colors[idx * 3 + 1] = tg;
          colors[idx * 3 + 2] = tb;
        }
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
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const atlas = createOverviewTerrainAtlas(512);
    const gridTex = createOverviewTerrainGridTexture(this.hexMap.width, this.hexMap.height);
    this.overviewTerrainAtlas = atlas;
    this.overviewTerrainGridTex = gridTex;
    const toOverviewTerrain = (t: TerrainType): OverviewTerrainType => {
      switch (t) {
        case TerrainType.FOREST:
          return 'forest';
        case TerrainType.SWAMP:
          return 'swamp';
        case TerrainType.HILL:
          return 'hill';
        case TerrainType.WATER:
          return 'water';
        case TerrainType.PLAIN:
        default:
          return 'grassland';
      }
    };
    for (let x = 0; x < this.hexMap.width; x++) {
      for (let y = 0; y < this.hexMap.height; y++) {
        updateOverviewTerrainGridCell(
          gridTex,
          x,
          y,
          toOverviewTerrain(this.getTerrainAt(x, y)),
          getTerrainVariationIndex(x, y),
          false
        );
      }
    }
    gridTex.needsUpdate = true;

    const mat = createOverviewBlendedTerrainMaterial(
      atlas.texture,
      gridTex,
      this.hexMap.width,
      this.hexMap.height,
      this.hexRadius,
      undefined,
      false,
      {
        minX: boardMinX - this.hexRadius * 0.4,
        maxX: boardMaxX + this.hexRadius * 0.4,
        minZ: boardMinZ - this.hexRadius * 0.4,
        maxZ: boardMaxZ + this.hexRadius * 0.4,
        fadeWidth: this.hexRadius * 4.8,
        outerColor: getOuterApronColorHex(this.majorTerrainType),
        enableSwampWaterShader: true,
      }
    );

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'BattleTerrainHeightfield';
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData = { isBattleTerrainHeightfield: true };
    this.continuousTerrainMesh = mesh;
    this.group.add(mesh);
    this.paintOverviewAtlasTextures();
  }

  private paintOverviewAtlasTextures(): void {
    if (!this.overviewTerrainAtlas) return;
    OVERVIEW_LAND_TERRAINS.forEach((terrain, row) => {
      const variations = BATTLE_TERRAIN_TEXTURE_CONFIG[terrain]?.variations ?? [];
      variations.forEach((file, col) => {
        const tex = this.overviewTerrainTextures.get(file);
        if (tex && tex.image) {
          this.overviewTerrainAtlas?.paintImageToCell(row, col, tex.image as CanvasImageSource);
        }
      });
    });
  }

  public getHexElevation(x: number, y: number): number {
    const pos = this.hexToWorld(x, y);
    return this.sampleElevationAtWorld(pos.x, pos.z);
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
      this.projectRingGeometryToHex(targetRing, targetWorld.x, targetWorld.z, targetElev);
      targetRing.position.set(targetWorld.x, targetWorld.y + targetElev + 0.025, targetWorld.z);
      this.attackPreviewGroup.add(targetRing);

      // 2. Highlight the origin approach tile and draw a 3D arrow towards target
      const originWorld = this.hexToWorld(originCoords.x, originCoords.y);
      const originElev = this.getHexElevation(originCoords.x, originCoords.y);

      // Origin hex highlight
      const originHexMesh = this.createProjectedHexMesh(
        originWorld.x,
        originWorld.z,
        originElev,
        this.hexRadius * 0.96,
        colorHex,
        0.45
      );
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
    if (this.highlightOverlayTexture) {
      this.highlightOverlayTexture.dispose();
      this.highlightOverlayTexture = null;
    }

    if (this.hillMaskTexture) {
      this.hillMaskTexture.dispose();
      this.hillMaskTexture = null;
    }

    this.blendedTileMaterials.forEach((m) => m.dispose());
    this.blendedTileMaterials = [];
    this.terrainSplatting.dispose();

    if (this.continuousTerrainMesh) {
      this.group.remove(this.continuousTerrainMesh);
      this.continuousTerrainMesh.geometry.dispose();
      (this.continuousTerrainMesh.material as THREE.Material).dispose();
      this.continuousTerrainMesh = null;
    }
    this.overviewTerrainAtlas?.texture.dispose();
    this.overviewTerrainAtlas = null;
    this.overviewTerrainGridTex?.dispose();
    this.overviewTerrainGridTex = null;

    this.tileMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    this.tileMeshes.clear();
    this.tileMeshList = [];
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
    this.clearForestTrees();
    this.clearOuterDecorations();
    this.grassSystem.dispose();
    this.blowingLeavesSystem.dispose();
    this.clearReachOverlays();
    this.clearRangePerimeter();
    this.clearEnemyRangePerimeter();
    this.clearAttackPreview();
    this.clearPathPreview();

    if (this.selectedHaloMesh) {
      this.group.remove(this.selectedHaloMesh);
      this.selectedHaloMesh.geometry?.dispose();
      if (this.selectedHaloMesh.material) {
        if (Array.isArray(this.selectedHaloMesh.material)) {
          this.selectedHaloMesh.material.forEach((m) => {
            (m as THREE.MeshBasicMaterial).map?.dispose();
            m.dispose();
          });
        } else {
          ((this.selectedHaloMesh.material as THREE.MeshBasicMaterial).map)?.dispose();
          (this.selectedHaloMesh.material as THREE.Material).dispose();
        }
      }
    }
  }
}
