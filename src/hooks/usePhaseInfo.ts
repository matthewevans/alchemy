import type { GameAction, Phase } from '@engine/types';
import { useGameStore } from '@game/gameStore';

export interface PhaseEntry {
  key: string;
  label: string;
}

export const PHASES: PhaseEntry[] = [
  { key: 'draw', label: 'Draw' },
  { key: 'energy', label: 'Energy' },
  { key: 'play', label: 'Play' },
  { key: 'battle', label: 'Battle' },
  { key: 'play2', label: 'Play' },
];

export const PHASE_ORDER: Record<string, number> = {
  draw: 0,
  energy: 1,
  play: 2,
  targeting: 2, // targeting is sub-phase of play
  battle: 3,
  play2: 4,
  end: 5, // auto-advances, not shown in strip
};

/** Map raw phase to a display key that accounts for post-combat play. */
export function getDisplayPhaseKey(phase: Phase): string {
  if (phase.type === 'play' && phase.postCombat) return 'play2';
  if (phase.type === 'targeting' && phase.postCombat) return 'play2';
  return phase.type;
}

export function getAdvanceAction(displayKey: string): { action: GameAction; label: string } | null {
  switch (displayKey) {
    case 'play':
      return { action: { type: 'ADVANCE_PHASE' }, label: 'Battle!' };
    case 'play2':
      return { action: { type: 'ADVANCE_PHASE' }, label: 'End Turn' };
    default:
      return null;
  }
}

export interface PhaseInfo {
  displayKey: string;
  currentOrder: number;
  canAdvance: boolean;
  advanceAction: GameAction | null;
  advanceLabel: string | null;
  phases: PhaseEntry[];
}

export function usePhaseInfo(): PhaseInfo | null {
  const phase = useGameStore((s) => s.state?.phase);
  const legalActions = useGameStore((s) => s.legalActions);

  if (!phase) return null;

  const displayKey = getDisplayPhaseKey(phase);
  const currentOrder = PHASE_ORDER[displayKey] ?? -1;
  const canAdvance = legalActions.some((a) => a.type === 'ADVANCE_PHASE');
  const advance = getAdvanceAction(displayKey);

  return {
    displayKey,
    currentOrder,
    canAdvance,
    advanceAction: advance?.action ?? null,
    advanceLabel: advance?.label ?? null,
    phases: PHASES,
  };
}
