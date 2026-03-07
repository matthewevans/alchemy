import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAnimationStore } from '@game/animationStore';
import type { AnimationEffect, ElementPosition } from '@game/animationStore';
import type { Element } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { triggerSoundEffect } from '@audio/triggerSoundEffect';
import { FloatingNumber } from './FloatingNumber';
import { BlockLink } from './BlockLink';
import { CardReveal } from './CardReveal';
import { CombatMathOverlay } from './CombatMathOverlay';
import { DamageVignette } from './DamageVignette';
import { ParticleCanvas } from './ParticleCanvas';
import { MathBreakdownOverlay } from './MathBreakdownOverlay';
import { ElementCardEffect } from './ElementCardEffect';
import type { ParticleCanvasHandle } from './ParticleCanvas';

const SPELL_REVEAL_DURATION_MS = 2600;
const CREATURE_REVEAL_DURATION_MS = 1900;
const MATH_BREAKDOWN_DURATION_MS = 2200;
const ELEMENT_EFFECT_DURATION_MS = 2500;

interface ActiveCardReveal {
  key: number;
  cardId: string;
}

interface PersistedMathBreakdown {
  id: number;
  text: string;
  tone: 'damage' | 'heal';
  position: ElementPosition;
}

interface ActiveElementEffect {
  id: number;
  element: Element;
  position: ElementPosition;
  permanentId?: string;
}

interface MathBreakdownDraft {
  text: string;
  tone: 'damage' | 'heal';
  position: ElementPosition;
}

