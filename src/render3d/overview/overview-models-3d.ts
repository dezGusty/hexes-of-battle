import * as THREE from 'three';
import {
  AgricultureOption,
  DefenseStructureTier,
  OverviewArmy,
  ResourceBuildingType,
  SettlementTier,
} from '../../overview/overview-types';
import { CreatureType } from '../../battle/creature';
import { buildArticulatedUnit3DMesh, parseColorToHex } from '../units/unit-mesh-builder';
import { createBannerTextureForName } from '../decorations/retreat-flag-3d';
import { createOverviewCowModel } from './overview-cow-3d';
import { createCastleSettlementHex } from './overview-castle-town-3d';
import { createOverviewIronMineModel } from './overview-iron-mine-3d';
import { createOverviewLumberMillModel } from './overview-lumber-mill-3d';
import {
  createOverviewArcherModel,
  createOverviewArmoredKnightModel,
  createOverviewCrossbowmanModel,
  createOverviewMacemanModel,
  createOverviewPeasantModel,
  createOverviewSpearmanModel,
  createOverviewSwordsmanModel,
} from './overview-peasant-3d';
import { createOverviewWheatFieldModel } from './overview-wheat-field-3d';

function makeMat(color: number, roughness = 0.8, metalness = 0.1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function createOverviewWindFlag(
  colorHex: string = '#8c929a',
  poleHeight: number = 0.85,
  flagWidth: number = 0.34,
  flagHeight: number = 0.2,
  bannerName?: string
): THREE.Group {
  const flagGroup = new THREE.Group();
  flagGroup.name = 'OverviewWindFlag';

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.02, poleHeight, 6),
    makeMat(0x5e432a, 0.85)
  );
  pole.position.set(0, poleHeight * 0.5, 0);
  pole.castShadow = true;

  const clothPivot = new THREE.Group();
  clothPivot.position.set(0, poleHeight - flagHeight * 0.55, 0);
  clothPivot.userData.isOverviewFlagPivot = true;

  const clothGeo = new THREE.PlaneGeometry(flagWidth, flagHeight, 6, 2);
  clothGeo.translate(flagWidth * 0.5, 0, 0);
  const basePositions = Float32Array.from(
    clothGeo.attributes.position.array as Float32Array
  );

  const bannerMap = createBannerTextureForName(bannerName);
  const clothMat = new THREE.MeshStandardMaterial({
    color: bannerMap ? 0xffffff : new THREE.Color(colorHex),
    map: bannerMap ?? null,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });

  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.castShadow = true;
  clothMesh.userData = {
    isOverviewFlagCloth: true,
    flagWidth,
    flagHeight,
    basePositions,
    flagPhase: (colorHex.charCodeAt(1) || 1) * 0.37,
    bannerName,
  };

  clothPivot.add(clothMesh);
  flagGroup.add(pole, clothPivot);
  return flagGroup;
}

export function createOverviewSettlementModel(
  tier: SettlementTier,
  ownerColorHex: string = '#8c929a',
  bannerName?: string
): THREE.Group {
  if (tier === 'town') {
    const castle = createCastleSettlementHex({ bannerColor: ownerColorHex, bannerName });
    castle.scale.setScalar(1.518);
    return castle;
  }

  const group = new THREE.Group();
  group.name = `OverviewSettlement_${tier}`;

  const wallMat = makeMat(0xd9ccb4, 0.85);
  const roofMat = makeMat(tier === 'city' ? 0x8e3b2e : 0xb5894c, 0.78);
  const stoneMat = makeMat(0x7c828a, 0.9);

  const addHouse = (x: number, z: number, w: number, h: number, d: number, rotY = 0) => {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.75, 4), roofMat);
    roof.position.y = h + h * 0.37;
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = true;

    house.add(body, roof);
    house.position.set(x, 0, z);
    house.rotation.y = rotY;
    group.add(house);
  };

  if (tier === 'village') {
    addHouse(-0.22, -0.12, 0.22, 0.16, 0.18, 0.2);
    addHouse(0.2, 0.14, 0.2, 0.14, 0.18, -0.4);
    addHouse(-0.1, 0.24, 0.18, 0.13, 0.16, 0.6);
  } else {
    // City: outer wall ring + grand keep + 4 houses
    const wallRing = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.16, 6, 1, true), stoneMat);
    wallRing.position.y = 0.08;
    wallRing.material.side = THREE.DoubleSide;
    group.add(wallRing);

    addHouse(-0.3, -0.22, 0.2, 0.2, 0.18, 0.15);
    addHouse(0.3, -0.2, 0.2, 0.2, 0.18, -0.25);
    addHouse(-0.28, 0.24, 0.2, 0.18, 0.18, 0.3);
    addHouse(0.28, 0.24, 0.2, 0.18, 0.18, -0.1);

    const keep = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), stoneMat);
    keep.position.y = 0.21;
    keep.castShadow = true;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.34, 4), roofMat);
    spire.position.y = 0.59;
    spire.rotation.y = Math.PI * 0.25;
    group.add(keep, spire);
  }

  const settlementFlag = createOverviewWindFlag(
    ownerColorHex,
    tier === 'city' ? 0.56 : 0.48,
    0.28,
    0.16,
    bannerName
  );
  if (tier === 'city') {
    settlementFlag.position.set(0, 0.72, 0);
  } else {
    settlementFlag.position.set(0.06, 0, -0.02);
  }
  group.add(settlementFlag);
  group.scale.setScalar(1.2);

  return group;
}

