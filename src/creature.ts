import { Coords } from "./shared";

export class CreatureStats {
  health: number;
  attack_low: number;
  attack_high: number;
  defense_melee: number;
  defense_ranged: number;
  defense_magic: number;
  speed: number;
  initiative: number;
}

export enum CreatureType {
  PEASANT = 0,
  PEASANT_ARCHER = 1,
  SWORDSMAN = 2,
  SPEARMAN = 3,
  CROSSBOWMAN = 4,
  ARCHER = 5,
};

/**
 * Define a creature that is placed on the hex battle map.
 */
export class Creature {

  static DEFAULT_CREATURE_PROPS: CreatureStats = {
    health: 12,
    attack_low: 3,
    attack_high: 6,
    defense_melee: 0,
    defense_ranged: 0,
    defense_magic: 0,
    speed: 4,
    initiative: 4
  };

  public position: Coords = { x: 0, y: 0 };

  constructor(
    public creatureType: CreatureType = CreatureType.PEASANT,
    public stats: CreatureStats = Creature.DEFAULT_CREATURE_PROPS) {
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