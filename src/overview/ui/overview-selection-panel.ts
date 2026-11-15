import { Container, Graphics, Text } from 'pixi.js';
import { Coords } from '../../shared';
import { OverviewCampaign } from '../overview-campaign';
import { OverviewArmy, OverviewHex, RegionState } from '../overview-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const PANEL_W = 410;
const PANEL_H = 270;

function formatLabel(raw: string): string {
  return raw
    .split('_')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function summarizeSquads(army: OverviewArmy): string {
  const counts = new Map<string, number>();
  for (const sq of army.squads) {
    const key = String(sq.creatureType);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => `${formatLabel(type)} x${count}`)
    .join(', ');
}

export class OverviewSelectionPanel {
  public readonly container = new Container();
  private readonly titleText: Text;
  private readonly subtitleText: Text;
  private readonly bodyText: Text;
  private readonly manageButton: OverviewUiButton;
  private readonly closeButton: OverviewUiButton;

  private activeRegionId: string | null = null;
  private onManageRegion?: (regionId: string) => void;

  constructor(parent: Container, onManageRegion?: (regionId: string) => void) {
    this.onManageRegion = onManageRegion;
    this.container.label = 'OverviewSelectionPanel';
    this.container.position.set(1920 - PANEL_W - 20, 1080 - PANEL_H - 20);
    this.container.visible = false;

    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, PANEL_H, 10)
      .fill({ color: 0x0f151e, alpha: 0.93 })
      .stroke({ width: 2, color: 0xd4af37, alpha: 0.9 });
    bg.eventMode = 'static';

    this.titleText = new Text({
      text: '',
      style: { fill: '#f4d03f', fontSize: 20, fontWeight: 'bold' },
    });
    this.titleText.position.set(16, 14);

    this.subtitleText = new Text({
      text: '',
      style: { fill: '#9fb6cf', fontSize: 14 },
    });
    this.subtitleText.position.set(16, 42);

    this.bodyText = new Text({
      text: '',
      style: {
        fill: '#eef4fb',
        fontSize: 15,
        lineHeight: 22,
        wordWrap: true,
        wordWrapWidth: PANEL_W - 32,
      },
    });
    this.bodyText.position.set(16, 72);

    this.closeButton = createOverviewButton(
      'X',
      34,
      30,
      () => this.hide(),
      { fillColor: 0x3b2226, fontSize: 14 }
    );
    this.closeButton.container.position.set(PANEL_W - 44, 10);

    this.manageButton = createOverviewButton(
      'Manage Region',
      170,
      38,
      () => {
        if (this.activeRegionId) {
          this.onManageRegion?.(this.activeRegionId);
        }
      },
      { fillColor: 0x263a4d, fontSize: 15 }
    );
    this.manageButton.container.position.set(PANEL_W - 186, PANEL_H - 50);
    this.manageButton.container.visible = false;

    this.container.addChild(
      bg,
      this.titleText,
      this.subtitleText,
      this.bodyText,
      this.closeButton.container,
      this.manageButton.container
    );
    parent.addChild(this.container);
  }

  public showAtHex(campaign: OverviewCampaign, coords: Coords): void {
    const hex: OverviewHex | null = campaign.getHex(coords);
    if (!hex) {
      this.hide();
      return;
    }

    const army = campaign.getArmyAt(coords);
    const region: RegionState | undefined = campaign.getRegionById(hex.regionId);
    const isInteractiveHex = Boolean(
      army || hex.isSettlement || hex.resourceBuilding || hex.isAgriculturalPlot
    );

    if (!isInteractiveHex) {
      this.hide();
      return;
    }

    const ownerLabel = (ownerId: string | null | undefined) =>
      ownerId === 'player' ? 'Player' : ownerId ? formatLabel(ownerId) : 'Neutral';

    const lines: string[] = [];

    if (army) {
      this.titleText.text =
        army.ownerPlayerId === 'player'
          ? 'Player Army'
          : army.ownerPlayerId === null
            ? 'Neutral Army'
            : 'Rival Army';
      this.subtitleText.text = `Hex (${coords.x}, ${coords.y}) • ${army.squads.length} Squads`;
      lines.push(`Move: ${army.movementPoints} / ${army.maxMovementPoints}`);
      if (army.ownerPlayerId === 'player') {
        lines.push('Right-click a highlighted hex to move');
      }
      lines.push(`Forces: ${summarizeSquads(army)}`);
      if (hex.isSettlement && region) {
        lines.push(
          `Garrisoned at ${formatLabel(region.settlementTier ?? 'settlement')} (${ownerLabel(region.ownerPlayerId)})`
        );
      }
    } else if (hex.isSettlement && region) {
      const tier = formatLabel(region.settlementTier ?? 'settlement');
      this.titleText.text = `${tier} (${region.id})`;
      this.subtitleText.text = `Owner: ${ownerLabel(region.ownerPlayerId)} • Hex (${coords.x}, ${coords.y})`;
      lines.push(`Population: ${region.population}`);
      lines.push(`Defense: ${formatLabel(region.defenseTier)}`);
      lines.push(`Preset: ${formatLabel(region.preset)}`);
    } else if (hex.resourceBuilding) {
      this.titleText.text = formatLabel(hex.resourceBuilding);
      this.subtitleText.text = `Region: ${hex.regionId} (${ownerLabel(region?.ownerPlayerId)}) • (${coords.x}, ${coords.y})`;
      lines.push(`Assigned Workers: ${hex.assignedWorkers}`);
      lines.push(`Terrain: ${formatLabel(hex.terrain)}`);
    } else if (hex.isAgriculturalPlot) {
      const opt = hex.agricultureOption ?? 'none';
      const crop = opt === 'none' ? 'Unassigned' : formatLabel(opt);
      this.titleText.text = `Agricultural Plot (${crop})`;
      this.subtitleText.text = `Region: ${hex.regionId} (${ownerLabel(region?.ownerPlayerId)}) • (${coords.x}, ${coords.y})`;
      lines.push(`Assigned Workers: ${hex.assignedWorkers}`);
      lines.push(`Terrain: ${formatLabel(hex.terrain)}`);
    }

    this.bodyText.text = lines.join('\n');

    const canManage = Boolean(region && region.ownerPlayerId === 'player' && region.settlementCoords);
    this.activeRegionId = canManage ? region!.id : null;
    this.manageButton.container.visible = canManage;

    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
    this.activeRegionId = null;
    this.manageButton.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
