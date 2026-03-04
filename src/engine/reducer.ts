import type {
  CardInstance,
  CorePhase,
  GameAction,
  GameEvent,
  GameState,
  GameStats,
  Keyword,
  Permanent,
  Phase,
  PlayerId,
  PlayerState,
  ReducerResult,
  LearningPrompt,
  LearningResumeAction,
  LearningReward,
  RNG,
  TargetRef,
  TargetingType,
} from './types';
import { CARD_REGISTRY } from './cards';
import { drawCards, performMulligan } from './deck';
import { EFFECT_REGISTRY } from './effects';
import type { EffectStep } from './effects';
import { getOpponent, getCurrentHealth, getEffectiveAttack } from './types';
import { validateAction } from './validation';

// ─── Main Reducer ───

export function reduce(
  state: GameState,
  action: GameAction,
  actingPlayer: PlayerId,
  rng: RNG,
): ReducerResult {
  const validation = validateAction(state, action, actingPlayer);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  let result: ReducerResult;

  switch (action.type) {
    case 'KEEP_HAND':
      result = handleKeepHand(state, actingPlayer);
      break;
    case 'MULLIGAN_CARDS':
      result = handleMulliganCards(state, actingPlayer, action.cardIndices, rng);
      break;
    case 'ADVANCE_PHASE':
      result = handleAdvancePhase(state);
      break;
    case 'PLAY_CARD':
      result = handlePlayCard(state, actingPlayer, action.cardIndex, action.targetSlot);
      break;
    case 'SELECT_TARGET':
      result = handleSelectTarget(state, action.targetRef);
      break;
    case 'CANCEL_TARGETING':
      result = handleCancelTargeting(state);
      break;
    case 'DECLARE_ATTACKER':
      result = handleDeclareAttacker(state, action.permanentId);
      break;
    case 'UNDECLARE_ATTACKER':
      result = handleUndeclareAttacker(state, action.permanentId);
      break;
    case 'CONFIRM_ATTACKERS':
      result = handleConfirmAttackers(state);
      break;
    case 'ASSIGN_BLOCKER':
      result = handleAssignBlocker(state, action.blockerPermanentId, action.attackerPermanentId);
      break;
    case 'REMOVE_BLOCKER':
      result = handleRemoveBlocker(state, action.blockerPermanentId);
      break;
    case 'CONFIRM_BLOCKERS':
      result = handleConfirmBlockers(state);
      break;
    case 'SET_BLOCKER_ORDER':
      result = handleSetBlockerOrder(state, action.attackerPermanentId, action.blockerPermanentIds);
      break;
    case 'CONFIRM_BLOCKER_ORDER':
      result = handleConfirmBlockerOrder(state);
      break;
    case 'START_LEARNING_CHALLENGE':
      result = handleStartLearningChallenge(
        state,
        actingPlayer,
        action.prompt,
        action.reward,
        action.resumeAction,
      );
      break;
    case 'ANSWER_LEARNING_CHALLENGE':
      result = handleAnswerLearningChallenge(state, actingPlayer, action.optionId);
      break;
    case 'SKIP_LEARNING_CHALLENGE':
      result = handleSkipLearningChallenge(state, actingPlayer);
      break;
    case 'DISCARD_CARD':
      result = handleDiscardCard(state, actingPlayer, action.cardIndex);
      break;
    case 'CONCEDE':
      result = handleConcede(state, actingPlayer);
      break;
  }

  // Post-process: derive stats from events (damage, deaths)
  result.newState = deriveStatsFromEvents(state, result.newState, result.events);

  return result;
}

/** Derive combat/damage stats from events rather than threading through every function. */
function deriveStatsFromEvents(
  preState: GameState,
  newState: GameState,
  events: GameEvent[],
): GameState {
  let stats = newState.stats;
  let changed = false;
  const ownerByPermanent = indexPermanentOwners(preState);

  for (const e of events) {
    if (e.type === 'PLAYER_DAMAGED') {
      // Find who owns the source permanent to credit damageDealt
      const sourceOwner = ownerByPermanent.get(e.source);
      if (sourceOwner) {
        stats = incrementStat(stats, sourceOwner, 'damageDealt', e.amount);
        changed = true;
      }
      stats = incrementStat(stats, e.player, 'damageReceived', e.amount);
      changed = true;
    } else if (e.type === 'DAMAGE_DEALT') {
      const sourceOwner = ownerByPermanent.get(e.source);
      if (sourceOwner) {
        stats = incrementStat(stats, sourceOwner, 'damageDealt', e.amount);
        changed = true;
      }
    } else if (e.type === 'CREATURE_DIED') {
      // Credit creaturesDefeated to the opponent of the creature's owner
      const deadOwner = ownerByPermanent.get(e.permanentId);
      if (deadOwner) {
        const killer = deadOwner === 'player1' ? 'player2' : 'player1';
        stats = incrementStat(stats, killer, 'creaturesDefeated');
        changed = true;
      }
    }
  }

  return changed ? { ...newState, stats } : newState;
}

function indexPermanentOwners(state: GameState): Map<string, PlayerId> {
  const owners = new Map<string, PlayerId>();
  for (const playerId of ['player1', 'player2'] as PlayerId[]) {
    for (const p of state.players[playerId].board) {
      if (p) owners.set(p.permanentId, playerId);
    }
  }
  return owners;
}

// ─── Helpers ───

export function clonePlayerState(ps: PlayerState): PlayerState {
  return {
    ...ps,
    hand: [...ps.hand],
    deck: [...ps.deck],
    board: [...ps.board],
    discard: [...ps.discard],
  };
}

export function clonePlayers(
  players: Record<PlayerId, PlayerState>,
): Record<PlayerId, PlayerState> {
  return {
    player1: clonePlayerState(players.player1),
    player2: clonePlayerState(players.player2),
  };
}

export function findPermanent(
  state: GameState,
  permanentId: string,
): { permanent: Permanent; owner: PlayerId; slotIndex: number } | null {
  for (const playerId of ['player1', 'player2'] as PlayerId[]) {
    const board = state.players[playerId].board;
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      if (p && p.permanentId === permanentId) {
        return { permanent: p, owner: playerId, slotIndex: i };
      }
    }
  }
  return null;
}

function findFirstEmptySlot(board: (Permanent | null)[]): number {
  return board.findIndex((slot) => slot === null);
}

function hasKeyword(permanent: Permanent, keyword: Keyword): boolean {
  const cardDef = CARD_REGISTRY[permanent.cardId];
  return cardDef.keywords.includes(keyword);
}

function incrementStat(
  stats: Record<PlayerId, GameStats>,
  player: PlayerId,
  key: keyof GameStats,
  amount = 1,
): Record<PlayerId, GameStats> {
  return {
    ...stats,
    [player]: { ...stats[player], [key]: stats[player][key] + amount },
  };
}

function createPermanent(
  cardInstance: CardInstance,
  ownerId: PlayerId,
): Permanent {
  const cardDef = CARD_REGISTRY[cardInstance.cardId];
  return {
    permanentId: cardInstance.instanceId,
    cardId: cardInstance.cardId,
    ownerId,
    attack: cardDef.attack!,
    health: cardDef.health!,
    damage: 0,
    isTapped: false,
    summonedThisTurn: true,
    temporaryAttackBonus: 0,
    temporaryHealthBonus: 0,
    cantAttackThisTurn: false,
    armorUsedThisTurn: false,
  };
}

