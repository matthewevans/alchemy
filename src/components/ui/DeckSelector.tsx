import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Element, Tier } from '@engine/types';
import { ELEMENT_META } from '@engine/elements';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { TIER_ORDER } from '@engine/ruleset';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import type { StarterDeck } from '@engine/starterDecks';
import type { AIDifficulty } from '@engine/aiConfig';
import { DIFFICULTY_ORDER, DIFFICULTY_LABELS } from '@engine/aiConfig';
import { getElementColor, getElementIconPath } from '@components/card/cardUtils';
import { CardPreview } from '@components/card/CardPreview';
import { gameButtonClass } from './buttonStyles';
import { AudioMuteButton } from './AudioMuteButton';

const TIER_LABELS: Record<Tier, { label: string; description: string }> = {
  apprentice: { label: 'Apprentice', description: 'Simple rules, small decks' },
  alchemist: { label: 'Alchemist', description: 'More keywords, bigger decks' },
  archmage: { label: 'Archmage', description: 'Full rules, combat tricks' },
};

export interface DeckSelectorProps {
  onSelectDeck: (deckCardIds: string[]) => void;
  onBack: () => void;
  onCloneToDeckBuilder?: (name: string, cardIds: string[]) => void;
  tier?: Tier;
  onTierChange?: (tier: Tier) => void;
  difficulty?: AIDifficulty;
  onDifficultyChange?: (difficulty: AIDifficulty) => void;
  title?: string;
  subtitle?: string;
}

function ElementIcon({ element }: { element: Element }) {
  const color = getElementColor(element);
  const iconPath = getElementIconPath(element);
  const meta = ELEMENT_META[element];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
    >
      <img
        src={iconPath}
        alt={meta.name}
        className="w-5 h-5 object-contain"
      />
      <span
        className="text-xs font-semibold capitalize"
        style={{ color }}
      >
        {meta.name}
      </span>
    </div>
  );
}

