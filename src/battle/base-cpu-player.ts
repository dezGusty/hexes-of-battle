import { ArmyControlType, Battle } from "../battle";
import { checkFlankingStatus, HexDirection, HexFlankStatus } from "../shared/hex-map";
import { Coords } from "../shared";
import { HobGUID } from "./guid";
import { BattleHexMapPath } from "./battle-hex-map-path";
import { NumMatrix } from "../shared/num-matrix";
import { Creature } from "./creature";
import { CPUPlayer } from "./cpu-player";

export enum CPUPlayerState {
  NONE = 0,
  SELECT_UNIT,
  DECIDE_ACTION_FOR_SELECTED_UNIT,
  SELECT_MOVE,
  SELECT_ATTACK,
  SELECT_END_TURN,
}

export abstract class BaseCPUPlayer implements CPUPlayer {
  public abstract readonly personalityName: string;

  public static MAX_SEARCH_RANGE = 20;

  protected state: CPUPlayerState = CPUPlayerState.NONE;
  protected targetCoords: Coords = { x: 0, y: 0 };
  protected attackDirection: HexDirection = HexDirection.NONE;
  protected attackMeleePreference: boolean = false;
  protected moveDestinationCoords: Coords = { x: 0, y: 0 };
  protected handledCreatures: HobGUID[] = [];

  constructor(protected battle: Battle) {}

  public reset(): void {
    this.state = CPUPlayerState.NONE;
    this.targetCoords = { x: 0, y: 0 };
    this.attackDirection = HexDirection.NONE;
    this.attackMeleePreference = false;
    this.moveDestinationCoords = { x: 0, y: 0 };
    this.handledCreatures = [];
  }

  public update(_deltaInMilliseconds: number): void {
    if (this.battle.army_control[this.battle.currentArmyIndex] !== ArmyControlType.AI) {
      return;
    }

    if (this.battle.hasRunningActions()) {
      return;
    }

    if (this.battle.isFinished()) {
      return;
    }

    switch (this.state) {
      case CPUPlayerState.NONE:
        this.selectAction();
        break;
      case CPUPlayerState.SELECT_UNIT:
        this.selectUnit();
        break;
      case CPUPlayerState.DECIDE_ACTION_FOR_SELECTED_UNIT:
        this.decideAction();
        break;
      case CPUPlayerState.SELECT_MOVE:
        this.moveSelected();
        break;
      case CPUPlayerState.SELECT_ATTACK:
        this.selectAttack();
        break;
      case CPUPlayerState.SELECT_END_TURN:
        this.selectEndTurn();
        break;
    }
  }

