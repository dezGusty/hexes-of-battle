import { Coords } from '../shared';
import { CreatureType } from '../battle/creature';

export type OverviewTerrainType =
  | 'grassland'
  | 'forest'
  | 'swamp'
  | 'hill'
  | 'mountain'
  | 'deep_forest'
  | 'water';

export function isOverviewTerrainPassable(terrain: OverviewTerrainType): boolean {
  return terrain !== 'mountain' && terrain !== 'deep_forest' && terrain !== 'water';
}

export type SettlementTier = 'village' | 'town' | 'city';

export type ResourceBuildingType = 'lumber_camp' | 'quarry' | 'iron_mine' | 'gold_mine';

export type AgricultureOption = 'none' | 'wheat' | 'cattle' | 'sheep' | 'horses';

export type DefenseStructureTier = 'none' | 'palisade' | 'keep' | 'castle';

export type OverviewResourceType =
  | 'money'
  | 'food'
  | 'lumber'
  | 'stone'
  | 'iron'
  | 'grain'
  | 'sheep'
  | 'cattle'
  | 'horses';

export type ResourcePool = Record<OverviewResourceType, number>;

export function createEmptyResourcePool(overrides?: Partial<ResourcePool>): ResourcePool {
  return {
    money: 0,
    food: 0,
    lumber: 0,
    stone: 0,
    iron: 0,
    grain: 0,
    sheep: 0,
    cattle: 0,
    horses: 0,
    ...overrides,
  };
}

export type RegionPreset = 'grassland' | 'forest' | 'swamp' | 'water' | 'mountains';

export type OverviewVictoryCondition = 'conquer_all' | 'conquer_80_percent' | 'eliminate_rivals';

export interface OverviewHex {
  coords: Coords;
  regionId: string;
  terrain: OverviewTerrainType;
  isSettlement?: boolean;
  resourceBuilding?: ResourceBuildingType;
  isAgriculturalPlot?: boolean;
  agricultureOption?: AgricultureOption;
  isDefenseHex?: boolean;
  assignedWorkers: number;
}

export interface RegionState {
  id: string;
  name: string;
  gridCoords: Coords;
  preset: RegionPreset;
  ownerPlayerId: string | null;
  settlementTier?: SettlementTier;
  settlementCoords?: Coords;
  population: number;
  maxPopulation: number;
  defenseTier: DefenseStructureTier;
  defenseCoords?: Coords;
  taxRate: number;
  hexCoords: Coords[];
}

export interface ArmySquad {
  creatureType: CreatureType;
  count: number;
  hpPercent: number;
}

export const DEFAULT_ARMY_SIGHT_RANGE = 6;

export interface OverviewArmy {
  id: string;
  ownerPlayerId: string | null;
  coords: Coords;
  movementPoints: number;
  maxMovementPoints: number;
  sightRange?: number;
  squads: ArmySquad[];
  isGarrison?: boolean;
}

export interface OverviewPlayer {
  id: string;
  name: string;
  isAI: boolean;
  color: string;
  resources: ResourcePool;
  eliminated: boolean;
}

export interface OverviewCampaignConfig {
  mapRegionWidth: number;
  mapRegionHeight: number;
  victoryCondition: OverviewVictoryCondition;
  seed?: number;
}
