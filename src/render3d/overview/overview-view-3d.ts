import * as THREE from 'three';
import { BattleSettings } from '../../battle/settings';
import { OverviewAmbientAudio } from '../../overview/overview-ambient-audio';
import { OverviewCampaign } from '../../overview/overview-campaign';
import { Coords } from '../../shared';
import { ThreeSceneDebugger } from '../debug/three-scene-debugger';
import { ThreeRendererHost } from '../three-renderer-host';
import { ThreeSceneManager } from '../three-scene-manager';
import { setUnitRimLightingEnabled, isUnitRimLightingEnabled } from '../units/unit-rim-lighting';
import { OverviewBoard3D } from './overview-board-3d';

export interface OverviewView3DCallbacks {
  onSelectHex?: (coords: Coords) => void;
  onSelectSettlement?: (regionId: string) => void;
  onMoveArmy?: (armyId: string, targetCoords: Coords) => void;
  onHoverRegion?: (regionId: string | null) => void;
  onPointerMove?: (stageCoords: Coords) => void;
  getStageInfo?: () => { offset: Coords; scale: Coords };
  isMenuBlockingInput?: () => boolean;
}

export class OverviewView3D {
  public readonly sceneManager: ThreeSceneManager;
  public readonly board: OverviewBoard3D;
  public readonly settings: BattleSettings;
  public readonly ambientAudio: OverviewAmbientAudio;
  public readonly sceneDebugger?: ThreeSceneDebugger;
  public selectedArmyId: string | null = null;
  public cameraPanSpeed: number = 16.0;
  public cameraRotateSpeed: number = 2.2;

  private isPointerDown = false;
  private isDragging = false;
  private pointerDownPos: Coords = { x: 0, y: 0 };
  private lastPointerPos: Coords = { x: 0, y: 0 };
  private pointerButton = 0;
  private pressedKeys: Set<string> = new Set();
  private lastHoveredHexKey: string | null = null;

  private boundPointerDown?: (e: PointerEvent) => void;
  private boundPointerMove?: (e: PointerEvent) => void;
  private boundPointerUp?: (e: PointerEvent) => void;
  private boundWheel?: (e: WheelEvent) => void;
  private boundContextMenu?: (e: MouseEvent) => void;
  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundKeyUp?: (e: KeyboardEvent) => void;
  private boundBlur?: () => void;

  constructor(
    private readonly container: HTMLElement,
    private readonly campaign: OverviewCampaign,
    private readonly callbacks: OverviewView3DCallbacks = {},
    sharedRendererHost?: ThreeRendererHost,
    settings?: BattleSettings
  ) {
    this.settings = settings ?? new BattleSettings();
    this.sceneManager = new ThreeSceneManager(container, sharedRendererHost, {
      enableWeather: false,
      internalResolutionScaling: this.settings.internalResolutionScaling,
    });
    this.board = new OverviewBoard3D(campaign);
    this.sceneManager.scene.add(this.board.group);
    this.sceneManager.setCameraTarget(new THREE.Vector3(0, 0, 0));
    void this.board.loadTerrainAssets('textures/terrain/');
    this.ambientAudio = new OverviewAmbientAudio(campaign, this.settings);
    void this.ambientAudio.init();

    this.sceneManager.setTiltShiftEnabled(this.settings.tiltShift ?? true);
    setUnitRimLightingEnabled(this.settings.unitRimLighting ?? true);
    this.board.setSimpleTreesEnabled(this.settings.simpleTrees ?? false);
    this.board.setGridVisible(this.settings.hex.showGrid ?? true);
    this.board.setCoordsVisible(this.settings.debug.showCoords ?? false);
    this.applyHardwareCursorVisibility(this.settings.hideHardwareCursor ?? false);

    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      this.sceneDebugger = new ThreeSceneDebugger(this.sceneManager, this as any, {
        autoOpen: this.settings.debug.showSceneInspector ?? false,
      });
    }

