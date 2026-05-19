import * as THREE from 'three';

export function resolveMovement(
  pos: THREE.Vector3,
  hitbox: THREE.Box3,
  movement: THREE.Vector3,
  colliders: THREE.Box3[],
): { collidedX: boolean; collidedZ: boolean; collidedY: boolean } {
  const result = { collidedX: false, collidedZ: false, collidedY: false };
  const axes: Array<'x' | 'z' | 'y'> = ['x', 'z', 'y'];

  for (const axis of axes) {
    const before = pos[axis];
    pos[axis] += movement[axis];

    const worldBox = new THREE.Box3().copy(hitbox).translate(pos);

    for (const col of colliders) {
      if (worldBox.intersectsBox(col)) {
        if (movement[axis] > 0) {
          pos[axis] = Math.min(pos[axis], col.min[axis] - hitbox.max[axis]);
        } else if (movement[axis] < 0) {
          pos[axis] = Math.max(pos[axis], col.max[axis] - hitbox.min[axis]);
        }
        worldBox.copy(hitbox).translate(pos);
      }
    }

    if (movement[axis] !== 0 && Math.abs(pos[axis] - (before + movement[axis])) > 1e-6) {
      if (axis === 'x') result.collidedX = true;
      if (axis === 'z') result.collidedZ = true;
      if (axis === 'y') result.collidedY = true;
    }
  }

  return result;
}

export function testGround(
  pos: THREE.Vector3,
  hitbox: THREE.Box3,
  colliders: THREE.Box3[],
): boolean {
  const testBox = new THREE.Box3().copy(hitbox).translate(pos);
  testBox.min.y -= 0.06;
  for (const col of colliders) {
    if (testBox.intersectsBox(col)) return true;
  }
  return false;
}
