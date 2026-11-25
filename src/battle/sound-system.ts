import { sound } from '@pixi/sound';
import { BattleSettings } from './settings';
import {
  ArrowVolleySoundConfig,
  bindButtonUISound,
  bindSliderUISound,
  computeArrowVolleyVolume,
  computeMovementStepVolume,
  configureArrowVolleySounds,
  configureMovementStepSounds,
  configureSoundGroups,
  configureUISounds,
  configureUnitMovementSounds,
  DEFAULT_ARROW_VOLLEY_SOUND_CONFIG,
  DEFAULT_MOVEMENT_STEP_SOUND_CONFIG,
  getActiveUISoundSystem,
  getArrowVolleySoundsConfig,
  getDefaultSoundEventsFromJson,
  getMovementStepSoundsConfig,
  getSoundGroupsConfig,
  getUISoundsConfig,
  getUnitMovementSoundsConfig,
  MovementStepSoundConfig,
  normalizeArrowVolleyConfig,
  NormalizedArrowVolleySoundConfig,
  NormalizedMovementStepSoundConfig,
  normalizeMovementStepConfig,
  normalizeSoundGroupList,
  normalizeUnitMovementSoundKey,
  normalizeUnitMovementSoundsConfig,
  playUISound,
  registerDefaultUISoundSystemFactory,
  resetArrowVolleySoundsConfig,
  resetMovementStepSoundsConfig,
  resetSoundGroupsConfig,
  resetUISoundsConfig,
  resetUnitMovementSoundsConfig,
  resolveAudioFileUrl,
  resolveUISoundPath,
  setActiveArrowVolleyConfigInternal,
  setActiveMovementStepConfigInternal,
  setActiveSoundGroupsConfigInternal,
  setActiveUISoundConfigInternal,
  setActiveUISoundSystem,
  setActiveUnitMovementSoundsInternal,
  SoundCategory,
  SoundGroupEntryConfig,
  SoundGroupsConfig,
  SoundsConfig,
  SoundType,
  UI_SOUND_TYPE_BY_CATEGORY,
  UI_SOUND_TYPES,
  UISoundCategory,
  UISoundsConfig,
  UnitMovementSoundsConfig,
} from './ui-sounds';

export type {
  UISoundCategory,
  UISoundsConfig,
  SoundGroupEntryConfig,
  SoundGroupsConfig,
  ArrowVolleySoundConfig,
  NormalizedArrowVolleySoundConfig,
  MovementStepSoundConfig,
  NormalizedMovementStepSoundConfig,
  UnitMovementSoundsConfig,
  SoundsConfig,
};
export {
  SoundCategory,
  SoundType,
  DEFAULT_ARROW_VOLLEY_SOUND_CONFIG,
  DEFAULT_MOVEMENT_STEP_SOUND_CONFIG,
  resolveUISoundPath,
  resolveAudioFileUrl,
  normalizeSoundGroupList,
  normalizeArrowVolleyConfig,
  normalizeMovementStepConfig,
  normalizeUnitMovementSoundKey,
  normalizeUnitMovementSoundsConfig,
  computeArrowVolleyVolume,
  computeMovementStepVolume,
  configureUISounds,
  resetUISoundsConfig,
  getUISoundsConfig,
  configureSoundGroups,
  resetSoundGroupsConfig,
  getSoundGroupsConfig,
  configureArrowVolleySounds,
  resetArrowVolleySoundsConfig,
  getArrowVolleySoundsConfig,
  configureMovementStepSounds,
  resetMovementStepSoundsConfig,
  getMovementStepSoundsConfig,
  configureUnitMovementSounds,
  resetUnitMovementSoundsConfig,
  getUnitMovementSoundsConfig,
  setActiveUISoundSystem,
  getActiveUISoundSystem,
  playUISound,
  bindButtonUISound,
  bindSliderUISound,
};

export interface PlaySoundOptions {
  volume?: number;
  speed?: number;
  loop?: boolean;
  fluctuate?: boolean;
}

