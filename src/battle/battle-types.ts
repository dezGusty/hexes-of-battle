import { Creature } from './creature';
import { ArmyControlType } from '../battle';
import { CPUPersonalityType } from './cpu-player';
import { CombatConfig } from './combat-rules';

export interface BattleConfig {
  mapWidth: number;
  mapHeight: number;
  creatures: Creature[];
  terrainTiles?: number[][];
  armyControl?: ArmyControlType[];
  aiPersonality?: CPUPersonalityType | string;
  armyNames?: [string, string];
  combatConfig?: CombatConfig;
  seed?: number;
  maxTurns?: number;
}

export interface BattleResult {
  victorArmyIndex: number;
  turnsTaken: number;
  survivingCreatures: Creature[];
  casualties: Creature[];
  totalDamageDealt: [number, number];
  totalStaminaSpent: [number, number];
  moraleBreaks: [number, number];
  friendlyFireEvents: number;
}
