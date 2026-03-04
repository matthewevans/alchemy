import { useEffect } from 'react';
import { useAudioStore } from '@audio/audioStore';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { stopTitleMusic } from '@audio/titleMusic';
import { startDeckSelectMusic, stopDeckSelectMusic } from '@audio/deckSelectMusic';

/** Plays deck-select music while enabled and stops it when disabled/unmounted. */
export function useDeckSelectMusic(enabled: boolean): void {
  useEffect(() => {
    const initialVolume = useAudioStore.getState().musicVolume;
    setMusicVolume(initialVolume);

    if (enabled && initialVolume > 0) {
      stopAmbientMusic();
      stopTitleMusic();
      startDeckSelectMusic();
    } else {
      stopDeckSelectMusic();
    }

    return () => stopDeckSelectMusic();
  }, [enabled]);

  useEffect(() => {
    return useAudioStore.subscribe(
      (s) => s.musicVolume,
      (vol) => {
        setMusicVolume(vol);
        if (!enabled || vol <= 0) {
          stopDeckSelectMusic();
          return;
        }
        stopAmbientMusic();
        stopTitleMusic();
        startDeckSelectMusic();
      },
    );
  }, [enabled]);
}
