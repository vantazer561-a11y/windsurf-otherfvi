// Per-bot AI: patrol / engage / flee / dead FSM.
import * as THREE from 'three';
import type { Engine, Entity, MapSpawn, Team } from '../engine/types';

export type AIState = 'patrol' | 'engage' | 'flee' | 'dead';

export interface BotAI {
  entity: Entity;
  state: AIState;
  team: Team;
  waypoints: THREE.Vector3[];
  target?: Entity;
  wpIndex: number;
  lastFireAt: number;
  lastReplanAt: number;
  fireRateMs: number;
  health: number;
}

export interface BotEnv {
  engine: Engine;
  /** All hostile-to-bot entities (player + opposing bots) that are alive. */
  hostiles: () => Entity[];
  /** Called when a bot pulls the trigger; passes resolved hit (or null) and weapon id. */
  onFire: (shooter: Entity, hit: Entity | null, weaponId: string) => void;
  /** Audio hook */
  onGunshot: () => void;
}

const PATROL_SPEED = 4.0;
const ENGAGE_SPEED = 5.5;
const SIGHT_RANGE = 40;
const HEAR_RANGE = 30;
const FLEE_HP = 20;
const BOT_FOV = Math.cos(Math.PI / 3); // 120° cone
const TURN_RATE = 3.0; // rad/s
const SHOT_CONE = 0.05; // 0.05 rad spread

const tmpV = new THREE.Vector3();
const tmpForward = new THREE.Vector3();

function lineOfSight(engine: Engine, from: THREE.Vector3, to: THREE.Vector3): boolean {
  const dir = tmpV.copy(to).sub(from);
  const dist = dir.length();
  if (dist < 0.01) return true;
  dir.divideScalar(dist);
  const hit = engine.raycast(from, dir, dist, undefined);
  if (!hit) return true;
  // LOS clear only if the hit is the target entity itself or nothing in the way
  return hit.distance >= dist - 0.5;
}

function pickWaypoint(map: { spawnsT: MapSpawn[]; spawnsCT: MapSpawn[]; bombsiteA: THREE.Vector3; bombsiteB: THREE.Vector3 }): THREE.Vector3 {
  const opts: THREE.Vector3[] = [];
  for (const s of map.spawnsT) opts.push(s.pos);
  for (const s of map.spawnsCT) opts.push(s.pos);
  opts.push(map.bombsiteA);
  opts.push(map.bombsiteB);
  opts.push(new THREE.Vector3(0, 1.7, 0));
  opts.push(new THREE.Vector3(0, 1.7, -10));
  opts.push(new THREE.Vector3(0, 1.7, 10));
  return opts[Math.floor(Math.random() * opts.length)].clone();
}

function resolveAxisMove(
  pos: THREE.Vector3, hitbox: THREE.Box3, delta: THREE.Vector3, colliders: THREE.Box3[],
) {
  const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
  for (const axis of axes) {
    const before = pos[axis];
    pos[axis] += delta[axis];
    const box = hitbox.clone().translate(pos);
    let collided = false;
    for (const c of colliders) {
      if (box.intersectsBox(c)) { collided = true; break; }
    }
    if (collided) pos[axis] = before;
  }
}

export function createBotAI(
  entity: Entity,
  team: Team,
  waypoints: THREE.Vector3[],
  fireRateMs = 100,
): BotAI {
  return {
    entity, state: 'patrol', team, waypoints,
    wpIndex: 0, lastFireAt: 0, lastReplanAt: 0,
    fireRateMs, health: 100,
  };
}

