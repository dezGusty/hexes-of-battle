import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';

const mockSoundPlay = vi.fn();
const mockSoundStop = vi.fn();

vi.mock('@pixi/sound', () => ({
  sound: {
    play: (...args: any[]) => mockSoundPlay(...args),
    stop: (...args: any[]) => mockSoundStop(...args),
  },
}));

vi.mock('../render3d/battle-view-3d', () => ({
  BattleView3D: class {
    public soundSystem: any;
    public visualFactory = { setSpritesheet: vi.fn() };
    public sceneManager = { zoomCamera: vi.fn(), rotateCamera: vi.fn() };
    public setSoundSystem(ss: any) { this.soundSystem = ss; }
    public setHud = vi.fn();
    public loadAllAssets = vi.fn().mockResolvedValue(undefined);
    public initialize = vi.fn();
    public setZoomLevel = vi.fn();
    public showTurnBanner = vi.fn();
    public showAttackVisuals = vi.fn();
    public showRangedAttackVisuals = vi.fn();
    public showRestVisuals = vi.fn();
    public update = vi.fn();
    public resize = vi.fn();
    public destroy = vi.fn();
    public resetGridAndTerrain = vi.fn();
    public setCpuPlayer = vi.fn();
    public updateActiveUnitSelection = vi.fn();
    public setGridVisible = vi.fn();
    public setCoordsVisible = vi.fn();
    public setSceneInspectorVisible = vi.fn();
  },
}));

vi.mock('../render3d/battle-hud-2d', () => ({
  BattleHud2D: class {
    public container = new Container();
    public initialize = vi.fn();
    public update = vi.fn();
    public destroy = vi.fn();
    public showTurnBanner = vi.fn();
    public showVictoryBanner = vi.fn();
    public showEndTurnRecommendation = vi.fn();
    public updateActiveUnitAbility = vi.fn();
    public updateUnitStats = vi.fn();
    public setCpuPlayer = vi.fn();
    public toggleUnitStats = vi.fn();
  },
}));

import {
  ISoundSystem,
  PixiSoundSystem,
  SoundCategory,
  SoundType,
  BattleSoundSystem,
} from './sound-system';
import { BattleSettings } from './settings';
import { BattleScene3D } from '../scenes/battle-scene-3d';
import { Creature, CreatureType } from './creature';
import { EventBus } from '../core/event-bus';
import creatureTemplates from '../../public/creaturetypes.json';

