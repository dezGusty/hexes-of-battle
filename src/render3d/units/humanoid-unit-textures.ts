import * as THREE from 'three';
import { getBarbarianPartTexture, getBarbarianPartMaterial } from './barbarian-textures';

export const HUMANOID_TEXTURE_SIZE = 256;

export type SupportedHumanoidTexturedUnit = 'peasant' | 'peasant_archer' | 'spearman';

export const HUMANOID_TEXTURE_PATHS: Record<string, string> = {
  skin: 'textures/units/barbarian_skin.png',
  peasant_face: 'textures/units/peasant_face.png',
  peasant_cloth: 'textures/units/peasant_cloth.png',
  peasant_pitchfork: 'textures/units/peasant_pitchfork.png',
  archer_face: 'textures/units/archer_face.png',
  archer_clothing: 'textures/units/archer_clothing.png',
  archer_bow: 'textures/units/archer_bow.png',
  spearman_face: 'textures/units/spearman_face.png',
  spearman_armor: 'textures/units/spearman_armor.png',
  spearman_gear: 'textures/units/spearman_gear.png',
};

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hash2D(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
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
    0.55 * valueNoise(x, y, baseScale, seed) +
    0.30 * valueNoise(x, y, baseScale * 0.5, seed + 17) +
    0.15 * valueNoise(x, y, baseScale * 0.25, seed + 37)
  );
}

// ==========================================
// 1. PEASANT TEXTURES
// ==========================================

/**
 * Generates a 256x256 RGBA pixel buffer for the Peasant's face & cloth hood:
 * - Rows y = 0..62 (v = 0.76..1.0): Coarse homespun cloth hood weave with stitched seams.
 * - Rows y = 63..255 (v = 0.0..0.76): Weathered rustic face, realistic eyes, bushy brows,
 *   nose shading, scruff/stubble, mouth, and subtle field labor dirt smudges.
 */
