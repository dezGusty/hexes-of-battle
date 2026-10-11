import { Battle, ArmyControlType } from "../battle";
import { Creature, CreatureStats, CreatureType, Buff, BuffSource } from "./creature";
import { Coords } from "../shared";
import { HexDirection } from "../shared/hex-map";
import { HobGUID } from "./guid";
import { Ability } from "./ability";
import { CombatConfig } from "./combat-rules";

export interface SerializedCreature {
  guid: string;
  creatureType: CreatureType;
  position: Coords;
  facingDirection: HexDirection;
  armyAlignment: number;
  stats: CreatureStats;
  abilityIds: string[];
  buffs: { stats: CreatureStats; source: BuffSource }[];
}

export interface SerializedBattleState {
  version: number;
  name: string;
  timestamp: number;
  dateFormatted: string;
  mapWidth: number;
  mapHeight: number;
  terrainTiles: number[][];
  turnNumber: number;
  currentArmyIndex: number;
  activeCreatureIndex: number;
  maxTurns: number;
  finished: boolean;
  armyControl: ArmyControlType[];
  combatConfig?: CombatConfig;
  totalDamageDealt: [number, number];
  totalStaminaSpent: [number, number];
  moraleBreaks: [number, number];
  friendlyFireEvents: number;
  creatures: SerializedCreature[];
  casualties: SerializedCreature[];
}

export interface BattleSaveEntry {
  id: string;
  name: string;
  createdAt: number;
  dateFormatted: string;
  turnNumber: number;
  currentArmyIndex: number;
  army0UnitsAlive: number;
  army1UnitsAlive: number;
  state: SerializedBattleState;
}

export class SaveManager {
  public static readonly STORAGE_KEY = 'hexes_of_battle_saves_v1';

  /**
   * Format current or given date/time into a human-readable string (YYYY-MM-DD HH:MM:SS)
   */
  public static formatDate(date: Date = new Date()): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Default prefilled name for new save entry
   */
  public static getDefaultSaveName(date: Date = new Date()): string {
    return `Battle ${SaveManager.formatDate(date)}`;
  }

  /**
   * List all saved entries from localStorage sorted newest first
   */
  public static listSaves(): BattleSaveEntry[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (!raw) return [];
      const list: BattleSaveEntry[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Failed to read saves from localStorage:', e);
      return [];
    }
  }

  /**
   * Serialize a creature into plain JSON-compatible object
   */
  public static serializeCreature(creature: Creature): SerializedCreature {
    return {
      guid: creature.GUID.toString(),
      creatureType: creature.creatureType,
      position: { x: creature.pos.x, y: creature.pos.y },
      facingDirection: creature.facingDirection,
      armyAlignment: creature.armyAlignment,
      stats: { ...creature.stats },
      abilityIds: creature.abilities ? creature.abilities.map((a) => a.id) : [],
      buffs: creature.buffs
        ? creature.buffs.map((b) => ({
            stats: { ...b.stats },
            source: b.source,
          }))
        : [],
    };
  }

  /**
   * Deserialize a plain object back into a Creature instance
   */
  public static deserializeCreature(data: SerializedCreature, allAbilities: Ability[] = []): Creature {
    const creature = new Creature(data.creatureType);
    creature.stats = { ...CreatureStats.EMPTY, ...data.stats };
    creature.position = { ...data.position };
    creature.facingDirection = data.facingDirection;
    creature.armyAlignment = data.armyAlignment;

    if (data.guid) {
      (creature as any).guid = new HobGUID(data.guid);
    }

    if (data.abilityIds && allAbilities.length > 0) {
      creature.abilities = data.abilityIds
        .map((id) => allAbilities.find((a) => a.id === id))
        .filter((a): a is Ability => a != null);
    }

    if (data.buffs) {
      creature.buffs = data.buffs.map((b) => new Buff({ ...CreatureStats.EMPTY, ...b.stats }, b.source));
    }

    if (creature.stats.morale == null || Number.isNaN(creature.stats.morale)) {
      creature.stats.morale = 10;
    }
    if (creature.stats.max_morale == null || Number.isNaN(creature.stats.max_morale) || creature.stats.max_morale <= 0) {
      creature.stats.max_morale = 30;
    }
    if (creature.stats.base_morale == null || Number.isNaN(creature.stats.base_morale) || creature.stats.base_morale <= 0) {
      creature.stats.base_morale = creature.stats.morale;
    }

    creature.updateMoraleState();
    creature.updateExhaustionState();
    return creature;
  }

