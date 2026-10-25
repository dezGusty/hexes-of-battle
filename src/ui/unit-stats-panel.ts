import {
  Assets,
  Container,
  Graphics,
  NineSliceSprite,
  Sprite,
  Spritesheet,
  Text,
  TextOptions,
  Texture,
} from "pixi.js";
import { Buff, Creature, CreatureStats } from "../battle/creature";
import { Ability, AbilityResourceUse } from "../battle/ability";
import { Coords } from "../shared";
import { getTraitInfo, TraitsConfig } from "../battle/trait-system";
import { Battle, InputState } from "../battle";
import { getMoraleState, getMoraleTooltip, getStaminaTooltip } from "../battle/combat-rules";
import { getMoraleTexture } from "./morale-icon-utils";
import { CommonControls } from "./common-controls";
import {
  createMedievalBestiaryOrnament,
  createMedievalMasterFrame,
  createMedievalSectionHeader,
  createMedievalVerticalDivider,
  drawAbilityPlaceholderSocket,
  drawMedievalBestiaryMotif,
  drawMetallicRivet,
  drawPerkPlaceholderSocket,
  MedievalMotifType,
} from "./medieval-ui-decorations";

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

export interface AbilityPlaceholderSlot {
  container: Container;
  socketGraphic: Graphics;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isOccupied: boolean;
}

export interface PerkPlaceholderSlot {
  container: Container;
  socketGraphic: Graphics;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isOccupied: boolean;
}

export interface PerkScrollButton {
  container: Container;
  bg: Graphics;
  label: Text;
  direction: "left" | "right";
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CommonActionSlot {
  container: Container;
  bg: Graphics;
  border: NineSliceSprite;
  iconSprite: Sprite;
  label: Text;
  action: "rest" | "nextUnit" | "endTurn";
  enabled: boolean;
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
  let desc =
    ability.description || `${ability.tooltipName || ability.name}: Specialized combat skill.`;
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
  NUM_STATS = 12,
}

/**
 * Redesigned Medieval Battle UI Console combining:
 * 1. Unit Portrait, Faction Banner & Heraldic Nameplate
 * 2. Unit Stats (all 12 stats with icon, current value label, and tooltip)
 * 3. Unit Abilities (stylized carved-stone & metalwork panel with 5 circular placeholders and up to 5 ability buttons)
 * 4. Unit Perks (scrollable reliquary rack displaying up to 6 perks at a time with 2 scroll buttons)
 * 5. Common Actions (Rest always in the same spot & deactivated when inapplicable, Next Unit, and a larger standout End Turn button)
 */
export class UnitStatsPanel {
  public static readonly MAX_ABILITY_SLOTS = 5;
  public static readonly MAX_VISIBLE_PERKS = 6;
  public static readonly NATIVE_WIDTH = 1920;
  public static readonly NATIVE_HEIGHT = 1080;
  public static readonly BOTTOM_MARGIN = 4;

  public static DEFAULT_FONT_STYLE: TextOptions = {
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fill: { color: "#f5ebd6", alpha: 1 },
      fontSize: 14,
      align: "left",
    },
  };

  public readonly panelWidth: number = 1840;
  public readonly panelHeight: number = 140;

  private statTextureNames: Record<number, string> = {
    [DisplayedStat.HP]: "glyph_hp",
    [DisplayedStat.ATTACK_MELEE]: "glyph_attack_melee",
    [DisplayedStat.ATTACK_RANGED]: "glyph_attack_ranged",
    [DisplayedStat.RANGE]: "glyph_range",
    [DisplayedStat.MOVEMENT]: "glyph_movement",
    [DisplayedStat.ATTACKS]: "glyph_attacks",
    [DisplayedStat.MELEE_DEFENSE]: "glyph_defense_melee",
    [DisplayedStat.RANGED_DEFENSE]: "glyph_defense_ranged",
    [DisplayedStat.COUNTER_ATTACKS]: "glyph_counterattacks",
    [DisplayedStat.STAMINA]: "glyph_stamina",
    [DisplayedStat.AMMO]: "glyph_ammo",
    [DisplayedStat.MORALE]: "glyph_morale",
  };

  private statDescriptions: Record<number, string> = {
    [DisplayedStat.HP]:
      "Current hitpoints. Depicts overall health and\nbasic protective gear of unit.",
    [DisplayedStat.ATTACK_MELEE]:
      "Melee attack power. Min-Max damage the unit can deal\nin melee combat before taking armor into account.",
    [DisplayedStat.ATTACK_RANGED]:
      "Ranged attack power. The range of damage\nthe unit can deal in ranged combat.",
    [DisplayedStat.RANGE]: "The distance the unit can attack from.",
    [DisplayedStat.MOVEMENT]:
      "The number of tiles the unit can move in a single turn.\nVarious terrain types may use more of this value.",
    [DisplayedStat.ATTACKS]: "The number of attacks the unit can make\nin a single turn.",
    [DisplayedStat.MELEE_DEFENSE]:
      "The unit's ability to defend against melee attacks. \nReduces incoming melee damage.",
    [DisplayedStat.RANGED_DEFENSE]:
      "The unit's ability to defend against ranged attacks. \nReduces incoming ranged damage.",
    [DisplayedStat.COUNTER_ATTACKS]:
      "The number of counterattacks the unit can\nmake in a single turn.",
    [DisplayedStat.STAMINA]: getStaminaTooltip(),
    [DisplayedStat.AMMO]:
      "The number of ranged attacks the unit can\nmake before running out of ammo",
    [DisplayedStat.MORALE]:
      "Morale (0-30). Dictates the squad's courage and discipline.\nRouting: 0, Panicked: 1-2, Wavering: 3-5, Steady: 6-15, High: >15.\n+1 if undamaged for a full turn or upon resting.",
  };

  private statBuffDescriptions: Record<number, string> = {};

  public readonly window = new Container();
  private decorationsGroup = new Container();
  private bestiaryMotifsUsed: MedievalMotifType[] = [
    "falcon",
    "eagle",
    "raven",
    "songbird",
    "wolf",
    "lion",
    "stag",
    "boar",
  ];

  // Perks / Traits section state
  private traitsConfig?: TraitsConfig;
  private traitsGroup = new Container();
  private perkPlaceholdersGroup = new Container();
  private perkPlaceholders: PerkPlaceholderSlot[] = [];
  private traitSlots: TraitSlot[] = [];
  private perkScrollOffset: number = 0;
  private perkScrollLeftBtn!: PerkScrollButton;
  private perkScrollRightBtn!: PerkScrollButton;
  private perksHeaderText?: Text;

  // Abilities section state (5 stylized circular placeholders + up to 5 buttons)
  private abilities: Ability[] = [];
  private abilitiesPanelGroup = new Container();
  private abilityPlaceholders: AbilityPlaceholderSlot[] = [];
  private skillsGroup = new Container();
  private skillSlots: SkillSlot[] = [];

  // Common Actions section state (Rest, Next Unit, End Turn)
  private commonActionsGroup = new Container();
  private commonActions!: {
    rest: CommonActionSlot;
    nextUnit: CommonActionSlot;
    endTurn: CommonActionSlot;
  };
  private boundCommonControls?: CommonControls;

  public onSkillClick?: (index: number, ability: Ability, creature?: Creature) => void;
  public onRestClick?: () => void;
  public onNextUnitClick?: () => void;
  public onEndTurnClick?: () => void;

  private currentCreature?: Creature = undefined;
  private lastTriggeredSkillTime: number = 0;
  private lastTriggeredSkillIndex: number = -1;
  private lastPointerTapTime: number = 0;

  private stats?: CreatureStats = undefined;
  private buffs?: Buff[] = [];
  private creatureType: string = "";
  private unitTypeText = new Text({
    ...UnitStatsPanel.DEFAULT_FONT_STYLE,
    text: "Unit: ",
    style: {
      fontFamily: "GustysSerpents, Georgia, serif",
      fontSize: 13,
      fontWeight: "bold",
      fill: { color: "#ffe285", alpha: 1 },
      align: "left",
    },
  });

