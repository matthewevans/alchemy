import { useGameStore } from '@game/gameStore';
import { getPositions } from '@game/animationStore';

export function BlockAssignmentLines() {
  const phase = useGameStore((s) => s.state?.phase);
  // Read the mutable position registry directly — this component only renders
  // during declare_blockers phase, and re-renders are driven by phase changes.
  const positions = getPositions();

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
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="block-dot-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes block-dash-march {
          to { stroke-dashoffset: -28; }
        }
        .block-line-animated {
          animation: block-dash-march 0.8s linear infinite;
        }
        @keyframes block-dot-pulse {
          0%, 100% { r: 5; opacity: 0.8; }
          50% { r: 7; opacity: 1; }
        }
        .block-dot-pulse {
          animation: block-dot-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {links.map((link) => (
        <g key={`${link.blockerId}-${link.attackerId}`}>
          {/* Wider glow underline */}
          <line
            x1={link.fromX}
            y1={link.fromY}
            x2={link.toX}
            y2={link.toY}
            stroke="rgba(96, 165, 250, 0.25)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#block-line-glow)"
          />

          {/* Animated dashed line */}
          <line
            data-testid="block-assignment-line"
            className="block-line-animated"
            x1={link.fromX}
            y1={link.fromY}
            x2={link.toX}
            y2={link.toY}
            stroke="rgba(96, 165, 250, 0.95)"
            strokeWidth="3"
            strokeDasharray="10 8"
            strokeLinecap="round"
            filter="url(#block-line-glow)"
          />

          {/* Endpoint dots with pulse */}
          <circle
            className="block-dot-pulse"
            cx={link.fromX}
            cy={link.fromY}
            r="5"
            fill="rgba(147, 197, 253, 0.9)"
            filter="url(#block-dot-glow)"
          />
          <circle
            className="block-dot-pulse"
            cx={link.toX}
            cy={link.toY}
            r="5"
            fill="rgba(96, 165, 250, 0.9)"
            filter="url(#block-dot-glow)"
            style={{ animationDelay: '0.6s' }}
          />
        </g>
      ))}
    </svg>
  );
}
