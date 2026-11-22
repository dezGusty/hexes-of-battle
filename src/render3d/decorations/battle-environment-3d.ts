import * as THREE from 'three';
import { buildLowPolyForestTreeMesh, ForestTreeVariant } from '../units/unit-mesh-builder';
import { createBattleWheatFieldModel } from '../overview/overview-wheat-field-3d';

/**
 * Supported major terrain / battle location types for the surrounding 3D environment.
 */
export enum BattleLocationType {
  FOREST = 'forest',
  FARM = 'farm',
  HIGHLANDS = 'highlands',
  SWAMP = 'swamp',
  ASTRAL = 'astral',
}

/**
 * Normalizes a string or enum input into a supported BattleLocationType.
 */
export function normalizeBattleLocationType(
  raw?: string | BattleLocationType | null,
  fallback: BattleLocationType = BattleLocationType.FARM
): BattleLocationType {
  if (!raw || typeof raw !== 'string') {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'forest' ||
    normalized === 'woods' ||
    normalized === 'woodland' ||
    normalized === 'deep_forest' ||
    normalized === 'forest_clearing'
  ) {
    return BattleLocationType.FOREST;
  }
  if (
    normalized === 'farm' ||
    normalized === 'plains' ||
    normalized === 'farmland' ||
    normalized === 'farm_in_the_plains' ||
    normalized === 'farm_plains' ||
    normalized === 'meadow' ||
    normalized === 'grassland'
  ) {
    return BattleLocationType.FARM;
  }
  if (
    normalized === 'highlands' ||
    normalized === 'mountain' ||
    normalized === 'mountains' ||
    normalized === 'hills' ||
    normalized === 'crag'
  ) {
    return BattleLocationType.HIGHLANDS;
  }
  if (
    normalized === 'swamp' ||
    normalized === 'marsh' ||
    normalized === 'bog' ||
    normalized === 'mire'
  ) {
    return BattleLocationType.SWAMP;
  }
  if (
    normalized === 'astral' ||
    normalized === 'shard' ||
    normalized === 'void' ||
    normalized === 'broken_world'
  ) {
    return BattleLocationType.ASTRAL;
  }
  return fallback;
}

export interface SkyboxThemeColors {
  zenithHex: number;
  midSkyHex: number;
  horizonHex: number;
  groundHex: number;
  fogHex: number;
  fogDensity: number;
  cloudHex: number;
  silhouetteHex: number;
}

export function getSkyboxThemeColors(locationType: BattleLocationType): SkyboxThemeColors {
  switch (locationType) {
    case BattleLocationType.FOREST:
      return {
        zenithHex: 0x2a5478,
        midSkyHex: 0x628ea6,
        horizonHex: 0xa4c0ac,
        groundHex: 0x26442b,
        fogHex: 0x7e9e8a,
        fogDensity: 0.0062,
        cloudHex: 0xe6f0ea,
        silhouetteHex: 0x2b4830,
      };
    case BattleLocationType.HIGHLANDS:
      return {
        zenithHex: 0x355c8a,
        midSkyHex: 0x7a9ec2,
        horizonHex: 0xd0d8e0,
        groundHex: 0x4a453c,
        fogHex: 0xa8b4c4,
        fogDensity: 0.0058,
        cloudHex: 0xf7f5ef,
        silhouetteHex: 0x4d5664,
      };
    case BattleLocationType.SWAMP:
      return {
        zenithHex: 0x2b3e42,
        midSkyHex: 0x4c6662,
        horizonHex: 0x7b8f82,
        groundHex: 0x242e24,
        fogHex: 0x5c6e64,
        fogDensity: 0.0075,
        cloudHex: 0xb8c4bc,
        silhouetteHex: 0x26352c,
      };
    case BattleLocationType.ASTRAL:
      return {
        zenithHex: 0x162233,
        midSkyHex: 0x2a3f59,
        horizonHex: 0x4b6584,
        groundHex: 0x181c28,
        fogHex: 0x2c3e50,
        fogDensity: 0.007,
        cloudHex: 0x9ab4cc,
        silhouetteHex: 0x1f2d3d,
      };
    case BattleLocationType.FARM:
    default:
      return {
        zenithHex: 0x3a6fa8,
        midSkyHex: 0x7da7cc,
        horizonHex: 0xdfd2b0,
        groundHex: 0x4b6e36,
        fogHex: 0xc9b38c,
        fogDensity: 0.0055,
        cloudHex: 0xfff8ea,
        silhouetteHex: 0x5b7644,
      };
  }
}

function hash2D(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 3; i++) {
    value += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return value;
}

const skyboxTextureCache = new Map<BattleLocationType, THREE.DataTexture>();

/**
 * Generates a procedural equirectangular 256x128 skybox DataTexture with sky gradient,
 * sun glow, soft clouds, and distant horizon silhouette for the given BattleLocationType.
 */
