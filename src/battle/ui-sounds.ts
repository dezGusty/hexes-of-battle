import { BattleSettings } from './settings';
import type { ISoundSystem } from './sound-system';

function tryLoadPublicJsonFromDisk(relativePath: string): any {
  try {
    const proc = (globalThis as any).process;
    if (proc?.versions?.node) {
      const req = (globalThis as any).require;
      if (typeof req === 'function') {
        const fs = req('fs');
        const path = req('path');
        const fullPath = path.resolve(proc.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
          return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        }
      }
    }
  } catch {
    // Ignore in browser or when bundler treeshakes
  }
  return undefined;
}

const defaultHudConfig: any = tryLoadPublicJsonFromDisk('public/hud.json') ?? {
  sounds: {
    hover: 'audio/ui/mouse_hover_subtle_foley_001.ogg',
    click: 'audio/ui/mouse_click_foley_003.ogg',
    select: 'audio/ui/mouse_select_foley_001.ogg',
  },
  soundGroups: {
    infantry_death: ['infantry_death_c.ogg', 'infantry_death_e.ogg'],
    infantry_retreat: ['infantry_retreat_a.ogg', 'infantry_retreat_c.ogg'],
    heal: ['infantry_upgrade_health_c.ogg'],
    arrow: ['arrow.ogg', 'arrow_2.ogg', 'arrow_3.ogg'],
    stone: [
      '47495__kwandalist__steinwurf_1.ogg',
      '47495__kwandalist__steinwurf_2.ogg',
      '47495__kwandalist__steinwurf_3.ogg',
    ],
  },
  arrowVolley: {
    max_volley_sounds: 10,
    vary_pitch: true,
    vary_speed: true,
    pitch_variation_range: 0.1,
    speed_variation_range: 0.1,
    scale_volume_by_squad_size: true,
    min_squad_volume_factor: 0.35,
    max_squad_volume_factor: 1.0,
    reference_squad_size: 12,
    stagger_delay_ms: 0,
  },
};

const defaultSoundsConfig: any = tryLoadPublicJsonFromDisk('public/sounds.json') ?? {
  soundGroups: {
    infantry_death: ['infantry_death_c.ogg', 'infantry_death_e.ogg'],
    infantry_retreat: ['infantry_retreat_a.ogg', 'infantry_retreat_c.ogg'],
    heal: ['infantry_upgrade_health_c.ogg'],
    arrow: ['arrow.ogg', 'arrow_2.ogg', 'arrow_3.ogg'],
    stone: [
      '47495__kwandalist__steinwurf_1.ogg',
      '47495__kwandalist__steinwurf_2.ogg',
      '47495__kwandalist__steinwurf_3.ogg',
    ],
  },
  arrowVolley: {
    max_volley_sounds: 10,
    vary_pitch: true,
    vary_speed: true,
    pitch_variation_range: 0.1,
    speed_variation_range: 0.1,
    scale_volume_by_squad_size: true,
    min_squad_volume_factor: 0.35,
    max_squad_volume_factor: 1.0,
    reference_squad_size: 12,
    stagger_delay_ms: 0,
  },
  events: {
    MOVE: 'move',
    DIE: 'infantry_death',
    RETREAT: 'infantry_retreat',
    HEAL: 'heal',
    SWORD: 'sword',
    ARROW: 'arrow',
    STONE: 'stone',
    BATTLE_MUSIC: 'track_dark_whispers',
  },
  ui: {
    hover: 'audio/ui/mouse_hover_subtle_foley_001.ogg',
    click: 'audio/ui/mouse_click_foley_003.ogg',
    select: 'audio/ui/mouse_select_foley_001.ogg',
  },
};

const defaultCombatConfig: any = tryLoadPublicJsonFromDisk('public/combat_config.json') ?? {};

export enum SoundCategory {
  MUSIC = 'MUSIC',
  SOUND = 'SOUND',
}

