import { Container } from "pixi.js";
import { GameContext, Scene } from "../core/scene";
import { HexDirection, HexMap } from "../shared/hex-map";
import { ISoundSystem, PixiSoundSystem, SoundCategory, SoundType } from "../battle/sound-system";
import { Coords } from "../shared";
import { Battle } from "../battle";
import { CreatureType } from "../battle/creature";
import { CPUPersonalityType, CPUPlayer } from "../battle/cpu-player";
import { CPUPlayerFactory } from "../battle/cpu-player-factory";
import { CreatureRepository } from "../battle/creature-repository";
import { BattleView } from "../battle/battle-view";
import { BattleInputController } from "../battle/battle-input-controller";
import { BattleConfig } from "../battle/battle-types";
import { SaveManager } from "../battle/save-manager";

export class BattleScene implements Scene {
  public readonly name = "battle";
  public readonly container: Container = new Container();

  private context!: GameContext;

  private hexMap: HexMap = new HexMap(13, 9);
  private battle!: Battle;
  private cpuPlayer!: CPUPlayer;
  private view!: BattleView;
  private inputController!: BattleInputController;
  private currentConfig?: BattleConfig;
  private soundSystem!: ISoundSystem;

  private creatureRepository: CreatureRepository = new CreatureRepository();

  public async enter(context: GameContext, params?: { config?: BattleConfig; soundSystem?: ISoundSystem }): Promise<void> {
    this.context = context;
    this.currentConfig = params?.config;
    this.soundSystem = params?.soundSystem ?? context.soundSystem ?? new PixiSoundSystem(context.settings);

    console.log("Entering BattleScene with params:", params);

    this.creatureRepository.setAbilities(context.templates.abilityTypes);
    this.creatureRepository.setCreatureTemplates(context.templates.creatureTemplates);

    if (params?.config) {
      this.hexMap = new HexMap(params.config.mapWidth, params.config.mapHeight);
      this.battle = new Battle(this.hexMap);
      if (context.templates.combatConfig) {
        this.battle.setCombatConfig(context.templates.combatConfig);
      }
      this.battle.initializeFromConfig(params.config);
    } else {
      this.hexMap = new HexMap(13, 9);
      this.battle = new Battle(this.hexMap);
      if (context.templates.combatConfig) {
        this.battle.setCombatConfig(context.templates.combatConfig);
      }
      this.initializeDefaultMapAndArmies();
    }

    // temporary - remove when shipping
    let overrideDefaultPersonality: string = CPUPersonalityType.AGGRESSIVE;
    if (null != params?.config?.aiPersonality) {
      overrideDefaultPersonality = params.config.aiPersonality;
    }

    this.cpuPlayer = CPUPlayerFactory.create(overrideDefaultPersonality, this.battle);
    this.hexMap.setOffset(150, 135);

    this.view = new BattleView(
      context.assets,
      context.settings,
      this.hexMap,
      this.battle,
      1.4,
      this.cpuPlayer,
      params?.config?.armyNames
    );
    this.container.addChild(this.view.container);

    this.view.initialize({
      onZoomIn: () => this.view.zoomBy(this.view.camera.zoomStep),
      onZoomOut: () => this.view.zoomBy(-this.view.camera.zoomStep),
      onZoomSliderUpdate: (value) => this.view.setZoomLevel(value / 100),
      onNextTurn: () => this.battle.nextTurn(),
      onNextUnit: () => this.battle.selectNextUnitAndGetIndex(),
      onReset: () => this.resetBattle(),
      onActiveAbility1: () => this.battle.selectActiveAbilityForCurrentUnit(0),
      onRest: () => this.battle.restActiveCreature(),
      onSaveBattle: (name) => {
        SaveManager.saveBattle(this.battle, name);
        return true;
      },
      onLoadSave: (entry) => {
        const ok = SaveManager.loadBattle(entry, this.battle, this.context.templates.abilityTypes);
        if (ok) {
          this.cpuPlayer = CPUPlayerFactory.create(this.currentConfig?.aiPersonality, this.battle);
          this.view.setCpuPlayer(this.cpuPlayer);
          this.view.resetGridAndTerrain();
          this.view.showTurnBanner(this.battle.turnNumber, this.battle.currentArmyIndex);
          const active = this.battle.getActiveCreature();
          if (active) {
            this.view.updateActiveUnitAbility(active);
            this.view.showStatsForUnit(active);
          }
        }
      },
    });

    this.hookBattleEvents();

    this.inputController = new BattleInputController(this.battle, this.hexMap, {
      isMenuBlockingInput: () => this.view.battleMenuPanel?.isVisible() ?? false,
      onCursorMove: (stageCoords) => this.view.updateCursorPosition(stageCoords),
      onClearHover: () => this.view.clearHover(),
      getCamera: () => this.view.camera,
      getStageOffsetAndScale: () => ({
        offset: this.context.stage.position,
        scale: this.context.stage.scale,
      }),
      getScreenSize: () => ({
        width: this.context.app.screen.width,
        height: this.context.app.screen.height,
      }),
      onToggleStats: () => this.view.toggleUnitStats(),
      onToggleHardwareCursor: () => this.view.toggleHardwareCursor(),
    });
    this.inputController.attach();

    this.startBattle();
  }

  public update(deltaMS: number): void {
    this.view.update(deltaMS, this.context.app.ticker.FPS);
    this.cpuPlayer.update(deltaMS);
  }

  public resize(_width: number, _height: number): void {
    this.view.camera.applyTransform();
  }

  public exit(): void {
    this.inputController.detach();
    this.soundSystem.stop(SoundCategory.MUSIC);
    this.view.destroy();
    this.container.removeChildren();
  }

  public getSoundSystem(): ISoundSystem {
    return this.soundSystem;
  }

  public setSoundSystem(soundSystem: ISoundSystem): void {
    this.soundSystem = soundSystem;
  }

  private startBattle(): void {
    this.battle.start();
    this.view.showTurnBanner(0, 0);

    const active = this.battle.getActiveCreature();
    if (active) {
      this.view.updateActiveUnitAbility(active);
      this.view.showStatsForUnit(active);
    }

    this.soundSystem.stop(SoundCategory.MUSIC);
    this.soundSystem.play(SoundCategory.MUSIC, SoundType.BATTLE_MUSIC);
  }

  private resetBattle(): void {
    this.initializeDefaultMapAndArmies();
    this.cpuPlayer = CPUPlayerFactory.create(this.currentConfig?.aiPersonality, this.battle);
    this.view.setCpuPlayer(this.cpuPlayer);
    this.view.resetGridAndTerrain();
    this.startBattle();
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
      this.soundSystem.play(SoundCategory.SOUND, SoundType.MOVE, true);
    };

    this.battle.hookUnitDied = (_creature) => {
      this.soundSystem.play(SoundCategory.SOUND, SoundType.DIE, true);
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
      this.view.showStatsForUnit(creature);
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