describe('SoundSystem Architecture & Decoupling', () => {
  let settings: BattleSettings;
  let soundSystem: PixiSoundSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    settings = new BattleSettings();
    settings.sound.soundOn = true;
    settings.sound.musicOn = true;
    settings.sound.soundVolume = 0.8;
    settings.sound.musicVolume = 0.5;
    soundSystem = new PixiSoundSystem(settings);
  });

  describe('PixiSoundSystem & ISoundSystem', () => {
    it('should implement ISoundSystem interface and map sound types correctly', () => {
      expect(soundSystem.getSoundName(SoundType.MOVE)).toBe('move');
      expect(soundSystem.getSoundName(SoundType.DIE)).toBe('die');
      expect(soundSystem.getSoundName(SoundType.SWORD)).toBe('sword');
      expect(soundSystem.getSoundName(SoundType.ARROW)).toBe('arrow');
      expect(soundSystem.getSoundName(SoundType.BATTLE_MUSIC)).toBe('track_dark_whispers');
    });

    it('should play SOUND category effects with settings volume and speed', () => {
      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE);

      expect(mockSoundPlay).toHaveBeenCalledWith('move', expect.objectContaining({
        volume: 0.8,
        speed: expect.any(Number),
      }));

      soundSystem.play(SoundCategory.SOUND, SoundType.DIE);
      expect(mockSoundPlay).toHaveBeenCalledWith('die', expect.objectContaining({
        volume: 0.8,
      }));

      soundSystem.play(SoundCategory.SOUND, SoundType.SWORD);
      expect(mockSoundPlay).toHaveBeenCalledWith('sword', expect.objectContaining({
        volume: 0.8,
      }));

      soundSystem.play(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundPlay).toHaveBeenCalledWith('arrow', expect.objectContaining({
        volume: 0.8,
      }));
    });

    it('should play MUSIC category with loop and settings music volume', () => {
      soundSystem.play(SoundCategory.MUSIC, SoundType.BATTLE_MUSIC);

      expect(mockSoundStop).toHaveBeenCalledWith('track_dark_whispers');
      expect(mockSoundPlay).toHaveBeenCalledWith('track_dark_whispers', {
        loop: true,
        volume: 0.5,
      });
    });

    it('should suppress sound effects when soundOn is false', () => {
      settings.sound.soundOn = false;
      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE);
      expect(mockSoundPlay).not.toHaveBeenCalled();
    });

    it('should suppress music when musicOn is false', () => {
      settings.sound.musicOn = false;
      soundSystem.play(SoundCategory.MUSIC, SoundType.BATTLE_MUSIC);
      expect(mockSoundPlay).not.toHaveBeenCalled();
    });

    it('should allow custom options overriding volume and loop', () => {
      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE, { volume: 0.3, speed: 1.5 });
      expect(mockSoundPlay).toHaveBeenCalledWith('move', {
        volume: 0.3,
        speed: 1.5,
      });

      soundSystem.play(SoundCategory.MUSIC, SoundType.BATTLE_MUSIC, { volume: 0.9, loop: false });
      expect(mockSoundPlay).toHaveBeenCalledWith('track_dark_whispers', {
        volume: 0.9,
        loop: false,
      });
    });

    it('should support speed and volume arguments as numbers or options object', () => {
      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE, 1.25, 0.4);
      expect(mockSoundPlay).toHaveBeenCalledWith('move', {
        speed: 1.25,
        volume: 0.4,
      });

      soundSystem.play(SoundCategory.SOUND, SoundType.DIE, { speed: 1.15, volume: 0.35 });
      expect(mockSoundPlay).toHaveBeenCalledWith('die', {
        speed: 1.15,
        volume: 0.35,
      });
    });

    it('should support boolean fluctuation flag and playWithFluctuation helper', () => {
      // Default without fluctuation: speed 1.0
      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE, false);
      expect(mockSoundPlay).toHaveBeenCalledWith('move', {
        speed: 1.0,
        volume: 0.8,
      });

      // Boolean flag true: speed fluctuated within [0.9, 1.1]
      mockSoundPlay.mockClear();
      soundSystem.play(SoundCategory.SOUND, SoundType.DIE, true);
      expect(mockSoundPlay).toHaveBeenCalledWith('die', expect.objectContaining({
        volume: 0.8,
      }));
      const callSpeed = mockSoundPlay.mock.calls[0][1].speed;
      expect(callSpeed).toBeGreaterThanOrEqual(0.9);
      expect(callSpeed).toBeLessThanOrEqual(1.1);

      // playWithFluctuation helper with default settings volume
      mockSoundPlay.mockClear();
      soundSystem.playWithFluctuation(SoundCategory.SOUND, SoundType.SWORD);
      expect(mockSoundPlay).toHaveBeenCalledWith('sword', expect.objectContaining({
        volume: 0.8,
      }));
      const swordSpeed = mockSoundPlay.mock.calls[0][1].speed;
      expect(swordSpeed).toBeGreaterThanOrEqual(0.9);
      expect(swordSpeed).toBeLessThanOrEqual(1.1);

      // playWithFluctuation helper with custom volume override
      mockSoundPlay.mockClear();
      soundSystem.playWithFluctuation(SoundCategory.SOUND, SoundType.ARROW, 0.45);
      expect(mockSoundPlay).toHaveBeenCalledWith('arrow', expect.objectContaining({
        volume: 0.45,
      }));
      const arrowSpeed = mockSoundPlay.mock.calls[0][1].speed;
      expect(arrowSpeed).toBeGreaterThanOrEqual(0.9);
      expect(arrowSpeed).toBeLessThanOrEqual(1.1);
    });

    it('should stop specific sound type or whole category', () => {
      soundSystem.stop(SoundCategory.SOUND, SoundType.MOVE);
      expect(mockSoundStop).toHaveBeenCalledWith('move');

      soundSystem.stop(SoundCategory.MUSIC);
      expect(mockSoundStop).toHaveBeenCalledWith('track_dark_whispers');
    });

    it('should support custom sound registration and sound mapping', () => {
      soundSystem.registerSound(SoundType.MOVE, 'custom_footsteps');
      expect(soundSystem.getSoundName(SoundType.MOVE)).toBe('custom_footsteps');

      soundSystem.play(SoundCategory.SOUND, SoundType.MOVE);
      expect(mockSoundPlay).toHaveBeenCalledWith('custom_footsteps', expect.anything());
    });

    it('should support BattleSoundSystem alias', () => {
      const bss = new BattleSoundSystem(settings);
      bss.play(SoundCategory.SOUND, SoundType.MOVE);
      expect(mockSoundPlay).toHaveBeenCalledWith('move', expect.anything());
    });
  });

  describe('BattleScene3D Decoupled Sound System', () => {
    it('should delegate sound and music to injected ISoundSystem without knowledge of sound names', async () => {
      const calls: Array<{ action: 'play' | 'stop'; category: SoundCategory; type?: SoundType; options?: any }> = [];

      const mockCustomSoundSystem: ISoundSystem = {
        play: (category, type, options) => {
          calls.push({ action: 'play', category, type, options });
        },
        stop: (category, type) => {
          calls.push({ action: 'stop', category, type });
        },
      };

      const scene = new BattleScene3D();
      expect(scene.getSoundSystem).toBeDefined();

      const mockContext = {
        app: { ticker: { FPS: 60 } },
        stage: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } },
        eventBus: new EventBus(),
        assets: { softCursorTextures: {} },
        templates: { abilityTypes: [], creatureTemplates: creatureTemplates as any },
        settings,
        soundSystem: mockCustomSoundSystem,
        nativeResolution: { width: 1920, height: 1080 },
        switchToScene: vi.fn(),
      } as any;

      const prevDoc = (globalThis as any).document;
      try {
        const mockCanvas = {
          getContext: () => ({
            measureText: () => ({ width: 40, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }),
            fillText: () => {},
            strokeText: () => {},
            clearRect: () => {},
          }),
          style: {},
          addEventListener: () => {},
          removeEventListener: () => {},
        };
        (globalThis as any).document = {
          body: { appendChild: () => {}, removeChild: () => {} },
          getElementById: () => ({ appendChild: () => {}, removeChild: () => {}, addEventListener: () => {} }),
          createElement: (tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {
              style: {},
              classList: { add: () => {}, remove: () => {}, contains: () => false },
              appendChild: (c: any) => c,
              removeChild: (c: any) => c,
            };
          },
        };

        await scene.enter(mockContext, { soundSystem: mockCustomSoundSystem });

        expect(scene.getSoundSystem()).toBe(mockCustomSoundSystem);

        // Verify music was requested to stop then play via SoundCategory and SoundType enums
        expect(calls).toContainEqual({
          action: 'stop',
          category: SoundCategory.MUSIC,
          type: undefined,
        });
        expect(calls).toContainEqual({
          action: 'play',
          category: SoundCategory.MUSIC,
          type: SoundType.BATTLE_MUSIC,
          options: undefined,
        });

        // Simulate moving unit hook (with fluctuation true)
        const creature = new Creature(CreatureType.SPEARMAN);
        (scene as any).battle.hookMovingUnit(creature, { x: 1, y: 1 });
        expect(calls).toContainEqual({
          action: 'play',
          category: SoundCategory.SOUND,
          type: SoundType.MOVE,
          options: true,
        });

        // Simulate unit death hook (with fluctuation true)
        (scene as any).battle.hookUnitDied(creature);
        expect(calls).toContainEqual({
          action: 'play',
          category: SoundCategory.SOUND,
          type: SoundType.DIE,
          options: true,
        });

        // Simulate scene exit
        scene.exit();
        expect(calls).toContainEqual({
          action: 'stop',
          category: SoundCategory.MUSIC,
          type: undefined,
        });
      } finally {
        (globalThis as any).document = prevDoc;
      }
    });
  });
});
