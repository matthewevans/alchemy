import { beforeAll, describe, expect, it } from 'vitest';
import { CARD_REGISTRY, getCardsByElement } from '../cards';
import { ALLIED_PAIRS } from '../elements';
import { createInitialGameState } from '../gameInit';
import { chooseAction } from '../ai';
import { createRNG } from '../prng';
import { computeValidTargets, reduce } from '../reducer';
import { TIER_CONFIGS } from '../ruleset';
import { enumerateLegalActions } from '../validation';
import { getOpponent } from '../types';
import type { GameAction, GameState, PlayerId } from '../types';

const GAMES_PER_CELL = 20;
const MAX_STEPS_PER_GAME = 1000;

const MIN_FIRST_PLAYER_WIN_RATE = 0.38;
const MAX_FIRST_PLAYER_WIN_RATE = 0.72;
const MIN_DECK_WIN_RATE = 0.25;
const MAX_DECK_WIN_RATE = 0.75;
const MIN_POLICY_WIN_RATE = 0.3;
const MAX_POLICY_WIN_RATE = 0.7;
const MIN_AVG_TURNS = 12;
const MAX_AVG_TURNS = 32;

const POLICIES = ['heuristic', 'tempo'] as const;
type Policy = (typeof POLICIES)[number];

type AlliedDeckId = `${(typeof ALLIED_PAIRS)[number][0]}_${(typeof ALLIED_PAIRS)[number][1]}`;

interface DeckConfig {
  id: AlliedDeckId;
  cardIds: string[];
}

interface CellResult {
  p1Wins: number;
  p2Wins: number;
  avgTurns: number;
}

interface PolicyBalanceSummary {
  cells: Record<string, CellResult>;
  deckWinRate: Record<AlliedDeckId, number>;
  policyWinRate: Record<Policy, number>;
  firstPlayerWinRate: number;
}

function getActingPlayer(state: GameState): PlayerId {
  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return phase.player;
    case 'discard':
      return phase.player;
    case 'targeting':
      return phase.casterId;
    case 'battle':
      if (phase.step === 'declare_attackers') {
        return state.activePlayer;
      }
      if (phase.step === 'declare_blockers') {
        return getOpponent(state.activePlayer);
      }
      return state.activePlayer;
    default:
      return state.activePlayer;
  }
}

function buildAlliedDecks(): DeckConfig[] {
  return ALLIED_PAIRS.map(([first, second]) => ({
    id: `${first}_${second}`,
    cardIds: [
      ...getCardsByElement(first).map((card) => card.id),
      ...getCardsByElement(second).map((card) => card.id),
    ],
  }));
}

function isTargetlessPlayAction(state: GameState, actingPlayer: PlayerId, action: GameAction): boolean {
  if (action.type !== 'PLAY_CARD') {
    return false;
  }

  const card = state.players[actingPlayer].hand[action.cardIndex];
  const cardDef = CARD_REGISTRY[card.cardId];

  if (!cardDef.targetingType) {
    return false;
  }

  return computeValidTargets(state, actingPlayer, cardDef.targetingType).length === 0;
}

