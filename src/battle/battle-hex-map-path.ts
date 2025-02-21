import { Coords } from "../shared";
import { HexMap } from "../shared/hex-map";
import { NumMatrix } from "../shared/num-matrix";
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
   * For a given start position and reach (typically depicting a unit's coordinated and movement points), 
   * calculate and cache the reachable tiles for the unit.
   * @param hexMap The hex map
   * @param startCoords The start position
   * @param reach The reach
   * @param pathfindingMatrix [in][out]The pathfinding matrix
   * @param terrainMoveCost The terrain move cost for each terrain type
   * @param mapData [input] The map data - contains the occupation tiles, terrain tiles and creature list
   * @param options [input] The options
   * @returns All hexes/tiles which can be reached.
   */
  public static cacheWalkableAndMeleeReachableCells(
    hexMap: HexMap,
    startCoords: Coords,
    reach: number,
    pathfindingMatrix: number[][],
    terrainMoveCost: Record<number, number>,
    mapData: { occupation_tiles: number[][], terrain_tiles: number[][], creatures: Creature[] },
    options: { markUnitsInArmies: number[] } = { markUnitsInArmies: [0, 1] },
  ): ReachData[] {
    // reset the cache
    let reachData: ReachData[] = [];
    NumMatrix.resetToZero(pathfindingMatrix);

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


  /**
   * Cache all reachable cells for the current creature for a ranged attack.
   * @param coords The start position
   * @param range The range to cache
   */
  public static cacheRangedReachableCells(
    hexMap: HexMap,
    coords: Coords,
    range: number,
    reachableCellsMatrix: number[][],
    targetMatrix: number[][],
    mapData: { creatures: Creature[] },
    options: { markUnitsInArmies: number[] } = { markUnitsInArmies: [0, 1] }): ReachData[] {

    let rangeData: ReachData[] = [];

    const occupied_value = BattleHexMapPath.CELL_PATH_OFFSET + 1;
    const border_value = BattleHexMapPath.CELL_PATH_OFFSET;
    HexMap.fillRadiusInMatrix(coords, range, reachableCellsMatrix, hexMap.width, hexMap.height, occupied_value, border_value);

    // Go through all creatures and check if they are situated in the pathfinding matrix
    mapData.creatures.forEach((creature) => {
      if (options.markUnitsInArmies.includes(creature.armyAlignment)) {
        const x = creature.pos.x;
        const y = creature.pos.y;
        if (x < 0 || x >= hexMap.width || y < 0 || y >= hexMap.height) {
          return;
        }

        if (reachableCellsMatrix[creature.pos.x][creature.pos.y] > 0) {
          rangeData.push(new ReachData(creature.pos, 1, coords));
          targetMatrix[creature.pos.x][creature.pos.y] = 500;
        }
      }
    });

    return rangeData;
  }

  /**
   * Find the path to a cell from the list of allin the reach data.
   * @param coords The coordinates to find the path to (end position). This is useful when hovering with the mouse over a hex and
   * we want to show the path to that hex.
   * @param reachData The full set of ReachData entries for the current creature. This will contain all reachable cells.
   * @returns An array containing the path to the cell.
   */
  public static findPathToCellInReachData(coords: Coords, reachData: ReachData[]): Coords[] {
    let path: Coords[] = [];
    // Get all reach data entries that have the same final coordinates.
    let finalElements = reachData.filter((element) => element.coords.x === coords.x && element.coords.y === coords.y);
    // If there are no such elements, return an empty path.
    if (finalElements.length === 0) {
      return path;
    }

    // If there are multiple elements, choose the one with the smallest cost / largest reach
    let finalElement = finalElements.reduce((prev, current) => prev.reach > current.reach ? prev : current);

    while (finalElements.length > 0 && finalElement) {
      path.push(finalElement.coords);

      finalElements = reachData.filter((element) =>
        element.coords.x === finalElement?.cameFrom.x
        && element.coords.y === finalElement?.cameFrom.y);

      if (finalElements.length === 0) {
        break;
      }
      finalElement = finalElements.reduce((prev, current) => prev.reach > current.reach ? prev : current);
    }

    path.reverse();
    return path;
  }
}