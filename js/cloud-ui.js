// TAP Protocol - cloud sync interface: the "Cloud sync" panel, sign-in forms and the conflict dialog.
// It owns its own event listeners (data-cloud / data-cloud-form) so it works on the setup screen too, and it updates
// only its own elements, so a sync result never wipes text the player is typing elsewhere (for example a journal draft).
import { formatClock } from './rules.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function formatWhen(ms, nowMs = Date.now()) {
  if (!ms) return 'never';
  const d = new Date(ms), n = new Date(nowMs);
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === n.toDateString() ? t : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
}
export function statusText(s) {
  switch (s.phase) {
    case 'unconfigured': return 'Cloud sync is not set up in this copy of the game.';
    case 'signed-out': return 'Not signed in. Your game is saved on this device only.';
    case 'confirm-email': return 'Almost there: confirm your email, then sign in.';
    case 'syncing': return 'Syncing...';
    case 'dirty': return 'Waiting to sync';
    case 'offline': return 'Offline. Will sync when you are back online.';
    case 'error': return 'Sync problem. Your local save is safe.';
    case 'conflict': return 'Conflict: choose which save to keep.';
    case 'restore': return 'A cloud save is available to restore.';
    case 'adopt': return 'Choose whether to upload this device\'s save to this account.';
    default: return s.lastSyncAt ? 'Synced at ' + formatWhen(s.lastSyncAt) : 'Signed in. Not synced yet.';
  }
}
const modeOf = (s) => !s.configured ? 'off' : s.phase === 'confirm-email' ? 'confirm' : !s.signedIn ? 'out' : 'in';

function side(title, info, when, who) {
  if (!info) return '';
  return `<div class="cloud-side"><h3>${esc(title)}</h3><dl class="facts">
    <div><dt>Character</dt><dd>${esc(info.name)}, level ${esc(info.level)}</dd></div>
    <div><dt>Game time</dt><dd>${info.clock == null ? '?' : esc(formatClock(info.clock))}</dd></div>
    <div><dt>Money</dt><dd>${esc(info.money)}</dd></div>
    <div><dt>Journal entries</dt><dd>${esc(info.journal)}</dd></div>
    <div><dt>Saved</dt><dd>${esc(when)}</dd></div>
    <div><dt>Device</dt><dd>${esc(who)}</dd></div></dl></div>`;
}

