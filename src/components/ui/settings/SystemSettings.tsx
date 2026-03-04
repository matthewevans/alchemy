import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsToggle } from './SettingsControls';

export function SystemSettings() {
  const { autoUpdateEnabled, setAutoUpdateEnabled } = usePreferencesStore();

  return (
    <SettingsToggle
      id="auto-update"
      label="Auto-Update"
      description="Automatically installs new game versions when available."
      checked={autoUpdateEnabled}
      onChange={setAutoUpdateEnabled}
    />
  );
}
