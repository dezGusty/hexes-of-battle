import { BattleActionType } from "./battle-action";
import { HexDirection, HexFlankStatus } from "../shared/hex-map";
import type { Creature } from "./creature";

export interface TraitConfigBase {
  name?: string;
  icon?: string;
  description?: string;
}

export interface FragileLineTraitConfig extends TraitConfigBase {
  extraMoraleLoss: number;
}

export interface ShieldBlockTraitConfig extends TraitConfigBase {
  damageReduction: number;
}

export interface VolleyFireTraitConfig extends TraitConfigBase {
  highThreshold: number;
  highMultiplier: number;
  midThreshold: number;
  midMultiplier: number;
  lowMultiplier: number;
}

export interface SpearWallTraitConfig extends TraitConfigBase {
  damageReduction: number;
  damageMultiplier?: number;
  exactDirectionOnly?: boolean;
}

export interface TraitsConfig {
  fragileLine: FragileLineTraitConfig;
  shieldBlock: ShieldBlockTraitConfig;
  volleyFire: VolleyFireTraitConfig;
  spearWall: SpearWallTraitConfig;
  [customTrait: string]: any;
}

export const DEFAULT_TRAITS_CONFIG: TraitsConfig = {
  fragileLine: {
    name: "Fragile Line",
    icon: "traits/icon_fragile_line.png",
    extraMoraleLoss: 2,
    description: "Fragile Line: Suffers +2 extra morale loss whenever attacked in melee combat.",
  },
  shieldBlock: {
    name: "Shield Block",
    icon: "traits/icon_shield_block.png",
    damageReduction: 2,
    description: "Shield Block: Reduces melee damage by 2 for the first attack received in a turn.",
  },
  volleyFire: {
    name: "Volley Fire",
    icon: "traits/icon_volley_fire.png",
    highThreshold: 0.75,
    highMultiplier: 1.25,
    midThreshold: 0.50,
    midMultiplier: 1.0,
    lowMultiplier: 0.75,
    description: "Volley Fire: Inflicts 125% ranged damage to targets with >75% units, 100% to 50%-75% units, and 75% to <50% units.",
  },
  spearWall: {
    name: "Spear Wall",
    icon: "traits/icon_spear_wall.png",
    damageReduction: 2,
    damageMultiplier: 1.0,
    exactDirectionOnly: true,
    description: "Spear Wall: Reduces incoming melee damage by 2 when attacked from the direction the unit is facing.",
  },
};

/**
 * Normalizes trait names to lowercase without spaces, underscores, or hyphens
 * for flexible matching (e.g. 'Fragile Line', 'FragileLine', 'fragile_line' -> 'fragileline').
 */
export function normalizeTraitName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, "");
}

/**
 * Checks whether a creature has a trait by normalized or exact name.
 */
export function creatureHasTrait(creature: Creature, traitName: string): boolean {
  if (!creature.stats?.traits || creature.stats.traits.length === 0) return false;
  const target = normalizeTraitName(traitName);
  return creature.stats.traits.some(
    (t) => t === traitName || normalizeTraitName(t) === target
  );
}

export interface TraitDisplayInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Returns metadata (name, icon path, combat description) for a given trait name.
 */
export function getTraitInfo(
  traitName: string,
  traitsConfig: TraitsConfig = DEFAULT_TRAITS_CONFIG
): TraitDisplayInfo | null {
  const norm = normalizeTraitName(traitName);

  if (norm === "shieldblock") {
    const cfg = traitsConfig.shieldBlock;
    return {
      id: "shieldBlock",
      name: cfg.name ?? "Shield Block",
      icon: cfg.icon ?? "traits/icon_shield_block.png",
      description: cfg.description ?? `Shield Block: Reduces melee damage by ${cfg.damageReduction} for the first attack received in a turn.`,
    };
  }

  if (norm === "spearwall") {
    const cfg = traitsConfig.spearWall;
    return {
      id: "spearWall",
      name: cfg.name ?? "Spear Wall",
      icon: cfg.icon ?? "traits/icon_spear_wall.png",
      description: cfg.description ?? `Spear Wall: Reduces incoming melee damage by ${cfg.damageReduction} when attacked from the direction the unit is facing.`,
    };
  }

  if (norm === "volleyfire") {
    const cfg = traitsConfig.volleyFire;
    return {
      id: "volleyFire",
      name: cfg.name ?? "Volley Fire",
      icon: cfg.icon ?? "traits/icon_volley_fire.png",
      description: cfg.description ?? `Volley Fire: Modifies ranged damage based on target squad size (${Math.round(cfg.highMultiplier * 100)}% for >${Math.round(cfg.highThreshold * 100)}% units, ${Math.round(cfg.midMultiplier * 100)}% for ${Math.round(cfg.midThreshold * 100)}-${Math.round(cfg.highThreshold * 100)}%, ${Math.round(cfg.lowMultiplier * 100)}% for <${Math.round(cfg.midThreshold * 100)}%).`,
    };
  }

  if (norm === "fragileline") {
    const cfg = traitsConfig.fragileLine;
    return {
      id: "fragileLine",
      name: cfg.name ?? "Fragile Line",
      icon: cfg.icon ?? "traits/icon_fragile_line.png",
      description: cfg.description ?? `Fragile Line: Suffers +${cfg.extraMoraleLoss} extra morale loss whenever attacked in melee combat.`,
    };
  }

  if (norm === "closequarterscounter") {
    return {
      id: "closeQuartersCounter",
      name: "Close Quarters Counter",
      icon: "traits/icon_spear_wall.png",
      description: "Close Quarters Counter: Retaliates fiercely against adjacent enemies in close combat.",
    };
  }

  if (norm === "heropresence") {
    return {
      id: "heroPresence",
      name: "Hero Presence",
      icon: "traits/icon_shield_block.png",
      description: "Hero Presence: Inspires adjacent friendly squads with an aura of courage and leadership.",
    };
  }

  if (norm === "bodyguardretinue") {
    return {
      id: "bodyguardRetinue",
      name: "Bodyguard Retinue",
      icon: "traits/icon_shield_block.png",
      description: "Bodyguard Retinue: Elite retainers absorb incoming attacks before the commander takes damage.",
    };
  }

  return null;
}

