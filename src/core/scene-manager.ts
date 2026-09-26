import { Container } from 'pixi.js';
import { GameContext, Scene } from './scene';

export class SceneManager {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private isTransitioning: boolean = false;

  constructor(
    private rootContainer: Container,
    private contextGetter: () => GameContext
  ) {}

  public register(scene: Scene): void {
    if (this.scenes.has(scene.name)) {
      console.warn(`Scene with name "${scene.name}" already registered. Overwriting.`);
    }
    this.scenes.set(scene.name, scene);
  }

  public getActiveScene(): Scene | null {
    return this.currentScene;
  }

  public async switchTo(name: string, params?: any): Promise<void> {
    if (this.isTransitioning) {
      console.warn(`Cannot switch to scene "${name}" while transition is in progress.`);
      return;
    }

    const nextScene = this.scenes.get(name);
    if (!nextScene) {
      throw new Error(`Scene "${name}" not found in SceneManager.`);
    }

    if (this.currentScene === nextScene) {
      return;
    }

    this.isTransitioning = true;

    try {
      if (this.currentScene) {
        await this.currentScene.exit();
        this.rootContainer.removeChild(this.currentScene.container);
      }

      this.currentScene = nextScene;
      this.rootContainer.addChild(nextScene.container);

      const context = this.contextGetter();
      await nextScene.enter(context, params);
    } finally {
      this.isTransitioning = false;
    }
  }

  public update(deltaMS: number): void {
    if (this.currentScene && !this.isTransitioning) {
      this.currentScene.update(deltaMS);
    }
  }

  public resize(width: number, height: number): void {
    if (this.currentScene?.resize) {
      this.currentScene.resize(width, height);
    }
  }

  public destroy(): void {
    if (this.currentScene) {
      this.currentScene.exit();
      this.rootContainer.removeChild(this.currentScene.container);
      this.currentScene = null;
    }

    for (const scene of this.scenes.values()) {
      if (scene.destroy) {
        scene.destroy();
      }
    }
    this.scenes.clear();
  }
}
