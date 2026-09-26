import { Application, Container, Spritesheet, Texture } from 'pixi.js';
import { EventBus } from './event-bus';
import { BattleSettings } from '../battle/settings';
import { Ability } from '../battle/ability';
import { CreatureTemplate } from '../battle/creature';

export interface GameAssets {
  terrainTexture?: Texture;
  hexagonSheet?: Spritesheet;
  terrainSheet?: Spritesheet;
  unitsSheet?: Spritesheet;
  uiSheet?: Spritesheet;
  uiSheet2?: Spritesheet;
  bannersSheet?: Spritesheet;
  softCursorTextures: Record<string, Texture>;
}

export interface GameTemplates {
  abilityTypes: Ability[];
  creatureTemplates: CreatureTemplate[];
}

export interface GameContext {
  app: Application;
  stage: Container;
  eventBus: EventBus;
  assets: GameAssets;
  templates: GameTemplates;
  settings: BattleSettings;
  nativeResolution: { width: number; height: number };
  switchToScene: (sceneName: string, params?: any) => Promise<void>;
}

export interface Scene {
  readonly name: string;
  readonly container: Container;

  enter(context: GameContext, params?: any): Promise<void> | void;
  update(deltaMS: number): void;
  resize?(width: number, height: number): void;
  exit(): Promise<void> | void;
  destroy?(): void;
}
