import { Coords } from "../shared";
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus, reverseDirection } from "../shared/hex-map";
import { BattleActionType } from "./battle-action";
import { CombatConfig, ExhaustionState, getExhaustionState } from "./combat-rules";
import { Buff, Creature, CreatureStats } from "./creature";
import { TerrainType } from "./terrain-types";
import { DamageCalculationResult, TraitsConfig, calculateDamageWithTraits } from "./trait-system";
import { DamagePreviewResult } from "./battle-types";
import { SeedableRNG } from "../shared/prng";
import { Ability, AbilityResourceUse } from "./ability";

/**
 * Resolves the flanking status and facing bonus for an attack based on the target's facing direction
 * and the direction from which the attack approaches.
 */
export function resolveFlankAndFacingBonus(
  targetFacing: HexDirection,
  attackFromDir: HexDirection,
  combatConfig: CombatConfig
): { flankStatus: HexFlankStatus; facingBonus: number } {
  const flankStatus = checkFlankingStatus(targetFacing, attackFromDir);
  let facingBonus = 0;
  if (flankStatus === HexFlankStatus.BACKSTAB) {
    facingBonus = combatConfig.facing.rear.damageBonus;
  } else if (flankStatus === HexFlankStatus.FLANK) {
    facingBonus = combatConfig.facing.flank.damageBonus;
  }
  return { flankStatus, facingBonus };
}

/**
 * Resolves the direction from which an attack strikes the target hex from an origin hex.
 */
export function resolveAttackFromDirection(
  originHex: Coords | null,
  targetHex: Coords,
  hexMap: HexMap
): HexDirection {
  if (!originHex) return HexDirection.NONE;
  const attackDir = hexMap.getDirectionForNeighbour(originHex, targetHex);
  return attackDir !== HexDirection.NONE ? reverseDirection(attackDir) : HexDirection.NONE;
}

/**
 * Returns the effective armor / defense of the defender for the given attack type.
 */
export function resolveTargetDefense(
  defender: Creature,
  attackType: BattleActionType
): number {
  return attackType === BattleActionType.ATTACK_RANGED
    ? defender.live_stats.defense_ranged
    : defender.live_stats.defense_melee;
}

/**
 * Computes live creature stats at a hypothetical board location, applying the location's
 * terrain buffs (and removing existing terrain buffs) without mutating the creature.
 */
export function computeVirtualLiveStatsAt(
  creature: Creature,
  _position: Coords,
  terrainType: number,
  combatConfig: CombatConfig
): CreatureStats {
  const buffData = combatConfig.terrain.buffs[terrainType];
  const nonTerrainBuffs = creature.buffs.filter((b) => b.source !== "terrain");
  const virtualBuffs = [...nonTerrainBuffs];
  if (buffData) {
    const stats: CreatureStats = { ...CreatureStats.EMPTY };
    if (buffData.defense_melee) stats.defense_melee = buffData.defense_melee;
    if (buffData.defense_ranged) stats.defense_ranged = buffData.defense_ranged;
    if (buffData.attack_melee_low) stats.attack_melee_low = buffData.attack_melee_low;
    if (buffData.attack_melee_high) stats.attack_melee_high = buffData.attack_melee_high;
    if (buffData.attack_ranged_low) stats.attack_ranged_low = buffData.attack_ranged_low;
    if (buffData.attack_ranged_high) stats.attack_ranged_high = buffData.attack_ranged_high;
    if (buffData.range) stats.range = buffData.range;
    virtualBuffs.push(new Buff(stats, "terrain"));
  }

  let base = { ...creature.stats };
  if (base.morale == null || Number.isNaN(base.morale)) {
    base.morale = 10;
  }
  virtualBuffs.forEach((element) => {
    base = {
      ...base,
      ammo: (base.ammo ?? 0) + (element.stats?.ammo ?? 0),
      attack_melee_low: (base.attack_melee_low ?? 0) + (element.stats?.attack_melee_low ?? 0),
      attack_melee_high: (base.attack_melee_high ?? 0) + (element.stats?.attack_melee_high ?? 0),
      attack_ranged_low: (base.attack_ranged_low ?? 0) + (element.stats?.attack_ranged_low ?? 0),
      attack_ranged_high: (base.attack_ranged_high ?? 0) + (element.stats?.attack_ranged_high ?? 0),
      defense_melee: (base.defense_melee ?? 0) + (element.stats?.defense_melee ?? 0),
      defense_ranged: (base.defense_ranged ?? 0) + (element.stats?.defense_ranged ?? 0),
      initiative: (base.initiative ?? 0) + (element.stats?.initiative ?? 0),
      range: (base.range ?? 0) + (element.stats?.range ?? 0),
    };
  });

  const exhaustion = creature.exhaustionState;
  base.exhaustion_state = exhaustion;
  if (exhaustion === ExhaustionState.DEPLETED) {
    base.defense_melee = Math.floor(base.defense_melee * 0.5);
    base.defense_ranged = Math.floor(base.defense_ranged * 0.5);
  }
  return base;
}