export function generatePeasantFacePixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 301);
      const fine = hash2D(x, y, 303);

      // Top band: Peasant cloth hood (y < 63)
      if (y < 63) {
        // Coarse woven cross-stitch pattern
        const weaveX = Math.abs(Math.sin(x * 0.95)) * 14;
        const weaveY = Math.abs(Math.sin(y * 0.95)) * 14;
        let lum = 210 + (n - 0.5) * 28 + weaveX + weaveY;
        // Seam stitch line at y = 52
        if (y === 52 || y === 53) {
          lum -= (x % 6 < 3) ? 42 : -18;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 4);
        data[idx + 2] = clampByte(c - 10);
        data[idx + 3] = 255;
        continue;
      }

      // Rustic face region (y >= 63, center at x = 128)
      const dx = x - 128;
      const adx = Math.abs(dx);
      const pore = (n - 0.5) * 20 + (fine - 0.5) * 8;

      // Natural weathered peasant skin base
      let r = 222 + pore;
      let g = 178 + pore * 0.82;
      let b = 142 + pore * 0.68;

      // Cheek dirt smudges from farm work
      const dirt1 = fbm(x + 50, y, 12, 311);
      if (adx >= 18 && adx <= 48 && y >= 140 && y <= 180 && dirt1 > 0.62) {
        const dAmt = (dirt1 - 0.62) * 60;
        r -= dAmt * 1.1;
        g -= dAmt * 1.2;
        b -= dAmt * 1.3;
      }

      // Bushy rustic eyebrows (y = 126..136, adx = 8..36)
      const browY = 132 + (adx - 10) * -0.12;
      if (adx >= 8 && adx <= 36 && Math.abs(y - browY) <= 3.8) {
        const hair = Math.sin(x * 1.2 + n * 4) * 16;
        r = 72 + hair;
        g = 52 + hair * 0.8;
        b = 36 + hair * 0.6;
      }

      // Expressive eyes (centers at x = 128 +/- 19, y = 144)
      const eyeDx = adx - 19;
      const eyeDy = y - 144;
      const eyeDist = Math.hypot(eyeDx * 0.8, eyeDy * 1.4);
      if (eyeDist < 7.8) {
        if (eyeDist > 6.2) {
          r = 48;
          g = 34;
          b = 28;
        } else if (Math.hypot(eyeDx, eyeDy) < 3.2) {
          const glint = eyeDx < -0.4 && eyeDy < -0.4 ? 215 : 0;
          r = clampByte(40 + glint);
          g = clampByte(32 + glint);
          b = clampByte(22 + glint);
        } else {
          r = 238;
          g = 234;
          b = 226;
        }
      }

      // Nose bridge and nostrils
      if (adx <= 8 && y >= 140 && y <= 168) {
        if (adx <= 3.2 && y <= 162) {
          r += 14;
          g += 10;
          b += 6;
        } else if (adx >= 5.0) {
          r -= 22;
          g -= 18;
          b -= 14;
        }
        if (y >= 163 && Math.abs(adx - 3.8) <= 2.0) {
          r = 60;
          g = 38;
          b = 30;
        }
      }

      // Peasant short stubble around jaw and upper lip (y = 168..210, adx <= 54)
      if (y >= 168 && adx <= 54) {
        const stubbleNoise = hash2D(x, y, 321);
        if (stubbleNoise > 0.52) {
          const s = (stubbleNoise - 0.52) * 55;
          r -= s * 1.1;
          g -= s * 1.2;
          b -= s * 1.3;
        }
        // Mouth line at y = 178, adx <= 14
        if (Math.abs(y - 178) <= 1.5 && adx <= 14) {
          r = 85;
          g = 48;
          b = 42;
        }
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
 * Generates a 256x256 RGBA pixel buffer for the Peasant's clothing:
 * - Upper band (y = 0..100): Coarse homespun linen tunic with threads and fold creases.
 * - Mid band (y = 101..135): Hemp rope belt with bronze buckle.
 * - Lower band (y = 136..200): Wool trousers with patch stitching.
 * - Bottom band (y = 201..255): Rough hide boots with cross-laced straps.
 */
export function generatePeasantClothPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 6, 331);
      const fine = hash2D(x, y, 333);

      if (y < 105) {
        // Coarse tunic linen (neutral luminance multiplied by matCloth / matTeam)
        const threadX = Math.abs(Math.sin(x * 1.1)) * 18;
        const threadY = Math.abs(Math.sin(y * 1.1)) * 18;
        const fold = Math.sin((x + y * 0.3) * 0.12) * 22;
        let lum = 215 + (n - 0.5) * 26 + threadX + threadY + fold;

        // Tunic hem seam at y = 98..102
        if (y >= 98 && y <= 102) {
          lum -= (x % 5 < 3) ? 38 : -14;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 2);
        data[idx + 2] = clampByte(c - 6);
        data[idx + 3] = 255;
      } else if (y < 136) {
        // Hemp rope / leather belt band
        const rope = Math.sin((x * 0.75 + y * 0.5)) * 28;
        let lum = 185 + (n - 0.5) * 24 + rope;
        // Belt buckle at center x = 120..136
        if (x >= 120 && x <= 136 && y >= 110 && y <= 128) {
          if (x === 120 || x === 136 || y === 110 || y === 128) {
            data[idx] = 235;
            data[idx + 1] = 195;
            data[idx + 2] = 85;
            data[idx + 3] = 255;
            continue;
          }
          lum -= 45;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 12);
        data[idx + 2] = clampByte(c - 24);
        data[idx + 3] = 255;
      } else if (y < 205) {
        // Wool trousers with fabric texture
        const twill = Math.sin((x + y) * 1.2) * 16;
        let lum = 205 + (n - 0.5) * 24 + twill;
        // Patch on right knee at x = 150..180, y = 160..185
        if (x >= 150 && x <= 180 && y >= 160 && y <= 185) {
          if (x === 150 || x === 180 || y === 160 || y === 185) {
            lum -= 55; // stitch border
          } else {
            lum += 25; // lighter patch
          }
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 4);
        data[idx + 2] = clampByte(c - 10);
        data[idx + 3] = 255;
      } else {
        // Leather boots with cross-lacing
        const lace = Math.sin((x * 0.4 + y * 0.6)) * 24;
        let lum = 175 + (n - 0.5) * 22 + (fine - 0.5) * 12 + lace;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 16);
        data[idx + 2] = clampByte(c - 28);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Peasant's pitchfork:
 * - Left half (x = 0..127): Ash wood handle with wood grain and smoothed grip.
 * - Right half (x = 128..255): Hand-forged dark iron crossbar and 3 sharp prongs with metallic bevels.
 */
