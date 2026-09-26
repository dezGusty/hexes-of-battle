import { Container, Sprite, Text, TextStyle, BitmapText, AnimatedSprite } from 'pixi.js';
import { ProgressBar } from '@pixi/ui';
import { OutlineFilter, AdvancedBloomFilter } from 'pixi-filters';
import { sound } from '@pixi/sound';
import { GameContext, Scene } from '../core/scene';
import { HexDirection, HexEdge, HexFlankStatus, HexMap } from '../shared/hex-map';
import { Coords } from '../shared';
import { AnimationType, Battle, MapRenderUpdate } from '../battle';
import { Creature, CreatureType } from '../battle/creature';
import { CommonControls } from '../ui/common-controls';
import { BattleMenuPanel } from '../ui/battle-menu';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { TopSidePanel } from '../ui/top-side-panel';
import { DamageValueCollection } from '../ui/damage-value-display';
import { TurnChangeCollection } from '../ui/turn-change-display';
import { PerfDisplayPanel } from '../ui/perf-display-panel';
import { DumbAI } from '../battle/dumb-ai';
import { CreatureRepository } from '../battle/creature-repository';
import { BattleActionType } from '../battle/battle-action';

export class BattleScene implements Scene {
  public readonly name = 'battle';
  public readonly container: Container = new Container();

  private context!: GameContext;

  private hexMap: HexMap = new HexMap(13, 9);
  private battle!: Battle;
  private dumbAI!: DumbAI;

  private ZOOM_LEVEL_MIN = 0.75;
  private ZOOM_LEVEL_MAX = 2.0;
  private ZOOM_STEP = 0.05;
  private navZoomLevel: number = 1.4;
  private navMapOffset: Coords = { x: 0, y: -100 };
  private MAP_OFFSET_MIN: Coords = { x: -400, y: -400 };
  private MAP_OFFSET_MAX: Coords = { x: 1200, y: 800 };

  private mouseDragCoords: Coords = { x: 0, y: 0 };
  private mouseRightClickCoords: Coords = { x: 0, y: 0 };

  private terrainSprites: Sprite[] = [];
  private uiAnimationSprites: Sprite[] = [];
  private softCursorSprite: Sprite = new Sprite();
  private softCursorName: string = 'default';

  private commonControls!: CommonControls;
  private battleMenuPanel?: BattleMenuPanel;
  private unitStats?: UnitStatsPanel;
  private topSidePanel?: TopSidePanel;

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

  // Render groups
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

  private creatureRepository: CreatureRepository = new CreatureRepository();
  private controlPressed: boolean = false;

  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundKeyUp?: (e: KeyboardEvent) => void;
  private boundWheel?: (e: WheelEvent) => void;
  private boundMouseDown?: (e: MouseEvent) => void;
  private boundMouseUp?: (e: MouseEvent) => void;
  private boundClick?: (e: MouseEvent) => void;
  private boundMouseMove?: (e: MouseEvent) => void;

  public async enter(context: GameContext, _params?: any): Promise<void> {
    this.context = context;

    this.battle = new Battle(this.hexMap);
    this.dumbAI = new DumbAI(this.battle);

    this.commonControls = new CommonControls({
      zoomMin: this.ZOOM_LEVEL_MIN * 100,
      zoomMax: this.ZOOM_LEVEL_MAX * 100,
      zoomStep: this.ZOOM_STEP * 100,
      zoomValue: this.navZoomLevel * 100,
    });

    this.creatureRepository.setAbilities(context.templates.abilityTypes);
    this.creatureRepository.setCreatureTemplates(context.templates.creatureTemplates);

    this.container.addChild(this.terrainRenderGroup);
    this.container.addChild(this.hexZoneContainer);
    this.container.addChild(this.uiRenderGroup);
    this.container.addChild(this.uiPlusRenderGroup);
    this.container.addChild(this.uiCursorRenderGroup);

    this.hexZoneContainer.scale.set(this.navZoomLevel, this.navZoomLevel);

    this.hexZoneContainer.addChild(this.hexTerrainContainer);
    this.hexZoneContainer.addChild(this.hexCellsGridContainer);
    this.hexZoneContainer.addChild(this.hexCellsContainer);
    this.hexZoneContainer.addChild(this.unitRenderGroup);
    this.hexZoneContainer.addChild(this.hexUiRenderGroup);

    if (context.assets.uiSheet) {
      this.turnChangeDisplay.setUISheet(context.assets.uiSheet);
      this.softCursorSprite = new Sprite(context.assets.softCursorTextures['default']);
      this.uiCursorRenderGroup.addChild(this.softCursorSprite);
    }

    this.initializeCommonControls();
    this.initializeTopPanel();
    this.initializeMapAndGame();
    this.initializeTexts();

    this.setupInputHandlers();

    this.setNavMapOffset(this.navMapOffset);
    this.startBattle();
  }

