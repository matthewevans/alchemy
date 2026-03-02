import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element, CardDefinition, Tier } from '@engine/types';
import { ALL_CARDS, CARD_REGISTRY } from '@engine/cards';
import { ELEMENTS, ELEMENT_META } from '@engine/elements';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { EFFECT_REGISTRY } from '@engine/effects';
import { TIER_CONFIGS, TIER_ORDER } from '@engine/ruleset';
import { validateDeck } from '@engine/deck';
import { getElementColor, getElementIconPath } from '@components/card/cardUtils';
import { loadSavedDecks, saveDeck, deleteDeck } from '@storage/deckStorage';
import { encodeDeck, decodeDeck } from '@storage/shareCode';
import type { SavedDeck } from '@storage/deckStorage';
import { gameButtonClass } from './buttonStyles';

interface DeckBuilderProps {
  onSelectDeck: (deckCardIds: string[]) => void;
  onBack: () => void;
  tier?: Tier;
}

type ElementFilter = Element | 'all';

export function DeckBuilder({ onSelectDeck, onBack, tier = 'apprentice' }: DeckBuilderProps) {
  const RULESET = TIER_CONFIGS[tier];
  const tierIndex = TIER_ORDER.indexOf(tier);
  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>({});
  const [deckName, setDeckName] = useState('My Deck');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>(() => loadSavedDecks());
  const [shareInput, setShareInput] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showMobileDeckPanel, setShowMobileDeckPanel] = useState(false);

  const filteredCards = useMemo(
    () =>
      ALL_CARDS.filter((c) => {
        if (TIER_ORDER.indexOf(c.tier) > tierIndex) return false;
        if (elementFilter !== 'all' && c.element !== elementFilter) return false;
        return true;
      }),
    [elementFilter, tierIndex],
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
        const next = { ...prev };
        delete next[cardId];
        return next;
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
      tier,
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
    setShowMobileDeckPanel(false);
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
    const code = encodeDeck(deckCardIds, tier);
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
    setShowMobileDeckPanel(false);
    onSelectDeck(deckCardIds);
  }, [validation.valid, deckCardIds, onSelectDeck]);

  const handleClear = useCallback(() => {
    setDeckCounts({});
  }, []);

  const renderDeckPanel = (showCloseButton: boolean) => (
    <>
      {showCloseButton && (
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white text-base font-semibold">Deck</h2>
          <button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'px-4 text-sm',
            })}
            onClick={() => setShowMobileDeckPanel(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Deck header + count */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Deck</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              totalCards === RULESET.deckSize ? 'text-emerald-400' : 'text-white/60'
            }`}
          >
            {totalCards} / {RULESET.deckSize}
          </span>
        </div>

        {/* Mana curve */}
        <div className="flex items-end gap-1 h-12 mb-1">
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
                <span className="text-white/40 text-[11px] tabular-nums">{cost}{i === 5 ? '+' : ''}</span>
              </div>
            );
          })}
        </div>

        {!validation.valid && totalCards > 0 && (
          <div className="mt-2 space-y-0.5">
            {validation.errors.map((err) => (
              <p key={err} className="text-red-300 text-xs leading-snug">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* Deck card list — MTGA horizontal bars */}
      <div className="flex-1 overflow-y-auto px-2">
        {deckEntries.length === 0 ? (
          <p className="text-white/30 text-sm text-center mt-6">Add cards from the collection</p>
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
      <div className="shrink-0 p-3 border-t border-white/5 space-y-2">
        {/* Share code row */}
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/40"
            value={shareInput}
            onChange={(e) => setShareInput(e.target.value)}
            placeholder="Paste share code..."
          />
          <button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'px-4 text-sm',
            })}
            onClick={handleImport}
          >
            Import
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'flex-1 text-sm',
            })}
            onClick={handleExport}
          >
            Export
          </button>
          <button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'flex-1 text-sm',
            })}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
        {shareCode && (
          <div className="px-2 py-2 rounded bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 text-xs font-mono break-all">{shareCode}</p>
          </div>
        )}

        {/* Play button */}
        <motion.button
          className={gameButtonClass({
            tone: 'amber',
            size: 'md',
            disabled: !validation.valid,
            className: 'w-full font-bold',
          })}
          whileHover={validation.valid ? { scale: 1.02 } : {}}
          whileTap={validation.valid ? { scale: 0.98 } : {}}
          onClick={handlePlay}
          disabled={!validation.valid}
        >
          Play
        </motion.button>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* ═══ Top Bar ═══ */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/5">
        <motion.button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'sm',
            className: 'px-4 text-sm',
          })}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
        >
          Back
        </motion.button>

        <div className="hidden md:block w-px h-6 bg-white/10 mx-1" />

        {/* Element filter pills */}
        <button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'xs',
            className: `text-xs font-medium ${
              elementFilter === 'all'
                ? 'border-white/40 bg-white/16 text-white'
                : 'text-white/40 hover:text-white/70'
            }`,
          })}
          onClick={() => setElementFilter('all')}
        >
          All
        </button>
        {ELEMENTS.map((el) => {
          const color = getElementColor(el);
          return (
            <button
              key={el}
              className={gameButtonClass({
                tone: 'neutral',
                size: 'xs',
                className: 'flex items-center gap-1 text-xs font-medium',
              })}
              style={{
                backgroundColor: elementFilter === el ? color + '22' : undefined,
                borderColor: elementFilter === el ? color + '88' : undefined,
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
          className="px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm w-full md:w-40 focus:outline-none focus:border-amber-500/40"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
        />

        <motion.button
          className={gameButtonClass({
            tone: 'amber',
            size: 'sm',
            className: 'px-4 text-sm font-medium',
          })}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
        >
          Save
        </motion.button>

        <motion.button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'sm',
            className: 'px-4 text-sm',
          })}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSaved(!showSaved)}
        >
          Load
        </motion.button>
      </div>

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ── Collection (left) ── */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="px-4 py-3 space-y-4">
            {groupedCards.map(([cost, cards]) => (
              <div key={cost}>
                {/* Cost group header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-300 text-xs font-bold">{cost}</span>
                  </div>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-white/40 text-xs">{cards.length} cards</span>
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
        <div className="hidden lg:flex w-72 shrink-0 flex-col min-h-0 bg-black/40 border-l border-white/5">
          {renderDeckPanel(false)}
        </div>

        {/* ── Saved Decks Dropdown ── */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              className="absolute top-2 right-2 lg:top-0 lg:right-72 w-[min(22rem,calc(100vw-1rem))] bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden z-20"
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
                          className={gameButtonClass({
                            tone: 'neutral',
                            size: 'xs',
                            className: 'flex-1 text-left text-white/70 hover:text-white truncate',
                          })}
                          onClick={() => handleLoad(deck)}
                        >
                        {deck.name}
                        <span className="text-white/30 ml-1">({deck.cardIds.length})</span>
                      </button>
                        <button
                          className={gameButtonClass({
                            tone: 'red',
                            size: 'xs',
                            className:
                              'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-red-400/70 hover:text-red-300 transition-opacity px-2 text-sm',
                          })}
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

      {/* Mobile deck toggle */}
      <button
        className={gameButtonClass({
          tone: 'amber',
          size: 'md',
          className:
            'lg:hidden fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 px-5 font-bold shadow-lg shadow-black/40',
        })}
        onClick={() => setShowMobileDeckPanel(true)}
      >
        Deck {totalCards}/{RULESET.deckSize}
      </button>

      {/* Mobile deck panel */}
      <AnimatePresence>
        {showMobileDeckPanel && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileDeckPanel(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Deck panel"
              className="absolute inset-x-0 bottom-0 max-h-[78vh] bg-slate-900 border-t border-white/10 rounded-t-2xl flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderDeckPanel(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white text-sm shadow-xl z-50"
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
      className="group flex items-center h-11 rounded overflow-hidden transition-colors hover:brightness-125 cursor-pointer"
      style={{
        background: `linear-gradient(90deg, ${color}15 0%, ${color}08 60%, transparent 100%)`,
        borderLeft: `2px solid ${color}`,
      }}
      onClick={canAdd ? onAdd : undefined}
    >
      {/* Cost */}
      <div className="shrink-0 w-8 flex items-center justify-center">
        <span className="text-white font-bold text-sm">{card.cost}</span>
      </div>

      {/* Element icon */}
      <img src={iconPath} alt="" className="w-4 h-4 shrink-0 opacity-70" />

      {/* Name + info */}
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
        {effect && !card.keywords.length && (
          <span className="text-white/30 text-xs truncate">{effect.description}</span>
        )}
      </div>

      {/* Quantity dots (MTGA style) */}
      <div className="shrink-0 flex items-center gap-1 px-1">
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
      <div className="shrink-0 flex opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'xs',
            className:
              'w-11 h-11 min-h-0 px-0 py-0 rounded-none border-l-0 text-base flex items-center justify-center text-white/70 hover:text-white disabled:opacity-20',
          })}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          disabled={count === 0}
        >
          -
        </button>
        <button
          className={gameButtonClass({
            tone: 'neutral',
            size: 'xs',
            className:
              'w-11 h-11 min-h-0 px-0 py-0 rounded-none border-l-0 text-base flex items-center justify-center text-white/70 hover:text-white disabled:opacity-20',
          })}
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
      className={gameButtonClass({
        tone: 'neutral',
        size: 'xs',
        className: 'group w-full flex items-center h-10 px-0 py-0 rounded overflow-hidden hover:brightness-110',
      })}
      style={{
        borderColor: `${color}88`,
        backgroundColor: `${color}22`,
      }}
      onClick={onClick}
    >
      {/* Cost badge */}
      <div
        className="shrink-0 w-7 h-full flex items-center justify-center"
        style={{ backgroundColor: color + '44' }}
      >
        <span className="text-white font-bold text-xs">{card.cost}</span>
      </div>

      {/* Name */}
      <span className="flex-1 text-white/85 text-xs font-medium truncate px-2">
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
