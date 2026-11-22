import { Container, Graphics, Text } from 'pixi.js';
import { GameContext, Scene } from './scene';

export class SceneManager {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private isTransitioning: boolean = false;
  private loadingOverlay: Container | null = null;

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

  public hasScene(name: string): boolean {
    return this.scenes.has(name);
  }

  public isLoadingOverlayVisible(): boolean {
    return Boolean(this.loadingOverlay && this.loadingOverlay.parent === this.rootContainer);
  }

  private showLoadingOverlay(label: string = 'Loading...'): void {
    this.hideLoadingOverlay();
    const overlay = new Container();
    overlay.zIndex = 99999;
    const bg = new Graphics();
    const w = typeof window !== 'undefined' ? Math.max(1920, window.innerWidth) : 1920;
    const h = typeof window !== 'undefined' ? Math.max(1080, window.innerHeight) : 1080;
    bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 1 });

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'GustysSerpents, sans-serif',
        fontSize: 36,
        fill: '#f5e6c4',
        align: 'center',
      },
    });
    text.anchor.set(0.5);
    const centerX = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth / 2 : 960;
    const centerY = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight / 2 : 540;
    text.position.set(centerX, centerY);

    overlay.addChild(bg, text);
    this.loadingOverlay = overlay;
    this.rootContainer.addChild(overlay);
  }

  private hideLoadingOverlay(): void {
    if (this.loadingOverlay) {
      if (this.loadingOverlay.parent) {
        this.loadingOverlay.parent.removeChild(this.loadingOverlay);
      }
      this.loadingOverlay.destroy({ children: true });
      this.loadingOverlay = null;
    }
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
    const shouldShowLoading = name === 'battle' && this.currentScene !== null;

    try {
      if (shouldShowLoading) {
        this.showLoadingOverlay('Loading...');
        await new Promise<void>((resolve) => {
          if (typeof requestAnimationFrame === 'function') {
            let done = false;
            const fin = () => {
              if (!done) {
                done = true;
                resolve();
              }
            };
            requestAnimationFrame(() => fin());
            setTimeout(fin, 40);
          } else {
            resolve();
          }
        });
      }

      if (this.currentScene) {
        await this.currentScene.exit();
        this.rootContainer.removeChild(this.currentScene.container);
      }

      this.currentScene = nextScene;
      this.rootContainer.addChild(nextScene.container);

      const context = this.contextGetter();
      await nextScene.enter(context, params);
    } finally {
      this.hideLoadingOverlay();
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
