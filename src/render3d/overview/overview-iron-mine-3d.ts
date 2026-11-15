import * as THREE from 'three';

let cachedStoneTex: THREE.DataTexture | null = null;
let cachedIronCaveTex: THREE.DataTexture | null = null;
let cachedWoodTex: THREE.DataTexture | null = null;

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3D(x: number, y: number, z: number, octaves: number = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (noise3D(x * freq, y * freq, z * freq) * 2 - 1);
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum;
}

/**
 * 256x256 procedural granite/stone rock texture with strata and cracks.
 */
export function getIronMineStoneTexture(): THREE.DataTexture {
  if (cachedStoneTex) return cachedStoneTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n1 = fbm3D(u * 8, v * 8, 1.3, 3);
      const strata = Math.sin((v * 14 + n1 * 2.2) * Math.PI) * 0.5 + 0.5;
      const crack = Math.abs(fbm3D(u * 16 + 4.1, v * 16 + 2.7, 3.1, 2));
      const crackMask = crack < 0.06 ? 0.55 : 1.0;
      const speck = (hash3(x, y, 9) - 0.5) * 18;

      const base = (104 + n1 * 28 + strata * 20) * crackMask + speck;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(24, Math.min(220, base * 0.96));
      data[idx + 1] = Math.max(24, Math.min(220, base * 0.98));
      data[idx + 2] = Math.max(26, Math.min(225, base * 1.03));
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
  cachedStoneTex = tex;
  return tex;
}

/**
 * 256x256 procedural reddish iron-ore (hematite/rust) texture for inner mine walls.
 */
export function getIronMineInnerOreTexture(): THREE.DataTexture {
  if (cachedIronCaveTex) return cachedIronCaveTex;
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = fbm3D(u * 9, v * 9, 5.7, 3);
      const vein = Math.abs(fbm3D(u * 12 + 2.0, v * 12 + 8.0, 2.2, 2));
      const isIronVein = vein < 0.14;
      const speck = (hash3(x, y, 21) - 0.5) * 16;

      let r: number;
      let g: number;
      let b: number;
      if (isIronVein) {
        // Dark metallic hematite vein with rusty edge
        r = 95 + n * 24 + speck;
        g = 76 + n * 18 + speck;
        b = 78 + n * 18 + speck;
      } else {
        // Rich reddish-rust iron-bearing rock
        r = 148 + n * 40 + speck;
        g = 62 + n * 22 + speck * 0.6;
        b = 44 + n * 16 + speck * 0.5;
      }

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(25, Math.min(230, r));
      data[idx + 1] = Math.max(18, Math.min(180, g));
      data[idx + 2] = Math.max(16, Math.min(170, b));
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
  cachedIronCaveTex = tex;
  return tex;
}

/**
 * 128x128 procedural weathered timber texture for reinforced mine beams & tool handles.
 */
function getTimberWoodTexture(): THREE.DataTexture {
  if (cachedWoodTex) return cachedWoodTex;
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const grain = Math.sin((u * 26 + fbm3D(u * 4, v * 12, 0.5, 2) * 1.8) * Math.PI) * 0.5 + 0.5;
      const speck = (hash3(x, y, 3) - 0.5) * 10;
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(30, Math.min(190, 96 + grain * 34 + speck));
      data[idx + 1] = Math.max(20, Math.min(140, 62 + grain * 24 + speck * 0.7));
      data[idx + 2] = Math.max(12, Math.min(100, 36 + grain * 15 + speck * 0.5));
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
  cachedWoodTex = tex;
  return tex;
}

function createDisplacedBoulderGeometry(
  radius: number,
  detail: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n = fbm3D(vx * 7.5 + seed, vy * 7.5 + seed * 0.7, vz * 7.5 - seed, 3);
    const scale = 1.0 + n * 0.24;
    pos.setXYZ(i, vx * scale, Math.max(-radius * 0.5, vy * scale * 0.85), vz * scale);
  }
  geo.computeVertexNormals();
  return geo;
}

function createPickaxeMesh(
  woodMat: THREE.Material,
  steelMat: THREE.Material
): THREE.Group {
  const pick = new THREE.Group();
  pick.name = 'MinePickaxe';

  // Wooden handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.21, 8, 1),
    woodMat
  );
  handle.position.set(0, 0.105, 0);
  handle.castShadow = true;
  pick.add(handle);

  // Iron socket collar
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.024, 0.026),
    steelMat
  );
  collar.position.set(0, 0.195, 0);
  collar.castShadow = true;
  pick.add(collar);

  // Curved double-pointed pickaxe head (left & right tapered blades)
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.013, 0.085, 6),
      steelMat
    );
    blade.position.set(side * 0.048, 0.192, 0);
    blade.rotation.z = side * -(Math.PI * 0.5 + 0.18);
    blade.castShadow = true;
    pick.add(blade);
  }

  return pick;
}