export function updateBot(
  ai: BotAI,
  env: BotEnv,
  dt: number,
  now: number,
  mapData: { spawnsT: MapSpawn[]; spawnsCT: MapSpawn[]; bombsiteA: THREE.Vector3; bombsiteB: THREE.Vector3 },
): void {
  const e = ai.entity;
  if (!e.alive) {
    ai.state = 'dead';
    return;
  }

  // Track health for flee
  if (e.health <= FLEE_HP && ai.state !== 'flee') {
    ai.state = 'flee';
    ai.lastReplanAt = 0;
  }

  // Acquire target
  const hostiles = env.hostiles().filter((h) => h.alive);
  let bestTarget: Entity | undefined;
  let bestDist = Infinity;
  for (const h of hostiles) {
    const d = e.position.distanceTo(h.position);
    if (d > SIGHT_RANGE) continue;
    // FOV check
    tmpForward.set(Math.sin(e.yaw), 0, Math.cos(e.yaw)).normalize();
    tmpV.copy(h.position).sub(e.position); tmpV.y = 0; tmpV.normalize();
    const dot = tmpForward.dot(tmpV);
    const recentlyAttacked = (e as any).lastDamagedAt && (now - (e as any).lastDamagedAt < 1500);
    if (dot < BOT_FOV && !recentlyAttacked) continue;
    // LOS
    const from = tmpV.copy(e.position); from.y += 1.5;
    const to = h.position.clone(); to.y += 1.3;
    if (!lineOfSight(env.engine, from, to)) continue;
    if (d < bestDist) { bestDist = d; bestTarget = h; }
  }

  // Hearing: nearby damaged hostile
  if (!bestTarget) {
    for (const h of hostiles) {
      const lastDmg = (h as any).lastDamagedAt as number | undefined;
      if (lastDmg && now - lastDmg < 2000) {
        const d = e.position.distanceTo(h.position);
        if (d < HEAR_RANGE) { bestTarget = h; break; }
      }
    }
  }

  if (bestTarget) {
    ai.target = bestTarget;
    if (ai.state !== 'flee') ai.state = 'engage';
  } else if (ai.state === 'engage') {
    ai.state = 'patrol';
    ai.target = undefined;
  }

  // State logic
  const speed = ai.state === 'engage' ? ENGAGE_SPEED : PATROL_SPEED;

  if (ai.state === 'engage' && ai.target) {
    // Aim at target chest
    const dx = ai.target.position.x - e.position.x;
    const dz = ai.target.position.z - e.position.z;
    const desiredYaw = Math.atan2(dx, dz);
    const headY = ai.target.position.y + 1.3;
    const distXZ = Math.hypot(dx, dz);
    const desiredPitch = Math.atan2(headY - (e.position.y + 1.5), distXZ);
    // Lerp yaw/pitch
    let dy = desiredYaw - e.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    e.yaw += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, dy));
    e.pitch += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, desiredPitch - e.pitch));

    // Stop moving when engaging unless out of LOS
    e.velocity.x *= 0.6;
    e.velocity.z *= 0.6;

    // Fire if aimed
    if (Math.abs(dy) < 0.15 && now - ai.lastFireAt > ai.fireRateMs) {
      ai.lastFireAt = now;
      // Spread
      tmpForward.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      tmpForward.applyAxisAngle(new THREE.Vector3(1, 0, 0), -e.pitch);
      tmpForward.x += (Math.random() - 0.5) * SHOT_CONE;
      tmpForward.y += (Math.random() - 0.5) * SHOT_CONE;
      tmpForward.z += (Math.random() - 0.5) * SHOT_CONE;
      tmpForward.normalize();
      const origin = tmpV.copy(e.position); origin.y += 1.5;
      const ignore = new Set<number>([e.object3d.id]);
      const hit = env.engine.raycast(origin, tmpForward, 100, ignore);
      env.onGunshot();
      if (hit?.entity && hit.entity !== e) {
        // headshot if hit above target.position.y + 1.45
        const hs = hit.point.y > hit.entity.position.y + 1.45;
        const dmg = 28 * (hs ? 4 : 1);
        const killed = hit.entity.damage(dmg, e, hs);
        (hit.entity as any).lastDamagedAt = now;
        env.onFire(e, hit.entity, 'ak47');
        if (killed) env.onFire(e, hit.entity, 'ak47');
      } else {
        env.onFire(e, null, 'ak47');
      }
    }
  } else {
    // patrol / flee — move toward current waypoint
    if (ai.state === 'flee') {
      if (now - ai.lastReplanAt > 2000 && ai.target) {
        const away = tmpV.copy(e.position).sub(ai.target.position); away.y = 0; away.normalize().multiplyScalar(15);
        ai.waypoints = [e.position.clone().add(away)];
        ai.wpIndex = 0;
        ai.lastReplanAt = now;
      }
    } else {
      // Reached waypoint?
      const wp = ai.waypoints[ai.wpIndex];
      if (!wp || e.position.distanceTo(wp) < 1.8 || now - ai.lastReplanAt > 12000) {
        ai.waypoints = [pickWaypoint(mapData)];
        ai.wpIndex = 0;
        ai.lastReplanAt = now;
      }
    }
    const wp = ai.waypoints[ai.wpIndex];
    if (wp) {
      const dx = wp.x - e.position.x;
      const dz = wp.z - e.position.z;
      const desiredYaw = Math.atan2(dx, dz);
      let dy = desiredYaw - e.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      e.yaw += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, dy));
      e.pitch = 0;
      tmpForward.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      e.velocity.x = tmpForward.x * speed;
      e.velocity.z = tmpForward.z * speed;
    }
  }

  // Gravity
  e.velocity.y -= 16 * dt;
  // Move with collisions
  const dx = e.velocity.x * dt;
  const dy = e.velocity.y * dt;
  const dz = e.velocity.z * dt;
  resolveAxisMove(e.position, e.hitbox, new THREE.Vector3(dx, dy, dz), env.engine.colliders);
  // Floor clamp
  if (e.position.y <= 0) {
    e.position.y = 0;
    if (e.velocity.y < 0) e.velocity.y = 0;
  }
  // Snap object3d to entity
  e.object3d.position.copy(e.position);
  e.object3d.rotation.y = e.yaw;
}
