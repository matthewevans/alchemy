import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStore } from '@audio/audioStore';
import { useAmbientMusic } from './useAmbientMusic';
import { startAmbientMusic, stopAmbientMusic } from '@audio/ambientMusic';
import { setMusicVolume } from '@audio/audioContext';
import { stopDeckSelectMusic } from '@audio/deckSelectMusic';
import { stopTitleMusic } from '@audio/titleMusic';

vi.mock('@audio/ambientMusic', () => ({
  startAmbientMusic: vi.fn(),
  stopAmbientMusic: vi.fn(),
}));

vi.mock('@audio/audioContext', () => ({
  setSfxVolume: vi.fn(),
  setMusicVolume: vi.fn(),
}));

vi.mock('@audio/deckSelectMusic', () => ({
  stopDeckSelectMusic: vi.fn(),
}));

vi.mock('@audio/titleMusic', () => ({
  stopTitleMusic: vi.fn(),
}));

function AmbientHarness() {
  useAmbientMusic();
  return null;
}

describe('useAmbientMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ musicVolume: 0.3, sfxVolume: 0.7 });
  });

  it('does not start ambient music when initial music volume is 0', () => {
    useAudioStore.setState({ musicVolume: 0 });
    const { unmount } = render(<AmbientHarness />);

    expect(startAmbientMusic).not.toHaveBeenCalled();
    expect(setMusicVolume).toHaveBeenCalledWith(0);

    act(() => {
      useAudioStore.setState({ musicVolume: 0.5 });
    });
    expect(startAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(stopDeckSelectMusic).toHaveBeenCalledTimes(1);
    expect(setMusicVolume).toHaveBeenLastCalledWith(0.5);

    act(() => {
      useAudioStore.setState({ musicVolume: 0 });
    });
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);

    unmount();
    expect(stopAmbientMusic).toHaveBeenCalledTimes(2);
  });

  it('starts ambient music immediately when initial music volume is above 0', () => {
    useAudioStore.setState({ musicVolume: 0.4 });
    const { unmount } = render(<AmbientHarness />);

    expect(startAmbientMusic).toHaveBeenCalledTimes(1);
    expect(stopTitleMusic).toHaveBeenCalledTimes(1);
    expect(stopDeckSelectMusic).toHaveBeenCalledTimes(1);
    expect(setMusicVolume).toHaveBeenCalledWith(0.4);

    unmount();
  });
});
