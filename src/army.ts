import { Creature } from "./creature";

/**
 * Store an entire army of units taking part in a battle.
 * This class will be used to store the units that are placed on the hex battle map.
 * Each player will have an army of units.
 */
export class Army {

  public creatures: Creature[] = [];

  // Further properties to take into account
  // General of army (either creature, army non-combat hero, or global hero/god)
  // Non creature units (e.g. siege weapons, traps, etc.)
  
}