import { ArmyControlType, Battle } from "../battle";
import { checkFlankingStatus, HexDirection, HexFlankStatus, HexMap } from "../shared/hex-map";
import { Coords } from "../shared";
import { HobGUID } from "./guid";
import { BattleHexMapPath } from "./battle-hex-map-path";
import { NumMatrix } from "../shared/num-matrix";
import { Creature } from "./creature";
import { CPUPlayer } from "./cpu-player";
import { BattleActionType } from "./battle-action";
import { calculateDamageWithTraits } from "./trait-system";
import { AbilityTarget, AbilityType } from "./ability";

export enum CPUPlayerState {
  NONE = 0,
  SELECT_UNIT,
  DECIDE_ACTION_FOR_SELECTED_UNIT,
  SELECT_MOVE,
  SELECT_ATTACK,
  SELECT_ABILITY,
  SELECT_REST,
  SELECT_END_TURN,
}

export abstract class BaseCPUPlayer implements CPUPlayer {
  public abstract readonly personalityName: string;

  public static MAX_SEARCH_RANGE = 20;

  protected state: CPUPlayerState = CPUPlayerState.NONE;
  protected targetCoords: Coords = { x: 0, y: 0 };
  protected attackDirection: HexDirection = HexDirection.NONE;
  protected attackMeleePreference: boolean = false;
  protected selectedAbilityIndex: number = -1;
  protected moveDestinationCoords: Coords = { x: 0, y: 0 };
  protected handledCreatures: HobGUID[] = [];

  constructor(protected battle: Battle) {}

  public reset(): void {
    this.state = CPUPlayerState.NONE;
    this.targetCoords = { x: 0, y: 0 };
    this.attackDirection = HexDirection.NONE;
    this.attackMeleePreference = false;
    this.selectedAbilityIndex = -1;
    this.moveDestinationCoords = { x: 0, y: 0 };
    this.handledCreatures = [];
  }

  public update(_deltaInMilliseconds: number): void {
    if (this.battle.army_control[this.battle.currentArmyIndex] !== ArmyControlType.AI) {
      return;
    }

    if (this.battle.hasRunningActions()) {
      return;
    }

    if (this.battle.isFinished()) {
      return;
    }

    switch (this.state) {
      case CPUPlayerState.NONE:
        this.selectAction();
        break;
      case CPUPlayerState.SELECT_UNIT:
        this.selectUnit();
        break;
      case CPUPlayerState.DECIDE_ACTION_FOR_SELECTED_UNIT:
        this.decideAction();
        break;
      case CPUPlayerState.SELECT_MOVE:
        this.moveSelected();
        break;
      case CPUPlayerState.SELECT_ATTACK:
        this.selectAttack();
        break;
      case CPUPlayerState.SELECT_ABILITY:
        this.selectAbility();
        break;
      case CPUPlayerState.SELECT_REST:
        this.selectRest();
        break;
      case CPUPlayerState.SELECT_END_TURN:
        this.selectEndTurn();
        break;
    }
  }

