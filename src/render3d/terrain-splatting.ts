import * as THREE from 'three';
import { HexMap } from '../shared/hex-map';
import { TerrainType } from '../battle/terrain-types';

export interface TerrainSplattingTextures {
  grassDiffuse: THREE.Texture;
  dirtDiffuse: THREE.Texture;
  snowDiffuse: THREE.Texture;
  rockDiffuse: THREE.Texture;
  grassNormal: THREE.DataTexture;
  dirtNormal: THREE.DataTexture;
  snowNormal: THREE.DataTexture;
  rockNormal: THREE.DataTexture;
  splatMap: THREE.DataTexture;
}

export interface TerrainSplattingUniforms {
  uSplatMap: { value: THREE.Texture };
  uBoardBounds: { value: THREE.Vector4 };
  uBoardOrigin: { value: THREE.Vector2 };
  uTexScale: { value: number };
  uGrassSplatMap: { value: THREE.Texture };
  uDirtSplatMap: { value: THREE.Texture };
  uSnowSplatMap: { value: THREE.Texture };
  uRockSplatMap: { value: THREE.Texture };
  uGrassNormalMap: { value: THREE.Texture };
  uDirtNormalMap: { value: THREE.Texture };
  uSnowNormalMap: { value: THREE.Texture };
  uRockNormalMap: { value: THREE.Texture };
  uNormalStrength: { value: number };
  uSplatBlendStrength: { value: number };
  uTime: { value: number };
  uSplatHexRadius: { value: number };
  uShowHexGridGlow: { value: number };
  uHexGridGlowColor: { value: THREE.Color };
  uHexGridGlowIntensity: { value: number };
}

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number, seed: number, octaves: number = 3): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq, seed + i * 19.3);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

/**
 * Generates a tileable procedural diffuse + tangent-space normal texture pair.
 */
function createProceduralLayerPair(
  baseRGB: [number, number, number],
  accentRGB: [number, number, number],
  seed: number,
  freq: number,
  bumpStrength: number,
  size: number = 64
): { diffuse: THREE.DataTexture; normal: THREE.DataTexture } {
  const heights = new Float32Array(size * size);
  const diffuseData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Seamless toroidal-like sampling via periodic wrap
      const nx = (x / size) * freq;
      const ny = (y / size) * freq;
      const h = fbm2D(nx, ny, seed, 3);
      heights[y * size + x] = h;

      const idx = (y * size + x) * 4;
      const t = Math.min(1, Math.max(0, h));
      diffuseData[idx] = Math.round(baseRGB[0] + (accentRGB[0] - baseRGB[0]) * t);
      diffuseData[idx + 1] = Math.round(baseRGB[1] + (accentRGB[1] - baseRGB[1]) * t);
      diffuseData[idx + 2] = Math.round(baseRGB[2] + (accentRGB[2] - baseRGB[2]) * t);
      diffuseData[idx + 3] = 255;
    }
  }

  // Sobel-style finite differences for tangent-space normal map
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;

      const dX = (heights[y * size + xp] - heights[y * size + xm]) * bumpStrength;
      const dY = (heights[yp * size + x] - heights[ym * size + x]) * bumpStrength;

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      normalData[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }

  const diffuse = new THREE.DataTexture(diffuseData, size, size, THREE.RGBAFormat);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.colorSpace = THREE.SRGBColorSpace;
  diffuse.magFilter = THREE.LinearFilter;
  diffuse.minFilter = THREE.LinearMipmapLinearFilter;
  diffuse.generateMipmaps = true;
  diffuse.needsUpdate = true;

  const normal = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.magFilter = THREE.LinearFilter;
  normal.minFilter = THREE.LinearMipmapLinearFilter;
  normal.generateMipmaps = true;
  normal.needsUpdate = true;

  return { diffuse, normal };
}

/**
 * Generates an RGBA splat map covering the hex board:
 * R = grass, G = dirt, B = snow, A = dark rock.
 */