export function createSkyboxTexture(locationType: BattleLocationType): THREE.DataTexture {
  const cached = skyboxTextureCache.get(locationType);
  if (cached) {
    return cached;
  }

  const width = 256;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  const theme = getSkyboxThemeColors(locationType);

  const zenithCol = new THREE.Color(theme.zenithHex);
  const midSkyCol = new THREE.Color(theme.midSkyHex);
  const horizonCol = new THREE.Color(theme.horizonHex);
  const groundCol = new THREE.Color(theme.groundHex);
  const sunCol = new THREE.Color(0xfff6d6);
  const cloudCol = new THREE.Color(theme.cloudHex);
  const silColor = new THREE.Color(theme.silhouetteHex);
  const tempCol = new THREE.Color();

  // Sun direction matching ThreeSceneManager dirLight (-14, 20, -14)
  const sunDir = new THREE.Vector3(-14, 20, -14).normalize();

  for (let y = 0; y < height; y++) {
    // v = 0 at bottom (-Y), v = 1 at top (+Y)
    const v = y / (height - 1);
    const phi = (1 - v) * Math.PI; // 0 at zenith (+Y), PI at nadir (-Y)
    const cosPhi = Math.cos(phi); // +1 at zenith, 0 at horizon, -1 at nadir
    const sinPhi = Math.sin(phi);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const theta = u * Math.PI * 2;
      const dirX = sinPhi * Math.cos(theta);
      const dirY = cosPhi;
      const dirZ = sinPhi * Math.sin(theta);

      if (dirY >= 0) {
        // Upper sky hemisphere
        const elev = Math.pow(dirY, 0.65);
        if (elev < 0.45) {
          tempCol.lerpColors(horizonCol, midSkyCol, elev / 0.45);
        } else {
          tempCol.lerpColors(midSkyCol, zenithCol, (elev - 0.45) / 0.55);
        }

        // Soft cumulus cloud layer in mid-to-upper sky
        if (dirY > 0.06 && dirY < 0.85) {
          const cloudU = (dirX / (dirY + 0.35)) * 1.8 + 3.7;
          const cloudV = (dirZ / (dirY + 0.35)) * 1.8 + 1.9;
          const n = fbm2D(cloudU, cloudV);
          const cloudMask = Math.max(0, Math.min(1, (n - 0.48) * 3.2));
          const horizonFade = Math.min(1, (dirY - 0.06) * 5.0) * Math.min(1, (0.85 - dirY) * 4.0);
          tempCol.lerp(cloudCol, cloudMask * horizonFade * 0.55);
        }

        // Distant horizon treeline / rolling hills silhouette near dirY in [0, 0.08]
        const silhouetteNoise = fbm2D(u * 14.0, 2.5);
        const silhouetteHeight =
          locationType === BattleLocationType.FOREST || locationType === BattleLocationType.HIGHLANDS
            ? 0.035 + silhouetteNoise * 0.055
            : locationType === BattleLocationType.ASTRAL
              ? 0.01 + silhouetteNoise * 0.02
              : 0.015 + silhouetteNoise * 0.025;
        if (dirY < silhouetteHeight) {
          tempCol.lerp(silColor, 0.65);
        }

        // Sun disc & warm atmospheric scatter
        const sunDot = Math.max(0, dirX * sunDir.x + dirY * sunDir.y + dirZ * sunDir.z);
        if (sunDot > 0.7) {
          const glow = Math.pow((sunDot - 0.7) / 0.3, 3.0) * 0.55;
          const disc = sunDot > 0.992 ? 0.95 : 0;
          tempCol.lerp(sunCol, Math.min(1, glow + disc));
        }
      } else {
        // Lower hemisphere below horizon
        const depth = Math.min(1, Math.pow(-dirY, 0.5) * 2.2);
        tempCol.lerpColors(horizonCol, groundCol, depth);
      }

      const idx = (y * width + x) * 4;
      data[idx + 0] = Math.round(Math.max(0, Math.min(1, tempCol.r)) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, tempCol.g)) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, tempCol.b)) * 255);
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.userData = { isSharedAsset: true, locationType };
  texture.needsUpdate = true;

  skyboxTextureCache.set(locationType, texture);
  return texture;
}

/**
 * Creates a 3D Skybox sphere mesh enclosing the battle arena.
 */
export function createSkyboxMesh(
  locationType: BattleLocationType = BattleLocationType.FARM,
  radius: number = 120
): THREE.Mesh {
  const normalizedType = normalizeBattleLocationType(locationType);
  const geometry = new THREE.SphereGeometry(radius, 32, 24);
  const texture = createSkyboxTexture(normalizedType);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const skybox = new THREE.Mesh(geometry, material);
  skybox.name = 'Skybox';
  skybox.renderOrder = -1000;
  skybox.userData = {
    isSkybox: true,
    locationType: normalizedType,
    radius,
  };
  return skybox;
}

