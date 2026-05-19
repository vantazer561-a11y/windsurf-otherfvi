// Humanoid bot model — simple capsule body + sphere head + leg boxes.
import * as THREE from 'three';
import type { Team } from '../engine/types';

const CT_COLOR = '#4a6fa5';
const T_COLOR = '#8a4a3a';
const SKIN = '#d6a07a';

export function createBotModel(team: Team): THREE.Group {
  const g = new THREE.Group();
  const tint = team === 'CT' ? CT_COLOR : T_COLOR;

  const bodyMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.85 });
  const gun = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6, metalness: 0.4 });

  // Torso (1.2 tall, 0.55 wide)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 4, 10), bodyMat);
  torso.position.y = 1.15;
  torso.castShadow = true; torso.receiveShadow = true;
  g.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), headMat);
  head.position.y = 1.65;
  head.castShadow = true;
  g.add(head);

  // Vest plate (just a darker thin box on chest, distinguishes teams visually)
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.05), dark);
  vest.position.set(0, 1.2, -0.25);
  g.add(vest);

  // Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), dark);
  legL.position.set(-0.12, 0.4, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legR);

  // Gun (held in front, hint of weapon)
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), gun);
  weapon.position.set(0.15, 1.1, 0.35);
  weapon.castShadow = true;
  g.add(weapon);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), gun);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.15, 1.1, 0.65);
  g.add(barrel);

  // Mark the entire group as not-collidable for raycasts (entities use hitbox-based raycast)
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) (c.userData as any).botPart = true; });

  return g;
}

export function fadeCorpse(group: THREE.Group): void {
  // Lay it on its side and dim materials.
  group.rotation.z = Math.PI / 2;
  group.position.y = 0.4;
  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      const apply = (mat: THREE.MeshStandardMaterial) => {
        mat = mat.clone();
        mat.transparent = true;
        mat.opacity = 0.65;
        (c as THREE.Mesh).material = mat;
      };
      if (Array.isArray(m)) m.forEach(apply); else apply(m);
    }
  });
}
