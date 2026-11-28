# System Architecture

## 1. High-Level Overview

Hexes of Battle is structured around a **strict separation between headless game simulation and visual presentation**. Both the tactical battle engine (`Battle`) and the strategic campaign engine (`OverviewCampaign`) run cleanly in pure Node.js without a DOM or WebGL context, enabling fast Vitest unit testing, Quick Battle resolution, and headless AI-vs-AI batch simulations.

```text
+-------------------------------------------------------------------------+
|                           src/main.ts & src/app.ts                      |
|                        (Bootstrap & Viewport Scaling)                   |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                         Core Runtime (src/core/)                        |
|  GameEngine | SceneManager | EventBus | AssetBundleManager | MusicMgr   |
+------------------+-----------------------------------+------------------+
                   |                                   |
                   v                                   v
+----------------------------------+   +----------------------------------+
|   OverviewScene3D (Global Map)   |   |    BattleScene3D (Tactical)      |
|  - Simulation: OverviewCampaign  |   |  - Simulation: Battle            |
|  - 3D World:   OverviewView3D    |   |  - 3D World:   BattleView3D      |
|  - 2D HUD:     OverviewHud2D     |   |  - 2D HUD:     BattleHud2D       |
|  - Audio:      OverviewAmbient   |   |  - AI:         BaseCPUPlayer     |
+------------------+---------------+   +---------------+------------------+
                   |                                   |
                   +-----------------+-----------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                 Shared Rendering & Platform Layer                       |
|  ThreeRendererHost (single WebGLRenderer)  |  PixiJS 1920x1080 Stage    |
|  HexMap / SeedableRNG / JsonLoader         |  PixiSoundSystem           |
+-------------------------------------------------------------------------+
```

---

## 2. Module Directory Layout

| Directory | Responsibility |
| --- | --- |
| `src/core/` | Engine bootstrap (`GameEngine`), scene transitions (`SceneManager`), typed pub/sub (`EventBus`), campaign↔battle orchestration (`GameFlow`), core vs. battle asset lifecycle (`AssetBundleManager`), lazy-loaded playlists (`MusicManager`), and audio backend (`PixiSoundSystem`). |
| `src/scenes/` | Top-level scene controllers: `OverviewScene3D` (global campaign map) and `BattleScene3D` (3D tactical battlefield). Each implements the `IScene` contract (`enter`, `update`, `resize`, `exit`). |
| `src/battle/` | Pure tactical simulation: `Battle` (`src/battle.ts`), `Creature`, `Ability`, `combat-rules.ts`, `trait-system.ts`, `damage-calculator.ts`, `battle-hex-map-path.ts`, `battle-config-loader.ts`, `save-manager.ts`, `settings.ts`, and AI controllers (`BaseCPUPlayer`, `DefensiveCPUPlayer`, `AggressiveCPUPlayer`, `DumbCPUPlayer`). |
| `src/overview/` | Strategic campaign simulation & UI: `OverviewCampaign`, `overview-map-generator.ts`, `overview-economy.ts`, `overview-save-manager.ts`, `overview-ambient-audio.ts`, and `src/overview/ui/*` (HUD, settlement management, merchant trade, army exchange, battle prompt, region hover banner, faction customization, model explorer). |
| `src/render3d/` | Three.js rendering layer: `ThreeRendererHost`, `ThreeSceneManager`, `BattleView3D`, `HexBoard3D`, `terrain-splatting.ts`, `post-processing.ts`, `decorations/*` (weather, wind, grass, leaves, retreat flags, battle environment), `projectiles/*`, `units/*` (GLB rigged unit loader, custom team-color & banner shader, squad visuals), `overview/*` (global map board, settlements, economy props, water/fog/terrain shaders, marching path arrows), and `debug/three-scene-debugger.ts`. |
| `src/ui/` | Reusable PixiJS battle UI widgets: `TopSidePanel`, `CommonControls`, `UnitStatsPanel`, `EnemyStatsPanel`, `DamagePreviewTooltip`, `TerrainTooltip`, `TurnChangeDisplay`, `PostBattlePanel`, `BattleMenuPanel`, `WeatherDropdown`. |
| `src/shared/` | Math and utility primitives shared by all layers: `HexMap` (odd-r offset hex grid, cube distance, neighbor & direction math, flanking), `SeedableRNG`, `JsonLoader`, `NumMatrix`, `FpsDisplayTracker`, `PinchGestureHandler`. |
| `src/headless/` | CLI batch simulator (`batch-runner.ts`) for automated AI-vs-AI balance testing. |

