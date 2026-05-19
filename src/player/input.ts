import type { Engine, PlayerInput } from '../engine/types';

const GAME_KEYS = new Set([
  'Space',
  'ShiftLeft', 'ShiftRight',
  'ControlLeft', 'ControlRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'KeyR', 'KeyB', 'KeyC',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
]);

export interface PendingInput {
  jump: boolean;
  reload: boolean;
  weaponSlot: number | null;
}

export function setupInput(engine: Engine, input: PlayerInput): PendingInput {
  const canvas = engine.renderer.domElement;
  const keysDown = new Set<string>();

  const pending: PendingInput = {
    jump: false,
    reload: false,
    weaponSlot: null,
  };

  canvas.addEventListener('click', () => {
    canvas.requestPointerLock?.();
  });

  document.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
    const already = keysDown.has(e.code);
    keysDown.add(e.code);

    switch (e.code) {
      case 'KeyW': input.forward = true; break;
      case 'KeyA': input.left = true; break;
      case 'KeyS': input.back = true; break;
      case 'KeyD': input.right = true; break;
      case 'Space': if (!already) pending.jump = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': input.walk = true; break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'KeyC': input.crouch = true; break;
      case 'KeyR': if (!already) pending.reload = true; break;
      case 'Digit1': if (!already) pending.weaponSlot = 1; break;
      case 'Digit2': if (!already) pending.weaponSlot = 2; break;
      case 'Digit3': if (!already) pending.weaponSlot = 3; break;
      case 'Digit4': if (!already) pending.weaponSlot = 4; break;
      case 'Digit5': if (!already) pending.weaponSlot = 5; break;
      case 'KeyB': if (!already) input.buyMenu = !input.buyMenu; break;
    }
  });

  document.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
    switch (e.code) {
      case 'KeyW': input.forward = false; break;
      case 'KeyA': input.left = false; break;
      case 'KeyS': input.back = false; break;
      case 'KeyD': input.right = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': input.walk = false; break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'KeyC': input.crouch = false; break;
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) input.fire = true;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.fire = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    }
  });

  return pending;
}
