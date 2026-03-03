import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CARD_REGISTRY } from '@engine/cards';
import type { Element, GameEvent, Keyword, Permanent, PlayerId } from '@engine/types';
import type { CombatEquation } from './combatMath';

// ─── Types ───

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnimationEffect =
  | {
      type: 'block_link';
      blockerId: string;
      attackerId: string;
      from: ElementPosition;
      to: ElementPosition;
    }
  | {
      type: 'combat_strike';
      sourceId: string;
      targetId: string;
      from: ElementPosition;
      to: ElementPosition;
      element?: Element;
      soundId?: string;
    }
  | { type: 'damage'; targetId: string; amount: number; position: ElementPosition }
  | { type: 'heal'; targetId: string; amount: number; position: ElementPosition }
  | { type: 'player_damage'; player: PlayerId; amount: number; position: ElementPosition }
  | { type: 'player_heal'; player: PlayerId; amount: number; position: ElementPosition }
  | { type: 'death'; permanentId: string; position: ElementPosition; element?: Element; soundId?: string }
  | { type: 'bounce'; permanentId: string; position: ElementPosition; element?: Element }
  | { type: 'spell_impact'; position: ElementPosition; element?: Element; soundId?: string; isHealing?: boolean }
  | { type: 'keyword'; permanentId: string; keyword: Keyword; position: ElementPosition; element?: Element }
  | { type: 'summon'; permanentId: string; position: ElementPosition; element?: Element; soundId?: string }
  | { type: 'card_reveal'; cardId: string }
  | { type: 'combat_math'; equation: CombatEquation; attackerPos: ElementPosition; targetPos: ElementPosition };

export interface AnimationStep {
  effects: AnimationEffect[];
  durationMs: number;
  /** Screen shake intensity: 1=light, 2=medium, 3=heavy */
  shakeIntensity?: number;
}

// ─── Position Registry ───
// Mutable module-level Map — not in Zustand because positions are only read
// imperatively in dispatchWithAnimations (never subscribed to reactively).
// This avoids cloning the entire Map on every ResizeObserver callback.

const positionRegistry = new Map<string, ElementPosition>();

/** Tracks which component instance last registered each position (prevents AnimatePresence exit cleanup races). */
const positionOwners = new Map<string, object>();

export function registerPosition(id: string, pos: ElementPosition, ownerToken?: object) {
  positionRegistry.set(id, pos);
  if (ownerToken) positionOwners.set(id, ownerToken);
}

export function unregisterPosition(id: string, ownerToken?: object) {
  // If a token is provided, only remove if we still own the entry.
  // This prevents an exiting AnimatePresence component from removing
  // a position that a newly-mounted component has already registered.
  if (ownerToken && positionOwners.get(id) !== ownerToken) return;
  positionRegistry.delete(id);
  positionOwners.delete(id);
}

export function getPositions(): Map<string, ElementPosition> {
  return positionRegistry;
}

// ─── Store ───

/** Pre-dispatch board state preserved so dying creatures remain visible during combat animations. */
export type BoardSnapshot = Record<PlayerId, (Permanent | null)[]>;

interface AnimationStore {
  queue: AnimationStep[];
  activeStep: AnimationStep | null;
  isAnimating: boolean;
  speedMultiplier: number;
  boardSnapshot: BoardSnapshot | null;
  /** Intermediate health values shown during animations so damage/healing appears per-step, not all at once. */
  displayHealth: Record<PlayerId, number> | null;
  /** Health values before the current step was applied (for equation overlays). */
  previousDisplayHealth: Record<PlayerId, number> | null;
  /** Intermediate creature damage shown during combat animations so health updates per-exchange, not all at once. */
  displayCreatureDamage: Record<string, number> | null;
  /** Creature damage values before the current step was applied (for equation overlays). */
  previousDisplayCreatureDamage: Record<string, number> | null;

