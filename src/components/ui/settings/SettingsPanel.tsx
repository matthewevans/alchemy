import { useState, type ComponentType } from 'react';
import { GeneralSettings } from './GeneralSettings';
import { LearningSettings } from './LearningSettings';
import { SystemSettings } from './SystemSettings';

type SettingsTabId = 'general' | 'learning' | 'system';

interface TabDef {
  id: SettingsTabId;
  label: string;
  content: ComponentType;
}

const SETTINGS_TABS: TabDef[] = [
  { id: 'general', label: 'General', content: GeneralSettings },
  { id: 'learning', label: 'Learning', content: LearningSettings },
  { id: 'system', label: 'System', content: SystemSettings },
];

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-3">
        {/* Left nav */}
        <nav role="tablist" className="flex flex-col gap-0.5 shrink-0 border-r border-slate-600/30 pr-3">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`text-left text-sm px-2 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'text-white/40 hover:text-white/60'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content — grid overlay keeps height stable across tab switches */}
        <div className="flex-1 grid [&>*]:col-start-1 [&>*]:row-start-1 min-w-0">
          {SETTINGS_TABS.map((tab) => {
            const Content = tab.content;
            return (
              <div
                key={tab.id}
                role="tabpanel"
                className={`flex flex-col gap-2 ${activeTab === tab.id ? '' : 'invisible'}`}
              >
                <Content />
              </div>
            );
          })}
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