export function generatePeasantPitchforkPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 8, 351);

      if (x < 128) {
        // Ash wood grain
        const grain = Math.sin(x * 0.45 + n * 6.0) * 24;
        const knot = Math.sin(Math.hypot(x - 64, y - 120) * 0.35) * 16;
        let lum = 210 + grain + knot;
        // Hand grip wear in center
        if (y >= 100 && y <= 160) {
          lum += 18;
        }
        const c = clampByte(lum);
        data[idx] = clampByte(c + 12);
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c - 18);
        data[idx + 3] = 255;
      } else {
        // Forged iron prongs and crossbar
        const ax = x - 192;
        const hammer = (n - 0.5) * 36;
        let lum = 185 + hammer;
        // Highlight bevels on prong tips (y > 180)
        if (y > 180 && Math.abs(ax) < 8) {
          lum += 45;
        }
        // Dark iron socket joint near y = 60
        if (y >= 54 && y <= 66) {
          lum -= 32;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 4);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

// ==========================================
// 2. ARCHER TEXTURES
// ==========================================

/**
 * Generates a 256x256 RGBA pixel buffer for the Archer's face, cap & feather:
 * - Rows y = 0..62: Dyed wool cap weave and white goose feather quill detailing.
 * - Rows y = 63..255: Focused, sharp archer gaze, trimmed goatee, leather brow band, nose & cheek definition.
 */
export function generateArcherFacePixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 401);
      const fine = hash2D(x, y, 403);

      if (y < 63) {
        // Archer cap & feather
        if (x < 100) {
          // Feather vane pattern
          const vane = Math.abs(Math.sin((x * 0.8 + y * 1.2))) * 24;
          const c = clampByte(230 + vane + (n - 0.5) * 15);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c - 6);
        } else {
          // Fine wool cap
          const knit = Math.sin(x * 1.3) * 14 + Math.sin(y * 1.3) * 14;
          const c = clampByte(215 + knit + (n - 0.5) * 20);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 2);
        }
        data[idx + 3] = 255;
        continue;
      }

      // Archer face
      const dx = x - 128;
      const adx = Math.abs(dx);
      const pore = (n - 0.5) * 18 + (fine - 0.5) * 8;

      let r = 226 + pore;
      let g = 182 + pore * 0.82;
      let b = 144 + pore * 0.70;

      // Leather headband across forehead (y = 110..120, adx <= 58)
      if (y >= 110 && y <= 120 && adx <= 58) {
        const leatherStitch = (x % 8 < 4) ? 22 : -16;
        data[idx] = clampByte(145 + leatherStitch);
        data[idx + 1] = clampByte(95 + leatherStitch);
        data[idx + 2] = clampByte(55 + leatherStitch);
        data[idx + 3] = 255;
        continue;
      }

      // Sharp focused eyebrows
      const browY = 132 + (adx - 10) * -0.14;
      if (adx >= 8 && adx <= 34 && Math.abs(y - browY) <= 3.4) {
        const hair = Math.sin(x * 1.4 + n * 4) * 16;
        r = 62 + hair;
        g = 44 + hair * 0.75;
        b = 28 + hair * 0.55;
      }

      // Sharp, intense archer eyes (centers at x = 128 +/- 19, y = 143)
      const eyeDx = adx - 19;
      const eyeDy = y - 143;
      const eyeDist = Math.hypot(eyeDx * 0.85, eyeDy * 1.45);
      if (eyeDist < 7.4) {
        if (eyeDist > 5.8) {
          r = 44;
          g = 30;
          b = 24;
        } else if (Math.hypot(eyeDx, eyeDy) < 3.0) {
          // Alert hazel-green archer iris with specular glint
          const glint = eyeDx < -0.4 && eyeDy < -0.4 ? 225 : 0;
          r = clampByte(38 + glint);
          g = clampByte(58 + glint);
          b = clampByte(36 + glint);
        } else {
          r = 244;
          g = 240;
          b = 232;
        }
      }

      // Refined nose bridge
      if (adx <= 7.5 && y >= 140 && y <= 166) {
        if (adx <= 3.0 && y <= 160) {
          r += 16;
          g += 12;
          b += 8;
        } else if (adx >= 4.8) {
          r -= 24;
          g -= 20;
          b -= 16;
        }
        if (y >= 162 && Math.abs(adx - 3.5) <= 1.8) {
          r = 58;
          g = 36;
          b = 28;
        }
      }

      // Trimmed goatee & mustache (y >= 168, adx <= 32)
      if (y >= 168 && adx <= 32 && y <= 215) {
        const goatee = Math.sin(x * 1.3 + n * 4.5) * 18;
        r = 64 + goatee;
        g = 46 + goatee * 0.75;
        b = 30 + goatee * 0.55;
        // Mouth line
        if (Math.abs(y - 177) <= 1.4 && adx <= 13) {
          r = 75;
          g = 40;
          b = 35;
        }
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
 * Generates a 256x256 RGBA pixel buffer for the Archer's clothing & quiver:
 * - Upper band: Quilted gambeson with diamond stitch grid.
 * - Mid band: Stitched leather belt with arrow notch tools.
 * - Lower band: Bracers and leather trousers.
 * - Right column (x > 180): Cylindrical quiver casing with feather fletchings.
 */
export function generateArcherClothingPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 6, 431);

      // Quiver texture in upper-right quadrant (x > 170, y < 130)
      if (x > 170 && y < 130) {
        if (y < 45) {
          // Arrow fletchings (feathers)
          const fletch = Math.abs(Math.sin((x * 0.7 + y * 1.4))) * 35;
          const c = clampByte(215 + fletch);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c - 8);
          data[idx + 3] = 255;
          continue;
        }
        // Quiver leather case with stitching
        const caseStitch = (y % 8 < 3) ? -28 : 12;
        let lum = 180 + (n - 0.5) * 24 + caseStitch;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 16);
        data[idx + 2] = clampByte(c - 30);
        data[idx + 3] = 255;
        continue;
      }

      if (y < 105) {
        // Quilted gambeson diamond stitching pattern
        const d1 = Math.abs((x + y) % 18 - 9);
        const d2 = Math.abs((x - y) % 18 - 9);
        const seam = (d1 < 1.6 || d2 < 1.6) ? -38 : 12;
        let lum = 215 + (n - 0.5) * 22 + seam;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 4);
        data[idx + 2] = clampByte(c - 10);
        data[idx + 3] = 255;
      } else if (y < 136) {
        // Utility belt with brass studs
        const stud = (x % 16 < 4) ? 42 : -16;
        let lum = 175 + (n - 0.5) * 20 + stud;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 14);
        data[idx + 2] = clampByte(c - 26);
        data[idx + 3] = 255;
      } else if (y < 205) {
        // Leather trousers & arm bracers
        const lace = Math.sin((x * 0.8 + y * 0.4)) * 18;
        let lum = 205 + (n - 0.5) * 22 + lace;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 8);
        data[idx + 2] = clampByte(c - 18);
        data[idx + 3] = 255;
      } else {
        // Stiff archer riding boots
        const seam = (y === 225 || y === 245) ? -35 : 0;
        let lum = 170 + (n - 0.5) * 20 + seam;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 18);
        data[idx + 2] = clampByte(c - 32);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Archer's bow:
 * - Left half: Laminated yew wood stave with heartwood (dark) to sapwood (light) gradient & horn nocks.
 * - Right half: Twisted waxed linen bowstring & arrow tips.
 */
