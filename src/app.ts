import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, Texture, Container, TextStyleOptions, AnimatedSprite } from 'pixi.js';
import pkg from './../package.json';
import { HexDirection, hexDirectionToString, HexEdge, HexMap } from './hex-map';
import { CommonControls } from './common-controls';
import { Coords, UserOptions } from './shared';
import { AnimationType, Battle, MapRenderUpdate } from './battle';
import { Creature, CreatureType } from './creature';
import { ProgressBar } from '@pixi/ui';
import { UnitStatsPanel } from './unit-stats-panel';

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

  private hexMap: HexMap = new HexMap(15, 11);
  private battle = new Battle(this.hexMap);

  private NATIVE_RESOLUTION = { width: 1600, height: 900 };

  private ZOOM_LEVEL_MIN = 0.5;
  private ZOOM_LEVEL_MAX = 2.0;
  private navZoomLevel: number = 1;
  private navMapOffset: Coords = { x: 0, y: 0 };
  private MAP_OFFSET_MIN: Coords = { x: -600, y: -600 };
  private MAP_OFFSET_MAX: Coords = { x: 1200, y: 1200 };

  private mouseDragCoords: Coords = { x: 0, y: 0 };
  private mouseRightClickCoords: Coords = { x: 0, y: 0 };

  private terrainSheet?: Spritesheet = undefined;
  private terrainTexture?: Texture = undefined;
  private hexagonSheet?: Spritesheet = undefined;
  private uiSheet?: Spritesheet = undefined;
  private unitsSheet?: Spritesheet = undefined;

  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private softCursorSprite: Sprite = new Sprite();
  private uiAnimationSprites: Sprite[] = [];
  private softCursorTextures: Record<string, Texture> = {};
  private displayOnScreenTouchControls: boolean = false;

  private commonControls: CommonControls = new CommonControls();
  private unitStats?: UnitStatsPanel = undefined;
  private softCursorName: string = 'default';

  private fpsText?: BitmapText;
  private cellDebugText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private coordsTexts: BitmapText[] = [];
  private unitSprites: Sprite[] = [];

  private hexHoverSprite?: Sprite;
  private hexSelectedSprite?: Sprite;
  private hexReachableSprites: Sprite[] = [];
  private hexEnemyReachableSprites: Sprite[] = [];
  private hexPathSprites: Sprite[] = [];
  private hexUnitBars: ProgressBar[] = [];

  private showHealthbars: boolean = true;


  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private unitRenderSubgroups: Container[] = [];
  private unitRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiPlusRenderGroup: Container = new Container({ isRenderGroup: true });
  private renderContainer: Container = new Container();

  private hexZoneContainer: Container = new Container({ isRenderGroup: true });
  private hexTerrainContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsGridContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsContainer: Container = new Container({ isRenderGroup: true });
  private hexUiRenderGroup: Container = new Container({ isRenderGroup: true });

  private userOptions: UserOptions = {
    showCoords: false, showGrid: false
  };

  private renderContainerOffset: Coords = { x: 0, y: 0 };

  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };

  // Store the touch zones for the directions and actions

  private tempMessage = "";

  constructor(public app: Application) {
    // this.currentGameState = GameState.InMenu;
  }

  /**
   * Initializes the application. 
   * This method should be called ONCE after the application is created.
   */
  public async initialize() {
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

    console.log('App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height);
    this.tempMessage = 'App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height;
    this.setScalingForSize(this.app.screen.width, this.app.screen.height);
    this.tempMessage += "\nScaling factor: " + this.renderContainer.scale.x.toFixed(2) + 'x' + this.renderContainer.scale.y.toFixed(2);

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    containingElement.appendChild(this.app.canvas);

    // As a game, we do not need the default context menu in a browser, so we disable it
    containingElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });


    // Add the stage to the canvas
    this.app.stage.addChild(this.renderContainer);

    this.renderContainer.addChild(this.terrainRenderGroup);
    this.renderContainer.addChild(this.hexZoneContainer);
    this.renderContainer.addChild(this.uiRenderGroup);
    this.renderContainer.addChild(this.uiPlusRenderGroup);

    this.hexZoneContainer.addChild(this.hexTerrainContainer);
    this.hexZoneContainer.addChild(this.hexCellsGridContainer);
    this.hexZoneContainer.addChild(this.hexCellsContainer);
    this.hexZoneContainer.addChild(this.unitRenderGroup);
    this.hexZoneContainer.addChild(this.hexUiRenderGroup);

    await this.loadAssets();
    await this.loadSounds();

    this.initializeCommonControls();

    this.initializeMapAndGame();
    await this.initializeTexts();

    this.setupMainLoop();
    this.setupInputHandlers();

    // set-up a resize event listener
    this.app.renderer.on('resize', (width, height) => {
      this.setScalingForSize(width, height);
    });

  }



  private setScalingForSize(width: number, height: number) {
    if (this.instructionsText) {
      this.instructionsText.text = this.tempMessage + "\nResized to: " + width + 'x' + height;
      console.log('Resized to: ' + width + 'x' + height);
    }
    const originalWindowSize = this.NATIVE_RESOLUTION;
    // keep the aspect ratio
    const scaling = { x: width / originalWindowSize.width, y: height / originalWindowSize.height };
    const minScale = Math.min(scaling.x, scaling.y);
    // const minScale = scaling.y * 2;

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

    this.hexagonSheet = await Assets.load('hexesspritesheet2.json');
    if (!this.hexagonSheet) {
      console.error('Failed to load the hexes spritesheet');
    }

    this.terrainSheet = await Assets.load('terrainspritesheet.json');
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
    this.uiPlusRenderGroup.addChild(this.softCursorSprite);

  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new BitmapText({ text: 'FPS: 0', style: this.DEFAULT_FONT_STYLE, });
    this.fpsText.x = 62;
    this.fpsText.y = 2;
    this.fpsText.alpha = 0.7;
    this.uiRenderGroup.addChild(this.fpsText);

    this.cellDebugText = new BitmapText({ text: 'Cell: 0,0', style: this.DEFAULT_FONT_STYLE, });
    this.cellDebugText.x = 62;
    this.cellDebugText.y = 28;
    this.cellDebugText.alpha = 0.9;
    this.uiRenderGroup.addChild(this.cellDebugText);

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 }, stroke: { color: '#4a1850', width: 5, join: 'round' }, });
    this.tempMessage = `Welcome to Hexes of battle v${this.version}!`
      + "\n" + this.tempMessage;
    this.instructionsText = new Text({
      text: this.tempMessage,
      style,
    });
    this.instructionsText.x = 730;
    this.instructionsText.y = 10;
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


    console.log('Loaded sounds...');

  }

  /**
   * Modify the zoom level of the map by a given delta.
   * @param delta A positive or negative value to modify the zoom level by
   * @param zoomOffset Where to zoom in/out from. Default is the center of the screen.
   */
  public modifyZoomLevel(delta: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    let oldHexContainerSize = { x: this.hexZoneContainer.width, y: this.hexZoneContainer.height };
    this.navZoomLevel += delta;
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
    this.commonControls.getControls().forEach((button) => {
      this.uiRenderGroup.addChild(button);
    });

    this.commonControls.zoomInButton?.onPress.connect(() => {
      this.modifyZoomLevel(0.1);
    });

    this.commonControls.zoomOutButton?.onPress.connect(() => {
      this.modifyZoomLevel(-0.1);
    });

    this.commonControls.toggleCoordsButton?.onPress.connect(() => {
      this.coordsTexts.forEach((text) => {
        text.visible = !text.visible;
      });
    });

    this.commonControls.toggleGridButton?.onPress.connect(() => {
      this.hexCellsGridContainer.visible = !this.hexCellsGridContainer.visible;
    });

    this.commonControls.nextTurnButton?.onPress.connect(() => {
      this.battle.nextTurn();
      this.battle.selectNextUnit();
    });

    this.commonControls.nextUnitButton?.onPress.connect(() => {
      this.battle.selectNextUnit();
    });

    this.commonControls.showHealthbarsButton?.onPress.connect(() => {
      this.showHealthbars = !this.showHealthbars;
      this.battle.reselectCurrentUnit();
      // this.unitRenderGroup.visible = !this.unitRenderGroup.visible;
    });

    this.commonControls.toggleStatsButton?.onPress.connect(() => {
      if (!this.uiSheet) {
        return;
      }

      if (!this.unitStats) {
        this.unitStats = new UnitStatsPanel(this.renderContainer, this.uiSheet);
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

    if (this.uiSheet) {
      this.unitStats = new UnitStatsPanel(this.renderContainer, this.uiSheet);
    }

  }

  public initializeMapAndGame(): void {

    // Generate the terrain map (randomly)
    let terrainSprite = new Sprite(this.terrainTexture);
    terrainSprite.scale.set(2, 2);
    terrainSprite.x = 0;
    terrainSprite.y = 0;
    this.terrainRenderGroup.addChild(terrainSprite);

    this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);

    this.hexMap.setOffset(150, 135);
    for (let j = 0; j < this.hexMap.height; j++) {
      for (let i = 0; i < this.hexMap.width; i++) {
        let hexCoord: Coords = this.hexMap.hexToPixel(i, j);
        hexCoord = {
          x: hexCoord.x - this.hexMap.cellSize().x / 2,
          y: hexCoord.y - this.hexMap.cellSize().y / 2
        };

        // get a random value between 1 and 5
        let randomValue = 3; //Math.floor(Math.random() * 2) + 3;
        let terrainSprite = new Sprite(this.terrainSheet?.textures[`grass_${randomValue}.png`]);
        terrainSprite.position.copyFrom(hexCoord);
        this.hexTerrainContainer.addChild(terrainSprite);

        const gameSprite = new Sprite(this.hexagonSheet?.textures['hex_empty.png']);

        gameSprite.position.copyFrom(hexCoord);
        this.hexCellsGridContainer.addChild(gameSprite);

        // REUSE the hexCoord variable to position the text, shift it a bit towards the center.
        hexCoord.x += this.hexMap.cellSize().x / 3;
        hexCoord.y += this.hexMap.cellSize().y / 3;

        let coordsText = new BitmapText({ text: `${i},${j}`, style: this.DEFAULT_FONT_STYLE, });
        coordsText.position.copyFrom(hexCoord);
        coordsText.visible = this.userOptions.showCoords;

        this.coordsTexts.push(coordsText);
        this.hexUiRenderGroup.addChild(coordsText);
      }
    }

    this.hexCellsGridContainer.visible = this.userOptions.showGrid;

    for (let i = 0; i < this.hexMap.height; i++) {
      // Add a render group
      this.unitRenderSubgroups.push(new Container({ isRenderGroup: true }));
      this.unitRenderGroup.addChild(this.unitRenderSubgroups[i]);
    }

    // Create the battle.
    let creature = new Creature();
    creature.position = { x: 0, y: 0 };
    creature.stats.speed = 2;
    creature.stats.remaining_movement = 2;
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.SPEARMAN);
    creature.position = { x: 1, y: 3 };
    creature.stats.speed = 15;
    creature.stats.remaining_movement = 15;
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.PEASANT_ARCHER);
    creature.position = { x: 1, y: 5 };
    creature.stats.speed = 3;
    creature.stats.remaining_movement = 3;
    creature.stats.is_ranged = true;
    creature.stats.range = 5;
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.SPEARMAN);
    creature.position = { x: 3, y: 7 };
    creature.stats.speed = 3;
    creature.stats.remaining_movement = 3;
    creature.armyAlignment = 0;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.SPEARMAN);
    creature.position = { x: 5, y: 7 };
    // creature.stats.health = 30;
    creature.stats.speed = 3;
    creature.stats.remaining_movement = 3;
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.SWORDSMAN);
    creature.position = { x: 7, y: 5 };
    creature.stats.speed = 2;
    creature.stats.remaining_movement = 2;
    creature.stats.attack_melee_low = 6;
    creature.stats.attack_melee_high = 7;
    creature.stats.defense_melee = 2;
    creature.stats.defense_ranged = 1;
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.BARBARIAN);
    creature.position = { x: 6, y: 5 };
    creature.stats.speed = 4;
    creature.stats.remaining_movement = 4;
    creature.stats.attack_melee_low = 6;
    creature.stats.attack_melee_high = 10;
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.PEASANT);
    creature.position = { x: 9, y: 5 };
    creature.stats.speed = 3;
    creature.stats.remaining_movement = 3;
    creature.facingDirection = HexDirection.WEST;
    creature.armyAlignment = 1;
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.PEASANT_ARCHER);
    creature.position = { x: 9, y: 4 };
    creature.stats.speed = 3;
    creature.stats.remaining_movement = 1;
    creature.stats.is_ranged = true;
    creature.stats.range = 5;
    creature.armyAlignment = 1;
    creature.facingDirection = HexDirection.WEST;
    this.battle.creatures.push(creature);

    this.renderUnits();
  }

  private renderUnits() {
    // Clear the previous unit sprites
    this.unitRenderSubgroups.forEach((subgroup) => { subgroup.removeChildren(); });
    // this.unitSprites.forEach((sprite) => {this.unitRenderGroup.removeChild(sprite);});
    this.unitSprites = [];
    this.hexUnitBars.forEach((bar) => { this.unitRenderGroup.removeChild(bar); });
    this.hexUnitBars = [];

    this.battle.creatures.forEach((creature) => {
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
            unitTextureName = 'pikeman_right.png';
            break;
          case CreatureType.SWORDSMAN:
            unitTextureName = 'swordman_right.png';
            break;
          case CreatureType.BARBARIAN:
            unitTextureName = 'barbarian_right.png';
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
            unitTextureName = 'pikeman_left.png';
            break;
          case CreatureType.SWORDSMAN:
            unitTextureName = 'swordman_left.png';
            break;
          case CreatureType.BARBARIAN:
            unitTextureName = 'barbarian_left.png';
            break;
        }
      }

      const unitSprite = new Sprite(this.unitsSheet?.textures[unitTextureName]);
      unitSprite.x = x;
      unitSprite.y = y;
      this.unitSprites.push(unitSprite);

      if (this.showHealthbars) {
        let healthBar = new ProgressBar({
          bg: 'progress_bg.png',
          fill: 'progress_fill.png',
          nineSliceSprite: {
            bg: [3, 3, 3, 3],
            fill: [2, 2, 2, 2],
          },
          fillPaddings: { top: 2, right: 2, bottom: 2, left: 2 },
        });
        healthBar.width = 80;
        healthBar.height = 8;
        healthBar.x = x;
        healthBar.y = y + 60;
        healthBar.progress = 100 * creature.stats.health / creature.stats.max_health;
        healthBar.rotation = -Math.PI / 2;

        this.hexUnitBars.push(healthBar);
        this.unitRenderSubgroups[creature.position.y].addChild(healthBar);
      }

      this.unitRenderSubgroups[creature.position.y].addChild(unitSprite);
    });
  }




  public setupMainLoop(): void {
    this.app.ticker.maxFPS = 60;

    // Listen for frame updates
    this.app.ticker.add((ticker) => {

      if (this.fpsText) {
        this.fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;
      }

      if (this.battle) {
        let mapUpdate: MapRenderUpdate = this.battle.update(ticker.deltaMS);
        if (mapUpdate.somethingChanged) {
          this.updateMapRendering(mapUpdate);
        }
      }

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
          if (this.battle.pathfinding_tiles[i][j] === 100) {
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

      // show ranged reachability
      let edges = HexMap.getEdgesForDataMatrix(this.battle.rangereach_tiles, this.hexMap.width, this.hexMap.height);
      for (let edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2
        };

        let spriteSrc = 'hex_empty.png';

        switch (edge.edge) {
          case HexEdge.EAST:
            spriteSrc = 'hex_range_E.png';
            break;
          case HexEdge.NORTHEAST:
            spriteSrc = 'hex_range_NE.png';
            break;
          case HexEdge.NORTH_NORTHEAST:
            spriteSrc = 'hex_range_NNE.png';
            break;
          case HexEdge.NORTH:
            spriteSrc = 'hex_range_N.png';
            break;
          case HexEdge.NORTH_NORTHWEST:
            spriteSrc = 'hex_range_NNW.png';
            break;
          case HexEdge.NORTHWEST:
            spriteSrc = 'hex_range_NW.png';
            break;
          case HexEdge.WEST:
            spriteSrc = 'hex_range_W.png';
            break;
          case HexEdge.SOUTHWEST:
            spriteSrc = 'hex_range_SW.png';
            break;
          case HexEdge.SOUTH_SOUTHWEST:
            spriteSrc = 'hex_range_SSW.png';
            break;
          case HexEdge.SOUTH:
            spriteSrc = 'hex_range_S.png';
            break;
          case HexEdge.SOUTH_SOUTHEAST:
            spriteSrc = 'hex_range_SSE.png';
            break;
          case HexEdge.SOUTHEAST:
            spriteSrc = 'hex_range_SE.png';
            break;
        }

        let tempSprite = new Sprite(this.hexagonSheet?.textures[spriteSrc]);
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
          if (this.battle.enemy_potential_tiles[i][j] === 100) {
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

        switch (edge.edge) {
          case HexEdge.EAST:
            spriteSrc = 'hex_range_E.png';
            break;
          case HexEdge.NORTHEAST:
            spriteSrc = 'hex_range_NE.png';
            break;
          case HexEdge.NORTH_NORTHEAST:
            spriteSrc = 'hex_range_NNE.png';
            break;
          case HexEdge.NORTH:
            spriteSrc = 'hex_range_N.png';
            break;
          case HexEdge.NORTH_NORTHWEST:
            spriteSrc = 'hex_range_NNW.png';
            break;
          case HexEdge.NORTHWEST:
            spriteSrc = 'hex_range_NW.png';
            break;
          case HexEdge.WEST:
            spriteSrc = 'hex_range_W.png';
            break;
          case HexEdge.SOUTHWEST:
            spriteSrc = 'hex_range_SW.png';
            break;
          case HexEdge.SOUTH_SOUTHWEST:
            spriteSrc = 'hex_range_SSW.png';
            break;
          case HexEdge.SOUTH:
            spriteSrc = 'hex_range_S.png';
            break;
          case HexEdge.SOUTH_SOUTHEAST:
            spriteSrc = 'hex_range_SSE.png';
            break;
          case HexEdge.SOUTHEAST:
            spriteSrc = 'hex_range_SE.png';
            break;
        }

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
      } else if (this.battle.activeCreatureIndex != -1) {
        this.showStatsForUnit(this.battle.creatures[this.battle.activeCreatureIndex]);
      }

      this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
      this.hexPathSprites = [];
      if (mapUpdate.hoverPath.length > 0) {
        mapUpdate.hoverPath.forEach((cell) => {
          let sprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
          sprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          sprite.y = this.hexMap.hexToPixel(cell.x, cell.y).y - this.hexMap.cellSize().y / 2;
          this.hexPathSprites.push(sprite);
        });
        this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.addChild(sprite); });
      }
    }

    if (mapUpdate.unitRenderUpdate) {
      this.renderUnits();
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
  }

  public showStatsForUnit(creature: Creature) {
    if (this.unitStats) {
      this.unitStats.setCreature(creature);
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
        }

      }
    });

    document.addEventListener('keyup', (_) => {

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
        } else {
          this.modifyZoomLevel(-0.1, ratio);
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
      // If this is the right button, move or attack ? pass it on to the battle class.
      if (event.button === 2) {
        console.log('Right click');
        if (this.mouseRightClickCoords.x > 0 && this.mouseRightClickCoords.y > 0) {
          let renderContainerAdjustedCoords = this.adjustInContainerCoords(
            { x: event.clientX, y: event.clientY },
            this.renderContainerOffset,
            this.renderContainer.scale);

          let navAdjustedCoords = this.adjustInContainerCoords(
            renderContainerAdjustedCoords,
            this.navMapOffset,
            { x: this.navZoomLevel, y: this.navZoomLevel });

          // let hexCoords = this.hexMap.pixelToHex(navAdjustedCoords.x, navAdjustedCoords.y);
          let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
          let hexCoords = hexCoordsWithDetails.cell;
          if (this.cellDebugText) {
            this.cellDebugText.text =
              `Mouse: ${navAdjustedCoords.x.toFixed(2)}, ${navAdjustedCoords.y.toFixed(2)}
               Cell: ${hexCoords.x}, ${hexCoords.y}
               Direction: ${hexDirectionToString(hexCoordsWithDetails.direction)}`;
            console.log(this.cellDebugText.text);
          }

          if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
            this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction);
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
      let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
      let hexCoords = hexCoordsWithDetails.cell;

      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction);
      }
    });

    document.addEventListener('mousemove', (event) => {
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
        let hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
        let hexCoords = hexCoordsWithDetails.cell;
        if (this.cellDebugText) {
          this.cellDebugText.text =
            `Mouse: ${navAdjustedCoords.x.toFixed(2)}, ${navAdjustedCoords.y.toFixed(2)}
             Cell: ${hexCoords.x}, ${hexCoords.y}
             Direction: ${hexDirectionToString(hexCoordsWithDetails.direction)}`;
        }

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          this.battle.onMouseOverCell(hexCoords, hexCoordsWithDetails.direction);
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


