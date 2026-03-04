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
        description="Uses simpler card wording and keyword explanations."
        checked={easyReadMode}
        onChange={setEasyReadMode}
      />
      <SettingsToggle
        id="combat-math"
        label="Combat Math"
        description="Shows attack and health outcome bubbles while assigning blockers."
        checked={combatMathEnabled}
        onChange={setCombatMathEnabled}
      />
      <SettingsToggle
        id="math-breakdown"
        label="Math Breakdown"
        description="Shows step-by-step combat calculations during animation overlays."
        checked={mathBreakdownEnabled}
        onChange={setMathBreakdownEnabled}
      />
      <SettingsToggle
        id="tutorial"
        label="Tutorial Tips"
        description="Shows contextual coaching prompts as you play."
        checked={tutorialEnabled}
        onChange={setTutorialEnabled}
      />
      <SettingsToggle
        id="auto-update"
        label="Auto-Update"
        description="Automatically installs new game versions when available."
        checked={autoUpdateEnabled}
        onChange={setAutoUpdateEnabled}
      />
    </>
  );
}
