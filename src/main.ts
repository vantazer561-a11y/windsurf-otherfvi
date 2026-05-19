// Orchestrator — wires all module factories together. DO NOT edit during module tasks.
import { createEngine } from './engine';
import { createPlayer } from './player';
import { createMap } from './map';
import { createWeapons } from './weapons';
import { createHud } from './hud';
import { createBots } from './bots';
import { createGame } from './game';
import { createAudio } from './audio';
import type { GameContext } from './engine/types';

function boot() {
  const mount = document.getElementById('app');
  const hudRoot = document.getElementById('hud-root');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  if (!mount || !hudRoot || !overlay || !startBtn) throw new Error('DOM not ready');

  const engine = createEngine(mount);
  const map = createMap(engine);
  const player = createPlayer(engine);
  const weapons = createWeapons(engine, player);
  const hud = createHud(hudRoot);
  const bots = createBots(engine);
  const audio = createAudio();

  // Spawn player at first CT spawn.
  const ctSpawn = map.data.spawnsCT[0];
  if (ctSpawn) player.respawn(ctSpawn.pos, ctSpawn.yaw);

  // Build the shared context. Game gets a ref so it can reach live state.
  let ctx: GameContext;
  const game = createGame(engine, () => ctx);
  ctx = { engine, player, map, weapons, hud, bots, game, audio };

  startBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    audio.unlock();
    // Pointer lock is owned by player module.
    engine.renderer.domElement.requestPointerLock?.();
    game.start();
  });

  // Wire HUD update tick.
  engine.registerUpdate(() => {
    hud.update({
      health: player.entity.health,
      armor: player.entity.armor,
      money: player.money,
      ammoInMag: weapons.equipped.ammoInMag,
      reserveAmmo: weapons.equipped.reserveAmmo,
      weaponName: weapons.equipped.spec.name,
      roundTime: game.state.roundTime,
      ctAlive: bots.alive('CT') + (player.entity.team === 'CT' && player.entity.alive ? 1 : 0),
      tAlive: bots.alive('T') + (player.entity.team === 'T' && player.entity.alive ? 1 : 0),
      ctScore: game.state.ctScore,
      tScore: game.state.tScore,
      phase: game.state.phase,
    });
  });
}

boot();
