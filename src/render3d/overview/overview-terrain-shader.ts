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

export function createOverviewBlendedTerrainMaterial(
  atlasTexture: THREE.Texture,
  terrainGridTexture: THREE.DataTexture,
  mapWidth: number,
  mapHeight: number,
  hexRadius: number,
  highlightGridTexture?: THREE.DataTexture
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

  mat.customProgramCacheKey = () => 'OverviewSeamlessHexTerrain_v2';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTerrainAtlas = { value: atlasTexture };
    shader.uniforms.uTerrainGridTex = { value: terrainGridTexture };
    shader.uniforms.uHighlightGridTex = { value: highlightTex };
    shader.uniforms.uGridSize = { value: new THREE.Vector2(mapWidth, mapHeight) };
    shader.uniforms.uHexRadius = { value: hexRadius };
    shader.uniforms.uAtlasGrid = { value: new THREE.Vector2(4, 8) };
    shader.uniforms.uShowGrid = { value: 1.0 };
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
  vec4 accColor = (ownType > 5.5)
    ? vec4(0.46, 0.42, 0.31, 1.0)
    : sampleAtlasTerrain(ownType, ownVar, worldUv);
  float totalWeight = 1.0;

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
          vec4 nColor = (nType > 5.5)
            ? vec4(0.46, 0.42, 0.31, 1.0)
            : sampleAtlasTerrain(nType, nVar, worldUv);
          accColor += nColor * w;
          totalWeight += w;
        }
      }
    }
  }

  vec3 blendedRgb = accColor.rgb / totalWeight;

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

  diffuseColor.rgb *= blendedRgb;
}`
    );
  };

  return mat;
}
