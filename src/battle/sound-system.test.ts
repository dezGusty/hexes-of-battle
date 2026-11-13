import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Assets, Container, Texture, Spritesheet } from 'pixi.js';

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
    public showHealVisuals = vi.fn();
    public update = vi.fn();
    public resize = vi.fn();
    public destroy = vi.fn();
    public resetGridAndTerrain = vi.fn();
    public setCpuPlayer = vi.fn();
    public updateActiveUnitSelection = vi.fn();
    public setGridVisible = vi.fn();
    public setCoordsVisible = vi.fn();
    public setSceneInspectorVisible = vi.fn();
    public removeSquad = vi.fn();
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
  configureUISounds,
  getUISoundsConfig,
  resetUISoundsConfig,
  configureSoundGroups,
  getSoundGroupsConfig,
  resetSoundGroupsConfig,
  configureArrowVolleySounds,
  getArrowVolleySoundsConfig,
  resetArrowVolleySoundsConfig,
} from './sound-system';
import { BattleSettings } from './settings';
import { BattleScene3D } from '../scenes/battle-scene-3d';
import { Creature, CreatureType } from './creature';
import { MoraleState } from './combat-rules';
import { EventBus } from '../core/event-bus';
import { CommonControls } from '../ui/common-controls';
import { BattleMenuPanel } from '../ui/battle-menu';
import creatureTemplates from '../../public/creaturetypes.json';
import hudJson from '../../public/hud.json';
import soundsJson from '../../public/sounds.json';

