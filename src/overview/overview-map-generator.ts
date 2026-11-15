import { SeedableRNG } from '../shared/prng';
import { Coords } from '../shared';
import { HexMap } from '../shared/hex-map';
import { CreatureType } from '../battle/creature';
import {
  ArmySquad,
  createEmptyResourcePool,
  isOverviewTerrainPassable,
  OverviewArmy,
  OverviewCampaignConfig,
  OverviewHex,
  OverviewPlayer,
  OverviewTerrainType,
  RegionPreset,
  RegionState,
  ResourceBuildingType,
  SettlementTier,
} from './overview-types';

export const REGION_SIZE = 5;

export interface RegionGenerationSpec {
  id: string;
  name: string;
  gridCoords: Coords;
  preset: RegionPreset;
  ownerPlayerId: string | null;
  settlementTier?: SettlementTier;
  initialPopulation?: number;
}

export interface GeneratedOverviewMap {
  config: OverviewCampaignConfig;
  mapWidth: number;
  mapHeight: number;
  hexes: OverviewHex[][];
  regions: RegionState[];
  players: OverviewPlayer[];
  armies: OverviewArmy[];
}

function coordKey(c: Coords): string {
  return `${c.x},${c.y}`;
}

function pickTerrainForPreset(preset: RegionPreset, rng: SeedableRNG): OverviewTerrainType {
  const roll = rng.next() * 100;
  switch (preset) {
    case 'swamp':
      // 35-45% swamp, rest grass/forest/water/deep_forest
      if (roll < 40) return 'swamp';
      if (roll < 72) return 'grassland';
      if (roll < 86) return 'forest';
      if (roll < 94) return 'water';
      return 'deep_forest';
    case 'forest':
      if (roll < 42) return 'forest';
      if (roll < 56) return 'deep_forest';
      if (roll < 86) return 'grassland';
      if (roll < 94) return 'hill';
      return 'water';
    case 'grassland':
    default:
      // 55-75% grassland, some forest, water, hill, mountain
      if (roll < 65) return 'grassland';
      if (roll < 80) return 'forest';
      if (roll < 88) return 'hill';
      if (roll < 94) return 'water';
      return 'mountain';
  }
}

function carvePassableLine(
  from: Coords,
  to: Coords,
  hexes: OverviewHex[][]
): void {
  let cx = from.x;
  let cy = from.y;
  let guard = 0;
  while ((cx !== to.x || cy !== to.y) && guard < 100) {
    guard++;
    const hex = hexes[cx]?.[cy];
    if (hex && !isOverviewTerrainPassable(hex.terrain)) {
      hex.terrain = 'grassland';
    }
    if (Math.abs(to.x - cx) >= Math.abs(to.y - cy)) {
      cx += Math.sign(to.x - cx);
    } else {
      cy += Math.sign(to.y - cy);
    }
  }
  const endHex = hexes[to.x]?.[to.y];
  if (endHex && !isOverviewTerrainPassable(endHex.terrain)) {
    endHex.terrain = 'grassland';
  }
}

function collectReachableCoords(
  start: Coords,
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number,
  restrictToRegionId?: string
): Set<string> {
  const visited = new Set<string>();
  const queue: Coords[] = [start];
  visited.add(coordKey(start));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = HexMap.getNeighboursInBounds(curr, mapWidth, mapHeight);
    for (const n of neighbors) {
      const key = coordKey(n);
      if (visited.has(key)) continue;
      const nHex = hexes[n.x]?.[n.y];
      if (!nHex) continue;
      if (restrictToRegionId && nHex.regionId !== restrictToRegionId) continue;
      if (!isOverviewTerrainPassable(nHex.terrain)) continue;
      visited.add(key);
      queue.push(n);
    }
  }
  return visited;
}

/**
 * Ensures all key locations inside each standard region are reachable from its settlement
 * and all adjacent standard regions have a passable route between their settlements.
 */
