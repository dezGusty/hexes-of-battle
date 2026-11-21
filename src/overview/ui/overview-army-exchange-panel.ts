import { Assets, Container, Graphics, Sprite, Spritesheet, Text, Texture } from 'pixi.js';
import { CreatureType } from '../../battle/creature';
import { OverviewCampaign } from '../overview-campaign';
import { MAX_SQUADS_PER_ARMY } from '../overview-economy';
import { OverviewArmy } from '../overview-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const PANEL_W = 860;
const PANEL_H = 680;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = (1080 - PANEL_H) / 2;

const COL_W = 360;
const ROW_H = 46;
const ROW_GAP = 6;
const LEFT_COL_X = PANEL_X + 36;
const RIGHT_COL_X = PANEL_X + PANEL_W - 36 - COL_W;
const SLOTS_START_Y = PANEL_Y + 112;
const PORTRAIT_SIZE = 34;
const HP_BAR_W = 6;
const HP_BAR_H = 36;

const CREATURE_DISPLAY_NAMES: Record<number, string> = {
  [CreatureType.PEASANT]: 'Peasant',
  [CreatureType.PEASANT_ARCHER]: 'Peasant Archer',
  [CreatureType.SWORDSMAN]: 'Swordsman',
  [CreatureType.SPEARMAN]: 'Spearman',
  [CreatureType.CROSSBOWMAN]: 'Crossbowman',
  [CreatureType.ARCHER]: 'Archer',
  [CreatureType.BARBARIAN]: 'Barbarian',
  [CreatureType.HEAVY_KNIGHTS]: 'Heavy Knight',
  [CreatureType.BEHEMOTH]: 'Behemoth',
  [CreatureType.HERO_COMMANDER]: 'Commander',
  [CreatureType.SLINGER]: 'Slinger',
  [CreatureType.HEALER]: 'Healer',
  [CreatureType.MACEMAN]: 'Maceman',
  [CreatureType.ARMORED_KNIGHT]: 'Armored Knight',
};

export function getExchangeCreatureDisplayName(creatureType: CreatureType): string {
  return CREATURE_DISPLAY_NAMES[creatureType] ?? `Unit ${creatureType}`;
}

export function getExchangeFaceKey(creatureType: CreatureType): string {
  switch (creatureType) {
    case CreatureType.PEASANT_ARCHER:
    case CreatureType.ARCHER:
      return 'peasant_archer_face.png';
    case CreatureType.SWORDSMAN:
    case CreatureType.HERO_COMMANDER:
    case CreatureType.ARMORED_KNIGHT:
      return 'swordman_face.png';
    case CreatureType.SPEARMAN:
    case CreatureType.MACEMAN:
      return 'spearman_face.png';
    case CreatureType.CROSSBOWMAN:
      return 'crossbowman_face.png';
    case CreatureType.BARBARIAN:
    case CreatureType.BEHEMOTH:
      return 'barbarian_face.png';
    case CreatureType.SLINGER:
      return 'slinger_face.png';
    case CreatureType.PEASANT:
    case CreatureType.HEALER:
    default:
      return 'peasant_face.png';
  }
}

interface ExchangeSlotRow {
  bg: Graphics;
  healthBar: Graphics;
  portraitFrame: Graphics;
  portrait: Sprite;
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
  private unitsSheet?: Spritesheet;

