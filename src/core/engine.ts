import { Application, Container, Assets } from 'pixi.js';
import { sound } from '@pixi/sound';
import pkg from '../../package.json';
import { EventBus } from './event-bus';
import { GameAssets, GameContext, GameTemplates } from './scene';
import { SceneManager } from './scene-manager';
import { BattleSettings } from '../battle/settings';
import { Ability } from '../battle/ability';
import { CreatureTemplate } from '../battle/creature';
import { JsonLoader } from '../shared/jsonloader';
import { Coords } from '../shared';
import { PixiSoundSystem } from './sound-system';
import { parseTraitsConfig } from '../battle/trait-system';
import { validateMoraleBreakpoints } from '../battle/combat-rules';

export const GAME_VERSION: string = pkg.version;

export class HexesEngine {
  public readonly version: string = pkg.version;
  public readonly nativeResolution = { width: 1920, height: 1080 };

  public readonly eventBus: EventBus = new EventBus();
  public readonly settings: BattleSettings = new BattleSettings();
  public readonly soundSystem: PixiSoundSystem;
  public readonly sceneManager: SceneManager;

  public readonly renderContainer: Container = new Container();

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
      nativeResolution: this.nativeResolution,
      switchToScene: (sceneName: string, params?: any) => this.sceneManager.switchTo(sceneName, params),
      version: this.version,
    };
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
    await this.loadAssets();
    await this.loadSounds();
    await Assets.load('./GustysSerpentsFontL.xml');

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
      this.templates.combatConfig = await JsonLoader.loadJson<any>('./combat_config.json');
      if (this.templates.combatConfig?.morale) {
        this.templates.combatConfig.morale.breakpoints = validateMoraleBreakpoints(
          this.templates.combatConfig.morale.breakpoints
        );
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

        // Re-apply saved user preferences from localStorage so template defaults do not overwrite them
        this.settings.load();
      }
    } catch {
      // Use defaults if not found
    }
  }

  public async loadAssets(): Promise<void> {
    this.assets.terrainTexture = await Assets.load('stars.jpg');
    this.assets.hexagonSheet = await Assets.load('hexagon_selections.json');
    this.assets.terrainSheet = await Assets.load('hex_terrain.json');
    this.assets.unitsSheet = await Assets.load('unitsspritesheet.json');
    this.assets.uiSheet = await Assets.load('ui/hexes-ui-sheet.json');
    this.assets.uiSheet2 = await Assets.load('ui/hexes_blue_ui_sheet.json');
    this.assets.bannersSheet = await Assets.load('bannersspritesheet.json');

    if (this.assets.uiSheet) {
      this.assets.softCursorTextures['default'] = this.assets.uiSheet.textures['cur_gs_arrow.png'];
      this.assets.softCursorTextures['attack_melee'] = this.assets.uiSheet.textures['cursor_sword.png'];
      this.assets.softCursorTextures['attack_melee_e'] = this.assets.uiSheet.textures['cursor_sword_e.png'];
      this.assets.softCursorTextures['attack_melee_w'] = this.assets.uiSheet.textures['cursor_sword_w.png'];
      this.assets.softCursorTextures['attack_melee_ne'] = this.assets.uiSheet.textures['cursor_sword_ne.png'];
      this.assets.softCursorTextures['attack_melee_nw'] = this.assets.uiSheet.textures['cursor_sword_nw.png'];
      this.assets.softCursorTextures['attack_melee_se'] = this.assets.uiSheet.textures['cursor_sword_se.png'];
      this.assets.softCursorTextures['attack_melee_sw'] = this.assets.uiSheet.textures['cursor_sword_sw.png'];
      this.assets.softCursorTextures['attack_ranged'] = this.assets.uiSheet.textures['cursor_arrow.png'];
    }

    try {
      await Assets.load([
        'traits/icon_shield_block.png',
        'traits/icon_spear_wall.png',
        'traits/icon_volley_fire.png',
        'traits/icon_fragile_line.png',
        'skills/icon_patch_up.png',
        'skills/icon_pickup_ammo.png',
        'skills/icon_throw_javelin.png',
        'skills/icon_quick_draw.png',
        'morale/morale_high.png',
        'morale/morale_steady.png',
        'morale/morale_wavering.png',
        'morale/morale_panicked.png',
        'morale/morale_routing.png',
      ]);
    } catch {
      // Ignore if offline/headless
    }
  }

  public async loadSounds(): Promise<void> {
    await sound.add('arrow', 'audio/arrow.ogg');
    await sound.add('die', 'audio/die.ogg');
    await sound.add('move', 'audio/move.ogg');
    await sound.add('sword', 'audio/sword.ogg');
    await sound.add('track_dark_whispers', 'audio/dark_whispers.ogg');
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
