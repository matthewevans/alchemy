import { usePreferencesStore } from '@game/preferencesStore';
import type { BattlefieldPreference } from '@game/preferencesStore';
import { useAudioStore } from '@audio/audioStore';

interface SettingsSliderProps {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  onChange: (value: number) => void;
  onReset?: () => void;
  showReset?: boolean;
}

function SettingsSlider({
  id,
  label,
  value,
  displayValue,
  min,
  max,
  step,
  accentColor,
  onChange,
  onReset,
  showReset,
}: SettingsSliderProps) {
  return (
    <div className="w-full mb-1">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm text-white/70">
          {label}: {displayValue}
        </label>
        {showReset && onReset && (
          <button
            className="text-xs text-amber-300/80 hover:text-amber-200 cursor-pointer"
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600/60"
        style={{ accentColor }}
      />
    </div>
  );
}

const BATTLEFIELD_OPTIONS: { value: BattlefieldPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'fire', label: 'Molten' },
  { value: 'water', label: 'Ocean' },
  { value: 'earth', label: 'Jungle' },
  { value: 'air', label: 'Sky' },
  { value: 'shadow', label: 'Shadow' },
];

interface SettingsToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingsToggle({ id, label, checked, onChange }: SettingsToggleProps) {
  return (
    <div className="w-full flex items-center justify-between mb-1">
      <label htmlFor={id} className="text-sm text-white/70">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${checked ? 'bg-amber-500/80' : 'bg-slate-600/60'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

interface SettingsSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SettingsSelect({ id, label, value, options, onChange }: SettingsSelectProps) {
  return (
    <div className="w-full mb-1">
      <label htmlFor={id} className="text-sm text-white/70 block mb-1">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 rounded-lg bg-slate-700/60 text-white/90 text-sm px-2 border border-slate-500/30 cursor-pointer appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { uiScale, setUIScale, resetUIScale, battlefieldAmbience, setBattlefieldAmbience, battlefield, setBattlefield } = usePreferencesStore();
  const { sfxVolume, setSfxVolume, musicVolume, setMusicVolume } = useAudioStore();

  return (
    <div className="flex flex-col items-center gap-2 w-full">
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

      {/* Divider */}
      <div className="w-full h-px bg-slate-600/30 my-1" />

      <SettingsSelect
        id="battlefield"
        label="Battlefield"
        value={battlefield}
        options={BATTLEFIELD_OPTIONS}
        onChange={(v) => setBattlefield(v as BattlefieldPreference)}
      />
      <SettingsToggle
        id="battlefield-ambience"
        label="Particles"
        checked={battlefieldAmbience}
        onChange={setBattlefieldAmbience}
      />

      {onClose && (
        <button
          className="mt-2 text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          onClick={onClose}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
