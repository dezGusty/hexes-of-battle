import { Container } from 'pixi.js';
import { ArmyControlType, Battle } from '../battle';
import { BattleResult } from '../battle/battle-types';
import { CPUPersonalityType } from '../battle/cpu-player';
import { CPUPlayerFactory } from '../battle/cpu-player-factory';
import { CreatureRepository } from '../battle/creature-repository';
import { OverviewReturnParams } from '../core/game-flow';
import { GameContext, Scene } from '../core/scene';
import { OverviewCampaign } from '../overview/overview-campaign';
import { createStarterOverviewMap } from '../overview/overview-map-generator';
import { BattlePromptInfo } from '../overview/ui/overview-battle-prompt-panel';
import { OverviewHud2D } from '../overview/ui/overview-hud-2d';
import { OverviewView3D } from '../render3d/overview/overview-view-3d';
import { Coords } from '../shared';
import { HexMap } from '../shared/hex-map';

interface PendingBattleContext {
  attackerArmyId: string;
  defenderArmyId: string;
  targetRegionId?: string;
}

interface PendingEngagementContext extends PendingBattleContext {
  cost: number;
  seed: number;
  info: BattlePromptInfo;
  quickBattleResult?: BattleResult;
}

export class OverviewScene3D implements Scene {
  public readonly name = 'overview';
  public readonly container: Container = new Container();

  private context!: GameContext;
  public campaign?: OverviewCampaign;
  public view?: OverviewView3D;
  public hud?: OverviewHud2D;

  private pendingBattle: PendingBattleContext | null = null;
  private pendingEngagement: PendingEngagementContext | null = null;
  private readonly creatureRepository = new CreatureRepository();

  public async enter(context: GameContext, params?: OverviewReturnParams): Promise<void> {
    this.context = context;

    if (context.templates.abilityTypes) {
      this.creatureRepository.setAbilities(context.templates.abilityTypes);
    }
    if (context.templates.creatureTemplates) {
      this.creatureRepository.setCreatureTemplates(context.templates.creatureTemplates);
    }

    if (!this.campaign) {
      this.campaign = new OverviewCampaign(createStarterOverviewMap(321345));
    }

    if (params?.battleResult && this.pendingBattle) {
      this.campaign.applyBattleResult(
        params.battleResult,
        this.pendingBattle.attackerArmyId,
        this.pendingBattle.defenderArmyId,
        this.pendingBattle.targetRegionId
      );
      this.pendingBattle = null;
    }

    const gameElement =
      typeof document !== 'undefined'
        ? document.getElementById('game') ?? document.body
        : ({} as HTMLElement);

    const sharedRendererHost = gameElement
      ? context.getThreeRendererHost?.(gameElement)
      : undefined;

    const createViewForCampaign = (campaign: OverviewCampaign) => {
      this.view?.destroy();
      this.view = new OverviewView3D(
        gameElement,
        campaign,
        {
          onSelectHex: (coords) => {
            this.hud?.showSelectionAtHex(coords);
          },
          onSelectSettlement: (regionId) => {
            if (this.campaign) {
              this.hud?.settlementPanel.show(this.campaign, regionId);
            }
          },
          onMoveArmy: (armyId, targetCoords) => {
            this.handleMoveArmy(armyId, targetCoords);
          },
          onPointerMove: (stageCoords) => {
            this.hud?.updateCursorPosition(stageCoords);
          },
          getStageInfo: () => {
            const stage = context.stage ?? context.app?.stage;
            return {
              offset: { x: stage?.x ?? 0, y: stage?.y ?? 0 },
              scale: { x: stage?.scale?.x ?? 1, y: stage?.scale?.y ?? 1 },
            };
          },
          isMenuBlockingInput: () =>
            Boolean(
              this.hud?.menuPanel?.isVisible() ||
              this.hud?.battlePromptPanel?.isVisible() ||
              this.hud?.armyExchangePanel?.isVisible() ||
              this.hud?.modelExplorerPanel?.isVisible()
            ),
        },
        sharedRendererHost,
        context.settings
      );
    };

    createViewForCampaign(this.campaign);

    this.hud = new OverviewHud2D(
      this.container,
      () => {
        if (!this.campaign) return;
        this.campaign.endTurn();
        this.view?.syncAll();
        this.hud?.refresh();
      },
      {
        assets: context.assets,
        settings: context.settings,
        soundSystem: context.soundSystem,
        musicManager: context.musicManager,
        onToggleGrid: (visible) => this.view?.setGridVisible(visible),
        onToggleCoords: (visible) => this.view?.setCoordsVisible(visible),
        onToggleSceneInspector: () => this.view?.toggleSceneInspector(),
        onToggleHardwareCursor: (hidden) => this.view?.applyHardwareCursorVisibility(hidden),
        onToggleRimLighting: (enabled) => this.view?.setRimLightingEnabled(enabled),
        onToggleTiltShift: (enabled) => this.view?.setTiltShiftEnabled(enabled),
        onToggleSimpleTrees: (enabled) => this.view?.setSimpleTreesEnabled(enabled),
        onInternalResolutionScalingChange: (scaling) => this.view?.setInternalResolutionScaling(scaling),
        onOverviewAnimationSpeedChange: (speed) => this.view?.setOverviewAnimationSpeed(speed),
        onLoadCampaign: (loaded) => {
          this.campaign = loaded;
          this.pendingBattle = null;
          this.pendingEngagement = null;
          createViewForCampaign(loaded);
          this.hud?.bindCampaign(loaded);
        },
        battlePromptCallbacks: {
          onQuickBattle: () => this.runPendingQuickBattle(),
          onFightOnBattlefield: () => this.launchPendingBattle(false),
          onCancel: () => {
            this.pendingEngagement = null;
            this.hud?.battlePromptPanel.hide();
          },
          onAcceptOutcome: () => this.acceptPendingQuickBattleOutcome(),
          onViewBattle: () => this.launchPendingBattle(true),
          onRefuseOutcome: () => this.launchPendingBattle(false),
        },
        onExchangeDone: () => {
          this.view?.syncAll();
          this.hud?.refresh();
        },
      }
    );
    this.hud.bindCampaign(this.campaign);
    if (context.settings) {
      void context.musicManager?.setMode('global', context.settings);
    }
  }

