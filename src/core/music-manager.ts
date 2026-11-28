import { BattleSettings } from '../battle/settings';

export type MusicMode = 'global' | 'battle';

export interface MusicTrackConfig {
  alias: string;
  url: string;
  title?: string;
}

export interface MusicConfig {
  global: MusicTrackConfig[];
  battle: MusicTrackConfig[];
}

export interface MusicSoundBackend {
  exists?(alias: string): boolean;
  add(alias: string, url: string): Promise<any> | any;
  play(alias: string, options?: { loop?: boolean; volume?: number; complete?: () => void }): any;
  stop(alias: string): any;
  volume(alias: string, volume?: number): any;
  remove(alias: string): any;
}

export const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  global: [
    {
      alias: 'music_global_mournfoul_morning',
      url: 'audio/music/Mournfoul Morning.ogg',
      title: 'Mournfoul Morning',
    },
    {
      alias: 'music_global_mournful_modal_phrases',
      url: 'audio/music/Mournful Modal Phrases.ogg',
      title: 'Mournful Modal Phrases',
    },
    {
      alias: 'music_global_open_vowels',
      url: 'audio/music/Open Vowels.ogg',
      title: 'Open Vowels',
    },
    {
      alias: 'music_global_ticha_pout_2',
      url: 'audio/music/Ticha Pout 2.ogg',
      title: 'Ticha Pout 2',
    },
    {
      alias: 'music_global_ticha_pout',
      url: 'audio/music/Ticha Pout.ogg',
      title: 'Ticha Pout',
    },
    {
      alias: 'music_global_wandering_map',
      url: 'audio/music/Wandering Map.ogg',
      title: 'Wandering Map',
    },
  ],
  battle: [
    {
      alias: 'track_ehoi',
      url: 'audio/music/battle_Ehoi.ogg',
      title: 'Ehoi',
    },
    {
      alias: 'track_dark_whispers',
      url: 'audio/music/battle_dark_whispers.ogg',
      title: 'Dark Whispers',
    },
  ],
};

/**
 * Manages mode-scoped music playlists (global overview vs battle) with
 * lazy loading: only the single active track is fetched/decoded when needed,
 * and previous tracks are unloaded when switching tracks or modes.
 */
export class MusicManager {
  private config: MusicConfig = {
    global: [...DEFAULT_MUSIC_CONFIG.global],
    battle: [...DEFAULT_MUSIC_CONFIG.battle],
  };

  private currentMode: MusicMode | null = null;
  private currentTrack: MusicTrackConfig | null = null;
  private shuffledPlaylist: MusicTrackConfig[] = [];
  private playlistCursor: number = 0;
  private loadedAliases: Set<string> = new Set();
  private lastSettings?: BattleSettings;
  private transitionToken: number = 0;
  private backendOverride?: MusicSoundBackend;

  constructor(backend?: MusicSoundBackend) {
    this.backendOverride = backend;
  }

  public setConfig(config: Partial<MusicConfig>): void {
    this.config = {
      global: Array.isArray(config.global) ? [...config.global] : [...DEFAULT_MUSIC_CONFIG.global],
      battle: Array.isArray(config.battle) ? [...config.battle] : [...DEFAULT_MUSIC_CONFIG.battle],
    };
  }

  public getConfig(): MusicConfig {
    return this.config;
  }

  public getTracksForMode(mode: MusicMode): MusicTrackConfig[] {
    return this.config[mode] ?? [];
  }

  public getCurrentMode(): MusicMode | null {
    return this.currentMode;
  }

  public getCurrentTrack(): MusicTrackConfig | null {
    return this.currentTrack;
  }

  public getLoadedTrackAliases(): string[] {
    return Array.from(this.loadedAliases);
  }

  private async getBackend(): Promise<MusicSoundBackend | null> {
    if (this.backendOverride) return this.backendOverride;
    if (typeof document === 'undefined') return null;
    try {
      const mod = await import('@pixi/sound');
      return mod.sound as unknown as MusicSoundBackend;
    } catch {
      return null;
    }
  }

  private shouldPlayMusic(settings?: BattleSettings): boolean {
    if (!settings) return false;
    return settings.sound.musicOn && settings.sound.musicVolume > 0;
  }

