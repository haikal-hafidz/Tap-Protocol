// TAP Protocol - cloud sync tests that run in plain Node (no browser, no network, no extra packages).
// They run the REAL cloud.js and sync.js against tests/sync-mock-server.mjs. See that file for what the stand-in
// does and does not prove. Run with: npm run test:sync
import { createMock } from './sync-mock-server.mjs';
import { createCloud, parseAuthFragment, redirectUrl, keyProblem } from '../js/cloud.js';
import { createSync, decide, hashState, canonical, looksOlder } from '../js/sync.js';
import * as R from '../js/rules.js';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
}
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'not equal') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };

const newState = (name = 'Pithe') => R.createCharacter({ name, age: 24, appearance: '', background: 'scholar', trait: 'curious', integration: false }).state;
const memKv = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null), set: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); return true; }, delete: async (k) => { m.delete(k); }, _m: m }; };

// A "device": its own local save, its own sync bookkeeping, its own session. Timers are manual (flush() runs them).
function device(mock, { state = null, online = () => true, label = 'Test device' } = {}) {
  const d = { local: state, kv: memKv(), timers: new Map(), tid: 0, localWrites: 0, changes: [] };
  d.cloud = createCloud({ url: 'http://mock', key: 'sb_publishable_test', fetchImpl: mock.fetch, kv: d.kv, redirectTo: 'http://x/Tap-Protocol/' });
  d.sync = createSync({
    cloud: d.cloud, kv: d.kv, label, isOnline: online,
    getState: () => d.local,
    applyState: async (s, guard) => {      // mirrors ui.js applyRemote: the guard is checked at the moment of writing
      if (d.beforeApply) { const f = d.beforeApply; d.beforeApply = null; f(); }   // test hook: "the player acted just now"
      if (guard && !guard()) { const e = new Error('The game changed while the cloud save was being loaded.'); e.code = 'LOCAL_CHANGED'; throw e; }
      d.local = s; d.localWrites++;
    },
    onChange: (s) => d.changes.push(s.phase),
    setTimer: (fn, ms) => { const id = ++d.tid; d.timers.set(id, { fn, ms }); return id; },
    clearTimer: (id) => d.timers.delete(id),
    debounceMs: 2000
  });
  d.edit = (fn) => { fn(d.local); d.sync.noteLocalChange(); };   // like persist(): change, then the post-save hook
  d.flush = async () => { for (let i = 0; i < 6 && d.timers.size; i++) { const t = [...d.timers.entries()]; d.timers.clear(); for (const [, x] of t) await x.fn(); } };
  d.phase = () => d.sync.snapshot().phase;
  return d;
}
async function account(mock, email, pw = 'password1') { const c = createCloud({ url: 'http://mock', key: 'k', fetchImpl: mock.fetch }); await c.signUp(email, pw); }
async function signedIn(mock, email, opts) {
  if (!mock.users.has(email)) { mock.confirm = mock.confirm; await account(mock, email); mock.users.get(email).confirmed = true; }
  const d = device(mock, opts); await d.sync.start(); const r = await d.sync.auth('signin', email, 'password1'); ok(r.ok, 'sign in: ' + r.error); return d;
}

