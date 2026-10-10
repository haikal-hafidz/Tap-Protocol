// TAP Protocol - sync engine. Offline-first: the local save is always the source of truth until the player says otherwise.
//
// The engine only ever replaces the WHOLE save object. It never merges fields and never runs game rules, so a sync
// cannot pay a reward twice. It never deletes the local save, and it never writes anything when it is unsure:
// divergence goes to the conflict screen with both versions backed up first.
//
// Bookkeeping lives in its own small IndexedDB database (tap-protocol-sync) so the save schema, the saves database
// and the RESET button are untouched. localStorage is the fallback if IndexedDB is unavailable.
import { isValidState, migrateState } from './rules.js';
import { CloudError } from './cloud.js';

export const SYNC_SCHEMA = 1;
const BACKUPS_KEPT = 5;
const RETRY_MS = [5000, 15000, 45000, 120000, 300000];

// ---------------------------------------------------------------- hashing (change detection only, not security)
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
function cyrb53(str, seed) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
// Synchronous on purpose: the "has anything changed since I looked" check must not yield to the game in between.
export function hashState(state) {
  if (!state) return '';
  const c = canonical(state);
  return cyrb53(c, 1) + cyrb53(c, 2) + c.length.toString(16);
}

// ---------------------------------------------------------------- small key-value store (IndexedDB, localStorage fallback)
export function createKv(prefix = 'tap-protocol-sync') {
  const LS = prefix + '.';
  let dbp = null;
  const hasIdb = () => typeof indexedDB !== 'undefined' && indexedDB;
  function open() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(prefix, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv', { keyPath: 'key' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB unavailable'));
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    }).catch((e) => { dbp = null; throw e; });
    return dbp;
  }
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(LS + k) || 'null'); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); return true; } catch { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(LS + k); } catch { /* ignore */ } };
  return {
    async get(k) {
      if (hasIdb()) { try { const db = await open(); const r = await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); return r ? r.value : null; } catch { /* fall through */ } }
      return lsGet(k);
    },
    async set(k, v) {
      if (hasIdb()) { try { const db = await open(); await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ key: k, value: v }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); return true; } catch { /* fall through */ } }
      return lsSet(k, v);
    },
    async delete(k) {
      if (hasIdb()) { try { const db = await open(); await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch { /* ignore */ } }
      lsDel(k);
    }
  };
}

// ---------------------------------------------------------------- the decision (pure, unit-tested)
// local: { has, hash }   meta: { rev, hash } | null (already checked to belong to this user)   cloud: { rev, hash } | null
export function decide(local, meta, cloud, foreignMeta = false) {
  if (!cloud) return !local.has ? 'idle' : foreignMeta ? 'confirm-upload' : 'push-new';   // another account's save is never uploaded silently
  if (!local.has) return 'restore-available';           // never overwrite or fill silently: the player chooses
  if (!meta) return local.hash === cloud.hash ? 'link' : 'conflict';
  if (cloud.rev < meta.rev) return local.hash === cloud.hash ? 'link' : 'conflict';   // cloud went backwards: never trust it silently
  const localChanged = local.hash !== meta.hash;
  const cloudChanged = cloud.rev !== meta.rev;
  if (local.hash === cloud.hash) return localChanged || cloudChanged ? 'link' : 'idle';
  if (!localChanged && !cloudChanged) return 'idle';
  if (!localChanged) return 'pull';
  if (!cloudChanged) return 'push';
  return 'conflict';
}

export function summarize(state) {
  if (!state) return null;
  const c = state.character || {};
  return { name: c.name || '?', level: c.level ?? '?', clock: state.clock ?? null, money: state.money ?? 0, journal: Array.isArray(state.journal) ? state.journal.length : 0 };
}

// A cloud save with LESS game time than this device looks older. It is never loaded automatically.
export function looksOlder(cloudState, localState) {
  const c = cloudState && cloudState.clock, l = localState && localState.clock;
  return typeof c === 'number' && typeof l === 'number' && c < l;
}
const localChanged = (e) => !!(e && e.code === 'LOCAL_CHANGED');