  public async setMode(mode: MusicMode, settings: BattleSettings): Promise<void> {
    this.lastSettings = settings;
    const modeChanged = this.currentMode !== mode;
    this.currentMode = mode;

    if (modeChanged) {
      await this.stopAndUnloadCurrent();
      this.shuffledPlaylist = [];
      this.playlistCursor = 0;
    }

    if (!this.shouldPlayMusic(settings)) {
      return;
    }

    if (!this.currentTrack || modeChanged) {
      await this.playNextTrack(settings);
    }
  }

  public async updateVolume(settings: BattleSettings): Promise<void> {
    this.lastSettings = settings;

    if (!this.shouldPlayMusic(settings)) {
      await this.stopAndUnloadCurrent();
      return;
    }

    if (!this.currentTrack && this.currentMode) {
      await this.playNextTrack(settings);
      return;
    }

    if (this.currentTrack) {
      const backend = await this.getBackend();
      try {
        backend?.volume(this.currentTrack.alias, settings.sound.musicVolume);
      } catch {
        // Ignore in headless environments
      }
    }
  }

  private buildShuffledPlaylist(tracks: MusicTrackConfig[], lastAlias?: string): MusicTrackConfig[] {
    const copy = [...tracks];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.length > 1 && lastAlias && copy[0].alias === lastAlias) {
      const swapIdx = 1 + Math.floor(Math.random() * (copy.length - 1));
      [copy[0], copy[swapIdx]] = [copy[swapIdx], copy[0]];
    }
    return copy;
  }

  public async playNextTrack(settings?: BattleSettings): Promise<void> {
    const activeSettings = settings ?? this.lastSettings;
    if (!this.currentMode || !this.shouldPlayMusic(activeSettings)) {
      return;
    }

    const tracks = this.getTracksForMode(this.currentMode);
    if (tracks.length === 0) return;

    const previousAlias = this.currentTrack?.alias;
    const token = ++this.transitionToken;
    await this.stopAndUnloadCurrent(false);

    if (tracks.length === 1) {
      this.shuffledPlaylist = [tracks[0]];
      this.playlistCursor = 0;
    } else if (
      this.shuffledPlaylist.length !== tracks.length ||
      this.playlistCursor >= this.shuffledPlaylist.length
    ) {
      this.shuffledPlaylist = this.buildShuffledPlaylist(tracks, previousAlias);
      this.playlistCursor = 0;
    }

    const nextTrack = this.shuffledPlaylist[this.playlistCursor++];
    const backend = await this.getBackend();
    if (!backend || token !== this.transitionToken) return;

    try {
      const alreadyExists =
        typeof backend.exists === 'function' ? backend.exists(nextTrack.alias) : false;
      if (!alreadyExists) {
        await backend.add(nextTrack.alias, nextTrack.url);
      }
      if (token !== this.transitionToken) {
        // Mode changed or music stopped while lazy loading
        if (typeof backend.exists !== 'function' || backend.exists(nextTrack.alias)) {
          backend.remove(nextTrack.alias);
        }
        return;
      }

      this.loadedAliases.add(nextTrack.alias);
      this.currentTrack = nextTrack;

      const loopSingle = tracks.length === 1;
      backend.play(nextTrack.alias, {
        loop: loopSingle,
        volume: activeSettings!.sound.musicVolume,
        complete: loopSingle
          ? undefined
          : () => {
            if (this.currentTrack?.alias === nextTrack.alias) {
              void this.playNextTrack(this.lastSettings);
            }
          },
      });
    } catch {
      // Ignore audio load/play errors in offline or headless environments
    }
  }

  public async stopAndUnloadCurrent(invalidateToken: boolean = true): Promise<void> {
    if (invalidateToken) {
      this.transitionToken++;
    }
    const backend = await this.getBackend();
    if (backend) {
      for (const alias of this.loadedAliases) {
        try {
          backend.stop(alias);
          if (typeof backend.exists !== 'function' || backend.exists(alias)) {
            backend.remove(alias);
          }
        } catch {
          // Ignore in headless/mocked environments
        }
      }
    }
    this.loadedAliases.clear();
    this.currentTrack = null;
  }
}