  public update(deltaMS: number): void {
    if (this.fpsText) {
      this.fpsText.text = `FPS: ${Math.round(this.context.app.ticker.FPS)}`;
    }

    if (this.battle) {
      this.perfDisplayPanel.startMeasure('battle.update');
      const mapUpdate: MapRenderUpdate = this.battle.update(deltaMS);
      this.perfDisplayPanel.stopMeasure('battle.update');
      if (mapUpdate.somethingChanged) {
        this.perfDisplayPanel.startMeasure('map.render');
        this.updateMapRendering(mapUpdate);
        this.perfDisplayPanel.stopMeasure('map.render');
      }
    }

    this.damageValueDisplay.update(deltaMS);
    this.turnChangeDisplay.update(deltaMS);
    this.perfDisplayPanel.update();
    this.dumbAI.update(deltaMS);
  }

  public resize(_width: number, _height: number): void {
    this.hexZoneContainer.scale.set(this.navZoomLevel, this.navZoomLevel);
  }

  public exit(): void {
    this.removeInputHandlers();
    sound.stop('track_dark_whispers');
    this.container.removeChildren();
  }

  private startBattle() {
    this.hookNextTurn(0, 0);
    this.battle.start();

    if (this.context.settings.sound.musicOn) {
      sound.play('track_dark_whispers', { loop: true, volume: this.context.settings.sound.musicVolume });
    }
  }

  private resetBattleData() {
    this.coordsTexts.forEach((text) => { text.destroy(); });
    this.coordsTexts.clear();

    this.hexUiRenderGroup.removeChildren();
    this.hexCellsGridContainer.removeChildren();
    this.hexTerrainContainer.removeChildren();

    this.terrainSprites.forEach((sprite) => { sprite.destroy(); });
    this.terrainSprites = [];

    this.battle.creatures = [];
    this.unitRenderGroup.removeChildren();
    this.terrainRenderGroup.removeChildren();

    this.initializeMapAndGame();
  }

  public modifyZoomLevel(delta: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    this.setZoomLevel(this.navZoomLevel + delta, zoomOffset);
  }

  public setZoomLevel(newZoomLevel: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    const oldHexContainerSize = { x: this.hexZoneContainer.width, y: this.hexZoneContainer.height };
    this.navZoomLevel = Math.max(this.ZOOM_LEVEL_MIN, Math.min(this.ZOOM_LEVEL_MAX, newZoomLevel));

    this.hexZoneContainer.scale.set(this.navZoomLevel, this.navZoomLevel);

    this.setNavMapOffset({
      x: this.navMapOffset.x + (oldHexContainerSize.x - this.hexZoneContainer.width) * zoomOffset.x,
      y: this.navMapOffset.y + (oldHexContainerSize.y - this.hexZoneContainer.height) * zoomOffset.y,
    });
  }

