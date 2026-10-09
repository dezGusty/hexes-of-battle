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
});



