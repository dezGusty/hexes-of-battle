import { Container } from "pixi.js";
import { sound } from "@pixi/sound";
import { GameContext, Scene } from "../core/scene";
import { HexDirection, HexMap } from "../shared/hex-map";
import { Coords } from "../shared";
import { Battle } from "../battle";
import { CreatureType } from "../battle/creature";
import { CPUPersonalityType, CPUPlayer } from "../battle/cpu-player";
import { CPUPlayerFactory } from "../battle/cpu-player-factory";
import { CreatureRepository } from "../battle/creature-repository";
import { BattleView3D } from "../render3d/battle-view-3d";
import { BattleHud2D } from "../render3d/battle-hud-2d";
import { BattleConfig } from "../battle/battle-types";
import { TerrainType } from "../battle/terrain-types";

export class BattleScene3D implements Scene {
  public readonly name = "battle";
  public readonly container: Container = new Container();

  private context!: GameContext;
  private hexMap: HexMap = new HexMap(13, 9);
  private battle!: Battle;
  private cpuPlayer!: CPUPlayer;
  private view!: BattleView3D;
  private hud!: BattleHud2D;
  private currentConfig?: BattleConfig;

  private creatureRepository: CreatureRepository = new CreatureRepository();

  public async enter(context: GameContext, params?: { config?: BattleConfig }): Promise<void> {
    this.context = context;
    this.currentConfig = params?.config;

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

    let overrideDefaultPersonality: string = CPUPersonalityType.AGGRESSIVE;
    if (params?.config?.aiPersonality != null) {
      overrideDefaultPersonality = params.config.aiPersonality;
    }

    this.cpuPlayer = CPUPlayerFactory.create(overrideDefaultPersonality, this.battle);

    const gameElement = document.getElementById("game") ?? document.body;

    this.view = new BattleView3D(
      gameElement,
      this.hexMap,
      this.battle,
      context.settings,
      this.cpuPlayer
    );

    // Initialize 2D Tactical HUD overlay
    this.hud = new BattleHud2D(
      context.assets,
      context.settings,
      this.battle,
      this.cpuPlayer,
      params?.config?.armyNames
    );
    this.container.addChild(this.hud.container);

    this.hud.initialize({
      onZoomIn: () => this.view.sceneManager.zoomCamera(-2),
      onZoomOut: () => this.view.sceneManager.zoomCamera(2),
      onZoomSliderUpdate: (val) => this.view.setZoomLevel(val / 100),
      onAltitudeUp: () => this.view.sceneManager.rotateCamera(0, -0.1),
      onAltitudeDown: () => this.view.sceneManager.rotateCamera(0, 0.1),
      onNextTurn: () => this.battle.nextTurn(),
      onNextUnit: () => this.battle.selectNextUnitAndGetIndex(),
      onReset: () => this.resetBattle(),
      onActiveAbility1: () => this.battle.selectActiveAbilityForCurrentUnit(0),
      onRest: () => {
        const active = this.battle.getActiveCreature();
        if (active) {
          const ok = this.battle.restActiveCreature();
          if (ok) {
            this.view.showRestVisuals(active, 5);
            this.battle.selectNextUnitAndGetIndex();
          }
        }
      },
      onToggleStats: () => {
        const active = this.battle.getActiveCreature();
        if (active) {
          this.hud.updateUnitStats(active);
        }
      },
      onToggleGrid: (showGrid) => {
        this.view.setGridVisible(showGrid);
      },
      onToggleCoords: (showCoords) => {
        this.view.setCoordsVisible(showCoords);
      },
    });

    this.view.setHud(this.hud, () => ({
      offset: this.context.stage.position,
      scale: this.context.stage.scale,
    }));

    if (context.assets.unitsSheet) {
      this.view.visualFactory.setSpritesheet(context.assets.unitsSheet);
    }

    // Load both unit spritesheets and terrain textures before launching battle
    await this.view.loadAllAssets();

    this.view.initialize({
      onNextTurn: () => this.battle.nextTurn(),
      onNextUnit: () => this.battle.selectNextUnitAndGetIndex(),
      onReset: () => this.resetBattle(),
      onActiveAbility1: () => this.battle.selectActiveAbilityForCurrentUnit(0),
      onRest: () => {
        const active = this.battle.getActiveCreature();
        if (active) {
          const ok = this.battle.restActiveCreature();
          if (ok) {
            this.view.showRestVisuals(active, 5);
            this.battle.selectNextUnitAndGetIndex();
          }
        }
      },
    });

    this.hookBattleEvents();
    this.startBattle();
  }