export function createOverviewResourceBuildingModel(type: ResourceBuildingType): THREE.Group {
  if (type === 'iron_mine') {
    return createOverviewIronMineModel();
  }
  if (type === 'lumber_camp') {
    return createOverviewLumberMillModel();
  }

  const group = new THREE.Group();
  group.name = `OverviewResource_${type}`;

  const woodMat = makeMat(0x7c5333, 0.88);
  const stoneMat = makeMat(0x767c84, 0.9);

  if (type === 'quarry') {
    const block1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.28), stoneMat);
    block1.position.set(-0.1, 0.09, -0.06);
    const block2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.18), makeMat(0x9aa0a8, 0.85));
    block2.position.set(0.18, 0.06, 0.12);
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.05), woodMat);
    crane.position.set(0.12, 0.19, -0.1);
    group.add(block1, block2, crane);
  } else {
    // iron_mine or gold_mine
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.34, 6), stoneMat);
    mound.position.set(0, 0.17, -0.05);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12), makeMat(0x1f2226, 0.95));
    arch.position.set(0, 0.09, 0.16);
    const oreColor = type === 'gold_mine' ? 0xe6b800 : 0x5c6873;
    const ore = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09, 0),
      makeMat(oreColor, 0.4, 0.7)
    );
    ore.position.set(0.24, 0.09, 0.14);
    group.add(mound, arch, ore);
  }

  return group;
}

