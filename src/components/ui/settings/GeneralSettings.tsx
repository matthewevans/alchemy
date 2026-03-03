import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsToggle } from './SettingsControls';

export function GeneralSettings() {
  const {
    easyReadMode,
    setEasyReadMode,
    tutorialEnabled,
    setTutorialEnabled,
    combatMathEnabled,
    setCombatMathEnabled,
    mathBreakdownEnabled,
    setMathBreakdownEnabled,
    autoUpdateEnabled,
    setAutoUpdateEnabled,
  } = usePreferencesStore();

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
        id="math-breakdown"
        label="Math Breakdown"
        checked={mathBreakdownEnabled}
        onChange={setMathBreakdownEnabled}
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
