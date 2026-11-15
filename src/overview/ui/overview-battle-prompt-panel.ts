import { Container, Graphics, Text } from 'pixi.js';
import { BattleResult } from '../../battle/battle-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

export interface BattlePromptInfo {
  attackerName: string;
  defenderName: string;
  attackerSquadCount: number;
  defenderSquadCount: number;
  regionName?: string;
}

export interface BattlePromptCallbacks {
  onQuickBattle: () => void;
  onFightOnBattlefield: () => void;
  onCancel: () => void;
  onAcceptOutcome: () => void;
  onViewBattle: () => void;
  onRefuseOutcome: () => void;
}

const PANEL_W = 620;
const PANEL_H = 440;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = (1080 - PANEL_H) / 2;

export class OverviewBattlePromptPanel {
  public readonly container = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelBg = new Graphics();
  private readonly titleText: Text;
  private readonly bodyText: Text;

  private readonly promptGroup = new Container();
  private readonly summaryGroup = new Container();

  public readonly quickBattleButton: OverviewUiButton;
  public readonly fightOnBattlefieldButton: OverviewUiButton;
  public readonly cancelButton: OverviewUiButton;

  public readonly acceptOutcomeButton: OverviewUiButton;
  public readonly viewBattleButton: OverviewUiButton;
  public readonly refuseOutcomeButton: OverviewUiButton;

  constructor(
    parent: Container,
    callbacks: BattlePromptCallbacks
  ) {
    this.container.label = 'OverviewBattlePromptPanel';
    this.container.visible = false;

    this.backdrop
      .rect(0, 0, 1920, 1080)
      .fill({ color: 0x05080d, alpha: 0.65 });
    this.backdrop.eventMode = 'static';

    this.panelBg
      .roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12)
      .fill({ color: 0x111924, alpha: 0.98 })
      .stroke({ width: 2.5, color: 0xd4af37, alpha: 0.95 });

    this.titleText = new Text({
      text: 'Battle Engagement',
      style: {
        fill: '#f5d46f',
        fontSize: 28,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(PANEL_X + PANEL_W / 2, PANEL_Y + 24);

    this.bodyText = new Text({
      text: '',
      style: {
        fill: '#e3ebf5',
        fontSize: 18,
        lineHeight: 28,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: PANEL_W - 64,
      },
    });
    this.bodyText.anchor.set(0.5, 0);
    this.bodyText.position.set(PANEL_X + PANEL_W / 2, PANEL_Y + 76);

    // Prompt mode buttons
    const btnW = 380;
    const btnH = 48;
    const btnX = PANEL_X + (PANEL_W - btnW) / 2;

    this.quickBattleButton = createOverviewButton(
      'Quick Battle',
      btnW,
      btnH,
      () => callbacks.onQuickBattle(),
      { fillColor: 0x2c4b6e, fontSize: 18 }
    );
    this.quickBattleButton.container.position.set(btnX, PANEL_Y + 210);

    this.fightOnBattlefieldButton = createOverviewButton(
      'Fight on the Battlefield',
      btnW,
      btnH,
      () => callbacks.onFightOnBattlefield(),
      { fillColor: 0x6b2c2c, fontSize: 18 }
    );
    this.fightOnBattlefieldButton.container.position.set(btnX, PANEL_Y + 272);

    this.cancelButton = createOverviewButton(
      'Cancel',
      200,
      40,
      () => callbacks.onCancel(),
      { fillColor: 0x243040, borderColor: 0x7c8a99, fontSize: 16 }
    );
    this.cancelButton.container.position.set(PANEL_X + (PANEL_W - 200) / 2, PANEL_Y + 344);

    this.promptGroup.addChild(
      this.quickBattleButton.container,
      this.fightOnBattlefieldButton.container,
      this.cancelButton.container
    );

    // Quick battle summary mode buttons
    this.acceptOutcomeButton = createOverviewButton(
      'Accept Outcome',
      btnW,
      btnH,
      () => callbacks.onAcceptOutcome(),
      { fillColor: 0x255c3e, fontSize: 18 }
    );
    this.acceptOutcomeButton.container.position.set(btnX, PANEL_Y + 220);

    this.viewBattleButton = createOverviewButton(
      'View Battle (Replay)',
      btnW,
      btnH,
      () => callbacks.onViewBattle(),
      { fillColor: 0x2c4b6e, fontSize: 18 }
    );
    this.viewBattleButton.container.position.set(btnX, PANEL_Y + 280);

    this.refuseOutcomeButton = createOverviewButton(
      'Refuse Outcome (Fight Manually)',
      btnW,
      44,
      () => callbacks.onRefuseOutcome(),
      { fillColor: 0x6b2c2c, borderColor: 0xe67e73, fontSize: 16 }
    );
    this.refuseOutcomeButton.container.position.set(btnX, PANEL_Y + 342);

    this.summaryGroup.addChild(
      this.acceptOutcomeButton.container,
      this.viewBattleButton.container,
      this.refuseOutcomeButton.container
    );
    this.summaryGroup.visible = false;

    this.container.addChild(
      this.backdrop,
      this.panelBg,
      this.titleText,
      this.bodyText,
      this.promptGroup,
      this.summaryGroup
    );

    parent.addChild(this.container);
  }

  public showPrompt(info: BattlePromptInfo): void {
    this.titleText.text = 'Battle Engagement';
    this.titleText.style.fill = '#f5d46f';

    const locationLine = info.regionName ? `Location: ${info.regionName}\n` : '';
    this.bodyText.text =
      `${locationLine}` +
      `${info.attackerName} (${info.attackerSquadCount} squads)\n` +
      `vs\n` +
      `${info.defenderName} (${info.defenderSquadCount} squads)`;

    this.promptGroup.visible = true;
    this.summaryGroup.visible = false;
    this.container.visible = true;
  }

  public showQuickBattleSummary(
    info: BattlePromptInfo,
    result: BattleResult
  ): void {
    const victorLabel =
      result.victorArmyIndex === 0
        ? 'VICTORY!'
        : result.victorArmyIndex === 1
          ? 'DEFEAT'
          : 'DRAW';
    this.titleText.text = `Quick Battle — ${victorLabel}`;
    this.titleText.style.fill =
      result.victorArmyIndex === 0
        ? '#5fe08d'
        : result.victorArmyIndex === 1
          ? '#ff7070'
          : '#f5d46f';

    const attackerSurvivors = result.survivingCreatures.filter(
      (c) => c.armyAlignment === 0 && c.live_stats.remaining_health > 0
    ).length;
    const defenderSurvivors = result.survivingCreatures.filter(
      (c) => c.armyAlignment === 1 && c.live_stats.remaining_health > 0
    ).length;
    const attackerLosses = Math.max(0, info.attackerSquadCount - attackerSurvivors);
    const defenderLosses = Math.max(0, info.defenderSquadCount - defenderSurvivors);

    this.bodyText.text =
      `Turns: ${result.turnsTaken}\n` +
      `${info.attackerName}: ${attackerSurvivors} survived, ${attackerLosses} lost\n` +
      `${info.defenderName}: ${defenderSurvivors} survived, ${defenderLosses} lost`;

    this.promptGroup.visible = false;
    this.summaryGroup.visible = true;
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
