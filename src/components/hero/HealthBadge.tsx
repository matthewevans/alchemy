import { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';
import { usePositionRegistry } from '@hooks/usePositionRegistry';

interface HealthBadgeProps {
  playerId: PlayerId;
}

/**
 * Compact health badge — MTGA style.
 * Designed to be absolutely positioned overlapping the bottom of the portrait.
 */
export function HealthBadge({ playerId }: HealthBadgeProps) {
  const displayHealth = useAnimationStore((s) => s.displayHealth?.[playerId]);
  const storeHealth = useGameStore((s) => s.state?.players[playerId]?.health);
  const health = displayHealth ?? storeHealth;
  const healthControls = useAnimationControls();
  const prevHealthRef = useRef(health);
  const healthRef = usePositionRegistry(`player:${playerId}`);

  useEffect(() => {
    if (health === undefined) return;
    if (prevHealthRef.current !== undefined && health < prevHealthRef.current) {
      const amount = prevHealthRef.current - health;
      const intensity = Math.min(amount / 3, 1);
      healthControls.start({
        color: ['#ff2222', '#ef4444', '#ffffff'],
        scale: [1.5 + intensity * 0.3, 1.1, 1],
        textShadow: [
          '0 0 20px rgba(255,34,34,0.8)',
          '0 0 10px rgba(255,34,34,0.4)',
          '0 0 0px rgba(255,34,34,0)',
        ],
        transition: { duration: 0.5 + intensity * 0.2 },
      });
    } else if (prevHealthRef.current !== undefined && health > prevHealthRef.current) {
      healthControls.start({
        color: ['#34d399', '#ffffff'],
        scale: [1.3, 1],
        textShadow: [
          '0 0 15px rgba(52,211,153,0.6)',
          '0 0 0px rgba(52,211,153,0)',
        ],
        transition: { duration: 0.4 },
      });
    }
    prevHealthRef.current = health;
  }, [health, healthControls]);

  if (health === undefined) return null;

  return (
    <div
      ref={healthRef}
      data-testid={`health-${playerId}`}
      className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center rounded-full px-1.5"
      style={{
        bottom: 'var(--health-badge-bottom)',
        minWidth: 'var(--health-badge-min-w)',
        height: 'var(--health-badge-h)',
        background: 'linear-gradient(180deg, rgb(127, 29, 29) 0%, rgb(69, 10, 10) 100%)',
        border: '1.5px solid rgba(248, 113, 113, 0.5)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}
    >
      <motion.span
        className="text-white font-black tabular-nums leading-none"
        style={{ fontSize: 'var(--health-badge-font)' }}
        animate={healthControls}
      >
        {health}
      </motion.span>
    </div>
  );
}
