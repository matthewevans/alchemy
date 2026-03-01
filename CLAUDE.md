# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Vite dev server with HMR
pnpm build          # TypeScript check + Vite production build
pnpm lint           # ESLint
pnpm test           # Vitest (single run)
pnpm test:watch     # Vitest (watch mode)
pnpm vitest run src/engine/__tests__/reducer.test.ts  # Run a single test file
```

## Project Overview

Alchemy is a browser-based 1v1 elemental card battler (MTG-inspired, kid-friendly for ages 6–10). React 19 + TypeScript + Vite + Zustand + Tailwind CSS. PWA-enabled, deployed to GitHub Pages.

## Architecture

### Path Aliases (defined in vite.config.ts)

`@engine/*`, `@game/*`, `@components/*`, `@hooks/*`, `@storage/*`, `@network/*` map to their respective `src/` subdirectories.

### Engine (`src/engine/`) — Pure game logic, no React

- **`types.ts`** — All game types. `Phase`, `GameAction`, `GameEvent` are discriminated unions. `GameState` is the single source of truth.
- **`reducer.ts`** — Pure function `reduce(state, action, actingPlayer, rng) → { newState, events }`. Every game mutation flows through here.
- **`validation.ts`** — `validateAction()` checks legality; `enumerateLegalActions()` lists all valid moves for a player.
- **`cards.ts` / `cards/`** — `CARD_REGISTRY` maps card IDs to `CardDefinition`. Card data is organized by element.
- **`effects.ts` / `effects/`** — `EFFECT_REGISTRY` maps effect IDs to implementations. Effects produce `GameEvent[]`.
- **`keywords.ts` / `keywords/`** — Keyword ability implementations (swift, blast, heal, etc.).
- **`elements.ts`** — Five-element color wheel (fire, water, earth, air, shadow).
- **`prng.ts`** — Seeded RNG (`createRNG(seed)`) for deterministic gameplay and multiplayer sync.
- **`ruleset.ts`** — `TIER_CONFIGS` for apprentice/alchemist/archmage difficulty tiers.
- **`ai.ts`** — AI opponent decision logic.

### Game State Layer (`src/game/`) — Zustand stores + dispatch orchestration

- **`gameStore.ts`** — Main Zustand store: holds `GameState`, `SeededRNG`, `legalActions`. Wraps the engine reducer.
- **`uiStore.ts`** — UI-only state: card selection, hovering, targeting mode, combat selections.
- **`animationStore.ts`** — Animation queue. Steps block game progression until animations complete.
- **`dispatchWithAnimations.ts`** — Wraps `gameStore.dispatch` to capture element positions and enqueue animation steps from events.
- **`controllers/`** — `OpponentController` interface with `aiController` (single-player) and `networkController` (peer-to-peer WebRTC).

### Data Flow

```
User interaction → dispatchWithAnimations(action, player)
  → gameStore.dispatch → engine reduce() → new GameState + GameEvent[]
  → groupEventsIntoSteps → animationStore.enqueueSteps
  → useGameLoop() waits for animations → auto-advances phases → delegates opponent turns to controller
```

### Components (`src/components/`)

Organized by domain: `board/`, `card/`, `hand/`, `combat/`, `phase/`, `targeting/`, `animation/`, `effects/`, `hero/`, `layout/`, `ui/`. The `ui/` subdirectory has screens (title, deck builder, game over, etc.).

### Pages (`src/pages/`)

Two routes: `/` (HomePage — menus, deck select) and `/game/:id` (GamePage — active game).

### Network (`src/network/`) — Peer-to-peer multiplayer via PeerJS (WebRTC signaling) with 5-character room codes.

### Storage (`src/storage/`) — IndexedDB persistence for game state and decks. `shareCode.ts` handles deck compression/sharing.

## Testing

Tests live in `src/engine/__tests__/` and alongside components as `*.test.{ts,tsx}`. Test fixtures in `__fixtures__/testHelpers.ts` provide:
- `createTestGameState(overrides?)` — build a `GameState` with sensible defaults
- `makeCardInstance(cardId)` / `makePermanent(cardId, ownerId, overrides?)` — factory helpers
- `resetTestCounters()` — call in `beforeEach` for deterministic instance IDs

Vitest uses jsdom environment. `src/test-setup.ts` polyfills `matchMedia` and `ResizeObserver`.

## Conventions

- Game state is immutable — the reducer returns new state, never mutates.
- All game logic must be in `src/engine/` (pure, no React dependencies).
- Discriminated unions with `type` field for phases, actions, events, and target refs.
- Registry pattern (`CARD_REGISTRY`, `EFFECT_REGISTRY`) avoids circular imports and enables data-driven design.
- Zustand stores use `subscribeWithSelector` middleware for fine-grained reactivity.
- Animation is a first-class concern — events from the reducer are translated into animation steps that block game progression.
