import { BattleSettings } from '../battle/settings';
import { Coords } from '../shared';
import { HexMap } from '../shared/hex-map';
import { OverviewCampaign } from './overview-campaign';

export interface AmbientSoundSettingsConfig {
  sampleRadiusHexes: number;
  checkIntervalMs: number;
  maxConcurrentOneShots: number;
  bedBaseVolume: number;
  oneShotBaseVolume: number;
  minOneShotCooldownMs: number;
  maxOneShotCooldownMs: number;
}

export interface AmbientSoundsConfig {
  settings: AmbientSoundSettingsConfig;
  beds: Record<string, string[]>;
  oneShots: Record<string, string[]>;
}

export const DEFAULT_AMBIENT_SOUNDS_CONFIG: AmbientSoundsConfig = {
  settings: {
    sampleRadiusHexes: 2,
    checkIntervalMs: 600,
    maxConcurrentOneShots: 2,
    bedBaseVolume: 0.28,
    oneShotBaseVolume: 0.45,
    minOneShotCooldownMs: 9000,
    maxOneShotCooldownMs: 22000,
  },
  beds: {
    grassland: ['audio/ambient/grasslands-bird-and-cricket-singing.ogg'],
    forest: [],
    deep_forest: [],
    swamp: [],
    hill: [],
    mountain: [],
    water: [],
  },
  oneShots: {
    cattle: ['audio/ambient/cow-moo-1.ogg', 'audio/ambient/cow-moo-2.ogg'],
    lumber_camp: [
      'audio/ambient/wood-chopping-01.ogg',
      'audio/ambient/wood-chopping-02.ogg',
      'audio/ambient/wood-chopping-03.ogg',
      'audio/ambient/wood-chopping-04.ogg',
    ],
    settlement: ['audio/ambient/large-anvil-steel-hammer-4.ogg'],
    wheat: [],
    sheep: [],
    horses: [],
    quarry: [],
    iron_mine: [],
    gold_mine: [],
    forest: [],
    deep_forest: [],
    swamp: [],
    water: [],
  },
};

export interface AmbientContextSample {
  dominantBedTag: string | null;
  oneShotTags: string[];
}

export interface AmbientSoundDriver {
  add: (alias: string, url: string) => Promise<unknown> | unknown;
  exists?: (alias: string) => boolean;
  play: (
    alias: string,
    options?: {
      loop?: boolean;
      volume?: number;
      speed?: number;
      complete?: () => void;
    }
  ) => unknown;
  stop: (alias: string) => unknown;
  volume?: (alias: string, volume?: number) => unknown;
}

export class OverviewAmbientAudio {
  private config: AmbientSoundsConfig = DEFAULT_AMBIENT_SOUNDS_CONFIG;
  private readonly loadedAliases = new Set<string>();
  private readonly lastPlayedIndex = new Map<string, number>();
  private readonly tagCooldownsMs = new Map<string, number>();

  private checkElapsedMs = 0;
  private activeBedTag: string | null = null;
  private activeBedAlias: string | null = null;
  private activeBedInstance: any = null;
  private activeOneShotCount = 0;
  private disposed = false;

  private driver: AmbientSoundDriver | null;

  constructor(
    private readonly campaign: OverviewCampaign,
    private readonly settings: BattleSettings,
    driver?: AmbientSoundDriver,
    private readonly rng: () => number = Math.random
  ) {
    this.driver = driver ?? null;
  }

  public setConfig(config: AmbientSoundsConfig): void {
    this.config = config;
  }

  public getConfig(): AmbientSoundsConfig {
    return this.config;
  }

  public async init(configUrl: string = './ambient-sounds.json'): Promise<void> {
    if (typeof fetch === 'function') {
      try {
        const res = await fetch(configUrl);
        if (res.ok) {
          const json = (await res.json()) as Partial<AmbientSoundsConfig>;
          this.config = {
            settings: {
              ...DEFAULT_AMBIENT_SOUNDS_CONFIG.settings,
              ...(json.settings ?? {}),
            },
            beds: { ...DEFAULT_AMBIENT_SOUNDS_CONFIG.beds, ...(json.beds ?? {}) },
            oneShots: {
              ...DEFAULT_AMBIENT_SOUNDS_CONFIG.oneShots,
              ...(json.oneShots ?? {}),
            },
          };
        }
      } catch {
        // Keep default config in offline/test environments
      }
    }
    await this.loadSounds();
  }

