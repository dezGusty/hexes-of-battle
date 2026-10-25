import * as THREE from 'three';
import { getBarbarianPartTexture, getBarbarianPartMaterial } from './barbarian-textures';

export const HUMANOID_TEXTURE_SIZE = 256;

export type SupportedHumanoidTexturedUnit = 'peasant' | 'peasant_archer' | 'spearman' | 'swordsman' | 'healer' | 'maceman' | 'armored_knight';

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
  swordsman_helmet: 'textures/units/swordsman_helmet.png',
  swordsman_armor: 'textures/units/swordsman_armor.png',
  swordsman_gear: 'textures/units/swordsman_gear.png',
  healer_gear: 'textures/units/healer_gear.png',
  maceman_armor: 'textures/units/maceman_armor.png',
  maceman_gear: 'textures/units/maceman_gear.png',
  armored_knight_armor: 'textures/units/armored_knight_armor.png',
  armored_knight_gear: 'textures/units/armored_knight_gear.png',
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
// 4. SWORDSMAN TEXTURES
// ==========================================

/**
 * Generates a 256x256 RGBA pixel buffer for the Swordsman's Full Helmet:
 * - Rows y = 0..90 (v = 0.65..1.0): Upper sugarloaf / great helm steel dome with brushed
 *   metallic grain, plate seams, and brass rivets along brow band at y = 80..88.
 * - Rows y = 91..165 (v = 0.35..0.65): Full steel visor faceplate, ocular eye slits (black opening
 *   with specular rim at y = 116..126), brass reinforcing cross band, and ventilation punch holes.
 * - Rows y = 166..255 (v = 0.0..0.35): Dense interlocking chainmail aventail/coif with high-contrast
 *   metallic specular ring arcs and dark link voids.
 */
export function generateSwordsmanHelmetPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 701);
      const fine = hash2D(x, y, 703);

      if (y < 90) {
        // Sugarloaf dome
        const dx = Math.abs(x - 128);
        const domeShade = Math.sin((y / 90) * Math.PI * 0.5) * 20;
        let lum = 190 + domeShade + (n - 0.5) * 26 + (fine - 0.5) * 10;

        // Brow band at y = 80..88 with rivets
        if (y >= 80 && y <= 88) {
          const isRivet = (x % 20 < 4) && Math.abs(y - 84) <= 2;
          lum = isRivet ? 245 : 165 + (n - 0.5) * 18;
          if (isRivet) {
            data[idx] = 230;
            data[idx + 1] = 195;
            data[idx + 2] = 85;
            data[idx + 3] = 255;
            continue;
          }
        }

        // Vertical central reinforcement ridge at |x - 128| < 8
        if (dx < 8) {
          const isEdge = dx >= 6;
          lum = isEdge ? 130 : 215 + (n - 0.5) * 16;
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 8);
        data[idx + 3] = 255;
      } else if (y <= 165) {
        // Steel Visor faceplate
        const dx = Math.abs(x - 128);

        // Horizontal ocular vision slit at y = 116..126
        if (y >= 116 && y <= 126 && dx > 10 && dx < 105) {
          // Inside eye slit: deep dark shadow hole
          const isEdge = y === 116 || y === 126 || dx === 11 || dx === 104;
          const slitLum = isEdge ? 240 : 25 + (fine - 0.5) * 10;
          const c = clampByte(slitLum);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 6);
          data[idx + 3] = 255;
          continue;
        }

        // Central brass cross reinforcement strip at |x - 128| < 8
        if (dx < 8) {
          const isRivet = dx < 3 && ((y - 95) % 18 < 4);
          data[idx] = isRivet ? 245 : 220;
          data[idx + 1] = isRivet ? 210 : 180;
          data[idx + 2] = isRivet ? 95 : 70;
          data[idx + 3] = 255;
          continue;
        }

        // Horizontal cross bar of brass cross at y = 114..128 when dx <= 18
        if (y >= 114 && y <= 128 && dx <= 18) {
          data[idx] = 220;
          data[idx + 1] = 180;
          data[idx + 2] = 70;
          data[idx + 3] = 255;
          continue;
        }

        // Breathing ventilation holes at y = 136..156, dx in 18..90
        if (y >= 136 && y <= 156 && dx >= 18 && dx <= 90) {
          const holeX = dx % 14 < 3;
          const holeY = (y - 136) % 8 < 3;
          if (holeX && holeY) {
            data[idx] = 22;
            data[idx + 1] = 22;
            data[idx + 2] = 26;
            data[idx + 3] = 255;
            continue;
          }
        }

        // Faceplate steel surface
        let lum = 185 + (n - 0.5) * 24 + (fine - 0.5) * 8;
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 6);
        data[idx + 3] = 255;
      } else {
        // Chainmail Aventail / Coif
        const rx = (x + ((Math.floor(y / 6) % 2) * 4)) % 8 - 4;
        const ry = (y % 6) - 3;
        const r = Math.hypot(rx, ry);

        let lum = 85;
        if (r < 1.9) {
          lum = 38 + (fine - 0.5) * 12; // dark void inside link
        } else if (r <= 3.8) {
          // Specular metallic ring wire highlight
          const highlight = (1 - Math.abs(r - 2.85) / 1.0) * 135;
          lum = 95 + highlight + (n - 0.5) * 20;
        } else {
          lum = 70 + (n - 0.5) * 16;
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 7);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Swordsman's Armor:
 * - Rows y = 0..120 (v = 0.53..1.0): Steel plate breastplate/cuirass with engraved center ridge,
 *   metallic specular sheen, side leather harness straps, and brass rivets.
 * - Rows y = 121..165 (v = 0.35..0.53): Layered steel fauld plates/tassets with beveled edges.
 * - Rows y = 166..255 (v = 0.0..0.35): Heavy interlocking steel chainmail weave for arms and legs.
 */
export function generateSwordsmanArmorPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 721);
      const fine = hash2D(x, y, 723);

      if (y < 120) {
        // Steel Cuirass / Breastplate
        const dx = Math.abs(x - 128);

        // Side leather harness straps at x < 24 or x > 232
        if (x < 24 || x > 232) {
          const strapLum = 72 + (n - 0.5) * 18;
          data[idx] = clampByte(strapLum + 16);
          data[idx + 1] = clampByte(strapLum + 4);
          data[idx + 2] = clampByte(strapLum - 10);
          data[idx + 3] = 255;
          continue;
        }

        // Center ridge / spine at |x - 128| < 4
        let lum = 195 + (n - 0.5) * 25 + (fine - 0.5) * 8;
        if (dx < 3) {
          lum += 42; // prominent specular center ridge
        } else if (dx < 6) {
          lum -= 28; // groove shadow
        }

        // Lower rim rivet band at y = 110..118
        if (y >= 110 && y <= 118) {
          const isRivet = (x % 18 < 4) && Math.abs(y - 114) <= 2;
          if (isRivet) {
            data[idx] = 235;
            data[idx + 1] = 195;
            data[idx + 2] = 80;
            data[idx + 3] = 255;
            continue;
          }
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 7);
        data[idx + 3] = 255;
      } else if (y <= 165) {
        // Articulated steel fauld plates (horizontal bands every 12px)
        const plateY = (y - 120) % 12;
        let lum = 180 + (n - 0.5) * 22;

        if (plateY <= 2) {
          lum += 40; // upper highlight rim
        } else if (plateY >= 10) {
          lum -= 45; // lower shadow overlap
        }

        // Rivets on each fauld plate
        const isRivet = (x % 24 < 4) && (plateY >= 4 && plateY <= 7);
        if (isRivet) {
          data[idx] = 230;
          data[idx + 1] = 190;
          data[idx + 2] = 80;
          data[idx + 3] = 255;
          continue;
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 6);
        data[idx + 3] = 255;
      } else {
        // Chainmail weave (sleeves & leggings)
        const rx = (x + ((Math.floor(y / 6) % 2) * 4)) % 8 - 4;
        const ry = (y % 6) - 3;
        const r = Math.hypot(rx, ry);

        let lum = 85;
        if (r < 1.9) {
          lum = 38 + (fine - 0.5) * 12;
        } else if (r <= 3.8) {
          const highlight = (1 - Math.abs(r - 2.85) / 1.0) * 135;
          lum = 95 + highlight + (n - 0.5) * 20;
        } else {
          lum = 70 + (n - 0.5) * 16;
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 7);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Swordsman's Gear (Arming Sword & Heater Shield):
 * - Left half (x = 0..127): Steel arming sword (double-edged blade with fuller, brass crossguard, leather grip, pommel).
 * - Right half (x = 128..255): Knight's heater shield (outer steel rim with rivets, central brass/iron boss, heraldic steel face).
 */
export function generateSwordsmanGearPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 741);
      const fine = hash2D(x, y, 743);

      if (x < 128) {
        // Arming Sword (center at x = 64)
        const dx = Math.abs(x - 64);

        if (y > 60) {
          // Double-edged steel blade
          let lum = 210 + (n - 0.5) * 24;
          if (dx <= 2) {
            lum = 90 + (fine - 0.5) * 14; // central fuller groove
          } else if (dx <= 18) {
            lum = 215 + (1 - dx / 18) * 25; // polished steel blade face
          } else if (dx <= 24) {
            lum = 245; // razor edge bevel
          } else {
            lum = 30; // background outside blade
          }

          const c = clampByte(lum);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 7);
        } else if (y >= 48) {
          // Brass crossguard at y = 48..60, dx <= 42
          if (dx <= 42) {
            data[idx] = 228;
            data[idx + 1] = 188;
            data[idx + 2] = 78;
          } else {
            data[idx] = 30;
            data[idx + 1] = 30;
            data[idx + 2] = 34;
          }
        } else if (y >= 16) {
          // Leather-wrapped grip at y = 16..47, dx <= 8
          if (dx <= 8) {
            const spiral = (y % 6 < 2) ? -28 : 20;
            const gripLum = 68 + spiral;
            data[idx] = clampByte(gripLum + 18);
            data[idx + 1] = clampByte(gripLum + 6);
            data[idx + 2] = clampByte(gripLum - 12);
          } else {
            data[idx] = 30;
            data[idx + 1] = 30;
            data[idx + 2] = 34;
          }
        } else {
          // Steel wheel/disc pommel at y < 16, center at (64, 8)
          const dist = Math.hypot(x - 64, y - 8);
          if (dist <= 12) {
            const dome = (1 - dist / 12) * 55;
            const c = clampByte(185 + dome + (n - 0.5) * 20);
            data[idx] = c;
            data[idx + 1] = c;
            data[idx + 2] = clampByte(c + 7);
          } else {
            data[idx] = 30;
            data[idx + 1] = 30;
            data[idx + 2] = 34;
          }
        }
        data[idx + 3] = 255;
      } else {
        // Heater Shield (center at (192, 120))
        const cx = 192;
        const cy = 120;
        const dist = Math.hypot(x - cx, y - cy);

        if (dist <= 26) {
          // Central shield boss (dome)
          const dome = (1 - dist / 26) * 60;
          const c = clampByte(195 + dome + (n - 0.5) * 24);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = clampByte(c + 8);
        } else if (dist > 102 && dist <= 124) {
          // Steel outer rim band with brass rivets
          const rivetAngle = (Math.atan2(y - cy, x - cx) * 8) % 1.0;
          const isRivet = Math.abs(rivetAngle - 0.5) < 0.16;
          if (isRivet) {
            data[idx] = 230;
            data[idx + 1] = 190;
            data[idx + 2] = 80;
          } else {
            const c = clampByte(175 + (n - 0.5) * 25);
            data[idx] = c;
            data[idx + 1] = c;
            data[idx + 2] = clampByte(c + 6);
          }
        } else {
          // Painted steel heater face with scratches & specular sheen
          const scratch = (fine < 0.05) ? -45 : 0;
          const lum = 205 + (n - 0.5) * 32 + scratch;
          const c = clampByte(lum);
          data[idx] = c;
          data[idx + 1] = clampByte(c - 4);
          data[idx + 2] = clampByte(c + 8);
        }
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Healer's gear:
 * - Upper Half (y = 0..127): Simple wooden buckler shield with oak planks, circular iron rim, and central iron boss.
 * - Lower Left (y = 128..255, x = 0..127): Remedy knife with polished steel blade, brass guard/bolster, and wrapped leather grip.
 * - Lower Right (y = 128..255, x = 128..255): Stitched leather remedies satchel with shoulder strap, bronze buckle, and medical cross emblem.
 */
export function generateHealerGearPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = hash2D(x, y, 777);
      const fine = hash2D(x * 2, y * 2, 888);

      if (y < 128) {
        // --- 1. SIMPLE WOODEN BUCKLER SHIELD (y = 0..127) ---
        // Center of buckler at (128, 64)
        const dx = x - 128;
        const dy = y - 64;
        const dist = Math.hypot(dx, dy);

        if (dist > 56) {
          // Iron rim around outer circumference
          const rimLum = 125 + (n - 0.5) * 35;
          const isStud = Math.abs(dist - 60) <= 2.2 && (Math.atan2(dy, dx) * 6) % 1 > 0.75;
          if (isStud) {
            data[idx] = 195;
            data[idx + 1] = 175;
            data[idx + 2] = 135;
          } else {
            data[idx] = clampByte(rimLum);
            data[idx + 1] = clampByte(rimLum + 2);
            data[idx + 2] = clampByte(rimLum + 6);
          }
        } else if (dist < 18) {
          // Central iron shield boss
          const bossLum = 145 + (18 - dist) * 3.5 + (fine - 0.5) * 25;
          data[idx] = clampByte(bossLum);
          data[idx + 1] = clampByte(bossLum + 4);
          data[idx + 2] = clampByte(bossLum + 8);
        } else {
          // Aged oak wood planks (vertical grain)
          const seam = Math.abs((x - 72) % 18) <= 1 ? -40 : 0;
          const grain = Math.sin(y * 0.45 + (x % 18) * 0.8) * 12;
          const woodR = 142 + (n - 0.5) * 28 + grain + seam;
          const woodG = 96 + (n - 0.5) * 22 + grain * 0.8 + seam;
          const woodB = 54 + (n - 0.5) * 16 + grain * 0.6 + seam;
          data[idx] = clampByte(woodR);
          data[idx + 1] = clampByte(woodG);
          data[idx + 2] = clampByte(woodB);
        }
      } else if (x < 128) {
        // --- 2. REMEDY KNIFE / DAGGER (y = 128..255, x = 0..127) ---
        if (y < 192) {
          // Knife blade: forged surgical/herb steel with bevel edge
          const edgeDist = Math.abs(x - 64);
          const bevel = edgeDist < 12 ? 30 : -20;
          const steelLum = 185 + bevel + (n - 0.5) * 25;
          data[idx] = clampByte(steelLum);
          data[idx + 1] = clampByte(steelLum + 3);
          data[idx + 2] = clampByte(steelLum + 7);
        } else if (y < 206) {
          // Brass bolster & guard
          const brassLum = 180 + (fine - 0.5) * 30;
          data[idx] = clampByte(brassLum + 35);
          data[idx + 1] = clampByte(brassLum + 10);
          data[idx + 2] = clampByte(brassLum - 70);
        } else {
          // Wrapped dark leather / cord grip
          const cord = Math.sin(y * 1.2) * 25;
          const gripR = 68 + cord + (n - 0.5) * 15;
          const gripG = 46 + cord * 0.8 + (n - 0.5) * 12;
          const gripB = 30 + cord * 0.6 + (n - 0.5) * 10;
          data[idx] = clampByte(gripR);
          data[idx + 1] = clampByte(gripG);
          data[idx + 2] = clampByte(gripB);
        }
      } else {
        // --- 3. REMEDIES SATCHEL (y = 128..255, x = 128..255) ---
        const relX = x - 128;
        const relY = y - 128;
        const leatherR = 124 + (n - 0.5) * 24;
        const leatherG = 82 + (n - 0.5) * 18;
        const leatherB = 48 + (n - 0.5) * 14;

        // Medical cross emblem on satchel flap
        const inCrossV = Math.abs(relX - 64) <= 6 && Math.abs(relY - 64) <= 20;
        const inCrossH = Math.abs(relX - 64) <= 20 && Math.abs(relY - 64) <= 6;

        if (inCrossV || inCrossH) {
          data[idx] = 220;
          data[idx + 1] = 48;
          data[idx + 2] = 48;
        } else if (relY > 20 && relY < 32 && Math.abs(relX - 64) < 14) {
          data[idx] = 205;
          data[idx + 1] = 170;
          data[idx + 2] = 75;
        } else if (relX < 8 || relX > 120 || relY < 8 || relY > 120) {
          const stitch = (relX + relY) % 6 < 3 ? 45 : -35;
          data[idx] = clampByte(leatherR + stitch);
          data[idx + 1] = clampByte(leatherG + stitch);
          data[idx + 2] = clampByte(leatherB + stitch);
        } else {
          data[idx] = clampByte(leatherR);
          data[idx + 1] = clampByte(leatherG);
          data[idx + 2] = clampByte(leatherB);
        }
      }

      data[idx + 3] = 255;
    }
  }

  return data;
}

