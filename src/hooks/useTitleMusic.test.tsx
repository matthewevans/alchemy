import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioStore } from '@audio/audioStore';
import { useTitleMusic } from './useTitleMusic';
import { setMusicVolume } from '@audio/audioContext';
import { stopAmbientMusic } from '@audio/ambientMusic';
import { startTitleMusic, stopTitleMusic } from '@audio/titleMusic';

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

function TitleHarness({ enabled }: { enabled: boolean }) {
  useTitleMusic(enabled);
  return null;
}

describe('useTitleMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ musicVolume: 0.3, sfxVolume: 0.7 });
  });

  it('starts title music when enabled and initial music volume is above 0', () => {
    const { unmount } = render(<TitleHarness enabled />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(startTitleMusic).toHaveBeenCalledTimes(1);

    unmount();
    expect(stopTitleMusic).toHaveBeenCalled();
  });

  it('does not start title music when disabled', () => {
    render(<TitleHarness enabled={false} />);

    expect(setMusicVolume).toHaveBeenCalledWith(0.3);
    expect(startTitleMusic).not.toHaveBeenCalled();
    expect(stopAmbientMusic).not.toHaveBeenCalled();
    expect(stopTitleMusic).toHaveBeenCalled();
  });

  it('reacts to music volume changes while enabled', () => {
    useAudioStore.setState({ musicVolume: 0 });
    render(<TitleHarness enabled />);

    expect(startTitleMusic).not.toHaveBeenCalled();
    expect(setMusicVolume).toHaveBeenCalledWith(0);

    act(() => {
      useAudioStore.setState({ musicVolume: 0.5 });
    });
    expect(setMusicVolume).toHaveBeenLastCalledWith(0.5);
    expect(stopAmbientMusic).toHaveBeenCalledTimes(1);
    expect(startTitleMusic).toHaveBeenCalledTimes(1);

    act(() => {
      useAudioStore.setState({ musicVolume: 0 });
    });
    expect(stopTitleMusic).toHaveBeenCalled();
  });
});
