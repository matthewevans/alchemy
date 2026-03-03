import { describe, it, expect, beforeEach } from 'vitest';
import { sortCreaturesForBlockers } from '../blockerSorting';
import { makePermanent, resetTestCounters } from '@engine/__tests__/__fixtures__/testHelpers';

describe('sortCreaturesForBlockers', () => {
  beforeEach(() => resetTestCounters());

  it('returns original order when no blockers assigned', () => {
    const a = makePermanent('card_a', 'player1', { permanentId: 'a' });
    const b = makePermanent('card_b', 'player1', { permanentId: 'b' });
    const c = makePermanent('card_c', 'player1', { permanentId: 'c' });

    const result = sortCreaturesForBlockers([a, b, c], [], [], {});
    expect(result).toEqual([a, b, c]);
  });

  // Reproduction of the user-reported bug:
  // Board: [treant_sapling(0), mountain_giant(1), tempest_eagle(2)]
  // Opponent: [dragon_whelp(0, attacker), magma_golem(1)]
  // mountain_giant blocks dragon_whelp
  // Expected: mountain_giant moves to position 0 (opposite dragon_whelp)
  it('moves single blocker opposite its assigned attacker', () => {
    const treant = makePermanent('earth_treant_sapling', 'player1', {
      permanentId: 'p1:earth_treant_sapling#0',
    });
    const giant = makePermanent('earth_mountain_giant', 'player1', {
      permanentId: 'p1:earth_mountain_giant#0',
    });
    const eagle = makePermanent('air_tempest_eagle', 'player1', {
      permanentId: 'p1:air_tempest_eagle#0',
    });

    const dragonWhelp = makePermanent('fire_dragon_whelp', 'player2', {
      permanentId: 'p2:fire_dragon_whelp#0',
    });
    const magmaGolem = makePermanent('fire_magma_golem', 'player2', {
      permanentId: 'p2:fire_magma_golem#1',
    });

    const result = sortCreaturesForBlockers(
      [treant, giant, eagle],
      [dragonWhelp, magmaGolem],
      ['p2:fire_dragon_whelp#0'],
      { 'p1:earth_mountain_giant#0': 'p2:fire_dragon_whelp#0' },
    );

    expect(result.map((c) => c.permanentId)).toEqual([
      'p1:earth_mountain_giant#0', // blocker → opposite attacker at col 0
      'p1:earth_treant_sapling#0', // non-blocker preserves original order
      'p1:air_tempest_eagle#0',    // non-blocker preserves original order
    ]);
  });

  it('sorts multiple blockers by their attacker column', () => {
    const a = makePermanent('c1', 'player1', { permanentId: 'blocker_a' });
    const b = makePermanent('c2', 'player1', { permanentId: 'blocker_b' });
    const c = makePermanent('c3', 'player1', { permanentId: 'non_blocker' });

    // Opponent row: [atk_left(0), filler(1), atk_right(2)]
    const atkLeft = makePermanent('x', 'player2', { permanentId: 'atk_left' });
    const filler = makePermanent('x', 'player2', { permanentId: 'filler' });
    const atkRight = makePermanent('x', 'player2', { permanentId: 'atk_right' });

    // blocker_a blocks atk_right (col 2), blocker_b blocks atk_left (col 0)
    const result = sortCreaturesForBlockers(
      [a, b, c],
      [atkLeft, filler, atkRight],
      ['atk_left', 'atk_right'],
      { blocker_a: 'atk_right', blocker_b: 'atk_left' },
    );

    expect(result.map((c) => c.permanentId)).toEqual([
      'blocker_b',    // blocks atk_left (col 0) → comes first
      'blocker_a',    // blocks atk_right (col 2) → comes second
      'non_blocker',  // unassigned → appended
    ]);
  });

  it('handles multiple blockers on the same attacker (preserves relative order)', () => {
    const a = makePermanent('c1', 'player1', { permanentId: 'first_blocker' });
    const b = makePermanent('c2', 'player1', { permanentId: 'second_blocker' });

    const atk = makePermanent('x', 'player2', { permanentId: 'attacker' });

    const result = sortCreaturesForBlockers(
      [a, b],
      [atk],
      ['attacker'],
      { first_blocker: 'attacker', second_blocker: 'attacker' },
    );

    // Both block same attacker → stable sort preserves original order
    expect(result.map((c) => c.permanentId)).toEqual([
      'first_blocker',
      'second_blocker',
    ]);
  });

  it('respects explicit attacker blocker order when provided', () => {
    const a = makePermanent('c1', 'player1', { permanentId: 'first_blocker' });
    const b = makePermanent('c2', 'player1', { permanentId: 'second_blocker' });
    const atk = makePermanent('x', 'player2', { permanentId: 'attacker' });

    const result = sortCreaturesForBlockers(
      [a, b],
      [atk],
      ['attacker'],
      { first_blocker: 'attacker', second_blocker: 'attacker' },
      { attacker: ['second_blocker', 'first_blocker'] },
    );

    expect(result.map((c) => c.permanentId)).toEqual([
      'second_blocker',
      'first_blocker',
    ]);
  });
});
