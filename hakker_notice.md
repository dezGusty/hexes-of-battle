# Hakker notice: Hexes of Battle in full 3D

Hi! This pull request adds a fan-made 3D visual edit of Hexes of Battle, in the folder `fan-3d/`. Nothing in `src/`, `public/` or the game rules is changed.

Play it online: <https://yoonutz.github.io/hexes-of-battle-3d/>

## What it changes

- Soldiers are real 3D models instead of flat sprites: blue or red per army, each unit type with its own kit (pitchfork, bow, sword and shield, spear, crossbow, axe, halberd, sling, a stone giant for the behemoth).
- Faces, hair and beards, mail and plate that reflect the sky, knees that bend when walking, and four different looks per unit type, so a squad is not a row of clones.
- The HUD portraits are rendered from the 3D models.
- Trees on forest tiles, reeds on swamps, rocks on hills, flowing water, a sky and horizon, sun shadows.
- Camera rotation: right-click and drag, the Q and E keys, or the three buttons at the bottom right. A plain right-click still attacks as before.
- The HUD sticks to the screen edges on any window shape, instead of floating as one 16:9 block in the top-left corner.

## How to run it

It is a ready-built static site, so no install or build step is needed.

1. Clone this branch.
2. Serve the `fan-3d` folder with any static web server. For example, with Node.js installed:

   ```bash
   npx http-server fan-3d -p 8080 -c-1
   ```

3. Open <http://localhost:8080> in a browser.

Opening `fan-3d/index.html` straight from disk does not work, because browsers block game modules and assets on `file://` pages.

## How it works

- `fan-3d/hob3d.js` holds all the new code: 3D soldiers, portraits, terrain props, sky, camera controls and HUD anchoring.
- `fan-3d/assets/` is your v0.20.4 production build with a few small hooks that call `hob3d.js`. Every hook checks that the add-on is there, so the game falls back to its normal visuals without it.
- `fan-3d/tools/patch-bundle.mjs` applies those hooks. Running it on a fresh copy of your v0.20.4 build reproduces this exact bundle, so you can see every change made to it.

If you like any of it, the natural next step would be to move `hob3d.js` into `src/render3d/` as proper TypeScript modules, for example a rigid-mesh unit visual for `unit-visual-factory.ts`. The game already has an unused `FULL_3D_RIGID` path ready for exactly that.

## Credits

The original game, its rules and its art are by dezGusty, under the MIT licence in this repository. This edit only adds visuals and keeps that licence.
