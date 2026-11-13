import { ButtonOptions, FancyButton, Slider } from "@pixi/ui";
import { TextStyle, TextStyleOptions, Text, Container, Graphics } from "pixi.js";
import { drawMedievalBestiaryMotif, drawMetallicRivet } from "./medieval-ui-decorations";
import { CPUPersonalityType } from "../battle/cpu-player";
import { bindButtonUISound, bindSliderUISound } from "../battle/ui-sounds";

export interface CPUPersonalityOption {
  value: CPUPersonalityType;
  label: string;
}

export class CPUPersonalityDropdown extends Container {
  public static readonly DEFAULT_OPTIONS: CPUPersonalityOption[] = [
    { value: CPUPersonalityType.DEFENSIVE, label: "Defensive" },
    { value: CPUPersonalityType.AGGRESSIVE, label: "Aggressive" },
    { value: CPUPersonalityType.DUMB, label: "Dumb" },
  ];

  public readonly options: CPUPersonalityOption[];
  public readonly headerButton: FancyButton;
  public readonly menuContainer: Container;
  public readonly optionButtons: FancyButton[] = [];
  public readonly optionButtonsByPersonality: Map<CPUPersonalityType, FancyButton> = new Map();

  public readonly dropdownWidth: number;
  public readonly dropdownHeight: number;
  public readonly itemHeight: number = 36;

  private _selectedPersonality: CPUPersonalityType;
  private _isOpen: boolean = false;
  public onChange?: (personality: CPUPersonalityType) => void;
  private changeListeners: Array<(personality: CPUPersonalityType) => void> = [];

  public constructor(
    buttonStyle: ButtonOptions,
    initialPersonality: CPUPersonalityType = CPUPersonalityType.DEFENSIVE,
    width: number = 140,
    height: number = 40,
    options: CPUPersonalityOption[] = CPUPersonalityDropdown.DEFAULT_OPTIONS
  ) {
    super();
    this.options = options;
    this._selectedPersonality = initialPersonality;
    this.dropdownWidth = width;
    this.dropdownHeight = height;

    this.headerButton = new FancyButton({ ...buttonStyle });
    this.headerButton.width = width;
    this.headerButton.height = height;
    this.headerButton.text = new Text({
      style: {
        fontFamily: "GustysSerpents",
        fontSize: 13,
        fill: "#f5e6c4",
        align: "center",
      },
      text: this.formatHeaderText(),
    });
    this.decorateDropdownButton(this.headerButton, width, height);
    bindButtonUISound(this.headerButton);
    this.headerButton.onPress.connect(() => {
      this.toggle();
    });
    this.addChild(this.headerButton);

    this.menuContainer = new Container();
    this.menuContainer.position.set(0, height + 2);
    this.menuContainer.visible = false;

    const totalMenuHeight = this.options.length * this.itemHeight;
    const menuBg = new Graphics();
    menuBg.roundRect(0, 0, width, totalMenuHeight, 4).fill({ color: 0x1a120b, alpha: 0.96 });
    menuBg.roundRect(0, 0, width, totalMenuHeight, 4).stroke({ width: 1.8, color: 0xd4af37, alpha: 0.9 });
    menuBg.eventMode = "none";
    this.menuContainer.addChild(menuBg);

    this.options.forEach((opt, idx) => {
      const itemBtn = new FancyButton({ ...buttonStyle });
      itemBtn.position.set(0, idx * this.itemHeight);
      itemBtn.width = width;
      itemBtn.height = this.itemHeight;
      itemBtn.text = new Text({
        style: {
          fontFamily: "GustysSerpents",
          fontSize: 13,
          fill: opt.value === this._selectedPersonality ? "#ffe885" : "#f5e6c4",
          align: "center",
        },
        text: opt.label,
      });
      this.decorateDropdownButton(itemBtn, width, this.itemHeight);
      bindButtonUISound(itemBtn);
      itemBtn.onPress.connect(() => {
        this.selectPersonality(opt.value, true);
        this.close();
      });
      this.menuContainer.addChild(itemBtn);
      this.optionButtons.push(itemBtn);
      this.optionButtonsByPersonality.set(opt.value, itemBtn);
    });

    this.addChild(this.menuContainer);
  }

