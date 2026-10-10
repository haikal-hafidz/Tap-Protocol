// TAP Protocol - persistence. IndexedDB is the primary store; localStorage is a fallback if IndexedDB is unavailable.
// Integrity: each save stores the serialized state plus a checksum. Before every write the previous good save is
// copied to a backup slot, so a corrupted main save can be recovered from the previous one.
import { isValidState, migrateState } from './rules.js';

const DB_NAME = 'tap-protocol';
const DB_VERSION = 1;
const STORE = 'saves';
const LS_MAIN = 'tap-protocol.main';
const LS_BACKUP = 'tap-protocol.backup';

export const info = { mode: 'unknown', lastError: '' };

function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

function hasIdb() { return typeof indexedDB !== 'undefined' && indexedDB; }

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open IndexedDB.'));
    req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab.'));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

function idbWriteMainWithBackup(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get('main');
    getReq.onsuccess = () => {
      const prev = getReq.result;
      if (prev) store.put({ ...prev, key: 'backup' });
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save transaction aborted.'));
  });
}

function parseRecord(rec) {
  if (!rec || typeof rec.payload !== 'string') return null;
  if (checksum(rec.payload) !== rec.checksum) return null;
  try {
    const obj = JSON.parse(rec.payload);
    return isValidState(obj) ? migrateState(obj) : null;
  } catch { return null; }
}

function makeRecord(state, saveCount) {
  const payload = JSON.stringify(state);
  return { key: 'main', savedAt: new Date().toISOString(), saveCount, checksum: checksum(payload), payload };
}

let saveCount = 0;

export async function loadGame() {
  if (hasIdb()) {
    try {
      const db = await openDb();
      info.mode = 'indexeddb';
      const main = parseRecord(await idbGet(db, 'main'));
      if (main) return { state: main, recovered: false };
      const backup = parseRecord(await idbGet(db, 'backup'));
      db.close();
      if (backup) return { state: backup, recovered: true };
      return { state: null, recovered: false };
    } catch (e) {
      info.lastError = String(e && e.message || e);
    }
  }
  info.mode = 'localstorage';
  try {
    const main = parseRecord(JSON.parse(localStorage.getItem(LS_MAIN) || 'null'));
    if (main) return { state: main, recovered: false };
    const backup = parseRecord(JSON.parse(localStorage.getItem(LS_BACKUP) || 'null'));
    if (backup) return { state: backup, recovered: true };
  } catch (e) { info.lastError = String(e && e.message || e); }
  return { state: null, recovered: false };
}

export async function saveGame(state) {
  const record = makeRecord(state, ++saveCount);
  if (info.mode !== 'localstorage' && hasIdb()) {
    try {
      const db = await openDb();
      info.mode = 'indexeddb';
      await idbWriteMainWithBackup(db, record);
      db.close();
      return { ok: true };
    } catch (e) { info.lastError = String(e && e.message || e); }
  }
  try {
    const prev = localStorage.getItem(LS_MAIN);
    if (prev) localStorage.setItem(LS_BACKUP, prev);
    localStorage.setItem(LS_MAIN, JSON.stringify(record));
    info.mode = 'localstorage';
    return { ok: true };
  } catch (e) {
    info.lastError = String(e && e.message || e);
    return { ok: false, error: info.lastError };
  }
}

// Deliberate, user-initiated only. Failure in the game never calls this.
export async function clearGame() {
  if (hasIdb()) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) { info.lastError = String(e && e.message || e); }
  }
  try { localStorage.removeItem(LS_MAIN); localStorage.removeItem(LS_BACKUP); } catch { /* ignore */ }
}

export function exportJson(state) {
  return JSON.stringify({ app: 'tap-protocol', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'That is not valid JSON.' }; }
  const st = obj && obj.state ? obj.state : obj;
  if (!isValidState(st)) return { ok: false, error: 'That file is not a valid TAP Protocol save.' };
  return { ok: true, state: migrateState(st) };
}
