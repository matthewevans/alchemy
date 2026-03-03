import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { CARD_REGISTRY } from '@engine/cards';
import { getEffectiveAttack, getCurrentHealth } from '@engine/types';
import type { Permanent } from '@engine/types';

interface MatchupMath {
  blockerId: string;
  attackerId: string;
  midX: number;
  midY: number;
  attackerName: string;
  blockerName: string;
  attackerAtk: number;
  blockerHP: number;
  blockerAtk: number;
  attackerHP: number;
  blockerSurvives: boolean;
  attackerSurvives: boolean;
  blockerHPLeft: number;
  attackerHPLeft: number;
}

function getCardCenter(permanentId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-testid="board-card-${permanentId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function findPermanent(board: (Permanent | null)[], id: string): Permanent | null {
  return board.find((p) => p?.permanentId === id) ?? null;
}

function computeMatchup(
  attacker: Permanent,
  blocker: Permanent,
  midX: number,
  midY: number,
): MatchupMath {
  const attackerDef = CARD_REGISTRY[attacker.cardId];
  const blockerDef = CARD_REGISTRY[blocker.cardId];

  let atkDamage = getEffectiveAttack(attacker);
  if (attackerDef.keywords.includes('fury')) atkDamage *= 2;

  let blkDamage = getEffectiveAttack(blocker);
  if (blockerDef.keywords.includes('fury')) blkDamage *= 2;

  const blockerHP = getCurrentHealth(blocker);
  const attackerHP = getCurrentHealth(attacker);

  // Armor reduces damage by 1
  const atkDamageAfterArmor = blockerDef.keywords.includes('armor') && !blocker.armorUsedThisTurn
    ? Math.max(0, atkDamage - 1)
    : atkDamage;
  const blkDamageAfterArmor = attackerDef.keywords.includes('armor') && !attacker.armorUsedThisTurn
    ? Math.max(0, blkDamage - 1)
    : blkDamage;

  // Deathtouch = instant kill if any damage
  const blockerKilledByDeathtouch = attackerDef.keywords.includes('deathtouch') && atkDamageAfterArmor > 0;
  const attackerKilledByDeathtouch = blockerDef.keywords.includes('deathtouch') && blkDamageAfterArmor > 0;

  const blockerHPLeft = blockerKilledByDeathtouch ? 0 : blockerHP - atkDamageAfterArmor;
  const attackerHPLeft = attackerKilledByDeathtouch ? 0 : attackerHP - blkDamageAfterArmor;

  return {
    blockerId: blocker.permanentId,
    attackerId: attacker.permanentId,
    midX,
    midY,
    attackerName: attackerDef.name,
    blockerName: blockerDef.name,
    attackerAtk: atkDamage,
    blockerHP,
    blockerAtk: blkDamage,
    attackerHP,
    blockerSurvives: blockerHPLeft > 0,
    attackerSurvives: attackerHPLeft > 0,
    blockerHPLeft: Math.max(0, blockerHPLeft),
    attackerHPLeft: Math.max(0, attackerHPLeft),
  };
}

/**
 * Renders tappable math bubbles at the midpoint of each block assignment line.
 * Only visible during declare_blockers when combatMathEnabled is true.
 */
