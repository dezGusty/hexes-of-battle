import { BitmapText, Container, Graphics, Sprite, Text } from 'pixi.js';
import { BattleSettings } from '../../battle/settings';
import { ISoundSystem } from '../../battle/sound-system';
import { setActiveUISoundSystem } from '../../battle/ui-sounds';
import { MusicManager } from '../../core/music-manager';
import { GameAssets } from '../../core/scene';
import { Coords } from '../../shared';
import { BattleMenuPanel } from '../../ui/battle-menu';
import { OverviewCampaign } from '../overview-campaign';
import { OverviewSaveEntry, OverviewSaveManager } from '../overview-save-manager';
import { MerchantTradePanel } from './merchant-trade-panel';
import { OverviewArmyExchangePanel } from './overview-army-exchange-panel';
import {
  BattlePromptCallbacks,
  OverviewBattlePromptPanel,
} from './overview-battle-prompt-panel';
import {
  createOverviewResourceBadge,
  OverviewResourceBadge,
  OverviewResourceTooltip,
  ResourceIconKey,
} from './overview-resource-icons';
import { OverviewSelectionPanel } from './overview-selection-panel';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';
import { SettlementPanel } from './settlement-panel';

export interface OverviewHud2DOptions {
  assets?: GameAssets;
  settings?: BattleSettings;
  soundSystem?: ISoundSystem;
  musicManager?: MusicManager;
  onToggleGrid?: (visible: boolean) => void;
  onToggleCoords?: (visible: boolean) => void;
  onToggleSceneInspector?: () => void;
  onToggleHardwareCursor?: (hidden: boolean) => void;
  onToggleRimLighting?: (enabled: boolean) => void;
  onToggleTiltShift?: (enabled: boolean) => void;
  onToggleSimpleTrees?: (enabled: boolean) => void;
  onOverviewAnimationSpeedChange?: (speed: number) => void;
  onLoadCampaign?: (campaign: OverviewCampaign) => void;
  battlePromptCallbacks?: BattlePromptCallbacks;
  onExchangeDone?: () => void;
}

export class OverviewHud2D {
  public readonly container = new Container();
  private readonly topBarBg = new Graphics();
  private readonly summaryText: Text;
  private readonly victoryBanner = new Container();
  private readonly victoryText: Text;

  public readonly resourceTooltip: OverviewResourceTooltip;
  public readonly resourceBadges: Record<ResourceIconKey, OverviewResourceBadge>;
  public readonly merchantPanel: MerchantTradePanel;
  public readonly settlementPanel: SettlementPanel;
  public readonly selectionPanel: OverviewSelectionPanel;
  public readonly battlePromptPanel: OverviewBattlePromptPanel;
  public readonly armyExchangePanel: OverviewArmyExchangePanel;
  public readonly merchantButton: OverviewUiButton;
  public readonly endTurnButton: OverviewUiButton;
  public readonly manageSettlementButton: OverviewUiButton;
  public readonly menuButton: OverviewUiButton;
  public readonly uiPlusRenderGroup = new Container();
  public readonly uiCursorRenderGroup = new Container();
  public menuPanel?: BattleMenuPanel;
  public softCursorSprite?: Sprite;
  public fpsText?: BitmapText;

  private campaign?: OverviewCampaign;
  private onEndTurn?: () => void;
  private readonly settings: BattleSettings;
  private boundEscapeHandler?: (e: KeyboardEvent) => void;

