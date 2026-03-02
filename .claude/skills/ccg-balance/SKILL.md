# CCG Balance — Card & Deck Balance for Alchemy

## Description

Provides CCG balance expertise for designing, evaluating, and tuning cards and starter decks in the Alchemy card game. Covers mana cost budgets, keyword pricing, stat allocation, and simulation-driven balance testing.

## When to Use

- Designing new cards or reviewing card stat lines
- Building or tuning starter decks
- Evaluating simulation results for balance issues
- Discussing mana cost budgets, keyword taxes, or stat efficiency

## Key Principles

### Stat Budgets (Apprentice Tier)

A vanilla creature's stat budget at cost N is approximately **2N + 1** total stats (attack + health).

| Cost | Vanilla Stats | Example |
|------|--------------|---------|
| 1    | 3 (2/1 or 1/2) | Flame Fox (2/1) |
| 2    | 5 (3/2 or 2/3) | Lava Hound (2/3) |
| 3    | 7 (3/4 or 4/3) | Thunder Ram (3/3 = 6, below budget → fair) |
| 4    | 9 (4/5 or 3/6) | Frost Serpent (4/3 = 7, below budget → fair) |
| 5    | 11 (5/6 or 4/7) | Mountain Giant (4/6 = 10, slightly below) |

### Keyword Pricing (Stat Tax)

| Keyword | Stat Tax | Notes |
|---------|----------|-------|
| swift   | 1-2 stats | Hugely impactful in defender-chooses combat |
| blast   | 1 stat | Chip damage adds up; modest tax |
| heal    | 1 stat | ETB heal 2; weak as sole ability |
| draw    | 2-3 stats | ETB draw = ~1.2 mana value; strong cantrip |
| fury    | 1-2 stats | Double strike; scales with buffs |
| armor   | 1 stat | Damage prevention; good on walls |
| deathtouch | 2-3 stats | Must have low stats to be fair |
| lifesteal | 1-2 stats | Best on creatures that connect reliably |

### Card Draw Pricing

- **Draw 2 spell** baseline: 3 mana (Splash at 1 mana is intentionally pushed)
- **Cantrip creature** (ETB draw 1): lose ~2-3 stat points vs vanilla
- Tide Sprite (1/2 draw at 1 mana) vs Cloud Kitten (1/2 no keyword at 1 mana) — Tide Sprite is above budget

### Combat System Implications

Alchemy uses **defender-chooses-blockers** combat:
- **Swift is premium**: bypasses blocker assignment for one turn of guaranteed damage
- **Glass cannons are weak**: high attack / low health creatures get chump-blocked
- **Walls are strong**: 0/4 or 1/4 creatures trade well against expensive attackers
- **Evasion matters more** than raw stats for dealing player damage

### Healing Efficiency

- **Pure heal spells** are weak (Healing Rain: 2 mana heal 4 — rarely worth a card)
- **Bundled heal** is good (Storm Turtle: 2/5 heal at 3 mana — the body is the value)
- **Life Drain** (3 mana, 3 damage + heal 3) is efficient as 2-for-1 effect

### First-Player Advantage

- Alchemy mitigates via paired-seed simulation (each matchup played from both sides)
- Current data: ~50-55% first-player win rate (healthy)
- If first-player rate drifts above 60%, consider: draw-step bonus for P2, or reduced P1 starting hand

## Running Simulations

### Quick Matchup Test

```bash
npx tsx scripts/simulate.ts
```

Runs all configured deck pairs (50 games each), outputs win-rate table and matrix.

### Programmatic Simulation

```typescript
import { simulateGame, simulateMatchup } from '@engine/simulate';
import type { SimulationConfig } from '@engine/simulate';

const config: SimulationConfig = {
  tier: 'apprentice',
  aiConfig: {
    difficulty: 'hard',
    personality: 'balanced',
    temperature: 0.5,
    playLookahead: true,
    combatLookahead: true,
    weights: { health: 1, aggression: 1, boardPresence: 1, boardPower: 1, boardDurability: 1, handSize: 0.8 },
  },
};

// Single game
const result = simulateGame(deck1Cards, deck2Cards, config, seed);

// Full matchup (alternates first player)
const stats = simulateMatchup(deck1Cards, deck2Cards, config, 100, baseSeed);
```

### Balance Tests

```bash
pnpm vitest run src/engine/__tests__/balanceSimulation.test.ts
pnpm vitest run src/engine/__tests__/balancePolicySimulation.test.ts
```

These run mono-element and allied-pair matchups with guardrails:
- Element win rates: 30-75%
- Pair dominance cap: 92%
- First-player rate: 40-70%
- Game length: 12-30 turns

## Reference Data

See [balance-reference.md](./balance-reference.md) for detailed card tables and element profiles.
