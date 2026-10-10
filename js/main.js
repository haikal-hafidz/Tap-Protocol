// TAP Protocol - entry point. Wires storage to the UI.
import { createApp } from './ui.js';
import * as storage from './storage.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { createCloud, parseAuthFragment, redirectUrl } from './cloud.js';
import { createSync, createKv } from './sync.js';
import { createCloudUi } from './cloud-ui.js';

function download(filename, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { console.error('Export failed: ' + e.message); }
}

export async function boot(root, opts = {}) {
  // Cloud sync is optional and additive. Every cloud call is isolated: nothing below can stop the game from starting
  // or from saving locally.
  const kv = createKv();
  const cloud = createCloud({ url: opts.url ?? SUPABASE_URL, key: opts.key ?? SUPABASE_KEY, kv, fetchImpl: opts.fetchImpl, redirectTo: redirectUrl(location) });
  let app = null, cloudUi = null;
  const sync = createSync({
    cloud, kv, download,
    getState: () => (app ? app.state : null),
    applyState: (state, guard) => app.applyRemote(state, guard),
    onChange: () => { if (cloudUi) cloudUi.refresh(); },
    debounceMs: opts.debounceMs ?? 2000
  });
  cloudUi = createCloudUi({ sync, root });

  app = createApp(root, {
    save: async (s) => { const r = await storage.saveGame(s); if (r && r.ok) { try { sync.noteLocalChange(); } catch { /* never block a save */ } } return r; },
    clear: async () => { await storage.clearGame(); try { await sync.forgetLink(); } catch { /* ignore */ } },
    saveLocalOnly: (s) => storage.saveGame(s),
    exportJson: (s) => storage.exportJson(s),
    parseImport: (t) => storage.parseImport(t),
    storageMode: () => ({ indexeddb: 'IndexedDB in this browser', localstorage: 'localStorage fallback (IndexedDB unavailable)' }[storage.info.mode] || 'not yet determined'),
    cloudPanel: () => cloudUi.panelHtml(),
    download
  });
  const loaded = await storage.loadGame();
  app.state = loaded.state;
  app.recovered = loaded.recovered;
  if (loaded.recovered) app.persist();
  app.saveStatus = loaded.state ? 'Loaded from local save' : '';
  app.render();
  app.sync = sync;

  // Start sync in the background AFTER the game is on screen. A failure here is reported in the panel only.
  let fragment = null;
  try {
    fragment = parseAuthFragment(location.hash);
    if (fragment && history.replaceState) history.replaceState(null, '', location.pathname + location.search);   // keep tokens out of the address bar
  } catch { /* ignore */ }
  sync.attach();
  sync.start(fragment).catch((e) => console.warn('Cloud sync could not start: ' + (e && e.message)));
  return app;
}

if (!globalThis.__TAP_NO_AUTOBOOT__) {
  boot(document.getElementById('root')).catch((e) => {
    document.getElementById('root').innerHTML = '<p class="error" style="padding:1rem">TAP Protocol could not start: ' + String(e.message).replace(/</g, '&lt;') + '</p>';
  });
}