// ==========================================
// 6. MACEMAN TEXTURES (GAMBESON & TWO-HANDED MACE)
// ==========================================

/**
 * Generates a 256x256 RGBA pixel buffer for the Maceman's Gambeson armor:
 * - Rows y = 0..140: Padded linen gambeson body with diamond-quilted stitching,
 *   pillowed diamond cushions, linen weave texture, and front leather strapping clasps with brass buckles.
 * - Rows y = 141..162: Heavy leather combat waist belt with brass buckle and belt loop rivets.
 * - Rows y = 163..210: Gambeson skirt with vertical fluted channels and stitched hem piping.
 * - Rows y = 211..255: Quilted sleeves and reinforced leather boots.
 */
export function generateMacemanArmorPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 831);
      const fine = hash2D(x, y, 839);

      if (y >= 141 && y <= 162) {
        // Waist Belt
        const beltY = y - 141;
        const beltDistCenter = Math.abs(x - 128);

        if (beltDistCenter < 14 && beltY >= 3 && beltY <= 18) {
          // Polished Brass Buckle
          const isFrame = beltDistCenter >= 10 || beltY <= 5 || beltY >= 15;
          const isProng = beltDistCenter <= 2;
          const brassLum = isFrame || isProng ? 210 : 70;
          data[idx] = clampByte(brassLum + 35);
          data[idx + 1] = clampByte(brassLum + 12);
          data[idx + 2] = clampByte(brassLum - 60);
        } else {
          // Thick tanned saddle leather
          const edge = beltY <= 2 || beltY >= 19 ? -35 : 0;
          const leatherR = 95 + edge + (n - 0.5) * 20;
          const leatherG = 58 + edge + (n - 0.5) * 15;
          const leatherB = 34 + edge + (n - 0.5) * 12;
          data[idx] = clampByte(leatherR);
          data[idx + 1] = clampByte(leatherG);
          data[idx + 2] = clampByte(leatherB);
        }
      } else if (y < 141) {
        // Padded Gambeson Torso / Body (Diamond Quilted Linen)
        const d1 = (x + y) % 18;
        const d2 = ((x - y) % 18 + 18) % 18;
        const isSeam = d1 <= 2 || d2 <= 2;
        const isPuncture = d1 <= 1 && d2 <= 1;

        // Center puffiness of diamond cell
        const distFromSeam = Math.min(Math.min(d1, 18 - d1), Math.min(d2, 18 - d2));
        const pillowBulge = (distFromSeam / 9) * 28;

        let baseR = 196 + (n - 0.5) * 22;
        let baseG = 176 + (n - 0.5) * 20;
        let baseB = 142 + (n - 0.5) * 18;

        if (isPuncture) {
          baseR -= 60;
          baseG -= 55;
          baseB -= 45;
        } else if (isSeam) {
          baseR -= 38;
          baseG -= 34;
          baseB -= 28;
        } else {
          baseR += pillowBulge;
          baseG += pillowBulge * 0.95;
          baseB += pillowBulge * 0.85;
        }

        // Front central lacing / leather straps (x = 122..134)
        if (Math.abs(x - 128) < 6) {
          const strapBand = y % 20 < 6;
          if (strapBand) {
            baseR = 105 + (fine - 0.5) * 15;
            baseG = 65 + (fine - 0.5) * 12;
            baseB = 38 + (fine - 0.5) * 10;
          } else {
            baseR -= 30;
            baseG -= 28;
            baseB -= 24;
          }
        }

        data[idx] = clampByte(baseR);
        data[idx + 1] = clampByte(baseG);
        data[idx + 2] = clampByte(baseB);
      } else if (y < 210) {
        // Gambeson Skirt (Vertical fluted quilting tubes)
        const tubeX = x % 16;
        const tubeDist = Math.abs(tubeX - 8);
        const tubeShade = (tubeDist / 8) * 35;

        let baseR = 192 - tubeShade + (n - 0.5) * 20;
        let baseG = 172 - tubeShade + (n - 0.5) * 18;
        let baseB = 138 - tubeShade + (n - 0.5) * 16;

        if (y >= 204) {
          baseR -= 25;
          baseG -= 22;
          baseB -= 18;
        }

        data[idx] = clampByte(baseR);
        data[idx + 1] = clampByte(baseG);
        data[idx + 2] = clampByte(baseB);
      } else {
        // Arms / Boots (y = 211..255)
        if (y > 236) {
          const bootR = 62 + (n - 0.5) * 18;
          const bootG = 42 + (n - 0.5) * 14;
          const bootB = 28 + (n - 0.5) * 10;
          data[idx] = clampByte(bootR);
          data[idx + 1] = clampByte(bootG);
          data[idx + 2] = clampByte(bootB);
        } else {
          const d1 = (x + y) % 14;
          const isSeam = d1 <= 2;
          const r = 188 + (n - 0.5) * 20 - (isSeam ? 32 : -10);
          const g = 168 + (n - 0.5) * 18 - (isSeam ? 28 : -8);
          const b = 136 + (n - 0.5) * 16 - (isSeam ? 24 : -6);
          data[idx] = clampByte(r);
          data[idx + 1] = clampByte(g);
          data[idx + 2] = clampByte(b);
        }
      }

      data[idx + 3] = 255;
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Maceman's Gear:
 * - x = 0..127: Two-Handed Heavy Flanged Mace:
 *   - y = 0..22: Piercing steel top spike
 *   - y = 23..90: Heavy forged flanged steel head with bevel edges
 *   - y = 91..115: Steel socket collar & reinforced iron langets
 *   - y = 116..185: Seasoned ash hardwood haft with straight wood grain
 *   - y = 186..240: Wrapped dark leather spiral grip for two-handed swinging purchase
 *   - y = 241..255: Solid steel round pommel counterweight
 * - x = 128..255: Padded Arming Cap / Gambeson Coif:
 *   - Quilted linen coif hood fabric, stitched ear flaps, chin laces, and padded brow band.
 */
