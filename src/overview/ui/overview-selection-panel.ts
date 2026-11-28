import { Container, Graphics, Sprite, Spritesheet, Text, Texture } from 'pixi.js';
import { Coords } from '../../shared';
import { OverviewSelectionKind } from '../../render3d/overview/overview-view-3d';
import { resolveUnitIconTexture } from '../../ui/post-battle-panel';
import { OverviewCampaign } from '../overview-campaign';
import { OverviewArmy, OverviewHex, RegionState } from '../overview-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const PANEL_W = 440;
const PANEL_H = 300;

function formatLabel(raw: string): string {
  return raw
    .split('_')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export interface OverviewSelectionPanelOptions {
  onManageRegion?: (regionId: string) => void;
  onToggleMoveMode?: (armyId: string) => void;
  unitsSheet?: Spritesheet;
}

export class OverviewSelectionPanel {
  public readonly container = new Container();
  private readonly titleText: Text;
  private readonly subtitleText: Text;
  private readonly bodyText: Text;
  public readonly squadIconsContainer = new Container();
  public readonly moveButton: OverviewUiButton;
  public readonly manageButton: OverviewUiButton;
  private readonly closeButton: OverviewUiButton;

  private activeRegionId: string | null = null;
  private activeArmyId: string | null = null;
  private activeFocusKind: OverviewSelectionKind | null = null;
  private moveModeActive: boolean = false;
  private onManageRegion?: (regionId: string) => void;
  private onToggleMoveMode?: (armyId: string) => void;
  private unitsSheet?: Spritesheet;

  constructor(
    parent: Container,
    onManageRegionOrOptions?: ((regionId: string) => void) | OverviewSelectionPanelOptions
  ) {
    if (typeof onManageRegionOrOptions === 'function') {
      this.onManageRegion = onManageRegionOrOptions;
    } else if (onManageRegionOrOptions) {
      this.onManageRegion = onManageRegionOrOptions.onManageRegion;
      this.onToggleMoveMode = onManageRegionOrOptions.onToggleMoveMode;
      this.unitsSheet = onManageRegionOrOptions.unitsSheet;
    }

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
      style: { fill: '#9fb6cf', fontSize: 13.5 },
    });
    this.subtitleText.position.set(16, 41);

    this.bodyText = new Text({
      text: '',
      style: {
        fill: '#eef4fb',
        fontSize: 14.5,
        lineHeight: 20,
        wordWrap: true,
        wordWrapWidth: PANEL_W - 32,
      },
    });
    this.bodyText.position.set(16, 66);

    this.squadIconsContainer.label = 'ArmyUnitIcons';
    this.squadIconsContainer.position.set(16, 134);
    this.squadIconsContainer.visible = false;

    this.closeButton = createOverviewButton(
      'X',
      34,
      30,
      () => this.hide(),
      { fillColor: 0x3b2226, fontSize: 14 }
    );
    this.closeButton.container.position.set(PANEL_W - 44, 10);

    this.moveButton = createOverviewButton(
      'Move',
      140,
      38,
      () => {
        if (this.activeArmyId) {
          this.onToggleMoveMode?.(this.activeArmyId);
        }
      },
      { fillColor: 0x244a32, fontSize: 15 }
    );
    this.moveButton.container.position.set(16, PANEL_H - 50);
    this.moveButton.container.visible = false;

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
      this.squadIconsContainer,
      this.closeButton.container,
      this.moveButton.container,
      this.manageButton.container
    );
    parent.addChild(this.container);
  }

  public getActiveFocusKind(): OverviewSelectionKind | null {
    return this.activeFocusKind;
  }

  public getDisplayedTitle(): string {
    return this.titleText.text;
  }

  public setMoveModeActive(active: boolean): void {
    this.moveModeActive = active;
    this.moveButton.setText(active ? 'Cancel Move' : 'Move');
  }

  private renderArmySquadIcons(army: OverviewArmy): void {
    this.squadIconsContainer.removeChildren();
    const cellW = 50;
    const cellH = 52;
    const cols = 8;

    army.squads.slice(0, 8).forEach((sq, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const slot = new Container();
      slot.label = `ArmyUnitIcon_${idx}`;
      slot.position.set(col * cellW, row * cellH);

      const frame = new Graphics()
        .roundRect(0, 0, 44, 46, 5)
        .fill({ color: 0x182330, alpha: 0.95 })
        .stroke({ width: 1.2, color: 0x6b7e94, alpha: 0.85 });
      slot.addChild(frame);

      const tex = resolveUnitIconTexture(sq.creatureType, this.unitsSheet);
      if (tex && tex !== Texture.EMPTY) {
        const icon = new Sprite(tex);
        icon.anchor.set(0.5);
        const iw = Math.max(1, icon.width || tex.width || 32);
        const ih = Math.max(1, icon.height || tex.height || 32);
        const scale = Math.min(34 / iw, 34 / ih);
        icon.scale.set(scale);
        icon.position.set(22, 19);
        slot.addChild(icon);
      } else {
        const abbr = new Text({
          text: formatLabel(String(sq.creatureType)).slice(0, 3).toUpperCase(),
          style: { fill: '#dce6f2', fontSize: 11, fontWeight: 'bold' },
        });
        abbr.anchor.set(0.5);
        abbr.position.set(22, 19);
        slot.addChild(abbr);
      }

      const countBg = new Graphics()
        .roundRect(2, 31, 40, 14, 3)
        .fill({ color: 0x090d14, alpha: 0.85 });
      const countTxt = new Text({
        text: `x${sq.count}`,
        style: { fill: '#ffdf73', fontSize: 10.5, fontWeight: 'bold' },
      });
      countTxt.anchor.set(0.5);
      countTxt.position.set(22, 38);
      slot.addChild(countBg, countTxt);

      this.squadIconsContainer.addChild(slot);
    });
    this.squadIconsContainer.visible = true;
  }

  public showAtHex(
    campaign: OverviewCampaign,
    coords: Coords,
    focusKind?: OverviewSelectionKind
  ): void {
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

    const ownerLabel = (ownerId: string | null | undefined) => {
      if (ownerId === null || ownerId === undefined) return 'Neutral';
      return campaign.getPlayer(ownerId)?.name ?? (ownerId === 'player' ? 'Player' : formatLabel(ownerId));
    };
    const regionName = region?.name ?? hex.regionId;

    const showSettlementFocused =
      focusKind === 'settlement' && Boolean(hex.isSettlement && region);
    const showArmyFocused = Boolean(army) && !showSettlementFocused;

    const lines: string[] = [];
    this.squadIconsContainer.visible = false;
    this.activeArmyId = null;
    this.moveButton.container.visible = false;

    if (showArmyFocused && army) {
      this.activeFocusKind = 'army';
      this.activeArmyId = army.id;
      const factionName = campaign.getBattleFactionName(army.ownerPlayerId, region);
      this.titleText.text =
        army.ownerPlayerId === 'player'
          ? factionName
          : army.ownerPlayerId === null
            ? factionName
            : factionName;
      this.subtitleText.text = `Region: ${regionName} • Hex (${coords.x}, ${coords.y}) • ${army.squads.length} Squads`;
      lines.push(`Move: ${army.movementPoints} / ${army.maxMovementPoints}`);
      if (army.ownerPlayerId === 'player') {
        lines.push(
          this.moveModeActive
            ? 'Left-click a highlighted hex to move (Esc to cancel)'
            : 'Click Move or right-click a highlighted hex to move'
        );
      }
      if (hex.isSettlement && region) {
        lines.push(
          `At ${region.name} — click hex again to select settlement`
        );
      }

      this.renderArmySquadIcons(army);

      const canMove = army.ownerPlayerId === 'player';
      this.moveButton.container.visible = canMove;
      this.moveButton.setEnabled(canMove && army.movementPoints > 0);
      this.moveButton.setText(this.moveModeActive ? 'Cancel Move' : 'Move');
    } else if (hex.isSettlement && region) {
      this.activeFocusKind = 'settlement';
      const tier = formatLabel(region.settlementTier ?? 'settlement');
      this.titleText.text = `${region.name} (${tier})`;
      this.subtitleText.text = `Owner: ${ownerLabel(region.ownerPlayerId)} • Hex (${coords.x}, ${coords.y})`;
      lines.push(`Population: ${region.population}`);
      lines.push(`Defense: ${formatLabel(region.defenseTier)}`);
      lines.push(`Preset: ${formatLabel(region.preset)}`);
      if (army) {
        lines.push(`Garrisoned Army: ${army.squads.length} squads — click hex again to select army`);
      }
    } else if (hex.resourceBuilding) {
      this.activeFocusKind = 'other';
      this.titleText.text = formatLabel(hex.resourceBuilding);
      this.subtitleText.text = `Region: ${regionName} (${ownerLabel(region?.ownerPlayerId)}) • (${coords.x}, ${coords.y})`;
      lines.push(`Assigned Workers: ${hex.assignedWorkers}`);
      lines.push(`Terrain: ${formatLabel(hex.terrain)}`);
    } else if (hex.isAgriculturalPlot) {
      this.activeFocusKind = 'other';
      const opt = hex.agricultureOption ?? 'none';
      const crop = opt === 'none' ? 'Unassigned' : formatLabel(opt);
      this.titleText.text = `Agricultural Plot (${crop})`;
      this.subtitleText.text = `Region: ${regionName} (${ownerLabel(region?.ownerPlayerId)}) • (${coords.x}, ${coords.y})`;
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
    this.activeArmyId = null;
    this.activeFocusKind = null;
    this.moveModeActive = false;
    this.squadIconsContainer.visible = false;
    this.moveButton.container.visible = false;
    this.manageButton.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public containsStagePoint(stageCoords: Coords): boolean {
    if (!this.container.visible) return false;
    const x = this.container.position.x;
    const y = this.container.position.y;
    return (
      stageCoords.x >= x &&
      stageCoords.x <= x + PANEL_W &&
      stageCoords.y >= y &&
      stageCoords.y <= y + PANEL_H
    );
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
