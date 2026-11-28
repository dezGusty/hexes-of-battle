import { Container, Graphics, Text } from 'pixi.js';
import { RegionState } from '../overview-types';

function formatTier(tier?: string): string {
  if (!tier) return 'Region';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function formatOwner(ownerId: string | null | undefined): string {
  if (ownerId === 'player') return 'Player';
  if (!ownerId) return 'Neutral';
  return ownerId.charAt(0).toUpperCase() + ownerId.slice(1);
}

function parseColorHex(color: string | undefined, fallback: number = 0x8c929a): number {
  if (!color) return fallback;
  const cleaned = color.trim().replace(/^#/, '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Top-of-screen medieval parchment scroll banner displayed when the player
 * hovers over a discovered region on the global overview map.
 */
export class OverviewRegionHoverBanner {
  public readonly container = new Container();
  private readonly scrollBg = new Graphics();
  private readonly crestDot = new Graphics();
  private readonly titleText: Text;
  private readonly subtitleText: Text;
  private currentRegionId: string | null = null;

  private static readonly SCROLL_WIDTH = 340;
  private static readonly SCROLL_HEIGHT = 54;

  constructor(parent: Container) {
    this.container.label = 'OverviewRegionHoverBanner';
    this.container.visible = false;
    this.container.eventMode = 'none';
    this.container.position.set(
      (1920 - OverviewRegionHoverBanner.SCROLL_WIDTH) * 0.5,
      70
    );

    this.drawScrollBody();

    this.titleText = new Text({
      text: '',
      style: {
        fill: '#2b1b0e',
        fontFamily: 'Georgia, serif',
        fontSize: 21,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(OverviewRegionHoverBanner.SCROLL_WIDTH * 0.5, 6);

    this.subtitleText = new Text({
      text: '',
      style: {
        fill: '#5c4328',
        fontFamily: 'Georgia, serif',
        fontSize: 13,
        fontWeight: 'bold',
      },
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(OverviewRegionHoverBanner.SCROLL_WIDTH * 0.5, 31);

    this.container.addChild(this.scrollBg, this.crestDot, this.titleText, this.subtitleText);
    parent.addChild(this.container);
  }

  private drawScrollBody(): void {
    const w = OverviewRegionHoverBanner.SCROLL_WIDTH;
    const h = OverviewRegionHoverBanner.SCROLL_HEIGHT;
    const rollW = 14;

    this.scrollBg.clear();
    // Subtle drop shadow
    this.scrollBg
      .roundRect(rollW - 2, 4, w - rollW * 2 + 4, h, 4)
      .fill({ color: 0x090c12, alpha: 0.42 });

    // Main aged parchment body
    this.scrollBg
      .roundRect(rollW, 0, w - rollW * 2, h, 3)
      .fill({ color: 0xefe1be, alpha: 0.96 })
      .stroke({ width: 1.5, color: 0x8f6b32, alpha: 0.95 });

    // Inner decorative hairline border
    this.scrollBg
      .rect(rollW + 6, 4, w - rollW * 2 - 12, h - 8)
      .stroke({ width: 1, color: 0xc29b57, alpha: 0.55 });

    // Left & right rolled parchment ends
    this.scrollBg
      .roundRect(0, -3, rollW + 4, h + 6, 6)
      .fill({ color: 0xd9c08f, alpha: 0.98 })
      .stroke({ width: 1.5, color: 0x8f6b32, alpha: 0.95 });
    this.scrollBg
      .roundRect(w - rollW - 4, -3, rollW + 4, h + 6, 6)
      .fill({ color: 0xd9c08f, alpha: 0.98 })
      .stroke({ width: 1.5, color: 0x8f6b32, alpha: 0.95 });

    // Gold scroll finials (top & bottom caps on both rolls)
    for (const cx of [rollW * 0.5 + 1, w - rollW * 0.5 - 1]) {
      this.scrollBg.circle(cx, -4, 3.5).fill({ color: 0xd4af37, alpha: 0.98 });
      this.scrollBg.circle(cx, h + 4, 3.5).fill({ color: 0xd4af37, alpha: 0.98 });
    }
  }

  public showRegion(region: RegionState, factionColor?: string): void {
    this.currentRegionId = region.id;
    this.titleText.text = region.name;
    this.subtitleText.text = `${formatTier(region.settlementTier)} • ${formatOwner(region.ownerPlayerId)}`;

    const accent = parseColorHex(factionColor);
    this.crestDot.clear();
    this.crestDot
      .circle(34, OverviewRegionHoverBanner.SCROLL_HEIGHT * 0.5, 7)
      .fill({ color: accent, alpha: 0.95 })
      .stroke({ width: 1.5, color: 0x6e4e1e, alpha: 0.95 });

    this.container.visible = true;
  }

  public hide(): void {
    this.currentRegionId = null;
    this.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public getDisplayedRegionId(): string | null {
    return this.currentRegionId;
  }

  public getDisplayedTitle(): string {
    return this.titleText.text;
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
