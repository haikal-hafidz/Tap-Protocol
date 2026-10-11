// TAP Protocol - real-browser tests (Chromium through Playwright). Run with: npm run test:browser
//
// Every test uses a fresh browser context (its own IndexedDB, localStorage, caches and service workers), so no test
// touches anyone's real save. The app is served by a tiny static server started here. For the offline tests the
// server is STOPPED and the context is set offline, so a pass means the game really ran from the service-worker cache.
//
// What this does NOT cover: Firefox, Safari, real devices, the browser's own "Install" UI, screen readers.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { computeVersion, readPrecache } from '../tools/stamp-version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const SHOTS = process.env.TAP_SHOTS || '';
const LEGACY = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/legacy-save.json'), 'utf8'));

let passed = 0, failed = 0;
const failures = [];
const ONLY = process.env.TAP_ONLY ? new RegExp(process.env.TAP_ONLY, 'i') : null; // optional filter, e.g. TAP_ONLY=offline
async function test(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e) { failed++; failures.push(name); console.log(`FAIL  ${name}\n      ${String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')}`); }
}
function ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'not equal'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10000, what = 'condition') {
  const t0 = Date.now();
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* page may be navigating */ }
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}

// ---------------------------------------------------------------- static server
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve(root) {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}/`, port: server.address().port,
    async close() { for (const s of sockets) s.destroy(); await new Promise((r) => server.close(r)); }
  })));
}
function copyApp(dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(dest, f));
  for (const d of ['css', 'js', 'icons']) fs.cpSync(path.join(ROOT, d), path.join(dest, d), { recursive: true });
}
function stamp(root) {
  const v = computeVersion(root), f = path.join(root, 'sw.js');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${v}';`));
  return v;
}
const tmpDirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tap-browser-')); tmpDirs.push(d); return d; };

