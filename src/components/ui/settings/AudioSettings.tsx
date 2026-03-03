import { useAudioStore } from '@audio/audioStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsSlider, SettingsToggle } from './SettingsControls';

export function AudioSettings() {
  const { sfxVolume, setSfxVolume, musicVolume, setMusicVolume, isMuted, setMuted } = useAudioStore();
  const { narrationEnabled, setNarrationEnabled } = usePreferencesStore();

  return (
    <>
      <SettingsToggle
        id="audio-enabled"
        label="Audio Enabled"
        checked={!isMuted}
        onChange={(enabled) => setMuted(!enabled)}
      />
      <div className="w-full h-px bg-slate-600/30 my-1" />
      <SettingsSlider
        id="sfx-volume"
        label="SFX"
        value={sfxVolume}
        displayValue={`${Math.round(sfxVolume * 100)}%`}
        min={0}
        max={1}
        step={0.05}
        accentColor="#f97316"
        onChange={setSfxVolume}
      />
      <SettingsSlider
        id="music-volume"
        label="Music"
        value={musicVolume}
        displayValue={`${Math.round(musicVolume * 100)}%`}
        min={0}
        max={1}
        step={0.05}
        accentColor="#818cf8"
        onChange={setMusicVolume}
      />
      <div className="w-full h-px bg-slate-600/30 my-1" />
      <SettingsToggle
        id="narration"
        label="Card Narration"
        checked={narrationEnabled}
        onChange={setNarrationEnabled}
      />
    </>
  );
}
