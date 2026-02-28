import type { GameAction, GameState, PlayerId, TargetRef, ValidationResult } from './types';
import { CARD_REGISTRY } from './cards';
import { getOpponent } from './types';

// ─── Action Validation ───

export function validateAction(
  state: GameState,
  action: GameAction,
  actingPlayer: PlayerId,
): ValidationResult {
  switch (action.type) {
    case 'KEEP_HAND':
      return validateKeepHand(state, actingPlayer);
    case 'MULLIGAN_CARDS':
      return validateMulliganCards(state, action.cardIndices, actingPlayer);
    case 'ADVANCE_PHASE':
      return validateAdvancePhase(state);
    case 'PLAY_CARD':
      return validatePlayCard(state, action.cardIndex, action.targetSlot, actingPlayer);
    case 'SELECT_TARGET':
      return validateSelectTarget(state, action.targetRef, actingPlayer);
    case 'CANCEL_TARGETING':
      return validateCancelTargeting(state, actingPlayer);
    case 'DECLARE_ATTACKER':
      return validateDeclareAttacker(state, action.permanentId, actingPlayer);
    case 'UNDECLARE_ATTACKER':
      return validateUndeclareAttacker(state, action.permanentId);
    case 'CONFIRM_ATTACKERS':
      return validateConfirmAttackers(state);
    case 'ASSIGN_BLOCKER':
      return validateAssignBlocker(state, action.blockerPermanentId, action.attackerPermanentId, actingPlayer);
    case 'REMOVE_BLOCKER':
      return validateRemoveBlocker(state, action.blockerPermanentId);
    case 'CONFIRM_BLOCKERS':
      return validateConfirmBlockers(state);
    case 'DISCARD_CARD':
      return validateDiscardCard(state, action.cardIndex, actingPlayer);
    case 'CONCEDE':
      return validateConcede(state);
  }
}

// ─── Individual Validators ───

function validateKeepHand(state: GameState, actingPlayer: PlayerId): ValidationResult {
  if (state.phase.type !== 'mulligan') {
    return { valid: false, reason: 'KEEP_HAND is only valid during mulligan phase' };
  }
  if (state.phase.player !== actingPlayer) {
    return { valid: false, reason: 'It is not your mulligan turn' };
  }
  return { valid: true };
}

function validateMulliganCards(
  state: GameState,
  cardIndices: number[],
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'mulligan') {
    return { valid: false, reason: 'MULLIGAN_CARDS is only valid during mulligan phase' };
  }
  if (state.phase.player !== actingPlayer) {
    return { valid: false, reason: 'It is not your mulligan turn' };
  }
  const playerState = state.players[actingPlayer];
  if (playerState.mulliganUsed) {
    return { valid: false, reason: 'You have already used your mulligan' };
  }
  for (const idx of cardIndices) {
    if (idx < 0 || idx >= playerState.hand.length) {
      return { valid: false, reason: `Invalid card index: ${idx}` };
    }
  }
  return { valid: true };
}

function validateAdvancePhase(state: GameState): ValidationResult {
  const { type } = state.phase;
  if (type === 'play' || type === 'draw' || type === 'energy' || type === 'end') {
    return { valid: true };
  }
  return { valid: false, reason: `Cannot advance phase during ${type} phase` };
}

function validatePlayCard(
  state: GameState,
  cardIndex: number,
  targetSlot: number | undefined,
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'play') {
    return { valid: false, reason: 'PLAY_CARD is only valid during play phase' };
  }
  if (state.activePlayer !== actingPlayer) {
    return { valid: false, reason: 'It is not your turn' };
  }
  const playerState = state.players[actingPlayer];
  if (cardIndex < 0 || cardIndex >= playerState.hand.length) {
    return { valid: false, reason: `Invalid card index: ${cardIndex}` };
  }
  const cardInstance = playerState.hand[cardIndex];
  const cardDef = CARD_REGISTRY[cardInstance.cardId];
  if (playerState.currentEnergy < cardDef.cost) {
    return { valid: false, reason: 'Not enough energy to play this card' };
  }
  if (cardDef.type === 'creature') {
    if (targetSlot !== undefined) {
      if (targetSlot < 0 || targetSlot >= playerState.board.length) {
        return { valid: false, reason: `Invalid target slot: ${targetSlot}` };
      }
      if (playerState.board[targetSlot] !== null) {
        return { valid: false, reason: 'Target slot is occupied' };
      }
    } else {
      const hasEmptySlot = playerState.board.some((slot) => slot === null);
      if (!hasEmptySlot) {
        return { valid: false, reason: 'Board is full' };
      }
    }
  }
  return { valid: true };
}