// ---------------------------------------------------------------- pure pieces
await test('decide(): every row of the decision table', () => {
  const L = (h, has = true) => ({ has, hash: h });
  eq(decide(L('a'), null, null), 'push-new'); eq(decide(L('', false), null, null), 'idle');
  eq(decide(L('a'), { rev: 1, hash: 'a' }, null, true), 'confirm-upload');
  eq(decide(L('', false), null, { rev: 3, hash: 'c' }), 'restore-available');
  eq(decide(L('a'), null, { rev: 3, hash: 'a' }), 'link'); eq(decide(L('a'), null, { rev: 3, hash: 'c' }), 'conflict');
  eq(decide(L('a'), { rev: 3, hash: 'a' }, { rev: 3, hash: 'a' }), 'idle');
  eq(decide(L('a'), { rev: 3, hash: 'a' }, { rev: 4, hash: 'c' }), 'pull');
  eq(decide(L('b'), { rev: 3, hash: 'a' }, { rev: 3, hash: 'a' }), 'push');
  eq(decide(L('b'), { rev: 3, hash: 'a' }, { rev: 4, hash: 'c' }), 'conflict');
  eq(decide(L('c'), { rev: 3, hash: 'a' }, { rev: 4, hash: 'c' }), 'link');
  eq(decide(L('a'), { rev: 5, hash: 'a' }, { rev: 4, hash: 'c' }), 'conflict');   // cloud went backwards
});
await test('hashState(): ignores key order (jsonb reorders keys) but notices every value change', () => {
  const s = newState(); const re = JSON.parse(canonical(s));
  eq(hashState(s), hashState(re)); const t = JSON.parse(JSON.stringify(s)); t.money += 1; ok(hashState(t) !== hashState(s));
});
await test('parseAuthFragment() / redirectUrl() for the GitHub Pages sub-path', () => {
  eq(redirectUrl(new URL('https://haikal-hafidz.github.io/Tap-Protocol/index.html?x=1#y')), 'https://haikal-hafidz.github.io/Tap-Protocol/');
  eq(redirectUrl(new URL('https://haikal-hafidz.github.io/Tap-Protocol/')), 'https://haikal-hafidz.github.io/Tap-Protocol/');
  const f = parseAuthFragment('#access_token=a&refresh_token=r&expires_in=3600&type=signup'); eq([f.session.access_token, f.session.refresh_token, f.type], ['a', 'r', 'signup']);
  ok(parseAuthFragment('#error=access_denied&error_description=Link+expired').error.includes('Link expired')); eq(parseAuthFragment(''), null); eq(parseAuthFragment('#/journal'), null);
});

// ---------------------------------------------------------------- accounts
await test('sign-up with email confirmation on: no session until the link is used; wrong password rejected', async () => {
  const mock = createMock({ confirmEmail: true }); const d = device(mock); await d.sync.start();
  const r = await d.sync.auth('signup', 'a@x.test', 'password1'); ok(r.ok && r.confirm); eq(d.phase(), 'confirm-email'); ok(!d.cloud.signedIn());
  const bad = await d.sync.auth('signin', 'a@x.test', 'password1'); ok(!bad.ok && /not confirmed/i.test(bad.error), bad.error);
  const frag = parseAuthFragment(mock.confirm('a@x.test'));
  const d2 = device(mock); await d2.sync.start(frag); ok(d2.cloud.signedIn() && d2.cloud.user.email === 'a@x.test');
  const wrong = await d2.sync.auth('signin', 'a@x.test', 'nope-nope-1'); ok(!wrong.ok && /wrong email or password/i.test(wrong.error));
  const dup = await d.sync.auth('signup', 'a@x.test', 'password1'); ok(!dup.ok && /already/i.test(dup.error));
  const weak = await d.sync.auth('signup', 'b@x.test', 'short'); ok(!weak.ok && /password/i.test(weak.error));
});

// ---------------------------------------------------------------- first sync, second device, links
await test('first sign-in uploads the local save (revision 1); the cloud copy equals it', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() });
  await A.sync.sync(); eq(A.phase(), 'idle'); eq(mock.row('a@x.test').revision, 1); eq(hashState(mock.row('a@x.test').payload), hashState(A.local), 'jsonb key reordering must not look like a change');
  const w = mock.writes; await A.sync.sync(); await A.sync.sync(); eq(mock.writes, w, 'no re-upload when nothing changed');
});
await test('new device with no save: offers Restore, never fills silently; restoring does not re-upload', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); eq(B.phase(), 'restore'); eq(B.local, null);
  const w = mock.writes; await B.sync.restore(); eq(B.phase(), 'idle'); eq(hashState(B.local), hashState(A.local)); await B.flush(); eq(mock.writes, w, 'restore must not upload');
});
await test('new device whose save is IDENTICAL to the cloud: linked silently, nothing written', async () => {
  const mock = createMock(); const s = newState(); const A = await signedIn(mock, 'a@x.test', { state: s }); await A.sync.sync();
  const w = mock.writes; const B = await signedIn(mock, 'a@x.test', { state: JSON.parse(JSON.stringify(s)) }); eq(B.phase(), 'idle'); eq(mock.writes, w);
});

