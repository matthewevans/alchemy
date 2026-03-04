import type { GameAction, GameEvent, GameState, PlayerId, RNG } from './types';
import { CARD_REGISTRY } from './cards';
import { EFFECT_REGISTRY } from './effects';
import { getActingPlayer, getCurrentHealth, getEffectiveAttack, getOpponent } from './types';
import { enumerateLegalActions } from './validation';
import { reduce } from './reducer';
import type { SeededRNG } from './prng';
import { restoreRNG } from './prng';
import type { AIConfig } from './aiConfig';
import { evaluateState, softmaxSelect } from './aiEval';
import { chooseActionByTreeSearch } from './aiSearch';
import { filterAIViableActions } from './aiActionPolicy';

// ─── Core AI Function ───

export function chooseAction(
  state: GameState,
  aiPlayer: PlayerId,
  rng: RNG,
  config?: AIConfig,
): GameAction {
  const legalActions = enumerateLegalActions(state, aiPlayer);
  if (legalActions.length === 0) {
    throw new Error('No legal actions available');
  }

  const actions = filterAIViableActions(state, aiPlayer, legalActions);
  if (actions.length === 0) {
    return legalActions[0];
  }

  const searchAction = chooseActionByTreeSearch(state, aiPlayer, rng, config, actions);
  if (searchAction) {
    return searchAction;
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
      return choosePlayAction(state, aiPlayer, actions, rng, config);
    case 'targeting':
      return chooseTargetingAction(state, aiPlayer, actions, rng, config);
    case 'battle':
      return chooseBattleAction(state, aiPlayer, actions, rng, config);
    case 'learning':
      return pickRandom(actions, rng);
    case 'discard':
      return chooseDiscardAction(state, aiPlayer, actions);
    default:
      return pickRandom(actions, rng);
  }
}

// ─── Lookahead Helpers ───

function isSeededRNG(rng: RNG): rng is SeededRNG {
  return typeof (rng as SeededRNG).getState === 'function';
}

/**
 * Simulate an action without advancing the real RNG.
 * Returns the resulting game state, or null if simulation fails.
 */
function simulateAction(
  state: GameState,
  action: GameAction,
  aiPlayer: PlayerId,
  rng: SeededRNG,
): GameState | null {
  try {
    const simRng = restoreRNG(rng.getState());
    return reduce(state, action, aiPlayer, simRng).newState;
  } catch {
    return null;
  }
}

/**
 * Score a list of candidate actions and select one via softmax temperature.
 * `scoreFn` assigns a numeric score to each candidate.
 */
function selectByScore(
  candidates: GameAction[],
  scoreFn: (action: GameAction, index: number) => number,
  temperature: number,
  rng: RNG,
): GameAction {
  if (candidates.length === 1) return candidates[0];
  const scores = candidates.map(scoreFn);
  const idx = softmaxSelect(scores, temperature, rng());
  return candidates[idx];
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
  rng: RNG,
  config?: AIConfig,
): GameAction {
  const playActions = actions.filter((a) => a.type === 'PLAY_CARD');

  if (playActions.length === 0) {
    return { type: 'ADVANCE_PHASE' };
  }

  // Deduplicate by cardIndex — for creatures, keep leftmost slot variant
  const playerState = state.players[aiPlayer];
  const byCard = new Map<number, GameAction>();
  for (const action of playActions) {
    if (action.type !== 'PLAY_CARD') continue;

    const existing = byCard.get(action.cardIndex);
    if (!existing) {
      byCard.set(action.cardIndex, action);
    } else if (
      action.type === 'PLAY_CARD' &&
      existing.type === 'PLAY_CARD' &&
      (action.targetSlot ?? 0) < (existing.targetSlot ?? 0)
    ) {
      byCard.set(action.cardIndex, action);
    }
  }

  if (byCard.size === 0) {
    return { type: 'ADVANCE_PHASE' };
  }

  const candidates = [...byCard.values(), { type: 'ADVANCE_PHASE' } as GameAction];

  if (!config) {
    // Legacy: pick highest cost card
    let bestAction: GameAction = { type: 'ADVANCE_PHASE' };
    let bestCost = -1;
    for (const action of byCard.values()) {
      if (action.type !== 'PLAY_CARD') continue;
      const cost = CARD_REGISTRY[playerState.hand[action.cardIndex].cardId].cost;
      if (cost > bestCost) {
        bestCost = cost;
        bestAction = action;
      }
    }
    return bestAction;
  }

  // Scored selection: lookahead or heuristic
  const useLookahead = config.playLookahead && isSeededRNG(rng);

  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'ADVANCE_PHASE') {
        // Passing = current board value (baseline)
        return useLookahead ? evaluateState(state, aiPlayer, config.weights) : 0;
      }
      if (useLookahead) {
        const result = simulateAction(state, action, aiPlayer, rng as SeededRNG);
        return result ? evaluateState(result, aiPlayer, config.weights) : 0;
      }
      // Heuristic: score by mana cost
      if (action.type === 'PLAY_CARD') {
        return CARD_REGISTRY[playerState.hand[action.cardIndex].cardId].cost;
      }
      return 0;
    },
    config.temperature,
    rng,
  );
}

function chooseTargetingAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config?: AIConfig,
): GameAction {
  if (state.phase.type !== 'targeting') {
    return actions[0];
  }

  const selectActions = actions.filter((a) => a.type === 'SELECT_TARGET');
  if (selectActions.length === 0) {
    return actions.find((a) => a.type === 'CANCEL_TARGETING') ?? actions[0];
  }

  // With combat lookahead: simulate each target, evaluate
  if (config?.combatLookahead && isSeededRNG(rng)) {
    return selectByScore(
      selectActions,
      (action) => {
        const result = simulateAction(state, action, aiPlayer, rng as SeededRNG);
        return result ? evaluateState(result, aiPlayer, config.weights) : 0;
      },
      config.temperature,
      rng,
    );
  }

  // Heuristic targeting (existing logic)
  const effectDef = EFFECT_REGISTRY[state.phase.effectId];

  if (effectDef) {
    const steps = effectDef.steps;
    const hasDamage = steps.some((s) => s.type === 'damage');
    const hasDestroy = steps.some((s) => s.type === 'destroy');
    const hasBuff = steps.some((s) => s.type === 'buff' || s.type === 'grant_keyword');
    const hasBounce = steps.some((s) => s.type === 'bounce');
    const hasPreventAttack = steps.some((s) => s.type === 'prevent_attack');

    if (hasDamage || hasDestroy || hasBounce || hasPreventAttack) {
      if (config) {
        // Scored heuristic: rank targets but apply temperature
        return selectByScore(
          selectActions,
          (action) => scoreEnemyTarget(state, aiPlayer, action, hasDamage),
          config.temperature,
          rng,
        );
      }
      return pickBestEnemyTarget(state, aiPlayer, selectActions, hasDamage);
    }
    if (hasBuff) {
      if (config) {
        return selectByScore(
          selectActions,
          (action) => scoreFriendlyTarget(state, aiPlayer, action),
          config.temperature,
          rng,
        );
      }
      return pickBestFriendlyTarget(state, aiPlayer, selectActions);
    }
  }

  // Fallback: pick the first target
  return selectActions[0];
}

function scoreEnemyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  action: GameAction,
  preferLowestHealth: boolean,
): number {
  if (action.type !== 'SELECT_TARGET') return 0;
  const { targetRef } = action;
  const opponent = getOpponent(aiPlayer);

  if (targetRef.type === 'creature') {
    const creature = state.players[opponent].board.find(
      (p) => p !== null && p.permanentId === targetRef.permanentId,
    );
    if (creature) {
      return preferLowestHealth
        ? -getCurrentHealth(creature)
        : getEffectiveAttack(creature);
    }
    // Own creature — bad for offensive spells but valid for "any" targeting
    const ownCreature = state.players[aiPlayer].board.find(
      (p) => p !== null && p.permanentId === targetRef.permanentId,
    );
    if (ownCreature) return -100;
  } else if (targetRef.type === 'player' && targetRef.playerId === opponent) {
    return -1; // Prefer creatures over face, but face over nothing
  }
  return -100;
}

function scoreFriendlyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  action: GameAction,
): number {
  if (action.type !== 'SELECT_TARGET') return 0;
  const { targetRef } = action;

  if (targetRef.type === 'creature') {
    const creature = state.players[aiPlayer].board.find(
      (p) => p !== null && p.permanentId === targetRef.permanentId,
    );
    if (creature) return getEffectiveAttack(creature);
  }
  return 0;
}

function pickBestEnemyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  selectActions: GameAction[],
  preferLowestHealth: boolean,
): GameAction {
  let bestAction = selectActions[0];
  let bestScore = -Infinity;

  for (const action of selectActions) {
    const score = scoreEnemyTarget(state, aiPlayer, action, preferLowestHealth);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

function pickBestFriendlyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  selectActions: GameAction[],
): GameAction {
  let bestAction = selectActions[0];
  let bestScore = -Infinity;

  for (const action of selectActions) {
    const score = scoreFriendlyTarget(state, aiPlayer, action);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

function chooseBattleAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config?: AIConfig,
): GameAction {
  if (state.phase.type !== 'battle') {
    return actions[0];
  }

  if (state.phase.step === 'declare_attackers') {
    return chooseAttackerAction(state, aiPlayer, actions, rng, config);
  }

  if (state.phase.step === 'declare_blockers') {
    return chooseBlockerAction(state, aiPlayer, actions, rng, config);
  }

  if (state.phase.step === 'order_blockers') {
    return chooseBlockerOrderAction(state, aiPlayer, actions, rng, config);
  }

  return actions[0];
}

function chooseAttackerAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config?: AIConfig,
): GameAction {
  const declareActions = actions.filter((a) => a.type === 'DECLARE_ATTACKER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_ATTACKERS');

  if (declareActions.length === 0) {
    return confirmAction ?? actions[0];
  }

  if (!config) {
    // Legacy: declare all, then confirm
    return declareActions[0];
  }

  // Scored: each creature gets an attack-value score, compete against "confirm"
  const myBoard = state.players[aiPlayer].board;
  const candidates = [...declareActions, ...(confirmAction ? [confirmAction] : [])];

  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'CONFIRM_ATTACKERS') return -2;
      if (action.type !== 'DECLARE_ATTACKER') return -2;
      const creature = myBoard.find(
        (p) => p !== null && p.permanentId === action.permanentId,
      );
      return creature ? getEffectiveAttack(creature) : 0;
    },
    config.temperature,
    rng,
  );
}

function chooseBlockerAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config?: AIConfig,
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

  // Score each possible block assignment
  const candidates = [...assignActions, ...(confirmAction ? [confirmAction] : [])];

  const scoreFn = (action: GameAction): number => {
    if (action.type === 'CONFIRM_BLOCKERS') return 0;
    if (action.type !== 'ASSIGN_BLOCKER') return 0;

    const blocker = myBoard.find(
      (p) => p !== null && p.permanentId === action.blockerPermanentId,
    );
    const attacker = opponentBoard.find(
      (p) => p !== null && p.permanentId === action.attackerPermanentId,
    );
    if (!blocker || !attacker) return -Infinity;

    const blockerHealth = getCurrentHealth(blocker);
    const blockerAttack = getEffectiveAttack(blocker);
    const attackerHealth = getCurrentHealth(attacker);
    const attackerAttack = getEffectiveAttack(attacker);

    // Small attackers aren't worth blocking
    if (attackerAttack < 3) return -1;

    // Favorable trade: we survive AND kill the attacker
    if (blockerHealth > attackerAttack && blockerAttack >= attackerHealth) {
      return 100 + attackerAttack;
    }

    // Even trade: both die, but attacker was big
    if (blockerAttack >= attackerHealth) {
      return 50 + attackerAttack - blockerAttack;
    }

    // Chump block: we die but prevent big damage to hero
    return attackerAttack - blockerAttack;
  };

  if (config) {
    return selectByScore(candidates, scoreFn, config.temperature, rng);
  }

  // Legacy: pick single best block or confirm
  let bestBlock: GameAction | null = null;
  let bestBlockScore = -Infinity;
  for (const action of assignActions) {
    const score = scoreFn(action);
    if (score > bestBlockScore) {
      bestBlockScore = score;
      bestBlock = action;
    }
  }
  return bestBlock && bestBlockScore > 0 ? bestBlock : (confirmAction ?? actions[0]);
}

function chooseBlockerOrderAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config?: AIConfig,
): GameAction {
  if (state.phase.type !== 'battle' || state.phase.step !== 'order_blockers') {
    return actions[0];
  }

  const setActions = actions.filter((a) => a.type === 'SET_BLOCKER_ORDER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_BLOCKER_ORDER');
  if (!confirmAction) return setActions[0] ?? actions[0];
  if (setActions.length === 0) return confirmAction;

  if (!config?.combatLookahead || !isSeededRNG(rng)) {
    return confirmAction;
  }

  const candidates = [...setActions, confirmAction];
  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'CONFIRM_BLOCKER_ORDER') {
        const result = simulateAction(state, action, aiPlayer, rng as SeededRNG);
        return result ? evaluateState(result, aiPlayer, config.weights) : -Infinity;
      }
      if (action.type !== 'SET_BLOCKER_ORDER') return -Infinity;

      const orderedState = simulateAction(state, action, aiPlayer, rng as SeededRNG);
      if (!orderedState) return -Infinity;
      const postCombatState = simulateAction(
        orderedState,
        { type: 'CONFIRM_BLOCKER_ORDER' },
        aiPlayer,
        rng as SeededRNG,
      );
      return postCombatState ? evaluateState(postCombatState, aiPlayer, config.weights) : -Infinity;
    },
    config.temperature,
    rng,
  );
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
  config?: AIConfig,
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
