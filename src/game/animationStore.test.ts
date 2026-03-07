import { describe, it, expect, beforeEach } from 'vitest';
import type { GameEvent } from '@engine/types';
import { groupEventsIntoSteps, useAnimationStore } from './animationStore';
import type { AnimationEffect } from './animationStore';

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

  it('groups multi-block combat into one simultaneous exchange per blocker', () => {
    const attackerId = 'perm-attacker';
    const blockerAId = 'perm-blocker-a';
    const blockerBId = 'perm-blocker-b';
    const positions = new Map([
      [attackerId, pos(140, 220)],
      [blockerAId, pos(250, 140)],
      [blockerBId, pos(360, 140)],
    ]);

    const events: GameEvent[] = [
      {
        type: 'BLOCKERS_DECLARED',
        assignments: {
          [blockerAId]: attackerId,
          [blockerBId]: attackerId,
        },
      },
      { type: 'DAMAGE_DEALT', targetId: blockerAId, amount: 3, source: attackerId },
      { type: 'DAMAGE_DEALT', targetId: blockerBId, amount: 1, source: attackerId },
      { type: 'DAMAGE_DEALT', targetId: attackerId, amount: 2, source: blockerAId },
      { type: 'DAMAGE_DEALT', targetId: attackerId, amount: 1, source: blockerBId },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const exchangeSteps = steps.filter((step) =>
      step.effects.some((effect) => effect.type === 'combat_strike' || effect.type === 'damage'),
    );

    expect(exchangeSteps).toHaveLength(2);

    const firstStepStrikes = exchangeSteps[0].effects.filter(
      (effect): effect is Extract<AnimationEffect, { type: 'combat_strike' }> => effect.type === 'combat_strike',
    );
    expect(firstStepStrikes).toHaveLength(2);
    expect(firstStepStrikes.some((effect) => effect.sourceId === attackerId && effect.targetId === blockerAId)).toBe(true);
    expect(firstStepStrikes.some((effect) => effect.sourceId === blockerAId && effect.targetId === attackerId)).toBe(true);

    const secondStepStrikes = exchangeSteps[1].effects.filter(
      (effect): effect is Extract<AnimationEffect, { type: 'combat_strike' }> => effect.type === 'combat_strike',
    );
    expect(secondStepStrikes).toHaveLength(2);
    expect(secondStepStrikes.some((effect) => effect.sourceId === attackerId && effect.targetId === blockerBId)).toBe(true);
    expect(secondStepStrikes.some((effect) => effect.sourceId === blockerBId && effect.targetId === attackerId)).toBe(true);
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

  it('marks spell impacts as healing when heal events are present', () => {
    const targetId = 'perm-target';
    const positions = new Map([
      [targetId, pos()],
      ['player:player2', { x: 380, y: 80, width: 56, height: 56 }],
    ]);

    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', player: 'player2', cardId: 'water_healing_rain' },
      { type: 'SPELL_RESOLVED', cardId: 'water_healing_rain', targets: [{ type: 'player', playerId: 'player2' }] },
      { type: 'PLAYER_HEALED', player: 'player2', amount: 4 },
    ];

    const steps = groupEventsIntoSteps(events, positions);
    const spellImpacts = steps
      .flatMap((s) => s.effects)
      .filter((e) => e.type === 'spell_impact');

    expect(spellImpacts).toHaveLength(1);
    expect(spellImpacts[0]?.type === 'spell_impact' && spellImpacts[0].isHealing).toBe(true);
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

describe('groupEventsIntoSteps (spell + combat priority)', () => {
  it('splits spell resolution and combat damage into separate animation groups', () => {
    const attackerId = 'perm-attacker';
    const blockerId = 'perm-blocker';
    const spellTargetId = 'perm-spell-target';
    const positions = new Map([
      [attackerId, pos(100, 300)],
      [blockerId, pos(250, 140)],
      [spellTargetId, pos(350, 140)],
      ['player:player2', { x: 400, y: 50, width: 56, height: 56 }],
    ]);

    // Events as produced by autoAdvanceCombatPriority when an instant resolves
    // during combat_priority, then combat resolves via closePriorityWindow.
    const events: GameEvent[] = [
      // Spell resolution events (from resolveTopPriorityStackSpell)
      { type: 'DAMAGE_DEALT', targetId: spellTargetId, amount: 2, source: 'spell' },
      { type: 'SPELL_RESOLVED', cardId: 'fire_fireball', targets: [{ type: 'creature', permanentId: spellTargetId }] },
      // Combat resolution events (from closePriorityWindow → resolveCombat)
      { type: 'DAMAGE_DEALT', targetId: blockerId, amount: 3, source: attackerId },
      { type: 'DAMAGE_DEALT', targetId: attackerId, amount: 2, source: blockerId },
    ];

    const steps = groupEventsIntoSteps(events, positions);

    // Should produce spell step(s) THEN combat step(s), not one merged step
    expect(steps.length).toBeGreaterThanOrEqual(2);

    // First step should be spell effects (spell_impact + damage)
    const spellStep = steps[0];
    expect(spellStep.effects.some((e) => e.type === 'spell_impact')).toBe(true);

    // Later step(s) should be combat effects (combat_strike + damage)
    const combatSteps = steps.slice(1);
    const combatEffects = combatSteps.flatMap((s) => s.effects);
    expect(combatEffects.some((e) => e.type === 'combat_strike')).toBe(true);
    expect(combatEffects.some((e) => e.type === 'damage')).toBe(true);
  });

  it('handles unblocked combat after spell resolution', () => {
    const attackerId = 'perm-attacker';
    const spellTargetId = 'perm-spell-target';
    const positions = new Map([
      [attackerId, pos(100, 300)],
      [spellTargetId, pos(350, 140)],
      ['player:player2', { x: 400, y: 50, width: 56, height: 56 }],
    ]);

    const events: GameEvent[] = [
      // Spell
      { type: 'DAMAGE_DEALT', targetId: spellTargetId, amount: 2, source: 'spell' },
      { type: 'CREATURE_DIED', permanentId: spellTargetId, cardId: 'fire_ember_sprite' },
      { type: 'SPELL_RESOLVED', cardId: 'fire_fireball', targets: [{ type: 'creature', permanentId: spellTargetId }] },
      // Combat — unblocked attacker hits player
      { type: 'PLAYER_DAMAGED', player: 'player2', amount: 4, source: attackerId },
    ];

    const steps = groupEventsIntoSteps(events, positions);

    expect(steps.length).toBeGreaterThanOrEqual(2);

    // Spell step should include death from spell
    const spellStep = steps[0];
    const spellEffectTypes = spellStep.effects.map((e) => e.type);
    expect(spellEffectTypes).toContain('spell_impact');

    // Combat step should include player damage
    const combatSteps = steps.slice(1);
    const combatEffects = combatSteps.flatMap((s) => s.effects);
    expect(combatEffects.some((e) => e.type === 'player_damage')).toBe(true);
  });

  it('still routes pure spell events normally (no combat damage)', () => {
    const targetId = 'perm-target';
    const positions = new Map([[targetId, pos()]]);

    const events: GameEvent[] = [
      { type: 'DAMAGE_DEALT', targetId, amount: 3, source: 'spell' },
      { type: 'SPELL_RESOLVED', cardId: 'fire_fireball', targets: [{ type: 'creature', permanentId: targetId }] },
    ];

    const steps = groupEventsIntoSteps(events, positions);

    // Should produce a single spell step — not split
    expect(steps).toHaveLength(1);
    expect(steps[0].effects.some((e) => e.type === 'spell_impact')).toBe(true);
  });
});

describe('displayHealth — per-step health updates', () => {
  beforeEach(() => {
    useAnimationStore.getState().clear();
  });

  it('applies player_damage deltas as each step becomes active', () => {
    const store = useAnimationStore.getState();

    // Set initial display health (pre-dispatch snapshot)
    store.setDisplayHealth({ player1: 20, player2: 20 });

    // Enqueue two combat steps — attacker A deals 3, attacker B deals 2
    store.enqueueSteps([
      {
        effects: [{ type: 'player_damage', player: 'player2', amount: 3, position: pos() }],
        durationMs: 1000,
      },
      {
        effects: [{ type: 'player_damage', player: 'player2', amount: 2, position: pos() }],
        durationMs: 1000,
      },
    ]);

    // First step is active — its delta applied: 20 - 3 = 17
    expect(useAnimationStore.getState().displayHealth).toEqual({ player1: 20, player2: 17 });

    // Advance to second step — its delta applied: 17 - 2 = 15
    useAnimationStore.getState().advanceStep();
    expect(useAnimationStore.getState().displayHealth).toEqual({ player1: 20, player2: 15 });

    // Advance past last step — displayHealth cleared
    useAnimationStore.getState().advanceStep();
    expect(useAnimationStore.getState().displayHealth).toBeNull();
  });

  it('handles player_heal effects alongside damage', () => {
    const store = useAnimationStore.getState();
    store.setDisplayHealth({ player1: 15, player2: 18 });

    store.enqueueSteps([
      {
        effects: [
          { type: 'player_damage', player: 'player2', amount: 4, position: pos() },
          { type: 'player_heal', player: 'player1', amount: 2, position: pos() },
        ],
        durationMs: 1000,
      },
    ]);

    expect(useAnimationStore.getState().displayHealth).toEqual({ player1: 17, player2: 14 });
  });

  it('does not apply deltas when displayHealth is null', () => {
    // No setDisplayHealth — steps without health overlay should not crash
    useAnimationStore.getState().enqueueSteps([
      {
        effects: [{ type: 'player_damage', player: 'player2', amount: 5, position: pos() }],
        durationMs: 1000,
      },
    ]);

    expect(useAnimationStore.getState().displayHealth).toBeNull();
  });
});
