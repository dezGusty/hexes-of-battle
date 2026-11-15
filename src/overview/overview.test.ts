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
      expect(army.squads.length).toBe(10);
    }

    for (const region of generated.regions) {
      expect(region.hexCoords.length).toBe(25);
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

    // Recruitment (reduce a 9-squad army to test adding a 10th squad)
    const playerArmy = campaign.armies.find((a) => a.ownerPlayerId === 'player')!;
    playerArmy.squads.pop();
    const popBeforeRecruit = playerRegion.population;
    expect(recruitSquad(player, playerRegion, CreatureType.PEASANT, playerArmy)).toBe(true);
    expect(playerArmy.squads.length).toBe(10);
    expect(playerRegion.population).toBe(popBeforeRecruit - 25);
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

    expect(board.tileMeshes.length).toBe(100);
    // 1 player army + 2 visible neutral armies within 6-hex sight range (far region_1_1 garrison is hidden by fog of war)
    expect(board.getArmyVisualCount()).toBe(3);

    board.setReachableHexes(['1,1', '2,1']);
    board.setReachableHexes([]);
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

      scene.handleMoveArmy(playerArmy.id, targetCoords);
      expect(scene.hud!.battlePromptPanel.isVisible()).toBe(true);
      expect(emittedBattles.length).toBe(i);
      scene.hud!.battlePromptPanel.fightOnBattlefieldButton.container.emit('pointertap', {} as any);
      expect(scene.hud!.battlePromptPanel.isVisible()).toBe(false);
      expect(emittedBattles.length).toBe(i + 1);
      expect(emittedBattles[i].replayMode).toBe(false);
      expect(emittedBattles[i].config.creatures.length).toBe(
        playerArmy.squads.length + 10
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

    const settings = new BattleSettings();
    settings.sound.soundOn = true;
    settings.sound.soundVolume = 0.8;

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

    // Verify water tile meshes have pre-baked aShoreDist attribute
    const waterMesh = board.tileMeshes.find((m) => {
      const c = m.userData?.coords;
      return c && campaign.getHex(c)?.terrain === 'water';
    });
    expect(waterMesh).toBeDefined();
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
    armyA.squads = Array.from({ length: 6 }, () => ({
      creatureType: CreatureType.SWORDSMAN,
      count: 3,
      hpPercent: 1,
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
    expect(panel.leftSlots).toHaveLength(10);
    expect(panel.rightSlots).toHaveLength(10);

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
});
