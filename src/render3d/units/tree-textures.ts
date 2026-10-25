import * as THREE from 'three';

export const TREE_TEXTURE_SIZE = 256;

export type TreeTexturePart = 'bark' | 'foliage';

export const TREE_TEXTURE_PATHS: Record<TreeTexturePart, string> = {
  bark: 'textures/terrain/tree_bark.png',
  foliage: 'textures/terrain/tree_foliage.png',
};

function hash2D(ix: number, iy: number, seed: number): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x0 + 1, y0, seed);
  const n01 = hash2D(x0, y0 + 1, seed);
  const n11 = hash2D(x0 + 1, y0 + 1, seed);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sy * (nx1 - nx0);
}

function fbm(x: number, y: number, baseScale: number, seed: number): number {
  return (
    valueNoise(x, y, baseScale, seed) * 0.55 +
    valueNoise(x, y, Math.max(2, baseScale * 0.5), seed + 17) * 0.3 +
    valueNoise(x, y, Math.max(1, baseScale * 0.25), seed + 37) * 0.15
  );
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Generates a 256x256 RGBA pixel buffer for forest tree bark:
 * - Deep vertical bark fissures and weathered oak/pine ridges
 * - Horizontal lenticels and organic wood knots
 * - Subtle mossy root base near the bottom edge
 */
export function generateTreeBarkPixels(): Uint8Array {
  const size = TREE_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nCoarse = fbm(x, y, 14, 701);
      const nMed = fbm(x, y, 6, 709);
      const nFine = hash2D(x, y, 719);

      // Vertical bark ridges warped by medium noise
      const warpX = x + (nCoarse - 0.5) * 18.0;
      const ridgeWave = Math.sin(warpX * 0.42 + nMed * 3.2);
      // Deep dark fissures in troughs, warm brown plates on crests
      const fissure = ridgeWave < -0.35 ? -36 : ridgeWave * 22;

      // Occasional horizontal bark cracks
      const hCrack = Math.sin(y * 0.28 + nCoarse * 5.0) > 0.92 ? -24 : 0;

      // Wood knot around (96, 118) and (196, 168)
      const k1 = Math.hypot((x - 96) * 1.2, (y - 118) * 0.8);
      const k2 = Math.hypot((x - 196) * 1.2, (y - 168) * 0.8);
      let knot = 0;
      if (k1 < 18) {
        knot = Math.sin(k1 * 0.85) * 20 - 12;
      } else if (k2 < 15) {
        knot = Math.sin(k2 * 0.9) * 18 - 10;
      }

      const baseShift = (nMed - 0.5) * 28 + (nFine - 0.5) * 12 + fissure + hCrack + knot;
      let r = 104 + baseShift * 1.05;
      let g = 68 + baseShift * 0.78;
      let b = 40 + baseShift * 0.52;

      // Subtle forest moss patches near trunk base (y > 200)
      if (y > 200) {
        const mossFactor = Math.max(0, (y - 200) / 55) * (nCoarse > 0.42 ? 0.65 : 0.15);
        r = r * (1 - mossFactor) + 68 * mossFactor;
        g = g * (1 - mossFactor) + 108 * mossFactor;
        b = b * (1 - mossFactor) + 46 * mossFactor;
      }

      data[idx] = clampByte(r);
      data[idx + 1] = clampByte(g);
      data[idx + 2] = clampByte(b);
      data[idx + 3] = 255;
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for forest tree foliage:
 * - Upper half (y = 0..127, V = 0.5..1.0): Broadleaf Oak leaf clusters, veins, and canopy pockets
 * - Lower half (y = 128..255, V = 0.0..0.5): Conifer Pine needle fans and tiered frond shadows
 * Uses high-luminance canopy values so multiplying with per-tier/per-cluster green vertex colors
 * preserves rich multi-tiered greens while adding crisp leaf and needle detail.
 */
export function generateTreeFoliagePixels(): Uint8Array {
  const size = TREE_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nCoarse = fbm(x, y, 12, 809);
      const nMed = fbm(x, y, 5, 821);
      const nFine = hash2D(x, y, 829);

      if (y < 128) {
        // Broadleaf Oak leaf rosettes & dappled canopy clusters (top half: V in 0.5..1.0)
        const cellX = ((x + (nCoarse - 0.5) * 10) % 24 + 24) % 24 - 12;
        const cellY = ((y + (nMed - 0.5) * 10) % 24 + 24) % 24 - 12;
        const dist = Math.hypot(cellX, cellY);
        const angle = Math.atan2(cellY, cellX);
        // Lobed oak leaf silhouette modulation
        const lobeRadius = 9.5 + Math.cos(angle * 5) * 2.2;
        const inLeaf = dist < lobeRadius;

        // Central vein highlight vs deep inter-leaf shadow pocket
        const vein = Math.abs(cellX) < 1.2 && cellY > -7 && cellY < 7 ? 22 : 0;
        const leafShade = inLeaf
          ? 26 + (1 - dist / lobeRadius) * 28 + vein
          : -38;

        const lum = 196 + (nCoarse - 0.5) * 38 + (nFine - 0.5) * 18 + leafShade;
        data[idx] = clampByte(lum * 0.38 - 12);     // Warm leaf undertone
        data[idx + 1] = clampByte(lum + 24);         // Vivid bright leafy green
        data[idx + 2] = clampByte(lum * 0.18 - 10);    // Low blue for high green saturation
        data[idx + 3] = 255;
      } else {
        // Conifer Pine needle fronds & layered boughs (bottom half: V in 0.0..0.5)
        const localY = y - 128;
        // Radiating pine needle striations
        const needleWave = Math.sin(x * 1.35 + localY * 0.35 + nMed * 4.5) * 28;
        // Whorl tier shadow bands every ~32 rows
        const tierPhase = (localY % 32) / 32;
        const tierBounce = (tierPhase - 0.35) * 40;

        const lum =
          196 +
          needleWave +
          tierBounce +
          (nCoarse - 0.5) * 32 +
          (nFine - 0.5) * 20;

        data[idx] = clampByte(lum * 0.28 - 14);     // Deep conifer undertone
        data[idx + 1] = clampByte(lum + 20);         // Vivid forest pine needle green
        data[idx + 2] = clampByte(lum * 0.16 - 8);     // Very low blue for vibrant conifer green
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

const treeTextureCache: Partial<Record<TreeTexturePart, THREE.DataTexture>> = {};

/**
 * Returns a cached 256x256 THREE.DataTexture for the requested forest tree part ('bark' | 'foliage').
 */
export function getTreePartTexture(part: TreeTexturePart): THREE.DataTexture {
  let tex = treeTextureCache[part];
  if (tex) return tex;

  const pixels = part === 'bark' ? generateTreeBarkPixels() : generateTreeFoliagePixels();
  tex = new THREE.DataTexture(pixels, TREE_TEXTURE_SIZE, TREE_TEXTURE_SIZE, THREE.RGBAFormat);
  tex.name = `tree_${part}_256`;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  tex.userData = {
    isSharedAsset: true,
    treePart: part,
    texturePath: TREE_TEXTURE_PATHS[part],
    width: TREE_TEXTURE_SIZE,
    height: TREE_TEXTURE_SIZE,
  };

  treeTextureCache[part] = tex;
  return tex;
}

export type TreeUVRole = 'trunk' | 'pine_foliage' | 'oak_foliage';

/**
 * Computes and assigns UV coordinates on a tree sub-mesh BufferGeometry before merging
 * so each part maps cleanly onto its 256x256 tree texture region.
 */
export function applyTreeUVMapping(
  geometry: THREE.BufferGeometry,
  role: TreeUVRole
): void {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return;

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const spanY = Math.max(1e-5, maxY - minY);

  const uvs = new Float32Array(posAttr.count * 2);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const ny = (y - minY) / spanY;
    const theta = Math.atan2(z, x);

    let u = 0.5 + theta / (2 * Math.PI);
    let v = ny;

    switch (role) {
      case 'trunk':
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.96;
        break;
      case 'pine_foliage':
        // Maps to bottom half of tree_foliage.png (V = 0.02..0.48: pine needles)
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.46;
        break;
      case 'oak_foliage':
        // Maps to top half of tree_foliage.png (V = 0.52..0.98: broadleaf oak rosettes)
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.52 + ny * 0.46;
        break;
    }

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}
