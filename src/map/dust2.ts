// de_dust2-inspired layout builder.
// Coordinate system: Y is up. Floor at y=0. Walls 3.5m tall.
// Approximate footprint: ~80m x 80m centered on origin.
import * as THREE from 'three';
import type { Engine, MapData, MapSpawn } from '../engine/types';
import {
  sandFloorMaterial,
  wallMaterial,
  crateMaterial,
  concreteMaterial,
  bombsiteMaterial,
  skyMaterial,
} from './materials';

const WALL_H = 3.5;
const WALL_T = 0.3;

function addBoxCollider(
  parent: THREE.Object3D,
  collidersOut: THREE.Box3[],
  engine: Engine,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  mat: THREE.Material,
  opts: { collidable?: boolean; cast?: boolean; receive?: boolean } = {},
): THREE.Mesh {
  const collidable = opts.collidable !== false;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (collidable) mesh.userData.collidable = true;
  parent.add(mesh);
  if (collidable) {
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(w, h, d),
    );
    collidersOut.push(box);
    engine.addCollider(box);
  }
  return mesh;
}

function addFloor(
  parent: THREE.Object3D,
  x: number, z: number,
  w: number, d: number,
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  // Floor is the implicit ground in player physics (y>=0). No collider needed.
  parent.add(mesh);
  return mesh;
}

function addWall(
  parent: THREE.Object3D, colliders: THREE.Box3[], engine: Engine,
  cx: number, cz: number, length: number, axis: 'x' | 'z',
  mat: THREE.Material,
): void {
  if (axis === 'x') {
    addBoxCollider(parent, colliders, engine, cx, WALL_H / 2, cz, length, WALL_H, WALL_T, mat);
  } else {
    addBoxCollider(parent, colliders, engine, cx, WALL_H / 2, cz, WALL_T, WALL_H, length, mat);
  }
}

