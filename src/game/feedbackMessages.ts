import type { GameAction, GameState, PlayerId } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { validateAction } from '@engine/validation';

/**
 * Translates a failed action into a kid-friendly feedback message.
 * Returns null if the action is valid.
 */
export function getActionFeedback(
  state: GameState,
  action: GameAction,
  actingPlayer: PlayerId,
): string | null {
  const result = validateAction(state, action, actingPlayer);
  if (result.valid) return null;

  const reason = result.reason;

  // Energy shortage
  if (reason === 'Not enough energy to play this card' && action.type === 'PLAY_CARD') {
    const card = state.players[actingPlayer].hand[action.cardIndex];
    if (card) {
      const def = CARD_REGISTRY[card.cardId];
      const current = state.players[actingPlayer].currentEnergy;
      return `Needs ${def.cost} ⚡ — you have ${current}`;
    }
  }

  // Summoning sickness
  if (reason === 'Creature has summoning sickness') {
    return 'Just played — can attack next turn! 💤';
  }

  // Tapped creatures
  if (reason === 'Tapped creatures cannot attack' || reason === 'Tapped creatures cannot block') {
    return 'Already used — can\'t act! 🔄';
  }

  // Cannot attack this turn
  if (reason === 'This creature cannot attack this turn') {
    return 'Can\'t attack this turn! 🚫';
  }

  // Wrong phase
  if (reason.includes('only valid during')) {
    return 'Wait for the right phase ⏳';
  }

  // Not your turn
  if (reason === 'It is not your turn') {
    return 'Not your turn yet! ⏳';
  }

  return null;
}
