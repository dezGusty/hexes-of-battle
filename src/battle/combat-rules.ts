export enum ExhaustionState {
  FRESH = "fresh",
  WINDED = "winded",
  EXHAUSTED = "exhausted",
  DEPLETED = "depleted",
}

export enum MoraleState {
  STEADY = "steady",
  WAVERING = "wavering",
  PANICKED = "panicked",
  ROUTING = "routing",
}

export interface TerrainCombatConfig {
  moveCosts: Record<number | string, number>;
  staminaCosts: Record<number | string, number>;
  buffs: Record<number | string, Record<string, number>>;
}

export interface StaminaPenalty {
  damageDealtMultiplier: number;
  movementPenalty: number;
  defenseMultiplier: number;
  canRetaliate: boolean;
  damageTakenMultiplier: number;
  canMove?: boolean;
  canAttack?: boolean;
  autoMoraleCheck?: boolean;
}

export interface StaminaConfig {
  actionCosts: {
    moveNormal: number;
    moveRough: number;
    meleeAttack: number;
    rangedAttack: number;
    retaliation: number;
    specialAbility: number;
    rest: number;
  };
  restRecovery: number;
  exhaustionThresholds: {
    freshMinPercent: number;
    windedMinPercent: number;
    exhaustedMinPercent: number;
    depletedPercent: number;
  };
  penalties: {
    winded: StaminaPenalty;
    exhausted: StaminaPenalty;
    depleted: StaminaPenalty;
  };
}

export interface RetaliationConfig {
  multipliers: number[];
  minStamina: number;
  maxRetaliationsPerTurn: number;
  closeQuartersCounterTrait: string;
}

export interface FacingArcConfig {
  damageBonus: number;
  damageMultiplier: number;
}

export interface FacingConfig {
  front: FacingArcConfig;
  flank: FacingArcConfig;
  rear: FacingArcConfig;
}

export interface RangedConfig {
  scatterChance: number;
  friendlyFireAllowed: boolean;
  meleeEngagedPenalty: boolean;
}

export interface MoraleConfig {
  maxMorale: number;
  casualtyThresholdRatio: number;
  panicBaseChance: number;
  exhaustionMoraleCheckPenalty: number;
  heroAuraBonus: number;
  heroAuraRadius: number;
  routingTurnLoss: boolean;
  undamagedTurnRecovery: number;
  restRecovery: number;
}

export interface HeroConfig {
  bodyguardRetinueAbsorption: number;
  presenceMoraleBonus: number;
}

export interface CombatConfig {
  terrain: TerrainCombatConfig;
  stamina: StaminaConfig;
  retaliation: RetaliationConfig;
  facing: FacingConfig;
  ranged: RangedConfig;
  morale: MoraleConfig;
  hero: HeroConfig;
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  terrain: {
    moveCosts: {
      "0": 1,
      "1": 2,
      "2": 3,
      "3": 4,
      "4": 10,
      "5": 10,
    },
    staminaCosts: {
      "0": 1,
      "1": 2,
      "2": 2,
      "3": 2,
      "4": 5,
      "5": 5,
    },
    buffs: {
      "1": { defense_ranged: 1 },
      "2": { defense_melee: 1, attack_melee_low: 1, attack_melee_high: 1, attack_ranged_low: 1, attack_ranged_high: 1, range: 1 },
      "3": { defense_melee: -1, defense_ranged: -1 },
    },
  },
  stamina: {
    actionCosts: {
      moveNormal: 1,
      moveRough: 2,
      meleeAttack: 3,
      rangedAttack: 2,
      retaliation: 2,
      specialAbility: 3,
      rest: 0,
    },
    restRecovery: 5,
    exhaustionThresholds: {
      freshMinPercent: 0.50,
      windedMinPercent: 0.20,
      exhaustedMinPercent: 0.01,
      depletedPercent: 0.00,
    },
    penalties: {
      winded: {
        damageDealtMultiplier: 0.90,
        movementPenalty: 1,
        defenseMultiplier: 1.0,
        canRetaliate: true,
        damageTakenMultiplier: 1.0,
      },
      exhausted: {
        damageDealtMultiplier: 0.70,
        movementPenalty: 0,
        defenseMultiplier: 1.0,
        canRetaliate: false,
        damageTakenMultiplier: 1.20,
      },
      depleted: {
        damageDealtMultiplier: 0.50,
        movementPenalty: 99,
        defenseMultiplier: 0.50,
        canRetaliate: false,
        damageTakenMultiplier: 1.50,
        canMove: false,
        canAttack: false,
        autoMoraleCheck: true,
      },
    },
  },
  retaliation: {
    multipliers: [1.0, 0.6, 0.3, 0.0],
    minStamina: 2,
    maxRetaliationsPerTurn: 3,
    closeQuartersCounterTrait: "CloseQuartersCounter",
  },
  facing: {
    front: { damageBonus: 0, damageMultiplier: 1.0 },
    flank: { damageBonus: 1, damageMultiplier: 1.0 },
    rear: { damageBonus: 2, damageMultiplier: 1.0 },
  },
  ranged: {
    scatterChance: 0.15,
    friendlyFireAllowed: true,
    meleeEngagedPenalty: true,
  },
  morale: {
    maxMorale: 30,
    casualtyThresholdRatio: 0.25,
    panicBaseChance: 0.30,
    exhaustionMoraleCheckPenalty: 0.20,
    heroAuraBonus: 5,
    heroAuraRadius: 2,
    routingTurnLoss: true,
    undamagedTurnRecovery: 1,
    restRecovery: 1,
  },
  hero: {
    bodyguardRetinueAbsorption: 1.0,
    presenceMoraleBonus: 5,
  },
};

export const MIN_MORALE = 0;
export const MAX_MORALE = 30;

/**
 * Maps a numeric morale value (0 to 30) to its corresponding MoraleState:
 * - Routing: 0 (or <= 0)
 * - Panicked: 1 or 2
 * - Wavering: 3, 4, 5
 * - Steady: anything above 5 (6 to 30)
 */
export function getMoraleState(morale: number): MoraleState {
  if (morale <= 0) return MoraleState.ROUTING;
  if (morale <= 2) return MoraleState.PANICKED;
  if (morale <= 5) return MoraleState.WAVERING;
  return MoraleState.STEADY;
}

export function getExhaustionState(currentStamina: number, maxStamina: number, config: CombatConfig = DEFAULT_COMBAT_CONFIG): ExhaustionState {
  if (maxStamina <= 0) return ExhaustionState.DEPLETED;
  const ratio = currentStamina / maxStamina;
  if (ratio > config.stamina.exhaustionThresholds.freshMinPercent) {
    return ExhaustionState.FRESH;
  }
  if (ratio >= config.stamina.exhaustionThresholds.windedMinPercent) {
    return ExhaustionState.WINDED;
  }
  if (currentStamina > 0) {
    return ExhaustionState.EXHAUSTED;
  }
  return ExhaustionState.DEPLETED;
}

export function getRetaliationDamageMultiplier(retaliationIndex: number, config: CombatConfig = DEFAULT_COMBAT_CONFIG): number {
  if (retaliationIndex < 0) return 0;
  if (retaliationIndex >= config.retaliation.multipliers.length) return 0;
  return config.retaliation.multipliers[retaliationIndex];
}
