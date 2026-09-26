import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { HexViewportCamera } from './hex-viewport-camera';

describe('HexViewportCamera', () => {
  it('should initialize with provided config and apply initial zoom and pan', () => {
    const container = new Container();
    const camera = new HexViewportCamera(container, {
      zoomMin: 0.5,
      zoomMax: 2.5,
      zoomStep: 0.1,
      initialZoom: 1.5,
      panOffsetMin: { x: -500, y: -500 },
      panOffsetMax: { x: 500, y: 500 },
      initialPanOffset: { x: 50, y: -50 },
    });

    expect(camera.zoomLevel).toBe(1.5);
    expect(camera.panOffset).toEqual({ x: 50, y: -50 });
    expect(container.scale.x).toBe(1.5);
    expect(container.scale.y).toBe(1.5);
    expect(container.position.x).toBe(50);
    expect(container.position.y).toBe(-50);
  });

  it('should clamp zoom within limits', () => {
    const container = new Container();
    const camera = new HexViewportCamera(container, {
      zoomMin: 0.8,
      zoomMax: 2.0,
      zoomStep: 0.1,
      initialZoom: 1.0,
      panOffsetMin: { x: -500, y: -500 },
      panOffsetMax: { x: 500, y: 500 },
      initialPanOffset: { x: 0, y: 0 },
    });

    camera.setZoom(0.2);
    expect(camera.zoomLevel).toBe(0.8);

    camera.setZoom(3.5);
    expect(camera.zoomLevel).toBe(2.0);
  });

  it('should clamp pan offset within bounds', () => {
    const container = new Container();
    const camera = new HexViewportCamera(container, {
      zoomMin: 0.5,
      zoomMax: 2.0,
      zoomStep: 0.1,
      initialZoom: 1.0,
      panOffsetMin: { x: -200, y: -100 },
      panOffsetMax: { x: 300, y: 400 },
      initialPanOffset: { x: 0, y: 0 },
    });

    camera.setPanOffset({ x: -999, y: 999 });
    expect(camera.panOffset).toEqual({ x: -200, y: 400 });

    camera.panBy({ x: 100, y: -200 });
    expect(camera.panOffset).toEqual({ x: -100, y: 200 });
  });

  it('should accurately transform screen coordinates to stage and world coordinates', () => {
    const container = new Container();
    const camera = new HexViewportCamera(container, {
      zoomMin: 0.5,
      zoomMax: 2.0,
      zoomStep: 0.1,
      initialZoom: 2.0,
      panOffsetMin: { x: -1000, y: -1000 },
      panOffsetMax: { x: 1000, y: 1000 },
      initialPanOffset: { x: 100, y: 50 },
    });

    const stageOffset = { x: 40, y: 20 };
    const stageScale = { x: 0.5, y: 0.5 };

    const screenPoint = { x: 140, y: 120 };

    // Stage coords = (140 - 40) / 0.5 = 200, (120 - 20) / 0.5 = 200
    const stageCoords = camera.screenToStageCoords(screenPoint, stageOffset, stageScale);
    expect(stageCoords).toEqual({ x: 200, y: 200 });

    // World coords = (200 - panOffset) / zoom = (200 - 100) / 2 = 50, (200 - 50) / 2 = 75
    const worldCoords = camera.stageToWorldCoords(stageCoords);
    expect(worldCoords).toEqual({ x: 50, y: 75 });

    // Direct conversion
    const directWorldCoords = camera.screenToWorldCoords(screenPoint, stageOffset, stageScale);
    expect(directWorldCoords).toEqual({ x: 50, y: 75 });
  });
});