// ─── Mulligan Transition ───

function transitionAfterMulligan(
  state: GameState,
  actingPlayer: PlayerId,
  events: GameEvent[],
): ReducerResult {
  if (actingPlayer === 'player1') {
    // Move to player2's mulligan
    return {
      newState: { ...state, phase: { type: 'mulligan', player: 'player2' } },
      events,
    };
  }
  // Player2 done — start the game
  const newState: GameState = {
    ...state,
    turn: 1,
    phase: { type: 'draw' },
  };
  events.push({
    type: 'TURN_STARTED',
    player: newState.activePlayer,
    turn: 1,
  });
  return { newState, events };
}

// ─── Action Handlers ───

function handleKeepHand(
  state: GameState,
  actingPlayer: PlayerId,
): ReducerResult {
  const players = clonePlayers(state.players);
  players[actingPlayer].mulliganUsed = true;
  const newState = { ...state, players };
  return transitionAfterMulligan(newState, actingPlayer, []);
}

function handleMulliganCards(
  state: GameState,
  actingPlayer: PlayerId,
  cardIndices: number[],
  rng: RNG,
): ReducerResult {
  const players = clonePlayers(state.players);
  const ps = players[actingPlayer];
  const result = performMulligan(ps.hand, ps.deck, cardIndices, rng);
  ps.hand = result.hand;
  ps.deck = result.deck;
  ps.mulliganUsed = true;
  const newState = { ...state, players };
  return transitionAfterMulligan(newState, actingPlayer, []);
}

function handleAdvancePhase(state: GameState): ReducerResult {
  const phase = state.phase;

  switch (phase.type) {
    case 'draw':
      return advanceFromDraw(state);
    case 'energy':
      return advanceFromEnergy(state);
    case 'play':
      return advanceFromPlay(state);
    case 'end':
      return advanceFromEnd(state);
    default:
      throw new Error(`Cannot advance from phase: ${phase.type}`);
  }
}

function advanceFromDraw(state: GameState): ReducerResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const activePs = players[state.activePlayer];

  // Skip draw on turn 1
  if (state.turn > 1) {
    if (activePs.deck.length > 0) {
      const { drawn, remaining } = drawCards(activePs.deck, 1);
      activePs.deck = remaining;
      activePs.hand = [...activePs.hand, ...drawn];
      events.push({
        type: 'CARD_DRAWN',
        player: state.activePlayer,
        cardInstance: drawn[0],
      });
    } else {
      // Fatigue damage
      activePs.fatigueDamage += 1;
      const fatigueDmg = activePs.fatigueDamage;
      activePs.health -= fatigueDmg;
      events.push({
        type: 'FATIGUE_DAMAGE',
        player: state.activePlayer,
        amount: fatigueDmg,
      });

      // Check for game over from fatigue
      if (activePs.health <= 0) {
        const winner = getOpponent(state.activePlayer);
        const newState: GameState = {
          ...state,
          players,
          phase: { type: 'game_over', winner },
        };
        events.push({ type: 'GAME_OVER', winner });
        return { newState, events };
      }
    }
  }

  return {
    newState: { ...state, players, phase: { type: 'energy' } },
    events,
  };
}

function advanceFromEnergy(state: GameState): ReducerResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const activePs = players[state.activePlayer];

  const newMax = Math.min(activePs.maxEnergy + 1, state.ruleset.energyCap);
  activePs.maxEnergy = newMax;
  activePs.currentEnergy = newMax;

  events.push({
    type: 'ENERGY_GAINED',
    player: state.activePlayer,
    newMax,
  });

  return {
    newState: { ...state, players, phase: { type: 'play' } },
    events,
  };
}

function advanceFromPlay(state: GameState): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'play' }>;

  // Post-combat main phase → end-of-turn processing
  if (phase.postCombat) {
    return performEndOfTurnProcessing(state);
  }

  return {
    newState: {
      ...state,
      phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
    },
    events: [],
  };
}

function advanceFromEnd(state: GameState): ReducerResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const newActivePlayer = getOpponent(state.activePlayer);
  const newTurn = state.turn + 1;

  // End-of-turn cleanup for ALL permanents
  for (const playerId of ['player1', 'player2'] as PlayerId[]) {
    players[playerId].board = players[playerId].board.map((p) => {
      if (!p) return null;
      return {
        ...p,
        temporaryAttackBonus: 0,
        temporaryHealthBonus: 0,
        summonedThisTurn: false,
        // "Cannot attack this turn" effects should expire after that creature's
        // controller finishes their turn, not globally every end step.
        cantAttackThisTurn: playerId === state.activePlayer ? false : p.cantAttackThisTurn,
        armorUsedThisTurn: false,
      };
    });
  }

  // Heal all creatures if damage doesn't persist
  if (!state.ruleset.damagePersists) {
    for (const playerId of ['player1', 'player2'] as PlayerId[]) {
      players[playerId].board = players[playerId].board.map((p) => {
        if (!p) return null;
        return { ...p, damage: 0 };
      });
    }
  }

  // Untap all of the new active player's permanents
  const untappedIds: string[] = [];
  players[newActivePlayer].board = players[newActivePlayer].board.map((p) => {
    if (!p) return null;
    if (p.isTapped) {
      untappedIds.push(p.permanentId);
      return { ...p, isTapped: false };
    }
    return p;
  });

  if (untappedIds.length > 0) {
    events.push({ type: 'CREATURES_UNTAPPED', permanentIds: untappedIds });
  }

  events.push({
    type: 'TURN_STARTED',
    player: newActivePlayer,
    turn: newTurn,
  });

  const stats = incrementStat(state.stats, newActivePlayer, 'turnsPlayed');

  return {
    newState: {
      ...state,
      players,
      stats,
      activePlayer: newActivePlayer,
      turn: newTurn,
      phase: { type: 'draw' },
    },
    events,
  };
}

// ─── Play Card ───

