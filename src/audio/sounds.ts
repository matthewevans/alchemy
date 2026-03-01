import type { Element } from '@engine/types';
import { getAudioContext, getSfxGain } from './audioContext';

// ─── Types ───

type SoundFn = (ctx: AudioContext, dest: AudioNode) => void;

// ─── Element Frequency Map ───

const ELEMENT_FREQ: Record<Element, number> = {
  fire: 220,
  water: 440,
  earth: 110,
  air: 660,
  shadow: 165,
};

function baseFreq(element?: Element): number {
  return element ? ELEMENT_FREQ[element] : 330;
}

// ─── Noise Buffer (shared, created once) ───

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const size = ctx.sampleRate * 0.25;
    noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// ─── Synthesis Functions ───
// Volume is controlled by the sfxGain bus — these use fixed relative gains.

function playCombatStrike(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Swoosh: filtered noise burst
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = freq * 2;
  bpf.Q.value = 2;
  const swooshGain = ctx.createGain();
  swooshGain.gain.setValueAtTime(0.5, now);
  swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noiseSrc.connect(bpf).connect(swooshGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.15);

  // Impact thud: low sine drop
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  const impactGain = ctx.createGain();
  impactGain.gain.setValueAtTime(0.001, now);
  impactGain.gain.setValueAtTime(0.6, now + 0.08);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(impactGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.23);
}

function playBlockLink(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;

  // Metallic clank: two detuned sawtooth oscillators
  for (const freq of [800, 1050]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }
}

function playDamage(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const intensity = Math.min(1, 0.3 + amount * 0.07);

  // Short percussive hit: highpass noise
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(intensity * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noiseSrc.connect(hpf).connect(gain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.09);
}

function playPlayerDamage(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const intensity = Math.min(1, amount / 5);

  // Deep thud
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(intensity * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.31);

  // Low rumble noise
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 200;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(intensity * 0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  noiseSrc.connect(lpf).connect(noiseGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.26);
}

function playDeath(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Dissolution: 3 detuned sines fading out
  for (const mult of [1, 1.5, 2]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    osc.detune.value = (Math.random() - 0.5) * 20;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.71);
  }
}

function playSpellImpact(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Chime: sine + triangle mix
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq * 2;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(dest);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.41);
  osc2.stop(now + 0.41);

  // Noise burst for impact feel
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = freq * 4;
  bpf.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noiseSrc.connect(bpf).connect(noiseGain).connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.13);
}

function playHeal(ctx: AudioContext, dest: AudioNode, amount: number): void {
  const now = ctx.currentTime;
  const tones = amount >= 3 ? [523, 659, 784] : [523, 659];

  // Ascending chime: arpeggiated sine tones
  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = now + i * 0.06;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(start + 0.31);
  });
}

function playSummon(ctx: AudioContext, dest: AudioNode, element?: Element): void {
  const now = ctx.currentTime;
  const freq = baseFreq(element);

  // Rising whoosh: frequency sweep
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * 0.5, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.setValueAtTime(0.4, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.41);

  // Landing thud
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(80, now + 0.2);
  thud.frequency.exponentialRampToValueAtTime(30, now + 0.35);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.001, now);
  thudGain.gain.setValueAtTime(0.45, now + 0.2);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  thud.connect(thudGain).connect(dest);
  thud.start(now);
  thud.stop(now + 0.36);
}

function playKeyword(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;

  // Crystalline ding: high pure sine
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.21);
}

// ─── Sound Registry (for per-card custom sounds) ───

const SOUND_REGISTRY: Record<string, SoundFn> = {};

export function registerSound(id: string, fn: SoundFn): void {
  SOUND_REGISTRY[id] = fn;
}

// ─── Public API ───

export function playEffectSound(
  type: string,
  opts: { element?: Element; amount?: number; soundId?: string },
): void {
  const ctx = getAudioContext();
  const dest = getSfxGain();

  // Per-card custom sound takes priority
  if (opts.soundId && SOUND_REGISTRY[opts.soundId]) {
    SOUND_REGISTRY[opts.soundId](ctx, dest);
    return;
  }

  switch (type) {
    case 'combat_strike':
      playCombatStrike(ctx, dest, opts.element);
      break;
    case 'block_link':
      playBlockLink(ctx, dest);
      break;
    case 'damage':
      playDamage(ctx, dest, opts.amount ?? 1);
      break;
    case 'player_damage':
      playPlayerDamage(ctx, dest, opts.amount ?? 1);
      break;
    case 'death':
      playDeath(ctx, dest, opts.element);
      break;
    case 'spell_impact':
      playSpellImpact(ctx, dest, opts.element);
      break;
    case 'heal':
    case 'player_heal':
      playHeal(ctx, dest, opts.amount ?? 1);
      break;
    case 'summon':
      playSummon(ctx, dest, opts.element);
      break;
    case 'keyword':
      playKeyword(ctx, dest);
      break;
  }
}
