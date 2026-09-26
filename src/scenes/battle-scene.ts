import { Container } from "pixi.js";
import { sound } from "@pixi/sound";
import { GameContext, Scene } from "../core/scene";
import { HexDirection, HexMap } from "../shared/hex-map";
import { Coords } from "../shared";
import { Battle } from "../battle";
import { CreatureType } from "../battle/creature";
import { DumbAI } from "../battle/dumb-ai";
import { CreatureRepository } from "../battle/creature-repository";
import { BattleView } from "../battle/battle-view";
import { BattleInputController } from "../battle/battle-input-controller";
import { BattleConfig } from "../battle/battle-types";

export class BattleScene implements Scene {
  public readonly name = "battle";
  public readonly container: Container = new Container();

  private context!: GameContext;

  private hexMap: HexMap = new HexMap(13, 9);
  private battle!: Battle;
  private dumbAI!: DumbAI;
  private view!: BattleView;
  private inputController!: BattleInputController;

  private ZOOM_LEVEL_MIN = 0.75;
  private ZOOM_LEVEL_MAX = 2.0;
  private ZOOM_STEP = 0.05;
  private navZoomLevel: number = 1.4;
  private navMapOffset: Coords = { x: 0, y: -100 };
  private MAP_OFFSET_MIN: Coords = { x: -400, y: -400 };
  private MAP_OFFSET_MAX: Coords = { x: 1200, y: 800 };

  private creatureRepository: CreatureRepository = new CreatureRepository();

  public async enter(context: GameContext, params?: { config?: BattleConfig }): Promise<void> {
    this.context = context;

    this.creatureRepository.setAbilities(context.templates.abilityTypes);
    this.creatureRepository.setCreatureTemplates(context.templates.creatureTemplates);

    if (params?.config) {
      this.hexMap = new HexMap(params.config.mapWidth, params.config.mapHeight);
      this.battle = new Battle(this.hexMap);
      this.battle.initializeFromConfig(params.config);
    } else {
      this.hexMap = new HexMap(13, 9);
      this.battle = new Battle(this.hexMap);
      this.initializeDefaultMapAndArmies();
    }

    this.dumbAI = new DumbAI(this.battle);
    this.hexMap.setOffset(150, 135);

    this.view = new BattleView(
      context.assets,
      context.settings,
      this.hexMap,
      this.battle,
      this.navZoomLevel
    );
    this.container.addChild(this.view.container);

    this.view.initialize({
      onZoomIn: () => this.modifyZoomLevel(this.ZOOM_STEP),
      onZoomOut: () => this.modifyZoomLevel(-1 * this.ZOOM_STEP),
      onZoomSliderUpdate: (value) => this.setZoomLevel(value / 100),
      onNextTurn: () => this.battle.nextTurn(),
      onNextUnit: () => this.battle.selectNextUnitAndGetIndex(),
      onReset: () => this.resetBattle(),
      onActiveAbility1: () => this.battle.selectActiveAbilityForCurrentUnit(0),
    });

    this.hookBattleEvents();

    this.inputController = new BattleInputController(this.battle, this.hexMap, {
      isMenuBlockingInput: () => this.view.battleMenuPanel?.isVisible() ?? false,
      onCursorMove: (renderContainerCoords) => this.view.updateCursorPosition(renderContainerCoords),
      onClearHover: () => this.view.clearHover(),
      onPanOffsetBy: (delta) => this.setNavMapOffset({
        x: this.navMapOffset.x + delta.x,
        y: this.navMapOffset.y + delta.y,
      }),
      onZoomBy: (delta, zoomRatio) => this.modifyZoomLevel(delta, zoomRatio),
      getNavMapOffset: () => this.navMapOffset,
      getZoomLevel: () => this.navZoomLevel,
      getStageOffsetAndScale: () => ({
        offset: this.context.stage.position,
        scale: this.context.stage.scale,
      }),
      getScreenSize: () => ({
        width: this.context.app.screen.width,
        height: this.context.app.screen.height,
      }),
    });
    this.inputController.attach();

    this.setNavMapOffset(this.navMapOffset);
    this.startBattle();
  }

