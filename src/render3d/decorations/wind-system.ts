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
  /** Wind strength threshold where medium wind transitions toward strong wind (default 1.15) */
  mediumStrengthThreshold?: number;
  medium_strength_threshold?: number;
  /** Wind strength threshold beyond which objects stay bent downwind without returning to rest (default 1.45) */
  strongStrengthThreshold?: number;
  strong_strength_threshold?: number;
}

export interface WindThresholds {
  mediumStrengthThreshold: number;
  strongStrengthThreshold: number;
}

export interface WindState {
  /** Wind direction angle in radians (0 = blowing toward +X East, PI/2 = blowing toward +Z South) */
  angleRad: number;
  /** Wind direction angle in degrees */
  angleDeg: number;
  /** Normalized or scaled wind intensity/strength factor (e.g. 0.5 to 2.0) */
  strength: number;
}

type NormalizedWindConfig = {
  minStrength: number;
  maxStrength: number;
  minAngleChangeDeg: number;
  maxAngleChangeDeg: number;
  initialAngleDeg: number;
  initialStrength: number;
  mediumStrengthThreshold: number;
  strongStrengthThreshold: number;
};

export const DEFAULT_WIND_CONFIG: NormalizedWindConfig = {
  minStrength: 0.5,
  maxStrength: 1.8,
  minAngleChangeDeg: -45,
  maxAngleChangeDeg: 45,
  initialAngleDeg: 45, // Default 45 deg (South-West to North-East)
  initialStrength: 1.0,
  mediumStrengthThreshold: 1.15,
  strongStrengthThreshold: 1.45,
};

const globalWindThresholds: WindThresholds = {
  mediumStrengthThreshold: DEFAULT_WIND_CONFIG.mediumStrengthThreshold,
  strongStrengthThreshold: DEFAULT_WIND_CONFIG.strongStrengthThreshold,
};

export function configureWindThresholds(config?: WindConfig): WindThresholds {
  if (config) {
    const med = config.mediumStrengthThreshold ?? config.medium_strength_threshold;
    const strong = config.strongStrengthThreshold ?? config.strong_strength_threshold;
    if (med !== undefined && Number.isFinite(med)) {
      globalWindThresholds.mediumStrengthThreshold = Math.max(0.1, med);
    }
    if (strong !== undefined && Number.isFinite(strong)) {
      globalWindThresholds.strongStrengthThreshold = Math.max(
        globalWindThresholds.mediumStrengthThreshold + 0.05,
        strong
      );
    }
  }
  return { ...globalWindThresholds };
}

export function getWindThresholds(): WindThresholds {
  return { ...globalWindThresholds };
}

export class WindSystem {
  public config: NormalizedWindConfig;
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
      mediumStrengthThreshold:
        config?.mediumStrengthThreshold ??
        config?.medium_strength_threshold ??
        DEFAULT_WIND_CONFIG.mediumStrengthThreshold,
      strongStrengthThreshold:
        config?.strongStrengthThreshold ??
        config?.strong_strength_threshold ??
        DEFAULT_WIND_CONFIG.strongStrengthThreshold,
    };
    this._angleDeg = this.config.initialAngleDeg;
    this._strength = Math.max(this.config.minStrength, Math.min(this.config.maxStrength, this.config.initialStrength));
    configureWindThresholds(this.config);
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
    if (config.mediumStrengthThreshold !== undefined || config.medium_strength_threshold !== undefined) {
      this.config.mediumStrengthThreshold =
        config.mediumStrengthThreshold ?? config.medium_strength_threshold!;
    }
    if (config.strongStrengthThreshold !== undefined || config.strong_strength_threshold !== undefined) {
      this.config.strongStrengthThreshold =
        config.strongStrengthThreshold ?? config.strong_strength_threshold!;
    }
    this._strength = Math.max(this.config.minStrength, Math.min(this.config.maxStrength, this._strength));
    configureWindThresholds(this.config);
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