export function DeckSelector({
  onSelectDeck,
  onBack,
  onCloneToDeckBuilder,
  tier = 'apprentice',
  onTierChange,
  difficulty = 'medium',
  onDifficultyChange,
  title = 'Choose Your Deck',
  subtitle,
}: DeckSelectorProps) {
  const shouldReduceMotion = useReducedMotion();
  const [inspectedDeck, setInspectedDeck] = useState<StarterDeck | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-6">
          <motion.button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'absolute left-0 px-4 py-2 font-medium',
            })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
          >
            Back
          </motion.button>
          <motion.h1
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {title}
          </motion.h1>
        </div>
        {subtitle && (
          <motion.p
            className="text-center text-xs text-white/60 mb-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {subtitle}
          </motion.p>
        )}

        {/* Tier selector — hidden when onTierChange is not provided (e.g. multiplayer) */}
        {onTierChange && <div className="flex justify-center gap-2 mb-4">
          {TIER_ORDER.map((t) => {
            const isActive = t === tier;
            return (
              <motion.button
                key={t}
                className={gameButtonClass({
                  tone: isActive ? 'amber' : 'neutral',
                  size: 'sm',
                  className: `px-4 py-1.5 text-sm font-semibold ${isActive ? '' : 'opacity-60'}`,
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { onTierChange(t); setInspectedDeck(null); }}
              >
                <div className="flex flex-col items-center">
                  <span>{TIER_LABELS[t].label}</span>
                  <span className={`text-[10px] font-normal ${isActive ? 'text-white/70' : 'text-white/40'}`}>
                    {TIER_LABELS[t].description}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>}

        {/* AI Difficulty selector */}
        {onDifficultyChange && <div className="flex justify-center gap-1.5 mb-6">
          {DIFFICULTY_ORDER.map((d) => {
            const isActive = d === difficulty;
            return (
              <motion.button
                key={d}
                className={gameButtonClass({
                  tone: isActive ? 'indigo' : 'neutral',
                  size: 'xs',
                  className: `px-3 py-1 text-xs font-semibold ${isActive ? '' : 'opacity-50'}`,
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDifficultyChange(d)}
                title={DIFFICULTY_LABELS[d].description}
              >
                {DIFFICULTY_LABELS[d].label}
              </motion.button>
            );
          })}
        </div>}

        {/* Deck grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_DECKS.map((deck, i) => {
            const cardCount = buildStarterDeck(deck, tier).length;
            const primaryColor = getElementColor(deck.elements[0]);
            const isSelected = inspectedDeck === deck;

            return (
              <motion.button
                key={deck.name}
                data-testid={`deck-option-${deck.elements[0]}`}
                className={gameButtonClass({
                  tone: 'neutral',
                  size: 'md',
                  className:
                    'relative w-full sm:min-h-[11.5rem] p-4 rounded-xl bg-slate-800/65 text-left hover:bg-slate-800/80 overflow-hidden flex flex-col items-start justify-start',
                })}
                style={{
                  borderColor: isSelected ? `${primaryColor}aa` : `${primaryColor}33`,
                  boxShadow: isSelected ? `0 0 20px ${primaryColor}33, inset 0 0 20px ${primaryColor}11` : undefined,
                }}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileHover={shouldReduceMotion ? undefined : {
                  scale: 1.03,
                  borderColor: `${primaryColor}88`,
                  boxShadow: `0 0 20px ${primaryColor}22, 0 4px 16px rgba(0,0,0,0.3)`,
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setInspectedDeck(isSelected ? null : deck)}
              >
                {/* Element icon watermark */}
                <motion.img
                  src={getElementIconPath(deck.elements[0])}
                  alt=""
                  className="absolute -right-4 -top-4 w-24 h-24 object-contain opacity-10 pointer-events-none"
                  initial={{ opacity: 0, rotate: -20 }}
                  animate={{ opacity: 0.1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06 + 0.2 }}
                />

                <h2 className="text-lg leading-tight font-bold text-white mb-2 relative whitespace-normal break-words">{deck.name}</h2>
                <div className="flex flex-wrap gap-2 mb-2 relative">
                  {deck.elements.map((el) => (
                    <ElementIcon key={el} element={el} />
                  ))}
                </div>
                <p className="text-white/65 text-sm leading-snug mb-2 relative whitespace-normal break-words">{deck.playstyle}</p>
                <p className="text-white/45 text-xs relative mt-auto">{cardCount} cards</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Deck detail panel */}
      <AnimatePresence>
        {inspectedDeck && (
          <DeckDetailPanel
            deck={inspectedDeck}
            tier={tier}
            onPlay={() => onSelectDeck(buildStarterDeck(inspectedDeck, tier))}
            onClone={onCloneToDeckBuilder ? () => {
              const cardIds = buildStarterDeck(inspectedDeck, tier);
              onCloneToDeckBuilder(inspectedDeck.name, cardIds);
            } : undefined}
            onClose={() => setInspectedDeck(null)}
            onPreviewCard={setPreviewCardId}
          />
        )}
      </AnimatePresence>

      {/* Card preview overlay */}
      <AnimatePresence>
        {previewCardId && (
          <CardPreview cardId={previewCardId} onDismiss={() => setPreviewCardId(null)} />
        )}
      </AnimatePresence>

      {/* Bottom-right quick audio toggle */}
      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30">
        <AudioMuteButton className="w-14 h-14 p-0 rounded-full flex items-center justify-center text-white/40 hover:text-white/70" />
      </div>
    </div>
  );
}

// ─── Deck Detail Panel ───

interface DeckDetailPanelProps {
  deck: StarterDeck;
  tier: Tier;
  onPlay: () => void;
  onClone?: () => void;
  onClose: () => void;
  onPreviewCard: (cardId: string) => void;
}

function DeckDetailPanel({ deck, tier, onPlay, onClone, onClose, onPreviewCard }: DeckDetailPanelProps) {
  const cardIds = useMemo(() => buildStarterDeck(deck, tier), [deck, tier]);
  const primaryColor = getElementColor(deck.elements[0]);

  // Group cards by id with counts, sorted by cost
  const cardEntries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => ({ card: CARD_REGISTRY[id], count }))
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [cardIds]);

  const handleCardClick = useCallback((cardId: string) => {
    onPreviewCard(cardId);
  }, [onPreviewCard]);

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-slate-900/98 border-t backdrop-blur-sm flex flex-col h-dvh max-h-dvh md:inset-x-0 md:bottom-0 md:top-auto md:h-auto md:max-h-[60vh]"
      style={{
        borderColor: `${primaryColor}44`,
      }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{deck.name}</h2>
          <p className="text-white/50 text-xs">{cardIds.length} cards</p>
        </div>
        <button
          className={gameButtonClass({ tone: 'neutral', size: 'sm', className: 'px-3 text-sm' })}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="max-w-2xl mx-auto space-y-px">
          {cardEntries.map(({ card, count }) => {
            const color = getElementColor(card.element);
            const iconPath = getElementIconPath(card.element);
            return (
              <button
                key={card.id}
                className="w-full flex items-center h-10 rounded overflow-hidden transition-colors hover:brightness-125 cursor-pointer text-left"
                style={{
                  background: `linear-gradient(90deg, ${color}15 0%, ${color}08 60%, transparent 100%)`,
                  borderLeft: `2px solid ${color}`,
                }}
                onClick={() => handleCardClick(card.id)}
              >
                <div className="shrink-0 w-8 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{card.cost}</span>
                </div>
                <img src={iconPath} alt="" className="w-4 h-4 shrink-0 opacity-70" />
                <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate">{card.name}</span>
                  {card.type === 'creature' && (
                    <span className="text-white/40 text-xs shrink-0">{card.attack}/{card.health}</span>
                  )}
                  {card.keywords.length > 0 && (
                    <span className="text-amber-300/60 text-xs shrink-0 truncate">
                      {card.keywords.map((kw) => KEYWORD_REGISTRY[kw].name).join(', ')}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-white/40 text-xs pr-3 tabular-nums">x{count}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10">
        <div className="max-w-2xl mx-auto flex gap-3">
          <motion.button
            className={gameButtonClass({
              tone: 'emerald',
              size: 'md',
              className: 'flex-1 font-bold',
            })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPlay}
          >
            Play
          </motion.button>
          {onClone && (
            <motion.button
              className={gameButtonClass({
                tone: 'amber',
                size: 'md',
                className: 'flex-1 font-bold',
              })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClone}
            >
              Clone to Builder
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Re-exported for use in App.tsx to determine the deck's primary element. */
export { STARTER_DECKS } from '@engine/starterDecks';
export type { StarterDeck } from '@engine/starterDecks';
