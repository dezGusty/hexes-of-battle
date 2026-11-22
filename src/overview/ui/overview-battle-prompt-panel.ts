import { Container, Graphics, Spritesheet, Text } from 'pixi.js';
import { BattleResult } from '../../battle/battle-types';
import {
  computeArmyLossesFromResult,
  renderArmyLossesColumn,
} from '../../ui/post-battle-panel';
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

const PROMPT_W = 620;
const PROMPT_H = 440;
const SUMMARY_W = 960;
const SUMMARY_H = 680;

export class OverviewBattlePromptPanel {
  public readonly container = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelBg = new Graphics();
  private readonly titleText: Text;
  private readonly bodyText: Text;

  private readonly promptGroup = new Container();
  private readonly summaryGroup = new Container();
  public readonly summaryReportGraphics = new Graphics();
  public readonly summaryReportContainer = new Container();

  public currentPanelWidth: number = PROMPT_W;
  public currentPanelHeight: number = PROMPT_H;

  public readonly quickBattleButton: OverviewUiButton;
  public readonly fightOnBattlefieldButton: OverviewUiButton;
  public readonly cancelButton: OverviewUiButton;

  public readonly acceptOutcomeButton: OverviewUiButton;
  public readonly viewBattleButton: OverviewUiButton;
  public readonly refuseOutcomeButton: OverviewUiButton;

  private unitsSheet?: Spritesheet;

  constructor(
    parent: Container,
    callbacks: BattlePromptCallbacks,
    unitsSheet?: Spritesheet
  ) {
    this.unitsSheet = unitsSheet;
    this.container.label = 'OverviewBattlePromptPanel';
    this.container.visible = false;

    this.backdrop
      .rect(0, 0, 1920, 1080)
      .fill({ color: 0x05080d, alpha: 0.65 });
    this.backdrop.eventMode = 'static';

    this.titleText = new Text({
      text: 'Battle Engagement',
      style: {
        fill: '#f5d46f',
        fontSize: 28,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5, 0);

    this.bodyText = new Text({
      text: '',
      style: {
        fill: '#e3ebf5',
        fontSize: 18,
        lineHeight: 28,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: PROMPT_W - 64,
      },
    });
    this.bodyText.anchor.set(0.5, 0);

    const promptX = (1920 - PROMPT_W) / 2;
    const promptY = (1080 - PROMPT_H) / 2;

    // Prompt mode buttons
    const btnW = 380;
    const btnH = 48;
    const btnX = promptX + (PROMPT_W - btnW) / 2;

    this.quickBattleButton = createOverviewButton(
      'Quick Battle',
      btnW,
      btnH,
      () => callbacks.onQuickBattle(),
      { fillColor: 0x2c4b6e, fontSize: 18 }
    );
    this.quickBattleButton.container.position.set(btnX, promptY + 210);

    this.fightOnBattlefieldButton = createOverviewButton(
      'Fight on the Battlefield',
      btnW,
      btnH,
      () => callbacks.onFightOnBattlefield(),
      { fillColor: 0x6b2c2c, fontSize: 18 }
    );
    this.fightOnBattlefieldButton.container.position.set(btnX, promptY + 272);

    this.cancelButton = createOverviewButton(
      'Cancel',
      200,
      40,
      () => callbacks.onCancel(),
      { fillColor: 0x243040, borderColor: 0x7c8a99, fontSize: 16 }
    );
    this.cancelButton.container.position.set(promptX + (PROMPT_W - 200) / 2, promptY + 344);

    this.promptGroup.addChild(
      this.quickBattleButton.container,
      this.fightOnBattlefieldButton.container,
      this.cancelButton.container
    );

    // Quick battle summary mode (2-column post-battle report + bottom buttons)
    const summaryX = (1920 - SUMMARY_W) / 2;
    const summaryY = (1080 - SUMMARY_H) / 2;
    const summaryBtnY = summaryY + SUMMARY_H - 68;

    this.acceptOutcomeButton = createOverviewButton(
      'Accept Outcome',
      268,
      44,
      () => callbacks.onAcceptOutcome(),
      { fillColor: 0x255c3e, fontSize: 16 }
    );
    this.acceptOutcomeButton.container.position.set(summaryX + 34, summaryBtnY);

    this.viewBattleButton = createOverviewButton(
      'View Battle (Replay)',
      268,
      44,
      () => callbacks.onViewBattle(),
      { fillColor: 0x2c4b6e, fontSize: 16 }
    );
    this.viewBattleButton.container.position.set(summaryX + 318, summaryBtnY);

    this.refuseOutcomeButton = createOverviewButton(
      'Refuse Outcome (Fight Manually)',
      324,
      44,
      () => callbacks.onRefuseOutcome(),
      { fillColor: 0x6b2c2c, borderColor: 0xe67e73, fontSize: 15 }
    );
    this.refuseOutcomeButton.container.position.set(summaryX + 602, summaryBtnY);

    this.summaryGroup.addChild(
      this.summaryReportGraphics,
      this.summaryReportContainer,
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

    this.applyPanelDimensions(PROMPT_W, PROMPT_H);
    parent.addChild(this.container);
  }

  public setUnitsSpritesheet(unitsSheet?: Spritesheet): void {
    this.unitsSheet = unitsSheet;
  }

  private applyPanelDimensions(width: number, height: number): { x: number; y: number } {
    this.currentPanelWidth = width;
    this.currentPanelHeight = height;
    const x = (1920 - width) / 2;
    const y = (1080 - height) / 2;

    this.panelBg.clear();
    this.panelBg
      .roundRect(x, y, width, height, 12)
      .fill({ color: 0x111924, alpha: 0.98 })
      .stroke({ width: 2.5, color: 0xd4af37, alpha: 0.95 });

    this.titleText.position.set(x + width / 2, y + 22);
    this.bodyText.style.wordWrapWidth = width - 64;
    this.bodyText.position.set(x + width / 2, y + 62);

    return { x, y };
  }

  public showPrompt(info: BattlePromptInfo): void {
    this.applyPanelDimensions(PROMPT_W, PROMPT_H);
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
    const { x: panelX, y: panelY } = this.applyPanelDimensions(SUMMARY_W, SUMMARY_H);

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

    const locationPrefix = info.regionName ? `${info.regionName} · ` : '';
    this.bodyText.text = `${locationPrefix}Turns: ${result.turnsTaken}`;

    this.summaryReportGraphics.clear();
    this.summaryReportContainer.removeChildren().forEach((c) => c.destroy({ children: true }));

    // Central Vertical Divider
    const headerY = panelY + 102;
    this.summaryReportGraphics
      .moveTo(panelX + SUMMARY_W * 0.5, headerY)
      .lineTo(panelX + SUMMARY_W * 0.5, panelY + SUMMARY_H - 86)
      .stroke({ width: 2, color: 0x3b424f, alpha: 0.7 });

    const colWidth = 430;
    const colLeftX = panelX + 30;
    const colRightX = panelX + SUMMARY_W * 0.5 + 20;

    const p1Summary = computeArmyLossesFromResult(0, result, info.attackerName);
    const p2Summary = computeArmyLossesFromResult(1, result, info.defenderName);

    renderArmyLossesColumn(
      this.summaryReportGraphics,
      this.summaryReportContainer,
      p1Summary,
      colLeftX,
      headerY,
      colWidth,
      0,
      this.unitsSheet,
      11
    );
    renderArmyLossesColumn(
      this.summaryReportGraphics,
      this.summaryReportContainer,
      p2Summary,
      colRightX,
      headerY,
      colWidth,
      1,
      this.unitsSheet,
      11
    );

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
