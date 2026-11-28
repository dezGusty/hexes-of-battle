import { Application, Container } from 'pixi.js';
import pkg from '../../package.json';
import { EventBus } from './event-bus';
import { GameAssets, GameContext, GameTemplates } from './scene';
import { SceneManager } from './scene-manager';
import { AssetBundleManager } from './asset-manager';
import { DEFAULT_MUSIC_CONFIG, MusicConfig, MusicManager } from './music-manager';
import { ThreeRendererHost } from '../render3d/three-renderer-host';
import { BattleSettings } from '../battle/settings';
import { Ability } from '../battle/ability';
import { CreatureTemplate } from '../battle/creature';
import { JsonLoader } from '../shared/jsonloader';
import { Coords } from '../shared';
import { PixiSoundSystem, SoundType } from './sound-system';
import { parseTraitsConfig } from '../battle/trait-system';
import { validateMoraleBreakpoints } from '../battle/combat-rules';
import { configurePlayerColors } from '../render3d/units/unit-mesh-builder';
import { configurePlayerBanners } from '../render3d/decorations/retreat-flag-3d';
import { configureWindThresholds } from '../render3d/decorations/wind-system';
import type { GlobalConfig, RegionNamesConfig } from '../overview/overview-types';

export const GAME_VERSION: string = pkg.version;

export class HexesEngine {
  public readonly version: string = pkg.version;
  public readonly nativeResolution = { width: 1920, height: 1080 };

  public readonly eventBus: EventBus = new EventBus();
  public readonly settings: BattleSettings = new BattleSettings();
  public readonly soundSystem: PixiSoundSystem;
  public readonly musicManager: MusicManager = new MusicManager();
  public readonly sceneManager: SceneManager;
  public readonly assetManager: AssetBundleManager = new AssetBundleManager();

  public readonly renderContainer: Container = new Container();
  private threeRendererHost: ThreeRendererHost | null = null;

  private assets: GameAssets = {
    softCursorTextures: {},
  };

  private templates: GameTemplates = {
    abilityTypes: [],
    creatureTemplates: [],
  };

  private renderContainerOffset: Coords = { x: 0, y: 0 };

  constructor(public app: Application) {
    this.settings.load();
    this.soundSystem = new PixiSoundSystem(this.settings);

    this.sceneManager = new SceneManager(this.renderContainer, () => this.createGameContext());
  }

  public createGameContext(): GameContext {
    return {
      app: this.app,
      stage: this.renderContainer,
      eventBus: this.eventBus,
      assets: this.assets,
      templates: this.templates,
      settings: this.settings,
      soundSystem: this.soundSystem,
      musicManager: this.musicManager,
      nativeResolution: this.nativeResolution,
      switchToScene: (sceneName: string, params?: any) => this.sceneManager.switchTo(sceneName, params),
      getThreeRendererHost: (container?: HTMLElement) => this.getThreeRendererHost(container),
      loadBattleResources: () => this.loadBattleResources(),
      unloadBattleResources: () => this.unloadBattleResources(),
      version: this.version,
    };
  }

  public getThreeRendererHost(container?: HTMLElement): ThreeRendererHost {
    if (!this.threeRendererHost) {
      const target =
        container ??
        (typeof document !== 'undefined'
          ? (document.getElementById('game') ?? document.body ?? document.createElement('div'))
          : ({} as HTMLElement));
      this.threeRendererHost = new ThreeRendererHost(target);
    }
    return this.threeRendererHost;
  }

  public async initialize(): Promise<void> {
    const containingElement = document.getElementById('game');
    if (!containingElement) {
      console.error('Failed to find the game container element');
      return;
    }

    await this.app.init({
      backgroundAlpha: 0,
      width: this.nativeResolution.width,
      height: this.nativeResolution.height,
      resizeTo: containingElement,
    });

    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.top = '0';
    this.app.canvas.style.left = '0';
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.zIndex = '10';
    this.app.canvas.style.outline = 'none';

    this.setScalingForSize(this.app.screen.width, this.app.screen.height);
    containingElement.appendChild(this.app.canvas);

    containingElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    if (this.settings.hideHardwareCursor) {
      containingElement.classList.add('hide-hardware-cursor');
      containingElement.style.cursor = 'none';
    }

    this.app.stage.addChild(this.renderContainer);

    await this.loadTemplates();
    await this.assetManager.loadCoreAssets(this.assets);
    await this.assetManager.loadCoreSounds(this.soundSystem);

    this.app.ticker.maxFPS = 60;
    this.app.ticker.add((ticker) => {
      this.sceneManager.update(ticker.deltaMS);
    });

    this.app.renderer.on('resize', (width, height) => {
      this.setScalingForSize(width, height);
      this.sceneManager.resize(width, height);
    });
  }

