import { Creature } from './creature';
import { ArmyControlType } from '../battle';

export interface BattleConfig {
  mapWidth: number;
  mapHeight: number;
  creatures: Creature[];
  terrainTiles?: number[][];
  armyControl?: ArmyControlType[];
}

export interface BattleResult {
  victorArmyIndex: number;
  turnsTaken: number;
  survivingCreatures: Creature[];
  casualties: Creature[];
}
