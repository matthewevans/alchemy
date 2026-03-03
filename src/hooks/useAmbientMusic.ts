import { useEffect } from 'react';
import { startAmbientMusic, stopAmbientMusic } from '@audio/ambientMusic';
import { useAudioStore } from '@audio/audioStore';
import { setMusicVolume } from '@audio/audioContext';

/** Starts ambient music when mounted, stops on unmount. */
export function useAmbientMusic(): void {
  useEffect(() => {
    const initialVolume = useAudioStore.getState().musicVolume;
    if (initialVolume > 0) startAmbientMusic();

    // Apply persisted volume immediately (subscription only fires on future changes)
    setMusicVolume(initialVolume);

    return () => stopAmbientMusic();
  }, []);

  // Sync volume changes from the slider
  useEffect(() => {
    return useAudioStore.subscribe(
      (s) => s.musicVolume,
      (vol) => {
        setMusicVolume(vol);
        if (vol > 0) startAmbientMusic();
        else stopAmbientMusic();
      },
    );
  }, []);
}
