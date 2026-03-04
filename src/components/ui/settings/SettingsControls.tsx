interface SettingsSliderProps {
  id: string;
  label: string;
  description?: string;
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
  description,
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
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="w-full mb-1">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm text-white/70">
            {label}
          </label>
          {description && (
            <p id={descriptionId} className="text-[11px] leading-tight text-white/45 mt-0.5">
              {description}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2 pt-0.5">
          <span className="text-xs text-white/60 tabular-nums">{displayValue}</span>
          {showReset && onReset && (
            <button
              className="text-xs text-amber-300/80 hover:text-amber-200 cursor-pointer"
              onClick={onReset}
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-describedby={descriptionId}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600/60"
        style={{ accentColor }}
      />
    </div>
  );
}

interface SettingsToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggle({ id, label, description, checked, onChange }: SettingsToggleProps) {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="w-full flex items-start justify-between gap-3 mb-1">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-white/70">{label}</label>
        {description && (
          <p id={descriptionId} className="text-[11px] leading-tight text-white/45 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
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
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SettingsSelect({ id, label, description, value, options, onChange }: SettingsSelectProps) {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="w-full mb-1">
      <label htmlFor={id} className="text-sm text-white/70 block mb-1">{label}</label>
      {description && (
        <p id={descriptionId} className="text-[11px] leading-tight text-white/45 mb-1.5">
          {description}
        </p>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={descriptionId}
        className="w-full h-8 rounded-lg bg-slate-700/60 text-white/90 text-sm px-2 border border-slate-500/30 cursor-pointer appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
