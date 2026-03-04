import type { Element } from '@engine/types';
import { ALL_CARDS } from '@engine/cards';
import { BATTLEFIELDS } from '@components/board/battlefields';
import { getAvatarPath, getCardArtPath, getElementIconPath } from '@components/card/cardUtils';
import { AMBIENT_TRACK_POOL } from '@audio/ambientMusic';
import { TITLE_TRACK_URL } from '@audio/titleMusic';
import { DECK_SELECT_TRACK_URL } from '@audio/deckSelectMusic';
import { MULTIPLAYER_LOBBY_TRACK_URL } from '@audio/multiplayerLobbyMusic';

type StartupPhase = 'discovering' | 'loading' | 'complete';

interface SfxCatalog {
  runtime_sound_types?: Record<string, unknown>;
}

interface VfxSpriteIndex {
  curated?: Record<string, unknown>;
}

export interface StartupPreloadProgress {
  phase: StartupPhase;
  loaded: number;
  failed: number;
  total: number;
  percent: number;
}

const BASE = import.meta.env.BASE_URL;
const PRELOAD_CONCURRENCY = 8;
const ELEMENTS: readonly Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];
const ASSET_PATH_PATTERN = /^(?:public\/|\/)?[^?#]+\.(?:webp|png|mp3|m4a|json)$/i;
const SFX_CATALOG_URL = `${BASE}audio/sfx/catalog.json`;
const VFX_SPRITE_INDEX_URL = `${BASE}vfx/sprites/index.json`;
const PRELOAD_STAMP_STORAGE_KEY = 'alchemy:startup-preload:stamp';
const PRELOAD_STAMP = `${__APP_VERSION__}:${__BUILD_HASH__}`;
const CORE_ASSET_PATHS = [
  'logo.webp',
  'logo_wordmark.webp',
  'wordmark.webp',
  'cardback.webp',
  'wizard_helper.webp',
  'avatar/elemental_champion.webp',
  'pwa-192x192.webp',
  'pwa-512x512.webp',
] as const;
const INITIAL_PROGRESS: StartupPreloadProgress = {
  phase: 'discovering',
  loaded: 0,
  failed: 0,
  total: 0,
  percent: 0,
};

let currentProgress: StartupPreloadProgress = INITIAL_PROGRESS;
let preloadPromise: Promise<StartupPreloadProgress> | null = null;
const progressListeners = new Set<(progress: StartupPreloadProgress) => void>();

function emitProgress(progress: StartupPreloadProgress): void {
  currentProgress = progress;
  for (const listener of progressListeners) listener(progress);
}

function toAssetUrl(path: string): string {
  if (path.startsWith('public/')) return `${BASE}${path.slice('public/'.length)}`;
  if (path.startsWith('/')) return `${BASE}${path.slice(1)}`;
  return `${BASE}${path}`;
}

function dedupe(paths: readonly string[]): string[] {
  return [...new Set(paths)];
}

function readPreloadStamp(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PRELOAD_STAMP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePreloadStamp(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRELOAD_STAMP_STORAGE_KEY, PRELOAD_STAMP);
  } catch {
    // Ignore persistence failures.
  }
}

function toPercent(done: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.round((done / total) * 100));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function collectManifestPaths(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    if (ASSET_PATH_PATTERN.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectManifestPaths(entry, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectManifestPaths(nested, out);
    }
  }
}

function listCoreAssets(): string[] {
  const urls: string[] = CORE_ASSET_PATHS.map((path) => toAssetUrl(path));

  for (const card of ALL_CARDS) {
    urls.push(getCardArtPath(card.id, card.element));
  }

  for (const battlefield of BATTLEFIELDS) {
    urls.push(battlefield.image);
  }

  for (const element of ELEMENTS) {
    urls.push(getElementIconPath(element));
    urls.push(getAvatarPath(element));
  }

  return urls;
}

