import { TUTORIAL_STEP_IDS, type TutorialStepId } from '../domain/stepRegistry';

const AUTO_SEEN_STORAGE_KEY = 'alchemy:tutorial:auto-seen:v2';

export function loadPersistedAutoSeenTips(): Set<TutorialStepId> {
  try {
    const raw = localStorage.getItem(AUTO_SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter((value): value is TutorialStepId =>
        TUTORIAL_STEP_IDS.includes(value as TutorialStepId),
      ),
    );
  } catch {
    return new Set();
  }
}

export function persistAutoSeenTips(steps: Set<TutorialStepId>): void {
  try {
    localStorage.setItem(AUTO_SEEN_STORAGE_KEY, JSON.stringify([...steps]));
  } catch {
    // Ignore storage failures (private mode/quota).
  }
}
