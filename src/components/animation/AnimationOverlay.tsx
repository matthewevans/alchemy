import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAnimationStore } from '@game/animationStore';
import type { AnimationEffect, ElementPosition } from '@game/animationStore';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { triggerSoundEffect } from '@audio/triggerSoundEffect';
import { FloatingNumber } from './FloatingNumber';
import { BlockLink } from './BlockLink';
import { CardReveal } from './CardReveal';
import { CombatMathOverlay } from './CombatMathOverlay';
import { DamageVignette } from './DamageVignette';
import { ParticleCanvas } from './ParticleCanvas';
import type { ParticleCanvasHandle } from './ParticleCanvas';

export function AnimationOverlay() {
  const activeStep = useAnimationStore((s) => s.activeStep);
  const advanceStep = useAnimationStore((s) => s.advanceStep);
  const particleRef = useRef<ParticleCanvasHandle>(null);
  // Derive step key from state changes during render — no extra re-render needed
  const stepKeyRef = useRef(0);
  const prevStepRef = useRef<typeof activeStep>(null);
  if (activeStep !== prevStepRef.current) {
    prevStepRef.current = activeStep;
    stepKeyRef.current += 1;
  }
  const stepCount = stepKeyRef.current;
  const livePositions = useMemo(() => buildStepPositionCache(activeStep), [activeStep]);

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
      triggerParticleEffect(particles, effect, livePositions);
      triggerSoundEffect(effect);
    }
  }, [activeStep, livePositions]);

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
      <ParticleCanvas ref={particleRef} />

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
                return (
                  <CardReveal
                    key={`reveal-${effect.cardId}-${stepCount}`}
                    cardId={effect.cardId}
                  />
                );
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
      particles.playerDamage(cx, cy, effect.amount);
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