  protected selectAction(): void {
    this.handledCreatures = [];
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected selectUnit(): void {
    let pivotGUID: HobGUID | null = null;
    let keepSearching = true;

    while (keepSearching) {
      if (this.battle.isFinished()) {
        return;
      }
      this.battle.selectNextUnitAndGetIndex();
      const selectedCreature = this.battle.getSelectedCreature();
      if (!selectedCreature) {
        this.state = CPUPlayerState.SELECT_END_TURN;
        return;
      }

      if (pivotGUID === null) {
        pivotGUID = selectedCreature.GUID;
      } else if (pivotGUID.equals(selectedCreature.GUID)) {
        this.state = CPUPlayerState.SELECT_END_TURN;
        return;
      }

      if (!this.hasHandledCreature(selectedCreature.GUID)) {
        this.state = CPUPlayerState.DECIDE_ACTION_FOR_SELECTED_UNIT;
        return;
      }
    }
  }

  protected decideAction(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature) {
      this.state = CPUPlayerState.SELECT_END_TURN;
      return;
    }

    if (selectedCreature.live_stats.remaining_attacks <= 0 && selectedCreature.live_stats.remaining_movement <= 0) {
      this.markCreatureHandled(selectedCreature.GUID);
      this.state = CPUPlayerState.SELECT_UNIT;
      return;
    }

    // 0a. Active Healing Ability Decision (e.g. Mend Wounds, Patch Up)
    if (selectedCreature.live_stats.remaining_attacks > 0) {
      const healChoice = this.chooseHealAbilityAction(selectedCreature);
      if (healChoice) {
        this.selectedAbilityIndex = healChoice.abilityIndex;
        this.targetCoords = healChoice.target;
        this.attackDirection = HexDirection.NONE;
        this.attackMeleePreference = false;
        this.state = CPUPlayerState.SELECT_ABILITY;
        return;
      }
    }

    // 0b. Active Ranged Damage Ability Decision (e.g. Spearman's Throw Javelin)
    if (selectedCreature.live_stats.remaining_attacks > 0) {
      const damageAbilityChoice = this.chooseDamageAbilityAction(selectedCreature);
      if (damageAbilityChoice) {
        this.selectedAbilityIndex = damageAbilityChoice.abilityIndex;
        this.targetCoords = damageAbilityChoice.target;
        this.attackDirection = HexDirection.NONE;
        this.attackMeleePreference = false;
        this.state = CPUPlayerState.SELECT_ABILITY;
        return;
      }
    }

    // 1. Ranged Attack & Quick Draw Decision
    if (selectedCreature.live_stats.is_ranged && selectedCreature.live_stats.remaining_ammo > 0 && selectedCreature.live_stats.remaining_attacks > 0) {
      const rangedTargets = this.findRangedTargets(selectedCreature);
      if (rangedTargets.length > 0) {
        const target = this.chooseRangedTarget(selectedCreature, rangedTargets);
        if (target) {
          this.targetCoords = target;
          this.attackDirection = HexDirection.NONE;
          this.attackMeleePreference = false;
          const quickDrawIndex = this.findQuickDrawAbilityIndex(selectedCreature, target);
          if (quickDrawIndex >= 0 && this.shouldUseQuickDraw(selectedCreature, target)) {
            this.selectedAbilityIndex = quickDrawIndex;
            this.state = CPUPlayerState.SELECT_ABILITY;
          } else {
            this.state = CPUPlayerState.SELECT_ATTACK;
          }
          return;
        }
      }
    }

    // 2. Melee Attack Decision
    if (selectedCreature.live_stats.remaining_attacks > 0) {
      const meleeTargets = this.findMeleeTargets();
      if (meleeTargets.length > 0) {
        const result = this.chooseMeleeTarget(selectedCreature, meleeTargets);
        if (result) {
          this.targetCoords = result.target;
          this.attackDirection = result.direction;
          this.attackMeleePreference = true;
          this.state = CPUPlayerState.SELECT_ATTACK;
          return;
        }
      }
    }

    // 3. Movement Decision (including healer movement towards wounded allies)
    if (selectedCreature.live_stats.remaining_movement > 0) {
      const healerDestination = this.chooseHealerMoveDestination(selectedCreature);
      const destination = healerDestination ?? this.chooseMoveDestination(selectedCreature);
      if (
        destination &&
        (destination.x !== selectedCreature.position.x || destination.y !== selectedCreature.position.y)
      ) {
        this.moveDestinationCoords = destination;
        this.state = CPUPlayerState.SELECT_MOVE;
        return;
      }
    }

    // 4. If winded/exhausted with no other good action, rest
    if (selectedCreature.stats.stamina < selectedCreature.stats.max_stamina * 0.5) {
      this.state = CPUPlayerState.SELECT_REST;
      return;
    }

    this.markCreatureHandled(selectedCreature.GUID);
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected selectAbility(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature || this.selectedAbilityIndex < 0) {
      this.state = CPUPlayerState.SELECT_UNIT;
      return;
    }

    this.battle.selectActiveAbilityForCurrentUnit(this.selectedAbilityIndex, selectedCreature);
    const applied = this.battle.selectTargetForAbility(this.targetCoords, HexDirection.NONE);
    if (!applied) {
      this.battle.cancelTargetForAbilityIfApplicable();
    }

    this.selectedAbilityIndex = -1;
    this.markCreatureHandled(selectedCreature.GUID);
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected chooseHealAbilityAction(creature: Creature): { abilityIndex: number; target: Coords } | null {
    if (!creature.abilities || creature.abilities.length === 0) return null;

    for (let i = 0; i < creature.abilities.length; i++) {
      const ability = creature.abilities[i];
      if (!ability || ability.abilityType !== AbilityType.Active) continue;
      if (!this.battle.isHealAbility(ability)) continue;
      if (!this.battle.verifyAbilityUseByCreatureHasResources(ability, creature)) continue;

      const range = this.battle.getAbilityRange(ability, creature);
      const allies = this.getAllies(creature.armyAlignment);

      let bestAlly: Creature | null = null;
      let highestMissingHealth = 0;

      for (const ally of allies) {
        if (!ally.isAlive) continue;
        const missingHealth = ally.stats.health - ally.live_stats.remaining_health;
        if (missingHealth <= 0) continue;

        const isSelf = ally.GUID.equals(creature.GUID);
        if (isSelf && !ability.allowedTargets.includes(AbilityTarget.Self)) continue;
        if (!isSelf && !ability.allowedTargets.includes(AbilityTarget.Allies)) continue;

        const dist = HexMap.getHexDistance(creature.position, ally.position);
        if (dist <= range) {
          if (missingHealth > highestMissingHealth) {
            highestMissingHealth = missingHealth;
            bestAlly = ally;
          }
        }
      }

      if (bestAlly) {
        return { abilityIndex: i, target: { ...bestAlly.position } };
      }
    }

    return null;
  }

  protected chooseDamageAbilityAction(creature: Creature): { abilityIndex: number; target: Coords } | null {
    if (!creature.abilities || creature.abilities.length === 0) return null;

    for (let i = 0; i < creature.abilities.length; i++) {
      const ability = creature.abilities[i];
      if (!ability || ability.abilityType !== AbilityType.Active) continue;
      if (!this.battle.isDamageAbility(ability) || this.battle.isQuickDrawAbility(ability)) continue;
      if (!this.battle.verifyAbilityUseByCreatureHasResources(ability, creature)) continue;
      if (!ability.allowedTargets.includes(AbilityTarget.Enemies)) continue;

      const range = this.battle.getAbilityRange(ability, creature);
      const enemies = this.getEnemies(creature.armyAlignment);
      const candidateCoords: Coords[] = [];

      for (const enemy of enemies) {
        const dist = HexMap.getHexDistance(creature.position, enemy.position);
        if (dist <= range) {
          candidateCoords.push({ ...enemy.position });
        }
      }

      if (candidateCoords.length > 0) {
        const target = this.chooseRangedTarget(creature, candidateCoords) ?? candidateCoords[0];
        return { abilityIndex: i, target };
      }
    }

    return null;
  }

  protected findQuickDrawAbilityIndex(creature: Creature, targetCoords: Coords): number {
    if (!creature.abilities || creature.abilities.length === 0) return -1;
    if (!this.battle.canCreatureUseQuickDraw(creature)) return -1;

    for (let i = 0; i < creature.abilities.length; i++) {
      const ability = creature.abilities[i];
      if (this.battle.isQuickDrawAbility(ability)) {
        const range = this.battle.getAbilityRange(ability, creature);
        const dist = HexMap.getHexDistance(creature.position, targetCoords);
        if (dist <= range) {
          return i;
        }
      }
    }
    return -1;
  }

  protected shouldUseQuickDraw(attacker: Creature, targetCoords: Coords): boolean {
    if (!this.battle.canCreatureUseQuickDraw(attacker)) return false;
    const defender = this.getCreatureAt(targetCoords);
    if (!defender || !defender.isAlive) return false;
    return true;
  }

  protected chooseHealerMoveDestination(creature: Creature): Coords | null {
    if (!creature.abilities || creature.abilities.length === 0) return null;
    const hasUsableHeal = creature.abilities.some(
      (a) =>
        a &&
        a.abilityType === AbilityType.Active &&
        this.battle.isHealAbility(a) &&
        this.battle.verifyAbilityUseByCreatureHasResources(a, creature)
    );
    if (!hasUsableHeal) return null;

    const woundedAllies = this.getAllies(creature.armyAlignment).filter(
      (ally) =>
        ally.isAlive &&
        !ally.GUID.equals(creature.GUID) &&
        ally.live_stats.remaining_health < ally.stats.health
    );
    if (woundedAllies.length === 0) return null;

    let targetAlly = woundedAllies[0];
    let bestDist = Infinity;
    for (const ally of woundedAllies) {
      const dist = HexMap.getHexDistance(creature.position, ally.position);
      if (dist < bestDist) {
        bestDist = dist;
        targetAlly = ally;
      }
    }

    const neighbours = this.battle.hexMap.getNeighbours(targetAlly.position);
    for (const n of neighbours) {
      if (this.battle.getCreatureAtPosition(n) && (n.x !== creature.pos.x || n.y !== creature.pos.y)) {
        continue;
      }
      const longPath = this.findLongPathToTarget(creature.position, n);
      if (longPath.length > 0) {
        const numMoves = creature.live_stats.remaining_movement;
        const stepIndex = Math.min(numMoves, longPath.length) - 1;
        if (stepIndex >= 0 && longPath[stepIndex]) {
          return longPath[stepIndex];
        }
      }
    }

    return null;
  }

  protected selectRest(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (selectedCreature) {
      this.battle.restActiveCreature();
      this.markCreatureHandled(selectedCreature.GUID);
    }
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected moveSelected(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature) {
      this.state = CPUPlayerState.SELECT_UNIT;
      return;
    }

    const prevMoves = selectedCreature.live_stats.remaining_movement;
    const prevAttacks = selectedCreature.live_stats.remaining_attacks;
    this.battle.moveOrAttackWithActiveCreatureAtLocation(this.moveDestinationCoords, HexDirection.NONE);
    const didAct =
      this.battle.hasRunningActions() ||
      selectedCreature.live_stats.remaining_movement < prevMoves ||
      selectedCreature.live_stats.remaining_attacks < prevAttacks;

    if (!didAct || selectedCreature.live_stats.remaining_attacks <= 0) {
      this.markCreatureHandled(selectedCreature.GUID);
      this.state = CPUPlayerState.SELECT_UNIT;
    } else {
      this.state = CPUPlayerState.DECIDE_ACTION_FOR_SELECTED_UNIT;
    }
  }

  protected selectAttack(): void {
    const selectedCreature = this.battle.getSelectedCreature();
    if (!selectedCreature) {
      this.state = CPUPlayerState.SELECT_UNIT;
      return;
    }

    this.battle.moveOrAttackWithActiveCreatureAtLocation(
      this.targetCoords,
      this.attackDirection,
      this.attackMeleePreference
    );

    this.markCreatureHandled(selectedCreature.GUID);
    this.state = CPUPlayerState.SELECT_UNIT;
  }

  protected hasHandledCreature(guid: HobGUID): boolean {
    return this.handledCreatures.some((g) => g.equals(guid));
  }

  protected markCreatureHandled(guid: HobGUID): void {
    if (!this.hasHandledCreature(guid)) {
      this.handledCreatures.push(guid);
    }
  }

  protected findRangedTargets(_creature: Creature): Coords[] {
    const targets: Coords[] = [];
    const otherArmyIndex = this.battle.currentArmyIndex === 0 ? 1 : 0;

    for (let x = 0; x < this.battle.rangereach_targets.length; x++) {
      for (let y = 0; y < this.battle.rangereach_targets[x].length; y++) {
        if (this.battle.rangereach_targets[x][y] === BattleHexMapPath.CELL_ENEMY) {
          const creatureInBattle = this.battle.getCreatureAtPosition({ x, y });
          if (creatureInBattle && creatureInBattle.indexOFArmy === otherArmyIndex) {
            targets.push({ x, y });
          }
        }
      }
    }
    return targets;
  }

  protected findMeleeTargets(): Coords[] {
    const enemies = this.battle.getReachableMeleeEnemies();
    return enemies.map((reachData) => reachData.coords);
  }

  protected chooseRangedTarget(_attacker: Creature, candidates: Coords[]): Coords | null {
    if (candidates.length === 0) return null;
    return candidates[0];
  }

  protected chooseMeleeTarget(
    attacker: Creature,
    candidates: Coords[]
  ): { target: Coords; direction: HexDirection } | null {
    if (candidates.length === 0) return null;
    const target = candidates[0];
    const flankInfo = this.findBestMeleeFlankDirection(attacker, target);
    return { target, direction: flankInfo.direction };
  }

  protected chooseMoveDestination(creature: Creature): Coords | null {
    const enemies = this.getEnemies();
    if (enemies.length === 0) return null;

    let bestDist = Infinity;
    let targetEnemy = enemies[0];
    for (const enemy of enemies) {
      const dist = Math.abs(creature.pos.x - enemy.pos.x) + Math.abs(creature.pos.y - enemy.pos.y);
      if (dist < bestDist) {
        bestDist = dist;
        targetEnemy = enemy;
      }
    }

    const neighbours = this.battle.hexMap.getNeighbours(targetEnemy.position);
    for (const n of neighbours) {
      if (this.battle.getCreatureAtPosition(n) && (n.x !== creature.pos.x || n.y !== creature.pos.y)) {
        continue;
      }
      const longPath = this.findLongPathToTarget(creature.position, n);
      if (longPath.length > 0) {
        const numMoves = creature.live_stats.remaining_movement;
        const stepIndex = Math.min(numMoves, longPath.length) - 1;
        if (stepIndex >= 0 && longPath[stepIndex]) {
          return longPath[stepIndex];
        }
      }
    }

    return null;
  }

  protected selectEndTurn(): void {
    this.handledCreatures = [];
    this.state = CPUPlayerState.NONE;
    this.battle.nextTurn();
  }

  public getEnemies(armyIndex: number = this.battle.currentArmyIndex): Creature[] {
    return this.battle.creatures.filter((c) => c.armyAlignment !== armyIndex && c.isAlive);
  }

  public getAllies(armyIndex: number = this.battle.currentArmyIndex): Creature[] {
    return this.battle.creatures.filter((c) => c.armyAlignment === armyIndex && c.isAlive);
  }

  public getCreatureAt(coords: Coords): Creature | null {
    const entry = this.battle.getCreatureAtPosition(coords);
    return entry ? entry.creature : null;
  }

  public calculateExpectedMeleeDamage(
    attacker: Creature,
    defender: Creature,
    direction: HexDirection = HexDirection.NONE
  ): { damageMin: number; damageMax: number; avgDamage: number; willKill: boolean; flankStatus: HexFlankStatus } {
    let flankBonus = 0;
    let flankStatus = HexFlankStatus.NONE;

    if (direction !== HexDirection.NONE) {
      flankStatus = checkFlankingStatus(defender.facingDirection, direction);
      if (flankStatus === HexFlankStatus.BACKSTAB) {
        flankBonus = this.battle.combatConfig.facing.rear.damageBonus;
      } else if (flankStatus === HexFlankStatus.FLANK) {
        flankBonus = this.battle.combatConfig.facing.flank.damageBonus;
      }
    }

    const mult = attacker.getDamageOutputMultiplier();
    const minAtk = Math.round(attacker.live_stats.attack_melee_low * mult);
    const maxAtk = Math.round(attacker.live_stats.attack_melee_high * mult);
    const def = defender.live_stats.defense_melee;
    const traitsConfig = this.battle.traitsConfig;

    const damageMin = calculateDamageWithTraits({
      attacker,
      defender,
      attackType: BattleActionType.ATTACK_MELEE,
      baseDamage: minAtk,
      facingBonus: flankBonus,
      targetArmor: def,
      attackFromDir: direction,
      flankStatus,
      traitsConfig,
      commit: false,
    }).damage;

    const damageMax = calculateDamageWithTraits({
      attacker,
      defender,
      attackType: BattleActionType.ATTACK_MELEE,
      baseDamage: maxAtk,
      facingBonus: flankBonus,
      targetArmor: def,
      attackFromDir: direction,
      flankStatus,
      traitsConfig,
      commit: false,
    }).damage;

    const avgDamage = (damageMin + damageMax) / 2;
    const willKill = avgDamage >= defender.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKill, flankStatus };
  }

