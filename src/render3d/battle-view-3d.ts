import { sound } from '@pixi/sound';
import { Battle, MapRenderUpdate, RangedAttackData } from '../battle';
import { HexDirection, HexFlankStatus, HexMap, checkFlankingStatus } from '../shared/hex-map';
import { Coords } from '../shared';
import { Creature } from '../battle/creature';
import { BattleActionType } from '../battle/battle-action';
import { CPUPlayer } from '../battle/cpu-player';
import { BattleSettings } from '../battle/settings';
import { ThreeSceneManager } from './three-scene-manager';
import { HexBoard3D } from './hex-board-3d';
import { SquadVisual3D } from './units/squad-visual-3d';
import { UnitVisualFactory } from './units/unit-visual-factory';
import { ProjectileSystem3D } from './projectiles/projectile-system-3d';
import { BattleHexMapPath } from '../battle/battle-hex-map-path';
import { ThreeSceneDebugger } from './debug/three-scene-debugger';
import { ExhaustionState } from '../battle/combat-rules';

export interface BattleView3DEvents {
  onNextTurn: () => void;
  onNextUnit: () => void;
  onReset: () => void;
  onRest: () => void;
  onActiveAbility1?: () => void;
  onToggleStats?: () => void;
}

export class BattleView3D {
  public readonly sceneManager: ThreeSceneManager;
  public readonly hexBoard: HexBoard3D;
  public readonly projectileSystem: ProjectileSystem3D = new ProjectileSystem3D();
  public readonly visualFactory: UnitVisualFactory;
  public readonly sceneDebugger?: ThreeSceneDebugger;

  public readonly squadVisuals: Map<string, SquadVisual3D> = new Map();
  public readonly battle: Battle;
  private hexMap: HexMap;
  private settings: BattleSettings;

  // Interaction & Input State
  private hoveredHex: Coords | null = null;
  private hoveredDirection: HexDirection = HexDirection.NONE;
  private isPointerDown: boolean = false;
  private isCtrlPressed: boolean = false;
  private lastPointerPos: Coords = { x: 0, y: 0 };
  private pointerButton: number = 0;

  // Events callback
  private events?: BattleView3DEvents;
  private hud?: any;
  private getStageInfo?: () => { offset: Coords; scale: Coords };

  // Bound event listeners for cleanup
  private boundPointerDown?: (e: PointerEvent) => void;
  private boundPointerUp?: (e: PointerEvent) => void;
  private boundPointerMove?: (e: PointerEvent) => void;
  private boundWheel?: (e: WheelEvent) => void;
  private boundClick?: (e: MouseEvent) => void;
  private boundContextMenu?: (e: MouseEvent) => void;
  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundKeyUp?: (e: KeyboardEvent) => void;
  private boundBlur?: () => void;

  // Active keyboard navigation keys
  private pressedKeys: Set<string> = new Set();
  public cameraPanSpeed: number = 16.0; // world units per second
  public cameraRotateSpeed: number = 2.2; // radians per second

  constructor(
    container: HTMLElement,
    hexMap: HexMap,
    battle: Battle,
    settings: BattleSettings,
    _cpuPlayer?: CPUPlayer,
    unitsCatalogImage?: HTMLImageElement,
    spriteFrames?: Record<string, any>
  ) {
    this.hexMap = hexMap;
    this.battle = battle;
    this.settings = settings;

    this.sceneManager = new ThreeSceneManager(container);
    this.hexBoard = new HexBoard3D(this.hexMap, {
      showGrid: settings.hex.showGrid,
      borderThickness: settings.hex.gridBorderThickness,
      borderColor: settings.hex.gridBorderColor,
      showCoords: settings.debug.showCoords,
      coordsFontSize: settings.debug.coordsFontSize,
      coordsFontFamily: settings.debug.coordsFontFamily,
      coordsColor: settings.debug.coordsColor,
      coordsStrokeColor: settings.debug.coordsStrokeColor,
      coordsStrokeWidth: settings.debug.coordsStrokeWidth,
      getTerrain: (x, y) => this.battle.getTerrainAt({ x, y }),
    });
    this.sceneManager.scene.add(this.hexBoard.group);
    this.sceneManager.scene.add(this.projectileSystem.group);

    this.visualFactory = new UnitVisualFactory({
      unitsImage: unitsCatalogImage,
      spriteFrames,
    });

    this.setupPointerEvents(container);
    this.setupKeyboardControls();
    this.syncAllSquads();

    // Initialize 3D Scene Debugger
    this.sceneDebugger = new ThreeSceneDebugger(this.sceneManager, this, {
      autoOpen: settings.debug.showSceneInspector,
      hotkey: 'F2',
      onToggle: (visible) => {
        this.settings.debug.showSceneInspector = visible;
        this.settings.save();
      },
    });
  }

