// Bots system — manages a list of bots with FSM AI.
// Contract: see src/engine/types.ts (BotsAPI).
import * as THREE from 'three';
import type { Engine, BotsAPI, Entity, MapSpawn, Team, MapData } from '../engine/types';
import { createBotModel, fadeCorpse } from './model';
import { createBotAI, updateBot, type BotAI } from './ai';

let nextId = 2000;

interface BotsRuntime {
  mapData?: MapData;
}

export function createBots(engine: Engine): BotsAPI {
  const ais: BotAI[] = [];
  const fireSubs = new Set<(s: Entity, h: Entity | null, w: string) => void>();
  const runtime: BotsRuntime = {};
  let lastAudioHook: () => void = () => {};

  function makeEntity(team: Team, spawn: MapSpawn): { e: Entity; group: THREE.Group } {
    const group = createBotModel(team);
    group.position.copy(spawn.pos); group.position.y = 0; // model is built from feet up
    group.rotation.y = spawn.yaw;
    engine.scene.add(group);
    const hitbox = new THREE.Box3(
      new THREE.Vector3(-0.35, 0, -0.35),
      new THREE.Vector3(0.35, 1.85, 0.35),
    );
    const id = nextId++;
    const entity: Entity = {
      id,
      kind: 'bot',
      team,
      position: group.position,
      velocity: new THREE.Vector3(),
      yaw: spawn.yaw,
      pitch: 0,
      health: 100,
      armor: 0,
      hitbox,
      alive: true,
      object3d: group,
      damage(amount, attacker, headshot) {
        const reduced = headshot ? amount : amount;
        this.health -= reduced;
        (this as any).lastDamagedAt = performance.now();
        if (this.health <= 0) {
          this.alive = false;
          fadeCorpse(group);
          engine.unregisterEntity(this);
          return true;
        }
        return false;
      },
    };
    engine.registerEntity(entity);
    return { e: entity, group };
  }

  // Update loop
  engine.registerUpdate((dt) => {
    if (!runtime.mapData) return;
    const now = performance.now();
    const hostiles = () => {
      const out: Entity[] = [];
      for (const ent of engine.entities) {
        if (!ent.alive) continue;
        out.push(ent);
      }
      return out;
    };
    for (const ai of ais) {
      if (ai.state === 'dead' || !ai.entity.alive) continue;
      updateBot(
        ai,
        {
          engine,
          hostiles: () => hostiles().filter((h) => h.team !== ai.team),
          onFire: (s, h, w) => { fireSubs.forEach((cb) => cb(s, h, w)); },
          onGunshot: () => lastAudioHook(),
        },
        dt, now, runtime.mapData,
      );
    }
  });

  const api: BotsAPI = {
    spawn(team, spawns) {
      const out: Entity[] = [];
      for (const s of spawns) {
        const { e } = makeEntity(team, s);
        const ai = createBotAI(e, team, [s.pos.clone()], 130 + Math.random() * 80);
        ais.push(ai);
        out.push(e);
      }
      return out;
    },
    reset() {
      for (const ai of ais) {
        if (ai.entity.alive) engine.unregisterEntity(ai.entity);
        engine.scene.remove(ai.entity.object3d);
      }
      ais.length = 0;
    },
    alive(team) {
      return ais.filter((a) => a.team === team && a.entity.alive).length;
    },
    list() {
      return ais.map((a) => a.entity);
    },
    onBotFire(cb) {
      fireSubs.add(cb);
      return () => fireSubs.delete(cb);
    },
  };

  // Expose a couple of internal hooks via the API object (non-typed extension)
  (api as any).setMapData = (m: MapData) => { runtime.mapData = m; };
  (api as any).setAudioHook = (fn: () => void) => { lastAudioHook = fn; };

  return api;
}
