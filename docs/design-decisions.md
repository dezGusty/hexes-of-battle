# Key Design Decisions

This document captures the major architectural and engineering decisions in **Hexes of Battle**, along with the rationale and trade-offs behind each choice.

---

## 1. Headless Simulation Decoupled from Rendering

- **Decision**: Keep `Battle` (`src/battle.ts`), `OverviewCampaign` (`src/overview/overview-campaign.ts`), `damage-calculator.ts`, `trait-system.ts`, and all AI controllers completely free of DOM, PixiJS, and Three.js dependencies. Communication with views happens via lightweight callback hooks (`hookDoingAttack`, `hookNextTurn`, `hookUnitRetreated`, etc.) and dirty-state flags (`MapRenderUpdate`).
- **Why**:
  - Enables **Quick Battle** to run the exact same tactical simulation instantaneously on the global map, and **View Battle** to replay the identical battle using the same `SeedableRNG` seed.
  - Enables fast headless Vitest tests (`npm test`) and automated AI balance runs (`npm run simulate`) without a browser or WebGL context.
  - Prevents rendering bugs from corrupting game state.
- **Trade-off**: Views must explicitly subscribe to hooks and sync visual state (e.g., `BattleView3D.update()` polling `battle.nextRenderUpdate`).

---

## 2. Single Shared `ThreeRendererHost` Across Scenes

- **Decision**: Maintain one `THREE.WebGLRenderer` in `ThreeRendererHost` (`src/render3d/three-renderer-host.ts`) and attach/detach its canvas across `OverviewScene3D` and `BattleScene3D`, rather than creating a new renderer per scene.
- **Why**: Browsers enforce strict limits on active WebGL contexts (typically 8–16). Repeatedly entering and exiting battles would quickly trigger context loss or GPU memory leaks.
- **Trade-off**: Scene transitions must carefully dispose scene-scoped geometries, materials, and module-level caches (`disposeBattleRender3DCaches()`) while preserving the shared renderer and core textures.

---

## 3. Pure-Pixi 2D UI & Cursor Layer Ordering

- **Decision**: Render all in-game HUD elements, tooltips, and modals (including text inputs like `BattleMenuPanel` save naming and `FactionCustomizationPanel` faction naming) in PixiJS inside `uiRenderGroup` and `uiPlusRenderGroup`, positioned strictly below `uiCursorRenderGroup`.
- **Why**:
  - DOM `<input>` overlays sit above the WebGL/Pixi canvas in the browser stacking context, causing the custom software cursor (`softCursorSprite`) to disappear *behind* text fields.
  - Pure-Pixi keyboard listeners (`window.addEventListener('keydown', ...)`) keep cursor rendering, scaling, and visual styling 100% consistent across all resolutions.
- **Trade-off**: Pure-Pixi text inputs implement basic editing (typing, Backspace, Ctrl+Backspace, Enter, Escape, clear button) rather than full OS IME/clipboard selection.

---

## 4. Unified 2D/3D Heraldic Banner Pipeline (`528×528` Atlas)

- **Decision**: Store all 64 heraldic banners (`banner1.png`–`banner64.png`, each `64×64` with 1px padding on an 8×8 grid) in a single `528×528` atlas (`public/banners.png` + `public/bannersspritesheet.json`), loaded once as a core asset in PixiJS and shared with Three.js via `initSharedBannersTextureFromPixi()`.
- **Why**:
  - A single atlas keeps GPU draw calls low and lets rigged GLB units sample any faction banner in their custom fragment shader (`applyRiggedTeamAndBannerShader`) via a `vec4 uBannerUvTransform` uniform, without cloning geometry or textures per unit.
  - Converting PixiJS's `ImageBitmap` to an offscreen `HTMLCanvasElement` before creating the `THREE.Texture` avoids a WebGL spec quirk where `UNPACK_FLIP_Y_WEBGL` is ignored for `ImageBitmap` sources (which would otherwise invert the atlas vertically).
  - Live change listeners (`onSharedBannersTextureChange`) and cache invalidation in `unit-mesh-builder.ts` guarantee unit shields and flags never retain stale or disposed texture references across scene switches or faction customizations.

---

## 5. Single-Material Rigged GLB Units with Vertex-Color Masking

- **Decision**: Rigged 3D units (`peasant`, `swordsman`, `spearman`, `archer`, `crossbowman`, `maceman`, `armored_knight`) use Blender-exported GLB meshes with a custom `onBeforeCompile` shader (`applyRiggedTeamAndBannerShader`) that reads:
  - Vertex color `.r` (`vTeamBannerMask.x`) to tint faction cloth/garments with `uTeamColor`.
  - Vertex color `.g` (`vTeamBannerMask.y`) + secondary UV channel `uv1` to stamp the faction's heraldic banner onto shields/tabards.
- **Why**: Allows sharing a single GLB asset and geometry across all factions (player, AI rivals, neutral militias) with zero per-faction model duplication, while supporting runtime color and banner customization.

---

## 6. Lazy-Loaded, Mode-Scoped Music & Audio

- **Decision**: Load only one music track at a time in `MusicManager`, unloading it from `@pixi/sound` upon track completion, mode switch (`global` ↔ `battle`), or mute.
- **Why**: Full-length OGG music tracks (~3–4 MB each) would consume tens of megabytes of decoded PCM memory if preloaded eagerly. Lazy single-track loading keeps startup fast and memory usage bounded while still supporting randomized, configurable playlists via `public/music.json`.

---

## 7. Data-Driven Balance Configuration

- **Decision**: Externalize unit stats (`creaturetypes.json`), terrain/stamina/morale/retaliation rules (`combat_config.json`), traits (`traits.json`), active skills (`abilitytypes.json`), factions (`global_config.json`), region names (`regions.json`), and audio (`music.json`, `sounds.json`) into `public/*.json` files, with TypeScript defaults as fallbacks.
- **Why**: Enables rapid gameplay tuning and modding without recompiling TypeScript, and guarantees that combat calculations, AI heuristics, terrain tooltips, and damage preview tooltips all read from the exact same source of truth.

---

## 8. Deterministic Damage Preview Sharing Combat Math

- **Decision**: Both live combat (`executeAttackCalculation`) and hover tooltips (`computeDamagePreview`) share the same helper functions in `src/battle/damage-calculator.ts` and `src/battle/trait-system.ts` (`resolveFlankAndFacingBonus`, `computeSurroundedArmorPenalty`, `computeVirtualLiveStatsAt`, `calculateDamageWithTraits`).
- **Why**: Prevents drift between what the hover tooltip promises and what actually happens on click — including move-and-attack path stamina/exhaustion, virtual approach hexes for flanking and isolation penalties, terrain buffs, and active skills (`Quick draw`, `Throw javelin`).

---

## 9. Shortest-Path Retreat & Rest-by-Default Integration

- **Decision**: Compute unit retreats with Dijkstra shortest-path navigation (`findRetreatPath`) ordered closest-to-retreat-point first with a bounded multi-pass loop, matching normal movement rules for high-cost terrain (Hills/Swamps) and preserving `remaining_movement` when an ordered-retreat unit takes 0 steps.
- **Why**:
  - Greedy 1-step retreat caused units to freeze behind friendlies, water, or hills (`moveCost = 3` for 2-move units).
  - Preserving `remaining_movement` on 0-step turns integrates cleanly with turn-end rest-by-default so exhausted (`DEPLETED`) retreating units automatically recover stamina and resume retreating on the next turn.
