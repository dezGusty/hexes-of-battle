import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface CastleSettlementOptions {
  seed?: number;
  gateEdgeIndex?: number;
  bannerColor?: string | number;
}

interface PreparePartOptions {
  jitter?: number;
  salt?: number;
  aoBaseY?: number;
  aoHeight?: number;
  aoMin?: number;
  tint?: THREE.Color | null;
}

interface TextureSet {
  map: THREE.Texture | null;
  bumpMap: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
}

/**
 * Seeded deterministic PRNG (Mulberry32) so each hex tile can be reproduced identically.
 */
function createRng(seed = 1337): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Quantized 3D spatial hash in [-1, 1] so coincident vertices on box/cylinder seams
 * receive identical displacement and never tear open.
 */
function spatialHash3(x: number, y: number, z: number, salt = 0): number {
  const qx = Math.round(x * 1000);
  const qy = Math.round(y * 1000);
  const qz = Math.round(z * 1000);
  const n = Math.sin(qx * 12.9898 + qy * 78.233 + qz * 37.719 + salt * 19.19) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/**
 * Applies subtle hand-built vertex jitter to a BufferGeometry without breaking seams.
 */
function jitterGeometry(geo: THREE.BufferGeometry, amount = 0.005, salt = 1): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const jx = spatialHash3(x, y, z, salt) * amount;
    const jy = spatialHash3(x, y, z, salt + 7) * amount * 0.6;
    const jz = spatialHash3(x, y, z, salt + 13) * amount;
    pos.setXYZ(i, x + jx, y + jy, z + jz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Prepares a primitive geometry for batching:
 *  1. Converts to non-indexed so all parts share identical attribute layouts.
 *  2. Applies local jitter + world transform matrix.
 *  3. Bakes vertical ambient occlusion into vertex colors (darkest near y = aoBaseY).
 */
function preparePart(
  rawGeo: THREE.BufferGeometry,
  matrix: THREE.Matrix4 | null,
  options: PreparePartOptions = {}
): THREE.BufferGeometry {
  const {
    jitter = 0.004,
    salt = 1,
    aoBaseY = 0,
    aoHeight = 0.16,
    aoMin = 0.42,
    tint = null,
  } = options;

  const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
  rawGeo.dispose();

  if (jitter > 0) {
    jitterGeometry(geo, jitter, salt);
  }
  if (matrix) {
    geo.applyMatrix4(matrix);
  }

  const pos = geo.attributes.position;
  if (!geo.attributes.uv) {
    const uvs = new Float32Array(pos.count * 2);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  const colors = new Float32Array(pos.count * 3);
  const tr = tint ? tint.r : 1;
  const tg = tint ? tint.g : 1;
  const tb = tint ? tint.b : 1;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y - aoBaseY) / Math.max(aoHeight, 0.001), 0, 1);
    const smoothT = t * t * (3 - 2 * t);
    const ao = THREE.MathUtils.lerp(aoMin, 1.0, smoothT);
    colors[i * 3] = ao * tr;
    colors[i * 3 + 1] = ao * tg;
    colors[i * 3 + 2] = ao * tb;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * Merges an array of prepared BufferGeometries into a single shadow-enabled Mesh
 * and disposes the temporary source geometries.
 */
function buildBatchedMesh(
  parts: THREE.BufferGeometry[],
  material: THREE.Material,
  name: string
): THREE.Mesh {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();

  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

function configureTexture(
  canvas: HTMLCanvasElement,
  { srgb = true, repeat = 1 }: { srgb?: boolean; repeat?: number } = {}
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStoneTextures(rng: () => number): TextureSet {
  const size = 256;
  const colPair = makeCanvas(size);
  const bmpPair = makeCanvas(size);
  const rghPair = makeCanvas(size);
  if (!colPair || !bmpPair || !rghPair) return { map: null, bumpMap: null, roughnessMap: null };

  const { canvas: colC, ctx: col } = colPair;
  const { canvas: bmpC, ctx: bmp } = bmpPair;
  const { canvas: rghC, ctx: rgh } = rghPair;

  col.fillStyle = '#262a2e';
  col.fillRect(0, 0, size, size);
  bmp.fillStyle = '#202020';
  bmp.fillRect(0, 0, size, size);
  rgh.fillStyle = '#f0f0f0';
  rgh.fillRect(0, 0, size, size);

  const rows = 8;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    const cols = 4 + Math.floor(rng() * 2);
    const colW = size / cols;
    const offset = (r % 2) * (colW * 0.5);

    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const pad = 2;

      const shade = 78 + Math.floor(rng() * 34);
      const blueBias = 6 + Math.floor(rng() * 10);
      const mossTint = rng() < 0.25 ? 10 : 0;

      col.fillStyle = `rgb(${shade - mossTint}, ${shade + 2}, ${shade + blueBias - mossTint})`;
      col.fillRect(x + pad, y + pad, colW - pad * 2, rowH - pad * 2);

      col.fillStyle = 'rgba(200, 212, 225, 0.14)';
      col.fillRect(x + pad, y + pad, colW - pad * 2, 3);

      const bVal = 155 + Math.floor(rng() * 75);
      bmp.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
      bmp.fillRect(x + pad, y + pad, colW - pad * 2, rowH - pad * 2);

      const rVal = 195 + Math.floor(rng() * 45);
      rgh.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
      rgh.fillRect(x + pad, y + pad, colW - pad * 2, rowH - pad * 2);
    }
  }

  for (let i = 0; i < 650; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const s = 1 + rng() * 3;
    col.fillStyle = rng() < 0.35 ? 'rgba(54, 72, 46, 0.28)' : 'rgba(20, 22, 26, 0.22)';
    col.fillRect(x, y, s, s);
    bmp.fillStyle = 'rgba(70, 70, 70, 0.25)';
    bmp.fillRect(x, y, s, s);
  }

  return {
    map: configureTexture(colC, { srgb: true, repeat: 2 }),
    bumpMap: configureTexture(bmpC, { srgb: false, repeat: 2 }),
    roughnessMap: configureTexture(rghC, { srgb: false, repeat: 2 }),
  };
}

function createRoofTextures(
  rng: () => number,
  baseRGB: [number, number, number],
  accentRGB: [number, number, number]
): TextureSet {
  const size = 256;
  const colPair = makeCanvas(size);
  const bmpPair = makeCanvas(size);
  if (!colPair || !bmpPair) return { map: null, bumpMap: null };

  const { canvas: colC, ctx: col } = colPair;
  const { canvas: bmpC, ctx: bmp } = bmpPair;

  col.fillStyle = `rgb(${baseRGB[0]}, ${baseRGB[1]}, ${baseRGB[2]})`;
  col.fillRect(0, 0, size, size);
  bmp.fillStyle = '#555555';
  bmp.fillRect(0, 0, size, size);

  const rows = 12;
  const rowH = size / rows;
  const cols = 8;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const v = (rng() - 0.5) * 26;
      const src = rng() < 0.22 ? accentRGB : baseRGB;

      const cr = THREE.MathUtils.clamp(Math.round(src[0] + v), 15, 230);
      const cg = THREE.MathUtils.clamp(Math.round(src[1] + v * 0.8), 15, 230);
      const cb = THREE.MathUtils.clamp(Math.round(src[2] + v * 0.8), 15, 230);

      col.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      col.fillRect(x + 1, y + 1, colW - 2, rowH - 3);

      col.fillStyle = 'rgba(18, 12, 12, 0.45)';
      col.fillRect(x, y + rowH - 3, colW, 3);

      const bv = 130 + Math.floor(rng() * 80);
      bmp.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
      bmp.fillRect(x + 1, y + 1, colW - 2, rowH - 3);
    }
  }

  return {
    map: configureTexture(colC, { srgb: true, repeat: 2 }),
    bumpMap: configureTexture(bmpC, { srgb: false, repeat: 2 }),
  };
}

