import { describe, it, expect } from 'vitest';
import type { GameEvent } from '@engine/types';
import { groupEventsIntoSteps } from './animationStore';

const pos = (x = 100, y = 100) => ({ x, y, width: 80, height: 120 });

describe('groupEventsIntoSteps (combat)', () => {
  it('emits combat strike movement effects for blocked exchanges', () => {
    const attackerId = 'perm-attacker';
    const blockerId = 'perm-blocker';
    const positions = new Map([
      [attackerId, pos(100, 220)],
      [blockerId, pos(250, 140)],
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
          && effect.to.x === 100,
      ),
    ).toBe(true);
  });
});

describe('groupEventsIntoSteps (auto-skipped blockers)', () => {
  it('creates separate staggered steps per attacker when blockers are auto-skipped', () => {
    const attacker1 = 'perm-a1';
    const attacker2 = 'perm-a2';
    const positions = new Map([
      [attacker1, pos(100, 300)],
      [attacker2, pos(200, 300)],
      ['player:player2', { x: 400, y: 50, width: 56, height: 56 }],
    ]);

    const events: GameEvent[] = [
      { type: 'CREATURE_TAPPED', permanentId: attacker1 },
      { type: 'CREATURE_TAPPED', permanentId: attacker2 },
      { type: 'ATTACKERS_DECLARED', attackerIds: [attacker1, attacker2] },
      { type: 'PLAYER_DAMAGED', player: 'player2', amount: 3, source: attacker1 },
      { type: 'PLAYER_DAMAGED', player: 'player2', amount: 2, source: attacker2 },
    ];

    const steps = groupEventsIntoSteps(events, positions);

    // Should have 2 separate combat exchange steps (one per attacker), NOT a single step
    const exchangeSteps = steps.filter((s) =>
      s.effects.some((e) => e.type === 'combat_strike' || e.type === 'player_damage'),
    );
    expect(exchangeSteps).toHaveLength(2);
  });
});

describe('groupEventsIntoSteps (spells)', () => {
  it('produces spell_impact effects at target positions', () => {
    const targetId = 'perm-target';
    const positions = new Map([[targetId, pos()]]);

    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', player: 'player2', cardId: 'fire_fireball' },
      { type: 'SPELL_RESOLVED', cardId: 'fire_fireball', targets: [{ type: 'creature', permanentId: targetId }] },
      { type: 'DAMAGE_DEALT', targetId, amount: 3, source: 'spell' },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const allEffects = steps.flatMap((s) => s.effects);

    expect(allEffects.some((e) => e.type === 'spell_impact')).toBe(true);
    expect(allEffects.some((e) => e.type === 'damage')).toBe(true);
    // groupEventsIntoSteps should NOT produce card_reveal — that is handled by dispatchWithAnimations
    expect(allEffects.some((e) => e.type === 'card_reveal')).toBe(false);
  });

  it('produces no steps when spell target has no registered position', () => {
    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', player: 'player2', cardId: 'fire_fireball' },
      { type: 'SPELL_RESOLVED', cardId: 'fire_fireball', targets: [{ type: 'creature', permanentId: 'missing' }] },
    ];

    const steps = groupEventsIntoSteps(events, new Map());
    expect(steps).toHaveLength(0);
  });
});

describe('groupEventsIntoSteps (summon)', () => {
  it('produces summon effect for creature entering the board', () => {
    const permanentId = 'perm-new';
    const positions = new Map([[permanentId, pos()]]);

    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', player: 'player1', cardId: 'fire_ember_sprite' },
      { type: 'CREATURE_ENTERED', permanentId, slot: 0 },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const allEffects = steps.flatMap((s) => s.effects);

    expect(allEffects).toHaveLength(1);
    expect(allEffects[0].type).toBe('summon');
    // No card_reveal from grouping
    expect(allEffects.some((e) => e.type === 'card_reveal')).toBe(false);
  });

  it('produces summon + keyword + damage effects for ETB creature', () => {
    const permanentId = 'perm-blast';
    const targetId = 'perm-enemy';
    const positions = new Map([
      [permanentId, pos(100, 200)],
      [targetId, pos(300, 200)],
    ]);

    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', player: 'player1', cardId: 'fire_ember_sprite' },
      { type: 'CREATURE_ENTERED', permanentId, slot: 0 },
      { type: 'KEYWORD_TRIGGERED', keyword: 'blast', permanentId },
      { type: 'DAMAGE_DEALT', targetId, amount: 1, source: permanentId },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const allEffects = steps.flatMap((s) => s.effects);

    expect(allEffects.some((e) => e.type === 'summon')).toBe(true);
    expect(allEffects.some((e) => e.type === 'keyword')).toBe(true);
    expect(allEffects.some((e) => e.type === 'damage')).toBe(true);
    expect(allEffects.some((e) => e.type === 'card_reveal')).toBe(false);
  });
});
