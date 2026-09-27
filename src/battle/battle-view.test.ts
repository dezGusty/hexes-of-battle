import { describe, it, expect, vi } from "vitest";

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { Battle, ArmyControlType } from "../battle";
import { HexMap } from "../shared/hex-map";
import { BattleView } from "./battle-view";
import { BattleSettings } from "./settings";
import { AggressiveCPUPlayer } from "./aggressive-cpu-player";
import { DefensiveCPUPlayer } from "./defensive-cpu-player";
import { DumbCPUPlayer } from "./dumb-cpu-player";

describe("BattleView Army Names Formatting", () => {
  const dummyAssets: any = { softCursorTextures: {} };
  const settings = new BattleSettings();

  it("should format Player 1 with '- Human' suffix and Player 2 with 'CPU <Personality> -' prefix by default", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    // By default: army_control[0] is PLAYER, army_control[1] is AI
    const dumbCpu = new DumbCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, dumbCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Dumb - Knights of The Grand Duke");
  });

  it("should format Player 2 with 'CPU Aggressive -' prefix when CPU is Aggressive", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const aggressiveCpu = new AggressiveCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, aggressiveCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Aggressive - Knights of The Grand Duke");
  });

  it("should format Player 2 with 'CPU Defensive -' prefix when CPU is Defensive", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    const defensiveCpu = new DefensiveCPUPlayer(battle);

    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, defensiveCpu);

    expect(view.getFormattedArmyName(0)).toBe("The Count of Ekkina's 1st Army - Human");
    expect(view.getFormattedArmyName(1)).toBe("CPU Defensive - Knights of The Grand Duke");
  });

  it("should handle custom army names and reverse army control correctly", () => {
    const hexMap = new HexMap(10, 8);
    const battle = new Battle(hexMap);
    battle.initializeToSize(10, 8);
    // Player 1 is AI, Player 2 is Human
    battle.army_control = [ArmyControlType.AI, ArmyControlType.PLAYER];
    const aggressiveCpu = new AggressiveCPUPlayer(battle);

    const customNames: [string, string] = ["Shadow Legion", "Silver Vanguard"];
    const view = new BattleView(dummyAssets, settings, hexMap, battle, 1.4, aggressiveCpu, customNames);

    // Player 1 always has note as suffix
    expect(view.getFormattedArmyName(0)).toBe("Shadow Legion - CPU Aggressive");
    // Player 2 always has note as prefix
    expect(view.getFormattedArmyName(1)).toBe("Human - Silver Vanguard");
  });
});
