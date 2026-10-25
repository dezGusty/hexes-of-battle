import { describe, it, expect, vi } from "vitest";

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { Container, Texture, Spritesheet, Assets, Sprite } from "pixi.js";
import { Battle, ArmyControlType, MapRenderUpdate } from "../battle";
import { HexMap } from "../shared/hex-map";
import { BattleView } from "./battle-view";
import { BattleSettings } from "./settings";
import { AggressiveCPUPlayer } from "./aggressive-cpu-player";
import { DefensiveCPUPlayer } from "./defensive-cpu-player";
import { DumbCPUPlayer } from "./dumb-cpu-player";
import { UnitStatsPanel, DisplayedStat } from "../ui/unit-stats-panel";
import { EnemyStatsPanel } from "../ui/enemy-stats-panel";
import { Creature, CreatureType } from "./creature";
import { BattleMenuPanel } from "../ui/battle-menu";
import { MoraleState } from "./combat-rules";
import { getMoraleTexture } from "../ui/morale-icon-utils";
import { Ability, AbilityType } from "./ability";
import { CommonControls } from "../ui/common-controls";
import { BESTIARY_MOTIFS, drawBestiaryRelief } from "../ui/medieval-ui-decorations";
import { Graphics } from "pixi.js";
import pkg from "../../package.json";

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
    expect(settings.hex.showStats).toBe(true);

    // Change and save
    settings.hex.showStats = false;
    settings.save();

    const storedHex = JSON.parse(storage['hob.hex'] || '{}');
    expect(storedHex.showStats).toBe(false);

    // Load in fresh settings
    const newSettings = new BattleSettings();
    newSettings.load();
    expect(newSettings.hex.showStats).toBe(false);

    // Turn back on and save
    newSettings.hex.showStats = true;
    newSettings.save();

    const updatedSettings = new BattleSettings();
    updatedSettings.load();
    expect(updatedSettings.hex.showStats).toBe(true);
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

  it("should persist and load showFps in hob.debug and hob.debug.showFps in localStorage", () => {
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
    expect(settings.debug.showFps).toBe(true);

    // Toggle FPS off and save
    settings.debug.showFps = false;
    settings.save();

    const storedDebug = JSON.parse(storage['hob.debug'] || '{}');
    expect(storedDebug.showFps).toBe(false);
    expect(storage['hob.debug.showFps']).toBe('false');

    // Load in fresh settings instance
    const loadedSettings = new BattleSettings();
    loadedSettings.load();
    expect(loadedSettings.debug.showFps).toBe(false);

    // Toggle FPS on and save
    loadedSettings.debug.showFps = true;
    loadedSettings.save();

    const reloadedSettings = new BattleSettings();
    reloadedSettings.load();
    expect(reloadedSettings.debug.showFps).toBe(true);
    expect(storage['hob.debug.showFps']).toBe('true');
  });

  it("should persist and load showCoords in hob.debug and hob.debug.showCoords in localStorage", () => {
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
    expect(settings.debug.showCoords).toBe(true);

    // Toggle coords off and save
    settings.debug.showCoords = false;
    settings.save();

    const storedDebug = JSON.parse(storage['hob.debug'] || '{}');
    expect(storedDebug.showCoords).toBe(false);
    expect(storage['hob.debug.showCoords']).toBe('false');

    // Fresh instance loads persisted false preference
    const loadedSettings = new BattleSettings();
    loadedSettings.load();
    expect(loadedSettings.debug.showCoords).toBe(false);

    // Toggle coords back on and save
    loadedSettings.debug.showCoords = true;
    loadedSettings.save();

    const reloadedSettings = new BattleSettings();
    reloadedSettings.load();
    expect(reloadedSettings.debug.showCoords).toBe(true);
    expect(storage['hob.debug.showCoords']).toBe('true');
  });

  it("should persist and load showGrid in hob.hex and hob.hex.showGrid in localStorage", () => {
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
    expect(settings.hex.showGrid).toBe(true);

    // Toggle grid off and save
    settings.hex.showGrid = false;
    settings.save();

    const storedHex = JSON.parse(storage['hob.hex'] || '{}');
    expect(storedHex.showGrid).toBe(false);
    expect(storage['hob.hex.showGrid']).toBe('false');

    // Fresh instance loads persisted false preference
    const loadedSettings = new BattleSettings();
    loadedSettings.load();
    expect(loadedSettings.hex.showGrid).toBe(false);

    // Toggle grid back on and save
    loadedSettings.hex.showGrid = true;
    loadedSettings.save();

    const reloadedSettings = new BattleSettings();
    reloadedSettings.load();
    expect(reloadedSettings.hex.showGrid).toBe(true);
    expect(storage['hob.hex.showGrid']).toBe('true');
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
      'glyph_toggle_stats.png',
      'glyph_plus.png',
      'glyph_next_turn.png',
      'cursor_arrow.png',
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
    expect(menu.toggleFpsButton).toBeDefined();
    expect(menu.toggleMusicButton).toBeDefined();
    expect(menu.musicVolumeSlider).toBeDefined();
    expect(menu.toggleSoundButton).toBeDefined();
    expect(menu.soundVolumeSlider).toBeDefined();
    expect(menu.toggleSceneInspectorButton).toBeDefined();
    expect(menu.saveButton).toBeDefined();
    expect(menu.loadButton).toBeDefined();
    expect(menu.toggleStatsButton).toBeDefined();
    expect(menu.toggleHardwareCursorButton).toBeDefined();

    // Verify column 2 X coordinates are greater than column 1 X coordinates
    expect(menu.toggleMusicButton!.position.x).toBeGreaterThan(menu.fullscreenToggleButton!.position.x);
    expect(menu.toggleSoundButton!.position.x).toBeGreaterThan(menu.toggleCoordsButton!.position.x);
    expect(menu.saveButton!.position.x).toBeGreaterThan(menu.toggleGridButton!.position.x);
    expect(menu.loadButton!.position.x).toBeGreaterThan(menu.showHealthbarsButton!.position.x);
    expect(menu.toggleStatsButton!.position.x).toBeGreaterThan(menu.toggleSceneInspectorButton!.position.x);
    expect(menu.toggleHardwareCursorButton!.position.x).toBeGreaterThan(menu.toggleFpsButton!.position.x);
    expect(menu.toggleHardwareCursorButton!.position.y).toBe(430);

    let inspectorToggled = false;
    menu.onToggleSceneInspector = () => {
      inspectorToggled = true;
    };
    menu.toggleSceneInspectorButton!.onPress.emit();
    expect(inspectorToggled).toBe(true);

    let fpsToggled = false;
    menu.onToggleFps = () => {
      fpsToggled = true;
    };
    menu.toggleFpsButton!.onPress.emit();
    expect(fpsToggled).toBe(true);

    let statsToggled = false;
    menu.onToggleStats = () => {
      statsToggled = true;
    };
    menu.toggleStatsButton!.onPress.emit();
    expect(statsToggled).toBe(true);

    let cursorToggled: boolean | undefined;
    menu.onToggleHardwareCursor = (hide) => {
      cursorToggled = hide;
    };
    expect(menu.hardwareCursorChecked).toBe(false);
    menu.toggleHardwareCursorButton!.onPress.emit();
    expect(cursorToggled).toBe(true);
    expect(menu.hardwareCursorChecked).toBe(true);

    menu.setHardwareCursorHidden(false);
    expect(menu.hardwareCursorChecked).toBe(false);

    menu.destroy();
  });

  it("should persist and load hideHardwareCursor in hob.hideHardwareCursor in localStorage", () => {
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
    // Default setting must be visible (false)
    expect(settings.hideHardwareCursor).toBe(false);
    expect(settings.hotkeys.toggleHardwareCursor).toBe('f8');

    // Enable hideHardwareCursor and save
    settings.hideHardwareCursor = true;
    settings.save();
    expect(storage['hob.hideHardwareCursor']).toBe('true');

    // Load into new settings instance
    const freshSettings = new BattleSettings();
    expect(freshSettings.hideHardwareCursor).toBe(false);
    freshSettings.load();
    expect(freshSettings.hideHardwareCursor).toBe(true);

    // Disable and save
    freshSettings.hideHardwareCursor = false;
    freshSettings.save();
    expect(storage['hob.hideHardwareCursor']).toBe('false');

    const freshSettings2 = new BattleSettings();
    freshSettings2.load();
    expect(freshSettings2.hideHardwareCursor).toBe(false);
  });

  it("should display game version text in top-right corner when FPS is displayed and sync visibility with FPS", () => {
    const dummyAssets: any = { softCursorTextures: {} };
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const settings = new BattleSettings();
    settings.debug.showFps = true;

    ['thin_button_normal.png', 'thin_button_hover.png', 'glyph_minus.png', 'glyph_plus.png'].forEach((name) => {
      try {
        Assets.cache.set(name, Texture.WHITE);
      } catch {}
    });

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4);
    view.initialize({
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onZoomSliderUpdate: vi.fn(),
      onNextTurn: vi.fn(),
      onNextUnit: vi.fn(),
      onReset: vi.fn(),
      onRest: vi.fn(),
      onActiveAbility1: vi.fn(),
    });

    expect(view.versionText).toBeDefined();
    expect(view.versionText?.text).toBe(`Hexes Of Battle v.${pkg.version}`);
    expect(view.versionText?.visible).toBe(true);
    expect(view.versionText?.x).toBe(1905);

    // Update with 60 fps
    view.update(16.6, 60);
    expect(view.versionText?.visible).toBe(true);

    // Hide FPS
    view.setFpsVisible(false);
    expect(view.versionText?.visible).toBe(false);

    // Show FPS
    view.setFpsVisible(true);
    expect(view.versionText?.visible).toBe(true);
  });
});

