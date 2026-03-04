import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStore } from '@audio/audioStore';
import { useDeckSelectMusic } from './useDeckSelectMusic';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { stopTitleMusic } from '@audio/titleMusic';
import { startDeckSelectMusic, stopDeckSelectMusic } from '@audio/deckSelectMusic';

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

function DeckSelectHarness({ enabled }: { enabled: boolean }) {
  useDeckSelectMusic(enabled);
  return null;
}

describe('useDeckSelectMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ musicVolume: 0.3, sfxVolume: 0.7 });
  });

  it('starts deck-select music when enabled and initial music volume is above 0', () => {
    const { unmount } = render(<DeckSelectHarness enabled />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(startDeckSelectMusic).toHaveBeenCalledTimes(1);

    unmount();
    expect(stopDeckSelectMusic).toHaveBeenCalled();
  });

  it('does not start deck-select music when disabled', () => {
    render(<DeckSelectHarness enabled={false} />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(startDeckSelectMusic).not.toHaveBeenCalled();
    expect(stopAmbientMusic).not.toHaveBeenCalled();
    expect(stopTitleMusic).not.toHaveBeenCalled();
    expect(stopDeckSelectMusic).toHaveBeenCalled();
  });

  it('reacts to music volume changes while enabled', () => {
    useAudioStore.setState({ musicVolume: 0 });
    render(<DeckSelectHarness enabled />);

    expect(startDeckSelectMusic).not.toHaveBeenCalled();
    expect(setMusicVolume).toHaveBeenCalledWith(0);

    act(() => {
      useAudioStore.setState({ musicVolume: 0.5 });
    });
    expect(setMusicVolume).toHaveBeenLastCalledWith(0.5);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(startDeckSelectMusic).toHaveBeenCalledTimes(1);

    act(() => {
      useAudioStore.setState({ musicVolume: 0 });
    });
    expect(stopDeckSelectMusic).toHaveBeenCalled();
  });
});
