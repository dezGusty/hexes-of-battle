import { Coords } from '../shared';

export interface PinchZoomEvent {
  deltaDistance: number; // positive = fingers spreading apart (zoom in), negative = pinching together (zoom out)
  currentDistance: number;
  center: Coords;
  deltaCenter: Coords;
  scale: number;
  deltaAngle: number; // rotation in radians between current and previous touch frames (normalized [-PI, PI])
  currentAngle: number; // current angle in radians between touch fingers
  originalEvent: TouchEvent;
}

export interface PinchGestureOptions {
  onPinchZoom: (event: PinchZoomEvent) => void;
  onPinchStart?: (center: Coords, distance: number) => void;
  onPinchEnd?: () => void;
  clickSuppressionTimeMs?: number;
  isEnabled?: () => boolean;
}

export class PinchGestureHandler {
  private lastDistance: number | null = null;
  private lastCenter: Coords | null = null;
  private lastAngle: number | null = null;
  private isPinchActive: boolean = false;
  private suppressClickUntil: number = 0;

  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundTouchCancel: (e: TouchEvent) => void;
  private currentTarget?: EventTarget;

  constructor(private options: PinchGestureOptions) {
    this.boundTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
    this.boundTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
    this.boundTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);
    this.boundTouchCancel = (e: TouchEvent) => this.handleTouchCancel(e);
  }

  public attach(target: EventTarget): void {
    if (this.currentTarget) {
      this.detach();
    }
    this.currentTarget = target;
    target.addEventListener('touchstart', this.boundTouchStart as EventListener, { passive: false });
    target.addEventListener('touchmove', this.boundTouchMove as EventListener, { passive: false });
    target.addEventListener('touchend', this.boundTouchEnd as EventListener);
    target.addEventListener('touchcancel', this.boundTouchCancel as EventListener);
  }

  public detach(): void {
    if (this.currentTarget) {
      this.currentTarget.removeEventListener('touchstart', this.boundTouchStart as EventListener);
      this.currentTarget.removeEventListener('touchmove', this.boundTouchMove as EventListener);
      this.currentTarget.removeEventListener('touchend', this.boundTouchEnd as EventListener);
      this.currentTarget.removeEventListener('touchcancel', this.boundTouchCancel as EventListener);
      this.currentTarget = undefined;
    }
    this.reset();
  }

  public isPinching(): boolean {
    return this.isPinchActive;
  }

  public shouldSuppressClick(): boolean {
    return this.isPinchActive || Date.now() < this.suppressClickUntil;
  }

  public handleTouchStart(e: TouchEvent): void {
    if (this.options.isEnabled && !this.options.isEnabled()) return;
    if (e.touches && e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const center: Coords = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      const angle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);
      this.lastDistance = dist;
      this.lastCenter = center;
      this.lastAngle = angle;
      this.isPinchActive = true;
      this.options.onPinchStart?.(center, dist);
    } else {
      if (this.isPinchActive) {
        this.reset();
      }
    }
  }

  public handleTouchMove(e: TouchEvent): void {
    if (this.options.isEnabled && !this.options.isEnabled()) return;
    if (e.touches && e.touches.length === 2 && this.lastDistance !== null && this.lastCenter !== null) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const curDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const curCenter: Coords = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      const curAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);

      const deltaDistance = curDist - this.lastDistance;
      const deltaCenter: Coords = {
        x: curCenter.x - this.lastCenter.x,
        y: curCenter.y - this.lastCenter.y,
      };
      const scale = this.lastDistance > 0 ? curDist / this.lastDistance : 1;

      let deltaAngle = curAngle - (this.lastAngle ?? curAngle);
      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      const suppression = this.options.clickSuppressionTimeMs ?? 300;
      this.suppressClickUntil = Date.now() + suppression;
      this.isPinchActive = true;

      this.options.onPinchZoom({
        deltaDistance,
        currentDistance: curDist,
        center: curCenter,
        deltaCenter,
        scale,
        deltaAngle,
        currentAngle: curAngle,
        originalEvent: e,
      });

      this.lastDistance = curDist;
      this.lastCenter = curCenter;
      this.lastAngle = curAngle;
    }
  }

  public handleTouchEnd(e: TouchEvent): void {
    if (!e.touches || e.touches.length < 2) {
      if (this.isPinchActive) {
        const suppression = this.options.clickSuppressionTimeMs ?? 300;
        this.suppressClickUntil = Date.now() + suppression;
        this.options.onPinchEnd?.();
      }
      this.reset();
    }
  }

  public handleTouchCancel(_e?: TouchEvent): void {
    this.reset();
  }

  public reset(): void {
    this.lastDistance = null;
    this.lastCenter = null;
    this.lastAngle = null;
    this.isPinchActive = false;
  }
}