// ---------------------------------------------------------------- updates both ways
await test('edit on A pushes (revision 2); B (unchanged) pulls it; no loop afterwards', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.money += 50; }); eq(A.phase(), 'dirty'); await A.flush(); eq(A.phase(), 'idle'); eq(mock.row('a@x.test').revision, 2);
  await B.sync.sync(); eq(B.local.money, A.local.money); eq(B.phase(), 'idle'); eq(B.localWrites, 2);
  const w = mock.writes; await B.sync.sync(); await B.flush(); await A.sync.sync(); eq(mock.writes, w, 'a pull never causes a push');
});
await test('burst of edits is merged into one write (debounce + single flight)', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync(); const w = mock.writes;
  for (let i = 0; i < 25; i++) A.edit((s) => { s.money += 1; }); eq(A.timers.size, 1, 'one pending timer, not 25'); await A.flush(); eq(mock.writes - w, 1); eq(hashState(mock.row('a@x.test').payload), hashState(A.local));
});
await test('edit made WHILE a push is in flight is not lost and not duplicated', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  A.edit((s) => { s.money += 1; }); mock.delayMs = 30; const p = A.sync.sync(); await new Promise((r) => setTimeout(r, 40)); A.edit((s) => { s.money += 100; }); await p; mock.delayMs = 0; await A.flush(); await A.sync.sync();
  eq(A.phase(), 'idle'); eq(hashState(mock.row('a@x.test').payload), hashState(A.local)); eq(mock.row('a@x.test').payload.money, A.local.money);
});

// ---------------------------------------------------------------- conflicts and concurrency
await test('both devices changed: conflict screen state, NOTHING written, both versions backed up', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.money += 5; }); await A.flush();
  B.local.money += 7; B.sync.noteLocalChange(); const w = mock.writes; const before = JSON.stringify(mock.row('a@x.test').payload);
  await B.flush(); await B.sync.sync();
  eq(B.phase(), 'conflict'); eq(mock.writes, w, 'no write while conflicted'); eq(JSON.stringify(mock.row('a@x.test').payload), before);
  const bk = await B.sync.backups(); eq(bk.length, 1); eq(bk[0].local.state.money, B.local.money); eq(bk[0].cloud.state.money, A.local.money);
  const snap = B.sync.snapshot(); ok(snap.conflict.local.summary && snap.conflict.cloud.summary, 'summaries for the dialog');
  await B.sync.sync(); eq(B.phase(), 'conflict', 'stays paused; automatic triggers do not decide for the player');
});
await test('resolve "keep cloud": local replaced, a backup exists, no upload', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore(); A.edit((s) => { s.money += 5; }); await A.flush(); const mine = B.local.money + 7; B.local.money = mine; B.sync.noteLocalChange(); await B.flush();
  const w = mock.writes; await B.sync.resolve('cloud'); eq(B.phase(), 'idle'); eq(B.local.money, A.local.money); eq(mock.writes, w);
  ok((await B.sync.backups()).some((b) => b.local.state.money === mine), 'the discarded local version is still in a backup');
});
await test('resolve "keep this device": cloud replaced via compare-and-set (revision +1), cloud version stays in a backup', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore(); A.edit((s) => { s.money += 5; }); await A.flush(); const cloudMoney = A.local.money; B.local.money += 7; B.sync.noteLocalChange(); await B.flush();
  const rev = mock.row('a@x.test').revision; await B.sync.resolve('local'); eq(B.phase(), 'idle'); eq(mock.row('a@x.test').revision, rev + 1); eq(mock.row('a@x.test').payload.money, B.local.money);
  ok((await B.sync.backups()).some((b) => b.cloud.state.money === cloudMoney), 'the overwritten cloud version is in a backup');
  await A.sync.sync(); eq(A.phase(), 'idle'); eq(A.local.money, B.local.money, 'A then pulls B\'s choice');
});
await test('cloud changes AGAIN while the conflict screen is open: the choice is not applied blindly', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore(); A.edit((s) => { s.money += 5; }); await A.flush(); B.local.money += 7; B.sync.noteLocalChange(); await B.flush();
  A.edit((s) => { s.money += 9; }); await A.flush(); const w = mock.writes; await B.sync.resolve('local'); eq(mock.writes, w, 'stale choice wrote nothing'); eq(B.phase(), 'conflict'); eq(B.sync.snapshot().conflict.cloud.rev, mock.row('a@x.test').revision);
});
await test('two devices push from the same revision at once: exactly one wins, the other gets a conflict (never an overwrite)', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.local.money += 1; B.local.money += 2; A.sync.noteLocalChange(); B.sync.noteLocalChange();
  await Promise.all([A.sync.sync(), B.sync.sync()]); const phases = [A.phase(), B.phase()].sort(); eq(phases, ['conflict', 'idle']);
  eq(mock.row('a@x.test').revision, 2, 'only one extra revision'); const win = A.phase() === 'idle' ? A : B; eq(mock.row('a@x.test').payload.money, win.local.money);
});
await test('raw compare-and-set: of two updates with the same expected revision exactly one succeeds', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const body = (n) => ({ payload: { ...A.local, money: n }, schema_version: 1, device_id: 'x', device_label: 'x' });
  const r = await Promise.allSettled([A.cloud.updateSave(1, body(1)), A.cloud.updateSave(1, body(2)), A.cloud.updateSave(1, body(3))]);
  eq(r.filter((x) => x.status === 'fulfilled').length, 1); ok(r.filter((x) => x.status === 'rejected').every((x) => x.reason.kind === 'conflict')); eq(mock.row('a@x.test').revision, 2);
});
await test('cloud revision went BACKWARDS (row replaced/restored): conflict, never a silent pull', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  for (let i = 0; i < 2; i++) { A.edit((s) => { s.money += 1; }); await A.flush(); }
  const old = { ...mock.row('a@x.test'), revision: 1, payload: { ...A.local, money: 0 } }; mock.setRow('a@x.test', old); await A.sync.sync(); eq(A.phase(), 'conflict');
});
await test('RESET then a new game: meets the old cloud save as a conflict, never silently replaces it', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync(); const before = JSON.stringify(mock.row('a@x.test'));
  A.local = null; await A.sync.forgetLink(); A.local = newState('Someone Else'); A.sync.noteLocalChange(); await A.flush(); await A.sync.sync();
  eq(A.phase(), 'conflict'); eq(JSON.stringify(mock.row('a@x.test')), before);
});

