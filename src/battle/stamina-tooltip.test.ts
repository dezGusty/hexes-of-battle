import { describe, it, expect, vi } from "vitest";
import { Container, Spritesheet, Texture } from "pixi.js";

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

import {
  getStaminaTooltip,
  DEFAULT_COMBAT_CONFIG,
  CombatConfig,
} from "./combat-rules";
import { Creature, CreatureType } from "./creature";
import { DisplayedStat, UnitStatsPanel } from "../ui/unit-stats-panel";
import { EnemyStatsPanel } from "../ui/enemy-stats-panel";

describe("Dynamic Stamina Tooltip System", () => {
  const dummyUiSheet = {
    textures: new Proxy({}, {
      get: () => Texture.EMPTY,
    }),
  } as unknown as Spritesheet;

  describe("getStaminaTooltip core logic", () => {
    it("should return Fresh state with no penalties when stamina is above fresh threshold (>50%)", () => {
      const tooltip = getStaminaTooltip(10, 10);
      expect(tooltip).toContain("The unit's energy to perform physical activities");
      expect(tooltip).toContain("Current state: Fresh (No penalties).");
      expect(tooltip).not.toContain("Dealt damage");
      expect(tooltip).not.toContain("Received damage");
    });

    it("should return Winded state with dealt damage, received damage, and text penalties", () => {
      // 3/10 stamina = 30%, which is >= 20% (winded threshold) and <= 50%
      const tooltip = getStaminaTooltip(3, 10);
      expect(tooltip).toContain("Current state: Winded.");
      expect(tooltip).toContain("Dealt damage: -10% (90%)");
      expect(tooltip).toContain("Received damage: +0% (100%)");
      expect(tooltip).toContain("Additional penalties: reduced movement.");
      // Ensure no raw value numbers like movementPenalty: 1 or raw boolean
      expect(tooltip).not.toContain("movementPenalty");
      expect(tooltip).not.toContain("Movement -1");
    });

    it("should return Exhausted state with dealt damage, received damage, and text penalties", () => {
      // 1/10 stamina = 10%, which is > 0 and < 20%
      const tooltip = getStaminaTooltip(1, 10);
      expect(tooltip).toContain("Current state: Exhausted.");
      expect(tooltip).toContain("Dealt damage: -30% (70%)");
      expect(tooltip).toContain("Received damage: +20% (120%)");
      expect(tooltip).toContain("Additional penalties: cannot retaliate.");
      expect(tooltip).not.toContain("canRetaliate: false");
    });

    it("should return Depleted state with dealt damage, received damage, and all text penalties", () => {
      // 0 stamina = Depleted
      const tooltip = getStaminaTooltip(0, 10);
      expect(tooltip).toContain("Current state: Depleted.");
      expect(tooltip).toContain("Dealt damage: -50% (50%)");
      expect(tooltip).toContain("Received damage: +50% (150%)");
      // All additional penalties must be text descriptions, not values
      expect(tooltip).toContain("cannot move");
      expect(tooltip).toContain("cannot attack");
      expect(tooltip).toContain("cannot retaliate");
      expect(tooltip).toContain("reduced defense");
      expect(tooltip).toContain("automatic morale check");
      // Ensure no raw values or sentinels like 99
      expect(tooltip).not.toContain("99");
      expect(tooltip).not.toContain("canMove");
      expect(tooltip).not.toContain("false");
    });

    it("should dynamically reflect changes when combat_config values change", () => {
      // Create a modified combat config with custom values
      const customConfig: CombatConfig = JSON.parse(JSON.stringify(DEFAULT_COMBAT_CONFIG));
      customConfig.stamina.penalties.winded.damageDealtMultiplier = 0.85; // -15%
      customConfig.stamina.penalties.winded.damageTakenMultiplier = 1.15; // +15%
      customConfig.stamina.penalties.winded.canRetaliate = false; // now cannot retaliate
      customConfig.stamina.exhaustionThresholds.freshMinPercent = 0.70; // 70% needed for fresh

      // A unit with 6/10 (60%) stamina:
      // With default config (50% threshold), 6/10 would be Fresh.
      // With custom config (70% threshold), 6/10 is Winded.
      const tooltip = getStaminaTooltip(6, 10, customConfig);
      expect(tooltip).toContain("Current state: Winded.");
      expect(tooltip).toContain("Dealt damage: -15% (85%)");
      expect(tooltip).toContain("Received damage: +15% (115%)");
      expect(tooltip).toContain("reduced movement");
      expect(tooltip).toContain("cannot retaliate");
    });

    it("should correctly handle a creature object passed to getStaminaTooltip", () => {
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.stamina = 0;
      creature.stats.max_stamina = 12;

      const tooltip = getStaminaTooltip(creature);
      expect(tooltip).toContain("Current state: Depleted.");
      expect(tooltip).toContain("cannot move");
      expect(tooltip).toContain("cannot attack");

      // Recover stamina to full
      creature.stats.stamina = 12;
      const tooltipFresh = getStaminaTooltip(creature);
      expect(tooltipFresh).toContain("Current state: Fresh (No penalties).");
    });
  });

  describe("UnitStatsPanel stamina tooltip integration", () => {
    it("should update stamina tooltip when creature is set and updated", () => {
      const container = new Container();
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.stamina = 10;
      creature.stats.max_stamina = 10;

      panel.setCreature(creature);
      panel.update();

      const staminaDesc1 = (panel as any).statDescriptions[DisplayedStat.STAMINA];
      expect(staminaDesc1).toContain("Current state: Fresh");

      // Exhaust the creature
      creature.stats.stamina = 1;
      panel.update();

      const staminaDesc2 = (panel as any).statDescriptions[DisplayedStat.STAMINA];
      expect(staminaDesc2).toContain("Current state: Exhausted.");
      expect(staminaDesc2).toContain("Dealt damage: -30% (70%)");
      expect(staminaDesc2).toContain("Received damage: +20% (120%)");
      expect(staminaDesc2).toContain("cannot retaliate");
    });

    it("should update and display dynamic stamina tooltip on mouse hover in UnitStatsPanel", () => {
      const container = new Container();
      const panel = new UnitStatsPanel(container, dummyUiSheet);
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.stamina = 0;
      creature.stats.max_stamina = 10;

      panel.setCreature(creature);
      panel.update();

      // Trigger hover over stamina stat tooltip area (accounting for panel.window coordinates)
      const staminaArea = (panel as any).statTooltipAreas[DisplayedStat.STAMINA];
      panel.mousemove({
        x: (panel as any).window.x + staminaArea.x + 5,
        y: (panel as any).window.y + staminaArea.y + 5,
      });

      const displayedText = (panel as any).tooltipText.text;
      expect(displayedText).toContain("Current state: Depleted.");
      expect(displayedText).toContain("Dealt damage: -50% (50%)");
      expect(displayedText).toContain("Received damage: +50% (150%)");
      expect(displayedText).toContain("cannot move");
      expect(displayedText).toContain("cannot attack");
    });
  });

  describe("EnemyStatsPanel stamina tooltip integration", () => {
    it("should update stamina tooltip when enemy creature is set and updated", () => {
      const container = new Container();
      const panel = new EnemyStatsPanel(container, dummyUiSheet);
      const creature = new Creature(CreatureType.BARBARIAN);
      creature.stats.stamina = 2; // 2/10 = 20% -> Winded
      creature.stats.max_stamina = 10;

      panel.setCreature(creature);
      panel.update();

      const staminaDesc = (panel as any).statDescriptions[DisplayedStat.STAMINA];
      expect(staminaDesc).toContain("Current state: Winded.");
      expect(staminaDesc).toContain("Dealt damage: -10% (90%)");
      expect(staminaDesc).toContain("reduced movement");
    });

    it("should update and display dynamic stamina tooltip on mouse hover in EnemyStatsPanel", () => {
      const container = new Container();
      const panel = new EnemyStatsPanel(container, dummyUiSheet);
      panel.show();
      const creature = new Creature(CreatureType.BARBARIAN);
      creature.stats.stamina = 0;
      creature.stats.max_stamina = 10;

      panel.setCreature(creature);
      panel.update();

      const staminaArea = (panel as any).statTooltipAreas[DisplayedStat.STAMINA];
      panel.mousemove({
        x: panel.window.x + staminaArea.x + 5,
        y: panel.window.y + staminaArea.y + 5,
      });

      const displayedText = (panel as any).tooltipText.text;
      expect(displayedText).toContain("Current state: Depleted.");
      expect(displayedText).toContain("Dealt damage: -50% (50%)");
      expect(displayedText).toContain("cannot move");
      expect(displayedText).toContain("cannot attack");
    });
  });
});
