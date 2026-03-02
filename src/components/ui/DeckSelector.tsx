import { motion, useReducedMotion } from 'framer-motion';
import type { Element, Tier } from '@engine/types';
import { ELEMENT_META } from '@engine/elements';
import { TIER_ORDER } from '@engine/ruleset';
import { STARTER_DECKS, buildStarterDeck } from '@engine/starterDecks';
import type { AIDifficulty } from '@engine/aiConfig';
import { DIFFICULTY_ORDER, DIFFICULTY_LABELS } from '@engine/aiConfig';
import { getElementColor, getElementIconPath } from '@components/card/cardUtils';
import { gameButtonClass } from './buttonStyles';

const TIER_LABELS: Record<Tier, { label: string; description: string }> = {
  apprentice: { label: 'Apprentice', description: 'Simple rules, small decks' },
  alchemist: { label: 'Alchemist', description: 'More keywords, bigger decks' },
  archmage: { label: 'Archmage', description: 'Full rules, combat tricks' },
};

export interface DeckSelectorProps {
  onSelectDeck: (deckCardIds: string[]) => void;
  onBack: () => void;
  tier?: Tier;
  onTierChange?: (tier: Tier) => void;
  difficulty?: AIDifficulty;
  onDifficultyChange?: (difficulty: AIDifficulty) => void;
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

export function DeckSelector({ onSelectDeck, onBack, tier = 'apprentice', onTierChange, difficulty = 'medium', onDifficultyChange }: DeckSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

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
            Choose Your Deck
          </motion.h1>
        </div>

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
                onClick={() => onTierChange(t)}
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
                  borderColor: `${primaryColor}33`,
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
                onClick={() => onSelectDeck(buildStarterDeck(deck, tier))}
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
    </div>
  );
}

/** Re-exported for use in App.tsx to determine the deck's primary element. */
export { STARTER_DECKS } from '@engine/starterDecks';
export type { StarterDeck } from '@engine/starterDecks';