  public setHud(hud: any, getStageInfo: () => { offset: Coords; scale: Coords }): void {
    this.hud = hud;
    this.getStageInfo = getStageInfo;
  }

  public setGridVisible(visible: boolean): void {
    this.hexBoard.setGridVisible(visible);
  }

  public setGridBorderThickness(thickness: number): void {
    this.hexBoard.setGridBorderThickness(thickness);
  }

  public setCoordsVisible(visible: boolean): void {
    this.hexBoard.setCoordsVisible(visible);
  }

  public setSceneInspectorVisible(visible: boolean): void {
    this.sceneDebugger?.setVisible(visible);
  }

  public toggleSceneInspector(): boolean {
    this.sceneDebugger?.toggle();
    return this.sceneDebugger?.isVisible() ?? false;
  }

  public setZoomLevel(normalized: number): void {
    this.sceneManager.setZoomLevel(normalized);
  }

  public async loadAllAssets(): Promise<void> {
    await Promise.all([
      this.visualFactory.loadCatalogAssets('units_80x160.png', 'unitsspritesheet.json'),
      this.hexBoard.loadTerrainAssets('textures/terrain/'),
    ]);
    this.syncAllSquads();
  }

  public initialize(events: BattleView3DEvents): void {
    this.events = events;
  }

  public setCpuPlayer(_cpuPlayer: CPUPlayer): void {
    // No-op for 3D view
  }

  public syncAllSquads(): void {
    // Clear existing
    this.squadVisuals.forEach((squad) => {
      this.sceneManager.scene.remove(squad.rootGroup);
      squad.dispose();
    });
    this.squadVisuals.clear();

    // Spawn squads for all creatures in battle
    this.battle.creatures.forEach((creature) => {
      if (!creature.isAlive) return;

      const squad = this.visualFactory.createSquadVisual(creature);
      const worldPos = this.hexBoard.hexToWorld(creature.position.x, creature.position.y);
      squad.rootGroup.position.copy(worldPos);
      squad.setFacing(creature.facingDirection);

      this.sceneManager.scene.add(squad.rootGroup);
      this.squadVisuals.set(creature.GUID.toString(), squad);
    });

    this.updateActiveUnitSelection();
    this.sceneDebugger?.refreshEntityList();
    this.sceneDebugger?.updateStats();
  }

  public updateActiveUnitSelection(): void {
    const active = this.battle.getActiveCreature();
    if (active && active.isAlive) {
      this.hexBoard.setSelectedUnitHex(active.position, active.facingDirection);

      // Highlight walkable and attackable tiles
      const walkable: Coords[] = [];
      const attackable: Coords[] = [];

      for (let x = 0; x < this.hexMap.width; x++) {
        for (let y = 0; y < this.hexMap.height; y++) {
          const pathVal = this.battle.pathfinding_tiles[x]?.[y] ?? 0;
          const rangeVal = this.battle.rangereach_targets[x]?.[y] ?? 0;

          if (pathVal > 0 && pathVal !== BattleHexMapPath.CELL_ENEMY) {
            walkable.push({ x, y });
          } else if (pathVal === BattleHexMapPath.CELL_ENEMY || rangeVal === BattleHexMapPath.CELL_ENEMY) {
            attackable.push({ x, y });
          }
        }
      }

      this.hexBoard.updateReachOverlays(walkable, attackable);
    } else {
      this.hexBoard.setSelectedUnitHex(null);
      this.hexBoard.clearReachOverlays();
    }
  }

