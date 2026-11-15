import { ArmyControlType } from '../battle';
import { BattleConfig, BattleResult } from '../battle/battle-types';
import { Creature } from '../battle/creature';
import { CreatureRepository } from '../battle/creature-repository';
import { CPUPersonalityType } from '../battle/cpu-player';
import { Coords } from '../shared';
import { HexDirection, HexMap } from '../shared/hex-map';
import {
  calculateNextPopulation,
  calculateRegionTurnEconomy,
  MAX_SQUADS_PER_ARMY,
} from './overview-economy';
import { GeneratedOverviewMap } from './overview-map-generator';
import {
  createEmptyResourcePool,
  DEFAULT_ARMY_SIGHT_RANGE,
  isOverviewTerrainPassable,
  OverviewArmy,
  OverviewCampaignConfig,
  OverviewHex,
  OverviewPlayer,
  OverviewResourceType,
  OverviewTerrainType,
  RegionState,
  ResourcePool,
} from './overview-types';

export interface MoveArmyOutcome {
  moved: boolean;
  triggeredBattle: boolean;
  capturedRegionId?: string;
  attackerArmyId?: string;
  defenderArmyId?: string;
  targetRegionId?: string;
  battleConfig?: BattleConfig;
  mergedIntoArmyId?: string;
  exchangeArmyIds?: { leftArmyId: string; rightArmyId: string };
}

export function getOverviewTerrainMoveCost(terrain: OverviewTerrainType): number {
  if (!isOverviewTerrainPassable(terrain)) return Infinity;
  switch (terrain) {
    case 'forest':
    case 'swamp':
      return 2;
    case 'hill':
    case 'grassland':
    default:
      return 1;
  }
}

export class OverviewCampaign {
  public readonly config: OverviewCampaignConfig;
  public readonly mapWidth: number;
  public readonly mapHeight: number;
  public readonly hexes: OverviewHex[][];
  public readonly regions: RegionState[];
  public readonly players: OverviewPlayer[];
  public armies: OverviewArmy[];
  public turnNumber: number = 1;
  public currentPlayerId: string = 'player';
  public finished: boolean = false;
  public winnerPlayerId: string | null = null;
  private visibleHexKeys: Set<string> = new Set();

  constructor(generated: GeneratedOverviewMap) {
    this.config = { ...generated.config };
    this.mapWidth = generated.mapWidth;
    this.mapHeight = generated.mapHeight;
    this.hexes = generated.hexes;
    this.regions = generated.regions;
    this.players = generated.players;
    this.armies = generated.armies;
    this.recomputeFogOfWar();
  }

