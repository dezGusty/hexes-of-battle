import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  BARBARIAN_TEXTURE_SIZE,
  BARBARIAN_TEXTURE_PATHS,
  generateBarbarianFacePixels,
  generateBarbarianSkinPixels,
  generateBarbarianClothingPixels,
  generateBarbarianWeaponPixels,
} from '../src/render3d/units/barbarian-textures';
import {
  HUMANOID_TEXTURE_SIZE,
  HUMANOID_TEXTURE_PATHS,
  generatePeasantFacePixels,
  generatePeasantClothPixels,
  generatePeasantPitchforkPixels,
  generateArcherFacePixels,
  generateArcherClothingPixels,
  generateArcherBowPixels,
  generateSpearmanFacePixels,
  generateSpearmanArmorPixels,
  generateSpearmanGearPixels,
  generateSwordsmanHelmetPixels,
  generateSwordsmanArmorPixels,
  generateSwordsmanGearPixels,
  generateHealerGearPixels,
  generateMacemanArmorPixels,
  generateMacemanGearPixels,
  generateArmoredKnightArmorPixels,
  generateArmoredKnightGearPixels,
} from '../src/render3d/units/humanoid-unit-textures';
import {
  TREE_TEXTURE_SIZE,
  TREE_TEXTURE_PATHS,
  generateTreeBarkPixels,
  generateTreeFoliagePixels,
} from '../src/render3d/units/tree-textures';
import {
  SELECTED_HALO_TEXTURE_SIZE,
  SELECTED_HALO_TEXTURE_PATH,
  generateSelectedHaloPixels,
} from '../src/render3d/units/selected-halo-texture';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width * 4; x++) {
      raw[rowStart + 1 + x] = rgba[y * width * 4 + x];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateArmorPenetrationIconPixels(): Uint8Array {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const cx = 128;
  const cy = 128;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Outside circular border: transparent
      if (dist > 124) {
        data[idx + 3] = 0;
        continue;
      }

      // Rich royal steel/navy backdrop with ambient center glow
      const vig = dist / 124;
      let r = 28 + (1 - vig) * 55;
      let g = 36 + (1 - vig) * 60;
      let b = 58 + (1 - vig) * 75;

      // Circular Golden Border Ring (dist 116..124)
      if (dist >= 116 && dist <= 124) {
        const ringT = 1 - Math.abs(dist - 120) / 4;
        r = 235 * ringT + 40;
        g = 195 * ringT + 30;
        b = 75 * ringT + 15;
        data[idx] = Math.min(255, Math.round(r));
        data[idx + 1] = Math.min(255, Math.round(g));
        data[idx + 2] = Math.min(255, Math.round(b));
        data[idx + 3] = 255;
        continue;
      }

      // 1. Steel Heater Shield (width ~110, height ~130)
      const sx = dx * 0.96 + dy * 0.12;
      const sy = -dx * 0.12 + dy * 0.96;

      const inShieldTop = sy >= -65 && sy <= -10 && Math.abs(sx) <= 56;
      const inShieldBottom = sy > -10 && sy <= 68 && Math.abs(sx) <= 56 * (1 - (sy + 10) / 88);
      const inShield = inShieldTop || inShieldBottom;

      if (inShield) {
        // Shield bevel / rim
        const distToTop = Math.abs(sy - (-65));
        const distToSide = inShieldTop ? 56 - Math.abs(sx) : (56 * (1 - (sy + 10) / 88)) - Math.abs(sx);
        const isRim = distToTop < 6 || distToSide < 6;

        // Polished steel plate with horizontal specular curve
        const plateCurve = Math.cos((sx / 56) * Math.PI * 0.5) * 45;
        const ironLum = 155 + plateCurve + ((x * 13 + y * 29) % 15) - 7;

        if (isRim) {
          // Golden shield rim
          r = 225;
          g = 185;
          b = 75;
        } else {
          // Steel breastplate surface
          r = ironLum;
          g = ironLum + 5;
          b = ironLum + 16;
        }

        // 2. Jagged Sunder Crack / Fracture splitting the shield in two
        const crackX = Math.sin(sy * 0.14) * 10 + Math.cos(sy * 0.28) * 5;
        const crackDist = Math.abs(sx - crackX);

        if (crackDist < 4.0) {
          // Deep ruptured fracture void
          r = 20;
          g = 18;
          b = 28;
        } else if (crackDist < 10.0) {
          // White-hot kinetic fracture stress glow
          const glow = (1 - (crackDist - 4.0) / 6.0) * 120;
          r = Math.min(255, r + glow + 40);
          g = Math.min(255, g + glow + 20);
          b = Math.min(255, b + glow * 0.5);
        }

        // Secondary diagonal fracture branches
        const branch1 = Math.abs((sx - crackX) - (sy + 15) * 0.55);
        const branch2 = Math.abs((sx - crackX) + (sy - 25) * 0.65);
        if ((branch1 < 2.5 && sy > -35 && sy < 5) || (branch2 < 2.5 && sy > 5 && sy < 50)) {
          r = 255;
          g = 220;
          b = 130;
        }
      }

      // 3. Heavy Spiked Flanged Mace striking through the impact center
      const mx = dx - 12;
      const my = dy + 12;
      const maceDist = Math.hypot(mx, my);

      // Mace haft
      const haftProj = (mx * 0.707 + my * 0.707);
      const haftPerp = Math.abs(-mx * 0.707 + my * 0.707);
      if (haftProj > 10 && haftProj < 100 && haftPerp < 7.0) {
        const spiral = Math.sin(haftProj * 0.4) > 0 ? 35 : -25;
        r = 135 + spiral;
        g = 95 + spiral * 0.8;
        b = 55 + spiral * 0.6;
      }

      // Mace Head & Flanges
      if (maceDist < 36) {
        const flangeAngle = Math.atan2(my, mx);
        const flangeRay = Math.abs(Math.sin(flangeAngle * 3));
        const isFlange = flangeRay > 0.78 && maceDist < 34;
        const isCore = maceDist < 18;

        if (isFlange || isCore) {
          const flangeLum = 210 + (isFlange ? 35 : 0) - maceDist * 1.2;
          r = Math.max(0, Math.min(255, flangeLum + 10));
          g = Math.max(0, Math.min(255, flangeLum + 12));
          b = Math.max(0, Math.min(255, flangeLum + 22));

          // Golden flange bevel edge
          if (isFlange && flangeRay > 0.92) {
            r = 245;
            g = 205;
            b = 85;
          }

          // Blazing white impact core
          if (maceDist < 9) {
            r = 255;
            g = 255;
            b = 235;
          }
        }
      }

      // 4. Kinetic sparks & impact shockwave burst
      if (maceDist >= 14 && maceDist <= 72) {
        const sparkAngle = Math.atan2(my, mx);
        const sparkRay = Math.sin(sparkAngle * 10 + maceDist * 0.6);
        if (sparkRay > 0.90) {
          r = 255;
          g = 230;
          b = 90;
        } else if (sparkRay > 0.82) {
          r = 255;
          g = 150;
          b = 40;
        }
      }

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
  }

  return data;
}

