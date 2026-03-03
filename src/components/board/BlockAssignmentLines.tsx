import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@game/gameStore';

interface BlockLink {
  blockerId: string;
  attackerId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** Locate a board card's center by querying the DOM directly. */
function getCardCenter(permanentId: string): { x: number; y: number } | null {
  // data-testid values are quoted in the selector, so : and # are literal
  const el = document.querySelector(`[data-testid="board-card-${permanentId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function BlockAssignmentLines() {
  const phase = useGameStore((s) => s.state?.phase);
  const [links, setLinks] = useState<BlockLink[]>([]);

  // Poll card positions via RAF until they stabilize. This tracks Framer Motion
  // layout animations so lines follow cards smoothly during rearrangement, then
  // stop polling once positions settle (~10 stable frames).
  useEffect(() => {
    if (
      !phase
      || phase.type !== 'battle'
      || (phase.step !== 'declare_blockers' && phase.step !== 'order_blockers')
    ) {
      setLinks([]);
      return;
    }

    const blockerAssignments = phase.step === 'declare_blockers'
      ? phase.tentativeBlockers
      : phase.blockers;
    let rafId: number;
    let stableCount = 0;
    let lastKey = '';

    function updateLinks() {
      const newLinks = Object.entries(blockerAssignments)
        .map(([blockerId, attackerId]) => {
          const from = getCardCenter(blockerId);
          const to = getCardCenter(attackerId);
          if (!from || !to) return null;
          return { blockerId, attackerId, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y };
        })
        .filter((link): link is BlockLink => link !== null);

      setLinks(newLinks);

      const key = newLinks
        .map((l) => `${Math.round(l.fromX)},${Math.round(l.fromY)},${Math.round(l.toX)},${Math.round(l.toY)}`)
        .join('|');

      if (key === lastKey) {
        stableCount++;
      } else {
        stableCount = 0;
        lastKey = key;
      }

      if (stableCount < 10) {
        rafId = requestAnimationFrame(updateLinks);
      }
    }

    rafId = requestAnimationFrame(updateLinks);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  if (links.length === 0) return null;

  return createPortal(
    <svg
      data-testid="block-assignment-overlay"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 45, width: '100vw', height: '100vh' }}
      viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
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
    </svg>,
    document.body,
  );
}
