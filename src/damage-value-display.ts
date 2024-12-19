import { TextOptions, Text, Container } from "pixi.js";
import { Coords } from "./shared";

/**
 * A simple fire-and-forget damage value display that will display a damage value at a given position for a given duration.
 * The damage also has a travel distance and will move in that direction during the duration.
 */
export class DamageValueDisplay {

  static DEFAULT_FONT_STYLE: TextOptions = { style: { fill: { color: '#ff0000', alpha: 1 }, fontSize: 24, align: 'left' } };
  static DEFAULT_DURATION_IN_MILLIS: number = 500;

  private attackNumberText = new Text({ ...DamageValueDisplay.DEFAULT_FONT_STYLE, text: this.damageValue });
  private travelDistance: Coords = { x: 10, y: -105 };
  private startingDurationInMillis: number = DamageValueDisplay.DEFAULT_DURATION_IN_MILLIS;

  public constructor(private damageValue: number, private view: Container, public remainingDurationInMillis: number, coords: Coords) {
    this.startingDurationInMillis = remainingDurationInMillis;
    this.attackNumberText.position = coords;
    this.attackNumberText.text = "" + damageValue.toString();
    this.view.addChild(this.attackNumberText);
  }

  public update(delta: number) {
    if (delta == 0 || this.startingDurationInMillis == 0) {
      return;
    }

    this.remainingDurationInMillis -= delta;
    this.attackNumberText.position.x += this.travelDistance.x / (this.startingDurationInMillis / delta);
    this.attackNumberText.position.y += this.travelDistance.y / (this.startingDurationInMillis / delta);
    if (this.remainingDurationInMillis <= 0) {
      this.view.removeChild(this.attackNumberText);
      this.attackNumberText.destroy();
    }
  }
}

/**
 * A collection of damage values that are currently displayed on the screen.
 */
export class DamageValueCollection {
  private damageValues: DamageValueDisplay[] = [];

  public addDamageValue(damageValue: number, view: Container, coords: Coords) {
    const damageValueDisplay = new DamageValueDisplay(damageValue, view, DamageValueDisplay.DEFAULT_DURATION_IN_MILLIS, coords);
    this.damageValues.push(damageValueDisplay);
  }

  public update(delta: number) {
    this.damageValues.forEach(damageValueDisplay => damageValueDisplay.update(delta));
    // remove all entries with remainingDuration <= 0
    this.damageValues = this.damageValues.filter(item => item.remainingDurationInMillis > 0);
  }
}