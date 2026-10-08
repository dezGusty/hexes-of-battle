import { HexMap } from "../shared/hex-map";
import { ArmyControlType, Battle } from "../battle";
import { CreatureRepository } from "../battle/creature-repository";
import { CPUPlayerFactory } from "../battle/cpu-player-factory";
import { CPUPersonalityType } from "../battle/cpu-player";
import { BattleResult } from "../battle/battle-types";
import { DEFAULT_COMBAT_CONFIG, CombatConfig } from "../battle/combat-rules";
import fs from "fs";
import path from "path";

export interface ScenarioUnitDef {
  type: string;
  pos: { x: number; y: number };
  facing: number;
}

export interface ScenarioArmyDef {
  armyIndex: number;
  name: string;
  units: ScenarioUnitDef[];
  aiPersonality?: string;
}

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  mapWidth: number;
  mapHeight: number;
  armies: ScenarioArmyDef[];
}

export interface BatchSimulationOptions {
  scenarioId?: string;
  runs?: number;
  baseSeed?: number;
  maxTurns?: number;
  ai0Personality?: string;
  ai1Personality?: string;
  combatConfig?: CombatConfig;
}

export interface ScenarioAggregateMetrics {
  scenarioId: string;
  scenarioName: string;
  totalRuns: number;
  army0Wins: number;
  army1Wins: number;
  draws: number;
  army0WinRate: number;
  army1WinRate: number;
  drawRate: number;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  avgDamageDealt: [number, number];
  avgStaminaSpent: [number, number];
  avgMoraleBreaks: [number, number];
  totalFriendlyFireEvents: number;
  avgFriendlyFireEvents: number;
  survivingUnitsSummary: Record<string, { aliveModelsAvg: number; initialCount: number }>;
}