function validateSelectTarget(
  state: GameState,
  targetRef: TargetRef,
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'targeting') {
    return { valid: false, reason: 'SELECT_TARGET is only valid during targeting phase' };
  }
  if (state.phase.casterId !== actingPlayer) {
    return { valid: false, reason: 'Only the caster can select a target' };
  }
  const isValidTarget = state.phase.validTargets.some((vt) => {
    if (vt.type === 'creature' && targetRef.type === 'creature') {
      return vt.permanentId === targetRef.permanentId;
    }
    if (vt.type === 'player' && targetRef.type === 'player') {
      return vt.playerId === targetRef.playerId;
    }
    return false;
  });
  if (!isValidTarget) {
    return { valid: false, reason: 'Invalid target' };
  }
  return { valid: true };
}

function validateCancelTargeting(state: GameState, actingPlayer: PlayerId): ValidationResult {
  if (state.phase.type !== 'targeting') {
    return { valid: false, reason: 'CANCEL_TARGETING is only valid during targeting phase' };
  }
  if (state.phase.casterId !== actingPlayer) {
    return { valid: false, reason: 'Only the caster can cancel targeting' };
  }
  return { valid: true };
}

function validateDeclareAttacker(
  state: GameState,
  permanentId: string,
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return { valid: false, reason: 'DECLARE_ATTACKER is only valid during declare_attackers step' };
  }
  if (state.activePlayer !== actingPlayer) {
    return { valid: false, reason: 'Only the active player can declare attackers' };
  }
  const playerState = state.players[actingPlayer];
  const permanent = playerState.board.find((p) => p !== null && p.permanentId === permanentId);
  if (!permanent) {
    return { valid: false, reason: 'Creature not found on your board' };
  }
  if (permanent.isTapped) {
    return { valid: false, reason: 'Tapped creatures cannot attack' };
  }
  if (permanent.summonedThisTurn) {
    const cardDef = CARD_REGISTRY[permanent.cardId];
    if (!cardDef.keywords.includes('swift')) {
      return { valid: false, reason: 'Creature has summoning sickness' };
    }
  }
  if (permanent.cantAttackThisTurn) {
    return { valid: false, reason: 'This creature cannot attack this turn' };
  }
  if (state.phase.tentativeAttackers.includes(permanentId)) {
    return { valid: false, reason: 'Creature is already declared as an attacker' };
  }
  return { valid: true };
}

function validateUndeclareAttacker(state: GameState, permanentId: string): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return { valid: false, reason: 'UNDECLARE_ATTACKER is only valid during declare_attackers step' };
  }
  if (!state.phase.tentativeAttackers.includes(permanentId)) {
    return { valid: false, reason: 'Creature is not a tentative attacker' };
  }
  return { valid: true };
}

function validateConfirmAttackers(state: GameState): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_attackers') {
    return { valid: false, reason: 'CONFIRM_ATTACKERS is only valid during declare_attackers step' };
  }
  return { valid: true };
}