function createTimberPlasterTextures(rng: () => number): TextureSet {
  const size = 256;
  const colPair = makeCanvas(size);
  const bmpPair = makeCanvas(size);
  if (!colPair || !bmpPair) return { map: null, bumpMap: null };

  const { canvas: colC, ctx: col } = colPair;
  const { canvas: bmpC, ctx: bmp } = bmpPair;

  col.fillStyle = '#9a8d77';
  col.fillRect(0, 0, size, size);
  bmp.fillStyle = '#909090';
  bmp.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const s = 2 + rng() * 5;
    col.fillStyle = rng() < 0.5 ? 'rgba(65, 52, 38, 0.14)' : 'rgba(215, 202, 178, 0.12)';
    col.fillRect(x, y, s, s);
  }

  const drawBeam = (x: number, y: number, w: number, h: number) => {
    col.fillStyle = '#33251b';
    col.fillRect(x, y, w, h);
    col.fillStyle = 'rgba(95, 70, 48, 0.3)';
    col.fillRect(x + 2, y + 2, Math.max(1, w - 4), Math.max(1, h - 4));
    bmp.fillStyle = '#e0e0e0';
    bmp.fillRect(x, y, w, h);
  };

  const beam = 18;
  drawBeam(0, 0, size, beam);
  drawBeam(0, size - beam, size, beam);
  drawBeam(0, size * 0.5 - beam * 0.5, size, beam * 0.8);
  drawBeam(0, 0, beam, size);
  drawBeam(size - beam, 0, beam, size);
  drawBeam(size * 0.5 - beam * 0.5, 0, beam * 0.85, size);

  return {
    map: configureTexture(colC, { srgb: true, repeat: 1 }),
    bumpMap: configureTexture(bmpC, { srgb: false, repeat: 1 }),
  };
}

