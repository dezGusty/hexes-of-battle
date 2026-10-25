import { Assets, Container, Graphics, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { Buff, Creature, CreatureStats } from "../battle/creature";
import { Coords } from "../shared";
import { DisplayedStat, TraitSlot, SkillSlot, getSkillIconPath, formatAbilityDescription } from "./unit-stats-panel";
import { Ability } from "../battle/ability";
import { getTraitInfo, TraitsConfig } from "../battle/trait-system";
import { getMoraleState, getMoraleTooltip, getStaminaTooltip } from "../battle/combat-rules";
import { getMoraleTexture } from "./morale-icon-utils";
import { drawBestiaryRelief, MEDIEVAL_PALETTE } from "./medieval-ui-decorations";

/**
 * Secondary compact stats display panel for enemy units.
 * Displays enemy stats, portrait, banner, trait perks, and combat effect tooltips.
 * Height expanded by 50% (from 84px to 126px) to house dedicated trait icons.
 */
export class EnemyStatsPanel {
  static DEFAULT_FONT_STYLE: TextOptions = {
    style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 12, align: 'left' },
  };

  static TITLE_FONT_STYLE: TextOptions = {
    style: { fill: { color: '#ff6b6b', alpha: 1 }, fontSize: 13, fontWeight: 'bold', align: 'left' },
  };

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
    [DisplayedStat.MORALE]: 'glyph_morale',
  };

  private statDescriptions: Record<number, string> = {
    [DisplayedStat.HP]: 'Current hitpoints. Depicts overall health and\nbasic protective gear of unit.',
    [DisplayedStat.ATTACK_MELEE]: 'Melee attack power. Min-Max damage the unit can deal\nin melee combat before taking armor into account.',
    [DisplayedStat.ATTACK_RANGED]: 'Ranged attack power. The range of damage\nthe unit can deal in ranged combat.',
    [DisplayedStat.RANGE]: 'The distance the unit can attack from.',
    [DisplayedStat.MOVEMENT]: 'The number of tiles the unit can move in a single turn.\nVarious terrain types may use more of this value.',
    [DisplayedStat.ATTACKS]: 'The number of attacks the unit can make\nin a single turn.',
    [DisplayedStat.MELEE_DEFENSE]: "The unit's ability to defend against melee attacks.\nReduces incoming melee damage.",
    [DisplayedStat.RANGED_DEFENSE]: "The unit's ability to defend against ranged attacks.\nReduces incoming ranged damage.",
    [DisplayedStat.COUNTER_ATTACKS]: 'The number of counterattacks the unit can\nmake in a single turn.',
    [DisplayedStat.STAMINA]: getStaminaTooltip(),
    [DisplayedStat.AMMO]: 'The number of ranged attacks the unit can\nmake before running out of ammo',
    [DisplayedStat.MORALE]: 'Morale (0-30). Dictates the squad\'s courage and discipline.\nRouting: 0, Panicked: 1-2, Wavering: 3-5, Steady: 6-15, High: >15.\n+1 if undamaged for a full turn or upon resting.',
  };

  private statBuffDescriptions: Record<number, string> = {};

  public readonly window = new Container();

  private traitsConfig?: TraitsConfig;
  private traitsGroup = new Container();
  private traitSlots: TraitSlot[] = [];

  private abilities: Ability[] = [];
  private skillSlots: SkillSlot[] = [];

  public getSkillSlots(): readonly SkillSlot[] {
    return this.skillSlots;
  }

  public getTooltipIconSprite(): Sprite {
    return this.tooltipIconSprite;
  }

  public getMoraleStateIcon(): Sprite {
    return this.moraleStateIcon;
  }

  private currentCreature?: Creature = undefined;
  private stats?: CreatureStats = undefined;
  private buffs?: Buff[] = [];
  private creatureType: string = '';
  private unitTypeText = new Text({ ...EnemyStatsPanel.TITLE_FONT_STYLE, text: 'Enemy: Unknown' });

  private tooltipText = new Text({ ...EnemyStatsPanel.DEFAULT_FONT_STYLE, text: 'Tooltip' });
  private tooltipWindow?: NineSliceSprite = undefined;
  private tooltipIconSprite: Sprite = new Sprite(Texture.EMPTY);

  private statIcons: Sprite[] = [];
  private statTooltipAreas: Container[] = [];
  private statValues: Text[] = [];
  public readonly moraleStateIcon: Sprite;

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public readonly panelWidth: number = 630;
  public readonly panelHeight: number = 126; // +50% height (expanded from 84 to 126)

  public constructor(
    private view: Container,
    private uiSheet: Spritesheet,
    traitsConfig?: TraitsConfig
  ) {
    this.traitsConfig = traitsConfig;

    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });

    windowBg.width = this.panelWidth;
    windowBg.height = this.panelHeight;
    windowBg.tint = 0x8a7d6d;
    this.window.addChild(windowBg);

    const metalworkBorder = new Graphics();
    metalworkBorder.eventMode = 'none';
    metalworkBorder.roundRect(2, 2, this.panelWidth - 4, this.panelHeight - 4, 5);
    metalworkBorder.stroke({ color: MEDIEVAL_PALETTE.bronzeMid, width: 2 });
    drawBestiaryRelief(metalworkBorder, 'raven', this.panelWidth - 38, 16, 0.58, true, MEDIEVAL_PALETTE.bronzeLight);
    drawBestiaryRelief(metalworkBorder, 'boar', this.panelWidth - 16, 16, 0.58, true, MEDIEVAL_PALETTE.goldBright);
    this.window.addChild(metalworkBorder);

    // Position panel in top right area
    this.window.position = { x: 1920 - this.panelWidth - 20, y: 75 };

    // Face Portrait Background & Container
    this.faceBg = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.faceBg.width = 68;
    this.faceBg.height = 68;
    this.faceBg.position = { x: 8, y: 8 };
    this.window.addChild(this.faceBg);

    // Banner Background
    this.bannerBg = new NineSliceSprite({
      texture: this.uiSheet.textures['progress_bg.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.bannerBg.width = 24;
    this.bannerBg.height = 24;
    this.bannerBg.position = { x: 56, y: 6 };
    this.window.addChild(this.bannerBg);

    // Enemy Unit Header Text
    this.unitTypeText.position = { x: 86, y: 7 };
    this.window.addChild(this.unitTypeText);

    // 6 columns x 2 rows of stats
    const itemWidth = 88;
    const itemHeight = 24;
    const startX = 86;
    const startY = 28;

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const slotX = startX + col * 90;
      const slotY = startY + row * 26;

      const statBorder = new NineSliceSprite({
        texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      statBorder.position = { x: slotX, y: slotY };
      statBorder.width = itemWidth;
      statBorder.height = itemHeight;
      this.window.addChild(statBorder);
      this.statTooltipAreas[i] = statBorder;

      const icon = new Sprite(this.uiSheet.textures[this.statTextureNames[i]]);
      icon.position = { x: slotX + 3, y: slotY + 3 };
      icon.width = 18;
      icon.height = 18;
      this.window.addChild(icon);
      this.statIcons[i] = icon;

      const valText = new Text({ ...EnemyStatsPanel.DEFAULT_FONT_STYLE, text: '' });
      valText.position = { x: slotX + 24, y: slotY + 4 };
      this.window.addChild(valText);
      this.statValues[i] = valText;
    }

    this.moraleStateIcon = new Sprite(Texture.EMPTY);
    this.moraleStateIcon.width = 16;
    this.moraleStateIcon.height = 16;
    this.moraleStateIcon.visible = false;
    this.window.addChild(this.moraleStateIcon);

    // Horizontal divider separating stats from trait perks
    const divider = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 1,
      rightWidth: 4,
      bottomHeight: 1,
    });
    divider.position = { x: 8, y: 80 };
    divider.width = this.panelWidth - 16;
    divider.height = 2;
    this.window.addChild(divider);

    this.traitsGroup.position = { x: 8, y: 84 };
    this.window.addChild(this.traitsGroup);

    // Tooltip overlay window
    this.tooltipWindow = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.tooltipWindow.position = { x: 86, y: this.panelHeight + 4 };
    this.tooltipWindow.visible = false;
    this.tooltipWindow.width = 360;
    this.tooltipWindow.height = 70;

    this.tooltipText.style.wordWrap = true;
    this.tooltipText.style.wordWrapWidth = 360;
    this.tooltipText.style.fontSize = 12;
    this.tooltipText.style.lineHeight = 16;
    this.tooltipText.position = { x: this.tooltipWindow.position.x + 10, y: this.tooltipWindow.position.y + 8 };
    this.tooltipText.visible = false;

    this.tooltipIconSprite.width = 128;
    this.tooltipIconSprite.height = 128;
    this.tooltipIconSprite.visible = false;

    this.window.addChild(this.tooltipWindow);
    this.window.addChild(this.tooltipIconSprite);
    this.window.addChild(this.tooltipText);

    this.view.addChild(this.window);
    this.hide();
  }

  public setCreature(creature: Creature): void {
    this.currentCreature = creature;
    this.stats = creature.live_stats;
    this.buffs = creature.buffs;
    this.abilities = creature.abilities ? [...creature.abilities] : [];
    this.creatureType = Creature.CREATURE_NAMES[creature.creatureType] || 'Unknown';
    if (creature.combatConfig?.morale?.breakpoints) {
      this.statDescriptions[DisplayedStat.MORALE] = getMoraleTooltip(creature.combatConfig.morale.breakpoints);
    }
    if (creature) {
      this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(creature, creature.combatConfig);
    }
  }

  public setBannerTexture(texture: Texture | undefined): void {
    if (this.bannerSprite) {
      this.window.removeChild(this.bannerSprite);
      this.bannerSprite.destroy();
      this.bannerSprite = undefined;
    }

    if (texture && this.bannerBg) {
      this.bannerSprite = new Sprite(texture);
      this.bannerSprite.position = { x: this.bannerBg.x + 2, y: this.bannerBg.y + 2 };
      this.bannerSprite.width = 20;
      this.bannerSprite.height = 20;
      this.window.addChild(this.bannerSprite);
    }
  }

  public setFaceTexture(texture: Texture | undefined): void {
    if (this.faceSprite) {
      this.window.removeChild(this.faceSprite);
      this.faceSprite.destroy();
      this.faceSprite = undefined;
    }

    if (texture && this.faceBg) {
      this.faceSprite = new Sprite(texture);
      this.faceSprite.position = { x: this.faceBg.x + 2, y: this.faceBg.y + 2 };
      this.faceSprite.width = 64;
      this.faceSprite.height = 64;
      this.window.addChild(this.faceSprite);
    }
  }

  public getBuffDescOrUndefined(buff: Buff): string[] {
    const buffDescriptions: string[] = [];
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      buffDescriptions[i] = '';
    }

    if (buff.stats.remaining_health !== 0 || buff.stats.health !== 0) {
      buffDescriptions[DisplayedStat.HP] = `${buff.stats.remaining_health}/${buff.stats.health} from ${buff.source}`;
    }

    if (buff.stats.attack_melee_low !== 0 || buff.stats.attack_melee_high !== 0) {
      buffDescriptions[DisplayedStat.ATTACK_MELEE] = `${buff.stats.attack_melee_low} / ${buff.stats.attack_melee_high} from ${buff.source}`;
    }

    if (buff.stats.attack_ranged_low !== 0 || buff.stats.attack_ranged_high !== 0) {
      buffDescriptions[DisplayedStat.ATTACK_RANGED] = `${buff.stats.attack_ranged_low}-${buff.stats.attack_ranged_high} from ${buff.source}`;
    }

    if (buff.stats.range !== 0) {
      buffDescriptions[DisplayedStat.RANGE] = `${buff.stats.range} from ${buff.source}`;
    }

    if (buff.stats.remaining_movement !== 0 || buff.stats.num_moves !== 0) {
      buffDescriptions[DisplayedStat.MOVEMENT] = `${buff.stats.remaining_movement} / ${buff.stats.num_moves} from ${buff.source}`;
    }

    if (buff.stats.remaining_attacks !== 0 || buff.stats.num_attacks !== 0) {
      buffDescriptions[DisplayedStat.ATTACKS] = `${buff.stats.remaining_attacks} / ${buff.stats.num_attacks} from ${buff.source}`;
    }

    if (buff.stats.defense_melee !== 0) {
      buffDescriptions[DisplayedStat.MELEE_DEFENSE] = `${buff.stats.defense_melee} from ${buff.source}`;
    }

    if (buff.stats.defense_ranged !== 0) {
      buffDescriptions[DisplayedStat.RANGED_DEFENSE] = `${buff.stats.defense_ranged} from ${buff.source}`;
    }

    if (buff.stats.remaining_counterattacks !== 0 || buff.stats.num_counterattacks !== 0) {
      buffDescriptions[DisplayedStat.COUNTER_ATTACKS] = `${buff.stats.remaining_counterattacks} / ${buff.stats.num_counterattacks} from ${buff.source}`;
    }

    if (buff.stats.stamina !== 0) {
      buffDescriptions[DisplayedStat.STAMINA] = `${buff.stats.stamina} from ${buff.source}`;
    }

    if (buff.stats.remaining_ammo !== 0 || buff.stats.ammo !== 0) {
      buffDescriptions[DisplayedStat.AMMO] = `${buff.stats.remaining_ammo} / ${buff.stats.ammo} from ${buff.source}`;
    }

    if (buff.stats.morale !== 0) {
      buffDescriptions[DisplayedStat.MORALE] = `${buff.stats.morale} from ${buff.source}`;
    }

    return buffDescriptions;
  }

  public setTraitsConfig(traitsConfig: TraitsConfig): void {
    this.traitsConfig = traitsConfig;
  }

  public getTraitSlots(): readonly TraitSlot[] {
    return this.traitSlots;
  }

  private getTextureForIcon(iconPath: string, targetSprite?: Sprite): Texture {
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
      if (typeof Assets !== "undefined" && Assets.load) {
        Assets.load(iconPath)
          .then((loaded) => {
            if (targetSprite) {
              const tex =
                loaded instanceof Texture
                  ? loaded
                  : (loaded as any)?.baseTexture || (loaded as any)?.source
                  ? (loaded as Texture)
                  : null;
              if (tex) {
                targetSprite.texture = tex;
              }
            }
          })
          .catch(() => {
            // ignore
          });
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
    this.skillSlots = [];

    const userTraits = this.stats?.traits?.filter((t) => !t.startsWith("format_")) ?? [];
    const userSkills = this.abilities ?? [];

    const header = new Text({
      text: userTraits.length > 0 ? "TRAITS & PERKS:" : "TRAITS: NONE",
      style: {
        fill: userTraits.length > 0 ? 0xffb74d : 0x777777,
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    header.position = { x: 4, y: 10 };
    this.traitsGroup.addChild(header);

    const slotSize = 34;
    const slotGap = 6;
    const startX = 125;
    const startY = 2;

    userTraits.forEach((traitName, index) => {
      const info = getTraitInfo(traitName, this.traitsConfig);
      const name = info?.name ?? traitName;
      const iconPath = info?.icon ?? "traits/icon_shield_block.png";
      const description = info?.description ?? `${name}: Specialized combat perk.`;

      const slotContainer = new Container();
      const slotX = startX + index * (slotSize + slotGap);
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

      const iconSprite = new Sprite(Texture.EMPTY);
      iconSprite.texture = this.getTextureForIcon(iconPath, iconSprite);
      iconSprite.width = slotSize - 6;
      iconSprite.height = slotSize - 6;
      iconSprite.position = { x: 3, y: 3 };
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

    if (userSkills.length > 0) {
      let currentX = startX + (userTraits.length > 0 ? userTraits.length * (slotSize + slotGap) + 12 : 0);
      const skillHeader = new Text({
        text: "SKILLS:",
        style: {
          fill: 0x5dade2,
          fontSize: 11,
          fontWeight: "bold",
          letterSpacing: 1,
        },
      });
      skillHeader.position = { x: currentX, y: 10 };
      this.traitsGroup.addChild(skillHeader);
      currentX += 54;

      userSkills.forEach((ability, index) => {
        const name = ability.tooltipName || ability.name || ability.id;
        const iconPath = getSkillIconPath(ability);
        const description = formatAbilityDescription(ability);

        const slotContainer = new Container();
        const slotX = currentX + index * (slotSize + slotGap);
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

        const iconSprite = new Sprite(Texture.EMPTY);
        iconSprite.texture = this.getTextureForIcon(iconPath, iconSprite);
        iconSprite.width = slotSize - 6;
        iconSprite.height = slotSize - 6;
        iconSprite.position = { x: 3, y: 3 };
        slotContainer.addChild(iconSprite);

        this.traitsGroup.addChild(slotContainer);

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
          isUsable: true,
          x: this.traitsGroup.x + slotX,
          y: this.traitsGroup.y + startY,
          width: slotSize,
          height: slotSize,
        });
      });
    }
  }

  public update(): void {
    if (this.currentCreature) {
      this.stats = this.currentCreature.live_stats;
      this.buffs = this.currentCreature.buffs;
      this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(
        this.currentCreature,
        this.currentCreature.combatConfig
      );
    } else if (this.stats) {
      this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(
        this.stats.stamina,
        this.stats.max_stamina
      );
    }
    if (!this.stats) return;

    this.unitTypeText.text = `Enemy: ${this.creatureType}`;
    this.renderTraits();

    this.statValues[DisplayedStat.HP].text = `${this.stats.remaining_health}/${this.stats.health}`;
    this.statValues[DisplayedStat.ATTACK_MELEE].text = `${this.stats.attack_melee_low}-${this.stats.attack_melee_high}`;
    this.statValues[DisplayedStat.ATTACK_RANGED].text = this.stats.is_ranged
      ? `${this.stats.attack_ranged_low}-${this.stats.attack_ranged_high}`
      : '';
    this.statValues[DisplayedStat.RANGE].text = this.stats.is_ranged ? `${this.stats.range}` : '';
    this.statValues[DisplayedStat.MOVEMENT].text = `${this.stats.remaining_movement}/${this.stats.num_moves}`;
    this.statValues[DisplayedStat.ATTACKS].text = `${this.stats.remaining_attacks}/${this.stats.num_attacks}`;
    this.statValues[DisplayedStat.MELEE_DEFENSE].text = `${this.stats.defense_melee}`;
    this.statValues[DisplayedStat.RANGED_DEFENSE].text = `${this.stats.defense_ranged}`;
    this.statValues[DisplayedStat.COUNTER_ATTACKS].text = `${this.stats.remaining_counterattacks}/${this.stats.num_counterattacks}`;
    this.statValues[DisplayedStat.STAMINA].text = `${this.stats.stamina}`;
    this.statValues[DisplayedStat.AMMO].text =
      (this.stats.ammo && this.stats.ammo > 0) ? `${this.stats.remaining_ammo}/${this.stats.ammo}` : '';
    const moraleVal = (this.stats.morale !== undefined && !Number.isNaN(this.stats.morale)) ? this.stats.morale : 10;
    this.statValues[DisplayedStat.MORALE].text = `${moraleVal}`;

    const moraleState = this.currentCreature
      ? this.currentCreature.moraleState
      : ((this.stats as any)?.morale_state ?? getMoraleState(moraleVal));
    this.moraleStateIcon.texture = getMoraleTexture(moraleState, this.uiSheet);
    this.moraleStateIcon.visible = this.statValues[DisplayedStat.MORALE].text !== '';
    let valWidth = 13;
    try {
      if (typeof document !== "undefined") {
        valWidth = this.statValues[DisplayedStat.MORALE].width || 13;
      } else {
        valWidth = (this.statValues[DisplayedStat.MORALE].text?.length || 2) * 7;
      }
    } catch {
      valWidth = 13;
    }
    this.moraleStateIcon.position.x = this.statValues[DisplayedStat.MORALE].position.x + valWidth + 3;
    this.moraleStateIcon.position.y = this.statIcons[DisplayedStat.MORALE].y + Math.round((18 - this.moraleStateIcon.height) / 2);

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (this.statValues[i].text === '') {
        this.statIcons[i].tint = 0x666666;
      } else {
        this.statIcons[i].tint = 0xffffff;
      }
    }

    // Process buff descriptions
    const buffDescriptions: string[] = [];
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      buffDescriptions[i] = '';
    }
    this.buffs?.forEach((buff) => {
      const thisBuffDescriptions = this.getBuffDescOrUndefined(buff);
      for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
        if (thisBuffDescriptions[i].length > 0) {
          buffDescriptions[i] += thisBuffDescriptions[i] + '\n';
        }
      }
    });

    this.statBuffDescriptions = buffDescriptions;
  }

  public show(): void {
    this.window.visible = true;
  }

  public hide(): void {
    this.window.visible = false;
    if (this.tooltipWindow) this.tooltipWindow.visible = false;
    if (this.tooltipText) this.tooltipText.visible = false;
    if (this.tooltipIconSprite) this.tooltipIconSprite.visible = false;
    for (const slot of this.traitSlots) slot.border.tint = 0xffffff;
    for (const slot of this.skillSlots) slot.border.tint = 0xffffff;
  }

  public toggleVisibility(): void {
    if (this.window.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isVisible(): boolean {
    return this.window.visible;
  }

  public getCreature(): Creature | undefined {
    return this.currentCreature;
  }

  public containsPoint(stageX: number, stageY: number): boolean {
    if (!this.window.visible) return false;
    const wx = this.window.x;
    const wy = this.window.y;

    // Check main panel bounds
    if (stageX >= wx && stageX <= wx + this.panelWidth && stageY >= wy && stageY <= wy + this.panelHeight) {
      return true;
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

  public mousemove(coords: Coords): void {
    if (!this.window.visible) return;
    const x = coords.x - this.window.x;
    const y = coords.y - this.window.y;

    let tooltipVisible = false;
    let statToDisplay: number = -1;
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (
        this.statTooltipAreas[i] &&
        x > this.statTooltipAreas[i].x &&
        x < this.statTooltipAreas[i].x + this.statTooltipAreas[i].width &&
        y > this.statTooltipAreas[i].y &&
        y < this.statTooltipAreas[i].y + this.statTooltipAreas[i].height
      ) {
        tooltipVisible = true;
        statToDisplay = i;
        break;
      }
    }

    let hoveredSkill: SkillSlot | null = null;
    for (const slot of this.skillSlots) {
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
        slot.border.tint = 0xffffff;
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
      this.tooltipText.style.wordWrapWidth = 340;

      if (this.tooltipWindow) {
        let tipWidth = 520;
        let tipHeight = 154; // to fit 128x128 icon with margins
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipWidth = Math.min(600, Math.max(480, Math.ceil(158 + (this.tooltipText.width || 300) + 16)));
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredSkill.x + hoveredSkill.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(10, Math.min(tipX, this.panelWidth - tipWidth - 10));
        const tipY = this.panelHeight + 4;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        this.tooltipIconSprite.texture = this.getTextureForIcon(
          (hoveredSkill as any).iconPath || getSkillIconPath(hoveredSkill.ability),
          this.tooltipIconSprite
        );
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
      this.tooltipText.style.wordWrapWidth = 340;

      if (this.tooltipWindow) {
        let tipWidth = 520;
        let tipHeight = 154; // to fit 128x128 icon with margins
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipWidth = Math.min(600, Math.max(480, Math.ceil(158 + (this.tooltipText.width || 300) + 16)));
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredTrait.x + hoveredTrait.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(10, Math.min(tipX, this.panelWidth - tipWidth - 10));
        const tipY = this.panelHeight + 4;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        const traitIcon = (hoveredTrait as any).iconPath || getTraitInfo(hoveredTrait.traitName, this.traitsConfig)?.icon || "traits/icon_shield_block.png";
        this.tooltipIconSprite.texture = this.getTextureForIcon(traitIcon, this.tooltipIconSprite);
        this.tooltipIconSprite.width = 128;
        this.tooltipIconSprite.height = 128;
        this.tooltipIconSprite.position = { x: tipX + 14, y: tipY + Math.max(12, (tipHeight - 128) / 2) };

        // Shift text to the right to make room for icon
        this.tooltipText.position = { x: tipX + 158, y: tipY + 14 };
      }
    } else if (statToDisplay !== -1) {
      if (statToDisplay === DisplayedStat.STAMINA) {
        if (this.currentCreature) {
          this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(
            this.currentCreature,
            this.currentCreature.combatConfig
          );
        } else if (this.stats) {
          this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(
            this.stats.stamina,
            this.stats.max_stamina
          );
        }
      }
      this.tooltipIconSprite.visible = false;
      this.tooltipText.style.wordWrapWidth = 360;
      this.tooltipText.text =
        this.statDescriptions[statToDisplay] +
        (this.statBuffDescriptions[statToDisplay] ? '\nBuffs: ' + this.statBuffDescriptions[statToDisplay] : '');

      if (this.tooltipWindow) {
        let tipWidth = 360;
        let tipHeight = 70;
        try {
          if (typeof document !== "undefined" && typeof (this.tooltipText as any).width === "number") {
            tipHeight = Math.max(70, Math.ceil(this.tooltipText.height + 20));
          }
        } catch {
          // headless fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;
        this.tooltipWindow.position = { x: 86, y: this.panelHeight + 4 };
        this.tooltipText.position = { x: 96, y: this.tooltipWindow.y + 8 };
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
    }
  }
}
