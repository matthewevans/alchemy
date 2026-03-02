import { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';

interface PlayerInfoProps {
  playerId: PlayerId;
  isOpponent: boolean;
  onDiscardClick?: () => void;
}

export function PlayerInfo({ playerId, isOpponent, onDiscardClick }: PlayerInfoProps) {
  const player = useGameStore((s) => s.state?.players[playerId]);
  const deckGlowControls = useAnimationControls();
  const prevDeckLengthRef = useRef(player?.deck.length);
  const cardBackSrc = `${import.meta.env.BASE_URL}cardback.webp`;

  const deckLength = player?.deck.length;
  const accentRgb = isOpponent ? '239, 68, 68' : '96, 165, 250';

  // Deck draw animation — cyan flash when a card is drawn (deck shrinks)
  useEffect(() => {
    if (deckLength === undefined) return;
    if (prevDeckLengthRef.current !== undefined && deckLength < prevDeckLengthRef.current) {
      deckGlowControls.start({
        boxShadow: [
          '0 0 20px rgba(34, 211, 238, 0.8), 0 0 6px rgba(34, 211, 238, 0.4)',
          '0 0 10px rgba(34, 211, 238, 0.3)',
          '0 0 0px rgba(34, 211, 238, 0)',
        ],
        scale: [1, 1.06, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }
    prevDeckLengthRef.current = deckLength;
  }, [deckLength, deckGlowControls]);

  if (!player) return null;

  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3 px-2 w-full"
      style={{
        background: `linear-gradient(180deg, rgba(${accentRgb}, 0.04) 0%, transparent 60%)`,
      }}
    >
      {/* Section label */}
      <span className="text-[9px] font-semibold tracking-widest uppercase text-white/30">
        {isOpponent ? 'Enemy' : 'You'}
      </span>

      {/* Library (deck) — mini card-back stack */}
      <motion.div
        className="relative w-14 h-[72px] mt-1 rounded"
        title={`Deck: ${player.deck.length}`}
        animate={deckGlowControls}
      >
        {/* Stacked card-back layers */}
        {player.deck.length > 2 && (
          <div
            className="absolute inset-0 translate-x-[2px] translate-y-[-2px] rounded"
            style={{
              background: 'linear-gradient(135deg, rgb(30, 41, 59) 0%, rgb(15, 23, 42) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.25)',
            }}
          />
        )}
        {player.deck.length > 0 && (
          <div
            className="absolute inset-0 rounded overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgb(30, 41, 59) 0%, rgb(15, 23, 42) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <img
              src={cardBackSrc}
              alt="Deck"
              className="w-full h-full object-contain p-0.5 opacity-50"
              draggable={false}
            />
          </div>
        )}
        {/* Count badge */}
        <div
          className="absolute -bottom-1.5 -right-1.5 rounded-full w-6 h-6 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgb(51, 65, 85) 0%, rgb(30, 41, 59) 100%)',
            border: '1.5px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-white text-[10px] font-bold tabular-nums">{player.deck.length}</span>
        </div>
      </motion.div>

      {/* Discard pile */}
      {player.discard.length > 0 && (
        <button
          type="button"
          className={`relative w-14 h-[72px] mt-0.5 ${onDiscardClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
          title={`Discard: ${player.discard.length}`}
          onClick={onDiscardClick}
          disabled={!onDiscardClick}
          data-testid={`discard-pile-${playerId}`}
        >
          <div
            className="absolute inset-0 rounded"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.2)',
            }}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 rounded-full w-6 h-6 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgb(51, 65, 85) 0%, rgb(30, 41, 59) 100%)',
              border: '1.5px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          >
            <span className="text-slate-400 text-[10px] font-bold tabular-nums">{player.discard.length}</span>
          </div>
        </button>
      )}
    </div>
  );
}