export function buildDust2(engine: Engine): MapData {
  const root = new THREE.Group();
  root.name = 'de_dust2';
  const colliders: THREE.Box3[] = [];

  // Materials
  const sand = sandFloorMaterial();
  const wallMat = wallMaterial();
  const crateMat = crateMaterial();
  const concreteMat = concreteMaterial();
  const bombA = bombsiteMaterial('A');
  const bombB = bombsiteMaterial('B');

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff1d0, 2.1);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0005;
  root.add(sun);
  root.add(new THREE.AmbientLight(0xffd9a8, 0.32));
  root.add(new THREE.HemisphereLight(0xfff3d6, 0x3a2f1c, 0.34));

  // Sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 12), skyMaterial());
  sky.frustumCulled = false;
  root.add(sky);

  // Master floor (covers everything)
  addFloor(root, 0, 0, 100, 100, sand);

  // Outer perimeter (one big walled rectangle so you can't fall off)
  const halfW = 42, halfD = 42;
  addWall(root, colliders, engine,  0, -halfD, halfW * 2, 'x', wallMat); // south
  addWall(root, colliders, engine,  0,  halfD, halfW * 2, 'x', wallMat); // north
  addWall(root, colliders, engine, -halfW, 0, halfD * 2, 'z', wallMat);  // west
  addWall(root, colliders, engine,  halfW, 0, halfD * 2, 'z', wallMat);  // east

  // --- T spawn (south-east corner) ---
  // Small wall segments creating a spawn pocket.
  addWall(root, colliders, engine, 30, -28, 14, 'x', wallMat); // top wall of T pocket
  addWall(root, colliders, engine, 22, -34, 12, 'z', wallMat); // left wall of T pocket

  // --- CT spawn (north-west) ---
  addWall(root, colliders, engine, -30, 28, 14, 'x', wallMat);
  addWall(root, colliders, engine, -22, 34, 12, 'z', wallMat);

  // --- Mid corridor walls (running roughly north-south through center) ---
  // West side of mid (separates mid from long-A / CT)
  addWall(root, colliders, engine, -6, 8, 20, 'z', wallMat);
  addWall(root, colliders, engine, -6, -16, 16, 'z', wallMat);
  // East side of mid (separates mid from short-A / tunnels)
  addWall(root, colliders, engine,  6, 8, 20, 'z', wallMat);
  addWall(root, colliders, engine,  6, -16, 16, 'z', wallMat);
  // Mid low cover (low wall — only 1.2m, jumpable)
  addBoxCollider(root, colliders, engine, 0, 0.6, -2, 4, 1.2, 0.4, concreteMat);

  // --- A site (north-east), open square with crates ---
  // Bombsite floor (tinted)
  const bombsiteAPos = new THREE.Vector3(22, 0.02, 22);
  const bombFloorA = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), bombA);
  bombFloorA.rotation.x = -Math.PI / 2;
  bombFloorA.position.copy(bombsiteAPos);
  bombFloorA.receiveShadow = true;
  root.add(bombFloorA);
  // Wall isolating A site from mid (with a gap to enter from "short A")
  addWall(root, colliders, engine, 14, 10, 14, 'x', wallMat);
  addWall(root, colliders, engine, 10, 18, 14, 'z', wallMat);
  // A site crates
  addBoxCollider(root, colliders, engine, 26, 0.5, 22, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, 26, 1.5, 22, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, 18, 0.5, 18, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, 19, 0.5, 18, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, 18, 1.5, 18, 1, 1, 1, crateMat);
  // Goose fountain (low cylinder centerpiece)
  const goose = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.6, 24),
    concreteMat,
  );
  goose.position.set(22, 0.3, 22);
  goose.castShadow = true; goose.receiveShadow = true;
  goose.userData.collidable = true;
  root.add(goose);
  {
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(22, 0.3, 22),
      new THREE.Vector3(2.8, 0.6, 2.8),
    );
    colliders.push(box);
    engine.addCollider(box);
  }
  // Ramp from A site down toward CT (cosmetic; a wide low block)
  addBoxCollider(root, colliders, engine, 16, 0.25, 26, 6, 0.5, 4, concreteMat);

  // --- B site (south-west), tighter ---
  const bombsiteBPos = new THREE.Vector3(-22, 0.02, -22);
  const bombFloorB = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), bombB);
  bombFloorB.rotation.x = -Math.PI / 2;
  bombFloorB.position.copy(bombsiteBPos);
  bombFloorB.receiveShadow = true;
  root.add(bombFloorB);
  // Walls forming B site
  addWall(root, colliders, engine, -14, -10, 14, 'x', wallMat);
  addWall(root, colliders, engine, -10, -18, 14, 'z', wallMat);
  // "Car" — a long box
  addBoxCollider(root, colliders, engine, -24, 0.7, -19, 4, 1.4, 1.6, crateMat);
  // B crates
  addBoxCollider(root, colliders, engine, -19, 0.5, -25, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, -19, 1.5, -25, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, -25, 0.5, -25, 1, 1, 1, crateMat);

  // --- Long A corridor (east side, running north-south) ---
  // West wall of long-A
  addWall(root, colliders, engine, 14, -16, 16, 'z', wallMat);
  // East wall of long-A (uses the outer perimeter)
  // Doors/cover in long-A
  addBoxCollider(root, colliders, engine, 30, 0.5, 0, 1, 1, 2, crateMat);
  addBoxCollider(root, colliders, engine, 30, 1.5, 0, 1, 1, 2, crateMat);
  // The "pit" depression — visual marker only (slightly darker patch)
  const pit = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6b40, roughness: 0.95 }),
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.set(28, 0.01, -10);
  pit.receiveShadow = true;
  root.add(pit);

  // --- Catwalk / short A (north side connecting CT to A) ---
  addWall(root, colliders, engine, -10, 14, 8, 'x', wallMat);

  // --- Tunnels to B (south side from T spawn area to B) ---
  addWall(root, colliders, engine,  -8, -28, 8, 'x', wallMat);
  addWall(root, colliders, engine, -12, -32, 8, 'z', wallMat);
  // Mid-tunnel boxes
  addBoxCollider(root, colliders, engine, -15, 0.5, -30, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine,   2, 0.5, -28, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine,   2, 1.5, -28, 1, 1, 1, crateMat);

  // --- Doubledoors area (between CT and mid) ---
  addBoxCollider(root, colliders, engine, -10, 0.5,  6, 1, 1, 1, crateMat);
  addBoxCollider(root, colliders, engine, -12, 0.5,  6, 1, 1, 1, crateMat);

  // Fog for depth
  // (set on engine scene so faraway walls fade)
  engine.scene.fog = new THREE.Fog('#c4a988', 50, 180);
  if (!(engine.scene.background instanceof THREE.Color)) {
    engine.scene.background = new THREE.Color('#a8c9e5');
  } else {
    engine.scene.background = new THREE.Color('#a8c9e5');
  }

  // --- Spawns ---
  // T spawns (south-east), facing roughly north-west (toward mid/A)
  const spawnsT: MapSpawn[] = [
    { pos: new THREE.Vector3(30, 1.7, -30), yaw: Math.PI * 0.75 },
    { pos: new THREE.Vector3(32, 1.7, -32), yaw: Math.PI * 0.75 },
    { pos: new THREE.Vector3(28, 1.7, -32), yaw: Math.PI * 0.75 },
    { pos: new THREE.Vector3(30, 1.7, -34), yaw: Math.PI * 0.75 },
    { pos: new THREE.Vector3(34, 1.7, -30), yaw: Math.PI * 0.75 },
  ];
  // CT spawns (north-west), facing roughly south-east
  const spawnsCT: MapSpawn[] = [
    { pos: new THREE.Vector3(-30, 1.7, 30), yaw: -Math.PI * 0.25 },
    { pos: new THREE.Vector3(-32, 1.7, 32), yaw: -Math.PI * 0.25 },
    { pos: new THREE.Vector3(-28, 1.7, 32), yaw: -Math.PI * 0.25 },
    { pos: new THREE.Vector3(-30, 1.7, 34), yaw: -Math.PI * 0.25 },
    { pos: new THREE.Vector3(-34, 1.7, 30), yaw: -Math.PI * 0.25 },
  ];

  engine.scene.add(root);

  return {
    name: 'de_dust2',
    spawnsT,
    spawnsCT,
    bombsiteA: bombsiteAPos.clone(),
    bombsiteB: bombsiteBPos.clone(),
    colliders,
    root,
  };
}