export function generateMacemanGearPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 941);
      const fine = hash2D(x, y, 947);

      if (x < 128) {
        // --- TWO-HANDED MACE (x = 0..127) ---
        const distFromCenter = Math.abs(x - 64);

        if (y < 22) {
          const spikeEdge = distFromCenter < 12 ? 35 : -30;
          const steelLum = 210 + spikeEdge + (n - 0.5) * 25;
          data[idx] = clampByte(steelLum);
          data[idx + 1] = clampByte(steelLum + 2);
          data[idx + 2] = clampByte(steelLum + 8);
        } else if (y < 90) {
          const flangeRidge = (x % 24 < 4) ? 45 : (x % 24 > 20 ? -35 : 0);
          const rivet = (y % 16 < 3 && distFromCenter < 30) ? 35 : 0;
          const steelLum = 175 + flangeRidge + rivet + (n - 0.5) * 25;
          data[idx] = clampByte(steelLum);
          data[idx + 1] = clampByte(steelLum + 3);
          data[idx + 2] = clampByte(steelLum + 9);
        } else if (y < 116) {
          const isLanget = distFromCenter < 6 || distFromCenter > 38;
          const steelLum = isLanget ? 190 + (fine - 0.5) * 20 : 155;
          data[idx] = clampByte(steelLum);
          data[idx + 1] = clampByte(steelLum + 2);
          data[idx + 2] = clampByte(steelLum + 6);
        } else if (y < 186) {
          const grain = Math.sin(x * 0.8 + n * 5.0) * 22;
          const woodLum = 180 + grain + (n - 0.5) * 15;
          data[idx] = clampByte(woodLum + 12);
          data[idx + 1] = clampByte(woodLum);
          data[idx + 2] = clampByte(woodLum - 22);
        } else if (y < 241) {
          const spiral = Math.sin((x * 0.6 + y * 0.8)) * 32;
          const gripR = 64 + spiral + (n - 0.5) * 16;
          const gripG = 44 + spiral * 0.8 + (n - 0.5) * 12;
          const gripB = 30 + spiral * 0.6 + (n - 0.5) * 10;
          data[idx] = clampByte(gripR);
          data[idx + 1] = clampByte(gripG);
          data[idx + 2] = clampByte(gripB);
        } else {
          const pommelDome = (1 - distFromCenter / 40) * 45;
          const brassCenter = distFromCenter < 8;
          if (brassCenter) {
            data[idx] = 220;
            data[idx + 1] = 180;
            data[idx + 2] = 70;
          } else {
            const steelLum = 180 + pommelDome + (n - 0.5) * 20;
            data[idx] = clampByte(steelLum);
            data[idx + 1] = clampByte(steelLum + 3);
            data[idx + 2] = clampByte(steelLum + 8);
          }
        }
      } else {
        // --- PADDED ARMING CAP / GAMBESON COIF (x = 128..255) ---
        const relX = x - 128;
        const d1 = (relX + y) % 15;
        const d2 = ((relX - y) % 15 + 15) % 15;
        const isSeam = d1 <= 2 || d2 <= 2;
        const distFromSeam = Math.min(Math.min(d1, 15 - d1), Math.min(d2, 15 - d2));
        const pillowBulge = (distFromSeam / 7.5) * 26;

        let baseR = 198 + (n - 0.5) * 20;
        let baseG = 178 + (n - 0.5) * 18;
        let baseB = 144 + (n - 0.5) * 16;

        if (isSeam) {
          baseR -= 36;
          baseG -= 32;
          baseB -= 26;
        } else {
          baseR += pillowBulge;
          baseG += pillowBulge * 0.95;
          baseB += pillowBulge * 0.85;
        }

        if (y > 230) {
          const leatherR = 100 + (fine - 0.5) * 15;
          const leatherG = 62 + (fine - 0.5) * 12;
          const leatherB = 38 + (fine - 0.5) * 10;
          data[idx] = clampByte(leatherR);
          data[idx + 1] = clampByte(leatherG);
          data[idx + 2] = clampByte(leatherB);
        } else {
          data[idx] = clampByte(baseR);
          data[idx + 1] = clampByte(baseG);
          data[idx + 2] = clampByte(baseB);
        }
      }

      data[idx + 3] = 255;
    }
  }

  return data;
}


