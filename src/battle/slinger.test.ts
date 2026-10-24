import { describe, it, expect } from "vitest";
import { Creature, CreatureType, CreatureTemplate } from "./creature";
import { CreatureRepository } from "./creature-repository";
import { BattleActionType } from "./battle-action";
import {
  calculateDamageWithTraits,
  getTraitInfo,
  parseTraitsConfig,
} from "./trait-system";
import { UnitVisualFactory } from "../render3d/units/unit-visual-factory";
import * as fs from "fs";
import * as path from "path";

describe("Slinger Unit and Imprecise Volley Perk", () => {
  describe("1. CreatureType & Enum Definitions", () => {
    it("should register CreatureType.SLINGER with value 10", () => {
      expect(CreatureType.SLINGER).toBe(10);
    });

    it("should register 'Slinger' in Creature.CREATURE_NAMES", () => {
      expect(Creature.CREATURE_NAMES[CreatureType.SLINGER]).toBe("Slinger");
    });

    it("should instantiate a Slinger with default ranged properties and quick draw", () => {
      const slinger = new Creature(CreatureType.SLINGER);
      expect(slinger.creatureType).toBe(CreatureType.SLINGER);
      expect(slinger.stats.is_ranged).toBe(true);
      expect(slinger.stats.range).toBe(6);
      expect(slinger.stats.ammo).toBeGreaterThanOrEqual(10);
      expect(slinger.hasQuickDrawAbility()).toBe(true);
    });
  });

  describe("2. Creature Repository & Template Data", () => {
    const creatureTypesPath = path.resolve(__dirname, "../../public/creaturetypes.json");
    const rawTemplates: CreatureTemplate[] = JSON.parse(
      fs.readFileSync(creatureTypesPath, "utf-8")
    );

    it("should load slinger from creaturetypes.json with correct stats", () => {
      const slingerTemplate = rawTemplates.find((t) => t.name === "slinger");
      const archerTemplate = rawTemplates.find((t) => t.name === "peasant-archer");

      expect(slingerTemplate).toBeDefined();
      expect(archerTemplate).toBeDefined();

      if (!slingerTemplate || !archerTemplate) return;

      // Fewer slinger units in a squad (8 vs 12)
      expect(slingerTemplate.model_count).toBe(8);
      expect(archerTemplate.model_count).toBe(12);
      expect(slingerTemplate.model_count).toBeLessThan(archerTemplate.model_count);

      // Model HP and total squad HP
      expect(slingerTemplate.model_hp).toBe(3);
      expect(slingerTemplate.stats.health).toBe(24); // 8 * 3

      // Damage is less by 1 point compared to archers
      expect(slingerTemplate.stats.attack_melee_low).toBe(archerTemplate.stats.attack_melee_low - 1);
      expect(slingerTemplate.stats.attack_melee_high).toBe(archerTemplate.stats.attack_melee_high - 1);
      expect(slingerTemplate.stats.attack_ranged_low).toBe(archerTemplate.stats.attack_ranged_low - 1);
      expect(slingerTemplate.stats.attack_ranged_high).toBe(archerTemplate.stats.attack_ranged_high - 1);

      // Slinger melee: 3-5 (archer: 4-6)
      expect(slingerTemplate.stats.attack_melee_low).toBe(3);
      expect(slingerTemplate.stats.attack_melee_high).toBe(5);

      // Slinger ranged: 6-8 (archer: 7-9)
      expect(slingerTemplate.stats.attack_ranged_low).toBe(6);
      expect(slingerTemplate.stats.attack_ranged_high).toBe(8);

      // All other stats should be copied from peasant archer
      expect(slingerTemplate.tier).toBe(archerTemplate.tier);
      expect(slingerTemplate.stats.ammo).toBe(archerTemplate.stats.ammo);
      expect(slingerTemplate.stats.range).toBe(archerTemplate.stats.range);
      expect(slingerTemplate.stats.num_moves).toBe(archerTemplate.stats.num_moves);
      expect(slingerTemplate.stats.stamina).toBe(archerTemplate.stats.stamina);
      expect(slingerTemplate.stats.morale).toBe(archerTemplate.stats.morale);
      expect(slingerTemplate.stats.initiative).toBe(archerTemplate.stats.initiative);
      expect(slingerTemplate.stats.defense_melee).toBe(archerTemplate.stats.defense_melee);
      expect(slingerTemplate.stats.defense_ranged).toBe(archerTemplate.stats.defense_ranged);

      // Traits: FragileLine, ImpreciseVolley
      expect(slingerTemplate.traits).toContain("FragileLine");
      expect(slingerTemplate.traits).toContain("ImpreciseVolley");
    });

    it("should instantiate slinger from CreatureRepository by type and by name", () => {
      const repo = new CreatureRepository();
      repo.setCreatureTemplates(rawTemplates);

      const slingerFromType = repo.createCreature(CreatureType.SLINGER);
      expect(slingerFromType.creatureType).toBe(CreatureType.SLINGER);
      expect(slingerFromType.stats.model_count).toBe(8);
      expect(slingerFromType.stats.health).toBe(24);
      expect(slingerFromType.stats.attack_melee_low).toBe(3);
      expect(slingerFromType.stats.attack_ranged_low).toBe(6);
      expect(slingerFromType.stats.traits).toContain("ImpreciseVolley");

      const slingerFromName = repo.createCreatureByName("slinger");
      expect(slingerFromName.creatureType).toBe(CreatureType.SLINGER);
      expect(slingerFromName.stats.model_count).toBe(8);
      expect(slingerFromName.stats.remaining_ammo).toBe(12);
    });
  });

  describe("3. Imprecise Volley Perk Damage Multipliers", () => {
    it("should display trait info for Imprecise Volley", () => {
      const info = getTraitInfo("ImpreciseVolley");
      expect(info).not.toBeNull();
      expect(info?.name).toBe("Imprecise Volley");
      expect(info?.description).toContain("150%");
      expect(info?.description).toContain("100%");
      expect(info?.description).toContain("50%");
    });

    it("should parse impreciseVolley configuration from JSON", () => {
      const parsed = parseTraitsConfig({
        impreciseVolley: {
          highThreshold: 0.8,
          highMultiplier: 1.6,
          midThreshold: 0.4,
          midMultiplier: 1.0,
          lowMultiplier: 0.4,
        },
      });

      expect(parsed.impreciseVolley.highThreshold).toBe(0.8);
      expect(parsed.impreciseVolley.highMultiplier).toBe(1.6);
      expect(parsed.impreciseVolley.midThreshold).toBe(0.4);
      expect(parsed.impreciseVolley.lowMultiplier).toBe(0.4);
    });

    it("should inflict 150% damage when shooting at squads with > 75% units", () => {
      const slinger = new Creature(CreatureType.SLINGER);
      slinger.stats.traits = ["FragileLine", "ImpreciseVolley"];

      // Target with 8 out of 8 models (100% > 75%)
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.model_count = 8;
      defender.stats.model_hp = 5;
      defender.stats.health = 40;
      defender.stats.remaining_health = 40;

      const result = calculateDamageWithTraits({
        attacker: slinger,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 10,
      });

      expect(result.volleyMultiplier).toBe(1.5);
      expect(result.damage).toBe(15); // 10 * 1.5 = 15
    });

    it("should inflict 100% damage when shooting at squads with 50%-75% units", () => {
      const slinger = new Creature(CreatureType.SLINGER);
      slinger.stats.traits = ["ImpreciseVolley"];

      // Target with 5 out of 8 models (62.5%, which is between 50% and 75%)
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.model_count = 8;
      defender.stats.model_hp = 5;
      defender.stats.health = 40;
      defender.stats.remaining_health = 25; // 5 * 5 = 25

      const result = calculateDamageWithTraits({
        attacker: slinger,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 10,
      });

      expect(result.volleyMultiplier).toBe(1.0);
      expect(result.damage).toBe(10); // 10 * 1.0 = 10
    });

    it("should inflict 50% damage when shooting at squads with < 50% units", () => {
      const slinger = new Creature(CreatureType.SLINGER);
      slinger.stats.traits = ["ImpreciseVolley"];

      // Target with 3 out of 8 models (37.5% < 50%)
      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.model_count = 8;
      defender.stats.model_hp = 5;
      defender.stats.health = 40;
      defender.stats.remaining_health = 15; // 3 * 5 = 15

      const result = calculateDamageWithTraits({
        attacker: slinger,
        defender,
        attackType: BattleActionType.ATTACK_RANGED,
        baseDamage: 10,
      });

      expect(result.volleyMultiplier).toBe(0.5);
      expect(result.damage).toBe(5); // 10 * 0.5 = 5
    });

    it("should not apply Imprecise Volley multiplier to melee attacks", () => {
      const slinger = new Creature(CreatureType.SLINGER);
      slinger.stats.traits = ["ImpreciseVolley"];

      const defender = new Creature(CreatureType.SWORDSMAN);
      defender.stats.model_count = 8;
      defender.stats.model_hp = 5;
      defender.stats.health = 40;
      defender.stats.remaining_health = 40;

      const result = calculateDamageWithTraits({
        attacker: slinger,
        defender,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
      });

      expect(result.volleyMultiplier).toBe(1.0);
      expect(result.damage).toBe(10);
    });
  });

  describe("4. Visual Assets & Spritesheet Integration", () => {
    it("should map slinger CreatureType to slinger_right.png in UnitVisualFactory", () => {
      const factory = new UnitVisualFactory();
      expect(factory.getFrameNameForCreature(CreatureType.SLINGER, false)).toBe("slinger_right.png");
      expect(factory.getFrameNameForCreature("slinger", false)).toBe("slinger_right.png");
    });

    it("should have slinger frames defined in unitsspritesheet.json", () => {
      const spritesheetPath = path.resolve(__dirname, "../../public/unitsspritesheet.json");
      const spritesheet = JSON.parse(fs.readFileSync(spritesheetPath, "utf-8"));

      expect(spritesheet.frames["slinger_right.png"]).toBeDefined();
      expect(spritesheet.frames["slinger_left.png"]).toBeDefined();
      expect(spritesheet.frames["slinger_face.png"]).toBeDefined();

      expect(spritesheet.frames["slinger_right.png"].frame).toEqual({
        x: 160,
        y: 640,
        w: 160,
        h: 320,
      });
      expect(spritesheet.frames["slinger_left.png"].frame).toEqual({
        x: 0,
        y: 960,
        w: 160,
        h: 320,
      });
    });

    it("should have generated slinger PNG renders in public/units", () => {
      const rightPath = path.resolve(__dirname, "../../public/units/slinger_right.png");
      const leftPath = path.resolve(__dirname, "../../public/units/slinger_left.png");
      const facePath = path.resolve(__dirname, "../../public/units/slinger_face.png");

      expect(fs.existsSync(rightPath)).toBe(true);
      expect(fs.existsSync(leftPath)).toBe(true);
      expect(fs.existsSync(facePath)).toBe(true);
      expect(fs.statSync(rightPath).size).toBeGreaterThan(10000);
      expect(fs.statSync(leftPath).size).toBeGreaterThan(10000);
      expect(fs.statSync(facePath).size).toBeGreaterThan(1000);
    });

    it("should have impreciseVolley in combat_config.json and traits.json", () => {
      const combatCfg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../../public/combat_config.json"), "utf-8")
      );
      const traitsCfg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../../public/traits.json"), "utf-8")
      );

      expect(combatCfg.traits.impreciseVolley).toBeDefined();
      expect(combatCfg.traits.impreciseVolley.highMultiplier).toBe(1.5);
      expect(combatCfg.traits.impreciseVolley.midMultiplier).toBe(1.0);
      expect(combatCfg.traits.impreciseVolley.lowMultiplier).toBe(0.5);

      expect(traitsCfg.impreciseVolley).toBeDefined();
      expect(traitsCfg.impreciseVolley.highMultiplier).toBe(1.5);
    });

    it("should create 8 model billboard visuals for Slinger squad with valid textures", () => {
      const factory = new UnitVisualFactory();
      const slinger = new Creature(CreatureType.SLINGER);
      slinger.stats.model_count = 8;
      slinger.stats.model_hp = 3;
      slinger.stats.health = 24;
      slinger.stats.remaining_health = 24;

      const squad = factory.createSquadVisual(slinger);
      const firstVisual = (squad as any).models[0];
      console.log('firstVisual mesh:', firstVisual.mesh);
      console.log('firstVisual material:', firstVisual.material);
      console.log('firstVisual material.map:', firstVisual.material?.map);
      expect(squad).toBeDefined();

      const modelGroups = squad.rootGroup.children.filter(
        (c) => c !== (squad as any).overheadGroup
      );
      expect(modelGroups.length).toBe(8);

      modelGroups.forEach((group) => {
        expect(group.visible).toBe(true);
        const mesh = group.children[0] as any;
        expect(mesh).toBeDefined();
        const mat = mesh.material;
        expect(mat).toBeDefined();
        expect(mat.map).toBeDefined();
      });
    });
  });
});
