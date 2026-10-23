import { Application, Container, Spritesheet, Texture } from 'pixi.js';
import { EventBus } from './event-bus';
import { BattleSettings } from '../battle/settings';
import { Ability } from '../battle/ability';
import { CreatureTemplate } from '../battle/creature';
import { CombatConfig } from '../battle/combat-rules';
import { TraitsConfig } from '../battle/trait-system';
import { ISoundSystem } from './sound-system';

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

export interface HudConfig {
  grid?: {
    showGrid?: boolean;
    borderThickness?: number;
    borderColor?: string;
    borderOpacity?: number;
  };
  gridBorderThickness?: number;
  gridBorderColor?: string;
  showGrid?: boolean;
  coordinates?: {
    showCoords?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
  fps?: {
    showFps?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    alpha?: number;
    x?: number;
    y?: number;
  };
  showFps?: boolean;
  hotkeys?: {
    printPathPreview?: string;
    rest?: string;
    nextTurn?: string;
    nextUnit?: string;
    resetCamera?: string;
    toggleStats?: string;
  };
  keybindings?: {
    printPathPreview?: string;
    rest?: string;
    nextTurn?: string;
    nextUnit?: string;
    resetCamera?: string;
    toggleStats?: string;
  };
  healthbars?: {
    showHealthbars?: boolean;
  };
  tooltips?: {
    enabled?: boolean;
  };
}

export interface GameTemplates {
  abilityTypes: Ability[];
  creatureTemplates: CreatureTemplate[];
  combatConfig?: CombatConfig;
  scenarios?: any[];
  hudConfig?: HudConfig;
  traitsConfig?: TraitsConfig;
}

export interface GameContext {
  app: Application;
  stage: Container;
  eventBus: EventBus;
  assets: GameAssets;
  templates: GameTemplates;
  settings: BattleSettings;
  soundSystem?: ISoundSystem;
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
