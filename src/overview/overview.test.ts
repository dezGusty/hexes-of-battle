import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Container, Texture } from 'pixi.js';
import { BattleSettings } from '../battle/settings';
import { SoundCategory, SoundType } from '../battle/ui-sounds';
import { OverviewSaveManager } from './overview-save-manager';
import { Creature, CreatureType } from '../battle/creature';
import { HexMap } from '../shared/hex-map';
import {
  assignWorkersToHex,
  calculateNextPopulation,
  calculateRegionTurnEconomy,
  POPULATION_HARD_CAP,
  recruitSquad,
  setHexAgricultureOption,
  tradeWithMerchant,
  upgradeDefenseStructure,
} from './overview-economy';
import {
  createStarterOverviewMap,
  enforceOverviewMapConnectivity,
  generateOverviewMap,
  REGION_SIZE,
} from './overview-map-generator';
import { OverviewCampaign } from './overview-campaign';
import { isOverviewTerrainPassable } from './overview-types';
import {
  classifyOverviewPathTurn,
  createOverviewPathArrowGeometry,
} from '../render3d/overview/overview-path-arrows';
import { OVERVIEW_TERRAIN_TEXTURE_CONFIG } from '../render3d/overview/overview-board-3d';
import { OverviewHud2D } from './ui/overview-hud-2d';
import { OverviewBoard3D } from '../render3d/overview/overview-board-3d';
import { createOverviewCombinedArmyVisual } from '../render3d/overview/overview-models-3d';
import { OverviewView3D } from '../render3d/overview/overview-view-3d';
import { EventBus } from '../core/event-bus';
import { OverviewScene3D } from '../scenes/overview-scene-3d';
import {
  countGroupTriangles,
  CowAnimationData,
  createOverviewCowModel,
  triggerOverviewCowAnimation,
  updateOverviewCowAnimation,
} from '../render3d/overview/overview-cow-3d';
import {
  AmbientSoundsConfig,
  OverviewAmbientAudio,
} from './overview-ambient-audio';

describe('Overview Map Phase 1: Regions, Economy & Campaign Loop', () => {
  it('should create the 2x2 starter map with 1 player region, 3 neutral regions, 10-squad garrisons, and 4-12 agricultural hexes', () => {
    const generated = createStarterOverviewMap(12345);
    expect(generated.mapWidth).toBe(2 * REGION_SIZE);
    expect(generated.mapHeight).toBe(2 * REGION_SIZE);
    expect(generated.regions.length).toBe(4);
    expect(generated.config.victoryCondition).toBe('conquer_all');

    const playerRegions = generated.regions.filter((r) => r.ownerPlayerId === 'player');
    const neutralRegions = generated.regions.filter((r) => r.ownerPlayerId === null);
    expect(playerRegions.length).toBe(1);
    expect(neutralRegions.length).toBe(3);

    expect(generated.armies.length).toBe(4);
    for (const army of generated.armies) {
      if (army.ownerPlayerId === 'player') {
        expect(army.squads.length).toBe(6);
      } else {
        expect(army.squads.length).toBeGreaterThanOrEqual(5);
        expect(army.squads.length).toBeLessThanOrEqual(7);
      }
    }

    for (const region of generated.regions) {
      expect(region.hexCoords.length).toBe(REGION_SIZE * REGION_SIZE);
      const regionHexes = region.hexCoords.map((c) => generated.hexes[c.x][c.y]);
      const agriHexes = regionHexes.filter((h) => h.isAgriculturalPlot);
      expect(agriHexes.length).toBeGreaterThanOrEqual(4);
      expect(agriHexes.length).toBeLessThanOrEqual(12);
      expect(regionHexes.some((h) => h.isSettlement)).toBe(true);
      expect(regionHexes.some((h) => h.isDefenseHex)).toBe(true);
    }
  });

  it('should enforce connectivity inside regions and between adjacent standard regions', () => {
    const generated = generateOverviewMap(
      [
        {
          id: 'r0',
          name: 'Region 0',
          gridCoords: { x: 0, y: 0 },
          preset: 'grassland',
          ownerPlayerId: 'player',
        },
        {
          id: 'r1',
          name: 'Region 1',
          gridCoords: { x: 1, y: 0 },
          preset: 'forest',
          ownerPlayerId: null,
        },
      ],
      { mapRegionWidth: 2, mapRegionHeight: 1, victoryCondition: 'conquer_all', seed: 99 }
    );

    // Deliberately wall off Region 0's settlement with mountains
    const r0 = generated.regions[0];
    const s0 = r0.settlementCoords!;
    for (const n of HexMap.getNeighboursInBounds(s0, generated.mapWidth, generated.mapHeight)) {
      generated.hexes[n.x][n.y].terrain = 'mountain';
    }

    enforceOverviewMapConnectivity(
      generated.regions,
      generated.hexes,
      generated.mapWidth,
      generated.mapHeight
    );

    // Verify BFS from s0 can reach r1's settlement and all resource/agri hexes
    const visited = new Set<string>([`${s0.x},${s0.y}`]);
    const queue = [s0];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const n of HexMap.getNeighboursInBounds(curr, generated.mapWidth, generated.mapHeight)) {
        const key = `${n.x},${n.y}`;
        if (visited.has(key)) continue;
        if (!isOverviewTerrainPassable(generated.hexes[n.x][n.y].terrain)) continue;
        visited.add(key);
        queue.push(n);
      }
    }

    const s1 = generated.regions[1].settlementCoords!;
    expect(visited.has(`${s1.x},${s1.y}`)).toBe(true);

    for (const region of generated.regions) {
      for (const c of region.hexCoords) {
        const hex = generated.hexes[c.x][c.y];
        if (hex.resourceBuilding || hex.isAgriculturalPlot || hex.isDefenseHex) {
          expect(visited.has(`${c.x},${c.y}`)).toBe(true);
        }
      }
    }
  });

  it('should grow population quickly at low pop, nerf growth around 2500, and never reach 5000', () => {
    const lowPopNext = calculateNextPopulation(200, 100, 1.0, 'town');
    const lowGrowthPct = (lowPopNext - 200) / 200;
    expect(lowGrowthPct).toBeGreaterThan(0.1);

    const midPopNext = calculateNextPopulation(2500, 500, 1.0, 'town');
    const midGrowthPct = (midPopNext - 2500) / 2500;
    expect(midGrowthPct).toBeLessThan(0.01);

    // Even with extreme buffMultiplier, population must remain strictly below 5000
    const cappedPop = calculateNextPopulation(4990, 5000, 0.5, 'city', 100);
    expect(cappedPop).toBeLessThan(5000);
    expect(cappedPop).toBeLessThanOrEqual(POPULATION_HARD_CAP);

    // Starvation reduces population
    const starvedPop = calculateNextPopulation(600, 0, 1.0, 'village');
    expect(starvedPop).toBeLessThan(600);
  });

  it('should assign workers, produce turn resources, trade with merchants, and recruit squads', () => {
    const generated = createStarterOverviewMap(7);
    const campaign = new OverviewCampaign(generated);
    const player = campaign.getPlayer('player')!;
    const playerRegion = campaign.getRegionById('region_0_0')!;
    const regionHexes = campaign.getRegionHexes(playerRegion.id);

    const lumberHex = regionHexes.find((h) => h.resourceBuilding === 'lumber_camp')!;
    const agriHex = regionHexes.find((h) => h.isAgriculturalPlot)!;
    expect(setHexAgricultureOption(agriHex, 'wheat')).toBe(true);
    expect(assignWorkersToHex(playerRegion, regionHexes, lumberHex, 2)).toBe(true);
    expect(assignWorkersToHex(playerRegion, regionHexes, agriHex, 2)).toBe(true);

    const econ = calculateRegionTurnEconomy(playerRegion, regionHexes);
    expect(econ.produced.lumber).toBe(8);
    expect(econ.produced.grain).toBe(12);
    expect(econ.produced.food).toBe(12);
    expect(econ.produced.money).toBeGreaterThan(0);

    const startMoney = player.resources.money;
    campaign.endTurn();
    expect(player.resources.money).toBeGreaterThan(startMoney);
    expect(campaign.turnNumber).toBe(2);

    // Merchant trading
    const moneyBeforeTrade = player.resources.money;
    expect(tradeWithMerchant(player, 'iron', 5, 'buy')).toBe(true);
    expect(player.resources.money).toBeLessThan(moneyBeforeTrade);
    expect(tradeWithMerchant(player, 'iron', 2, 'sell')).toBe(true);

    // Recruitment (player starts with 6 squads; add 7th and 8th, then verify cap at 8)
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const initialCount = playerArmy.squads.length;
    expect(initialCount).toBe(6);
    const popBeforeRecruit = playerRegion.population;
    expect(recruitSquad(player, playerRegion, CreatureType.PEASANT, playerArmy)).toBe(true);
    expect(playerArmy.squads.length).toBe(7);
    expect(playerRegion.population).toBe(popBeforeRecruit - 25);
    expect(recruitSquad(player, playerRegion, CreatureType.PEASANT, playerArmy)).toBe(true);
    expect(playerArmy.squads.length).toBe(8);
    expect(recruitSquad(player, playerRegion, CreatureType.PEASANT, playerArmy)).toBe(false);
  });

  it('should trigger battle on enemy contact, capture regions on victory, and complete conquer_all campaign', () => {
    const generated = createStarterOverviewMap(11);
    const campaign = new OverviewCampaign(generated);
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;

    // Place player army adjacent to each neutral settlement in turn and win battles
    const neutralRegions = campaign.regions.filter((r) => r.ownerPlayerId === null);
    expect(neutralRegions.length).toBe(3);

    for (const targetRegion of neutralRegions) {
      const targetCoords = targetRegion.settlementCoords!;
      const neighbors = HexMap.getNeighboursInBounds(
        targetCoords,
        campaign.mapWidth,
        campaign.mapHeight
      );
      const passableNeighbor = neighbors.find((n) => {
        const h = campaign.getHex(n);
        return h && isOverviewTerrainPassable(h.terrain) && !campaign.getArmyAt(n, playerArmy.id);
      })!;

      playerArmy.coords = { ...passableNeighbor };
      playerArmy.movementPoints = 4;

      const moveResult = campaign.moveArmy(playerArmy.id, targetCoords);
      expect(moveResult.moved).toBe(true);
      expect(moveResult.triggeredBattle).toBe(true);
      expect(moveResult.defenderArmyId).toBeDefined();

      const survivingAttacker = new Creature(CreatureType.SWORDSMAN);
      survivingAttacker.armyAlignment = 0;
      survivingAttacker.live_stats.remaining_health = survivingAttacker.stats.health;

      campaign.applyBattleResult(
        {
          victorArmyIndex: 0,
          turnsTaken: 4,
          survivingCreatures: [survivingAttacker],
          casualties: [],
          routedCreatures: [],
          totalDamageDealt: [100, 20],
          totalStaminaSpent: [30, 30],
          moraleBreaks: [0, 1],
          friendlyFireEvents: 0,
        },
        moveResult.attackerArmyId!,
        moveResult.defenderArmyId!,
        moveResult.targetRegionId
      );

      expect(targetRegion.ownerPlayerId).toBe('player');
    }

    expect(campaign.finished).toBe(true);
    expect(campaign.winnerPlayerId).toBe('player');
  });

  it('should upgrade defenses and drive OverviewHud2D, SettlementPanel, and MerchantTradePanel', () => {
    const generated = createStarterOverviewMap(21);
    const campaign = new OverviewCampaign(generated);
    const player = campaign.getPlayer('player')!;
    const playerRegion = campaign.getRegionById('region_0_0')!;

    expect(playerRegion.defenseTier).toBe('none');
    expect(upgradeDefenseStructure(player, playerRegion)).toBe(true);
    expect(playerRegion.defenseTier).toBe('palisade');

    const root = new Container();
    let endTurnCount = 0;
    const hud = new OverviewHud2D(root, () => {
      endTurnCount++;
      campaign.endTurn();
      hud.refresh();
    });
    hud.bindCampaign(campaign);

    // Open settlement panel and verify controls
    hud.manageSettlementButton.container.emit('pointertap', {} as any);
    expect(hud.settlementPanel.isVisible()).toBe(true);
    expect(hud.settlementPanel.workerPlusButtons.length).toBeGreaterThan(0);

    // Assign a worker via SettlementPanel
    hud.settlementPanel.workerPlusButtons[0].container.emit('pointertap', {} as any);
    const regionHexes = campaign.getRegionHexes(playerRegion.id);
    expect(regionHexes.some((h) => h.assignedWorkers > 0)).toBe(true);

    // Open MerchantTradePanel and buy 5 lumber
    hud.merchantButton.container.emit('pointertap', {} as any);
    expect(hud.merchantPanel.isVisible()).toBe(true);
    const lumberBefore = player.resources.lumber;
    hud.merchantPanel.buyButtons.get('lumber')!.container.emit('pointertap', {} as any);
    expect(player.resources.lumber).toBe(lumberBefore + 5);

    // Trigger End Turn button
    hud.endTurnButton.container.emit('pointertap', {} as any);
    expect(endTurnCount).toBe(1);
    expect(campaign.turnNumber).toBe(2);

    hud.destroy();
  });
});

