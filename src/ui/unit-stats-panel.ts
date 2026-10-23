import { Assets, Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { Buff, Creature, CreatureStats } from "../battle/creature";
import { Ability, AbilityResourceUse } from "../battle/ability";
import { Coords } from "../shared";
import { getTraitInfo, TraitsConfig } from "../battle/trait-system";
import type { Battle } from "../battle";

export interface TraitSlot {
  container: Container;
  border: NineSliceSprite;
  iconSprite: Sprite;
  traitName: string;
  name: string;
  description: string;
  iconPath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SkillSlot {
  container: Container;
  border: NineSliceSprite;
  iconSprite: Sprite;
  skillId: string;
  name: string;
  description: string;
  iconPath: string;
  ability: Ability;
  index: number;
  isUsable: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_SKILL_ICONS: Record<string, string> = {
  "quick-draw-01": "skills/icon_quick_draw.png",
  "quick-draw": "skills/icon_quick_draw.png",
  "jav-01": "skills/icon_throw_javelin.png",
  "throw-javelin": "skills/icon_throw_javelin.png",
  "heal-01": "skills/icon_patch_up.png",
  "patch-up": "skills/icon_patch_up.png",
  "pck-01": "skills/icon_pickup_ammo.png",
  "pick-up ammo": "skills/icon_pickup_ammo.png",
};

export function getSkillIconPath(ability: Ability): string {
  if (ability.icon && ability.icon.length > 0) return ability.icon;
  const idLower = ability.id?.toLowerCase() ?? "";
  if (DEFAULT_SKILL_ICONS[idLower]) return DEFAULT_SKILL_ICONS[idLower];
  const nameLower = ability.name?.toLowerCase() ?? "";
  if (DEFAULT_SKILL_ICONS[nameLower]) return DEFAULT_SKILL_ICONS[nameLower];
  return "skills/icon_quick_draw.png";
}

export function formatAbilityDescription(ability: Ability): string {
  let desc = ability.description || `${ability.tooltipName || ability.name}: Specialized combat skill.`;
  const costs: string[] = [];
  for (const res of ability.resources || []) {
    if (res.resource_used === AbilityResourceUse.Stamina) {
      costs.push(`${res.resource_cost} Stamina`);
    } else if (res.resource_used === AbilityResourceUse.Ammo) {
      costs.push(`${res.resource_cost} Ammo`);
    }
  }
  if (costs.length > 0 && !desc.toLowerCase().includes("cost:")) {
    desc += ` (Cost: ${costs.join(", ")})`;
  }
  return desc;
}

export enum DisplayedStat {
  HP = 0,
  ATTACK_MELEE = 1,
  ATTACK_RANGED = 2,
  RANGE = 3,
  MOVEMENT = 4,
  ATTACKS = 5,
  MELEE_DEFENSE = 6,
  RANGED_DEFENSE = 7,
  COUNTER_ATTACKS = 8,
  STAMINA = 9,
  AMMO = 10,
  MORALE = 11,
  NUM_STATS = 12
};

/**
 * Contains UI controls to show the unit stats during a battle.
 */
export class UnitStatsPanel {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' } };

  private statTextureNames: Record<number, string> = {
    [DisplayedStat.HP]: 'glyph_hp',
    [DisplayedStat.ATTACK_MELEE]: 'glyph_attack_melee',
    [DisplayedStat.ATTACK_RANGED]: 'glyph_attack_ranged',
    [DisplayedStat.RANGE]: 'glyph_range',
    [DisplayedStat.MOVEMENT]: 'glyph_movement',
    [DisplayedStat.ATTACKS]: 'glyph_attacks',
    [DisplayedStat.MELEE_DEFENSE]: 'glyph_defense_melee',
    [DisplayedStat.RANGED_DEFENSE]: 'glyph_defense_ranged',
    [DisplayedStat.COUNTER_ATTACKS]: 'glyph_counterattacks',
    [DisplayedStat.STAMINA]: 'glyph_stamina',
    [DisplayedStat.AMMO]: 'glyph_ammo',
    [DisplayedStat.MORALE]: 'glyph_morale'
  };

  private statDescriptions: Record<number, string> = {
    [DisplayedStat.HP]: 'Current hitpoints. Depicts overall health and\nbasic protective gear of unit.',
    [DisplayedStat.ATTACK_MELEE]: 'Melee attack power. Min-Max damage the unit can deal\nin melee combat before taking armor into account.',
    [DisplayedStat.ATTACK_RANGED]: 'Ranged attack power. The range of damage\nthe unit can deal in ranged combat.',
    [DisplayedStat.RANGE]: 'The distance the unit can attack from.',
    [DisplayedStat.MOVEMENT]: 'The number of tiles the unit can move in a single turn.\nVarious terrain types may use more of this value.',
    [DisplayedStat.ATTACKS]: 'The number of attacks the unit can make\nin a single turn.',
    [DisplayedStat.MELEE_DEFENSE]: 'The unit\'s ability to defend against melee attacks. \nReduces incoming melee damage.',
    [DisplayedStat.RANGED_DEFENSE]: 'The unit\'s ability to defend against ranged attacks. \nReduces incoming ranged damage.',
    [DisplayedStat.COUNTER_ATTACKS]: 'The number of counterattacks the unit can\nmake in a single turn.',
    [DisplayedStat.STAMINA]: 'The unit\'s energy to perform physical activities such as\nmoving and attacking.',
    [DisplayedStat.AMMO]: 'The number of ranged attacks the unit can\nmake before running out of ammo',
    [DisplayedStat.MORALE]: 'Morale (0-30). Dictates the squad\'s courage and discipline.\nRouting: 0, Panicked: 1-2, Wavering: 3-5, Steady: >5.\n+1 if undamaged for a full turn or upon resting.'
  };

  private statBuffDescriptions: Record<number, string> = {

  };

  private window = new Container();

  private traitsConfig?: TraitsConfig;
  private traitsGroup = new Container();
  private traitSlots: TraitSlot[] = [];

  private abilities: Ability[] = [];
  private skillsGroup = new Container();
  private skillSlots: SkillSlot[] = [];

  public onSkillClick?: (index: number, ability: Ability) => void;
  private currentCreature?: Creature = undefined;

  public getSkillSlots(): readonly SkillSlot[] {
    return this.skillSlots;
  }

  public getCurrentCreature(): Creature | undefined {
    return this.currentCreature;
  }

  public setBattle(battle: Battle): void {
    this.battle = battle;
  }

  public getBattle(): Battle | undefined {
    return this.battle;
  }

  public getTooltipIconSprite(): Sprite {
    return this.tooltipIconSprite;
  }

  private stats?: CreatureStats = undefined;
  private buffs?: Buff[] = [];
  private creatureType: string = '';
  private unitTypeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Unit Type: ' });

  private tooltipText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Tooltip' });
  private tooltipWindow?: NineSliceSprite = undefined;
  private tooltipIconSprite: Sprite = new Sprite(Texture.EMPTY);

  private statIcons: Sprite[] = [];
  private statTooltipAreas: Container[] = [];
  private statValues: Text[] = [];

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public setCreature(creature: Creature) {
    this.currentCreature = creature;
    this.stats = creature.live_stats;
    this.buffs = creature.buffs;
    this.abilities = creature.abilities ? [...creature.abilities] : [];
    this.creatureType = Creature.CREATURE_NAMES[creature.creatureType];
  }

  setBannerTexture(texture: Texture | undefined) {
    if (this.bannerSprite) {
      this.window.removeChild(this.bannerSprite);
      this.bannerSprite.destroy();
      this.bannerSprite = undefined;
    }

    if (texture) {
      this.bannerSprite = new Sprite(texture);

      this.bannerSprite.position = { x: 5, y: 5 };
      if (this.bannerBg) {
        this.bannerSprite.x += this.bannerBg.x;
        this.bannerSprite.y += this.bannerBg.y;
      }

      this.bannerSprite.width = 64;
      this.bannerSprite.height = 64;
      this.window.addChild(this.bannerSprite);
    }
  }

  setFaceTexture(texture: Texture | undefined) {
    if (this.faceSprite) {
      this.window.removeChild(this.faceSprite);
      this.faceSprite.destroy();
      this.faceSprite = undefined;
    }

    if (texture) {
      this.faceSprite = new Sprite(texture);
      this.faceSprite.position = { x: 5, y: 5 };
      if (this.faceBg) {
        this.faceSprite.x += this.faceBg.x;
        this.faceSprite.y += this.faceBg.y;
      }
      this.faceSprite.width = 128;
      this.faceSprite.height = 128;
      this.window.addChild(this.faceSprite);
    }
  }


  public constructor(
    private view: Container,
    private uiSheet: Spritesheet,
    traitsConfig?: TraitsConfig,
    private battle?: Battle
  ) {
    this.traitsConfig = traitsConfig;

    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });

    windowBg.width = 1200;
    windowBg.height = 104;

    const title = new Text({
      text: `Stats`,
      style: { fill: 0xffffff, fontSize: 24 },
    });

    title.anchor.set(0.5);
    title.position = { x: 200, y: 125 };

    this.window.addChild(windowBg);
    this.window.addChild(title);

    this.bannerBg = new NineSliceSprite({
      texture: this.uiSheet.textures['progress_bg.png'],
      leftWidth: 5,
      topHeight: 5,
      rightWidth: 5,
      bottomHeight: 5
    });
    this.bannerBg.width = 64 + 10;
    this.bannerBg.height = 64 + 10;
    this.bannerBg.position = { x: (400 - 64) / 2 - 5, y: -30 - 5 };
    this.window.addChild(this.bannerBg);

    this.faceBg = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4
    });
    this.faceBg.width = 128 + 10;
    this.faceBg.height = 128 + 10;
    this.faceBg.position = { x: 5, y: 5 - 40 };
    this.window.addChild(this.faceBg);
    this.window.position = { x: 135, y: 1080 - windowBg.height };
    this.unitTypeText.position = { x: 160, y: 40 };
    this.window.addChild(this.unitTypeText);

    // Display a 5x2 grid of stats borders and icons inside the stats borders
    const itemWidth = 100;
    const itemHeight = 48;

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      const statBorder = new NineSliceSprite({
        texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      statBorder.position = { x: 275 + itemWidth * Math.floor(i / 2), y: 5 + itemHeight * (i % 2) };
      statBorder.width = itemWidth;
      statBorder.height = itemHeight;
      this.window.addChild(statBorder);
      this.statTooltipAreas[i] = statBorder;

      this.statIcons[i] = new Sprite(this.uiSheet.textures[this.statTextureNames[i]]);
      this.statIcons[i].position = { x: 280 + itemWidth * Math.floor(i / 2), y: 10 + itemHeight * (i % 2) };
      this.statIcons[i].width = 32;
      this.statIcons[i].height = 32;
      this.window.addChild(this.statIcons[i]);

      this.statValues[i] = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: '' });
      this.statValues[i].position = { x: this.statIcons[i].position.x + 32, y: 10 + this.statIcons[i].position.y };
      this.statValues[i].text = '0' + i;
      this.window.addChild(this.statValues[i]);
    }

    // Vertical divider separating stat boxes from trait perks
    const divider = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 1,
      topHeight: 4,
      rightWidth: 1,
      bottomHeight: 4,
    });
    divider.position = { x: 882, y: 8 };
    divider.width = 2;
    divider.height = 88;
    this.window.addChild(divider);

    this.traitsGroup.position = { x: 890, y: 0 };
    this.window.addChild(this.traitsGroup);

    this.skillsGroup.position = { x: 250, y: -36 };
    this.window.addChild(this.skillsGroup);

    this.tooltipWindow = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.tooltipWindow.position = { x: 300, y: -2 - 90 };
    this.tooltipWindow.visible = false;
    this.tooltipWindow.width = 420;
    this.tooltipWindow.height = 90;

    this.tooltipIconSprite.width = 128;
    this.tooltipIconSprite.height = 128;
    this.tooltipIconSprite.visible = false;

    this.tooltipText.style.wordWrap = true;
    this.tooltipText.style.wordWrapWidth = 430;
    this.tooltipText.style.fontSize = 14;
    this.tooltipText.style.lineHeight = 19;
    this.tooltipText.position = { x: this.tooltipWindow.position.x + 20, y: this.tooltipWindow.position.y + 15 };

    this.window.addChild(this.tooltipWindow);
    this.window.addChild(this.tooltipIconSprite);
    this.window.addChild(this.tooltipText);

    this.view.addChild(this.window);
    this.hide();
  }

  public getBuffDescOrUndefined(buff: Buff): string[] {
    let buffDescriptions: string[] = [];
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      buffDescriptions[i] = "";
    }

    if (buff.stats.remaining_health != 0 || buff.stats.health != 0) {
      buffDescriptions[DisplayedStat.HP] = `${buff.stats.remaining_health}/${buff.stats.health} from ${buff.source}`;
    } else {
      buffDescriptions[DisplayedStat.HP] = "";
    }

    if (buff.stats.attack_melee_low != 0 || buff.stats.attack_melee_high != 0) {
      buffDescriptions[DisplayedStat.ATTACK_MELEE] = `${buff.stats.attack_melee_low} / ${buff.stats.attack_melee_high} from ${buff.source}`;
    } else {
      buffDescriptions[DisplayedStat.ATTACK_MELEE] = "";
    }

    if (buff.stats.attack_ranged_low != 0 || buff.stats.attack_ranged_high != 0) {
      buffDescriptions[DisplayedStat.ATTACK_RANGED] = `${buff.stats.attack_ranged_low}-${buff.stats.attack_ranged_high} from ${buff.source}`;
    } else {
      buffDescriptions[DisplayedStat.ATTACK_RANGED] = "";
    }
    if (buff.stats.range != 0) {
      buffDescriptions[DisplayedStat.RANGE] = `${buff.stats.range} from ${buff.source}`;
    } else {
      buffDescriptions[DisplayedStat.RANGE] = "";
    }

    if (buff.stats.remaining_movement != 0 || buff.stats.num_moves != 0) {
      buffDescriptions[DisplayedStat.MOVEMENT] = `${buff.stats.remaining_movement} / ${buff.stats.num_moves} from ${buff.source}`;
    } else {
      buffDescriptions[DisplayedStat.MOVEMENT] = "";
    }

    if (buff.stats.remaining_attacks != 0 || buff.stats.num_attacks != 0) {
      buffDescriptions[DisplayedStat.ATTACKS] = buffDescriptions[DisplayedStat.ATTACKS]
        || `${buff.stats.remaining_attacks} / ${buff.stats.num_attacks} from ${buff.source}`;
    }
    if (buff.stats.defense_melee != 0) {
      buffDescriptions[DisplayedStat.MELEE_DEFENSE] = buffDescriptions[DisplayedStat.MELEE_DEFENSE]
        || `${buff.stats.defense_melee} from ${buff.source}`;
    }
    if (buff.stats.defense_ranged != 0) {
      buffDescriptions[DisplayedStat.RANGED_DEFENSE] = buffDescriptions[DisplayedStat.RANGED_DEFENSE]
        || `${buff.stats.defense_ranged} from ${buff.source}`;
    }
    if (buff.stats.remaining_counterattacks != 0 || buff.stats.num_counterattacks != 0) {
      buffDescriptions[DisplayedStat.COUNTER_ATTACKS] = buffDescriptions[DisplayedStat.COUNTER_ATTACKS]
        || `${buff.stats.remaining_counterattacks} / ${buff.stats.num_counterattacks} from ${buff.source}`;
    }
    if (buff.stats.stamina != 0) {
      buffDescriptions[DisplayedStat.STAMINA] = buffDescriptions[DisplayedStat.STAMINA]
        || `${buff.stats.stamina} from ${buff.source}`;
    }
    if (buff.stats.remaining_ammo && buff.stats.ammo && (buff.stats.remaining_ammo != 0 || buff.stats.ammo != 0)) {
      buffDescriptions[DisplayedStat.AMMO] = buffDescriptions[DisplayedStat.AMMO]
        || `${buff.stats.remaining_ammo} / ${buff.stats.ammo} from ${buff.source}`;
    }
    if (buff.stats.morale != 0) {
      buffDescriptions[DisplayedStat.MORALE] = buffDescriptions[DisplayedStat.MORALE]
        || `${buff.stats.morale} from ${buff.source}`;
    }
    return buffDescriptions;
  }

  public setTraitsConfig(traitsConfig: TraitsConfig): void {
    this.traitsConfig = traitsConfig;
  }

  public getTraitSlots(): readonly TraitSlot[] {
    return this.traitSlots;
  }

  private getTextureForIcon(iconPath: string): Texture {
    try {
      if (typeof Assets !== "undefined" && Assets.get) {
        const cached = Assets.get(iconPath);
        if (cached instanceof Texture) return cached;
        if (cached && (cached as any).baseTexture) return cached as Texture;
        if (cached && (cached as any).source) return cached as Texture;
      }
    } catch {
      // ignore
    }

    try {
      if (this.uiSheet?.textures?.[iconPath]) {
        return this.uiSheet.textures[iconPath];
      }
    } catch {
      // ignore
    }

    try {
      if (typeof Texture !== "undefined" && Texture.from) {
        const tex = Texture.from(iconPath);
        if (tex) return tex;
      }
    } catch {
      // ignore
    }

    return Texture.EMPTY;
  }

  private renderTraits(): void {
    this.traitsGroup.removeChildren();
    this.traitSlots = [];

    const userTraits = this.stats?.traits?.filter((t) => !t.startsWith("format_")) ?? [];

    const header = new Text({
      text: userTraits.length > 0 ? "PERKS / TRAITS" : "TRAITS: NONE",
      style: {
        fill: userTraits.length > 0 ? 0xd4af37 : 0x777777,
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    header.position = { x: 4, y: 8 };
    this.traitsGroup.addChild(header);

    if (userTraits.length === 0) return;

    const slotSize = 48;
    const slotGap = 8;
    const startY = 28;

    userTraits.forEach((traitName, index) => {
      const info = getTraitInfo(traitName, this.traitsConfig);
      const name = info?.name ?? traitName;
      const iconPath = info?.icon ?? "traits/icon_shield_block.png";
      const description = info?.description ?? `${name}: Specialized combat perk.`;

      const slotContainer = new Container();
      const slotX = 4 + index * (slotSize + slotGap);
      slotContainer.position = { x: slotX, y: startY };

      const slotBorder = new NineSliceSprite({
        texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      slotBorder.width = slotSize;
      slotBorder.height = slotSize;
      slotContainer.addChild(slotBorder);

      const iconTex = this.getTextureForIcon(iconPath);
      const iconSprite = new Sprite(iconTex);
      iconSprite.width = slotSize - 8;
      iconSprite.height = slotSize - 8;
      iconSprite.position = { x: 4, y: 4 };
      slotContainer.addChild(iconSprite);

      this.traitsGroup.addChild(slotContainer);

      this.traitSlots.push({
        container: slotContainer,
        border: slotBorder,
        iconSprite,
        traitName,
        name,
        description,
        iconPath,
        x: this.traitsGroup.x + slotX,
        y: this.traitsGroup.y + startY,
        width: slotSize,
        height: slotSize,
      });
    });
  }

  public isAbilityUsable(ability: Ability, creature?: Creature): boolean {
    const c = creature || this.currentCreature;
    if (!c) return false;
    if (this.battle) {
      return this.battle.verifyAbilityUseByCreatureHasResources(ability, c);
    }
    for (const res of ability.resources || []) {
      if (res.resource_used === AbilityResourceUse.Stamina && c.live_stats.stamina < res.resource_cost) return false;
      if (res.resource_used === AbilityResourceUse.Ammo && c.live_stats.remaining_ammo < res.resource_cost) return false;
      if (res.resource_used === AbilityResourceUse.Attack && c.live_stats.remaining_attacks < res.resource_cost) return false;
    }
    return true;
  }

  private renderSkills(): void {
    this.skillsGroup.removeChildren();
    this.skillSlots = [];

    const userSkills = this.abilities ?? [];
    if (userSkills.length === 0) return;

    const slotSize = 48;
    const slotGap = 8;
    const startY = 0;

    userSkills.forEach((ability, index) => {
      const name = ability.tooltipName || ability.name || ability.id;
      const iconPath = getSkillIconPath(ability);
      const description = formatAbilityDescription(ability);
      const isUsable = this.currentCreature ? this.isAbilityUsable(ability, this.currentCreature) : true;
      const isActive = !!(this.currentCreature?.isQuickDrawActive && (ability.id === 'quick-draw-01' || ability.name?.toLowerCase().includes('quick draw')));

      const slotContainer = new Container();
      const slotX = index * (slotSize + slotGap);
      slotContainer.position = { x: slotX, y: startY };
      slotContainer.eventMode = 'static';
      slotContainer.cursor = isUsable ? 'pointer' : 'not-allowed';
      slotContainer.alpha = isUsable ? 1.0 : 0.4;

      const slotBorder = new NineSliceSprite({
        texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      slotBorder.width = slotSize;
      slotBorder.height = slotSize;
      if (isActive) {
        slotBorder.tint = 0x66ff66;
      }
      slotContainer.addChild(slotBorder);

      const iconTex = this.getTextureForIcon(iconPath);
      const iconSprite = new Sprite(iconTex);
      iconSprite.width = slotSize - 8;
      iconSprite.height = slotSize - 8;
      iconSprite.position = { x: 4, y: 4 };
      slotContainer.addChild(iconSprite);

      slotContainer.on('pointerdown', () => {
        if (isUsable) {
          slotBorder.tint = 0xd4b038;
        }
      });
      slotContainer.on('pointerup', () => {
        if (isUsable) {
          slotBorder.tint = 0xffe680;
        }
      });
      slotContainer.on('pointertap', () => {
        this.triggerSkill(index);
      });

      this.skillsGroup.addChild(slotContainer);

      this.skillSlots.push({
        container: slotContainer,
        border: slotBorder,
        iconSprite,
        skillId: ability.id,
        name,
        description,
        iconPath,
        ability,
        index,
        isUsable,
        x: this.skillsGroup.x + slotX,
        y: this.skillsGroup.y + startY,
        width: slotSize,
        height: slotSize,
      });
    });
  }

  public triggerSkill(index: number): boolean {
    const slot = this.skillSlots[index];
    if (!slot) return false;
    if (!slot.isUsable) return false;
    if (this.onSkillClick) {
      this.onSkillClick(index, slot.ability);
    } else if (this.battle) {
      this.battle.selectActiveAbilityForCurrentUnit(index);
    }
    if (this.currentCreature) {
      this.update();
    }
    return true;
  }

  public click(coords: Coords): boolean {
    if (!this.isVisible()) return false;
    const x = coords.x - this.window.x;
    const y = coords.y - this.window.y;
    for (let i = 0; i < this.skillSlots.length; i++) {
      const slot = this.skillSlots[i];
      if (
        x >= slot.x &&
        x <= slot.x + slot.width &&
        y >= slot.y &&
        y <= slot.y + slot.height
      ) {
        return this.triggerSkill(i);
      }
    }
    return false;
  }

  public update() {
    if (!this.stats) return;

    this.unitTypeText.text = `Unit: ${this.creatureType}`;
    this.renderTraits();
    this.renderSkills();

    this.statValues[DisplayedStat.HP].text = `${this.stats?.remaining_health} / ${this.stats?.health}`;
    this.statValues[DisplayedStat.ATTACK_MELEE].text = `${this.stats?.attack_melee_low}-${this.stats?.attack_melee_high}`;
    this.statValues[DisplayedStat.ATTACK_RANGED].text =
      this.stats.is_ranged ?
        `${this.stats?.attack_ranged_low}-${this.stats?.attack_ranged_high}` : "";
    this.statValues[DisplayedStat.RANGE].text =
      this.stats.is_ranged ?
        `${this.stats?.range}` : "";
    this.statValues[DisplayedStat.MOVEMENT].text = `${this.stats?.remaining_movement} / ${this.stats?.num_moves}`;
    this.statValues[DisplayedStat.ATTACKS].text = `${this.stats?.remaining_attacks} / ${this.stats?.num_attacks}`;
    this.statValues[DisplayedStat.MELEE_DEFENSE].text = `${this.stats?.defense_melee}`;
    this.statValues[DisplayedStat.RANGED_DEFENSE].text = `${this.stats?.defense_ranged}`;
    this.statValues[DisplayedStat.COUNTER_ATTACKS].text = `${this.stats?.remaining_counterattacks} / ${this.stats?.num_counterattacks}`;
    this.statValues[DisplayedStat.STAMINA].text = `${this.stats?.stamina}`;
    const moraleVal = (this.stats?.morale !== undefined && !Number.isNaN(this.stats.morale)) ? this.stats.morale : 10;
    this.statValues[DisplayedStat.MORALE].text = `${moraleVal}`;

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (this.statValues[i].text == "") {
        this.statIcons[i].tint = 0x666666;
      } else {
        this.statIcons[i].tint = 0xffffff;
      }
    }

    // Go through all the buffs and if they impact the stat, add a tooltip entry for them
    let buffDescriptions: string[] = [];
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      buffDescriptions[i] = "";
    }
    this.buffs?.forEach(buff => {
      const thisBuffDescriptions = this.getBuffDescOrUndefined(buff);
      for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
        if (thisBuffDescriptions[i].length > 0) {
          buffDescriptions[i] += thisBuffDescriptions[i] + "\n";
        };
      }
    });

    this.statBuffDescriptions = buffDescriptions;

  }

  public toggleVisibility() {
    this.window.visible = !this.window.visible;
  }

  public show() {
    this.window.visible = true;
  }

  public hide() {
    this.window.visible = false;
    if (this.tooltipWindow) this.tooltipWindow.visible = false;
    if (this.tooltipText) this.tooltipText.visible = false;
    if (this.tooltipIconSprite) this.tooltipIconSprite.visible = false;
    for (const slot of this.traitSlots) slot.border.tint = 0xffffff;
    for (const slot of this.skillSlots) {
      const isActive = !!(this.currentCreature?.isQuickDrawActive && (slot.ability.id === 'quick-draw-01' || slot.ability.name?.toLowerCase().includes('quick draw')));
      slot.border.tint = isActive ? 0x66ff66 : 0xffffff;
    }
  }

  public isVisible() {
    return this.window.visible;
  }

  public containsPoint(stageX: number, stageY: number): boolean {
    if (!this.isVisible()) return false;
    const wx = this.window.x;
    const wy = this.window.y;
    // Check main panel bounds
    if (stageX >= wx && stageX <= wx + 1200 && stageY >= wy && stageY <= wy + 104) {
      return true;
    }
    // Check portrait area
    if (this.faceBg) {
      const fx = wx + this.faceBg.x;
      const fy = wy + this.faceBg.y;
      if (stageX >= fx && stageX <= fx + this.faceBg.width && stageY >= fy && stageY <= fy + this.faceBg.height) {
        return true;
      }
    }
    // Check skills area on top of panel
    for (const slot of this.skillSlots) {
      const sx = wx + slot.x;
      const sy = wy + slot.y;
      if (stageX >= sx && stageX <= sx + slot.width && stageY >= sy && stageY <= sy + slot.height) {
        return true;
      }
    }
    // Check tooltip bounds if visible
    if (this.tooltipWindow?.visible) {
      const tx = wx + this.tooltipWindow.x;
      const ty = wy + this.tooltipWindow.y;
      if (stageX >= tx && stageX <= tx + this.tooltipWindow.width && stageY >= ty && stageY <= ty + this.tooltipWindow.height) {
        return true;
      }
    }
    return false;
  }

  mousemove(coords: Coords) {
    let x = coords.x - this.window.x;
    let y = coords.y - this.window.y;

    let tooltipVisible = false;
    let statToDisplay: number = -1;
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (this.statTooltipAreas[i]
        && x > this.statTooltipAreas[i]?.x
        && x < this.statTooltipAreas[i]?.x + this.statTooltipAreas[i]?.width
        && y > this.statTooltipAreas[i]?.y
        && y < this.statTooltipAreas[i]?.y + this.statTooltipAreas[i]?.height) {
        tooltipVisible = true;
        statToDisplay = i;
        break;
      }
    }

    let hoveredSkill: SkillSlot | null = null;
    for (const slot of this.skillSlots) {
      const isActive = !!(this.currentCreature?.isQuickDrawActive && (slot.ability.id === 'quick-draw-01' || slot.ability.name?.toLowerCase().includes('quick draw')));
      if (
        x >= slot.x &&
        x <= slot.x + slot.width &&
        y >= slot.y &&
        y <= slot.y + slot.height
      ) {
        hoveredSkill = slot;
        tooltipVisible = true;
        slot.border.tint = 0xffe680;
      } else {
        slot.border.tint = isActive ? 0x66ff66 : 0xffffff;
      }
    }

    let hoveredTrait: TraitSlot | null = null;
    for (const slot of this.traitSlots) {
      if (
        x >= slot.x &&
        x <= slot.x + slot.width &&
        y >= slot.y &&
        y <= slot.y + slot.height
      ) {
        hoveredTrait = slot;
        tooltipVisible = true;
        slot.border.tint = 0xffe680;
      } else {
        slot.border.tint = 0xffffff;
      }
    }

    if (hoveredSkill) {
      const skillHeader = `[SKILL] ${(hoveredSkill.name || hoveredSkill.skillId).toUpperCase()}`;
      const skillDesc = hoveredSkill.description;

      this.tooltipText.text = `${skillHeader}\n${skillDesc}`;
      this.tooltipText.style.wordWrapWidth = 360;

      if (this.tooltipWindow) {
        let tipWidth = 540;
        let tipHeight = 154; // comfortably houses 128x128px icon
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipWidth = Math.min(650, Math.max(500, Math.ceil(158 + (this.tooltipText.width || 340) + 20)));
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredSkill.x + hoveredSkill.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(20, Math.min(tipX, 1200 - tipWidth - 10));
        const tipY = hoveredSkill.y - tipHeight - 8;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        this.tooltipIconSprite.texture = this.getTextureForIcon(hoveredSkill.iconPath || getSkillIconPath(hoveredSkill.ability));
        this.tooltipIconSprite.width = 128;
        this.tooltipIconSprite.height = 128;
        this.tooltipIconSprite.position = { x: tipX + 14, y: tipY + Math.max(12, (tipHeight - 128) / 2) };

        // Shift text to the right to make room for icon
        this.tooltipText.position = { x: tipX + 158, y: tipY + 14 };
      }
    } else if (hoveredTrait) {
      const perkHeader = `[PERK] ${hoveredTrait.name.toUpperCase()}`;
      const perkDesc = hoveredTrait.description.startsWith(hoveredTrait.name + ":")
        ? hoveredTrait.description.slice(hoveredTrait.name.length + 1).trim()
        : hoveredTrait.description;

      this.tooltipText.text = `${perkHeader}\n${perkDesc}`;
      this.tooltipText.style.wordWrapWidth = 360;

      if (this.tooltipWindow) {
        let tipWidth = 540;
        let tipHeight = 154; // comfortably houses 128x128px icon
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipWidth = Math.min(650, Math.max(500, Math.ceil(158 + (this.tooltipText.width || 340) + 20)));
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredTrait.x + hoveredTrait.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(20, Math.min(tipX, 1200 - tipWidth - 10));
        const tipY = -tipHeight - 8;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        const traitIcon = hoveredTrait.iconPath || getTraitInfo(hoveredTrait.traitName, this.traitsConfig)?.icon || "traits/icon_shield_block.png";
        this.tooltipIconSprite.texture = this.getTextureForIcon(traitIcon);
        this.tooltipIconSprite.width = 128;
        this.tooltipIconSprite.height = 128;
        this.tooltipIconSprite.position = { x: tipX + 14, y: tipY + Math.max(12, (tipHeight - 128) / 2) };

        // Shift text to the right to make room for icon
        this.tooltipText.position = { x: tipX + 158, y: tipY + 14 };
      }
    } else if (statToDisplay != -1) {
      this.tooltipIconSprite.visible = false;
      this.tooltipText.style.wordWrapWidth = 430;
      this.tooltipText.text = this.statDescriptions[statToDisplay]
        + (this.statBuffDescriptions[statToDisplay] ? "\nBuffs: " + this.statBuffDescriptions[statToDisplay] : "");

      if (this.tooltipWindow) {
        let tipWidth = 420;
        let tipHeight = 90;
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipHeight = Math.max(80, Math.ceil(this.tooltipText.height + 24));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;
        this.tooltipWindow.position = { x: 300, y: -tipHeight - 2 };
        this.tooltipText.position = { x: 320, y: -tipHeight + 10 };
      }
    } else {
      this.tooltipIconSprite.visible = false;
    }

    if (this.tooltipWindow) {
      this.tooltipWindow.visible = tooltipVisible;
      this.tooltipText.visible = tooltipVisible;
      if (!tooltipVisible) {
        this.tooltipIconSprite.visible = false;
      }
      if (statToDisplay == 0) {
        statToDisplay = DisplayedStat.HP;
      }
    }

  }

}