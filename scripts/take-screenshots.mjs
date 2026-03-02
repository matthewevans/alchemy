#!/usr/bin/env node
/**
 * Captures game screenshots for README using Puppeteer.
 * Uses iPad Air landscape viewport (1180×820 @2x) for consistent aspect ratio.
 *
 * Usage: node scripts/take-screenshots.mjs
 * Requires: dev server running on localhost:5173
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'docs', 'screenshots');

// iPad Air landscape — crisp 4:3-ish ratio, 2x for retina quality
const VIEWPORT = { width: 1180, height: 820, deviceScaleFactor: 2 };
const BASE_URL = 'http://localhost:5173';
const SEED = 42;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Pre-dismiss gameplay hints via localStorage
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('alchemy:gameplay-hints-dismissed', '1');
  });

  // ---------- 1. Title Screen ----------
  console.log('1/4 Title screen...');
  await page.goto(`${BASE_URL}?seed=${SEED}`, { waitUntil: 'networkidle0' });
  await sleep(2000); // let logo + particles animate in
  await page.screenshot({
    path: resolve(OUT_DIR, 'title-screen.webp'),
    type: 'webp',
    quality: 90,
  });
  console.log('  -> title-screen.webp');

  // ---------- 2. Deck Selector ----------
  console.log('2/4 Deck selector...');
  await page.click('[data-testid="play-btn"]');
  await page.waitForSelector('[data-testid="deck-option-fire"]', { timeout: 10000 });
  await sleep(800);
  await page.screenshot({
    path: resolve(OUT_DIR, 'deck-selector.webp'),
    type: 'webp',
    quality: 90,
  });
  console.log('  -> deck-selector.webp');

  // ---------- 3. Mulligan / Opening Hand ----------
  console.log('3/4 Opening hand...');
  await page.click('[data-testid="deck-option-fire"]');
  await page.waitForSelector('[data-testid="keep-hand-btn"]', { timeout: 10000 });
  await sleep(2000); // let card deal animation play
  await page.screenshot({
    path: resolve(OUT_DIR, 'opening-hand.webp'),
    type: 'webp',
    quality: 90,
  });
  console.log('  -> opening-hand.webp');

  // ---------- 4. Game Board ----------
  console.log('4/4 Game board...');
  await page.click('[data-testid="keep-hand-btn"]');
  await sleep(4000); // AI mulligan + phase transitions + draws

  // Try to play a card from hand by clicking it
  const handCards = await page.$$('[data-testid^="hand-card-"]');
  console.log(`  Found ${handCards.length} hand cards`);
  if (handCards.length > 0) {
    // Click first card, then wait for it to play
    await handCards[0].click();
    await sleep(1500);
    // Double-click to play (double-tap mechanic)
    if (handCards.length > 0) {
      await handCards[0].click();
      await sleep(2000);
    }
  }

  await page.screenshot({
    path: resolve(OUT_DIR, 'game-board.webp'),
    type: 'webp',
    quality: 90,
  });
  console.log('  -> game-board.webp');

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
