import { sound } from '@pixi/sound';
import { Battle, MapRenderUpdate } from '../battle';
import { HexFlankStatus, HexMap } from '../shared/hex-map';
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

export interface BattleView3DEvents {
  onNextTurn: () => void;
  onNextUnit: () => void;
  onReset: () => void;
  onRest: () => void;
  onActiveAbility1?: () => void;
}

export class BattleView3D {
  public readonly sceneManager: ThreeSceneManager;
  public readonly hexBoard: HexBoard3D;
  public readonly projectileSystem: ProjectileSystem3D = new ProjectileSystem3D();
  public readonly visualFactory: UnitVisualFactory;

  private squadVisuals: Map<string, SquadVisual3D> = new Map();
  private hexMap: HexMap;
  private battle: Battle;
  private settings: BattleSettings;

  // Interaction & Input State
  private hoveredHex: Coords | null = null;
  private isPointerDown: boolean = false;
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

  public setZoomLevel(normalized: number): void {
    this.sceneManager.setZoomLevel(normalized);
  }

  public async loadAllAssets(): Promise<void> {
    await Promise.all([
      this.visualFactory.loadCatalogAssets('units_80x160.png', 'unitsspritesheet.json'),
      this.hexBoard.loadTerrainAssets('hex_terrain.png', 'hex_terrain.json'),
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
      // 3D Parabolic Ballistic Projectile Volley!
      const sourcePos = attackerSquad
        ? attackerSquad.rootGroup.position.clone()
        : this.hexBoard.hexToWorld(attacker.position.x, attacker.position.y);
      const targetPos = defenderSquad
        ? defenderSquad.rootGroup.position.clone()
        : this.hexBoard.hexToWorld(defender.position.x, defender.position.y);

      if (attackerSquad) {
        attackerSquad.playAnimation('attack_ranged', 400);
      }

      if (this.settings.sound.soundOn) {
        sound.play('arrow', { volume: this.settings.sound.soundVolume });
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

      if (this.settings.sound.soundOn) {
        sound.play('sword', { volume: this.settings.sound.soundVolume });
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

      if (this.settings.sound.soundOn && !defenderSquad.creature.isAlive) {
        sound.play('die', { volume: this.settings.sound.soundVolume });
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
    // 1. Process battle engine actions and updates
    const mapUpdate: MapRenderUpdate = this.battle.update(deltaMS);

    if (mapUpdate.somethingChanged || mapUpdate.unitRenderUpdate) {
      // Sync unit positions and alive counts
      this.squadVisuals.forEach((squad, guidStr) => {
        const creature = this.battle.creatures.find((c) => c.GUID.toString() === guidStr);
        if (creature) {
          if (!creature.isAlive && squad.creature.aliveModelCount === 0) {
            squad.updateStats();
          } else {
            const worldPos = this.hexBoard.hexToWorld(creature.position.x, creature.position.y);
            squad.rootGroup.position.copy(worldPos);
            squad.setFacing(creature.facingDirection);
            squad.updateStats();
          }
        }
      });
      this.updateActiveUnitSelection();
    }

    // 2. Update 3D squads (overhead bars, animations, floating text)
    this.squadVisuals.forEach((squad) => squad.update(deltaMS, this.sceneManager.camera));

    // 3. Update 3D projectiles
    this.projectileSystem.update(deltaMS);

    // 4. Render 3D scene
    this.sceneManager.render();
  }

  public resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
  }

  public resetGridAndTerrain(): void {
    this.syncAllSquads();
    this.sceneManager.resetCamera();
  }

  public showTurnBanner(_turnNum: number, _armyIdx: number): void {
    this.updateActiveUnitSelection();
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

    this.boundPointerUp = () => {
      this.isPointerDown = false;
    };

    this.boundPointerMove = (e: PointerEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      this.hud?.updateCursorPosition(stageCoords);

      if (this.isPointerDown) {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;

        if (this.pointerButton === 2) {
          // Right-click drag: Orbit camera
          this.sceneManager.rotateCamera(-dx * 0.008, -dy * 0.006);
        } else if (this.pointerButton === 1) {
          // Middle-click drag: Pan camera
          this.sceneManager.panCamera(-dx * 0.02, -dy * 0.02);
        }
        this.lastPointerPos = { x: e.clientX, y: e.clientY };
      }

      if (this.hud?.isPointerOverUI(stageCoords.x, stageCoords.y)) {
        this.hoveredHex = null;
        this.hexBoard.setHoverHex(null);
        return;
      }

      // Raycast hover hex
      const hits = this.sceneManager.raycastFromScreen(e.clientX, e.clientY, [this.hexBoard.group]);
      if (hits.length > 0) {
        const hitTile = hits.find((h) => (h.object as any).userData?.isHexTile);
        if (hitTile) {
          const { hexX, hexY } = (hitTile.object as any).userData;
          this.hoveredHex = { x: hexX, y: hexY };
          this.hexBoard.setHoverHex(this.hoveredHex);
          return;
        }
      }
      this.hoveredHex = null;
      this.hexBoard.setHoverHex(null);
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

      if (e.button === 0 && this.hoveredHex) {
        this.battle.handlePrimaryCellAction(this.hoveredHex);
      }
    };

    container.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('click', this.boundClick);
  }

  private setupKeyboardControls(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'q':
          this.sceneManager.rotateCamera(-0.1);
          break;
        case 'e':
          this.sceneManager.rotateCamera(0.1);
          break;
        case 'w':
          this.sceneManager.panCamera(0, -0.5);
          break;
        case 's':
          this.sceneManager.panCamera(0, 0.5);
          break;
        case 'a':
          this.sceneManager.panCamera(-0.5, 0);
          break;
        case 'd':
          this.sceneManager.panCamera(0.5, 0);
          break;
        case 'r':
          if (this.events?.onRest) this.events.onRest();
          break;
        case ' ':
        case 'enter':
          if (this.events?.onNextTurn) this.events.onNextTurn();
          break;
        case 'tab':
          e.preventDefault();
          if (this.events?.onNextUnit) this.events.onNextUnit();
          break;
        case 'home':
          this.sceneManager.resetCamera();
          break;
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);
  }

  public destroy(): void {
    if (this.boundContextMenu) window.removeEventListener('contextmenu', this.boundContextMenu);
    if (this.boundPointerDown) window.removeEventListener('pointerdown', this.boundPointerDown);
    if (this.boundPointerUp) window.removeEventListener('pointerup', this.boundPointerUp);
    if (this.boundPointerMove) window.removeEventListener('pointermove', this.boundPointerMove);
    if (this.boundWheel) window.removeEventListener('wheel', this.boundWheel);
    if (this.boundClick) window.removeEventListener('click', this.boundClick);
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);

    this.squadVisuals.forEach((s) => s.dispose());
    this.hexBoard.dispose();
    this.projectileSystem.dispose();
    this.sceneManager.dispose();
  }
}