  public handleMoveArmy(armyId: string, targetCoords: Coords): void {
    if (!this.campaign) return;

    const engagement = this.campaign.prepareEngagementAt(armyId, targetCoords);
    if (engagement) {
      if (engagement.movedDuringApproach) {
        this.view?.syncAll();
        this.hud?.refresh();
        this.hud?.showSelectionAtHex(engagement.attacker.coords);
      }
      const attackerOwner = this.campaign.getPlayer(engagement.attacker.ownerPlayerId);
      const defenderOwner = this.campaign.getPlayer(engagement.defender.ownerPlayerId);
      const info: BattlePromptInfo = {
        attackerName: attackerOwner?.name ?? 'Attacker',
        defenderName: defenderOwner?.name ?? 'Neutral Garrison',
        attackerSquadCount: engagement.attacker.squads.length,
        defenderSquadCount: engagement.defender.squads.length,
        regionName: engagement.targetRegion?.name,
      };
      this.pendingEngagement = {
        attackerArmyId: engagement.attacker.id,
        defenderArmyId: engagement.defender.id,
        targetRegionId: engagement.targetRegion?.id,
        cost: engagement.cost,
        seed: (Date.now() ^ (targetCoords.x * 73856093) ^ (targetCoords.y * 19349663)) >>> 0,
        info,
      };
      this.hud?.battlePromptPanel.showPrompt(info);
      return;
    }

    const outcome = this.campaign.moveArmy(armyId, targetCoords, this.creatureRepository);
    if (outcome.moved) {
      this.view?.syncAll();
      this.hud?.refresh();
      if (outcome.exchangeArmyIds) {
        this.hud?.armyExchangePanel.show(
          this.campaign,
          outcome.exchangeArmyIds.leftArmyId,
          outcome.exchangeArmyIds.rightArmyId
        );
      } else {
        this.hud?.showSelectionAtHex(targetCoords);
      }
    }
  }

