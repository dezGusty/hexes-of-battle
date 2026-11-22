import * as THREE from 'three';
import { getWindThresholds } from '../decorations/wind-system';

export const GRAIN_HEX_RADIUS = 1.0;

export interface GrainSubPlot {
  centerX: number;
  centerZ: number;
  furrowAngle: number;
  stalkHeight: number;
  tint: THREE.Color;
}

let cachedWheatStalkTex: THREE.DataTexture | null = null;
let cachedWheatSoilTex: THREE.DataTexture | null = null;
let cachedWheatMaterial: THREE.MeshStandardMaterial | null = null;

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * Generates 3 to 5 irregular organic Voronoi sub-plots inside a pointy-top hex (radius 1.0),
 * each with its own furrow orientation, stalk height, and muted Eador-style golden-brown tint.
 */
export function generateGrainSubPlots(seed: number): GrainSubPlot[] {
  const plotCount = 3 + Math.floor(hash2(seed, 11) * 3); // 3, 4, or 5
  const baseAngle = hash2(seed, 17) * Math.PI * 2;
  const plots: GrainSubPlot[] = [];

  // Lively, pleasant orange-gold palette per sub-plot (multiplies with warm stalk texture)
  const paletteHex = [0xffe19c, 0xffd278, 0xfac564, 0xffda86, 0xf4bc58];

  for (let i = 0; i < plotCount; i++) {
    const angle = baseAngle + (i / plotCount) * Math.PI * 2 + (hash2(seed + i, 23) - 0.5) * 0.65;
    const dist = 0.28 + hash2(seed + i, 31) * 0.26;
    const tint = new THREE.Color(paletteHex[(seed + i) % paletteHex.length]);
    // Slight per-plot desaturation & value jitter
    tint.offsetHSL(
      (hash2(seed + i, 41) - 0.5) * 0.03,
      (hash2(seed + i, 43) - 0.5) * 0.06,
      (hash2(seed + i, 47) - 0.5) * 0.08
    );

    plots.push({
      centerX: Math.cos(angle) * dist,
      centerZ: Math.sin(angle) * dist,
      furrowAngle: hash2(seed + i, 53) * Math.PI,
      stalkHeight: 0.09 + hash2(seed + i, 59) * 0.055,
      tint,
    });
  }

  return plots;
}

/**
 * Evaluates which Voronoi sub-plot owns (x, z) and the distance margin to the nearest plot border.
 */
function sampleSubPlotAt(
  x: number,
  z: number,
  plots: GrainSubPlot[]
): { plotIndex: number; borderDist: number } {
  let d1 = Infinity;
  let d2 = Infinity;
  let bestIdx = 0;

  // Organic domain warp so plot borders feel hand-tilled rather than rigid straight lines
  const warpX = (valueNoise2D(x * 4.5 + 3.1, z * 4.5 + 1.7) - 0.5) * 0.09;
  const warpZ = (valueNoise2D(x * 4.5 + 8.3, z * 4.5 + 5.9) - 0.5) * 0.09;
  const wx = x + warpX;
  const wz = z + warpZ;

  for (let i = 0; i < plots.length; i++) {
    const dx = wx - plots[i].centerX;
    const dz = wz - plots[i].centerZ;
    const d = Math.hypot(dx, dz);
    if (d < d1) {
      d2 = d1;
      d1 = d;
      bestIdx = i;
    } else if (d < d2) {
      d2 = d;
    }
  }

  return { plotIndex: bestIdx, borderDist: d2 - d1 };
}

/**
 * Checks if (x, z) lies inside a pointy-top hexagon of given outer radius.
 * Pointy-top vertices are at angles 30, 90, 150, 210, 270, 330 degrees.
 */
function hexNormalizedDistance(x: number, z: number, radius: number): number {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const inradius = radius * (Math.sqrt(3) * 0.5);
  // Pointy-top hex edge distance metric
  const d1 = ax / inradius;
  const d2 = (ax * 0.5 + az * (Math.sqrt(3) * 0.5)) / inradius;
  return Math.max(d1, d2);
}

