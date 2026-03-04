import { useState, type ComponentType } from 'react';
import { GeneralSettings } from './GeneralSettings';
import { DisplaySettings } from './DisplaySettings';
import { AudioSettings } from './AudioSettings';
import { LearningSettings } from './LearningSettings';

type SettingsTabId = 'general' | 'display' | 'audio' | 'learning';

interface TabDef {
  id: SettingsTabId;
  label: string;
  description: string;
  content: ComponentType;
}

const SETTINGS_TABS: TabDef[] = [
  { id: 'general', label: 'Gameplay', description: 'Core readability and helper options.', content: GeneralSettings },
  { id: 'learning', label: 'Learning', description: 'Adaptive reading and math challenge settings.', content: LearningSettings },
  { id: 'display', label: 'Display', description: 'Visual scale, board styling, and stat layout.', content: DisplaySettings },
  { id: 'audio', label: 'Audio', description: 'Volume and narration settings.', content: AudioSettings },
];

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const activeTabDef = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];
  const ActiveContent = activeTabDef.content;

  return (
    <div className="flex flex-col gap-4 w-full min-h-0">
      <div className="flex flex-col md:flex-row gap-3 min-h-0">
        <nav
          role="tablist"
          className="flex md:flex-col gap-1 shrink-0 bg-slate-900/40 border border-slate-600/30 rounded-xl p-1 overflow-x-auto md:overflow-visible md:min-w-[150px]"
        >
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500/25 text-amber-100'
                  : 'text-white/55 hover:text-white/75 hover:bg-slate-700/30'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          role="tabpanel"
          className="flex-1 min-w-0 min-h-0 rounded-xl border border-slate-600/30 bg-slate-900/25 p-3 sm:p-4 flex flex-col h-[min(52dvh,430px)]"
        >
          <div className="mb-3 shrink-0">
            <h3 className="text-sm font-semibold text-white/90">{activeTabDef.label}</h3>
            <p className="text-xs text-white/50 mt-0.5">{activeTabDef.description}</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              <ActiveContent />
            </div>
          </div>
        </div>
      </div>

      {onClose && (
        <button
          className="text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer self-center"
          onClick={onClose}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
