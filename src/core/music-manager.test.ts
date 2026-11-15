import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { BattleSettings } from '../battle/settings';
import { MusicConfig, MusicManager, MusicSoundBackend } from './music-manager';

function createMockBackend() {
  const loaded = new Set<string>();
  const completeCallbacks = new Map<string, () => void>();

  const backend: MusicSoundBackend = {
    exists: vi.fn((alias: string) => loaded.has(alias)),
    add: vi.fn(async (alias: string, _url: string) => {
      loaded.add(alias);
    }),
    play: vi.fn((alias: string, opts?: { complete?: () => void }) => {
      if (opts?.complete) {
        completeCallbacks.set(alias, opts.complete);
      }
    }),
    stop: vi.fn((_alias: string) => {}),
    volume: vi.fn((_alias: string, _vol?: number) => {}),
    remove: vi.fn((alias: string) => {
      loaded.delete(alias);
      completeCallbacks.delete(alias);
    }),
  };

  return { backend, loaded, completeCallbacks };
}

describe('MusicManager & music.json configuration', () => {
  it('loads public/music.json with separated global (6 tracks) and battle (1 track) playlists', () => {
    const raw = JSON.parse(readFileSync('public/music.json', 'utf8')) as MusicConfig;
    expect(raw.battle).toHaveLength(1);
    expect(raw.battle[0].url).toBe('audio/dark_whispers.ogg');

    expect(raw.global).toHaveLength(6);
    const urls = raw.global.map((t) => t.url);
    expect(urls).toContain('audio/music/Mournfoul Morning.ogg');
    expect(urls).toContain('audio/music/Mournful Modal Phrases.ogg');
    expect(urls).toContain('audio/music/Open Vowels.ogg');
    expect(urls).toContain('audio/music/Ticha Pout 2.ogg');
    expect(urls).toContain('audio/music/Ticha Pout.ogg');
    expect(urls).toContain('audio/music/Wandering Map.ogg');
  });

  it('does not eagerly load any music track when music is disabled or volume is 0', async () => {
    const { backend, loaded } = createMockBackend();
    const manager = new MusicManager(backend);
    const settings = new BattleSettings();
    settings.sound.musicOn = false;
    settings.sound.musicVolume = 0;

    await manager.setMode('global', settings);
    expect(backend.add).not.toHaveBeenCalled();
    expect(loaded.size).toBe(0);
  });

  it('lazily loads only 1 track at a time and unloads previous tracks when switching modes or finishing', async () => {
    const { backend, loaded, completeCallbacks } = createMockBackend();
    const manager = new MusicManager(backend);
    const settings = new BattleSettings();
    settings.sound.musicOn = true;
    settings.sound.musicVolume = 0.4;

    await manager.setMode('global', settings);
    expect(backend.add).toHaveBeenCalledTimes(1);
    expect(loaded.size).toBe(1);
    const firstTrack = manager.getCurrentTrack()!;
    expect(firstTrack.url.startsWith('audio/music/')).toBe(true);

    // Simulate track finishing -> unloads first track and lazily loads next global track
    completeCallbacks.get(firstTrack.alias)?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(backend.remove).toHaveBeenCalledWith(firstTrack.alias);
    expect(loaded.size).toBe(1);
    const secondTrack = manager.getCurrentTrack()!;
    expect(secondTrack.alias).not.toBe(firstTrack.alias);

    // Switch to battle mode -> unloads global track and lazily loads dark_whispers
    await manager.setMode('battle', settings);
    expect(backend.remove).toHaveBeenCalledWith(secondTrack.alias);
    expect(loaded.size).toBe(1);
    expect(manager.getCurrentTrack()?.alias).toBe('track_dark_whispers');
    expect(loaded.has('track_dark_whispers')).toBe(true);
  });

  it('stops and unloads when volume becomes 0 and lazily reloads when raised above 0', async () => {
    const { backend, loaded } = createMockBackend();
    const manager = new MusicManager(backend);
    const settings = new BattleSettings();
    settings.sound.musicOn = true;
    settings.sound.musicVolume = 0.5;

    await manager.setMode('battle', settings);
    expect(loaded.has('track_dark_whispers')).toBe(true);

    settings.sound.musicVolume = 0;
    settings.sound.musicOn = false;
    await manager.updateVolume(settings);
    expect(backend.stop).toHaveBeenCalledWith('track_dark_whispers');
    expect(loaded.size).toBe(0);

    settings.sound.musicVolume = 0.6;
    settings.sound.musicOn = true;
    await manager.updateVolume(settings);
    expect(loaded.has('track_dark_whispers')).toBe(true);
    expect(backend.play).toHaveBeenLastCalledWith(
      'track_dark_whispers',
      expect.objectContaining({ loop: true, volume: 0.6 })
    );
  });

  it('cycles through all tracks in a randomized playlist without repeating before reshuffling', async () => {
    const { backend, completeCallbacks } = createMockBackend();
    const manager = new MusicManager(backend);
    const settings = new BattleSettings();
    settings.sound.musicOn = true;
    settings.sound.musicVolume = 0.5;

    await manager.setMode('global', settings);
    const playedFirstPass: string[] = [manager.getCurrentTrack()!.alias];

    for (let i = 1; i < 6; i++) {
      const currentAlias = manager.getCurrentTrack()!.alias;
      completeCallbacks.get(currentAlias)?.();
      await new Promise((r) => setTimeout(r, 0));
      playedFirstPass.push(manager.getCurrentTrack()!.alias);
    }

    // All 6 unique global tracks played once in the first pass
    expect(new Set(playedFirstPass).size).toBe(6);

    // Next track starts a new shuffled pass and does not immediately repeat the 6th track
    const lastOfFirstPass = playedFirstPass[5];
    completeCallbacks.get(lastOfFirstPass)?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(manager.getCurrentTrack()!.alias).not.toBe(lastOfFirstPass);
  });
});
