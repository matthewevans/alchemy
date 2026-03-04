/**
 * Deck simulation harness — runs AI-vs-AI games to evaluate deck matchups.
 *
 * Usage:
 *   npx tsx scripts/simulate.ts
 *
 * Runs each deck pair N times with different seeds, reports win rates,
 * average game length, and health margins.
 */

import { simulateMatchup } from '../src/engine/simulate';
import type { MatchupStats, SimulationConfig } from '../src/engine/simulate';
import { buildStarterDeck, STARTER_DECKS } from '../src/engine/starterDecks';
import type { AIConfig } from '../src/engine/aiConfig';
import type { Tier } from '../src/engine/types';

// ─── AI Config ───

/** Fixed "hard balanced" config for consistent simulation results. */
const SIM_AI_CONFIG: AIConfig = {
  difficulty: 'hard',
  personality: 'balanced',
  policy: 'heuristic',
  temperature: 0.5,
  playLookahead: true,
  combatLookahead: true,
  search: {
    enabled: false,
    maxDepth: 1,
    maxNodes: 1,
    maxBranching: 1,
    rolloutDepth: 0,
    useTransposition: true,
  },
  weights: {
    health: 1.0,
    aggression: 1.0,
    boardPresence: 1.0,
    boardPower: 1.0,
    boardDurability: 1.0,
    handSize: 0.8,
  },
};

// ─── Output ───

interface NamedMatchup extends MatchupStats {
  deck1Name: string;
  deck2Name: string;
}

function printMatchupTable(results: NamedMatchup[]) {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    MATCHUP RESULTS                              │');
  console.log('├──────────────────────┬──────────────────────┬───────┬─────┬─────┤');
  console.log('│ Deck 1               │ Deck 2               │ Win%  │ Avg │ Avg │');
  console.log('│                      │                      │ (D1)  │Turns│Mrgn │');
  console.log('├──────────────────────┼──────────────────────┼───────┼─────┼─────┤');

  for (const r of results) {
    const winRate = r.games > 0
      ? ((r.deck1Wins / (r.deck1Wins + r.deck2Wins || 1)) * 100).toFixed(0)
      : '?';
    const d1 = r.deck1Name.padEnd(20);
    const d2 = r.deck2Name.padEnd(20);
    const wr = `${winRate}%`.padStart(5);
    const turns = r.avgTurns.toFixed(1).padStart(4);
    const margin = r.avgHealthMargin.toFixed(0).padStart(4);
    console.log(`│ ${d1} │ ${d2} │ ${wr} │${turns} │${margin} │`);
  }

  console.log('└──────────────────────┴──────────────────────┴───────┴─────┴─────┘');
}

function printWinMatrix(deckNames: string[], results: NamedMatchup[]) {
  // Build lookup
  const lookup = new Map<string, number>();
  for (const r of results) {
    const total = r.deck1Wins + r.deck2Wins;
    if (total > 0) {
      lookup.set(`${r.deck1Name}|${r.deck2Name}`, (r.deck1Wins / total) * 100);
      lookup.set(`${r.deck2Name}|${r.deck1Name}`, (r.deck2Wins / total) * 100);
    }
  }

  // Header
  const colWidth = 8;
  const nameWidth = 16;
  const header = ''.padEnd(nameWidth) + deckNames.map((n) => n.slice(0, colWidth).padStart(colWidth)).join('');
  console.log('\n  WIN RATE MATRIX (row vs column)\n');
  console.log(header);
  console.log(''.padEnd(nameWidth) + '─'.repeat(colWidth * deckNames.length));

  for (const row of deckNames) {
    let line = row.slice(0, nameWidth - 1).padEnd(nameWidth);
    for (const col of deckNames) {
      if (row === col) {
        line += '   --   ';
      } else {
        const rate = lookup.get(`${row}|${col}`);
        line += rate !== undefined ? `${rate.toFixed(0)}%`.padStart(colWidth) : '   ?    ';
      }
    }
    console.log(line);
  }
}

// ─── Main ───

interface DeckDef {
  name: string;
  cards: string[];
}

const TIER: Tier = 'apprentice';
const GAMES_PER_MATCHUP = 50;
const BASE_SEED = 42;

const simConfig: SimulationConfig = {
  tier: TIER,
  aiConfig: SIM_AI_CONFIG,
};

const allDecks: DeckDef[] = STARTER_DECKS
  .map((d) => ({ name: d.name, cards: buildStarterDeck(d, TIER) }));

console.log(`Simulating ${allDecks.length} decks × ${GAMES_PER_MATCHUP} games @ ${TIER} tier...\n`);

const results: NamedMatchup[] = [];

for (let i = 0; i < allDecks.length; i++) {
  for (let j = i + 1; j < allDecks.length; j++) {
    const d1 = allDecks[i];
    const d2 = allDecks[j];
    process.stdout.write(`  ${d1.name} vs ${d2.name}...`);
    const stats = simulateMatchup(
      d1.cards,
      d2.cards,
      simConfig,
      GAMES_PER_MATCHUP,
      BASE_SEED + i * 1000 + j * 100,
    );
    const result: NamedMatchup = { ...stats, deck1Name: d1.name, deck2Name: d2.name };
    console.log(` ${result.deck1Wins}-${result.deck2Wins} (${result.draws} draws)`);
    results.push(result);
  }
}

printMatchupTable(results);
printWinMatrix(allDecks.map((d) => d.name), results);
