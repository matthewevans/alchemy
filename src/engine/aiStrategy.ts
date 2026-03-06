import type { GameAction, GameState, Permanent, PlayerId, RNG } from './types';
import { getActingPlayer, getCurrentHealth, getEffectiveAttack, getOpponent } from './types';
import { CARD_REGISTRY, getPlayCost } from './cards';
import { EFFECT_REGISTRY } from './effects';
import { enumerateLegalActions } from './validation';
import { reduce } from './reducer';
import type { SeededRNG } from './prng';
import { isSeededRNG, restoreRNG } from './prng';
import type { AIConfig } from './aiConfig';
import { evaluateState, softmaxSelect } from './aiEval';
import { filterAIViableActions } from './aiActionPolicy';
import {
  getCombatDamage,
  estimateDamageToCreature,
  estimateGuaranteedUnblockedDamage,
  estimateWorstBlockOutcomeScore,
  resolveAttackerPermanents,
} from './aiCombat';

// ─── Shared Helpers ───

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

function pickRandom(actions: GameAction[], rng: RNG): GameAction {
  const index = Math.floor(rng() * actions.length);
  return actions[index];
}

// ─── Mulligan ───

export function chooseMulliganAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
): GameAction {
  const hand = state.players[aiPlayer].hand;
  const hasLowCost = hand.some((card) => CARD_REGISTRY[card.cardId].cost <= 2);

  if (hasLowCost) {
    return { type: 'KEEP_HAND' };
  }

  if (state.players[aiPlayer].mulliganUsed) {
    return { type: 'KEEP_HAND' };
  }

  const cardCosts = hand.map((card, index) => ({
    index,
    cost: CARD_REGISTRY[card.cardId].cost,
  }));
  cardCosts.sort((a, b) => b.cost - a.cost);

  const mulliganCount = Math.max(1, Math.floor(cardCosts.length / 2));
  const indicesToMulligan = cardCosts
    .slice(0, mulliganCount)
    .map((c) => c.index)
    .sort((a, b) => a - b);

  const mulliganAction: GameAction = { type: 'MULLIGAN_CARDS', cardIndices: indicesToMulligan };
  if (actions.some((a) => a.type === 'MULLIGAN_CARDS')) {
    return mulliganAction;
  }

  return { type: 'KEEP_HAND' };
}

// ─── Play Phase ───

export function choosePlayAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  const playActions = actions.filter((a) => a.type === 'PLAY_CARD');

  if (playActions.length === 0) {
    return { type: 'ADVANCE_PHASE' };
  }

  const playerState = state.players[aiPlayer];
  const byCard = new Map<number, GameAction>();
  for (const action of playActions) {
    if (action.type !== 'PLAY_CARD') continue;

    const existing = byCard.get(action.cardIndex);
    if (!existing) {
      byCard.set(action.cardIndex, action);
    } else if (
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
  const useLookahead = config.playLookahead && isSeededRNG(rng);

  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'ADVANCE_PHASE') {
        return useLookahead ? evaluateState(state, aiPlayer, config.weights) : 0;
      }
      if (useLookahead) {
        const result = simulateAction(state, action, aiPlayer, rng as SeededRNG);
        return result ? evaluateState(result, aiPlayer, config.weights) : 0;
      }
      if (action.type === 'PLAY_CARD') {
        return CARD_REGISTRY[playerState.hand[action.cardIndex].cardId].cost;
      }
      return 0;
    },
    config.temperature,
    rng,
  );
}

// ─── Targeting ───

export function chooseTargetingAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  if (state.phase.type !== 'targeting') {
    return actions[0];
  }

  const selectActions = actions.filter((a) => a.type === 'SELECT_TARGET');
  if (selectActions.length === 0) {
    return actions.find((a) => a.type === 'CANCEL_TARGETING') ?? actions[0];
  }

  const effectDef = EFFECT_REGISTRY[state.phase.effectId];
  const hasPreventAttack = effectDef
    ? effectDef.steps.some((step) => step.type === 'prevent_attack')
    : false;

  if (config.combatLookahead && isSeededRNG(rng) && !hasPreventAttack) {
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

  if (effectDef) {
    const steps = effectDef.steps;
    const hasDamage = steps.some((s) => s.type === 'damage' && s.target === 'selected');
    const hasDestroy = steps.some((s) => s.type === 'destroy');
    const hasBuff = steps.some((s) => s.type === 'buff' || s.type === 'grant_keyword');
    const hasBounce = steps.some((s) => s.type === 'bounce' && s.target === 'selected');

    if (hasDamage || hasDestroy || hasBounce || hasPreventAttack) {
      return selectByScore(
        selectActions,
        (action) => scoreEnemyTarget(state, aiPlayer, action, effectDef),
        config.temperature,
        rng,
      );
    }
    if (hasBuff) {
      return selectByScore(
        selectActions,
        (action) => scoreFriendlyTarget(state, aiPlayer, action),
        config.temperature,
        rng,
      );
    }
  }

  return selectActions[0];
}