export function generateArcherBowPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 451);

      if (x < 128) {
        // Yew longbow stave
        const grain = Math.sin(x * 0.65 + n * 5.0) * 22;
        const lamination = (x < 50) ? -28 : 22; // heartwood vs sapwood
        let lum = 205 + grain + lamination;
        // Spiral grip wrap at center y = 110..146
        if (y >= 110 && y <= 146) {
          const wrap = Math.sin((x * 0.4 + y * 0.6)) * 26;
          lum = 175 + wrap;
        }
        // Horn nocks at extremities (y < 18 or y > 238)
        if (y < 18 || y > 238) {
          lum = 230 + Math.sin(y * 0.8) * 16;
        }
        const c = clampByte(lum);
        data[idx] = clampByte(c + 10);
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c - 20);
        data[idx + 3] = 255;
      } else {
        // Bowstring fibers & arrow tips
        const strand = Math.sin((x + y * 1.5)) * 25;
        let lum = 215 + (n - 0.5) * 24 + strand;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 6);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

// ==========================================
// 3. SPEARMAN TEXTURES
// ==========================================

/**
 * Generates a 256x256 RGBA pixel buffer for the Spearman's face & Kettle Helm:
 * - Rows y = 0..62: Hammered iron helmet dome, steel brim, and rivets.
 * - Rows y = 63..255: Resolute soldier face with chinstrap, sharp jaw, and focused eyes.
 */
