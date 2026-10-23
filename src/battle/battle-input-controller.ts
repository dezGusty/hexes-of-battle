import { Coords } from '../shared';
import { HexDirection, HexMap } from '../shared/hex-map';
import { HexViewportCamera } from '../shared/hex-viewport-camera';
import { Battle } from '../battle';

export interface BattleInputDelegate {
  isMenuBlockingInput: () => boolean;
  onCursorMove: (stageCoords: Coords) => void;
  onClearHover: () => void;
  getCamera: () => HexViewportCamera;
  getStageOffsetAndScale: () => { offset: Coords; scale: Coords };
  getScreenSize: () => { width: number; height: number };
  onToggleStats?: () => void;
  onToggleHardwareCursor?: () => void;
}

export class BattleInputController {
  private controlPressed: boolean = false;
  private mouseDragCoords: Coords = { x: 0, y: 0 };
  private mouseRightClickCoords: Coords = { x: 0, y: 0 };

  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundKeyUp?: (e: KeyboardEvent) => void;
  private boundWheel?: (e: WheelEvent) => void;
  private boundMouseDown?: (e: MouseEvent) => void;
  private boundMouseUp?: (e: MouseEvent) => void;
  private boundClick?: (e: MouseEvent) => void;
  private boundMouseMove?: (e: MouseEvent) => void;

  constructor(
    private battle: Battle,
    private hexMap: HexMap,
    private delegate: BattleInputDelegate
  ) {}

  public attach(): void {
    this.boundKeyDown = (event: KeyboardEvent) => {
      const camera = this.delegate.getCamera();
      if (event.code === 'ArrowUp') {
        camera.panBy({ x: 0, y: -10 });
      } else if (event.code === 'ArrowDown') {
        camera.panBy({ x: 0, y: 10 });
      } else if (event.code === 'ArrowLeft') {
        camera.panBy({ x: 0 - 10, y: 0 });
      } else if (event.code === 'ArrowRight') {
        camera.panBy({ x: 10, y: 0 });
      } else if (event.code === 'Equal') {
        camera.zoomBy(camera.zoomStep);
      } else if (event.code === 'Minus') {
        camera.zoomBy(-camera.zoomStep);
      } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.controlPressed = true;
      } else if (event.key === 'F4' || event.code === 'F4' || event.key?.toLowerCase() === 'f4') {
        event.preventDefault();
        this.delegate.onToggleStats?.();
      } else if (event.key === 'F8' || event.code === 'F8' || event.key?.toLowerCase() === 'f8') {
        event.preventDefault();
        this.delegate.onToggleHardwareCursor?.();
      }
    };

    this.boundKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.controlPressed = false;
      } else if (event.code === 'KeyE') {
        this.battle.nextTurn();
        this.battle.selectNextUnitAndGetIndex();
      } else if (event.code === 'KeyN') {
        this.battle.selectNextUnitAndGetIndex();
      }
    };

    this.boundWheel = (event: WheelEvent) => {
      const screenSize = this.delegate.getScreenSize();
      const camera = this.delegate.getCamera();
      const ratio: Coords = {
        x: event.clientX / screenSize.width,
        y: event.clientY / screenSize.height,
      };
      if (event.deltaY < 0) {
        camera.zoomBy(0.1, ratio);
      } else {
        camera.zoomBy(-0.1, ratio);
      }
    };

    this.boundMouseDown = (event: MouseEvent) => {
      if (event.button === 1) {
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
      }
      if (event.button === 2) {
        this.mouseRightClickCoords = { x: event.clientX, y: event.clientY };
      }
    };

    this.boundMouseUp = (event: MouseEvent) => {
      if (event.button === 1) {
        this.mouseDragCoords = { x: 0, y: 0 };
      }
      if (this.delegate.isMenuBlockingInput()) {
        return;
      }

      if (event.button === 2 && this.mouseRightClickCoords.x > 0 && this.mouseRightClickCoords.y > 0) {
        const hexInfo = this.screenToHex(event.clientX, event.clientY);
        if (this.isHexInBounds(hexInfo.cell)) {
          this.battle.handleSecondaryCellAction(hexInfo.cell, hexInfo.direction, this.controlPressed);
        }
        this.mouseRightClickCoords = { x: 0, y: 0 };
      }
    };

    this.boundClick = (event: MouseEvent) => {
      if (this.delegate.isMenuBlockingInput()) {
        return;
      }

      const hexInfo = this.screenToHex(event.clientX, event.clientY);
      if (this.isHexInBounds(hexInfo.cell)) {
        this.battle.handlePrimaryCellAction(hexInfo.cell, hexInfo.direction);
      }
    };

    this.boundMouseMove = (event: MouseEvent) => {
      if (this.delegate.isMenuBlockingInput()) {
        return;
      }

      const camera = this.delegate.getCamera();

      if (this.mouseDragCoords.x > 0 && this.mouseDragCoords.y > 0) {
        const deltaX = event.clientX - this.mouseDragCoords.x;
        const deltaY = event.clientY - this.mouseDragCoords.y;
        camera.panBy({ x: deltaX, y: deltaY });
        this.mouseDragCoords = { x: event.clientX, y: event.clientY };
        return;
      }

      const stageInfo = this.delegate.getStageOffsetAndScale();
      const stageCoords = camera.screenToStageCoords(
        { x: event.clientX, y: event.clientY },
        stageInfo.offset,
        stageInfo.scale
      );
      this.delegate.onCursorMove(stageCoords);

      const worldCoords = camera.stageToWorldCoords(stageCoords);
      const hexInfo = this.hexMap.pixelToHexWithDirectionalDetail(worldCoords.x, worldCoords.y);
      if (this.isHexInBounds(hexInfo.cell)) {
        this.battle.onMouseOverCell(hexInfo.cell, hexInfo.direction, this.controlPressed);
      } else {
        this.delegate.onClearHover();
      }
    };

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('wheel', this.boundWheel);
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('click', this.boundClick);
    document.addEventListener('mousemove', this.boundMouseMove);
  }

  public detach(): void {
    if (this.boundKeyDown) document.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) document.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundWheel) document.removeEventListener('wheel', this.boundWheel);
    if (this.boundMouseDown) document.removeEventListener('mousedown', this.boundMouseDown);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.boundClick) document.removeEventListener('click', this.boundClick);
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
  }

  private screenToHex(screenX: number, screenY: number): { cell: Coords; direction: HexDirection } {
    const camera = this.delegate.getCamera();
    const stageInfo = this.delegate.getStageOffsetAndScale();
    const worldCoords = camera.screenToWorldCoords(
      { x: screenX, y: screenY },
      stageInfo.offset,
      stageInfo.scale
    );
    return this.hexMap.pixelToHexWithDirectionalDetail(worldCoords.x, worldCoords.y);
  }

  private isHexInBounds(cell: Coords): boolean {
    return cell.x >= 0 && cell.x < this.hexMap.width && cell.y >= 0 && cell.y < this.hexMap.height;
  }
}