export function AnimationOverlay() {
  const activeStep = useAnimationStore((s) => s.activeStep);
  const advanceStep = useAnimationStore((s) => s.advanceStep);
  const previousDisplayHealth = useAnimationStore((s) => s.previousDisplayHealth);
  const previousDisplayCreatureDamage = useAnimationStore((s) => s.previousDisplayCreatureDamage);
  const boardSnapshot = useAnimationStore((s) => s.boardSnapshot);
  const players = useGameStore((s) => s.state?.players);
  const playerStartingHealth = useGameStore((s) => s.state?.ruleset.startingHealth);
  const mathBreakdownEnabled = usePreferencesStore((s) => s.mathBreakdownEnabled);
  const vfxLevel = usePreferencesStore((s) => s.vfxLevel);
  const particleRef = useRef<ParticleCanvasHandle>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRevealKeyRef = useRef(0);
  const nextBreakdownIdRef = useRef(0);
  const breakdownTimeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [cardReveal, setCardReveal] = useState<ActiveCardReveal | null>(null);
  const [mathBreakdowns, setMathBreakdowns] = useState<PersistedMathBreakdown[]>([]);
  const [elementEffects, setElementEffects] = useState<ActiveElementEffect[]>([]);
  const nextElementEffectIdRef = useRef(0);
  const elementEffectTimeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // Derive step key from state changes during render — no extra re-render needed
  const stepKeyRef = useRef(0);
  const prevStepRef = useRef<typeof activeStep>(null);
  if (activeStep !== prevStepRef.current) {
    prevStepRef.current = activeStep;
    stepKeyRef.current += 1;
  }
  const stepCount = stepKeyRef.current;
  const livePositions = useMemo(() => buildStepPositionCache(activeStep), [activeStep]);
  const permanentById = useMemo(() => {
    const permanents = new Map<string, { health: number; temporaryHealthBonus: number; damage: number }>();
    if (players) {
      for (const p of Object.values(players)) {
        for (const perm of p.board) {
          if (!perm) continue;
          permanents.set(perm.permanentId, perm);
        }
      }
    }
    if (boardSnapshot) {
      for (const snapshotBoard of Object.values(boardSnapshot)) {
        for (const perm of snapshotBoard) {
          if (!perm || permanents.has(perm.permanentId)) continue;
          permanents.set(perm.permanentId, perm);
        }
      }
    }
    return permanents;
  }, [players, boardSnapshot]);
  const playerMaxHealth = useMemo(() => {
    const max = playerStartingHealth ?? 999;
    return { player1: max, player2: max };
  }, [playerStartingHealth]);

  // Auto-advance after step duration
  useEffect(() => {
    if (!activeStep) return;

    const timer = setTimeout(() => {
      advanceStep();
    }, activeStep.durationMs);

    return () => clearTimeout(timer);
  }, [activeStep, advanceStep]);

  // Trigger particle effects when a new step activates
  useEffect(() => {
    if (!activeStep || !particleRef.current) return;
    const particles = particleRef.current;

    for (const effect of activeStep.effects) {
      if (vfxLevel !== 'minimal') {
        triggerParticleEffect(particles, effect, livePositions);
      }
      triggerSoundEffect(effect);
    }
  }, [activeStep, livePositions, vfxLevel]);

  // Persist card reveals independently so they can outlive step transitions.
  useEffect(() => {
    if (!activeStep) return;
    const reveal = activeStep.effects.find(
      (effect): effect is Extract<AnimationEffect, { type: 'card_reveal' }> => effect.type === 'card_reveal',
    );
    if (!reveal) return;

    const durationMs = CARD_REGISTRY[reveal.cardId]?.type === 'spell'
      ? SPELL_REVEAL_DURATION_MS
      : CREATURE_REVEAL_DURATION_MS;
    const key = nextRevealKeyRef.current + 1;
    nextRevealKeyRef.current = key;

    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    setCardReveal({ key, cardId: reveal.cardId });
    revealTimeoutRef.current = setTimeout(() => {
      setCardReveal((current) => (current?.key === key ? null : current));
    }, durationMs);
  }, [activeStep]);

  // Persist math equations independently so they remain readable.
  useEffect(() => {
    if (!mathBreakdownEnabled || !activeStep) return;

    const drafts = buildMathBreakdowns({
      step: activeStep,
      livePositions,
      previousDisplayHealth,
      previousDisplayCreatureDamage,
      permanentById,
      playerMaxHealth,
    });
    if (drafts.length === 0) return;

    const entries: PersistedMathBreakdown[] = drafts.map((draft) => {
      const id = nextBreakdownIdRef.current + 1;
      nextBreakdownIdRef.current = id;
      return { id, ...draft };
    });
    setMathBreakdowns((prev) => [...prev, ...entries]);

    for (const entry of entries) {
      const timeout = setTimeout(() => {
        setMathBreakdowns((prev) => prev.filter((item) => item.id !== entry.id));
        breakdownTimeoutsRef.current.delete(entry.id);
      }, MATH_BREAKDOWN_DURATION_MS);
      breakdownTimeoutsRef.current.set(entry.id, timeout);
    }
  }, [
    activeStep,
    livePositions,
    mathBreakdownEnabled,
    permanentById,
    playerMaxHealth,
    previousDisplayCreatureDamage,
    previousDisplayHealth,
  ]);

  // Spawn fire-and-forget element effect overlays on damaged cards
  useEffect(() => {
    if (!activeStep || vfxLevel !== 'full') return;

    const entries: ActiveElementEffect[] = [];

    for (const effect of activeStep.effects) {
      if (effect.type === 'combat_strike' && effect.element && !effect.targetId.startsWith('player:')) {
        const position = getStepPosition(livePositions, effect.targetId, effect.to);
        const id = ++nextElementEffectIdRef.current;
        entries.push({ id, element: effect.element, position, permanentId: effect.targetId });
      } else if (effect.type === 'spell_impact' && effect.element && !effect.isHealing && effect.permanentId) {
        const position = getStepPosition(livePositions, effect.permanentId, effect.position);
        const id = ++nextElementEffectIdRef.current;
        entries.push({ id, element: effect.element, position, permanentId: effect.permanentId });
      }
    }
    if (entries.length === 0) return;

    setElementEffects((prev) => [...prev, ...entries]);

    for (const entry of entries) {
      const timeout = setTimeout(() => {
        setElementEffects((prev) => prev.filter((item) => item.id !== entry.id));
        elementEffectTimeoutsRef.current.delete(entry.id);
      }, ELEMENT_EFFECT_DURATION_MS);
      elementEffectTimeoutsRef.current.set(entry.id, timeout);
    }
  }, [activeStep, livePositions, vfxLevel]);

  useEffect(() => () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    for (const timeout of breakdownTimeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    breakdownTimeoutsRef.current.clear();
    for (const timeout of elementEffectTimeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    elementEffectTimeoutsRef.current.clear();
  }, []);

  // Check if this step has any player damage (for vignette)
  const hasPlayerDamage = activeStep?.effects.some(
    (e) => e.type === 'player_damage',
  );
  const maxPlayerDamage = activeStep?.effects.reduce(
    (max, e) => (e.type === 'player_damage' ? Math.max(max, e.amount) : max),
    0,
  ) ?? 0;

  return (
    <>
      {/* Canvas layer for particle VFX */}
      {vfxLevel !== 'minimal' && <ParticleCanvas ref={particleRef} />}

      {/* DOM layer for text/structural animations */}
      <div className="fixed inset-0 z-40 pointer-events-none">
        <AnimatePresence>
          {activeStep?.effects.map((effect, i) => {
            switch (effect.type) {
              case 'block_link':
                return (
                  <BlockLink
                    key={`block-${effect.blockerId}-${effect.attackerId}-${i}`}
                    from={getStepPosition(livePositions, effect.blockerId, effect.from)}
                    to={getStepPosition(livePositions, effect.attackerId, effect.to)}
                  />
                );
              case 'damage':
                return (
                  <FloatingNumber
                    key={`dmg-${i}`}
                    text={`-${effect.amount}`}
                    position={getStepPosition(livePositions, effect.targetId, effect.position)}
                    color="red"
                  />
                );
              case 'player_damage':
                return (
                  <FloatingNumber
                    key={`dmg-${i}`}
                    text={`-${effect.amount}`}
                    position={getStepPosition(livePositions, `player:${effect.player}`, effect.position)}
                    color="red"
                  />
                );
              case 'heal':
                return (
                  <FloatingNumber
                    key={`heal-${i}`}
                    text={`+${effect.amount}`}
                    position={getStepPosition(livePositions, effect.targetId, effect.position)}
                    color="green"
                  />
                );
              case 'player_heal':
                return (
                  <FloatingNumber
                    key={`heal-${i}`}
                    text={`+${effect.amount}`}
                    position={getStepPosition(livePositions, `player:${effect.player}`, effect.position)}
                    color="green"
                  />
                );
              case 'keyword':
                return (
                  <FloatingNumber
                    key={`kw-${effect.permanentId}-${i}`}
                    text={KEYWORD_REGISTRY[effect.keyword].icon}
                    position={getStepPosition(livePositions, effect.permanentId, effect.position)}
                    color="amber"
                  />
                );
              case 'card_reveal':
                return null;
              case 'combat_math':
                return (
                  <CombatMathOverlay
                    key={`math-${i}-${stepCount}`}
                    equation={effect.equation}
                    attackerPos={effect.attackerPos}
                    targetPos={effect.targetPos}
                  />
                );
              // combat_strike, spell_impact, death, bounce, summon — handled by particle canvas
              case 'combat_strike':
              case 'spell_impact':
              case 'death':
              case 'bounce':
              case 'summon':
                return null;
              default: {
                const _exhaustive: never = effect;
                return _exhaustive;
              }
            }
          })}
        </AnimatePresence>

        {/* Card reveal panel persists independently from animation step timing */}
        <AnimatePresence>
          {cardReveal && (
            <CardReveal
              key={`reveal-${cardReveal.key}`}
              cardId={cardReveal.cardId}
            />
          )}
        </AnimatePresence>

        {/* Equation overlays persist long enough to be read */}
        <AnimatePresence>
          {mathBreakdowns.map((entry) => (
            <MathBreakdownOverlay
              key={`breakdown-${entry.id}`}
              position={entry.position}
              text={entry.text}
              tone={entry.tone}
            />
          ))}
        </AnimatePresence>

        {/* Red vignette flash when player takes damage */}
        <AnimatePresence>
          {hasPlayerDamage && (
            <DamageVignette
              key={`vignette-${stepCount}`}
              intensity={Math.min(maxPlayerDamage / 4, 1)}
            />
          )}
        </AnimatePresence>

      </div>

      {/* On-card element effect overlays — outside z-40 container so zIndex works against page stacking */}
      <AnimatePresence>
        {elementEffects.map((entry) => (
          <ElementCardEffect
            key={`elem-fx-${entry.id}`}
            element={entry.element}
            position={entry.position}
            permanentId={entry.permanentId}
            onRemove={() => {
              setElementEffects((prev) => prev.filter((item) => item.id !== entry.id));
              const timeout = elementEffectTimeoutsRef.current.get(entry.id);
              if (timeout) {
                clearTimeout(timeout);
                elementEffectTimeoutsRef.current.delete(entry.id);
              }
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}

// ─── Live DOM Position Helpers ───

/** Query the DOM for an element's current bounding rect. */
function queryLivePosition(id: string): ElementPosition | null {
  let el: globalThis.Element | null = null;
  if (id.startsWith('player:')) {
    el = document.querySelector(`[data-testid="health-${id.slice(7)}"]`);
  } else {
    el = document.querySelector(`[data-testid="board-card-${id}"]`);
  }
  if (el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  return null;
}

function getStepPosition(
  livePositions: ReadonlyMap<string, ElementPosition>,
  id: string,
  fallback: ElementPosition,
): ElementPosition {
  return livePositions.get(id) ?? fallback;
}

function buildStepPositionCache(
  step: { effects: AnimationEffect[] } | null,
): Map<string, ElementPosition> {
  const ids = new Set<string>();
  const livePositions = new Map<string, ElementPosition>();
  if (!step) return livePositions;

  for (const effect of step.effects) {
    switch (effect.type) {
      case 'combat_strike':
        ids.add(effect.sourceId);
        ids.add(effect.targetId);
        break;
      case 'block_link':
        ids.add(effect.blockerId);
        ids.add(effect.attackerId);
        break;
      case 'damage':
      case 'heal':
        ids.add(effect.targetId);
        break;
      case 'player_damage':
      case 'player_heal':
        ids.add(`player:${effect.player}`);
        break;
      case 'death':
      case 'keyword':
      case 'bounce':
      case 'summon':
        ids.add(effect.permanentId);
        break;
      case 'spell_impact':
      case 'card_reveal':
      case 'combat_math':
        break;
      default: {
        const _exhaustive: never = effect;
        return _exhaustive;
      }
    }
  }

  for (const id of ids) {
    const position = queryLivePosition(id);
    if (position) livePositions.set(id, position);
  }

  return livePositions;
}

function buildMathBreakdowns({
  step,
  livePositions,
  previousDisplayHealth,
  previousDisplayCreatureDamage,
  permanentById,
  playerMaxHealth,
}: {
  step: { effects: AnimationEffect[] };
  livePositions: ReadonlyMap<string, ElementPosition>;
  previousDisplayHealth: Record<'player1' | 'player2', number> | null;
  previousDisplayCreatureDamage: Record<string, number> | null;
  permanentById: ReadonlyMap<string, { health: number; temporaryHealthBonus: number; damage: number }>;
  playerMaxHealth: Record<'player1' | 'player2', number>;
}): MathBreakdownDraft[] {
  const drafts: MathBreakdownDraft[] = [];
  const stackIndexByTarget = new Map<string, number>();
  const nextPlayerHealth = previousDisplayHealth ? { ...previousDisplayHealth } : null;
  const nextCreatureDamage = previousDisplayCreatureDamage ? { ...previousDisplayCreatureDamage } : null;

  for (const effect of step.effects) {
    if (effect.type === 'player_damage') {
      if (!nextPlayerHealth) continue;
      const before = nextPlayerHealth[effect.player];
      const after = Math.max(0, before - effect.amount);
      nextPlayerHealth[effect.player] = after;
      const actual = before - after;
      if (actual <= 0) continue;

      const targetKey = `player:${effect.player}`;
      const position = offsetBreakdownPosition(
        getStepPosition(livePositions, targetKey, effect.position),
        stackIndexByTarget,
        targetKey,
      );
      drafts.push({ text: `${before} - ${actual} = ${after}`, tone: 'damage', position });
      continue;
    }

    if (effect.type === 'player_heal') {
      if (!nextPlayerHealth) continue;
      const before = nextPlayerHealth[effect.player];
      const after = Math.min(playerMaxHealth[effect.player], before + effect.amount);
      nextPlayerHealth[effect.player] = after;
      const actual = after - before;
      if (actual <= 0) continue;

      const targetKey = `player:${effect.player}`;
      const position = offsetBreakdownPosition(
        getStepPosition(livePositions, targetKey, effect.position),
        stackIndexByTarget,
        targetKey,
      );
      drafts.push({ text: `${before} + ${actual} = ${after}`, tone: 'heal', position });
      continue;
    }

    if (effect.type === 'damage') {
      if (!nextCreatureDamage) continue;
      const perm = permanentById.get(effect.targetId);
      if (!perm) continue;

      const maxHealth = perm.health + perm.temporaryHealthBonus;
      const beforeDamage = nextCreatureDamage[effect.targetId] ?? perm.damage;
      const before = toHealthValue(maxHealth, beforeDamage);
      const afterDamage = beforeDamage + effect.amount;
      nextCreatureDamage[effect.targetId] = afterDamage;
      const after = toHealthValue(maxHealth, afterDamage);
      const actual = before - after;
      if (actual <= 0) continue;

      const position = offsetBreakdownPosition(
        getStepPosition(livePositions, effect.targetId, effect.position),
        stackIndexByTarget,
        effect.targetId,
      );
      drafts.push({ text: `${before} - ${actual} = ${after}`, tone: 'damage', position });
      continue;
    }

    if (effect.type === 'heal') {
      if (!nextCreatureDamage) continue;
      const perm = permanentById.get(effect.targetId);
      if (!perm) continue;

      const maxHealth = perm.health + perm.temporaryHealthBonus;
      const beforeDamage = nextCreatureDamage[effect.targetId] ?? perm.damage;
      const before = toHealthValue(maxHealth, beforeDamage);
      const afterDamage = Math.max(0, beforeDamage - effect.amount);
      nextCreatureDamage[effect.targetId] = afterDamage;
      const after = toHealthValue(maxHealth, afterDamage);
      const actual = after - before;
      if (actual <= 0) continue;

      const position = offsetBreakdownPosition(
        getStepPosition(livePositions, effect.targetId, effect.position),
        stackIndexByTarget,
        effect.targetId,
      );
      drafts.push({ text: `${before} + ${actual} = ${after}`, tone: 'heal', position });
    }
  }

  return drafts;
}

function offsetBreakdownPosition(
  position: ElementPosition,
  stackIndexByTarget: Map<string, number>,
  targetKey: string,
): ElementPosition {
  const index = stackIndexByTarget.get(targetKey) ?? 0;
  stackIndexByTarget.set(targetKey, index + 1);
  if (index === 0) return position;
  return { ...position, y: position.y - index * 24 };
}

function toHealthValue(maxHealth: number, damage: number): number {
  return Math.max(0, Math.min(maxHealth, maxHealth - damage));
}

function posCenter(pos: ElementPosition): { cx: number; cy: number } {
  return { cx: pos.x + pos.width / 2, cy: pos.y + pos.height / 2 };
}

// ─── Particle Effect Triggers ───

function triggerParticleEffect(
  particles: ParticleCanvasHandle,
  effect: AnimationEffect,
  livePositions: ReadonlyMap<string, ElementPosition>,
) {
  switch (effect.type) {
    case 'combat_strike': {
      const from = posCenter(getStepPosition(livePositions, effect.sourceId, effect.from));
      const to = posCenter(getStepPosition(livePositions, effect.targetId, effect.to));
      particles.projectile(from.cx, from.cy, to.cx, to.cy, 480, effect.element);
      break;
    }
    case 'block_link': {
      const from = posCenter(getStepPosition(livePositions, effect.blockerId, effect.from));
      const to = posCenter(getStepPosition(livePositions, effect.attackerId, effect.to));
      particles.blockClash((from.cx + to.cx) / 2, (from.cy + to.cy) / 2);
      break;
    }
    case 'death': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.permanentId, effect.position));
      particles.explosion(cx, cy, effect.element);
      break;
    }
    case 'spell_impact': {
      const { cx, cy } = posCenter(effect.position);
      particles.spellImpact(cx, cy, effect.element);
      break;
    }
    case 'damage': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.targetId, effect.position));
      particles.damageFlash(cx, cy, effect.amount);
      break;
    }
    case 'player_damage': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, `player:${effect.player}`, effect.position));
      particles.playerDamage(cx, cy, effect.amount, effect.element);
      break;
    }
    case 'heal': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.targetId, effect.position));
      particles.healEffect(cx, cy, effect.amount);
      break;
    }
    case 'player_heal': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, `player:${effect.player}`, effect.position));
      particles.healEffect(cx, cy, effect.amount);
      break;
    }
    case 'keyword': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.permanentId, effect.position));
      particles.keywordFlash(cx, cy, effect.element);
      break;
    }
    case 'bounce': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.permanentId, effect.position));
      particles.summonBurst(cx, cy, effect.element);
      break;
    }
    case 'summon': {
      const { cx, cy } = posCenter(getStepPosition(livePositions, effect.permanentId, effect.position));
      particles.summonBurst(cx, cy, effect.element);
      break;
    }
    case 'card_reveal':
    case 'combat_math':
      // No particle effects — rendered entirely by DOM layer
      break;
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}
