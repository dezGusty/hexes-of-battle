import * as THREE from 'three';
import { getTeamColorHex } from '../units/unit-mesh-builder';

export interface RetreatFlagUserData {
  isRetreatFlagCloth: boolean;
  originalPositions: Float32Array;
  length: number;
  height: number;
  phaseOffset: number;
}

/**
 * Generates an authentic medieval heraldic war standard canvas texture
 * featuring the player's team color, ornamental border, and faction heraldry.
 */
export function createHeraldicStandardCanvas(
  armyIndex: number,
  width = 512,
  height = 320
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
  const borderWidth = Math.round(width * 0.05);
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
    [borderWidth + 10, borderWidth + 10],
    [width - borderWidth - 10, borderWidth + 10],
    [borderWidth + 10, height - borderWidth - 10],
    [width - borderWidth - 10, height - borderWidth - 10],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Heraldic Shield
  const midX = width * 0.48;
  const midY = height * 0.50;
  const shieldW = width * 0.30;
  const shieldH = height * 0.52;

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
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f5d76e';
  ctx.stroke();

  // Heraldic Insignia
  ctx.fillStyle = '#ffdf78';
  if (armyIndex === 0) {
    // Royal Lion / Crown motif for Army 0
    ctx.fillRect(midX - shieldW * 0.28, midY + 8, shieldW * 0.56, 12);
    ctx.beginPath();
    ctx.moveTo(midX - shieldW * 0.28, midY + 8);
    ctx.lineTo(midX - shieldW * 0.28, midY - 26);
    ctx.lineTo(midX - shieldW * 0.14, midY - 6);
    ctx.lineTo(midX, midY - 34);
    ctx.lineTo(midX + shieldW * 0.14, midY - 6);
    ctx.lineTo(midX + shieldW * 0.28, midY - 26);
    ctx.lineTo(midX + shieldW * 0.28, midY + 8);
    ctx.closePath();
    ctx.fill();

    // Crown jewels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, midY - 34, 4, 0, Math.PI * 2);
    ctx.arc(midX - shieldW * 0.28, midY - 26, 3.5, 0, Math.PI * 2);
    ctx.arc(midX + shieldW * 0.28, midY - 26, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Imperial Eagle / Knight Cross motif for Army 1
    const crossSize = shieldW * 0.44;
    ctx.beginPath();
    ctx.moveTo(midX - 10, midY - 8);
    ctx.lineTo(midX - crossSize * 0.5, midY - crossSize * 0.7);
    ctx.lineTo(midX + crossSize * 0.5, midY - crossSize * 0.7);
    ctx.lineTo(midX + 10, midY - 8);

    ctx.lineTo(midX + crossSize * 0.7, midY - crossSize * 0.5);
    ctx.lineTo(midX + crossSize * 0.7, midY + crossSize * 0.5);
    ctx.lineTo(midX + 10, midY + 8);

    ctx.lineTo(midX + crossSize * 0.5, midY + crossSize * 0.7);
    ctx.lineTo(midX - crossSize * 0.5, midY + crossSize * 0.7);
    ctx.lineTo(midX - 10, midY + 8);

    ctx.lineTo(midX - crossSize * 0.7, midY + crossSize * 0.5);
    ctx.lineTo(midX - crossSize * 0.7, midY - crossSize * 0.5);
    ctx.closePath();
    ctx.fill();

    // Center star diamond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(midX, midY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Trailing fly fringe tassels along the outer fly edge
  ctx.fillStyle = '#e6c24a';
  for (let y = borderWidth; y < height - borderWidth; y += 14) {
    ctx.fillRect(width - borderWidth, y, borderWidth, 8);
  }

  return canvas;
}

/**
 * Builds a tall 3D war standard flag for a player's retreat point.
 * Flagpole is 2.2m tall so it rises prominently above humanoid squads (1.2m).
 * Flag cloth is a subdivided plane anchored to the pole on the hoist side
 * and animated by a mild wind shader / vertex displacement.
 */
export function createRetreatFlagMesh(
  armyIndex: number,
  hexX: number,
  hexY: number
): THREE.Group {
  const flagGroup = new THREE.Group();
  flagGroup.name = `RetreatFlag_Army${armyIndex}_${hexX}_${hexY}`;
  flagGroup.userData = {
    isRetreatFlag: true,
    armyIndex,
    hexX,
    hexY,
  };

  // 1. Pole: slender wooden/dark-iron cylinder (scaled to 40%: height 0.88m, radius ~0.009m)
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

  // 2. Iron base bracket / ground mounting ring (scaled to 40%)
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

  // 3. Burnished golden spear finial at top (scaled to 40%)
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

  // 4. Long Cloth Banner (Flag) (scaled to 40% of original 1.10x0.72 -> 0.44x0.288)
  const flagLength = 0.44;
  const flagHeight = 0.288;
  const widthSegments = 18;
  const heightSegments = 8;
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

  const canvas = createHeraldicStandardCanvas(armyIndex, 512, 320);
  if (canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    clothMat.map = texture;
  } else {
    clothMat.color.setHex(teamColor);
  }

  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.name = 'Cloth';
  clothMesh.position.set(0, 0.68, 0);
  // Rotate around Y by +45 deg (+PI/4) so the cloth streams from South-West towards North-East
  // relative to the player's initial default perspective (+Z is South, -Z is North, -X is West, +X is East)
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
  };

  flagGroup.add(clothMesh);
  return flagGroup;
}

/**
 * Animates the cloth vertices as though a mild, natural wind is blowing from South-West to North-East.
 * The edge attached to the pole ($x = 0$) remains firmly pinned, while waves travel
 * down the length of the fabric toward the free fly edge.
 */
export function updateRetreatFlagWind(clothMesh: THREE.Mesh, timeSec: number): void {
  const geo = clothMesh.geometry as THREE.BufferGeometry;
  if (!geo || !clothMesh.userData?.originalPositions) return;

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  if (!posAttr) return;

  const orig = clothMesh.userData.originalPositions as Float32Array;
  const length = clothMesh.userData.length || 0.44;
  const phase = clothMesh.userData.phaseOffset || 0;

  for (let i = 0; i < posAttr.count; i++) {
    const i3 = i * 3;
    const ox = orig[i3];
    const oy = orig[i3 + 1];

    // Local x goes from 0 (at the pole) to length (at the tip)
    const u = Math.max(0, Math.min(1, ox / length));
    // Anchored at pole (u=0), maximum wave at tip (u=1)
    const weight = Math.pow(u, 1.25);

    // Mild wind scaled to 40% size: primary waving billow + secondary ripple harmonic
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
