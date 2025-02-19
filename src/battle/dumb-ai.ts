import { ArmyControlType, Battle } from "../battle";
import { HexDirection } from "../shared/hex-map";
import { Coords } from "../shared";
import { HobGUID } from "./guid";
import { BattleHexMapPath } from "./battle-hex-map-path";

export enum DumbAIState {
  NONE = 0,
  SELECT_UNIT,
  DECIDE_ACTION_FOR_SELECTED_UNIT,
  SELECT_MOVE,
  SELECT_ATTACK,
  SELECT_END_TURN
}

export class DumbAI {
  // Find out order for AI
  // general behavior
  // Select next unit (if any) to move or attack with
  // Better: start with ranged units, then melee units
  // Better: select units with highest remaining health, because counterattacks are dangerous
  // Find all possible moves for the unit (already computed at selection)
  // Find all possible attacks for the unit (already computed at selection)
  // If any attacks are possible for the unit, attack the enemy unit with the least health
  // Better: calculate the danger level of enemies relative to their remaining health and attack the most advantageous enemy
  // If no attacks are possible, move the unit towards the nearest enemy
  // Better: move the unit towards the enemy with the least health
  // Once all units have performed their actions, end the turn

  static MAX_SEARCH_RANGE = 20;

  protected state: DumbAIState = DumbAIState.NONE;
  protected targetCoords: Coords = { x: 0, y: 0 };
  protected handledCreatures: HobGUID[] = [];

  constructor(private battle: Battle) {

  }

  public update(_deltaInMilliseconds: number) {
    if (this.battle.army_control[this.battle.currentArmyIndex] !== ArmyControlType.AI) {
      return;
    }

    if (this.battle.hasRunningActions()) {
      // need to wait for actions to return
      return;
    }

    if (this.battle.isFinished()) {
      return;
    }

    switch (this.state) {
      case DumbAIState.NONE:
        this.selectAction();
        break;
      case DumbAIState.SELECT_UNIT:
        this.selectUnit();
        break;
      case DumbAIState.DECIDE_ACTION_FOR_SELECTED_UNIT:
        this.decideAction();
        break;
      case DumbAIState.SELECT_MOVE:
        this.moveSelected();
        break;
      case DumbAIState.SELECT_ATTACK:
        this.selectAttack();
        break;
      case DumbAIState.SELECT_END_TURN:
        this.selectEndTurn();
        break;
    }
  }

  private selectAction() {
    this.handledCreatures = [];
    this.state = DumbAIState.SELECT_UNIT;
  }

  private selectUnit() {
    console.log("*** AI Selecting next unit");

    let pivotGUID: HobGUID | null = null;

    let keepSearching = true;
    while (keepSearching) {
      if (this.battle.isFinished()) {
        return;
      }
      this.battle.selectNextUnitAndGetIndex();
      const selectedCreature = this.battle.getSelectedCreature();
      if (!selectedCreature) {
        console.log("No creature selected. Do I have any more units?");
        this.state = DumbAIState.SELECT_END_TURN;
        return;
      }

      if (pivotGUID === null) {
        pivotGUID = selectedCreature.GUID;
      } else if (pivotGUID.equals(selectedCreature.GUID)) {
        console.log("No more units to select. I think I can end my turn");
        this.state = DumbAIState.SELECT_END_TURN;
        return;
      }

      const foundIndex = this.handledCreatures.findIndex(x => x.equals(selectedCreature.GUID));
      if (foundIndex >= 0) {
        console.log("Creature already handled");
        continue;
      } else {
        keepSearching = false;
        this.handledCreatures.push(selectedCreature.GUID);
      }
    }

    // Find the next unit to move
    this.state = DumbAIState.DECIDE_ACTION_FOR_SELECTED_UNIT;
  }

  private decideAction() {
    console.log("*** AI Deciding action for selected unit");
    this.targetCoords = { x: -1, y: -1 };
    this.battle.cacheCreaturesToHexMap();

    // Find all possible attacks for the unit (already computed at selection)
    // If any attacks are possible for the unit, attack the enemy unit with the least health
    // Find all possible moves for the unit (already computed at selection)
    let creature = this.battle.getSelectedCreature();
    if (!creature) {
      console.log("No creature selected");
      return;
    }

    if (creature.stats.is_ranged) {
      // Find all possible attacks for the unit
      const rangeData = this.battle.getRangeDataForSelectedCreature();
      if (rangeData.length <= 0) {
        console.log("No reach data found for selected creature");
        // should move towards the enemy
        this.state = DumbAIState.SELECT_MOVE;
        this.targetCoords = { x: -1, y: -1 };
        return;
      }

      // TODO:Find the enemy in the reach data with the least health
      let coordsOfEnemyToRangeAttack = rangeData[0];
      this.targetCoords = coordsOfEnemyToRangeAttack.coords;
      // let targetCreature = this.battle.getCreatureAtPosition(coordsOfEnemyToRangeAttack.coords);
      this.state = DumbAIState.SELECT_ATTACK;
      return;
    }

    // This is a melee unit
    const reachData = this.battle.getReachableMeleeEnemies();
    if (reachData.length <= 0) {
      console.log("No reach data found for selected creature");
      // should move towards the enemy
      this.targetCoords = { x: -1, y: -1 };
      this.state = DumbAIState.SELECT_MOVE;
      return;
    }

    // TODO:Find the enemy in the reach data with the least health
    let coordsOfEnemyToRangeAttack = reachData[0];
    this.targetCoords = coordsOfEnemyToRangeAttack.coords;
    console.log("Will want to attack at target coords: ", this.targetCoords);
    this.state = DumbAIState.SELECT_ATTACK;
  }

