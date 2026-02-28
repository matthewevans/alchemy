import { motion } from 'framer-motion';
import type { Element } from '@engine/types';
import { ELEMENT_META } from '@engine/elements';
import { getCardsByElement } from '@engine/cards';

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

function ElementBadge({ element }: { element: Element }) {
  const meta = ELEMENT_META[element];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: meta.color }}
    >
      {meta.name}
    </span>
  );
}

export function DeckSelector({ onSelectDeck, onBack }: DeckSelectorProps) {
  return (
    <div className="h-screen w-screen bg-slate-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.button
            className="px-4 py-2 rounded-lg bg-slate-800 text-white/70 text-sm font-medium hover:bg-slate-700 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
          >
            Back
          </motion.button>
          <h1 className="text-2xl font-bold text-white">Choose Your Deck</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Deck grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_DECKS.map((deck, i) => {
            const cardCount = deck.type === 'mono'
              ? getCardsByElement(deck.elements[0]).length * 2
              : deck.elements.reduce((sum, el) => sum + getCardsByElement(el).length, 0);

            return (
              <motion.button
                key={deck.name}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left hover:border-amber-500/50 hover:bg-slate-800 transition-colors cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectDeck(buildDeckCardIds(deck))}
              >
                <h2 className="text-lg font-bold text-white mb-2">{deck.name}</h2>
                <div className="flex gap-1.5 mb-2">
                  {deck.elements.map((el) => (
                    <ElementBadge key={el} element={el} />
                  ))}
                </div>
                <p className="text-white/50 text-xs mb-2">{deck.playstyle}</p>
                <p className="text-white/30 text-xs">{cardCount} cards</p>
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