  protected selectAction(): void {
    this.handledCreatures = [];
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected selectUnit(): void {
    let pivotGUID: HobGUID | null = null;
    let keepSearching = true;

    while (keepSearching) {
      if (this.battle.isFinished()) {
        return;
      }
      this.battle.selectNextUnitAndGetIndex();
      const selectedCreature = this.battle.getSelectedCreature();
      if (!selectedCreature) {
        this.state = CPUPlayerState.SELECT_END_TURN;
        return;
      }

      if (pivotGUID === null) {
        pivotGUID = selectedCreature.GUID;
      } else if (pivotGUID.equals(selectedCreature.GUID)) {
        this.state = CPUPlayerState.SELECT_END_TURN;
        return;
      }

      const foundIndex = this.handledCreatures.findIndex((x) => x.equals(selectedCreature.GUID));
      if (foundIndex >= 0) {
        continue;
      } else {
        keepSearching = false;
        this.handledCreatures.push(selectedCreature.GUID);
      }
    }

    this.state = CPUPlayerState.DECIDE_ACTION_FOR_SELECTED_UNIT;
  }

  protected decideAction(): void {
    this.targetCoords = { x: -1, y: -1 };
    this.attackDirection = HexDirection.NONE;
    this.attackMeleePreference = false;
    this.battle.cacheCreaturesToHexMap();

    const creature = this.battle.getSelectedCreature();
    if (!creature) {
      return;
    }

    if (creature.stats.is_ranged) {
      const rangeData = this.battle.getRangeDataForSelectedCreature();
      if (rangeData.length > 0) {
        const target = this.chooseRangedTarget(creature, rangeData.map((d) => d.coords));
        if (target) {
          this.targetCoords = target;
          this.state = CPUPlayerState.SELECT_ATTACK;
          return;
        }
      }
    }

    const reachData = this.battle.getReachableMeleeEnemies();
    if (reachData.length > 0) {
      const chosen = this.chooseMeleeTarget(creature, reachData.map((d) => d.coords));
      if (chosen) {
        this.targetCoords = chosen.target;
        this.attackDirection = chosen.direction;
        this.attackMeleePreference = true;
        this.state = CPUPlayerState.SELECT_ATTACK;
        return;
      }
    }

    this.state = CPUPlayerState.SELECT_MOVE;
  }

  protected moveSelected(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature) {
      this.state = CPUPlayerState.SELECT_UNIT;
      return;
    }

    const destination = this.chooseMoveDestination(selectedCreature);
    if (destination) {
      this.battle.moveOrAttackWithActiveCreatureAtLocation(destination, HexDirection.NONE, false);
    }

    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected selectAttack(): void {
    if (this.targetCoords.x !== -1 && this.targetCoords.y !== -1) {
      this.battle.moveOrAttackWithActiveCreatureAtLocation(
        this.targetCoords,
        this.attackDirection,
        this.attackMeleePreference
      );
    }
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected selectEndTurn(): void {
    this.battle.nextTurn();
    this.state = CPUPlayerState.NONE;
  }

  // --- Subclass Strategy Hooks ---

  protected chooseRangedTarget(_attacker: Creature, candidates: Coords[]): Coords | null {
    if (candidates.length === 0) return null;
    return candidates[0];
  }

  protected chooseMeleeTarget(
    _attacker: Creature,
    candidates: Coords[]
  ): { target: Coords; direction: HexDirection } | null {
    if (candidates.length === 0) return null;
    return { target: candidates[0], direction: HexDirection.NONE };
  }

  protected chooseMoveDestination(creature: Creature): Coords | null {
    const enemies = this.getEnemies();
    if (enemies.length === 0) {
      return null;
    }

    let targetEnemy = enemies[0];
    for (const enemy of enemies) {
      if (enemy.stats.health < targetEnemy.stats.health) {
        targetEnemy = enemy;
      }
    }

    const longPath = this.findLongPathToTarget(creature.position, targetEnemy.position);
    if (longPath.length === 0) {
      return null;
    }

    const numMoves = creature.stats.remaining_movement;
    if (numMoves <= 0) {
      return null;
    }

    const stepIndex = Math.min(numMoves, longPath.length) - 1;
    return longPath[stepIndex] ?? null;
  }

  // --- Utility Methods for AI Decision Making ---

  public getEnemies(armyIndex: number = this.battle.currentArmyIndex): Creature[] {
    return this.battle.creatures.filter((c) => c.armyAlignment !== armyIndex && c.isAlive);
  }

  public getAllies(armyIndex: number = this.battle.currentArmyIndex): Creature[] {
    return this.battle.creatures.filter((c) => c.armyAlignment === armyIndex && c.isAlive);
  }

  public getCreatureAt(coords: Coords): Creature | null {
    const entry = this.battle.getCreatureAtPosition(coords);
    return entry ? entry.creature : null;
  }

  public calculateExpectedMeleeDamage(
    attacker: Creature,
    defender: Creature,
    direction: HexDirection = HexDirection.NONE
  ): { damageMin: number; damageMax: number; avgDamage: number; willKill: boolean; flankStatus: HexFlankStatus } {
    let flankBonus = 0;
    let flankStatus = HexFlankStatus.NONE;

    if (direction !== HexDirection.NONE) {
      const attackFromDir = direction;
      flankStatus = checkFlankingStatus(defender.facingDirection, attackFromDir);
      if (flankStatus === HexFlankStatus.BACKSTAB) {
        flankBonus = 2;
      } else if (flankStatus === HexFlankStatus.FLANK) {
        flankBonus = 1;
      }
    }

    const minAtk = attacker.live_stats.attack_melee_low + flankBonus;
    const maxAtk = attacker.live_stats.attack_melee_high + flankBonus;
    const def = defender.live_stats.defense_melee;

    const damageMin = Math.max(0, minAtk - def);
    const damageMax = Math.max(0, maxAtk - def);
    const avgDamage = (damageMin + damageMax) / 2;
    const willKill = avgDamage >= defender.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKill, flankStatus };
  }

  public calculateExpectedRangedDamage(
    attacker: Creature,
    defender: Creature
  ): { damageMin: number; damageMax: number; avgDamage: number; willKill: boolean } {
    const minAtk = attacker.live_stats.attack_ranged_low;
    const maxAtk = attacker.live_stats.attack_ranged_high;
    const def = defender.live_stats.defense_ranged;

    const damageMin = Math.max(0, minAtk - def);
    const damageMax = Math.max(0, maxAtk - def);
    const avgDamage = (damageMin + damageMax) / 2;
    const willKill = avgDamage >= defender.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKill };
  }