describe("UnitStatsPanel & EnemyStatsPanel Ammo Display", () => {
  const dummyUiSheet = {
    textures: new Proxy({}, {
      get: () => Texture.EMPTY,
    }),
  } as unknown as Spritesheet;

  it("should display empty ammo text and dimmed icon in UnitStatsPanel for units without ammunition", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, dummyUiSheet);
    const peasant = new Creature(CreatureType.PEASANT);

    panel.setCreature(peasant);
    panel.update();

    const ammoVal = (panel as any).statValues[DisplayedStat.AMMO];
    const ammoIcon = (panel as any).statIcons[DisplayedStat.AMMO];

    expect(ammoVal.text).toBe("");
    expect(ammoVal.text).not.toBe("010");
    expect(ammoIcon.tint).toBe(0x666666);
  });

  it("should display current and max ammo in UnitStatsPanel for units with ammunition", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, dummyUiSheet);
    const archer = new Creature(CreatureType.PEASANT_ARCHER);

    panel.setCreature(archer);
    panel.update();

    const ammoVal = (panel as any).statValues[DisplayedStat.AMMO];
    const ammoIcon = (panel as any).statIcons[DisplayedStat.AMMO];

    expect(ammoVal.text).toBe("10 / 10");
    expect(ammoIcon.tint).toBe(0xffffff);

    // After firing an arrow (ammo consumed)
    archer.stats.remaining_ammo = 8;
    panel.setCreature(archer);
    panel.update();
    expect(ammoVal.text).toBe("8 / 10");
  });

  it("should display empty ammo text and dimmed icon in EnemyStatsPanel for enemy units without ammunition", () => {
    const container = new Container();
    const panel = new EnemyStatsPanel(container, dummyUiSheet);
    const peasant = new Creature(CreatureType.PEASANT);

    panel.setCreature(peasant);
    panel.update();

    const ammoVal = (panel as any).statValues[DisplayedStat.AMMO];
    const ammoIcon = (panel as any).statIcons[DisplayedStat.AMMO];

    expect(ammoVal.text).toBe("");
    expect(ammoVal.text).not.toBe("0/0");
    expect(ammoIcon.tint).toBe(0x666666);
  });

  it("should display ammo in EnemyStatsPanel for enemy units with ammunition", () => {
    const container = new Container();
    const panel = new EnemyStatsPanel(container, dummyUiSheet);
    const archer = new Creature(CreatureType.PEASANT_ARCHER);

    panel.setCreature(archer);
    panel.update();

    const ammoVal = (panel as any).statValues[DisplayedStat.AMMO];
    const ammoIcon = (panel as any).statIcons[DisplayedStat.AMMO];

    expect(ammoVal.text).toBe("10/10");
    expect(ammoIcon.tint).toBe(0xffffff);
  });

  it("should display updated morale tooltip with Steady 6-15 and High >15 in UnitStatsPanel and EnemyStatsPanel", () => {
    const container = new Container();
    const unitPanel = new UnitStatsPanel(container, dummyUiSheet);
    const enemyPanel = new EnemyStatsPanel(container, dummyUiSheet);

    const peasant = new Creature(CreatureType.PEASANT);
    unitPanel.setCreature(peasant);
    enemyPanel.setCreature(peasant);

    const unitMoraleDesc = (unitPanel as any).statDescriptions[DisplayedStat.MORALE];
    const enemyMoraleDesc = (enemyPanel as any).statDescriptions[DisplayedStat.MORALE];

    expect(unitMoraleDesc).toContain("Steady: 6-15, High: >15");
    expect(enemyMoraleDesc).toContain("Steady: 6-15, High: >15");

    // Custom breakpoints update dynamically on setCreature
    const customCreature = new Creature(CreatureType.SWORDSMAN);
    customCreature.combatConfig = {
      morale: {
        maxMorale: 30,
        casualtyThresholdRatio: 0.25,
        panicBaseChance: 0.3,
        exhaustionMoraleCheckPenalty: 0.2,
        heroAuraBonus: 5,
        heroAuraRadius: 2,
        routingTurnLoss: true,
        undamagedTurnRecovery: 1,
        restRecovery: 1,
        breakpoints: { routing: 1, panicked: 4, wavering: 8, steady: 20 },
      },
    } as any;

    unitPanel.setCreature(customCreature);
    enemyPanel.setCreature(customCreature);

    expect((unitPanel as any).statDescriptions[DisplayedStat.MORALE]).toContain("Steady: 9-20, High: >20");
    expect((enemyPanel as any).statDescriptions[DisplayedStat.MORALE]).toContain("Steady: 9-20, High: >20");
  });

  it("should display the morale icon next to the morale value in UnitStatsPanel and update across morale states", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, dummyUiSheet);
    const peasant = new Creature(CreatureType.PEASANT);

    panel.setCreature(peasant);
    panel.update();

    const moraleValText = (panel as any).statValues[DisplayedStat.MORALE];
    const moraleIcon = panel.getMoraleStateIcon();

    expect(moraleIcon).toBeDefined();
    expect(moraleIcon.visible).toBe(true);
    expect(moraleIcon.x).toBeGreaterThan(moraleValText.x);
    expect(moraleIcon.width).toBe(20);
    expect(moraleIcon.height).toBe(20);

    // Test across morale states
    const statesToTest = [
      { morale: 20, expectedState: MoraleState.HIGH },
      { morale: 10, expectedState: MoraleState.STEADY },
      { morale: 4, expectedState: MoraleState.WAVERING },
      { morale: 2, expectedState: MoraleState.PANICKED },
      { morale: 0, expectedState: MoraleState.ROUTING },
    ];

    for (const { morale, expectedState } of statesToTest) {
      peasant.stats.morale = morale;
      panel.update();
      expect(moraleValText.text).toBe(`${morale}`);
      expect(moraleIcon.visible).toBe(true);
      expect(moraleIcon.texture).toBe(getMoraleTexture(expectedState, dummyUiSheet));
    }
  });

  it("should display the morale icon next to the morale value in EnemyStatsPanel and update across morale states", () => {
    const container = new Container();
    const panel = new EnemyStatsPanel(container, dummyUiSheet);
    const enemy = new Creature(CreatureType.SWORDSMAN);

    panel.setCreature(enemy);
    panel.update();

    const moraleValText = (panel as any).statValues[DisplayedStat.MORALE];
    const moraleIcon = panel.getMoraleStateIcon();

    expect(moraleIcon).toBeDefined();
    expect(moraleIcon.visible).toBe(true);
    expect(moraleIcon.x).toBeGreaterThan(moraleValText.x);
    expect(moraleIcon.width).toBe(16);
    expect(moraleIcon.height).toBe(16);

    // Test across morale states
    const statesToTest = [
      { morale: 25, expectedState: MoraleState.HIGH },
      { morale: 12, expectedState: MoraleState.STEADY },
      { morale: 5, expectedState: MoraleState.WAVERING },
      { morale: 1, expectedState: MoraleState.PANICKED },
      { morale: 0, expectedState: MoraleState.ROUTING },
    ];

    for (const { morale, expectedState } of statesToTest) {
      enemy.stats.morale = morale;
      panel.update();
      expect(moraleValText.text).toBe(`${morale}`);
      expect(moraleIcon.visible).toBe(true);
      expect(moraleIcon.texture).toBe(getMoraleTexture(expectedState, dummyUiSheet));
    }
  });

  it("should render 20x20 morale icon next to squad unit count in BattleView", () => {
    const dummyAssets: any = { softCursorTextures: {} };
    const settings = new BattleSettings();
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const creature = new Creature(CreatureType.SWORDSMAN);
    creature.position = { x: 2, y: 2 };
    battle.creatures.push(creature);
    const dumbCpu = new DumbCPUPlayer(battle);

    Assets.cache.set('thin_button_normal.png', Texture.WHITE);
    Assets.cache.set('progress_fill.png', Texture.WHITE);
    Assets.cache.set('morale/morale_steady.png', Texture.WHITE);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, dumbCpu);
    (view as any).initializeMapGrid();
    view.renderUnits(new MapRenderUpdate());

    const subgroups = (view as any).unitRenderSubgroups as Container[];
    let foundMoraleSprite: Sprite | undefined;
    for (const group of subgroups) {
      for (const child of group.children) {
        if (child instanceof Sprite && child.width === 20 && child.height === 20) {
          foundMoraleSprite = child;
          break;
        }
      }
      if (foundMoraleSprite) break;
    }
    expect(foundMoraleSprite).toBeDefined();
    expect(foundMoraleSprite!.width).toBe(20);
    expect(foundMoraleSprite!.height).toBe(20);
  });
});