// ---------------------------------------------------------------- browser helpers
let browser;
async function launch() {
  try { return await chromium.launch(); }
  catch (e) { if (process.env.CHROMIUM_PATH) return chromium.launch({ executablePath: process.env.CHROMIUM_PATH }); throw e; }
}
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('__offline_probe__')) page.errors.push('console: ' + m.text()); });
  return { ctx, page };
}
async function create(page, base, name = 'Pithe') {
  await page.goto(base);
  await page.waitForSelector('form[data-form="create"]');
  await page.fill('input[name=name]', name);
  await page.fill('textarea[name=appearance]', 'Tall, tired eyes.');
  await page.click('form[data-form="create"] button[type=submit]');
  await page.waitForSelector('.navbtn');
}
const MORE_PAGES = ['tracker', 'quests', 'inventory', 'settings'];
const nav = async (page, view) => {
  if (MORE_PAGES.includes(view)) { await page.click('.navbtn[data-view="more"]'); await page.click(`main [data-action="nav"][data-view="${view}"]`); }
  else await page.click(`.navbtn[data-view="${view}"]`);
};
const readState = (page) => page.evaluate(() => new Promise((resolve, reject) => {
  const q = indexedDB.open('tap-protocol');
  q.onerror = () => reject(q.error);
  q.onsuccess = () => {
    const db = q.result;
    if (!db.objectStoreNames.contains('saves')) { db.close(); resolve(null); return; }
    const g = db.transaction('saves').objectStore('saves').get('main');
    g.onsuccess = () => { db.close(); resolve(g.result ? JSON.parse(g.result.payload) : null); };
    g.onerror = () => reject(g.error);
  };
}));
async function seedLegacy(page, base) {
  await page.goto(base + 'icons/icon.svg'); // any same-origin page: gives access to this origin's IndexedDB
  await page.evaluate((rec) => new Promise((resolve, reject) => {
    const q = indexedDB.open('tap-protocol', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('saves', { keyPath: 'key' });
    q.onerror = () => reject(q.error);
    q.onsuccess = () => { const tx = q.result.transaction('saves', 'readwrite'); tx.objectStore('saves').put(rec); tx.oncomplete = () => { q.result.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
  }), LEGACY.record);
}
// Click an action by its data attributes. Warning dialogs are confirmed (the player's choice), and recorded.
async function act(page, sel, warnings) {
  const btn = page.locator(sel).first();
  await btn.click();
  if (await page.locator('.modal').count()) {
    const txt = await page.locator('.modal').innerText();
    if (warnings) warnings.push(txt);
    await page.click('.modal [data-action="confirm"]');
  }
}
const activity = (id) => `[data-action="do"][data-kind="activity"][data-id="${id}"]`;
const swReady = (page) => page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
const cacheNames = (page) => page.evaluate(() => caches.keys());
const swVersion = (root) => 'tap-protocol-' + computeVersion(root);
const VIEW_IDS = ['dashboard', 'character', 'journal', 'tracker', 'world', 'quests', 'inventory', 'settings', 'more'];
const VIEW_TITLES = ['Home', 'Progress', 'Journal', 'Tracker', 'World', 'Quests', 'Inventory', 'Settings', 'More'];
const NAV_LABELS = ['Home', 'World', 'Journal', 'Progress', 'More'];

browser = await launch();
console.log(`Browser: Chromium ${browser.version()} (Playwright, headless)`);

// ================================================================ 1. manifest and installability
console.log('\n== Manifest and installability ==');
await test('manifest and every icon load in Chromium; Chromium reports no manifest errors and no installability errors', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage();
  try {
    await page.goto(srv.url);
    await swReady(page);
    const man = await (await page.request.get(srv.url + 'manifest.webmanifest')).json();
    for (const i of man.icons) {
      const size = await page.evaluate((src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im.naturalWidth + 'x' + im.naturalHeight); im.onerror = () => r(null); im.src = src; }), srv.url + i.src);
      eq(size, i.sizes, `icon ${i.src} decoded size`);
    }
    const cdp = await ctx.newCDPSession(page);
    const m = await cdp.send('Page.getAppManifest');
    eq(m.errors, [], 'Chromium manifest errors');
    ok(m.url.endsWith('manifest.webmanifest'), 'manifest url');
    const inst = await cdp.send('Page.getInstallabilityErrors');
    eq(inst.installabilityErrors, [], 'Chromium installability errors');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

// ================================================================ 2. service worker and app-shell cache
console.log('\n== Service worker and cache ==');
await test('service worker registers and the app shell is cached: cache holds exactly the precache list, all 200 and non-empty', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage();
  try {
    await page.goto(srv.url);
    ok(await swReady(page), 'service worker did not become active');
    const names = await cacheNames(page);
    eq(names, [swVersion(ROOT)], 'cache names');
    const entries = await page.evaluate(async (n) => { const c = await caches.open(n); const out = []; for (const r of await c.keys()) { const res = await c.match(r); out.push([r.url, res.status, (await res.clone().arrayBuffer()).byteLength]); } return out; }, names[0]);
    const want = readPrecache(ROOT).map((p) => new URL(p, srv.url).href).sort();
    eq(entries.map((e) => e[0]).sort(), want, 'cached URLs vs precache list');
    ok(entries.every((e) => e[1] === 200 && e[2] > 0), 'a cached response is not 200 or is empty');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

// ================================================================ 3. offline gameplay
console.log('\n== Offline gameplay (server stopped AND context offline) ==');
{
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage();
  const external = [];
  ctx.on('request', (r) => { if (!r.url().startsWith(srv.url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  let online = null;
  let offlineOk = true;
  try {
    await test('online first visit: create a character, play, and the save is written', async () => {
      await page.goto(srv.url);
      ok(await swReady(page), 'service worker not active');
      await create(page, srv.url);
      await act(page, activity('study'));
      await act(page, '[data-action="nav"][data-view="journal"]');
      await page.fill('form[data-form="journal"] textarea[name=text]', 'Written while online.');
      await page.click('form[data-form="journal"] button[type=submit]');
      online = await until(async () => { const s = await readState(page); return s && s.journal.length === 1 && s.character.exp > 0 ? s : null; }, 10000, 'save');
      await page.reload(); // second load is controlled by the service worker
      await page.waitForSelector('.navbtn');
      ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'page not controlled by the service worker');
    });

    await srv.close();                 // the network source is gone
    await ctx.setOffline(true);        // and the browser itself is offline
    await test('network is genuinely unavailable: a request to the origin fails, even through the service worker', async () => {
      const r = await page.evaluate(() => fetch('/__offline_probe__.txt').then(() => 'reached', () => 'failed'));
      eq(r, 'failed');
      const refused = await new Promise((res) => http.get({ host: '127.0.0.1', port: srv.port, path: '/' }, () => res(false)).on('error', () => res(true)));
      ok(refused, 'the server still answers');
      page.errors.length = 0;
    });

    await test('OFFLINE: the installed app launches from its start URL, in a new tab, with no network', async () => {
      const p2 = await ctx.newPage(); p2.errors = [];
      p2.on('pageerror', (e) => p2.errors.push(e.message));
      await p2.goto(srv.url); // start_url "./"
      await p2.waitForSelector('.navbtn', { timeout: 10000 });
      eq(await p2.locator('.navbtn').allInnerTexts(), NAV_LABELS, 'navigation missing');
      ok(await p2.evaluate(() => !!navigator.serviceWorker.controller), 'not controlled by the service worker');
      await p2.goto(srv.url + 'index.html');
      await p2.waitForSelector('.navbtn', { timeout: 10000 });
      eq(p2.errors, [], 'page errors while offline');
      await p2.close();
    });

    await test('OFFLINE: the existing save is read, and every section can be opened', async () => {
      await page.reload(); await page.waitForSelector('.navbtn');
      ok((await page.locator('.statusbar .who').innerText()).includes('Pithe'), 'character not shown');
      const s = await readState(page);
      eq(s.clock, online.clock, 'clock of loaded save'); eq(s.character.exp, online.character.exp, 'exp of loaded save');
      for (let i = 0; i < VIEW_IDS.length; i++) {
        await nav(page, VIEW_IDS[i]);
        eq(await page.locator('h1.viewtitle').innerText(), VIEW_TITLES[i], `title of ${VIEW_IDS[i]}`);
      }
      await nav(page, 'journal');
      ok((await page.locator('main').innerText()).includes('Written while online.'), 'online journal entry not visible offline');
    });

    await test('OFFLINE: the save can be updated (action + journal entry) and the change is persisted', async () => {
      await nav(page, 'dashboard');
      await act(page, activity('rest'));
      const afterRest = await until(async () => { const s = await readState(page); return s.clock > online.clock ? s : null; }, 10000, 'rest saved');
      await nav(page, 'journal');
      await page.fill('form[data-form="journal"] textarea[name=text]', 'Written while offline.');
      await page.click('form[data-form="journal"] button[type=submit]');
      const s2 = await until(async () => { const s = await readState(page); return s.journal.length === 2 ? s : null; }, 10000, 'journal saved');
      ok(s2.clock >= afterRest.clock);
      online = s2;
    });

    await test('OFFLINE: reload keeps the offline changes (persistence after reload)', async () => {
      await page.reload(); await page.waitForSelector('.navbtn');
      await nav(page, 'journal');
      const t = await page.locator('main').innerText();
      ok(t.includes('Written while offline.') && t.includes('Written while online.'), 'journal entries lost after reload');
      const s = await readState(page);
      eq(s.clock, online.clock, 'clock after reload'); eq(s.journal.length, 2, 'journal length');
      eq(page.errors, [], 'console or page errors during offline play');
      eq(external, [], 'requests to other origins');
    });
  } finally { await ctx.close(); }
}

// ================================================================ 4. updates
console.log('\n== Updates and cache versions ==');
await test('UPDATE: new version installs beside the old one, prompt appears, accepting it swaps caches, the save is untouched', async () => {
  const dir = tmp(); copyApp(dir);
  const srv = await serve(dir);
  const { ctx, page } = await newPage();
  try {
    const v1 = swVersion(dir);
    await page.goto(srv.url); await swReady(page);
    await create(page, srv.url);
    await act(page, activity('study'));
    const before = await until(async () => { const s = await readState(page); return s && s.character.exp > 0 ? s : null; }, 10000, 'save');
    await page.reload(); await page.waitForSelector('.navbtn');
    // "deploy" version 2: change the stylesheet and stamp the new cache version
    fs.appendFileSync(path.join(dir, 'css/style.css'), '\n:root { --tap-release-marker: "release-two"; }\n');
    const v2 = 'tap-protocol-' + stamp(dir);
    ok(v1 !== v2, 'version did not change');
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await until(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), 15000, 'waiting worker');
    eq((await cacheNames(page)).sort(), [v1, v2].sort(), 'both caches should exist while the update waits');
    ok(await page.locator('#update-banner').isVisible(), 'update prompt not shown');
    eq(await page.locator('#update-banner').getAttribute('role'), 'status');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tap-release-marker').trim()), '', 'new CSS applied before the player accepted');
    await page.click('#update-banner [data-update="now"]');
    await until(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tap-release-marker').trim() === '"release-two"'), 15000, 'new version in use');
    await page.waitForSelector('.navbtn');
    eq(await cacheNames(page), [v2], 'old cache should be deleted after activation');
    eq(await readState(page), before, 'save changed by the update');
    ok((await page.locator('.statusbar .who').innerText()).includes('Pithe'));
    ok(!(await page.locator('#update-banner').count()), 'prompt still shown after update');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

await test('UPDATE: "Later" dismisses the prompt and the old version keeps working', async () => {
  const dir = tmp(); copyApp(dir);
  const srv = await serve(dir);
  const { ctx, page } = await newPage();
  try {
    await page.goto(srv.url); await swReady(page); await create(page, srv.url); await page.reload(); await page.waitForSelector('.navbtn');
    fs.appendFileSync(path.join(dir, 'css/style.css'), '\n:root { --tap-release-marker: "release-two"; }\n'); stamp(dir);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await until(() => page.locator('#update-banner').isVisible(), 15000, 'prompt');
    await page.click('#update-banner [data-update="later"]');
    ok(!(await page.locator('#update-banner').count()), 'prompt not dismissed');
    await page.reload(); await page.waitForSelector('.navbtn'); // still the old version: the new one waits
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tap-release-marker').trim()), '');
  } finally { await ctx.close(); await srv.close(); }
});

await test('UPDATE FAILURE: a release with a missing file fails to install and the last working version stays intact and playable offline', async () => {
  const dir = tmp(); copyApp(dir);
  const srv = await serve(dir);
  const { ctx, page } = await newPage();
  try {
    const v1 = swVersion(dir);
    await page.goto(srv.url); await swReady(page);
    await create(page, srv.url); await act(page, activity('study'));
    const before = await until(async () => { const s = await readState(page); return s && s.character.exp > 0 ? s : null; }, 10000, 'save');
    await page.reload(); await page.waitForSelector('.navbtn');
    // broken deployment: a precached file is missing on the server
    fs.appendFileSync(path.join(dir, 'css/style.css'), '\n:root { --tap-release-marker: "broken-release"; }\n');
    stamp(dir);
    fs.rmSync(path.join(dir, 'icons/icon-192.png'));
    const result = await page.evaluate(() => new Promise(async (resolve) => {
      const reg = await navigator.serviceWorker.getRegistration();
      reg.addEventListener('updatefound', () => { const w = reg.installing; w.addEventListener('statechange', () => { if (w.state === 'redundant' || w.state === 'installed') resolve(w.state); }); });
      reg.update().catch(() => resolve('update-error'));
      setTimeout(() => resolve('timeout'), 15000);
    }));
    eq(result, 'redundant', 'the broken release should be rejected');
    const st = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { waiting: !!r.waiting, installing: !!r.installing, active: r.active && r.active.state }; });
    eq(st, { waiting: false, installing: false, active: 'activated' }, 'worker states after failed update');
    eq(await cacheNames(page), [v1], 'partial cache of the failed release must be deleted, old cache kept');
    ok(!(await page.locator('#update-banner').count()), 'no update prompt for a failed release');
    await srv.close(); await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('.navbtn', { timeout: 10000 });
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tap-release-marker').trim()), '', 'must still be the last working version');
    eq(await readState(page), before, 'save changed');
  } finally { await ctx.close(); await srv.close().catch(() => {}); }
});

await test('EXISTING SAVE: a save written by the previous (pre-PWA) release loads untouched, with the service worker active, online and offline', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage();
  try {
    await seedLegacy(page, srv.url);
    await page.goto(srv.url); await swReady(page); await page.reload(); await page.waitForSelector('.navbtn');
    ok((await page.locator('.statusbar .who').innerText()).includes(LEGACY.summary.name), 'legacy character not shown');
    const s = await readState(page);
    eq({ clock: s.clock, money: s.money, exp: s.character.exp, loc: s.location, journal: s.journal.length, goals: s.tracker.goals.length, notebook: s.inventory.notebook || 0 },
      { clock: LEGACY.summary.clock, money: LEGACY.summary.money, exp: LEGACY.summary.exp, loc: LEGACY.summary.location, journal: LEGACY.summary.journal, goals: LEGACY.summary.goals, notebook: LEGACY.summary.notebook }, 'legacy save contents');
    await nav(page, 'journal');
    ok((await page.locator('main').innerText()).includes('This entry was written by the previous release.'));
    await srv.close(); await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('.navbtn');
    ok((await page.locator('.statusbar .who').innerText()).includes(LEGACY.summary.name), 'legacy save not loaded offline');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close().catch(() => {}); }
});

// ================================================================ 5. save safeguards
console.log('\n== Export, import and reset safeguards ==');
await test('export downloads a valid save; invalid imports are rejected without changing the save; valid import restores it', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ serviceWorkers: 'block' });
  try {
    await create(page, srv.url);
    await act(page, activity('study'));
    const saved = await until(async () => { const s = await readState(page); return s && s.character.exp > 0 ? s : null; }, 10000, 'save');
    await nav(page, 'settings');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
    ok(/^tap-protocol-save-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'export file name: ' + dl.suggestedFilename());
    const exported = fs.readFileSync(await dl.path(), 'utf8');
    const obj = JSON.parse(exported);
    eq(obj.app, 'tap-protocol'); eq(obj.state.character.name, 'Pithe'); eq(obj.state.clock, saved.clock);
    for (const bad of ['not json at all', '{"state":{"hello":1}}', '{}']) {
      await page.fill('form[data-form="import"] textarea', bad);
      await page.click('form[data-form="import"] button[type=submit]');
      ok((await page.locator('form[data-form="import"] .error').innerText()).length > 5, `no error for ${bad}`);
      await page.waitForTimeout(150);
      eq(await readState(page), saved, `save changed by invalid import ${bad}`);
    }
    await nav(page, 'dashboard'); await act(page, activity('rest'));
    const moved = await until(async () => { const s = await readState(page); return s.clock > saved.clock ? s : null; }, 10000, 'rest saved');
    ok(moved.clock > saved.clock);
    await nav(page, 'settings');
    await page.fill('form[data-form="import"] textarea', exported);
    await page.click('form[data-form="import"] button[type=submit]');
    ok(await page.locator('.modal [data-action="confirm"]').isVisible(), 'importing must ask before replacing the game');
    await page.keyboard.press('Escape'); ok(!(await page.locator('.modal').count()), 'Escape should cancel the import'); eq(await readState(page), moved, 'cancelled import changed the save');
    await page.click('form[data-form="import"] button[type=submit]'); await page.click('.modal [data-action="confirm"]');
    const back = await until(async () => { const s = await readState(page); return s.clock === saved.clock ? s : null; }, 10000, 'import saved');
    eq(back, saved, 'import did not restore the exported save exactly');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

await test('reset requires the exact word RESET: other input is refused and the save survives; RESET deletes it', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ serviceWorkers: 'block' });
  try {
    await create(page, srv.url); await act(page, activity('study'));
    const saved = await until(async () => { const s = await readState(page); return s && s.character.exp > 0 ? s : null; }, 10000, 'save');
    await nav(page, 'settings');
    for (const wrong of ['', 'reset', 'RESET ', 'Reset', 'DELETE']) {
      await page.fill('form[data-form="reset"] input[name=confirm]', wrong);
      await page.click('form[data-form="reset"] button[type=submit]');
      ok((await page.locator('form[data-form="reset"] .error').innerText()).includes('RESET'), `no refusal for "${wrong}"`);
      eq(await readState(page), saved, `save deleted by "${wrong}"`);
    }
    await page.fill('form[data-form="reset"] input[name=confirm]', 'RESET');
    await page.click('form[data-form="reset"] button[type=submit]');
    await page.waitForSelector('form[data-form="create"]');
    eq(await readState(page), null, 'save not deleted by RESET');
  } finally { await ctx.close(); await srv.close(); }
});

// ================================================================ 6. responsive layout
console.log('\n== Responsive layout ==');
const WIDTHS = [300, 320, 360, 390, 600, 768, 1280];
async function overflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position !== 'fixed' && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > de.clientWidth + 0.5)
      .slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${e.className} (right ${Math.round(e.getBoundingClientRect().right)})`);
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders };
  });
}
await test(`no horizontal overflow on the setup screen and all 9 views (incl. More) at ${WIDTHS.join(', ')} px`, async () => {
  const srv = await serve(ROOT);
  try {
    for (const w of WIDTHS) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: 800 }, serviceWorkers: 'block' });
      try {
        await page.goto(srv.url); await page.waitForSelector('form[data-form="create"]');
        let o = await overflow(page); ok(o.scrollW <= o.clientW, `setup @${w}: scrollWidth ${o.scrollW} > ${o.clientW}: ${o.offenders.join('; ')}`);
        await seedLegacy(page, srv.url); await page.goto(srv.url); await page.waitForSelector('.navbtn');
        for (const v of VIEW_IDS) {
          await nav(page, v);
          o = await overflow(page);
          ok(o.scrollW <= o.clientW, `${v} @${w}: scrollWidth ${o.scrollW} > ${o.clientW}: ${o.offenders.join('; ')}`);
          if (SHOTS && (w === 300 || w === 390) && v === 'dashboard') await page.screenshot({ path: path.join(SHOTS, `dashboard-${w}.png`) });
        }
      } finally { await ctx.close(); }
    }
  } finally { await srv.close(); }
});

await test(`navigation labels are all present, in order, readable, spaced and touchable at ${WIDTHS.join(', ')} px`, async () => {
  const srv = await serve(ROOT);
  try {
    for (const w of WIDTHS) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: 800 }, serviceWorkers: 'block' });
      try {
        await seedLegacy(page, srv.url); await page.goto(srv.url); await page.waitForSelector('.navbtn');
        const items = await page.evaluate(() => [...document.querySelectorAll('.navbtn')].map((b) => {
          const r = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
          return { text: b.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height, tx: t.x, tr: t.right, ty: t.y, tb: t.bottom, fs: parseFloat(getComputedStyle(b).fontSize), clip: b.scrollWidth > b.clientWidth + 0.5 };
        }));
        eq(items.map((i) => i.text), NAV_LABELS, `labels @${w}`);
        const desktop = false;   // the bottom bar is used at every width now
        for (const i of items) {
          ok(!i.clip, `"${i.text}" clipped @${w}`);
          ok(i.tx >= i.x - 0.5 && i.tr <= i.x + i.w + 0.5, `"${i.text}" text outside its button @${w}`);
          ok(i.h >= 40, `"${i.text}" button only ${i.h}px high @${w}`);
          { ok(i.w >= 44 && i.h >= 44, `"${i.text}" touch target ${Math.round(i.w)}x${Math.round(i.h)} @${w}`); ok(i.fs >= 12, `"${i.text}" font ${i.fs}px @${w}`); }
        }
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
          const A = items[a], B = items[b];
          const overlap = A.x < B.x + B.w - 0.5 && B.x < A.x + A.w - 0.5 && A.y < B.y + B.h - 0.5 && B.y < A.y + A.h - 0.5;
          ok(!overlap, `buttons "${A.text}" and "${B.text}" overlap @${w}`);
          if (Math.abs(A.y - B.y) < 4) { const [L, R] = A.x < B.x ? [A, B] : [B, A]; ok(R.tx - L.tr >= 6, `labels "${L.text}" and "${R.text}" only ${(R.tx - L.tr).toFixed(1)}px apart @${w}`); }
        }
        const rows = new Set(items.map((i) => Math.round(i.y / 10))).size;
        eq(rows, 1, `bottom nav should be one row @${w}`);
        { // fixed bar must not cover the end of the page
          await nav(page, 'dashboard'); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          const gap = await page.evaluate(() => { const nb = document.querySelector('.nav').getBoundingClientRect().top; const m = document.querySelector('main'); return nb - m.lastElementChild.getBoundingClientRect().bottom; });
          ok(gap >= -0.5, `bottom nav covers the last content by ${-gap}px @${w}`);
        }
        if (SHOTS && (w === 300 || w === 390 || w === 600)) await page.screenshot({ path: path.join(SHOTS, `nav-${w}.png`) });
      } finally { await ctx.close(); }
    }
  } finally { await srv.close(); }
});

// ================================================================ 7. dialog keyboard behaviour and automated a11y scan
console.log('\n== Warning dialog and accessibility ==');
await test('warning dialog: focus moves in (onto Cancel), Tab is trapped, Escape cancels, focus returns to the opener, background is inert, labelled', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ serviceWorkers: 'block' });
  try {
    await create(page, srv.url);
    const trigger = activity('sleep'); // at full energy, Sleep raises a warning
    const before = await readState(page);
    await page.focus(trigger); await page.keyboard.press('Enter');
    await page.waitForSelector('.modal');
    const d = await page.evaluate(() => { const m = document.querySelector('.modal'); return { role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), label: document.getElementById(m.getAttribute('aria-labelledby')).textContent, desc: !!document.getElementById(m.getAttribute('aria-describedby')), active: document.activeElement.dataset.action, inert: document.querySelector('.app').hasAttribute('inert') }; });
    eq(d.role, 'alertdialog'); eq(d.modal, 'true'); ok(d.label.startsWith('Warning'), 'dialog has no accessible name'); ok(d.desc, 'no description');
    eq(d.active, 'cancel', 'focus should start on the safe button'); ok(d.inert, 'background not inert');
    for (let i = 0; i < 7; i++) { await page.keyboard.press('Tab'); ok(await page.evaluate(() => !!document.activeElement.closest('.modal')), `focus escaped the dialog on Tab ${i + 1}`); }
    for (let i = 0; i < 7; i++) { await page.keyboard.press('Shift+Tab'); ok(await page.evaluate(() => !!document.activeElement.closest('.modal')), `focus escaped the dialog on Shift+Tab ${i + 1}`); }
    await page.keyboard.press('Escape');
    ok(!(await page.locator('.modal').count()), 'Escape did not close the dialog');
    ok(await page.evaluate((s) => document.activeElement === document.querySelector(s), trigger), 'focus not returned to the opening button');
    eq(await readState(page), before, 'Escape changed the game state');
    // keyboard-only: open again, move to "Proceed anyway" with Tab, confirm with Enter
    await page.keyboard.press('Enter'); await page.waitForSelector('.modal');
    await page.keyboard.press('Tab');
    eq(await page.evaluate(() => document.activeElement.dataset.action), 'confirm', 'Tab from Cancel should wrap to Proceed');
    await page.keyboard.press('Enter');
    ok(!(await page.locator('.modal').count()), 'dialog still open after confirming');
    const after = await until(async () => { const s = await readState(page); return s.clock > before.clock ? s : null; }, 10000, 'sleep executed');
    ok(after.clock - before.clock >= 480, 'sleep did not run after keyboard confirmation');
    ok(await page.evaluate(() => document.activeElement && document.activeElement !== document.body), 'focus lost to the page body after confirming');
    // Cancel by mouse also restores focus
    await page.click(trigger); await page.waitForSelector('.modal'); await page.click('.modal [data-action="cancel"]');
    ok(await page.evaluate((s) => document.activeElement === document.querySelector(s), trigger), 'focus not returned after Cancel click');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

await test('automated accessibility scan (axe-core, WCAG 2.0/2.1 A and AA) on the setup screen, all 9 views (incl. More) and the warning dialog at 390px and 1280px', async () => {
  const srv = await serve(ROOT);
  try {
    const axePath = require.resolve('axe-core/axe.min.js');
    const report = [];
    for (const w of [390, 1280]) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
      try {
        const scan = async (label) => {
          await page.addScriptTag({ path: axePath });
          const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
          for (const v of res.violations) report.push(`${label} @${w}: ${v.id} (${v.impact}) ${v.nodes.length} node(s) e.g. ${v.nodes[0].target.join(' ')}`);
        };
        await page.goto(srv.url); await page.waitForSelector('form[data-form="create"]'); await scan('setup');
        await seedLegacy(page, srv.url); await page.goto(srv.url); await page.waitForSelector('.navbtn');
        for (const v of VIEW_IDS) { await nav(page, v); await scan(v); }
        await nav(page, 'dashboard');
        for (const t of ['people', 'family']) { await page.click(`[data-action="home-tab"][data-tab="${t}"]`); await scan('home ' + t); }
        await page.click('[data-action="panel"][data-panel="messages"]'); await page.waitForSelector('#header-panel'); await scan('messages panel');
        await page.click('[data-action="panel"][data-panel="notifications"]'); await scan('notifications panel');
        await page.keyboard.press('Escape'); ok(!(await page.locator('#header-panel').count()), 'Escape did not close the panel');
        await page.click('[data-action="home-tab"][data-tab="personal"]');
        await nav(page, 'dashboard'); await act(page, '[data-action="do"][data-kind="travel"][data-to="home"]');
        await page.click(activity('sleep')); await page.waitForSelector('.modal'); await scan('warning dialog');
      } finally { await ctx.close(); }
    }
    ok(!report.length, '\n      ' + report.join('\n      '));
  } finally { await srv.close(); }
});

await test('startup failure: a game file that throws shows the error screen with Reload (never an endless loading screen); Home categories fit at 300px', async () => {
  const srv = await serve(ROOT);
  try {
    const bad = await newPage({ serviceWorkers: 'block' });
    try {
      await bad.page.route('**/js/ui.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'throw new Error("boom")' }));
      await bad.page.goto(srv.url); await bad.page.waitForSelector('.fatal');
      ok((await bad.page.locator('.fatal').innerText()).includes('could not start') && await bad.page.locator('.fatal button').isVisible(), 'no error screen with Reload');
      ok(!(await bad.page.locator('.boot').count()), 'loading screen still shown after failure');
    } finally { await bad.ctx.close(); }
    const { ctx, page } = await newPage({ viewport: { width: 300, height: 800 }, serviceWorkers: 'block' });
    try {
      await create(page, srv.url);
      const t = await page.evaluate(() => { const e = document.querySelector('[aria-label="Home categories"]'); return { sw: e.scrollWidth, cw: e.clientWidth, labels: [...e.children].map((b) => b.textContent.trim()) }; });
      ok(t.sw <= t.cw, `Home categories scroll inside their strip at 300px (${t.sw} > ${t.cw})`); eq(t.labels, ['People', 'Family', 'Personal']);
    } finally { await ctx.close(); }
  } finally { await srv.close(); }
});

await test('UX session 2 interactions @390px: results land in view and take focus, stale results clear on navigation, typed drafts survive panels, tracker fields match the type, focus returns after a re-render', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 700 }, serviceWorkers: 'block' });
  try {
    await create(page, srv.url);
    await page.click('[data-action="do"][data-kind="activity"][data-id="rest"]');
    await page.waitForSelector('.report');
    const r = await page.evaluate(() => ({ top: document.querySelector('.report').getBoundingClientRect().top, focused: document.activeElement === document.querySelector('.report') }));
    ok(r.top >= -1 && r.top < 700, `result not brought into view (top ${r.top})`); ok(r.focused, 'result did not take focus');
    await page.click('.navbtn[data-view="journal"]'); ok(!(await page.locator('.report').count()), 'stale result still shown on another page');
    ok(await page.evaluate(() => document.activeElement.dataset.view === 'journal'), 'focus not kept on the navigation button');
    await page.fill('form[data-form="journal"] textarea[name=text]', 'half written');
    await page.click('[data-panel="notifications"]'); await page.keyboard.press('Escape');
    eq(await page.inputValue('form[data-form="journal"] textarea[name=text]'), 'half written', 'draft lost after opening a panel');
    await page.click('.navbtn[data-view="more"]'); await page.click('main [data-action="nav"][data-view="tracker"]');
    const vis = async (n) => page.locator(`form[data-form="goal"] [name=${n}]`).isVisible();
    ok(!(await vis('target')) && await vis('cadence'), 'habit should show cadence only');
    await page.selectOption('form[data-form="goal"] select[name=kind]', 'goal'); ok(await vis('target') && !(await vis('cadence')), 'goal should show target only');
    await page.selectOption('form[data-form="goal"] select[name=kind]', 'task'); ok(!(await vis('target')) && !(await vis('cadence')), 'task needs neither');
    await page.fill('form[data-form="goal"] input[name=name]', 'Draft kept'); await page.click('[data-panel="messages"]'); await page.click('[data-action="close-panel"]');
    eq(await page.inputValue('form[data-form="goal"] input[name=name]'), 'Draft kept', 'goal draft lost');
    await page.click('form[data-form="goal"] button[type=submit]');
    ok((await page.locator('[data-msg]').innerText()).includes('Created "Draft kept"'), 'no success feedback');
    eq(await page.inputValue('form[data-form="goal"] input[name=name]'), '', 'form not cleared after success');
    await page.click('.navbtn[data-view="more"]'); await page.click('main [data-action="nav"][data-view="tracker"]'); ok(!(await page.locator('[data-msg]').count()), 'stale tracker message after leaving and returning');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

// ================================================================ 8. quest failure path
console.log('\n== Quest failure path (played through the real UI) ==');
await test('QUEST deadline miss: accept from Dani, let 72 game hours pass, verify outcome, consequences, journal, persistence and reload', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const warnings = [];
  try {
    await create(page, srv.url);
    // Dani is at the cafe from 10:00; the game starts at 07:00 at home. Rest until 10:00, then walk over.
    for (let i = 0; i < 12; i++) { const s = await until(() => readState(page)); if (s.clock >= 180) break; await act(page, activity('rest'), warnings); await until(async () => (await readState(page)).clock > s.clock, 10000, 'rest saved'); }
    await act(page, '[data-action="do"][data-kind="travel"][data-to="cafe"]', warnings);
    await until(async () => (await readState(page)).location === 'cafe', 10000, 'arrived at the cafe');
    await nav(page, 'world');
    await page.click('[data-action="open-talk"][data-npc="dani"]');
    await act(page, '[data-action="do"][data-kind="talk"][data-npc="dani"][data-topic="job"]', warnings);
    await act(page, '[data-action="do"][data-kind="talk"][data-npc="dani"][data-topic="accept"]', warnings);
    let st = await until(async () => { const s = await readState(page); return s.quests.menu.status === 'active' ? s : null; }, 10000, 'quest accepted');
    const q0 = st.quests.menu;
    eq(q0.deadline - q0.acceptedAt, 72 * 60, 'deadline should be 72 game hours after accepting');
    // Real progress that does NOT complete it: one draft (three are needed, and delivery never happens)
    await nav(page, 'dashboard');
    await act(page, activity('write'), warnings);
    st = await until(async () => { const s = await readState(page); return s.quests.menu.drafts === 1 ? s : null; }, 10000, 'draft written');
    eq(st.quests.menu.status, 'active');
    // Go home and let time pass: sleep, nap or rest until the deadline is missed.
    await act(page, '[data-action="do"][data-kind="travel"][data-to="home"]', warnings);
    let prev = await until(async () => { const s = await readState(page); return s.location === 'home' ? s : null; }, 10000, 'home');
    let failed = null;
    for (let i = 0; i < 80 && !failed; i++) {
      await nav(page, 'dashboard');
      let clicked = false;
      for (const id of ['sleep', 'nap', 'rest']) { if (await page.locator(activity(id)).isEnabled()) { await act(page, activity(id), warnings); clicked = true; break; } }
      ok(clicked, 'no sleep, nap or rest action was available');
      const cur = await until(async () => { const s = await readState(page); return s.clock > prev.clock ? s : null; }, 10000, 'time to advance');
      if (cur.quests.menu.status === 'failed') failed = cur; else prev = cur;
    }
    ok(failed, 'the quest never failed after 80 steps');
    ok(warnings.some((w) => w.includes('deadline')), 'no warning about the deadline was shown before it was missed:\n' + warnings.join('\n---\n'));
    // ---- outcome, according to the existing rules
    const f = failed.quests.menu;
    eq(f.status, 'failed'); eq(f.outcome, 'late');
    ok(f.finishedAt > f.deadline, 'finishedAt should be after the deadline');
    eq(f.objectives.deliver, false, 'must not be delivered'); ok(f.drafts < 3, 'drafts');
    eq(failed.relations.dani, (prev.relations.dani || 0) - 10, 'Dani trust should drop by exactly 10');
    ok(failed.money <= prev.money, 'failure must not pay money'); eq(failed.character.exp, prev.character.exp, 'failure must not give EXP');
    ok(!failed.inventory.regulars_card && !failed.inventory.stamp_card, 'no reward item');
    ok(failed.log.at(-1).notes.some((n) => n.startsWith('Quest failed: The Missing Menu')), 'failure missing from the activity log');
    // ---- what the player sees
    const report = await page.locator('section.report').innerText();
    ok(report.includes('Quest failed: The Missing Menu'), 'failure notice not shown to the player');
    await nav(page, 'quests');
    const qt = await page.locator('main').innerText();
    ok(qt.includes('Status: Failed') && qt.includes('You missed the deadline and Dani hired someone else.'), 'quest view does not show the failure');
    ok(!qt.includes('left.'), 'a failed quest must not show a countdown');
    await nav(page, 'journal'); await page.click('[data-action="tab"][data-tab="history"]');
    ok((await page.locator('main').innerText()).includes('Quest failed: The Missing Menu'), 'failure missing from the journal activity history');
    // ---- persistence: the stored record is the failed state, and a full reload shows the same
    eq(await readState(page), failed, 'stored state differs from the state at failure');
    await page.reload(); await page.waitForSelector('.navbtn');
    eq(await readState(page), failed, 'reload changed the stored state');
    await nav(page, 'quests');
    const rt = await page.locator('main').innerText();
    ok(rt.includes('Status: Failed') && rt.includes('You missed the deadline'), 'failed state not shown after reload');
    await nav(page, 'journal'); await page.click('[data-action="tab"][data-tab="history"]');
    ok((await page.locator('main').innerText()).includes('Quest failed: The Missing Menu'), 'journal history lost after reload');
    // ---- the world stays playable and Dani no longer accepts a delivery
    await nav(page, 'dashboard');
    for (let i = 0; i < 40; i++) { // rest at home until the cafe is open and Dani is in
      const s = await readState(page); const h = Math.floor((s.clock % 1440) / 60);
      if (h >= 10 && h < 18) break;
      await act(page, activity('rest'), warnings); await until(async () => (await readState(page)).clock > s.clock, 10000, 'rest saved');
    }
    await act(page, '[data-action="do"][data-kind="travel"][data-to="cafe"]', warnings);
    await until(async () => (await readState(page)).location === 'cafe', 10000, 'arrived at the cafe');
    await nav(page, 'world'); await page.click('[data-action="open-talk"][data-npc="dani"]');
    const topics = await page.locator('.talk li.action strong').allInnerTexts();
    ok(!topics.some((t) => /Deliver/i.test(t)), 'delivery still offered after failure: ' + topics.join('|'));
    ok(topics.some((t) => /Ask about the menu/i.test(t)), 'aftermath topic missing: ' + topics.join('|'));
    eq((await readState(page)).quests.menu.status, 'failed', 'status after more play');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

console.log('\n== Real-life Tracker rewards Pithe (real browser, real IndexedDB) ==');
await test('TRACKER REWARD: complete a real-life task in Chromium: EXP rises once; double click, reload and navigation never pay again', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ serviceWorkers: 'block' });
  try {
    await create(page, srv.url);
    await nav(page, 'tracker');
    ok((await readState(page)).settings.integration === true, 'rewards on by default');
    await page.fill('form[data-form="goal"] input[name="name"]', 'Study Excel');
    await page.selectOption('form[data-form="goal"] select[name="kind"]', 'task');
    ok(await page.isChecked('form[data-form="goal"] input[name="rpgLink"]'), 'link box checked by default');
    await page.selectOption('form[data-form="goal"] select[name="linkedSkill"]', 'research');
    await page.click('form[data-form="goal"] button[type="submit"]');
    let st = await until(async () => { const x = await readState(page); return x && x.tracker.goals.length === 1 ? x : null; }, 10000, 'task saved');
    eq(st.character.exp, 0, 'creating a task paid'); eq(st.tracker.goals[0].completions.length, 0);
    const research0 = st.character.skills.research;
    await page.dblclick('form[data-form="record"] button[type="submit"]');          // a real double click
    st = await until(async () => { const x = await readState(page); return x.tracker.goals[0].completions.length ? x : null; }, 10000, 'completion saved');
    await sleep(400); st = await readState(page);
    eq(st.tracker.goals[0].completions.length, 1, 'double click recorded twice'); eq(st.character.exp, 6, 'EXP after double click');
    eq(st.tracker.goals[0].completions[0].reward.status, 'granted');
    eq(st.character.skills.research.level * 1000 + st.character.skills.research.exp, research0.level * 1000 + research0.exp + 4, 'skill EXP');
    ok((await page.locator('.notice').innerText()).includes('+6 EXP'), 'player feedback');
    await page.reload(); await page.waitForSelector('.navbtn');                      // refresh
    st = await readState(page); eq(st.character.exp, 6, 'EXP after reload'); eq(st.tracker.goals[0].completions.length, 1);
    await nav(page, 'tracker');
    ok(await page.locator('form[data-form="record"] button[type="submit"]').isDisabled(), 'complete button should stay disabled after reload');
    await nav(page, 'quests'); await nav(page, 'tracker'); await nav(page, 'character'); await nav(page, 'tracker');
    await page.reload(); await page.waitForSelector('.navbtn');
    st = await readState(page); eq(st.character.exp, 6, 'EXP after navigating and a second reload'); eq(st.tracker.goals[0].completions.length, 1);
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});


// ================================================================ UX Session 2, Part 2 regression tests
console.log('\n== UX Session 2, Part 2 ==');
// Builds a save with real play on it: tracker items (one granted, one history line), a blocked action card (Rest at the closed
// Cafe), a talk panel, and a journal entry. Fresh-save scans cannot see these states.
async function populated(page, base, toCafe = true) {
  await create(page, base);
  await nav(page, 'tracker');
  await page.fill('form[data-form="goal"] input[name=name]', 'Read 20 pages');
  await page.click('form[data-form="goal"] button[type=submit]'); await page.waitForSelector('[data-msg]');
  await page.locator('form[data-form="record"] button[type=submit]').first().click(); await page.waitForSelector('.notice');
  await nav(page, 'dashboard');
  await act(page, activity('study')); await act(page, activity('exercise')); await act(page, activity('write'));
  if (toCafe) await act(page, '[data-action="do"][data-kind="travel"][data-to="cafe"]');
}

await test('ACCESSIBILITY (populated save): axe-core WCAG 2.0/2.1/2.2 A and AA at 300, 390 and 1280px on Home with a blocked action card, Tracker with history, Inventory, World with the talk panel, the header panels and the import confirmation', async () => {
  const srv = await serve(ROOT);
  try {
    const axePath = require.resolve('axe-core/axe.min.js');
    const report = [];
    for (const w of [300, 390, 1280]) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
      try {
        await populated(page, srv.url, false);   // at home: "Cook a meal" is a blocked card (no rice)
        await page.addScriptTag({ path: axePath });
        const scan = async (label) => {
          const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
          for (const v of res.violations) report.push(`${label} @${w}: ${v.id} (${v.impact}) ${v.nodes.length} node(s) e.g. ${v.nodes[0].target.join(' ')}`);
        };
        await nav(page, 'dashboard');
        ok(await page.locator('.action.blocked').count() > 0, 'the scenario must contain a blocked action card');
        await scan('home with blocked card');
        await nav(page, 'tracker'); ok(await page.locator('details').count() > 0, 'history disclosure expected'); await scan('tracker with history');
        await nav(page, 'inventory'); await scan('inventory');
        await nav(page, 'dashboard'); await act(page, '[data-action="do"][data-kind="travel"][data-to="cafe"]');
        await nav(page, 'world'); await page.click('[data-action="open-talk"]'); await scan('world with talk panel');
        await nav(page, 'character'); await scan('progress');
        await page.click('[data-action="panel"][data-panel="notifications"]'); await scan('notifications panel'); await page.keyboard.press('Escape');
        await nav(page, 'settings');
        const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
        const json = fs.readFileSync(await dl.path(), 'utf8');
        await page.fill('form[data-form="import"] textarea', json); await page.click('form[data-form="import"] button[type=submit]'); await page.waitForSelector('.modal');
        await scan('import confirmation'); await page.keyboard.press('Escape');
        eq(page.errors, [], 'console errors');
      } finally { await ctx.close(); }
    }
    ok(!report.length, '\n      ' + report.join('\n      '));
  } finally { await srv.close(); }
});

await test('LAYOUT @300px and @390px (populated save): no element sticks out of its panel, card or list (skills, travel buttons, talk choices)', async () => {
  const srv = await serve(ROOT);
  try {
    for (const w of [300, 390]) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
      try {
        await populated(page, srv.url);
        const escapes = () => page.evaluate(() => {
          const bad = [];
          for (const el of document.querySelectorAll('main *')) {
            const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
            const panel = el.closest('.panel, .action, .popover, .report, li, section');
            const host = panel && panel !== el ? panel : el.parentElement; if (!host) continue;
            const h = host.getBoundingClientRect();
            if (b.right > h.right + 1 || b.left < h.left - 1) bad.push(`${el.tagName}.${el.className} "${(el.textContent || '').trim().slice(0, 24)}"`);
          }
          return bad.slice(0, 5);
        });
        for (const v of ['dashboard', 'world', 'character', 'tracker', 'inventory', 'quests']) { await nav(page, v); eq(await escapes(), [], `${v} @${w}`); }
        await nav(page, 'world'); await page.click('[data-action="open-talk"]'); eq(await escapes(), [], `talk panel @${w}`);
        eq(page.errors, [], 'console errors');
      } finally { await ctx.close(); }
    }
  } finally { await srv.close(); }
});

await test('SAVE FAILURE: when the device refuses the write, a visible alert says so and the game stays playable; it clears when saving works again', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  try {
    await create(page, srv.url); await sleep(300);
    await page.evaluate(() => {
      window.__orig = { tx: IDBDatabase.prototype.transaction, set: Storage.prototype.setItem };
      IDBDatabase.prototype.transaction = function (st, m) { if (m === 'readwrite') throw new DOMException('The disk is full', 'QuotaExceededError'); return window.__orig.tx.call(this, st, m); };
      Storage.prototype.setItem = function () { throw new DOMException('quota exceeded', 'QuotaExceededError'); };
    });
    await act(page, activity('rest'));
    const alertSel = 'main > section.report.fail[role="alert"]';
    await until(() => page.locator(alertSel).count(), 5000, 'save-failure alert');
    ok((await page.locator(alertSel).innerText()).includes('could not be saved'), 'alert wording');
    ok((await page.locator('#save-status').innerText()).startsWith('Save failed'), 'header status');
    ok(await page.locator('.report').count() > 1, 'the rest result must still be shown (game still playable)');
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__orig.tx; Storage.prototype.setItem = window.__orig.set; });
    await act(page, activity('rest'));
    await until(async () => (await page.locator(alertSel).count()) === 0, 5000, 'alert to clear');
    eq(await page.locator('#save-status').innerText(), 'Saved locally');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

await test('INTERACTION details: distinct button names, Dismiss keeps keyboard focus, Export confirms, empty Import is explained, streak wording, heading order', async () => {
  const srv = await serve(ROOT);
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  try {
    await populated(page, srv.url);
    await nav(page, 'dashboard');
    const names = await page.$$eval('main [data-action="do"]:not([disabled])', (els) => els.map((e) => e.getAttribute('aria-label') || e.textContent.trim()));
    ok(names.length > 3, 'need several actions'); eq(new Set(names).size, names.length, 'accessible names must be unique: ' + names.join(' | '));
    ok(names.every((n, i) => n.startsWith('Start') || n.startsWith('Go') || n.startsWith('Say') || n.length > 0), 'names present');
    // heading order: the result title must be an h2 (not an h3 straight after the page h1)
    ok(await page.locator('.report h2.report-title').count() > 0 && (await page.locator('.report h3').count()) === 0, 'result title heading level');
    // Dismiss with the keyboard: focus must not fall to the page body
    await page.focus('.report [data-action="dismiss"]'); await page.keyboard.press('Enter');
    ok(await page.evaluate(() => document.activeElement && document.activeElement !== document.body && document.activeElement.matches('.viewtitle')), 'focus after Dismiss');
    // streak wording: one completion = "1 day", not "1 days"
    await nav(page, 'tracker');
    const small = await page.locator('li.goal small').first().innerText();
    ok(/Streak: 1 day\./.test(small), 'streak wording: ' + small);
    // Export gives in-app feedback; the message goes away on navigation
    await nav(page, 'settings');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
    ok(/^tap-protocol-save-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'file name');
    ok((await page.locator('[data-msg-export]').innerText()).startsWith('Export started'), 'export feedback');
    ok(await page.locator('[data-msg-export]').getAttribute('role') === 'status', 'export feedback is a status message');
    await nav(page, 'more'); await nav(page, 'settings');
    eq(await page.locator('[data-msg-export]').count(), 0, 'export message should clear on navigation');
    // Empty import: a clear instruction, nothing changes, no dialog
    await page.click('form[data-form="import"] button[type=submit]');
    eq((await page.locator('[data-msg]').first().innerText()), 'Paste the contents of a save file first.');
    eq(await page.locator('.modal').count(), 0, 'no dialog for an empty import');
    eq(page.errors, [], 'console errors');
  } finally { await ctx.close(); await srv.close(); }
});

await browser.close();
for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed${failed ? `\nFailed: ${failures.join('; ')}` : ''}`);
process.exit(failed ? 1 : 0);