/**
 * Common sound system interface. Decouples scenes and components
 * from knowledge of underlying sound library and sound asset names.
 */
export interface ISoundSystem {
  play(
    category: SoundCategory,
    type: SoundType,
    options?: PlaySoundOptions | boolean | number,
    volume?: number
  ): void;
  playWithFluctuation?(
    category: SoundCategory,
    type: SoundType,
    optionsOrVolume?: PlaySoundOptions | number
  ): void;
  stop(category: SoundCategory, type?: SoundType): void;
  setSettings?(settings: BattleSettings): void;
  registerSound?(type: SoundType, soundName: string): void;
  getSoundName?(type: SoundType): string | undefined;
  registerSoundGroup?(groupName: string, sounds: string[]): void;
  getSoundGroup?(groupName: string): string[] | undefined;
  getSoundGroups?(): Record<string, string[]>;
  configureSoundGroups?(groups?: SoundGroupsConfig | null): void;
  pickSoundFromGroup?(groupName: string, rng?: () => number): string | undefined;
  configureArrowVolleySounds?(config?: ArrowVolleySoundConfig | null): void;
  getArrowVolleySoundsConfig?(): NormalizedArrowVolleySoundConfig;
  playArrowVolley?(
    shooterCount: number,
    maxSquadSize?: number,
    options?: PlaySoundOptions,
    soundType?: SoundType
  ): number;
  playStoneVolley?(shooterCount: number, maxSquadSize?: number, options?: PlaySoundOptions): number;
  playRangedVolley?(
    soundType: SoundType,
    shooterCount: number,
    maxSquadSize?: number,
    options?: PlaySoundOptions
  ): number;
  configureUnitMovementSounds?(config?: UnitMovementSoundsConfig | null): void;
  getUnitMovementSoundsConfig?(): Record<string, string | null>;
  getUnitMovementSoundGroup?(unitKey: string): string | undefined;
  hasUnitMovementSound?(unitKey: string): boolean;
  configureMovementStepSounds?(config?: MovementStepSoundConfig | null): void;
  getMovementStepSoundsConfig?(): NormalizedMovementStepSoundConfig;
  playUnitMovementSteps?(
    unitKey: string,
    modelCount?: number,
    maxSquadSize?: number,
    options?: PlaySoundOptions
  ): number;
  configureUISounds?(config?: UISoundsConfig | null): void;
  getUISoundsConfig?(): UISoundsConfig;
  loadUISounds?(): Promise<void>;
  loadSoundGroups?(): Promise<void>;
}

export type SoundSystem = ISoundSystem;

/**
 * PixiJS Sound implementation of ISoundSystem.
 */
export class PixiSoundSystem implements ISoundSystem {
  private settings?: BattleSettings;
  private soundMap: Map<SoundType, string>;
  private soundGroups: Map<string, string[]>;
  private uiSoundsConfig: UISoundsConfig;
  private arrowVolleyConfig: NormalizedArrowVolleySoundConfig;
  private unitMovementSounds: Record<string, string | null>;
  private movementStepConfig: NormalizedMovementStepSoundConfig;
  private randomFn: () => number = Math.random;

