import type { CardInstance, GameState, Permanent, Phase, PlayerId, PlayerState, RulesetConfig } from '../../types';
import { TIER_CONFIGS } from '../../ruleset';

let testInstanceCounter = 0;

export function makeCardInstance(cardId: string, index?: number): CardInstance {
  const idx = index ?? testInstanceCounter++;
  return {
    instanceId: `${cardId}#${idx}`,
    cardId,
  };
}

export function makePermanent(
  cardId: string,
  ownerId: PlayerId,
  overrides?: Partial<Permanent>,
): Permanent {
  return {
    permanentId: `perm_${cardId}_${testInstanceCounter++}`,
    cardId,
    ownerId,
    attack: 1,
    health: 1,
    damage: 0,
    isTapped: false,
    summonedThisTurn: false,
    temporaryAttackBonus: 0,
    temporaryHealthBonus: 0,
    cantAttackThisTurn: false,
    armorUsedThisTurn: false,
    ...overrides,
  };
}

function createDefaultPlayerState(ruleset: RulesetConfig): PlayerState {
  return {
    health: ruleset.startingHealth,
    maxEnergy: 0,
    currentEnergy: 0,
    hand: [],
    deck: [],
    board: Array(ruleset.maxBoardSize).fill(null),
    discard: [],
    fatigueDamage: 0,
    mulliganUsed: false,
  };
}

export function createTestGameState(overrides?: {
  phase?: Phase;
  turn?: number;
  activePlayer?: PlayerId;
  player1?: Partial<PlayerState>;
  player2?: Partial<PlayerState>;
  ruleset?: Partial<RulesetConfig>;
}): GameState {
  const ruleset: RulesetConfig = {
    ...TIER_CONFIGS.apprentice,
    ...overrides?.ruleset,
  };

  const defaultPlayer1 = createDefaultPlayerState(ruleset);
  const defaultPlayer2 = createDefaultPlayerState(ruleset);

  return {
    ruleset,
    phase: overrides?.phase ?? { type: 'play' },
    turn: overrides?.turn ?? 1,
    activePlayer: overrides?.activePlayer ?? 'player1',
    players: {
      player1: { ...defaultPlayer1, ...overrides?.player1 },
      player2: { ...defaultPlayer2, ...overrides?.player2 },
    },
  };
}

/** Reset the global test instance counter (call in beforeEach if needed). */
export function resetTestCounters(): void {
  testInstanceCounter = 0;
}
