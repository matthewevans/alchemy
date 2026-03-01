<p align="center">
  <img src="./public/logo_wordmark.webp" alt="Alchemy logo wordmark" width="420" />
</p>

<p align="center">
  Browser-based elemental card battler inspired by MTG-style gameplay.
</p>

<p align="center">
  <a href="https://github.com/matthewevans/alchemy/actions/workflows/deploy-pages.yml">
    <img src="https://github.com/matthewevans/alchemy/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy status" />
  </a>
  <a href="https://matthewevans.github.io/alchemy/">
    <img src="https://img.shields.io/badge/Live-GitHub%20Pages-1f6feb" alt="Live on GitHub Pages" />
  </a>
  <img src="https://img.shields.io/badge/React-19-149eca" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6" alt="TypeScript 5.9" />
</p>

## Live

- https://matthewevans.github.io/alchemy/

## Features

- Fast, browser-native 1v1 elemental card battles
- MTG-inspired combat flow with kid-friendly simplifications
- Persistent local game state
- Deck-building support
- PWA support for installable gameplay

## Stack

- React 19
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- Vitest + Testing Library

## Quick Start

```bash
pnpm install
pnpm dev
```

## Build and Preview

```bash
pnpm build
pnpm preview
```

## Testing

```bash
pnpm test
```

## Deployment

- GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml`.
- Build command used for Pages: `pnpm exec vite build --base=/alchemy/`

## TODO

- Prevent browser/system long-press save-sheet behavior on cards so card inspection feels native in-game.

## License

MIT. See [LICENSE](./LICENSE).
