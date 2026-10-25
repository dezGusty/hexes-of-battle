import { Container, Sprite, Text, TextStyle, BitmapText, AnimatedSprite, NineSliceSprite, Texture, Assets } from 'pixi.js';
import pkg from '../../package.json';
import { ProgressBar } from '@pixi/ui';
import { OutlineFilter, AdvancedBloomFilter } from 'pixi-filters';
import { sound } from '@pixi/sound';
import { GameAssets } from '../core/scene';
import { BattleSettings } from './settings';
import { HexDirection, HexEdge, HexFlankStatus, HexMap } from '../shared/hex-map';
import { HexViewportCamera } from '../shared/hex-viewport-camera';
import { Coords } from '../shared';
import { Creature, CreatureType } from './creature';
import { Ability } from './ability';
import { AnimationType, ArmyControlType, Battle, InputState, MapRenderUpdate } from '../battle';
import { BattleActionType } from './battle-action';
import { CPUPlayer } from './cpu-player';
import { CommonControls } from '../ui/common-controls';
import { BattleMenuPanel } from '../ui/battle-menu';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { TopSidePanel } from '../ui/top-side-panel';
import { DamageValueCollection } from '../ui/damage-value-display';
import { TurnChangeCollection } from '../ui/turn-change-display';

import { ExhaustionState } from './combat-rules';

import { BattleSaveEntry, SaveManager } from './save-manager';

