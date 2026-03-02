import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import {
  getElementColor,
  getElementArtGradient,
  getElementIconPath,
  getElementFrameGradient,
  getCardArtPath,
} from './cardUtils';

interface CardPreviewProps {
  cardId: string;
  onDismiss: () => void;
}

export function CardPreview({ cardId, onDismiss }: CardPreviewProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const frameGradient = getElementFrameGradient(card.element);
  const artGradient = getElementArtGradient(card.element);
  const elementIconPath = getElementIconPath(card.element);
  const artPath = getCardArtPath(card.id, card.element);
  const [artFailed, setArtFailed] = useState(false);
  const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;
  const isCreature = card.type === 'creature';
  const dialogRef = useDialogA11y({ open: true, onClose: onDismiss });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDismiss}
    >
      {/* Darkened backdrop with blur */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Element-colored radial spotlight */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${elementColor}30, ${elementColor}10 40%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 0.8, 0.6], scale: [0.3, 1.2, 1] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* The card */}
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} details`}
        tabIndex={-1}
        className="relative w-[min(250px,85vw)] max-h-[85vh] rounded-2xl overflow-hidden"
        style={{
          filter: `drop-shadow(0 0 30px ${elementColor}55) drop-shadow(0 8px 24px rgba(0,0,0,0.5))`,
        }}
        initial={{ scale: 0.5, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Frame border */}
        <div
          className="absolute inset-0 rounded-2xl z-0"
          style={{ background: frameGradient, opacity: 0.7 }}
        />

        {/* Inner body */}
        <div className="relative z-[1] m-[3px] rounded-[13px] overflow-hidden bg-slate-900 flex flex-col">
          {/* Name bar */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
              borderBottom: `1px solid ${elementColor}44`,
            }}
          >
            <span className="flex-1 text-white font-bold text-base truncate">
              {card.name}
            </span>
            <div className="shrink-0 flex items-center gap-0.5">
              <img
                src={elementIconPath}
                alt={card.element}
                className="w-5 h-5 select-none"
                draggable={false}
              />
              {card.cost > 1 && (
                <span className="text-white/50 text-sm">
                  ×<span className="font-bold text-white/80">{card.cost}</span>
                </span>
              )}
            </div>
          </div>

          {/* Art — locked to 3:2 aspect ratio */}
          <div
            className="relative mx-2 mt-2 rounded-lg overflow-hidden"
            style={{ aspectRatio: '3 / 2', background: artFailed ? artGradient : undefined }}
          >
            {artFailed ? (
              <img
                src={elementIconPath}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 m-auto select-none"
                draggable={false}
                style={{ width: '40%', opacity: 0.35 }}
              />
            ) : (
              <img
                src={artPath}
                alt={card.name}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                onError={() => setArtFailed(true)}
              />
            )}
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ border: `1px solid ${elementColor}55` }}
            />
          </div>

          {/* Type label */}
          <div className="flex justify-center -mt-3 relative z-[2]">
            <span
              className="inline-flex rounded px-2 py-0.5 text-white/85 uppercase tracking-wide text-xs backdrop-blur-sm"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
              }}
            >
              {isCreature ? 'Creature' : 'Spell'}
            </span>
          </div>

          {/* Description box — fills remaining space */}
          <div
            className="flex-1 mx-2 mb-2 px-3 py-2 rounded-lg -mt-1.5"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            {card.keywords.length > 0 && (
              <div className="flex flex-col gap-1 mb-1.5">
                {card.keywords.map((kw) => {
                  const kwDef = KEYWORD_REGISTRY[kw];
                  return (
                    <div key={kw} className="flex items-start gap-1.5 text-sm leading-tight">
                      <span>{kwDef.icon}</span>
                      <span className="text-white/80">
                        <span className="font-semibold text-amber-300 capitalize">{kwDef.name}</span>
                        {' \u2014 '}{kwDef.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {effect && (
              <p className="text-white/80 text-sm leading-tight">{effect.description}</p>
            )}
            {card.flavor && (
              <p className="text-white/30 italic text-xs leading-tight mt-1.5">{card.flavor}</p>
            )}
          </div>

          {/* Stat bar — creatures only, prominent */}
          {isCreature && (
            <div className="flex justify-between items-center px-3 pb-3">
              <div
                className="flex items-center gap-1.5 rounded-lg font-black text-xl px-3 py-1.5"
                style={{
                  color: '#fecaca',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(252, 165, 165, 0.6)',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
                }}
              >
                <span>⚔</span>
                <span>{card.attack ?? 0}</span>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-lg font-black text-xl px-3 py-1.5"
                style={{
                  color: '#bbf7d0',
                  background: 'rgba(34, 197, 94, 0.25)',
                  border: '1px solid rgba(134, 239, 172, 0.6)',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
                }}
              >
                <span>♥</span>
                <span>{card.health ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
