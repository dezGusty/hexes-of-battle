import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { Creature, CreatureType } from "./creature";
import { CreatureRepository } from "./creature-repository";
import { BattleActionType } from "./battle-action";
import {
  calculateDamageWithTraits,
  getTraitInfo,
  creatureHasTrait,
} from "./trait-system";
import {
  isUnit3DModelSupported,
  buildArticulatedUnit3DMesh,
  UNIT_GLB_PATHS,
  SUPPORTED_3D_UNIT_KEYS,
} from "../render3d/units/unit-mesh-builder";
import {
  UnitVisualFactory,
  UnitVisualFormat,
} from "../render3d/units/unit-visual-factory";
import { getHumanoidPartMaterial } from "../render3d/units/humanoid-unit-textures";
import * as THREE from "three";

describe("Mace Man Unit & Armor Penetration Perk Validation", () => {
  let repo: CreatureRepository;

  beforeEach(() => {
    repo = new CreatureRepository();
    const jsonPath = path.resolve(__dirname, "../../public/creaturetypes.json");
    const templates = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    repo.setCreatureTemplates(templates);
  });

  describe("1. Creature Registration & Stats Configuration", () => {
    it("should register CreatureType.MACEMAN with enum value 12", () => {
      expect(CreatureType.MACEMAN).toBe(12);
    });

    it("should map CreatureType.MACEMAN to 'Mace Man' in Creature.CREATURE_NAMES", () => {
      expect(Creature.CREATURE_NAMES[CreatureType.MACEMAN]).toBe("Mace Man");
    });

    it("should instantiate a Maceman from repository with identical squad count to Spearman (8 units)", () => {
      const spearman = repo.createCreature(CreatureType.SPEARMAN);
      const maceman = repo.createCreature(CreatureType.MACEMAN);

      expect(spearman.stats.model_count).toBe(8);
      expect(maceman.stats.model_count).toBe(8);
      expect(maceman.stats.model_hp).toBe(5);
      expect(maceman.stats.health).toBe(40);
      expect(maceman.stats.remaining_health).toBe(40);
    });

    it("should configure Maceman as lightly armored with gambeson (defense_melee 1, defense_ranged 0)", () => {
      const maceman = repo.createCreature(CreatureType.MACEMAN);

      expect(maceman.stats.defense_melee).toBe(1);
      expect(maceman.stats.defense_ranged).toBe(0);
      expect(maceman.stats.attack_melee_low).toBe(7);
      expect(maceman.stats.attack_melee_high).toBe(10);
      expect(maceman.stats.stamina).toBe(24);
      expect(maceman.stats.is_ranged).toBe(false);
    });

    it("should initialize Maceman with ArmorPenetration trait", () => {
      const maceman = repo.createCreature(CreatureType.MACEMAN);

      expect(maceman.stats.traits).toContain("ArmorPenetration");
      expect(creatureHasTrait(maceman, "ArmorPenetration")).toBe(true);
    });
  });

  describe("2. Armor Penetration Perk Combat Mechanics", () => {
    it("should retrieve Armor Penetration trait metadata from config and traits.json", () => {
      const info = getTraitInfo("ArmorPenetration");
      expect(info).toBeDefined();
      expect(info?.id).toBe("armorPenetration");
      expect(info?.name).toBe("Armor Penetration");
      expect(info?.icon).toBe("traits/icon_armor_penetration.png");

      const traitsJsonPath = path.resolve(__dirname, "../../public/traits.json");
      const traitsJson = JSON.parse(fs.readFileSync(traitsJsonPath, "utf-8"));
      expect(traitsJson.armorPenetration).toBeDefined();
      expect(traitsJson.armorPenetration.name).toBe("Armor Penetration");
      expect(traitsJson.armorPenetration.armorIgnoredPercent).toBe(0.5);
    });

    it("should reduce target armor by 50% when Maceman attacks", () => {
      const maceman = repo.createCreature(CreatureType.MACEMAN);
      const enemy = repo.createCreature(CreatureType.BARBARIAN);
      enemy.stats.defense_melee = 8; // Heavy armor

      // Case A: Attacker without Armor Penetration
      const normalResult = calculateDamageWithTraits({
        attacker: repo.createCreature(CreatureType.PEASANT),
        defender: enemy,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 20,
        targetArmor: 8,
      });
      // 20 - 8 = 12 net damage
      expect(normalResult.damage).toBe(12);
      expect(normalResult.armorPenetrated).toBe(0);

      // Case B: Maceman with Armor Penetration (reduces 8 armor by 50% => 4 armor effective)
      const apResult = calculateDamageWithTraits({
        attacker: maceman,
        defender: enemy,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 20,
        targetArmor: 8,
      });
      // 20 - 4 = 16 net damage (ignores 4 armor)
      expect(apResult.damage).toBe(16);
      expect(apResult.armorPenetrated).toBe(4);
    });

    it("should have no effect on units with zero armor", () => {
      const maceman = repo.createCreature(CreatureType.MACEMAN);
      const unarmoredEnemy = repo.createCreature(CreatureType.PEASANT);
      unarmoredEnemy.stats.defense_melee = 0;

      const result = calculateDamageWithTraits({
        attacker: maceman,
        defender: unarmoredEnemy,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 20,
        targetArmor: 0,
      });
      expect(result.damage).toBe(20);
      expect(result.armorPenetrated).toBe(0);
    });
  });

  describe("3. 3D Unit Model, Two-Handed Stance & Assets", () => {
    it("should mark maceman as supported in 3D unit key definitions", () => {
      expect(isUnit3DModelSupported(CreatureType.MACEMAN)).toBe(true);
      expect(isUnit3DModelSupported("maceman")).toBe(true);
      expect(SUPPORTED_3D_UNIT_KEYS).toContain("maceman");
      expect(UNIT_GLB_PATHS.maceman).toBe("models/units/maceman.glb");
    });

    it("should have binary glTF 2.0 (.glb) and Blender (.blend) files exported on disk", () => {
      const rootDir = path.resolve(__dirname, "../..");
      const glbPath = path.join(rootDir, "public/models/units/maceman.glb");
      const blendPath = path.join(rootDir, "assets/blender/maceman.blend");

      expect(fs.existsSync(glbPath)).toBe(true);
      expect(fs.existsSync(blendPath)).toBe(true);

      const glbBuf = fs.readFileSync(glbPath);
      expect(glbBuf.byteLength).toBeGreaterThan(1024);
      expect(glbBuf.toString("ascii", 0, 4)).toBe("glTF");
      expect(glbBuf.readUInt32LE(4)).toBe(2);
    });

    it("should build procedural 3D model with gambeson, no shield, and mace held in both hands compacted into <= 8 limbs", () => {
      const mesh = buildArticulatedUnit3DMesh(CreatureType.MACEMAN, 0, false);
      expect(mesh).toBeDefined();

      const limbMeshes = new Map<string, THREE.Mesh>();
      mesh.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          limbMeshes.set(node.name, node as THREE.Mesh);
        }
      });

      // Total compacted limbs must be <= 8 for high performance
      expect(limbMeshes.size).toBeLessThanOrEqual(8);

      // Essential articulated humanoid hierarchy
      expect(limbMeshes.has("Torso")).toBe(true);
      expect(limbMeshes.has("Head")).toBe(true);
      expect(limbMeshes.has("Arm_L")).toBe(true);
      expect(limbMeshes.has("Arm_R")).toBe(true);
      expect(limbMeshes.has("Leg_L")).toBe(true);
      expect(limbMeshes.has("Leg_R")).toBe(true);

      // Mace weapon present on Arm_R
      expect(limbMeshes.has("Weapon")).toBe(true);

      // No shield must be equipped (two-handed weapon stance)
      expect(limbMeshes.has("Shield")).toBe(false);

      // Lightly armored gambeson texture assigned to torso and gear texture to weapon
      const torsoMat = limbMeshes.get("Torso")?.material as THREE.MeshStandardMaterial;
      const weaponMat = limbMeshes.get("Weapon")?.material as THREE.MeshStandardMaterial;
      expect(torsoMat).toBe(getHumanoidPartMaterial("maceman_armor", 0.82, 0.05));
      expect(weaponMat).toBe(getHumanoidPartMaterial("maceman_gear", 0.40, 0.65));
    });

    it("should have generated 256x256 textures for gambeson armor, mace gear, and perk icon", () => {
      const rootDir = path.resolve(__dirname, "../..");
      const armorPath = path.join(rootDir, "public/textures/units/maceman_armor.png");
      const gearPath = path.join(rootDir, "public/textures/units/maceman_gear.png");
      const iconPath = path.join(rootDir, "public/traits/icon_armor_penetration.png");

      expect(fs.existsSync(armorPath)).toBe(true);
      expect(fs.existsSync(gearPath)).toBe(true);
      expect(fs.existsSync(iconPath)).toBe(true);

      expect(fs.statSync(armorPath).size).toBeGreaterThan(5000);
      expect(fs.statSync(gearPath).size).toBeGreaterThan(5000);
      expect(fs.statSync(iconPath).size).toBeGreaterThan(5000);
    });

    it("should format maceman as FULL_3D_RIGID in UnitVisualFactory with squad count 8", () => {
      const factory = new UnitVisualFactory();
      const maceman = repo.createCreature(CreatureType.MACEMAN);
      maceman.armyAlignment = 0;

      expect(factory.determineFormat(maceman)).toBe(UnitVisualFormat.FULL_3D_RIGID);
      const squad = factory.createSquadVisual(maceman);
      expect(squad.models.length).toBe(8);
      for (const m of squad.models) {
        expect(m.format).toBe(UnitVisualFormat.FULL_3D_RIGID);
      }
    });
  });
});