export function createBoardSplatMap(
  hexMap: HexMap,
  hexRadius: number,
  getTerrainAt: (x: number, y: number) => TerrainType,
  hexToWorld: (x: number, y: number) => THREE.Vector3
): { splatMap: THREE.DataTexture; bounds: THREE.Vector4 } {
  const widthSpacing = hexRadius * Math.sqrt(3);
  const heightSpacing = hexRadius * 1.5;

  const minX = -((hexMap.width - 1) * 0.5 + 1.0) * widthSpacing;
  const maxX = ((hexMap.width - 1) * 0.5 + 1.5) * widthSpacing;
  const minZ = -((hexMap.height - 1) * 0.5 + 1.0) * heightSpacing;
  const maxZ = ((hexMap.height - 1) * 0.5 + 1.0) * heightSpacing;

  const sizeX = Math.max(1, maxX - minX);
  const sizeZ = Math.max(1, maxZ - minZ);
  const bounds = new THREE.Vector4(minX, minZ, 1 / sizeX, 1 / sizeZ);

  const texSize = 64;
  const data = new Uint8Array(texSize * texSize * 4);

  // Precompute tile centers + terrains
  const tiles: Array<{ wx: number; wz: number; terrain: TerrainType }> = [];
  for (let hx = 0; hx < hexMap.width; hx++) {
    for (let hy = 0; hy < hexMap.height; hy++) {
      const p = hexToWorld(hx, hy);
      tiles.push({ wx: p.x, wz: p.z, terrain: getTerrainAt(hx, hy) });
    }
  }

  for (let py = 0; py < texSize; py++) {
    const v = py / (texSize - 1);
    const wz = minZ + v * sizeZ;
    for (let px = 0; px < texSize; px++) {
      const u = px / (texSize - 1);
      const wx = minX + u * sizeX;

      let r = 0.7; // grass
      let g = 0.2; // dirt
      let b = 0.0; // snow
      let a = 0.1; // dark rock

      // Find closest tile for terrain-aware splat weights
      let closestDistSq = Infinity;
      let closestTerrain = TerrainType.PLAIN;
      for (let i = 0; i < tiles.length; i++) {
        const dx = wx - tiles[i].wx;
        const dz = wz - tiles[i].wz;
        const dSq = dx * dx + dz * dz;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestTerrain = tiles[i].terrain;
        }
      }

      const n1 = fbm2D(wx * 0.65, wz * 0.65, 11.3, 2);
      const n2 = fbm2D(wx * 1.1, wz * 1.1, 37.9, 2);

      if (closestTerrain === TerrainType.PLAIN || closestTerrain === TerrainType.FOREST) {
        r = 0.72 + n1 * 0.25;
        g = 0.18 + n2 * 0.22;
        b = 0.0;
        a = 0.06;
      } else if (closestTerrain === TerrainType.SWAMP) {
        r = 0.30 + n1 * 0.20;
        g = 0.58 + n2 * 0.25;
        b = 0.0;
        a = 0.12;
      } else if (closestTerrain === TerrainType.HILL) {
        r = 0.25 + n1 * 0.20;
        g = 0.35 + n2 * 0.20;
        b = n1 > 0.68 ? 0.22 : 0.04; // subtle frost/snow highlights on hilltops
        a = 0.36;
      } else if (closestTerrain === TerrainType.WATER) {
        r = 0.15;
        g = 0.55;
        b = 0.0;
        a = 0.30;
      }

      const sum = Math.max(0.001, r + g + b + a);
      const idx = (py * texSize + px) * 4;
      data[idx] = Math.round((r / sum) * 255);
      data[idx + 1] = Math.round((g / sum) * 255);
      data[idx + 2] = Math.round((b / sum) * 255);
      data[idx + 3] = Math.round((a / sum) * 255);
    }
  }

  const splatMap = new THREE.DataTexture(data, texSize, texSize, THREE.RGBAFormat);
  splatMap.wrapS = THREE.ClampToEdgeWrapping;
  splatMap.wrapT = THREE.ClampToEdgeWrapping;
  splatMap.magFilter = THREE.LinearFilter;
  splatMap.minFilter = THREE.LinearFilter;
  splatMap.needsUpdate = true;
  splatMap.name = 'EadorTerrainSplatMap';

  return { splatMap, bounds };
}

