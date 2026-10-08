import { HexDirection } from "../shared/hex-map";
import { Coords, getRandomValueBetween } from "../shared";
import { Ability } from "./ability";
import { GuidMaker, HobGUID } from "./guid";
import { ExhaustionState, MoraleState, getExhaustionState } from "./combat-rules";
import { SeedableRNG } from "../shared/prng";

export class CreatureStats {
  ammo: number = 0;
  attack_melee_low: number = 3;
  attack_melee_high: number = 5;
  attack_ranged_low: number = 3;
  attack_ranged_high: number = 5;
  defense_melee: number = 0;
  defense_ranged: number = 0;
  remaining_health: number = 10;
  initiative: number = 3;
  is_ranged: boolean = false;
  health: number = 10;
  num_attacks: number = 1;
  num_counterattacks: number = 1;
  range: number = 1;
  remaining_ammo: number = 0;
  remaining_attacks: number = 1;
  remaining_counterattacks: number = 1;
  remaining_movement: number = 3;
  num_moves: number = 3;
  stamina: number = 10;
  max_stamina: number = 10;
  morale: number = 50;
  base_morale: number = 50;
  model_count: number = 8;
  model_hp: number = 5;
  retaliations_done: number = 0;
  exhaustion_state: ExhaustionState = ExhaustionState.FRESH;
  morale_state: MoraleState = MoraleState.STEADY;
  is_hero: boolean = false;
  tier: number = 1;
  traits: string[] = [];
  flying: boolean = false;

  static EMPTY: CreatureStats = {
    ammo: 0,
    attack_melee_low: 0,
    attack_melee_high: 0,
    attack_ranged_low: 0,
    attack_ranged_high: 0,
    defense_melee: 0,
    defense_ranged: 0,
    remaining_health: 0,
    initiative: 0,
    is_ranged: false,
    health: 0,
    num_attacks: 0,
    num_counterattacks: 0,
    num_moves: 0,
    range: 0,
    remaining_ammo: 0,
    remaining_attacks: 0,
    remaining_counterattacks: 0,
    remaining_movement: 0,
    stamina: 0,
    max_stamina: 0,
    morale: 0,
    base_morale: 0,
    model_count: 0,
    model_hp: 0,
    retaliations_done: 0,
    exhaustion_state: ExhaustionState.FRESH,
    morale_state: MoraleState.STEADY,
    is_hero: false,
    tier: 1,
    traits: [],
    flying: false,
  };
}

export class UnitSource {
  name: string = "";
  creatureId: string = "";
}

export type BuffSource = "terrain" | "unit";

export class Buff {
  stats: CreatureStats = { ...CreatureStats.EMPTY };
  source: BuffSource = Buff.fromTerrain();

  constructor(stats: CreatureStats, source: BuffSource) {
    this.stats = stats;
    this.source = source;
  }

  static fromTerrain(): BuffSource {
    return "terrain";
  }
}

export enum CreatureType {
  PEASANT = 0,
  PEASANT_ARCHER = 1,
  SWORDSMAN = 2,
  SPEARMAN = 3,
  CROSSBOWMAN = 4,
  ARCHER = 5,
  BARBARIAN = 6,
  HEAVY_KNIGHTS = 7,
  BEHEMOTH = 8,
  HERO_COMMANDER = 9,
}

export class CreatureTemplate {
  name: string = "none";
  model_count: number = 8;
  model_hp: number = 5;
  tier: number = 1;
  is_hero: boolean = false;
  flying: boolean = false;
  traits: string[] = [];
  stats: CreatureStats = new CreatureStats();
  ability_ids: string[] = [];
}

/**
 * Define a creature (squad) that is placed on the hex battle map.
 */
export class Creature {
  static DEFAULT_CREATURE_PROPS: CreatureStats = {
    ammo: 0,
    attack_melee_low: 3,
    attack_melee_high: 6,
    attack_ranged_low: 3,
    attack_ranged_high: 5,
    defense_melee: 0,
    defense_ranged: 0,
    initiative: 4,
    is_ranged: false,
    health: 40,
    num_attacks: 1,
    num_counterattacks: 1,
    range: 1,

    remaining_ammo: 0,
    remaining_attacks: 1,
    remaining_counterattacks: 1,
    remaining_health: 40,
    remaining_movement: 4,

    num_moves: 4,
    stamina: 12,
    max_stamina: 12,
    morale: 50,
    base_morale: 50,
    model_count: 8,
    model_hp: 5,
    retaliations_done: 0,
    exhaustion_state: ExhaustionState.FRESH,
    morale_state: MoraleState.STEADY,
    is_hero: false,
    tier: 1,
    traits: [],
    flying: false,
  };

