import { describe, it, expect, beforeEach } from 'vitest';
import { getAutoAction } from '../useGameLoop';
import { enumerateLegalActions } from '@engine/validation';
import {
  createTestGameState,
  makePermanent,
  makeCardInstance,
  resetTestCounters,
} from '@engine/__tests__/__fixtures__/testHelpers';

/** Helper: build state + legal actions, then ask getAutoAction what to do. */
function autoAction(
  ...args: Parameters<typeof createTestGameState>
) {
  const state = createTestGameState(...args);
  const legalActions = enumerateLegalActions(state, 'player1');
  return getAutoAction(state, legalActions, 'player1');
}

describe('getAutoAction', () => {
  beforeEach(resetTestCounters);

  // ─── Auto-advance phases ───

  describe('draw / energy / end phases', () => {
    it.each(['draw', 'energy', 'end'] as const)(
      '%s phase → ADVANCE_PHASE at 300ms',
      (phaseType) => {
        const result = autoAction({ phase: { type: phaseType } });
        expect(result).toEqual({ action: { type: 'ADVANCE_PHASE' }, delay: 300 });
      },
    );

    it.each(['draw', 'energy', 'end'] as const)(
      '%s phase returns null when it is the opponent turn',
      (phaseType) => {
        const result = autoAction({
          phase: { type: phaseType },
          activePlayer: 'player2',
        });
        expect(result).toBeNull();
      },
    );
  });

  // ─── Battle phase: attacker auto-skip ───

  describe('battle / declare_attackers', () => {
    it('returns CONFIRM_ATTACKERS when no valid attackers exist', () => {
      const result = autoAction({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
      });
      expect(result).toEqual({ action: { type: 'CONFIRM_ATTACKERS' }, delay: 200 });
    });

    it('returns null when valid attackers exist', () => {
      const result = autoAction({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
        player1: {
          board: [
            makePermanent('fire_lava_hound', 'player1', {
              attack: 2,
              health: 3,
              isTapped: false,
              summonedThisTurn: false,
            }),
            null, null, null, null,
          ],
        },
      });
      expect(result).toBeNull();
    });

    it('returns CONFIRM_ATTACKERS when all creatures are tapped', () => {
      const result = autoAction({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
        player1: {
          board: [
            makePermanent('fire_ember_sprite', 'player1', { isTapped: true }),
            null, null, null, null,
          ],
        },
      });
      expect(result).toEqual({ action: { type: 'CONFIRM_ATTACKERS' }, delay: 200 });
    });

    it('returns CONFIRM_ATTACKERS when all creatures have summoning sickness', () => {
      const result = autoAction({
        phase: { type: 'battle', step: 'declare_attackers', tentativeAttackers: [] },
        player1: {
          board: [
            makePermanent('fire_lava_hound', 'player1', { summonedThisTurn: true }),
            null, null, null, null,
          ],
        },
      });
      expect(result).toEqual({ action: { type: 'CONFIRM_ATTACKERS' }, delay: 200 });
    });
  });

  // ─── Play phase: auto-skip when nothing playable ───

  describe('play phase', () => {
    it('returns ADVANCE_PHASE when hand is empty', () => {
      const result = autoAction({
        phase: { type: 'play' },
        player1: { hand: [], currentEnergy: 5, maxEnergy: 5 },
      });
      expect(result).toEqual({ action: { type: 'ADVANCE_PHASE' }, delay: 200 });
    });

    it('returns null when a card is affordable', () => {
      const result = autoAction({
        phase: { type: 'play' },
        player1: {
          hand: [makeCardInstance('fire_ember_sprite')],
          currentEnergy: 1,
          maxEnergy: 1,
        },
      });
      expect(result).toBeNull();
    });

    it('returns ADVANCE_PHASE for postCombat play with no playable cards', () => {
      const result = autoAction({
        phase: { type: 'play', postCombat: true },
        player1: { hand: [], currentEnergy: 0, maxEnergy: 1 },
      });
      expect(result).toEqual({ action: { type: 'ADVANCE_PHASE' }, delay: 200 });
    });
  });

  // ─── Phases that always return null (human decision required) ───

  describe('phases requiring human input', () => {
    it('targeting → null', () => {
      const result = autoAction({
        phase: {
          type: 'targeting',
          effectId: 'fire_bolt',
          casterId: 'player1',
          sourceCardId: 'fire_bolt',
          validTargets: [],
        },
      });
      expect(result).toBeNull();
    });

    it('mulligan → null', () => {
      const state = createTestGameState({
        phase: { type: 'mulligan', player: 'player1' },
      });
      const legalActions = enumerateLegalActions(state, 'player1');
      expect(getAutoAction(state, legalActions, 'player1')).toBeNull();
    });

    it('game_over → null (early return in tick, but getAutoAction handles it too)', () => {
      const state = createTestGameState({
        phase: { type: 'game_over', winner: 'player1' },
      });
      // game_over has no legal actions
      expect(getAutoAction(state, [], 'player1')).toBeNull();
    });
  });
});
