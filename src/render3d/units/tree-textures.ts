import * as THREE from 'three';

export const TREE_TEXTURE_SIZE = 256;

export type TreeTexturePart = 'bark' | 'foliage' | 'foliage_cards';

export const TREE_TEXTURE_PATHS: Record<TreeTexturePart, string> = {
  bark: 'textures/terrain/tree_bark.png',
  foliage: 'textures/terrain/tree_foliage.png',
  foliage_cards: 'textures/terrain/tree_foliage_cards.png',
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

        data[idx] = clampByte(lum * 0.72);         // Muted red for grass-matched petrol-green vertex tinting
        data[idx + 1] = clampByte(lum * 0.98);     // High-luminance green channel for crisp needle detail
        data[idx + 2] = clampByte(lum * 0.86);     // Cool petrol-green blue headroom
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA alpha-masked foliage card atlas for crossed/layered tree quads:
 * - Bottom-left  (x 0..127,   y 0..127,   U 0.0..0.5, V 0.0..0.5): Broadleaf Oak/Maple leaf cluster
 * - Bottom-right (x 128..255, y 0..127,   U 0.5..1.0, V 0.0..0.5): Conifer Pine needle bough
 * - Top-left     (x 0..127,   y 128..255, U 0.0..0.5, V 0.5..1.0): Birch airy leaf sprig
 * - Top-right    (x 128..255, y 128..255, U 0.5..1.0, V 0.5..1.0): Willow weeping leaf curtain
 *
 * Uses high-luminance neutral-green/white values with hard alpha cutouts (0 or 255)
 * so vertex-color tinting produces rich species palettes with crisp alpha-tested edges.
 */
export function generateTreeFoliageCardsPixels(): Uint8Array {
  const size = TREE_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    data[idx] = clampByte(r);
    data[idx + 1] = clampByte(g);
    data[idx + 2] = clampByte(b);
    data[idx + 3] = clampByte(a);
  };

  // Helper: draw a twig segment inside a quadrant
  const drawTwig = (
    ox: number,
    oy: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number
  ) => {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - thickness - 1));
    const maxX = Math.min(127, Math.ceil(Math.max(x0, x1) + thickness + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - thickness - 1));
    const maxY = Math.min(127, Math.ceil(Math.max(y0, y1) + thickness + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy || 1;

    for (let ly = minY; ly <= maxY; ly++) {
      for (let lx = minX; lx <= maxX; lx++) {
        const t = Math.max(0, Math.min(1, ((lx - x0) * dx + (ly - y0) * dy) / lenSq));
        const px = x0 + t * dx;
        const py = y0 + t * dy;
        const dist = Math.hypot(lx - px, ly - py);
        if (dist <= thickness) {
          const shade = 1 - (dist / thickness) * 0.3;
          setPixel(ox + lx, oy + ly, 128 * shade, 96 * shade, 64 * shade, 255);
        }
      }
    }
  };

  // 1. Bottom-left (ox=0, oy=0): Broadleaf Oak / Maple cluster
  {
    const ox = 0;
    const oy = 0;
    drawTwig(ox, oy, 64, 8, 64, 72, 2.5);
    drawTwig(ox, oy, 64, 34, 30, 62, 1.8);
    drawTwig(ox, oy, 64, 38, 98, 66, 1.8);
    drawTwig(ox, oy, 64, 58, 42, 94, 1.5);
    drawTwig(ox, oy, 64, 62, 88, 96, 1.5);

    // Stamp 17 overlapping lobed leaves in an organic canopy cluster
    const leaves = [
      { cx: 64, cy: 102, rx: 17, ry: 20, rot: 0.0, shade: 1.0 },
      { cx: 42, cy: 92, rx: 16, ry: 18, rot: 0.45, shade: 0.94 },
      { cx: 86, cy: 92, rx: 16, ry: 18, rot: -0.45, shade: 0.96 },
      { cx: 24, cy: 68, rx: 15, ry: 17, rot: 0.85, shade: 0.88 },
      { cx: 104, cy: 68, rx: 15, ry: 17, rot: -0.85, shade: 0.90 },
      { cx: 46, cy: 68, rx: 18, ry: 19, rot: 0.25, shade: 0.98 },
      { cx: 82, cy: 70, rx: 18, ry: 19, rot: -0.25, shade: 0.97 },
      { cx: 64, cy: 76, rx: 19, ry: 20, rot: 0.1, shade: 1.02 },
      { cx: 28, cy: 42, rx: 14, ry: 16, rot: 1.1, shade: 0.82 },
      { cx: 100, cy: 42, rx: 14, ry: 16, rot: -1.1, shade: 0.84 },
      { cx: 48, cy: 44, rx: 16, ry: 17, rot: 0.5, shade: 0.88 },
      { cx: 80, cy: 44, rx: 16, ry: 17, rot: -0.5, shade: 0.89 },
      { cx: 64, cy: 50, rx: 17, ry: 18, rot: -0.1, shade: 0.93 },
      { cx: 38, cy: 26, rx: 13, ry: 14, rot: 0.9, shade: 0.78 },
      { cx: 90, cy: 26, rx: 13, ry: 14, rot: -0.9, shade: 0.79 },
      { cx: 64, cy: 28, rx: 15, ry: 15, rot: 0.0, shade: 0.83 },
    ];
    for (let li = 0; li < leaves.length; li++) {
      const lf = leaves[li];
      const cosR = Math.cos(lf.rot);
      const sinR = Math.sin(lf.rot);
      for (let ly = Math.max(2, Math.floor(lf.cy - lf.ry - 4)); ly <= Math.min(125, Math.ceil(lf.cy + lf.ry + 4)); ly++) {
        for (let lx = Math.max(2, Math.floor(lf.cx - lf.rx - 4)); lx <= Math.min(125, Math.ceil(lf.cx + lf.rx + 4)); lx++) {
          const dx = lx - lf.cx;
          const dy = ly - lf.cy;
          const u = dx * cosR - dy * sinR;
          const v = dx * sinR + dy * cosR;
          const normDist = Math.hypot(u / lf.rx, v / lf.ry);
          const angle = Math.atan2(v, u);
          const lobeMod = 1.0 + 0.16 * Math.cos(angle * 5.0 + li);
          if (normDist <= lobeMod) {
            const n = fbm(lx + li * 13, ly, 4, 901);
            const vein = Math.abs(u) < 1.1 && Math.abs(v) < lf.ry * 0.7 ? 1.08 : 1.0;
            const lum = (205 + (1 - normDist) * 38 + (n - 0.5) * 26) * lf.shade * vein;
            setPixel(ox + lx, oy + ly, lum * 0.86, lum, lum * 0.78, 255);
          }
        }
      }
    }
  }

  // 2. Bottom-right (ox=128, oy=0): Conifer Pine needle bough
  {
    const ox = 128;
    const oy = 0;
    drawTwig(ox, oy, 64, 6, 64, 114, 2.4);
    drawTwig(ox, oy, 64, 30, 22, 62, 1.5);
    drawTwig(ox, oy, 64, 32, 106, 62, 1.5);
    drawTwig(ox, oy, 64, 62, 28, 92, 1.4);
    drawTwig(ox, oy, 64, 64, 100, 92, 1.4);

    // Radiating needle fans along the central stem and side shoots
    const tufts = [
      { cx: 64, cy: 112, rad: 16, angleCenter: Math.PI * 0.5, spread: 1.1, shade: 1.04 },
      { cx: 44, cy: 90, rad: 22, angleCenter: Math.PI * 0.68, spread: 0.95, shade: 0.96 },
      { cx: 84, cy: 90, rad: 22, angleCenter: Math.PI * 0.32, spread: 0.95, shade: 0.96 },
      { cx: 64, cy: 84, rad: 22, angleCenter: Math.PI * 0.5, spread: 1.15, shade: 0.98 },
      { cx: 30, cy: 62, rad: 24, angleCenter: Math.PI * 0.75, spread: 0.95, shade: 0.88 },
      { cx: 98, cy: 62, rad: 24, angleCenter: Math.PI * 0.25, spread: 0.95, shade: 0.88 },
      { cx: 64, cy: 56, rad: 25, angleCenter: Math.PI * 0.5, spread: 1.25, shade: 0.92 },
      { cx: 28, cy: 36, rad: 22, angleCenter: Math.PI * 0.82, spread: 0.85, shade: 0.82 },
      { cx: 100, cy: 36, rad: 22, angleCenter: Math.PI * 0.18, spread: 0.85, shade: 0.82 },
      { cx: 64, cy: 32, rad: 24, angleCenter: Math.PI * 0.5, spread: 1.3, shade: 0.85 },
    ];
    for (let ti = 0; ti < tufts.length; ti++) {
      const tf = tufts[ti];
      const needleCount = 26;
      for (let ni = 0; ni < needleCount; ni++) {
        const frac = needleCount > 1 ? ni / (needleCount - 1) - 0.5 : 0;
        const ang = tf.angleCenter + frac * tf.spread * 2.0 + (hash2D(ti, ni, 911) - 0.5) * 0.08;
        const len = tf.rad * (0.72 + 0.28 * hash2D(ni, ti, 919));
        const x1 = tf.cx + Math.cos(ang) * len;
        const y1 = tf.cy + Math.sin(ang) * len;
        const steps = Math.ceil(len * 1.5);
        for (let s = 0; s <= steps; s++) {
          const p = s / steps;
          const px = Math.round(tf.cx + (x1 - tf.cx) * p);
          const py = Math.round(tf.cy + (y1 - tf.cy) * p);
          if (px >= 2 && px <= 125 && py >= 2 && py <= 125) {
            const lum = (178 + p * 65) * tf.shade;
            setPixel(ox + px, oy + py, lum * 0.72, lum, lum * 0.68, 255);
            if (p < 0.75) {
              setPixel(ox + px + 1, oy + py, lum * 0.68, lum * 0.96, lum * 0.64, 255);
            }
          }
        }
      }
    }
  }

  // 3. Top-left (ox=0, oy=128): Birch airy leaf sprig
  {
    const ox = 0;
    const oy = 128;
    drawTwig(ox, oy, 64, 6, 62, 114, 1.6);
    drawTwig(ox, oy, 63, 36, 26, 72, 1.1);
    drawTwig(ox, oy, 63, 46, 102, 78, 1.1);
    drawTwig(ox, oy, 62, 74, 34, 106, 1.0);
    drawTwig(ox, oy, 62, 82, 92, 110, 1.0);

    // Small, airy, spaced diamond-ovate birch leaves
    for (let bi = 0; bi < 32; bi++) {
      const cx = 20 + hash2D(bi, 1, 941) * 88;
      const cy = 22 + hash2D(bi, 2, 947) * 92;
      const distCenter = Math.hypot((cx - 64) * 0.9, (cy - 68) * 0.85);
      if (distCenter > 50) continue;
      const rx = 5.5 + hash2D(bi, 3, 953) * 3.5;
      const ry = 7.5 + hash2D(bi, 4, 961) * 4.5;
      const rot = (hash2D(bi, 5, 967) - 0.5) * 2.2;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const shade = 0.84 + (cy / 128) * 0.22;

      for (let ly = Math.max(2, Math.floor(cy - ry - 2)); ly <= Math.min(125, Math.ceil(cy + ry + 2)); ly++) {
        for (let lx = Math.max(2, Math.floor(cx - rx - 2)); lx <= Math.min(125, Math.ceil(cx + rx + 2)); lx++) {
          const dx = lx - cx;
          const dy = ly - cy;
          const u = dx * cosR - dy * sinR;
          const v = dx * sinR + dy * cosR;
          // Pointed ovate birch silhouette
          const taper = 1.0 - Math.max(0, v / ry) * 0.45;
          const d = Math.hypot(u / (rx * taper), v / ry);
          if (d <= 1.0) {
            const lum = (212 + (1 - d) * 34) * shade;
            setPixel(ox + lx, oy + ly, lum * 0.96, lum, lum * 0.72, 255);
          }
        }
      }
    }
  }

  // 4. Top-right (ox=128, oy=128): Willow weeping leaf curtain (drooping downward)
  {
    const ox = 128;
    const oy = 128;
    const strands = [18, 30, 42, 54, 66, 78, 90, 102, 112];
    for (let si = 0; si < strands.length; si++) {
      const baseX = strands[si];
      const bottomY = 8 + Math.round(hash2D(si, 7, 971) * 24);
      const sway = (hash2D(si, 8, 977) - 0.5) * 6;
      // Vertical drooping stem from top (y=124) down to bottomY
      for (let ly = bottomY; ly <= 124; ly++) {
        const t = (124 - ly) / (124 - bottomY);
        const sx = Math.round(baseX + Math.sin(t * Math.PI) * sway);
        setPixel(ox + sx, oy + ly, 128, 134, 72, 255);
      }

      // Narrow lance-shaped weeping willow leaves hanging along the strand
      for (let ly = bottomY + 4; ly <= 120; ly += 8) {
        const side = ((ly + si) % 2 === 0 ? 1 : -1);
        const t = (124 - ly) / (124 - bottomY);
        const sx = baseX + Math.sin(t * Math.PI) * sway;
        const leafLen = 9 + hash2D(si, ly, 983) * 4;
        const leafWidth = 2.4;
        for (let dy = -Math.ceil(leafLen); dy <= 1; dy++) {
          const p = Math.max(0, -dy / leafLen);
          const halfW = Math.sin(p * Math.PI) * leafWidth;
          const cx = sx + side * (1.8 + p * 2.2);
          for (let dx = -Math.ceil(halfW); dx <= Math.ceil(halfW); dx++) {
            const px = Math.round(cx + dx);
            const py = Math.round(ly + dy);
            if (px >= 2 && px <= 125 && py >= 2 && py <= 125 && Math.abs(dx) <= halfW) {
              const lum = 198 + (1 - t) * 40;
              setPixel(ox + px, oy + py, lum * 0.88, lum, lum * 0.68, 255);
            }
          }
        }
      }
    }
  }

  return data;
}

const treeTextureCache: Partial<Record<TreeTexturePart, THREE.DataTexture>> = {};

/**
 * Returns a cached 256x256 THREE.DataTexture for the requested forest tree part ('bark' | 'foliage' | 'foliage_cards').
 */
export function getTreePartTexture(part: TreeTexturePart): THREE.DataTexture {
  let tex = treeTextureCache[part];
  if (tex) return tex;

  const pixels =
    part === 'bark'
      ? generateTreeBarkPixels()
      : part === 'foliage_cards'
        ? generateTreeFoliageCardsPixels()
        : generateTreeFoliagePixels();
  tex = new THREE.DataTexture(pixels, TREE_TEXTURE_SIZE, TREE_TEXTURE_SIZE, THREE.RGBAFormat);
  tex.name = `tree_${part}_256`;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = part === 'foliage_cards' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
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