  public async loadTemplates(): Promise<void> {
    this.templates.abilityTypes = await JsonLoader.loadJson<Ability[]>('./abilitytypes.json');
    this.templates.creatureTemplates = await JsonLoader.loadJson<CreatureTemplate[]>('./creaturetypes.json');
    try {
      const musicCfg = await JsonLoader.loadJson<MusicConfig>('./music.json');
      if (musicCfg) {
        this.templates.musicConfig = musicCfg;
        this.musicManager.setConfig(musicCfg);
      }
    } catch {
      this.musicManager.setConfig(DEFAULT_MUSIC_CONFIG);
    }
    try {
      this.templates.combatConfig = await JsonLoader.loadJson<any>('./combat_config.json');
      if (this.templates.combatConfig?.morale) {
        this.templates.combatConfig.morale.breakpoints = validateMoraleBreakpoints(
          this.templates.combatConfig.morale.breakpoints
        );
      }
      if (
        this.templates.combatConfig?.playerColors ||
        this.templates.combatConfig?.player_colors ||
        this.templates.combatConfig?.teamColors
      ) {
        configurePlayerColors(
          this.templates.combatConfig.playerColors ??
            this.templates.combatConfig.player_colors ??
            this.templates.combatConfig.teamColors
        );
      }
      if (
        this.templates.combatConfig?.player1Banner ||
        this.templates.combatConfig?.player2Banner ||
        this.templates.combatConfig?.playerBanners
      ) {
        configurePlayerBanners(this.templates.combatConfig);
      }
      if ((this.templates.combatConfig as any)?.soundGroups) {
        this.soundSystem.configureSoundGroups((this.templates.combatConfig as any).soundGroups);
      }
      if ((this.templates.combatConfig as any)?.wind) {
        configureWindThresholds((this.templates.combatConfig as any).wind);
      }
    } catch {
      // Use defaults if not found
    }
    try {
      const traitsData = await JsonLoader.loadJson<any>('./traits.json');
      if (traitsData) {
        this.templates.traitsConfig = parseTraitsConfig(traitsData);
        if (this.templates.combatConfig) {
          this.templates.combatConfig.traits = this.templates.traitsConfig;
        }
      }
    } catch {
      // Use defaults if not found
    }
    try {
      this.templates.scenarios = await JsonLoader.loadJson<any[]>('./scenarios.json');
    } catch {
      // Use empty if not found
    }
    try {
      this.templates.defaultBattle = await JsonLoader.loadJson<any>('./default-battle.json');
    } catch {
      // Fallback handled by scene if not found
    }
    try {
      this.templates.globalConfig = await JsonLoader.loadJson<GlobalConfig>('./global_config.json');
    } catch {
      // Fallback handled by overview map generator if not found
    }
    try {
      this.templates.regionNamesConfig = await JsonLoader.loadJson<RegionNamesConfig>('./regions.json');
    } catch {
      // Fallback handled by overview map generator if not found
    }
    try {
      this.templates.hudConfig = await JsonLoader.loadJson<any>('./hud.json');
      if (this.templates.hudConfig) {
        if (this.templates.hudConfig.grid?.borderThickness !== undefined) {
          this.settings.hex.gridBorderThickness = this.templates.hudConfig.grid.borderThickness;
        } else if (this.templates.hudConfig.gridBorderThickness !== undefined) {
          this.settings.hex.gridBorderThickness = this.templates.hudConfig.gridBorderThickness;
        }
        if (this.templates.hudConfig.grid?.borderColor !== undefined) {
          this.settings.hex.gridBorderColor = this.templates.hudConfig.grid.borderColor;
        } else if (this.templates.hudConfig.gridBorderColor !== undefined) {
          this.settings.hex.gridBorderColor = this.templates.hudConfig.gridBorderColor;
        }
        if (this.templates.hudConfig.grid?.showGrid !== undefined) {
          this.settings.hex.showGrid = this.templates.hudConfig.grid.showGrid;
        } else if (this.templates.hudConfig.showGrid !== undefined) {
          this.settings.hex.showGrid = this.templates.hudConfig.showGrid;
        }

        const coordsCfg = this.templates.hudConfig.coordinates;
        if (coordsCfg) {
          if (coordsCfg.showCoords !== undefined) this.settings.debug.showCoords = coordsCfg.showCoords;
          if (coordsCfg.fontSize !== undefined) this.settings.debug.coordsFontSize = coordsCfg.fontSize;
          if (coordsCfg.fontFamily !== undefined) this.settings.debug.coordsFontFamily = coordsCfg.fontFamily;
          if (coordsCfg.color !== undefined) this.settings.debug.coordsColor = coordsCfg.color;
          if (coordsCfg.strokeColor !== undefined) this.settings.debug.coordsStrokeColor = coordsCfg.strokeColor;
          if (coordsCfg.strokeWidth !== undefined) this.settings.debug.coordsStrokeWidth = coordsCfg.strokeWidth;
        }

        const fpsCfg = this.templates.hudConfig.fps;
        if (fpsCfg) {
          if (fpsCfg.showFps !== undefined) this.settings.debug.showFps = fpsCfg.showFps;
          if (fpsCfg.fontSize !== undefined) this.settings.debug.fpsFontSize = fpsCfg.fontSize;
          if (fpsCfg.fontFamily !== undefined) this.settings.debug.fpsFontFamily = fpsCfg.fontFamily;
          if (fpsCfg.color !== undefined) this.settings.debug.fpsColor = fpsCfg.color;
          if (fpsCfg.alpha !== undefined) this.settings.debug.fpsAlpha = fpsCfg.alpha;
          if (fpsCfg.x !== undefined || fpsCfg.y !== undefined) {
            this.settings.debug.fpsPosition = {
              x: fpsCfg.x ?? this.settings.debug.fpsPosition.x,
              y: fpsCfg.y ?? this.settings.debug.fpsPosition.y,
            };
          }
        } else if (this.templates.hudConfig.showFps !== undefined) {
          this.settings.debug.showFps = this.templates.hudConfig.showFps;
        }

        const hotkeysCfg = this.templates.hudConfig.hotkeys ?? this.templates.hudConfig.keybindings;
        if (hotkeysCfg) {
          if (hotkeysCfg.printPathPreview !== undefined) this.settings.hotkeys.printPathPreview = hotkeysCfg.printPathPreview;
          if (hotkeysCfg.rest !== undefined) this.settings.hotkeys.rest = hotkeysCfg.rest;
          if (hotkeysCfg.nextTurn !== undefined) this.settings.hotkeys.nextTurn = hotkeysCfg.nextTurn;
          if (hotkeysCfg.nextUnit !== undefined) this.settings.hotkeys.nextUnit = hotkeysCfg.nextUnit;
          if (hotkeysCfg.resetCamera !== undefined) this.settings.hotkeys.resetCamera = hotkeysCfg.resetCamera;
          if (hotkeysCfg.toggleStats !== undefined) this.settings.hotkeys.toggleStats = hotkeysCfg.toggleStats;
          if (hotkeysCfg.skill1 !== undefined) this.settings.hotkeys.skill1 = hotkeysCfg.skill1;
          if (hotkeysCfg.skill2 !== undefined) this.settings.hotkeys.skill2 = hotkeysCfg.skill2;
          if (hotkeysCfg.skill3 !== undefined) this.settings.hotkeys.skill3 = hotkeysCfg.skill3;
          if (hotkeysCfg.skill4 !== undefined) this.settings.hotkeys.skill4 = hotkeysCfg.skill4;
          if (hotkeysCfg.skill5 !== undefined) this.settings.hotkeys.skill5 = hotkeysCfg.skill5;
        }

        if (this.templates.hudConfig.sounds !== undefined || this.templates.hudConfig.uiSounds !== undefined) {
          this.soundSystem.configureUISounds(
            this.templates.hudConfig.sounds ?? this.templates.hudConfig.uiSounds
          );
        }
        if (this.templates.hudConfig.soundGroups !== undefined) {
          this.soundSystem.configureSoundGroups(this.templates.hudConfig.soundGroups);
        }
        const hudArrowVolley =
          this.templates.hudConfig.arrowVolley ?? this.templates.hudConfig.arrow_volley;
        if (hudArrowVolley !== undefined) {
          this.soundSystem.configureArrowVolleySounds(hudArrowVolley);
        }

        // Re-apply saved user preferences from localStorage so template defaults do not overwrite them
        this.settings.load();
      }
    } catch {
      // Use defaults if not found
    }
    try {
      this.templates.soundsConfig = await JsonLoader.loadJson<any>('./sounds.json');
      if (this.templates.soundsConfig) {
        const groups = this.templates.soundsConfig.soundGroups ?? this.templates.soundsConfig.groups;
        if (groups !== undefined) {
          this.soundSystem.configureSoundGroups(groups);
        }
        if (this.templates.soundsConfig.events) {
          for (const [eventKey, targetName] of Object.entries(this.templates.soundsConfig.events)) {
            if (typeof targetName === 'string') {
              this.soundSystem.registerSound(eventKey as SoundType, targetName);
            }
          }
        }
        const uiCfg = this.templates.soundsConfig.ui ?? this.templates.soundsConfig.sounds;
        if (uiCfg !== undefined) {
          this.soundSystem.configureUISounds(uiCfg);
        }
        const arrowVolleyCfg =
          this.templates.soundsConfig.arrowVolley ?? this.templates.soundsConfig.arrow_volley;
        if (arrowVolleyCfg !== undefined) {
          this.soundSystem.configureArrowVolleySounds(arrowVolleyCfg);
        }
        const unitMoveCfg =
          this.templates.soundsConfig.unitMovementSounds ??
          this.templates.soundsConfig.unit_movement_sounds;
        if (unitMoveCfg !== undefined) {
          this.soundSystem.configureUnitMovementSounds(unitMoveCfg);
        }
        const moveStepCfg =
          this.templates.soundsConfig.movementSteps ?? this.templates.soundsConfig.movement_steps;
        if (moveStepCfg !== undefined) {
          this.soundSystem.configureMovementStepSounds(moveStepCfg);
        }
      }
    } catch {
      // Use defaults if not found
    }
  }

