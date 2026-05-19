// Engine stub — replaced by Task 1.
// Contract: see src/engine/types.ts (Engine interface).
import * as THREE from 'three';
import type { Engine, Entity } from './types';

export function createEngine(mountEl: HTMLElement): Engine {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mountEl.appendChild(renderer.domElement);
  const clock = new THREE.Clock();
  const updates = new Set<(dt: number, t: number) => void>();
  const colliders: THREE.Box3[] = [];
  const entities = new Set<Entity>();

  function loop() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    updates.forEach((fn) => fn(dt, t));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const engine: Engine = {
    scene, camera, renderer, clock,
    registerUpdate(fn) { updates.add(fn); return () => updates.delete(fn); },
    raycast() { return null; },
    addCollider(box) { colliders.push(box); },
    colliders,
    registerEntity(e) { entities.add(e); },
    unregisterEntity(e) { entities.delete(e); },
    entities,
  };
  return engine;
}