  constructor(
    parent: Container,
    onEndTurn?: () => void,
    options: OverviewHud2DOptions = {}
  ) {
    this.onEndTurn = onEndTurn;
    this.settings = options.settings ?? new BattleSettings();
    setActiveUISoundSystem(options.soundSystem, this.settings);
    this.container.label = 'OverviewHud2D';

    this.topBarBg
      .rect(0, 0, 1920, 62)
      .fill({ color: 0x0f151e, alpha: 0.92 })
      .stroke({ width: 1.5, color: 0xd4af37, alpha: 0.85 });
    this.container.addChild(this.topBarBg);

    this.summaryText = new Text({
      text: 'Turn 1',
      style: { fill: '#f3f7fb', fontSize: 20, fontWeight: 'bold' },
    });
    this.summaryText.position.set(24, 18);
    this.container.addChild(this.summaryText);

    this.resourceTooltip = new OverviewResourceTooltip(this.uiPlusRenderGroup);

    const badgeKeys: ResourceIconKey[] = ['money', 'food', 'lumber', 'stone', 'iron'];
    const badges = {} as Record<ResourceIconKey, OverviewResourceBadge>;
    badgeKeys.forEach((key, index) => {
      const bx = 320 + index * 135;
      const badge = createOverviewResourceBadge(key, {
        iconSize: 30,
        fontSize: 20,
        deltaFontSize: 14,
        textColor: '#f3f7fb',
        showDelta: true,
        tooltip: this.resourceTooltip,
        getAnchorStagePos: () => ({ x: bx, y: 54 }),
      });
      badge.container.position.set(bx, 10);
      this.container.addChild(badge.container);
      badges[key] = badge;
    });
    this.resourceBadges = badges;

    this.manageSettlementButton = createOverviewButton(
      'Settlement',
      145,
      44,
      () => {
        if (!this.campaign) return;
        const playerRegion = this.campaign.regions.find(
          (r) => r.ownerPlayerId === 'player' && r.settlementCoords
        );
        if (playerRegion) {
          this.settlementPanel.show(this.campaign, playerRegion.id);
        }
      },
      { fillColor: 0x263a4d, fontSize: 17 }
    );
    this.manageSettlementButton.container.position.set(1230, 9);

    this.merchantButton = createOverviewButton(
      'Merchant',
      145,
      44,
      () => {
        const player = this.campaign?.getPlayer('player');
        if (player) {
          this.merchantPanel.show(player);
        }
      },
      { fillColor: 0x453520, fontSize: 17 }
    );
    this.merchantButton.container.position.set(1390, 9);

    this.endTurnButton = createOverviewButton(
      'End Turn',
      165,
      44,
      () => {
        this.onEndTurn?.();
      },
      { fillColor: 0x244a32, fontSize: 18 }
    );
    this.endTurnButton.container.position.set(1550, 9);

    this.menuButton = createOverviewButton(
      'Menu',
      150,
      44,
      () => {
        this.menuPanel?.toggleVisibility();
      },
      { fillColor: 0x2d3340, fontSize: 18 }
    );
    this.menuButton.container.position.set(1730, 9);

    this.container.addChild(
      this.manageSettlementButton.container,
      this.merchantButton.container,
      this.endTurnButton.container,
      this.menuButton.container
    );

    this.merchantPanel = new MerchantTradePanel(
      this.container,
      () => this.refresh(),
      this.resourceTooltip
    );
    this.settlementPanel = new SettlementPanel(this.container, () => this.refresh());
    this.selectionPanel = new OverviewSelectionPanel(this.container, (regionId) => {
      if (this.campaign) {
        this.settlementPanel.show(this.campaign, regionId);
      }
    });
    this.battlePromptPanel = new OverviewBattlePromptPanel(
      this.uiPlusRenderGroup,
      options.battlePromptCallbacks ?? {
        onQuickBattle: () => {},
        onFightOnBattlefield: () => {},
        onCancel: () => this.battlePromptPanel.hide(),
        onAcceptOutcome: () => this.battlePromptPanel.hide(),
        onViewBattle: () => {},
        onRefuseOutcome: () => {},
      }
    );
    this.armyExchangePanel = new OverviewArmyExchangePanel(
      this.uiPlusRenderGroup,
      () => {
        this.refresh();
        options.onExchangeDone?.();
      }
    );

    // FPS Counter
    try {
      this.fpsText = new BitmapText({
        text: 'FPS: --',
        style: {
          fontFamily: this.settings.debug.fpsFontFamily || 'GustysSerpents',
          fontSize: this.settings.debug.fpsFontSize || 14,
          fill: this.settings.debug.fpsColor || '#ffffff',
        },
      });
      this.fpsText.alpha = this.settings.debug.fpsAlpha ?? 0.7;
      this.fpsText.position.set(24, 68);
      this.fpsText.visible = this.settings.debug.showFps;
      this.container.addChild(this.fpsText);
    } catch {
      // Headless / missing bitmap font fallback
    }

    // Campaign Victory Banner
    const victoryBg = new Graphics()
      .roundRect(0, 0, 620, 160, 12)
      .fill({ color: 0x101620, alpha: 0.96 })
      .stroke({ width: 3, color: 0xf4d03f, alpha: 1 });
    this.victoryBanner.position.set((1920 - 620) / 2, (1080 - 160) / 2);
    this.victoryBanner.visible = false;

    this.victoryText = new Text({
      text: 'CAMPAIGN VICTORY!',
      style: { fill: '#f4d03f', fontSize: 34, fontWeight: 'bold', align: 'center' },
    });
    this.victoryText.anchor.set(0.5);
    this.victoryText.position.set(310, 80);
    this.victoryBanner.addChild(victoryBg, this.victoryText);
    this.container.addChild(this.victoryBanner);

    this.container.addChild(this.uiPlusRenderGroup);
    this.container.addChild(this.uiCursorRenderGroup);

    if (options.assets?.uiSheet) {
      const panel = new BattleMenuPanel(this.uiPlusRenderGroup, options.assets.uiSheet, 'overview');
      this.menuPanel = panel;

      panel.setSoundValues(
        this.settings.sound.musicVolume,
        this.settings.sound.soundVolume,
        this.settings.sound.ambientVolume
      );
      panel.setAnimationSpeed(this.settings.overviewAnimationSpeed);
      panel.setHardwareCursorHidden(this.settings.hideHardwareCursor);
      panel.setRimLightingEnabled(this.settings.unitRimLighting);
      panel.setTiltShiftEnabled(this.settings.tiltShift);
      panel.setSimpleTreesEnabled(this.settings.simpleTrees);

      panel.musicVolumeSlider?.onUpdate.connect((val) => {
        const vol = Math.max(0, Math.min(1, val / 100));
        this.settings.sound.musicVolume = vol;
        this.settings.sound.musicOn = vol > 0;
        this.settings.save();
        if (options.musicManager) {
          void options.musicManager.updateVolume(this.settings);
        }
      });

      panel.soundVolumeSlider?.onUpdate.connect((val) => {
        const vol = Math.max(0, Math.min(1, val / 100));
        this.settings.sound.soundVolume = vol;
        this.settings.sound.soundOn = vol > 0;
        this.settings.save();
      });

      panel.ambientVolumeSlider?.onUpdate.connect((val) => {
        const vol = Math.max(0, Math.min(1, val / 100));
        this.settings.sound.ambientVolume = vol;
        this.settings.sound.ambientOn = vol > 0;
        this.settings.save();
      });

      panel.onAnimationSpeedChange = (speed) => {
        this.settings.setOverviewAnimationSpeed(speed);
        this.settings.save();
        options.onOverviewAnimationSpeedChange?.(speed);
      };

      panel.onToggleRimLighting = (enabled) => {
        this.settings.unitRimLighting = enabled;
        this.settings.save();
        options.onToggleRimLighting?.(enabled);
      };

      panel.onToggleTiltShift = (enabled) => {
        this.settings.tiltShift = enabled;
        this.settings.save();
        options.onToggleTiltShift?.(enabled);
      };

      panel.onToggleSimpleTrees = (enabled) => {
        this.settings.simpleTrees = enabled;
        this.settings.save();
        options.onToggleSimpleTrees?.(enabled);
      };

      panel.onToggleFps = (showFps) => {
        this.settings.debug.showFps = showFps;
        this.settings.save();
        if (this.fpsText) {
          this.fpsText.visible = showFps;
        }
      };

      panel.onToggleHardwareCursor = (hidden) => {
        this.settings.hideHardwareCursor = hidden;
        this.settings.save();
        panel.setHardwareCursorHidden(hidden);
        options.onToggleHardwareCursor?.(hidden);
      };

      panel.onToggleSceneInspector = () => {
        options.onToggleSceneInspector?.();
      };

      panel.toggleGridButton?.onPress.connect(() => {
        const next = !this.settings.hex.showGrid;
        this.settings.hex.showGrid = next;
        this.settings.save();
        options.onToggleGrid?.(next);
      });

      panel.toggleCoordsButton?.onPress.connect(() => {
        const next = !this.settings.debug.showCoords;
        this.settings.debug.showCoords = next;
        this.settings.save();
        options.onToggleCoords?.(next);
      });

      panel.getSavesList = () => OverviewSaveManager.getSavesList();
      panel.onDeleteSave = (id) => OverviewSaveManager.deleteSave(id);
      panel.onSaveBattle = (name) => {
        if (!this.campaign) return false;
        OverviewSaveManager.saveCampaign(this.campaign, name);
        return true;
      };
      panel.onLoadSave = (entry: OverviewSaveEntry) => {
        const loaded = OverviewSaveManager.loadCampaign(entry);
        this.bindCampaign(loaded);
        options.onLoadCampaign?.(loaded);
      };

      panel.hide();
    }

    if (options.assets?.softCursorTextures?.['default']) {
      this.softCursorSprite = new Sprite(options.assets.softCursorTextures['default']);
      this.softCursorSprite.eventMode = 'none';
      this.uiCursorRenderGroup.addChild(this.softCursorSprite);
    }

    parent.addChild(this.container);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.boundEscapeHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        if (this.menuPanel?.isVisible()) {
          e.preventDefault();
          this.menuPanel.hide();
        } else if (
          this.menuPanel &&
          !this.battlePromptPanel.isVisible() &&
          !this.armyExchangePanel.isVisible()
        ) {
          e.preventDefault();
          this.menuPanel.show();
        }
      };
      window.addEventListener('keydown', this.boundEscapeHandler);
    }
  }

  public showSelectionAtHex(coords: Coords): void {
    if (!this.campaign) return;
    this.selectionPanel.showAtHex(this.campaign, coords);
  }

  public clearSelection(): void {
    this.selectionPanel.hide();
  }

  public updateCursorPosition(coords: Coords): void {
    if (this.softCursorSprite) {
      this.softCursorSprite.position.set(coords.x, coords.y);
    }
  }

  public updateFps(fps: number): void {
    if (this.fpsText && this.fpsText.visible) {
      this.fpsText.text = `FPS: ${Math.round(fps)}`;
    }
  }

  public bindCampaign(campaign: OverviewCampaign): void {
    this.campaign = campaign;
    this.refresh();
  }

  public refresh(): void {
    if (!this.campaign) return;
    const player = this.campaign.getPlayer('player');
    const standardRegions = this.campaign.regions.filter((r) => Boolean(r.settlementTier));
    const ownedCount = standardRegions.filter((r) => r.ownerPlayerId === 'player').length;

    const r = player?.resources;
    const deltas = this.campaign.getForeseenResourceChanges('player');
    this.summaryText.text =
      `Turn ${this.campaign.turnNumber}   |   ` +
      `Regions: ${ownedCount}/${standardRegions.length}`;
    this.resourceBadges.money.setValue(r?.money ?? 0, deltas.money);
    this.resourceBadges.food.setValue(r?.food ?? 0, deltas.food);
    this.resourceBadges.lumber.setValue(r?.lumber ?? 0, deltas.lumber);
    this.resourceBadges.stone.setValue(r?.stone ?? 0, deltas.stone);
    this.resourceBadges.iron.setValue(r?.iron ?? 0, deltas.iron);

    this.victoryBanner.visible = this.campaign.finished;
    if (this.campaign.finished) {
      this.victoryText.text =
        this.campaign.winnerPlayerId === 'player'
          ? 'CAMPAIGN VICTORY!'
          : 'CAMPAIGN ENDED';
    }
  }

  public destroy(): void {
    if (this.boundEscapeHandler && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', this.boundEscapeHandler);
      this.boundEscapeHandler = undefined;
    }
    this.resourceTooltip.destroy();
    this.battlePromptPanel.destroy();
    this.armyExchangePanel.destroy();
    this.menuPanel?.destroy();
    this.selectionPanel.destroy();
    this.merchantPanel.destroy();
    this.settlementPanel.destroy();
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
