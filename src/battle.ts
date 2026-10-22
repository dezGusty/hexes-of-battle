import { Ability, AbilityResourceUse, AbilityTarget, AbilityType } from "./battle/ability";
import { Buff, Creature, CreatureStats } from "./battle/creature";
import { checkFlankingStatus, HexDirection, HexFlankStatus, HexMap, reverseDirection } from "./shared/hex-map";
import { Coords } from "./shared";
import { NumMatrix } from "./shared/num-matrix";
import { BattleHexMapPath } from "./battle/battle-hex-map-path";
import { ReachData } from "./shared/reach-data";
import { CreatureInBattle } from "./battle/creature-in-battle";
import { BattleAction, BattleActionType } from "./battle/battle-action";
import { BattleConfig, BattleResult } from "./battle/battle-types";
import { CombatConfig, DEFAULT_COMBAT_CONFIG, ExhaustionState, MoraleState, getRetaliationDamageMultiplier } from "./battle/combat-rules";
import { TerrainType } from "./battle/terrain-types";
import { SeedableRNG } from "./shared/prng";

export enum AnimationType {
  NONE = 0,
  ATTACK_MELEE = 1,
  ATTACK_RANGED = 2,
  REST = 3,
}

export class AnimationAtCoords {
  static DEFAULT = new AnimationAtCoords(AnimationType.NONE, { x: 0, y: 0 });
  constructor(public type: AnimationType, public coords: Coords) {}
}

export interface RangedProjectileData {
  targetHex: Coords;
  hitCreature: Creature | null;
  isScatter: boolean;
}

export interface RangedAttackData {
  attacker: Creature;
  intendedTarget: Creature | null;
  intendedHex: Coords;
  projectiles: RangedProjectileData[];
  targetDamages: Array<{ target: Creature; damage: number; flankStatus: HexFlankStatus }>;
}

export interface BattleHooks {
  hookMovingUnit: (creature: Creature, position: Coords) => void;
  hookNextTurn: (turnNumber: number, currentArmyIndex: number) => void;
  hookRecommendEndTurn: (currentArmyIndex: number) => void;
  hookBattleFinished: (winningArmyIndex: number) => void;
  hookDoingAttack?: (
    attacker: Creature,
    defender: Creature,
    damage: number,
    attackType: BattleActionType,
    flankStatus: HexFlankStatus,
    isRetaliation?: boolean
  ) => void;
  hookDoingAttackRanged?: (data: RangedAttackData) => void;
  hookUnitDied?: (creature: Creature) => void;
  hookActiveUnitChanged?: (creature: Creature) => void;
  hookRangedScatter?: (attacker: Creature, originalTarget: Coords, scatterTarget: Coords, hitCreature: Creature | null) => void;
  hookMoraleBreak?: (creature: Creature, state: MoraleState) => void;
}

export enum ArmyControlType {
  PLAYER = 0,
  AI = 1,
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

  public setCursorHint(cursorHint: string) {
    this.cursorHint = cursorHint;
    this.somethingChanged = true;
  }

  public setUnitRenderUpdate() {
    this.unitRenderUpdate = true;
    this.somethingChanged = true;
  }
}

export enum InputState {
  NONE = 0,
  SELECT_UNIT = 1,
  SELECT_UNIT_OR_TARGET = 2,
  SELECT_ABILITY_TARGET = 3,
}

export enum AttackCursorHint {
  NONE = "",
  ATTACK_MELEE_E = "attack_melee_e",
  ATTACK_MELEE_NE = "attack_melee_ne",
  ATTACK_MELEE_NW = "attack_melee_nw",
  ATTACK_MELEE_W = "attack_melee_w",
  ATTACK_MELEE_SW = "attack_melee_sw",
  ATTACK_MELEE_SE = "attack_melee_se",
}

/**
 * Handles tactical turn-based combat between two armies on a hex grid.
 */
export class Battle {
  public turnNumber = 0;
  public currentArmyIndex: number = 0;
  public activeCreatureIndex: number = -1;

  public army_control: ArmyControlType[] = [ArmyControlType.PLAYER, ArmyControlType.AI];
  public renderStateChanged: boolean = true;
  public creatures: Creature[] = [];
  public casualties: Creature[] = [];

  public pathfinding_tiles: number[][] = [];
  public enemy_potential_tiles: number[][] = [];
  public enemy_range_tiles: number[][] = [];
  public rangereach_tiles: number[][] = [];
  public rangereach_targets: number[][] = [];
  public ability_reach_tiles: number[][] = [];
  public ability_reach_targets: number[][] = [];
  public cached_occupation_tiles: number[][] = [];
  public terrain_tiles: number[][] = [];

  public nextRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  public prevRenderUpdate: MapRenderUpdate = new MapRenderUpdate();
  public currentHoverCell: Coords | null = null;
  public currentHoverDirection: HexDirection = HexDirection.NONE;
  public currentHoverPath: Coords[] = [];
  private unitReachData: ReachData[] = [];
  private unitRangeData: ReachData[] = [];

  private currentActions: BattleAction[] = [];
  private finished: boolean = false;
  private onMouseOverCellPrevPrefMelee: boolean = false;
  private input_state: InputState = InputState.SELECT_UNIT_OR_TARGET;
  private abilityToApply: Ability | null = null;

  public combatConfig: CombatConfig = { ...DEFAULT_COMBAT_CONFIG };
  public rng: SeedableRNG = new SeedableRNG();

  // Metrics
  public totalDamageDealt: [number, number] = [0, 0];
  public totalStaminaSpent: [number, number] = [0, 0];
  public moraleBreaks: [number, number] = [0, 0];
  public friendlyFireEvents: number = 0;
  public maxTurns: number = 100;

  public static DIRECTION_TO_ATTACK_CURSOR: Record<HexDirection, AttackCursorHint> = {
    [HexDirection.NONE]: AttackCursorHint.NONE,
    [HexDirection.EAST]: AttackCursorHint.ATTACK_MELEE_E,
    [HexDirection.NORTHEAST]: AttackCursorHint.ATTACK_MELEE_NE,
    [HexDirection.NORTHWEST]: AttackCursorHint.ATTACK_MELEE_NW,
    [HexDirection.WEST]: AttackCursorHint.ATTACK_MELEE_W,
    [HexDirection.SOUTHWEST]: AttackCursorHint.ATTACK_MELEE_SW,
    [HexDirection.SOUTHEAST]: AttackCursorHint.ATTACK_MELEE_SE,
  };

  constructor(public hexMap: HexMap) {}

  public setCombatConfig(config: CombatConfig): void {
    this.combatConfig = config;
  }

  public setSeed(seed: number): void {
    this.rng = new SeedableRNG(seed);
  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    this.pathfinding_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.enemy_potential_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.enemy_range_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.rangereach_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.rangereach_targets = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.ability_reach_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.ability_reach_targets = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.cached_occupation_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);
    this.terrain_tiles = NumMatrix.createZeroMatrix(mapWidth, mapHeight);

    this.creatures = [];
    this.casualties = [];
    this.finished = false;
    this.turnNumber = 0;
    this.currentArmyIndex = 0;
    this.activeCreatureIndex = -1;
    this.totalDamageDealt = [0, 0];
    this.totalStaminaSpent = [0, 0];
    this.moraleBreaks = [0, 0];
    this.friendlyFireEvents = 0;

