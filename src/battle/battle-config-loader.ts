import { ArmyControlType } from '../battle';
import { BattleConfig } from './battle-types';
import { Creature, CreatureType } from './creature';
import { CreatureRepository } from './creature-repository';
import { CPUPersonalityType } from './cpu-player';
import { Coords } from '../shared';
import { HexDirection } from '../shared/hex-map';
import { BattleLocationType } from '../render3d/decorations/battle-environment-3d';
import { WindConfig } from '../render3d/decorations/wind-system';

export interface BattleCreaturePlacement {
  type: CreatureType | string;
  position: Coords;
  army: number;
  facing?: HexDirection | keyof typeof HexDirection | string;
  extraMoves?: number;
}

export interface BattleConfigJson {
  mapWidth: number;
  mapHeight: number;
  creatures: BattleCreaturePlacement[];
  terrainTiles?: number[][];
  armyControl?: ArmyControlType[];
  aiPersonality?: CPUPersonalityType | string;
  armyNames?: [string, string];
  seed?: number;
  maxTurns?: number;
  retreatPoints?: Record<number, Coords[]> | Coords[][];
  majorTerrainType?: BattleLocationType | string;
  battleLocationType?: BattleLocationType | string;
  locationType?: BattleLocationType | string;
  wind?: WindConfig;
}

export function parseHexDirection(
  facing?: HexDirection | keyof typeof HexDirection | string,
  fallback: HexDirection = HexDirection.EAST
): HexDirection {
  if (typeof facing === 'number') {
    return facing;
  }
  if (typeof facing === 'string') {
    const key = facing.trim().toUpperCase() as keyof typeof HexDirection;
    if (key in HexDirection && typeof HexDirection[key] === 'number') {
      return HexDirection[key];
    }
  }
  return fallback;
}

/**
 * Converts a JSON-serializable BattleConfigJson definition into a runtime BattleConfig
 * with instantiated Creature objects ready for Battle.initializeFromConfig().
 */
export function buildBattleConfigFromJson(
  json: BattleConfigJson,
  creatureRepository: CreatureRepository
): BattleConfig {
  const creatures: Creature[] = (json.creatures ?? []).map((entry) => {
    const creature =
      typeof entry.type === 'number'
        ? creatureRepository.createCreature(entry.type)
        : creatureRepository.createCreatureByName(entry.type);

    creature.position = { ...entry.position };
    creature.armyAlignment = entry.army;
    creature.facingDirection = parseHexDirection(
      entry.facing,
      entry.army === 1 ? HexDirection.WEST : HexDirection.EAST
    );
    if (entry.extraMoves !== undefined) {
      creature.stats.num_moves = entry.extraMoves;
      creature.stats.remaining_movement = entry.extraMoves;
    }
    return creature;
  });

  return {
    mapWidth: json.mapWidth,
    mapHeight: json.mapHeight,
    creatures,
    terrainTiles: json.terrainTiles,
    armyControl: json.armyControl,
    aiPersonality: json.aiPersonality,
    armyNames: json.armyNames,
    seed: json.seed,
    maxTurns: json.maxTurns,
    retreatPoints: json.retreatPoints,
    majorTerrainType: json.majorTerrainType,
    battleLocationType: json.battleLocationType,
    locationType: json.locationType,
    wind: json.wind,
  };
}

/**
 * Resizes a BattleConfig to the target map dimensions and ensures all
 * initial creature placements fit within `[0..mapWidth-1, 0..mapHeight-1]`
 * without overlapping.
 */
export function fitBattleConfigToMapSize(
  config: BattleConfig,
  mapWidth: number,
  mapHeight: number
): BattleConfig {
  const occupied = new Set<string>();
  const creatures = config.creatures.map((creature) => {
    const pos = creature.position ?? { x: 0, y: 0 };
    let x = Math.max(0, Math.min(mapWidth - 1, pos.x));
    let y = Math.max(0, Math.min(mapHeight - 1, pos.y));
    if (occupied.has(`${x},${y}`)) {
      const startX = creature.armyAlignment === 1 ? mapWidth - 2 : 1;
      const stepX = creature.armyAlignment === 1 ? -1 : 1;
      outer: for (let colOffset = 0; colOffset < mapWidth; colOffset++) {
        const cx = Math.max(0, Math.min(mapWidth - 1, startX + stepX * colOffset));
        for (let cy = 0; cy < mapHeight; cy++) {
          if (!occupied.has(`${cx},${cy}`)) {
            x = cx;
            y = cy;
            break outer;
          }
        }
      }
    }
    occupied.add(`${x},${y}`);
    creature.position = { x, y };
    return creature;
  });

  return {
    ...config,
    mapWidth,
    mapHeight,
    creatures,
  };
}