export function createOverviewAgricultureModel(
  option: AgricultureOption,
  seed: number = 1,
  options?: { includeSoilBase?: boolean }
): THREE.Group {
  if (option === 'wheat') {
    return createOverviewWheatFieldModel(seed, options);
  }

  const group = new THREE.Group();
  group.name = `OverviewAgri_${option}`;

  if (option === 'cattle') {
    const fenceMat = makeMat(0x6b4829, 0.94);
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'CattleFence';

    const pseudoRand = (n: number) => {
      const v = Math.sin((seed * 17.3 + n) * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };

    // 8 rustic posts around the pasture with slight organic jitter
    const postCount = 8;
    const baseRadius = 0.48;
    const posts: Array<{ x: number; z: number; h: number }> = [];
    const postGeo = new THREE.BoxGeometry(0.022, 0.11, 0.022);
    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * Math.PI * 2 + (pseudoRand(i * 3) - 0.5) * 0.18;
      const r = baseRadius + (pseudoRand(i * 3 + 1) - 0.5) * 0.06;
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;
      const ph = 0.095 + pseudoRand(i * 3 + 2) * 0.025;
      posts.push({ x: px, z: pz, h: ph });

      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(px, ph * 0.5, pz);
      post.rotation.x = (pseudoRand(i * 5 + 1) - 0.5) * 0.14;
      post.rotation.z = (pseudoRand(i * 5 + 2) - 0.5) * 0.14;
      post.rotation.y = pseudoRand(i * 5 + 3) * Math.PI;
      post.castShadow = true;
      post.userData.isCattleFencePart = true;
      post.userData.baseLocalY = ph * 0.5;
      fenceGroup.add(post);
    }

    // Criss-crossing crooked wooden rails between posts (leaving 1 segment open as a gate)
    for (let i = 0; i < postCount - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dz, dx);

      for (const crossDir of [-1, 1]) {
        const railGeo = new THREE.BoxGeometry(dist + 0.03, 0.014, 0.013);
        const rail = new THREE.Mesh(railGeo, fenceMat);
        const midY = 0.048 + (pseudoRand(i * 7 + (crossDir > 0 ? 1 : 2)) - 0.5) * 0.012;
        rail.position.set(
          (a.x + b.x) * 0.5 + (pseudoRand(i * 11 + crossDir) - 0.5) * 0.01,
          midY,
          (a.z + b.z) * 0.5 + (pseudoRand(i * 13 + crossDir) - 0.5) * 0.01
        );
        rail.rotation.order = 'YXZ';
        rail.rotation.y = yaw + (pseudoRand(i * 9 + crossDir) - 0.5) * 0.08;
        rail.rotation.z = crossDir * (0.14 + pseudoRand(i * 17 + crossDir) * 0.06);
        rail.castShadow = true;
        rail.userData.isCattleFencePart = true;
        rail.userData.baseLocalY = midY;
        fenceGroup.add(rail);
      }
    }
    group.add(fenceGroup);

    const cowConfigs: Array<[number, number, number]> = [
      [-0.24, -0.12, 0.55 - Math.PI / 4 + Math.PI / 6],
      [0.24, -0.1, -0.75 + Math.PI / 6],
      [0.0, 0.18, 2.65],
    ];
    for (let i = 0; i < cowConfigs.length; i++) {
      const [ax, az, rotY] = cowConfigs[i];
      const cow = createOverviewCowModel(seed * 31 + i + 1);
      cow.scale.setScalar(0.28);
      cow.position.set(ax, 0, az);
      cow.rotation.y = rotY;
      group.add(cow);
    }
  } else if (option === 'sheep' || option === 'horses') {
    const fenceMat = makeMat(0x7c5333, 0.9);
    const fence = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), fenceMat);
    fence.position.set(0, 0.04, -0.28);
    const fence2 = fence.clone();
    fence2.position.z = 0.28;
    group.add(fence, fence2);

    const animalColor = option === 'sheep' ? 0xf2f0e6 : 0x4b2f1d;
    const animalMat = makeMat(animalColor, 0.85);
    const positions = [
      [-0.16, -0.08],
      [0.14, 0.06],
      [-0.04, 0.14],
    ];
    for (const [ax, az] of positions) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.08), animalMat);
      body.position.set(ax, 0.06, az);
      group.add(body);
    }
  } else {
    const fallow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.5), makeMat(0x6b5239, 0.95));
    fallow.position.y = 0.015;
    group.add(fallow);
  }

  return group;
}

export function createOverviewBridgeModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OverviewBridge';

  const stoneMat = makeMat(0x7c7870, 0.92);
  const woodMat = makeMat(0x825a34, 0.88);
  const darkWoodMat = makeMat(0x52371e, 0.9);

  // Stone abutments on each bank (spanning local X = -0.52 to +0.52)
  for (const side of [-1, 1]) {
    const abutment = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.42),
      stoneMat
    );
    abutment.position.set(side * 0.46, 0.03, 0);
    abutment.castShadow = true;
    abutment.receiveShadow = true;
    group.add(abutment);
  }

  // Wide arched timber/cobble deck segments
  const deckSegs = 7;
  const span = 0.96;
  const deckWidth = 0.36;
  for (let i = 0; i < deckSegs; i++) {
    const t = (i + 0.5) / deckSegs - 0.5; // -0.5..0.5
    const x = t * span;
    const archY = 0.08 + Math.cos(t * Math.PI) * 0.065;
    const slopeAngle = -Math.sin(t * Math.PI) * 0.18;

    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(span / deckSegs + 0.015, 0.032, deckWidth),
      i % 2 === 0 ? woodMat : darkWoodMat
    );
    plank.position.set(x, archY, 0);
    plank.rotation.z = slopeAngle;
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }

  // Low stone/timber side parapets
  for (const zSide of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.045, 0.035),
      stoneMat
    );
    rail.position.set(0, 0.145, zSide * (deckWidth * 0.5 - 0.015));
    rail.castShadow = true;
    rail.receiveShadow = true;
    group.add(rail);
  }

  return group;
}