export function enforceOverviewMapConnectivity(
  regions: RegionState[],
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number
): void {
  // 1. Intra-region connectivity
  for (const region of regions) {
    if (!region.settlementCoords) continue;
    let reachable = collectReachableCoords(
      region.settlementCoords,
      hexes,
      mapWidth,
      mapHeight,
      region.id
    );

    for (const c of region.hexCoords) {
      const hex = hexes[c.x][c.y];
      const isImportant =
        hex.isSettlement ||
        hex.isDefenseHex ||
        hex.isAgriculturalPlot ||
        hex.resourceBuilding !== undefined;
      if (isImportant && !reachable.has(coordKey(c))) {
        carvePassableLine(region.settlementCoords, c, hexes);
        reachable = collectReachableCoords(
          region.settlementCoords,
          hexes,
          mapWidth,
          mapHeight,
          region.id
        );
      }
    }
  }

  // 2. Inter-region connectivity between adjacent standard regions
  const standardRegions = regions.filter((r) => Boolean(r.settlementCoords));
  for (let i = 0; i < standardRegions.length; i++) {
    for (let j = i + 1; j < standardRegions.length; j++) {
      const a = standardRegions[i];
      const b = standardRegions[j];
      const dx = Math.abs(a.gridCoords.x - b.gridCoords.x);
      const dy = Math.abs(a.gridCoords.y - b.gridCoords.y);
      if (dx + dy !== 1) continue;

      const reachable = collectReachableCoords(
        a.settlementCoords!,
        hexes,
        mapWidth,
        mapHeight
      );
      if (!reachable.has(coordKey(b.settlementCoords!))) {
        carvePassableLine(a.settlementCoords!, b.settlementCoords!, hexes);
      }
    }
  }
}

export function generateOverviewMap(
  specs: RegionGenerationSpec[],
  config: OverviewCampaignConfig
): GeneratedOverviewMap {
  const rng = new SeedableRNG(config.seed ?? 1337);
  const mapWidth = config.mapRegionWidth * REGION_SIZE;
  const mapHeight = config.mapRegionHeight * REGION_SIZE;

  const hexes: OverviewHex[][] = [];
  for (let x = 0; x < mapWidth; x++) {
    hexes[x] = [];
    for (let y = 0; y < mapHeight; y++) {
      hexes[x][y] = {
        coords: { x, y },
        regionId: '',
        terrain: 'grassland',
        assignedWorkers: 0,
      };
    }
  }

  const regions: RegionState[] = [];

  for (const spec of specs) {
    const startX = spec.gridCoords.x * REGION_SIZE;
    const startY = spec.gridCoords.y * REGION_SIZE;
    const hexCoords: Coords[] = [];

    const isSpecial = spec.preset === 'water' || spec.preset === 'mountains';
    for (let dx = 0; dx < REGION_SIZE; dx++) {
      for (let dy = 0; dy < REGION_SIZE; dy++) {
        const gx = startX + dx;
        const gy = startY + dy;
        hexCoords.push({ x: gx, y: gy });
        const hex = hexes[gx][gy];
        hex.regionId = spec.id;
        hex.terrain = isSpecial
          ? spec.preset === 'water'
            ? 'water'
            : 'mountain'
          : pickTerrainForPreset(spec.preset, rng);
      }
    }

    if (isSpecial) {
      regions.push({
        id: spec.id,
        name: spec.name,
        gridCoords: { ...spec.gridCoords },
        preset: spec.preset,
        ownerPlayerId: null,
        population: 0,
        maxPopulation: 0,
        defenseTier: 'none',
        taxRate: 1.0,
        hexCoords,
      });
      continue;
    }

    const settlementCoords: Coords = { x: startX + 2, y: startY + 2 };
    const defenseCoords: Coords = { x: startX + 2, y: startY + 1 };

    const settlementHex = hexes[settlementCoords.x][settlementCoords.y];
    settlementHex.terrain = spec.preset === 'swamp' ? 'swamp' : 'grassland';
    settlementHex.isSettlement = true;

    const defenseHex = hexes[defenseCoords.x][defenseCoords.y];
    defenseHex.terrain = 'grassland';
    defenseHex.isDefenseHex = true;

    const candidatePlots = hexCoords.filter((c) => {
      const h = hexes[c.x][c.y];
      return !h.isSettlement && !h.isDefenseHex;
    });

    // Shuffle candidates deterministically
    for (let i = candidatePlots.length - 1; i > 0; i--) {
      const j = rng.range(0, i);
      const tmp = candidatePlots[i];
      candidatePlots[i] = candidatePlots[j];
      candidatePlots[j] = tmp;
    }

    // Place 1-3 resource buildings depending on preset
    const buildingsToPlace: ResourceBuildingType[] =
      spec.preset === 'forest'
        ? ['lumber_camp', 'lumber_camp', 'quarry']
        : spec.preset === 'swamp'
          ? ['lumber_camp']
          : ['lumber_camp', 'quarry', 'iron_mine'];

    let cursor = 0;
    for (const bType of buildingsToPlace) {
      if (cursor >= candidatePlots.length) break;
      const c = candidatePlots[cursor++];
      const h = hexes[c.x][c.y];
      h.terrain = bType === 'lumber_camp' ? 'forest' : bType === 'quarry' || bType === 'iron_mine' ? 'hill' : 'grassland';
      h.resourceBuilding = bType;
    }

    // Place 4 to 12 agricultural plots (standard regions)
    const desiredAgriCount =
      spec.preset === 'swamp' ? rng.range(4, 6) : rng.range(6, 10);
    let placedAgri = 0;
    while (placedAgri < desiredAgriCount && cursor < candidatePlots.length) {
      const c = candidatePlots[cursor++];
      const h = hexes[c.x][c.y];
      h.terrain = 'grassland';
      h.isAgriculturalPlot = true;
      h.agricultureOption = placedAgri % 2 === 0 ? 'wheat' : 'cattle';
      placedAgri++;
    }

    const settlementTier: SettlementTier =
      spec.settlementTier ?? (spec.preset === 'swamp' ? 'village' : 'town');

    regions.push({
      id: spec.id,
      name: spec.name,
      gridCoords: { ...spec.gridCoords },
      preset: spec.preset,
      ownerPlayerId: spec.ownerPlayerId,
      settlementTier,
      settlementCoords,
      population: spec.initialPopulation ?? (spec.preset === 'swamp' ? 350 : 600),
      maxPopulation: 4999,
      defenseTier: 'none',
      defenseCoords,
      taxRate: 1.0,
      hexCoords,
    });
  }

  enforceOverviewMapConnectivity(regions, hexes, mapWidth, mapHeight);

  return {
    config,
    mapWidth,
    mapHeight,
    hexes,
    regions,
    players: [],
    armies: [],
  };
}

