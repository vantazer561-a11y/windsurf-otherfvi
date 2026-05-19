// Map stub — replaced by Task 2.
// Contract: see src/engine/types.ts (MapAPI).
import * as THREE from 'three';
import type { Engine, MapAPI } from '../engine/types';

export function createMap(engine: Engine): MapAPI {
  const root = new THREE.Group();
  root.name = 'map_stub';
  // Stub floor so the player doesn't fall forever.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x555555 }),
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(20, 40, 10);
  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  root.add(sun, amb);
  engine.scene.add(root);
  return {
    data: {
      name: 'stub',
      spawnsT: [{ pos: new THREE.Vector3(10, 1.7, 0), yaw: Math.PI }],
      spawnsCT: [{ pos: new THREE.Vector3(-10, 1.7, 0), yaw: 0 }],
      bombsiteA: new THREE.Vector3(0, 0, 10),
      bombsiteB: new THREE.Vector3(0, 0, -10),
      colliders: [],
      root,
    },
  };
}