function validateAssignBlocker(
  state: GameState,
  blockerPermanentId: string,
  attackerPermanentId: string,
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') {
    return { valid: false, reason: 'ASSIGN_BLOCKER is only valid during declare_blockers step' };
  }
  const defender = getOpponent(state.activePlayer);
  if (actingPlayer !== defender) {
    return { valid: false, reason: 'Only the defending player can assign blockers' };
  }
  const defenderState = state.players[defender];
  const blocker = defenderState.board.find((p) => p !== null && p.permanentId === blockerPermanentId);
  if (!blocker) {
    return { valid: false, reason: 'Blocker creature not found on your board' };
  }
  if (blocker.isTapped) {
    return { valid: false, reason: 'Tapped creatures cannot block' };
  }
  if (!state.phase.confirmedAttackers.includes(attackerPermanentId)) {
    return { valid: false, reason: 'Target is not a confirmed attacker' };
  }
  const alreadyBlocking = Object.keys(state.phase.tentativeBlockers).includes(blockerPermanentId);
  if (alreadyBlocking) {
    return { valid: false, reason: 'Creature is already assigned as a blocker' };
  }
  return { valid: true };
}

function validateRemoveBlocker(state: GameState, blockerPermanentId: string): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') {
    return { valid: false, reason: 'REMOVE_BLOCKER is only valid during declare_blockers step' };
  }
  if (!(blockerPermanentId in state.phase.tentativeBlockers)) {
    return { valid: false, reason: 'Creature is not currently assigned as a blocker' };
  }
  return { valid: true };
}

function validateConfirmBlockers(state: GameState): ValidationResult {
  if (state.phase.type !== 'battle' || state.phase.step !== 'declare_blockers') {
    return { valid: false, reason: 'CONFIRM_BLOCKERS is only valid during declare_blockers step' };
  }
  return { valid: true };
}

function validateDiscardCard(
  state: GameState,
  cardIndex: number,
  actingPlayer: PlayerId,
): ValidationResult {
  if (state.phase.type !== 'discard') {
    return { valid: false, reason: 'DISCARD_CARD is only valid during discard phase' };
  }
  if (state.phase.player !== actingPlayer) {
    return { valid: false, reason: 'It is not your discard turn' };
  }
  const playerState = state.players[actingPlayer];
  if (cardIndex < 0 || cardIndex >= playerState.hand.length) {
    return { valid: false, reason: `Invalid card index: ${cardIndex}` };
  }
  return { valid: true };
}

function validateConcede(state: GameState): ValidationResult {
  if (state.phase.type === 'game_over') {
    return { valid: false, reason: 'Cannot concede after game is over' };
  }
  return { valid: true };
}

// ─── Legal Action Enumeration ───

export function enumerateLegalActions(
  state: GameState,
  actingPlayer: PlayerId,
): GameAction[] {
  const actions: GameAction[] = [];

  if (state.phase.type === 'game_over') {
    return actions;
  }

  // CONCEDE is always available outside game_over
  actions.push({ type: 'CONCEDE' });

  switch (state.phase.type) {
    case 'mulligan':
      enumerateMulliganActions(state, actingPlayer, actions);
      break;
    case 'draw':
    case 'energy':
      actions.push({ type: 'ADVANCE_PHASE' });
      break;
    case 'play':
      enumeratePlayActions(state, actingPlayer, actions);
      break;
    case 'targeting':
      enumerateTargetingActions(state, actingPlayer, actions);
      break;
    case 'battle':
      enumerateBattleActions(state, actingPlayer, actions);
      break;
    case 'discard':
      enumerateDiscardActions(state, actingPlayer, actions);
      break;
    case 'end':
      actions.push({ type: 'ADVANCE_PHASE' });
      break;
  }

  return actions;
}

function enumerateMulliganActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): void {
  if (state.phase.type !== 'mulligan' || state.phase.player !== actingPlayer) {
    return;
  }

  actions.push({ type: 'KEEP_HAND' });

  const playerState = state.players[actingPlayer];
  if (!playerState.mulliganUsed && playerState.hand.length > 0) {
    // Generate all non-empty subsets of card indices for mulligan
    // For simplicity and practicality, enumerate individual card indices
    // Each valid subset of indices is a valid mulligan action
    const indices = playerState.hand.map((_, i) => i);
    const subsets = getNonEmptySubsets(indices);
    for (const subset of subsets) {
      actions.push({ type: 'MULLIGAN_CARDS', cardIndices: subset });
    }
  }
}

