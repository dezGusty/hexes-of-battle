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

export const REGION_SIZE = 6;

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
function addSymmetricConnection(
  listA: Coords[] | undefined,
  b: Coords
): Coords[] {
  const arr = listA ? [...listA] : [];
  if (!arr.some((c) => c.x === b.x && c.y === b.y)) {
    arr.push({ x: b.x, y: b.y });
  }
  return arr;
}

function removeConnection(listA: Coords[] | undefined, b: Coords): Coords[] {
  if (!listA) return [];
  return listA.filter((c) => c.x !== b.x || c.y !== b.y);
}

export function hexesConnectedByRiver(a: OverviewHex, b: OverviewHex): boolean {
  return (
    a.riverConnections?.some((c) => c.x === b.coords.x && c.y === b.coords.y) ??
    false
  );
}

export function hexesConnectedByRoad(a: OverviewHex, b: OverviewHex): boolean {
  return (
    a.roadConnections?.some((c) => c.x === b.coords.x && c.y === b.coords.y) ??
    false
  );
}

function connectRiverHexes(a: OverviewHex, b: OverviewHex): void {
  a.hasRiver = true;
  b.hasRiver = true;
  a.riverConnections = addSymmetricConnection(a.riverConnections, b.coords);
  b.riverConnections = addSymmetricConnection(b.riverConnections, a.coords);
}

function disconnectRiverHexes(a: OverviewHex, b: OverviewHex): void {
  a.riverConnections = removeConnection(a.riverConnections, b.coords);
  b.riverConnections = removeConnection(b.riverConnections, a.coords);
  if (a.riverConnections.length === 0) a.hasRiver = false;
  if (b.riverConnections.length === 0) b.hasRiver = false;
}

function connectRoadHexes(a: OverviewHex, b: OverviewHex): void {
  a.hasRoad = true;
  b.hasRoad = true;
  a.roadConnections = addSymmetricConnection(a.roadConnections, b.coords);
  b.roadConnections = addSymmetricConnection(b.roadConnections, a.coords);
}

function getBaseTerrainElevation(terrain: OverviewTerrainType): number {
  switch (terrain) {
    case 'mountain':
      return 1.575;
    case 'hill':
      return 0.918;
    case 'deep_forest':
      return 0.28;
    case 'forest':
      return 0.25;
    case 'swamp':
      return 0.15;
    case 'water':
      return -0.36;
    case 'grassland':
    default:
      return 0.22;
  }
}

function assignHexElevations(
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number,
  rng: SeedableRNG
): void {
  for (let x = 0; x < mapWidth; x++) {
    for (let y = 0; y < mapHeight; y++) {
      const hex = hexes[x][y];
      const base = getBaseTerrainElevation(hex.terrain);
      // Slight gentle slope + deterministic micro-variation so rivers flow naturally
      const slope = ((mapWidth - 1 - x) + (mapHeight - 1 - y)) * 0.008;
      const jitter = (rng.next() - 0.5) * 0.04;
      hex.elevation = base + (hex.terrain === 'water' ? 0 : slope + jitter);
    }
  }
}