function chooseTempoAction(state: GameState, actingPlayer: PlayerId, rng: () => number): GameAction {
  const legal = enumerateLegalActions(state, actingPlayer).filter((action) => action.type !== 'CONCEDE');
  if (legal.length === 0) {
    throw new Error('No non-concede actions for tempo policy');
  }

  const phase = state.phase;

  if (phase.type === 'mulligan') {
    const hand = state.players[actingPlayer].hand;
    const keep = legal.find((action) => action.type === 'KEEP_HAND');
    const mulligans = legal.filter((action): action is Extract<GameAction, { type: 'MULLIGAN_CARDS' }> => action.type === 'MULLIGAN_CARDS');

    const hasLowCost = hand.some((card) => CARD_REGISTRY[card.cardId].cost <= 2);
    if (hasLowCost || mulligans.length === 0) {
      return keep ?? legal[0];
    }

    return mulligans.reduce((largest, action) => {
      if (action.cardIndices.length > largest.cardIndices.length) {
        return action;
      }
      return largest;
    }, mulligans[0]);
  }

  if (phase.type === 'draw' || phase.type === 'energy' || phase.type === 'end') {
    return { type: 'ADVANCE_PHASE' };
  }

  if (phase.type === 'play') {
    const playable = legal
      .filter((action): action is Extract<GameAction, { type: 'PLAY_CARD' }> => action.type === 'PLAY_CARD')
      .filter((action) => !isTargetlessPlayAction(state, actingPlayer, action));

    if (playable.length > 0) {
      playable.sort((a, b) => {
        const aCard = CARD_REGISTRY[state.players[actingPlayer].hand[a.cardIndex].cardId];
        const bCard = CARD_REGISTRY[state.players[actingPlayer].hand[b.cardIndex].cardId];
        if (aCard.cost !== bCard.cost) {
          return aCard.cost - bCard.cost;
        }
        if (aCard.type !== bCard.type) {
          return aCard.type === 'creature' ? -1 : 1;
        }
        return a.cardIndex - b.cardIndex;
      });
      return playable[0];
    }

    return { type: 'ADVANCE_PHASE' };
  }

  if (phase.type === 'targeting') {
    const select = legal.find((action) => action.type === 'SELECT_TARGET');
    if (select) {
      return select;
    }
    return legal.find((action) => action.type === 'CANCEL_TARGETING') ?? legal[0];
  }

  if (phase.type === 'battle' && phase.step === 'declare_attackers') {
    return legal.find((action) => action.type === 'DECLARE_ATTACKER')
      ?? legal.find((action) => action.type === 'CONFIRM_ATTACKERS')
      ?? legal[0];
  }

  if (phase.type === 'battle' && phase.step === 'declare_blockers') {
    const assigns = legal.filter((action): action is Extract<GameAction, { type: 'ASSIGN_BLOCKER' }> => action.type === 'ASSIGN_BLOCKER');
    if (assigns.length > 0) {
      return assigns[Math.floor(rng() * assigns.length)];
    }
    return legal.find((action) => action.type === 'CONFIRM_BLOCKERS') ?? legal[0];
  }

  if (phase.type === 'discard') {
    const discardActions = legal.filter((action): action is Extract<GameAction, { type: 'DISCARD_CARD' }> => action.type === 'DISCARD_CARD');
    if (discardActions.length > 0) {
      discardActions.sort((a, b) => {
        const aCost = CARD_REGISTRY[state.players[actingPlayer].hand[a.cardIndex].cardId].cost;
        const bCost = CARD_REGISTRY[state.players[actingPlayer].hand[b.cardIndex].cardId].cost;
        return bCost - aCost;
      });
      return discardActions[0];
    }
  }

  return legal[0];
}

function choosePolicyAction(state: GameState, actingPlayer: PlayerId, policy: Policy, rng: () => number): GameAction {
  if (policy === 'heuristic') {
    return chooseAction(state, actingPlayer, rng);
  }
  return chooseTempoAction(state, actingPlayer, rng);
}

function runGame(
  seed: number,
  deck1: DeckConfig,
  deck2: DeckConfig,
  policy1: Policy,
  policy2: Policy,
  startingPlayer: PlayerId,
): { winner: PlayerId; turns: number } {
  const rng = createRNG(seed);
  let state = createInitialGameState({
    ruleset: TIER_CONFIGS.apprentice,
    player1Deck: deck1.cardIds,
    player2Deck: deck2.cardIds,
    rng,
    startingPlayer,
  });

  for (let step = 0; step < MAX_STEPS_PER_GAME; step++) {
    if (state.phase.type === 'game_over') {
      return { winner: state.phase.winner, turns: state.turn };
    }

    const actingPlayer = getActingPlayer(state);
    const policy = actingPlayer === 'player1' ? policy1 : policy2;
    const action = choosePolicyAction(state, actingPlayer, policy, rng);
    const result = reduce(state, action, actingPlayer, rng);
    state = result.newState;
  }

  throw new Error(
    `Policy simulation exceeded ${MAX_STEPS_PER_GAME} steps (${deck1.id}/${policy1} vs ${deck2.id}/${policy2})`,
  );
}