function scoreEnemyTarget(
  state: GameState,
  aiPlayer: PlayerId,
  action: GameAction,
  effectDef?: (typeof EFFECT_REGISTRY)[string],
): number {
  if (action.type !== 'SELECT_TARGET') return Number.NEGATIVE_INFINITY;
  const { targetRef } = action;
  const opponent = getOpponent(aiPlayer);
  const selectedDamage = effectDef
    ? effectDef.steps.reduce(
      (total, step) => (step.type === 'damage' && step.target === 'selected' ? total + step.amount : total),
      0,
    )
    : 0;
  const hasDestroy = effectDef
    ? effectDef.steps.some((step) => step.type === 'destroy')
    : false;
  const hasBounce = effectDef
    ? effectDef.steps.some((step) => step.type === 'bounce' && step.target === 'selected')
    : false;
  const hasPreventAttack = effectDef
    ? effectDef.steps.some((step) => step.type === 'prevent_attack')
    : false;

  if (targetRef.type === 'creature') {
    const creature = state.players[opponent].board.find(
      (p) => p !== null && p.permanentId === targetRef.permanentId,
    );
    if (creature) {
      const attack = getEffectiveAttack(creature);
      const health = getCurrentHealth(creature);
      const effectiveDamage = estimateDamageToCreature(creature, selectedDamage);
      const wouldKill = hasDestroy || (selectedDamage > 0 && effectiveDamage >= health);
      const mixedDisableSpell = hasPreventAttack && !hasDestroy && !hasBounce;
      const canAttackNextTurn = !creature.cantAttackThisTurn && attack > 0;
      let score = 0;

      if (wouldKill) {
        score += mixedDisableSpell
          ? 1000 + attack * 40 + health * 8
          : 10000 + attack * 200 + health * 20;
      } else if (effectiveDamage > 0) {
        score += effectiveDamage * 80;
      }

      if (hasBounce) {
        score += 7000 + attack * 220 + health * 20;
      }

      if (hasPreventAttack) {
        score += canAttackNextTurn
          ? 7000 + attack * 900
          : attack * 40;
      }

      score += attack * 30;
      return score;
    }
    const ownCreature = state.players[aiPlayer].board.find(
      (p) => p !== null && p.permanentId === targetRef.permanentId,
    );
    if (ownCreature) return -100000;
  } else if (targetRef.type === 'player' && targetRef.playerId === opponent) {
    if (selectedDamage <= 0) {
      return -5000;
    }
    if (state.players[opponent].health <= selectedDamage) {
      return 1000000;
    }
    return -1000 + selectedDamage * 20;
  }
  return -100000;
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

// ─── Battle: Attackers ───

export function chooseAttackerAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  const declareActions = actions.filter((a) => a.type === 'DECLARE_ATTACKER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_ATTACKERS');

  if (declareActions.length === 0) {
    return confirmAction ?? actions[0];
  }

  const candidates = [...declareActions, ...(confirmAction ? [confirmAction] : [])];

  if (config.combatLookahead && isSeededRNG(rng)) {
    const seededRng = rng as SeededRNG;
    return selectByScore(
      candidates,
      (action) => scoreAttackerActionByOutcome(state, action, aiPlayer, seededRng, config),
      config.temperature,
      rng,
    );
  }

  const myBoard = state.players[aiPlayer].board;
  const opponent = getOpponent(aiPlayer);
  const defendingCreatures = state.players[opponent].board.filter(
    (p): p is Permanent => p !== null && !p.isTapped,
  );
  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'CONFIRM_ATTACKERS') return -2;
      if (action.type !== 'DECLARE_ATTACKER') return -2;
      const creature = myBoard.find(
        (p) => p !== null && p.permanentId === action.permanentId,
      );
      return creature
        ? estimateWorstBlockOutcomeScore(creature, defendingCreatures)
        : 0;
    },
    config.temperature,
    rng,
  );
}

