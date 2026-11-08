import { ButtonOptions, FancyButton } from "@pixi/ui";
import { Container, Graphics, Text } from "pixi.js";
import { drawMetallicRivet } from "./medieval-ui-decorations";
import { bindButtonUISound } from "../battle/ui-sounds";

export enum WeatherType {
  NONE = 'none',
  RAIN = 'rain',
  THUNDERSTORM = 'thunderstorm',
  FOG = 'fog',
}

export interface WeatherOption {
  value: WeatherType;
  label: string;
}

export const WEATHER_OPTIONS: WeatherOption[] = [
  { value: WeatherType.NONE, label: 'None (Sunny)' },
  { value: WeatherType.RAIN, label: 'Rain' },
  { value: WeatherType.THUNDERSTORM, label: 'Thunderstorm' },
  { value: WeatherType.FOG, label: 'Fog' },
];

export function normalizeWeatherType(value?: string | WeatherType): WeatherType {
  if (!value) return WeatherType.NONE;
  const str = String(value).toLowerCase().trim();
  if (str === 'rain') return WeatherType.RAIN;
  if (str === 'thunderstorm' || str === 'thunder' || str === 'storm') return WeatherType.THUNDERSTORM;
  if (str === 'fog' || str === 'mist') return WeatherType.FOG;
  return WeatherType.NONE;
}

export class WeatherDropdown extends Container {
  public readonly options: WeatherOption[];
  public readonly headerButton: FancyButton;
  public readonly menuContainer: Container;
  public readonly optionButtons: FancyButton[] = [];
  public readonly optionButtonsByWeather: Map<WeatherType, FancyButton> = new Map();

  public readonly dropdownWidth: number;
  public readonly dropdownHeight: number;
  public readonly itemHeight: number;
  public readonly openUpward: boolean;

  private _selectedWeather: WeatherType;
  private _isOpen: boolean = false;
  public onChange?: (weather: WeatherType) => void;

  public constructor(
    buttonStyle: ButtonOptions,
    initialWeather: WeatherType = WeatherType.NONE,
    width: number = 190,
    height: number = 34,
    itemHeight: number = 32,
    openUpward: boolean = true,
    options: WeatherOption[] = WEATHER_OPTIONS
  ) {
    super();
    this.options = options;
    this._selectedWeather = initialWeather;
    this.dropdownWidth = width;
    this.dropdownHeight = height;
    this.itemHeight = itemHeight;
    this.openUpward = openUpward;

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
    const totalMenuHeight = this.options.length * this.itemHeight;
    if (this.openUpward) {
      this.menuContainer.position.set(0, -totalMenuHeight - 2);
    } else {
      this.menuContainer.position.set(0, height + 2);
    }
    this.menuContainer.visible = false;

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
          fill: opt.value === this._selectedWeather ? "#ffe885" : "#f5e6c4",
          align: "center",
        },
        text: opt.label,
      });
      this.decorateDropdownButton(itemBtn, width, this.itemHeight);
      bindButtonUISound(itemBtn);
      itemBtn.onPress.connect(() => {
        this.selectWeather(opt.value, true);
        this.close();
      });
      this.menuContainer.addChild(itemBtn);
      this.optionButtons.push(itemBtn);
      this.optionButtonsByWeather.set(opt.value, itemBtn);
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
    const found = this.options.find((o) => o.value === this._selectedWeather);
    const label = found ? found.label : this._selectedWeather;
    const arrow = this._isOpen ? "▲" : "▼";
    return `Weather: ${label} ${arrow}`;
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
      const isSelected = opt.value === this._selectedWeather;
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

  public get selectedWeather(): WeatherType {
    return this._selectedWeather;
  }

  public set selectedWeather(weather: WeatherType) {
    this.selectWeather(weather, false);
  }

  public selectWeather(weather: WeatherType, notify: boolean = true): void {
    const changed = this._selectedWeather !== weather;
    this._selectedWeather = weather;
    this.refreshLabels();
    if (changed && notify && this.onChange) {
      this.onChange(this._selectedWeather);
    }
  }

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
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

  public containsStagePoint(stageX: number, stageY: number): boolean {
    const totalMenuHeight = this.options.length * this.itemHeight;
    const minY = this.openUpward && this._isOpen ? this.y - totalMenuHeight - 2 : this.y;
    const maxY = this.openUpward || !this._isOpen
      ? this.y + this.dropdownHeight
      : this.y + this.dropdownHeight + 2 + totalMenuHeight;

    return (
      stageX >= this.x &&
      stageX <= this.x + this.dropdownWidth &&
      stageY >= minY &&
      stageY <= maxY
    );
  }
}
