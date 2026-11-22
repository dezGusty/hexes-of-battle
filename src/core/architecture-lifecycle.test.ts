import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import * as THREE from 'three';

vi.mock('@pixi/sound', () => ({
  sound: {
    add: vi.fn(),
    remove: vi.fn(),
    exists: vi.fn(() => false),
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

import { ThreeRendererHost } from '../render3d/three-renderer-host';
import { ThreeSceneManager } from '../render3d/three-scene-manager';
import { disposeBattleRender3DCaches } from '../render3d/render3d-resource-manager';
import { getSharedBannersTexture, setSharedBannersTexture } from '../render3d/decorations/retreat-flag-3d';
import { AssetBundleManager } from './asset-manager';
import { GameAssets, Scene } from './scene';
import { HexesEngine } from './engine';
import { GameFlowController } from './game-flow';

describe('3D Multi-Scene Architecture & Resource Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should share a single ThreeRendererHost across scenes without disposing the renderer on scene exit', () => {
    const mockCanvas: any = {
      id: '',
      style: {},
      parentElement: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1920, height: 1080 }),
    };
    const container: any = {
      clientWidth: 1920,
      clientHeight: 1080,
      appendChild: (el: any) => {
        el.parentElement = container;
      },
      removeChild: (el: any) => {
        if (el.parentElement === container) el.parentElement = null;
      },
    };
    vi.stubGlobal('document', {
      createElement: () => mockCanvas,
    });

    try {
      const host = new ThreeRendererHost(container);
      const rendererDisposeSpy = vi.spyOn(host.renderer, 'dispose');

      const battleSceneMgr = new ThreeSceneManager(container, host);
      expect(battleSceneMgr.renderer).toBe(host.renderer);
      expect(battleSceneMgr.canvas).toBe(host.canvas);
      expect(host.canvas.parentElement).toBe(container);

      // Disposing the scene manager must NOT dispose the shared renderer or detach the canvas
      battleSceneMgr.dispose();
      expect(rendererDisposeSpy).not.toHaveBeenCalled();
      expect(host.canvas.parentElement).toBe(container);

      // A second 3D scene (e.g. Overview Map) can reuse the same host
      const overviewSceneMgr = new ThreeSceneManager(container, host);
      expect(overviewSceneMgr.renderer).toBe(host.renderer);
      overviewSceneMgr.dispose();
      expect(rendererDisposeSpy).not.toHaveBeenCalled();

      // Only disposing the host itself disposes the WebGLRenderer and removes the canvas
      host.dispose();
      expect(rendererDisposeSpy).toHaveBeenCalledTimes(1);
      expect(host.canvas.parentElement).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should load and unload battle Pixi assets via AssetBundleManager', async () => {
    const { Assets } = await import('pixi.js');
    const loadSpy = vi.spyOn(Assets, 'load').mockResolvedValue({ textures: {} } as any);
    const unloadSpy = vi.spyOn(Assets, 'unload').mockResolvedValue(undefined as any);

    const manager = new AssetBundleManager();
    const assets: GameAssets = { softCursorTextures: {} };

    await manager.loadCoreAssets(assets);
    expect(assets.unitsSheet).toBeDefined();

    await manager.loadBattleAssets(assets);
    expect(manager.isBattleAssetsLoaded()).toBe(true);
    expect(assets.unitsSheet).toBeDefined();
    expect(assets.bannersSheet).toBeDefined();

    await manager.unloadBattleAssets(assets);
    expect(manager.isBattleAssetsLoaded()).toBe(false);
    expect(assets.terrainTexture).toBeUndefined();
    expect(assets.hexagonSheet).toBeUndefined();
    expect(assets.terrainSheet).toBeUndefined();
    expect(assets.unitsSheet).toBeDefined();
    expect(assets.bannersSheet).toBeUndefined();
    expect(unloadSpy).toHaveBeenCalled();

    loadSpy.mockRestore();
    unloadSpy.mockRestore();
  });

  it('should dispose shared banners texture and module-level render3d caches cleanly', () => {
    const tex = new THREE.Texture();
    const disposeSpy = vi.spyOn(tex, 'dispose');
    setSharedBannersTexture(tex);
    expect(getSharedBannersTexture()).toBe(tex);

    disposeBattleRender3DCaches();
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(getSharedBannersTexture()).toBeNull();
  });

  it('should route between overview and battle scenes via GameFlowController', async () => {
    const mockApp = {
      stage: { addChild: vi.fn() },
      screen: { width: 1920, height: 1080 },
      destroy: vi.fn(),
    } as any;

    const engine = new HexesEngine(mockApp);
    const overviewEnter = vi.fn();
    const overviewExit = vi.fn();
    const battleEnter = vi.fn();
    const battleExit = vi.fn();

    const overviewScene: Scene = {
      name: 'overview',
      container: new Container(),
      enter: overviewEnter,
      update: vi.fn(),
      exit: overviewExit,
    };
    const battleScene: Scene = {
      name: 'battle',
      container: new Container(),
      enter: battleEnter,
      update: vi.fn(),
      exit: battleExit,
    };

    engine.sceneManager.register(overviewScene);
    engine.sceneManager.register(battleScene);

    const flow = new GameFlowController(engine);
    await flow.startInitialScene();
    expect(engine.sceneManager.getActiveScene()).toBe(overviewScene);
    expect(overviewEnter).toHaveBeenCalledTimes(1);

    engine.eventBus.emit('overview:start-battle', { config: { mapWidth: 13, mapHeight: 9 } as any });
    await vi.waitFor(() => {
      expect(engine.sceneManager.getActiveScene()).toBe(battleScene);
    });
    expect(overviewExit).toHaveBeenCalledTimes(1);
    expect(battleEnter).toHaveBeenCalledTimes(1);

    const resultPayload = { victorArmyIndex: 0 };
    engine.eventBus.emit('battle:finished', resultPayload);
    engine.eventBus.emit('battle:exit-to-overview');
    await vi.waitFor(() => {
      expect(engine.sceneManager.getActiveScene()).toBe(overviewScene);
    });
    expect(battleExit).toHaveBeenCalledTimes(1);
    expect(overviewEnter).toHaveBeenLastCalledWith(expect.any(Object), { battleResult: resultPayload });

    flow.dispose();
  });
});