function generateRiversAndLakes(
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number,
  rng: SeedableRNG
): void {
  const highCandidates: OverviewHex[] = [];
  for (let x = 0; x < mapWidth; x++) {
    for (let y = 0; y < mapHeight; y++) {
      const h = hexes[x][y];
      if (
        h.terrain !== 'water' &&
        !h.isSettlement &&
        !h.isDefenseHex &&
        !h.resourceBuilding &&
        !h.isAgriculturalPlot &&
        (h.terrain === 'hill' || (h.elevation ?? 0) >= 0.3)
      ) {
        highCandidates.push(h);
      }
    }
  }

  // Sort highest first with slight deterministic shuffle
  highCandidates.sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0));
  const targetRivers = Math.max(2, Math.min(4, Math.floor((mapWidth * mapHeight) / 36)));

  let createdRivers = 0;
  for (let idx = 0; idx < highCandidates.length && createdRivers < targetRivers; idx++) {
    // Pick spaced-out sources
    const pickIdx = Math.min(
      highCandidates.length - 1,
      idx * Math.max(1, Math.floor(highCandidates.length / (targetRivers * 2)))
    );
    const source = highCandidates[pickIdx];
    if (source.hasRiver || source.terrain === 'water') continue;

    // Ensure source isn't immediately adjacent to an existing river
    const adjToRiver = HexMap.getNeighboursInBounds(source.coords, mapWidth, mapHeight).some(
      (n) => hexes[n.x][n.y].hasRiver
    );
    if (adjToRiver) continue;

    const trace: OverviewHex[] = [source];
    const inTrace = new Set<string>([coordKey(source.coords)]);
    let curr = source;
    let mergedOrSea = false;

    for (let step = 0; step < mapWidth + mapHeight; step++) {
      const currElev = curr.elevation ?? 0;
      const neighbors = HexMap.getNeighboursInBounds(curr.coords, mapWidth, mapHeight)
        .map((n) => hexes[n.x][n.y])
        .filter((nh) => !inTrace.has(coordKey(nh.coords)));

      // Check if we can empty into an existing water hex or merge into an existing river
      const waterTarget = neighbors.find((nh) => nh.terrain === 'water');
      if (waterTarget) {
        if (trace.length >= 2) {
          connectRiverHexes(curr, waterTarget);
          mergedOrSea = true;
        }
        break;
      }

      const mergeTarget = neighbors.find(
        (nh) => nh.hasRiver && (nh.elevation ?? 0) <= currElev
      );
      if (mergeTarget) {
        connectRiverHexes(curr, mergeTarget);
        mergedOrSea = true;
        break;
      }

      // Otherwise flow strictly downstream to an unoccupied neighbor
      const downstream = neighbors
        .filter(
          (nh) =>
            (nh.elevation ?? 0) < currElev &&
            !nh.isSettlement &&
            !nh.isDefenseHex &&
            !nh.resourceBuilding &&
            !nh.isAgriculturalPlot
        )
        .sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0));

      if (downstream.length === 0) {
        // Cannot go further downstream -> end into a lake
        break;
      }

      const pick =
        downstream.length > 1 && rng.next() < 0.25 ? downstream[1] : downstream[0];
      trace.push(pick);
      inTrace.add(coordKey(pick.coords));
      curr = pick;
    }

    if (trace.length >= 2) {
      for (let i = 0; i < trace.length - 1; i++) {
        connectRiverHexes(trace[i], trace[i + 1]);
      }
      if (!mergedOrSea) {
        const endHex = trace[trace.length - 1];
        endHex.terrain = 'water';
        endHex.isLake = true;
        endHex.elevation = -0.36;
      }
      createdRivers++;
    }
  }
}

