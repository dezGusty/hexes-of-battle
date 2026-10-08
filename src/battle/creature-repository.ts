import { Ability } from "./ability";
import { Creature, CreatureTemplate, CreatureType } from "./creature";

export class CreatureRepository {
  abilities: Ability[] = [];
  creatureTemplates: CreatureTemplate[] = [];
  nameToTypesMap: Map<CreatureType, string> = new Map<CreatureType, string>([
    [CreatureType.PEASANT, "peasant"],
    [CreatureType.PEASANT_ARCHER, "peasant-archer"],
    [CreatureType.SWORDSMAN, "swordsman"],
    [CreatureType.SPEARMAN, "spearman"],
    [CreatureType.CROSSBOWMAN, "crossbowman"],
    [CreatureType.BARBARIAN, "barbarian"],
    [CreatureType.HEAVY_KNIGHTS, "heavy-knights"],
    [CreatureType.BEHEMOTH, "behemoth"],
    [CreatureType.HERO_COMMANDER, "hero-commander"],
  ]);

  constructor() {}

  setAbilities(abilities: Ability[]) {
    this.abilities = abilities;
  }

  setCreatureTemplates(templates: CreatureTemplate[]) {
    this.creatureTemplates = templates;
  }

  createCreature(creatureType: CreatureType): Creature {
    const creatureTypeName = this.nameToTypesMap.get(creatureType);
    const creatureTemplate = this.creatureTemplates.find((template) => template.name === creatureTypeName);
    if (!creatureTemplate) {
      throw new Error(`Could not find creature template for creature type ${creatureType}`);
    }

    const templateStats = { ...creatureTemplate.stats };
    const result = new Creature(creatureType, { ...templateStats }, []);
    result.stats.model_count = creatureTemplate.model_count ?? result.stats.model_count;
    result.stats.model_hp = creatureTemplate.model_hp ?? result.stats.model_hp;
    result.stats.tier = creatureTemplate.tier ?? result.stats.tier;
    result.stats.is_hero = creatureTemplate.is_hero ?? result.stats.is_hero;
    result.stats.flying = creatureTemplate.flying ?? creatureTemplate.stats.flying ?? false;
    result.stats.traits = creatureTemplate.traits ? [...creatureTemplate.traits] : [];

    result.stats.remaining_ammo = result.stats.ammo;
    result.stats.remaining_attacks = result.stats.num_attacks;
    result.stats.remaining_counterattacks = result.stats.num_counterattacks;
    result.stats.remaining_health = result.stats.health;
    result.stats.remaining_movement = result.stats.num_moves;
    result.stats.max_stamina = result.stats.stamina;
    result.stats.base_morale = result.stats.morale;

    result.abilities = (creatureTemplate.ability_ids || [])
      .map((abilityId) => {
        const ability = this.abilities.find((a) => a.id === abilityId);
        return ability ?? null;
      })
      .filter((a): a is Ability => a !== null);

    result.updateExhaustionState();
    return result;
  }

  createCreatureByName(typeName: string): Creature {
    let matchedType: CreatureType = CreatureType.PEASANT;
    for (const [cType, name] of this.nameToTypesMap.entries()) {
      if (name === typeName || name.toLowerCase() === typeName.toLowerCase()) {
        matchedType = cType;
        break;
      }
    }
    return this.createCreature(matchedType);
  }
}