function handlePlayCard(
  state: GameState,
  actingPlayer: PlayerId,
  cardIndex: number,
  targetSlot: number | undefined,
): ReducerResult {
  const players = clonePlayers(state.players);
  const ps = players[actingPlayer];
  const cardInstance = ps.hand[cardIndex];
  const cardDef = CARD_REGISTRY[cardInstance.cardId];

  // Remove card from hand and deduct energy
  ps.hand = ps.hand.filter((_, i) => i !== cardIndex);
  ps.currentEnergy -= cardDef.cost;

  // Track stats
  let stats = incrementStat(state.stats, actingPlayer, 'cardsPlayed');
  stats = incrementStat(stats, actingPlayer, 'energySpent', cardDef.cost);
  if (cardDef.type === 'creature') {
    stats = incrementStat(stats, actingPlayer, 'creaturesPlayed');
  } else {
    stats = incrementStat(stats, actingPlayer, 'spellsCast');
  }

  const events: GameEvent[] = [];

  if (cardDef.type === 'creature') {
    const firstEmpty = findFirstEmptySlot(ps.board);
    const slot = targetSlot ?? (firstEmpty === -1 ? ps.board.length : firstEmpty);
    const permanent = createPermanent(cardInstance, actingPlayer);
    if (slot === ps.board.length) {
      ps.board = [...ps.board, permanent];
    } else {
      ps.board[slot] = permanent;
    }

    events.push({
      type: 'CARD_PLAYED',
      player: actingPlayer,
      cardId: cardInstance.cardId,
      permanentId: permanent.permanentId,
    });
    events.push({
      type: 'CREATURE_ENTERED',
      permanentId: permanent.permanentId,
      slot,
    });

    // Process ETB keywords
    let newState: GameState = { ...state, players, stats, phase: state.phase };
    const etbResult = processETBKeywords(newState, permanent, actingPlayer);
    newState = etbResult.newState;
    events.push(...etbResult.events);

    return { newState, events };
  }

  // Spell
  events.push({
    type: 'CARD_PLAYED',
    player: actingPlayer,
    cardId: cardInstance.cardId,
  });

  if (cardDef.targetingType) {
    // Transition to targeting phase
    const validTargets = computeValidTargets(
      { ...state, players },
      actingPlayer,
      cardDef.targetingType,
    );
    const playPhase = state.phase as Extract<Phase, { type: 'play' }>;
    const newPhase: Phase = {
      type: 'targeting',
      effectId: cardDef.effectId!,
      casterId: actingPlayer,
      sourceCardId: cardInstance.cardId,
      validTargets,
      postCombat: playPhase.postCombat,
    };
    return {
      newState: { ...state, players, stats, phase: newPhase },
      events,
    };
  }

  // Untargeted spell — resolve immediately
  const effect = EFFECT_REGISTRY[cardDef.effectId!];
  let newState: GameState = { ...state, players, stats };
  const resolveResult = resolveEffectSteps(newState, effect.steps, actingPlayer, null);
  newState = resolveResult.newState;
  events.push(...resolveResult.events);

  // Move spell to discard
  const resolvedPlayers = clonePlayers(newState.players);
  resolvedPlayers[actingPlayer].discard = [
    ...resolvedPlayers[actingPlayer].discard,
    cardInstance,
  ];

  events.push({
    type: 'SPELL_RESOLVED',
    cardId: cardInstance.cardId,
    targets: [],
  });

  return {
    newState: { ...newState, players: resolvedPlayers, phase: state.phase },
    events,
  };
}

// ─── Targeting ───

function handleSelectTarget(
  state: GameState,
  targetRef: TargetRef,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'targeting' }>;
  const effect = EFFECT_REGISTRY[phase.effectId];
  const events: GameEvent[] = [];

  // Resolve effect steps
  const resolveResult = resolveEffectSteps(state, effect.steps, phase.casterId, targetRef);
  const newState = resolveResult.newState;
  events.push(...resolveResult.events);

  // Move spell to discard
  const players = clonePlayers(newState.players);
  const cardInstance: CardInstance = {
    instanceId: `${phase.sourceCardId}#spell`,
    cardId: phase.sourceCardId,
  };
  // Find the original card instance - it was already removed from hand during PLAY_CARD
  // We need to create a discard entry
  players[phase.casterId].discard = [
    ...players[phase.casterId].discard,
    cardInstance,
  ];

  events.push({
    type: 'SPELL_RESOLVED',
    cardId: phase.sourceCardId,
    targets: [targetRef],
  });

  return {
    newState: { ...newState, players, phase: { type: 'play', postCombat: phase.postCombat } },
    events,
  };
}

function handleCancelTargeting(state: GameState): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'targeting' }>;
  const players = clonePlayers(state.players);
  const casterPs = players[phase.casterId];
  const cardDef = CARD_REGISTRY[phase.sourceCardId];

  // Refund: return card to hand and restore energy
  casterPs.hand = [...casterPs.hand, { instanceId: `${phase.sourceCardId}#spell`, cardId: phase.sourceCardId }];
  casterPs.currentEnergy += cardDef.cost;

  return {
    newState: { ...state, players, phase: { type: 'play', postCombat: phase.postCombat } },
    events: [],
  };
}

// ─── Valid Targets ───

export function computeValidTargets(
  state: GameState,
  casterId: PlayerId,
  targetingType: TargetingType,
): TargetRef[] {
  const targets: TargetRef[] = [];
  const opponent = getOpponent(casterId);

  if (targetingType.kind === 'creature') {
    const controllers: PlayerId[] =
      targetingType.controller === 'own' ? [casterId]
        : targetingType.controller === 'opponent' ? [opponent]
          : [casterId, opponent];

    for (const playerId of controllers) {
      for (const slot of state.players[playerId].board) {
        if (slot) {
          targets.push({ type: 'creature', permanentId: slot.permanentId });
        }
      }
    }
  } else if (targetingType.kind === 'player') {
    if (targetingType.who === 'opponent') {
      targets.push({ type: 'player', playerId: opponent });
    } else {
      targets.push({ type: 'player', playerId: casterId });
      targets.push({ type: 'player', playerId: opponent });
    }
  } else {
    // 'any' — all creatures and all players
    for (const playerId of ['player1', 'player2'] as PlayerId[]) {
      for (const slot of state.players[playerId].board) {
        if (slot) {
          targets.push({ type: 'creature', permanentId: slot.permanentId });
        }
      }
      targets.push({ type: 'player', playerId });
    }
  }

  return targets;
}

// ─── Effect Resolution ───

interface EffectResult {
  newState: GameState;
  events: GameEvent[];
}

function resolveEffectSteps(
  state: GameState,
  steps: EffectStep[],
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  let currentState = state;
  const allEvents: GameEvent[] = [];

  for (const step of steps) {
    const result = resolveEffectStep(currentState, step, casterId, selectedTarget);
    currentState = result.newState;
    allEvents.push(...result.events);

    // Check for game over after each step
    if (currentState.phase.type === 'game_over') {
      break;
    }
  }

  return { newState: currentState, events: allEvents };
}

function resolveEffectStep(
  state: GameState,
  step: EffectStep,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  switch (step.type) {
    case 'damage':
      return resolveEffectDamage(state, step, casterId, selectedTarget);
    case 'heal':
      return resolveEffectHeal(state, step, casterId, selectedTarget);
    case 'draw':
      return resolveEffectDraw(state, step, casterId);
    case 'bounce':
      return resolveEffectBounce(state, step, casterId, selectedTarget);
    case 'buff':
      return resolveEffectBuff(state, step, casterId, selectedTarget);
    case 'grant_keyword':
      return resolveEffectGrantKeyword(state, step, casterId, selectedTarget);
    case 'destroy':
      return resolveEffectDestroy(state, step, selectedTarget);
    case 'prevent_attack':
      return resolveEffectPreventAttack(state, step, selectedTarget);
  }
}

