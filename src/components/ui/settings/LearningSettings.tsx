import { useState } from 'react';
import { usePreferencesStore } from '@game/preferencesStore';
import { useLearningProfileStore } from '@game/learningProfileStore';
import { SettingsSelect, SettingsSlider, SettingsToggle } from './SettingsControls';
import type { LearningFrequency, MathLevel, ReadingLevel } from '../../../learning/config';
import { LEARNING_AGE_RANGE_OPTIONS, type LearningAgeRange } from '../../../learning/onboarding';

const FREQUENCY_OPTIONS: { value: LearningFrequency; label: string }[] = [
  { value: 'low', label: 'Low - about every 4th chance' },
  { value: 'medium', label: 'Medium - about every 2nd chance' },
  { value: 'high', label: 'High - every chance' },
];

const READING_LEVEL_OPTIONS: { value: ReadingLevel; label: string }[] = [
  { value: 'r0', label: 'R0 - CVC / K' },
  { value: 'r1', label: 'R1 - Digraphs + Blends / 1' },
  { value: 'r2', label: 'R2 - Long Vowels / 1-2' },
  { value: 'r3', label: 'R3 - Multisyllable / 2-3' },
  { value: 'r4', label: 'R4 - Prefix/Suffix + Multisyllable / 3-4' },
  { value: 'r5', label: 'R5 - Morphology + Advanced Vocabulary / 4-5' },
  { value: 'r6', label: 'R6 - Academic + Domain Vocabulary / 5-6' },
];

const MATH_LEVEL_OPTIONS: { value: MathLevel; label: string }[] = [
  { value: 'm0', label: 'M0 - Within 5 / K' },
  { value: 'm1', label: 'M1 - Within 10 / 1' },
  { value: 'm2', label: 'M2 - Within 20 / 2' },
  { value: 'm3', label: 'M3 - Two-digit + one-digit / 2-3' },
  { value: 'm4', label: 'M4 - Multiplication + Division Facts / 3' },
  { value: 'm5', label: 'M5 - Multi-digit ×/÷ One-digit / 4' },
  { value: 'm6', label: 'M6 - Multi-digit ×/÷ Strategy / 5' },
];

const FREQUENCY_SUMMARY: Record<LearningFrequency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

type LearningEditorId = 'preset' | 'frequency' | 'domains' | 'adaptive' | 'mix';

