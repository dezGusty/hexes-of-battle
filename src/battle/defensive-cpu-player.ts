import { Battle } from "../battle";
import { Coords } from "../shared";
import { HexDirection, HexFlankStatus } from "../shared/hex-map";
import { BaseCPUPlayer } from "./base-cpu-player";
import { Creature } from "./creature";
import { CPUPersonalityType } from "./cpu-player";
import { TerrainType } from "./terrain-types";

/**
 * Defensive CPU Player - "The Fortress"
 * Prioritizes unit preservation, avoiding suicidal counterattacks, utilizing
 * defensive terrain (Hills, Forests), grouping near allies, and preferring safe ranged strikes.
 */
export class DefensiveCPUPlayer extends BaseCPUPlayer {
  public readonly personalityName: string = CPUPersonalityType.DEFENSIVE;

  constructor(battle: Battle) {
    super(battle);
  }

  protected override chooseRangedTarget(attacker: Creature, candidates: Coords[]): Coords | null {
    if (candidates.length === 0) return null;

    let bestTarget: Coords | null = null;
    let highestScore = -Infinity;

    for (const targetCoords of candidates) {
      const defender = this.getCreatureAt(targetCoords);
      if (!defender) continue;

      const calc = this.calculateExpectedRangedDamage(attacker, defender);

      // Ranged attacks are retaliation-free and safe
      let score = calc.avgDamage * 10;

      // Eliminating an enemy prevents future harm to our army
      if (calc.willKill) {
        score += 500;
      }

      // Prioritize threatening enemies close to our lines
      const distToAttacker = Math.abs(attacker.position.x - defender.position.x) + Math.abs(attacker.position.y - defender.position.y);
      score += Math.max(0, 30 - distToAttacker * 5);

      if (score > highestScore) {
        highestScore = score;
        bestTarget = targetCoords;
      }
    }

    return bestTarget ?? candidates[0];
  }

  protected override chooseMeleeTarget(
    attacker: Creature,
    candidates: Coords[]
  ): { target: Coords; direction: HexDirection } | null {
    if (candidates.length === 0) return null;

    let bestResult: { target: Coords; direction: HexDirection } | null = null;
    let highestScore = -Infinity;

    for (const targetCoords of candidates) {
      const defender = this.getCreatureAt(targetCoords);
      if (!defender) continue;

      const flankInfo = this.findBestMeleeFlankDirection(attacker, targetCoords);
      const calc = this.calculateExpectedMeleeDamage(attacker, defender, flankInfo.direction);
      const canCounter = this.canDefenderCounterattack(attacker, defender);
      const counter = this.calculateCounterattackDamage(defender, attacker);

      let score = calc.avgDamage * 5;

      if (calc.willKill) {
        // Safe kill: dead units cannot counterattack
        score += 800;
      } else if (canCounter) {
        // Suicidal attack penalty: do not trade a unit recklessly
        if (counter.willKillAttacker) {
          score -= 5000;
        } else {
          score -= counter.avgDamage * 15;
        }

        // If attacker is already low on health, penalize taking any counterattack
        if (attacker.live_stats.remaining_health < attacker.stats.health * 0.5) {
          score -= 200;
        }
      } else {
        // Free attack bonus: defender has exhausted counterattacks this turn
        score += 250;
      }

      // Positional flanking bonus
      if (flankInfo.flankStatus === HexFlankStatus.BACKSTAB) {
        score += 100;
      } else if (flankInfo.flankStatus === HexFlankStatus.FLANK) {
        score += 50;
      }

      // Terrain defense factor at attacking destination
      if (flankInfo.direction !== HexDirection.NONE) {
        const destNeighbor = this.battle.hexMap.getNeighbourInDirection(targetCoords, flankInfo.direction);
        if (destNeighbor) {
          const terrain = this.battle.getTerrainAt(destNeighbor);
          if (terrain === TerrainType.HILL) score += 40;
          else if (terrain === TerrainType.FOREST) score += 20;
          else if (terrain === TerrainType.SWAMP) score -= 150;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestResult = { target: targetCoords, direction: flankInfo.direction };
      }
    }

    // If the best attack is suicidal or heavily unfavorable, decline to attack
    if (highestScore < 0) {
      return null;
    }

    return bestResult;
  }

  protected override chooseMoveDestination(creature: Creature): Coords | null {
    const enemies = this.getEnemies();
    if (enemies.length === 0) return null;

    const isWounded = creature.live_stats.remaining_health <= creature.stats.health * 0.4;

    // Find the closest enemy
    let closestEnemy = enemies[0];
    let shortestDist = Infinity;
    for (const enemy of enemies) {
      const dist = Math.abs(creature.position.x - enemy.position.x) + Math.abs(creature.position.y - enemy.position.y);
      if (dist < shortestDist) {
        shortestDist = dist;
        closestEnemy = enemy;
      }
    }

    // Path towards enemy or defensive line
    const longPath = this.findLongPathToTarget(creature.position, closestEnemy.position);
    if (longPath.length === 0) {
      return null;
    }

    const numMoves = creature.stats.remaining_movement;
    if (numMoves <= 0) return null;

    const maxSteps = Math.min(numMoves, longPath.length);

    // If wounded and an enemy is dangerously close (dist <= 2), avoid stepping closer!
    if (isWounded && maxSteps > 1) {
      // Hold position or take a shorter step if safe
      return null;
    }

    // Evaluate candidate steps along the path to avoid stopping in Swamps and favor Hills/Forests
    let bestStepIndex = maxSteps - 1;
    let bestStepScore = -Infinity;

    for (let i = maxSteps - 1; i >= 0; i--) {
      const coord = longPath[i];
      let stepScore = 0;

      const terrain = this.battle.getTerrainAt(coord);
      if (terrain === TerrainType.HILL) stepScore += 50;
      else if (terrain === TerrainType.FOREST) stepScore += 30;
      else if (terrain === TerrainType.SWAMP) stepScore -= 100;

      // Ally proximity bonus (phalanx support)
      const neighbours = this.battle.hexMap.getNeighbours(coord);
      for (const n of neighbours) {
        const ally = this.getCreatureAt(n);
        if (ally && ally.armyAlignment === creature.armyAlignment && ally !== creature) {
          stepScore += 15;
        }
      }

      // Preference for advancing further unless terrain is terrible
      stepScore += i * 5;

      if (stepScore > bestStepScore) {
        bestStepScore = stepScore;
        bestStepIndex = i;
      }
    }

    return longPath[bestStepIndex] ?? null;
  }
}