  constructor(parent: Container, onDone: () => void, unitsSheet?: Spritesheet) {
    this.onDone = onDone;
    this.unitsSheet = unitsSheet;
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
      text: `Army A (0 / ${MAX_SQUADS_PER_ARMY})`,
      style: {
        fill: '#90c7ff',
        fontSize: 17,
        fontWeight: 'bold',
      },
    });
    this.leftHeaderText.position.set(LEFT_COL_X, PANEL_Y + 84);

    this.rightHeaderText = new Text({
      text: `Army B (0 / ${MAX_SQUADS_PER_ARMY})`,
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

  public setUnitsSheet(unitsSheet?: Spritesheet): void {
    this.unitsSheet = unitsSheet;
    if (this.container.visible) {
      this.refresh();
    }
  }

  private getPortraitTexture(creatureType: CreatureType): Texture {
    const faceKey = getExchangeFaceKey(creatureType);
    const fromSheet = this.unitsSheet?.textures?.[faceKey];
    if (fromSheet) return fromSheet;
    try {
      const cached = Assets.cache.get(faceKey) as Texture | undefined;
      if (cached) return cached;
    } catch {
      // Ignore cache miss in headless tests
    }
    return Texture.EMPTY;
  }

  private createSlotRow(
    x: number,
    y: number,
    arrowLabel: string,
    arrowOnRight: boolean,
    onTransfer: () => void
  ): ExchangeSlotRow {
    const bg = new Graphics();
    const healthBar = new Graphics();
    const portraitFrame = new Graphics();
    const portrait = new Sprite(Texture.EMPTY);
    portrait.width = PORTRAIT_SIZE - 2;
    portrait.height = PORTRAIT_SIZE - 2;
    portrait.visible = false;

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

    const barX = arrowOnRight ? x + 8 : x + 62;
    const barY = y + (ROW_H - HP_BAR_H) / 2;
    const portX = barX + HP_BAR_W + 4;
    const portY = y + (ROW_H - PORTRAIT_SIZE) / 2;
    const labelX = portX + PORTRAIT_SIZE + 8;

    portraitFrame.position.set(portX, portY);
    portrait.position.set(portX + 1, portY + 1);
    healthBar.position.set(barX, barY);
    label.position.set(labelX, y + ROW_H / 2);

    if (arrowOnRight) {
      button.container.position.set(x + COL_W - 54, y + (ROW_H - 32) / 2);
    } else {
      button.container.position.set(x + 8, y + (ROW_H - 32) / 2);
    }

    this.container.addChild(
      bg,
      healthBar,
      portraitFrame,
      portrait,
      label,
      button.container
    );
    return { bg, healthBar, portraitFrame, portrait, label, button };
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
    row.healthBar.clear();
    row.portraitFrame.clear();

    if (squad) {
      row.bg
        .roundRect(x, y, COL_W, ROW_H, 6)
        .fill({ color: 0x1b2838, alpha: 0.95 })
        .stroke({ width: 1.5, color: 0x5c7fa3, alpha: 0.85 });

      const hp = Math.max(0, Math.min(1, squad.hpPercent ?? 1));
      const hpColor = hp >= 0.65 ? 0x46d160 : hp >= 0.35 ? 0xf0b432 : 0xe24a4a;
      const innerH = HP_BAR_H - 2;
      const fillH = Math.max(2, Math.round(innerH * hp));
      row.healthBar
        .roundRect(0, 0, HP_BAR_W, HP_BAR_H, 2)
        .fill({ color: 0x0b1016, alpha: 0.95 })
        .stroke({ width: 1, color: 0x3b4d63, alpha: 0.85 });
      row.healthBar
        .rect(1, 1 + (innerH - fillH), HP_BAR_W - 2, fillH)
        .fill({ color: hpColor, alpha: 0.98 });
      row.healthBar.visible = true;

      row.portraitFrame
        .roundRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE, 4)
        .fill({ color: 0x0f1722, alpha: 0.95 })
        .stroke({ width: 1, color: 0x8ea4be, alpha: 0.8 });
      row.portraitFrame.visible = true;

      const tex = this.getPortraitTexture(squad.creatureType);
      row.portrait.texture = tex;
      row.portrait.width = PORTRAIT_SIZE - 2;
      row.portrait.height = PORTRAIT_SIZE - 2;
      row.portrait.visible = tex !== Texture.EMPTY;

      const name = getExchangeCreatureDisplayName(squad.creatureType);
      row.label.text = `${index + 1}. ${name} (x${squad.count})`;
      row.label.style.fill = '#e8f1fa';
      row.button.setEnabled(canTransfer);
      row.button.container.visible = true;
    } else {
      row.bg
        .roundRect(x, y, COL_W, ROW_H, 6)
        .fill({ color: 0x121923, alpha: 0.65 })
        .stroke({ width: 1, color: 0x334154, alpha: 0.6 });
      row.healthBar.visible = false;
      row.portraitFrame.visible = false;
      row.portrait.visible = false;
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
