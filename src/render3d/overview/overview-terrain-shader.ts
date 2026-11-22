import * as THREE from 'three';
import { OverviewTerrainType } from '../../overview/overview-types';

export const OVERVIEW_TERRAIN_TYPE_IDS: Record<OverviewTerrainType, number> = {
  grassland: 0,
  forest: 1,
  deep_forest: 2,
  swamp: 3,
  hill: 4,
  mountain: 5,
  water: 6,
};

export const OVERVIEW_LAND_TERRAINS: OverviewTerrainType[] = [
  'grassland',
  'forest',
  'deep_forest',
  'swamp',
  'hill',
  'mountain',
];

export const OVERVIEW_TERRAIN_VARIATION_COUNT = 4;

export const OVERVIEW_TERRAIN_TEXTURE_CONFIG: Record<
  OverviewTerrainType,
  { file: string; variations: string[]; tint: number }
> = {
  grassland: {
    file: 'overview_grassland_1.png',
    variations: [
      'overview_grassland_1.png',
      'overview_grassland_2.png',
      'overview_grassland_3.png',
      'overview_grassland_4.png',
    ],
    tint: 0xffffff,
  },
  forest: {
    file: 'overview_forest_1.png',
    variations: [
      'overview_forest_1.png',
      'overview_forest_2.png',
      'overview_forest_3.png',
      'overview_forest_4.png',
    ],
    tint: 0xffffff,
  },
  deep_forest: {
    file: 'overview_deep_forest_1.png',
    variations: [
      'overview_deep_forest_1.png',
      'overview_deep_forest_2.png',
      'overview_deep_forest_3.png',
      'overview_deep_forest_4.png',
    ],
    tint: 0xffffff,
  },
  swamp: {
    file: 'overview_swamp_1.png',
    variations: [
      'overview_swamp_1.png',
      'overview_swamp_2.png',
      'overview_swamp_3.png',
      'overview_swamp_4.png',
    ],
    tint: 0xffffff,
  },
  hill: {
    file: 'overview_hill_1.png',
    variations: [
      'overview_hill_1.png',
      'overview_hill_2.png',
      'overview_hill_3.png',
      'overview_hill_4.png',
    ],
    tint: 0xffffff,
  },
  mountain: {
    file: 'overview_mountain_1.png',
    variations: [
      'overview_mountain_1.png',
      'overview_mountain_2.png',
      'overview_mountain_3.png',
      'overview_mountain_4.png',
    ],
    tint: 0xffffff,
  },
  water: {
    file: 'overview_water.png',
    variations: ['overview_water.png'],
    tint: 0xffffff,
  },
};

export const BATTLE_TERRAIN_TEXTURE_CONFIG: Record<
  OverviewTerrainType,
  { file: string; variations: string[]; tint: number }
> = {
  grassland: {
    file: 'battle_grassland_1.png',
    variations: [
      'battle_grassland_1.png',
      'battle_grassland_2.png',
      'battle_grassland_3.png',
      'battle_grassland_4.png',
    ],
    tint: 0xffffff,
  },
  forest: {
    file: 'battle_forest_1.png',
    variations: [
      'battle_forest_1.png',
      'battle_forest_2.png',
      'battle_forest_3.png',
      'battle_forest_4.png',
    ],
    tint: 0xffffff,
  },
  deep_forest: {
    file: 'battle_forest_1.png',
    variations: [
      'battle_forest_1.png',
      'battle_forest_2.png',
      'battle_forest_3.png',
      'battle_forest_4.png',
    ],
    tint: 0xffffff,
  },
  swamp: {
    file: 'battle_swamp_1.png',
    variations: [
      'battle_swamp_1.png',
      'battle_swamp_2.png',
      'battle_swamp_3.png',
      'battle_swamp_4.png',
    ],
    tint: 0xffffff,
  },
  hill: {
    file: 'battle_hill_1.png',
    variations: [
      'battle_hill_1.png',
      'battle_hill_2.png',
      'battle_hill_3.png',
      'battle_hill_4.png',
    ],
    tint: 0xffffff,
  },
  mountain: {
    file: 'battle_hill_1.png',
    variations: [
      'battle_hill_1.png',
      'battle_hill_2.png',
      'battle_hill_3.png',
      'battle_hill_4.png',
    ],
    tint: 0xffffff,
  },
  water: {
    file: 'battle_water.png',
    variations: ['battle_water.png'],
    tint: 0xffffff,
  },
};

