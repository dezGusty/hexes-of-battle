import { Container, Sprite, Text, TextStyle, BitmapText, AnimatedSprite } from 'pixi.js';
import { ProgressBar } from '@pixi/ui';
import { OutlineFilter, AdvancedBloomFilter } from 'pixi-filters';
import { sound } from '@pixi/sound';
import { GameAssets } from '../core/scene';
import { BattleSettings } from './settings';
import { HexDirection, HexEdge, HexFlankStatus, HexMap } from '../shared/hex-map';
import { HexViewportCamera } from '../shared/hex-viewport-camera';
import { Coords } from '../shared';
import { Creature, CreatureType } from './creature';
import { AnimationType, ArmyControlType, Battle, MapRenderUpdate } from '../battle';
import { BattleActionType } from './battle-action';
import { CPUPlayer } from './cpu-player';
import { CommonControls } from '../ui/common-controls';
import { BattleMenuPanel } from '../ui/battle-menu';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { TopSidePanel } from '../ui/top-side-panel';
import { DamageValueCollection } from '../ui/damage-value-display';
import { TurnChangeCollection } from '../ui/turn-change-display';
import { PerfDisplayPanel } from '../ui/perf-display-panel';

export interface BattleViewEvents {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSliderUpdate: (value: number) => void;
  onNextTurn: () => void;
  onNextUnit: () => void;
  onReset: () => void;
  onActiveAbility1: () => void;
}

export class BattleView {
  public readonly container: Container = new Container();

  public commonControls!: CommonControls;
  public battleMenuPanel?: BattleMenuPanel;
  public unitStats?: UnitStatsPanel;
  public topSidePanel?: TopSidePanel;

  private terrainSprites: Sprite[] = [];
  private uiAnimationSprites: Sprite[] = [];
  private softCursorSprite: Sprite = new Sprite();
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

  // Render containers
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private unitRenderSubgroups: Container[] = [];
  private unitRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiPlusRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiCursorRenderGroup: Container = new Container({ isRenderGroup: true });

  private hexZoneContainer: Container = new Container({ isRenderGroup: true });
  private hexTerrainContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsGridContainer: Container = new Container({ isRenderGroup: true });
  private hexCellsContainer: Container = new Container({ isRenderGroup: true });
  private hexUiRenderGroup: Container = new Container({ isRenderGroup: true });

  public camera!: HexViewportCamera;

  constructor(
    private assets: GameAssets,
    private settings: BattleSettings,
    private hexMap: HexMap,
    private battle: Battle,
    private initialZoomLevel: number = 1.4,
    private cpuPlayer?: CPUPlayer,
    private armyNames: [string, string] = [
      "The Count of Ekkina's 1st Army",
      "Knights of The Grand Duke"
    ]
  ) {}

  public setCpuPlayer(cpuPlayer: CPUPlayer | undefined): void {
    this.cpuPlayer = cpuPlayer;
    this.updateArmyNames();
  }

  public setArmyNames(names: [string, string]): void {
    this.armyNames = names;
    this.updateArmyNames();
  }

  public getFormattedArmyName(armyIndex: number): string {
    const baseName = this.armyNames[armyIndex] ?? (armyIndex === 0 ? "The Count of Ekkina's 1st Army" : "Knights of The Grand Duke");
    const isPlayer = this.battle.army_control[armyIndex] === ArmyControlType.PLAYER;

    let tag = '';
    if (isPlayer) {
      tag = 'Human';
    } else {
      const personality = this.cpuPlayer?.personalityName;
      if (personality) {
        const capitalized = personality.charAt(0).toUpperCase() + personality.slice(1);
        tag = `CPU ${capitalized}`;
      } else {
        tag = 'CPU';
      }
    }

    if (armyIndex === 0) {
      // Player 1 has it as a suffix
      return `${baseName} - ${tag}`;
    } else {
      // Player 2 has it as a prefix
      return `${tag} - ${baseName}`;
    }
  }

