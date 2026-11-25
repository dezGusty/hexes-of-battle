import { Container } from "pixi.js";
import * as THREE from "three";
import { GameContext, Scene } from "../core/scene";
import { setSharedBannersTexture } from "../render3d/decorations/retreat-flag-3d";
import { disposeBattleRender3DCaches } from "../render3d/render3d-resource-manager";
import { HexMap } from "../shared/hex-map";
import {
  configureArrowVolleySounds,
  configureMovementStepSounds,
  configureSoundGroups,
  configureUISounds,
  configureUnitMovementSounds,
  ISoundSystem,
  PixiSoundSystem,
  setActiveUISoundSystem,
  SoundCategory,
  SoundType,
} from "../battle/sound-system";
import { Creature } from "../battle/creature";
import { MoraleState } from "../battle/combat-rules";
import { ArmyControlType, Battle } from "../battle";
import { BattleActionType } from "../battle/battle-action";
import { CPUPersonalityType, CPUPlayer } from "../battle/cpu-player";
import { CPUPlayerFactory } from "../battle/cpu-player-factory";
import { CreatureRepository } from "../battle/creature-repository";
import { BattleView3D } from "../render3d/battle-view-3d";
import { BattleHud2D } from "../render3d/battle-hud-2d";
import { BattleConfig } from "../battle/battle-types";
import { BattleConfigJson, buildBattleConfigFromJson, fitBattleConfigToMapSize } from "../battle/battle-config-loader";
import { JsonLoader } from "../shared/jsonloader";
import { SaveManager } from "../battle/save-manager";

export class BattleScene3D implements Scene {
  public readonly name = "battle";
  public readonly container: Container = new Container();

  private context!: GameContext;
  private hexMap: HexMap = new HexMap(10, 7);
  private battle!: Battle;
  private cpuPlayer!: CPUPlayer;
  private view!: BattleView3D;
  private hud!: BattleHud2D;
  private currentConfig?: BattleConfig;
  private currentJsonConfig?: BattleConfigJson;
  private soundSystem!: ISoundSystem;

  private creatureRepository: CreatureRepository = new CreatureRepository();

