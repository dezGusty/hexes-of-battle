import { BitmapText, Container, Sprite, Texture } from "pixi.js";
import { sound } from "@pixi/sound";
import { AdvancedBloomFilter } from "pixi-filters";
import { GameAssets } from "../core/scene";
import { BattleSettings } from "../battle/settings";
import { Battle, ArmyControlType } from "../battle";
import { CPUPlayer } from "../battle/cpu-player";
import { Creature, CreatureType } from "../battle/creature";
import { Coords } from "../shared";
import { CommonControls } from "../ui/common-controls";
import { TopSidePanel } from "../ui/top-side-panel";
import { BattleMenuPanel } from "../ui/battle-menu";
import { UnitStatsPanel } from "../ui/unit-stats-panel";
import { EnemyStatsPanel } from "../ui/enemy-stats-panel";
import { TurnChangeCollection } from "../ui/turn-change-display";

import { BattleSaveEntry, SaveManager } from "../battle/save-manager";

export interface BattleHud2DEvents {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSliderUpdate: (value: number) => void;
  onAltitudeUp?: () => void;
  onAltitudeDown?: () => void;
  onNextTurn: () => void;
  onNextUnit: () => void;
  onReset: () => void;
  onRest: () => void;
  onActiveAbility1?: () => void;
  onToggleStats?: () => void;
  onToggleFps?: (showFps: boolean) => void;
  onToggleGrid?: (showGrid: boolean) => void;
  onToggleCoords?: (showCoords: boolean) => void;
  onToggleMusic?: (musicOn: boolean) => void;
  onToggleSceneInspector?: (showInspector: boolean) => void;
  onToggleHardwareCursor?: (hide: boolean) => void;
  onSaveBattle?: (name: string) => boolean;
  onLoadSave?: (entry: BattleSaveEntry) => void;
}

/**
 * 2D PixiJS UI overlay for the 3D Battle Arena.
 * Contains TopSidePanel, CommonControls (Rest, End Turn, Next Unit, Zoom, Menu),
 * UnitStatsPanel, EnemyStatsPanel, BattleMenuPanel, and TurnChangeDisplay banners.
 */
export class BattleHud2D {
  public readonly container: Container = new Container();

  public readonly uiRenderGroup: Container = new Container();
  public readonly uiPlusRenderGroup: Container = new Container();
  public readonly uiCursorRenderGroup: Container = new Container();

  public commonControls!: CommonControls;
  public topSidePanel?: TopSidePanel;
  public battleMenuPanel?: BattleMenuPanel;
  public unitStats?: UnitStatsPanel;
  public enemyStats?: EnemyStatsPanel;
  public fpsText?: BitmapText;
  public turnChangeDisplay: TurnChangeCollection = new TurnChangeCollection();
  public softCursorSprite?: Sprite;

  private assets: GameAssets;
  public readonly settings: BattleSettings;
  private battle: Battle;
  private cpuPlayer?: CPUPlayer;
  private armyNames: [string, string] = [
    "The Count of Ekkina's 1st Army",
    "Knights of The Grand Duke"
  ];

  constructor(
    assets: GameAssets,
    settings: BattleSettings,
    battle: Battle,
    cpuPlayer?: CPUPlayer,
    armyNames?: [string, string]
  ) {
    this.assets = assets;
    this.settings = settings;
    this.battle = battle;
    this.cpuPlayer = cpuPlayer;
    if (armyNames) {
      this.armyNames = armyNames;
    }

    this.container.addChild(this.uiRenderGroup);
    this.container.addChild(this.uiPlusRenderGroup);
    this.container.addChild(this.uiCursorRenderGroup);

    this.initializeFpsIndicator();
  }