export interface BattleViewEvents {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSliderUpdate: (value: number) => void;
  onAltitudeUp?: () => void;
  onAltitudeDown?: () => void;
  onNextTurn: () => void;
  onNextUnit: () => void;
  onReset: () => void;
  onActiveAbility1: () => void;
  onRest?: () => void;
  onSaveBattle?: (name: string) => boolean;
  onLoadSave?: (entry: BattleSaveEntry) => void;
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
  public versionText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;
  public targetAcquirementBanner?: Container;
  public targetAcquirementText?: Text;
  public targetAcquirementBg?: NineSliceSprite;
  private gameVersion: string = pkg.version;
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
  private screenWidth: number =
    typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920;
  private screenHeight: number =
    typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 1080;

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
    ],
    gameVersion?: string
  ) {
    if (gameVersion) {
      this.gameVersion = gameVersion;
    }
  }

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

  public applyHardwareCursorVisibility(hidden: boolean): void {
    const gameContainer = typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById('game') : null;
    if (gameContainer) {
      if (hidden) {
        gameContainer.classList.add('hide-hardware-cursor');
        gameContainer.style.cursor = 'none';
      } else {
        gameContainer.classList.remove('hide-hardware-cursor');
        gameContainer.style.cursor = '';
      }
    }
  }

  public toggleHardwareCursor(): boolean {
    this.settings.hideHardwareCursor = !this.settings.hideHardwareCursor;
    this.settings.save();
    this.applyHardwareCursorVisibility(this.settings.hideHardwareCursor);
    this.battleMenuPanel?.setHardwareCursorHidden(this.settings.hideHardwareCursor);
    return this.settings.hideHardwareCursor;
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
      this.fpsText.visible = this.settings.debug.showFps;
    }
    if (this.versionText) {
      this.versionText.visible = this.settings.debug.showFps;
    }

    const mapUpdate: MapRenderUpdate = this.battle.update(deltaMS);

    if (mapUpdate.somethingChanged) {
      this.updateMapRendering(mapUpdate);
    }

    this.damageValueDisplay.update(deltaMS);
    this.turnChangeDisplay.update(deltaMS);
    this.updateTargetAcquirementHint();
  }

  public showAttackVisuals(
    _attacker: Creature,
    defender: Creature,
    damage: number,
    attackType: BattleActionType,
    flankStatus: HexFlankStatus
  ): void {
    const defenderPixelCoords = this.hexMap.hexToPixel(defender.position.x, defender.position.y);
    if (this.settings.hex.showDamageIndicators) {
      let damageText = `-${damage}`;
      if (flankStatus === HexFlankStatus.BACKSTAB) {
        damageText += '\n(backstab)';
      } else if (flankStatus === HexFlankStatus.FLANK) {
        damageText += '\n(flanking)';
      }
      this.damageValueDisplay.addDamageValue(damageText, this.uiPlusRenderGroup, defenderPixelCoords, 400);
    }

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
    if (creature.abilities.length > 0) {
      description = creature.abilities[0].name;
    }
    if (this.commonControls.activeAbility1Button) {
      this.commonControls.activeAbility1Button.text = description;
      this.commonControls.activeAbility1Button.visible = false; // Replaced by skill icon buttons in unit stats panel
    }
    if (this.commonControls) {
      const canRest = creature ? (this.unitStats ? this.unitStats.isRestApplicable(creature) : creature.canRest()) : false;
      if (typeof this.commonControls.setRestApplicable === 'function') {
        this.commonControls.setRestApplicable(canRest);
      } else if (this.commonControls.restButton) {
        this.commonControls.restButton.alpha = canRest ? 1.0 : 0.4;
      }
    }
    if (this.unitStats?.isVisible()) {
      this.showStatsForUnit(creature);
    }
    this.updateTargetAcquirementHint();
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
      this.battleMenuPanel.battle = this.battle;
      this.battleMenuPanel.setSoundValues(this.settings.sound.musicVolume, this.settings.sound.soundVolume);
      this.battleMenuPanel.onSaveBattle = (name) => {
        if (events.onSaveBattle) {
          return events.onSaveBattle(name);
        }
        SaveManager.saveBattle(this.battle, name);
        return true;
      };
      this.battleMenuPanel.onLoadSave = (entry) => {
        if (events.onLoadSave) {
          events.onLoadSave(entry);
        } else {
          SaveManager.loadBattle(entry, this.battle);
        }
      };
      this.battleMenuPanel.setHardwareCursorHidden(this.settings.hideHardwareCursor);
      this.battleMenuPanel.hide();
    }
    this.applyHardwareCursorVisibility(this.settings.hideHardwareCursor);

    const dockedButtons = new Set<any>([
      this.commonControls.restButton,
      this.commonControls.nextUnitButton,
      this.commonControls.nextTurnButton,
    ]);
    this.commonControls.getControls().forEach((control) => {
      if (!dockedButtons.has(control)) {
        this.uiRenderGroup.addChild(control);
      }
    });

    this.commonControls.menuButton?.onPress.connect(() => {
      this.battleMenuPanel?.toggleVisibility();
    });

    this.commonControls.zoomInButton?.onPress.connect(() => events.onZoomIn());
    this.commonControls.zoomOutButton?.onPress.connect(() => events.onZoomOut());
    this.commonControls.zoomSlider?.onUpdate.connect((val) => events.onZoomSliderUpdate(val));
    if (events.onAltitudeUp) {
      this.commonControls.altitudeUpButton?.onPress.connect(() => events.onAltitudeUp!());
    }
    if (events.onAltitudeDown) {
      this.commonControls.altitudeDownButton?.onPress.connect(() => events.onAltitudeDown!());
    }

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
    this.commonControls.restButton?.onPress.connect(() => {
      if (this.commonControls.isRestEnabled !== false) {
        events.onRest?.();
      }
    });

    this.battleMenuPanel?.showHealthbarsButton?.onPress.connect(() => {
      this.showHealthbars = !this.showHealthbars;
      this.battle.reselectCurrentUnit();
    });

    this.battleMenuPanel?.toggleDamageIndicatorsButton?.onPress.connect(() => {
      this.settings.hex.showDamageIndicators = !this.settings.hex.showDamageIndicators;
      this.settings.save();
    });

    this.battleMenuPanel?.toggleSceneInspectorButton?.onPress.connect(() => {
      this.settings.debug.showSceneInspector = !this.settings.debug.showSceneInspector;
      this.settings.save();
    });

    this.battleMenuPanel?.toggleStatsButton?.onPress.connect(() => {
      this.toggleUnitStats();
    });

    this.battleMenuPanel?.toggleFpsButton?.onPress.connect(() => {
      this.setFpsVisible(!this.settings.debug.showFps);
      this.settings.save();
    });

    this.battleMenuPanel?.toggleHardwareCursorButton?.onPress.connect(() => {
      this.settings.hideHardwareCursor = !this.settings.hideHardwareCursor;
      this.settings.save();
      this.applyHardwareCursorVisibility(this.settings.hideHardwareCursor);
      this.battleMenuPanel?.setHardwareCursorHidden(this.settings.hideHardwareCursor);
    });

    this.battleMenuPanel?.toggleMusicButton?.onPress.connect(() => {
      this.settings.sound.musicOn = !this.settings.sound.musicOn;
      this.settings.save();
      sound.stop('track_dark_whispers');
      if (this.settings.sound.musicOn) {
        sound.play('track_dark_whispers', { loop: true, volume: this.settings.sound.musicVolume });
      }
    });

    this.battleMenuPanel?.musicVolumeSlider?.onUpdate.connect((val) => {
      this.settings.sound.musicVolume = Math.max(0, Math.min(1, val / 100));
      this.settings.save();
      try {
        sound.volume('track_dark_whispers', this.settings.sound.musicVolume);
      } catch {}
    });

    this.battleMenuPanel?.toggleSoundButton?.onPress.connect(() => {
      this.settings.sound.soundOn = !this.settings.sound.soundOn;
      this.settings.save();
    });

    this.battleMenuPanel?.soundVolumeSlider?.onUpdate.connect((val) => {
      this.settings.sound.soundVolume = Math.max(0, Math.min(1, val / 100));
      this.settings.save();
    });

    this.commonControls.resetButton?.onPress.connect(() => events.onReset());
    this.commonControls.activeAbility1Button?.onPress.connect(() => events.onActiveAbility1());

    if (this.commonControls.zoomSlider) {
      this.commonControls.zoomSlider.value = this.initialZoomLevel * 100;
    }

    if (this.assets.uiSheet) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet, this.battle.traitsConfig, this.battle);
      this.unitStats.bindCommonControls(this.commonControls);
      this.unitStats.onSkillClick = (index: number, _ability?: Ability, creature?: Creature) => {
        this.battle.selectActiveAbilityForCurrentUnit(index, creature);
        const active = this.battle.getActiveCreature();
        if (active) {
          this.showStatsForUnit(active);
        }
        this.updateTargetAcquirementHint();
      };
      this.unitStats.onRestClick = () => {
        if (this.commonControls.isRestEnabled !== false) {
          events.onRest?.();
        }
      };
      this.unitStats.onNextUnitClick = () => events.onNextUnit();
      this.unitStats.onEndTurnClick = () => events.onNextTurn();
      if (this.settings.hex.showStats) {
        this.unitStats.show();
        if (this.battle.activeCreatureIndex >= 0) {
          this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]);
          this.unitStats.setTraitsConfig(this.battle.traitsConfig);
          this.unitStats.update();
        }
      } else {
        this.unitStats.hide();
      }
    }

    dockedButtons.forEach((control) => {
      if (control) {
        this.uiPlusRenderGroup.addChild(control);
      }
    });

    this.resize(this.screenWidth, this.screenHeight);
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
      style: {
        fontFamily: this.settings.debug.fpsFontFamily || 'GustysSerpents',
        fontSize: this.settings.debug.fpsFontSize || 14,
        align: 'left',
      },
    });
    this.fpsText.x = this.settings.debug.fpsPosition?.x ?? 136;
    this.fpsText.y = this.settings.debug.fpsPosition?.y ?? 2;
    this.fpsText.alpha = this.settings.debug.fpsAlpha ?? 0.7;
    this.fpsText.visible = this.settings.debug.showFps;
    this.uiRenderGroup.addChild(this.fpsText);

    this.versionText = new BitmapText({
      text: `Hexes Of Battle v.${this.gameVersion}`,
      style: {
        fontFamily: this.settings.debug.fpsFontFamily || 'GustysSerpents',
        fontSize: this.settings.debug.fpsFontSize || 14,
        align: 'right',
      },
    });
    if (this.versionText.anchor) {
      if (typeof this.versionText.anchor.set === 'function') {
        this.versionText.anchor.set(1, 0);
      } else {
        (this.versionText.anchor as any).x = 1;
        (this.versionText.anchor as any).y = 0;
      }
    }
    this.versionText.x = 1905;
    this.versionText.y = 8;
    this.versionText.alpha = this.settings.debug.fpsAlpha ?? 0.7;
    this.versionText.visible = this.settings.debug.showFps;
    this.versionText.eventMode = 'none';
    this.uiRenderGroup.addChild(this.versionText);

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 } });
    this.instructionsText = new Text({ text: '', style });
    this.instructionsText.position = { x: 1480, y: 5 };
    this.uiRenderGroup.addChild(this.instructionsText);

    this.messagesText = new Text({ text: '', style });
    this.messagesText.x = 10;
    this.messagesText.y = 60;
    this.uiRenderGroup.addChild(this.messagesText);

    this.initializeTargetAcquirementBanner();
  }

  public initializeTargetAcquirementBanner(): void {
    if (this.targetAcquirementBanner) return;

    this.targetAcquirementBanner = new Container();
    this.targetAcquirementBanner.position.set(800, 75);
    this.targetAcquirementBanner.eventMode = 'none';
    this.targetAcquirementBanner.visible = false;

    const bannerWidth = 720;
    const bannerHeight = 40;

    if (this.assets.uiSheet?.textures) {
      this.targetAcquirementBg = new NineSliceSprite({
        texture:
          this.assets.uiSheet.textures['thin_panel_semitransparent.png'] ||
          this.assets.uiSheet.textures['panel.png'] ||
          Texture.EMPTY,
        leftWidth: 8,
        topHeight: 8,
        rightWidth: 8,
        bottomHeight: 8,
      });
      this.targetAcquirementBg.width = bannerWidth;
      this.targetAcquirementBg.height = bannerHeight;
      this.targetAcquirementBg.position.set(-bannerWidth / 2, -bannerHeight / 2);
      this.targetAcquirementBg.tint = 0x162238;
      this.targetAcquirementBanner.addChild(this.targetAcquirementBg);
    }

    this.targetAcquirementText = new Text({
      text: '',
      style: {
        fontFamily: 'GustysSerpents',
        fill: { color: '#ffea75', alpha: 1 },
        fontSize: 16,
        fontWeight: 'bold',
        align: 'center',
      },
    });
    this.targetAcquirementText.anchor.set(0.5, 0.5);
    this.targetAcquirementBanner.addChild(this.targetAcquirementText);

    this.uiPlusRenderGroup.addChild(this.targetAcquirementBanner);
  }

  public updateTargetAcquirementHint(): void {
    if (this.battle.input_state === InputState.SELECT_ABILITY_TARGET && this.battle.abilityToApply) {
      const abilityName = this.battle.abilityToApply.tooltipName || this.battle.abilityToApply.name || 'skill';
      this.showTargetAcquirementHint(abilityName);
    } else {
      this.hideTargetAcquirementHint();
    }
  }

  public showTargetAcquirementHint(skillName: string): void {
    if (this.instructionsText) {
      this.instructionsText.text = `[Targeting ${skillName}: Left-click use, Right-click cancel]`;
    }
    if (!this.targetAcquirementBanner) {
      this.initializeTargetAcquirementBanner();
    }
    if (this.targetAcquirementText) {
      this.targetAcquirementText.text = `Select target for ${skillName}: Left-click on target to use, Right-click to cancel`;
    }
    if (this.targetAcquirementBanner) {
      this.targetAcquirementBanner.visible = true;
    }
  }

  public hideTargetAcquirementHint(): void {
    if (this.instructionsText) {
      this.instructionsText.text = '';
    }
    if (this.targetAcquirementBanner) {
      this.targetAcquirementBanner.visible = false;
    }
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
      const centerPixel = this.hexMap.hexToPixel(creature.position.x, creature.position.y);
      const isFacingRight =
        creature.facingDirection === HexDirection.EAST ||
        creature.facingDirection === HexDirection.SOUTHEAST ||
        creature.facingDirection === HexDirection.NORTHEAST;

      let unitTextureName = 'peasant_fork_right.png';
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
        case CreatureType.HEAVY_KNIGHTS:
          unitTextureName = isFacingRight ? 'swordman_right.png' : 'swordman_left.png';
          break;
        case CreatureType.BEHEMOTH:
          unitTextureName = isFacingRight ? 'barbarian_right.png' : 'barbarian_left.png';
          break;
        case CreatureType.HERO_COMMANDER:
          unitTextureName = isFacingRight ? 'swordman_right.png' : 'swordman_left.png';
          break;
        case CreatureType.SLINGER:
          unitTextureName = isFacingRight ? 'slinger_right.png' : 'slinger_left.png';
          break;
        case CreatureType.HEALER:
          unitTextureName = isFacingRight ? 'peasant_fork_right.png' : 'peasant_fork_left.png';
          break;
      }

      // Direction indicator on hex tile
      if (this.showFacingDirections) {
        const dirTex = this.directionToSpriteName(creature.facingDirection);
        const dirSprite = new Sprite(this.assets.hexagonSheet?.textures[dirTex]);
        dirSprite.position = {
          x: centerPixel.x - this.hexMap.cellSize().x / 2,
          y: centerPixel.y - this.hexMap.cellSize().y / 2,
        };
        dirSprite.alpha = 0.5;
        this.unitSprites.push(dirSprite);
        this.unitRenderSubgroups[creature.position.y]?.addChild(dirSprite);
      }

      // Formation Layout based on squad model count
      const totalModels = creature.maxModels;
      const aliveModels = creature.aliveModelCount;

      let rows = 2;
      let cols = 4;
      let scale = 0.266;
      let stepX = 14;
      let stepY = 12;

      if (totalModels >= 16) {
        rows = 4;
        cols = 4;
        scale = 0.182;
        stepX = 12;
        stepY = 9;
      } else if (totalModels >= 12) {
        rows = 3;
        cols = 4;
        scale = 0.21;
        stepX = 13;
        stepY = 10;
      } else if (totalModels >= 8) {
        rows = 2;
        cols = 4;
        scale = 0.252;
        stepX = 14;
        stepY = 12;
      } else if (totalModels >= 6) {
        rows = 2;
        cols = 3;
        scale = 0.294;
        stepX = 16;
        stepY = 14;
      } else if (totalModels >= 4) {
        rows = 2;
        cols = 2;
        scale = 0.336;
        stepX = 18;
        stepY = 16;
      } else {
        rows = 1;
        cols = 1;
        scale = 0.595;
        stepX = 0;
        stepY = 0;
      }

      // Render each model in the squad formation
      for (let m = 0; m < totalModels; m++) {
        const row = Math.floor(m / cols);
        const col = m % cols;
        const isAlive = m < aliveModels;

        const offsetX = cols > 1 ? (col - (cols - 1) / 2) * stepX : 0;
        const offsetY = rows > 1 ? (row - (rows - 1) / 2) * stepY : 0;

        const modelSprite = new Sprite(this.assets.unitsSheet?.textures[unitTextureName]);
        modelSprite.anchor.set(0.5, 0.5);
        modelSprite.scale.set(scale, scale);
        modelSprite.x = centerPixel.x + offsetX;
        modelSprite.y = centerPixel.y + offsetY - 4;

        if (isAlive) {
          modelSprite.alpha = 1.0;
          if (creature.stats.is_hero && m === 0) {
            modelSprite.tint = 0xffe680; // Hero commander golden highlight
          }
        } else {
          // Fallen casualty model shown dimmed
          modelSprite.alpha = 0.20;
          modelSprite.tint = 0x555555;
        }

        if (index === this.battle.activeCreatureIndex) {
          modelSprite.filters = [new OutlineFilter({ color: 0xd4bf72, thickness: 2 })];
        } else if (index === mapUpdate.hoverEnemyIndex) {
          modelSprite.filters = [new OutlineFilter({ color: 0xd43442, thickness: 2 })];
        } else if (index === mapUpdate.hoverOverUnitIndex) {
          modelSprite.filters = [new OutlineFilter({ color: 0x55cf55, thickness: 2 })];
        }

        this.unitSprites.push(modelSprite);
        this.unitRenderSubgroups[creature.position.y]?.addChild(modelSprite);
      }

      // Dual Bars: Health Bar & Stamina Bar
      if (this.showHealthbars) {
        // Morale Icon (20x20) and Squad Count Label above the bars
        const moraleState = creature.moraleState;
        const moraleTexture = Assets.cache.get(`morale/morale_${moraleState}.png`) || Texture.EMPTY;
        const moraleSprite = new Sprite(moraleTexture);
        const moraleIconSize = 20;
        moraleSprite.width = moraleIconSize;
        moraleSprite.height = moraleIconSize;
        moraleSprite.anchor.set(0.5, 0.5);

        const countText = new Text({
          text: `${aliveModels}/${totalModels}`,
          style: {
            fontFamily: 'sans-serif',
            fontSize: 10,
            fontWeight: 'bold',
            fill: { color: '#ffffff', alpha: 1 },
            stroke: { color: '#000000', width: 2 },
          },
        });
        countText.anchor.set(0, 0.5);

        const badgeWidth = moraleIconSize + 4 + countText.width;
        const badgeStartX = centerPixel.x - badgeWidth / 2;
        moraleSprite.x = badgeStartX + moraleIconSize / 2;
        moraleSprite.y = centerPixel.y + 14;
        countText.x = badgeStartX + moraleIconSize + 4;
        countText.y = centerPixel.y + 14;

        this.unitRenderSubgroups[creature.position.y]?.addChild(moraleSprite);
        this.unitRenderSubgroups[creature.position.y]?.addChild(countText);

        // 1. Health Bar (Top)
        const healthBar = new ProgressBar({
          bg: 'thin_button_normal.png',
          fill: 'progress_fill.png',
          nineSliceSprite: { bg: [4, 4, 4, 4], fill: [3, 3, 3, 3] },
          fillPaddings: { top: 1, right: 1, bottom: 1, left: 1 },
        });
        healthBar.width = 60;
        healthBar.height = 6;
        healthBar.x = centerPixel.x - 30;
        healthBar.y = centerPixel.y + 24;
        healthBar.progress = Math.max(0, (100 * creature.stats.remaining_health) / creature.stats.health);
        this.hexUnitBars.push(healthBar);
        this.unitRenderSubgroups[creature.position.y]?.addChild(healthBar);

        // 2. Stamina Bar (Bottom)
        const staminaBar = new ProgressBar({
          bg: 'thin_button_normal.png',
          fill: 'progress_fill.png',
          nineSliceSprite: { bg: [4, 4, 4, 4], fill: [3, 3, 3, 3] },
          fillPaddings: { top: 1, right: 1, bottom: 1, left: 1 },
        });
        staminaBar.width = 60;
        staminaBar.height = 4;
        staminaBar.x = centerPixel.x - 30;
        staminaBar.y = centerPixel.y + 31;
        staminaBar.progress = Math.max(0, (100 * creature.stats.stamina) / Math.max(1, creature.stats.max_stamina));

        // Color stamina bar according to exhaustion state
        const exhaustion = creature.exhaustionState;
        if (exhaustion === ExhaustionState.FRESH) {
          staminaBar.tint = 0x44dd88;
        } else if (exhaustion === ExhaustionState.WINDED) {
          staminaBar.tint = 0xddcc33;
        } else if (exhaustion === ExhaustionState.EXHAUSTED) {
          staminaBar.tint = 0xee7722;
        } else {
          staminaBar.tint = 0xcc2222;
        }

        this.hexUnitBars.push(staminaBar);
        this.unitRenderSubgroups[creature.position.y]?.addChild(staminaBar);
      }
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
      this.hexReachableSprites.forEach((sprite) => this.hexCellsContainer.removeChild(sprite));
      this.hexReachableSprites = [];

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

      if (this.battle.input_state === InputState.SELECT_ABILITY_TARGET) {
        if (this.battle.activeCreatureIndex !== -1) {
          this.showStatsForUnit(this.battle.creatures[this.battle.activeCreatureIndex]);
        }
      } else if (mapUpdate.hoverEnemyIndex !== -1) {
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
          sprite.y = this.hexMap.hexToPixel(cell.x, cell.y).y - this.hexMap.cellSize().y / 2;
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
    if (!this.unitStats || !creature) return;
    if (this.battle.input_state === InputState.SELECT_ABILITY_TARGET && creature.armyAlignment !== this.battle.currentArmyIndex) {
      return;
    }

    const bannerName = this.getBannerTextureNameForArmyIndex(creature.armyAlignment);
    const bannerTexture = this.assets.bannersSheet?.textures[bannerName];
    this.unitStats.setBannerTexture(bannerTexture);
    this.unitStats.setCreature(creature);
    this.unitStats.setTraitsConfig(this.battle.traitsConfig);

    let faceName = 'peasant_face.png';
    switch (creature.creatureType) {
      case CreatureType.PEASANT:
      case 'peasant' as any:
        faceName = 'peasant_face.png';
        break;
      case CreatureType.PEASANT_ARCHER:
      case 'peasant_archer' as any:
        faceName = 'peasant_archer_face.png';
        break;
      case CreatureType.SWORDSMAN:
      case 'swordsman' as any:
      case 'swordman' as any:
        faceName = 'swordman_face.png';
        break;
      case CreatureType.SPEARMAN:
      case 'spearman' as any:
        faceName = 'spearman_face.png';
        break;
      case CreatureType.CROSSBOWMAN:
      case 'crossbowman' as any:
        faceName = 'crossbowman_face.png';
        break;
      case CreatureType.ARCHER:
      case 'archer' as any:
        faceName = 'peasant_archer_face.png';
        break;
      case CreatureType.BARBARIAN:
      case 'barbarian' as any:
        faceName = 'barbarian_face.png';
        break;
      case CreatureType.HEAVY_KNIGHTS:
      case 'heavy_knights' as any:
      case CreatureType.HERO_COMMANDER:
      case 'hero_commander' as any:
        faceName = 'swordman_face.png';
        break;
      case CreatureType.BEHEMOTH:
      case 'behemoth' as any:
        faceName = 'barbarian_face.png';
        break;
      case CreatureType.SLINGER:
      case 'slinger' as any:
        faceName = 'slinger_face.png';
        break;
      case CreatureType.HEALER:
      case 'healer' as any:
        faceName = 'peasant_face.png';
        break;
      default:
        faceName = 'peasant_face.png';
        break;
    }

    const faceTexture = this.assets.unitsSheet?.textures[faceName];
    this.unitStats.setFaceTexture(faceTexture);
    this.unitStats.update();

    if (this.commonControls) {
      this.commonControls.setRestApplicable(this.unitStats.isRestApplicable(creature));
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

  public toggleUnitStats(): void {
    if (!this.assets.uiSheet) return;
    if (!this.unitStats) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet, this.battle.traitsConfig, this.battle);
      this.unitStats.onSkillClick = (index: number, _ability?: Ability, creature?: Creature) => {
        this.battle.selectActiveAbilityForCurrentUnit(index, creature);
        const active = this.battle.getActiveCreature();
        if (active) {
          this.showStatsForUnit(active);
        }
        this.updateTargetAcquirementHint();
      };
      if (this.commonControls) {
        this.unitStats.bindCommonControls(this.commonControls);
      }
      this.unitStats.layoutForScreenSize(this.screenWidth, this.screenHeight);
    }
    this.unitStats.toggleVisibility();
    this.settings.hex.showStats = this.unitStats.isVisible();
    this.settings.save();
    if (this.unitStats && this.battle.activeCreatureIndex >= 0) {
      this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]);
      this.unitStats.setTraitsConfig(this.battle.traitsConfig);
      this.unitStats.update();
    }
  }

  public resize(width: number, height: number): void {
    if (width > 0 && height > 0) {
      this.screenWidth = width;
      this.screenHeight = height;
    }
    if (this.unitStats) {
      this.unitStats.layoutForScreenSize(this.screenWidth, this.screenHeight);
    } else if (this.commonControls && typeof this.commonControls.setPanelOrigin === 'function') {
      const minScale = Math.min(this.screenWidth / 1920, this.screenHeight / 1080) || 1;
      const stageW = this.screenWidth / minScale;
      const stageH = this.screenHeight / minScale;
      this.commonControls.setPanelOrigin(Math.round((stageW - 1840) / 2), Math.round(stageH - 140 - 4));
    }
  }

  public triggerSkill(index: number): boolean {
    if (this.battleMenuPanel?.isVisible()) return false;
    if (this.battle.hasRunningActions()) return false;
    if (this.battle.isCurrentTurnAI()) return false;

    const active = this.battle.getActiveCreature();
    if (!active || !active.isAlive) return false;

    if (this.unitStats) {
      if (this.unitStats.getCurrentCreature() !== active) {
        this.showStatsForUnit(active);
      }
      const handled = this.unitStats.triggerSkill(index);
      if (handled) {
        this.updateTargetAcquirementHint();
      }
      return handled;
    } else {
      if (index >= active.abilities.length) return false;
      const ability = active.abilities[index];
      if (!this.battle.verifyAbilityUseByCreatureHasResources(ability, active)) return false;
      this.battle.selectActiveAbilityForCurrentUnit(index, active);
      this.updateTargetAcquirementHint();
      return true;
    }
  }

  public setFpsVisible(visible: boolean): void {
    this.settings.debug.showFps = visible;
    if (this.fpsText) {
      this.fpsText.visible = visible;
    }
    if (this.versionText) {
      this.versionText.visible = visible;
    }
  }

  public isFpsVisible(): boolean {
    return this.fpsText?.visible ?? this.settings.debug.showFps;
  }

  public destroy(): void {
    this.container.removeChildren();
  }
}