---

## 3. Dual-Canvas Rendering Pipeline

The application renders two synchronized, layered canvases inside `#game`:

1. **Bottom Layer — Three.js WebGL Canvas (`ThreeRendererHost`)**
   - A single `THREE.WebGLRenderer` instance is created once and shared across `OverviewScene3D` and `BattleScene3D` (preventing WebGL context loss/exhaustion during scene switches).
   - Uses `ACESFilmicToneMapping`, PCF shadow maps, warm directional sunlight + cool hemisphere sky fill, optional tilt-shift post-processing (`PostProcessingManager`), and configurable internal resolution scaling.
2. **Top Layer — PixiJS 2D Canvas (`1920×1080` Logical Stage)**
   - Mounted above the Three.js canvas with transparent background and aspect-preserving letterbox scaling.
   - Organized into explicit render groups so layering is deterministic:
     - `uiRenderGroup`: persistent HUD bars, unit/enemy stats panels, top army/turn header.
     - `uiPlusRenderGroup`: modals (`BattleMenuPanel`, `PostBattlePanel`, `FactionCustomizationPanel`, `SettlementPanel`, `MerchantTradePanel`, `OverviewBattlePromptPanel`), tooltips, turn banners.
     - `uiCursorRenderGroup`: software cursor (`softCursorSprite`) — always rendered **last** so the game cursor stays in front of all 2D UI and modals.

---

## 4. Scene Lifecycle & Handoff Flow

`GameFlow` (`src/core/game-flow.ts`) coordinates transitions via `EventBus` and `SceneManager`:

1. **Startup**: `GameEngine` loads core assets (`AssetBundleManager.loadCoreAssets`), sound groups, `music.json`, `creaturetypes.json`, `abilitytypes.json`, `traits.json`, `combat_config.json`, `global_config.json`, and `regions.json`, then enters `OverviewScene3D`.
2. **Global Map → Battle**:
   - Moving an army onto a hostile army or settlement opens `OverviewBattlePromptPanel` with options: **Quick Battle** (instant headless simulation), **Fight on the Battlefield** (loads `BattleScene3D`), or **Cancel**.
   - After a Quick Battle, the player can **Accept Outcome**, **View Battle** (replays the exact seeded battle in `BattleScene3D` with replay controls), or **Refuse Outcome**.
   - On `overview:start-battle`, `GameFlow` snapshots the engagement (`regionId`, `attackerArmyId`, `defenderArmyId`, `battleConfig`, `replayMode`), calls `AssetBundleManager.loadBattleAssets()`, and transitions to `BattleScene3D`.
3. **Battle → Global Map**:
   - When `Battle` finishes and the player closes `PostBattlePanel`, `BattleScene3D` emits `battle:completed` with a `BattleResult` (victor, surviving creatures, retreated/routed creatures, casualties).
   - `BattleScene3D.exit()` clears battle hooks, disposes 3D scene resources (`disposeBattleRender3DCaches()`), and calls `AssetBundleManager.unloadBattleAssets()`.
   - `OverviewCampaign.applyBattleResult(...)` updates army squads, transfers region ownership on victory, removes defeated armies (preserving any squads that successfully retreated), and re-enters `OverviewScene3D`.

---

## 5. Asset & Audio Management

