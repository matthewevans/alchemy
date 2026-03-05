import { useEffect } from 'react';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { useTutorialStore } from '@game/tutorialStore';
import { getActingPlayer } from '@engine/types';
import { evaluateTipTrigger } from '../tutorial/domain/tipPolicy';

export function useTutorialTriggers(): void {
  useEffect(() => {
    useTutorialStore.getState().resetForNewGame();

    return useGameStore.subscribe(
      (s) => s.state?.phase,
      (phase) => {
        if (!phase) return;
        if (useAnimationStore.getState().isAnimating) return;

        const game = useGameStore.getState();
        if (!game.state) return;

        const isHumanTurn = getActingPlayer(game.state) === game.humanPlayer;
        const tutorialState = useTutorialStore.getState();
        const prefs = usePreferencesStore.getState();

        const decision = evaluateTipTrigger(
          {
            phaseType: phase.type,
            phaseStep: phase.type === 'battle' ? phase.step : undefined,
            combatMathEnabled: prefs.combatMathEnabled,
            isHumanTurn,
          },
          {
            shownThisGame: tutorialState.shownThisGame,
            autoSeenAcrossSessions: tutorialState.autoSeenSteps,
            currentTipId: tutorialState.currentTip?.id ?? null,
          },
          {
            autoTipsEnabled: prefs.tutorialEnabled,
          },
        );

        if (!decision.shouldShow || !decision.tipId) return;
        tutorialState.showTip(decision.tipId, 'auto');
      },
    );
  }, []);
}
