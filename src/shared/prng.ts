/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32).
 * Enables 100% reproducible simulations, replays, and testing.
 */
export class SeedableRNG {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed: number = Date.now()) {
    this.initialSeed = seed >>> 0;
    this.state = this.initialSeed;
  }

  public getSeed(): number {
    return this.initialSeed;
  }

  public getState(): number {
    return this.state;
  }

  public setState(state: number): void {
    this.state = state >>> 0;
  }

  public reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min (inclusive) and max (inclusive).
   */
  public range(min: number, max: number): number {
    if (min >= max) return min;
    const n = this.next();
    return Math.floor(n * (max - min + 1)) + min;
  }

  /**
   * Returns true with the given probability (0.0 to 1.0).
   */
  public chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  /**
   * Returns a random element from an array.
   */
  public choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = this.range(0, array.length - 1);
    return array[index];
  }
}
