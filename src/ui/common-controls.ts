import { ButtonOptions, FancyButton, Slider } from "@pixi/ui";
import { TextStyle, TextStyleOptions, Text, Container } from "pixi.js";

/**
 * A class to contain the UI elements that are common to all pages.
 * - Fullscreen mode toggle button
 * - Zoom in/out buttons
 */
export class CommonControls {

  private isFullScreen: boolean = false;

  public menuButton?: FancyButton;

  public fullscreenToggleButton?: FancyButton;
  public zoomInButton?: FancyButton;
  public zoomOutButton?: FancyButton;
  public zoomSlider?: Slider;
  public toggleCoordsButton?: FancyButton;
  public toggleGridButton?: FancyButton;
  public nextTurnButton?: FancyButton;
  public nextUnitButton?: FancyButton;
  public showHealthbarsButton?: FancyButton;
  public toggleStatsButton?: FancyButton;
  public togglePerfStatsButton?: FancyButton;
  public toggleMusicButton?: FancyButton;
  public resetButton?: FancyButton;

  public activeAbility1Button?: FancyButton;

  static DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 16, align: 'left' };
  private DEFAULT_BUTTON_STYLE: ButtonOptions = {


    defaultView: 'btn_simple.png',
    hoverView: 'btn_simple_hover.png',
    pressedView: 'btn_simple_click.png',
    nineSliceSprite: [7, 7, 7, 7]
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
    nineSliceSprite: [4, 4, 4, 4]
  };

  public constructor(public options: {
    zoomMin: number, zoomMax: number, zoomStep: number
  } = { zoomMin: 0, zoomMax: 100, zoomStep: 5 }

  ) {
  }

  public initializeButtons() {
    // Create the fullscreen toggle button reusing the DEFAULT_BUTTON_STYLE property
    this.fullscreenToggleButton = new FancyButton({
      ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_fullscreen.png'
    })
    this.fullscreenToggleButton.position.set(10, 40);

    this.zoomOutButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: 'glyph_minus.png' });
    this.zoomOutButton.position.set(1390, 30);
    this.zoomOutButton.width = 24;
    this.zoomOutButton.height = 24;

    this.zoomSlider = new Slider({
      // bg: 'progress_bg.png',
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
      value: 50,
      showValue: false
    });
    this.zoomSlider.position.set(1420, 30 + 6);
    this.zoomSlider.width = 144;
    this.zoomSlider.height = 12;

    this.zoomInButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: 'glyph_plus.png' });
    this.zoomInButton.position.set(1570, 30);
    this.zoomInButton.width = 24;
    this.zoomInButton.height = 24;

    this.toggleCoordsButton = new FancyButton({ ...this.THIN_BUTTON_STYLE, icon: 'glyph_xy.png' });
    this.toggleCoordsButton.position.set(10, 160);
    this.toggleCoordsButton.width = 48;
    this.toggleCoordsButton.height = 48;

    this.toggleGridButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_grid.png' });
    this.toggleGridButton.position.set(10, 210);

    this.showHealthbarsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_healthbars.png' });
    this.showHealthbarsButton.position.set(10, 260);

    this.toggleStatsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_stats.png' });
    this.toggleStatsButton.position.set(10, 310);

    this.togglePerfStatsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_perf_stats.png' });
    this.togglePerfStatsButton.position.set(10, 360);

    this.toggleMusicButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_music.png' });
    this.toggleMusicButton.position.set(10, 410);

    this.resetButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_reset.png' });
    this.resetButton.position.set(10, 460);

    this.activeAbility1Button = new FancyButton({ ...this.THIN_BUTTON_STYLE, icon: 'glyph_ability1.png' });
    this.activeAbility1Button.position.set(820, 810);
    this.activeAbility1Button.width = 130;
    this.activeAbility1Button.height = 48;

    this.nextUnitButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_next_unit.png' });
    this.nextUnitButton.position.set(10, 695);
    this.nextUnitButton.width = 130;
    this.nextUnitButton.height = 75;
    this.nextUnitButton.text = new Text({ ...CommonControls.DEFAULT_FONT_STYLE, text: '\n[N]ext Unit' });

    this.nextTurnButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_next_turn.png' });
    this.nextTurnButton.position.set(10, 790);
    this.nextTurnButton.width = 130;
    this.nextTurnButton.height = 75;
    this.nextTurnButton.text = new Text({ ...CommonControls.DEFAULT_FONT_STYLE, text: '\n[E]nd Turn' });
    
    this.menuButton = new FancyButton({ ...this.THIN_BUTTON_STYLE, icon: 'glyph_menu.png' });
    this.menuButton.position.set(4, 4);
    this.menuButton.width = 130;
    this.menuButton.height = 32;
    this.menuButton.text = new Text(
      { ...CommonControls.DEFAULT_FONT_STYLE, text: 'Menu', style: { fontSize: 16, fill: "#DDFFFF" } }
    );


    this.connectEventHandlers();
  }

  public getControls(): Container[] {
    let results = [];
    if (this.fullscreenToggleButton) results.push(this.fullscreenToggleButton);
    if (this.zoomSlider) results.push(this.zoomSlider);
    if (this.zoomInButton) results.push(this.zoomInButton);
    if (this.zoomOutButton) results.push(this.zoomOutButton);
    if (this.toggleCoordsButton) results.push(this.toggleCoordsButton);
    if (this.toggleGridButton) results.push(this.toggleGridButton);
    if (this.nextTurnButton) results.push(this.nextTurnButton);
    if (this.nextUnitButton) results.push(this.nextUnitButton);
    if (this.showHealthbarsButton) results.push(this.showHealthbarsButton);
    if (this.toggleStatsButton) results.push(this.toggleStatsButton);
    if (this.togglePerfStatsButton) results.push(this.togglePerfStatsButton);
    if (this.toggleMusicButton) results.push(this.toggleMusicButton);
    if (this.resetButton) results.push(this.resetButton);
    if (this.menuButton) results.push(this.menuButton);

    if (this.activeAbility1Button) results.push(this.activeAbility1Button);

    return results;
  }

  public connectEventHandlers() {
    this.fullscreenToggleButton?.onPress.connect(() => {
      if (this.isFullScreen) {
        this.exitFullscreen();
      }
      else {
        this.enterFullscreen();
      }
    });
  }


  private async enterFullscreen() {
    if (this.isFullScreen) return;

    const containingElement: HTMLElement | null = document.getElementById('game');
    if (!containingElement) {
      console.error('Failed to find the game container element');
      return;
    }
    await containingElement.requestFullscreen();
    console.log('Entered fullscreen mode');
    this.isFullScreen = true;
  }

  private async exitFullscreen() {
    console.log('Exiting fullscreen mode');
    if (!this.isFullScreen) return;

    await document.exitFullscreen();
    console.log('Exited fullscreen mode');
    this.isFullScreen = false;
  }
}