// ==========================================
// 7. ARMORED KNIGHT TEXTURES (WARHORSE & HEAVY PLATE)
// ==========================================

export function generateArmoredKnightArmorPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const fine = (Math.sin(x * 93.123 + y * 41.567) * 23421.631) % 1;

      if (y < 128) {
        if (x < 128) {
          // --- STEEL CUIRASS / BREASTPLATE ---
          const ridgeDist = Math.abs(x - 64);
          const ridgeHighlight = Math.max(0, 1 - ridgeDist / 12) * 45;
          const domeCurvature = Math.cos((ridgeDist / 64) * (Math.PI * 0.5)) * 30;
          let lum = 185 + ridgeHighlight + domeCurvature + (n - 0.5) * 15;

          const isEdgeTrim = x < 6 || x > 122 || y < 6 || y > 122;
          const isRivet = (x % 24 < 3 && (y === 10 || y === 118)) || (y % 28 < 3 && (x === 10 || x === 118));

          if (isEdgeTrim) {
            data[idx] = clampByte(215 + (fine - 0.5) * 20);
            data[idx + 1] = clampByte(175 + (fine - 0.5) * 15);
            data[idx + 2] = clampByte(65 + (fine - 0.5) * 10);
          } else if (isRivet) {
            data[idx] = 240;
            data[idx + 1] = 230;
            data[idx + 2] = 210;
          } else {
            data[idx] = clampByte(lum);
            data[idx + 1] = clampByte(lum + 2);
            data[idx + 2] = clampByte(lum + 8);
          }
        } else {
          // --- STEEL GREAT HELM / ARMET ---
          const rx = x - 128;
          const helmDome = Math.cos(((rx - 64) / 64) * (Math.PI * 0.5)) * 35;
          let lum = 180 + helmDome + (n - 0.5) * 16;

          const isVisorSlit = y >= 58 && y <= 66 && rx >= 24 && rx <= 104;
          const isBreathingHole = y >= 76 && y <= 106 && rx >= 36 && rx <= 92 && (rx % 10 < 3) && (y % 10 < 3);
          const isBrowBand = (y >= 48 && y <= 56) || (rx >= 60 && rx <= 68 && y < 116);

          if (isVisorSlit) {
            data[idx] = 20;
            data[idx + 1] = 22;
            data[idx + 2] = 26;
          } else if (isBreathingHole) {
            data[idx] = 30;
            data[idx + 1] = 32;
            data[idx + 2] = 38;
          } else if (isBrowBand) {
            data[idx] = clampByte(220 + (fine - 0.5) * 20);
            data[idx + 1] = clampByte(180 + (fine - 0.5) * 15);
            data[idx + 2] = clampByte(70 + (fine - 0.5) * 10);
          } else {
            data[idx] = clampByte(lum);
            data[idx + 1] = clampByte(lum + 3);
            data[idx + 2] = clampByte(lum + 9);
          }
        }
      } else {
        if (x < 128) {
          // --- ARTICULATED LAMES (Pauldrons, Couters, Greaves) ---
          const lameStep = (y - 128) % 24;
          const isLameOverlap = lameStep < 4;
          const lameShading = (lameStep / 24) * 25;
          let lum = 175 + lameShading + (n - 0.5) * 18;

          if (isLameOverlap) {
            lum -= 45;
          }

          const isRivet = (lameStep >= 10 && lameStep <= 13) && (x % 32 >= 14 && x % 32 <= 17);
          if (isRivet) {
            data[idx] = 230;
            data[idx + 1] = 190;
            data[idx + 2] = 75;
          } else {
            data[idx] = clampByte(lum);
            data[idx + 1] = clampByte(lum + 3);
            data[idx + 2] = clampByte(lum + 8);
          }
        } else {
          // --- CHAINMAIL COIF / HAUBERK ---
          const rx = x - 128;
          const ry = y - 128;
          const ringX = rx % 8;
          const ringY = ry % 8;
          const ringDist = Math.hypot(ringX - 4, ringY - 4);
          const isWire = ringDist > 1.8 && ringDist < 3.8;
          const isHole = ringDist <= 1.8;

          if (isHole) {
            data[idx] = 40;
            data[idx + 1] = 42;
            data[idx + 2] = 48;
          } else if (isWire) {
            const wireLum = 180 + (fine - 0.5) * 35;
            data[idx] = clampByte(wireLum);
            data[idx + 1] = clampByte(wireLum + 2);
            data[idx + 2] = clampByte(wireLum + 6);
          } else {
            const bgLum = 85 + (n - 0.5) * 20;
            data[idx] = clampByte(bgLum);
            data[idx + 1] = clampByte(bgLum + 2);
            data[idx + 2] = clampByte(bgLum + 5);
          }
        }
      }

      data[idx + 3] = 255;
    }
  }

  return data;
}