  public update(deltaMS: number): void {
    this.view.update(deltaMS, this.context.app.ticker.FPS);
    this.dumbAI.update(deltaMS);
  }

  public resize(_width: number, _height: number): void {
    this.view.setZoomLevel(this.navZoomLevel);
  }

  public exit(): void {
    this.inputController.detach();
    sound.stop("track_dark_whispers");
    this.view.destroy();
    this.container.removeChildren();
  }

  private startBattle(): void {
    this.battle.start();
    this.view.showTurnBanner(0, 0);

    if (this.context.settings.sound.musicOn) {
      sound.play("track_dark_whispers", { loop: true, volume: this.context.settings.sound.musicVolume });
    }
  }

  private resetBattle(): void {
    this.initializeDefaultMapAndArmies();
    this.dumbAI = new DumbAI(this.battle);
    this.view.resetGridAndTerrain();
    this.startBattle();
  }

  public modifyZoomLevel(delta: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    this.setZoomLevel(this.navZoomLevel + delta, zoomOffset);
  }

  public setZoomLevel(newZoomLevel: number, zoomOffset: Coords = { x: 0.5, y: 0.5 }): void {
    const hexZone = this.view.getHexZoneContainer();
    const oldHexContainerSize = { x: hexZone.width, y: hexZone.height };
    this.navZoomLevel = Math.max(this.ZOOM_LEVEL_MIN, Math.min(this.ZOOM_LEVEL_MAX, newZoomLevel));

    this.view.setZoomLevel(this.navZoomLevel);

    this.setNavMapOffset({
      x: this.navMapOffset.x + (oldHexContainerSize.x - hexZone.width) * zoomOffset.x,
      y: this.navMapOffset.y + (oldHexContainerSize.y - hexZone.height) * zoomOffset.y,
    });
  }

  public setNavMapOffset(offset: Coords): void {
    this.navMapOffset.y = Math.max(this.MAP_OFFSET_MIN.y, Math.min(this.MAP_OFFSET_MAX.y, offset.y));
    this.navMapOffset.x = Math.max(this.MAP_OFFSET_MIN.x, Math.min(this.MAP_OFFSET_MAX.x, offset.x));
    this.view.setNavMapOffset(this.navMapOffset);
  }

  private hookBattleEvents(): void {
    this.battle.hookDoingAttack = (attacker, defender, damage, attackType, flankStatus) => {
      this.view.showAttackVisuals(attacker, defender, damage, attackType, flankStatus);
    };

    this.battle.hookNextTurn = (turnNum, armyIdx) => {
      this.view.showTurnBanner(turnNum, armyIdx);
      if (!this.battle.isCurrentTurnAI()) {
        this.battle.selectNextUnitAndGetIndex();
      }
    };

    this.battle.hookMovingUnit = (_creature, _nextStep) => {
      sound.play("move", { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
    };

    this.battle.hookUnitDied = (_creature) => {
      sound.play("die", { speed: 0.9 + Math.random() * 0.2, volume: this.context.settings.sound.soundVolume });
    };

    this.battle.hookBattleFinished = (victor) => {
      this.view.showVictoryBanner(victor);
      const result = this.battle.getBattleResult();
      this.context.eventBus.emit("battle:finished", result ?? { victorArmyIndex: victor });
    };

    this.battle.hookRecommendEndTurn = (_armyIndex) => {
      this.view.showEndTurnRecommendation();
    };

    this.battle.hookActiveUnitChanged = (creature) => {
      this.view.updateActiveUnitAbility(creature);
    };
  }

  private initializeDefaultMapAndArmies(): void {
    this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);

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
  }
}