/**
 * Calculates deterministic casualty counts and remaining HP bounds given incoming damage.
 */
export function estimateDamageImpact(
  defender: Creature,
  damage: number
): { remainingHp: number; remainingModels: number; modelsLost: number } {
  const hpBefore = defender.stats.remaining_health;
  const modelHp = Math.max(1, defender.stats.model_hp);
  const modelsBefore = defender.aliveModelCount;

  const remainingHp = Math.max(0, hpBefore - damage);
  const remainingModels = remainingHp <= 0 ? 0 : Math.min(defender.stats.model_count, Math.max(1, Math.ceil(remainingHp / modelHp)));
  const modelsLost = Math.max(0, modelsBefore - remainingModels);

  return { remainingHp, remainingModels, modelsLost };
}

/**
 * Computes base damage range bounds scaled by attacker efficiency.
 */
export function getAttackerDamageBounds(
  attackerStats: CreatureStats,
  attackType: BattleActionType,
  multiplier: number = 1.0
): { low: number; high: number } {
  const isRanged = attackType === BattleActionType.ATTACK_RANGED;
  const rawLow = isRanged ? attackerStats.attack_ranged_low : attackerStats.attack_melee_low;
  const rawHigh = isRanged ? attackerStats.attack_ranged_high : attackerStats.attack_melee_high;

  return {
    low: Math.max(1, Math.round(rawLow * multiplier)),
    high: Math.max(1, Math.round(rawHigh * multiplier)),
  };
}

export interface AttackExecutionParams {
  attacker: Creature;
  defender: Creature;
  attackType: BattleActionType;
  combatConfig: CombatConfig;
  traitsConfig: TraitsConfig;
  rng?: SeedableRNG;
  customMultiplier?: number;
  traveledHexes?: number;
  commit?: boolean;
}

/**
 * Executes a unified combat attack calculation with traits, facing, and armor applied.
 */
export function executeAttackCalculation(params: AttackExecutionParams): {
  damage: number;
  traitResult: DamageCalculationResult;
  flankStatus: HexFlankStatus;
  facingBonus: number;
} {
  const {
    attacker,
    defender,
    attackType,
    combatConfig,
    traitsConfig,
    rng,
    customMultiplier = 1.0,
    traveledHexes = 0,
    commit = true,
  } = params;

  let baseDamage = 0;
  if (attackType === BattleActionType.ATTACK_MELEE || attackType === BattleActionType.COUNTER_ATTACK_MELEE) {
    baseDamage = attacker.getRandomAttackDamageMelee(rng);
  } else {
    baseDamage = attacker.getRandomAttackDamageRanged(rng);
  }

  const attackFromDir = reverseDirection(attacker.facingDirection);
  const { flankStatus, facingBonus } = resolveFlankAndFacingBonus(defender.facingDirection, attackFromDir, combatConfig);
  const targetArmor = resolveTargetDefense(defender, attackType);

  const traitResult = calculateDamageWithTraits({
    attacker,
    defender,
    attackType,
    baseDamage,
    facingBonus,
    targetArmor,
    attackFromDir,
    flankStatus,
    customMultiplier,
    traitsConfig,
    commit,
    traveledHexes,
  });

  return {
    damage: traitResult.damage,
    traitResult,
    flankStatus,
    facingBonus,
  };
}

/**
 * Checks whether an ability is the Quick Draw skill.
 */
export function isQuickDrawAbility(ability?: Ability | null): boolean {
  if (!ability) return false;
  const id = ability.id?.toLowerCase() ?? "";
  const name = ability.name?.toLowerCase() ?? "";
  return (
    id === "quick-draw-01" ||
    id === "quick-draw" ||
    id === "dbl-strike-01" ||
    name.includes("quick-draw") ||
    name.includes("quick draw")
  );
}

/**
 * Checks whether an ability is the Throw Javelin skill.
 */
export function isThrowJavelinAbility(ability?: Ability | null): boolean {
  if (!ability) return false;
  const id = ability.id?.toLowerCase() ?? "";
  const name = ability.name?.toLowerCase() ?? "";
  return (
    id === "jav-01" ||
    id === "throw-javelin" ||
    name.includes("throw-javelin") ||
    name.includes("throw javelin") ||
    name.includes("javelin")
  );
}

