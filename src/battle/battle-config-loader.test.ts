import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CreatureRepository } from './creature-repository';
import { CreatureType } from './creature';
import { HexDirection } from '../shared/hex-map';
import { BattleConfigJson, buildBattleConfigFromJson, fitBattleConfigToMapSize } from './battle-config-loader';
import { APPROVED_BATTLE_MAP_SIZES, BattleSettings, resolveBattleMapSize } from './settings';
import { Ability } from './ability';
import { CreatureTemplate } from './creature';

describe('BattleConfigLoader & default-battle.json', () => {
  it('should load public/default-battle.json and build a full BattleConfig with all 14 units', () => {
    const defaultBattleJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/default-battle.json'), 'utf-8')
    ) as BattleConfigJson;
    const abilities = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/abilitytypes.json'), 'utf-8')
    ) as Ability[];
    const templates = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/creaturetypes.json'), 'utf-8')
    ) as CreatureTemplate[];

    const repo = new CreatureRepository();
    repo.setAbilities(abilities);
    repo.setCreatureTemplates(templates);

    const config = buildBattleConfigFromJson(defaultBattleJson, repo);

    expect(config.mapWidth).toBe(10);
    expect(config.mapHeight).toBe(7);
    expect(config.creatures.length).toBe(14);

    const army0 = config.creatures.filter((c) => c.armyAlignment === 0);
    const army1 = config.creatures.filter((c) => c.armyAlignment === 1);
    expect(army0.length).toBe(8);
    expect(army1.length).toBe(6);

    const knight = army0.find((c) => c.creatureType === CreatureType.ARMORED_KNIGHT);
    expect(knight).toBeDefined();
    expect(knight!.position).toEqual({ x: 2, y: 2 });
    expect(knight!.facingDirection).toBe(HexDirection.EAST);
    expect(knight!.stats.num_moves).toBe(6);
    expect(knight!.stats.remaining_movement).toBe(6);

    const swordsman = army1.find((c) => c.creatureType === CreatureType.SWORDSMAN);
    expect(swordsman).toBeDefined();
    expect(swordsman!.position).toEqual({ x: 4, y: 4 });
    expect(swordsman!.facingDirection).toBe(HexDirection.WEST);
  });

  it('should default BattleSettings to 10x7, support preapproved 10x7 and 13x9 map sizes, and fit placements within bounds', () => {
    expect(APPROVED_BATTLE_MAP_SIZES.map((s) => s.id)).toEqual(['10x7', '13x9']);
    const settings = new BattleSettings();
    expect(settings.battleMapSize).toBe('10x7');
    expect(settings.getBattleMapDimensions()).toEqual({ mapWidth: 10, mapHeight: 7 });

    settings.setBattleMapSize('13x9');
    expect(settings.getBattleMapDimensions()).toEqual({ mapWidth: 13, mapHeight: 9 });
    expect(resolveBattleMapSize('invalid').id).toBe('10x7');

    const defaultBattleJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/default-battle.json'), 'utf-8')
    ) as BattleConfigJson;
    const abilities = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/abilitytypes.json'), 'utf-8')
    ) as Ability[];
    const templates = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/creaturetypes.json'), 'utf-8')
    ) as CreatureTemplate[];

    const repo = new CreatureRepository();
    repo.setAbilities(abilities);
    repo.setCreatureTemplates(templates);
    const config = buildBattleConfigFromJson(defaultBattleJson, repo);
    // Move one creature outside 10x7 to test clamping/fitting
    config.creatures[0].position = { x: 12, y: 8 };
    const fitted = fitBattleConfigToMapSize(config, 10, 7);
    expect(fitted.mapWidth).toBe(10);
    expect(fitted.mapHeight).toBe(7);
    for (const c of fitted.creatures) {
      expect(c.position.x).toBeGreaterThanOrEqual(0);
      expect(c.position.x).toBeLessThan(10);
      expect(c.position.y).toBeGreaterThanOrEqual(0);
      expect(c.position.y).toBeLessThan(7);
    }
  });
});