  public canDefenderCounterattack(_attacker: Creature, defender: Creature): boolean {
    return defender.live_stats.remaining_counterattacks > 0;
  }

  public calculateCounterattackDamage(
    defender: Creature,
    attacker: Creature
  ): { damageMin: number; damageMax: number; avgDamage: number; willKillAttacker: boolean } {
    const minAtk = defender.live_stats.attack_melee_low;
    const maxAtk = defender.live_stats.attack_melee_high;
    const def = attacker.live_stats.defense_melee;

    const damageMin = Math.max(0, minAtk - def);
    const damageMax = Math.max(0, maxAtk - def);
    const avgDamage = (damageMin + damageMax) / 2;
    const willKillAttacker = avgDamage >= attacker.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKillAttacker };
  }

  public findBestMeleeFlankDirection(
    attacker: Creature,
    targetCoords: Coords
  ): { direction: HexDirection; flankStatus: HexFlankStatus } {
    const targetCreature = this.getCreatureAt(targetCoords);
    if (!targetCreature) {
      return { direction: HexDirection.NONE, flankStatus: HexFlankStatus.NONE };
    }

    let bestDir = HexDirection.NONE;
    let bestFlank = HexFlankStatus.NONE;

    for (let dir = HexDirection.EAST; dir <= HexDirection.SOUTHEAST; dir++) {
      const neighbour = this.battle.hexMap.getNeighbourInDirection(targetCoords, dir);
      if (!neighbour) continue;

      const occupant = this.getCreatureAt(neighbour);
      if (occupant && occupant !== attacker) continue;

      if (
        this.battle.pathfinding_tiles[neighbour.x]?.[neighbour.y] > 0 ||
        (attacker.position.x === neighbour.x && attacker.position.y === neighbour.y)
      ) {
        const flank = checkFlankingStatus(targetCreature.facingDirection, dir);
        if (flank === HexFlankStatus.BACKSTAB) {
          return { direction: dir, flankStatus: HexFlankStatus.BACKSTAB };
        }
        if (flank === HexFlankStatus.FLANK && bestFlank !== HexFlankStatus.FLANK) {
          bestDir = dir;
          bestFlank = HexFlankStatus.FLANK;
        } else if (bestDir === HexDirection.NONE) {
          bestDir = dir;
          bestFlank = flank;
        }
      }
    }

    return { direction: bestDir, flankStatus: bestFlank };
  }

  public findLongPathToTarget(from: Coords, to: Coords, maxRange: number = BaseCPUPlayer.MAX_SEARCH_RANGE): Coords[] {
    const altTiles: number[][] = [];
    NumMatrix.initializeToSize(altTiles, this.battle.hexMap.width, this.battle.hexMap.height);

    const highlightUnitsInArmies: number[] = [];
    const otherArmyIndex = this.battle.currentArmyIndex === 0 ? 1 : 0;
    highlightUnitsInArmies.push(otherArmyIndex);

    const longUnitReachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.battle.hexMap,
      from,
      maxRange,
      altTiles,
      Battle.DEFAULT_TERRAIN_MOVE_COST,
      {
        occupation_tiles: this.battle.cached_occupation_tiles,
        terrain_tiles: this.battle.terrain_tiles,
        creatures: this.battle.creatures,
      },
      { markUnitsInArmies: highlightUnitsInArmies }
    );

    if (longUnitReachData.length === 0) {
      return [];
    }

    const foundEntry = longUnitReachData.some((entry) => entry.coords.x === to.x && entry.coords.y === to.y);
    if (!foundEntry) {
      return [];
    }

    return BattleHexMapPath.findPathToCellInReachData(to, longUnitReachData);
  }
}
