import { describe, it, expect } from "vitest";
import { Battle, ArmyControlType } from "../battle";
import { HexMap } from "../shared/hex-map";
import { Creature, CreatureType } from "./creature";
import { Ability } from "./ability";
import { BattleActionType } from "./battle-action";
import { CPUPersonalityType } from "./cpu-player";
import { CPUPlayerFactory } from "./cpu-player-factory";
import { AggressiveCPUPlayer } from "./aggressive-cpu-player";
import { DefensiveCPUPlayer } from "./defensive-cpu-player";
import { DumbCPUPlayer } from "./dumb-cpu-player";
import { TerrainType } from "./terrain-types";

describe("CPUPlayerFactory", () => {
  it("should create correct CPU player instance based on personality type", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const dumb = CPUPlayerFactory.create(CPUPersonalityType.DUMB, battle);
    expect(dumb).toBeInstanceOf(DumbCPUPlayer);
    expect(dumb.personalityName).toBe("dumb");

    const aggressive = CPUPlayerFactory.create(CPUPersonalityType.AGGRESSIVE, battle);
    expect(aggressive).toBeInstanceOf(AggressiveCPUPlayer);
    expect(aggressive.personalityName).toBe("aggressive");

    const defensive = CPUPlayerFactory.create(CPUPersonalityType.DEFENSIVE, battle);
    expect(defensive).toBeInstanceOf(DefensiveCPUPlayer);
    expect(defensive.personalityName).toBe("defensive");

    const fallback = CPUPlayerFactory.create(undefined, battle);
    expect(fallback).toBeInstanceOf(DumbCPUPlayer);
  });
});

describe("AggressiveCPUPlayer", () => {
  it("should prioritize killable targets over healthier targets", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // AI attacker at (3, 3)
    const attacker = new Creature(CreatureType.SWORDSMAN);
    attacker.position = { x: 3, y: 3 };
    attacker.armyAlignment = 1;

    // Healthy player unit at (4, 3)
    const healthyEnemy = new Creature(CreatureType.SWORDSMAN);
    healthyEnemy.position = { x: 4, y: 3 };
    healthyEnemy.armyAlignment = 0;
    healthyEnemy.stats.remaining_health = 15;

    // Critically wounded player unit at (2, 3)
    const woundedEnemy = new Creature(CreatureType.PEASANT);
    woundedEnemy.position = { x: 2, y: 3 };
    woundedEnemy.armyAlignment = 0;
    woundedEnemy.stats.remaining_health = 2; // easily killable

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [healthyEnemy, woundedEnemy, attacker],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    // Switch to AI turn
    battle.nextTurn();
    expect(battle.currentArmyIndex).toBe(1);

    const aggressiveAI = new AggressiveCPUPlayer(battle);

    // Step 1: select action, Step 2: select unit, Step 3: decide action
    aggressiveAI.update(16);
    aggressiveAI.update(16);
    aggressiveAI.update(16);

    // Should have targeted the wounded enemy at (2, 3)
    expect((aggressiveAI as any).targetCoords).toEqual({ x: 2, y: 3 });
  });

  it("should target ranged player units over melee units when both are present", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const aiArcher = new Creature(CreatureType.PEASANT_ARCHER);
    aiArcher.position = { x: 5, y: 5 };
    aiArcher.armyAlignment = 1;
    aiArcher.stats.is_ranged = true;
    aiArcher.stats.range = 5;
    aiArcher.stats.attack_ranged_low = 6;
    aiArcher.stats.attack_ranged_high = 8;
    aiArcher.stats.ammo = 10;
    aiArcher.stats.remaining_ammo = 10;

    const meleePlayer = new Creature(CreatureType.SWORDSMAN);
    meleePlayer.position = { x: 5, y: 3 };
    meleePlayer.armyAlignment = 0;
    meleePlayer.stats.is_ranged = false;

    const rangedPlayer = new Creature(CreatureType.CROSSBOWMAN);
    rangedPlayer.position = { x: 5, y: 7 };
    rangedPlayer.armyAlignment = 0;
    rangedPlayer.stats.is_ranged = true;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [meleePlayer, rangedPlayer, aiArcher],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    battle.nextTurn();
    const aggressiveAI = new AggressiveCPUPlayer(battle);

    aggressiveAI.update(16);
    aggressiveAI.update(16);
    aggressiveAI.update(16);

    // Should focus the dangerous ranged unit
    expect((aggressiveAI as any).targetCoords).toEqual({ x: 5, y: 7 });
  });
});