  setSpeedMultiplier: (m: number) => void;
  enqueueSteps: (steps: AnimationStep[]) => void;
  advanceStep: () => void;
  setBoardSnapshot: (snapshot: BoardSnapshot | null) => void;
  setDisplayHealth: (health: Record<PlayerId, number>) => void;
  setDisplayCreatureDamage: (damage: Record<string, number>) => void;
  clear: () => void;
}

export const useAnimationStore = create<AnimationStore>()(
  subscribeWithSelector((set, get) => ({
    queue: [],
    activeStep: null,
    isAnimating: false,
    speedMultiplier: 1,
    boardSnapshot: null,
    displayHealth: null,
    previousDisplayHealth: null,
    displayCreatureDamage: null,
    previousDisplayCreatureDamage: null,

    setSpeedMultiplier: (m) => set({ speedMultiplier: m }),

    enqueueSteps: (steps) => {
      if (steps.length === 0) return;

      const { activeStep, queue, speedMultiplier } = get();
      const scaled = speedMultiplier === 1
        ? steps
        : steps.map((s) => ({ ...s, durationMs: Math.round(s.durationMs * speedMultiplier) }));

      if (activeStep) {
        set({ queue: [...queue, ...scaled] });
      } else {
        const [first, ...rest] = scaled;
        const dh = get().displayHealth;
        const dcd = get().displayCreatureDamage;
        const previousHealth = dh ? { ...dh } : null;
        const previousCreatureDamage = dcd ? { ...dcd } : null;
        set({
          activeStep: first,
          queue: rest,
          isAnimating: true,
          previousDisplayHealth: previousHealth,
          displayHealth: dh ? applyStepHealthDeltas(dh, first) : null,
          previousDisplayCreatureDamage: previousCreatureDamage,
          displayCreatureDamage: dcd ? applyStepCreatureDamage(dcd, first) : null,
        });
      }
    },

    advanceStep: () => {
      const { queue, displayHealth, displayCreatureDamage } = get();
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        // Clear snapshot when death step begins — AnimatePresence exit runs alongside death particles
        const hasDeath = next.effects.some((e) => e.type === 'death');
        const previousHealth = displayHealth ? { ...displayHealth } : null;
        const previousCreatureDamage = displayCreatureDamage ? { ...displayCreatureDamage } : null;
        set({
          activeStep: next,
          queue: rest,
          boardSnapshot: hasDeath ? null : get().boardSnapshot,
          previousDisplayHealth: previousHealth,
          displayHealth: displayHealth ? applyStepHealthDeltas(displayHealth, next) : null,
          previousDisplayCreatureDamage: previousCreatureDamage,
          displayCreatureDamage: displayCreatureDamage ? applyStepCreatureDamage(displayCreatureDamage, next) : null,
        });
      } else {
        set({
          activeStep: null,
          isAnimating: false,
          boardSnapshot: null,
          displayHealth: null,
          previousDisplayHealth: null,
          displayCreatureDamage: null,
          previousDisplayCreatureDamage: null,
        });
      }
    },

    setBoardSnapshot: (snapshot) => set({ boardSnapshot: snapshot }),

    setDisplayHealth: (health) => set({ displayHealth: health }),

    setDisplayCreatureDamage: (damage) => set({ displayCreatureDamage: damage }),

    clear: () => {
      set({
        queue: [],
        activeStep: null,
        isAnimating: false,
        boardSnapshot: null,
        displayHealth: null,
        previousDisplayHealth: null,
        displayCreatureDamage: null,
        previousDisplayCreatureDamage: null,
      });
    },
  })),
);

// ─── Health Display Helpers ───

/** Apply player_damage / player_heal deltas from a step to the running display health. */
function applyStepHealthDeltas(
  health: Record<PlayerId, number>,
  step: AnimationStep,
): Record<PlayerId, number> {
  let p1 = health.player1;
  let p2 = health.player2;
  for (const effect of step.effects) {
    if (effect.type === 'player_damage') {
      if (effect.player === 'player1') p1 -= effect.amount;
      else p2 -= effect.amount;
    } else if (effect.type === 'player_heal') {
      if (effect.player === 'player1') p1 += effect.amount;
      else p2 += effect.amount;
    }
  }
  return { player1: p1, player2: p2 };
}