/**
 * Parses a raw JSON object into a strongly-typed TraitsConfig,
 * gracefully supporting camelCase, snake_case, and kebab-case keys.
 */
export function parseTraitsConfig(raw: any): TraitsConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TRAITS_CONFIG };
  }

  const findSection = (keys: string[]): any => {
    for (const key of keys) {
      if (raw[key] && typeof raw[key] === "object") return raw[key];
    }
    return undefined;
  };

  const flRaw = findSection(["fragileLine", "fragile_line", "fragile-line", "FragileLine", "Fragile Line"]);
  const sbRaw = findSection(["shieldBlock", "shield_block", "shield-block", "ShieldBlock", "Shield block"]);
  const vfRaw = findSection(["volleyFire", "volley_fire", "volley-fire", "VolleyFire", "Volley fire"]);
  const swRaw = findSection(["spearWall", "spear_wall", "spear-wall", "SpearWall", "Spear wall"]);

  return {
    ...DEFAULT_TRAITS_CONFIG,
    fragileLine: {
      name: flRaw?.name ?? DEFAULT_TRAITS_CONFIG.fragileLine.name,
      icon: flRaw?.icon ?? DEFAULT_TRAITS_CONFIG.fragileLine.icon,
      extraMoraleLoss: Number(flRaw?.extraMoraleLoss ?? DEFAULT_TRAITS_CONFIG.fragileLine.extraMoraleLoss),
      description: flRaw?.description ?? DEFAULT_TRAITS_CONFIG.fragileLine.description,
    },
    shieldBlock: {
      name: sbRaw?.name ?? DEFAULT_TRAITS_CONFIG.shieldBlock.name,
      icon: sbRaw?.icon ?? DEFAULT_TRAITS_CONFIG.shieldBlock.icon,
      damageReduction: Number(sbRaw?.damageReduction ?? DEFAULT_TRAITS_CONFIG.shieldBlock.damageReduction),
      description: sbRaw?.description ?? DEFAULT_TRAITS_CONFIG.shieldBlock.description,
    },
    volleyFire: {
      name: vfRaw?.name ?? DEFAULT_TRAITS_CONFIG.volleyFire.name,
      icon: vfRaw?.icon ?? DEFAULT_TRAITS_CONFIG.volleyFire.icon,
      highThreshold: Number(vfRaw?.highThreshold ?? DEFAULT_TRAITS_CONFIG.volleyFire.highThreshold),
      highMultiplier: Number(vfRaw?.highMultiplier ?? DEFAULT_TRAITS_CONFIG.volleyFire.highMultiplier),
      midThreshold: Number(vfRaw?.midThreshold ?? DEFAULT_TRAITS_CONFIG.volleyFire.midThreshold),
      midMultiplier: Number(vfRaw?.midMultiplier ?? DEFAULT_TRAITS_CONFIG.volleyFire.midMultiplier),
      lowMultiplier: Number(vfRaw?.lowMultiplier ?? DEFAULT_TRAITS_CONFIG.volleyFire.lowMultiplier),
      description: vfRaw?.description ?? DEFAULT_TRAITS_CONFIG.volleyFire.description,
    },
    spearWall: {
      name: swRaw?.name ?? DEFAULT_TRAITS_CONFIG.spearWall.name,
      icon: swRaw?.icon ?? DEFAULT_TRAITS_CONFIG.spearWall.icon,
      damageReduction: Number(swRaw?.damageReduction ?? DEFAULT_TRAITS_CONFIG.spearWall.damageReduction),
      damageMultiplier: Number(swRaw?.damageMultiplier ?? DEFAULT_TRAITS_CONFIG.spearWall.damageMultiplier ?? 1.0),
      exactDirectionOnly: swRaw?.exactDirectionOnly !== undefined
        ? Boolean(swRaw.exactDirectionOnly)
        : DEFAULT_TRAITS_CONFIG.spearWall.exactDirectionOnly,
      description: swRaw?.description ?? DEFAULT_TRAITS_CONFIG.spearWall.description,
    },
  };
}