function resolveEffectDamage(
  state: GameState,
  step: Extract<EffectStep, { type: 'damage' }>,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  const events: GameEvent[] = [];
  let currentState = state;

  if (step.target === 'selected' && selectedTarget) {
    if (selectedTarget.type === 'creature') {
      const result = applyDamageToCreature(currentState, selectedTarget.permanentId, step.amount, 'spell');
      currentState = result.newState;
      events.push(...result.events);
    } else {
      const result = applyDamageToPlayer(currentState, selectedTarget.playerId, step.amount, 'spell');
      currentState = result.newState;
      events.push(...result.events);
    }
  } else if (step.target === 'all_enemy_creatures') {
    const opponent = getOpponent(casterId);
    const result = applyDamageToAllCreatures(currentState, opponent, step.amount, 'spell');
    currentState = result.newState;
    events.push(...result.events);
  } else if (step.target === 'all_creatures') {
    for (const playerId of ['player1', 'player2'] as PlayerId[]) {
      const result = applyDamageToAllCreatures(currentState, playerId, step.amount, 'spell');
      currentState = result.newState;
      events.push(...result.events);
    }
  } else if (step.target === 'self') {
    const result = applyDamageToPlayer(currentState, casterId, step.amount, 'spell');
    currentState = result.newState;
    events.push(...result.events);
  } else if (step.target === 'opponent') {
    const opponent = getOpponent(casterId);
    const result = applyDamageToPlayer(currentState, opponent, step.amount, 'spell');
    currentState = result.newState;
    events.push(...result.events);
  }

  return { newState: currentState, events };
}

function resolveEffectHeal(
  state: GameState,
  step: Extract<EffectStep, { type: 'heal' }>,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);

  let targetPlayer: PlayerId;
  if (step.target === 'self') {
    targetPlayer = casterId;
  } else if (step.target === 'opponent') {
    targetPlayer = getOpponent(casterId);
  } else if (step.target === 'selected' && selectedTarget?.type === 'player') {
    targetPlayer = selectedTarget.playerId;
  } else {
    return { newState: state, events };
  }

  if (step.amount > 0) {
    players[targetPlayer].health += step.amount;
    events.push({ type: 'PLAYER_HEALED', player: targetPlayer, amount: step.amount });
  }

  return { newState: { ...state, players }, events };
}

function resolveEffectDraw(
  state: GameState,
  step: Extract<EffectStep, { type: 'draw' }>,
  casterId: PlayerId,
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const ps = players[casterId];

  for (let i = 0; i < step.amount; i++) {
    if (ps.deck.length > 0) {
      const { drawn, remaining } = drawCards(ps.deck, 1);
      ps.deck = remaining;
      ps.hand = [...ps.hand, ...drawn];
      events.push({
        type: 'CARD_DRAWN',
        player: casterId,
        cardInstance: drawn[0],
      });
    }
  }

  return { newState: { ...state, players }, events };
}

function resolveEffectBounce(
  state: GameState,
  step: Extract<EffectStep, { type: 'bounce' }>,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  const events: GameEvent[] = [];
  let currentState = state;

  if (step.target === 'selected' && selectedTarget?.type === 'creature') {
    currentState = bounceCreature(currentState, selectedTarget.permanentId, events);
  } else if (step.target === 'all_enemy_creatures') {
    const opponent = getOpponent(casterId);
    const opponentBoard = currentState.players[opponent].board;
    const permanentIds = opponentBoard
      .filter((p): p is Permanent => p !== null)
      .map((p) => p.permanentId);

    for (const permId of permanentIds) {
      currentState = bounceCreature(currentState, permId, events);
    }
  }

  return { newState: currentState, events };
}

function bounceCreature(
  state: GameState,
  permanentId: string,
  events: GameEvent[],
): GameState {
  const found = findPermanent(state, permanentId);
  if (!found) return state;

  const players = clonePlayers(state.players);
  const ownerPs = players[found.owner];

  // Remove from board
  ownerPs.board[found.slotIndex] = null;

  // Return to hand as CardInstance
  const cardInstance: CardInstance = {
    instanceId: found.permanent.permanentId,
    cardId: found.permanent.cardId,
  };
  ownerPs.hand = [...ownerPs.hand, cardInstance];

  events.push({
    type: 'CREATURE_BOUNCED',
    permanentId: found.permanent.permanentId,
    cardId: found.permanent.cardId,
  });

  return { ...state, players };
}

function resolveEffectBuff(
  state: GameState,
  step: Extract<EffectStep, { type: 'buff' }>,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  const players = clonePlayers(state.players);

  if (step.target === 'selected' && selectedTarget?.type === 'creature') {
    const found = findPermanent({ ...state, players }, selectedTarget.permanentId);
    if (found) {
      players[found.owner].board[found.slotIndex] = withTemporaryBuff(
        found.permanent,
        step.attack,
        step.health,
      );
    }
  } else if (step.target === 'own_creatures') {
    players[casterId].board = players[casterId].board.map((p) => {
      if (!p) return null;
      return withTemporaryBuff(p, step.attack, step.health);
    });
  }

  return { newState: { ...state, players }, events: [] };
}

function withTemporaryBuff(
  permanent: Permanent,
  attackBonus: number,
  healthBonus: number,
): Permanent {
  return {
    ...permanent,
    temporaryAttackBonus: permanent.temporaryAttackBonus + attackBonus,
    temporaryHealthBonus: permanent.temporaryHealthBonus + healthBonus,
  };
}

function resolveEffectGrantKeyword(
  state: GameState,
  step: Extract<EffectStep, { type: 'grant_keyword' }>,
  casterId: PlayerId,
  selectedTarget: TargetRef | null,
): EffectResult {
  const players = clonePlayers(state.players);

  // For MVP, only handle 'swift' grant by clearing summonedThisTurn
  if (step.keyword === 'swift') {
    if (step.target === 'selected' && selectedTarget?.type === 'creature') {
      const found = findPermanent({ ...state, players }, selectedTarget.permanentId);
      if (found) {
        players[found.owner].board[found.slotIndex] = {
          ...found.permanent,
          summonedThisTurn: false,
        };
      }
    } else if (step.target === 'own_creatures') {
      players[casterId].board = players[casterId].board.map((p) => {
        if (!p) return null;
        return { ...p, summonedThisTurn: false };
      });
    }
  }
  // TODO: For other keywords, add a grantedKeywords field to Permanent

  return { newState: { ...state, players }, events: [] };
}

function resolveEffectDestroy(
  state: GameState,
  step: Extract<EffectStep, { type: 'destroy' }>,
  selectedTarget: TargetRef | null,
): EffectResult {
  if (step.target !== 'selected' || selectedTarget?.type !== 'creature') {
    return { newState: state, events: [] };
  }

  const found = findPermanent(state, selectedTarget.permanentId);
  if (!found) return { newState: state, events: [] };

  const players = clonePlayers(state.players);
  const perm = found.permanent;
  // Set damage to health to kill it
  const killed = { ...perm, damage: perm.health + perm.temporaryHealthBonus };
  players[found.owner].board[found.slotIndex] = killed;

  // Now check for deaths
  const result = checkAndRemoveDeadCreatures({ ...state, players });
  return result;
}

function resolveEffectPreventAttack(
  state: GameState,
  _step: Extract<EffectStep, { type: 'prevent_attack' }>,
  selectedTarget: TargetRef | null,
): EffectResult {
  if (selectedTarget?.type !== 'creature') {
    return { newState: state, events: [] };
  }

  const found = findPermanent(state, selectedTarget.permanentId);
  if (!found) return { newState: state, events: [] };

  const players = clonePlayers(state.players);
  players[found.owner].board[found.slotIndex] = {
    ...found.permanent,
    cantAttackThisTurn: true,
  };

  return { newState: { ...state, players }, events: [] };
}