export class TerrainSplattingContext {
  public readonly textures: TerrainSplattingTextures;
  public readonly uniforms: TerrainSplattingUniforms;
  private ownedTextures: THREE.Texture[] = [];

  constructor(
    hexMap: HexMap,
    hexRadius: number,
    getTerrainAt: (x: number, y: number) => TerrainType,
    hexToWorld: (x: number, y: number) => THREE.Vector3
  ) {
    const grassPair = createProceduralLayerPair([54, 108, 56], [84, 138, 68], 1.7, 6.0, 2.2);
    const dirtPair = createProceduralLayerPair([112, 86, 56], [148, 114, 74], 5.3, 7.0, 2.8);
    const snowPair = createProceduralLayerPair([210, 222, 232], [242, 246, 250], 9.1, 5.0, 1.4);
    const rockPair = createProceduralLayerPair([62, 58, 54], [102, 94, 86], 13.7, 8.0, 4.0);

    const { splatMap, bounds } = createBoardSplatMap(hexMap, hexRadius, getTerrainAt, hexToWorld);
    const originPos = hexToWorld(0, 0);

    this.textures = {
      grassDiffuse: grassPair.diffuse,
      dirtDiffuse: dirtPair.diffuse,
      snowDiffuse: snowPair.diffuse,
      rockDiffuse: rockPair.diffuse,
      grassNormal: grassPair.normal,
      dirtNormal: dirtPair.normal,
      snowNormal: snowPair.normal,
      rockNormal: rockPair.normal,
      splatMap,
    };

    this.ownedTextures.push(
      grassPair.diffuse,
      grassPair.normal,
      dirtPair.diffuse,
      dirtPair.normal,
      snowPair.diffuse,
      snowPair.normal,
      rockPair.diffuse,
      rockPair.normal,
      splatMap
    );

    this.uniforms = {
      uSplatMap: { value: splatMap },
      uBoardBounds: { value: bounds },
      uBoardOrigin: { value: new THREE.Vector2(originPos.x, originPos.z) },
      uTexScale: { value: 0.42 },
      uGrassSplatMap: { value: grassPair.diffuse },
      uDirtSplatMap: { value: dirtPair.diffuse },
      uSnowSplatMap: { value: snowPair.diffuse },
      uRockSplatMap: { value: rockPair.diffuse },
      uGrassNormalMap: { value: grassPair.normal },
      uDirtNormalMap: { value: dirtPair.normal },
      uSnowNormalMap: { value: snowPair.normal },
      uRockNormalMap: { value: rockPair.normal },
      uNormalStrength: { value: 0.48 },
      uSplatBlendStrength: { value: 0.55 },
      uTime: { value: 0 },
      uSplatHexRadius: { value: hexRadius },
      uShowHexGridGlow: { value: 1.0 },
      uHexGridGlowColor: { value: new THREE.Color(0xffd27a) },
      uHexGridGlowIntensity: { value: 0.42 },
    };
  }

