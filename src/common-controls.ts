import { FancyButton } from "@pixi/ui";
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
  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };

  public initializeButtons() {
    this.fullscreenToggleButton = new FancyButton({
      defaultView: 'btn_simple.png',
      hoverView: 'btn_simple_hover.png',
      pressedView: 'btn_simple_click.png',
      icon: 'glyph_fullscreen.png',
      // text: new BitmapText({
      //   text: 'Start', style: this.DEFAULT_FONT_STYLE,
      // }),
      nineSliceSprite: [7, 7, 7, 7]
    });

    this.fullscreenToggleButton.position.set(10, 10);

    this.zoomInButton = new FancyButton({
      defaultView: 'btn_simple.png',
      hoverView: 'btn_simple_hover.png',
      pressedView: 'btn_simple_click.png',
      nineSliceSprite: [7, 7, 7, 7]
    });

    this.zoomInButton.position.set(10, 60);

    this.zoomOutButton = new FancyButton({
      defaultView: 'btn_simple.png',
      hoverView: 'btn_simple_hover.png',
      pressedView: 'btn_simple_click.png',
      nineSliceSprite: [7, 7, 7, 7]
    });

    this.zoomOutButton.position.set(10, 110);

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