import { useEffect, useMemo, useState } from 'react';
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

const FULL_EFFECT_LINK_LIMIT = 3;

/** Locate a board card's center by querying the DOM directly. */
function getCardCenter(permanentId: string): { x: number; y: number } | null {
  // data-testid values are quoted in the selector, so : and # are literal
  const el = document.querySelector(`[data-testid="board-card-${permanentId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function serializeLinks(links: BlockLink[]): string {
  return links
    .map((link) => `${Math.round(link.fromX)},${Math.round(link.fromY)},${Math.round(link.toX)},${Math.round(link.toY)}`)
    .join('|');
}

function collectBlockLinks(blockerAssignments: Record<string, string>): BlockLink[] {
  const centerCache = new Map<string, { x: number; y: number } | null>();
  const getCenter = (permanentId: string) => {
    if (!centerCache.has(permanentId)) {
      centerCache.set(permanentId, getCardCenter(permanentId));
    }
    return centerCache.get(permanentId) ?? null;
  };

  const links: BlockLink[] = [];
  for (const [blockerId, attackerId] of Object.entries(blockerAssignments)) {
    const from = getCenter(blockerId);
    const to = getCenter(attackerId);
    if (!from || !to) continue;
    links.push({ blockerId, attackerId, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y });
  }

  return links;
}

export function BlockAssignmentLines() {
  const phase = useGameStore((s) => s.state?.phase);
  const [links, setLinks] = useState<BlockLink[]>([]);

  const blockerAssignments = useMemo(() => {
    if (phase?.type === 'battle') {
      if (phase.step === 'declare_blockers') return phase.tentativeBlockers;
      if (phase.step === 'order_blockers') return phase.blockers;
      return null;
    }
    if (phase?.type === 'combat_priority' && phase.window === 'post_blockers') {
      return phase.blockers;
    }
    return null;
  }, [phase]);

  // Poll card positions via RAF until they stabilize. This tracks Framer Motion
  // layout animations so lines follow cards smoothly during rearrangement, then
  // stop polling once positions settle (~10 stable frames).
  useEffect(() => {
    if (!blockerAssignments) {
      setLinks((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let rafId: number;
    let stableCount = 0;
    let lastStableKey = '';
    let lastRenderedKey: string | null = null;

    function updateLinks() {
      const newLinks = collectBlockLinks(blockerAssignments!);
      const key = serializeLinks(newLinks);

      if (key !== lastRenderedKey) {
        setLinks((prev) => (serializeLinks(prev) === key ? prev : newLinks));
        lastRenderedKey = key;
      }

      if (key === lastStableKey) {
        stableCount++;
      } else {
        stableCount = 0;
        lastStableKey = key;
      }

      if (stableCount < 10) {
        rafId = requestAnimationFrame(updateLinks);
      }
    }

    rafId = requestAnimationFrame(updateLinks);
    return () => cancelAnimationFrame(rafId);
  }, [blockerAssignments]);

  if (links.length === 0) return null;
  const fullEffects = links.length <= FULL_EFFECT_LINK_LIMIT;

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
            filter={fullEffects ? 'url(#block-line-glow)' : undefined}
          />

          {/* Animated dashed line */}
          <line
            data-testid="block-assignment-line"
            className={fullEffects ? 'block-line-animated' : undefined}
            x1={link.fromX}
            y1={link.fromY}
            x2={link.toX}
            y2={link.toY}
            stroke="rgba(96, 165, 250, 0.95)"
            strokeWidth="3"
            strokeDasharray={fullEffects ? '10 8' : undefined}
            strokeLinecap="round"
            filter={fullEffects ? 'url(#block-line-glow)' : undefined}
          />

          {/* Endpoint dots with pulse */}
          <circle
            className={fullEffects ? 'block-dot-pulse' : undefined}
            cx={link.fromX}
            cy={link.fromY}
            r="5"
            fill="rgba(147, 197, 253, 0.9)"
            filter={fullEffects ? 'url(#block-dot-glow)' : undefined}
          />
          <circle
            className={fullEffects ? 'block-dot-pulse' : undefined}
            cx={link.toX}
            cy={link.toY}
            r="5"
            fill="rgba(96, 165, 250, 0.9)"
            filter={fullEffects ? 'url(#block-dot-glow)' : undefined}
            style={fullEffects ? { animationDelay: '0.6s' } : undefined}
          />
        </g>
      ))}
    </svg>,
    document.body,
  );
}