export enum SoundType {
  MOVE = 'MOVE',
  DIE = 'DIE',
  RETREAT = 'RETREAT',
  HEAL = 'HEAL',
  SWORD = 'SWORD',
  ARROW = 'ARROW',
  STONE = 'STONE',
  BATTLE_MUSIC = 'BATTLE_MUSIC',
  UI_HOVER = 'UI_HOVER',
  UI_CLICK = 'UI_CLICK',
  UI_SELECT = 'UI_SELECT',
  // Convenience aliases
  INFANTRY_DEATH = 'DIE',
  INFANTRY_RETREAT = 'RETREAT',
  FLEE = 'RETREAT',
  HEALING = 'HEAL',
  MEND_WOUNDS = 'HEAL',
  INFANTRY_HEAL = 'HEAL',
  SLING = 'STONE',
  SLINGER = 'STONE',
  STONE_THROW = 'STONE',
  MUSIC = 'BATTLE_MUSIC',
  ATTACK_MELEE = 'SWORD',
  ATTACK_RANGED = 'ARROW',
}

export type UISoundCategory = 'hover' | 'click' | 'select';

export interface UISoundsConfig {
  hover?: string | null | false;
  click?: string | null | false;
  select?: string | null | false;
}

export type SoundGroupEntryConfig = string[] | { sounds: string[] } | null | false;
export type SoundGroupsConfig = Record<string, SoundGroupEntryConfig>;

export interface ArrowVolleySoundConfig {
  max_volley_sounds?: number;
  maxVolleySounds?: number;
  vary_pitch?: boolean;
  varyPitch?: boolean;
  pitch_variation_range?: number;
  pitchVariationRange?: number;
  vary_speed?: boolean;
  varySpeed?: boolean;
  speed_variation_range?: number;
  speedVariationRange?: number;
  scale_volume_by_squad_size?: boolean;
  scaleVolumeBySquadSize?: boolean;
  min_squad_volume_factor?: number;
  minSquadVolumeFactor?: number;
  max_squad_volume_factor?: number;
  maxSquadVolumeFactor?: number;
  reference_squad_size?: number;
  referenceSquadSize?: number;
  volume_multiplier?: number;
  volumeMultiplier?: number;
  stagger_delay_ms?: number;
  staggerDelayMs?: number;
}

export interface NormalizedArrowVolleySoundConfig {
  max_volley_sounds: number;
  vary_pitch: boolean;
  pitch_variation_range: number;
  vary_speed: boolean;
  speed_variation_range: number;
  scale_volume_by_squad_size: boolean;
  min_squad_volume_factor: number;
  max_squad_volume_factor: number;
  reference_squad_size: number;
  volume_multiplier: number;
  stagger_delay_ms: number;
}

export const DEFAULT_ARROW_VOLLEY_SOUND_CONFIG: NormalizedArrowVolleySoundConfig = {
  max_volley_sounds: 10,
  vary_pitch: true,
  pitch_variation_range: 0.1,
  vary_speed: true,
  speed_variation_range: 0.1,
  scale_volume_by_squad_size: true,
  min_squad_volume_factor: 0.35,
  max_squad_volume_factor: 1.0,
  reference_squad_size: 12,
  volume_multiplier: 1.0,
  stagger_delay_ms: 0,
};

export interface SoundsConfig {
  soundGroups?: SoundGroupsConfig;
  groups?: SoundGroupsConfig;
  arrowVolley?: ArrowVolleySoundConfig;
  arrow_volley?: ArrowVolleySoundConfig;
  events?: Partial<Record<string, string | null | false>>;
  ui?: UISoundsConfig;
  sounds?: UISoundsConfig;
}

export const UI_SOUND_TYPE_BY_CATEGORY: Record<UISoundCategory, SoundType> = {
  hover: SoundType.UI_HOVER,
  click: SoundType.UI_CLICK,
  select: SoundType.UI_SELECT,
};

export const UI_SOUND_TYPES = new Set<SoundType>([
  SoundType.UI_HOVER,
  SoundType.UI_CLICK,
  SoundType.UI_SELECT,
]);

export function resolveUISoundPath(value: string | null | false | undefined): string | null {
  if (value === null || value === false || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'off' ||
    trimmed.toLowerCase() === 'false' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return null;
  }
  let normalized = trimmed;
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  if (!normalized.includes('/') && /\.(ogg|mp3|wav|flac|m4a|webm)$/i.test(normalized)) {
    normalized = `audio/ui/${normalized}`;
  }
  return normalized;
}