describe("DefensiveCPUPlayer", () => {
  it("should avoid suicidal melee attack against a deadly counterattacking enemy", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // AI unit with low HP (2 HP remaining)
    const woundedAI = new Creature(CreatureType.PEASANT);
    woundedAI.position = { x: 3, y: 3 };
    woundedAI.armyAlignment = 1;
    woundedAI.stats.remaining_health = 2;

    // Strong enemy with full counterattack ability (deals 3-6 damage, guaranteed kill if counterattacks)
    const deadlyEnemy = new Creature(CreatureType.SWORDSMAN);
    deadlyEnemy.position = { x: 4, y: 3 };
    deadlyEnemy.armyAlignment = 0;
    deadlyEnemy.stats.remaining_health = 12; // cannot be killed in 1 hit by peasant
    deadlyEnemy.stats.remaining_counterattacks = 1;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [deadlyEnemy, woundedAI],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    battle.nextTurn();
    const defensiveAI = new DefensiveCPUPlayer(battle);

    // Run decision steps
    defensiveAI.update(16);
    defensiveAI.update(16);
    defensiveAI.update(16);

    // Because attacking deadlyEnemy would trigger fatal counterattack,
    // defensive AI must refuse to attack (targetCoords should not be {4, 3})
    expect((defensiveAI as any).targetCoords).not.toEqual({ x: 4, y: 3 });
  });

  it("should attack if the lethal blow prevents the counterattack", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // AI unit with 2 HP
    const woundedAI = new Creature(CreatureType.SWORDSMAN);
    woundedAI.position = { x: 3, y: 3 };
    woundedAI.armyAlignment = 1;
    woundedAI.stats.remaining_health = 2;

    // Deadly enemy but with only 1 HP remaining (guaranteed kill before counterattack can fire)
    const vulnerableEnemy = new Creature(CreatureType.BARBARIAN);
    vulnerableEnemy.position = { x: 4, y: 3 };
    vulnerableEnemy.armyAlignment = 0;
    vulnerableEnemy.stats.remaining_health = 1;
    vulnerableEnemy.stats.remaining_counterattacks = 1;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [vulnerableEnemy, woundedAI],
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    battle.nextTurn();
    const defensiveAI = new DefensiveCPUPlayer(battle);

    defensiveAI.update(16);
    defensiveAI.update(16);
    defensiveAI.update(16);

    // Since vulnerableEnemy has 1 HP, killing it is safe
    expect((defensiveAI as any).targetCoords).toEqual({ x: 4, y: 3 });
  });

  it("should favor safe attacks against enemies with 0 counterattacks left", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const aiMelee = new Creature(CreatureType.SWORDSMAN);
    aiMelee.position = { x: 3, y: 3 };
    aiMelee.armyAlignment = 1;
    aiMelee.stats.remaining_health = 6;

    // Enemy A has counterattacks remaining
    const enemyWithCounter = new Creature(CreatureType.SWORDSMAN);
    enemyWithCounter.position = { x: 4, y: 3 };
    enemyWithCounter.armyAlignment = 0;
    enemyWithCounter.stats.remaining_health = 12;
    enemyWithCounter.stats.remaining_counterattacks = 1;

    // Enemy B already used counterattacks this turn (free hit!)
    const enemyExhausted = new Creature(CreatureType.SWORDSMAN);
    enemyExhausted.position = { x: 2, y: 3 };
    enemyExhausted.armyAlignment = 0;
    enemyExhausted.stats.remaining_health = 12;
    enemyExhausted.stats.remaining_counterattacks = 0;

    const plainTerrain: number[][] = Array.from({ length: 10 }, () => new Array(8).fill(TerrainType.PLAIN));

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [enemyWithCounter, enemyExhausted, aiMelee],
      terrainTiles: plainTerrain,
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    battle.nextTurn();
    const defensiveAI = new DefensiveCPUPlayer(battle);

    defensiveAI.update(16);
    defensiveAI.update(16);
    defensiveAI.update(16);

    // Defensive AI should take the free hit on the exhausted enemy at (2, 3)
    expect((defensiveAI as any).targetCoords).toEqual({ x: 2, y: 3 });
  });

  it("should evaluate terrain when choosing move destinations, avoiding swamp and preferring defensive terrain", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const aiUnit = new Creature(CreatureType.SWORDSMAN);
    aiUnit.position = { x: 0, y: 0 };
    aiUnit.armyAlignment = 1;
    aiUnit.stats.remaining_movement = 2;

    const enemy = new Creature(CreatureType.PEASANT);
    enemy.position = { x: 5, y: 0 };
    enemy.armyAlignment = 0;

    const terrainTiles: number[][] = [];
    for (let x = 0; x < 10; x++) {
      terrainTiles[x] = new Array(8).fill(TerrainType.WATER);
    }
    // Form a corridor along y = 0
    for (let x = 0; x < 10; x++) {
      terrainTiles[x][0] = TerrainType.PLAIN;
    }
    // Set (2, 0) as Swamp (defense penalty) and (1, 0) as Hill (defense bonus)
    terrainTiles[2][0] = TerrainType.SWAMP;
    terrainTiles[1][0] = TerrainType.HILL;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [enemy, aiUnit],
      terrainTiles,
      armyControl: [ArmyControlType.PLAYER, ArmyControlType.AI],
    });
    battle.start();

    battle.nextTurn();
    const defensiveAI = new DefensiveCPUPlayer(battle);

    // Call protected chooseMoveDestination
    const destination = (defensiveAI as any).chooseMoveDestination(aiUnit);
    // Should prefer stopping on Hill at (1, 0) rather than advancing into Swamp at (2, 0)
    expect(destination).toEqual({ x: 1, y: 0 });
  });
});