  public position: Coords = { x: 0, y: 0 };
  public get pos(): Coords {
    return this.position;
  }
  public get isFlying(): boolean {
    return this.stats.flying === true || this.stats.traits.includes('flying') || this.stats.traits.includes('Floating');
  }
  public facingDirection: HexDirection = HexDirection.EAST;
  public armyAlignment: number = 0;
  static CREATURE_NAMES: string[] = [
    "Peasant",
    "Peasant Archer",
    "Swordsman",
    "Spearman",
    "Crossbowman",
    "Archer",
    "Barbarian",
    "Heavy Knights",
    "Behemoth",
    "Hero Commander",
  ];

  private guid: HobGUID;

  constructor(
    public creatureType: CreatureType = CreatureType.PEASANT,
    public stats: CreatureStats = { ...Creature.DEFAULT_CREATURE_PROPS },
    public abilities: Ability[] = [],
    public buffs: Buff[] = []
  ) {
    this.guid = GuidMaker.generateGuid();
    if (this.stats.max_stamina <= 0) {
      this.stats.max_stamina = this.stats.stamina || 12;
    }
    if (this.stats.base_morale <= 0) {
      this.stats.base_morale = this.stats.morale || 50;
    }
    if (this.stats.model_hp <= 0 && this.stats.model_count > 0) {
      this.stats.model_hp = Math.max(1, Math.floor(this.stats.health / this.stats.model_count));
    }
    this.updateExhaustionState();
  }

  public get live_stats(): CreatureStats {
    let base = { ...this.stats };
    this.buffs.forEach((element) => {
      base = {
        ...base,
        ammo: base.ammo + element.stats.ammo,
        attack_melee_low: base.attack_melee_low + element.stats.attack_melee_low,
        attack_melee_high: base.attack_melee_high + element.stats.attack_melee_high,
        attack_ranged_low: base.attack_ranged_low + element.stats.attack_ranged_low,
        attack_ranged_high: base.attack_ranged_high + element.stats.attack_ranged_high,

        defense_melee: base.defense_melee + element.stats.defense_melee,
        defense_ranged: base.defense_ranged + element.stats.defense_ranged,
        initiative: base.initiative + element.stats.initiative,
        is_ranged: base.is_ranged,

        health: base.health + element.stats.health,
        num_attacks: base.num_attacks + element.stats.num_attacks,
        num_counterattacks: base.num_counterattacks + element.stats.num_counterattacks,
        range: base.range + element.stats.range,

        remaining_ammo: base.remaining_ammo + element.stats.remaining_ammo,
        remaining_attacks: base.remaining_attacks + element.stats.remaining_attacks,
        remaining_counterattacks: base.remaining_counterattacks + element.stats.remaining_counterattacks,
        remaining_health: base.remaining_health + element.stats.remaining_health,
        remaining_movement: base.remaining_movement + element.stats.remaining_movement,

        num_moves: base.num_moves + element.stats.num_moves,
        stamina: base.stamina + element.stats.stamina,
        morale: base.morale + element.stats.morale,
      };
    });

    // Apply exhaustion state to live_stats
    const exhaustion = this.exhaustionState;
    base.exhaustion_state = exhaustion;
    if (exhaustion === ExhaustionState.WINDED) {
      base.remaining_movement = Math.max(0, base.remaining_movement - 1);
    } else if (exhaustion === ExhaustionState.DEPLETED) {
      base.remaining_movement = 0;
      base.remaining_attacks = 0;
      base.remaining_counterattacks = 0;
      base.defense_melee = Math.floor(base.defense_melee * 0.5);
      base.defense_ranged = Math.floor(base.defense_ranged * 0.5);
    } else if (exhaustion === ExhaustionState.EXHAUSTED) {
      base.remaining_counterattacks = 0;
    }

    return base;
  }

  public get GUID(): HobGUID {
    return this.guid;
  }

