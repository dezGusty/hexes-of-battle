import * as THREE from 'three';
import { getTeamColorHex } from '../units/unit-mesh-builder';

export interface RetreatFlagUserData {
  isRetreatFlagCloth: boolean;
  originalPositions: Float32Array;
  length: number;
  height: number;
  phaseOffset: number;
  windDirection?: THREE.Vector3;
  bannerName?: string;
}

/**
 * Coordinate mapping of all 16 banner frames in public/bannersspritesheet.json
 * Meta image is public/banners.png (264 x 264 pixels).
 * Each banner frame is 64 x 64 pixels arranged on a 4x4 grid.
 */
export const BANNER_FRAMES: Record<string, { x: number; y: number; w: number; h: number }> = {
  'banner1.png': { x: 1, y: 1, w: 64, h: 64 },
  'banner2.png': { x: 67, y: 1, w: 64, h: 64 },
  'banner3.png': { x: 133, y: 1, w: 64, h: 64 },
  'banner4.png': { x: 199, y: 1, w: 64, h: 64 },
  'banner5.png': { x: 1, y: 67, w: 64, h: 64 },
  'banner6.png': { x: 67, y: 67, w: 64, h: 64 },
  'banner7.png': { x: 133, y: 67, w: 64, h: 64 },
  'banner8.png': { x: 199, y: 67, w: 64, h: 64 },
  'banner9.png': { x: 1, y: 133, w: 64, h: 64 },
  'banner10.png': { x: 67, y: 133, w: 64, h: 64 },
  'banner11.png': { x: 133, y: 133, w: 64, h: 64 },
  'banner12.png': { x: 199, y: 133, w: 64, h: 64 },
  'banner13.png': { x: 1, y: 199, w: 64, h: 64 },
  'banner14.png': { x: 67, y: 199, w: 64, h: 64 },
  'banner15.png': { x: 133, y: 199, w: 64, h: 64 },
  'banner16.png': { x: 199, y: 199, w: 64, h: 64 },
};

export const BANNERS_ATLAS_SIZE = { w: 264, h: 264 };

export const DEFAULT_PLAYER_BANNERS = {
  player1: 'banner1.png',
  player2: 'banner2.png',
};

let currentPlayerBanners: { player1: string; player2: string; [key: string]: string } = {
  ...DEFAULT_PLAYER_BANNERS,
};

let sharedBannersTexture: THREE.Texture | null = null;

/**
 * Configures army banners from combat_config.json or runtime objects.
 * Supports:
 * - player1Banner: "banner1.png"
 * - player2Banner: "banner2.png"
 * - playerBanners: { player1: "...", player2: "...", "0": "...", "1": "..." }
 */
export function configurePlayerBanners(config?: any): void {
  if (!config || typeof config !== 'object') return;

  const p1 =
    config.player1Banner ??
    config.player_1_banner ??
    config.p1Banner ??
    config.playerBanners?.player1 ??
    config.playerBanners?.['0'] ??
    config.playerBanners?.p1;

  const p2 =
    config.player2Banner ??
    config.player_2_banner ??
    config.p2Banner ??
    config.playerBanners?.player2 ??
    config.playerBanners?.['1'] ??
    config.playerBanners?.p2;

  if (p1 !== undefined && typeof p1 === 'string' && p1.length > 0) {
    currentPlayerBanners.player1 = p1;
  }
  if (p2 !== undefined && typeof p2 === 'string' && p2.length > 0) {
    currentPlayerBanners.player2 = p2;
  }

  if (config.playerBanners && typeof config.playerBanners === 'object') {
    for (const [key, val] of Object.entries(config.playerBanners)) {
      if (typeof val === 'string' && val.length > 0) {
        currentPlayerBanners[key] = val;
      }
    }
  }
}

export function resetPlayerBannersToDefault(): void {
  currentPlayerBanners = { ...DEFAULT_PLAYER_BANNERS };
}

export function getPlayerBanner(armyIndex: number, config?: any): string {
  if (config) {
    if (armyIndex === 0) {
      const b =
        config.player1Banner ??
        config.player_1_banner ??
        config.p1Banner ??
        config.playerBanners?.player1 ??
        config.playerBanners?.['0'] ??
        config.playerBanners?.p1;
      if (b) return b;
    } else if (armyIndex === 1) {
      const b =
        config.player2Banner ??
        config.player_2_banner ??
        config.p2Banner ??
        config.playerBanners?.player2 ??
        config.playerBanners?.['1'] ??
        config.playerBanners?.p2;
      if (b) return b;
    } else if (config.playerBanners?.[armyIndex]) {
      return config.playerBanners[armyIndex];
    }
  }

  if (armyIndex === 0) return currentPlayerBanners.player1 ?? 'banner1.png';
  if (armyIndex === 1) return currentPlayerBanners.player2 ?? 'banner2.png';
  return currentPlayerBanners[armyIndex] ?? `banner${(armyIndex % 16) + 1}.png`;
}