function runPolicyBalanceSuite(): PolicyBalanceSummary {
  if (GAMES_PER_CELL % 2 !== 0) {
    throw new Error('GAMES_PER_CELL must be even to pair seeds across starting players');
  }

  const decks = buildAlliedDecks();
  const cells: Record<string, CellResult> = {};

  const deckWins = Object.fromEntries(decks.map((deck) => [deck.id, 0])) as Record<AlliedDeckId, number>;
  const deckGames = Object.fromEntries(decks.map((deck) => [deck.id, 0])) as Record<AlliedDeckId, number>;
  const policyWins: Record<Policy, number> = { heuristic: 0, tempo: 0 };
  const policyGames: Record<Policy, number> = { heuristic: 0, tempo: 0 };

  let firstPlayerWins = 0;
  let totalGames = 0;

  for (const deck1 of decks) {
    for (const deck2 of decks) {
      for (const policy1 of POLICIES) {
        for (const policy2 of POLICIES) {
          let p1Wins = 0;
          let p2Wins = 0;
          let totalTurns = 0;

          for (let i = 0; i < GAMES_PER_CELL / 2; i++) {
            const seed = 700_000
              + i
              + deck1.id.charCodeAt(0) * 13
              + deck2.id.charCodeAt(0) * 29
              + policy1.charCodeAt(0) * 37
              + policy2.charCodeAt(0) * 41;

            for (const startingPlayer of ['player1', 'player2'] as PlayerId[]) {
              const game = runGame(seed, deck1, deck2, policy1, policy2, startingPlayer);
              totalTurns += game.turns;

              if (game.winner === 'player1') {
                p1Wins += 1;
                deckWins[deck1.id] += 1;
                policyWins[policy1] += 1;
              } else {
                p2Wins += 1;
                deckWins[deck2.id] += 1;
                policyWins[policy2] += 1;
              }

              deckGames[deck1.id] += 1;
              deckGames[deck2.id] += 1;
              policyGames[policy1] += 1;
              policyGames[policy2] += 1;

              if (game.winner === startingPlayer) {
                firstPlayerWins += 1;
              }
              totalGames += 1;
            }
          }

          cells[`${deck1.id}/${policy1}_vs_${deck2.id}/${policy2}`] = {
            p1Wins,
            p2Wins,
            avgTurns: Number((totalTurns / GAMES_PER_CELL).toFixed(2)),
          };
        }
      }
    }
  }

  const deckWinRate = Object.fromEntries(
    Object.entries(deckWins).map(([deckId, wins]) => [
      deckId,
      Number((wins / deckGames[deckId as AlliedDeckId]).toFixed(3)),
    ]),
  ) as Record<AlliedDeckId, number>;

  const policyWinRate: Record<Policy, number> = {
    heuristic: Number((policyWins.heuristic / policyGames.heuristic).toFixed(3)),
    tempo: Number((policyWins.tempo / policyGames.tempo).toFixed(3)),
  };

  return {
    cells,
    deckWinRate,
    policyWinRate,
    firstPlayerWinRate: Number((firstPlayerWins / totalGames).toFixed(3)),
  };
}

let summary: PolicyBalanceSummary;

beforeAll(() => {
  summary = runPolicyBalanceSuite();
  if (import.meta.env['BALANCE_DEBUG_POLICIES'] === '1') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2));
  }
});

describe('policy-aware allied balance simulations', () => {
  it('keeps first-player edge within guardrails across policy matchups', () => {
    expect(summary.firstPlayerWinRate).toBeGreaterThanOrEqual(MIN_FIRST_PLAYER_WIN_RATE);
    expect(summary.firstPlayerWinRate).toBeLessThanOrEqual(MAX_FIRST_PLAYER_WIN_RATE);
  });

  it('keeps allied deck aggregate win rates within guardrails', () => {
    for (const rate of Object.values(summary.deckWinRate)) {
      expect(rate).toBeGreaterThanOrEqual(MIN_DECK_WIN_RATE);
      expect(rate).toBeLessThanOrEqual(MAX_DECK_WIN_RATE);
    }
  });

  it('keeps policy aggregate win rates within guardrails', () => {
    for (const rate of Object.values(summary.policyWinRate)) {
      expect(rate).toBeGreaterThanOrEqual(MIN_POLICY_WIN_RATE);
      expect(rate).toBeLessThanOrEqual(MAX_POLICY_WIN_RATE);
    }
  });

  it('keeps policy matchup lengths within bounds', () => {
    for (const cell of Object.values(summary.cells)) {
      expect(cell.avgTurns).toBeGreaterThanOrEqual(MIN_AVG_TURNS);
      expect(cell.avgTurns).toBeLessThanOrEqual(MAX_AVG_TURNS);
    }
  });
});
