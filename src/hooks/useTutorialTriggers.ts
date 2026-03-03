import { useEffect } from 'react';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { useTutorialStore } from '@game/tutorialStore';
import { getActingPlayer } from '@engine/types';

export function useTutorialTriggers(): void {
  useEffect(() => {
    if (!usePreferencesStore.getState().tutorialEnabled) return;

    useTutorialStore.getState().resetForNewGame();

    return useGameStore.subscribe(
      (s) => s.state?.phase,
      (phase) => {
        if (!phase) return;
        if (useAnimationStore.getState().isAnimating) return;

        const { state, humanPlayer } = useGameStore.getState();
        if (!state || getActingPlayer(state) !== humanPlayer) return;

        const { showTip } = useTutorialStore.getState();

        if (phase.type === 'energy') showTip('first_energy');
        if (phase.type === 'play') showTip('first_play');
        if (phase.type === 'battle' && phase.step === 'declare_attackers') showTip('first_battle');
        if (phase.type === 'battle' && phase.step === 'declare_blockers') showTip('first_block');
      },
    );
  }, []);
}
