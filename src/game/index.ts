// Round state machine + economy.
// Contract: see src/engine/types.ts (GameAPI).
import type { Engine, GameAPI, GameContext, GameState, Entity, WeaponSpec, Team } from '../engine/types';

const FREEZETIME = 5;
const ROUND_TIME = 115;
const ROUNDEND_TIME = 5;
const WARMUP_TIME = 5;
const WIN_ROUNDS = 16;

const LOSS_BONUS = [1400, 1900, 2400, 2900, 3400];

const KILL_REWARDS: Record<string, number> = {
  knife: 1500,
  awp: 100,
  hegrenade: 300,
};
const DEFAULT_KILL_REWARD = 300;

function rewardFor(weapon: WeaponSpec): number {
  return KILL_REWARDS[weapon.id] ?? DEFAULT_KILL_REWARD;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function createGame(_engine: Engine, ctxRef: () => GameContext): GameAPI {
  const state: GameState = {
    phase: 'warmup',
    roundTime: WARMUP_TIME,
    roundNumber: 0,
    ctScore: 0,
    tScore: 0,
  };

  let started = false;
  let lossStreakCT = 0;
  let lossStreakT = 0;
  let footstepWired = false;

  function setPhase(p: GameState['phase'], t: number) {
    state.phase = p;
    state.roundTime = t;
  }

  function startRound() {
    state.roundNumber += 1;
    const ctx = ctxRef();
    ctx.bots.reset();
    ctx.weapons.resetLoadout(ctx.player.entity.team);

    const ctSpawns = ctx.map.data.spawnsCT.slice(0, 4);
    const tSpawns = ctx.map.data.spawnsT.slice(0, 5);
    ctx.bots.spawn('CT', ctSpawns);
    ctx.bots.spawn('T', tSpawns);
    // Hand the map to bots so AI can pick waypoints; hook bots' audio.
    (ctx.bots as any).setMapData?.(ctx.map.data);
    (ctx.bots as any).setAudioHook?.(() => ctx.audio.gunshot('ak47'));

    const playerSpawn = ctx.map.data.spawnsCT[4] ?? ctx.map.data.spawnsCT[0];
    if (playerSpawn) ctx.player.respawn(playerSpawn.pos, playerSpawn.yaw);
    ctx.player.entity.team = 'CT';

    ctx.audio.roundStart();
    ctx.hud.showMessage('FREEZETIME', 2500);
    ctx.hud.setBuyMenu(true, ctx.player.money, (id) => { ctx.weapons.buy(id); });
    setPhase('freezetime', FREEZETIME);
  }

  function endRound(winner: Team) {
    setPhase('roundend', ROUNDEND_TIME);
    const ctx = ctxRef();
    if (winner === 'CT') {
      state.ctScore += 1;
      const reward = ctx.player.entity.team === 'CT' ? 3250 : LOSS_BONUS[Math.min(LOSS_BONUS.length - 1, lossStreakT)];
      ctx.player.money = clamp(ctx.player.money + reward, 0, 16000);
      lossStreakCT = 0;
      lossStreakT = Math.min(LOSS_BONUS.length - 1, lossStreakT + 1);
    } else {
      state.tScore += 1;
      const reward = ctx.player.entity.team === 'T' ? 3250 : LOSS_BONUS[Math.min(LOSS_BONUS.length - 1, lossStreakCT)];
      ctx.player.money = clamp(ctx.player.money + reward, 0, 16000);
      lossStreakT = 0;
      lossStreakCT = Math.min(LOSS_BONUS.length - 1, lossStreakCT + 1);
    }
    ctx.audio.roundEnd(winner);
    ctx.hud.showMessage(`${winner} WIN`, 3000);
    if (state.ctScore >= WIN_ROUNDS || state.tScore >= WIN_ROUNDS) {
      setPhase('matchend', 9999);
      ctx.hud.showMessage(state.ctScore > state.tScore ? 'CT WIN MATCH' : 'T WIN MATCH', 8000);
    }
  }

  function tick(dt: number) {
    const ctx = ctxRef();
    state.roundTime = Math.max(0, state.roundTime - dt);

    if (state.phase === 'freezetime' || state.phase === 'roundend') {
      ctx.player.entity.velocity.x = 0;
      ctx.player.entity.velocity.z = 0;
    }

    if (state.phase === 'warmup') {
      if (state.roundTime <= 0) startRound();
    } else if (state.phase === 'freezetime') {
      if (state.roundTime <= 0) {
        setPhase('live', ROUND_TIME);
        ctx.hud.setBuyMenu(false, ctx.player.money, () => {});
      }
    } else if (state.phase === 'live') {
      const tAlive = ctx.bots.alive('T') + (ctx.player.entity.team === 'T' && ctx.player.entity.alive ? 1 : 0);
      const ctAlive = ctx.bots.alive('CT') + (ctx.player.entity.team === 'CT' && ctx.player.entity.alive ? 1 : 0);
      if (tAlive === 0) endRound('CT');
      else if (ctAlive === 0) endRound('T');
      else if (state.roundTime <= 0) endRound('T');
    } else if (state.phase === 'roundend') {
      if (state.roundTime <= 0) startRound();
    }
  }

  const api: GameAPI = {
    state,
    start() {
      if (started) return;
      started = true;
      const ctx = ctxRef();

      ctx.weapons.onFire((res) => {
        ctx.audio.gunshot(res.weapon.id);
        if (res.hit?.entity) ctx.audio.hit((res.hit as any).headshot === true);
        if (res.killed && res.hit?.entity) {
          const hs = (res.hit as any).headshot === true;
          api.onKill(res.hit.entity, ctx.player.entity, res.weapon, hs);
        }
      });

      ctx.bots.onBotFire((shooter, hitEntity, weaponId) => {
        if (hitEntity && !hitEntity.alive) {
          const w = ctx.weapons.catalog.find((c) => c.id === weaponId) ?? ctx.weapons.catalog[0];
          api.onKill(hitEntity, shooter, w, false);
        }
      });

      if (!footstepWired) {
        const dom = ctx.engine.renderer.domElement;
        dom.addEventListener('player:footstep', () => ctx.audio.footstep());
        footstepWired = true;
      }

      ctx.engine.registerUpdate((dt) => tick(dt));

      ctx.hud.showMessage('WARMUP', 4000);
    },
    onKill(victim, attacker, weapon, headshot) {
      const ctx = ctxRef();
      if (attacker === ctx.player.entity) {
        api.rewardKill(attacker, weapon);
        ctx.hud.killFeed({
          attacker: 'You',
          victim: `${victim.team}_${victim.id}`,
          weapon: weapon.id,
          headshot,
        });
      } else if (victim === ctx.player.entity) {
        ctx.hud.killFeed({
          attacker: attacker ? `${attacker.team}_${attacker.id}` : '?',
          victim: 'You',
          weapon: weapon.id,
          headshot,
        });
        ctx.audio.death();
      } else {
        ctx.hud.killFeed({
          attacker: attacker ? `${attacker.team}_${attacker.id}` : '?',
          victim: `${victim.team}_${victim.id}`,
          weapon: weapon.id,
          headshot,
        });
      }
    },
    rewardKill(attacker, weapon) {
      const ctx = ctxRef();
      if (attacker === ctx.player.entity) {
        ctx.player.money = clamp(ctx.player.money + rewardFor(weapon), 0, 16000);
      }
    },
  };

  return api;
}
