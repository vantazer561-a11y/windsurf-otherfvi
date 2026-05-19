// Audio stub — replaced by Task 4.
// Contract: see src/engine/types.ts (AudioAPI).
import type { AudioAPI, Team } from '../engine/types';

export function createAudio(): AudioAPI {
  return {
    unlock() {},
    footstep() {},
    gunshot(_id: string) {},
    reload(_id: string) {},
    hit(_h: boolean) {},
    empty() {},
    switchWeapon() {},
    death() {},
    roundStart() {},
    roundEnd(_w: Team) {},
  };
}
