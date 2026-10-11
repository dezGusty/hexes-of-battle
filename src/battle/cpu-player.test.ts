import { describe, it, expect } from "vitest";
import { Battle, ArmyControlType } from "../battle";
import { HexMap } from "../shared/hex-map";
import { Creature, CreatureType } from "./creature";
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
      terrainTiles[x] = new Array(8).fill(TerrainType.MOUNTAIN);
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
