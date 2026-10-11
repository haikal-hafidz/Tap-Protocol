// TAP Protocol - cloud sync tests in a real browser (Chromium via Playwright): the real game UI, two isolated browser
// contexts playing "laptop" and "phone", against the in-process Supabase stand-in (tests/sync-mock-server.mjs).
// Run with: npm run test:sync-browser   (needs: npm install, then npx playwright install chromium)
// NOT covered: the real Supabase servers, real emails, real devices, Firefox/Safari.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from './sync-mock-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log('PASS  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 5).join('\n      ')); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'not equal') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 12000, what = 'condition') { const t0 = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch { /* navigating */ } if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await sleep(100); } }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
// The app is served from a SUB-PATH (/Tap-Protocol/), exactly like GitHub Pages, so redirect and cache paths are really exercised.
function serve(dir, prefix = '/Tap-Protocol/') {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!p.startsWith(prefix)) { res.writeHead(404); res.end('not found'); return; }
    p = p.slice(prefix.length); if (!p || p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(fs.readFileSync(f));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${server.address().port}${prefix}`, close: () => new Promise((x) => { server.closeAllConnections && server.closeAllConnections(); server.close(x); }) })));
}
function copyApp(dest, mockUrl) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(dest, f));
  for (const d of ['css', 'js', 'icons']) fs.cpSync(path.join(ROOT, d), path.join(dest, d), { recursive: true });
  fs.writeFileSync(path.join(dest, 'js/config.js'), `export const SUPABASE_URL = ${JSON.stringify(mockUrl)};\nexport const SUPABASE_KEY = 'sb_publishable_testkey';\n`);
  // keep the cache version honest for the modified config.js
  const { computeVersion } = awaitedStamp; const f = path.join(dest, 'sw.js');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${computeVersion(dest)}';`));
}
const awaitedStamp = await import('../tools/stamp-version.mjs');

const readState = (page) => page.evaluate(() => new Promise((res) => { const q = indexedDB.open('tap-protocol'); q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('main'); g.onsuccess = () => res(g.result ? JSON.parse(g.result.payload) : null); g.onerror = () => res(null); }; q.onerror = () => res(null); }));
const statusText = (page) => page.locator('#cloud-status').first().textContent().then((t) => t.trim());

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tap-sync-'));
const mock = createMock({ confirmEmail: true });
const mockSrv = await mock.listen();
copyApp(path.join(tmp, 'app'), mockSrv.url);
const app = await serve(path.join(tmp, 'app'));
const browser = await chromium.launch();
async function device() {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } }); const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) page.errors.push(m.text()); });
  return { ctx, page };
}
async function createPithe(page, url = app.url) { await page.goto(url); await page.waitForSelector('form[data-form="create"]'); await page.click('form[data-form="create"] button[type="submit"]'); await page.waitForSelector('.navbtn'); await until(() => readState(page), 8000, 'local save'); }
async function openSettings(page) { await page.click('.navbtn[data-view="more"]'); await page.click('main [data-action="nav"][data-view="settings"]'); await page.waitForSelector('#cloud-panel'); }
async function signIn(page, email, create = false) {
  await page.fill('form[data-cloud-form="signin"] input[name="email"]', email); await page.fill('form[data-cloud-form="signin"] input[name="password"]', 'password1');
  await page.click(create ? '[data-cloud="signup"]' : 'form[data-cloud-form="signin"] button[type="submit"]');
}
async function toggleRewards(page) { await openSettings(page); await page.click('[data-action="toggle-integration"]'); await until(async () => (await page.locator('#save-status').textContent()).includes('Saved'), 6000, 'local save'); }

