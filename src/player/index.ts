import * as THREE from 'three';
import type { Engine, PlayerAPI, PlayerInput, Entity } from '../engine/types';
import { setupInput } from './input';
import { resolveMovement, testGround } from './movement';

let nextId = 1;

const STAND_EYE = 1.65;
const CROUCH_EYE = 1.0;
const CROUCH_TIME = 0.18;

export function createPlayer(engine: Engine): PlayerAPI {
  const input: PlayerInput = {
    forward: false, back: false, left: false, right: false,
    jump: false, crouch: false, walk: false,
    fire: false, reload: false,
    weaponSlot: null, buyMenu: false,
    mouseDX: 0, mouseDY: 0,
  };

  const pending = setupInput(engine, input);

  const obj = new THREE.Object3D();
  obj.position.set(0, 1.7, 0);
  engine.scene.add(obj);

  const entity: Entity = {
    id: nextId++,
    kind: 'player',
    team: 'CT',
    position: obj.position,
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    health: 100,
    armor: 0,
    hitbox: new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.8, 0.3)),
    alive: true,
    object3d: obj,
    damage(amount: number, _attacker?: Entity, _headshot?: boolean) {
      this.health -= amount;
      if (this.health <= 0) {
        this.alive = false;
        return true;
      }
      return false;
    },
  };

  engine.registerEntity(entity);

  let currentEyeHeight = STAND_EYE;
  let grounded = false;
  let footstepAccumulator = 0;

  engine.registerUpdate((dt, _t) => {
    if (!entity.alive) return;

    // Flush pending edge inputs for this frame
    input.jump = pending.jump;
    pending.jump = false;
    input.reload = pending.reload;
    pending.reload = false;
    if (pending.weaponSlot !== null) {
      input.weaponSlot = pending.weaponSlot;
      pending.weaponSlot = null;
    }

    // Mouse look
    const sens = 0.0022;
    entity.yaw -= input.mouseDX * sens;
    entity.pitch -= input.mouseDY * sens;
    entity.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, entity.pitch));
    input.mouseDX = 0;
    input.mouseDY = 0;

    // Crouch & eye height
    const targetEyeHeight = input.crouch ? CROUCH_EYE : STAND_EYE;
    const lerpSpeed = 1.0 / CROUCH_TIME;
    currentEyeHeight += (targetEyeHeight - currentEyeHeight) * Math.min(1, dt * lerpSpeed);

    // Update hitbox height
    entity.hitbox.max.y = input.crouch ? 1.2 : 1.8;

    // Ground test
    grounded = testGround(entity.position, entity.hitbox, engine.colliders);

    // Movement wish
    let moveForward = 0;
    let moveRight = 0;
    if (input.forward) moveForward += 1;
    if (input.back) moveForward -= 1;
    if (input.right) moveRight += 1;
    if (input.left) moveRight -= 1;

    const maxSpeed = input.crouch ? 2.2 : (input.walk ? 3.4 : 5.5);

    const wishDir = new THREE.Vector3();
    if (moveForward !== 0 || moveRight !== 0) {
      const sinYaw = Math.sin(entity.yaw);
      const cosYaw = Math.cos(entity.yaw);
      const worldForward = new THREE.Vector3(-sinYaw, 0, -cosYaw);
      const worldRight = new THREE.Vector3(cosYaw, 0, -sinYaw);
      wishDir.addScaledVector(worldForward, moveForward).addScaledVector(worldRight, moveRight);
      wishDir.normalize().multiplyScalar(maxSpeed);
    }

    // Acceleration / friction
    if (grounded) {
      const accelRate = 1.0 / 0.08;
      entity.velocity.x += (wishDir.x - entity.velocity.x) * Math.min(1, dt * accelRate);
      entity.velocity.z += (wishDir.z - entity.velocity.z) * Math.min(1, dt * accelRate);

      if (moveForward === 0 && moveRight === 0) {
        const friction = 8.0;
        entity.velocity.x *= Math.max(0, 1 - friction * dt);
        entity.velocity.z *= Math.max(0, 1 - friction * dt);
      }
    } else {
      const airControlRate = (1.0 / 0.08) * 0.15;
      entity.velocity.x += (wishDir.x - entity.velocity.x) * Math.min(1, dt * airControlRate);
      entity.velocity.z += (wishDir.z - entity.velocity.z) * Math.min(1, dt * airControlRate);
    }

    // Jump (consume even if not grounded)
    if (grounded && input.jump) {
      entity.velocity.y = 4.6;
    }
    input.jump = false;

    // Gravity
    entity.velocity.y += -16.0 * dt;

    // Move & collide
    const movement = entity.velocity.clone().multiplyScalar(dt);
    resolveMovement(entity.position, entity.hitbox, movement, engine.colliders);

    // Fallback ground plane for stub map with no colliders
    if (engine.colliders.length === 0 && entity.position.y < 0) {
      entity.position.y = 0;
      entity.velocity.y = 0;
      grounded = true;
    }

    // Sync object3d transform
    obj.position.copy(entity.position);

    // Update camera
    engine.camera.position.set(
      entity.position.x,
      entity.position.y + currentEyeHeight,
      entity.position.z,
    );
    engine.camera.rotation.order = 'YXZ';
    engine.camera.rotation.y = entity.yaw;
    engine.camera.rotation.x = entity.pitch;

    // Footsteps
    if (grounded && (moveForward !== 0 || moveRight !== 0) && !input.walk) {
      const speed = Math.sqrt(entity.velocity.x * entity.velocity.x + entity.velocity.z * entity.velocity.z);
      footstepAccumulator += speed * dt;
      const cadence = input.crouch ? 3.0 : 1.7;
      if (footstepAccumulator >= cadence) {
        footstepAccumulator -= cadence;
        engine.renderer.domElement.dispatchEvent(new CustomEvent('player:footstep'));
      }
    } else {
      footstepAccumulator = 0;
    }
  });

  return {
    entity,
    input,
    money: 800,
    respawn(pos: THREE.Vector3, yaw = 0) {
      entity.position.copy(pos);
      entity.velocity.set(0, 0, 0);
      entity.health = 100;
      entity.armor = 0;
      entity.alive = true;
      entity.yaw = yaw;
      entity.pitch = 0;
      currentEyeHeight = STAND_EYE;
      grounded = false;
      footstepAccumulator = 0;
    },
  };
}