  public async enter(
    context: GameContext,
    params?: {
      config?: BattleConfig;
      jsonConfig?: BattleConfigJson;
      soundSystem?: ISoundSystem;
      replayMode?: boolean;
    }
  ): Promise<void> {
    this.context = context;
    this.currentConfig = params?.config;
    this.currentJsonConfig = params?.jsonConfig;
    await context.loadBattleResources?.();
    this.soundSystem = params?.soundSystem ?? context.soundSystem ?? new PixiSoundSystem(context.settings);
    setActiveUISoundSystem(this.soundSystem, context.settings);
    if (context.templates.hudConfig?.sounds !== undefined || context.templates.hudConfig?.uiSounds !== undefined) {
      configureUISounds(
        context.templates.hudConfig.sounds ?? context.templates.hudConfig.uiSounds,
        this.soundSystem,
        context.settings
      );
    }
    const soundGroups =
      context.templates.soundsConfig?.soundGroups ??
      context.templates.soundsConfig?.groups ??
      context.templates.hudConfig?.soundGroups ??
      (context.templates.combatConfig as any)?.soundGroups;
    if (soundGroups !== undefined) {
      configureSoundGroups(soundGroups, this.soundSystem);
    }
    const arrowVolleyCfg =
      context.templates.soundsConfig?.arrowVolley ??
      context.templates.soundsConfig?.arrow_volley ??
      context.templates.hudConfig?.arrowVolley ??
      context.templates.hudConfig?.arrow_volley ??
      (context.templates.combatConfig as any)?.arrowVolley ??
      (context.templates.combatConfig as any)?.arrow_volley;
    if (arrowVolleyCfg !== undefined) {
      configureArrowVolleySounds(arrowVolleyCfg, this.soundSystem);
    }
    const unitMoveCfg =
      context.templates.soundsConfig?.unitMovementSounds ??
      context.templates.soundsConfig?.unit_movement_sounds;
    if (unitMoveCfg !== undefined) {
      configureUnitMovementSounds(unitMoveCfg, this.soundSystem);
    }
    const moveStepCfg =
      context.templates.soundsConfig?.movementSteps ??
      context.templates.soundsConfig?.movement_steps;
    if (moveStepCfg !== undefined) {
      configureMovementStepSounds(moveStepCfg, this.soundSystem);
    }

    this.creatureRepository.setAbilities(context.templates.abilityTypes);
    this.creatureRepository.setCreatureTemplates(context.templates.creatureTemplates);

    let resolvedConfig = params?.config;
    if (!resolvedConfig) {
      let jsonConfig = params?.jsonConfig ?? context.templates.defaultBattle;
      if (!jsonConfig) {
        try {
          jsonConfig = await JsonLoader.loadJson<BattleConfigJson>('./default-battle.json');
        } catch {
          jsonConfig = { mapWidth: 10, mapHeight: 7, creatures: [] };
        }
      }
      this.currentJsonConfig = jsonConfig;
      resolvedConfig = buildBattleConfigFromJson(jsonConfig, this.creatureRepository);
      this.currentConfig = resolvedConfig;
    }

    if (context.settings && !resolvedConfig.terrainTiles) {
      const dims = context.settings.getBattleMapDimensions();
      resolvedConfig = fitBattleConfigToMapSize(resolvedConfig, dims.mapWidth, dims.mapHeight);
    }

    this.hexMap = new HexMap(resolvedConfig.mapWidth, resolvedConfig.mapHeight);
    this.battle = new Battle(this.hexMap);
    if (context.templates.combatConfig) {
      this.battle.setCombatConfig(context.templates.combatConfig);
    }
    if (context.templates.traitsConfig) {
      this.battle.setTraitsConfig(context.templates.traitsConfig);
    }
    this.battle.initializeFromConfig(resolvedConfig);

    // The battle always starts with manual (human player) control for Army 0
    this.battle.army_control[0] = ArmyControlType.PLAYER;

    let overrideDefaultPersonality: string = CPUPersonalityType.AGGRESSIVE;
    if (resolvedConfig.aiPersonality != null) {
      overrideDefaultPersonality = resolvedConfig.aiPersonality;
    }

    this.cpuPlayer = CPUPlayerFactory.create(overrideDefaultPersonality, this.battle);

    const gameElement =
      typeof document !== 'undefined'
        ? (document.getElementById("game") ?? document.body ?? document.createElement('div'))
        : undefined;
    const rawResource =
      context.assets.unitsSheet?.textureSource?.source ??
      context.assets.unitsSheet?.textureSource?.resource;
    const unitsImg =
      rawResource &&
        (rawResource instanceof HTMLImageElement ||
          rawResource instanceof HTMLCanvasElement ||
          (typeof ImageBitmap !== 'undefined' && rawResource instanceof ImageBitmap))
        ? rawResource
        : undefined;
    const spriteFrames = context.assets.unitsSheet?.data?.frames;

    const rawBannersResource =
      context.assets.bannersSheet?.textureSource?.source ??
      context.assets.bannersSheet?.textureSource?.resource;
    if (
      rawBannersResource &&
      (rawBannersResource instanceof HTMLImageElement ||
        rawBannersResource instanceof HTMLCanvasElement ||
        (typeof ImageBitmap !== 'undefined' && rawBannersResource instanceof ImageBitmap))
    ) {
      const bannersTex = new THREE.Texture(rawBannersResource as any);
      bannersTex.colorSpace = THREE.SRGBColorSpace;
      bannersTex.minFilter = THREE.LinearFilter;
      bannersTex.magFilter = THREE.LinearFilter;
      bannersTex.generateMipmaps = false;
      bannersTex.needsUpdate = true;
      setSharedBannersTexture(bannersTex);
    }

    const sharedRendererHost = gameElement ? context.getThreeRendererHost?.(gameElement) : undefined;
    this.view = new BattleView3D(
      gameElement as HTMLElement,
      this.hexMap,
      this.battle,
      context.settings,
      this.cpuPlayer,
      unitsImg as any,
      spriteFrames,
      sharedRendererHost
    );
    this.view.setSoundSystem(this.soundSystem);

    // Initialize 2D Tactical HUD overlay
    this.hud = new BattleHud2D(
      context.assets,
      context.settings,
      this.battle,
      this.cpuPlayer,
      params?.config?.armyNames,
      context.version
    );
    this.hud.setMusicManager?.(context.musicManager);
    if (context.settings) {
      void context.musicManager?.setMode('battle', context.settings);
    }
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
      onRetreat: () => {
        const playerArmyIndex =
          this.battle.army_control[this.battle.currentArmyIndex] === ArmyControlType.PLAYER
            ? this.battle.currentArmyIndex
            : this.battle.army_control.indexOf(ArmyControlType.PLAYER);
        this.hud.setAutoBattleEnabled(true);
        this.battle.orderRetreat(playerArmyIndex >= 0 ? playerArmyIndex : 0);
      },
      onUnitRetreat: () => {
        const active = this.battle.getActiveCreature();
        if (active) {
          const ok = this.battle.retreatActiveCreature();
          if (ok && !this.battle.isFinished()) {
            this.battle.selectNextUnitAndGetIndex();
          }
        }
      },
      onSurrender: () => {
        const playerArmyIndex =
          this.battle.army_control[this.battle.currentArmyIndex] === ArmyControlType.PLAYER
            ? this.battle.currentArmyIndex
            : this.battle.army_control.indexOf(ArmyControlType.PLAYER);
        this.battle.surrender(playerArmyIndex >= 0 ? playerArmyIndex : 0);
      },
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
      onToggleHealthbars: (showHealthbars) => {
        this.view.setHealthbarsVisible(showHealthbars);
      },
      onToggleSceneInspector: (showInspector) => {
        this.view.setSceneInspectorVisible(showInspector);
      },
      onToggleHardwareCursor: (hide) => {
        this.view.applyHardwareCursorVisibility(hide);
      },
      onToggleDamageIndicators: (show) => {
        this.view.setShowDamageIndicators(show);
      },
      onToggleAutoBattle: () => {
        const active = this.battle.getActiveCreature();
        if (active) {
          this.hud.updateActiveUnitAbility(active);
          this.hud.updateUnitStats(active);
        }
        this.view.updateActiveUnitSelection();
        this.view.updateHoverVisuals();
      },
      onAutoBattlePersonalityChange: () => {
        this.view.updateActiveUnitSelection();
      },
      onExitReplay: () => {
        let result = this.battle.getBattleResult();
        if (result.victorArmyIndex === -1) {
          const p0Cpu =
            this.hud.getPlayerCpuPlayer() ??
            CPUPlayerFactory.create(CPUPersonalityType.AGGRESSIVE, this.battle);
          result = this.battle.computeAutomatically([p0Cpu, this.cpuPlayer]);
        }
        this.context.eventBus.emit("battle:exit-to-overview", result);
      },
      onWeatherChange: (weather) => {
        this.view.setWeather(weather);
      },
      onToggleRimLighting: (enabled) => {
        this.view.setRimLightingEnabled(enabled);
      },
      onToggleTiltShift: (enabled) => {
        this.view.setTiltShiftEnabled(enabled);
      },
      onInternalResolutionScalingChange: (scaling) => {
        this.view.setInternalResolutionScaling(scaling);
      },
      onToggleSimpleTrees: (enabled) => {
        this.view.setSimpleTreesEnabled(enabled);
      },
      onToggleShowDeadUnits: (enabled) => {
        this.view.setShowDeadUnitsEnabled(enabled);
      },
      onCorpseDurationChange: (sec) => {
        this.view.setCorpseDurationSec(sec);
      },
      onSaveBattle: (name) => {
        SaveManager.saveBattle(this.battle, name);
        return true;
      },
      onLoadSave: (entry) => {
        const ok = SaveManager.loadBattle(entry, this.battle, this.context.templates.abilityTypes);
        if (ok) {
          this.hud.setAutoBattleEnabled(false);
          this.cpuPlayer = CPUPlayerFactory.create(this.currentConfig?.aiPersonality, this.battle);
          this.view.setCpuPlayer(this.cpuPlayer);
          this.hud.setCpuPlayer(this.cpuPlayer);
          this.view.resetGridAndTerrain();
          this.hud.showTurnBanner(this.battle.turnNumber, this.battle.currentArmyIndex);
          this.view.showTurnBanner(this.battle.turnNumber, this.battle.currentArmyIndex);
          const active = this.battle.getActiveCreature();
          if (active) {
            this.hud.updateActiveUnitAbility(active);
            this.hud.updateUnitStats(active);
            this.view.updateActiveUnitSelection();
          }
        }
      },
    });
    this.hud.resize?.(
      context.app?.screen?.width || (typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920),
      context.app?.screen?.height || (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 1080)
    );

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
      onToggleStats: () => {
        this.hud.toggleUnitStats();
      },
    });

    this.hookBattleEvents();
    if (params?.replayMode) {
      this.hud.setAutoBattlePersonality(CPUPersonalityType.AGGRESSIVE);
      this.hud.setAutoBattleEnabled(true);
      this.hud.setReplayMode(true);
    } else {
      this.hud.setReplayMode(false);
    }
    this.startBattle();
  }

  public update(deltaMS: number): void {
    if (!this.view || !this.hud || !this.cpuPlayer) return;
    this.view.update(deltaMS);
    this.hud.update(deltaMS, this.context?.app?.ticker?.FPS ?? 60);
    if (this.battle.currentArmyIndex === 0) {
      if (this.battle.army_control[0] === ArmyControlType.AI) {
        this.hud.getPlayerCpuPlayer()?.update(deltaMS);
      }
    } else {
      this.cpuPlayer.update(deltaMS);
    }
  }

  public resize(width: number, height: number): void {
    this.view?.resize?.(width, height);
    this.hud?.resize?.(width, height);
  }

  public async exit(): Promise<void> {
    this.soundSystem?.stop(SoundCategory.MUSIC);
    this.clearBattleHooks();
    this.view?.destroy();
    this.hud?.destroy();
    this.container.removeChildren();
    disposeBattleRender3DCaches();
    await this.context?.unloadBattleResources?.();
    this.view = undefined!;
    this.hud = undefined!;
    this.cpuPlayer = undefined!;
    this.battle = undefined!;
  }

  private clearBattleHooks(): void {
    if (!this.battle) return;
    const noop = () => {};
    this.battle.hookDoingAttackRanged = noop;
    this.battle.hookDoingAttack = noop;
    this.battle.hookDoingHeal = noop;
    this.battle.hookNextTurn = noop;
    this.battle.hookWindChanged = noop;
    this.battle.hookMovingUnit = noop;
    this.battle.hookUnitDied = noop;
    this.battle.hookUnitRetreated = noop;
    this.battle.hookMoraleBreak = noop;
    this.battle.hookBattleFinished = noop;
    this.battle.hookRecommendEndTurn = noop;
    this.battle.hookActiveUnitChanged = noop;
  }

  public getSoundSystem(): ISoundSystem {
    return this.soundSystem;
  }

  public setSoundSystem(soundSystem: ISoundSystem): void {
    this.soundSystem = soundSystem;
    if (this.view) {
      this.view.setSoundSystem(soundSystem);
    }
  }

  private startBattle(): void {
    this.battle.start();
    if (!this.battle.isCurrentTurnAI() && this.battle.activeCreatureIndex === -1) {
      this.battle.selectNextUnitAndGetIndex();
    }
    this.view.showTurnBanner(0, 0);
    this.hud.showTurnBanner(0, 0);

    const active = this.battle.getActiveCreature();
    if (active) {
      this.hud.updateActiveUnitAbility(active);
      this.hud.updateUnitStats(active);
    }

    this.soundSystem.stop(SoundCategory.MUSIC);
    this.soundSystem.play(SoundCategory.MUSIC, SoundType.BATTLE_MUSIC);
  }

  private resetBattle(): void {
    const configToApply = this.currentJsonConfig
      ? buildBattleConfigFromJson(this.currentJsonConfig, this.creatureRepository)
      : this.currentConfig;
    if (configToApply) {
      this.battle.initializeFromConfig(configToApply);
    } else {
      this.battle.initializeToSize(this.hexMap.width, this.hexMap.height);
      this.battle.start();
    }
    this.battle.army_control[0] = ArmyControlType.PLAYER;
    this.hud.setAutoBattleEnabled(false);
    this.cpuPlayer = CPUPlayerFactory.create(this.currentConfig?.aiPersonality, this.battle);
    this.view.setCpuPlayer(this.cpuPlayer);
    this.hud.setCpuPlayer(this.cpuPlayer);
    this.view.resetGridAndTerrain();
    this.startBattle();
  }

  private hookBattleEvents(): void {
    this.battle.hookDoingAttackRanged = (data) => {
      this.view.showRangedAttackVisuals(data);
    };

    this.battle.hookDoingAttack = (attacker, defender, damage, attackType, flankStatus) => {
      if (attackType !== BattleActionType.ATTACK_RANGED) {
        this.view.showAttackVisuals(attacker, defender, damage, attackType, flankStatus);
      }
    };

    this.battle.hookDoingHeal = (data) => {
      this.soundSystem.play(SoundCategory.SOUND, SoundType.HEAL, true);
      this.view.showHealVisuals(data.healer, data.target, data.amount, data.moraleBoost);
    };

    this.battle.hookNextTurn = (turnNum, armyIdx) => {
      this.view.showTurnBanner(turnNum, armyIdx);
      this.hud.showTurnBanner(turnNum, armyIdx);
      if (!this.battle.isCurrentTurnAI()) {
        this.battle.selectNextUnitAndGetIndex();
      }
    };

    this.battle.hookWindChanged = (windState) => {
      this.view.hexBoard.setWindState(windState.angleRad, windState.strength);
    };

    this.battle.hookMovingUnit = (creature, _nextStep) => {
      const unitKey = Creature.CREATURE_NAMES[creature?.creatureType] ?? '';
      if (unitKey && this.soundSystem.hasUnitMovementSound?.(unitKey)) {
        return;
      }
      this.soundSystem.play(SoundCategory.SOUND, SoundType.MOVE, true);
    };

    this.battle.hookUnitDied = (_creature) => {
      this.soundSystem.play(SoundCategory.SOUND, SoundType.DIE, true);
    };

    this.battle.hookUnitRetreated = (creature) => {
      this.soundSystem.play(SoundCategory.SOUND, SoundType.RETREAT, true);
      this.view.removeSquad(creature.GUID.toString());
    };

    this.battle.hookMoraleBreak = (_creature, state) => {
      if (state === MoraleState.ROUTING) {
        this.soundSystem.play(SoundCategory.SOUND, SoundType.RETREAT, true);
      }
    };

    this.battle.hookBattleFinished = (victor) => {
      this.hud.showVictoryBanner(victor);
      if (this.hud.postBattlePanel) {
        this.hud.postBattlePanel.onClose = () => {
          this.context.eventBus.emit("battle:exit-to-overview");
        };
      }
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
}
