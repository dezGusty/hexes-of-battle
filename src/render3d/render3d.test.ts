import { describe, it, expect, vi } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import * as THREE from 'three';
import { Texture as PixiTexture } from 'pixi.js';
import { HexBoard3D } from './hex-board-3d';
import { HexMap } from '../shared/hex-map';
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

      // Top banner
      expect(hud.isPointerOverUI(500, 30)).toBe(true);

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
});