function generateCavalryIconPixels(): Uint8Array {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const cx = 128;
  const cy = 128;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Outside circular border: transparent
      if (dist > 124) {
        data[idx + 3] = 0;
        continue;
      }

      // Deep noble sapphire blue background with radiant center glow
      const vig = dist / 124;
      let r = 24 + (1 - vig) * 50;
      let g = 38 + (1 - vig) * 65;
      let b = 75 + (1 - vig) * 95;

      // Circular Golden Border Ring (dist 116..124)
      if (dist >= 116 && dist <= 124) {
        const ringT = 1 - Math.abs(dist - 120) / 4;
        r = 235 * ringT + 40;
        g = 195 * ringT + 30;
        b = 75 * ringT + 15;
        data[idx] = Math.min(255, Math.round(r));
        data[idx + 1] = Math.min(255, Math.round(g));
        data[idx + 2] = Math.min(255, Math.round(b));
        data[idx + 3] = 255;
        continue;
      }

      // 1. Warhorse Head & Neck Profile facing right
      const inNeck = dx >= -55 && dx <= 32 && dy >= -15 && dy <= 75 && (dx + dy * 0.6 >= -38) && (dx + dy * 0.8 <= 58);
      const inHead = dx >= -32 && dx <= 55 && dy >= -62 && dy <= -5 && (dy - dx * 0.8 <= 22) && (dx - dy * 0.6 <= 58);
      const inEar = dx >= -10 && dx <= 14 && dy >= -86 && dy <= -56 && Math.abs(dx - 2) < (dy + 86) * 0.45;
      const inMane = dx >= -62 && dx <= -20 && dy >= -52 && dy <= 65 && Math.sin(dy * 0.28) > -0.25;

      if (inNeck || inHead || inEar || inMane) {
        const isChanfron = inHead && (dx >= -12 && dx <= 46 && dy >= -58 && dy <= -12);
        const isChanfronSpike = inHead && Math.abs(dx - 20) < 4.5 && dy >= -82 && dy <= -54;
        const isManeStripe = inMane && !inNeck;

        if (isChanfronSpike) {
          // Brilliant golden spike on forehead
          r = 255;
          g = 225;
          b = 85;
        } else if (isChanfron) {
          // Polished steel chanfron plate armor
          const chanLum = 205 + dx * 0.6 - dy * 0.4;
          r = Math.min(255, chanLum + 10);
          g = Math.min(255, chanLum + 12);
          b = Math.min(255, chanLum + 24);

          // Golden brow rim band
          if (dy >= -58 && dy <= -50) {
            r = 245;
            g = 205;
            b = 75;
          }
          // Ocular eye slit
          if (dx >= 2 && dx <= 16 && dy >= -42 && dy <= -34) {
            r = 30;
            g = 25;
            b = 35;
          }
        } else if (isManeStripe) {
          // Flowing dark mane with silver highlight
          const maneHighlight = Math.sin(dy * 0.5) > 0.5 ? 65 : 25;
          r = 45 + maneHighlight;
          g = 45 + maneHighlight;
          b = 55 + maneHighlight;
        } else {
          // Warm chestnut / bay warhorse coat with rich highlights
          const coatLum = 145 + dx * 0.6 - dy * 0.4;
          r = Math.min(255, coatLum + 35);
          g = Math.min(255, coatLum * 0.72);
          b = Math.min(255, coatLum * 0.45);
        }
      }

      // 2. Embossed Golden Horseshoe Emblem in lower center
      const hsDist = Math.hypot(dx, dy - 58);
      if (hsDist >= 18 && hsDist <= 32 && (dy >= 42 || Math.abs(dx) > 10)) {
        const hsT = 1 - Math.abs(hsDist - 25) / 7;
        r = Math.max(r, 245 * hsT + 30);
        g = Math.max(g, 205 * hsT + 20);
        b = Math.max(b, 85 * hsT + 10);

        // Horseshoe stud holes
        if (Math.abs(hsDist - 25) < 2.5 && (Math.abs(dx) === 16 || Math.abs(dx) === 23 || (Math.abs(dx) === 9 && dy > 70))) {
          r = 35;
          g = 25;
          b = 15;
        }
      }

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
  }

  return data;
}

