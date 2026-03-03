import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { setSfxVolume, setMusicVolume } from './audioContext';

const STORAGE_KEY = 'alchemy:audio';
const DEFAULT_SFX_VOLUME = 0.5;
const DEFAULT_MUSIC_VOLUME = 0.2;

interface AudioState {
  sfxVolume: number;
  musicVolume: number;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
}

export function loadPersistedAudio(): { sfxVolume: number; musicVolume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : DEFAULT_SFX_VOLUME,
        musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULT_MUSIC_VOLUME,
      };
    }
  } catch {
    // corrupt data — fall through to default
  }
  return { sfxVolume: DEFAULT_SFX_VOLUME, musicVolume: DEFAULT_MUSIC_VOLUME };
}

function persistAudio(sfxVolume: number, musicVolume: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sfxVolume, musicVolume }));
}

const initial = loadPersistedAudio();

export const useAudioStore = create<AudioState>()(
  subscribeWithSelector((set, get) => ({
    sfxVolume: initial.sfxVolume,
    musicVolume: initial.musicVolume,

    setSfxVolume: (v) => {
      const clamped = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
      setSfxVolume(clamped);
      persistAudio(clamped, get().musicVolume);
      set({ sfxVolume: clamped });
    },

    setMusicVolume: (v) => {
      const clamped = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
      setMusicVolume(clamped);
      persistAudio(get().sfxVolume, clamped);
      set({ musicVolume: clamped });
    },
  })),
);
