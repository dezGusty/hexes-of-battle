import { Application, Container, Graphics, Assets } from 'pixi.js';
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

export class HexesEngine {
  public readonly version: string = pkg.version;
  public readonly nativeResolution = { width: 1920, height: 1080 };

  public readonly eventBus: EventBus = new EventBus();
  public readonly settings: BattleSettings = new BattleSettings();
  public readonly sceneManager: SceneManager;

  public readonly renderContainer: Container = new Container();
  public readonly outerBoundsContainer: Container = new Container();
  private outerRenderBoundsRect1: Graphics = new Graphics();
  private outerRenderBoundsRect2: Graphics = new Graphics();

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
      nativeResolution: this.nativeResolution,
      switchToScene: (sceneName: string, params?: any) => this.sceneManager.switchTo(sceneName, params),
    };
  }

  public async initialize(): Promise<void> {
    const containingElement = document.getElementById('game');
    if (!containingElement) {
      console.error('Failed to find the game container element');
      return;
    }

    await this.app.init({
      background: '#102229',
      width: this.nativeResolution.width,
      height: this.nativeResolution.height,
      resizeTo: containingElement,
    });

    this.setScalingForSize(this.app.screen.width, this.app.screen.height);
    containingElement.appendChild(this.app.canvas);

    containingElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    this.app.stage.addChild(this.renderContainer);
    this.app.stage.addChild(this.outerBoundsContainer);

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
    } catch {
      // Use defaults if not found
    }
    try {
      this.templates.scenarios = await JsonLoader.loadJson<any[]>('./scenarios.json');
    } catch {
      // Use empty if not found
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

    const delta = {
      x: Math.abs(width - originalWindowSize.width * minScale) / 2,
      y: Math.abs(height - originalWindowSize.height * minScale) / 2,
    };
    const verticalShift = -30;

    this.renderContainerOffset = {
      x: delta.x,
      y: Math.max(delta.y + verticalShift, 0),
    };
    this.renderContainer.position.set(this.renderContainerOffset.x, this.renderContainerOffset.y);

    const blackColor = 0x000000;
    if (this.renderContainerOffset.x > 0) {
      this.outerRenderBoundsRect1.clear();
      this.outerRenderBoundsRect1.rect(0, 0, delta.x, originalWindowSize.height);
      this.outerRenderBoundsRect1.fill(blackColor);
      this.outerBoundsContainer.removeChild(this.outerRenderBoundsRect1);
      this.outerBoundsContainer.addChild(this.outerRenderBoundsRect1);

      this.outerRenderBoundsRect2.clear();
      this.outerRenderBoundsRect2.rect(width - delta.x, 0, delta.x, originalWindowSize.height);
      this.outerRenderBoundsRect2.fill(blackColor);
      this.outerBoundsContainer.removeChild(this.outerRenderBoundsRect2);
      this.outerBoundsContainer.addChild(this.outerRenderBoundsRect2);
    } else if (this.renderContainerOffset.y > 0) {
      this.outerRenderBoundsRect1.clear();
      this.outerRenderBoundsRect1.rect(0, 0, originalWindowSize.width, delta.y + verticalShift);
      this.outerRenderBoundsRect1.fill(blackColor);
      this.outerBoundsContainer.removeChild(this.outerRenderBoundsRect1);
      this.outerBoundsContainer.addChild(this.outerRenderBoundsRect1);

      this.outerRenderBoundsRect2.clear();
      this.outerRenderBoundsRect2.rect(0, height - delta.y + verticalShift, originalWindowSize.width, delta.y - verticalShift);
      this.outerRenderBoundsRect2.fill(blackColor);
      this.outerBoundsContainer.removeChild(this.outerRenderBoundsRect2);
      this.outerBoundsContainer.addChild(this.outerRenderBoundsRect2);
    }
  }
}
