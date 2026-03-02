import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { useUIStore } from '@game/uiStore';
import { CARD_REGISTRY } from '@engine/cards';
import type { GameAction } from '@engine/types';
import { HandCard } from '@components/card';

const DRAG_THRESHOLD = 10;

export function PlayerHand() {
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const hand = useGameStore((s) => s.state?.players[s.humanPlayer].hand ?? []);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();
  const selectedHandIndex = useUIStore((s) => s.selectedHandIndex);
  const selectHandCard = useUIStore((s) => s.selectHandCard);
  const hoverCard = useUIStore((s) => s.hoverCard);
  const inspectCard = useUIStore((s) => s.inspectCard);

  // Hand tray expand/collapse — MTGA-style peek from bottom
  const [handHovered, setHandHovered] = useState(false);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; index: number } | null>(null);
  const dragActiveRef = useRef(false);

  // Play burst animation
  const [playBurstKey, setPlayBurstKey] = useState(0);
  const [showPlayBurst, setShowPlayBurst] = useState(false);
  const prevHandLengthRef = useRef(hand.length);

  useEffect(() => {
    if (hand.length < prevHandLengthRef.current) {
      setPlayBurstKey((k) => k + 1);
      setShowPlayBurst(true);
      const timer = setTimeout(() => setShowPlayBurst(false), 500);
      prevHandLengthRef.current = hand.length;
      return () => clearTimeout(timer);
    }
    prevHandLengthRef.current = hand.length;
  }, [hand.length]);

  const playableIndices = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD')
      .map((a) => a.cardIndex),
  );

  const handleCardClick = (index: number) => {
    // Suppress click if we just completed a drag
    if (dragActiveRef.current) return;

    if (selectedHandIndex === index) {
      // Second tap on same card — check if it's an untargeted spell we can auto-play
      const cardInstance = hand[index];
      const cardDef = CARD_REGISTRY[cardInstance.cardId];
      if (cardDef.type === 'spell' && playableIndices.has(index)) {
        const spellAction = legalActions.find(
          (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
            a.type === 'PLAY_CARD' && a.cardIndex === index && a.targetSlot === undefined,
        );
        if (spellAction) {
          dispatch(spellAction, humanPlayer);
          selectHandCard(null);
          return;
        }
      }
      selectHandCard(null);
    } else {
      selectHandCard(index);
    }
  };

  const handleDragPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (!playableIndices.has(index)) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY, index };
      dragActiveRef.current = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hand, legalActions],
  );

  const handleDrop = useCallback(
    (x: number, y: number, cardIndex: number) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return;

      // Check for slot drop target
      const slotEl = (el as HTMLElement).closest('[data-slot-index]');
      if (slotEl) {
        const slotIndex = Number(slotEl.getAttribute('data-slot-index'));
        const boardPlayer = slotEl.getAttribute('data-board-player');
        if (boardPlayer === humanPlayer) {
          const playAction = legalActions.find(
            (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
              a.type === 'PLAY_CARD' && a.cardIndex === cardIndex && a.targetSlot === slotIndex,
          );
          if (playAction) {
            dispatch(playAction, humanPlayer);
            selectHandCard(null);
            return;
          }
        }
      }

      // Check for board area drop (untargeted spells)
      const boardArea = (el as HTMLElement).closest('[data-player-board]');
      if (boardArea && boardArea.getAttribute('data-player-board') === humanPlayer) {
        const spellAction = legalActions.find(
          (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
            a.type === 'PLAY_CARD' && a.cardIndex === cardIndex && a.targetSlot === undefined,
        );
        if (spellAction) {
          dispatch(spellAction, humanPlayer);
          selectHandCard(null);
        }
      }
    },
    [humanPlayer, legalActions, dispatch, selectHandCard],
  );

  // Document-level pointer listeners for drag tracking
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (!dragActiveRef.current) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        // Activate drag
        dragActiveRef.current = true;
        setDraggedIndex(dragStartRef.current.index);
        selectHandCard(dragStartRef.current.index);
      }

      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const wasActive = dragActiveRef.current;
      const cardIndex = dragStartRef.current.index;

      setDraggedIndex(null);
      setDragPosition(null);
      dragStartRef.current = null;

      if (wasActive) {
        handleDrop(e.clientX, e.clientY, cardIndex);
        // Keep dragActiveRef true briefly so click handler is suppressed
        requestAnimationFrame(() => { dragActiveRef.current = false; });
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [handleDrop, selectHandCard]);

  const cardCount = hand.length;
  const maxFanAngle = 6;
  const fanStep = cardCount > 1 ? (maxFanAngle * 2) / (cardCount - 1) : 0;
  const centerIndex = (cardCount - 1) / 2;

  // Phantom card for drag
  const draggedCard = draggedIndex !== null ? hand[draggedIndex] : null;

  // Hand expands when hovered (desktop) or a card is selected/dragged (touch)
  const isExpanded = handHovered || selectedHandIndex !== null || draggedIndex !== null;

  return (
    <div
      data-hand-area
      className="relative flex flex-col items-center bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pb-1 pointer-events-auto"
      style={{
        transform: isExpanded
          ? 'translateY(0)'
          : 'translateY(calc(var(--card-height) * 0.6))',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={() => setHandHovered(true)}
      onMouseLeave={() => setHandHovered(false)}
    >
      {/* Fan layout — full card height container, clipped below viewport when collapsed */}
      <div
        className="relative flex items-end justify-center"
        style={{ height: 'var(--card-height)' }}
      >
        {hand.map((cardInstance, index) => {
          const angle = cardCount > 1 ? -maxFanAngle + fanStep * index : 0;
          const isPlayable = playableIndices.has(index);
          const isSelected = selectedHandIndex === index;
          const isDragged = draggedIndex === index;
          const depth = cardCount - Math.abs(index - centerIndex);
          const zIndex = isSelected ? 90 : Math.round(depth * 10);

          return (
            <div
              key={cardInstance.instanceId}
              data-hand-card
              data-testid={`hand-card-${index}`}
              className="transition-transform duration-200"
              style={{
                transform: `rotate(${angle}deg)`,
                marginLeft: index === 0 ? 0 : 'calc(var(--card-width) * -0.45)',
                zIndex,
                transformOrigin: 'center calc(100% + var(--card-height) * 2)',
                visibility: isDragged ? 'hidden' : 'visible',
              }}
            >
              <HandCard
                cardInstance={cardInstance}
                isPlayable={isPlayable}
                isSelected={isSelected}
                onClick={() => handleCardClick(index)}
                onHover={(hovering) => hoverCard(hovering ? cardInstance.cardId : null)}
                onLongPress={() => inspectCard(cardInstance.cardId)}
                onPointerDown={(e) => handleDragPointerDown(index, e)}
              />
            </div>
          );
        })}
      </div>

      {/* Play burst — brief cyan flash when a card leaves the hand */}
      <AnimatePresence>
        {showPlayBurst && (
          <motion.div
            key={playBurstKey}
            className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none"
            style={{
              width: 120,
              height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(34, 211, 238, 0.4), rgba(34, 211, 238, 0.1) 60%, transparent 100%)',
              filter: 'blur(6px)',
              zIndex: 100,
            }}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2], y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Drag phantom — portal-mounted at fixed position */}
      {draggedCard && dragPosition && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%) scale(1.05)',
            zIndex: 9999,
          }}
        >
          <HandCard
            cardInstance={draggedCard}
            isPlayable
            isSelected={false}
            onClick={() => {}}
            onHover={() => {}}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