export function resolveAudioFileUrl(soundEntry: string): string {
  let normalized = soundEntry.trim();
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice(7);
  }
  if (!normalized.includes('/') && /\.(ogg|mp3|wav|flac|m4a|webm)$/i.test(normalized)) {
    return `audio/${normalized}`;
  }
  return normalized;
}

export function normalizeSoundGroupList(entry: SoundGroupEntryConfig | undefined): string[] {
  if (!entry) {
    return [];
  }
  const rawList = Array.isArray(entry)
    ? entry
    : Array.isArray((entry as { sounds?: string[] }).sounds)
      ? (entry as { sounds: string[] }).sounds
      : [];
  const result: string[] = [];
  for (const item of rawList) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (
        trimmed !== '' &&
        trimmed.toLowerCase() !== 'none' &&
        trimmed.toLowerCase() !== 'off' &&
        trimmed.toLowerCase() !== 'false' &&
        trimmed.toLowerCase() !== 'null'
      ) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

export function getDefaultUISoundsFromHudJson(): UISoundsConfig {
  const raw =
    (defaultHudConfig as any)?.sounds ??
    (defaultHudConfig as any)?.uiSounds ??
    (defaultSoundsConfig as any)?.ui ??
    {};
  return {
    hover: resolveUISoundPath(raw.hover),
    click: resolveUISoundPath(raw.click),
    select: resolveUISoundPath(raw.select),
  };
}

export function getDefaultSoundGroupsFromJson(): Record<string, string[]> {
  const mergedRaw: SoundGroupsConfig = {
    ...((defaultCombatConfig as any)?.soundGroups ?? {}),
    ...((defaultHudConfig as any)?.soundGroups ?? {}),
    ...((defaultSoundsConfig as any)?.soundGroups ?? (defaultSoundsConfig as any)?.groups ?? {}),
  };
  const groups: Record<string, string[]> = {};
  for (const [groupName, groupDef] of Object.entries(mergedRaw)) {
    groups[groupName] = normalizeSoundGroupList(groupDef);
  }
  return groups;
}

export function getDefaultSoundEventsFromJson(): Partial<Record<SoundType, string>> {
  const rawEvents: Record<string, string> = {
    MOVE: 'move',
    DIE: 'infantry_death',
    RETREAT: 'infantry_retreat',
    HEAL: 'heal',
    SWORD: 'sword',
    ARROW: 'arrow',
    STONE: 'stone',
    BATTLE_MUSIC: 'track_dark_whispers',
    ...((defaultHudConfig as any)?.soundEvents ?? {}),
    ...((defaultSoundsConfig as any)?.events ?? {}),
  };
  const result: Partial<Record<SoundType, string>> = {};
  for (const [key, val] of Object.entries(rawEvents)) {
    if (typeof val === 'string' && val.trim() !== '') {
      result[key as SoundType] = val.trim();
    }
  }
  return result;
}

export function normalizeArrowVolleyConfig(
  raw?: ArrowVolleySoundConfig | null,
  base: NormalizedArrowVolleySoundConfig = DEFAULT_ARROW_VOLLEY_SOUND_CONFIG
): NormalizedArrowVolleySoundConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...base };
  }
  const maxVolley = raw.max_volley_sounds ?? raw.maxVolleySounds ?? base.max_volley_sounds;
  const varyPitch = raw.vary_pitch ?? raw.varyPitch ?? base.vary_pitch;
  const pitchRange = raw.pitch_variation_range ?? raw.pitchVariationRange ?? base.pitch_variation_range;
  const varySpeed = raw.vary_speed ?? raw.varySpeed ?? base.vary_speed;
  const speedRange = raw.speed_variation_range ?? raw.speedVariationRange ?? base.speed_variation_range;
  const scaleBySquad = raw.scale_volume_by_squad_size ?? raw.scaleVolumeBySquadSize ?? base.scale_volume_by_squad_size;
  const minSquadVol = raw.min_squad_volume_factor ?? raw.minSquadVolumeFactor ?? base.min_squad_volume_factor;
  const maxSquadVol = raw.max_squad_volume_factor ?? raw.maxSquadVolumeFactor ?? base.max_squad_volume_factor;
  const refSquadSize = raw.reference_squad_size ?? raw.referenceSquadSize ?? base.reference_squad_size;
  const volMult = raw.volume_multiplier ?? raw.volumeMultiplier ?? base.volume_multiplier;
  const staggerMs = raw.stagger_delay_ms ?? raw.staggerDelayMs ?? base.stagger_delay_ms;

  return {
    max_volley_sounds: Math.max(0, Math.floor(Number.isFinite(maxVolley) ? maxVolley : base.max_volley_sounds)),
    vary_pitch: Boolean(varyPitch),
    pitch_variation_range: Math.max(0, Number.isFinite(pitchRange) ? pitchRange : base.pitch_variation_range),
    vary_speed: Boolean(varySpeed),
    speed_variation_range: Math.max(0, Number.isFinite(speedRange) ? speedRange : base.speed_variation_range),
    scale_volume_by_squad_size: Boolean(scaleBySquad),
    min_squad_volume_factor: Math.max(0, Math.min(1, Number.isFinite(minSquadVol) ? minSquadVol : base.min_squad_volume_factor)),
    max_squad_volume_factor: Math.max(0, Math.min(2, Number.isFinite(maxSquadVol) ? maxSquadVol : base.max_squad_volume_factor)),
    reference_squad_size: Math.max(1, Math.floor(Number.isFinite(refSquadSize) ? refSquadSize : base.reference_squad_size)),
    volume_multiplier: Math.max(0, Number.isFinite(volMult) ? volMult : base.volume_multiplier),
    stagger_delay_ms: Math.max(0, Number.isFinite(staggerMs) ? staggerMs : base.stagger_delay_ms),
  };
}

