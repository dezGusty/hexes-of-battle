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
