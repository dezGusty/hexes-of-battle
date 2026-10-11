import { describe, it, expect, vi } from "vitest";

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { Container, Texture, Spritesheet, Assets } from "pixi.js";
import { Battle, ArmyControlType } from "../battle";
import { HexMap } from "../shared/hex-map";
import { BattleView } from "./battle-view";
import { BattleSettings } from "./settings";
import { AggressiveCPUPlayer } from "./aggressive-cpu-player";
import { DefensiveCPUPlayer } from "./defensive-cpu-player";
import { DumbCPUPlayer } from "./dumb-cpu-player";
import { UnitStatsPanel } from "../ui/unit-stats-panel";
import { BattleMenuPanel } from "../ui/battle-menu";

describe("BattleView Army Names Formatting", () => {
  const dummyAssets: any = { softCursorTextures: {} };
  const settings = new BattleSettings();

  it("should format Player 1 with '- Human' suffix and Player 2 with 'CPU <Personality> -' prefix by default", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    // By default: army_control[0] is PLAYER, army_control[1] is AI
    const dumbCpu = new DumbCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, dumbCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Dumb - Knights of The Grand Duke");
  });

  it("should format Player 2 with 'CPU Aggressive -' prefix when CPU is Aggressive", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const aggressiveCpu = new AggressiveCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, aggressiveCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Aggressive - Knights of The Grand Duke");
  });

  it("should format Player 2 with 'CPU Defensive -' prefix when CPU is Defensive", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const defensiveCpu = new DefensiveCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, defensiveCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Defensive - Knights of The Grand Duke");
  });

  it("should handle custom army names and reverse army control correctly", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    // Player 1 is AI, Player 2 is Human
    battle.army_control = [ArmyControlType.AI, ArmyControlType.PLAYER];
    const aggressiveCpu = new AggressiveCPUPlayer(battle);

    const customNames: [string, string] = ["Shadow Legion", "Silver Vanguard"];
    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, aggressiveCpu, customNames);

    // Player 1 always has note as suffix
    expect(view.getFormattedArmyName(0)).toBe("Shadow Legion - CPU Aggressive");
    // Player 2 always has note as prefix
    expect(view.getFormattedArmyName(1)).toBe("Human - Silver Vanguard");
  });
});

describe("UnitStatsPanel Visibility", () => {
  it("should initialize as hidden and toggle to visible on first toggle click", () => {
    const container = new Container();
    const dummyUiSheet = {
      textures: new Proxy({}, {
        get: () => Texture.EMPTY,
      }),
    } as unknown as Spritesheet;

    const panel = new UnitStatsPanel(container, dummyUiSheet);

    // Initial state must be hidden
    expect(panel.isVisible()).toBe(false);

    // First toggle must show the panel
    panel.toggleVisibility();
    expect(panel.isVisible()).toBe(true);

    // Second toggle must hide the panel
    panel.toggleVisibility();
    expect(panel.isVisible()).toBe(false);

    // show() and hide() direct controls
    panel.show();
    expect(panel.isVisible()).toBe(true);
    panel.hide();
    expect(panel.isVisible()).toBe(false);
  });

  it("should persist and load showStats in hob.hex in localStorage", () => {
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };

    const settings = new BattleSettings();
    expect(settings.hex.showStats).toBe(false);

    // Change and save
    settings.hex.showStats = true;
    settings.save();

    const storedHex = JSON.parse(storage['hob.hex'] || '{}');
    expect(storedHex.showStats).toBe(true);

    // Load in fresh settings
    const newSettings = new BattleSettings();
    newSettings.load();
    expect(newSettings.hex.showStats).toBe(true);

    // Turn off and save
    newSettings.hex.showStats = false;
    newSettings.save();

    const updatedSettings = new BattleSettings();
    updatedSettings.load();
    expect(updatedSettings.hex.showStats).toBe(false);
  });

  it("should persist and load musicOn in hob.sound in localStorage", () => {
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };

    const settings = new BattleSettings();
    expect(settings.sound.musicOn).toBe(false);

    // Toggle music on, change volume, change sound settings, and save
    settings.sound.musicOn = true;
    settings.sound.musicVolume = 0.45;
    settings.sound.soundOn = false;
    settings.sound.soundVolume = 0.85;
    settings.save();

    const storedSound = JSON.parse(storage['hob.sound'] || '{}');
    expect(storedSound.musicOn).toBe(true);
    expect(storedSound.musicVolume).toBe(0.45);
    expect(storedSound.soundOn).toBe(false);
    expect(storedSound.soundVolume).toBe(0.85);

    // Load in fresh settings
    const loadedSettings = new BattleSettings();
    loadedSettings.load();
    expect(loadedSettings.sound.musicOn).toBe(true);
    expect(loadedSettings.sound.musicVolume).toBe(0.45);
    expect(loadedSettings.sound.soundOn).toBe(false);
    expect(loadedSettings.sound.soundVolume).toBe(0.85);

    // Toggle soundOn back on, music off, and save
    loadedSettings.sound.musicOn = false;
    loadedSettings.sound.soundOn = true;
    loadedSettings.save();

    const reloadedSettings = new BattleSettings();
    reloadedSettings.load();
    expect(reloadedSettings.sound.musicOn).toBe(false);
    expect(reloadedSettings.sound.soundOn).toBe(true);
  });

  it("should persist and load showSceneInspector in hob.debug in localStorage", () => {
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };

    const settings = new BattleSettings();
    expect(settings.debug.showSceneInspector).toBe(false);

    // Toggle inspector on and save
    settings.debug.showSceneInspector = true;
    settings.save();

    const storedDebug = JSON.parse(storage['hob.debug'] || '{}');
    expect(storedDebug.showSceneInspector).toBe(true);

    // Load in fresh settings instance
    const loadedSettings = new BattleSettings();
    loadedSettings.load();
    expect(loadedSettings.debug.showSceneInspector).toBe(true);

    // Toggle inspector off and save
    loadedSettings.debug.showSceneInspector = false;
    loadedSettings.save();

    const reloadedSettings = new BattleSettings();
    reloadedSettings.load();
    expect(reloadedSettings.debug.showSceneInspector).toBe(false);
  });
});

