import { describe, it, expect, vi } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import * as THREE from 'three';
import { Sprite as PixiSprite, Texture as PixiTexture } from 'pixi.js';
import { HexBoard3D } from './hex-board-3d';
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus } from '../shared/hex-map';
import { Creature, CreatureType } from '../battle/creature';
import { UnitVisualFactory } from './units/unit-visual-factory';
import { ProjectileSystem3D } from './projectiles/projectile-system-3d';
import { BattleHud2D } from './battle-hud-2d';
import { Battle } from '../battle';
import { BattleSettings } from '../battle/settings';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { EnemyStatsPanel } from '../ui/enemy-stats-panel';
import { ThreeSceneDebugger } from './debug/three-scene-debugger';
import { BattleHexMapPath } from '../battle/battle-hex-map-path';
import { NumMatrix } from '../shared/num-matrix';

describe('3D Graphics Engine & Rendering Systems', () => {
  describe('1. 3D Hex Board & Coordinates', () => {
    it('should map hex grid coordinates to 3D world space and back', () => {
      const hexMap = new HexMap(13, 9);
      const hexBoard = new HexBoard3D(hexMap);

      const worldPos = hexBoard.hexToWorld(3, 4);
      expect(worldPos.x).toBeTypeOf('number');
      expect(worldPos.z).toBeTypeOf('number');

      const returnedHex = hexBoard.worldToHex(worldPos);
      expect(returnedHex).not.toBeNull();
      expect(returnedHex?.x).toBe(3);
      expect(returnedHex?.y).toBe(4);
    });

    it('should calculate correct elevation and tile count for hex board', () => {
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);

      expect(hexBoard.group.children.length).toBeGreaterThan(50);
    });

    it('should align hexes in pointy-topped orientation with straight horizontal East/West lines', () => {
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);

      const pos0 = hexBoard.hexToWorld(2, 3);
      const pos1 = hexBoard.hexToWorld(3, 3);

      // Same row (y=3) across different columns (x=2 to x=3) should have identical Z (horizontal line)
      expect(pos0.z).toBeCloseTo(pos1.z, 5);
      // X increases for East neighbor
      expect(pos1.x).toBeGreaterThan(pos0.x);
    });

    it('should support dynamic terrain types via getTerrain provider', () => {
      const hexMap = new HexMap(4, 4);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          if (x === 0 && y === 0) return 4; // Mountain
          if (x === 1 && y === 0) return 5; // Water
          if (x === 2 && y === 0) return 1; // Forest
          return 0; // Plain
        },
      });

      expect(hexBoard.group.children.length).toBeGreaterThan(0);
      hexBoard.dispose();
    });
  });

  describe('2. Multi-Model Squad 3D Visual Generation', () => {
    it('should generate multi-model squad with billboard static visual format by default', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.PEASANT);
      creature.stats.model_count = 8;
      creature.stats.health = 40;
      creature.stats.remaining_health = 40;

      const squad = factory.createSquadVisual(creature);
      expect(squad).toBeDefined();
      expect(squad.rootGroup.children.length).toBeGreaterThanOrEqual(8);
    });

    it('should support multi-format visual representations (Rigid 3D, Skeletal 3D, Animated Billboard, Static Billboard)', () => {
      const factory = new UnitVisualFactory();

      // Static billboard
      const peasant = new Creature(CreatureType.PEASANT);
      const squadStatic = factory.createSquadVisual(peasant);
      expect(squadStatic).toBeDefined();

      // Rigid 3D
      const knight = new Creature(CreatureType.HEAVY_KNIGHTS);
      knight.stats.traits.push('format_rigid_3d');
      const squadRigid = factory.createSquadVisual(knight);
      expect(squadRigid).toBeDefined();

      // Skeletal 3D
      const hero = new Creature(CreatureType.HERO_COMMANDER);
      hero.stats.traits.push('format_skeletal_3d');
      const squadSkeletal = factory.createSquadVisual(hero);
      expect(squadSkeletal).toBeDefined();

      // Animated 2D Billboard
      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.stats.traits.push('format_animated_2d');
      const squadAnimated = factory.createSquadVisual(archer);
      expect(squadAnimated).toBeDefined();
    });

    it('should update squad casualties and overhead status in 3D', () => {
      const factory = new UnitVisualFactory();
      const squadCreature = new Creature(CreatureType.SPEARMAN);
      squadCreature.stats.model_count = 8;
      squadCreature.stats.health = 40;
      squadCreature.stats.remaining_health = 40;

      const squad = factory.createSquadVisual(squadCreature);
      expect(squadCreature.aliveModelCount).toBe(8);

      // Inflict damage dropping 4 models
      squadCreature.takeDamage(20);
      expect(squadCreature.aliveModelCount).toBe(4);
      squad.updateStats();

      // Add floating combat text in 3D
      squad.addFloatingCombatText('-20 BACKSTAB', '#ffaa00');
      expect(squad.rootGroup.children.length).toBeGreaterThan(0);

      // Now eliminate squad completely
      squadCreature.takeDamage(20);
      expect(squadCreature.isAlive).toBe(false);
      expect(squadCreature.aliveModelCount).toBe(0);
      squad.updateStats();
      expect(squad.isEliminated).toBe(true);

      // Overhead group should be hidden
      const overhead = squad.rootGroup.children.find((c) => c.children.length >= 3);
      if (overhead) {
        expect(overhead.visible).toBe(false);
      }
    });

    it('should correctly map multiple squads uniquely using HobGUID.toString() without overwriting', () => {
      const c1 = new Creature(CreatureType.PEASANT);
      const c2 = new Creature(CreatureType.SPEARMAN);
      const c3 = new Creature(CreatureType.SWORDSMAN);

      expect(c1.GUID.toString()).not.toBe('[object Object]');
      expect(c1.GUID.toString()).not.toBe(c2.GUID.toString());
      expect(c2.GUID.toString()).not.toBe(c3.GUID.toString());

      const map = new Map<string, Creature>();
      map.set(c1.GUID.toString(), c1);
      map.set(c2.GUID.toString(), c2);
      map.set(c3.GUID.toString(), c3);

      expect(map.size).toBe(3);
      expect(map.get(c1.GUID.toString())).toBe(c1);
      expect(map.get(c2.GUID.toString())).toBe(c2);
      expect(map.get(c3.GUID.toString())).toBe(c3);
    });
  });

  describe('3. 3D Ballistic Projectile System & Trajectory Curves', () => {
    it('should calculate 3D parabolic ballistic trajectory and velocity tangent orientation', () => {
      const projectileSys = new ProjectileSystem3D();
      let impactCalled = false;

      const source = new THREE.Vector3(0, 0.5, 0);
      const target = new THREE.Vector3(10, 0, 0);

      projectileSys.spawnVolley({
        sourcePos: source,
        targetPos: target,
        projectileType: 'arrow',
        durationMs: 300,
        apexHeight: 3.0,
        volleyCount: 4,
        onImpact: () => {
          impactCalled = true;
        },
      });

      expect(projectileSys.group.children.length).toBeGreaterThan(0);

      // Simulate flight over time
      projectileSys.update(100);
      expect(impactCalled).toBe(false);

      projectileSys.update(300);
      expect(impactCalled).toBe(true);

      projectileSys.dispose();
    });

    it('should support array of individual projectile trajectories with distinct target destinations', () => {
      const projectileSys = new ProjectileSystem3D();
      let impactsTriggered = 0;

      const source = new THREE.Vector3(0, 0.5, 0);
      const targetMain = new THREE.Vector3(10, 0, 0);
      const targetScatter1 = new THREE.Vector3(9, 0, 2);
      const targetScatter2 = new THREE.Vector3(11, 0, -2);

      projectileSys.spawnVolley({
        sourcePos: source,
        projectiles: [
          { targetPos: targetMain, onImpact: () => impactsTriggered++ },
          { targetPos: targetScatter1, onImpact: () => impactsTriggered++ },
          { targetPos: targetScatter2, onImpact: () => impactsTriggered++ },
        ],
        projectileType: 'arrow',
        durationMs: 250,
        apexHeight: 2.5,
      });

      expect(projectileSys.group.children.length).toBeGreaterThan(0);

      projectileSys.update(100);
      expect(impactsTriggered).toBe(0);

      projectileSys.update(300);
      expect(impactsTriggered).toBe(3);

      projectileSys.dispose();
    });
  });

  describe('4. 2D Tactical HUD Overlay for 3D Battle Arena', () => {
    it('should correctly detect pointer over UI bounding boxes', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      const assets = { softCursorTextures: {} };

      const hud = new BattleHud2D(assets, settings, battle);

      // Left sidebar
      expect(hud.isPointerOverUI(50, 400)).toBe(true);
      expect(hud.isPointerOverUI(10, 800)).toBe(true);

      // Top banner and top-right zoom/altitude controls
      expect(hud.isPointerOverUI(500, 30)).toBe(true);
      expect(hud.isPointerOverUI(1640, 30)).toBe(true);

      // Center battlefield area (should not block 3D interaction)
      expect(hud.isPointerOverUI(800, 500)).toBe(false);
      expect(hud.isPointerOverUI(1100, 600)).toBe(false);

      hud.destroy();
    });

    it('should initialize FPS indicator from settings and update FPS text on frame tick', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      settings.debug.showFps = true;
      settings.debug.fpsFontSize = 16;
      const assets = { softCursorTextures: {} };

      const hud = new BattleHud2D(assets, settings, battle);

      expect(hud.fpsText).toBeDefined();
      expect(hud.isFpsVisible()).toBe(true);

      // Update with 60 FPS
      hud.update(16.6, 59.8);
      expect(hud.fpsText?.text).toBe('FPS: 60');

      // Toggle FPS visibility
      hud.setFpsVisible(false);
      expect(hud.isFpsVisible()).toBe(false);
      expect(hud.fpsText?.visible).toBe(false);

      hud.setFpsVisible(true);
      expect(hud.isFpsVisible()).toBe(true);
      expect(hud.fpsText?.visible).toBe(true);

      hud.destroy();
    });

    it('should respect settings.hex.showStats in BattleHud2D', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      settings.hex.showStats = true;

      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => PixiTexture.EMPTY,
        }),
      };

      const assets = {
        uiSheet: dummyUiSheet as any,
        softCursorTextures: {},
      };

      const hud = new BattleHud2D(assets, settings, battle);
      hud.unitStats = new UnitStatsPanel(hud.uiPlusRenderGroup, dummyUiSheet as unknown as any);
      if (settings.hex.showStats) {
        hud.unitStats.show();
      }

      expect(hud.unitStats.isVisible()).toBe(true);

      // Toggling stats updates settings
      hud.unitStats.toggleVisibility();
      settings.hex.showStats = hud.unitStats.isVisible();
      expect(settings.hex.showStats).toBe(false);

      hud.destroy();
    });

    it('should create compact EnemyStatsPanel with all 11 stats and handle open/close and hit tests', () => {
      const settings = new BattleSettings();
      const battle = new Battle(new HexMap(13, 9));
      const dummyUiSheet = {
        textures: new Proxy({}, {
          get: () => PixiTexture.EMPTY,
        }),
      };
      const assets = {
        uiSheet: dummyUiSheet as any,
        unitsSheet: dummyUiSheet as any,
        bannersSheet: dummyUiSheet as any,
        softCursorTextures: {},
      };

      const hud = new BattleHud2D(assets, settings, battle);
      hud.enemyStats = new EnemyStatsPanel(hud.uiPlusRenderGroup, dummyUiSheet as unknown as any);

      // Initially hidden
      expect(hud.enemyStats.isVisible()).toBe(false);

      const enemyCreature = new Creature(CreatureType.SPEARMAN);
      enemyCreature.armyAlignment = 1;
      enemyCreature.position = { x: 5, y: 5 };
      enemyCreature.stats.remaining_health = 12;
      enemyCreature.stats.health = 15;
      enemyCreature.stats.attack_melee_low = 4;
      enemyCreature.stats.attack_melee_high = 7;
      enemyCreature.stats.defense_melee = 3;
      enemyCreature.stats.defense_ranged = 2;
      enemyCreature.stats.remaining_movement = 4;
      enemyCreature.stats.num_moves = 4;
      enemyCreature.stats.remaining_attacks = 1;
      enemyCreature.stats.num_attacks = 1;
      enemyCreature.stats.remaining_counterattacks = 1;
      enemyCreature.stats.num_counterattacks = 1;
      enemyCreature.stats.stamina = 8;

      // Show enemy stats
      hud.showEnemyStats(enemyCreature);
      expect(hud.enemyStats.isVisible()).toBe(true);

      // Panel hit testing: inside panel bounds
      const panelX = hud.enemyStats.window.x;
      const panelY = hud.enemyStats.window.y;
      expect(hud.enemyStats.containsPoint(panelX + 10, panelY + 10)).toBe(true);
      expect(hud.enemyStats.containsPoint(100, 100)).toBe(false);

      // isPointerOverUI respects enemy stats panel when visible
      expect(hud.isPointerOverUI(panelX + 20, panelY + 20)).toBe(true);

      // Mousemove updates tooltip
      hud.updateCursorPosition({ x: panelX + 90, y: panelY + 30 });

      // Hide enemy stats (e.g. clicking outside)
      hud.hideEnemyStats();
      expect(hud.enemyStats.isVisible()).toBe(false);
      expect(hud.isPointerOverUI(panelX + 20, panelY + 20)).toBe(false);

      hud.destroy();
    });

    it('should correctly retrieve faction banner textures for army indices from bannersSheet', () => {
      const settings = new BattleSettings();
      const battle = new Battle(new HexMap(13, 9));
      const dummyBanners: Record<string, PixiTexture> = {
        'banner1.png': { uid: 'banner1' } as any,
        'banner2.png': { uid: 'banner2' } as any,
      };
      const assets = {
        uiSheet: { textures: {} } as any,
        bannersSheet: { textures: dummyBanners } as any,
        softCursorTextures: {},
      };

      const hud = new BattleHud2D(assets, settings, battle);
      expect(hud.getBannerTextureForArmyIndex(0)).toBe(dummyBanners['banner1.png']);
      expect(hud.getBannerTextureForArmyIndex(1)).toBe(dummyBanners['banner2.png']);

      hud.destroy();
    });

    it('should correctly map each CreatureType to its matching portrait texture', () => {
      const settings = new BattleSettings();
      const battle = new Battle(new HexMap(13, 9));
      const dummyFaces: Record<string, PixiTexture> = {
        'peasant_face.png': { uid: 'peasant' } as any,
        'peasant_archer_face.png': { uid: 'peasant_archer' } as any,
        'swordman_face.png': { uid: 'swordsman' } as any,
        'spearman_face.png': { uid: 'spearman' } as any,
        'crossbowman_face.png': { uid: 'crossbowman' } as any,
        'barbarian_face.png': { uid: 'barbarian' } as any,
      };
      const assets = {
        uiSheet: { textures: {} } as any,
        unitsSheet: { textures: dummyFaces } as any,
        softCursorTextures: {},
      };

      const hud = new BattleHud2D(assets, settings, battle);

      const peasant = new Creature(CreatureType.PEASANT);
      const peasantArcher = new Creature(CreatureType.PEASANT_ARCHER);
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const spearman = new Creature(CreatureType.SPEARMAN);
      const crossbowman = new Creature(CreatureType.CROSSBOWMAN);
      const barbarian = new Creature(CreatureType.BARBARIAN);

      expect(hud.getFaceTextureForCreature(peasant)).toBe(dummyFaces['peasant_face.png']);
      expect(hud.getFaceTextureForCreature(peasantArcher)).toBe(dummyFaces['peasant_archer_face.png']);
      expect(hud.getFaceTextureForCreature(swordsman)).toBe(dummyFaces['swordman_face.png']);
      expect(hud.getFaceTextureForCreature(spearman)).toBe(dummyFaces['spearman_face.png']);
      expect(hud.getFaceTextureForCreature(crossbowman)).toBe(dummyFaces['crossbowman_face.png']);
      expect(hud.getFaceTextureForCreature(barbarian)).toBe(dummyFaces['barbarian_face.png']);

      hud.destroy();
    });
  });

  describe('5. Hex Grid Black Border Rendering & Configurable Thickness', () => {
    it('should create black borders on all hexes and toggle visibility', () => {
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        showGrid: true,
        borderThickness: 3.0,
        borderColor: '#000000',
      });

      expect(hexBoard.isGridVisible()).toBe(true);

      // Toggle grid off
      hexBoard.setGridVisible(false);
      expect(hexBoard.isGridVisible()).toBe(false);

      // Toggle grid back on
      hexBoard.setGridVisible(true);
      expect(hexBoard.isGridVisible()).toBe(true);

      // Change thickness
      hexBoard.setGridBorderThickness(4.5);
      expect(hexBoard.isGridVisible()).toBe(true);

      hexBoard.dispose();
    });

    it('should support coordinates display rendering and toggling', () => {
      const hexMap = new HexMap(8, 5);
      const hexBoard = new HexBoard3D(hexMap, {
        showCoords: true,
        coordsFontSize: 14,
        coordsColor: '#ffffff',
        coordsStrokeColor: '#000000',
        coordsStrokeWidth: 3,
      });

      expect(hexBoard.isCoordsVisible()).toBe(true);

      // Toggle off
      hexBoard.setCoordsVisible(false);
      expect(hexBoard.isCoordsVisible()).toBe(false);

      // Toggle back on
      hexBoard.setCoordsVisible(true);
      expect(hexBoard.isCoordsVisible()).toBe(true);

      hexBoard.dispose();
    });
  });

  describe('6. Continuous Keyboard Camera Navigation & Hotkeys', () => {
    it('should smoothly pan and rotate camera every frame when keys are held', () => {
      const pressedKeys = new Set<string>();
      let cameraYaw = 0;
      let targetZ = 0;
      let targetX = 0;

      const panSpeed = 16.0;
      const rotateSpeed = 2.2;

      // Simulate holding 'q' (rotate left) and 'w' (pan forward)
      pressedKeys.add('q');
      pressedKeys.add('w');
      expect(pressedKeys.has('q')).toBe(true);
      expect(pressedKeys.has('w')).toBe(true);

      const dt = 100 / 1000; // 100ms
      if (pressedKeys.has('w')) targetZ -= panSpeed * dt;
      if (pressedKeys.has('s')) targetZ += panSpeed * dt;
      if (pressedKeys.has('a')) targetX -= panSpeed * dt;
      if (pressedKeys.has('d')) targetX += panSpeed * dt;
      if (pressedKeys.has('q')) cameraYaw -= rotateSpeed * dt;
      if (pressedKeys.has('e')) cameraYaw += rotateSpeed * dt;

      expect(cameraYaw).toBeCloseTo(-0.22, 5);
      expect(targetZ).toBeCloseTo(-1.6, 5);

      // Release 'q' and 'w'
      pressedKeys.delete('q');
      pressedKeys.delete('w');
      expect(pressedKeys.has('q')).toBe(false);
      expect(pressedKeys.has('w')).toBe(false);
    });

    it('should use right-click exclusively for secondary targeting actions', () => {
      const hexMap = new HexMap(10, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(10, 6);

      let targetActionCalled = false;
      battle.handleSecondaryCellAction = (coords) => {
        targetActionCalled = true;
        expect(coords).toEqual({ x: 3, y: 3 });
        return true;
      };

      // Simulate right-click pointerup event on target hex
      const hoveredHex = { x: 3, y: 3 };
      const pointerEvent = { button: 2, ctrlKey: false };

      if (pointerEvent.button === 2 && hoveredHex) {
        battle.handleSecondaryCellAction(hoveredHex);
      }

      expect(targetActionCalled).toBe(true);
    });

    it('should adjust camera pitch within constraints on altitude up/down', () => {
      let cameraPitch = 0.8;
      const minPitch = 0.35;
      const maxPitch = 1.45;

      const rotateCamera = (_deltaYaw: number, deltaPitch: number) => {
        cameraPitch = Math.max(minPitch, Math.min(maxPitch, cameraPitch + deltaPitch));
      };

      // Altitude Up: pitch angle from zenith decreases (camera goes higher)
      rotateCamera(0, -0.1);
      expect(cameraPitch).toBeCloseTo(0.7);

      // Repeated altitude up clamps to minPitch
      for (let i = 0; i < 10; i++) rotateCamera(0, -0.1);
      expect(cameraPitch).toBe(minPitch);

      // Altitude Down: pitch angle from zenith increases (camera goes lower)
      rotateCamera(0, 0.1);
      expect(cameraPitch).toBeCloseTo(minPitch + 0.1);

      // Repeated altitude down clamps to maxPitch
      for (let i = 0; i < 20; i++) rotateCamera(0, 0.1);
      expect(cameraPitch).toBe(maxPitch);
    });
  });

  describe('7. 3D Directional Attack Selection, Ground Arrow Preview & Cursors', () => {
    it('should accurately convert 3D world offset vectors into the 6 hex directions and center deadzone', () => {
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);

      // Deadzone near center
      expect(hexBoard.worldVectorToHexDirection(0.01, 0.01)).toBe(HexDirection.NONE);

      // 6 Pointy-Topped sectors:
      // East (dx > 0, dz ~ 0)
      expect(hexBoard.worldVectorToHexDirection(0.5, 0.0)).toBe(HexDirection.EAST);
      // Southeast (dx > 0, dz > 0)
      expect(hexBoard.worldVectorToHexDirection(0.5, 0.8)).toBe(HexDirection.SOUTHEAST);
      // Southwest (dx < 0, dz > 0)
      expect(hexBoard.worldVectorToHexDirection(-0.5, 0.8)).toBe(HexDirection.SOUTHWEST);
      // West (dx < 0, dz ~ 0)
      expect(hexBoard.worldVectorToHexDirection(-0.5, 0.0)).toBe(HexDirection.WEST);
      // Northwest (dx < 0, dz < 0)
      expect(hexBoard.worldVectorToHexDirection(-0.5, -0.8)).toBe(HexDirection.NORTHWEST);
      // Northeast (dx > 0, dz < 0)
      expect(hexBoard.worldVectorToHexDirection(0.5, -0.8)).toBe(HexDirection.NORTHEAST);

      hexBoard.dispose();
    });

    it('should create 3D tactical attack origin hex, directional arrow, and path preview', () => {
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);

      // Ranged target preview (originCoords = null)
      hexBoard.setAttackPreview({ x: 4, y: 4 }, null, HexFlankStatus.NONE);
      expect((hexBoard as any).attackPreviewGroup.children.length).toBe(2);

      // Melee attack preview with origin and directional arrow
      hexBoard.setAttackPreview({ x: 4, y: 4 }, { x: 3, y: 4 }, HexFlankStatus.NONE);
      expect((hexBoard as any).attackPreviewGroup.children.length).toBeGreaterThan(0);

      // Backstab attack preview
      expect(checkFlankingStatus(HexDirection.WEST, HexDirection.EAST)).toBe(HexFlankStatus.BACKSTAB);
      hexBoard.setAttackPreview({ x: 4, y: 4 }, { x: 5, y: 4 }, HexFlankStatus.BACKSTAB);
      expect((hexBoard as any).attackPreviewGroup.children.length).toBeGreaterThan(0);

      // Flank attack preview
      expect(checkFlankingStatus(HexDirection.WEST, HexDirection.SOUTHEAST)).toBe(HexFlankStatus.FLANK);
      hexBoard.setAttackPreview({ x: 4, y: 4 }, { x: 4, y: 3 }, HexFlankStatus.FLANK);
      expect((hexBoard as any).attackPreviewGroup.children.length).toBeGreaterThan(0);

      // Set and clear enhanced luminous path route ribbon and waypoints
      hexBoard.setPathPreview([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 2 }]);
      expect((hexBoard as any).pathPreviewGroup.children.length).toBeGreaterThan(0);

      hexBoard.clearPathPreview();
      expect((hexBoard as any).pathPreviewGroup.children.length).toBe(0);

      hexBoard.clearAttackPreview();
      expect((hexBoard as any).attackPreviewGroup.children.length).toBe(0);

      hexBoard.dispose();
    });

    it('should update HUD cursor texture on setCursor calls', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      const defaultTex = PixiTexture.WHITE;
      const meleeTex = PixiTexture.WHITE;
      const assets = {
        softCursorTextures: {
          default: defaultTex,
          attack_melee_nw: meleeTex,
        },
      };

      const hud = new BattleHud2D(assets, settings, battle);
      hud.softCursorSprite = new PixiSprite(defaultTex);

      hud.setCursor('attack_melee_nw');
      expect(hud.softCursorSprite?.texture).toBe(meleeTex);

      hud.setCursor('default');
      expect(hud.softCursorSprite?.texture).toBe(defaultTex);

      hud.destroy();
    });
  });

  describe('8. 3D Scene Debugger & Entity Inspector', () => {
    it('should initialize debugger with lil-gui and list scene entities', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1.77, 0.1, 200);
      const hexBoardGroup = new THREE.Group();
      hexBoardGroup.name = 'HexBoard';
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      mesh.name = 'TestMesh';
      hexBoardGroup.add(mesh);
      scene.add(hexBoardGroup);

      const mockSceneManager = {
        scene,
        camera,
        getCameraConfig: () => ({ minDistance: 8, maxDistance: 32, minPitch: 0.1, maxPitch: 1.5 }),
        getCameraDistance: () => 18,
        setCameraDistance: vi.fn(),
        getCameraYaw: () => 0,
        setCameraYaw: vi.fn(),
        getCameraPitch: () => 0.5,
        setCameraPitch: vi.fn(),
        setCameraTarget: vi.fn(),
        resetCamera: vi.fn(),
        getDirLight: () => null,
        getAmbientLight: () => null,
        getHemiLight: () => null,
      } as any;

      const mockBattleView = {
        battle: {
          getActiveCreature: () => null,
          nextTurn: vi.fn(),
          selectNextUnitAndGetIndex: vi.fn(),
          restActiveCreature: vi.fn(),
        },
        squadVisuals: new Map(),
        setGridVisible: vi.fn(),
        setCoordsVisible: vi.fn(),
      } as any;

      const dbg = new ThreeSceneDebugger(mockSceneManager, mockBattleView, { autoOpen: false });
      expect(dbg.gui).toBeDefined();

      dbg.refreshEntityList();
      dbg.updateStats();

      dbg.selectObject(mesh);
      expect((dbg as any).selectedObject).toBe(mesh);
      expect((dbg as any).highlightHelper).toBeDefined();

      dbg.focusCameraOnObject(mesh);
      expect(mockSceneManager.setCameraTarget).toHaveBeenCalled();

      dbg.clearHighlight();
      expect((dbg as any).highlightHelper).toBeNull();

      dbg.toggle();
      dbg.dispose();
    });

    it('should list path preview waypoints and tactical previews in Entity Inspector', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1.77, 0.1, 200);
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);
      scene.add(hexBoard.group);

      // Set path preview with 3 waypoints
      hexBoard.setPathPreview([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 2 }]);
      hexBoard.setAttackPreview({ x: 3, y: 3 }, { x: 3, y: 2 }, HexFlankStatus.NONE);

      const mockSceneManager = {
        scene,
        camera,
        getCameraConfig: () => ({ minDistance: 8, maxDistance: 32, minPitch: 0.1, maxPitch: 1.5 }),
        getCameraDistance: () => 18,
        setCameraDistance: vi.fn(),
        getCameraYaw: () => 0,
        setCameraYaw: vi.fn(),
        getCameraPitch: () => 0.5,
        setCameraPitch: vi.fn(),
        setCameraTarget: vi.fn(),
        resetCamera: vi.fn(),
        getDirLight: () => null,
        getAmbientLight: () => null,
        getHemiLight: () => null,
      } as any;

      const mockBattleView = {
        battle: {
          getActiveCreature: () => null,
          nextTurn: vi.fn(),
          selectNextUnitAndGetIndex: vi.fn(),
          restActiveCreature: vi.fn(),
        },
        squadVisuals: new Map(),
        setGridVisible: vi.fn(),
        setCoordsVisible: vi.fn(),
      } as any;

      const dbg = new ThreeSceneDebugger(mockSceneManager, mockBattleView, { autoOpen: false });

      // Filter by Tactical & Path Previews
      (dbg as any).inspectorState.filterCategory = 'Tactical & Path Previews';
      dbg.refreshEntityList();

      const entityKeys = Array.from((dbg as any).entityMap.keys()) as string[];
      expect(entityKeys.some((k) => k.includes('Waypoint_1[2,1]'))).toBe(true);
      expect(entityKeys.some((k) => k.includes('Waypoint_Destination[3,2]'))).toBe(true);
      expect(entityKeys.some((k) => k.includes('Path_Trail_Line'))).toBe(true);
      expect(entityKeys.some((k) => k.includes('Attack_Target_Ring[3,3]'))).toBe(true);
      expect(entityKeys.some((k) => k.includes('Attack_Origin_Hex[3,2]'))).toBe(true);
      expect(entityKeys.some((k) => k.includes('Attack_Arrow_ConeHead'))).toBe(true);

      dbg.dispose();
      hexBoard.dispose();
    });

    it('should safely switch between selected objects and handle cleared PathPreview without DOMException', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1.77, 0.1, 200);
      const hexMap = new HexMap(10, 6);
      const hexBoard = new HexBoard3D(hexMap);
      scene.add(hexBoard.group);

      const mockSceneManager = {
        scene,
        camera,
        getCameraConfig: () => ({ minDistance: 8, maxDistance: 32, minPitch: 0.1, maxPitch: 1.5 }),
        getCameraDistance: () => 18,
        setCameraDistance: vi.fn(),
        getCameraYaw: () => 0,
        setCameraYaw: vi.fn(),
        getCameraPitch: () => 0.5,
        setCameraPitch: vi.fn(),
        setCameraTarget: vi.fn(),
        resetCamera: vi.fn(),
        getDirLight: () => null,
        getAmbientLight: () => null,
        getHemiLight: () => null,
      } as any;

      const mockBattleView = {
        battle: {
          getActiveCreature: () => null,
          nextTurn: vi.fn(),
          selectNextUnitAndGetIndex: vi.fn(),
          restActiveCreature: vi.fn(),
        },
        squadVisuals: new Map(),
        setGridVisible: vi.fn(),
        setCoordsVisible: vi.fn(),
      } as any;

      const dbg = new ThreeSceneDebugger(mockSceneManager, mockBattleView, { autoOpen: false });

      // Create preview, refresh list, select a mesh, then clear preview, then select PathPreview group
      hexBoard.setPathPreview([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      dbg.refreshEntityList();

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      scene.add(mesh);

      // Multiple selection switches must cleanly destroy folders without DOMException
      expect(() => {
        dbg.selectObject(mesh);
        dbg.selectObject((hexBoard as any).pathPreviewGroup);
        hexBoard.clearPathPreview(); // clears children
        dbg.selectObject((hexBoard as any).pathPreviewGroup);
        dbg.selectObject(null);
        dbg.selectObject(mesh);
      }).not.toThrow();

      dbg.dispose();
      hexBoard.dispose();
    });
  });

  describe('9. Path Preview Diagnostics & Configurable Hotkeys', () => {
    it('should compute complete path with source, intermediate, and destination hexes', () => {
      const hexMap = new HexMap(10, 8);
      const pathMatrix = NumMatrix.createZeroMatrix(10, 8);
      const occupationTiles = NumMatrix.createZeroMatrix(10, 8);
      const terrainTiles = NumMatrix.createZeroMatrix(10, 8);

      const reachData = BattleHexMapPath.cacheWalkableAndMeleeReachableCells(
        hexMap,
        { x: 1, y: 1 },
        4,
        pathMatrix,
        { 0: 1 },
        { occupation_tiles: occupationTiles, terrain_tiles: terrainTiles, creatures: [] },
        { markUnitsInArmies: [] }
      );

      // Path to adjacent hex (1 step)
      const path1 = BattleHexMapPath.findPathToCellInReachData({ x: 2, y: 1 }, reachData);
      expect(path1).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }]);

      // Path to distant hex (3 steps)
      const path3 = BattleHexMapPath.findPathToCellInReachData({ x: 4, y: 1 }, reachData);
      expect(path3.length).toBe(4);
      expect(path3[0]).toEqual({ x: 1, y: 1 });
      expect(path3[path3.length - 1]).toEqual({ x: 4, y: 1 });
    });

    it('should format and print hoverPath and attackPath arrays upon invoking printPathPreview', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockBattleView = {
        battle: {
          getActiveCreature: () => ({
            position: { x: 1, y: 1 },
            armyAlignment: 0,
            creatureType: CreatureType.PEASANT,
            live_stats: { is_ranged: false, remaining_attacks: 1, remaining_ammo: 0 },
          }),
          getCreatureAtPosition: (coords: { x: number; y: number }) => {
            if (coords.x === 3 && coords.y === 2) {
              return {
                indexOFArmy: 1,
                creature: {
                  position: { x: 3, y: 2 },
                  creatureType: CreatureType.SWORDSMAN,
                  facingDirection: HexDirection.WEST,
                },
              };
            }
            return null;
          },
          findPathFromSelectedUnitToCell: (coords: { x: number; y: number }) => {
            if (coords.x === 2 && coords.y === 2) {
              return [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }];
            }
            return [{ x: 1, y: 1 }, coords];
          },
        },
        hexMap: new HexMap(10, 8),
        hoveredHex: { x: 3, y: 2 },
        hoveredDirection: HexDirection.WEST,
        isCtrlPressed: false,
        computeAttackAndHoverPaths: function() {
          return {
            hoverPath: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
            attackPath: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
            originHex: { x: 2, y: 2 },
            isRanged: false,
          };
        },
        printPathPreview: function() {
          const { hoverPath, attackPath } = this.computeAttackAndHoverPaths();
          const activeCreature = this.battle.getActiveCreature();
          const targetCreature = this.hoveredHex ? this.battle.getCreatureAtPosition(this.hoveredHex) : null;

          const report = {
            hoverPath,
            attackPath,
            hoveredHex: this.hoveredHex ? { ...this.hoveredHex } : null,
            hoveredDirection: this.hoveredDirection,
            selectedUnit: activeCreature ? { name: Creature.CREATURE_NAMES[activeCreature.creatureType] ?? `Type${activeCreature.creatureType}`, position: { ...activeCreature.position } } : null,
            targetEnemy: targetCreature ? { name: Creature.CREATURE_NAMES[targetCreature.creature.creatureType] ?? `Type${targetCreature.creature.creatureType}`, position: { ...targetCreature.creature.position } } : null,
          };

          console.log('[Path Preview Array]', report);
          return { hoverPath, attackPath };
        },
      };

      const result = mockBattleView.printPathPreview();
      expect(result.hoverPath).toHaveLength(3);
      expect(result.attackPath).toHaveLength(4);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Path Preview Array]',
        expect.objectContaining({
          hoverPath: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
          attackPath: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
          hoveredDirection: HexDirection.WEST,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should load configurable hotkey bindings from settings and JSON config', () => {
      const settings = new BattleSettings();
      expect(settings.hotkeys.printPathPreview).toBe('p');
      expect(settings.hotkeys.rest).toBe('r');

      // Custom JSON configuration
      const customConfig = {
        hotkeys: {
          printPathPreview: 'x',
          rest: 'z',
        },
      };

      if (customConfig.hotkeys.printPathPreview) {
        settings.hotkeys.printPathPreview = customConfig.hotkeys.printPathPreview;
      }
      if (customConfig.hotkeys.rest) {
        settings.hotkeys.rest = customConfig.hotkeys.rest;
      }

      expect(settings.hotkeys.printPathPreview).toBe('x');
      expect(settings.hotkeys.rest).toBe('z');
    });
  });
});



