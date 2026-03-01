import { describe, it, expect } from 'vitest';
import type { GameEvent } from '@engine/types';
import { groupEventsIntoSteps } from './animationStore';

describe('groupEventsIntoSteps (combat)', () => {
  it('emits combat strike movement effects for blocked exchanges', () => {
    const attackerId = 'perm-attacker';
    const blockerId = 'perm-blocker';
    const positions = new Map([
      [attackerId, { x: 100, y: 220, width: 80, height: 120 }],
      [blockerId, { x: 250, y: 140, width: 80, height: 120 }],
      ['player:player2', { x: 380, y: 80, width: 56, height: 56 }],
    ]);

    const events: GameEvent[] = [
      { type: 'BLOCKERS_DECLARED', assignments: { [blockerId]: attackerId } },
      { type: 'DAMAGE_DEALT', targetId: blockerId, amount: 3, source: attackerId },
      { type: 'DAMAGE_DEALT', targetId: attackerId, amount: 2, source: blockerId },
      { type: 'PLAYER_DAMAGED', player: 'player2', amount: 1, source: attackerId },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const strikeEffects = steps
      .flatMap((step) => step.effects)
      .filter((effect) => effect.type === 'combat_strike');
    const blockEffects = steps
      .flatMap((step) => step.effects)
      .filter((effect) => effect.type === 'block_link');

    expect(blockEffects).toHaveLength(1);
    expect(strikeEffects).toHaveLength(3);
    expect(
      strikeEffects.some(
        (effect) =>
          effect.type === 'combat_strike'
          && effect.sourceId === blockerId
          && effect.to.x === positions.get(attackerId)!.x,
      ),
    ).toBe(true);
  });
});
