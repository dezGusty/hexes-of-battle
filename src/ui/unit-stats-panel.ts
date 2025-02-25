import { Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { Creature, CreatureStats } from "../battle/creature";
import { Coords } from "../shared";

/**
 * Contains UI controls to show the unit stats during a battle.
 */
export class UnitStatsPanel {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' } };

  private window = new Container();

  private stats?: CreatureStats = undefined;
  private creatureType: string = '';
  private unitTypeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Unit Type: ' });
  private hpText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'HP: ' });
  private attackMeleeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Attack (melee): ' });
  private attackRangedText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Attack (ranged): ' });
  private rangeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Range: ' });
  private movementText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Movement: ' });
  private attacksText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Attacks: ' });
  private meleeDefenseText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Melee Defense: ' });
  private rangedDefenseText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Ranged Defense: ' });
  private counterAttacksText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'CounterAttacks: ' });
  private staminaText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Stamina: ' });
  private ammoText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Ammo: ' });

  private tooltipText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Tooltip' });
  private tooltipWindow?: NineSliceSprite = undefined;
  private hpIcon?: Sprite = undefined;

  private bannerSprite?: Sprite = undefined;
  private bannerBg?: NineSliceSprite = undefined;
  private faceSprite?: Sprite = undefined;
  private faceBg?: NineSliceSprite = undefined;

  public setCreature(creature: Creature) {
    this.stats = creature.live_stats;
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
    windowBg.height = 150;

    const title = new Text({
      text: `Stats`,
      style: { fill: 0xffffff, fontSize: 24 },
    });

    title.anchor.set(0.5);
    title.position = { x: 200, y: 125};
    
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
    this.faceBg.position = { x: 5, y: 5 };
    this.window.addChild(this.faceBg);


    this.window.position = { x: 135, y: 1080 - 150 };


    this.unitTypeText.position = { x: 310, y: 10 };
    this.hpText.position = { x: 310, y: 40 };
    this.attackMeleeText.position = { x: 310, y: 70 };
    this.attackRangedText.position = { x: 310, y: 100 };
    this.rangeText.position = { x: 310, y: 130 };
    this.movementText.position = { x: 510, y: 10 };
    this.attacksText.position = { x: 510, y: 40 };
    this.meleeDefenseText.position = { x: 510, y: 70 };
    this.rangedDefenseText.position = { x: 510, y: 100 };
    this.counterAttacksText.position = { x: 510, y: 130 };
    this.staminaText.position = { x: 710, y: 10 };
    this.ammoText.position = { x: 710, y: 40 };

    this.window.addChild(this.unitTypeText);
    this.window.addChild(this.hpText);
    this.window.addChild(this.attackMeleeText);
    this.window.addChild(this.attackRangedText);
    this.window.addChild(this.rangeText);
    this.window.addChild(this.movementText);
    this.window.addChild(this.attacksText);
    this.window.addChild(this.meleeDefenseText);
    this.window.addChild(this.rangedDefenseText);
    this.window.addChild(this.counterAttacksText);
    this.window.addChild(this.staminaText);
    this.window.addChild(this.ammoText);

    this.hpIcon = new Sprite(this.uiSheet.textures['glyph_toggle_healthbars.png']);
    this.hpIcon.position = { x: 280, y: 80 };
    this.hpIcon.width = 48;
    this.hpIcon.height = 48;
    this.hpIcon.interactive = true;


    this.window.addChild(this.hpIcon);

    this.tooltipWindow = new NineSliceSprite({
      texture: this.uiSheet.textures['thin_panel_semitransparent.png'],
      leftWidth: 4,
      topHeight: 4,
      rightWidth: 4,
      bottomHeight: 4,
    });
    this.tooltipText.position = { x: 20, y: 20 };
    this.tooltipWindow.addChild(this.tooltipText);
    this.tooltipWindow.position = { x: 300, y: -5 - 80 };
    this.tooltipWindow.visible = false;
    this.tooltipWindow.width = 420;
    this.tooltipWindow.height = 80;
    this.window.addChild(this.tooltipWindow);


    this.view.addChild(this.window);
  }

  public update() {
    if (!this.stats) return;
    this.unitTypeText.text = `Unit: ${this.creatureType}`;
    this.hpText.text = `HP: ${this.stats?.remaining_health}/${this.stats?.health}`;
    this.attackMeleeText.text = `Attack (melee): ${this.stats?.attack_melee_low}-${this.stats?.attack_melee_high}`;
    if (this.stats.is_ranged) {
      this.attackRangedText.text = `Attack (ranged): ${this.stats?.attack_ranged_low}-${this.stats?.attack_ranged_high}`;
    } else {
      this.attackRangedText.text = `Attack (ranged): -`;
    }

    this.rangeText.text = `Range: ${this.stats?.range}`;
    this.movementText.text = `Movement: ${this.stats?.remaining_movement} / ${this.stats?.num_moves}`;
    this.attacksText.text = `Attacks: ${this.stats?.remaining_attacks} / ${this.stats?.num_attacks}`;
    this.meleeDefenseText.text = `Melee Defense: ${this.stats?.defense_melee}`;
    this.rangedDefenseText.text = `Ranged Defense: ${this.stats?.defense_ranged}`;
    this.counterAttacksText.text = `CounterAttacks: ${this.stats?.remaining_counterattacks} / ${this.stats?.num_counterattacks}`;
    this.staminaText.text = `Stamina: ${this.stats?.stamina}`;
    this.ammoText.text = `Ammo: ${this.stats?.remaining_ammo} / ${this.stats?.ammo}`;
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
    if (this.hpIcon
      && x > this.hpIcon?.x
      && x < this.hpIcon?.x + this.hpIcon?.width
      && y > this.hpIcon?.y
      && y < this.hpIcon?.y + this.hpIcon?.height) {
      this.tooltipText.text = 'Current hitpoints. Depicts overall health and\nbasic protective gear of unit.';
      if (this.tooltipWindow) this.tooltipWindow.visible = true;
    } else {
      if (this.tooltipWindow) this.tooltipWindow.visible = false;
    }
  }

}