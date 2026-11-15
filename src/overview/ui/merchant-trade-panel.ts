import { Container, Graphics, Text } from 'pixi.js';
import { MERCHANT_PRICES, tradeWithMerchant } from '../overview-economy';
import { OverviewPlayer, OverviewResourceType } from '../overview-types';
import {
  createOverviewResourceBadge,
  OverviewResourceBadge,
  OverviewResourceTooltip,
  ResourceIconKey,
} from './overview-resource-icons';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const TRADE_RESOURCES: Array<{
  key: Exclude<OverviewResourceType, 'money'>;
  label: string;
}> = [
  { key: 'food', label: 'Food' },
  { key: 'lumber', label: 'Lumber' },
  { key: 'stone', label: 'Stone' },
  { key: 'iron', label: 'Iron' },
  { key: 'grain', label: 'Grain' },
  { key: 'cattle', label: 'Cattle' },
  { key: 'sheep', label: 'Sheep' },
  { key: 'horses', label: 'Horses' },
];

export class MerchantTradePanel {
  public readonly container = new Container();
  private readonly panelWidth = 760;
  private readonly panelHeight = 620;
  private readonly bg = new Graphics();
  private readonly contentContainer = new Container();
  private readonly moneyBadge: OverviewResourceBadge;
  private tooltip?: OverviewResourceTooltip;
  private player?: OverviewPlayer;
  private onTradeCompleted?: () => void;
  public readonly buyButtons: Map<string, OverviewUiButton> = new Map();
  public readonly sellButtons: Map<string, OverviewUiButton> = new Map();

  constructor(
    parent: Container,
    onTradeCompleted?: () => void,
    tooltip?: OverviewResourceTooltip
  ) {
    this.onTradeCompleted = onTradeCompleted;
    this.tooltip = tooltip;
    this.container.label = 'MerchantTradePanel';
    this.container.visible = false;
    this.container.position.set(
      (1920 - this.panelWidth) / 2,
      (1080 - this.panelHeight) / 2
    );

    this.bg
      .roundRect(0, 0, this.panelWidth, this.panelHeight, 10)
      .fill({ color: 0x121821, alpha: 0.96 })
      .stroke({ width: 2.5, color: 0xd4af37, alpha: 0.95 });
    this.container.addChild(this.bg);

    const title = new Text({
      text: 'WANDERING MERCHANT',
      style: { fill: '#f4d03f', fontSize: 26, fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.position.set(this.panelWidth / 2, 20);
    this.container.addChild(title);

    this.moneyBadge = createOverviewResourceBadge('money', {
      iconSize: 32,
      fontSize: 20,
      textColor: '#f5d46f',
      tooltip: this.tooltip,
      getAnchorStagePos: () => ({
        x: this.container.x + 32,
        y: this.container.y + 62,
      }),
    });
    this.moneyBadge.container.position.set(32, 58);
    this.container.addChild(this.moneyBadge.container);

    const closeBtn = createOverviewButton(
      'Close',
      140,
      44,
      () => this.hide(),
      { fillColor: 0x3b2a2a, fontSize: 18 }
    );
    closeBtn.container.position.set((this.panelWidth - 140) / 2, this.panelHeight - 62);
    this.container.addChild(closeBtn.container);

    this.container.addChild(this.contentContainer);
    parent.addChild(this.container);
  }

  public show(player: OverviewPlayer): void {
    this.player = player;
    this.refresh();
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public refresh(): void {
    if (!this.player) return;
    this.moneyBadge.setValue(this.player.resources.money);
    this.contentContainer.removeChildren();
    this.buyButtons.clear();
    this.sellButtons.clear();

    const startY = 104;
    const rowHeight = 54;
    const iconResourceKeys = new Set<ResourceIconKey>([
      'food',
      'lumber',
      'stone',
      'iron',
    ]);

    TRADE_RESOURCES.forEach((item, index) => {
      const y = startY + index * rowHeight;
      const prices = MERCHANT_PRICES[item.key];
      const stock = this.player!.resources[item.key];

      const rowBg = new Graphics()
        .roundRect(28, y, this.panelWidth - 56, 46, 6)
        .fill({ color: 0x1b2430, alpha: 0.9 });
      this.contentContainer.addChild(rowBg);

      if (iconResourceKeys.has(item.key as ResourceIconKey)) {
        const badge = createOverviewResourceBadge(item.key as ResourceIconKey, {
          iconSize: 30,
          fontSize: 19,
          textColor: '#e8eef5',
          tooltip: this.tooltip,
          getAnchorStagePos: () => ({
            x: this.container.x + 44,
            y: this.container.y + y + 8,
          }),
        });
        badge.setValue(stock);
        badge.container.position.set(44, y + 8);
        this.contentContainer.addChild(badge.container);
      } else {
        const nameText = new Text({
          text: `${item.label}: ${stock}`,
          style: { fill: '#e8eef5', fontSize: 19, fontWeight: 'bold' },
        });
        nameText.position.set(44, y + 12);
        this.contentContainer.addChild(nameText);
      }

      const buyBtn = createOverviewButton(
        `Buy +5 (${prices.buy * 5}g)`,
        175,
        36,
        () => {
          if (this.player && tradeWithMerchant(this.player, item.key, 5, 'buy')) {
            this.refresh();
            this.onTradeCompleted?.();
          }
        },
        { fillColor: 0x204030, fontSize: 16 }
      );
      buyBtn.container.position.set(340, y + 5);
      buyBtn.setEnabled(this.player!.resources.money >= prices.buy * 5);
      this.buyButtons.set(item.key, buyBtn);
      this.contentContainer.addChild(buyBtn.container);

      const sellBtn = createOverviewButton(
        `Sell -5 (+${prices.sell * 5}g)`,
        175,
        36,
        () => {
          if (this.player && tradeWithMerchant(this.player, item.key, 5, 'sell')) {
            this.refresh();
            this.onTradeCompleted?.();
          }
        },
        { fillColor: 0x453520, fontSize: 16 }
      );
      sellBtn.container.position.set(530, y + 5);
      sellBtn.setEnabled(stock >= 5);
      this.sellButtons.set(item.key, sellBtn);
      this.contentContainer.addChild(sellBtn.container);
    });
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
