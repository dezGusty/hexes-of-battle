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
} from '../src/render3d/units/humanoid-unit-textures';
import {
  TREE_TEXTURE_SIZE,
  TREE_TEXTURE_PATHS,
  generateTreeBarkPixels,
  generateTreeFoliagePixels,
} from '../src/render3d/units/tree-textures';

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

  // Forest Trees
  tree_bark: { path: TREE_TEXTURE_PATHS.bark, gen: generateTreeBarkPixels, size: TREE_TEXTURE_SIZE },
  tree_foliage: { path: TREE_TEXTURE_PATHS.foliage, gen: generateTreeFoliagePixels, size: TREE_TEXTURE_SIZE },
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
