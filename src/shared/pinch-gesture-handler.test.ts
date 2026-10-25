import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinchGestureHandler, PinchZoomEvent } from './pinch-gesture-handler';

describe('PinchGestureHandler', () => {
  let target: EventTarget;

  beforeEach(() => {
    target = new EventTarget();
  });

  const createMockTouchEvent = (type: string, touches: { clientX: number; clientY: number }[], cancelable = true): any => {
    const event = new Event(type, { cancelable }) as any;
    event.touches = touches;
    event.preventDefault = vi.fn();
    return event;
  };

  it('should initialize and attach listeners without error', () => {
    const onPinchZoom = vi.fn();
    const handler = new PinchGestureHandler({ onPinchZoom });

    handler.attach(target);
    expect(handler.isPinching()).toBe(false);
    expect(handler.shouldSuppressClick()).toBe(false);

    handler.detach();
  });

  it('should ignore single touch events', () => {
    const onPinchStart = vi.fn();
    const onPinchZoom = vi.fn();
    const handler = new PinchGestureHandler({ onPinchStart, onPinchZoom });
    handler.attach(target);

    const touchEvent = createMockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
    target.dispatchEvent(touchEvent);

    expect(handler.isPinching()).toBe(false);
    expect(onPinchStart).not.toHaveBeenCalled();

    const moveEvent = createMockTouchEvent('touchmove', [{ clientX: 110, clientY: 110 }]);
    target.dispatchEvent(moveEvent);

    expect(onPinchZoom).not.toHaveBeenCalled();
    handler.detach();
  });

  it('should detect pinch start and calculate initial center and distance', () => {
    const onPinchStart = vi.fn();
    const onPinchZoom = vi.fn();
    const handler = new PinchGestureHandler({ onPinchStart, onPinchZoom });
    handler.attach(target);

    // Two touches: (100, 100) and (200, 100) -> distance = 100, center = (150, 100)
    const touchStart = createMockTouchEvent('touchstart', [
      { clientX: 100, clientY: 100 },
      { clientX: 200, clientY: 100 },
    ]);
    target.dispatchEvent(touchStart);

    expect(handler.isPinching()).toBe(true);
    expect(onPinchStart).toHaveBeenCalledWith({ x: 150, y: 100 }, 100);

    handler.detach();
  });

  it('should fire onPinchZoom with positive deltaDistance when fingers spread apart (zoom in)', () => {
    let lastZoomEvent: PinchZoomEvent | undefined;
    const handler = new PinchGestureHandler({
      onPinchZoom: (ev) => {
        lastZoomEvent = ev;
      },
    });
    handler.attach(target);

    // Start with distance 100
    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ])
    );

    // Spread fingers to (80, 100) and (220, 100) -> distance = 140
    const moveEvent = createMockTouchEvent('touchmove', [
      { clientX: 80, clientY: 100 },
      { clientX: 220, clientY: 100 },
    ]);
    target.dispatchEvent(moveEvent);

    expect(moveEvent.preventDefault).toHaveBeenCalled();
    expect(lastZoomEvent).toBeDefined();
    expect(lastZoomEvent!.deltaDistance).toBeCloseTo(40, 2);
    expect(lastZoomEvent!.currentDistance).toBeCloseTo(140, 2);
    expect(lastZoomEvent!.center).toEqual({ x: 150, y: 100 });
    expect(lastZoomEvent!.deltaCenter).toEqual({ x: 0, y: 0 });
    expect(lastZoomEvent!.scale).toBeCloseTo(1.4, 2);

    handler.detach();
  });

  it('should fire onPinchZoom with negative deltaDistance when fingers pinch together (zoom out)', () => {
    let lastZoomEvent: PinchZoomEvent | undefined;
    const handler = new PinchGestureHandler({
      onPinchZoom: (ev) => {
        lastZoomEvent = ev;
      },
    });
    handler.attach(target);

    // Start with distance 200
    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 300, clientY: 100 },
      ])
    );

    // Pinch together to (120, 100) and (280, 100) -> distance = 160
    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 120, clientY: 100 },
        { clientX: 280, clientY: 100 },
      ])
    );

    expect(lastZoomEvent).toBeDefined();
    expect(lastZoomEvent!.deltaDistance).toBeCloseTo(-40, 2);
    expect(lastZoomEvent!.currentDistance).toBeCloseTo(160, 2);
    expect(lastZoomEvent!.scale).toBeCloseTo(0.8, 2);

    handler.detach();
  });

  it('should track pinch center pan movement', () => {
    let lastZoomEvent: PinchZoomEvent | undefined;
    const handler = new PinchGestureHandler({
      onPinchZoom: (ev) => {
        lastZoomEvent = ev;
      },
    });
    handler.attach(target);

    // Start: (100, 100) and (200, 100) -> center = (150, 100)
    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ])
    );

    // Shift both fingers right by 20 and down by 10 -> center = (170, 110)
    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 120, clientY: 110 },
        { clientX: 220, clientY: 110 },
      ])
    );

    expect(lastZoomEvent).toBeDefined();
    expect(lastZoomEvent!.deltaCenter).toEqual({ x: 20, y: 10 });
    expect(lastZoomEvent!.center).toEqual({ x: 170, y: 110 });

    handler.detach();
  });

  it('should suppress clicks after a pinch gesture ends', () => {
    const onPinchEnd = vi.fn();
    const handler = new PinchGestureHandler({ onPinchZoom: vi.fn(), onPinchEnd, clickSuppressionTimeMs: 200 });
    handler.attach(target);

    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ])
    );

    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 90, clientY: 100 },
        { clientX: 210, clientY: 100 },
      ])
    );

    expect(handler.shouldSuppressClick()).toBe(true);

    // Finger lifts -> 1 touch remains
    target.dispatchEvent(createMockTouchEvent('touchend', [{ clientX: 90, clientY: 100 }]));

    expect(onPinchEnd).toHaveBeenCalled();
    expect(handler.isPinching()).toBe(false);
    expect(handler.shouldSuppressClick()).toBe(true);

    handler.detach();
  });

  it('should reset on touchcancel', () => {
    const handler = new PinchGestureHandler({ onPinchZoom: vi.fn() });
    handler.attach(target);

    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ])
    );
    expect(handler.isPinching()).toBe(true);

    target.dispatchEvent(new Event('touchcancel'));
    expect(handler.isPinching()).toBe(false);

    handler.detach();
  });

  it('should track two-finger rotation gesture and report currentAngle and deltaAngle', () => {
    let lastZoomEvent: PinchZoomEvent | undefined;
    const handler = new PinchGestureHandler({
      onPinchZoom: (ev) => {
        lastZoomEvent = ev;
      },
    });
    handler.attach(target);

    // Initial fingers: horizontal from (100, 100) to (200, 100) -> angle = 0 radians
    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ])
    );

    // Rotate fingers 45 degrees clockwise: (114.64, 64.64) to (185.36, 135.36)
    // dx = 70.71, dy = 70.71 -> angle = PI / 4 (~0.785 rad)
    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 114.64, clientY: 64.64 },
        { clientX: 185.36, clientY: 135.36 },
      ])
    );

    expect(lastZoomEvent).toBeDefined();
    expect(lastZoomEvent!.currentAngle).toBeCloseTo(Math.PI / 4, 2);
    expect(lastZoomEvent!.deltaAngle).toBeCloseTo(Math.PI / 4, 2);

    // Further rotate to vertical: (150, 50) to (150, 150) -> angle = PI / 2 (~1.57 rad)
    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 150, clientY: 50 },
        { clientX: 150, clientY: 150 },
      ])
    );

    expect(lastZoomEvent!.currentAngle).toBeCloseTo(Math.PI / 2, 2);
    expect(lastZoomEvent!.deltaAngle).toBeCloseTo(Math.PI / 4, 2);

    handler.detach();
  });

  it('should correctly normalize deltaAngle across the +/- PI boundary', () => {
    let lastZoomEvent: PinchZoomEvent | undefined;
    const handler = new PinchGestureHandler({
      onPinchZoom: (ev) => {
        lastZoomEvent = ev;
      },
    });
    handler.attach(target);

    // Start near +PI (e.g. angle = 3.0 rad): t0 at (200, 100), t1 at (100, 114)
    // dx = -100, dy = 14 -> angle ~ 3.0 rad
    target.dispatchEvent(
      createMockTouchEvent('touchstart', [
        { clientX: 200, clientY: 100 },
        { clientX: 100, clientY: 114 },
      ])
    );

    // Small rotation crossing the -PI/+PI seam to angle ~ -3.0 rad: t0 at (200, 100), t1 at (100, 86)
    // dx = -100, dy = -14 -> angle ~ -3.0 rad
    // Raw diff is (-3.0 - 3.0) = -6.0 rad, but normalized deltaAngle is around +0.28 rad
    target.dispatchEvent(
      createMockTouchEvent('touchmove', [
        { clientX: 200, clientY: 100 },
        { clientX: 100, clientY: 86 },
      ])
    );

    expect(lastZoomEvent).toBeDefined();
    expect(lastZoomEvent!.deltaAngle).toBeGreaterThan(-Math.PI);
    expect(lastZoomEvent!.deltaAngle).toBeLessThan(Math.PI);
    expect(Math.abs(lastZoomEvent!.deltaAngle)).toBeLessThan(0.5);

    handler.detach();
  });
});
