import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { useUIStore } from '@game/uiStore';
import type { GameAction } from '@engine/types';
import { HandCard } from '@components/card';
import { getCardCostPresentation } from '@components/card/costPresentation';
import { useActionFeedback } from '@hooks/useActionFeedback';

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
  const tryFeedback = useActionFeedback();
  const state = useGameStore((s) => s.state);

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

  const phase = useGameStore((s) => s.state?.phase);
  const isDiscardPhase = phase?.type === 'discard';

  const playableIndices = useMemo(() => new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD')
      .map((a) => a.cardIndex),
  ), [legalActions]);

  const discardableIndices = useMemo(() => new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'DISCARD_CARD' }> => a.type === 'DISCARD_CARD')
      .map((a) => a.cardIndex),
  ), [legalActions]);

  // Resolve which card is at a given X position — avoids z-index overlap issues
  // where the selected card (z-index 90) intercepts events for adjacent cards.
  const findCardIndexAtX = (clientX: number): number => {
    const cards = document.querySelectorAll('[data-hand-card]');
    let closestIndex = -1;
    let closestDist = Infinity;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = index;
      }
    });
    return closestIndex;
  };

  const handleInspectAtPosition = (clientX: number) => {
    const cardIndex = findCardIndexAtX(clientX);
    if (cardIndex >= 0 && cardIndex < hand.length) {
      inspectCard(hand[cardIndex].cardId);
    }
  };

  const handleCardClick = (index: number) => {
    // Suppress click if we just completed a drag
    if (dragActiveRef.current) return;

    // Discard phase — single tap discards immediately
    if (isDiscardPhase && discardableIndices.has(index)) {
      dispatch({ type: 'DISCARD_CARD', cardIndex: index }, humanPlayer);
      selectHandCard(null);
      return;
    }

    // Single click only selects — double-click (or drag) required to play
    selectHandCard(index);
  };

  const handleCardDoubleClick = (index: number) => {
    if (playableIndices.has(index)) {
      const playAction = legalActions.find(
        (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
          a.type === 'PLAY_CARD' && a.cardIndex === index,
      );
      if (playAction) {
        dispatch(playAction, humanPlayer);
        selectHandCard(null);
        return;
      }
    }
    // Show feedback why this card can't be played
    if (!playableIndices.has(index) && state) {
      const el = document.querySelector(`[data-testid="hand-card-${index}"]`) as HTMLElement | null;
      tryFeedback(state, { type: 'PLAY_CARD', cardIndex: index }, humanPlayer, el);
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

      // Drop on either battlefield side — auto-place to first available slot
      const boardArea = (el as HTMLElement).closest('[data-player-board], [data-board-player]');
      if (boardArea) {
        const playAction = legalActions.find(
          (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
            a.type === 'PLAY_CARD' && a.cardIndex === cardIndex,
        );
        if (playAction) {
          dispatch(playAction, humanPlayer);
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
  const draggedCardInstantCost = draggedCard
    ? getCardCostPresentation(draggedCard.cardId, phase)
    : null;

  // Auto-collapse on phase changes (hand peeks back down, user can re-expand)
  const phaseType = phase?.type;
  useEffect(() => {
    setHandHovered(false);
    selectHandCard(null);
  }, [phaseType, selectHandCard]);

  // Click/tap outside hand area collapses hand
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-hand-area]')) {
        setHandHovered(false);
        selectHandCard(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selectHandCard]);

  // Player can always manually expand/collapse their hand
  const isExpanded = handHovered || selectedHandIndex !== null || draggedIndex !== null || isDiscardPhase;

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
      onContextMenu={(e) => { e.preventDefault(); handleInspectAtPosition(e.clientX); }}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHandHovered(true); }}
    >
      {/* Fan layout — full card height container, clipped below viewport when collapsed */}
      <div
        className="relative flex items-end justify-center"
        style={{ height: 'var(--card-height)' }}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHandHovered(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHandHovered(false); }}
      >
        {hand.map((cardInstance, index) => {
          const instantCost = getCardCostPresentation(cardInstance.cardId, phase);
          const angle = cardCount > 1 ? -maxFanAngle + fanStep * index : 0;
          const isPlayable = playableIndices.has(index) || discardableIndices.has(index);
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
                costOverride={instantCost.costOverride}
                costHint={instantCost.costHint}
                highlightCost={instantCost.highlightCost}
                onClick={() => handleCardClick(index)}
                onDoubleClick={() => handleCardDoubleClick(index)}
                onHover={(hovering) => hoverCard(hovering ? cardInstance.cardId : null)}
                onLongPress={(pos) => handleInspectAtPosition(pos.x)}
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
            costOverride={draggedCardInstantCost?.costOverride}
            costHint={draggedCardInstantCost?.costHint}
            highlightCost={draggedCardInstantCost?.highlightCost}
            onClick={() => {}}
            onHover={() => {}}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