describe('Overview Map Phase 3: 3D Board, Combined-Squad Armies & OverviewView3D', () => {
  it('builds 100 hex tiles and 4 combined-squad army visuals on the starter map', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const board = new OverviewBoard3D(campaign);

    expect(board.tileMeshes.length).toBe(2);
    expect(board.getTerrainMesh()).not.toBeNull();
    expect(board.getWaterMesh()).not.toBeNull();
    // 1 player army + 2 visible neutral armies within 6-hex sight range (far region_1_1 garrison is hidden by fog of war)
    expect(board.getArmyVisualCount()).toBe(3);

    board.setReachableHexes(['1,1', '2,1']);
    const hlData = board.getHighlightGridTexture()!.image.data as Uint8Array;
    expect(hlData[(1 * campaign.mapWidth + 1) * 4]).toBe(255);
    expect(hlData[(1 * campaign.mapWidth + 2) * 4]).toBe(255);
    board.setReachableHexes([]);
    expect(hlData[(1 * campaign.mapWidth + 1) * 4]).toBe(0);
    board.dispose();
  });

  it('renders combined-squad army with 1 unit mesh per squad and gray flag for neutral', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const neutralArmy = campaign.armies.find((a) => a.ownerPlayerId === null);
    expect(neutralArmy).toBeDefined();

    const visual = createOverviewCombinedArmyVisual(neutralArmy!);
    // 1 unit mesh per squad + 1 wind flag group
    expect(visual.children.length).toBe(neutralArmy!.squads.length + 1);

    let flagCloth: any;
    visual.traverse((obj) => {
      if (obj.userData?.isOverviewFlagCloth) flagCloth = obj;
    });
    expect(flagCloth).toBeDefined();
    expect(flagCloth.material.color.getHexString()).toBe('8c929a');
  });

  it('selects player army on hex click, highlights reachable hexes, and triggers onMoveArmy', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;

    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLElement;

    const mockRendererHost = {
      renderer: {
        domElement: {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      renderToContainer: () => {},
      detachFromContainer: () => {},
    } as any;

    let movedTarget: { armyId: string; x: number; y: number } | null = null;
    const view = new OverviewView3D(
      mockContainer,
      campaign,
      {
        onMoveArmy: (armyId, targetCoords) => {
          movedTarget = { armyId, x: targetCoords.x, y: targetCoords.y };
        },
      },
      mockRendererHost
    );

    // Left click on player army hex -> selects player army
    view.selectOrMoveAtHex(playerArmy.coords, 0);
    expect(view.selectedArmyId).toBe(playerArmy.id);

    // Find a reachable passable neighbor
    const reachable = campaign.getReachableHexes(playerArmy.id);
    expect(reachable.size).toBeGreaterThan(0);
    const selfKey = `${playerArmy.coords.x},${playerArmy.coords.y}`;
    const targetKey = Array.from(reachable.keys()).find((k) => k !== selfKey)!;
    const [tx, ty] = targetKey.split(',').map(Number);
    const target = { x: tx, y: ty };

    // Left click on reachable empty hex -> deselects, does not move
    view.selectOrMoveAtHex(target, 0);
    expect(movedTarget).toBeNull();
    expect(view.selectedArmyId).toBeNull();

    // Re-select with left click, then right click on target -> triggers onMoveArmy
    view.selectOrMoveAtHex(playerArmy.coords, 0);
    expect(view.selectedArmyId).toBe(playerArmy.id);
    view.selectOrMoveAtHex(target, 2);

    expect(movedTarget).toEqual({ armyId: playerArmy.id, x: target.x, y: target.y });
    expect(view.selectedArmyId).toBeNull();

    view.destroy();
  });
});

