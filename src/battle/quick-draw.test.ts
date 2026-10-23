import { describe, it, expect, vi } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Container, Spritesheet, Texture } from 'pixi.js';
import { Battle } from '../battle';
import { HexDirection, HexMap } from '../shared/hex-map';
import { Creature, CreatureType } from './creature';
import { CreatureRepository } from './creature-repository';
import { Ability, AbilityResourceUse } from './ability';
import { BattleActionType } from './battle-action';
import { BattleSettings } from './settings';
import { BattleHud2D } from '../render3d/battle-hud-2d';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { EnemyStatsPanel } from '../ui/enemy-stats-panel';

describe('Quick draw Skill for Archers', () => {
  describe('1. Configuration & Template Specifications', () => {
    it('should define Quick draw in abilitytypes.json with stamina and ammo costs', () => {
      const path = resolve(process.cwd(), 'public/abilitytypes.json');
      const content = readFileSync(path, 'utf-8');
      const abilities: any[] = JSON.parse(content);

      const quickDraw = abilities.find(
        (a) => a.id === 'quick-draw-01' || a.name?.toLowerCase().includes('quick draw')
      );
      expect(quickDraw).toBeDefined();
      expect(quickDraw?.name).toMatch(/quick draw/i);
      expect(quickDraw['tooltip-name'] || quickDraw.tooltipName).toMatch(/quick draw/i);
      // Quick draw does not have a fixed range, but uses regular attack range dynamically
      expect(quickDraw?.range).toBeUndefined();

      const staminaCost = quickDraw?.resources.find(
        (r: any) => r.resource_used === AbilityResourceUse.Stamina
      );
      expect(staminaCost).toBeDefined();
      expect(staminaCost?.resource_cost).toBe(6); // 2 + 2 + 2 additional

      const ammoCost = quickDraw?.resources.find(
        (r: any) => r.resource_used === AbilityResourceUse.Ammo
      );
      expect(ammoCost).toBeDefined();
      expect(ammoCost?.resource_cost).toBe(2);
    });

    it('should assign Quick draw to archers (peasant-archer) but NOT to crossbowmen in creaturetypes.json', () => {
      const path = resolve(process.cwd(), 'public/creaturetypes.json');
      const content = readFileSync(path, 'utf-8');
      const templates: any[] = JSON.parse(content);

      const archerTemplate = templates.find((t) => t.name === 'peasant-archer');
      expect(archerTemplate).toBeDefined();
      expect(archerTemplate.ability_ids).toContain('quick-draw-01');

      const crossbowmanTemplate = templates.find((t) => t.name === 'crossbowman');
      expect(crossbowmanTemplate).toBeDefined();
      expect(crossbowmanTemplate.ability_ids).not.toContain('quick-draw-01');
      expect(crossbowmanTemplate.ability_ids).toEqual([]);
    });

    it('should instantiate archers with Quick draw and crossbowmen without it via CreatureRepository', () => {
      const abilitiesPath = resolve(process.cwd(), 'public/abilitytypes.json');
      const abilities: Ability[] = JSON.parse(readFileSync(abilitiesPath, 'utf-8'));
      const creaturesPath = resolve(process.cwd(), 'public/creaturetypes.json');
      const templates = JSON.parse(readFileSync(creaturesPath, 'utf-8'));

      const repo = new CreatureRepository();
      repo.setAbilities(abilities);
      repo.setCreatureTemplates(templates);

      const archer = repo.createCreature(CreatureType.PEASANT_ARCHER);
      expect(archer.hasQuickDrawAbility()).toBe(true);
      expect(archer.abilities.some((a) => a.id === 'quick-draw-01')).toBe(true);

      const crossbowman = repo.createCreature(CreatureType.CROSSBOWMAN);
      expect(crossbowman.hasQuickDrawAbility()).toBe(false);
      expect(crossbowman.abilities.length).toBe(0);

      const swordsman = repo.createCreature(CreatureType.SWORDSMAN);
      expect(swordsman.hasQuickDrawAbility()).toBe(false);
    });
  });

  describe('2. Stamina Requirements & Usability Preconditions', () => {
    it('should require 2 additional stamina points on top of the two individual attacks (6 stamina total)', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      // Default ranged attack stamina cost in combat config is 2
      expect(battle.combatConfig.stamina.actionCosts.rangedAttack).toBe(2);
      // Quick draw requires (2 * 2) + 2 extra = 6 stamina points
      expect(battle.getQuickDrawStaminaCost()).toBe(6);
    });

    it('should be usable ONLY if the unit can afford the stamina requirements', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.stamina = 12;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      // Sufficient stamina (12 >= 6)
      expect(battle.canCreatureUseQuickDraw(archer)).toBe(true);

      const qdAbility = archer.abilities.find((a) => battle.isQuickDrawAbility(a));
      expect(qdAbility).toBeDefined();
      expect(battle.verifyAbilityUseByCreatureHasResources(qdAbility!, archer)).toBe(true);

      // Stamina reduced to 5 (< 6 required)
      archer.stats.stamina = 5;
      expect(battle.canCreatureUseQuickDraw(archer)).toBe(false);
      expect(battle.verifyAbilityUseByCreatureHasResources(qdAbility!, archer)).toBe(false);

      // Stamina restored but insufficient ammo (1 < 2)
      archer.stats.stamina = 12;
      archer.stats.remaining_ammo = 1;
      expect(battle.canCreatureUseQuickDraw(archer)).toBe(false);
      expect(battle.verifyAbilityUseByCreatureHasResources(qdAbility!, archer)).toBe(false);
    });
  });

  describe('3. Live Battle Execution of Quick draw', () => {
    it('should shoot twice in the same turn and pay 2 additional stamina points plus attack stamina', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.facingDirection = HexDirection.EAST;
      archer.stats.attack_ranged_low = 6;
      archer.stats.attack_ranged_high = 6;
      archer.stats.is_ranged = true;
      archer.stats.range = 6;
      archer.stats.stamina = 12;
      archer.stats.max_stamina = 12;
      archer.stats.ammo = 10;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      const targetSquad = new Creature(CreatureType.SWORDSMAN);
      targetSquad.position = { x: 5, y: 2 };
      targetSquad.armyAlignment = 1;
      targetSquad.facingDirection = HexDirection.WEST;
      targetSquad.stats.health = 80;
      targetSquad.stats.remaining_health = 80;
      targetSquad.stats.defense_ranged = 0;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer, targetSquad],
      });
      battle.combatConfig.ranged.scatterChance = 0; // disable scatter for determinism

      let attackCount = 0;
      battle.hookDoingAttack = (_a, _d, _dmg, type) => {
        if (type === BattleActionType.ATTACK_RANGED) {
          attackCount++;
        }
      };

      // Select archer and use Quick draw on target
      battle.handlePrimaryCellAction(archer.position);
      battle.selectActiveAbilityForCurrentUnit(0);

      // Verify ability target mode activated
      expect((battle as any).input_state).toBe(3); // InputState.SELECT_ABILITY_TARGET

      // Target the enemy squad at (5, 2)
      battle.selectTargetForAbility(targetSquad.position);
      battle.stepInstant();

      // Should have shot TWICE in the same turn
      expect(attackCount).toBe(2);

      // Stamina: 12 - 6 = 6 (2 for shot 1 + 2 for shot 2 + 2 additional stamina points)
      expect(archer.stats.stamina).toBe(6);
      expect(battle.totalStaminaSpent[0]).toBe(6);

      // Ammo: 10 - 2 = 8
      expect(archer.stats.remaining_ammo).toBe(8);

      // Attacks: 1 attack turn spent
      expect(archer.stats.remaining_attacks).toBe(0);
      expect(archer.stats.has_attacked).toBe(true);
    });

    it('should refuse Quick draw execution when archer cannot afford the stamina requirement', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.stats.stamina = 5; // < 6 required
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      const targetSquad = new Creature(CreatureType.SWORDSMAN);
      targetSquad.position = { x: 5, y: 2 };
      targetSquad.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer, targetSquad],
      });

      // Try selecting Quick draw ability
      battle.handlePrimaryCellAction(archer.position);
      battle.selectActiveAbilityForCurrentUnit(0);

      // Selection must be blocked
      expect((battle as any).input_state).not.toBe(3); // NOT SELECT_ABILITY_TARGET

      const executed = battle.executeQuickDrawAttack(archer, targetSquad.position);
      expect(executed).toBe(false);
      expect(archer.stats.stamina).toBe(5); // untouched
    });

    it('should use the regular attack range instead of a fixed range for Quick draw', () => {
      const hexMap = new HexMap(12, 12);
      const battle = new Battle(hexMap);

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 1, y: 1 };
      archer.armyAlignment = 0;
      archer.stats.range = 6;
      archer.stats.stamina = 12;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      const quickDrawAbility = archer.abilities.find((a) => a.id === 'quick-draw-01')!;
      expect(quickDrawAbility).toBeDefined();

      // Effective range must match regular attack range
      expect(battle.getAbilityRange(quickDrawAbility, archer)).toBe(6);

      // Target at range 6 should be in reachable range
      battle.initializeFromConfig({
        mapWidth: 12,
        mapHeight: 12,
        terrainTiles: Array.from({ length: 12 }, () => Array(12).fill(0)),
        creatures: [archer],
      });
      battle.showAbilityReachableCells(quickDrawAbility, archer);
      // Reachable matrix should have cells marked up to range 6
      expect(battle.ability_reach_tiles[7]?.[1] ?? 0).toBeGreaterThan(0); // 6 tiles east from (1,1) is (7,1)

      // Modify / buff regular attack range to 8
      archer.stats.range = 8;
      expect(battle.getAbilityRange(quickDrawAbility, archer)).toBe(8);

      battle.showAbilityReachableCells(quickDrawAbility, archer);
      expect(battle.ability_reach_tiles[9]?.[1] ?? 0).toBeGreaterThan(0); // 8 tiles east from (1,1) is (9,1)

      // Reduce regular attack range to 3
      archer.stats.range = 3;
      expect(battle.getAbilityRange(quickDrawAbility, archer)).toBe(3);

      // Target beyond regular attack range cannot be attacked
      const farTarget = new Creature(CreatureType.SWORDSMAN);
      farTarget.position = { x: 9, y: 1 }; // distance 8 > range 3
      farTarget.armyAlignment = 1;
      const executed = battle.executeQuickDrawAttack(archer, farTarget.position);
      expect(executed).toBe(false);
    });
  });

  describe('4. HUD Button Affordance for Quick draw', () => {
    function createDummyUiSheet(): Spritesheet {
      return {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
    }

    it('should replace previous text-based button and display skill icon button on unit stats with alpha affordance', () => {
      const dummyUiSheet = createDummyUiSheet();
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      const settings = new BattleSettings();
      const assets = {
        softCursorTextures: {},
        uiSheet: dummyUiSheet,
        unitsSheet: dummyUiSheet,
        projectilesSheet: dummyUiSheet,
      } as any;

      const hud = new BattleHud2D(assets, settings, battle);
      hud.unitStats = new UnitStatsPanel(hud.uiPlusRenderGroup, dummyUiSheet, battle.traitsConfig, battle);
      hud.unitStats.show();
      hud.commonControls = {
        activeAbility1Button: { text: '', visible: true, alpha: 1.0 },
      } as any;

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.stamina = 12;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      hud.updateActiveUnitAbility(archer);

      // Previous text-based button is replaced (visible = false)
      const btn = (hud as any).commonControls.activeAbility1Button;
      expect(btn).toBeDefined();
      expect(btn.visible).toBe(false);

      // Skill icon button on UnitStatsPanel reflects affordable state (alpha 1.0, isUsable true)
      const unitStats = hud.unitStats!;
      expect(unitStats).toBeDefined();
      const skillSlots = unitStats.getSkillSlots();
      expect(skillSlots.length).toBe(1);
      expect(skillSlots[0].isUsable).toBe(true);
      expect(skillSlots[0].container.alpha).toBe(1.0);

      // Drain stamina below 6: becomes unaffordable
      archer.stats.stamina = 4;
      hud.updateActiveUnitAbility(archer);
      const updatedSlots = unitStats.getSkillSlots();
      expect(updatedSlots[0].isUsable).toBe(false);
      expect(updatedSlots[0].container.alpha).toBe(0.4);
    });
  });

  describe('5. Skill Icons & Unit Stats Panel Display', () => {
    it('should have generated 256x256 PNG icons for all existing skills', () => {
      const skills = [
        'icon_quick_draw.png',
        'icon_throw_javelin.png',
        'icon_patch_up.png',
        'icon_pickup_ammo.png',
      ];

      for (const file of skills) {
        const fullPath = resolve(process.cwd(), 'public/skills', file);
        expect(existsSync(fullPath)).toBe(true);

        const buffer = readFileSync(fullPath);
        // PNG magic number: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);

        // Width and height in IHDR chunk (offset 16 and 20, 4 bytes big endian)
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        expect(width).toBe(256);
        expect(height).toBe(256);
      }
    });

    it('should have icon defined for all abilities in abilitytypes.json', () => {
      const path = resolve(process.cwd(), 'public/abilitytypes.json');
      const abilities: any[] = JSON.parse(readFileSync(path, 'utf-8'));

      expect(abilities.length).toBeGreaterThan(0);
      for (const ability of abilities) {
        expect(ability.icon).toBeDefined();
        expect(ability.icon).toMatch(/^skills\/icon_.*\.png$/);
        const iconPath = resolve(process.cwd(), 'public', ability.icon);
        expect(existsSync(iconPath)).toBe(true);
      }
    });

    it('should display skill icons on top of the UnitStatsPanel for units with abilities', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      panel.setCreature(archer);
      panel.update();

      const skillSlots = panel.getSkillSlots();
      expect(skillSlots.length).toBe(1);
      const slot = skillSlots[0];

      expect(slot.skillId).toBe('quick-draw-01');
      expect(slot.name).toMatch(/quick draw/i);
      expect(slot.description).toContain('Stamina');
      expect(slot.width).toBe(48);
      expect(slot.height).toBe(48);
      // Sits on top of the unit stats panel (y = -36 relative to panel)
      expect(slot.y).toBe(-36);

      // Unit without abilities has empty skill slots
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      panel.setCreature(swordsman);
      panel.update();
      expect(panel.getSkillSlots().length).toBe(0);
    });

    it('should highlight slot border and show skill description tooltip on hover', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      panel.setCreature(archer);
      panel.update();

      const slot = panel.getSkillSlots()[0];
      expect(slot).toBeDefined();

      const anyPanel = panel as any;
      expect(anyPanel.tooltipWindow.visible).toBe(false);

      // Hover over skill icon
      const slotCenterX = anyPanel.window.x + slot.x + slot.width / 2;
      const slotCenterY = anyPanel.window.y + slot.y + slot.height / 2;

      panel.mousemove({ x: slotCenterX, y: slotCenterY });

      // Skill tooltip visible and border highlighted
      expect(anyPanel.tooltipWindow.visible).toBe(true);
      expect(anyPanel.tooltipText.text).toContain('[SKILL] QUICK DRAW');
      expect(anyPanel.tooltipText.text).toMatch(/shoot twice in the same turn/i);
      expect(anyPanel.tooltipText.text).toContain('Cost:');
      expect(anyPanel.tooltipText.text).toContain('6 Stamina');
      expect(anyPanel.tooltipText.text).toContain('2 Ammo');
      expect(slot.border.tint).toBe(0xffe680);

      // Tooltip contains 128x128 icon left-aligned and text shifted right
      const tipIcon = panel.getTooltipIconSprite();
      expect(tipIcon.visible).toBe(true);
      expect(tipIcon.width).toBe(128);
      expect(tipIcon.height).toBe(128);
      expect(tipIcon.x).toBe(anyPanel.tooltipWindow.x + 14);
      expect(anyPanel.tooltipText.x).toBeGreaterThan(tipIcon.x + 128);
      expect(anyPanel.tooltipWindow.height).toBeGreaterThanOrEqual(154);

      // Tooltip position is above the icon (y < slot.y)
      expect(anyPanel.tooltipWindow.y).toBeLessThan(slot.y);

      // containsPoint should include skill icons sitting on top of the panel
      expect(panel.containsPoint(slotCenterX, slotCenterY)).toBe(true);

      // Move mouse away
      panel.mousemove({ x: anyPanel.window.x + 10, y: anyPanel.window.y + 10 });
      expect(anyPanel.tooltipWindow.visible).toBe(false);
      expect(tipIcon.visible).toBe(false);
      expect(slot.border.tint).toBe(0xffffff);
    });

    it('should have resized trait icon files to 256x256 PNGs in public/traits/', () => {
      const traitFiles = [
        'icon_fragile_line.png',
        'icon_shield_block.png',
        'icon_spear_wall.png',
        'icon_volley_fire.png',
      ];

      for (const file of traitFiles) {
        const fullPath = resolve(process.cwd(), 'public/traits', file);
        expect(existsSync(fullPath)).toBe(true);

        const buffer = readFileSync(fullPath);
        // PNG magic bytes
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);

        // Width and height in IHDR chunk
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        expect(width).toBe(256);
        expect(height).toBe(256);
      }
    });

    it('should display 128x128 icon inside tooltip left-aligned with text shifted right for traits', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.stats.traits = ['ShieldBlock'];
      panel.setCreature(swordsman);
      panel.update();

      const anyPanel = panel as any;
      const traitSlot = panel.getTraitSlots()[0];
      expect(traitSlot).toBeDefined();

      const traitX = anyPanel.window.x + traitSlot.x + traitSlot.width / 2;
      const traitY = anyPanel.window.y + traitSlot.y + traitSlot.height / 2;
      panel.mousemove({ x: traitX, y: traitY });

      const tipIcon = panel.getTooltipIconSprite();
      expect(anyPanel.tooltipWindow.visible).toBe(true);
      expect(tipIcon.visible).toBe(true);
      expect(tipIcon.width).toBe(128);
      expect(tipIcon.height).toBe(128);
      expect(tipIcon.x).toBe(anyPanel.tooltipWindow.x + 14);
      expect(anyPanel.tooltipText.x).toBeGreaterThan(tipIcon.x + 128);
      expect(anyPanel.tooltipWindow.height).toBeGreaterThanOrEqual(154);

      // Move mouse away
      panel.mousemove({ x: anyPanel.window.x + 10, y: anyPanel.window.y + 10 });
      expect(tipIcon.visible).toBe(false);
      expect(anyPanel.tooltipWindow.visible).toBe(false);
    });

    it('should make skill icons clickable buttons that trigger active ability selection', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      const panel = new UnitStatsPanel(container, dummyUiSheet, undefined, battle);
      panel.show();

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;
      archer.stats.stamina = 12;
      archer.stats.remaining_ammo = 10;
      archer.stats.remaining_attacks = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer],
      });
      battle.handlePrimaryCellAction(archer.position);

      let clickedAbilityIndex = -1;
      panel.onSkillClick = (index) => {
        clickedAbilityIndex = index;
        battle.selectActiveAbilityForCurrentUnit(index);
      };

      panel.setCreature(archer);
      panel.update();

      const slot = panel.getSkillSlots()[0];
      expect(slot.isUsable).toBe(true);
      expect(slot.container.cursor).toBe('pointer');

      // Click the skill button via click(coords)
      const slotCenterX = (panel as any).window.x + slot.x + slot.width / 2;
      const slotCenterY = (panel as any).window.y + slot.y + slot.height / 2;

      const clickHandled = panel.click({ x: slotCenterX, y: slotCenterY });
      expect(clickHandled).toBe(true);
      expect(clickedAbilityIndex).toBe(0);
      expect((battle as any).input_state).toBe(3); // SELECT_ABILITY_TARGET

      // When unit has insufficient stamina, clicking is blocked
      archer.stats.stamina = 4;
      panel.update();
      expect(panel.getSkillSlots()[0].isUsable).toBe(false);
      expect(panel.getSkillSlots()[0].container.cursor).toBe('not-allowed');

      clickedAbilityIndex = -1;
      const unaffordableClick = panel.click({ x: slotCenterX, y: slotCenterY });
      expect(unaffordableClick).toBe(false);
      expect(clickedAbilityIndex).toBe(-1);
    });

    it('should render multiple skill icons in horizontally spaced slots', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      panel.show();

      const heroUnit = new Creature(CreatureType.PEASANT_ARCHER);
      const throwJav = Ability.createThrowJavelin();
      heroUnit.abilities.push(throwJav);

      panel.setCreature(heroUnit);
      panel.update();

      const slots = panel.getSkillSlots();
      expect(slots.length).toBe(2);
      expect(slots[0].skillId).toBe('quick-draw-01');
      expect(slots[1].skillId).toBe('jav-01');
      expect(slots[1].x).toBeGreaterThan(slots[0].x);
    });

    it('should display skill icons, 128x128 tooltip icons, and hover tooltips in EnemyStatsPanel', () => {
      const container = new Container();
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => Texture.EMPTY,
        }),
      } as unknown as Spritesheet;
      const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);
      enemyPanel.show();

      const enemyArcher = new Creature(CreatureType.PEASANT_ARCHER);
      enemyArcher.stats.traits = ['FragileLine'];
      enemyPanel.setCreature(enemyArcher);
      enemyPanel.update();

      const slots = enemyPanel.getSkillSlots();
      expect(slots.length).toBe(1);
      const slot = slots[0];
      expect(slot.name).toMatch(/quick draw/i);

      const anyEnemy = enemyPanel as any;
      const tipIcon = enemyPanel.getTooltipIconSprite();
      expect(tipIcon).toBeDefined();

      const slotCenterX = anyEnemy.window.x + slot.x + slot.width / 2;
      const slotCenterY = anyEnemy.window.y + slot.y + slot.height / 2;

      enemyPanel.mousemove({ x: slotCenterX, y: slotCenterY });
      expect(anyEnemy.tooltipWindow.visible).toBe(true);
      expect(anyEnemy.tooltipText.text).toContain('[SKILL] QUICK DRAW');
      expect(slot.border.tint).toBe(0xffe680);

      // Icon inside tooltip is 128x128 left aligned
      expect(tipIcon.visible).toBe(true);
      expect(tipIcon.width).toBe(128);
      expect(tipIcon.height).toBe(128);
      expect(tipIcon.x).toBe(anyEnemy.tooltipWindow.x + 14);
      expect(anyEnemy.tooltipText.x).toBeGreaterThan(tipIcon.x + 128);

      // Move away
      enemyPanel.mousemove({ x: anyEnemy.window.x + 10, y: anyEnemy.window.y + 10 });
      expect(anyEnemy.tooltipWindow.visible).toBe(false);
      expect(tipIcon.visible).toBe(false);
      expect(slot.border.tint).toBe(0xffffff);
    });
  });
});