  public setLoadedDiffuseTextures(opts: {
    grass?: THREE.Texture;
    dirt?: THREE.Texture;
    rock?: THREE.Texture;
  }): void {
    const configureRepeat = (tex: THREE.Texture) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
    };
    if (opts.grass) {
      configureRepeat(opts.grass);
      this.textures.grassDiffuse = opts.grass;
      this.uniforms.uGrassSplatMap.value = opts.grass;
    }
    if (opts.dirt) {
      configureRepeat(opts.dirt);
      this.textures.dirtDiffuse = opts.dirt;
      this.uniforms.uDirtSplatMap.value = opts.dirt;
    }
    if (opts.rock) {
      configureRepeat(opts.rock);
      this.textures.rockDiffuse = opts.rock;
      this.uniforms.uRockSplatMap.value = opts.rock;
    }
  }

  public rebuildSplatMap(
    hexMap: HexMap,
    hexRadius: number,
    getTerrainAt: (x: number, y: number) => TerrainType,
    hexToWorld: (x: number, y: number) => THREE.Vector3
  ): void {
    const oldSplat = this.textures.splatMap;
    const { splatMap, bounds } = createBoardSplatMap(hexMap, hexRadius, getTerrainAt, hexToWorld);
    const originPos = hexToWorld(0, 0);
    this.textures.splatMap = splatMap;
    this.uniforms.uSplatMap.value = splatMap;
    this.uniforms.uBoardBounds.value.copy(bounds);
    this.uniforms.uBoardOrigin.value.set(originPos.x, originPos.z);
    this.uniforms.uSplatHexRadius.value = hexRadius;
    this.ownedTextures.push(splatMap);
    oldSplat.dispose();
  }

  public updateTime(deltaMS: number): void {
    this.uniforms.uTime.value += deltaMS * 0.001;
  }

  public setGridGlowVisible(visible: boolean): void {
    this.uniforms.uShowHexGridGlow.value = visible ? 1.0 : 0.0;
  }

  /**
   * Injects Eador multi-texture splatting, triplanar rock cliffs (worldNormal.y < 0.6),
   * and glowing hex borders into a MeshStandardMaterial shader.
   */
  public applyToShader(shader: THREE.WebGLProgramParametersWithUniforms): void {
    Object.assign(shader.uniforms, this.uniforms);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
varying vec3 vEadorWorldPos;
varying vec3 vEadorWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec4 eadorWorldPos4 = modelMatrix * vec4(position, 1.0);
vEadorWorldPos = eadorWorldPos4.xyz;
vEadorWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying vec3 vEadorWorldPos;
varying vec3 vEadorWorldNormal;
uniform sampler2D uSplatMap;
uniform vec4 uBoardBounds;
uniform vec2 uBoardOrigin;
uniform float uTexScale;
uniform sampler2D uGrassSplatMap;
uniform sampler2D uDirtSplatMap;
uniform sampler2D uSnowSplatMap;
uniform sampler2D uRockSplatMap;
uniform sampler2D uGrassNormalMap;
uniform sampler2D uDirtNormalMap;
uniform sampler2D uSnowNormalMap;
uniform sampler2D uRockNormalMap;
uniform float uNormalStrength;
uniform float uSplatBlendStrength;
uniform float uTime;
uniform float uSplatHexRadius;
uniform float uShowHexGridGlow;
uniform vec3 uHexGridGlowColor;
uniform float uHexGridGlowIntensity;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
{
  vec2 splatUv = clamp((vEadorWorldPos.xz - uBoardBounds.xy) * uBoardBounds.zw, 0.0, 1.0);
  vec4 splatW = texture2D(uSplatMap, splatUv);
  float splatSum = max(0.001, splatW.r + splatW.g + splatW.b + splatW.a);
  splatW /= splatSum;

  vec2 worldUv = vEadorWorldPos.xz * uTexScale;
  vec3 grassSplatCol = texture2D(uGrassSplatMap, worldUv).rgb;
  vec3 dirtSplatCol  = texture2D(uDirtSplatMap, worldUv).rgb;
  vec3 snowSplatCol  = texture2D(uSnowSplatMap, worldUv).rgb;
  vec3 rockSplatCol  = texture2D(uRockSplatMap, worldUv).rgb;

  vec3 splattedAlbedo = grassSplatCol * splatW.r
                      + dirtSplatCol  * splatW.g
                      + snowSplatCol  * splatW.b
                      + rockSplatCol  * splatW.a;

  // Triplanar mapping on steep slopes (worldNormal.y < 0.6)
  vec3 triW = pow(abs(vEadorWorldNormal), vec3(4.0));
  triW /= max(0.001, triW.x + triW.y + triW.z);
  float triScale = uTexScale * 1.15;
  vec3 rockTriX = texture2D(uRockSplatMap, vEadorWorldPos.zy * triScale).rgb;
  vec3 rockTriY = texture2D(uRockSplatMap, vEadorWorldPos.xz * triScale).rgb;
  vec3 rockTriZ = texture2D(uRockSplatMap, vEadorWorldPos.xy * triScale).rgb;
  vec3 triplanarRock = rockTriX * triW.x + rockTriY * triW.y + rockTriZ * triW.z;

  float cliffBlend = 1.0 - smoothstep(0.35, 0.60, vEadorWorldNormal.y);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * splattedAlbedo * 1.65, uSplatBlendStrength);
  diffuseColor.rgb = mix(diffuseColor.rgb, triplanarRock * 0.85, cliffBlend * 0.88);
}`
    );

    if (shader.fragmentShader.includes('#include <normal_fragment_maps>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  vec2 splatUvN = clamp((vEadorWorldPos.xz - uBoardBounds.xy) * uBoardBounds.zw, 0.0, 1.0);
  vec4 splatWN = texture2D(uSplatMap, splatUvN);
  splatWN /= max(0.001, splatWN.r + splatWN.g + splatWN.b + splatWN.a);

  vec2 worldUvN = vEadorWorldPos.xz * uTexScale;
  vec3 nGrass = texture2D(uGrassNormalMap, worldUvN).xyz * 2.0 - 1.0;
  vec3 nDirt  = texture2D(uDirtNormalMap, worldUvN).xyz * 2.0 - 1.0;
  vec3 nSnow  = texture2D(uSnowNormalMap, worldUvN).xyz * 2.0 - 1.0;
  vec3 nRock  = texture2D(uRockNormalMap, worldUvN).xyz * 2.0 - 1.0;

  vec3 blendedTangentN = nGrass * splatWN.r + nDirt * splatWN.g + nSnow * splatWN.b + nRock * splatWN.a;
  float cliffBlendN = 1.0 - smoothstep(0.35, 0.60, vEadorWorldNormal.y);
  vec3 finalPerturb = mix(blendedTangentN, nRock, cliffBlendN);

  vec3 worldPerturb = vec3(finalPerturb.x, 0.0, finalPerturb.y) * uNormalStrength;
  vec3 viewPerturb = (viewMatrix * vec4(worldPerturb, 0.0)).xyz;
  normal = normalize(normal + viewPerturb);
}`
      );
    }

    if (shader.fragmentShader.includes('#include <emissivemap_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
if (uShowHexGridGlow > 0.5) {
  vec2 pHex = vEadorWorldPos.xz - uBoardOrigin;
  vec2 sHex = vec2(1.73205080757, 3.0) * uSplatHexRadius;
  vec4 hHex = vec4(pHex, pHex - sHex * 0.5);
  vec4 pMod = mod(hHex, vec4(sHex, sHex)) - vec4(sHex, sHex) * 0.5;
  vec2 nearestHex = dot(pMod.xy, pMod.xy) < dot(pMod.zw, pMod.zw) ? pMod.xy : pMod.zw;
  float apothemHex = uSplatHexRadius * 0.86602540378;
  vec2 qHex = abs(nearestHex);
  float hexD = max(qHex.x, qHex.x * 0.5 + qHex.y * 0.86602540378);
  float edgeDist = apothemHex - hexD;
  float lineMask = smoothstep(0.055 * uSplatHexRadius, 0.0, edgeDist);
  float topMask = smoothstep(0.55, 0.78, vEadorWorldNormal.y);
  float pulse = 0.78 + 0.22 * sin(uTime * 2.2);
  totalEmissiveRadiance += uHexGridGlowColor * (lineMask * topMask * pulse * uHexGridGlowIntensity);
}`
      );
    }
  }

  public dispose(): void {
    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedTextures = [];
  }
}
