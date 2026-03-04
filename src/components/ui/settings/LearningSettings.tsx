import { usePreferencesStore } from '@game/preferencesStore';
import { SettingsSelect, SettingsSlider, SettingsToggle } from './SettingsControls';
import type { LearningFrequency, MathLevel, ReadingLevel } from '../../../learning/config';

export function LearningSettings() {
  const {
    learningChallengesEnabled,
    setLearningChallengesEnabled,
    readingChallengesEnabled,
    setReadingChallengesEnabled,
    mathChallengesEnabled,
    setMathChallengesEnabled,
    readingLevel,
    setReadingLevel,
    mathLevel,
    setMathLevel,
    learningFrequency,
    setLearningFrequency,
    readingChallengeWeight,
    setReadingChallengeWeight,
    wordChallengeWeight,
    setWordChallengeWeight,
    mathChallengeWeight,
    setMathChallengeWeight,
  } = usePreferencesStore();

  return (
    <>
      <SettingsToggle
        id="learning-challenges"
        label="Learning Challenges"
        description="Injects short reading/math prompts before key combat confirms."
        checked={learningChallengesEnabled}
        onChange={setLearningChallengesEnabled}
      />
      <SettingsToggle
        id="reading-challenges"
        label="Reading Challenges"
        description="Enables reading prompts such as missing-letter words."
        checked={readingChallengesEnabled}
        onChange={setReadingChallengesEnabled}
      />
      <SettingsToggle
        id="math-challenges"
        label="Math Challenges"
        description="Enables mental math prompts for combat bonuses."
        checked={mathChallengesEnabled}
        onChange={setMathChallengesEnabled}
      />
      <SettingsSelect
        id="reading-level"
        label="Reading Level"
        description="Progresses from CVC decoding to multisyllable words."
        value={readingLevel}
        options={[
          { value: 'r0', label: 'R0 - CVC / K' },
          { value: 'r1', label: 'R1 - Digraphs + Blends / 1' },
          { value: 'r2', label: 'R2 - Long Vowels / 1-2' },
          { value: 'r3', label: 'R3 - Multisyllable / 2-3' },
        ]}
        onChange={(value) => setReadingLevel(value as ReadingLevel)}
      />
      <SettingsSelect
        id="math-level"
        label="Math Level"
        description="Progresses from within 5 facts to two-digit strategy work."
        value={mathLevel}
        options={[
          { value: 'm0', label: 'M0 - Within 5 / K' },
          { value: 'm1', label: 'M1 - Within 10 / 1' },
          { value: 'm2', label: 'M2 - Within 20 / 2' },
          { value: 'm3', label: 'M3 - Two-digit + one-digit / 2-3' },
        ]}
        onChange={(value) => setMathLevel(value as MathLevel)}
      />
      <SettingsSelect
        id="learning-frequency"
        label="Challenge Frequency"
        description="How often challenge prompts can appear at combat gates."
        value={learningFrequency}
        options={[
          { value: 'low', label: 'Low - about every 4th chance' },
          { value: 'medium', label: 'Medium - about every 2nd chance' },
          { value: 'high', label: 'High - every chance' },
        ]}
        onChange={(value) => setLearningFrequency(value as LearningFrequency)}
      />
      <SettingsSlider
        id="reading-challenge-weight"
        label="Reading Weight (Missing Letter)"
        description="Higher values show more missing-letter prompts when learning challenges trigger."
        value={readingChallengeWeight}
        displayValue={`${readingChallengeWeight}`}
        min={0}
        max={10}
        step={1}
        accentColor="#22d3ee"
        onChange={setReadingChallengeWeight}
      />
      <SettingsSlider
        id="word-challenge-weight"
        label="Word Weight (Picture Match)"
        description="Higher values show more word-to-picture prompts; set to 0 to disable this type."
        value={wordChallengeWeight}
        displayValue={`${wordChallengeWeight}`}
        min={0}
        max={10}
        step={1}
        accentColor="#34d399"
        onChange={setWordChallengeWeight}
      />
      <SettingsSlider
        id="math-challenge-weight"
        label="Math Weight"
        description="Higher values show more math prompts when learning challenges trigger."
        value={mathChallengeWeight}
        displayValue={`${mathChallengeWeight}`}
        min={0}
        max={10}
        step={1}
        accentColor="#60a5fa"
        onChange={setMathChallengeWeight}
      />
    </>
  );
}
