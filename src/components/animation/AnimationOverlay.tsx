import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAnimationStore } from '@game/animationStore';
import { FloatingNumber } from './FloatingNumber';
import { SpellImpact } from './SpellImpact';
import { CombatStrike } from './CombatStrike';
import { BlockLink } from './BlockLink';
import { KEYWORD_REGISTRY } from '@engine/keywords';

export function AnimationOverlay() {
  const activeStep = useAnimationStore((s) => s.activeStep);
  const advanceStep = useAnimationStore((s) => s.advanceStep);

  // Auto-advance after step duration
  useEffect(() => {
    if (!activeStep) return;

    const timer = setTimeout(() => {
      advanceStep();
    }, activeStep.durationMs);

    return () => clearTimeout(timer);
  }, [activeStep, advanceStep]);

  return (
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
            case 'combat_strike':
              return (
                <CombatStrike
                  key={`strike-${effect.sourceId}-${i}`}
                  from={effect.from}
                  to={effect.to}
                />
              );
            case 'damage':
              return (
                <FloatingNumber
                  key={`dmg-${effect.targetId}-${i}`}
                  text={`-${effect.amount}`}
                  position={effect.position}
                  color="red"
                />
              );
            case 'heal':
              return (
                <FloatingNumber
                  key={`heal-${effect.targetId}-${i}`}
                  text={`+${effect.amount}`}
                  position={effect.position}
                  color="green"
                />
              );
            case 'player_damage':
              return (
                <FloatingNumber
                  key={`pdmg-${effect.player}-${i}`}
                  text={`-${effect.amount}`}
                  position={effect.position}
                  color="red"
                />
              );
            case 'player_heal':
              return (
                <FloatingNumber
                  key={`pheal-${effect.player}-${i}`}
                  text={`+${effect.amount}`}
                  position={effect.position}
                  color="green"
                />
              );
            case 'death':
              return null; // Death is handled by BoardCard exit animation
            case 'spell_impact':
              return (
                <SpellImpact
                  key={`spell-${i}`}
                  position={effect.position}
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
          }
        })}
      </AnimatePresence>
    </div>
  );
}
