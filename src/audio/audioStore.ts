import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { setSfxVolume as applySfxVolume, setMusicVolume as applyMusicVolume } from './audioContext';

const STORAGE_KEY = 'alchemy:audio';
const DEFAULT_SFX_VOLUME = 0.5;
const DEFAULT_MUSIC_VOLUME = 0.2;

interface AudioState {
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  lastSfxVolume: number;
  lastMusicVolume: number;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
}

interface PersistedAudio {
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  lastSfxVolume: number;
  lastMusicVolume: number;
}

function clampVolume(v: number, fallback: number): number {
  if (typeof v !== 'number') return fallback;
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

export function loadPersistedAudio(): PersistedAudio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sfxVolume = clampVolume(parsed.sfxVolume, DEFAULT_SFX_VOLUME);
      const musicVolume = clampVolume(parsed.musicVolume, DEFAULT_MUSIC_VOLUME);
      const lastSfxVolume = clampVolume(
        parsed.lastSfxVolume,
        sfxVolume > 0 ? sfxVolume : DEFAULT_SFX_VOLUME,
      );
      const lastMusicVolume = clampVolume(
        parsed.lastMusicVolume,
        musicVolume > 0 ? musicVolume : DEFAULT_MUSIC_VOLUME,
      );
      const hasPersistedMute = typeof parsed.isMuted === 'boolean';
      const isMuted = hasPersistedMute
        ? parsed.isMuted
        : sfxVolume === 0 && musicVolume === 0;

      return {
        sfxVolume,
        musicVolume,
        isMuted,
        lastSfxVolume,
        lastMusicVolume,
      };
    }
  } catch {
    // corrupt data — fall through to default
  }
  return {
    sfxVolume: DEFAULT_SFX_VOLUME,
    musicVolume: DEFAULT_MUSIC_VOLUME,
    isMuted: false,
    lastSfxVolume: DEFAULT_SFX_VOLUME,
    lastMusicVolume: DEFAULT_MUSIC_VOLUME,
  };
}

function persistAudio(state: Pick<AudioState, 'sfxVolume' | 'musicVolume' | 'isMuted' | 'lastSfxVolume' | 'lastMusicVolume'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initial = loadPersistedAudio();

export const useAudioStore = create<AudioState>()(
  subscribeWithSelector((set, get) => ({
    sfxVolume: initial.sfxVolume,
    musicVolume: initial.musicVolume,
    isMuted: initial.isMuted,
    lastSfxVolume: initial.lastSfxVolume,
    lastMusicVolume: initial.lastMusicVolume,

    setSfxVolume: (v) => {
      const clamped = clampVolume(v, DEFAULT_SFX_VOLUME);
      const current = get();
      const nextIsMuted = clamped === 0 && current.musicVolume === 0;
      const nextLastSfxVolume = clamped > 0 ? clamped : current.lastSfxVolume;
      applySfxVolume(clamped);
      persistAudio({
        sfxVolume: clamped,
        musicVolume: current.musicVolume,
        isMuted: nextIsMuted,
        lastSfxVolume: nextLastSfxVolume,
        lastMusicVolume: current.lastMusicVolume,
      });
      set({
        sfxVolume: clamped,
        isMuted: nextIsMuted,
        lastSfxVolume: nextLastSfxVolume,
      });
    },

    setMusicVolume: (v) => {
      const clamped = clampVolume(v, DEFAULT_MUSIC_VOLUME);
      const current = get();
      const nextIsMuted = current.sfxVolume === 0 && clamped === 0;
      const nextLastMusicVolume = clamped > 0 ? clamped : current.lastMusicVolume;
      applyMusicVolume(clamped);
      persistAudio({
        sfxVolume: current.sfxVolume,
        musicVolume: clamped,
        isMuted: nextIsMuted,
        lastSfxVolume: current.lastSfxVolume,
        lastMusicVolume: nextLastMusicVolume,
      });
      set({
        musicVolume: clamped,
        isMuted: nextIsMuted,
        lastMusicVolume: nextLastMusicVolume,
      });
    },

    setMuted: (muted) => {
      const current = get();

      if (muted) {
        const nextLastSfxVolume = current.sfxVolume > 0 ? current.sfxVolume : current.lastSfxVolume;
        const nextLastMusicVolume = current.musicVolume > 0 ? current.musicVolume : current.lastMusicVolume;
        applySfxVolume(0);
        applyMusicVolume(0);
        persistAudio({
          sfxVolume: 0,
          musicVolume: 0,
          isMuted: true,
          lastSfxVolume: nextLastSfxVolume,
          lastMusicVolume: nextLastMusicVolume,
        });
        set({
          sfxVolume: 0,
          musicVolume: 0,
          isMuted: true,
          lastSfxVolume: nextLastSfxVolume,
          lastMusicVolume: nextLastMusicVolume,
        });
        return;
      }

      const restoredSfxVolume = current.lastSfxVolume > 0 ? current.lastSfxVolume : DEFAULT_SFX_VOLUME;
      const restoredMusicVolume = current.lastMusicVolume > 0 ? current.lastMusicVolume : DEFAULT_MUSIC_VOLUME;
      applySfxVolume(restoredSfxVolume);
      applyMusicVolume(restoredMusicVolume);
      persistAudio({
        sfxVolume: restoredSfxVolume,
        musicVolume: restoredMusicVolume,
        isMuted: false,
        lastSfxVolume: restoredSfxVolume,
        lastMusicVolume: restoredMusicVolume,
      });
      set({
        sfxVolume: restoredSfxVolume,
        musicVolume: restoredMusicVolume,
        isMuted: false,
        lastSfxVolume: restoredSfxVolume,
        lastMusicVolume: restoredMusicVolume,
      });
    },

    toggleMute: () => {
      const { isMuted, setMuted } = get();
      setMuted(!isMuted);
    },
  })),
);
