import { useState } from 'react';
import { usePreferencesStore } from '@game/preferencesStore';
import { useLearningProfileStore } from '@game/learningProfileStore';
import { SettingsSelect, SettingsSlider, SettingsToggle } from './SettingsControls';
import type { LearningFrequency, MathLevel, ReadingLevel } from '../../../learning/config';
import { LEARNING_AGE_RANGE_OPTIONS, type LearningAgeRange } from '../../../learning/onboarding';

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
    adaptiveLearningEnabled,
    setAdaptiveLearningEnabled,
    adaptiveExplanationEnabled,
    setAdaptiveExplanationEnabled,
    applyLearningPreset,
    clearLearningPreset,
    learningAgeRange,
  } = usePreferencesStore();
  const adaptiveProfile = useLearningProfileStore((s) => s.profile);
  const selectedAgeRange = LEARNING_AGE_RANGE_OPTIONS.find(
    (option) => option.value === learningAgeRange,
  );
  const presetValue = selectedAgeRange?.value ?? 'custom';
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <SettingsToggle
        id="learning-challenges"
        label="Learning Challenges"
        description="Injects short reading/math prompts before key combat confirms."
        checked={learningChallengesEnabled}
        onChange={setLearningChallengesEnabled}
      />
      {!learningChallengesEnabled ? (
        <div className="mt-1 rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-2">
          <p className="text-xs text-white/65">
            Learning challenges are off. Turn this on to configure presets, levels, and challenge mix.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          <div className="rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/85">
              Quick Setup
            </p>
            <p className="mt-1 text-xs text-white/55">
              Pick a preset and challenge frequency, then adjust anything below.
            </p>
            {selectedAgeRange && (
              <div className="mt-2 rounded-lg border border-emerald-300/30 bg-emerald-900/20 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100/90">
                  Active Preset
                </p>
                <p className="mt-1 text-xs text-emerald-100/75">
                  {selectedAgeRange.label}. You can fine-tune any level below.
                </p>
              </div>
            )}
            <div className="mt-2">
              <SettingsSelect
                id="learning-preset"
                label="Learning Preset"
                description="Apply age-based defaults for reading level, math level, frequency, and challenge mix."
                value={presetValue}
                options={[
                  { value: 'custom', label: 'Custom (Manual)' },
                  ...LEARNING_AGE_RANGE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
                onChange={(value) => {
                  if (value === 'custom') {
                    clearLearningPreset();
                    return;
                  }
                  applyLearningPreset(value as LearningAgeRange);
                }}
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
              <SettingsToggle
                id="adaptive-learning"
                label="Adaptive Learning"
                description="Adjusts reading and math levels from recent accuracy using bounded mastery rules."
                checked={adaptiveLearningEnabled}
                onChange={setAdaptiveLearningEnabled}
              />
              <SettingsToggle
                id="adaptive-explain"
                label="Explain Adaptation"
                description="Shows a short reason when adaptive learning changes a level."
                checked={adaptiveExplanationEnabled}
                onChange={setAdaptiveExplanationEnabled}
              />
              {adaptiveLearningEnabled && adaptiveProfile && (
                <div className="mt-1 rounded-lg border border-cyan-300/30 bg-cyan-900/15 px-3 py-2">
                  <p className="text-xs text-cyan-100/85">
                    Current adaptive levels: Reading {adaptiveProfile.reading.level.toUpperCase()} - Math {adaptiveProfile.math.level.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/85">
              Skill Areas
            </p>
            <p className="mt-1 text-xs text-white/55">
              Enable reading/math prompts and set a level for each enabled domain.
            </p>
            <div className="mt-2">
              <SettingsToggle
                id="reading-challenges"
                label="Reading Challenges"
                description="Enables reading prompts such as missing-letter words."
                checked={readingChallengesEnabled}
                onChange={setReadingChallengesEnabled}
              />
              {readingChallengesEnabled && (
                <SettingsSelect
                  id="reading-level"
                  label="Reading Level"
                  description="Progresses from CVC decoding to multisyllable and morphology-rich words."
                  value={readingLevel}
                  options={[
                    { value: 'r0', label: 'R0 - CVC / K' },
                    { value: 'r1', label: 'R1 - Digraphs + Blends / 1' },
                    { value: 'r2', label: 'R2 - Long Vowels / 1-2' },
                    { value: 'r3', label: 'R3 - Multisyllable / 2-3' },
                    { value: 'r4', label: 'R4 - Prefix/Suffix + Multisyllable / 3-4' },
                    { value: 'r5', label: 'R5 - Morphology + Advanced Vocabulary / 4-5' },
                    { value: 'r6', label: 'R6 - Academic + Domain Vocabulary / 5-6' },
                  ]}
                  onChange={(value) => setReadingLevel(value as ReadingLevel)}
                />
              )}
              <SettingsToggle
                id="math-challenges"
                label="Math Challenges"
                description="Enables mental math prompts for combat bonuses."
                checked={mathChallengesEnabled}
                onChange={setMathChallengesEnabled}
              />
              {mathChallengesEnabled && (
                <SettingsSelect
                  id="math-level"
                  label="Math Level"
                  description="Progresses from within-5 facts to multiplication/division and multi-digit fluency."
                  value={mathLevel}
                  options={[
                    { value: 'm0', label: 'M0 - Within 5 / K' },
                    { value: 'm1', label: 'M1 - Within 10 / 1' },
                    { value: 'm2', label: 'M2 - Within 20 / 2' },
                    { value: 'm3', label: 'M3 - Two-digit + one-digit / 2-3' },
                    { value: 'm4', label: 'M4 - Multiplication + Division Facts / 3' },
                    { value: 'm5', label: 'M5 - Multi-digit ×/÷ One-digit / 4' },
                    { value: 'm6', label: 'M6 - Multi-digit ×/÷ Strategy / 5' },
                  ]}
                  onChange={(value) => setMathLevel(value as MathLevel)}
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-3">
            <button
              className="w-full text-left"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/85">
                Advanced Mix Controls {showAdvanced ? '↑' : '↓'}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Tune how often each prompt type appears when challenges trigger.
              </p>
            </button>
            {showAdvanced && (
              <div className="mt-2">
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
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
