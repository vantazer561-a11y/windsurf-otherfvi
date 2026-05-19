import * as THREE from 'three';
import type { Engine, Entity, RaycastHit } from './types';

const _raycaster = new THREE.Raycaster();
const _invDir = new THREE.Vector3();
const _tMin = new THREE.Vector3();
const _tMax = new THREE.Vector3();

/**
 * Ray-box intersection (AABB), returning distance along the ray.
 * Returns Infinity if no hit.
 */
function rayBoxDistance(origin: THREE.Vector3, dir: THREE.Vector3, box: THREE.Box3): number {
  // slab method
  _invDir.set(
    dir.x !== 0 ? 1 / dir.x : Infinity,
    dir.y !== 0 ? 1 / dir.y : Infinity,
    dir.z !== 0 ? 1 / dir.z : Infinity,
  );

  const min = box.min;
  const max = box.max;

  const t1 = (min.x - origin.x) * _invDir.x;
  const t2 = (max.x - origin.x) * _invDir.x;
  _tMin.x = Math.min(t1, t2);
  _tMax.x = Math.max(t1, t2);

  const t3 = (min.y - origin.y) * _invDir.y;
  const t4 = (max.y - origin.y) * _invDir.y;
  _tMin.y = Math.min(t3, t4);
  _tMax.y = Math.max(t3, t4);

  const t5 = (min.z - origin.z) * _invDir.z;
  const t6 = (max.z - origin.z) * _invDir.z;
  _tMin.z = Math.min(t5, t6);
  _tMax.z = Math.max(t5, t6);

  const tNear = Math.max(_tMin.x, _tMin.y, _tMin.z);
  const tFar = Math.min(_tMax.x, _tMax.y, _tMax.z);

  if (tNear > tFar || tFar < 0) return Infinity;
  return tNear >= 0 ? tNear : tFar;
}

const _worldBox = new THREE.Box3();

/**
 * Perform a raycast against scene collidable meshes + entity hitboxes.
 * Returns the closest hit. If an entity hitbox is the closest hit, `entity`
 * is attached and `(hit as any).headshot` is set to true when the hit point
 * is in the upper 25% of the hitbox (so callers can apply headshot multipliers).
 */
export function raycast(
  engine: Engine,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist: number,
  ignore?: Set<number>,
): RaycastHit | null {
  const direction = dir.clone().normalize();

  // 1. Scene meshes
  _raycaster.set(origin, direction);
  const collidableMeshes: THREE.Object3D[] = [];
  engine.scene.traverse((obj) => {
    if (obj.userData.collidable === true) collidableMeshes.push(obj);
  });

  const meshIntersects = _raycaster.intersectObjects(collidableMeshes, true);
  let closestMeshHit: RaycastHit | null = null;
  for (const inter of meshIntersects) {
    if (inter.distance > maxDist) continue;
    if (ignore && inter.object.id !== undefined && ignore.has(inter.object.id)) continue;
    if (!closestMeshHit || inter.distance < closestMeshHit.distance) {
      closestMeshHit = {
        point: inter.point,
        normal: inter.face ? inter.face.normal.clone().transformDirection(inter.object.matrixWorld).normalize() : new THREE.Vector3(0, 1, 0),
        distance: inter.distance,
        object: inter.object,
      } as RaycastHit;
    }
  }

  // 2. Entity hitboxes
  let closestEntityHit: RaycastHit | null = null;
  let hitEntity: Entity | undefined;

  for (const e of engine.entities) {
    if (!e.alive) continue;
    if (ignore && e.object3d.id !== undefined && ignore.has(e.object3d.id)) continue;
    _worldBox.copy(e.hitbox).translate(e.position);
    const dist = rayBoxDistance(origin, direction, _worldBox);
    if (dist !== Infinity && dist <= maxDist) {
      if (!closestEntityHit || dist < closestEntityHit.distance) {
        const hitPoint = origin.clone().add(direction.clone().multiplyScalar(dist));
        // approximate normal: from box center to hit point, normalized
        const center = new THREE.Vector3().addVectors(_worldBox.min, _worldBox.max).multiplyScalar(0.5);
        const normal = hitPoint.clone().sub(center).normalize();
        closestEntityHit = {
          point: hitPoint,
          normal,
          distance: dist,
          object: e.object3d,
          entity: e,
        } as RaycastHit;
        hitEntity = e;
      }
    }
  }

  // 3. Pick closest
  let hit: RaycastHit | null = null;
  if (closestMeshHit && closestEntityHit) {
    hit = closestMeshHit.distance < closestEntityHit.distance ? closestMeshHit : closestEntityHit;
  } else if (closestMeshHit) {
    hit = closestMeshHit;
  } else if (closestEntityHit) {
    hit = closestEntityHit;
  }

  // 4. Headshot detection: upper 25% of hitbox
  if (hit && hit.entity) {
    _worldBox.copy(hit.entity.hitbox).translate(hit.entity.position);
    const boxHeight = _worldBox.max.y - _worldBox.min.y;
    const topThreshold = _worldBox.max.y - boxHeight * 0.25;
    (hit as any).headshot = hit.point.y > topThreshold;
  }

  return hit;
}
