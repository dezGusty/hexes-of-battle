# Hexes of Battle — Technical Documentation

**Hexes of Battle** (`v0.32.0`) is a turn-based medieval strategy and hex-grid tactical combat game built with **TypeScript**, **Three.js** (3D world & rigged units), **PixiJS v8** (2D HUD, tooltips, and modals), and **Vite**.

It combines a strategic **Global Map Campaign** (regions, settlements, resources, recruitment, factions, and marching armies) with **3D Tactical Hex Battles** (squad-based medieval combat with stamina, morale, flanking, terrain modifiers, traits, active skills, and AI opponents).

## Documentation Index

| Document | Contents |
| --- | --- |
| [Architecture](./architecture.md) | System layers, module layout, hybrid Three.js + PixiJS rendering pipeline, scene lifecycle, asset/audio management, JSON configuration catalog, and testing setup. |
| [Design Decisions](./design-decisions.md) | Rationale and trade-offs behind key architectural, rendering, audio, UI, and simulation choices. |
| [Game Rules](./game-rules.md) | Complete rules reference for Tactical Battles (combat math, terrain, flanking, isolation, stamina, morale, retreat, units, traits, skills, AI) and the Global Map Campaign (factions, regions, economy, armies, battle handoff). |
| [Building & Deploying](./building.and.deploying.md) | Quick notes on building and deploying to GitHub Pages. |

## Quick Start

```bash
# Install dependencies
npm install

# Run local development server (Vite)
npm run dev

# Type-check and build production bundle
npm run build

# Run the Vitest unit test suite
npm test

# Run headless AI-vs-AI battle simulations
npm run simulate
```

## Core Technology Stack

- **Language & Build**: TypeScript (`~7.0`), Vite (`~8.3`), Vitest (`~5.0`)
- **3D Rendering**: Three.js (`~0.186`) — custom hex terrain splatting, GLB rigged units with skeletal animation, dynamic wind/weather/post-processing
- **2D HUD & UI**: PixiJS (`~8.5`), `@pixi/ui`, `pixi-filters`
- **Audio**: `@pixi/sound` (`~6.0`) — lazy-loaded mode-scoped music playlists and grouped/spatialized combat & UI SFX
- **Debugging**: `lil-gui` (`ThreeSceneDebugger`) and in-game `ModelExplorerPanel`
