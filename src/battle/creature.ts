import { HexDirection } from "../hex-map";
import { Coords, getRandomValueBetween } from "../shared";
import { Ability } from "./ability";
import { GuidMaker, HobGUID } from "./guid";

export class CreatureStats {
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
  remaining_attacks: number = 1;
  remaining_counterattacks: number = 1;
  remaining_movement: number = 3;
  num_moves: number = 3;
  stamina: number = 10;

  static EMPTY: CreatureStats = {
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
    range: 0,
    remaining_attacks: 0,
    remaining_counterattacks: 0,
    remaining_movement: 0,
    num_moves: 0,
    stamina: 0
  }
}

export class UnitSource {
  name: string = "";
  creatureId: string = "";
}

export type BuffSource = "terrain" | "unit";

export class Buff {
  stats: CreatureStats = { ... CreatureStats.EMPTY };
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
};


export class CreatureTemplate {
  name: string = "none";
  stats: CreatureStats = new CreatureStats();
  ability_ids: string[] = [];
}



/**
 * Define a creature that is placed on the hex battle map.
 */
export class Creature {

  static DEFAULT_CREATURE_PROPS: CreatureStats = {
    attack_melee_low: 3,
    attack_melee_high: 6,
    attack_ranged_low: 3,
    attack_ranged_high: 5,
    defense_melee: 0,
    defense_ranged: 0,
    initiative: 4,
    is_ranged: false,
    health: 12,
    num_attacks: 1,
    num_counterattacks: 1,
    range: 1,

    remaining_attacks: 1,
    remaining_counterattacks: 1,
    remaining_health: 12,
    remaining_movement: 4,

    num_moves: 4,
    stamina: 10
  };

  public position: Coords = { x: 0, y: 0 };
  public get pos(): Coords {
    return this.position;
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
    "Barbarian"
  ];

  private guid: HobGUID;

  constructor(
    public creatureType: CreatureType = CreatureType.PEASANT,
    public stats: CreatureStats = { ...Creature.DEFAULT_CREATURE_PROPS },
    public abilities: Ability[] = [],
    public buffs: Buff[] = []) {
    this.guid = GuidMaker.generateGuid();
  }

  public get live_stats(): CreatureStats {
    let base = this.stats;
    // Apply buffs, by adding the properties of each buff to the base stats
    this.buffs.forEach(element => {
      base = {
        // ...base, 
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
        remaining_attacks: base.remaining_attacks + element.stats.remaining_attacks,
        remaining_counterattacks: base.remaining_counterattacks + element.stats.remaining_counterattacks,
        remaining_health: base.remaining_health + element.stats.remaining_health,
        remaining_movement: base.remaining_movement + element.stats.remaining_movement,
        num_moves: base.num_moves + element.stats.num_moves,
        stamina: base.stamina + element.stats.stamina
      };
    });

    return base;
  }

  public get GUID(): HobGUID {
    return this.guid;
  }

  public get isAlive(): boolean {
    return this.stats.remaining_health > 0;
  }

  public takeDamage(damage: number) {
    this.stats.remaining_health -= damage;
  }

  public getRandomAttackDamageMelee(): number {
    return getRandomValueBetween(this.stats.attack_melee_low, this.stats.attack_melee_high);
  }

  public getRandomAttackDamageRanged(): number {
    return getRandomValueBetween(this.stats.attack_ranged_low, this.stats.attack_ranged_high);
  }
}

export class CreatureRepository {
  abilities: Ability[] = [];
  creatureTemplates: CreatureTemplate[] = [];
  nameToTypesMap: Map<CreatureType, string> = new Map<CreatureType, string>([
    [CreatureType.PEASANT, "peasant"],
    [CreatureType.PEASANT_ARCHER, "peasant-archer"],
    [CreatureType.SWORDSMAN, "swordsman"],
    [CreatureType.SPEARMAN, "spearman"],
    [CreatureType.CROSSBOWMAN, "crossbowman"],
    [CreatureType.BARBARIAN, "barbarian"]
  ]);

  constructor() { }

  setAbilities(abilities: Ability[]) {
    this.abilities = abilities;
  }

  setCreatureTemplates(templates: CreatureTemplate[]) {
    this.creatureTemplates = templates;
  }

  createCreature(creatureType: CreatureType): Creature {

    // get the creature type name based on the creature type
    const creatureTypeName = this.nameToTypesMap.get(creatureType);

    // find the template by the creature name
    const creatureTemplate = this.creatureTemplates.find(template => template.name === creatureTypeName);
    if (!creatureTemplate) {
      throw new Error(`Could not find creature template for creature type ${creatureType}`);
    }

    let result = new Creature(creatureType, { ...creatureTemplate.stats }, []);
    result.stats.remaining_attacks = result.stats.num_attacks;
    result.stats.remaining_counterattacks = result.stats.num_counterattacks;
    result.stats.remaining_health = result.stats.health;
    result.stats.remaining_movement = result.stats.num_moves;

    result.abilities = creatureTemplate.ability_ids.map(abilityId => {
      const ability = this.abilities.find(ability => ability.id === abilityId);
      if (!ability) {
        return null;
      }
      return ability;
    }).filter(ability => ability !== null) as Ability[];

    console.log("Created creature: ", result);

    return result;
  }
}