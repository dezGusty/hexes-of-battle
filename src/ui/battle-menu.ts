import { ButtonOptions, FancyButton, Slider } from "@pixi/ui";
import { Container, NineSliceSprite, Sprite, Spritesheet, Text, TextOptions, Texture } from "pixi.js";
import { BattleSaveEntry, SaveManager } from "../battle/save-manager";
import { Battle } from "../battle";
import {
    clampAnimationSpeed,
    DEFAULT_ANIMATION_SPEED,
    MAX_ANIMATION_SPEED,
    MIN_ANIMATION_SPEED,
} from "../battle/settings";
import { bindButtonUISound, bindSliderUISound } from "../battle/ui-sounds";
import { WeatherDropdown, WeatherType } from "./weather-dropdown";

export type BattleMenuTab = 'general' | 'graphics' | 'audio' | 'debug';

export class BattleMenuPanel {
    static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ffffff', alpha: 1 }, fontSize: 22, align: 'left' } };
    static SUB_FONT_STYLE: TextOptions = { style: { fill: { color: '#B8CDE0', alpha: 1 }, fontSize: 17, align: 'left' } };

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

    public activeTab: BattleMenuTab = 'general';
    public tabButtons: Partial<Record<BattleMenuTab, FancyButton>> = {};
    public tabContainers: Record<BattleMenuTab, Container> = {
        general: new Container(),
        graphics: new Container(),
        audio: new Container(),
        debug: new Container(),
    };
    private tabTexts: Partial<Record<BattleMenuTab, Text>> = {};

    public fullscreenToggleButton?: FancyButton;
    public toggleCoordsButton?: FancyButton;
    public toggleGridButton?: FancyButton;
    public showHealthbarsButton?: FancyButton;
    public toggleFpsButton?: FancyButton;
    public musicIcon?: Sprite;
    public musicLabel?: Text;
    public musicVolumeSlider?: Slider;
    public musicVolumeValueText?: Text;
    public soundIcon?: Sprite;
    public soundLabel?: Text;
    public soundVolumeSlider?: Slider;
    public soundVolumeValueText?: Text;
    public toggleSceneInspectorButton?: FancyButton;
    public toggleStatsButton?: FancyButton;
    public saveButton?: FancyButton;
    public loadButton?: FancyButton;
    public toggleHardwareCursorButton?: FancyButton;
    public toggleDamageIndicatorsButton?: FancyButton;
    public animationSpeedButton?: FancyButton;
    public animationSpeedSlider?: Slider;
    public animationSpeedValueText?: Text;
    public weatherButton?: FancyButton;
    public weatherDropdown?: WeatherDropdown;
    public toggleRimLightingButton?: FancyButton;
    public toggleTiltShiftButton?: FancyButton;
    public toggleSimpleTreesButton?: FancyButton;

    private hardwareCursorText?: Text;
    private rimLightingText?: Text;
    private tiltShiftText?: Text;
    private simpleTreesText?: Text;
    private isRimLightingEnabled: boolean = true;
    private isTiltShiftEnabled: boolean = true;
    private isSimpleTreesEnabled: boolean = false;
    private isHardwareCursorHidden: boolean = false;
    private isUpdatingAnimationSpeed: boolean = false;
    private isUpdatingSoundValues: boolean = false;

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
    public onAnimationSpeedChange?: (speed: number) => void;
    public onWeatherChange?: (weather: WeatherType) => void;
    public onToggleRimLighting?: (enabled: boolean) => void;
    public onToggleTiltShift?: (enabled: boolean) => void;
    public onToggleSimpleTrees?: (enabled: boolean) => void;

