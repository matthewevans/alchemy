import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStore } from '@audio/audioStore';
import { useMultiplayerLobbyMusic } from './useMultiplayerLobbyMusic';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { stopTitleMusic } from '@audio/titleMusic';
import { stopDeckSelectMusic } from '@audio/deckSelectMusic';
import { startMultiplayerLobbyMusic, stopMultiplayerLobbyMusic } from '@audio/multiplayerLobbyMusic';

vi.mock('@audio/audioContext', () => ({
  setSfxVolume: vi.fn(),
  setMusicVolume: vi.fn(),
}));

vi.mock('@audio/ambientMusic', () => ({
  startAmbientMusic: vi.fn(),
  stopAmbientMusic: vi.fn(),
}));

vi.mock('@audio/titleMusic', () => ({
  startTitleMusic: vi.fn(),
  stopTitleMusic: vi.fn(),
}));

vi.mock('@audio/deckSelectMusic', () => ({
  startDeckSelectMusic: vi.fn(),
  stopDeckSelectMusic: vi.fn(),
}));

vi.mock('@audio/multiplayerLobbyMusic', () => ({
  startMultiplayerLobbyMusic: vi.fn(),
  stopMultiplayerLobbyMusic: vi.fn(),
}));

function MultiplayerLobbyHarness({ enabled }: { enabled: boolean }) {
  useMultiplayerLobbyMusic(enabled);
  return null;
}

describe('useMultiplayerLobbyMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ musicVolume: 0.3, sfxVolume: 0.7 });
  });

  it('starts multiplayer-lobby music when enabled and initial music volume is above 0', () => {
    const { unmount } = render(<MultiplayerLobbyHarness enabled />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(stopDeckSelectMusic).toHaveBeenCalledTimes(1);
    expect(startMultiplayerLobbyMusic).toHaveBeenCalledTimes(1);

    unmount();
    expect(stopMultiplayerLobbyMusic).toHaveBeenCalled();
  });

  it('does not start multiplayer-lobby music when disabled', () => {
    render(<MultiplayerLobbyHarness enabled={false} />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(startMultiplayerLobbyMusic).not.toHaveBeenCalled();
    expect(stopAmbientMusic).not.toHaveBeenCalled();
    expect(stopTitleMusic).not.toHaveBeenCalled();
    expect(stopDeckSelectMusic).not.toHaveBeenCalled();
    expect(stopMultiplayerLobbyMusic).toHaveBeenCalled();
  });

  it('reacts to music volume changes while enabled', () => {
    useAudioStore.setState({ musicVolume: 0 });
    render(<MultiplayerLobbyHarness enabled />);

    expect(startMultiplayerLobbyMusic).not.toHaveBeenCalled();
    expect(setMusicVolume).toHaveBeenCalledWith(0);

    act(() => {
      useAudioStore.setState({ musicVolume: 0.5 });
    });
    expect(setMusicVolume).toHaveBeenLastCalledWith(0.5);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(stopDeckSelectMusic).toHaveBeenCalledTimes(1);
    expect(startMultiplayerLobbyMusic).toHaveBeenCalledTimes(1);

    act(() => {
      useAudioStore.setState({ musicVolume: 0 });
    });
    expect(stopMultiplayerLobbyMusic).toHaveBeenCalled();
  });
});
