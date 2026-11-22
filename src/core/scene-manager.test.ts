import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus';
import { SceneManager } from './scene-manager';
import { Scene, GameContext } from './scene';
import { Container } from 'pixi.js';

describe('EventBus', () => {
  it('should register listeners and emit events', () => {
    const bus = new EventBus();
    const mockCallback = vi.fn();

    const unsubscribe = bus.on('test-event', mockCallback);
    bus.emit('test-event', { value: 42 });

    expect(mockCallback).toHaveBeenCalledWith({ value: 42 });

    unsubscribe();
    bus.emit('test-event', { value: 99 });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});

describe('SceneManager', () => {
  it('should switch between registered scenes and trigger lifecycle methods', async () => {
    const root = new Container();
    const mockContext = {} as GameContext;
    const manager = new SceneManager(root, () => mockContext);

    const sceneAContainer = new Container();
    const enterAFn = vi.fn();
    const exitAFn = vi.fn();
    const updateAFn = vi.fn();

    const sceneA: Scene = {
      name: 'sceneA',
      container: sceneAContainer,
      enter: enterAFn,
      exit: exitAFn,
      update: updateAFn,
    };

    const sceneBContainer = new Container();
    const enterBFn = vi.fn();
    const exitBFn = vi.fn();
    const updateBFn = vi.fn();

    const sceneB: Scene = {
      name: 'sceneB',
      container: sceneBContainer,
      enter: enterBFn,
      exit: exitBFn,
      update: updateBFn,
    };

    manager.register(sceneA);
    manager.register(sceneB);

    await manager.switchTo('sceneA');
    expect(manager.getActiveScene()?.name).toBe('sceneA');
    expect(enterAFn).toHaveBeenCalledWith(mockContext, undefined);
    expect(root.children).toContain(sceneAContainer);

    manager.update(16);
    expect(updateAFn).toHaveBeenCalledWith(16);

    await manager.switchTo('sceneB', { param1: 'test' });
    expect(exitAFn).toHaveBeenCalled();
    expect(root.children).not.toContain(sceneAContainer);
    expect(manager.getActiveScene()?.name).toBe('sceneB');
    expect(enterBFn).toHaveBeenCalledWith(mockContext, { param1: 'test' });
    expect(root.children).toContain(sceneBContainer);
  });

  it('should display a Loading... overlay on black background when switching to battle scene', async () => {
    const root = new Container();
    const mockContext = {} as GameContext;
    const manager = new SceneManager(root, () => mockContext);

    let wasOverlayVisibleDuringEnter = false;
    const overviewScene: Scene = {
      name: 'overview',
      container: new Container(),
      enter: vi.fn(),
      exit: vi.fn(),
      update: vi.fn(),
    };
    const battleScene: Scene = {
      name: 'battle',
      container: new Container(),
      enter: async () => {
        wasOverlayVisibleDuringEnter = manager.isLoadingOverlayVisible();
      },
      exit: vi.fn(),
      update: vi.fn(),
    };

    manager.register(overviewScene);
    manager.register(battleScene);

    await manager.switchTo('overview');
    expect(manager.isLoadingOverlayVisible()).toBe(false);

    await manager.switchTo('battle');
    expect(wasOverlayVisibleDuringEnter).toBe(true);
    expect(manager.isLoadingOverlayVisible()).toBe(false);
  });
});
