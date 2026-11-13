import { SeedableRNG } from '../../shared/prng';

export interface WindConfig {
  /** Minimum wind intensity factor (e.g. 0.5) */
  minStrength?: number;
  min_strength?: number;
  /** Maximum wind intensity factor (e.g. 1.8) */
  maxStrength?: number;
  max_strength?: number;
  /** Minimum direction angle change in degrees on turn change (default -45) */
  minAngleChangeDeg?: number;
  min_angle_change_deg?: number;
  /** Maximum direction angle change in degrees on turn change (default +45) */
  maxAngleChangeDeg?: number;
  max_angle_change_deg?: number;
  /** Initial wind direction in degrees (default 45 deg = South-West to North-East) */
  initialAngleDeg?: number;
  initial_angle_deg?: number;
  /** Initial wind strength (default 1.0) */
  initialStrength?: number;
  initial_strength?: number;
}

export interface WindState {
  /** Wind direction angle in radians (0 = blowing toward +X East, PI/2 = blowing toward +Z South) */
  angleRad: number;
  /** Wind direction angle in degrees */
  angleDeg: number;
  /** Normalized or scaled wind intensity/strength factor (e.g. 0.5 to 2.0) */
  strength: number;
}

export const DEFAULT_WIND_CONFIG: Required<Omit<WindConfig, 'min_strength' | 'max_strength' | 'min_angle_change_deg' | 'max_angle_change_deg' | 'initial_angle_deg' | 'initial_strength'>> = {
  minStrength: 0.5,
  maxStrength: 1.8,
  minAngleChangeDeg: -45,
  maxAngleChangeDeg: 45,
  initialAngleDeg: 45, // Default 45 deg (South-West to North-East)
  initialStrength: 1.0,
};

export class WindSystem {
  public config: Required<Omit<WindConfig, 'min_strength' | 'max_strength' | 'min_angle_change_deg' | 'max_angle_change_deg' | 'initial_angle_deg' | 'initial_strength'>>;
  private _angleDeg: number;
  private _strength: number;

  constructor(config?: WindConfig, private rng: SeedableRNG = new SeedableRNG()) {
    this.config = {
      minStrength: config?.minStrength ?? config?.min_strength ?? DEFAULT_WIND_CONFIG.minStrength,
      maxStrength: config?.maxStrength ?? config?.max_strength ?? DEFAULT_WIND_CONFIG.maxStrength,
      minAngleChangeDeg: config?.minAngleChangeDeg ?? config?.min_angle_change_deg ?? DEFAULT_WIND_CONFIG.minAngleChangeDeg,
      maxAngleChangeDeg: config?.maxAngleChangeDeg ?? config?.max_angle_change_deg ?? DEFAULT_WIND_CONFIG.maxAngleChangeDeg,
      initialAngleDeg: config?.initialAngleDeg ?? config?.initial_angle_deg ?? DEFAULT_WIND_CONFIG.initialAngleDeg,
      initialStrength: config?.initialStrength ?? config?.initial_strength ?? DEFAULT_WIND_CONFIG.initialStrength,
    };
    this._angleDeg = this.config.initialAngleDeg;
    this._strength = Math.max(this.config.minStrength, Math.min(this.config.maxStrength, this.config.initialStrength));
  }

  public setConfig(config?: WindConfig): void {
    if (!config) return;
    if (config.minStrength !== undefined || config.min_strength !== undefined) {
      this.config.minStrength = config.minStrength ?? config.min_strength!;
    }
    if (config.maxStrength !== undefined || config.max_strength !== undefined) {
      this.config.maxStrength = config.maxStrength ?? config.max_strength!;
    }
    if (config.minAngleChangeDeg !== undefined || config.min_angle_change_deg !== undefined) {
      this.config.minAngleChangeDeg = config.minAngleChangeDeg ?? config.min_angle_change_deg!;
    }
    if (config.maxAngleChangeDeg !== undefined || config.max_angle_change_deg !== undefined) {
      this.config.maxAngleChangeDeg = config.maxAngleChangeDeg ?? config.max_angle_change_deg!;
    }
    if (config.initialAngleDeg !== undefined || config.initial_angle_deg !== undefined) {
      this.config.initialAngleDeg = config.initialAngleDeg ?? config.initial_angle_deg!;
    }
    if (config.initialStrength !== undefined || config.initial_strength !== undefined) {
      this.config.initialStrength = config.initialStrength ?? config.initial_strength!;
    }
    this._strength = Math.max(this.config.minStrength, Math.min(this.config.maxStrength, this._strength));
  }

  public setRng(rng: SeedableRNG): void {
    this.rng = rng;
  }

  public get angleDeg(): number {
    return this._angleDeg;
  }

  public get angleRad(): number {
    return (this._angleDeg * Math.PI) / 180;
  }

  public get strength(): number {
    return this._strength;
  }

  public getState(): WindState {
    return {
      angleRad: this.angleRad,
      angleDeg: this._angleDeg,
      strength: this._strength,
    };
  }

  public setWind(angleDeg: number, strength?: number): void {
    this._angleDeg = ((angleDeg % 360) + 360) % 360;
    if (strength !== undefined) {
      this._strength = Math.max(this.config.minStrength, Math.min(this.config.maxStrength, strength));
    }
  }

  /**
   * Called on turn change:
   * 1. Changes wind direction randomly by delta in [minAngleChangeDeg ... maxAngleChangeDeg] (e.g. [-45 ... +45]).
   * 2. Changes wind strength randomly between [minStrength ... maxStrength].
   */
  public onTurnChange(): WindState {
    const minDelta = this.config.minAngleChangeDeg;
    const maxDelta = this.config.maxAngleChangeDeg;
    const angleDelta = this.rng.range(Math.round(minDelta * 10), Math.round(maxDelta * 10)) / 10;
    this._angleDeg = ((this._angleDeg + angleDelta) % 360 + 360) % 360;

    const minStr = this.config.minStrength;
    const maxStr = this.config.maxStrength;
    const randStr = this.rng.range(Math.round(minStr * 100), Math.round(maxStr * 100)) / 100;
    this._strength = randStr;

    return this.getState();
  }
}
