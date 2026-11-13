import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
    volume: vi.fn(),
  },
}));

import { Battle, DamagePreviewResult, InputState } from "../battle";
import { Creature, CreatureType } from "./creature";
import { Ability } from "./ability";
import { HexDirection, HexFlankStatus, HexMap } from "../shared/hex-map";
import { ExhaustionState } from "./combat-rules";
import { TerrainType } from "./terrain-types";
import { BattleActionType } from "./battle-action";
import { DamagePreviewTooltip } from "../ui/damage-preview-tooltip";
import { BattleView3D } from "../render3d/battle-view-3d";
import { Container } from "pixi.js";

describe("Damage Preview & Hover Tooltip System", () => {
  let hexMap: HexMap;
  let battle: Battle;

  beforeEach(() => {
    hexMap = new HexMap(10, 8);
    battle = new Battle(hexMap);
  });

  describe("1. Deterministic Min-Max Damage Calculation", () => {
    it("should accurately calculate min and max melee damage accounting for defender armor", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.facingDirection = HexDirection.EAST;

      const defender = new Creature(CreatureType.SPEARMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.facingDirection = HexDirection.NORTHEAST; // Not facing attacker to avoid spearwall

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(defender.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.attackType).toBe(BattleActionType.ATTACK_MELEE);
      expect(preview.isRanged).toBe(false);
      expect(preview.canAttack).toBe(true);
      expect(preview.targetArmor).toBe(defender.live_stats.defense_melee);

      // Verify that min and max damage are strictly greater than 0 and min <= max
      expect(preview.minDamage).toBeLessThanOrEqual(preview.maxDamage);
      expect(preview.minDamage).toBeGreaterThan(0);
      expect(preview.rawMinDamage).toBeLessThanOrEqual(preview.rawMaxDamage);
    });

    it("should calculate ranged damage preview for ranged units targeting enemies at distance", () => {
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 1, y: 1 };
      archer.armyAlignment = 0;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 4, y: 1 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, defender],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(defender.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.attackType).toBe(BattleActionType.ATTACK_RANGED);
      expect(preview.isRanged).toBe(true);
      expect(preview.targetArmor).toBe(defender.live_stats.defense_ranged);
      expect(preview.minDamage).toBeLessThanOrEqual(preview.maxDamage);
    });

    it("should apply attacker Hill terrain bonus (+1 attack)", () => {
      const swordsmanPlain = new Creature(CreatureType.SWORDSMAN);
      swordsmanPlain.position = { x: 2, y: 2 };
      swordsmanPlain.armyAlignment = 0;
      swordsmanPlain.facingDirection = HexDirection.EAST;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.facingDirection = HexDirection.NORTHEAST;

      // First on Plain terrain
      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [swordsmanPlain, defender],
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(TerrainType.PLAIN)),
      });
      battle.activeCreatureIndex = 0;
      const previewPlain = battle.calculateDamagePreview(defender.position);

      // Now place swordsman on a Hill hex
      const swordsmanHill = new Creature(CreatureType.SWORDSMAN);
      swordsmanHill.position = { x: 2, y: 2 };
      swordsmanHill.armyAlignment = 0;
      swordsmanHill.facingDirection = HexDirection.EAST;

      const defenderHill = new Creature(CreatureType.PEASANT);
      defenderHill.position = { x: 3, y: 2 };
      defenderHill.armyAlignment = 1;
      defenderHill.facingDirection = HexDirection.NORTHEAST;

      const terrainTiles = Array.from({ length: 10 }, () => Array(8).fill(TerrainType.PLAIN));
      terrainTiles[2][2] = TerrainType.HILL;

      const battleHill = new Battle(hexMap);
      battleHill.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [swordsmanHill, defenderHill],
        terrainTiles,
      });
      battleHill.activeCreatureIndex = 0;
      const previewHill = battleHill.calculateDamagePreview(defenderHill.position);

      expect(previewHill).not.toBeNull();
      expect(previewPlain).not.toBeNull();
      if (!previewHill || !previewPlain) return;

      // Attacker on Hill gains +1 attack
      expect(previewHill.minDamage).toBeGreaterThanOrEqual(previewPlain.minDamage + 1);
      expect(previewHill.maxDamage).toBeGreaterThanOrEqual(previewPlain.maxDamage + 1);
      expect(previewHill.attackerModifiers.some((m) => m.includes("Hill"))).toBe(true);
    });

    it("should apply defender Swamp terrain penalty (-1 defense)", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.facingDirection = HexDirection.EAST;

      const defenderSwamp = new Creature(CreatureType.SWORDSMAN);
      defenderSwamp.position = { x: 3, y: 2 };
      defenderSwamp.armyAlignment = 1;
      defenderSwamp.facingDirection = HexDirection.NORTHEAST;

      const terrainTiles = Array.from({ length: 10 }, () => Array(8).fill(TerrainType.PLAIN));
      terrainTiles[3][2] = TerrainType.SWAMP;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defenderSwamp],
        terrainTiles,
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(defenderSwamp.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      // Swamp decreases defense by 1
      expect(preview.defenderModifiers.some((m) => m.includes("Swamp"))).toBe(true);
    });

    it("should reduce damage when attacker suffers stamina exhaustion (Winded 90%, Exhausted 70%, Depleted 50%)", () => {
      const attackerFresh = new Creature(CreatureType.SWORDSMAN);
      attackerFresh.position = { x: 2, y: 2 };
      attackerFresh.armyAlignment = 0;
      attackerFresh.facingDirection = HexDirection.EAST;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.facingDirection = HexDirection.NORTHEAST;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attackerFresh, defender],
      });
      battle.activeCreatureIndex = 0;
      const previewFresh = battle.calculateDamagePreview(defender.position);

      // Now set attacker to EXHAUSTED
      attackerFresh.stats.stamina = 1; // Exhausted state (< 20% of max stamina)
      expect(attackerFresh.exhaustionState).toBe(ExhaustionState.EXHAUSTED);

      const previewExhausted = battle.calculateDamagePreview(defender.position);
      expect(previewExhausted).not.toBeNull();
      expect(previewFresh).not.toBeNull();
      if (!previewExhausted || !previewFresh) return;

      expect(previewExhausted.maxDamage).toBeLessThan(previewFresh.maxDamage);
      expect(previewExhausted.attackerModifiers.some((m) => m.toLowerCase().includes("exhausted"))).toBe(true);
    });

    it("should account for facing direction and apply flank and rear (backstab) damage bonuses", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.facingDirection = HexDirection.EAST;

      const defenderFront = new Creature(CreatureType.PEASANT);
      defenderFront.position = { x: 3, y: 2 };
      defenderFront.armyAlignment = 1;
      defenderFront.facingDirection = HexDirection.WEST; // Faces attacker directly

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defenderFront],
      });
      battle.activeCreatureIndex = 0;
      const previewFront = battle.calculateDamagePreview(defenderFront.position);

      // Turn defender around so attacker strikes from the REAR (backstab)
      defenderFront.facingDirection = HexDirection.EAST; // Facing away from attacker
      const previewBackstab = battle.calculateDamagePreview(defenderFront.position);

      expect(previewFront).not.toBeNull();
      expect(previewBackstab).not.toBeNull();
      if (!previewFront || !previewBackstab) return;

      expect(previewFront.flankStatus).toBe(HexFlankStatus.NONE);
      expect(previewFront.facingBonus).toBe(0);

      expect(previewBackstab.flankStatus).toBe(HexFlankStatus.BACKSTAB);
      expect(previewBackstab.facingBonus).toBe(battle.combatConfig.facing.rear.damageBonus);
      expect(previewBackstab.maxDamage).toBeGreaterThanOrEqual(previewFront.maxDamage + previewBackstab.facingBonus);
      expect(previewBackstab.attackerModifiers.some((m) => m.includes("Backstab"))).toBe(true);
    });

    it("should integrate traits: Volley Fire, Shield Block, Spear Wall, Charge, and Armor Penetration", () => {
      const knight = new Creature(CreatureType.ARMORED_KNIGHT);
      knight.position = { x: 2, y: 2 };
      knight.armyAlignment = 0;
      knight.facingDirection = HexDirection.EAST;

      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.stats.traits = ["SpearWall"];
      spearman.position = { x: 3, y: 2 };
      spearman.armyAlignment = 1;
      spearman.facingDirection = HexDirection.WEST; // Facing knight -> Spear Wall active!

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [knight, spearman],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(spearman.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      // Spear Wall reduces incoming melee damage from front
      expect(preview.spearWallReduction).toBe(battle.traitsConfig.spearWall.damageReduction);
      expect(preview.defenderModifiers.some((m) => m.includes("Spear Wall"))).toBe(true);
    });

    it("should correctly calculate estimated casualty counts and remaining HP bounds", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;

      const peasantDefender = new Creature(CreatureType.PEASANT);
      peasantDefender.position = { x: 3, y: 2 };
      peasantDefender.armyAlignment = 1;
      peasantDefender.stats.remaining_health = 12;
      peasantDefender.stats.model_hp = 3;
      peasantDefender.stats.model_count = 4;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, peasantDefender],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(peasantDefender.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.defenderHpBefore).toBe(12);
      expect(preview.defenderModelsBefore).toBe(4);
      expect(preview.minCasualties).toBeGreaterThanOrEqual(0);
      expect(preview.maxCasualties).toBeGreaterThanOrEqual(preview.minCasualties);
      expect(preview.defenderHpAfterMin).toBeLessThanOrEqual(preview.defenderHpAfterMax);
    });

    it("should flag canAttack as false with appropriate reason when unit cannot attack", () => {
      const attacker = new Creature(CreatureType.PEASANT);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.stats.remaining_attacks = 0; // Out of attacks

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(defender.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.canAttack).toBe(false);
      expect(preview.reasonCannotAttack).toContain("No attacks remaining");
    });

    it("should flag friendly target with canAttack false", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;

      const friendly = new Creature(CreatureType.PEASANT);
      friendly.position = { x: 3, y: 2 };
      friendly.armyAlignment = 0; // Same army

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, friendly],
      });
      battle.activeCreatureIndex = 0;

      const preview = battle.calculateDamagePreview(friendly.position);
      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.canAttack).toBe(false);
      expect(preview.reasonCannotAttack).toContain("friendly unit");
    });
  });

  describe("2. Hover Duration Trigger (> 1000ms) & Tooltip Display", () => {
    it("should not show damage preview if hovered for less than 1000ms", () => {
      const parent = new Container();
      const tooltip = new DamagePreviewTooltip(parent);
      expect(tooltip.isVisible()).toBe(false);

      // Simulate a hover duration accumulator logic at 500ms
      let hoverDuration = 500;
      if (hoverDuration >= 1000) {
        tooltip.show({
          attacker: {} as any,
          defender: {} as any,
          targetHex: { x: 3, y: 2 },
          originHex: { x: 2, y: 2 },
          attackType: BattleActionType.ATTACK_MELEE,
          isRanged: false,
          canAttack: true,
          minDamage: 8,
          maxDamage: 14,
          rawMinDamage: 10,
          rawMaxDamage: 16,
          targetArmor: 2,
          effectiveTargetArmor: 2,
          flankStatus: HexFlankStatus.NONE,
          facingBonus: 0,
          attackerMultiplier: 1.0,
          volleyMultiplier: 1.0,
          chargeMultiplier: 1.0,
          shieldBlockReduction: 0,
          spearWallReduction: 0,
          armorPenetrated: 0,
          defenderHpBefore: 24,
          defenderHpAfterMin: 10,
          defenderHpAfterMax: 16,
          defenderModelsBefore: 4,
          minCasualties: 0,
          maxCasualties: 1,
          traveledHexes: 0,
          attackerModifiers: ["Fresh"],
          defenderModifiers: ["Armor: 2"],
        }, 100, 100);
      }

      expect(tooltip.isVisible()).toBe(false);
    });

    it("should show damage preview when hover duration reaches or exceeds 1000ms", () => {
      const parent = new Container();
      const tooltip = new DamagePreviewTooltip(parent);

      const previewData: DamagePreviewResult = {
        attacker: {} as any,
        defender: {} as any,
        targetHex: { x: 3, y: 2 },
        originHex: { x: 2, y: 2 },
        attackType: BattleActionType.ATTACK_MELEE,
        isRanged: false,
        canAttack: true,
        minDamage: 8,
        maxDamage: 14,
        rawMinDamage: 10,
        rawMaxDamage: 16,
        targetArmor: 2,
        effectiveTargetArmor: 2,
        flankStatus: HexFlankStatus.NONE,
        facingBonus: 0,
        attackerMultiplier: 1.0,
        volleyMultiplier: 1.0,
        chargeMultiplier: 1.0,
        shieldBlockReduction: 0,
        spearWallReduction: 0,
        armorPenetrated: 0,
        defenderHpBefore: 24,
        defenderHpAfterMin: 10,
        defenderHpAfterMax: 16,
        defenderModelsBefore: 4,
        minCasualties: 0,
        maxCasualties: 1,
        traveledHexes: 0,
        attackerModifiers: ["12/12 models (100%)", "Stamina: FRESH"],
        defenderModifiers: ["Defense: 2"],
      };

      let hoverDuration = 1050; // > 1000ms
      if (hoverDuration >= 1000) {
        tooltip.show(previewData, 200, 300, 1920, 1080);
      }

      expect(tooltip.isVisible()).toBe(true);
      expect(tooltip.minDamage).toBe(8);
      expect(tooltip.maxDamage).toBe(14);
      expect(tooltip.previewData).toBe(previewData);

      // Moving away or hiding
      tooltip.hide();
      expect(tooltip.isVisible()).toBe(false);
      expect(tooltip.minDamage).toBe(0);
      expect(tooltip.maxDamage).toBe(0);
    });

    it("should clamp tooltip coordinates so it never clips off-screen", () => {
      const parent = new Container();
      const tooltip = new DamagePreviewTooltip(parent);

      const previewData: DamagePreviewResult = {
        attacker: {} as any,
        defender: {} as any,
        targetHex: { x: 3, y: 2 },
        originHex: { x: 2, y: 2 },
        attackType: BattleActionType.ATTACK_MELEE,
        isRanged: false,
        canAttack: true,
        minDamage: 10,
        maxDamage: 15,
        rawMinDamage: 12,
        rawMaxDamage: 17,
        targetArmor: 2,
        effectiveTargetArmor: 2,
        flankStatus: HexFlankStatus.NONE,
        facingBonus: 0,
        attackerMultiplier: 1.0,
        volleyMultiplier: 1.0,
        chargeMultiplier: 1.0,
        shieldBlockReduction: 0,
        spearWallReduction: 0,
        armorPenetrated: 0,
        defenderHpBefore: 30,
        defenderHpAfterMin: 15,
        defenderHpAfterMax: 20,
        defenderModelsBefore: 5,
        minCasualties: 1,
        maxCasualties: 2,
        traveledHexes: 0,
        attackerModifiers: [],
        defenderModifiers: [],
      };

      // Near right edge of 1920x1080 screen
      tooltip.show(previewData, 1900, 1000, 1920, 1080);
      expect(tooltip.container.position.x + tooltip.panelWidth).toBeLessThanOrEqual(1920);
      expect(tooltip.container.position.y + tooltip.panelHeight).toBeLessThanOrEqual(1080);
      expect(tooltip.container.position.x).toBeGreaterThanOrEqual(12);
      expect(tooltip.container.position.y).toBeGreaterThanOrEqual(12);
    });

    it("should accumulate hover time across frames and trigger damage preview at 1000ms in BattleView3D", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [attacker, defender],
      });
      battle.activeCreatureIndex = 0;

      const mockHud = {
        showDamagePreview: vi.fn(),
        hideDamagePreview: vi.fn(),
      };

      // Simulate BattleView3D hover state and update loop
      const view3DContext: any = {
        battle,
        hexMap,
        hud: mockHud,
        hoveredHex: defender.position,
        hoveredDirection: HexDirection.NONE,
        targetHoverHex: null,
        targetHoverDuration: 0,
        computeAttackAndHoverPaths: () => ({ originHex: attacker.position, isRanged: false }),
        hexBoard: {
          hexToWorldWithElevation: () => ({ x: 3, y: 0, z: 2 }),
        },
        sceneManager: {
          projectToScreen: () => ({ x: 350, y: 250 }),
        },
      };

      // Extract updateDamagePreviewHover method from prototype
      const updateHoverFn = (BattleView3D.prototype as any).updateDamagePreviewHover;

      // Frame 1: 400ms (< 1000ms threshold)
      updateHoverFn.call(view3DContext, 400);
      expect(view3DContext.targetHoverDuration).toBe(400);
      expect(mockHud.showDamagePreview).not.toHaveBeenCalled();

      // Frame 2: +400ms (total 800ms < 1000ms)
      updateHoverFn.call(view3DContext, 400);
      expect(view3DContext.targetHoverDuration).toBe(800);
      expect(mockHud.showDamagePreview).not.toHaveBeenCalled();

      // Frame 3: +300ms (total 1100ms >= 1000ms)
      updateHoverFn.call(view3DContext, 300);
      expect(view3DContext.targetHoverDuration).toBe(1100);
      expect(mockHud.showDamagePreview).toHaveBeenCalledTimes(1);
      const [previewArg, screenX, screenY] = mockHud.showDamagePreview.mock.calls[0];
      expect(previewArg.minDamage).toBeGreaterThan(0);
      expect(screenX).toBe(350);
      expect(screenY).toBe(250);

      // Frame 4: Moving mouse to empty hex resets timer and hides preview
      view3DContext.hoveredHex = { x: 5, y: 5 }; // Empty hex
      updateHoverFn.call(view3DContext, 100);
      expect(view3DContext.targetHoverDuration).toBe(0);
      expect(view3DContext.targetHoverHex).toBeNull();
      expect(mockHud.hideDamagePreview).toHaveBeenCalled();
    });
  });

  describe("6. Skill Target Acquisition Phase Damage Preview", () => {
    it("should calculate Quick Draw double-shot damage preview instead of regular attack during target acquisition", () => {
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.abilities = [Ability.createQuickDraw()];

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 5, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, defender],
      });
      battle.activeCreatureIndex = 0;

      // 1. Regular attack preview before skill activation
      const regularPreview = battle.calculateDamagePreview(defender.position);
      expect(regularPreview).not.toBeNull();
      expect(regularPreview!.badgeText).toBeUndefined();
      expect(regularPreview!.skillName).toBeUndefined();

      // 2. Activate Quick draw skill (e.g. via hotkey or clicking button)
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);
      expect(battle.abilityToApply).not.toBeNull();
      expect(battle.isQuickDrawAbility(battle.abilityToApply)).toBe(true);

      // 3. Damage preview during target acquisition phase should be for Quick Draw
      const skillPreview = battle.calculateDamagePreview(defender.position);
      expect(skillPreview).not.toBeNull();
      if (!skillPreview) return;

      expect(skillPreview.skillName).toBe("Quick draw");
      expect(skillPreview.badgeText).toBe("[QUICK DRAW]");
      expect(skillPreview.isRanged).toBe(true);
      expect(skillPreview.canAttack).toBe(true);

      // Damage should be approximately double the regular attack damage (2 volleys)
      expect(skillPreview.minDamage).toBe(regularPreview!.minDamage * 2);
      expect(skillPreview.maxDamage).toBe(regularPreview!.maxDamage * 2);

      // Tooltip display verification
      const tooltip = new DamagePreviewTooltip(new Container());
      tooltip.show(skillPreview, 100, 100);
      expect((tooltip as any).titleText.text).toBe("QUICK DRAW PREVIEW");
      expect((tooltip as any).badgeText.text).toBe("[QUICK DRAW]");
      expect((tooltip as any).damageText.text).toBe(`${skillPreview.minDamage} - ${skillPreview.maxDamage} DMG`);
    });

    it("should calculate Throw Javelin skill damage preview instead of melee attack for spearmen", () => {
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.position = { x: 2, y: 2 };
      spearman.armyAlignment = 0;
      spearman.abilities = [Ability.createThrowJavelin()];
      spearman.stats.ammo = 5;
      spearman.stats.remaining_ammo = 5;
      spearman.stats.stamina = 10;
      spearman.stats.remaining_attacks = 1;

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 4, y: 2 }; // Distance = 2 (in javelin range, but not adjacent)
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [spearman, defender],
      });
      battle.activeCreatureIndex = 0;

      // Regular preview would consider melee approach
      const regularPreview = battle.calculateDamagePreview(defender.position);
      expect(regularPreview!.isRanged).toBe(false);

      // Activate Throw Javelin skill
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);
      expect(battle.abilityToApply?.id).toBe("jav-01");

      // Damage preview during target acquisition phase should be for Throw Javelin
      const skillPreview = battle.calculateDamagePreview(defender.position);
      expect(skillPreview).not.toBeNull();
      if (!skillPreview) return;

      expect(skillPreview.skillName).toBe("Throw javelin");
      expect(skillPreview.badgeText).toBe("[THROW JAVELIN]");
      expect(skillPreview.isRanged).toBe(true);
      expect(skillPreview.minDamage).toBe(8);
      expect(skillPreview.maxDamage).toBe(10);
      expect(skillPreview.targetArmor).toBe(0); // Piercing javelin ignores armor
      expect(skillPreview.defenderModifiers).toContain("Defense: Bypassed (Piercing)");

      // Tooltip display verification
      const tooltip = new DamagePreviewTooltip(new Container());
      tooltip.show(skillPreview, 100, 100);
      expect((tooltip as any).titleText.text).toBe("THROW JAVELIN PREVIEW");
      expect((tooltip as any).badgeText.text).toBe("[THROW JAVELIN]");
      expect((tooltip as any).damageText.text).toBe("8 - 10 DMG");
    });

    it("should revert to regular attack preview when cancelling skill targeting", () => {
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.abilities = [Ability.createQuickDraw()];

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 4, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [archer, defender],
      });
      battle.activeCreatureIndex = 0;

      // Activate skill
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);
      let preview = battle.calculateDamagePreview(defender.position);
      expect(preview!.badgeText).toBe("[QUICK DRAW]");

      // Cancel skill targeting (e.g. right-click)
      battle.cancelTargetForAbilityIfApplicable();
      expect(battle.input_state).toBe(InputState.SELECT_UNIT_OR_TARGET);
      expect(battle.abilityToApply).toBeNull();

      preview = battle.calculateDamagePreview(defender.position);
      expect(preview!.badgeText).toBeUndefined();
      expect(preview!.skillName).toBeUndefined();
    });

    it("should return null for non-damaging skills (Mend Wounds / Heal) during target acquisition", () => {
      const healer = new Creature(CreatureType.HEALER);
      healer.position = { x: 2, y: 2 };
      healer.armyAlignment = 0;
      healer.abilities = [Ability.createMendWounds()];

      const ally = new Creature(CreatureType.SWORDSMAN);
      ally.position = { x: 3, y: 2 };
      ally.armyAlignment = 0;

      const enemy = new Creature(CreatureType.PEASANT);
      enemy.position = { x: 4, y: 2 };
      enemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [healer, ally, enemy],
      });
      battle.activeCreatureIndex = 0;

      // Activate Mend Wounds
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);
      expect(battle.isDamageAbility(battle.abilityToApply)).toBe(false);

      // Neither ally nor enemy should produce a combat damage preview while targeting heal
      const allyPreview = battle.calculateDamagePreview(ally.position);
      expect(allyPreview).toBeNull();

      const enemyPreview = battle.calculateDamagePreview(enemy.position);
      expect(enemyPreview).toBeNull();
    });

    it("should indicate insufficient resources or range in skill preview", () => {
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.position = { x: 2, y: 2 };
      spearman.armyAlignment = 0;
      spearman.abilities = [Ability.createThrowJavelin()];
      spearman.stats.ammo = 5;
      spearman.stats.remaining_ammo = 5;
      spearman.stats.remaining_attacks = 1;
      spearman.stats.stamina = 0; // No stamina

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 4, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [spearman, defender],
      });
      battle.activeCreatureIndex = 0;

      // When stamina is 0, exhaustion state is DEPLETED
      const skillPreview = battle.calculateDamagePreview(
        defender.position,
        spearman,
        spearman.position,
        false,
        spearman.abilities[0]
      );
      expect(skillPreview).not.toBeNull();
      expect(skillPreview!.canAttack).toBe(false);
      expect(skillPreview!.reasonCannotAttack?.toLowerCase()).toContain("stamina");

      const tooltip = new DamagePreviewTooltip(new Container());
      tooltip.show(skillPreview!, 100, 100);
      expect((tooltip as any).warningText.visible).toBe(true);
      expect((tooltip as any).warningText.text.toLowerCase()).toContain("stamina");
    });

    it("should update BattleView3D hover preview with skill preview during SELECT_ABILITY_TARGET", () => {
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.position = { x: 2, y: 2 };
      spearman.armyAlignment = 0;
      spearman.abilities = [Ability.createThrowJavelin()];
      spearman.stats.ammo = 5;
      spearman.stats.remaining_ammo = 5;
      spearman.stats.stamina = 10;
      spearman.stats.remaining_attacks = 1;

      const defender = new Creature(CreatureType.PEASANT);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [spearman, defender],
      });
      battle.activeCreatureIndex = 0;

      // Activate Throw Javelin
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);

      const mockHud = {
        showDamagePreview: vi.fn(),
        hideDamagePreview: vi.fn(),
      };

      const view3DContext: any = {
        battle,
        hexMap,
        hud: mockHud,
        hoveredHex: defender.position,
        hoveredDirection: HexDirection.NONE,
        targetHoverHex: null,
        targetHoverDuration: 0,
        computeAttackAndHoverPaths: () => ({ originHex: null, isRanged: false }),
        hexBoard: {
          hexToWorldWithElevation: () => ({ x: 3, y: 0, z: 2 }),
        },
        sceneManager: {
          projectToScreen: () => ({ x: 400, y: 300 }),
        },
      };

      const updateHoverFn = (BattleView3D.prototype as any).updateDamagePreviewHover;
      updateHoverFn.call(view3DContext, 1200);

      expect(mockHud.showDamagePreview).toHaveBeenCalledTimes(1);
      const [previewArg] = mockHud.showDamagePreview.mock.calls[0];
      expect(previewArg.skillName).toBe("Throw javelin");
      expect(previewArg.badgeText).toBe("[THROW JAVELIN]");
      expect(previewArg.minDamage).toBe(8);
      expect(previewArg.maxDamage).toBe(10);
    });
  });
});
