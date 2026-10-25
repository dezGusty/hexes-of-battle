import { describe, it, expect, vi } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { HexesEngine } from './engine';
import { Application } from 'pixi.js';

describe('HexesEngine scaling and positioning', () => {
  it('should position renderContainer at (0, 0) for top-left aligned UI', () => {
    const mockApp = {
      stage: { addChild: vi.fn() },
      screen: { width: 1920, height: 1080 },
    } as unknown as Application;

    const engine = new HexesEngine(mockApp);

    // Test with wide aspect ratio (e.g. 2560x1080)
    engine.setScalingForSize(2560, 1080);
    expect(engine.renderContainer.position.x).toBe(0);
    expect(engine.renderContainer.position.y).toBe(0);

    // Test with standard resolution (1920x1080)
    engine.setScalingForSize(1920, 1080);
    expect(engine.renderContainer.position.x).toBe(0);
    expect(engine.renderContainer.position.y).toBe(0);

    // Test with narrow/smaller window (e.g. 1280x720)
    engine.setScalingForSize(1280, 720);
    expect(engine.renderContainer.position.x).toBe(0);
    expect(engine.renderContainer.position.y).toBe(0);
  });

  it('should request preloading of all trait icons including Cavalry, Charge, and Armor Penetration', async () => {
    const mockApp = {
      stage: { addChild: vi.fn() },
      screen: { width: 1920, height: 1080 },
    } as unknown as Application;

    const engine = new HexesEngine(mockApp);
    const { Assets } = await import('pixi.js');
    const loadSpy = vi.spyOn(Assets, 'load').mockResolvedValue({} as any);

    await engine.loadAssets();

    expect(loadSpy).toHaveBeenCalled();
    const loadedFiles = loadSpy.mock.calls.flatMap((call) => call[0] as string[]);
    expect(loadedFiles).toContain('traits/icon_armor_penetration.png');
    expect(loadedFiles).toContain('traits/icon_cavalry.png');
    expect(loadedFiles).toContain('traits/icon_charge.png');
    expect(loadedFiles).toContain('skills/icon_mend_wounds.png');

    loadSpy.mockRestore();
  });
});