function tryLoadInitialPlayerBannersFromDisk(): void {
  try {
    const proc = (globalThis as any).process;
    if (proc?.versions?.node) {
      const req = (globalThis as any).require;
      if (typeof req === 'function') {
        const fs = req('fs');
        const path = req('path');
        const p = path.resolve(proc.cwd(), 'public/combat_config.json');
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
          if (raw.player1Banner || raw.player2Banner || raw.playerBanners) {
            configurePlayerBanners(raw);
          }
        }
      }
    }
  } catch {
    // Ignore in browser or when bundler treeshakes
  }
}
tryLoadInitialPlayerBannersFromDisk();

export function setSharedBannersTexture(texture: THREE.Texture | null): void {
  sharedBannersTexture = texture;
}

export function getSharedBannersTexture(): THREE.Texture | null {
  return sharedBannersTexture;
}

/**
 * Creates a sub-texture cropped to the specified banner frame within the 264x264 atlas.
 */
export function createBannerSubTexture(atlasTexture: THREE.Texture, bannerName: string): THREE.Texture {
  const frame = BANNER_FRAMES[bannerName] || BANNER_FRAMES['banner1.png'];
  const tex = atlasTexture.clone();
  tex.colorSpace = THREE.SRGBColorSpace;
  // Three.js UV: (0,0) is bottom-left, (1,1) is top-right
  const rx = frame.w / BANNERS_ATLAS_SIZE.w;
  const ry = frame.h / BANNERS_ATLAS_SIZE.h;
  const ox = frame.x / BANNERS_ATLAS_SIZE.w;
  const oy = (BANNERS_ATLAS_SIZE.h - frame.y - frame.h) / BANNERS_ATLAS_SIZE.h;
  tex.repeat.set(rx, ry);
  tex.offset.set(ox, oy);
  tex.needsUpdate = true;
  tex.name = bannerName;
  return tex;
}

/**
 * Generates an authentic medieval heraldic war standard canvas texture.
 * Defaults to a square canvas (256x256) matching the square flag cloth.
 */
