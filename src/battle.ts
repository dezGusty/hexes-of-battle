import { Ability, AbilityTarget, AbilityType } from "./battle/ability";
import { Buff, Creature, CreatureStats } from "./battle/creature";
import { TERRAIN_COST, TerrainType } from "./battle/terrain-types";
import { checkFlankingStatus, HexDirection, HexFlankStatus, HexMap, reverseDirection } from "./shared/hex-map";
import { Coords, getRandomValueBetween, logMatrix } from "./shared";
import { resetNumericalMatrixToZero } from "./shared/matrix";
import { BattleHexMapPath } from "./battle/battle-hex-map-path";
import { ReachData } from "./shared/reach-data";
import { CreatureInBattle } from "./battle/creature-in-battle";



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

export interface BattleHooks {
  hookMovingUnit: (creature: Creature, position: Coords) => void;
  hookNextTurn: (turnNumber: number, currentArmyIndex: number) => void;
  hookRecommendEndTurn: (currentArmyIndex: number) => void;
  hookBattleFinished: (winningArmyIndex: number) => void;
}

export enum ArmyControlType {
  PLAYER = 0,
  AI = 1
}

export class MapRenderUpdate {
  public selectedCreatureIndex: number = -1;
  public currentArmyIndex: number = 0;
  public reachableCells: boolean = false;
  public abilityReachableCells: boolean = false;
  public enemyReachableCells: boolean = false;
  public unitRenderUpdate: boolean = false;
  public hoverOverCell: Coords | null = null;
  public hoverOverUnitIndex: number = -1;
  public hoverDirection: HexDirection = HexDirection.NONE;
  public hoverPath: Coords[] = [];
  public cursorHint: string = "";
  public animationAtCoords: AnimationAtCoords = { ...AnimationAtCoords.DEFAULT };

  public somethingChanged: boolean = false;
  public hoverEnemyIndex: number = -1;

}



export enum BattleActionType {
  NONE = 0,
  MOVE = 1,
  ATTACK_MELEE = 2,
  ATTACK_RANGED = 3,
  COUNTER_ATTACK_MELEE = 4,
  SELECT_NEXT = 5,
  TARGET_ABILITY = 6
}

export class BattleAction {
  constructor(
    public type: BattleActionType,
    public path: Coords[],
    public step: number = 0,
    public stepDuration: number = 0,
    public remainingTime: number = 0,
    public sourceUnit?: Creature,
    public targetUnit?: Creature
  ) {
  }

  static AttackMelee(source: Creature, target: Creature): BattleAction {
    return new BattleAction(BattleActionType.ATTACK_MELEE, [target.pos], 0, 500, 50, source, target);
  }
  static CounterAttack(source: Creature, target: Creature): BattleAction {
    return new BattleAction(BattleActionType.COUNTER_ATTACK_MELEE, [], 0, 500, 50, source, target);
  }
}


export enum InputState {
  NONE = 0,
  SELECT_UNIT = 1,
  SELECT_UNIT_OR_TARGET = 2,
  SELECT_ABILITY_TARGET = 3
}

export enum AttackCursorHint {
  NONE = "",
  ATTACK_MELEE_E = "attack_melee_e",
  ATTACK_MELEE_NE = "attack_melee_ne",
  ATTACK_MELEE_NW = "attack_melee_nw",
  ATTACK_MELEE_W = "attack_melee_w",
  ATTACK_MELEE_SW = "attack_melee_sw",
  ATTACK_MELEE_SE = "attack_melee_se"
}


/**
 * Handles a battle on the hex battle map between two armies.
 */
export class Battle {

  private turnNumber = 0;
  public currentArmyIndex: number = 0;
  public activeCreatureIndex: number = -1;

  public army_control: ArmyControlType[] = [ArmyControlType.PLAYER, ArmyControlType.AI];
  // public army_1_control: ArmyControlType = ArmyControlType.AI;

  public renderStateChanged: boolean = true;
  public creatures: Creature[] = [];

  public pathfinding_tiles: number[][] = [];
  public enemy_potential_tiles: number[][] = [];
  public enemy_range_tiles: number[][] = [];
  public rangereach_tiles: number[][] = [];
  public rangereach_targets: number[][] = [];
  public ability_reach_tiles: number[][] = [];
  public ability_reach_targets: number[][] = [];
  // Units and objects which occupy a tile
  public cached_occupation_tiles: number[][] = [];
  public terrain_tiles: number[][] = [];

  private nextRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  private prevRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  private unitReachData: ReachData[] = [];
  private unitRangeData: ReachData[] = [];

  private currentActions: BattleAction[] = [];
  private finished: boolean = false;
  private onMouseOverCellPrevPrefMelee: boolean = false;
  private input_state: InputState = InputState.SELECT_UNIT_OR_TARGET;
  private abilityToApply: Ability | null = null;


  public static DEFAULT_TERRAIN_MOVE_COST: Record<TerrainType, number> = {
    [TerrainType.PLAIN]: 1,
    [TerrainType.FOREST]: 2,
    [TerrainType.HILL]: 3,
    [TerrainType.SWAMP]: 4,
    [TerrainType.MOUNTAIN]: 10,
    [TerrainType.WATER]: 10
  };

  public static DIRECTION_TO_ATTACK_CURSOR: Record<HexDirection, AttackCursorHint> = {
    [HexDirection.NONE]: AttackCursorHint.NONE,
    [HexDirection.EAST]: AttackCursorHint.ATTACK_MELEE_E,
    [HexDirection.NORTHEAST]: AttackCursorHint.ATTACK_MELEE_NE,
    [HexDirection.NORTHWEST]: AttackCursorHint.ATTACK_MELEE_NW,
    [HexDirection.WEST]: AttackCursorHint.ATTACK_MELEE_W,
    [HexDirection.SOUTHWEST]: AttackCursorHint.ATTACK_MELEE_SW,
    [HexDirection.SOUTHEAST]: AttackCursorHint.ATTACK_MELEE_SE
  };

