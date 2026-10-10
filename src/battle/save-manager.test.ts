import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Battle } from '../battle';
import { HexDirection, HexMap } from '../shared/hex-map';
import { Creature, CreatureType } from './creature';
import { SaveManager } from './save-manager';
import { Ability, AbilityType } from './ability';

describe('SaveManager & Battle State Serialization', () => {
  // Mock localStorage for node/vitest environment
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('should generate a formatted default save name with current date/time', () => {
    const d = new Date(2026, 9, 10, 14, 30, 45); // Oct 10, 2026
    const formatted = SaveManager.formatDate(d);
    expect(formatted).toBe('2026-10-10 14:30:45');
    const defaultName = SaveManager.getDefaultSaveName(d);
    expect(defaultName).toBe('Battle 2026-10-10 14:30:45');
  });

  it('should serialize and deserialize a creature preserving all squad stats', () => {
    const squad = new Creature(CreatureType.SWORDSMAN);
    squad.position = { x: 4, y: 5 };
    squad.facingDirection = HexDirection.WEST;
    squad.armyAlignment = 1;
    squad.stats.health = 48;
    squad.stats.remaining_health = 30;
    squad.stats.model_count = 8;
    squad.stats.model_hp = 6;
    squad.stats.stamina = 9;
    squad.stats.max_stamina = 14;
    squad.stats.remaining_movement = 1;
    squad.stats.remaining_attacks = 0;
    squad.stats.retaliations_done = 1;

    const ability = new Ability();
    ability.id = 'test-ability';
    ability.name = 'Test Strike';
    ability.tooltipName = 'Test Strike';
    ability.description = 'Test';
    ability.abilityType = AbilityType.Active;
    ability.requiresTarget = true;
    ability.range = 2;
    squad.abilities = [ability];

    const serialized = SaveManager.serializeCreature(squad);
    expect(serialized.guid).toBe(squad.GUID.toString());
    expect(serialized.position).toEqual({ x: 4, y: 5 });
    expect(serialized.facingDirection).toBe(HexDirection.WEST);
    expect(serialized.stats.remaining_health).toBe(30);
    expect(serialized.abilityIds).toEqual(['test-ability']);

    const deserialized = SaveManager.deserializeCreature(serialized, [ability]);
    expect(deserialized.GUID.toString()).toBe(squad.GUID.toString());
    expect(deserialized.pos).toEqual({ x: 4, y: 5 });
    expect(deserialized.facingDirection).toBe(HexDirection.WEST);
    expect(deserialized.stats.remaining_health).toBe(30);
    expect(deserialized.stats.stamina).toBe(9);
    expect(deserialized.aliveModelCount).toBe(5); // 30 / 6 = 5 models
    expect(deserialized.abilities.length).toBe(1);
    expect(deserialized.abilities[0].id).toBe('test-ability');
  });

  it('should save full battle state into localStorage and list saved entries', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const c1 = new Creature(CreatureType.SPEARMAN);
    c1.position = { x: 1, y: 2 };
    c1.armyAlignment = 0;

    const c2 = new Creature(CreatureType.SWORDSMAN);
    c2.position = { x: 5, y: 4 };
    c2.armyAlignment = 1;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [c1, c2],
    });

    battle.turnNumber = 2;
    battle.currentArmyIndex = 1; // AI's turn

    const savedEntry = SaveManager.saveBattle(battle, 'Epic Clash Turn 3');
    expect(savedEntry.name).toBe('Epic Clash Turn 3');
    expect(savedEntry.turnNumber).toBe(2);
    expect(savedEntry.currentArmyIndex).toBe(1);
    expect(savedEntry.army0UnitsAlive).toBe(1);
    expect(savedEntry.army1UnitsAlive).toBe(1);

    const list = SaveManager.listSaves();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(savedEntry.id);
    expect(list[0].name).toBe('Epic Clash Turn 3');
  });

  it('should load saved battle state and accurately restore map, terrain, turn, and all squads', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const c1 = new Creature(CreatureType.SPEARMAN);
    c1.position = { x: 2, y: 3 };
    c1.armyAlignment = 0;
    c1.stats.remaining_health = 25;
    c1.stats.stamina = 7;

    const c2 = new Creature(CreatureType.SWORDSMAN);
    c2.position = { x: 6, y: 5 };
    c2.armyAlignment = 1;
    c2.stats.remaining_health = 18;
    c2.stats.stamina = 4;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [c1, c2],
    });

    // Custom terrain modifier on (2, 3)
    battle.terrain_tiles[2][3] = 2; // Hill
    battle.turnNumber = 4;
    battle.currentArmyIndex = 0;
    battle.totalDamageDealt = [45, 30];

    const savedEntry = SaveManager.saveBattle(battle, 'Turn 5 Save');

    // Create a fresh battle instance
    const freshHexMap = new HexMap(13, 9);
    const freshBattle = new Battle(freshHexMap);
    freshBattle.initializeToSize(13, 9);

    // Apply save to fresh battle
    const success = SaveManager.loadBattle(savedEntry, freshBattle, []);
    expect(success).toBe(true);

    expect(freshBattle.hexMap.width).toBe(10);
    expect(freshBattle.hexMap.height).toBe(8);
    expect(freshBattle.turnNumber).toBe(4);
    expect(freshBattle.currentArmyIndex).toBe(0);
    expect(freshBattle.terrain_tiles[2][3]).toBe(2);
    expect(freshBattle.totalDamageDealt).toEqual([45, 30]);

    expect(freshBattle.creatures.length).toBe(2);
    const loadedC1 = freshBattle.creatures.find(c => c.armyAlignment === 0);
    const loadedC2 = freshBattle.creatures.find(c => c.armyAlignment === 1);

    expect(loadedC1).toBeDefined();
    expect(loadedC1?.pos).toEqual({ x: 2, y: 3 });
    expect(loadedC1?.stats.remaining_health).toBe(25);
    expect(loadedC1?.stats.stamina).toBe(7);

    expect(loadedC2).toBeDefined();
    expect(loadedC2?.pos).toEqual({ x: 6, y: 5 });
    expect(loadedC2?.stats.remaining_health).toBe(18);
    expect(loadedC2?.stats.stamina).toBe(4);
  });

  it('should support deleting save entries', () => {
    const hexMap = new HexMap(8, 6);
    const battle = new Battle(hexMap);
    battle.initializeToSize(8, 6);

    const save1 = SaveManager.saveBattle(battle, 'Save 1');
    const save2 = SaveManager.saveBattle(battle, 'Save 2');

    expect(SaveManager.listSaves().length).toBe(2);

    const deleted = SaveManager.deleteSave(save1.id);
    expect(deleted).toBe(true);

    const remaining = SaveManager.listSaves();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(save2.id);
  });
});
