import { ButtonOptions, FancyButton, Slider } from "@pixi/ui";
import { TextStyle, TextStyleOptions, Text, Container } from "pixi.js";

/**
 * Common tactical UI controls:
 * - Zoom in/out, Zoom slider
 * - Next unit, End turn, Rest action
 * - Toggle stats, Toggle perf stats, Reset
 * - Ability triggers
 */
export class CommonControls {
  public menuButton?: FancyButton;

  public zoomInButton?: FancyButton;
  public zoomOutButton?: FancyButton;
  public zoomSlider?: Slider;
  public altitudeUpButton?: FancyButton;
  public altitudeDownButton?: FancyButton;
  public nextTurnButton?: FancyButton;
  public nextUnitButton?: FancyButton;
  public restButton?: FancyButton;
  public resetButton?: FancyButton;

  public activeAbility1Button?: FancyButton;

  static DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 16, align: 'left' };
  private DEFAULT_BUTTON_STYLE: ButtonOptions = {
    defaultView: 'btn_simple.png',
    hoverView: 'btn_simple_hover.png',
    pressedView: 'btn_simple_click.png',
    nineSliceSprite: [7, 7, 7, 7],
  };

  private THIN_BUTTON_STYLE: ButtonOptions = {
    defaultView: 'thin_button_2_normal.png',
    hoverView: 'thin_button_2_hover.png',
    pressedView: 'thin_button_2_hover.png',
    nineSliceSprite: [4, 4, 4, 4],
    padding: 2,
  };


  private SMALL_BUTTON_STYLE: ButtonOptions = {
    defaultView: 'thin_button_2_normal.png',
    hoverView: 'thin_button_2_hover.png',
    pressedView: 'thin_button_2_hover.png',
    nineSliceSprite: [4, 4, 4, 4],
  };

  public constructor(
    public options: {
      zoomMin: number;
      zoomMax: number;
      zoomStep: number;
      zoomValue?: number;
    } = { zoomMin: 0, zoomMax: 100, zoomStep: 5 }
  ) { }

  public initializeButtons() {
    this.zoomOutButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: 'glyph_minus.png' });
    this.zoomOutButton.position.set(1390, 30);
    this.zoomOutButton.width = 24;
    this.zoomOutButton.height = 24;

    this.zoomSlider = new Slider({
      bg: 'thin_button_normal.png',
      fill: 'thin_button_normal.png',
      slider: 'thin_button_hover.png',
      nineSliceSprite: {
        bg: [4, 4, 4, 4],
        fill: [4, 4, 4, 4],
      },
      fillPaddings: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      min: this.options.zoomMin,
      max: this.options.zoomMax,
      step: this.options.zoomStep,
      value: this.options.zoomValue ?? 50,
      showValue: false,
    });
    this.zoomSlider.position.set(1420, 30 + 6);
    this.zoomSlider.width = 144;
    this.zoomSlider.height = 12;

    this.zoomInButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: 'glyph_plus.png' });
    this.zoomInButton.position.set(1570, 30);
    this.zoomInButton.width = 24;
    this.zoomInButton.height = 24;

    this.altitudeUpButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE });
    this.altitudeUpButton.position.set(1600, 30);
    this.altitudeUpButton.width = 24;
    this.altitudeUpButton.height = 24;
    this.altitudeUpButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: '▲',
      style: { fontSize: 12, fill: '#DDFFFF', align: 'center' },
    });

    this.altitudeDownButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE });
    this.altitudeDownButton.position.set(1630, 30);
    this.altitudeDownButton.width = 24;
    this.altitudeDownButton.height = 24;
    this.altitudeDownButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: '▼',
      style: { fontSize: 12, fill: '#DDFFFF', align: 'center' },
    });

    this.resetButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_reset.png' });
    this.resetButton.position.set(4, 460);

    this.activeAbility1Button = new FancyButton({ ...this.THIN_BUTTON_STYLE, icon: 'glyph_ability1.png' });
    this.activeAbility1Button.position.set(820, 810);
    this.activeAbility1Button.width = 130;
    this.activeAbility1Button.height = 48;

    this.restButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_stamina' });
    this.restButton.position.set(4, 600);
    this.restButton.width = 130;
    this.restButton.height = 75;
    this.restButton.text = new Text({ ...CommonControls.DEFAULT_FONT_STYLE, text: '\n[R]est (+5)' });

    this.nextUnitButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_next_unit.png' });
    this.nextUnitButton.position.set(4, 695);
    this.nextUnitButton.width = 130;
    this.nextUnitButton.height = 75;
    this.nextUnitButton.text = new Text({ ...CommonControls.DEFAULT_FONT_STYLE, text: '\nNext Unit\n[Tab]' });

    this.nextTurnButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_next_turn.png' });
    this.nextTurnButton.position.set(4, 790);
    this.nextTurnButton.width = 130;
    this.nextTurnButton.height = 95;
    this.nextTurnButton.text = new Text({ ...CommonControls.DEFAULT_FONT_STYLE, text: '\nEnd Turn\n[Enter]' });

    this.menuButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE });
    this.menuButton.position.set(4, 4);
    this.menuButton.width = 130;
    this.menuButton.height = 48;
    this.menuButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: 'Menu',
      style: { fontSize: 16, fill: '#DDFFFF' },
    });
  }

  public getControls(): Container[] {
    let results = [];
    if (this.zoomSlider) results.push(this.zoomSlider);
    if (this.zoomInButton) results.push(this.zoomInButton);
    if (this.zoomOutButton) results.push(this.zoomOutButton);
    if (this.altitudeUpButton) results.push(this.altitudeUpButton);
    if (this.altitudeDownButton) results.push(this.altitudeDownButton);
    if (this.restButton) results.push(this.restButton);
    if (this.nextTurnButton) results.push(this.nextTurnButton);
    if (this.nextUnitButton) results.push(this.nextUnitButton);
    if (this.resetButton) results.push(this.resetButton);
    if (this.menuButton) results.push(this.menuButton);
    if (this.activeAbility1Button) results.push(this.activeAbility1Button);

    return results;
  }
}