describe("Redesigned Medieval Battle UI (Combined Stats, Abilities, Scrollable Perks, Common Actions)", () => {
  const createDummyUiSheet = (): Spritesheet =>
    ({
      textures: new Proxy(
        {},
        {
          get: () => Texture.WHITE,
        }
      ),
    }) as unknown as Spritesheet;

  it("should render medieval metalwork frame and bird/wild animal reliefs across all bestiary motifs", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, createDummyUiSheet());

    const motifs = panel.getBestiaryMotifsRendered();
    expect(motifs).toEqual(BESTIARY_MOTIFS);
    expect(motifs).toContain("falcon");
    expect(motifs).toContain("eagle");
    expect(motifs).toContain("raven");
    expect(motifs).toContain("songbird");
    expect(motifs).toContain("wolf");
    expect(motifs).toContain("lion");
    expect(motifs).toContain("stag");
    expect(motifs).toContain("boar");

    // Verify drawBestiaryRelief draws cleanly for every motif (normal and mirrored)
    for (const motif of BESTIARY_MOTIFS) {
      const g = new Graphics();
      drawBestiaryRelief(g, motif, 50, 50, 1.0, false);
      drawBestiaryRelief(g, motif, 100, 50, 1.0, true);
      expect(g).toBeDefined();
    }
  });

  it("should display all 12 unit stats with an icon, current value label, and hover tooltip", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, createDummyUiSheet());
    panel.show();

    const creature = new Creature(CreatureType.PEASANT_ARCHER);
    panel.setCreature(creature);
    panel.update();

    const statIcons = (panel as any).statIcons as Sprite[];
    const statValues = (panel as any).statValues as any[];
    const statAreas = (panel as any).statTooltipAreas as Container[];
    const tooltipText = (panel as any).tooltipText;
    const tooltipWindow = (panel as any).tooltipWindow;

    expect(statIcons.length).toBe(DisplayedStat.NUM_STATS);
    expect(statValues.length).toBe(DisplayedStat.NUM_STATS);
    expect(statAreas.length).toBe(DisplayedStat.NUM_STATS);

    for (let i = 0; i < DisplayedStat.NUM_STATS; i++) {
      expect(statIcons[i]).toBeDefined();
      expect(statIcons[i].width).toBeGreaterThan(0);
      expect(statValues[i]).toBeDefined();
      expect(statValues[i].text.length).toBeGreaterThan(0);

      // Hover over the stat cell to verify its tooltip appears
      const area = statAreas[i];
      const hoverX = panel.window.x + area.x + area.width / 2;
      const hoverY = panel.window.y + area.y + area.height / 2;
      panel.mousemove({ x: hoverX, y: hoverY });

      expect(tooltipWindow.visible).toBe(true);
      expect(tooltipText.visible).toBe(true);
      expect(tooltipText.text.length).toBeGreaterThan(5);
    }
  });

  it("should show 5 permanent stylized circular ability placeholders and place up to 5 ability buttons inside them", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, createDummyUiSheet());
    panel.show();

    const placeholders = panel.getAbilityPlaceholders();
    expect(placeholders.length).toBe(UnitStatsPanel.MAX_ABILITY_SLOTS);
    expect(placeholders.length).toBe(5);

    // Initially with a unit that has 0 abilities, all 5 placeholders are visible and unoccupied
    const swordsman = new Creature(CreatureType.SWORDSMAN);
    swordsman.abilities = [];
    panel.setCreature(swordsman);
    panel.update();

    expect(panel.getSkillSlots().length).toBe(0);
    for (let i = 0; i < 5; i++) {
      expect(placeholders[i].container.visible).toBe(true);
      expect(placeholders[i].isOccupied).toBe(false);
    }

    // With 3 abilities, slots 0..2 are placed at the exact coordinates of placeholders 0..2
    const archer = new Creature(CreatureType.PEASANT_ARCHER);
    archer.abilities = [];
    for (let i = 0; i < 3; i++) {
      const ab = new Ability();
      ab.id = `ab-${i}`;
      ab.name = `Ability ${i + 1}`;
      ab.abilityType = AbilityType.Active;
      archer.abilities.push(ab);
    }
    panel.setCreature(archer);
    panel.update();

    const skillSlots = panel.getSkillSlots();
    expect(skillSlots.length).toBe(3);
    for (let i = 0; i < 5; i++) {
      expect(placeholders[i].container.visible).toBe(true);
      if (i < 3) {
        expect(placeholders[i].isOccupied).toBe(true);
        expect(skillSlots[i].x).toBe(placeholders[i].x);
        expect(skillSlots[i].y).toBe(placeholders[i].y);
        expect(skillSlots[i].width).toBe(placeholders[i].width);
        expect(skillSlots[i].height).toBe(placeholders[i].height);
      } else {
        expect(placeholders[i].isOccupied).toBe(false);
      }
    }

    // With 7 abilities on a unit, at most 5 buttons are created and placed in the 5 sockets
    for (let i = 3; i < 7; i++) {
      const ab = new Ability();
      ab.id = `ab-${i}`;
      ab.name = `Ability ${i + 1}`;
      ab.abilityType = AbilityType.Active;
      archer.abilities.push(ab);
    }
    panel.setCreature(archer);
    panel.update();

    expect(panel.getSkillSlots().length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(placeholders[i].isOccupied).toBe(true);
    }
  });

  it("should display up to 6 perks at a time with 2 scroll buttons to scroll through additional perks", () => {
    const container = new Container();
    const panel = new UnitStatsPanel(container, createDummyUiSheet());
    panel.show();

    const perkPlaceholders = panel.getPerkPlaceholders();
    expect(perkPlaceholders.length).toBe(UnitStatsPanel.MAX_VISIBLE_PERKS);
    expect(perkPlaceholders.length).toBe(6);

    const leftBtn = panel.getPerkScrollLeftButton();
    const rightBtn = panel.getPerkScrollRightButton();
    expect(leftBtn).toBeDefined();
    expect(rightBtn).toBeDefined();
    expect(leftBtn.direction).toBe("left");
    expect(rightBtn.direction).toBe("right");

    // Unit with 8 traits
    const veteran = new Creature(CreatureType.SWORDSMAN);
    veteran.stats.traits = [
      "shielded",
      "armored",
      "close_combat_specialist",
      "Spearwall",
      "Cleaving",
      "Unruly",
      "charge",
      "fearsome",
    ];
    panel.setCreature(veteran);
    panel.update();

    // At offset 0: displays first 6 perks; left button disabled, right button enabled
    expect(panel.getPerkScrollOffset()).toBe(0);
    expect(panel.getTraitSlots().length).toBe(6);
    expect(panel.getTraitSlots().map((s) => s.traitName)).toEqual([
      "shielded",
      "armored",
      "close_combat_specialist",
      "Spearwall",
      "Cleaving",
      "Unruly",
    ]);
    expect(leftBtn.enabled).toBe(false);
    expect(rightBtn.enabled).toBe(true);

    // Click right scroll button -> offset becomes 1
    const rightClickX = panel.window.x + rightBtn.x + rightBtn.width / 2;
    const rightClickY = panel.window.y + rightBtn.y + rightBtn.height / 2;
    expect(panel.click({ x: rightClickX, y: rightClickY })).toBe(true);
    expect(panel.getPerkScrollOffset()).toBe(1);
    expect(panel.getTraitSlots().map((s) => s.traitName)).toEqual([
      "armored",
      "close_combat_specialist",
      "Spearwall",
      "Cleaving",
      "Unruly",
      "charge",
    ]);
    expect(leftBtn.enabled).toBe(true);
    expect(rightBtn.enabled).toBe(true);

    // Click right scroll button again -> offset becomes 2 (max offset for 8 traits with 6 visible)
    expect(panel.click({ x: rightClickX, y: rightClickY })).toBe(true);
    expect(panel.getPerkScrollOffset()).toBe(2);
    expect(panel.getTraitSlots().map((s) => s.traitName)).toEqual([
      "close_combat_specialist",
      "Spearwall",
      "Cleaving",
      "Unruly",
      "charge",
      "fearsome",
    ]);
    expect(leftBtn.enabled).toBe(true);
    expect(rightBtn.enabled).toBe(false);

    // Clicking right again when at max offset does not advance past 2
    expect(panel.scrollPerksRight()).toBe(false);
    expect(panel.getPerkScrollOffset()).toBe(2);

    // Click left scroll button -> offset returns to 1
    const leftClickX = panel.window.x + leftBtn.x + leftBtn.width / 2;
    const leftClickY = panel.window.y + leftBtn.y + leftBtn.height / 2;
    expect(panel.click({ x: leftClickX, y: leftClickY })).toBe(true);
    expect(panel.getPerkScrollOffset()).toBe(1);
  });

  it("should render Common Actions (Rest, Next Unit, and a larger standout End Turn) with Rest always in the same spot and deactivated when not applicable", () => {
    Assets.cache.set("thin_button_normal.png", Texture.WHITE);
    Assets.cache.set("thin_button_hover.png", Texture.WHITE);
    Assets.cache.set("thin_button_pressed.png", Texture.WHITE);

    const container = new Container();
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    const unit = new Creature(CreatureType.SWORDSMAN);
    unit.armyAlignment = 0;
    unit.stats.stamina = 6;
    unit.stats.max_stamina = 12;
    battle.creatures.push(unit);
    battle.activeCreatureIndex = 0;

    const panel = new UnitStatsPanel(container, createDummyUiSheet(), undefined, battle);
    const controls = new CommonControls({ zoomMin: 75, zoomMax: 200, zoomStep: 5, zoomValue: 100 });
    controls.initializeButtons();
    panel.bindCommonControls(controls);
    panel.show();
    panel.setCreature(unit);
    panel.update();

    const commonActions = panel.getCommonActions()!;
    expect(commonActions).toBeDefined();
    expect(commonActions.rest).toBeDefined();
    expect(commonActions.nextUnit).toBeDefined();
    expect(commonActions.endTurn).toBeDefined();

    // End Turn is larger and stands out compared to Rest and Next Unit
    expect(commonActions.endTurn.width).toBeGreaterThan(commonActions.rest.width);
    expect(commonActions.endTurn.height).toBeGreaterThan(commonActions.rest.height);
    expect(commonActions.endTurn.width).toBeGreaterThan(commonActions.nextUnit.width);
    expect(commonActions.endTurn.height).toBeGreaterThan(commonActions.nextUnit.height);
    expect(controls.nextTurnButton!.width).toBeGreaterThan(controls.restButton!.width);
    expect(controls.nextTurnButton!.height).toBeGreaterThan(controls.restButton!.height);

    // Record initial Rest button position and visibility when unit can rest
    const initialPanelRestPos = { x: commonActions.rest.container.x, y: commonActions.rest.container.y };
    const initialControlRestPos = { x: controls.restButton!.x, y: controls.restButton!.y };
    expect(unit.canRest()).toBe(true);
    expect(commonActions.rest.enabled).toBe(true);
    expect(commonActions.rest.container.visible).toBe(true);
    expect(commonActions.rest.container.alpha).toBe(1.0);
    expect(controls.restButton!.visible).toBe(true);
    expect(controls.restButton!.enabled).toBe(true);
    expect(controls.restButton!.alpha).toBe(1.0);

    // Make Rest not applicable (unit moved this turn)
    unit.stats.remaining_movement = 0;
    expect(unit.canRest()).toBe(false);
    panel.update();

    // Rest button must remain in the exact same spot and visible, but deactivated
    expect(commonActions.rest.container.visible).toBe(true);
    expect(commonActions.rest.container.x).toBe(initialPanelRestPos.x);
    expect(commonActions.rest.container.y).toBe(initialPanelRestPos.y);
    expect(commonActions.rest.enabled).toBe(false);
    expect(commonActions.rest.container.alpha).toBeCloseTo(0.4);

    expect(controls.restButton!.visible).toBe(true);
    expect(controls.restButton!.x).toBe(initialControlRestPos.x);
    expect(controls.restButton!.y).toBe(initialControlRestPos.y);
    expect(controls.restButton!.enabled).toBe(false);
    expect(controls.restButton!.alpha).toBeCloseTo(0.4);

    // Clicking deactivated Rest does not invoke onRestClick
    let restClicked = 0;
    panel.onRestClick = () => {
      restClicked++;
    };
    expect(panel.triggerRest()).toBe(false);
    expect(restClicked).toBe(0);

    // Re-enable Rest and verify triggerRest invokes callback
    unit.stats.remaining_movement = unit.stats.num_moves;
    panel.update();
    expect(panel.triggerRest()).toBe(true);
    expect(restClicked).toBe(1);
  });
});