    this.attachInputListeners();
  }

  private getStageCoords(clientX: number, clientY: number): Coords {
    if (!this.callbacks.getStageInfo) return { x: clientX, y: clientY };
    const { offset, scale } = this.callbacks.getStageInfo();
    const sx = scale.x || 1;
    const sy = scale.y || 1;
    return {
      x: (clientX - offset.x) / sx,
      y: (clientY - offset.y) / sy,
    };
  }

  private attachInputListeners(): void {
    if (typeof window === 'undefined' || !this.container?.addEventListener) return;

    this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
    this.boundPointerDown = (e: PointerEvent) => {
      if (this.callbacks.isMenuBlockingInput?.()) return;
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerButton = e.button;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };
    this.boundPointerMove = (e: PointerEvent) => {
      const stageCoords = this.getStageCoords(e.clientX, e.clientY);
      this.callbacks.onPointerMove?.(stageCoords);

      if (this.callbacks.isMenuBlockingInput?.()) {
        this.isPointerDown = false;
        this.isDragging = false;
        return;
      }

      if (!this.isPointerDown) {
        if (typeof this.sceneManager.canvas?.getBoundingClientRect === 'function') {
          const hits = this.sceneManager.raycastFromScreen(
            e.clientX,
            e.clientY,
            this.board.tileMeshes
          );
          const hit = hits[0];
          const hitCoords =
            (hit?.object?.userData?.coords as Coords | undefined) ??
            (hit ? this.board.worldToHex(hit.point) : null);
          this.hoverAtHex(hitCoords ?? null);
        }
        return;
      }
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      if (
        Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y) > 6
      ) {
        this.isDragging = true;
      }
      if (this.isDragging) {
        if (this.pointerButton === 2 || e.ctrlKey) {
          this.sceneManager.rotateCamera(-dx * 0.006, -dy * 0.006);
        } else {
          this.sceneManager.panCamera(-dx * 0.02, -dy * 0.02);
        }
      }
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };
    this.boundPointerUp = (e: PointerEvent) => {
      if (this.callbacks.isMenuBlockingInput?.()) {
        this.isPointerDown = false;
        this.isDragging = false;
        return;
      }
      const wasDragging = this.isDragging;
      this.isPointerDown = false;
      this.isDragging = false;
      if (!wasDragging && (e.button === 0 || e.button === 2)) {
        this.handleHexClick(e.clientX, e.clientY, e.button);
      }
    };
    this.boundWheel = (e: WheelEvent) => {
      if (this.callbacks.isMenuBlockingInput?.()) return;
      this.sceneManager.zoomCamera(e.deltaY * 0.01);
    };

    this.boundKeyDown = (e: KeyboardEvent) => {
      if (this.callbacks.isMenuBlockingInput?.()) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        this.pressedKeys.add(key);
      }
    };
    this.boundKeyUp = (e: KeyboardEvent) => {
      this.pressedKeys.delete(e.key.toLowerCase());
    };
    this.boundBlur = () => {
      this.pressedKeys.clear();
    };

    this.container.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('wheel', this.boundWheel, { passive: true });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public handleHexClick(clientX: number, clientY: number, button: number = 0): void {
    if (this.callbacks.isMenuBlockingInput?.()) return;
    const hits = this.sceneManager.raycastFromScreen(
      clientX,
      clientY,
      this.board.tileMeshes,
      false
    );
    if (hits.length === 0) return;
    const hit = hits[0];
    const coords =
      (hit.object.userData?.coords as Coords | undefined) ??
      this.board.worldToHex(hit.point);
    if (!coords) return;

    this.selectOrMoveAtHex(coords, button);
  }

  public hoverAtHex(coords: Coords | null): void {
    const hoveredHex = coords ? this.campaign.getHex(coords) : null;
    const isVisibleHex = Boolean(
      coords && this.campaign.getVisibleHexKeys().has(`${coords.x},${coords.y}`)
    );
    const hoveredRegionId = isVisibleHex ? (hoveredHex?.regionId ?? null) : null;
    this.board.setHoveredRegion(hoveredRegionId);
    this.callbacks.onHoverRegion?.(hoveredRegionId);

    const key = coords ? `${coords.x},${coords.y}` : null;
    if (key === this.lastHoveredHexKey) return;
    this.lastHoveredHexKey = key;

    if (!this.selectedArmyId || !coords) {
      this.board.setMovePath([]);
      return;
    }

    const path = this.campaign.getPathToHex(this.selectedArmyId, coords);
    this.board.setMovePath(path);
  }

  public selectAtHex(coords: Coords): void {
    this.lastHoveredHexKey = null;
    this.board.setMovePath([]);

    // 1. Check if a player army is on this hex
    const army = this.campaign.getArmyAt(coords);
    if (army && army.ownerPlayerId === 'player') {
      this.selectedArmyId = army.id;
      const reachable = this.campaign.getReachableHexes(army.id);
      this.board.setReachableHexes(reachable.keys());
      this.callbacks.onSelectHex?.(coords);
      return;
    }

    // 2. Otherwise, clear army selection and notify hex selection (for settlement/building/neutral army panel)
    this.selectedArmyId = null;
    this.board.setReachableHexes([]);
    this.callbacks.onSelectHex?.(coords);
  }

  public moveSelectedArmyToHex(coords: Coords): void {
    if (!this.selectedArmyId) return;
    const reachable = this.campaign.getReachableHexes(this.selectedArmyId);
    const key = `${coords.x},${coords.y}`;
    if (reachable.has(key)) {
      const movingId = this.selectedArmyId;
      this.selectedArmyId = null;
      this.lastHoveredHexKey = null;
      this.board.setMovePath([]);
      this.board.setReachableHexes([]);
      this.callbacks.onMoveArmy?.(movingId, coords);
    }
  }

  public selectOrMoveAtHex(coords: Coords, button: number = 0): void {
    if (button === 2) {
      this.moveSelectedArmyToHex(coords);
    } else {
      this.selectAtHex(coords);
    }
  }

  public setRimLightingEnabled(enabled: boolean): void {
    this.settings.unitRimLighting = enabled;
    this.settings.save();
    setUnitRimLightingEnabled(enabled);
  }

  public isRimLightingEnabled(): boolean {
    return isUnitRimLightingEnabled();
  }

  public setTiltShiftEnabled(enabled: boolean): void {
    this.settings.tiltShift = enabled;
    this.settings.save();
    this.sceneManager.setTiltShiftEnabled(enabled);
  }

  public setInternalResolutionScaling(scaling: number): void {
    this.settings.setInternalResolutionScaling(scaling);
    this.settings.save();
    this.sceneManager.setInternalResolutionScaling(this.settings.internalResolutionScaling);
  }

  public isTiltShiftEnabled(): boolean {
    return this.sceneManager.isTiltShiftEnabled();
  }

  public setSimpleTreesEnabled(enabled: boolean): void {
    this.settings.simpleTrees = enabled;
    this.settings.save();
    this.board.setSimpleTreesEnabled(enabled);
  }

  public isSimpleTreesEnabled(): boolean {
    return this.board.isSimpleTreesEnabled();
  }

  public setGridVisible(visible: boolean): void {
    this.board.setGridVisible(visible);
    this.settings.hex.showGrid = visible;
    this.settings.save();
  }

  public setCoordsVisible(visible: boolean): void {
    this.board.setCoordsVisible(visible);
    this.settings.debug.showCoords = visible;
    this.settings.save();
  }

  public setOverviewAnimationSpeed(speed: number): void {
    this.settings.setOverviewAnimationSpeed(speed);
    this.settings.save();
  }

  public getOverviewAnimationSpeedMultiplier(): number {
    return this.settings.getOverviewAnimationSpeedMultiplier();
  }

  public toggleSceneInspector(): boolean {
    this.sceneDebugger?.toggle();
    const visible = this.sceneDebugger?.isVisible() ?? false;
    this.settings.debug.showSceneInspector = visible;
    this.settings.save();
    return visible;
  }

  public applyHardwareCursorVisibility(hidden: boolean): void {
    const gameContainer =
      (typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById('game')
        : null) || this.container;
    if (gameContainer && gameContainer.style) {
      if (hidden) {
        gameContainer.classList?.add('hide-hardware-cursor');
        gameContainer.style.cursor = 'none';
      } else {
        gameContainer.classList?.remove('hide-hardware-cursor');
        gameContainer.style.cursor = 'auto';
      }
    }
  }

  public syncAll(): void {
    this.board.rebuildLandmarks();
    this.board.rebuildSettlementLabels();
    this.board.syncArmies();
    if (this.selectedArmyId) {
      const reachable = this.campaign.getReachableHexes(this.selectedArmyId);
      this.board.setReachableHexes(reachable.keys());
    }
  }

  public animateArmyAlongPath(
    armyId: string,
    path: Coords[],
    options?: {
      msPerHex?: number;
      onStep?: (coords: Coords, stepIndex: number) => void;
      onComplete?: () => void;
    }
  ): boolean {
    const speedMult = this.settings.getOverviewAnimationSpeedMultiplier?.() ?? 1;
    const baseMsPerHex = options?.msPerHex ?? 360;
    this.board.setMovePath([]);
    this.board.setReachableHexes([]);
    return this.board.animateArmyAlongPath(armyId, path, {
      msPerHex: Math.max(80, baseMsPerHex / Math.max(0.25, speedMult)),
      onStep: options?.onStep,
      onComplete: options?.onComplete,
    });
  }

  public setKeyPressed(key: string, pressed: boolean): void {
    if (pressed) {
      this.pressedKeys.add(key.toLowerCase());
    } else {
      this.pressedKeys.delete(key.toLowerCase());
    }
  }

  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  public updateCameraKeyboardInput(deltaMS: number): void {
    if (this.callbacks.isMenuBlockingInput?.()) {
      this.pressedKeys.clear();
      return;
    }
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

  public update(deltaMS: number): void {
    this.updateCameraKeyboardInput(deltaMS);
    this.board.update(deltaMS, this.sceneManager.camera.position);
    const camCfg = this.sceneManager.getCameraConfig();
    const centerHex = this.board.worldToHex(this.sceneManager.getCameraTarget());
    this.ambientAudio.update(
      deltaMS,
      centerHex,
      this.sceneManager.getCameraDistance(),
      camCfg.minDistance,
      camCfg.maxDistance
    );
    this.sceneManager.render();
  }

  public resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
  }

  public destroy(): void {
    this.ambientAudio.destroy();
    this.sceneDebugger?.dispose();
    if (this.boundContextMenu) {
      this.container?.removeEventListener('contextmenu', this.boundContextMenu);
    }
    if (typeof window !== 'undefined') {
      if (this.boundPointerDown) window.removeEventListener('pointerdown', this.boundPointerDown);
      if (this.boundPointerMove) window.removeEventListener('pointermove', this.boundPointerMove);
      if (this.boundPointerUp) window.removeEventListener('pointerup', this.boundPointerUp);
      if (this.boundWheel) window.removeEventListener('wheel', this.boundWheel);
      if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
      if (this.boundKeyUp) window.removeEventListener('keyup', this.boundKeyUp);
      if (this.boundBlur) window.removeEventListener('blur', this.boundBlur);
    }
    this.pressedKeys.clear();
    this.board.dispose();
    this.sceneManager.dispose();
  }
}