describe("CPUPlayer Special Abilities & Auto-Battle Turn Execution", () => {
  it("should use Mend Wounds healing ability on a wounded ally in range", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const healer = new Creature(CreatureType.HEALER);
    healer.position = { x: 2, y: 2 };
    healer.armyAlignment = 0;
    healer.stats.model_count = 8;
    healer.stats.health = 24;
    healer.stats.remaining_health = 24;
    healer.stats.stamina = 10;
    healer.stats.max_stamina = 10;
    healer.abilities = [Ability.createMendWounds()];

    const woundedAlly = new Creature(CreatureType.SWORDSMAN);
    woundedAlly.position = { x: 3, y: 2 };
    woundedAlly.armyAlignment = 0;
    woundedAlly.stats.model_count = 8;
    woundedAlly.stats.health = 40;
    woundedAlly.stats.remaining_health = 20;

    const distantEnemy = new Creature(CreatureType.PEASANT);
    distantEnemy.position = { x: 8, y: 6 };
    distantEnemy.armyAlignment = 1;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [healer, woundedAlly, distantEnemy],
      armyControl: [ArmyControlType.AI, ArmyControlType.AI],
    });
    battle.start();

    const playerCpu = new DefensiveCPUPlayer(battle);

    // Step through: NONE -> SELECT_UNIT -> DECIDE_ACTION -> SELECT_ABILITY
    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);

    // TARGET_ABILITY action should be queued for animation playback
    expect(battle.hasRunningActions()).toBe(true);
    expect((battle as any).currentActions[0].type).toBe(BattleActionType.TARGET_ABILITY);

    // Advance battle animations so the ability effect resolves
    battle.update(600);
    battle.update(600);
    battle.update(600);

    expect(woundedAlly.live_stats.remaining_health).toBeGreaterThan(20);
  });

  it("should use Throw Javelin ability with a Spearman when an enemy is within range 2", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const spearman = new Creature(CreatureType.SPEARMAN);
    spearman.position = { x: 2, y: 2 };
    spearman.armyAlignment = 0;
    spearman.stats.ammo = 2;
    spearman.stats.remaining_ammo = 2;
    spearman.stats.stamina = 10;
    spearman.stats.max_stamina = 10;
    spearman.abilities = [Ability.createThrowJavelin()];

    const enemy = new Creature(CreatureType.PEASANT);
    enemy.position = { x: 4, y: 2 }; // distance 2
    enemy.armyAlignment = 1;
    enemy.stats.health = 30;
    enemy.stats.remaining_health = 30;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [spearman, enemy],
      armyControl: [ArmyControlType.AI, ArmyControlType.AI],
    });
    battle.start();

    const playerCpu = new AggressiveCPUPlayer(battle);

    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);

    expect(battle.hasRunningActions()).toBe(true);
    expect((battle as any).currentActions[0].type).toBe(BattleActionType.TARGET_ABILITY);

    battle.update(600);
    battle.update(600);
    battle.update(600);

    expect(spearman.live_stats.remaining_ammo).toBe(1);
    expect(enemy.live_stats.remaining_health).toBeLessThan(30);
  });

  it("should use Quick Draw ability with a ranged unit when ammo and stamina are sufficient", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const archer = new Creature(CreatureType.PEASANT_ARCHER);
    archer.position = { x: 1, y: 2 };
    archer.armyAlignment = 0;
    archer.stats.is_ranged = true;
    archer.stats.range = 5;
    archer.stats.ammo = 6;
    archer.stats.remaining_ammo = 6;
    archer.stats.stamina = 12;
    archer.stats.max_stamina = 12;
    archer.stats.attack_ranged_low = 4;
    archer.stats.attack_ranged_high = 6;
    archer.abilities = [Ability.createQuickDraw()];

    const enemy = new Creature(CreatureType.SWORDSMAN);
    enemy.position = { x: 4, y: 2 };
    enemy.armyAlignment = 1;
    enemy.stats.health = 50;
    enemy.stats.remaining_health = 50;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [archer, enemy],
      armyControl: [ArmyControlType.AI, ArmyControlType.AI],
    });
    battle.start();

    const playerCpu = new DefensiveCPUPlayer(battle);

    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);
    playerCpu.update(16);

    expect(battle.hasRunningActions()).toBe(true);
    expect((battle as any).currentActions[0].type).toBe(BattleActionType.TARGET_ABILITY);

    // Play through both Quick Draw volley animations
    for (let i = 0; i < 10; i++) {
      battle.update(300);
    }

    // Two volleys fired -> 2 ammo spent
    expect(archer.live_stats.remaining_ammo).toBe(4);
  });

  it("should end turn automatically after playing all player units in auto-battle while preserving animations", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const playerUnit = new Creature(CreatureType.PEASANT);
    playerUnit.position = { x: 1, y: 2 };
    playerUnit.armyAlignment = 0;
    playerUnit.stats.num_moves = 2;
    playerUnit.stats.remaining_movement = 2;
    playerUnit.stats.stamina = 10;
    playerUnit.stats.max_stamina = 10;

    const enemyUnit = new Creature(CreatureType.PEASANT);
    enemyUnit.position = { x: 7, y: 2 };
    enemyUnit.armyAlignment = 1;

    const plainTerrain: number[][] = Array.from({ length: 10 }, () => new Array(8).fill(TerrainType.PLAIN));

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [playerUnit, enemyUnit],
      terrainTiles: plainTerrain,
      armyControl: [ArmyControlType.AI, ArmyControlType.AI],
    });
    battle.start();

    const playerCpu = new DefensiveCPUPlayer(battle);
    expect(battle.currentArmyIndex).toBe(0);

    let sawAnimatedAction = false;
    for (let step = 0; step < 40 && battle.currentArmyIndex === 0; step++) {
      if (battle.hasRunningActions()) {
        sawAnimatedAction = true;
        battle.update(100);
      } else {
        playerCpu.update(16);
      }
    }

    expect(sawAnimatedAction).toBe(true);
    expect(playerUnit.position.x).toBeGreaterThan(1);
    expect(battle.currentArmyIndex).toBe(1);
  });
});