    public constructor(private view: Container, private uiSheet: Spritesheet) {
        const windowBg = new NineSliceSprite({
            texture: this.uiSheet.textures['panel.png'],
            leftWidth: 15,
            topHeight: 15,
            rightWidth: 15,
            bottomHeight: 15,
        });

        windowBg.width = 1080;
        windowBg.height = 900;
        windowBg.alpha = 0.95;

        this.window.addChild(windowBg);
        this.window.position = {
            x: (1920 - windowBg.width) / 2,
            y: Math.max(20, (1080 - windowBg.height) / 2),
        };

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

    private getRimLightingLabel(): string {
        return `Unit Rim Light\n[${this.isRimLightingEnabled ? 'ON' : 'OFF'}]`;
    }

    public setRimLightingEnabled(enabled: boolean): void {
        this.isRimLightingEnabled = enabled;
        if (this.rimLightingText) {
            this.rimLightingText.text = this.getRimLightingLabel();
        }
    }

    private getTiltShiftLabel(): string {
        return `Tilt-Shift Blur\n[${this.isTiltShiftEnabled ? 'ON' : 'OFF'}]`;
    }

    public setTiltShiftEnabled(enabled: boolean): void {
        this.isTiltShiftEnabled = enabled;
        if (this.tiltShiftText) {
            this.tiltShiftText.text = this.getTiltShiftLabel();
        }
    }

    private getSimpleTreesLabel(): string {
        return `Simple trees\n[${this.isSimpleTreesEnabled ? 'ON' : 'OFF'}]`;
    }

    public setSimpleTreesEnabled(enabled: boolean): void {
        this.isSimpleTreesEnabled = enabled;
        if (this.simpleTreesText) {
            this.simpleTreesText.text = this.getSimpleTreesLabel();
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
        this.isUpdatingSoundValues = true;
        try {
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
        } finally {
            this.isUpdatingSoundValues = false;
        }
    }

    public setAnimationSpeed(speed: number): void {
        const clamped = clampAnimationSpeed(speed);
        this.isUpdatingAnimationSpeed = true;
        try {
            if (this.animationSpeedSlider) {
                this.animationSpeedSlider.value = clamped;
            }
            if (this.animationSpeedValueText) {
                this.animationSpeedValueText.text = `${clamped}`;
            }
        } finally {
            this.isUpdatingAnimationSpeed = false;
        }
    }

    public getAnimationSpeed(): number {
        if (this.animationSpeedSlider) {
            return clampAnimationSpeed(this.animationSpeedSlider.value);
        }
        return DEFAULT_ANIMATION_SPEED;
    }

    public setWeather(weather: WeatherType): void {
        this.weatherDropdown?.selectWeather(weather, false);
    }

    public getWeather(): WeatherType {
        return this.weatherDropdown?.selectedWeather ?? WeatherType.NONE;
    }

    public selectTab(tab: BattleMenuTab): void {
        this.activeTab = tab;
        const tabs: BattleMenuTab[] = ['general', 'graphics', 'audio', 'debug'];
        for (const t of tabs) {
            const container = this.tabContainers[t];
            if (container) {
                container.visible = t === tab;
            }
            const btn = this.tabButtons[t];
            if (btn) {
                btn.alpha = t === tab ? 1.0 : 0.72;
            }
            const label = this.tabTexts[t];
            if (label) {
                label.style.fill = t === tab ? '#FFEE88' : '#C8DCE8';
            }
        }
    }

    private initializeMainContainer(panelWidth: number): void {
        const title = new Text({
            text: `Battle Menu`,
            style: { fill: 0xffffff, fontSize: 32, fontWeight: 'bold' },
        });
        title.anchor.set(0.5);
        title.x = panelWidth / 2;
        title.y = 36;
        this.mainContainer.addChild(title);

        // Vertical tab sidebar
        const sidebarX = 28;
        const tabWidth = 210;
        const tabHeight = 76;
        const tabGap = 18;
        const tabsStartY = 88;
        const tabDefs: Array<{ id: BattleMenuTab; label: string }> = [
            { id: 'general', label: 'General' },
            { id: 'graphics', label: 'Graphics' },
            { id: 'audio', label: 'Audio' },
            { id: 'debug', label: 'Debug' },
        ];

        tabDefs.forEach((def, idx) => {
            const tabText = new Text({
                text: def.label,
                style: { fill: '#C8DCE8', fontSize: 22, fontWeight: 'bold', align: 'center' },
            });
            const tabBtn = new FancyButton({
                ...this.THIN_BUTTON_STYLE,
                text: tabText,
            });
            tabBtn.position.set(sidebarX, tabsStartY + idx * (tabHeight + tabGap));
            tabBtn.width = tabWidth;
            tabBtn.height = tabHeight;
            tabBtn.onPress.connect(() => {
                this.selectTab(def.id);
            });
            bindButtonUISound(tabBtn);

            this.tabButtons[def.id] = tabBtn;
            this.tabTexts[def.id] = tabText;
            this.mainContainer.addChild(tabBtn);
            this.mainContainer.addChild(this.tabContainers[def.id]);
        });

        // Subtle vertical separator between tabs and content
        const divider = new NineSliceSprite({
            texture: this.uiSheet.textures['panel.png'] || Texture.EMPTY,
            leftWidth: 2,
            topHeight: 2,
            rightWidth: 2,
            bottomHeight: 2,
        });
        divider.position.set(256, 84);
        divider.width = 4;
        divider.height = 716;
        divider.alpha = 0.4;
        this.mainContainer.addChild(divider);

        const contentBtnX = 286;
        const contentTextX = 382;
        const btnWidth = 76;
        const btnHeight = 72;
        const rowStep = 94;
        const startY = 88;

        const addOptionLabel = (target: Container, x: number, y: number, titleText: string, subText?: string): void => {
            const label = new Text({
                ...BattleMenuPanel.DEFAULT_FONT_STYLE,
                text: titleText,
            });
            label.position = { x, y: subText ? y + 6 : y + 20 };
            target.addChild(label);

            if (subText) {
                const sub = new Text({
                    ...BattleMenuPanel.SUB_FONT_STYLE,
                    text: subText,
                });
                sub.position = { x, y: y + 36 };
                target.addChild(sub);
            }
        };

        const createIconButton = (iconName: string, x: number, y: number): FancyButton => {
            const btn = new FancyButton({
                ...this.DEFAULT_BUTTON_STYLE,
                icon: iconName,
            });
            btn.position.set(x, y);
            btn.width = btnWidth;
            btn.height = btnHeight;
            return btn;
        };

        const sliderBg = this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'] || Texture.EMPTY;
        const sliderFill = this.uiSheet.textures['thin_button_2_normal.png'] || this.uiSheet.textures['panel.png'] || Texture.EMPTY;
        const sliderHandle = this.uiSheet.textures['thin_button_2_hover.png'] || this.uiSheet.textures['btn_simple.png'] || Texture.EMPTY;

        const createMobileSlider = (min: number, max: number, step: number, value: number, width: number, height: number): Slider => {
            const handleSprite = new Sprite(sliderHandle);
            handleSprite.width = 28;
            handleSprite.height = 36;
            const s = new Slider({
                bg: sliderBg,
                fill: sliderFill,
                slider: handleSprite,
                nineSliceSprite: {
                    bg: [4, 4, 4, 4],
                    fill: [4, 4, 4, 4],
                },
                fillPaddings: { top: 0, left: 0, right: 0, bottom: 0 },
                min,
                max,
                step,
                value,
                showValue: false,
            });
            s.width = width;
            s.height = height;
            return s;
        };

        // ============================================================
        // 1. GENERAL TAB
        // ============================================================
        const generalTab = this.tabContainers.general;

        this.toggleGridButton = createIconButton('glyph_grid.png', contentBtnX, startY + 0 * rowStep);
        addOptionLabel(generalTab, contentTextX, startY + 0 * rowStep, 'Toggle Grid Display', 'The grid will remain subtly visible.');
        generalTab.addChild(this.toggleGridButton);

        this.showHealthbarsButton = createIconButton('glyph_toggle_healthbars.png', contentBtnX, startY + 1 * rowStep);
        addOptionLabel(generalTab, contentTextX, startY + 1 * rowStep, 'Toggle Healthbars', 'Show or hide squad health and stamina bars.');
        generalTab.addChild(this.showHealthbarsButton);

        this.toggleDamageIndicatorsButton = createIconButton(
            this.uiSheet.textures['glyph_hp'] ? 'glyph_hp' : 'glyph_plus.png',
            contentBtnX,
            startY + 2 * rowStep
        );
        addOptionLabel(generalTab, contentTextX, startY + 2 * rowStep, 'Show Damage Indicators', 'Floating indicators on morale/HP/stamina change.');
        generalTab.addChild(this.toggleDamageIndicatorsButton);

        this.toggleStatsButton = createIconButton('glyph_toggle_stats.png', contentBtnX, startY + 3 * rowStep);
        addOptionLabel(generalTab, contentTextX, startY + 3 * rowStep, 'Toggle Unit Stats (F4)', 'Show or hide unit statistics panels.');
        generalTab.addChild(this.toggleStatsButton);

        const animY = startY + 4 * rowStep;
        this.animationSpeedButton = createIconButton(
            this.uiSheet.textures['glyph_movement'] ? 'glyph_movement' : 'glyph_next_unit.png',
            contentBtnX,
            animY
        );
        addOptionLabel(generalTab, contentTextX, animY - 2, 'Animation Speed (1-8)');
        this.animationSpeedSlider = createMobileSlider(MIN_ANIMATION_SPEED, MAX_ANIMATION_SPEED, 1, DEFAULT_ANIMATION_SPEED, 340, 24);
        this.animationSpeedSlider.position.set(contentTextX, animY + 38);
        this.animationSpeedValueText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: `${DEFAULT_ANIMATION_SPEED}`,
            style: { fontSize: 20, fill: '#AACCFF', fontWeight: 'bold' },
        });
        this.animationSpeedValueText.position.set(contentTextX + 358, animY + 36);
        this.animationSpeedSlider.onUpdate.connect((val) => {
            const speed = clampAnimationSpeed(val);
            if (this.animationSpeedValueText) {
                this.animationSpeedValueText.text = `${speed}`;
            }
            if (!this.isUpdatingAnimationSpeed && this.onAnimationSpeedChange) {
                this.onAnimationSpeedChange(speed);
            }
        });
        generalTab.addChild(this.animationSpeedButton, this.animationSpeedSlider, this.animationSpeedValueText);

        this.saveButton = createIconButton('glyph_plus.png', contentBtnX, startY + 5 * rowStep + 6);
        addOptionLabel(generalTab, contentTextX, startY + 5 * rowStep + 6, 'Save Battle State', 'Save snapshot to local storage.');
        generalTab.addChild(this.saveButton);

        this.loadButton = createIconButton('glyph_next_turn.png', contentBtnX, startY + 6 * rowStep + 6);
        addOptionLabel(generalTab, contentTextX, startY + 6 * rowStep + 6, 'Load Saved Battle', 'Select and restore a saved state.');
        generalTab.addChild(this.loadButton);

        // ============================================================
        // 2. GRAPHICS TAB
        // ============================================================
        const graphicsTab = this.tabContainers.graphics;

        this.fullscreenToggleButton = createIconButton('glyph_fullscreen.png', contentBtnX, startY + 0 * rowStep);
        addOptionLabel(graphicsTab, contentTextX, startY + 0 * rowStep, 'Full Screen Mode', 'Uses the browser fullscreen API.');
        graphicsTab.addChild(this.fullscreenToggleButton);

        this.toggleFpsButton = createIconButton('glyph_toggle_perf_stats.png', contentBtnX, startY + 1 * rowStep);
        addOptionLabel(graphicsTab, contentTextX, startY + 1 * rowStep, 'Show FPS', 'Toggle frames per second counter.');
        graphicsTab.addChild(this.toggleFpsButton);

        this.toggleHardwareCursorButton = createIconButton('cursor_arrow.png', contentBtnX, startY + 2 * rowStep);
        this.hardwareCursorText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: this.getHardwareCursorLabel(),
            style: { fill: '#ffffff', fontSize: 20, align: 'left' },
        });
        this.hardwareCursorText.position = { x: contentTextX, y: startY + 2 * rowStep + 8 };
        graphicsTab.addChild(this.toggleHardwareCursorButton, this.hardwareCursorText);

        const weatherY = startY + 3 * rowStep;
        this.weatherButton = createIconButton(
            this.uiSheet.textures['glyph_toggle_perf_stats.png'] ? 'glyph_toggle_perf_stats.png' : 'btn_simple.png',
            contentBtnX,
            weatherY
        );
        this.weatherButton.onPress.connect(() => {
            this.weatherDropdown?.toggle();
        });
        addOptionLabel(graphicsTab, contentTextX, weatherY - 2, 'Weather Effects (Visual)');
        this.weatherDropdown = new WeatherDropdown(
            this.THIN_BUTTON_STYLE,
            WeatherType.NONE,
            260,
            42,
            34,
            true
        );
        this.weatherDropdown.position.set(contentTextX, weatherY + 34);
        this.weatherDropdown.onChange = (weather) => {
            if (this.onWeatherChange) {
                this.onWeatherChange(weather);
            }
        };
        graphicsTab.addChild(this.weatherButton);

        const toggleRow1Y = startY + 4 * rowStep + 24;
        const toggleRow2Y = toggleRow1Y + 96;

        this.tiltShiftText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: this.getTiltShiftLabel(),
            style: { fontSize: 19, fill: '#E0F0FF', align: 'center' },
        });
        this.toggleTiltShiftButton = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
            text: this.tiltShiftText,
        });
        this.toggleTiltShiftButton.position.set(contentBtnX, toggleRow1Y);
        this.toggleTiltShiftButton.width = 350;
        this.toggleTiltShiftButton.height = 76;
        this.toggleTiltShiftButton.onPress.connect(() => {
            this.setTiltShiftEnabled(!this.isTiltShiftEnabled);
            this.onToggleTiltShift?.(this.isTiltShiftEnabled);
        });

        this.rimLightingText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: this.getRimLightingLabel(),
            style: { fontSize: 19, fill: '#E0F0FF', align: 'center' },
        });
        this.toggleRimLightingButton = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
            text: this.rimLightingText,
        });
        this.toggleRimLightingButton.position.set(contentBtnX + 370, toggleRow1Y);
        this.toggleRimLightingButton.width = 350;
        this.toggleRimLightingButton.height = 76;
        this.toggleRimLightingButton.onPress.connect(() => {
            this.setRimLightingEnabled(!this.isRimLightingEnabled);
            this.onToggleRimLighting?.(this.isRimLightingEnabled);
        });

        this.simpleTreesText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: this.getSimpleTreesLabel(),
            style: { fontSize: 19, fill: '#E0F0FF', align: 'center' },
        });
        this.toggleSimpleTreesButton = new FancyButton({
            ...this.THIN_BUTTON_STYLE,
            text: this.simpleTreesText,
        });
        this.toggleSimpleTreesButton.position.set(contentBtnX, toggleRow2Y);
        this.toggleSimpleTreesButton.width = 350;
        this.toggleSimpleTreesButton.height = 76;
        this.toggleSimpleTreesButton.onPress.connect(() => {
            this.setSimpleTreesEnabled(!this.isSimpleTreesEnabled);
            this.onToggleSimpleTrees?.(this.isSimpleTreesEnabled);
        });

        graphicsTab.addChild(
            this.toggleTiltShiftButton,
            this.toggleRimLightingButton,
            this.toggleSimpleTreesButton,
            this.weatherDropdown
        );

        // ============================================================
        // 3. AUDIO TAB
        // ============================================================
        const audioTab = this.tabContainers.audio;
        const audioIconTex = this.uiSheet.textures['glyph_toggle_music.png'] || Texture.EMPTY;

        const musicRowY = startY + 20;
        this.musicIcon = new Sprite(audioIconTex);
        this.musicIcon.position.set(contentBtnX + 8, musicRowY + 8);
        this.musicIcon.width = 56;
        this.musicIcon.height = 56;

        this.musicLabel = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Music level',
            style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
        });
        this.musicLabel.position.set(contentTextX, musicRowY);

        this.musicVolumeSlider = createMobileSlider(0, 100, 1, 15, 380, 26);
        this.musicVolumeSlider.position.set(contentTextX, musicRowY + 42);

        this.musicVolumeValueText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '15%',
            style: { fontSize: 22, fill: '#AACCFF', fontWeight: 'bold' },
        });
        this.musicVolumeValueText.position.set(contentTextX + 400, musicRowY + 38);

        this.musicVolumeSlider.onUpdate.connect((val) => {
            if (this.musicVolumeValueText) {
                this.musicVolumeValueText.text = `${Math.round(val)}%`;
            }
        });

        audioTab.addChild(this.musicIcon, this.musicLabel, this.musicVolumeSlider, this.musicVolumeValueText);

        const soundRowY = startY + 160;
        this.soundIcon = new Sprite(audioIconTex);
        this.soundIcon.position.set(contentBtnX + 8, soundRowY + 8);
        this.soundIcon.width = 56;
        this.soundIcon.height = 56;

        this.soundLabel = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Sound level',
            style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
        });
        this.soundLabel.position.set(contentTextX, soundRowY);

        this.soundVolumeSlider = createMobileSlider(0, 100, 1, 75, 380, 26);
        this.soundVolumeSlider.position.set(contentTextX, soundRowY + 42);

        this.soundVolumeValueText = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: '75%',
            style: { fontSize: 22, fill: '#AACCFF', fontWeight: 'bold' },
        });
        this.soundVolumeValueText.position.set(contentTextX + 400, soundRowY + 38);

        this.soundVolumeSlider.onUpdate.connect((val) => {
            if (this.soundVolumeValueText) {
                this.soundVolumeValueText.text = `${Math.round(val)}%`;
            }
        });

        audioTab.addChild(this.soundIcon, this.soundLabel, this.soundVolumeSlider, this.soundVolumeValueText);

        // ============================================================
        // 4. DEBUG TAB
        // ============================================================
        const debugTab = this.tabContainers.debug;

        this.toggleCoordsButton = createIconButton('glyph_xy.png', contentBtnX, startY + 0 * (rowStep + 16));
        addOptionLabel(debugTab, contentTextX, startY + 0 * (rowStep + 16), 'Toggle Coordinates Display', 'Show hex coordinates on the battlefield.');
        debugTab.addChild(this.toggleCoordsButton);

        this.toggleSceneInspectorButton = createIconButton('glyph_toggle_perf_stats.png', contentBtnX, startY + 1 * (rowStep + 16));
        addOptionLabel(debugTab, contentTextX, startY + 1 * (rowStep + 16), 'Toggle 3D Scene Inspector', '(Same effect as pressing F2)');
        debugTab.addChild(this.toggleSceneInspectorButton);

        // ============================================================
        // CLOSE BUTTON
        // ============================================================
        this.closeButton.position.set((panelWidth - 180) / 2, 824);
        this.closeButton.width = 180;
        this.closeButton.height = 54;
        this.closeButton.text = new Text({
            ...BattleMenuPanel.DEFAULT_FONT_STYLE,
            text: 'Close',
            style: { fontSize: 22, fill: '#DDFFFF', fontWeight: 'bold' },
        });
        this.mainContainer.addChild(this.closeButton);

        bindButtonUISound(this.fullscreenToggleButton);
        bindButtonUISound(this.toggleCoordsButton);
        bindButtonUISound(this.toggleGridButton);
        bindButtonUISound(this.showHealthbarsButton);
        bindButtonUISound(this.toggleSceneInspectorButton);
        bindButtonUISound(this.toggleFpsButton);
        bindButtonUISound(this.toggleDamageIndicatorsButton);
        if (this.weatherButton) bindButtonUISound(this.weatherButton);
        bindButtonUISound(this.saveButton);
        bindButtonUISound(this.loadButton);
        bindButtonUISound(this.toggleStatsButton);
        bindButtonUISound(this.toggleHardwareCursorButton);
        bindButtonUISound(this.animationSpeedButton);
        bindButtonUISound(this.toggleRimLightingButton);
        bindButtonUISound(this.toggleTiltShiftButton);
        bindButtonUISound(this.toggleSimpleTreesButton);
        bindButtonUISound(this.closeButton);

        bindSliderUISound(this.musicVolumeSlider, () => this.isUpdatingSoundValues);
        bindSliderUISound(this.soundVolumeSlider, () => this.isUpdatingSoundValues);
        bindSliderUISound(this.animationSpeedSlider, () => this.isUpdatingAnimationSpeed);

        this.selectTab('general');
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
        bindButtonUISound(confirmSaveBtn);
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
        bindButtonUISound(cancelSaveBtn);
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
        bindButtonUISound(upBtn);
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
        bindButtonUISound(downBtn);
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
        bindButtonUISound(backBtn);
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

        this.animationSpeedButton?.onPress.connect(() => {
            this.setAnimationSpeed(DEFAULT_ANIMATION_SPEED);
            if (this.onAnimationSpeedChange) {
                this.onAnimationSpeedChange(DEFAULT_ANIMATION_SPEED);
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
            bindButtonUISound(loadBtn);
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
            bindButtonUISound(delBtn);
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