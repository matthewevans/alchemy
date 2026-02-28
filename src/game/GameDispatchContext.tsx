import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import type { OpponentController } from './controllers/types';
import { useGameStore } from './gameStore';
import { useAnimationStore, groupEventsIntoSteps } from './animationStore';

type DispatchFn = (action: GameAction, actingPlayer: PlayerId) => GameEvent[];

const DispatchContext = createContext<DispatchFn | null>(null);
const ControllerContext = createContext<OpponentController | null>(null);

interface GameDispatchProviderProps {
  controller: OpponentController | null;
  children: ReactNode;
}

export function GameDispatchProvider({ controller, children }: GameDispatchProviderProps) {
  const rawDispatch = useGameStore((s) => s.dispatch);

  // rawDispatch is a stable Zustand reference — only controller matters for memo invalidation
  const wrappedDispatch: DispatchFn = useMemo(() => {
    return (action, actingPlayer) => {
      // Read positions before dispatch so dying creatures still have entries
      const positions = useAnimationStore.getState().positions;
      const events = rawDispatch(action, actingPlayer);
      controller?.onLocalAction(action, actingPlayer);

      // Group events into animation steps and enqueue
      const steps = groupEventsIntoSteps(events, positions);
      if (steps.length > 0) {
        useAnimationStore.getState().enqueueSteps(steps);
      }

      return events;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  return (
    <DispatchContext.Provider value={wrappedDispatch}>
      <ControllerContext.Provider value={controller}>
        {children}
      </ControllerContext.Provider>
    </DispatchContext.Provider>
  );
}

export function useGameDispatch(): DispatchFn {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('useGameDispatch must be used within GameDispatchProvider');
  return dispatch;
}

export function useOpponentController(): OpponentController | null {
  return useContext(ControllerContext);
}
