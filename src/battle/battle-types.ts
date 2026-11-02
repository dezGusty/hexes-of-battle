import { Creature } from './creature';
import { Ability } from './ability';
import { ArmyControlType } from '../battle';
import { CPUPersonalityType } from './cpu-player';
import { CombatConfig } from './combat-rules';
import { Coords } from '../shared';
import { BattleActionType } from './battle-action';
import { HexFlankStatus } from '../shared/hex-map';

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
  retreatPoints?: Record<number, Coords[]> | Coords[][];
}

export interface BattleResult {
  victorArmyIndex: number;
  turnsTaken: number;
  survivingCreatures: Creature[];
  casualties: Creature[];
  routedCreatures: Creature[];
  initialCreatures?: Creature[];
  totalDamageDealt: [number, number];
  totalStaminaSpent: [number, number];
  moraleBreaks: [number, number];
  friendlyFireEvents: number;
}

export interface DamagePreviewResult {
  attacker: Creature;
  defender: Creature;
  targetHex: Coords;
  originHex: Coords | null;
  attackType: BattleActionType;
  isRanged: boolean;
  canAttack: boolean;
  reasonCannotAttack?: string;
  minDamage: number;
  maxDamage: number;
  rawMinDamage: number;
  rawMaxDamage: number;
  targetArmor: number;
  effectiveTargetArmor: number;
  flankStatus: HexFlankStatus;
  facingBonus: number;
  attackerMultiplier: number;
  volleyMultiplier: number;
  chargeMultiplier: number;
  shieldBlockReduction: number;
  spearWallReduction: number;
  armorPenetrated: number;
  defenderHpBefore: number;
  defenderHpAfterMin: number;
  defenderHpAfterMax: number;
  defenderModelsBefore: number;
  minCasualties: number;
  maxCasualties: number;
  traveledHexes: number;
  attackerModifiers: string[];
  defenderModifiers: string[];
  ability?: Ability;
  skillName?: string;
  badgeText?: string;
}