function pickBestImmediateAction(
  state: GameState,
  actingPlayer: PlayerId,
  aiPlayer: PlayerId,
  rng: SeededRNG,
  config: AIConfig,
): GameAction | null {
  const legalActions = filterAIViableActions(
    state,
    actingPlayer,
    enumerateLegalActions(state, actingPlayer),
  );
  if (legalActions.length === 0) return null;

  const maximize = actingPlayer === aiPlayer;
  let bestAction: GameAction | null = null;
  let bestScore = maximize ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const action of legalActions) {
    const nextState = simulateAction(state, action, actingPlayer, rng);
    if (!nextState) continue;
    const score = evaluateState(nextState, aiPlayer, config.weights);
    const isBetter = maximize ? score > bestScore : score < bestScore;
    if (!isBetter) continue;
    bestScore = score;
    bestAction = action;
  }

  return bestAction ?? legalActions[0];
}

function rolloutCombatLine(
  state: GameState,
  aiPlayer: PlayerId,
  rng: SeededRNG,
  config: AIConfig,
): GameState {
  let current = state;
  for (let i = 0; i < 12; i++) {
    if (current.phase.type === 'game_over') break;
    if (current.phase.type !== 'battle' && current.phase.type !== 'combat_priority') break;

    const actingPlayer = getActingPlayer(current);
    if (!actingPlayer) break;
    const action = pickBestImmediateAction(current, actingPlayer, aiPlayer, rng, config);
    if (!action) break;

    const nextState = simulateAction(current, action, actingPlayer, rng);
    if (!nextState) break;
    current = nextState;
  }

  return current;
}

function scoreAttackerActionByOutcome(
  state: GameState,
  action: GameAction,
  aiPlayer: PlayerId,
  rng: SeededRNG,
  config: AIConfig,
): number {
  const firstState = simulateAction(state, action, aiPlayer, rng);
  if (!firstState) return Number.NEGATIVE_INFINITY;

  let combatState = firstState;
  if (
    combatState.phase.type === 'battle'
    && combatState.phase.step === 'declare_attackers'
    && getActingPlayer(combatState) === aiPlayer
  ) {
    const followUp = filterAIViableActions(
      combatState,
      aiPlayer,
      enumerateLegalActions(combatState, aiPlayer),
    );
    const confirm = followUp.find((candidate) => candidate.type === 'CONFIRM_ATTACKERS');
    if (confirm) {
      const confirmedState = simulateAction(combatState, confirm, aiPlayer, rng);
      if (confirmedState) {
        combatState = confirmedState;
      }
    }
  }

  const resolvedState = rolloutCombatLine(combatState, aiPlayer, rng, config);
  return evaluateState(resolvedState, aiPlayer, config.weights);
}

// ─── Battle: Blockers ───