describe('SoundSystem Architecture & Decoupling', () => {
  let settings: BattleSettings;
  let soundSystem: PixiSoundSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Texture, 'from').mockReturnValue(Texture.EMPTY);
    settings = new BattleSettings();
    settings.sound.soundOn = true;
    settings.sound.musicOn = true;
    settings.sound.soundVolume = 0.8;
    settings.sound.musicVolume = 0.5;
    resetUISoundsConfig();
    resetSoundGroupsConfig();
    resetArrowVolleySoundsConfig();
    soundSystem = new PixiSoundSystem(settings);
  });

  describe('PixiSoundSystem & ISoundSystem', () => {
    it('should implement ISoundSystem interface and map sound types correctly', () => {
      expect(soundSystem.getSoundName(SoundType.MOVE)).toBe('move');
      expect(soundSystem.getSoundName(SoundType.DIE)).toBe('infantry_death');
      expect(soundSystem.getSoundName(SoundType.RETREAT)).toBe('infantry_retreat');
      expect(soundSystem.getSoundName(SoundType.HEAL)).toBe('heal');
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
      expect(mockSoundPlay).toHaveBeenCalledWith(
        expect.stringMatching(/^infantry_death_[ce]\.ogg$/),
        expect.objectContaining({
          volume: 0.8,
        })
      );

      soundSystem.play(SoundCategory.SOUND, SoundType.SWORD);
      expect(mockSoundPlay).toHaveBeenCalledWith('sword', expect.objectContaining({
        volume: 0.8,
      }));

      soundSystem.play(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundPlay).toHaveBeenCalledWith(
        expect.stringMatching(/^arrow(_[23])?\.ogg$/),
        expect.objectContaining({
          volume: 0.8,
        })
      );
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
      expect(mockSoundPlay).toHaveBeenCalledWith(
        expect.stringMatching(/^infantry_death_[ce]\.ogg$/),
        {
          speed: 1.15,
          volume: 0.35,
        }
      );
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
      expect(mockSoundPlay).toHaveBeenCalledWith(
        expect.stringMatching(/^infantry_death_[ce]\.ogg$/),
        expect.objectContaining({
          volume: 0.8,
        })
      );
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
      expect(mockSoundPlay).toHaveBeenCalledWith(
        expect.stringMatching(/^arrow(_[23])?\.ogg$/),
        expect.objectContaining({
          volume: 0.45,
        })
      );
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

        // Simulate unit retreat / flee hook (with fluctuation true)
        (scene as any).battle.hookUnitRetreated(creature, { x: 2, y: 2 });
        expect(calls).toContainEqual({
          action: 'play',
          category: SoundCategory.SOUND,
          type: SoundType.RETREAT,
          options: true,
        });

        // Simulate morale break to ROUTING (fleeing from battle)
        const prevRetreatCalls = calls.filter((c) => c.type === SoundType.RETREAT).length;
        (scene as any).battle.hookMoraleBreak(creature, MoraleState.ROUTING);
        expect(calls.filter((c) => c.type === SoundType.RETREAT).length).toBe(prevRetreatCalls + 1);

        // Simulate healing ability hook (such as Mend Wounds)
        const healer = new Creature(CreatureType.HEALER);
        (scene as any).battle.hookDoingHeal({
          healer,
          target: creature,
          amount: 8,
          moraleBoost: 3,
        });
        expect(calls).toContainEqual({
          action: 'play',
          category: SoundCategory.SOUND,
          type: SoundType.HEAL,
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

  describe('UI Sounds Configuration (hud.json) & Playback', () => {
    let prevDoc: any;
    let prevContext: any;

    beforeEach(() => {
      prevDoc = (globalThis as any).document;
      prevContext = (globalThis as any).CanvasRenderingContext2D;

      if (typeof (globalThis as any).CanvasRenderingContext2D === 'undefined') {
        (globalThis as any).CanvasRenderingContext2D = class {};
      }
      if (typeof document === 'undefined') {
        const mockCanvas = {
          getContext: () => ({
            measureText: () => ({ width: 40, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }),
            fillText: () => {},
            strokeText: () => {},
            clearRect: () => {},
          }),
        };
        (globalThis as any).document = {
          createElement: (tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {
              style: {},
              classList: { add: () => {}, remove: () => {}, contains: () => false },
              appendChild: (c: any) => c,
              removeChild: (c: any) => c,
            };
          },
          getElementById: () => null,
        };
      }

      const textureNames = [
        'thin_button_normal.png',
        'thin_button_hover.png',
        'thin_button_2_normal.png',
        'thin_button_2_hover.png',
        'btn_simple.png',
        'btn_simple_hover.png',
        'btn_simple_click.png',
        'glyph_plus.png',
        'glyph_minus.png',
        'glyph_next_turn.png',
        'glyph_next_unit.png',
        'glyph_reset.png',
        'glyph_ability1.png',
        'glyph_stamina',
        'glyph_fullscreen.png',
        'glyph_xy.png',
        'glyph_grid.png',
        'glyph_toggle_healthbars.png',
        'glyph_toggle_perf_stats.png',
        'glyph_hp',
        'glyph_toggle_music.png',
        'glyph_toggle_stats.png',
        'cursor_arrow.png',
        'glyph_movement',
        'panel.png',
      ];
      textureNames.forEach((name) => {
        try {
          Assets.cache.set(name, Texture.EMPTY);
        } catch {
          // ignore
        }
      });
    });

    afterEach(() => {
      (globalThis as any).document = prevDoc;
      (globalThis as any).CanvasRenderingContext2D = prevContext;
    });

    const createMockUISheet = (): Spritesheet =>
      ({
        textures: {
          'panel.png': Texture.EMPTY,
          'btn_simple.png': Texture.EMPTY,
          'btn_simple_hover.png': Texture.EMPTY,
          'btn_simple_click.png': Texture.EMPTY,
          'thin_button_2_normal.png': Texture.EMPTY,
          'thin_button_2_hover.png': Texture.EMPTY,
          'glyph_fullscreen.png': Texture.EMPTY,
          'glyph_xy.png': Texture.EMPTY,
          'glyph_grid.png': Texture.EMPTY,
          'glyph_toggle_healthbars.png': Texture.EMPTY,
          'glyph_toggle_perf_stats.png': Texture.EMPTY,
          'glyph_hp': Texture.EMPTY,
          'glyph_toggle_music.png': Texture.EMPTY,
          'glyph_plus.png': Texture.EMPTY,
          'glyph_next_turn.png': Texture.EMPTY,
          'glyph_toggle_stats.png': Texture.EMPTY,
          'cursor_arrow.png': Texture.EMPTY,
          'glyph_movement': Texture.EMPTY,
        },
      } as unknown as Spritesheet);

    it('should load default UI sound paths from public/hud.json', () => {
      expect((hudJson as any).sounds).toEqual({
        hover: 'audio/ui/mouse_hover_subtle_foley_001.ogg',
        click: 'audio/ui/mouse_click_foley_003.ogg',
        select: 'audio/ui/mouse_select_foley_001.ogg',
      });

      const cfg = getUISoundsConfig();
      expect(cfg.hover).toBe('audio/ui/mouse_hover_subtle_foley_001.ogg');
      expect(cfg.click).toBe('audio/ui/mouse_click_foley_003.ogg');
      expect(cfg.select).toBe('audio/ui/mouse_select_foley_001.ogg');

      expect(soundSystem.getSoundName(SoundType.UI_HOVER)).toBe('audio/ui/mouse_hover_subtle_foley_001.ogg');
      expect(soundSystem.getSoundName(SoundType.UI_CLICK)).toBe('audio/ui/mouse_click_foley_003.ogg');
      expect(soundSystem.getSoundName(SoundType.UI_SELECT)).toBe('audio/ui/mouse_select_foley_001.ogg');
    });

    it('should play click and hover sounds on CommonControls buttons and dropdown', () => {
      const controls = new CommonControls();
      controls.initializeButtons();

      // Hover on Menu button
      controls.menuButton?.onHover.emit();
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_hover_subtle_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Click on Menu button
      mockSoundPlay.mockClear();
      controls.menuButton?.onPress.emit();
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_click_foley_003.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Hover and click on Auto-Battle button and CPU Personality dropdown
      mockSoundPlay.mockClear();
      controls.autoBattleButton?.onHover.emit();
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_hover_subtle_foley_001.ogg',
        expect.anything()
      );

      mockSoundPlay.mockClear();
      controls.autoBattlePersonalityDropdown?.headerButton.onPress.emit();
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_click_foley_003.ogg',
        expect.anything()
      );
    });

    it('should play select sound when slider values change in CommonControls and BattleMenuPanel', () => {
      const controls = new CommonControls({ zoomMin: 50, zoomMax: 200, zoomStep: 5, zoomValue: 100 });
      controls.initializeButtons();

      const menuPanel = new BattleMenuPanel(new Container(), createMockUISheet());

      // Initial programmatic sync should not play select sound
      menuPanel.setSoundValues(0.25, 0.6);
      menuPanel.setAnimationSpeed(6);
      expect(mockSoundPlay).not.toHaveBeenCalled();

      // Changing zoom slider value plays select sound
      controls.zoomSlider!.value = 125;
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_select_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Changing animation speed slider value plays select sound
      mockSoundPlay.mockClear();
      menuPanel.animationSpeedSlider!.value = 4;
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_select_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Changing music volume slider value plays select sound
      mockSoundPlay.mockClear();
      menuPanel.musicVolumeSlider!.value = 50;
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_select_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Changing sound volume slider value plays select sound
      mockSoundPlay.mockClear();
      menuPanel.soundVolumeSlider!.value = 90;
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_select_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      menuPanel.destroy();
    });

    it('should allow configuring custom sound files or disabling individual categories (hover, click, select)', () => {
      const controls = new CommonControls();
      controls.initializeButtons();

      // Disable hover (null), customize click (short filename), disable select ('none')
      configureUISounds({
        hover: null,
        click: 'custom_click.ogg',
        select: 'none',
      });

      controls.menuButton?.onHover.emit();
      expect(mockSoundPlay).not.toHaveBeenCalled();

      controls.menuButton?.onPress.emit();
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/custom_click.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      mockSoundPlay.mockClear();
      controls.zoomSlider!.value = 80;
      expect(mockSoundPlay).not.toHaveBeenCalled();

      // Also support disabling with empty string "" or false
      configureUISounds({
        hover: false,
        click: '',
        select: 'audio/ui/mouse_select_foley_001.ogg',
      });

      controls.menuButton?.onPress.emit();
      expect(mockSoundPlay).not.toHaveBeenCalled();

      controls.zoomSlider!.value = 90;
      expect(mockSoundPlay).toHaveBeenCalledWith(
        'audio/ui/mouse_select_foley_001.ogg',
        expect.objectContaining({ volume: 0.8 })
      );
    });
  });

  describe('Sound Groups (infantry_death, infantry_retreat, heal)', () => {
    it('should load default sound groups infantry_death, infantry_retreat, and heal from JSON configuration', () => {
      expect(soundsJson.soundGroups.infantry_death).toEqual([
        'infantry_death_c.ogg',
        'infantry_death_e.ogg',
      ]);
      expect(soundsJson.soundGroups.infantry_retreat).toEqual([
        'infantry_retreat_a.ogg',
        'infantry_retreat_c.ogg',
      ]);
      expect(soundsJson.soundGroups.heal).toEqual([
        'infantry_upgrade_health_c.ogg',
      ]);
      expect((hudJson as any).soundGroups.infantry_death).toEqual([
        'infantry_death_c.ogg',
        'infantry_death_e.ogg',
      ]);
      expect((hudJson as any).soundGroups.infantry_retreat).toEqual([
        'infantry_retreat_a.ogg',
        'infantry_retreat_c.ogg',
      ]);
      expect((hudJson as any).soundGroups.heal).toEqual([
        'infantry_upgrade_health_c.ogg',
      ]);

      expect(soundSystem.getSoundGroup('infantry_death')).toEqual([
        'infantry_death_c.ogg',
        'infantry_death_e.ogg',
      ]);
      expect(soundSystem.getSoundGroup('infantry_retreat')).toEqual([
        'infantry_retreat_a.ogg',
        'infantry_retreat_c.ogg',
      ]);
      expect(soundSystem.getSoundGroup('heal')).toEqual([
        'infantry_upgrade_health_c.ogg',
      ]);
      expect(soundSystem.getSoundName(SoundType.DIE)).toBe('infantry_death');
      expect(soundSystem.getSoundName(SoundType.RETREAT)).toBe('infantry_retreat');
      expect(soundSystem.getSoundName(SoundType.HEAL)).toBe('heal');
    });

    it('should play from the heal sound group when a healing ability (such as mend wounds) is used (SoundType.HEAL)', () => {
      soundSystem.play(SoundCategory.SOUND, SoundType.HEAL);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'infantry_upgrade_health_c.ogg',
        expect.objectContaining({ volume: 0.8 })
      );
    });

    it('should randomly choose one of the sounds from infantry_death when a unit dies (SoundType.DIE)', () => {
      // Force random index 0 -> infantry_death_c.ogg
      soundSystem.setRandomProvider(() => 0.1);
      soundSystem.play(SoundCategory.SOUND, SoundType.DIE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'infantry_death_c.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Force random index 1 -> infantry_death_e.ogg
      soundSystem.setRandomProvider(() => 0.9);
      soundSystem.play(SoundCategory.SOUND, SoundType.DIE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'infantry_death_e.ogg',
        expect.objectContaining({ volume: 0.8 })
      );
    });

    it('should randomly choose one of the sounds from infantry_retreat when a unit flees (SoundType.RETREAT)', () => {
      // Force random index 0 -> infantry_retreat_a.ogg
      soundSystem.setRandomProvider(() => 0.2);
      soundSystem.play(SoundCategory.SOUND, SoundType.RETREAT);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'infantry_retreat_a.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      // Force random index 1 -> infantry_retreat_c.ogg
      soundSystem.setRandomProvider(() => 0.85);
      soundSystem.play(SoundCategory.SOUND, SoundType.RETREAT);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'infantry_retreat_c.ogg',
        expect.objectContaining({ volume: 0.8 })
      );
    });

    it('should allow maintainers to configure custom sound groups via JSON config', () => {
      configureSoundGroups({
        infantry_death: ['custom_death_1.ogg', 'custom_death_2.ogg', 'custom_death_3.ogg'],
        infantry_retreat: ['custom_flee_1.ogg'],
      });
      soundSystem.configureSoundGroups({
        infantry_death: ['custom_death_1.ogg', 'custom_death_2.ogg', 'custom_death_3.ogg'],
        infantry_retreat: ['custom_flee_1.ogg'],
      });

      expect(getSoundGroupsConfig().infantry_death).toEqual([
        'custom_death_1.ogg',
        'custom_death_2.ogg',
        'custom_death_3.ogg',
      ]);

      soundSystem.setRandomProvider(() => 0.5); // index 1 of 3 -> custom_death_2.ogg
      soundSystem.play(SoundCategory.SOUND, SoundType.DIE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'custom_death_2.ogg',
        expect.objectContaining({ volume: 0.8 })
      );

      soundSystem.play(SoundCategory.SOUND, SoundType.RETREAT);
      expect(mockSoundPlay).toHaveBeenLastCalledWith(
        'custom_flee_1.ogg',
        expect.objectContaining({ volume: 0.8 })
      );
    });

    it('should stop all sounds in a group when stop() is called for a group-mapped SoundType', () => {
      soundSystem.stop(SoundCategory.SOUND, SoundType.DIE);
      expect(mockSoundStop).toHaveBeenCalledWith('infantry_death_c.ogg');
      expect(mockSoundStop).toHaveBeenCalledWith('infantry_death_e.ogg');

      mockSoundStop.mockClear();
      soundSystem.stop(SoundCategory.SOUND, SoundType.RETREAT);
      expect(mockSoundStop).toHaveBeenCalledWith('infantry_retreat_a.ogg');
      expect(mockSoundStop).toHaveBeenCalledWith('infantry_retreat_c.ogg');

      mockSoundStop.mockClear();
      soundSystem.stop(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundStop).toHaveBeenCalledWith('arrow.ogg');
      expect(mockSoundStop).toHaveBeenCalledWith('arrow_2.ogg');
      expect(mockSoundStop).toHaveBeenCalledWith('arrow_3.ogg');
    });
  });

  describe('Arrow Sound Group & Volley Configuration (arrowVolley)', () => {
    it('should load arrow sound group ["arrow.ogg", "arrow_2.ogg", "arrow_3.ogg"] from JSON configuration', () => {
      expect(soundsJson.soundGroups.arrow).toEqual([
        'arrow.ogg',
        'arrow_2.ogg',
        'arrow_3.ogg',
      ]);
      expect((hudJson as any).soundGroups.arrow).toEqual([
        'arrow.ogg',
        'arrow_2.ogg',
        'arrow_3.ogg',
      ]);
      expect(soundSystem.getSoundGroup('arrow')).toEqual([
        'arrow.ogg',
        'arrow_2.ogg',
        'arrow_3.ogg',
      ]);
      expect(soundSystem.getSoundName(SoundType.ARROW)).toBe('arrow');

      // Verify random selection across the 3 arrow sounds
      soundSystem.setRandomProvider(() => 0.1);
      soundSystem.play(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('arrow.ogg', expect.anything());

      soundSystem.setRandomProvider(() => 0.5);
      soundSystem.play(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('arrow_2.ogg', expect.anything());

      soundSystem.setRandomProvider(() => 0.9);
      soundSystem.play(SoundCategory.SOUND, SoundType.ARROW);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('arrow_3.ogg', expect.anything());
    });

    it('should play multiple sound sources matching shooter count up to max_volley_sounds', () => {
      // Configure max_volley_sounds = 10
      configureArrowVolleySounds({ max_volley_sounds: 10 }, soundSystem);
      expect(getArrowVolleySoundsConfig().max_volley_sounds).toBe(10);

      // 10 archers fire -> 10 arrow sounds played
      mockSoundPlay.mockClear();
      const played10 = soundSystem.playArrowVolley(10, 12);
      expect(played10).toBe(10);
      expect(mockSoundPlay).toHaveBeenCalledTimes(10);
      for (const call of mockSoundPlay.mock.calls) {
        expect(call[0]).toMatch(/^arrow(_[23])?\.ogg$/);
      }

      // Cap at max_volley_sounds = 3 even when 16 archers fire
      configureArrowVolleySounds({ max_volley_sounds: 3 }, soundSystem);
      mockSoundPlay.mockClear();
      const playedCapped = soundSystem.playArrowVolley(16, 16);
      expect(playedCapped).toBe(3);
      expect(mockSoundPlay).toHaveBeenCalledTimes(3);
    });

    it('should scale volley volume by squad size so larger squads sound greater and small/injured squads are noticeably quieter', () => {
      configureArrowVolleySounds(
        {
          max_volley_sounds: 10,
          scale_volume_by_squad_size: true,
          min_squad_volume_factor: 0.35,
          max_squad_volume_factor: 1.0,
          reference_squad_size: 12,
        },
        soundSystem
      );

      // Full squad of 12 archers
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(12, 12);
      const largeSquadVolume = mockSoundPlay.mock.calls[0][1].volume;

      // Injured squad with 6 archers remaining out of 12
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(6, 12);
      const mediumSquadVolume = mockSoundPlay.mock.calls[0][1].volume;

      // Heavily injured squad with 1 archer remaining out of 12
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(1, 12);
      const smallSquadVolume = mockSoundPlay.mock.calls[0][1].volume;

      expect(largeSquadVolume).toBeCloseTo(0.8 * 1.0, 4);
      expect(smallSquadVolume).toBeCloseTo(0.8 * 0.35, 4);
      expect(largeSquadVolume).toBeGreaterThan(mediumSquadVolume);
      expect(mediumSquadVolume).toBeGreaterThan(smallSquadVolume);

      // When scale_volume_by_squad_size is false, volume should remain constant at baseVolume
      configureArrowVolleySounds({ scale_volume_by_squad_size: false }, soundSystem);
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(1, 12);
      expect(mockSoundPlay.mock.calls[0][1].volume).toBeCloseTo(0.8, 4);
    });

    it('should support configurable flags for pitch and speed variations on arrow volleys', () => {
      // Disable both pitch and speed variation -> exact speed 1.0
      configureArrowVolleySounds(
        {
          max_volley_sounds: 4,
          vary_pitch: false,
          vary_speed: false,
        },
        soundSystem
      );
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(4, 12);
      expect(mockSoundPlay).toHaveBeenCalledTimes(4);
      for (const call of mockSoundPlay.mock.calls) {
        expect(call[1].speed).toBe(1.0);
      }

      // Enable pitch variation with range 0.15 and deterministic rng = 1.0 -> speed = 1.15
      configureArrowVolleySounds(
        {
          max_volley_sounds: 2,
          vary_pitch: true,
          vary_speed: false,
          pitch_variation_range: 0.15,
        },
        soundSystem
      );
      soundSystem.setRandomProvider(() => 1.0);
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(2, 12);
      expect(mockSoundPlay.mock.calls[0][1].speed).toBeCloseTo(1.15, 4);

      // Enable speed variation with range 0.2 and deterministic rng = 0.0 -> speed = 0.8
      configureArrowVolleySounds(
        {
          max_volley_sounds: 2,
          vary_pitch: false,
          vary_speed: true,
          speed_variation_range: 0.2,
        },
        soundSystem
      );
      soundSystem.setRandomProvider(() => 0.0);
      mockSoundPlay.mockClear();
      soundSystem.playArrowVolley(2, 12);
      expect(mockSoundPlay.mock.calls[0][1].speed).toBeCloseTo(0.8, 4);
    });

    it('should load stone sound group for Slinger with 47495__kwandalist__steinwurf_1..3.ogg and play stone volleys', () => {
      const expectedStoneSounds = [
        '47495__kwandalist__steinwurf_1.ogg',
        '47495__kwandalist__steinwurf_2.ogg',
        '47495__kwandalist__steinwurf_3.ogg',
      ];
      expect((soundsJson.soundGroups as any).stone).toEqual(expectedStoneSounds);
      expect((hudJson as any).soundGroups.stone).toEqual(expectedStoneSounds);
      expect(soundSystem.getSoundGroup('stone')).toEqual(expectedStoneSounds);
      expect(soundSystem.getSoundGroup('slinger')).toEqual(expectedStoneSounds);
      expect(soundSystem.getSoundName(SoundType.STONE)).toBe('stone');

      // Verify random selection across the 3 stone-throwing sounds
      soundSystem.setRandomProvider(() => 0.1);
      soundSystem.play(SoundCategory.SOUND, SoundType.STONE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('47495__kwandalist__steinwurf_1.ogg', expect.anything());

      soundSystem.setRandomProvider(() => 0.5);
      soundSystem.play(SoundCategory.SOUND, SoundType.STONE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('47495__kwandalist__steinwurf_2.ogg', expect.anything());

      soundSystem.setRandomProvider(() => 0.9);
      soundSystem.play(SoundCategory.SOUND, SoundType.STONE);
      expect(mockSoundPlay).toHaveBeenLastCalledWith('47495__kwandalist__steinwurf_3.ogg', expect.anything());

      // Verify playStoneVolley for an 8-model Slinger squad
      configureArrowVolleySounds({ max_volley_sounds: 10 }, soundSystem);
      mockSoundPlay.mockClear();
      const played = soundSystem.playStoneVolley(8, 8);
      expect(played).toBe(8);
      expect(mockSoundPlay).toHaveBeenCalledTimes(8);
      for (const call of mockSoundPlay.mock.calls) {
        expect(call[0]).toMatch(/^47495__kwandalist__steinwurf_[123]\.ogg$/);
      }
    });
  });
});
