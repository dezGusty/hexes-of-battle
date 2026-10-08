import { Application } from "pixi.js";
import { HexesEngine } from "./core/engine";
import { BattleScene3D } from "./scenes/battle-scene-3d";

export enum GameState {
  InMenu,
  ViewHighscores,
  InGame,
  PostGameGameOver,
  PostGameEnterHighscore,
}

export class HexesApp {
  public engine: HexesEngine;

  constructor(public app: Application) {
    this.engine = new HexesEngine(app);
  }

  public async initialize(): Promise<void> {
    await this.engine.initialize();

    // Register initial scenes
    const battleScene = new BattleScene3D();
    this.engine.sceneManager.register(battleScene);

    // Switch to initial scene
    await this.engine.sceneManager.switchTo("battle");
  }
}
