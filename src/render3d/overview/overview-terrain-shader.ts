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

export function createOverviewTerrainAtlas(): OverviewTerrainAtlasHandle {
  const cellSize = 256;
  const cols = 4; // 4 variations
  const rows = 8; // 6 land terrains + padding to power-of-two height (1024x2048)

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
  variation: number
): void {
  const width = gridTex.image.width;
  const height = gridTex.image.height;
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const data = gridTex.image.data as Uint8Array;
  const idx = (y * width + x) * 4;
  data[idx] = OVERVIEW_TERRAIN_TYPE_IDS[terrain] ?? 0;
  data[idx + 1] = Math.max(0, Math.min(OVERVIEW_TERRAIN_VARIATION_COUNT - 1, variation));
  data[idx + 2] = 0;
  data[idx + 3] = 255;
}

export function createOverviewBlendedTerrainMaterial(
  atlasTexture: THREE.Texture,
  terrainGridTexture: THREE.DataTexture,
  mapWidth: number,
  mapHeight: number,
  hexRadius: number
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.04,
  });

  mat.userData = {
    isOverviewBlendedTerrain: true,
    uTerrainAtlas: atlasTexture,
    uTerrainGridTex: terrainGridTexture,
  };

  mat.customProgramCacheKey = () => 'OverviewSeamlessHexTerrain_v1';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTerrainAtlas = { value: atlasTexture };
    shader.uniforms.uTerrainGridTex = { value: terrainGridTexture };
    shader.uniforms.uGridSize = { value: new THREE.Vector2(mapWidth, mapHeight) };
    shader.uniforms.uHexRadius = { value: hexRadius };
    shader.uniforms.uAtlasGrid = { value: new THREE.Vector2(4, 8) };
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
attribute vec2 aHexCoord;
attribute vec2 aTileCenter;
varying vec2 vHexCoord;
varying vec2 vTileCenter;
varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vHexCoord = aHexCoord;
vTileCenter = aTileCenter;
vTerrainWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
vTerrainWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying vec2 vHexCoord;
varying vec2 vTileCenter;
varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;
uniform sampler2D uTerrainAtlas;
uniform sampler2D uTerrainGridTex;
uniform vec2 uGridSize;
uniform float uHexRadius;
uniform vec2 uAtlasGrid;

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
  float row = clamp(terrainId, 0.0, 5.0);
  float u = (col + cellUv.x) / uAtlasGrid.x;
  float v = 1.0 - (row + cellUv.y) / uAtlasGrid.y;
  return texture2D(uTerrainAtlas, vec2(u, v));
}

vec2 fetchGridCell(vec2 coord) {
  vec2 uv = (coord + 0.5) / uGridSize;
  vec4 texel = texture2D(uTerrainGridTex, uv);
  return vec2(floor(texel.r * 255.0 + 0.5), floor(texel.g * 255.0 + 0.5));
}`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
{
  vec2 ownCell = fetchGridCell(vHexCoord);
  float ownType = ownCell.x;
  float ownVar = ownCell.y;

  if (vTerrainWorldNormal.y < 0.5) {
    vec2 sideUv = vec2(vTerrainWorldPos.x + vTerrainWorldPos.z, vTerrainWorldPos.y * 1.6) * 0.45;
    vec4 sideCol = sampleAtlasTerrain(ownType, ownVar, sideUv);
    diffuseColor.rgb *= sideCol.rgb * 0.82;
  } else {
    vec2 worldUv = vTerrainWorldPos.xz * 0.42;
    vec4 accColor = sampleAtlasTerrain(ownType, ownVar, worldUv);
    float totalWeight = 1.0;

    float apothem = uHexRadius * 0.86602540378;
    float edgeNoise = (overviewFbm(vTerrainWorldPos.xz * 2.3) - 0.5) * 0.34;

    int hx = int(floor(vHexCoord.x + 0.5));
    int hy = int(floor(vHexCoord.y + 0.5));
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

    vec2 localXZ = vTerrainWorldPos.xz - vTileCenter;

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
            vec4 nColor = (nType > 5.5)
              ? vec4(0.36, 0.34, 0.25, 1.0)
              : sampleAtlasTerrain(nType, nVar, worldUv);
            accColor += nColor * w;
            totalWeight += w;
          }
        }
      }
    }

    diffuseColor.rgb *= (accColor.rgb / totalWeight);
  }
}`
    );
  };

  return mat;
}
