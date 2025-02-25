import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, Texture, Container, TextStyleOptions, AnimatedSprite } from 'pixi.js';
import pkg from './../package.json';
import { HexDirection, HexEdge, HexFlankStatus, HexMap } from './shared/hex-map';
import { CommonControls } from './ui/common-controls';
import { Coords } from './shared';
import { AnimationType, Battle, MapRenderUpdate } from './battle';
import { Creature, CreatureTemplate, CreatureType } from './battle/creature';
import { ProgressBar } from '@pixi/ui';
import { UnitStatsPanel } from './ui/unit-stats-panel';
import { DamageValueCollection } from './ui/damage-value-display';
import { PerfDisplayPanel } from './ui/perf-display-panel';
import { JsonLoader } from './shared/jsonloader';
import { TurnChangeCollection } from './ui/turn-change-display';
import { TopSidePanel } from './ui/top-side-panel';
import { AdvancedBloomFilter, OutlineFilter } from 'pixi-filters';
import { sound } from '@pixi/sound';
import { DumbAI } from './battle/dumb-ai';
import { BattleSettings } from './battle/settings';
import { Ability } from './battle/ability';
import { CreatureRepository } from './battle/creature-repository';
import { BattleActionType } from './battle/battle-action';
import { BattleMenuPanel } from './ui/battle-menu';

export enum GameState {
  InMenu,
  ViewHighscores,
  InGame,
  PostGameGameOver,
  PostGameEnterHighscore
}

export class HexesApp {

  private currentGameState: GameState = GameState.InGame;
  private version: string = pkg.version;

  private hexMap: HexMap = new HexMap(13, 9);
  private battle = new Battle(this.hexMap);
  private dumbAI: DumbAI = new DumbAI(this.battle);

  // private NATIVE_RESOLUTION = { width: 1600, height: 900 };
  private NATIVE_RESOLUTION = { width: 1920, height: 1080 };

  private ZOOM_LEVEL_MIN = 0.75;
  private ZOOM_LEVEL_MAX = 2.0;
  private ZOOM_STEP = 0.05;
  private navZoomLevel: number = 1.4;
  private navMapOffset: Coords = { x: 0, y: -100 };
  private MAP_OFFSET_MIN: Coords = { x: -400, y: -400 };
  private MAP_OFFSET_MAX: Coords = { x: 1200, y: 800 };

  private mouseDragCoords: Coords = { x: 0, y: 0 };
  private mouseRightClickCoords: Coords = { x: 0, y: 0 };

  private settings: BattleSettings = new BattleSettings();

  private terrainSheet?: Spritesheet = undefined;
  private terrainTexture?: Texture = undefined;
  private hexagonSheet?: Spritesheet = undefined;
  private uiSheet?: Spritesheet = undefined;
  private uiSheet_2?: Spritesheet = undefined;
  private unitsSheet?: Spritesheet = undefined;
  private bannersSheet?: Spritesheet = undefined;

  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private softCursorSprite: Sprite = new Sprite();
  private uiAnimationSprites: Sprite[] = [];
  private terrainSprites: Sprite[] = [];
  private softCursorTextures: Record<string, Texture> = {};
  private displayOnScreenTouchControls: boolean = false;

  private commonControls: CommonControls = new CommonControls(
    { zoomMin: this.ZOOM_LEVEL_MIN * 100, zoomMax: this.ZOOM_LEVEL_MAX * 100, zoomStep: this.ZOOM_STEP * 100 }
  );

  private unitStats?: UnitStatsPanel = undefined;
  private topSidePanel?: TopSidePanel = undefined;
  private softCursorName: string = 'default';

  private fpsText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private coordsTexts: Map<string, BitmapText> = new Map();
  private unitSprites: Sprite[] = [];

  private hexHoverSprite?: Sprite;
  private hexSelectedSprite?: Sprite;
  private hexReachableSprites: Sprite[] = [];
  private hexEnemyReachableSprites: Sprite[] = [];
  private hexPathSprites: Sprite[] = [];
  private hexUnitBars: ProgressBar[] = [];

  private showHealthbars: boolean = true;
  private showFacingDirections: boolean = true;
  private damageValueDisplay: DamageValueCollection = new DamageValueCollection();
  private turnChangeDisplay: TurnChangeCollection = new TurnChangeCollection();
  private perfDisplayPanel: PerfDisplayPanel = new PerfDisplayPanel();


  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private unitRenderSubgroups: Container[] = [];
  private unitRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiPlusRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiCursorRenderGroup: Container = new Container({ isRenderGroup: true });
  private renderContainer: Container = new Container();

  private hexZoneContainer: Container = new Container({ isRenderGroup: true });
  private hexTerrainContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsGridContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsContainer: Container = new Container({ isRenderGroup: true });
  private hexUiRenderGroup: Container = new Container({ isRenderGroup: true });

