import { Container, TextOptions, Text, Texture, Sprite, Spritesheet, NineSliceSprite } from "pixi.js";
import { Coords } from "../shared";

export class TurnChangeDisplay {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#dddd77', alpha: 1 }, fontSize: 42, align: 'left' } };
  static DEFAULT_DURATION_IN_MILLIS: number = 750;

  private turnChangeText = new Text({ ...TurnChangeDisplay.DEFAULT_FONT_STYLE, text: this.message });
  private alpha: number = 1;
  private startingDurationInMillis: number = TurnChangeDisplay.DEFAULT_DURATION_IN_MILLIS;
  private bannerSprite?: Sprite = undefined;

  private window = new Container();

  public constructor(
    private message: string,
    private view: Container,
    public remainingDurationInMillis: number,
    coords: Coords,
    private uiSheet?: Spritesheet,
    private texture?: Texture
  ) {
    if (!this.uiSheet) {
      throw new Error('uiSheet is required');
    }

    this.startingDurationInMillis = remainingDurationInMillis;

    const windowBg = new NineSliceSprite({
      texture: this.uiSheet.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });
    windowBg.width = 400;
    windowBg.height = 120;
    this.window.addChild(windowBg);
    
    const bannerBg = new NineSliceSprite({
      texture: this.uiSheet.textures['progress_bg.png'],
      leftWidth: 5,
      topHeight: 5,
      rightWidth: 5,
      bottomHeight: 5
    });
    bannerBg.width = 128 + 10;
    bannerBg.height = 128 + 10;
    bannerBg.position = { x: (400 - 128) / 2 - 5, y: 80 - 5 };
    this.window.addChild(bannerBg);
    
    this.window.position = coords;

    if (this.texture) {
      this.bannerSprite = new Sprite(this.texture);
      this.bannerSprite.position = { x: (400 - 128) / 2, y: 80 };
      this.bannerSprite.width = 128;
      this.bannerSprite.height = 128;
      this.window.addChild(this.bannerSprite);
    }

    this.turnChangeText.position = { x: 20, y: 20 };
    this.turnChangeText.text = "" + message.toString();
    this.window.addChild(this.turnChangeText);
    this.view.addChild(this.window);
  }

  public update(delta: number) {
    if (delta == 0 || this.startingDurationInMillis == 0) {
      return;
    }

    if (this.remainingDurationInMillis < 0.5 * this.startingDurationInMillis) {
      this.alpha = this.remainingDurationInMillis * 2 / this.startingDurationInMillis;
      this.window.alpha = this.alpha;
    }

    this.remainingDurationInMillis -= delta;

    if (this.remainingDurationInMillis <= 0) {
      this.view.removeChild(this.window);
      this.window.destroy({ children: true });

      // this.turnChangeText.destroy();
      // if (this.bannerSprite) {
      //   this.view.removeChild(this.bannerSprite);
      //   this.bannerSprite.destroy();
      // }
    }
  }
}



export class TurnChangeCollection {
  private damageValues: TurnChangeDisplay[] = [];

  private uiSheet?: Spritesheet;

  public setUISheet(uiSheet: Spritesheet) {
    this.uiSheet = uiSheet;

  }

  public addTurnChange(message: string, view: Container, coords: Coords, texture?: Texture) {
    const damageValueDisplay = new TurnChangeDisplay(message, view, TurnChangeDisplay.DEFAULT_DURATION_IN_MILLIS, coords, this.uiSheet, texture);
    this.damageValues.push(damageValueDisplay);
  }

  public update(delta: number) {
    this.damageValues.forEach(damageValueDisplay => damageValueDisplay.update(delta));
    // remove all entries with remainingDuration <= 0
    this.damageValues = this.damageValues.filter(item => item.remainingDurationInMillis > 0);
  }
}