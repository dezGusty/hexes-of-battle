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
    [CreatureType.BARBARIAN, "barbarian"]
  ]);

  constructor() { }

  setAbilities(abilities: Ability[]) {
    this.abilities = abilities;
  }

  setCreatureTemplates(templates: CreatureTemplate[]) {
    this.creatureTemplates = templates;
  }

  createCreature(creatureType: CreatureType): Creature {

    // get the creature type name based on the creature type
    const creatureTypeName = this.nameToTypesMap.get(creatureType);

    // find the template by the creature name
    const creatureTemplate = this.creatureTemplates.find(template => template.name === creatureTypeName);
    if (!creatureTemplate) {
      throw new Error(`Could not find creature template for creature type ${creatureType}`);
    }

    let result = new Creature(creatureType, { ...creatureTemplate.stats }, []);
    result.stats.remaining_ammo = result.stats.ammo;
    result.stats.remaining_attacks = result.stats.num_attacks;
    result.stats.remaining_counterattacks = result.stats.num_counterattacks;
    result.stats.remaining_health = result.stats.health;
    result.stats.remaining_movement = result.stats.num_moves;

    result.abilities = creatureTemplate.ability_ids.map(abilityId => {
      const ability = this.abilities.find(ability => ability.id === abilityId);
      if (!ability) {
        return null;
      }
      return ability;
    }).filter(ability => ability !== null) as Ability[];

    console.log("Created creature: ", result);

    return result;
  }
}