  constructor(
    settings?: BattleSettings,
    customSoundMap?: Partial<Record<SoundType, string>>,
    uiSoundsConfig?: UISoundsConfig | null,
    soundGroupsConfig?: SoundGroupsConfig | null,
    arrowVolleyConfig?: ArrowVolleySoundConfig | null,
    unitMovementSoundsConfig?: UnitMovementSoundsConfig | null,
    movementStepConfig?: MovementStepSoundConfig | null
  ) {
    this.settings = settings;
    this.uiSoundsConfig = { ...getUISoundsConfig() };
    this.arrowVolleyConfig =
      arrowVolleyConfig !== undefined
        ? normalizeArrowVolleyConfig(arrowVolleyConfig, getArrowVolleySoundsConfig())
        : { ...getArrowVolleySoundsConfig() };
    this.unitMovementSounds =
      unitMovementSoundsConfig !== undefined
        ? normalizeUnitMovementSoundsConfig(unitMovementSoundsConfig)
        : { ...getUnitMovementSoundsConfig() };
    this.movementStepConfig =
      movementStepConfig !== undefined
        ? normalizeMovementStepConfig(movementStepConfig, getMovementStepSoundsConfig())
        : { ...getMovementStepSoundsConfig() };
    this.soundGroups = new Map<string, string[]>();

    const defaultEvents = getDefaultSoundEventsFromJson();
    this.soundMap = new Map<SoundType, string>([
      [SoundType.MOVE, defaultEvents[SoundType.MOVE] ?? 'move'],
      [SoundType.DIE, defaultEvents[SoundType.DIE] ?? 'infantry_death'],
      [SoundType.RETREAT, defaultEvents[SoundType.RETREAT] ?? 'infantry_retreat'],
      [SoundType.HEAL, defaultEvents[SoundType.HEAL] ?? 'heal'],
      [SoundType.SWORD, defaultEvents[SoundType.SWORD] ?? 'sword'],
      [SoundType.ARROW, defaultEvents[SoundType.ARROW] ?? 'arrow'],
      [SoundType.STONE, defaultEvents[SoundType.STONE] ?? 'stone'],
      [SoundType.BATTLE_MUSIC, defaultEvents[SoundType.BATTLE_MUSIC] ?? 'track_dark_whispers'],
    ]);

    const initialGroups = soundGroupsConfig !== undefined ? soundGroupsConfig : getSoundGroupsConfig();
    this.applySoundGroupsToMap(initialGroups);
    this.applyUISoundsToMap(uiSoundsConfig !== undefined ? uiSoundsConfig : this.uiSoundsConfig);

    if (customSoundMap) {
      for (const [type, soundName] of Object.entries(customSoundMap)) {
        if (soundName) {
          this.soundMap.set(type as SoundType, soundName);
        }
      }
    }

    setActiveUISoundSystem(this, settings);
  }

  public setRandomProvider(rng: () => number): void {
    this.randomFn = rng;
  }

  private static readonly HEAL_GROUP_ALIASES = [
    'heal',
    'healing',
    'infantry_heal',
    'mend_wounds',
    'infantry_upgrade_health',
  ];

  private static readonly ARROW_GROUP_ALIASES = [
    'arrow',
    'arrows',
    'arrow_volley',
  ];

  private static readonly STONE_GROUP_ALIASES = [
    'stone',
    'stones',
    'sling',
    'slinger',
    'stone_throw',
    'steinwurf',
  ];

  private applySoundGroupsToMap(groups?: SoundGroupsConfig | null): void {
    if (groups === null) {
      this.soundGroups.clear();
      return;
    }
    if (!groups) {
      return;
    }
    for (const [groupName, groupDef] of Object.entries(groups)) {
      const normalizedList =
        groupDef === null || groupDef === false ? [] : normalizeSoundGroupList(groupDef);
      this.soundGroups.set(groupName, normalizedList);
      if (
        PixiSoundSystem.HEAL_GROUP_ALIASES.includes(groupName) &&
        groupName !== 'heal' &&
        !('heal' in groups)
      ) {
        this.soundGroups.set('heal', [...normalizedList]);
      }
      if (
        PixiSoundSystem.ARROW_GROUP_ALIASES.includes(groupName) &&
        groupName !== 'arrow' &&
        !('arrow' in groups)
      ) {
        this.soundGroups.set('arrow', [...normalizedList]);
      }
      if (
        PixiSoundSystem.STONE_GROUP_ALIASES.includes(groupName) &&
        groupName !== 'stone' &&
        !('stone' in groups)
      ) {
        this.soundGroups.set('stone', [...normalizedList]);
      }
    }
  }

