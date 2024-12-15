import { Container, NineSliceSprite, Spritesheet, Text, TextOptions } from "pixi.js";
import { Creature, CreatureStats } from "./creature";

/**
 * Contains UI controls to show the unit stats during a battle.
 */
export class UnitStatsPanel {

  static DEFAULT_FONT_STYLE: TextOptions = { style: {fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' }};

  private window = new Container();

  private stats?: CreatureStats = undefined;
  private hpText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'HP: ' });
  private attackText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Attack: ' });
  private rangeText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Range: ' });
  private movementText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Movement: ' });
  private attacksText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Attacks: ' });
  private meleeDefenseText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Melee Defense: ' });
  private rangedDefenseText = new Text({ ...UnitStatsPanel.DEFAULT_FONT_STYLE, text: 'Ranged Defense: ' });

  public setCreature(creature: Creature) {
    this.stats = creature.stats;
  }

  public constructor(private view: Container, private uiSheet: Spritesheet) {

    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });

    windowBg.width = 240;
    windowBg.height = 320;

    const title = new Text({
      text: `Stats`,
      style: { fill: 0xffffff, fontSize: 24 },
    });

    title.anchor.set(0.5);
    title.x = windowBg.width / 2;
    title.y = 25;

    this.window.addChild(windowBg);
    this.window.addChild(title);
    this.window.x = 1250;
    this.window.y = 110;

    this.hpText.position = { x: 10, y: 50 };
    this.attackText.position = { x: 10, y: 80 };
    this.rangeText.position = { x: 10, y: 110 };
    this.movementText.position = { x: 10, y: 140 };
    this.attacksText.position = { x: 10, y: 170 };
    this.meleeDefenseText.position = { x: 10, y: 200 };
    this.rangedDefenseText.position = { x: 10, y: 230 };

    this.window.addChild(this.hpText);
    this.window.addChild(this.attackText);
    this.window.addChild(this.rangeText);
    this.window.addChild(this.movementText);
    this.window.addChild(this.attacksText);
    this.window.addChild(this.meleeDefenseText);
    this.window.addChild(this.rangedDefenseText);

    this.view.addChild(this.window);
  }

  public update() {
    this.hpText.text = `HP: ${this.stats?.health}/${this.stats?.max_health}`;
    this.attackText.text = `Attack: ${this.stats?.attack_low}-${this.stats?.attack_high}`;
    this.rangeText.text = `Range: ${this.stats?.range}`;
    this.movementText.text = `Movement: ${this.stats?.remaining_movement} / ${this.stats?.speed}`;
    this.attacksText.text = `Attacks: ${this.stats?.remaining_attacks} / ${this.stats?.num_attacks}`;
    this.meleeDefenseText.text = `Melee Defense: ${this.stats?.defense_melee}`;
    this.rangedDefenseText.text = `Ranged Defense: ${this.stats?.defense_ranged}`;
  }

  public toggleVisibility() {
    this.window.visible = !this.window.visible;
  }

  public hide() {
    this.window.visible = false;
  }




}