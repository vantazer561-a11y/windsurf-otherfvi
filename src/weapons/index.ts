// Weapons stub — replaced by Task 3.
// Contract: see src/engine/types.ts (WeaponsAPI, WeaponSpec).
import type { Engine, PlayerAPI, WeaponsAPI, WeaponInstance, WeaponSpec, WeaponSlot, FireResult, Team } from '../engine/types';

const KNIFE: WeaponSpec = {
  id: 'knife', name: 'Knife', slot: 3,
  damage: 50, fireRate: 120, accuracy: 1, recoil: 0,
  reloadTime: 0, magSize: 0, reserveAmmo: 0, maxReserve: 0,
  price: 0, automatic: false, range: 1.5, headshotMult: 1.2,
};

export function createWeapons(_engine: Engine, _player: PlayerAPI): WeaponsAPI {
  const knife: WeaponInstance = { spec: KNIFE, ammoInMag: 0, reserveAmmo: 0 };
  const inv: WeaponInstance[] = [knife];
  let equipped = knife;
  const fireSubs = new Set<(r: FireResult) => void>();
  return {
    inventory: inv,
    get equipped() { return equipped; },
    catalog: [KNIFE],
    switchTo(slot: WeaponSlot) {
      const w = inv.find(i => i.spec.slot === slot);
      if (w) equipped = w;
    },
    tryFire(): FireResult | null { return null; },
    reload() {},
    give(spec: WeaponSpec) {
      const existing = inv.find(i => i.spec.slot === spec.slot);
      const w: WeaponInstance = { spec, ammoInMag: spec.magSize, reserveAmmo: spec.reserveAmmo };
      if (existing) Object.assign(existing, w);
      else inv.push(w);
      equipped = w;
    },
    drop(slot: WeaponSlot) {
      const i = inv.findIndex(x => x.spec.slot === slot);
      if (i >= 0 && inv[i].spec.id !== 'knife') inv.splice(i, 1);
      equipped = inv[0];
    },
    buy(_id: string) { return false; },
    onFire(cb) { fireSubs.add(cb); return () => fireSubs.delete(cb); },
    resetLoadout(_team: Team) {
      inv.length = 0; inv.push(knife); equipped = knife;
    },
  };
}