/**
 * Updates an existing Skybox mesh in-place to match a new BattleLocationType.
 */
export function updateSkyboxMeshTheme(
  skybox: THREE.Mesh,
  locationType: BattleLocationType
): void {
  const normalizedType = normalizeBattleLocationType(locationType);
  const mat = skybox.material as THREE.MeshBasicMaterial;
  mat.map = createSkyboxTexture(normalizedType);
  mat.needsUpdate = true;
  skybox.userData.locationType = normalizedType;
}

// ============================================================================
// Outer Battle Map Decorations (Forest & Farm in the Plains)
// ============================================================================

export interface BoardWorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
}

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Builds a low-poly mossy forest boulder cluster.
 */
export function buildForestRockMesh(scale: number = 1.0, seed: number = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterForestRock';

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6c736e,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e38,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });

  const mainRockGeo = new THREE.DodecahedronGeometry(0.42 * scale, 0);
  mainRockGeo.scale(1.2, 0.72, 0.95);
  const mainRock = new THREE.Mesh(mainRockGeo, rockMat);
  mainRock.name = 'RockBody';
  mainRock.position.y = 0.22 * scale;
  mainRock.castShadow = true;
  mainRock.receiveShadow = true;
  group.add(mainRock);

  // Moss cap on top of boulder
  const mossGeo = new THREE.DodecahedronGeometry(0.28 * scale, 0);
  mossGeo.scale(1.15, 0.35, 0.9);
  const mossCap = new THREE.Mesh(mossGeo, mossMat);
  mossCap.name = 'RockMoss';
  mossCap.position.set(0, 0.42 * scale, 0);
  group.add(mossCap);

  // Secondary smaller side stone
  const sideRockGeo = new THREE.DodecahedronGeometry(0.24 * scale, 0);
  const sideRock = new THREE.Mesh(sideRockGeo, rockMat);
  sideRock.name = 'SideRock';
  const angle = seededRand(seed) * Math.PI * 2;
  sideRock.position.set(Math.cos(angle) * 0.38 * scale, 0.14 * scale, Math.sin(angle) * 0.38 * scale);
  sideRock.castShadow = true;
  sideRock.receiveShadow = true;
  group.add(sideRock);

  group.userData = {
    isOuterDecoration: true,
    decorationType: 'forest_rock',
    locationType: BattleLocationType.FOREST,
  };
  return group;
}

/**
 * Builds a low-poly fallen wooden log and stump for the forest outskirts.
 */
export function buildForestLogMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterForestLog';

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x543824,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });
  const woodCoreMat = new THREE.MeshStandardMaterial({
    color: 0xb8925a,
    roughness: 0.85,
    flatShading: true,
  });
  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0x356932,
    roughness: 0.88,
    flatShading: true,
  });

  // Fallen hollow/rough log cylinder lying horizontally
  const logGeo = new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 1.35 * scale, 7);
  logGeo.rotateZ(Math.PI * 0.5);
  const logMesh = new THREE.Mesh(logGeo, barkMat);
  logMesh.name = 'LogTrunk';
  logMesh.position.y = 0.11 * scale;
  logMesh.castShadow = true;
  logMesh.receiveShadow = true;
  group.add(logMesh);

  // Cut stump nearby
  const stumpGeo = new THREE.CylinderGeometry(0.14 * scale, 0.19 * scale, 0.28 * scale, 7);
  const stumpMesh = new THREE.Mesh(stumpGeo, [barkMat, woodCoreMat, barkMat]);
  stumpMesh.name = 'TreeStump';
  stumpMesh.position.set(0.45 * scale, 0.14 * scale, 0.32 * scale);
  stumpMesh.castShadow = true;
  stumpMesh.receiveShadow = true;
  group.add(stumpMesh);

  // Small bush beside the log
  const bushGeo = new THREE.IcosahedronGeometry(0.24 * scale, 0);
  bushGeo.scale(1.1, 0.75, 1.0);
  const bushMesh = new THREE.Mesh(bushGeo, shrubMat);
  bushMesh.name = 'WoodlandBush';
  bushMesh.position.set(-0.35 * scale, 0.16 * scale, -0.25 * scale);
  bushMesh.castShadow = true;
  bushMesh.receiveShadow = true;
  group.add(bushMesh);

  group.userData = {
    isOuterDecoration: true,
    decorationType: 'forest_log',
    locationType: BattleLocationType.FOREST,
  };
  return group;
}

/**
 * Builds a low-poly medieval Farmhouse cottage with pitched roof and stone chimney.
 */