export class BatchSimulationRunner {
  private repository: CreatureRepository = new CreatureRepository();
  private combatConfig: CombatConfig = DEFAULT_COMBAT_CONFIG;
  private scenarios: ScenarioDef[] = [];

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      const creatureTypesPath = path.resolve(process.cwd(), "public/creaturetypes.json");
      if (fs.existsSync(creatureTypesPath)) {
        const data = JSON.parse(fs.readFileSync(creatureTypesPath, "utf-8"));
        this.repository.setCreatureTemplates(data);
      }
    } catch {
      // Fallback to defaults if file read fails
    }

    try {
      const combatConfigPath = path.resolve(process.cwd(), "public/combat_config.json");
      if (fs.existsSync(combatConfigPath)) {
        this.combatConfig = JSON.parse(fs.readFileSync(combatConfigPath, "utf-8"));
      }
    } catch {
      this.combatConfig = DEFAULT_COMBAT_CONFIG;
    }

    try {
      const scenariosPath = path.resolve(process.cwd(), "public/scenarios.json");
      if (fs.existsSync(scenariosPath)) {
        this.scenarios = JSON.parse(fs.readFileSync(scenariosPath, "utf-8"));
      }
    } catch {
      this.scenarios = [];
    }

    if (this.scenarios.length === 0) {
      this.scenarios = [
        {
          id: "default_skirmish",
          name: "Default Tactical Skirmish",
          description: "Infantry, spearman, and archers clash.",
          mapWidth: 13,
          mapHeight: 9,
          armies: [
            {
              armyIndex: 0,
              name: "Army 1",
              units: [
                { type: "peasant", pos: { x: 3, y: 4 }, facing: 1 },
                { type: "spearman", pos: { x: 0, y: 0 }, facing: 1 },
                { type: "peasant-archer", pos: { x: 1, y: 5 }, facing: 1 },
                { type: "crossbowman", pos: { x: 0, y: 4 }, facing: 1 },
                { type: "spearman", pos: { x: 3, y: 5 }, facing: 1 },
              ],
            },
            {
              armyIndex: 1,
              name: "Army 2",
              units: [
                { type: "spearman", pos: { x: 5, y: 7 }, facing: 4 },
                { type: "swordsman", pos: { x: 4, y: 4 }, facing: 4 },
                { type: "barbarian", pos: { x: 4, y: 6 }, facing: 4 },
                { type: "peasant", pos: { x: 4, y: 3 }, facing: 4 },
                { type: "peasant-archer", pos: { x: 7, y: 4 }, facing: 4 },
              ],
            },
          ],
        },
      ];
    }
  }

  public getScenarios(): ScenarioDef[] {
    return this.scenarios;
  }

  public runScenarioBattle(
    scenario: ScenarioDef,
    seed: number,
    options: BatchSimulationOptions = {}
  ): BattleResult {
    const hexMap = new HexMap(scenario.mapWidth, scenario.mapHeight);
    const battle = new Battle(hexMap);
    battle.setCombatConfig(options.combatConfig ?? this.combatConfig);
    battle.setSeed(seed);
    battle.maxTurns = options.maxTurns ?? 50;

    battle.initializeToSize(scenario.mapWidth, scenario.mapHeight);
    battle.army_control = [ArmyControlType.AI, ArmyControlType.AI];

    // Instantiate creatures from scenario definitions
    for (const army of scenario.armies) {
      for (const unitDef of army.units) {
        const creature = this.repository.createCreatureByName(unitDef.type);
        creature.position = { ...unitDef.pos };
        creature.armyAlignment = army.armyIndex;
        creature.facingDirection = unitDef.facing;
        battle.creatures.push(creature);
      }
    }

    battle.start();

    const p0 = options.ai0Personality ?? scenario.armies[0]?.aiPersonality ?? CPUPersonalityType.AGGRESSIVE;
    const p1 = options.ai1Personality ?? scenario.armies[1]?.aiPersonality ?? CPUPersonalityType.DEFENSIVE;

    const cpu0 = CPUPlayerFactory.create(p0, battle);
    const cpu1 = CPUPlayerFactory.create(p1, battle);

    // Simulation loop
    let stepCount = 0;
    const maxSafetySteps = battle.maxTurns * 200;

    while (!battle.isFinished() && battle.turnNumber < battle.maxTurns && stepCount < maxSafetySteps) {
      stepCount++;
      const currentCpu = battle.currentArmyIndex === 0 ? cpu0 : cpu1;
      currentCpu.update(16);
      battle.stepInstant();
    }

    if (!battle.isFinished() && battle.turnNumber >= battle.maxTurns) {
      battle.checkVictoryConditionsAndState();
    }

    return battle.getBattleResult();
  }

  public runBatch(options: BatchSimulationOptions = {}): ScenarioAggregateMetrics[] {
    const runs = options.runs ?? 100;
    const baseSeed = options.baseSeed ?? 12345;
    const targetScenarios = options.scenarioId
      ? this.scenarios.filter((s) => s.id === options.scenarioId)
      : this.scenarios;

    const results: ScenarioAggregateMetrics[] = [];

    for (const scenario of targetScenarios) {
      let army0Wins = 0;
      let army1Wins = 0;
      let draws = 0;
      let totalTurns = 0;
      let minTurns = Infinity;
      let maxTurns = -Infinity;
      let totalDmg0 = 0;
      let totalDmg1 = 0;
      let totalStamina0 = 0;
      let totalStamina1 = 0;
      let totalMoraleBreaks0 = 0;
      let totalMoraleBreaks1 = 0;
      let totalFriendlyFire = 0;

      const unitSurvivals: Record<string, { aliveModelsSum: number; count: number; initialCount: number }> = {};

      for (let r = 0; r < runs; r++) {
        const seed = baseSeed + r * 1000 + 7;
        const res = this.runScenarioBattle(scenario, seed, options);

        if (res.victorArmyIndex === 0) army0Wins++;
        else if (res.victorArmyIndex === 1) army1Wins++;
        else draws++;

        totalTurns += res.turnsTaken;
        minTurns = Math.min(minTurns, res.turnsTaken);
        maxTurns = Math.max(maxTurns, res.turnsTaken);

        totalDmg0 += res.totalDamageDealt[0];
        totalDmg1 += res.totalDamageDealt[1];
        totalStamina0 += res.totalStaminaSpent[0];
        totalStamina1 += res.totalStaminaSpent[1];
        totalMoraleBreaks0 += res.moraleBreaks[0];
        totalMoraleBreaks1 += res.moraleBreaks[1];
        totalFriendlyFire += res.friendlyFireEvents;

        for (const c of res.survivingCreatures) {
          const name = c.stats.traits.join(",") || `type_${c.creatureType}`;
          if (!unitSurvivals[name]) {
            unitSurvivals[name] = { aliveModelsSum: 0, count: 0, initialCount: c.stats.model_count };
          }
          unitSurvivals[name].aliveModelsSum += c.aliveModelCount;
          unitSurvivals[name].count++;
        }
      }

      const survivingSummary: Record<string, { aliveModelsAvg: number; initialCount: number }> = {};
      for (const [k, v] of Object.entries(unitSurvivals)) {
        survivingSummary[k] = {
          aliveModelsAvg: Math.round((v.aliveModelsSum / runs) * 100) / 100,
          initialCount: v.initialCount,
        };
      }

      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        totalRuns: runs,
        army0Wins,
        army1Wins,
        draws,
        army0WinRate: Math.round((army0Wins / runs) * 1000) / 10,
        army1WinRate: Math.round((army1Wins / runs) * 1000) / 10,
        drawRate: Math.round((draws / runs) * 1000) / 10,
        avgTurns: Math.round((totalTurns / runs) * 10) / 10,
        minTurns: minTurns === Infinity ? 0 : minTurns,
        maxTurns: maxTurns === -Infinity ? 0 : maxTurns,
        avgDamageDealt: [Math.round(totalDmg0 / runs), Math.round(totalDmg1 / runs)],
        avgStaminaSpent: [Math.round(totalStamina0 / runs), Math.round(totalStamina1 / runs)],
        avgMoraleBreaks: [
          Math.round((totalMoraleBreaks0 / runs) * 100) / 100,
          Math.round((totalMoraleBreaks1 / runs) * 100) / 100,
        ],
        totalFriendlyFireEvents: totalFriendlyFire,
        avgFriendlyFireEvents: Math.round((totalFriendlyFire / runs) * 100) / 100,
        survivingUnitsSummary: survivingSummary,
      });
    }

    return results;
  }
}