// ─── Damage Application ───

export function applyDamageToCreature(
  state: GameState,
  permanentId: string,
  amount: number,
  source: string,
): EffectResult {
  const found = findPermanent(state, permanentId);
  if (!found) return { newState: state, events: [] };

  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);

  let actualDamage = amount;

  // Armor check
  if (hasKeyword(found.permanent, 'armor') && !found.permanent.armorUsedThisTurn && actualDamage > 0) {
    actualDamage = Math.max(0, actualDamage - 1);
    const updated = { ...found.permanent, damage: found.permanent.damage + actualDamage, armorUsedThisTurn: true };
    players[found.owner].board[found.slotIndex] = updated;
  } else {
    const updated = { ...found.permanent, damage: found.permanent.damage + actualDamage };
    players[found.owner].board[found.slotIndex] = updated;
  }

  events.push({
    type: 'DAMAGE_DEALT',
    targetId: permanentId,
    amount: actualDamage,
    source,
  });

  // Check for death
  const newState = { ...state, players };
  const deathResult = checkAndRemoveDeadCreatures(newState);
  events.push(...deathResult.events);

  return { newState: deathResult.newState, events };
}

export function applyDamageToPlayer(
  state: GameState,
  playerId: PlayerId,
  amount: number,
  source: string,
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  players[playerId].health -= amount;

  events.push({
    type: 'PLAYER_DAMAGED',
    player: playerId,
    amount,
    source,
  });

  if (players[playerId].health <= 0) {
    const winner = getOpponent(playerId);
    events.push({ type: 'GAME_OVER', winner });
    return {
      newState: { ...state, players, phase: { type: 'game_over', winner } },
      events,
    };
  }

  return { newState: { ...state, players }, events };
}

function applyDamageToAllCreatures(
  state: GameState,
  playerId: PlayerId,
  amount: number,
  source: string,
): EffectResult {
  const events: GameEvent[] = [];
  let currentState = state;

  const board = currentState.players[playerId].board;
  const permanentIds = board
    .filter((p): p is Permanent => p !== null)
    .map((p) => p.permanentId);

  for (const permId of permanentIds) {
    // Re-check that the permanent still exists (might have been removed by death cascade)
    const found = findPermanent(currentState, permId);
    if (!found) continue;

    const result = applyDamageToCreature(currentState, permId, amount, source);
    currentState = result.newState;
    events.push(...result.events);
  }

  return { newState: currentState, events };
}

// ─── Death Checking ───

export function checkAndRemoveDeadCreatures(state: GameState): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);

  for (const playerId of ['player1', 'player2'] as PlayerId[]) {
    const ps = players[playerId];
    for (let i = 0; i < ps.board.length; i++) {
      const perm = ps.board[i];
      if (perm && getCurrentHealth(perm) <= 0) {
        ps.board[i] = null;
        ps.discard = [...ps.discard, { instanceId: perm.permanentId, cardId: perm.cardId }];
        events.push({
          type: 'CREATURE_DIED',
          permanentId: perm.permanentId,
          cardId: perm.cardId,
        });
      }
    }
  }

  return { newState: { ...state, players }, events };
}

// ─── ETB Keywords ───

function processETBKeywords(
  state: GameState,
  permanent: Permanent,
  ownerId: PlayerId,
): EffectResult {
  const cardDef = CARD_REGISTRY[permanent.cardId];
  let currentState = state;
  const allEvents: GameEvent[] = [];

  for (const keyword of cardDef.keywords) {
    switch (keyword) {
      case 'blast': {
        allEvents.push({
          type: 'KEYWORD_TRIGGERED',
          keyword: 'blast',
          permanentId: permanent.permanentId,
        });
        const opponent = getOpponent(ownerId);
        const result = applyDamageToAllCreatures(
          currentState,
          opponent,
          1,
          permanent.permanentId,
        );
        currentState = result.newState;
        allEvents.push(...result.events);
        break;
      }
      case 'heal': {
        allEvents.push({
          type: 'KEYWORD_TRIGGERED',
          keyword: 'heal',
          permanentId: permanent.permanentId,
        });
        const players = clonePlayers(currentState.players);
        players[ownerId].health += 2;
        allEvents.push({ type: 'PLAYER_HEALED', player: ownerId, amount: 2 });
        currentState = { ...currentState, players };
        break;
      }
      case 'draw': {
        allEvents.push({
          type: 'KEYWORD_TRIGGERED',
          keyword: 'draw',
          permanentId: permanent.permanentId,
        });
        const result = resolveEffectDraw(
          currentState,
          { type: 'draw', amount: 1 },
          ownerId,
        );
        currentState = result.newState;
        allEvents.push(...result.events);
        break;
      }
      // Passive keywords — no ETB processing
      default:
        break;
    }
  }

  return { newState: currentState, events: allEvents };
}

// ─── Combat: Declare/Undeclare Attackers ───

function handleDeclareAttacker(
  state: GameState,
  permanentId: string,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_attackers' }>;
  return {
    newState: {
      ...state,
      phase: {
        ...phase,
        tentativeAttackers: [...phase.tentativeAttackers, permanentId],
      },
    },
    events: [],
  };
}

function handleUndeclareAttacker(
  state: GameState,
  permanentId: string,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_attackers' }>;
  return {
    newState: {
      ...state,
      phase: {
        ...phase,
        tentativeAttackers: phase.tentativeAttackers.filter((id) => id !== permanentId),
      },
    },
    events: [],
  };
}

function handleConfirmAttackers(state: GameState): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_attackers' }>;

  // No attackers — skip combat, go to post-combat main phase
  if (phase.tentativeAttackers.length === 0) {
    return {
      newState: { ...state, phase: { type: 'play', postCombat: true } },
      events: [],
    };
  }

  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);

  // Tap all attacking creatures
  const activePs = players[state.activePlayer];
  for (const attackerId of phase.tentativeAttackers) {
    for (let i = 0; i < activePs.board.length; i++) {
      const perm = activePs.board[i];
      if (perm && perm.permanentId === attackerId) {
        activePs.board[i] = { ...perm, isTapped: true };
        events.push({ type: 'CREATURE_TAPPED', permanentId: attackerId });
        break;
      }
    }
  }

  events.push({
    type: 'ATTACKERS_DECLARED',
    attackerIds: phase.tentativeAttackers,
  });

  const tappedState: GameState = { ...state, players };

  // Skip blockers if defender has no untapped creatures
  const defender = getOpponent(state.activePlayer);
  const defenderBoard = players[defender].board;
  const hasEligibleBlockers = defenderBoard.some((p) => p !== null && !p.isTapped);

  if (!hasEligibleBlockers) {
    // Resolve combat immediately with no blockers
    const combatResult = resolveCombat(tappedState, phase.tentativeAttackers, {});
    events.push(...combatResult.events);

    if (combatResult.newState.phase.type === 'game_over') {
      return { newState: combatResult.newState, events };
    }

    return {
      newState: { ...combatResult.newState, phase: { type: 'play', postCombat: true } },
      events,
    };
  }

  return {
    newState: {
      ...tappedState,
      phase: {
        type: 'battle',
        step: 'declare_blockers',
        confirmedAttackers: phase.tentativeAttackers,
        tentativeBlockers: {},
      },
    },
    events,
  };
}

