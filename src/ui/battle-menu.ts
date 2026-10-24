import { ButtonOptions, FancyButton, Slider } from "@pixi/ui";
import { Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { BattleSaveEntry, SaveManager } from "../battle/save-manager";
import { Battle } from "../battle";

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

    public window = new Container();
    private mainContainer = new Container();
    private saveDialogContainer = new Container();
    private loadDialogContainer = new Container();

    public fullscreenToggleButton?: FancyButton;
    public toggleCoordsButton?: FancyButton;
    public toggleGridButton?: FancyButton;
    public showHealthbarsButton?: FancyButton;
    public toggleFpsButton?: FancyButton;
    public toggleMusicButton?: FancyButton;
    public musicVolumeSlider?: Slider;
    public musicVolumeValueText?: Text;
    public toggleSoundButton?: FancyButton;
    public soundVolumeSlider?: Slider;
    public soundVolumeValueText?: Text;
    public toggleSceneInspectorButton?: FancyButton;
    public toggleStatsButton?: FancyButton;
    public saveButton?: FancyButton;
    public loadButton?: FancyButton;
    public toggleHardwareCursorButton?: FancyButton;
    public toggleDamageIndicatorsButton?: FancyButton;

    private hardwareCursorText?: Text;
    private isHardwareCursorHidden: boolean = false;

    private closeButton: FancyButton = new FancyButton({
        ...this.THIN_BUTTON_STYLE
    });

    // Save dialog controls
    private saveInputText?: Text;
    private currentSaveName: string = '';
    private saveStatusText?: Text;
    private boundSaveKeyHandler?: (e: KeyboardEvent) => void;
    private saveTimeoutId?: ReturnType<typeof setTimeout>;

    // Load dialog controls
    private loadEntriesContainer = new Container();
    private loadPageInfoText?: Text;
    private currentSavesList: BattleSaveEntry[] = [];
    private loadScrollIndex: number = 0;
    private readonly LOAD_PAGE_SIZE: number = 4;
    private boundLoadWheelHandler?: (e: WheelEvent) => void;

    public battle?: Battle;
    public onSaveBattle?: (name: string) => boolean;
    public onLoadSave?: (entry: BattleSaveEntry) => void;
    public onToggleSceneInspector?: () => void;
    public onToggleStats?: () => void;
    public onToggleFps?: (showFps: boolean) => void;
    public onToggleHardwareCursor?: (hide: boolean) => void;

    public constructor(private view: Container, private uiSheet: Spritesheet) {
        const windowBg = new NineSliceSprite({
            texture: this.uiSheet.textures['panel.png'],
            leftWidth: 15,
            topHeight: 15,
            rightWidth: 15,
            bottomHeight: 15,
        });

        windowBg.width = 920;
        windowBg.height = 640;
        windowBg.alpha = 0.95;

        this.window.addChild(windowBg);
        this.window.position = { x: (1920 - windowBg.width) / 2, y: (1080 - windowBg.height) / 2 };

        this.window.addChild(this.mainContainer);
        this.window.addChild(this.saveDialogContainer);
        this.window.addChild(this.loadDialogContainer);

        this.saveDialogContainer.visible = false;
        this.loadDialogContainer.visible = false;

        this.initializeMainContainer(windowBg.width);
        this.initializeSaveDialog(windowBg.width);
        this.initializeLoadDialog(windowBg.width);

        this.view.addChild(this.window);
    }

    private getHardwareCursorLabel(): string {
        const status = this.isHardwareCursorHidden ? '[✓ Checked]' : '[Unchecked]';
        return `Hide Hardware Cursor ${status}\nHide OS cursor while in game (F8)`;
    }

    public setHardwareCursorHidden(hidden: boolean): void {
        this.isHardwareCursorHidden = hidden;
        if (this.hardwareCursorText) {
            this.hardwareCursorText.text = this.getHardwareCursorLabel();
        }
    }

    public get hardwareCursorChecked(): boolean {
        return this.isHardwareCursorHidden;
    }

    public set hardwareCursorChecked(checked: boolean) {
        this.setHardwareCursorHidden(checked);
    }

    public setSoundValues(musicVolume: number, soundVolume: number): void {
        const mPercent = Math.max(0, Math.min(100, Math.round(musicVolume * 100)));
        const sPercent = Math.max(0, Math.min(100, Math.round(soundVolume * 100)));
        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.value = mPercent;
        }
        if (this.musicVolumeValueText) {
            this.musicVolumeValueText.text = `${mPercent}%`;
        }
        if (this.soundVolumeSlider) {
            this.soundVolumeSlider.value = sPercent;
        }
        if (this.soundVolumeValueText) {
            this.soundVolumeValueText.text = `${sPercent}%`;
        }
    }

    private initializeMainContainer(panelWidth: number): void {
        const title = new Text({
            text: `Battle Menu`,
            style: { fill: 0xffffff, fontSize: 24 },
        });
        title.anchor.set(0.5);
        title.x = panelWidth / 2;
        title.y = 25;
        this.mainContainer.addChild(title);

        const addMenuOption = (x: number, y: number, text: string): void => {
            const textObj = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text,
            });
            textObj.position = { x, y: y + 8 };
            this.mainContainer.addChild(textObj);
        };

        const col1BtnX = 35;
        const col1TextX = 115;
        const col2BtnX = 490;
        const col2TextX = 570;

        // Column 1 Options
        addMenuOption(col1TextX, 55, 'Toggle Full screen mode.\nUses the browser API.');
        addMenuOption(col1TextX, 130, 'Toggle coordinates display.');
        addMenuOption(col1TextX, 205, 'Toggle grid display.\nThe grid will be fairly visible anyway.');
        addMenuOption(col1TextX, 280, 'Toggle healthbars display.');
        addMenuOption(col1TextX, 355, 'Toggle 3D Scene Inspector.\n(Same effect as pressing F2)');
        addMenuOption(col1TextX, 430, 'Show FPS\nToggle frames per second counter.');
        addMenuOption(col1TextX, 505, 'Show damage indicators.\nFloating indicators on morale/HP/stamina change.');

        // Column 2 Options
        addMenuOption(col2TextX, 55, 'Toggle music on/off.');
        addMenuOption(col2TextX, 130, 'Toggle sound on/off.');
        addMenuOption(col2TextX, 205, 'Save Battle State\nSave snapshot to local storage.');
        addMenuOption(col2TextX, 280, 'Load Saved Battle\nSelect and restore a saved state.');
        addMenuOption(col2TextX, 355, 'Toggle Unit Stats display.\n(Same effect as pressing F4)');

        this.hardwareCursorText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: this.getHardwareCursorLabel(),
        });
        this.hardwareCursorText.position = { x: col2TextX, y: 430 + 8 };
        this.mainContainer.addChild(this.hardwareCursorText);

        // Column 1 Buttons
        this.fullscreenToggleButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_fullscreen.png',
        });
        this.fullscreenToggleButton.position.set(col1BtnX, 55);
        this.fullscreenToggleButton.width = 64;
        this.fullscreenToggleButton.height = 60;

        this.toggleCoordsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_xy.png' });
        this.toggleCoordsButton.position.set(col1BtnX, 130);
        this.toggleCoordsButton.width = 64;
        this.toggleCoordsButton.height = 60;

        this.toggleGridButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_grid.png' });
        this.toggleGridButton.position.set(col1BtnX, 205);
        this.toggleGridButton.width = 64;
        this.toggleGridButton.height = 60;

        this.showHealthbarsButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_healthbars.png' });
        this.showHealthbarsButton.position.set(col1BtnX, 280);
        this.showHealthbarsButton.width = 64;
        this.showHealthbarsButton.height = 60;

        this.toggleSceneInspectorButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_toggle_perf_stats.png',
        });
        this.toggleSceneInspectorButton.position.set(col1BtnX, 355);
        this.toggleSceneInspectorButton.width = 64;
        this.toggleSceneInspectorButton.height = 60;

        this.toggleFpsButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_toggle_perf_stats.png',
        });
        this.toggleFpsButton.position.set(col1BtnX, 430);
        this.toggleFpsButton.width = 64;
        this.toggleFpsButton.height = 60;

        this.toggleDamageIndicatorsButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: this.uiSheet.textures['glyph_hp'] ? 'glyph_hp' : 'glyph_plus.png',
        });
        this.toggleDamageIndicatorsButton.position.set(col1BtnX, 505);
        this.toggleDamageIndicatorsButton.width = 64;
        this.toggleDamageIndicatorsButton.height = 60;

        // Column 2 Buttons & Sliders
        this.toggleMusicButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_music.png' });
        this.toggleMusicButton.position.set(col2BtnX, 55);
        this.toggleMusicButton.width = 64;
        this.toggleMusicButton.height = 60;

        const sliderBg = this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'] || Texture.EMPTY;
        const sliderFill = this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'] || Texture.EMPTY;
        const sliderHandle = this.uiSheet.textures['thin_button_2_hover.png'] || this.uiSheet.textures['btn_simple.png'] || Texture.EMPTY;

        this.musicVolumeSlider = new Slider({
            bg: sliderBg,
            fill: sliderFill,
            slider: new Sprite(sliderHandle),
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
            min: 0,
            max: 100,
            step: 1,
            value: 15,
            showValue: false,
        });
        this.musicVolumeSlider.position.set(col2TextX, 55 + 34);
        this.musicVolumeSlider.width = 200;
        this.musicVolumeSlider.height = 14;

        this.musicVolumeValueText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '15%',
            style: { fontSize: 13, fill: '#AACCFF' },
        });
        this.musicVolumeValueText.position.set(col2TextX + 210, 55 + 31);

        this.musicVolumeSlider.onUpdate.connect((val) => {
            if (this.musicVolumeValueText) {
                this.musicVolumeValueText.text = `${Math.round(val)}%`;
            }
        });

        this.toggleSoundButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: 'glyph_toggle_music.png' });
        this.toggleSoundButton.position.set(col2BtnX, 130);
        this.toggleSoundButton.width = 64;
        this.toggleSoundButton.height = 60;

        this.soundVolumeSlider = new Slider({
            bg: sliderBg,
            fill: sliderFill,
            slider: new Sprite(sliderHandle),
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
            min: 0,
            max: 100,
            step: 1,
            value: 75,
            showValue: false,
        });
        this.soundVolumeSlider.position.set(col2TextX, 130 + 34);
        this.soundVolumeSlider.width = 200;
        this.soundVolumeSlider.height = 14;

        this.soundVolumeValueText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '75%',
            style: { fontSize: 13, fill: '#AACCFF' },
        });
        this.soundVolumeValueText.position.set(col2TextX + 210, 130 + 31);

        this.soundVolumeSlider.onUpdate.connect((val) => {
            if (this.soundVolumeValueText) {
                this.soundVolumeValueText.text = `${Math.round(val)}%`;
            }
        });

        this.saveButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_plus.png',
        });
        this.saveButton.position.set(col2BtnX, 205);
        this.saveButton.width = 64;
        this.saveButton.height = 60;

        this.loadButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_next_turn.png',
        });
        this.loadButton.position.set(col2BtnX, 280);
        this.loadButton.width = 64;
        this.loadButton.height = 60;

        this.toggleStatsButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'glyph_toggle_stats.png',
        });
        this.toggleStatsButton.position.set(col2BtnX, 355);
        this.toggleStatsButton.width = 64;
        this.toggleStatsButton.height = 60;

        this.toggleHardwareCursorButton = new FancyButton({
            ...this.DEFAULT_BUTTON_STYLE,
            icon: 'cursor_arrow.png',
        });
        this.toggleHardwareCursorButton.position.set(col2BtnX, 430);
        this.toggleHardwareCursorButton.width = 64;
        this.toggleHardwareCursorButton.height = 60;

        this.closeButton.position.set((panelWidth - 140) / 2, 580);
        this.closeButton.width = 140;
        this.closeButton.height = 36;
        this.closeButton.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Close',
            style: { fontSize: 16, fill: '#DDFFFF' },
        });

        this.mainContainer.addChild(this.fullscreenToggleButton);
        this.mainContainer.addChild(this.toggleCoordsButton);
        this.mainContainer.addChild(this.toggleGridButton);
        this.mainContainer.addChild(this.showHealthbarsButton);
        this.mainContainer.addChild(this.toggleSceneInspectorButton);
        this.mainContainer.addChild(this.toggleFpsButton);
        this.mainContainer.addChild(this.toggleDamageIndicatorsButton);
        this.mainContainer.addChild(this.toggleMusicButton);
        this.mainContainer.addChild(this.musicVolumeSlider);
        this.mainContainer.addChild(this.musicVolumeValueText);
        this.mainContainer.addChild(this.toggleSoundButton);
        this.mainContainer.addChild(this.soundVolumeSlider);
        this.mainContainer.addChild(this.soundVolumeValueText);
        this.mainContainer.addChild(this.saveButton);
        this.mainContainer.addChild(this.loadButton);
        this.mainContainer.addChild(this.toggleStatsButton);
        this.mainContainer.addChild(this.toggleHardwareCursorButton);
        this.mainContainer.addChild(this.closeButton);

        this.connectMainEventHandlers();
    }

    private initializeSaveDialog(panelWidth: number): void {
        const title = new Text({
            text: `Save Battle State`,
            style: { fill: 0xffffff, fontSize: 24 },
        });
        title.anchor.set(0.5);
        title.x = panelWidth / 2;
        title.y = 25;
        this.saveDialogContainer.addChild(title);

        const promptText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Enter a name for this save entry:',
            style: { fontSize: 16, fill: '#E0E8FF' },
        });
        promptText.position.set(60, 80);
        this.saveDialogContainer.addChild(promptText);

        const inputBg = new NineSliceSprite({
            texture: this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'],
            leftWidth: 6,
            topHeight: 6,
            rightWidth: 6,
            bottomHeight: 6,
        });
        inputBg.width = 800;
        inputBg.height = 46;
        inputBg.position.set(60, 115);
        inputBg.eventMode = 'static';
        inputBg.cursor = 'text';
        this.saveDialogContainer.addChild(inputBg);

        this.saveInputText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '',
            style: { fontSize: 16, fill: '#FFFF88' },
        });
        this.saveInputText.position.set(75, 127);
        this.saveDialogContainer.addChild(this.saveInputText);

        const helperText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '(Type on your keyboard to edit name. Press Enter to Save, Esc to Cancel)',
            style: { fontSize: 12, fill: '#88AACC' },
        });
        helperText.position.set(60, 175);
        this.saveDialogContainer.addChild(helperText);

        this.saveStatusText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '',
            style: { fontSize: 15, fill: '#66FF66' },
        });
        this.saveStatusText.position.set(60, 205);
        this.saveDialogContainer.addChild(this.saveStatusText);

        const confirmSaveBtn = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
        });
        confirmSaveBtn.position.set((panelWidth - 320) / 2, 255);
        confirmSaveBtn.width = 150;
        confirmSaveBtn.height = 40;
        confirmSaveBtn.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Save Game',
            style: { fontSize: 16, fill: '#CCFFCC' },
        });
        confirmSaveBtn.onPress.connect(() => this.executeSave());
        this.saveDialogContainer.addChild(confirmSaveBtn);

        const cancelSaveBtn = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
        });
        cancelSaveBtn.position.set((panelWidth - 320) / 2 + 170, 255);
        cancelSaveBtn.width = 150;
        cancelSaveBtn.height = 40;
        cancelSaveBtn.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Cancel',
            style: { fontSize: 16, fill: '#FFDDDD' },
        });
        cancelSaveBtn.onPress.connect(() => this.showMainMenu());
        this.saveDialogContainer.addChild(cancelSaveBtn);
    }

    private initializeLoadDialog(panelWidth: number): void {
        const title = new Text({
            text: `Load Saved Battle`,
            style: { fill: 0xffffff, fontSize: 24 },
        });
        title.anchor.set(0.5);
        title.x = panelWidth / 2;
        title.y = 25;
        this.loadDialogContainer.addChild(title);

        this.loadPageInfoText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Saved Battles:',
            style: { fontSize: 14, fill: '#AACCFF' },
        });
        this.loadPageInfoText.position.set(60, 65);
        this.loadDialogContainer.addChild(this.loadPageInfoText);

        // Scroll Up button
        const upBtn = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
        });
        upBtn.position.set(panelWidth - 165, 55);
        upBtn.width = 44;
        upBtn.height = 32;
        upBtn.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '▲',
            style: { fontSize: 16, fill: '#FFFFCC' },
        });
        upBtn.onPress.connect(() => {
            if (this.loadScrollIndex > 0) {
                this.loadScrollIndex--;
                this.renderLoadEntries();
            }
        });
        this.loadDialogContainer.addChild(upBtn);

        // Scroll Down button
        const downBtn = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
        });
        downBtn.position.set(panelWidth - 110, 55);
        downBtn.width = 44;
        downBtn.height = 32;
        downBtn.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '▼',
            style: { fontSize: 16, fill: '#FFFFCC' },
        });
        downBtn.onPress.connect(() => {
            if (this.loadScrollIndex + this.LOAD_PAGE_SIZE < this.currentSavesList.length) {
                this.loadScrollIndex++;
                this.renderLoadEntries();
            }
        });
        this.loadDialogContainer.addChild(downBtn);

        this.loadEntriesContainer.position.set(60, 95);
        this.loadDialogContainer.addChild(this.loadEntriesContainer);

        const backBtn = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
        });
        backBtn.position.set((panelWidth - 150) / 2, 420);
        backBtn.width = 150;
        backBtn.height = 36;
        backBtn.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Back to Menu',
            style: { fontSize: 16, fill: '#DDFFFF' },
        });
        backBtn.onPress.connect(() => this.showMainMenu());
        this.loadDialogContainer.addChild(backBtn);
    }

    private connectMainEventHandlers(): void {
        this.fullscreenToggleButton?.onPress.connect(() => {
            if (this.isFullScreen) {
                this.exitFullscreen();
            } else {
                this.enterFullscreen();
            }
        });

        this.toggleSceneInspectorButton?.onPress.connect(() => {
            if (this.onToggleSceneInspector) {
                this.onToggleSceneInspector();
            }
        });

        this.toggleFpsButton?.onPress.connect(() => {
            if (this.onToggleFps) {
                this.onToggleFps(true);
            }
        });

        this.toggleStatsButton?.onPress.connect(() => {
            if (this.onToggleStats) {
                this.onToggleStats();
            }
        });

        this.toggleHardwareCursorButton?.onPress.connect(() => {
            this.isHardwareCursorHidden = !this.isHardwareCursorHidden;
            this.setHardwareCursorHidden(this.isHardwareCursorHidden);
            if (this.onToggleHardwareCursor) {
                this.onToggleHardwareCursor(this.isHardwareCursorHidden);
            }
        });

        this.saveButton?.onPress.connect(() => {
            this.showSaveDialog();
        });

        this.loadButton?.onPress.connect(() => {
            this.showLoadDialog();
        });

        this.closeButton.onPress.connect(() => {
            this.hide();
        });
    }

    public showMainMenu(): void {
        this.detachKeyListeners();
        if (this.saveTimeoutId) {
            clearTimeout(this.saveTimeoutId);
            this.saveTimeoutId = undefined;
        }
        this.saveDialogContainer.visible = false;
        this.loadDialogContainer.visible = false;
        this.mainContainer.visible = true;
    }

    public showSaveDialog(): void {
        this.mainContainer.visible = false;
        this.loadDialogContainer.visible = false;
        this.saveDialogContainer.visible = true;

        this.currentSaveName = SaveManager.getDefaultSaveName();
        if (this.saveInputText) {
            this.saveInputText.text = this.currentSaveName;
        }
        if (this.saveStatusText) {
            this.saveStatusText.text = '';
        }

        this.attachSaveKeyListeners();
    }

    public showLoadDialog(): void {
        this.mainContainer.visible = false;
        this.saveDialogContainer.visible = false;
        this.loadDialogContainer.visible = true;

        this.loadScrollIndex = 0;
        this.refreshSavesList();
        this.attachLoadWheelListener();
    }

    private refreshSavesList(): void {
        this.currentSavesList = SaveManager.listSaves();
        if (this.loadScrollIndex >= this.currentSavesList.length) {
            this.loadScrollIndex = Math.max(0, this.currentSavesList.length - this.LOAD_PAGE_SIZE);
        }
        this.renderLoadEntries();
    }

    private renderLoadEntries(): void {
        this.loadEntriesContainer.removeChildren();

        const total = this.currentSavesList.length;
        if (total === 0) {
            if (this.loadPageInfoText) {
                this.loadPageInfoText.text = 'No saved battles found in local storage.';
            }
            const emptyText = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: 'There are currently no saved games.\nUse the "Save Battle" option to store your progress.',
                style: { fontSize: 16, fill: '#8899AA' },
            });
            emptyText.position.set(20, 60);
            this.loadEntriesContainer.addChild(emptyText);
            return;
        }

        const start = this.loadScrollIndex;
        const end = Math.min(start + this.LOAD_PAGE_SIZE, total);
        if (this.loadPageInfoText) {
            this.loadPageInfoText.text = `Saved Battles (${start + 1}-${end} of ${total}) • Scroll or use ▲ ▼:`;
        }

        const visibleEntries = this.currentSavesList.slice(start, end);

        visibleEntries.forEach((entry, idx) => {
            const itemContainer = new Container();
            itemContainer.position.set(0, idx * 76);

            const rowBg = new NineSliceSprite({
                texture: this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'],
                leftWidth: 6,
                topHeight: 6,
                rightWidth: 6,
                bottomHeight: 6,
            });
            rowBg.width = 800;
            rowBg.height = 70;
            rowBg.alpha = 0.85;
            itemContainer.addChild(rowBg);

            const nameText = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: entry.name.length > 45 ? `${entry.name.substring(0, 42)}...` : entry.name,
                style: { fontSize: 15, fill: '#FFFFFF', fontWeight: 'bold' },
            });
            nameText.position.set(16, 8);
            itemContainer.addChild(nameText);

            const turnInfo = `Turn ${entry.turnNumber + 1} • Turn: Army ${entry.currentArmyIndex === 0 ? '0 (Player)' : '1 (AI)'} • Squads: ${entry.army0UnitsAlive} vs ${entry.army1UnitsAlive}`;
            const detailsText = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: `${turnInfo}\n${entry.dateFormatted}`,
                style: { fontSize: 11, fill: '#88CCFF' },
            });
            detailsText.position.set(16, 30);
            itemContainer.addChild(detailsText);

            // Load button
            const loadBtn = new FancyButton({
                ...this.THIN_BUTTON_STYLE,
            });
            loadBtn.position.set(655, 17);
            loadBtn.width = 62;
            loadBtn.height = 36;
            loadBtn.text = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: 'Load',
                style: { fontSize: 14, fill: '#DDFFFF' },
            });
            loadBtn.onPress.connect(() => {
                this.executeLoad(entry);
            });
            itemContainer.addChild(loadBtn);

            // Delete button
            const delBtn = new FancyButton({
                ...this.THIN_BUTTON_STYLE,
            });
            delBtn.position.set(725, 17);
            delBtn.width = 54;
            delBtn.height = 36;
            delBtn.text = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: 'Del',
                style: { fontSize: 14, fill: '#FFAAAA' },
            });
            delBtn.onPress.connect(() => {
                SaveManager.deleteSave(entry.id);
                this.refreshSavesList();
            });
            itemContainer.addChild(delBtn);

            this.loadEntriesContainer.addChild(itemContainer);
        });
    }

    private executeSave(): void {
        const nameToSave = this.currentSaveName.trim().length > 0 ? this.currentSaveName.trim() : SaveManager.getDefaultSaveName();
        if (this.saveTimeoutId) {
            clearTimeout(this.saveTimeoutId);
            this.saveTimeoutId = undefined;
        }

        if (this.onSaveBattle) {
            const ok = this.onSaveBattle(nameToSave);
            if (ok) {
                if (this.saveStatusText) {
                    this.saveStatusText.text = `✓ "${nameToSave}" saved successfully!`;
                    this.saveStatusText.style.fill = '#66FF66';
                }
                this.saveTimeoutId = setTimeout(() => this.showMainMenu(), 800);
            }
        } else if (this.battle) {
            SaveManager.saveBattle(this.battle, nameToSave);
            if (this.saveStatusText) {
                this.saveStatusText.text = `✓ "${nameToSave}" saved successfully!`;
                this.saveStatusText.style.fill = '#66FF66';
            }
            this.saveTimeoutId = setTimeout(() => this.showMainMenu(), 800);
        }
    }

    private executeLoad(entry: BattleSaveEntry): void {
        if (this.onLoadSave) {
            this.onLoadSave(entry);
        } else if (this.battle) {
            SaveManager.loadBattle(entry, this.battle);
        }
        this.hide();
    }

    private attachSaveKeyListeners(): void {
        this.detachKeyListeners();

        this.boundSaveKeyHandler = (e: KeyboardEvent) => {
            if (!this.saveDialogContainer.visible || !this.isVisible()) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                this.showMainMenu();
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeSave();
                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.currentSaveName = this.currentSaveName.slice(0, -1);
                if (this.saveInputText) {
                    this.saveInputText.text = this.currentSaveName;
                }
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (this.currentSaveName.length < 45) {
                    this.currentSaveName += e.key;
                    if (this.saveInputText) {
                        this.saveInputText.text = this.currentSaveName;
                    }
                }
            }
        };

        window.addEventListener('keydown', this.boundSaveKeyHandler);
    }

    private attachLoadWheelListener(): void {
        this.detachKeyListeners();

        this.boundLoadWheelHandler = (e: WheelEvent) => {
            if (!this.loadDialogContainer.visible || !this.isVisible()) return;
            e.preventDefault();

            if (e.deltaY > 0) {
                // Scroll down
                if (this.loadScrollIndex + this.LOAD_PAGE_SIZE < this.currentSavesList.length) {
                    this.loadScrollIndex++;
                    this.renderLoadEntries();
                }
            } else if (e.deltaY < 0) {
                // Scroll up
                if (this.loadScrollIndex > 0) {
                    this.loadScrollIndex--;
                    this.renderLoadEntries();
                }
            }
        };

        window.addEventListener('wheel', this.boundLoadWheelHandler, { passive: false });
    }

    private detachKeyListeners(): void {
        if (this.boundSaveKeyHandler) {
            window.removeEventListener('keydown', this.boundSaveKeyHandler);
            this.boundSaveKeyHandler = undefined;
        }
        if (this.boundLoadWheelHandler) {
            window.removeEventListener('wheel', this.boundLoadWheelHandler);
            this.boundLoadWheelHandler = undefined;
        }
    }

    private async enterFullscreen() {
        if (this.isFullScreen) return;

        const containingElement: HTMLElement | null = document.getElementById('game');
        if (!containingElement) {
            console.error('Failed to find the game container element');
            return;
        }
        await containingElement.requestFullscreen();
        this.isFullScreen = true;
    }

    private async exitFullscreen() {
        if (!this.isFullScreen) return;

        await document.exitFullscreen();
        this.isFullScreen = false;
    }

    public toggleVisibility() {
        if (this.window.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    public show() {
        this.showMainMenu();
        this.window.visible = true;
    }

    public hide() {
        this.detachKeyListeners();
        if (this.saveTimeoutId) {
            clearTimeout(this.saveTimeoutId);
            this.saveTimeoutId = undefined;
        }
        this.window.visible = false;
    }

    public isVisible() {
        return this.window.visible;
    }

    public destroy(): void {
        this.detachKeyListeners();
        if (this.saveTimeoutId) {
            clearTimeout(this.saveTimeoutId);
            this.saveTimeoutId = undefined;
        }
        this.window.destroy({ children: true });
    }
}