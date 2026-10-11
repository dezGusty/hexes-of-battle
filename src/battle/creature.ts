import { HexDirection } from "../shared/hex-map";
import { Coords, getRandomValueBetween } from "../shared";
import { Ability } from "./ability";
import { GuidMaker, HobGUID } from "./guid";
import { ExhaustionState, MoraleState, getExhaustionState, getMoraleState } from "./combat-rules";
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
  morale: number = 10;
  max_morale: number = 30;
  base_morale: number = 10;
  model_count: number = 8;
  model_hp: number = 5;
  retaliations_done: number = 0;
  exhaustion_state: ExhaustionState = ExhaustionState.FRESH;
  morale_state: MoraleState = MoraleState.STEADY;
  took_damage_this_turn: boolean = false;
  is_hero: boolean = false;
  tier: number = 1;
  traits: string[] = [];
  flying: boolean = false;
  has_rested: boolean = false;

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
    max_morale: 30,
    base_morale: 0,
    model_count: 0,
    model_hp: 0,
    retaliations_done: 0,
    exhaustion_state: ExhaustionState.FRESH,
    morale_state: MoraleState.STEADY,
    took_damage_this_turn: false,
    is_hero: false,
    tier: 1,
    traits: [],
    flying: false,
    has_rested: false,
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
    morale: 10,
    max_morale: 30,
    base_morale: 10,
    model_count: 8,
    model_hp: 5,
    retaliations_done: 0,
    exhaustion_state: ExhaustionState.FRESH,
    morale_state: MoraleState.STEADY,
    took_damage_this_turn: false,
    is_hero: false,
    tier: 1,
    traits: [],
    flying: false,
    has_rested: false,
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
    this.stats.num_attacks = this.stats.num_attacks ?? 1;
    this.stats.num_counterattacks = this.stats.num_counterattacks ?? 1;
    this.stats.num_moves = this.stats.num_moves ?? 3;
    this.stats.health = this.stats.health ?? 40;
    this.stats.remaining_health = this.stats.remaining_health ?? this.stats.health;
    this.stats.remaining_attacks = this.stats.remaining_attacks ?? this.stats.num_attacks;
    this.stats.remaining_counterattacks = this.stats.remaining_counterattacks ?? this.stats.num_counterattacks;
    this.stats.remaining_movement = this.stats.remaining_movement ?? this.stats.num_moves;
    this.stats.remaining_ammo = this.stats.remaining_ammo ?? this.stats.ammo ?? 0;
    this.stats.retaliations_done = this.stats.retaliations_done ?? 0;
    this.stats.has_rested = this.stats.has_rested ?? false;

    if (this.stats.max_stamina <= 0 || Number.isNaN(this.stats.max_stamina)) {
      this.stats.max_stamina = this.stats.stamina || 12;
    }
    if (this.stats.max_morale <= 0 || Number.isNaN(this.stats.max_morale)) {
      this.stats.max_morale = 30;
    }
    if (this.stats.morale == null || Number.isNaN(this.stats.morale)) {
      this.stats.morale = 10;
    }
    if (this.stats.morale > 30) {
      this.stats.morale = Math.round(this.stats.morale * 0.3);
    }
    this.stats.morale = Math.max(0, Math.min(this.stats.max_morale, this.stats.morale));
    if (this.stats.base_morale == null || Number.isNaN(this.stats.base_morale) || this.stats.base_morale <= 0) {
      this.stats.base_morale = this.stats.morale;
    }
    this.stats.took_damage_this_turn = false;
    if (this.stats.model_hp <= 0 && this.stats.model_count > 0) {
      this.stats.model_hp = Math.max(1, Math.floor(this.stats.health / this.stats.model_count));
    }
    this.updateMoraleState();
    this.updateExhaustionState();
  }

  public get live_stats(): CreatureStats {
    let base = { ...this.stats };
    if (base.morale == null || Number.isNaN(base.morale)) {
      base.morale = 10;
    }
    this.buffs.forEach((element) => {
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
        is_ranged: base.is_ranged,

        health: (base.health ?? 0) + (element.stats?.health ?? 0),
        num_attacks: (base.num_attacks ?? 0) + (element.stats?.num_attacks ?? 0),
        num_counterattacks: (base.num_counterattacks ?? 0) + (element.stats?.num_counterattacks ?? 0),
        range: (base.range ?? 0) + (element.stats?.range ?? 0),

        remaining_ammo: (base.remaining_ammo ?? 0) + (element.stats?.remaining_ammo ?? 0),
        remaining_attacks: (base.remaining_attacks ?? 0) + (element.stats?.remaining_attacks ?? 0),
        remaining_counterattacks: (base.remaining_counterattacks ?? 0) + (element.stats?.remaining_counterattacks ?? 0),
        remaining_health: (base.remaining_health ?? 0) + (element.stats?.remaining_health ?? 0),
        remaining_movement: (base.remaining_movement ?? 0) + (element.stats?.remaining_movement ?? 0),

        num_moves: (base.num_moves ?? 0) + (element.stats?.num_moves ?? 0),
        stamina: (base.stamina ?? 0) + (element.stats?.stamina ?? 0),
        morale: (base.morale ?? 10) + (element.stats?.morale ?? 0),
      };
    });

    if (base.morale == null || Number.isNaN(base.morale)) {
      base.morale = 10;
    }

    // Apply morale state to live_stats
    const moraleState = this.moraleState;
    base.morale_state = moraleState;
    if (moraleState === MoraleState.ROUTING) {
      base.remaining_movement = 0;
      base.remaining_attacks = 0;
      base.remaining_counterattacks = 0;
    } else if (moraleState === MoraleState.PANICKED) {
      base.remaining_attacks = 0;
      base.remaining_counterattacks = 0;
    }

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

  public get moraleState(): MoraleState {
    return getMoraleState(this.stats.morale);
  }

  public get isPanickedOrRouting(): boolean {
    const state = this.moraleState;
    return state === MoraleState.PANICKED || state === MoraleState.ROUTING;
  }

  public updateExhaustionState(): ExhaustionState {
    this.stats.exhaustion_state = this.exhaustionState;
    return this.stats.exhaustion_state;
  }

  public updateMoraleState(): MoraleState {
    this.stats.morale_state = this.moraleState;
    return this.stats.morale_state;
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
    if (damage > 0) {
      this.stats.took_damage_this_turn = true;
      this.consumeMorale(1);
    }
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

  public consumeMorale(amount: number): number {
    if (this.stats.morale == null || Number.isNaN(this.stats.morale)) {
      this.stats.morale = 10;
    }
    this.stats.morale = Math.max(0, Math.min(this.stats.max_morale || 30, this.stats.morale - amount));
    this.updateMoraleState();
    return this.stats.morale;
  }

  public recoverMorale(amount: number = 1): number {
    if (this.stats.morale == null || Number.isNaN(this.stats.morale)) {
      this.stats.morale = 10;
    }
    this.stats.morale = Math.max(0, Math.min(this.stats.max_morale || 30, this.stats.morale + amount));
    this.updateMoraleState();
    return this.stats.morale;
  }

  public canRest(): boolean {
    if (!this.isAlive) return false;
    if (this.stats.has_rested) return false;
    if (this.stats.stamina >= this.stats.max_stamina) return false;
    if (this.stats.remaining_movement < this.stats.num_moves) return false;
    if (this.stats.remaining_attacks < this.stats.num_attacks) return false;
    return true;
  }

  public rest(amount: number = 5): number {
    this.recoverMorale(1);
    return this.recoverStamina(amount);
  }

  public resetTurn(): void {
    if (!this.stats.took_damage_this_turn) {
      this.recoverMorale(1);
    }
    this.stats.took_damage_this_turn = false;
    this.stats.remaining_movement = this.stats.num_moves;
    this.stats.remaining_attacks = this.stats.num_attacks;
    this.stats.remaining_counterattacks = this.stats.num_counterattacks;
    this.stats.retaliations_done = 0;
    this.stats.has_rested = false;
    this.updateMoraleState();
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