// ─── Combat: Blockers ───

function handleAssignBlocker(
  state: GameState,
  blockerPermanentId: string,
  attackerPermanentId: string,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_blockers' }>;
  return {
    newState: {
      ...state,
      phase: {
        ...phase,
        tentativeBlockers: {
          ...phase.tentativeBlockers,
          [blockerPermanentId]: attackerPermanentId,
        },
      },
    },
    events: [],
  };
}

function handleRemoveBlocker(
  state: GameState,
  blockerPermanentId: string,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_blockers' }>;
  const newBlockers = { ...phase.tentativeBlockers };
  delete newBlockers[blockerPermanentId];
  return {
    newState: {
      ...state,
      phase: { ...phase, tentativeBlockers: newBlockers },
    },
    events: [],
  };
}

function handleConfirmBlockers(state: GameState): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_blockers' }>;
  const events: GameEvent[] = [];

  events.push({
    type: 'BLOCKERS_DECLARED',
    assignments: phase.tentativeBlockers,
  });

  const attackerBlockerOrder = buildAttackerBlockerOrder(phase.tentativeBlockers);
  if (hasMultiBlock(attackerBlockerOrder)) {
    return {
      newState: {
        ...state,
        phase: {
          type: 'battle',
          step: 'order_blockers',
          confirmedAttackers: phase.confirmedAttackers,
          blockers: phase.tentativeBlockers,
          attackerBlockerOrder,
        },
      },
      events,
    };
  }

  // Resolve combat immediately
  const combatResult = resolveCombat(
    state,
    phase.confirmedAttackers,
    phase.tentativeBlockers,
    attackerBlockerOrder,
  );
  events.push(...combatResult.events);

  if (combatResult.newState.phase.type === 'game_over') {
    return { newState: combatResult.newState, events };
  }

  // Post-combat main phase — player can play more cards
  return {
    newState: { ...combatResult.newState, phase: { type: 'play', postCombat: true } },
    events,
  };
}

function handleSetBlockerOrder(
  state: GameState,
  attackerPermanentId: string,
  blockerPermanentIds: string[],
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'order_blockers' }>;
  return {
    newState: {
      ...state,
      phase: {
        ...phase,
        attackerBlockerOrder: {
          ...phase.attackerBlockerOrder,
          [attackerPermanentId]: blockerPermanentIds,
        },
      },
    },
    events: [],
  };
}

function handleConfirmBlockerOrder(state: GameState): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'order_blockers' }>;
  const events: GameEvent[] = [{
    type: 'BLOCKERS_DECLARED',
    assignments: phase.blockers,
  }];
  const combatResult = resolveCombat(
    state,
    phase.confirmedAttackers,
    phase.blockers,
    phase.attackerBlockerOrder,
  );
  events.push(...combatResult.events);

  if (combatResult.newState.phase.type === 'game_over') {
    return { newState: combatResult.newState, events };
  }

  return {
    newState: { ...combatResult.newState, phase: { type: 'play', postCombat: true } },
    events,
  };
}

function buildAttackerBlockerOrder(blockers: Record<string, string>): Record<string, string[]> {
  const attackerToBlockers: Record<string, string[]> = {};
  for (const [blockerId, attackerId] of Object.entries(blockers)) {
    if (!attackerToBlockers[attackerId]) attackerToBlockers[attackerId] = [];
    attackerToBlockers[attackerId].push(blockerId);
  }
  return attackerToBlockers;
}

function hasMultiBlock(attackerToBlockers: Record<string, string[]>): boolean {
  return Object.values(attackerToBlockers).some((blockerIds) => blockerIds.length > 1);
}

// ─── Combat Resolution ───

function resolveCombat(
  state: GameState,
  attackers: string[],
  blockers: Record<string, string>, // blocker → attacker
  attackerToBlockersOverride?: Record<string, string[]>,
): EffectResult {
  const events: GameEvent[] = [];
  let currentState = state;
  const defender = getOpponent(state.activePlayer);

  const attackerToBlockers = attackerToBlockersOverride ?? buildAttackerBlockerOrder(blockers);

  for (const attackerId of attackers) {
    const blockerIds = attackerToBlockers[attackerId];

    // Re-find the attacker (may have died from previous combat)
    const attackerFound = findPermanent(currentState, attackerId);
    if (!attackerFound) continue;
    const attacker = attackerFound.permanent;

    if (blockerIds && blockerIds.length > 0) {
      // Filter out blockers that may have died from prior combat
      const livingBlockerIds = blockerIds.filter((id) => findPermanent(currentState, id));

      if (livingBlockerIds.length === 0) {
        // All blockers died — attacker goes unblocked
        const result = resolveUnblockedAttack(currentState, attacker, defender);
        currentState = result.newState;
        events.push(...result.events);
      } else if (livingBlockerIds.length === 1) {
        // Single blocker — use existing resolution
        const blocker = findPermanent(currentState, livingBlockerIds[0])!.permanent;
        const result = resolveBlockedCombat(currentState, attacker, blocker);
        currentState = result.newState;
        events.push(...result.events);
      } else {
        // Multiple blockers
        const result = resolveMultiBlockCombat(currentState, attacker, livingBlockerIds);
        currentState = result.newState;
        events.push(...result.events);
      }
    } else {
      // Unblocked
      const result = resolveUnblockedAttack(currentState, attacker, defender);
      currentState = result.newState;
      events.push(...result.events);
    }

  }

  // Deduplicate: if multiple attackers dealt lethal damage, only keep the first
  // GAME_OVER event so the animation system doesn't produce duplicate steps.
  let seenGameOver = false;
  const deduped = events.filter((e) => {
    if (e.type === 'GAME_OVER') {
      if (seenGameOver) return false;
      seenGameOver = true;
    }
    return true;
  });

  return { newState: currentState, events: deduped };
}

/**
 * Resolve combat where multiple blockers are assigned to a single attacker.
 * Attacker distributes its damage among blockers in order (first takes up to lethal, overflow to next).
 * All blockers simultaneously deal their damage back to the attacker.
 */
