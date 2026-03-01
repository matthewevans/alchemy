import { useAnimationStore } from '@game/animationStore';

const SHAKE_CLASSES: Record<number, string> = {
  1: 'shake-light',
  2: 'shake-medium',
  3: 'shake-heavy',
};

/**
 * Derives a CSS shake class from the active animation step.
 * The CSS animation plays once and naturally returns to rest.
 * When the step advances, the class is removed automatically.
 */
export function useScreenShake(): string {
  const intensity = useAnimationStore((s) => s.activeStep?.shakeIntensity);
  if (!intensity) return '';
  return SHAKE_CLASSES[intensity] ?? '';
}
