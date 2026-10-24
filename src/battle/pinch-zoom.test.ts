import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { BattleInputController } from './battle-input-controller';
import { Battle } from '../battle';
import { HexMap } from '../shared/hex-map';
import { BattleView3D } from '../render3d/battle-view-3d';

describe('Pinch Gesture Zoom Functionality', () => {
  let prevDocument: any;
  let prevWindow: any;

  beforeEach(() => {
    prevDocument = (globalThis as any).document;
    prevWindow = (globalThis as any).window;
  });

  afterEach(() => {
    (globalThis as any).document = prevDocument;
    (globalThis as any).window = prevWindow;
  });

  const createMockTouchEvent = (type: string, touches: { clientX: number; clientY: number }[]): any => {
    const event = new Event(type, { cancelable: true }) as any;
    event.touches = touches;
    event.preventDefault = vi.fn();
    return event;
  };

  describe('2D BattleInputController Pinch-to-Zoom', () => {
    it('should zoom in when spreading fingers apart and calculate correct focal ratio', () => {
      const docTarget = new EventTarget();
      (globalThis as any).document = docTarget;

      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const dummyCamera = {
        panBy: vi.fn(),
        zoomBy: vi.fn(),
        zoomStep: 0.1,
      };

      const controller = new BattleInputController(battle, hexMap, {
        isMenuBlockingInput: () => false,
        onCursorMove: vi.fn(),
        onClearHover: vi.fn(),
        getCamera: () => dummyCamera as any,
        getStageOffsetAndScale: () => ({ offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }),
        getScreenSize: () => ({ width: 1000, height: 800 }),
      });

      controller.attach();

      // Initial pinch: fingers at (400, 300) and (600, 300) -> distance = 200, center = (500, 300)
      docTarget.dispatchEvent(
        createMockTouchEvent('touchstart', [
          { clientX: 400, clientY: 300 },
          { clientX: 600, clientY: 300 },
        ])
      );

      // Spread fingers to (350, 300) and (650, 300) -> distance = 300 (deltaDistance = +100)
      const moveEv = createMockTouchEvent('touchmove', [
        { clientX: 350, clientY: 300 },
        { clientX: 650, clientY: 300 },
      ]);
      docTarget.dispatchEvent(moveEv);

      expect(moveEv.preventDefault).toHaveBeenCalled();
      expect(dummyCamera.zoomBy).toHaveBeenCalledTimes(1);

      // deltaDistance = 100, zoomDelta = 100 * 0.005 = 0.5 (zoom in)
      const [delta, focalRatio] = dummyCamera.zoomBy.mock.calls[0];
      expect(delta).toBeCloseTo(0.5, 3);
      expect(focalRatio).toEqual({ x: 500 / 1000, y: 300 / 800 });

      controller.detach();
    });

    it('should zoom out when pinching fingers closer together', () => {
      const docTarget = new EventTarget();
      (globalThis as any).document = docTarget;

      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);

      const dummyCamera = {
        panBy: vi.fn(),
        zoomBy: vi.fn(),
        zoomStep: 0.1,
      };

      const controller = new BattleInputController(battle, hexMap, {
        isMenuBlockingInput: () => false,
        onCursorMove: vi.fn(),
        onClearHover: vi.fn(),
        getCamera: () => dummyCamera as any,
        getStageOffsetAndScale: () => ({ offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }),
        getScreenSize: () => ({ width: 1000, height: 800 }),
      });

      controller.attach();

      // Initial distance = 200
      docTarget.dispatchEvent(
        createMockTouchEvent('touchstart', [
          { clientX: 400, clientY: 400 },
          { clientX: 600, clientY: 400 },
        ])
      );

      // Pinch together to distance = 140 (deltaDistance = -60)
      docTarget.dispatchEvent(
        createMockTouchEvent('touchmove', [
          { clientX: 430, clientY: 400 },
          { clientX: 570, clientY: 400 },
        ])
      );

      expect(dummyCamera.zoomBy).toHaveBeenCalledTimes(1);
      const [delta] = dummyCamera.zoomBy.mock.calls[0];
      // deltaDistance = -60, zoomDelta = -60 * 0.005 = -0.3 (zoom out)
      expect(delta).toBeCloseTo(-0.3, 3);

      controller.detach();
    });

    it('should pan camera when moving pinch center and suppress accidental clicks on touch release', () => {
      const docTarget = new EventTarget();
      (globalThis as any).document = docTarget;

      const hexMap = new HexMap(10, 8);
      const battle = new Battle(hexMap);
      const primaryActionSpy = vi.spyOn(battle, 'handlePrimaryCellAction');

      const dummyCamera = {
        panBy: vi.fn(),
        zoomBy: vi.fn(),
        zoomStep: 0.1,
        screenToWorldCoords: () => ({ x: 50, y: 50 }),
      };

      const controller = new BattleInputController(battle, hexMap, {
        isMenuBlockingInput: () => false,
        onCursorMove: vi.fn(),
        onClearHover: vi.fn(),
        getCamera: () => dummyCamera as any,
        getStageOffsetAndScale: () => ({ offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }),
        getScreenSize: () => ({ width: 1000, height: 800 }),
      });

      controller.attach();

      // Initial center = (500, 300)
      docTarget.dispatchEvent(
        createMockTouchEvent('touchstart', [
          { clientX: 400, clientY: 300 },
          { clientX: 600, clientY: 300 },
        ])
      );

      // Move center right by 30 and down by 20 -> center = (530, 320)
      docTarget.dispatchEvent(
        createMockTouchEvent('touchmove', [
          { clientX: 430, clientY: 320 },
          { clientX: 630, clientY: 320 },
        ])
      );

      expect(dummyCamera.panBy).toHaveBeenCalledWith({ x: 30, y: 20 });

      // End pinch gesture
      docTarget.dispatchEvent(createMockTouchEvent('touchend', []));

      // Attempt to click immediately after pinch
      const clickEvent = new Event('click') as any;
      clickEvent.clientX = 530;
      clickEvent.clientY = 320;
      docTarget.dispatchEvent(clickEvent);

      // Click should have been suppressed!
      expect(primaryActionSpy).not.toHaveBeenCalled();

      controller.detach();
    });
  });

  describe('3D BattleView3D Pinch-to-Zoom', () => {
    it('should zoom 3D camera in when spreading fingers and out when pinching together', () => {
      const winTarget = new EventTarget();
      (globalThis as any).window = winTarget;

      const zoomCameraSpy = vi.fn();
      const panCameraSpy = vi.fn();

      const viewContext: any = {
        battle: { isCurrentTurnAI: () => false },
        hud: { isPointerOverUI: () => false },
        getStageCoords: () => ({ x: 500, y: 300 }),
        sceneManager: {
          zoomCamera: zoomCameraSpy,
          panCamera: panCameraSpy,
        },
      };

      // Call setupPointerEvents
      const container = new EventTarget() as any;
      (BattleView3D.prototype as any).setupPointerEvents.call(viewContext, container);

      // 1. Pinch start (distance = 200, center = 500, 300)
      winTarget.dispatchEvent(
        createMockTouchEvent('touchstart', [
          { clientX: 400, clientY: 300 },
          { clientX: 600, clientY: 300 },
        ])
      );

      // 2. Spread fingers apart to distance = 250 (deltaDistance = +50 -> zoom in)
      const moveIn = createMockTouchEvent('touchmove', [
        { clientX: 375, clientY: 300 },
        { clientX: 625, clientY: 300 },
      ]);
      winTarget.dispatchEvent(moveIn);

      expect(moveIn.preventDefault).toHaveBeenCalled();
      expect(zoomCameraSpy).toHaveBeenCalledTimes(1);
      // deltaDistance = 50 -> zoomCamera(-50 * 0.05 = -2.5) -> camera moves closer
      expect(zoomCameraSpy).toHaveBeenCalledWith(expect.closeTo(-2.5, 3));

      zoomCameraSpy.mockClear();

      // 3. Pinch fingers together to distance = 190 (deltaDistance = -60 -> zoom out)
      winTarget.dispatchEvent(
        createMockTouchEvent('touchmove', [
          { clientX: 405, clientY: 300 },
          { clientX: 595, clientY: 300 },
        ])
      );

      expect(zoomCameraSpy).toHaveBeenCalledTimes(1);
      // deltaDistance = -60 -> zoomCamera(-(-60) * 0.05 = +3.0) -> camera moves farther
      expect(zoomCameraSpy).toHaveBeenCalledWith(expect.closeTo(3.0, 3));

      // Clean up
      viewContext.pinchHandler.detach();
    });
  });
});
