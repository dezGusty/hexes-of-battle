
export enum AbilityType {
    Active = "active",
    Passive = "passive",
    Toggle = "toggle"
}

export enum AbilityTarget {
    Self = "self", // for abilities that target self (E.g. heal self)
    Allies = "allies", // for abilities that target allies (E.g. heal ally)
    Enemies = "enemies", // for abilities that target enemies (E.g. throw javelin at enemy)
    None = "none", // for abilities that don't target anything (e.g. pick-up ammo from the ground)
    Terrain = "terrain" // for abilities that target a cell (E.g. create a fireball at location)
}

export enum AbilityResourceUse {
    Ammo = "ammo",
    Mana = "mana",
    Health = "health",
    Attack = "attack",
    Stamina = "stamina",
    None = "none"
}

export class AbilityResource {
    resource_used: AbilityResourceUse = AbilityResourceUse.None;
    resource_cost: number = 0;
};

/**
 * Represents an ability that a character can use in battle.
 * Abilities could be active or passive.
 * They should contain all the information needed to execute the ability.
 * - When to apply
 *    - On attack (once, or at each attack)
 *    - On defense (once, or at each attack)
 *    - On turn start (once, or at each turn)
 *    - On turn end (once, or at each turn)
 *    - On movement (once, or at each movement)
 *    - On condition (e.g. below 50% health, once, or at each turn)
 * - What order to to apply and in what order (a number, similar to z-index could be used for this)
 *    - This would have significant impact when it comes to computing damage calculations, 
 *      if some abilities reduce or increase damage by a percentage, while others add a flat amount.
 * - Effect to apply 
 *    - Change hp (e.g. damage, heal)
 *    - Change stats (e.g. increase attack, decrease defense, speed, range) - basically buffs and debuffs
 *    - Change status (e.g. stunned/petrified, poisoned, burning, bleeding)
 * - Who can it be applied to
 *    - Self
 *    - Allies
 *    - Enemies
 * 
 * To define:
 * - are passives always on, or do they need to be activated?
 * - such as: bleeding resistance 3, or poison resistance
 * - is "rest" a passive ability for each unit ?
 * 
 */
export class Ability {
    public abilityType: AbilityType = AbilityType.Active;
    public allowedTargets: AbilityTarget[] = [AbilityTarget.Self];
    public requiresTarget: boolean = false;

    public range: number = 0;
    public id: string = "";
    public name: string = "";
    public description: string = "";
    public icon: string = "";
    public tooltipName: string = "";

    public damage_low: number = 0;
    public damage_high: number = 0;
    public resources: AbilityResource[] = [];
    // public resource_used: AbilityResourceUse = AbilityResourceUse.None;
    // public resource_cost: number = 0;
}