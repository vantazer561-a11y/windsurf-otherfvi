// Map implementation — de_dust2-inspired layout.
// Contract: see src/engine/types.ts (MapAPI).
import type { Engine, MapAPI } from '../engine/types';
import { buildDust2 } from './dust2';

export function createMap(engine: Engine): MapAPI {
  const data = buildDust2(engine);
  return { data };
}
