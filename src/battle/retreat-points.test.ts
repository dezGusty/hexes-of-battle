import { describe, it, expect } from 'vitest';
import { Battle } from '../battle';
import { HexMap } from '../shared/hex-map';
import { Creature, CreatureType } from './creature';
import { HexBoard3D } from '../render3d/hex-board-3d';
import {
  createRetreatFlagMesh,
  updateRetreatFlagWind,
} from '../render3d/decorations/retreat-flag-3d';
import {
  PostBattlePanel,
  formatSquadPostBattleStatus,
  computeArmyLosses,
} from '../ui/post-battle-panel';
import * as THREE from 'three';

describe('Configurable Fixed Retreat Points & Animated Flags', () => {
  describe('1. Default vs Custom Retreat Points Configuration', () => {
    it('should default Player 1 retreat points to left-most edge (x = 0)', () => {
      const hexMap = new HexMap(12, 8);
      const battle = new Battle(hexMap);
      battle.initializeToSize(12, 8);

      const p1Retreat = battle.getRetreatPoints(0);
      expect(p1Retreat.length).toBe(8);
      for (let y = 0; y < 8; y++) {
        expect(p1Retreat).toContainEqual({ x: 0, y });
      }
      expect(battle.hasCustomRetreatPoints(0)).toBe(false);
    });

    it('should default Player 2 retreat points to right-most edge (x = mapWidth - 1)', () => {
      const hexMap = new HexMap(12, 8);
      const battle = new Battle(hexMap);
      battle.initializeToSize(12, 8);

      const p2Retreat = battle.getRetreatPoints(1);
      expect(p2Retreat.length).toBe(8);
      for (let y = 0; y < 8; y++) {
        expect(p2Retreat).toContainEqual({ x: 11, y });
      }
      expect(battle.hasCustomRetreatPoints(1)).toBe(false);
    });

    it('should allow user to configure custom retreat points in the middle of the map via setRetreatPoints', () => {
      const hexMap = new HexMap(12, 8);
      const battle = new Battle(hexMap);
      battle.initializeToSize(12, 8);

      // Custom retreat point in the center
      battle.setRetreatPoints(0, [{ x: 5, y: 3 }, { x: 5, y: 4 }]);
      battle.setRetreatPoints(1, [{ x: 6, y: 3 }]);

      expect(battle.hasCustomRetreatPoints(0)).toBe(true);
      expect(battle.hasCustomRetreatPoints(1)).toBe(true);
      expect(battle.getRetreatPoints(0)).toEqual([{ x: 5, y: 3 }, { x: 5, y: 4 }]);
      expect(battle.getRetreatPoints(1)).toEqual([{ x: 6, y: 3 }]);
    });

    it('should initialize custom retreat points from BattleConfig (both object and array formats)', () => {
      const hexMap = new HexMap(11, 7);
      const battle = new Battle(hexMap);

      battle.initializeFromConfig({
        mapWidth: 11,
        mapHeight: 7,
        retreatPoints: {
          0: [{ x: 4, y: 3 }],
          1: [{ x: 6, y: 3 }],
        },
        creatures: [],
      });

      expect(battle.getRetreatPoints(0)).toEqual([{ x: 4, y: 3 }]);
      expect(battle.getRetreatPoints(1)).toEqual([{ x: 6, y: 3 }]);
    });
  });

  describe('2. Routing Squad Retreat Navigation & Stopping at Retreat Points', () => {
    it('should retreat Player 1 routing squad towards custom retreat point in middle of map (moving right instead of left)', () => {
      const hexMap = new HexMap(12, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 2, y: 4 }; // Starts at x = 2
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing state
      routingUnit.stats.stamina = 20;
      routingUnit.stats.num_moves = 3;
      routingUnit.stats.remaining_movement = 3;

      const dummyEnemy = new Creature(CreatureType.SWORDSMAN);
      dummyEnemy.position = { x: 9, y: 4 };
      dummyEnemy.armyAlignment = 1;

      // Custom retreat point in middle of map at (5, 4)
      battle.initializeFromConfig({
        mapWidth: 12,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 12 }, () => Array(8).fill(0)),
        retreatPoints: {
          0: [{ x: 5, y: 4 }],
        },
        creatures: [routingUnit, dummyEnemy],
      });

      // Unit should run towards (5, 4), which is to its right (increasing x)
      expect(routingUnit.position.x).toBeGreaterThan(2);
      expect(routingUnit.position.x).toBe(5); // 2 + 3 moves = 5
      expect(routingUnit.position.y).toBe(4);
      expect(routingUnit.stats.stamina).toBe(17);
    });

    it('should remove routing squad from battle when reaching a designated retreat point', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const routingUnit = new Creature(CreatureType.PEASANT);
      routingUnit.position = { x: 4, y: 3 };
      routingUnit.armyAlignment = 0;
      routingUnit.stats.morale = 0; // Routing
      routingUnit.stats.stamina = 20;
      routingUnit.stats.num_moves = 4; // Has 4 moves, but retreat point is only 2 hexes away
      routingUnit.stats.remaining_movement = 4;

      const dummyEnemy = new Creature(CreatureType.SWORDSMAN);
      dummyEnemy.position = { x: 9, y: 7 };
      dummyEnemy.armyAlignment = 1;

      // Retreat point at (2, 3), 2 hexes away
      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 10 }, () => Array(8).fill(0)),
        retreatPoints: {
          0: [{ x: 2, y: 3 }],
        },
        creatures: [routingUnit, dummyEnemy],
      });

      // Unit moved from (4, 3) to (2, 3), taking only 2 moves and reaching the retreat point
      expect(routingUnit.position).toEqual({ x: 2, y: 3 });
      expect(routingUnit.stats.stamina).toBe(18); // Only spent 2 stamina

      // Unit should be removed from active battle creatures and recorded in routedCreatures
      expect(battle.creatures).not.toContain(routingUnit);
      expect(battle.routedCreatures).toContain(routingUnit);
      expect((routingUnit as any).hasRetreated).toBe(true);
      expect(battle.getCreatureAtPosition({ x: 2, y: 3 })).toBeNull();
    });

    it('should retreat Player 2 routing squad towards custom retreat point in middle of map (moving left)', () => {
      const hexMap = new HexMap(12, 8);
      const battle = new Battle(hexMap);

      const playerUnit = new Creature(CreatureType.SWORDSMAN);
      playerUnit.position = { x: 1, y: 2 };
      playerUnit.armyAlignment = 0;

      const routingEnemy = new Creature(CreatureType.PEASANT);
      routingEnemy.position = { x: 8, y: 4 }; // Starts at x = 8
      routingEnemy.armyAlignment = 1;
      routingEnemy.stats.morale = 0; // Routing
      routingEnemy.stats.stamina = 20;
      routingEnemy.stats.num_moves = 3;
      routingEnemy.stats.remaining_movement = 3;

      // Retreat point in middle at (5, 4)
      battle.initializeFromConfig({
        mapWidth: 12,
        mapHeight: 8,
        terrainTiles: Array.from({ length: 12 }, () => Array(8).fill(0)),
        retreatPoints: {
          1: [{ x: 5, y: 4 }],
        },
        creatures: [playerUnit, routingEnemy],
      });

      // Pass turn to Army 1
      battle.nextTurn();

      // Enemy moves towards (5, 4) (x decreasing) and reaches retreat point
      expect(routingEnemy.position.x).toBe(5);
      expect(routingEnemy.position.y).toBe(4);
      expect(routingEnemy.stats.stamina).toBe(17);
      expect(battle.creatures).not.toContain(routingEnemy);
      expect(battle.routedCreatures).toContain(routingEnemy);
    });
  });

  describe('3. 3D Flag Mesh & Pass-Through Decoration Compatibility', () => {
    it('should build a tall war standard flag mesh with pole, finial, and cloth banner', () => {
      const flag = createRetreatFlagMesh(0, 4, 3);
      expect(flag).toBeDefined();
      expect(flag.name).toBe('RetreatFlag_Army0_4_3');
      expect(flag.userData.isRetreatFlag).toBe(true);
      expect(flag.userData.armyIndex).toBe(0);

      const pole = flag.getObjectByName('Pole') as THREE.Mesh;
      const finial = flag.getObjectByName('Finial') as THREE.Mesh;
      const cloth = flag.getObjectByName('Cloth') as THREE.Mesh;

      expect(pole).toBeDefined();
      expect(finial).toBeDefined();
      expect(cloth).toBeDefined();

      // Cloth should be marked as retreat flag cloth with stored original positions
      expect(cloth.userData.isRetreatFlagCloth).toBe(true);
      expect(cloth.userData.originalPositions).toBeDefined();
      expect(cloth.userData.originalPositions.length).toBeGreaterThan(0);

      // Verify 40% dimensions
      expect(cloth.userData.length).toBeCloseTo(0.44, 2);
      expect(cloth.userData.height).toBeCloseTo(0.288, 3);
      const poleGeo = pole.geometry as THREE.CylinderGeometry;
      expect(poleGeo.parameters.height).toBeCloseTo(0.88, 2);

      // Verify South-West to North-East wind direction (+45 deg around Y)
      expect(cloth.rotation.y).toBeCloseTo(Math.PI * 0.25, 4);
      const windDir = cloth.userData.windDirection as THREE.Vector3;
      expect(windDir.x).toBeCloseTo(Math.SQRT1_2, 3);
      expect(windDir.z).toBeCloseTo(-Math.SQRT1_2, 3);
    });

    it('should allow both a squad and a flag to occupy the same hex without blocking', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const peasant = new Creature(CreatureType.PEASANT);
      peasant.position = { x: 4, y: 3 };
      peasant.armyAlignment = 0;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        retreatPoints: {
          0: [{ x: 4, y: 3 }],
        },
        creatures: [peasant],
      });

      // Squad occupies hex (4, 3)
      expect(battle.getCreatureAtPosition({ x: 4, y: 3 })).not.toBeNull();
      expect(battle.getCreatureAtPosition({ x: 4, y: 3 })?.creature).toBe(peasant);

      // HexBoard3D builds flag on the exact same hex (4, 3)
      const hexBoard = new HexBoard3D(hexMap, {
        getRetreatPoints: (a) => battle.getRetreatPoints(a),
      });

      const flags = hexBoard.retreatFlagsGroup.children;
      const flagAtHex = flags.find(
        (f) => f.userData.hexX === 4 && f.userData.hexY === 3 && f.userData.armyIndex === 0
      );
      expect(flagAtHex).toBeDefined();

      // Ensure flags do not modify battle occupation or block pathfinding
      expect(battle.getCreatureAtPosition({ x: 4, y: 3 })?.creature).toBe(peasant);
      // Other cells remain completely unblocked
      expect(battle.getCreatureAtPosition({ x: 4, y: 4 })).toBeNull();
    });
  });

  describe('4. Wind Animation Simulation', () => {
    it('should animate cloth vertices with wave displacement while keeping hoist pinned to the pole', () => {
      const flag = createRetreatFlagMesh(0, 2, 2);
      const cloth = flag.getObjectByName('Cloth') as THREE.Mesh;
      const geo = cloth.geometry as THREE.BufferGeometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;

      // Animate at t = 1.0 second
      updateRetreatFlagWind(cloth, 1.0);

      // Find vertex at hoist (x = 0) vs vertex at fly tip (x = length)
      let minXIndex = -1;
      let maxXIndex = -1;
      let minX = Infinity;
      let maxX = -Infinity;

      const orig = cloth.userData.originalPositions as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const ox = orig[i * 3];
        if (ox < minX) {
          minX = ox;
          minXIndex = i;
        }
        if (ox > maxX) {
          maxX = ox;
          maxXIndex = i;
        }
      }

      // Vertex pinned at the pole (x = 0) should have essentially zero displacement
      expect(minX).toBeCloseTo(0, 2);
      expect(posAttr.getZ(minXIndex)).toBeCloseTo(0, 3);

      // Vertex at free fly edge (x = 0.44) should have significant wave displacement
      expect(maxX).toBeCloseTo(0.44, 2);
      expect(posAttr.getZ(maxXIndex)).not.toBe(0);

      // Animate at t = 2.0 seconds: fly edge displacement should change over time (billowing wind)
      const zAt1s = posAttr.getZ(maxXIndex);
      updateRetreatFlagWind(cloth, 2.0);
      const zAt2s = posAttr.getZ(maxXIndex);
      expect(zAt2s).not.toBeCloseTo(zAt1s, 4);

      // Hoist vertex at x = 0 should still remain firmly pinned at t = 2.0s
      expect(posAttr.getZ(minXIndex)).toBeCloseTo(0, 3);
    });

    it('should update all board retreat flags on HexBoard3D.update()', () => {
      const hexMap = new HexMap(10, 8);
      const hexBoard = new HexBoard3D(hexMap, {
        getRetreatPoints: () => [{ x: 3, y: 3 }],
      });

      expect(hexBoard.retreatFlagsGroup.children.length).toBeGreaterThan(0);

      const flag = hexBoard.retreatFlagsGroup.children[0];
      const cloth = flag.getObjectByName('Cloth') as THREE.Mesh;
      const posAttr = (cloth.geometry as THREE.BufferGeometry).attributes.position;

      const zBefore = posAttr.getZ(posAttr.count - 1);
      hexBoard.update(500); // 500 ms delta
      const zAfter = posAttr.getZ(posAttr.count - 1);

      expect(zAfter).not.toBe(zBefore);
    });
  });

  describe('5. Post-Battle Screen & Unit Losses Recording', () => {
    it('should format squad post-battle status according to rules: "killed", "X out of Y routed", "X out of Y"', () => {
      const aliveSquad = new Creature(CreatureType.PEASANT);
      aliveSquad.stats.model_count = 12;
      aliveSquad.stats.model_hp = 10;
      aliveSquad.stats.health = 120;
      aliveSquad.stats.remaining_health = 120;

      expect(formatSquadPostBattleStatus(aliveSquad, false, false)).toBe('12 out of 12');

      // Damaged surviving squad (8 out of 12)
      aliveSquad.takeDamage(40); // 120 - 40 = 80 HP -> 8 models
      expect(formatSquadPostBattleStatus(aliveSquad, false, false)).toBe('8 out of 12');

      // Routed squad (8 out of 12 routed)
      expect(formatSquadPostBattleStatus(aliveSquad, false, true)).toBe('8 out of 12 routed');

      // Killed squad shows "killed" instead of 0
      const deadSquad = new Creature(CreatureType.SWORDSMAN);
      deadSquad.takeDamage(200); // lethal damage
      expect(formatSquadPostBattleStatus(deadSquad, true, false)).toBe('killed');
      expect(formatSquadPostBattleStatus(deadSquad, true, true)).toBe('killed');
    });

    it('should compute full army losses summary and squad rows across killed, routed, and surviving squads', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const peasant = new Creature(CreatureType.PEASANT);
      peasant.stats.model_count = 12;
      peasant.stats.model_hp = 10;
      peasant.stats.health = 120;
      peasant.stats.remaining_health = 120;
      peasant.position = { x: 1, y: 1 };
      peasant.armyAlignment = 0;

      const swordsman = new Creature(CreatureType.SWORDSMAN);
      swordsman.stats.model_count = 10;
      swordsman.stats.model_hp = 10;
      swordsman.stats.health = 100;
      swordsman.stats.remaining_health = 100;
      swordsman.position = { x: 1, y: 2 };
      swordsman.armyAlignment = 0;

      const archer = new Creature(CreatureType.ARCHER);
      archer.stats.model_count = 8;
      archer.stats.model_hp = 10;
      archer.stats.health = 80;
      archer.stats.remaining_health = 80;
      archer.position = { x: 1, y: 3 };
      archer.armyAlignment = 0;

      const enemy = new Creature(CreatureType.PEASANT);
      enemy.position = { x: 8, y: 4 };
      enemy.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [peasant, swordsman, archer, enemy],
      });

      // 1. Archer is killed
      archer.takeDamage(200);
      battle.casualties.push(archer);
      battle.creatures = battle.creatures.filter((c) => c !== archer);

      // 2. Peasant routs and retreats off battlefield
      peasant.takeDamage(40); // 8 out of 12 remaining
      (peasant as any).hasRetreated = true;
      battle.routedCreatures.push(peasant);
      battle.creatures = battle.creatures.filter((c) => c !== peasant);

      // 3. Swordsman takes light damage and survives (7 out of 10)
      swordsman.takeDamage(30);

      const p1Summary = computeArmyLosses(0, battle, 'Player 1');
      expect(p1Summary.armyIndex).toBe(0);
      expect(p1Summary.armyName).toBe('Player 1');
      expect(p1Summary.totalInitialSquads).toBe(3);
      expect(p1Summary.squadsKilled).toBe(1);
      expect(p1Summary.squadsRouted).toBe(1);
      expect(p1Summary.squadsSurvived).toBe(1);

      // Models: peasant max 12 (8 alive), swordsman max 10 (7 alive), archer max 8 (0 alive)
      // Total initial = 12 + 10 + 8 = 30
      // Total remaining = 8 + 7 + 0 = 15
      // Total lost = 30 - 15 = 15
      expect(p1Summary.totalInitialModels).toBe(30);
      expect(p1Summary.totalRemainingModels).toBe(15);
      expect(p1Summary.totalModelsLost).toBe(15);

      // Check per-squad rows
      const peasantRow = p1Summary.squads.find((s) => s.creature === peasant);
      expect(peasantRow).toBeDefined();
      expect(peasantRow?.name).toBe('Peasant');
      expect(peasantRow?.isRouted).toBe(true);
      expect(peasantRow?.statusText).toBe('8 out of 12 routed');

      const archerRow = p1Summary.squads.find((s) => s.creature === archer);
      expect(archerRow).toBeDefined();
      expect(archerRow?.isKilled).toBe(true);
      expect(archerRow?.statusText).toBe('killed');

      const swordsmanRow = p1Summary.squads.find((s) => s.creature === swordsman);
      expect(swordsmanRow).toBeDefined();
      expect(swordsmanRow?.isKilled).toBe(false);
      expect(swordsmanRow?.isRouted).toBe(false);
      expect(swordsmanRow?.statusText).toBe('7 out of 10');
    });

    it('should create large semi-transparent PostBattlePanel with side-by-side columns and squad rows', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const p1Peasant = new Creature(CreatureType.PEASANT);
      p1Peasant.position = { x: 1, y: 1 };
      p1Peasant.armyAlignment = 0;

      const p2Swordsman = new Creature(CreatureType.SWORDSMAN);
      p2Swordsman.position = { x: 8, y: 4 };
      p2Swordsman.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [p1Peasant, p2Swordsman],
      });

      const panel = new PostBattlePanel();
      expect(panel.isVisible()).toBe(false);

      // Show panel
      panel.show(battle, 0); // Player 1 victory
      expect(panel.isVisible()).toBe(true);
      expect(panel.lastVictor).toBe(0);

      // Summaries should be cached and accessible
      const p1Sum = panel.getArmySummary(0);
      const p2Sum = panel.getArmySummary(1);
      expect(p1Sum).not.toBeNull();
      expect(p2Sum).not.toBeNull();
      expect(p1Sum?.squads.length).toBe(1);
      expect(p2Sum?.squads.length).toBe(1);

      // Close panel
      panel.hide();
      expect(panel.isVisible()).toBe(false);

      panel.destroy();
    });

    it('should record routed units in BattleResult upon battle completion', () => {
      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const unitA = new Creature(CreatureType.PEASANT);
      unitA.position = { x: 2, y: 2 };
      unitA.armyAlignment = 0;

      const unitB = new Creature(CreatureType.SWORDSMAN);
      unitB.position = { x: 7, y: 4 };
      unitB.armyAlignment = 1;

      battle.initializeFromConfig({
        mapWidth: 10,
        mapHeight: 8,
        creatures: [unitA, unitB],
      });

      // Simulate unitB routing and reaching retreat point
      (unitB as any).hasRetreated = true;
      battle.routedCreatures.push(unitB);
      battle.creatures = [unitA];

      battle.checkVictoryConditionsAndState();
      expect(battle.isFinished()).toBe(true);

      const result = battle.getBattleResult();
      expect(result.victorArmyIndex).toBe(0);
      expect(result.survivingCreatures).toContain(unitA);
      expect(result.routedCreatures).toContain(unitB);
    });
  });
});
