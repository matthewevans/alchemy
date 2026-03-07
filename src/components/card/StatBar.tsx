import { motion, useAnimationControls } from 'framer-motion';
import { usePreferencesStore } from '@game/preferencesStore';

type AnimationControls = ReturnType<typeof useAnimationControls>;

export type StatBarSize = 'compact' | 'normal' | 'large';

interface StatBarProps {
  attack: number;
  health: number;
  isBuffedAttack?: boolean;
  isDamaged?: boolean;
  size?: StatBarSize;
  statFlashControls?: {
    attack: AnimationControls;
    health: AnimationControls;
  };
}

const SIZE_CONFIG = {
  compact: {
    container: 'px-[3px] py-[2px]',
    containerStyle: undefined as React.CSSProperties | undefined,
    fontSize: '0.65rem',
    padding: '0.08rem 0.25rem',
  },
  normal: {
    container: '',
    containerStyle: {
      padding: 'calc(var(--card-font-scale) * 0.125rem) calc(var(--card-font-scale) * 0.25rem) calc(var(--card-font-scale) * 0.25rem)',
    } as React.CSSProperties,
    fontSize: '0.75rem',
    padding: '0.12rem 0.3rem',
  },
  large: {
    container: 'px-3 pb-3',
    containerStyle: undefined as React.CSSProperties | undefined,
    fontSize: '1.25rem',
    padding: '0.375rem 0.75rem',
  },
} as const;

export function StatBar({
  attack,
  health,
  isBuffedAttack = false,
  isDamaged = false,
  size = 'normal',
  statFlashControls,
}: StatBarProps) {
  const statLayout = usePreferencesStore((s) => s.statLayout);
  const adjacent = statLayout !== 'spread';
  const config = SIZE_CONFIG[size];

  const justifyClass = statLayout === 'right'
    ? 'justify-end'
    : statLayout === 'center'
      ? 'justify-center'
      : 'justify-between';

  const attackBg = isBuffedAttack
    ? 'rgba(34, 197, 94, 0.35)'
    : 'rgba(239, 68, 68, 0.35)';
  const attackBorder = isBuffedAttack
    ? '1px solid rgba(134, 239, 172, 0.6)'
    : '1px solid rgba(252, 165, 165, 0.6)';
  const attackIconColor = isBuffedAttack ? '#86efac' : '#fca5a5';

  const healthBg = isDamaged
    ? 'rgba(239, 68, 68, 0.35)'
    : 'rgba(34, 197, 94, 0.35)';
  const healthBorder = isDamaged
    ? '1px solid rgba(252, 165, 165, 0.6)'
    : '1px solid rgba(134, 239, 172, 0.6)';
  const healthIconColor = isDamaged ? '#fca5a5' : '#86efac';

  const badgeBase = 'flex items-center gap-0.5 font-black';
  const badgeStyle = (bg: string, border: string, isLeft: boolean) => ({
    fontSize: `calc(var(--card-font-scale, 1) * ${config.fontSize})`,
    padding: `calc(var(--card-font-scale, 1) * ${config.padding.split(' ')[0]}) calc(var(--card-font-scale, 1) * ${config.padding.split(' ')[1]})`,
    color: '#fff',
    background: bg,
    border,
    ...(adjacent && isLeft && { borderRight: 'none' }),
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
  });

  const roundedClass = (side: 'left' | 'right') =>
    adjacent
      ? side === 'left' ? 'rounded-l-md' : 'rounded-r-md'
      : 'rounded-md';

  return (
    <div className={`flex items-center ${justifyClass} ${config.container}`} style={config.containerStyle}>
      {/* Attack */}
      <div
        className={`${badgeBase} ${roundedClass('left')}`}
        style={badgeStyle(attackBg, attackBorder, true)}
      >
        <span className="leading-none" style={{ color: attackIconColor }}>⚔</span>
        {statFlashControls ? (
          <motion.span className="leading-none" animate={statFlashControls.attack}>
            {attack}
          </motion.span>
        ) : (
          <span className="leading-none">{attack}</span>
        )}
      </div>

      {/* Health */}
      <div
        className={`${badgeBase} ${roundedClass('right')}`}
        style={badgeStyle(healthBg, healthBorder, false)}
      >
        <span className="leading-none" style={{ color: healthIconColor }}>♥</span>
        {statFlashControls ? (
          <motion.span className="leading-none" animate={statFlashControls.health}>
            {health}
          </motion.span>
        ) : (
          <span className="leading-none">{health}</span>
        )}
      </div>
    </div>
  );
}
