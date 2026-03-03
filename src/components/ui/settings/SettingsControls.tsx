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

export function SettingsSlider({
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

interface SettingsToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggle({ id, label, checked, onChange }: SettingsToggleProps) {
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

export function SettingsSelect({ id, label, value, options, onChange }: SettingsSelectProps) {
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