  public initialize(events: BattleHud2DEvents): void {
    if (this.assets.uiSheet) {
      this.turnChangeDisplay.setUISheet(this.assets.uiSheet);
      if (this.assets.softCursorTextures['default']) {
        this.softCursorSprite = new Sprite(this.assets.softCursorTextures['default']);
        this.uiCursorRenderGroup.addChild(this.softCursorSprite);
      }
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet, this.battle.traitsConfig, this.battle);
      this.unitStats.onSkillClick = (index: number) => {
        this.battle.selectActiveAbilityForCurrentUnit(index);
        const active = this.battle.getActiveCreature();
        if (active) {
          this.updateUnitStats(active);
        }
      };
      if (this.settings.hex.showStats) {
        this.unitStats.show();
      } else {
        this.unitStats.hide();
      }
      this.enemyStats = new EnemyStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet, this.battle.traitsConfig);
      this.enemyStats.hide();
    }

    this.initializeCommonControls(events);
    this.initializeTopPanel();
    this.updateArmyNames();
  }

  public setCpuPlayer(cpuPlayer: CPUPlayer | undefined): void {
    this.cpuPlayer = cpuPlayer;
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
      return `${baseName} - ${tag}`;
    } else {
      return `${tag} - ${baseName}`;
    }
  }

  public updateArmyNames(): void {
    if (!this.topSidePanel) return;
    this.topSidePanel.setLeftArmyName(this.getFormattedArmyName(0));
    this.topSidePanel.setRightArmyName(this.getFormattedArmyName(1));
  }

  private initializeCommonControls(events: BattleHud2DEvents): void {
    this.commonControls = new CommonControls({
      zoomMin: 75,
      zoomMax: 200,
      zoomStep: 5,
      zoomValue: 100,
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

    this.commonControls.getControls().forEach((control) => {
      this.uiRenderGroup.addChild(control);
    });

    this.commonControls.menuButton?.onPress.connect(() => {
      this.battleMenuPanel?.toggleVisibility();
    });

    this.battleMenuPanel?.toggleGridButton?.onPress.connect(() => {
      this.settings.hex.showGrid = !this.settings.hex.showGrid;
      this.settings.save();
      if (events.onToggleGrid) {
        events.onToggleGrid(this.settings.hex.showGrid);
      }
    });

    this.battleMenuPanel?.toggleCoordsButton?.onPress.connect(() => {
      this.settings.debug.showCoords = !this.settings.debug.showCoords;
      this.settings.save();
      if (events.onToggleCoords) {
        events.onToggleCoords(this.settings.debug.showCoords);
      }
    });

    this.battleMenuPanel?.showHealthbarsButton?.onPress.connect(() => {
      this.settings.hex.showHealthbars = !this.settings.hex.showHealthbars;
      this.settings.save();
    });

    this.battleMenuPanel?.toggleMusicButton?.onPress.connect(() => {
      this.settings.sound.musicOn = !this.settings.sound.musicOn;
      this.settings.save();
      sound.stop('track_dark_whispers');
      if (this.settings.sound.musicOn) {
        sound.play('track_dark_whispers', { loop: true, volume: this.settings.sound.musicVolume });
      }
      if (events.onToggleMusic) {
        events.onToggleMusic(this.settings.sound.musicOn);
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

    this.battleMenuPanel?.toggleSceneInspectorButton?.onPress.connect(() => {
      this.settings.debug.showSceneInspector = !this.settings.debug.showSceneInspector;
      this.settings.save();
      if (events.onToggleSceneInspector) {
        events.onToggleSceneInspector(this.settings.debug.showSceneInspector);
      }
    });

    this.battleMenuPanel?.toggleStatsButton?.onPress.connect(() => {
      this.toggleUnitStats();
      if (events.onToggleStats) {
        events.onToggleStats();
      }
    });

    this.battleMenuPanel?.toggleFpsButton?.onPress.connect(() => {
      this.setFpsVisible(!this.settings.debug.showFps);
      this.settings.save();
      if (events.onToggleFps) {
        events.onToggleFps(this.settings.debug.showFps);
      }
    });

    this.battleMenuPanel?.toggleHardwareCursorButton?.onPress.connect(() => {
      this.settings.hideHardwareCursor = !this.settings.hideHardwareCursor;
      this.settings.save();
      this.battleMenuPanel?.setHardwareCursorHidden(this.settings.hideHardwareCursor);
      if (events.onToggleHardwareCursor) {
        events.onToggleHardwareCursor(this.settings.hideHardwareCursor);
      }
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

    this.commonControls.nextTurnButton?.onPress.connect(() => events.onNextTurn());
    this.commonControls.nextUnitButton?.onPress.connect(() => events.onNextUnit());
    this.commonControls.restButton?.onPress.connect(() => events.onRest());
    this.commonControls.resetButton?.onPress.connect(() => events.onReset());

    if (events.onActiveAbility1) {
      this.commonControls.activeAbility1Button?.onPress.connect(() => events.onActiveAbility1!());
    }
  }

  private initializeFpsIndicator(): void {
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
  }

  private initializeTopPanel(): void {
    if (!this.assets.uiSheet) return;

    this.topSidePanel = new TopSidePanel(this.uiRenderGroup, this.assets.uiSheet);

    const bannerLeftTexture = this.getBannerTextureForArmyIndex(0);
    const bannerRightTexture = this.getBannerTextureForArmyIndex(1);
    this.topSidePanel.setLeftBannerTexture(bannerLeftTexture);
    this.topSidePanel.setRightBannerTexture(bannerRightTexture);

    this.topSidePanel.setLeftArmyName(this.getFormattedArmyName(0));
    this.topSidePanel.setRightArmyName(this.getFormattedArmyName(1));
    this.topSidePanel.setActiveArmyIndex(0);
  }

  public getBannerTextureForArmyIndex(armyIndex: number): Texture | undefined {
    if (!this.assets.bannersSheet) return undefined;
    const name = `banner${(armyIndex % 16) + 1}.png`;
    return this.assets.bannersSheet.textures[name] || this.assets.bannersSheet.textures['banner1.png'];
  }

  public showTurnBanner(turnNum: number, armyIdx: number): void {
    const isPlayer = this.battle.army_control[armyIdx] === ArmyControlType.PLAYER;
    const baseName = this.armyNames[armyIdx] ?? (armyIdx === 0 ? "Player 1" : "Player 2");
    const bannerText = `Turn ${turnNum + 1}\n${baseName} (${isPlayer ? 'Human' : 'CPU'})`;
    const texture = this.getBannerTextureForArmyIndex(armyIdx);

    this.turnChangeDisplay.addTurnChange(bannerText, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);

    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(armyIdx);
    }
    if (this.commonControls?.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [];
    }
  }

  public showVictoryBanner(victorArmyIndex: number): void {
    const message = `Victory for Army ${victorArmyIndex + 1}`;
    const texture = this.getBannerTextureForArmyIndex(victorArmyIndex);
    this.turnChangeDisplay.addEndOfBattle(message, this.uiPlusRenderGroup, { x: 500, y: 350 }, texture);

    if (this.topSidePanel) {
      this.topSidePanel.setActiveArmyIndex(victorArmyIndex);
    }
  }

  public showEndTurnRecommendation(): void {
    if (this.commonControls?.nextTurnButton) {
      this.commonControls.nextTurnButton.filters = [
        new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1, brightness: 1, blur: 5, quality: 3 }),
      ];
    }
  }

  public updateActiveUnitAbility(creature?: Creature): void {
    let description = '';
    let canUse = true;

    if (creature && creature.abilities.length > 0) {
      const ability = creature.abilities[0];
      description = ability.tooltipName || ability.name;
      if (creature.isQuickDrawActive) {
        description = `${description} [ON]`;
      }
      if (this.battle) {
        canUse = this.battle.verifyAbilityUseByCreatureHasResources(ability, creature);
      }
    }

    if (this.commonControls?.activeAbility1Button) {
      this.commonControls.activeAbility1Button.text = description;
      this.commonControls.activeAbility1Button.visible = false; // Replaced by skill icon buttons on top of unit stats panel
      this.commonControls.activeAbility1Button.alpha = canUse ? 1.0 : 0.4;
    }

    if (this.commonControls?.restButton) {
      const canRest = creature ? creature.canRest() : false;
      this.commonControls.restButton.alpha = canRest ? 1.0 : 0.4;
    }

    if (creature && this.unitStats?.isVisible()) {
      this.unitStats.setCreature(creature);
      this.unitStats.update();
    }
  }

  public getFaceTextureForCreature(creature: Creature): Texture | undefined {
    if (!this.assets.unitsSheet) return undefined;
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
      default:
        faceName = 'peasant_face.png';
        break;
    }
    return this.assets.unitsSheet.textures[faceName];
  }

  public updateUnitStats(creature?: Creature): void {
    if (!this.unitStats || !creature) return;
    const bannerTexture = this.getBannerTextureForArmyIndex(creature.armyAlignment);
    this.unitStats.setBannerTexture(bannerTexture);
    this.unitStats.setCreature(creature);
    this.unitStats.setTraitsConfig(this.battle.traitsConfig);

    const faceTexture = this.getFaceTextureForCreature(creature);
    this.unitStats.setFaceTexture(faceTexture);
    this.unitStats.update();
  }

  public toggleUnitStats(): void {
    if (!this.assets.uiSheet) return;
    if (!this.unitStats) {
      this.unitStats = new UnitStatsPanel(this.uiPlusRenderGroup, this.assets.uiSheet, this.battle.traitsConfig, this.battle);
      this.unitStats.onSkillClick = (index: number) => {
        this.battle.selectActiveAbilityForCurrentUnit(index);
        const active = this.battle.getActiveCreature();
        if (active) {
          this.updateUnitStats(active);
        }
      };
    }
    this.unitStats.toggleVisibility();
    this.settings.hex.showStats = this.unitStats.isVisible();
    this.settings.save();
    const active = this.battle.getActiveCreature();
    if (active) {
      this.updateUnitStats(active);
    }
  }

  public showEnemyStats(creature: Creature): void {
    if (!this.enemyStats || !creature) return;
    const bannerTexture = this.getBannerTextureForArmyIndex(creature.armyAlignment);
    this.enemyStats.setBannerTexture(bannerTexture);
    this.enemyStats.setCreature(creature);
    this.enemyStats.setTraitsConfig(this.battle.traitsConfig);

    const faceTexture = this.getFaceTextureForCreature(creature);
    this.enemyStats.setFaceTexture(faceTexture);
    this.enemyStats.update();
    this.enemyStats.show();
  }

  public hideEnemyStats(): void {
    this.enemyStats?.hide();
  }

  public updateCursorPosition(coords: Coords): void {
    if (this.softCursorSprite) {
      this.softCursorSprite.position.set(coords.x, coords.y);
    }
    if (this.unitStats?.isVisible()) {
      this.unitStats.mousemove(coords);
    }
    if (this.enemyStats?.isVisible()) {
      this.enemyStats.mousemove(coords);
    }
  }

  public setHardwareCursorHidden(hidden: boolean): void {
    this.battleMenuPanel?.setHardwareCursorHidden(hidden);
  }

  public setCursor(cursorHint?: string): void {
    if (!this.softCursorSprite) return;
    const hint = cursorHint || 'default';
    const tex = this.assets.softCursorTextures[hint] || this.assets.softCursorTextures['default'];
    if (tex && this.softCursorSprite.texture !== tex) {
      this.softCursorSprite.texture = tex;
    }
  }

  public isPointerOverUI(stageX: number, stageY: number): boolean {
    if (this.isMenuBlockingInput()) return true;

    // Enemy stats panel
    if (this.enemyStats?.isVisible() && this.enemyStats.containsPoint(stageX, stageY)) {
      return true;
    }

    // Unit stats panel (including skill icon buttons on top)
    if (this.unitStats?.isVisible() && this.unitStats.containsPoint(stageX, stageY)) {
      return true;
    }

    // Left sidebar controls (Menu at top, toggle buttons, Rest, Next Unit, End Turn)
    if (stageX >= 0 && stageX <= 165) {
      if ((stageY >= 0 && stageY <= 65) || (stageY >= 295 && stageY <= 890)) {
        return true;
      }
    }

    // Top banner header
    if (stageY >= 0 && stageY <= 65) {
      return true;
    }

    // Zoom and altitude controls on top right
    if (stageX >= 1370 && stageX <= 1665 && stageY >= 15 && stageY <= 65) {
      return true;
    }

    // Active ability button
    if (this.commonControls?.activeAbility1Button?.visible) {
      if (stageX >= 800 && stageX <= 970 && stageY >= 790 && stageY <= 870) {
        return true;
      }
    }

    return false;
  }

  public handleClick(stageX: number, stageY: number): boolean {
    if (this.unitStats?.isVisible() && this.unitStats.containsPoint(stageX, stageY)) {
      return this.unitStats.click({ x: stageX, y: stageY });
    }
    return false;
  }

  public update(deltaMS: number, fps?: number): void {
    this.turnChangeDisplay.update(deltaMS);
    if (this.fpsText && fps !== undefined) {
      this.fpsText.text = `FPS: ${Math.round(fps)}`;
      this.fpsText.visible = this.settings.debug.showFps;
    }
  }

  public setFpsVisible(visible: boolean): void {
    this.settings.debug.showFps = visible;
    if (this.fpsText) {
      this.fpsText.visible = visible;
    }
  }

  public isFpsVisible(): boolean {
    return this.fpsText?.visible ?? this.settings.debug.showFps;
  }

  public isMenuBlockingInput(): boolean {
    return this.battleMenuPanel?.isVisible() ?? false;
  }

  public destroy(): void {
    this.battleMenuPanel?.destroy();
    this.container.removeChildren();
  }
}
