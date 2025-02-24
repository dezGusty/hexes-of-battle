import { ButtonOptions, FancyButton } from "@pixi/ui";
import { Container, NineSliceSprite, Spritesheet, Text, TextOptions } from "pixi.js";

export class BattleMenuPanel {
    static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 16, align: 'left' } };

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

    private isFullScreen: boolean = false;

    private window = new Container();

    public fullscreenToggleButton?: FancyButton;
    public toggleCoordsButton?: FancyButton;
    public toggleGridButton?: FancyButton;
    public showHealthbarsButton?: FancyButton;
    public toggleMusicButton?: FancyButton;

    private closeButton: FancyButton = new FancyButton({
        ...this.THIN_BUTTON_STYLE
    });


    public constructor(private view: Container, private uiSheet: Spritesheet) {

        const windowBg = new NineSliceSprite({
            texture: this.uiSheet.textures['panel.png'],
            leftWidth: 15,
            topHeight: 15,
            rightWidth: 15,
            bottomHeight: 15,
        });

        windowBg.width = 600;
        windowBg.height = 640;
        windowBg.alpha = 0.9;

        const title = new Text({
            text: `Battle Menu`,
            style: { fill: 0xffffff, fontSize: 24 },
        });

        title.anchor.set(0.5);
        title.x = windowBg.width / 2;
        title.y = 25;

        this.window.addChild(windowBg);
        this.window.addChild(title);
        this.window.position = { x: 350, y: 110 };

        let textObjs = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Toggle Full screen mode.\nUses the browser API.' }
        );
        textObjs.position = { x: 110, y: 60 };
        this.window.addChild(textObjs);

        textObjs = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Toggle coordinates display.' }
        );
        textObjs.position = { x: 110, y: 140 };
        this.window.addChild(textObjs);

        textObjs = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Toggle grid display.\nThe grid will be fairly visible anyway,\nso use this only for extra contrast.' }
        );
        textObjs.position = { x: 110, y: 200 };
        this.window.addChild(textObjs);

        textObjs = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Toggle healthbars display.' }
        );
        textObjs.position = { x: 110, y: 300 };
        this.window.addChild(textObjs);

        textObjs = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Toggle music on/off.' }
        );
        textObjs.position = { x: 110, y: 380 };
        this.window.addChild(textObjs);

        this.view.addChild(this.window);
        this.initializeButtons();
    }

    public initializeButtons() {
        // Create the fullscreen toggle button reusing the DEFAULT_BUTTON_STYLE property
        this.fullscreenToggleButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_fullscreen.png'
        })
        this.fullscreenToggleButton.position.set(20, 40);
        this.fullscreenToggleButton.width = 64;
        this.fullscreenToggleButton.height = 64;

        this.toggleCoordsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_xy.png' });
        this.toggleCoordsButton.position.set(20, 120);
        this.toggleCoordsButton.width = 64;
        this.toggleCoordsButton.height = 64;

        this.toggleGridButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_grid.png' });
        this.toggleGridButton.position.set(20, 200);
        this.toggleGridButton.width = 64;
        this.toggleGridButton.height = 64;

        this.showHealthbarsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_healthbars.png' });
        this.showHealthbarsButton.position.set(20, 280);
        this.showHealthbarsButton.width = 64;
        this.showHealthbarsButton.height = 64;

        this.toggleMusicButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_music.png' });
        this.toggleMusicButton.position.set(20, 360);
        this.toggleMusicButton.width = 64;
        this.toggleMusicButton.height = 64;

        this.closeButton.position.set(250, 590);
        this.closeButton.width = 130;
        this.closeButton.height = 32;
        this.closeButton.text = new Text(
            { ...BattleMenuPanel.DEFAULT_FONT_STYLE, text: 'Close', style: { fontSize: 16, fill: "#DDFFFF" } });

        this.window.addChild(this.fullscreenToggleButton);
        this.window.addChild(this.toggleCoordsButton);
        this.window.addChild(this.toggleGridButton);
        this.window.addChild(this.showHealthbarsButton);
        this.window.addChild(this.toggleMusicButton);

        this.window.addChild(this.closeButton);

        // this.window.interactive = true;

        this.connectEventHandlers();
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

        this.closeButton.onPress.connect(() => {
            this.hide();
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

    public toggleVisibility() {
        this.window.visible = !this.window.visible;
    }

    public show() {
        this.window.visible = true;
    }

    public hide() {
        this.window.visible = false;
    }

    public isVisible() {
        return this.window.visible;
    }
}