  public update(deltaMS: number): void {
    this.view.update(deltaMS);
    this.hud.update(deltaMS, this.context.app.ticker.FPS);
    this.cpuPlayer.update(deltaMS);
  }

  public resize(width: number, height: number): void {
    this.view.resize(width, height);
  }

  public exit(): void {
    sound.stop("track_dark_whispers");
    this.view.destroy();
    this.hud.destroy();
    this.container.removeChildren();
  }

  private startBattle(): void {
    this.battle.start();
    this.view.showTurnBanner(0, 0);
    this.hud.showTurnBanner(0, 0);

    const active = this.battle.getActiveCreature();
    if (active) {
      this.hud.updateActiveUnitAbility(active);
      this.hud.updateUnitStats(active);
    }

    sound.stop("track_dark_whispers");
    if (this.context.settings.sound.musicOn) {
      sound.play("track_dark_whispers", { loop: true, volume: this.context.settings.sound.musicVolume });
    }
  }

  private resetBattle(): void {
    this.initializeDefaultMapAndArmies();
    this.cpuPlayer = CPUPlayerFactory.create(this.currentConfig?.aiPersonality, this.battle);
    this.view.setCpuPlayer(this.cpuPlayer);
    this.hud.setCpuPlayer(this.cpuPlayer);
    this.view.resetGridAndTerrain();
    this.startBattle();
  }

  private hookBattleEvents(): void {
    this.battle.hookDoingAttack = (attacker, defender, damage, attackType, flankStatus) => {
      this.view.showAttackVisuals(attacker, defender, damage, attackType, flankStatus);
    };

    this.battle.hookNextTurn = (turnNum, armyIdx) => {
      this.view.showTurnBanner(turnNum, armyIdx);
      this.hud.showTurnBanner(turnNum, armyIdx);
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
      this.hud.showVictoryBanner(victor);
      const result = this.battle.getBattleResult();
      this.context.eventBus.emit("battle:finished", result ?? { victorArmyIndex: victor });
    };

    this.battle.hookRecommendEndTurn = (_armyIndex) => {
      this.hud.showEndTurnRecommendation();
    };

    this.battle.hookActiveUnitChanged = (creature) => {
      this.hud.updateActiveUnitAbility(creature);
      this.hud.updateUnitStats(creature);
      this.view.updateActiveUnitSelection();
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
    // addUnit(CreatureType.CROSSBOWMAN, { x: 0, y: 4 }, 0);
    // addUnit(CreatureType.SPEARMAN, { x: 3, y: 5 }, 0);

    addUnit(CreatureType.SPEARMAN, { x: 5, y: 6 }, 1, HexDirection.WEST);
    addUnit(CreatureType.SWORDSMAN, { x: 4, y: 4 }, 1, HexDirection.WEST);
    // addUnit(CreatureType.BARBARIAN, { x: 4, y: 6 }, 1, HexDirection.WEST);
    // addUnit(CreatureType.PEASANT, { x: 4, y: 3 }, 1, HexDirection.WEST);
    // addUnit(CreatureType.PEASANT_ARCHER, { x: 7, y: 4 }, 1, HexDirection.WEST);

    // If any non-flying unit is set on top of a mountain, change that hex to a hill
    for (const creature of this.battle.creatures) {
      if (!creature.isFlying && creature.pos) {
        const { x, y } = creature.pos;
        if (this.battle.getTerrainAt(creature.pos) === TerrainType.MOUNTAIN) {
          this.battle.terrain_tiles[x][y] = TerrainType.HILL;
        }
      }
    }
  }
}
