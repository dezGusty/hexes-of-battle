import { Battle } from "../battle";
import { AggressiveCPUPlayer } from "./aggressive-cpu-player";
import { CPUPlayer, CPUPersonalityType } from "./cpu-player";
import { DefensiveCPUPlayer } from "./defensive-cpu-player";
import { DumbCPUPlayer } from "./dumb-cpu-player";

export class CPUPlayerFactory {
  public static create(personality: CPUPersonalityType | string | undefined, battle: Battle): CPUPlayer {
    switch (personality) {
      case CPUPersonalityType.AGGRESSIVE:
      case "aggressive":
        return new AggressiveCPUPlayer(battle);

      case CPUPersonalityType.DEFENSIVE:
      case "defensive":
        return new DefensiveCPUPlayer(battle);

      case CPUPersonalityType.DUMB:
      case "dumb":
      default:
        return new DumbCPUPlayer(battle);
    }
  }
}