/**
 * 256x256 gritty hand-painted alpha-cutout wheat stalks & grain heads texture.
 * Eador palette: earthy umber roots -> muted ochre stalks -> dried straw & dusty amber ears.
 */
export function getWheatStalkTexture(): THREE.DataTexture {
  if (cachedWheatStalkTex) return cachedWheatStalkTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  const stalkCount = 24;
  for (let s = 0; s < stalkCount; s++) {
    const baseU = (s + 0.5) / stalkCount + (hash2(s, 1) - 0.5) * 0.018;
    const stalkTopV = 0.74 + hash2(s, 2) * 0.24;
    const lean = (hash2(s, 3) - 0.5) * 0.065;
    const toneJitter = (hash2(s, 4) - 0.5) * 16;

    const maxY = Math.floor(stalkTopV * (size - 1));
    for (let y = 0; y <= maxY; y++) {
      const v = y / (size - 1); // 0 = root, 1 = tip
      const centerU = baseU + lean * v * v;
      const headStart = stalkTopV - 0.30;
      const inHead = v > headStart;
      const headProgress = inHead ? (v - headStart) / 0.30 : 0;

      const halfWidthPx = inHead
        ? 1.6 + Math.sin(headProgress * Math.PI) * 3.6
        : 1.45 - v * 0.45;

      const centerPx = centerU * (size - 1);
      const x0 = Math.max(0, Math.floor(centerPx - halfWidthPx - 1));
      const x1 = Math.min(size - 1, Math.ceil(centerPx + halfWidthPx + 1));

      for (let x = x0; x <= x1; x++) {
        const dist = Math.abs(x - centerPx);
        if (dist > halfWidthPx) continue;

        const edgeShade = 1.0 - (dist / Math.max(0.5, halfWidthPx)) * 0.14;
        const idx = (y * size + x) * 4;

        if (inHead) {
          // Lively sunlit orange-gold wheat ear with subtle kernel stippling
          const kernel = Math.sin(v * 76 + s * 2.3) * 0.5 + 0.5;
          const awn = headProgress > 0.88 ? 0.92 : 1.0;
          const r = (232 + kernel * 22 + toneJitter * 0.7) * edgeShade * awn;
          const g = (166 + kernel * 34 + toneJitter * 0.5) * edgeShade * awn;
          const b = (42 + kernel * 24) * edgeShade;
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
          data[idx + 3] = 255;
        } else {
          // Stalk: warm golden-amber base -> bright straw-gold
          const t = v / Math.max(0.01, headStart);
          const ao = 0.68 + 0.32 * Math.min(1, t * 1.4);
          const r = (172 + t * 62 + toneJitter * 0.4) * ao * edgeShade;
          const g = (124 + t * 50 + toneJitter * 0.3) * ao * edgeShade;
          const b = (36 + t * 18) * ao * edgeShade;
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
          data[idx + 3] = 255;
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedWheatStalkTex = tex;
  return tex;
}

/**
 * Generates a 256x256 procedural patchwork tilled peat-soil texture matching the given Voronoi sub-plots,
 * with rotated furrows per plot and narrow rutted dirt paths between plots and along the hex border.
 */
export function createGrainSoilTexture(seed: number, plots?: GrainSubPlot[]): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const resolvedPlots = plots ?? generateGrainSubPlots(seed);
  const pathThreshold = 0.075;

  for (let py = 0; py < size; py++) {
    // Map UV [0, 1] back to local hex space [-1, 1]
    const z = (py / (size - 1)) * 2.0 - 1.0;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * 2.0 - 1.0;
      const idx = (py * size + px) * 4;

      const { plotIndex, borderDist } = sampleSubPlotAt(x, z, resolvedPlots);
      const plot = resolvedPlots[plotIndex];
      const hexDist = hexNormalizedDistance(x, z, GRAIN_HEX_RADIUS);

      // Coarse + fine peat soil grit
      const grit = (valueNoise2D(px * 0.25 + seed, py * 0.25) - 0.5) * 20
        + (hash2(px + seed, py) - 0.5) * 12;

      const isPath = borderDist < pathThreshold || hexDist > 0.88;
      if (isPath) {
        // Warm compacted dirt path between sub-plots
        const rut = Math.sin(borderDist * 45.0) * 6.0;
        const edgeBlend = Math.min(1.0, borderDist / pathThreshold);
        const r = 116 + rut + grit * 0.8 + (1 - edgeBlend) * 10;
        const g = 90 + rut * 0.8 + grit * 0.65 + (1 - edgeBlend) * 8;
        const b = 58 + rut * 0.6 + grit * 0.5;
        data[idx] = Math.max(30, Math.min(175, r));
        data[idx + 1] = Math.max(24, Math.min(145, g));
        data[idx + 2] = Math.max(16, Math.min(105, b));
        data[idx + 3] = 255;
      } else {
        // Warm tilled loam soil with oriented furrows per sub-plot
        const cosA = Math.cos(plot.furrowAngle);
        const sinA = Math.sin(plot.furrowAngle);
        const uRot = x * cosA - z * sinA;
        const furrow = Math.sin(uRot * 58.0) * 0.5 + 0.5;
        const pathAo = Math.min(1.0, (borderDist - pathThreshold) / 0.08) * 0.12 + 0.88;
        const r = (74 + furrow * 26 + grit * 0.6) * pathAo;
        const g = (54 + furrow * 19 + grit * 0.5) * pathAo;
        const b = (32 + furrow * 11 + grit * 0.4) * pathAo;
        data[idx] = Math.max(24, Math.min(145, r));
        data[idx + 1] = Math.max(18, Math.min(115, g));
        data[idx + 2] = Math.max(12, Math.min(82, b));
        data[idx + 3] = 255;
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
  return tex;
}

/**
 * Default cached <=256x256 tilled soil texture for tests and shared fallback.
 */
export function getWheatSoilTexture(): THREE.DataTexture {
  if (cachedWheatSoilTex) return cachedWheatSoilTex;
  cachedWheatSoilTex = createGrainSoilTexture(1);
  return cachedWheatSoilTex;
}

/**
 * Builds a custom pointy-top hexagonal BufferGeometry (outer radius = 1.0)
 * with UVs mapped across [-1, 1] and vertex colors providing subtle perimeter AO.
 */
export function buildHexSoilBaseGeometry(radius: number = GRAIN_HEX_RADIUS): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Center vertex (index 0)
  positions.push(0, 0.012, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);
  colors.push(1.0, 1.0, 1.0);

  // 6 outer pointy-top rim vertices (top surface)
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const vx = Math.cos(angle) * radius;
    const vz = Math.sin(angle) * radius;
    positions.push(vx, 0.012, vz);
    normals.push(0, 1, 0);
    uvs.push(vx * 0.5 + 0.5, vz * 0.5 + 0.5);
    colors.push(0.76, 0.73, 0.70);
  }

  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    indices.push(0, 1 + next, 1 + i);
  }

  // Low-profile beveled skirt around the hex perimeter so it sits cleanly on uneven terrain
  const skirtBase = positions.length / 3;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const vx = Math.cos(angle) * radius;
    const vz = Math.sin(angle) * radius;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    positions.push(vx, 0.012, vz);
    normals.push(nx, 0.25, nz);
    uvs.push(vx * 0.5 + 0.5, vz * 0.5 + 0.5);
    colors.push(0.65, 0.62, 0.58);

    positions.push(vx * 1.01, -0.012, vz * 1.01);
    normals.push(nx, 0.0, nz);
    uvs.push(vx * 0.5 + 0.5, vz * 0.5 + 0.5);
    colors.push(0.45, 0.42, 0.38);
  }

  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const a = skirtBase + i * 2;
    const b = skirtBase + i * 2 + 1;
    const c = skirtBase + next * 2;
    const d = skirtBase + next * 2 + 1;
    indices.push(a, c, b, c, d, b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

/**
 * Builds a low-poly crossed-quad curved-blade wheat cluster BufferGeometry (3 vertical segments)
 * with uv.y == 0 anchored at the root and uv.y == 1 at the tip.
 */
export function buildWheatClusterGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bladeAngles = [0, Math.PI / 3, (2 * Math.PI) / 3];
  const halfWidth = 0.068;
  const height = 1.0; // Scaled per-instance by sub-plot stalkHeight
  const segsY = 3;

  for (let b = 0; b < bladeAngles.length; b++) {
    const baseIdx = positions.length / 3;
    const ang = bladeAngles[b];
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const nx = -dz;
    const nz = dx;

    for (let iy = 0; iy <= segsY; iy++) {
      const ty = iy / segsY;
      // Subtle natural droop curve toward the tip
      const curveOffset = ty * ty * 0.018;
      const py = ty * height;
      const taper = 1.0 - ty * 0.12;

      for (let ix = 0; ix <= 1; ix++) {
        const sx = ix === 0 ? -1 : 1;
        const px = dx * sx * halfWidth * taper + nx * curveOffset;
        const pz = dz * sx * halfWidth * taper + nz * curveOffset;
        positions.push(px, py, pz);
        // Upward-biased foliage normal for uniform sunlit shading
        const lenN = Math.hypot(nx * 0.25, 0.97, nz * 0.25);
        normals.push((nx * 0.25) / lenN, 0.97 / lenN, (nz * 0.25) / lenN);
        uvs.push(ix, ty);
      }
    }

    for (let iy = 0; iy < segsY; iy++) {
      const a = baseIdx + iy * 2;
      const bIdx = a + 1;
      const c = a + 2;
      const d = c + 1;
      indices.push(a, bIdx, c, bIdx, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Shared wind-animated MeshStandardMaterial for instanced wheat clusters.
 * Supports Three.js scene lights/shadows, world-space rolling wind waves,
 * root ambient occlusion darkening, and warm directional rim-lighting on tips.
 */
export function getOverviewWheatMaterial(): THREE.MeshStandardMaterial {
  if (cachedWheatMaterial) return cachedWheatMaterial;

  const mat = new THREE.MeshStandardMaterial({
    map: getWheatStalkTexture(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0.02,
  });

  const thresholds = getWindThresholds();
  mat.userData = {
    isOverviewWheatMaterial: true,
    uWindTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2) },
    uWindStrength: { value: 0.5 },
    uMediumWindThreshold: { value: thresholds.mediumStrengthThreshold },
    uStrongWindThreshold: { value: thresholds.strongStrengthThreshold },
  };

  mat.customProgramCacheKey = () => 'OverviewWheatInstancedWind_v5';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = mat.userData.uWindTime;
    shader.uniforms.uWindDir = mat.userData.uWindDir;
    shader.uniforms.uWindStrength = mat.userData.uWindStrength;
    shader.uniforms.uMediumWindThreshold = mat.userData.uMediumWindThreshold;
    shader.uniforms.uStrongWindThreshold = mat.userData.uStrongWindThreshold;
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uMediumWindThreshold;
uniform float uStrongWindThreshold;
varying float vWheatTipFactor;

float wheatHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float wheatNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(wheatHash(i + vec2(0.0, 0.0)), wheatHash(i + vec2(1.0, 0.0)), u.x),
    mix(wheatHash(i + vec2(0.0, 1.0)), wheatHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vWheatTipFactor = clamp(uv.y, 0.0, 1.0);
{
  mat4 worldTransform = modelMatrix;
  #ifdef USE_INSTANCING
    worldTransform = worldTransform * instanceMatrix;
  #endif
  vec4 wp = worldTransform * vec4(transformed, 1.0);

  // Anchor base (uv.y == 0) and bend tips (uv.y == 1)
  // Cap oscillation speed at strong wind threshold; beyond it, sustain downwind lean instead of returning upright
  float heightWeight = pow(vWheatTipFactor, 1.65);
  float freqStrength = min(uWindStrength, uStrongWindThreshold);
  float strongT = smoothstep(uMediumWindThreshold, uStrongWindThreshold, uWindStrength);
  float overStrong = max(0.0, uWindStrength - uStrongWindThreshold);

  vec2 windScroll = wp.xz * 2.4 - uWindDir * uWindTime * (1.25 + freqStrength * 0.7);
  float gustNoise = wheatNoise(windScroll);
  float wavePhase = dot(wp.xz, uWindDir) * 5.0 - uWindTime * (2.2 + freqStrength * 1.35) + gustNoise * 2.4;

  float steadyLean = mix(0.28, 0.92, strongT) + overStrong * 0.40;
  float oscAmp = mix(0.72, 0.25, strongT);
  // Reduced ~50% compared to previous (0.022 + 0.032 * strength) -> (0.011 + 0.016 * strength)
  float baseSway = (0.011 + uWindStrength * 0.016) * heightWeight;
  float sway = baseSway * (steadyLean + oscAmp * (0.5 + 0.45 * sin(wavePhase) + (gustNoise - 0.5) * 0.35));

  vec3 worldWindOffset = vec3(uWindDir.x * sway, -sway * sway * 1.5, uWindDir.y * sway);
  transformed += inverse(mat3(worldTransform)) * worldWindOffset;
}`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying float vWheatTipFactor;`
    );

    // Prevent DoubleSide backface normal inversion from darkening the wheat when viewed from opposite angles
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
normal = normalize(vec3(normal.x * 0.25, abs(normal.y) + 0.85, normal.z * 0.25));`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `// Gentle root AO + warm orange-gold rim-lighting on wheat tips
float rootAo = mix(0.68, 1.0, smoothstep(0.0, 0.45, vWheatTipFactor));
gl_FragColor.rgb *= rootAo;

vec3 viewDir = normalize(vViewPosition);
float fresnel = pow(1.0 - abs(dot(normalize(normal), viewDir)), 2.2);
float tipMask = smoothstep(0.48, 1.0, vWheatTipFactor);
vec3 goldRimColor = vec3(1.0, 0.72, 0.25);
gl_FragColor.rgb += goldRimColor * fresnel * tipMask * 0.22;

#include <dithering_fragment>`
    );
  };

  cachedWheatMaterial = mat;
  return mat;
}

export function updateOverviewWheatWind(
  windTime: number,
  windAngleRad: number,
  windStrength: number
): void {
  if (!cachedWheatMaterial) return;
  cachedWheatMaterial.userData.uWindTime.value = windTime;
  cachedWheatMaterial.userData.uWindDir.value.set(
    Math.cos(windAngleRad),
    Math.sin(windAngleRad)
  );
  cachedWheatMaterial.userData.uWindStrength.value = windStrength;
  const thresholds = getWindThresholds();
  cachedWheatMaterial.userData.uMediumWindThreshold.value = thresholds.mediumStrengthThreshold;
  cachedWheatMaterial.userData.uStrongWindThreshold.value = thresholds.strongStrengthThreshold;
}

/**
 * Creates a complete procedural Eador-style grain/wheat hexagonal tile (radius = 1.0):
 * - Custom pointy-top hex tilled soil base with 3-5 Voronoi sub-plots & rutted dirt paths
 * - Single InstancedMesh rendering ~1,400 crossed-quad wheat clusters with per-plot orientation,
 *   height, and muted golden-brown tinting
 * - Wind-animated MeshStandardMaterial with root AO and warm tip rim-lighting
 */
export function createOverviewWheatFieldModel(
  seed: number = 1,
  options: { includeSoilBase?: boolean } = {}
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewAgri_wheat';

  const includeSoilBase = options.includeSoilBase ?? false;
  const plots = generateGrainSubPlots(seed);
  if (includeSoilBase) {
    const soilTex = createGrainSoilTexture(seed, plots);
    const soilMat = new THREE.MeshStandardMaterial({
      map: soilTex,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
    });

    const soilBed = new THREE.Mesh(buildHexSoilBaseGeometry(GRAIN_HEX_RADIUS), soilMat);
    soilBed.name = 'WheatSoilBed';
    soilBed.receiveShadow = true;
    group.add(soilBed);
  }

  // Scatter instanced wheat clusters across the sub-plots, avoiding rutted dirt paths
  const clusterGeo = buildWheatClusterGeometry();
  const wheatMat = getOverviewWheatMaterial();

  const placements: Array<{
    x: number;
    z: number;
    rotY: number;
    scaleXZ: number;
    scaleY: number;
    color: THREE.Color;
  }> = [];

  const gridSteps = 42;
  const pathWidth = 0.082;
  const dummyColor = new THREE.Color();

  for (let gx = 0; gx < gridSteps; gx++) {
    for (let gz = 0; gz < gridSteps; gz++) {
      const baseX = ((gx + 0.5) / gridSteps) * 2.0 - 1.0;
      const baseZ = ((gz + 0.5) / gridSteps) * 2.0 - 1.0;
      const jitterX = (hash2(gx * 13 + seed, gz * 7) - 0.5) * 0.044;
      const jitterZ = (hash2(gx * 19 + seed, gz * 11) - 0.5) * 0.044;
      const x = baseX + jitterX;
      const z = baseZ + jitterZ;

      if (hexNormalizedDistance(x, z, GRAIN_HEX_RADIUS) > 0.87) continue;

      const { plotIndex, borderDist } = sampleSubPlotAt(x, z, plots);
      if (borderDist < pathWidth) continue;

      const plot = plots[plotIndex];
      const hVar = 0.84 + hash2(gx + seed, gz + 101) * 0.34;
      const wVar = 0.82 + hash2(gx + 37, gz + seed) * 0.36;
      const rotY = plot.furrowAngle + (hash2(gx * 3 + seed, gz * 5) - 0.5) * 0.45;

      dummyColor.copy(plot.tint).offsetHSL(
        (hash2(gx, gz + seed) - 0.5) * 0.025,
        (hash2(gx + seed, gz) - 0.5) * 0.05,
        (hash2(gx * 2, gz * 2 + seed) - 0.5) * 0.1
      );

      placements.push({
        x,
        z,
        rotY,
        scaleXZ: wVar,
        scaleY: plot.stalkHeight * hVar,
        color: dummyColor.clone(),
      });
    }
  }

  const instancedWheat = new THREE.InstancedMesh(
    clusterGeo,
    wheatMat,
    Math.max(1, placements.length)
  );
  instancedWheat.name = 'WheatStalks';
  instancedWheat.castShadow = false;
  instancedWheat.receiveShadow = true;
  instancedWheat.userData.isOverviewWheatMesh = true;

  const dummy = new THREE.Object3D();
  const baseY = includeSoilBase ? 0.011 : 0.0;
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    dummy.position.set(p.x, baseY, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
    dummy.updateMatrix();
    instancedWheat.setMatrixAt(i, dummy.matrix);
    instancedWheat.setColorAt(i, p.color);
  }
  instancedWheat.instanceMatrix.needsUpdate = true;
  if (instancedWheat.instanceColor) {
    instancedWheat.instanceColor.needsUpdate = true;
  }
  group.add(instancedWheat);

  // Small weathered hay bale resting on a dirt path near the edge
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xe8af3c,
    roughness: 0.9,
    metalness: 0.02,
  });
  const hayBale = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.072, 8),
    hayMat
  );
  hayBale.name = 'WheatHayBale';
  hayBale.rotation.z = Math.PI * 0.5;
  hayBale.rotation.y = 0.45 + hash2(seed, 71) * 0.8;
  hayBale.position.set(0.36, 0.044, 0.34);
  hayBale.castShadow = true;
  hayBale.receiveShadow = true;
  group.add(hayBale);

  return group;
}