export function createHeraldicStandardCanvas(
  armyIndex: number,
  width = 256,
  height = 256,
  bannerName?: string
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const hexColor = getTeamColorHex(armyIndex, false);
  const r = (hexColor >> 16) & 0xff;
  const g = (hexColor >> 8) & 0xff;
  const b = hexColor & 0xff;

  // Background with subtle woven fabric gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, `rgb(${Math.min(255, r + 25)}, ${Math.min(255, g + 25)}, ${Math.min(255, b + 25)})`);
  bgGrad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  bgGrad.addColorStop(1, `rgb(${Math.max(0, r - 35)}, ${Math.max(0, g - 35)}, ${Math.max(0, b - 35)})`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer burnished gold border & fringe
  const borderWidth = Math.max(3, Math.round(width * 0.05));
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = '#d4af37';
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);

  // Inner decorative gold pinstripe
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 235, 140, 0.7)';
  ctx.strokeRect(borderWidth + 4, borderWidth + 4, width - 2 * (borderWidth + 4), height - 2 * (borderWidth + 4));

  // Corner ornamental studs
  ctx.fillStyle = '#f0d060';
  for (const [cx, cy] of [
    [borderWidth + 8, borderWidth + 8],
    [width - borderWidth - 8, borderWidth + 8],
    [borderWidth + 8, height - borderWidth - 8],
    [width - borderWidth - 8, height - borderWidth - 8],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Heraldic Shield / Insignia
  const midX = width * 0.5;
  const midY = height * 0.5;
  const shieldW = width * 0.5;
  const shieldH = height * 0.56;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(midX - shieldW / 2, midY - shieldH / 2);
  ctx.lineTo(midX + shieldW / 2, midY - shieldH / 2);
  ctx.lineTo(midX + shieldW / 2, midY + shieldH * 0.15);
  ctx.bezierCurveTo(
    midX + shieldW / 2, midY + shieldH / 2,
    midX, midY + shieldH * 0.58,
    midX, midY + shieldH * 0.62
  );
  ctx.bezierCurveTo(
    midX, midY + shieldH * 0.58,
    midX - shieldW / 2, midY + shieldH / 2,
    midX - shieldW / 2, midY + shieldH * 0.15
  );
  ctx.closePath();

  // Dark contrasting field
  ctx.fillStyle = armyIndex === 0 ? '#1b2a4a' : '#4a1b1b';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f5d76e';
  ctx.stroke();

  // Heraldic Insignia based on banner or army
  ctx.fillStyle = '#ffdf78';
  const bannerNum = bannerName ? parseInt(bannerName.replace(/\D/g, ''), 10) : armyIndex + 1;
  const isOddBanner = isNaN(bannerNum) ? armyIndex === 0 : bannerNum % 2 !== 0;

  if (isOddBanner) {
    // Royal Crown motif
    ctx.fillRect(midX - shieldW * 0.28, midY + 4, shieldW * 0.56, 8);
    ctx.beginPath();
    ctx.moveTo(midX - shieldW * 0.28, midY + 4);
    ctx.lineTo(midX - shieldW * 0.28, midY - 20);
    ctx.lineTo(midX - shieldW * 0.14, midY - 4);
    ctx.lineTo(midX, midY - 26);
    ctx.lineTo(midX + shieldW * 0.14, midY - 4);
    ctx.lineTo(midX + shieldW * 0.28, midY - 20);
    ctx.lineTo(midX + shieldW * 0.28, midY + 4);
    ctx.closePath();
    ctx.fill();

    // Jewels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, midY - 26, 3, 0, Math.PI * 2);
    ctx.arc(midX - shieldW * 0.28, midY - 20, 2.5, 0, Math.PI * 2);
    ctx.arc(midX + shieldW * 0.28, midY - 20, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Knight Cross motif
    const crossSize = shieldW * 0.44;
    ctx.beginPath();
    ctx.moveTo(midX - 6, midY - 6);
    ctx.lineTo(midX - crossSize * 0.5, midY - crossSize * 0.7);
    ctx.lineTo(midX + crossSize * 0.5, midY - crossSize * 0.7);
    ctx.lineTo(midX + 6, midY - 6);

    ctx.lineTo(midX + crossSize * 0.7, midY - crossSize * 0.5);
    ctx.lineTo(midX + crossSize * 0.7, midY + crossSize * 0.5);
    ctx.lineTo(midX + 6, midY + 6);

    ctx.lineTo(midX + crossSize * 0.5, midY + crossSize * 0.7);
    ctx.lineTo(midX - crossSize * 0.5, midY + crossSize * 0.7);
    ctx.lineTo(midX - 6, midY + 6);

    ctx.lineTo(midX - crossSize * 0.7, midY + crossSize * 0.5);
    ctx.lineTo(midX - crossSize * 0.7, midY - crossSize * 0.5);
    ctx.closePath();
    ctx.fill();

    // Center star diamond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, midY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  return canvas;
}

/**
 * Builds a 3D war standard flag for a player's retreat point.
 * Flagpole is slender with mounting ring and golden finial.
 * Flag cloth is a square subdivided plane (width matches height: 0.288m x 0.288m),
 * textured with the player's configured banner ('banner1.png' through 'banner16.png')
 * and animated by a mild wind shader / vertex displacement from South-West to North-East.
 */
export function createRetreatFlagMesh(
  armyIndex: number,
  hexX: number,
  hexY: number,
  bannerName?: string,
  bannerTexture?: THREE.Texture
): THREE.Group {
  const resolvedBannerName = bannerName ?? getPlayerBanner(armyIndex);

  const flagGroup = new THREE.Group();
  flagGroup.name = `RetreatFlag_Army${armyIndex}_${hexX}_${hexY}`;
  flagGroup.userData = {
    isRetreatFlag: true,
    armyIndex,
    hexX,
    hexY,
    bannerName: resolvedBannerName,
  };

  // 1. Pole: slender wooden/dark-iron cylinder (height 0.88m, radius ~0.009m)
  const poleHeight = 0.88;
  const poleRadiusTop = 0.0088;
  const poleRadiusBottom = 0.0104;
  const poleGeo = new THREE.CylinderGeometry(poleRadiusTop, poleRadiusBottom, poleHeight, 12);
  poleGeo.translate(0, poleHeight * 0.5, 0); // Base at y = 0
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x362516,
    roughness: 0.75,
    metalness: 0.15,
  });
  const poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.name = 'Pole';
  poleMesh.castShadow = true;
  poleMesh.receiveShadow = true;
  flagGroup.add(poleMesh);

  // 2. Iron base bracket / ground mounting ring
  const baseHeight = 0.024;
  const baseGeo = new THREE.CylinderGeometry(0.036, 0.052, baseHeight, 12);
  baseGeo.translate(0, baseHeight * 0.5, 0);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x484b50,
    roughness: 0.55,
    metalness: 0.75,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.name = 'BaseMount';
  flagGroup.add(baseMesh);

  // 3. Burnished golden spear finial at top
  const finialHeight = 0.072;
  const finialGeo = new THREE.ConeGeometry(0.0168, finialHeight, 8);
  finialGeo.translate(0, poleHeight + finialHeight * 0.5, 0);
  const finialMat = new THREE.MeshStandardMaterial({
    color: 0xd8b240,
    roughness: 0.35,
    metalness: 0.85,
  });
  const finialMesh = new THREE.Mesh(finialGeo, finialMat);
  finialMesh.name = 'Finial';
  flagGroup.add(finialMesh);

  // 4. Square Cloth Banner (Flag) (width reduced to match height: 0.288 x 0.288)
  const flagHeight = 0.288;
  const flagLength = flagHeight; // Exactly square: width matches height
  const widthSegments = 14;
  const heightSegments = 14;
  const clothGeo = new THREE.PlaneGeometry(flagLength, flagHeight, widthSegments, heightSegments);
  // Shift along X so left edge (hoist) is at x = 0
  clothGeo.translate(flagLength * 0.5, 0, 0);

  // Double-sided fabric material with player's standard
  const teamColor = getTeamColorHex(armyIndex, false);
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  let textureToUse: THREE.Texture | null = bannerTexture ?? null;
  if (!textureToUse && sharedBannersTexture) {
    textureToUse = createBannerSubTexture(sharedBannersTexture, resolvedBannerName);
  }
  if (!textureToUse) {
    const canvas = createHeraldicStandardCanvas(armyIndex, 256, 256, resolvedBannerName);
    if (canvas) {
      textureToUse = new THREE.CanvasTexture(canvas);
      textureToUse.colorSpace = THREE.SRGBColorSpace;
      textureToUse.name = resolvedBannerName;
    }
  }

  if (textureToUse) {
    clothMat.map = textureToUse;
  } else {
    clothMat.color.setHex(teamColor);
  }

  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.name = 'Cloth';
  clothMesh.position.set(0, 0.68, 0);
  // Rotate around Y by +45 deg (+PI/4) so the cloth streams from South-West towards North-East
  clothMesh.rotation.y = Math.PI * 0.25;
  clothMesh.castShadow = true;
  clothMesh.receiveShadow = true;

  // Store original positions for wind wave calculation
  const posAttr = clothGeo.attributes.position;
  const originalPositions = new Float32Array(posAttr.array);
  clothMesh.userData = {
    isRetreatFlagCloth: true,
    originalPositions,
    length: flagLength,
    height: flagHeight,
    phaseOffset: hexX * 0.91 + hexY * 0.73 + armyIndex * 1.5,
    windDirection: new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2), // SW -> NE
    bannerName: resolvedBannerName,
  };

  flagGroup.add(clothMesh);
  return flagGroup;
}

