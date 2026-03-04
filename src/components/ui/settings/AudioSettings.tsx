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
        description="Master mute for both music and sound effects."
        checked={!isMuted}
        onChange={(enabled) => setMuted(!enabled)}
      />
      <div className="w-full h-px bg-slate-600/30 my-1" />
      <SettingsSlider
        id="sfx-volume"
        label="SFX"
        description="Controls gameplay sound effect volume."
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
        description="Controls background music volume."
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
        description="Reads played and previewed cards aloud."
        checked={narrationEnabled}
        onChange={setNarrationEnabled}
      />
    </>
  );
}
