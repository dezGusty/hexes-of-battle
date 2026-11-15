import { Container, Graphics, Text } from 'pixi.js';
import { OverviewCampaign } from '../overview-campaign';
import {
  assignWorkersToHex,
  DEFENSE_UPGRADE_COSTS,
  getMaxWorkforce,
  getTotalAssignedWorkers,
  MAX_SQUADS_PER_ARMY,
  RECRUITABLE_UNITS,
  recruitSquad,
  setHexAgricultureOption,
  upgradeDefenseStructure,
} from '../overview-economy';
import { AgricultureOption, OverviewArmy, OverviewHex, RegionState } from '../overview-types';
import { createOverviewButton, OverviewUiButton } from './overview-ui-helpers';

const AGRI_CYCLE_ORDER: AgricultureOption[] = ['wheat', 'cattle', 'sheep', 'horses'];

export class SettlementPanel {
  public readonly container = new Container();
  private readonly panelWidth = 940;
  private readonly panelHeight = 760;
  private readonly bg = new Graphics();
  private readonly contentContainer = new Container();
  private readonly titleText: Text;
  private readonly statsText: Text;

  private campaign?: OverviewCampaign;
  private regionId?: string;
  private onUpdated?: () => void;

  public upgradeDefenseButton?: OverviewUiButton;
  public readonly recruitButtons: Map<number, OverviewUiButton> = new Map();
  public readonly workerPlusButtons: OverviewUiButton[] = [];
  public readonly workerMinusButtons: OverviewUiButton[] = [];
  public readonly agriCycleButtons: OverviewUiButton[] = [];