  public registerSoundGroup(groupName: string, sounds: string[]): void {
    const normalizedList = normalizeSoundGroupList(sounds);
    this.soundGroups.set(groupName, normalizedList);
    if (PixiSoundSystem.HEAL_GROUP_ALIASES.includes(groupName) && groupName !== 'heal') {
      this.soundGroups.set('heal', [...normalizedList]);
    }
    if (PixiSoundSystem.ARROW_GROUP_ALIASES.includes(groupName) && groupName !== 'arrow') {
      this.soundGroups.set('arrow', [...normalizedList]);
    }
    if (PixiSoundSystem.STONE_GROUP_ALIASES.includes(groupName) && groupName !== 'stone') {
      this.soundGroups.set('stone', [...normalizedList]);
    }
    setActiveSoundGroupsConfigInternal(this.getSoundGroups());
  }

  public getSoundGroup(groupName: string): string[] | undefined {
    const group = this.soundGroups.get(groupName);
    if (group) {
      return [...group];
    }
    if (PixiSoundSystem.HEAL_GROUP_ALIASES.includes(groupName)) {
      for (const alias of PixiSoundSystem.HEAL_GROUP_ALIASES) {
        const fallback = this.soundGroups.get(alias);
        if (fallback) {
          return [...fallback];
        }
      }
    }
    if (PixiSoundSystem.ARROW_GROUP_ALIASES.includes(groupName)) {
      for (const alias of PixiSoundSystem.ARROW_GROUP_ALIASES) {
        const fallback = this.soundGroups.get(alias);
        if (fallback) {
          return [...fallback];
        }
      }
    }
    if (PixiSoundSystem.STONE_GROUP_ALIASES.includes(groupName)) {
      for (const alias of PixiSoundSystem.STONE_GROUP_ALIASES) {
        const fallback = this.soundGroups.get(alias);
        if (fallback) {
          return [...fallback];
        }
      }
    }
    return undefined;
  }

