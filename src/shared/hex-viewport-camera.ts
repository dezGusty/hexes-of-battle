import { Container } from 'pixi.js';
import { Coords } from '../shared';

export interface ViewportCameraConfig {
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  initialZoom: number;
  panOffsetMin: Coords;
  panOffsetMax: Coords;
  initialPanOffset: Coords;
}

export class HexViewportCamera {
  public zoomLevel: number;
  public panOffset: Coords;

  constructor(
    private targetContainer: Container,
    private config: ViewportCameraConfig
  ) {
    this.zoomLevel = config.initialZoom;
    this.panOffset = { ...config.initialPanOffset };
    this.applyTransform();
  }

  public get zoomMin(): number {
    return this.config.zoomMin;
  }

  public get zoomMax(): number {
    return this.config.zoomMax;
  }

  public get zoomStep(): number {
    return this.config.zoomStep;
  }

  public setZoom(newZoom: number, focalRatio: Coords = { x: 0.5, y: 0.5 }): void {
    const oldWidth = this.targetContainer.width;
    const oldHeight = this.targetContainer.height;

    this.zoomLevel = Math.max(this.config.zoomMin, Math.min(this.config.zoomMax, newZoom));
    this.targetContainer.scale.set(this.zoomLevel, this.zoomLevel);

    const deltaX = (oldWidth - this.targetContainer.width) * focalRatio.x;
    const deltaY = (oldHeight - this.targetContainer.height) * focalRatio.y;

    this.setPanOffset({
      x: this.panOffset.x + deltaX,
      y: this.panOffset.y + deltaY,
    });
  }

  public zoomBy(delta: number, focalRatio: Coords = { x: 0.5, y: 0.5 }): void {
    this.setZoom(this.zoomLevel + delta, focalRatio);
  }

  public setPanOffset(offset: Coords): void {
    this.panOffset.x = Math.max(this.config.panOffsetMin.x, Math.min(this.config.panOffsetMax.x, offset.x));
    this.panOffset.y = Math.max(this.config.panOffsetMin.y, Math.min(this.config.panOffsetMax.y, offset.y));
    this.targetContainer.position.copyFrom(this.panOffset);
  }

  public panBy(delta: Coords): void {
    this.setPanOffset({
      x: this.panOffset.x + delta.x,
      y: this.panOffset.y + delta.y,
    });
  }

  public applyTransform(): void {
    this.targetContainer.scale.set(this.zoomLevel, this.zoomLevel);
    this.setPanOffset(this.panOffset);
  }

  /**
   * Convert from screen client pixel coordinates (e.g. from mouse/touch event)
   * to stage/letterbox container coordinates.
   */
  public screenToStageCoords(screenCoords: Coords, stageOffset: Coords, stageScale: Coords): Coords {
    return {
      x: (screenCoords.x - stageOffset.x) / stageScale.x,
      y: (screenCoords.y - stageOffset.y) / stageScale.y,
    };
  }

  /**
   * Convert from stage/letterbox container coordinates into the camera's world space
   * (accounting for camera pan offset and zoom scale).
   */
  public stageToWorldCoords(stageCoords: Coords): Coords {
    return {
      x: (stageCoords.x - this.panOffset.x) / this.zoomLevel,
      y: (stageCoords.y - this.panOffset.y) / this.zoomLevel,
    };
  }

  /**
   * Convert screen coordinates directly to camera world space.
   */
  public screenToWorldCoords(screenCoords: Coords, stageOffset: Coords, stageScale: Coords): Coords {
    const stageCoords = this.screenToStageCoords(screenCoords, stageOffset, stageScale);
    return this.stageToWorldCoords(stageCoords);
  }
}
