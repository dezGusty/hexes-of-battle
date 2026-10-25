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

export interface ImpreciseVolleyTraitConfig extends TraitConfigBase {
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

export interface ArmorPenetrationTraitConfig extends TraitConfigBase {
  armorIgnoredPercent?: number;
  armorReduction?: number;
}

export interface CavalryTraitConfig extends TraitConfigBase {
  antiCavalryMultiplier?: number;
}

export interface ChargeTraitConfig extends TraitConfigBase {
  damageBonusPerHex?: number;
  retaliationDamageTakenPerHex?: number;
}

export interface TraitsConfig {
  fragileLine: FragileLineTraitConfig;
  shieldBlock: ShieldBlockTraitConfig;
  volleyFire: VolleyFireTraitConfig;
  spearWall: SpearWallTraitConfig;
  impreciseVolley: ImpreciseVolleyTraitConfig;
  armorPenetration?: ArmorPenetrationTraitConfig;
  cavalry?: CavalryTraitConfig;
  charge?: ChargeTraitConfig;
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
  impreciseVolley: {
    name: "Imprecise Volley",
    icon: "traits/icon_volley_fire.png",
    highThreshold: 0.75,
    highMultiplier: 1.5,
    midThreshold: 0.50,
    midMultiplier: 1.0,
    lowMultiplier: 0.5,
    description: "Imprecise Volley: Inflicts 150% ranged damage to targets with >75% units, 100% to 50%-75% units, and 50% to <50% units.",
  },
  armorPenetration: {
    name: "Armor Penetration",
    icon: "traits/icon_armor_penetration.png",
    armorIgnoredPercent: 0.5,
    description: "Armor Penetration: Reduces target armor by 50% during damage calculation.",
  },
  cavalry: {
    name: "Cavalry",
    icon: "traits/icon_cavalry.png",
    description: "Cavalry: Mounted unit. Vulnerable to anti-cavalry tactics like spear walls and polearms.",
  },
  charge: {
    name: "Charge",
    icon: "traits/icon_charge.png",
    damageBonusPerHex: 0.08,
    retaliationDamageTakenPerHex: 0.08,
    description: "Charge: For each traveled hex during an attack, gains +8% bonus damage dealt, but suffers +8% bonus damage taken from retaliation.",
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

  if (norm === "imprecisevolley") {
    const cfg = traitsConfig.impreciseVolley ?? DEFAULT_TRAITS_CONFIG.impreciseVolley;
    return {
      id: "impreciseVolley",
      name: cfg.name ?? "Imprecise Volley",
      icon: cfg.icon ?? "traits/icon_volley_fire.png",
      description: cfg.description ?? `Imprecise Volley: Modifies ranged damage based on target squad size (${Math.round(cfg.highMultiplier * 100)}% for >${Math.round(cfg.highThreshold * 100)}% units, ${Math.round(cfg.midMultiplier * 100)}% for ${Math.round(cfg.midThreshold * 100)}-${Math.round(cfg.highThreshold * 100)}%, ${Math.round(cfg.lowMultiplier * 100)}% for <${Math.round(cfg.midThreshold * 100)}%).`,
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

  if (norm === "armorpenetration") {
    const cfg = traitsConfig.armorPenetration ?? DEFAULT_TRAITS_CONFIG.armorPenetration;
    return {
      id: "armorPenetration",
      name: cfg?.name ?? "Armor Penetration",
      icon: cfg?.icon ?? "traits/icon_armor_penetration.png",
      description: cfg?.description ?? "Armor Penetration: Reduces target armor by 50% during damage calculation.",
    };
  }

  if (norm === "cavalry") {
    const cfg = traitsConfig.cavalry ?? DEFAULT_TRAITS_CONFIG.cavalry;
    return {
      id: "cavalry",
      name: cfg?.name ?? "Cavalry",
      icon: cfg?.icon ?? "traits/icon_cavalry.png",
      description: cfg?.description ?? "Cavalry: Mounted unit.",
    };
  }

  if (norm === "charge") {
    const cfg = traitsConfig.charge ?? DEFAULT_TRAITS_CONFIG.charge;
    return {
      id: "charge",
      name: cfg?.name ?? "Charge",
      icon: cfg?.icon ?? "traits/icon_charge.png",
      description: cfg?.description ?? "Charge: For each traveled hex during an attack, gains +8% bonus damage dealt, but suffers +8% bonus damage taken from retaliation.",
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
  const ivRaw = findSection(["impreciseVolley", "imprecise_volley", "imprecise-volley", "ImpreciseVolley", "Imprecise Volley", "imprecise volley"]);
  const apRaw = findSection(["armorPenetration", "armor_penetration", "armor-penetration", "ArmorPenetration", "Armor Penetration"]);
  const cavRaw = findSection(["cavalry", "Cavalry"]);
  const chgRaw = findSection(["charge", "Charge"]);

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
    impreciseVolley: {
      name: ivRaw?.name ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.name,
      icon: ivRaw?.icon ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.icon,
      highThreshold: Number(ivRaw?.highThreshold ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.highThreshold),
      highMultiplier: Number(ivRaw?.highMultiplier ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.highMultiplier),
      midThreshold: Number(ivRaw?.midThreshold ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.midThreshold),
      midMultiplier: Number(ivRaw?.midMultiplier ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.midMultiplier),
      lowMultiplier: Number(ivRaw?.lowMultiplier ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.lowMultiplier),
      description: ivRaw?.description ?? DEFAULT_TRAITS_CONFIG.impreciseVolley.description,
    },
    armorPenetration: {
      name: apRaw?.name ?? DEFAULT_TRAITS_CONFIG.armorPenetration?.name ?? "Armor Penetration",
      icon: apRaw?.icon ?? DEFAULT_TRAITS_CONFIG.armorPenetration?.icon ?? "traits/icon_armor_penetration.png",
      armorIgnoredPercent: Number(apRaw?.armorIgnoredPercent ?? DEFAULT_TRAITS_CONFIG.armorPenetration?.armorIgnoredPercent ?? 0.5),
      armorReduction: apRaw?.armorReduction !== undefined ? Number(apRaw.armorReduction) : DEFAULT_TRAITS_CONFIG.armorPenetration?.armorReduction,
      description: apRaw?.description ?? DEFAULT_TRAITS_CONFIG.armorPenetration?.description ?? "Armor Penetration: Reduces target armor by 50% during damage calculation.",
    },
    cavalry: {
      name: cavRaw?.name ?? DEFAULT_TRAITS_CONFIG.cavalry?.name ?? "Cavalry",
      icon: cavRaw?.icon ?? DEFAULT_TRAITS_CONFIG.cavalry?.icon ?? "traits/icon_cavalry.png",
      description: cavRaw?.description ?? DEFAULT_TRAITS_CONFIG.cavalry?.description ?? "Cavalry: Mounted unit.",
    },
    charge: {
      name: chgRaw?.name ?? DEFAULT_TRAITS_CONFIG.charge?.name ?? "Charge",
      icon: chgRaw?.icon ?? DEFAULT_TRAITS_CONFIG.charge?.icon ?? "traits/icon_charge.png",
      damageBonusPerHex: Number(chgRaw?.damageBonusPerHex ?? DEFAULT_TRAITS_CONFIG.charge?.damageBonusPerHex ?? 0.08),
      retaliationDamageTakenPerHex: Number(chgRaw?.retaliationDamageTakenPerHex ?? DEFAULT_TRAITS_CONFIG.charge?.retaliationDamageTakenPerHex ?? 0.08),
      description: chgRaw?.description ?? DEFAULT_TRAITS_CONFIG.charge?.description ?? "Charge: For each traveled hex during an attack, gains +8% bonus damage dealt, but suffers +8% bonus damage taken from retaliation.",
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
  traveledHexes?: number;
}

export interface DamageCalculationResult {
  damage: number;
  rawDamage: number;
  volleyMultiplier: number;
  shieldBlockReduction: number;
  spearWallReduction: number;
  extraMoraleLoss: number;
  armorPenetrated?: number;
  chargeMultiplier?: number;
  chargeRetaliationMultiplier?: number;
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
    traveledHexes = 0,
  } = params;

  let volleyMultiplier = 1.0;
  const isRanged = attackType === BattleActionType.ATTACK_RANGED;
  const isMelee =
    attackType === BattleActionType.ATTACK_MELEE ||
    attackType === BattleActionType.COUNTER_ATTACK_MELEE;

  // 1. Volley Fire & Imprecise Volley (Attacker Perks)
  if (isRanged) {
    if (creatureHasTrait(attacker, "ImpreciseVolley")) {
      const ivConfig = traitsConfig.impreciseVolley ?? DEFAULT_TRAITS_CONFIG.impreciseVolley;
      const modelRatio =
        defender.maxModels > 1
          ? defender.aliveModelCount / defender.maxModels
          : defender.stats.health > 0
            ? defender.stats.remaining_health / defender.stats.health
            : 0;

      if (modelRatio > ivConfig.highThreshold) {
        volleyMultiplier = ivConfig.highMultiplier;
      } else if (modelRatio >= ivConfig.midThreshold) {
        volleyMultiplier = ivConfig.midMultiplier;
      } else {
        volleyMultiplier = ivConfig.lowMultiplier;
      }
    } else if (creatureHasTrait(attacker, "VolleyFire")) {
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
  }

  // 1.5. Armor Penetration (Attacker Perk: Melee & Ranged)
  let effectiveTargetArmor = targetArmor;
  if (creatureHasTrait(attacker, "ArmorPenetration")) {
    const apConfig = traitsConfig.armorPenetration ?? DEFAULT_TRAITS_CONFIG.armorPenetration;
    const ignorePct = apConfig?.armorIgnoredPercent ?? 0.5;
    const flatRed = apConfig?.armorReduction ?? 0;
    if (flatRed > 0) {
      effectiveTargetArmor = Math.max(0, effectiveTargetArmor - flatRed);
    } else {
      effectiveTargetArmor = Math.max(0, effectiveTargetArmor * (1.0 - ignorePct));
    }
  }

  // 1.7. Charge (Attacker Perk on Melee Attack, and Defender Vulnerability on Retaliation)
  let chargeMultiplier = 1.0;
  if (attackType === BattleActionType.ATTACK_MELEE && creatureHasTrait(attacker, "Charge")) {
    const chargeCfg = traitsConfig.charge ?? DEFAULT_TRAITS_CONFIG.charge;
    const bonusPerHex = chargeCfg?.damageBonusPerHex ?? 0.08;
    chargeMultiplier = 1.0 + Math.max(0, traveledHexes ?? 0) * bonusPerHex;
  }

  let chargeRetaliationMultiplier = 1.0;
  if (attackType === BattleActionType.COUNTER_ATTACK_MELEE && creatureHasTrait(defender, "Charge")) {
    const chargeCfg = traitsConfig.charge ?? DEFAULT_TRAITS_CONFIG.charge;
    const penaltyPerHex = chargeCfg?.retaliationDamageTakenPerHex ?? 0.08;
    chargeRetaliationMultiplier = 1.0 + Math.max(0, traveledHexes ?? 0) * penaltyPerHex;
  }

  // Net damage before defender defensive traits
  const netBase = baseDamage + facingBonus - effectiveTargetArmor;
  let currentDamage = Math.round(netBase * customMultiplier * volleyMultiplier * chargeMultiplier * chargeRetaliationMultiplier);
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
    armorPenetrated: targetArmor - effectiveTargetArmor,
    chargeMultiplier,
    chargeRetaliationMultiplier,
  };
}
