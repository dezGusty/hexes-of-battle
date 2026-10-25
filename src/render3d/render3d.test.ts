import { describe, it, expect, vi } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import * as THREE from 'three';
import { Container as PixiContainer, Sprite as PixiSprite, Texture as PixiTexture, Assets as PixiAssets } from 'pixi.js';
import { HexBoard3D } from './hex-board-3d';
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus } from '../shared/hex-map';
import { Creature, CreatureType } from '../battle/creature';
import { MoraleState } from '../battle/combat-rules';
import { UnitVisualFactory } from './units/unit-visual-factory';
import { MeshRigidVisual } from './units/mesh-rigid-visual';
import { drawMoraleVector } from './units/squad-visual-3d';
import { ProjectileSystem3D } from './projectiles/projectile-system-3d';
import { BattleHud2D } from './battle-hud-2d';
import { Battle, InputState } from '../battle';
import { BattleSettings } from '../battle/settings';
import { UnitStatsPanel } from '../ui/unit-stats-panel';
import { EnemyStatsPanel } from '../ui/enemy-stats-panel';
import { BattleView3D } from './battle-view-3d';
import { ThreeSceneManager } from './three-scene-manager';
import { ThreeSceneDebugger } from './debug/three-scene-debugger';
import { BattleHexMapPath } from '../battle/battle-hex-map-path';
import { NumMatrix } from '../shared/num-matrix';
import { CommonControls } from '../ui/common-controls';
import * as fs from 'fs';
import * as path from 'path';
import { TerrainType } from '../battle/terrain-types';
import { UnitVisualFormat } from './types';
import {
  AVERAGE_UNIT_3D_HEIGHT,
  BARBARIAN_TEXTURE_PATHS,
  BARBARIAN_TEXTURE_SIZE,
  FOREST_TREE_TARGET_HEIGHT,
  HUMANOID_TEXTURE_PATHS,
  HUMANOID_TEXTURE_SIZE,
  TREE_TEXTURE_PATHS,
  TREE_TEXTURE_SIZE,
  IGNORED_3D_UNIT_KEYS,
  SUPPORTED_3D_UNIT_KEYS,
  UNIT_SIZE_SCALE,
  getBarbarianPartMaterial,
  getBarbarianPartTexture,
  getHumanoidPartMaterial,
  getHumanoidPartTexture,
  getTreePartTexture,
  buildLowPolyForestTreeMesh,
  getSharedTreeMaterials,
  isUnit3DModelSupported,
  smoothGeometryNormals,
} from './units/unit-mesh-builder';
import { generateSelectedHaloPixels, SELECTED_HALO_TEXTURE_SIZE } from './units/selected-halo-texture';
import pkg from '../../package.json';

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
          if (x === 0 && y === 0) return TerrainType.HILL;
          if (x === 1 && y === 0) return TerrainType.WATER;
          if (x === 2 && y === 0) return TerrainType.FOREST;
          return TerrainType.PLAIN;
        },
      });

      expect(hexBoard.group.children.length).toBeGreaterThan(0);
      hexBoard.dispose();
    });

    it('should generate mesa hill geometry with flat plateau top and smoothed normals', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          if (x === 2 && y === 2) return TerrainType.HILL;
          return TerrainType.PLAIN;
        },
      });

      expect(hexBoard.isHill(2, 2)).toBe(true);
      expect(hexBoard.isHill(0, 0)).toBe(false);

      const elev = hexBoard.getHexElevation(2, 2);
      expect(elev).toBeGreaterThanOrEqual(0.28);
      expect(elev).toBeLessThanOrEqual(0.36);

      const mesaRadius = hexBoard.getHillMesaRadius(2, 2);
      expect(mesaRadius).toBeLessThan(hexBoard.hexRadius);
      expect(mesaRadius).toBeGreaterThan(hexBoard.hexRadius * 0.70);

      const tileMesh = (hexBoard as any).tileMeshes.get('2,2') as THREE.Mesh;
      expect(tileMesh).toBeDefined();
      expect(tileMesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(tileMesh.geometry.attributes.position).toBeDefined();
      expect(tileMesh.geometry.attributes.normal).toBeDefined();

      hexBoard.dispose();
    });

    it('should ensure adjacent hills share identical elevation with seamless ridge connection', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          // Connected hill cluster 1: (1, 1) and (2, 1)
          if ((x === 1 && y === 1) || (x === 2 && y === 1)) return TerrainType.HILL;
          // Disconnected hill cluster 2: (4, 4)
          if (x === 4 && y === 4) return TerrainType.HILL;
          return TerrainType.PLAIN;
        },
      });

      const elev1 = hexBoard.getHexElevation(1, 1);
      const elev2 = hexBoard.getHexElevation(2, 1);
      const elevIsolated = hexBoard.getHexElevation(4, 4);

      // Connected hills must have identical elevation
      expect(elev1).toBe(elev2);
      expect(elev1).toBeGreaterThanOrEqual(0.28);

      // Isolated hill should be defined and elevated
      expect(elevIsolated).toBeGreaterThanOrEqual(0.28);

      hexBoard.dispose();
    });

    it('should scale selection and hover overlays to fit mesa top on hill hexes', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => (x === 2 && y === 2 ? TerrainType.HILL : TerrainType.PLAIN),
      });

      // Hover on hill
      hexBoard.setHoverHex({ x: 2, y: 2 });
      const hoverMesh = (hexBoard as any).hoverMesh as THREE.Mesh;
      expect(hoverMesh.position.y).toBeCloseTo(hexBoard.getHexElevation(2, 2) + 0.03, 3);
      expect(hoverMesh.scale.x).toBeLessThan(1.0);

      // Select hill
      hexBoard.setSelectedUnitHex({ x: 2, y: 2 }, HexDirection.EAST);
      const selectedMesh = (hexBoard as any).selectedRingMesh as THREE.Mesh;
      expect(selectedMesh.position.y).toBeCloseTo(hexBoard.getHexElevation(2, 2) + 0.02, 3);
      expect(selectedMesh.scale.x).toBeLessThan(1.0);

      hexBoard.dispose();
    });

    it('should initialize selectedHaloMesh with stylized golden disc texture and rotate 360 degrees in 30 seconds', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap);

      expect(hexBoard.selectedHaloMesh).toBeDefined();
      expect(hexBoard.selectedHaloMesh.name).toBe('TileSelectedHalo');
      expect(hexBoard.selectedHaloMesh.visible).toBe(false);

      const mat = hexBoard.selectedHaloMesh.material as THREE.MeshBasicMaterial;
      expect(mat.transparent).toBe(true);
      expect(mat.map).toBeDefined();

      // Select unit at (4, 4) - halo is raised above reach overlay hex highlights (elev + 0.05) with renderOrder 5
      hexBoard.setSelectedUnitHex({ x: 4, y: 4 }, HexDirection.EAST);
      expect(hexBoard.selectedHaloMesh.visible).toBe(true);
      expect(hexBoard.selectedHaloMesh.position.y).toBeCloseTo(hexBoard.getHexElevation(4, 4) + 0.05, 3);
      expect(hexBoard.selectedHaloMesh.renderOrder).toBe(5);

      // Verify rotation over time:
      // In 15,000 ms (15 seconds), it should rotate exactly 180 degrees (Math.PI radians)
      const initialRotation = hexBoard.selectedHaloMesh.rotation.y;
      hexBoard.update(15000);
      expect(hexBoard.selectedHaloMesh.rotation.y).toBeCloseTo(initialRotation + Math.PI, 2);

      // In another 15,000 ms (30 seconds total), it should complete a full 360-degree rotation (2*Math.PI radians)
      hexBoard.update(15000);
      expect(hexBoard.selectedHaloMesh.rotation.y).toBeCloseTo((initialRotation + Math.PI * 2) % (Math.PI * 2), 2);

      // Verify halo elevation is above reachable hex highlights
      hexBoard.setSelectedUnitHex({ x: 2, y: 2 }, HexDirection.EAST);
      hexBoard.updateReachOverlays([{ x: 2, y: 2 }], [{ x: 3, y: 2 }]);
      const walkableOverlay = hexBoard.getOverlayMesh('2,2')!;
      const attackableOverlay = hexBoard.getOverlayMesh('atk_3,2')!;

      expect(walkableOverlay).toBeDefined();
      expect(attackableOverlay).toBeDefined();

      const elev22 = hexBoard.getHexElevation(2, 2);
      // Reachable hex highlights have cylinder height 0.04 (top surface at elev + pos.y + 0.02)
      const walkableTop = walkableOverlay.position.y + 0.02; // elev + 0.015 + 0.02 = elev + 0.035
      expect(hexBoard.selectedHaloMesh.position.y).toBeGreaterThan(walkableTop);
      expect(hexBoard.selectedHaloMesh.position.y).toBeCloseTo(elev22 + 0.05, 3);
      expect(hexBoard.selectedHaloMesh.renderOrder).toBeGreaterThan(walkableOverlay.renderOrder);

      // Deselecting unit hides halo
      hexBoard.setSelectedUnitHex(null);
      expect(hexBoard.selectedHaloMesh.visible).toBe(false);

      hexBoard.dispose();
    });

    it('should generate golden halo disc texture with empty center, transparent background, and swords/shields motifs', () => {
      const pixels = generateSelectedHaloPixels(SELECTED_HALO_TEXTURE_SIZE);
      const size = SELECTED_HALO_TEXTURE_SIZE;

      // Center (r = 0 at x=256, y=256) must be completely transparent (alpha = 0)
      const centerIdx = (256 * size + 256) * 4;
      expect(pixels[centerIdx + 3]).toBe(0);

      // Inner empty region (r = 50px from center at x=256, y=206) must be completely transparent
      const innerIdx = (206 * size + 256) * 4;
      expect(pixels[innerIdx + 3]).toBe(0);

      // Outer background (corner at x=10, y=10) must be completely transparent
      const cornerIdx = (10 * size + 10) * 4;
      expect(pixels[cornerIdx + 3]).toBe(0);

      // Outer edge (x=256, y=5) must be completely transparent
      const outerIdx = (5 * size + 256) * 4;
      expect(pixels[outerIdx + 3]).toBe(0);

      // Golden ring track at 20° where disc body runs (neither shield nor sword):
      const goldX = 256 + Math.round(168 * Math.cos((20 * Math.PI) / 180));
      const goldY = 256 + Math.round(168 * Math.sin((20 * Math.PI) / 180));
      const goldIdx = (goldY * size + goldX) * 4;
      expect(pixels[goldIdx + 3]).toBe(255);
      expect(pixels[goldIdx]).toBeGreaterThan(pixels[goldIdx + 2]); // R > B (warm gold)
      expect(pixels[goldIdx + 1]).toBeGreaterThan(pixels[goldIdx + 2]); // G > B

      // Cardinal angle motif (Shield at 0° / East: x=256+168=424, y=256) has heraldic content (Royal Crimson)
      const shieldIdx = (256 * size + 424) * 4;
      expect(pixels[shieldIdx + 3]).toBe(255);
      expect(pixels[shieldIdx]).toBeGreaterThan(pixels[shieldIdx + 1]); // R > G (royal crimson)

      // Diagonal angle motif (Crossed swords at 45°: x=256 + round(168*cos(45))=375, y=256 + round(168*sin(45))=375)
      const diagIdx = (375 * size + 375) * 4;
      expect(pixels[diagIdx + 3]).toBe(255);
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

    it('should draw 48x48 morale icons in vector format across all 5 morale states', () => {
      const mockContext = () => {
        const calls: string[] = [];
        return {
          calls,
          save: () => calls.push('save'),
          restore: () => calls.push('restore'),
          translate: (x: number, y: number) => calls.push(`translate:${x},${y}`),
          scale: (sx: number, sy: number) => calls.push(`scale:${sx},${sy}`),
          beginPath: () => calls.push('beginPath'),
          closePath: () => calls.push('closePath'),
          moveTo: (x: number, y: number) => calls.push(`moveTo:${x},${y}`),
          lineTo: (x: number, y: number) => calls.push(`lineTo:${x},${y}`),
          arc: () => calls.push('arc'),
          fill: () => calls.push('fill'),
          stroke: () => calls.push('stroke'),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          lineCap: '',
          lineJoin: '',
        } as unknown as CanvasRenderingContext2D & { calls: string[] };
      };

      // 1. High morale (green eagle with star)
      const ctxHigh = mockContext();
      drawMoraleVector(ctxHigh, MoraleState.HIGH, 0, 0, 24);
      expect(ctxHigh.fillStyle).toBe('#2ecc71');
      expect(ctxHigh.calls.filter((c) => c === 'fill').length).toBeGreaterThan(4);

      // 2. Steady morale (green eagle)
      const ctxSteady = mockContext();
      drawMoraleVector(ctxSteady, MoraleState.STEADY, 0, 0, 24);
      expect(ctxSteady.fillStyle).toBe('#2ecc71');

      // 3. Wavering morale (yellow eagle)
      const ctxWavering = mockContext();
      drawMoraleVector(ctxWavering, MoraleState.WAVERING, 0, 0, 24);
      expect(ctxWavering.fillStyle).toBe('#f1c40f');

      // 4. Panicked morale (red eagle)
      const ctxPanicked = mockContext();
      drawMoraleVector(ctxPanicked, MoraleState.PANICKED, 0, 0, 24);
      expect(ctxPanicked.fillStyle).toBe('#ea3838');

      // 5. Routing morale (black running figure)
      const ctxRouting = mockContext();
      drawMoraleVector(ctxRouting, MoraleState.ROUTING, 0, 0, 24);
      expect(ctxRouting.fillStyle).toBe('#111111');
      expect(ctxRouting.strokeStyle).toBe('#111111');
      expect(ctxRouting.calls.filter((c) => c === 'stroke').length).toBeGreaterThan(3);
    });

    it('should update squad morale state transitions in SquadVisual3D', () => {
      const factory = new UnitVisualFactory();
      const squadCreature = new Creature(CreatureType.SWORDSMAN);
      squadCreature.stats.morale = 20; // High morale (>15)
      expect(squadCreature.moraleState).toBe(MoraleState.HIGH);

      const squad = factory.createSquadVisual(squadCreature);
      expect(squadCreature.moraleState).toBe(MoraleState.HIGH);

      // Drop to Steady (6-15)
      squadCreature.stats.morale = 12;
      expect(squadCreature.moraleState).toBe(MoraleState.STEADY);
      squad.updateStats();

      // Drop to Wavering (3-5)
      squadCreature.stats.morale = 4;
      expect(squadCreature.moraleState).toBe(MoraleState.WAVERING);
      squad.updateStats();

      // Drop to Panicked (1-2)
      squadCreature.stats.morale = 2;
      expect(squadCreature.moraleState).toBe(MoraleState.PANICKED);
      squad.updateStats();

      // Drop to Routing (0)
      squadCreature.stats.morale = 0;
      expect(squadCreature.moraleState).toBe(MoraleState.ROUTING);
      squad.updateStats();
    });

    it('should draw morale icon with size 28 next to unit count in SquadVisual3D', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 30 }),
        fillText: vi.fn(),
        font: '',
        textAlign: '',
        textBaseline: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
        lineJoin: '',
        shadowColor: '',
        shadowBlur: 0,
      };
      const mockCanvas = {
        width: 128,
        height: 64,
        getContext: vi.fn().mockReturnValue(mockCtx),
      };

      const originalDocument = (globalThis as any).document;
      const originalImage = (globalThis as any).Image;
      class MockImage {
        src = '';
        complete = false;
        naturalWidth = 0;
      }
      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockCanvas),
      };
      (globalThis as any).Image = MockImage;

      try {
        const factory = new UnitVisualFactory();
        const squadCreature = new Creature(CreatureType.SWORDSMAN);
        const squad = factory.createSquadVisual(squadCreature);

        const drawMoraleIconSpy = vi.spyOn(squad as any, 'drawMoraleIcon');
        (squad as any).updateCountText();

        expect(drawMoraleIconSpy).toHaveBeenCalledWith(
          mockCtx,
          squadCreature.moraleState,
          expect.any(Number),
          expect.any(Number),
          28
        );
      } finally {
        (globalThis as any).document = originalDocument;
        (globalThis as any).Image = originalImage;
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

    it('should stagger formation model offsets front-to-back to prevent billboard z-fighting/clipping', () => {
      const factory = new UnitVisualFactory();
      const squadCreature = new Creature(CreatureType.PEASANT);
      squadCreature.stats.model_count = 8;
      const squad = factory.createSquadVisual(squadCreature);

      const offsets = squad.getModelOffsets();
      expect(offsets.length).toBe(8);

      // Models sitting next to each other in row 0 must not have identical Z
      expect(offsets[0].z).not.toBe(offsets[1].z);
      expect(offsets[1].z).not.toBe(offsets[2].z);
      expect(offsets[2].z).not.toBe(offsets[3].z);

      // Depth separation between adjacent models prevents z-fighting
      expect(Math.abs(offsets[0].z - offsets[1].z)).toBeGreaterThanOrEqual(0.05);
      expect(Math.abs(offsets[1].z - offsets[2].z)).toBeGreaterThanOrEqual(0.05);
    });

    it('should provide front-to-back offset between units sitting on adjacent hexes', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap);

      // Adjacent hexes on same horizontal line: (2, 3) and (3, 3)
      const offset1 = hexBoard.getUnitFrontBackOffset(2, 3);
      const offset2 = hexBoard.getUnitFrontBackOffset(3, 3);

      expect(offset1).not.toBe(offset2);
      expect(Math.abs(offset1 - offset2)).toBeGreaterThanOrEqual(0.05);

      const world1 = hexBoard.hexToWorldWithElevation(2, 3, true);
      const world2 = hexBoard.hexToWorldWithElevation(3, 3, true);
      expect(world1.z).not.toBe(world2.z);
      expect(Math.abs(world1.z - world2.z)).toBeGreaterThan(0.05);

      hexBoard.dispose();
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

      projectileSys.update(500);
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
      expect(hud.versionText).toBeDefined();
      expect(hud.versionText?.text).toBe(`Hexes Of Battle v.${pkg.version}`);
      expect(hud.versionText?.visible).toBe(true);
      expect(hud.isFpsVisible()).toBe(true);

      // Update with 60 FPS
      hud.update(16.6, 59.8);
      expect(hud.fpsText?.text).toBe('FPS: 60');
      expect(hud.versionText?.visible).toBe(true);

      // Toggle FPS visibility
      hud.setFpsVisible(false);
      expect(hud.isFpsVisible()).toBe(false);
      expect(hud.fpsText?.visible).toBe(false);
      expect(hud.versionText?.visible).toBe(false);

      hud.setFpsVisible(true);
      expect(hud.isFpsVisible()).toBe(true);
      expect(hud.fpsText?.visible).toBe(true);
      expect(hud.versionText?.visible).toBe(true);

      hud.destroy();
    });

    it('should toggle FPS indicator via battleMenuPanel.toggleFpsButton in BattleHud2D', () => {
      const prevDoc = (globalThis as any).document;
      const prevContext = (globalThis as any).CanvasRenderingContext2D;

      if (typeof (globalThis as any).CanvasRenderingContext2D === 'undefined') {
        (globalThis as any).CanvasRenderingContext2D = class {};
      }

      if (typeof document === 'undefined') {
        const mockCanvas = {
          getContext: () => ({
            measureText: () => ({ width: 40, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }),
            fillText: () => {},
            strokeText: () => {},
            clearRect: () => {},
          }),
        };
        (globalThis as any).document = {
          createElement: (tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {
              style: {},
              classList: { add: () => {}, remove: () => {}, contains: () => false },
              appendChild: (c: any) => c,
              removeChild: (c: any) => c,
            };
          },
        };
      }

      const textureNames = [
        'thin_button_normal.png',
        'thin_button_hover.png',
        'thin_button_2_normal.png',
        'thin_button_2_hover.png',
        'btn_simple.png',
        'btn_simple_hover.png',
        'btn_simple_click.png',
        'glyph_fullscreen.png',
        'glyph_xy.png',
        'glyph_grid.png',
        'glyph_toggle_healthbars.png',
        'glyph_toggle_music.png',
        'glyph_toggle_perf_stats.png',
        'glyph_toggle_stats.png',
        'glyph_plus.png',
        'glyph_minus.png',
        'glyph_next_turn.png',
        'glyph_next_unit.png',
        'glyph_reset.png',
        'glyph_ability1.png',
        'glyph_stamina',
        'cursor_arrow.png',
        'panel.png',
      ];
      textureNames.forEach((name) => {
        try {
          PixiAssets.cache.set(name, PixiTexture.EMPTY);
        } catch {
          // ignore
        }
      });

      try {
        const battle = new Battle(new HexMap(13, 9));
        const settings = new BattleSettings();
        settings.debug.showFps = true;

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
        let eventToggledValue: boolean | undefined;
        let hardwareCursorToggledValue: boolean | undefined;
        hud.initialize({
          onZoomIn: () => {},
          onZoomOut: () => {},
          onZoomSliderUpdate: () => {},
          onNextTurn: () => {},
          onNextUnit: () => {},
          onReset: () => {},
          onRest: () => {},
          onToggleFps: (val) => {
            eventToggledValue = val;
          },
          onToggleHardwareCursor: (val) => {
            hardwareCursorToggledValue = val;
          },
        });

        expect(hud.isFpsVisible()).toBe(true);
        expect(hud.battleMenuPanel?.toggleFpsButton).toBeDefined();

        hud.battleMenuPanel!.toggleFpsButton!.onPress.emit();
        expect(hud.isFpsVisible()).toBe(false);
        expect(settings.debug.showFps).toBe(false);
        expect(eventToggledValue).toBe(false);

        hud.battleMenuPanel!.toggleFpsButton!.onPress.emit();
        expect(hud.isFpsVisible()).toBe(true);
        expect(settings.debug.showFps).toBe(true);
        expect(eventToggledValue).toBe(true);

        // Hardware cursor toggle button
        expect(hud.battleMenuPanel?.toggleHardwareCursorButton).toBeDefined();
        expect(settings.hideHardwareCursor).toBe(false);
        hud.battleMenuPanel!.toggleHardwareCursorButton!.onPress.emit();
        expect(settings.hideHardwareCursor).toBe(true);
        expect(hardwareCursorToggledValue).toBe(true);

        hud.battleMenuPanel!.toggleHardwareCursorButton!.onPress.emit();
        expect(settings.hideHardwareCursor).toBe(false);
        expect(hardwareCursorToggledValue).toBe(false);

        hud.destroy();
      } finally {
        (globalThis as any).document = prevDoc;
        (globalThis as any).CanvasRenderingContext2D = prevContext;
      }
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

    it('should toggle unit stats via BattleHud2D.toggleUnitStats', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      settings.hex.showStats = false;

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

      hud.commonControls = new CommonControls();
      expect((hud.commonControls as any).toggleStatsButton).toBeUndefined();
      expect(hud.unitStats.isVisible()).toBe(false);
      hud.toggleUnitStats();
      expect(hud.unitStats.isVisible()).toBe(true);
      expect(settings.hex.showStats).toBe(true);

      hud.toggleUnitStats();
      expect(hud.unitStats.isVisible()).toBe(false);
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

    it('should update HUD cursor texture and anchor on setCursor calls', () => {
      const battle = new Battle(new HexMap(13, 9));
      const settings = new BattleSettings();
      const defaultTex = { ...PixiTexture.WHITE, defaultAnchor: { x: 0, y: 0 } };
      const swordTex = { ...PixiTexture.WHITE, defaultAnchor: { x: 0, y: 0 } };
      const arrowTex = { ...PixiTexture.WHITE, defaultAnchor: { x: 0.5, y: 0.5 } };
      const assets = {
        softCursorTextures: {
          default: defaultTex,
          attack_melee: swordTex,
          attack_ranged: arrowTex,
        },
      };

      const hud = new BattleHud2D(assets as any, settings, battle);
      hud.softCursorSprite = new PixiSprite(defaultTex as any);

      hud.setCursor('attack_melee');
      expect(hud.softCursorSprite?.texture).toBe(swordTex);
      expect(hud.softCursorSprite?.anchor.x).toBe(0);
      expect(hud.softCursorSprite?.anchor.y).toBe(0);

      hud.setCursor('attack_ranged');
      expect(hud.softCursorSprite?.texture).toBe(arrowTex);
      expect(hud.softCursorSprite?.anchor.x).toBe(0.5);
      expect(hud.softCursorSprite?.anchor.y).toBe(0.5);

      hud.setCursor('default');
      expect(hud.softCursorSprite?.texture).toBe(defaultTex);
      expect(hud.softCursorSprite?.anchor.x).toBe(0);
      expect(hud.softCursorSprite?.anchor.y).toBe(0);

      hud.destroy();
    });

    it('should change cursor to sword (attack_melee) for melee squad and arrow (attack_ranged) for ranged squad', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.position = { x: 2, y: 2 };
      swordsman.armyAlignment = 0;
      swordsman.stats.remaining_movement = 4;
      swordsman.stats.remaining_attacks = 1;

      const archer = new Creature(CreatureType.PEASANT_ARCHER);
      archer.position = { x: 2, y: 4 };
      archer.armyAlignment = 0;
      archer.stats.is_ranged = true;
      archer.stats.remaining_movement = 4;
      archer.stats.remaining_attacks = 1;
      archer.stats.remaining_ammo = 10;
      archer.stats.range = 5;

      const enemyNear = new Creature(CreatureType.SWORDSMAN);
      enemyNear.position = { x: 3, y: 2 }; // adjacent to swordsman
      enemyNear.armyAlignment = 1;

      const enemyFar = new Creature(CreatureType.SWORDSMAN);
      enemyFar.position = { x: 9, y: 7 }; // far out of reach
      enemyFar.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [swordsman, archer, enemyNear, enemyFar],
      });

      const mockHud = {
        setCursor: vi.fn(),
      };
      const mockHexBoard = {
        setHoverHex: vi.fn(),
        setAttackPreview: vi.fn(),
        clearAttackPreview: vi.fn(),
        setPathPreview: vi.fn(),
        clearPathPreview: vi.fn(),
      };

      const viewContext: any = {
        battle,
        hexMap,
        hexBoard: mockHexBoard,
        hud: mockHud,
        hoveredHex: null,
        hoveredDirection: HexDirection.NONE,
        isCtrlPressed: false,
        clearHoverState() {
          this.hoveredHex = null;
          this.hud.setCursor('default');
        },
      };
      viewContext.computeAttackAndHoverPaths = (BattleView3D.prototype as any).computeAttackAndHoverPaths.bind(viewContext);
      viewContext.updateHoverVisuals = (BattleView3D.prototype as any).updateHoverVisuals.bind(viewContext);

      // 1. Select Swordsman (melee squad)
      battle.handlePrimaryCellAction(swordsman.position);
      expect(battle.getActiveCreature()).toBe(swordsman);

      // Hover over adjacent enemy squad -> sword cursor (attack_melee)
      viewContext.hoveredHex = enemyNear.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('attack_melee');

      // Hover over distant enemy squad out of reach -> default cursor
      viewContext.hoveredHex = enemyFar.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('default');

      // Hover over empty cell -> default cursor
      viewContext.hoveredHex = { x: 5, y: 5 };
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('default');

      // Hover over ally squad -> default cursor
      viewContext.hoveredHex = archer.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('default');

      // When swordsman has 0 remaining attacks -> default cursor
      swordsman.stats.remaining_attacks = 0;
      viewContext.hoveredHex = enemyNear.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('default');
      swordsman.stats.remaining_attacks = 1;

      // 2. Select Archer (ranged squad)
      battle.handlePrimaryCellAction(archer.position);
      expect(battle.getActiveCreature()).toBe(archer);

      // Hover over enemy within range (enemyNear at (3, 2)) -> arrow cursor (attack_ranged)
      viewContext.hoveredHex = enemyNear.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('attack_ranged');

      // Hover over enemy out of range (enemyFar at (9, 7)) -> default cursor
      viewContext.hoveredHex = enemyFar.position;
      viewContext.updateHoverVisuals();
      expect(mockHud.setCursor).toHaveBeenLastCalledWith('default');
    });

    it('should only cancel ability targeting and not issue attack when right-clicking over enemy in 3D view', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      const archer = new Creature(CreatureType.ARCHER);
      archer.position = { x: 2, y: 2 };
      archer.armyAlignment = 0;

      const enemy = new Creature(CreatureType.SWORDSMAN);
      enemy.position = { x: 5, y: 2 };
      enemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        creatures: [archer, enemy],
      });

      const handleSecondarySpy = vi.spyOn(battle, 'handleSecondaryCellAction');

      const mockHud: any = {
        updateTargetAcquirementHint: vi.fn(),
        isPointerOverUI: vi.fn().mockReturnValue(false),
        setCursor: vi.fn(),
      };

      const viewContext: any = {
        battle,
        hud: mockHud,
        rightClickCanceledAbility: false,
        hoveredHex: enemy.position,
        hoveredDirection: HexDirection.NONE,
        squadVisuals: new Map(),
        getStageCoords: () => ({ x: 100, y: 100 }),
        updateActiveUnitSelection: vi.fn(),
        updateHoverVisuals: vi.fn(),
        sceneManager: { raycastFromScreen: () => [] },
      };

      (BattleView3D.prototype as any).setupPointerEvents.call(viewContext, { addEventListener: vi.fn() });

      // Select archer and enter ability targeting
      battle.handlePrimaryCellAction(archer.position);
      battle.selectActiveAbilityForCurrentUnit(0);
      expect(battle.input_state).toBe(InputState.SELECT_ABILITY_TARGET);

      // Simulate right-click pointerdown -> contextmenu -> pointerup sequence over enemy squad
      viewContext.boundPointerDown({ clientX: 200, clientY: 200, button: 2 });
      expect(viewContext.rightClickCanceledAbility).toBe(true);

      const preventDefault = vi.fn();
      viewContext.boundContextMenu({ preventDefault });
      expect(preventDefault).toHaveBeenCalled();

      viewContext.boundPointerUp({ clientX: 200, clientY: 200, button: 2 });

      // Verify handleSecondaryCellAction was NOT called by the 3D pointerup handler
      expect(handleSecondarySpy).not.toHaveBeenCalled();
      // Targeting was canceled
      expect(battle.input_state).toBe(InputState.SELECT_UNIT_OR_TARGET);
      // Enemy was not attacked
      expect(archer.stats.has_attacked).toBe(false);
      expect(archer.stats.remaining_attacks).toBe(1);
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

  describe('10. Ranged Attack & Ability Reach Perimeter Wall Rendering', () => {
    it('should initialize empty rangePerimeterGroup on HexBoard3D', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap);

      expect(hexBoard.rangePerimeterGroup).toBeDefined();
      expect(hexBoard.rangePerimeterGroup.name).toBe('RangePerimeter');
      expect(hexBoard.rangePerimeterGroup.children.length).toBe(0);

      hexBoard.dispose();
    });

    it('should generate semi-transparent perimeter wall mesh and rim lines around range matrix', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap);

      // Create a 10x8 matrix with a radius-2 range at (3, 3)
      const rangeMatrix = Array.from({ length: 10 }, () => Array(8).fill(0));
      BattleHexMapPath.cacheRangedReachableCells(
        hexMap,
        { x: 3, y: 3 },
        2,
        rangeMatrix,
        Array.from({ length: 10 }, () => Array(8).fill(0)),
        { creatures: [] },
        { markUnitsInArmies: [] }
      );

      // Update range perimeter
      hexBoard.updateRangePerimeter(rangeMatrix, 0x44aacc, 0.35);

      expect(hexBoard.rangePerimeterGroup.children.length).toBe(2);
      const wall = hexBoard.rangePerimeterGroup.children.find((c) => c.name === 'RangePerimeterWall') as THREE.Mesh;
      const lines = hexBoard.rangePerimeterGroup.children.find((c) => c.name === 'RangePerimeterLines') as THREE.LineSegments;

      expect(wall).toBeDefined();
      expect(lines).toBeDefined();

      // Geometry checks
      const wallPosAttr = wall.geometry.getAttribute('position');
      expect(wallPosAttr.count).toBeGreaterThan(0); // non-empty triangles

      const linePosAttr = lines.geometry.getAttribute('position');
      expect(linePosAttr.count).toBeGreaterThan(0); // non-empty line vertices

      // Material checks
      const wallMat = wall.material as THREE.MeshBasicMaterial;
      expect(wallMat.transparent).toBe(true);
      expect(wallMat.depthWrite).toBe(false);
      expect(wallMat.opacity).toBeCloseTo(0.22);
      expect(wallMat.color.getHex()).toBe(0x44aacc);

      const lineMat = lines.material as THREE.LineBasicMaterial;
      expect(lineMat.transparent).toBe(true);
      expect(lineMat.depthWrite).toBe(false);
      expect(lineMat.opacity).toBeCloseTo(0.85);

      // Clearing perimeter
      hexBoard.clearRangePerimeter();
      expect(hexBoard.rangePerimeterGroup.children.length).toBe(0);

      hexBoard.dispose();
    });

    it('should render distinct amber perimeter wall for ability reach (throw-javelin)', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap);

      // Ability range 2 (e.g. javelin throw)
      const abilityMatrix = Array.from({ length: 10 }, () => Array(8).fill(0));
      BattleHexMapPath.cacheRangedReachableCells(
        hexMap,
        { x: 5, y: 4 },
        2,
        abilityMatrix,
        Array.from({ length: 10 }, () => Array(8).fill(0)),
        { creatures: [] },
        { markUnitsInArmies: [] }
      );

      hexBoard.updateRangePerimeter(abilityMatrix, 0xffaa33, 0.40);

      expect(hexBoard.rangePerimeterGroup.children.length).toBe(2);
      const wall = hexBoard.rangePerimeterGroup.children.find((c) => c.name === 'RangePerimeterWall') as THREE.Mesh;
      const wallMat = wall.material as THREE.MeshBasicMaterial;
      expect(wallMat.color.getHex()).toBe(0xffaa33);
      expect(wallMat.opacity).toBeCloseTo(0.22);

      hexBoard.dispose();
    });

    it('should initialize empty enemyRangePerimeterGroup on HexBoard3D and generate red perimeter wall for enemy archers', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap);

      expect(hexBoard.enemyRangePerimeterGroup).toBeDefined();
      expect(hexBoard.enemyRangePerimeterGroup.name).toBe('EnemyRangePerimeter');
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);

      // Enemy archer at (7, 4) with range 4
      const enemyMatrix = Array.from({ length: 10 }, () => Array(8).fill(0));
      HexMap.fillRadiusInMatrix({ x: 7, y: 4 }, 4, enemyMatrix, 10, 8, 501, 500);

      // Render enemy range perimeter in red tint
      hexBoard.updateEnemyRangePerimeter(enemyMatrix, 0xff4444, 0.35);

      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(2);
      const wall = hexBoard.enemyRangePerimeterGroup.children.find((c) => c.name === 'EnemyRangePerimeterWall') as THREE.Mesh;
      const lines = hexBoard.enemyRangePerimeterGroup.children.find((c) => c.name === 'EnemyRangePerimeterLines') as THREE.LineSegments;

      expect(wall).toBeDefined();
      expect(lines).toBeDefined();

      const wallMat = wall.material as THREE.MeshBasicMaterial;
      expect(wallMat.color.getHex()).toBe(0xff4444);
      expect(wallMat.transparent).toBe(true);
      expect(wallMat.opacity).toBeCloseTo(0.22);

      const lineMat = lines.material as THREE.LineBasicMaterial;
      expect(lineMat.color.getHex()).toBe(0xff4444);
      expect(lineMat.transparent).toBe(true);
      expect(lineMat.opacity).toBeCloseTo(0.85);

      // Clear enemy perimeter
      hexBoard.clearEnemyRangePerimeter();
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);

      hexBoard.dispose();
    });

    it('should allow friendly (cyan) and enemy (red) range perimeters to co-exist simultaneously', () => {
      const hexMap = new HexMap(12, 10);
      const hexBoard = new HexBoard3D(hexMap);

      const friendlyRange = Array.from({ length: 12 }, () => Array(10).fill(0));
      HexMap.fillRadiusInMatrix({ x: 2, y: 2 }, 3, friendlyRange, 12, 10, 501, 500);

      const enemyRange = Array.from({ length: 12 }, () => Array(10).fill(0));
      HexMap.fillRadiusInMatrix({ x: 9, y: 7 }, 4, enemyRange, 12, 10, 501, 500);

      hexBoard.updateRangePerimeter(friendlyRange, 0x44aacc, 0.35);
      hexBoard.updateEnemyRangePerimeter(enemyRange, 0xff4444, 0.35);

      expect(hexBoard.rangePerimeterGroup.children.length).toBe(2);
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(2);

      const friendlyWall = hexBoard.rangePerimeterGroup.children.find((c) => c.name === 'RangePerimeterWall') as THREE.Mesh;
      const enemyWall = hexBoard.enemyRangePerimeterGroup.children.find((c) => c.name === 'EnemyRangePerimeterWall') as THREE.Mesh;

      expect((friendlyWall.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x44aacc);
      expect((enemyWall.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xff4444);

      hexBoard.dispose();
      expect(hexBoard.rangePerimeterGroup.children.length).toBe(0);
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);
    });

    it('should calculate range matrix for creatures via battle.getRangeMatrixForCreature', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.initializeToSize(10, 8);

      const archer = new Creature(CreatureType.ARCHER);
      archer.armyAlignment = 0;
      archer.position = { x: 5, y: 4 };
      archer.stats.is_ranged = true;
      archer.stats.range = 3;
      archer.stats.ammo = 10;

      const archerMatrix = battle.getRangeMatrixForCreature(archer);
      expect(archerMatrix[5][4]).toBeGreaterThan(0);
      expect(archerMatrix[5][7]).toBeGreaterThan(0); // within distance 3
      expect(archerMatrix[0][0]).toBe(0); // outside distance 3

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.armyAlignment = 0;
      swordsman.position = { x: 5, y: 4 };
      swordsman.stats.is_ranged = false;

      const swordsmanMatrix = battle.getRangeMatrixForCreature(swordsman);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 8; y++) {
          expect(swordsmanMatrix[x][y]).toBe(0);
        }
      }
    });

    it('should display red enemy range perimeter while enemy archer is selected in EnemyStatsPanel and clear when hidden or melee enemy', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      battle.initializeToSize(10, 8);

      const friendlyArcher = new Creature(CreatureType.ARCHER);
      friendlyArcher.armyAlignment = 0;
      friendlyArcher.position = { x: 1, y: 1 };
      friendlyArcher.stats.is_ranged = true;
      friendlyArcher.stats.range = 4;
      friendlyArcher.stats.ammo = 10;

      const enemyArcher = new Creature(CreatureType.ARCHER);
      enemyArcher.armyAlignment = 1;
      enemyArcher.position = { x: 7, y: 5 };
      enemyArcher.stats.is_ranged = true;
      enemyArcher.stats.range = 5;
      enemyArcher.stats.ammo = 12;

      const enemySwordsman = new Creature(CreatureType.SWORDSMAN);
      enemySwordsman.armyAlignment = 1;
      enemySwordsman.position = { x: 6, y: 4 };
      enemySwordsman.stats.is_ranged = false;

      battle.creatures = [friendlyArcher, enemyArcher, enemySwordsman];

      const hexBoard = new HexBoard3D(hexMap);
      const dummyUiSheet = { textures: { 'panel.png': PixiTexture.EMPTY, 'thin_panel_semitransparent.png': PixiTexture.EMPTY, 'progress_bg.png': PixiTexture.EMPTY } } as any;

      const hud = {
        enemyStats: new EnemyStatsPanel(new PixiContainer(), dummyUiSheet),
        onShowEnemyStats: undefined as ((creature: Creature) => void) | undefined,
        onHideEnemyStats: undefined as (() => void) | undefined,
        showEnemyStats(creature: Creature) {
          this.enemyStats.setCreature(creature);
          this.enemyStats.show();
          this.onShowEnemyStats?.(creature);
        },
        hideEnemyStats() {
          this.enemyStats.hide();
          this.onHideEnemyStats?.();
        },
        getSelectedEnemyCreature() {
          return this.enemyStats.isVisible() ? this.enemyStats.getCreature() : undefined;
        },
      };

      const view = {
        battle,
        hexMap,
        hexBoard,
        hud: null as any,
        setHud: BattleView3D.prototype.setHud,
        updateEnemyRangePerimeter: BattleView3D.prototype.updateEnemyRangePerimeter,
        clearEnemyRangePerimeter: BattleView3D.prototype.clearEnemyRangePerimeter,
      };

      view.setHud(hud, () => ({ offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }));

      // 1. Initial state: enemyRangePerimeterGroup is empty
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);

      // 2. Select enemy archer to view stats in enemy stats panel
      hud.showEnemyStats(enemyArcher);
      expect(hud.getSelectedEnemyCreature()).toBe(enemyArcher);
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(2);
      const enemyWall = hexBoard.enemyRangePerimeterGroup.children.find((c) => c.name === 'EnemyRangePerimeterWall') as THREE.Mesh;
      expect((enemyWall.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xff4444);

      // 3. Select enemy melee unit (swordsman): range perimeter should clear
      hud.showEnemyStats(enemySwordsman);
      expect(hud.getSelectedEnemyCreature()).toBe(enemySwordsman);
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);

      // 4. Reselect enemy archer: perimeter displays again
      hud.showEnemyStats(enemyArcher);
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(2);

      // 5. Hide enemy stats panel: perimeter is cleared
      hud.hideEnemyStats();
      expect(hud.getSelectedEnemyCreature()).toBeUndefined();
      expect(hexBoard.enemyRangePerimeterGroup.children.length).toBe(0);

      hexBoard.dispose();
    });
  });

  describe('11. 3D Unit Models (Blender Pipeline) & Low-Poly 3D Forest Terrain Trees', () => {
    it('should have valid binary glTF 2.0 (.glb) files exported by Blender for all 7 supported units and 2 forest tree variants', () => {
      const rootDir = path.resolve(__dirname, '../..');
      for (const unitKey of SUPPORTED_3D_UNIT_KEYS) {
        const glbPath = path.join(rootDir, 'public/models/units', `${unitKey}.glb`);
        expect(fs.existsSync(glbPath)).toBe(true);
        const buf = fs.readFileSync(glbPath);
        expect(buf.byteLength).toBeGreaterThan(1024);
        // Binary glTF magic header: 'glTF' (0x46546C67) and version 2
        expect(buf.toString('ascii', 0, 4)).toBe('glTF');
        expect(buf.readUInt32LE(4)).toBe(2);
      }

      for (const treeKey of ['forest_pine', 'forest_oak']) {
        const glbPath = path.join(rootDir, 'public/models/terrain', `${treeKey}.glb`);
        expect(fs.existsSync(glbPath)).toBe(true);
        const buf = fs.readFileSync(glbPath);
        expect(buf.byteLength).toBeGreaterThan(512);
        expect(buf.toString('ascii', 0, 4)).toBe('glTF');
        expect(buf.readUInt32LE(4)).toBe(2);
      }
    });

    it('should build FULL_3D_RIGID articulated 3D models for the supported units and keep HEAVY_KNIGHTS, HERO_COMMANDER, and BEHEMOTH excluded', () => {
      const factory = new UnitVisualFactory();

      const supportedTypes = [
        CreatureType.PEASANT,
        CreatureType.PEASANT_ARCHER,
        CreatureType.SWORDSMAN,
        CreatureType.SPEARMAN,
        CreatureType.CROSSBOWMAN,
        CreatureType.BARBARIAN,
        CreatureType.SLINGER,
        CreatureType.HEALER,
        CreatureType.MACEMAN,
      ];

      for (const cType of supportedTypes) {
        expect(isUnit3DModelSupported(cType)).toBe(true);
        const creature = new Creature(cType);
        creature.armyAlignment = 0;
        expect(factory.determineFormat(creature)).toBe(UnitVisualFormat.FULL_3D_RIGID);

        const squad = factory.createSquadVisual(creature);
        expect(squad.models.length).toBeGreaterThan(0);
        const firstModel = squad.models[0];
        expect(firstModel.format).toBe(UnitVisualFormat.FULL_3D_RIGID);

        // Verify articulated hierarchy nodes (Torso, Head, Arm_L, Arm_R, Leg_L, Leg_R, Weapon)
        const nodeNames = new Set<string>();
        firstModel.object3D.traverse((node) => {
          if (node.name) nodeNames.add(node.name);
        });
        expect(nodeNames.has('Torso')).toBe(true);
        expect(nodeNames.has('Head')).toBe(true);
        expect(nodeNames.has('Arm_L')).toBe(true);
        expect(nodeNames.has('Arm_R')).toBe(true);
        expect(nodeNames.has('Leg_L')).toBe(true);
        expect(nodeNames.has('Leg_R')).toBe(true);
        expect(nodeNames.has('Weapon')).toBe(true);

        squad.dispose();
      }

      // Ignored units must NOT be marked as supported 3D models and default to BILLBOARD_STATIC
      const ignoredTypes = [
        CreatureType.HEAVY_KNIGHTS,
        CreatureType.HERO_COMMANDER,
        CreatureType.BEHEMOTH,
      ];
      expect(IGNORED_3D_UNIT_KEYS).toEqual(['heavy_knights', 'hero_commander', 'behemoth']);

      for (const cType of ignoredTypes) {
        expect(isUnit3DModelSupported(cType)).toBe(false);
        const creature = new Creature(cType);
        expect(factory.determineFormat(creature)).toBe(UnitVisualFormat.BILLBOARD_STATIC);
        const squad = factory.createSquadVisual(creature);
        expect(squad.models[0].format).toBe(UnitVisualFormat.BILLBOARD_STATIC);
        squad.dispose();
      }
    });

    it('should animate articulated limb pivots during walk, melee attack, ranged attack, and reset on idle', () => {
      const factory = new UnitVisualFactory();
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(swordsman);
      const visual = squad.models[0];

      let legL: THREE.Object3D | null = null;
      let armR: THREE.Object3D | null = null;
      visual.object3D.traverse((child) => {
        if (child.name === 'Leg_L') legL = child;
        if (child.name === 'Arm_R') armR = child;
      });
      expect(legL).not.toBeNull();
      expect(armR).not.toBeNull();

      // Walk animation swings legs and arms
      visual.playAnimation('walk', 500);
      visual.update(150);
      expect(Math.abs(legL!.rotation.z)).toBeGreaterThan(0.05);

      // Melee attack swings right weapon arm
      visual.playAnimation('attack_melee', 500);
      visual.update(100);
      expect(Math.abs(armR!.rotation.z)).toBeGreaterThan(0.1);

      // Returning to idle resets limb rotations
      visual.playAnimation('idle');
      expect(legL!.rotation.z).toBeCloseTo(0, 4);

      squad.dispose();
    });

    it('should render low-poly 3D trees on FOREST hexes that are ~75% as tall as the average units', () => {
      const hexMap = new HexMap(6, 6);
      const getTerrain = (x: number, y: number): TerrainType => {
        if ((x === 2 && y === 2) || (x === 4 && y === 3)) {
          return TerrainType.FOREST;
        }
        return TerrainType.PLAIN;
      };

      const hexBoard = new HexBoard3D(hexMap, { getTerrain });

      // Plain hexes have no forest trees
      expect(hexBoard.getForestTreesForHex(0, 0).length).toBe(0);

      // Forest hexes have 3 to 5 low-poly 3D trees each
      const trees22 = hexBoard.getForestTreesForHex(2, 2);
      const trees43 = hexBoard.getForestTreesForHex(4, 3);
      expect(trees22.length).toBeGreaterThanOrEqual(3);
      expect(trees22.length).toBeLessThanOrEqual(5);
      expect(trees43.length).toBeGreaterThanOrEqual(3);
      expect(trees43.length).toBeLessThanOrEqual(5);
      expect(hexBoard.forestTreesGroup.children.length).toBe(trees22.length + trees43.length);

      // Verify target height ratio: FOREST_TREE_TARGET_HEIGHT (0.90) is 75% of AVERAGE_UNIT_3D_HEIGHT (1.20)
      expect(FOREST_TREE_TARGET_HEIGHT / AVERAGE_UNIT_3D_HEIGHT).toBeCloseTo(0.75, 4);

      const allTrees = [...trees22, ...trees43];
      const avgRelativeHeight =
        allTrees.reduce((sum, t) => sum + (t.userData.relativeToUnitHeight as number), 0) /
        allTrees.length;

      // Average tree height across the forest is ~75% of average unit height
      expect(avgRelativeHeight).toBeGreaterThan(0.70);
      expect(avgRelativeHeight).toBeLessThan(0.80);

      // Verify each tree contains Trunk and Foliage meshes with shadow casting enabled
      for (const tree of allTrees) {
        let hasTrunk = false;
        let hasFoliage = false;
        tree.traverse((node) => {
          if (node.name === 'Trunk') hasTrunk = true;
          if (node.name.startsWith('Foliage')) hasFoliage = true;
          if ((node as THREE.Mesh).isMesh) {
            expect(node.castShadow).toBe(true);
            expect(node.receiveShadow).toBe(true);
          }
        });
        expect(hasTrunk).toBe(true);
        expect(hasFoliage).toBe(true);
      }

      hexBoard.dispose();
      expect(hexBoard.forestTreesGroup.children.length).toBe(0);
    });

    it('should rotate 3D unit meshes so their forward (+X) axis points toward the exact neighbor hex for all 6 facing directions', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap);
      const factory = new UnitVisualFactory();
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(swordsman);
      const model = squad.models[0];

      const centerHex = { x: 2, y: 2 };
      const centerWorld = hexBoard.hexToWorld(centerHex.x, centerHex.y);

      const allDirections = [
        HexDirection.EAST,
        HexDirection.SOUTHEAST,
        HexDirection.SOUTHWEST,
        HexDirection.WEST,
        HexDirection.NORTHWEST,
        HexDirection.NORTHEAST,
      ];

      for (const dir of allDirections) {
        squad.setFacing(dir);

        const neighborHex = hexMap.getNeighbourInDirection(centerHex, dir);
        expect(neighborHex).toBeDefined();
        const neighborWorld = hexBoard.hexToWorld(neighborHex!.x, neighborHex!.y);
        const expectedDir = new THREE.Vector3(
          neighborWorld.x - centerWorld.x,
          0,
          neighborWorld.z - centerWorld.z
        ).normalize();

        // Model's local forward vector is +X (1, 0, 0)
        const modelForward = new THREE.Vector3(1, 0, 0).applyEuler(model.object3D.rotation).normalize();

        expect(modelForward.x).toBeCloseTo(expectedDir.x, 4);
        expect(modelForward.z).toBeCloseTo(expectedDir.z, 4);

        // Specifically verify North/South sign is never inverted:
        if (dir === HexDirection.SOUTHEAST || dir === HexDirection.SOUTHWEST) {
          expect(modelForward.z).toBeGreaterThan(0.8); // South is +Z
        } else if (dir === HexDirection.NORTHEAST || dir === HexDirection.NORTHWEST) {
          expect(modelForward.z).toBeLessThan(-0.8); // North is -Z
        }
      }

      squad.dispose();
      hexBoard.dispose();
    });

    it('should arrange squad models in ranks perpendicular to the facing direction and dynamically rotate ranks when facing changes', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap);
      const factory = new UnitVisualFactory();
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.stats.model_count = 8; // 2 ranks of 4 soldiers
      const squad = factory.createSquadVisual(spearman);

      const centerHex = { x: 2, y: 2 };
      const centerWorld = hexBoard.hexToWorld(centerHex.x, centerHex.y);

      const allDirections = [
        HexDirection.EAST,
        HexDirection.SOUTHEAST,
        HexDirection.SOUTHWEST,
        HexDirection.WEST,
        HexDirection.NORTHWEST,
        HexDirection.NORTHEAST,
      ];

      for (const dir of allDirections) {
        squad.setFacing(dir);

        const neighborHex = hexMap.getNeighbourInDirection(centerHex, dir)!;
        const neighborWorld = hexBoard.hexToWorld(neighborHex.x, neighborHex.y);
        // Unit forward vector pointing toward the hex the squad wants to attack
        const fwd = new THREE.Vector3(
          neighborWorld.x - centerWorld.x,
          0,
          neighborWorld.z - centerWorld.z
        ).normalize();
        // Unit lateral vector perpendicular to facing direction (along the rank line)
        const lat = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();

        const offsets = squad.getModelOffsets();
        expect(offsets.length).toBe(8);

        // Verify each model's actual object3D position matches its updated formation offset
        squad.models.forEach((m, idx) => {
          expect(m.object3D.position.x).toBeCloseTo(offsets[idx].x, 5);
          expect(m.object3D.position.z).toBeCloseTo(offsets[idx].z, 5);
        });

        // Front rank (indices 0..3) must be ahead of rear rank (indices 4..7) along the facing vector
        for (let c = 0; c < 4; c++) {
          const frontProj = offsets[c].dot(fwd);
          const rearProj = offsets[c + 4].dot(fwd);
          expect(frontProj).toBeGreaterThan(0.08);
          expect(rearProj).toBeLessThan(-0.08);
          expect(frontProj).toBeGreaterThan(rearProj);
        }

        // Soldiers in the front rank (indices 0..3) must be spread out along the perpendicular lateral axis
        const frontLatProjections = [0, 1, 2, 3].map((c) => offsets[c].dot(lat));
        const frontLatSpan = Math.max(...frontLatProjections) - Math.min(...frontLatProjections);
        const frontFwdProjections = [0, 1, 2, 3].map((c) => offsets[c].dot(fwd));
        const frontFwdSpread = Math.max(...frontFwdProjections) - Math.min(...frontFwdProjections);

        // The front rank line is wide perpendicular to facing (~0.75) and aligned in depth (< 0.1)
        expect(frontLatSpan).toBeGreaterThan(0.7);
        expect(frontFwdSpread).toBeLessThan(0.1);

        // Overall squad width along the perpendicular rank axis is wider than its depth along the facing axis
        const allFwd = offsets.map((o) => o.dot(fwd));
        const totalDepth = Math.max(...allFwd) - Math.min(...allFwd);
        expect(frontLatSpan).toBeGreaterThan(totalDepth);
      }

      squad.dispose();
      hexBoard.dispose();
    });

    it('should keep all living 3D units in the opaque render pass, share compacted limb geometries/materials across soldiers, and expose flat tileMeshes for non-recursive raycasting', () => {
      const factory = new UnitVisualFactory();
      const swordsman1 = new Creature(CreatureType.SWORDSMAN);
      swordsman1.armyAlignment = 0;
      swordsman1.stats.model_count = 8;

      const swordsman2 = new Creature(CreatureType.SWORDSMAN);
      swordsman2.armyAlignment = 0;
      swordsman2.stats.model_count = 8;

      const squad1 = factory.createSquadVisual(swordsman1);
      const squad2 = factory.createSquadVisual(swordsman2);

      // 1. All living soldiers must have transparent = false and share the opaque vertex-colored material
      const m0 = squad1.models[0] as any;
      const m1 = squad1.models[1] as any;
      const mOtherSquad = squad2.models[0] as any;

      let meshCountPerSoldier = 0;
      m0.object3D.traverse((node: THREE.Object3D) => {
        if ((node as THREE.Mesh).isMesh) {
          meshCountPerSoldier++;
          const mesh = node as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          expect(mat.transparent).toBe(false);
          expect(mat.opacity).toBe(1.0);
          expect(mat.vertexColors).toBe(true);
          expect(mat.userData?.isSharedAsset).toBe(true);
          expect(mesh.geometry.userData?.isSharedAsset).toBe(true);
          expect(mesh.geometry.getAttribute('color')).toBeDefined();
        }
      });

      // Decorative parts are merged into the 8 articulated limbs (Torso, Head, Arm_L, Arm_R, Leg_L, Leg_R, Weapon, Shield)
      expect(meshCountPerSoldier).toBeLessThanOrEqual(8);

      // Geometries and materials are shared by reference across soldiers and squads of the same faction/type
      expect(m0.mesh.geometry).toBe(m1.mesh.geometry);
      expect(m0.mesh.material).toBe(m1.mesh.material);
      expect(m0.mesh.geometry).toBe(mOtherSquad.mesh.geometry);

      // 2. When a casualty fades out (0 < opacity < 1), its material is lazily cloned so living units remain opaque
      m0.setCasualtyFade(0.5);
      expect((m0.mesh.material as THREE.Material).transparent).toBe(true);
      expect((m0.mesh.material as THREE.Material).opacity).toBeCloseTo(0.5, 4);
      expect((m1.mesh.material as THREE.Material).transparent).toBe(false);
      expect((m1.mesh.material as THREE.Material).opacity).toBe(1.0);

      // Disposing squad1 must not corrupt shared assets used by squad2
      squad1.dispose();
      expect(mOtherSquad.mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);

      // 3. HexBoard3D exposes flat tileMeshes with frozen matrices (matrixAutoUpdate = false) for fast non-recursive raycasting
      const hexMap = new HexMap(6, 5);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => (x === 2 && y === 2 ? TerrainType.FOREST : TerrainType.PLAIN),
      });
      const tileMeshes = hexBoard.getTileMeshes();
      expect(tileMeshes.length).toBe(30);
      for (const tile of tileMeshes) {
        expect(tile.userData?.isHexTile).toBe(true);
        expect(tile.matrixAutoUpdate).toBe(false);
      }

      squad2.dispose();
      hexBoard.dispose();
    });

    it('should scale all unit visuals to 75% of their previous 0.7 size (scale = 0.525) so squad models do not protrude into each other', () => {
      expect(UNIT_SIZE_SCALE).toBeCloseTo(0.525, 4);
      const factory = new UnitVisualFactory();

      // 1. Standard 3D Rigid unit (Swordsman): scale = 1.0 * 0.525 = 0.525
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const squadRigid = factory.createSquadVisual(swordsman);
      const rigidModel = squadRigid.models[0].object3D.children[0];
      expect(rigidModel.scale.x).toBeCloseTo(0.525, 4);
      expect(rigidModel.scale.y).toBeCloseTo(0.525, 4);
      expect(rigidModel.scale.z).toBeCloseTo(0.525, 4);

      // 2. Hero Commander in 3D Rigid squad: scale = 1.08 * 0.525 = 0.567
      const heroSwordsman = new Creature(CreatureType.SWORDSMAN);
      heroSwordsman.stats.is_hero = true;
      const squadHero = factory.createSquadVisual(heroSwordsman);
      const heroModel = squadHero.models[0].object3D.children[0];
      expect(heroModel.scale.x).toBeCloseTo(1.08 * 0.525, 4);

      // 3. Static 2D Billboard unit (Heavy Knights): width = 0.7 * 0.525 = 0.3675, height = 1.3 * 0.525 = 0.6825
      const knights = new Creature(CreatureType.HEAVY_KNIGHTS);
      const squadBillboard = factory.createSquadVisual(knights);
      const billboardMesh = squadBillboard.models[0].object3D.children[0] as THREE.Mesh;
      billboardMesh.geometry.computeBoundingBox();
      const bbox = billboardMesh.geometry.boundingBox!;
      expect(bbox.max.x - bbox.min.x).toBeCloseTo(0.7 * 0.525, 4);
      expect(bbox.max.y - bbox.min.y).toBeCloseTo(1.3 * 0.525, 4);

      squadRigid.dispose();
      squadHero.dispose();
      squadBillboard.dispose();
    });

    it('should smooth unit mesh normals across spherical surfaces like helmets and heads while keeping flatShading disabled', () => {
      // 1. Verify smoothGeometryNormals welds split/unindexed spherical triangles into smooth radial normals
      const unindexedSphere = new THREE.SphereGeometry(0.14, 16, 12).toNonIndexed();
      unindexedSphere.computeVertexNormals(); // flat per-triangle normals before smoothing
      smoothGeometryNormals(unindexedSphere);

      const posAttr = unindexedSphere.getAttribute('position');
      const normAttr = unindexedSphere.getAttribute('normal');
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        const plen = Math.hypot(px, py, pz);
        const nx = normAttr.getX(i);
        const ny = normAttr.getY(i);
        const nz = normAttr.getZ(i);
        // Smoothed normal on a sphere points radially outward (dot product ~ 1.0)
        const dot = (px / plen) * nx + (py / plen) * ny + (pz / plen) * nz;
        expect(dot).toBeGreaterThan(0.98);
      }
      unindexedSphere.dispose();

      // 2. Verify all 7 supported 3D units have flatShading = false and high-segment smoothed Head/Helmet meshes
      const factory = new UnitVisualFactory();
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(swordsman);
      let headMesh: THREE.Mesh | null = null;
      squad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mat = (node as THREE.Mesh).material as THREE.MeshStandardMaterial;
          expect(mat.flatShading).toBe(false);
          if (node.name === 'Head') {
            headMesh = node as THREE.Mesh;
          }
        }
      });
      expect(headMesh).not.toBeNull();
      // 20x14 sphere head + 20x14 sphere helmet has > 500 vertices for smooth curvature
      expect(headMesh!.geometry.getAttribute('position').count).toBeGreaterThan(500);

      squad.dispose();
    });

    it('should apply 256x256 detail textures to the Barbarian unit for face, weapon, clothing, and skin', () => {
      expect(BARBARIAN_TEXTURE_SIZE).toBe(256);

      const parts = ['face', 'skin', 'clothing', 'weapon'] as const;
      for (const part of parts) {
        const tex = getBarbarianPartTexture(part);
        expect(tex.image.width).toBe(256);
        expect(tex.image.height).toBe(256);
        expect(tex.image.data!.length).toBe(256 * 256 * 4);
        expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);

        // Verify texture has rich multi-tone detail (not a flat solid color)
        let minLum = 255;
        let maxLum = 0;
        const data = tex.image.data as Uint8Array;
        for (let i = 0; i < data.length; i += 16) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
        expect(maxLum - minLum).toBeGreaterThan(45);

        // Verify 256x256 PNG asset exists on disk in public/textures/units/
        const pngPath = path.resolve(__dirname, '../../public', BARBARIAN_TEXTURE_PATHS[part]);
        expect(fs.existsSync(pngPath)).toBe(true);
        const pngBuf = fs.readFileSync(pngPath);
        // PNG signature + IHDR width/height at bytes 16..23
        expect(pngBuf[0]).toBe(0x89);
        expect(pngBuf.toString('ascii', 1, 4)).toBe('PNG');
        expect(pngBuf.readUInt32BE(16)).toBe(256);
        expect(pngBuf.readUInt32BE(20)).toBe(256);
      }

      // Build Barbarian squad and verify each limb receives its 256x256 texture & valid UVs
      const factory = new UnitVisualFactory();
      const barbarian = new Creature(CreatureType.BARBARIAN);
      barbarian.armyAlignment = 0;
      const squad = factory.createSquadVisual(barbarian);

      const limbMap = new Map<string, THREE.Mesh>();
      squad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          limbMap.set(node.name, node as THREE.Mesh);
        }
      });

      expect(limbMap.size).toBeLessThanOrEqual(8);
      expect(limbMap.get('Head')?.material).toBe(getBarbarianPartMaterial('face'));
      expect(limbMap.get('Weapon')?.material).toBe(getBarbarianPartMaterial('weapon'));
      expect(limbMap.get('Clothing')?.material).toBe(getBarbarianPartMaterial('clothing'));
      expect(limbMap.get('Leg_L')?.material).toBe(getBarbarianPartMaterial('clothing'));
      expect(limbMap.get('Leg_R')?.material).toBe(getBarbarianPartMaterial('clothing'));
      expect(limbMap.get('Torso')?.material).toBe(getBarbarianPartMaterial('skin'));
      expect(limbMap.get('Arm_L')?.material).toBe(getBarbarianPartMaterial('skin'));
      expect(limbMap.get('Arm_R')?.material).toBe(getBarbarianPartMaterial('skin'));

      for (const [, mesh] of limbMap) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.map).toBeDefined();
        const img = mat.map!.image as { width: number; height: number };
        expect(img.width).toBe(256);
        expect(img.height).toBe(256);
        expect(mat.transparent).toBe(false);
        expect(mat.vertexColors).toBe(true);

        const uvAttr = mesh.geometry.getAttribute('uv');
        expect(uvAttr).toBeDefined();
        expect(uvAttr.count).toBe(mesh.geometry.getAttribute('position').count);
      }

      squad.dispose();
    });

    it('should apply 256x256 detail textures to peasant, archer, spearman, and swordsman units with full helmet armor', () => {
      expect(HUMANOID_TEXTURE_SIZE).toBe(256);

      // Verify skin texture is reused across all humanoids
      const reusedSkinTex = getHumanoidPartTexture('skin');
      const barbarianSkinTex = getBarbarianPartTexture('skin');
      expect(reusedSkinTex).toBe(barbarianSkinTex);

      const humanoidKeys = [
        'peasant_face',
        'peasant_cloth',
        'peasant_pitchfork',
        'archer_face',
        'archer_clothing',
        'archer_bow',
        'spearman_face',
        'spearman_armor',
        'spearman_gear',
        'swordsman_helmet',
        'swordsman_armor',
        'swordsman_gear',
      ];

      for (const key of humanoidKeys) {
        const tex = getHumanoidPartTexture(key);
        expect(tex.image.width).toBe(256);
        expect(tex.image.height).toBe(256);
        expect(tex.image.data!.length).toBe(256 * 256 * 4);
        expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);

        // Verify multi-tone contrast / detail
        let minLum = 255;
        let maxLum = 0;
        const data = tex.image.data as Uint8Array;
        for (let i = 0; i < data.length; i += 16) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
        expect(maxLum - minLum).toBeGreaterThan(40);

        // Verify 256x256 PNG asset exists on disk with valid IHDR
        const pngPath = path.resolve(__dirname, '../../public', HUMANOID_TEXTURE_PATHS[key]);
        expect(fs.existsSync(pngPath)).toBe(true);
        const pngBuf = fs.readFileSync(pngPath);
        expect(pngBuf[0]).toBe(0x89);
        expect(pngBuf.toString('ascii', 1, 4)).toBe('PNG');
        expect(pngBuf.readUInt32BE(16)).toBe(256);
        expect(pngBuf.readUInt32BE(20)).toBe(256);
      }

      const factory = new UnitVisualFactory();

      // 1. Peasant unit squad
      const peasant = new Creature(CreatureType.PEASANT);
      peasant.armyAlignment = 0;
      const peasantSquad = factory.createSquadVisual(peasant);
      const peasantLimbs = new Map<string, THREE.Mesh>();
      peasantSquad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) peasantLimbs.set(node.name, node as THREE.Mesh);
      });
      expect(peasantLimbs.size).toBeLessThanOrEqual(8);
      expect(peasantLimbs.get('Head')?.material).toBe(getHumanoidPartMaterial('peasant_face', 0.76, 0.05));
      expect(peasantLimbs.get('Weapon')?.material).toBe(getHumanoidPartMaterial('peasant_pitchfork', 0.58, 0.35));
      expect(peasantLimbs.get('Torso')?.material).toBe(getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02));
      expect(peasantLimbs.get('Arm_L')?.material).toBe(getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02));
      expect(peasantLimbs.get('Leg_L')?.material).toBe(getHumanoidPartMaterial('peasant_cloth', 0.86, 0.02));
      peasantSquad.dispose();

      // 2. Archer unit squad
      const archer = new Creature(CreatureType.ARCHER);
      archer.armyAlignment = 1;
      const archerSquad = factory.createSquadVisual(archer);
      const archerLimbs = new Map<string, THREE.Mesh>();
      archerSquad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) archerLimbs.set(node.name, node as THREE.Mesh);
      });
      expect(archerLimbs.size).toBeLessThanOrEqual(8);
      expect(archerLimbs.get('Head')?.material).toBe(getHumanoidPartMaterial('archer_face', 0.74, 0.05));
      expect(archerLimbs.get('Weapon')?.material).toBe(getHumanoidPartMaterial('archer_bow', 0.62, 0.15));
      expect(archerLimbs.get('Torso')?.material).toBe(getHumanoidPartMaterial('archer_clothing', 0.82, 0.04));
      expect(archerLimbs.get('Arm_R')?.material).toBe(getHumanoidPartMaterial('archer_clothing', 0.82, 0.04));
      expect(archerLimbs.get('Leg_R')?.material).toBe(getHumanoidPartMaterial('archer_clothing', 0.82, 0.04));
      archerSquad.dispose();

      // 3. Spearman unit squad
      const spearman = new Creature(CreatureType.SPEARMAN);
      spearman.armyAlignment = 0;
      const spearmanSquad = factory.createSquadVisual(spearman);
      const spearmanLimbs = new Map<string, THREE.Mesh>();
      spearmanSquad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) spearmanLimbs.set(node.name, node as THREE.Mesh);
      });
      expect(spearmanLimbs.size).toBeLessThanOrEqual(8);
      expect(spearmanLimbs.get('Head')?.material).toBe(getHumanoidPartMaterial('spearman_face', 0.68, 0.25));
      expect(spearmanLimbs.get('Weapon')?.material).toBe(getHumanoidPartMaterial('spearman_gear', 0.52, 0.45));
      expect(spearmanLimbs.get('Shield')?.material).toBe(getHumanoidPartMaterial('spearman_gear', 0.52, 0.45));
      expect(spearmanLimbs.get('Torso')?.material).toBe(getHumanoidPartMaterial('spearman_armor', 0.72, 0.20));
      expect(spearmanLimbs.get('Arm_L')?.material).toBe(getHumanoidPartMaterial('spearman_armor', 0.72, 0.20));
      expect(spearmanLimbs.get('Leg_L')?.material).toBe(getHumanoidPartMaterial('spearman_armor', 0.72, 0.20));
      spearmanSquad.dispose();

      // 4. Swordsman unit squad (Full helmet, chainmail & plate armor, gear)
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.armyAlignment = 0;
      const swordsmanSquad = factory.createSquadVisual(swordsman);
      const swordsmanLimbs = new Map<string, THREE.Mesh>();
      swordsmanSquad.models[0].object3D.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) swordsmanLimbs.set(node.name, node as THREE.Mesh);
      });
      expect(swordsmanLimbs.size).toBeLessThanOrEqual(8);
      const headLimb = swordsmanLimbs.get('Head');
      expect(headLimb).toBeDefined();
      headLimb!.geometry.computeBoundingBox();
      const headBox = headLimb!.geometry.boundingBox!;
      const headHeight = headBox.max.y - headBox.min.y;
      expect(headHeight).toBeGreaterThanOrEqual(0.30);

      const headMat = swordsmanLimbs.get('Head')?.material as THREE.MeshStandardMaterial;
      expect(headMat).toBe(getHumanoidPartMaterial('swordsman_helmet', 0.38, 0.78));
      expect(headMat.metalness).toBeGreaterThanOrEqual(0.70);

      const weaponMat = swordsmanLimbs.get('Weapon')?.material as THREE.MeshStandardMaterial;
      expect(weaponMat).toBe(getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72));
      expect(weaponMat.metalness).toBeGreaterThanOrEqual(0.70);

      expect(swordsmanLimbs.get('Shield')?.material).toBe(getHumanoidPartMaterial('swordsman_gear', 0.42, 0.72));

      const torsoMat = swordsmanLimbs.get('Torso')?.material as THREE.MeshStandardMaterial;
      expect(torsoMat).toBe(getHumanoidPartMaterial('swordsman_armor', 0.45, 0.65));
      expect(torsoMat.metalness).toBeGreaterThanOrEqual(0.60);

      expect(swordsmanLimbs.get('Arm_L')?.material).toBe(getHumanoidPartMaterial('swordsman_armor', 0.45, 0.65));
      expect(swordsmanLimbs.get('Leg_L')?.material).toBe(getHumanoidPartMaterial('swordsman_armor', 0.45, 0.65));
      swordsmanSquad.dispose();
    });

    it('should apply 256x256 detail textures to forest trees (bark and foliage) with smooth normals', () => {
      expect(TREE_TEXTURE_SIZE).toBe(256);

      const treeParts = ['bark', 'foliage'] as const;
      for (const part of treeParts) {
        const tex = getTreePartTexture(part);
        expect(tex.image.width).toBe(256);
        expect(tex.image.height).toBe(256);
        expect(tex.image.data!.length).toBe(256 * 256 * 4);
        expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);

        // Verify texture has multi-tone detail (contrast > 40)
        let minLum = 255;
        let maxLum = 0;
        const data = tex.image.data as Uint8Array;
        for (let i = 0; i < data.length; i += 16) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
        expect(maxLum - minLum).toBeGreaterThan(40);

        // Verify 256x256 PNG asset exists on disk in public/textures/terrain/
        const pngPath = path.resolve(__dirname, '../../public', TREE_TEXTURE_PATHS[part]);
        expect(fs.existsSync(pngPath)).toBe(true);
        const pngBuf = fs.readFileSync(pngPath);
        expect(pngBuf[0]).toBe(0x89);
        expect(pngBuf.toString('ascii', 1, 4)).toBe('PNG');
        expect(pngBuf.readUInt32BE(16)).toBe(256);
        expect(pngBuf.readUInt32BE(20)).toBe(256);
      }

      // Verify shared tree materials use the 256x256 textures and disable flat shading
      const { trunkMat, foliageMat } = getSharedTreeMaterials();
      expect(trunkMat.map).toBe(getTreePartTexture('bark'));
      expect(foliageMat.map).toBe(getTreePartTexture('foliage'));
      expect(trunkMat.flatShading).toBe(false);
      expect(foliageMat.flatShading).toBe(false);
      expect(foliageMat.vertexColors).toBe(true);

      // Verify Pine and Oak low-poly forest tree meshes contain valid UV coordinates and smooth normals
      for (const variant of ['pine', 'oak'] as const) {
        const tree = buildLowPolyForestTreeMesh(variant);
        let trunkMesh: THREE.Mesh | null = null;
        let foliageMesh: THREE.Mesh | null = null;

        tree.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            if (node.name === 'Trunk') trunkMesh = node as THREE.Mesh;
            if (node.name.startsWith('Foliage')) foliageMesh = node as THREE.Mesh;
          }
        });

        expect(trunkMesh).not.toBeNull();
        expect(foliageMesh).not.toBeNull();

        const trunkUv = trunkMesh!.geometry.getAttribute('uv');
        expect(trunkUv).toBeDefined();
        expect(trunkUv.count).toBe(trunkMesh!.geometry.getAttribute('position').count);

        const foliageUv = foliageMesh!.geometry.getAttribute('uv');
        expect(foliageUv).toBeDefined();
        expect(foliageUv.count).toBe(foliageMesh!.geometry.getAttribute('position').count);
      }
    });

    it('should rotate 3D battle map camera when mobile users perform a two-finger pinch-and-rotate gesture', () => {
      const hexMap = new HexMap(10, 6);
      const battle = new Battle(hexMap);
      const settings = new BattleSettings();
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const battleView = new BattleView3D(container, hexMap, battle, settings);
      const initialYaw = battleView.sceneManager.getCameraYaw();

      const createTouch = (x: number, y: number) => ({ clientX: x, clientY: y });
      const createTouchEvent = (type: string, touches: any[]) => {
        const ev = new Event(type, { cancelable: true }) as any;
        ev.touches = touches;
        ev.preventDefault = vi.fn();
        return ev;
      };

      // 1. Start two touches along horizontal line: (200, 300) and (400, 300) -> angle = 0
      const pinchHandler = (battleView as any).pinchHandler;
      expect(pinchHandler).toBeDefined();

      pinchHandler.handleTouchStart(
        createTouchEvent('touchstart', [createTouch(200, 300), createTouch(400, 300)])
      );

      // 2. Rotate fingers clockwise by ~0.25 radians
      const angle = 0.25;
      const radius = 100;
      const t0 = createTouch(300 - Math.cos(angle) * radius, 300 - Math.sin(angle) * radius);
      const t1 = createTouch(300 + Math.cos(angle) * radius, 300 + Math.sin(angle) * radius);

      pinchHandler.handleTouchMove(createTouchEvent('touchmove', [t0, t1]));

      // Camera yaw must have rotated by ~0.25 rad
      const updatedYaw = battleView.sceneManager.getCameraYaw();
      expect(updatedYaw - initialYaw).toBeCloseTo(0.25, 2);

      // 3. Lift fingers
      pinchHandler.handleTouchEnd(createTouchEvent('touchend', []));

      battleView.destroy();
      document.body.removeChild(container);
    });

    it('should allow mobile users to select a friendly squad, drag finger onto target hex to preview path, and release to execute move/attack', () => {
      const hexMap = new HexMap(10, 6);
      const battle = new Battle(hexMap);
      battle.initializeToSize(hexMap.width, hexMap.height);
      const settings = new BattleSettings();
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.armyAlignment = 0;
      swordsman.position = { x: 2, y: 2 };

      const enemyArcher = new Creature(CreatureType.ARCHER);
      enemyArcher.armyAlignment = 1;
      enemyArcher.position = { x: 3, y: 2 };

      battle.creatures = [swordsman, enemyArcher];
      battle.currentArmyIndex = 0;
      battle.activeCreatureIndex = -1;

      const battleView = new BattleView3D(container, hexMap, battle, settings);

      const secondaryActionSpy = vi.spyOn(battle, 'handleSecondaryCellAction');
      const mouseOverSpy = vi.spyOn(battle, 'onMouseOverCell');
      const primaryActionSpy = vi.spyOn(battle, 'handlePrimaryCellAction');

      // Mock screen-to-hex raycasting for tests
      (battleView as any).raycastHexAt = vi.fn((clientX: number, clientY: number) => {
        if (Math.hypot(clientX - 100, clientY - 100) < 30) {
          return { hex: { x: 2, y: 2 }, direction: HexDirection.EAST };
        }
        if (Math.hypot(clientX - 260, clientY - 100) < 30) {
          return { hex: { x: 3, y: 2 }, direction: HexDirection.EAST };
        }
        return null;
      });

      const createPointerEvent = (type: string, clientX: number, clientY: number, button = 0) => {
        const ev = new Event(type, { cancelable: true }) as any;
        ev.clientX = clientX;
        ev.clientY = clientY;
        ev.button = button;
        ev.pointerType = 'touch';
        ev.preventDefault = vi.fn();
        return ev;
      };

      // 1. Single finger tap selects a friendly squad at (100, 100) -> hex (2, 2)
      (battleView as any).boundPointerDown(createPointerEvent('pointerdown', 100, 100));
      (battleView as any).boundPointerUp(createPointerEvent('pointerup', 100, 100));
      (battleView as any).boundClick(createPointerEvent('click', 100, 100));
      expect(primaryActionSpy).toHaveBeenCalledWith({ x: 2, y: 2 }, HexDirection.EAST);
      expect(battle.activeCreatureIndex).toBe(0);

      // 2. Subsequent finger drag operation starts from squad's initial position (100, 100)
      primaryActionSpy.mockClear();
      (battleView as any).boundPointerDown(createPointerEvent('pointerdown', 100, 100));
      expect((battleView as any).touchDragSourceHex).toEqual({ x: 2, y: 2 });
      expect((battleView as any).isTouchDraggingAction).toBe(false);

      // 3. Dragging finger onto target hex (3, 2) at (260, 100) previews path to target
      (battleView as any).boundPointerMove(createPointerEvent('pointermove', 260, 100));
      expect((battleView as any).isTouchDraggingAction).toBe(true);
      expect(mouseOverSpy).toHaveBeenCalledWith({ x: 3, y: 2 }, HexDirection.EAST, false);

      // 4. Releasing finger issues the same action triggered by a right mouse button click
      (battleView as any).boundPointerUp(createPointerEvent('pointerup', 260, 100));
      expect(secondaryActionSpy).toHaveBeenCalledWith({ x: 3, y: 2 }, HexDirection.EAST, false);
      expect((battleView as any).touchDragSourceHex).toBeNull();
      expect((battleView as any).isTouchDraggingAction).toBe(false);

      // 5. Subsequent synthetic click event is suppressed so target hex is not accidentally clicked
      (battleView as any).boundClick(createPointerEvent('click', 260, 100));
      expect(primaryActionSpy).not.toHaveBeenCalled();

      // 6. Normal tap without dragging (moved <= 8px) does NOT trigger secondary action
      secondaryActionSpy.mockClear();
      (battleView as any).boundPointerDown(createPointerEvent('pointerdown', 100, 100));
      (battleView as any).boundPointerMove(createPointerEvent('pointermove', 102, 101)); // moved 2px (< 8px)
      expect((battleView as any).isTouchDraggingAction).toBe(false);
      (battleView as any).boundPointerUp(createPointerEvent('pointerup', 102, 101));
      expect(secondaryActionSpy).not.toHaveBeenCalled();

      battleView.destroy();
      document.body.removeChild(container);
    });
  });

  describe('12. Hex Terrain Edge Blending (Approach 3: Procedural Hex-SDF Blend)', () => {
    it('should blend Forest hexes into adjacent Plain hexes via Hex-SDF transparency mask with base Grass', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          if (x === 2 && y === 2) return TerrainType.FOREST;
          return TerrainType.PLAIN;
        },
      });

      expect(hexBoard.isTileBlended(2, 2)).toBe(true);
      const transitions = hexBoard.getTileEdgeTransitions(2, 2);
      expect(transitions).not.toBeNull();
      // All 6 directions border PLAIN, so all 6 edge transitions should be 1.0
      expect(transitions).toEqual([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);

      const tileMesh = (hexBoard as any).tileMeshes.get('2,2') as THREE.Mesh;
      expect(tileMesh).toBeDefined();
      const topMat = (tileMesh.material as THREE.Material[])[1] as THREE.MeshStandardMaterial;
      expect(topMat.userData.isBlendedTerrain).toBe(true);
      expect(topMat.userData.terrainType).toBe(TerrainType.FOREST);

      hexBoard.dispose();
    });

    it('should maintain solid forest without edge fading along edges adjacent to another Forest hex', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          // Connected forest patch: (2, 2) and (3, 2) which is East of (2, 2)
          if ((x === 2 && y === 2) || (x === 3 && y === 2)) return TerrainType.FOREST;
          return TerrainType.PLAIN;
        },
      });

      // Tile (2, 2): East neighbor (Edge 0) is Forest -> Edge 0 must NOT transition (0.0)
      const trans22 = hexBoard.getTileEdgeTransitions(2, 2)!;
      expect(trans22[0]).toBe(0.0); // Edge 0 = EAST (borders Forest at 3, 2)
      expect(trans22[1]).toBe(1.0); // SOUTHEAST (borders Plain)
      expect(trans22[2]).toBe(1.0); // SOUTHWEST (borders Plain)
      expect(trans22[3]).toBe(1.0); // WEST (borders Plain)

      // Tile (3, 2): West neighbor (Edge 3) is Forest -> Edge 3 must NOT transition (0.0)
      const trans32 = hexBoard.getTileEdgeTransitions(3, 2)!;
      expect(trans32[3]).toBe(0.0); // Edge 3 = WEST (borders Forest at 2, 2)
      expect(trans32[0]).toBe(1.0); // EAST (borders Plain)

      hexBoard.dispose();
    });

    it('should blend Swamp hexes into adjacent Plain hexes with base Grass', () => {
      const hexMap = new HexMap(6, 6);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          if (x === 2 && y === 2) return TerrainType.SWAMP;
          return TerrainType.PLAIN;
        },
      });

      expect(hexBoard.isTileBlended(2, 2)).toBe(true);
      const transitions = hexBoard.getTileEdgeTransitions(2, 2)!;
      expect(transitions).toEqual([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);

      const tileMesh = (hexBoard as any).tileMeshes.get('2,2') as THREE.Mesh;
      const topMat = (tileMesh.material as THREE.Material[])[1] as THREE.MeshStandardMaterial;
      expect(topMat.userData.isBlendedTerrain).toBe(true);
      expect(topMat.userData.terrainType).toBe(TerrainType.SWAMP);

      hexBoard.dispose();
    });

    it('should compile Hex-SDF shader with onBeforeCompile and pass correct uniforms and GLSL injection', () => {
      const hexMap = new HexMap(4, 4);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => (x === 1 && y === 1 ? TerrainType.FOREST : TerrainType.PLAIN),
        blendTransitionWidth: 0.40,
        blendNoiseStrength: 0.09,
      });

      const tileMesh = (hexBoard as any).tileMeshes.get('1,1') as THREE.Mesh;
      const topMat = (tileMesh.material as THREE.Material[])[1] as THREE.MeshStandardMaterial;

      // Mock shader compilation pass
      const mockShader: any = {
        vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
        fragmentShader: '#include <common>\nvoid main() {\n#include <map_fragment>\n}',
        uniforms: {},
      };

      topMat.onBeforeCompile(mockShader, {} as any);

      // Verify uniforms
      expect(mockShader.uniforms.uBaseColor.value).toBeDefined();
      expect(mockShader.uniforms.uTileCenter.value).toBeInstanceOf(THREE.Vector2);
      expect(mockShader.uniforms.uHexRadius.value).toBe(hexBoard.hexRadius);
      expect(mockShader.uniforms.uEdgeTransitions.value).toHaveLength(6);
      expect(mockShader.uniforms.uTransitionWidth.value).toBe(0.40);
      expect(mockShader.uniforms.uNoiseStrength.value).toBe(0.09);

      // Verify GLSL injection
      expect(mockShader.vertexShader).toContain('varying vec2 vTerrainWorldXZ;');
      expect(mockShader.vertexShader).toContain('(modelMatrix * vec4(position, 1.0)).xz;');
      expect(mockShader.fragmentShader).toContain('terrainEdgeNoise');
      expect(mockShader.fragmentShader).toContain('overlayAlpha');
      expect(mockShader.fragmentShader).toContain('diffuseColor = mix(baseTerrainColor, diffuseColor, overlayAlpha);');

      hexBoard.dispose();
    });

    it('should clean up blended tile materials on rebuildBoard and dispose without memory leaks', () => {
      const hexMap = new HexMap(5, 5);
      const hexBoard = new HexBoard3D(hexMap, {
        getTerrain: (x, y) => {
          if (x === 1 && y === 1) return TerrainType.FOREST;
          if (x === 3 && y === 3) return TerrainType.SWAMP;
          return TerrainType.PLAIN;
        },
      });

      const blendedList = (hexBoard as any).blendedTileMaterials as THREE.Material[];
      expect(blendedList.length).toBe(2);

      const disposeSpy1 = vi.spyOn(blendedList[0], 'dispose');
      const disposeSpy2 = vi.spyOn(blendedList[1], 'dispose');

      // Rebuild board should dispose existing materials and re-instantiate
      hexBoard.rebuildBoard();
      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
      expect((hexBoard as any).blendedTileMaterials.length).toBe(2);

      // Dispose should clean up all materials
      hexBoard.dispose();
      expect((hexBoard as any).blendedTileMaterials.length).toBe(0);
    });

    it('should configure pronounced directional lighting and PCF soft shadow maps with low ambient light', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const sceneManager = new ThreeSceneManager(container);

      const dirLight = sceneManager.getDirLight();
      expect(dirLight).toBeDefined();
      expect(dirLight.castShadow).toBe(true);
      // Directional light position must be angled from behind the board (z < 0) so shadows project towards the camera (z > 0)
      expect(dirLight.position.z).toBeLessThan(0);
      expect(dirLight.position.y).toBeLessThanOrEqual(20);
      expect(dirLight.intensity).toBeGreaterThanOrEqual(1.8);

      // Ambient illumination should be kept low to maximize shadow contrast
      const ambientLight = sceneManager.getAmbientLight();
      expect(ambientLight.intensity).toBeLessThanOrEqual(0.25);
      const hemiLight = sceneManager.getHemiLight();
      expect(hemiLight.intensity).toBeLessThanOrEqual(0.20);

      // Shadow bias & normalBias should prevent Peter Panning detachment
      expect(dirLight.shadow.bias).toBeCloseTo(-0.0001, 4);
      expect((dirLight.shadow as any).normalBias).toBeGreaterThanOrEqual(0.015);

      sceneManager.dispose();
      document.body.removeChild(container);
    });
  });

  describe('13. Squad Standing Idle Animation Tuning & Desynchronization', () => {
    it('should desynchronize standing animation so squad models do not animate in unison', () => {
      const factory = new UnitVisualFactory();
      const swordsman = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(swordsman);

      expect(squad.models.length).toBe(8);

      // Verify models have distinct non-identical animOffsetMs
      const offsets = squad.models.map((m: any) => m.animOffsetMs);
      const uniqueOffsets = new Set(offsets);
      expect(uniqueOffsets.size).toBeGreaterThan(1);

      // Advance time by 300ms
      squad.update(300, new THREE.PerspectiveCamera());

      // Get internal model vertical positions
      const yPositions = squad.models.map((m: any) => {
        return m.model?.position.y ?? m.mesh?.position.y ?? 0;
      });

      // Ensure that models do not all share the identical vertical position
      const uniqueY = new Set(yPositions.map((y) => y.toFixed(6)));
      expect(uniqueY.size).toBeGreaterThan(1);

      squad.dispose();
    });

    it('should halve the vertical movement amplitude and slow standing animation speed by 50%', () => {
      const group = new THREE.Group();
      const visual = new MeshRigidVisual({
        meshOrGroup: group,
        scale: 1.0,
        animOffsetMs: 0,
      });

      // Speed slowed by 50%: angular frequency is 1.5 rad/s instead of 3.0 rad/s.
      // Quarter cycle peak occurs at t = (PI / 2) / 1.5 = 1.047197s (1047ms).
      visual.update(1047.197);

      // Peak vertical position is now 0.01 * 0.5 = 0.005 (halved from prior 0.010)
      expect(group.position.y).toBeCloseTo(0.005, 4);

      // After a half-cycle from peak (t = (3 * PI / 2) / 1.5 = 3.14159s = 3142ms total),
      // sin reaches -1.0, so group.position.y reaches -0.005
      visual.update(2094.395);
      expect(group.position.y).toBeCloseTo(-0.005, 4);
    });
  });
});