export interface DamageCalculationParams {
  attacker: Creature;
  defender: Creature;
  attackType: BattleActionType;
  baseDamage: number;
  facingBonus?: number;
  targetArmor?: number;
  attackFromDir?: HexDirection;
  flankStatus?: HexFlankStatus;
  customMultiplier?: number;
  traitsConfig?: TraitsConfig;
  commit?: boolean;
}

export interface DamageCalculationResult {
  damage: number;
  rawDamage: number;
  volleyMultiplier: number;
  shieldBlockReduction: number;
  spearWallReduction: number;
  extraMoraleLoss: number;
}

/**
 * Calculates attack damage with all applicable traits applied:
 * - Volley Fire: scales ranged damage output based on target squad strength.
 * - Shield Block: reduces incoming melee damage for the first attack in a turn.
 * - Spear Wall: reduces incoming melee damage when attacked from the direction faced.
 * - Fragile Line: applies extra morale loss when attacked in melee.
 */
export function calculateDamageWithTraits(params: DamageCalculationParams): DamageCalculationResult {
  const {
    attacker,
    defender,
    attackType,
    baseDamage,
    facingBonus = 0,
    targetArmor = 0,
    attackFromDir = HexDirection.NONE,
    flankStatus = HexFlankStatus.NONE,
    customMultiplier = 1.0,
    traitsConfig = DEFAULT_TRAITS_CONFIG,
    commit = false,
  } = params;

  let volleyMultiplier = 1.0;
  const isRanged = attackType === BattleActionType.ATTACK_RANGED;
  const isMelee =
    attackType === BattleActionType.ATTACK_MELEE ||
    attackType === BattleActionType.COUNTER_ATTACK_MELEE;

  // 1. Volley Fire (Attacker Perk)
  if (isRanged && creatureHasTrait(attacker, "VolleyFire")) {
    const vfConfig = traitsConfig.volleyFire;
    const modelRatio =
      defender.maxModels > 1
        ? defender.aliveModelCount / defender.maxModels
        : defender.stats.health > 0
          ? defender.stats.remaining_health / defender.stats.health
          : 0;

    if (modelRatio > vfConfig.highThreshold) {
      volleyMultiplier = vfConfig.highMultiplier;
    } else if (modelRatio >= vfConfig.midThreshold) {
      volleyMultiplier = vfConfig.midMultiplier;
    } else {
      volleyMultiplier = vfConfig.lowMultiplier;
    }
  }

  // Net damage before defender defensive traits
  const netBase = baseDamage + facingBonus - targetArmor;
  let currentDamage = Math.round(netBase * customMultiplier * volleyMultiplier);
  if (currentDamage < 0) currentDamage = 0;
  const rawDamage = currentDamage;

  let shieldBlockReduction = 0;
  let spearWallReduction = 0;
  let extraMoraleLoss = 0;

  // 2. Defender Traits for Melee Combat
  if (isMelee) {
    // Shield Block: reduces melee damage for the first attack in the turn
    if (creatureHasTrait(defender, "ShieldBlock") && !defender.stats.shield_block_used) {
      shieldBlockReduction = traitsConfig.shieldBlock.damageReduction;
      if (commit) {
        defender.stats.shield_block_used = true;
      }
    }

    // Spear Wall: takes less melee damage from the direction it is facing
    if (creatureHasTrait(defender, "SpearWall")) {
      const swConfig = traitsConfig.spearWall;
      const exactOnly = swConfig.exactDirectionOnly ?? true;
      const isFromFacing = exactOnly
        ? attackFromDir !== HexDirection.NONE && attackFromDir === defender.facingDirection
        : attackFromDir === defender.facingDirection || flankStatus === HexFlankStatus.NONE;

      if (isFromFacing) {
        spearWallReduction = swConfig.damageReduction;
        if (swConfig.damageMultiplier !== undefined && swConfig.damageMultiplier < 1.0) {
          currentDamage = Math.round(currentDamage * swConfig.damageMultiplier);
        }
      }
    }

    // Apply reductions
    currentDamage = Math.max(0, currentDamage - shieldBlockReduction - spearWallReduction);

    // 3. Fragile Line: lose extra morale when attacked in melee
    if (creatureHasTrait(defender, "FragileLine")) {
      extraMoraleLoss = traitsConfig.fragileLine.extraMoraleLoss;
      if (commit && extraMoraleLoss > 0) {
        defender.consumeMorale(extraMoraleLoss);
      }
    }
  }

  return {
    damage: currentDamage,
    rawDamage,
    volleyMultiplier,
    shieldBlockReduction,
    spearWallReduction,
    extraMoraleLoss,
  };
}