// CLI Execution entry point
export function runCli(): void {
  const args = process.argv.slice(2);
  let runs = 100;
  let scenarioId: string | undefined;
  let seed = 42;

  for (const arg of args) {
    if (arg.startsWith("--runs=")) {
      runs = parseInt(arg.split("=")[1], 10) || 100;
    } else if (arg.startsWith("--scenario=")) {
      scenarioId = arg.split("=")[1];
    } else if (arg.startsWith("--seed=")) {
      seed = parseInt(arg.split("=")[1], 10) || 42;
    }
  }

  console.log("===============================================================================");
  console.log("             HEXES OF BATTLE - HEADLESS BATCH SIMULATION HARNESS               ");
  console.log("===============================================================================");
  console.log(`Runs per scenario: ${runs} | Base seed: ${seed}`);

  const runner = new BatchSimulationRunner();
  const results = runner.runBatch({ runs, baseSeed: seed, scenarioId });

  console.log("\n--- BATCH COMBAT SIMULATION SUMMARY ---");
  for (const res of results) {
    console.log(`\nScenario: [${res.scenarioId}] ${res.scenarioName}`);
    console.log(`-------------------------------------------------------------------------------`);
    console.log(`Total Battles:        ${res.totalRuns}`);
    console.log(`Army 0 (P1) Win Rate: ${res.army0WinRate}% (${res.army0Wins} wins)`);
    console.log(`Army 1 (P2) Win Rate: ${res.army1WinRate}% (${res.army1Wins} wins)`);
    console.log(`Draw Rate:            ${res.drawRate}% (${res.draws} draws)`);
    console.log(`Average Turns Taken:  ${res.avgTurns} (min: ${res.minTurns}, max: ${res.maxTurns})`);
    console.log(`Avg Damage Dealt:     P1: ${res.avgDamageDealt[0]} | P2: ${res.avgDamageDealt[1]}`);
    console.log(`Avg Stamina Expended: P1: ${res.avgStaminaSpent[0]} | P2: ${res.avgStaminaSpent[1]}`);
    console.log(`Avg Morale Breaks:    P1: ${res.avgMoraleBreaks[0]} | P2: ${res.avgMoraleBreaks[1]}`);
    console.log(`Friendly Fire Events: Total: ${res.totalFriendlyFireEvents} (Avg: ${res.avgFriendlyFireEvents}/battle)`);
  }
  console.log("\n===============================================================================\n");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("batch-runner")) {
  runCli();
}