  public async loadBattleResources(): Promise<void> {
    await this.assetManager.loadBattleAssets(this.assets);
    await this.assetManager.loadBattleSounds(this.soundSystem);
  }

  public async unloadBattleResources(): Promise<void> {
    this.assetManager.unloadBattleSounds();
    await this.assetManager.unloadBattleAssets(this.assets);
  }

  public async loadAssets(): Promise<void> {
    await this.assetManager.loadCoreAssets(this.assets);
    await this.assetManager.loadBattleAssets(this.assets);
  }

  public async loadSounds(): Promise<void> {
    await this.assetManager.loadCoreSounds(this.soundSystem);
    await this.assetManager.loadBattleSounds(this.soundSystem);
  }

  public destroy(): void {
    this.sceneManager.destroy();
    this.threeRendererHost?.dispose();
    this.threeRendererHost = null;
    this.app?.destroy(true);
  }

  public setScalingForSize(width: number, height: number): void {
    const originalWindowSize = this.nativeResolution;
    const scaling = { x: width / originalWindowSize.width, y: height / originalWindowSize.height };
    const minScale = Math.min(scaling.x, scaling.y);

    this.renderContainer.scale.set(minScale, minScale);

    this.renderContainerOffset = {
      x: 0,
      y: 0,
    };
    this.renderContainer.position.set(this.renderContainerOffset.x, this.renderContainerOffset.y);
  }
}