/**
 * Animates the cloth vertices as though a mild, natural wind is blowing from South-West to North-East.
 * The edge attached to the pole (x = 0) remains firmly pinned, while waves travel
 * down the length of the fabric toward the free fly edge.
 */
export function updateRetreatFlagWind(clothMesh: THREE.Mesh, timeSec: number): void {
  const geo = clothMesh.geometry as THREE.BufferGeometry;
  if (!geo || !clothMesh.userData?.originalPositions) return;

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  if (!posAttr) return;

  const orig = clothMesh.userData.originalPositions as Float32Array;
  const length = clothMesh.userData.length || 0.288;
  const phase = clothMesh.userData.phaseOffset || 0;

  for (let i = 0; i < posAttr.count; i++) {
    const i3 = i * 3;
    const ox = orig[i3];
    const oy = orig[i3 + 1];

    // Local x goes from 0 (at the pole) to length (at the tip)
    const u = Math.max(0, Math.min(1, ox / length));
    // Anchored at pole (u=0), maximum wave at tip (u=1)
    const weight = Math.pow(u, 1.25);

    // Mild wind scaled to square size: primary waving billow + secondary ripple harmonic
    const wave1 = Math.sin(10.5 * ox - 3.2 * timeSec + phase) * 0.034;
    const wave2 = Math.sin(20.0 * ox - 5.0 * timeSec + phase * 1.5) * 0.010;
    const waveZ = (wave1 + wave2) * weight;

    // Subtle vertical flutter
    const waveY = -Math.cos(8.0 * ox - 2.8 * timeSec + phase) * 0.009 * weight;

    posAttr.setZ(i, waveZ);
    posAttr.setY(i, oy + waveY);
  }

  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
}