  private initializeCommonControls(): void {
    this.commonControls.initializeButtons();

    if (this.context.assets.uiSheet) {
      this.battleMenuPanel = new BattleMenuPanel(this.uiPlusRenderGroup, this.context.assets.uiSheet);
      this.battleMenuPanel.hide();
    }

    this.commonControls.getControls().forEach((control) => {
      this.uiRenderGroup.addChild(control);
    });

    this.commonControls.menuButton?.onPress.connect(() => {
      this.battleMenuPanel?.toggleVisibility();
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
      this.setZoomLevel(value / 100);
    });

    this.battleMenuPanel?.toggleCoordsButton?.onPress.connect(() => {
      this.context.settings.debug.showCoords = !this.context.settings.debug.showCoords;
      this.context.settings.save();
      this.updateCoordsTexts();
      this.coordsTexts.forEach((text) => {
        text.visible = this.context.settings.debug.showCoords;
      });
    });

    this.battleMenuPanel?.toggleGridButton?.onPress.connect(() => {
      this.context.settings.hex.showGrid = !this.context.settings.hex.showGrid;
      this.context.settings.save();
      this.hexCellsGridContainer.visible = this.context.settings.hex.showGrid;
    });

    this.commonControls.nextTurnButton?.onPress.connect(() => {
      this.battle.nextTurn();
    });

    this.commonControls.nextUnitButton?.onPress.connect(() => {
      this.battle.selectNextUnitAndGetIndex();
    });

    this.battleMenuPanel?.showHealthbarsButton?.onPress.connect(() => {
      this.showHealthbars = !this.showHealthbars;
      this.battle.reselectCurrentUnit();
    });

    this.commonControls.toggleStatsButton?.onPress.connect(() => {
      if (!this.context.assets.uiSheet) return;

      if (!this.unitStats) {
        this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.context.assets.uiSheet);
        this.unitStats.hide();
      }

      this.unitStats.toggleVisibility();

      if (this.unitStats && this.battle.activeCreatureIndex >= 0) {
        this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]);
        this.unitStats.update();
      }
    });

    this.commonControls.togglePerfStatsButton?.onPress.connect(() => {
      if (!this.context.assets.uiSheet) return;
      this.perfDisplayPanel.toggleVisibility(this.uiRenderGroup, this.context.assets.uiSheet);
    });

    this.battleMenuPanel?.toggleMusicButton?.onPress.connect(() => {
      this.context.settings.sound.musicOn = !this.context.settings.sound.musicOn;
      this.context.settings.save();
      if (this.context.settings.sound.musicOn) {
        sound.play('track_dark_whispers', { loop: true, volume: this.context.settings.sound.musicVolume });
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

    if (this.commonControls.zoomSlider) {
      this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
    }

    if (this.context.assets.uiSheet) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.context.assets.uiSheet);
    }
  }

  private initializeTopPanel(): void {
    if (!this.context.assets.uiSheet) {
      return;
    }

    this.topSidePanel = new TopSidePanel(this.uiPlusRenderGroup, this.context.assets.uiSheet);
    this.topSidePanel.setLeftBannerTexture(
      this.context.assets.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(0)]
    );
    this.topSidePanel.setRightBannerTexture(
      this.context.assets.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(1)]
    );

    this.topSidePanel.setLeftArmyName("The Count of Ekkina's 1st Army");
    this.topSidePanel.setRightArmyName("Knights of The Grand Duke");
  }

  private updateCoordsTexts() {
    this.coordsTexts.forEach((text, key) => {
      const coords = key.split(',');
      if (coords.length !== 2) return;

      const i = parseInt(coords[0]);
      const j = parseInt(coords[1]);
      const pathCost = this.battle.rangereach_tiles[i]?.[j] ?? 'X';
      text.text = `${i},${j}\n${pathCost}`;
    });
  }

  private getBannerTextureNameForArmyIndex(armyIndex: number): string {
    return armyIndex === 0 ? 'banner1.png' : 'banner2.png';
  }

  private internal_createBackgroundSprite() {
    if (!this.context.assets.terrainTexture) return;
    const terrainSprite = new Sprite(this.context.assets.terrainTexture);
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
          y: hexCoord.y - this.hexMap.cellSize().y / 2,
        };

        const terrain_type = this.battle.getTerrainAt({ x: i, y: j }) + 1;
        const terrainSprite = new Sprite(this.context.assets.terrainSheet?.textures[`terrain_${terrain_type}.png`]);
        terrainSprite.position.copyFrom(hexCoord);
        this.hexTerrainContainer.addChild(terrainSprite);
        this.terrainSprites.push(terrainSprite);

        const gameSprite = new Sprite(this.context.assets.hexagonSheet?.textures['hex_empty.png']);
        gameSprite.position.copyFrom(hexCoord);
        this.hexCellsGridContainer.addChild(gameSprite);

        hexCoord.x += this.hexMap.cellSize().x / 3;
        hexCoord.y += this.hexMap.cellSize().y / 3;

        const coordsText = new BitmapText({
          text: `${i},${j}`,
          style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' },
        });
        coordsText.position.copyFrom(hexCoord);
        coordsText.visible = this.context.settings.debug.showCoords;

        this.coordsTexts.set(`${i},${j}`, coordsText);
        this.hexUiRenderGroup.addChild(coordsText);
      }
    }
  }

  private initializeMapAndGame(): void {
    this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);
    this.hexMap.setOffset(150, 135);

    this.internal_createBackgroundSprite();
    this.internal_createHexTerrainBordersAndCoords();

    this.hexCellsGridContainer.visible = this.context.settings.hex.showGrid;

    for (let i = 0; i < this.hexMap.height; i++) {
      this.unitRenderSubgroups.push(new Container({ isRenderGroup: true }));
      this.unitRenderGroup.addChild(this.unitRenderSubgroups[i]);
    }

    // Initial army units
    const addUnit = (type: CreatureType, pos: Coords, army: number, facing: HexDirection = HexDirection.EAST, extraMoves?: number) => {
      const creature = this.creatureRepository.createCreature(type);
      creature.position = { ...pos };
      creature.armyAlignment = army;
      creature.facingDirection = facing;
      if (extraMoves !== undefined) {
        creature.stats.num_moves = extraMoves;
        creature.stats.remaining_movement = extraMoves;
      }
      this.battle.creatures.push(creature);
    };

    addUnit(CreatureType.PEASANT, { x: 3, y: 4 }, 0);
    addUnit(CreatureType.SPEARMAN, { x: 0, y: 0 }, 0, HexDirection.EAST, 10);
    addUnit(CreatureType.PEASANT_ARCHER, { x: 1, y: 5 }, 0);
    addUnit(CreatureType.CROSSBOWMAN, { x: 0, y: 4 }, 0);
    addUnit(CreatureType.SPEARMAN, { x: 3, y: 5 }, 0);

    addUnit(CreatureType.SPEARMAN, { x: 5, y: 7 }, 1, HexDirection.WEST);
    addUnit(CreatureType.SWORDSMAN, { x: 4, y: 4 }, 1, HexDirection.WEST);
    addUnit(CreatureType.BARBARIAN, { x: 4, y: 6 }, 1, HexDirection.WEST);
    addUnit(CreatureType.PEASANT, { x: 4, y: 3 }, 1, HexDirection.WEST);
    addUnit(CreatureType.PEASANT_ARCHER, { x: 7, y: 4 }, 1, HexDirection.WEST);

    this.battle.hookDoingAttack = (attacker, defender, damage, attackType, flankStatus) => {
      this.hookDoingAttack(attacker, defender, damage, attackType, flankStatus);
    };
    this.battle.hookNextTurn = (turnNum, armyIdx) => {
      this.hookNextTurn(turnNum, armyIdx);
    };
    this.battle.hookMovingUnit = (creature, nextStep) => {
      this.hookMovingUnit(creature, nextStep);
    };
    this.battle.hookUnitDied = (creature) => {
      this.hookUnitDied(creature);
    };
    this.battle.hookBattleFinished = (victor) => {
      this.hookBattleFinished(victor);
    };
    this.battle.hookRecommendEndTurn = (armyIndex) => {
      this.hookRecommendEndTurn(armyIndex);
    };
    this.battle.hookActiveUnitChanged = (creature) => {
      this.hookActiveUnitChanged(creature);
    };

    this.renderUnits(new MapRenderUpdate());
  }

  private initializeTexts() {
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

  private hookDoingAttack(_attacker: Creature, defender: Creature, damage: number, attackType: BattleActionType, flankStatus: HexFlankStatus) {
    const defenderPixelCoords = this.hexMap.hexToPixel(defender.position.x, defender.position.y);
    let damageText = `${damage}`;
    if (flankStatus === HexFlankStatus.BACKSTAB) {
      damageText += '\n(backstab)';
    } else if (flankStatus === HexFlankStatus.FLANK) {
      damageText += '\n(flanking)';
    }
    this.damageValueDisplay.addDamageValue(damageText, this.uiPlusRenderGroup, defenderPixelCoords);

    if (attackType === BattleActionType.ATTACK_MELEE || attackType === BattleActionType.COUNTER_ATTACK_MELEE) {
      sound.play('sword', { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
    }
    if (attackType === BattleActionType.ATTACK_RANGED) {
      sound.play('arrow', { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
    }
  }

  private hookNextTurn(turnNumber: number, armyIndex: number) {
    const message = `Turn ${turnNumber + 1} - Army ${armyIndex + 1}`;
    const bannerName = this.getBannerTextureNameForArmyIndex(armyIndex);
    const texture = this.context.assets.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addTurnChange(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);

    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [];
    }

    if (!this.battle.isCurrentTurnAI()) {
      this.battle.selectNextUnitAndGetIndex();
    }
  }

  private hookMovingUnit(_creature: Creature, _nextStep: Coords) {
    sound.play('move', { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
  }

  private hookUnitDied(_creature: Creature) {
    sound.play('die', { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
  }

  private hookBattleFinished(victorArmyIndex: number) {
    const message = `Victory for Army ${victorArmyIndex + 1}`;
    const bannerName = this.getBannerTextureNameForArmyIndex(victorArmyIndex);
    const texture = this.context.assets.bannersSheet?.textures[bannerName];
    this.turnChangeDisplay.addEndOfBattle(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);
    this.context.eventBus.emit('battle:finished', { victor: victorArmyIndex });
  }

  private hookRecommendEndTurn(_armyIndex: number) {
    if (this.commonControls.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [
        new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1, brightness: 1, blur: 5, quality: 3 }),
      ];
    }
  }

  private hookActiveUnitChanged(creature: Creature) {
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
    this.unitRenderSubgroups.forEach((subgroup) => { subgroup.removeChildren(); });
    this.unitSprites = [];
    this.hexUnitBars.forEach((bar) => { this.unitRenderGroup.removeChild(bar); });
    this.hexUnitBars = [];

    this.battle.creatures.forEach((creature, index) => {
      let { x, y } = this.hexMap.hexToPixel(creature.position.x, creature.position.y);
      x -= this.hexMap.cellSize().x / 2;
      y -= this.hexMap.cellSize().y / 2;

      let unitTextureName = 'peasant_fork_right.png';

      const isFacingRight = creature.facingDirection === HexDirection.EAST
        || creature.facingDirection === HexDirection.SOUTHEAST
        || creature.facingDirection === HexDirection.NORTHEAST;

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

      const unitSprite = new Sprite(this.context.assets.unitsSheet?.textures[unitTextureName]);
      unitSprite.x = x;
      unitSprite.y = y;
      this.unitSprites.push(unitSprite);

      if (this.showFacingDirections) {
        const dirTex = this.directionToSpriteName(creature.facingDirection);
        const dirSprite = new Sprite(this.context.assets.hexagonSheet?.textures[dirTex]);
        dirSprite.position = { x, y };
        dirSprite.alpha = 0.5;
        this.unitSprites.push(dirSprite);
        this.unitRenderSubgroups[creature.position.y].addChild(dirSprite);
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
        this.unitRenderSubgroups[creature.position.y].addChild(healthBar);
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

      this.unitRenderSubgroups[creature.position.y].addChild(unitSprite);
    });
  }

  private updateMapRendering(mapUpdate: MapRenderUpdate) {
    if (mapUpdate.selectedCreatureIndex !== -1) {
      const hexCoords: Coords = this.battle.creatures[mapUpdate.selectedCreatureIndex].position;
      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        if (!this.hexSelectedSprite) {
          this.hexSelectedSprite = new Sprite(this.context.assets.hexagonSheet?.textures['hex_selected_green.png']);
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
      this.hexReachableSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
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
          const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
          const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
        const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
          const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
        const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
          const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
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
        const tempSprite = new Sprite(this.context.assets.hexagonSheet?.textures[spriteSrc]);
        tempSprite.position.copyFrom(hexCoords);
        tempSprite.tint = 0xff0000;
        this.hexEnemyReachableSprites.push(tempSprite);
        this.hexCellsContainer.addChild(tempSprite);
      }
    }

    if (mapUpdate.hoverOverCell) {
      if (!this.hexHoverSprite) {
        this.hexHoverSprite = new Sprite(this.context.assets.hexagonSheet?.textures['hex_usable_yellow.png']);
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

      this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.removeChild(sprite); });
      this.hexPathSprites = [];
      if (mapUpdate.hoverPath.length > 0) {
        mapUpdate.hoverPath.forEach((cell) => {
          const sprite = new Sprite(this.context.assets.hexagonSheet?.textures['hex_usable_yellow.png']);
          sprite.x = this.hexMap.hexToPixel(cell.x, cell.y).x - this.hexMap.cellSize().x / 2;
          sprite.y = this.hexMap.hexToPixel(cell.y, cell.y).y - this.hexMap.cellSize().y / 2;
          this.hexPathSprites.push(sprite);
        });
        this.hexPathSprites.forEach((sprite) => { this.hexCellsContainer.addChild(sprite); });
      }
    }

    if (mapUpdate.unitRenderUpdate || mapUpdate.hoverOverUnitIndex !== -1 || mapUpdate.hoverEnemyIndex !== -1) {
      this.renderUnits(mapUpdate);
    }

    if (mapUpdate.cursorHint.length > 0 && this.softCursorName !== mapUpdate.cursorHint) {
      this.softCursorName = mapUpdate.cursorHint;
      this.uiPlusRenderGroup.removeChild(this.softCursorSprite);
      const oldPosition = this.softCursorSprite.position;
      const tex = this.context.assets.softCursorTextures[mapUpdate.cursorHint];
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
        const textures = this.context.assets.uiSheet?.animations[animationTexSrc];
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
      this.uiAnimationSprites.forEach((sprite) => { this.hexUiRenderGroup.removeChild(sprite); });
      this.uiAnimationSprites = [];
    }
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

  private showStatsForUnit(creature: Creature) {
    if (!this.unitStats) return;

    const bannerName = this.getBannerTextureNameForArmyIndex(creature.armyAlignment);
    const bannerTexture = this.context.assets.bannersSheet?.textures[bannerName];
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

    const faceTexture = this.context.assets.unitsSheet?.textures[faceName];
    this.unitStats.setFaceTexture(faceTexture);
    this.unitStats.update();
  }

  public setNavMapOffset(offset: Coords): void {
    this.navMapOffset.y = Math.max(this.MAP_OFFSET_MIN.y, Math.min(this.MAP_OFFSET_MAX.y, offset.y));
    this.navMapOffset.x = Math.max(this.MAP_OFFSET_MIN.x, Math.min(this.MAP_OFFSET_MAX.x, offset.x));
    this.hexZoneContainer.position.copyFrom(this.navMapOffset);
  }

  private setupInputHandlers(): void {
    this.boundKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp') {
        this.setNavMapOffset({ x: this.navMapOffset.x, y: this.navMapOffset.y - 10 });
      } else if (event.code === 'ArrowDown') {
        this.setNavMapOffset({ x: this.navMapOffset.x, y: this.navMapOffset.y + 10 });
      } else if (event.code === 'ArrowLeft') {
        this.setNavMapOffset({ x: this.navMapOffset.x - 10, y: this.navMapOffset.y });
      } else if (event.code === 'ArrowRight') {
        this.setNavMapOffset({ x: this.navMapOffset.x + 10, y: this.navMapOffset.y });
      } else if (event.code === 'Equal') {
        this.modifyZoomLevel(0.1);
      } else if (event.code === 'Minus') {
        this.modifyZoomLevel(-0.1);
      } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.controlPressed = true;
      }
    };

    this.boundKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.controlPressed = false;
      } else if (event.code === 'KeyE') {
        this.battle?.nextTurn();
        this.battle?.selectNextUnitAndGetIndex();
      } else if (event.code === 'KeyN') {
        this.battle?.selectNextUnitAndGetIndex();
      }
    };

    this.boundWheel = (event: WheelEvent) => {
      const ratio: Coords = {
        x: event.clientX / this.context.app.screen.width,
        y: event.clientY / this.context.app.screen.height,
      };
      if (event.deltaY < 0) {
        this.modifyZoomLevel(0.1, ratio);
      } else {
        this.modifyZoomLevel(-0.1, ratio);
      }
      if (this.commonControls.zoomSlider) {
        this.commonControls.zoomSlider.value = this.navZoomLevel * 100;
      }
    };

    this.boundMouseDown = (event: MouseEvent) => {
      if (event.button === 1) {
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
      }
      if (event.button === 2) {
        this.mouseRightClickCoords = { x: event.clientX, y: event.clientY };
      }
    };

    this.boundMouseUp = (event: MouseEvent) => {
      if (event.button === 1) {
        this.mouseDragCoords = { x: 0, y: 0 };
      }
      if (this.battleMenuPanel?.isVisible()) return;

      if (event.button === 2 && this.mouseRightClickCoords.x > 0 && this.mouseRightClickCoords.y > 0) {
        const renderContainerAdjustedCoords = this.adjustInContainerCoords(
          { x: event.clientX, y: event.clientY },
          this.context.stage.position,
          this.context.stage.scale
        );
        const navAdjustedCoords = this.adjustInContainerCoords(
          renderContainerAdjustedCoords,
          this.navMapOffset,
          { x: this.navZoomLevel, y: this.navZoomLevel }
        );
        const hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
        const hexCoords = hexCoordsWithDetails.cell;

        if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
          this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
        }
        this.mouseRightClickCoords = { x: 0, y: 0 };
      }
    };

    this.boundClick = (event: MouseEvent) => {
      if (this.battleMenuPanel?.isVisible()) return;

      const renderContainerAdjustedCoords = this.adjustInContainerCoords(
        { x: event.clientX, y: event.clientY },
        this.context.stage.position,
        this.context.stage.scale
      );
      const navAdjustedCoords = this.adjustInContainerCoords(
        renderContainerAdjustedCoords,
        this.navMapOffset,
        { x: this.navZoomLevel, y: this.navZoomLevel }
      );
      const hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
      const hexCoords = hexCoordsWithDetails.cell;

      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        this.battle?.onMouseClickOnCell(event, hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
      }
    };

    this.boundMouseMove = (event: MouseEvent) => {
      if (this.battleMenuPanel?.isVisible()) return;

      if (this.mouseDragCoords.x > 0 && this.mouseDragCoords.y > 0) {
        const deltaX = event.clientX - this.mouseDragCoords.x;
        const deltaY = event.clientY - this.mouseDragCoords.y;
        this.navMapOffset.x += deltaX;
        this.navMapOffset.y += deltaY;
        this.navMapOffset.x = Math.max(this.MAP_OFFSET_MIN.x, Math.min(this.MAP_OFFSET_MAX.x, this.navMapOffset.x));
        this.navMapOffset.y = Math.max(this.MAP_OFFSET_MIN.y, Math.min(this.MAP_OFFSET_MAX.y, this.navMapOffset.y));
        this.hexZoneContainer.position.copyFrom(this.navMapOffset);
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
        return;
      }

      const renderContainerAdjustedCoords = this.adjustInContainerCoords(
        { x: event.clientX, y: event.clientY },
        this.context.stage.position,
        this.context.stage.scale
      );
      this.softCursorSprite.position.copyFrom(renderContainerAdjustedCoords);

      const navAdjustedCoords = this.adjustInContainerCoords(
        renderContainerAdjustedCoords,
        this.navMapOffset,
        { x: this.navZoomLevel, y: this.navZoomLevel }
      );

      if (this.unitStats?.isVisible()) {
        this.unitStats.mousemove(renderContainerAdjustedCoords);
      }

      const hexCoordsWithDetails = this.hexMap.pixelToHexWithDirectionalDetail(navAdjustedCoords.x, navAdjustedCoords.y);
      const hexCoords = hexCoordsWithDetails.cell;

      if (hexCoords.x >= 0 && hexCoords.x < this.hexMap.width && hexCoords.y >= 0 && hexCoords.y < this.hexMap.height) {
        this.battle.onMouseOverCell(hexCoords, hexCoordsWithDetails.direction, this.controlPressed);
      } else if (this.hexHoverSprite) {
        this.hexCellsContainer.removeChild(this.hexHoverSprite);
        this.hexHoverSprite = undefined;
      }
    };

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('wheel', this.boundWheel);
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('click', this.boundClick);
    document.addEventListener('mousemove', this.boundMouseMove);
  }

  private removeInputHandlers(): void {
    if (this.boundKeyDown) document.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) document.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundWheel) document.removeEventListener('wheel', this.boundWheel);
    if (this.boundMouseDown) document.removeEventListener('mousedown', this.boundMouseDown);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.boundClick) document.removeEventListener('click', this.boundClick);
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
  }

  private adjustInContainerCoords(sourceCoords: Coords, offsetCoords: Coords, containerScaling: Coords): Coords {
    return {
      x: (sourceCoords.x - offsetCoords.x) / containerScaling.x,
      y: (sourceCoords.y - offsetCoords.y) / containerScaling.y,
    };
  }
}