/**
 * Checks whether an ability can deal direct damage or trigger damage attacks.
 */
export function isDamageAbility(ability?: Ability | null): boolean {
  if (!ability) return false;
  if (isQuickDrawAbility(ability) || isThrowJavelinAbility(ability)) return true;
  if ((ability.damage_low && ability.damage_low > 0) || (ability.damage_high && ability.damage_high > 0)) {
    return true;
  }
  return false;
}

export interface DamagePreviewContext {
  targetHex: Coords;
  attacker: Creature;
  defender: Creature;
  hexMap: HexMap;
  combatConfig: CombatConfig;
  traitsConfig: TraitsConfig;
  approachHex?: Coords;
  meleePreference?: boolean;
  ability?: Ability;
  isTargetAllowedForAbilityFn?: (ability: Ability, attacker: Creature, targetHex: Coords) => boolean;
  findPathFn?: (targetHex: Coords) => Coords[];
  getTerrainAtFn?: (hex: Coords) => number;
  getStaminaCostForPathFn?: (path: Coords[], creature: Creature) => number;
  isHexInRangedReachFn?: (hex: Coords) => boolean;
  isAbilityReachFn?: (hex: Coords) => boolean;
}

/**
 * Generates a comprehensive, deterministic combat damage preview factoring in all active
 * buffs, debuffs, stamina exhaustion, terrain, facing, and combat traits.
 */
