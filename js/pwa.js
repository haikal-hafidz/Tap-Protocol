// TAP Protocol - service worker registration and update prompt. Never touches game state or saves.
// Only runs in a secure context (https or localhost). Elsewhere the game still works, just not offline.

function showUpdatePrompt(worker) {
  if (document.getElementById('update-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'update-banner';
  bar.className = 'update-banner';
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<span>A new version of TAP Protocol is ready. Your save is not affected.</span>' +
    '<button type="button" class="btn small primary" data-update="now">Reload to update</button>' +
    '<button type="button" class="btn small" data-update="later">Later</button>';
  bar.addEventListener('click', (e) => {
    const which = e.target && e.target.dataset && e.target.dataset.update;
    if (which === 'later') bar.remove();
    if (which === 'now') { window.__tapUpdating = true; worker.postMessage({ type: 'SKIP_WAITING' }); }
  });
  document.body.appendChild(bar);
}

async function register() {
  const reg = await navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' });
  // Offer an update only when a worker is already in control (otherwise this is the first install).
  const offer = (w) => { if (w && navigator.serviceWorker.controller) showUpdatePrompt(w); };
  offer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  // Reload once, and only after the player asked for the update, so a typed journal entry is never lost unexpectedly.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (window.__tapUpdating) location.reload(); });
  const start = () => register().catch((e) => console.warn('Service worker not registered: ' + e.message));
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
}
