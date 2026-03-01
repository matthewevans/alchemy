import { useEffect } from 'react';
import { startAmbientMusic, stopAmbientMusic } from '@audio/ambientMusic';
import { useAudioStore } from '@audio/audioStore';
import { setMusicVolume } from '@audio/audioContext';

/** Starts ambient music when mounted, stops on unmount. */
export function useAmbientMusic(): void {
  useEffect(() => {
    startAmbientMusic();

    // Apply persisted volume immediately (subscription only fires on future changes)
    setMusicVolume(useAudioStore.getState().musicVolume);

    return () => stopAmbientMusic();
  }, []);

  // Sync volume changes from the slider
  useEffect(() => {
    return useAudioStore.subscribe(
      (s) => s.musicVolume,
      (vol) => setMusicVolume(vol),
    );
  }, []);
}