  public recomputeFogOfWar(playerId: string = 'player'): void {
    this.visibleHexKeys.clear();

    const ownedRegionIds = new Set(
      this.regions
        .filter((r) => r.ownerPlayerId === playerId)
        .map((r) => r.id)
    );

    const playerArmies = this.armies.filter(
      (a) => a.ownerPlayerId === playerId && a.squads.length > 0
    );

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        const hex = this.hexes[x][y];
        if (ownedRegionIds.has(hex.regionId)) {
          this.visibleHexKeys.add(`${x},${y}`);
          continue;
        }
        for (const army of playerArmies) {
          const sight = army.sightRange ?? DEFAULT_ARMY_SIGHT_RANGE;
          if (HexMap.getHexDistance(army.coords, hex.coords) <= sight) {
            this.visibleHexKeys.add(`${x},${y}`);
            break;
          }
        }
      }
    }
  }

  public isHexVisible(coords: Coords): boolean {
    return this.visibleHexKeys.has(`${coords.x},${coords.y}`);
  }

  public getVisibleHexKeys(): Set<string> {
    return new Set(this.visibleHexKeys);
  }

  public getHex(coords: Coords): OverviewHex | null {
    return this.hexes[coords.x]?.[coords.y] ?? null;
  }

  public getRegionById(regionId: string): RegionState | undefined {
    return this.regions.find((r) => r.id === regionId);
  }

  public getRegionAt(coords: Coords): RegionState | undefined {
    const hex = this.getHex(coords);
    if (!hex) return undefined;
    return this.getRegionById(hex.regionId);
  }

  public getRegionHexes(regionId: string): OverviewHex[] {
    const region = this.getRegionById(regionId);
    if (!region) return [];
    return region.hexCoords
      .map((c) => this.getHex(c))
      .filter((h): h is OverviewHex => h !== null);
  }

  public getPlayer(playerId: string | null): OverviewPlayer | undefined {
    if (!playerId) return undefined;
    return this.players.find((p) => p.id === playerId);
  }

  public getArmyById(armyId: string): OverviewArmy | undefined {
    return this.armies.find((a) => a.id === armyId);
  }

  public getArmyAt(coords: Coords, excludeArmyId?: string): OverviewArmy | undefined {
    return this.armies.find(
      (a) =>
        a.id !== excludeArmyId &&
        a.coords.x === coords.x &&
        a.coords.y === coords.y &&
        a.squads.length > 0
    );
  }

  private computeReachableData(armyId: string): {
    costs: Map<string, number>;
    parents: Map<string, Coords>;
  } {
    const army = this.getArmyById(armyId);
    const costs = new Map<string, number>();
    const parents = new Map<string, Coords>();
    if (!army || army.movementPoints <= 0) return { costs, parents };

    const startKey = `${army.coords.x},${army.coords.y}`;
    costs.set(startKey, 0);
    const queue: Array<{ coords: Coords; cost: number }> = [
      { coords: army.coords, cost: 0 },
    ];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const neighbors = HexMap.getNeighboursInBounds(
        current.coords,
        this.mapWidth,
        this.mapHeight
      );

      for (const n of neighbors) {
        const hex = this.getHex(n);
        if (!hex) continue;
        const stepCost = getOverviewTerrainMoveCost(hex.terrain);
        if (!Number.isFinite(stepCost)) continue;

        const nextCost = current.cost + stepCost;
        if (nextCost > army.movementPoints) continue;

        const occupant = this.getArmyAt(n, army.id);

        const key = `${n.x},${n.y}`;
        const prev = costs.get(key);
        if (prev === undefined || nextCost < prev) {
          costs.set(key, nextCost);
          parents.set(key, { ...current.coords });
          // Stop expanding beyond an enemy/neutral army (must battle it)
          if (!occupant) {
            queue.push({ coords: n, cost: nextCost });
          }
        }
      }
    }

    costs.delete(startKey);
    return { costs, parents };
  }

  public getReachableHexes(armyId: string): Map<string, number> {
    return this.computeReachableData(armyId).costs;
  }

  public getPathToHex(armyId: string, targetCoords: Coords): Coords[] {
    const { costs, parents } = this.computeReachableData(armyId);
    const targetKey = `${targetCoords.x},${targetCoords.y}`;
    if (!costs.has(targetKey)) return [];

    const path: Coords[] = [];
    let cur: Coords | undefined = { ...targetCoords };
    while (cur) {
      path.push(cur);
      const key = `${cur.x},${cur.y}`;
      cur = parents.get(key);
    }
    path.reverse();
    return path;
  }

  public getEngagementAt(
    armyId: string,
    targetCoords: Coords
  ): {
    cost: number;
    attacker: OverviewArmy;
    defender: OverviewArmy;
    targetRegion: RegionState | undefined;
  } | null {
    if (this.finished) return null;
    const attacker = this.getArmyById(armyId);
    if (!attacker) return null;

    const reachable = this.getReachableHexes(armyId);
    const key = `${targetCoords.x},${targetCoords.y}`;
    const cost = reachable.get(key);
    if (cost === undefined) return null;

    const defender = this.getArmyAt(targetCoords, attacker.id);
    if (!defender || defender.ownerPlayerId === attacker.ownerPlayerId) return null;

    const targetRegion = this.getRegionAt(targetCoords);
    return { cost, attacker, defender, targetRegion };
  }

  public consumeMovementPoints(armyId: string, cost: number): void {
    const army = this.getArmyById(armyId);
    if (!army) return;
    army.movementPoints = Math.max(0, army.movementPoints - cost);
  }

  public moveArmy(
    armyId: string,
    targetCoords: Coords,
    creatureRepository?: CreatureRepository
  ): MoveArmyOutcome {
    if (this.finished) return { moved: false, triggeredBattle: false };
    const army = this.getArmyById(armyId);
    if (!army) return { moved: false, triggeredBattle: false };

    const reachable = this.getReachableHexes(armyId);
    const key = `${targetCoords.x},${targetCoords.y}`;
    const cost = reachable.get(key);
    if (cost === undefined) return { moved: false, triggeredBattle: false };

    const occupant = this.getArmyAt(targetCoords, army.id);
    const targetRegion = this.getRegionAt(targetCoords);

    if (occupant && occupant.ownerPlayerId !== army.ownerPlayerId) {
      army.movementPoints = Math.max(0, army.movementPoints - cost);
      const battleConfig = creatureRepository
        ? this.buildBattleConfigForEngagement(army, occupant, targetRegion, creatureRepository)
        : undefined;
      return {
        moved: true,
        triggeredBattle: true,
        attackerArmyId: army.id,
        defenderArmyId: occupant.id,
        targetRegionId: targetRegion?.id,
        battleConfig,
      };
    }

    if (occupant && occupant.ownerPlayerId === army.ownerPlayerId) {
      if (army.squads.length + occupant.squads.length <= MAX_SQUADS_PER_ARMY) {
        occupant.squads.push(...army.squads);
        occupant.movementPoints = Math.max(
          0,
          Math.min(occupant.movementPoints, army.movementPoints - cost)
        );
        this.armies = this.armies.filter((a) => a.id !== army.id);
        this.recomputeFogOfWar();
        return {
          moved: true,
          triggeredBattle: false,
          mergedIntoArmyId: occupant.id,
        };
      }
      const path = this.getPathToHex(armyId, targetCoords);
      const adjacentCoords = path.length >= 2 ? path[path.length - 2] : { ...army.coords };
      const adjCost =
        adjacentCoords.x === army.coords.x && adjacentCoords.y === army.coords.y
          ? 0
          : reachable.get(`${adjacentCoords.x},${adjacentCoords.y}`) ?? 0;
      army.coords = { ...adjacentCoords };
      army.movementPoints = Math.max(0, army.movementPoints - adjCost);
      army.isGarrison = Boolean(this.getHex(adjacentCoords)?.isSettlement);
      this.recomputeFogOfWar();
      return {
        moved: true,
        triggeredBattle: false,
        exchangeArmyIds: { leftArmyId: army.id, rightArmyId: occupant.id },
      };
    }

    army.coords = { ...targetCoords };
    army.movementPoints = Math.max(0, army.movementPoints - cost);
    army.isGarrison = Boolean(this.getHex(targetCoords)?.isSettlement);

    let capturedRegionId: string | undefined;
    if (
      targetRegion &&
      targetRegion.settlementCoords &&
      targetRegion.settlementCoords.x === targetCoords.x &&
      targetRegion.settlementCoords.y === targetCoords.y &&
      targetRegion.ownerPlayerId !== army.ownerPlayerId
    ) {
      targetRegion.ownerPlayerId = army.ownerPlayerId;
      capturedRegionId = targetRegion.id;
      this.checkVictoryConditions();
    }

    this.recomputeFogOfWar();

    return {
      moved: true,
      triggeredBattle: false,
      capturedRegionId,
    };
  }

  public buildBattleConfigForEngagement(
    attacker: OverviewArmy,
    defender: OverviewArmy,
    targetRegion: RegionState | undefined,
    creatureRepository: CreatureRepository
  ): BattleConfig {
    const creatures: Creature[] = [];

    attacker.squads.forEach((sq, idx) => {
      const c = creatureRepository.createCreature(sq.creatureType);
      c.armyAlignment = 0;
      c.facingDirection = HexDirection.EAST;
      c.position = { x: 1 + Math.floor(idx / 5), y: 1 + (idx % 5) };
      creatures.push(c);
    });

    defender.squads.forEach((sq, idx) => {
      const c = creatureRepository.createCreature(sq.creatureType);
      c.armyAlignment = 1;
      c.facingDirection = HexDirection.WEST;
      c.position = { x: 10 - Math.floor(idx / 5), y: 1 + (idx % 5) };
      creatures.push(c);
    });

    const majorTerrainType =
      targetRegion?.preset === 'forest'
        ? 'forest'
        : targetRegion?.preset === 'swamp'
          ? 'swamp'
          : 'farm';

    return {
      mapWidth: 13,
      mapHeight: 9,
      creatures,
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
      aiPersonality: CPUPersonalityType.AGGRESSIVE,
      majorTerrainType,
    };
  }

  public applyBattleResult(
    result: BattleResult,
    attackerArmyId: string,
    defenderArmyId: string,
    targetRegionId?: string
  ): void {
    const attacker = this.getArmyById(attackerArmyId);
    const defender = this.getArmyById(defenderArmyId);
    if (!attacker || !defender) return;

    const toSquads = (armyIndex: number) =>
      result.survivingCreatures
        .filter((c) => c.armyAlignment === armyIndex && c.live_stats.remaining_health > 0)
        .map((c) => ({
          creatureType: c.creatureType,
          count: Math.max(1, c.aliveModelCount),
          hpPercent: Math.max(
            0.05,
            c.live_stats.remaining_health / Math.max(1, c.stats.health)
          ),
        }));

    if (result.victorArmyIndex === 0) {
      attacker.squads = toSquads(0);
      attacker.coords = { ...defender.coords };
      this.armies = this.armies.filter((a) => a.id !== defender.id);

      const region = targetRegionId
        ? this.getRegionById(targetRegionId)
        : this.getRegionAt(attacker.coords);
      if (
        region &&
        region.settlementCoords &&
        region.settlementCoords.x === attacker.coords.x &&
        region.settlementCoords.y === attacker.coords.y
      ) {
        region.ownerPlayerId = attacker.ownerPlayerId;
        attacker.isGarrison = true;
      }
    } else if (result.victorArmyIndex === 1) {
      defender.squads = toSquads(1);
      this.armies = this.armies.filter((a) => a.id !== attacker.id);
    } else {
      // Draw: both sides keep surviving squads in place
      attacker.squads = toSquads(0);
      defender.squads = toSquads(1);
      if (attacker.squads.length === 0) {
        this.armies = this.armies.filter((a) => a.id !== attacker.id);
      }
      if (defender.squads.length === 0) {
        this.armies = this.armies.filter((a) => a.id !== defender.id);
      }
    }

    this.recomputeFogOfWar();
    this.updateEliminatedPlayers();
    this.checkVictoryConditions();
  }

  public getForeseenResourceChanges(playerId: string): ResourcePool {
    const delta = createEmptyResourcePool();
    for (const region of this.regions) {
      if (!region.settlementTier || region.ownerPlayerId !== playerId) continue;
      const regionHexes = this.getRegionHexes(region.id);
      const econ = calculateRegionTurnEconomy(region, regionHexes);
      (Object.keys(econ.produced) as OverviewResourceType[]).forEach((resKey) => {
        delta[resKey] += econ.produced[resKey];
      });
      delta.food -= econ.foodConsumed;
    }
    return delta;
  }

  public endTurn(): void {
    if (this.finished) return;

    for (const region of this.regions) {
      if (!region.settlementTier) continue;
      const regionHexes = this.getRegionHexes(region.id);
      const econ = calculateRegionTurnEconomy(region, regionHexes);
      const owner = this.getPlayer(region.ownerPlayerId);

      if (owner) {
        (Object.keys(econ.produced) as OverviewResourceType[]).forEach((resKey) => {
          owner.resources[resKey] += econ.produced[resKey];
        });
        const availableFood = owner.resources.food;
        owner.resources.food = Math.max(0, owner.resources.food - econ.foodConsumed);
        region.population = calculateNextPopulation(
          region.population,
          availableFood,
          region.taxRate,
          region.settlementTier
        );
      } else {
        // Neutral regions self-sustain around baseline
        region.population = calculateNextPopulation(
          region.population,
          econ.foodConsumed + 5,
          region.taxRate,
          region.settlementTier
        );
      }
    }

    for (const army of this.armies) {
      army.movementPoints = army.maxMovementPoints;
    }

    this.turnNumber++;
    this.checkVictoryConditions();
  }

  private updateEliminatedPlayers(): void {
    for (const player of this.players) {
      const ownsRegion = this.regions.some((r) => r.ownerPlayerId === player.id);
      const hasArmy = this.armies.some(
        (a) => a.ownerPlayerId === player.id && a.squads.length > 0
      );
      player.eliminated = !ownsRegion && !hasArmy;
    }
  }

  public checkVictoryConditions(): string | null {
    const standardRegions = this.regions.filter((r) => Boolean(r.settlementTier));
    if (standardRegions.length === 0) return null;

    for (const player of this.players) {
      if (player.eliminated) continue;
      const ownedCount = standardRegions.filter(
        (r) => r.ownerPlayerId === player.id
      ).length;

      if (
        this.config.victoryCondition === 'conquer_all' &&
        ownedCount === standardRegions.length
      ) {
        this.finished = true;
        this.winnerPlayerId = player.id;
        return player.id;
      }

      if (
        this.config.victoryCondition === 'conquer_80_percent' &&
        ownedCount / standardRegions.length >= 0.8
      ) {
        this.finished = true;
        this.winnerPlayerId = player.id;
        return player.id;
      }

      if (this.config.victoryCondition === 'eliminate_rivals') {
        const anyRivalActive =
          this.players.some((p) => p.id !== player.id && !p.eliminated) ||
          standardRegions.some((r) => r.ownerPlayerId !== null && r.ownerPlayerId !== player.id);
        if (!anyRivalActive && ownedCount > 0) {
          this.finished = true;
          this.winnerPlayerId = player.id;
          return player.id;
        }
      }
    }

    return null;
  }
}
