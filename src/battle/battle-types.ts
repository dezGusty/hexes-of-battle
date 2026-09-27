import { Creature } from './creature';
import { ArmyControlType } from '../battle';
import { CPUPersonalityType } from './cpu-player';

export interface BattleConfig {
  mapWidth: number;
  mapHeight: number;
  creatures: Creature[];
  terrainTiles?: number[][];
  armyControl?: ArmyControlType[];
  aiPersonality?: CPUPersonalityType | string;
  armyNames?: [string, string];
}

export interface BattleResult {
  victorArmyIndex: number;
  turnsTaken: number;
  survivingCreatures: Creature[];
  casualties: Creature[];
}