  public updateArmyNames(): void {
    if (!this.topSidePanel) return;
    this.topSidePanel.setLeftArmyName(this.getFormattedArmyName(0));
    this.topSidePanel.setRightArmyName(this.getFormattedArmyName(1));
  }

  public initialize(events: BattleViewEvents): void {
    this.container.addChild(this.terrainRenderGroup);
    this.container.addChild(this.hexZoneContainer);
    this.container.addChild(this.uiRenderGroup);
    this.container.addChild(this.uiPlusRenderGroup);
    this.container.addChild(this.uiCursorRenderGroup);

    this.camera = new HexViewportCamera(this.hexZoneContainer, {
      zoomMin: 0.75,
      zoomMax: 2.0,
      zoomStep: 0.05,
      initialZoom: this.initialZoomLevel,
      panOffsetMin: { x: -400, y: -400 },
      panOffsetMax: { x: 1200, y: 800 },
      initialPanOffset: { x: 0, y: -100 },
    });

    this.hexZoneContainer.addChild(this.hexTerrainContainer);
    this.hexZoneContainer.addChild(this.hexCellsGridContainer);
    this.hexZoneContainer.addChild(this.hexCellsContainer);
    this.hexZoneContainer.addChild(this.unitRenderGroup);
    this.hexZoneContainer.addChild(this.hexUiRenderGroup);

    if (this.assets.uiSheet) {
      this.turnChangeDisplay.setUISheet(this.assets.uiSheet);
      this.softCursorSprite = new Sprite(this.assets.softCursorTextures['default']);
      this.uiCursorRenderGroup.addChild(this.softCursorSprite);
    }

    this.initializeCommonControls(events);
    this.initializeTopPanel();
    this.initializeMapGrid();
    this.initializeTexts();
    this.renderUnits(new MapRenderUpdate());
  }

  public getHexZoneContainer(): Container {
    return this.hexZoneContainer;
  }

  public setNavMapOffset(offset: Coords): void {
    this.camera.setPanOffset(offset);
  }

  public setZoomLevel(zoomLevel: number, focalRatio?: Coords): void {
    if (focalRatio) {
      this.camera.setZoom(zoomLevel, focalRatio);
    } else {
      this.camera.setZoom(zoomLevel);
    }
    if (this.commonControls?.zoomSlider) {
      this.commonControls.zoomSlider.value = this.camera.zoomLevel * 100;
    }
  }

  public zoomBy(delta: number, focalRatio?: Coords): void {
    this.camera.zoomBy(delta, focalRatio);
    if (this.commonControls?.zoomSlider) {
      this.commonControls.zoomSlider.value = this.camera.zoomLevel * 100;
    }
  }

  public panBy(delta: Coords): void {
    this.camera.panBy(delta);
  }

  public updateCursorPosition(coords: Coords): void {
    this.softCursorSprite.position.copyFrom(coords);
    if (this.unitStats?.isVisible()) {
      this.unitStats.mousemove(coords);
    }
  }

  public clearHover(): void {
    if (this.hexHoverSprite) {
      this.hexCellsContainer.removeChild(this.hexHoverSprite);
      this.hexHoverSprite = undefined;
    }
  }

  public update(deltaMS: number, fps: number): void {
    if (this.fpsText) {
      this.fpsText.text = `FPS: ${Math.round(fps)}`;
    }

    this.perfDisplayPanel.startMeasure('battle.update');
    const mapUpdate: MapRenderUpdate = this.battle.update(deltaMS);
    this.perfDisplayPanel.stopMeasure('battle.update');

    if (mapUpdate.somethingChanged) {
      this.perfDisplayPanel.startMeasure('map.render');
      this.updateMapRendering(mapUpdate);
      this.perfDisplayPanel.stopMeasure('map.render');
    }

    this.damageValueDisplay.update(deltaMS);
    this.turnChangeDisplay.update(deltaMS);
    this.perfDisplayPanel.update();
  }

