import * as THREE from 'three';

let cachedLogTex: THREE.DataTexture | null = null;
let cachedShingleTex: THREE.DataTexture | null = null;
let cachedEndGrainTex: THREE.DataTexture | null = null;
let cachedFoundationTex: THREE.DataTexture | null = null;

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * 256x256 procedural warm timber log texture.
 */
export function getLumberMillLogTexture(): THREE.DataTexture {
  if (cachedLogTex) return cachedLogTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = noise2D(u * 10, v * 28);
      const grain = Math.sin((v * 34 + n * 3.0) * Math.PI) * 0.5 + 0.5;
      const speck = (hash2(x, y) - 0.5) * 12;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(40, Math.min(210, 118 + grain * 42 + speck));
      data[idx + 1] = Math.max(28, Math.min(165, 76 + grain * 30 + speck * 0.7));
      data[idx + 2] = Math.max(16, Math.min(115, 42 + grain * 18 + speck * 0.5));
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedLogTex = tex;
  return tex;
}

/**
 * 256x256 procedural medieval overlapping wooden shingle roof texture.
 */
export function getLumberMillShingleTexture(): THREE.DataTexture {
  if (cachedShingleTex) return cachedShingleTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  const rows = 8;
  const cols = 10;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const row = Math.floor(v * rows);
    const rowFrac = (v * rows) - row;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const offset = (row % 2) * 0.5;
      const colFrac = ((u * cols + offset) % 1 + 1) % 1;
      const tileId = Math.floor(u * cols + offset) + row * 17;
      const tileVar = (hash2(tileId, row) - 0.5) * 26;
      const seam = rowFrac < 0.09 || colFrac < 0.06 ? 0.58 : 1.0;
      const grain = noise2D(u * 14, v * 36) * 16;

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(24, Math.min(170, (86 + tileVar + grain) * seam));
      data[idx + 1] = Math.max(18, Math.min(130, (60 + tileVar * 0.7 + grain * 0.7) * seam));
      data[idx + 2] = Math.max(14, Math.min(100, (42 + tileVar * 0.5 + grain * 0.5) * seam));
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedShingleTex = tex;
  return tex;
}

/**
 * 128x128 concentric tree-ring end-grain texture for cut logs.
 */
function getEndGrainTexture(): THREE.DataTexture {
  if (cachedEndGrainTex) return cachedEndGrainTex;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const dy = y / size - 0.5;
    for (let x = 0; x < size; x++) {
      const dx = x / size - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const rings = Math.sin(r * 28 + noise2D(x * 0.1, y * 0.1) * 2.0) * 0.5 + 0.5;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(50, Math.min(230, 165 + rings * 38));
      data[idx + 1] = Math.max(40, Math.min(195, 128 + rings * 32));
      data[idx + 2] = Math.max(25, Math.min(145, 82 + rings * 22));
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedEndGrainTex = tex;
  return tex;
}

/**
 * 128x128 cobblestone foundation texture.
 */
function getFoundationStoneTexture(): THREE.DataTexture {
  if (cachedFoundationTex) return cachedFoundationTex;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = noise2D(x * 0.14, y * 0.14);
      const speck = (hash2(x, y) - 0.5) * 20;
      const val = 92 + n * 38 + speck;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(30, Math.min(180, val * 0.96));
      data[idx + 1] = Math.max(30, Math.min(180, val * 0.98));
      data[idx + 2] = Math.max(32, Math.min(185, val * 1.02));
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedFoundationTex = tex;
  return tex;
}

function addRoundedLog(
  parent: THREE.Object3D,
  length: number,
  radius: number,
  x: number,
  y: number,
  z: number,
  rotY: number,
  logMat: THREE.Material,
  endMat: THREE.Material
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 6, 1);
  geo.rotateZ(Math.PI * 0.5);
  const mesh = new THREE.Mesh(geo, [logMat, endMat, endMat]);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSmallWindow(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  rotY: number,
  frameMat: THREE.Material,
  glassMat: THREE.Material
): void {
  const win = new THREE.Group();
  win.name = 'LumberMillWindow';
  win.position.set(x, y, z);
  win.rotation.y = rotY;

  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.056, 0.012), glassMat);
  win.add(pane);

  // Wooden frame + cross mullions
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.01, 0.02), frameMat);
  topBar.position.y = 0.029;
  const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.012, 0.024), frameMat);
  botBar.position.y = -0.029;
  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.058, 0.02), frameMat);
  leftBar.position.x = -0.029;
  const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.058, 0.02), frameMat);
  rightBar.position.x = 0.029;
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.052, 0.016), frameMat);
  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.007, 0.016), frameMat);

  win.add(topBar, botBar, leftBar, rightBar, mullionV, mullionH);
  parent.add(win);
}