export function buildFarmhouseMesh(scale: number = 1.0, isBarn: boolean = false): THREE.Group {
  const group = new THREE.Group();
  group.name = isBarn ? 'OuterFarmBarn' : 'OuterFarmhouse';

  const wallMat = new THREE.MeshStandardMaterial({
    color: isBarn ? 0x8c3b2b : 0xdccbb1,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: true,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4a321e,
    roughness: 0.9,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: isBarn ? 0x6b4c30 : 0xb57c3c,
    roughness: 0.85,
    flatShading: true,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x767676,
    roughness: 0.92,
    flatShading: true,
  });

  const w = (isBarn ? 1.85 : 1.45) * scale;
  const h = (isBarn ? 1.05 : 0.85) * scale;
  const d = (isBarn ? 1.35 : 1.05) * scale;

  // Main cottage/barn walls
  const wallsGeo = new THREE.BoxGeometry(w, h, d);
  const wallsMesh = new THREE.Mesh(wallsGeo, wallMat);
  wallsMesh.name = 'BuildingWalls';
  wallsMesh.position.y = h * 0.5;
  wallsMesh.castShadow = true;
  wallsMesh.receiveShadow = true;
  group.add(wallsMesh);

  // Wooden door on front face
  const doorGeo = new THREE.BoxGeometry(0.28 * scale, 0.48 * scale, 0.06 * scale);
  const doorMesh = new THREE.Mesh(doorGeo, timberMat);
  doorMesh.name = 'BuildingDoor';
  doorMesh.position.set(0, 0.24 * scale, d * 0.5 + 0.01 * scale);
  group.add(doorMesh);

  // Pitched triangular prism roof (using a 3-sided cylinder rotated along X)
  const roofRadius = d * 0.68;
  const roofGeo = new THREE.CylinderGeometry(roofRadius, roofRadius, w * 1.08, 3);
  roofGeo.rotateZ(Math.PI * 0.5);
  roofGeo.rotateX(Math.PI / 6);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.name = 'BuildingRoof';
  roofMesh.position.y = h + roofRadius * 0.36;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  if (!isBarn) {
    // Stone chimney on farmhouse
    const chimneyGeo = new THREE.BoxGeometry(0.22 * scale, 0.65 * scale, 0.22 * scale);
    const chimneyMesh = new THREE.Mesh(chimneyGeo, stoneMat);
    chimneyMesh.name = 'Chimney';
    chimneyMesh.position.set(w * 0.3, h + 0.28 * scale, -d * 0.2);
    chimneyMesh.castShadow = true;
    group.add(chimneyMesh);
  }

  group.userData = {
    isOuterDecoration: true,
    decorationType: isBarn ? 'farm_barn' : 'farmhouse',
    locationType: BattleLocationType.FARM,
  };
  return group;
}

/**
 * Builds a low-poly medieval Windmill with a conical roof and 4 wooden sails.
 */
export function buildWindmillMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterFarmWindmill';

  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xd4c6b0,
    roughness: 0.88,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x523720,
    roughness: 0.9,
    flatShading: true,
  });
  const sailClothMat = new THREE.MeshStandardMaterial({
    color: 0xf0e6d2,
    roughness: 0.8,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Tapered cylindrical tower
  const towerH = 1.85 * scale;
  const towerGeo = new THREE.CylinderGeometry(0.42 * scale, 0.58 * scale, towerH, 8);
  const towerMesh = new THREE.Mesh(towerGeo, towerMat);
  towerMesh.name = 'WindmillTower';
  towerMesh.position.y = towerH * 0.5;
  towerMesh.castShadow = true;
  towerMesh.receiveShadow = true;
  group.add(towerMesh);

  // Conical roof cap
  const capH = 0.55 * scale;
  const capGeo = new THREE.ConeGeometry(0.48 * scale, capH, 8);
  const capMesh = new THREE.Mesh(capGeo, woodMat);
  capMesh.name = 'WindmillRoof';
  capMesh.position.y = towerH + capH * 0.5 - 0.02 * scale;
  capMesh.castShadow = true;
  group.add(capMesh);

  // Rotating sails hub
  const sailsGroup = new THREE.Group();
  sailsGroup.name = 'WindmillSails';
  sailsGroup.position.set(0, towerH * 0.78, 0.46 * scale);

  const hubGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.18 * scale, 6);
  hubGeo.rotateX(Math.PI * 0.5);
  const hubMesh = new THREE.Mesh(hubGeo, woodMat);
  sailsGroup.add(hubMesh);

  const bladeLen = 1.15 * scale;
  for (let i = 0; i < 4; i++) {
    const armGroup = new THREE.Group();
    armGroup.rotation.z = (i * Math.PI) / 2 + Math.PI / 8;

    const sparGeo = new THREE.BoxGeometry(0.04 * scale, bladeLen, 0.04 * scale);
    sparGeo.translate(0, bladeLen * 0.5, 0);
    const sparMesh = new THREE.Mesh(sparGeo, woodMat);
    armGroup.add(sparMesh);

    const clothGeo = new THREE.PlaneGeometry(0.22 * scale, bladeLen * 0.78);
    clothGeo.translate(0.11 * scale, bladeLen * 0.55, 0.01 * scale);
    const clothMesh = new THREE.Mesh(clothGeo, sailClothMat);
    armGroup.add(clothMesh);

    sailsGroup.add(armGroup);
  }

  group.add(sailsGroup);
  group.userData = {
    isOuterDecoration: true,
    decorationType: 'farm_windmill',
    locationType: BattleLocationType.FARM,
  };
  return group;
}

