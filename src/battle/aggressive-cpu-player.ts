import { Battle } from "../battle";
import { Coords } from "../shared";
import { HexDirection, HexFlankStatus } from "../shared/hex-map";
import { BaseCPUPlayer } from "./base-cpu-player";
import { Creature } from "./creature";
import { CPUPersonalityType } from "./cpu-player";

/**
 * Aggressive CPU Player - "The Headhunter"
 * Focuses on eliminating enemy units at all costs, targeting squishy and low-health targets,
 * aggressively pursuing flanking/backstabs, and disregarding incoming counterattack damage.
 */
export class AggressiveCPUPlayer extends BaseCPUPlayer {
  public readonly personalityName: string = CPUPersonalityType.AGGRESSIVE;

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

      // Base damage score
      let score = calc.avgDamage * 10;

      // Priority 1: Lethal elimination (deny enemy action economy)
      if (calc.willKill) {
        score += 1000;
      }

      // Priority 2: Target squishy or wounded units
      const hpRemaining = defender.live_stats.remaining_health;
      score += Math.max(0, 50 - hpRemaining * 3);

      // Priority 3: Eliminate dangerous ranged units
      if (defender.live_stats.is_ranged) {
        score += 100;
      }

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

      let score = calc.avgDamage * 10;

      // Lethal kill bonus
      if (calc.willKill) {
        score += 1000;
      }

      // Backstab and flank tactical bonuses
      if (flankInfo.flankStatus === HexFlankStatus.BACKSTAB) {
        score += 150;
      } else if (flankInfo.flankStatus === HexFlankStatus.FLANK) {
        score += 75;
      }

      // Target squishy ranged or low-health enemies
      if (defender.live_stats.is_ranged) {
        score += 80;
      }

      const hpRemaining = defender.live_stats.remaining_health;
      score += Math.max(0, 50 - hpRemaining * 3);

      if (score > highestScore) {
        highestScore = score;
        bestResult = { target: targetCoords, direction: flankInfo.direction };
      }
    }

    return bestResult ?? { target: candidates[0], direction: HexDirection.NONE };
  }

  protected override chooseMoveDestination(creature: Creature): Coords | null {
    const enemies = this.getEnemies();
    if (enemies.length === 0) return null;

    // Pick highest priority target to pursue: lowest HP and ranged units
    let targetEnemy = enemies[0];
    let highestPriority = -Infinity;

    for (const enemy of enemies) {
      let priority = (enemy.stats.health - enemy.live_stats.remaining_health) * 2;
      if (enemy.live_stats.is_ranged) {
        priority += 50;
      }
      if (enemy.live_stats.remaining_health <= 6) {
        priority += 100;
      }
      if (priority > highestPriority) {
        highestPriority = priority;
        targetEnemy = enemy;
      }
    }

    const longPath = this.findLongPathToTarget(creature.position, targetEnemy.position);
    if (longPath.length === 0) {
      // Fallback to first reachable enemy
      return super.chooseMoveDestination(creature);
    }

    const numMoves = creature.stats.remaining_movement;
    if (numMoves <= 0) return null;

    const stepIndex = Math.min(numMoves, longPath.length) - 1;
    return longPath[stepIndex] ?? null;
  }
}
