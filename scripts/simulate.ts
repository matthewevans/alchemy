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
  temperature: 0.5,
  playLookahead: true,
  combatLookahead: true,
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

// ─── Custom Deck Definitions ───

interface DeckDef {
  name: string;
  cards: string[];
}

/**
 * Helper to build a deck card list with explicit copy counts.
 * E.g., deck(['fire_ember_sprite', 3], ['fire_fireball', 2]) → 3 copies + 2 copies
 */
function deck(...entries: [string, number][]): string[] {
  return entries.flatMap(([id, count]) => Array(count).fill(id));
}

// ─── New Deck Card Lists ───

const FLASHFIRE_DECK: DeckDef = {
  name: 'Flashfire',
  cards: deck(
    // Fire — speed + burn (10 cards)
    ['fire_ember_sprite', 2],     // 1-cost swift
    ['fire_fire_dancer', 2],      // 2-cost blast
    ['fire_phoenix_chick', 2],    // 4-cost swift
    ['fire_fireball', 2],         // 2-cost removal
    ['fire_blazing_speed', 1],    // 1-cost grants swift
    ['fire_dragon_whelp', 1],     // 5-cost blast finisher
    // Air — swift + tempo (10 cards)
    ['air_breeze_fairy', 2],      // 1-cost swift draw
    ['air_wind_hawk', 2],         // 2-cost swift 3/1
    ['air_sky_drake', 2],         // 4-cost swift 4/3
    ['air_lightning_bolt', 2],    // 2-cost 3 dmg
    ['air_gust', 1],              // 1-cost bounce
    ['air_tailwind', 1],          // 3-cost all swift
  ),
};

const SCALDING_DEPTHS_DECK: DeckDef = {
  name: 'Scalding Depths',
  cards: deck(
    // Fire — burn + aggro (10 cards)
    ['fire_ember_sprite', 2],     // 1-cost swift
    ['fire_fire_dancer', 2],      // 2-cost blast
    ['fire_magma_golem', 2],      // 3-cost 3/4 blast — sticky threat
    ['fire_fireball', 2],         // 2-cost removal
    ['fire_eruption', 1],         // 3-cost AoE
    ['fire_blazing_speed', 1],    // 1-cost grants swift
    // Water — card draw + defense (10 cards)
    ['water_tide_sprite', 2],     // 1-cost draw
    ['water_river_otter', 2],     // 2-cost draw
    ['water_storm_turtle', 2],    // 3-cost 2/5 heal — wall
    ['water_splash', 2],          // 1-cost draw 2
    ['water_frost_serpent', 1],   // 4-cost 4/3
    ['water_healing_rain', 1],    // 2-cost heal 4
  ),
};

const LIVING_FORTRESS_DECK: DeckDef = {
  name: 'Living Fortress',
  cards: deck(
    // Water — draw + walls (10 cards)
    ['water_tide_sprite', 2],     // 1-cost draw
    ['water_shell_crab', 2],      // 1-cost 0/4 wall
    ['water_coral_guardian', 2],  // 2-cost 1/4 wall
    ['water_storm_turtle', 2],    // 3-cost 2/5 heal
    ['water_splash', 1],          // 1-cost draw 2
    ['water_healing_rain', 1],    // 2-cost heal 4
    // Earth — fatties (10 cards)
    ['earth_pebble_pup', 1],      // 1-cost 1/3
    ['earth_mushroom_guard', 2],  // 2-cost 1/4 heal
    ['earth_treant_sapling', 2],  // 3-cost 2/5
    ['earth_crystal_stag', 2],    // 4-cost 3/5 draw
    ['earth_mountain_giant', 2],  // 5-cost 4/6 finisher
    ['earth_growth', 1],          // 2-cost +2/+2 buff
  ),
};

const GRAVEYARD_GARDEN_DECK: DeckDef = {
  name: 'Graveyard Garden',
  cards: deck(
    // Earth — big bodies + buff (10 cards)
    ['earth_pebble_pup', 1],      // 1-cost 1/3
    ['earth_mushroom_guard', 2],  // 2-cost 1/4 heal
    ['earth_treant_sapling', 2],  // 3-cost 2/5
    ['earth_crystal_stag', 2],    // 4-cost 3/5 draw
    ['earth_mountain_giant', 1],  // 5-cost 4/6
    ['earth_growth', 2],          // 2-cost +2/+2 — huge on shadow creatures
    // Shadow — removal + threats (10 cards)
    ['shadow_sneaky_cat', 2],     // 1-cost swift 2/1
    ['shadow_ghost_knight', 2],   // 3-cost 3/3 ETB
    ['shadow_nightmare_steed', 2],// 3-cost 2/4
    ['shadow_dark_bolt', 2],      // 1-cost removal
    ['shadow_doom', 1],           // 4-cost destroy
    ['shadow_life_drain', 1],     // 3-cost 3 dmg + heal 3
  ),
};

const HOLY_SHADOW_DECK: DeckDef = {
  name: 'Holy Shadow',
  cards: deck(
    // Angels — heal + sustain (10 cards)
    ['air_acolyte', 2],           // 1-cost heal
    ['air_priestess_of_light', 2],// 2-cost 1/4 heal
    ['air_angelic_scribe', 2],    // 2-cost 1/3 draw
    ['air_archangel', 2],         // 4-cost 2/6 heal
    ['air_blessing', 1],          // 2-cost +1/+3 buff
    ['air_radiance', 1],          // 4-cost heal 5 + draw
    // Shadow — removal + threats (10 cards)
    ['shadow_sneaky_cat', 2],     // 1-cost swift 2/1 — early pressure
    ['shadow_bat_swarm', 2],      // 2-cost blast
    ['shadow_shadow_dragon', 2],  // 5-cost 5/5 ETB — finisher
    ['shadow_dark_bolt', 2],      // 1-cost removal
    ['shadow_doom', 1],           // 4-cost destroy anything
    ['shadow_life_drain', 1],     // 3-cost 3 dmg + heal 3
  ),
};

// ─── Main ───

const TIER: Tier = 'apprentice';
const GAMES_PER_MATCHUP = 50;
const BASE_SEED = 42;

const simConfig: SimulationConfig = {
  tier: TIER,
  aiConfig: SIM_AI_CONFIG,
};

// Build existing starter decks
const existingDecks: DeckDef[] = STARTER_DECKS
  .filter((d) => d.elements.length === 1)
  .slice(0, 5)
  .map((d) => ({ name: d.name, cards: buildStarterDeck(d, TIER) }));

// New custom decks
const newDecks: DeckDef[] = [
  FLASHFIRE_DECK,
  SCALDING_DEPTHS_DECK,
  LIVING_FORTRESS_DECK,
  GRAVEYARD_GARDEN_DECK,
  HOLY_SHADOW_DECK,
];

const allDecks = [...existingDecks, ...newDecks];

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
