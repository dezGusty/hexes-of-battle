import { Application } from "pixi.js";
import { HexesEngine } from "./core/engine";
import { GameFlowController } from "./core/game-flow";
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
  public flowController?: GameFlowController;

  constructor(public app: Application) {
    this.engine = new HexesEngine(app);
  }

  public async initialize(): Promise<void> {
    await this.engine.initialize();

    // Register scenes
    const battleScene = new BattleScene3D();
    this.engine.sceneManager.register(battleScene);

    // Coordinate overview <-> battle scene transitions
    this.flowController = new GameFlowController(this.engine);
    await this.flowController.startInitialScene();
  }

  public destroy(): void {
    this.flowController?.dispose();
    this.flowController = undefined;
    this.engine.destroy();
  }
}
