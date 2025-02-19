import { Coords } from "../shared";
import { HexMap } from "../shared/hex-map";
import { resetNumericalMatrixToZero } from "../shared/matrix";
import { ReachData } from "../shared/reach-data";
import { Creature } from "./creature";




export class BattleHexMapPath {

  static INVALID_CELL_MOVE_COST = 1;

  static CELL_ENEMY = 500;

  static CELL_PATH_OFFSET = 10;

  private static isCreatureAtOccupationTileInArmies(
    occupationTileValue: number,
    armyIndices: number[],
    creatures: Creature[]): boolean {

    if (occupationTileValue < 0 || occupationTileValue >= creatures.length) {
      return false;
    }

    return armyIndices.includes(creatures[occupationTileValue].armyAlignment);
  }

  /**
     * Prepare the map for pathfinding by caching the creatures and their positions.
     * Also caches reachable cells for the current creature.
     * This is different from the range version, as this takes obstacles into account.
     * @param startCoords 
     * @param reach 
     */
  public static cacheWalkableAndMeleeReachableCells(
    hexMap: HexMap,
    startCoords: Coords,
    reach: number,
    pathfindingMatrix: number[][],
    terrainMoveCost: Record<number, number>,
    mapData: { occupation_tiles: number[][], terrain_tiles: number[][], creatures: Creature[] },
    options: { markUnitsInArmies: number[] } = { markUnitsInArmies: [0, 1] }, // E.g. this.creatures[activeCreatureIdx].live_stats.remaining_attacks > 0
  ): ReachData[] {
    // reset the cache
    let reachData: ReachData[] = [];
    resetNumericalMatrixToZero(pathfindingMatrix);

    let frontier: ReachData[] = [{ coords: startCoords, reach, cameFrom: startCoords }];

    while (frontier.length > 0) {
      let current = frontier.shift();
      if (current === undefined) {
        continue;
      }
      // Normally we would break when reach is 0, but we want to also allow 
      // moving the creature to the max of its ability AND also allow an attack if configured.
      // so cache the cells if the reach is 0 and there are enemy creatures on them.
      if (current.reach < 0) {
        continue;
      }

      let neighbours = hexMap.getNeighbours(current.coords);

      // Store the neighbours and their reach values (cost and source).
      let neighbours_and_reach_pairs: ReachData[] = neighbours.map(neighbour_coords => {
        const terrain_type: number = (mapData.terrain_tiles[neighbour_coords.x][neighbour_coords.y] in Object.keys(terrainMoveCost))
          ? mapData.terrain_tiles[neighbour_coords.x][neighbour_coords.y]
          : BattleHexMapPath.INVALID_CELL_MOVE_COST;
        const cost: number = terrainMoveCost[terrain_type];
        return {
          coords: neighbour_coords,
          reach: current.reach - cost,
          cameFrom: current.coords
        }
      });

      for (let neighbour of neighbours_and_reach_pairs) {
        // visited already and cost better than this neighbour ? skip.
        if (pathfindingMatrix[neighbour.coords.x][neighbour.coords.y] > 0 &&
          pathfindingMatrix[neighbour.coords.x][neighbour.coords.y] >= neighbour.reach + BattleHexMapPath.CELL_PATH_OFFSET) {
          continue;
        }

        // Check presence of enemies. For occupied tiles, don't pass through units (friendly or enemies)
        // (TODO: add option to pass through at some point?)
        if (mapData.occupation_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          if (options.markUnitsInArmies.length > 0) {
            if (BattleHexMapPath.isCreatureAtOccupationTileInArmies(
              mapData.occupation_tiles[neighbour.coords.x][neighbour.coords.y] - 1,
              options.markUnitsInArmies, mapData.creatures)) {
              // don't add it to the frontier, (cannot pass through enemy)
              // but add it to the reachable cells
              reachData.push(neighbour);
              pathfindingMatrix[neighbour.coords.x][neighbour.coords.y] = BattleHexMapPath.CELL_ENEMY;
            }
          }
          continue;
        }

        if (current.reach > 0) {
          frontier.push(neighbour);
          reachData.push(neighbour);
          pathfindingMatrix[neighbour.coords.x][neighbour.coords.y] = neighbour.reach + BattleHexMapPath.CELL_PATH_OFFSET;
        }
      }
    }

    return reachData;
  }
}