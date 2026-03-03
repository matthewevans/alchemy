import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { CardBack } from '@components/card/CardBack';

export function OpponentHand() {
  const opponentHandSize = useGameStore(
    (s) => s.state?.players[getOpponent(s.humanPlayer)].hand.length ?? 0,
  );

  // Track hand size changes for count flash (derived state pattern)
  const [prevSize, setPrevSize] = useState(opponentHandSize);
  const [countFlash, setCountFlash] = useState(false);

  if (opponentHandSize !== prevSize) {
    setPrevSize(opponentHandSize);
    setCountFlash(true);
  }

  useEffect(() => {
    if (!countFlash) return;
    const timer = setTimeout(() => setCountFlash(false), 400);
    return () => clearTimeout(timer);
  }, [countFlash]);

  if (opponentHandSize === 0) return null;

  const maxFanAngle = 6;
  const fanStep = opponentHandSize > 1 ? (maxFanAngle * 2) / (opponentHandSize - 1) : 0;

  return (
    <div className="opponent-hand flex flex-col items-center -mt-3">
      <div
        className="opponent-hand-fan relative flex items-start justify-center"
        style={{ height: 'calc(var(--card-height) * 0.24)' }}
      >
        <AnimatePresence mode="popLayout">
          {Array.from({ length: opponentHandSize }, (_, index) => {
            const angle = opponentHandSize > 1 ? maxFanAngle - fanStep * index : 0;
            return (
              <motion.div
                key={index}
                style={{
                  transform: `translateY(calc(var(--card-height) * -0.35)) rotate(${angle}deg)`,
                  marginLeft: index === 0 ? 0 : 'calc(var(--card-width) * -0.68)',
                  transformOrigin: 'center calc(0% - var(--card-height) * 2)',
                  zIndex: index,
                }}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center' }}>
                  <CardBack />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <motion.span
        className="text-white/45 text-xs mt-0.5"
        animate={
          countFlash
            ? { color: ['#fbbf24', 'rgba(255,255,255,0.45)'], scale: [1.2, 1] }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        {opponentHandSize} {opponentHandSize === 1 ? 'card' : 'cards'}
      </motion.span>
    </div>
  );
}