export function getDefaultArrowVolleyConfigFromJson(): NormalizedArrowVolleySoundConfig {
  const mergedRaw: ArrowVolleySoundConfig = {
    ...((defaultCombatConfig as any)?.arrowVolley ?? (defaultCombatConfig as any)?.arrow_volley ?? {}),
    ...((defaultHudConfig as any)?.arrowVolley ?? (defaultHudConfig as any)?.arrow_volley ?? {}),
    ...((defaultSoundsConfig as any)?.arrowVolley ?? (defaultSoundsConfig as any)?.arrow_volley ?? {}),
  };
  return normalizeArrowVolleyConfig(mergedRaw, DEFAULT_ARROW_VOLLEY_SOUND_CONFIG);
}

export function computeArrowVolleyVolume(
  shooterCount: number,
  baseVolume: number,
  config: NormalizedArrowVolleySoundConfig,
  maxSquadSize?: number
): number {
  const clampedCount = Math.max(1, shooterCount);
  let squadFactor = 1.0;
  if (config.scale_volume_by_squad_size) {
    const refSize = Math.max(2, config.reference_squad_size);
    const sizeRatio = Math.min(1, Math.max(0, (clampedCount - 1) / (refSize - 1)));
    const healthRatio =
      maxSquadSize && maxSquadSize > 1
        ? Math.min(1, Math.max(0, clampedCount / maxSquadSize))
        : 1.0;
    const combinedRatio = sizeRatio * 0.75 + healthRatio * sizeRatio * 0.25;
    squadFactor =
      config.min_squad_volume_factor +
      (config.max_squad_volume_factor - config.min_squad_volume_factor) * combinedRatio;
  }
  return Math.max(0, Math.min(1, baseVolume * squadFactor * config.volume_multiplier));
}

let activeUISoundsConfig: UISoundsConfig = getDefaultUISoundsFromHudJson();
let activeSoundGroupsConfig: Record<string, string[]> = getDefaultSoundGroupsFromJson();
let activeArrowVolleyConfig: NormalizedArrowVolleySoundConfig = getDefaultArrowVolleyConfigFromJson();
let activeUISoundSystem: ISoundSystem | undefined;
let activeUISoundSettings: BattleSettings | undefined;
let defaultSoundSystemFactory:
  | ((settings?: BattleSettings, config?: UISoundsConfig) => ISoundSystem)
  | undefined;