/**
 * Builds a high-detail medieval Lumber Mill model:
 * - Stone foundation & medieval cabin with stacked rounded wooden log walls
 * - Small framed windows, recessed wooden door with iron hardware, shingled gabled roof
 * - Side holding area enclosed by a wooden fence with a large open entrance on one side
 *   containing stacked processed logs
 */
export function createOverviewLumberMillModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewResource_lumber_camp';

  const logTex = getLumberMillLogTexture();
  const shingleTex = getLumberMillShingleTexture();
  const endTex = getEndGrainTexture();
  const stoneTex = getFoundationStoneTexture();

  const logMat = new THREE.MeshStandardMaterial({
    map: logTex,
    color: 0xc29368,
    roughness: 0.85,
    metalness: 0.04,
  });

  const processedLogMat = new THREE.MeshStandardMaterial({
    map: logTex,
    color: 0xd9b384,
    roughness: 0.78,
    metalness: 0.03,
  });

  const endGrainMat = new THREE.MeshStandardMaterial({
    map: endTex,
    color: 0xe3c396,
    roughness: 0.8,
    metalness: 0.02,
  });

  const darkTimberMat = new THREE.MeshStandardMaterial({
    map: logTex,
    color: 0x6e472b,
    roughness: 0.88,
    metalness: 0.05,
  });

  const shingleMat = new THREE.MeshStandardMaterial({
    map: shingleTex,
    color: 0x8f664a,
    roughness: 0.9,
    metalness: 0.04,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xa2a7ad,
    roughness: 0.92,
    metalness: 0.05,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x3b4048,
    roughness: 0.45,
    metalness: 0.75,
  });

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0x7a4b12,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.1,
  });

  // 1. Medieval Log Cabin Structure (placed on -X side)
  const cabinGroup = new THREE.Group();
  cabinGroup.name = 'LumberMillCabin';
  cabinGroup.position.set(-0.14, 0, -0.02);
  group.add(cabinGroup);

  const cabinW = 0.28;
  const cabinD = 0.25;
  const logR = 0.024;
  const logCourses = 4;
  const wallBaseY = 0.022;

  // Stone foundation plinth
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(cabinW + 0.03, wallBaseY, cabinD + 0.03),
    stoneMat
  );
  foundation.position.set(0, wallBaseY * 0.5, 0);
  foundation.receiveShadow = true;
  foundation.castShadow = true;
  cabinGroup.add(foundation);

  // Corner vertical timber posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.018, logCourses * logR * 1.85 + 0.02, 5),
        darkTimberMat
      );
      post.position.set(
        sx * (cabinW * 0.5 - 0.006),
        wallBaseY + (logCourses * logR * 1.85) * 0.5,
        sz * (cabinD * 0.5 - 0.006)
      );
      post.castShadow = true;
      cabinGroup.add(post);
    }
  }

  // Stacked horizontal rounded log walls with interlocking protruding ends
  for (let c = 0; c < logCourses; c++) {
    const ly = wallBaseY + logR * 0.9 + c * (logR * 1.8);
    // Front (+Z) and Back (-Z) walls
    addRoundedLog(cabinGroup, cabinW + 0.04, logR, 0, ly, cabinD * 0.5, 0, logMat, endGrainMat);
    addRoundedLog(cabinGroup, cabinW + 0.04, logR, 0, ly, -cabinD * 0.5, 0, logMat, endGrainMat);
    // Left (-X) and Right (+X) walls (staggered half-log height)
    const sideY = ly + logR * 0.45;
    addRoundedLog(
      cabinGroup,
      cabinD + 0.04,
      logR,
      -cabinW * 0.5,
      sideY,
      0,
      Math.PI * 0.5,
      logMat,
      endGrainMat
    );
    addRoundedLog(
      cabinGroup,
      cabinD + 0.04,
      logR,
      cabinW * 0.5,
      sideY,
      0,
      Math.PI * 0.5,
      logMat,
      endGrainMat
    );
  }

  // Gable log courses (front & back triangular peaks)
  const wallTopY = wallBaseY + logCourses * logR * 1.8 + 0.006;
  for (let g = 0; g < 2; g++) {
    const gLen = cabinW * (0.72 - g * 0.3);
    const gy = wallTopY + g * (logR * 1.5);
    addRoundedLog(cabinGroup, gLen, logR * 0.9, 0, gy, cabinD * 0.5, 0, logMat, endGrainMat);
    addRoundedLog(cabinGroup, gLen, logR * 0.9, 0, gy, -cabinD * 0.5, 0, logMat, endGrainMat);
  }

  // Wooden door on front (+Z) wall with frame, planks, iron hinges, and stone step
  const doorGroup = new THREE.Group();
  doorGroup.name = 'LumberMillDoor';
  doorGroup.position.set(-0.04, wallBaseY, cabinD * 0.5 + 0.012);
  cabinGroup.add(doorGroup);

  const doorW = 0.072;
  const doorH = 0.125;
  const doorLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.016),
    darkTimberMat
  );
  doorLeaf.position.set(0, doorH * 0.5, 0);
  doorGroup.add(doorLeaf);

  // Door frame posts + lintel
  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, doorH + 0.01, 0.024),
      darkTimberMat
    );
    jamb.position.set(sx * (doorW * 0.5 + 0.005), doorH * 0.5, 0.002);
    doorGroup.add(jamb);
  }
  const doorLintel = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.032, 0.016, 0.028),
    darkTimberMat
  );
  doorLintel.position.set(0, doorH + 0.006, 0.004);
  doorGroup.add(doorLintel);

  // Iron hinges & handle
  for (const hy of [0.035, 0.095]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.005), ironMat);
    hinge.position.set(-0.016, hy, 0.01);
    doorGroup.add(hinge);
  }
  const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0022, 4, 6), ironMat);
  doorRing.position.set(0.02, 0.058, 0.011);
  doorGroup.add(doorRing);

  const porchStep = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.045), stoneMat);
  porchStep.position.set(0, -0.012, 0.025);
  doorGroup.add(porchStep);

  // Small framed windows (1 on front-right, 1 on left wall, 1 on back wall)
  addSmallWindow(cabinGroup, 0.072, wallBaseY + 0.095, cabinD * 0.5 + 0.015, 0, darkTimberMat, windowGlassMat);
  addSmallWindow(cabinGroup, -cabinW * 0.5 - 0.015, wallBaseY + 0.095, 0, -Math.PI * 0.5, darkTimberMat, windowGlassMat);
  addSmallWindow(cabinGroup, 0, wallBaseY + 0.095, -cabinD * 0.5 - 0.015, Math.PI, darkTimberMat, windowGlassMat);

  // Pitched medieval shingled roof
  const roofPeakY = wallTopY + 0.088;
  const roofSlopeAngle = 0.62;
  const roofPanelW = 0.21;
  const roofLen = cabinD + 0.09;
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(roofPanelW, 0.018, roofLen),
      shingleMat
    );
    panel.position.set(side * 0.082, roofPeakY - 0.048, 0);
    panel.rotation.z = side * -roofSlopeAngle;
    panel.castShadow = true;
    panel.receiveShadow = true;
    cabinGroup.add(panel);
  }
  // Ridge beam
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, roofLen + 0.02, 5),
    darkTimberMat
  );
  ridge.rotation.x = Math.PI * 0.5;
  ridge.position.set(0, roofPeakY + 0.002, 0);
  ridge.castShadow = true;
  cabinGroup.add(ridge);

  // Stone chimney on left roof slope
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.14, 0.048), stoneMat);
  chimney.position.set(-0.075, roofPeakY - 0.01, -0.045);
  chimney.castShadow = true;
  cabinGroup.add(chimney);

  // 2. Side Holding Area with Wooden Fence & Large Open Entrance (+X side)
  const yardGroup = new THREE.Group();
  yardGroup.name = 'LumberMillHoldingArea';
  yardGroup.position.set(0.18, 0, 0.01);
  group.add(yardGroup);

  const yardW = 0.24;
  const yardD = 0.28;

  // Fence posts & rails on Back (-Z), Right (+X), and Left (-X partial),
  // leaving a LARGE OPEN ENTRANCE along the Front (+Z) side!
  const addFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    for (const ry of [0.032, 0.072]) {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, len, 4),
        darkTimberMat
      );
      rail.rotation.x = Math.PI * 0.5;
      rail.rotation.z = -angle;
      rail.position.set((x1 + x2) * 0.5, ry, (z1 + z2) * 0.5);
      rail.castShadow = true;
      yardGroup.add(rail);
    }
  };

  const fenceCorners: Array<[number, number]> = [
    [-yardW * 0.5, yardD * 0.35],
    [-yardW * 0.5, -yardD * 0.5],
    [0, -yardD * 0.5],
    [yardW * 0.5, -yardD * 0.5],
    [yardW * 0.5, 0],
    [yardW * 0.5, yardD * 0.5],
  ];
  for (const [fx, fz] of fenceCorners) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.013, 0.095, 5),
      darkTimberMat
    );
    post.position.set(fx, 0.0475, fz);
    post.castShadow = true;
    yardGroup.add(post);
  }
  for (let i = 0; i < fenceCorners.length - 1; i++) {
    const [x1, z1] = fenceCorners[i];
    const [x2, z2] = fenceCorners[i + 1];
    addFenceSegment(x1, z1, x2, z2);
  }
  // Note: the entire +Z front edge between [-yardW*0.5, +yardD*0.5] and [+yardW*0.5, +yardD*0.5]
  // is left completely open as a wide holding-yard entrance!

  // Skid timbers under the log stack
  for (const sz of [-0.06, 0.05]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.016), darkTimberMat);
    skid.position.set(0.01, 0.006, sz);
    yardGroup.add(skid);
  }

  // Stacked processed logs inside the holding area (3 + 2 + 1 pyramid)
  const procR = 0.02;
  const procLen = 0.175;
  const stackPositions: Array<[number, number]> = [
    [-0.038, 0.032],
    [0.005, 0.032],
    [0.048, 0.032],
    [-0.016, 0.066],
    [0.026, 0.066],
    [0.005, 0.1],
  ];
  for (const [lx, ly] of stackPositions) {
    const log = addRoundedLog(
      yardGroup,
      procLen,
      procR,
      lx,
      ly,
      -0.01,
      Math.PI * 0.5,
      processedLogMat,
      endGrainMat
    );
    log.name = 'ProcessedLog';
  }

  // Chopping stump + axe beside the front-left of the cabin
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.032, 0.055, 6),
    [logMat, endGrainMat, endGrainMat]
  );
  stump.position.set(-0.24, 0.0275, 0.19);
  stump.castShadow = true;
  group.add(stump);

  return group;
}