  public async loadSounds(): Promise<void> {
    if (!this.driver && typeof document !== 'undefined') {
      try {
        const mod = await import('@pixi/sound');
        this.driver = mod.sound as unknown as AmbientSoundDriver;
      } catch {
        return;
      }
    }
    const driver = this.driver;
    if (!driver || typeof driver.add !== 'function') return;

    const allUrls = new Set<string>();
    for (const list of Object.values(this.config.beds)) {
      for (const u of list) if (u) allUrls.add(u);
    }
    for (const list of Object.values(this.config.oneShots)) {
      for (const u of list) if (u) allUrls.add(u);
    }

    await Promise.all(
      Array.from(allUrls).map(async (url) => {
        if (this.disposed) return;
        try {
          if (typeof driver.exists === 'function' && driver.exists(url)) {
            this.loadedAliases.add(url);
            return;
          }
          await driver.add(url, url);
          this.loadedAliases.add(url);
        } catch {
          // Ignore missing/headless audio errors
        }
      })
    );
  }

  public computeZoomVolumeFactor(
    cameraDistance: number,
    minDistance: number,
    maxDistance: number
  ): number {
    const span = Math.max(0.001, maxDistance - minDistance);
    const t = Math.max(0, Math.min(1, (cameraDistance - minDistance) / span));
    // Zoomed in -> 1.0, zoomed all the way out -> 0.35
    return 1.0 - 0.65 * t;
  }

  public sampleContextAroundHex(centerCoords: Coords | null): AmbientContextSample {
    if (!centerCoords) {
      return { dominantBedTag: null, oneShotTags: [] };
    }

    const radius = Math.max(0, this.config.settings.sampleRadiusHexes);
    const bedCounts = new Map<string, number>();
    const oneShotTagSet = new Set<string>();

    for (let x = 0; x < this.campaign.mapWidth; x++) {
      for (let y = 0; y < this.campaign.mapHeight; y++) {
        const coords = { x, y };
        if (HexMap.getHexDistance(centerCoords, coords) > radius) continue;
        if (!this.campaign.isHexVisible(coords)) continue;

        const hex = this.campaign.getHex(coords);
        if (!hex) continue;

        if ((this.config.beds[hex.terrain]?.length ?? 0) > 0) {
          bedCounts.set(hex.terrain, (bedCounts.get(hex.terrain) ?? 0) + 1);
        }

        if (hex.isSettlement && (this.config.oneShots.settlement?.length ?? 0) > 0) {
          oneShotTagSet.add('settlement');
        }
        if (
          hex.resourceBuilding &&
          (this.config.oneShots[hex.resourceBuilding]?.length ?? 0) > 0
        ) {
          oneShotTagSet.add(hex.resourceBuilding);
        }
        if (
          hex.isAgriculturalPlot &&
          hex.agricultureOption &&
          hex.agricultureOption !== 'none' &&
          (this.config.oneShots[hex.agricultureOption]?.length ?? 0) > 0
        ) {
          oneShotTagSet.add(hex.agricultureOption);
        }
        if ((this.config.oneShots[hex.terrain]?.length ?? 0) > 0) {
          oneShotTagSet.add(hex.terrain);
        }
      }
    }

    let dominantBedTag: string | null = null;
    let bestCount = 0;
    for (const [tag, count] of bedCounts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        dominantBedTag = tag;
      }
    }