export function CombatMathBubbles() {
  const phase = useGameStore((s) => s.state?.phase);
  const players = useGameStore((s) => s.state?.players);
  const combatMathEnabled = usePreferencesStore((s) => s.combatMathEnabled);
  const [matchups, setMatchups] = useState<MatchupMath[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (
      !combatMathEnabled ||
      !phase ||
      phase.type !== 'battle' ||
      phase.step !== 'declare_blockers' ||
      !players
    ) {
      setMatchups([]);
      setExpanded(null);
      return;
    }

    let rafId: number;
    let stableCount = 0;
    let lastKey = '';

    const { tentativeBlockers } = phase;
    const currentPlayers = players;

    function update() {
      const results: MatchupMath[] = [];
      const allBoard = [...currentPlayers.player1.board, ...currentPlayers.player2.board];

      for (const [blockerId, attackerId] of Object.entries(tentativeBlockers)) {
        const blocker = findPermanent(allBoard, blockerId);
        const attacker = findPermanent(allBoard, attackerId);
        if (!blocker || !attacker) continue;

        const from = getCardCenter(blockerId);
        const to = getCardCenter(attackerId);
        if (!from || !to) continue;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        results.push(computeMatchup(attacker, blocker, midX, midY));
      }

      setMatchups(results);

      const key = results.map((r) => `${Math.round(r.midX)},${Math.round(r.midY)}`).join('|');
      if (key === lastKey) {
        stableCount++;
      } else {
        stableCount = 0;
        lastKey = key;
      }

      if (stableCount < 10) {
        rafId = requestAnimationFrame(update);
      }
    }

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [phase, players, combatMathEnabled]);

  if (matchups.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[46] pointer-events-none">
      {matchups.map((m) => (
        <MathBubble
          key={`${m.blockerId}-${m.attackerId}`}
          matchup={m}
          isExpanded={expanded === `${m.blockerId}-${m.attackerId}`}
          onToggle={() =>
            setExpanded((prev) =>
              prev === `${m.blockerId}-${m.attackerId}` ? null : `${m.blockerId}-${m.attackerId}`,
            )
          }
        />
      ))}
    </div>,
    document.body,
  );
}

function MathBubble({
  matchup: m,
  isExpanded,
  onToggle,
}: {
  matchup: MatchupMath;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: m.midX,
        top: m.midY,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Tappable icon */}
      <motion.button
        className="flex items-center justify-center rounded-full text-sm font-bold select-none"
        style={{
          width: 32,
          height: 32,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '2px solid rgba(251, 191, 36, 0.7)',
          boxShadow: '0 0 12px rgba(251, 191, 36, 0.3), 0 4px 12px rgba(0,0,0,0.5)',
          color: '#fbbf24',
        }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        aria-label="Show combat math"
      >
        ⚔
      </motion.button>

      {/* Expanded math popover */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-max"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className="rounded-xl px-3 py-2.5 text-sm"
              style={{
                background: 'rgba(15, 23, 42, 0.97)',
                border: '1.5px solid rgba(251, 191, 36, 0.4)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(251,191,36,0.1)',
              }}
            >
              {/* Attacker → Blocker */}
              <div className="flex items-center gap-1.5 mb-1.5 whitespace-nowrap">
                <span className="text-red-400 font-bold">{m.attackerName}</span>
                <span className="text-red-400 font-bold">{m.attackerAtk} ⚔</span>
                <span className="text-white/50">→</span>
                <span className="text-blue-400 font-bold">{m.blockerName}</span>
                <span className="text-green-400 font-bold">{m.blockerHP} ♥</span>
                <span className="text-white/50">=</span>
                <span className={`font-bold ${m.blockerSurvives ? 'text-amber-300' : 'text-red-400'}`}>
                  {m.blockerSurvives ? `${m.blockerHPLeft} ♥` : 'KO!'}
                </span>
              </div>
              {/* Blocker → Attacker (counterattack) */}
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-blue-400 font-bold">{m.blockerName}</span>
                <span className="text-red-400 font-bold">{m.blockerAtk} ⚔</span>
                <span className="text-white/50">→</span>
                <span className="text-red-400 font-bold">{m.attackerName}</span>
                <span className="text-green-400 font-bold">{m.attackerHP} ♥</span>
                <span className="text-white/50">=</span>
                <span className={`font-bold ${m.attackerSurvives ? 'text-amber-300' : 'text-red-400'}`}>
                  {m.attackerSurvives ? `${m.attackerHPLeft} ♥` : 'KO!'}
                </span>
              </div>
            </div>
            {/* Arrow pointing down to bubble */}
            <div className="flex justify-center">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(15, 23, 42, 0.97)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