  private decorateDropdownButton(btn: FancyButton, w: number, h: number): void {
    const g = new Graphics();
    g.eventMode = "none";
    g.roundRect(0, 0, w, h, 4).stroke({ width: 1.5, color: 0x9b7624, alpha: 0.9 });
    drawMetallicRivet(g, 5, 5, 1.5, 0xd4af37);
    drawMetallicRivet(g, w - 5, 5, 1.5, 0xd4af37);
    drawMetallicRivet(g, 5, h - 5, 1.5, 0xd4af37);
    drawMetallicRivet(g, w - 5, h - 5, 1.5, 0xd4af37);
    btn.addChild(g);
  }

  private formatHeaderText(): string {
    const found = this.options.find((o) => o.value === this._selectedPersonality);
    const label = found ? found.label : this._selectedPersonality;
    const arrow = this._isOpen ? "▲" : "▼";
    return `AI: ${label} ${arrow}`;
  }

  private refreshLabels(): void {
    const headerText = this.formatHeaderText();
    if (this.headerButton.textView) {
      this.headerButton.textView.text = headerText;
    } else {
      this.headerButton.text = headerText;
    }

    this.options.forEach((opt, idx) => {
      const btn = this.optionButtons[idx];
      if (!btn) return;
      const isSelected = opt.value === this._selectedPersonality;
      const prefix = isSelected ? "● " : "";
      const textStr = `${prefix}${opt.label}`;
      if (btn.textView) {
        btn.textView.text = textStr;
        if (btn.textView.style) {
          btn.textView.style.fill = isSelected ? "#ffe885" : "#f5e6c4";
        }
      } else {
        btn.text = textStr;
      }
    });
  }

  public get selectedPersonality(): CPUPersonalityType {
    return this._selectedPersonality;
  }

  public set selectedPersonality(val: CPUPersonalityType) {
    this.selectPersonality(val, false);
  }

  public get value(): CPUPersonalityType {
    return this._selectedPersonality;
  }

  public set value(val: CPUPersonalityType) {
    this.selectPersonality(val, false);
  }

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public open(): void {
    this._isOpen = true;
    this.menuContainer.visible = true;
    this.refreshLabels();
  }

  public close(): void {
    this._isOpen = false;
    this.menuContainer.visible = false;
    this.refreshLabels();
  }

  public toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public onValueChange(listener: (personality: CPUPersonalityType) => void): void {
    this.changeListeners.push(listener);
  }

  public selectPersonality(personality: CPUPersonalityType, notify: boolean = true): void {
    if (!this.options.some((o) => o.value === personality)) return;
    this._selectedPersonality = personality;
    this.refreshLabels();
    if (notify) {
      this.onChange?.(personality);
      for (const listener of this.changeListeners) {
        listener(personality);
      }
    }
  }

  public containsStagePoint(stageX: number, stageY: number): boolean {
    if (!this.visible) return false;
    const totalH = this._isOpen
      ? this.dropdownHeight + 2 + this.options.length * this.itemHeight
      : this.dropdownHeight;
    return (
      stageX >= this.x &&
      stageX <= this.x + this.dropdownWidth &&
      stageY >= this.y &&
      stageY <= this.y + totalH
    );
  }
}

/**
 * Common tactical UI controls:
 * - Zoom in/out, Zoom slider
 * - Next unit, End turn, Rest action (docked in the Common Actions section of the Battle UI)
 * - Menu, Reset, Auto-Battle toggle & CPU Personality dropdown
 */
export class CommonControls {
  public static readonly DEFAULT_PANEL_ORIGIN = { x: 40, y: 936 };
  public static readonly REST_LOCAL_OFFSET = { x: 1520, y: 30 };
  public static readonly NEXT_UNIT_LOCAL_OFFSET = { x: 1520, y: 82 };
  public static readonly END_TURN_LOCAL_OFFSET = { x: 1662, y: 26 };

  public static readonly COMMON_ACTIONS_STAGE_ORIGIN = { x: 1560, y: 962 };
  public static readonly REST_BUTTON_BOUNDS = { x: 1560, y: 966, width: 132, height: 46 };
  public static readonly NEXT_UNIT_BUTTON_BOUNDS = { x: 1560, y: 1018, width: 132, height: 46 };
  public static readonly END_TURN_BUTTON_BOUNDS = { x: 1702, y: 962, width: 160, height: 104 };
  public static readonly AUTO_BATTLE_BUTTON_BOUNDS = { x: 4, y: 58, width: 130, height: 40 };
  public static readonly AUTO_BATTLE_DROPDOWN_BOUNDS = { x: 140, y: 58, width: 140, height: 40 };

