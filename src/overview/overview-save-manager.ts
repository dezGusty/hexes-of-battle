import { OverviewCampaign } from './overview-campaign';
import {
  OverviewArmy,
  OverviewCampaignConfig,
  OverviewHex,
  OverviewPlayer,
  RegionState,
} from './overview-types';

export interface OverviewSaveEntry {
  id: string;
  name: string;
  timestamp: number;
  turnNumber: number;
  data: {
    config: OverviewCampaignConfig;
    mapWidth: number;
    mapHeight: number;
    hexes: OverviewHex[][];
    regions: RegionState[];
    players: OverviewPlayer[];
    armies: OverviewArmy[];
    turnNumber: number;
    currentPlayerId: string;
    finished: boolean;
    winnerPlayerId: string | null;
  };
}

export class OverviewSaveManager {
  private static readonly STORAGE_KEY = 'hob_overview_saves';

  public static getSavesList(): OverviewSaveEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static writeSavesList(saves: OverviewSaveEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
  }

  public static saveCampaign(campaign: OverviewCampaign, name?: string): OverviewSaveEntry {
    const timestamp = Date.now();
    const saveName = name?.trim() || `Overview Turn ${campaign.turnNumber}`;
    const entry: OverviewSaveEntry = {
      id: `overview_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
      name: saveName,
      timestamp,
      turnNumber: campaign.turnNumber,
      data: JSON.parse(
        JSON.stringify({
          config: campaign.config,
          mapWidth: campaign.mapWidth,
          mapHeight: campaign.mapHeight,
          hexes: campaign.hexes,
          regions: campaign.regions,
          players: campaign.players,
          armies: campaign.armies,
          turnNumber: campaign.turnNumber,
          currentPlayerId: campaign.currentPlayerId,
          finished: campaign.finished,
          winnerPlayerId: campaign.winnerPlayerId,
        })
      ),
    };

    const saves = this.getSavesList();
    saves.unshift(entry);
    this.writeSavesList(saves);
    return entry;
  }

  public static loadCampaign(entry: OverviewSaveEntry): OverviewCampaign {
    const d = JSON.parse(JSON.stringify(entry.data)) as OverviewSaveEntry['data'];
    const campaign = new OverviewCampaign({
      config: d.config,
      mapWidth: d.mapWidth,
      mapHeight: d.mapHeight,
      hexes: d.hexes,
      regions: d.regions,
      players: d.players,
      armies: d.armies,
    });
    campaign.turnNumber = d.turnNumber;
    campaign.currentPlayerId = d.currentPlayerId;
    campaign.finished = d.finished;
    campaign.winnerPlayerId = d.winnerPlayerId;
    return campaign;
  }

  public static deleteSave(id: string): void {
    const saves = this.getSavesList().filter((s) => s.id !== id);
    this.writeSavesList(saves);
  }
}
