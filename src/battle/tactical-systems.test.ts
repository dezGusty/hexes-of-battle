import { describe, it, expect } from "vitest";
import { Battle } from "../battle";
import { BattleActionType } from "./battle-action";
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus } from "../shared/hex-map";
import { Creature, CreatureType } from "./creature";
import { ExhaustionState, MoraleState, getExhaustionState, getMoraleState, getRetaliationDamageMultiplier, validateMoraleBreakpoints, DEFAULT_MORALE_BREAKPOINTS, getMoraleTooltip } from "./combat-rules";
import { TerrainType } from "./terrain-types";
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

    it("should successfully retaliate against melee attack on Turn 1 with fresh defender", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.setSeed(42);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });

      let retaliationCount = 0;
      battle.hookDoingAttack = (_a, _d, _dmg, _type, _flank, isRetaliation) => {
        if (isRetaliation) retaliationCount++;
      };

      battle.handlePrimaryCellAction({ x: 2, y: 2 });
      battle.handleSecondaryCellAction({ x: 3, y: 2 });
      battle.stepInstant();

      expect(retaliationCount).toBe(1);
      expect(defender.stats.retaliations_done).toBe(1);
    });

    it("should not allow melee defenders to retaliate against ranged attacks", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 1, y: 1 };
      archer.armyAlignment = 0;
      archer.stats.is_ranged = true;
      archer.stats.range = 6;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_health = 40;
      archer.stats.health = 40;

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 5, y: 1 };
      defender.armyAlignment = 1;
      defender.stats.stamina = 12;
      defender.stats.remaining_counterattacks = 2;
      defender.stats.num_counterattacks = 2;
      defender.stats.retaliations_done = 0;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, defender],
      });

      let retaliationCount = 0;
      battle.hookDoingAttack = (_a, _d, _dmg, _type, _flank, isRetaliation) => {
        if (isRetaliation) retaliationCount++;
      };

      battle.handlePrimaryCellAction({ x: 1, y: 1 });
      battle.handleSecondaryCellAction({ x: 5, y: 1 });
      battle.stepInstant();

      expect(retaliationCount).toBe(0);
      expect(defender.stats.retaliations_done).toBe(0);
      expect(archer.stats.remaining_health).toBe(40); // Archer took no damage from retaliation
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

    it("should prevent ranged units from performing ranged attacks when remaining_ammo is 0", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 0, y: 0 };
      archer.armyAlignment = 0;
      archer.stats.is_ranged = true;
      archer.stats.range = 6;
      archer.stats.remaining_ammo = 0; // Out of ammo!

      const enemy = new Creature(CreatureType.SWORDSMAN);
      enemy.position = { x: 4, y: 0 };
      enemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, enemy],
      });

      // Select archer
      battle.handlePrimaryCellAction({ x: 0, y: 0 });

      // Ranged reach targets matrix should be 0 because ammo is 0
      expect(battle.rangereach_targets[4]?.[0] ?? 0).toBe(0);

      // Attempting to target distant enemy should NOT create a ranged attack
      battle.handleSecondaryCellAction({ x: 4, y: 0 });
      expect((battle as any).currentActions.some((a: any) => a.type === BattleActionType.ATTACK_RANGED)).toBe(false);
      expect(archer.stats.remaining_ammo).toBe(0);
    });

    it("should calculate individual arrow scatter and apply proportional damage per target", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 0, y: 0 };
      archer.armyAlignment = 0;
      archer.stats.is_ranged = true;
      archer.stats.range = 6;
      archer.stats.remaining_ammo = 10;
      archer.stats.model_count = 8;
      archer.stats.health = 40;
      archer.stats.remaining_health = 40;
      archer.stats.attack_ranged_low = 10;
      archer.stats.attack_ranged_high = 10;
      archer.stats.stamina = 20;
      archer.stats.max_stamina = 20;

      const ally = new Creature(CreatureType.PEASANT);
      ally.position = { x: 4, y: 1 };
      ally.armyAlignment = 0;
      ally.stats.health = 40;
      ally.stats.remaining_health = 40;
      ally.stats.defense_ranged = 0;

      const enemy = new Creature(CreatureType.SWORDSMAN);
      enemy.position = { x: 4, y: 0 };
      enemy.facingDirection = HexDirection.WEST;
      enemy.armyAlignment = 1;
      enemy.stats.health = 40;
      enemy.stats.remaining_health = 40;
      enemy.stats.defense_ranged = 0;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer, ally, enemy],
      });

      let rangedDataCaptured: any = null;
      battle.hookDoingAttackRanged = (data) => {
        rangedDataCaptured = data;
      };

      // 0% scatter chance: all 8 arrows hit enemy
      battle.combatConfig.ranged.scatterChance = 0.0;
      battle.handlePrimaryCellAction({ x: 0, y: 0 });
      battle.handleSecondaryCellAction({ x: 4, y: 0 });
      battle.stepInstant();

      expect(rangedDataCaptured).not.toBeNull();
      expect(rangedDataCaptured.projectiles.length).toBe(8);
      expect(rangedDataCaptured.projectiles.every((p: any) => !p.isScatter)).toBe(true);
      expect(rangedDataCaptured.targetDamages.length).toBe(1);
      expect(rangedDataCaptured.targetDamages[0].target).toBe(enemy);
      expect(rangedDataCaptured.targetDamages[0].damage).toBe(10);
      expect(ally.stats.remaining_health).toBe(40); // Ally was not hit
      expect(enemy.stats.remaining_health).toBe(30); // Enemy took full 10 damage
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

  describe("7. Terrain Types, Hills, Water & Flying Units", () => {
    it("should allow flying units to traverse water with cost 1", () => {
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);

      const groundUnit = new Creature(CreatureType.SWORDSMAN);
      expect(groundUnit.isFlying).toBe(false);
      expect(battle.getMoveCostForTerrain(TerrainType.WATER, groundUnit)).toBe(10); // Water impassable to ground unit

      const flyingUnit = new Creature(CreatureType.HERO_COMMANDER);
      flyingUnit.stats.flying = true;
      expect(flyingUnit.isFlying).toBe(true);
      expect(battle.getMoveCostForTerrain(TerrainType.WATER, flyingUnit)).toBe(1); // Water traversable by flying unit
    });
  });

  describe("8. Morale System, 0-30 Scale & Turn Recovery", () => {
    it("should map numeric morale values correctly to breakpoints (0: Routing, 1-2: Panicked, 3-5: Wavering, 6-15: Steady, >15: High)", () => {
      expect(getMoraleState(0)).toBe(MoraleState.ROUTING);
      expect(getMoraleState(-1)).toBe(MoraleState.ROUTING);
      expect(getMoraleState(1)).toBe(MoraleState.PANICKED);
      expect(getMoraleState(2)).toBe(MoraleState.PANICKED);
      expect(getMoraleState(3)).toBe(MoraleState.WAVERING);
      expect(getMoraleState(4)).toBe(MoraleState.WAVERING);
      expect(getMoraleState(5)).toBe(MoraleState.WAVERING);
      expect(getMoraleState(6)).toBe(MoraleState.STEADY);
      expect(getMoraleState(15)).toBe(MoraleState.STEADY);
      expect(getMoraleState(16)).toBe(MoraleState.HIGH);
      expect(getMoraleState(30)).toBe(MoraleState.HIGH);
    });

    it("should not automatically reset morale to STEADY, but increase by 1 after a turn without taking damage", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const peasant = new Creature(CreatureType.PEASANT);
      peasant.position = { x: 3, y: 3 };
      peasant.armyAlignment = 0;
      peasant.stats.morale = 2; // Panicked state
      peasant.stats.max_morale = 30;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [peasant],
      });

      expect(peasant.stats.morale_state).toBe(MoraleState.PANICKED);
      expect(peasant.isPanickedOrRouting).toBe(true);

      // Turn 1 ends (Army 0 -> Army 1)
      battle.nextTurn();
      // Peasant took no damage during Army 1's turn
      // Turn 2 begins for Army 0 -> resetTurn runs
      battle.nextTurn();

      // Morale increases from 2 to 3 (transitioning from Panicked to Wavering)
      expect(peasant.stats.morale).toBe(3);
      expect(peasant.stats.morale_state).toBe(MoraleState.WAVERING);
      expect(peasant.isPanickedOrRouting).toBe(false);

      // Turn 3: Peasant goes another turn undamaged -> increases from 3 to 4
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 turn
      expect(peasant.stats.morale).toBe(4);
      expect(peasant.stats.morale_state).toBe(MoraleState.WAVERING);
    });

    it("should decrease morale by 1 whenever a unit takes damage", () => {
      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.stats.morale = 10;
      unit.stats.max_morale = 30;

      unit.takeDamage(5);
      expect(unit.stats.morale).toBe(9);

      unit.takeDamage(12);
      expect(unit.stats.morale).toBe(8);

      // Taking 0 damage does not decrease morale
      unit.takeDamage(0);
      expect(unit.stats.morale).toBe(8);
    });

    it("should not increase morale on turn reset if the unit took damage during the round", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.position = { x: 2, y: 2 };
      unit.armyAlignment = 0;
      unit.stats.morale = 10;
      unit.stats.max_morale = 30;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });

      // Unit takes damage (morale drops to 9) and has acted (so it does not trigger idle rest-by-default)
      unit.takeDamage(5);
      expect(unit.stats.morale).toBe(9);
      unit.stats.remaining_movement = 1;
      expect(unit.stats.took_damage_this_turn).toBe(true);

      // Pass turns to next Army 0 turn
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 resetTurn()

      // Because it took damage, morale did NOT increase (remained 9)
      expect(unit.stats.morale).toBe(9);
      expect(unit.stats.took_damage_this_turn).toBe(false);

      // Now go another turn without taking damage (acted, so no rest-by-default)
      unit.stats.remaining_movement = 1;
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 resetTurn()

      // Now it increases by +1 back to 10
      expect(unit.stats.morale).toBe(10);
    });

    it("should increase morale by +1 when performing a Rest action", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.position = { x: 2, y: 2 };
      unit.armyAlignment = 0;
      unit.stats.stamina = 4;
      unit.stats.max_stamina = 14;
      unit.stats.morale = 8;
      unit.stats.max_morale = 30;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });

      battle.handlePrimaryCellAction({ x: 2, y: 2 });
      const rested = battle.restActiveCreature();
      expect(rested).toBe(true);
      battle.stepInstant();

      expect(unit.stats.stamina).toBe(9); // 4 + 5 = 9
      expect(unit.stats.morale).toBe(9);   // 8 + 1 = 9
    });

    it("should validate morale breakpoints and revert to defaults if invalid or incorrect order", () => {
      // Valid custom breakpoints
      const valid = validateMoraleBreakpoints({ routing: 1, panicked: 3, wavering: 7, steady: 18 });
      expect(valid).toEqual({ routing: 1, panicked: 3, wavering: 7, steady: 18 });

      // Revert if negative routing
      expect(validateMoraleBreakpoints({ routing: -1, panicked: 2, wavering: 5, steady: 15 })).toEqual(DEFAULT_MORALE_BREAKPOINTS);

      // Revert if steady exceeds maxMorale
      expect(validateMoraleBreakpoints({ routing: 0, panicked: 2, wavering: 5, steady: 35 })).toEqual(DEFAULT_MORALE_BREAKPOINTS);

      // Revert if values are out of order (e.g. routing >= panicked)
      expect(validateMoraleBreakpoints({ routing: 3, panicked: 2, wavering: 5, steady: 15 })).toEqual(DEFAULT_MORALE_BREAKPOINTS);
      expect(validateMoraleBreakpoints({ routing: 0, panicked: 6, wavering: 5, steady: 15 })).toEqual(DEFAULT_MORALE_BREAKPOINTS);
      expect(validateMoraleBreakpoints({ routing: 0, panicked: 2, wavering: 16, steady: 15 })).toEqual(DEFAULT_MORALE_BREAKPOINTS);

      // Revert if non-numeric or missing
      expect(validateMoraleBreakpoints({ routing: "abc" })).toEqual(DEFAULT_MORALE_BREAKPOINTS);
      expect(validateMoraleBreakpoints(undefined)).toEqual(DEFAULT_MORALE_BREAKPOINTS);
    });

    it("should correctly evaluate morale states using custom configured breakpoints", () => {
      const customBp = { routing: 1, panicked: 4, wavering: 9, steady: 20 };
      expect(getMoraleState(0, customBp)).toBe(MoraleState.ROUTING);
      expect(getMoraleState(1, customBp)).toBe(MoraleState.ROUTING);
      expect(getMoraleState(2, customBp)).toBe(MoraleState.PANICKED);
      expect(getMoraleState(4, customBp)).toBe(MoraleState.PANICKED);
      expect(getMoraleState(5, customBp)).toBe(MoraleState.WAVERING);
      expect(getMoraleState(9, customBp)).toBe(MoraleState.WAVERING);
      expect(getMoraleState(10, customBp)).toBe(MoraleState.STEADY);
      expect(getMoraleState(20, customBp)).toBe(MoraleState.STEADY);
      expect(getMoraleState(21, customBp)).toBe(MoraleState.HIGH);
      expect(getMoraleState(30, customBp)).toBe(MoraleState.HIGH);
    });

    it("should format morale tooltip with steady 6-15 and high >15 by default, and update with custom breakpoints", () => {
      const defaultTooltip = getMoraleTooltip();
      expect(defaultTooltip).toContain("Steady: 6-15, High: >15");
      expect(defaultTooltip).toContain("Routing: 0, Panicked: 1-2, Wavering: 3-5");

      const customTooltip = getMoraleTooltip({ routing: 1, panicked: 4, wavering: 8, steady: 18 });
      expect(customTooltip).toContain("Routing: 0-1, Panicked: 2-4, Wavering: 5-8, Steady: 9-18, High: >18");
    });
  });

  describe("9. Free Unit Orientation Change via Right Click on Same Hex", () => {
    it("should allow selected unit to change orientation freely by right-clicking on its own hex towards an edge before attacking", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.position = { x: 3, y: 3 };
      unit.armyAlignment = 0;
      unit.facingDirection = HexDirection.EAST;
      const initialMoves = unit.stats.remaining_movement;
      const initialStamina = unit.stats.stamina;
      const initialAttacks = unit.stats.remaining_attacks;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });
      battle.handlePrimaryCellAction(unit.position);

      // Unit at (3, 3) is active
      expect(battle.getActiveCreature()).toBe(unit);
      expect(unit.facingDirection).toBe(HexDirection.EAST);

      // Right-click on self towards WEST
      const okWest = battle.handleSecondaryCellAction({ x: 3, y: 3 }, HexDirection.WEST);
      expect(okWest).toBe(true);
      expect(unit.facingDirection).toBe(HexDirection.WEST);

      // Freely changes orientation: movement, stamina, and attacks are untouched
      expect(unit.stats.remaining_movement).toBe(initialMoves);
      expect(unit.stats.stamina).toBe(initialStamina);
      expect(unit.stats.remaining_attacks).toBe(initialAttacks);

      // Reorient towards NORTHEAST
      const okNE = battle.handleSecondaryCellAction({ x: 3, y: 3 }, HexDirection.NORTHEAST);
      expect(okNE).toBe(true);
      expect(unit.facingDirection).toBe(HexDirection.NORTHEAST);

      // Reorient towards SOUTHEAST
      const okSE = battle.handleSecondaryCellAction({ x: 3, y: 3 }, HexDirection.SOUTHEAST);
      expect(okSE).toBe(true);
      expect(unit.facingDirection).toBe(HexDirection.SOUTHEAST);

      // Direction NONE does not change orientation
      const okNone = battle.handleSecondaryCellAction({ x: 3, y: 3 }, HexDirection.NONE);
      expect(okNone).toBe(false);
      expect(unit.facingDirection).toBe(HexDirection.SOUTHEAST);
    });

    it("should allow unit to change orientation after moving as long as it has not attacked yet", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.position = { x: 2, y: 2 };
      unit.armyAlignment = 0;
      unit.facingDirection = HexDirection.EAST;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unit],
      });
      battle.handlePrimaryCellAction(unit.position);

      expect(battle.getActiveCreature()).toBe(unit);

      // Move unit to adjacent cell (3, 2)
      battle.handleSecondaryCellAction({ x: 3, y: 2 });
      battle.stepInstant();

      expect(unit.position).toEqual({ x: 3, y: 2 });
      expect(unit.stats.remaining_movement).toBeLessThan(unit.stats.num_moves);
      expect(unit.hasAttackedThisTurn()).toBe(false);

      // Unit moved, but has NOT attacked yet -> changing orientation is allowed
      const ok = battle.handleSecondaryCellAction({ x: 3, y: 2 }, HexDirection.SOUTHWEST);
      expect(ok).toBe(true);
      expect(unit.facingDirection).toBe(HexDirection.SOUTHWEST);
    });

    it("should disallow changing orientation if the unit has already attacked this turn", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.facingDirection = HexDirection.EAST;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.facingDirection = HexDirection.WEST;
      defender.stats.health = 100;
      defender.stats.remaining_health = 100;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });
      battle.handlePrimaryCellAction(attacker.position);

      // Attacker attacks defender
      battle.handleSecondaryCellAction({ x: 3, y: 2 });
      battle.stepInstant();
      battle.stepInstant();

      expect(attacker.hasAttackedThisTurn()).toBe(true);
      expect(attacker.stats.remaining_attacks).toBe(0);

      const initialFacing = attacker.facingDirection;

      // Attempting to change orientation after attacking should be rejected
      const ok = battle.handleSecondaryCellAction({ x: 2, y: 2 }, HexDirection.NORTHWEST);
      expect(ok).toBe(false);
      expect(attacker.facingDirection).toBe(initialFacing);
    });

    it("should dynamically affect flanking and backstabbing when unit orientation is changed", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const playerUnit = new Creature(CreatureType.SWORDSMAN);
      playerUnit.position = { x: 3, y: 3 };
      playerUnit.armyAlignment = 0;
      playerUnit.facingDirection = HexDirection.EAST;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [playerUnit],
      });
      battle.handlePrimaryCellAction(playerUnit.position);

      // An attack from WEST into playerUnit facing EAST is a backstab
      const attackFromWest = HexDirection.WEST;
      expect(checkFlankingStatus(playerUnit.facingDirection, attackFromWest)).toBe(HexFlankStatus.BACKSTAB);

      // Player turns unit to face WEST to face the threat
      const turned = battle.handleSecondaryCellAction({ x: 3, y: 3 }, HexDirection.WEST);
      expect(turned).toBe(true);
      expect(playerUnit.facingDirection).toBe(HexDirection.WEST);

      // Now attack from WEST meets front of unit (no backstab or flank)
      expect(checkFlankingStatus(playerUnit.facingDirection, attackFromWest)).toBe(HexFlankStatus.NONE);

      // Attack from EAST (now from behind) is now a backstab
      const attackFromEast = HexDirection.EAST;
      expect(checkFlankingStatus(playerUnit.facingDirection, attackFromEast)).toBe(HexFlankStatus.BACKSTAB);
    });
  });

  describe("7. Stamina Consumption & Autonomous Routing Retreat", () => {
    it("should configure +8 base stamina for all units in creaturetypes.json", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const jsonPath = path.resolve(__dirname, "../../public/creaturetypes.json");
      const content = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

      const expectedStamina: Record<string, number> = {
        "peasant": 20,
        "swordsman": 22,
        "spearman": 26,
        "barbarian": 24,
        "peasant-archer": 22,
        "crossbowman": 20,
        "heavy-knights": 24,
        "behemoth": 28,
        "hero-commander": 26,
        "slinger": 22,
        "healer": 22,
        "maceman": 24,
        "armored-knight": 44,
      };

      for (const unit of content) {
        expect(unit.stats.stamina).toBe(expectedStamina[unit.name]);
      }
    });

    it("should configure battle rules requiring and consuming at least 2 stamina for attacks and counterattacks", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const jsonPath = path.resolve(__dirname, "../../public/combat_config.json");
      const config = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

      expect(config.stamina.minAttackStamina).toBeGreaterThanOrEqual(2);
      expect(config.stamina.actionCosts.meleeAttack).toBeGreaterThanOrEqual(2);
      expect(config.stamina.actionCosts.rangedAttack).toBeGreaterThanOrEqual(2);
      expect(config.stamina.actionCosts.retaliation).toBeGreaterThanOrEqual(2);
      expect(config.retaliation.minStamina).toBeGreaterThanOrEqual(2);
    });

    it("should prevent attacks (melee and ranged) and counterattacks when unit has insufficient stamina (< 2)", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.stats.stamina = 1; // < 2 stamina

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.stats.stamina = 10;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });

      // Attempt melee attack with 1 stamina -> should be rejected
      battle.handlePrimaryCellAction(attacker.position);
      battle.handleSecondaryCellAction(defender.position);
      expect(battle.hasRunningActions()).toBe(false);
      expect(attacker.hasAttackedThisTurn()).toBe(false);

      // Now give attacker enough stamina (3)
      attacker.stats.stamina = 3;
      defender.stats.stamina = 1; // Defender has < 2 stamina, cannot retaliate
      defender.stats.remaining_counterattacks = 1;

      battle.handlePrimaryCellAction(attacker.position);
      battle.handleSecondaryCellAction(defender.position);
      expect(battle.hasRunningActions()).toBe(true);
      battle.stepInstant();

      // Attacker consumed stamina
      expect(attacker.stats.stamina).toBe(0); // 3 - 3 = 0
      // Defender took damage but could not counterattack because stamina < 2
      expect(defender.stats.retaliations_done).toBe(0);
      expect(battle.hasRunningActions()).toBe(false);
    });

    it("should prevent ranged attack when unit has insufficient stamina (< 2)", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 1, y: 2 };
      archer.armyAlignment = 0;
      archer.stats.remaining_ammo = 5;
      archer.stats.stamina = 1; // < 2 stamina

      const target = new Creature(CreatureType.SWORDSMAN);
      target.position = { x: 5, y: 2 };
      target.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, target],
      });

      battle.handlePrimaryCellAction(archer.position);
      battle.handleSecondaryCellAction(target.position);
      expect(battle.hasRunningActions()).toBe(false);
      expect(archer.hasAttackedThisTurn()).toBe(false);
    });

    it("should automatically retreat Player 1 routing squad towards left (x decreasing) at turn start while consuming stamina", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 4, y: 2 };
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing state
      routingUnit.stats.stamina = 20;
      routingUnit.stats.num_moves = 3;
      routingUnit.stats.remaining_movement = 3;

      const dummyEnemy = new Creature(CreatureType.SWORDSMAN);
      dummyEnemy.position = { x: 8, y: 4 };
      dummyEnemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [routingUnit, dummyEnemy],
      });

      expect(routingUnit.moraleState).toBe(MoraleState.ROUTING);
      expect(routingUnit.isPanickedOrRouting).toBe(true);

      // Player 1 cannot select or command routing unit
      battle.handlePrimaryCellAction(routingUnit.position);
      expect(battle.getActiveCreature()).toBeNull();

      // Start position was x = 4. When battle starts (or next turn starts for Army 0),
      // the routing unit retreats towards left (x = 0).
      // Since battle.start() ran during initializeFromConfig, it already took its first retreat steps!
      expect(routingUnit.position.x).toBeLessThan(4);
      expect(routingUnit.position.x).toBe(1); // 4 - 3 moves = 1
      expect(routingUnit.stats.stamina).toBe(17); // 20 - 3 stamina = 17
      expect(routingUnit.stats.remaining_movement).toBe(0);

      // End Army 0's turn and Army 1's turn to cycle back to Army 0
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 turn starts -> routingUnit retreats again

      // Unit should reach left edge (x = 0) and stop
      expect(routingUnit.position.x).toBe(0);
      expect(routingUnit.stats.stamina).toBe(16); // 17 - 1 = 16
    });

    it("should automatically retreat Player 2 routing squad towards right (x increasing) at turn start while consuming stamina", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const playerUnit = new Creature(CreatureType.SWORDSMAN);
      playerUnit.position = { x: 1, y: 2 };
      playerUnit.armyAlignment = 0;

      const routingEnemy = new Creature(CreatureType.PEASANT);
      routingEnemy.position = { x: 5, y: 2 };
      routingEnemy.armyAlignment = 1;
      routingEnemy.stats.morale = 0; // Routing state
      routingEnemy.stats.stamina = 20;
      routingEnemy.stats.num_moves = 2;
      routingEnemy.stats.remaining_movement = 2;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [playerUnit, routingEnemy],
      });

      // Enemy starts at x = 5. Pass turn to Army 1.
      battle.nextTurn(); // Army 1 turn begins -> routingEnemy retreats towards right (x = 9)

      expect(routingEnemy.position.x).toBe(7); // 5 + 2 moves = 7
      expect(routingEnemy.stats.stamina).toBe(18); // 20 - 2 = 18
      expect(routingEnemy.facingDirection).toBe(HexDirection.EAST);
    });

    it("should stop routing squad retreat when it runs out of stamina", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 6, y: 2 };
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing
      routingUnit.stats.stamina = 1; // Only 1 stamina left
      routingUnit.stats.num_moves = 4; // But 4 movement points

      const dummyEnemy = new Creature(CreatureType.SWORDSMAN);
      dummyEnemy.position = { x: 9, y: 5 };
      dummyEnemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [routingUnit, dummyEnemy],
      });

      // Routing unit took exactly 1 step (consuming its 1 stamina) and stopped because it ran out of stamina
      expect(routingUnit.position.x).toBe(5); // 6 -> 5
      expect(routingUnit.stats.stamina).toBe(0);
      expect(routingUnit.stats.remaining_movement).toBe(0);

      // Next turn: unit has 0 stamina -> cannot move at all
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 starts
      expect(routingUnit.position.x).toBe(5); // Remained at x = 5
      expect(routingUnit.stats.stamina).toBe(0);
    });

    it("should start recovering morale for routing squads after 2 consecutive undamaged turns", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 3, y: 3 };
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing state
      routingUnit.stats.stamina = 20;

      const dummyEnemy = new Creature(CreatureType.SWORDSMAN);
      dummyEnemy.position = { x: 8, y: 5 };
      dummyEnemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [routingUnit, dummyEnemy],
      });

      expect(routingUnit.moraleState).toBe(MoraleState.ROUTING);
      expect(routingUnit.stats.morale).toBe(0);

      // Turn 1 completes: pass turn to Army 1 and back to Army 0 (Turn 2 starts)
      // 1 consecutive undamaged turn -> routing squad should NOT recover morale yet
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 Turn 2 begins -> resetTurn()
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(1);
      expect(routingUnit.stats.morale).toBe(0);
      expect(routingUnit.moraleState).toBe(MoraleState.ROUTING);

      // Turn 2 completes: pass turn to Army 1 and back to Army 0 (Turn 3 starts)
      // 2 consecutive undamaged turns -> routing squad should START recovering morale!
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 Turn 3 begins -> resetTurn()
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(2);
      expect(routingUnit.stats.morale).toBe(1);
      expect(routingUnit.moraleState).toBe(MoraleState.PANICKED);

      // Unit acts during Turn 3 so it doesn't trigger idle rest-by-default
      routingUnit.stats.remaining_movement = 1;

      // Turn 3 completes: pass turn to Army 1 and back to Army 0 (Turn 4 starts)
      // Now in Panicked state (non-routing), goes another turn undamaged -> recovers +1 morale again
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 Turn 4 begins -> resetTurn()
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(3);
      expect(routingUnit.stats.morale).toBe(2);
      expect(routingUnit.moraleState).toBe(MoraleState.PANICKED);

      // Unit acts during Turn 4 so it doesn't trigger idle rest-by-default
      routingUnit.stats.remaining_movement = 1;

      // Turn 4 completes: Turn 5 begins -> recovers +1 morale again (transitions to Wavering)
      battle.nextTurn(); // Army 1 turn
      battle.nextTurn(); // Army 0 Turn 5 begins -> resetTurn()
      expect(routingUnit.stats.morale).toBe(3);
      expect(routingUnit.moraleState).toBe(MoraleState.WAVERING);
      expect(routingUnit.isPanickedOrRouting).toBe(false);
    });

    it("should reset consecutive undamaged turn count if a routing squad takes damage", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 3, y: 3 };
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing state
      routingUnit.stats.stamina = 20;

      const enemyArcher = new Creature(CreatureType.PEASANT_ARCHER);
      enemyArcher.position = { x: 6, y: 3 };
      enemyArcher.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [routingUnit, enemyArcher],
      });

      // 1st undamaged turn passes
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 Turn 2
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(1);
      expect(routingUnit.stats.morale).toBe(0);

      // During Army 1's turn, enemy damages the routing squad
      battle.nextTurn(); // Army 1 turn
      routingUnit.takeDamage(5);
      expect(routingUnit.stats.took_damage_this_turn).toBe(true);
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(0);

      // Army 0 Turn 3 begins: resetTurn() runs, but because it took damage, consecutive undamaged turns is 0
      battle.nextTurn(); // Army 0 Turn 3
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(0);
      expect(routingUnit.stats.morale).toBe(0);
      expect(routingUnit.moraleState).toBe(MoraleState.ROUTING);

      // Must now go another 2 consecutive undamaged turns before recovering:
      // Turn 4 (1st undamaged turn)
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 Turn 4
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(1);
      expect(routingUnit.stats.morale).toBe(0); // Still 0

      // Turn 5 (2nd consecutive undamaged turn) -> recovers!
      battle.nextTurn(); // Army 1
      battle.nextTurn(); // Army 0 Turn 5
      expect(routingUnit.stats.consecutive_undamaged_turns).toBe(2);
      expect(routingUnit.stats.morale).toBe(1); // Recovered!
      expect(routingUnit.moraleState).toBe(MoraleState.PANICKED);
    });
  });
});

