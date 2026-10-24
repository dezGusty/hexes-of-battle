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
import { calculateDamageWithTraits, DEFAULT_TRAITS_CONFIG, TraitsConfig } from "./battle/trait-system";

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
  hookUnitChangedFacing?: (creature: Creature, direction: HexDirection) => void;
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
  public input_state: InputState = InputState.SELECT_UNIT_OR_TARGET;
  public abilityToApply: Ability | null = null;
  private lastAbilityTargetCanceledTimestamp: number = 0;

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

  public get traitsConfig(): TraitsConfig {
    return this.combatConfig.traits ?? DEFAULT_TRAITS_CONFIG;
  }

  public setTraitsConfig(config: Partial<TraitsConfig>): void {
    this.combatConfig.traits = {
      ...(this.combatConfig.traits ?? DEFAULT_TRAITS_CONFIG),
      ...config,
    };
  }

  public setCombatConfig(config: CombatConfig): void {
    this.combatConfig = config;
    this.creatures?.forEach((c) => {
      c.combatConfig = config;
      c.updateMoraleState();
    });
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
      c.combatConfig = this.combatConfig;
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
    this.hookUnitChangedFacing?.(this.creatures[creatureIndex], direction);
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
            creature.stats.has_attacked = true;
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
    creature.stats.has_attacked = true;
  }

  public handlePrimaryCellAction(coords: Coords, optionalDirection: HexDirection = HexDirection.NONE): boolean {
    if (this.hasRunningActions()) return false;
    if (this.army_control[this.currentArmyIndex] === ArmyControlType.AI) return false;

    if (this.input_state === InputState.SELECT_ABILITY_TARGET) {
      return this.selectTargetForAbility(coords, optionalDirection);
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

    if (Date.now() - this.lastAbilityTargetCanceledTimestamp < 400) {
      this.lastAbilityTargetCanceledTimestamp = 0;
      return true;
    }

    const activeCreature = this.getActiveCreature();
    if (
      activeCreature &&
      activeCreature.isAlive &&
      activeCreature.armyAlignment === this.currentArmyIndex &&
      coords.x === activeCreature.position.x &&
      coords.y === activeCreature.position.y
    ) {
      if (
        optionalDirection !== HexDirection.NONE &&
        !activeCreature.hasAttackedThisTurn() &&
        activeCreature.live_stats.remaining_attacks > 0
      ) {
        return this.setCreatureFacing(this.activeCreatureIndex, optionalDirection);
      }
      return false;
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
    return this.tryToApplyAbilityWithActiveCreatureAtLocation(coords, optionalDirection);
  }

  public cancelTargetForAbilityIfApplicable(): boolean {
    if (this.input_state != InputState.SELECT_ABILITY_TARGET) {
      return false;
    }
    this.lastAbilityTargetCanceledTimestamp = Date.now();
    this.input_state = InputState.SELECT_UNIT_OR_TARGET;
    this.abilityToApply = null;
    this.reselectCurrentUnit();
    this.nextRenderUpdate.somethingChanged = true;
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

    if (this.input_state === InputState.SELECT_ABILITY_TARGET) {
      this.nextRenderUpdate.hoverPath = [];
      this.currentHoverPath = [];
      this.nextRenderUpdate.hoverEnemyIndex = -1;
      this.nextRenderUpdate.hoverOverUnitIndex = -1;
      if (
        this.abilityToApply &&
        this.isTargetAllowedForAbility(this.abilityToApply, activeCreature, coords)
      ) {
        this.nextRenderUpdate.setCursorHint("attack_ranged");
      } else {
        this.nextRenderUpdate.setCursorHint("default");
      }
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

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

    if (
      activeCreature.live_stats.remaining_attacks <= 0 ||
      activeCreature.exhaustionState === ExhaustionState.DEPLETED ||
      activeCreature.isPanickedOrRouting
    ) {
      this.nextRenderUpdate.setCursorHint("default");
      return;
    }

    const remainingAmmo = activeCreature.live_stats.remaining_ammo ?? activeCreature.stats.remaining_ammo ?? 0;
    if (activeCreature.live_stats.is_ranged && remainingAmmo > 0 && !meleePreference) {
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
      } else {
        this.nextRenderUpdate.setCursorHint("default");
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }
    }

    let neighbour = this.hexMap.getNeighbourInDirection(coords, optionalDirection);
    if (!neighbour) {
      const target = this.unitReachData.find((e) => e.coords.x === coords.x && e.coords.y === coords.y);
      if (target) {
        this.nextRenderUpdate.setCursorHint("attack_melee");
        this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
        this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
      } else {
        this.nextRenderUpdate.setCursorHint("default");
      }
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    const neighbourInUnitReachData = this.unitReachData.find((e) => e.coords.x === neighbour!.x && e.coords.y === neighbour!.y);
    if (!neighbourInUnitReachData) {
      if (neighbour.x === activeCreature.position.x && neighbour.y === activeCreature.position.y) {
        this.nextRenderUpdate.setCursorHint("attack_melee");
        this.nextRenderUpdate.hoverPath = [activeCreature.position];
        this.currentHoverPath = [activeCreature.position];
        this.nextRenderUpdate.somethingChanged = true;
        return;
      }
      const target = this.unitReachData.find((e) => e.coords.x === coords.x && e.coords.y === coords.y);
      if (target) {
        this.nextRenderUpdate.setCursorHint("attack_melee");
        this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(coords);
        this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
      } else {
        this.nextRenderUpdate.setCursorHint("default");
      }
      return;
    }

    if (this.getCreatureAtPosition(neighbour)) {
      const target = this.unitReachData.find((e) => e.coords.x === coords.x && e.coords.y === coords.y);
      if (target) {
        this.nextRenderUpdate.setCursorHint("attack_melee");
      } else {
        this.nextRenderUpdate.setCursorHint("default");
      }
      return;
    }

    this.nextRenderUpdate.hoverPath = this.findPathFromSelectedUnitToCell(neighbour);
    this.currentHoverPath = [...this.nextRenderUpdate.hoverPath];
    this.nextRenderUpdate.setCursorHint("attack_melee");
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

    // Reset units for the army whose turn is now starting, and reset turn-based perks for all units
    for (let i = 0; i < this.creatures.length; i++) {
      this.creatures[i].stats.shield_block_used = false;
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
    const attacker = currentAction.sourceUnit ?? this.creatures[this.activeCreatureIndex];
    const isQuickDraw = currentAction.type === BattleActionType.ATTACK_RANGED &&
      attacker?.isQuickDrawActive &&
      this.canCreatureUseQuickDraw(attacker);

    if (isQuickDraw) {
      this.updateDoQuickDrawAttack(currentAction);
      return;
    }

    if (currentAction.step === 0) {
      if (currentAction.type === BattleActionType.ATTACK_MELEE) {
        const oneDirection = this.hexMap.getDirectionForNeighbour(attacker.pos, currentAction.path[0]);
        attacker.facingDirection = oneDirection;
        this.nextRenderUpdate.setUnitRenderUpdate();
      } else {
        this.makeCreatureFaceTargetIfNeeded(attacker, currentAction.path[0]);
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
          const targetAbility = currentAction.ability ?? this.abilityToApply;
          if (this.isQuickDrawAbility(targetAbility)) {
            this.completeQuickDrawInstant(currentAction);
          } else {
            this.updateDoApplyAbilityEffect(currentAction);
          }
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

    // Check for Quick Draw attack
    const isQuickDraw = currentAction.type === BattleActionType.ATTACK_RANGED && attacker.isQuickDrawActive && this.canCreatureUseQuickDraw(attacker);
    if (isQuickDraw) {
      this.executeQuickDrawAttack(attacker, originalTargetCoords);
      return false;
    }

    // Deduct stamina for attack
    const attackStamina = currentAction.type === BattleActionType.ATTACK_MELEE
      ? this.combatConfig.stamina.actionCosts.meleeAttack
      : this.combatConfig.stamina.actionCosts.rangedAttack;
    attacker.consumeStamina(attackStamina);
    this.totalStaminaSpent[attacker.armyAlignment] += attackStamina;

    // Ranged attack with per-projectile hit/scatter and proportional damage
    if (currentAction.type === BattleActionType.ATTACK_RANGED) {
      this.executeSingleRangedAttackVolley(attacker, originalTargetCoords);
      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      attacker.stats.has_attacked = true;
      return false;
    }

    let targetCoords = originalTargetCoords;
    let hitCreatureInBattle = this.getCreatureAtPosition(targetCoords);

    if (hitCreatureInBattle === null) {
      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      attacker.stats.has_attacked = true;
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
    attacker.stats.has_attacked = true;
    return counterattacking;
  }

  public executeSingleRangedAttackVolley(attacker: Creature, originalTargetCoords: Coords): {
    totalDamage: number;
    targetDamages: Array<{ target: Creature; damage: number; flankStatus: HexFlankStatus }>;
  } {
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
    let volleyTotalDamage = 0;

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
      const traitResult = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: totalBaseDamage,
        facingBonus,
        targetArmor,
        attackFromDir,
        flankStatus,
        customMultiplier: proportion,
        traitsConfig: this.traitsConfig,
        commit: true,
      });
      const damage = traitResult.damage;
      volleyTotalDamage += damage;

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

    return { totalDamage: volleyTotalDamage, targetDamages };
  }

  public isQuickDrawAbility(ability?: Ability | null): boolean {
    if (!ability) return false;
    const id = ability.id?.toLowerCase() ?? "";
    const name = ability.name?.toLowerCase() ?? "";
    return (
      id === "quick-draw-01" ||
      id === "quick-draw" ||
      id === "dbl-strike-01" ||
      name.includes("quick-draw") ||
      name.includes("quick draw")
    );
  }

  public isThrowJavelinAbility(ability?: Ability | null): boolean {
    if (!ability) return false;
    const id = ability.id?.toLowerCase() ?? "";
    const name = ability.name?.toLowerCase() ?? "";
    return (
      id === "jav-01" ||
      id === "throw-javelin" ||
      name.includes("throw-javelin") ||
      name.includes("throw javelin") ||
      name.includes("javelin")
    );
  }

  public getQuickDrawStaminaCost(): number {
    const attackStamina = this.combatConfig?.stamina?.actionCosts?.rangedAttack ?? 2;
    return attackStamina * 2 + 2;
  }

  public canCreatureUseQuickDraw(creature: Creature): boolean {
    if (!creature || !creature.isAlive) return false;
    if (!creature.hasQuickDrawAbility()) return false;
    if (creature.isPanickedOrRouting || creature.exhaustionState === ExhaustionState.DEPLETED) return false;
    if (creature.live_stats.remaining_attacks <= 0) return false;
    if (creature.live_stats.remaining_ammo < 2) return false;
    return creature.live_stats.stamina >= this.getQuickDrawStaminaCost();
  }

  public executeQuickDrawAttack(attacker: Creature, targetCoords: Coords): boolean {
    if (!this.canCreatureUseQuickDraw(attacker)) return false;

    // Quick draw uses the same range as the regular attack
    const distance = HexMap.getHexDistance(attacker.pos, targetCoords);
    if (distance > attacker.live_stats.range) {
      return false;
    }

    const totalStamina = this.getQuickDrawStaminaCost();
    attacker.consumeStamina(totalStamina);
    this.totalStaminaSpent[attacker.armyAlignment] += totalStamina;

    this.makeCreatureFaceTargetIfNeeded(attacker, targetCoords);

    // First shot
    this.executeSingleRangedAttackVolley(attacker, targetCoords);

    // Second shot in the same turn while attacking target
    if (!this.finished && attacker.isAlive) {
      const defender = this.getCreatureAtPosition(targetCoords)?.creature;
      if (defender && defender.isAlive) {
        this.executeSingleRangedAttackVolley(attacker, targetCoords);
      }
    }

    attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
    attacker.stats.remaining_movement = 0;
    attacker.stats.has_attacked = true;
    attacker.isQuickDrawActive = false;
    this.nextRenderUpdate.setUnitRenderUpdate();
    return true;
  }

  private completeQuickDrawInstant(currentAction: BattleAction): void {
    const attacker = currentAction.sourceUnit ?? this.creatures[this.activeCreatureIndex];
    if (!attacker || currentAction.path.length <= 0) return;
    const targetCoords = currentAction.path[0];

    if (currentAction.step === 0) {
      this.executeQuickDrawAttack(attacker, targetCoords);
    } else if (currentAction.step === 1) {
      const defender = this.getCreatureAtPosition(targetCoords)?.creature;
      if (defender && defender.isAlive && attacker.isAlive && !this.finished) {
        this.executeSingleRangedAttackVolley(attacker, targetCoords);
      }
      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      attacker.stats.has_attacked = true;
      attacker.isQuickDrawActive = false;
    } else {
      attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
      attacker.stats.remaining_movement = 0;
      attacker.stats.has_attacked = true;
      attacker.isQuickDrawActive = false;
    }
    this.abilityToApply = null;
    this.input_state = InputState.SELECT_UNIT_OR_TARGET;
    this.nextRenderUpdate.setUnitRenderUpdate();
  }

  private updateDoQuickDrawAttack(currentAction: BattleAction) {
    if (currentAction.path.length <= 0) {
      this.currentActions.shift();
      this.abilityToApply = null;
      this.input_state = InputState.SELECT_UNIT_OR_TARGET;
      return;
    }

    const targetCoords = currentAction.path[0];
    const attacker = currentAction.sourceUnit ?? this.creatures[this.activeCreatureIndex];
    if (!attacker) {
      this.currentActions.shift();
      this.abilityToApply = null;
      this.input_state = InputState.SELECT_UNIT_OR_TARGET;
      return;
    }

    if (currentAction.step === 0) {
      if (!this.canCreatureUseQuickDraw(attacker)) {
        this.currentActions.shift();
        this.abilityToApply = null;
        this.input_state = InputState.SELECT_UNIT_OR_TARGET;
        return;
      }

      this.makeCreatureFaceTargetIfNeeded(attacker, targetCoords);

      // Deduct stamina cost upfront
      const totalStamina = this.getQuickDrawStaminaCost();
      attacker.consumeStamina(totalStamina);
      this.totalStaminaSpent[attacker.armyAlignment] += totalStamina;

      // Volley 1: 2D animation, 3D projectiles/sound via hook, and damage calculation
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(AnimationType.ATTACK_RANGED, targetCoords);
      this.nextRenderUpdate.somethingChanged = true;
      this.executeSingleRangedAttackVolley(attacker, targetCoords);

      currentAction.step = 1;
      currentAction.remainingTime = 650;
      return;
    } else if (currentAction.step === 1) {
      // Check if target is still alive and battle continues
      const defender = this.getCreatureAtPosition(targetCoords)?.creature;
      if (!defender || !defender.isAlive || !attacker.isAlive || this.finished) {
        // Target was eliminated by Volley 1 or battle finished
        if (attacker && attacker.isAlive) {
          attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
          attacker.stats.remaining_movement = 0;
          attacker.stats.has_attacked = true;
          attacker.isQuickDrawActive = false;
        }
        this.currentActions.shift();
        this.nextRenderUpdate.setUnitRenderUpdate();
        this.abilityToApply = null;
        this.input_state = InputState.SELECT_UNIT_OR_TARGET;
        this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
        return;
      }

      // Volley 2: 2D animation, 3D projectiles/sound via hook, and damage calculation
      this.nextRenderUpdate.animationAtCoords = new AnimationAtCoords(AnimationType.ATTACK_RANGED, targetCoords);
      this.nextRenderUpdate.somethingChanged = true;
      this.executeSingleRangedAttackVolley(attacker, targetCoords);

      currentAction.step = 2;
      currentAction.remainingTime = 650;
      return;
    } else if (currentAction.step === 2) {
      // Both volleys completed
      if (attacker && attacker.isAlive) {
        attacker.stats.remaining_attacks = Math.max(0, attacker.stats.remaining_attacks - 1);
        attacker.stats.remaining_movement = 0;
        attacker.stats.has_attacked = true;
        attacker.isQuickDrawActive = false;
      }
      this.currentActions.shift();
      this.nextRenderUpdate.setUnitRenderUpdate();
      this.abilityToApply = null;
      this.input_state = InputState.SELECT_UNIT_OR_TARGET;
      this.currentActions.push(new BattleAction(BattleActionType.SELECT_NEXT, [], 0, 500, 50));
    }
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

    const traitResult = calculateDamageWithTraits({
      attacker: source,
      defender: target,
      attackType,
      baseDamage,
      facingBonus,
      targetArmor,
      attackFromDir,
      flankStatus,
      customMultiplier,
      traitsConfig: this.traitsConfig,
      commit: true,
    });
    let damage = traitResult.damage;

    this.hookDoingAttack(source, target, damage, attackType, flankStatus, attackType === BattleActionType.COUNTER_ATTACK_MELEE);
    const { modelsLost } = target.takeDamage(damage);
    this.totalDamageDealt[source.armyAlignment] += damage;

    // Check if target panicked or routing from FragileLine or taken damage
    if (target.isPanickedOrRouting && (target.stats.remaining_movement > 0 || target.stats.remaining_attacks > 0)) {
      target.stats.remaining_movement = 0;
      target.stats.remaining_attacks = 0;
      this.moraleBreaks[target.armyAlignment]++;
      this.hookMoraleBreak?.(target, target.stats.morale_state);
    }

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
      const fragileLoss = creature.hasTrait("FragileLine") ? (this.traitsConfig.fragileLine.extraMoraleLoss || 0) : 0;
      const drop = Math.max(1, modelsLost > 0 ? modelsLost * 2 : 2) + fragileLoss;
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

  public selectActiveAbilityForCurrentUnit(abilityIndex: number, targetCreature?: Creature) {
    if (targetCreature) {
      const idx = this.creatures.findIndex((c) => c === targetCreature || c.GUID.equals(targetCreature.GUID));
      if (idx !== -1 && idx !== this.activeCreatureIndex) {
        this.setSelectedArmyAndCreatureIndex(this.creatures[idx].armyAlignment, idx);
      }
    }

    let creature = this.creatures[this.activeCreatureIndex];
    if (!creature && targetCreature) {
      creature = targetCreature;
    }
    if (!creature || abilityIndex >= creature.abilities.length) return;

    let ability = creature.abilities[abilityIndex];
    if (!this.verifyAbilityUseByCreatureHasResources(ability, creature)) return;

    if (this.input_state === InputState.SELECT_ABILITY_TARGET && this.abilityToApply === ability) {
      this.cancelTargetForAbilityIfApplicable();
      return;
    }

    if (this.isQuickDrawAbility(ability)) {
      if (!this.canCreatureUseQuickDraw(creature)) return;
      ability.requiresTarget = true;
      ability.abilityType = AbilityType.Active;
      this.showAbilityReachableCells(ability, creature);
      this.input_state = InputState.SELECT_ABILITY_TARGET;
      this.abilityToApply = ability;
      this.nextRenderUpdate.somethingChanged = true;
      return;
    }

    if (ability.abilityType === AbilityType.Active && ability.requiresTarget) {
      this.showAbilityReachableCells(ability, creature);
      this.input_state = InputState.SELECT_ABILITY_TARGET;
      this.abilityToApply = ability;
      this.nextRenderUpdate.somethingChanged = true;
    } else if (ability.abilityType === AbilityType.Toggle) {
      creature.isQuickDrawActive = !creature.isQuickDrawActive;
      this.nextRenderUpdate.somethingChanged = true;
    }
  }

  public getAbilityRange(ability: Ability, owningCreature: Creature): number {
    if (this.isQuickDrawAbility(ability)) {
      return owningCreature.live_stats.range;
    }
    return ability.range > 0 ? ability.range : owningCreature.live_stats.range;
  }

  public showAbilityReachableCells(ability: Ability, owningCreature: Creature): Coords[] {
    let reachableCells: Coords[] = [];
    NumMatrix.resetToZero(this.ability_reach_tiles);
    NumMatrix.resetToZero(this.ability_reach_targets);

    let markUnitsInArmies: number[] = [];
    if (ability.allowedTargets.includes(AbilityTarget.Enemies)) {
      markUnitsInArmies.push(this.currentArmyIndex === 0 ? 1 : 0);
    }
    if (ability.allowedTargets.includes(AbilityTarget.Allies) || ability.allowedTargets.includes(AbilityTarget.Self)) {
      markUnitsInArmies.push(this.currentArmyIndex);
    }

    const effectiveRange = this.getAbilityRange(ability, owningCreature);
    BattleHexMapPath.cacheRangedReachableCells(
      this.hexMap,
      owningCreature.pos,
      effectiveRange,
      this.ability_reach_tiles,
      this.ability_reach_targets,
      { creatures: this.creatures },
      { markUnitsInArmies: markUnitsInArmies }
    );

    // If Self is not allowed, clear owning creature from target matrix
    if (!ability.allowedTargets.includes(AbilityTarget.Self)) {
      if (
        owningCreature.pos.x >= 0 &&
        owningCreature.pos.x < this.hexMap.width &&
        owningCreature.pos.y >= 0 &&
        owningCreature.pos.y < this.hexMap.height
      ) {
        this.ability_reach_targets[owningCreature.pos.x][owningCreature.pos.y] = 0;
      }
    }

    // If Allies is not allowed (but Self is), clear other allies from target matrix
    if (!ability.allowedTargets.includes(AbilityTarget.Allies)) {
      for (const c of this.creatures) {
        if (c.armyAlignment === this.currentArmyIndex && c.GUID !== owningCreature.GUID) {
          if (c.pos.x >= 0 && c.pos.x < this.hexMap.width && c.pos.y >= 0 && c.pos.y < this.hexMap.height) {
            this.ability_reach_targets[c.pos.x][c.pos.y] = 0;
          }
        }
      }
    }

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
    if (this.isQuickDrawAbility(ability)) {
      return this.canCreatureUseQuickDraw(creature);
    }

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
          creature.stats.has_attacked = true;
          break;
        case AbilityResourceUse.Stamina:
          creature.consumeStamina(res.resource_cost);
          this.totalStaminaSpent[creature.armyAlignment] += res.resource_cost;
          break;
      }
    }
  }

  public isTargetAllowedForAbility(ability: Ability, sourceCreature: Creature, targetCoords: Coords): boolean {
    if (!ability || !sourceCreature) return false;

    if (
      targetCoords.x < 0 ||
      targetCoords.x >= this.hexMap.width ||
      targetCoords.y < 0 ||
      targetCoords.y >= this.hexMap.height
    ) {
      return false;
    }

    const inReach =
      (this.ability_reach_tiles[targetCoords.x]?.[targetCoords.y] ?? 0) > 0 ||
      (this.ability_reach_targets[targetCoords.x]?.[targetCoords.y] ?? 0) > 0;
    if (!inReach) return false;

    const targetCreatureEntry = this.getCreatureAtPosition(targetCoords);

    if (targetCreatureEntry) {
      const targetCreature = targetCreatureEntry.creature;
      if (!targetCreature.isAlive) return false;

      const isSelf = targetCreature.GUID === sourceCreature.GUID;
      const isAlly = targetCreature.armyAlignment === sourceCreature.armyAlignment && !isSelf;
      const isEnemy = targetCreature.armyAlignment !== sourceCreature.armyAlignment;

      if (isSelf) {
        return ability.allowedTargets.includes(AbilityTarget.Self);
      }
      if (isAlly) {
        return ability.allowedTargets.includes(AbilityTarget.Allies);
      }
      if (isEnemy) {
        return ability.allowedTargets.includes(AbilityTarget.Enemies);
      }
      return false;
    } else {
      if (ability.requiresTarget) {
        return ability.allowedTargets.includes(AbilityTarget.Terrain);
      }
      return (
        ability.allowedTargets.includes(AbilityTarget.Terrain) ||
        ability.allowedTargets.includes(AbilityTarget.None)
      );
    }
  }

  public tryToApplyAbilityWithActiveCreatureAtLocation(coords: Coords, _optionalDirection: HexDirection): boolean {
    if (this.activeCreatureIndex < 0) return false;
    const activeCreature = this.creatures[this.activeCreatureIndex];
    if (!activeCreature || !this.abilityToApply) return false;

    if (!this.isTargetAllowedForAbility(this.abilityToApply, activeCreature, coords)) {
      return false;
    }

    const targetCreature = this.getCreatureAtPosition(coords)?.creature;
    this.currentActions.push(new BattleAction(BattleActionType.TARGET_ABILITY, [coords], 0, 500, 50, activeCreature, targetCreature, this.abilityToApply));
    return true;
  }

  private updateDoApplyAbility(currentAction: BattleAction) {
    const ability = currentAction.ability ?? this.abilityToApply;
    if (this.isQuickDrawAbility(ability)) {
      this.updateDoQuickDrawAttack(currentAction);
      return;
    }

    if (currentAction.step === 0) {
      const attacker = currentAction.sourceUnit ?? this.creatures[this.activeCreatureIndex];
      if (attacker) {
        this.makeCreatureFaceTargetIfNeeded(attacker, currentAction.path[0]);
      }
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

    let thisCreature = currentAction.sourceUnit ?? this.creatures[this.activeCreatureIndex];
    const ability = currentAction.ability ?? this.abilityToApply;
    this.applyAbilityEffect(thisCreature, creatureInBattle.creature, currentAction.type, ability);

    if (!creatureInBattle.creature.isAlive && this.creatures.includes(creatureInBattle.creature)) {
      this.casualties.push(creatureInBattle.creature);
      this.hookUnitDied(creatureInBattle.creature);
      const idx = this.creatures.findIndex((c) => c === creatureInBattle.creature);
      if (idx >= 0) this.creatures.splice(idx, 1);
      this.checkVictoryConditionsAndState();
      this.tryToSelectUnitAtLocation(thisCreature.pos);
    }
    thisCreature.stats.remaining_movement = 0;
  }

  private applyAbilityEffect(
    source: Creature,
    target: Creature,
    attackType: BattleActionType,
    abilityToUse?: Ability | null
  ) {
    const ability = abilityToUse ?? this.abilityToApply;
    if (attackType !== BattleActionType.TARGET_ABILITY || !ability) return;

    if (this.isQuickDrawAbility(ability)) {
      this.executeQuickDrawAttack(source, target.pos);
      return;
    }

    let sourceDamage = this.rng.range(ability.damage_low ?? 8, ability.damage_high ?? 10);
    let targetArmor = 0;
    this.makeCreatureFaceTargetIfNeeded(source, target.pos);
    const attackFromDir = reverseDirection(source.facingDirection);
    const flankStatus = checkFlankingStatus(target.facingDirection, attackFromDir);
    let damage = Math.max(0, sourceDamage - targetArmor);

    const { modelsLost } = target.takeDamage(damage);
    if (this.totalDamageDealt && source.armyAlignment in this.totalDamageDealt) {
      this.totalDamageDealt[source.armyAlignment] += damage;
    }
    const casualtyThreshold = Math.max(1, Math.floor(target.stats.model_count * this.combatConfig.morale.casualtyThresholdRatio));
    if (modelsLost >= casualtyThreshold || target.stats.stamina <= 0) {
      this.checkMorale(target, modelsLost);
    }

    this.hookDoingAttack(source, target, damage, BattleActionType.ATTACK_RANGED, flankStatus, false);

    const projectileCount = Math.max(1, Math.min(3, source.aliveModelCount));
    const projectiles: RangedProjectileData[] = Array.from({ length: projectileCount }, () => ({
      targetHex: target.pos,
      hitCreature: target,
      isScatter: false,
    }));

    this.hookDoingAttackRanged?.({
      attacker: source,
      intendedTarget: target,
      intendedHex: target.pos,
      projectiles,
      targetDamages: [{ target, damage, flankStatus }],
    });

    source.stats.remaining_attacks = Math.max(0, source.stats.remaining_attacks - 1);
    this.deductCostForAbilityUseByCreature(ability, source);
    source.stats.remaining_attacks = Math.max(0, source.stats.remaining_attacks);
    source.stats.remaining_ammo = Math.max(0, source.stats.remaining_ammo);
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
  hookUnitChangedFacing?(_creature: Creature, _direction: HexDirection) {}
}
