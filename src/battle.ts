import { Army } from "./army";
import { HexMap } from "./hex-map";

/**
 * Handles a battle on the hex battle map between two armies.
 */
export class Battle {
  constructor(
    public hexMap: HexMap,
    public army1: Army,
    public army2: Army) {
  }
  
}