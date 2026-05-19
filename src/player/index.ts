// Player stub — replaced by Task 1.
// Contract: see src/engine/types.ts (PlayerAPI).
import * as THREE from 'three';
import type { Engine, PlayerAPI, PlayerInput, Entity } from '../engine/types';

let nextId = 1;

export function createPlayer(engine: Engine): PlayerAPI {
  const input: PlayerInput = {
    forward: false, back: false, left: false, right: false,
    jump: false, crouch: false, walk: false,
    fire: false, reload: false,
    weaponSlot: null, buyMenu: false,
    mouseDX: 0, mouseDY: 0,
  };
  const obj = new THREE.Object3D();
  obj.position.set(0, 1.7, 0);
  engine.scene.add(obj);
  const entity: Entity = {
    id: nextId++, kind: 'player', team: 'CT',
    position: obj.position, velocity: new THREE.Vector3(),
    yaw: 0, pitch: 0, health: 100, armor: 0,
    hitbox: new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.8, 0.3)),
    alive: true,
    object3d: obj,
    damage(amount: number) { this.health -= amount; if (this.health <= 0) { this.alive = false; return true; } return false; },
  };
  engine.registerEntity(entity);
  return {
    entity, input, money: 800,
    respawn(pos: THREE.Vector3, yaw = 0) {
      entity.position.copy(pos); entity.health = 100; entity.armor = 0;
      entity.alive = true; entity.yaw = yaw;
    },
  };
}
