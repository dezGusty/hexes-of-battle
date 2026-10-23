import { describe, it, expect } from "vitest";
import { Container, Spritesheet, Texture } from "pixi.js";
import { Battle } from "../battle";
import { Creature, CreatureType } from "./creature";
import { HexDirection, HexFlankStatus, HexMap } from "../shared/hex-map";
import { BattleActionType } from "./battle-action";
import {
  calculateDamageWithTraits,
  DEFAULT_TRAITS_CONFIG,
  parseTraitsConfig,
  creatureHasTrait,
  getTraitInfo,
} from "./trait-system";
import { UnitStatsPanel } from "../ui/unit-stats-panel";
import { EnemyStatsPanel } from "../ui/enemy-stats-panel";

describe("Trait & Perk System", () => {
  describe("1. Trait Name Normalization & Configuration Parsing", () => {
    it("should recognize traits regardless of casing, spaces, underscores, or hyphens", () => {
      const unit = new Creature(CreatureType.SWORDSMAN);
      unit.stats.traits = ["ShieldBlock", "fragile_line", "Spear-Wall", "Volley Fire"];

      expect(creatureHasTrait(unit, "ShieldBlock")).toBe(true);
      expect(creatureHasTrait(unit, "shield_block")).toBe(true);
      expect(creatureHasTrait(unit, "Shield block")).toBe(true);
      expect(unit.hasTrait("shield-block")).toBe(true);

      expect(unit.hasTrait("Fragile Line")).toBe(true);
      expect(unit.hasTrait("FragileLine")).toBe(true);
      expect(unit.hasTrait("fragile_line")).toBe(true);

      expect(unit.hasTrait("SpearWall")).toBe(true);
      expect(unit.hasTrait("spear_wall")).toBe(true);
      expect(unit.hasTrait("Spear wall")).toBe(true);

      expect(unit.hasTrait("VolleyFire")).toBe(true);
      expect(unit.hasTrait("volley_fire")).toBe(true);
      expect(unit.hasTrait("Volley fire")).toBe(true);

      expect(unit.hasTrait("NonExistent")).toBe(false);
    });

    it("should parse custom JSON configurations with camelCase or snake_case", () => {
      const customJson = {
        shield_block: {
          damageReduction: 5,
        },
        fragile_line: {
          extraMoraleLoss: 4,
        },
        volley_fire: {
          highThreshold: 0.8,
          highMultiplier: 1.5,
          midThreshold: 0.4,
          midMultiplier: 1.1,
          lowMultiplier: 0.6,
        },
        spear_wall: {
          damageReduction: 3,
          exactDirectionOnly: false,
        },
      };

      const parsed = parseTraitsConfig(customJson);
      expect(parsed.shieldBlock.damageReduction).toBe(5);
      expect(parsed.fragileLine.extraMoraleLoss).toBe(4);
      expect(parsed.volleyFire.highMultiplier).toBe(1.5);
      expect(parsed.volleyFire.lowMultiplier).toBe(0.6);
      expect(parsed.spearWall.damageReduction).toBe(3);
      expect(parsed.spearWall.exactDirectionOnly).toBe(false);
    });
  });

  describe("2. Shield Block Trait", () => {
    it("should reduce melee damage for the first attack in the turn and consume the block", () => {
      const attacker = new Creature(CreatureType.BARBARIAN);
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.traits = ["ShieldBlock"];
      defender.stats.defense_melee = 0;
      defender.stats.shield_block_used = false;

      const traitsConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        shieldBlock: { damageReduction: 2 },
      };

      // First attack: damage reduced by 2
      const firstHit = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        traitsConfig,
        commit: true,
      });

      expect(firstHit.shieldBlockReduction).toBe(2);
      expect(firstHit.damage).toBe(8);
      expect(defender.stats.shield_block_used).toBe(true);

      // Second attack in the same turn: no reduction
      const secondHit = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        traitsConfig,
        commit: true,
      });

      expect(secondHit.shieldBlockReduction).toBe(0);
      expect(secondHit.damage).toBe(10);
    });

    it("should reset shield block on turn reset", () => {
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.shield_block_used = true;

      defender.resetTurn();
      expect(defender.stats.shield_block_used).toBe(false);
    });

    it("should not trigger or consume shield block on ranged attacks", () => {
      const attacker = new Creature(CreatureType.PEASANT_ARCHER);
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.traits = ["ShieldBlock"];
      defender.stats.shield_block_used = false;

      const hit = calculateDamageWithTraits({
        attacker,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 10,
        commit: true,
      });

      expect(hit.shieldBlockReduction).toBe(0);
      expect(defender.stats.shield_block_used).toBe(false);
    });
  });

  describe("3. Volley Fire Trait", () => {
    it("should scale ranged damage based on target alive model ratio", () => {
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.traits = ["VolleyFire"];

      const target = new Creature(CreatureType.PEASANT);
      target.stats.model_count = 10;
      target.stats.model_hp = 10;
      target.stats.health = 100;
      target.stats.defense_ranged = 0;

      // Case A: 10/10 models alive (100% > 75%) -> 125% damage
      target.stats.remaining_health = 100;
      expect(target.aliveModelCount).toBe(10);
      const hitHigh = calculateDamageWithTraits({
        attacker: archer,
        defender: target,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 20,
      });
      expect(hitHigh.volleyMultiplier).toBe(1.25);
      expect(hitHigh.damage).toBe(25); // 20 * 1.25

      // Case B: 6/10 models alive (60% -> 50%..75%) -> 100% damage
      target.stats.remaining_health = 60;
      expect(target.aliveModelCount).toBe(6);
      const hitMid = calculateDamageWithTraits({
        attacker: archer,
        defender: target,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 20,
      });
      expect(hitMid.volleyMultiplier).toBe(1.0);
      expect(hitMid.damage).toBe(20);

      // Case C: 3/10 models alive (30% < 50%) -> 75% damage
      target.stats.remaining_health = 30;
      expect(target.aliveModelCount).toBe(3);
      const hitLow = calculateDamageWithTraits({
        attacker: archer,
        defender: target,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 20,
      });
      expect(hitLow.volleyMultiplier).toBe(0.75);
      expect(hitLow.damage).toBe(15); // 20 * 0.75
    });

    it("should respect configurable thresholds and multipliers from traits config", () => {
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.traits = ["VolleyFire"];

      const target = new Creature(CreatureType.PEASANT);
      target.stats.model_count = 10;
      target.stats.model_hp = 10;
      target.stats.health = 100;
      target.stats.remaining_health = 90; // 90% alive

      const customConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        volleyFire: {
          highThreshold: 0.8,
          highMultiplier: 1.5,
          midThreshold: 0.4,
          midMultiplier: 1.0,
          lowMultiplier: 0.5,
        },
      };

      const hit = calculateDamageWithTraits({
        attacker: archer,
        defender: target,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 20,
        traitsConfig: customConfig,
      });
      expect(hit.volleyMultiplier).toBe(1.5);
      expect(hit.damage).toBe(30);
    });
  });

  describe("4. Spear Wall Trait", () => {
    it("should reduce melee damage from the direction faced", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.stats.traits = ["SpearWall"];
      spearman.facingDirection = HexDirection.EAST;
      spearman.stats.defense_melee = 0;

      const traitsConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        spearWall: {
          damageReduction: 2,
          damageMultiplier: 1.0,
          exactDirectionOnly: true,
        },
      };

      // Attack from EAST into spearman facing EAST (direct front)
      const frontHit = calculateDamageWithTraits({
        attacker,
        defender: spearman,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        attackFromDir: HexDirection.EAST,
        flankStatus: HexFlankStatus.NONE,
        traitsConfig,
      });
      expect(frontHit.spearWallReduction).toBe(2);
      expect(frontHit.damage).toBe(8);

      // Attack from WEST into spearman facing EAST (rear)
      const rearHit = calculateDamageWithTraits({
        attacker,
        defender: spearman,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        attackFromDir: HexDirection.WEST,
        flankStatus: HexFlankStatus.BACKSTAB,
        traitsConfig,
      });
      expect(rearHit.spearWallReduction).toBe(0);
      expect(rearHit.damage).toBe(10);
    });

    it("should support front-arc when exactDirectionOnly is false", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.stats.traits = ["SpearWall"];
      spearman.facingDirection = HexDirection.EAST;
      spearman.stats.defense_melee = 0;

      const traitsConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        spearWall: {
          damageReduction: 3,
          damageMultiplier: 1.0,
          exactDirectionOnly: false,
        },
      };

      // Attack from NORTHEAST (front arc, not flank or backstab)
      const frontArcHit = calculateDamageWithTraits({
        attacker,
        defender: spearman,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        attackFromDir: HexDirection.NORTHEAST,
        flankStatus: HexFlankStatus.NONE,
        traitsConfig,
      });
      expect(frontArcHit.spearWallReduction).toBe(3);
      expect(frontArcHit.damage).toBe(7);
    });
  });

  describe("5. Fragile Line Trait", () => {
    it("should cause extra morale loss when attacked in melee", () => {
      const attacker = new Creature(CreatureType.SWORDSMAN);
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.traits = ["FragileLine"];
      archer.stats.morale = 15;

      const traitsConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        fragileLine: { extraMoraleLoss: 3 },
      };

      const result = calculateDamageWithTraits({
        attacker,
        defender: archer,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 5,
        traitsConfig,
        commit: true,
      });

      expect(result.extraMoraleLoss).toBe(3);
      expect(archer.stats.morale).toBe(12); // 15 - 3
    });

    it("should not cause morale loss on ranged attacks", () => {
      const attacker = new Creature(CreatureType.PEASANT_ARCHER);
      const targetArcher = new Creature(CreatureType.PEASANT_ARCHER);
      targetArcher.stats.traits = ["FragileLine"];
      targetArcher.stats.morale = 15;

      const result = calculateDamageWithTraits({
        attacker,
        defender: targetArcher,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 5,
        commit: true,
      });

      expect(result.extraMoraleLoss).toBe(0);
      expect(targetArcher.stats.morale).toBe(15);
    });
  });

  describe("6. Integrated Battle Combat with Traits", () => {
    it("should apply Shield Block reduction in live Battle", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const attacker = new Creature(CreatureType.PEASANT);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.stats.attack_melee_low = 10;
      attacker.stats.attack_melee_high = 10;
      attacker.stats.stamina = attacker.stats.max_stamina;

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.position = { x: 3, y: 2 };
      defender.armyAlignment = 1;
      defender.facingDirection = HexDirection.WEST;
      defender.stats.defense_melee = 0;
      defender.stats.health = 50;
      defender.stats.remaining_health = 50;
      defender.stats.traits = ["ShieldBlock"];

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [attacker, defender],
      });
      battle.handlePrimaryCellAction(attacker.position);

      let recordedDamage = 0;
      battle.hookDoingAttack = (_a, _d, damage, _type, _flank, isRetaliation) => {
        if (!isRetaliation) {
          recordedDamage = damage;
        }
      };

      // Attacker strikes defender
      battle.handleSecondaryCellAction(defender.position);
      battle.stepInstant();

      // Base 10 damage - 2 shield block reduction = 8 damage
      expect(recordedDamage).toBe(8);
      expect(defender.stats.shield_block_used).toBe(true);
      expect(defender.stats.remaining_health).toBe(42);
    });

    it("should apply Volley Fire bonus in live Battle against full squads", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.facingDirection = HexDirection.EAST;
      archer.stats.attack_ranged_low = 10;
      archer.stats.attack_ranged_high = 10;
      archer.stats.is_ranged = true;
      archer.stats.range = 5;
      archer.stats.ammo = 10;
      archer.stats.remaining_ammo = 10;
      archer.stats.traits = ["VolleyFire"];
      archer.stats.model_count = 1; // 1 arrow for determinism
      archer.stats.model_hp = 40;
      archer.stats.health = 40;
      archer.stats.remaining_health = 40;

      const enemySquad = new Creature(CreatureType.PEASANT);
      enemySquad.position = { x: 5, y: 2 };
      enemySquad.armyAlignment = 1;
      enemySquad.facingDirection = HexDirection.WEST;
      enemySquad.stats.defense_ranged = 0;
      enemySquad.stats.model_count = 10;
      enemySquad.stats.model_hp = 10;
      enemySquad.stats.health = 100;
      enemySquad.stats.remaining_health = 100; // 100% full squad -> 125% damage

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer, enemySquad],
      });
      battle.combatConfig.ranged.scatterChance = 0; // disable scatter
      battle.handlePrimaryCellAction(archer.position);

      let recordedDamage = 0;
      battle.hookDoingAttack = (_a, _d, damage) => {
        recordedDamage = damage;
      };

      battle.handleSecondaryCellAction(enemySquad.position);
      battle.stepInstant();

      // 10 base damage * 1.25 volley fire = 13 (rounded) or 12.5
      expect(recordedDamage).toBe(13);
      expect(enemySquad.stats.remaining_health).toBe(87);
    });

    it("should apply Fragile Line extra morale loss in live Battle", () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const attacker = new Creature(CreatureType.SWORDSMAN);
      attacker.position = { x: 2, y: 2 };
      attacker.armyAlignment = 0;
      attacker.stats.attack_melee_low = 2;
      attacker.stats.attack_melee_high = 2;

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 3, y: 2 };
      archer.armyAlignment = 1;
      archer.facingDirection = HexDirection.WEST;
      archer.stats.defense_melee = 0;
      archer.stats.health = 50;
      archer.stats.remaining_health = 50;
      archer.stats.morale = 10;
      archer.stats.traits = ["FragileLine"];

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [attacker, archer],
      });
      battle.handlePrimaryCellAction(attacker.position);

      battle.handleSecondaryCellAction(archer.position);
      battle.stepInstant();

      // Archer lost 2 morale from FragileLine (and 1 from took_damage if applicable)
      expect(archer.stats.morale).toBeLessThanOrEqual(8);
    });
  });

  describe("7. UnitStatsPanel Trait Icons & Tooltips", () => {
    function createDummyUiSheet(): Spritesheet {
      return {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
    }

    it("should provide correct trait display metadata via getTraitInfo", () => {
      const shield = getTraitInfo("ShieldBlock");
      expect(shield).not.toBeNull();
      expect(shield?.name).toBe("Shield Block");
      expect(shield?.icon).toBe("traits/icon_shield_block.png");
      expect(shield?.description).toContain("Reduces melee damage by 2");

      const spear = getTraitInfo("spear_wall");
      expect(spear).not.toBeNull();
      expect(spear?.name).toBe("Spear Wall");
      expect(spear?.icon).toBe("traits/icon_spear_wall.png");
      expect(spear?.description).toContain("when attacked from the direction the unit is facing");

      const volley = getTraitInfo("Volley Fire");
      expect(volley).not.toBeNull();
      expect(volley?.name).toBe("Volley Fire");
      expect(volley?.icon).toBe("traits/icon_volley_fire.png");
      expect(volley?.description).toContain("125%");

      const fragile = getTraitInfo("fragile-line");
      expect(fragile).not.toBeNull();
      expect(fragile?.name).toBe("Fragile Line");
      expect(fragile?.icon).toBe("traits/icon_fragile_line.png");
      expect(fragile?.description).toContain("+2 extra morale loss");
    });

    it("should render separate trait icon slots in UnitStatsPanel for each unit trait", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const panel = new UnitStatsPanel(container, dummyUiSheet);

      // Peasant has 0 traits
      const peasant = new Creature(CreatureType.PEASANT);
      peasant.stats.traits = [];
      panel.setCreature(peasant);
      panel.update();
      expect(panel.getTraitSlots().length).toBe(0);

      // Swordsman has 1 trait: ShieldBlock
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.stats.traits = ["ShieldBlock"];
      panel.setCreature(swordsman);
      panel.update();

      const swordSlots = panel.getTraitSlots();
      expect(swordSlots.length).toBe(1);
      expect(swordSlots[0].traitName).toBe("ShieldBlock");
      expect(swordSlots[0].name).toBe("Shield Block");
      expect(swordSlots[0].width).toBe(48);
      expect(swordSlots[0].height).toBe(48);

      // Peasant Archer has 2 traits: FragileLine, VolleyFire
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.traits = ["FragileLine", "VolleyFire"];
      panel.setCreature(archer);
      panel.update();

      const archerSlots = panel.getTraitSlots();
      expect(archerSlots.length).toBe(2);
      expect(archerSlots[0].name).toBe("Fragile Line");
      expect(archerSlots[1].name).toBe("Volley Fire");
      // Each perk adds a separate icon slot with horizontal spacing
      expect(archerSlots[1].x).toBeGreaterThan(archerSlots[0].x + archerSlots[0].width);
    });

    it("should highlight slot border and show detailed combat effect tooltip on hover", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.stats.traits = ["ShieldBlock"];
      panel.setCreature(swordsman);
      panel.update();

      const slot = panel.getTraitSlots()[0];
      expect(slot).toBeDefined();

      // Tooltip window initially hidden
      const anyPanel = panel as any;
      expect(anyPanel.tooltipWindow.visible).toBe(false);

      // Hover over trait slot: mouse coordinates relative to panel
      const slotCenterX = anyPanel.window.x + slot.x + slot.width / 2;
      const slotCenterY = anyPanel.window.y + slot.y + slot.height / 2;

      panel.mousemove({ x: slotCenterX, y: slotCenterY });

      // Trait tooltip is visible
      expect(anyPanel.tooltipWindow.visible).toBe(true);
      expect(anyPanel.tooltipText.text).toContain("[PERK] SHIELD BLOCK");
      expect(anyPanel.tooltipText.text).toContain("Reduces melee damage by 2 for the first attack received in a turn.");
      expect(slot.border.tint).toBe(0xffe680);

      // Move mouse away
      panel.mousemove({ x: anyPanel.window.x + 10, y: anyPanel.window.y + 10 });
      expect(anyPanel.tooltipWindow.visible).toBe(false);
      expect(slot.border.tint).toBe(0xffffff);
    });

    it("should reflect custom traitsConfig updates in trait icons and tooltips", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const panel = new UnitStatsPanel(container, dummyUiSheet);

      const customConfig = {
        ...DEFAULT_TRAITS_CONFIG,
        shieldBlock: {
          ...DEFAULT_TRAITS_CONFIG.shieldBlock,
          damageReduction: 5,
          description: "Shield Block: Reduces melee damage by 5 for the first attack received in a turn.",
        },
      };

      panel.setTraitsConfig(customConfig);

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.stats.traits = ["ShieldBlock"];
      panel.setCreature(swordsman);
      panel.update();

      const slot = panel.getTraitSlots()[0];
      expect(slot.description).toContain("Reduces melee damage by 5");

      const anyPanel = panel as any;
      const slotCenterX = anyPanel.window.x + slot.x + slot.width / 2;
      const slotCenterY = anyPanel.window.y + slot.y + slot.height / 2;

      panel.mousemove({ x: slotCenterX, y: slotCenterY });
      expect(anyPanel.tooltipText.text).toContain("Reduces melee damage by 5");
    });

    it("should correctly test containsPoint for panel bounding boxes", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const wx = (panel as any).window.x;
      const wy = (panel as any).window.y;

      // Inside panel
      expect(panel.containsPoint(wx + 100, wy + 50)).toBe(true);
      // Outside panel
      expect(panel.containsPoint(10, 10)).toBe(false);

      panel.hide();
      expect(panel.containsPoint(wx + 100, wy + 50)).toBe(false);
    });
  });

  describe("8. EnemyStatsPanel Trait Icons & Height Expansion", () => {
    function createDummyUiSheet(): Spritesheet {
      return {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
    }

    it("should have panel height increased by 50% (126px vs 84px)", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);

      // Original height was 84; 84 * 1.5 = 126
      expect(enemyPanel.panelHeight).toBe(126);
      expect(enemyPanel.panelWidth).toBe(630);
    });

    it("should display trait icons in EnemyStatsPanel for enemy units", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);

      // Peasant enemy squad has 0 traits
      const peasant = new Creature(CreatureType.PEASANT);
      peasant.stats.traits = [];
      enemyPanel.setCreature(peasant);
      enemyPanel.update();
      expect(enemyPanel.getTraitSlots().length).toBe(0);

      // Enemy Spearman has traits: SpearWall, CloseQuartersCounter
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.stats.traits = ["SpearWall", "CloseQuartersCounter"];
      enemyPanel.setCreature(spearman);
      enemyPanel.update();

      const slots = enemyPanel.getTraitSlots();
      expect(slots.length).toBe(2);
      expect(slots[0].name).toBe("Spear Wall");
      expect(slots[0].traitName).toBe("SpearWall");
      expect(slots[0].width).toBe(34);
      expect(slots[0].height).toBe(34);
      expect(slots[1].name).toBe("Close Quarters Counter");
      // Icons should be horizontally sequenced in traits row
      expect(slots[1].x).toBeGreaterThan(slots[0].x);
    });

    it("should highlight slot border and show trait effect tooltip on mouse hover in EnemyStatsPanel", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);
      enemyPanel.show();

      const enemySwordsman = new Creature(CreatureType.SWORDSMAN);
      enemySwordsman.stats.traits = ["ShieldBlock"];
      enemyPanel.setCreature(enemySwordsman);
      enemyPanel.update();

      const slot = enemyPanel.getTraitSlots()[0];
      expect(slot).toBeDefined();

      const anyEnemy = enemyPanel as any;
      expect(anyEnemy.tooltipWindow.visible).toBe(false);

      // Hover over enemy trait icon
      const slotCenterX = anyEnemy.window.x + slot.x + slot.width / 2;
      const slotCenterY = anyEnemy.window.y + slot.y + slot.height / 2;

      enemyPanel.mousemove({ x: slotCenterX, y: slotCenterY });

      // Trait tooltip visible below the expanded panel
      expect(anyEnemy.tooltipWindow.visible).toBe(true);
      expect(anyEnemy.tooltipText.text).toContain("[PERK] SHIELD BLOCK");
      expect(anyEnemy.tooltipText.text).toContain("Reduces melee damage by 2 for the first attack received in a turn.");
      expect(slot.border.tint).toBe(0xffe680);
      expect(anyEnemy.tooltipWindow.position.y).toBe(enemyPanel.panelHeight + 4);

      // Move away
      enemyPanel.mousemove({ x: anyEnemy.window.x + 10, y: anyEnemy.window.y + 10 });
      expect(anyEnemy.tooltipWindow.visible).toBe(false);
      expect(slot.border.tint).toBe(0xffffff);
    });

    it("should correctly test containsPoint for the expanded EnemyStatsPanel bounds", () => {
      const container = new Container();
      const dummyUiSheet = createDummyUiSheet();
      const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);
      enemyPanel.show();

      const wx = (enemyPanel as any).window.x;
      const wy = (enemyPanel as any).window.y;

      // Point at y = wy + 100 is inside the 126px panel (whereas old 84px panel would have rejected it)
      expect(enemyPanel.containsPoint(wx + 100, wy + 100)).toBe(true);
      // Beyond panel height
      expect(enemyPanel.containsPoint(wx + 100, wy + 140)).toBe(false);

      enemyPanel.hide();
      expect(enemyPanel.containsPoint(wx + 100, wy + 100)).toBe(false);
    });
  });
});

