import * as THREE from 'three';

let cachedWheatStalkTex: THREE.DataTexture | null = null;
let cachedWheatSoilTex: THREE.DataTexture | null = null;
let cachedWheatMaterial: THREE.MeshStandardMaterial | null = null;

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * 256x256 alpha-cutout wheat stalks & golden grain heads texture.
 */
export function getWheatStalkTexture(): THREE.DataTexture {
  if (cachedWheatStalkTex) return cachedWheatStalkTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  // Paint ~26 stalks across u in [0, 1]
  const stalkCount = 26;
  for (let s = 0; s < stalkCount; s++) {
    const baseU = (s + 0.5) / stalkCount + (hash2(s, 1) - 0.5) * 0.015;
    const stalkTopV = 0.78 + hash2(s, 2) * 0.2;
    const lean = (hash2(s, 3) - 0.5) * 0.045;
    const hueShift = (hash2(s, 4) - 0.5) * 18;

    const minY = 0;
    const maxY = Math.floor(stalkTopV * (size - 1));
    for (let y = minY; y <= maxY; y++) {
      const v = y / (size - 1); // 0 = bottom (root), 1 = top (tip)
      const centerU = baseU + lean * v * v;
      const inHead = v > stalkTopV - 0.28;
      const headProgress = inHead ? (v - (stalkTopV - 0.28)) / 0.28 : 0;
      const halfWidthPx = inHead
        ? 1.5 + Math.sin(headProgress * Math.PI) * 3.4
        : 1.4 - v * 0.4;

      const centerPx = centerU * (size - 1);
      const x0 = Math.max(0, Math.floor(centerPx - halfWidthPx - 1));
      const x1 = Math.min(size - 1, Math.ceil(centerPx + halfWidthPx + 1));

      for (let x = x0; x <= x1; x++) {
        const dist = Math.abs(x - centerPx);
        if (dist > halfWidthPx) continue;

        const idx = (y * size + x) * 4;
        if (inHead) {
          // Plump golden wheat ear with subtle kernel stippling
          const kernel = Math.sin(v * 70 + s * 2.1) * 0.5 + 0.5;
          const r = 222 + kernel * 26 + hueShift;
          const g = 180 + kernel * 30 + hueShift * 0.6;
          const b = 62 + kernel * 24;
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
          data[idx + 3] = 255;
        } else {
          // Stalk transitioning from warm olive-gold at base to straw-gold
          const t = v / Math.max(0.01, stalkTopV - 0.28);
          const r = 135 + t * 80 + hueShift * 0.5;
          const g = 122 + t * 55 + hueShift * 0.4;
          const b = 45 + t * 22;
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
 * 128x128 plowed loam furrow texture under the wheat field.
 */
export function getWheatSoilTexture(): THREE.DataTexture {
  if (cachedWheatSoilTex) return cachedWheatSoilTex;
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const furrow = Math.sin(v * Math.PI * 14) * 0.5 + 0.5;
    for (let x = 0; x < size; x++) {
      const speck = (hash2(x, y) - 0.5) * 18;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(25, Math.min(160, 78 + furrow * 24 + speck));
      data[idx + 1] = Math.max(18, Math.min(130, 56 + furrow * 18 + speck * 0.8));
      data[idx + 2] = Math.max(12, Math.min(95, 34 + furrow * 10 + speck * 0.6));
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedWheatSoilTex = tex;
  return tex;
}

/**
 * Shared wind-animated material for all overview wheat fields.
 */
export function getOverviewWheatMaterial(): THREE.MeshStandardMaterial {
  if (cachedWheatMaterial) return cachedWheatMaterial;

  const mat = new THREE.MeshStandardMaterial({
    map: getWheatStalkTexture(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0.02,
  });

  mat.userData = {
    isOverviewWheatMaterial: true,
    uWindTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2) },
    uWindStrength: { value: 0.5 },
  };

  mat.customProgramCacheKey = () => 'OverviewWheatWind_v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = mat.userData.uWindTime;
    shader.uniforms.uWindDir = mat.userData.uWindDir;
    shader.uniforms.uWindStrength = mat.userData.uWindStrength;
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
{
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  float heightWeight = pow(clamp(uv.y, 0.0, 1.0), 1.5);
  float wavePhase = dot(wp.xz, uWindDir) * 5.2 - uWindTime * (2.1 + uWindStrength * 1.4);
  float sway = (0.45 + sin(wavePhase) * 0.55) * (0.018 + uWindStrength * 0.026) * heightWeight;
  transformed.x += uWindDir.x * sway;
  transformed.z += uWindDir.y * sway;
  transformed.y -= sway * sway * 0.25;
}`
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
}

function buildWheatRowsGeometry(seed: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const appendStrip = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    height: number,
    segsAlong: number
  ) => {
    const baseIdx = positions.length / 3;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const nx = -dz / Math.max(0.001, len);
    const nz = dx / Math.max(0.001, len);
    const segsY = 2;

    for (let iy = 0; iy <= segsY; iy++) {
      const ty = iy / segsY;
      const py = 0.014 + ty * height;
      for (let ix = 0; ix <= segsAlong; ix++) {
        const tx = ix / segsAlong;
        const px = x0 + dx * tx;
        const pz = z0 + dz * tx;
        positions.push(px, py, pz);
        normals.push(nx, 0.25, nz);
        uvs.push(tx * 1.8, ty);
      }
    }

    const rowStride = segsAlong + 1;
    for (let iy = 0; iy < segsY; iy++) {
      for (let ix = 0; ix < segsAlong; ix++) {
        const a = baseIdx + iy * rowStride + ix;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  };

  // 7 primary wheat rows + 3 cross-angled fill rows for lush volume from any camera angle
  for (let r = -3; r <= 3; r++) {
    const zOff = r * 0.115;
    const halfSpan = Math.abs(r) === 3 ? 0.31 : 0.41;
    const h = 0.115 + (hash2(seed, r + 10) - 0.5) * 0.018;
    appendStrip(-halfSpan, zOff, halfSpan, zOff, h, 8);
  }
  for (let c = -1; c <= 1; c++) {
    const xOff = c * 0.22;
    appendStrip(xOff - 0.06, -0.34, xOff + 0.06, 0.34, 0.11, 6);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a wind-reactive medieval wheat field with plowed soil bed,
 * crossed golden wheat stalk strips (<=256x256 alpha-cutout texture),
 * and a small hay bale & corner stake.
 */
export function createOverviewWheatFieldModel(seed: number = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewAgri_wheat';

  const soilMat = new THREE.MeshStandardMaterial({
    map: getWheatSoilTexture(),
    color: 0x9c7b56,
    roughness: 0.95,
    metalness: 0.02,
  });

  // Low-profile plowed earth patch
  const soilBed = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.02, 0.78),
    soilMat
  );
  soilBed.name = 'WheatSoilBed';
  soilBed.position.set(0, 0.01, 0);
  soilBed.receiveShadow = true;
  group.add(soilBed);

  // Wind-reactive wheat stalk rows
  const wheatGeo = buildWheatRowsGeometry(seed);
  const wheatMesh = new THREE.Mesh(wheatGeo, getOverviewWheatMaterial());
  wheatMesh.name = 'WheatStalks';
  wheatMesh.castShadow = true;
  wheatMesh.receiveShadow = true;
  wheatMesh.userData.isOverviewWheatMesh = true;
  group.add(wheatMesh);

  // Small golden hay bale at the corner of the field
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xd9b24c,
    roughness: 0.9,
    metalness: 0.02,
  });
  const hayBale = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.072, 8),
    hayMat
  );
  hayBale.name = 'WheatHayBale';
  hayBale.rotation.z = Math.PI * 0.5;
  hayBale.rotation.y = 0.45;
  hayBale.position.set(0.36, 0.044, 0.34);
  hayBale.castShadow = true;
  group.add(hayBale);

  return group;
}
