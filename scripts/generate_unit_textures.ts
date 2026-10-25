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

      // 1. Dark Vignette Background
      const vig = Math.min(1.0, dist / 140);
      let bgR = 14 * (1 - vig * 0.7);
      let bgG = 16 * (1 - vig * 0.7);
      let bgB = 26 * (1 - vig * 0.7);

      // Subtle radial backdrop glow behind impact center
      const centerGlow = Math.max(0, 1 - dist / 90);
      bgR += centerGlow * 45;
      bgG += centerGlow * 20;
      bgB += centerGlow * 10;

      // 2. Circular Outer Bronze/Gold Border Ring (matching traits icon border)
      if (dist >= 118 && dist <= 126) {
        const ringT = 1 - Math.abs(dist - 122) / 4;
        bgR = 180 * ringT + 30;
        bgG = 145 * ringT + 20;
        bgB = 65 * ringT + 10;
      } else if (dist > 126) {
        bgR *= 0.3;
        bgG *= 0.3;
        bgB *= 0.3;
      }

      let r = bgR;
      let g = bgG;
      let b = bgB;

      // 3. Shield Shape (Heater shield)
      const sx = dx * 0.95 + dy * 0.15;
      const sy = -dx * 0.15 + dy * 0.95;

      const inShieldTop = sy >= -65 && sy <= -15 && Math.abs(sx) <= 55;
      const inShieldBottom = sy > -15 && sy <= 65 && Math.abs(sx) <= 55 * (1 - (sy + 15) / 85);
      const inShield = inShieldTop || inShieldBottom;

      if (inShield) {
        const distToBorder = Math.min(
          Math.abs(sx - 55),
          Math.abs(sx + 55),
          Math.abs(sy + 65),
          Math.abs(sy - 65)
        );
        const isShieldRim = distToBorder < 6 || (sy > -15 && Math.abs(sx) > 55 * (1 - (sy + 15) / 85) - 6);

        const ironLum = 120 + ((x * 13 + y * 29) % 17) - 8;
        if (isShieldRim) {
          r = 160 + (isShieldRim ? 20 : 0);
          g = 135;
          b = 75;
        } else {
          r = ironLum;
          g = ironLum + 2;
          b = ironLum + 8;
        }

        // 4. Jagged fracture crack splitting the shield
        const crackX = Math.sin(sy * 0.12) * 8 + Math.cos(sy * 0.25) * 4;
        const crackDist = Math.abs(sx - crackX);
        if (crackDist < 3.5) {
          r = 15;
          g = 12;
          b = 18;
        } else if (crackDist < 7) {
          r = Math.min(255, r + 70);
          g = Math.min(255, g + 60);
          b = Math.min(255, b + 40);
        }

        // Secondary diagonal stress fractures
        const branch1 = Math.abs((sx - crackX) - (sy + 10) * 0.5);
        const branch2 = Math.abs((sx - crackX) + (sy - 20) * 0.6);
        if ((branch1 < 2 && sy > -30 && sy < 10) || (branch2 < 2 && sy > 0 && sy < 45)) {
          r = 15;
          g = 12;
          b = 18;
        }
      }

      // 5. Heavy Spiked Flanged Mace striking through the center
      const mx = dx - 10;
      const my = dy + 10;
      const maceDist = Math.hypot(mx, my);

      const haftProj = (mx * 0.707 + my * 0.707);
      const haftPerp = Math.abs(-mx * 0.707 + my * 0.707);
      if (haftProj > 15 && haftProj < 95 && haftPerp < 5.5) {
        const spiral = Math.sin(haftProj * 0.5) > 0 ? 30 : -20;
        r = 95 + spiral;
        g = 65 + spiral * 0.8;
        b = 40 + spiral * 0.6;
      }

      if (maceDist < 32) {
        const flangeAngle = Math.atan2(my, mx);
        const flangeRay = Math.abs(Math.sin(flangeAngle * 3));
        const isFlange = flangeRay > 0.82 && maceDist < 30;
        const isCore = maceDist < 16;

        if (isFlange || isCore) {
          const flangeLum = 185 + (isFlange ? 45 : 0) - maceDist * 1.5;
          r = Math.max(0, Math.min(255, flangeLum + 10));
          g = Math.max(0, Math.min(255, flangeLum + 12));
          b = Math.max(0, Math.min(255, flangeLum + 20));

          if (maceDist < 7) {
            r = 255;
            g = 245;
            b = 210;
          }
        }
      }

      // 6. Impact sparks & flying molten metal shards
      const sparkDist = Math.hypot(mx, my);
      if (sparkDist > 18 && sparkDist < 75) {
        const sparkAng = Math.atan2(my, mx);
        const sparkSeed = Math.sin(sparkAng * 12 + sparkDist * 0.8);
        if (sparkSeed > 0.94) {
          r = 255;
          g = 210;
          b = 80;
        } else if (sparkSeed > 0.90) {
          r = 255;
          g = 130;
          b = 30;
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

      // Dark navy/slate noble circular vignette
      const vig = Math.min(1.0, dist / 140);
      let bgR = 18 * (1 - vig * 0.7);
      let bgG = 24 * (1 - vig * 0.7);
      let bgB = 38 * (1 - vig * 0.7);

      // Subtle cyan/blue radial backlight
      const centerGlow = Math.max(0, 1 - dist / 85);
      bgR += centerGlow * 15;
      bgG += centerGlow * 35;
      bgB += centerGlow * 55;

      // Outer Bronze/Gold border ring
      if (dist >= 118 && dist <= 126) {
        const ringT = 1 - Math.abs(dist - 122) / 4;
        bgR = 195 * ringT + 30;
        bgG = 160 * ringT + 20;
        bgB = 75 * ringT + 10;
      } else if (dist > 126) {
        bgR *= 0.3;
        bgG *= 0.3;
        bgB *= 0.3;
      }

      let r = bgR;
      let g = bgG;
      let b = bgB;

      // Stylized Warhorse Head & Neck Profile facing right
      // Neck: (-55..20, -10..75)
      const inNeck = dx >= -50 && dx <= 30 && dy >= -10 && dy <= 70 && (dx + dy * 0.6 >= -35) && (dx + dy * 0.8 <= 55);
      // Horse Head / Muzzle: (-25..55, -60..0)
      const inHead = dx >= -30 && dx <= 50 && dy >= -58 && dy <= -5 && (dy - dx * 0.8 <= 20) && (dx - dy * 0.6 <= 55);
      // Horse Ear: (-10..10, -82..-56)
      const inEar = dx >= -8 && dx <= 12 && dy >= -82 && dy <= -54 && Math.abs(dx - 2) < (dy + 82) * 0.45;
      // Arched Mane: (-58..-20, -50..60)
      const inMane = dx >= -58 && dx <= -18 && dy >= -50 && dy <= 60 && Math.sin(dy * 0.3) > -0.2;

      if (inNeck || inHead || inEar || inMane) {
        // Warhorse coat & chanfron steel plate
        const isChanfron = inHead && (dx >= -10 && dx <= 42 && dy >= -54 && dy <= -12);
        const isChanfronSpike = inHead && Math.abs(dx - 18) < 3.5 && dy >= -75 && dy <= -50;
        const isManeStripe = inMane && !inNeck;

        if (isChanfronSpike) {
          r = 245;
          g = 210;
          b = 85;
        } else if (isChanfron) {
          const chanLum = 180 + dx * 0.8 - dy * 0.5;
          r = Math.min(255, chanLum + 10);
          g = Math.min(255, chanLum + 12);
          b = Math.min(255, chanLum + 22);
          // Golden brow rim
          if (dy >= -54 && dy <= -48) {
            r = 220;
            g = 180;
            b = 75;
          }
        } else if (isManeStripe) {
          r = 30;
          g = 32;
          b = 40;
        } else {
          // Dark bay/chestnut warhorse body
          const coatLum = 110 + dx * 0.6 - dy * 0.4;
          r = Math.min(255, coatLum + 20);
          g = Math.min(255, coatLum * 0.75);
          b = Math.min(255, coatLum * 0.55);
        }
      }

      // Embossed Horseshoe Emblem below horse head (dy = 45..90, |dx| <= 40)
      const hsDist = Math.hypot(dx, dy - 66);
      if (hsDist >= 18 && hsDist <= 28 && (dy >= 52 || Math.abs(dx) > 8)) {
        const hsT = 1 - Math.abs(hsDist - 23) / 5;
        r = Math.max(r, 210 * hsT);
        g = Math.max(g, 175 * hsT);
        b = Math.max(b, 80 * hsT);
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

      // Dark crimson/charcoal speed vignette
      const vig = Math.min(1.0, dist / 140);
      let bgR = 32 * (1 - vig * 0.6);
      let bgG = 14 * (1 - vig * 0.6);
      let bgB = 14 * (1 - vig * 0.6);

      // Forward motion streak glow along diagonal (-45 degrees)
      const proj = (dx * 0.707 - dy * 0.707);
      const perp = Math.abs(dx * 0.707 + dy * 0.707);
      const streak = Math.max(0, 1 - perp / 50) * Math.max(0, (proj + 80) / 160);
      bgR += streak * 75;
      bgG += streak * 30;
      bgB += streak * 10;

      // Outer Bronze/Gold border ring
      if (dist >= 118 && dist <= 126) {
        const ringT = 1 - Math.abs(dist - 122) / 4;
        bgR = 210 * ringT + 30;
        bgG = 150 * ringT + 20;
        bgB = 60 * ringT + 10;
      } else if (dist > 126) {
        bgR *= 0.3;
        bgG *= 0.3;
        bgB *= 0.3;
      }

      let r = bgR;
      let g = bgG;
      let b = bgB;

      // Horizontal speed motion lines behind charge
      if (perp > 12 && perp < 65 && proj < 20) {
        const lineY = Math.sin(perp * 0.8 + proj * 0.05);
        if (lineY > 0.88 && Math.random) {
          const lineAlpha = (1 - perp / 65) * 160;
          r = Math.min(255, r + lineAlpha);
          g = Math.min(255, g + lineAlpha * 0.75);
          b = Math.min(255, b + lineAlpha * 0.3);
        }
      }

      // Charging Lance / Spear shaft & head angled along diagonal
      // Shaft: proj between -85 and 45, perp < 5
      if (proj >= -85 && proj <= 45 && perp <= 5) {
        const shaftLum = 120 + ((x * 7 + y * 13) % 20);
        r = 140 + shaftLum * 0.3;
        g = 95 + shaftLum * 0.2;
        b = 55 + shaftLum * 0.1;
      }

      // Lance Vamplate / Hand guard: proj between -20 and -10, perp <= 26
      if (proj >= -20 && proj <= -10 && perp <= 26) {
        const isSteel = perp < 20;
        if (isSteel) {
          r = 190;
          g = 190;
          b = 205;
        } else {
          r = 220;
          g = 175;
          b = 75;
        }
      }

      // Steel Lance Head / Spear Point: proj between 45 and 92, perp <= (92 - proj) * 0.32
      if (proj > 45 && proj <= 92 && perp <= (92 - proj) * 0.32) {
        const bladeLum = 200 + (perp < 2 ? 45 : 0);
        r = bladeLum;
        g = bladeLum + 2;
        b = bladeLum + 12;
      }

      // Impact shockwave / sparks burst at tip (proj > 82, perp < 38)
      const tipDist = Math.hypot(proj - 92, perp);
      if (tipDist < 35) {
        const burstAngle = Math.atan2(perp, proj - 92);
        const ray = Math.abs(Math.sin(burstAngle * 6));
        if (ray > 0.75 || tipDist < 10) {
          const sparkLum = (1 - tipDist / 35) * 255;
          r = Math.min(255, r + sparkLum);
          g = Math.min(255, g + sparkLum * 0.85);
          b = Math.min(255, b + sparkLum * 0.4);
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
