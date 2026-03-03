import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';

interface HealthBarProps {
  playerId: PlayerId;
}

export function HealthBar({ playerId }: HealthBarProps) {
  const displayHealth = useAnimationStore((s) => s.displayHealth?.[playerId]);
  const storeHealth = useGameStore((s) => s.state?.players[playerId]?.health);
  const maxHealth = useGameStore((s) => s.state?.ruleset.startingHealth) ?? 20;
  const health = displayHealth ?? storeHealth ?? 0;

  const pipCount = Math.ceil(maxHealth / 2);

  return (
    <div className="flex gap-[2px] justify-center mt-0.5">
      {Array.from({ length: pipCount }, (_, i) => {
        const pipThreshold = (i + 1) * 2;
        const filled = health >= pipThreshold;
        const half = !filled && health >= pipThreshold - 1;

        return (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 'var(--health-pip-size, 6px)',
              height: 'var(--health-pip-size, 6px)',
              backgroundColor: filled
                ? '#ef4444'
                : half
                  ? 'rgba(239, 68, 68, 0.45)'
                  : 'rgba(51, 65, 85, 0.6)',
              transition: 'background-color 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
}