/** Apply creature damage/heal deltas from a step to the running display damage map. */
function applyStepCreatureDamage(
  damage: Record<string, number>,
  step: AnimationStep,
): Record<string, number> {
  let updated: Record<string, number> | null = null;
  for (const effect of step.effects) {
    if (effect.type === 'damage') {
      if (!updated) updated = { ...damage };
      updated[effect.targetId] = (updated[effect.targetId] ?? 0) + effect.amount;
    } else if (effect.type === 'heal') {
      if (!updated) updated = { ...damage };
      updated[effect.targetId] = Math.max(0, (updated[effect.targetId] ?? 0) - effect.amount);
    }
  }
  return updated ?? damage;
}

// ─── Helpers ───

function getCardElement(cardId: string): Element | undefined {
  return CARD_REGISTRY[cardId]?.element;
}

function getCardSoundId(cardId: string): string | undefined {
  return CARD_REGISTRY[cardId]?.soundId;
}

const SHAKE_THRESHOLDS = { heavy: 5, medium: 3 } as const;

function computeShakeIntensity(events: GameEvent[]): number | undefined {
  let totalPlayerDamage = 0;
  for (const e of events) {
    if (e.type === 'PLAYER_DAMAGED') totalPlayerDamage += e.amount;
  }
  if (totalPlayerDamage === 0) return undefined;
  if (totalPlayerDamage >= SHAKE_THRESHOLDS.heavy) return 3;
  if (totalPlayerDamage >= SHAKE_THRESHOLDS.medium) return 2;
  return 1;
}

export const STEP_DURATIONS = {
  blockLink: 600,
  combatExchange: 1200,
  combatMath: 3000,
  death: 900,
  spell: 1200,
  etb: 900,
  standaloneDamage: 800,
  summon: 500,
  cardReveal: 1200,
} as const;

/**
 * Maps common game events (damage, heal, death) to animation effects.
 * Shared by all grouping functions to eliminate duplication.
 */
function mapEventToEffect(
  event: GameEvent,
  positions: Map<string, ElementPosition>,
): AnimationEffect | null {
  switch (event.type) {
    case 'DAMAGE_DEALT': {
      const pos = positions.get(event.targetId);
      return pos ? { type: 'damage', targetId: event.targetId, amount: event.amount, position: pos } : null;
    }
    case 'PLAYER_DAMAGED': {
      const pos = positions.get(`player:${event.player}`);
      return pos ? { type: 'player_damage', player: event.player, amount: event.amount, position: pos } : null;
    }
    case 'CREATURE_HEALED': {
      const pos = positions.get(event.permanentId);
      return pos ? { type: 'heal', targetId: event.permanentId, amount: event.amount, position: pos } : null;
    }
    case 'PLAYER_HEALED': {
      const pos = positions.get(`player:${event.player}`);
      return pos ? { type: 'player_heal', player: event.player, amount: event.amount, position: pos } : null;
    }
    case 'CREATURE_DIED': {
      const pos = positions.get(event.permanentId);
      return pos ? { type: 'death', permanentId: event.permanentId, position: pos, element: getCardElement(event.cardId) } : null;
    }
    case 'CREATURE_BOUNCED': {
      const pos = positions.get(event.permanentId);
      return pos ? { type: 'bounce', permanentId: event.permanentId, position: pos, element: getCardElement(event.cardId) } : null;
    }
    default:
      return null;
  }
}

/** Collect all common effects (damage, heal, death) from an event list. */
function collectCommonEffects(events: GameEvent[], positions: Map<string, ElementPosition>): AnimationEffect[] {
  const effects: AnimationEffect[] = [];
  for (const e of events) {
    const effect = mapEventToEffect(e, positions);
    if (effect) effects.push(effect);
  }
  return effects;
}

// ─── Event Grouping ───

