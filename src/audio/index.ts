// Synthesized Web Audio sound effects. No external samples.
// Contract: see src/engine/types.ts (AudioAPI).
import type { AudioAPI, Team } from '../engine/types';

export function createAudio(): AudioAPI {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;

  function ensure(): AudioContext | null {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function whiteNoiseBuffer(c: AudioContext, ms: number): AudioBuffer {
    const len = Math.max(1, Math.floor((c.sampleRate * ms) / 1000));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function playNoise(
    durationMs: number,
    filterFreq: number,
    q: number,
    peakGain: number,
    attackMs = 4,
  ) {
    const c = ensure();
    if (!c || !master) return;
    const src = c.createBufferSource();
    src.buffer = whiteNoiseBuffer(c, durationMs);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peakGain, now + attackMs / 1000);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    src.connect(filter).connect(g).connect(master);
    src.start(now);
    src.stop(now + durationMs / 1000 + 0.05);
  }

  function playTone(
    freqStart: number,
    freqEnd: number,
    durationMs: number,
    type: OscillatorType = 'sine',
    peakGain = 0.3,
  ) {
    const c = ensure();
    if (!c || !master) return;
    const osc = c.createOscillator();
    osc.type = type;
    const g = c.createGain();
    const now = c.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationMs / 1000);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peakGain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }

  function gunshotProfile(id: string) {
    switch (id) {
      case 'ak47':    return { noise: 90,  filter: 1800, q: 6, gain: 0.55, drop: [200, 60] };
      case 'm4a1':    return { noise: 75,  filter: 2400, q: 5, gain: 0.5,  drop: [240, 80] };
      case 'awp':     return { noise: 180, filter: 900,  q: 8, gain: 0.7,  drop: [140, 30] };
      case 'usp':     return { noise: 60,  filter: 1600, q: 4, gain: 0.4,  drop: [260, 100] };
      case 'glock':   return { noise: 55,  filter: 1900, q: 4, gain: 0.38, drop: [280, 110] };
      case 'deagle':  return { noise: 110, filter: 1300, q: 7, gain: 0.62, drop: [180, 50] };
      case 'knife':   return { noise: 90,  filter: 4000, q: 2, gain: 0.3,  drop: [0, 0] };
      default:        return { noise: 80,  filter: 1700, q: 5, gain: 0.45, drop: [220, 70] };
    }
  }

  return {
    unlock() {
      if (ctx) return;
      const C: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    footstep() {
      playNoise(70, 380, 1.2, 0.18, 2);
    },
    gunshot(id: string) {
      const p = gunshotProfile(id);
      playNoise(p.noise, p.filter, p.q, p.gain, 1);
      if (p.drop[0] > 0) playTone(p.drop[0], p.drop[1], p.noise + 40, 'sawtooth', p.gain * 0.6);
    },
    reload(_id: string) {
      playNoise(50, 2200, 3, 0.22, 1);
      setTimeout(() => playNoise(55, 2200, 3, 0.22, 1), 200);
    },
    hit(headshot: boolean) {
      if (headshot) {
        playTone(1400, 900, 80, 'square', 0.35);
        playNoise(40, 4000, 2, 0.22, 1);
      } else {
        playNoise(70, 600, 3, 0.22, 1);
      }
    },
    empty() {
      playTone(800, 760, 40, 'square', 0.18);
    },
    switchWeapon() {
      playNoise(50, 1800, 3, 0.2, 1);
      playTone(420, 380, 60, 'square', 0.16);
    },
    death() {
      playTone(220, 80, 500, 'sine', 0.45);
    },
    roundStart() {
      // C-E-G ascending
      playTone(523, 523, 180, 'triangle', 0.32);
      setTimeout(() => playTone(659, 659, 180, 'triangle', 0.32), 200);
      setTimeout(() => playTone(784, 784, 280, 'triangle', 0.34), 420);
    },
    roundEnd(winner: Team) {
      if (winner === 'CT') {
        playTone(392, 392, 220, 'triangle', 0.35);
        setTimeout(() => playTone(523, 523, 220, 'triangle', 0.35), 250);
        setTimeout(() => playTone(659, 659, 350, 'triangle', 0.38), 520);
      } else {
        playTone(330, 330, 220, 'sawtooth', 0.35);
        setTimeout(() => playTone(262, 262, 220, 'sawtooth', 0.35), 250);
        setTimeout(() => playTone(196, 196, 350, 'sawtooth', 0.38), 520);
      }
    },
  };
}
