import { HexDirection } from "./hex-map";
import { Coords } from "./shared";

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

    num_moves: 4
  };

  public position: Coords = { x: 0, y: 0 };
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

  constructor(
    public creatureType: CreatureType = CreatureType.PEASANT,
    public stats: CreatureStats = { ...Creature.DEFAULT_CREATURE_PROPS }) {
  }

  public get isAlive(): boolean {
    return this.stats.remaining_health > 0;
  }

  public takeDamage(damage: number) {
    this.stats.remaining_health -= damage;
  }

  public getRandomAttackDamageMelee(): number {
    return this.stats.attack_melee_low + Math.floor(Math.random() * (this.stats.attack_melee_high - this.stats.attack_melee_low + 1));
  }

  public getRandomAttackDamageRanged(): number {
    return this.stats.attack_ranged_low + Math.floor(Math.random() * (this.stats.attack_ranged_high - this.stats.attack_ranged_low + 1));
  }

}

export class CreatureRepository {
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

    let result = new Creature(creatureType, { ...creatureTemplate.stats });
    result.stats.remaining_attacks = result.stats.num_attacks;
    result.stats.remaining_counterattacks = result.stats.num_counterattacks;
    result.stats.remaining_health = result.stats.health;
    result.stats.remaining_movement = result.stats.num_moves;

    return result;
  }


}