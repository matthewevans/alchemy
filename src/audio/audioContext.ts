// ─── Lazy AudioContext Singleton ───
// Module-level singleton — not in Zustand because it's only used imperatively.
// Follows the same pattern as positionRegistry in animationStore.ts.

const AUDIO_STORAGE_KEY = 'alchemy:audio';

/** Music is mixed quieter than SFX — this scales user 0–1 to the music bus ceiling. */
const MUSIC_GAIN_CEILING = 0.18;

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

function loadPersistedVolumes(): { sfxVolume: number; musicVolume: number } {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.7,
        musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.3,
      };
    }
  } catch {
    // corrupt data — fall through
  }
  return { sfxVolume: 0.7, musicVolume: 0.3 };
}

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();

    // Apply persisted volumes immediately so the first sound uses correct levels
    const { sfxVolume, musicVolume } = loadPersistedVolumes();

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
