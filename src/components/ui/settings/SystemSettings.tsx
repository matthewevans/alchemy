import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsToggle } from './SettingsControls';

export function SystemSettings() {
  const { autoUpdateEnabled, setAutoUpdateEnabled } = usePreferencesStore();

  return (
    <SettingsToggle
      id="auto-update"
      label="Auto-Update"
      checked={autoUpdateEnabled}
      onChange={setAutoUpdateEnabled}
    />
  );
}