const boundUIButtons = new WeakSet<object>();
const boundUISliders = new WeakSet<object>();

export function registerDefaultUISoundSystemFactory(
  factory: (settings?: BattleSettings, config?: UISoundsConfig) => ISoundSystem
): void {
  defaultSoundSystemFactory = factory;
}

export function getActiveUISoundSettings(): BattleSettings | undefined {
  return activeUISoundSettings;
}

export function setActiveUISoundConfigInternal(config: UISoundsConfig): void {
  activeUISoundsConfig = { ...config };
}

export function setActiveSoundGroupsConfigInternal(groups: Record<string, string[]>): void {
  activeSoundGroupsConfig = {};
  for (const [k, v] of Object.entries(groups)) {
    activeSoundGroupsConfig[k] = [...v];
  }
}

export function setActiveArrowVolleyConfigInternal(config: NormalizedArrowVolleySoundConfig): void {
  activeArrowVolleyConfig = { ...config };
}

export function configureArrowVolleySounds(
  config?: ArrowVolleySoundConfig | null,
  soundSystem?: ISoundSystem
): NormalizedArrowVolleySoundConfig {
  if (soundSystem) {
    activeUISoundSystem = soundSystem;
  }
  if (config === null) {
    activeArrowVolleyConfig = { ...DEFAULT_ARROW_VOLLEY_SOUND_CONFIG };
  } else if (config) {
    activeArrowVolleyConfig = normalizeArrowVolleyConfig(config, activeArrowVolleyConfig);
  }
  if (activeUISoundSystem?.configureArrowVolleySounds) {
    activeUISoundSystem.configureArrowVolleySounds(activeArrowVolleyConfig);
  }
  return { ...activeArrowVolleyConfig };
}

export function resetArrowVolleySoundsConfig(): NormalizedArrowVolleySoundConfig {
  activeArrowVolleyConfig = getDefaultArrowVolleyConfigFromJson();
  if (activeUISoundSystem?.configureArrowVolleySounds) {
    activeUISoundSystem.configureArrowVolleySounds(activeArrowVolleyConfig);
  }
  return { ...activeArrowVolleyConfig };
}

export function getArrowVolleySoundsConfig(): NormalizedArrowVolleySoundConfig {
  return { ...activeArrowVolleyConfig };
}

export function configureSoundGroups(
  groups?: SoundGroupsConfig | null,
  soundSystem?: ISoundSystem
): Record<string, string[]> {
  if (soundSystem) {
    activeUISoundSystem = soundSystem;
  }

  if (groups === null) {
    activeSoundGroupsConfig = {};
  } else if (groups) {
    const nextGroups: Record<string, string[]> = { ...activeSoundGroupsConfig };
    for (const [groupName, groupDef] of Object.entries(groups)) {
      if (groupDef === null || groupDef === false) {
        nextGroups[groupName] = [];
      } else {
        nextGroups[groupName] = normalizeSoundGroupList(groupDef);
      }
    }
    activeSoundGroupsConfig = nextGroups;
  }

  if (activeUISoundSystem?.configureSoundGroups) {
    activeUISoundSystem.configureSoundGroups(groups);
  } else if (activeUISoundSystem?.registerSoundGroup && groups) {
    for (const [groupName, list] of Object.entries(activeSoundGroupsConfig)) {
      activeUISoundSystem.registerSoundGroup(groupName, list);
    }
  }

  const copy: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(activeSoundGroupsConfig)) {
    copy[k] = [...v];
  }
  return copy;
}

export function resetSoundGroupsConfig(): Record<string, string[]> {
  activeSoundGroupsConfig = getDefaultSoundGroupsFromJson();
  if (activeUISoundSystem?.configureSoundGroups) {
    activeUISoundSystem.configureSoundGroups(activeSoundGroupsConfig);
  }
  const copy: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(activeSoundGroupsConfig)) {
    copy[k] = [...v];
  }
  return copy;
}

