import { disposeSharedBannersTexture } from './decorations/retreat-flag-3d';
import { disposeBarbarianTextureCaches } from './units/barbarian-textures';
import { disposeHumanoidTextureCaches } from './units/humanoid-unit-textures';
import { disposeMoraleImageCache } from './units/squad-visual-3d';
import { disposeTreeTextureCaches } from './units/tree-textures';
import { disposeUnitMeshBuilderCaches } from './units/unit-mesh-builder';

/**
 * Disposes and clears all module-level Three.js caches and shared textures
 * allocated for battle rendering. Call when exiting battle mode to free GPU
 * and CPU memory before switching to another 3D scene (e.g., overview map).
 */
export function disposeBattleRender3DCaches(): void {
  disposeUnitMeshBuilderCaches();
  disposeHumanoidTextureCaches();
  disposeBarbarianTextureCaches();
  disposeTreeTextureCaches();
  disposeMoraleImageCache();
  disposeSharedBannersTexture();
}
