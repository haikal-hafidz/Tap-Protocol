// Dev tool. Computes the cache version (a hash of every file listed in sw.js PRECACHE) and writes it into sw.js.
// Run: npm run stamp        Check only: node tools/stamp-version.mjs --check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readPrecache(root = ROOT) {
  const src = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const m = src.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!m) throw new Error('PRECACHE list not found in sw.js');
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
}

export function computeVersion(root = ROOT) {
  const h = crypto.createHash('sha256');
  for (const p of readPrecache(root)) {
    const file = p === './' ? 'index.html' : p; // './' is served from index.html
    h.update(p + '\0');
    h.update(fs.readFileSync(path.join(root, file)));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 12);
}

export function stampedVersion(root = ROOT) {
  const m = fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const CACHE_VERSION = '([^']*)';/);
  return m ? m[1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const want = computeVersion(), have = stampedVersion();
  if (process.argv.includes('--check')) {
    console.log(want === have ? `sw.js version is current (${have})` : `sw.js version is STALE: has ${have}, files hash to ${want}`);
    process.exit(want === have ? 0 : 1);
  }
  const f = path.join(ROOT, 'sw.js');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${want}';`));
  console.log(`sw.js CACHE_VERSION: ${have} -> ${want}`);
}
