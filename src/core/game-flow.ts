import { BattleConfig } from '../battle/battle-types';
import { HexesEngine } from './engine';
import { ISoundSystem } from './sound-system';

export interface BattleLaunchParams {
  config?: BattleConfig;
  soundSystem?: ISoundSystem;
}

export interface OverviewReturnParams {
  battleResult?: any;
}

/**
 * Coordinates transitions between the 3D overview map and 3D battle mode
 * via EventBus events without coupling individual scenes to each other.
 */
export class GameFlowController {
  private lastBattleResult: any = null;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly engine: HexesEngine) {
    this.unsubscribers.push(
      this.engine.eventBus.on('overview:start-battle', (params?: BattleLaunchParams) => {
        this.lastBattleResult = null;
        if (this.engine.sceneManager.hasScene('battle')) {
          void this.engine.sceneManager.switchTo('battle', params);
        }
      })
    );

    this.unsubscribers.push(
      this.engine.eventBus.on('battle:finished', (result?: any) => {
        this.lastBattleResult = result ?? null;
      })
    );

    this.unsubscribers.push(
      this.engine.eventBus.on('battle:exit-to-overview', (overrideResult?: any) => {
        if (this.engine.sceneManager.hasScene('overview')) {
          const payload: OverviewReturnParams = {
            battleResult: overrideResult ?? this.lastBattleResult,
          };
          void this.engine.sceneManager.switchTo('overview', payload);
        }
      })
    );
  }

  public async startInitialScene(): Promise<void> {
    if (this.engine.sceneManager.hasScene('overview')) {
      await this.engine.sceneManager.switchTo('overview');
    } else {
      await this.engine.sceneManager.switchTo('battle');
    }
  }

  public dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
