import fs from 'node:fs';
import path from 'node:path';

const forbiddenDirs = [
  'public/audio/sfx/sources',
  'public/vfx/sprites/sources',
];

const runtimeChecks = [
  {
    manifestPath: 'public/audio/sfx/catalog.json',
    readPaths: (json) => {
      const runtime = json.runtime_sound_types ?? {};
      const paths = [];
      for (const value of Object.values(runtime)) {
        if (Array.isArray(value)) paths.push(...value);
        else if (value && typeof value === 'object') {
          for (const nested of Object.values(value)) {
            if (Array.isArray(nested)) paths.push(...nested);
          }
        }
      }
      return paths;
    },
  },
  {
    manifestPath: 'public/vfx/sprites/index.json',
    readPaths: (json) => {
      const curated = json.curated ?? {};
      const paths = [];
      for (const value of Object.values(curated)) {
        if (Array.isArray(value)) paths.push(...value);
      }
      return paths;
    },
  },
];

let hasError = false;

for (const dir of forbiddenDirs) {
  if (fs.existsSync(dir)) {
    console.error(`Forbidden deploy directory detected: ${dir}`);
    hasError = true;
  }
}

for (const check of runtimeChecks) {
  if (!fs.existsSync(check.manifestPath)) {
    console.error(`Missing runtime manifest: ${check.manifestPath}`);
    hasError = true;
    continue;
  }
  const json = JSON.parse(fs.readFileSync(check.manifestPath, 'utf8'));
  const missing = check
    .readPaths(json)
    .filter((assetPath) => typeof assetPath === 'string')
    .map((assetPath) => path.normalize(assetPath))
    .filter((assetPath) => !fs.existsSync(assetPath));
  if (missing.length > 0) {
    console.error(`Manifest has missing runtime asset paths: ${check.manifestPath}`);
    for (const assetPath of missing.slice(0, 20)) console.error(`  - ${assetPath}`);
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
    hasError = true;
  }
}

if (hasError) process.exit(1);

console.log('Public runtime asset verification passed.');
