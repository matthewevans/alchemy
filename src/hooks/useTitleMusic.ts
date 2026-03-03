import { useEffect } from 'react';
import { useAudioStore } from '@audio/audioStore';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { startTitleMusic, stopTitleMusic } from '@audio/titleMusic';

/** Plays title-screen music while enabled and stops it when disabled/unmounted. */
export function useTitleMusic(enabled: boolean): void {
  useEffect(() => {
    const initialVolume = useAudioStore.getState().musicVolume;
    setMusicVolume(initialVolume);

    if (enabled && initialVolume > 0) {
      stopAmbientMusic();
      startTitleMusic();
    } else {
      stopTitleMusic();
    }

    return () => stopTitleMusic();
  }, [enabled]);

  useEffect(() => {
    return useAudioStore.subscribe(
      (s) => s.musicVolume,
      (vol) => {
        setMusicVolume(vol);
        if (!enabled || vol <= 0) {
          stopTitleMusic();
          return;
        }
        stopAmbientMusic();
        startTitleMusic();
      },
    );
  }, [enabled]);
}
