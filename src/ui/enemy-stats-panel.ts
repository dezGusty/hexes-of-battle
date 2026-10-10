import { Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { Buff, Creature, CreatureStats } from "../battle/creature";
import { Coords } from "../shared";
import { DisplayedStat } from "./unit-stats-panel";

/**
 * Secondary compact stats display panel for enemy units.
 * Features a ~75% scaled compact layout with enemy styling,
 * displaying the full suite of 11 stats, portrait, banner, and buff tooltips.
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
    [DisplayedStat.STAMINA]: "The unit's energy to perform physical activities such as\nmoving and attacking.",
    [DisplayedStat.AMMO]: 'The number of ranged attacks the unit can\nmake before running out of ammo',
  };

  private statBuffDescriptions: Record<number, string> = {};

  public readonly window = new Container();

  private stats?: CreatureStats = undefined;
  private buffs?: Buff[] = [];
  private creatureType: string = '';
  private unitTypeText = new Text({ ...EnemyStatsPanel.TITLE_FONT_STYLE, text: 'Enemy: Unknown' });

  private tooltipText = new Text({ ...EnemyStatsPanel.DEFAULT_FONT_STYLE, text: 'Tooltip' });
  private tooltipWindow?: NineSliceSprite = undefined;

  private statIcons: Sprite[] = [];
  private statTooltipAreas: Container[] = [];
  private statValues: Text[] = [];

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public readonly panelWidth: number = 630;
  public readonly panelHeight: number = 84;

  public constructor(private view: Container, private uiSheet: Spritesheet) {
    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });

    windowBg.width = this.panelWidth;
    windowBg.height = this.panelHeight;
    this.window.addChild(windowBg);

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

    this.tooltipText.position = { x: this.tooltipWindow.position.x + 10, y: this.tooltipWindow.position.y + 8 };
    this.tooltipText.visible = false;

    this.window.addChild(this.tooltipWindow);
    this.window.addChild(this.tooltipText);

    this.view.addChild(this.window);
    this.hide();
  }

  public setCreature(creature: Creature): void {
    this.stats = creature.live_stats;
    this.buffs = creature.buffs;
    this.creatureType = Creature.CREATURE_NAMES[creature.creatureType] || 'Unknown';
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

    return buffDescriptions;
  }

  public update(): void {
    if (!this.stats) return;

    this.unitTypeText.text = `Enemy: ${this.creatureType}`;
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
    this.statValues[DisplayedStat.AMMO].text = `${this.stats.remaining_ammo}/${this.stats.ammo}`;

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

    if (statToDisplay !== -1) {
      this.tooltipText.text =
        this.statDescriptions[statToDisplay] +
        (this.statBuffDescriptions[statToDisplay] ? '\nBuffs: ' + this.statBuffDescriptions[statToDisplay] : '');
    }

    if (this.tooltipWindow) {
      this.tooltipWindow.visible = tooltipVisible;
      this.tooltipText.visible = tooltipVisible;
    }
  }
}