export function chooseBlockerAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') {
    return actions[0];
  }

  const phase = state.phase;
  const assignActions = actions.filter((a) => a.type === 'ASSIGN_BLOCKER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_BLOCKERS');

  if (assignActions.length === 0) {
    return confirmAction ?? actions[0];
  }

  const myBoard = state.players[aiPlayer].board;
  const opponent = getOpponent(aiPlayer);
  const opponentBoard = state.players[opponent].board;
  const myHealth = state.players[aiPlayer].health;

  const calcUnblockedDamage = (blockers: Record<string, string>): number => {
    const blockedAttackers = new Set(Object.values(blockers));
    let total = 0;
    for (const attackerPermanentId of phase.confirmedAttackers) {
      if (blockedAttackers.has(attackerPermanentId)) continue;
      const attacker = opponentBoard.find(
        (p) => p !== null && p.permanentId === attackerPermanentId,
      );
      if (!attacker) continue;
      total += getCombatDamage(attacker);
    }
    return total;
  };

  const currentUnblockedDamage = calcUnblockedDamage(phase.tentativeBlockers);
  const lethalNow = currentUnblockedDamage >= myHealth;

  const candidates = lethalNow
    ? [...assignActions]
    : [...assignActions, ...(confirmAction ? [confirmAction] : [])];

  const scoreFn = (action: GameAction): number => {
    const nextBlockers = action.type === 'ASSIGN_BLOCKER'
      ? {
        ...phase.tentativeBlockers,
        [action.blockerPermanentId]: action.attackerPermanentId,
      }
      : phase.tentativeBlockers;
    const nextUnblockedDamage = calcUnblockedDamage(nextBlockers);
    const preventedDamage = currentUnblockedDamage - nextUnblockedDamage;
    const lethalAfter = nextUnblockedDamage >= myHealth;

    if (action.type === 'CONFIRM_BLOCKERS') {
      return lethalNow ? -1000000 : 0;
    }
    if (action.type !== 'ASSIGN_BLOCKER') return -1000000;

    const blocker = myBoard.find(
      (p) => p !== null && p.permanentId === action.blockerPermanentId,
    );
    const attacker = opponentBoard.find(
      (p) => p !== null && p.permanentId === action.attackerPermanentId,
    );
    if (!blocker || !attacker) return -Infinity;

    const blockerAttack = getCombatDamage(blocker);
    const attackerHealth = getCurrentHealth(attacker);
    const attackerAttack = getCombatDamage(attacker);
    const blockerHealth = getCurrentHealth(blocker);
    let tradeScore = 0;

    if (attackerAttack < 3) {
      tradeScore = -1;
    } else if (blockerHealth > attackerAttack && blockerAttack >= attackerHealth) {
      tradeScore = 100 + attackerAttack;
    } else if (blockerAttack >= attackerHealth) {
      tradeScore = 50 + attackerAttack - blockerAttack;
    } else {
      tradeScore = attackerAttack - blockerAttack;
    }

    if (lethalNow) {
      return (lethalAfter ? -500000 : 500000) + preventedDamage * 20000 + tradeScore;
    }

    return preventedDamage + tradeScore;
  };

  return selectByScore(candidates, scoreFn, config.temperature, rng);
}

// ─── Battle: Blocker Order ───

export function chooseBlockerOrderAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  if (state.phase.type !== 'battle' || state.phase.step !== 'order_blockers') {
    return actions[0];
  }

  const setActions = actions.filter((a) => a.type === 'SET_BLOCKER_ORDER');
  const confirmAction = actions.find((a) => a.type === 'CONFIRM_BLOCKER_ORDER');
  if (!confirmAction) return setActions[0] ?? actions[0];
  if (setActions.length === 0) return confirmAction;

  if (!config.combatLookahead || !isSeededRNG(rng)) {
    return confirmAction;
  }

  const seededRng = rng as SeededRNG;
  const confirmedState = simulateAction(state, confirmAction, aiPlayer, seededRng);
  const confirmScore = confirmedState
    ? evaluateState(confirmedState, aiPlayer, config.weights)
    : Number.NEGATIVE_INFINITY;

  const scoredSetActions: Array<{ action: GameAction; score: number }> = [];
  for (const action of setActions) {
    if (action.type !== 'SET_BLOCKER_ORDER') continue;

    const orderedState = simulateAction(state, action, aiPlayer, seededRng);
    if (!orderedState || orderedState.phase.type !== 'battle' || orderedState.phase.step !== 'order_blockers') {
      continue;
    }

    const previousOrder = state.phase.attackerBlockerOrder[action.attackerPermanentId] ?? [];
    const nextOrder = orderedState.phase.attackerBlockerOrder[action.attackerPermanentId] ?? [];
    const isNoop = previousOrder.length === nextOrder.length
      && previousOrder.every((id, idx) => id === nextOrder[idx]);
    if (isNoop) continue;

    const postCombatState = simulateAction(
      orderedState,
      { type: 'CONFIRM_BLOCKER_ORDER' },
      aiPlayer,
      seededRng,
    );
    if (!postCombatState) continue;

    scoredSetActions.push({
      action,
      score: evaluateState(postCombatState, aiPlayer, config.weights),
    });
  }

  if (scoredSetActions.length === 0) {
    return confirmAction;
  }

  let bestSet = scoredSetActions[0];
  for (const candidate of scoredSetActions) {
    if (candidate.score > bestSet.score) {
      bestSet = candidate;
    }
  }

  if (bestSet.score <= confirmScore) {
    return confirmAction;
  }

  return bestSet.action;
}

// ─── Combat Priority ───