const EDITOR_DETAILS: Record<LearningEditorId, { label: string; description: string }> = {
  preset: {
    label: 'Learning Preset',
    description: 'Apply age-based defaults for levels and mix.',
  },
  frequency: {
    label: 'Challenge Frequency',
    description: 'How often prompts can appear at combat gates.',
  },
  domains: {
    label: 'Domains',
    description: 'Enable reading and math, then set each level.',
  },
  adaptive: {
    label: 'Adaptive Learning',
    description: 'Automatically tune levels from recent answer accuracy.',
  },
  mix: {
    label: 'Prompt Mix',
    description: 'Control how often each prompt type appears.',
  },
};

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
  const [activeEditor, setActiveEditor] = useState<LearningEditorId>('preset');

  const presetSummary = selectedAgeRange?.label ?? 'Custom';
  const domainsSummary = `R ${readingChallengesEnabled ? readingLevel.toUpperCase() : 'Off'} · M ${mathChallengesEnabled ? mathLevel.toUpperCase() : 'Off'}`;
  const adaptiveSummary = adaptiveLearningEnabled ? 'On' : 'Off';
  const mixSummary = `R ${readingChallengeWeight} · W ${wordChallengeWeight} · M ${mathChallengeWeight}`;
  const profileItems: { id: LearningEditorId; label: string; summary: string }[] = [
    { id: 'preset', label: 'Preset', summary: presetSummary },
    { id: 'frequency', label: 'Frequency', summary: FREQUENCY_SUMMARY[learningFrequency] },
    { id: 'domains', label: 'Domains', summary: domainsSummary },
    { id: 'adaptive', label: 'Adaptive', summary: adaptiveSummary },
    { id: 'mix', label: 'Prompt Mix', summary: mixSummary },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SettingsToggle
        id="learning-challenges"
        label="Learning Challenges"
        description="Injects short reading/math prompts before key combat confirms."
        checked={learningChallengesEnabled}
        onChange={(enabled) => {
          setLearningChallengesEnabled(enabled);
          if (!enabled) {
            setActiveEditor('preset');
          }
        }}
      />
      {!learningChallengesEnabled ? (
        <div className="mt-1 rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-2">
          <p className="text-xs text-white/65">
            Learning challenges are off. Turn this on to configure presets, levels, and challenge mix.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/85">
              Learning Profile
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {profileItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`min-h-11 rounded-md border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    item.id === 'mix' ? 'sm:col-span-2 ' : ''
                  }${
                    activeEditor === item.id
                      ? 'border-amber-400/40 bg-amber-500/15'
                      : 'border-slate-600/35 bg-slate-950/20 hover:bg-slate-900/35'
                  }`}
                  onClick={() => setActiveEditor(item.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-white/70">{item.label}</p>
                    <p className="text-xs text-white/80">{item.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-500/30 bg-slate-900/35 px-3 py-3">
            <p className="text-sm font-semibold text-white/85">
              {EDITOR_DETAILS[activeEditor].label}
            </p>
            <p className="mt-0.5 text-xs text-white/55">{EDITOR_DETAILS[activeEditor].description}</p>
            <div className="mt-2 border-t border-slate-600/30 pt-2">
              {activeEditor === 'preset' && (
                <>
                  <SettingsSelect
                    id="learning-preset"
                    label="Learning Preset"
                    description="Apply age-based defaults."
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
                  {selectedAgeRange && (
                    <div className="mt-2 rounded-lg border border-emerald-300/30 bg-emerald-900/20 px-3 py-2">
                      <p className="text-xs text-emerald-100/80">
                        Active preset: {selectedAgeRange.label}
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeEditor === 'frequency' && (
                <SettingsSelect
                  id="learning-frequency"
                  label="Challenge Frequency"
                  description="Prompt cadence during combat."
                  value={learningFrequency}
                  options={FREQUENCY_OPTIONS}
                  onChange={(value) => setLearningFrequency(value as LearningFrequency)}
                />
              )}

              {activeEditor === 'domains' && (
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-600/35 bg-slate-950/25 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/75">Reading</p>
                    <div className="mt-1">
                      <SettingsToggle
                        id="reading-challenges"
                        label="Reading Challenges"
                        description="Enable reading prompts."
                        checked={readingChallengesEnabled}
                        onChange={setReadingChallengesEnabled}
                      />
                      {readingChallengesEnabled && (
                        <SettingsSelect
                          id="reading-level"
                          label="Reading Level"
                          description="R0 to R6 word complexity."
                          value={readingLevel}
                          options={READING_LEVEL_OPTIONS}
                          onChange={(value) => setReadingLevel(value as ReadingLevel)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-600/35 bg-slate-950/25 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/75">Math</p>
                    <div className="mt-1">
                      <SettingsToggle
                        id="math-challenges"
                        label="Math Challenges"
                        description="Enable math prompts."
                        checked={mathChallengesEnabled}
                        onChange={setMathChallengesEnabled}
                      />
                      {mathChallengesEnabled && (
                        <SettingsSelect
                          id="math-level"
                          label="Math Level"
                          description="M0 to M6 math complexity."
                          value={mathLevel}
                          options={MATH_LEVEL_OPTIONS}
                          onChange={(value) => setMathLevel(value as MathLevel)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeEditor === 'adaptive' && (
                <>
                  <SettingsToggle
                    id="adaptive-learning"
                    label="Adaptive Learning"
                    description="Auto-adjust levels from outcomes."
                    checked={adaptiveLearningEnabled}
                    onChange={setAdaptiveLearningEnabled}
                  />
                  {adaptiveLearningEnabled && (
                    <>
                      <SettingsToggle
                        id="adaptive-explain"
                        label="Explain Adaptation"
                        description="Show why a level changed."
                        checked={adaptiveExplanationEnabled}
                        onChange={setAdaptiveExplanationEnabled}
                      />
                      {adaptiveProfile && (
                        <div className="mt-1 rounded-lg border border-cyan-300/30 bg-cyan-900/15 px-3 py-2">
                          <p className="text-xs text-cyan-100/85">
                            Current levels: Reading {adaptiveProfile.reading.level.toUpperCase()} - Math{' '}
                            {adaptiveProfile.math.level.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {activeEditor === 'mix' && (
                <>
                  <SettingsSlider
                    id="reading-challenge-weight"
                    label="Reading Weight (Missing Letter)"
                    description="Chance of missing-letter prompts."
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
                    description="Chance of picture-match prompts."
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
                    description="Chance of math prompts."
                    value={mathChallengeWeight}
                    displayValue={`${mathChallengeWeight}`}
                    min={0}
                    max={10}
                    step={1}
                    accentColor="#60a5fa"
                    onChange={setMathChallengeWeight}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