  public showRangedAttackVisuals(data: RangedAttackData): void {
    const attackerSquad = this.squadVisuals.get(data.attacker.GUID.toString());
    const sourcePos = attackerSquad
      ? attackerSquad.rootGroup.position.clone()
      : this.hexBoard.hexToWorld(data.attacker.position.x, data.attacker.position.y);

    if (attackerSquad) {
      attackerSquad.playAnimation('attack_ranged', 400);
    }

    if (this.settings.sound.soundOn !== false && this.settings.sound.soundVolume > 0) {
      sound.play('arrow', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
    }

    // Build array of individual projectile trajectories with distinct destination hexes
    const projectiles = data.projectiles.map((p) => {
      const hitSquad = p.hitCreature ? this.squadVisuals.get(p.hitCreature.GUID.toString()) : undefined;
      const targetPos = hitSquad
        ? hitSquad.rootGroup.position.clone()
        : this.hexBoard.hexToWorld(p.targetHex.x, p.targetHex.y);

      return {
        targetPos,
        sourcePos,
      };
    });

    const onImpact = () => {
      data.targetDamages.forEach(({ target, damage, flankStatus }) => {
        const targetSquad = this.squadVisuals.get(target.GUID.toString());
        this.applyDamageVisuals(targetSquad, damage, flankStatus);
      });
    };

    const avgTargetPos = projectiles.length > 0 ? projectiles[0].targetPos : sourcePos;
    const dist = sourcePos.distanceTo(avgTargetPos);

    this.projectileSystem.spawnVolley({
      sourcePos,
      projectiles,
      projectileType: 'arrow',
      durationMs: 480,
      apexHeight: Math.max(1.8, dist * 0.38),
      onImpact,
    });
  }

  public showAttackVisuals(
    attacker: Creature,
    defender: Creature,
    damage: number,
    attackType: BattleActionType,
    flankStatus: HexFlankStatus
  ): void {
    const attackerSquad = this.squadVisuals.get(attacker.GUID.toString());
    const defenderSquad = this.squadVisuals.get(defender.GUID.toString());

    if (attackType === BattleActionType.ATTACK_RANGED) {
      // Single-target fallback or legacy call
      const sourcePos = attackerSquad
        ? attackerSquad.rootGroup.position.clone()
        : this.hexBoard.hexToWorld(attacker.position.x, attacker.position.y);
      const targetPos = defenderSquad
        ? defenderSquad.rootGroup.position.clone()
        : this.hexBoard.hexToWorld(defender.position.x, defender.position.y);

      if (attackerSquad) {
        attackerSquad.playAnimation('attack_ranged', 400);
      }

      if (this.settings.sound.soundOn !== false && this.settings.sound.soundVolume > 0) {
        sound.play('arrow', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
      }

      this.projectileSystem.spawnVolley({
        sourcePos,
        targetPos,
        projectileType: 'arrow',
        durationMs: 480,
        apexHeight: Math.max(1.8, sourcePos.distanceTo(targetPos) * 0.38),
        volleyCount: Math.min(8, Math.max(3, attacker.aliveModelCount)),
        onImpact: () => {
          this.applyDamageVisuals(defenderSquad, damage, flankStatus);
        },
      });
    } else {
      // Melee attack
      if (attackerSquad) {
        attackerSquad.playAnimation('attack_melee', 450);
      }

      if (this.settings.sound.soundOn !== false && this.settings.sound.soundVolume > 0) {
        sound.play('sword', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
      }

      setTimeout(() => {
        this.applyDamageVisuals(defenderSquad, damage, flankStatus);
      }, 180);
    }
  }

  private applyDamageVisuals(defenderSquad?: SquadVisual3D, damage?: number, flankStatus?: HexFlankStatus): void {
    if (!defenderSquad) return;

    defenderSquad.playAnimation('hit', 350);
    defenderSquad.updateStats();

    if (damage !== undefined && damage > 0) {
      let label = `-${damage}`;
      let color = '#ff3333';

      if (flankStatus === HexFlankStatus.BACKSTAB) {
        label = `-${damage}\nBACKSTAB!`;
        color = '#ffaa00';
      } else if (flankStatus === HexFlankStatus.FLANK) {
        label = `-${damage}\nFLANK!`;
        color = '#ffdd44';
      }

      defenderSquad.addFloatingCombatText(label, color, 1300);

      if (this.settings.sound.soundOn !== false && this.settings.sound.soundVolume > 0 && !defenderSquad.creature.isAlive) {
        sound.play('die', { speed: 0.9 + Math.random() * 0.2, volume: this.settings.sound.soundVolume });
      }
    } else {
      defenderSquad.addFloatingCombatText('BLOCKED', '#88bbff', 1000);
    }
  }

  public showRestVisuals(creature: Creature, recoveredStamina: number): void {
    const squad = this.squadVisuals.get(creature.GUID.toString());
    if (squad) {
      squad.playAnimation('rest', 600);
      squad.updateStats();
      squad.addFloatingCombatText(`+${recoveredStamina} STAMINA`, '#33ccff', 1200);
    }
  }

  public update(deltaMS: number): void {
    // 0. Update smooth continuous camera keyboard inputs (W, A, S, D, Q, E)
    this.updateCameraKeyboardInput(deltaMS);

    // 1. Process battle engine actions and updates
    const mapUpdate: MapRenderUpdate = this.battle.update(deltaMS);

    if (mapUpdate.somethingChanged || mapUpdate.unitRenderUpdate) {
      // Sync unit positions and alive counts
      this.squadVisuals.forEach((squad, guidStr) => {
        const creature = this.battle.creatures.find((c) => c.GUID.toString() === guidStr);
        if (creature && creature.isAlive && creature.aliveModelCount > 0) {
          const worldPos = this.hexBoard.hexToWorld(creature.position.x, creature.position.y);
          squad.rootGroup.position.copy(worldPos);
          squad.setFacing(creature.facingDirection);
          squad.updateStats();
        } else {
          squad.updateStats();
        }
      });
      this.updateActiveUnitSelection();
      this.updateHoverVisuals();
    }

    // 2. Update 3D squads (overhead bars, animations, floating text) and cleanup eliminated squads
    const toRemoveGuids: string[] = [];
    this.squadVisuals.forEach((squad, guidStr) => {
      squad.update(deltaMS, this.sceneManager.camera);
      if (squad.isEliminated && !squad.hasActiveEffects) {
        toRemoveGuids.push(guidStr);
      }
    });

    for (const guid of toRemoveGuids) {
      const squad = this.squadVisuals.get(guid);
      if (squad) {
        this.sceneManager.scene.remove(squad.rootGroup);
        squad.dispose();
        this.squadVisuals.delete(guid);
      }
    }

    // 3. Update 3D projectiles
    this.projectileSystem.update(deltaMS);

    // 3.5 Update scene debugger
    this.sceneDebugger?.update(deltaMS);

    // 4. Render 3D scene
    this.sceneManager.render();
  }

  public resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
  }

  public resetGridAndTerrain(): void {
    this.hexBoard.rebuildBoard();
    this.syncAllSquads();
    this.sceneManager.resetCamera();
  }

  public showTurnBanner(_turnNum: number, _armyIdx: number): void {
    this.updateActiveUnitSelection();
  }

  private clearHoverState(): void {
    this.hoveredHex = null;
    this.hoveredDirection = HexDirection.NONE;
    this.hexBoard.setHoverHex(null);
    this.hexBoard.clearAttackPreview();
    this.hexBoard.clearPathPreview();
    this.hud?.setCursor('default');
  }

  public computeAttackAndHoverPaths(): { hoverPath: Coords[]; attackPath: Coords[]; originHex: Coords | null; isRanged: boolean } {
    const activeCreature = this.battle.getActiveCreature();
    if (!this.hoveredHex || !activeCreature) {
      return { hoverPath: [], attackPath: [], originHex: null, isRanged: false };
    }

    const targetCreature = this.battle.getCreatureAtPosition(this.hoveredHex);

    if (targetCreature && targetCreature.indexOFArmy !== activeCreature.armyAlignment) {
      if (
        activeCreature.live_stats.remaining_attacks <= 0 ||
        activeCreature.isPanickedOrRouting ||
        activeCreature.exhaustionState === ExhaustionState.DEPLETED
      ) {
        return { hoverPath: [], attackPath: [], originHex: null, isRanged: false };
      }

      // Targeting an enemy unit
      const isRanged = activeCreature.live_stats.is_ranged && activeCreature.stats.remaining_ammo > 0 && !this.isCtrlPressed;
      if (isRanged) {
        return {
          hoverPath: [],
          attackPath: [activeCreature.position, this.hoveredHex],
          originHex: null,
          isRanged: true,
        };
      }

      // Melee attack: find approach hex
      let originHex: Coords | null = null;
      let movePath: Coords[] = [];

      // Check if user specified direction is reachable
      if (this.hoveredDirection !== HexDirection.NONE) {
        const neighbour = this.hexMap.getNeighbourInDirection(this.hoveredHex, this.hoveredDirection);
        if (neighbour) {
          if (neighbour.x === activeCreature.position.x && neighbour.y === activeCreature.position.y) {
            originHex = activeCreature.position;
            movePath = [activeCreature.position];
          } else {
            const path = this.battle.findPathFromSelectedUnitToCell(neighbour);
            if (path.length > 0 && !this.battle.getCreatureAtPosition(neighbour)) {
              originHex = neighbour;
              movePath = path;
            }
          }
        }
      }

      // If not determined via direction, look for closest / best reachable adjacent neighbour
      if (!originHex) {
        const isAdjacent = this.hexMap.getNeighbours(activeCreature.position).some(
          (n) => n.x === this.hoveredHex!.x && n.y === this.hoveredHex!.y
        );
        if (isAdjacent) {
          originHex = activeCreature.position;
          movePath = [activeCreature.position];
        } else {
          // Check all reachable neighbours of hoveredHex
          const neighbours = this.hexMap.getNeighbours(this.hoveredHex);
          let bestPath: Coords[] = [];
          for (const n of neighbours) {
            if (this.battle.getCreatureAtPosition(n)) continue;
            const path = this.battle.findPathFromSelectedUnitToCell(n);
            if (path.length > 0 && (bestPath.length === 0 || path.length < bestPath.length)) {
              bestPath = path;
              originHex = n;
            }
          }
          movePath = bestPath;
        }
      }

      if (originHex) {
        const attackPath = [...movePath, this.hoveredHex];
        return { hoverPath: movePath, attackPath, originHex, isRanged: false };
      } else {
        return { hoverPath: [], attackPath: [], originHex: null, isRanged: false };
      }
    } else {
      // Hovering over empty or friendly cell
      const hoverPath = this.battle.findPathFromSelectedUnitToCell(this.hoveredHex);
      return { hoverPath, attackPath: [], originHex: null, isRanged: false };
    }
  }

  private updateHoverVisuals(): void {
    if (!this.hoveredHex) {
      this.clearHoverState();
      return;
    }

    this.hexBoard.setHoverHex(this.hoveredHex);

    const activeCreature = this.battle.getActiveCreature();
    const targetCreature = this.battle.getCreatureAtPosition(this.hoveredHex);
    const renderUpdate = this.battle.nextRenderUpdate;

    // 1. Update cursor hint in HUD
    if (renderUpdate.cursorHint) {
      this.hud?.setCursor(renderUpdate.cursorHint);
    } else {
      this.hud?.setCursor('default');
    }

    const { hoverPath, originHex, isRanged } = this.computeAttackAndHoverPaths();

    // 2. Attack Preview & Flank Calculation
    if (
      activeCreature &&
      targetCreature &&
      targetCreature.indexOFArmy !== activeCreature.armyAlignment &&
      activeCreature.live_stats.remaining_attacks > 0 &&
      !activeCreature.isPanickedOrRouting &&
      activeCreature.exhaustionState !== ExhaustionState.DEPLETED
    ) {
      if (isRanged) {
        // Standard Ranged Attack Preview: target ring only, no origin hex or melee ground arrow
        const inRangedReach =
          (this.battle.rangereach_tiles[this.hoveredHex.x]?.[this.hoveredHex.y] ?? 0) > 0 ||
          (this.battle.rangereach_targets[this.hoveredHex.x]?.[this.hoveredHex.y] ?? 0) > 0;

        if (inRangedReach) {
          this.hexBoard.setAttackPreview(this.hoveredHex, null, HexFlankStatus.NONE);
          this.hexBoard.clearPathPreview();
          this.hud?.setCursor('attack_ranged');
        } else {
          this.hexBoard.clearAttackPreview();
          this.hexBoard.clearPathPreview();
          this.hud?.setCursor('default');
        }
        return;
      }

      // Melee Attack Preview
      if (originHex) {
        const attackFromDir = this.hexMap.getDirectionForNeighbour(originHex, this.hoveredHex);
        const flankStatus = checkFlankingStatus(targetCreature.creature.facingDirection, attackFromDir);
        this.hexBoard.setAttackPreview(this.hoveredHex, originHex, flankStatus);
        if (hoverPath.length > 1) {
          this.hexBoard.setPathPreview(hoverPath);
        } else {
          this.hexBoard.clearPathPreview();
        }
      } else {
        this.hexBoard.clearAttackPreview();
        this.hexBoard.clearPathPreview();
      }
    } else {
      this.hexBoard.clearAttackPreview();

      if (hoverPath.length > 1) {
        this.hexBoard.setPathPreview(hoverPath);
      } else {
        this.hexBoard.clearPathPreview();
      }
    }
  }

  private getStageCoords(clientX: number, clientY: number): Coords {
    if (!this.getStageInfo) return { x: clientX, y: clientY };
    const { offset, scale } = this.getStageInfo();
    const sx = scale.x || 1;
    const sy = scale.y || 1;
    return {
      x: (clientX - offset.x) / sx,
      y: (clientY - offset.y) / sy,
    };
  }

  private setupPointerEvents(container: HTMLElement): void {
    this.boundContextMenu = (e) => e.preventDefault();

    this.boundPointerDown = (e: PointerEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        return;
      }
      this.isPointerDown = true;
      this.pointerButton = e.button;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };

    this.boundPointerUp = (e: PointerEvent) => {
      this.isPointerDown = false;
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        return;
      }
      if (this.battle.isCurrentTurnAI()) return;

      // Right-click: Target for movement or attack
      if (e.button === 2 && this.hoveredHex) {
        this.battle.handleSecondaryCellAction(this.hoveredHex, this.hoveredDirection, e.ctrlKey);
        this.updateHoverVisuals();
      }
    };

    this.boundPointerMove = (e: PointerEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      this.hud?.updateCursorPosition(stageCoords);

      if (this.isPointerDown) {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;

        if (this.pointerButton === 1) {
          // Middle-click drag: Pan camera
          this.sceneManager.panCamera(-dx * 0.02, -dy * 0.02);
        }
        this.lastPointerPos = { x: e.clientX, y: e.clientY };
      }

      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        this.clearHoverState();
        return;
      }

      // Raycast hover hex
      const hits = this.sceneManager.raycastFromScreen(e.clientX, e.clientY, [this.hexBoard.group]);
      if (hits.length > 0) {
        const hitTile = hits.find((h) => (h.object as any).userData?.isHexTile);
        if (hitTile) {
          const { hexX, hexY } = (hitTile.object as any).userData;
          this.hoveredHex = { x: hexX, y: hexY };

          const centerWorld = this.hexBoard.hexToWorld(hexX, hexY);
          const dx = hitTile.point.x - centerWorld.x;
          const dz = hitTile.point.z - centerWorld.z;
          this.hoveredDirection = this.hexBoard.worldVectorToHexDirection(dx, dz);

          this.battle.onMouseOverCell(this.hoveredHex, this.hoveredDirection, e.ctrlKey);
          this.updateHoverVisuals();
          return;
        }
      }
      this.clearHoverState();
    };