function resolveMultiBlockCombat(
  state: GameState,
  attacker: Permanent,
  blockerIds: string[],
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const mutableState: GameState = { ...state, players };
  const attackerHasArmor = hasKeyword(attacker, 'armor') && !attacker.armorUsedThisTurn;
  const attackerHasDeathtouch = hasKeyword(attacker, 'deathtouch');
  const attackerHasLifesteal = hasKeyword(attacker, 'lifesteal');
  const blockerRefs = blockerIds
    .map((blockerId) => findPermanent(mutableState, blockerId))
    .filter(
      (ref): ref is { permanent: Permanent; owner: PlayerId; slotIndex: number } =>
        ref !== null,
    );
  const attackerRef = findPermanent(mutableState, attacker.permanentId);

  let attackDamage = getEffectiveAttack(attacker);
  if (hasKeyword(attacker, 'fury')) attackDamage *= 2;

  // Distribute attacker damage among blockers in order
  let remainingDmg = attackDamage;
  for (const blockerRef of blockerRefs) {
    if (remainingDmg <= 0) break;

    const blocker = players[blockerRef.owner].board[blockerRef.slotIndex];
    if (!blocker) continue;

    // With deathtouch, 1 damage is enough to kill any blocker
    const blockerHP = getCurrentHealth(blocker);
    let dmgToAssign: number;
    if (attackerHasDeathtouch) {
      dmgToAssign = Math.min(remainingDmg, 1);
    } else {
      dmgToAssign = Math.min(remainingDmg, blockerHP);
    }

    // Blocker armor reduces incoming damage
    if (hasKeyword(blocker, 'armor') && !blocker.armorUsedThisTurn && dmgToAssign > 0) {
      dmgToAssign = Math.max(0, dmgToAssign - 1);
      players[blockerRef.owner].board[blockerRef.slotIndex] = {
        ...blocker,
        damage: blocker.damage + dmgToAssign,
        armorUsedThisTurn: true,
      };
    } else {
      players[blockerRef.owner].board[blockerRef.slotIndex] = {
        ...blocker,
        damage: blocker.damage + dmgToAssign,
      };
    }

    remainingDmg -= dmgToAssign;
    events.push({
      type: 'DAMAGE_DEALT',
      targetId: blocker.permanentId,
      amount: dmgToAssign,
      source: attacker.permanentId,
    });
  }

  // All blockers deal damage to attacker simultaneously
  let totalBlockerDmg = 0;
  let attackerArmorUsed = false;
  for (const blockerRef of blockerRefs) {
    const blocker = players[blockerRef.owner].board[blockerRef.slotIndex];
    if (!blocker) continue;

    let blockDmg = getEffectiveAttack(blocker);
    if (hasKeyword(blocker, 'fury')) blockDmg *= 2;

    // Attacker armor reduces the first source of blocker damage (once)
    if (attackerHasArmor && !attackerArmorUsed && blockDmg > 0) {
      blockDmg = Math.max(0, blockDmg - 1);
      attackerArmorUsed = true;
    }

    totalBlockerDmg += blockDmg;
    events.push({
      type: 'DAMAGE_DEALT',
      targetId: attacker.permanentId,
      amount: blockDmg,
      source: blocker.permanentId,
    });
  }

  // Apply total blocker damage to attacker
  if (attackerRef) {
    const attackerNow = players[attackerRef.owner].board[attackerRef.slotIndex];
    if (attackerNow) {
      players[attackerRef.owner].board[attackerRef.slotIndex] = {
        ...attackerNow,
        damage: attackerNow.damage + totalBlockerDmg,
        armorUsedThisTurn: attackerNow.armorUsedThisTurn || attackerArmorUsed,
      };
    }
  }

  // Deathtouch checks
  if (attackerHasDeathtouch && attackDamage > 0) {
    for (const blockerRef of blockerRefs) {
      const dtPerm = players[blockerRef.owner].board[blockerRef.slotIndex];
      if (dtPerm) {
        players[blockerRef.owner].board[blockerRef.slotIndex] = {
          ...dtPerm,
          damage: dtPerm.health + dtPerm.temporaryHealthBonus,
        };
      }
    }
  }
  for (const blockerRef of blockerRefs) {
    const blocker = players[blockerRef.owner].board[blockerRef.slotIndex];
    if (!blocker) continue;
    if (hasKeyword(blocker, 'deathtouch') && getEffectiveAttack(blocker) > 0) {
      if (attackerRef) {
        const dtPerm = players[attackerRef.owner].board[attackerRef.slotIndex];
        if (dtPerm) {
          players[attackerRef.owner].board[attackerRef.slotIndex] = {
            ...dtPerm,
            damage: dtPerm.health + dtPerm.temporaryHealthBonus,
          };
        }
      }
      break; // One deathtouch blocker is enough to kill the attacker
    }
  }

  // Lifesteal checks
  if (attackerHasLifesteal && attackDamage > 0) {
    const totalDealt = attackDamage - remainingDmg;
    players[attacker.ownerId].health += totalDealt;
    events.push({ type: 'PLAYER_HEALED', player: attacker.ownerId, amount: totalDealt });
  }
  for (const blockerRef of blockerRefs) {
    const blocker = blockerRef.permanent;
    if (hasKeyword(blocker, 'lifesteal')) {
      let blockDmg = getEffectiveAttack(blocker);
      if (hasKeyword(blocker, 'fury')) blockDmg *= 2;
      if (blockDmg > 0) {
        players[blocker.ownerId].health += blockDmg;
        events.push({ type: 'PLAYER_HEALED', player: blocker.ownerId, amount: blockDmg });
      }
    }
  }

  // Check deaths
  const deathResult = checkAndRemoveDeadCreatures(mutableState);
  events.push(...deathResult.events);
  return { newState: deathResult.newState, events };
}

function resolveBlockedCombat(
  state: GameState,
  attacker: Permanent,
  blocker: Permanent,
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);
  const mutableState: GameState = { ...state, players };

  let attackDamage = getEffectiveAttack(attacker);
  if (hasKeyword(attacker, 'fury')) {
    attackDamage *= 2;
  }

  let blockDamage = getEffectiveAttack(blocker);
  // Blocker fury does not apply in blocking (fury is for attacking)
  // Actually, the spec says fury doubles damage in combat, so let's apply it for blockers too
  if (hasKeyword(blocker, 'fury')) {
    blockDamage *= 2;
  }

  // Apply attacker damage to blocker
  const blockerFound = findPermanent(mutableState, blocker.permanentId);
  if (blockerFound) {
    const blockerNow = players[blockerFound.owner].board[blockerFound.slotIndex];
    if (blockerNow) {
      let actualDmgToBlocker = attackDamage;
      if (hasKeyword(blockerNow, 'armor') && !blockerNow.armorUsedThisTurn && actualDmgToBlocker > 0) {
        actualDmgToBlocker = Math.max(0, actualDmgToBlocker - 1);
        players[blockerFound.owner].board[blockerFound.slotIndex] = {
          ...blockerNow,
          damage: blockerNow.damage + actualDmgToBlocker,
          armorUsedThisTurn: true,
        };
      } else {
        players[blockerFound.owner].board[blockerFound.slotIndex] = {
          ...blockerNow,
          damage: blockerNow.damage + actualDmgToBlocker,
        };
      }
      events.push({
        type: 'DAMAGE_DEALT',
        targetId: blockerNow.permanentId,
        amount: actualDmgToBlocker,
        source: attacker.permanentId,
      });
    }
  }

  // Apply blocker damage to attacker
  const attackerFound = findPermanent(mutableState, attacker.permanentId);
  if (attackerFound) {
    const attackerNow = players[attackerFound.owner].board[attackerFound.slotIndex];
    if (attackerNow) {
      let actualDmgToAttacker = blockDamage;
      if (hasKeyword(attackerNow, 'armor') && !attackerNow.armorUsedThisTurn && actualDmgToAttacker > 0) {
        actualDmgToAttacker = Math.max(0, actualDmgToAttacker - 1);
        players[attackerFound.owner].board[attackerFound.slotIndex] = {
          ...attackerNow,
          damage: attackerNow.damage + actualDmgToAttacker,
          armorUsedThisTurn: true,
        };
      } else {
        players[attackerFound.owner].board[attackerFound.slotIndex] = {
          ...attackerNow,
          damage: attackerNow.damage + actualDmgToAttacker,
        };
      }
      events.push({
        type: 'DAMAGE_DEALT',
        targetId: attackerNow.permanentId,
        amount: actualDmgToAttacker,
        source: blocker.permanentId,
      });
    }
  }

  // Deathtouch checks — before normal death checks
  if (hasKeyword(attacker, 'deathtouch') && attackDamage > 0) {
    const bf = findPermanent(mutableState, blocker.permanentId);
    if (bf) {
      const dtPerm = players[bf.owner].board[bf.slotIndex];
      if (dtPerm) {
        players[bf.owner].board[bf.slotIndex] = {
          ...dtPerm,
          damage: dtPerm.health + dtPerm.temporaryHealthBonus,
        };
      }
    }
  }
  if (hasKeyword(blocker, 'deathtouch') && blockDamage > 0) {
    const af = findPermanent(mutableState, attacker.permanentId);
    if (af) {
      const dtPerm = players[af.owner].board[af.slotIndex];
      if (dtPerm) {
        players[af.owner].board[af.slotIndex] = {
          ...dtPerm,
          damage: dtPerm.health + dtPerm.temporaryHealthBonus,
        };
      }
    }
  }

  // Lifesteal checks (before death removal so we can check damage dealt)
  if (hasKeyword(attacker, 'lifesteal') && attackDamage > 0) {
    players[attacker.ownerId].health += attackDamage;
    events.push({ type: 'PLAYER_HEALED', player: attacker.ownerId, amount: attackDamage });
  }
  if (hasKeyword(blocker, 'lifesteal') && blockDamage > 0) {
    players[blocker.ownerId].health += blockDamage;
    events.push({ type: 'PLAYER_HEALED', player: blocker.ownerId, amount: blockDamage });
  }

  // Check deaths
  const deathResult = checkAndRemoveDeadCreatures(mutableState);
  events.push(...deathResult.events);
  return { newState: deathResult.newState, events };
}

