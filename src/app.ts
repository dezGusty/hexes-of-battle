import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, Texture, Container, TextStyleOptions, textStyleToCSS, EventSystem } from 'pixi.js';
import pkg from './../package.json';
import { HexMap } from './hex-map';
import { CommonControls } from './common-controls';
import { Coords, UserOptions } from './shared';
import { Battle, MapRenderUpdate } from './battle';
import { Army } from './army';
import { Creature, CreatureType } from './creature';

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
  private army1?: Army;
  private army2?: Army;

  private NATIVE_RESOLUTION = { width: 1600, height: 900 };

  private ZOOM_LEVEL_MIN = 0.5;
  private ZOOM_LEVEL_MAX = 2.0;
  private navZoomLevel: number = 1;
  private navMapOffset: Coords = { x: 0, y: 0 };
  private MAP_OFFSET_MIN: Coords = { x: -600, y: -600 };
  private MAP_OFFSET_MAX: Coords = { x: 1200, y: 1200 };

  private mouseDragCoords: Coords = { x: 0, y: 0 };

  private terrainTextureNames: string[] = [];
  private unitsTextureNames: string[] = [];

  private terrainSheet?: Spritesheet = undefined;
  private terrainTexture?: Texture = undefined;
  private hexagonSheet?: Spritesheet = undefined;
  private uiSheet?: Spritesheet = undefined;
  private unitsSheet?: Spritesheet = undefined;

  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private softCursorSprite: Sprite = new Sprite();
  private displayOnScreenTouchControls: boolean = false;

  private commonControls: CommonControls = new CommonControls();

  private fpsText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private coordsTexts: BitmapText[] = [];
  private unitSprites: Sprite[] = [];

  private hexHoverSprite?: Sprite;
  private hexSelectedSprite?: Sprite;
  private hexReachableSprites: Sprite[] = [];


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

    this.softCursorSprite = new Sprite(this.uiSheet.textures['cur_gs_arrow.png']);
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

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 }, stroke: { color: '#4a1850', width: 5, join: 'round' }, });
    this.tempMessage = `Welcome to Hexes of battle v${this.version}!`
      + "\n" + this.tempMessage;
    this.instructionsText = new Text({
      text: this.tempMessage,
      style,
    });
    this.instructionsText.x = 230;
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
    this.uiRenderGroup.addChild(this.commonControls.fullscreenToggleButton);
    this.uiRenderGroup.addChild(this.commonControls.zoomInButton);
    this.uiRenderGroup.addChild(this.commonControls.zoomOutButton);
    this.uiRenderGroup.addChild(this.commonControls.toggleCoordsButton);
    this.uiRenderGroup.addChild(this.commonControls.toggleGridButton);

    this.commonControls.zoomInButton.onPress.connect(() => {
      this.modifyZoomLevel(0.1);
    });

    this.commonControls.zoomOutButton.onPress.connect(() => {
      this.modifyZoomLevel(-0.1);
    });

    this.commonControls.toggleCoordsButton.onPress.connect(() => {
      this.coordsTexts.forEach((text) => {
        text.visible = !text.visible;
      });
    });

    this.commonControls.toggleGridButton.onPress.connect(() => {
      this.hexCellsGridContainer.visible = !this.hexCellsGridContainer.visible;
    });
  }

  public initializeMapAndGame(): void {

    // Generate the terrain map (randomly)
    let terrainSprite = new Sprite(this.terrainTexture);
    terrainSprite.scale.set(2, 2);
    terrainSprite.x = 0;
    terrainSprite.y = 0;
    this.terrainRenderGroup.addChild(terrainSprite);

    this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);

    this.hexMap.setOffset(150, 180);
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
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.SPEARMAN);
    creature.position = { x: 1, y: 3 };
    this.battle.creatures.push(creature);

    creature = new Creature(CreatureType.PEASANT_ARCHER);
    creature.position = { x: 2, y: 5 };
    this.battle.creatures.push(creature);

    this.battle.creatures.forEach((creature) => {
      let { x, y } = this.hexMap.hexToPixel(creature.position.x, creature.position.y);
      x -= this.hexMap.cellSize().x / 2;
      y -= this.hexMap.cellSize().y / 2;

      let unitTextureName = 'peasant_fork_right.png';
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
      }
      const unitSprite = new Sprite(this.unitsSheet?.textures[unitTextureName]);
      unitSprite.x = x;
      unitSprite.y = y;
      this.unitSprites.push(unitSprite);

      this.unitRenderSubgroups[creature.position.y].addChild(unitSprite);
    });

    // Add some random units
    // for (let j = this.hexMap.height - 1; j >= 0; j--) {
    //   for (let i = this.hexMap.width - 1; i >= 0; i--) {
    //     let { x, y } = this.hexMap.hexToPixel(i, j);
    //     x -= this.hexMap.cellSize().x / 2;
    //     y -= this.hexMap.cellSize().y / 2;

    //     const unitSprite = new Sprite(this.unitsSheet?.textures['peasant_fork_right.png']);
    //     unitSprite.x = x;
    //     unitSprite.y = y;
    //     this.unitSprites.push(unitSprite);

    //     this.unitRenderSubgroups[j].addChild(unitSprite);
    //   }
    // }
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
          // this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
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
    }

    if (mapUpdate.reachableCells) {
      this.hexReachableSprites.forEach((sprite) => {this.hexCellsContainer.removeChild(sprite);});
      this.hexReachableSprites = [];

      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.pathfinding_tiles[i][j] <= 0) {
            continue;
          }

          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2
          };

          let tempSprite = new Sprite(this.hexagonSheet?.textures['hex_action_disabled_gray.png']);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

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

    document.addEventListener('keyup', (event) => {

    });

    // add a scroll event listener
    document.addEventListener('wheel', (event) => {
      if (this.currentGameState === GameState.InGame) {
        let directionSign: number = event.deltaY > 0 ? -1 : 1;
        console.log(`Zoom at coords ${event.clientX}, ${event.clientY}`);
        // Get the ratio between the client event coordinates and the render container size
        let ratio: Coords = {
          x: event.clientX / this.app.screen.width,
          y: event.clientY / this.app.screen.height
        };
        if (event.deltaY < 0) {
          console.log(`Ratio: ${ratio.x}, ${ratio.y}`);
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
      // If this is the right button, also start dragging
      if (event.button === 2) {
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
      }
    });

    document.addEventListener('mouseup', (event) => {
      // If this is the middle button, stop dragging
      if (event.button === 1) {
        this.mouseDragCoords = { x: 0, y: 0 };
      }
      // If this is the right button, also stop dragging
      if (event.button === 2) {
        this.mouseDragCoords = { x: 0, y: 0 };
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

      let hexCoords = this.hexMap.pixelToHex(navAdjustedCoords.x, navAdjustedCoords.y);

      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        this.battle?.onMouseClickOnCell(event, hexCoords);
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
        let hexCoords = this.hexMap.pixelToHex(navAdjustedCoords.x, navAdjustedCoords.y);

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          if (!this.hexHoverSprite) {
            this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
            // this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_action_disabled_gray.png']);
            this.hexCellsContainer.addChild(this.hexHoverSprite);
          }

          if (this.hexHoverSprite) {
            const hexHoverCoords = this.hexMap.hexToPixel(hexCoords.x, hexCoords.y);
            this.hexHoverSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
            this.hexHoverSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
          }
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