    this.boundWheel = (e: WheelEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        return;
      }
      e.preventDefault();
      this.sceneManager.zoomCamera(e.deltaY * 0.012);
    };

    this.boundClick = (e: MouseEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        return;
      }
      if (this.battle.isCurrentTurnAI()) return;

      if (e.button === 0) {
        if (this.hoveredHex) {
          const creatureInBattle = this.battle.getCreatureAtPosition(this.hoveredHex);
          if (creatureInBattle && creatureInBattle.indexOFArmy !== this.battle.currentArmyIndex) {
            // Clicked an enemy squad: show secondary enemy stats panel
            this.hud?.showEnemyStats(creatureInBattle.creature);
          } else {
            // Clicked own squad or empty hex: close enemy stats panel
            this.hud?.hideEnemyStats();
            this.battle.handlePrimaryCellAction(this.hoveredHex, this.hoveredDirection);
          }
        } else {
          // Clicked outside of board
          this.hud?.hideEnemyStats();
        }
        this.updateHoverVisuals();
      }
    };

    container.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('click', this.boundClick);
  }

  public updateCameraKeyboardInput(deltaMS: number): void {
    if (this.pressedKeys.size === 0) return;

    const dt = deltaMS / 1000;
    const moveDist = this.cameraPanSpeed * dt;
    const rotateAngle = this.cameraRotateSpeed * dt;

    let panX = 0;
    let panZ = 0;
    let rotateYaw = 0;

    if (this.pressedKeys.has('w')) panZ -= moveDist;
    if (this.pressedKeys.has('s')) panZ += moveDist;
    if (this.pressedKeys.has('a')) panX -= moveDist;
    if (this.pressedKeys.has('d')) panX += moveDist;

    if (this.pressedKeys.has('q')) rotateYaw -= rotateAngle;
    if (this.pressedKeys.has('e')) rotateYaw += rotateAngle;

    if (panX !== 0 || panZ !== 0) {
      this.sceneManager.panCamera(panX, panZ);
    }
    if (rotateYaw !== 0) {
      this.sceneManager.rotateCamera(rotateYaw);
    }
  }

  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  public setKeyPressed(key: string, pressed: boolean): void {
    if (pressed) {
      this.pressedKeys.add(key.toLowerCase());
    } else {
      this.pressedKeys.delete(key.toLowerCase());
    }
  }

  public printPathPreview(): { hoverPath: Coords[]; attackPath: Coords[] } {
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
  }

  private setupKeyboardControls(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (e.key === 'Control' || e.ctrlKey) {
        this.isCtrlPressed = true;
        if (this.hoveredHex) {
          this.battle.onMouseOverCell(this.hoveredHex, this.hoveredDirection, true);
          this.updateHoverVisuals();
        }
      }

      // Continuous movement/rotation keys are tracked in pressedKeys for smooth frame-by-frame updates
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        this.pressedKeys.add(key);
        return;
      }

      // Single-input hotkeys (only trigger once on initial keydown, ignore OS auto-repeat)
      if (e.repeat) return;

      const printKey = (this.settings?.hotkeys?.printPathPreview ?? 'p').toLowerCase();
      const restKey = (this.settings?.hotkeys?.rest ?? 'r').toLowerCase();
      const nextTurnKey = (this.settings?.hotkeys?.nextTurn ?? ' ').toLowerCase();
      const nextUnitKey = (this.settings?.hotkeys?.nextUnit ?? 'tab').toLowerCase();
      const resetCamKey = (this.settings?.hotkeys?.resetCamera ?? 'home').toLowerCase();
      const toggleStatsKey = (this.settings?.hotkeys?.toggleStats ?? 'f4').toLowerCase();

      if (key === printKey) {
        this.printPathPreview();
      } else if (key === restKey) {
        if (this.events?.onRest) this.events.onRest();
      } else if (key === nextTurnKey || (nextTurnKey === ' ' && (key === ' ' || key === 'enter'))) {
        if (this.events?.onNextTurn) this.events.onNextTurn();
      } else if (key === nextUnitKey) {
        e.preventDefault();
        if (this.events?.onNextUnit) this.events.onNextUnit();
      } else if (key === resetCamKey) {
        this.sceneManager.resetCamera();
      } else if (key === toggleStatsKey || key === 'f4') {
        e.preventDefault();
        if (this.events?.onToggleStats) {
          this.events.onToggleStats();
        } else if (this.hud?.toggleUnitStats) {
          this.hud.toggleUnitStats();
        }
      }
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.pressedKeys.delete(key);

      if (e.key === 'Control' || !e.ctrlKey) {
        this.isCtrlPressed = false;
        if (this.hoveredHex) {
          this.battle.onMouseOverCell(this.hoveredHex, this.hoveredDirection, false);
          this.updateHoverVisuals();
        }
      }
    };

    this.boundBlur = () => {
      this.pressedKeys.clear();
      this.isCtrlPressed = false;
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public destroy(): void {
    if (this.boundContextMenu) window.removeEventListener('contextmenu', this.boundContextMenu);
    if (this.boundPointerDown) window.removeEventListener('pointerdown', this.boundPointerDown);
    if (this.boundPointerUp) window.removeEventListener('pointerup', this.boundPointerUp);
    if (this.boundPointerMove) window.removeEventListener('pointermove', this.boundPointerMove);
    if (this.boundWheel) window.removeEventListener('wheel', this.boundWheel);
    if (this.boundClick) window.removeEventListener('click', this.boundClick);
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) window.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundBlur) window.removeEventListener('blur', this.boundBlur);
    this.pressedKeys.clear();

    this.squadVisuals.forEach((s) => s.dispose());
    this.hexBoard.dispose();
    this.projectileSystem.dispose();
    this.sceneDebugger?.dispose();
    this.sceneManager.dispose();
  }
}
