import { describe, it, expect, beforeEach } from "vitest";
import { BattleActionType } from "./battle-action";
import { Creature, CreatureType } from "./creature";
import { CreatureRepository } from "./creature-repository";
import { calculateDamageWithTraits, creatureHasTrait, getTraitInfo } from "./trait-system";
import * as fs from "fs";
import * as path from "path";

describe("Armored Knight Unit & Traits (Cavalry, Charge, Armor Penetration)", () => {
  let creatureRepo: CreatureRepository;

  beforeEach(() => {
    creatureRepo = new CreatureRepository();
    const jsonPath = path.resolve(__dirname, "../../public/creaturetypes.json");
    const templates = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    creatureRepo.setCreatureTemplates(templates);
  });

  describe("1. Template & Squad Stats", () => {
    it("should instantiate Armored Knight with exactly 5 models, heavy armor, and high stats", () => {
      const knight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);
      const swordsman = creatureRepo.createCreature(CreatureType.SWORDSMAN);

      // Squad size: exactly 5 models
      expect(knight.stats.model_count).toBe(5);
      expect(knight.aliveModelCount).toBe(5);
      expect(knight.maxModels).toBe(5);

      // Hit points: 60 total, 12 per model (swordsman has 40 HP)
      expect(knight.stats.health).toBe(60);
      expect(knight.stats.model_hp).toBe(12);
      expect(knight.stats.health).toBeGreaterThan(swordsman.stats.health);

      // Damage: 12-16 (swordsman has 9-11)
      expect(knight.stats.attack_melee_low).toBe(12);
      expect(knight.stats.attack_melee_high).toBe(16);
      expect(knight.stats.attack_melee_low).toBeGreaterThan(swordsman.stats.attack_melee_low);
      expect(knight.stats.attack_melee_high).toBeGreaterThan(swordsman.stats.attack_melee_high);

      // Speed: twice as fast as swordsman (4 vs 2 moves)
      expect(knight.stats.num_moves).toBe(4);
      expect(knight.stats.num_moves).toBe(swordsman.stats.num_moves * 2);

      // Stamina: double swordsman (44 vs 22)
      expect(knight.stats.stamina).toBe(44);
      expect(knight.stats.max_stamina).toBe(44);
      expect(knight.stats.stamina).toBe(swordsman.stats.stamina * 2);

      // Heavy armor: defense_melee 4, defense_ranged 3
      expect(knight.stats.defense_melee).toBe(4);
      expect(knight.stats.defense_ranged).toBe(3);

      // Traits: Cavalry, Charge, ArmorPenetration
      expect(creatureHasTrait(knight, "Cavalry")).toBe(true);
      expect(creatureHasTrait(knight, "Charge")).toBe(true);
      expect(creatureHasTrait(knight, "ArmorPenetration")).toBe(true);
    });

    it("should provide fallback stats when created without repository", () => {
      const fallbackKnight = new Creature(CreatureType.ARMORED_KNIGHT);
      expect(fallbackKnight.stats.model_count).toBe(5);
      expect(fallbackKnight.stats.model_hp).toBe(12);
      expect(fallbackKnight.stats.health).toBe(60);
      expect(fallbackKnight.stats.attack_melee_low).toBe(12);
      expect(fallbackKnight.stats.attack_melee_high).toBe(16);
      expect(fallbackKnight.stats.num_moves).toBe(4);
      expect(fallbackKnight.stats.stamina).toBe(44);
      expect(fallbackKnight.stats.defense_melee).toBe(4);
      expect(fallbackKnight.stats.defense_ranged).toBe(3);
      expect(creatureHasTrait(fallbackKnight, "Cavalry")).toBe(true);
      expect(fallbackKnight.name).toBe("Armored Knight");
    });
  });

  describe("2. Trait Metadata & Trait Info", () => {
    it("should return valid trait info for cavalry and charge", () => {
      const cavalryInfo = getTraitInfo("cavalry");
      expect(cavalryInfo?.name).toBe("Cavalry");
      expect(cavalryInfo?.icon).toContain("icon_cavalry.png");

      const chargeInfo = getTraitInfo("charge");
      expect(chargeInfo?.name).toBe("Charge");
      expect(chargeInfo?.icon).toContain("icon_charge.png");
      expect(chargeInfo?.description).toContain("+8%");
    });
  });

  describe("3. Armor Penetration Perk on Knight", () => {
    it("should ignore 50% of defender melee armor", () => {
      const attackerKnight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);
      const defenderKnight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);

      // Defender Knight has defense_melee: 4 (no shield block)
      // Base attack 14 vs armor 4:
      // Without AP: 14 - 4 = 10
      // With AP (50% ignored -> armor 2): 14 - 2 = 12
      const result = calculateDamageWithTraits({
        attacker: attackerKnight,
        defender: defenderKnight,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 14,
        targetArmor: defenderKnight.stats.defense_melee,
        traveledHexes: 0,
      });

      expect(result.armorPenetrated).toBe(2);
      expect(result.damage).toBe(12);
    });
  });

  describe("4. Charge Perk Mechanics", () => {
    it("should apply +8% damage bonus per hex traveled when attacking", () => {
      const knight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);
      const peasant = creatureRepo.createCreature(CreatureType.PEASANT); // 0 armor

      // Base damage 10 against 0 armor
      // 0 hexes traveled: multiplier 1.0 -> 10 damage
      const dmg0 = calculateDamageWithTraits({
        attacker: knight,
        defender: peasant,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        targetArmor: 0,
        traveledHexes: 0,
      });
      expect(dmg0.damage).toBe(10);
      expect(dmg0.chargeMultiplier).toBe(1.0);

      // 1 hex traveled: multiplier 1.08 -> 10 * 1.08 = 10.8 -> round 11
      const dmg1 = calculateDamageWithTraits({
        attacker: knight,
        defender: peasant,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        targetArmor: 0,
        traveledHexes: 1,
      });
      expect(dmg1.chargeMultiplier).toBe(1.08);
      expect(dmg1.damage).toBe(11);

      // 3 hexes traveled: multiplier 1.24 -> 10 * 1.24 = 12.4 -> round 12
      const dmg3 = calculateDamageWithTraits({
        attacker: knight,
        defender: peasant,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        targetArmor: 0,
        traveledHexes: 3,
      });
      expect(dmg3.chargeMultiplier).toBe(1.24);
      expect(dmg3.damage).toBe(12);

      // 4 hexes traveled (full sprint): multiplier 1.32 -> 10 * 1.32 = 13.2 -> round 13
      const dmg4 = calculateDamageWithTraits({
        attacker: knight,
        defender: peasant,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 10,
        targetArmor: 0,
        traveledHexes: 4,
      });
      expect(dmg4.chargeMultiplier).toBe(1.32);
      expect(dmg4.damage).toBe(13);
    });

    it("should suffer +8% bonus damage taken from retaliation per hex traveled", () => {
      const knight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);
      const barbarian = creatureRepo.createCreature(CreatureType.BARBARIAN);

      // In retaliation (COUNTER_ATTACK_MELEE):
      // Attacker is Barbarian, Defender is Knight.
      // Base attack 14 vs Knight defense_melee 4 -> netBase = 14 - 4 = 10.
      // Retaliation customMultiplier = 1.0 (for testing).

      // 0 hexes traveled: retaliation penalty 1.0 -> 10 damage
      const retal0 = calculateDamageWithTraits({
        attacker: barbarian,
        defender: knight,
        attackType: BattleActionType.COUNTER_ATTACK_MELEE,
        baseDamage: 14,
        targetArmor: knight.stats.defense_melee,
        traveledHexes: 0,
      });
      expect(retal0.damage).toBe(10);
      expect(retal0.chargeRetaliationMultiplier).toBe(1.0);

      // 3 hexes traveled: retaliation penalty 1.24 (+24%) -> 10 * 1.24 = 12.4 -> round 12
      const retal3 = calculateDamageWithTraits({
        attacker: barbarian,
        defender: knight,
        attackType: BattleActionType.COUNTER_ATTACK_MELEE,
        baseDamage: 14,
        targetArmor: knight.stats.defense_melee,
        traveledHexes: 3,
      });
      expect(retal3.damage).toBe(12);
      expect(retal3.chargeRetaliationMultiplier).toBe(1.24);

      // 4 hexes traveled: retaliation penalty 1.32 (+32%) -> 10 * 1.32 = 13.2 -> round 13
      const retal4 = calculateDamageWithTraits({
        attacker: barbarian,
        defender: knight,
        attackType: BattleActionType.COUNTER_ATTACK_MELEE,
        baseDamage: 14,
        targetArmor: knight.stats.defense_melee,
        traveledHexes: 4,
      });
      expect(retal4.damage).toBe(13);
      expect(retal4.chargeRetaliationMultiplier).toBe(1.32);
    });

    it("should not apply charge retaliation penalty when the knight is defending against a standard attack", () => {
      const knight = creatureRepo.createCreature(CreatureType.ARMORED_KNIGHT);
      const barbarian = creatureRepo.createCreature(CreatureType.BARBARIAN);

      // When Barbarian initiates ATTACK_MELEE on Knight:
      // Even if traveledHexes was set, charge penalty only applies to retaliation (COUNTER_ATTACK_MELEE)
      const attackOnKnight = calculateDamageWithTraits({
        attacker: barbarian,
        defender: knight,
        attackType: BattleActionType.ATTACK_MELEE,
        baseDamage: 14,
        targetArmor: knight.stats.defense_melee,
        traveledHexes: 3,
      });
      // Barbarian does not have Charge -> chargeMultiplier 1.0
      expect(attackOnKnight.chargeMultiplier).toBe(1.0);
      expect(attackOnKnight.damage).toBe(10); // 14 - 4
    });
  });
});
