import { Army } from "./army";
import { Creature } from "./creature";
import { HexMap, ReachData } from "./hex-map";
import { Coords } from "./shared";

export class CreatureInBattle {
  constructor(
    public creature: Creature,
    public position: Coords,
    public indexInArmy: number,
    public indexOFArmy: number) {
  }
}

export class MapRenderUpdate {
  public selectedCreatureIndex: number = -1;
  public currentArmyIndex: number = 0;
  public reachableCells: boolean = false;

  public somethingChanged: boolean = false;
}

/**
 * Handles a battle on the hex battle map between two armies.
 */
export class Battle {

  private currentArmyIndex: number = 0;
  private activeCreatureIndex: number = -1;

  // private creaturesInBattle: CreatureInBattle[] = [];
  public renderStateChanged: boolean = true;
  public creatures: Creature[] = [];

  private nextRenderUpdate: MapRenderUpdate = new MapRenderUpdate();

  constructor(
    public hexMap: HexMap) {
  }

  selectCreatureByArmyIndex(armyIndex: number, creatureIndex: number) {
    this.activeCreatureIndex = creatureIndex;
    this.currentArmyIndex = armyIndex;
    this.renderStateChanged = true;

    this.nextRenderUpdate.selectedCreatureIndex = creatureIndex;
    this.nextRenderUpdate.currentArmyIndex = armyIndex;
    this.nextRenderUpdate.somethingChanged = true;

    console.log(`Selected creature: ${this.currentArmyIndex}, ${this.activeCreatureIndex}`);
  }

  cacheCreaturesToHexMap() {
    for (let i = 0; i < this.hexMap.width; i++) {
      for (let j = 0; j < this.hexMap.height; j++) {
        this.hexMap.tiles[i][j] = 0;
      }
    }

    for (let i = 0; i < this.creatures.length; i++) {
      let creature = this.creatures[i];
      this.hexMap.tiles[creature.position.x][creature.position.y] = i + 1;
    }
  }

  
  public cacheAllReachableCells(coords: Coords, reach: number) {
    // reset the cache
    for (let i = 0; i < this.hexMap.width; i++) {
      for (let j = 0; j < this.hexMap.height; j++) {
        this.hexMap.pathfinding_tiles[i][j] = 0;
      }
    }

    let frontier: ReachData[] = [{ coords, reach }];
    // let came_from: { [key: string]: Coords } = {};
    // let came_from: Record<Coords, Coords> = {};

    while (frontier.length > 0) {
      let current = frontier.shift();
      if (current === undefined) {
        continue;
      }
      if (current.reach <= 0) {
        continue;
      }

      let neighbours = this.hexMap.getNeighbours(current.coords);
      let neighbours_and_reach_pairs: ReachData[] = neighbours.map(neighbour => { return { coords: neighbour, reach: current.reach - 1 } });

      for (let neighbour of neighbours_and_reach_pairs) {
        if (this.hexMap.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          continue;
        }

        if (this.hexMap.tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          // occupied by a unit
          // TODO: allow it, but mark it differently?
          continue;
        }

        frontier.push(neighbour);
        // came_from[`${neighbour.x},${neighbour.y}`] = current;
        this.hexMap.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] = 1;
      }
    }
  }


  showReachableCells(creature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    // let creatureInBattle = this.creatures[this.currentArmyIndex];
    let creaturePosition = creature.position;
    let creatureReach = creature.stats.speed;

    // TODO: this could also be done when movement occurs
    this.cacheCreaturesToHexMap();

    this.cacheAllReachableCells(creaturePosition, creatureReach);
    let msg = "";
    for (let j = 0; j < this.hexMap.height; j++) {
      for (let i = 0; i < this.hexMap.width; i++) {
        msg += this.hexMap.pathfinding_tiles[i][j] + " ";
      }
      msg += "\n";
    }
    console.log(msg);

    // for (let i = -creatureReach; i <= creatureReach; i++) {
    //   for (let j = Math.max(-creatureReach, -i - creatureReach); j <= Math.min(creatureReach, -i + creatureReach); j++) {
    //     let coords = { x: creaturePosition.x + i, y: creaturePosition.y + j };
    //     if (coords.x >= 0 && coords.x < this.hexMap.width && coords.y >= 0 && coords.y < this.hexMap.height) {
    //       reachableCells.push(coords);
    //     }
    //   }
    // }

    this.nextRenderUpdate.reachableCells = true;
    return reachableCells;
  }


  getCreatureAtPosition(coords: Coords): CreatureInBattle | null {
    for (let index = 0; index < this.creatures.length; index++) {
      if (this.creatures[index].position.x == coords.x && this.creatures[index].position.y == coords.y) {
        return new CreatureInBattle(this.creatures[index], coords, index, 0);
      } 
    }

    return null;
  }

  onMouseClickOnCell(event: MouseEvent, coords: Coords) {
    console.log(`Mouse click on cell: ${coords.x}, ${coords.y}`);
    // Left mouse button
    if (event.button === 0) {
      let creatureInBattle: CreatureInBattle | null = this.getCreatureAtPosition(coords);
      if (creatureInBattle !== null) {
        this.selectCreatureByArmyIndex(creatureInBattle.indexOFArmy, creatureInBattle.indexInArmy);
        this.showReachableCells(creatureInBattle.creature);
      }

    }
  }


  public nextTurn() {
    this.currentArmyIndex = (this.currentArmyIndex + 1) % 2;
    this.activeCreatureIndex = -1;
  }

  public update(delta: number): MapRenderUpdate {
    let result = this.nextRenderUpdate;

    this.nextRenderUpdate = new MapRenderUpdate();

    return result;
  }
}