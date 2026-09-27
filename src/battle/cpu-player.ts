export enum CPUPersonalityType {
  DUMB = "dumb",
  AGGRESSIVE = "aggressive",
  DEFENSIVE = "defensive",
}

export interface CPUPlayer {
  readonly personalityName: string;
  update(deltaMS: number): void;
  reset(): void;
}