export function computeDamagePreview(ctx: DamagePreviewContext): DamagePreviewResult {
  const {
    targetHex,
    attacker,
    defender,
    hexMap,
    combatConfig,
    traitsConfig,
    approachHex,
    meleePreference = false,
    ability,
    isTargetAllowedForAbilityFn,
    findPathFn,
    getTerrainAtFn,
    getStaminaCostForPathFn,
    isHexInRangedReachFn,
    isAbilityReachFn,
  } = ctx;

  const isFriendly = defender.armyAlignment === attacker.armyAlignment;

  // Handle skill-specific damage preview when an active damaging ability is used
  if (ability && isDamageAbility(ability)) {
    if (isQuickDrawAbility(ability)) {
      const attackStamina = combatConfig.stamina?.actionCosts?.rangedAttack ?? 2;
      const quickDrawStamina = attackStamina * 2 + 2;
      const ammoCost = 2;
      const attackCost = 1;

      const attackFromDir = resolveAttackFromDirection(attacker.pos, targetHex, hexMap);
      const { flankStatus, facingBonus } = resolveFlankAndFacingBonus(defender.facingDirection, attackFromDir, combatConfig);

      let canAttack = true;
      let reasonCannotAttack: string | undefined;

      if (isFriendly) {
        canAttack = false;
        reasonCannotAttack = "Target is a friendly unit";
      } else if (attacker.isPanickedOrRouting) {
        canAttack = false;
        reasonCannotAttack = "Unit is panicked or routing";
      } else if (attacker.exhaustionState === ExhaustionState.DEPLETED) {
        canAttack = false;
        reasonCannotAttack = "Stamina depleted";
      } else if (attacker.live_stats.remaining_attacks < attackCost) {
        canAttack = false;
        reasonCannotAttack = "No attacks remaining this turn";
      } else if (attacker.live_stats.remaining_ammo < ammoCost) {
        canAttack = false;
        reasonCannotAttack = `Need ${ammoCost} ammo (have ${attacker.live_stats.remaining_ammo})`;
      } else if (attacker.stats.stamina < quickDrawStamina) {
        canAttack = false;
        reasonCannotAttack = `Need ${quickDrawStamina} stamina (have ${attacker.stats.stamina})`;
      } else {
        const distance = hexMap.getDistance(attacker.pos, targetHex);
        const inReach = isAbilityReachFn
          ? isAbilityReachFn(targetHex)
          : (isTargetAllowedForAbilityFn
              ? isTargetAllowedForAbilityFn(ability, attacker, targetHex)
              : (isHexInRangedReachFn ? isHexInRangedReachFn(targetHex) : distance <= attacker.live_stats.range));
        if (!inReach && distance > attacker.live_stats.range) {
          canAttack = false;
          reasonCannotAttack = "Target out of ranged reach";
        }
      }

      const attTerrain = getTerrainAtFn ? getTerrainAtFn(attacker.pos) : 0;
      const attackerStats = computeVirtualLiveStatsAt(attacker, attacker.pos, attTerrain, combatConfig);
      const attackerMultiplier = attacker.getDamageOutputMultiplier();
      const { low: singleLow, high: singleHigh } = getAttackerDamageBounds(attackerStats, BattleActionType.ATTACK_RANGED, attackerMultiplier);
      const targetArmor = resolveTargetDefense(defender, BattleActionType.ATTACK_RANGED);

      const traitResultMin = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: singleLow,
        facingBonus,
        targetArmor,
        attackFromDir,
        flankStatus,
        customMultiplier: 1.0,
        traitsConfig,
        commit: false,
        traveledHexes: 0,
      });

      const traitResultMax = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: singleHigh,
        facingBonus,
        targetArmor,
        attackFromDir,
        flankStatus,
        customMultiplier: 1.0,
        traitsConfig,
        commit: false,
        traveledHexes: 0,
      });

      const singleVolleyMin = Math.min(traitResultMin.damage, traitResultMax.damage);
      const singleVolleyMax = Math.max(traitResultMin.damage, traitResultMax.damage);

      const minDamage = singleVolleyMin * 2;
      const maxDamage = singleVolleyMax * 2;
      const rawMinDamage = traitResultMin.rawDamage * 2;
      const rawMaxDamage = traitResultMax.rawDamage * 2;

      const defHpBefore = defender.stats.remaining_health;
      const defModelsBefore = defender.aliveModelCount;

      const impactMin = estimateDamageImpact(defender, minDamage);
      const impactMax = estimateDamageImpact(defender, maxDamage);

      const attackerModifiers: string[] = [];
      const defenderModifiers: string[] = [];

      attackerModifiers.push(`${attacker.aliveModelCount}/${attacker.maxModels} models (${Math.round((attacker.aliveModelCount / attacker.maxModels) * 100)}%)`);
      attackerModifiers.push(`Quick Draw: 2 volleys (Cost: ${ammoCost} Ammo, ${quickDrawStamina} Stamina)`);
      if (attacker.exhaustionState !== ExhaustionState.FRESH) {
        attackerModifiers.push(`Stamina: ${attacker.exhaustionState}`);
      }
      if (attacker.stats.morale_state) {
        attackerModifiers.push(`Morale: ${attacker.stats.morale_state}`);
      }

      const attBuff = combatConfig.terrain.buffs[attTerrain];
      if (attBuff && attBuff.attack_ranged_high) {
        attackerModifiers.push(`Hill: +${attBuff.attack_ranged_high} Ranged Atk`);
      }

      if (flankStatus === HexFlankStatus.BACKSTAB) {
        attackerModifiers.push(`Backstab: +${facingBonus} Atk`);
      } else if (flankStatus === HexFlankStatus.FLANK) {
        attackerModifiers.push(`Flank: +${facingBonus} Atk`);
      }

      if (traitResultMin.volleyMultiplier !== 1.0) {
        attackerModifiers.push(`Volley Fire: ${Math.round(traitResultMin.volleyMultiplier * 100)}%`);
      }
      if (traitResultMin.armorPenetrated && traitResultMin.armorPenetrated > 0) {
        attackerModifiers.push(`Armor Penetration: -${traitResultMin.armorPenetrated} Armor`);
      }

      defenderModifiers.push(`Defense: ${targetArmor}`);
      const defTerrain = getTerrainAtFn ? getTerrainAtFn(targetHex) : 0;
      const defBuff = combatConfig.terrain.buffs[defTerrain];
      if (defBuff && defBuff.defense_ranged) {
        defenderModifiers.push(`${defTerrain === TerrainType.FOREST ? 'Forest' : defTerrain === TerrainType.SWAMP ? 'Swamp' : 'Terrain'}: ${defBuff.defense_ranged > 0 ? '+' : ''}${defBuff.defense_ranged} Def`);
      }
      if (defender.exhaustionState === ExhaustionState.DEPLETED) {
        defenderModifiers.push("Depleted: Armor halved");
      }
      if (traitResultMin.shieldBlockReduction > 0) {
        defenderModifiers.push(`Shield Block: -${traitResultMin.shieldBlockReduction} dmg`);
      }
      if (traitResultMin.spearWallReduction > 0) {
        defenderModifiers.push(`Spear Wall: -${traitResultMin.spearWallReduction} dmg`);
      }

      return {
        attacker,
        defender,
        targetHex,
        originHex: attacker.pos,
        attackType: BattleActionType.ATTACK_RANGED,
        isRanged: true,
        ability,
        skillName: ability.tooltipName || ability.name || "Quick draw",
        badgeText: "[QUICK DRAW]",
        canAttack,
        reasonCannotAttack,
        minDamage,
        maxDamage,
        rawMinDamage,
        rawMaxDamage,
        targetArmor,
        effectiveTargetArmor: targetArmor - (traitResultMin.armorPenetrated ?? 0),
        flankStatus,
        facingBonus,
        attackerMultiplier,
        volleyMultiplier: traitResultMin.volleyMultiplier,
        chargeMultiplier: 1.0,
        shieldBlockReduction: traitResultMin.shieldBlockReduction,
        spearWallReduction: traitResultMin.spearWallReduction,
        armorPenetrated: traitResultMin.armorPenetrated ?? 0,
        defenderHpBefore: defHpBefore,
        defenderHpAfterMin: impactMax.remainingHp,
        defenderHpAfterMax: impactMin.remainingHp,
        defenderModelsBefore: defModelsBefore,
        minCasualties: impactMin.modelsLost,
        maxCasualties: impactMax.modelsLost,
        traveledHexes: 0,
        attackerModifiers,
        defenderModifiers,
      };
    } else {
      // Direct damage ability (e.g. Throw Javelin)
      const ammoRes = ability.resources?.find((r) => r.resource_used === AbilityResourceUse.Ammo);
      const staminaRes = ability.resources?.find((r) => r.resource_used === AbilityResourceUse.Stamina);
      const attackRes = ability.resources?.find((r) => r.resource_used === AbilityResourceUse.Attack);

      const ammoCost = ammoRes?.resource_cost ?? 1;
      const staminaCost = staminaRes?.resource_cost ?? 1;
      const attackCost = attackRes?.resource_cost ?? 1;

      const attackFromDir = resolveAttackFromDirection(attacker.pos, targetHex, hexMap);
      const { flankStatus, facingBonus } = resolveFlankAndFacingBonus(defender.facingDirection, attackFromDir, combatConfig);

      let canAttack = true;
      let reasonCannotAttack: string | undefined;

      if (isFriendly) {
        canAttack = false;
        reasonCannotAttack = "Target is a friendly unit";
      } else if (attacker.isPanickedOrRouting) {
        canAttack = false;
        reasonCannotAttack = "Unit is panicked or routing";
      } else if (attacker.exhaustionState === ExhaustionState.DEPLETED) {
        canAttack = false;
        reasonCannotAttack = "Stamina depleted";
      } else if (attacker.live_stats.remaining_attacks < attackCost) {
        canAttack = false;
        reasonCannotAttack = "No attacks remaining this turn";
      } else if (attacker.live_stats.remaining_ammo < ammoCost) {
        canAttack = false;
        reasonCannotAttack = `Need ${ammoCost} ammo (have ${attacker.live_stats.remaining_ammo})`;
      } else if (attacker.stats.stamina < staminaCost) {
        canAttack = false;
        reasonCannotAttack = `Need ${staminaCost} stamina (have ${attacker.stats.stamina})`;
      } else {
        const distance = hexMap.getDistance(attacker.pos, targetHex);
        const abilityRange = ability.range > 0 ? ability.range : 2;
        const inReach = isAbilityReachFn
          ? isAbilityReachFn(targetHex)
          : (isTargetAllowedForAbilityFn
              ? isTargetAllowedForAbilityFn(ability, attacker, targetHex)
              : distance <= abilityRange);
        if (!inReach && distance > abilityRange) {
          canAttack = false;
          reasonCannotAttack = `Target out of reach (max range ${abilityRange})`;
        }
      }

      const low = ability.damage_low ?? 8;
      const high = ability.damage_high ?? 10;
      const targetArmor = 0; // Javelin bypasses defender armor per applyAbilityEffect

      const minDamage = Math.max(0, low - targetArmor);
      const maxDamage = Math.max(0, high - targetArmor);

      const defHpBefore = defender.stats.remaining_health;
      const defModelsBefore = defender.aliveModelCount;

      const impactMin = estimateDamageImpact(defender, minDamage);
      const impactMax = estimateDamageImpact(defender, maxDamage);

      const skillName = ability.tooltipName || ability.name || "Throw javelin";
      const badgeText = isThrowJavelinAbility(ability)
        ? "[THROW JAVELIN]"
        : `[${skillName.toUpperCase()}]`;

      const attackerModifiers: string[] = [];
      const defenderModifiers: string[] = [];

      attackerModifiers.push(`${attacker.aliveModelCount}/${attacker.maxModels} models (${Math.round((attacker.aliveModelCount / attacker.maxModels) * 100)}%)`);
      attackerModifiers.push(`${skillName}: ${low}-${high} dmg (Cost: ${ammoCost} Ammo, ${staminaCost} Stamina, Range: ${ability.range > 0 ? ability.range : 2})`);
      if (attacker.exhaustionState !== ExhaustionState.FRESH) {
        attackerModifiers.push(`Stamina: ${attacker.exhaustionState}`);
      }
      if (attacker.stats.morale_state) {
        attackerModifiers.push(`Morale: ${attacker.stats.morale_state}`);
      }
      if (flankStatus === HexFlankStatus.BACKSTAB) {
        attackerModifiers.push("Backstab");
      } else if (flankStatus === HexFlankStatus.FLANK) {
        attackerModifiers.push("Flank");
      }

      defenderModifiers.push("Defense: Bypassed (Piercing)");

      return {
        attacker,
        defender,
        targetHex,
        originHex: attacker.pos,
        attackType: BattleActionType.ATTACK_RANGED,
        isRanged: true,
        ability,
        skillName,
        badgeText,
        canAttack,
        reasonCannotAttack,
        minDamage,
        maxDamage,
        rawMinDamage: low,
        rawMaxDamage: high,
        targetArmor: 0,
        effectiveTargetArmor: 0,
        flankStatus,
        facingBonus,
        attackerMultiplier: 1.0,
        volleyMultiplier: 1.0,
        chargeMultiplier: 1.0,
        shieldBlockReduction: 0,
        spearWallReduction: 0,
        armorPenetrated: 0,
        defenderHpBefore: defHpBefore,
        defenderHpAfterMin: impactMax.remainingHp,
        defenderHpAfterMax: impactMin.remainingHp,
        defenderModelsBefore: defModelsBefore,
        minCasualties: impactMin.modelsLost,
        maxCasualties: impactMax.modelsLost,
        traveledHexes: 0,
        attackerModifiers,
        defenderModifiers,
      };
    }
  }

  const minAttackStamina = Math.max(2, combatConfig.stamina.minAttackStamina ?? 2);
  const rangedStaminaCost = Math.max(minAttackStamina, combatConfig.stamina.actionCosts.rangedAttack);
  const meleeStaminaCost = Math.max(minAttackStamina, combatConfig.stamina.actionCosts.meleeAttack);

  const isAdjacent = hexMap.getNeighbours(attacker.pos).some(
    (n) => n.x === targetHex.x && n.y === targetHex.y
  );

  let isRanged = false;
  if (
    attacker.live_stats.is_ranged &&
    attacker.live_stats.remaining_ammo > 0 &&
    !meleePreference &&
    !isAdjacent
  ) {
    const inRangedReach = isHexInRangedReachFn ? isHexInRangedReachFn(targetHex) : false;
    if (inRangedReach || hexMap.getDistance(attacker.pos, targetHex) <= attacker.live_stats.range) {
      isRanged = true;
    }
  }

  const attackType = isRanged ? BattleActionType.ATTACK_RANGED : BattleActionType.ATTACK_MELEE;

  let originHex: Coords | null = null;
  let traveledHexes = 0;
  let traveledStaminaCost = 0;

  if (isRanged) {
    originHex = attacker.pos;
    traveledHexes = 0;
  } else {
    if (isAdjacent) {
      originHex = attacker.pos;
      traveledHexes = 0;
    } else if (approachHex) {
      originHex = approachHex;
      traveledHexes = hexMap.getDistance(attacker.pos, approachHex);
      if (findPathFn && getStaminaCostForPathFn) {
        const path = findPathFn(approachHex);
        if (path && path.length > 0) {
          traveledStaminaCost = getStaminaCostForPathFn(path, attacker);
        }
      }
    } else {
      const path = findPathFn ? findPathFn(targetHex) : [];
      if (path && path.length > 0) {
        if (path[path.length - 1].x === targetHex.x && path[path.length - 1].y === targetHex.y) {
          originHex = path.length > 1 ? path[path.length - 2] : attacker.pos;
          traveledHexes = Math.max(0, path.length - 1);
        } else {
          originHex = path[path.length - 1];
          traveledHexes = path.length;
        }
        if (getStaminaCostForPathFn) {
          traveledStaminaCost = getStaminaCostForPathFn(path.slice(0, traveledHexes), attacker);
        }
      } else {
        originHex = attacker.pos;
        traveledHexes = 0;
      }
    }
  }

  let canAttack = true;
  let reasonCannotAttack: string | undefined;

  if (isFriendly) {
    canAttack = false;
    reasonCannotAttack = "Target is a friendly unit";
  } else if (attacker.isPanickedOrRouting) {
    canAttack = false;
    reasonCannotAttack = "Unit is panicked or routing";
  } else if (attacker.live_stats.remaining_attacks <= 0) {
    canAttack = false;
    reasonCannotAttack = "No attacks remaining this turn";
  } else if (attacker.exhaustionState === ExhaustionState.DEPLETED) {
    canAttack = false;
    reasonCannotAttack = "Stamina depleted";
  } else {
    const requiredStamina = isRanged ? rangedStaminaCost : (traveledStaminaCost + meleeStaminaCost);
    if (attacker.stats.stamina < requiredStamina) {
      canAttack = false;
      reasonCannotAttack = `Need ${requiredStamina} stamina (have ${attacker.stats.stamina})`;
    } else if (isRanged && attacker.live_stats.remaining_ammo <= 0) {
      canAttack = false;
      reasonCannotAttack = "Out of ammunition";
    } else if (isRanged) {
      const inRangedReach = isHexInRangedReachFn ? isHexInRangedReachFn(targetHex) : false;
      if (!inRangedReach && hexMap.getDistance(attacker.pos, targetHex) > attacker.live_stats.range) {
        canAttack = false;
        reasonCannotAttack = "Target out of ranged reach";
      }
    } else if (!isAdjacent) {
      const originIsAdj = originHex && hexMap.getNeighbours(originHex).some((n) => n.x === targetHex.x && n.y === targetHex.y);
      if (!originIsAdj) {
        canAttack = false;
        reasonCannotAttack = "Target is unreachable";
      }
    }
  }

  const attackFromDir = resolveAttackFromDirection(originHex, targetHex, hexMap);
  const { flankStatus, facingBonus } = resolveFlankAndFacingBonus(defender.facingDirection, attackFromDir, combatConfig);

  let attackerStats = attacker.live_stats;
  if (originHex && (originHex.x !== attacker.pos.x || originHex.y !== attacker.pos.y)) {
    const terrainType = getTerrainAtFn ? getTerrainAtFn(originHex) : 0;
    attackerStats = computeVirtualLiveStatsAt(attacker, originHex, terrainType, combatConfig);
  }

  let attackerMultiplier = attacker.getDamageOutputMultiplier();
  if (traveledStaminaCost > 0) {
    const futureStamina = Math.max(0, attacker.stats.stamina - traveledStaminaCost);
    const futureExhaustion = getExhaustionState(
      futureStamina,
      attacker.stats.max_stamina,
      combatConfig
    );
    let futureExhaustionMod = 1.0;
    if (futureExhaustion === ExhaustionState.WINDED) futureExhaustionMod = 0.90;
    else if (futureExhaustion === ExhaustionState.EXHAUSTED) futureExhaustionMod = 0.70;
    else if (futureExhaustion === ExhaustionState.DEPLETED) futureExhaustionMod = 0.50;
    attackerMultiplier = (attacker.aliveModelCount / attacker.maxModels) * futureExhaustionMod;
  }

  const { low: scaledLow, high: scaledHigh } = getAttackerDamageBounds(attackerStats, attackType, attackerMultiplier);
  const targetArmor = resolveTargetDefense(defender, attackType);

  const traitResultMin = calculateDamageWithTraits({
    attacker,
    defender,
    attackType,
    baseDamage: scaledLow,
    facingBonus,
    targetArmor,
    attackFromDir,
    flankStatus,
    customMultiplier: 1.0,
    traitsConfig,
    commit: false,
    traveledHexes,
  });

  const traitResultMax = calculateDamageWithTraits({
    attacker,
    defender,
    attackType,
    baseDamage: scaledHigh,
    facingBonus,
    targetArmor,
    attackFromDir,
    flankStatus,
    customMultiplier: 1.0,
    traitsConfig,
    commit: false,
    traveledHexes,
  });

  const minDamage = Math.min(traitResultMin.damage, traitResultMax.damage);
  const maxDamage = Math.max(traitResultMin.damage, traitResultMax.damage);

  const defHpBefore = defender.stats.remaining_health;
  const defModelsBefore = defender.aliveModelCount;

  const impactMin = estimateDamageImpact(defender, minDamage);
  const impactMax = estimateDamageImpact(defender, maxDamage);

  const attackerModifiers: string[] = [];
  const defenderModifiers: string[] = [];

  attackerModifiers.push(`${attacker.aliveModelCount}/${attacker.maxModels} models (${Math.round((attacker.aliveModelCount / attacker.maxModels) * 100)}%)`);
  if (attacker.exhaustionState !== ExhaustionState.FRESH) {
    attackerModifiers.push(`Stamina: ${attacker.exhaustionState}`);
  }
  if (attacker.stats.morale_state) {
    attackerModifiers.push(`Morale: ${attacker.stats.morale_state}`);
  }

  const attTerrain = getTerrainAtFn ? (originHex ? getTerrainAtFn(originHex) : getTerrainAtFn(attacker.pos)) : 0;
  const attBuff = combatConfig.terrain.buffs[attTerrain];
  if (attBuff) {
    if (attBuff.attack_melee_high && !isRanged) attackerModifiers.push(`Hill: +${attBuff.attack_melee_high} Atk`);
    if (attBuff.attack_ranged_high && isRanged) attackerModifiers.push(`Hill: +${attBuff.attack_ranged_high} Ranged Atk`);
  }

  if (flankStatus === HexFlankStatus.BACKSTAB) {
    attackerModifiers.push(`Backstab: +${facingBonus} Atk`);
  } else if (flankStatus === HexFlankStatus.FLANK) {
    attackerModifiers.push(`Flank: +${facingBonus} Atk`);
  }

  if (traitResultMin.volleyMultiplier !== 1.0) {
    attackerModifiers.push(`Volley Fire: ${Math.round(traitResultMin.volleyMultiplier * 100)}%`);
  }
  if (traitResultMin.chargeMultiplier && traitResultMin.chargeMultiplier > 1.0) {
    attackerModifiers.push(`Charge: +${Math.round((traitResultMin.chargeMultiplier - 1.0) * 100)}%`);
  }
  if (traitResultMin.armorPenetrated && traitResultMin.armorPenetrated > 0) {
    attackerModifiers.push(`Armor Penetration: -${traitResultMin.armorPenetrated} Armor`);
  }

  defenderModifiers.push(`Defense: ${targetArmor}`);
  const defTerrain = getTerrainAtFn ? getTerrainAtFn(targetHex) : 0;
  const defBuff = combatConfig.terrain.buffs[defTerrain];
  if (defBuff) {
    if (defBuff.defense_melee && !isRanged) {
      defenderModifiers.push(`${defTerrain === TerrainType.HILL ? 'Hill' : defTerrain === TerrainType.SWAMP ? 'Swamp' : 'Terrain'}: ${defBuff.defense_melee > 0 ? '+' : ''}${defBuff.defense_melee} Def`);
    }
    if (defBuff.defense_ranged && isRanged) {
      defenderModifiers.push(`${defTerrain === TerrainType.FOREST ? 'Forest' : defTerrain === TerrainType.SWAMP ? 'Swamp' : 'Terrain'}: ${defBuff.defense_ranged > 0 ? '+' : ''}${defBuff.defense_ranged} Def`);
    }
  }
  if (defender.exhaustionState === ExhaustionState.DEPLETED) {
    defenderModifiers.push("Depleted: Armor halved");
  }
  if (traitResultMin.shieldBlockReduction > 0) {
    defenderModifiers.push(`Shield Block: -${traitResultMin.shieldBlockReduction} dmg`);
  }
  if (traitResultMin.spearWallReduction > 0) {
    defenderModifiers.push(`Spear Wall: -${traitResultMin.spearWallReduction} dmg`);
  }

  return {
    attacker,
    defender,
    targetHex,
    originHex,
    attackType,
    isRanged,
    canAttack,
    reasonCannotAttack,
    minDamage,
    maxDamage,
    rawMinDamage: traitResultMin.rawDamage,
    rawMaxDamage: traitResultMax.rawDamage,
    targetArmor,
    effectiveTargetArmor: targetArmor - (traitResultMin.armorPenetrated ?? 0),
    flankStatus,
    facingBonus,
    attackerMultiplier,
    volleyMultiplier: traitResultMin.volleyMultiplier,
    chargeMultiplier: traitResultMin.chargeMultiplier ?? 1.0,
    shieldBlockReduction: traitResultMin.shieldBlockReduction,
    spearWallReduction: traitResultMin.spearWallReduction,
    armorPenetrated: traitResultMin.armorPenetrated ?? 0,
    defenderHpBefore: defHpBefore,
    defenderHpAfterMin: impactMax.remainingHp,
    defenderHpAfterMax: impactMin.remainingHp,
    defenderModelsBefore: defModelsBefore,
    minCasualties: impactMin.modelsLost,
    maxCasualties: impactMax.modelsLost,
    traveledHexes,
    attackerModifiers,
    defenderModifiers,
  };
}