function newId() {
  try { if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export function deviceLabel(nav = globalThis.navigator) {
  const ua = String((nav && nav.userAgent) || '');
  const kind = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Phone or tablet' : 'Computer';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'browser';
  return kind + ' (' + br + ')';
}

// ---------------------------------------------------------------- engine
export function createSync({ cloud, kv, getState, applyState, onChange, download, setTimer = setTimeout, clearTimer = clearTimeout, now = () => Date.now(), debounceMs = 2000, label = deviceLabel(), isOnline = () => (typeof navigator === 'undefined' || navigator.onLine !== false) }) {
  const st = {
    phase: cloud.configured ? 'signed-out' : 'unconfigured',   // unconfigured | signed-out | confirm-email | idle | dirty | syncing | offline | error | conflict | restore
    message: '', lastSyncAt: 0, conflict: null, cloudInfo: null, failures: 0
  };
  let meta = null;          // { userId, rev, hash, lastSyncAt, deviceId }
  let deviceId = '';
  let timer = null, retryTimer = null, running = false, rerun = false, started = false;

  const emit = () => { try { onChange && onChange(snapshot()); } catch { /* ui must never break sync */ } };
  function set(phase, message = '') { st.phase = phase; st.message = message; emit(); }
  function snapshot() {
    return { ...st, signedIn: cloud.signedIn(), email: cloud.user ? cloud.user.email : '', configured: cloud.configured, deviceLabel: label, hasLocal: !!getState() };
  }
  async function saveMeta() { await kv.set('meta', meta); }
  const metaValid = () => meta && cloud.user && meta.userId === cloud.user.id && meta.rev > 0 ? meta : null;
  const localInfo = () => { const s = getState(); return { has: !!s, hash: s ? hashState(s) : '' }; };

  async function start(fragment = null) {
    if (started) return; started = true;
    meta = await kv.get('meta');
    deviceId = (meta && meta.deviceId) || (await kv.get('device')) || '';
    if (!deviceId) { deviceId = newId(); await kv.set('device', deviceId); }
    await cloud.load();
    if (!cloud.configured) { set('unconfigured', cloud.keyProblem ? 'The key in js/config.js is a Secret key, which must never be used in a game page. Cloud sync was switched off. Use the Publishable key instead.' : ''); return; }
    // Returning from the confirmation email: the link carries a fresh session (or an error) in the address fragment.
    if (fragment && fragment.session) { try { await cloud.adoptFragmentSession(fragment.session); } catch (e) { set('signed-out', e && e.message || 'Could not finish signing in. Try signing in with your password.'); return; } }
    if (fragment && fragment.error && !cloud.signedIn()) { set('signed-out', 'The confirmation link did not work: ' + fragment.error + ' Try signing in, or create the account again to get a new email.'); return; }
    if (!cloud.signedIn()) { set('signed-out'); return; }
    set(st.lastSyncAt ? 'idle' : 'dirty');
    if (meta && meta.lastSyncAt) st.lastSyncAt = meta.lastSyncAt;
    await sync('start');
  }

  // Called after every successful local save. Cheap: compares hashes, and only schedules work if something changed.
  function noteLocalChange() {
    if (!cloud.configured || !cloud.signedIn()) return;
    st.lastLocalChange = now();
    if (st.phase === 'conflict') return;
    const m = metaValid();
    if (m && hashState(getState()) === m.hash) return;      // nothing new to send (also true right after a pull)
    if (st.phase !== 'syncing') set(isOnline() ? 'dirty' : 'offline', isOnline() ? '' : 'Offline. Changes are saved on this device and will sync when you are back online.');
    schedule(debounceMs);
  }
  function schedule(ms) { if (timer) clearTimer(timer); timer = setTimer(() => { timer = null; return sync('auto'); }, ms); }
  function scheduleRetry() {
    if (retryTimer) clearTimer(retryTimer);
    const ms = RETRY_MS[Math.min(st.failures, RETRY_MS.length) - 1] || RETRY_MS[0];
    retryTimer = setTimer(() => { retryTimer = null; return sync('retry'); }, ms);
  }

  async function backupBoth(local, cloudRow) {
    const list = (await kv.get('backups')) || [];
    list.unshift({ id: newId(), createdAt: new Date(now()).toISOString(), local: { state: local, hash: hashState(local) }, cloud: { state: cloudRow.payload, rev: cloudRow.revision, updatedAt: cloudRow.updated_at, deviceLabel: cloudRow.device_label || '' } });
    while (list.length > BACKUPS_KEPT) list.pop();
    const ok = await kv.set('backups', list);
    if (!ok) throw new Error('Could not store the safety backups.');
  }

  function parseCloud(row) {
    const p = row && row.payload;
    if (!isValidState(p)) return null;
    try { return migrateState(JSON.parse(JSON.stringify(p))); } catch { return null; }
  }

  async function sync(reason = 'manual') {
    if (!started || !cloud.configured || !cloud.signedIn()) return;
    if (st.phase === 'conflict' && reason !== 'resolved') return;     // paused until the player chooses
    if (running) { rerun = true; return; }
    if (!isOnline() && reason !== 'manual') { set('offline', 'Offline. Changes are saved on this device and will sync when you are back online.'); return; }
    running = true;
    if (timer) { clearTimer(timer); timer = null; }
    if (retryTimer) { clearTimer(retryTimer); retryTimer = null; }
    try {
      set('syncing');
      let done = '';
      for (let guard = 0; guard < 4; guard++) {      // a few passes cover "edited while syncing" without ever looping forever
        done = await pass();
        if (done !== 'again' && done !== 'again-conflict-check') break;   // 'again-conflict-check': the cloud moved while we were sending; look afresh
      }
      st.failures = 0;
      // Still busy after the last pass (the save kept changing): never leave the panel on "Syncing..." forever; look again shortly.
      if (done === 'again' || done === 'again-conflict-check') { set('dirty'); schedule(2000); }
    } catch (e) {
      handleFailure(e);
    } finally {
      running = false;
      if (rerun) { rerun = false; if (st.phase !== 'conflict' && st.phase !== 'signed-out') schedule(500); }
    }
  }

  function handleFailure(e) {
    const kind = e instanceof CloudError ? e.kind : 'error';
    if (kind === 'auth' && !cloud.signedIn()) { set('signed-out', e.message); return; }
    st.failures++;
    if (kind === 'network') set('offline', 'Cannot reach the cloud right now. Your changes are safe on this device and will sync later.');
    else set('error', e instanceof CloudError ? e.message : 'Sync problem: ' + (e && e.message || e) + '. Your local save is safe.');
    scheduleRetry();
  }

  // One look at both sides and at most one write. Returns 'again' if the local save changed while we were working.
  async function pass() {
    const row = await cloud.fetchSave();
    const local = localInfo();
    const cloudState = row ? parseCloud(row) : null;
    if (row && !cloudState) { set('error', 'The cloud save is in a format this version of the game cannot read. Nothing was changed. Update the game and try again.'); return 'stop'; }
    const cloudHash = cloudState ? hashState(cloudState) : '';
    st.cloudInfo = row ? { rev: row.revision, updatedAt: row.updated_at, deviceLabel: row.device_label || '', summary: summarize(cloudState) } : null;
    const m = metaValid();
    const foreign = !!(meta && cloud.user && meta.userId !== cloud.user.id);
    const action = decide(local, m, row ? { rev: row.revision, hash: cloudHash } : null, foreign);

    if (action === 'idle') { if (m && m.lastSyncAt) st.lastSyncAt = m.lastSyncAt; set('idle'); return 'stop'; }
    if (action === 'link') { await link(row.revision, cloudHash); return 'stop'; }
    if (action === 'confirm-upload') { set('adopt', 'The save on this device was last synced with a different account. Nothing was uploaded. Press Upload to put this device\'s save into the account you just signed in to.'); return 'stop'; }
    if (action === 'restore-available') { set('restore', 'A cloud save exists for this account. Choose Restore to download it onto this device.'); return 'stop'; }
    if (action === 'conflict') { await enterConflict(getState(), row, cloudState); return 'stop'; }
    if (action === 'pull') { return await pull(row, cloudState, cloudHash, local.hash); }
    if (action === 'push-new' || action === 'push') {
      const sentState = getState(), sentHash = hashState(sentState);
      const body = { payload: JSON.parse(JSON.stringify(sentState)), schema_version: SYNC_SCHEMA, device_id: deviceId, device_label: label };
      let saved;
      try { saved = action === 'push-new' ? await cloud.insertSave(body) : await cloud.updateSave(m.rev, body); }
      catch (e) {
        if (e instanceof CloudError && e.kind === 'conflict') { return 'again-conflict-check'; }
        throw e;
      }
      meta = { userId: cloud.user.id, rev: saved.revision, hash: sentHash, lastSyncAt: now(), deviceId };
      await saveMeta();
      st.lastSyncAt = meta.lastSyncAt; st.cloudInfo = { rev: saved.revision, updatedAt: saved.updated_at, deviceLabel: label, summary: summarize(sentState) };
      if (hashState(getState()) !== sentHash) { set('dirty'); return 'again'; }
      set('idle'); return 'stop';
    }
    return 'stop';
  }

  async function link(rev, hash) {
    meta = { userId: cloud.user.id, rev, hash, lastSyncAt: now(), deviceId };
    await saveMeta(); st.lastSyncAt = meta.lastSyncAt; set('idle');
  }
  async function pull(row, cloudState, cloudHash, decidedLocalHash) {
    // Re-check immediately before replacing: if the player acted since we decided, do not clobber their change.
    if (hashState(getState()) !== decidedLocalHash) return 'again';
    // The cloud copy has less game time than this device: do not replace silently, let the player choose.
    if (looksOlder(cloudState, getState())) { await enterConflict(getState(), row, cloudState, 'older-cloud'); return 'stop'; }
    // applyState re-checks the same condition at the moment of writing (a tap in the meantime wins; nothing is replaced).
    try { await applyState(cloudState, () => hashState(getState()) === decidedLocalHash); }   // writes the local save first ...
    catch (e) { if (localChanged(e)) return 'again'; throw e; }
    await link(row.revision, cloudHash);     // ... and only then records it as synced (a crash in between self-heals)
    return 'stop';
  }

  async function enterConflict(localState, row, cloudState, reason = '') {
    const cloudRow = { ...row, payload: cloudState };
    try { await backupBoth(localState, cloudRow); }
    catch (e) { set('error', 'Could not back up both saves, so nothing was changed. ' + (e && e.message || '')); return; }
    st.conflict = { reason, local: { summary: summarize(localState), savedAt: st.lastLocalChange || 0, deviceLabel: label }, cloud: { summary: summarize(cloudState), updatedAt: row.updated_at, deviceLabel: row.device_label || 'another device', rev: row.revision } };
    st.conflictCloudState = cloudState; st.conflictCloudRev = row.revision;
    set('conflict', reason === 'older-cloud' ? 'This device and the cloud both have different saves. Nothing has been overwritten. Both versions are backed up.' : 'This device and the cloud both changed. Nothing has been overwritten. Both versions are backed up.');
  }

  async function resolve(choice) {
    if (st.phase !== 'conflict' || !st.conflict) return;
    if (running) return;
    running = true;
    let lookAgain = false;
    try {
      set('syncing');
      const fresh = await cloud.fetchSave();
      if (!fresh) throw new CloudError('server', 'The cloud save disappeared. Nothing was changed.');
      const freshState = parseCloud(fresh);
      if (!freshState) throw new CloudError('server', 'The cloud save cannot be read. Nothing was changed.');
      // Back up again right now: the player may have kept playing since the first backup, and nothing may be lost by choosing.
      const backedUpHash = hashState(getState());
      await backupBoth(getState(), { ...fresh, payload: freshState });
      if (fresh.revision !== st.conflictCloudRev) {   // changed again while the screen was open: show the new situation instead of acting on stale info
        await enterConflict(getState(), fresh, freshState); return;
      }
      if (choice === 'cloud') {
        await applyState(freshState, () => hashState(getState()) === backedUpHash);   // played since the backup? then nothing is replaced
        await link(fresh.revision, hashState(freshState));
      } else if (choice === 'local') {
        const sent = getState(), sentHash = hashState(sent);
        const saved = await cloud.updateSave(fresh.revision, { payload: JSON.parse(JSON.stringify(sent)), schema_version: SYNC_SCHEMA, device_id: deviceId, device_label: label });
        meta = { userId: cloud.user.id, rev: saved.revision, hash: sentHash, lastSyncAt: now(), deviceId };
        await saveMeta(); st.lastSyncAt = meta.lastSyncAt;
      }
      st.conflict = null; st.conflictCloudState = null; set('idle');
    } catch (e) {
      // The cloud moved between our look and our write, so nothing was written. Look again from scratch (below, once 'running' is released)
      // instead of leaving a conflict state without a dialog, which Sync now would ignore.
      if (e instanceof CloudError && e.kind === 'conflict') { st.conflict = null; st.conflictCloudState = null; set('dirty'); lookAgain = true; }
      else if (localChanged(e)) { st.phase = 'conflict'; set('conflict', 'You changed the game while choosing, so nothing was replaced. Choose again.'); }
      else { st.phase = 'conflict'; set('conflict', (e && e.message || 'Problem') + ' Nothing was changed.'); }
    } finally { running = false; }
    if (lookAgain) await sync('resolved');
  }

  async function upload() {
    if (st.phase !== 'adopt' || running) return;
    running = true;
    try {
      set('syncing');
      const sent = getState(); if (!sent) throw new CloudError('server', 'There is no save on this device to upload.');
      const sentHash = hashState(sent);
      const saved = await cloud.insertSave({ payload: JSON.parse(JSON.stringify(sent)), schema_version: SYNC_SCHEMA, device_id: deviceId, device_label: label });
      meta = { userId: cloud.user.id, rev: saved.revision, hash: sentHash, lastSyncAt: now(), deviceId };
      await saveMeta(); st.lastSyncAt = meta.lastSyncAt; set('idle');
    } catch (e) {
      if (e instanceof CloudError && e.kind === 'conflict') { running = false; set('dirty'); await sync('manual'); return; }
      handleFailure(e);
    } finally { running = false; }
  }

  async function restore() {
    if (st.phase !== 'restore' || running) return;
    running = true;
    try {
      set('syncing');
      const row = await cloud.fetchSave();
      const s = row && parseCloud(row);
      if (!s) throw new CloudError('server', 'No readable cloud save was found.');
      if (getState()) throw new CloudError('server', 'This device already has a save. Use Sync now instead.');
      await applyState(s, () => !getState());     // a character created in the meantime is never replaced
      await link(row.revision, hashState(s));
    } catch (e) {
      if (localChanged(e)) { set('dirty'); schedule(500); }   // the normal check will now see two different saves and ask
      else handleFailure(e);
    } finally { running = false; }
  }

  // The player deliberately deleted the local save (RESET). Forget the link so a brand-new game can never
  // silently replace the old cloud copy: it will meet the cloud save as a "first sync" and raise the conflict screen.
  async function forgetLink() { meta = null; await kv.delete('meta'); if (cloud.signedIn()) { st.cloudInfo = null; set('dirty'); } }

  async function auth(kind, email, password) {
    try {
      if (kind === 'signup') { const r = await cloud.signUp(email, password); if (r.needsConfirmation) { set('confirm-email'); return { ok: true, confirm: true }; } }
      else await cloud.signIn(email, password);
      await afterSignIn();
      return { ok: true };
    } catch (e) { return { ok: false, error: e && e.message || 'Could not sign in.' }; }
  }
  async function afterSignIn() {
    if (!cloud.signedIn()) return;
    set('dirty'); await sync('manual');
  }
  async function signOut() {
    if (timer) { clearTimer(timer); timer = null; } if (retryTimer) { clearTimer(retryTimer); retryTimer = null; }
    await cloud.signOut();    // only the session goes; meta is user-checked later, the save stays
    st.conflict = null; st.lastSyncAt = 0; set(cloud.configured ? 'signed-out' : 'unconfigured');
  }

  async function backups() { return (await kv.get('backups')) || []; }
  async function downloadBackups(id) {
    const b = (await backups()).find((x) => x.id === id) || (await backups())[0];
    if (!b || !download) return false;
    const stamp = b.createdAt.replace(/[:.]/g, '-');
    download('tap-protocol-conflict-this-device-' + stamp + '.json', JSON.stringify({ app: 'tap-protocol', state: b.local.state }, null, 2));
    download('tap-protocol-conflict-cloud-' + stamp + '.json', JSON.stringify({ app: 'tap-protocol', state: b.cloud.state }, null, 2));
    return true;
  }

  // Triggers
  function onOnline() { if (st.phase !== 'conflict') sync('online'); }
  function onVisible() { if (typeof document !== 'undefined' && document.visibilityState === 'visible' && st.phase !== 'conflict') sync('visible'); }
  function attach(win = globalThis) {
    if (win.addEventListener) win.addEventListener('online', onOnline);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  }

  return { start, auth, upload, sync: () => sync('manual'), noteLocalChange, resolve, restore, forgetLink, afterSignIn, signOut, backups, downloadBackups, snapshot, attach, get phase() { return st.phase; }, get deviceId() { return deviceId; }, _sync: sync };
}
