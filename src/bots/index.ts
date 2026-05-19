// Bots stub — replaced by Task 4.
// Contract: see src/engine/types.ts (BotsAPI).
import * as THREE from 'three';
import type { Engine, BotsAPI, Entity, Team, MapSpawn } from '../engine/types';

let nextId = 1000;

export function createBots(engine: Engine): BotsAPI {
  let bots: Entity[] = [];
  return {
    spawn(team: Team, spawns: MapSpawn[]): Entity[] {
      const out: Entity[] = [];
      for (const s of spawns) {
        const obj = new THREE.Object3D();
        obj.position.copy(s.pos);
        engine.scene.add(obj);
        const e: Entity = {
          id: nextId++, kind: 'bot', team,
          position: obj.position, velocity: new THREE.Vector3(),
          yaw: s.yaw, pitch: 0, health: 100, armor: 0,
          hitbox: new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.8, 0.3)),
          alive: true,
          object3d: obj,
          damage(amount: number) { this.health -= amount; if (this.health <= 0) { this.alive = false; return true; } return false; },
        };
        engine.registerEntity(e);
        bots.push(e); out.push(e);
      }
      return out;
    },
    reset() {
      bots.forEach((b) => { engine.unregisterEntity(b); engine.scene.remove(b.object3d); });
      bots = [];
    },
    alive(team: Team) { return bots.filter(b => b.team === team && b.alive).length; },
    list() { return bots; },
  };
}
