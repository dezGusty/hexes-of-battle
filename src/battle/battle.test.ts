import { describe, it, expect } from 'vitest';
import { Battle, ArmyControlType } from '../battle';
import { HexMap } from '../shared/hex-map';
import { Creature, CreatureType } from './creature';
import { BattleConfig } from './battle-types';
import { DumbCPUPlayer } from './dumb-cpu-player';

describe('Battle Domain Engine', () => {
  it('should initialize correctly from a BattleConfig', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const unitA = new Creature(CreatureType.PEASANT);
    unitA.position = { x: 1, y: 1 };
    unitA.armyAlignment = 0;

    const unitB = new Creature(CreatureType.SWORDSMAN);
    unitB.position = { x: 5, y: 5 };
    unitB.armyAlignment = 1;

    const config: BattleConfig = {
      mapWidth: 10,
      mapHeight: 8,
      creatures: [unitA, unitB],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    };

    battle.initializeFromConfig(config);

    expect(battle.creatures.length).toBe(2);
    expect(battle.pathfinding_tiles.length).toBe(10);
    expect(battle.pathfinding_tiles[0].length).toBe(8);
    expect(battle.army_control[0]).toBe(ArmyControlType.PLAYER);
    expect(battle.army_control[1]).toBe(ArmyControlType.AI);
    expect(battle.isFinished()).toBe(false);
  });

  it('should handle primary cell selection without DOM events', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const unitA = new Creature(CreatureType.SPEARMAN);
    unitA.position = { x: 2, y: 2 };
    unitA.armyAlignment = 0;

    const config: BattleConfig = {
      mapWidth: 10,
      mapHeight: 8,
      creatures: [unitA],
    };

    battle.initializeFromConfig(config);
    battle.start();

    // Select unit at (2, 2)
    const handled = battle.handlePrimaryCellAction({ x: 2, y: 2 });
    expect(handled).toBe(true);
    expect(battle.activeCreatureIndex).toBe(0);
    expect(battle.getSelectedCreature()).toBe(unitA);
  });

  it('should generate a valid BattleResult upon victory', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const unitA = new Creature(CreatureType.SWORDSMAN);
    unitA.position = { x: 2, y: 2 };
    unitA.armyAlignment = 0;
    unitA.stats.remaining_health = 10;

    const unitB = new Creature(CreatureType.PEASANT);
    unitB.position = { x: 3, y: 2 };
    unitB.armyAlignment = 1;
    unitB.stats.remaining_health = 1; // 1 HP left

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [unitA, unitB],
    });
    battle.start();

    // Select unitA
    battle.handlePrimaryCellAction({ x: 2, y: 2 });

    // Force damage to kill unitB
    unitB.takeDamage(10);
    expect(unitB.isAlive).toBe(false);

    // Simulate casualty processing
    battle.casualties.push(unitB);
    battle.creatures = battle.creatures.filter(c => c.isAlive);

    // Victory check
    (battle as any).checkVictoryConditionsAndState();

    expect(battle.isFinished()).toBe(true);
    const result = battle.getBattleResult();
    expect(result).not.toBeNull();
    expect(result?.victorArmyIndex).toBe(0);
    expect(result?.survivingCreatures.length).toBe(1);
    expect(result?.casualties.length).toBe(1);
    expect(result?.casualties[0]).toBe(unitB);
  });

  it('should allow DumbCPUPlayer to execute its turn when currentArmyIndex switches to AI', () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const playerUnit = new Creature(CreatureType.SWORDSMAN);
    playerUnit.position = { x: 1, y: 1 };
    playerUnit.armyAlignment = 0;

    const aiUnit = new Creature(CreatureType.PEASANT);
    aiUnit.position = { x: 3, y: 1 };
    aiUnit.armyAlignment = 1;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [playerUnit, aiUnit],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    const dumbCpu = new DumbCPUPlayer(battle);

    // Switch to AI turn
    battle.nextTurn();
    expect(battle.currentArmyIndex).toBe(1);
    expect(battle.isCurrentTurnAI()).toBe(true);

    // Run AI update steps (step 1 transitions NONE -> SELECT_UNIT, step 2 selects unit)
    dumbCpu.update(16);
    dumbCpu.update(16);
    expect(battle.activeCreatureIndex).toBe(1);
    expect(battle.getSelectedCreature()).toBe(aiUnit);
  });
});