function generateChargeIconPixels(): Uint8Array {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const cx = 128;
  const cy = 128;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Outside circular border: transparent
      if (dist > 124) {
        data[idx + 3] = 0;
        continue;
      }

      // Dynamic crimson/amber speed backdrop
      const vig = dist / 124;
      let r = 55 + (1 - vig) * 75;
      let g = 22 + (1 - vig) * 45;
      let b = 24 + (1 - vig) * 35;

      // Circular Golden Border Ring (dist 116..124)
      if (dist >= 116 && dist <= 124) {
        const ringT = 1 - Math.abs(dist - 120) / 4;
        r = 235 * ringT + 40;
        g = 195 * ringT + 30;
        b = 75 * ringT + 15;
        data[idx] = Math.min(255, Math.round(r));
        data[idx + 1] = Math.min(255, Math.round(g));
        data[idx + 2] = Math.min(255, Math.round(b));
        data[idx + 3] = 255;
        continue;
      }

      // Diagonal charge coordinates: proj along (-45 deg diagonal, bottom-left to top-right)
      const proj = (dx * 0.707 - dy * 0.707);
      const perp = Math.abs(dx * 0.707 + dy * 0.707);

      // Kinetic speed motion streaks
      if (perp > 10 && perp < 68 && proj < 35) {
        const streakWave = Math.sin(perp * 0.6 + proj * 0.08);
        if (streakWave > 0.85) {
          const streakLum = (1 - perp / 68) * 170;
          r = Math.min(255, r + streakLum);
          g = Math.min(255, g + streakLum * 0.8);
          b = Math.min(255, b + streakLum * 0.4);
        }
      }

      // 1. Heavy Charging Lance
      if (proj >= -85 && proj <= 45 && perp <= 6.5) {
        const spiral = Math.sin(proj * 0.3) > 0 ? 30 : -20;
        r = 165 + spiral;
        g = 115 + spiral * 0.75;
        b = 65 + spiral * 0.5;
      }

      // Ornate Golden Vamplate Handguard
      if (proj >= -22 && proj <= -10 && perp <= 28) {
        const isCenterPlate = perp < 20;
        if (isCenterPlate) {
          r = 210;
          g = 215;
          b = 225;
        } else {
          r = 245;
          g = 205;
          b = 75;
        }
      }

      // Gleaming Steel Lance Point
      if (proj > 45 && proj <= 94 && perp <= (94 - proj) * 0.35) {
        const bladeLum = 215 + (perp < 2.5 ? 40 : 0);
        r = Math.min(255, bladeLum);
        g = Math.min(255, bladeLum + 5);
        b = Math.min(255, bladeLum + 18);
      }

      // 2. Explosive Impact Burst at Tip
      const tipDist = Math.hypot(proj - 94, perp);
      if (tipDist < 42) {
        const burstAngle = Math.atan2(perp, proj - 94);
        const ray = Math.abs(Math.sin(burstAngle * 7));
        if (ray > 0.70 || tipDist < 12) {
          const sparkLum = (1 - tipDist / 42) * 255;
          r = Math.min(255, r + sparkLum);
          g = Math.min(255, g + sparkLum * 0.9);
          b = Math.min(255, b + sparkLum * 0.5);
        }
      }

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
  }

  return data;
}