    return {
      dominantBedTag,
      oneShotTags: Array.from(oneShotTagSet),
    };
  }

  public pickVariationWithoutRepeat(tag: string, list: string[]): string | null {
    if (!list || list.length === 0) return null;
    if (list.length === 1) {
      this.lastPlayedIndex.set(tag, 0);
      return list[0];
    }

    const lastIdx = this.lastPlayedIndex.get(tag);
    let idx = Math.floor(this.rng() * list.length);
    if (idx === lastIdx) {
      idx = (idx + 1 + Math.floor(this.rng() * (list.length - 1))) % list.length;
    }
    this.lastPlayedIndex.set(tag, idx);
    return list[idx];
  }

  public update(
    deltaMS: number,
    centerCoords: Coords | null,
    cameraDistance: number,
    minDistance: number,
    maxDistance: number
  ): void {
    if (this.disposed) return;

    // Tick down per-tag cooldowns
    for (const [tag, remaining] of this.tagCooldownsMs.entries()) {
      const next = remaining - deltaMS;
      if (next <= 0) {
        this.tagCooldownsMs.delete(tag);
      } else {
        this.tagCooldownsMs.set(tag, next);
      }
    }

    const masterEnabled =
      this.settings.sound.ambientOn && this.settings.sound.ambientVolume > 0;
    const zoomFactor = this.computeZoomVolumeFactor(
      cameraDistance,
      minDistance,
      maxDistance
    );
    const effectiveGain = masterEnabled
      ? this.settings.sound.ambientVolume * zoomFactor
      : 0;

    if (!masterEnabled) {
      this.stopActiveBed();
      return;
    }

    // Smoothly keep active bed volume aligned with zoom & settings
    if (this.activeBedAlias) {
      const targetVol = this.config.settings.bedBaseVolume * effectiveGain;
      if (this.activeBedInstance && typeof this.activeBedInstance.volume === 'number') {
        this.activeBedInstance.volume = targetVol;
      } else if (typeof this.driver?.volume === 'function') {
        this.driver.volume(this.activeBedAlias, targetVol);
      }
    }

    this.checkElapsedMs += deltaMS;
    if (this.checkElapsedMs < this.config.settings.checkIntervalMs) return;
    this.checkElapsedMs = 0;

    const ctx = this.sampleContextAroundHex(centerCoords);

    // 1. Update ambient bed
    if (ctx.dominantBedTag !== this.activeBedTag) {
      this.stopActiveBed();
      if (ctx.dominantBedTag) {
        const list = this.config.beds[ctx.dominantBedTag] ?? [];
        const alias = this.pickVariationWithoutRepeat(`bed:${ctx.dominantBedTag}`, list);
        if (alias && this.isAliasPlayable(alias) && this.driver) {
          this.activeBedTag = ctx.dominantBedTag;
          this.activeBedAlias = alias;
          this.activeBedInstance = this.driver.play(alias, {
            loop: true,
            volume: this.config.settings.bedBaseVolume * effectiveGain,
          });
        }
      }
    }

    // 2. Trigger one-shot ambient sound if slot & ready tag available
    if (
      ctx.oneShotTags.length > 0 &&
      this.activeOneShotCount < this.config.settings.maxConcurrentOneShots
    ) {
      const readyTags = ctx.oneShotTags.filter((t) => !this.tagCooldownsMs.has(t));
      if (readyTags.length > 0) {
        const chosenTag = readyTags[Math.floor(this.rng() * readyTags.length)];
        const list = this.config.oneShots[chosenTag] ?? [];
        const alias = this.pickVariationWithoutRepeat(`one:${chosenTag}`, list);
        if (alias && this.isAliasPlayable(alias) && this.driver) {
          this.activeOneShotCount++;
          const cooldown =
            this.config.settings.minOneShotCooldownMs +
            this.rng() *
              Math.max(
                0,
                this.config.settings.maxOneShotCooldownMs -
                  this.config.settings.minOneShotCooldownMs
              );
          this.tagCooldownsMs.set(chosenTag, cooldown);

          const speed = 0.94 + this.rng() * 0.12;
          const volume =
            this.config.settings.oneShotBaseVolume *
            effectiveGain *
            (0.85 + this.rng() * 0.15);

          let decremented = false;
          const onComplete = () => {
            if (!decremented) {
              decremented = true;
              this.activeOneShotCount = Math.max(0, this.activeOneShotCount - 1);
            }
          };

          const inst = this.driver.play(alias, {
            loop: false,
            volume,
            speed,
            complete: onComplete,
          });
          if (!inst) {
            onComplete();
          }
        }
      }
    }
  }

  private isAliasPlayable(alias: string): boolean {
    if (this.loadedAliases.has(alias)) return true;
    if (typeof this.driver?.exists === 'function') {
      return this.driver.exists(alias);
    }
    return false;
  }

  public stopActiveBed(): void {
    if (this.activeBedAlias && typeof this.driver?.stop === 'function') {
      try {
        this.driver.stop(this.activeBedAlias);
      } catch {
        // Ignore stop errors
      }
    }
    this.activeBedTag = null;
    this.activeBedAlias = null;
    this.activeBedInstance = null;
  }

  public getActiveBedAlias(): string | null {
    return this.activeBedAlias;
  }

  public destroy(): void {
    this.disposed = true;
    this.stopActiveBed();
    this.tagCooldownsMs.clear();
  }
}