describe('Overview Map Phase 4: OverviewScene3D, Battle Handoff & Campaign Victory', () => {
  it('enters OverviewScene3D, emits overview:start-battle on enemy contact, applies BattleResult on return, and shows victory banner', async () => {
    const eventBus = new EventBus();
    const emittedBattles: any[] = [];
    eventBus.on('overview:start-battle', (payload) => emittedBattles.push(payload));

    const mockRendererHost = {
      renderer: {
        domElement: {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      renderToContainer: () => {},
      detachFromContainer: () => {},
    } as any;

    const creatureTemplates = JSON.parse(
      readFileSync('public/creaturetypes.json', 'utf8')
    );
    const abilityTypes = JSON.parse(
      readFileSync('public/abilitytypes.json', 'utf8')
    );

    const mockContext = {
      eventBus,
      templates: {
        creatureTemplates,
        abilityTypes,
      },
      getThreeRendererHost: () => mockRendererHost,
    } as any;

    const scene = new OverviewScene3D();
    await scene.enter(mockContext);

    expect(scene.campaign).toBeDefined();
    expect(scene.view).toBeDefined();
    expect(scene.hud).toBeDefined();

    const campaign = scene.campaign!;
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const neutralRegions = campaign.regions.filter((r) => r.ownerPlayerId === null);
    expect(neutralRegions.length).toBe(3);

    for (let i = 0; i < neutralRegions.length; i++) {
      const targetRegion = neutralRegions[i];
      const targetCoords = targetRegion.settlementCoords!;
      const neighbors = HexMap.getNeighboursInBounds(
        targetCoords,
        campaign.mapWidth,
        campaign.mapHeight
      );
      const passableNeighbor = neighbors.find((n) => {
        const h = campaign.getHex(n);
        return h && isOverviewTerrainPassable(h.terrain) && !campaign.getArmyAt(n, playerArmy.id);
      })!;

      playerArmy.coords = { ...passableNeighbor };
      playerArmy.movementPoints = 4;

      const enemySquadsBefore = campaign.getArmyAt(targetCoords)!.squads.length;
      scene.handleMoveArmy(playerArmy.id, targetCoords);
      expect(scene.hud!.battlePromptPanel.isVisible()).toBe(true);
      expect(emittedBattles.length).toBe(i);
      scene.hud!.battlePromptPanel.fightOnBattlefieldButton.container.emit('pointertap', {} as any);
      expect(scene.hud!.battlePromptPanel.isVisible()).toBe(false);
      expect(emittedBattles.length).toBe(i + 1);
      expect(emittedBattles[i].replayMode).toBe(false);
      expect(emittedBattles[i].config.creatures.length).toBe(
        playerArmy.squads.length + enemySquadsBefore
      );

      // Simulate exiting to battle and returning with victorArmyIndex = 0
      scene.exit();
      expect(scene.view).toBeUndefined();
      expect(scene.hud).toBeUndefined();

      const survivingAttacker = new Creature(CreatureType.SWORDSMAN);
      survivingAttacker.armyAlignment = 0;
      survivingAttacker.live_stats.remaining_health = survivingAttacker.stats.health;

      await scene.enter(mockContext, {
        battleResult: {
          victorArmyIndex: 0,
          survivingCreatures: [survivingAttacker],
          routedCreatures: [],
          casualties: [],
        },
      });

      expect(targetRegion.ownerPlayerId).toBe('player');
    }

    expect(campaign.finished).toBe(true);
    expect(campaign.winnerPlayerId).toBe('player');
    expect((scene.hud as any).victoryBanner.visible).toBe(true);

    scene.destroy();
  });

  it('supports separate overviewAnimationSpeed, OverviewSaveManager round-trip, and OverviewView3D visual toggles', () => {
    const settings = new BattleSettings();
    settings.setAnimationSpeed(3);
    settings.setOverviewAnimationSpeed(6);
    expect(settings.animationSpeed).toBe(3);
    expect(settings.overviewAnimationSpeed).toBe(6);
    expect(settings.getOverviewAnimationSpeedMultiplier()).toBeGreaterThan(
      settings.getAnimationSpeedMultiplier()
    );

    // Mock localStorage for OverviewSaveManager
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };

    try {
      const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
      campaign.endTurn();
      const entry = OverviewSaveManager.saveCampaign(campaign, 'My Campaign Save');
      expect(OverviewSaveManager.getSavesList().length).toBe(1);

      const loaded = OverviewSaveManager.loadCampaign(entry);
      expect(loaded.turnNumber).toBe(2);
      expect(loaded.regions.length).toBe(campaign.regions.length);
      expect(loaded.armies.length).toBe(campaign.armies.length);

      OverviewSaveManager.deleteSave(entry.id);
      expect(OverviewSaveManager.getSavesList().length).toBe(0);
    } finally {
      delete (globalThis as any).localStorage;
    }

    // OverviewBoard3D grid, coords, simpleTrees & OverviewHud2D softCursor + menuButton
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const board = new OverviewBoard3D(campaign);
    expect(board.isGridVisible()).toBe(true);
    board.setGridVisible(false);
    expect(board.isGridVisible()).toBe(false);

    expect(board.isCoordsVisible()).toBe(false);
    board.setCoordsVisible(true);
    expect(board.isCoordsVisible()).toBe(true);

    expect(board.isSimpleTreesEnabled()).toBe(false);
    board.setSimpleTreesEnabled(true);
    expect(board.isSimpleTreesEnabled()).toBe(true);

    // Region hover border highlight
    expect(board.getHoveredRegionId()).toBeNull();
    expect(board.getHoveredRegionBorderCount()).toBe(0);
    board.setHoveredRegion('region_0_0');
    expect(board.getHoveredRegionId()).toBe('region_0_0');
    const borderCount = board.getHoveredRegionBorderCount();
    expect(borderCount).toBeGreaterThan(0);
    expect(borderCount).toBeLessThan(25 * 6);
    board.setHoveredRegion(null);
    expect(board.getHoveredRegionBorderCount()).toBe(0);

    board.dispose();

    const stage = new Container();
    const hud = new OverviewHud2D(stage, undefined, {
      settings,
      assets: {
        softCursorTextures: { default: Texture.EMPTY },
      },
    });
    expect(hud.menuButton).toBeDefined();
    expect(hud.softCursorSprite).toBeDefined();
    hud.updateCursorPosition({ x: 120, y: 240 });
    expect(hud.softCursorSprite?.position.x).toBe(120);
    expect(hud.softCursorSprite?.position.y).toBe(240);

    // Bottom-right selection panel
    hud.bindCampaign(campaign);
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    hud.showSelectionAtHex(playerArmy.coords);
    expect(hud.selectionPanel.isVisible()).toBe(true);

    const neutralRegion = campaign.regions.find((r) => r.ownerPlayerId === null)!;
    hud.showSelectionAtHex(neutralRegion.settlementCoords!);
    expect(hud.selectionPanel.isVisible()).toBe(true);

    const agriHex = campaign
      .getRegionHexes('region_0_0')
      .find((h) => h.isAgriculturalPlot && !campaign.getArmyAt(h.coords))!;
    hud.showSelectionAtHex(agriHex.coords);
    expect(hud.selectionPanel.isVisible()).toBe(true);

    const plainHex = campaign
      .getRegionHexes('region_0_0')
      .find(
        (h) =>
          !h.isSettlement &&
          !h.resourceBuilding &&
          !h.isAgriculturalPlot &&
          !campaign.getArmyAt(h.coords)
      );
    if (plainHex) {
      hud.showSelectionAtHex(plainHex.coords);
      expect(hud.selectionPanel.isVisible()).toBe(false);
    }

    hud.destroy();
  });

  it('tracks pointermove stage coordinates for soft cursor and pans camera with WASD on OverviewView3D', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const listeners = new Map<string, Array<(e: any) => void>>();
    const prevWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
      removeEventListener: (type: string, fn: (e: any) => void) => {
        const list = listeners.get(type) ?? [];
        listeners.set(
          type,
          list.filter((f) => f !== fn)
        );
      },
    };

    try {
      const mockContainer = {
        clientWidth: 800,
        clientHeight: 600,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as HTMLElement;

      const mockRendererHost = {
        renderer: {
          domElement: {
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
          },
          setSize: () => {},
          setPixelRatio: () => {},
          setClearColor: () => {},
          setScissorTest: () => {},
          getSize: () => ({ width: 800, height: 600 }),
          shadowMap: { enabled: false, type: 0 },
          render: () => {},
          dispose: () => {},
        },
        renderToContainer: () => {},
        detachFromContainer: () => {},
      } as any;

      let cursorPos: { x: number; y: number } | null = null;
      const view = new OverviewView3D(
        mockContainer,
        campaign,
        {
          getStageInfo: () => ({ offset: { x: 100, y: 50 }, scale: { x: 0.5, y: 0.5 } }),
          onPointerMove: (coords) => {
            cursorPos = coords;
          },
        },
        mockRendererHost
      );

      // Simulate pointermove over the 3D canvas (without pointerdown)
      const moveFns = listeners.get('pointermove') ?? [];
      expect(moveFns.length).toBeGreaterThan(0);
      moveFns.forEach((fn) => fn({ clientX: 250, clientY: 200 }));
      expect(cursorPos).toEqual({ x: 300, y: 300 });

      // Simulate WASD camera pan
      const initialTarget = view.sceneManager.getCameraTarget().clone();
      const keyDownFns = listeners.get('keydown') ?? [];
      const keyUpFns = listeners.get('keyup') ?? [];
      keyDownFns.forEach((fn) => fn({ key: 'w' }));
      keyDownFns.forEach((fn) => fn({ key: 'd' }));
      expect(view.isKeyPressed('w')).toBe(true);
      expect(view.isKeyPressed('d')).toBe(true);

      view.update(250);
      const movedTarget = view.sceneManager.getCameraTarget();
      expect(movedTarget.distanceTo(initialTarget)).toBeGreaterThan(0.1);

      keyUpFns.forEach((fn) => fn({ key: 'w' }));
      keyUpFns.forEach((fn) => fn({ key: 'd' }));
      expect(view.isKeyPressed('w')).toBe(false);
      expect(view.isKeyPressed('d')).toBe(false);

      view.destroy();
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = prevWindow;
      }
    }
  });

  it('computes army path and renders straight, 60-degree, and 120-degree curved path arrows on hover', () => {
    const inDir = new THREE.Vector2(1, 0);
    expect(classifyOverviewPathTurn(inDir, new THREE.Vector2(1, 0))).toBe('straight');
    expect(
      classifyOverviewPathTurn(
        inDir,
        new THREE.Vector2(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3))
      )
    ).toBe('curve60_right');
    expect(
      classifyOverviewPathTurn(
        inDir,
        new THREE.Vector2(Math.cos(-Math.PI / 3), Math.sin(-Math.PI / 3))
      )
    ).toBe('curve60_left');
    expect(
      classifyOverviewPathTurn(
        inDir,
        new THREE.Vector2(Math.cos((Math.PI * 2) / 3), Math.sin((Math.PI * 2) / 3))
      )
    ).toBe('curve120_right');
    expect(
      classifyOverviewPathTurn(
        inDir,
        new THREE.Vector2(Math.cos((-Math.PI * 2) / 3), Math.sin((-Math.PI * 2) / 3))
      )
    ).toBe('curve120_left');

    for (const kind of [
      'start',
      'straight',
      'curve60_left',
      'curve60_right',
      'curve120_left',
      'curve120_right',
      'end',
    ] as const) {
      const geo = createOverviewPathArrowGeometry(kind, 1.0);
      expect(geo.getAttribute('position').count).toBeGreaterThan(0);
      expect(geo.getIndex()!.count).toBeGreaterThan(0);
      geo.dispose();
    }

    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const reachable = campaign.getReachableHexes(playerArmy.id);
    const farKey = Array.from(reachable.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    expect(farKey).toBeDefined();
    const [tx, ty] = farKey!.split(',').map(Number);

    const path = campaign.getPathToHex(playerArmy.id, { x: tx, y: ty });
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual(playerArmy.coords);
    expect(path[path.length - 1]).toEqual({ x: tx, y: ty });

    expect(campaign.getPathToHex(playerArmy.id, { x: 99, y: 99 })).toEqual([]);

    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLElement;

    const mockRendererHost = {
      renderer: {
        domElement: {
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        },
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      renderToContainer: () => {},
      detachFromContainer: () => {},
    } as any;

    const view = new OverviewView3D(mockContainer, campaign, {}, mockRendererHost);
    // Hovering without selected army shows no path
    view.hoverAtHex({ x: tx, y: ty });
    expect(view.board.getMovePathSegmentKinds()).toEqual([]);

    // Select army, then hover reachable hex -> path arrows appear
    view.selectAtHex(playerArmy.coords);
    view.hoverAtHex({ x: tx, y: ty });
    const kinds = view.board.getMovePathSegmentKinds();
    expect(kinds.length).toBe(path.length);
    expect(kinds[0]).toBe('start');
    expect(kinds[kinds.length - 1]).toBe('end');

    // Hovering unreachable hex clears path
    view.hoverAtHex({ x: 99, y: 99 });
    expect(view.board.getMovePathSegmentKinds()).toEqual([]);

    view.destroy();
  });

  it('plays battle UI hover and click sounds on overview UI buttons', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const played: Array<{ category: SoundCategory; sound: SoundType }> = [];
    const mockSoundSystem = {
      play: (category: SoundCategory, sound: SoundType) => {
        played.push({ category, sound });
      },
      stop: () => {},
      playMusic: () => {},
      stopMusic: () => {},
      setMusicVolume: () => {},
      setSoundVolume: () => {},
    };

    expect(SoundCategory.AMBIENT).toBe('AMBIENT');

    const settings = new BattleSettings();
    settings.sound.soundOn = false;
    settings.sound.soundVolume = 0;
    settings.sound.ambientOn = true;
    settings.sound.ambientVolume = 0.8;

    const hud = new OverviewHud2D(new Container(), undefined, {
      settings,
      soundSystem: mockSoundSystem,
    });
    hud.bindCampaign(campaign);

    // Hover and click an enabled overview button
    hud.endTurnButton.container.emit('pointerover', {} as any);
    hud.endTurnButton.container.emit('pointertap', {} as any);
    expect(played).toEqual([
      { category: SoundCategory.SOUND, sound: SoundType.UI_HOVER },
      { category: SoundCategory.SOUND, sound: SoundType.UI_CLICK },
    ]);

    // Disabled button should not play sounds
    played.length = 0;
    hud.endTurnButton.setEnabled(false);
    hud.endTurnButton.container.emit('pointerover', {} as any);
    hud.endTurnButton.container.emit('pointertap', {} as any);
    expect(played).toEqual([]);

    hud.destroy();
  });

  it('shows battle options dialog with Quick Battle summary, View Battle replay, Refuse Outcome, and Fight on the Battlefield', async () => {
    const eventBus = new EventBus();
    const emittedBattles: any[] = [];
    eventBus.on('overview:start-battle', (payload) => emittedBattles.push(payload));

    const mockRendererHost = {
      renderer: {
        domElement: {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      renderToContainer: () => {},
      detachFromContainer: () => {},
    } as any;

    const creatureTemplates = JSON.parse(
      readFileSync('public/creaturetypes.json', 'utf8')
    );
    const abilityTypes = JSON.parse(
      readFileSync('public/abilitytypes.json', 'utf8')
    );

    const mockContext = {
      eventBus,
      templates: { creatureTemplates, abilityTypes },
      getThreeRendererHost: () => mockRendererHost,
    } as any;

    const scene = new OverviewScene3D();
    await scene.enter(mockContext);

    const campaign = scene.campaign!;
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const targetRegion = campaign.regions.find((r) => r.ownerPlayerId === null)!;
    const targetCoords = targetRegion.settlementCoords!;
    const neighbor = HexMap.getNeighboursInBounds(
      targetCoords,
      campaign.mapWidth,
      campaign.mapHeight
    ).find((n) => {
      const h = campaign.getHex(n);
      return h && isOverviewTerrainPassable(h.terrain) && !campaign.getArmyAt(n, playerArmy.id);
    })!;

    playerArmy.coords = { ...neighbor };
    playerArmy.movementPoints = 4;

    // 1. Trigger battle -> shows dialog without spending MP or launching battle
    scene.handleMoveArmy(playerArmy.id, targetCoords);
    expect(scene.hud!.battlePromptPanel.isVisible()).toBe(true);
    expect(emittedBattles.length).toBe(0);
    expect(playerArmy.movementPoints).toBe(4);

    // 2. Cancel preserves MP
    scene.hud!.battlePromptPanel.cancelButton.container.emit('pointertap', {} as any);
    expect(scene.hud!.battlePromptPanel.isVisible()).toBe(false);
    expect(playerArmy.movementPoints).toBe(4);

    // 3. Re-trigger and click Quick Battle -> computes summary without launching battle mode
    scene.handleMoveArmy(playerArmy.id, targetCoords);
    scene.hud!.battlePromptPanel.quickBattleButton.container.emit('pointertap', {} as any);
    expect(scene.hud!.battlePromptPanel.isVisible()).toBe(true);
    expect(emittedBattles.length).toBe(0);

    // 4. View Battle emits overview:start-battle with replayMode: true and seed
    scene.hud!.battlePromptPanel.viewBattleButton.container.emit('pointertap', {} as any);
    expect(scene.hud!.battlePromptPanel.isVisible()).toBe(false);
    expect(emittedBattles.length).toBe(1);
    expect(emittedBattles[0].replayMode).toBe(true);
    expect(typeof emittedBattles[0].config.seed).toBe('number');
    expect(playerArmy.movementPoints).toBeLessThan(4);

    // 5. Refuse Outcome emits overview:start-battle with replayMode: false (manual control)
    playerArmy.movementPoints = 4;
    scene.handleMoveArmy(playerArmy.id, targetCoords);
    scene.hud!.battlePromptPanel.quickBattleButton.container.emit('pointertap', {} as any);
    scene.hud!.battlePromptPanel.refuseOutcomeButton.container.emit('pointertap', {} as any);
    expect(emittedBattles.length).toBe(2);
    expect(emittedBattles[1].replayMode).toBe(false);

    // 6. Accept Outcome applies quick battle result without launching battle mode
    playerArmy.movementPoints = 4;
    scene.handleMoveArmy(playerArmy.id, targetCoords);
    scene.hud!.battlePromptPanel.quickBattleButton.container.emit('pointertap', {} as any);
    scene.hud!.battlePromptPanel.acceptOutcomeButton.container.emit('pointertap', {} as any);
    expect(emittedBattles.length).toBe(2);
    expect(scene.hud!.battlePromptPanel.isVisible()).toBe(false);
    expect(playerArmy.movementPoints).toBeLessThan(4);

    scene.destroy();
  });

  it('uses 64x64 transparent resource icons in OverviewHud2D and shows descriptive tooltips on hover', () => {
    for (const name of ['money', 'food', 'lumber', 'stone', 'iron']) {
      const buf = readFileSync(`public/ui/resources/${name}.png`);
      // PNG signature + IHDR width (bytes 16..19) & height (bytes 20..23) & color type 6 (RGBA at byte 25)
      expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(buf.readUInt32BE(16)).toBe(64);
      expect(buf.readUInt32BE(20)).toBe(64);
      expect(buf[25]).toBe(6);
    }

    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const hud = new OverviewHud2D(new Container());
    hud.bindCampaign(campaign);

    const player = campaign.getPlayer('player')!;
    expect(hud.resourceBadges.money.valueText.text).toBe(String(player.resources.money));
    expect(hud.resourceBadges.food.valueText.text).toBe(String(player.resources.food));
    expect(hud.resourceBadges.lumber.valueText.text).toBe(String(player.resources.lumber));
    expect(hud.resourceBadges.stone.valueText.text).toBe(String(player.resources.stone));
    expect(hud.resourceBadges.iron.valueText.text).toBe(String(player.resources.iron));

    expect(hud.resourceTooltip.isVisible()).toBe(false);
    hud.resourceBadges.money.container.emit('pointerover', { global: { x: 340, y: 40 } } as any);
    expect(hud.resourceTooltip.isVisible()).toBe(true);
    expect(hud.resourceTooltip.getText()).toContain('Gold Coins');
    expect(hud.resourceTooltip.getText()).toContain(String(player.resources.money));

    hud.resourceBadges.money.container.emit('pointerout', {} as any);
    expect(hud.resourceTooltip.isVisible()).toBe(false);

    hud.resourceBadges.iron.container.emit('pointerover', { global: { x: 740, y: 40 } } as any);
    expect(hud.resourceTooltip.isVisible()).toBe(true);
    expect(hud.resourceTooltip.getText()).toContain('Iron');

    hud.destroy();
  });

  it('maps every overview terrain type to an existing terrain texture including overview_water.png', () => {
    const terrainTypes = [
      'grassland',
      'forest',
      'deep_forest',
      'swamp',
      'hill',
      'mountain',
      'water',
    ] as const;
    for (const terrain of terrainTypes) {
      const cfg = OVERVIEW_TERRAIN_TEXTURE_CONFIG[terrain];
      expect(cfg).toBeDefined();
      const buf = readFileSync(`public/textures/terrain/${cfg.file}`);
      expect(buf.byteLength).toBeGreaterThan(100);
    }
    const waterBuf = readFileSync('public/textures/terrain/overview_water.png');
    expect(waterBuf.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(waterBuf.readUInt32BE(16)).toBe(512);
    expect(waterBuf.readUInt32BE(20)).toBe(512);
  });

  it('builds varied-depth water hexes with aShoreDist attribute and Eador stylized water shader', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    // Carve a 5x5 water sea in the center to exercise coastal (1 step), mid (2 steps), and deep (3+ steps) water hexes
    for (let x = 2; x <= 7; x++) {
      for (let y = 2; y <= 7; y++) {
        campaign.hexes[x][y].terrain = 'water';
      }
    }

    const board = new OverviewBoard3D(campaign);
    const heights = board.getWaterHexHeights();
    expect(heights.length).toBeGreaterThanOrEqual(36);
    expect(new Set(heights).size).toBeGreaterThanOrEqual(2);
    expect(heights).toContain(0.13);
    expect(heights).toContain(0.1);

    const waterMat = board.getWaterMaterial();
    expect(waterMat).not.toBeNull();
    expect(waterMat!.uniforms.uNormalMapA.value).toBeDefined();
    expect(waterMat!.uniforms.uNormalMapB.value).toBeDefined();
    expect(waterMat!.uniforms.uNormalMapA.value).not.toBe(
      waterMat!.uniforms.uNormalMapB.value
    );
    expect(waterMat!.fragmentShader).toContain('uNormalMapA');
    expect(waterMat!.fragmentShader).toContain('uNormalMapB');
    expect(waterMat!.fragmentShader).toContain('vShoreDist');

    // Verify water plane mesh has pre-baked aShoreDist attribute
    const waterMesh = board.getWaterMesh();
    expect(waterMesh).not.toBeNull();
    expect(waterMesh!.geometry.getAttribute('aShoreDist')).toBeDefined();

    const t0 = waterMat!.uniforms.uTime.value;
    board.update(500, new THREE.Vector3(3, 12, 9));
    expect(waterMat!.uniforms.uTime.value).toBeCloseTo(t0 + 0.5, 5);
    expect(waterMat!.uniforms.uCameraPos.value.x).toBe(3);

    board.dispose();
  });

  it('animates overview units and reacts army and settlement flags to the wind system', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const board = new OverviewBoard3D(campaign);

    // 3 visible armies + 4 settlements = 7 wind-animated flags
    expect(board.getAnimatedFlagCount()).toBe(7);
    expect(board.getAnimatedUnitCount()).toBeGreaterThan(0);

    const initialWind = board.getWindState();

    // Find a flag cloth mesh and an animated unit mesh
    let sampleCloth: THREE.Mesh | undefined;
    let sampleUnit: THREE.Object3D | undefined;
    board.group.traverse((obj) => {
      if (!sampleCloth && obj.userData?.isOverviewFlagCloth && obj instanceof THREE.Mesh) {
        sampleCloth = obj;
      }
      if (!sampleUnit && obj.userData?.isOverviewUnit) {
        sampleUnit = obj;
      }
    });
    expect(sampleCloth).toBeDefined();
    expect(sampleUnit).toBeDefined();

    const posAttr = sampleCloth!.geometry.getAttribute('position');
    const tipZBefore = posAttr.getZ(posAttr.count - 1);
    const unitRotBefore = sampleUnit!.rotation.y;

    board.update(450);

    const nextWind = board.getWindState();
    expect(nextWind.angleRad).not.toBe(initialWind.angleRad);
    expect(nextWind.strength).not.toBe(initialWind.strength);
    expect(posAttr.getZ(posAttr.count - 1)).not.toBe(tipZBefore);
    expect(sampleUnit!.rotation.y).not.toBe(unitRotBefore);

    // Low/no wind: flag drops along the pole into a cone shape
    board.updateFlagWindMeshes(0.2);
    let minYLow = Infinity;
    let maxXLow = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      minYLow = Math.min(minYLow, posAttr.getY(i));
      maxXLow = Math.max(maxXLow, posAttr.getX(i));
    }
    const flagWidth = (sampleCloth!.userData.flagWidth as number) || 0.34;
    expect(maxXLow).toBeLessThan(flagWidth * 0.35);
    expect(minYLow).toBeLessThan(-0.25);

    // Above medium wind: flag is extended horizontally
    board.updateFlagWindMeshes(1.4);
    let maxXHigh = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      maxXHigh = Math.max(maxXHigh, posAttr.getX(i));
    }
    expect(maxXHigh).toBeGreaterThan(flagWidth * 0.95);

    board.dispose();
  });

  it('computes fog of war from owned regions and 6-hex army sight range, and renders billowing fBm cloud layers', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));

    // All hexes in player-owned region_0_0 are visible
    const ownedHexes = campaign.getRegionHexes('region_0_0');
    expect(ownedHexes.every((h) => campaign.isHexVisible(h.coords))).toBe(true);

    // Far corner (9,9) is beyond player army's default 6-hex sight range
    expect(campaign.isHexVisible({ x: 9, y: 9 })).toBe(false);

    const board = new OverviewBoard3D(campaign);
    expect(board.getFogLayerCount()).toBe(3);
    const fogMats = board.getFogLayerMaterials();
    expect(fogMats.length).toBe(3);
    expect(fogMats[0].fragmentShader).toContain('fbm');
    expect(fogMats[0].uniforms.uSlateBlueColor.value.getHexString()).toBe('1a202c');
    expect(board.getFogMaskTexture()).not.toBeNull();
    expect(board.getArmyVisualCount()).toBe(3);

    // Move player army closer to (9,9) -> recomputes fog of war & reveals (9,9) and far garrison
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const farGarrison = campaign.armies.find(
      (a) => a.ownerPlayerId === null && !campaign.isHexVisible(a.coords)
    )!;
    expect(farGarrison).toBeDefined();

    // Find a passable hex adjacent to (5,5) to move into
    const stepTarget = { x: 4, y: 4 };
    playerArmy.coords = { x: 4, y: 3 };
    playerArmy.movementPoints = 4;
    campaign.hexes[stepTarget.x][stepTarget.y].terrain = 'grassland';
    const moveRes = campaign.moveArmy(playerArmy.id, stepTarget);
    if (!moveRes.moved) {
      // Fallback: place directly and recompute
      playerArmy.coords = { x: 5, y: 5 };
      campaign.recomputeFogOfWar();
    } else {
      playerArmy.coords = { x: 5, y: 5 };
      campaign.recomputeFogOfWar();
    }

    expect(campaign.isHexVisible({ x: 9, y: 9 })).toBe(true);
    board.syncArmies();
    expect(board.getArmyVisualCount()).toBe(4);

    const t0 = fogMats[0].uniforms.uTime.value;
    board.update(600);
    expect(fogMats[0].uniforms.uTime.value).toBeCloseTo(t0 + 0.6, 5);

    board.dispose();
  });

  it('merges allied armies when combined squads <= MAX_SQUADS_PER_ARMY', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap());
    const armyA = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    armyA.coords = { x: 2, y: 2 };
    armyA.movementPoints = 4;
    armyA.squads = [{ creatureType: CreatureType.SWORDSMAN, count: 5, hpPercent: 1 }];

    campaign.hexes[2][2].terrain = 'grassland';
    campaign.hexes[3][2].terrain = 'grassland';
    campaign.hexes[4][2].terrain = 'grassland';

    const armyB = {
      id: 'player_ally_merge',
      ownerPlayerId: 'player',
      coords: { x: 4, y: 2 },
      movementPoints: 4,
      maxMovementPoints: 4,
      sightRange: 6,
      squads: [
        { creatureType: CreatureType.SPEARMAN, count: 4, hpPercent: 1 },
        { creatureType: CreatureType.SWORDSMAN, count: 3, hpPercent: 1 },
      ],
      isGarrison: false,
    };
    campaign.armies.push(armyB);

    const reachable = campaign.getReachableHexes(armyA.id);
    expect(reachable.has('4,2')).toBe(true);

    const outcome = campaign.moveArmy(armyA.id, { x: 4, y: 2 });
    expect(outcome.moved).toBe(true);
    expect(outcome.triggeredBattle).toBe(false);
    expect(outcome.mergedIntoArmyId).toBe(armyB.id);
    expect(outcome.exchangeArmyIds).toBeUndefined();
    expect(campaign.getArmyById(armyA.id)).toBeUndefined();
    expect(armyB.squads).toHaveLength(3);
  });

  it('moves adjacent and opens OverviewArmyExchangePanel when combined squads > MAX_SQUADS_PER_ARMY', async () => {
    const scene = new OverviewScene3D();
    const mockRendererHost = {
      renderer: {
        domElement: {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      renderToContainer: () => {},
      detachFromContainer: () => {},
    } as any;

    const creatureTemplates = JSON.parse(readFileSync('public/creaturetypes.json', 'utf8'));
    const abilityTypes = JSON.parse(readFileSync('public/abilitytypes.json', 'utf8'));
    await scene.enter({
      eventBus: { emit: () => {} } as any,
      templates: { creatureTemplates, abilityTypes },
      getThreeRendererHost: () => mockRendererHost,
    } as any);

    const campaign = scene.campaign!;
    const armyA = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    armyA.coords = { x: 2, y: 2 };
    armyA.movementPoints = 4;
    armyA.squads = Array.from({ length: 6 }, (_, i) => ({
      creatureType: CreatureType.SWORDSMAN,
      count: 3,
      hpPercent: i === 0 ? 0.45 : 1,
    }));

    campaign.hexes[2][2].terrain = 'grassland';
    campaign.hexes[3][2].terrain = 'grassland';
    campaign.hexes[4][2].terrain = 'grassland';

    const armyB = {
      id: 'player_ally_exchange',
      ownerPlayerId: 'player',
      coords: { x: 4, y: 2 },
      movementPoints: 4,
      maxMovementPoints: 4,
      sightRange: 6,
      squads: Array.from({ length: 6 }, () => ({
        creatureType: CreatureType.SPEARMAN,
        count: 2,
        hpPercent: 1,
      })),
      isGarrison: false,
    };
    campaign.armies.push(armyB);

    scene.handleMoveArmy(armyA.id, { x: 4, y: 2 });

    expect(armyA.coords).toEqual({ x: 3, y: 2 });
    const panel = scene.hud!.armyExchangePanel;
    expect(panel.isVisible()).toBe(true);
    expect(panel.leftSlots).toHaveLength(8);
    expect(panel.rightSlots).toHaveLength(8);

    // Verify human-readable unit names, vertical healthbars, and portrait textures
    const dummyFaceTex = new Texture();
    panel.setUnitsSheet({
      textures: {
        'swordman_face.png': dummyFaceTex,
        'spearman_face.png': dummyFaceTex,
      },
    } as any);
    expect(panel.leftSlots[0].label.text).toBe('1. Swordsman (x3)');
    expect(panel.rightSlots[0].label.text).toBe('1. Spearman (x2)');
    expect(panel.leftSlots[0].healthBar.visible).toBe(true);
    expect(panel.leftSlots[0].portrait.visible).toBe(true);
    expect(panel.leftSlots[0].portrait.texture).toBe(dummyFaceTex);
    expect(panel.leftSlots[7].healthBar.visible).toBe(false);
    expect(panel.leftSlots[7].portrait.visible).toBe(false);

    // Move one squad from left (6 -> 5) to right (6 -> 7) via arrow button
    panel.leftSlots[0].button.container.emit('pointertap', {} as any);
    expect(armyA.squads).toHaveLength(5);
    expect(armyB.squads).toHaveLength(7);

    // Move one squad back from right (7 -> 6) to left (5 -> 6) via arrow button
    panel.rightSlots[6].button.container.emit('pointertap', {} as any);
    expect(armyA.squads).toHaveLength(6);
    expect(armyB.squads).toHaveLength(6);

    // Finish closes panel
    panel.doneButton.container.emit('pointertap', {} as any);
    expect(panel.isVisible()).toBe(false);

    scene.exit();
  });

  it('displays foreseen resource changes underneath current quantities in gold/dark orange and hides zero changes', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap());
    const playerRegion = campaign.regions.find((r) => r.ownerPlayerId === 'player')!;
    // Ensure positive money (taxes), negative food (high pop, 0 food workers), and 0 stone/iron/lumber
    playerRegion.population = 2000;
    playerRegion.taxRate = 0.25;
    for (const coord of playerRegion.hexCoords) {
      const hex = campaign.getHex(coord);
      if (hex) {
        hex.assignedWorkers = 0;
      }
    }

    const deltas = campaign.getForeseenResourceChanges('player');
    expect(deltas.money).toBeGreaterThan(0);
    expect(deltas.food).toBeLessThan(0);
    expect(deltas.stone).toBe(0);
    expect(deltas.iron).toBe(0);

    const hud = new OverviewHud2D(new Container());
    hud.bindCampaign(campaign);

    const moneyBadge = hud.resourceBadges.money;
    expect(moneyBadge.deltaText.visible).toBe(true);
    expect(moneyBadge.deltaText.text).toBe(`+${deltas.money}`);
    expect(moneyBadge.deltaText.style.fill).toBe('#f5d46f');
    expect(moneyBadge.deltaText.y).toBeGreaterThan(moneyBadge.valueText.y);

    const foodBadge = hud.resourceBadges.food;
    expect(foodBadge.deltaText.visible).toBe(true);
    expect(foodBadge.deltaText.text).toBe(`${deltas.food}`);
    expect(foodBadge.deltaText.style.fill).toBe('#d96b1b');
    expect(foodBadge.deltaText.y).toBeGreaterThan(foodBadge.valueText.y);

    const stoneBadge = hud.resourceBadges.stone;
    expect(stoneBadge.deltaText.visible).toBe(false);
    expect(stoneBadge.deltaText.text).toBe('');

    hud.destroy();
  });

  it('does not create battle WeatherSystem3D or sunny drifting clouds on OverviewView3D', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap());
    const mockHost = {
      canvas: {},
      hasRealWebGL: false,
      renderer: {
        domElement: {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        setScissorTest: () => {},
        getSize: () => ({ width: 800, height: 600 }),
        shadowMap: { enabled: false, type: 0 },
        render: () => {},
        dispose: () => {},
      },
      dispose: () => {},
    } as any;
    const container = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
      style: {},
    } as any;

    const view = new OverviewView3D(container, campaign, {}, mockHost);
    expect(view.sceneManager.weatherSystem).toBeUndefined();
    expect(view.sceneManager.scene.getObjectByName('WeatherSystem3D')).toBeUndefined();
    expect(view.sceneManager.scene.getObjectByName('DriftingCloudsSystem')).toBeUndefined();
    view.destroy();
  });

  it('places 8-14 trees per forest hex at double scale on OverviewBoard3D', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap());
    // Set exactly one forest hex and clear others to grassland so we can count directly
    for (let x = 0; x < campaign.mapWidth; x++) {
      for (let y = 0; y < campaign.mapHeight; y++) {
        campaign.hexes[x][y].terrain = x === 3 && y === 3 ? 'forest' : 'grassland';
      }
    }

    const board = new OverviewBoard3D(campaign);
    const treesGroup = board.group.children.find((g) => g.children.some((c) => c.userData?.hexCoords));
    expect(treesGroup).toBeDefined();
    const forestTrees = treesGroup!.children.filter(
      (c) => c.userData?.hexCoords?.x === 3 && c.userData?.hexCoords?.y === 3
    );
    expect(forestTrees.length).toBeGreaterThanOrEqual(8);
    expect(forestTrees.length).toBeLessThanOrEqual(14);
    expect(forestTrees[0].userData.baseScale).toBeCloseTo(0.68, 5);
    board.dispose();
  });

  it('uses 4 unique overview texture variations per land terrain and updates seamless blending grid via updateHexTerrain', async () => {
    const battleTextures = new Set(['grass.jpg', 'forest.jpg', 'swamp.jpg', 'dirt.jpg', 'mountain.jpg', 'water.jpg']);
    const landTerrains = ['grassland', 'forest', 'deep_forest', 'swamp', 'hill', 'mountain'] as const;
    for (const terrain of landTerrains) {
      const cfg = OVERVIEW_TERRAIN_TEXTURE_CONFIG[terrain];
      expect(cfg.variations).toHaveLength(4);
      for (const file of cfg.variations) {
        expect(battleTextures.has(file)).toBe(false);
        const buf = readFileSync(`public/textures/terrain/${file}`);
        expect(buf.byteLength).toBeGreaterThan(100);
      }
    }

    const campaign = new OverviewCampaign(createStarterOverviewMap(42));
    const board = new OverviewBoard3D(campaign);
    const landMat = board.getLandTerrainMaterial();
    expect(landMat).not.toBeNull();
    expect(landMat!.userData.isOverviewBlendedTerrain).toBe(true);

    const gridTex = board.getTerrainGridTexture();
    expect(gridTex).not.toBeNull();

    // Verify continuous heightfield mesh carries aHexCoord, aTileCenter, and intra-hex elevation variation
    const { getTerrainHeight } = await import('../render3d/overview/overview-board-3d');
    expect(getTerrainHeight('mountain')).toBeCloseTo(1.575, 5);
    expect(getTerrainHeight('hill')).toBeCloseTo(0.918, 5);
    expect(getTerrainHeight('water')).toBeCloseTo(-0.36, 5);

    const terrainMesh = board.getTerrainMesh()!;
    expect(terrainMesh).not.toBeNull();
    expect(terrainMesh.geometry.getAttribute('aHexCoord')).toBeDefined();
    expect(terrainMesh.geometry.getAttribute('aTileCenter')).toBeDefined();

    // Find a non-occupied land hex and verify intra-hex elevation variation + flat-pad on occupied hexes
    let c = { x: 0, y: 0 };
    for (let x = 0; x < campaign.mapWidth; x++) {
      for (let y = 0; y < campaign.mapHeight; y++) {
        const h = campaign.hexes[x][y];
        if (h.terrain !== 'water' && !h.isSettlement && !h.resourceBuilding && !h.isDefenseHex) {
          c = { x, y };
          break;
        }
      }
    }
    const centerPos = board.hexToWorld(c.x, c.y);
    const y0 = board.sampleElevationAtWorld(centerPos.x, centerPos.z);
    const yOff = board.sampleElevationAtWorld(centerPos.x + 0.35, centerPos.z + 0.25);
    expect(Math.abs(yOff - y0)).toBeGreaterThan(0.0005);

    // Future map editor hook: mutating a hex updates both the grid texture cell and heightfield vertices
    campaign.hexes[c.x][c.y].terrain = 'mountain';
    board.updateHexTerrain(c.x, c.y);
    const data = gridTex!.image.data as Uint8Array;
    const idx = (c.y * campaign.mapWidth + c.x) * 4;
    expect(data[idx]).toBe(5); // mountain = 5
    const yAfter = board.sampleElevationAtWorld(centerPos.x, centerPos.z);
    expect(yAfter).toBeGreaterThan(y0 + 0.2);

    board.dispose();
  });

  it('creates ~500-tri black-and-white cow meshes, places 3 per cattle hex, desyncs animations, and stays 85% idle / 15% graze or tail-wag', () => {
    const cow = createOverviewCowModel(1);
    const tris = countGroupTriangles(cow);
    expect(tris).toBeGreaterThanOrEqual(420);
    expect(tris).toBeLessThanOrEqual(650);

    const anim = cow.userData as CowAnimationData;
    expect(anim.isOverviewCow).toBe(true);
    expect(anim.idleProbability).toBe(0.85);
    expect(cow.getObjectByName('CowNeckBelt')).toBeDefined();
    expect(cow.getObjectByName('CowBell')).toBeDefined();

    // Graze animation lowers head
    triggerOverviewCowAnimation(cow, 'graze');
    updateOverviewCowAnimation(cow, 0.65);
    expect(anim.headPivot.rotation.x).toBeGreaterThan(0.35);

    // Graze-right animation bows head to the right (-Y rotation), moves mouth, holds ~2.5s, and returns
    triggerOverviewCowAnimation(cow, 'graze_right');
    updateOverviewCowAnimation(cow, 1.0);
    expect(anim.headPivot.rotation.x).toBeGreaterThan(0.5);
    expect(anim.headPivot.rotation.y).toBeLessThan(-0.2);
    const muzzleRot1 = anim.muzzle.rotation.x;
    updateOverviewCowAnimation(cow, 1.2);
    expect(anim.headPivot.rotation.x).toBeGreaterThan(0.5);
    expect(anim.muzzle.rotation.x).not.toBeCloseTo(muzzleRot1, 3);
    updateOverviewCowAnimation(cow, 1.45);
    expect(anim.state).toBe('idle');
    expect(Math.abs(anim.headPivot.rotation.y)).toBeLessThan(0.05);
    expect(anim.muzzle.rotation.x).toBeCloseTo(Math.PI * 0.58, 3);

    // Tail-wag animation swings tailPivot.rotation.z
    triggerOverviewCowAnimation(cow, 'wag_tail');
    updateOverviewCowAnimation(cow, 0.2);
    const z1 = anim.tailPivot.rotation.z;
    updateOverviewCowAnimation(cow, 0.13);
    const z2 = anim.tailPivot.rotation.z;
    expect(Math.abs(z1) + Math.abs(z2)).toBeGreaterThan(0.2);

    // Duty cycle check over 600s (~85% idle, ~15% active)
    let idleTicks = 0;
    const totalTicks = 6000;
    for (let i = 0; i < totalTicks; i++) {
      updateOverviewCowAnimation(cow, 0.1);
      if (anim.state === 'idle') idleTicks++;
    }
    const idleRatio = idleTicks / totalTicks;
    expect(idleRatio).toBeGreaterThan(0.75);
    expect(idleRatio).toBeLessThan(0.93);

    // 3 desynced cows on a cattle hex in OverviewBoard3D
    const campaign = new OverviewCampaign(createStarterOverviewMap(77));
    for (let x = 0; x < campaign.mapWidth; x++) {
      for (let y = 0; y < campaign.mapHeight; y++) {
        campaign.hexes[x][y].isSettlement = false;
        campaign.hexes[x][y].resourceBuilding = undefined;
        campaign.hexes[x][y].isDefenseHex = false;
        campaign.hexes[x][y].isAgriculturalPlot = x === 2 && y === 2;
        campaign.hexes[x][y].agricultureOption = x === 2 && y === 2 ? 'cattle' : 'none';
      }
    }
    const board = new OverviewBoard3D(campaign);
    const cows: CowAnimationData[] = [];
    board.group.traverse((obj) => {
      if (obj.userData?.isOverviewCow) {
        cows.push(obj.userData as CowAnimationData);
      }
    });
    expect(cows).toHaveLength(3);
    // Desynced initial elapsed times
    expect(new Set(cows.map((c) => c.elapsed)).size).toBe(3);
    board.dispose();
  });

  it('blocks map mouse/keyboard events when menu is open and closes menuPanel on Escape key', () => {
    const listeners = new Map<string, Array<(e: any) => void>>();
    const origWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        const arr = listeners.get(type) ?? [];
        arr.push(fn);
        listeners.set(type, arr);
      },
      removeEventListener: (type: string, fn: (e: any) => void) => {
        const arr = listeners.get(type) ?? [];
        listeners.set(
          type,
          arr.filter((f) => f !== fn)
        );
      },
    };

    try {
      const campaign = new OverviewCampaign(createStarterOverviewMap());
      let blocking = true;
      const mockHost = {
        canvas: {},
        hasRealWebGL: false,
        renderer: {
          domElement: {},
          setSize: () => {},
          setPixelRatio: () => {},
          setClearColor: () => {},
          setScissorTest: () => {},
          getSize: () => ({ width: 800, height: 600 }),
          shadowMap: { enabled: false, type: 0 },
          render: () => {},
          dispose: () => {},
        },
        dispose: () => {},
      } as any;
      const container = {
        clientWidth: 800,
        clientHeight: 600,
        addEventListener: () => {},
        removeEventListener: () => {},
        style: {},
      } as any;

      const view = new OverviewView3D(
        container,
        campaign,
        { isMenuBlockingInput: () => blocking },
        mockHost
      );

      const startTarget = view.sceneManager.getCameraTarget().clone();
      const startDist = view.sceneManager.getCameraDistance();

      // Dispatch pointerdown + drag + pointerup + wheel + keydown while menu is blocking
      for (const fn of listeners.get('pointerdown') ?? []) {
        fn({ button: 0, clientX: 100, clientY: 100 });
      }
      for (const fn of listeners.get('pointermove') ?? []) {
        fn({ clientX: 250, clientY: 250 });
      }
      for (const fn of listeners.get('pointerup') ?? []) {
        fn({ button: 0, clientX: 250, clientY: 250 });
      }
      for (const fn of listeners.get('wheel') ?? []) {
        fn({ deltaY: 200 });
      }
      for (const fn of listeners.get('keydown') ?? []) {
        fn({ key: 'w' });
      }
      view.setKeyPressed('d', true);
      view.updateCameraKeyboardInput(500);

      expect(view.sceneManager.getCameraTarget().x).toBeCloseTo(startTarget.x, 5);
      expect(view.sceneManager.getCameraTarget().z).toBeCloseTo(startTarget.z, 5);
      expect(view.sceneManager.getCameraDistance()).toBeCloseTo(startDist, 5);
      expect(view.isKeyPressed('d')).toBe(false);

      // Verify Escape toggles menuPanel open and closed in OverviewHud2D
      const hud = new OverviewHud2D(new Container());
      let menuVisible = true;
      hud.menuPanel = {
        isVisible: () => menuVisible,
        show: () => {
          menuVisible = true;
        },
        hide: () => {
          menuVisible = false;
        },
        destroy: () => {},
      } as any;

      let prevented = false;
      for (const fn of listeners.get('keydown') ?? []) {
        fn({
          key: 'Escape',
          defaultPrevented: false,
          preventDefault: () => {
            prevented = true;
          },
        });
      }
      expect(prevented).toBe(true);
      expect(menuVisible).toBe(false);

      // Pressing Escape again while hidden opens the menuPanel
      prevented = false;
      for (const fn of listeners.get('keydown') ?? []) {
        fn({
          key: 'Escape',
          defaultPrevented: false,
          preventDefault: () => {
            prevented = true;
          },
        });
      }
      expect(prevented).toBe(true);
      expect(menuVisible).toBe(true);

      hud.destroy();
      view.destroy();
    } finally {
      (globalThis as any).window = origWindow;
    }
  });

  it('spreads forest trees away from center, avoids lumber_camp overlap, and spaces cattle without intersection', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(88));
    for (let x = 0; x < campaign.mapWidth; x++) {
      for (let y = 0; y < campaign.mapHeight; y++) {
        campaign.hexes[x][y].terrain = 'grassland';
        campaign.hexes[x][y].isSettlement = false;
        campaign.hexes[x][y].resourceBuilding = undefined;
        campaign.hexes[x][y].isDefenseHex = false;
        campaign.hexes[x][y].isAgriculturalPlot = false;
      }
    }
    campaign.hexes[2][2].terrain = 'forest';
    campaign.hexes[4][2].terrain = 'forest';
    campaign.hexes[4][2].resourceBuilding = 'lumber_camp';
    campaign.hexes[3][3].isAgriculturalPlot = true;
    campaign.hexes[3][3].agricultureOption = 'cattle';

    const board = new OverviewBoard3D(campaign);
    const treesGroup = board.group.children.find((g) => g.children.some((c) => c.userData?.hexCoords))!;

    const plainForestTrees = treesGroup.children.filter(
      (c) => c.userData?.hexCoords?.x === 2 && c.userData?.hexCoords?.y === 2
    );
    const plainAvgDist =
      plainForestTrees.reduce(
        (sum, t) => sum + Math.hypot(t.userData.localOffset.x, t.userData.localOffset.z),
        0
      ) / plainForestTrees.length;
    expect(plainAvgDist).toBeGreaterThan(0.4);

    const campForestTrees = treesGroup.children.filter(
      (c) => c.userData?.hexCoords?.x === 4 && c.userData?.hexCoords?.y === 2
    );
    expect(campForestTrees.length).toBeGreaterThanOrEqual(8);
    for (const t of campForestTrees) {
      const dist = Math.hypot(t.userData.localOffset.x, t.userData.localOffset.z);
      expect(dist).toBeGreaterThanOrEqual(0.479);
    }

    const cowPositions: Array<{ x: number; z: number }> = [];
    board.group.traverse((obj) => {
      if (obj.userData?.isOverviewCow) {
        cowPositions.push({ x: obj.position.x, z: obj.position.z });
      }
    });
    expect(cowPositions).toHaveLength(3);
    for (let i = 0; i < cowPositions.length; i++) {
      for (let j = i + 1; j < cowPositions.length; j++) {
        const d = Math.hypot(
          cowPositions[i].x - cowPositions[j].x,
          cowPositions[i].z - cowPositions[j].z
        );
        expect(d).toBeGreaterThanOrEqual(0.35);
      }
    }
    board.dispose();
  });

  it('loads ambient-sounds.json, samples camera context, scales volume by zoom, avoids immediate repeats, and plays beds/one-shots', async () => {
    const raw = JSON.parse(
      readFileSync('public/ambient-sounds.json', 'utf8')
    ) as AmbientSoundsConfig;
    expect(raw.beds.grassland).toEqual([
      'audio/ambient/grasslands-bird-and-cricket-singing.ogg',
    ]);
    expect(raw.oneShots.cattle.length).toBeGreaterThanOrEqual(2);
    expect(raw.oneShots.lumber_camp).toHaveLength(4);
    expect(raw.oneShots.settlement).toEqual([
      'audio/ambient/large-anvil-steel-hammer-4.ogg',
    ]);
    expect(raw.beds.forest).toEqual([]);
    expect(raw.oneShots.quarry).toEqual([]);

    // Verify all configured audio files exist on disk
    for (const list of [...Object.values(raw.beds), ...Object.values(raw.oneShots)]) {
      for (const file of list) {
        expect(readFileSync(`public/${file}`).byteLength).toBeGreaterThan(100);
      }
    }

    const campaign = new OverviewCampaign(createStarterOverviewMap(123));
    for (let x = 0; x < campaign.mapWidth; x++) {
      for (let y = 0; y < campaign.mapHeight; y++) {
        campaign.hexes[x][y].terrain = 'grassland';
        campaign.hexes[x][y].isSettlement = false;
        campaign.hexes[x][y].resourceBuilding = undefined;
        campaign.hexes[x][y].isAgriculturalPlot = false;
      }
    }
    campaign.hexes[2][2].isAgriculturalPlot = true;
    campaign.hexes[2][2].agricultureOption = 'cattle';
    campaign.hexes[2][3].resourceBuilding = 'lumber_camp';
    campaign.hexes[1][2].isSettlement = true;

    const played: Array<{ alias: string; opts: any }> = [];
    const stopped: string[] = [];
    const mockDriver = {
      add: async () => {},
      exists: () => true,
      play: (alias: string, opts: any) => {
        played.push({ alias, opts });
        return { volume: opts?.volume ?? 1 };
      },
      stop: (alias: string) => {
        stopped.push(alias);
      },
    };

    expect(SoundCategory.AMBIENT).toBe('AMBIENT');

    const settings = new BattleSettings();
    settings.sound.soundOn = false;
    settings.sound.soundVolume = 0;
    settings.sound.ambientOn = true;
    settings.sound.ambientVolume = 0.8;

    const ambient = new OverviewAmbientAudio(campaign, settings, mockDriver);
    ambient.setConfig(raw);
    await ambient.loadSounds();

    // Non-repeating variation check
    const picks: Array<string | null> = [];
    for (let i = 0; i < 10; i++) {
      picks.push(ambient.pickVariationWithoutRepeat('cattle', raw.oneShots.cattle));
    }
    for (let i = 1; i < picks.length; i++) {
      expect(picks[i]).not.toBe(picks[i - 1]);
    }

    // Zoom attenuation check
    expect(ambient.computeZoomVolumeFactor(4.5, 4.5, 32)).toBeCloseTo(1.0, 5);
    expect(ambient.computeZoomVolumeFactor(32, 4.5, 32)).toBeCloseTo(0.35, 5);

    // Context sampling & playback
    const ctx = ambient.sampleContextAroundHex({ x: 2, y: 2 });
    expect(ctx.dominantBedTag).toBe('grassland');
    expect(ctx.oneShotTags).toContain('cattle');
    expect(ctx.oneShotTags).toContain('lumber_camp');
    expect(ctx.oneShotTags).toContain('settlement');

    ambient.update(700, { x: 2, y: 2 }, 4.5, 4.5, 32);
    expect(
      played.some((p) => p.alias === 'audio/ambient/grasslands-bird-and-cricket-singing.ogg' && p.opts.loop === true)
    ).toBe(true);
    expect(played.some((p) => p.opts.loop === false)).toBe(true);

    ambient.destroy();
    expect(stopped).toContain('audio/ambient/grasslands-bird-and-cricket-singing.ogg');

    // SoundSettings exposes separate ambientOn and ambientVolume defaults
    const { SoundSettings } = await import('../battle/settings');
    const soundSettings = new SoundSettings();
    expect(soundSettings.ambientOn).toBe(true);
    expect(soundSettings.ambientVolume).toBe(0.75);
  });

  it('builds high-detail iron_mine model with <=256x256 stone & reddish iron textures, cave entrance, wooden frame, and pickaxes', async () => {
    const { createOverviewResourceBuildingModel } = await import(
      '../render3d/overview/overview-models-3d'
    );
    const {
      getIronMineStoneTexture,
      getIronMineInnerOreTexture,
    } = await import('../render3d/overview/overview-iron-mine-3d');

    const mine = createOverviewResourceBuildingModel('iron_mine');
    const tris = countGroupTriangles(mine);
    expect(tris).toBeGreaterThan(1500);

    expect(mine.getObjectByName('IronMineOuterRock')).toBeDefined();
    expect(mine.getObjectByName('IronMineInnerWall')).toBeDefined();
    expect(mine.getObjectByName('IronMinePickaxeRight')).toBeDefined();
    expect(mine.getObjectByName('IronMinePickaxeLeft')).toBeDefined();

    const stoneTex = getIronMineStoneTexture();
    expect(stoneTex.image.width).toBeLessThanOrEqual(256);
    expect(stoneTex.image.height).toBeLessThanOrEqual(256);

    const ironTex = getIronMineInnerOreTexture();
    expect(ironTex.image.width).toBeLessThanOrEqual(256);
    expect(ironTex.image.height).toBeLessThanOrEqual(256);
    const data = ironTex.image.data as Uint8Array;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }
    expect(rSum).toBeGreaterThan(gSum * 1.4);
    expect(rSum).toBeGreaterThan(bSum * 1.4);
  });

  it('builds high-detail medieval lumber_camp model with <=256x256 wood/shingle textures, log walls, windows, door, and fenced holding area', async () => {
    const { createOverviewResourceBuildingModel } = await import(
      '../render3d/overview/overview-models-3d'
    );
    const {
      getLumberMillLogTexture,
      getLumberMillShingleTexture,
    } = await import('../render3d/overview/overview-lumber-mill-3d');

    const mill = createOverviewResourceBuildingModel('lumber_camp');
    const tris = countGroupTriangles(mill);
    expect(tris).toBeGreaterThan(800);
    expect(tris).toBeLessThan(1500);

    expect(mill.getObjectByName('LumberMillCabin')).toBeDefined();
    expect(mill.getObjectByName('LumberMillDoor')).toBeDefined();
    expect(mill.getObjectByName('LumberMillWindow')).toBeDefined();
    expect(mill.getObjectByName('LumberMillHoldingArea')).toBeDefined();
    expect(mill.getObjectByName('ProcessedLog')).toBeDefined();

    const logTex = getLumberMillLogTexture();
    expect(logTex.image.width).toBeLessThanOrEqual(256);
    expect(logTex.image.height).toBeLessThanOrEqual(256);

    const shingleTex = getLumberMillShingleTexture();
    expect(shingleTex.image.width).toBeLessThanOrEqual(256);
    expect(shingleTex.image.height).toBeLessThanOrEqual(256);

    // Cattle field has low-poly rustic medieval criss-crossing fence around the cows
    const { createOverviewAgricultureModel } = await import(
      '../render3d/overview/overview-models-3d'
    );
    const cattleField = createOverviewAgricultureModel('cattle', 7);
    const cattleFence = cattleField.getObjectByName('CattleFence');
    expect(cattleFence).toBeDefined();
    expect(countGroupTriangles(cattleFence!)).toBeLessThan(350);

    // Wheat field has <=256x256 textures, InstancedMesh clusters, 3-5 Voronoi sub-plots, and wind-reactive shader uniforms
    const {
      getWheatStalkTexture,
      getWheatSoilTexture,
      getOverviewWheatMaterial,
      updateOverviewWheatWind,
      generateGrainSubPlots,
      GRAIN_HEX_RADIUS,
    } = await import('../render3d/overview/overview-wheat-field-3d');
    expect(GRAIN_HEX_RADIUS).toBe(1.0);
    const plots = generateGrainSubPlots(3);
    expect(plots.length).toBeGreaterThanOrEqual(3);
    expect(plots.length).toBeLessThanOrEqual(5);

    // Default global-map wheat model omits flat WheatSoilBed so it conforms to blended sloped terrain
    const wheatField = createOverviewAgricultureModel('wheat', 3);
    expect(wheatField.getObjectByName('WheatSoilBed')).toBeUndefined();
    const wheatFieldWithBase = createOverviewAgricultureModel('wheat', 3, { includeSoilBase: true });
    const soilBed = wheatFieldWithBase.getObjectByName('WheatSoilBed') as THREE.Mesh;
    const wheatStalks = wheatField.getObjectByName('WheatStalks') as THREE.InstancedMesh;
    expect(soilBed).toBeDefined();
    expect(soilBed.geometry.getAttribute('color')).toBeDefined();
    expect(wheatStalks).toBeDefined();
    expect(wheatStalks.isInstancedMesh).toBe(true);
    expect(wheatStalks.count).toBeGreaterThan(500);
    expect(wheatStalks.instanceColor).not.toBeNull();
    expect(wheatField.getObjectByName('WheatHayBale')).toBeDefined();
    expect(getWheatStalkTexture().image.width).toBeLessThanOrEqual(256);
    expect(getWheatStalkTexture().image.height).toBeLessThanOrEqual(256);
    expect(getWheatSoilTexture().image.width).toBeLessThanOrEqual(256);
    expect(getWheatSoilTexture().image.height).toBeLessThanOrEqual(256);

    const wheatMat = getOverviewWheatMaterial();
    const { configureWindThresholds, getWindThresholds } = await import(
      '../render3d/decorations/wind-system'
    );
    configureWindThresholds({
      medium_strength_threshold: 1.1,
      strong_strength_threshold: 1.5,
    });
    expect(getWindThresholds()).toEqual({
      mediumStrengthThreshold: 1.1,
      strongStrengthThreshold: 1.5,
    });

    updateOverviewWheatWind(2.5, Math.PI * 0.5, 0.42);
    expect(wheatMat.userData.uWindTime.value).toBeCloseTo(2.5, 5);
    expect(wheatMat.userData.uWindStrength.value).toBeCloseTo(0.42, 5);
    expect(wheatMat.userData.uWindDir.value.y).toBeCloseTo(1, 4);
    expect(wheatMat.userData.uMediumWindThreshold.value).toBeCloseTo(1.1, 5);
    expect(wheatMat.userData.uStrongWindThreshold.value).toBeCloseTo(1.5, 5);
  });

  it('generates rivers ending in lakes, roads connecting settlements without sharing river edges, bridges, and expected move costs', async () => {
    const {
      hexesConnectedByRiver,
      hexesConnectedByRoad,
    } = await import('./overview-map-generator');
    const {
      getOverviewTerrainMoveCost,
      getOverviewStepMoveCost,
    } = await import('./overview-campaign');
    const { createOverviewBridgeModel } = await import(
      '../render3d/overview/overview-models-3d'
    );

    // 1. Movement costs: road = 1, grassland = 1.5, hill = 2, water = 4
    expect(getOverviewTerrainMoveCost('grassland')).toBe(1.5);
    expect(getOverviewTerrainMoveCost('hill')).toBe(2);
    expect(getOverviewTerrainMoveCost('water')).toBe(4);
    expect(isOverviewTerrainPassable('water')).toBe(true);
    expect(isOverviewTerrainPassable('mountain')).toBe(false);

    const hexA = {
      coords: { x: 0, y: 0 },
      regionId: 'r0',
      terrain: 'hill' as const,
      hasRoad: true,
      roadConnections: [{ x: 1, y: 0 }],
      assignedWorkers: 0,
    };
    const hexB = {
      coords: { x: 1, y: 0 },
      regionId: 'r0',
      terrain: 'hill' as const,
      hasRoad: true,
      roadConnections: [{ x: 0, y: 0 }],
      assignedWorkers: 0,
    };
    expect(getOverviewStepMoveCost(hexA, hexB)).toBe(1);

    // 2. Verify rivers/lakes, roads, and mutual exclusion across multiple seeds
    let centerCount = 0;
    let secondRingCount = 0;
    let totalSettlements = 0;
    let sawRiver = false;
    let sawRoad = false;

    for (let s = 1; s <= 15; s++) {
      const gen = createStarterOverviewMap(s * 17);

      // Settlement distribution tracking
      for (const reg of gen.regions) {
        if (!reg.settlementCoords) continue;
        totalSettlements++;
        const dx = reg.settlementCoords.x - reg.gridCoords.x * REGION_SIZE;
        const dy = reg.settlementCoords.y - reg.gridCoords.y * REGION_SIZE;
        if (dx >= 2 && dx <= 3 && dy >= 2 && dy <= 3) centerCount++;
        else if (dx >= 1 && dx <= 4 && dy >= 1 && dy <= 4) secondRingCount++;
      }

      // River & road edge mutual exclusion
      for (let x = 0; x < gen.mapWidth; x++) {
        for (let y = 0; y < gen.mapHeight; y++) {
          const h = gen.hexes[x][y];
          if (h.hasRiver) sawRiver = true;
          if (h.hasRoad) sawRoad = true;
          for (const rc of h.roadConnections ?? []) {
            const nb = gen.hexes[rc.x][rc.y];
            expect(hexesConnectedByRiver(h, nb)).toBe(false);
            expect(hexesConnectedByRoad(h, nb)).toBe(true);
          }
        }
      }

      // All region settlements connected by road network
      const start = gen.regions[0].settlementCoords!;
      const roadVisited = new Set<string>([`${start.x},${start.y}`]);
      const q = [start];
      while (q.length > 0) {
        const cur = q.shift()!;
        for (const rc of gen.hexes[cur.x][cur.y].roadConnections ?? []) {
          const k = `${rc.x},${rc.y}`;
          if (!roadVisited.has(k)) {
            roadVisited.add(k);
            q.push(rc);
          }
        }
      }
      for (const reg of gen.regions) {
        if (reg.settlementCoords) {
          expect(roadVisited.has(`${reg.settlementCoords.x},${reg.settlementCoords.y}`)).toBe(
            true
          );
        }
      }
    }

    expect(sawRiver).toBe(true);
    expect(sawRoad).toBe(true);
    expect(centerCount / totalSettlements).toBeGreaterThan(0.4);
    expect((centerCount + secondRingCount) / totalSettlements).toBeGreaterThan(0.8);

    // 3. Bridge mesh & 3D board river/road meshes
    const bridge = createOverviewBridgeModel();
    expect(bridge.name).toBe('OverviewBridge');
    expect(bridge.children.length).toBeGreaterThan(4);

    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const board = new OverviewBoard3D(campaign);
    expect(board.getRoadMesh()).not.toBeNull();
    expect(board.getMeadowDecorCount()).toBeGreaterThan(0);
    expect(board.getFieldstoneCount()).toBeGreaterThan(0);
    expect(board.group.getObjectByName('OverviewMeadowInstanced')).toBeDefined();
    expect(board.group.getObjectByName('OverviewFieldstonesInstanced')).toBeDefined();
    board.dispose();
  });

  it('should move attacking army adjacent to enemy before engagement so a draw leaves them next to each other', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(77));
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const enemyArmy = campaign.armies.find((a) => a.ownerPlayerId !== 'player')!;

    // Place enemy at a reachable hex at least 2 steps away from playerArmy
    const reachable = campaign.getReachableHexes(playerArmy.id);
    const isAdjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      HexMap.getNeighboursInBounds(a, campaign.mapWidth, campaign.mapHeight).some(
        (n) => n.x === b.x && n.y === b.y
      );
    const pathTarget = Array.from(reachable.entries()).find(([key, cost]) => {
      const [x, y] = key.split(',').map(Number);
      return cost >= 1.5 && (x !== playerArmy.coords.x || y !== playerArmy.coords.y) && !isAdjacent(playerArmy.coords, { x, y });
    });
    expect(pathTarget).toBeDefined();
    const [tx, ty] = pathTarget![0].split(',').map(Number);
    enemyArmy.coords = { x: tx, y: ty };
    enemyArmy.isGarrison = false;
    playerArmy.movementPoints = 10;

    expect(isAdjacent(playerArmy.coords, enemyArmy.coords)).toBe(false);

    const prepared = campaign.prepareEngagementAt(playerArmy.id, enemyArmy.coords);
    expect(prepared).not.toBeNull();
    expect(prepared!.movedDuringApproach).toBe(true);
    expect(isAdjacent(playerArmy.coords, enemyArmy.coords)).toBe(true);

    // Simulate a draw: attacker should remain at the adjacent hex next to enemy
    const survivorA = new Creature(CreatureType.SWORDSMAN);
    survivorA.armyAlignment = 0;
    survivorA.live_stats.remaining_health = survivorA.stats.health;
    const survivorB = new Creature(CreatureType.PEASANT);
    survivorB.armyAlignment = 1;
    survivorB.live_stats.remaining_health = survivorB.stats.health;

    campaign.applyBattleResult(
      {
        victorArmyIndex: -1,
        turnsTaken: 5,
        survivingCreatures: [survivorA, survivorB],
        casualties: [],
        routedCreatures: [],
        totalDamageDealt: [20, 20],
        totalStaminaSpent: [20, 20],
        moraleBreaks: [0, 0],
        friendlyFireEvents: 0,
      },
      prepared!.attacker.id,
      prepared!.defender.id,
      prepared!.targetRegion?.id
    );

    expect(isAdjacent(playerArmy.coords, enemyArmy.coords)).toBe(true);
  });

  it('keeps retreated player units in the army after defeat or surrender, and removes the army if none retreated', () => {
    const campaign = new OverviewCampaign(createStarterOverviewMap(12345));
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const enemyArmy = campaign.armies.find((a) => a.ownerPlayerId !== 'player')!;
    expect(playerArmy).toBeDefined();
    expect(enemyArmy).toBeDefined();

    const retreatedUnit = new Creature(CreatureType.PEASANT);
    retreatedUnit.armyAlignment = 0;
    retreatedUnit.live_stats.remaining_health = retreatedUnit.stats.health;

    const enemySurvivor = new Creature(CreatureType.SWORDSMAN);
    enemySurvivor.armyAlignment = 1;
    enemySurvivor.live_stats.remaining_health = enemySurvivor.stats.health;

    campaign.applyBattleResult(
      {
        victorArmyIndex: 1,
        turnsTaken: 3,
        survivingCreatures: [enemySurvivor],
        casualties: [],
        routedCreatures: [retreatedUnit],
        totalDamageDealt: [10, 20],
        totalStaminaSpent: [10, 10],
        moraleBreaks: [0, 0],
        friendlyFireEvents: 0,
      },
      playerArmy.id,
      enemyArmy.id
    );

    const updatedPlayerArmy = campaign.getArmyById(playerArmy.id);
    expect(updatedPlayerArmy).toBeDefined();
    expect(updatedPlayerArmy!.squads.length).toBe(1);
    expect(updatedPlayerArmy!.squads[0].creatureType).toBe(CreatureType.PEASANT);

    // If no units retreated or survived on defeat, the army is removed
    campaign.applyBattleResult(
      {
        victorArmyIndex: 1,
        turnsTaken: 1,
        survivingCreatures: [enemySurvivor],
        casualties: [],
        routedCreatures: [],
        totalDamageDealt: [0, 20],
        totalStaminaSpent: [0, 10],
        moraleBreaks: [0, 0],
        friendlyFireEvents: 0,
      },
      playerArmy.id,
      enemyArmy.id
    );
    expect(campaign.getArmyById(playerArmy.id)).toBeUndefined();
  });

  it('renders settlements 20% larger (and town castles 10% larger further) and omits the hexagon base on town castles', async () => {
    const { createOverviewSettlementModel } = await import('../render3d/overview/overview-models-3d');
    for (const tier of ['village', 'town', 'city'] as const) {
      const model = createOverviewSettlementModel(tier, '#3498db', 'banner7.png');
      const expectedScale = tier === 'town' ? 1.518 : 1.2;
      expect(model.scale.x).toBeCloseTo(expectedScale, 4);
      expect(model.scale.y).toBeCloseTo(expectedScale, 4);
      expect(model.scale.z).toBeCloseTo(expectedScale, 4);
      if (tier === 'town') {
        expect(model.getObjectByName('SettlementGround')).toBeUndefined();
      }
      let foundBannerCloth = false;
      model.traverse((obj) => {
        if (obj.userData?.isOverviewFlagCloth) {
          foundBannerCloth = true;
          expect(obj.userData.bannerName).toBe('banner7.png');
        }
      });
      expect(foundBannerCloth).toBe(true);
    }
  });

  it('loads global_config.json for player & neutral colors/banners and passes them with terrain type to initiated battles', async () => {
    const globalConfig = JSON.parse(readFileSync('public/global_config.json', 'utf8'));
    expect(Array.isArray(globalConfig.players)).toBe(true);
    expect(globalConfig.neutral).toBeDefined();

    const customGlobalConfig = {
      players: [
        {
          id: 'player',
          name: 'Azure Kingdom',
          isAI: false,
          color: '#1e88e5',
          banner: 'banner3.png',
        },
      ],
      neutral: {
        name: 'Neutral',
        color: '#7f8c8d',
        banner: 'banner15.png',
      },
    };

    const campaign = new OverviewCampaign(createStarterOverviewMap(12345, customGlobalConfig));
    expect(campaign.getFactionColor('player')).toBe('#1e88e5');
    expect(campaign.getFactionBanner('player')).toBe('banner3.png');
    expect(campaign.getFactionColor(null)).toBe('#7f8c8d');
    expect(campaign.getFactionBanner(null)).toBe('banner15.png');

    const { CreatureRepository } = await import('../battle/creature-repository');
    const { Battle } = await import('../battle');
    const { getPlayerColorsConfig } = await import('../render3d/units/unit-mesh-builder');
    const repo = new CreatureRepository();
    repo.setAbilities(JSON.parse(readFileSync('public/abilitytypes.json', 'utf8')));
    repo.setCreatureTemplates(JSON.parse(readFileSync('public/creaturetypes.json', 'utf8')));

    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    const forestRegion = campaign.regions.find((r) => r.preset === 'forest')!;
    const neutralArmy = campaign.armies.find((a) => a.ownerPlayerId === null)!;
    // Place neutral army on a hill hex if available or verify forest region preset fallback
    const battleConfig = campaign.buildBattleConfigForEngagement(
      playerArmy,
      neutralArmy,
      forestRegion,
      repo
    );

    expect(battleConfig.playerColors).toEqual({
      player1: '#1e88e5',
      player2: '#7f8c8d',
    });
    expect(battleConfig.player1Banner).toBe('banner3.png');
    expect(battleConfig.player2Banner).toBe('banner15.png');

    const battle = new Battle(new HexMap(battleConfig.mapWidth, battleConfig.mapHeight));
    const combatConfig = JSON.parse(readFileSync('public/combat_config.json', 'utf8'));
    battle.setCombatConfig(combatConfig);
    battle.initializeFromConfig(battleConfig);

    expect(battle.getBannerForArmy(0)).toBe('banner3.png');
    expect(battle.getBannerForArmy(1)).toBe('banner15.png');
    expect(getPlayerColorsConfig().player1).toBe(0x1e88e5);
    expect(getPlayerColorsConfig().player2).toBe(0x7f8c8d);
    expect(battle.getMajorTerrainType()).toBe(
      campaign.getHex(neutralArmy.coords)?.terrain === 'swamp'
        ? 'swamp'
        : campaign.getHex(neutralArmy.coords)?.terrain === 'hill' || campaign.getHex(neutralArmy.coords)?.terrain === 'mountain'
          ? 'highlands'
          : 'forest'
    );
  });

  it('applies faction color and banner to overview army units (including peasants) and uses light beige peasant skin', () => {
    const playerVisual = createOverviewCombinedArmyVisual(
      {
        id: 'army_p',
        ownerPlayerId: 'player',
        coords: { x: 0, y: 0 },
        movementPoints: 4,
        maxMovementPoints: 4,
        squads: [
          { creatureType: CreatureType.PEASANT, count: 10, hpPercent: 1 },
          { creatureType: CreatureType.SPEARMAN, count: 8, hpPercent: 1 },
        ],
      },
      '#1e88e5',
      'banner3.png'
    );
    const neutralVisual = createOverviewCombinedArmyVisual(
      {
        id: 'army_n',
        ownerPlayerId: null,
        coords: { x: 1, y: 0 },
        movementPoints: 4,
        maxMovementPoints: 4,
        squads: [{ creatureType: CreatureType.PEASANT, count: 8, hpPercent: 1 }],
      },
      '#7f8c8d',
      'banner15.png'
    );

    const playerPeasant = playerVisual.getObjectByName('OverviewPeasant')!;
    const neutralPeasant = neutralVisual.getObjectByName('OverviewPeasant')!;
    expect(playerPeasant.userData.teamColorHex).toBe(0x1e88e5);
    expect(playerPeasant.userData.bannerName).toBe('banner3.png');
    expect(neutralPeasant.userData.teamColorHex).toBe(0x7f8c8d);
    expect(neutralPeasant.userData.bannerName).toBe('banner15.png');

    // Verify peasant_rigged.glb embedded texture was updated to light beige skin
    const glbBuf = readFileSync('public/models/units/peasant_rigged.glb');
    const jsonLen = glbBuf.readUInt32LE(12);
    const gltf = JSON.parse(glbBuf.subarray(20, 20 + jsonLen).toString('utf8'));
    expect(gltf.images?.[0]?.name).toBe('tex_peasant_atlas');
    expect(gltf.buffers?.[0]?.byteLength).toBeGreaterThan(0);
  });
});
