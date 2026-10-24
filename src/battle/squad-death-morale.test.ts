import { describe, it, expect, vi } from "vitest";

// Mock @pixi/sound to avoid document/audio issues in headless Node/Vitest
vi.mock("@pixi/sound", () => ({
  sound: {
    add: vi.fn(),
    play: vi.fn(),
    stop: vi.fn(),
    volume: vi.fn(),
    muteAll: vi.fn(),
    unmuteAll: vi.fn(),
  },
}));

import { Battle } from "../battle";
import { HexMap } from "../shared/hex-map";
import { Creature, CreatureType } from "./creature";
import { DEFAULT_COMBAT_CONFIG, CombatConfig } from "./combat-rules";

describe("Squad Death Morale Dynamics", () => {
  it("should penalize neighbouring allies by -1 and boost neighbouring enemies by +1 when a squad dies", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // Victim at (3, 3) (Army 1)
    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 3, y: 3 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0; // Dead

    // Neighbouring ally at (3, 2) (Army 1)
    const neighbourAlly = new Creature(CreatureType.SWORDSMAN);
    neighbourAlly.position = { x: 3, y: 2 };
    neighbourAlly.armyAlignment = 1;
    neighbourAlly.stats.morale = 10;

    // Distant ally at (7, 7) (Army 1) - not a neighbour
    const distantAlly = new Creature(CreatureType.SWORDSMAN);
    distantAlly.position = { x: 7, y: 7 };
    distantAlly.armyAlignment = 1;
    distantAlly.stats.morale = 10;

    // Neighbouring enemy at (4, 3) (Army 0)
    const neighbourEnemy = new Creature(CreatureType.PEASANT);
    neighbourEnemy.position = { x: 4, y: 3 };
    neighbourEnemy.armyAlignment = 0;
    neighbourEnemy.stats.morale = 10;

    // Distant enemy at (0, 0) (Army 0) - not a neighbour and not the killer
    const distantEnemy = new Creature(CreatureType.PEASANT);
    distantEnemy.position = { x: 0, y: 0 };
    distantEnemy.armyAlignment = 0;
    distantEnemy.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, neighbourAlly, distantAlly, neighbourEnemy, distantEnemy],
    });

    // Invoke squad death without a specific killer (e.g. ambient or unspecified)
    battle.handleSquadDeath(victim, null);

    // Neighbouring ally receives -1 morale (10 -> 9)
    expect(neighbourAlly.stats.morale).toBe(9);

    // Distant ally is unaffected (remains 10)
    expect(distantAlly.stats.morale).toBe(10);

    // Neighbouring enemy receives +1 morale (10 -> 11)
    expect(neighbourEnemy.stats.morale).toBe(11);

    // Distant enemy is unaffected (remains 10)
    expect(distantEnemy.stats.morale).toBe(10);
  });

  it("should award the melee killer +2 morale (not double-dipping as neighbouring enemy)", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // Victim at (2, 2) (Army 1)
    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 2, y: 2 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0;

    // Melee killer at (2, 1) (Army 0, neighbour of (2, 2))
    const meleeKiller = new Creature(CreatureType.SWORDSMAN);
    meleeKiller.position = { x: 2, y: 1 };
    meleeKiller.armyAlignment = 0;
    meleeKiller.stats.morale = 10;

    // Another neighbouring enemy at (3, 2) (Army 0)
    const anotherNeighbourEnemy = new Creature(CreatureType.PEASANT);
    anotherNeighbourEnemy.position = { x: 3, y: 2 };
    anotherNeighbourEnemy.armyAlignment = 0;
    anotherNeighbourEnemy.stats.morale = 10;

    // Neighbouring ally at (2, 3) (Army 1)
    const neighbourAlly = new Creature(CreatureType.PEASANT);
    neighbourAlly.position = { x: 2, y: 3 };
    neighbourAlly.armyAlignment = 1;
    neighbourAlly.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, meleeKiller, anotherNeighbourEnemy, neighbourAlly],
    });

    battle.handleSquadDeath(victim, meleeKiller, true);

    // Killer receives exactly +2 morale for melee kill (10 + 2 = 12)
    expect(meleeKiller.stats.morale).toBe(12);

    // Other neighbouring enemy receives +1 morale (10 + 1 = 11)
    expect(anotherNeighbourEnemy.stats.morale).toBe(11);

    // Neighbouring ally receives -1 morale (10 - 1 = 9)
    expect(neighbourAlly.stats.morale).toBe(9);
  });

  it("should award the ranged killer +1 morale even when attacking from distance", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    // Victim at (5, 5) (Army 1)
    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 5, y: 5 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0;

    // Ranged killer at (1, 1) (Army 0, distant)
    const rangedKiller = new Creature(CreatureType.PEASANT_ARCHER);
    rangedKiller.position = { x: 1, y: 1 };
    rangedKiller.armyAlignment = 0;
    rangedKiller.stats.morale = 10;

    // Neighbouring enemy in melee with victim at (5, 4) (Army 0)
    const bystanderEnemy = new Creature(CreatureType.SWORDSMAN);
    bystanderEnemy.position = { x: 5, y: 4 };
    bystanderEnemy.armyAlignment = 0;
    bystanderEnemy.stats.morale = 10;

    // Neighbouring ally at (5, 6) (Army 1)
    const bystanderAlly = new Creature(CreatureType.PEASANT);
    bystanderAlly.position = { x: 5, y: 6 };
    bystanderAlly.armyAlignment = 1;
    bystanderAlly.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, rangedKiller, bystanderEnemy, bystanderAlly],
    });

    battle.handleSquadDeath(victim, rangedKiller, false);

    // Ranged killer receives +1 morale (10 + 1 = 11)
    expect(rangedKiller.stats.morale).toBe(11);

    // Neighbouring enemy receives +1 morale (10 + 1 = 11)
    expect(bystanderEnemy.stats.morale).toBe(11);

    // Neighbouring ally receives -1 morale (10 - 1 = 9)
    expect(bystanderAlly.stats.morale).toBe(9);
  });

  it("should award a point-blank ranged killer exactly +1 morale without double counting", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 3, y: 3 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0;

    // Archer shooting from neighbouring cell (3, 2)
    const pointBlankArcher = new Creature(CreatureType.PEASANT_ARCHER);
    pointBlankArcher.position = { x: 3, y: 2 };
    pointBlankArcher.armyAlignment = 0;
    pointBlankArcher.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, pointBlankArcher],
    });

    battle.handleSquadDeath(victim, pointBlankArcher, false);

    // Ranged killer is adjacent, but gets killer ranged bonus (+1), not +2
    expect(pointBlankArcher.stats.morale).toBe(11);
  });

  it("should respect custom values configured in combatConfig", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const customConfig: CombatConfig = JSON.parse(JSON.stringify(DEFAULT_COMBAT_CONFIG));
    customConfig.morale.squadDeath = {
      neighbourAllyLoss: 3,
      neighbourEnemyBonus: 2,
      killerMeleeBonus: 5,
      killerRangedBonus: 4,
    };
    battle.setCombatConfig(customConfig);

    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 3, y: 3 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0;

    const meleeKiller = new Creature(CreatureType.SWORDSMAN);
    meleeKiller.position = { x: 3, y: 2 };
    meleeKiller.armyAlignment = 0;
    meleeKiller.stats.morale = 10;

    const allyNeighbour = new Creature(CreatureType.PEASANT);
    allyNeighbour.position = { x: 3, y: 4 };
    allyNeighbour.armyAlignment = 1;
    allyNeighbour.stats.morale = 10;

    const otherEnemyNeighbour = new Creature(CreatureType.PEASANT);
    otherEnemyNeighbour.position = { x: 4, y: 3 };
    otherEnemyNeighbour.armyAlignment = 0;
    otherEnemyNeighbour.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, meleeKiller, allyNeighbour, otherEnemyNeighbour],
    });
    battle.setCombatConfig(customConfig);

    battle.handleSquadDeath(victim, meleeKiller, true);

    // Melee killer receives configured +5 (10 + 5 = 15)
    expect(meleeKiller.stats.morale).toBe(15);

    // Ally neighbour receives configured -3 (10 - 3 = 7)
    expect(allyNeighbour.stats.morale).toBe(7);

    // Enemy neighbour receives configured +2 (10 + 2 = 12)
    expect(otherEnemyNeighbour.stats.morale).toBe(12);
  });

  it("should execute squad death morale adjustments during live melee combat killing blow", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.setSeed(42);

    // Attacker at (2, 2)
    const attacker = new Creature(CreatureType.SWORDSMAN);
    attacker.position = { x: 2, y: 2 };
    attacker.armyAlignment = 0;
    attacker.stats.morale = 10;

    // Defender at (3, 2) with only 1 HP so any hit is a killing blow
    const defender = new Creature(CreatureType.PEASANT);
    defender.position = { x: 3, y: 2 };
    defender.armyAlignment = 1;
    defender.stats.remaining_health = 1;
    defender.stats.health = 40;
    defender.stats.morale = 10;

    // Neighbouring ally of defender at (4, 2)
    const defenderAlly = new Creature(CreatureType.PEASANT);
    defenderAlly.position = { x: 4, y: 2 };
    defenderAlly.armyAlignment = 1;
    defenderAlly.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [attacker, defender, defenderAlly],
    });
    battle.start();

    // Select attacker and attack defender in melee
    battle.handlePrimaryCellAction({ x: 2, y: 2 });
    battle.handleSecondaryCellAction({ x: 3, y: 2 });
    battle.stepInstant();

    expect(defender.isAlive).toBe(false);
    // Attacker dealt killing blow in melee -> +2 morale (10 + 2 = 12)
    expect(attacker.stats.morale).toBe(12);
    // Defender's ally neighbour -> -1 morale (10 - 1 = 9)
    expect(defenderAlly.stats.morale).toBe(9);
  });

  it("should execute squad death morale adjustments when a unit dies from a counterattack", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.setSeed(42);

    // Attacker at (2, 2) with 1 HP
    const attacker = new Creature(CreatureType.PEASANT);
    attacker.position = { x: 2, y: 2 };
    attacker.armyAlignment = 0;
    attacker.stats.remaining_health = 1;
    attacker.stats.health = 20;
    attacker.stats.attack_melee_low = 0;
    attacker.stats.attack_melee_high = 0; // Deals 0 damage so defender survives
    attacker.stats.morale = 10;

    // Defender at (3, 2) with high defense so it takes 0 damage
    const defender = new Creature(CreatureType.SWORDSMAN);
    defender.position = { x: 3, y: 2 };
    defender.armyAlignment = 1;
    defender.stats.defense_melee = 99;
    defender.stats.stamina = 10;
    defender.stats.morale = 10;

    // Neighbouring ally of attacker at (2, 3)
    const attackerAlly = new Creature(CreatureType.PEASANT);
    attackerAlly.position = { x: 2, y: 3 };
    attackerAlly.armyAlignment = 0;
    attackerAlly.stats.morale = 10;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [attacker, defender, attackerAlly],
    });
    battle.start();

    // Attacker attacks defender; defender retaliates and kills attacker
    battle.handlePrimaryCellAction({ x: 2, y: 2 });
    battle.handleSecondaryCellAction({ x: 3, y: 2 });
    battle.stepInstant();

    expect(attacker.isAlive).toBe(false);
    // Counter-attacking defender got the melee killing blow -> +2 morale (10 + 2 = 12)
    expect(defender.stats.morale).toBe(12);
    // Attacker's neighbour ally -> -1 morale (10 - 1 = 9)
    expect(attackerAlly.stats.morale).toBe(9);
  });

  it("should clamp morale between 0 and maxMorale (30)", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);

    const victim = new Creature(CreatureType.SWORDSMAN);
    victim.position = { x: 3, y: 3 };
    victim.armyAlignment = 1;
    victim.stats.remaining_health = 0;

    // Killer already at max morale (30)
    const killer = new Creature(CreatureType.SWORDSMAN);
    killer.position = { x: 3, y: 2 };
    killer.armyAlignment = 0;
    killer.stats.morale = 30;
    killer.stats.max_morale = 30;

    // Ally neighbour already at min morale (0)
    const allyNeighbour = new Creature(CreatureType.PEASANT);
    allyNeighbour.position = { x: 3, y: 4 };
    allyNeighbour.armyAlignment = 1;
    allyNeighbour.stats.morale = 0;

    battle.initializeFromConfig({
      mapWidth: 10,
      mapHeight: 8,
      creatures: [victim, killer, allyNeighbour],
    });

    battle.handleSquadDeath(victim, killer, true);

    // Killer capped at 30
    expect(killer.stats.morale).toBe(30);

    // Ally floored at 0
    expect(allyNeighbour.stats.morale).toBe(0);
  });
});
