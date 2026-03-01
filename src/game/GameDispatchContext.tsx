import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import type { OpponentController } from './controllers/types';
import { dispatchWithAnimations } from './dispatchWithAnimations';

type DispatchFn = (action: GameAction, actingPlayer: PlayerId) => GameEvent[];

const DispatchContext = createContext<DispatchFn | null>(null);
const ControllerContext = createContext<OpponentController | null>(null);

interface GameDispatchProviderProps {
  controller: OpponentController | null;
  children: ReactNode;
}

export function GameDispatchProvider({ controller, children }: GameDispatchProviderProps) {
  const wrappedDispatch: DispatchFn = useMemo(() => {
    return (action, actingPlayer) => {
      return dispatchWithAnimations(action, actingPlayer, (localAction, localPlayer) => {
        controller?.onLocalAction(localAction, localPlayer);
      });
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
