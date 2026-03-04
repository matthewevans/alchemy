import { beforeEach, describe, expect, it } from 'vitest';
import { filterAIViableActions } from '../aiActionPolicy';
import type { GameAction } from '../types';
import {
  createTestGameState,
  makeCardInstance,
  makePermanent,
  resetTestCounters,
} from './__fixtures__/testHelpers';

beforeEach(() => {
  resetTestCounters();
});

describe('filterAIViableActions', () => {
  it('always removes CONCEDE', () => {
    const state = createTestGameState();
    const actions: GameAction[] = [{ type: 'CONCEDE' }, { type: 'ADVANCE_PHASE' }];

    const filtered = filterAIViableActions(state, 'player1', actions);
    expect(filtered).toEqual([{ type: 'ADVANCE_PHASE' }]);
  });

  it('removes target-required spell plays when no targets exist', () => {
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        hand: [makeCardInstance('fire_fireball')],
      },
      player1: {
        board: [null, null, null, null, null],
      },
    });

    const actions: GameAction[] = [{ type: 'PLAY_CARD', cardIndex: 0 }, { type: 'ADVANCE_PHASE' }];
    const filtered = filterAIViableActions(state, 'player2', actions);

    expect(filtered).toEqual([{ type: 'ADVANCE_PHASE' }]);
  });

  it('keeps target-required spell plays when valid targets exist', () => {
    const enemy = makePermanent('fire_ember_sprite', 'player1');
    const state = createTestGameState({
      phase: { type: 'play' },
      activePlayer: 'player2',
      player2: {
        hand: [makeCardInstance('fire_fireball')],
      },
      player1: {
        board: [enemy, null, null, null, null],
      },
    });

    const actions: GameAction[] = [{ type: 'PLAY_CARD', cardIndex: 0 }, { type: 'ADVANCE_PHASE' }];
    const filtered = filterAIViableActions(state, 'player2', actions);

    expect(filtered).toContainEqual({ type: 'PLAY_CARD', cardIndex: 0 });
    expect(filtered).toContainEqual({ type: 'ADVANCE_PHASE' });
  });
});