/**
 * Builds a high-detail Iron Mine model:
 * - Sculpted high-poly rock outcrop with a recessed cave entrance
 * - Reddish iron-ore inner cavern walls visible from the outside
 * - Reinforced timber portal frame + receding inner mine supports + threshold planks
 * - Mining tools (pickaxes), iron-ore boulders, and ore crate around the entrance
 */
export function createOverviewIronMineModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewResource_iron_mine';

  const stoneTex = getIronMineStoneTexture();
  const ironOreTex = getIronMineInnerOreTexture();
  const woodTex = getTimberWoodTexture();

  const outerRockMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xbec3c9,
    roughness: 0.9,
    metalness: 0.06,
  });

  const innerIronWallMat = new THREE.MeshStandardMaterial({
    map: ironOreTex,
    color: 0xd98a73,
    roughness: 0.72,
    metalness: 0.24,
    side: THREE.DoubleSide,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x9b6e49,
    roughness: 0.86,
    metalness: 0.04,
  });

  const ironSteelMat = new THREE.MeshStandardMaterial({
    color: 0x4b525c,
    roughness: 0.42,
    metalness: 0.78,
  });

  // 1. High-poly sculpted outer rock formation with carved cave entrance (~1700 tris)
  const rockGeo = new THREE.SphereGeometry(0.41, 36, 24);
  const pos = rockGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i) * 1.15;
    let vy = pos.getY(i) * 0.94 + 0.14;
    let vz = pos.getZ(i) * 1.06 - 0.04;

    // Ground skirt clamping
    if (vy < 0.0) {
      vy = 0.0;
      vx *= 1.08;
      vz *= 1.08;
    }

    // Craggy rock displacement
    const disp = fbm3D(vx * 5.2 + 2.1, vy * 5.2 + 1.4, vz * 5.2 + 0.8, 3);
    const strata = Math.sin(vy * 22.0 + disp * 2.5) * 0.015;
    vx += vx * disp * 0.24;
    vy += Math.max(-0.04, disp * 0.11 + strata) * Math.min(1, vy * 3.5);
    vz += vz * disp * 0.24;

    // Carve out an arched cave mouth on the +Z front face
    if (vz > -0.05) {
      const archHalfW = 0.155;
      const archMaxH = 0.245;
      const nx = Math.abs(vx) / archHalfW;
      const archCeiling = archMaxH * Math.sqrt(Math.max(0, 1 - nx * nx * 0.88));
      if (nx < 1.18 && vy < archCeiling + 0.04) {
        const horizMask = Math.max(0, 1 - Math.max(0, nx - 0.68) / 0.5);
        const vertMask = Math.max(0, 1 - Math.max(0, vy - (archCeiling - 0.04)) / 0.08);
        const caveMask = horizMask * vertMask;
        // Push vertices deep inward to form a real 3D cave opening
        vz = vz * (1 - caveMask) + -0.18 * caveMask;
      }
    }

    pos.setXYZ(i, vx, Math.max(0, vy), vz);
  }
  rockGeo.computeVertexNormals();

  const outerRock = new THREE.Mesh(rockGeo, outerRockMat);
  outerRock.name = 'IronMineOuterRock';
  outerRock.castShadow = true;
  outerRock.receiveShadow = true;
  group.add(outerRock);

  // 2. Inner reddish iron-veined cavern shell visible through the entrance (~600 tris)
  const caveShellGeo = new THREE.CylinderGeometry(
    0.145,
    0.155,
    0.34,
    20,
    4,
    true,
    -Math.PI * 0.55,
    Math.PI * 1.1
  );
  caveShellGeo.rotateX(Math.PI * 0.5);
  const cPos = caveShellGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < cPos.count; i++) {
    const cx = cPos.getX(i);
    const cy = cPos.getY(i);
    const cz = cPos.getZ(i);
    const bump = fbm3D(cx * 14, cy * 14, cz * 14, 2) * 0.018;
    cPos.setXYZ(i, cx + bump, Math.max(0, cy + 0.06 + bump * 0.6), cz);
  }
  caveShellGeo.computeVertexNormals();

  const innerCaveWall = new THREE.Mesh(caveShellGeo, innerIronWallMat);
  innerCaveWall.name = 'IronMineInnerWall';
  innerCaveWall.position.set(0, 0.02, 0.02);
  innerCaveWall.receiveShadow = true;
  group.add(innerCaveWall);

  // Inner back-wall & exposed reddish iron-ore veins inside the cave
  const backWallGeo = createDisplacedBoulderGeometry(0.15, 2, 11.3);
  const backWall = new THREE.Mesh(backWallGeo, innerIronWallMat);
  backWall.position.set(0, 0.11, -0.11);
  backWall.scale.set(1.1, 1.0, 0.6);
  group.add(backWall);

  const innerVeinL = new THREE.Mesh(
    createDisplacedBoulderGeometry(0.065, 2, 4.7),
    innerIronWallMat
  );
  innerVeinL.position.set(-0.085, 0.075, 0.04);
  const innerVeinR = new THREE.Mesh(
    createDisplacedBoulderGeometry(0.06, 2, 8.2),
    innerIronWallMat
  );
  innerVeinR.position.set(0.082, 0.08, 0.03);
  group.add(innerVeinL, innerVeinR);

  // Subtle reddish mineral floor inside & at the mouth
  const caveFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.016, 16),
    innerIronWallMat
  );
  caveFloor.position.set(0, 0.008, 0.07);
  caveFloor.scale.set(1.0, 1.0, 1.55);
  caveFloor.receiveShadow = true;
  group.add(caveFloor);

  // 3. Reinforced wooden door frame + inner tunnel timber supports
  const frameDepths = [0.22, 0.11, 0.01];
  for (let idx = 0; idx < frameDepths.length; idx++) {
    const fz = frameDepths[idx];
    const scaleW = idx === 0 ? 1.0 : 0.88 - idx * 0.06;
    const postH = idx === 0 ? 0.24 : 0.21 - idx * 0.015;
    const postX = 0.125 * scaleW;

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.022, postH, 8),
        woodMat
      );
      post.position.set(side * postX, postH * 0.5, fz);
      post.rotation.z = side * 0.05;
      post.castShadow = true;
      group.add(post);

      // Angled diagonal knee brace
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.075, 0.018),
        woodMat
      );
      brace.position.set(side * (postX - 0.028), postH - 0.032, fz);
      brace.rotation.z = side * -0.78;
      group.add(brace);
    }

    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(postX * 2 + 0.08, 0.034, 0.038),
      woodMat
    );
    lintel.position.set(0, postH + 0.012, fz);
    lintel.castShadow = true;
    group.add(lintel);

    if (idx === 0) {
      // Iron reinforcement brackets on outer portal
      for (const side of [-1, 1]) {
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.036, 0.038, 0.044),
          ironSteelMat
        );
        bracket.position.set(side * postX, postH + 0.012, fz);
        group.add(bracket);
      }
    }
  }

  // Timber rail sleepers / threshold planks leading out of the entrance
  for (let p = 0; p < 5; p++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.012, 0.024),
      woodMat
    );
    plank.position.set(0, 0.014, 0.05 + p * 0.068);
    plank.receiveShadow = true;
    group.add(plank);
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.014, 0.34),
      ironSteelMat
    );
    rail.position.set(side * 0.055, 0.022, 0.19);
    group.add(rail);
  }

  // 4. Exterior boulders + reddish iron ore heap
  const boulderSpecs: Array<[number, number, number, number, number]> = [
    [-0.31, 0.05, 0.19, 0.085, 1.1],
    [0.32, 0.045, 0.16, 0.075, 2.4],
    [-0.25, 0.04, 0.29, 0.055, 3.8],
    [0.26, 0.035, 0.28, 0.05, 5.2],
  ];
  for (const [bx, by, bz, br, bseed] of boulderSpecs) {
    const boulder = new THREE.Mesh(
      createDisplacedBoulderGeometry(br, 2, bseed),
      outerRockMat
    );
    boulder.position.set(bx, by, bz);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    group.add(boulder);
  }

  // Pile of extracted reddish iron ore chunks on the left of the entrance
  const oreOffsets: Array<[number, number, number, number]> = [
    [-0.2, 0.03, 0.26, 0.036],
    [-0.16, 0.025, 0.3, 0.028],
    [-0.23, 0.025, 0.23, 0.03],
    [-0.19, 0.052, 0.26, 0.024],
  ];
  for (let i = 0; i < oreOffsets.length; i++) {
    const [ox, oy, oz, orad] = oreOffsets[i];
    const chunk = new THREE.Mesh(
      createDisplacedBoulderGeometry(orad, 1, 7.1 + i * 1.9),
      innerIronWallMat
    );
    chunk.position.set(ox, oy, oz);
    chunk.castShadow = true;
    group.add(chunk);
  }

  // Wooden supply crate beside right entrance
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.085), woodMat);
  crate.position.set(0.21, 0.0375, 0.25);
  crate.rotation.y = 0.28;
  crate.castShadow = true;
  group.add(crate);

  // 5. Mining tools: 2 pickaxes near the mine entrance
  const pickaxeRight = createPickaxeMesh(woodMat, ironSteelMat);
  pickaxeRight.name = 'IronMinePickaxeRight';
  pickaxeRight.position.set(0.155, 0.01, 0.255);
  pickaxeRight.rotation.z = 0.26;
  pickaxeRight.rotation.x = -0.22;
  pickaxeRight.rotation.y = -0.4;
  group.add(pickaxeRight);

  const pickaxeLeft = createPickaxeMesh(woodMat, ironSteelMat);
  pickaxeLeft.name = 'IronMinePickaxeLeft';
  pickaxeLeft.position.set(-0.24, 0.02, 0.22);
  pickaxeLeft.rotation.z = -0.58;
  pickaxeLeft.rotation.x = 0.32;
  pickaxeLeft.rotation.y = 0.65;
  group.add(pickaxeLeft);

  return group;
}