function listPriorityAssets(): string[] {
  return [
    TITLE_TRACK_URL,
    DECK_SELECT_TRACK_URL,
    MULTIPLAYER_LOBBY_TRACK_URL,
    ...AMBIENT_TRACK_POOL,
  ];
}

async function listManifestAssets(): Promise<string[]> {
  const [sfxCatalog, vfxIndex] = await Promise.all([
    fetchJson<SfxCatalog>(SFX_CATALOG_URL),
    fetchJson<VfxSpriteIndex>(VFX_SPRITE_INDEX_URL),
  ]);

  const paths: string[] = [SFX_CATALOG_URL, VFX_SPRITE_INDEX_URL];
  if (sfxCatalog?.runtime_sound_types) {
    const catalogPaths: string[] = [];
    collectManifestPaths(sfxCatalog.runtime_sound_types, catalogPaths);
    paths.push(...catalogPaths.map((path) => toAssetUrl(path)));
  }
  if (vfxIndex?.curated) {
    const vfxPaths: string[] = [];
    collectManifestPaths(vfxIndex.curated, vfxPaths);
    paths.push(...vfxPaths.map((path) => toAssetUrl(path)));
  }
  return paths;
}

async function preloadUrl(url: string): Promise<void> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Failed to preload asset: ${url}`);
  await response.arrayBuffer();
}

async function runPreload(): Promise<StartupPreloadProgress> {
  if (import.meta.env.DEV) {
    const devState: StartupPreloadProgress = {
      phase: 'complete',
      loaded: 0,
      failed: 0,
      total: 0,
      percent: 100,
    };
    emitProgress(devState);
    return devState;
  }

  if (readPreloadStamp() === PRELOAD_STAMP) {
    const cachedState: StartupPreloadProgress = {
      phase: 'complete',
      loaded: 0,
      failed: 0,
      total: 0,
      percent: 100,
    };
    emitProgress(cachedState);
    return cachedState;
  }

  emitProgress(INITIAL_PROGRESS);

  const manifestAssets = await listManifestAssets();
  const priorityUrls = dedupe(listPriorityAssets());
  const prioritySet = new Set(priorityUrls);
  const secondaryUrls = dedupe([
    ...listCoreAssets(),
    ...manifestAssets,
  ]).filter((url) => !prioritySet.has(url));
  const urls = [...priorityUrls, ...secondaryUrls];

  if (urls.length === 0) {
    const done = { phase: 'complete', loaded: 0, failed: 0, total: 0, percent: 100 } as const;
    emitProgress(done);
    return done;
  }

  let loaded = 0;
  let failed = 0;
  let nextIndex = 0;
  const total = urls.length;

  emitProgress({ phase: 'loading', loaded, failed, total, percent: 0 });

  const worker = async () => {
    while (nextIndex < total) {
      const url = urls[nextIndex];
      nextIndex += 1;
      try {
        await preloadUrl(url);
        loaded += 1;
      } catch {
        failed += 1;
      }
      emitProgress({
        phase: 'loading',
        loaded,
        failed,
        total,
        percent: toPercent(loaded + failed, total),
      });
    }
  };

  const concurrency = Math.min(PRELOAD_CONCURRENCY, total);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const finalState: StartupPreloadProgress = {
    phase: 'complete',
    loaded,
    failed,
    total,
    percent: 100,
  };
  emitProgress(finalState);
  if (failed === 0) writePreloadStamp();
  return finalState;
}

export function subscribeStartupPreload(
  listener: (progress: StartupPreloadProgress) => void,
): () => void {
  progressListeners.add(listener);
  listener(currentProgress);
  return () => {
    progressListeners.delete(listener);
  };
}

export function ensureStartupAssetsPreloaded(): Promise<StartupPreloadProgress> {
  if (!preloadPromise) {
    preloadPromise = runPreload().catch(() => {
      const fallback: StartupPreloadProgress = {
        ...currentProgress,
        phase: 'complete',
        percent: 100,
      };
      emitProgress(fallback);
      return fallback;
    });
  }
  return preloadPromise;
}