let A, B;
try {
  console.log('== Cloud sync in a real browser (stand-in server) ==');
  await test('with no config the game runs exactly as before (cloud panel says not set up, no network calls)', async () => {
    const d = path.join(tmp, 'plain'); copyApp(d, ''); fs.writeFileSync(path.join(d, 'js/config.js'), "export const SUPABASE_URL = '';\nexport const SUPABASE_KEY = '';\n");
    const srv = await serve(d); const { ctx, page } = await device(); const before = mock.log.length;
    try { await createPithe(page, srv.url); await openSettings(page); ok(/not set up/i.test(await page.locator('#cloud-panel').textContent())); eq(mock.log.length, before); eq(page.errors, []); } finally { await ctx.close(); await srv.close(); }
  });

  await test('v0.2.2: filling in the key later works WITHOUT re-stamping the cache (config.js is network-first), and stays available offline afterwards', async () => {
    const d = path.join(tmp, 'late-key'); copyApp(d, ''); fs.writeFileSync(path.join(d, 'js/config.js'), "export const SUPABASE_URL = '';\nexport const SUPABASE_KEY = '';\n");
    const f = path.join(d, 'sw.js'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${awaitedStamp.computeVersion(d)}';`));
    const stampBefore = fs.readFileSync(f, 'utf8');
    const srv = await serve(d); const { ctx, page } = await device();
    try {
      await createPithe(page, srv.url); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await openSettings(page);
      ok(/not set up/i.test(await page.locator('#cloud-panel').textContent()), 'starts with sync off');
      fs.writeFileSync(path.join(d, 'js/config.js'), `export const SUPABASE_URL = ${JSON.stringify(mockSrv.url)};\nexport const SUPABASE_KEY = 'sb_publishable_testkey';\n`);
      eq(fs.readFileSync(f, 'utf8'), stampBefore, 'sw.js was NOT re-stamped');
      await page.reload(); await openSettings(page);
      ok(!/not set up/i.test(await page.locator('#cloud-panel').textContent()), 'new key picked up: ' + (await page.locator('#cloud-panel').textContent()).slice(0, 120));
      await ctx.setOffline(true); await srv.close();
      await page.reload(); await openSettings(page);
      ok(!/not set up/i.test(await page.locator('#cloud-panel').textContent()), 'offline: the last config is still used');
      eq(page.errors, []);
    } finally { await ctx.close(); try { await srv.close(); } catch { /* already closed */ } }
  });

  A = await device(); B = await device();
  await test('sign-up on the laptop (email confirmation ON) shows the check-your-email notice; no session yet', async () => {
    await createPithe(A.page); await openSettings(A.page); await signIn(A.page, 'me@x.test', true);
    await until(async () => /confirm/i.test(await A.page.locator('#cloud-panel').textContent()), 6000, 'confirmation notice'); ok(!mock.rows.size);
  });
  await test('clicking the email link returns to the GitHub-Pages sub-path, signs in, removes the tokens from the address bar, uploads the save', async () => {
    await A.page.goto('about:blank'); await A.page.goto(app.url + mock.confirm('me@x.test')); await A.page.waitForSelector('.navbtn');
    await until(() => !A.page.url().includes('access_token'), 5000, 'fragment removed'); ok(A.page.url().startsWith(app.url), 'stayed on the sub-path: ' + A.page.url());
    await openSettings(A.page); await until(async () => /Synced at/.test(await statusText(A.page)), 8000, 'Synced');
    eq(mock.row('me@x.test').revision, 1); eq(mock.row('me@x.test').payload.character.name, (await readState(A.page)).character.name);
  });
  await test('the phone (no save) signs in: setup screen offers the cloud panel, Restore downloads the same character, nothing is uploaded', async () => {
    await B.page.goto(app.url); await B.page.waitForSelector('#cloud-panel'); mock.users.get('me@x.test').confirmed = true; const w = mock.writes;
    await signIn(B.page, 'me@x.test'); await until(async () => /available to restore/i.test(await statusText(B.page)), 8000, 'restore offer'); eq(await readState(B.page), null, 'not filled silently');
    await B.page.click('[data-cloud="restore"]'); await B.page.waitForSelector('.navbtn'); const sA = await readState(A.page), sB = await until(() => readState(B.page), 6000, 'restored save');
    eq(sB.character.name, sA.character.name); eq(sB.clock, sA.clock); await sleep(3000); eq(mock.writes, w, 'restoring never uploads');
  });
  await test('a change on the laptop reaches the phone when it is opened again; no echo back', async () => {
    await toggleRewards(A.page); await until(() => mock.row('me@x.test').revision === 2, 8000, 'push of change'); const w = mock.writes;
    await B.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await until(async () => (await readState(B.page)).settings.integration === false, 8000, 'pull on phone');   // rewards start ON now, so the toggle turns them off
    await sleep(3500); eq(mock.writes, w, 'no write caused by the pull'); eq((await readState(B.page)).settings.integration, false);
  });
  await test('typing in the journal is not wiped when sync status changes in the background (no full re-render)', async () => {
    await B.page.click('.navbtn[data-view="journal"]'); const ta = B.page.locator('textarea').first(); await ta.fill('half-written entry');
    await B.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));          // a sync runs: status goes syncing -> idle
    await sleep(2500); eq(await B.page.locator('textarea').first().inputValue(), 'half-written entry');
  });
  await test('OFFLINE edits queue and sync once, automatically, when the connection returns', async () => {
    await A.page.reload(); await A.page.waitForSelector('.navbtn'); await until(async () => A.page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()) && !!(await navigator.serviceWorker.ready)), 8000, 'sw');
    const w = mock.writes; await A.ctx.setOffline(true); await toggleRewards(A.page); await toggleRewards(A.page); await toggleRewards(A.page);
    await openSettings(A.page); await until(async () => /Offline|Waiting/i.test(await statusText(A.page)), 8000, 'offline status'); eq(mock.writes, w);
    await A.ctx.setOffline(false); await until(() => mock.writes === w + 1, 15000, 'one queued write'); await sleep(4000); eq(mock.writes, w + 1, 'exactly one write, no loop');
  });
  await test('the game still launches and plays fully offline with sync configured (service worker precached the new files)', async () => {
    await A.ctx.setOffline(true); await A.page.reload(); await A.page.waitForSelector('.navbtn'); await toggleRewards(A.page); await openSettings(A.page);
    ok((await readState(A.page)) !== null); ok(/signed in as/i.test(await A.page.locator('#cloud-panel').textContent())); await A.ctx.setOffline(false); eq(A.page.errors, [], 'page errors');
  });
  await test('conflict: both sides changed while apart -> dialog with both saves, nothing overwritten, then the player chooses (Escape closes it without writing)', async () => {
    await A.page.goto(app.url); await A.page.waitForSelector('.navbtn'); await until(async () => /Synced at/.test(await (async () => { await openSettings(A.page); return statusText(A.page); })()), 15000, 'laptop synced');
    await B.page.goto(app.url); await B.page.waitForSelector('.navbtn'); await openSettings(B.page); await until(async () => /Synced at/.test(await statusText(B.page)), 15000, 'phone synced');
    await B.ctx.setOffline(true);                                                                       // phone changes while offline: a different field than the laptop edits
    { const st = await readState(B.page); st.money = 4242; await B.page.fill('form[data-form="import"] textarea', JSON.stringify({ app: 'tap-protocol', state: st })); await B.page.click('form[data-form="import"] button[type="submit"]'); await B.page.click('.modal [data-action="confirm"]'); await until(async () => (await readState(B.page)).money === 4242, 6000, 'phone local edit'); await openSettings(B.page); }
    const beforeToggle = (await readState(A.page)).settings.integration; await toggleRewards(A.page); await until(async () => mock.row('me@x.test').payload.settings.integration === !beforeToggle, 10000, 'laptop push');
    const cloudBefore = JSON.stringify(mock.row('me@x.test')); await B.ctx.setOffline(false);
    await B.page.waitForSelector('#cloud-modal', { timeout: 15000 }); eq(JSON.stringify(mock.row('me@x.test')), cloudBefore, 'cloud untouched');
    const dlg = B.page.locator('#cloud-modal [role="alertdialog"]'); ok(/different/i.test(await dlg.textContent())); ok((await B.page.locator('#cloud-modal .cloud-side').count()) === 2);
    eq(await dlg.getAttribute('aria-modal'), 'true'); eq(await B.page.evaluate(() => document.getElementById('root').hasAttribute('inert')), true, 'background inert');
    eq(await B.page.evaluate(() => document.activeElement && document.activeElement.closest('#cloud-modal') !== null), true, 'focus inside dialog');
    await B.page.keyboard.press('Escape'); await until(async () => (await B.page.locator('#cloud-modal').count()) === 0, 3000, 'dialog closed'); eq(JSON.stringify(mock.row('me@x.test')), cloudBefore, 'Escape writes nothing');
    await openSettings(B.page); ok(/Conflict/i.test(await statusText(B.page)));
    await B.page.click('[data-cloud="resolve"]'); await B.page.waitForSelector('#cloud-modal'); await B.page.click('[data-cloud="keep-cloud"]');
    
    await until(async () => (await B.page.locator('#cloud-modal').count()) === 0, 8000, 'dialog closed after choice'); await until(async () => { const x = await readState(B.page); return x.settings.integration === !beforeToggle && x.money !== 4242; }, 8000, 'phone now equals cloud (its own edit is gone from the live save)');
    await until(async () => /Synced at/.test(await statusText(B.page)), 8000, 'synced after resolve');
  });
  await test('sign-out keeps the local save and the cloud row; the panel returns to the sign-in form', async () => {
    const mine = JSON.stringify(await readState(B.page)), row = JSON.stringify(mock.row('me@x.test')); await openSettings(B.page); await B.page.click('[data-cloud="signout"]');
    await B.page.waitForSelector('form[data-cloud-form="signin"]'); eq(JSON.stringify(await readState(B.page)), mine); eq(JSON.stringify(mock.row('me@x.test')), row);
    await B.page.reload(); await B.page.waitForSelector('.navbtn'); ok((await readState(B.page)) !== null, 'save survives reload while signed out');
  });
  await test('server failure (500s): plain message, game keeps working, retry button recovers', async () => {
    await A.page.goto(app.url); await A.page.waitForSelector('.navbtn'); await openSettings(A.page); await until(async () => /Synced at/.test(await statusText(A.page)), 15000, 'synced');
    const beforeToggle = (await readState(A.page)).settings.integration; mock.failNext = [500, 500, 500, 500, 500, 500]; await toggleRewards(A.page);
    await until(async () => /Sync problem/i.test(await statusText(A.page)), 12000, 'error status'); await openSettings(A.page); ok(/server had a problem/i.test(await A.page.locator('#cloud-detail').textContent()));
    eq((await readState(A.page)).settings.integration, !beforeToggle); mock.failNext = []; await A.page.click('[data-cloud="sync"]'); await until(async () => /Synced at/.test(await statusText(A.page)), 10000, 'recovered');
    eq(mock.row('me@x.test').payload.settings.integration, !beforeToggle);
  });
  await test('export and import still work and an import is synced like any other local change; RESET still deletes only the local save', async () => {
    await openSettings(A.page); const dl = A.page.waitForEvent('download'); await A.page.click('[data-action="export"]'); const file = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8'));
    ok(file.app === 'tap-protocol' && file.state.character); file.state.money = 777;
    await A.page.fill('form[data-form="import"] textarea', JSON.stringify(file)); await A.page.click('form[data-form="import"] button[type="submit"]'); await A.page.click('.modal [data-action="confirm"]');
    await until(() => mock.row('me@x.test').payload.money === 777, 10000, 'imported save synced');
    await openSettings(A.page); await A.page.fill('form[data-form="reset"] input[name="confirm"]', 'RESET'); await A.page.click('form[data-form="reset"] button[type="submit"]');
    await A.page.waitForSelector('form[data-form="create"]'); eq(await readState(A.page), null); eq(mock.row('me@x.test').payload.money, 777, 'cloud copy survives a local RESET');
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
} finally {
  await browser.close(); await app.close(); await mockSrv.close(); fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