export function createCloudUi({ sync, root, doc = document, getBusy = () => false }) {
  let authMsg = '', authBusy = false, deferred = false, lastMode = '', lastPhase = '', returnFocus = null;

  function panelInner(s) {
    const mode = modeOf(s);
    const status = `<p id="cloud-status" class="cloud-status ${s.phase === 'error' || s.phase === 'conflict' ? 'bad' : ''}" role="status" aria-live="polite">${esc(statusText(s))}</p>${s.message ? `<p class="hint" id="cloud-detail">${esc(s.message)}</p>` : '<p class="hint" id="cloud-detail"></p>'}`;
    if (mode === 'off') return `<p>${esc(statusText(s))} The game works normally without it.</p>${s.message ? `<p class="error" role="alert">${esc(s.message)}</p>` : ''}`;
    if (mode === 'out' || mode === 'confirm') {
      return `<p class="hint">Sign in to keep one save on all your devices. Your save always stays on this device too. Sync is optional.</p>
        <p class="hint">Already created the account on another device? Press <strong>Sign in</strong> here, not Create account.</p>
        ${mode === 'confirm' ? '<p class="notice" role="status">We sent a confirmation email. Click the link in it, then come back here and sign in. (Check the spam folder if it does not arrive.)</p>' : ''}
        <form data-cloud-form="signin" class="stack" novalidate>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Password (at least 8 characters)<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
          <p id="cloud-msg" class="error" role="alert">${esc(authMsg)}</p>
          <div class="row"><button class="btn primary" type="submit" ${authBusy ? 'disabled' : ''}>Sign in</button><button class="btn" type="button" data-cloud="signup" ${authBusy ? 'disabled' : ''}>Create account</button></div>
        </form>${s.phase === 'signed-out' && s.message ? `<p class="hint">${esc(s.message)}</p>` : ''}`;
    }
    const busy = s.phase === 'syncing';
    return `<p>Signed in as <strong>${esc(s.email || 'your account')}</strong>.</p>${status}
      <p class="hint">Last synced: ${esc(formatWhen(s.lastSyncAt))}. This device: ${esc(s.deviceLabel)}.</p>
      <div class="row">
        ${s.phase === 'restore' ? '<button class="btn primary" type="button" data-cloud="restore">Restore cloud save onto this device</button>' : ''}
        ${s.phase === 'adopt' ? '<button class="btn primary" type="button" data-cloud="upload">Upload this device\'s save to this account</button>' : ''}
        ${s.phase === 'conflict' ? '<button class="btn primary" type="button" data-cloud="resolve">Choose which save to keep</button>' : ''}
        ${s.hasLocal || s.phase !== 'restore' ? `<button class="btn" type="button" data-cloud="sync" ${busy ? 'disabled' : ''}>${s.phase === 'error' || s.phase === 'offline' ? 'Retry now' : 'Sync now'}</button>` : ''}
        <button class="btn" type="button" data-cloud="signout">Sign out</button>
      </div>
      <p class="hint">Signing out never deletes the save on this device.</p>`;
  }
  function panelHtml() {
    const s = sync.snapshot();
    const head = modeOf(s) === 'in' ? '' : '';
    return `<section class="panel" id="cloud-panel" aria-labelledby="cloud-h"><h2 id="cloud-h">Cloud sync</h2>${modeOf(s) === 'out' || modeOf(s) === 'confirm' ? `<p id="cloud-status" class="cloud-status" role="status" aria-live="polite">${esc(statusText(s))}</p>` : ''}${head}<div id="cloud-body">${panelInner(s)}</div></section>`;
  }

  function conflictHtml(s) {
    const c = s.conflict;
    if (!c) return '';
    return `<div class="modal-back" id="cloud-modal"><div class="modal wide" role="alertdialog" aria-modal="true" aria-labelledby="cc-title" aria-describedby="cc-desc">
      <h2 id="cc-title">Your saves are different</h2>
      ${c.reason === 'older-cloud' ? '<p class="notice" role="status">The cloud save has LESS game time than this device, so it looks older. It was not loaded automatically.</p>' : ''}
      <p id="cc-desc">This device and the cloud both have changes the other does not. Nothing has been overwritten, and both versions are already backed up on this device. Pick the one to keep. The other one stays in the backup (you can also download both).</p>
      <div class="cloud-sides">${side('This device', c.local.summary, c.local.savedAt ? 'changed ' + formatWhen(c.local.savedAt) : 'earlier', c.local.deviceLabel)}${side('Cloud', c.cloud.summary, formatWhen(Date.parse(c.cloud.updatedAt) || 0), c.cloud.deviceLabel || 'another device')}</div>
      <p id="cc-msg" class="error" role="alert">${esc(s.message && s.phase === 'conflict' && !/^This device and the cloud both/.test(s.message) ? s.message : '')}</p>
      <div class="row"><button class="btn primary" type="button" data-cloud="keep-local">Keep this device's save</button><button class="btn primary" type="button" data-cloud="keep-cloud">Keep the cloud save</button></div>
      <div class="row"><button class="btn" type="button" data-cloud="download-both">Download both as files</button><button class="btn" type="button" data-cloud="later">Decide later</button></div></div></div>`;
  }

  function syncModal(s) {
    const want = s.phase === 'conflict' && s.conflict && !deferred;
    const have = doc.getElementById('cloud-modal');
    if (want && !have) {
      returnFocus = doc.activeElement;
      const holder = doc.createElement('div'); holder.innerHTML = conflictHtml(s);
      doc.body.appendChild(holder.firstElementChild);
      root.setAttribute('inert', ''); root.setAttribute('aria-hidden', 'true');
      const first = doc.querySelector('#cloud-modal [data-cloud="later"]'); if (first) first.focus();
    } else if (want && have) {
      const m = doc.getElementById('cc-msg'); const t = conflictHtml(s);
      const tmp = doc.createElement('div'); tmp.innerHTML = t; const n = tmp.querySelector('#cc-msg');
      if (m && n) m.textContent = n.textContent;
    } else if (!want && have) {
      have.remove(); root.removeAttribute('inert'); root.removeAttribute('aria-hidden');
      const back = (returnFocus && doc.contains(returnFocus) && returnFocus) || doc.querySelector('#cloud-panel [data-cloud]') || doc.getElementById('main');
      if (back && back.focus) back.focus({ preventScroll: true });
    }
  }

  function refresh() {
    const s = sync.snapshot();
    if (s.phase !== 'conflict') deferred = false;
    const panel = doc.getElementById('cloud-panel');
    if (panel) {
      const mode = modeOf(s);
      const body = doc.getElementById('cloud-body');
      if (mode !== lastMode || mode === 'in' || mode === 'off') {
        const focusKey = doc.activeElement && doc.activeElement.dataset && doc.activeElement.dataset.cloud;
        const active = doc.activeElement;
        const keepForm = (mode === 'out' || mode === 'confirm') && lastMode === mode && body && body.contains(active);
        if (!keepForm) {
          panel.outerHTML = panelHtml();
          if (focusKey) { const again = doc.querySelector(`#cloud-panel [data-cloud="${focusKey}"]`); if (again && !again.disabled) again.focus({ preventScroll: true }); }
        }
      }
      const st = doc.getElementById('cloud-status'); if (st && (mode === 'out' || mode === 'confirm')) st.textContent = statusText(s);
      const msg = doc.getElementById('cloud-msg'); if (msg) msg.textContent = authMsg;
    }
    lastMode = modeOf(s); lastPhase = s.phase;
    syncModal(s);
  }

  async function onSubmit(e) {
    const f = e.target.closest && e.target.closest('form[data-cloud-form]');
    if (!f) return;
    e.preventDefault();
    await auth(f, 'signin');
  }
  async function auth(form, kind) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim(), password = String(fd.get('password') || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) { authMsg = 'Enter a valid email address.'; refresh(); return; }
    if (password.length < 8) { authMsg = 'The password must be at least 8 characters.'; refresh(); return; }
    authBusy = true; authMsg = ''; refresh();
    const r = await sync.auth(kind, email, password);
    authBusy = false; authMsg = r.ok ? '' : r.error; refresh();
  }
  async function onClick(e) {
    const el = e.target.closest && e.target.closest('[data-cloud]');
    if (!el || el.disabled) return;
    const a = el.dataset.cloud;
    if (a === 'signup') { const f = el.closest('form'); if (f) await auth(f, 'signup'); }
    else if (a === 'sync') await sync.sync();
    else if (a === 'signout') await sync.signOut();
    else if (a === 'restore') await sync.restore();
    else if (a === 'upload') await sync.upload();
    else if (a === 'resolve') { deferred = false; syncModal(sync.snapshot()); }
    else if (a === 'keep-local') await sync.resolve('local');
    else if (a === 'keep-cloud') await sync.resolve('cloud');
    else if (a === 'download-both') await sync.downloadBackups();
    else if (a === 'later') { deferred = true; syncModal(sync.snapshot()); }
  }
  function onKeydown(e) {
    const m = doc.getElementById('cloud-modal');
    if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); deferred = true; syncModal(sync.snapshot()); return; }   // closing never writes anything
    if (e.key !== 'Tab') return;
    const items = [...m.querySelectorAll('button:not(:disabled)')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], at = doc.activeElement;
    if (!items.includes(at)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }
  root.addEventListener('submit', onSubmit);
  doc.addEventListener('click', onClick);
  doc.addEventListener('keydown', onKeydown);
  return { panelHtml, refresh, statusText, rerenderedByApp() { lastMode = modeOf(sync.snapshot()); } };
}