function resolveUnblockedAttack(
  state: GameState,
  attacker: Permanent,
  defender: PlayerId,
): EffectResult {
  const events: GameEvent[] = [];

  let damage = getEffectiveAttack(attacker);
  if (hasKeyword(attacker, 'fury')) {
    damage *= 2;
  }

  const result = applyDamageToPlayer(state, defender, damage, attacker.permanentId);
  events.push(...result.events);

  let currentState = result.newState;

  // Lifesteal
  if (hasKeyword(attacker, 'lifesteal') && damage > 0) {
    const players = clonePlayers(currentState.players);
    players[attacker.ownerId].health += damage;
    events.push({ type: 'PLAYER_HEALED', player: attacker.ownerId, amount: damage });
    currentState = { ...currentState, players };
  }

  return { newState: currentState, events };
}

// ─── Learning Challenge ───

function handleStartLearningChallenge(
  state: GameState,
  actingPlayer: PlayerId,
  prompt: LearningPrompt,
  reward: LearningReward,
  resumeAction: LearningResumeAction,
): ReducerResult {
  const suspendedPhase = state.phase as CorePhase;
  return {
    newState: {
      ...state,
      phase: {
        type: 'learning',
        player: actingPlayer,
        suspendedPhase,
        resumeAction,
        prompt,
        reward,
      },
    },
    events: [{ type: 'LEARNING_CHALLENGE_STARTED', player: actingPlayer, promptId: prompt.id }],
  };
}

function handleAnswerLearningChallenge(
  state: GameState,
  actingPlayer: PlayerId,
  optionId: string,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'learning' }>;
  const correct = optionId === phase.prompt.correctOptionId;
  return resolveLearningChallenge(state, phase, actingPlayer, correct);
}

function handleSkipLearningChallenge(
  state: GameState,
  actingPlayer: PlayerId,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'learning' }>;
  return resolveLearningChallenge(state, phase, actingPlayer, false);
}

function resolveLearningChallenge(
  state: GameState,
  phase: Extract<Phase, { type: 'learning' }>,
  actingPlayer: PlayerId,
  correct: boolean,
): ReducerResult {
  let restoredState: GameState = { ...state, phase: phase.suspendedPhase };
  if (correct) {
    restoredState = applyLearningReward(restoredState, phase.player, phase.reward);
  }

  const resumed = resumeLearningAction(restoredState, phase.resumeAction);

  return {
    newState: resumed.newState,
    events: [
      {
        type: 'LEARNING_CHALLENGE_RESOLVED',
        player: actingPlayer,
        promptId: phase.prompt.id,
        correct,
        rewardApplied: correct,
      },
      ...resumed.events,
    ],
  };
}

function resumeLearningAction(
  state: GameState,
  action: LearningResumeAction,
): ReducerResult {
  switch (action.type) {
    case 'ADVANCE_PHASE':
      return handleAdvancePhase(state);
    case 'CONFIRM_ATTACKERS':
      return handleConfirmAttackers(state);
    case 'CONFIRM_BLOCKERS':
      return handleConfirmBlockers(state);
    case 'CONFIRM_BLOCKER_ORDER':
      return handleConfirmBlockerOrder(state);
  }
}

function applyLearningReward(
  state: GameState,
  player: PlayerId,
  reward: LearningReward,
): GameState {
  const found = findPermanent(state, reward.permanentId);
  if (!found || found.owner !== player) return state;

  const players = clonePlayers(state.players);
  players[found.owner].board[found.slotIndex] = withTemporaryBuff(
    found.permanent,
    reward.attackBonus,
    reward.healthBonus,
  );
  return { ...state, players };
}

// ─── End-of-Turn Processing ───

function performEndOfTurnProcessing(state: GameState): ReducerResult {
  const activePs = state.players[state.activePlayer];

  // Check if hand exceeds maxHandSize (when defined)
  if (state.ruleset.maxHandSize != null && activePs.hand.length > state.ruleset.maxHandSize) {
    const mustDiscard = activePs.hand.length - state.ruleset.maxHandSize;
    return {
      newState: {
        ...state,
        phase: { type: 'discard', player: state.activePlayer, mustDiscard },
      },
      events: [],
    };
  }

  // No discard needed — go to end phase
  return {
    newState: { ...state, phase: { type: 'end' } },
    events: [],
  };
}

// ─── Discard ───

function handleDiscardCard(
  state: GameState,
  actingPlayer: PlayerId,
  cardIndex: number,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'discard' }>;
  const players = clonePlayers(state.players);
  const ps = players[actingPlayer];

  const discarded = ps.hand[cardIndex];
  ps.hand = ps.hand.filter((_, i) => i !== cardIndex);
  ps.discard = [...ps.discard, discarded];

  const remaining = phase.mustDiscard - 1;

  if (remaining > 0) {
    return {
      newState: {
        ...state,
        players,
        phase: { ...phase, mustDiscard: remaining },
      },
      events: [],
    };
  }

  // Discard complete — go to end phase
  return {
    newState: { ...state, players, phase: { type: 'end' } },
    events: [],
  };
}

// ─── Concede ───

function handleConcede(state: GameState, actingPlayer: PlayerId): ReducerResult {
  const winner = getOpponent(actingPlayer);
  return {
    newState: { ...state, phase: { type: 'game_over', winner } },
    events: [{ type: 'GAME_OVER', winner }],
  };
}
