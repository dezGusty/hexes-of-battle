import { TextOptions, Container, Sprite, Texture, Text, Spritesheet, NineSliceSprite } from "pixi.js";

export class TopSidePanel {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' } };
  static RIGHT_ALIGN_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' } };
  static DEFAULT_BANNER_SIZE: number = 40;
  static DEFAULT_BORDER_SIZE: number = 4;

  private window = new Container();
  private bannerLeft?: Sprite = undefined;
  private bannerRight?: Sprite = undefined;
  private bannerLeftBg?: NineSliceSprite = undefined;
  private bannerRightBg?: NineSliceSprite = undefined;

  setActiveArmyIndex(index: number) {
    if (index === 0) {
      if (this.bannerLeftBg) {
        this.bannerLeftBg.tint = 0x00ff00;
      }
      if (this.bannerRightBg) {
        this.bannerRightBg.tint = 0xffffff;
      }
      if (this.bannerRight) {
        this.bannerRight.alpha = 0.5;
      } 
      if (this.bannerLeft) {
        this.bannerLeft.alpha = 1;
      }
    } else {
      if (this.bannerLeftBg) {
        this.bannerLeftBg.tint = 0xffffff;
      }
      if (this.bannerRightBg) {
        this.bannerRightBg.tint = 0x00ff00;
      }
      if (this.bannerRight) {
        this.bannerRight.alpha = 1;
      }
      if (this.bannerLeft) {
        this.bannerLeft.alpha = 0.5;
      }
    }
  }

  setLeftBannerTexture(texture: Texture | undefined) {
    if (this.bannerLeft) {
      this.window.removeChild(this.bannerLeft);
      this.bannerLeft.destroy();
      this.bannerLeft = undefined;
    }

    if (texture) {
      this.bannerLeft = new Sprite(texture);
      this.bannerLeft.position = { x: TopSidePanel.DEFAULT_BORDER_SIZE, y: TopSidePanel.DEFAULT_BORDER_SIZE };
      if (this.bannerLeftBg) {
        this.bannerLeft.x += this.bannerLeftBg.x;
        this.bannerLeft.y += this.bannerLeftBg.y;
      }
      this.bannerLeft.width = TopSidePanel.DEFAULT_BANNER_SIZE;
      this.bannerLeft.height = TopSidePanel.DEFAULT_BANNER_SIZE;
      this.window.addChild(this.bannerLeft);
    }
  }

  setLeftArmyName(name: string) {
    const armyNameText = new Text({ ...TopSidePanel.DEFAULT_FONT_STYLE, text: name });
    armyNameText.position = { x: 32 + TopSidePanel.DEFAULT_BANNER_SIZE, y: 8 };
    this.window.addChild(armyNameText);
  }

  setRightArmyName(name: string) {
    const armyNameText = new Text({ ...TopSidePanel.RIGHT_ALIGN_FONT_STYLE, text: name });

    armyNameText.position = { x: 1200 - 2 * 32 - 20 - armyNameText.width, y: 8 };
    this.window.addChild(armyNameText);
  }

  setRightBannerTexture(texture: Texture | undefined) {
    if (this.bannerRight) {
      this.window.removeChild(this.bannerRight);
      this.bannerRight.destroy();
      this.bannerRight = undefined;
    }

    if (texture) {
      this.bannerRight = new Sprite(texture);
      this.bannerRight.position = { x: TopSidePanel.DEFAULT_BORDER_SIZE, y: TopSidePanel.DEFAULT_BORDER_SIZE };
      if (this.bannerRightBg) {
        this.bannerRight.x += this.bannerRightBg.x;
        this.bannerRight.y += this.bannerRightBg.y;
      }
      this.bannerRight.width = TopSidePanel.DEFAULT_BANNER_SIZE;
      this.bannerRight.height = TopSidePanel.DEFAULT_BANNER_SIZE;
      this.window.addChild(this.bannerRight);
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
    windowBg.height = TopSidePanel.DEFAULT_BANNER_SIZE - 5;
    this.window.addChild(windowBg);

    this.bannerLeftBg = new NineSliceSprite({
      texture: this.uiSheet.textures['progress_bg.png'],
      leftWidth: TopSidePanel.DEFAULT_BORDER_SIZE,
      topHeight: TopSidePanel.DEFAULT_BORDER_SIZE,
      rightWidth: TopSidePanel.DEFAULT_BORDER_SIZE,
      bottomHeight: TopSidePanel.DEFAULT_BORDER_SIZE
    });

    this.bannerLeftBg.width = TopSidePanel.DEFAULT_BANNER_SIZE + 2 * TopSidePanel.DEFAULT_BORDER_SIZE;
    this.bannerLeftBg.height = TopSidePanel.DEFAULT_BANNER_SIZE + 2 * TopSidePanel.DEFAULT_BORDER_SIZE;
    this.bannerLeftBg.position = {
      x: 20 - TopSidePanel.DEFAULT_BORDER_SIZE,
      y: 0
    };
    this.window.addChild(this.bannerLeftBg);

    this.bannerRightBg = new NineSliceSprite({
      texture: this.uiSheet.textures['progress_bg.png'],
      leftWidth: TopSidePanel.DEFAULT_BORDER_SIZE,
      topHeight: TopSidePanel.DEFAULT_BORDER_SIZE,
      rightWidth: TopSidePanel.DEFAULT_BORDER_SIZE,
      bottomHeight: TopSidePanel.DEFAULT_BORDER_SIZE
    });

    this.bannerRightBg.width = TopSidePanel.DEFAULT_BANNER_SIZE + 2 * TopSidePanel.DEFAULT_BORDER_SIZE;
    this.bannerRightBg.height = TopSidePanel.DEFAULT_BANNER_SIZE + 2 * TopSidePanel.DEFAULT_BORDER_SIZE;
    this.bannerRightBg.position = {
      x: 1200 - 20 - TopSidePanel.DEFAULT_BANNER_SIZE - 2 * TopSidePanel.DEFAULT_BORDER_SIZE,
      y: 0
    };
    this.window.addChild(this.bannerRightBg);

    this.window.position = { x: 200, y: -5 };

    this.view.addChild(this.window);
  }
}