  public showAttackVisuals(
    _attacker: Creature,
    defender: Creature,
    damage: number,
    attackType: BattleActionType,
    flankStatus: HexFlankStatus
  ): void {
    const defenderPixelCoords = this.hexMap.hexToPixel(defender.position.x, defender.position.y);
    let damageText = `${damage}`;
    if (flankStatus === HexFlankStatus.BACKSTAB) {
      damageText += '\n(backstab)';
    } else if (flankStatus === HexFlankStatus.FLANK) {
      damageText += '\n(flanking)';
    }
    this.damageValueDisplay.addDamageValue(damageText, this.uiPlusRenderGroup, defenderPixelCoords);

    if (attackType === BattleActionType.ATTACK_MELEE || attackType === BattleActionType.COUNTER_ATTACK_MELEE) {
      sound.play('sword', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
    }
    if (attackType === BattleActionType.ATTACK_RANGED) {
      sound.play('arrow', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
    }
  }

  public showTurnBanner(turnNumber: number, armyIndex: number): void {
    const message = `Turn ${turnNumber + 1} - Army ${armyIndex + 1}`;
    const bannerName = this.getBannerTextureNameForArmyIndex(armyIndex);
    const texture = this.assets.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addTurnChange(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);

    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(armyIndex);
    }
    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [];
    }
  }

