import * as THREE from 'three';

export const BARBARIAN_TEXTURE_SIZE = 256;

export type BarbarianTexturePart = 'face' | 'skin' | 'clothing' | 'weapon';

export const BARBARIAN_TEXTURE_PATHS: Record<BarbarianTexturePart, string> = {
  face: 'textures/units/barbarian_face.png',
  skin: 'textures/units/barbarian_skin.png',
  clothing: 'textures/units/barbarian_clothing.png',
  weapon: 'textures/units/barbarian_weapon.png',
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

/**
 * Generates a 256x256 RGBA pixel buffer for the Barbarian's face & helmet/horns:
 * - Rows y = 0..61 (v = 0.76..1.0): Hammered iron helmet plates, rivets & ridged horn ivory.
 * - Rows y = 62..255 (v = 0.0..0.76): Weathered skin, fierce eyes, heavy furrowed brows,
 *   blue woad warpaint stripes across cheeks/eyes, nose shading, and rugged braided beard.
 */
export function generateBarbarianFacePixels(): Uint8Array {
  const size = BARBARIAN_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 8, 101);
      const fine = hash2D(x, y, 103);

      // Top band (y < 62): Helmet hammered metal & horn rings
      if (y < 62) {
        const ringWave = Math.sin(y * 0.55) * 14;
        const hammer = (n - 0.5) * 38 + (fine - 0.5) * 14;
        let lum = 205 + hammer + ringWave;
        // Rivets along helmet rim (y ~ 48..54)
        if (y >= 46 && y <= 54) {
          const rx = ((x % 16) - 8);
          const ry = y - 50;
          if (rx * rx + ry * ry <= 9) {
            lum += 35;
          }
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = clampByte(c + 4);
        data[idx + 3] = 255;
        continue;
      }

      // Face & Head region (y = 62..255, front center at x = 128)
      const dx = x - 128;
      const adx = Math.abs(dx);
      const pore = (n - 0.5) * 24 + (fine - 0.5) * 10;

      // Warm tanned barbarian skin base
      let r = 224 + pore;
      let g = 176 + pore * 0.85;
      let b = 138 + pore * 0.7;

      // Cheekbone & temple shading
      const cheekDist = Math.hypot(adx - 22, y - 160);
      if (cheekDist < 20) {
        const w = 1 - cheekDist / 20;
        r += w * 14;
        g += w * 6;
      }

      // Blue woad warpaint diagonal stripes across eyes/cheeks
      const stripeWave = Math.sin((adx * 0.45 + (y - 145) * 0.25));
      if (y >= 126 && y <= 178 && adx >= 12 && adx <= 56 && stripeWave > 0.45) {
        const paintStrength = Math.min(1, (stripeWave - 0.45) * 2.2);
        r = r * (1 - paintStrength * 0.72) + 38 * paintStrength;
        g = g * (1 - paintStrength * 0.45) + 92 * paintStrength;
        b = b * (1 - paintStrength * 0.15) + 185 * paintStrength;
      }

      // Forehead / scalp hair at back and sides (adx > 58 or y < 96)
      if (y < 96 || adx > 64) {
        const hairStrand = Math.sin(x * 0.9 + n * 4) * 12;
        r = 68 + hairStrand + pore * 0.5;
        g = 48 + hairStrand * 0.8 + pore * 0.4;
        b = 34 + hairStrand * 0.6 + pore * 0.3;
      }

      // Heavy furrowed eyebrows (y = 126..136, adx = 10..34)
      const browY = 131 + (adx - 10) * -0.18;
      if (adx >= 8 && adx <= 35 && Math.abs(y - browY) <= 4.2) {
        r = 46 + pore * 0.4;
        g = 32 + pore * 0.3;
        b = 22 + pore * 0.2;
      }

      // Fierce Eyes (centers at x = 128 +/- 20, y = 143)
      const eyeDx = adx - 20;
      const eyeDy = y - 143;
      const eyeDist = Math.hypot(eyeDx * 0.75, eyeDy * 1.35);
      if (eyeDist < 8.5) {
        if (eyeDist > 6.8) {
          // Dark eyeliner / socket crease
          r = 42;
          g = 28;
          b = 24;
        } else if (Math.hypot(eyeDx, eyeDy) < 3.6) {
          // Dark iris & pupil with specular glint
          const glint = eyeDx < -0.5 && eyeDy < -0.5 ? 210 : 0;
          r = clampByte(32 + glint);
          g = clampByte(55 + glint);
          b = clampByte(78 + glint);
        } else {
          // Sclera
          r = 242;
          g = 238;
          b = 232;
        }
      }

      // Nose bridge & nostrils (adx <= 9, y = 138..168)
      if (adx <= 9 && y >= 138 && y <= 168) {
        if (adx <= 3.5 && y <= 162) {
          // Bridge highlight
          r += 18;
          g += 14;
          b += 10;
        } else if (adx >= 5.5) {
          // Side nose shadow
          r -= 26;
          g -= 22;
          b -= 18;
        }
        if (y >= 163 && Math.abs(adx - 4) <= 2.2) {
          // Nostrils
          r = 65;
          g = 40;
          b = 32;
        }
      }

      // Thick braided barbarian moustache & full beard (y >= 168, adx <= 58)
      const beardArch = 170 + Math.max(0, (adx - 14) * 0.45);
      if (y >= beardArch && adx <= 58) {
        const beardStrand = Math.sin(x * 1.15 + n * 5.0) * 16 + (fine - 0.5) * 14;
        r = 64 + beardStrand;
        g = 44 + beardStrand * 0.75;
        b = 30 + beardStrand * 0.55;

        // Fierce grimacing mouth / teeth line at y = 180..186, adx <= 15
        if (y >= 179 && y <= 186 && adx <= 15) {
          if (y === 179 || y === 186) {
            r = 35;
            g = 18;
            b = 16;
          } else {
            const toothGap = Math.abs(dx) % 4 === 0 ? -45 : 0;
            r = 225 + toothGap;
            g = 215 + toothGap;
            b = 195 + toothGap;
          }
        }
      }

      // Facial battle scar across left cheek (dx in 14..32, y in 152..172)
      if (dx >= 14 && dx <= 32 && Math.abs((y - 152) - (dx - 14) * 0.95) < 1.6) {
        r = clampByte(r + 28);
        g = clampByte(g - 18);
        b = clampByte(b - 18);
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
 * Generates a 256x256 RGBA pixel buffer for the Barbarian's muscular skin:
 * - Sculpted pectoral and abdominal muscle shading on the front torso (x around 128).
 * - Back latissimus/spine definition and deltoid/bicep striations on the sides.
 * - Blue woad warpaint bands, battle scars, and dark leather wrist bracers near bottom.
 */
export function generateBarbarianSkinPixels(): Uint8Array {
  const size = BARBARIAN_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 10, 202);
      const fine = hash2D(x, y, 205);

      // Neutral-warm skin luminance (multiplied by matSkin 0xdeb38e via vertexColors)
      let r = 236 + (n - 0.5) * 26 + (fine - 0.5) * 10;
      let g = 228 + (n - 0.5) * 24 + (fine - 0.5) * 10;
      let b = 220 + (n - 0.5) * 22 + (fine - 0.5) * 10;

      const dx = x - 128;
      const adx = Math.abs(dx);

      // Center linea alba (sternum & abs vertical cleft at x = 128) and spine groove (x near 0/255)
      if (adx < 6 && y >= 45 && y <= 215) {
        const groove = (1 - adx / 6) * 42;
        r -= groove;
        g -= groove * 1.05;
        b -= groove * 1.1;
      }
      const backDist = Math.min(x, 255 - x);
      if (backDist < 7 && y >= 40 && y <= 200) {
        const spine = (1 - backDist / 7) * 34;
        r -= spine;
        g -= spine;
        b -= spine;
      }

      // Pectoral muscles (y = 52..112, adx = 8..48)
      if (y >= 52 && y <= 112 && adx >= 6 && adx <= 50) {
        const py = (y - 82) / 30;
        const px = (adx - 26) / 22;
        const d = py * py + px * px;
        if (d < 1.0) {
          // Upper pec highlight, lower pec crease shadow
          if (py < 0.35) {
            const h = (1 - d) * 24;
            r += h;
            g += h;
            b += h;
          } else {
            const s = (py - 0.35) * 58;
            r -= s;
            g -= s * 1.05;
            b -= s * 1.1;
          }
        }
        // Nipple detail
        if (Math.hypot(adx - 32, y - 96) < 3.2) {
          r -= 48;
          g -= 58;
          b -= 62;
        }
      }

      // 6-Pack Abdominal blocks (y = 114..210, adx = 5..34)
      if (y >= 114 && y <= 210 && adx >= 4 && adx <= 34) {
        const rowPhase = Math.sin(((y - 114) / 30) * Math.PI);
        const colW = 1 - Math.abs(adx - 18) / 15;
        if (colW > 0) {
          if ( Math.abs(rowPhase) < 0.22) {
            // Horizontal tendinous intersection crease
            r -= 36 * colW;
            g -= 38 * colW;
            b -= 40 * colW;
          } else {
            // Ab muscle belly highlight
            r += 16 * colW;
            g += 14 * colW;
            b += 12 * colW;
          }
        }
      }

      // Blue woad warpaint / tribal swirl across chest & shoulder/bicep
      const tattooWave = Math.sin(x * 0.14 + y * 0.11 + n * 2.2);
      if (y >= 58 && y <= 145 && tattooWave > 0.72 && adx >= 14 && adx <= 95) {
        const w = (tattooWave - 0.72) / 0.28;
        r = r * (1 - w * 0.65) + 45 * w;
        g = g * (1 - w * 0.35) + 115 * w;
        b = b * (1 - w * 0.05) + 220 * w;
      }

      //Diagonal chest battle scar
      if (dx >= -35 && dx <= 15 && Math.abs((y - 75) - (dx + 35) * 0.7) < 2.0) {
        r += 22;
        g -= 24;
        b -= 26;
      }

      // Dark leather wrist bracers near bottom of arm UV region (y >= 224)
      if (y >= 224 && adx > 55) {
        r = 95 + (n - 0.5) * 20;
        g = 72 + (n - 0.5) * 16;
        b = 54 + (n - 0.5) * 14;
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
 * Generates a 256x256 RGBA pixel buffer for the Barbarian's clothing:
 * - Rows y = 0..84 (v = 0.67..1.0): Coarse wolf-fur pelt strands for Fur_Mantle.
 * - Rows y = 85..164 (v = 0.36..0.67): Woven war-harness / tabard fabric + studded leather belt.
 * - Rows y = 165..255 (v = 0.0..0.36): Cross-laced stitched leather trousers & boots.
 */
export function generateBarbarianClothingPixels(): Uint8Array {
  const size = BARBARIAN_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 7, 303);
      const fine = hash2D(x, y, 307);

      if (y < 85) {
        // 1. Wolf Fur Pelt Mantle (directional shaggy tufts)
        const tuft = Math.sin(x * 1.35 + Math.sin(y * 0.35) * 3.0 + n * 5.0);
        const strand = (tuft * 0.5 + 0.5) * 75 + (fine - 0.5) * 28;
        const silverTip = y % 14 > 10 && tuft > 0.4 ? 42 : 0;
        const c = clampByte(165 + strand + silverTip);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 6);
        data[idx + 2] = clampByte(c - 14);
        data[idx + 3] = 255;
      } else if (y < 140) {
        // 2. Woven War-Harness / Team Tabard (neutral high-contrast weave so team vertexColor shines)
        const weaveX = (x % 4 < 2) ? 14 : -14;
        const weaveY = (y % 4 < 2) ? 14 : -14;
        const crossWeave = ((x + y) % 4 < 2 ? weaveX : weaveY) * 0.8;
        let lum = 222 + crossWeave + (n - 0.5) * 24;
        // Celtic/Nordic geometric border pattern near top/bottom of tabard
        if ((y >= 88 && y <= 96) || (y >= 130 && y <= 138)) {
          const chevron = ((x + y) % 8 < 4) ? 28 : -32;
          lum += chevron;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = c;
        data[idx + 2] = c;
        data[idx + 3] = 255;
      } else if (y < 165) {
        // 3. Studded Dark Leather Belt (y = 140..164)
        let lum = 175 + (n - 0.5) * 30;
        const studDx = (x % 16) - 8;
        const studDy = y - 152;
        const studDist = Math.hypot(studDx, studDy);
        if (studDist < 3.8) {
          // Metallic brass/iron belt stud
          data[idx] = 248;
          data[idx + 1] = 220;
          data[idx + 2] = 145;
          data[idx + 3] = 255;
          continue;
        }
        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c - 12);
        data[idx + 2] = clampByte(c - 24);
        data[idx + 3] = 255;
      } else {
        // 4. Stitched Leather Trousers & Boots (y = 165..255)
        const grain = (n - 0.5) * 42 + (fine - 0.5) * 16;
        let r = 212 + grain;
        let g = 198 + grain * 0.9;
        let b = 182 + grain * 0.8;

        // Cross-laced leather thongs / stitching every 32px
        const seamDist = Math.abs((x % 32) - 16);
        if (seamDist < 2.2) {
          const stitch = (y % 6 < 3) ? 38 : -42;
          r += stitch;
          g += stitch;
          b += stitch;
        }

        // Horizontal boot fur trim & leather straps (y >= 220)
        if (y >= 218 && y <= 228) {
          const fur = Math.sin(x * 1.5) * 28;
          r = 185 + fur;
          g = 175 + fur;
          b = 162 + fur;
        } else if (y > 228 && y % 9 < 3) {
          r -= 38;
          g -= 38;
          b -= 38;
        }

        data[idx] = clampByte(r);
        data[idx + 1] = clampByte(g);
        data[idx + 2] = clampByte(b);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * Generates a 256x256 RGBA pixel buffer for the Barbarian's Double-Bitted Battleaxe:
 * - Left half (x = 0..127, u = 0.0..0.5): Ash wood grain shaft with braided leather grip wraps.
 * - Right half (x = 128..255, u = 0.5..1.0): Forged steel double-bitted blade with bright
 *   sharpened cutting edges, bevels, rivets, and engraved runes.
 */
export function generateBarbarianWeaponPixels(): Uint8Array {
  const size = BARBARIAN_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = fbm(x, y, 8, 404);
      const fine = hash2D(x, y, 409);

      if (x < 128) {
        // Left half: Ash Wood Shaft & Braided Leather Grip
        const woodGrain = Math.sin(x * 0.85 + n * 6.0) * 26 + (fine - 0.5) * 14;
        let r = 216 + woodGrain;
        let g = 198 + woodGrain * 0.85;
        let b = 176 + woodGrain * 0.7;

        // Criss-cross leather grip wrapping in middle of shaft (y = 96..176)
        if (y >= 96 && y <= 176) {
          const wrap1 = Math.abs(((x + y) % 14) - 7);
          const wrap2 = Math.abs(((x - y + 256) % 14) - 7);
          if (wrap1 < 2.2 || wrap2 < 2.2) {
            r = 125 + (n - 0.5) * 20;
            g = 95 + (n - 0.5) * 16;
            b = 72 + (n - 0.5) * 12;
          } else {
            r -= 24;
            g -= 28;
            b -= 32;
          }
        }

        // Iron reinforcement bands at top and bottom of shaft
        if ((y >= 24 && y <= 34) || (y >= 224 && y <= 234)) {
          r = 195;
          g = 200;
          b = 210;
        }

        data[idx] = clampByte(r);
        data[idx + 1] = clampByte(g);
        data[idx + 2] = clampByte(b);
        data[idx + 3] = 255;
      } else {
        // Right half (x = 128..255): Double-Bitted Steel Battleaxe Blade
        // Local blade horizontal coordinate bx in [-64, +63]
        const bx = x - 192;
        const abx = Math.abs(bx);
        const brush = Math.sin(y * 1.2 + n * 4.0) * 14 + (fine - 0.5) * 12;

        // Dark forged steel housing in center, gleaming honed edge toward outer rims (abx > 38)
        let lum = 178 + brush;
        if (abx > 42) {
          // Gleaming sharpened bevel edge
          const edgeFactor = Math.min(1, (abx - 42) / 18);
          lum = lum * (1 - edgeFactor) + (250 + (fine - 0.5) * 10) * edgeFactor;
          // Battle nicks along outer cutting edge
          if (abx > 54 && (y * 7) % 29 < 3) {
            lum -= 65;
          }
        } else if (abx > 36) {
          // Dark bevel transition groove
          lum -= 38;
        } else if (abx >= 14 && abx <= 30 && y >= 56 && y <= 200) {
          // Engraved Nordic rune / fuller groove along blade cheeks
          const runePattern = ((y % 24 < 16) && (Math.abs(abx - 22) < 2.5 || Math.abs((y % 24) - 8) < 2.0));
          if (runePattern) {
            lum -= 52;
          }
        }

        const c = clampByte(lum);
        data[idx] = c;
        data[idx + 1] = clampByte(c + 3);
        data[idx + 2] = clampByte(c + 8);
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

const barbarianTextureCache: Partial<Record<BarbarianTexturePart, THREE.DataTexture>> = {};
const barbarianMaterialCache: Partial<Record<BarbarianTexturePart, THREE.MeshStandardMaterial>> = {};

/**
 * Returns the cached 256x256 THREE.DataTexture for the specified Barbarian part
 * ('face' | 'skin' | 'clothing' | 'weapon').
 */
export function getBarbarianPartTexture(part: BarbarianTexturePart): THREE.DataTexture {
  let tex = barbarianTextureCache[part];
  if (!tex) {
    let pixels: Uint8Array;
    switch (part) {
      case 'face':
        pixels = generateBarbarianFacePixels();
        break;
      case 'skin':
        pixels = generateBarbarianSkinPixels();
        break;
      case 'clothing':
        pixels = generateBarbarianClothingPixels();
        break;
      case 'weapon':
        pixels = generateBarbarianWeaponPixels();
        break;
    }
    tex = new THREE.DataTexture(
      pixels,
      BARBARIAN_TEXTURE_SIZE,
      BARBARIAN_TEXTURE_SIZE,
      THREE.RGBAFormat
    );
    tex.name = `barbarian_${part}_256x256`;
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
      part,
      width: BARBARIAN_TEXTURE_SIZE,
      height: BARBARIAN_TEXTURE_SIZE,
      src: BARBARIAN_TEXTURE_PATHS[part],
    };
    barbarianTextureCache[part] = tex;
  }
  return tex;
}

/**
 * Returns the shared opaque vertex-colored MeshStandardMaterial for a Barbarian limb part,
 * equipped with its 256x256 detail texture map.
 */
export function getBarbarianPartMaterial(part: BarbarianTexturePart): THREE.MeshStandardMaterial {
  let mat = barbarianMaterialCache[part];
  if (!mat) {
    const roughness = part === 'weapon' ? 0.42 : part === 'clothing' ? 0.82 : 0.72;
    const metalness = part === 'weapon' ? 0.55 : 0.08;
    mat = new THREE.MeshStandardMaterial({
      name: `Barbarian_${part}_Material`,
      color: 0xffffff,
      vertexColors: true,
      roughness,
      metalness,
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      map: getBarbarianPartTexture(part),
    });
    mat.userData = {
      isSharedAsset: true,
      barbarianTexturePart: part,
    };
    barbarianMaterialCache[part] = mat;
  }
  return mat;
}

/**
 * Computes custom UV coordinates for Barbarian sub-meshes so the 256x256 face, skin,
 * clothing, and weapon textures align accurately across both procedural and Blender meshes.
 */
export function applyBarbarianUVMapping(
  geometry: THREE.BufferGeometry,
  partRole:
    | 'head_face'
    | 'helmet_horn'
    | 'torso_skin'
    | 'arm_skin'
    | 'fur_mantle'
    | 'tabard'
    | 'belt'
    | 'leg_clothing'
    | 'axe_shaft'
    | 'axe_blade'
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
  const minZ = bbox.min.z;
  const maxZ = bbox.max.z;
  const spanZ = Math.max(1e-4, maxZ - minZ);

  const uvs = new Float32Array(posAttr.count * 2);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const ny = (y - minY) / spanY; // 0 at bottom, 1 at top

    let u = 0.5;
    let v = ny;

    switch (partRole) {
      case 'head_face': {
        // Azimuth around head center: +X is forward (u = 0.5), +Z is right, -Z is left
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        // Map head sphere into lower 75% of barbarian_face.png (v in [0.02, 0.74])
        v = 0.02 + ny * 0.72;
        break;
      }
      case 'helmet_horn': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        // Map helmet & horns into top 24% strip of barbarian_face.png (v in [0.76, 0.99])
        v = 0.76 + ny * 0.23;
        break;
      }
      case 'torso_skin': {
        // Cylindrical wrap around torso: +X is front chest/abs (u = 0.5)
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        v = 0.14 + ny * 0.82;
        break;
      }
      case 'arm_skin': {
        const theta = Math.atan2(z, x);
        u = 0.72 + (theta / (2 * Math.PI)) * 0.26;
        v = 0.04 + ny * 0.85;
        break;
      }
      case 'fur_mantle': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        // Top band of barbarian_clothing.png (v in [0.68, 0.99])
        v = 0.68 + ny * 0.31;
        break;
      }
      case 'tabard': {
        u = (z - minZ) / spanZ;
        // Middle weave band of barbarian_clothing.png (v in [0.46, 0.66])
        v = 0.46 + ny * 0.20;
        break;
      }
      case 'belt': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        // Studded belt row of barbarian_clothing.png (v in [0.36, 0.45])
        v = 0.36 + ny * 0.09;
        break;
      }
      case 'leg_clothing': {
        const theta = Math.atan2(z, x);
        u = 0.5 + theta / (2 * Math.PI);
        // Lower trousers & boots band of barbarian_clothing.png (v in [0.01, 0.35])
        v = 0.01 + ny * 0.34;
        break;
      }
      case 'axe_shaft': {
        const theta = Math.atan2(z, x);
        // Left half of barbarian_weapon.png (u in [0.02, 0.46])
        u = 0.24 + (theta / (2 * Math.PI)) * 0.44;
        v = 0.02 + ny * 0.96;
        break;
      }
      case 'axe_blade': {
        // Right half of barbarian_weapon.png (u in [0.52, 0.98])
        const nx = (x - minX) / spanX;
        u = 0.52 + nx * 0.46;
        v = 0.15 + ny * 0.70;
        break;
      }
    }

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}
