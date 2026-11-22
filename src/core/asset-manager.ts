import { Assets } from 'pixi.js';
import { sound } from '@pixi/sound';
import { GameAssets } from './scene';
import { PixiSoundSystem } from './sound-system';

export const BATTLE_ICON_PATHS: string[] = [
  'traits/icon_shield_block.png',
  'traits/icon_spear_wall.png',
  'traits/icon_volley_fire.png',
  'traits/icon_fragile_line.png',
  'traits/icon_armor_penetration.png',
  'traits/icon_cavalry.png',
  'traits/icon_charge.png',
  'skills/icon_patch_up.png',
  'skills/icon_pickup_ammo.png',
  'skills/icon_throw_javelin.png',
  'skills/icon_quick_draw.png',
  'skills/icon_mend_wounds.png',
  'morale/morale_high.png',
  'morale/morale_steady.png',
  'morale/morale_wavering.png',
  'morale/morale_panicked.png',
  'morale/morale_routing.png',
];

export const BATTLE_SHEET_PATHS: string[] = [
  'stars.jpg',
  'hexagon_selections.json',
  'hex_terrain.json',
  'bannersspritesheet.json',
];

export const BATTLE_SOUND_ASSETS: Array<{ alias: string; url: string }> = [
  { alias: 'arrow', url: 'audio/arrow.ogg' },
  { alias: 'die', url: 'audio/die.ogg' },
  { alias: 'move', url: 'audio/move.ogg' },
  { alias: 'sword', url: 'audio/sword.ogg' },
];

/**
 * Manages loading and unloading of shared core assets vs. scene-scoped
 * battle assets and audio so resources can be freed when leaving battle mode.
 */
export class AssetBundleManager {
  private coreAssetsLoaded = false;
  private battleAssetsLoaded = false;
  private battleSoundsLoaded = false;

  public async loadCoreAssets(assets: GameAssets): Promise<void> {
    if (this.coreAssetsLoaded) return;

    assets.uiSheet = await Assets.load('ui/hexes-ui-sheet.json');
    assets.uiSheet2 = await Assets.load('ui/hexes_blue_ui_sheet.json');
    assets.unitsSheet = await Assets.load('unitsspritesheet.json');

    if (assets.uiSheet?.textures) {
      assets.softCursorTextures['default'] = assets.uiSheet.textures['cur_gs_arrow.png'];
      assets.softCursorTextures['attack_melee'] = assets.uiSheet.textures['cursor_sword.png'];
      assets.softCursorTextures['attack_melee_e'] = assets.uiSheet.textures['cursor_sword_e.png'];
      assets.softCursorTextures['attack_melee_w'] = assets.uiSheet.textures['cursor_sword_w.png'];
      assets.softCursorTextures['attack_melee_ne'] = assets.uiSheet.textures['cursor_sword_ne.png'];
      assets.softCursorTextures['attack_melee_nw'] = assets.uiSheet.textures['cursor_sword_nw.png'];
      assets.softCursorTextures['attack_melee_se'] = assets.uiSheet.textures['cursor_sword_se.png'];
      assets.softCursorTextures['attack_melee_sw'] = assets.uiSheet.textures['cursor_sword_sw.png'];
      assets.softCursorTextures['attack_ranged'] = assets.uiSheet.textures['cursor_arrow.png'];
    }

    try {
      await Assets.load('./GustysSerpentsFontL.xml');
    } catch {
      // Ignore if offline/headless
    }

    this.coreAssetsLoaded = true;
  }

  public async loadCoreSounds(soundSystem: PixiSoundSystem): Promise<void> {
    await soundSystem.loadUISounds();
  }

  public async loadBattleAssets(assets: GameAssets): Promise<void> {
    if (this.battleAssetsLoaded) return;

    assets.terrainTexture = await Assets.load('stars.jpg');
    assets.hexagonSheet = await Assets.load('hexagon_selections.json');
    assets.terrainSheet = await Assets.load('hex_terrain.json');
    if (!assets.unitsSheet) {
      assets.unitsSheet = await Assets.load('unitsspritesheet.json');
    }
    assets.bannersSheet = await Assets.load('bannersspritesheet.json');

    try {
      await Assets.load(BATTLE_ICON_PATHS);
    } catch {
      // Ignore if offline/headless
    }

    this.battleAssetsLoaded = true;
  }

  public async unloadBattleAssets(assets: GameAssets): Promise<void> {
    if (!this.battleAssetsLoaded) return;

    assets.terrainTexture = undefined;
    assets.hexagonSheet = undefined;
    assets.terrainSheet = undefined;
    assets.bannersSheet = undefined;

    try {
      if (typeof Assets.unload === 'function') {
        await Assets.unload([...BATTLE_SHEET_PATHS, ...BATTLE_ICON_PATHS]);
      }
    } catch {
      // Ignore if already unloaded or running in mock/headless test environment
    }

    this.battleAssetsLoaded = false;
  }

  public async loadBattleSounds(soundSystem: PixiSoundSystem): Promise<void> {
    if (this.battleSoundsLoaded) return;

    for (const entry of BATTLE_SOUND_ASSETS) {
      if (typeof (sound as any).exists !== 'function' || !(sound as any).exists(entry.alias)) {
        await sound.add(entry.alias, entry.url);
      }
    }
    await soundSystem.loadSoundGroups();
    this.battleSoundsLoaded = true;
  }

  public unloadBattleSounds(): void {
    if (!this.battleSoundsLoaded) return;

    try {
      for (const entry of BATTLE_SOUND_ASSETS) {
        if (typeof (sound as any).exists === 'function' && (sound as any).exists(entry.alias)) {
          sound.remove(entry.alias);
        }
      }
    } catch {
      // Ignore in mocked/headless test environments
    }

    this.battleSoundsLoaded = false;
  }

  public isBattleAssetsLoaded(): boolean {
    return this.battleAssetsLoaded;
  }
}
