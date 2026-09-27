import { Battle } from "../battle";
import { BaseCPUPlayer, CPUPlayerState } from "./base-cpu-player";
import { CPUPersonalityType } from "./cpu-player";

export const DumbCPUPlayerState = CPUPlayerState;
export type DumbCPUPlayerState = CPUPlayerState;

export class DumbCPUPlayer extends BaseCPUPlayer {
  public readonly personalityName: string = CPUPersonalityType.DUMB;

  constructor(battle: Battle) {
    super(battle);
  }
}