// ---------------------------------------------------------------- offline, failures, sessions
await test('offline edits: queued as ONE write after reconnect; no duplicates, no loop', async () => {
  const mock = createMock(); let online = true; const A = await signedIn(mock, 'a@x.test', { state: newState(), online: () => online }); await A.sync.sync(); const w = mock.writes;
  online = false; mock.offline = true; for (let i = 0; i < 5; i++) A.edit((s) => { s.money += 1; }); await A.flush(); eq(A.phase(), 'offline'); eq(mock.writes, w);
  A.edit((s) => { s.money += 1000; }); const reqs = mock.log.length; await A.sync.sync(); ok(mock.log.length === reqs || A.phase() === 'offline', 'offline: nothing sent'); ok(['offline'].includes(A.phase()));
  online = true; mock.offline = false; await A.sync.sync(); eq(A.phase(), 'idle'); eq(mock.writes - w, 1, 'exactly one write for all the offline edits'); eq(mock.row('a@x.test').payload.money, A.local.money);
  const r = mock.log.length; await A.sync.sync(); await A.flush(); eq(mock.writes - w, 1); ok(mock.log.length - r <= 2, 'one read per sync, no write loop');
});
await test('network drop mid-sync: local save untouched, phase offline, retry scheduled with backoff, recovers', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  A.edit((s) => { s.money += 3; }); const mine = JSON.stringify(A.local); mock.offline = true; await A.flush(); eq(A.phase(), 'offline'); eq(JSON.stringify(A.local), mine); ok(A.timers.size === 1, 'retry scheduled');
  mock.offline = false; await A.flush(); eq(A.phase(), 'idle'); eq(mock.row('a@x.test').payload.money, A.local.money);
});
await test('server errors (500, 503, 401 on data): clear message, local save untouched, retry works', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  A.edit((s) => { s.money += 3; }); const mine = JSON.stringify(A.local);
  mock.failNext = [500]; await A.sync.sync(); eq(A.phase(), 'error'); ok(/server had a problem/i.test(A.sync.snapshot().message)); eq(JSON.stringify(A.local), mine);
  mock.failNext = [503]; await A.sync.sync(); eq(A.phase(), 'error'); await A.sync.sync(); eq(A.phase(), 'idle'); eq(mock.row('a@x.test').payload.money, A.local.money);
});
await test('expired access token: refreshed once automatically, request retried, no sign-out', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  mock.expireAccessTokens(); A.edit((s) => { s.money += 3; }); await A.flush(); eq(A.phase(), 'idle'); ok(A.cloud.signedIn()); eq(mock.row('a@x.test').payload.money, A.local.money);
});
await test('session fully expired (refresh rejected): signed out with a message, local save kept', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  mock.expireAccessTokens(); mock.revokeRefreshTokens(); A.edit((s) => { s.money += 3; }); const mine = JSON.stringify(A.local); await A.flush(); await A.sync.sync();
  eq(A.phase(), 'signed-out'); eq(JSON.stringify(A.local), mine); ok(!A.cloud.signedIn());
});
await test('sign-out clears only the session; local save and cloud row unchanged; sign back in resumes without conflict', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync(); const mine = JSON.stringify(A.local), row = JSON.stringify(mock.row('a@x.test'));
  await A.sync.signOut(); eq(A.phase(), 'signed-out'); eq(JSON.stringify(A.local), mine); eq(JSON.stringify(mock.row('a@x.test')), row); eq(await A.kv.get('session'), null);
  A.local.money += 4; A.sync.noteLocalChange(); eq(A.phase(), 'signed-out'); const r = await A.sync.auth('signin', 'a@x.test', 'password1'); ok(r.ok); eq(A.phase(), 'idle'); eq(mock.row('a@x.test').payload.money, A.local.money);
});
await test('a different account on the same device: its first sync is NOT silent (adopt) and account A\'s row is untouched', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync(); const rowA = JSON.stringify(mock.row('a@x.test'));
  await A.sync.signOut(); await account(mock, 'b@x.test'); mock.users.get('b@x.test').confirmed = true;
  const r = await A.sync.auth('signin', 'b@x.test', 'password1'); ok(r.ok); eq(A.phase(), 'adopt'); ok(!mock.rows.has(mock.users.get('b@x.test').id), 'nothing uploaded into account B yet');
  await A.sync.upload(); eq(A.phase(), 'idle'); eq(JSON.stringify(mock.row('a@x.test')), rowA); eq(mock.row('b@x.test').revision, 1);
});
await test('unreadable / hostile cloud payload: error shown, nothing applied, local save untouched', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync(); const B = await signedIn(mock, 'a@x.test', { state: null });
  mock.setRow('a@x.test', { ...mock.row('a@x.test'), payload: { hello: 'world' } }); await B.sync.sync(); eq(B.phase(), 'error'); eq(B.local, null);
  const C = await signedIn(mock, 'a@x.test', { state: newState('Keep me') }); const mine = JSON.stringify(C.local); await C.sync.sync(); eq(JSON.stringify(C.local), mine);
});
await test('a failed local write while applying a cloud save leaves the old state in place (no half-apply)', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); B.sync = null; // fresh engine with a failing applyState
  const C = device(mock, { state: null }); C.sync = createSync({ cloud: C.cloud, kv: C.kv, getState: () => C.local, applyState: async () => { throw new Error('disk full'); }, setTimer: () => 0, clearTimer: () => {}, label: 'x' });
  await C.sync.start(); await C.sync.auth('signin', 'a@x.test', 'password1'); await C.sync.restore(); eq(C.local, null); ok(C.sync.snapshot().phase !== 'idle'); ok(!(await C.kv.get('meta')), 'not recorded as synced');
});
await test('rewards are never paid twice: sync only swaps whole saves and never runs game rules', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.money += 25; s.stats.collapses = s.stats.collapses; }); await A.flush(); await B.sync.sync(); await B.sync.sync(); await A.sync.sync(); await B.flush();
  eq(A.local.money, B.local.money); eq(JSON.stringify(canonical(A.local)), JSON.stringify(canonical(mock.row('a@x.test').payload)));
});
// ---------------------------------------------------------------- added in the audit (revision 0.2.1)
await test('older cloud save (less game time) is NEVER pulled silently, even if this device has no unsynced change', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); A.local.clock = 5000; await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore(); eq(B.local.clock, 5000);
  // A goes back to an older copy (for example an old export imported on the laptop) and pushes it.
  A.edit((s) => { s.clock = 100; s.money += 7; }); await A.flush(); eq(mock.row('a@x.test').revision, 3, 'rev 1 first upload, rev 2 clock change, rev 3 older copy');
  const before = hashState(B.local), w = mock.writes;
  await B.sync.sync(); eq(B.phase(), 'conflict'); eq(hashState(B.local), before, 'local must be untouched'); eq(mock.writes, w, 'nothing written to the cloud');
  eq(B.sync.snapshot().conflict.reason, 'older-cloud'); eq((await B.sync.backups()).length, 1, 'both versions backed up');
  ok(looksOlder({ clock: 1 }, { clock: 2 }) && !looksOlder({ clock: 2 }, { clock: 2 }) && !looksOlder({ clock: 3 }, { clock: 2 }) && !looksOlder({}, { clock: 2 }));
});
await test('a newer cloud save (more game time) still arrives by itself (the normal laptop-to-phone case)', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.clock += 600; s.money += 5; }); await A.flush(); await B.sync.sync();
  eq(B.phase(), 'idle'); eq(hashState(B.local), hashState(A.local));
});
await test('RACE: the player acts at the exact moment a cloud save is being applied: their change is kept, nothing is replaced', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.clock += 600; }); await A.flush();
  const m0 = B.local.money; B.beforeApply = () => { B.local.money += 123; };           // tap lands right before the write
  const w = mock.writes; await B.sync.sync();
  eq(B.local.money, m0 + 123, 'the tap must survive, and the cloud save must not have replaced it'); eq(B.localWrites, 1, 'cloud save must not have been applied');
  eq(B.phase(), 'conflict'); eq(mock.writes, w, 'and nothing was uploaded over the cloud copy');
});
await test('RACE on Restore: a character created in the meantime is not replaced by the cloud save', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); eq(B.phase(), 'restore');
  const fresh = newState('Newbie'); B.beforeApply = () => { B.local = fresh; };
  await B.sync.restore(); eq(B.local.character.name, 'Newbie'); eq(B.local, fresh);
  await B.flush(); eq(B.phase(), 'conflict', 'the two different saves go to the conflict screen'); eq(mock.row('a@x.test').payload.character.name, 'Pithe', 'cloud untouched');
});
await test('RACE on "Keep the cloud save": playing after the backup cancels the replace and asks again', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  const B = await signedIn(mock, 'a@x.test', { state: null }); await B.sync.restore();
  A.edit((s) => { s.money += 1; }); await A.flush(); B.edit((s) => { s.money += 2; }); await B.sync.sync(); eq(B.phase(), 'conflict');
  const m1 = B.local.money; B.beforeApply = () => { B.local.money += 99; };
  await B.sync.resolve('cloud'); eq(B.phase(), 'conflict'); ok(/changed the game while choosing/i.test(B.sync.snapshot().message), B.sync.snapshot().message);
  eq(B.local.money, m1 + 99, 'player progress kept, cloud save not applied');
});
await test('Create account for an email that already has an account: clear message, not a silent "check your email"', async () => {
  const stub = async () => ({ status: 200, ok: true, text: async () => JSON.stringify({ id: 'u1', email: 'a@x.test', identities: [] }) });
  const c = createCloud({ url: 'http://mock', key: 'sb_publishable_x', fetchImpl: stub });
  let err = null; try { await c.signUp('a@x.test', 'password1'); } catch (e) { err = e; }
  ok(err && /already has an account/i.test(err.message), err && err.message);
  const fresh = async () => ({ status: 200, ok: true, text: async () => JSON.stringify({ id: 'u2', email: 'n@x.test', identities: [{ id: 'i' }] }) });
  eq((await createCloud({ url: 'http://mock', key: 'sb_publishable_x', fetchImpl: fresh }).signUp('n@x.test', 'password1')).needsConfirmation, true);
});
await test('a Secret / service_role key in config is refused: cloud sync stays off and nothing is sent anywhere', async () => {
  const jwt = (role) => 'h.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.s';
  eq([keyProblem('sb_secret_abc'), keyProblem(jwt('service_role')), keyProblem(jwt('anon')), keyProblem('sb_publishable_abc'), keyProblem('')], ['secret', 'service_role', '', '', '']);
  let calls = 0; const c = createCloud({ url: 'https://x.supabase.co', key: 'sb_secret_abc', fetchImpl: async () => { calls++; throw new Error('must not be called'); } });
  ok(!c.configured && c.keyProblem === 'secret');
  const kv = memKv(); const sy = createSync({ cloud: c, kv, getState: () => null, applyState: async () => {}, setTimer: () => 0, clearTimer: () => {} });
  await sy.start(); eq(sy.snapshot().phase, 'unconfigured'); ok(/Secret key/.test(sy.snapshot().message)); eq(calls, 0);
});