function createFullTenSquadGarrison(isPlayer: boolean): ArmySquad[] {
  if (isPlayer) {
    return [
      { creatureType: CreatureType.SWORDSMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.SWORDSMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    ];
  }
  return [
    { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.SWORDSMAN, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
  ];
}

/**
 * Creates the 2x2 region starter map for playtesting:
 * 1 player-controlled region + 3 neutral regions, each defended by a 10-squad army,
 * with victory condition set to Conquer All Regions.
 */
export function createStarterOverviewMap(seed: number = 42): GeneratedOverviewMap {
  const specs: RegionGenerationSpec[] = [
    {
      id: 'region_0_0',
      name: 'Westmarch (Player)',
      gridCoords: { x: 0, y: 0 },
      preset: 'grassland',
      ownerPlayerId: 'player',
      settlementTier: 'town',
      initialPopulation: 800,
    },
    {
      id: 'region_1_0',
      name: 'Pinewood (Neutral)',
      gridCoords: { x: 1, y: 0 },
      preset: 'forest',
      ownerPlayerId: null,
      settlementTier: 'village',
      initialPopulation: 500,
    },
    {
      id: 'region_0_1',
      name: 'Greenvale (Neutral)',
      gridCoords: { x: 0, y: 1 },
      preset: 'grassland',
      ownerPlayerId: null,
      settlementTier: 'town',
      initialPopulation: 650,
    },
    {
      id: 'region_1_1',
      name: 'Mirefen (Neutral)',
      gridCoords: { x: 1, y: 1 },
      preset: 'swamp',
      ownerPlayerId: null,
      settlementTier: 'village',
      initialPopulation: 400,
    },
  ];

  const generated = generateOverviewMap(specs, {
    mapRegionWidth: 2,
    mapRegionHeight: 2,
    victoryCondition: 'conquer_all',
    seed,
  });

  generated.players = [
    {
      id: 'player',
      name: 'Player',
      isAI: false,
      color: '#3498db',
      resources: createEmptyResourcePool({
        money: 300,
        food: 100,
        lumber: 40,
        stone: 20,
        iron: 30,
      }),
      eliminated: false,
    },
  ];

  generated.armies = generated.regions
    .filter((r) => Boolean(r.settlementCoords))
    .map((region, index) => {
      const isPlayer = region.ownerPlayerId === 'player';
      return {
        id: `army_${region.id}_${index}`,
        ownerPlayerId: region.ownerPlayerId,
        coords: { ...region.settlementCoords! },
        movementPoints: 4,
        maxMovementPoints: 4,
        squads: createFullTenSquadGarrison(isPlayer),
        isGarrison: true,
      };
    });

  return generated;
}