describe("BattleMenuPanel 2-Column Layout & Scene Inspector Toggle", () => {
  it("should create widened 2-column panel with 3D Scene Inspector button in column 2", () => {
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
      };
    }

    const textureNames = [
      'thin_button_2_normal.png',
      'thin_button_2_hover.png',
      'btn_simple.png',
      'btn_simple_hover.png',
      'btn_simple_click.png',
      'glyph_fullscreen.png',
      'glyph_xy.png',
      'glyph_grid.png',
      'glyph_toggle_healthbars.png',
      'glyph_toggle_music.png',
      'glyph_toggle_perf_stats.png',
      'glyph_plus.png',
      'glyph_next_turn.png',
      'panel.png',
    ];
    textureNames.forEach((name) => {
      try {
        Assets.cache.set(name, Texture.EMPTY);
      } catch {
        // ignore
      }
    });

    const container = new Container();
    const dummyUiSheet = {
      textures: new Proxy({}, {
        get: () => Texture.EMPTY,
      }),
    } as unknown as Spritesheet;

    const menu = new BattleMenuPanel(container, dummyUiSheet);

    expect(menu.window.width).toBeGreaterThanOrEqual(900);
    expect(menu.fullscreenToggleButton).toBeDefined();
    expect(menu.toggleCoordsButton).toBeDefined();
    expect(menu.toggleGridButton).toBeDefined();
    expect(menu.showHealthbarsButton).toBeDefined();
    expect(menu.toggleMusicButton).toBeDefined();
    expect(menu.musicVolumeSlider).toBeDefined();
    expect(menu.toggleSoundButton).toBeDefined();
    expect(menu.soundVolumeSlider).toBeDefined();
    expect(menu.toggleSceneInspectorButton).toBeDefined();
    expect(menu.saveButton).toBeDefined();
    expect(menu.loadButton).toBeDefined();

    // Verify column 2 X coordinates are greater than column 1 X coordinates
    expect(menu.toggleMusicButton!.position.x).toBeGreaterThan(menu.fullscreenToggleButton!.position.x);
    expect(menu.toggleSoundButton!.position.x).toBeGreaterThan(menu.toggleCoordsButton!.position.x);
    expect(menu.saveButton!.position.x).toBeGreaterThan(menu.toggleGridButton!.position.x);
    expect(menu.loadButton!.position.x).toBeGreaterThan(menu.showHealthbarsButton!.position.x);

    let inspectorToggled = false;
    menu.onToggleSceneInspector = () => {
      inspectorToggled = true;
    };
    menu.toggleSceneInspectorButton!.onPress.emit();
    expect(inspectorToggled).toBe(true);

    menu.destroy();
  });
});



