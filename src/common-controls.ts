import { ButtonOptions, FancyButton } from "@pixi/ui";
import { BitmapText, TextStyle, TextStyleOptions } from "pixi.js";

/**
 * A class to contain the UI elements that are common to all pages.
 * - Fullscreen mode toggle button
 * - Zoom in/out buttons
 */
export class CommonControls {

  private isFullScreen: boolean = false;

  public fullscreenToggleButton: FancyButton;
  public zoomInButton: FancyButton;
  public zoomOutButton: FancyButton;
  public toggleCoordsButton: FancyButton;
  public toggleGridButton: FancyButton;
  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };
  private DEFAULT_BUTTON_STYLE: ButtonOptions = {
    defaultView: 'btn_simple.png',
    hoverView: 'btn_simple_hover.png',
    pressedView: 'btn_simple_click.png',
    nineSliceSprite: [7, 7, 7, 7]
  };

  public initializeButtons() {

    // Create the fullscreen toggle button reusing the DEFAULT_BUTTON_STYLE property
    this.fullscreenToggleButton = new FancyButton({
      ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_fullscreen.png'
    })
    this.fullscreenToggleButton.position.set(10, 10);

    this.zoomInButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_plus.png' });
    this.zoomInButton.position.set(10, 60);

    this.zoomOutButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_minus.png' });
    this.zoomOutButton.position.set(10, 110);

    this.toggleCoordsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_xy.png' });
    this.toggleCoordsButton.position.set(10, 160);

    this.toggleGridButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_grid.png' });
    this.toggleGridButton.position.set(10, 210);

    this.connectEventHandlers();

  }

  public connectEventHandlers() {
    this.fullscreenToggleButton.onPress.connect(() => {
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