import type { GameAction, GameState, PlayerId } from './types';
import { CARD_REGISTRY } from './cards';
import { computeValidTargets } from './reducer';

export function isAIViableAction(
  state: GameState,
  actingPlayer: PlayerId,
  action: GameAction,
): boolean {
  if (action.type === 'CONCEDE') {
    return false;
  }

  if (action.type !== 'PLAY_CARD') {
    return true;
  }

  const card = state.players[actingPlayer]?.hand[action.cardIndex];
  if (!card) {
    return false;
  }

  const cardDef = CARD_REGISTRY[card.cardId];
  if (cardDef.type !== 'spell' || !cardDef.targetingType) {
    return true;
  }

  return computeValidTargets(state, actingPlayer, cardDef.targetingType).length > 0;
}

export function filterAIViableActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): GameAction[] {
  return actions.filter((action) => isAIViableAction(state, actingPlayer, action));
}