export function chooseCombatPriorityAction(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction {
  const playActions = actions.filter((a) => a.type === 'PLAY_CARD');
  const passAction = actions.find((a) => a.type === 'PASS_PRIORITY');

  if (playActions.length === 0) {
    return passAction ?? actions[0];
  }

  const candidates = [...playActions, ...(passAction ? [passAction] : [])];
  const hand = state.players[aiPlayer].hand;

  const opponent = getOpponent(aiPlayer);
  const opponentBoard = state.players[opponent].board;

  return selectByScore(
    candidates,
    (action) => {
      if (action.type === 'PASS_PRIORITY') return -0.5;
      if (action.type !== 'PLAY_CARD') return -1;
      const card = hand[action.cardIndex];
      if (!card) return -1;
      const cardDef = CARD_REGISTRY[card.cardId];
      let score = getPlayCost(state, card.cardId);

      if (cardDef.effectId) {
        const effectDef = EFFECT_REGISTRY[cardDef.effectId];
        if (effectDef) {
          for (const step of effectDef.steps) {
            if (step.type === 'damage' && step.target === 'selected') {
              const canKill = opponentBoard.some((p) => {
                if (!p) return false;
                return estimateDamageToCreature(p, step.amount) >= getCurrentHealth(p);
              });
              score += canKill ? 8 : step.amount;
            } else if (step.type === 'destroy') {
              score += 10;
            } else if (step.type === 'buff') {
              score += step.attack + step.health;
            } else if (step.type === 'bounce') {
              score += 6;
            }
          }
        }
      }

      return score;
    },
    config.temperature,
    rng,
  );
}

// ─── Discard ───

export function chooseDiscardAction(
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

// ─── Attacker Risk Guard ───

export function applyAttackerRiskGuard(
  state: GameState,
  aiPlayer: PlayerId,
  actions: GameAction[],
  rng: RNG,
  config: AIConfig,
): GameAction[] {
  if (config.difficulty !== 'hard' && config.difficulty !== 'very_hard') {
    return actions;
  }
  if (!isSeededRNG(rng)) {
    return actions;
  }
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return actions;
  }

  const declareActions = actions.filter(
    (action): action is Extract<GameAction, { type: 'DECLARE_ATTACKER' }> =>
      action.type === 'DECLARE_ATTACKER',
  );
  const confirmAction = actions.find((action) => action.type === 'CONFIRM_ATTACKERS');
  if (declareActions.length === 0 || !confirmAction) {
    return actions;
  }

  // Small attack forces don't need simulation-based filtering
  if (state.phase.tentativeAttackers.length + declareActions.length <= 2) {
    return actions;
  }

  const seededRng = rng as SeededRNG;
  const confirmScore = scoreAttackerActionByOutcome(state, confirmAction, aiPlayer, seededRng, config);

  const allowedDeclarations = new Set<string>();
  for (const action of declareActions) {
    const score = scoreAttackerActionByOutcome(state, action, aiPlayer, seededRng, config);
    const createsLethalPressure = createsLethalPressureFromDeclaration(state, aiPlayer, action);
    if (score >= confirmScore || createsLethalPressure) {
      allowedDeclarations.add(action.permanentId);
    }
  }

  // If no individual attacker scores better than not attacking, don't strip
  // them all — the guard evaluates attackers one-at-a-time, but multiple
  // attackers together can overwhelm blockers. Let the search decide.
  if (allowedDeclarations.size === 0) {
    return actions;
  }

  const filtered = actions.filter(
    (action) => action.type !== 'DECLARE_ATTACKER' || allowedDeclarations.has(action.permanentId),
  );
  return filtered.length > 0 ? filtered : actions;
}

function createsLethalPressureFromDeclaration(
  state: GameState,
  aiPlayer: PlayerId,
  action: Extract<GameAction, { type: 'DECLARE_ATTACKER' }>,
): boolean {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return false;
  }

  const attacker = state.players[aiPlayer].board.find(
    (slot): slot is Permanent => slot !== null && slot.permanentId === action.permanentId,
  );
  if (!attacker) {
    return false;
  }

  const opponent = getOpponent(aiPlayer);
  const defendingCreatures = state.players[opponent].board.filter(
    (slot): slot is Permanent => slot !== null && !slot.isTapped,
  );

  const currentAttackers = resolveAttackerPermanents(state, state.phase.tentativeAttackers, aiPlayer);
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

  return guaranteedAfter > guaranteedBefore && guaranteedAfter >= state.players[opponent].health;
}

// ─── Fallback ───

export { pickRandom };
