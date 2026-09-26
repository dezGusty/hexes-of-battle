import { Application } from "pixi.js";
import { HexesEngine } from "./core/engine";
import { BattleScene } from "./scenes/battle-scene";

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
    const battleScene = new BattleScene();
    this.engine.sceneManager.register(battleScene);

    // Switch to initial scene
    await this.engine.sceneManager.switchTo("battle");
  }
}
