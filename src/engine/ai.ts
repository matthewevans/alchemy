import type { GameAction, GameEvent, GameState, PlayerId, RNG } from './types';
import { CARD_REGISTRY } from './cards';
import { EFFECT_REGISTRY } from './effects';
import { getCurrentHealth, getEffectiveAttack, getOpponent } from './types';
import { enumerateLegalActions } from './validation';
import { reduce } from './reducer';

// ─── Core AI Function ───

export function chooseAction(state: GameState, aiPlayer: PlayerId, rng: RNG): GameAction {
  const legalActions = enumerateLegalActions(state, aiPlayer);
  if (legalActions.length === 0) {
    throw new Error('No legal actions available');
  }

  // Filter out CONCEDE — AI should never concede
  const actions = legalActions.filter((a) => a.type !== 'CONCEDE');
  if (actions.length === 0) {
    return legalActions[0];
  }

  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return chooseMulliganAction(state, aiPlayer, actions);
    case 'draw':
    case 'energy':
    case 'end':
      return { type: 'ADVANCE_PHASE' };
    case 'play':
      return choosePlayAction(state, aiPlayer, actions);
    case 'targeting':
      return chooseTargetingAction(state, aiPlayer, actions);
    case 'battle':
      return chooseBattleAction(state, aiPlayer, actions);
    case 'discard':
      return chooseDiscardAction(state, aiPlayer, actions);
    default:
      return pickRandom(actions, rng);
  }
}

// ─── Phase-Specific Strategy ───

function chooseMulliganAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  const hand = state.players[aiPlayer].hand;
  const hasLowCost = hand.some((card) => {
    const def = CARD_REGISTRY[card.cardId];
    return def.cost <= 2;
  });

  if (hasLowCost) {
    return { type: 'KEEP_HAND' };
  }

  // Mulligan the most expensive cards
  if (state.players[aiPlayer].mulliganUsed) {
    return { type: 'KEEP_HAND' };
  }

  const cardCosts = hand.map((card, index) => ({
    index,
    cost: CARD_REGISTRY[card.cardId].cost,
  }));
  cardCosts.sort((a, b) => b.cost - a.cost);

  // Mulligan the top half of expensive cards (at least 1)
  const mulliganCount = Math.max(1, Math.floor(cardCosts.length / 2));
  const indicesToMulligan = cardCosts
    .slice(0, mulliganCount)
    .map((c) => c.index)
    .sort((a, b) => a - b);

  const mulliganAction: GameAction = { type: 'MULLIGAN_CARDS', cardIndices: indicesToMulligan };
  // Verify this is in legal actions
  if (actions.some((a) => a.type === 'MULLIGAN_CARDS')) {
    return mulliganAction;
  }

  return { type: 'KEEP_HAND' };
}

function choosePlayAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  const playActions = actions.filter((a) => a.type === 'PLAY_CARD');

  if (playActions.length === 0) {
    return { type: 'ADVANCE_PHASE' };
  }

  // Group play actions by card, pick highest cost card
  const playerState = state.players[aiPlayer];
  let bestAction: GameAction | null = null;
  let bestCost = -1;

  for (const action of playActions) {
    if (action.type !== 'PLAY_CARD') continue;
    const cardInstance = playerState.hand[action.cardIndex];
    const cardDef = CARD_REGISTRY[cardInstance.cardId];

    if (cardDef.cost > bestCost) {
      bestCost = cardDef.cost;
      // For creatures, prefer the leftmost empty slot
      if (cardDef.type === 'creature') {
        const slotsForThisCard = playActions
          .filter(
            (a) => a.type === 'PLAY_CARD' && a.cardIndex === action.cardIndex,
          )
          .sort((a, b) => {
            const slotA = a.type === 'PLAY_CARD' ? (a.targetSlot ?? 0) : 0;
            const slotB = b.type === 'PLAY_CARD' ? (b.targetSlot ?? 0) : 0;
            return slotA - slotB;
          });
        bestAction = slotsForThisCard[0];
      } else {
        bestAction = action;
      }
    }
  }

  return bestAction ?? { type: 'ADVANCE_PHASE' };
}

function chooseTargetingAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  if (state.phase.type !== 'targeting') {
    return actions[0];
  }

  const selectActions = actions.filter((a) => a.type === 'SELECT_TARGET');
  if (selectActions.length === 0) {
    return actions.find((a) => a.type === 'CANCEL_TARGETING') ?? actions[0];
  }

  const effectDef = EFFECT_REGISTRY[state.phase.effectId];

  if (effectDef) {
    const steps = effectDef.steps;
    const hasDamage = steps.some((s) => s.type === 'damage');
    const hasDestroy = steps.some((s) => s.type === 'destroy');
    const hasBuff = steps.some((s) => s.type === 'buff' || s.type === 'grant_keyword');
    const hasBounce = steps.some((s) => s.type === 'bounce');
    const hasPreventAttack = steps.some((s) => s.type === 'prevent_attack');

    if (hasDamage || hasDestroy || hasBounce || hasPreventAttack) {
      // Offensive: target enemy creature with highest attack, or lowest health for damage
      return pickBestEnemyTarget(state, aiPlayer, selectActions, hasDamage);
    }
    if (hasBuff) {
      // Buff: target own creature with highest attack
      return pickBestFriendlyTarget(state, aiPlayer, selectActions);
    }
  }

  // Fallback: pick the first target
  return selectActions[0];
}

function pickBestEnemyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  selectActions: GameAction[],
  preferLowestHealth: boolean,
): GameAction {
  const opponent = getOpponent(aiPlayer);
  const opponentBoard = state.players[opponent].board;
  let bestAction = selectActions[0];
  let bestScore = -Infinity;

  for (const action of selectActions) {
    if (action.type !== 'SELECT_TARGET') continue;
    const { targetRef } = action;

    if (targetRef.type === 'creature') {
      const creature = opponentBoard.find(
        (p) => p !== null && p.permanentId === targetRef.permanentId,
      );
      if (creature) {
        // For damage spells: prefer lowest remaining health (finish it off)
        // For removal: prefer highest attack (remove biggest threat)
        const score = preferLowestHealth
          ? -getCurrentHealth(creature)
          : getEffectiveAttack(creature);
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
    } else if (targetRef.type === 'player') {
      // If targeting players is an option and no creatures found, target opponent
      if (targetRef.playerId === opponent && bestScore === -Infinity) {
        bestAction = action;
      }
    }
  }

  return bestAction;
}

function pickBestFriendlyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  selectActions: GameAction[],
): GameAction {
  const myBoard = state.players[aiPlayer].board;
  let bestAction = selectActions[0];
  let bestAttack = -1;

  for (const action of selectActions) {
    if (action.type !== 'SELECT_TARGET') continue;
    const { targetRef } = action;

    if (targetRef.type === 'creature') {
      const creature = myBoard.find(
        (p) => p !== null && p.permanentId === targetRef.permanentId,
      );
      if (creature) {
        const attack = getEffectiveAttack(creature);
        if (attack > bestAttack) {
          bestAttack = attack;
          bestAction = action;
        }
      }
    }
  }

  return bestAction;
}

function chooseBattleAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  if (state.phase.type !== 'battle') {
    return actions[0];
  }

  if (state.phase.step === 'declare_attackers') {
    return chooseAttackerAction(state, aiPlayer, actions);
  }

  if (state.phase.step === 'declare_blockers') {
    return chooseBlockerAction(state, aiPlayer, actions);
  }

  return actions[0];
}

function chooseAttackerAction(
  _state: GameState,
  _aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  // Declare all eligible creatures as attackers, then confirm
  const declareActions = actions.filter((a) => a.type === 'DECLARE_ATTACKER');

  if (declareActions.length > 0) {
    // Declare the first available attacker
    return declareActions[0];
  }

  // All creatures declared — confirm
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_ATTACKERS');
  if (confirmAction) {
    return confirmAction;
  }

  return actions[0];
}

function chooseBlockerAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') {
    return actions[0];
  }

  const assignActions = actions.filter((a) => a.type === 'ASSIGN_BLOCKER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_BLOCKERS');

  if (assignActions.length === 0) {
    return confirmAction ?? actions[0];
  }

  const myBoard = state.players[aiPlayer].board;
  const opponent = getOpponent(aiPlayer);
  const opponentBoard = state.players[opponent].board;

  // Find the best blocking assignment
  let bestBlock: GameAction | null = null;
  let bestBlockScore = -Infinity;

  for (const action of assignActions) {
    if (action.type !== 'ASSIGN_BLOCKER') continue;
    const blocker = myBoard.find(
      (p) => p !== null && p.permanentId === action.blockerPermanentId,
    );
    const attacker = opponentBoard.find(
      (p) => p !== null && p.permanentId === action.attackerPermanentId,
    );
    if (!blocker || !attacker) continue;

    const blockerHealth = getCurrentHealth(blocker);
    const blockerAttack = getEffectiveAttack(blocker);
    const attackerHealth = getCurrentHealth(attacker);
    const attackerAttack = getEffectiveAttack(attacker);

    // Don't bother blocking small attackers (1-2 damage) — take the hit
    if (attackerAttack < 3) {
      continue;
    }

    // Favorable trade: we survive AND we kill the attacker
    if (blockerHealth > attackerAttack && blockerAttack >= attackerHealth) {
      const score = 100 + attackerAttack; // prefer killing bigger attackers
      if (score > bestBlockScore) {
        bestBlockScore = score;
        bestBlock = action;
      }
      continue;
    }

    // Even trade: both die, but attacker was big
    if (blockerAttack >= attackerHealth) {
      const score = 50 + attackerAttack - blockerAttack;
      if (score > bestBlockScore) {
        bestBlockScore = score;
        bestBlock = action;
      }
      continue;
    }

    // Chump block: we die but prevent big damage to hero
    const score = attackerAttack - blockerAttack; // prefer chump blocking big attackers with small creatures
    if (score > bestBlockScore) {
      bestBlockScore = score;
      bestBlock = action;
    }
  }

  if (bestBlock) {
    return bestBlock;
  }

  // No good blocks — confirm
  return confirmAction ?? actions[0];
}

function chooseDiscardAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  const discardActions = actions.filter((a) => a.type === 'DISCARD_CARD');
  if (discardActions.length === 0) {
    return actions[0];
  }

  const hand = state.players[aiPlayer].hand;
  let worstIndex = -1;
  let worstCost = -1;

  for (const action of discardActions) {
    if (action.type !== 'DISCARD_CARD') continue;
    const cardDef = CARD_REGISTRY[hand[action.cardIndex].cardId];
    if (cardDef.cost > worstCost) {
      worstCost = cardDef.cost;
      worstIndex = action.cardIndex;
    }
  }

  return { type: 'DISCARD_CARD', cardIndex: worstIndex };
}

// ─── Helper ───

function pickRandom(actions: GameAction[], rng: RNG): GameAction {
  const index = Math.floor(rng() * actions.length);
  return actions[index];
}

// ─── Run AI Turn ───

export function runAITurn(
  state: GameState,
  aiPlayer: PlayerId,
  rng: RNG,
): { finalState: GameState; actions: GameAction[]; events: GameEvent[] } {
  const actions: GameAction[] = [];
  const events: GameEvent[] = [];
  let currentState = state;

  for (let i = 0; i < 100; i++) {
    const legalActions = enumerateLegalActions(currentState, aiPlayer);
    // Filter out CONCEDE
    const nonConcede = legalActions.filter((a) => a.type !== 'CONCEDE');
    if (nonConcede.length === 0) {
      break;
    }

    // Stop if the game is over
    if (currentState.phase.type === 'game_over') {
      break;
    }

    // Check if it's still our turn to act. During mulligan/discard the acting player
    // is determined by the phase, not activePlayer.
    if (!isAIActing(currentState, aiPlayer)) {
      break;
    }

    const action = chooseAction(currentState, aiPlayer, rng);
    const result = reduce(currentState, action, aiPlayer, rng);
    actions.push(action);
    events.push(...result.events);
    currentState = result.newState;
  }

  return { finalState: currentState, actions, events };
}

function isAIActing(state: GameState, aiPlayer: PlayerId): boolean {
  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return phase.player === aiPlayer;
    case 'discard':
      return phase.player === aiPlayer;
    case 'targeting':
      return phase.casterId === aiPlayer;
    case 'battle':
      if (phase.step === 'declare_attackers') {
        return state.activePlayer === aiPlayer;
      }
      if (phase.step === 'declare_blockers') {
        return getOpponent(state.activePlayer) === aiPlayer;
      }
      return false;
    case 'game_over':
      return false;
    default:
      // draw, energy, play, end — active player acts
      return state.activePlayer === aiPlayer;
  }
}
