import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { Creature, CreatureType, CreatureTemplate } from "./creature";
import { CreatureRepository } from "./creature-repository";
import { Ability } from "./ability";
import { Battle } from "../battle";
import { HexMap } from "../shared/hex-map";
import { UnitVisualFactory } from "../render3d/units/unit-visual-factory";
import {
  isUnit3DModelSupported,
  buildArticulatedUnit3DMesh,
  SUPPORTED_3D_UNIT_KEYS,
} from "../render3d/units/unit-mesh-builder";
import {
  HUMANOID_TEXTURE_PATHS,
  getHumanoidPartTexture,
  getHumanoidPartMaterial,
} from "../render3d/units/humanoid-unit-textures";

describe("Healer Squad and Mend Wounds Skill", () => {
  describe("1. CreatureType & Enum Definitions", () => {
    it("should register CreatureType.HEALER with value 11", () => {
      expect(CreatureType.HEALER).toBe(11);
    });

    it("should register 'Healer' in Creature.CREATURE_NAMES at index 11", () => {
      expect(Creature.CREATURE_NAMES[CreatureType.HEALER]).toBe("Healer");
    });

    it("should instantiate a Healer with 8 models, 0 melee armor, 1 range armor, and mend wounds ability by default", () => {
      const healer = new Creature(CreatureType.HEALER);
      expect(healer.creatureType).toBe(CreatureType.HEALER);
      expect(healer.stats.model_count).toBe(8);
      expect(healer.stats.defense_melee).toBe(0);
      expect(healer.stats.defense_ranged).toBe(1);
      expect(healer.stats.health).toBe(32); // 8 * 4
      expect(healer.abilities.length).toBeGreaterThan(0);
      const mendWounds = healer.abilities.find((a) => a.id === "mend-wounds-01" || a.name?.toLowerCase().includes("mend wounds"));
      expect(mendWounds).toBeDefined();
    });
  });

  describe("2. Creature Repository & Template Data from JSON", () => {
    const creatureTypesPath = path.resolve(__dirname, "../../public/creaturetypes.json");
    const rawTemplates: CreatureTemplate[] = JSON.parse(
      fs.readFileSync(creatureTypesPath, "utf-8")
    );

    it("should load healer from creaturetypes.json with exactly 8 models, 0 melee armor, and 1 range armor", () => {
      const healerTemplate = rawTemplates.find((t) => t.name === "healer");
      expect(healerTemplate).toBeDefined();
      if (!healerTemplate) return;

      expect(healerTemplate.model_count).toBe(8);
      expect(healerTemplate.model_hp).toBe(4);
      expect(healerTemplate.stats.health).toBe(32);
      expect(healerTemplate.stats.defense_melee).toBe(0);
      expect(healerTemplate.stats.defense_ranged).toBe(1);
      expect(healerTemplate.ability_ids).toContain("mend-wounds-01");
      expect(healerTemplate.traits).toContain("FragileLine");
    });

    it("should instantiate a Healer creature via CreatureRepository with abilities and stats bound", () => {
      const repo = new CreatureRepository();
      repo.setCreatureTemplates(rawTemplates);
      const abilityPath = path.resolve(__dirname, "../../public/abilitytypes.json");
      const abilities: Ability[] = JSON.parse(fs.readFileSync(abilityPath, "utf-8"));
      repo.setAbilities(abilities);

      const healer = repo.createCreature(CreatureType.HEALER);
      expect(healer.creatureType).toBe(CreatureType.HEALER);
      expect(healer.stats.model_count).toBe(8);
      expect(healer.stats.defense_melee).toBe(0);
      expect(healer.stats.defense_ranged).toBe(1);
      expect(healer.aliveModelCount).toBe(8);
      expect(healer.abilities.some((a) => a.id === "mend-wounds-01")).toBe(true);
    });
  });

  describe("3. 'Mend wounds' Skill Configuration in JSON", () => {
    const abilityPath = path.resolve(__dirname, "../../public/abilitytypes.json");
    const abilities: any[] = JSON.parse(fs.readFileSync(abilityPath, "utf-8"));

    it("should configure 'mend-wounds-01' in abilitytypes.json targeting allies and self", () => {
      const mendWounds = abilities.find((a) => a.id === "mend-wounds-01" || a.name?.toLowerCase().includes("mend wounds"));
      expect(mendWounds).toBeDefined();
      expect(mendWounds.abilityType).toBe("active");
      expect(mendWounds.allowedTargets).toContain("self");
      expect(mendWounds.allowedTargets).toContain("allies");
      expect(mendWounds.allowedTargets).not.toContain("enemies");
      expect(mendWounds.requiresTarget).toBe(true);
      expect(mendWounds.range).toBe(1);
      expect(mendWounds.heal_per_model).toBe(1);
    });

    it("should have stamina and attack resource costs configured in JSON", () => {
      const mendWounds = abilities.find((a) => a.id === "mend-wounds-01");
      expect(mendWounds).toBeDefined();
      const staminaCost = mendWounds.resources.find((r: any) => r.resource_used === "stamina");
      const attackCost = mendWounds.resources.find((r: any) => r.resource_used === "attack");

      expect(staminaCost).toBeDefined();
      expect(staminaCost.resource_cost).toBeGreaterThanOrEqual(1);
      expect(attackCost).toBeDefined();
      expect(attackCost.resource_cost).toBe(1);
    });

    it("should have an existing icon file in public/skills/", () => {
      const mendWounds = abilities.find((a) => a.id === "mend-wounds-01");
      expect(mendWounds?.icon).toBeDefined();
      const iconPath = path.resolve(__dirname, "../../public", mendWounds.icon);
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });

  describe("4. Healing Mechanics & Target Allowed Rules", () => {
    it("should calculate heal amount as 1 HP per available healer in the squad", () => {
      const healer = new Creature(CreatureType.HEALER);
      healer.stats.model_count = 8;
      healer.stats.model_hp = 4;
      healer.stats.health = 32;
      healer.stats.remaining_health = 32;

      // When all 8 healers are alive: 8 HP
      expect(healer.aliveModelCount).toBe(8);

      const ally = new Creature(CreatureType.SWORDSMAN);
      ally.stats.health = 40;
      ally.stats.remaining_health = 20;

      const ability = Ability.createMendWounds();
      expect(ability.heal_per_model).toBe(1);

      // Simulate battle execution
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(6, 6);
      battle.creatures = [healer, ally];
      let healedAmount = 0;
      battle.hookDoingHeal = (data) => {
        healedAmount = data.amount;
      };

      battle.executeHealAbility(healer, ally, ability);
      expect(ally.stats.remaining_health).toBe(28); // 20 + 8
      expect(healedAmount).toBe(8);
    });

    it("should scale heal amount down as healers are lost (e.g. 5 alive healers heal 5 HP)", () => {
      const healer = new Creature(CreatureType.HEALER);
      healer.stats.model_count = 8;
      healer.stats.model_hp = 4;
      healer.stats.health = 32;
      // 5 alive healers out of 8: remaining_health = 20 (ceil(20 / 4) = 5)
      healer.stats.remaining_health = 20;
      expect(healer.aliveModelCount).toBe(5);

      const ally = new Creature(CreatureType.SPEARMAN);
      ally.stats.health = 40;
      ally.stats.remaining_health = 15;

      const ability = Ability.createMendWounds();
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(6, 6);
      battle.creatures = [healer, ally];
      battle.executeHealAbility(healer, ally, ability);

      expect(ally.stats.remaining_health).toBe(20); // 15 + 5
    });

    it("should allow healer to target self and heal wounds up to max health", () => {
      const healer = new Creature(CreatureType.HEALER);
      healer.stats.model_count = 8;
      healer.stats.model_hp = 4;
      healer.stats.health = 32;
      healer.stats.remaining_health = 26; // wounded
      healer.stats.stamina = 10;
      healer.stats.remaining_attacks = 1;
      expect(healer.aliveModelCount).toBe(7); // ceil(26 / 4) = 7

      const ability = Ability.createMendWounds();
      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(6, 6);
      battle.creatures = [healer];

      battle.executeHealAbility(healer, healer, ability);
      // 26 + 7 = 33, capped at 32
      expect(healer.stats.remaining_health).toBe(32);
      expect(healer.stats.stamina).toBe(8); // 10 - 2
      expect(healer.stats.remaining_attacks).toBe(0);
      expect(healer.stats.has_attacked).toBe(true);
    });

    it("should allow targeting allies and self but reject enemies in isTargetAllowedForAbility", () => {
      const healer = new Creature(CreatureType.HEALER);
      healer.position = { x: 2, y: 2 };
      healer.armyAlignment = 0;

      const ally = new Creature(CreatureType.SWORDSMAN);
      ally.position = { x: 3, y: 2 }; // adjacent
      ally.armyAlignment = 0;

      const enemy = new Creature(CreatureType.BARBARIAN);
      enemy.position = { x: 2, y: 3 }; // adjacent
      enemy.armyAlignment = 1;

      const hexMap = new HexMap(6, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(6, 6);
      battle.creatures = [healer, ally, enemy];
      const ability = Ability.createMendWounds();

      // Setup ability reach matrix for range 1
      battle.showAbilityReachableCells(ability, healer);

      // Self (2, 2) is allowed
      expect(battle.isTargetAllowedForAbility(ability, healer, { x: 2, y: 2 })).toBe(true);
      // Ally (3, 2) is allowed
      expect(battle.isTargetAllowedForAbility(ability, healer, { x: 3, y: 2 })).toBe(true);
      // Enemy (2, 3) is NOT allowed
      expect(battle.isTargetAllowedForAbility(ability, healer, { x: 2, y: 3 })).toBe(false);
      // Out of range (5, 5) is NOT allowed
      expect(battle.isTargetAllowedForAbility(ability, healer, { x: 5, y: 5 })).toBe(false);
    });

    it("should not allow healing dead units", () => {
      const deadCreature = new Creature(CreatureType.PEASANT);
      deadCreature.stats.remaining_health = 0;
      expect(deadCreature.isAlive).toBe(false);

      const healResult = deadCreature.heal(10);
      expect(healResult.healed).toBe(0);
      expect(deadCreature.stats.remaining_health).toBe(0);
    });
  });

  describe("5. 3D Unit Rendering & Asset Integration", () => {
    it("should include 'healer' in SUPPORTED_3D_UNIT_KEYS", () => {
      expect(SUPPORTED_3D_UNIT_KEYS).toContain("healer");
      expect(isUnit3DModelSupported(CreatureType.HEALER)).toBe(true);
      expect(isUnit3DModelSupported("healer")).toBe(true);
    });

    it("should build articulated 3D mesh for Healer with satchel, simple shield, and knife compacted into <= 8 limbs", () => {
      const healerMesh = buildArticulatedUnit3DMesh(CreatureType.HEALER, 0, false);
      expect(healerMesh).toBeDefined();

      const limbMeshes = new Map<string, THREE.Mesh>();
      healerMesh.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          limbMeshes.set(node.name, node as THREE.Mesh);
        }
      });

      // Total compacted limbs must be <= 8 for high performance
      expect(limbMeshes.size).toBeLessThanOrEqual(8);

      // Limbs: Head, Torso, Arm_L, Arm_R, Leg_L, Leg_R, Weapon, Shield
      expect(limbMeshes.has("Head")).toBe(true);
      expect(limbMeshes.has("Torso")).toBe(true);
      expect(limbMeshes.has("Arm_L")).toBe(true);
      expect(limbMeshes.has("Arm_R")).toBe(true);
      expect(limbMeshes.has("Weapon")).toBe(true); // Remedy knife
      expect(limbMeshes.has("Shield")).toBe(true); // Simple wooden buckler shield

      // Materials: peasant cloth for torso, peasant face for head, healer gear for weapon/shield
      const headMat = limbMeshes.get("Head")?.material as THREE.MeshStandardMaterial;
      const weaponMat = limbMeshes.get("Weapon")?.material as THREE.MeshStandardMaterial;
      const shieldMat = limbMeshes.get("Shield")?.material as THREE.MeshStandardMaterial;
      const torsoMat = limbMeshes.get("Torso")?.material as THREE.MeshStandardMaterial;

      expect(headMat).toBe(getHumanoidPartMaterial("peasant_face", 0.76, 0.05));
      expect(weaponMat).toBe(getHumanoidPartMaterial("healer_gear", 0.45, 0.70));
      expect(shieldMat).toBe(getHumanoidPartMaterial("healer_gear", 0.58, 0.35));
      expect(torsoMat).toBe(getHumanoidPartMaterial("peasant_cloth", 0.86, 0.02));
    });

    it("should instantiate an 8-model visual squad for Healer using UnitVisualFactory", () => {
      const factory = new UnitVisualFactory();
      const healer = new Creature(CreatureType.HEALER);
      healer.stats.model_count = 8;
      const squad = factory.createSquadVisual(healer);

      expect(squad).toBeDefined();
      expect(squad.models.length).toBe(8);

      squad.dispose();
    });

    it("should have valid 256x256 healer_gear.png texture on disk with multi-tone contrast", () => {
      const gearPath = path.resolve(__dirname, "../../public", HUMANOID_TEXTURE_PATHS.healer_gear);
      expect(fs.existsSync(gearPath)).toBe(true);

      const buf = fs.readFileSync(gearPath);
      expect(buf[0]).toBe(0x89);
      expect(buf.toString("ascii", 1, 4)).toBe("PNG");
      expect(buf.readUInt32BE(16)).toBe(256);
      expect(buf.readUInt32BE(20)).toBe(256);

      const tex = getHumanoidPartTexture("healer_gear");
      expect(tex.image.width).toBe(256);
      expect(tex.image.height).toBe(256);

      // Verify contrast > 40
      const data = tex.image.data as Uint8Array;
      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < data.length; i += 16) {
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }
      expect(maxLum - minLum).toBeGreaterThan(40);
    });

    it("should have binary glTF 2.0 (healer.glb) exported in public/models/units/", () => {
      const glbPath = path.resolve(__dirname, "../../public/models/units/healer.glb");
      expect(fs.existsSync(glbPath)).toBe(true);

      const buf = fs.readFileSync(glbPath);
      expect(buf.byteLength).toBeGreaterThan(1024);
      expect(buf.toString("ascii", 0, 4)).toBe("glTF");
      expect(buf.readUInt32LE(4)).toBe(2);
    });
  });
});
