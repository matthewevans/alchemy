import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element, CardDefinition, Tier } from '@engine/types';
import { ALL_CARDS, CARD_REGISTRY } from '@engine/cards';
import { ELEMENTS, ELEMENT_META } from '@engine/elements';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { EFFECT_REGISTRY } from '@engine/effects';
import { TIER_CONFIGS } from '@engine/ruleset';
import { validateDeck } from '@engine/deck';
import { getElementColor, getElementIconPath } from '@components/card/cardUtils';
import { loadSavedDecks, saveDeck, deleteDeck } from '@storage/deckStorage';
import { encodeDeck, decodeDeck } from '@storage/shareCode';
import type { SavedDeck } from '@storage/deckStorage';

interface DeckBuilderProps {
  onSelectDeck: (deckCardIds: string[]) => void;
  onBack: () => void;
}

type ElementFilter = Element | 'all';

const TIER: Tier = 'apprentice';
const RULESET = TIER_CONFIGS[TIER];

export function DeckBuilder({ onSelectDeck, onBack }: DeckBuilderProps) {
  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>({});
  const [deckName, setDeckName] = useState('My Deck');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>(() => loadSavedDecks());
  const [shareInput, setShareInput] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  const filteredCards = useMemo(
    () =>
      elementFilter === 'all'
        ? ALL_CARDS
        : ALL_CARDS.filter((c) => c.element === elementFilter),
    [elementFilter],
  );

  // Group filtered cards by cost for MTGA-style display
  const groupedCards = useMemo(() => {
    const groups = new Map<number, CardDefinition[]>();
    for (const card of filteredCards) {
      const existing = groups.get(card.cost) ?? [];
      existing.push(card);
      groups.set(card.cost, existing);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [filteredCards]);

  const deckCardIds = useMemo(() => {
    const ids: string[] = [];
    for (const [cardId, count] of Object.entries(deckCounts)) {
      for (let i = 0; i < count; i++) ids.push(cardId);
    }
    return ids;
  }, [deckCounts]);

  const totalCards = deckCardIds.length;
  const validation = useMemo(() => validateDeck(deckCardIds, RULESET), [deckCardIds]);

  // Mana curve data
  const manaCurve = useMemo(() => {
    const curve: Record<number, number> = {};
    for (const [cardId, count] of Object.entries(deckCounts)) {
      const card = CARD_REGISTRY[cardId];
      curve[card.cost] = (curve[card.cost] ?? 0) + count;
    }
    return curve;
  }, [deckCounts]);

  const maxCurveHeight = Math.max(1, ...Object.values(manaCurve));

  // Deck entries sorted by cost
  const deckEntries = useMemo(() => {
    return Object.entries(deckCounts)
      .filter(([, count]) => count > 0)
      .map(([cardId, count]) => ({ card: CARD_REGISTRY[cardId], count }))
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [deckCounts]);

  // ─── Deck Manipulation ───

  const addCard = useCallback(
    (cardId: string) => {
      setDeckCounts((prev) => {
        const current = prev[cardId] ?? 0;
        if (current >= RULESET.maxCopiesPerCard) return prev;
        if (totalCards >= RULESET.deckSize) return prev;
        return { ...prev, [cardId]: current + 1 };
      });
    },
    [totalCards],
  );

  const removeCard = useCallback((cardId: string) => {
    setDeckCounts((prev) => {
      const current = prev[cardId] ?? 0;
      if (current <= 0) return prev;
      if (current === 1) {
        const { [cardId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cardId]: current - 1 };
    });
  }, []);

  // ─── Save / Load / Share ───

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  }, []);

  const handleSave = useCallback(() => {
    const deck: SavedDeck = {
      id: crypto.randomUUID(),
      name: deckName,
      tier: TIER,
      cardIds: deckCardIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveDeck(deck);
    setSavedDecks(loadSavedDecks());
    showToast('Deck saved!');
  }, [deckName, deckCardIds, showToast]);

  const handleLoad = useCallback((deck: SavedDeck) => {
    setDeckName(deck.name);
    const counts: Record<string, number> = {};
    for (const id of deck.cardIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
    setDeckCounts(counts);
    setShowSaved(false);
  }, []);

  const handleDelete = useCallback(
    (deckId: string) => {
      deleteDeck(deckId);
      setSavedDecks(loadSavedDecks());
      showToast('Deck deleted');
    },
    [showToast],
  );

  const handleExport = useCallback(() => {
    const code = encodeDeck(deckCardIds, TIER);
    setShareCode(code);
    navigator.clipboard.writeText(code).then(
      () => showToast('Share code copied!'),
      () => showToast('Code generated (copy manually)'),
    );
  }, [deckCardIds, showToast]);

  const handleImport = useCallback(() => {
    const result = decodeDeck(shareInput.trim());
    if (!result) {
      showToast('Invalid share code');
      return;
    }
    const counts: Record<string, number> = {};
    for (const id of result.cardIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
    setDeckCounts(counts);
    setShareInput('');
    showToast('Deck imported!');
  }, [shareInput, showToast]);

  const handlePlay = useCallback(() => {
    if (!validation.valid) return;
    onSelectDeck(deckCardIds);
  }, [validation.valid, deckCardIds, onSelectDeck]);

  const handleClear = useCallback(() => {
    setDeckCounts({});
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* ═══ Top Bar ═══ */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/5">
        <motion.button
          className="px-3 py-1.5 rounded bg-white/5 text-white/60 text-sm hover:bg-white/10 hover:text-white cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
        >
          Back
        </motion.button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Element filter pills */}
        <button
          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            elementFilter === 'all'
              ? 'bg-white/15 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
          onClick={() => setElementFilter('all')}
        >
          All
        </button>
        {ELEMENTS.map((el) => {
          const color = getElementColor(el);
          return (
            <button
              key={el}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: elementFilter === el ? color + '33' : undefined,
                color: elementFilter === el ? color : 'rgba(255,255,255,0.4)',
              }}
              onClick={() => setElementFilter(el)}
            >
              <img src={getElementIconPath(el)} alt="" className="w-3.5 h-3.5" />
              {ELEMENT_META[el].name}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Deck name */}
        <input
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm w-40 focus:outline-none focus:border-amber-500/40"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
        />

        <motion.button
          className="px-3 py-1.5 rounded bg-amber-600/80 text-white text-sm font-medium hover:bg-amber-500 cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
        >
          Save
        </motion.button>

        <motion.button
          className="px-3 py-1.5 rounded bg-white/5 text-white/60 text-sm hover:bg-white/10 cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSaved(!showSaved)}
        >
          Load
        </motion.button>
      </div>

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ── Collection (left) ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-4">
            {groupedCards.map(([cost, cards]) => (
              <div key={cost}>
                {/* Cost group header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-300 text-xs font-bold">{cost}</span>
                  </div>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-white/20 text-xs">{cards.length} cards</span>
                </div>

                {/* MTGA-style card bars */}
                <div className="space-y-px">
                  {cards.map((card) => (
                    <CollectionCardBar
                      key={card.id}
                      card={card}
                      count={deckCounts[card.id] ?? 0}
                      maxCopies={RULESET.maxCopiesPerCard}
                      deckFull={totalCards >= RULESET.deckSize}
                      onAdd={() => addCard(card.id)}
                      onRemove={() => removeCard(card.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Deck Panel (right) — MTGA-style narrow sidebar ── */}
        <div className="w-64 shrink-0 flex flex-col min-h-0 bg-black/40 border-l border-white/5">
          {/* Deck header + count */}
          <div className="shrink-0 px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Deck</span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  totalCards === RULESET.deckSize ? 'text-emerald-400' : 'text-white/50'
                }`}
              >
                {totalCards} / {RULESET.deckSize}
              </span>
            </div>

            {/* Mana curve */}
            <div className="flex items-end gap-px h-10 mb-1">
              {Array.from({ length: 6 }, (_, i) => {
                const cost = i + 1;
                const count = manaCurve[cost] ?? 0;
                const height = count > 0 ? Math.max(4, (count / maxCurveHeight) * 32) : 0;
                return (
                  <div key={cost} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t transition-all duration-200"
                      style={{
                        height,
                        backgroundColor: count > 0 ? '#f59e0b' : 'transparent',
                        opacity: count > 0 ? 0.6 : 0,
                      }}
                    />
                    <span className="text-white/30 text-[9px] tabular-nums">{cost}{i === 5 ? '+' : ''}</span>
                  </div>
                );
              })}
            </div>

            {!validation.valid && totalCards > 0 && (
              <div className="mt-1">
                {validation.errors.map((err) => (
                  <p key={err} className="text-red-400/80 text-[10px]">{err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Deck card list — MTGA horizontal bars */}
          <div className="flex-1 overflow-y-auto px-2">
            {deckEntries.length === 0 ? (
              <p className="text-white/20 text-xs text-center mt-6">Add cards from the collection</p>
            ) : (
              <div className="space-y-px">
                {deckEntries.map(({ card, count }) => (
                  <DeckCardBar
                    key={card.id}
                    card={card}
                    count={count}
                    maxCopies={RULESET.maxCopiesPerCard}
                    onClick={() => removeCard(card.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Share + actions */}
          <div className="shrink-0 p-2 border-t border-white/5 space-y-1.5">
            {/* Share code row */}
            <div className="flex gap-1">
              <input
                className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-[10px] font-mono focus:outline-none focus:border-amber-500/40"
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                placeholder="Paste share code..."
              />
              <button
                className="px-2 py-1 rounded bg-white/10 text-white/60 text-[10px] hover:bg-white/15 cursor-pointer"
                onClick={handleImport}
              >
                Import
              </button>
            </div>
            <div className="flex gap-1">
              <button
                className="flex-1 px-2 py-1 rounded bg-white/10 text-white/60 text-[10px] hover:bg-white/15 cursor-pointer"
                onClick={handleExport}
              >
                Export
              </button>
              <button
                className="flex-1 px-2 py-1 rounded bg-white/10 text-white/60 text-[10px] hover:bg-white/15 cursor-pointer"
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
            {shareCode && (
              <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 text-[10px] font-mono break-all">{shareCode}</p>
              </div>
            )}

            {/* Play button */}
            <motion.button
              className={`w-full py-2 rounded-lg font-bold text-sm cursor-pointer ${
                validation.valid
                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
              whileHover={validation.valid ? { scale: 1.02 } : {}}
              whileTap={validation.valid ? { scale: 0.98 } : {}}
              onClick={handlePlay}
              disabled={!validation.valid}
            >
              Play
            </motion.button>
          </div>
        </div>

        {/* ── Saved Decks Dropdown ── */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              className="absolute top-0 right-64 w-56 bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden z-20"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="px-3 py-2 border-b border-white/10">
                <span className="text-white/60 text-xs font-medium">Saved Decks</span>
              </div>
              {savedDecks.length === 0 ? (
                <p className="px-3 py-4 text-white/30 text-xs text-center">No saved decks</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {savedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group"
                    >
                      <button
                        className="flex-1 text-left text-white/70 text-xs hover:text-white truncate cursor-pointer"
                        onClick={() => handleLoad(deck)}
                      >
                        {deck.name}
                        <span className="text-white/30 ml-1">({deck.cardIds.length})</span>
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 text-xs transition-opacity cursor-pointer"
                        onClick={() => handleDelete(deck.id)}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white text-sm shadow-xl z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MTGA-Style Card Bar (Collection) ───

function CollectionCardBar({
  card,
  count,
  maxCopies,
  deckFull,
  onAdd,
  onRemove,
}: {
  card: CardDefinition;
  count: number;
  maxCopies: number;
  deckFull: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const color = getElementColor(card.element);
  const iconPath = getElementIconPath(card.element);
  const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;
  const canAdd = count < maxCopies && !deckFull;

  return (
    <div
      className="group flex items-center h-9 rounded overflow-hidden transition-colors hover:brightness-125 cursor-pointer"
      style={{
        background: `linear-gradient(90deg, ${color}15 0%, ${color}08 60%, transparent 100%)`,
        borderLeft: `2px solid ${color}`,
      }}
      onClick={canAdd ? onAdd : undefined}
    >
      {/* Cost */}
      <div className="shrink-0 w-7 flex items-center justify-center">
        <span className="text-white font-bold text-xs">{card.cost}</span>
      </div>

      {/* Element icon */}
      <img src={iconPath} alt="" className="w-4 h-4 shrink-0 opacity-60" />

      {/* Name + info */}
      <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
        <span className="text-white text-xs font-medium truncate">{card.name}</span>
        {card.type === 'creature' && (
          <span className="text-white/30 text-[10px] shrink-0">{card.attack}/{card.health}</span>
        )}
        {card.keywords.length > 0 && (
          <span className="text-amber-300/50 text-[10px] shrink-0 truncate">
            {card.keywords.map((kw) => KEYWORD_REGISTRY[kw].name).join(', ')}
          </span>
        )}
        {effect && !card.keywords.length && (
          <span className="text-white/25 text-[10px] truncate">{effect.description}</span>
        )}
      </div>

      {/* Quantity dots (MTGA style) */}
      <div className="shrink-0 flex items-center gap-0.5 px-1">
        {Array.from({ length: maxCopies }, (_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: i < count ? color : 'rgba(255,255,255,0.1)',
              boxShadow: i < count ? `0 0 4px ${color}66` : 'none',
            }}
          />
        ))}
      </div>

      {/* +/- buttons on hover */}
      <div className="shrink-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-6 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 text-sm cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          disabled={count === 0}
        >
          -
        </button>
        <button
          className="w-6 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 text-sm cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          disabled={!canAdd}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── MTGA-Style Deck List Bar ───

function DeckCardBar({
  card,
  count,
  maxCopies,
  onClick,
}: {
  card: CardDefinition;
  count: number;
  maxCopies: number;
  onClick: () => void;
}) {
  const color = getElementColor(card.element);

  return (
    <button
      className="group w-full flex items-center h-7 rounded overflow-hidden cursor-pointer transition-colors hover:brightness-125"
      style={{
        background: `linear-gradient(90deg, ${color}20 0%, ${color}08 100%)`,
      }}
      onClick={onClick}
    >
      {/* Cost badge */}
      <div
        className="shrink-0 w-5 h-full flex items-center justify-center"
        style={{ backgroundColor: color + '44' }}
      >
        <span className="text-white font-bold text-[10px]">{card.cost}</span>
      </div>

      {/* Name */}
      <span className="flex-1 text-white/80 text-[11px] font-medium truncate px-1.5">
        {card.name}
      </span>

      {/* Quantity dots */}
      <div className="shrink-0 flex items-center gap-0.5 pr-1.5">
        {Array.from({ length: maxCopies }, (_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: i < count ? color : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    </button>
  );
}
