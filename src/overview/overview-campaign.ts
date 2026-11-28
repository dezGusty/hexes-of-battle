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
import {
  DEFAULT_PLAYER_FACTION_NAME,
  GeneratedOverviewMap,
  MAX_FACTION_NAME_LENGTH,
  savePlayerFactionToStorage,
} from './overview-map-generator';
import {
  createEmptyResourcePool,
  DEFAULT_ARMY_SIGHT_RANGE,
  DEFAULT_NEUTRAL_FACTION,
  isOverviewTerrainPassable,
  NeutralFactionConfig,
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
    case 'water':
      return 4;
    case 'swamp':
      return 2.5;
    case 'forest':
    case 'hill':
      return 2;
    case 'grassland':
    default:
      return 1.5;
  }
}

export function getOverviewStepMoveCost(fromHex: OverviewHex, toHex: OverviewHex): number {
  const connectedByRoad =
    fromHex.roadConnections?.some(
      (c) => c.x === toHex.coords.x && c.y === toHex.coords.y
    ) ?? false;
  if (connectedByRoad) {
    return 1;
  }
  return getOverviewTerrainMoveCost(toHex.terrain);
}

export class OverviewCampaign {
  public readonly config: OverviewCampaignConfig;
  public readonly mapWidth: number;
  public readonly mapHeight: number;
  public readonly hexes: OverviewHex[][];
  public readonly regions: RegionState[];
  public readonly players: OverviewPlayer[];
  public readonly neutralFaction: NeutralFactionConfig;
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
    this.neutralFaction = generated.neutralFaction
      ? { ...DEFAULT_NEUTRAL_FACTION, ...generated.neutralFaction }
      : { ...DEFAULT_NEUTRAL_FACTION };
    this.armies = generated.armies;
    this.recomputeFogOfWar();
  }

  public getFactionColor(ownerPlayerId: string | null): string {
    if (ownerPlayerId === null) {
      return this.neutralFaction.color;
    }
    return this.getPlayer(ownerPlayerId)?.color ?? this.neutralFaction.color;
  }

  public getFactionBanner(ownerPlayerId: string | null): string {
    if (ownerPlayerId === null) {
      return this.neutralFaction.banner;
    }
    return this.getPlayer(ownerPlayerId)?.banner ?? 'banner7.png';
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

      const currentHex = this.getHex(current.coords);
      if (!currentHex) continue;
      for (const n of neighbors) {
        const hex = this.getHex(n);
        if (!hex) continue;
        const stepCost = getOverviewStepMoveCost(currentHex, hex);
        if (!Number.isFinite(stepCost)) continue;

        const nextCost = Math.round((current.cost + stepCost) * 100) / 100;
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

  public prepareEngagementAt(
    armyId: string,
    targetCoords: Coords
  ): {
    cost: number;
    attacker: OverviewArmy;
    defender: OverviewArmy;
    targetRegion: RegionState | undefined;
    movedDuringApproach: boolean;
  } | null {
    const engagement = this.getEngagementAt(armyId, targetCoords);
    if (!engagement) return null;

    const { attacker, cost: totalCost } = engagement;
    const reachable = this.getReachableHexes(armyId);
    const path = this.getPathToHex(armyId, targetCoords);

    let movedDuringApproach = false;
    let remainingCost = totalCost;

    if (path.length >= 3) {
      // Check intermediate hexes for any blocking enemy (e.g. previously unseen ambushers)
      let blockedIdx = -1;
      for (let i = 1; i <= path.length - 2; i++) {
        const occ = this.getArmyAt(path[i], attacker.id);
        if (occ && occ.ownerPlayerId !== attacker.ownerPlayerId) {
          blockedIdx = i;
          break;
        }
      }

      if (blockedIdx !== -1) {
        const stopCoords = path[blockedIdx - 1];
        if (stopCoords.x !== attacker.coords.x || stopCoords.y !== attacker.coords.y) {
          const stopCost = reachable.get(`${stopCoords.x},${stopCoords.y}`) ?? 0;
          this.moveArmy(armyId, stopCoords);
          movedDuringApproach = true;
          const blocker = this.getArmyAt(path[blockedIdx], attacker.id)!;
          const blockerCost = Math.max(
            0,
            Math.round(((reachable.get(`${path[blockedIdx].x},${path[blockedIdx].y}`) ?? stopCost) - stopCost) * 100) / 100
          );
          return {
            cost: blockerCost,
            attacker,
            defender: blocker,
            targetRegion: this.getRegionAt(path[blockedIdx]),
            movedDuringApproach,
          };
        }
        const blocker = this.getArmyAt(path[blockedIdx], attacker.id)!;
        const blockerCost = reachable.get(`${path[blockedIdx].x},${path[blockedIdx].y}`) ?? totalCost;
        return {
          cost: blockerCost,
          attacker,
          defender: blocker,
          targetRegion: this.getRegionAt(path[blockedIdx]),
          movedDuringApproach: false,
        };
      }

      const approachCoords = path[path.length - 2];
      const approachCost = reachable.get(`${approachCoords.x},${approachCoords.y}`) ?? 0;
      const moveOutcome = this.moveArmy(armyId, approachCoords);
      if (moveOutcome.moved) {
        movedDuringApproach = true;
        remainingCost = Math.max(0, Math.round((totalCost - approachCost) * 100) / 100);
      }
    }

    return {
      ...engagement,
      cost: remainingCost,
      movedDuringApproach,
    };
  }

  public consumeMovementPoints(armyId: string, cost: number): void {
    const army = this.getArmyById(armyId);
    if (!army) return;
    army.movementPoints = Math.max(0, Math.round((army.movementPoints - cost) * 100) / 100);
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
      const path = this.getPathToHex(armyId, targetCoords);
      if (path.length >= 3) {
        const approachCoords = path[path.length - 2];
        army.coords = { ...approachCoords };
        army.isGarrison = Boolean(this.getHex(approachCoords)?.isSettlement);
      }
      army.movementPoints = Math.max(0, Math.round((army.movementPoints - cost) * 100) / 100);
      this.recomputeFogOfWar();
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
      army.movementPoints = Math.max(0, Math.round((army.movementPoints - adjCost) * 100) / 100);
      army.isGarrison = Boolean(this.getHex(adjacentCoords)?.isSettlement);
      this.recomputeFogOfWar();
      return {
        moved: true,
        triggeredBattle: false,
        exchangeArmyIds: { leftArmyId: army.id, rightArmyId: occupant.id },
      };
    }

    army.coords = { ...targetCoords };
    army.movementPoints = Math.max(0, Math.round((army.movementPoints - cost) * 100) / 100);
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
    creatureRepository: CreatureRepository,
    mapSize: { mapWidth: number; mapHeight: number } = { mapWidth: 10, mapHeight: 7 }
  ): BattleConfig {
    const mapWidth = mapSize.mapWidth;
    const mapHeight = mapSize.mapHeight;
    const rows = Math.max(1, mapHeight - 2);
    const creatures: Creature[] = [];

    attacker.squads.forEach((sq, idx) => {
      const c = creatureRepository.createCreature(sq.creatureType);
      c.armyAlignment = 0;
      c.facingDirection = HexDirection.EAST;
      c.position = {
        x: Math.min(mapWidth - 1, 1 + Math.floor(idx / rows)),
        y: Math.min(mapHeight - 1, 1 + (idx % rows)),
      };
      creatures.push(c);
    });

    defender.squads.forEach((sq, idx) => {
      const c = creatureRepository.createCreature(sq.creatureType);
      c.armyAlignment = 1;
      c.facingDirection = HexDirection.WEST;
      c.position = {
        x: Math.max(0, mapWidth - 3 - Math.floor(idx / rows)),
        y: Math.min(mapHeight - 1, 1 + (idx % rows)),
      };
      creatures.push(c);
    });

    const defenderHex = this.getHex(defender.coords);
    const majorTerrainType =
      defenderHex?.terrain === 'forest' || defenderHex?.terrain === 'deep_forest'
        ? 'forest'
        : defenderHex?.terrain === 'swamp'
          ? 'swamp'
          : defenderHex?.terrain === 'hill' || defenderHex?.terrain === 'mountain'
            ? 'highlands'
            : targetRegion?.preset === 'forest'
              ? 'forest'
              : targetRegion?.preset === 'swamp'
                ? 'swamp'
                : targetRegion?.preset === 'mountains'
                  ? 'highlands'
                  : 'farm';

    const attackerColor = this.getFactionColor(attacker.ownerPlayerId);
    const defenderColor = this.getFactionColor(defender.ownerPlayerId);
    const attackerBanner = this.getFactionBanner(attacker.ownerPlayerId);
    const defenderBanner = this.getFactionBanner(defender.ownerPlayerId);

    const attackerHex = this.getHex(attacker.coords);
    const attackerRegion = attackerHex ? this.getRegionById(attackerHex.regionId) : undefined;
    const defenderRegion =
      targetRegion ?? (defenderHex ? this.getRegionById(defenderHex.regionId) : undefined);

    const attackerName = this.getBattleFactionName(attacker.ownerPlayerId, attackerRegion);
    const defenderName = this.getBattleFactionName(defender.ownerPlayerId, defenderRegion);

    return {
      mapWidth,
      mapHeight,
      creatures,
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
      aiPersonality: CPUPersonalityType.AGGRESSIVE,
      armyNames: [attackerName, defenderName],
      majorTerrainType,
      playerColors: {
        player1: attackerColor,
        player2: defenderColor,
      },
      player1Banner: attackerBanner,
      player2Banner: defenderBanner,
      playerBanners: {
        player1: attackerBanner,
        player2: defenderBanner,
        0: attackerBanner,
        1: defenderBanner,
      },
    };
  }

  /**
   * Resolves the battle display name for a faction from the global map state.
   * Neutrals are shown with their regional location (e.g. "Militia of Falkenmoor").
   */
  public getBattleFactionName(ownerPlayerId: string | null, region?: RegionState): string {
    if (ownerPlayerId === null) {
      return region?.name ? `Militia of ${region.name}` : 'Local Militia';
    }
    const player = this.getPlayer(ownerPlayerId);
    if (player?.name && player.name.trim().length > 0) {
      return player.name.trim();
    }
    return ownerPlayerId === 'player' ? DEFAULT_PLAYER_FACTION_NAME : ownerPlayerId;
  }

  /**
   * Updates the human player's faction name (clamped to 32 chars), color, and banner,
   * persisting the customization to localStorage.
   */
  public customizePlayerFaction(updates: {
    name?: string;
    color?: string;
    banner?: string;
  }): OverviewPlayer | undefined {
    const player = this.getPlayer('player');
    if (!player) return undefined;

    if (updates.name !== undefined) {
      const cleaned = updates.name.trim().slice(0, MAX_FACTION_NAME_LENGTH);
      player.name = cleaned.length > 0 ? cleaned : DEFAULT_PLAYER_FACTION_NAME;
    }
    if (updates.color !== undefined && updates.color.trim().length > 0) {
      player.color = updates.color.trim();
    }
    if (updates.banner !== undefined && updates.banner.trim().length > 0) {
      player.banner = updates.banner.trim();
    }

    savePlayerFactionToStorage({
      name: player.name,
      color: player.color,
      banner: player.banner,
    });
    return player;
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
      [...result.survivingCreatures, ...result.routedCreatures]
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
      const attackerRetreatedSquads = toSquads(0);
      if (attackerRetreatedSquads.length > 0) {
        attacker.squads = attackerRetreatedSquads;
      } else {
        this.armies = this.armies.filter((a) => a.id !== attacker.id);
      }
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