### Core vs. Battle Asset Bundles (`src/core/asset-manager.ts`)
- **Core Assets** (loaded once at boot, kept across scenes):
  - `ui/hexes-ui-sheet.json`, `ui/hexes_blue_ui_sheet.json` (UI chrome & software cursors)
  - `unitsspritesheet.json` (unit portraits & 2D sprites)
  - `bannersspritesheet.json` & `banners.png` (`528×528` 8×8 heraldic atlas — shared between Global Map and Battle 2D/3D)
  - `GustysSerpentsFontL.xml` (bitmap FPS font)
- **Battle Assets** (loaded on entering `BattleScene3D`, unloaded on exit):
  - `stars.jpg`, `hexagon_selections.json`, `hex_terrain.json`, trait/skill/morale icon PNGs, and battle SFX (`arrow`, `die`, `move`, `sword`).

### Music & Sound Systems
- **`MusicManager` (`src/core/music-manager.ts`)**:
  - Reads `public/music.json` (`global` and `battle` playlists).
  - Lazily fetches and decodes **only the single active track**; stops and removes the previous track from `@pixi/sound` when switching tracks or modes, or when volume drops to `0`.
  - Uses Fisher-Yates shuffling without immediate repeats when cycling playlists.
- **`PixiSoundSystem` (`src/core/sound-system.ts`)**:
  - Loads event mappings from `public/sounds.json` and randomized sound groups from `public/combat_config.json` (`soundGroups`).
  - Supports pitch/speed randomization and squad-size volume scaling for arrow volleys (`arrowVolley`), movement step sounds, UI hover/click sounds, and global map army selection/attack commands.

---

## 6. Data-Driven Configuration Catalog (`public/`)

| File | Purpose |
| --- | --- |
| `combat_config.json` | Max turns, terrain move/stamina costs and combat buffs, stamina costs & exhaustion thresholds/penalties, retaliation multipliers, facing bonuses, ranged scatter, morale breakpoints & cascades, wind parameters, sound groups, arrow volley settings. |
| `creaturetypes.json` | Definitions for all 12 unit types: model count, per-model HP, tier, attack/defense, movement, range, ammo, stamina, morale, traits, ability IDs, and animation timing (`ranged_projectile_delay_frames`). |
| `traits.json` | Trait metadata, icons, descriptions, and tuning parameters (`ShieldBlock`, `SpearWall`, `VolleyFire`, `ImpreciseVolley`, `FragileLine`, `ArmorPenetration`, `Cavalry`, `Charge`). |
| `abilitytypes.json` | Active skills (`Patch up`, `Pick-up ammo`, `Throw javelin`, `Quick draw`, `Mend wounds`), target rules, ranges, damage/heal values, and resource costs. |
| `global_config.json` | Default player faction (`The Count of Ekkina`), enemy factions (`Knights of the Grand Duke`, `House of Ironvale`, `Barony of Ravenscroft`, `Order of the Pale Sun`), and neutral faction (`Neutral`, gray banner `banner17.png`). |
| `regions.json` | Curated medieval European region names split into `reserved` (home regions) and `common` pools for procedural campaign map generation. |
| `music.json` | Mode-scoped `global` and `battle` music playlists. |
| `sounds.json` | Sound effect aliases and URLs for UI, combat, and global map commands (`army_select_own`, `army_select_enemy`, `army_issue_attack`, etc.). |
| `ambient-sounds.json` | Environmental ambient audio configuration for global map regions/terrains. |
| `scenarios.json` & `default-battle.json` | Standalone tactical battle presets and terrain/unit layouts. |
| `bannersspritesheet.json` & `banners.png` | `528×528` spritesheet containing 64 `64×64` heraldic banners (`banner1.png`–`banner64.png`). |

---

## 7. Testing & Simulation Architecture

- **Unit & Integration Tests (Vitest)**: Test suites co-located under `src/battle/*.test.ts`, `src/overview/overview.test.ts`, `src/render3d/render3d.test.ts`, and `src/core/*.test.ts`. Tests run in Node without WebGL using mocked render hosts and Pixi containers.
- **Headless Batch Simulator (`npm run simulate`)**: Runs `src/headless/batch-runner.ts` to execute deterministic seeded battles between configurable AI personalities and collect win-rate, turn-count, and casualty metrics.
