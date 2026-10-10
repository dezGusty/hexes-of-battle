import { describe, it, expect } from "vitest";
import { Battle } from "../battle";
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus } from "../shared/hex-map";
import { Creature, CreatureType } from "./creature";
import { ExhaustionState, getExhaustionState, getRetaliationDamageMultiplier } from "./combat-rules";
import { BatchSimulationRunner } from "../headless/batch-runner";

describe("Tactical Systems Validation", () => {
  describe("1. Single-Hex Multi-Model Squads & Pooled HP Thresholds", () => {
    it("should correctly compute alive model count based on pooled HP and threshold", () => {
      // 8 models, 5 HP per model = 40 HP total
      const squad = new Creature(CreatureType.SWORDSMAN);
      squad.stats.model_count = 8;
      squad.stats.model_hp = 5;
      squad.stats.health = 40;
      squad.stats.remaining_health = 40;

      expect(squad.aliveModelCount).toBe(8);

      // Losing 6 HP: 34 HP remaining -> 34 / 5 = 6.8 -> 7 models alive (1 casualty)
      squad.takeDamage(6);
      expect(squad.aliveModelCount).toBe(7);

      // Losing 10 more HP: 24 HP remaining -> 24 / 5 = 4.8 -> 5 models alive
      squad.takeDamage(10);
      expect(squad.aliveModelCount).toBe(5);

      // Down to 2 HP: 2 / 5 = 0.4 -> 1 model standing
      squad.takeDamage(22);
      expect(squad.stats.remaining_health).toBe(2);
      expect(squad.aliveModelCount).toBe(1);

      // 0 HP -> 0 models
      squad.takeDamage(2);
      expect(squad.stats.remaining_health).toBe(0);
      expect(squad.aliveModelCount).toBe(0);
      expect(squad.isAlive).toBe(false);
    });

    it("should scale damage output proportionally to alive models in squad", () => {
      const squad = new Creature(CreatureType.PEASANT);
      squad.stats.model_count = 16;
      squad.stats.model_hp = 3;
      squad.stats.health = 48;
      squad.stats.remaining_health = 48;
      squad.stats.stamina = 12;
      squad.stats.max_stamina = 12;

      // Full squad (16/16 models alive, Fresh stamina)
      expect(squad.getDamageOutputMultiplier()).toBeCloseTo(1.0, 2);

      // Half squad (8/16 models alive)
      squad.stats.remaining_health = 24;
      expect(squad.aliveModelCount).toBe(8);
      expect(squad.getDamageOutputMultiplier()).toBeCloseTo(0.5, 2);
    });

    it("should support hero with elite bodyguard retinue absorbing damage first", () => {
      const heroSquad = new Creature(CreatureType.HERO_COMMANDER);
      heroSquad.stats.model_count = 6;
      heroSquad.stats.model_hp = 15;
      heroSquad.stats.health = 90;
      heroSquad.stats.remaining_health = 90;
      heroSquad.stats.is_hero = true;

      // 6 models = 1 hero + 5 bodyguards
      expect(heroSquad.aliveModelCount).toBe(6);
      expect(heroSquad.bodyguardCount).toBe(5);

      // Bodyguards take damage first
      heroSquad.takeDamage(30); // 2 bodyguard casualties
      expect(heroSquad.aliveModelCount).toBe(4);
      expect(heroSquad.bodyguardCount).toBe(3);

      // When down to last model, only the hero remains
      heroSquad.takeDamage(45); // down to 15 HP = 1 model
      expect(heroSquad.aliveModelCount).toBe(1);
      expect(heroSquad.bodyguardCount).toBe(0);
    });
  });

  describe("2. Dynamic Facing Arcs & Flanking", () => {
    it("should detect Front, Flank, and Backstab facing arcs correctly", () => {
      // Facing EAST (1). Opposite is WEST (4).
      // If attack comes from EAST (1), it attacks from front -> NONE
      expect(checkFlankingStatus(HexDirection.EAST, HexDirection.EAST)).toBe(HexFlankStatus.NONE);

      // If unit is facing EAST (1) and attack comes from WEST (4) -> BACKSTAB
      expect(checkFlankingStatus(HexDirection.EAST, HexDirection.WEST)).toBe(HexFlankStatus.BACKSTAB);

      // If unit is facing EAST (1) and attack comes from NORTHWEST (3) or SOUTHWEST (5) -> FLANK
      expect(checkFlankingStatus(HexDirection.EAST, HexDirection.NORTHWEST)).toBe(HexFlankStatus.FLANK);
      expect(checkFlankingStatus(HexDirection.EAST, HexDirection.SOUTHWEST)).toBe(HexFlankStatus.FLANK);
    });

    it("should apply mechanical damage bonuses for Flank and Backstab attacks", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.setSeed(42);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.facingDirection = HexDirection.EAST;
      attacker.armyAlignment = 0;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      // Facing EAST, attacker at (2, 2) attacks from WEST (Rear) -> BACKSTAB (+2 damage)
      defender.facingDirection = HexDirection.EAST;
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });

      let recordedFlank = HexFlankStatus.NONE;
      let recordedDamage = 0;
      battle.hookDoingAttack = (_a, _d, damage, _type, flank, isRetaliation) => {
        if (!isRetaliation) {
          recordedFlank = flank;
          recordedDamage = damage;
        }
      };

      battle.handlePrimaryCellAction({ x: 2, y: 2 });
      battle.handleSecondaryCellAction({ x: 3, y: 2 });
      battle.stepInstant();

      expect(recordedFlank).toBe(HexFlankStatus.BACKSTAB);
      expect(recordedDamage).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Stamina Economy, Exhaustion States & Rest Action", () => {
    it("should transition through Fresh, Winded, Exhausted, and Depleted states", () => {
      const maxStam = 10;
      expect(getExhaustionState(10, maxStam)).toBe(ExhaustionState.FRESH); // > 50%
      expect(getExhaustionState(6, maxStam)).toBe(ExhaustionState.FRESH);  // 60% > 50%
      expect(getExhaustionState(4, maxStam)).toBe(ExhaustionState.WINDED); // 40% (20% - 50%)
      expect(getExhaustionState(1, maxStam)).toBe(ExhaustionState.EXHAUSTED); // 10% (1% - 19%)
      expect(getExhaustionState(0, maxStam)).toBe(ExhaustionState.DEPLETED);  // 0%
    });

    it("should deduct stamina on movement, attacks, and retaliations", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.setSeed(100);

      const unit = new Creature(CreatureType.SPEARMAN);
      unit.position = { x: 1, y: 1 };
      unit.armyAlignment = 0;
      unit.stats.stamina = 12;
      unit.stats.max_stamina = 12;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });

      // Move 1 hex
      unit.consumeStamina(battle.combatConfig.stamina.actionCosts.moveNormal);
      expect(unit.stats.stamina).toBe(11);

      // Melee attack costs 3 stamina
      unit.consumeStamina(battle.combatConfig.stamina.actionCosts.meleeAttack);
      expect(unit.stats.stamina).toBe(8);

      // Retaliation costs 2 stamina
      unit.consumeStamina(battle.combatConfig.stamina.actionCosts.retaliation);
      expect(unit.stats.stamina).toBe(6);
    });

    it("should recover stamina on Rest action and prevent multiple rests in the same turn", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.position = { x: 2, y: 2 };
      unit.armyAlignment = 0;
      unit.stats.stamina = 3;
      unit.stats.max_stamina = 14;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });

      battle.handlePrimaryCellAction({ x: 2, y: 2 });
      const firstRest = battle.restActiveCreature();
      expect(firstRest).toBe(true);
      battle.stepInstant();

      expect(unit.stats.stamina).toBe(8); // 3 + 5 = 8
      expect(unit.stats.remaining_movement).toBe(0);
      expect(unit.stats.remaining_attacks).toBe(0);
      expect(unit.stats.has_rested).toBe(true);

      // Attempting to rest again in the same turn must be rejected
      const secondRest = battle.restActiveCreature();
      expect(secondRest).toBe(false);
      expect(unit.stats.stamina).toBe(8);
    });

    it("should not allow rest if the unit already moved, attacked, or is at full stamina", () => {
      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.stats.stamina = 14;
      unit.stats.max_stamina = 14;
      // Full stamina -> cannot rest
      expect(unit.canRest()).toBe(false);

      // Depleted stamina -> can rest if untouched
      unit.stats.stamina = 5;
      expect(unit.canRest()).toBe(true);

      // Unit moved -> cannot rest
      unit.stats.remaining_movement = 2; // num_moves is 4
      expect(unit.canRest()).toBe(false);

      // Reset movement, but unit attacked -> cannot rest
      unit.stats.remaining_movement = unit.stats.num_moves;
      unit.stats.remaining_attacks = 0;
      expect(unit.canRest()).toBe(false);
    });

    it("should automatically apply rest-by-default benefits on end-turn for units that performed no actions", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const idleUnit = new Creature(CreatureType.SWORDSMAN);
      idleUnit.position = { x: 2, y: 2 };
      idleUnit.armyAlignment = 0;
      idleUnit.stats.stamina = 4;
      idleUnit.stats.max_stamina = 14;

      const activeUnit = new Creature(CreatureType.SPEARMAN);
      activeUnit.position = { x: 0, y: 0 };
      activeUnit.armyAlignment = 0;
      activeUnit.stats.stamina = 6;
      activeUnit.stats.max_stamina = 14;
      activeUnit.stats.remaining_movement = 1; // has moved

      const enemyUnit = new Creature(CreatureType.PEASANT);
      enemyUnit.position = { x: 8, y: 8 };
      enemyUnit.armyAlignment = 1;
      enemyUnit.stats.stamina = 5;
      enemyUnit.stats.max_stamina = 12;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [idleUnit, activeUnit, enemyUnit],
      });

      // End Army 0's turn
      battle.nextTurn();

      // idleUnit performed no actions -> recovered 5 stamina (4 + 5 = 9)
      expect(idleUnit.stats.stamina).toBe(9);
      expect(idleUnit.stats.has_rested).toBe(true);

      // activeUnit moved -> did not get rest recovery
      expect(activeUnit.stats.stamina).toBe(6);

      // enemyUnit was not in active turn -> unchanged
      expect(enemyUnit.stats.stamina).toBe(5);
    });
  });

  describe("4. Diminishing-Returns Retaliation", () => {
    it("should apply diminishing returns multipliers: 100%, 60%, 30%, 0%", () => {
      expect(getRetaliationDamageMultiplier(0)).toBe(1.0);
      expect(getRetaliationDamageMultiplier(1)).toBe(0.6);
      expect(getRetaliationDamageMultiplier(2)).toBe(0.3);
      expect(getRetaliationDamageMultiplier(3)).toBe(0.0);
      expect(getRetaliationDamageMultiplier(4)).toBe(0.0);
    });

    it("should prevent retaliation when defender is exhausted (<1 stamina or stamina < 2)", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.setSeed(42);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.stats.stamina = 1; // Insufficient stamina (< 2)

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });

      let retaliationTriggered = false;
      battle.hookDoingAttack = (_a, _d, _dmg, _type, _flank, isRetaliation) => {
        if (isRetaliation) retaliationTriggered = true;
      };

      battle.handlePrimaryCellAction({ x: 2, y: 2 });
      battle.handleSecondaryCellAction({ x: 3, y: 2 });
      battle.stepInstant();

      expect(retaliationTriggered).toBe(false);
    });
  });

  describe("5. Ranged Combat, Scatter & Friendly Fire", () => {
    it("should allow unblocked ranged attacks and trigger friendly fire on scatter", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      // Force 100% scatter chance to test friendly fire deterministically
      battle.combatConfig.ranged.scatterChance = 1.0;
      battle.setSeed(999);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 0, y: 0 };
      archer.armyAlignment = 0;
      archer.stats.is_ranged = true;
      archer.stats.range = 6;
      archer.stats.remaining_ammo = 10;

      const ally = new Creature(CreatureType.PEASANT);
      ally.position = { x: 4, y: 1 }; // Neighboring intended target
      ally.armyAlignment = 0; // Friendly unit

      const enemy = new Creature(CreatureType.SWORDSMAN);
      enemy.position = { x: 4, y: 0 };
      enemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, ally, enemy],
      });

      let scatterDetected = false;
      battle.hookRangedScatter = () => {
        scatterDetected = true;
      };

      battle.handlePrimaryCellAction({ x: 0, y: 0 });
      battle.handleSecondaryCellAction({ x: 4, y: 0 });
      battle.stepInstant();

      expect(scatterDetected).toBe(true);
      expect(archer.stats.remaining_ammo).toBe(9);
    });
  });

  describe("6. Deterministic PRNG & Simulation Replayability", () => {
    it("should produce identical combat outcomes given identical seeds", () => {
      const runner = new BatchSimulationRunner();
      const scenario = runner.getScenarios()[0];

      const seed = 54321;
      const resultA = runner.runScenarioBattle(scenario, seed);
      const resultB = runner.runScenarioBattle(scenario, seed);

      expect(resultA.victorArmyIndex).toBe(resultB.victorArmyIndex);
      expect(resultA.turnsTaken).toBe(resultB.turnsTaken);
      expect(resultA.totalDamageDealt[0]).toBe(resultB.totalDamageDealt[0]);
      expect(resultA.totalDamageDealt[1]).toBe(resultB.totalDamageDealt[1]);
      expect(resultA.totalStaminaSpent[0]).toBe(resultB.totalStaminaSpent[0]);
      expect(resultA.totalStaminaSpent[1]).toBe(resultB.totalStaminaSpent[1]);
    });
  });

  describe("7. Terrain Types, Hills, Mountains & Flying Units", () => {
    it("should allow flying units to traverse mountains and water with cost 1", () => {
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);

      const groundUnit = new Creature(CreatureType.SWORDSMAN);
      expect(groundUnit.isFlying).toBe(false);
      expect(battle.getMoveCostForTerrain(4, groundUnit)).toBe(10); // Mountain impassable to ground unit
      expect(battle.getMoveCostForTerrain(5, groundUnit)).toBe(10); // Water impassable to ground unit

      const flyingUnit = new Creature(CreatureType.HERO_COMMANDER);
      flyingUnit.stats.flying = true;
      expect(flyingUnit.isFlying).toBe(true);
      expect(battle.getMoveCostForTerrain(4, flyingUnit)).toBe(1); // Mountain traversable by flying unit
      expect(battle.getMoveCostForTerrain(5, flyingUnit)).toBe(1); // Water traversable by flying unit
    });

    it("should convert mountain terrain to hill when a non-flying unit is configured on it", () => {
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);

      const groundUnit = new Creature(CreatureType.SWORDSMAN);
      groundUnit.position = { x: 2, y: 2 };
      expect(groundUnit.isFlying).toBe(false);

      const terrainTiles = [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 4, 0, 0, 0], // Mountain at (2, 2)
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ];

      battle.initializeFromConfig({
        mapWidth: 6,
        mapHeight: 6,
        terrainTiles,
        creatures: [groundUnit],
      });

      // (2, 2) was Mountain (4), but because groundUnit was placed on it, it must be changed to Hill (2)
      expect(battle.getTerrainAt({ x: 2, y: 2 })).toBe(2);
    });
  });
});