  private panelOrigin: { x: number; y: number } = { ...CommonControls.DEFAULT_PANEL_ORIGIN };

  public menuButton?: FancyButton;
  public autoBattleButton?: FancyButton;
  public autoBattlePersonalityDropdown?: CPUPersonalityDropdown;
  public cpuPersonalityDropdown?: CPUPersonalityDropdown;
  public isAutoBattleEnabled: boolean = false;
  public autoBattlePersonality: CPUPersonalityType = CPUPersonalityType.DEFENSIVE;

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
  public isRestEnabled: boolean = true;

  static DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = {
    fontFamily: "GustysSerpents",
    fontSize: 14,
    fill: "#f5e6c4",
    align: "center",
  };

  static END_TURN_FONT_STYLE: TextStyle | TextStyleOptions = {
    fontFamily: "GustysSerpents",
    fontSize: 18,
    fontWeight: "bold",
    fill: "#ffe885",
    stroke: { color: "#120804", width: 3 },
    align: "center",
  };

  private DEFAULT_BUTTON_STYLE: ButtonOptions = {
    defaultView: "btn_simple.png",
    hoverView: "btn_simple_hover.png",
    pressedView: "btn_simple_click.png",
    nineSliceSprite: [7, 7, 7, 7],
  };

  private THIN_BUTTON_STYLE: ButtonOptions = {
    defaultView: "thin_button_2_normal.png",
    hoverView: "thin_button_2_hover.png",
    pressedView: "thin_button_2_hover.png",
    nineSliceSprite: [4, 4, 4, 4],
    padding: 2,
  };

  private SMALL_BUTTON_STYLE: ButtonOptions = {
    defaultView: "thin_button_2_normal.png",
    hoverView: "thin_button_2_hover.png",
    pressedView: "thin_button_2_hover.png",
    nineSliceSprite: [4, 4, 4, 4],
  };

  public constructor(
    public options: {
      zoomMin: number;
      zoomMax: number;
      zoomStep: number;
      zoomValue?: number;
    } = { zoomMin: 0, zoomMax: 100, zoomStep: 5 }
  ) {}

  private decorateActionButton(
    btn: FancyButton,
    w: number,
    h: number,
    isStandoutEndTurn: boolean = false
  ): void {
    const g = new Graphics();
    g.eventMode = "none";

    if (isStandoutEndTurn) {
      // Grand gilded-gold & royal-crimson metalwork frame for End Turn
      g.roundRect(0, 0, w, h, 6).stroke({ width: 3, color: 0xd4af37, alpha: 0.95 });
      g.roundRect(3, 3, w - 6, h - 6, 4).stroke({ width: 1.5, color: 0xffe885, alpha: 0.75 });
      drawMetallicRivet(g, 7, 7, 2.5, 0xffe885);
      drawMetallicRivet(g, w - 7, 7, 2.5, 0xffe885);
      drawMetallicRivet(g, 7, h - 7, 2.5, 0xffe885);
      drawMetallicRivet(g, w - 7, h - 7, 2.5, 0xffe885);
      // Heraldic eagle crest at top center of End Turn button
      drawMedievalBestiaryMotif(g, "eagle", w / 2, 12, 18, false, 0xffe285, 0xffffff);
    } else {
      // Forged iron & brass border for standard action buttons (Rest, Next Unit)
      g.roundRect(0, 0, w, h, 4).stroke({ width: 1.8, color: 0x9b7624, alpha: 0.9 });
      drawMetallicRivet(g, 5, 5, 1.8, 0xd4af37);
      drawMetallicRivet(g, w - 5, 5, 1.8, 0xd4af37);
      drawMetallicRivet(g, 5, h - 5, 1.8, 0xd4af37);
      drawMetallicRivet(g, w - 5, h - 5, 1.8, 0xd4af37);
    }

    btn.addChild(g);
  }

