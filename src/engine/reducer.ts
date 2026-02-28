import type {
  CardInstance,
  GameAction,
  GameEvent,
  GameState,
  Keyword,
  Permanent,
  Phase,
  PlayerId,
  PlayerState,
  ReducerResult,
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

  switch (action.type) {
    case 'KEEP_HAND':
      return handleKeepHand(state, actingPlayer);
    case 'MULLIGAN_CARDS':
      return handleMulliganCards(state, actingPlayer, action.cardIndices, rng);
    case 'ADVANCE_PHASE':
      return handleAdvancePhase(state, rng);
    case 'PLAY_CARD':
      return handlePlayCard(state, actingPlayer, action.cardIndex, action.targetSlot, rng);
    case 'SELECT_TARGET':
      return handleSelectTarget(state, action.targetRef, rng);
    case 'CANCEL_TARGETING':
      return handleCancelTargeting(state);
    case 'DECLARE_ATTACKER':
      return handleDeclareAttacker(state, action.permanentId);
    case 'UNDECLARE_ATTACKER':
      return handleUndeclareAttacker(state, action.permanentId);
    case 'CONFIRM_ATTACKERS':
      return handleConfirmAttackers(state);
    case 'ASSIGN_BLOCKER':
      return handleAssignBlocker(state, action.blockerPermanentId, action.attackerPermanentId);
    case 'REMOVE_BLOCKER':
      return handleRemoveBlocker(state, action.blockerPermanentId);
    case 'CONFIRM_BLOCKERS':
      return handleConfirmBlockers(state, rng);
    case 'DISCARD_CARD':
      return handleDiscardCard(state, actingPlayer, action.cardIndex);
    case 'CONCEDE':
      return handleConcede(state, actingPlayer);
  }
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

function handleAdvancePhase(state: GameState, rng: RNG): ReducerResult {
  const phase = state.phase;

  switch (phase.type) {
    case 'draw':
      return advanceFromDraw(state, rng);
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

function advanceFromDraw(state: GameState, _rng: RNG): ReducerResult {
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

  return {
    newState: {
      ...state,
      players,
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
  rng: RNG,
): ReducerResult {
  const players = clonePlayers(state.players);
  const ps = players[actingPlayer];
  const cardInstance = ps.hand[cardIndex];
  const cardDef = CARD_REGISTRY[cardInstance.cardId];

  // Remove card from hand and deduct energy
  ps.hand = ps.hand.filter((_, i) => i !== cardIndex);
  ps.currentEnergy -= cardDef.cost;

  const events: GameEvent[] = [];

  if (cardDef.type === 'creature') {
    const slot = targetSlot ?? findFirstEmptySlot(ps.board);
    const permanent = createPermanent(cardInstance, actingPlayer);
    ps.board[slot] = permanent;

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
    let newState: GameState = { ...state, players, phase: state.phase };
    const etbResult = processETBKeywords(newState, permanent, actingPlayer, rng);
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
    const newPhase: Phase = {
      type: 'targeting',
      effectId: cardDef.effectId!,
      casterId: actingPlayer,
      sourceCardId: cardInstance.cardId,
      validTargets,
    };
    return {
      newState: { ...state, players, phase: newPhase },
      events,
    };
  }

  // Untargeted spell — resolve immediately
  const effect = EFFECT_REGISTRY[cardDef.effectId!];
  let newState: GameState = { ...state, players };
  const resolveResult = resolveEffectSteps(newState, effect.steps, actingPlayer, null, rng);
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
  rng: RNG,
): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'targeting' }>;
  const effect = EFFECT_REGISTRY[phase.effectId];
  const events: GameEvent[] = [];

  // Resolve effect steps
  const resolveResult = resolveEffectSteps(state, effect.steps, phase.casterId, targetRef, rng);
  let newState = resolveResult.newState;
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
    newState: { ...newState, players, phase: { type: 'play' } },
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
    newState: { ...state, players, phase: { type: 'play' } },
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
  rng: RNG,
): EffectResult {
  let currentState = state;
  const allEvents: GameEvent[] = [];

  for (const step of steps) {
    const result = resolveEffectStep(currentState, step, casterId, selectedTarget, rng);
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
  rng: RNG,
): EffectResult {
  switch (step.type) {
    case 'damage':
      return resolveEffectDamage(state, step, casterId, selectedTarget);
    case 'heal':
      return resolveEffectHeal(state, step, casterId, selectedTarget);
    case 'draw':
      return resolveEffectDraw(state, step, casterId, rng);
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

  const maxHealth = state.ruleset.startingHealth;
  const currentHP = players[targetPlayer].health;
  const actualHeal = Math.min(step.amount, maxHealth - currentHP);
  players[targetPlayer].health = currentHP + actualHeal;

  if (actualHeal > 0) {
    events.push({ type: 'PLAYER_HEALED', player: targetPlayer, amount: actualHeal });
  }

  return { newState: { ...state, players }, events };
}

function resolveEffectDraw(
  state: GameState,
  step: Extract<EffectStep, { type: 'draw' }>,
  casterId: PlayerId,
  _rng: RNG,
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
    type: 'CREATURE_DIED',
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
      const buffed = {
        ...found.permanent,
        temporaryAttackBonus: found.permanent.temporaryAttackBonus + step.attack,
        temporaryHealthBonus: found.permanent.temporaryHealthBonus + step.health,
      };
      players[found.owner].board[found.slotIndex] = buffed;
    }
  } else if (step.target === 'own_creatures') {
    players[casterId].board = players[casterId].board.map((p) => {
      if (!p) return null;
      return {
        ...p,
        temporaryAttackBonus: p.temporaryAttackBonus + step.attack,
        temporaryHealthBonus: p.temporaryHealthBonus + step.health,
      };
    });
  }

  return { newState: { ...state, players }, events: [] };
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
  rng: RNG,
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
        const maxHealth = currentState.ruleset.startingHealth;
        const currentHP = players[ownerId].health;
        const actualHeal = Math.min(2, maxHealth - currentHP);
        players[ownerId].health = currentHP + actualHeal;
        if (actualHeal > 0) {
          allEvents.push({ type: 'PLAYER_HEALED', player: ownerId, amount: actualHeal });
        }
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
          rng,
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

  // No attackers — skip combat, go to end-of-turn processing
  if (phase.tentativeAttackers.length === 0) {
    return performEndOfTurnProcessing(state);
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

  return {
    newState: {
      ...state,
      players,
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

function handleConfirmBlockers(state: GameState, _rng: RNG): ReducerResult {
  const phase = state.phase as Extract<Phase, { type: 'battle'; step: 'declare_blockers' }>;
  const events: GameEvent[] = [];

  events.push({
    type: 'BLOCKERS_DECLARED',
    assignments: phase.tentativeBlockers,
  });

  // Resolve combat immediately
  const combatResult = resolveCombat(
    state,
    phase.confirmedAttackers,
    phase.tentativeBlockers,
  );
  events.push(...combatResult.events);

  if (combatResult.newState.phase.type === 'game_over') {
    return { newState: combatResult.newState, events };
  }

  // End-of-turn processing after combat
  const endResult = performEndOfTurnProcessing(combatResult.newState);
  events.push(...endResult.events);

  return { newState: endResult.newState, events };
}

// ─── Combat Resolution ───

function resolveCombat(
  state: GameState,
  attackers: string[],
  blockers: Record<string, string>, // blocker → attacker
): EffectResult {
  const events: GameEvent[] = [];
  let currentState = state;
  const defender = getOpponent(state.activePlayer);

  // Invert blockers: attacker → blocker
  const attackerToBlocker: Record<string, string> = {};
  for (const [blockerId, attackerId] of Object.entries(blockers)) {
    attackerToBlocker[attackerId] = blockerId;
  }

  for (const attackerId of attackers) {
    const blockerId = attackerToBlocker[attackerId];

    // Re-find the attacker (may have died from previous combat)
    const attackerFound = findPermanent(currentState, attackerId);
    if (!attackerFound) continue;
    const attacker = attackerFound.permanent;

    if (blockerId) {
      // Blocked combat
      const blockerFound = findPermanent(currentState, blockerId);
      if (!blockerFound) {
        // Blocker died — attacker goes unblocked
        const result = resolveUnblockedAttack(currentState, attacker, defender);
        currentState = result.newState;
        events.push(...result.events);
        continue;
      }
      const blocker = blockerFound.permanent;

      const result = resolveBlockedCombat(currentState, attacker, blocker);
      currentState = result.newState;
      events.push(...result.events);
    } else {
      // Unblocked
      const result = resolveUnblockedAttack(currentState, attacker, defender);
      currentState = result.newState;
      events.push(...result.events);
    }

    if (currentState.phase.type === 'game_over') break;
  }

  return { newState: currentState, events };
}

function resolveBlockedCombat(
  state: GameState,
  attacker: Permanent,
  blocker: Permanent,
): EffectResult {
  const events: GameEvent[] = [];
  const players = clonePlayers(state.players);

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
  const blockerFound = findPermanent({ ...state, players }, blocker.permanentId);
  if (blockerFound) {
    let actualDmgToBlocker = attackDamage;
    if (hasKeyword(blocker, 'armor') && !blocker.armorUsedThisTurn && actualDmgToBlocker > 0) {
      actualDmgToBlocker = Math.max(0, actualDmgToBlocker - 1);
      players[blockerFound.owner].board[blockerFound.slotIndex] = {
        ...blocker,
        damage: blocker.damage + actualDmgToBlocker,
        armorUsedThisTurn: true,
      };
    } else {
      players[blockerFound.owner].board[blockerFound.slotIndex] = {
        ...blocker,
        damage: blocker.damage + actualDmgToBlocker,
      };
    }
    events.push({
      type: 'DAMAGE_DEALT',
      targetId: blocker.permanentId,
      amount: actualDmgToBlocker,
      source: attacker.permanentId,
    });
  }

  // Apply blocker damage to attacker
  const attackerFound = findPermanent({ ...state, players }, attacker.permanentId);
  if (attackerFound) {
    let actualDmgToAttacker = blockDamage;
    if (hasKeyword(attacker, 'armor') && !attacker.armorUsedThisTurn && actualDmgToAttacker > 0) {
      actualDmgToAttacker = Math.max(0, actualDmgToAttacker - 1);
      players[attackerFound.owner].board[attackerFound.slotIndex] = {
        ...attacker,
        damage: attacker.damage + actualDmgToAttacker,
        armorUsedThisTurn: true,
      };
    } else {
      players[attackerFound.owner].board[attackerFound.slotIndex] = {
        ...attacker,
        damage: attacker.damage + actualDmgToAttacker,
      };
    }
    events.push({
      type: 'DAMAGE_DEALT',
      targetId: attacker.permanentId,
      amount: actualDmgToAttacker,
      source: blocker.permanentId,
    });
  }

  let currentState: GameState = { ...state, players };

  // Deathtouch checks — before normal death checks
  const playersAfterDT = clonePlayers(currentState.players);
  if (hasKeyword(attacker, 'deathtouch') && attackDamage > 0) {
    const bf = findPermanent(currentState, blocker.permanentId);
    if (bf) {
      const dtPerm = playersAfterDT[bf.owner].board[bf.slotIndex];
      if (dtPerm) {
        playersAfterDT[bf.owner].board[bf.slotIndex] = {
          ...dtPerm,
          damage: dtPerm.health + dtPerm.temporaryHealthBonus,
        };
      }
    }
  }
  if (hasKeyword(blocker, 'deathtouch') && blockDamage > 0) {
    const af = findPermanent(currentState, attacker.permanentId);
    if (af) {
      const dtPerm = playersAfterDT[af.owner].board[af.slotIndex];
      if (dtPerm) {
        playersAfterDT[af.owner].board[af.slotIndex] = {
          ...dtPerm,
          damage: dtPerm.health + dtPerm.temporaryHealthBonus,
        };
      }
    }
  }
  currentState = { ...currentState, players: playersAfterDT };

  // Lifesteal checks (before death removal so we can check damage dealt)
  if (hasKeyword(attacker, 'lifesteal') && attackDamage > 0) {
    const lifestealPlayers = clonePlayers(currentState.players);
    const maxHP = currentState.ruleset.startingHealth;
    const currentHP = lifestealPlayers[attacker.ownerId].health;
    const healAmt = Math.min(attackDamage, maxHP - currentHP);
    lifestealPlayers[attacker.ownerId].health = currentHP + healAmt;
    if (healAmt > 0) {
      events.push({ type: 'PLAYER_HEALED', player: attacker.ownerId, amount: healAmt });
    }
    currentState = { ...currentState, players: lifestealPlayers };
  }
  if (hasKeyword(blocker, 'lifesteal') && blockDamage > 0) {
    const lifestealPlayers = clonePlayers(currentState.players);
    const maxHP = currentState.ruleset.startingHealth;
    const currentHP = lifestealPlayers[blocker.ownerId].health;
    const healAmt = Math.min(blockDamage, maxHP - currentHP);
    lifestealPlayers[blocker.ownerId].health = currentHP + healAmt;
    if (healAmt > 0) {
      events.push({ type: 'PLAYER_HEALED', player: blocker.ownerId, amount: healAmt });
    }
    currentState = { ...currentState, players: lifestealPlayers };
  }

  // Check deaths
  const deathResult = checkAndRemoveDeadCreatures(currentState);
  events.push(...deathResult.events);
  currentState = deathResult.newState;

  return { newState: currentState, events };
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
    const maxHP = currentState.ruleset.startingHealth;
    const currentHP = players[attacker.ownerId].health;
    const healAmt = Math.min(damage, maxHP - currentHP);
    players[attacker.ownerId].health = currentHP + healAmt;
    if (healAmt > 0) {
      events.push({ type: 'PLAYER_HEALED', player: attacker.ownerId, amount: healAmt });
    }
    currentState = { ...currentState, players };
  }

  return { newState: currentState, events };
}

// ─── End-of-Turn Processing ───

function performEndOfTurnProcessing(state: GameState): ReducerResult {
  const activePs = state.players[state.activePlayer];

  // Check if hand exceeds maxHandSize
  if (activePs.hand.length > state.ruleset.maxHandSize) {
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