export function generateSpearmanFacePixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 501);
      const fine = hash2D(x, y, 503);

      if (y < 63) {
        // Kettle Helm hammered iron dome & brim
        const hammer = (n - 0.5) * 36 + (fine - 0.5) * 14;
        let lum = 205 + hammer;
        // Rivets along brim at y = 48..54
        if (y >= 47 && y <= 53 && (x % 16 < 4)) {
          lum += 42;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 6);
        data[idx + 3] = 255;
        continue;
      }

      // Soldier face
      const dx = x - 128;
      const adx = Math.abs(dx);
      const pore = (n - 0.5) * 18 + (fine - 0.5) * 8;

      let r = 224 + pore;
      let g = 180 + pore * 0.82;
      let b = 142 + pore * 0.70;

      // Leather chinstrap (y = 158..195 along jawline adx ~ 42..48)
      if (y >= 158 && y <= 195 && Math.abs(adx - 44) <= 3.5) {
        data[idx] = 110;
        data[idx + 1] = 72;
        data[idx + 2] = 45;
        data[idx + 3] = 255;
        continue;
      }

      // Disciplined military brows (y = 128..136, adx = 8..34)
      const browY = 132 + (adx - 10) * -0.10;
      if (adx >= 8 && adx <= 34 && Math.abs(y - browY) <= 3.2) {
        const hair = Math.sin(x * 1.3 + n * 4) * 14;
        r = 60 + hair;
        g = 42 + hair * 0.75;
        b = 28 + hair * 0.55;
      }

      // Alert soldier eyes (centers at x = 128 +/- 19, y = 143)
      const eyeDx = adx - 19;
      const eyeDy = y - 143;
      const eyeDist = Math.hypot(eyeDx * 0.85, eyeDy * 1.4);
      if (eyeDist < 7.6) {
        if (eyeDist > 6.0) {
          r = 42;
          g = 28;
          b = 22;
        } else if (Math.hypot(eyeDx, eyeDy) < 3.0) {
          const glint = eyeDx < -0.4 && eyeDy < -0.4 ? 220 : 0;
          r = clampByte(32 + glint);
          g = clampByte(45 + glint);
          b = clampByte(65 + glint);
        } else {
          r = 242;
          g = 238;
          b = 232;
        }
      }

      // Strong nose bridge
      if (adx <= 8 && y >= 140 && y <= 168) {
        if (adx <= 3.2 && y <= 162) {
          r += 16;
          g += 12;
          b += 8;
        } else if (adx >= 5.0) {
          r -= 24;
          g -= 20;
          b -= 16;
        }
        if (y >= 163 && Math.abs(adx - 3.8) <= 2.0) {
          r = 58;
          g = 36;
          b = 28;
        }
      }

      // Clean jaw with subtle five-o-clock shadow
      if (y >= 170 && adx <= 50) {
        const shadow = hash2D(x, y, 521) * 32;
        r -= shadow;
        g -= shadow * 1.1;
        b -= shadow * 1.2;
        // Firm mouth line
        if (Math.abs(y - 179) <= 1.4 && adx <= 14) {
          r = 78;
          g = 42;
          b = 36;
        }
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
 * Generates a 256x256 RGBA pixel buffer for the Spearman's armor:
 * - Upper band: Riveted leather brigandine plates.
 * - Mid band: Heavy military belt with iron buckle.
 * - Arms / sleeves: Interlocking chainmail weave.
 * - Lower band: Reinforced greaves & boots.
 */
export function generateSpearmanArmorPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 6, 531);

      if (y < 105) {
        // Riveted brigandine plate grid (16x16 pixel plate tiles)
        const px = x % 20;
        const py = y % 20;
        const isBorder = px === 0 || py === 0;
        const isRivet = (px >= 2 && px <= 4 && py >= 2 && py <= 4);
        let lum = 210 + (n - 0.5) * 20;
        if (isBorder) {
          lum -= 55;
        } else if (isRivet) {
          lum += 60;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 6);
        data[idx + 2] = clampByte(c - 14);
        data[idx + 3] = 255;
      } else if (y < 136) {
        // Studded military belt
        const stud = (x % 14 < 3) ? 55 : -18;
        let lum = 170 + (n - 0.5) * 22 + stud;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 16);
        data[idx + 2] = clampByte(c - 28);
        data[idx + 3] = 255;
      } else if (y < 205) {
        // Interlocking steel chainmail weave for arms/sleeves
        const ringX = Math.abs(Math.sin((x * 0.9 + y * 0.45))) * 32;
        const ringY = Math.abs(Math.sin((y * 0.9 - x * 0.45))) * 32;
        let lum = 185 + (ringX + ringY) * 0.8 + (n - 0.5) * 18;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 8);
        data[idx + 3] = 255;
      } else {
        // Steel greaves and marching boots
        const ridge = Math.abs(Math.sin(x * 0.2)) * 30;
        let lum = 180 + (n - 0.5) * 22 + ridge;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 8);
        data[idx + 2] = clampByte(c - 16);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Spearman's gear (spear + round shield):
 * - Left half (x = 0..127): Ash spear shaft with fine wood grain and sharpened steel leaf blade.
 * - Right half (x = 128..255): Circular shield with radial wood planks, painted team heraldry,
 *   iron rim band, and central dome boss.
 */
