import { Creature } from "./creature";
import { HexDirection, HexMap, reverseDirection } from "./hex-map";
import { Coords } from "./shared";

export class CreatureInBattle {
  constructor(
    public creature: Creature,
    public position: Coords,
    public indexInArmy: number,
    public indexOFArmy: number) {
  }
}

export enum AnimationType {
  NONE = 0,
  ATTACK_MELEE = 1,
  ATTACK_RANGED = 2
}

export class AnimationAtCoords {
  static DEFAULT = new AnimationAtCoords(AnimationType.NONE, { x: 0, y: 0 });
  constructor(
    public type: AnimationType,
    public coords: Coords) {
  }
}

export class MapRenderUpdate {
  public selectedCreatureIndex: number = -1;
  public currentArmyIndex: number = 0;
  public reachableCells: boolean = false;
  public unitRenderUpdate: boolean = false;
  public hoverOverCell: Coords | null = null;
  public hoverPath: Coords[] = [];
  public cursorHint: string = "";
  public animationAtCoords: AnimationAtCoords = { ...AnimationAtCoords.DEFAULT };

  public somethingChanged: boolean = false;

}

export class ReachData {
  constructor(public coords: Coords, public reach: number, public cameFrom: Coords) { }
}

export enum BattleActionType {
  NONE = 0,
  MOVE = 1,
  ATTACK_MELEE = 2,
  ATTACK_RANGED = 3,
}

export class BattleAction {
  constructor(
    public type: BattleActionType,
    public path: Coords[],
    public step: number = 0,
    public stepDuration: number = 0,
    public remainingTime: number = 0) {
  }
}

/**
 * Handles a battle on the hex battle map between two armies.
 */
export class Battle {

  private currentArmyIndex: number = 0;
  public activeCreatureIndex: number = -1;

  public renderStateChanged: boolean = true;
  public creatures: Creature[] = [];

  public pathfinding_tiles: number[][] = [];
  // Units and objects which occupy a tile
  public cached_occupation_tiles: number[][] = [];

  private nextRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  private unitReachData: ReachData[] = [];
  private unitRangeData: ReachData[] = [];

  private currentActions: BattleAction[] = [];

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
    // this.currentArmyIndex = armyIndex;
    this.renderStateChanged = true;

    this.nextRenderUpdate.selectedCreatureIndex = creatureIndex;
    this.nextRenderUpdate.currentArmyIndex = armyIndex;
    this.nextRenderUpdate.somethingChanged = true;

    console.log(`Selected creature in army: ${this.currentArmyIndex}, at index ${this.activeCreatureIndex}`);
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

