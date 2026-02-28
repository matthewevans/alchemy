import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameEvent, Keyword, PlayerId } from '@engine/types';

// ─── Types ───

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnimationEffect =
  | { type: 'damage'; targetId: string; amount: number; position: ElementPosition }
  | { type: 'heal'; targetId: string; amount: number; position: ElementPosition }
  | { type: 'player_damage'; player: PlayerId; amount: number; position: ElementPosition }
  | { type: 'player_heal'; player: PlayerId; amount: number; position: ElementPosition }
  | { type: 'death'; permanentId: string; position: ElementPosition }
  | { type: 'spell_impact'; position: ElementPosition }
  | { type: 'keyword'; permanentId: string; keyword: Keyword; position: ElementPosition };

export interface AnimationStep {
  effects: AnimationEffect[];
  durationMs: number;
}

interface AnimationStore {
  positions: Map<string, ElementPosition>;
  queue: AnimationStep[];
  activeStep: AnimationStep | null;
  isAnimating: boolean;

  registerPosition: (id: string, pos: ElementPosition) => void;
  unregisterPosition: (id: string) => void;
  enqueueSteps: (steps: AnimationStep[]) => void;
  advanceStep: () => void;
  clear: () => void;
}

// ─── Store ───

export const useAnimationStore = create<AnimationStore>()(
  subscribeWithSelector((set, get) => ({
    positions: new Map(),
    queue: [],
    activeStep: null,
    isAnimating: false,

    registerPosition: (id, pos) => {
      const positions = new Map(get().positions);
      positions.set(id, pos);
      set({ positions });
    },

    unregisterPosition: (id) => {
      const positions = new Map(get().positions);
      positions.delete(id);
      set({ positions });
    },

    enqueueSteps: (steps) => {
      if (steps.length === 0) return;

      const { activeStep, queue } = get();
      if (activeStep) {
        // Already animating — append to queue
        set({ queue: [...queue, ...steps] });
      } else {
        // Start playing immediately
        const [first, ...rest] = steps;
        set({ activeStep: first, queue: rest, isAnimating: true });
      }
    },

    advanceStep: () => {
      const { queue } = get();
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        set({ activeStep: next, queue: rest });
      } else {
        set({ activeStep: null, isAnimating: false });
      }
    },

    clear: () => {
      set({ queue: [], activeStep: null, isAnimating: false });
    },
  })),
);

// ─── Event Grouping ───

export function groupEventsIntoSteps(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const steps: AnimationStep[] = [];

  // Identify the kind of action that produced these events
  const hasBlockersConfirmed = events.some((e) => e.type === 'BLOCKERS_DECLARED');
  const hasSpellResolved = events.some((e) => e.type === 'SPELL_RESOLVED');
  const hasKeywordTriggered = events.some((e) => e.type === 'KEYWORD_TRIGGERED');
  const hasCreatureEntered = events.some((e) => e.type === 'CREATURE_ENTERED');

  if (hasBlockersConfirmed) {
    // Combat resolution: group damage by attacker source
    return groupCombatEvents(events, positions);
  }

  if (hasSpellResolved) {
    return groupSpellEvents(events, positions);
  }

  if (hasCreatureEntered && hasKeywordTriggered) {
    return groupETBEvents(events, positions);
  }

  return steps;
}

function groupCombatEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  // Group damage events by their source (attacker)
  const damageBySource = new Map<string, GameEvent[]>();
  const deaths: GameEvent[] = [];

  for (const e of events) {
    if (e.type === 'DAMAGE_DEALT' || e.type === 'PLAYER_DAMAGED') {
      const source = e.source;
      if (!damageBySource.has(source)) {
        damageBySource.set(source, []);
      }
      damageBySource.get(source)!.push(e);
    } else if (e.type === 'CREATURE_DIED') {
      deaths.push(e);
    }
  }

  const steps: AnimationStep[] = [];

  // One step per attacker's exchange
  for (const [, damageEvents] of damageBySource) {
    const effects: AnimationEffect[] = [];

    for (const e of damageEvents) {
      if (e.type === 'DAMAGE_DEALT') {
        const pos = positions.get(e.targetId);
        if (pos) {
          effects.push({ type: 'damage', targetId: e.targetId, amount: e.amount, position: pos });
        }
      } else if (e.type === 'PLAYER_DAMAGED') {
        const pos = positions.get(`player:${e.player}`);
        if (pos) {
          effects.push({ type: 'player_damage', player: e.player, amount: e.amount, position: pos });
        }
      }
    }

    if (effects.length > 0) {
      steps.push({ effects, durationMs: 1200 });
    }
  }

  // Death step (if any creatures died)
  if (deaths.length > 0) {
    const deathEffects: AnimationEffect[] = [];
    for (const e of deaths) {
      if (e.type === 'CREATURE_DIED') {
        const pos = positions.get(e.permanentId);
        if (pos) {
          deathEffects.push({ type: 'death', permanentId: e.permanentId, position: pos });
        }
      }
    }
    if (deathEffects.length > 0) {
      steps.push({ effects: deathEffects, durationMs: 800 });
    }
  }

  return steps;
}

function groupSpellEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const effects: AnimationEffect[] = [];

  for (const e of events) {
    if (e.type === 'DAMAGE_DEALT') {
      const pos = positions.get(e.targetId);
      if (pos) {
        effects.push({ type: 'damage', targetId: e.targetId, amount: e.amount, position: pos });
      }
    } else if (e.type === 'PLAYER_DAMAGED') {
      const pos = positions.get(`player:${e.player}`);
      if (pos) {
        effects.push({ type: 'player_damage', player: e.player, amount: e.amount, position: pos });
      }
    } else if (e.type === 'CREATURE_HEALED') {
      const pos = positions.get(e.permanentId);
      if (pos) {
        effects.push({ type: 'heal', targetId: e.permanentId, amount: e.amount, position: pos });
      }
    } else if (e.type === 'PLAYER_HEALED') {
      const pos = positions.get(`player:${e.player}`);
      if (pos) {
        effects.push({ type: 'player_heal', player: e.player, amount: e.amount, position: pos });
      }
    } else if (e.type === 'CREATURE_DIED') {
      const pos = positions.get(e.permanentId);
      if (pos) {
        effects.push({ type: 'death', permanentId: e.permanentId, position: pos });
      }
    } else if (e.type === 'SPELL_RESOLVED') {
      // Show spell impact at the first target's position
      for (const target of e.targets) {
        const key = target.type === 'creature' ? target.permanentId : `player:${target.playerId}`;
        const pos = positions.get(key);
        if (pos) {
          effects.push({ type: 'spell_impact', position: pos });
          break;
        }
      }
    }
  }

  if (effects.length === 0) return [];
  return [{ effects, durationMs: 1000 }];
}

function groupETBEvents(
  events: GameEvent[],
  positions: Map<string, ElementPosition>,
): AnimationStep[] {
  const effects: AnimationEffect[] = [];

  for (const e of events) {
    if (e.type === 'KEYWORD_TRIGGERED') {
      const pos = positions.get(e.permanentId);
      if (pos) {
        effects.push({ type: 'keyword', permanentId: e.permanentId, keyword: e.keyword, position: pos });
      }
    } else if (e.type === 'DAMAGE_DEALT') {
      const pos = positions.get(e.targetId);
      if (pos) {
        effects.push({ type: 'damage', targetId: e.targetId, amount: e.amount, position: pos });
      }
    } else if (e.type === 'PLAYER_DAMAGED') {
      const pos = positions.get(`player:${e.player}`);
      if (pos) {
        effects.push({ type: 'player_damage', player: e.player, amount: e.amount, position: pos });
      }
    } else if (e.type === 'CREATURE_HEALED') {
      const pos = positions.get(e.permanentId);
      if (pos) {
        effects.push({ type: 'heal', targetId: e.permanentId, amount: e.amount, position: pos });
      }
    } else if (e.type === 'PLAYER_HEALED') {
      const pos = positions.get(`player:${e.player}`);
      if (pos) {
        effects.push({ type: 'player_heal', player: e.player, amount: e.amount, position: pos });
      }
    } else if (e.type === 'CREATURE_DIED') {
      const pos = positions.get(e.permanentId);
      if (pos) {
        effects.push({ type: 'death', permanentId: e.permanentId, position: pos });
      }
    }
  }

  if (effects.length === 0) return [];
  return [{ effects, durationMs: 800 }];
}
