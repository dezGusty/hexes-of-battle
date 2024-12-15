import { HexDirection } from "./hex-map";
import { Coords } from "./shared";

export class CreatureStats {
  attack_low: number = 1;
  attack_high: number = 2;
  defense_melee: number = 0;
  defense_ranged: number = 0;
  defense_magic: number = 0;
  health: number = 10;
  initiative: number = 3;
  is_ranged: boolean = false;
  max_health: number = 10;
  num_attacks: number = 1;
  range: number = 1;
  remaining_movement: number = 3;
  remaining_attacks: number = 1;
  speed: number = 3;
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

/**
 * Define a creature that is placed on the hex battle map.
 */
export class Creature {

  static DEFAULT_CREATURE_PROPS: CreatureStats = {
    attack_low: 3,
    attack_high: 6,
    defense_melee: 0,
    defense_ranged: 0,
    defense_magic: 0,
    health: 12,
    initiative: 4,
    is_ranged: false,
    max_health: 12,
    num_attacks: 1,
    range: 1,
    
    remaining_attacks: 1,
    remaining_movement: 4,

    speed: 4
  };

  public position: Coords = { x: 0, y: 0 };
  public facingDirection: HexDirection = HexDirection.EAST;
  public armyAlignment: number = 0;

  constructor(
    public creatureType: CreatureType = CreatureType.PEASANT,
    public stats: CreatureStats = { ...Creature.DEFAULT_CREATURE_PROPS }) {
  }

  public get isAlive(): boolean {
    return this.stats.health > 0;
  }

  public takeDamage(damage: number) {
    this.stats.health -= damage;
  }

  public getRandomAttackDamage(): number {
    return this.stats.attack_low + Math.floor(Math.random() * (this.stats.attack_high - this.stats.attack_low + 1));
  }

}