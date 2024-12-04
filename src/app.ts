import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, Texture, Container, TextStyleOptions, textStyleToCSS } from 'pixi.js';
import pkg from './../package.json';
import { HexMap } from './hex-map';

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
  private NATIVE_RESOLUTION = { width: 1600, height: 900 };

  private terrainTextureNames: string[] = [];
  private unitsTextureNames: string[] = [];

  private terrainSheet?: Spritesheet = undefined;
  private terrainTexture?: Texture = undefined;
  private hexagonSheet?: Spritesheet = undefined;
  private unitsSheet?: Spritesheet = undefined;

  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private displayOnScreenTouchControls: boolean = false;

  private fpsText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private coordsTexts: BitmapText[] = [];
  private unitSprites: Sprite[] = [];

  private hexHoverSprite?: Sprite;


  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private mainRenderGroup: Container = new Container({ isRenderGroup: true });
  private unitRenderSubgroups: Container[] = [];
  private unitRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private renderContainer: Container = new Container();

  private renderContainerOffset: { x: number, y: number } = { x: 0, y: 0 };

  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };
  private CELL_SIZE = 80;


  // Store the touch zones for the directions and actions
  private touchZoneActions: { x: number, y: number, action: string }[] = [
    { x: 109, y: 171, action: 'up' },
    { x: 109, y: 292, action: 'down' },
    { x: 50, y: 232, action: 'left' },
    { x: 169, y: 232, action: 'right' },

    { x: 689, y: 171, action: 'up' },
    { x: 689, y: 292, action: 'down' },
    { x: 630, y: 232, action: 'left' },
    { x: 749, y: 232, action: 'right' }
  ];

  private tempMessage = "";
  private needToAddHighscore: boolean = false;

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

    // Add the stage to the canvas
    this.app.stage.addChild(this.renderContainer);

    this.renderContainer.addChild(this.terrainRenderGroup);
    this.renderContainer.addChild(this.mainRenderGroup);
    this.renderContainer.addChild(this.unitRenderGroup);
    this.renderContainer.addChild(this.uiRenderGroup);

    await this.loadAssets();
    await this.loadSounds();

    this.initializeMapAndGame();
    await this.initializeTexts();

    this.setupMainLoop();
    this.setupInputHandlers();

    // set-up a resize event listener
    this.app.renderer.on('resize', (width, height) => {
      this.setScalingForSize(width, height);
    });

  }

  private enterFullscreen() {
    const containingElement: HTMLElement | null = document.getElementById('game');
    if (!containingElement) {
      console.error('Failed to find the game container element');
      return;
    }
    containingElement.requestFullscreen();
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
    this.renderContainer.scale.set(minScale, minScale);

    // Set-up an offset for the render container.
    // It should be in the middle horizontally and about 30 pixels up from the middle vertically
    this.renderContainerOffset = {
      x: (width - originalWindowSize.width * minScale) / 2,
      y: Math.max((height - originalWindowSize.height * minScale) / 2 - 30, 0)
    };

    this.renderContainer.position.set(this.renderContainerOffset.x, this.renderContainerOffset.y);
  }

  public async loadAssets() {

    this.terrainTexture = await Assets.load('terrain1background.png');

    this.hexagonSheet = await Assets.load('hexesspritesheet2.json');
    if (!this.hexagonSheet) {
      console.error('Failed to load the hexes spritesheet');
    }

    this.unitsSheet = await Assets.load('unitsspritesheet.json');
    if (!this.unitsSheet) {
      console.error('Failed to load the units spritesheet');
    }

    // Set the mouse cursor

    // const interaction = this.app.renderer.plugins.interaction;
    // interaction.cursorStyles["pointer"] = "url('./img/cartoon-pointer-96x96.png'), auto";
    this.renderContainer.interactive = true;
    this.renderContainer.cursor = "pointer";

  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new BitmapText({ text: 'FPS: 0', style: this.DEFAULT_FONT_STYLE, });
    this.fpsText.x = 10;
    this.fpsText.y = 10;
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

  public initializeMapAndGame(): void {
    // Generate the terrain map (randomly)
    let terrainSprite = new Sprite(this.terrainTexture);
    terrainSprite.scale.set(2, 2);
    terrainSprite.x = 0;
    terrainSprite.y = 0;
    this.terrainRenderGroup.addChild(terrainSprite);

    this.hexMap.setOffset(150, 180);
    for (let j = 0; j < this.hexMap.height; j++) {
      for (let i = 0; i < this.hexMap.width; i++) {
        const gameSprite = new Sprite(this.hexagonSheet?.textures['hex_empty.png']);
        // let { x, y } = this.hexMap.getCellTopCornerCoords({ x: i, y: j });
        let { x, y } = this.hexMap.hexToPixel(i, j);
        x -= this.hexMap.cellSize().x / 2;
        y -= this.hexMap.cellSize().y / 2;

        gameSprite.x = x;
        gameSprite.y = y;
        this.mainRenderGroup.addChild(gameSprite);

        let coordsText = new BitmapText({ text: `${i},${j}`, style: this.DEFAULT_FONT_STYLE, });
        coordsText.x = x;
        coordsText.y = y;

        this.coordsTexts.push(coordsText);
        this.uiRenderGroup.addChild(coordsText);
      }
    }

    for (let i = 0; i < this.hexMap.height; i++) {
      // Add a render group
      this.unitRenderSubgroups.push(new Container({ isRenderGroup: true }));
      this.unitRenderGroup.addChild(this.unitRenderSubgroups[i]);
    }

    // Add some random units
    for (let j = this.hexMap.height - 1; j >= 0; j--) {
      for (let i = this.hexMap.width - 1; i >= 0; i--) {
        let { x, y } = this.hexMap.hexToPixel(i, j);
        x -= this.hexMap.cellSize().x / 2;
        y -= this.hexMap.cellSize().y / 2;

        const unitSprite = new Sprite(this.unitsSheet?.textures['peasant_fork_right.png']);
        unitSprite.x = x;
        unitSprite.y = y;
        this.unitSprites.push(unitSprite);

        this.unitRenderSubgroups[j].addChild(unitSprite);
      }
    }
  }




  public setupMainLoop(): void {
    this.app.ticker.maxFPS = 60;

    // Listen for frame updates
    this.app.ticker.add((ticker) => {

      if (this.fpsText) {
        this.fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;
      }

    });
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

        }
      }
    });

    document.addEventListener('keyup', (event) => {
      if (this.currentGameState === GameState.InGame) {

      }
    });

    document.addEventListener('click', (event) => {
      if (event.x < 10 && event.y < 10) {
        this.enterFullscreen();
      }
    });

    document.addEventListener('mousedown', (event) => {
      if (this.currentGameState === GameState.InGame) {
        let scaledX = event.clientX / this.renderContainer.scale.x - this.renderContainerOffset.x;
        let scaledY = event.clientY / this.renderContainer.scale.y - this.renderContainerOffset.y;

        let hexCoords = this.hexMap.pixelToHex(scaledX, scaledY);
        if (this.messagesText) this.messagesText.text = `Mouse down: ${event.clientX}, ${event.clientY} 
        => scaled: ${scaledX}, ${scaledY}
        => clicked cell: ${hexCoords.x}, ${hexCoords.y}`;

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          if (!this.hexHoverSprite) {
            this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
            this.mainRenderGroup.addChild(this.hexHoverSprite);
          }

          if (this.hexHoverSprite) {
            const hexHoverCoords = this.hexMap.hexToPixel(hexCoords.x, hexCoords.y);
            this.hexHoverSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
            this.hexHoverSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
          }
        }
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (this.currentGameState === GameState.InGame) {
        let scaledX = event.clientX / this.renderContainer.scale.x - this.renderContainerOffset.x;
        let scaledY = event.clientY / this.renderContainer.scale.y - this.renderContainerOffset.y;

        let hexCoords = this.hexMap.pixelToHex(scaledX, scaledY);
        if (this.messagesText) this.messagesText.text = `Mouse move: ${event.clientX}, ${event.clientY} 
        => scaled: ${scaledX}, ${scaledY}
        => over cell: ${hexCoords.x}, ${hexCoords.y}`;

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          if (!this.hexHoverSprite) {
            this.hexHoverSprite = new Sprite(this.hexagonSheet?.textures['hex_usable_yellow.png']);
            this.mainRenderGroup.addChild(this.hexHoverSprite);
          }

          if (this.hexHoverSprite) {
            const hexHoverCoords = this.hexMap.hexToPixel(hexCoords.x, hexCoords.y);
            this.hexHoverSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
            this.hexHoverSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
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


};


