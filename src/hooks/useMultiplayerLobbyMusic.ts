import { useEffect } from 'react';
import { useAudioStore } from '@audio/audioStore';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { stopDeckSelectMusic } from '@audio/deckSelectMusic';
import { stopTitleMusic } from '@audio/titleMusic';
import { startMultiplayerLobbyMusic, stopMultiplayerLobbyMusic } from '@audio/multiplayerLobbyMusic';

/** Plays multiplayer-lobby music while enabled and stops it when disabled/unmounted. */
export function useMultiplayerLobbyMusic(enabled: boolean): void {
  useEffect(() => {
    const initialVolume = useAudioStore.getState().musicVolume;
    setMusicVolume(initialVolume);

    if (enabled && initialVolume > 0) {
      stopAmbientMusic();
      stopTitleMusic();
      stopDeckSelectMusic();
      startMultiplayerLobbyMusic();
    } else {
      stopMultiplayerLobbyMusic();
    }

    return () => stopMultiplayerLobbyMusic();
  }, [enabled]);

  useEffect(() => {
    return useAudioStore.subscribe(
      (s) => s.musicVolume,
      (vol) => {
        setMusicVolume(vol);
        if (!enabled || vol <= 0) {
          stopMultiplayerLobbyMusic();
          return;
        }
        stopAmbientMusic();
        stopTitleMusic();
        stopDeckSelectMusic();
        startMultiplayerLobbyMusic();
      },
    );
  }, [enabled]);
}
