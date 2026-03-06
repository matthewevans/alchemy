import type { GameAction, GameState, Permanent, PlayerId } from './types';
import { CARD_REGISTRY } from './cards';
import { computeValidTargets } from './reducer';
import { getOpponent } from './types';
import {
  canKillInCombat,
  estimateGuaranteedUnblockedDamage,
  getCombatDamage,
} from './aiCombat';

function isLowValueSuicideAttack(
  state: GameState,
  actingPlayer: PlayerId,
  action: Extract<GameAction, { type: 'DECLARE_ATTACKER' }>,
): boolean {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return false;
  }
  if (state.activePlayer !== actingPlayer) {
    return false;
  }

  const attacker = state.players[actingPlayer].board.find(
    (slot): slot is Permanent => slot !== null && slot.permanentId === action.permanentId,
  );
  if (!attacker) {
    return false;
  }

  const attackerDamage = getCombatDamage(attacker);
  if (attackerDamage <= 0) {
    return true;
  }

  const opponent = getOpponent(actingPlayer);
  const defendingCreatures = state.players[opponent].board.filter(
    (slot): slot is Permanent => slot !== null && !slot.isTapped,
  );
  if (defendingCreatures.length === 0) {
    return false;
  }

  const currentAttackers = state.phase.tentativeAttackers
    .map((permanentId) => state.players[actingPlayer].board.find(
      (slot): slot is Permanent => slot !== null && slot.permanentId === permanentId,
    ))
    .filter((slot): slot is Permanent => slot !== undefined);
  const nextAttackers = currentAttackers.some((perm) => perm.permanentId === attacker.permanentId)
    ? currentAttackers
    : [...currentAttackers, attacker];

  const guaranteedBefore = estimateGuaranteedUnblockedDamage(
    currentAttackers,
    defendingCreatures.length,
  );
  const guaranteedAfter = estimateGuaranteedUnblockedDamage(
    nextAttackers,
    defendingCreatures.length,
  );
  const gainsGuaranteedDamage = guaranteedAfter > guaranteedBefore;

  const canKillAnyBlocker = defendingCreatures.some((blocker) => canKillInCombat(attacker, blocker));
  const hasBadTradeRisk = defendingCreatures.some(
    (blocker) => canKillInCombat(blocker, attacker) && !canKillInCombat(attacker, blocker),
  );

  return attackerDamage <= 2 && hasBadTradeRisk && !canKillAnyBlocker && !gainsGuaranteedDamage;
}

export function isAIViableAction(
  state: GameState,
  actingPlayer: PlayerId,
  action: GameAction,
): boolean {
  if (action.type === 'CONCEDE') {
    return false;
  }

  if (action.type === 'UNDECLARE_ATTACKER' || action.type === 'REMOVE_BLOCKER') {
    return false;
  }

  if (action.type === 'DECLARE_ATTACKER') {
    return !isLowValueSuicideAttack(state, actingPlayer, action);
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
