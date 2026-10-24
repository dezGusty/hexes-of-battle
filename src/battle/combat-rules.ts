import { TraitsConfig, DEFAULT_TRAITS_CONFIG } from "./trait-system";

export enum ExhaustionState {
  FRESH = "fresh",
  WINDED = "winded",
  EXHAUSTED = "exhausted",
  DEPLETED = "depleted",
}

export enum MoraleState {
  HIGH = "high",
  STEADY = "steady",
  WAVERING = "wavering",
  PANICKED = "panicked",
  ROUTING = "routing",
}

export interface MoraleBreakpoints {
  routing: number;
  panicked: number;
  wavering: number;
  steady: number;
}

export const DEFAULT_MORALE_BREAKPOINTS: MoraleBreakpoints = {
  routing: 0,
  panicked: 2,
  wavering: 5,
  steady: 15,
};

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
  breakpoints?: MoraleBreakpoints;
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
  traits?: TraitsConfig;
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  terrain: {
    moveCosts: {
      "0": 1,
      "1": 2,
      "2": 3,
      "3": 4,
      "5": 10,
    },
    staminaCosts: {
      "0": 1,
      "1": 2,
      "2": 2,
      "3": 2,
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
    breakpoints: { ...DEFAULT_MORALE_BREAKPOINTS },
  },
  hero: {
    bodyguardRetinueAbsorption: 1.0,
    presenceMoraleBonus: 5,
  },
  traits: DEFAULT_TRAITS_CONFIG,
};

export const MIN_MORALE = 0;
export const MAX_MORALE = 30;

/**
 * Validates morale breakpoints:
 * Values must be within [MIN_MORALE, maxMorale] and in strictly ascending order:
 * MIN_MORALE <= routing < panicked < wavering < steady < maxMorale
 * If invalid (out of bounds, non-numeric, or incorrect order), reverts to DEFAULT_MORALE_BREAKPOINTS.
 */
export function validateMoraleBreakpoints(
  breakpoints?: any,
  maxMorale: number = MAX_MORALE
): MoraleBreakpoints {
  if (!breakpoints || typeof breakpoints !== "object") {
    return { ...DEFAULT_MORALE_BREAKPOINTS };
  }

  const routing = Number(breakpoints.routing);
  const panicked = Number(breakpoints.panicked);
  const wavering = Number(breakpoints.wavering);
  const steady = Number(breakpoints.steady);

  if (
    !Number.isFinite(routing) ||
    !Number.isFinite(panicked) ||
    !Number.isFinite(wavering) ||
    !Number.isFinite(steady)
  ) {
    return { ...DEFAULT_MORALE_BREAKPOINTS };
  }

  if (
    routing < MIN_MORALE ||
    routing >= panicked ||
    panicked >= wavering ||
    wavering >= steady ||
    steady >= maxMorale
  ) {
    return { ...DEFAULT_MORALE_BREAKPOINTS };
  }

  return { routing, panicked, wavering, steady };
}

/**
 * Maps a numeric morale value (0 to 30) to its corresponding MoraleState:
 * - Routing: <= routing (default 0)
 * - Panicked: routing + 1 to panicked (default 1 to 2)
 * - Wavering: panicked + 1 to wavering (default 3 to 5)
 * - Steady: wavering + 1 to steady (default 6 to 15)
 * - High: > steady (default > 15)
 */
export function getMoraleState(
  morale: number,
  breakpoints?: MoraleBreakpoints | any
): MoraleState {
  const bp = validateMoraleBreakpoints(breakpoints);
  if (morale <= bp.routing) return MoraleState.ROUTING;
  if (morale <= bp.panicked) return MoraleState.PANICKED;
  if (morale <= bp.wavering) return MoraleState.WAVERING;
  if (morale <= bp.steady) return MoraleState.STEADY;
  return MoraleState.HIGH;
}

export function getMoraleTooltip(breakpoints?: MoraleBreakpoints | any): string {
  const bp = validateMoraleBreakpoints(breakpoints);
  const routingStr = bp.routing <= 0 ? '0' : `0-${bp.routing}`;
  return `Morale (0-30). Dictates the squad's courage and discipline.\nRouting: ${routingStr}, Panicked: ${bp.routing + 1}-${bp.panicked}, Wavering: ${bp.panicked + 1}-${bp.wavering}, Steady: ${bp.wavering + 1}-${bp.steady}, High: >${bp.steady}.\n+1 if undamaged for a full turn or upon resting.`;
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
