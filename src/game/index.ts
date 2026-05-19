// Game-loop stub — replaced by Task 4.
// Contract: see src/engine/types.ts (GameAPI).
import type { Engine, GameAPI, GameContext, GameState } from '../engine/types';

export function createGame(_engine: Engine, _ctxRef: () => GameContext): GameAPI {
  const state: GameState = {
    phase: 'warmup',
    roundTime: 0,
    roundNumber: 0,
    ctScore: 0,
    tScore: 0,
  };
  return {
    state,
    start() { state.phase = 'live'; state.roundNumber = 1; state.roundTime = 115; },
    onKill() {},
    rewardKill() {},
  };
}