export const createGrainHexTile = createOverviewWheatFieldModel;

/**
 * Creates a larger rectangular Eador-style wind-animated wheat field for the battle
 * scene's farm environment, reusing the overview wheat cluster geometry, texture,
 * Voronoi sub-plot variation, and wind shader.
 */
export function createBattleWheatFieldModel(
  width: number = 6.0,
  depth: number = 2.6,
  seed: number = 1
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterCropField';

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3e2d1c,
    roughness: 0.96,
    metalness: 0.02,
  });
  const soilBed = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, depth), soilMat);
  soilBed.name = 'TilledSoil';
  soilBed.position.y = 0.015;
  soilBed.receiveShadow = true;
  group.add(soilBed);

  const plots = generateGrainSubPlots(seed);
  const clusterGeo = buildWheatClusterGeometry();
  const wheatMat = getOverviewWheatMaterial();

  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const gridX = Math.max(24, Math.min(48, Math.round(width * 8)));
  const gridZ = Math.max(14, Math.min(26, Math.round(depth * 8)));

  const placements: Array<{
    x: number;
    z: number;
    rotY: number;
    scaleXZ: number;
    scaleY: number;
    color: THREE.Color;
  }> = [];

  const dummyColor = new THREE.Color();
  const pathWidth = 0.075;

  for (let gx = 0; gx < gridX; gx++) {
    for (let gz = 0; gz < gridZ; gz++) {
      const u = ((gx + 0.5) / gridX) * 2.0 - 1.0;
      const v = ((gz + 0.5) / gridZ) * 2.0 - 1.0;
      const jx = (hash2(gx * 13 + seed, gz * 7) - 0.5) * (width / gridX) * 0.7;
      const jz = (hash2(gx * 19 + seed, gz * 11) - 0.5) * (depth / gridZ) * 0.7;
      const x = u * (halfW - 0.14) + jx;
      const z = v * (halfD - 0.14) + jz;

      const { plotIndex, borderDist } = sampleSubPlotAt(u * 0.85, v * 0.85, plots);
      if (borderDist < pathWidth) continue;

      const plot = plots[plotIndex];
      const hVar = 0.84 + hash2(gx + seed, gz + 101) * 0.34;
      const wVar = 2.05 + hash2(gx + 37, gz + seed) * 0.7;
      const rotY = plot.furrowAngle + (hash2(gx * 3 + seed, gz * 5) - 0.5) * 0.45;

      dummyColor.copy(plot.tint).offsetHSL(
        (hash2(gx, gz + seed) - 0.5) * 0.025,
        (hash2(gx + seed, gz) - 0.5) * 0.05,
        (hash2(gx * 2, gz * 2 + seed) - 0.5) * 0.1
      );

      placements.push({
        x,
        z,
        rotY,
        scaleXZ: wVar,
        scaleY: (plot.stalkHeight * 2.25) * hVar,
        color: dummyColor.clone(),
      });
    }
  }

  const instanced = new THREE.InstancedMesh(clusterGeo, wheatMat, placements.length);
  instanced.name = 'WheatClusters';
  instanced.castShadow = true;
  instanced.receiveShadow = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    dummy.position.set(p.x, 0.025, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
    instanced.setColorAt(i, p.color);
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) {
    instanced.instanceColor.needsUpdate = true;
  }

  group.add(instanced);
  return group;
}
