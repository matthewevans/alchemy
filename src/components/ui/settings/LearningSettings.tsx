import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsToggle } from './SettingsControls';

export function LearningSettings() {
  const { easyReadMode, setEasyReadMode, narrationEnabled, setNarrationEnabled, tutorialEnabled, setTutorialEnabled, combatMathEnabled, setCombatMathEnabled } = usePreferencesStore();

  return (
    <>
      <SettingsToggle
        id="easy-read"
        label="Easy Read"
        checked={easyReadMode}
        onChange={setEasyReadMode}
      />
      <SettingsToggle
        id="narration"
        label="Card Narration"
        checked={narrationEnabled}
        onChange={setNarrationEnabled}
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
    </>
  );
}
