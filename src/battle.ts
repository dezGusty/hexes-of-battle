import { Creature } from "./creature";
import { HexMap } from "./hex-map";
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

export class ReachData {
  constructor(public coords: Coords, public reach: number, public cameFrom: Coords) { }
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

  public pathfinding_tiles: number[][] = [];
  // Units and objects which occupy a tile
  public cached_occupation_tiles: number[][] = [];

  private nextRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  private unitReachData: ReachData[] = [];

  constructor(
    public hexMap: HexMap) {
  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    this.hexMap.initializeToSize(mapWidth, mapHeight);
    for (let i = 0; i < mapWidth; i++) {
      this.pathfinding_tiles[i] = [];
      this.cached_occupation_tiles[i] = [];
      for (let j = 0; j < mapHeight; j++) {
        this.pathfinding_tiles[i][j] = 0;
        this.cached_occupation_tiles[i][j] = 0;
      }
    }
  }

  selectCreatureByArmyIndex(armyIndex: number, creatureIndex: number) {
    this.activeCreatureIndex = creatureIndex;
    this.currentArmyIndex = armyIndex;
    this.renderStateChanged = true;

    this.nextRenderUpdate.selectedCreatureIndex = creatureIndex;
    this.nextRenderUpdate.currentArmyIndex = armyIndex;
    this.nextRenderUpdate.somethingChanged = true;

    console.log(`Selected creature at: ${this.currentArmyIndex}, ${this.activeCreatureIndex}`);
  }

  cacheCreaturesToHexMap() {
    for (let i = 0; i < this.hexMap.width; i++) {
      for (let j = 0; j < this.hexMap.height; j++) {
        this.cached_occupation_tiles[i][j] = 0;
      }
    }

    for (let i = 0; i < this.creatures.length; i++) {
      let creature = this.creatures[i];
      this.cached_occupation_tiles[creature.position.x][creature.position.y] = i + 1;
    }
  }

  
  public cacheAllReachableCells(coords: Coords, reach: number) {
    // reset the cache
    for (let i = 0; i < this.hexMap.width; i++) {
      for (let j = 0; j < this.hexMap.height; j++) {
        this.pathfinding_tiles[i][j] = 0;
      }
    }
    this.unitReachData = [];

    let frontier: ReachData[] = [{ coords, reach, cameFrom: coords }];

    while (frontier.length > 0) {
      let current = frontier.shift();
      if (current === undefined) {
        continue;
      }
      if (current.reach <= 0) {
        continue;
      }

      
      let neighbours = this.hexMap.getNeighbours(current.coords);
      let neighbours_and_reach_pairs: ReachData[] = neighbours.map(neighbour => { return { 
        coords: neighbour, 
        reach: current.reach - 1,
        cameFrom: current.coords
      } });

      for (let neighbour of neighbours_and_reach_pairs) {
        if (this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          continue;
        }

        if (this.cached_occupation_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          // occupied by a unit
          // TODO: handle scenario where it is an enemy differently from friend?
          continue;
        }

        frontier.push(neighbour);
        this.unitReachData.push(neighbour);

        this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] = 1;
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
        msg += this.pathfinding_tiles[i][j] + " ";
      }
      msg += "\n";
    }
    console.log(msg);

    // show the reach data
    for (let i = 0; i < this.unitReachData.length; i++) {
      console.log("Reachable cell:" ,  this.unitReachData[i]);
    }

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