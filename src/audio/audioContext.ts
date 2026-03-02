// ─── Lazy AudioContext Singleton ───
// Module-level singleton — not in Zustand because it's only used imperatively.
// Follows the same pattern as positionRegistry in animationStore.ts.

import { loadPersistedAudio } from './audioStore';

/** Music is mixed quieter than SFX — this scales user 0–1 to the music bus ceiling. */
const MUSIC_GAIN_CEILING = 0.18;

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();

    // Apply persisted volumes immediately so the first sound uses correct levels
    const { sfxVolume, musicVolume } = loadPersistedAudio();

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicVolume * MUSIC_GAIN_CEILING;
    musicGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function getAudioContext(): AudioContext {
  return ensureContext();
}

export function getSfxGain(): GainNode {
  ensureContext();
  return sfxGain!;
}

export function getMusicGain(): GainNode {
  ensureContext();
  return musicGain!;
}

export function setSfxVolume(volume: number): void {
  ensureContext();
  sfxGain!.gain.setValueAtTime(volume, ctx!.currentTime);
}

export function setMusicVolume(volume: number): void {
  ensureContext();
  musicGain!.gain.linearRampToValueAtTime(volume * MUSIC_GAIN_CEILING, ctx!.currentTime + 0.1);
}

/**
 * Warm up the AudioContext during a user gesture (required by iOS/iPadOS).
 * Call once on the first touch/click — subsequent calls are no-ops.
 */
let warmedUp = false;
export function warmUpAudio(): void {
  if (warmedUp) return;
  warmedUp = true;
  ensureContext();
}

// Auto-attach a one-time listener so the AudioContext is created during a user gesture.
// iOS/iPadOS blocks AudioContext creation outside gesture handlers.
if (typeof window !== 'undefined') {
  const onFirstInteraction = () => {
    warmUpAudio();
    window.removeEventListener('pointerdown', onFirstInteraction, true);
  };
  window.addEventListener('pointerdown', onFirstInteraction, true);
}