export const FALLBACK_TERRAIN_RGB: Record<OverviewTerrainType, [number, number, number]> = {
  grassland: [92, 138, 71],
  forest: [59, 102, 52],
  deep_forest: [36, 66, 33],
  swamp: [79, 99, 70],
  hill: [123, 120, 86],
  mountain: [107, 111, 117],
  water: [44, 99, 140],
};

export function getTerrainVariationIndex(x: number, y: number): number {
  let h = ((x + 1) * 374761393) ^ ((y + 1) * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % OVERVIEW_TERRAIN_VARIATION_COUNT;
}

export interface OverviewTerrainAtlasHandle {
  texture: THREE.Texture;
  cellSize: number;
  cols: number;
  rows: number;
  paintImageToCell: (
    row: number,
    col: number,
    image: CanvasImageSource
  ) => void;
  dispose: () => void;
}

export function createOverviewTerrainAtlas(cellSize: number = 256): OverviewTerrainAtlasHandle {
  const cols = 4; // 4 variations
  const rows = 8; // 6 land terrains + padding to power-of-two height

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      OVERVIEW_LAND_TERRAINS.forEach((terrain, row) => {
        const [r, g, b] = FALLBACK_TERRAIN_RGB[terrain];
        for (let col = 0; col < cols; col++) {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      });

      // Row 7: Dark brown tilled soil texture for grain/wheat fields (4 variations)
      const soilRow = 7;
      for (let col = 0; col < cols; col++) {
        const imgData = ctx.createImageData(cellSize, cellSize);
        const d = imgData.data;
        const angle = (col * 0.45 + 0.25);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        for (let py = 0; py < cellSize; py++) {
          for (let px = 0; px < cellSize; px++) {
            const u = px / cellSize;
            const v = py / cellSize;
            const rotU = u * cosA - v * sinA;
            const furrow = Math.sin(rotU * Math.PI * 22.0) * 0.5 + 0.5;
            const n = Math.sin((px + col * 37) * 12.9898 + py * 78.233) * 43758.5453;
            const speck = ((n - Math.floor(n)) - 0.5) * 18;
            const idx = (py * cellSize + px) * 4;
            d[idx] = Math.max(22, Math.min(115, 58 + furrow * 22 + speck));
            d[idx + 1] = Math.max(15, Math.min(85, 39 + furrow * 15 + speck * 0.8));
            d[idx + 2] = Math.max(9, Math.min(58, 22 + furrow * 9 + speck * 0.6));
            d[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, col * cellSize, soilRow * cellSize);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return {
      texture,
      cellSize,
      cols,
      rows,
      paintImageToCell: (row: number, col: number, image: CanvasImageSource) => {
        if (!ctx) return;
        ctx.drawImage(
          image,
          col * cellSize,
          row * cellSize,
          cellSize,
          cellSize
        );
        texture.needsUpdate = true;
      },
      dispose: () => {
        texture.dispose();
      },
    };
  }

  // Headless fallback DataTexture (4x8 pixels)
  const data = new Uint8Array(cols * rows * 4);
  OVERVIEW_LAND_TERRAINS.forEach((terrain, row) => {
    const [r, g, b] = FALLBACK_TERRAIN_RGB[terrain];
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  });
  // Row 7 fallback: dark brown tilled soil for grain fields
  for (let col = 0; col < cols; col++) {
    const idx = (7 * cols + col) * 4;
    data[idx] = 66;
    data[idx + 1] = 44;
    data[idx + 2] = 25;
    data[idx + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return {
    texture,
    cellSize,
    cols,
    rows,
    paintImageToCell: () => {},
    dispose: () => {
      texture.dispose();
    },
  };
}

export function createOverviewTerrainGridTexture(
  width: number,
  height: number
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function updateOverviewTerrainGridCell(
  gridTex: THREE.DataTexture,
  x: number,
  y: number,
  terrain: OverviewTerrainType,
  variation: number,
  isGrainSoil: boolean = false
): void {
  const width = gridTex.image.width;
  const height = gridTex.image.height;
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const data = gridTex.image.data as Uint8Array;
  const idx = (y * width + x) * 4;
  data[idx] = OVERVIEW_TERRAIN_TYPE_IDS[terrain] ?? 0;
  data[idx + 1] = Math.max(0, Math.min(OVERVIEW_TERRAIN_VARIATION_COUNT - 1, variation));
  data[idx + 2] = isGrainSoil ? 255 : 0;
  data[idx + 3] = 255;
}

export function createOverviewHighlightGridTexture(
  width: number,
  height: number
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export interface OuterEnvironmentBlendConfig {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  fadeWidth: number;
  outerColor: number;
  enableSwampWaterShader?: boolean;
}

export function createOverviewBlendedTerrainMaterial(
  atlasTexture: THREE.Texture,
  terrainGridTexture: THREE.DataTexture,
  mapWidth: number,
  mapHeight: number,
  hexRadius: number,
  highlightGridTexture?: THREE.DataTexture,
  showGrid: boolean = true,
  outerBlend?: OuterEnvironmentBlendConfig
): THREE.MeshStandardMaterial {
  const highlightTex =
    highlightGridTexture ?? createOverviewHighlightGridTexture(mapWidth, mapHeight);

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.04,
  });

  mat.userData = {
    isOverviewBlendedTerrain: true,
    uTerrainAtlas: atlasTexture,
    uTerrainGridTex: terrainGridTexture,
    uHighlightGridTex: highlightTex,
  };

  mat.customProgramCacheKey = () => 'OverviewSeamlessHexTerrain_v3';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTerrainAtlas = { value: atlasTexture };
    shader.uniforms.uTerrainGridTex = { value: terrainGridTexture };
    shader.uniforms.uHighlightGridTex = { value: highlightTex };
    shader.uniforms.uGridSize = { value: new THREE.Vector2(mapWidth, mapHeight) };
    shader.uniforms.uHexRadius = { value: hexRadius };
    shader.uniforms.uAtlasGrid = { value: new THREE.Vector2(4, 8) };
    shader.uniforms.uShowGrid = { value: showGrid ? 1.0 : 0.0 };
    shader.uniforms.uOuterBlendRect = {
      value: outerBlend
        ? new THREE.Vector4(outerBlend.minX, outerBlend.maxX, outerBlend.minZ, outerBlend.maxZ)
        : new THREE.Vector4(-1e6, 1e6, -1e6, 1e6),
    };
    shader.uniforms.uOuterBlendFade = { value: outerBlend ? outerBlend.fadeWidth : 0.0 };
    shader.uniforms.uOuterGroundColor = {
      value: new THREE.Color(outerBlend ? outerBlend.outerColor : 0x48783c),
    };
    shader.uniforms.uTime = { value: 0.0 };
    shader.uniforms.uSwampWaterEnabled = { value: outerBlend?.enableSwampWaterShader ? 1.0 : 0.0 };
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vTerrainWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
vTerrainWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;
uniform sampler2D uTerrainAtlas;
uniform sampler2D uTerrainGridTex;
uniform sampler2D uHighlightGridTex;
uniform vec2 uGridSize;
uniform float uHexRadius;
uniform vec2 uAtlasGrid;
uniform float uShowGrid;
uniform vec4 uOuterBlendRect;
uniform float uOuterBlendFade;
uniform vec3 uOuterGroundColor;
uniform float uTime;
uniform float uSwampWaterEnabled;

float overviewHash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float overviewNoise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = overviewHash21(i);
  float b = overviewHash21(i + vec2(1.0, 0.0));
  float c = overviewHash21(i + vec2(0.0, 1.0));
  float d = overviewHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float overviewFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * overviewNoise2D(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec4 sampleAtlasTerrain(float terrainId, float variationId, vec2 worldUv) {
  vec2 cellUv = clamp(fract(worldUv), vec2(0.006), vec2(0.994));
  // CanvasTexture has flipY = true, so row 0 is at the top (v near 1.0)
  float col = clamp(variationId, 0.0, uAtlasGrid.x - 1.0);
  float row = clamp(terrainId, 0.0, 7.0);
  float u = (col + cellUv.x) / uAtlasGrid.x;
  float v = 1.0 - (row + cellUv.y) / uAtlasGrid.y;
  return texture2D(uTerrainAtlas, vec2(u, v));
}

vec2 fetchGridCell(vec2 coord) {
  vec2 uv = (coord + 0.5) / uGridSize;
  vec4 texel = texture2D(uTerrainGridTex, uv);
  float terrainId = (texel.b > 0.5) ? 7.0 : floor(texel.r * 255.0 + 0.5);
  return vec2(terrainId, floor(texel.g * 255.0 + 0.5));
}

vec4 fetchHighlightCell(vec2 coord) {
  vec2 uv = (coord + 0.5) / uGridSize;
  return texture2D(uHighlightGridTex, uv);
}

vec2 hexCoordToWorldXZ(vec2 coord) {
  float widthSpacing = uHexRadius * 1.73205080757;
  float heightSpacing = uHexRadius * 1.5;
  float odd = mod(abs(coord.y), 2.0);
  float wx = (coord.x + odd * 0.5 - (uGridSize.x - 1.0) * 0.5) * widthSpacing;
  float wz = (coord.y - (uGridSize.y - 1.0) * 0.5) * heightSpacing;
  return vec2(wx, wz);
}

vec2 worldXZToHexCoord(vec2 worldXZ) {
  float widthSpacing = uHexRadius * 1.73205080757;
  float heightSpacing = uHexRadius * 1.5;
  float px = worldXZ.x + (uGridSize.x - 1.0) * 0.5 * widthSpacing;
  float pz = worldXZ.y + (uGridSize.y - 1.0) * 0.5 * heightSpacing;
  float qf = (0.57735026919 * px - 0.33333333333 * pz) / uHexRadius;
  float rf = (0.66666666667 * pz) / uHexRadius;
  float sf = -qf - rf;
  float rx = floor(qf + 0.5);
  float ry = floor(rf + 0.5);
  float rz = floor(sf + 0.5);
  float dx = abs(rx - qf);
  float dy = abs(ry - rf);
  float dz = abs(rz - sf);
  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  }
  float odd = mod(abs(ry), 2.0);
  float hx = rx + (ry - odd) * 0.5;
  float hy = ry;
  return vec2(
    clamp(hx, 0.0, uGridSize.x - 1.0),
    clamp(hy, 0.0, uGridSize.y - 1.0)
  );
}`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
{
  vec2 hexCoord = worldXZToHexCoord(vTerrainWorldPos.xz);
  vec2 tileCenter = hexCoordToWorldXZ(hexCoord);
  vec2 ownCell = fetchGridCell(hexCoord);
  float ownType = ownCell.x;
  float ownVar = ownCell.y;

  vec2 worldUv = vTerrainWorldPos.xz * 0.42;
  vec4 accColor = (abs(ownType - 6.0) < 0.5)
    ? vec4(0.46, 0.42, 0.31, 1.0)
    : sampleAtlasTerrain(ownType, ownVar, worldUv);
  float totalWeight = 1.0;
  float swampAcc = (abs(ownType - 3.0) < 0.5) ? 1.0 : 0.0;

  float apothem = uHexRadius * 0.86602540378;
  float edgeNoise = (overviewFbm(vTerrainWorldPos.xz * 2.3) - 0.5) * 0.34;

  int hx = int(floor(hexCoord.x + 0.5));
  int hy = int(floor(hexCoord.y + 0.5));
  int odd = hy - (hy / 2) * 2;

  vec2 edgeNorms[6];
  edgeNorms[0] = vec2(1.0, 0.0);
  edgeNorms[1] = vec2(0.5, 0.8660254);
  edgeNorms[2] = vec2(-0.5, 0.8660254);
  edgeNorms[3] = vec2(-1.0, 0.0);
  edgeNorms[4] = vec2(-0.5, -0.8660254);
  edgeNorms[5] = vec2(0.5, -0.8660254);

  vec2 neighborCoords[6];
  neighborCoords[0] = vec2(float(hx + 1), float(hy));
  neighborCoords[1] = vec2(float(hx + odd), float(hy + 1));
  neighborCoords[2] = vec2(float(hx - (1 - odd)), float(hy + 1));
  neighborCoords[3] = vec2(float(hx - 1), float(hy));
  neighborCoords[4] = vec2(float(hx - (1 - odd)), float(hy - 1));
  neighborCoords[5] = vec2(float(hx + odd), float(hy - 1));

  vec2 localXZ = vTerrainWorldPos.xz - tileCenter;

  for (int k = 0; k < 6; k++) {
    vec2 nc = neighborCoords[k];
    if (nc.x >= 0.0 && nc.x < uGridSize.x && nc.y >= 0.0 && nc.y < uGridSize.y) {
      vec2 nCell = fetchGridCell(nc);
      float nType = nCell.x;
      float nVar = nCell.y;
      if (abs(nType - ownType) > 0.1 || abs(nVar - ownVar) > 0.1) {
        float proj = dot(localXZ, edgeNorms[k]) / apothem;
        float s = clamp(smoothstep(0.58, 1.42, proj + edgeNoise), 0.0, 0.96);
        if (s > 0.001) {
          float w = s / (1.0 - s);
          vec4 nColor = (abs(nType - 6.0) < 0.5)
            ? vec4(0.46, 0.42, 0.31, 1.0)
            : sampleAtlasTerrain(nType, nVar, worldUv);
          accColor += nColor * w;
          totalWeight += w;
          if (abs(nType - 3.0) < 0.5) {
            swampAcc += w;
          }
        }
      }
    }
  }

  vec3 blendedRgb = accColor.rgb / totalWeight;
  float swampWeight = swampAcc / totalWeight;
  float swampWaterMask = 0.0;

  if (uSwampWaterEnabled > 0.5 && swampWeight > 0.01) {
    float waterDepth = smoothstep(-0.08, -0.23, vTerrainWorldPos.y);
    swampWaterMask = clamp(swampWeight * waterDepth, 0.0, 1.0);
    float dampShore = swampWeight * smoothstep(-0.03, -0.10, vTerrainWorldPos.y) * (1.0 - waterDepth);
    blendedRgb = mix(blendedRgb, blendedRgb * vec3(0.68, 0.72, 0.64), dampShore * 0.65);

    if (swampWaterMask > 0.005) {
      float rippleA = overviewFbm(vTerrainWorldPos.xz * 2.8 + vec2(uTime * 0.14, -uTime * 0.09));
      float rippleB = overviewFbm(vTerrainWorldPos.xz * 5.2 - vec2(uTime * 0.11, uTime * 0.16));
      float algaeNoise = overviewFbm(vTerrainWorldPos.xz * 1.9 + vec2(1.7, 3.1));
      vec3 murkyBase = mix(vec3(0.08, 0.15, 0.14), vec3(0.16, 0.24, 0.14), algaeNoise);
      float shimmer = smoothstep(0.54, 0.78, rippleA * 0.55 + rippleB * 0.45);
      vec3 murkyWaterCol = murkyBase + vec3(0.12, 0.17, 0.15) * shimmer;
      blendedRgb = mix(blendedRgb, murkyWaterCol, swampWaterMask * 0.86);
    }
  }

  // Subtle world-space sunlit & clover variation on grassland plains
  if (abs(ownType) < 0.5) {
    float meadowVar = overviewFbm(vTerrainWorldPos.xz * 1.45);
    vec3 sunlitTint = mix(vec3(0.92, 0.96, 0.90), vec3(1.07, 1.05, 0.93), meadowVar);
    blendedRgb *= sunlitTint;
  }

  // Hex distance SDF (0 at center, 1 at hex border) for terrain-conforming grid & highlights
  float hexEdgeDist = max(
    max(abs(dot(localXZ, edgeNorms[0])), abs(dot(localXZ, edgeNorms[1]))),
    abs(dot(localXZ, edgeNorms[2]))
  ) / apothem;

  if (uShowGrid > 0.5) {
    float gridLine = smoothstep(0.955, 0.985, hexEdgeDist);
    blendedRgb = mix(blendedRgb, vec3(0.08, 0.11, 0.13), gridLine * 0.35);
  }

  vec4 hl = fetchHighlightCell(hexCoord);
  if (hl.r > 0.5) {
    float ring = smoothstep(0.64, 0.70, hexEdgeDist) * (1.0 - smoothstep(0.86, 0.92, hexEdgeDist));
    float fill = 1.0 - smoothstep(0.88, 0.96, hexEdgeDist);
    blendedRgb = mix(blendedRgb, vec3(0.28, 0.85, 0.52), fill * 0.12 + ring * 0.65);
  }
  if (hl.g > 0.5) {
    float hoverRing = smoothstep(0.80, 0.86, hexEdgeDist) * (1.0 - smoothstep(0.93, 0.98, hexEdgeDist));
    blendedRgb = mix(blendedRgb, vec3(0.95, 0.85, 0.42), hoverRing * 0.65);
  }

  if (uOuterBlendFade > 0.01) {
    float dxOut = max(uOuterBlendRect.x - vTerrainWorldPos.x, vTerrainWorldPos.x - uOuterBlendRect.y);
    float dzOut = max(uOuterBlendRect.z - vTerrainWorldPos.z, vTerrainWorldPos.z - uOuterBlendRect.w);
    float dOut = max(0.0, max(dxOut, dzOut));
    float outerT = smoothstep(0.35, uOuterBlendFade, dOut);
    blendedRgb = mix(blendedRgb, uOuterGroundColor, outerT);
  }

  diffuseColor.rgb *= blendedRgb;
}
#define SWAMP_WATER_ROUGHNESS_PASS
`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
if (uSwampWaterEnabled > 0.5) {
  vec2 sHex = worldXZToHexCoord(vTerrainWorldPos.xz);
  vec2 sCell = fetchGridCell(sHex);
  if (abs(sCell.x - 3.0) < 0.5) {
    float sWater = smoothstep(-0.08, -0.23, vTerrainWorldPos.y);
    roughnessFactor = mix(roughnessFactor, 0.16, sWater);
  }
}`
    );
  };

  return mat;
}
