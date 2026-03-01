import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAnimationStore } from '@game/animationStore';
import type { AnimationEffect, ElementPosition } from '@game/animationStore';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { triggerSoundEffect } from '@audio/triggerSoundEffect';
import { FloatingNumber } from './FloatingNumber';
import { BlockLink } from './BlockLink';
import { CardReveal } from './CardReveal';
import { DamageVignette } from './DamageVignette';
import { ParticleCanvas } from './ParticleCanvas';
import type { ParticleCanvasHandle } from './ParticleCanvas';

export function AnimationOverlay() {
  const activeStep = useAnimationStore((s) => s.activeStep);
  const advanceStep = useAnimationStore((s) => s.advanceStep);
  const particleRef = useRef<ParticleCanvasHandle>(null);
  const [stepCount, setStepCount] = useState(0);

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
    setStepCount((c) => c + 1); // eslint-disable-line react-hooks/set-state-in-effect -- remount key for AnimatePresence
    const particles = particleRef.current;

    for (const effect of activeStep.effects) {
      triggerParticleEffect(particles, effect);
      triggerSoundEffect(effect);
    }
  }, [activeStep]);

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
                    from={effect.from}
                    to={effect.to}
                  />
                );
              case 'damage':
              case 'player_damage':
                return (
                  <FloatingNumber
                    key={`dmg-${i}`}
                    text={`-${effect.amount}`}
                    position={effect.position}
                    color="red"
                  />
                );
              case 'heal':
              case 'player_heal':
                return (
                  <FloatingNumber
                    key={`heal-${i}`}
                    text={`+${effect.amount}`}
                    position={effect.position}
                    color="green"
                  />
                );
              case 'keyword':
                return (
                  <FloatingNumber
                    key={`kw-${effect.permanentId}-${i}`}
                    text={KEYWORD_REGISTRY[effect.keyword].icon}
                    position={effect.position}
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
              // combat_strike, spell_impact, death, summon — handled by particle canvas
              case 'combat_strike':
              case 'spell_impact':
              case 'death':
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

// ─── Particle Effect Triggers ───

function effectCenter(pos: ElementPosition): { cx: number; cy: number } {
  return { cx: pos.x + pos.width / 2, cy: pos.y + pos.height / 2 };
}

function triggerParticleEffect(
  particles: ParticleCanvasHandle,
  effect: AnimationEffect,
) {
  switch (effect.type) {
    case 'combat_strike': {
      const fromX = effect.from.x + effect.from.width / 2;
      const fromY = effect.from.y + effect.from.height / 2;
      const toX = effect.to.x + effect.to.width / 2;
      const toY = effect.to.y + effect.to.height / 2;
      particles.projectile(fromX, fromY, toX, toY, 480, effect.element);
      break;
    }
    case 'block_link': {
      const midX = (effect.from.x + effect.from.width / 2 + effect.to.x + effect.to.width / 2) / 2;
      const midY = (effect.from.y + effect.from.height / 2 + effect.to.y + effect.to.height / 2) / 2;
      particles.blockClash(midX, midY);
      break;
    }
    case 'death': {
      const { cx, cy } = effectCenter(effect.position);
      particles.explosion(cx, cy, effect.element);
      break;
    }
    case 'spell_impact': {
      const { cx, cy } = effectCenter(effect.position);
      particles.spellImpact(cx, cy, effect.element);
      break;
    }
    case 'damage': {
      const { cx, cy } = effectCenter(effect.position);
      particles.damageFlash(cx, cy, effect.amount);
      break;
    }
    case 'player_damage': {
      const { cx, cy } = effectCenter(effect.position);
      particles.playerDamage(cx, cy, effect.amount);
      break;
    }
    case 'heal':
    case 'player_heal': {
      const { cx, cy } = effectCenter(effect.position);
      particles.healEffect(cx, cy, effect.amount);
      break;
    }
    case 'keyword': {
      const { cx, cy } = effectCenter(effect.position);
      particles.keywordFlash(cx, cy, effect.element);
      break;
    }
    case 'summon': {
      const { cx, cy } = effectCenter(effect.position);
      particles.summonBurst(cx, cy, effect.element);
      break;
    }
    case 'card_reveal':
      // No particle effects — rendered entirely by DOM layer
      break;
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}