  private buildPendingBattleConfig() {
    if (!this.campaign || !this.pendingEngagement) return null;
    const attacker = this.campaign.getArmyById(this.pendingEngagement.attackerArmyId);
    const defender = this.campaign.getArmyById(this.pendingEngagement.defenderArmyId);
    if (!attacker || !defender) return null;
    const targetRegion = this.pendingEngagement.targetRegionId
      ? this.campaign.getRegionById(this.pendingEngagement.targetRegionId)
      : undefined;

    const config = this.campaign.buildBattleConfigForEngagement(
      attacker,
      defender,
      targetRegion,
      this.creatureRepository
    );
    config.seed = this.pendingEngagement.seed;
    return config;
  }

  private runPendingQuickBattle(): void {
    if (!this.pendingEngagement) return;
    const config = this.buildPendingBattleConfig();
    if (!config) return;

    const hexMap = new HexMap(config.mapWidth, config.mapHeight);
    const battle = new Battle(hexMap);
    if (this.context.templates?.combatConfig) {
      battle.setCombatConfig(this.context.templates.combatConfig);
    }
    if (this.context.templates?.traitsConfig) {
      battle.setTraitsConfig(this.context.templates.traitsConfig);
    }
    battle.initializeFromConfig(config);
    battle.army_control = [ArmyControlType.AI, ArmyControlType.AI];

    const cpu0 = CPUPlayerFactory.create(CPUPersonalityType.AGGRESSIVE, battle);
    const cpu1 = CPUPlayerFactory.create(
      config.aiPersonality ?? CPUPersonalityType.AGGRESSIVE,
      battle
    );
    const result = battle.computeAutomatically([cpu0, cpu1]);
    this.pendingEngagement.quickBattleResult = result;
    this.hud?.battlePromptPanel.showQuickBattleSummary(
      this.pendingEngagement.info,
      result
    );
  }

  private launchPendingBattle(replayMode: boolean): void {
    if (!this.campaign || !this.pendingEngagement) return;
    const config = this.buildPendingBattleConfig();
    if (!config) return;

    this.campaign.consumeMovementPoints(
      this.pendingEngagement.attackerArmyId,
      this.pendingEngagement.cost
    );
    this.pendingBattle = {
      attackerArmyId: this.pendingEngagement.attackerArmyId,
      defenderArmyId: this.pendingEngagement.defenderArmyId,
      targetRegionId: this.pendingEngagement.targetRegionId,
    };
    this.pendingEngagement = null;
    this.hud?.battlePromptPanel.hide();

    this.context.eventBus.emit('overview:start-battle', {
      config,
      soundSystem: this.context.soundSystem,
      replayMode,
    });
  }

  private acceptPendingQuickBattleOutcome(): void {
    if (!this.campaign || !this.pendingEngagement?.quickBattleResult) return;
    const {
      attackerArmyId,
      defenderArmyId,
      targetRegionId,
      cost,
      quickBattleResult,
    } = this.pendingEngagement;

    this.campaign.consumeMovementPoints(attackerArmyId, cost);
    this.campaign.applyBattleResult(
      quickBattleResult,
      attackerArmyId,
      defenderArmyId,
      targetRegionId
    );
    this.pendingEngagement = null;
    this.hud?.battlePromptPanel.hide();
    this.view?.syncAll();
    this.hud?.refresh();
    this.hud?.clearSelection();
  }

  public update(deltaTime: number): void {
    this.view?.update(deltaTime);
    if (this.context?.app?.ticker) {
      this.hud?.updateFps(this.context.app.ticker.FPS);
    }
  }

  public resize(width: number, height: number): void {
    this.view?.resize(width, height);
  }

  public exit(): void {
    this.view?.destroy();
    this.view = undefined;
    this.hud?.destroy();
    this.hud = undefined;
  }

  public destroy(): void {
    this.exit();
    this.campaign = undefined;
    this.pendingBattle = null;
    this.pendingEngagement = null;
  }
}