export function getSoundGroupsConfig(): Record<string, string[]> {
  const copy: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(activeSoundGroupsConfig)) {
    copy[k] = [...v];
  }
  return copy;
}

export function configureUISounds(
  config?: UISoundsConfig | null,
  soundSystem?: ISoundSystem,
  settings?: BattleSettings
): UISoundsConfig {
  if (settings) {
    activeUISoundSettings = settings;
  }
  if (soundSystem) {
    activeUISoundSystem = soundSystem;
  }

  const categories: UISoundCategory[] = ['hover', 'click', 'select'];
  if (config === null) {
    activeUISoundsConfig = { hover: null, click: null, select: null };
  } else if (config) {
    const nextConfig: UISoundsConfig = { ...activeUISoundsConfig };
    for (const cat of categories) {
      if (cat in config) {
        nextConfig[cat] = resolveUISoundPath(config[cat]);
      }
    }
    activeUISoundsConfig = nextConfig;
  }

  if (activeUISoundSystem?.configureUISounds) {
    activeUISoundSystem.configureUISounds(activeUISoundsConfig);
  } else if (activeUISoundSystem?.registerSound) {
    for (const cat of categories) {
      const st = UI_SOUND_TYPE_BY_CATEGORY[cat];
      const soundName = resolveUISoundPath(activeUISoundsConfig[cat]) ?? '';
      activeUISoundSystem.registerSound(st, soundName);
    }
  }

  return { ...activeUISoundsConfig };
}

export function resetUISoundsConfig(): UISoundsConfig {
  activeUISoundsConfig = getDefaultUISoundsFromHudJson();
  if (activeUISoundSystem?.configureUISounds) {
    activeUISoundSystem.configureUISounds(activeUISoundsConfig);
  }
  return { ...activeUISoundsConfig };
}

export function getUISoundsConfig(): UISoundsConfig {
  return { ...activeUISoundsConfig };
}

export function setActiveUISoundSystem(soundSystem?: ISoundSystem, settings?: BattleSettings): void {
  if (settings) {
    activeUISoundSettings = settings;
  }
  if (soundSystem) {
    activeUISoundSystem = soundSystem;
    if (settings && soundSystem.setSettings) {
      soundSystem.setSettings(settings);
    }
  } else if (settings && activeUISoundSystem?.setSettings) {
    activeUISoundSystem.setSettings(settings);
  }
}

export function getActiveUISoundSystem(): ISoundSystem | undefined {
  return activeUISoundSystem;
}

export function playUISound(category: UISoundCategory): void {
  const configuredSound = resolveUISoundPath(activeUISoundsConfig[category]);
  if (!configuredSound) {
    return;
  }
  if (!activeUISoundSystem && defaultSoundSystemFactory) {
    activeUISoundSystem = defaultSoundSystemFactory(activeUISoundSettings, activeUISoundsConfig);
  }
  if (!activeUISoundSystem) {
    return;
  }
  const soundType = UI_SOUND_TYPE_BY_CATEGORY[category];
  activeUISoundSystem.play(SoundCategory.SOUND, soundType);
}

export function bindButtonUISound(button?: {
  onPress?: { connect: (cb: () => void) => any };
  onHover?: { connect: (cb: () => void) => any };
  enabled?: boolean;
}): void {
  if (!button || typeof button !== 'object') return;
  if (boundUIButtons.has(button)) return;
  boundUIButtons.add(button);

  button.onHover?.connect(() => {
    if (button.enabled !== false) {
      playUISound('hover');
    }
  });

  button.onPress?.connect(() => {
    if (button.enabled !== false) {
      playUISound('click');
    }
  });
}

export function bindSliderUISound(
  slider?: {
    value?: number;
    onUpdate?: { connect: (cb: (val: number) => void) => any };
  },
  shouldSuppress?: () => boolean
): void {
  if (!slider || typeof slider !== 'object') return;
  if (boundUISliders.has(slider)) return;
  boundUISliders.add(slider);

  slider.onUpdate?.connect(() => {
    if (shouldSuppress?.()) {
      return;
    }
    playUISound('select');
  });
}