await test('secret keys: no service-role / secret key anywhere in the shipped files', async () => {
  const fs = await import('node:fs'), path = await import('node:path'); const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const files = ['index.html', 'sw.js', 'manifest.webmanifest', ...fs.readdirSync(path.join(root, 'js')).map((f) => 'js/' + f)];
  for (const f of files) { const t = fs.readFileSync(path.join(root, f), 'utf8'); if (f !== 'js/cloud.js') ok(!/service_role|sb_secret_/i.test(t), f + ' mentions a secret key');   // cloud.js holds the guard that REFUSES such keys, so it names them
    ok(!/sb_secret_[A-Za-z0-9_-]{16,}/.test(t), f + ' contains a secret-key-looking value'); ok(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./.test(t), f + ' contains a JWT-looking key'); }
});

await test('v0.2.2: the cloud moves in the instant between "Keep this device" and its write: nothing is written and the conflict dialog comes back (not a dead end)', async () => {
  const mock = createMock(); const A = await signedIn(mock, 'a@x.test', { state: newState() }); await A.sync.sync();
  let hook = null;
  const wrapped = Object.create(mock); wrapped.fetch = async (u, o) => { if (hook && o && o.method === 'PATCH') { const h = hook; hook = null; await h(); } return mock.fetch(u, o); };
  const B = await signedIn(wrapped, 'a@x.test', { state: null }); await B.sync.restore(); A.edit((s) => { s.money += 5; }); await A.flush(); B.local.money += 7; B.sync.noteLocalChange(); await B.flush();
  eq(B.phase(), 'conflict');
  hook = async () => { A.edit((s) => { s.money += 9; }); await A.flush(); };
  const cloudBefore = JSON.stringify(mock.row('a@x.test').payload);
  await B.sync.resolve('local');
  const snap = B.sync.snapshot();
  eq(snap.phase, 'conflict'); ok(snap.conflict, 'a conflict object exists, so the dialog can be shown');
  eq(snap.conflict.cloud.rev, mock.row('a@x.test').revision, 'the dialog shows the NEW cloud revision');
  ok(JSON.stringify(mock.row('a@x.test').payload) !== cloudBefore && mock.row('a@x.test').payload.money === A.local.money, 'the cloud still holds A\'s newest save (B overwrote nothing)');
  await B.sync.resolve('local'); eq(B.phase(), 'idle', 'the player can now finish choosing');
});
await test('v0.2.2: a save that keeps changing during sync is not stuck on "Syncing" and the latest version still reaches the cloud (guard test; it also passes on v0.2.1)', async () => {
  const mock = createMock(); let n = 0, dev = null;
  const wrapped = Object.create(mock); wrapped.fetch = async (u, o) => { const r = await mock.fetch(u, o); if (dev && o && (o.method === 'PATCH' || o.method === 'POST') && /cloud_saves/.test(u) && n < 8) { n++; dev.local.money += 1; dev.sync.noteLocalChange(); } return r; };
  const D = await signedIn(wrapped, 'a@x.test', { state: newState() }); dev = D; await D.sync.sync();
  D.edit((s) => { s.money += 1; }); await D.flush();
  ok(D.phase() !== 'syncing', 'phase is ' + D.phase());
  dev = null; await D.flush(); await D.sync.sync(); eq(D.phase(), 'idle'); eq(mock.row('a@x.test').payload.money, D.local.money, 'the latest local save did reach the cloud');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