  constructor(
    public hexMap: HexMap) {
  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    this.hexMap.initializeToSize(mapWidth, mapHeight);
    Battle.initializeMapToSize(this.pathfinding_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.cached_occupation_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.rangereach_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.rangereach_targets, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.enemy_potential_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.enemy_range_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.terrain_tiles, mapWidth, mapHeight);

    Battle.generateRandomTerrain(this.terrain_tiles, mapWidth, mapHeight);

    Battle.initializeMapToSize(this.ability_reach_tiles, mapWidth, mapHeight);
    Battle.initializeMapToSize(this.ability_reach_targets, mapWidth, mapHeight);

    logMatrix(this.terrain_tiles, mapWidth, mapHeight, "Terrain");
  }

  static initializeMapToSize(matrix: number[][], mapWidth: number, mapHeight: number): void {
    for (let i = 0; i < mapWidth; i++) {
      matrix[i] = [];
      for (let j = 0; j < mapHeight; j++) {
        matrix[i][j] = 0;
      }
    }
  }

  static generateRandomTerrain(matrix: number[][], mapWidth: number, mapHeight: number): void {
    // Set-up the weights for the terrain types
    const weights: number[] = [10, 2, 2, 1, 0];
    const terrain_type_limits: number[] = weights.map(
      (value, index) => {
        return value + weights.reduce((x, y, i) => i < index ? x + y : x, 0);
      });

    console.log("Weights: ", weights);
    console.log("Terrain type limits: ", terrain_type_limits);

    const sum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < mapWidth; i++) {
      for (let j = 0; j < mapHeight; j++) {
        const random_value = Math.floor(Math.random() * sum);
        // assign the terrain type based on the random value and the weights
        // find the entry in the terrain_type_limits that is greater than the random value
        let terrain_type = terrain_type_limits.findIndex((value) => value > random_value);
        matrix[i][j] = terrain_type;
      }
    }
  }

  // Getter for the terrain_tiles
  public getTerrainAt(coords: Coords): number {
    return this.terrain_tiles[coords.x][coords.y];
  }

  public hasRunningActions(): boolean {
    return this.currentActions.length > 0;
  }

  private setSelectedArmyAndCreatureIndex(armyIndex: number, creatureIndex: number) {
    this.activeCreatureIndex = creatureIndex;
    this.renderStateChanged = true;

    this.nextRenderUpdate.selectedCreatureIndex = creatureIndex;
    this.nextRenderUpdate.currentArmyIndex = armyIndex;
    this.nextRenderUpdate.somethingChanged = true;

    console.log(`Selected creature in army: ${this.currentArmyIndex}, at index ${this.activeCreatureIndex}`);
  }



  public cacheCreaturesToHexMap() {
    resetNumericalMatrixToZero(this.cached_occupation_tiles);

    for (let i = 0; i < this.creatures.length; i++) {
      let creature = this.creatures[i];
      this.cached_occupation_tiles[creature.pos.x][creature.pos.y] = i + 1;
    }
  }

  public getDefaultCostForCellAt(coords: Coords): number {
    const terrain_type = this.getTerrainAt(coords);
    // const terrain_type = this.terrain_tiles[coords.x][coords.y];
    if (terrain_type < 0 || terrain_type >= 6) {
      return 10;
    }
    const result = TERRAIN_COST[terrain_type];
    return result;
  }

  /**
   * Caches hexes reacheable by walking, melee attacking, ranged attacking.
   * @param creature 
   * @returns 
   */
  showReachableCells(creature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    let creaturePosition = creature.pos;


    // TODO: this could also be done when movement occurs
    this.cacheCreaturesToHexMap();

    let highlightUnitsInArmies: number[] = [];
    if (this.creatures[this.activeCreatureIndex].live_stats.remaining_attacks > 0) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      highlightUnitsInArmies = [otherArmyIndex];
    }

    this.unitReachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.hexMap,
      creaturePosition,
      creature.live_stats.remaining_movement,
      this.pathfinding_tiles,
      Battle.DEFAULT_TERRAIN_MOVE_COST,
      { occupation_tiles: this.cached_occupation_tiles, terrain_tiles: this.terrain_tiles, creatures: this.creatures },
      { markUnitsInArmies: highlightUnitsInArmies }
    );

    this.unitRangeData = [];
    resetNumericalMatrixToZero(this.rangereach_tiles);
    resetNumericalMatrixToZero(this.rangereach_targets);
    if (creature.live_stats.is_ranged) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      this.unitRangeData = BattleHexMapPath.cacheRangedReachableCells(
        this.hexMap,
        creaturePosition,
        creature.live_stats.range,
        this.rangereach_tiles,
        this.rangereach_targets,
        this.creatures,
        { markUnitsInArmies: [otherArmyIndex] }
      );
    }

    this.nextRenderUpdate.reachableCells = true;
    return reachableCells;
  }

  public getSelectedCreature(): Creature | null {
    if (this.activeCreatureIndex < 0) {
      return null;
    }

    return this.creatures[this.activeCreatureIndex];
  }

  public getReachDataForSelectedCreature(): ReachData[] {
    return this.unitReachData;
  }

  public getRangeDataForSelectedCreature(): ReachData[] {
    return this.unitRangeData;
  }

  public getReachableMeleeEnemies(): ReachData[] {
    let pathfindingData: ReachData[] = [];
    for (let i = 0; i < this.pathfinding_tiles.length; i++) {
      for (let j = 0; j < this.pathfinding_tiles[i].length; j++) {
        if (this.pathfinding_tiles[i][j] >= 500) { // TODO: magic number!
          pathfindingData.push(new ReachData({ x: i, y: j }, this.pathfinding_tiles[i][j], { x: 0, y: 0 }));
        }
      }
    }
    return pathfindingData;
  }

  //TODO:XXX: function to get reach data with enemies only

  public isCurrentTurnAI(): boolean {
    return this.army_control[this.currentArmyIndex] === ArmyControlType.AI;
  }

  getCreatureAtPosition(coords: Coords): CreatureInBattle | null {
    for (let index = 0; index < this.creatures.length; index++) {
      if (this.creatures[index].pos.x == coords.x && this.creatures[index].pos.y == coords.y) {
        return new CreatureInBattle(this.creatures[index], coords, index, this.creatures[index].armyAlignment);
      }
    }

    return null;
  }

  private tryToSelectUnitAtLocation(coords: Coords) {
    let creatureInBattle: CreatureInBattle | null = this.getCreatureAtPosition(coords);
    if (creatureInBattle === null) {
      return;
    }

    console.log("Clicked on creature: ", creatureInBattle);
    if (this.currentArmyIndex === creatureInBattle.indexOFArmy) {
      // select the creature for further orders
      this.setSelectedArmyAndCreatureIndex(creatureInBattle.indexOFArmy, creatureInBattle.indexInArmy);
      this.showReachableCells(creatureInBattle.creature);
    }
  }

  tryToApplyAbilityWithActiveCreatureAtLocation(coords: Coords, _optionalDirection: HexDirection) {
    if (this.activeCreatureIndex < 0) {
      return;
    }

    if (this.ability_reach_tiles[coords.x][coords.y] <= 0) { // ability_reach_targets ?
      console.log("Clicked on a non-reachable cell");
      return;
    }

    let creature = this.creatures[this.activeCreatureIndex];
    let creatureAtTarget = this.getCreatureAtPosition(coords);
    if (creatureAtTarget === null) {
      console.log("Ability target is empty");
      return;
    }

    console.log("Applying ability of creature", creature, " to creature: ", creatureAtTarget);
    console.log("Applying ability: ", this.abilityToApply);
    this.currentActions.push(new BattleAction(BattleActionType.TARGET_ABILITY, [coords], 0, 500, 50));
  }

  private getMovementCostForPath(path: Coords[], _creature: Creature, terrainMoveCost: Record<TerrainType, number>): number {
    let cost = 0;
    for (let i = 0; i < path.length; i++) {
      const terrain_type_num = this.getTerrainAt(path[i]);
      const terrain_type: TerrainType = (terrain_type_num in TerrainType)
        ? terrain_type_num
        : TerrainType.MOUNTAIN;

      cost += terrainMoveCost[terrain_type];
    }
    return cost;
  }

  public moveOrAttackWithActiveCreatureAtLocation(coords: Coords, optionalDirection: HexDirection, meleePreference: boolean = false) {
    if (this.activeCreatureIndex < 0) {
      return;
    }

    if (this.pathfinding_tiles[coords.x][coords.y] <= 0
      && this.rangereach_tiles[coords.x][coords.y] <= 0
      && this.rangereach_targets[coords.x][coords.y] <= 0) {
      console.log("Clicked on a non-reachable cell");
      return;
    }

    let creature = this.creatures[this.activeCreatureIndex];
    let creatureAtTarget = this.getCreatureAtPosition(coords);
    if (creatureAtTarget === null) {
      // move creature.
      console.log("Moving creature to cell: ", coords);
      const path = this.findPathFromSelectedUnitToCell(coords);
      creature.stats.remaining_movement -= this.getMovementCostForPath(path, creature, Battle.DEFAULT_TERRAIN_MOVE_COST); // TODO: consider moving into setter
      this.currentActions.push(new BattleAction(BattleActionType.MOVE, path, 0, 50, 50));
      this.nextRenderUpdate.hoverOverCell = null;
      this.nextRenderUpdate.hoverPath = [];
      return;
    }

    // If it's the same creature, ignore
    // Note: this should not happen, as the creature should not be selectable
    if (creatureAtTarget.indexInArmy === this.activeCreatureIndex) {
      console.log("Clicked on the same creature");
      return;
    }

    if (creature.armyAlignment === creatureAtTarget.indexOFArmy) {
      console.log("Tried to attack a friendly creature");
      return;
    }

    // if attacking an enemy creature, check if we need to get in close combat
    if (creature.live_stats.remaining_attacks <= 0) {
      console.log("No more attacks left");
      return;
    }

    console.log("Attacking creature: ", creatureAtTarget);
    // Check to see if the attacker is melee or ranged
    // If the attacker is ranged, then don't move, just attack
    // If the attacker is melee, then move to the cell and attack

    if (creature.live_stats.is_ranged) {
      if (!meleePreference) {
        if (this.rangereach_tiles[coords.x][coords.y] <= 0) {
          console.log("Clicked on a non-reachable cell for ranged attack");
          return;
        }

        // The unit is ranged, the user WANTS to attack in a ranged mode, but should also check if the ranged unit is engaged in melee.
        if (-1 == this.hexMap.getNeighbours(creature.pos).findIndex(neighbour => neighbour.x === coords.x && neighbour.y === coords.y)) {
          // The target is not in melee range, so the ranged unit can attack it.
          console.log("Range attack at: ", coords);
          this.currentActions.push(new BattleAction(BattleActionType.ATTACK_RANGED, [coords], 0, 500, 50));
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;
          return;
        }
      } else {
        // melee preference
        if (this.pathfinding_tiles[coords.x][coords.y] <= 0) {
          console.log("Clicked on a non-reachable cell for melee attack");
          return;
        }
      }
    }


    // (else)
    // The target is in melee range, so the ranged unit cannot attack it with a ranged attack.
    // Continue with melee attack handling


    // move creature on the hover path.
    let path: Coords[] = [];
    if (optionalDirection !== HexDirection.NONE) {
      let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
      if (neighbour) {
        // find if any unit is there
        let creatureAtNeighbour = this.getCreatureAtPosition(neighbour);
        if (creatureAtNeighbour === null) {
          path = this.findPathFromSelectedUnitToCell(neighbour);
        }
      }
    }

    if (path.length === 0) {
      path = this.findPathFromSelectedUnitToCell(coords);
      path.pop();
    }
    creature.stats.remaining_movement -= this.getMovementCostForPath(path, creature, Battle.DEFAULT_TERRAIN_MOVE_COST); // TODO: consider moving to setter.

    console.log("Adding action to move with path: ", path);
    this.currentActions.push(new BattleAction(BattleActionType.MOVE, path, 0, 50, 50, creature, creatureAtTarget.creature));
    console.log("Adding action to attack at: ", coords);
    this.currentActions.push(new BattleAction(BattleActionType.ATTACK_MELEE, [coords], 0, 500, 50, creature, creatureAtTarget.creature));
  }

  onMouseClickOnCell(event: MouseEvent, coords: Coords, optionalDirection: HexDirection = HexDirection.NONE, meleePreference: boolean) {
    if (this.currentActions.length > 0) {
      // if this is busy with an animation (movement, attack), ignore the click
      return;
    }

    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) {
      return;
    }

    if (this.input_state == InputState.SELECT_ABILITY_TARGET) {
      console.log("Ability target selection");
      if (event.button === 0) {
        this.tryToApplyAbilityWithActiveCreatureAtLocation(coords, optionalDirection);
      } else if (event.button === 2) {
        // cancel ability selection
        this.input_state = InputState.SELECT_UNIT_OR_TARGET;
        this.abilityToApply = null;
        this.reselectCurrentUnit();
      }
      return;
    }

    // Left mouse button
    if (event.button === 0) {
      this.tryToSelectUnitAtLocation(coords);
    } else if (event.button === 2) {
      console.log("Right mouse button clicked, coords: ", coords, "dir:", optionalDirection, ", meleePref:", meleePreference);
      this.moveOrAttackWithActiveCreatureAtLocation(coords, optionalDirection, meleePreference);
    }
  }


  public onMouseOverCell(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE, meleePreference: boolean = false) {
    if (this.currentActions.length > 0) {
      return;
    }

    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) {
      return;
    }

    // Did we get a chance to render the hover over this cell, or do we still have it queued?
    // If so, don't process it again.
    if (this.nextRenderUpdate.hoverOverCell
      && this.nextRenderUpdate.hoverOverCell.x === coords.x
      && this.nextRenderUpdate.hoverOverCell.y === coords.y
      && this.onMouseOverCellPrevPrefMelee === meleePreference) {
      return;
    }

    this.nextRenderUpdate.hoverOverCell = coords;
    this.nextRenderUpdate.hoverDirection = optionalDirection;
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
      // just reset this, as we don't need to show the enemy reachable cells
      this.nextRenderUpdate.enemyReachableCells = true;
      this.nextRenderUpdate.hoverOverUnitIndex = targetCreature?.indexInArmy ?? -1;
      resetNumericalMatrixToZero(this.enemy_potential_tiles);
      resetNumericalMatrixToZero(this.enemy_range_tiles);
      return;
    }

    // also show the potential movement of the enemy unit?

    let highlightUnitsInArmies: number[] = [];
    if (this.creatures[this.activeCreatureIndex].live_stats.remaining_attacks > 0) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      highlightUnitsInArmies = [otherArmyIndex];
    }

    // don't care about the return value, as we don't need to show any paths, just the reachable cells
    BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.hexMap,
      coords,
      targetCreature.creature.live_stats.remaining_movement,
      this.enemy_potential_tiles,
      Battle.DEFAULT_TERRAIN_MOVE_COST,
      { occupation_tiles: this.cached_occupation_tiles, terrain_tiles: this.terrain_tiles, creatures: this.creatures },
      { markUnitsInArmies: highlightUnitsInArmies }
    );


    resetNumericalMatrixToZero(this.enemy_range_tiles);

    if (targetCreature.creature.live_stats.is_ranged) {
      const otherArmyIndex = targetCreature.indexOFArmy === 0 ? 1 : 0;
      console.log("Getting enemy range data for: ", targetCreature.creature, " at: ", coords, " range: ", targetCreature.creature.live_stats.range);
      BattleHexMapPath.cacheRangedReachableCells(
        this.hexMap,
        coords,
        targetCreature.creature.live_stats.range,
        this.enemy_range_tiles,
        this.enemy_potential_tiles,
        this.creatures,
        { markUnitsInArmies: [otherArmyIndex] }
      );

      logMatrix(this.enemy_range_tiles, this.hexMap.width, this.hexMap.height, "Enemy range tiles");
    }

    this.nextRenderUpdate.enemyReachableCells = true;
    this.nextRenderUpdate.hoverEnemyIndex = targetCreature.indexInArmy;
    this.nextRenderUpdate.somethingChanged = true;
    if (activeCreature.live_stats.remaining_attacks <= 0) {
      return;
    }

    // Hover over on an enemy unit
    if (activeCreature.live_stats.is_ranged && !meleePreference) {

      // ---- RANGED ATTACK ----
      // Attacker is ranged, check if the target is in range
      const target = this.unitRangeData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
      if (!target) {
        return;
      }
      // The unit is ranged, the user WANTS to attack in a ranged mode, but should also check if the ranged unit is engaged in melee.
      // activeCreature.position
      if (-1 == this.hexMap.getNeighbours(activeCreature.position).findIndex(neighbour => neighbour.x === coords.x && neighbour.y === coords.y)) {
        // The target is not in melee range, so the ranged unit can attack it.
        this.nextRenderUpdate.hoverPath = [];
        this.nextRenderUpdate.hoverOverCell = coords;
        this.nextRenderUpdate.cursorHint = "attack_ranged";
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }
      // (else)
      // The target is in melee range, so the ranged unit cannot attack it with a ranged attack.
      // Continue with melee attack handling
    }

    // ---- MELEE ATTACK ----
    // This is a melee creature, it can only attack from adjacent cells.

    let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
    if (!neighbour) {
      console.log("Neighbour not found in direction: ", optionalDirection);
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    // check if neighbour is in cached cells, (unit reach data)
    const neighbourInUnitReachData = this.unitReachData.find((element) => element.coords.x === neighbour.x && element.coords.y === neighbour.y);
    if (!neighbourInUnitReachData) {
      // Cannot reach this neighbour
      if (neighbour.x === activeCreature.position.x && neighbour.y === activeCreature.position.y) {
        // "We are already where we need to be!"
        this.nextRenderUpdate.cursorHint = Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)];
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }

      const target = this.unitReachData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
      if (target) {
        //TODO: should this be a DENIED cursor?
        this.nextRenderUpdate.cursorHint = "attack_melee";
        this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
        // new direction
        if (this.nextRenderUpdate.hoverPath.length >= 2) {
          // get the direction between the last and the second last cell
          optionalDirection = this.hexMap.getDirectionForNeighbour(coords, this.nextRenderUpdate.hoverPath[this.nextRenderUpdate.hoverPath.length - 2]);
          this.nextRenderUpdate.cursorHint = Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)];
          this.nextRenderUpdate.somethingChanged = true;
          return;
        } else {
          return;
        }

        this.nextRenderUpdate.somethingChanged = true;
      } else {
        // Cannot reach the target
        this.nextRenderUpdate.cursorHint = "";
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }
    }

    // Also check if the neighbour is occupied by an enemy unit
    const neighbourCreature = this.getCreatureAtPosition(neighbour);
    if (neighbourCreature
      // && neighbourCreature.indexInArmy !== this.activeCreatureIndex
    ) {
      console.log("Occupied by enemy unit");
      // Occupied by someone else. Can't attack from this direction.
      return;
    }

    // yes, the neighbour is reachable, so we can attack from the given direction
    this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(neighbour);
    this.nextRenderUpdate.cursorHint = Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)];
    this.nextRenderUpdate.somethingChanged = true;
  }


  static findPathToCellInReachData(coords: Coords, reachData: ReachData[]): Coords[] {
    let path: Coords[] = [];
    // Get all reach data entries that have the same final coordinates.
    let finalElements = reachData.filter((element) => element.coords.x === coords.x && element.coords.y === coords.y);
    // If there are no such elements, return an empty path.
    if (finalElements.length === 0) {
      return path;
    }

    // If there are multiple elements, choose the one with the smallest cost / largest reach
    let finalElement = finalElements.reduce((prev, current) => prev.reach > current.reach ? prev : current);

    // let finalElement = reachData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
    // if (!finalElement) {
    //   return path;
    // }

    while (finalElements.length > 0 && finalElement) {
      path.push(finalElement.coords);
      // finalElement = reachData.find((element) =>
      //   element.coords.x === finalElement?.cameFrom.x
      //   && element.coords.y === finalElement?.cameFrom.y);

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

  /**
   * 
   * @param coords The coordinates of the cell to find the path to
   * @returns 
   */
  public findPathFromSelectedUnitToCell(coords: Coords): Coords[] {
    return Battle.findPathToCellInReachData(coords, this.unitReachData);
  }


  public isFinished(): boolean {
    return this.finished;
  }

  public nextTurn() {
    if (this.finished) {
      return;
    }

    // Reset the available actions for the current player. When the other player views the unit info, it should have the preview for the next turn, 
    // so all units should appear as "fresh" for the next turn.

    // set all the creatures from the current army to have full movement
    // also full attacks
    for (let i = 0; i < this.creatures.length; i++) {
      if (this.creatures[i].armyAlignment === this.currentArmyIndex) {
        // TODO: consider moving this to a method in Creature
        this.creatures[i].stats.remaining_movement = this.creatures[i].stats.num_moves;
        this.creatures[i].stats.remaining_attacks = this.creatures[i].stats.num_attacks;
        this.creatures[i].stats.remaining_counterattacks = this.creatures[i].stats.num_counterattacks;
      }
    }

    // switch to the other army
    this.currentArmyIndex = (this.currentArmyIndex + 1) % 2;
    if (this.currentArmyIndex === 0) {
      this.turnNumber++;
    }
    this.activeCreatureIndex = -1;

    this.hookNextTurn(this.turnNumber, this.currentArmyIndex);
  }

  public checkVictoryConditions(): number {
    let army0Alive = false;
    let army1Alive = false;
    for (let i = 0; i < this.creatures.length; i++) {
      if (this.creatures[i].live_stats.remaining_health > 0) {
        if (this.creatures[i].armyAlignment === 0) {
          army0Alive = true;
        } else {
          army1Alive = true;
        }
      }
    }

    if (!army0Alive) {
      console.log("Army 1 wins!");
      return 1;
    }
    if (!army1Alive) {
      console.log("Army 0 wins!");
      return 0;
    }

    return -1;
  }

  public checkVictoryConditionsAndState() {
    let result = this.checkVictoryConditions();
    if (result >= 0) {
      this.finished = true;
      this.hookBattleFinished(result);
    }
  }

  public selectNextUnitAndGetIndex(): number {
    let resultIndex = -1;
    let currentIndex = this.activeCreatureIndex;

    // locate the next creature in the current army
    for (let i = 0; i < this.creatures.length; i++) {
      currentIndex = (currentIndex + 1) % this.creatures.length;
      if (this.creatures[currentIndex].armyAlignment === this.currentArmyIndex
        && (this.creatures[currentIndex].live_stats.remaining_movement > 0
          || this.creatures[currentIndex].live_stats.remaining_attacks > 0)
      ) {
        resultIndex = currentIndex;
        break;
      }
    }

    if (resultIndex == -1) {
      // nothing was found, select the first creature in the current army
      // and notify that the turn can be over (TODO: also check if auto-turn over should be done.)
      this.hookRecommendEndTurn(this.currentArmyIndex);
    }

    this.selectUnitByIndex(this.currentArmyIndex, resultIndex);

    return resultIndex;
  }

  private selectUnitByIndex(armyIndex: number, unitIndex: number) {
    if (unitIndex >= 0) {
      this.setSelectedArmyAndCreatureIndex(armyIndex, unitIndex);
      this.showReachableCells(this.creatures[unitIndex]);
    }
    this.nextRenderUpdate.hoverPath = [];
    this.nextRenderUpdate.unitRenderUpdate = true;
  }

  public reselectCurrentUnit(): void {
    this.selectUnitByIndex(this.currentArmyIndex, this.activeCreatureIndex);
  }

  /**
   * Make the battle react to time changes. Handles any actions that are currently playing.
   * @param delta Time since last update in milliseconds
   * @returns The next render update summary. This informs the caller if the rendering needs to be updated, and what needs to be updated.
   */
  public update(delta: number): MapRenderUpdate {

    // Fix-up common actions for prev render update
    // TODO: change approach, this is hacky!
    if (this.prevRenderUpdate.hoverEnemyIndex != this.nextRenderUpdate.hoverEnemyIndex
      || this.prevRenderUpdate.hoverOverUnitIndex != this.nextRenderUpdate.hoverOverUnitIndex) {
      this.nextRenderUpdate.unitRenderUpdate = true;
    }

    this.prevRenderUpdate = this.nextRenderUpdate;
    this.nextRenderUpdate = new MapRenderUpdate();

    if (this.currentActions.length == 0) {
      return this.prevRenderUpdate;
    }

    let currentAction = this.currentActions[0];
    switch (currentAction.type) {
      case BattleActionType.MOVE:
        currentAction.remainingTime -= delta;
        this.updateDoMove(currentAction);
        break;
      case BattleActionType.ATTACK_MELEE:
      case BattleActionType.ATTACK_RANGED:
        currentAction.remainingTime -= delta;
        // Show attack animation during this time. At the end, stop the animation.
        if (currentAction.remainingTime > 0) {
          return this.prevRenderUpdate;
        }

        this.updateDoAttack(currentAction);
        break;
      case BattleActionType.COUNTER_ATTACK_MELEE:
        currentAction.remainingTime -= delta;
        // Show attack animation during this time. At the end, stop the animation.
        if (currentAction.remainingTime > 0) {
          return this.prevRenderUpdate;
        }

        this.updateDoCounterAttack(currentAction);
        break;
      case BattleActionType.TARGET_ABILITY:
        currentAction.remainingTime -= delta;
        // Show attack animation during this time. At the end, stop the animation.
        if (currentAction.remainingTime > 0) {
          return this.prevRenderUpdate;
        }

        this.updateDoApplyAbility(currentAction);
        break;
      case BattleActionType.SELECT_NEXT:
        this.currentActions.shift();
        this.selectNextUnitAndGetIndex();
        break;
    }

    return this.prevRenderUpdate;
  }

  private updateDoMove(currentAction: BattleAction) {
    if (currentAction.remainingTime > 0) {
      // not yet the time to apply it
      return;
    }

    currentAction.remainingTime = currentAction.stepDuration;
    if (currentAction.step < currentAction.path.length) {
      let nextStep = currentAction.path[currentAction.step];
      // also update the direction
      const oneDirection = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].position, nextStep);
      this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;

      this.creatures[this.activeCreatureIndex].position = nextStep;
      // TODO: also apply location specific buffs


      this.clearPositionBuffs(this.creatures[this.activeCreatureIndex]);
      this.setPositionBuffs(this.creatures[this.activeCreatureIndex], nextStep);

      this.hookMovingUnit(this.creatures[this.activeCreatureIndex], nextStep);
      currentAction.step++;
      this.nextRenderUpdate.unitRenderUpdate = true;
      this.nextRenderUpdate.somethingChanged = true;
    } else {
      // finish with the current action
      this.currentActions.shift();
      if (this.creatures[this.activeCreatureIndex].live_stats.remaining_movement > 0) {
        this.reselectCurrentUnit();
      } else {
        this.currentActions.push(
          new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
      }
    }
  }

  private updateDoAttack(currentAction: BattleAction) {
    if (currentAction.step == 0) {
      // Melee units may move to attack from behind, make certain that they are facing the right direction
      if (currentAction.type == BattleActionType.ATTACK_MELEE) {
        const oneDirection = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].pos, currentAction.path[0]);
        this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;
        this.nextRenderUpdate.unitRenderUpdate = true;
        this.nextRenderUpdate.somethingChanged = true;
      } else {
        // Ranged units need a "general direction" to face.
        const oneDirection = this.hexMap.getGeneralDirectionForTarget(this.creatures[this.activeCreatureIndex].pos, currentAction.path[0]);
        if (this.creatures[this.activeCreatureIndex].facingDirection !== oneDirection) {
          this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;
        }
      }

      const animType: AnimationType = currentAction.type == BattleActionType.ATTACK_MELEE ? AnimationType.ATTACK_MELEE : AnimationType.ATTACK_RANGED;
      // First step, start playing animation
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(animType, currentAction.path[0]);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      console.log("Playing attack animation");
      return;
    } else if (currentAction.step == 1) {
      // Second step, stop playing animation, and apply the damage
      const counterattacking = this.updateDoAttackApplyDamageAndCounter(currentAction);

      console.log("Applied attack");

      this.currentActions.shift();
      this.nextRenderUpdate.unitRenderUpdate = true;
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;

      if (!counterattacking) {
        this.currentActions.push(
          new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
      }
    }
  }

  private updateDoAttackApplyDamageAndCounter(currentAction: BattleAction): boolean {
    let counterattacking = false;
    if (currentAction.path.length <= 0) {
      return counterattacking;
    }

    const target = currentAction.path[0];
    let creatureInBattle = this.getCreatureAtPosition(target);
    if (creatureInBattle === null) {
      console.error("The creature is no longer there");
      return counterattacking;
    }

    let thisCreature = this.creatures[this.activeCreatureIndex];

    this.applyAttackDamage(thisCreature, creatureInBattle.creature, currentAction.type);

    if (!creatureInBattle.creature.isAlive) {
      console.log("The creature has died");
      this.hookUnitDied(creatureInBattle.creature);
      this.creatures.splice(creatureInBattle.indexInArmy, 1);
      this.checkVictoryConditionsAndState();
      this.tryToSelectUnitAtLocation(thisCreature.pos);
    } else {
      console.log("The creature is still alive");
      counterattacking = (currentAction.type == BattleActionType.ATTACK_MELEE) && this.queueCounterattack(creatureInBattle.creature, thisCreature);
    }

    // TODO: consider moving to Creature
    thisCreature.stats.remaining_attacks--;
    // for most units, after attacking, the turn is over, so also set their movement to 0
    // take into account later to allow features such as moving after attacking.
    thisCreature.stats.remaining_movement = 0;
    return counterattacking;
  }

  private updateDoApplyAbility(currentAction: BattleAction) {
    if (currentAction.step == 0) {
      console.log("First step of applying ability", currentAction);
      // Melee units may move to attack from behind, make certain that they are facing the right direction
      if (currentAction.type == BattleActionType.TARGET_ABILITY) {
        // Ranged units need a "general direction" to face.
        const oneDirection = this.hexMap.getGeneralDirectionForTarget(this.creatures[this.activeCreatureIndex].pos, currentAction.path[0]);
        if (this.creatures[this.activeCreatureIndex].facingDirection !== oneDirection) {
          this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;
          this.nextRenderUpdate.unitRenderUpdate = true;
          this.nextRenderUpdate.somethingChanged = true;
        }
      }

      const animType: AnimationType = AnimationType.ATTACK_RANGED;
      // First step, start playing animation
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(animType, currentAction.path[0]);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      console.log("Playing attack animation");
      return;
    } else if (currentAction.step == 1) {
      // Second step, stop playing animation, and apply the damage
      this.updateDoApplyAbilityEffect(currentAction);
      console.log("Applied ability");

      this.currentActions.shift();
      this.nextRenderUpdate.unitRenderUpdate = true;
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;

      // cancel ability selection
      this.input_state = InputState.SELECT_UNIT_OR_TARGET;
      this.abilityToApply = null;
      this.currentActions.push(
        new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
    }
  }

  private updateDoApplyAbilityEffect(currentAction: BattleAction) {
    if (currentAction.path.length <= 0) {
      return;
    }

    const target = currentAction.path[0];
    let creatureInBattle = this.getCreatureAtPosition(target);
    if (creatureInBattle === null) {
      console.error("The creature is no longer there");
      return;
    }

    let thisCreature = this.creatures[this.activeCreatureIndex];

    // TODO:XXX
    this.applyAbilityEffect(thisCreature, creatureInBattle.creature, currentAction.type);

    if (!creatureInBattle.creature.isAlive) {
      console.log("The creature has died");
      this.hookUnitDied(creatureInBattle.creature);
      this.creatures.splice(creatureInBattle.indexInArmy, 1);
      this.checkVictoryConditionsAndState();
      this.tryToSelectUnitAtLocation(thisCreature.pos);
    }
    // no counterattacks foreseen for spells (could add later?)

    // for most units, after attacking, the turn is over, so also set their movement to 0
    // take into account later to allow features such as moving after attacking.
    thisCreature.stats.remaining_movement = 0; // TODO: analyze if this should be done for abilities as well.
  }

  /**
   * 
   * @param source The creature that is attacking (or counterattacking)
   * @param target The creature being hit
   * @param attackType The type of attack
   */
  private applyAbilityEffect(source: Creature, target: Creature, attackType: BattleActionType) {
    if (attackType != BattleActionType.TARGET_ABILITY) {
      return;
    }

    if (!this.abilityToApply) {
      return;
    }

    let sourceDamage = getRandomValueBetween(this.abilityToApply.damage_low, this.abilityToApply.damage_high);
    let targetArmor = 0;

    // ignore flanking / backstabing
    let flankStatus = HexFlankStatus.NONE;
    let damage = sourceDamage - targetArmor;
    // make certain that we don't heal the target? what if it's a heal?
    if (damage < 0) {
      damage = 0;
    }

    // display this as a ranged attack
    this.hookDoingAttack(source, target, damage, BattleActionType.ATTACK_RANGED, flankStatus);
    target.takeDamage(damage);
    source.stats.remaining_attacks--;
    console.log(`Dealt ${damage} damage to the creature`);
  }

  public start() {
    this.recomputeAllPositionBuffs();
  }

  public recomputeAllPositionBuffs() {
    this.creatures.forEach(creature => {
      this.clearPositionBuffs(creature);
      this.setPositionBuffs(creature, creature.pos);
    });
  }

  private clearPositionBuffs(creature: Creature) {
    // filter out the buffs that are location specific
    creature.buffs = creature.buffs.filter(buff => buff.source !== "terrain");
  }

  private setPositionBuffs(creature: Creature, position: Coords) {
    // Get the terrain type at the position
    const terrainType = this.getTerrainAt(position);
    switch (terrainType) {
      case TerrainType.PLAIN:
        break;
      case TerrainType.FOREST:
        // Forest gives +1 to ranged defense
        creature.buffs.push(new Buff(
          { ...CreatureStats.EMPTY, defense_ranged: 1 },
          "terrain"
        ));
        break;
      case TerrainType.HILL:
        // Hills give +1 to melee defense, 
        // +1 to melee attack
        // +1 to ranged attack
        // +1 to range
        creature.buffs.push(new Buff(
          {
            ...CreatureStats.EMPTY,
            defense_melee: 1,
            attack_melee_low: 1,
            attack_melee_high: 1,
            attack_ranged_low: 1,
            attack_ranged_high: 1,
            range: 1
          },
          "terrain"
        ));
        break;
      case TerrainType.SWAMP:
        // Swamps give -1 to melee and range defense
        creature.buffs.push(new Buff(
          { ...CreatureStats.EMPTY, defense_melee: -1, defense_ranged: -1 },
          "terrain"
        ));
        break;
      default:
        break;
    }
  }

  hookDoingAttack(_thisCreature: Creature,
    _creature: Creature,
    _damage: number,
    _attackType: BattleActionType,
    _flankStatus: HexFlankStatus) {
    console.log("hookDoingAttack not implemented.");
  }

  hookNextTurn(_turnNumber: number, _armyIndex: number) {
    console.log("hookNextTurn not implemented.");
  }

  hookMovingUnit(_creature: Creature, _nextStep: Coords) {
    console.log("hookMovingUnit not implemented.");
  }

  hookUnitDied(_creature: Creature) {
    console.log("hookUnitDied not implemented.");
  }

  hookBattleFinished(_victor: number) {
    console.log("hookBattleFinished not implemented.");
  }

  hookRecommendEndTurn(_armyIndex: number) {
    console.log("hookRecommendEndTurn not implemented.");
  }

  private queueCounterattack(creatureCounterAttackFrom: Creature, creatureCounterAttackTo: Creature) {
    if (creatureCounterAttackFrom.live_stats.remaining_counterattacks <= 0) {
      return false;
    }

    console.log("Queueing counterattack");
    this.currentActions.push(
      BattleAction.CounterAttack(creatureCounterAttackFrom, creatureCounterAttackTo));

    return true;
  }

  private updateDoCounterAttack(currentAction: BattleAction) {

    if (currentAction.sourceUnit === undefined || currentAction.targetUnit === undefined) {
      return;
    }

    if (currentAction.step == 0) {
      // Melee units may have to turn around to counterattack, make certain that they are facing the right direction
      if (currentAction.type == BattleActionType.COUNTER_ATTACK_MELEE) {
        const oneDirection = this.hexMap.getDirectionForNeighbour(currentAction.sourceUnit.pos, currentAction.targetUnit.pos);
        currentAction.sourceUnit.facingDirection = oneDirection;
        this.nextRenderUpdate.unitRenderUpdate = true;
        this.nextRenderUpdate.somethingChanged = true;
      }

      const animType: AnimationType = AnimationType.ATTACK_MELEE;
      // First step, start playing animation
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(animType, currentAction.targetUnit.pos);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      console.log("Playing counterattack animation");
      return;
    } else if (currentAction.step == 1) {
      // Second step, stop playing animation, and apply the damage
      this.updateDoCounterAttackApply(currentAction);

      console.log("Applied counterattack");

      this.currentActions.shift();
      this.nextRenderUpdate.unitRenderUpdate = true;
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;

      this.currentActions.push(
        new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
    }
  }

  private updateDoCounterAttackApply(currentAction: BattleAction) {
    if (currentAction.sourceUnit === undefined || currentAction.targetUnit === undefined) {
      return;
    }

    this.applyAttackDamage(currentAction.sourceUnit, currentAction.targetUnit, BattleActionType.COUNTER_ATTACK_MELEE);

    if (!currentAction.targetUnit.isAlive) {
      console.log("The creature has died");
      const targetUnitIndex = this.creatures.findIndex((element) => element === currentAction.targetUnit);
      if (targetUnitIndex >= 0) {
        this.hookUnitDied(this.creatures[targetUnitIndex]);
        this.creatures.splice(targetUnitIndex, 1);
        this.checkVictoryConditionsAndState();

        // normally would need to select the next unit, as the active one is dead, but there will be a select_next action queued.
      }
    }

    // TODO: consider moving to Creature
    currentAction.sourceUnit.stats.remaining_counterattacks--;
  }

  /**
   * 
   * @param source The creature that is attacking (or counterattacking)
   * @param target The creature being hit
   * @param attackType The type of attack
   */
  private applyAttackDamage(source: Creature, target: Creature, attackType: BattleActionType) {
    let sourceDamage = 0;
    let targetArmor = 0;
    if (attackType == BattleActionType.ATTACK_MELEE || attackType == BattleActionType.COUNTER_ATTACK_MELEE) {
      sourceDamage = source.getRandomAttackDamageMelee();
      targetArmor = target.live_stats.defense_melee;
    } else {
      sourceDamage = source.getRandomAttackDamageRanged();
      targetArmor = target.live_stats.defense_ranged;
    }

    const attackFromDir = reverseDirection(source.facingDirection);
    let flankStatus = checkFlankingStatus(target.facingDirection, attackFromDir);
    if (flankStatus == HexFlankStatus.BACKSTAB) {
      // backstab bonus
      sourceDamage += 2;
      console.log('+2 backstab damage!! attack from dir: ' + attackFromDir + ', target facing: ' + target.facingDirection);
    } else if (flankStatus == HexFlankStatus.FLANK) {
      // flank bonus
      sourceDamage += 1;
      console.log('+1 flanking damage! attack from dir: ' + attackFromDir + ', target facing: ' + target.facingDirection);
    }

    // TODO: also filter the buffs/debuffs/passive skills that affect damage and armor
    //target.abilities.filter(ability => ability.type == AbilityType.PASSIVE && ability.affects == AbilityAffects.DAMAGE_CALC)
    // sort abilities by priority
    // apply the abilities

    let damage = sourceDamage - targetArmor;
    if (damage < 0) {
      // make certain that we don't heal the target
      damage = 0;
    }

    this.hookDoingAttack(source, target, damage, attackType, flankStatus);
    target.takeDamage(damage);
    console.log(`Dealt ${damage} damage to the creature`);
  }




  public selectActiveAbilityForCurrentUnit(abilityIndex: number) {
    // Get current unit
    let creature = this.creatures[this.activeCreatureIndex];
    if (!creature) {
      return;
    }

    // Get the ability
    if (abilityIndex >= creature.abilities.length) {
      return;
    }

    let ability = creature.abilities[abilityIndex];
    console.log("*** Requesting ability for current unit: ", ability);

    if (ability.abilityType === AbilityType.Active) {
      if (ability.requiresTarget) {
        this.showAbilityReachableCells(ability, creature);
        this.input_state = InputState.SELECT_ABILITY_TARGET;
        this.abilityToApply = ability;
      }
    }

    // if it's toggled off, reselect
    // this.reselectCurrentUnit();
  }

  public showAbilityReachableCells(ability: Ability, owningCreature: Creature): Coords[] {
    let reachableCells: Coords[] = [];

    resetNumericalMatrixToZero(this.ability_reach_tiles);
    resetNumericalMatrixToZero(this.ability_reach_targets);

    console.log("Showing ability reachable cells for: ", ability, owningCreature);
    let markUnitsInArmies: number[] = [];
    if (ability.allowedTargets.includes(AbilityTarget.Enemies)) {
      markUnitsInArmies.push(this.currentArmyIndex === 0 ? 1 : 0);
    }
    if (ability.allowedTargets.includes(AbilityTarget.Allies)) {
      markUnitsInArmies.push(this.currentArmyIndex);
    }

    // TODO: use result ?
    BattleHexMapPath.cacheRangedReachableCells(
      this.hexMap,
      owningCreature.pos,
      ability.range,
      this.ability_reach_tiles,
      this.ability_reach_targets,
      this.creatures,
      { markUnitsInArmies: markUnitsInArmies }
    );

    logMatrix(this.ability_reach_tiles, this.hexMap.width, this.hexMap.height, "Ability reach");

    this.nextRenderUpdate.hoverPath = [];
    this.nextRenderUpdate.abilityReachableCells = true;
    this.nextRenderUpdate.reachableCells = true;
    this.nextRenderUpdate.somethingChanged = true;
    resetNumericalMatrixToZero(this.pathfinding_tiles);


    return reachableCells;
  }



}