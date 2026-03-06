import type { GameAction, GameEvent, GameState, PlayerId, RNG } from './types';
import { getActingPlayer } from './types';
import { enumerateLegalActions } from './validation';
import { reduce } from './reducer';
import type { AIConfig } from './aiConfig';
import { chooseActionByTreeSearch } from './aiSearch';
import { filterAIViableActions } from './aiActionPolicy';
import {
  chooseMulliganAction,
  choosePlayAction,
  chooseTargetingAction,
  chooseAttackerAction,
  chooseBlockerAction,
  chooseBlockerOrderAction,
  chooseCombatPriorityAction,
  chooseDiscardAction,
  applyAttackerRiskGuard,
  pickRandom,
} from './aiStrategy';

// ─── Core AI Function ───

export function chooseAction(
  state: GameState,
  aiPlayer: PlayerId,
  rng: RNG,
  config: AIConfig,
): GameAction {
  const legalActions = enumerateLegalActions(state, aiPlayer);
  if (legalActions.length === 0) {
    throw new Error('No legal actions available');
  }

  const actions = filterAIViableActions(state, aiPlayer, legalActions);
  const sanitizedActions = applyAttackerRiskGuard(state, aiPlayer, actions, rng, config);
  if (sanitizedActions.length === 0) {
    return legalActions[0];
  }

  const searchAction = chooseActionByTreeSearch(state, aiPlayer, rng, config, sanitizedActions);
  if (searchAction) {
    return searchAction;
  }

  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return chooseMulliganAction(state, aiPlayer, sanitizedActions);
    case 'draw':
    case 'energy':
    case 'end':
      return { type: 'ADVANCE_PHASE' };
    case 'play':
      return choosePlayAction(state, aiPlayer, sanitizedActions, rng, config);
    case 'targeting':
      return chooseTargetingAction(state, aiPlayer, sanitizedActions, rng, config);
    case 'battle':
      switch (phase.step) {
        case 'declare_attackers':
          return chooseAttackerAction(state, aiPlayer, sanitizedActions, rng, config);
        case 'declare_blockers':
          return chooseBlockerAction(state, aiPlayer, sanitizedActions, rng, config);
        case 'order_blockers':
          return chooseBlockerOrderAction(state, aiPlayer, sanitizedActions, rng, config);
        default:
          return sanitizedActions[0];
      }
    case 'combat_priority':
      return chooseCombatPriorityAction(state, aiPlayer, sanitizedActions, rng, config);
    case 'learning':
      return pickRandom(sanitizedActions, rng);
    case 'discard':
      return chooseDiscardAction(state, aiPlayer, sanitizedActions);
    default:
      return pickRandom(sanitizedActions, rng);
  }
}

// ─── Run AI Turn ───

export function runAITurn(
  state: GameState,
  aiPlayer: PlayerId,
  rng: RNG,
  config: AIConfig,
): { finalState: GameState; actions: GameAction[]; events: GameEvent[] } {
  const actions: GameAction[] = [];
  const events: GameEvent[] = [];
  let currentState = state;

  for (let i = 0; i < 100; i++) {
    const legalActions = enumerateLegalActions(currentState, aiPlayer);
    const nonConcede = legalActions.filter((a) => a.type !== 'CONCEDE');
    if (nonConcede.length === 0) {
      break;
    }

    if (currentState.phase.type === 'game_over') {
      break;
    }

    if (getActingPlayer(currentState) !== aiPlayer) {
      break;
    }

    const action = chooseAction(currentState, aiPlayer, rng, config);
    const result = reduce(currentState, action, aiPlayer, rng);
    actions.push(action);
    events.push(...result.events);
    currentState = result.newState;
  }

  return { finalState: currentState, actions, events };
}
