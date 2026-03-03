import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsToggle } from './SettingsControls';

export function GeneralSettings() {
  const { easyReadMode, setEasyReadMode, tutorialEnabled, setTutorialEnabled, combatMathEnabled, setCombatMathEnabled, autoUpdateEnabled, setAutoUpdateEnabled } = usePreferencesStore();

  return (
    <>
      <SettingsToggle
        id="easy-read"
        label="Easy Read"
        checked={easyReadMode}
        onChange={setEasyReadMode}
      />
      <SettingsToggle
        id="combat-math"
        label="Combat Math"
        checked={combatMathEnabled}
        onChange={setCombatMathEnabled}
      />
      <SettingsToggle
        id="tutorial"
        label="Tutorial Tips"
        checked={tutorialEnabled}
        onChange={setTutorialEnabled}
      />
      <SettingsToggle
        id="auto-update"
        label="Auto-Update"
        checked={autoUpdateEnabled}
        onChange={setAutoUpdateEnabled}
      />
    </>
  );
}
