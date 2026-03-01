import { useGameStore } from '@game/gameStore';
import { useAnimationStore } from '@game/animationStore';

export function BlockAssignmentLines() {
  const phase = useGameStore((s) => s.state?.phase);
  const positions = useAnimationStore((s) => s.positions);

  if (!phase || phase.type !== 'battle' || phase.step !== 'declare_blockers') {
    return null;
  }

  const links = Object.entries(phase.tentativeBlockers)
    .map(([blockerId, attackerId]) => {
      const blockerPos = positions.get(blockerId);
      const attackerPos = positions.get(attackerId);
      if (!blockerPos || !attackerPos) return null;
      return {
        blockerId,
        attackerId,
        fromX: blockerPos.x + blockerPos.width / 2,
        fromY: blockerPos.y + blockerPos.height / 2,
        toX: attackerPos.x + attackerPos.width / 2,
        toY: attackerPos.y + attackerPos.height / 2,
      };
    })
    .filter((link): link is NonNullable<typeof link> => link !== null);

  if (links.length === 0) return null;

  return (
    <svg
      data-testid="block-assignment-overlay"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100, width: '100vw', height: '100vh' }}
      viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="block-line-glow">
          <feGaussianBlur stdDeviation="2.1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {links.map((link) => (
        <g key={`${link.blockerId}-${link.attackerId}`}>
          <line
            data-testid="block-assignment-line"
            x1={link.fromX}
            y1={link.fromY}
            x2={link.toX}
            y2={link.toY}
            stroke="rgba(96, 165, 250, 0.95)"
            strokeWidth="3"
            strokeDasharray="8 6"
            filter="url(#block-line-glow)"
          />
          <circle cx={link.fromX} cy={link.fromY} r="5" fill="rgba(147, 197, 253, 0.9)" />
          <circle cx={link.toX} cy={link.toY} r="5" fill="rgba(96, 165, 250, 0.9)" />
        </g>
      ))}
    </svg>
  );
}