  public getSoundGroups(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [groupName, list] of this.soundGroups.entries()) {
      result[groupName] = [...list];
    }
    return result;
  }

  public configureSoundGroups(groups?: SoundGroupsConfig | null): void {
    this.applySoundGroupsToMap(groups);
    setActiveSoundGroupsConfigInternal(this.getSoundGroups());
    setActiveUISoundSystem(this, this.settings);
  }

  public configureArrowVolleySounds(config?: ArrowVolleySoundConfig | null): void {
    if (config === null) {
      this.arrowVolleyConfig = { ...DEFAULT_ARROW_VOLLEY_SOUND_CONFIG };
    } else if (config) {
      this.arrowVolleyConfig = normalizeArrowVolleyConfig(config, this.arrowVolleyConfig);
    }
    setActiveArrowVolleyConfigInternal(this.arrowVolleyConfig);
    setActiveUISoundSystem(this, this.settings);
  }

  public getArrowVolleySoundsConfig(): NormalizedArrowVolleySoundConfig {
    return { ...this.arrowVolleyConfig };
  }

  /**
   * Plays a volley of arrow (or other ranged projectile) sounds based on the number of shooters and squad size configuration.
   * Returns the number of sound sources triggered.
   */
  public playArrowVolley(
    shooterCount: number = 1,
    maxSquadSize?: number,
    options?: PlaySoundOptions,
    soundType: SoundType = SoundType.ARROW
  ): number {
    return this.playRangedVolley(soundType, shooterCount, maxSquadSize, options);
  }

  public playStoneVolley(
    shooterCount: number = 1,
    maxSquadSize?: number,
    options?: PlaySoundOptions
  ): number {
    return this.playRangedVolley(SoundType.STONE, shooterCount, maxSquadSize, options);
  }

  private computeInstanceSpeed(
    cfg: {
      vary_pitch: boolean;
      pitch_variation_range: number;
      vary_speed: boolean;
      speed_variation_range: number;
    },
    baseSpeed: number,
    fluctuate?: boolean
  ): number {
    let speedOffset = 0;
    if (cfg.vary_pitch && cfg.vary_speed) {
      const pitchDelta = (this.randomFn() * 2 - 1) * cfg.pitch_variation_range;
      const speedDelta = (this.randomFn() * 2 - 1) * cfg.speed_variation_range;
      speedOffset = (pitchDelta + speedDelta) * 0.5;
    } else if (cfg.vary_pitch) {
      speedOffset = (this.randomFn() * 2 - 1) * cfg.pitch_variation_range;
    } else if (cfg.vary_speed) {
      speedOffset = (this.randomFn() * 2 - 1) * cfg.speed_variation_range;
    } else if (fluctuate) {
      speedOffset = (this.randomFn() * 2 - 1) * 0.1;
    }
    return Math.max(0.25, Math.min(3.0, baseSpeed + speedOffset));
  }

  public configureUnitMovementSounds(config?: UnitMovementSoundsConfig | null): void {
    if (config === null) {
      this.unitMovementSounds = {};
    } else if (config) {
      this.unitMovementSounds = {
        ...this.unitMovementSounds,
        ...normalizeUnitMovementSoundsConfig(config),
      };
    }
    setActiveUnitMovementSoundsInternal(this.unitMovementSounds);
    setActiveUISoundSystem(this, this.settings);
  }

  public getUnitMovementSoundsConfig(): Record<string, string | null> {
    return { ...this.unitMovementSounds };
  }

  public getUnitMovementSoundGroup(unitKey: string): string | undefined {
    const normalized = normalizeUnitMovementSoundKey(unitKey);
    if (!normalized) return undefined;
    const direct = this.unitMovementSounds[normalized];
    if (direct === null) return undefined;
    if (typeof direct === 'string' && direct !== '') return direct;
    // Also check collapsed form (e.g. "Mace Man" -> "mace-man" -> "maceman")
    const collapsed = normalized.replace(/-/g, '');
    const collapsedVal = this.unitMovementSounds[collapsed];
    if (typeof collapsedVal === 'string' && collapsedVal !== '') return collapsedVal;
    return undefined;
  }

  public hasUnitMovementSound(unitKey: string): boolean {
    const groupName = this.getUnitMovementSoundGroup(unitKey);
    if (!groupName) return false;
    const list = this.soundGroups.get(groupName) ?? this.getSoundGroup(groupName);
    return Array.isArray(list) && list.length > 0;
  }

  public configureMovementStepSounds(config?: MovementStepSoundConfig | null): void {
    if (config === null) {
      this.movementStepConfig = { ...DEFAULT_MOVEMENT_STEP_SOUND_CONFIG };
    } else if (config) {
      this.movementStepConfig = normalizeMovementStepConfig(config, this.movementStepConfig);
    }
    setActiveMovementStepConfigInternal(this.movementStepConfig);
    setActiveUISoundSystem(this, this.settings);
  }

  public getMovementStepSoundsConfig(): NormalizedMovementStepSoundConfig {
    return { ...this.movementStepConfig };
  }

  /**
   * Plays unit movement step sounds from the configured group for `unitKey`,
   * layered across multiple sources with small delay/pitch/speed variations.
   */
  public playUnitMovementSteps(
    unitKey: string,
    modelCount: number = 1,
    maxSquadSize?: number,
    options?: PlaySoundOptions
  ): number {
    if (this.settings && !this.settings.sound.soundOn) {
      return 0;
    }
    const groupName = this.getUnitMovementSoundGroup(unitKey);
    if (!groupName) {
      return 0;
    }
    const maxSounds = Math.max(0, Math.floor(this.movementStepConfig.max_step_sounds));
    if (maxSounds <= 0) {
      return 0;
    }

    const normalizedModels = Math.max(1, Math.floor(Number.isFinite(modelCount) ? modelCount : 1));
    const count = Math.min(normalizedModels, maxSounds);
    const baseVolume = options?.volume ?? this.settings?.sound.soundVolume ?? 0.75;
    const squadVolume = computeMovementStepVolume(
      normalizedModels,
      baseVolume,
      this.movementStepConfig,
      maxSquadSize
    );
    const sourceVolume = squadVolume / Math.sqrt(Math.max(1, count));
    const baseSpeed = options?.speed ?? 1.0;

    let playedCount = 0;
    for (let i = 0; i < count; i++) {
      const chosenSound = this.pickSoundFromGroup(groupName);
      if (!chosenSound) {
        continue;
      }
      const instanceSpeed = this.computeInstanceSpeed(this.movementStepConfig, baseSpeed, options?.fluctuate);
      const jitter =
        this.movementStepConfig.stagger_jitter_ms > 0
          ? this.randomFn() * this.movementStepConfig.stagger_jitter_ms
          : 0;
      const delayMs =
        i === 0 ? 0 : Math.max(0, Math.round(i * this.movementStepConfig.stagger_delay_ms + jitter));

      const triggerPlay = () => {
        try {
          sound.play(chosenSound, { speed: instanceSpeed, volume: sourceVolume });
        } catch (err) {
          console.warn(`[PixiSoundSystem] Failed to play movement step '${chosenSound}':`, err);
        }
      };

      if (delayMs > 0 && typeof setTimeout === 'function') {
        setTimeout(triggerPlay, delayMs);
      } else {
        triggerPlay();
      }
      playedCount++;
    }

    return playedCount;
  }

  public playRangedVolley(
    soundType: SoundType,
    shooterCount: number = 1,
    maxSquadSize?: number,
    options?: PlaySoundOptions
  ): number {
    if (this.settings && !this.settings.sound.soundOn) {
      return 0;
    }

    const maxSounds = Math.max(0, Math.floor(this.arrowVolleyConfig.max_volley_sounds));
    if (maxSounds <= 0) {
      return 0;
    }

    const normalizedShooters = Math.max(1, Math.floor(Number.isFinite(shooterCount) ? shooterCount : 1));
    const count = Math.min(normalizedShooters, maxSounds);
    const baseVolume = options?.volume ?? this.settings?.sound.soundVolume ?? 0.75;
    const volleyVolume = computeArrowVolleyVolume(
      normalizedShooters,
      baseVolume,
      this.arrowVolleyConfig,
      maxSquadSize
    );
    const baseSpeed = options?.speed ?? 1.0;

    let playedCount = 0;
    for (let i = 0; i < count; i++) {
      const instanceSpeed = this.computeInstanceSpeed(this.arrowVolleyConfig, baseSpeed, options?.fluctuate);
      const delayMs = i * Math.max(0, this.arrowVolleyConfig.stagger_delay_ms);

      if (delayMs > 0 && typeof setTimeout === 'function') {
        setTimeout(() => {
          this.play(SoundCategory.SOUND, soundType, {
            ...options,
            speed: instanceSpeed,
            volume: volleyVolume,
            fluctuate: false,
          });
        }, delayMs);
      } else {
        this.play(SoundCategory.SOUND, soundType, {
          ...options,
          speed: instanceSpeed,
          volume: volleyVolume,
          fluctuate: false,
        });
      }
      playedCount++;
    }

    return playedCount;
  }

  public pickSoundFromGroup(groupName: string, rng?: () => number): string | undefined {
    const list = this.soundGroups.get(groupName) ?? this.getSoundGroup(groupName);
    if (!list || list.length === 0) {
      return undefined;
    }
    const rand = (rng ?? this.randomFn)();
    const index = Math.min(list.length - 1, Math.max(0, Math.floor(rand * list.length)));
    return list[index];
  }

  private applyUISoundsToMap(config?: UISoundsConfig | null): void {
    const categories: UISoundCategory[] = ['hover', 'click', 'select'];
    if (config === null) {
      this.uiSoundsConfig = { hover: null, click: null, select: null };
      for (const cat of categories) {
        this.soundMap.delete(UI_SOUND_TYPE_BY_CATEGORY[cat]);
      }
      return;
    }

    if (config) {
      for (const cat of categories) {
        if (cat in config) {
          this.uiSoundsConfig[cat] = resolveUISoundPath(config[cat]);
        }
      }
    }

    for (const cat of categories) {
      const soundType = UI_SOUND_TYPE_BY_CATEGORY[cat];
      const resolved = resolveUISoundPath(this.uiSoundsConfig[cat]);
      this.uiSoundsConfig[cat] = resolved;
      if (resolved) {
        this.soundMap.set(soundType, resolved);
      } else {
        this.soundMap.delete(soundType);
      }
    }
  }

  public configureUISounds(config?: UISoundsConfig | null): void {
    this.applyUISoundsToMap(config);
    setActiveUISoundConfigInternal(this.uiSoundsConfig);
    setActiveUISoundSystem(this, this.settings);
  }

  public getUISoundsConfig(): UISoundsConfig {
    return { ...this.uiSoundsConfig };
  }

  public async loadUISounds(): Promise<void> {
    if (typeof (sound as any)?.add !== 'function') {
      return;
    }
    const categories: UISoundCategory[] = ['hover', 'click', 'select'];
    const addedPaths = new Set<string>();
    for (const cat of categories) {
      const resolved = resolveUISoundPath(this.uiSoundsConfig[cat]);
      if (resolved && !addedPaths.has(resolved)) {
        addedPaths.add(resolved);
        try {
          await sound.add(resolved, resolved);
        } catch {
          // Ignore in headless/offline environments
        }
      }
    }
  }

  public async loadSoundGroups(): Promise<void> {
    if (typeof (sound as any)?.add !== 'function') {
      return;
    }
    const addedKeys = new Set<string>();
    for (const list of this.soundGroups.values()) {
      for (const entry of list) {
        if (!entry || addedKeys.has(entry)) continue;
        addedKeys.add(entry);
        const url = resolveAudioFileUrl(entry);
        try {
          await sound.add(entry, url);
        } catch {
          // Ignore in headless/offline environments
        }
      }
    }
  }

  public setSettings(settings: BattleSettings): void {
    this.settings = settings;
  }

  public registerSound(type: SoundType, soundName: string): void {
    if (!soundName) {
      this.soundMap.delete(type);
      return;
    }
    this.soundMap.set(type, soundName);
  }

  public getSoundName(type: SoundType): string | undefined {
    return this.soundMap.get(type);
  }

  private resolveSoundToPlay(type: SoundType): { soundName?: string; isEmptyGroup: boolean } {
    const mapped =
      this.soundMap.get(type) ??
      (this.soundGroups.has(type as unknown as string) ? (type as unknown as string) : undefined);
    if (!mapped) {
      return { soundName: undefined, isEmptyGroup: false };
    }
    if (this.soundGroups.has(mapped)) {
      const chosen = this.pickSoundFromGroup(mapped);
      return { soundName: chosen, isEmptyGroup: !chosen };
    }
    return { soundName: mapped, isEmptyGroup: false };
  }

  public play(
    category: SoundCategory,
    type: SoundType,
    optionsOrSpeedOrFluctuate?: PlaySoundOptions | boolean | number,
    optVolume?: number
  ): void {
    const { soundName, isEmptyGroup } = this.resolveSoundToPlay(type);
    if (!soundName) {
      if (!UI_SOUND_TYPES.has(type) && !isEmptyGroup) {
        console.warn(`[PixiSoundSystem] No sound registered for type: ${type}`);
      }
      return;
    }

    let speed: number | undefined;
    let volume: number | undefined;
    let loop: boolean | undefined;
    let fluctuate: boolean | undefined;

    if (typeof optionsOrSpeedOrFluctuate === 'number') {
      speed = optionsOrSpeedOrFluctuate;
      volume = optVolume;
    } else if (typeof optionsOrSpeedOrFluctuate === 'boolean') {
      fluctuate = optionsOrSpeedOrFluctuate;
      volume = optVolume;
    } else if (typeof optionsOrSpeedOrFluctuate === 'object' && optionsOrSpeedOrFluctuate !== null) {
      speed = optionsOrSpeedOrFluctuate.speed;
      volume = optionsOrSpeedOrFluctuate.volume ?? optVolume;
      loop = optionsOrSpeedOrFluctuate.loop;
      fluctuate = optionsOrSpeedOrFluctuate.fluctuate;
    }

    if (category === SoundCategory.MUSIC) {
      if (this.settings && !this.settings.sound.musicOn) {
        return;
      }
      const finalVolume = volume ?? this.settings?.sound.musicVolume ?? 0.15;
      const finalLoop = loop ?? true;
      try {
        sound.stop(soundName);
        const playOptions: { loop?: boolean; volume?: number; speed?: number } = {
          loop: finalLoop,
          volume: finalVolume,
        };
        if (speed !== undefined) {
          playOptions.speed = speed;
        }
        sound.play(soundName, playOptions);
      } catch (err) {
        console.warn(`[PixiSoundSystem] Failed to play music '${soundName}':`, err);
      }
    } else if (category === SoundCategory.SOUND) {
      if (this.settings && !this.settings.sound.soundOn) {
        return;
      }
      const finalVolume = volume ?? this.settings?.sound.soundVolume ?? 0.75;
      const finalSpeed = speed ?? (fluctuate ? (0.9 + Math.random() * 0.2) : 1.0);
      try {
        sound.play(soundName, { speed: finalSpeed, volume: finalVolume });
      } catch (err) {
        console.warn(`[PixiSoundSystem] Failed to play sound '${soundName}':`, err);
      }
    } else if (category === SoundCategory.AMBIENT) {
      if (this.settings && !this.settings.sound.ambientOn) {
        return;
      }
      const finalVolume = volume ?? this.settings?.sound.ambientVolume ?? 0.75;
      const finalSpeed = speed ?? 1.0;
      try {
        const playOptions: { loop?: boolean; volume?: number; speed?: number } = {
          volume: finalVolume,
          speed: finalSpeed,
        };
        if (loop !== undefined) {
          playOptions.loop = loop;
        }
        sound.play(soundName, playOptions);
      } catch (err) {
        console.warn(`[PixiSoundSystem] Failed to play ambient '${soundName}':`, err);
      }
    }
  }

  public playWithFluctuation(
    category: SoundCategory,
    type: SoundType,
    optionsOrVolume?: PlaySoundOptions | number
  ): void {
    if (typeof optionsOrVolume === 'number') {
      this.play(category, type, { volume: optionsOrVolume, fluctuate: true });
    } else {
      this.play(category, type, { ...optionsOrVolume, fluctuate: true });
    }
  }

  public stop(category: SoundCategory, type?: SoundType): void {
    if (type !== undefined) {
      const mapped =
        this.soundMap.get(type) ??
        (this.soundGroups.has(type as unknown as string) ? (type as unknown as string) : undefined);
      if (mapped) {
        if (this.soundGroups.has(mapped)) {
          for (const s of this.soundGroups.get(mapped) ?? []) {
            try {
              sound.stop(s);
            } catch {}
          }
        } else {
          try {
            sound.stop(mapped);
          } catch {}
        }
      }
    } else {
      if (category === SoundCategory.MUSIC) {
        const musicSound = this.soundMap.get(SoundType.BATTLE_MUSIC);
        if (musicSound) {
          try {
            sound.stop(musicSound);
          } catch {}
        }
      } else {
        for (const [st, soundName] of this.soundMap.entries()) {
          if (st !== SoundType.BATTLE_MUSIC) {
            if (this.soundGroups.has(soundName)) {
              for (const s of this.soundGroups.get(soundName) ?? []) {
                try {
                  sound.stop(s);
                } catch {}
              }
            } else {
              try {
                sound.stop(soundName);
              } catch {}
            }
          }
        }
      }
    }
  }
}

export class BattleSoundSystem extends PixiSoundSystem {}

registerDefaultUISoundSystemFactory(
  (settings, config) => new PixiSoundSystem(settings, undefined, config)
);
