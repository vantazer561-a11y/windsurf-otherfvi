# OTHERFVI — CS 1.6 inspired browser FPS

3D first-person shooter in the spirit of Counter-Strike 1.6, running in the browser.

## Stack

- TypeScript + Vite
- Three.js (rendering, raycasting)
- Web Audio (synthesized sound)

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173 and click **CLICK TO PLAY**.

## Architecture

All modules are factories that consume an `Engine` and produce an API. They wire together in [`src/main.ts`](src/main.ts). Shared types live in [`src/engine/types.ts`](src/engine/types.ts) — these are the public contracts between modules.

| Folder              | Owner   | Responsibility                                                |
| ------------------- | ------- | ------------------------------------------------------------- |
| `src/engine/`       | Task 1  | Scene, renderer, raycast, AABB world colliders, entity registry |
| `src/player/`       | Task 1  | Pointer-lock input, WASD movement, jump/crouch, AABB physics  |
| `src/map/`          | Task 2  | de_dust2-inspired box geometry, spawns, lighting, skybox      |
| `src/weapons/`      | Task 3  | AK/M4/AWP/USP/Glock/knife with CS 1.6 stats, recoil, reload   |
| `src/hud/`          | Task 3  | Health/armor/ammo/money/crosshair/kill-feed/buy-menu DOM      |
| `src/bots/`         | Task 4  | Patrol/engage AI for CT and T teams                           |
| `src/game/`         | Task 4  | Round timer, freezetime, score, win conditions                |
| `src/audio/`        | Task 4  | Synthesized gunshots/footsteps/hit/UI sounds                  |

## Controls

| Key       | Action      |
| --------- | ----------- |
| WASD      | Move        |
| Mouse     | Aim         |
| LMB       | Fire        |
| R         | Reload      |
| Space     | Jump        |
| Shift     | Walk        |
| Ctrl      | Crouch      |
| 1 – 5     | Weapon slot |
| B         | Buy menu    |
| Esc       | Release pointer |