  private tooltipText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: "Tooltip" });
  private tooltipWindow?: NineSliceSprite = undefined;
  private tooltipFrameGraphics = new Graphics();
  private tooltipIconSprite: Sprite = new Sprite(Texture.EMPTY);

  private statIcons: Sprite[] = [];
  private statTooltipAreas: Container[] = [];
  private statValues: Text[] = [];
  public readonly moraleStateIcon: Sprite;

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public getSkillSlots(): readonly SkillSlot[] {
    return this.skillSlots;
  }

  public getAbilityPlaceholders(): readonly AbilityPlaceholderSlot[] {
    return this.abilityPlaceholders;
  }

  public getPerkPlaceholders(): readonly PerkPlaceholderSlot[] {
    return this.perkPlaceholders;
  }

  public getTraitSlots(): readonly TraitSlot[] {
    return this.traitSlots;
  }

  public getTotalTraitCount(): number {
    return (this.stats?.traits?.filter((t) => !t.startsWith("format_")) ?? []).length;
  }

  public getPerkScrollOffset(): number {
    return this.perkScrollOffset;
  }

  public getPerkScrollLeftButton(): PerkScrollButton {
    return this.perkScrollLeftBtn;
  }

  public getPerkScrollRightButton(): PerkScrollButton {
    return this.perkScrollRightBtn;
  }

  public getCommonActions(): {
    rest: CommonActionSlot;
    nextUnit: CommonActionSlot;
    endTurn: CommonActionSlot;
  } {
    return this.commonActions;
  }

  public getStatIcons(): readonly Sprite[] {
    return this.statIcons;
  }

  public getStatValues(): readonly Text[] {
    return this.statValues;
  }

  public getStatTooltipAreas(): readonly Container[] {
    return this.statTooltipAreas;
  }

  public getDecorationsContainer(): Container {
    return this.decorationsGroup;
  }

  public getBestiaryMotifs(): readonly MedievalMotifType[] {
    return this.bestiaryMotifsUsed;
  }

  public getBestiaryMotifsRendered(): readonly MedievalMotifType[] {
    return this.bestiaryMotifsUsed;
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

  public getMoraleStateIcon(): Sprite {
    return this.moraleStateIcon;
  }

  public bindCommonControls(controls: CommonControls): void {
    this.boundCommonControls = controls;
    if (typeof controls.setPanelOrigin === "function") {
      controls.setPanelOrigin(this.window.x, this.window.y);
    }
    // Hide the internal duplicate common-action visuals when external FancyButtons are overlaid on the same spots,
    // while keeping the medieval section header and frame visible and synchronized.
    if (this.commonActions) {
      this.commonActions.rest.container.visible = true;
      this.commonActions.nextUnit.container.visible = true;
      this.commonActions.endTurn.container.visible = true;
    }
    this.updateCommonActionsState();
  }

  /**
   * Positions the combined Unit Stats / Abilities / Perks / Common Actions panel
   * at the bottom of the screen and horizontally centered for any screen resolution
   * (including square 1920x1920, portrait, ultrawide, and standard 16:9).
   */
  public layoutForScreenSize(
    screenWidth: number,
    screenHeight: number,
    nativeWidth: number = UnitStatsPanel.NATIVE_WIDTH,
    nativeHeight: number = UnitStatsPanel.NATIVE_HEIGHT
  ): void {
    const validW = screenWidth > 0 ? screenWidth : nativeWidth;
    const validH = screenHeight > 0 ? screenHeight : nativeHeight;
    const scaleX = validW / nativeWidth;
    const scaleY = validH / nativeHeight;
    const minScale = Math.min(scaleX, scaleY) || 1;

    const stageViewportWidth = validW / minScale;
    const stageViewportHeight = validH / minScale;

    const targetX = Math.round((stageViewportWidth - this.panelWidth) / 2);
    const targetY = Math.round(
      stageViewportHeight - this.panelHeight - UnitStatsPanel.BOTTOM_MARGIN
    );

    this.window.position = { x: targetX, y: targetY };

    if (
      this.boundCommonControls &&
      typeof this.boundCommonControls.setPanelOrigin === "function"
    ) {
      this.boundCommonControls.setPanelOrigin(targetX, targetY);
    }
  }

  public setCreature(creature: Creature) {
    const isDifferentCreature = this.currentCreature !== creature;
    this.currentCreature = creature;
    this.stats = creature.live_stats;
    this.buffs = creature.buffs;
    this.abilities = creature.abilities ? [...creature.abilities] : [];
    this.creatureType = Creature.CREATURE_NAMES[creature.creatureType];

    const userTraits = this.stats?.traits?.filter((t) => !t.startsWith("format_")) ?? [];
    if (isDifferentCreature) {
      this.perkScrollOffset = 0;
    } else {
      const maxOffset = Math.max(0, userTraits.length - UnitStatsPanel.MAX_VISIBLE_PERKS);
      if (this.perkScrollOffset > maxOffset) {
        this.perkScrollOffset = maxOffset;
      }
    }

    if (creature.combatConfig?.morale?.breakpoints) {
      this.statDescriptions[DisplayedStat.MORALE] = getMoraleTooltip(
        creature.combatConfig.morale.breakpoints
      );
    }
    if (creature) {
      this.statDescriptions[DisplayedStat.STAMINA] = getStaminaTooltip(
        creature,
        creature.combatConfig
      );
    }
  }

  public setBannerTexture(texture: Texture | undefined) {
    if (this.bannerSprite) {
      this.window.removeChild(this.bannerSprite);
      this.bannerSprite.destroy();
      this.bannerSprite = undefined;
    }

    if (texture) {
      this.bannerSprite = new Sprite(texture);
      this.bannerSprite.position = { x: 4, y: 4 };
      if (this.bannerBg) {
        this.bannerSprite.x += this.bannerBg.x;
        this.bannerSprite.y += this.bannerBg.y;
      }
      this.bannerSprite.width = 40;
      this.bannerSprite.height = 40;
      this.window.addChild(this.bannerSprite);
    }
  }

  public setFaceTexture(texture: Texture | undefined) {
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
      this.faceSprite.width = 104;
      this.faceSprite.height = 104;
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

    const gameEl =
      typeof document !== "undefined" && typeof document.getElementById === "function"
        ? document.getElementById("game")
        : null;
    const initialW =
      gameEl && gameEl.clientWidth > 0
        ? gameEl.clientWidth
        : typeof window !== "undefined" && window.innerWidth > 0
          ? window.innerWidth
          : UnitStatsPanel.NATIVE_WIDTH;
    const initialH =
      gameEl && gameEl.clientHeight > 0
        ? gameEl.clientHeight
        : typeof window !== "undefined" && window.innerHeight > 0
          ? window.innerHeight
          : UnitStatsPanel.NATIVE_HEIGHT;
    this.layoutForScreenSize(initialW, initialH);

    // 1. Base nine-slice panel + Medieval wrought-iron, bronze & carved-stone master frame
    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures["panel.png"],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });
    windowBg.width = this.panelWidth;
    windowBg.height = this.panelHeight;
    windowBg.tint = 0x262a34;
    this.window.addChild(windowBg);

    const masterFrame = createMedievalMasterFrame(this.panelWidth, this.panelHeight);
    this.decorationsGroup.addChild(masterFrame);

    // Add standalone bestiary ornaments on the portrait & frame rails
    const boarClasps = createMedievalBestiaryOrnament("boar", 20, false);
    boarClasps.position = { x: 18, y: 12 };
    this.decorationsGroup.addChild(boarClasps);

    const stagClasps = createMedievalBestiaryOrnament("stag", 20, true);
    stagClasps.position = { x: 168, y: 12 };
    this.decorationsGroup.addChild(stagClasps);

    // Section headers with medieval bird & wild animal metalwork reliefs
    const statsHeader = createMedievalSectionHeader("UNIT STATS", 548, "raven", "songbird");
    statsHeader.position = { x: 198, y: 8 };
    this.decorationsGroup.addChild(statsHeader);

    const abilitiesHeader = createMedievalSectionHeader("ABILITIES", 306, "falcon", "eagle");
    abilitiesHeader.position = { x: 766, y: 8 };
    this.decorationsGroup.addChild(abilitiesHeader);

    const perksHeader = createMedievalSectionHeader("UNIT PERKS", 398, "wolf", "stag");
    perksHeader.position = { x: 1094, y: 8 };
    this.decorationsGroup.addChild(perksHeader);

    const actionsHeader = createMedievalSectionHeader("ACTIONS", 304, "lion", "boar");
    actionsHeader.position = { x: 1518, y: 8 };
    this.decorationsGroup.addChild(actionsHeader);

    // Vertical metalwork dividers with embossed bird & wild animal medallions
    const div1 = createMedievalVerticalDivider(this.panelHeight - 16, "raven");
    div1.position = { x: 188, y: 8 };
    this.decorationsGroup.addChild(div1);

    const div2 = createMedievalVerticalDivider(this.panelHeight - 16, "falcon");
    div2.position = { x: 756, y: 8 };
    this.decorationsGroup.addChild(div2);

    const div3 = createMedievalVerticalDivider(this.panelHeight - 16, "wolf");
    div3.position = { x: 1084, y: 8 };
    this.decorationsGroup.addChild(div3);

    const div4 = createMedievalVerticalDivider(this.panelHeight - 16, "lion");
    div4.position = { x: 1506, y: 8 };
    this.decorationsGroup.addChild(div4);

    this.window.addChild(this.decorationsGroup);

    // 2. Unit Portrait, Faction Banner & Nameplate (x: 12..182)
    this.faceBg = new NineSliceSprite({
      texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.faceBg.width = 114;
    this.faceBg.height = 114;
    this.faceBg.position = { x: 14, y: -12 };
    this.window.addChild(this.faceBg);

    const portraitFrameGraphics = new Graphics();
    portraitFrameGraphics.roundRect(13, -13, 116, 116, 5).stroke({
      width: 2.5,
      color: 0xd4af37,
      alpha: 0.95,
    });
    drawMetallicRivet(portraitFrameGraphics, 17, -9, 2.2, 0xffe285);
    drawMetallicRivet(portraitFrameGraphics, 125, -9, 2.2, 0xffe285);
    drawMetallicRivet(portraitFrameGraphics, 17, 99, 2.2, 0xffe285);
    drawMetallicRivet(portraitFrameGraphics, 125, 99, 2.2, 0xffe285);
    this.window.addChild(portraitFrameGraphics);

    this.bannerBg = new NineSliceSprite({
      texture: this.uiSheet.textures["progress_bg.png"],
      leftWidth: 5,
      topHeight: 5,
      rightWidth: 5,
      bottomHeight: 5,
    });
    this.bannerBg.width = 48;
    this.bannerBg.height = 48;
    this.bannerBg.position = { x: 132, y: 24 };
    this.window.addChild(this.bannerBg);

    const nameplateBg = new Graphics();
    nameplateBg
      .roundRect(12, 108, 168, 24, 3)
      .fill({ color: 0x141820, alpha: 0.95 })
      .stroke({ width: 1.2, color: 0x9b7624, alpha: 0.9 });
    this.window.addChild(nameplateBg);

    this.unitTypeText.position = { x: 18, y: 112 };
    this.window.addChild(this.unitTypeText);

    // 3. Unit Stats Section (6 columns x 2 rows = 12 stats, x: 198..746, y: 34..130)
    const itemWidth = 90;
    const itemHeight = 46;
    const statStartX = 198;
    const statStartY = 34;

    const statsGridFrame = new Graphics();
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const cellX = statStartX + col * 91;
      const cellY = statStartY + row * 48;

      const statBorder = new NineSliceSprite({
        texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
        leftWidth: 4,
        topHeight: 4,
        rightWidth: 4,
        bottomHeight: 4,
      });
      statBorder.position = { x: cellX, y: cellY };
      statBorder.width = itemWidth;
      statBorder.height = itemHeight;
      this.window.addChild(statBorder);
      this.statTooltipAreas[i] = statBorder;

      statsGridFrame
        .roundRect(cellX, cellY, itemWidth, itemHeight, 3)
        .stroke({ width: 1.2, color: 0x6e561c, alpha: 0.75 });
      drawMetallicRivet(statsGridFrame, cellX + 3, cellY + 3, 1.1, 0x9b7624);
      drawMetallicRivet(statsGridFrame, cellX + itemWidth - 3, cellY + 3, 1.1, 0x9b7624);

      this.statIcons[i] = new Sprite(this.uiSheet.textures[this.statTextureNames[i]]);
      this.statIcons[i].position = { x: cellX + 4, y: cellY + 9 };
      this.statIcons[i].width = 28;
      this.statIcons[i].height = 28;
      this.window.addChild(this.statIcons[i]);

      this.statValues[i] = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: "" });
      this.statValues[i].position = { x: cellX + 34, y: cellY + 14 };
      this.window.addChild(this.statValues[i]);
    }
    this.window.addChild(statsGridFrame);

    this.moraleStateIcon = new Sprite(Texture.EMPTY);
    this.moraleStateIcon.width = 20;
    this.moraleStateIcon.height = 20;
    this.moraleStateIcon.visible = false;
    this.window.addChild(this.moraleStateIcon);

    // 4. Unit Abilities Section (x: 766..1072, y: 34..130)
    // Stylized carved-stone & forged-metal sub-panel with 5 circular placeholders
    this.initializeAbilitiesSection();

    // 5. Unit Perks Section (x: 1094..1492, y: 34..130)
    // Scrollable section with 6 perk display sockets and 2 scroll buttons
    this.initializePerksSection();

    // 6. Common Actions Section (x: 1518..1822, y: 30..132)
    // Rest (always in same spot, deactivated when inapplicable), Next Unit, and larger standout End Turn
    this.initializeCommonActionsSection();

    // 7. Tooltip Window & Icon (rendered on top)
    this.tooltipWindow = new NineSliceSprite({
      texture: this.uiSheet.textures["thin_panel_semitransparent.png"],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.tooltipWindow.position = { x: 300, y: -92 };
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
    this.tooltipText.position = {
      x: this.tooltipWindow.position.x + 20,
      y: this.tooltipWindow.position.y + 15,
    };

    this.window.addChild(this.tooltipWindow);
    this.window.addChild(this.tooltipFrameGraphics);
    this.window.addChild(this.tooltipIconSprite);
    this.window.addChild(this.tooltipText);

    this.view.addChild(this.window);
    this.hide();
  }

  private initializeAbilitiesSection(): void {
    this.abilitiesPanelGroup.position = { x: 766, y: 34 };
    const panelW = 306;
    const panelH = 96;

    // Carved dark stone & riveted metal slab housing the 5 empty circular sockets
    const slabBg = new Graphics();
    slabBg
      .roundRect(0, 0, panelW, panelH, 6)
      .fill({ color: 0x191d25, alpha: 0.96 })
      .stroke({ width: 2, color: 0x8b6c23, alpha: 0.92 });
    slabBg.roundRect(3, 3, panelW - 6, panelH - 6, 4).stroke({
      width: 1,
      color: 0x3f4756,
      alpha: 0.8,
    });

    // Subtle stone block chisel lines
    slabBg.moveTo(60, 4).lineTo(60, panelH - 4).stroke({ width: 1, color: 0x11141a, alpha: 0.55 });
    slabBg.moveTo(122, 4).lineTo(122, panelH - 4).stroke({ width: 1, color: 0x11141a, alpha: 0.55 });
    slabBg.moveTo(184, 4).lineTo(184, panelH - 4).stroke({ width: 1, color: 0x11141a, alpha: 0.55 });
    slabBg.moveTo(246, 4).lineTo(246, panelH - 4).stroke({ width: 1, color: 0x11141a, alpha: 0.55 });

    drawMetallicRivet(slabBg, 6, 6, 2, 0xd4af37);
    drawMetallicRivet(slabBg, panelW - 6, 6, 2, 0xd4af37);
    drawMetallicRivet(slabBg, 6, panelH - 6, 2, 0xd4af37);
    drawMetallicRivet(slabBg, panelW - 6, panelH - 6, 2, 0xd4af37);
    this.abilitiesPanelGroup.addChild(slabBg);

    // Skills group positioned inside the abilities stone panel
    this.skillsGroup.position = { x: 777, y: 58 };
    const slotSize = 48;
    const slotGap = 11;

    this.abilityPlaceholders = [];
    for (let i = 0; i < UnitStatsPanel.MAX_ABILITY_SLOTS; i++) {
      const slotX = i * (slotSize + slotGap);
      const placeholderContainer = new Container();
      placeholderContainer.position = { x: 11 + slotX, y: 24 };

      const socketGraphic = new Graphics();
      drawAbilityPlaceholderSocket(socketGraphic, 0, 0, slotSize, i + 1, false);
      placeholderContainer.addChild(socketGraphic);

      const numLabel = new Text({
        text: `${i + 1}`,
        style: {
          fontFamily: "GustysSerpents, sans-serif",
          fontSize: 9,
          fill: { color: "#b89b52", alpha: 0.85 },
        },
      });
      numLabel.position = { x: 3, y: 1 };
      placeholderContainer.addChild(numLabel);

      this.abilitiesPanelGroup.addChild(placeholderContainer);

      this.abilityPlaceholders.push({
        container: placeholderContainer,
        socketGraphic,
        index: i,
        x: this.skillsGroup.x + slotX,
        y: this.skillsGroup.y,
        width: slotSize,
        height: slotSize,
        isOccupied: false,
      });
    }

    this.window.addChild(this.abilitiesPanelGroup);
    this.window.addChild(this.skillsGroup);
  }

  private initializePerksSection(): void {
    this.traitsGroup.position = { x: 1094, y: 0 };

    // Forged reliquary sub-panel background for the 6 perk sockets + 2 scroll buttons
    const perksRackBg = new Graphics();
    perksRackBg
      .roundRect(0, 34, 398, 96, 6)
      .fill({ color: 0x171b22, alpha: 0.95 })
      .stroke({ width: 1.8, color: 0x8b6c23, alpha: 0.9 });
    this.traitsGroup.addChild(perksRackBg);

    this.perksHeaderText = new Text({
      text: "PERKS / TRAITS",
      style: {
        fill: 0xd4af37,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    this.perksHeaderText.position = { x: 36, y: 38 };
    this.traitsGroup.addChild(this.perksHeaderText);

    // 6 permanent square metalwork perk placeholders
    this.perkPlaceholdersGroup.position = { x: 0, y: 0 };
    this.traitsGroup.addChild(this.perkPlaceholdersGroup);

    const slotSize = 48;
    const slotGap = 6;
    const startX = 36;
    const startY = 56;

    this.perkPlaceholders = [];
    for (let i = 0; i < UnitStatsPanel.MAX_VISIBLE_PERKS; i++) {
      const slotX = startX + i * (slotSize + slotGap);
      const pContainer = new Container();
      pContainer.position = { x: slotX, y: startY };

      const socketGraphic = new Graphics();
      drawPerkPlaceholderSocket(socketGraphic, 0, 0, slotSize, false);
      pContainer.addChild(socketGraphic);
      this.perkPlaceholdersGroup.addChild(pContainer);

      this.perkPlaceholders.push({
        container: pContainer,
        socketGraphic,
        index: i,
        x: this.traitsGroup.x + slotX,
        y: this.traitsGroup.y + startY,
        width: slotSize,
        height: slotSize,
        isOccupied: false,
      });
    }

    // Create the 2 scroll buttons (Left / Previous and Right / Next)
    this.perkScrollLeftBtn = this.createPerkScrollButton("left", 5, startY, 26, slotSize);
    this.perkScrollRightBtn = this.createPerkScrollButton("right", 366, startY, 26, slotSize);

    this.traitsGroup.addChild(this.perkScrollLeftBtn.container);
    this.traitsGroup.addChild(this.perkScrollRightBtn.container);

    this.window.addChild(this.traitsGroup);
  }

  private createPerkScrollButton(
    direction: "left" | "right",
    localX: number,
    localY: number,
    width: number,
    height: number
  ): PerkScrollButton {
    const container = new Container();
    container.label = `perk-scroll-${direction}`;
    container.position = { x: localX, y: localY };
    container.eventMode = "static";
    container.cursor = "not-allowed";
    container.alpha = 0.35;

    const bg = new Graphics();
    bg.roundRect(0, 0, width, height, 4)
      .fill({ color: 0x252a35, alpha: 0.96 })
      .stroke({ width: 1.5, color: 0xc59b27, alpha: 0.9 });
    drawMetallicRivet(bg, width / 2, 5, 1.5, 0xd4af37);
    drawMetallicRivet(bg, width / 2, height - 5, 1.5, 0xd4af37);
    container.addChild(bg);

    const label = new Text({
      text: direction === "left" ? "◀" : "▶",
      style: {
        fontFamily: "GustysSerpents, sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        fill: { color: "#ffe285", alpha: 1 },
      },
    });
    if (label.anchor && typeof label.anchor.set === "function") {
      label.anchor.set(0.5, 0.5);
    }
    label.position = { x: width / 2, y: height / 2 };
    container.addChild(label);

    const btnObj: PerkScrollButton = {
      container,
      bg,
      label,
      direction,
      enabled: false,
      x: this.traitsGroup.x + localX,
      y: this.traitsGroup.y + localY,
      width,
      height,
    };

    container.on("pointertap", () => {
      this.lastPointerTapTime = Date.now();
      if (direction === "left") {
        this.scrollPerksLeft();
      } else {
        this.scrollPerksRight();
      }
    });

    return btnObj;
  }

  private initializeCommonActionsSection(): void {
    this.commonActionsGroup.position = { x: 0, y: 0 };

    // Frame behind the Common Actions cluster
    const actionsRackBg = new Graphics();
    actionsRackBg
      .roundRect(1514, 24, 314, 108, 6)
      .fill({ color: 0x161920, alpha: 0.95 })
      .stroke({ width: 1.8, color: 0x9b7624, alpha: 0.9 });
    this.commonActionsGroup.addChild(actionsRackBg);

    // 1. Rest Button (x: 1520, y: 30, w: 132, h: 46) - always in the same spot, always shown
    const restSlot = this.createCommonActionSlot(
      "rest",
      1520,
      30,
      132,
      46,
      "glyph_stamina",
      "Rest [R]",
      false
    );

    // 2. Next Unit Button (x: 1520, y: 82, w: 132, h: 46)
    const nextUnitSlot = this.createCommonActionSlot(
      "nextUnit",
      1520,
      82,
      132,
      46,
      "glyph_next_unit.png",
      "Next Unit [Tab]",
      false
    );

    // 3. End Turn Button (x: 1662, y: 26, w: 160, h: 104) - Larger, standing out!
    const endTurnSlot = this.createCommonActionSlot(
      "endTurn",
      1662,
      26,
      160,
      104,
      "glyph_next_turn.png",
      "END TURN\n[Enter]",
      true
    );

    this.commonActions = {
      rest: restSlot,
      nextUnit: nextUnitSlot,
      endTurn: endTurnSlot,
    };

    this.window.addChild(this.commonActionsGroup);
  }

  private createCommonActionSlot(
    action: "rest" | "nextUnit" | "endTurn",
    x: number,
    y: number,
    width: number,
    height: number,
    iconName: string,
    textStr: string,
    isStandout: boolean
  ): CommonActionSlot {
    const container = new Container();
    container.label = `common-action-${action}`;
    container.position = { x, y };
    container.eventMode = "static";
    container.cursor = "pointer";

    const border = new NineSliceSprite({
      texture:
        this.uiSheet.textures["btn_simple.png"] ||
        this.uiSheet.textures["thin_panel_semitransparent.png"],
      leftWidth: 7,
      topHeight: 7,
      rightWidth: 7,
      bottomHeight: 7,
    });
    border.width = width;
    border.height = height;
    container.addChild(border);

    const bg = new Graphics();
    if (isStandout) {
      // Larger standout End Turn button with royal crimson & gilded gold medieval metalwork
      bg.roundRect(0, 0, width, height, 6)
        .fill({ color: 0x521616, alpha: 0.72 })
        .stroke({ width: 3, color: 0xd4af37, alpha: 1 });
      bg.roundRect(3, 3, width - 6, height - 6, 4).stroke({
        width: 1.5,
        color: 0xffe885,
        alpha: 0.85,
      });
      drawMetallicRivet(bg, 7, 7, 2.5, 0xffe885);
      drawMetallicRivet(bg, width - 7, 7, 2.5, 0xffe885);
      drawMetallicRivet(bg, 7, height - 7, 2.5, 0xffe885);
      drawMetallicRivet(bg, width - 7, height - 7, 2.5, 0xffe885);
      drawMedievalBestiaryMotif(bg, "eagle", width / 2, 14, 18, false, 0xffe285, 0xffffff);
    } else {
      bg.roundRect(0, 0, width, height, 4)
        .fill({ color: 0x222733, alpha: 0.75 })
        .stroke({ width: 1.8, color: 0x9b7624, alpha: 0.92 });
      drawMetallicRivet(bg, 5, 5, 1.8, 0xd4af37);
      drawMetallicRivet(bg, width - 5, 5, 1.8, 0xd4af37);
      drawMetallicRivet(bg, 5, height - 5, 1.8, 0xd4af37);
      drawMetallicRivet(bg, width - 5, height - 5, 1.8, 0xd4af37);
    }
    container.addChild(bg);

    const iconTex = this.uiSheet.textures[iconName] || Texture.EMPTY;
    const iconSprite = new Sprite(iconTex);
    if (isStandout) {
      iconSprite.width = 28;
      iconSprite.height = 28;
      iconSprite.position = { x: width / 2 - 14, y: 24 };
    } else {
      iconSprite.width = 22;
      iconSprite.height = 22;
      iconSprite.position = { x: 8, y: (height - 22) / 2 };
    }
    container.addChild(iconSprite);

    const label = new Text({
      text: textStr,
      style: {
        fontFamily: "GustysSerpents, Georgia, serif",
        fontSize: isStandout ? 16 : 12,
        fontWeight: isStandout ? "bold" : "normal",
        fill: { color: isStandout ? "#ffe885" : "#f5e6c4", alpha: 1 },
        stroke: { color: "#0d0f14", width: isStandout ? 3 : 2 },
        align: isStandout ? "center" : "left",
      },
    });
    if (isStandout) {
      if (label.anchor && typeof label.anchor.set === "function") {
        label.anchor.set(0.5, 0.5);
      }
      label.position = { x: width / 2, y: height - 28 };
    } else {
      label.position = { x: 34, y: (height - 16) / 2 };
    }
    container.addChild(label);

    container.on("pointertap", () => {
      this.lastPointerTapTime = Date.now();
      if (action === "rest") {
        this.triggerRest();
      } else if (action === "nextUnit") {
        this.triggerNextUnit();
      } else if (action === "endTurn") {
        this.triggerEndTurn();
      }
    });

    this.commonActionsGroup.addChild(container);

    return {
      container,
      bg,
      border,
      iconSprite,
      label,
      action,
      enabled: true,
      x,
      y,
      width,
      height,
    };
  }

  public isRestApplicable(creature?: Creature): boolean {
    const c =
      creature ??
      this.currentCreature ??
      (typeof this.battle?.getActiveCreature === "function" ? this.battle.getActiveCreature() : undefined);
    if (!c || typeof c.canRest !== "function") return false;
    if (!c.canRest()) return false;
    if (this.battle) {
      const b = this.battle as any;
      if (typeof b.isBattleOver === "function" && b.isBattleOver()) return false;
      if (typeof this.battle.isCurrentTurnAI === "function" && this.battle.isCurrentTurnAI()) return false;
      if (this.battle.currentArmyIndex !== undefined && c.armyAlignment !== this.battle.currentArmyIndex) return false;
    }
    return true;
  }

  private updateCommonActionsState(): void {
    if (!this.commonActions) return;
    const canRest = this.isRestApplicable();

    // Rest button is ALWAYS in the same spot and ALWAYS shown, deactivated when not applicable
    const restSlot = this.commonActions.rest;
    restSlot.enabled = canRest;
    restSlot.container.visible = true;
    restSlot.container.position = { x: 1520, y: 30 };
    restSlot.container.alpha = canRest ? 1.0 : 0.4;
    restSlot.container.cursor = canRest ? "pointer" : "not-allowed";

    if (this.boundCommonControls) {
      if (typeof this.boundCommonControls.setRestApplicable === "function") {
        this.boundCommonControls.setRestApplicable(canRest);
      } else if (this.boundCommonControls.restButton) {
        this.boundCommonControls.restButton.alpha = canRest ? 1.0 : 0.4;
      }
    }
  }

  public triggerRest(): boolean {
    this.updateCommonActionsState();
    if (!this.commonActions.rest.enabled) return false;

    if (this.onRestClick) {
      this.onRestClick();
      this.update();
      return true;
    }
    if (this.boundCommonControls?.restButton) {
      this.boundCommonControls.restButton.onPress.emit();
      this.update();
      return true;
    }
    if (this.battle) {
      const ok = this.battle.restActiveCreature();
      this.update();
      return ok;
    }
    return true;
  }

  public triggerNextUnit(): boolean {
    if (this.onNextUnitClick) {
      this.onNextUnitClick();
      return true;
    }
    if (this.boundCommonControls?.nextUnitButton) {
      this.boundCommonControls.nextUnitButton.onPress.emit();
      return true;
    }
    if (this.battle) {
      this.battle.selectNextUnitAndGetIndex();
      return true;
    }
    return true;
  }

  public triggerEndTurn(): boolean {
    if (this.onEndTurnClick) {
      this.onEndTurnClick();
      return true;
    }
    if (this.boundCommonControls?.nextTurnButton) {
      this.boundCommonControls.nextTurnButton.onPress.emit();
      return true;
    }
    if (this.battle) {
      this.battle.nextTurn();
      return true;
    }
    return true;
  }

  public canScrollPerksLeft(): boolean {
    return this.perkScrollOffset > 0;
  }

  public canScrollPerksRight(): boolean {
    const total = this.getTotalTraitCount();
    return this.perkScrollOffset + UnitStatsPanel.MAX_VISIBLE_PERKS < total;
  }

  public scrollPerksLeft(): boolean {
    if (!this.canScrollPerksLeft()) return false;
    this.perkScrollOffset = Math.max(0, this.perkScrollOffset - 1);
    this.renderTraits();
    return true;
  }

  public scrollPerksRight(): boolean {
    if (!this.canScrollPerksRight()) return false;
    const total = this.getTotalTraitCount();
    const maxOffset = Math.max(0, total - UnitStatsPanel.MAX_VISIBLE_PERKS);
    this.perkScrollOffset = Math.min(maxOffset, this.perkScrollOffset + 1);
    this.renderTraits();
    return true;
  }

  public getBuffDescOrUndefined(buff: Buff): string[] {
    const buffDescriptions: string[] = [];
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
      buffDescriptions[DisplayedStat.ATTACKS] =
        buffDescriptions[DisplayedStat.ATTACKS] ||
        `${buff.stats.remaining_attacks} / ${buff.stats.num_attacks} from ${buff.source}`;
    }
    if (buff.stats.defense_melee != 0) {
      buffDescriptions[DisplayedStat.MELEE_DEFENSE] =
        buffDescriptions[DisplayedStat.MELEE_DEFENSE] ||
        `${buff.stats.defense_melee} from ${buff.source}`;
    }
    if (buff.stats.defense_ranged != 0) {
      buffDescriptions[DisplayedStat.RANGED_DEFENSE] =
        buffDescriptions[DisplayedStat.RANGED_DEFENSE] ||
        `${buff.stats.defense_ranged} from ${buff.source}`;
    }
    if (buff.stats.remaining_counterattacks != 0 || buff.stats.num_counterattacks != 0) {
      buffDescriptions[DisplayedStat.COUNTER_ATTACKS] =
        buffDescriptions[DisplayedStat.COUNTER_ATTACKS] ||
        `${buff.stats.remaining_counterattacks} / ${buff.stats.num_counterattacks} from ${buff.source}`;
    }
    if (buff.stats.stamina != 0) {
      buffDescriptions[DisplayedStat.STAMINA] =
        buffDescriptions[DisplayedStat.STAMINA] || `${buff.stats.stamina} from ${buff.source}`;
    }
    if (
      buff.stats.remaining_ammo &&
      buff.stats.ammo &&
      (buff.stats.remaining_ammo != 0 || buff.stats.ammo != 0)
    ) {
      buffDescriptions[DisplayedStat.AMMO] =
        buffDescriptions[DisplayedStat.AMMO] ||
        `${buff.stats.remaining_ammo} / ${buff.stats.ammo} from ${buff.source}`;
    }
    if (buff.stats.morale != 0) {
      buffDescriptions[DisplayedStat.MORALE] =
        buffDescriptions[DisplayedStat.MORALE] || `${buff.stats.morale} from ${buff.source}`;
    }
    return buffDescriptions;
  }

  public setTraitsConfig(traitsConfig: TraitsConfig): void {
    this.traitsConfig = traitsConfig;
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
    // Remove previously rendered active trait icon containers
    for (const slot of this.traitSlots) {
      this.traitsGroup.removeChild(slot.container);
      slot.container.destroy({ children: true });
    }
    this.traitSlots = [];

    const userTraits = this.stats?.traits?.filter((t) => !t.startsWith("format_")) ?? [];
    const maxOffset = Math.max(0, userTraits.length - UnitStatsPanel.MAX_VISIBLE_PERKS);
    if (this.perkScrollOffset > maxOffset) {
      this.perkScrollOffset = maxOffset;
    }

    const visibleTraits = userTraits.slice(
      this.perkScrollOffset,
      this.perkScrollOffset + UnitStatsPanel.MAX_VISIBLE_PERKS
    );

    if (this.perksHeaderText) {
      if (userTraits.length === 0) {
        this.perksHeaderText.text = "TRAITS: NONE";
        this.perksHeaderText.style.fill = 0x777777;
      } else if (userTraits.length > UnitStatsPanel.MAX_VISIBLE_PERKS) {
        const startNum = this.perkScrollOffset + 1;
        const endNum = this.perkScrollOffset + visibleTraits.length;
        this.perksHeaderText.text = `PERKS (${startNum}-${endNum} / ${userTraits.length})`;
        this.perksHeaderText.style.fill = 0xd4af37;
      } else {
        this.perksHeaderText.text = `PERKS / TRAITS (${userTraits.length})`;
        this.perksHeaderText.style.fill = 0xd4af37;
      }
    }

    // Update the 6 perk placeholder sockets
    const slotSize = 48;
    const slotGap = 6;
    const startX = 36;
    const startY = 56;

    for (let i = 0; i < UnitStatsPanel.MAX_VISIBLE_PERKS; i++) {
      const pSlot = this.perkPlaceholders[i];
      if (pSlot) {
        pSlot.isOccupied = i < visibleTraits.length;
        pSlot.socketGraphic.clear();
        drawPerkPlaceholderSocket(pSlot.socketGraphic, 0, 0, slotSize, pSlot.isOccupied);
      }
    }

    // Update the 2 perk scroll buttons
    const canLeft = this.canScrollPerksLeft();
    const canRight = this.canScrollPerksRight();
    if (this.perkScrollLeftBtn) {
      this.perkScrollLeftBtn.enabled = canLeft;
      this.perkScrollLeftBtn.container.alpha = canLeft ? 1.0 : 0.35;
      this.perkScrollLeftBtn.container.cursor = canLeft ? "pointer" : "not-allowed";
    }
    if (this.perkScrollRightBtn) {
      this.perkScrollRightBtn.enabled = canRight;
      this.perkScrollRightBtn.container.alpha = canRight ? 1.0 : 0.35;
      this.perkScrollRightBtn.container.cursor = canRight ? "pointer" : "not-allowed";
    }

    if (visibleTraits.length === 0) return;

    visibleTraits.forEach((traitName, visibleIndex) => {
      const info = getTraitInfo(traitName, this.traitsConfig);
      const name = info?.name ?? traitName;
      const iconPath = info?.icon ?? "traits/icon_shield_block.png";
      const description = info?.description ?? `${name}: Specialized combat perk.`;

      const slotContainer = new Container();
      const slotX = startX + visibleIndex * (slotSize + slotGap);
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
      if (res.resource_used === AbilityResourceUse.Stamina && c.live_stats.stamina < res.resource_cost)
        return false;
      if (
        res.resource_used === AbilityResourceUse.Ammo &&
        c.live_stats.remaining_ammo < res.resource_cost
      )
        return false;
      if (
        res.resource_used === AbilityResourceUse.Attack &&
        c.live_stats.remaining_attacks < res.resource_cost
      )
        return false;
    }
    return true;
  }

  private renderSkills(): void {
    this.skillsGroup.removeChildren();
    this.skillSlots = [];

    const userSkills = (this.abilities ?? []).slice(0, UnitStatsPanel.MAX_ABILITY_SLOTS);
    const slotSize = 48;
    const slotGap = 11;
    const startY = 0;

    // Update the 5 stylized circular placeholders
    for (let i = 0; i < UnitStatsPanel.MAX_ABILITY_SLOTS; i++) {
      const placeholder = this.abilityPlaceholders[i];
      if (placeholder) {
        placeholder.isOccupied = i < userSkills.length;
        placeholder.socketGraphic.clear();
        drawAbilityPlaceholderSocket(
          placeholder.socketGraphic,
          0,
          0,
          slotSize,
          i + 1,
          placeholder.isOccupied
        );
      }
    }

    if (userSkills.length === 0) return;

    userSkills.forEach((ability, index) => {
      const name = ability.tooltipName || ability.name || ability.id;
      const iconPath = getSkillIconPath(ability);
      const description = formatAbilityDescription(ability);
      const isUsable = this.currentCreature
        ? this.isAbilityUsable(ability, this.currentCreature)
        : true;
      const isActive = !!(
        (this.currentCreature?.isQuickDrawActive &&
          (ability.id === "quick-draw-01" || ability.name?.toLowerCase().includes("quick draw"))) ||
        (this.battle &&
          this.battle.input_state === InputState.SELECT_ABILITY_TARGET &&
          this.battle.abilityToApply?.id === ability.id)
      );

      const slotContainer = new Container();
      const slotX = index * (slotSize + slotGap);
      slotContainer.position = { x: slotX, y: startY };
      slotContainer.eventMode = "static";
      slotContainer.cursor = isUsable ? "pointer" : "not-allowed";
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

      // Ornate circular gold bezel ring around the placed ability button
      const buttonRing = new Graphics();
      buttonRing
        .circle(slotSize / 2, slotSize / 2, slotSize / 2 - 1)
        .stroke({ width: 1.8, color: isActive ? 0x66ff66 : 0xd4af37, alpha: 0.9 });
      buttonRing.eventMode = "none";
      slotContainer.addChild(buttonRing);

      if (index < UnitStatsPanel.MAX_ABILITY_SLOTS) {
        const keyLabel = new Text({
          text: `${index + 1}`,
          style: {
            fontFamily: "GustysSerpents, sans-serif",
            fontSize: 10,
            fill: { color: "#ffffff", alpha: 0.95 },
            stroke: { color: "#000000", width: 2 },
          },
        });
        keyLabel.position = { x: 4, y: 2 };
        keyLabel.eventMode = "none";
        slotContainer.addChild(keyLabel);
      }

      slotContainer.on("pointerdown", () => {
        if (isUsable) {
          slotBorder.tint = 0xd4b038;
        }
      });
      slotContainer.on("pointerup", () => {
        if (isUsable) {
          slotBorder.tint = 0xffe680;
        }
      });
      slotContainer.on("pointertap", () => {
        this.triggerSkill(index);
      });

      this.skillsGroup.addChild(slotContainer);

      const hotkeyNotice = index < UnitStatsPanel.MAX_ABILITY_SLOTS ? `\nHotkey: [${index + 1}]` : "";
      const fullDescription = description + hotkeyNotice;

      this.skillSlots.push({
        container: slotContainer,
        border: slotBorder,
        iconSprite,
        skillId: ability.id,
        name,
        description: fullDescription,
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
    if (index < 0 || index >= UnitStatsPanel.MAX_ABILITY_SLOTS) return false;
    const slot = this.skillSlots[index];
    if (!slot) return false;
    if (!slot.isUsable) return false;

    const now = Date.now();
    if (this.lastTriggeredSkillIndex === index && now - this.lastTriggeredSkillTime < 350) {
      return true;
    }
    this.lastTriggeredSkillIndex = index;
    this.lastTriggeredSkillTime = now;

    if (this.onSkillClick) {
      this.onSkillClick(index, slot.ability, this.currentCreature);
    } else if (this.battle) {
      this.battle.selectActiveAbilityForCurrentUnit(index, this.currentCreature);
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

    // 1. Check ability buttons (up to 5)
    for (let i = 0; i < this.skillSlots.length; i++) {
      const slot = this.skillSlots[i];
      if (x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height) {
        return this.triggerSkill(i);
      }
    }

    // Guard against duplicate DOM click right after Pixi pointertap in browser mode
    const now = Date.now();
    const isDuplicateTap = now - this.lastPointerTapTime < 100;

    // 2. Check perk scroll buttons
    if (
      this.perkScrollLeftBtn &&
      x >= this.perkScrollLeftBtn.x &&
      x <= this.perkScrollLeftBtn.x + this.perkScrollLeftBtn.width &&
      y >= this.perkScrollLeftBtn.y &&
      y <= this.perkScrollLeftBtn.y + this.perkScrollLeftBtn.height
    ) {
      if (isDuplicateTap) return true;
      return this.scrollPerksLeft();
    }

    if (
      this.perkScrollRightBtn &&
      x >= this.perkScrollRightBtn.x &&
      x <= this.perkScrollRightBtn.x + this.perkScrollRightBtn.width &&
      y >= this.perkScrollRightBtn.y &&
      y <= this.perkScrollRightBtn.y + this.perkScrollRightBtn.height
    ) {
      if (isDuplicateTap) return true;
      return this.scrollPerksRight();
    }

    // 3. Check Common Actions buttons (Rest, Next Unit, End Turn) when not already handled by overlaid FancyButton
    if (this.commonActions && !this.boundCommonControls) {
      const { rest, nextUnit, endTurn } = this.commonActions;
      if (x >= rest.x && x <= rest.x + rest.width && y >= rest.y && y <= rest.y + rest.height) {
        if (isDuplicateTap) return true;
        return this.triggerRest();
      }
      if (
        x >= nextUnit.x &&
        x <= nextUnit.x + nextUnit.width &&
        y >= nextUnit.y &&
        y <= nextUnit.y + nextUnit.height
      ) {
        if (isDuplicateTap) return true;
        return this.triggerNextUnit();
      }
      if (
        x >= endTurn.x &&
        x <= endTurn.x + endTurn.width &&
        y >= endTurn.y &&
        y <= endTurn.y + endTurn.height
      ) {
        if (isDuplicateTap) return true;
        return this.triggerEndTurn();
      }
    }

    return false;
  }

  public update() {
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
    this.updateCommonActionsState();
    if (!this.stats) return;

    this.unitTypeText.text = `Unit: ${this.creatureType}`;
    this.renderTraits();
    this.renderSkills();

    this.statValues[DisplayedStat.HP].text = `${this.stats?.remaining_health} / ${this.stats?.health}`;
    this.statValues[DisplayedStat.ATTACK_MELEE].text = `${this.stats?.attack_melee_low}-${this.stats?.attack_melee_high}`;
    this.statValues[DisplayedStat.ATTACK_RANGED].text = this.stats.is_ranged
      ? `${this.stats?.attack_ranged_low}-${this.stats?.attack_ranged_high}`
      : "";
    this.statValues[DisplayedStat.RANGE].text = this.stats.is_ranged ? `${this.stats?.range}` : "";
    this.statValues[DisplayedStat.MOVEMENT].text = `${this.stats?.remaining_movement} / ${this.stats?.num_moves}`;
    this.statValues[DisplayedStat.ATTACKS].text = `${this.stats?.remaining_attacks} / ${this.stats?.num_attacks}`;
    this.statValues[DisplayedStat.MELEE_DEFENSE].text = `${this.stats?.defense_melee}`;
    this.statValues[DisplayedStat.RANGED_DEFENSE].text = `${this.stats?.defense_ranged}`;
    this.statValues[DisplayedStat.COUNTER_ATTACKS].text = `${this.stats?.remaining_counterattacks} / ${this.stats?.num_counterattacks}`;
    this.statValues[DisplayedStat.STAMINA].text = `${this.stats?.stamina}`;
    this.statValues[DisplayedStat.AMMO].text =
      this.stats?.ammo && this.stats.ammo > 0
        ? `${this.stats?.remaining_ammo ?? 0} / ${this.stats?.ammo}`
        : "";
    const moraleVal =
      this.stats?.morale !== undefined && !Number.isNaN(this.stats.morale) ? this.stats.morale : 10;
    this.statValues[DisplayedStat.MORALE].text = `${moraleVal}`;

    const moraleState = this.currentCreature
      ? this.currentCreature.moraleState
      : ((this.stats as any)?.morale_state ?? getMoraleState(moraleVal));
    this.moraleStateIcon.texture = getMoraleTexture(moraleState, this.uiSheet);
    this.moraleStateIcon.visible = this.statValues[DisplayedStat.MORALE].text !== "";
    let valWidth = 18;
    try {
      if (typeof document !== "undefined") {
        valWidth = this.statValues[DisplayedStat.MORALE].width || 18;
      } else {
        valWidth = (this.statValues[DisplayedStat.MORALE].text?.length || 2) * 9;
      }
    } catch {
      valWidth = 18;
    }
    this.moraleStateIcon.position.x =
      this.statValues[DisplayedStat.MORALE].position.x + valWidth + 4;
    this.moraleStateIcon.position.y =
      this.statIcons[DisplayedStat.MORALE].y +
      Math.round((this.statIcons[DisplayedStat.MORALE].height - this.moraleStateIcon.height) / 2);

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (this.statValues[i].text == "") {
        this.statIcons[i].tint = 0x666666;
      } else {
        this.statIcons[i].tint = 0xffffff;
      }
    }

    // Go through all the buffs and if they impact the stat, add a tooltip entry for them
    const buffDescriptions: string[] = [];
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      buffDescriptions[i] = "";
    }
    this.buffs?.forEach((buff) => {
      const thisBuffDescriptions = this.getBuffDescOrUndefined(buff);
      for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
        if (thisBuffDescriptions[i].length > 0) {
          buffDescriptions[i] += thisBuffDescriptions[i] + "\n";
        }
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
    this.tooltipFrameGraphics.visible = false;
    if (this.tooltipText) this.tooltipText.visible = false;
    if (this.tooltipIconSprite) this.tooltipIconSprite.visible = false;
    for (const slot of this.traitSlots) slot.border.tint = 0xffffff;
    for (const slot of this.skillSlots) {
      const isActive = !!(
        this.currentCreature?.isQuickDrawActive &&
        (slot.ability.id === "quick-draw-01" ||
          slot.ability.name?.toLowerCase().includes("quick draw"))
      );
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
    // Check main combined panel bounds
    if (
      stageX >= wx &&
      stageX <= wx + this.panelWidth &&
      stageY >= wy &&
      stageY <= wy + this.panelHeight
    ) {
      return true;
    }
    // Check portrait area
    if (this.faceBg) {
      const fx = wx + this.faceBg.x;
      const fy = wy + this.faceBg.y;
      if (
        stageX >= fx &&
        stageX <= fx + this.faceBg.width &&
        stageY >= fy &&
        stageY <= fy + this.faceBg.height
      ) {
        return true;
      }
    }
    // Check skills area
    for (const slot of this.skillSlots) {
      const sx = wx + slot.x;
      const sy = wy + slot.y;
      if (
        stageX >= sx &&
        stageX <= sx + slot.width &&
        stageY >= sy &&
        stageY <= sy + slot.height
      ) {
        return true;
      }
    }
    // Check tooltip bounds if visible
    if (this.tooltipWindow?.visible) {
      const tx = wx + this.tooltipWindow.x;
      const ty = wy + this.tooltipWindow.y;
      if (
        stageX >= tx &&
        stageX <= tx + this.tooltipWindow.width &&
        stageY >= ty &&
        stageY <= ty + this.tooltipWindow.height
      ) {
        return true;
      }
    }
    return false;
  }

  public mousemove(coords: Coords) {
    const x = coords.x - this.window.x;
    const y = coords.y - this.window.y;

    let tooltipVisible = false;
    let statToDisplay: number = -1;
    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      if (
        this.statTooltipAreas[i] &&
        x > this.statTooltipAreas[i]?.x &&
        x < this.statTooltipAreas[i]?.x + this.statTooltipAreas[i]?.width &&
        y > this.statTooltipAreas[i]?.y &&
        y < this.statTooltipAreas[i]?.y + this.statTooltipAreas[i]?.height
      ) {
        tooltipVisible = true;
        statToDisplay = i;
        break;
      }
    }

    let hoveredSkill: SkillSlot | null = null;
    for (const slot of this.skillSlots) {
      const isActive = !!(
        (this.currentCreature?.isQuickDrawActive &&
          (slot.ability.id === "quick-draw-01" ||
            slot.ability.name?.toLowerCase().includes("quick draw"))) ||
        (this.battle &&
          this.battle.input_state === InputState.SELECT_ABILITY_TARGET &&
          this.battle.abilityToApply?.id === slot.ability.id)
      );
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
          if (
            typeof document !== "undefined" &&
            typeof (this.tooltipText as any).width === "number"
          ) {
            tipWidth = Math.min(
              650,
              Math.max(500, Math.ceil(158 + (this.tooltipText.width || 340) + 20))
            );
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredSkill.x + hoveredSkill.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(20, Math.min(tipX, this.panelWidth - tipWidth - 10));
        const tipY = -tipHeight - 8;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        this.tooltipIconSprite.texture = this.getTextureForIcon(
          hoveredSkill.iconPath || getSkillIconPath(hoveredSkill.ability)
        );
        this.tooltipIconSprite.width = 128;
        this.tooltipIconSprite.height = 128;
        this.tooltipIconSprite.position = {
          x: tipX + 14,
          y: tipY + Math.max(12, (tipHeight - 128) / 2),
        };

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
          if (
            typeof document !== "undefined" &&
            typeof (this.tooltipText as any).width === "number"
          ) {
            tipWidth = Math.min(
              650,
              Math.max(500, Math.ceil(158 + (this.tooltipText.width || 340) + 20))
            );
            tipHeight = Math.max(154, Math.ceil(this.tooltipText.height + 28));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;

        const slotCenterX = hoveredTrait.x + hoveredTrait.width / 2;
        let tipX = slotCenterX - tipWidth / 2;
        tipX = Math.max(20, Math.min(tipX, this.panelWidth - tipWidth - 10));
        const tipY = -tipHeight - 8;

        this.tooltipWindow.position = { x: tipX, y: tipY };

        // Left aligned 128x128 icon inside tooltip
        this.tooltipIconSprite.visible = true;
        const traitIcon =
          hoveredTrait.iconPath ||
          getTraitInfo(hoveredTrait.traitName, this.traitsConfig)?.icon ||
          "traits/icon_shield_block.png";
        this.tooltipIconSprite.texture = this.getTextureForIcon(traitIcon);
        this.tooltipIconSprite.width = 128;
        this.tooltipIconSprite.height = 128;
        this.tooltipIconSprite.position = {
          x: tipX + 14,
          y: tipY + Math.max(12, (tipHeight - 128) / 2),
        };

        // Shift text to the right to make room for icon
        this.tooltipText.position = { x: tipX + 158, y: tipY + 14 };
      }
    } else if (statToDisplay != -1) {
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
      this.tooltipText.style.wordWrapWidth = 430;
      this.tooltipText.text =
        this.statDescriptions[statToDisplay] +
        (this.statBuffDescriptions[statToDisplay]
          ? "\nBuffs: " + this.statBuffDescriptions[statToDisplay]
          : "");

      if (this.tooltipWindow) {
        const tipWidth = 420;
        let tipHeight = 90;
        try {
          if (
            typeof document !== "undefined" &&
            typeof (this.tooltipText as any).width === "number"
          ) {
            tipHeight = Math.max(80, Math.ceil(this.tooltipText.height + 24));
          }
        } catch {
          // headless test environment fallback
        }
        this.tooltipWindow.width = tipWidth;
        this.tooltipWindow.height = tipHeight;
        const statBox = this.statTooltipAreas[statToDisplay];
        const tipX = statBox
          ? Math.max(198, Math.min(statBox.x - 40, this.panelWidth - tipWidth - 20))
          : 260;
        this.tooltipWindow.position = { x: tipX, y: -tipHeight - 6 };
        this.tooltipText.position = { x: tipX + 20, y: -tipHeight + 6 };
      }
    } else {
      this.tooltipIconSprite.visible = false;
    }

    if (this.tooltipWindow) {
      this.tooltipWindow.visible = tooltipVisible;
      this.tooltipFrameGraphics.visible = tooltipVisible;
      this.tooltipText.visible = tooltipVisible;
      if (tooltipVisible) {
        this.tooltipFrameGraphics.clear();
        this.tooltipFrameGraphics
          .roundRect(
            this.tooltipWindow.x,
            this.tooltipWindow.y,
            this.tooltipWindow.width,
            this.tooltipWindow.height,
            5
          )
          .fill({ color: 0x141820, alpha: 0.94 })
          .stroke({ width: 2, color: 0xd4af37, alpha: 0.92 });
      } else {
        this.tooltipIconSprite.visible = false;
      }
      if (statToDisplay == 0) {
        statToDisplay = DisplayedStat.HP;
      }
    }
  }
}