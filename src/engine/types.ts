// Shared engine types — implemented by Task 1 (engine/player), consumed by all others.
import type * as THREE from 'three';

export type Vec3 = THREE.Vector3;
export type Team = 'CT' | 'T';

// ---------- Engine ----------
export interface RaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D;
  entity?: Entity;
}

export interface Engine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  /** Register a per-frame update callback. Returns an unregister fn. */
  registerUpdate(fn: (dt: number, t: number) => void): () => void;
  /** Hitscan ray against world geometry + entities. Ignores `ignore` object IDs. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, ignore?: Set<number>): RaycastHit | null;
  /** Static world AABB collider — used by player/bot physics. */
  addCollider(box: THREE.Box3): void;
  colliders: THREE.Box3[];
  /** Spatial registry of damageable entities (player + bots) so raycast can resolve hits. */
  registerEntity(e: Entity): void;
  unregisterEntity(e: Entity): void;
  entities: Set<Entity>;
}

// ---------- Entities ----------
export interface Entity {
  id: number;
  kind: 'player' | 'bot';
  team: Team;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  health: number;
  armor: number;
  hitbox: THREE.Box3;
  alive: boolean;
  /** Apply damage. headshot multiplier handled by caller. Returns true if killed. */
  damage(amount: number, attacker?: Entity, headshot?: boolean): boolean;
  object3d: THREE.Object3D;
}

// ---------- Player ----------
export interface PlayerInput {
  forward: boolean; back: boolean; left: boolean; right: boolean;
  jump: boolean; crouch: boolean; walk: boolean;
  fire: boolean; reload: boolean;
  weaponSlot: number | null;
  buyMenu: boolean;
  mouseDX: number; mouseDY: number;
}

export interface PlayerAPI {
  entity: Entity;
  input: PlayerInput;
  money: number;
  respawn(pos: THREE.Vector3, yaw?: number): void;
}

// ---------- Map ----------
export interface MapSpawn { pos: THREE.Vector3; yaw: number; }
export interface MapData {
  name: string;
  spawnsT: MapSpawn[];
  spawnsCT: MapSpawn[];
  bombsiteA: THREE.Vector3;
  bombsiteB: THREE.Vector3;
  colliders: THREE.Box3[];
  root: THREE.Object3D;
}
export interface MapAPI { data: MapData; }

// ---------- Weapons ----------
export type WeaponSlot = 1 | 2 | 3 | 4 | 5;
export interface WeaponSpec {
  id: string;             // 'ak47', 'm4a1', 'awp', 'usp', 'glock', 'knife', 'hegrenade'
  name: string;
  slot: WeaponSlot;       // 1=primary, 2=secondary, 3=knife, 4=grenade, 5=bomb
  damage: number;
  fireRate: number;       // shots per minute
  accuracy: number;       // 0..1 (1 = pinpoint)
  recoil: number;         // radians of vertical kick per shot
  reloadTime: number;     // seconds
  magSize: number;
  reserveAmmo: number;    // starting reserve
  maxReserve: number;
  price: number;
  automatic: boolean;
  range: number;          // meters
  headshotMult: number;
}
export interface FireResult {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  hit: RaycastHit | null;
  weapon: WeaponSpec;
  damageDealt: number;
  killed: boolean;
}
export interface WeaponInstance {
  spec: WeaponSpec;
  ammoInMag: number;
  reserveAmmo: number;
}
export interface WeaponsAPI {
  inventory: WeaponInstance[];
  equipped: WeaponInstance;
  switchTo(slot: WeaponSlot): void;
  /** Attempt to fire. Returns FireResult on actual shot, null if on cooldown / empty. */
  tryFire(): FireResult | null;
  reload(): void;
  give(spec: WeaponSpec): void;
  drop(slot: WeaponSlot): void;
}

// ---------- HUD ----------
export interface KillFeedEntry { attacker: string; victim: string; weapon: string; headshot: boolean; }
export interface HudState {
  health: number; armor: number; money: number;
  ammoInMag: number; reserveAmmo: number; weaponName: string;
  roundTime: number; ctAlive: number; tAlive: number;
  ctScore: number; tScore: number;
  phase: GamePhase;
}
export interface HudAPI {
  update(s: HudState): void;
  log(text: string, color?: string): void;
  killFeed(e: KillFeedEntry): void;
  setBuyMenu(open: boolean, money: number, onBuy: (id: string) => void): void;
  showMessage(text: string, ms?: number): void;
}

// ---------- Bots ----------
export interface BotsAPI {
  spawn(team: Team, spawns: MapSpawn[]): Entity[];
  reset(): void;
  alive(team: Team): number;
  list(): Entity[];
}

// ---------- Game ----------
export type GamePhase = 'warmup' | 'freezetime' | 'live' | 'roundend' | 'matchend';
export interface GameState {
  phase: GamePhase;
  roundTime: number;
  roundNumber: number;
  ctScore: number;
  tScore: number;
}
export interface GameAPI {
  state: GameState;
  start(): void;
  onKill(victim: Entity, attacker: Entity | undefined, weapon: WeaponSpec, headshot: boolean): void;
}

// ---------- Audio ----------
export interface AudioAPI {
  unlock(): void;
  footstep(): void;
  gunshot(weaponId: string): void;
  reload(weaponId: string): void;
  hit(headshot: boolean): void;
  empty(): void;
  switchWeapon(): void;
  death(): void;
  roundStart(): void;
  roundEnd(winner: Team): void;
}

// ---------- Wiring context passed to module factories ----------
export interface GameContext {
  engine: Engine;
  player: PlayerAPI;
  map: MapAPI;
  weapons: WeaponsAPI;
  hud: HudAPI;
  bots: BotsAPI;
  game: GameAPI;
  audio: AudioAPI;
}