  /**
   * Create a full serialized snapshot of the battle state
   */
  public static createSaveState(battle: Battle, name?: string): BattleSaveEntry {
    const now = Date.now();
    const dateFormatted = SaveManager.formatDate(new Date(now));
    const saveName = name && name.trim().length > 0 ? name.trim() : SaveManager.getDefaultSaveName(new Date(now));

    // Deep clone terrain tiles
    const terrainCopy: number[][] = [];
    for (let x = 0; x < battle.hexMap.width; x++) {
      terrainCopy[x] = [];
      for (let y = 0; y < battle.hexMap.height; y++) {
        terrainCopy[x][y] = battle.terrain_tiles[x]?.[y] ?? 0;
      }
    }

    const state: SerializedBattleState = {
      version: 1,
      name: saveName,
      timestamp: now,
      dateFormatted,
      mapWidth: battle.hexMap.width,
      mapHeight: battle.hexMap.height,
      terrainTiles: terrainCopy,
      turnNumber: battle.turnNumber,
      currentArmyIndex: battle.currentArmyIndex,
      activeCreatureIndex: battle.activeCreatureIndex,
      maxTurns: battle.maxTurns,
      finished: battle.isFinished(),
      armyControl: [...battle.army_control],
      combatConfig: battle.combatConfig ? { ...battle.combatConfig } : undefined,
      totalDamageDealt: [...battle.totalDamageDealt],
      totalStaminaSpent: [...battle.totalStaminaSpent],
      moraleBreaks: [...battle.moraleBreaks],
      friendlyFireEvents: battle.friendlyFireEvents,
      creatures: battle.creatures.map((c) => SaveManager.serializeCreature(c)),
      casualties: battle.casualties.map((c) => SaveManager.serializeCreature(c)),
    };

    const army0Units = battle.creatures.filter((c) => c.armyAlignment === 0 && c.isAlive).length;
    const army1Units = battle.creatures.filter((c) => c.armyAlignment === 1 && c.isAlive).length;

    const entry: BattleSaveEntry = {
      id: `save_${now}_${Math.random().toString(36).substring(2, 7)}`,
      name: saveName,
      createdAt: now,
      dateFormatted,
      turnNumber: battle.turnNumber,
      currentArmyIndex: battle.currentArmyIndex,
      army0UnitsAlive: army0Units,
      army1UnitsAlive: army1Units,
      state,
    };

    return entry;
  }

  /**
   * Save a battle state into localStorage
   */
  public static saveBattle(battle: Battle, name?: string): BattleSaveEntry {
    const entry = SaveManager.createSaveState(battle, name);
    const saves = SaveManager.listSaves();
    saves.unshift(entry);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(saves));
      }
    } catch (e) {
      console.error('Failed to write save to localStorage:', e);
    }

    return entry;
  }

  /**
   * Apply a save entry's state to a Battle instance
   */
  public static loadBattle(entry: BattleSaveEntry, battle: Battle, allAbilities: Ability[] = []): boolean {
    const { state } = entry;
    if (!state) return false;

    battle.hexMap.width = state.mapWidth;
    battle.hexMap.height = state.mapHeight;
    battle.initializeToSize(state.mapWidth, state.mapHeight);

    // Restore terrain
    for (let x = 0; x < state.mapWidth; x++) {
      for (let y = 0; y < state.mapHeight; y++) {
        if (state.terrainTiles[x] && state.terrainTiles[x][y] !== undefined) {
          battle.terrain_tiles[x][y] = state.terrainTiles[x][y];
        }
      }
    }

    // Restore turn & state properties
    battle.turnNumber = state.turnNumber;
    battle.currentArmyIndex = state.currentArmyIndex;
    battle.activeCreatureIndex = state.activeCreatureIndex;
    battle.maxTurns = state.maxTurns;
    (battle as any).finished = state.finished;

    if (state.armyControl) {
      battle.army_control = [...state.armyControl];
    }
    if (state.combatConfig) {
      battle.combatConfig = { ...state.combatConfig };
    }

    battle.totalDamageDealt = [...state.totalDamageDealt];
    battle.totalStaminaSpent = [...state.totalStaminaSpent];
    battle.moraleBreaks = [...state.moraleBreaks];
    battle.friendlyFireEvents = state.friendlyFireEvents;

    // Restore squads
    battle.creatures = (state.creatures || []).map((sc) => SaveManager.deserializeCreature(sc, allAbilities));
    battle.casualties = (state.casualties || []).map((sc) => SaveManager.deserializeCreature(sc, allAbilities));

    // Rebuild tile caches and buffs
    battle.cacheCreaturesToHexMap();
    battle.recomputeAllPositionBuffs();

    // Select current unit if valid
    if (battle.activeCreatureIndex >= 0 && battle.activeCreatureIndex < battle.creatures.length) {
      const active = battle.creatures[battle.activeCreatureIndex];
      battle.showReachableCellsForCreature(active);
      battle.hookActiveUnitChanged(active);
    }

    battle.hookNextTurn(battle.turnNumber, battle.currentArmyIndex);
    return true;
  }

  /**
   * Delete a save by ID from localStorage
   */
  public static deleteSave(id: string): boolean {
    try {
      const saves = SaveManager.listSaves();
      const filtered = saves.filter((s) => s.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(filtered));
      }
      return true;
    } catch (e) {
      console.error('Failed to delete save from localStorage:', e);
      return false;
    }
  }
}
