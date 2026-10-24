import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock("@pixi/sound", () => ({
  sound: {
    play: vi.fn(),
    stop: vi.fn(),
    volume: vi.fn(),
  },
}));

import * as THREE from 'three';
import { BattleSettings, HexDisplaySettings } from './settings';
import { Creature, CreatureType } from './creature';
import { UnitVisualFactory } from '../render3d/units/unit-visual-factory';
import {
  INDICATOR_ICON_PATHS,
  drawHealthVector,
  drawStaminaVector,
  drawMoraleIndicatorVector,
  drawIndicatorIcon,
  createDamageIndicatorCanvas,
} from '../ui/indicator-icon-utils';
import { DamageValueCollection } from '../ui/damage-value-display';
import { Container } from 'pixi.js';

describe('Show Damage Indicators Feature', () => {
  let localStorageStore: Record<string, string> = {};
  let originalDocument: any;
  let originalImage: any;

  beforeEach(() => {
    localStorageStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 30 }),
    };

    originalDocument = (globalThis as any).document;
    originalImage = (globalThis as any).Image;

    class MockImage {
      src = '';
      complete = false;
      naturalWidth = 0;
    }

    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 160,
            height: 48,
            getContext: vi.fn().mockReturnValue(mockCtx),
          };
        }
        return {};
      }),
    };
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (globalThis as any).document = originalDocument;
    (globalThis as any).Image = originalImage;
  });

  describe('1. Settings & Persistence', () => {
    it('should default showDamageIndicators to enabled (true)', () => {
      const hexSettings = new HexDisplaySettings();
      expect(hexSettings.showDamageIndicators).toBe(true);

      const settings = new BattleSettings();
      expect(settings.hex.showDamageIndicators).toBe(true);
    });

    it('should persist showDamageIndicators to localStorage on save', () => {
      const settings = new BattleSettings();
      settings.hex.showDamageIndicators = false;
      settings.save();

      expect(localStorage.getItem('hob.hex.showDamageIndicators')).toBe('false');

      const loaded = new BattleSettings();
      loaded.load();
      expect(loaded.hex.showDamageIndicators).toBe(false);
    });

    it('should correctly restore enabled setting from localStorage', () => {
      localStorage.setItem('hob.hex.showDamageIndicators', 'true');
      const settings = new BattleSettings();
      settings.load();
      expect(settings.hex.showDamageIndicators).toBe(true);
    });
  });

  describe('2. Indicator Icons & Canvas Rendering', () => {
    it('should define icon paths for health, stamina, and morale', () => {
      expect(INDICATOR_ICON_PATHS.health).toBe('indicators/health.png');
      expect(INDICATOR_ICON_PATHS.stamina).toBe('indicators/stamina.png');
      expect(INDICATOR_ICON_PATHS.morale).toBe('indicators/morale.png');
    });

    it('should draw vector shapes for health, stamina, and morale without errors', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      // Health
      expect(() => drawHealthVector(mockCtx, 0, 0, 48, false)).not.toThrow();
      expect(() => drawHealthVector(mockCtx, 0, 0, 48, true)).not.toThrow();

      // Stamina
      expect(() => drawStaminaVector(mockCtx, 0, 0, 48, false)).not.toThrow();
      expect(() => drawStaminaVector(mockCtx, 0, 0, 48, true)).not.toThrow();

      // Morale
      expect(() => drawMoraleIndicatorVector(mockCtx, 0, 0, 48, false)).not.toThrow();
      expect(() => drawMoraleIndicatorVector(mockCtx, 0, 0, 48, true)).not.toThrow();

      // Dispatcher
      expect(() => drawIndicatorIcon(mockCtx, 'health', 0, 0, 26, false)).not.toThrow();
      expect(() => drawIndicatorIcon(mockCtx, 'stamina', 0, 0, 26, true)).not.toThrow();
      expect(() => drawIndicatorIcon(mockCtx, 'morale', 0, 0, 26, false)).not.toThrow();
    });

    it('should create high-DPI canvas texture for damage indicators with +/- sign and icon', () => {
      const canvasLoss = createDamageIndicatorCanvas('health', -12);
      expect(canvasLoss).not.toBeNull();
      expect(canvasLoss?.width).toBe(160);
      expect(canvasLoss?.height).toBe(48);

      const canvasGain = createDamageIndicatorCanvas('stamina', 5);
      expect(canvasGain).not.toBeNull();
      expect(canvasGain?.width).toBe(160);
      expect(canvasGain?.height).toBe(48);

      const canvasMorale = createDamageIndicatorCanvas('morale', -1);
      expect(canvasMorale).not.toBeNull();
      expect(canvasMorale?.width).toBe(160);
      expect(canvasMorale?.height).toBe(48);
    });
  });

  describe('3. SquadVisual3D Damage Indicators', () => {
    it('should default showDamageIndicators to true on squad visual', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(creature);

      expect(squad.showDamageIndicators).toBe(true);
      expect(squad.hasActiveEffects).toBe(false);
    });

    it('should trigger a health damage indicator when creature loses health', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.remaining_health = 50;
      const squad = factory.createSquadVisual(creature);

      expect(squad.hasActiveEffects).toBe(false);

      // Take 15 damage
      creature.stats.remaining_health = 35;
      squad.updateStats();

      expect(squad.hasActiveEffects).toBe(true);
    });

    it('should trigger a stamina indicator when creature gains or spends stamina', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.stamina = 10;
      const squad = factory.createSquadVisual(creature);

      expect(squad.hasActiveEffects).toBe(false);

      // Spend 3 stamina
      creature.stats.stamina = 7;
      squad.updateStats();
      expect(squad.hasActiveEffects).toBe(true);

      // Advance time to clear
      const dummyCamera = new THREE.PerspectiveCamera();
      squad.update(450, dummyCamera);
      expect(squad.hasActiveEffects).toBe(false);

      // Recover 5 stamina
      creature.stats.stamina = 12;
      squad.updateStats();
      expect(squad.hasActiveEffects).toBe(true);
    });

    it('should trigger a morale indicator when creature gains or loses morale', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.morale = 10;
      const squad = factory.createSquadVisual(creature);

      expect(squad.hasActiveEffects).toBe(false);

      // Gain +2 morale (e.g. killing blow)
      creature.stats.morale = 12;
      squad.updateStats();
      expect(squad.hasActiveEffects).toBe(true);
    });

    it('should NOT trigger damage indicators when showDamageIndicators is disabled', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      creature.stats.remaining_health = 50;
      creature.stats.stamina = 10;
      creature.stats.morale = 10;
      const squad = factory.createSquadVisual(creature);

      squad.showDamageIndicators = false;

      // Mutate stats
      creature.stats.remaining_health = 30;
      creature.stats.stamina = 5;
      creature.stats.morale = 8;
      squad.updateStats();

      expect(squad.hasActiveEffects).toBe(false);
    });

    it('should animate damage indicator upwards over 400ms and remove on completion', () => {
      const factory = new UnitVisualFactory();
      const creature = new Creature(CreatureType.SWORDSMAN);
      const squad = factory.createSquadVisual(creature);

      squad.addDamageIndicator('health', -10);
      expect(squad.hasActiveEffects).toBe(true);

      const dummyCamera = new THREE.PerspectiveCamera();

      // Update 200ms (halfway)
      squad.update(200, dummyCamera);
      expect(squad.hasActiveEffects).toBe(true);

      // Update remaining 205ms (exceeding 400ms)
      squad.update(205, dummyCamera);
      expect(squad.hasActiveEffects).toBe(false);
    });
  });

  describe('4. 2D DamageValueDisplay Duration', () => {
    it('should use 400ms duration for 2D damage value displays', () => {
      const view = new Container();
      const collection = new DamageValueCollection();
      collection.addDamageValue('-10', view, { x: 100, y: 100 });

      // After 200ms, should still be alive
      collection.update(200);
      expect((collection as any).damageValues.length).toBe(1);

      // After 205ms more (total > 400ms), should expire
      collection.update(205);
      expect((collection as any).damageValues.length).toBe(0);
    });
  });
});