function getNonEmptySubsets(indices: number[]): number[][] {
  const result: number[][] = [];
  const n = indices.length;
  // Use bitmask enumeration: 1 to 2^n - 1
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(indices[i]);
      }
    }
    result.push(subset);
  }
  return result;
}

function enumeratePlayActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): void {
  if (state.activePlayer !== actingPlayer) {
    return;
  }

  actions.push({ type: 'ADVANCE_PHASE' });

  const playerState = state.players[actingPlayer];
  const emptySlots = playerState.board
    .map((slot, i) => (slot === null ? i : -1))
    .filter((i) => i >= 0);

  for (let cardIndex = 0; cardIndex < playerState.hand.length; cardIndex++) {
    const cardInstance = playerState.hand[cardIndex];
    const cardDef = CARD_REGISTRY[cardInstance.cardId];

    if (playerState.currentEnergy < cardDef.cost) {
      continue;
    }

    if (cardDef.type === 'creature') {
      // One action per empty slot
      for (const slot of emptySlots) {
        actions.push({ type: 'PLAY_CARD', cardIndex, targetSlot: slot });
      }
    } else {
      // Spell
      actions.push({ type: 'PLAY_CARD', cardIndex });
    }
  }
}

function enumerateTargetingActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): void {
  if (state.phase.type !== 'targeting' || state.phase.casterId !== actingPlayer) {
    return;
  }

  actions.push({ type: 'CANCEL_TARGETING' });

  for (const targetRef of state.phase.validTargets) {
    actions.push({ type: 'SELECT_TARGET', targetRef });
  }
}

function enumerateBattleActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): void {
  if (state.phase.type !== 'battle') {
    return;
  }

  if (state.phase.step === 'declare_attackers') {
    if (state.activePlayer !== actingPlayer) {
      return;
    }

    actions.push({ type: 'CONFIRM_ATTACKERS' });

    const playerState = state.players[actingPlayer];
    for (const slot of playerState.board) {
      if (slot === null) continue;
      const result = validateDeclareAttacker(state, slot.permanentId, actingPlayer);
      if (result.valid) {
        actions.push({ type: 'DECLARE_ATTACKER', permanentId: slot.permanentId });
      }
    }

    for (const permanentId of state.phase.tentativeAttackers) {
      actions.push({ type: 'UNDECLARE_ATTACKER', permanentId });
    }
  } else if (state.phase.step === 'declare_blockers') {
    const defender = getOpponent(state.activePlayer);
    if (actingPlayer !== defender) {
      return;
    }

    actions.push({ type: 'CONFIRM_BLOCKERS' });

    const defenderState = state.players[defender];
    for (const slot of defenderState.board) {
      if (slot === null) continue;
      if (slot.isTapped) continue;
      if (slot.permanentId in state.phase.tentativeBlockers) continue;

      for (const attackerPermanentId of state.phase.confirmedAttackers) {
        actions.push({
          type: 'ASSIGN_BLOCKER',
          blockerPermanentId: slot.permanentId,
          attackerPermanentId,
        });
      }
    }

    for (const blockerPermanentId of Object.keys(state.phase.tentativeBlockers)) {
      actions.push({ type: 'REMOVE_BLOCKER', blockerPermanentId });
    }
  }
  // 'resolving' step has no player actions
}

function enumerateDiscardActions(
  state: GameState,
  actingPlayer: PlayerId,
  actions: GameAction[],
): void {
  if (state.phase.type !== 'discard' || state.phase.player !== actingPlayer) {
    return;
  }

  const playerState = state.players[actingPlayer];
  for (let cardIndex = 0; cardIndex < playerState.hand.length; cardIndex++) {
    actions.push({ type: 'DISCARD_CARD', cardIndex });
  }
}