  public calculateExpectedRangedDamage(
    attacker: Creature,
    defender: Creature
  ): { damageMin: number; damageMax: number; avgDamage: number; willKill: boolean } {
    const mult = attacker.getDamageOutputMultiplier();
    const minAtk = Math.round(attacker.live_stats.attack_ranged_low * mult);
    const maxAtk = Math.round(attacker.live_stats.attack_ranged_high * mult);
    const def = defender.live_stats.defense_ranged;
    const traitsConfig = this.battle.traitsConfig;

    const damageMin = calculateDamageWithTraits({
      attacker,
      defender,
      attackType: BattleActionType.ATTACK_RANGED,
      baseDamage: minAtk,
      targetArmor: def,
      traitsConfig,
      commit: false,
    }).damage;

    const damageMax = calculateDamageWithTraits({
      attacker,
      defender,
      attackType: BattleActionType.ATTACK_RANGED,
      baseDamage: maxAtk,
      targetArmor: def,
      traitsConfig,
      commit: false,
    }).damage;

    const avgDamage = (damageMin + damageMax) / 2;
    const willKill = avgDamage >= defender.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKill };
  }

  public canDefenderCounterattack(_attacker: Creature, defender: Creature): boolean {
    if (defender.live_stats.remaining_counterattacks <= 0) return false;
    if (defender.stats.stamina < this.battle.combatConfig.retaliation.minStamina) return false;
    if (defender.isExhausted || defender.isPanickedOrRouting) return false;
    return true;
  }

  public calculateCounterattackDamage(
    defender: Creature,
    attacker: Creature
  ): { damageMin: number; damageMax: number; avgDamage: number; willKillAttacker: boolean } {
    const mult = defender.getDamageOutputMultiplier();
    const minAtk = Math.round(defender.live_stats.attack_melee_low * mult);
    const maxAtk = Math.round(defender.live_stats.attack_melee_high * mult);
    const def = attacker.live_stats.defense_melee;
    const traitsConfig = this.battle.traitsConfig;

    const damageMin = calculateDamageWithTraits({
      attacker: defender,
      defender: attacker,
      attackType: BattleActionType.COUNTER_ATTACK_MELEE,
      baseDamage: minAtk,
      targetArmor: def,
      traitsConfig,
      commit: false,
    }).damage;

    const damageMax = calculateDamageWithTraits({
      attacker: defender,
      defender: attacker,
      attackType: BattleActionType.COUNTER_ATTACK_MELEE,
      baseDamage: maxAtk,
      targetArmor: def,
      traitsConfig,
      commit: false,
    }).damage;

    const avgDamage = (damageMin + damageMax) / 2;
    const willKillAttacker = avgDamage >= attacker.live_stats.remaining_health;

    return { damageMin, damageMax, avgDamage, willKillAttacker };
  }

  public findBestMeleeFlankDirection(
    attacker: Creature,
    targetCoords: Coords
  ): { direction: HexDirection; flankStatus: HexFlankStatus } {
    const targetCreature = this.getCreatureAt(targetCoords);
    if (!targetCreature) {
      return { direction: HexDirection.NONE, flankStatus: HexFlankStatus.NONE };
    }

    let bestDir = HexDirection.NONE;
    let bestFlank = HexFlankStatus.NONE;

    for (let dir = HexDirection.EAST; dir <= HexDirection.SOUTHEAST; dir++) {
      const neighbour = this.battle.hexMap.getNeighbourInDirection(targetCoords, dir);
      if (!neighbour) continue;

      const occupant = this.getCreatureAt(neighbour);
      if (occupant && occupant !== attacker) continue;

      if (
        this.battle.pathfinding_tiles[neighbour.x]?.[neighbour.y] > 0 ||
        (attacker.position.x === neighbour.x && attacker.position.y === neighbour.y)
      ) {
        const flank = checkFlankingStatus(targetCreature.facingDirection, dir);
        if (flank === HexFlankStatus.BACKSTAB) {
          return { direction: dir, flankStatus: HexFlankStatus.BACKSTAB };
        }
        if (flank === HexFlankStatus.FLANK && bestFlank !== HexFlankStatus.FLANK) {
          bestDir = dir;
          bestFlank = HexFlankStatus.FLANK;
        } else if (bestDir === HexDirection.NONE) {
          bestDir = dir;
          bestFlank = flank;
        }
      }
    }

    return { direction: bestDir, flankStatus: bestFlank };
  }

  public findLongPathToTarget(from: Coords, to: Coords, maxRange: number = BaseCPUPlayer.MAX_SEARCH_RANGE): Coords[] {
    const altTiles: number[][] = [];
    NumMatrix.initializeToSize(altTiles, this.battle.hexMap.width, this.battle.hexMap.height);

    const highlightUnitsInArmies: number[] = [];
    const otherArmyIndex = this.battle.currentArmyIndex === 0 ? 1 : 0;
    highlightUnitsInArmies.push(otherArmyIndex);

    const terrainCostsRecord: Record<number, number> = {};
    const activeCreature = this.battle.getActiveCreature() ?? undefined;
    for (let t = 0; t <= 5; t++) terrainCostsRecord[t] = this.battle.getMoveCostForTerrain(t, activeCreature);

    const longUnitReachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
      this.battle.hexMap,
      from,
      maxRange,
      altTiles,
      terrainCostsRecord,
      {
        occupation_tiles: this.battle.cached_occupation_tiles,
        terrain_tiles: this.battle.terrain_tiles,
        creatures: this.battle.creatures,
      },
      { markUnitsInArmies: highlightUnitsInArmies }
    );

    if (longUnitReachData.length === 0) return [];
    const foundEntry = longUnitReachData.some((entry) => entry.coords.x === to.x && entry.coords.y === to.y);
    if (!foundEntry) return [];

    return BattleHexMapPath.findPathToCellInReachData(to, longUnitReachData);
  }
}