    this.generateTerrain(this.terrain_tiles, mapWidth, mapHeight);
  }

  public initializeFromConfig(config: BattleConfig): void {
    if (config.combatConfig) {
      this.combatConfig = config.combatConfig;
    }
    if (config.seed !== undefined) {
      this.setSeed(config.seed);
    }
    if (config.maxTurns !== undefined) {
      this.maxTurns = config.maxTurns;
    }

    this.initializeToSize(config.mapWidth, config.mapHeight);

    if (config.terrainTiles) {
      for (let i = 0; i < config.mapWidth && i < config.terrainTiles.length; i++) {
        for (let j = 0; j < config.mapHeight && j < config.terrainTiles[i].length; j++) {
          this.terrain_tiles[i][j] = config.terrainTiles[i][j];
        }
      }
    }

    if (config.armyControl) {
      this.army_control = [...config.armyControl];
    }

    this.creatures = config.creatures.map((c) => {
      c.updateMoraleState();
      c.updateExhaustionState();
      return c;
    });

    this.start();
  }

  public generateTerrain(matrix: number[][], mapWidth: number, mapHeight: number) {
    // Terrain weights: Plain (0): 15, Forest (1): 3, Hill (2): 2, Swamp (3): 1
    const weights = [15, 3, 2, 1];
    const terrain_type_limits: number[] = weights.map((value, index) => {
      return value + weights.reduce((x, y, i) => (i < index ? x + y : x), 0);
    });

    const sum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < mapWidth; i++) {
      for (let j = 0; j < mapHeight; j++) {
        const random_value = this.rng.range(0, sum - 1);
        let terrain_type = terrain_type_limits.findIndex((value) => value > random_value);
        matrix[i][j] = terrain_type >= 0 ? terrain_type : 0;
      }
    }
  }

  public getTerrainAt(coords: Coords): number {
    if (coords.x < 0 || coords.x >= this.hexMap.width || coords.y < 0 || coords.y >= this.hexMap.height) {
      return TerrainType.WATER; // Impassable
    }
    return this.terrain_tiles[coords.x]?.[coords.y] ?? 0;
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

    if (creatureIndex >= 0 && creatureIndex < this.creatures.length) {
      this.hookActiveUnitChanged(this.creatures[creatureIndex]);
    }
  }

  public cacheCreaturesToHexMap() {
    NumMatrix.resetToZero(this.cached_occupation_tiles);
    for (let i = 0; i < this.creatures.length; i++) {
      let creature = this.creatures[i];
      if (creature.pos.x >= 0 && creature.pos.x < this.hexMap.width && creature.pos.y >= 0 && creature.pos.y < this.hexMap.height) {
        this.cached_occupation_tiles[creature.pos.x][creature.pos.y] = i + 1;
      }
    }
  }

  public getMoveCostForTerrain(terrainType: number, creature?: Creature): number {
    if (creature?.isFlying) {
      return 1;
    }
    return this.combatConfig.terrain.moveCosts[terrainType] ?? 1;
  }

  public getActiveCreature(): Creature | null {
    if (this.activeCreatureIndex < 0 || this.activeCreatureIndex >= this.creatures.length) return null;
    return this.creatures[this.activeCreatureIndex];
  }

  public getStaminaCostForTerrain(terrainType: number): number {
    return this.combatConfig.terrain.staminaCosts[terrainType] ?? 1;
  }

  public showReachableCellsForCreature(creature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    let creaturePosition = creature.pos;

    this.cacheCreaturesToHexMap();

    let highlightUnitsInArmies: number[] = [];
    if (creature.live_stats.remaining_attacks > 0 && creature.exhaustionState !== ExhaustionState.DEPLETED && !creature.isPanickedOrRouting) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      highlightUnitsInArmies = [otherArmyIndex];
    }

    const terrainCostsRecord: Record<number, number> = {};
    const allTerrains = [
      TerrainType.PLAIN,
      TerrainType.FOREST,
      TerrainType.HILL,
      TerrainType.SWAMP,
      TerrainType.WATER,
    ];
    for (const t of allTerrains) {
      terrainCostsRecord[t] = this.getMoveCostForTerrain(t, creature);
    }

    const maxMove = creature.exhaustionState === ExhaustionState.DEPLETED ? 0 : creature.live_stats.remaining_movement;

    this.unitReachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.hexMap,
      creaturePosition,
      maxMove,
      this.pathfinding_tiles,
      terrainCostsRecord,
      { occupation_tiles: this.cached_occupation_tiles, terrain_tiles: this.terrain_tiles, creatures: this.creatures },
      { markUnitsInArmies: highlightUnitsInArmies }
    );

    this.unitRangeData = [];
    NumMatrix.resetToZero(this.rangereach_tiles);
    NumMatrix.resetToZero(this.rangereach_targets);

    if (creature.live_stats.is_ranged && creature.live_stats.remaining_ammo > 0 && creature.exhaustionState !== ExhaustionState.DEPLETED && !creature.isPanickedOrRouting) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      this.unitRangeData = BattleHexMapPath.cacheRangedReachableCells(
        this.hexMap,
        creaturePosition,
        creature.live_stats.range,
        this.rangereach_tiles,
        this.rangereach_targets,
        { creatures: this.creatures },
        { markUnitsInArmies: [otherArmyIndex] }
      );
    }

    this.nextRenderUpdate.reachableCells = true;
    return reachableCells;
  }

  public getSelectedCreature(): Creature | null {
    if (this.activeCreatureIndex < 0 || this.activeCreatureIndex >= this.creatures.length) {
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
        if (this.pathfinding_tiles[i][j] == BattleHexMapPath.CELL_ENEMY) {
          pathfindingData.push(new ReachData({ x: i, y: j }, this.pathfinding_tiles[i][j], { x: 0, y: 0 }));
        }
      }
    }
    return pathfindingData;
  }

  public isCurrentTurnAI(): boolean {
    return this.army_control[this.currentArmyIndex] === ArmyControlType.AI;
  }

  public getCreatureAtPosition(coords: Coords): CreatureInBattle | null {
    for (let index = 0; index < this.creatures.length; index++) {
      if (this.creatures[index].pos.x === coords.x && this.creatures[index].pos.y === coords.y) {
        return new CreatureInBattle(this.creatures[index], coords, index, this.creatures[index].armyAlignment);
      }
    }
    return null;
  }

  public setCreatureFacing(creatureIndex: number, direction: HexDirection): boolean {
    if (creatureIndex < 0 || creatureIndex >= this.creatures.length) return false;
    if (direction === HexDirection.NONE) return false;
    this.creatures[creatureIndex].facingDirection = direction;
    this.nextRenderUpdate.setUnitRenderUpdate();
    return true;
  }

  public restActiveCreature(): boolean {
    if (this.activeCreatureIndex < 0) return false;
    const creature = this.creatures[this.activeCreatureIndex];
    if (creature.armyAlignment !== this.currentArmyIndex) return false;
    if (!creature.canRest()) return false;

    creature.stats.has_rested = true;
    creature.rest(this.combatConfig.stamina.restRecovery);
    creature.stats.remaining_movement = 0;
    creature.stats.remaining_attacks = 0;

    this.currentActions.push(BattleAction.Rest(creature));
    this.nextRenderUpdate.setUnitRenderUpdate();
    return true;
  }

  public moveOrAttackWithActiveCreatureAtLocation(coords: Coords, optionalDirection: HexDirection, meleePreference: boolean = false) {
    if (this.activeCreatureIndex < 0) {
      return;
    }

    if (
      this.pathfinding_tiles[coords.x]?.[coords.y] <= 0 &&
      this.rangereach_tiles[coords.x]?.[coords.y] <= 0 &&
      this.rangereach_targets[coords.x]?.[coords.y] <= 0
    ) {
      return;
    }

    let creature = this.creatures[this.activeCreatureIndex];
    if (creature.live_stats.remaining_attacks <= 0 && creature.live_stats.remaining_movement <= 0) {
      return;
    }

    let creatureAtTarget = this.getCreatureAtPosition(coords);
    if (creatureAtTarget === null) {
      // Move creature
      const path = this.findPathFromSelectedUnitToCell(coords);
      if (path.length === 0) return;

      const terrainCostsRecord: Record<number, number> = {};
      for (let t = 0; t <= 5; t++) terrainCostsRecord[t] = this.getMoveCostForTerrain(t, creature);

      const moveCost = this.getMovementCostForPath(path, creature, terrainCostsRecord);
      const staminaCost = this.getStaminaCostForPath(path, creature);

      creature.stats.remaining_movement = Math.max(0, creature.stats.remaining_movement - moveCost);
      creature.consumeStamina(staminaCost);
      this.totalStaminaSpent[this.currentArmyIndex] += staminaCost;

      const moveSteps = (path.length > 1 && path[0].x === creature.position.x && path[0].y === creature.position.y) ? path.slice(1) : path;
      if (moveSteps.length > 0) {
        this.currentActions.push(new BattleAction(BattleActionType.MOVE, moveSteps, 0, 50, 50, creature));
      }
      this.nextRenderUpdate.hoverOverCell = null;
      this.nextRenderUpdate.hoverPath = [];
      this.currentHoverPath = [];
      return;
    }

    if (creatureAtTarget.indexInArmy === this.activeCreatureIndex) {
      return;
    }

    if (creature.armyAlignment === creatureAtTarget.indexOFArmy) {
      return;
    }

    if (creature.live_stats.is_ranged && creature.live_stats.remaining_ammo > 0 && !creature.isPanickedOrRouting) {
      if (!meleePreference) {
        if (this.rangereach_tiles[coords.x]?.[coords.y] > 0 || this.rangereach_targets[coords.x]?.[coords.y] > 0) {
          const isAdjacent = this.hexMap.getNeighbours(creature.pos).some((n) => n.x === coords.x && n.y === coords.y);
          if (!isAdjacent) {
            // Unblocked ranged attack with scatter and friendly fire check
            this.currentActions.push(new BattleAction(BattleActionType.ATTACK_RANGED, [coords], 0, 500, 50, creature, creatureAtTarget.creature));
            this.nextRenderUpdate.setUnitRenderUpdate();
            return;
          }
        }
      }
    }

    // Melee attack
    if (creature.live_stats.remaining_attacks <= 0 || creature.isPanickedOrRouting || creature.exhaustionState === ExhaustionState.DEPLETED) {
      return;
    }

    let path: Coords[] = [];
    if (optionalDirection !== HexDirection.NONE) {
      let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
      if (neighbour) {
        let creatureAtNeighbour = this.getCreatureAtPosition(neighbour);
        if (creatureAtNeighbour === null || (neighbour.x === creature.pos.x && neighbour.y === creature.pos.y)) {
          path = this.findPathFromSelectedUnitToCell(neighbour);
        }
      }
    }

    if (path.length === 0) {
      path = this.findPathFromSelectedUnitToCell(coords);
      if (path.length > 1) {
        path.pop(); // Approach hex is the one before target
      }
    }

    const terrainCostsRecord: Record<number, number> = {};
    for (let t = 0; t <= 5; t++) terrainCostsRecord[t] = this.getMoveCostForTerrain(t, creature);

    const moveSteps = (path.length > 1 && path[0].x === creature.position.x && path[0].y === creature.position.y)
      ? path.slice(1)
      : (path.length === 1 && path[0].x === creature.position.x && path[0].y === creature.position.y ? [] : path);

    if (moveSteps.length > 0) {
      const moveCost = this.getMovementCostForPath(path, creature, terrainCostsRecord);
      const staminaCost = this.getStaminaCostForPath(path, creature);
      creature.stats.remaining_movement = Math.max(0, creature.stats.remaining_movement - moveCost);
      creature.consumeStamina(staminaCost);
      this.totalStaminaSpent[this.currentArmyIndex] += staminaCost;
      this.currentActions.push(new BattleAction(BattleActionType.MOVE, moveSteps, 0, 50, 50, creature, creatureAtTarget.creature));
    }

    this.currentActions.push(BattleAction.CreateAttackMelee(creature, creatureAtTarget.creature));
  }

  public handlePrimaryCellAction(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE): boolean {
    if (this.hasRunningActions()) return false;
    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) return false;

    if (this.selectTargetForAbility(coords, optionalDirection)) {
      return true;
    }

    this.tryToSelectUnitAtLocation(coords);
    return true;
  }

  public handleSecondaryCellAction(
    coords: Coords,
    optionalDirection: HexDirection = HexDirection.NONE,
    meleePreference: boolean = false
  ): boolean {
    if (this.hasRunningActions()) return false;
    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) return false;

    if (this.cancelTargetForAbilityIfApplicable()) {
      return true;
    }

    this.moveOrAttackWithActiveCreatureAtLocation(coords, optionalDirection, meleePreference);
    return true;
  }

  public onMouseClickOnCell(
    event: { button: number },
    coords: Coords,
    optionalDirection: HexDirection = HexDirection.NONE,
    meleePreference: boolean = false
  ) {
    if (event.button === 0) {
      this.handlePrimaryCellAction(coords, optionalDirection);
    } else if (event.button === 2) {
      this.handleSecondaryCellAction(coords, optionalDirection, meleePreference);
    }
  }

  public selectTargetForAbility(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE): boolean {
    if (this.input_state != InputState.SELECT_ABILITY_TARGET) {
      return false;
    }
    this.tryToApplyAbilityWithActiveCreatureAtLocation(coords, optionalDirection);
    return true;
  }

  public cancelTargetForAbilityIfApplicable(): boolean {
    if (this.input_state != InputState.SELECT_ABILITY_TARGET) {
      return false;
    }
    this.input_state = InputState.SELECT_UNIT_OR_TARGET;
    this.abilityToApply = null;
    this.reselectCurrentUnit();
    return true;
  }

  public onMouseOverCell(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE, meleePreference: boolean = false) {
    if (this.hasRunningActions()) return;
    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) return;

    if (
      this.nextRenderUpdate.hoverOverCell &&
      this.nextRenderUpdate.hoverOverCell.x === coords.x &&
      this.nextRenderUpdate.hoverOverCell.y === coords.y &&
      this.nextRenderUpdate.hoverDirection === optionalDirection &&
      this.onMouseOverCellPrevPrefMelee === meleePreference
    ) {
      return;
    }

    this.onMouseOverCellPrevPrefMelee = meleePreference;
    this.currentHoverCell = coords;
    this.currentHoverDirection = optionalDirection;
    this.nextRenderUpdate.hoverOverCell = coords;
    this.nextRenderUpdate.hoverDirection = optionalDirection;
    if (this.activeCreatureIndex <= -1) {
      this.nextRenderUpdate.hoverPath = [];
      this.currentHoverPath = [];
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    const activeCreature = this.creatures[this.activeCreatureIndex];
    const targetCreature = this.getCreatureAtPosition(coords);

    if (targetCreature === null || targetCreature.indexOFArmy === this.currentArmyIndex) {
      this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
      this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
      this.nextRenderUpdate.somethingChanged = true;
      this.nextRenderUpdate.setCursorHint("default");
      this.nextRenderUpdate.enemyReachableCells = true;
      this.nextRenderUpdate.hoverOverUnitIndex = targetCreature?.indexInArmy ?? -1;
      NumMatrix.resetToZero(this.enemy_potential_tiles);
      NumMatrix.resetToZero(this.enemy_range_tiles);
      return;
    }

    let highlightUnitsInArmies: number[] = [];
    if (this.creatures[this.activeCreatureIndex].live_stats.remaining_attacks > 0) {
      const otherArmyIndex = this.currentArmyIndex === 0 ? 1 : 0;
      highlightUnitsInArmies = [otherArmyIndex];
    }

    const terrainCostsRecord: Record<number, number> = {};
    for (let t = 0; t <= 5; t++) terrainCostsRecord[t] = this.getMoveCostForTerrain(t, targetCreature?.creature);

    BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.hexMap,
      coords,
      targetCreature.creature.live_stats.remaining_movement,
      this.enemy_potential_tiles,
      terrainCostsRecord,
      { occupation_tiles: this.cached_occupation_tiles, terrain_tiles: this.terrain_tiles, creatures: this.creatures },
      { markUnitsInArmies: highlightUnitsInArmies }
    );

    NumMatrix.resetToZero(this.enemy_range_tiles);
    if (targetCreature.creature.live_stats.is_ranged && targetCreature.creature.live_stats.remaining_ammo > 0) {
      const otherArmyIndex = targetCreature.indexOFArmy === 0 ? 1 : 0;
      BattleHexMapPath.cacheRangedReachableCells(
        this.hexMap,
        coords,
        targetCreature.creature.live_stats.range,
        this.enemy_range_tiles,
        this.enemy_potential_tiles,
        { creatures: this.creatures },
        { markUnitsInArmies: [otherArmyIndex] }
      );
    }

    this.nextRenderUpdate.enemyReachableCells = true;
    this.nextRenderUpdate.hoverEnemyIndex = targetCreature.indexInArmy;
    this.nextRenderUpdate.somethingChanged = true;

    if (activeCreature.live_stats.remaining_attacks <= 0 || activeCreature.exhaustionState === ExhaustionState.DEPLETED) {
      return;
    }

    if (activeCreature.live_stats.is_ranged && activeCreature.live_stats.remaining_ammo > 0 && !meleePreference) {
      const target = this.unitRangeData.find((element) => element.coords.x === coords.x && element.coords.y === coords.y);
      if (target) {
        const isAdjacent = this.hexMap.getNeighbours(activeCreature.position).some((n) => n.x === coords.x && n.y === coords.y);
        if (!isAdjacent) {
          this.nextRenderUpdate.hoverPath = [];
          this.currentHoverPath = [];
          this.nextRenderUpdate.hoverOverCell = coords;
          this.nextRenderUpdate.setCursorHint("attack_ranged");
          this.nextRenderUpdate.somethingChanged = true;
          return;
        }
      }
    }

    let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
    if (!neighbour) {
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    const neighbourInUnitReachData = this.unitReachData.find((e) => e.coords.x === neighbour!.x && e.coords.y === neighbour!.y);
    if (!neighbourInUnitReachData) {
      if (neighbour.x === activeCreature.position.x && neighbour.y === activeCreature.position.y) {
        this.nextRenderUpdate.setCursorHint(Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)]);
        this.nextRenderUpdate.hoverPath = [activeCreature.position];
        this.currentHoverPath = [activeCreature.position];
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }
      const target = this.unitReachData.find((e) => e.coords.x === coords.x && e.coords.y === coords.y);
      if (target) {
        this.nextRenderUpdate.cursorHint = "attack_melee";
        this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
        this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
        if (this.nextRenderUpdate.hoverPath.length >= 2) {
          optionalDirection = this.hexMap.getDirectionForNeighbour(coords, this.nextRenderUpdate.hoverPath[this.nextRenderUpdate.hoverPath.length - 2]);
          this.nextRenderUpdate.setCursorHint(Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)]);
        }
      } else {
        this.nextRenderUpdate.setCursorHint("");
      }
      return;
    }

    if (this.getCreatureAtPosition(neighbour)) {
      return;
    }

    this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(neighbour);
    this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
    this.nextRenderUpdate.cursorHint = Battle.DIRECTION_TO_ATTACK_CURSOR[reverseDirection(optionalDirection)];
    this.nextRenderUpdate.somethingChanged = true;
  }

  public findPathFromSelectedUnitToCell(coords: Coords): Coords[] {
    return BattleHexMapPath.findPathToCellInReachData(coords, this.unitReachData);
  }

  public getHoverPath(): Coords[] {
    if (this.currentHoverPath && this.currentHoverPath.length > 0) {
      return [...this.currentHoverPath];
    }
    if (this.nextRenderUpdate.hoverPath && this.nextRenderUpdate.hoverPath.length > 0) {
      return [...this.nextRenderUpdate.hoverPath];
    }
    return [];
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public nextTurn() {
    if (this.finished) return;

    // Apply rest-by-default for all units of the army whose turn is ending if they performed no action
    for (let i = 0; i < this.creatures.length; i++) {
      const creature = this.creatures[i];
      if (creature.armyAlignment === this.currentArmyIndex && creature.canRest()) {
        creature.stats.has_rested = true;
        creature.rest(this.combatConfig.stamina.restRecovery);
      }
    }

    this.currentArmyIndex = (this.currentArmyIndex + 1) % 2;
    if (this.currentArmyIndex === 0) {
      this.turnNumber++;
      if (this.turnNumber >= this.maxTurns) {
        this.finished = true;
        this.hookBattleFinished(-1);
        return;
      }
    }

    // Reset units for the army whose turn is now starting
    for (let i = 0; i < this.creatures.length; i++) {
      if (this.creatures[i].armyAlignment === this.currentArmyIndex) {
        this.creatures[i].resetTurn();
      }
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

    if (!army0Alive && !army1Alive) return 0; // Draw/edge case
    if (!army0Alive) return 1;
    if (!army1Alive) return 0;
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

    for (let i = 0; i < this.creatures.length; i++) {
      currentIndex = (currentIndex + 1) % this.creatures.length;
      const c = this.creatures[currentIndex];
      if (
        c.armyAlignment === this.currentArmyIndex &&
        !c.isPanickedOrRouting &&
        c.exhaustionState !== ExhaustionState.DEPLETED &&
        (c.live_stats.remaining_movement > 0 || c.live_stats.remaining_attacks > 0)
      ) {
        resultIndex = currentIndex;
        break;
      }
    }

    if (resultIndex === -1) {
      this.hookRecommendEndTurn(this.currentArmyIndex);
    }

    this.selectUnitByIndex(this.currentArmyIndex, resultIndex);
    return resultIndex;
  }

  private selectUnitByIndex(armyIndex: number, unitIndex: number) {
    if (unitIndex >= 0 && unitIndex < this.creatures.length) {
      this.setSelectedArmyAndCreatureIndex(armyIndex, unitIndex);
      this.showReachableCellsForCreature(this.creatures[unitIndex]);
    } else {
      this.setSelectedArmyAndCreatureIndex(armyIndex, -1);
      this.unitReachData = [];
      this.unitRangeData = [];
      NumMatrix.resetToZero(this.pathfinding_tiles);
      NumMatrix.resetToZero(this.rangereach_tiles);
      NumMatrix.resetToZero(this.rangereach_targets);
      this.hookActiveUnitChanged(null as any);
    }
    this.nextRenderUpdate.hoverPath = [];
    this.nextRenderUpdate.setUnitRenderUpdate();
  }

  public reselectCurrentUnit(): void {
    this.selectUnitByIndex(this.currentArmyIndex, this.activeCreatureIndex);
  }

  public update(delta: number): MapRenderUpdate {
    if (
      this.prevRenderUpdate.hoverEnemyIndex !== this.nextRenderUpdate.hoverEnemyIndex ||
      this.prevRenderUpdate.hoverOverUnitIndex !== this.nextRenderUpdate.hoverOverUnitIndex
    ) {
      this.nextRenderUpdate.unitRenderUpdate = true;
    }

    this.prevRenderUpdate = this.nextRenderUpdate;
    this.nextRenderUpdate = new MapRenderUpdate();

    if (this.currentActions.length === 0) {
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
        if (currentAction.remainingTime > 0) return this.prevRenderUpdate;
        this.updateDoAttack(currentAction);
        break;

      case BattleActionType.COUNTER_ATTACK_MELEE:
        currentAction.remainingTime -= delta;
        if (currentAction.remainingTime > 0) return this.prevRenderUpdate;
        this.updateDoCounterAttack(currentAction);
        break;

      case BattleActionType.REST:
        currentAction.remainingTime -= delta;
        if (currentAction.remainingTime > 0) return this.prevRenderUpdate;
        this.updateDoRest(currentAction);
        break;

      case BattleActionType.TARGET_ABILITY:
        currentAction.remainingTime -= delta;
        if (currentAction.remainingTime > 0) return this.prevRenderUpdate;
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
    if (currentAction.remainingTime > 0) return;
    currentAction.remainingTime = currentAction.stepDuration;

    if (currentAction.step < currentAction.path.length) {
      let nextStep = currentAction.path[currentAction.step];
      const oneDirection = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].position, nextStep);
      this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;
      this.creatures[this.activeCreatureIndex].position = nextStep;

      this.clearPositionBuffs(this.creatures[this.activeCreatureIndex]);
      this.setPositionBuffs(this.creatures[this.activeCreatureIndex], nextStep);

      this.hookMovingUnit(this.creatures[this.activeCreatureIndex], nextStep);
      currentAction.step++;
      this.nextRenderUpdate.setUnitRenderUpdate();
    } else {
      this.currentActions.shift();
      if (this.activeCreatureIndex >= 0 && this.activeCreatureIndex < this.creatures.length && (this.creatures[this.activeCreatureIndex]?.live_stats.remaining_movement > 0 || this.creatures[this.activeCreatureIndex]?.live_stats.remaining_attacks > 0)) {
        this.reselectCurrentUnit();
      } else {
        this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
      }
    }
  }

  private updateDoRest(_currentAction: BattleAction) {
    this.currentActions.shift();
    this.nextRenderUpdate.setUnitRenderUpdate();
    this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
  }

  private updateDoAttack(currentAction: BattleAction) {
    if (currentAction.step === 0) {
      if (currentAction.type === BattleActionType.ATTACK_MELEE) {
        const oneDirection = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].pos, currentAction.path[0]);
        this.creatures[this.activeCreatureIndex].facingDirection = oneDirection;
        this.nextRenderUpdate.setUnitRenderUpdate();
      } else {
        this.makeCreatureFaceTargetIfNeeded(this.creatures[this.activeCreatureIndex], currentAction.path[0]);
      }

      const animType = currentAction.type === BattleActionType.ATTACK_MELEE ? AnimationType.ATTACK_MELEE : AnimationType.ATTACK_RANGED;
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(animType, currentAction.path[0]);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      return;
    } else if (currentAction.step === 1) {
      const counterattacking = this.updateDoAttackApplyDamageAndCounter(currentAction);
      this.currentActions.shift();
      this.nextRenderUpdate.setUnitRenderUpdate();
      currentAction.step++;

      if (!counterattacking) {
        this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
      }
    }
  }

  private executeAttackDirect(currentAction: BattleAction): boolean {
    if (this.activeCreatureIndex < 0 || this.activeCreatureIndex >= this.creatures.length) return false;
    if (currentAction.type === BattleActionType.ATTACK_MELEE) {
      const dir = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].pos, currentAction.path[0]);
      if (dir !== HexDirection.NONE) this.creatures[this.activeCreatureIndex].facingDirection = dir;
    } else {
      this.makeCreatureFaceTargetIfNeeded(this.creatures[this.activeCreatureIndex], currentAction.path[0]);
    }
    return this.updateDoAttackApplyDamageAndCounter(currentAction);
  }

  private executeCounterAttackDirect(currentAction: BattleAction) {
    if (currentAction.sourceUnit && currentAction.targetUnit) {
      const dir = this.hexMap.getDirectionForNeighbour(currentAction.sourceUnit.pos, currentAction.targetUnit.pos);
      if (dir !== HexDirection.NONE) currentAction.sourceUnit.facingDirection = dir;
      this.updateDoCounterAttackApply(currentAction);
    }
  }

  /**
   * Headless step execution without animation delays.
   * Runs all queued actions immediately.
   */
  public stepInstant(): void {
    while (this.currentActions.length > 0) {
      let currentAction = this.currentActions[0];
      switch (currentAction.type) {
        case BattleActionType.MOVE:
          while (currentAction.step < currentAction.path.length) {
            let nextStep = currentAction.path[currentAction.step];
            const dir = this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].position, nextStep);
            this.creatures[this.activeCreatureIndex].facingDirection = dir;
            this.creatures[this.activeCreatureIndex].position = nextStep;
            this.clearPositionBuffs(this.creatures[this.activeCreatureIndex]);
            this.setPositionBuffs(this.creatures[this.activeCreatureIndex], nextStep);
            this.hookMovingUnit(this.creatures[this.activeCreatureIndex], nextStep);
            currentAction.step++;
          }
          this.currentActions.shift();
          if (this.activeCreatureIndex >= 0 && this.activeCreatureIndex < this.creatures.length) {
            this.reselectCurrentUnit();
          }
          break;

        case BattleActionType.ATTACK_MELEE:
        case BattleActionType.ATTACK_RANGED:
          this.executeAttackDirect(currentAction);
          this.currentActions.shift();
          break;

        case BattleActionType.COUNTER_ATTACK_MELEE:
          this.executeCounterAttackDirect(currentAction);
          this.currentActions.shift();
          break;

        case BattleActionType.REST:
          this.currentActions.shift();
          break;

        case BattleActionType.TARGET_ABILITY:
          this.updateDoApplyAbilityEffect(currentAction);
          this.currentActions.shift();
          break;

        case BattleActionType.SELECT_NEXT:
          this.currentActions.shift();
          this.selectNextUnitAndGetIndex();
          break;
      }
    }
  }

  private updateDoAttackApplyDamageAndCounter(currentAction: BattleAction): boolean {
    let counterattacking = false;
    if (currentAction.path.length <= 0) return counterattacking;

    const originalTargetCoords = currentAction.path[0];
    let attacker = this.creatures[this.activeCreatureIndex];
    if (!attacker) return counterattacking;

    // Deduct stamina for attack
    const attackStamina = currentAction.type === BattleActionType.ATTACK_MELEE
      ? this.combatConfig.stamina.actionCosts.meleeAttack
      : this.combatConfig.stamina.actionCosts.rangedAttack;
    attacker.consumeStamina(attackStamina);
    this.totalStaminaSpent[attacker.armyAlignment] += attackStamina;

    // Ranged attack with per-projectile hit/scatter and proportional damage
    if (currentAction.type === BattleActionType.ATTACK_RANGED) {
      attacker.stats.remaining_ammo = Math.max(0, attacker.stats.remaining_ammo - 1);

      const totalArrows = Math.max(1, attacker.aliveModelCount);
      const intendedHitInBattle = this.getCreatureAtPosition(originalTargetCoords);
      const intendedTarget = intendedHitInBattle?.creature ?? null;
      const projectiles: RangedProjectileData[] = [];
      const targetHitCounts = new Map<Creature, number>();

      for (let i = 0; i < totalArrows; i++) {
        const isScattered = this.rng.chance(this.combatConfig.ranged.scatterChance);
        let targetCoords = originalTargetCoords;
        if (isScattered) {
          const neighbours = this.hexMap.getNeighbours(originalTargetCoords);
          if (neighbours.length > 0) {
            targetCoords = this.rng.choice(neighbours) ?? originalTargetCoords;
          }
        }

        const hitInBattle = this.getCreatureAtPosition(targetCoords);
        const hitCreature = hitInBattle?.creature ?? null;

        if (isScattered) {
          this.hookRangedScatter?.(attacker, originalTargetCoords, targetCoords, hitCreature);
          if (hitInBattle && hitInBattle.indexOFArmy === attacker.armyAlignment) {
            this.friendlyFireEvents++;
          }
        }

        projectiles.push({
          targetHex: targetCoords,
          hitCreature,
          isScatter: isScattered,
        });

        if (hitCreature) {
          targetHitCounts.set(hitCreature, (targetHitCounts.get(hitCreature) ?? 0) + 1);
        }
      }

      const totalBaseDamage = attacker.getRandomAttackDamageRanged(this.rng);
      const targetDamages: Array<{ target: Creature; damage: number; flankStatus: HexFlankStatus }> = [];

      for (const [defender, count] of targetHitCounts.entries()) {
        const proportion = count / totalArrows;
        const attackFromDir = reverseDirection(attacker.facingDirection);
        const flankStatus = checkFlankingStatus(defender.facingDirection, attackFromDir);
        let facingBonus = 0;
        if (flankStatus === HexFlankStatus.BACKSTAB) {
          facingBonus = this.combatConfig.facing.rear.damageBonus;
        } else if (flankStatus === HexFlankStatus.FLANK) {
          facingBonus = this.combatConfig.facing.flank.damageBonus;
        }
        const targetArmor = defender.live_stats.defense_ranged;
        let damage = Math.max(0, Math.round((totalBaseDamage + facingBonus - targetArmor) * proportion));

        targetDamages.push({ target: defender, damage, flankStatus });
        this.hookDoingAttack(attacker, defender, damage, BattleActionType.ATTACK_RANGED, flankStatus, false);
        const { modelsLost } = defender.takeDamage(damage);
        this.totalDamageDealt[attacker.armyAlignment] += damage;

        const casualtyThreshold = Math.max(1, Math.floor(defender.stats.model_count * this.combatConfig.morale.casualtyThresholdRatio));
        if (modelsLost >= casualtyThreshold || defender.stats.stamina <= 0) {
          this.checkMorale(defender, modelsLost);
        }
      }

      this.hookDoingAttackRanged?.({
        attacker,
        intendedTarget,
        intendedHex: originalTargetCoords,
        projectiles,
        targetDamages,
      });

      // Process casualties
      for (const { target: defender } of targetDamages) {
        if (!defender.isAlive) {
          this.casualties.push(defender);
          this.hookUnitDied(defender);
          const idx = this.creatures.findIndex((c) => c === defender);
          if (idx >= 0) this.creatures.splice(idx, 1);
          this.checkVictoryConditionsAndState();
          this.tryToSelectUnitAtLocation(attacker.pos);
        }
      }

      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      return false;
    }

    let targetCoords = originalTargetCoords;
    let hitCreatureInBattle = this.getCreatureAtPosition(targetCoords);

    if (hitCreatureInBattle === null) {
      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      return counterattacking;
    }

    let defender = hitCreatureInBattle.creature;
    this.applyAttackDamage(attacker, defender, currentAction.type);

    if (!defender.isAlive) {
      this.casualties.push(defender);
      this.hookUnitDied(defender);
      const idx = this.creatures.findIndex((c) => c === defender);
      if (idx >= 0) this.creatures.splice(idx, 1);
      this.checkVictoryConditionsAndState();
      this.tryToSelectUnitAtLocation(attacker.pos);
    } else {
      // Check retaliation eligibility for melee attacks
      const isAdjacent = this.hexMap.getNeighbours(attacker.pos).some((n) => n.x === defender.pos.x && n.y === defender.pos.y);
      const canRetaliate =
        isAdjacent &&
        currentAction.type === BattleActionType.ATTACK_MELEE &&
        defender.stats.stamina >= this.combatConfig.retaliation.minStamina &&
        defender.stats.retaliations_done < this.combatConfig.retaliation.maxRetaliationsPerTurn &&
        defender.live_stats.remaining_counterattacks > 0 &&
        !defender.isExhausted &&
        !defender.isPanickedOrRouting;

      if (canRetaliate) {
        counterattacking = this.queueCounterattack(defender, attacker);
      }
    }

    attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
    attacker.stats.remaining_movement = 0;
    return counterattacking;
  }

  private updateDoCounterAttack(currentAction: BattleAction) {
    if (!currentAction.sourceUnit || !currentAction.targetUnit) return;

    if (currentAction.step === 0) {
      if (currentAction.type === BattleActionType.COUNTER_ATTACK_MELEE) {
        const dir = this.hexMap.getDirectionForNeighbour(currentAction.sourceUnit.pos, currentAction.targetUnit.pos);
        if (dir !== HexDirection.NONE) currentAction.sourceUnit.facingDirection = dir;
        this.nextRenderUpdate.setUnitRenderUpdate();
      }

      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(AnimationType.ATTACK_MELEE, currentAction.targetUnit.pos);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      return;
    } else if (currentAction.step === 1) {
      this.updateDoCounterAttackApply(currentAction);
      this.currentActions.shift();
      this.nextRenderUpdate.setUnitRenderUpdate();
      currentAction.step++;
      this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
    }
  }

  private updateDoCounterAttackApply(currentAction: BattleAction) {
    if (!currentAction.sourceUnit || !currentAction.targetUnit) return;
    const defender = currentAction.sourceUnit;
    const attacker = currentAction.targetUnit;

    const retalStamina = this.combatConfig.stamina.actionCosts.retaliation;
    defender.consumeStamina(retalStamina);
    this.totalStaminaSpent[defender.armyAlignment] += retalStamina;

    const retalMult = getRetaliationDamageMultiplier(defender.stats.retaliations_done, this.combatConfig);
    defender.stats.retaliations_done++;
    defender.stats.remaining_counterattacks = Math.max(0, defender.stats.remaining_counterattacks - 1);

    this.applyAttackDamage(defender, attacker, BattleActionType.COUNTER_ATTACK_MELEE, retalMult);

    if (!attacker.isAlive) {
      const idx = this.creatures.findIndex((c) => c === attacker);
      if (idx >= 0) {
        this.casualties.push(this.creatures[idx]);
        this.hookUnitDied(this.creatures[idx]);
        this.creatures.splice(idx, 1);
        this.checkVictoryConditionsAndState();
      }
    }
  }

  private applyAttackDamage(
    source: Creature,
    target: Creature,
    attackType: BattleActionType,
    customMultiplier: number = 1.0
  ) {
    let baseDamage = 0;
    let targetArmor = 0;

    if (attackType === BattleActionType.ATTACK_MELEE || attackType === BattleActionType.COUNTER_ATTACK_MELEE) {
      baseDamage = source.getRandomAttackDamageMelee(this.rng);
      targetArmor = target.live_stats.defense_melee;
    } else {
      baseDamage = source.getRandomAttackDamageRanged(this.rng);
      targetArmor = target.live_stats.defense_ranged;
    }

    const attackFromDir = reverseDirection(source.facingDirection);
    let flankStatus = checkFlankingStatus(target.facingDirection, attackFromDir);
    let facingBonus = 0;

    if (flankStatus === HexFlankStatus.BACKSTAB) {
      facingBonus = this.combatConfig.facing.rear.damageBonus;
    } else if (flankStatus === HexFlankStatus.FLANK) {
      facingBonus = this.combatConfig.facing.flank.damageBonus;
    }

    let damage = Math.round((baseDamage + facingBonus - targetArmor) * customMultiplier);
    if (damage < 0) damage = 0;

    this.hookDoingAttack(source, target, damage, attackType, flankStatus, attackType === BattleActionType.COUNTER_ATTACK_MELEE);
    const { modelsLost } = target.takeDamage(damage);
    this.totalDamageDealt[source.armyAlignment] += damage;

    // Morale dynamics check on casualties / stamina exhaustion
    const casualtyThreshold = Math.max(1, Math.floor(target.stats.model_count * this.combatConfig.morale.casualtyThresholdRatio));
    if (modelsLost >= casualtyThreshold || target.stats.stamina <= 0) {
      this.checkMorale(target, modelsLost);
    }
  }

  private checkMorale(creature: Creature, modelsLost: number = 0): void {
    if (!creature.isAlive) return;

    let heroBonus = 0;
    const hasAdjacentHero = this.creatures.some(
      (c) =>
        c.armyAlignment === creature.armyAlignment &&
        c.stats.is_hero &&
        c !== creature &&
        this.hexMap.getNeighbours(creature.pos).some((n) => n.x === c.pos.x && n.y === c.pos.y)
    );
    if (hasAdjacentHero) {
      heroBonus = this.combatConfig.morale.heroAuraBonus;
    }

    const effectiveMorale = creature.stats.morale + heroBonus;
    const failRoll = this.rng.range(1, 30);

    if (failRoll > effectiveMorale) {
      const drop = Math.max(1, modelsLost > 0 ? modelsLost * 2 : 2);
      creature.consumeMorale(drop);
      const state = creature.stats.morale_state;
      if (state === MoraleState.PANICKED || state === MoraleState.ROUTING) {
        creature.stats.remaining_movement = 0;
        creature.stats.remaining_attacks = 0;
        this.moraleBreaks[creature.armyAlignment]++;
        this.hookMoraleBreak?.(creature, state);
      }
    }
  }

  public getBattleResult(): BattleResult {
    const victor = this.checkVictoryConditions();
    return {
      victorArmyIndex: victor,
      turnsTaken: this.turnNumber,
      survivingCreatures: [...this.creatures],
      casualties: [...this.casualties],
      totalDamageDealt: [...this.totalDamageDealt],
      totalStaminaSpent: [...this.totalStaminaSpent],
      moraleBreaks: [...this.moraleBreaks],
      friendlyFireEvents: this.friendlyFireEvents,
    };
  }

  private queueCounterattack(creatureCounterAttackFrom: Creature, creatureCounterAttackTo: Creature): boolean {
    this.currentActions.push(BattleAction.CounterAttack(creatureCounterAttackFrom, creatureCounterAttackTo));
    return true;
  }

  public selectActiveAbilityForCurrentUnit(abilityIndex: number) {
    let creature = this.creatures[this.activeCreatureIndex];
    if (!creature || abilityIndex >= creature.abilities.length) return;

    let ability = creature.abilities[abilityIndex];
    if (!this.verifyAbilityUseByCreatureHasResources(ability, creature)) return;

    if (ability.abilityType === AbilityType.Active && ability.requiresTarget) {
      this.showAbilityReachableCells(ability, creature);
      this.input_state = InputState.SELECT_ABILITY_TARGET;
      this.abilityToApply = ability;
    }
  }

  public showAbilityReachableCells(ability: Ability, owningCreature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    NumMatrix.resetToZero(this.ability_reach_tiles);
    NumMatrix.resetToZero(this.ability_reach_targets);

    let markUnitsInArmies: number[] = [];
    if (ability.allowedTargets.includes(AbilityTarget.Enemies)) {
      markUnitsInArmies.push(this.currentArmyIndex === 0 ? 1 : 0);
    }
    if (ability.allowedTargets.includes(AbilityTarget.Allies)) {
      markUnitsInArmies.push(this.currentArmyIndex);
    }

    BattleHexMapPath.cacheRangedReachableCells(
      this.hexMap,
      owningCreature.pos,
      ability.range,
      this.ability_reach_tiles,
      this.ability_reach_targets,
      { creatures: this.creatures },
      { markUnitsInArmies: markUnitsInArmies }
    );

    this.nextRenderUpdate.hoverPath = [];
    this.nextRenderUpdate.abilityReachableCells = true;
    this.nextRenderUpdate.reachableCells = true;
    this.nextRenderUpdate.somethingChanged = true;
    NumMatrix.resetToZero(this.pathfinding_tiles);
    return reachableCells;
  }

  public makeCreatureFaceTargetIfNeeded(creature: Creature, target: Coords) {
    const oneDirection = this.hexMap.getGeneralDirectionForTarget(creature.pos, target);
    if (creature.facingDirection !== oneDirection) {
      creature.facingDirection = oneDirection;
      this.nextRenderUpdate.setUnitRenderUpdate();
    }
  }

  public verifyAbilityUseByCreatureHasResources(ability: Ability, creature: Creature): boolean {
    for (let res of ability.resources) {
      switch (res.resource_used) {
        case AbilityResourceUse.Ammo:
          if (creature.live_stats.remaining_ammo < res.resource_cost) return false;
          break;
        case AbilityResourceUse.Attack:
          if (creature.live_stats.remaining_attacks < res.resource_cost) return false;
          break;
        case AbilityResourceUse.Stamina:
          if (creature.live_stats.stamina < res.resource_cost) return false;
          break;
        case AbilityResourceUse.None:
          return false;
      }
    }
    return true;
  }

  public deductCostForAbilityUseByCreature(ability: Ability, creature: Creature) {
    for (let res of ability.resources) {
      switch (res.resource_used) {
        case AbilityResourceUse.Ammo:
          creature.stats.remaining_ammo -= res.resource_cost;
          break;
        case AbilityResourceUse.Attack:
          creature.stats.remaining_attacks -= res.resource_cost;
          break;
        case AbilityResourceUse.Stamina:
          creature.consumeStamina(res.resource_cost);
          this.totalStaminaSpent[creature.armyAlignment] += res.resource_cost;
          break;
      }
    }
  }

  public tryToApplyAbilityWithActiveCreatureAtLocation(coords: Coords, _optionalDirection: HexDirection) {
    if (this.activeCreatureIndex < 0) return;
    if (this.ability_reach_tiles[coords.x]?.[coords.y] <= 0 && this.ability_reach_targets[coords.x]?.[coords.y] <= 0) return;

    let creatureAtTarget = this.getCreatureAtPosition(coords);
    if (creatureAtTarget === null) return;

    this.currentActions.push(new BattleAction(BattleActionType.TARGET_ABILITY, [coords], 0, 500, 50));
  }

  private updateDoApplyAbility(currentAction: BattleAction) {
    if (currentAction.step === 0) {
      this.makeCreatureFaceTargetIfNeeded(this.creatures[this.activeCreatureIndex], currentAction.path[0]);
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(AnimationType.ATTACK_RANGED, currentAction.path[0]);
      this.nextRenderUpdate.somethingChanged = true;
      currentAction.step++;
      currentAction.remainingTime = currentAction.stepDuration;
      return;
    } else if (currentAction.step === 1) {
      this.updateDoApplyAbilityEffect(currentAction);
      this.currentActions.shift();
      this.nextRenderUpdate.setUnitRenderUpdate();
      currentAction.step++;
      this.input_state = InputState.SELECT_UNIT_OR_TARGET;
      this.abilityToApply = null;
      this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
    }
  }

  private updateDoApplyAbilityEffect(currentAction: BattleAction) {
    if (currentAction.path.length <= 0) return;
    const target = currentAction.path[0];
    let creatureInBattle = this.getCreatureAtPosition(target);
    if (creatureInBattle === null) return;

    let thisCreature = this.creatures[this.activeCreatureIndex];
    this.applyAbilityEffect(thisCreature, creatureInBattle.creature, currentAction.type);

    if (!creatureInBattle.creature.isAlive) {
      this.casualties.push(creatureInBattle.creature);
      this.hookUnitDied(creatureInBattle.creature);
      this.creatures.splice(creatureInBattle.indexInArmy, 1);
      this.checkVictoryConditionsAndState();
      this.tryToSelectUnitAtLocation(thisCreature.pos);
    }
    thisCreature.stats.remaining_movement = 0;
  }

  private applyAbilityEffect(source: Creature, target: Creature, attackType: BattleActionType) {
    if (attackType !== BattleActionType.TARGET_ABILITY || !this.abilityToApply) return;

    let sourceDamage = this.rng.range(this.abilityToApply.damage_low, this.abilityToApply.damage_high);
    let targetArmor = 0;
    let flankStatus = HexFlankStatus.NONE;
    let damage = Math.max(0, sourceDamage - targetArmor);

    this.hookDoingAttack(source, target, damage, BattleActionType.ATTACK_RANGED, flankStatus);
    target.takeDamage(damage);
    source.stats.remaining_attacks = Math.max(0, source.stats.remaining_attacks - 1);
    this.deductCostForAbilityUseByCreature(this.abilityToApply, source);
  }

  public start() {
    for (const creature of this.creatures) {
      if (creature.stats.retaliations_done === undefined) {
        creature.stats.retaliations_done = 0;
      }
      if (creature.stats.remaining_counterattacks === undefined) {
        creature.stats.remaining_counterattacks = creature.stats.num_counterattacks ?? 1;
      }
      if (creature.stats.remaining_attacks === undefined) {
        creature.stats.remaining_attacks = creature.stats.num_attacks ?? 1;
      }
      if (creature.stats.remaining_movement === undefined) {
        creature.stats.remaining_movement = creature.stats.num_moves ?? 3;
      }
      creature.updateExhaustionState();
    }
    this.recomputeAllPositionBuffs();
  }

  public recomputeAllPositionBuffs() {
    this.creatures.forEach((creature) => {
      this.clearPositionBuffs(creature);
      this.setPositionBuffs(creature, creature.pos);
    });
  }

  private clearPositionBuffs(creature: Creature) {
    creature.buffs = creature.buffs.filter((buff) => buff.source !== "terrain");
  }

  private setPositionBuffs(creature: Creature, position: Coords) {
    const terrainType = this.getTerrainAt(position);
    const buffData = this.combatConfig.terrain.buffs[terrainType];
    if (buffData) {
      const stats: CreatureStats = { ...CreatureStats.EMPTY };
      if (buffData.defense_melee) stats.defense_melee = buffData.defense_melee;
      if (buffData.defense_ranged) stats.defense_ranged = buffData.defense_ranged;
      if (buffData.attack_melee_low) stats.attack_melee_low = buffData.attack_melee_low;
      if (buffData.attack_melee_high) stats.attack_melee_high = buffData.attack_melee_high;
      if (buffData.attack_ranged_low) stats.attack_ranged_low = buffData.attack_ranged_low;
      if (buffData.attack_ranged_high) stats.attack_ranged_high = buffData.attack_ranged_high;
      if (buffData.range) stats.range = buffData.range;
      creature.buffs.push(new Buff(stats, "terrain"));
    }
  }

  private tryToSelectUnitAtLocation(coords: Coords) {
    let creatureInBattle = this.getCreatureAtPosition(coords);
    if (creatureInBattle === null) return;
    if (this.currentArmyIndex === creatureInBattle.indexOFArmy) {
      this.setSelectedArmyAndCreatureIndex(creatureInBattle.indexOFArmy, creatureInBattle.indexInArmy);
      this.showReachableCellsForCreature(creatureInBattle.creature);
    }
  }

  private getMovementCostForPath(path: Coords[], creature: Creature, terrainMoveCost: Record<number, number>): number {
    const startIndex = (path.length > 1 && path[0].x === creature.position.x && path[0].y === creature.position.y) ? 1 : 0;
    if (creature?.isFlying) {
      return Math.max(0, path.length - startIndex);
    }
    let cost = 0;
    for (let i = startIndex; i < path.length; i++) {
      const terrain = this.getTerrainAt(path[i]);
      cost += terrainMoveCost[terrain] ?? 1;
    }
    return cost;
  }

  private getStaminaCostForPath(path: Coords[], _creature: Creature): number {
    const startIndex = (path.length > 1 && path[0].x === _creature.position.x && path[0].y === _creature.position.y) ? 1 : 0;
    let stamina = 0;
    for (let i = startIndex; i < path.length; i++) {
      const terrain = this.getTerrainAt(path[i]);
      stamina += this.getStaminaCostForTerrain(terrain);
    }
    return stamina;
  }

  // Hook callbacks
  hookDoingAttack(_attacker: Creature, _defender: Creature, _damage: number, _type: BattleActionType, _flank: HexFlankStatus, _isRetaliation?: boolean) {}
  hookDoingAttackRanged?(_data: RangedAttackData) {}
  hookNextTurn(_turnNumber: number, _armyIndex: number) {}
  hookMovingUnit(_creature: Creature, _nextStep: Coords) {}
  hookUnitDied(_creature: Creature) {}
  hookBattleFinished(_victor: number) {}
  hookRecommendEndTurn(_armyIndex: number) {}
  hookActiveUnitChanged(_creature: Creature) {}
  hookRangedScatter(_attacker: Creature, _orig: Coords, _scatter: Coords, _hit: Creature | null) {}
  hookMoraleBreak(_creature: Creature, _state: MoraleState) {}
}
