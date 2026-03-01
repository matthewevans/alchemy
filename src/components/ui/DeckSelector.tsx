import { motion } from 'framer-motion';
import type { Element } from '@engine/types';
import { ELEMENT_META } from '@engine/elements';
import { getCardsByElement } from '@engine/cards';
import { getElementColor, getElementIconPath } from '@components/card/cardUtils';
import { gameButtonClass } from './buttonStyles';

interface DeckSelectorProps {
  onSelectDeck: (deckCardIds: string[]) => void;
  onBack: () => void;
}

interface DeckOption {
  name: string;
  elements: Element[];
  playstyle: string;
  type: 'mono' | 'allied';
}

const STARTER_DECKS: DeckOption[] = [
  // Mono decks
  { name: 'Inferno', elements: ['fire'], playstyle: 'Aggressive burns and swift attackers', type: 'mono' },
  { name: 'Tidepool', elements: ['water'], playstyle: 'Healing, card draw, and tough defenders', type: 'mono' },
  { name: 'Deepwood', elements: ['earth'], playstyle: 'Sturdy creatures and steady growth', type: 'mono' },
  { name: 'Stormfront', elements: ['air'], playstyle: 'Fast strikers and tricky spells', type: 'mono' },
  { name: 'Nightfall', elements: ['shadow'], playstyle: 'Ruthless removal and power plays', type: 'mono' },
  // Allied pair decks
  { name: 'Tsunami', elements: ['water', 'air'], playstyle: 'Evasive tempo with card advantage', type: 'allied' },
  { name: 'Ancient Grove', elements: ['air', 'earth'], playstyle: 'Swift creatures backed by sturdy walls', type: 'allied' },
  { name: 'Wildfire', elements: ['earth', 'fire'], playstyle: 'Big creatures with burn backup', type: 'allied' },
  { name: 'Hellfire', elements: ['fire', 'shadow'], playstyle: 'Aggressive damage and removal', type: 'allied' },
  { name: 'Deep Dark', elements: ['shadow', 'water'], playstyle: 'Draining life while drawing cards', type: 'allied' },
];

function buildDeckCardIds(deck: DeckOption): string[] {
  if (deck.type === 'mono') {
    const cards = getCardsByElement(deck.elements[0]);
    // 2 copies of each card = 20 cards
    return cards.flatMap((c) => [c.id, c.id]);
  }
  // Allied: 1 copy of each card from each element = 20 cards
  const cards0 = getCardsByElement(deck.elements[0]);
  const cards1 = getCardsByElement(deck.elements[1]);
  return [...cards0.map((c) => c.id), ...cards1.map((c) => c.id)];
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

export function DeckSelector({ onSelectDeck, onBack }: DeckSelectorProps) {
  return (
    <div className="h-screen w-screen bg-slate-950 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-8">
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
          <h1 className="text-2xl font-bold text-white">Choose Your Deck</h1>
        </div>

        {/* Deck grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_DECKS.map((deck, i) => {
            const cardCount = deck.type === 'mono'
              ? getCardsByElement(deck.elements[0]).length * 2
              : deck.elements.reduce((sum, el) => sum + getCardsByElement(el).length, 0);

            // Primary element color for the card border accent
            const primaryColor = getElementColor(deck.elements[0]);

            return (
              <motion.button
                key={deck.name}
                className={gameButtonClass({
                  tone: 'neutral',
                  size: 'md',
                  className:
                    'relative w-full sm:min-h-[11.5rem] p-4 rounded-xl bg-slate-800/65 text-left hover:bg-slate-800/80 overflow-hidden flex flex-col items-start justify-start',
                })}
                style={{
                  borderColor: `${primaryColor}33`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ scale: 1.03, borderColor: `${primaryColor}88` }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectDeck(buildDeckCardIds(deck))}
              >
                {/* Element icon watermark */}
                <img
                  src={getElementIconPath(deck.elements[0])}
                  alt=""
                  className="absolute -right-4 -top-4 w-24 h-24 object-contain opacity-10 pointer-events-none"
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

/** Exported for use in App.tsx to determine the deck's primary element. */
export { STARTER_DECKS };