  constructor(parent: Container, onUpdated?: () => void) {
    this.onUpdated = onUpdated;
    this.container.label = 'SettlementPanel';
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

    this.titleText = new Text({
      text: 'SETTLEMENT',
      style: { fill: '#f4d03f', fontSize: 26, fontWeight: 'bold' },
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.panelWidth / 2, 18);
    this.container.addChild(this.titleText);

    this.statsText = new Text({
      text: '',
      style: { fill: '#d7e3f0', fontSize: 18 },
    });
    this.statsText.position.set(30, 56);
    this.container.addChild(this.statsText);

    const closeBtn = createOverviewButton(
      'Close',
      150,
      44,
      () => this.hide(),
      { fillColor: 0x3b2a2a, fontSize: 18 }
    );
    closeBtn.container.position.set((this.panelWidth - 150) / 2, this.panelHeight - 58);
    this.container.addChild(closeBtn.container);

    this.container.addChild(this.contentContainer);
    parent.addChild(this.container);
  }

  public show(campaign: OverviewCampaign, regionId: string): void {
    this.campaign = campaign;
    this.regionId = regionId;
    this.refresh();
    this.container.visible = true;
  }

  public hide(): void {
    this.container.visible = false;
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  private getOrCreateSettlementArmy(region: RegionState): OverviewArmy | null {
    if (!this.campaign || !region.settlementCoords || !region.ownerPlayerId) return null;
    const existing = this.campaign.armies.find(
      (a) =>
        a.ownerPlayerId === region.ownerPlayerId &&
        a.coords.x === region.settlementCoords!.x &&
        a.coords.y === region.settlementCoords!.y
    );
    if (existing) return existing;

    const created: OverviewArmy = {
      id: `army_${region.id}_${Date.now()}`,
      ownerPlayerId: region.ownerPlayerId,
      coords: { ...region.settlementCoords },
      movementPoints: 4,
      maxMovementPoints: 4,
      squads: [],
      isGarrison: true,
    };
    this.campaign.armies.push(created);
    return created;
  }

  public refresh(): void {
    if (!this.campaign || !this.regionId) return;
    const region = this.campaign.getRegionById(this.regionId);
    if (!region) return;

    const player = this.campaign.getPlayer(region.ownerPlayerId);
    const regionHexes = this.campaign.getRegionHexes(region.id);
    const maxWorkforce = getMaxWorkforce(region);
    const usedWorkforce = getTotalAssignedWorkers(regionHexes);

    this.titleText.text = `${region.name.toUpperCase()} (${(region.settlementTier ?? 'village').toUpperCase()})`;
    this.statsText.text = `Population: ${region.population} / 4999   |   Workforce: ${usedWorkforce} / ${maxWorkforce}   |   Defense: ${region.defenseTier.toUpperCase()}`;

    this.contentContainer.removeChildren();
    this.recruitButtons.clear();
    this.workerPlusButtons.length = 0;
    this.workerMinusButtons.length = 0;
    this.agriCycleButtons.length = 0;

    // Left column: Resource Buildings & Agricultural Plots
    const workHeader = new Text({
      text: 'WORKERS & PRODUCTION',
      style: { fill: '#9fd0ff', fontSize: 19, fontWeight: 'bold' },
    });
    workHeader.position.set(30, 98);
    this.contentContainer.addChild(workHeader);

    const workableHexes: OverviewHex[] = regionHexes.filter(
      (h) => h.resourceBuilding !== undefined || h.isAgriculturalPlot
    );

    const maxRows = 9;
    workableHexes.slice(0, maxRows).forEach((hex, idx) => {
      const y = 132 + idx * 54;
      const rowBg = new Graphics()
        .roundRect(28, y, 510, 46, 6)
        .fill({ color: 0x1b2430, alpha: 0.9 });
      this.contentContainer.addChild(rowBg);

      const labelStr = hex.resourceBuilding
        ? hex.resourceBuilding.replace('_', ' ').toUpperCase()
        : `FARM: ${(hex.agricultureOption ?? 'none').toUpperCase()}`;

      const rowText = new Text({
        text: `${labelStr}  (${hex.assignedWorkers}w)`,
        style: { fill: '#e8eef5', fontSize: 16, fontWeight: 'bold' },
      });
      rowText.position.set(40, y + 13);
      this.contentContainer.addChild(rowText);

      if (hex.isAgriculturalPlot) {
        const cycleBtn = createOverviewButton(
          'Type',
          74,
          34,
          () => {
            const cur = hex.agricultureOption ?? 'wheat';
            const next =
              AGRI_CYCLE_ORDER[(AGRI_CYCLE_ORDER.indexOf(cur) + 1) % AGRI_CYCLE_ORDER.length];
            setHexAgricultureOption(hex, next);
            this.refresh();
            this.onUpdated?.();
          },
          { fillColor: 0x2d3f54, fontSize: 14 }
        );
        cycleBtn.container.position.set(345, y + 6);
        cycleBtn.setEnabled(Boolean(player));
        this.agriCycleButtons.push(cycleBtn);
        this.contentContainer.addChild(cycleBtn.container);
      }

      const minusBtn = createOverviewButton(
        '-',
        42,
        34,
        () => {
          if (assignWorkersToHex(region, regionHexes, hex, -1)) {
            this.refresh();
            this.onUpdated?.();
          }
        },
        { fillColor: 0x452d2d, fontSize: 18 }
      );
      minusBtn.container.position.set(430, y + 6);
      minusBtn.setEnabled(Boolean(player) && hex.assignedWorkers > 0);
      this.workerMinusButtons.push(minusBtn);

      const plusBtn = createOverviewButton(
        '+',
        42,
        34,
        () => {
          if (assignWorkersToHex(region, regionHexes, hex, 1)) {
            this.refresh();
            this.onUpdated?.();
          }
        },
        { fillColor: 0x244532, fontSize: 18 }
      );
      plusBtn.container.position.set(480, y + 6);
      plusBtn.setEnabled(Boolean(player) && usedWorkforce < maxWorkforce);
      this.workerPlusButtons.push(plusBtn);

      this.contentContainer.addChild(minusBtn.container, plusBtn.container);
    });

    // Right column: Defense Upgrade + Army Recruitment
    const rightX = 568;
    const defHeader = new Text({
      text: 'DEFENSES & RECRUITMENT',
      style: { fill: '#9fd0ff', fontSize: 19, fontWeight: 'bold' },
    });
    defHeader.position.set(rightX, 98);
    this.contentContainer.addChild(defHeader);

    const nextDefense = DEFENSE_UPGRADE_COSTS[region.defenseTier];
    const defLabel = nextDefense
      ? `Upgrade -> ${nextDefense.nextTier.toUpperCase()} (${nextDefense.money}g, ${nextDefense.lumber}w, ${nextDefense.stone}s)`
      : 'Defense Maxed (CASTLE)';

    this.upgradeDefenseButton = createOverviewButton(
      defLabel,
      344,
      48,
      () => {
        if (player && upgradeDefenseStructure(player, region)) {
          this.refresh();
          this.onUpdated?.();
        }
      },
      { fillColor: 0x2c3b4d, fontSize: 14 }
    );
    this.upgradeDefenseButton.container.position.set(rightX, 132);
    this.upgradeDefenseButton.setEnabled(
      Boolean(
        player &&
          nextDefense &&
          player.resources.money >= nextDefense.money &&
          player.resources.lumber >= nextDefense.lumber &&
          player.resources.stone >= nextDefense.stone &&
          player.resources.iron >= nextDefense.iron
      )
    );
    this.contentContainer.addChild(this.upgradeDefenseButton.container);

    const garrisonArmy = region.settlementCoords
      ? this.campaign.armies.find(
          (a) =>
            a.ownerPlayerId === region.ownerPlayerId &&
            a.coords.x === region.settlementCoords!.x &&
            a.coords.y === region.settlementCoords!.y
        )
      : undefined;

    const armyHeader = new Text({
      text: `Garrison Squads: ${garrisonArmy?.squads.length ?? 0} / ${MAX_SQUADS_PER_ARMY}`,
      style: { fill: '#e8eef5', fontSize: 17, fontWeight: 'bold' },
    });
    armyHeader.position.set(rightX, 200);
    this.contentContainer.addChild(armyHeader);

    RECRUITABLE_UNITS.forEach((unit, idx) => {
      const y = 236 + idx * 72;
      const canAfford = Boolean(
        player &&
          (!garrisonArmy || garrisonArmy.squads.length < MAX_SQUADS_PER_ARMY) &&
          player.resources.money >= unit.money &&
          player.resources.lumber >= unit.lumber &&
          player.resources.iron >= unit.iron &&
          player.resources.horses >= unit.horses &&
          region.population - unit.populationCost >= 50
      );

      const btn = createOverviewButton(
        `Recruit ${unit.label}\n${unit.money}g | ${unit.lumber}w | ${unit.iron}i | ${unit.populationCost} pop`,
        344,
        60,
        () => {
          if (!player) return;
          const army = this.getOrCreateSettlementArmy(region);
          if (army && recruitSquad(player, region, unit.creatureType, army)) {
            this.refresh();
            this.onUpdated?.();
          }
        },
        { fillColor: 0x22382b, fontSize: 15 }
      );
      btn.container.position.set(rightX, y);
      btn.setEnabled(canAfford);
      this.recruitButtons.set(unit.creatureType, btn);
      this.contentContainer.addChild(btn.container);
    });
  }

  public destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}