  moveSelected() {
    console.log("*** AI Moving selected unit");
    // const reachData = this.battle.getReachDataForSelectedCreature();
    if (this.targetCoords.x != -1 && this.targetCoords.y != -1) {
      // find a target
    }

    // Find all possible moves for the unit
    const enemies = this.battle.creatures.filter(c => c.armyAlignment !== this.battle.currentArmyIndex);
    if (enemies.length <= 0) {
      // no enemies to move towards
      this.state = DumbAIState.SELECT_UNIT;
      return;
    }

    // Find the enemy with the least health
    let targetEnemy = enemies[0];
    for (let enemy of enemies) {
      if (enemy.stats.health < targetEnemy.stats.health) {
        targetEnemy = enemy;
      }
    }

    console.log("Will want to move towards enemy at: ", targetEnemy.position);
    // this.battle.findPathFromSelectedUnitToCell(targetEnemy.position);
    // go in the general direction of the enemy

    // Do another longer search for paths to enemies. This time, we want to find the path to the enemy
    // const longUnitReachData: ReachData[] = [];
    let alt_pathfinding_tiles: number[][] = [];
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature) {
      return;
    }

    Battle.initializeMapToSize(alt_pathfinding_tiles, this.battle.hexMap.width, this.battle.hexMap.height);
    // this.battle.cacheMeleeReachableCells(
    //   selectedCreature.position,
    //   DumbAI.MAX_SEARCH_RANGE,
    //   alt_pathfinding_tiles,
    //   longUnitReachData,
    //   this.battle.currentArmyIndex,
    //   this.battle.activeCreatureIndex
    // );

    let highlightUnitsInArmies: number[] = [];
    if (this.battle.creatures[this.battle.activeCreatureIndex].live_stats.remaining_attacks > 0) {
      const otherArmyIndex = this.battle.currentArmyIndex === 0 ? 1 : 0;
      highlightUnitsInArmies = [otherArmyIndex];
    }

    const longUnitReachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.battle.hexMap,
      selectedCreature.position,
      DumbAI.MAX_SEARCH_RANGE,
      alt_pathfinding_tiles,
      Battle.DEFAULT_TERRAIN_MOVE_COST,
      { occupation_tiles: this.battle.cached_occupation_tiles, 
        terrain_tiles: this.battle.terrain_tiles, 
        creatures: this.battle.creatures },
      { markUnitsInArmies: highlightUnitsInArmies }
    );


    if (longUnitReachData.length <= 0) {
      console.log("Could not cache melee reachable cells!");
      this.state = DumbAIState.SELECT_END_TURN;
      return;
    }

    console.log("longUnitReachData: ", longUnitReachData);

    // Find the enemy with the least health
    // let targetEnemy = longUnitReachData[0];
    // for (let enemy of longUnitReachData) {
    //   if (enemy.scost < targetEnemy.cost) {
    //     targetEnemy = enemy;
    //   }
    // }
    let foundEntryIdx = longUnitReachData.findIndex(entry => entry.coords.x === targetEnemy.position.x && entry.coords.y === targetEnemy.position.y);
    if (foundEntryIdx < 0) {
      console.log("Desired unit is not reachable");
      this.state = DumbAIState.SELECT_UNIT;
      return;
    }

    let longPathToEnemy = Battle.findPathToCellInReachData(targetEnemy.position, longUnitReachData);
    if (longPathToEnemy.length <= 0) {
      console.log("No path found to target enemy");
      this.state = DumbAIState.SELECT_UNIT;
      return;
    }

    let numMoves = selectedCreature.stats.remaining_movement;
    if (longPathToEnemy.length <= numMoves) {
      throw new Error("Should not have reached here");
    }

    // from the path, get just the coordinate for the maximum amount of moves the current unit can use and move there
    const newDesiredCoords = longPathToEnemy[numMoves - 1];

    this.battle.moveOrAttackWithActiveCreatureAtLocation(newDesiredCoords, HexDirection.NONE, false);

    this.state = DumbAIState.SELECT_UNIT;
  }

  private selectAttack() {
    console.log("*** AI Attacking with selected unit at target coords: ", this.targetCoords);

    if (this.targetCoords.x != -1 && this.targetCoords.y != -1) {
      this.battle.moveOrAttackWithActiveCreatureAtLocation(this.targetCoords, HexDirection.NONE, false);
      this.state = DumbAIState.SELECT_UNIT;
      return;
    }

    // Find all possible attacks for the unit


    this.state = DumbAIState.SELECT_UNIT;
  }

  private selectEndTurn() {
    console.log("*** AI Ending turn");
    // End the turn
    this.battle.nextTurn();
    this.state = DumbAIState.NONE;
  }
}