export function generateArmoredKnightGearPixels(): Uint8Array {
  const size = HUMANOID_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = (Math.sin(x * 15.345 + y * 63.891) * 31415.926) % 1;
      const fine = (Math.sin(x * 87.654 + y * 23.456) * 54321.098) % 1;

      if (y < 128) {
        if (x < 128) {
          // --- HORSE BARDING / CHANFRON STEEL PLATES ---
          const cx = Math.abs(x - 64);
          const chanfronCurve = Math.cos((cx / 64) * (Math.PI * 0.5)) * 32;
          let lum = 175 + chanfronCurve + (n - 0.5) * 16;
          const isSpike = y >= 54 && y <= 74 && cx <= 7;
          const isGoldBorder = x < 6 || x > 122 || y < 6 || y > 122;

          if (isSpike || isGoldBorder) {
            data[idx] = clampByte(225 + (fine - 0.5) * 20);
            data[idx + 1] = clampByte(185 + (fine - 0.5) * 15);
            data[idx + 2] = clampByte(70 + (fine - 0.5) * 10);
          } else {
            data[idx] = clampByte(lum);
            data[idx + 1] = clampByte(lum + 3);
            data[idx + 2] = clampByte(lum + 8);
          }
        } else {
          // --- HORSE COAT (Dark Bay Warhorse with sleek sheen) ---
          const furWave = Math.sin((x + y * 0.5) * 0.25) * 10;
          const horseR = 75 + furWave + (n - 0.5) * 18;
          const horseG = 45 + furWave * 0.8 + (n - 0.5) * 14;
          const horseB = 30 + furWave * 0.6 + (n - 0.5) * 10;
          data[idx] = clampByte(horseR);
          data[idx + 1] = clampByte(horseG);
          data[idx + 2] = clampByte(horseB);
        }
      } else {
        if (x < 128) {
          // --- HEAVY FLANGED MACE ---
          const relY = y - 128;
          if (relY < 48) {
            const flangeX = Math.abs((x % 32) - 16);
            const isFlangeEdge = flangeX < 4;
            const steelLum = 185 + (isFlangeEdge ? 45 : 0) + (n - 0.5) * 15;
            data[idx] = clampByte(steelLum);
            data[idx + 1] = clampByte(steelLum + 3);
            data[idx + 2] = clampByte(steelLum + 8);
          } else {
            const spiral = Math.sin((x * 0.8 + relY * 0.5) * 0.8) > 0 ? 25 : -20;
            const woodR = 105 + spiral + (fine - 0.5) * 15;
            const woodG = 65 + spiral * 0.8 + (fine - 0.5) * 12;
            const woodB = 38 + spiral * 0.6 + (fine - 0.5) * 10;
            data[idx] = clampByte(woodR);
            data[idx + 1] = clampByte(woodG);
            data[idx + 2] = clampByte(woodB);
          }
        } else {
          // --- SADDLE LEATHER & BRASS BUCKLES ---
          const rx = x - 128;
          const ry = y - 128;
          const isStrap = rx >= 48 && rx <= 80;
          const isBuckle = isStrap && ry >= 52 && ry <= 76;

          if (isBuckle) {
            data[idx] = 230;
            data[idx + 1] = 190;
            data[idx + 2] = 75;
          } else {
            const leatherR = (isStrap ? 65 : 85) + (n - 0.5) * 16;
            const leatherG = (isStrap ? 38 : 52) + (n - 0.5) * 12;
            const leatherB = (isStrap ? 22 : 32) + (n - 0.5) * 10;
            data[idx] = clampByte(leatherR);
            data[idx + 1] = clampByte(leatherG);
            data[idx + 2] = clampByte(leatherB);
          }
        }
      }

      data[idx + 3] = 255;
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
      case 'swordsman_helmet':
        pixels = generateSwordsmanHelmetPixels();
        break;
      case 'swordsman_armor':
        pixels = generateSwordsmanArmorPixels();
        break;
      case 'swordsman_gear':
        pixels = generateSwordsmanGearPixels();
        break;
      case 'healer_gear':
        pixels = generateHealerGearPixels();
        break;
      case 'maceman_armor':
        pixels = generateMacemanArmorPixels();
        break;
      case 'maceman_gear':
        pixels = generateMacemanGearPixels();
        break;
      case 'armored_knight_armor':
        pixels = generateArmoredKnightArmorPixels();
        break;
      case 'armored_knight_gear':
        pixels = generateArmoredKnightGearPixels();
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
    | 'swordsman_head_helmet'
    | 'swordsman_helmet_part'
    | 'swordsman_torso'
    | 'swordsman_belt'
    | 'swordsman_pauldron'
    | 'swordsman_gauntlet'
    | 'swordsman_arm'
    | 'swordsman_leg'
    | 'swordsman_sword'
    | 'swordsman_shield'
    | 'healer_knife'
    | 'healer_shield'
    | 'healer_satchel'
    | 'maceman_gambeson_torso'
    | 'maceman_gambeson_collar'
    | 'maceman_gambeson_arm'
    | 'maceman_gambeson_leg'
    | 'maceman_mace'
    | 'maceman_coif'
    | 'knight_horse_body'
    | 'knight_horse_neck'
    | 'knight_horse_head'
    | 'knight_horse_leg'
    | 'knight_horse_barding'
    | 'knight_saddle'
    | 'knight_plate_torso'
    | 'knight_plate_arm'
    | 'knight_plate_leg'
    | 'knight_great_helm'
    | 'knight_mace'
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

      // Swordsman
      case 'swordsman_head_helmet': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.04 + ny * 0.92;
        break;
      }
      case 'swordsman_helmet_part': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.35 + ny * 0.55;
        break;
      }
      case 'swordsman_torso': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.45 + ny * 0.52;
        break;
      }
      case 'swordsman_belt': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.35 + ny * 0.12;
        break;
      }
      case 'swordsman_pauldron': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.50 + ny * 0.45;
        break;
      }
      case 'swordsman_gauntlet': {
        u = 0.25 + ((x - minX) / spanX) * 0.50;
        v = 0.05 + ny * 0.25;
        break;
      }
      case 'swordsman_arm': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.34;
        break;
      }
      case 'swordsman_leg': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.38;
        break;
      }
      case 'swordsman_sword': {
        const theta = Math.atan2(z, x);
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'swordsman_shield': {
        u = 0.52 + ((x - minX) / spanX) * 0.46;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'healer_knife': {
        const theta = Math.atan2(z, x);
        u = 0.05 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.52 + ny * 0.44;
        break;
      }
      case 'healer_shield': {
        u = 0.04 + ((x - minX) / spanX) * 0.92;
        v = 0.04 + ny * 0.44;
        break;
      }
      case 'healer_satchel': {
        u = 0.52 + ((x - minX) / spanX) * 0.44;
        v = 0.52 + ny * 0.44;
        break;
      }

      // Maceman
      case 'maceman_gambeson_torso': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.55 + ny * 0.42;
        break;
      }
      case 'maceman_gambeson_collar': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.85 + ny * 0.12;
        break;
      }
      case 'maceman_gambeson_arm': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.15 + ny * 0.35;
        break;
      }
      case 'maceman_gambeson_leg': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.02 + ny * 0.38;
        break;
      }
      case 'maceman_mace': {
        const theta = Math.atan2(z, x);
        u = 0.08 + (theta / (2 * Math.PI) + 0.5) * 0.38;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'maceman_coif': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.52 + ny * 0.44;
        break;
      }


      // Armored Knight & Warhorse
      case 'knight_horse_body': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.55 + ny * 0.40;
        break;
      }
      case 'knight_horse_neck': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.60 + ny * 0.35;
        break;
      }
      case 'knight_horse_head': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.55 + ny * 0.40;
        break;
      }
      case 'knight_horse_leg': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.52 + ny * 0.42;
        break;
      }
      case 'knight_horse_barding': {
        u = 0.05 + ((x - minX) / spanX) * 0.42;
        v = 0.52 + ny * 0.42;
        break;
      }
      case 'knight_saddle': {
        u = 0.55 + ((x - minX) / spanX) * 0.40;
        v = 0.05 + ny * 0.40;
        break;
      }
      case 'knight_plate_torso': {
        const theta = Math.atan2(z, x);
        u = 0.05 + (theta / (2 * Math.PI) + 0.5) * 0.42;
        v = 0.55 + ny * 0.40;
        break;
      }
      case 'knight_great_helm': {
        const theta = Math.atan2(z, x);
        u = 0.55 + (theta / (2 * Math.PI) + 0.5) * 0.40;
        v = 0.55 + ny * 0.40;
        break;
      }
      case 'knight_plate_arm': {
        const theta = Math.atan2(z, x);
        u = 0.05 + (theta / (2 * Math.PI) + 0.5) * 0.42;
        v = 0.05 + ny * 0.40;
        break;
      }
      case 'knight_plate_leg': {
        const theta = Math.atan2(z, x);
        u = 0.05 + (theta / (2 * Math.PI) + 0.5) * 0.42;
        v = 0.05 + ny * 0.40;
        break;
      }
      case 'knight_mace': {
        const theta = Math.atan2(z, x);
        u = 0.05 + (theta / (2 * Math.PI) + 0.5) * 0.42;
        v = 0.05 + ny * 0.42;
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