export function generateSpearmanGearPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 551);

      if (x < 128) {
        // Spear shaft and steel spearhead
        if (y > 175) {
          // Leaf blade steel
          const ax = Math.abs(x - 64);
          let lum = 210 + (n - 0.5) * 30;
          if (ax < 3) {
            lum += 45; // center ridge
          } else if (ax > 18) {
            lum -= 40; // bevel edge
          }
          const c = clampByte(lum);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 6);
        } else {
          // Ash wood spear shaft
          const grain = Math.sin(x * 0.7 + n * 6.0) * 22;
          let lum = 205 + grain;
          // Brass reinforcing socket collar at y = 160..175
          if (y >= 160 && y <= 175) {
            data[idx] = 225;
            data[idx + 1] = 185;
            data[idx + 2] = 80;
            data[idx + 3] = 255;
            continue;
          }
          const c = clampByte(lum);
          data[idx] = clampByte(c + 10);
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c - 18);
        }
        data[idx + 3] = 255;
      } else {
        // Round bossed shield: center at (192, 128)
        const cx = 192;
        const cy = 128;
        const dist = Math.hypot(x - cx, y - cy);

        if (dist < 26) {
          // Central iron shield boss
          const dome = (1 - dist / 26) * 55;
          const c = clampByte(190 + dome + (n - 0.5) * 24);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 8);
        } else if (dist > 105 && dist <= 122) {
          // Beaten iron rim band with rivets
          const rivet = (Math.atan2(y - cy, x - cx) * 6) % 1.0;
          let lum = 185 + (Math.abs(rivet - 0.5) < 0.15 ? 45 : 0) + (n - 0.5) * 25;
          const c = clampByte(lum);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 6);
        } else {
          // Radial wood planks
          const angle = Math.atan2(y - cy, x - cx);
          const plankLine = Math.abs(Math.sin(angle * 8)) * 38;
          const grain = Math.sin(dist * 0.35 + n * 4) * 16;
          let lum = 215 - plankLine + grain;
          const c = clampByte(lum);
          data[idx] = c;
          data[idx + 1] = clampByte(c - 6);
          data[idx + 2] = clampByte(c - 16);
        }
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