  public get isAlive(): boolean {
    return this.stats.remaining_health > 0;
  }

  /**
   * Number of alive models in the squad based on threshold pooled HP.
   */
  public get aliveModelCount(): number {
    if (!this.isAlive) return 0;
    const modelHp = Math.max(1, this.stats.model_hp);
    const count = Math.ceil(this.stats.remaining_health / modelHp);
    return Math.min(this.stats.model_count, Math.max(1, count));
  }

  public get maxModels(): number {
    return Math.max(1, this.stats.model_count);
  }

  /**
   * Bodyguard count for hero squads (hero is the last model).
   */
  public get bodyguardCount(): number {
    if (!this.stats.is_hero || this.stats.model_count <= 1) return 0;
    return Math.max(0, this.aliveModelCount - 1);
  }

  public get exhaustionState(): ExhaustionState {
    return getExhaustionState(this.stats.stamina, this.stats.max_stamina);
  }

  public get isExhausted(): boolean {
    const state = this.exhaustionState;
    return state === ExhaustionState.EXHAUSTED || state === ExhaustionState.DEPLETED;
  }

  public get isPanickedOrRouting(): boolean {
    return this.stats.morale_state === MoraleState.PANICKED || this.stats.morale_state === MoraleState.ROUTING;
  }

  public updateExhaustionState(): ExhaustionState {
    this.stats.exhaustion_state = this.exhaustionState;
    return this.stats.exhaustion_state;
  }

  public hasTrait(traitName: string): boolean {
    return this.stats.traits.includes(traitName);
  }

  /**
   * Proportional squad combat efficiency multiplier (alive models / max models)
   * adjusted by stamina exhaustion.
   */
  public getDamageOutputMultiplier(): number {
    const modelRatio = this.aliveModelCount / this.maxModels;
    let exhaustionMod = 1.0;
    const state = this.exhaustionState;
    if (state === ExhaustionState.WINDED) {
      exhaustionMod = 0.90;
    } else if (state === ExhaustionState.EXHAUSTED) {
      exhaustionMod = 0.70;
    } else if (state === ExhaustionState.DEPLETED) {
      exhaustionMod = 0.50;
    }
    return modelRatio * exhaustionMod;
  }

  public takeDamage(damage: number): { modelsLost: number; remainingHp: number } {
    const prevModels = this.aliveModelCount;
    this.stats.remaining_health = Math.max(0, this.stats.remaining_health - damage);
    const nextModels = this.aliveModelCount;
    const modelsLost = Math.max(0, prevModels - nextModels);
    return { modelsLost, remainingHp: this.stats.remaining_health };
  }

  public consumeStamina(amount: number): number {
    this.stats.stamina = Math.max(0, this.stats.stamina - amount);
    this.updateExhaustionState();
    return this.stats.stamina;
  }

  public recoverStamina(amount: number): number {
    this.stats.stamina = Math.min(this.stats.max_stamina, this.stats.stamina + amount);
    this.updateExhaustionState();
    return this.stats.stamina;
  }

  public rest(amount: number = 5): number {
    return this.recoverStamina(amount);
  }

  public resetTurn(): void {
    this.stats.remaining_movement = this.stats.num_moves;
    this.stats.remaining_attacks = this.stats.num_attacks;
    this.stats.remaining_counterattacks = this.stats.num_counterattacks;
    this.stats.retaliations_done = 0;
    this.updateExhaustionState();
  }

  public getRandomAttackDamageMelee(rng?: SeedableRNG): number {
    const raw = rng
      ? rng.range(this.stats.attack_melee_low, this.stats.attack_melee_high)
      : getRandomValueBetween(this.stats.attack_melee_low, this.stats.attack_melee_high);
    const scaled = Math.max(1, Math.round(raw * this.getDamageOutputMultiplier()));
    return scaled;
  }

  public getRandomAttackDamageRanged(rng?: SeedableRNG): number {
    const raw = rng
      ? rng.range(this.stats.attack_ranged_low, this.stats.attack_ranged_high)
      : getRandomValueBetween(this.stats.attack_ranged_low, this.stats.attack_ranged_high);
    const scaled = Math.max(1, Math.round(raw * this.getDamageOutputMultiplier()));
    return scaled;
  }
}
