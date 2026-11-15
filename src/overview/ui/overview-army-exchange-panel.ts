import { Container, Graphics, Text } from 'pixi.js';
import { OverviewCampaign } from '../overview-campaign';
import { MAX_SQUADS_PER_ARMY } from '../overview-economy';
import { OverviewArmy } from '../overview-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const PANEL_W = 860;
const PANEL_H = 660;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = (1080 - PANEL_H) / 2;

const COL_W = 360;
const ROW_H = 42;
const ROW_GAP = 6;
const LEFT_COL_X = PANEL_X + 36;
const RIGHT_COL_X = PANEL_X + PANEL_W - 36 - COL_W;
const SLOTS_START_Y = PANEL_Y + 112;

interface ExchangeSlotRow {
  bg: Graphics;
  label: Text;
  button: OverviewUiButton;
}

export class OverviewArmyExchangePanel {
  public readonly container = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelBg = new Graphics();
  private readonly titleText: Text;
  private readonly subtitleText: Text;
  private readonly leftHeaderText: Text;
  private readonly rightHeaderText: Text;

  public readonly leftSlots: ExchangeSlotRow[] = [];
  public readonly rightSlots: ExchangeSlotRow[] = [];
  public readonly doneButton: OverviewUiButton;

  private campaign: OverviewCampaign | null = null;
  private leftArmyId: string | null = null;
  private rightArmyId: string | null = null;
  private readonly onDone: () => void;