// ==========================================
// MATERIAL & TEXTURE CACHES
// ==========================================

const humanoidTextureCache: Map<string, THREE.DataTexture> = new Map();
const humanoidMaterialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

/**
 * Returns cached 256x256 THREE.DataTexture for the specified humanoid texture part key.
 */
export function getHumanoidPartTexture(partKey: string): THREE.DataTexture {
  if (partKey === 'skin') {
    return getBarbarianPartTexture('skin');
  }

  let tex = humanoidTextureCache.get(partKey);
  if (!tex) {
    let pixels: Uint8Array;
    switch (partKey) {
      case 'peasant_face':
        pixels = generatePeasantFacePixels();
        break;
      case 'peasant_cloth':
        pixels = generatePeasantClothPixels();
        break;
      case 'peasant_pitchfork':
        pixels = generatePeasantPitchforkPixels();
        break;
      case 'archer_face':
        pixels = generateArcherFacePixels();
        break;
      case 'archer_clothing':
        pixels = generateArcherClothingPixels();
        break;
      case 'archer_bow':
        pixels = generateArcherBowPixels();
        break;
      case 'spearman_face':
        pixels = generateSpearmanFacePixels();
        break;
      case 'spearman_armor':
        pixels = generateSpearmanArmorPixels();
        break;
      case 'spearman_gear':
        pixels = generateSpearmanGearPixels();
        break;
      default:
        pixels = generatePeasantClothPixels();
        break;
    }

    tex = new THREE.DataTexture(
      pixels,
      HUMANOID_TEXTURE_SIZE,
      HUMANOID_TEXTURE_SIZE,
      THREE.RGBAFormat
    );
    tex.name = `${partKey}_256x256`;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    tex.userData = {
      isSharedAsset: true,
      partKey,
      width: HUMANOID_TEXTURE_SIZE,
      height: HUMANOID_TEXTURE_SIZE,
      src: HUMANOID_TEXTURE_PATHS[partKey],
    };
    humanoidTextureCache.set(partKey, tex);
  }
  return tex;
}

/**
 * Returns shared opaque vertex-colored MeshStandardMaterial with the given 256x256 texture.
 */
export function getHumanoidPartMaterial(
  partKey: string,
  roughness = 0.76,
  metalness = 0.08
): THREE.MeshStandardMaterial {
  if (partKey === 'skin') {
    return getBarbarianPartMaterial('skin');
  }

  let mat = humanoidMaterialCache.get(partKey);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      name: `Humanoid_${partKey}_Material`,
      color: 0xffffff,
      vertexColors: true,
      roughness,
      metalness,
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      map: getHumanoidPartTexture(partKey),
    });
    mat.userData = {
      isSharedAsset: true,
      humanoidTexturePart: partKey,
    };
    humanoidMaterialCache.set(partKey, mat);
  }
  return mat;
}

// ==========================================
// UV MAPPING IMPLEMENTATIONS
// ==========================================