/**
 * Builds a golden haystack / hay bale cluster for farm outskirts.
 */
export function buildHaystackMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterHaystack';

  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xd9a838,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
  });

  // Main domed haystack mound
  const moundGeo = new THREE.ConeGeometry(0.42 * scale, 0.58 * scale, 7);
  const moundMesh = new THREE.Mesh(moundGeo, hayMat);
  moundMesh.name = 'HaystackMound';
  moundMesh.position.y = 0.29 * scale;
  moundMesh.castShadow = true;
  moundMesh.receiveShadow = true;
  group.add(moundMesh);

  // Small rolled hay bale next to it
  const baleGeo = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.34 * scale, 8);
  baleGeo.rotateZ(Math.PI * 0.5);
  const baleMesh = new THREE.Mesh(baleGeo, hayMat);
  baleMesh.name = 'HayBale';
  baleMesh.position.set(0.42 * scale, 0.18 * scale, 0.22 * scale);
  baleMesh.rotation.y = 0.4;
  baleMesh.castShadow = true;
  baleMesh.receiveShadow = true;
  group.add(baleMesh);

  group.userData = {
    isOuterDecoration: true,
    decorationType: 'haystack',
    locationType: BattleLocationType.FARM,
  };
  return group;
}

/**
 * Builds a large wind-animated Eador-style wheat field patch for the battle farm environment.
 */
export function buildCropFieldMesh(width: number = 6.0, depth: number = 2.6, seed: number = 1): THREE.Group {
  const group = createBattleWheatFieldModel(width, depth, seed);
  group.userData = {
    isOuterDecoration: true,
    decorationType: 'crop_field',
    locationType: BattleLocationType.FARM,
    isWheatField: true,
  };
  return group;
}

/**
 * Builds a rustic wooden post-and-cross-beam farm fence segment (matching the
 * cattle pasture cross-beam fence style).
 */
export function buildFarmFenceMesh(length: number = 2.4, seed: number = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterFarmFence';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4829,
    roughness: 0.92,
    flatShading: true,
  });

  const postCount = Math.max(3, Math.round(length / 0.95) + 1);
  const postGeo = new THREE.BoxGeometry(0.085, 0.48, 0.085);
  const posts: Array<{ x: number; z: number }> = [];

  for (let i = 0; i < postCount; i++) {
    const t = i / (postCount - 1);
    const x = -length * 0.5 + t * length;
    const z = (seededRand(seed * 17 + i * 5) - 0.5) * 0.05;
    posts.push({ x, z });

    const post = new THREE.Mesh(postGeo, woodMat);
    post.name = `FencePost_${i}`;
    post.position.set(x, 0.24, z);
    post.rotation.x = (seededRand(seed * 19 + i * 7) - 0.5) * 0.08;
    post.rotation.z = (seededRand(seed * 23 + i * 11) - 0.5) * 0.08;
    post.castShadow = true;
    group.add(post);
  }

  for (let i = 0; i < postCount - 1; i++) {
    const a = posts[i];
    const b = posts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);

    for (const crossDir of [-1, 1]) {
      const railGeo = new THREE.BoxGeometry(segLen + 0.1, 0.055, 0.048);
      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.name = `FenceCrossRail_${i}_${crossDir > 0 ? 'a' : 'b'}`;
      const midY = 0.24 + (seededRand(seed * 29 + i * 13 + crossDir) - 0.5) * 0.03;
      rail.position.set(
        (a.x + b.x) * 0.5,
        midY,
        (a.z + b.z) * 0.5 + crossDir * 0.014
      );
      rail.rotation.order = 'YXZ';
      rail.rotation.y = yaw + (seededRand(seed * 31 + i * 17 + crossDir) - 0.5) * 0.04;
      rail.rotation.z = crossDir * (0.28 + seededRand(seed * 37 + i * 19) * 0.06);
      rail.castShadow = true;
      group.add(rail);
    }
  }

  group.userData = {
    isOuterDecoration: true,
    decorationType: 'farm_fence',
    locationType: BattleLocationType.FARM,
  };
  return group;
}

export function getOuterApronColorHex(locationType: BattleLocationType): number {
  const normalizedType = normalizeBattleLocationType(locationType);
  const themeColors = getSkyboxThemeColors(normalizedType);
  return normalizedType === BattleLocationType.FOREST
    ? 0x2c5230
    : normalizedType === BattleLocationType.FARM
      ? 0x48783c
      : themeColors.groundHex;
}