function findRoadPath(
  start: Coords,
  goal: Coords,
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number,
  options: { allowCarveTerrain: boolean; allowRemoveRivers: boolean }
): Coords[] | null {
  const startKey = coordKey(start);
  const goalKey = coordKey(goal);
  const costs = new Map<string, number>([[startKey, 0]]);
  const parents = new Map<string, Coords>();
  const queue: Array<{ coords: Coords; cost: number }> = [{ coords: start, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const curr = queue.shift()!;
    const cKey = coordKey(curr.coords);
    if (cKey === goalKey) break;
    if (curr.cost > (costs.get(cKey) ?? Infinity)) continue;

    const currHex = hexes[curr.coords.x][curr.coords.y];
    const prevCoord = parents.get(cKey);
    const neighbors = HexMap.getNeighboursInBounds(curr.coords, mapWidth, mapHeight);

    for (const n of neighbors) {
      if (prevCoord && n.x === prevCoord.x && n.y === prevCoord.y) continue;
      const nHex = hexes[n.x][n.y];
      if (!nHex) continue;

      const sharesRiverEdge = hexesConnectedByRiver(currHex, nHex);
      if (sharesRiverEdge && !options.allowRemoveRivers) {
        continue;
      }

      if (nHex.terrain === 'water' && !options.allowRemoveRivers) {
        continue;
      }

      const impassable = nHex.terrain === 'mountain' || nHex.terrain === 'deep_forest';
      if (impassable && !options.allowCarveTerrain) {
        continue;
      }

      let stepCost = 1.5;
      if (hexesConnectedByRoad(currHex, nHex)) {
        stepCost = 0.6; // Strongly reuse existing road network
      } else if (nHex.hasRiver && !nHex.isLake) {
        stepCost = 3.0; // Bridge crossing cost
      } else if (nHex.terrain === 'hill') {
        stepCost = 2.2;
      } else if (nHex.terrain === 'forest' || nHex.terrain === 'swamp') {
        stepCost = 2.5;
      } else if (impassable) {
        stepCost = 8.0;
      } else if (nHex.terrain === 'water') {
        stepCost = 12.0;
      }
      if (sharesRiverEdge) {
        stepCost += 25.0; // Last resort in Pass 3
      }

      const nextCost = curr.cost + stepCost;
      const nKey = coordKey(n);
      if (nextCost < (costs.get(nKey) ?? Infinity)) {
        costs.set(nKey, nextCost);
        parents.set(nKey, { ...curr.coords });
        queue.push({ coords: n, cost: nextCost });
      }
    }
  }

  if (!parents.has(goalKey) && startKey !== goalKey) {
    return null;
  }

  const path: Coords[] = [goal];
  let cur = goal;
  while (coordKey(cur) !== startKey) {
    const p = parents.get(coordKey(cur));
    if (!p) return null;
    path.unshift(p);
    cur = p;
  }
  return path;
}

function commitRoadPath(
  path: Coords[],
  hexes: OverviewHex[][],
  allowRemoveRivers: boolean
): void {
  for (let i = 0; i < path.length; i++) {
    const h = hexes[path[i].x][path[i].y];
    if (h.terrain === 'mountain' || h.terrain === 'deep_forest') {
      h.terrain = 'grassland';
      h.elevation = getBaseTerrainElevation('grassland');
    } else if (h.terrain === 'water' && allowRemoveRivers) {
      h.terrain = 'grassland';
      h.isLake = false;
      h.elevation = getBaseTerrainElevation('grassland');
    }

    if (i < path.length - 1) {
      const next = hexes[path[i + 1].x][path[i + 1].y];
      if (allowRemoveRivers && hexesConnectedByRiver(h, next)) {
        disconnectRiverHexes(h, next);
      }
      connectRoadHexes(h, next);
    }

    if (h.hasRiver && !h.isLake) {
      h.hasBridge = true;
    }
  }
}

function generateRoadsBetweenRegions(
  regions: RegionState[],
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number
): void {
  const standardRegions = regions.filter((r) => Boolean(r.settlementCoords));
  const pairs: Array<[RegionState, RegionState]> = [];
  for (let i = 0; i < standardRegions.length; i++) {
    for (let j = i + 1; j < standardRegions.length; j++) {
      const a = standardRegions[i];
      const b = standardRegions[j];
      const dx = Math.abs(a.gridCoords.x - b.gridCoords.x);
      const dy = Math.abs(a.gridCoords.y - b.gridCoords.y);
      if (dx + dy === 1) {
        pairs.push([a, b]);
      }
    }
  }

  const pending = new Set<number>(pairs.map((_, idx) => idx));

  // Pass 1: Clean road routing over passable land & river bridges (no shared river edges)
  // Pass 2: Allow carving through mountains / deep forest while still preserving rivers
  // Pass 3: If still unresolved, allow roads to remove conflicting rivers/lakes
  const passConfigs = [
    { allowCarveTerrain: false, allowRemoveRivers: false },
    { allowCarveTerrain: true, allowRemoveRivers: false },
    { allowCarveTerrain: true, allowRemoveRivers: true },
  ];

  for (const cfg of passConfigs) {
    if (pending.size === 0) break;
    for (const idx of Array.from(pending)) {
      const [a, b] = pairs[idx];
      const path = findRoadPath(
        a.settlementCoords!,
        b.settlementCoords!,
        hexes,
        mapWidth,
        mapHeight,
        cfg
      );
      if (path) {
        commitRoadPath(path, hexes, cfg.allowRemoveRivers);
        pending.delete(idx);
      }
    }
  }
}

function pickSettlementCoordsForRegion(
  startX: number,
  startY: number,
  rng: SeedableRNG
): Coords {
  const centerSquares: Coords[] = [];
  const secondRing: Coords[] = [];
  const outerRing: Coords[] = [];

  for (let dx = 0; dx < REGION_SIZE; dx++) {
    for (let dy = 0; dy < REGION_SIZE; dy++) {
      const c = { x: startX + dx, y: startY + dy };
      const inCenter = dx >= 2 && dx <= 3 && dy >= 2 && dy <= 3;
      const inSecondRing = !inCenter && dx >= 1 && dx <= 4 && dy >= 1 && dy <= 4;
      if (inCenter) {
        centerSquares.push(c);
      } else if (inSecondRing) {
        secondRing.push(c);
      } else {
        outerRing.push(c);
      }
    }
  }

  const roll = rng.next();
  const bucket =
    roll < 0.65 && centerSquares.length > 0
      ? centerSquares
      : roll < 0.95 && secondRing.length > 0
        ? secondRing
        : outerRing.length > 0
          ? outerRing
          : centerSquares;

  return bucket[rng.range(0, bucket.length - 1)];
}

function pickDefenseCoordsForSettlement(
  settlementCoords: Coords,
  regionId: string,
  hexes: OverviewHex[][],
  mapWidth: number,
  mapHeight: number
): Coords {
  const neighbors = HexMap.getNeighboursInBounds(settlementCoords, mapWidth, mapHeight);
  const inRegion = neighbors.filter((n) => hexes[n.x][n.y]?.regionId === regionId);
  const preferred =
    inRegion.find((n) => hexes[n.x][n.y].terrain !== 'water') ?? inRegion[0];
  return preferred ?? { ...settlementCoords };
}

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

    const settlementCoords = pickSettlementCoordsForRegion(startX, startY, rng);
    const defenseCoords = pickDefenseCoordsForSettlement(
      settlementCoords,
      spec.id,
      hexes,
      mapWidth,
      mapHeight
    );

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

  assignHexElevations(hexes, mapWidth, mapHeight, rng);
  generateRiversAndLakes(hexes, mapWidth, mapHeight, rng);
  generateRoadsBetweenRegions(regions, hexes, mapWidth, mapHeight);
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

function createStarterGarrison(isPlayer: boolean, rng: SeedableRNG): ArmySquad[] {
  if (isPlayer) {
    return [
      { creatureType: CreatureType.SWORDSMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
      { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    ];
  }
  const pool: ArmySquad[] = [
    { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.SWORDSMAN, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT_ARCHER, count: 8, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.PEASANT, count: 12, hpPercent: 1.0 },
    { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1.0 },
  ];
  const count = rng.range(5, 7);
  return pool.slice(0, count);
}

/**
 * Creates the 2x2 region starter map for playtesting:
 * 1 player-controlled region (6-squad army) + 3 neutral regions (5-7 squad armies each),
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

  const armyRng = new SeedableRNG(seed + 101);
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
        squads: createStarterGarrison(isPlayer, armyRng),
        isGarrison: true,
      };
    });

  return generated;
}