export function applyHumanoidUVMapping(
  geometry: THREE.BufferGeometry,
  partRole:
    | 'peasant_head_face'
    | 'peasant_hood'
    | 'peasant_torso'
    | 'peasant_belt'
    | 'peasant_arm'
    | 'peasant_leg'
    | 'peasant_pitchfork_shaft'
    | 'peasant_pitchfork_head'
    | 'archer_head_face'
    | 'archer_cap'
    | 'archer_feather'
    | 'archer_torso'
    | 'archer_belt'
    | 'archer_quiver'
    | 'archer_arm'
    | 'archer_leg'
    | 'archer_bow'
    | 'spearman_head_face'
    | 'spearman_helmet'
    | 'spearman_torso'
    | 'spearman_belt'
    | 'spearman_javelin'
    | 'spearman_arm'
    | 'spearman_leg'
    | 'spearman_spear'
    | 'spearman_shield'
    | 'humanoid_hand'
): void {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr || posAttr.count === 0) return;

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const spanY = Math.max(1e-4, maxY - minY);
  const minX = bbox.min.x;
  const maxX = bbox.max.x;
  const spanX = Math.max(1e-4, maxX - minX);

  const uvs = new Float32Array(posAttr.count * 2);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const ny = (y - minY) / spanY;

    let u = 0.5;
    let v = ny;

    switch (partRole) {
      // Peasant
      case 'peasant_head_face': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.72;
        break;
      }
      case 'peasant_hood': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.76 + ny * 0.22;
        break;
      }
      case 'peasant_torso': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.58 + ny * 0.38;
        break;
      }
      case 'peasant_belt': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.46 + ny * 0.10;
        break;
      }
      case 'peasant_arm': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.55 + ny * 0.35;
        break;
      }
      case 'peasant_leg': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.42;
        break;
      }
      case 'peasant_pitchfork_shaft': {
        const theta = Math.atan2(z, x);
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'peasant_pitchfork_head': {
        const nx = (x - minX) / spanX;
        u = 0.52 + nx * 0.44;
        v = 0.15 + ny * 0.80;
        break;
      }

      // Archer
      case 'archer_head_face': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.72;
        break;
      }
      case 'archer_cap': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.76 + ny * 0.22;
        break;
      }
      case 'archer_feather': {
        u = 0.15 + ((x - minX) / spanX) * 0.25;
        v = 0.76 + ny * 0.22;
        break;
      }
      case 'archer_torso': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.58 + ny * 0.38;
        break;
      }
      case 'archer_belt': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.46 + ny * 0.10;
        break;
      }
      case 'archer_quiver': {
        const theta = Math.atan2(z, x);
        u = 0.70 + (theta / (2 * Math.PI)) * 0.28;
        v = 0.65 + ny * 0.32;
        break;
      }
      case 'archer_arm': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.55 + ny * 0.35;
        break;
      }
      case 'archer_leg': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.42;
        break;
      }
      case 'archer_bow': {
        const theta = Math.atan2(z, x);
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }

      // Spearman
      case 'spearman_head_face': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.72;
        break;
      }
      case 'spearman_helmet': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.76 + ny * 0.22;
        break;
      }
      case 'spearman_torso': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.58 + ny * 0.38;
        break;
      }
      case 'spearman_belt': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.46 + ny * 0.10;
        break;
      }
      case 'spearman_javelin': {
        const theta = Math.atan2(z, x);
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'spearman_arm': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.55 + ny * 0.35;
        break;
      }
      case 'spearman_leg': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.42;
        break;
      }
      case 'spearman_spear': {
        const theta = Math.atan2(z, x);
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'spearman_shield': {
        // Planar projection along local shield face
        u = 0.52 + ((x - minX) / spanX) * 0.46;
        v = 0.02 + ny * 0.96;
        break;
      }

      // Shared Hand (skin)
      case 'humanoid_hand': {
        const theta = Math.atan2(z, x);
        u = 0.72 + (theta / (2 * Math.PI)) * 0.26;
        v = 0.04 + ny * 0.85;
        break;
      }
    }

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}