  private renderContainerOffset: Coords = { x: 0, y: 0 };

  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };

  private abilityTypes: Ability[] = [];
  private creatureTemplates: CreatureTemplate[] = [];
  private creatureRepository: CreatureRepository = new CreatureRepository();

  private tempMessage = "";
  private controlPressed: boolean = false;

  private battleMenuPanel?: BattleMenuPanel = undefined;

  constructor(public app: Application) {
    // this.currentGameState = GameState.InMenu;
    this.settings.load();
  }

  public async pixiAppInit() {
    const containingElement: HTMLElement | null = document.getElementById('game');
    if (!containingElement) {
      console.error('Failed to find the game container element');
      return;
    }

    // Wait for the Renderer to be available
    await this.app.init({
      background: '#102229',
      width: this.NATIVE_RESOLUTION.width,
      height: this.NATIVE_RESOLUTION.height,
      resizeTo: containingElement
    });

    // this.tempMessage = 'App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height;
    this.setScalingForSize(this.app.screen.width, this.app.screen.height);
    console.log('App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height);
    console.log('Scaling factor: ' + this.renderContainer.scale.x.toFixed(2) + 'x' + this.renderContainer.scale.y.toFixed(2));

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    containingElement.appendChild(this.app.canvas);

    // As a game, we do not need the default context menu in a browser, so we disable it
    containingElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

  }

  /**
   * Initializes the application. 
   * This method should be called ONCE after the application is created.
   */
  public async initialize() {
    await this.pixiAppInit();

    // Add the stage to the canvas
    this.app.stage.addChild(this.renderContainer);

    this.renderContainer.addChild(this.terrainRenderGroup);
    this.renderContainer.addChild(this.hexZoneContainer);
    this.renderContainer.addChild(this.uiRenderGroup);
    this.renderContainer.addChild(this.uiPlusRenderGroup);
    this.renderContainer.addChild(this.uiCursorRenderGroup);

    this.hexZoneContainer.addChild(this.hexTerrainContainer);
    this.hexZoneContainer.addChild(this.hexCellsGridContainer);
    this.hexZoneContainer.addChild(this.hexCellsContainer);
    this.hexZoneContainer.addChild(this.unitRenderGroup);
    this.hexZoneContainer.addChild(this.hexUiRenderGroup);

    await this.loadTemplates();
    await this.loadAssets();
    await this.loadSounds();

    this.initializeCommonControls();
    this.initializeTopPanel();

    this.initializeMapAndGame();
    await this.initializeTexts();

    this.setupMainLoop();
    this.setupInputHandlers();

    this.setNavMapOffset(this.navMapOffset);
    this.startBattle();

    // set-up a resize event listener
    this.app.renderer.on('resize', (width, height) => {
      this.setScalingForSize(width, height);
    });

  }


  startBattle() {
    this.hookNextTurn(0, 0);

    this.battle.start();

    // this.battle.selectNextUnit();
    if (this.settings.sound.musicOn) {
      sound.play('track_dark_whispers', { loop: true, volume: this.settings.sound.musicVolume });
    }
  }

  resetBattleData() {
    // // clear the battle data (graphics, map, etc)
    // this.terrainRenderGroup.destroy({ children: true });
    // this.hexTerrainContainer.destroy({ children: true });
    // this.terrainSprites.forEach((sprite) => { sprite.destroy(); });
    // this.terrainSprites = [];
    // this.hexCellsGridContainer.destroy({ children: true });
    // // this.hexUiRenderGroup.destroy({ children: true });
    // this.unitRenderSubgroups.forEach((subgroup) => { subgroup.destroy({ children: true }); });
    // this.unitRenderSubgroups = [];
    // this.unitRenderGroup.destroy({ children: true });

    // this.terrainRenderGroup = new Container({ isRenderGroup: true });
    // this.hexTerrainContainer = new Container({ isRenderGroup: true });
    // this.hexCellsGridContainer = new Container({ isRenderGroup: true });
    // this.unitRenderGroup = new Container({ isRenderGroup: true });

    this.coordsTexts.forEach((text) => { text.destroy(); });
    this.coordsTexts.clear();

    this.hexUiRenderGroup.removeChildren();
    this.hexCellsGridContainer.removeChildren();
    this.hexTerrainContainer.removeChildren();

    // Note: if the render groups are destroyed, they also need to be re-added to the parent container
    // this.hexUiRenderGroup.destroy({ children: true });
    // this.hexUiRenderGroup = new Container({ isRenderGroup: true });

    // this.hexCellsGridContainer.destroy({ children: true });
    // this.hexCellsGridContainer = new Container({ isRenderGroup: true });

    // this.hexTerrainContainer.destroy({ children: true });
    // this.hexTerrainContainer = new Container({ isRenderGroup: true });

    this.terrainSprites.forEach((sprite) => { sprite.destroy(); });
    this.terrainSprites = [];

    this.battle.creatures = [];

    // clear all subgroups
    // this.unitRenderSubgroups.forEach((subgroup) => { subgroup.destroy({ children: true }); });
    // this.unitRenderGroup.destroy({ children: true });
    this.unitRenderGroup.removeChildren();


    this.terrainRenderGroup.removeChildren();
    this.terrainSprites.forEach((sprite) => { sprite.destroy(); });
    this.terrainSprites = [];

    // this.internal_createBackgroundSprite();
    // this.internal_createHexTerrainBordersAndCoords();
    this.initializeMapAndGame();
  }


  private setScalingForSize(width: number, height: number) {
    if (this.instructionsText) {
      this.instructionsText.text = this.tempMessage + "\nResized to: " + width + 'x' + height;
    }
    const originalWindowSize = this.NATIVE_RESOLUTION;
    console.log('Resized to: ' + width + ' x ' + height + '. With original size of: ' + originalWindowSize.width + ' x ' + originalWindowSize.height);
    // keep the aspect ratio
    const scaling = { x: width / originalWindowSize.width, y: height / originalWindowSize.height };
    const minScale = Math.min(scaling.x, scaling.y);

    this.renderContainer.scale.set(minScale, minScale);

    this.hexZoneContainer.scale.set(this.navZoomLevel, this.navZoomLevel);

    // Set-up an offset for the render container.
    // It should be in the middle horizontally and about 30 pixels up from the middle vertically
    this.renderContainerOffset = {
      x: (width - originalWindowSize.width * minScale) / 2,
      y: Math.max((height - originalWindowSize.height * minScale) / 2 - 30, 0)
    };

    this.renderContainer.position.set(this.renderContainerOffset.x, this.renderContainerOffset.y);
  }


  public async loadAssets() {

    // this.terrainTexture = await Assets.load('terrain1background.png');
    this.terrainTexture = await Assets.load('stars.jpg');

    this.hexagonSheet = await Assets.load('hexagon_selections.json');
    if (!this.hexagonSheet) {
      console.error('Failed to load the hexes spritesheet');
    }

    this.terrainSheet = await Assets.load('hex_terrain.json');
    if (!this.terrainSheet) {
      console.error('Failed to load the terrain spritesheet');
    }

    this.unitsSheet = await Assets.load('unitsspritesheet.json');
    if (!this.unitsSheet) {
      console.error('Failed to load the units spritesheet');
    }

    this.uiSheet = await Assets.load('ui/hexes-ui-sheet.json');
    if (!this.uiSheet) {
      console.error('Failed to load the UI spritesheet');
    }
    this.uiSheet_2 = await Assets.load('ui/hexes_blue_ui_sheet.json');
    if (!this.uiSheet_2) {
      console.error('Failed to load the 2nd UI spritesheet');
    }

    this.bannersSheet = await Assets.load('bannersspritesheet.json');
    if (!this.bannersSheet) {
      console.error('Failed to load the banners spritesheet');
    }

    this.turnChangeDisplay.setUISheet(this.uiSheet);


    this.softCursorTextures['default'] = this.uiSheet.textures['cur_gs_arrow.png'];
    this.softCursorTextures['attack_melee'] = this.uiSheet.textures['cursor_sword.png'];
    this.softCursorTextures['attack_melee_e'] = this.uiSheet.textures['cursor_sword_e.png'];
    this.softCursorTextures['attack_melee_w'] = this.uiSheet.textures['cursor_sword_w.png'];
    this.softCursorTextures['attack_melee_ne'] = this.uiSheet.textures['cursor_sword_ne.png'];
    this.softCursorTextures['attack_melee_nw'] = this.uiSheet.textures['cursor_sword_nw.png'];
    this.softCursorTextures['attack_melee_se'] = this.uiSheet.textures['cursor_sword_se.png'];
    this.softCursorTextures['attack_melee_sw'] = this.uiSheet.textures['cursor_sword_sw.png'];
    this.softCursorTextures['attack_ranged'] = this.uiSheet.textures['cursor_arrow.png'];

    this.softCursorSprite = new Sprite(this.softCursorTextures['default']);
    // this.renderContainer.cursor = 'none';
    this.uiCursorRenderGroup.addChild(this.softCursorSprite);

  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new BitmapText({ text: 'FPS: 0', style: this.DEFAULT_FONT_STYLE });
    this.fpsText.x = 136;
    this.fpsText.y = 2;
    this.fpsText.alpha = 0.7;
    this.fpsText.style.fontSize = 14;
    this.uiRenderGroup.addChild(this.fpsText);

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 } });
    this.tempMessage = `HoB v.${this.version}`
      + "\n" + this.tempMessage;
    this.instructionsText = new Text({
      text: this.tempMessage,
      style,
    });
    this.instructionsText.position = { x: 1480, y: 5 };
    this.uiRenderGroup.addChild(this.instructionsText);

    this.messagesText = new Text({
      text: '',
      style,
    });
    this.messagesText.x = 10;
    this.messagesText.y = 60;
    this.uiRenderGroup.addChild(this.messagesText);
  }

  public async loadSounds() {
    // Add sounds
    console.log('Loading sounds...');

    await sound.add('arrow', 'audio/arrow.ogg');
    await sound.add('die', 'audio/die.ogg');
    await sound.add('move', 'audio/move.ogg');
    await sound.add('sword', 'audio/sword.ogg');

    await sound.add('track_dark_whispers', 'audio/dark_whispers.ogg');

    console.log('Loaded sounds...');

  }

  public async loadTemplates() {
    // Load the ability types
    this.abilityTypes = await JsonLoader.loadJson<Ability[]>('./abilitytypes.json');
    this.creatureRepository.setAbilities(this.abilityTypes);

    // Load the "creaturetypes.json" file and read jsonData
    this.creatureTemplates = await JsonLoader.loadJson<CreatureTemplate[]>('./creaturetypes.json');
    this.creatureRepository.setCreatureTemplates(this.creatureTemplates);
  }

  /**
   * Modify the zoom level of the map by a given delta.
   * @param delta A positive or negative value to modify the zoom level by
   * @param zoomOffset Where to zoom in/out from. Default is the center of the screen.
   */
  public modifyZoomLevel(delta: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    this.setZoomLevel(this.navZoomLevel + delta, zoomOffset);
  }

  /**
   * Modify the zoom level of the map by a given delta.
   * @param delta A positive or negative value to modify the zoom level by
   * @param zoomOffset Where to zoom in/out from. Default is the center of the screen.
   */
  public setZoomLevel(newZoomLevel: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    let oldHexContainerSize = { x: this.hexZoneContainer.width, y: this.hexZoneContainer.height };
    this.navZoomLevel = newZoomLevel;
    // Clamp the zoom level
    this.navZoomLevel = Math.max(this.ZOOM_LEVEL_MIN, this.navZoomLevel);
    this.navZoomLevel = Math.min(this.ZOOM_LEVEL_MAX, this.navZoomLevel);

    this.hexZoneContainer.scale.set(this.navZoomLevel, this.navZoomLevel);

    this.setNavMapOffset({
      x: this.navMapOffset.x + (oldHexContainerSize.x - this.hexZoneContainer.width) * zoomOffset.x,
      y: this.navMapOffset.y + (oldHexContainerSize.y - this.hexZoneContainer.height) * zoomOffset.y
    });
  }

  public initializeCommonControls(): void {
    this.commonControls.initializeButtons();

    if (this.uiSheet) {
      this.battleMenuPanel = new BattleMenuPanel(this.uiPlusRenderGroup, this.uiSheet);
      this.battleMenuPanel.hide();
    }


    this.commonControls.getControls().forEach((control) => {
      this.uiRenderGroup.addChild(control);
    });

    this.commonControls.menuButton?.onPress.connect(() => {
      if (this.battleMenuPanel) {
        this.battleMenuPanel.toggleVisibility();
      }
    });

    this.commonControls.zoomInButton?.onPress.connect(() => {
      this.modifyZoomLevel(this.ZOOM_STEP);
      if (this.commonControls.zoomSlider) {
        this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
      }
    });

    this.commonControls.zoomOutButton?.onPress.connect(() => {
      this.modifyZoomLevel(-1 * this.ZOOM_STEP);
      if (this.commonControls.zoomSlider) {
        this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
      }
    });

    this.commonControls.zoomSlider?.onUpdate.connect((value) => {
      console.log('Zoom slider value: ' + value);
      this.setZoomLevel(value / 100);
    });

    this.battleMenuPanel && this.battleMenuPanel.toggleCoordsButton?.onPress.connect(() => {
      console.log("*** toggle coords button pressed");
      this.settings.debug.showCoords = !this.settings.debug.showCoords;
      this.settings.save();

      this.updateCoordsTexts();

      this.coordsTexts.forEach((text) => {
        text.visible = this.settings.debug.showCoords;
      });
    });


    this.battleMenuPanel && this.battleMenuPanel.toggleGridButton?.onPress.connect(() => {
      this.settings.hex.showGrid = !this.settings.hex.showGrid;
      this.settings.save();

      this.hexCellsGridContainer.visible = this.settings.hex.showGrid;
    });

    this.commonControls.nextTurnButton?.onPress.connect(() => {
      this.battle.nextTurn();
    });

    this.commonControls.nextUnitButton?.onPress.connect(() => {
      this.battle.selectNextUnitAndGetIndex();
    });

    this.battleMenuPanel && this.battleMenuPanel.showHealthbarsButton?.onPress.connect(() => {
      this.showHealthbars = !this.showHealthbars;
      this.battle.reselectCurrentUnit();
    });

    this.commonControls.toggleStatsButton?.onPress.connect(() => {
      if (!this.uiSheet) {
        return;
      }

      if (!this.unitStats) {
        this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.uiSheet);
        this.unitStats.hide();
      }

      this.unitStats.toggleVisibility();

      if (this.unitStats) {
        if (this.battle.activeCreatureIndex >= 0) {
          this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]);
          this.unitStats.update();
        }
      }
    });

    this.commonControls.togglePerfStatsButton?.onPress.connect(() => {
      if (!this.uiSheet) {
        return;
      }

      this.perfDisplayPanel.toggleVisibility(this.uiRenderGroup, this.uiSheet);
    });

    this.battleMenuPanel && this.battleMenuPanel.toggleMusicButton?.onPress.connect(() => {
      this.settings.sound.musicOn = !this.settings.sound.musicOn;
      this.settings.save();
      if (this.settings.sound.musicOn) {
        sound.play('track_dark_whispers', { loop: true, volume: this.settings.sound.musicVolume });
      } else {
        sound.stop('track_dark_whispers');
      }
    });

    this.commonControls.resetButton?.onPress.connect(() => {
      this.resetBattleData();
      this.startBattle();
    });

    this.commonControls.activeAbility1Button?.onPress.connect(() => {
      this.battle.selectActiveAbilityForCurrentUnit(0);
    });

    if (this.uiSheet) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.uiSheet);
    }
  }

  updateCoordsTexts() {
    this.coordsTexts.forEach((text, key) => {
      let coords = key.split(',');
      if (coords.length !== 2) {
        return;
      }

      const i = parseInt(coords[0]);
      const j = parseInt(coords[1]);
      // const pathCost = this.battle.pathfinding_tiles[i][j] ?? 'X';
      // const pathCost = this.battle.ability_reach_tiles[i][j] ?? 'X';
      const pathCost = this.battle.rangereach_tiles[i][j] ?? 'X';

      text.text = `${i},${j}\n${pathCost}`;
    });
  }

  initializeTopPanel() {
    if (!this.uiSheet) {
      return;
    }

    this.topSidePanel = new TopSidePanel(this.uiPlusRenderGroup, this.uiSheet);
    this.topSidePanel.setLeftBannerTexture(this.bannersSheet?.textures[
      this.getBannerTextureNameForArmyIndex(0)]);
    this.topSidePanel.setRightBannerTexture(this.bannersSheet?.textures[
      this.getBannerTextureNameForArmyIndex(1)]);

    this.topSidePanel.setLeftArmyName("The Count of Ekkina's 1st Army");
    this.topSidePanel.setRightArmyName("Knights of The Grand Duke");
  }

  getBannerTextureNameForArmyIndex(armyIndex: number): string {
    return armyIndex === 0 ? 'banner1.png' : 'banner2.png';
  }

  private internal_createBackgroundSprite() {
    let terrainSprite = new Sprite(this.terrainTexture);
    terrainSprite.scale.set(2, 2);
    terrainSprite.x = 0;
    terrainSprite.y = 0;
    this.terrainRenderGroup.addChild(terrainSprite);
    this.terrainSprites.push(terrainSprite);
  }

  private internal_createHexTerrainBordersAndCoords() {
    for (let j = 0; j < this.hexMap.height; j++) {
      for (let i = 0; i < this.hexMap.width; i++) {
        let hexCoord: Coords = this.hexMap.hexToPixel(i, j);
        hexCoord = {
          x: hexCoord.x - this.hexMap.cellSize().x / 2,
          y: hexCoord.y - this.hexMap.cellSize().y / 2
        };

        const terrain_type = this.battle.getTerrainAt({ x: i, y: j }) + 1;
        let terrainSprite = new Sprite(this.terrainSheet?.textures[`terrain_${terrain_type}.png`]);
        terrainSprite.position.copyFrom(hexCoord);
        this.hexTerrainContainer.addChild(terrainSprite);
        this.terrainSprites.push(terrainSprite);

        const gameSprite = new Sprite(this.hexagonSheet?.textures['hex_empty.png']);
        gameSprite.position.copyFrom(hexCoord);
        this.hexCellsGridContainer.addChild(gameSprite);
        // this.terrainSprites.push(gameSprite);

        // REUSE the hexCoord variable to position the text, shift it a bit towards the center.
        hexCoord.x += this.hexMap.cellSize().x / 3;
        hexCoord.y += this.hexMap.cellSize().y / 3;

        let coordsText = new BitmapText({ text: `${i},${j}`, style: this.DEFAULT_FONT_STYLE, });
        coordsText.position.copyFrom(hexCoord);
        coordsText.visible = this.settings.debug.showCoords;

        this.coordsTexts.set(`${i},${j}`, coordsText);
        this.hexUiRenderGroup.addChild(coordsText);
      }
    }
  }

  public initializeMapAndGame(): void {

    this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);
    this.hexMap.setOffset(150, 135);

    this.internal_createBackgroundSprite();
    this.internal_createHexTerrainBordersAndCoords();

    this.hexCellsGridContainer.visible = this.settings.hex.showGrid;

    for (let i = 0; i < this.hexMap.height; i++) {
      // Add a render group
      this.unitRenderSubgroups.push(new Container({ isRenderGroup: true }));
      this.unitRenderGroup.addChild(this.unitRenderSubgroups[i]);
    }

    // Create the battle units.
    let creature = this.creatureRepository.createCreature(CreatureType.PEASANT);
    creature.position = { x: 3, y: 4 };
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.SPEARMAN);
    creature.position = { x: 0, y: 0 };
    creature.stats.num_moves = 10;
    creature.stats.remaining_movement = 10;
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.PEASANT_ARCHER);
    creature.position = { x: 1, y: 5 };
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.CROSSBOWMAN);
    creature.position = { x: 0, y: 4 };
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.SPEARMAN);
    creature.position = { x: 3, y: 5 };
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.SPEARMAN);
    creature.position = { x: 5, y: 7 };
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.SWORDSMAN);
    creature.position = { x: 4, y: 4 };
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.BARBARIAN);
    creature.position = { x: 4, y: 6 };
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.PEASANT);
    creature.position = { x: 4, y: 3 };
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = this.creatureRepository.createCreature(CreatureType.PEASANT_ARCHER);
    creature.position = { x: 7, y: 4 };
    creature.armyAlignment = 1;
    creature.facingDirection = HexDirection.WEST;
    this.battle.creatures.push(creature);

    this.battle.hookDoingAttack = (attacker, defender, damage, attackType, flankStatus) => {
      this.hookDoingAttack(attacker, defender, damage, attackType, flankStatus);
    };

    this.battle.hookNextTurn = (turnNum, armyIdx) => {
      this.hookNextTurn(turnNum, armyIdx);
    };

    this.battle.hookMovingUnit = (creature: Creature, nextStep: Coords) => {
      this.hookMovingUnit(creature, nextStep);
    }

    this.battle.hookUnitDied = (creature: Creature) => {
      this.hookUnitDied(creature);
    }

    this.battle.hookBattleFinished = (victor: number) => {
      this.hookBattleFinished(victor);
    }

    this.battle.hookRecommendEndTurn = (armyIndex: number) => {
      this.hookRecommendEndTurn(armyIndex);
    }

    this.battle.hookActiveUnitChanged = (creature: Creature) => {
      this.hookActiveUnitChanged(creature);
    }

    this.renderUnits(new MapRenderUpdate());
  }

  hookDoingAttack(_attacker: Creature, defender: Creature, damage: number, attackType: BattleActionType, flankStatus: HexFlankStatus) {
    const defenderPixelCoords = this.hexMap.hexToPixel(defender.position.x, defender.position.y);
    let damageText = "" + damage;
    if (flankStatus === HexFlankStatus.BACKSTAB) {
      damageText += "\n(backstab)";
    } else if (flankStatus === HexFlankStatus.FLANK) {
      damageText += "\n(flanking)";
    }
    this.damageValueDisplay.addDamageValue(damageText, this.uiPlusRenderGroup, defenderPixelCoords);
    if (attackType === BattleActionType.ATTACK_MELEE
      || attackType === BattleActionType.COUNTER_ATTACK_MELEE) {
      // Get a random value between 0.9 and 1.1
      const speedFactor = 0.9 + Math.random() * 0.2;
      sound.play('sword', { speed: speedFactor, volume: this.settings.sound.soundVolume });
    }

    if (attackType === BattleActionType.ATTACK_RANGED) {
      const speedFactor = 0.9 + Math.random() * 0.2;
      sound.play('arrow', { speed: speedFactor, volume: this.settings.sound.soundVolume });
    }
  }

  hookNextTurn(turnNumber: number, armyIndex: number) {
    const message: string = `Turn ${turnNumber + 1} - Army ${armyIndex + 1}`;
    // get the banner to use for the army Index
    const bannerName = this.getBannerTextureNameForArmyIndex(armyIndex);
    const texture = this.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addTurnChange(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);
    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(armyIndex);
    }

    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [];
    }

    if (!this.battle.isCurrentTurnAI()) {
      this.battle.selectNextUnitAndGetIndex();
    }
  }

  hookMovingUnit(_creature: Creature, _nextStep: Coords) {
    const speedFactor = 0.9 + Math.random() * 0.2;
    sound.play('move', { speed: speedFactor, volume: this.settings.sound.soundVolume });
  }

  hookUnitDied(_creature: Creature) {
    const speedFactor = 0.9 + Math.random() * 0.2;
    sound.play('die', { speed: speedFactor, volume: this.settings.sound.soundVolume });
  }

  hookBattleFinished(victorArmyIndex: number) {
    console.log("*** VICTORY for army #" + victorArmyIndex);

    const message: string = `Victory for Army ${victorArmyIndex + 1}`;
    // get the banner to use for the army Index
    const bannerName = this.getBannerTextureNameForArmyIndex(victorArmyIndex);
    const texture = this.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addEndOfBattle(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);
    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(victorArmyIndex);
    }
  }

  hookRecommendEndTurn(_armyIndex: number) {
    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1, brightness: 1, blur: 5, quality: 3 })];
    }
  }

  hookActiveUnitChanged(creature: Creature) {
    console.log("Selected unit changed to: " + creature.creatureType);
    let description = "";
    let visible = false;
    if (creature.abilities.length > 0) {
      description = creature.abilities[0].name;
      visible = true;
    }

    if (this.commonControls.activeAbility1Button) {
      this.commonControls.activeAbility1Button.text = description;
      this.commonControls.activeAbility1Button.visible = visible;
    }

  }

  private directionToSpriteName(direction: HexDirection): string {
    switch (direction) {
      case HexDirection.EAST: return 'hex_dir_E.png';
      case HexDirection.NORTHEAST: return 'hex_dir_NE.png';
      case HexDirection.NORTHWEST: return 'hex_dir_NW.png';
      case HexDirection.WEST: return 'hex_dir_W.png';
      case HexDirection.SOUTHWEST: return 'hex_dir_SW.png';
      case HexDirection.SOUTHEAST: return 'hex_dir_SE.png';
    }
    return 'hex_empty.png';
  }

  private renderUnits(mapUpdate: MapRenderUpdate) {
    // Clear the previous unit sprites
    this.unitRenderSubgroups.forEach((subgroup) => { subgroup.removeChildren(); });
    // this.unitSprites.forEach((sprite) => {this.unitRenderGroup.removeChild(sprite);});
    this.unitSprites = [];
    this.hexUnitBars.forEach((bar) => { this.unitRenderGroup.removeChild(bar); });
    this.hexUnitBars = [];

    this.battle.creatures.forEach((creature, index) => {
      let { x, y } = this.hexMap.hexToPixel(creature.position.x, creature.position.y);
      x -= this.hexMap.cellSize().x / 2;
      y -= this.hexMap.cellSize().y / 2;

      let unitTextureName = 'peasant_fork_right.png';

      if (creature.facingDirection === HexDirection.EAST
        || creature.facingDirection === HexDirection.SOUTHEAST
        || creature.facingDirection === HexDirection.NORTHEAST) {
        switch (creature.creatureType) {
          case CreatureType.PEASANT:
            unitTextureName = 'peasant_fork_right.png';
            break;
          case CreatureType.PEASANT_ARCHER:
            unitTextureName = 'peasant_archer_right.png';
            break;
          case CreatureType.SPEARMAN:
            unitTextureName = 'spearman_right.png';
            break;
          case CreatureType.SWORDSMAN:
            unitTextureName = 'swordman_right.png';
            break;
          case CreatureType.BARBARIAN:
            unitTextureName = 'barbarian_right.png';
            break;
          case CreatureType.CROSSBOWMAN:
            unitTextureName = 'crossbowman_right.png';
            break;
        }

      } else if (creature.facingDirection === HexDirection.WEST
        || creature.facingDirection === HexDirection.SOUTHWEST
        || creature.facingDirection === HexDirection.NORTHWEST) {
        switch (creature.creatureType) {
          case CreatureType.PEASANT:
            unitTextureName = 'peasant_fork_left.png';
            break;
          case CreatureType.PEASANT_ARCHER:
            unitTextureName = 'peasant_archer_left.png';
            break;
          case CreatureType.SPEARMAN:
            unitTextureName = 'spearman_left.png';
            break;
          case CreatureType.SWORDSMAN:
            unitTextureName = 'swordman_left.png';
            break;
          case CreatureType.BARBARIAN:
            unitTextureName = 'barbarian_left.png';
            break;
          case CreatureType.CROSSBOWMAN:
            unitTextureName = 'crossbowman_left.png';
            break;
        }
      }

      const unitSprite = new Sprite(this.unitsSheet?.textures[unitTextureName]);
      unitSprite.x = x;
      unitSprite.y = y;
      this.unitSprites.push(unitSprite);


      // if showing the direction
      if (this.showFacingDirections) {
        let dirTex = this.directionToSpriteName(creature.facingDirection);
        const dirSprite = new Sprite(this.hexagonSheet?.textures[dirTex]);
        dirSprite.position = { x, y };
        dirSprite.alpha = 0.5;
        this.unitSprites.push(dirSprite);
        this.unitRenderSubgroups[creature.position.y].addChild(dirSprite);
      }

      if (this.showHealthbars) {
        let healthBar = new ProgressBar({
          // bg: 'progress_bg.png',
          bg: 'thin_button_normal.png',
          fill: 'progress_fill.png',
          nineSliceSprite: {
            bg: [4, 4, 4, 4],
            fill: [3, 3, 3, 3],
          },
          fillPaddings: { top: 2, right: 2, bottom: 2, left: 2 },
        });
        healthBar.width = 80;
        healthBar.height = 8;
        healthBar.x = x;
        healthBar.y = y + 60;
        healthBar.progress = 100 * creature.stats.remaining_health / creature.stats.health;
        healthBar.rotation = -Math.PI / 2;

        this.hexUnitBars.push(healthBar);
        this.unitRenderSubgroups[creature.position.y].addChild(healthBar);
      }


      unitSprite.filters = [];
      if (index === this.battle.activeCreatureIndex) {
        const filter = new OutlineFilter({ color: 0xd4bf72, thickness: 2 });
        unitSprite.filters = [filter];
      }

      if (index === mapUpdate.hoverEnemyIndex) {
        const filter = new OutlineFilter({ color: 0xd43442, thickness: 2 });
        unitSprite.filters = [filter];
      }

      if (index === mapUpdate.hoverOverUnitIndex) {
        const filter = new OutlineFilter({ color: 0x55cf55, thickness: 2 });
        unitSprite.filters = [filter];
      }

      this.unitRenderSubgroups[creature.position.y].addChild(unitSprite);
    });
  }

  public setupMainLoop(): void {
    this.app.ticker.maxFPS = 60;

    // Listen for frame updates
    this.app.ticker.add((ticker) => {
      this.perfDisplayPanel.startMeasure('frame');
      if (this.fpsText) {
        this.fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;
      }

      if (this.battle) {
        this.perfDisplayPanel.startMeasure('battle.update');
        let mapUpdate: MapRenderUpdate = this.battle.update(ticker.deltaMS);
        this.perfDisplayPanel.stopMeasure('battle.update');
        if (mapUpdate.somethingChanged) {
          this.perfDisplayPanel.startMeasure('map.render');
          this.updateMapRendering(mapUpdate);
          this.perfDisplayPanel.stopMeasure('map.render');
        }
      }

      this.damageValueDisplay.update(ticker.deltaMS);
      this.turnChangeDisplay.update(ticker.deltaMS);
      this.perfDisplayPanel.stopMeasure('frame');

      this.perfDisplayPanel.update();
      this.dumbAI.update(ticker.deltaMS);
    });
  }

  public updateMapRendering(mapUpdate: MapRenderUpdate) {
    if (mapUpdate.selectedCreatureIndex != -1) {
      let hexCoords: Coords = this.battle.creatures[mapUpdate.selectedCreatureIndex].position;
      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        if (!this.hexSelectedSprite) {
          this.hexSelectedSprite = new Sprite(this.hexagonSheet?.textures['hex_selected_green.png']);
          this.hexCellsContainer.addChild(this.hexSelectedSprite);
        }

        if (this.hexSelectedSprite) {
          const hexHoverCoords = this.hexMap.hexToPixel(hexCoords.x, hexCoords.y);
          this.hexSelectedSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
          this.hexSelectedSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
        }
      }
      else {
        if (this.hexSelectedSprite) {
          this.hexCellsContainer.removeChild(this.hexSelectedSprite);
          this.hexSelectedSprite = undefined;
        }
      }

      this.showStatsForUnit(this.battle.creatures[mapUpdate.selectedCreatureIndex]);
    }

    if (mapUpdate.reachableCells) {
      this.hexReachableSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
      this.hexReachableSprites = [];

      // show pathfinding tiles
      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.pathfinding_tiles[i][j] <= 0) {
            continue;
          }

          let spriteSrc = 'hex_action_disabled_gray.png';
          if (this.battle.pathfinding_tiles[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }

          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2
          };

          let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      // highlight ranged targets
      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.rangereach_targets[i][j] <= 0) {
            continue;
          }

          let spriteSrc = 'hex_action_disabled_gray.png';
          if (this.battle.rangereach_targets[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }

          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2
          };

          let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }


      // show ranged reachability (border)
      let edges = HexMap.getEdgesForDataMatrix(this.battle.rangereach_tiles, this.hexMap.width, this.hexMap.height);
      for (let edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2
        };

        let spriteSrc = 'hex_empty.png';
        spriteSrc = getSpriteSourceForEdge(edge, spriteSrc);

        let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
        tempSprite.tint = 0x5555d0;
        tempSprite.position.copyFrom(hexCoords);
        this.hexReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.abilityReachableCells) {

      // show ability reach targets
      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.ability_reach_tiles[i][j] <= 0) {
            continue;
          }

          let spriteSrc = 'hex_action_disabled_gray.png';
          if (this.battle.ability_reach_targets[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }

          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2
          };

          let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      // show ability reachability
      let edges = HexMap.getEdgesForDataMatrix(this.battle.ability_reach_tiles, this.hexMap.width, this.hexMap.height);
      for (let edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2
        };

        let spriteSrc = 'hex_empty.png';


        spriteSrc = getSpriteSourceForEdge(edge, spriteSrc);

        let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
        tempSprite.tint = 0x5555d0;
        tempSprite.position.copyFrom(hexCoords);
        this.hexReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.enemyReachableCells) {
      this.hexEnemyReachableSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
      this.hexEnemyReachableSprites = [];

      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.enemy_potential_tiles[i][j] <= 0) {
            continue;
          }

          let spriteSrc = 'hex_action_disabled_gray.png';
          if (this.battle.enemy_potential_tiles[i][j] === 500) {
            spriteSrc = 'hex_action_blue.png';
          }

          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2
          };

          let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexEnemyReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      let edges = HexMap.getEdgesForDataMatrix(this.battle.enemy_range_tiles, this.hexMap.width, this.hexMap.height);
      for (let edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2
        };

        let spriteSrc = 'hex_empty.png';

        spriteSrc = getSpriteSourceForEdge(edge, spriteSrc);

        let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
        tempSprite.position.copyFrom(hexCoords);
        tempSprite.tint = 0xff0000;
        this.hexEnemyReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.hoverOverCell) {
      if (!this.hexHoverSprite) {
        this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
        // this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_action_disabled_gray.png']);
        this.hexCellsContainer.addChild(this.hexHoverSprite);
      }

      if (this.hexHoverSprite) {
        const hexHoverCoords = this.hexMap.hexToPixel(mapUpdate.hoverOverCell.x, mapUpdate.hoverOverCell.y);
        this.hexHoverSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
        this.hexHoverSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
      }

      if (mapUpdate.hoverEnemyIndex != -1) {
        this.showStatsForUnit(this.battle.creatures[mapUpdate.hoverEnemyIndex]);
      } else if (mapUpdate.hoverOverUnitIndex != -1) {
        this.showStatsForUnit(this.battle.creatures[mapUpdate.hoverOverUnitIndex]);
      } else if (this.battle.activeCreatureIndex != -1) {
        this.showStatsForUnit(this.battle.creatures[this.battle.activeCreatureIndex]);
      }

      this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
      this.hexPathSprites = [];
      if (mapUpdate.hoverPath.length > 0) {
        mapUpdate.hoverPath.forEach((cell) => {
          let sprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
          sprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          sprite.y = this.hexMap.hexToPixel(cell.y, cell.y).y - this.hexMap.cellSize().y / 2;
          this.hexPathSprites.push(sprite);
        });
        this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.addChild(sprite); });
      }
    }

    if (mapUpdate.unitRenderUpdate || mapUpdate.hoverOverUnitIndex != -1 || mapUpdate.hoverEnemyIndex != -1) {
      this.renderUnits(mapUpdate);
    }

    if (mapUpdate.cursorHint.length > 0) {
      if (this.softCursorName != mapUpdate.cursorHint) {
        this.softCursorName = mapUpdate.cursorHint;

        this.uiPlusRenderGroup.removeChild(this.softCursorSprite);
        const oldPosition = this.softCursorSprite.position;
        this.softCursorSprite.texture = this.softCursorTextures[mapUpdate.cursorHint];
        const srcAnchor = this.softCursorTextures[mapUpdate.cursorHint].defaultAnchor
        if (srcAnchor) {
          this.softCursorSprite.anchor = { x: srcAnchor.x, y: srcAnchor.y };
        } else {
          this.softCursorSprite.anchor = { x: 0, y: 0 };
        }
        this.softCursorSprite.position.copyFrom(oldPosition);
        this.uiPlusRenderGroup.addChild(this.softCursorSprite);
      }
    }

    if (mapUpdate.animationAtCoords.type != AnimationType.NONE) {
      console.log(`Animation at coords: ${mapUpdate.animationAtCoords.coords.x}, ${mapUpdate.animationAtCoords.coords.y}`);
      let animationTexSrc = "";
      switch (mapUpdate.animationAtCoords.type) {
        case AnimationType.ATTACK_MELEE:
          animationTexSrc = 'anim_sword_attack.png';
          break;
        case AnimationType.ATTACK_RANGED:
          animationTexSrc = 'anim_arrow_attack.png';
          break;
        default:
          animationTexSrc = '';
      }
      console.log(`Animation texture source: ${animationTexSrc}`);
      if (animationTexSrc.length > 0) {
        const textures = this.uiSheet?.animations[animationTexSrc];
        if (textures) {
          let animSprite = new AnimatedSprite(textures);
          const cell = mapUpdate.animationAtCoords.coords;
          animSprite.animationSpeed = .4; // Adjust the animation speed as needed
          animSprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          animSprite.y = this.hexMap.hexToPixel(cell.x, cell.y).y - this.hexMap.cellSize().y / 2;
          animSprite.play();
          animSprite.loop = false;

          this.uiAnimationSprites.push(animSprite);
          this.hexUiRenderGroup.addChild(animSprite);
        }
      }
    } else {
      this.uiAnimationSprites.forEach((sprite) => { this.hexUiRenderGroup.removeChild(sprite); });
      this.uiAnimationSprites = [];
    }

    function getSpriteSourceForEdge(edge: { coord: Coords; value: number; edge: HexEdge; }, spriteSrc: string) {
      const edgeToSpriteMap: Record<HexEdge, string> = {
        [HexEdge.EAST]: 'hex_range_E.png',
        [HexEdge.NORTHEAST]: 'hex_range_NE.png',
        [HexEdge.NORTH_NORTHEAST]: 'hex_range_NNE.png',
        [HexEdge.NORTH]: 'hex_range_N.png',
        [HexEdge.NORTH_NORTHWEST]: 'hex_range_NNW.png',
        [HexEdge.NORTHWEST]: 'hex_range_NW.png',
        [HexEdge.WEST]: 'hex_range_W.png',
        [HexEdge.SOUTHWEST]: 'hex_range_SW.png',
        [HexEdge.SOUTH_SOUTHWEST]: 'hex_range_SSW.png',
        [HexEdge.SOUTH]: 'hex_range_S.png',
        [HexEdge.SOUTH_SOUTHEAST]: 'hex_range_SSE.png',
        [HexEdge.SOUTHEAST]: 'hex_range_SE.png',
        [HexEdge.NONE]: 'hex_empty.png',
      };

      return edgeToSpriteMap[edge.edge] || spriteSrc;
    }
  }

  public showStatsForUnit(creature: Creature) {
    if (this.unitStats) {
      const bannerName = this.getBannerTextureNameForArmyIndex(creature.armyAlignment);
      const texture = this.bannersSheet?.textures[bannerName];
      this.unitStats.setBannerTexture(texture);

      this.unitStats.setCreature(creature);

      // get the face texture

      let faceName = "";
      switch (creature.creatureType) {
        case CreatureType.PEASANT:
          faceName = "peasant_face.png";
          break;
        case CreatureType.PEASANT_ARCHER:
          faceName = "peasant_archer_face.png";
          break;
        case CreatureType.SPEARMAN:
          faceName = "spearman_face.png";
          break;
        case CreatureType.SWORDSMAN:
          faceName = "swordman_face.png";
          break;
        case CreatureType.BARBARIAN:
          faceName = "barbarian_face.png";
          break;
        case CreatureType.CROSSBOWMAN:
          faceName = "crossbowman_face.png";
          break;
      }

      const faceTexture = this.unitsSheet?.textures[faceName];
      this.unitStats.setFaceTexture(faceTexture);


      this.unitStats.update();
    }
  }

  public setNavMapOffset(offset: Coords): void {
    this.navMapOffset.y = Math.max(this.MAP_OFFSET_MIN.y, offset.y);
    this.navMapOffset.y = Math.min(this.MAP_OFFSET_MAX.y, offset.y);
    this.navMapOffset.x = Math.max(this.MAP_OFFSET_MIN.x, offset.x);
    this.navMapOffset.x = Math.min(this.MAP_OFFSET_MAX.x, offset.x);

    this.hexZoneContainer.position.copyFrom(this.navMapOffset);
  }

  public setupInputHandlers(): void {

    window.addEventListener("gamepadconnected", (e) => {
      let message: string = `Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. ${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes.`;
      console.log(message);
      if (this.messagesText) {
        this.messagesText.text = message;
      }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      let message: string = `Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}`;
      console.log(message);
      if (this.messagesText) {
        this.messagesText.text = message;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (this.currentGameState === GameState.InGame) {
        // handled inside the Game class
        if (event.code === 'Escape') {
          // quit the game?
        } else if (event.code === 'ArrowUp') {
          this.setNavMapOffset({ x: this.navMapOffset.x, y: this.navMapOffset.y - 10 });
        } else if (event.code === 'ArrowDown') {
          this.setNavMapOffset({ x: this.navMapOffset.x, y: this.navMapOffset.y + 10 });
        } else if (event.code === 'ArrowLeft') {
          this.setNavMapOffset({ x: this.navMapOffset.x - 10, y: this.navMapOffset.y });
        } else if (event.code === 'ArrowRight') {
          this.setNavMapOffset({ x: this.navMapOffset.x + 10, y: this.navMapOffset.y });
        } else if (event.code === 'Equal') {
          // check the + and - keys for zooming
          this.modifyZoomLevel(0.1);
        } else if (event.code === 'Minus') {
          this.modifyZoomLevel(-0.1);
        } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
          this.controlPressed = true;
        }

      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.controlPressed = false;
      } else if (event.code === 'KeyE') {
        // End turn
        this.battle?.nextTurn();
        this.battle?.selectNextUnitAndGetIndex();
      } else if (event.code === 'KeyN') {
        // Next unit
        this.battle?.selectNextUnitAndGetIndex();
      } else {
        console.log(`Key pressed: ${event.code}`);
      }
    });

    // add a scroll event listener
    document.addEventListener('wheel', (event) => {
      if (this.currentGameState === GameState.InGame) {
        // Get the ratio between the client event coordinates and the render container size
        let ratio: Coords = {
          x: event.clientX / this.app.screen.width,
          y: event.clientY / this.app.screen.height
        };
        if (event.deltaY < 0) {
          this.modifyZoomLevel(0.1, ratio);
          if (this.commonControls.zoomSlider) {
            this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
          }
        } else {
          this.modifyZoomLevel(-0.1, ratio);
          if (this.commonControls.zoomSlider) {
            this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
          }
        }
      }
    });

    document.addEventListener('mousedown', (event) => {
      // If this is the middle button, start dragging
      if (event.button === 1) {
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
      }

      // If this is the right button, store the coordinates
      if (event.button === 2) {
        this.mouseRightClickCoords = { x: event.clientX, y: event.clientY };
      }
    });

    document.addEventListener('mouseup', (event) => {
      // If this is the middle button, stop dragging
      if (event.button === 1) {
        this.mouseDragCoords = { x: 0, y: 0 };
      }

      if (this.battleMenuPanel?.isVisible()) {
        return;
      }


      // If this is the right button, move or attack ? pass it on to the battle class.
      if (event.button === 2) {
        console.log('Right click');
        if (this.mouseRightClickCoords.x > 0 && this.mouseRightClickCoords.y > 0) {
          let renderContainerAdjustedCoords = this.adjustInContainerCoords(
            { x: event.clientX, y: event.clientY },
            this.renderContainerOffset,
            this.renderContainer.scale
          );

          let navAdjustedCoords = this.adjustInContainerCoords(
            renderContainerAdjustedCoords,
            this.navMapOffset,
            { x: this.navZoomLevel, y: this.navZoomLevel }
          );

          // let hexCoords = this.hexMap.pixelToHex(navAdjustedCoords.x, navAdjustedCoords.y);
          let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
          let hexCoords = hexCoordsWithDetails.cell;

          if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
            console.log("*** Mouse UP on cell: " + hexCoords.x + ", " + hexCoords.y);
            this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
          }
        }
        this.mouseRightClickCoords = { x: 0, y: 0 };
      }
    });

    document.addEventListener('click', (event) => {
      let renderContainerAdjustedCoords = this.adjustInContainerCoords(
        { x: event.clientX, y: event.clientY },
        this.renderContainerOffset,
        this.renderContainer.scale);

      let navAdjustedCoords = this.adjustInContainerCoords(
        renderContainerAdjustedCoords,
        this.navMapOffset,
        { x: this.navZoomLevel, y: this.navZoomLevel });

      if (this.battleMenuPanel?.isVisible()) {
        return;
      }

      let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
      let hexCoords = hexCoordsWithDetails.cell;

      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        // console.log("*** Click on cell: " + hexCoords.x + ", " + hexCoords.y);
        this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (this.battleMenuPanel?.isVisible()) {
        return;
      }

      if (this.currentGameState === GameState.InGame) {

        if (this.mouseDragCoords.x > 0 && this.mouseDragCoords.y > 0) {
          // Get the difference between the current and previous mouse coordinates
          let deltaX = event.clientX - this.mouseDragCoords.x;
          let deltaY = event.clientY - this.mouseDragCoords.y;
          // drag the map
          this.navMapOffset.x += deltaX;
          this.navMapOffset.y += deltaY;
          // clamp the values
          this.navMapOffset.x = Math.max(this.MAP_OFFSET_MIN.x, this.navMapOffset.x);
          this.navMapOffset.x = Math.min(this.MAP_OFFSET_MAX.x, this.navMapOffset.x);
          this.navMapOffset.y = Math.max(this.MAP_OFFSET_MIN.y, this.navMapOffset.y);
          this.navMapOffset.y = Math.min(this.MAP_OFFSET_MAX.y, this.navMapOffset.y);

          this.hexZoneContainer.position.copyFrom(this.navMapOffset);
          // store the current mouse coordinates
          this.mouseDragCoords = { x: event.clientX, y: event.clientY };
          return;
        }

        let renderContainerAdjustedCoords = this.adjustInContainerCoords(
          { x: event.clientX, y: event.clientY },
          this.renderContainerOffset,
          this.renderContainer.scale);


        this.softCursorSprite.position.copyFrom(renderContainerAdjustedCoords);

        let navAdjustedCoords = this.adjustInContainerCoords(
          renderContainerAdjustedCoords,
          this.navMapOffset,
          { x: this.navZoomLevel, y: this.navZoomLevel });

        if (this.unitStats?.isVisible()) {
          this.unitStats.mousemove(renderContainerAdjustedCoords);
        }
        let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
        let hexCoords = hexCoordsWithDetails.cell;

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          this.battle.onMouseOverCell(hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
        }
        else {
          if (this.hexHoverSprite) {
            this.hexCellsContainer.removeChild(this.hexHoverSprite);
            this.hexHoverSprite = undefined;
          }
        }
      }
    });

    globalThis.addEventListener("touchstart", (event) => {
      if (!this.displayOnScreenTouchControls) {
        console.log('Adding on-screen touch controls');
        this.displayOnScreenTouchControls = true;
        this.uiRenderGroup.addChild(this.touchSpriteLeft);
        this.uiRenderGroup.addChild(this.touchSpriteRight);
        return;
      }

      if (this.currentGameState === GameState.InGame) {
        if (event.touches.length > 0) {
          console.log(`Touch start: ${event.touches.item(0)?.clientX}, ${event.touches.item(0)?.clientY}`);
          const touchX = event.touches.item(0)?.clientX;
          const touchY = event.touches.item(0)?.clientY;

          if (touchX && touchY) {
            this.reactToTouchInput(touchX, touchY);
          }
        }
      }
    }, false);
  }

  private reactToTouchInput(touchX: number, touchY: number) {
    console.log(`Touch input: ${touchX}, ${touchY}`);
  }


  private adjustInContainerCoords(sourceCoords: Coords, offsetCoords: Coords, containerScaling: Coords): Coords {
    return {
      x: (sourceCoords.x - offsetCoords.x) / containerScaling.x,
      y: (sourceCoords.y - offsetCoords.y) / containerScaling.y
    };
  }

};