  constructor(parent: Container, onDone: () => void) {
    this.onDone = onDone;
    this.container.label = 'OverviewArmyExchangePanel';
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
      text: 'Army Squad Exchange',
      style: {
        fill: '#f5d46f',
        fontSize: 26,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(PANEL_X + PANEL_W / 2, PANEL_Y + 20);

    this.subtitleText = new Text({
      text: `Cannot merge armies: combined squads exceed ${MAX_SQUADS_PER_ARMY}. Transfer squads between armies.`,
      style: {
        fill: '#c9d7e8',
        fontSize: 15,
      },
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(PANEL_X + PANEL_W / 2, PANEL_Y + 54);

    this.leftHeaderText = new Text({
      text: 'Army A (0 / 10)',
      style: {
        fill: '#90c7ff',
        fontSize: 17,
        fontWeight: 'bold',
      },
    });
    this.leftHeaderText.position.set(LEFT_COL_X, PANEL_Y + 84);

    this.rightHeaderText = new Text({
      text: 'Army B (0 / 10)',
      style: {
        fill: '#90c7ff',
        fontSize: 17,
        fontWeight: 'bold',
      },
    });
    this.rightHeaderText.position.set(RIGHT_COL_X, PANEL_Y + 84);

    this.container.addChild(
      this.backdrop,
      this.panelBg,
      this.titleText,
      this.subtitleText,
      this.leftHeaderText,
      this.rightHeaderText
    );

    for (let i = 0; i < MAX_SQUADS_PER_ARMY; i++) {
      const y = SLOTS_START_Y + i * (ROW_H + ROW_GAP);

      const leftRow = this.createSlotRow(LEFT_COL_X, y, '->', true, () => {
        this.transferToRight(i);
      });
      this.leftSlots.push(leftRow);

      const rightRow = this.createSlotRow(RIGHT_COL_X, y, '<-', false, () => {
        this.transferToLeft(i);
      });
      this.rightSlots.push(rightRow);
    }

    this.doneButton = createOverviewButton(
      'Done',
      180,
      44,
      () => this.finish(),
      { fillColor: 0x264b33, borderColor: 0x8be28b, fontSize: 18 }
    );
    this.doneButton.container.position.set(
      PANEL_X + (PANEL_W - 180) / 2,
      PANEL_Y + PANEL_H - 60
    );
    this.container.addChild(this.doneButton.container);

    parent.addChild(this.container);
  }

  private createSlotRow(
    x: number,
    y: number,
    arrowLabel: string,
    arrowOnRight: boolean,
    onTransfer: () => void
  ): ExchangeSlotRow {
    const bg = new Graphics();
    const label = new Text({
      text: 'Empty',
      style: {
        fill: '#9aa7b8',
        fontSize: 14,
      },
    });
    label.anchor.set(0, 0.5);

    const button = createOverviewButton(arrowLabel, 46, 32, onTransfer, {
      fillColor: 0x2a4563,
      borderColor: 0xd4af37,
      fontSize: 16,
    });

    if (arrowOnRight) {
      label.position.set(x + 12, y + ROW_H / 2);
      button.container.position.set(x + COL_W - 54, y + (ROW_H - 32) / 2);
    } else {
      button.container.position.set(x + 8, y + (ROW_H - 32) / 2);
      label.position.set(x + 64, y + ROW_H / 2);
    }

    this.container.addChild(bg, label, button.container);
    return { bg, label, button };
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public show(
    campaign: OverviewCampaign,
    leftArmyId: string,
    rightArmyId: string
  ): void {
    this.campaign = campaign;
    this.leftArmyId = leftArmyId;
    this.rightArmyId = rightArmyId;
    this.container.visible = true;
    this.refresh();
  }

  public hide(): void {
    this.container.visible = false;
    this.campaign = null;
    this.leftArmyId = null;
    this.rightArmyId = null;
  }

  public transferToRight(slotIndex: number): boolean {
    const pair = this.getArmies();
    if (!pair) return false;
    const { leftArmy, rightArmy } = pair;
    if (
      slotIndex < 0 ||
      slotIndex >= leftArmy.squads.length ||
      rightArmy.squads.length >= MAX_SQUADS_PER_ARMY
    ) {
      return false;
    }
    const [moved] = leftArmy.squads.splice(slotIndex, 1);
    rightArmy.squads.push(moved);
    this.refresh();
    return true;
  }

  public transferToLeft(slotIndex: number): boolean {
    const pair = this.getArmies();
    if (!pair) return false;
    const { leftArmy, rightArmy } = pair;
    if (
      slotIndex < 0 ||
      slotIndex >= rightArmy.squads.length ||
      leftArmy.squads.length >= MAX_SQUADS_PER_ARMY
    ) {
      return false;
    }
    const [moved] = rightArmy.squads.splice(slotIndex, 1);
    leftArmy.squads.push(moved);
    this.refresh();
    return true;
  }

  public finish(): void {
    if (this.campaign) {
      const ids = [this.leftArmyId, this.rightArmyId].filter(
        (id): id is string => Boolean(id)
      );
      this.campaign.armies = this.campaign.armies.filter(
        (a) => !ids.includes(a.id) || a.squads.length > 0
      );
      this.campaign.recomputeFogOfWar();
    }
    this.hide();
    this.onDone();
  }

  private getArmies(): { leftArmy: OverviewArmy; rightArmy: OverviewArmy } | null {
    if (!this.campaign || !this.leftArmyId || !this.rightArmyId) return null;
    const leftArmy = this.campaign.getArmyById(this.leftArmyId);
    const rightArmy = this.campaign.getArmyById(this.rightArmyId);
    if (!leftArmy || !rightArmy) return null;
    return { leftArmy, rightArmy };
  }

  public refresh(): void {
    const pair = this.getArmies();
    if (!pair) return;
    const { leftArmy, rightArmy } = pair;

    this.leftHeaderText.text = `Moving Army (${leftArmy.squads.length} / ${MAX_SQUADS_PER_ARMY})`;
    this.rightHeaderText.text = `Target Army (${rightArmy.squads.length} / ${MAX_SQUADS_PER_ARMY})`;

    const canMoveToRight = rightArmy.squads.length < MAX_SQUADS_PER_ARMY;
    const canMoveToLeft = leftArmy.squads.length < MAX_SQUADS_PER_ARMY;

    for (let i = 0; i < MAX_SQUADS_PER_ARMY; i++) {
      const y = SLOTS_START_Y + i * (ROW_H + ROW_GAP);
      this.updateSlotRow(
        this.leftSlots[i],
        LEFT_COL_X,
        y,
        i,
        leftArmy.squads[i],
        canMoveToRight
      );
      this.updateSlotRow(
        this.rightSlots[i],
        RIGHT_COL_X,
        y,
        i,
        rightArmy.squads[i],
        canMoveToLeft
      );
    }
  }

  private updateSlotRow(
    row: ExchangeSlotRow,
    x: number,
    y: number,
    index: number,
    squad: OverviewArmy['squads'][number] | undefined,
    canTransfer: boolean
  ): void {
    row.bg.clear();
    if (squad) {
      row.bg
        .roundRect(x, y, COL_W, ROW_H, 6)
        .fill({ color: 0x1b2838, alpha: 0.95 })
        .stroke({ width: 1.5, color: 0x5c7fa3, alpha: 0.85 });
      row.label.text = `${index + 1}. ${squad.creatureType} (x${squad.count})`;
      row.label.style.fill = '#e8f1fa';
      row.button.setEnabled(canTransfer);
      row.button.container.visible = true;
    } else {
      row.bg
        .roundRect(x, y, COL_W, ROW_H, 6)
        .fill({ color: 0x121923, alpha: 0.65 })
        .stroke({ width: 1, color: 0x334154, alpha: 0.6 });
      row.label.text = `${index + 1}. Empty`;
      row.label.style.fill = '#6b7a8c';
      row.button.setEnabled(false);
      row.button.container.visible = false;
    }
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