  public cacheRangedReachableCells(coords: Coords, range: number) {
    this.unitRangeData = [];
    let frontier: ReachData[] = [{ coords, reach: range, cameFrom: coords}];
    while (frontier.length > 0) {
      let current = frontier.shift();
      if (current === undefined) {
        continue;
      }
      if (current.reach <= 0) {
        continue;
      }

      let neighbours = this.hexMap.getNeighbours(current.coords);
      let neighbours_and_reach_pairs: ReachData[] = neighbours.map(neighbour => {
        return {
          coords: neighbour,
          reach: current.reach - 1,
          cameFrom: current.coords
        }
      });

      for (let neighbour of neighbours_and_reach_pairs) {

        if (this.cached_occupation_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          const creatureIndex = this.cached_occupation_tiles[neighbour.coords.x][neighbour.coords.y] - 1;
          if (this.creatures[creatureIndex].armyAlignment !== this.currentArmyIndex) {

            // don't add it to the frontier, (cannot pass through enemy)
            // but add it to the reachable cells
            this.unitRangeData.push(neighbour);
            this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] = 100;
          }
          // ELSE - occupied by a unit in the same army
          continue;
        }

        frontier.push(neighbour);
        this.unitRangeData.push(neighbour);
      }
    }
  }

  /**
   * Prepare the map for pathfinding by caching the creatures and their positions.
   * Also caches reachable cells for the current creature.
   * This is different from the range version, as this takes obstacles into account.
   * @param coords 
   * @param reach 
   */
  public cacheMeleeReachableCells(coords: Coords, reach: number) {
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
      // Normally we would break when reach is 0, but we want to also allow 
      // moving the creature to the max of its ability AND also allow an attack if configured.
      // so cache the cells if the reach is 0 and there are enemy creatures on them.
      if (current.reach < 0) {
        continue;
      }

      let neighbours = this.hexMap.getNeighbours(current.coords);
      let neighbours_and_reach_pairs: ReachData[] = neighbours.map(neighbour => {
        return {
          coords: neighbour,
          reach: current.reach - 1,
          cameFrom: current.coords
        }
      });

      for (let neighbour of neighbours_and_reach_pairs) {
        if (this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          continue;
        }

        if (this.cached_occupation_tiles[neighbour.coords.x][neighbour.coords.y] > 0) {
          const creatureIndex = this.cached_occupation_tiles[neighbour.coords.x][neighbour.coords.y] - 1;
          if (this.creatures[creatureIndex].armyAlignment !== this.currentArmyIndex) {

            // don't add it to the frontier, (cannot pass through enemy)
            // but add it to the reachable cells
            this.unitReachData.push(neighbour);
            this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] = 100;
          }
          // ELSE - occupied by a unit in the same army
          continue;
        }

        if (current.reach > 0) {
          frontier.push(neighbour);
          this.unitReachData.push(neighbour);
          this.pathfinding_tiles[neighbour.coords.x][neighbour.coords.y] = 1;
        }
      }
    }
  }


  showReachableCells(creature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    let creaturePosition = creature.position;

    // TODO: this could also be done when movement occurs
    this.cacheCreaturesToHexMap();

    this.cacheMeleeReachableCells(creaturePosition, creature.stats.remaining_movement);
    this.cacheRangedReachableCells(creaturePosition, creature.stats.range);
    // let msg = "";
    // for (let j = 0; j < this.hexMap.height; j++) {
    //   for (let i = 0; i < this.hexMap.width; i++) {
    //     msg += this.pathfinding_tiles[i][j] + " ";
    //   }
    //   msg += "\n";
    // }
    // console.log(msg);

    // show the reach data
    // for (let i = 0; i < this.unitReachData.length; i++) {
    //   console.log("Reachable cell:", this.unitReachData[i]);
    // }

    this.nextRenderUpdate.reachableCells = true;
    return reachableCells;
  }


  getCreatureAtPosition(coords: Coords): CreatureInBattle | null {
    for (let index = 0; index < this.creatures.length; index++) {
      if (this.creatures[index].position.x == coords.x && this.creatures[index].position.y == coords.y) {
        return new CreatureInBattle(this.creatures[index], coords, index, this.creatures[index].armyAlignment);
      }
    }

    return null;
  }

  onMouseClickOnCell(event: MouseEvent, coords: Coords, optionalDirection: HexDirection = HexDirection.NONE) {
    if (this.currentActions.length > 0) {
      // if this is busy with an animation (movement, attack), ignore the click
      return;
    }

    // Left mouse button
    if (event.button === 0) {
      let creatureInBattle: CreatureInBattle | null = this.getCreatureAtPosition(coords);
      if (creatureInBattle !== null) {
        console.log("Clicked on creature: ", creatureInBattle);
        if (this.currentArmyIndex === creatureInBattle.indexOFArmy) {
          // select the creature for further orders
          this.selectCreatureByArmyIndex(creatureInBattle.indexOFArmy, creatureInBattle.indexInArmy);
          this.showReachableCells(creatureInBattle.creature);
        }
      }

    } else if (event.button === 2) {
      console.log("Right mouse button clicked");
      if (this.activeCreatureIndex >= 0) {
        if (this.pathfinding_tiles[coords.x][coords.y] === 0) {
          console.log("Clicked on a non-reachable cell");
          return;
        }

        let creature = this.creatures[this.activeCreatureIndex];
        let creatureInBattle = this.getCreatureAtPosition(coords);
        if (creatureInBattle !== null) {
          // If it's the same creature, ignore
          // Note: this should not happen, as the creature should not be selectable
          if (creatureInBattle.indexInArmy === this.activeCreatureIndex) {
            console.log("Clicked on the same creature");
            return;
          }

          // if attacking an enemy creature, check if we need to get in close combat
          if (creature.armyAlignment !== creatureInBattle.indexOFArmy) {
            console.log("Attacking creature: ", creatureInBattle);
            // Check to see if the attacker is melee or ranged
            // If the attacker is ranged, then don't move, just attack
            // If the attacker is melee, then move to the cell and attack

            if (creature.stats.is_ranged) {
              this.currentActions.push(new BattleAction(BattleActionType.ATTACK_RANGED, [coords], 0, 500, 50));

              this.nextRenderUpdate.unitRenderUpdate = true;
              this.nextRenderUpdate.somethingChanged = true;
            } else {
              // move creature on the hover path.
              let path: Coords[] = [];
              if (optionalDirection !== HexDirection.NONE) {
                let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
                if (neighbour) {
                  path = this.findPathFromSelectedUnitToCell(neighbour);
                }
              }
              if (path.length === 0) {
                path = this.findPathFromSelectedUnitToCell(coords);
                path.pop();
              }
              creature.stats.remaining_movement -= path.length;
              console.log("Adding action to move with path: ", path);
              this.currentActions.push(new BattleAction(BattleActionType.MOVE, path, 0, 50, 50));
              console.log("Adding action to attack at: ", coords);
              this.currentActions.push(new BattleAction(BattleActionType.ATTACK_MELEE, [coords], 0, 500, 50));
            }
          }
        } else {
          // move creature.
          console.log("Moving creature to cell: ", coords);
          const path = this.findPathFromSelectedUnitToCell(coords);
          creature.stats.remaining_movement -= path.length;
          this.currentActions.push(new BattleAction(BattleActionType.MOVE, path, 0, 50, 50));
          this.nextRenderUpdate.hoverOverCell = null;
          this.nextRenderUpdate.hoverPath = [];
        }
      }
    }
  }

  public onMouseOverCell(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE) {
    if (this.currentActions.length > 0) {
      return;
    }

    if (this.nextRenderUpdate.hoverOverCell
      && this.nextRenderUpdate.hoverOverCell.x === coords.x
      && this.nextRenderUpdate.hoverOverCell.y === coords.y) {
      return;
    }

    this.nextRenderUpdate.hoverOverCell = coords;
    if (this.activeCreatureIndex <= -1) {
      this.nextRenderUpdate.hoverPath = [];
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    const activeCreature = this.creatures[this.activeCreatureIndex];
    const targetCreature = this.getCreatureAtPosition(coords);

    if (targetCreature === null
      || targetCreature.indexOFArmy === this.currentArmyIndex
    ) {
      // Hover over on an empty cell or on a friendly unit
      this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
      this.nextRenderUpdate.cursorHint = "default";
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    // TODO: ranged creatures should be able to also force melee mode (E.g. if an enemy has high ranged defense)

    // Hover over on an enemy unit
    if (activeCreature.stats.is_ranged) {
      // Attacker is ranged, check if the target is in range
      const target = this.unitRangeData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
      if (target) {
        this.nextRenderUpdate.hoverPath = [];
        this.nextRenderUpdate.hoverOverCell = coords;
        this.nextRenderUpdate.cursorHint = "attack_ranged";
      }
    } else {
      // This is a melee creature, it can only attack from adjacent cells.
      // if the optional direction is not NONE, then we need to check if the attacker can attack from the given direction.
      if (optionalDirection !== HexDirection.NONE) {
        let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
        if (neighbour) {
          // check if neighbour is in cached cells, (unit reach data)
          const neighbourInUnitReachData = this.unitReachData.find((element) => element.coords.x === neighbour.x && element.coords.y === neighbour.y);
          if (neighbourInUnitReachData) {
            // yes, the neighbour is reachable, so we can attack from the given direction
            this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(neighbour);

            switch (reverseDirection(optionalDirection)) {
              case HexDirection.EAST:
                this.nextRenderUpdate.cursorHint = "attack_melee_e";
                break;
              case HexDirection.NORTHEAST:
                this.nextRenderUpdate.cursorHint = "attack_melee_ne";
                break;
              case HexDirection.NORTHWEST:
                this.nextRenderUpdate.cursorHint = "attack_melee_nw";
                break;
              case HexDirection.WEST:
                this.nextRenderUpdate.cursorHint = "attack_melee_w";
                break;
              case HexDirection.SOUTHWEST:
                this.nextRenderUpdate.cursorHint = "attack_melee_sw";
                break;
              case HexDirection.SOUTHEAST:
                this.nextRenderUpdate.cursorHint = "attack_melee_se";
                break;
              default:
                this.nextRenderUpdate.cursorHint = "attack_melee_nw";
                break;
            }
          }
        }
      } else {
        // check if the target is in the unit reach data
        const target = this.unitReachData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
        if (target) {
          this.nextRenderUpdate.cursorHint = "attack_melee";
          this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
        }
      }
    }

    this.nextRenderUpdate.somethingChanged = true;
  }

  static findPathToCellInReachData(coords: Coords, reachData: ReachData[]): Coords[] {
    let path: Coords[] = [];
    let finalElement = reachData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
    if (!finalElement) {
      return path;
    }

    while (finalElement) {
      path.push(finalElement.coords);
      finalElement = reachData.find((element) =>
        element.coords.x === finalElement?.cameFrom.x
        && element.coords.y === finalElement?.cameFrom.y);
    }

    path.reverse();
    return path;
  }

  /**
   * 
   * @param coords The coordinates of the cell to find the path to
   * @returns 
   */
  public findPathFromSelectedUnitToCell(coords: Coords): Coords[] {
    return Battle.findPathToCellInReachData(coords, this.unitReachData);
  }


  public nextTurn() {
    this.currentArmyIndex = (this.currentArmyIndex + 1) % 2;
    this.activeCreatureIndex = -1;

    // set all the creatures from the current army to have full movement
    for (let i = 0; i < this.creatures.length; i++) {
      if (this.creatures[i].armyAlignment === this.currentArmyIndex) {
        this.creatures[i].stats.remaining_movement = this.creatures[i].stats.speed;
      }
    }
  }

  public update(delta: number): MapRenderUpdate {
    let result = this.nextRenderUpdate;
    this.nextRenderUpdate = new MapRenderUpdate();

    if (this.currentActions.length == 0) {
      return result;
    }

    let currentAction = this.currentActions[0];


    if (currentAction.type == BattleActionType.MOVE) {
      currentAction.remainingTime -= delta;
      if (currentAction.remainingTime <= 0) {
        currentAction.remainingTime = currentAction.stepDuration;
        if (currentAction.step < currentAction.path.length) {
          let nextStep = currentAction.path[currentAction.step];
          this.creatures[this.activeCreatureIndex].position = nextStep;
          currentAction.step++;
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;
        } else {
          this.currentActions.shift();
          this.selectCreatureByArmyIndex(this.currentArmyIndex, this.activeCreatureIndex);
          this.showReachableCells(this.creatures[this.activeCreatureIndex]);
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;
        }
      }
    } else if (currentAction.type == BattleActionType.ATTACK_MELEE
      || currentAction.type == BattleActionType.ATTACK_RANGED
    ) {
      currentAction.remainingTime -= delta;
      // Show attack animation during this time. At the end, stop the animation.
      if (currentAction.remainingTime <= 0) {
        if (currentAction.step == 0) {
          const animType: AnimationType = currentAction.type == BattleActionType.ATTACK_MELEE ? AnimationType.ATTACK_MELEE : AnimationType.ATTACK_RANGED;
          // First step, start playing animation
          this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(animType, currentAction.path[0]);
          this.nextRenderUpdate.somethingChanged = true;
          currentAction.step++;
          currentAction.remainingTime = currentAction.stepDuration;
          console.log("Playing attack animation");
        } else if (currentAction.step == 1) {
          // Second step, stop playing animation, and apply the damage
          if (currentAction.path.length > 0) {
            const target = currentAction.path[0];
            let creatureInBattle = this.getCreatureAtPosition(target);
            if (creatureInBattle === null) {
              console.error("The creature is no longer there");
            } else {
              let damage = this.creatures[this.activeCreatureIndex].getRandomAttackDamage();
              creatureInBattle.creature.takeDamage(damage);
              console.log(`Dealt ${damage} damage to the creature`);
              if (!creatureInBattle.creature.isAlive) {
                console.log("The creature has died");
                this.creatures.splice(creatureInBattle.indexInArmy, 1);
              }
            }
          }

          console.log("Applied attack");

          this.currentActions.shift();
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;

        }
      }
    }

    return result;
  }
}