  public showVictoryBanner(victorArmyIndex: number): void {
    const message = `Victory for Army ${victorArmyIndex + 1}`;
    const bannerName = this.getBannerTextureNameForArmyIndex(victorArmyIndex);
    const texture = this.assets.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addEndOfBattle(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);

    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(victorArmyIndex);
    }
  }

  public showEndTurnRecommendation(): void {
    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [
        new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1, brightness: 1, blur: 5, quality: 3 }),
      ];
    }
  }

  public updateActiveUnitAbility(creature: Creature): void {
    let description = '';
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

  public resetGridAndTerrain(): void {
    this.coordsTexts.forEach((text) => text.destroy());
    this.coordsTexts.clear();

    this.hexUiRenderGroup.removeChildren();
    this.hexCellsGridContainer.removeChildren();
    this.hexTerrainContainer.removeChildren();

    this.terrainSprites.forEach((sprite) => sprite.destroy());
    this.terrainSprites = [];

    this.unitRenderGroup.removeChildren();
    this.terrainRenderGroup.removeChildren();

    this.initializeMapGrid();
    this.renderUnits(new MapRenderUpdate());
    this.updateArmyNames();
  }

  private initializeCommonControls(events: BattleViewEvents): void {
    this.commonControls = new CommonControls({
      zoomMin: 75,
      zoomMax: 200,
      zoomStep: 5,
      zoomValue: this.initialZoomLevel * 100,
    });
    this.commonControls.initializeButtons();

    if (this.assets.uiSheet) {
      this.battleMenuPanel = new BattleMenuPanel(this.uiPlusRenderGroup, this.assets.uiSheet);
      this.battleMenuPanel.hide();
    }

    this.commonControls.getControls().forEach((control) => {
      this.uiRenderGroup.addChild(control);
    });

    this.commonControls.menuButton?.onPress.connect(() => {
      this.battleMenuPanel?.toggleVisibility();
    });

    this.commonControls.zoomInButton?.onPress.connect(() => events.onZoomIn());
    this.commonControls.zoomOutButton?.onPress.connect(() => events.onZoomOut());
    this.commonControls.zoomSlider?.onUpdate.connect((val) => events.onZoomSliderUpdate(val));

    this.battleMenuPanel?.toggleCoordsButton?.onPress.connect(() => {
      this.settings.debug.showCoords = !this.settings.debug.showCoords;
      this.settings.save();
      this.updateCoordsTexts();
      this.coordsTexts.forEach((text) => {
        text.visible = this.settings.debug.showCoords;
      });
    });

    this.battleMenuPanel?.toggleGridButton?.onPress.connect(() => {
      this.settings.hex.showGrid = !this.settings.hex.showGrid;
      this.settings.save();
      this.hexCellsGridContainer.visible = this.settings.hex.showGrid;
    });

    this.commonControls.nextTurnButton?.onPress.connect(() => events.onNextTurn());
    this.commonControls.nextUnitButton?.onPress.connect(() => events.onNextUnit());

    this.battleMenuPanel?.showHealthbarsButton?.onPress.connect(() => {
      this.showHealthbars = !this.showHealthbars;
      this.battle.reselectCurrentUnit();
    });

    this.commonControls.toggleStatsButton?.onPress.connect(() => {
      if (!this.assets.uiSheet) return;
      if (!this.unitStats) {
        this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet);
        this.unitStats.hide();
      }
      this.unitStats.toggleVisibility();
      if (this.unitStats && this.battle.activeCreatureIndex >= 0) {
        this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]);
        this.unitStats.update();
      }
    });

    this.commonControls.togglePerfStatsButton?.onPress.connect(() => {
      if (!this.assets.uiSheet) return;
      this.perfDisplayPanel.toggleVisibility(this.uiRenderGroup, this.assets.uiSheet);
    });

    this.battleMenuPanel?.toggleMusicButton?.onPress.connect(() => {
      this.settings.sound.musicOn = !this.settings.sound.musicOn;
      this.settings.save();
      if (this.settings.sound.musicOn) {
        sound.play('track_dark_whispers', { loop: true, volume: this.settings.sound.musicVolume });
      } else {
        sound.stop('track_dark_whispers');
      }
    });

    this.commonControls.resetButton?.onPress.connect(() => events.onReset());
    this.commonControls.activeAbility1Button?.onPress.connect(() => events.onActiveAbility1());

    if (this.commonControls.zoomSlider) {
      this.commonControls.zoomSlider.value = this.initialZoomLevel * 100;
    }

    if (this.assets.uiSheet) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet);
    }
  }

  private initializeTopPanel(): void {
    if (!this.assets.uiSheet) return;

    this.topSidePanel = new TopSidePanel(this.uiPlusRenderGroup, this.assets.uiSheet);
    this.topSidePanel.setLeftBannerTexture(
      this.assets.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(0)]
    );
    this.topSidePanel.setRightBannerTexture(
      this.assets.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(1)]
    );
    this.updateArmyNames();
  }

  private initializeMapGrid(): void {
    this.internal_createBackgroundSprite();
    this.internal_createHexTerrainBordersAndCoords();

    this.hexCellsGridContainer.visible = this.settings.hex.showGrid;

    this.unitRenderSubgroups = [];
    for (let i = 0; i < this.hexMap.height; i++) {
      const subgroup = new Container({ isRenderGroup: true });
      this.unitRenderSubgroups.push(subgroup);
      this.unitRenderGroup.addChild(subgroup);
    }
  }

  private internal_createBackgroundSprite(): void {
    if (!this.assets.terrainTexture) return;
    const terrainSprite = new Sprite(this.assets.terrainTexture);
    terrainSprite.scale.set(2, 2);
    terrainSprite.x = 0;
    terrainSprite.y = 0;
    this.terrainRenderGroup.addChild(terrainSprite);
    this.terrainSprites.push(terrainSprite);
  }

  private internal_createHexTerrainBordersAndCoords(): void {
    for (let j = 0; j < this.hexMap.height; j++) {
      for (let i = 0; i < this.hexMap.width; i++) {
        let hexCoord: Coords = this.hexMap.hexToPixel(i, j);
        hexCoord = {
          x: hexCoord.x - this.hexMap.cellSize().x / 2,
          y: hexCoord.y - this.hexMap.cellSize().y / 2,
        };

        const terrain_type = this.battle.getTerrainAt({ x: i, y: j }) + 1;
        const terrainSprite = new Sprite(this.assets.terrainSheet?.textures[`terrain_${terrain_type}.png`]);
        terrainSprite.position.copyFrom(hexCoord);
        this.hexTerrainContainer.addChild(terrainSprite);
        this.terrainSprites.push(terrainSprite);

        const gameSprite = new Sprite(this.assets.hexagonSheet?.textures['hex_empty.png']);
        gameSprite.position.copyFrom(hexCoord);
        this.hexCellsGridContainer.addChild(gameSprite);

        hexCoord.x += this.hexMap.cellSize().x / 3;
        hexCoord.y += this.hexMap.cellSize().y / 3;

        const coordsText = new BitmapText({
          text: `${i},${j}`,
          style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' },
        });
        coordsText.position.copyFrom(hexCoord);
        coordsText.visible = this.settings.debug.showCoords;

        this.coordsTexts.set(`${i},${j}`, coordsText);
        this.hexUiRenderGroup.addChild(coordsText);
      }
    }
  }

  private initializeTexts(): void {
    this.fpsText = new BitmapText({
      text: 'FPS: 0',
      style: { fontFamily: 'GustysSerpents', fontSize: 14, align: 'left' },
    });
    this.fpsText.x = 136;
    this.fpsText.y = 2;
    this.fpsText.alpha = 0.7;
    this.uiRenderGroup.addChild(this.fpsText);

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 } });
    this.instructionsText = new Text({ text: '', style });
    this.instructionsText.position = { x: 1480, y: 5 };
    this.uiRenderGroup.addChild(this.instructionsText);

    this.messagesText = new Text({ text: '', style });
    this.messagesText.x = 10;
    this.messagesText.y = 60;
    this.uiRenderGroup.addChild(this.messagesText);
  }

  public updateCoordsTexts(): void {
    this.coordsTexts.forEach((text, key) => {
      const coords = key.split(',');
      if (coords.length !== 2) return;

      const i = parseInt(coords[0]);
      const j = parseInt(coords[1]);
      const pathCost = this.battle.rangereach_tiles[i]?.[j] ?? 'X';
      text.text = `${i},${j}\n${pathCost}`;
    });
  }

  public renderUnits(mapUpdate: MapRenderUpdate): void {
    this.unitRenderSubgroups.forEach((subgroup) => subgroup.removeChildren());
    this.unitSprites = [];
    this.hexUnitBars.forEach((bar) => this.unitRenderGroup.removeChild(bar));
    this.hexUnitBars = [];

    this.battle.creatures.forEach((creature, index) => {
      let { x, y } = this.hexMap.hexToPixel(creature.position.x, creature.position.y);
      x -= this.hexMap.cellSize().x / 2;
      y -= this.hexMap.cellSize().y / 2;

      let unitTextureName = 'peasant_fork_right.png';

      const isFacingRight =
        creature.facingDirection === HexDirection.EAST ||
        creature.facingDirection === HexDirection.SOUTHEAST ||
        creature.facingDirection === HexDirection.NORTHEAST;

      switch (creature.creatureType) {
        case CreatureType.PEASANT:
          unitTextureName = isFacingRight ? 'peasant_fork_right.png' : 'peasant_fork_left.png';
          break;
        case CreatureType.PEASANT_ARCHER:
          unitTextureName = isFacingRight ? 'peasant_archer_right.png' : 'peasant_archer_left.png';
          break;
        case CreatureType.SPEARMAN:
          unitTextureName = isFacingRight ? 'spearman_right.png' : 'spearman_left.png';
          break;
        case CreatureType.SWORDSMAN:
          unitTextureName = isFacingRight ? 'swordman_right.png' : 'swordman_left.png';
          break;
        case CreatureType.BARBARIAN:
          unitTextureName = isFacingRight ? 'barbarian_right.png' : 'barbarian_left.png';
          break;
        case CreatureType.CROSSBOWMAN:
          unitTextureName = isFacingRight ? 'crossbowman_right.png' : 'crossbowman_left.png';
          break;
      }

      const unitSprite = new Sprite(this.assets.unitsSheet?.textures[unitTextureName]);
      unitSprite.x = x;
      unitSprite.y = y;
      this.unitSprites.push(unitSprite);

      if (this.showFacingDirections) {
        const dirTex = this.directionToSpriteName(creature.facingDirection);
        const dirSprite = new Sprite(this.assets.hexagonSheet?.textures[dirTex]);
        dirSprite.position = { x, y };
        dirSprite.alpha = 0.5;
        this.unitSprites.push(dirSprite);
        this.unitRenderSubgroups[creature.position.y]?.addChild(dirSprite);
      }

      if (this.showHealthbars) {
        const healthBar = new ProgressBar({
          bg: 'thin_button_normal.png',
          fill: 'progress_fill.png',
          nineSliceSprite: { bg: [4, 4, 4, 4], fill: [3, 3, 3, 3] },
          fillPaddings: { top: 2, right: 2, bottom: 2, left: 2 },
        });
        healthBar.width = 80;
        healthBar.height = 8;
        healthBar.x = x;
        healthBar.y = y + 60;
        healthBar.progress = (100 * creature.stats.remaining_health) / creature.stats.health;
        healthBar.rotation = -Math.PI / 2;

        this.hexUnitBars.push(healthBar);
        this.unitRenderSubgroups[creature.position.y]?.addChild(healthBar);
      }

      unitSprite.filters = [];
      if (index === this.battle.activeCreatureIndex) {
        unitSprite.filters = [new OutlineFilter({ color: 0xd4bf72, thickness: 2 })];
      }
      if (index === mapUpdate.hoverEnemyIndex) {
        unitSprite.filters = [new OutlineFilter({ color: 0xd43442, thickness: 2 })];
      }
      if (index === mapUpdate.hoverOverUnitIndex) {
        unitSprite.filters = [new OutlineFilter({ color: 0x55cf55, thickness: 2 })];
      }

      this.unitRenderSubgroups[creature.position.y]?.addChild(unitSprite);
    });
  }

  public updateMapRendering(mapUpdate: MapRenderUpdate): void {
    if (mapUpdate.selectedCreatureIndex !== -1) {
      const hexCoords: Coords = this.battle.creatures[mapUpdate.selectedCreatureIndex].position;
      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        if (!this.hexSelectedSprite) {
          this.hexSelectedSprite = new Sprite(this.assets.hexagonSheet?.textures['hex_selected_green.png']);
          this.hexCellsContainer.addChild(this.hexSelectedSprite);
        }
        if (this.hexSelectedSprite) {
          const hexHoverCoords = this.hexMap.hexToPixel(hexCoords.x, hexCoords.y);
          this.hexSelectedSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
          this.hexSelectedSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
        }
      } else if (this.hexSelectedSprite) {
        this.hexCellsContainer.removeChild(this.hexSelectedSprite);
        this.hexSelectedSprite = undefined;
      }
      this.showStatsForUnit(this.battle.creatures[mapUpdate.selectedCreatureIndex]);
    }

    if (mapUpdate.reachableCells) {
      this.hexReachableSprites.forEach((sprite) => this.hexCellsContainer.removeChild(sprite));
      this.hexReachableSprites = [];

      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.pathfinding_tiles[i][j] <= 0) continue;
          let spriteSrc = 'hex_gray';
          if (this.battle.pathfinding_tiles[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }
          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2,
          };
          const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.rangereach_targets[i][j] <= 0) continue;
          let spriteSrc = 'hex_gray';
          if (this.battle.rangereach_targets[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }
          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2,
          };
          const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      const edges = HexMap.getEdgesForDataMatrix(this.battle.rangereach_tiles, this.hexMap.width, this.hexMap.height);
      for (const edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2,
        };
        const spriteSrc = this.getSpriteSourceForEdge(edge, 'hex_empty.png');
        const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
        tempSprite.tint = 0x5555d0;
        tempSprite.position.copyFrom(hexCoords);
        this.hexReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.abilityReachableCells) {
      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.ability_reach_tiles[i][j] <= 0) continue;
          let spriteSrc = 'hex_gray';
          if (this.battle.ability_reach_targets[i][j] === 500) {
            spriteSrc = 'hex_action_red.png';
          }
          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2,
          };
          const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      const edges = HexMap.getEdgesForDataMatrix(this.battle.ability_reach_tiles, this.hexMap.width, this.hexMap.height);
      for (const edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2,
        };
        const spriteSrc = this.getSpriteSourceForEdge(edge, 'hex_empty.png');
        const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
        tempSprite.tint = 0x5555d0;
        tempSprite.position.copyFrom(hexCoords);
        this.hexReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.enemyReachableCells) {
      this.hexEnemyReachableSprites.forEach((sprite) => this.hexCellsContainer.removeChild(sprite));
      this.hexEnemyReachableSprites = [];

      for (let j = 0; j < this.hexMap.height; j++) {
        for (let i = 0; i < this.hexMap.width; i++) {
          if (this.battle.enemy_potential_tiles[i][j] <= 0) continue;
          let spriteSrc = 'hex_enemy_movement.png';
          if (this.battle.enemy_potential_tiles[i][j] === 500) {
            spriteSrc = 'hex_action_blue.png';
          }
          let hexCoords: Coords = this.hexMap.hexToPixel(i, j);
          hexCoords = {
            x: hexCoords.x - this.hexMap.cellSize().x / 2,
            y: hexCoords.y - this.hexMap.cellSize().y / 2,
          };
          const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
          tempSprite.position.copyFrom(hexCoords);
          this.hexEnemyReachableSprites.push(tempSprite);
          this.hexCellsContainer.addChild(tempSprite);
        }
      }

      const edges = HexMap.getEdgesForDataMatrix(this.battle.enemy_range_tiles, this.hexMap.width, this.hexMap.height);
      for (const edge of edges) {
        let hexCoords: Coords = this.hexMap.hexToPixel(edge.coord.x, edge.coord.y);
        hexCoords = {
          x: hexCoords.x - this.hexMap.cellSize().x / 2,
          y: hexCoords.y - this.hexMap.cellSize().y / 2,
        };
        const spriteSrc = this.getSpriteSourceForEdge(edge, 'hex_empty.png');
        const tempSprite = new Sprite(this.assets.hexagonSheet?.textures[spriteSrc]);
        tempSprite.position.copyFrom(hexCoords);
        tempSprite.tint = 0xff0000;
        this.hexEnemyReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.hoverOverCell) {
      if (!this.hexHoverSprite) {
        this.hexHoverSprite = new Sprite(this.assets.hexagonSheet?.textures['hex_usable_yellow.png']);
        this.hexCellsContainer.addChild(this.hexHoverSprite);
      }
      if (this.hexHoverSprite) {
        const hexHoverCoords = this.hexMap.hexToPixel(mapUpdate.hoverOverCell.x, mapUpdate.hoverOverCell.y);
        this.hexHoverSprite.x = hexHoverCoords.x - this.hexMap.cellSize().x / 2;
        this.hexHoverSprite.y = hexHoverCoords.y - this.hexMap.cellSize().y / 2;
      }

      if (mapUpdate.hoverEnemyIndex !== -1) {
        this.showStatsForUnit(this.battle.creatures[mapUpdate.hoverEnemyIndex]);
      } else if (mapUpdate.hoverOverUnitIndex !== -1) {
        this.showStatsForUnit(this.battle.creatures[mapUpdate.hoverOverUnitIndex]);
      } else if (this.battle.activeCreatureIndex !== -1) {
        this.showStatsForUnit(this.battle.creatures[this.battle.activeCreatureIndex]);
      }

      this.hexPathSprites.forEach((sprite) => this.hexCellsContainer.removeChild(sprite));
      this.hexPathSprites = [];
      if (mapUpdate.hoverPath.length > 0) {
        mapUpdate.hoverPath.forEach((cell) => {
          const sprite = new Sprite(this.assets.hexagonSheet?.textures['hex_usable_yellow.png']);
          sprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          sprite.y = this.hexMap.hexToPixel(cell.y, cell.y).y - this.hexMap.cellSize().y / 2;
          this.hexPathSprites.push(sprite);
        });
        this.hexPathSprites.forEach((sprite) => this.hexCellsContainer.addChild(sprite));
      }
    }

    if (mapUpdate.unitRenderUpdate || mapUpdate.hoverOverUnitIndex !== -1 || mapUpdate.hoverEnemyIndex !== -1) {
      this.renderUnits(mapUpdate);
    }

    if (mapUpdate.cursorHint.length > 0 && this.softCursorName !== mapUpdate.cursorHint) {
      this.softCursorName = mapUpdate.cursorHint;
      this.uiPlusRenderGroup.removeChild(this.softCursorSprite);
      const oldPosition = this.softCursorSprite.position;
      const tex = this.assets.softCursorTextures[mapUpdate.cursorHint];
      if (tex) {
        this.softCursorSprite.texture = tex;
        const srcAnchor = tex.defaultAnchor;
        this.softCursorSprite.anchor = srcAnchor ? { x: srcAnchor.x, y: srcAnchor.y } : { x: 0, y: 0 };
        this.softCursorSprite.position.copyFrom(oldPosition);
        this.uiPlusRenderGroup.addChild(this.softCursorSprite);
      }
    }

    if (mapUpdate.animationAtCoords.type !== AnimationType.NONE) {
      let animationTexSrc = '';
      if (mapUpdate.animationAtCoords.type === AnimationType.ATTACK_MELEE) {
        animationTexSrc = 'anim_sword_attack.png';
      } else if (mapUpdate.animationAtCoords.type === AnimationType.ATTACK_RANGED) {
        animationTexSrc = 'anim_arrow_attack.png';
      }

      if (animationTexSrc.length > 0) {
        const textures = this.assets.uiSheet?.animations[animationTexSrc];
        if (textures) {
          const animSprite = new AnimatedSprite(textures);
          const cell = mapUpdate.animationAtCoords.coords;
          animSprite.animationSpeed = 0.4;
          animSprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          animSprite.y = this.hexMap.hexToPixel(cell.x, cell.y).y - this.hexMap.cellSize().y / 2;
          animSprite.play();
          animSprite.loop = false;
          this.uiAnimationSprites.push(animSprite);
          this.hexUiRenderGroup.addChild(animSprite);
        }
      }
    } else {
      this.uiAnimationSprites.forEach((sprite) => this.hexUiRenderGroup.removeChild(sprite));
      this.uiAnimationSprites = [];
    }
  }

  public showStatsForUnit(creature: Creature): void {
    if (!this.unitStats) return;

    const bannerName = this.getBannerTextureNameForArmyIndex(creature.armyAlignment);
    const bannerTexture = this.assets.bannersSheet?.textures[bannerName];
    this.unitStats.setBannerTexture(bannerTexture);
    this.unitStats.setCreature(creature);

    let faceName = 'peasant_face.png';
    switch (creature.creatureType) {
      case CreatureType.PEASANT: faceName = 'peasant_face.png'; break;
      case CreatureType.PEASANT_ARCHER: faceName = 'peasant_archer_face.png'; break;
      case CreatureType.SPEARMAN: faceName = 'spearman_face.png'; break;
      case CreatureType.SWORDSMAN: faceName = 'swordman_face.png'; break;
      case CreatureType.BARBARIAN: faceName = 'barbarian_face.png'; break;
      case CreatureType.CROSSBOWMAN: faceName = 'crossbowman_face.png'; break;
    }

    const faceTexture = this.assets.unitsSheet?.textures[faceName];
    this.unitStats.setFaceTexture(faceTexture);
    this.unitStats.update();
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

  private getSpriteSourceForEdge(edge: { coord: Coords; value: number; edge: HexEdge }, fallback: string): string {
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
    return edgeToSpriteMap[edge.edge] || fallback;
  }

  private getBannerTextureNameForArmyIndex(armyIndex: number): string {
    return armyIndex === 0 ? 'banner1.png' : 'banner2.png';
  }

  public destroy(): void {
    this.container.removeChildren();
  }
}
