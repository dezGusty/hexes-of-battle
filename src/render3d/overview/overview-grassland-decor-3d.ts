import * as THREE from 'three';
import { getWindThresholds } from '../decorations/wind-system';

let cachedMeadowTex: THREE.DataTexture | null = null;
let cachedMeadowMat: THREE.MeshStandardMaterial | null = null;
let cachedStoneMat: THREE.MeshStandardMaterial | null = null;

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * 256x256 alpha-cutout meadow atlas:
 * - Left half (u: 0.0..0.5): Wild meadow grass tuft
 * - Right half (u: 0.5..1.0): Meadow grass with white, golden, and lavender wildflowers
 */
export function getOverviewMeadowTexture(): THREE.DataTexture {
  if (cachedMeadowTex) return cachedMeadowTex;

  const size = 256;
  const half = size / 2;
  const data = new Uint8Array(size * size * 4);

  const paintBlade = (
    uOffsetPx: number,
    basePx: number,
    heightPx: number,
    leanPx: number,
    widthPx: number,
    rBase: number,
    gBase: number,
    bBase: number,
    rTip: number,
    gTip: number,
    bTip: number
  ) => {
    const maxY = Math.min(size - 1, Math.floor(heightPx));
    for (let y = 0; y <= maxY; y++) {
      const t = y / Math.max(1, maxY);
      const cx = uOffsetPx + basePx + leanPx * t * t;
      const hw = widthPx * (1.0 - t * 0.72);
      const x0 = Math.max(uOffsetPx, Math.floor(cx - hw));
      const x1 = Math.min(uOffsetPx + half - 1, Math.ceil(cx + hw));
      for (let x = x0; x <= x1; x++) {
        if (Math.abs(x - cx) > hw) continue;
        const idx = (y * size + x) * 4;
        data[idx] = Math.round(rBase + (rTip - rBase) * t);
        data[idx + 1] = Math.round(gBase + (gTip - gBase) * t);
        data[idx + 2] = Math.round(bBase + (bTip - bBase) * t);
        data[idx + 3] = 255;
      }
    }
  };

  // Left half: 14 lush grass blades
  for (let b = 0; b < 14; b++) {
    const basePx = 12 + (b / 13) * (half - 24) + (hash2(b, 1) - 0.5) * 6;
    const heightPx = 105 + hash2(b, 2) * 115;
    const leanPx = (hash2(b, 3) - 0.5) * 28;
    const widthPx = 2.6 + hash2(b, 4) * 1.4;
    paintBlade(0, basePx, heightPx, leanPx, widthPx, 58, 92, 40, 134, 174, 74);
  }

  // Right half: grass stems + wildflower blossoms
  const flowerColors: Array<[number, number, number]> = [
    [248, 244, 224], // white daisy
    [245, 202, 68],  // golden buttercup
    [186, 162, 232], // soft lavender
  ];
  for (let b = 0; b < 12; b++) {
    const basePx = 14 + (b / 11) * (half - 28) + (hash2(b, 11) - 0.5) * 6;
    const heightPx = 95 + hash2(b, 12) * 110;
    const leanPx = (hash2(b, 13) - 0.5) * 24;
    const widthPx = 2.2 + hash2(b, 14) * 1.0;
    paintBlade(half, basePx, heightPx, leanPx, widthPx, 54, 88, 38, 118, 158, 68);

    if (b % 2 === 0) {
      const tipX = half + basePx + leanPx;
      const tipY = Math.min(size - 8, Math.floor(heightPx));
      const [fr, fg, fb] = flowerColors[(b / 2) % flowerColors.length];
      const radius = 5 + Math.floor(hash2(b, 15) * 3);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > radius) continue;
          const px = Math.round(tipX + dx);
          const py = Math.round(tipY + dy);
          if (px < half || px >= size || py < 0 || py >= size) continue;
          const idx = (py * size + px) * 4;
          const isCenter = dist < radius * 0.42;
          data[idx] = isCenter ? 236 : fr;
          data[idx + 1] = isCenter ? 178 : fg;
          data[idx + 2] = isCenter ? 48 : fb;
          data[idx + 3] = 255;
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedMeadowTex = tex;
  return tex;
}

/**
 * Shared crossed-quad geometry for meadow grass & wildflowers (anchored at y = 0).
 */
export function buildOverviewMeadowClusterGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
  const halfW = 0.085;
  const height = 0.14;
  const segsY = 2;

  for (const ang of angles) {
    const baseIdx = positions.length / 3;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const nx = -dz;
    const nz = dx;

    for (let iy = 0; iy <= segsY; iy++) {
      const ty = iy / segsY;
      const py = ty * height;
      const lean = ty * ty * 0.014;
      for (let ix = 0; ix <= 1; ix++) {
        const sx = ix === 0 ? -1 : 1;
        positions.push(
          dx * sx * halfW + nx * lean,
          py,
          dz * sx * halfW + nz * lean
        );
        const lenN = Math.hypot(nx * 0.25, 0.97, nz * 0.25);
        normals.push((nx * 0.25) / lenN, 0.97 / lenN, (nz * 0.25) / lenN);
        uvs.push(ix, ty);
      }
    }

    for (let iy = 0; iy < segsY; iy++) {
      const a = baseIdx + iy * 2;
      const b = a + 1;
      const c = a + 2;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function getOverviewMeadowMaterial(): THREE.MeshStandardMaterial {
  if (cachedMeadowMat) return cachedMeadowMat;

  const thresholds = getWindThresholds();
  const mat = new THREE.MeshStandardMaterial({
    map: getOverviewMeadowTexture(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0.02,
  });

  mat.userData = {
    isOverviewMeadowMaterial: true,
    uWindTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2) },
    uWindStrength: { value: 0.9 },
    uMediumWindThreshold: { value: thresholds.mediumStrengthThreshold },
    uStrongWindThreshold: { value: thresholds.strongStrengthThreshold },
  };

  mat.customProgramCacheKey = () => 'OverviewMeadowInstancedWind_v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = mat.userData.uWindTime;
    shader.uniforms.uWindDir = mat.userData.uWindDir;
    shader.uniforms.uWindStrength = mat.userData.uWindStrength;
    shader.uniforms.uMediumWindThreshold = mat.userData.uMediumWindThreshold;
    shader.uniforms.uStrongWindThreshold = mat.userData.uStrongWindThreshold;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
attribute float aAtlasOffset;
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uMediumWindThreshold;
uniform float uStrongWindThreshold;
varying float vAtlasOffset;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
vAtlasOffset = aAtlasOffset;
#ifdef USE_MAP
  vMapUv = vec2(vMapUv.x * 0.5 + aAtlasOffset, vMapUv.y);
#endif`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
{
  mat4 worldTransform = modelMatrix;
  #ifdef USE_INSTANCING
    worldTransform = worldTransform * instanceMatrix;
  #endif
  vec4 wp = worldTransform * vec4(transformed, 1.0);

  float heightWeight = pow(clamp(uv.y, 0.0, 1.0), 1.6);
  float freqStrength = min(uWindStrength, uStrongWindThreshold);
  float strongT = smoothstep(uMediumWindThreshold, uStrongWindThreshold, uWindStrength);
  float overStrong = max(0.0, uWindStrength - uStrongWindThreshold);

  float phase = wp.x * 2.1 + wp.z * 1.7;
  float wave = sin(uWindTime * (2.6 + freqStrength * 1.4) + phase);
  float steadyLean = mix(0.25, 0.90, strongT) + overStrong * 0.40;
  float oscAmp = mix(0.75, 0.25, strongT);
  float baseSway = (0.012 + uWindStrength * 0.018) * heightWeight;
  float sway = baseSway * (steadyLean + oscAmp * (0.5 + 0.5 * wave));

  vec3 worldOffset = vec3(uWindDir.x * sway, -sway * sway * 1.2, uWindDir.y * sway);
  transformed += inverse(mat3(worldTransform)) * worldOffset;
}`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
normal = normalize(vec3(normal.x * 0.25, abs(normal.y) + 0.85, normal.z * 0.25));`
    );
  };

  cachedMeadowMat = mat;
  return mat;
}

export function getOverviewFieldstoneMaterial(): THREE.MeshStandardMaterial {
  if (cachedStoneMat) return cachedStoneMat;
  cachedStoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
  });
  return cachedStoneMat;
}

export function updateOverviewMeadowWind(
  windTime: number,
  windAngleRad: number,
  windStrength: number
): void {
  if (!cachedMeadowMat) return;
  cachedMeadowMat.userData.uWindTime.value = windTime;
  cachedMeadowMat.userData.uWindDir.value.set(
    Math.cos(windAngleRad),
    Math.sin(windAngleRad)
  );
  cachedMeadowMat.userData.uWindStrength.value = windStrength;
  const thresholds = getWindThresholds();
  cachedMeadowMat.userData.uMediumWindThreshold.value = thresholds.mediumStrengthThreshold;
  cachedMeadowMat.userData.uStrongWindThreshold.value = thresholds.strongStrengthThreshold;
}