  public initializeButtons() {
    this.zoomOutButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: "glyph_minus.png" });
    this.zoomOutButton.position.set(1390, 30);
    this.zoomOutButton.width = 24;
    this.zoomOutButton.height = 24;

    this.zoomSlider = new Slider({
      bg: "thin_button_normal.png",
      fill: "thin_button_normal.png",
      slider: "thin_button_hover.png",
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

    this.zoomInButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE, icon: "glyph_plus.png" });
    this.zoomInButton.position.set(1570, 30);
    this.zoomInButton.width = 24;
    this.zoomInButton.height = 24;

    this.altitudeUpButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE });
    this.altitudeUpButton.position.set(1600, 30);
    this.altitudeUpButton.width = 24;
    this.altitudeUpButton.height = 24;
    this.altitudeUpButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: "▲",
      style: { fontSize: 12, fill: "#DDFFFF", align: "center" },
    });

    this.altitudeDownButton = new FancyButton({ ...this.SMALL_BUTTON_STYLE });
    this.altitudeDownButton.position.set(1630, 30);
    this.altitudeDownButton.width = 24;
    this.altitudeDownButton.height = 24;
    this.altitudeDownButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: "▼",
      style: { fontSize: 12, fill: "#DDFFFF", align: "center" },
    });

    this.resetButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: "glyph_reset.png" });
    this.resetButton.position.set(4, 460);

    this.activeAbility1Button = new FancyButton({ ...this.THIN_BUTTON_STYLE, icon: "glyph_ability1.png" });
    this.activeAbility1Button.position.set(820, 810);
    this.activeAbility1Button.width = 130;
    this.activeAbility1Button.height = 48;
    this.activeAbility1Button.visible = false;

    // Common Actions Section in the bottom-right of the combined Battle UI:
    // 1. Rest Button (always in the same spot, always shown, deactivated when not applicable)
    const restBounds = CommonControls.REST_BUTTON_BOUNDS;
    this.restButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: "glyph_stamina" });
    this.restButton.position.set(restBounds.x, restBounds.y);
    this.restButton.width = restBounds.width;
    this.restButton.height = restBounds.height;
    this.restButton.visible = true;
    this.restButton.text = new Text({
      style: CommonControls.DEFAULT_FONT_STYLE,
      text: "Rest [R]",
    });
    this.decorateActionButton(this.restButton, restBounds.width, restBounds.height, false);

    // 2. Next Unit Button
    const nextUnitBounds = CommonControls.NEXT_UNIT_BUTTON_BOUNDS;
    this.nextUnitButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: "glyph_next_unit.png" });
    this.nextUnitButton.position.set(nextUnitBounds.x, nextUnitBounds.y);
    this.nextUnitButton.width = nextUnitBounds.width;
    this.nextUnitButton.height = nextUnitBounds.height;
    this.nextUnitButton.visible = true;
    this.nextUnitButton.text = new Text({
      style: CommonControls.DEFAULT_FONT_STYLE,
      text: "Next Unit [Tab]",
    });
    this.decorateActionButton(this.nextUnitButton, nextUnitBounds.width, nextUnitBounds.height, false);

    // 3. End Turn Button (larger, standing out!)
    const endTurnBounds = CommonControls.END_TURN_BUTTON_BOUNDS;
    this.nextTurnButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE, icon: "glyph_next_turn.png" });
    this.nextTurnButton.position.set(endTurnBounds.x, endTurnBounds.y);
    this.nextTurnButton.width = endTurnBounds.width;
    this.nextTurnButton.height = endTurnBounds.height;
    this.nextTurnButton.visible = true;
    this.nextTurnButton.text = new Text({
      style: CommonControls.END_TURN_FONT_STYLE,
      text: "\nEND TURN\n[Enter]",
    });
    this.decorateActionButton(this.nextTurnButton, endTurnBounds.width, endTurnBounds.height, true);

    this.menuButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE });
    this.menuButton.position.set(4, 4);
    this.menuButton.width = 130;
    this.menuButton.height = 48;
    this.menuButton.text = new Text({
      ...CommonControls.DEFAULT_FONT_STYLE,
      text: "Menu",
      style: { fontSize: 16, fill: "#f5e6c4" },
    });

    // Auto-Battle Toggle Button & CPU Personality Dropdown next to it
    const autoBounds = CommonControls.AUTO_BATTLE_BUTTON_BOUNDS;
    this.autoBattleButton = new FancyButton({ ...this.DEFAULT_BUTTON_STYLE });
    this.autoBattleButton.position.set(autoBounds.x, autoBounds.y);
    this.autoBattleButton.width = autoBounds.width;
    this.autoBattleButton.height = autoBounds.height;
    this.autoBattleButton.text = new Text({
      style: {
        fontFamily: "GustysSerpents",
        fontSize: 14,
        fill: "#f5e6c4",
        align: "center",
      },
      text: "Auto: OFF",
    });
    this.decorateActionButton(this.autoBattleButton, autoBounds.width, autoBounds.height, false);
    this.setAutoBattleEnabled(false);

    const dropdownBounds = CommonControls.AUTO_BATTLE_DROPDOWN_BOUNDS;
    this.autoBattlePersonalityDropdown = new CPUPersonalityDropdown(
      this.DEFAULT_BUTTON_STYLE,
      this.autoBattlePersonality,
      dropdownBounds.width,
      dropdownBounds.height
    );
    this.autoBattlePersonalityDropdown.position.set(dropdownBounds.x, dropdownBounds.y);
    this.cpuPersonalityDropdown = this.autoBattlePersonalityDropdown;

    bindButtonUISound(this.zoomOutButton);
    bindButtonUISound(this.zoomInButton);
    bindButtonUISound(this.altitudeUpButton);
    bindButtonUISound(this.altitudeDownButton);
    bindButtonUISound(this.resetButton);
    bindButtonUISound(this.activeAbility1Button);
    bindButtonUISound(this.restButton);
    bindButtonUISound(this.nextUnitButton);
    bindButtonUISound(this.nextTurnButton);
    bindButtonUISound(this.menuButton);
    bindButtonUISound(this.autoBattleButton);
    bindSliderUISound(this.zoomSlider);
  }

  public setAutoBattleEnabled(enabled: boolean): void {
    this.isAutoBattleEnabled = enabled;
    if (!this.autoBattleButton) return;
    const label = enabled ? "Auto: ON" : "Auto: OFF";
    const fillColor = enabled ? "#ffe885" : "#f5e6c4";
    if (this.autoBattleButton.textView) {
      this.autoBattleButton.textView.text = label;
      if (this.autoBattleButton.textView.style) {
        this.autoBattleButton.textView.style.fill = fillColor;
      }
    } else {
      this.autoBattleButton.text = new Text({
        style: {
          fontFamily: "GustysSerpents",
          fontSize: 14,
          fill: fillColor,
          align: "center",
        },
        text: label,
      });
    }
  }

  public getAutoBattlePersonality(): CPUPersonalityType {
    return this.autoBattlePersonalityDropdown?.selectedPersonality ?? this.autoBattlePersonality;
  }

  public setAutoBattlePersonality(personality: CPUPersonalityType, notify: boolean = false): void {
    this.autoBattlePersonality = personality;
    this.autoBattlePersonalityDropdown?.selectPersonality(personality, notify);
  }

  public getPanelOrigin(): { x: number; y: number } {
    return { ...this.panelOrigin };
  }

  public setPanelOrigin(panelX: number, panelY: number): void {
    this.panelOrigin = { x: panelX, y: panelY };
    if (this.restButton) {
      this.restButton.position.set(
        panelX + CommonControls.REST_LOCAL_OFFSET.x,
        panelY + CommonControls.REST_LOCAL_OFFSET.y
      );
    }
    if (this.nextUnitButton) {
      this.nextUnitButton.position.set(
        panelX + CommonControls.NEXT_UNIT_LOCAL_OFFSET.x,
        panelY + CommonControls.NEXT_UNIT_LOCAL_OFFSET.y
      );
    }
    if (this.nextTurnButton) {
      this.nextTurnButton.position.set(
        panelX + CommonControls.END_TURN_LOCAL_OFFSET.x,
        panelY + CommonControls.END_TURN_LOCAL_OFFSET.y
      );
    }
  }

  /**
   * Updates the Rest button's active/deactivated state while keeping it visible and in the same spot.
   */
  public setRestApplicable(canRest: boolean): void {
    this.isRestEnabled = canRest;
    if (!this.restButton) return;
    // Always keep Rest button in the exact same spot inside the panel and always shown
    this.restButton.position.set(
      this.panelOrigin.x + CommonControls.REST_LOCAL_OFFSET.x,
      this.panelOrigin.y + CommonControls.REST_LOCAL_OFFSET.y
    );
    this.restButton.visible = true;
    this.restButton.enabled = canRest;
    this.restButton.alpha = canRest ? 1.0 : 0.4;
    this.restButton.cursor = canRest ? "pointer" : "not-allowed";
  }

  public getControls(): Container[] {
    const results: Container[] = [];
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
    if (this.autoBattleButton) results.push(this.autoBattleButton);
    if (this.autoBattlePersonalityDropdown) results.push(this.autoBattlePersonalityDropdown);
    if (this.activeAbility1Button) results.push(this.activeAbility1Button);

    return results;
  }
}