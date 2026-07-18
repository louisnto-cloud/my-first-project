// After `next build`, walk the exported `out/` directory and write a manifest
// of every file the app needs. The service worker reads this on install and
// caches all of it, so the whole pilgrimage works offline from the very first
// launch — not just pages already visited. (Built for use mid-flight.)

import { readdir, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const OUT = new URL('../out/', import.meta.url).pathname;

// Skip things that are large, per-request, or pointless to precache.
const SKIP = new Set(['precache-manifest.json']);
const SKIP_EXT = new Set(['.map', '.txt']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

const all = await walk(OUT);
const manifest = all
  .map((f) => relative(OUT, f).split('\\').join('/'))
  .filter((p) => !SKIP.has(p) && ![...SKIP_EXT].some((ext) => p.endsWith(ext)));

// A short hash of the manifest doubles as the cache version, so a new build
// transparently retires the old cache.
let hash = 0;
for (const ch of manifest.join('|')) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
const version = `pilgrimage-${(hash >>> 0).toString(36)}`;

await writeFile(
  join(OUT, 'precache-manifest.json'),
  JSON.stringify({ version, files: manifest }),
);

await stat(join(OUT, 'sw.js')); // fail loudly if the service worker is missing
console.log(`precache: ${manifest.length} files, version ${version}`);