function createGroundTextures(
  rng: () => number,
  gateAngle: number,
  baileyRadius: number
): TextureSet {
  const size = 512;
  const colPair = makeCanvas(size);
  const bmpPair = makeCanvas(size);
  if (!colPair || !bmpPair) return { map: null, bumpMap: null };

  const { canvas: colC, ctx: col } = colPair;
  const { canvas: bmpC, ctx: bmp } = bmpPair;

  col.fillStyle = '#3a422b';
  col.fillRect(0, 0, size, size);
  bmp.fillStyle = '#787878';
  bmp.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.5;

  const yardGrad = col.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.37);
  yardGrad.addColorStop(0, '#3e3126');
  yardGrad.addColorStop(0.75, '#33281f');
  yardGrad.addColorStop(1, 'rgba(51, 40, 31, 0)');
  col.fillStyle = yardGrad;
  col.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const dist = Math.hypot((x - cx) / (size * 0.5), (y - cy) / (size * 0.5));
    const r = 2 + rng() * 6;
    if (dist < baileyRadius * 0.95) {
      col.fillStyle = rng() < 0.35 ? 'rgba(84, 76, 66, 0.25)' : 'rgba(34, 25, 18, 0.28)';
    } else {
      col.fillStyle = rng() < 0.55 ? 'rgba(68, 80, 46, 0.28)' : 'rgba(42, 34, 24, 0.26)';
    }
    col.beginPath();
    col.arc(x, y, r, 0, Math.PI * 2);
    col.fill();

    const bv = 100 + Math.floor(rng() * 70);
    bmp.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.35)`;
    bmp.fillRect(x, y, r, r);
  }

  col.save();
  col.translate(cx, cy);
  col.rotate(gateAngle);

  col.fillStyle = '#4a3a2b';
  col.beginPath();
  col.moveTo(0, -16);
  col.lineTo(size * 0.45, -22);
  col.lineTo(size * 0.45, 22);
  col.lineTo(0, 16);
  col.closePath();
  col.fill();

  col.fillStyle = 'rgba(26, 19, 14, 0.6)';
  col.fillRect(size * 0.08, -11, size * 0.36, 4);
  col.fillRect(size * 0.08, 7, size * 0.36, 4);
  col.restore();

  col.strokeStyle = 'rgba(15, 12, 10, 0.45)';
  col.lineWidth = 18;
  col.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const px = cx + Math.cos(a) * (baileyRadius * size * 0.5);
    const pz = cy + Math.sin(a) * (baileyRadius * size * 0.5);
    if (i === 0) col.moveTo(px, pz);
    else col.lineTo(px, pz);
  }
  col.closePath();
  col.stroke();

  return {
    map: configureTexture(colC, { srgb: true, repeat: 1 }),
    bumpMap: configureTexture(bmpC, { srgb: false, repeat: 1 }),
  };
}

/**
 * Procedurally generates a stylized dark-fantasy castle-protected settlement
 * fitting cleanly inside a pointy-top hexagon of outer radius 1.0 (y = 0 ground plane).
 */
export function createCastleSettlementHex(options: CastleSettlementOptions = {}): THREE.Group {
  const { seed = 1337, gateEdgeIndex = 1, bannerColor = 0x8c2424 } = options;
  const rng = createRng(seed);

  const root = new THREE.Group();
  root.name = 'OverviewSettlement_town';

  const HEX_RADIUS = 1.0;
  const BAILEY_RADIUS = 0.64;
  const gateAngle = (gateEdgeIndex % 6) * (Math.PI / 3);

  const stoneParts: THREE.BufferGeometry[] = [];
  const keepRoofParts: THREE.BufferGeometry[] = [];
  const darkRoofParts: THREE.BufferGeometry[] = [];
  const cottageRoofParts: THREE.BufferGeometry[] = [];
  const timberPlasterParts: THREE.BufferGeometry[] = [];
  const woodParts: THREE.BufferGeometry[] = [];
  const darkRecessParts: THREE.BufferGeometry[] = [];
  const windowGlowParts: THREE.BufferGeometry[] = [];

  const dummy = new THREE.Object3D();
  const compose = (
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1
  ): THREE.Matrix4 => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  };

  // 1. Hex Ground Base
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(a) * (HEX_RADIUS * 0.992);
    const y = Math.sin(a) * (HEX_RADIUS * 0.992);
    if (i === 0) hexShape.moveTo(x, y);
    else hexShape.lineTo(x, y);
  }
  hexShape.closePath();

  const groundGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  groundGeo.rotateX(Math.PI / 2);
  groundGeo.translate(0, 0.002, 0);

  const gPos = groundGeo.attributes.position;
  const gUv = groundGeo.attributes.uv;
  for (let i = 0; i < gPos.count; i++) {
    gUv.setXY(i, gPos.getX(i) * 0.5 + 0.5, gPos.getZ(i) * 0.5 + 0.5);
  }
  gUv.needsUpdate = true;

  const groundTex = createGroundTextures(rng, gateAngle, BAILEY_RADIUS);
  const groundMat = new THREE.MeshStandardMaterial({
    color: groundTex.map ? 0xffffff : 0x3a422b,
    map: groundTex.map,
    bumpMap: groundTex.bumpMap,
    bumpScale: 0.015,
    roughness: 0.95,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.name = 'SettlementGround';
  groundMesh.castShadow = true;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // 2. Outer Bailey Wall & Corner Watchtowers
  const towerPositions: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6 + (rng() - 0.5) * 0.06;
    const r = BAILEY_RADIUS + (rng() - 0.5) * 0.035;
    towerPositions.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }

  for (let i = 0; i < 6; i++) {
    const p = towerPositions[i];
    const tHeight = 0.22 + rng() * 0.045;
    const tRadius = 0.068 + rng() * 0.01;

    stoneParts.push(
      preparePart(
        new THREE.CylinderGeometry(tRadius * 0.86, tRadius, tHeight, 8),
        compose(p.x, tHeight * 0.5, p.y, 0, rng() * Math.PI, 0),
        { jitter: 0.004, salt: 10 + i, aoHeight: 0.14 }
      )
    );

    stoneParts.push(
      preparePart(
        new THREE.CylinderGeometry(tRadius * 0.98, tRadius * 0.88, 0.032, 8),
        compose(p.x, tHeight + 0.014, p.y),
        { jitter: 0.003, salt: 20 + i, aoBaseY: tHeight - 0.02, aoHeight: 0.05, aoMin: 0.7 }
      )
    );

    if (i % 2 === 0) {
      darkRoofParts.push(
        preparePart(
          new THREE.ConeGeometry(tRadius * 1.12, 0.11, 8),
          compose(p.x, tHeight + 0.082, p.y),
          { jitter: 0.004, salt: 30 + i, aoBaseY: tHeight + 0.02, aoHeight: 0.06, aoMin: 0.65 }
        )
      );
    } else {
      for (let m = 0; m < 6; m++) {
        const ma = (m / 6) * Math.PI * 2;
        const mr = tRadius * 0.86;
        stoneParts.push(
          preparePart(
            new THREE.BoxGeometry(0.022, 0.024, 0.018),
            compose(p.x + Math.cos(ma) * mr, tHeight + 0.04, p.y + Math.sin(ma) * mr, 0, -ma, 0),
            {
              jitter: 0.002,
              salt: 40 + i * 6 + m,
              aoBaseY: tHeight + 0.02,
              aoHeight: 0.03,
              aoMin: 0.75,
            }
          )
        );
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    const a = towerPositions[i];
    const b = towerPositions[(i + 1) % 6];
    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.y + b.y) * 0.5;
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len = Math.hypot(dx, dz);
    const rotY = -Math.atan2(dz, dx);

    const isGateEdge = i === gateEdgeIndex % 6;

    if (!isGateEdge) {
      const wallH = 0.155 + rng() * 0.015;
      stoneParts.push(
        preparePart(
          new THREE.BoxGeometry(len * 0.94, wallH, 0.052),
          compose(midX, wallH * 0.5, midZ, 0, rotY, 0),
          { jitter: 0.004, salt: 100 + i, aoHeight: 0.13 }
        )
      );

      const merlonCount = 5;
      const nx = -dz / len;
      const nz = dx / len;
      const sign = nx * midX + nz * midZ >= 0 ? 1 : -1;
      for (let m = 0; m < merlonCount; m++) {
        const t = (m + 0.5) / merlonCount - 0.5;
        const mx = midX + dx * t * 0.78 + nx * sign * 0.016;
        const mz = midZ + dz * t * 0.78 + nz * sign * 0.016;
        stoneParts.push(
          preparePart(
            new THREE.BoxGeometry(0.036, 0.028, 0.02),
            compose(mx, wallH + 0.014, mz, 0, rotY, 0),
            { jitter: 0.002, salt: 120 + i * 5 + m, aoBaseY: wallH, aoHeight: 0.03, aoMin: 0.75 }
          )
        );
      }
    } else {
      // 3. Fortified Gatehouse
      const nx = Math.cos(gateAngle);
      const nz = Math.sin(gateAngle);
      const tx = -nz;
      const tz = nx;

      for (const side of [-1, 1]) {
        const fx = midX + tx * side * (len * 0.31);
        const fz = midZ + tz * side * (len * 0.31);
        stoneParts.push(
          preparePart(
            new THREE.BoxGeometry(len * 0.32, 0.165, 0.054),
            compose(fx, 0.0825, fz, 0, rotY, 0),
            { jitter: 0.004, salt: 160 + side, aoHeight: 0.13 }
          )
        );

        const gx = midX + tx * side * 0.082;
        const gz = midZ + tz * side * 0.082;
        stoneParts.push(
          preparePart(
            new THREE.CylinderGeometry(0.056, 0.066, 0.25, 8),
            compose(gx, 0.125, gz, 0, rotY, 0),
            { jitter: 0.004, salt: 170 + side, aoHeight: 0.15 }
          )
        );
        darkRoofParts.push(
          preparePart(
            new THREE.ConeGeometry(0.068, 0.1, 8),
            compose(gx, 0.3, gz, 0, rotY, 0),
            { jitter: 0.003, salt: 180 + side, aoBaseY: 0.24, aoHeight: 0.06, aoMin: 0.65 }
          )
        );
      }

      stoneParts.push(
        preparePart(
          new THREE.BoxGeometry(0.14, 0.085, 0.082),
          compose(midX, 0.185, midZ, 0, rotY, 0),
          { jitter: 0.003, salt: 190, aoBaseY: 0.13, aoHeight: 0.06, aoMin: 0.65 }
        )
      );
      darkRecessParts.push(
        preparePart(
          new THREE.BoxGeometry(0.078, 0.13, 0.072),
          compose(midX, 0.065, midZ, 0, rotY, 0),
          { jitter: 0.001, salt: 195, aoHeight: 0.12, aoMin: 0.3 }
        )
      );

      for (let s = 1; s <= 4; s++) {
        const dist = 0.07 * s;
        const sx = midX + nx * dist + tx * (rng() - 0.5) * 0.04;
        const sz = midZ + nz * dist + tz * (rng() - 0.5) * 0.04;
        stoneParts.push(
          preparePart(
            new THREE.BoxGeometry(0.038, 0.012, 0.032),
            compose(sx, 0.005, sz, 0, rng() * Math.PI, 0),
            { jitter: 0.002, salt: 200 + s, aoHeight: 0.02, aoMin: 0.65 }
          )
        );
      }
    }
  }

  // 4. Central Keep
  const keepX = -Math.cos(gateAngle) * 0.11 - 0.04;
  const keepZ = -Math.sin(gateAngle) * 0.11 - 0.03;
  const keepRot = gateAngle + 0.22;

  stoneParts.push(
    preparePart(
      new THREE.CylinderGeometry(0.18, 0.21, 0.08, 4),
      compose(keepX, 0.04, keepZ, 0, keepRot + Math.PI * 0.25, 0),
      { jitter: 0.005, salt: 220, aoHeight: 0.08 }
    )
  );
  stoneParts.push(
    preparePart(
      new THREE.BoxGeometry(0.23, 0.28, 0.21),
      compose(keepX, 0.21, keepZ, 0, keepRot, 0),
      { jitter: 0.005, salt: 225, aoBaseY: 0.06, aoHeight: 0.16, aoMin: 0.55 }
    )
  );
  timberPlasterParts.push(
    preparePart(
      new THREE.BoxGeometry(0.26, 0.095, 0.24),
      compose(keepX, 0.39, keepZ, 0, keepRot, 0),
      { jitter: 0.004, salt: 230, aoBaseY: 0.34, aoHeight: 0.06, aoMin: 0.6 }
    )
  );
  keepRoofParts.push(
    preparePart(
      new THREE.ConeGeometry(0.21, 0.22, 4),
      compose(keepX, 0.545, keepZ, 0, keepRot + Math.PI * 0.25, 0),
      { jitter: 0.005, salt: 235, aoBaseY: 0.43, aoHeight: 0.08, aoMin: 0.65 }
    )
  );

  const turretOffX = Math.cos(keepRot + 0.7) * 0.14;
  const turretOffZ = Math.sin(keepRot + 0.7) * 0.14;
  stoneParts.push(
    preparePart(
      new THREE.CylinderGeometry(0.056, 0.068, 0.45, 7),
      compose(keepX + turretOffX, 0.225, keepZ + turretOffZ),
      { jitter: 0.004, salt: 240, aoHeight: 0.16 }
    )
  );
  darkRoofParts.push(
    preparePart(
      new THREE.ConeGeometry(0.072, 0.14, 7),
      compose(keepX + turretOffX, 0.515, keepZ + turretOffZ),
      { jitter: 0.003, salt: 245, aoBaseY: 0.44, aoHeight: 0.06, aoMin: 0.65 }
    )
  );

  for (let f = 0; f < 4; f++) {
    const fa = keepRot + (f * Math.PI) / 2;
    const wx = keepX + Math.cos(fa) * 0.112;
    const wz = keepZ + Math.sin(fa) * 0.112;
    darkRecessParts.push(
      preparePart(
        new THREE.BoxGeometry(0.014, 0.048, 0.014),
        compose(wx, 0.24, wz, 0, -fa, 0),
        { jitter: 0, aoBaseY: 0.2, aoHeight: 0.05, aoMin: 0.5 }
      )
    );
  }

  // 5. Protected Village Cottages
  const cottageSpecs = [
    { angle: gateAngle + 1.35, dist: 0.36, w: 0.125, h: 0.085, d: 0.105, glow: true },
    { angle: gateAngle + 2.35, dist: 0.39, w: 0.115, h: 0.08, d: 0.095, glow: false },
    { angle: gateAngle - 1.3, dist: 0.35, w: 0.13, h: 0.09, d: 0.1, glow: true },
    { angle: gateAngle - 2.25, dist: 0.38, w: 0.11, h: 0.078, d: 0.095, glow: true },
  ];

  cottageSpecs.forEach((c, idx) => {
    const cx = Math.cos(c.angle) * c.dist + (rng() - 0.5) * 0.03;
    const cz = Math.sin(c.angle) * c.dist + (rng() - 0.5) * 0.03;
    const rotY = -c.angle + (rng() - 0.5) * 0.6;

    timberPlasterParts.push(
      preparePart(
        new THREE.BoxGeometry(c.w, c.h, c.d),
        compose(cx, c.h * 0.5, cz, 0, rotY, 0),
        { jitter: 0.003, salt: 300 + idx, aoHeight: 0.08 }
      )
    );

    const roofH = c.h * 1.05;
    cottageRoofParts.push(
      preparePart(
        new THREE.ConeGeometry(Math.max(c.w, c.d) * 0.8, roofH, 4),
        compose(cx, c.h + roofH * 0.45, cz, 0, rotY + Math.PI * 0.25, 0),
        { jitter: 0.004, salt: 320 + idx, aoBaseY: c.h, aoHeight: 0.05, aoMin: 0.65 }
      )
    );

    if (idx % 2 === 0) {
      stoneParts.push(
        preparePart(
          new THREE.BoxGeometry(0.024, 0.06, 0.024),
          compose(
            cx + Math.cos(rotY) * 0.025,
            c.h + roofH * 0.55,
            cz + Math.sin(rotY) * 0.025,
            0,
            rotY,
            0
          ),
          { jitter: 0.002, salt: 340 + idx, aoBaseY: c.h + 0.02, aoHeight: 0.05, aoMin: 0.7 }
        )
      );
    }

    if (c.glow) {
      const winX = cx + Math.sin(rotY) * (c.d * 0.5 + 0.002);
      const winZ = cz + Math.cos(rotY) * (c.d * 0.5 + 0.002);
      windowGlowParts.push(
        preparePart(
          new THREE.BoxGeometry(0.022, 0.024, 0.008),
          compose(winX, c.h * 0.52, winZ, 0, rotY, 0),
          { jitter: 0, aoMin: 1.0 }
        )
      );
    }
  });

  // 6. Defensive Palisade Stakes
  for (let i = 0; i < 6; i++) {
    if (i === gateEdgeIndex % 6) continue;
    const edgeAngle = i * (Math.PI / 3);
    const baseR = 0.68;
    const nx = Math.cos(edgeAngle);
    const nz = Math.sin(edgeAngle);
    const tx = -nz;
    const tz = nx;

    for (let s = -2; s <= 2; s++) {
      const px = nx * (baseR + rng() * 0.04) + tx * s * 0.052;
      const pz = nz * (baseR + rng() * 0.04) + tz * s * 0.052;
      const stakeH = 0.075 + rng() * 0.025;

      const m = new THREE.Matrix4()
        .makeTranslation(px, stakeH * 0.38, pz)
        .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-tz, 0, tx), 0.42));

      woodParts.push(
        preparePart(new THREE.CylinderGeometry(0.002, 0.011, stakeH, 5), m, {
          jitter: 0.001,
          salt: 400 + i * 5 + s,
          aoHeight: 0.06,
        })
      );
    }
  }

  // 7. Materials & Batched Meshes
  const stoneTex = createStoneTextures(rng);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: stoneTex.map ? 0xffffff : 0x626972,
    map: stoneTex.map,
    bumpMap: stoneTex.bumpMap,
    bumpScale: 0.018,
    roughnessMap: stoneTex.roughnessMap ?? null,
    roughness: 0.9,
    metalness: 0.06,
    vertexColors: true,
  });

  const keepRoofTex = createRoofTextures(rng, [118, 50, 42], [92, 38, 34]);
  const keepRoofMat = new THREE.MeshStandardMaterial({
    color: keepRoofTex.map ? 0xffffff : 0x76322a,
    map: keepRoofTex.map,
    bumpMap: keepRoofTex.bumpMap,
    bumpScale: 0.014,
    roughness: 0.82,
    metalness: 0.05,
    vertexColors: true,
  });

  const darkRoofTex = createRoofTextures(rng, [56, 60, 68], [42, 46, 54]);
  const darkRoofMat = new THREE.MeshStandardMaterial({
    color: darkRoofTex.map ? 0xffffff : 0x383c44,
    map: darkRoofTex.map,
    bumpMap: darkRoofTex.bumpMap,
    bumpScale: 0.014,
    roughness: 0.78,
    metalness: 0.14,
    vertexColors: true,
  });

  const cottageRoofTex = createRoofTextures(rng, [132, 74, 48], [98, 60, 38]);
  const cottageRoofMat = new THREE.MeshStandardMaterial({
    color: cottageRoofTex.map ? 0xffffff : 0x844a30,
    map: cottageRoofTex.map,
    bumpMap: cottageRoofTex.bumpMap,
    bumpScale: 0.015,
    roughness: 0.88,
    metalness: 0.03,
    vertexColors: true,
  });

  const plasterTex = createTimberPlasterTextures(rng);
  const plasterMat = new THREE.MeshStandardMaterial({
    color: plasterTex.map ? 0xffffff : 0x9a8d77,
    map: plasterTex.map,
    bumpMap: plasterTex.bumpMap,
    bumpScale: 0.012,
    roughness: 0.88,
    metalness: 0.02,
    vertexColors: true,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4d3826,
    roughness: 0.92,
    metalness: 0.02,
    vertexColors: true,
  });

  const recessMat = new THREE.MeshStandardMaterial({
    color: 0x161414,
    roughness: 0.95,
    metalness: 0.1,
    vertexColors: true,
  });

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffb866,
    emissive: 0xff8c2b,
    emissiveIntensity: 1.35,
    roughness: 0.4,
    vertexColors: true,
  });

  root.add(
    buildBatchedMesh(stoneParts, stoneMat, 'CastleStonework'),
    buildBatchedMesh(keepRoofParts, keepRoofMat, 'KeepRoof'),
    buildBatchedMesh(darkRoofParts, darkRoofMat, 'TurretRoofs'),
    buildBatchedMesh(cottageRoofParts, cottageRoofMat, 'CottageRoofs'),
    buildBatchedMesh(timberPlasterParts, plasterMat, 'TimberAndPlaster'),
    buildBatchedMesh(woodParts, woodMat, 'PalisadeStakes'),
    buildBatchedMesh(darkRecessParts, recessMat, 'ArchwaysAndSlits'),
    buildBatchedMesh(windowGlowParts, windowGlowMat, 'CottageWindowGlow')
  );

  // 8. Fluttering Cloth Banner on the Keep (compatible with overview-board-3d wind system)
  const bannerGroup = new THREE.Group();
  bannerGroup.name = 'KeepBanner';
  bannerGroup.position.set(keepX, 0.62, keepZ);

  const poleHeight = 0.36;
  const flagWidth = 0.28;
  const flagHeight = 0.16;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.012, poleHeight, 6),
    new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 })
  );
  pole.position.y = poleHeight * 0.5;
  pole.castShadow = true;
  pole.receiveShadow = true;

  const clothPivot = new THREE.Group();
  clothPivot.position.set(0, poleHeight - flagHeight * 0.55, 0);
  clothPivot.userData.isOverviewFlagPivot = true;

  const clothGeo = new THREE.PlaneGeometry(flagWidth, flagHeight, 6, 2);
  clothGeo.translate(flagWidth * 0.5, 0, 0);
  const cPos = clothGeo.attributes.position;
  const basePositions = Float32Array.from(cPos.array as Float32Array);

  const colorObj = new THREE.Color(bannerColor);
  const cloth = new THREE.Mesh(
    clothGeo,
    new THREE.MeshStandardMaterial({
      color: colorObj,
      roughness: 0.72,
      side: THREE.DoubleSide,
    })
  );
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  cloth.userData = {
    isOverviewFlagCloth: true,
    isBannerCloth: true,
    flagWidth,
    flagHeight,
    basePositions,
    flagPhase: seed * 0.37,
  };

  clothPivot.add(cloth);
  bannerGroup.add(pole, clothPivot);
  root.add(bannerGroup);

  return root;
}