/**
 * Populates the outer ground apron, distant rolling hills, and location-specific
 * 3D decorations ('forest' or 'farm') around the playable hex board.
 */
export function populateOuterEnvironmentDecorations(
  targetGroup: THREE.Group,
  locationType: BattleLocationType,
  bounds: BoardWorldBounds,
  _hexHeight: number = 0.25,
  treeTemplates?: Partial<Record<ForestTreeVariant, THREE.Object3D>>,
  simpleTrees: boolean = false
): { animatedWindmillSails: THREE.Object3D[] } {
  const normalizedType = normalizeBattleLocationType(locationType);
  const animatedWindmillSails: THREE.Object3D[] = [];

  const groundY = -0.155;

  // 1. Outer Ground Apron surrounding the hex board out to the skybox horizon
  const themeColors = getSkyboxThemeColors(normalizedType);
  const apronColor = getOuterApronColorHex(normalizedType);
  const apronGeo = new THREE.CircleGeometry(115, 48);
  apronGeo.rotateX(-Math.PI * 0.5);
  const apronMat = new THREE.MeshStandardMaterial({
    color: apronColor,
    roughness: 0.92,
    metalness: 0.02,
  });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.name = 'OuterGroundApron';
  apronMesh.position.set(bounds.centerX, groundY, bounds.centerZ);
  apronMesh.receiveShadow = true;
  apronMesh.userData = {
    isOuterGroundApron: true,
    locationType: normalizedType,
  };
  targetGroup.add(apronMesh);

  // 2. Distant low-poly rolling horizon hills ring
  const hillRingCount = 12;
  const hillMat = new THREE.MeshStandardMaterial({
    color:
      normalizedType === BattleLocationType.FOREST
        ? 0x26482b
        : normalizedType === BattleLocationType.FARM
          ? 0x567f42
          : themeColors.silhouetteHex,
    roughness: 0.95,
    flatShading: true,
  });
  const boardSpanX = (bounds.maxX - bounds.minX) * 0.5;
  const boardSpanZ = (bounds.maxZ - bounds.minZ) * 0.5;
  const hillBaseRadius = Math.max(boardSpanX, boardSpanZ) + 18;

  for (let i = 0; i < hillRingCount; i++) {
    const angle = (i * Math.PI * 2) / hillRingCount + 0.2;
    const dist = hillBaseRadius + seededRand(i * 17 + 3) * 10;
    const moundRadius = 7.5 + seededRand(i * 31 + 7) * 5.0;
    const moundHeight =
      normalizedType === BattleLocationType.FOREST
        ? 2.2 + seededRand(i * 43) * 2.0
        : 1.2 + seededRand(i * 43) * 1.3;
    const moundGeo = new THREE.ConeGeometry(moundRadius, moundHeight, 7);
    const moundMesh = new THREE.Mesh(moundGeo, hillMat);
    moundMesh.name = `OuterHorizonHill_${i}`;
    moundMesh.position.set(
      bounds.centerX + Math.cos(angle) * dist,
      groundY + moundHeight * 0.45,
      bounds.centerZ + Math.sin(angle) * dist
    );
    moundMesh.receiveShadow = true;
    moundMesh.userData = {
      isOuterHorizonHill: true,
      locationType: normalizedType,
    };
    targetGroup.add(moundMesh);
  }

  // Generate perimeter anchor coordinates strictly outside the playable hex grid,
  // closer along North/South edges so nearby obstacles frame the battlefield.
  const marginX = 2.2;
  const marginZ = 1.45;
  const propY = -0.015;
  const innerMinX = bounds.minX - marginX;
  const innerMaxX = bounds.maxX + marginX;
  const innerMinZ = bounds.minZ - marginZ;
  const innerMaxZ = bounds.maxZ + marginZ;

  if (normalizedType === BattleLocationType.FOREST) {
    // ------------------------------------------------------------------------
    // FOREST LOCATION: Dense woodland perimeter of Pines, Oaks, Rocks & Logs
    // ------------------------------------------------------------------------
    const spawnTreeAt = (wx: number, wz: number, seed: number) => {
      const treeVariants: ForestTreeVariant[] = simpleTrees
        ? ['card_pine', 'card_oak', 'card_birch', 'card_willow', 'card_maple']
        : ['pine', 'pine_2', 'pine_3', 'pine_4', 'pine_5', 'oak', 'birch', 'willow', 'maple'];
      const variant: ForestTreeVariant = treeVariants[seed % treeVariants.length];
      const scale = 1.05 + seededRand(seed * 13) * 0.55;
      let treeObj: THREE.Object3D;
      const glbTpl = treeTemplates?.[variant];
      if (glbTpl) {
        treeObj = glbTpl.clone(true);
        treeObj.scale.set(scale, scale, scale);
      } else {
        treeObj = buildLowPolyForestTreeMesh(variant, scale);
      }
      treeObj.name = `OuterForestTree_${seed}`;
      treeObj.position.set(wx, propY, wz);
      treeObj.rotation.y = seededRand(seed * 29) * Math.PI * 2;
      treeObj.userData = {
        ...treeObj.userData,
        isOuterDecoration: true,
        decorationType: 'forest_tree',
        treeVariant: variant,
        locationType: BattleLocationType.FOREST,
      };
      targetGroup.add(treeObj);
    };

    // Place concentric woodland trees around the battle clearing (closer on North/South)
    const perimeterTreeCount = 48;
    for (let i = 0; i < perimeterTreeCount; i++) {
      const t = i / perimeterTreeCount;
      const angle = t * Math.PI * 2 + (seededRand(i * 19) - 0.5) * 0.1;
      const ringDepth = (i % 3) * 2.1 + seededRand(i * 37) * 1.5;
      const rx = (innerMaxX - innerMinX) * 0.5 + 0.9 + ringDepth;
      const rz = (innerMaxZ - innerMinZ) * 0.5 + 0.65 + ringDepth * 0.85;
      const wx = bounds.centerX + Math.cos(angle) * rx;
      const wz = bounds.centerZ + Math.sin(angle) * rz;
      spawnTreeAt(wx, wz, i + 1);
    }

    // Place mossy boulders and fallen logs along the clearing edge, including closer North/South clusters
    const rockAndLogCount = 18;
    for (let i = 0; i < rockAndLogCount; i++) {
      const angle = (i * Math.PI * 2) / rockAndLogCount + 0.15;
      const rx = (innerMaxX - innerMinX) * 0.5 + 0.65 + seededRand(i * 53) * 1.8;
      const rz = (innerMaxZ - innerMinZ) * 0.5 + 0.45 + seededRand(i * 61) * 1.6;
      const wx = bounds.centerX + Math.cos(angle) * rx;
      const wz = bounds.centerZ + Math.sin(angle) * rz;

      if (i % 2 === 0) {
        const rock = buildForestRockMesh(0.85 + seededRand(i * 71) * 0.45, i + 1);
        rock.position.set(wx, propY, wz);
        rock.rotation.y = seededRand(i * 83) * Math.PI * 2;
        targetGroup.add(rock);
      } else {
        const log = buildForestLogMesh(0.85 + seededRand(i * 97) * 0.35);
        log.position.set(wx, propY, wz);
        log.rotation.y = seededRand(i * 101) * Math.PI * 2;
        targetGroup.add(log);
      }
    }
  } else {
    // ------------------------------------------------------------------------
    // FARM LOCATION: Farmhouses, Barn, Windmill, Crop Fields, Cross-Beam Fences & Haystacks
    // ------------------------------------------------------------------------
    // North-West Farmstead cluster (Farmhouse + Barn + Windmill + Crop Fields)
    const nwX = innerMinX - 1.8;
    const nwZ = innerMinZ - 1.5;

    const farmhouse1 = buildFarmhouseMesh(1.1, false);
    farmhouse1.position.set(nwX + 2.8, propY, nwZ - 0.9);
    farmhouse1.rotation.y = 0.25;
    targetGroup.add(farmhouse1);

    const barn1 = buildFarmhouseMesh(1.15, true);
    barn1.position.set(nwX - 0.6, propY, nwZ + 1.2);
    barn1.rotation.y = 1.1;
    targetGroup.add(barn1);

    const windmill = buildWindmillMesh(1.15);
    windmill.position.set(bounds.centerX + 3.4, propY, innerMinZ - 2.4);
    windmill.rotation.y = -0.35;
    targetGroup.add(windmill);
    const sails = windmill.getObjectByName('WindmillSails');
    if (sails) {
      animatedWindmillSails.push(sails);
    }

    // South-East secondary farm cottage
    const farmhouse2 = buildFarmhouseMesh(1.0, false);
    farmhouse2.position.set(innerMaxX + 2.0, propY, innerMaxZ + 1.1);
    farmhouse2.rotation.y = -2.4;
    targetGroup.add(farmhouse2);

    // Wide wind-animated wheat fields placed strictly to the North (left and right of the windmill)
    // and to the South of the battlefield (none on East/West sides).
    const fieldPositions: Array<{ x: number; z: number; w: number; d: number; rot: number }> = [
      // North-Left of windmill
      { x: bounds.centerX - 2.6, z: innerMinZ - 1.9, w: 6.2, d: 2.6, rot: 0.03 },
      // North-Right of windmill (windmill is at centerX + 3.4)
      { x: bounds.centerX + 8.0, z: innerMinZ - 1.8, w: 5.4, d: 2.5, rot: -0.05 },
      // South of battlefield
      { x: bounds.centerX - 3.6, z: innerMaxZ + 1.9, w: 6.4, d: 2.7, rot: 0.04 },
      { x: bounds.centerX + 3.8, z: innerMaxZ + 1.8, w: 6.0, d: 2.6, rot: -0.03 },
    ];
    fieldPositions.forEach((fp, idx) => {
      const field = buildCropFieldMesh(fp.w, fp.d, 301 + idx * 17);
      field.position.set(fp.x, propY, fp.z);
      field.rotation.y = fp.rot;
      targetGroup.add(field);
    });

    // Non-continuous sections of rustic cross-beam fences parallel to the North & South
    // edges of the battlefield (with organic gaps and slight angle variations)
    const fenceSections: Array<{ x: number; z: number; len: number; rot: number }> = [
      // North side (broken into 3 non-continuous sections)
      { x: bounds.centerX - 4.6, z: innerMinZ - 0.15, len: 2.4, rot: 0.03 },
      { x: bounds.centerX - 0.2, z: innerMinZ - 0.35, len: 2.6, rot: -0.04 },
      { x: bounds.centerX + 4.4, z: innerMinZ - 0.1, len: 2.2, rot: 0.05 },
      // South side (broken into 3 non-continuous sections with different offsets/gaps)
      { x: bounds.centerX - 5.2, z: innerMaxZ + 0.25, len: 2.2, rot: -0.05 },
      { x: bounds.centerX + 0.4, z: innerMaxZ + 0.1, len: 2.8, rot: 0.03 },
      { x: bounds.centerX + 5.0, z: innerMaxZ + 0.35, len: 2.1, rot: -0.03 },
      // East / West side accents
      { x: innerMinX - 1.0, z: bounds.centerZ - 1.5, len: 2.4, rot: Math.PI * 0.5 },
      { x: innerMaxX + 1.0, z: bounds.centerZ + 1.5, len: 2.4, rot: Math.PI * 0.5 },
    ];
    fenceSections.forEach((fPos, idx) => {
      const fence = buildFarmFenceMesh(fPos.len, idx + 1);
      fence.position.set(fPos.x, propY, fPos.z);
      fence.rotation.y = fPos.rot;
      targetGroup.add(fence);
    });

    // Golden haystacks & hay bales scattered near the fields and North/South borders
    const haystackPositions: Array<{ x: number; z: number; scale: number }> = [
      { x: nwX + 1.2, z: nwZ + 0.5, scale: 1.1 },
      { x: bounds.centerX + 5.0, z: innerMinZ - 1.0, scale: 0.95 },
      { x: bounds.centerX - 1.8, z: innerMinZ - 0.9, scale: 0.9 },
      { x: bounds.centerX - 0.9, z: innerMaxZ + 1.1, scale: 1.05 },
      { x: bounds.centerX + 3.2, z: innerMaxZ + 1.0, scale: 0.95 },
      { x: innerMaxX + 1.6, z: innerMaxZ - 0.6, scale: 0.9 },
      { x: innerMinX - 1.6, z: innerMaxZ + 0.9, scale: 1.0 },
    ];
    for (const hp of haystackPositions) {
      const hay = buildHaystackMesh(hp.scale);
      hay.position.set(hp.x, propY, hp.z);
      targetGroup.add(hay);
    }

    // A few solitary trees in the plains (matching simpleTrees mode)
    const plainsTrees: Array<{ x: number; z: number; scale: number; variant: ForestTreeVariant }> = [
      { x: nwX + 4.8, z: nwZ - 1.2, scale: 1.15, variant: simpleTrees ? 'card_oak' : 'oak' },
      { x: innerMaxX + 2.8, z: innerMinZ - 1.1, scale: 1.05, variant: simpleTrees ? 'card_birch' : 'birch' },
      { x: innerMinX - 2.6, z: innerMaxZ + 1.4, scale: 1.1, variant: simpleTrees ? 'card_maple' : 'maple' },
      { x: innerMaxX + 3.0, z: innerMaxZ + 2.0, scale: 1.2, variant: simpleTrees ? 'card_willow' : 'willow' },
    ];
    for (let i = 0; i < plainsTrees.length; i++) {
      const pt = plainsTrees[i];
      const tpl = treeTemplates?.[pt.variant];
      const tree = tpl
        ? tpl.clone(true)
        : buildLowPolyForestTreeMesh(pt.variant, pt.scale);
      if (tpl) {
        tree.scale.set(pt.scale, pt.scale, pt.scale);
      }
      tree.name = `OuterPlainsTree_${i}`;
      tree.position.set(pt.x, propY, pt.z);
      tree.userData = {
        ...tree.userData,
        isOuterDecoration: true,
        decorationType: 'plains_tree',
        treeVariant: pt.variant,
        locationType: BattleLocationType.FARM,
      };
      targetGroup.add(tree);
    }
  }

  return { animatedWindmillSails };
}
