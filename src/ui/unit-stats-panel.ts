import { Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { Buff, Creature, CreatureStats } from "../battle/creature";
import { Coords } from "../shared";

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
  NUM_STATS = 11
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
    [DisplayedStat.AMMO]: 'glyph_ammo'
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
    [DisplayedStat.AMMO]: 'The number of ranged attacks the unit can\nmake before running out of ammo'
  };

  private statBuffDescriptions: Record<number, string> = {

  };

  private window = new Container();

  private stats?: CreatureStats = undefined;
  private buffs?: Buff[] = [];
  private creatureType: string = '';
  private unitTypeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Unit Type: ' });

  private tooltipText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Tooltip' });
  private tooltipWindow?: NineSliceSprite = undefined;

  private statIcons: Sprite[] = [];
  private statTooltipAreas: Container[] = [];
  private statValues: Text[] = [];

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public setCreature(creature: Creature) {
    this.stats = creature.live_stats;
    this.buffs = creature.buffs;
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


  public constructor(private view: Container, private uiSheet: Spritesheet) {

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

    this.tooltipWindow = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    // this.tooltipWindow.addChild(this.tooltipText);
    this.tooltipWindow.position = { x: 300, y: -2 - 90 };
    this.tooltipWindow.visible = false;
    this.tooltipWindow.width = 420;
    this.tooltipWindow.height = 90;

    this.tooltipText.position = { x: this.tooltipWindow.position.x + 20, y: this.tooltipWindow.position.y + 15 };

    this.window.addChild(this.tooltipWindow);
    this.window.addChild(this.tooltipText);


    this.view.addChild(this.window);
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
    return buffDescriptions;
  }

  public update() {
    if (!this.stats) return;

    this.unitTypeText.text = `Unit: ${this.creatureType}`;
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
    this.statValues[DisplayedStat.AMMO].text = `${this.stats?.remaining_ammo} / ${this.stats?.ammo}`;

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

  public hide() {
    this.window.visible = false;
  }

  public isVisible() {
    return this.window.visible;
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

    if (statToDisplay != -1) {
      this.tooltipText.text = this.statDescriptions[statToDisplay]
        + (this.statBuffDescriptions[statToDisplay] ? "\nBuffs: " + this.statBuffDescriptions[statToDisplay] : "");
    }

    if (this.tooltipWindow) {
      this.tooltipWindow.visible = tooltipVisible;
      this.tooltipText.visible = tooltipVisible;
      if (statToDisplay == 0) {
        statToDisplay = DisplayedStat.HP;
      }
    }

  }

}