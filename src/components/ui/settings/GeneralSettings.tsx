import { usePreferencesStore } from '@game/preferencesStore';
import { useAudioStore } from '@audio/audioStore';
import { BATTLEFIELDS } from '@components/board/battlefields';
import { SettingsSlider, SettingsToggle, SettingsSelect } from './SettingsControls';

const BATTLEFIELD_OPTIONS = [
  { value: 'auto', label: 'Auto (match deck)' },
  ...BATTLEFIELDS.map((b) => ({ value: b.id, label: b.label })),
];

export function GeneralSettings() {
  const { uiScale, setUIScale, resetUIScale, boardScale, setBoardScale, resetBoardScale, battlefieldAmbience, setBattlefieldAmbience, battlefield, setBattlefield } = usePreferencesStore();
  const { sfxVolume, setSfxVolume, musicVolume, setMusicVolume } = useAudioStore();

  return (
    <>
      <SettingsSlider
        id="ui-scale"
        label="UI Scale"
        value={uiScale}
        displayValue={`${Math.round(uiScale * 100)}%`}
        min={0.6}
        max={1.4}
        step={0.05}
        accentColor="#fbbf24"
        onChange={setUIScale}
        onReset={resetUIScale}
        showReset={uiScale !== 1}
      />
      <SettingsSlider
        id="board-scale"
        label="Board Scale"
        value={boardScale}
        displayValue={`${Math.round(boardScale * 100)}%`}
        min={0.6}
        max={1.4}
        step={0.05}
        accentColor="#34d399"
        onChange={setBoardScale}
        onReset={resetBoardScale}
        showReset={boardScale !== 1}
      />
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

      <SettingsSelect
        id="battlefield"
        label="Battlefield"
        value={battlefield}
        options={BATTLEFIELD_OPTIONS}
        onChange={(v) => setBattlefield(v)}
      />
      <SettingsToggle
        id="battlefield-ambience"
        label="Particles"
        checked={battlefieldAmbience}
        onChange={setBattlefieldAmbience}
      />
    </>
  );
}