const texturesToGenerate: Record<string, { path: string; gen: () => Uint8Array; size: number }> = {
  // Barbarian
  barbarian_face: { path: BARBARIAN_TEXTURE_PATHS.face, gen: generateBarbarianFacePixels, size: BARBARIAN_TEXTURE_SIZE },
  barbarian_skin: { path: BARBARIAN_TEXTURE_PATHS.skin, gen: generateBarbarianSkinPixels, size: BARBARIAN_TEXTURE_SIZE },
  barbarian_clothing: { path: BARBARIAN_TEXTURE_PATHS.clothing, gen: generateBarbarianClothingPixels, size: BARBARIAN_TEXTURE_SIZE },
  barbarian_weapon: { path: BARBARIAN_TEXTURE_PATHS.weapon, gen: generateBarbarianWeaponPixels, size: BARBARIAN_TEXTURE_SIZE },

  // Peasant
  peasant_face: { path: HUMANOID_TEXTURE_PATHS.peasant_face, gen: generatePeasantFacePixels, size: HUMANOID_TEXTURE_SIZE },
  peasant_cloth: { path: HUMANOID_TEXTURE_PATHS.peasant_cloth, gen: generatePeasantClothPixels, size: HUMANOID_TEXTURE_SIZE },
  peasant_pitchfork: { path: HUMANOID_TEXTURE_PATHS.peasant_pitchfork, gen: generatePeasantPitchforkPixels, size: HUMANOID_TEXTURE_SIZE },

  // Archer
  archer_face: { path: HUMANOID_TEXTURE_PATHS.archer_face, gen: generateArcherFacePixels, size: HUMANOID_TEXTURE_SIZE },
  archer_clothing: { path: HUMANOID_TEXTURE_PATHS.archer_clothing, gen: generateArcherClothingPixels, size: HUMANOID_TEXTURE_SIZE },
  archer_bow: { path: HUMANOID_TEXTURE_PATHS.archer_bow, gen: generateArcherBowPixels, size: HUMANOID_TEXTURE_SIZE },

  // Spearman
  spearman_face: { path: HUMANOID_TEXTURE_PATHS.spearman_face, gen: generateSpearmanFacePixels, size: HUMANOID_TEXTURE_SIZE },
  spearman_armor: { path: HUMANOID_TEXTURE_PATHS.spearman_armor, gen: generateSpearmanArmorPixels, size: HUMANOID_TEXTURE_SIZE },
  spearman_gear: { path: HUMANOID_TEXTURE_PATHS.spearman_gear, gen: generateSpearmanGearPixels, size: HUMANOID_TEXTURE_SIZE },

  // Swordsman
  swordsman_helmet: { path: HUMANOID_TEXTURE_PATHS.swordsman_helmet, gen: generateSwordsmanHelmetPixels, size: HUMANOID_TEXTURE_SIZE },
  swordsman_armor: { path: HUMANOID_TEXTURE_PATHS.swordsman_armor, gen: generateSwordsmanArmorPixels, size: HUMANOID_TEXTURE_SIZE },
  swordsman_gear: { path: HUMANOID_TEXTURE_PATHS.swordsman_gear, gen: generateSwordsmanGearPixels, size: HUMANOID_TEXTURE_SIZE },

  // Healer
  healer_gear: { path: HUMANOID_TEXTURE_PATHS.healer_gear, gen: generateHealerGearPixels, size: HUMANOID_TEXTURE_SIZE },

  // Maceman
  maceman_armor: { path: HUMANOID_TEXTURE_PATHS.maceman_armor, gen: generateMacemanArmorPixels, size: HUMANOID_TEXTURE_SIZE },
  maceman_gear: { path: HUMANOID_TEXTURE_PATHS.maceman_gear, gen: generateMacemanGearPixels, size: HUMANOID_TEXTURE_SIZE },

  // Armored Knight
  armored_knight_armor: { path: HUMANOID_TEXTURE_PATHS.armored_knight_armor, gen: generateArmoredKnightArmorPixels, size: HUMANOID_TEXTURE_SIZE },
  armored_knight_gear: { path: HUMANOID_TEXTURE_PATHS.armored_knight_gear, gen: generateArmoredKnightGearPixels, size: HUMANOID_TEXTURE_SIZE },

  // Traits
  icon_armor_penetration: { path: 'traits/icon_armor_penetration.png', gen: generateArmorPenetrationIconPixels, size: 256 },
  icon_cavalry: { path: 'traits/icon_cavalry.png', gen: generateCavalryIconPixels, size: 256 },
  icon_charge: { path: 'traits/icon_charge.png', gen: generateChargeIconPixels, size: 256 },

  // Forest Trees
  tree_bark: { path: TREE_TEXTURE_PATHS.bark, gen: generateTreeBarkPixels, size: TREE_TEXTURE_SIZE },
  tree_foliage: { path: TREE_TEXTURE_PATHS.foliage, gen: generateTreeFoliagePixels, size: TREE_TEXTURE_SIZE },

  // Selected Unit Halo Disc
  selected_unit_halo: { path: SELECTED_HALO_TEXTURE_PATH, gen: generateSelectedHaloPixels, size: SELECTED_HALO_TEXTURE_SIZE },
};

console.log('Generating unit and tree textures (256x256)...');
for (const [name, item] of Object.entries(texturesToGenerate)) {
  const baseDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
  const fullPath = path.resolve(baseDir, '../public', item.path);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const pixels = item.gen();
  const png = encodePng(item.size, item.size, pixels);
  fs.writeFileSync(fullPath, png);
  console.log(`- ${name}: wrote ${fullPath} (${png.length} bytes, ${item.size}x${item.size})`);
}
console.log('All textures generated successfully!');
