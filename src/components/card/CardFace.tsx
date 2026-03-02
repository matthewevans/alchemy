import { useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimationControls>;
import type { Keyword } from '@engine/types';
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
import { KeywordBadge } from './KeywordBadge';
import { EffectShorthand } from './EffectShorthand';

// ─── View level config ───

export type CardViewLevel = 'compact' | 'normal' | 'verbose';

interface ViewConfig {
  showCost: boolean;
  showTypeLabel: boolean;
  showTextBox: boolean;
  keywordDisplay: 'icons' | 'badges' | 'full';
}

const VIEW_CONFIG: Record<CardViewLevel, ViewConfig> = {
  compact: { showCost: false, showTypeLabel: false, showTextBox: false, keywordDisplay: 'icons' },
  normal:  { showCost: true,  showTypeLabel: true,  showTextBox: true,  keywordDisplay: 'badges' },
  verbose: { showCost: true,  showTypeLabel: true,  showTextBox: true,  keywordDisplay: 'full' },
} as const;

// ─── Props ───

export interface CardFaceStats {
  attack: number;
  health: number;
  baseAttack: number;
  isDamaged: boolean;
}

export interface CardFaceStatusEffect {
  icon: string;
  label: string;
  color: string;
}

export interface CardFaceProps {
  cardId: string;
  viewLevel: CardViewLevel;
  stats?: CardFaceStats;
  statFlashControls?: {
    attack: AnimationControls;
    health: AnimationControls;
  };
  statusEffects?: CardFaceStatusEffect[];
}

// ─── Component ───

export function CardFace({ cardId, viewLevel, stats, statFlashControls, statusEffects }: CardFaceProps) {
  const card = CARD_REGISTRY[cardId];
  const config = VIEW_CONFIG[viewLevel];
  const elementColor = getElementColor(card.element);
  const artGradient = getElementArtGradient(card.element);
  const elementIconPath = getElementIconPath(card.element);
  const frameGradient = getElementFrameGradient(card.element);
  const artPath = getCardArtPath(card.id, card.element);
  const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;
  const isCreature = card.type === 'creature';

  // Stat values: use overrides if provided, else base card stats
  const attack = stats?.attack ?? card.attack ?? 0;
  const health = stats?.health ?? card.health ?? 0;
  const isBuffedAttack = stats ? attack > stats.baseAttack : false;
  const isDamaged = stats?.isDamaged ?? false;

  return (
    <>
      {/* Card frame (outer gradient border) */}
      <div
        className="absolute inset-0 rounded-xl z-[1]"
        style={{
          background: frameGradient,
          opacity: viewLevel === 'compact' ? 0.6 : 0.7,
        }}
      />

      {/* Card inner body */}
      <div className="relative z-[2] flex flex-col m-[2px] rounded-[10px] overflow-hidden h-full bg-slate-900">
        {/* ── Name bar ── */}
        <div
          data-testid="hand-card-header"
          className={`flex items-center ${viewLevel === 'compact' ? 'gap-0.5 px-1 py-[1px]' : 'gap-1 px-1.5 py-[2px]'}`}
          style={{
            background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
            borderBottom: `1px solid ${elementColor}${viewLevel === 'compact' ? '33' : '44'}`,
          }}
        >
          {/* Compact: element icon before name (no cost shown) */}
          {!config.showCost && (
            <img
              src={elementIconPath}
              alt={card.element}
              className="shrink-0 select-none"
              draggable={false}
              style={{
                width: 'calc(var(--card-font-scale) * 0.6rem)',
                height: 'calc(var(--card-font-scale) * 0.6rem)',
                objectFit: 'contain',
              }}
            />
          )}

          {/* Card name */}
          <span
            className={`flex-1 text-white font-bold truncate ${viewLevel === 'compact' ? 'text-center' : ''}`}
            style={{ fontSize: `calc(var(--card-font-scale) * ${viewLevel === 'compact' ? '0.5' : '0.6'}rem)` }}
          >
            {card.name}
          </span>

          {/* Energy cost — element icon ×N (normal/verbose only) */}
          {config.showCost && (
            <div
              data-testid="hand-card-cost"
              className="shrink-0 flex items-center"
              style={{ gap: 'calc(var(--card-font-scale) * 0.05rem)' }}
            >
              <img
                src={elementIconPath}
                alt={`${card.cost} ${card.element}`}
                className="select-none drop-shadow-sm"
                draggable={false}
                style={{
                  width: 'calc(var(--card-font-scale) * 0.55rem)',
                  height: 'calc(var(--card-font-scale) * 0.55rem)',
                  objectFit: 'contain',
                }}
              />
              {card.cost > 1 && (
                <span
                  className="text-white/50 leading-none"
                  style={{ fontSize: 'calc(var(--card-font-scale) * 0.4rem)' }}
                >
                  ×<span className="font-bold text-white/80" style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}>{card.cost}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Art area ── */}
        <div
          className={`relative overflow-hidden ${viewLevel === 'compact' ? 'mx-[3px] mt-[3px] rounded' : 'mx-1 mt-1 rounded-md'}`}
          style={{
            flex: '1 1 0',
            minHeight: 0,
            background: artGradient,
          }}
        >
          {/* Element icon placeholder — visible when art is missing */}
          <img
            src={elementIconPath}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto select-none"
            draggable={false}
            style={{ width: '40%', opacity: 0.35 }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${artPath})` }}
          />

          {/* Keyword icons on art (compact only) */}
          {config.keywordDisplay === 'icons' && card.keywords.length > 0 && (
            <div
              className="absolute top-0.5 right-0.5 flex gap-0.5"
              style={{ fontSize: 'calc(var(--card-font-scale) * 0.55rem)' }}
            >
              {card.keywords.map((kw) => (
                <CompactKeywordIcon key={kw} keyword={kw} />
              ))}
            </div>
          )}

          {/* Art frame border */}
          <div
            className={`absolute inset-0 ${viewLevel === 'compact' ? 'rounded' : 'rounded-md'} pointer-events-none`}
            style={{ border: `1px solid ${elementColor}55` }}
          />
        </div>

        {/* ── Type label (normal/verbose only, overlaps art/text boundary) ── */}
        {config.showTypeLabel && (
          <div className="flex justify-center" style={{ marginTop: 'calc(var(--card-font-scale) * -0.35rem)' }}>
            <span
              data-testid="hand-card-type-label"
              className="relative z-[3] inline-flex rounded px-1.5 py-[1px] text-white/85 uppercase tracking-wide backdrop-blur-sm"
              style={{
                fontSize: 'calc(var(--card-font-scale) * 0.44rem)',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
              }}
            >
              {isCreature ? 'Creature' : 'Spell'}
            </span>
          </div>
        )}

        {/* ── Text box (normal/verbose only) ── */}
        {config.showTextBox && (
          <div
            className="mx-1 mb-1 px-1.5 rounded-md overflow-hidden"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              marginTop: 'calc(var(--card-font-scale) * -0.3rem)',
              paddingTop: 'calc(var(--card-font-scale) * 0.4rem)',
              paddingBottom: 'calc(var(--card-font-scale) * 0.2rem)',
            }}
          >
            {/* Keywords */}
            {card.keywords.length > 0 && (
              config.keywordDisplay === 'full' ? (
                <div className="flex flex-col gap-0.5 mb-0.5">
                  {card.keywords.map((kw) => {
                    const kwDef = KEYWORD_REGISTRY[kw];
                    return (
                      <div
                        key={kw}
                        className="flex items-start gap-1 leading-tight"
                        style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
                      >
                        <span>{kwDef.icon}</span>
                        <span className="text-white/80">
                          <span className="font-semibold text-amber-300 capitalize">{kwDef.name}</span>
                          {' \u2014 '}{kwDef.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-0.5">
                  {card.keywords.map((kw) => (
                    <KeywordBadge key={kw} keyword={kw} />
                  ))}
                </div>
              )
            )}

            {/* Effect */}
            {effect && (
              config.keywordDisplay === 'full' ? (
                <p
                  className="text-white/80 leading-tight"
                  style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
                >
                  {effect.description}
                </p>
              ) : (
                <EffectShorthand effect={effect} />
              )
            )}

            {/* Flavor text */}
            {card.flavor && (
              <p
                className="text-white/30 italic leading-tight mt-0.5"
                style={{ fontSize: 'calc(var(--card-font-scale) * 0.45rem)' }}
              >
                {card.flavor}
              </p>
            )}
          </div>
        )}

        {/* ── Status effects bar (compact view, between art and stat bar) ── */}
        {statusEffects && statusEffects.length > 0 && (
          <div
            className="flex items-center justify-center gap-1 mx-[3px] px-1"
            style={{
              height: 'calc(var(--card-font-scale) * 0.7rem)',
              fontSize: 'calc(var(--card-font-scale) * 0.4rem)',
              background: 'rgba(15, 23, 42, 0.8)',
            }}
          >
            {statusEffects.map((effect) => (
              <span
                key={effect.label}
                className="flex items-center gap-[1px] font-semibold"
                style={{ color: effect.color }}
              >
                <span>{effect.icon}</span>
                <span>{effect.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Stat bar (creatures only) ── */}
        {isCreature && (
          <div className={`flex justify-between items-center ${viewLevel === 'compact' ? 'px-[3px] py-[2px]' : 'px-1 pb-1 pt-0.5'}`}>
            {/* Attack */}
            <div
              className="flex items-center gap-0.5 rounded-md font-black"
              style={{
                fontSize: `calc(var(--card-font-scale) * ${viewLevel === 'compact' ? '0.65' : '0.75'}rem)`,
                padding: viewLevel === 'compact'
                  ? 'calc(var(--card-font-scale) * 0.08rem) calc(var(--card-font-scale) * 0.25rem)'
                  : 'calc(var(--card-font-scale) * 0.12rem) calc(var(--card-font-scale) * 0.3rem)',
                color: isBuffedAttack ? '#bbf7d0' : stats ? '#fecaca' : 'rgb(254 226 226)',
                background: isBuffedAttack
                  ? 'rgba(34, 197, 94, 0.25)'
                  : 'rgba(239, 68, 68, 0.25)',
                border: isBuffedAttack
                  ? '1px solid rgba(134, 239, 172, 0.6)'
                  : '1px solid rgba(252, 165, 165, 0.6)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
              }}
            >
              <span className="leading-none">⚔</span>
              {statFlashControls ? (
                <motion.span className="leading-none" animate={statFlashControls.attack}>
                  {attack}
                </motion.span>
              ) : (
                <span className="leading-none">{attack}</span>
              )}
            </div>

            {/* Health */}
            <div
              className="flex items-center gap-0.5 rounded-md font-black"
              style={{
                fontSize: `calc(var(--card-font-scale) * ${viewLevel === 'compact' ? '0.65' : '0.75'}rem)`,
                padding: viewLevel === 'compact'
                  ? 'calc(var(--card-font-scale) * 0.08rem) calc(var(--card-font-scale) * 0.25rem)'
                  : 'calc(var(--card-font-scale) * 0.12rem) calc(var(--card-font-scale) * 0.3rem)',
                color: isDamaged ? '#fecaca' : stats ? '#bbf7d0' : 'rgb(187 247 208)',
                background: isDamaged
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(34, 197, 94, 0.25)',
                border: isDamaged
                  ? '1px solid rgba(252, 165, 165, 0.6)'
                  : '1px solid rgba(134, 239, 172, 0.6)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
              }}
            >
              <span className="leading-none">♥</span>
              {statFlashControls ? (
                <motion.span className="leading-none" animate={statFlashControls.health}>
                  {health}
                </motion.span>
              ) : (
                <span className="leading-none">{health}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Compact keyword icon with hover tooltip ───

function CompactKeywordIcon({ keyword }: { keyword: Keyword }) {
  const [hovered, setHovered] = useState(false);
  const kwDef = KEYWORD_REGISTRY[keyword];

  return (
    <span
      className="relative drop-shadow-md cursor-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setHovered((prev) => !prev); }}
    >
      {kwDef.icon}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute top-full right-0 mt-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-300/30 shadow-[0_8px_24px_rgba(0,0,0,0.7)] whitespace-nowrap z-50 pointer-events-none"
            style={{ fontSize: '11px' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-amber-300 font-bold capitalize">{kwDef.name}</span>
            <span className="text-white"> — {kwDef.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