export function groupEventsIntoSteps(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
  /** Maps permanentId → cardId so combat effects can look up the attacker's element. */
  cardIdMap?: Map<string, string>,
): AnimationStep[] {
  const hasBlockersConfirmed = events.some((e) => e.type === 'BLOCKERS_DECLARED');
  const hasAttackersDeclared = events.some((e) => e.type === 'ATTACKERS_DECLARED');
  const hasSpellResolved = events.some((e) => e.type === 'SPELL_RESOLVED');
  const hasKeywordTriggered = events.some((e) => e.type === 'KEYWORD_TRIGGERED');
  const hasCreatureEntered = events.some((e) => e.type === 'CREATURE_ENTERED');
  const hasPlayerDamaged = events.some((e) => e.type === 'PLAYER_DAMAGED');
  const hasDamageDealt = events.some((e) => e.type === 'DAMAGE_DEALT');

  // Route both blocker-confirmed AND auto-skipped-blocker combat through per-attacker grouping
  if (hasBlockersConfirmed || hasAttackersDeclared) return groupCombatEvents(events, positions, cardIdMap);
  if (hasSpellResolved) return groupSpellEvents(events, positions);
  if (hasCreatureEntered && hasKeywordTriggered) return groupETBEvents(events, positions);
  if (hasCreatureEntered) return groupSummonEvents(events, positions);
  if (hasPlayerDamaged || hasDamageDealt) return groupStandaloneDamageEvents(events, positions);
  return [];
}

function groupCombatEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
  cardIdMap?: Map<string, string>,
): AnimationStep[] {
  const blockEffects: AnimationEffect[] = [];
  const damageBySource = new Map<string, GameEvent[]>();
  const deaths: GameEvent[] = [];

  for (const e of events) {
    if (e.type === 'BLOCKERS_DECLARED') {
      for (const [blockerId, attackerId] of Object.entries(e.assignments)) {
        const blockerPos = positions.get(blockerId);
        const attackerPos = positions.get(attackerId);
        if (blockerPos && attackerPos) {
          blockEffects.push({
            type: 'block_link',
            blockerId,
            attackerId,
            from: blockerPos,
            to: attackerPos,
          });
        }
      }
    } else if (e.type === 'DAMAGE_DEALT' || e.type === 'PLAYER_DAMAGED') {
      const source = e.source;
      if (!damageBySource.has(source)) damageBySource.set(source, []);
      damageBySource.get(source)!.push(e);
    } else if (e.type === 'CREATURE_DIED') {
      deaths.push(e);
    }
  }

  const steps: AnimationStep[] = [];

  if (blockEffects.length > 0) {
    steps.push({ effects: blockEffects, durationMs: STEP_DURATIONS.blockLink });
  }

  // One step per attacker's exchange — includes combat strike projectiles
  for (const [, damageEvents] of damageBySource) {
    const effects: AnimationEffect[] = [];

    for (const e of damageEvents) {
      if (e.type === 'DAMAGE_DEALT') {
        const pos = positions.get(e.targetId);
        if (pos) {
          const sourcePos = positions.get(e.source);
          if (sourcePos) {
            const sourceCardId = cardIdMap?.get(e.source);
            effects.push({
              type: 'combat_strike',
              sourceId: e.source,
              targetId: e.targetId,
              from: sourcePos,
              to: pos,
              element: sourceCardId ? getCardElement(sourceCardId) : undefined,
              soundId: sourceCardId ? getCardSoundId(sourceCardId) : undefined,
            });
          }
          effects.push({ type: 'damage', targetId: e.targetId, amount: e.amount, position: pos });
        }
      } else if (e.type === 'PLAYER_DAMAGED') {
        const pos = positions.get(`player:${e.player}`);
        if (pos) {
          const sourcePos = positions.get(e.source);
          if (sourcePos) {
            const sourceCardId = cardIdMap?.get(e.source);
            effects.push({
              type: 'combat_strike',
              sourceId: e.source,
              targetId: `player:${e.player}`,
              from: sourcePos,
              to: pos,
              element: sourceCardId ? getCardElement(sourceCardId) : undefined,
              soundId: sourceCardId ? getCardSoundId(sourceCardId) : undefined,
            });
          }
          effects.push({ type: 'player_damage', player: e.player, amount: e.amount, position: pos });
        }
      }
    }

    if (effects.length > 0) {
      steps.push({
        effects,
        durationMs: STEP_DURATIONS.combatExchange,
        shakeIntensity: computeShakeIntensity(damageEvents),
      });
    }
  }

  // Death step
  const deathEffects = deaths
    .filter((e): e is Extract<GameEvent, { type: 'CREATURE_DIED' }> => e.type === 'CREATURE_DIED')
    .map((e) => {
      const pos = positions.get(e.permanentId);
      return pos ? { type: 'death' as const, permanentId: e.permanentId, position: pos, element: getCardElement(e.cardId), soundId: getCardSoundId(e.cardId) } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (deathEffects.length > 0) {
    steps.push({ effects: deathEffects, durationMs: STEP_DURATIONS.death });
  }

  return steps;
}

function groupSpellEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const effects: AnimationEffect[] = [];
  const hasHealingEvents = events.some((event) => event.type === 'CREATURE_HEALED' || event.type === 'PLAYER_HEALED');

  for (const e of events) {
    if (e.type === 'SPELL_RESOLVED') {
      const spellElement = getCardElement(e.cardId);
      for (const target of e.targets) {
        const key = target.type === 'creature' ? target.permanentId : `player:${target.playerId}`;
        const pos = positions.get(key);
        if (pos) {
          effects.push({
            type: 'spell_impact',
            position: pos,
            element: spellElement,
            soundId: getCardSoundId(e.cardId),
            isHealing: hasHealingEvents,
          });
        }
      }
    } else {
      const effect = mapEventToEffect(e, positions);
      if (effect) effects.push(effect);
    }
  }

  if (effects.length === 0) return [];
  return [{ effects, durationMs: STEP_DURATIONS.spell, shakeIntensity: computeShakeIntensity(events) }];
}

function groupETBEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const effects: AnimationEffect[] = [];

  let etbElement: Element | undefined;
  let etbSoundId: string | undefined;
  for (const e of events) {
    if (e.type === 'CARD_PLAYED' && e.cardId) {
      etbElement = getCardElement(e.cardId);
      etbSoundId = getCardSoundId(e.cardId);
      break;
    }
  }

  for (const e of events) {
    if (e.type === 'CREATURE_ENTERED') {
      const pos = positions.get(e.permanentId);
      if (pos) effects.push({ type: 'summon', permanentId: e.permanentId, position: pos, element: etbElement, soundId: etbSoundId });
    } else if (e.type === 'KEYWORD_TRIGGERED') {
      const pos = positions.get(e.permanentId);
      if (pos) effects.push({ type: 'keyword', permanentId: e.permanentId, keyword: e.keyword, position: pos, element: etbElement });
    } else {
      const effect = mapEventToEffect(e, positions);
      if (effect) effects.push(effect);
    }
  }

  if (effects.length === 0) return [];
  return [{ effects, durationMs: STEP_DURATIONS.etb, shakeIntensity: computeShakeIntensity(events) }];
}

function groupStandaloneDamageEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const effects = collectCommonEffects(events, positions);
  if (effects.length === 0) return [];
  return [{ effects, durationMs: STEP_DURATIONS.standaloneDamage, shakeIntensity: computeShakeIntensity(events) }];
}

function groupSummonEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  let summonElement: Element | undefined;
  let summonSoundId: string | undefined;
  for (const e of events) {
    if (e.type === 'CARD_PLAYED' && e.cardId) {
      summonElement = getCardElement(e.cardId);
      summonSoundId = getCardSoundId(e.cardId);
      break;
    }
  }

  const effects: AnimationEffect[] = [];
  for (const e of events) {
    if (e.type === 'CREATURE_ENTERED') {
      const pos = positions.get(e.permanentId);
      if (pos) effects.push({ type: 'summon', permanentId: e.permanentId, position: pos, element: summonElement, soundId: summonSoundId });
    }
  }

  if (effects.length === 0) return [];
  return [{ effects, durationMs: STEP_DURATIONS.summon }];
}
