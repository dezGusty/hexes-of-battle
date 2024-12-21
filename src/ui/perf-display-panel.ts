import { Container, NineSliceSprite, Spritesheet, Text, TextOptions } from "pixi.js";

export class PerfInfo {
  static DEFAULT_COUNT = 100;
  static DEFAULT_MIN = 99999;
  static DEFAULT_MAX = -1;
  public data: number[] = [];
  last_start: number = -1;
  public min: number = PerfInfo.DEFAULT_MIN;
  public max: number = PerfInfo.DEFAULT_MAX;
  constructor() { }
}

export class PerfDisplayPanel {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 14, align: 'left' } };

  private detailsText = new Text({ ...PerfDisplayPanel.DEFAULT_FONT_STYLE, text: '' });
  private view?: Container;
  private uiSheet?: Spritesheet;
  private window = new Container();
  private windowBg?: NineSliceSprite;

  constructor() {

  }

  private records: Record<string, PerfInfo> = {};

  public startMeasure(category: string) {
    if (!this.records[category]) {
      this.records[category] = new PerfInfo();
    }

    this.records[category].last_start = window.performance.now();
  }

  public stopMeasure(category: string) {
    if (!this.records[category]) {
      return;
    }

    if (this.records[category].last_start === -1) {
      return;
    }

    // update with the difference
    this.records[category].data.push(
      window.performance.now() - this.records[category].last_start);
  }

  public update() {
    const keys = Object.keys(this.records);

    this.detailsText.text = '';
    for (let key of keys) {
      if (this.records[key].data.length > PerfInfo.DEFAULT_COUNT) {
        this.records[key].data.shift();
      }

      const average = this.records[key].data.reduce((a, b) => a + b, 0) / this.records[key].data.length;
      this.records[key].min = Math.min(this.records[key].min, this.records[key].data[this.records[key].data.length - 1]);
      this.records[key].max = Math.max(this.records[key].max, this.records[key].data[this.records[key].data.length - 1]);
      const recent_min: number = Math.min(...this.records[key].data);
      const recent_max: number = Math.max(...this.records[key].data);
      this.detailsText.text += `${key}: ${average.toFixed(3)} ms (abs min: ${this.records[key].min} ms, max: ${this.records[key].max} ms)\n`;
      this.detailsText.text += `       (recent min: ${recent_min} ms, max: ${recent_max} ms)\n`;

    }
  }

  public show(view: Container, uiSheet?: Spritesheet) {
    this.view = view;
    this.uiSheet = uiSheet;
    this.view.addChild(this.window);


    if (this.windowBg) {
      return;
    }

    if (!this.uiSheet) {
      return;
    }
    this.windowBg = new NineSliceSprite({
      texture: this.uiSheet?.textures['panel.png'],
      leftWidth: 15,
      topHeight: 15,
      rightWidth: 15,
      bottomHeight: 15,
    });

    this.windowBg.width = 350;
    this.windowBg.height = 150;

    const title = new Text({
      text: `Perf Stats`,
      style: { fill: 0xffffff, fontSize: 14 },
    });

    title.anchor.set(0.5);
    title.x = this.windowBg.width / 2;
    title.y = 10;

    this.window.addChild(this.windowBg);
    this.window.addChild(title);
    this.window.x = 1300;
    this.window.y = 710;

    this.detailsText.position = { x: 10, y: 30 };
    this.window.addChild(this.detailsText);
  }

  public hide() {
    this.view?.removeChild(this.window);
  }

  public toggleVisibility(view: Container, uiSheet?: Spritesheet) {
    if (this.window.parent) {
      this.hide();
    } else {
      this.show(view, uiSheet);
    }
  }
}