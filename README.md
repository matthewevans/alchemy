<p align="center">
  <img src="./public/logo_wordmark.webp" alt="Alchemy logo" width="420" />
</p>

<p align="center">
  <em>A card game for wizards-in-training</em>
</p>

<p align="center">
  <a href="https://github.com/matthewevans/alchemy/actions/workflows/deploy-pages.yml">
    <img src="https://github.com/matthewevans/alchemy/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy status" />
  </a>
  <a href="https://matthewevans.github.io/alchemy/">
    <img src="https://img.shields.io/badge/Play_Now-GitHub%20Pages-1f6feb" alt="Play on GitHub Pages" />
  </a>
  <img src="https://img.shields.io/badge/React-19-149eca" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6" alt="TypeScript 5.9" />
</p>

<br />

<p align="center">
  <a href="https://matthewevans.github.io/alchemy/">
    <img src="./docs/screenshots/game-board.webp" alt="Game board — fire deck on molten battlefield" width="720" />
  </a>
</p>

<br />

## Features

- **Elemental card battles** — five elements (fire, water, earth, air, shadow) with a rock-paper-scissors color wheel
- **MTG-inspired combat** — tap to attack, assign blockers, instant-speed combat tricks with a priority stack at Archmage tier — simplified for ages 6–10
- **18 starter decks** — mono and dual-element archetypes, each with a unique playstyle
- **3 difficulty tiers** — Apprentice, Alchemist, and Archmage rulesets with scaling complexity
- **5 AI difficulties** — from Very Easy to Very Hard, with distinct AI personalities
- **Deck builder** — craft custom decks from the full card pool
- **Adventure mode map** — hybrid progression with core path + optional side battles and persistent node unlocks
- **Contextual tutorial system** — auto tips shown once per concept, plus an on-demand in-game help panel
- **Adaptive learning challenges** — reading/math prompts with streak-aware cadence, bounded level adjustment, and explainable adaptation feedback
- **Peer-to-peer multiplayer** — real-time 1v1 via WebRTC with 5-character room codes
- **Persistent state** — games and progression auto-save to localStorage and resume across sessions
- **PWA-ready** — installable on any device for offline play

<p align="center">
  <img src="./docs/screenshots/title-screen.webp" alt="Title screen" width="32%" />
  <img src="./docs/screenshots/deck-selector.webp" alt="Deck selector" width="32%" />
  <img src="./docs/screenshots/opening-hand.webp" alt="Opening hand — mulligan phase" width="32%" />
</p>

## Quick Start

```bash
pnpm install
pnpm dev
```

## Stack

| | |
|---|---|
| **UI** | React 19, TypeScript, Vite, Tailwind CSS |
| **State** | Zustand with subscribeWithSelector |
| **Engine** | Pure-function reducer, seeded PRNG, deterministic replay |
| **Network** | PeerJS (WebRTC) for peer-to-peer multiplayer |
| **Audio** | Web Audio API — procedural SFX + ambient music |
| **Storage** | localStorage-backed repositories for game state, learning profiles, and campaign progression |
| **Testing** | Vitest, Testing Library, Cypress E2E |

## Architecture

- **Domain (pure)** — gameplay-independent policies for tutorial tips, challenge cadence/reward, adaptive mastery, and campaign progression
- **Application (orchestration)** — Zustand stores and use-cases that compose domain logic into gameplay flows
- **Adapters (UI/state)** — React components/hooks that render state and dispatch actions only
- **Infrastructure (persistence)** — repository contracts with local implementations, designed for future server-sync adapters

## Learning Science Basis

The learning system is grounded in evidence-aligned progression, retrieval practice, feedback timing, and spacing guidance documented in:

- [`docs/learning-mechanics-research-reference.md`](./docs/learning-mechanics-research-reference.md)

## Build & Test

```bash
pnpm build          # TypeScript check + production build
pnpm test           # Vitest (single run)
pnpm run balance:gate  # AI-vs-AI balance gate tests
pnpm lint           # ESLint
```

## Deployment

GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml`. Balance gate CI runs on every PR and push to main.

## License

MIT. See [LICENSE](./LICENSE).
