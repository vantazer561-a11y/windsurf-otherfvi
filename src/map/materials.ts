// Procedural materials for the de_dust2-inspired map.
// Pure THREE + CanvasTexture. No external assets.
import * as THREE from 'three';

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.12) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function sandFloorMaterial(): THREE.MeshStandardMaterial {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#d4b896';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle blotches
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 14;
      ctx.fillStyle = `rgba(${180 + Math.random() * 30}, ${150 + Math.random() * 30}, ${110 + Math.random() * 20}, 0.5)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    noise(ctx, 256, 256, 0.18);
  });
  tex.repeat.set(20, 20);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
}

export function wallMaterial(): THREE.MeshStandardMaterial {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#b08a5e';
    ctx.fillRect(0, 0, 256, 256);
    // Brick lines
    ctx.strokeStyle = 'rgba(80, 55, 30, 0.5)';
    ctx.lineWidth = 1;
    for (let y = 16; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      const off = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = off; x < 256; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
    }
    noise(ctx, 256, 256, 0.14);
  });
  tex.repeat.set(2, 1);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 });
}

export function crateMaterial(): THREE.MeshStandardMaterial {
  const tex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 128, 128);
    // Plank grain
    ctx.strokeStyle = 'rgba(60, 36, 14, 0.7)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 128; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    }
    // Border (metal trim)
    ctx.strokeStyle = '#3a2814';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
    noise(ctx, 128, 128, 0.1);
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
}

export function concreteMaterial(): THREE.MeshStandardMaterial {
  const tex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(0, 0, 128, 128);
    noise(ctx, 128, 128, 0.18);
  });
  tex.repeat.set(3, 3);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

export function bombsiteMaterial(label: 'A' | 'B'): THREE.MeshStandardMaterial {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#cc8866';
    ctx.fillRect(0, 0, 256, 256);
    // Hazard stripes border
    ctx.fillStyle = '#222';
    for (let i = -256; i < 512; i += 32) {
      ctx.save();
      ctx.translate(i, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(0, 0, 16, 360);
      ctx.restore();
    }
    // Inner panel
    ctx.fillStyle = '#cc8866';
    ctx.fillRect(36, 36, 184, 184);
    // Label
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 160px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 138);
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
}

export function skyMaterial(): THREE.MeshBasicMaterial {
  const tex = canvasTexture(512, 512, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5a8fbf');
    grad.addColorStop(0.5, '#a8c9e5');
    grad.addColorStop(0.85, '#dde6ec');
    grad.addColorStop(1, '#c4a988');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  });
  return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
}
