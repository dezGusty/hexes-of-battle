/**
 * Tracks instantaneous FPS and a rolling time-weighted average over a 5-second window.
 */
export class FpsDisplayTracker {
  private readonly samples: Array<{ dt: number; fps: number }> = [];
  private totalWindowMs: number = 0;
  private weightedFpsSum: number = 0;

  constructor(private readonly windowMs: number = 5000) {}

  /**
   * Records a frame's FPS and elapsed delta in milliseconds, returning formatted text
   * such as "FPS: 59 (60)".
   */
  public record(fps: number, deltaMS?: number): { current: number; average: number; text: string } {
    const safeFps = Number.isFinite(fps) && fps >= 0 ? fps : 0;
    const dt =
      deltaMS !== undefined && Number.isFinite(deltaMS) && deltaMS > 0
        ? Math.min(deltaMS, this.windowMs)
        : 1000 / 60;

    this.samples.push({ dt, fps: safeFps });
    this.totalWindowMs += dt;
    this.weightedFpsSum += safeFps * dt;

    while (this.samples.length > 1 && this.totalWindowMs > this.windowMs) {
      const oldest = this.samples.shift()!;
      this.totalWindowMs -= oldest.dt;
      this.weightedFpsSum -= oldest.fps * oldest.dt;
    }

    const current = Math.round(safeFps);
    const average =
      this.totalWindowMs > 0 ? Math.round(this.weightedFpsSum / this.totalWindowMs) : current;

    return {
      current,
      average,
      text: `FPS: ${current} (${average})`,
    };
  }
}