export function createOverviewDefenseModel(tier: DefenseStructureTier): THREE.Group {
  const group = new THREE.Group();
  group.name = `OverviewDefense_${tier}`;
  if (tier === 'none') return group;

  if (tier === 'palisade') {
    const woodMat = makeMat(0x7c5333, 0.9);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 5), woodMat);
      stake.position.set(Math.cos(angle) * 0.28, 0.12, Math.sin(angle) * 0.28);
      group.add(stake);
    }
  } else if (tier === 'keep') {
    const stoneMat = makeMat(0x889098, 0.88);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.34), stoneMat);
    tower.position.y = 0.21;
    tower.castShadow = true;
    group.add(tower);
  } else {
    const stoneMat = makeMat(0x889098, 0.88);
    const keep = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.32), stoneMat);
    keep.position.y = 0.24;
    group.add(keep);
    const corners = [
      [-0.28, -0.28],
      [0.28, -0.28],
      [-0.28, 0.28],
      [0.28, 0.28],
    ];
    for (const [cx, cz] of corners) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.34, 6), stoneMat);
      t.position.set(cx, 0.17, cz);
      group.add(t);
    }
  }

  return group;
}

/**
 * Builds a combined-squad army visual:
 * 1 unit model per squad in the army + an allegiance standard (gray if neutral).
 */
export function createOverviewCombinedArmyVisual(
  army: OverviewArmy,
  playerColorHex: string = '#8c929a',
  bannerName?: string
): THREE.Group {
  const group = new THREE.Group();
  group.name = `OverviewArmy_${army.id}`;
  group.userData = { isOverviewArmy: true, armyId: army.id };

  const isNeutral = army.ownerPlayerId === null;
  const armyAlignment = isNeutral ? 1 : 0;
  const flagColor = playerColorHex;

  const squads = army.squads;
  const count = squads.length;
  const ringRadius = count <= 1 ? 0 : 0.34;

  const unitTeamColorHex = parseColorToHex(flagColor);
  squads.forEach((sq, idx) => {
    const unitOpts = { playerColor: flagColor, bannerName };
    let unitMesh: THREE.Object3D;
    let baseScale = 0.63;
    switch (sq.creatureType) {
      case CreatureType.PEASANT:
        unitMesh = createOverviewPeasantModel(707 + idx * 31, unitOpts);
        break;
      case CreatureType.SPEARMAN:
        unitMesh = createOverviewSpearmanModel(809 + idx * 31, unitOpts);
        break;
      case CreatureType.ARCHER:
      case CreatureType.PEASANT_ARCHER:
        unitMesh = createOverviewArcherModel(907 + idx * 31, unitOpts);
        break;
      case CreatureType.CROSSBOWMAN:
        unitMesh = createOverviewCrossbowmanModel(1009 + idx * 31, unitOpts);
        break;
      case CreatureType.SWORDSMAN:
        unitMesh = createOverviewSwordsmanModel(1103 + idx * 31, unitOpts);
        break;
      case CreatureType.MACEMAN:
        unitMesh = createOverviewMacemanModel(1201 + idx * 31, unitOpts);
        break;
      case CreatureType.ARMORED_KNIGHT:
        unitMesh = createOverviewArmoredKnightModel(1301 + idx * 31, unitOpts);
        baseScale = 0.56;
        break;
      case CreatureType.HERO_COMMANDER:
      case CreatureType.BEHEMOTH:
      case CreatureType.HEAVY_KNIGHTS:
        return;
      default:
        unitMesh = buildArticulatedUnit3DMesh(sq.creatureType, armyAlignment, false, unitTeamColorHex);
        baseScale = 0.38;
        break;
    }
    unitMesh.scale.setScalar(baseScale);
    unitMesh.userData = {
      ...unitMesh.userData,
      isOverviewUnit: true,
      baseScale,
      idlePhase: idx * 1.15,
    };

    if (count === 1) {
      unitMesh.position.set(0, 0, 0);
    } else {
      const angle = (idx / count) * Math.PI * 2;
      const r = idx >= 6 ? ringRadius * 0.52 : ringRadius;
      unitMesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    }
    group.add(unitMesh);
  });

  // Allegiance standard (pole + wind-animated flag)
  const flag = createOverviewWindFlag(flagColor, 0.85, 0.34, 0.2, bannerName);
  group.add(flag);
  return group;
}
