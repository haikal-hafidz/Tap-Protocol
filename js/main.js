// TAP Protocol - entry point. Wires storage to the UI.
import { createApp } from './ui.js';
import * as storage from './storage.js';

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

export async function boot(root) {
  const app = createApp(root, {
    save: (s) => storage.saveGame(s),
    clear: () => storage.clearGame(),
    exportJson: (s) => storage.exportJson(s),
    parseImport: (t) => storage.parseImport(t),
    storageMode: () => ({ indexeddb: 'IndexedDB in this browser', localstorage: 'localStorage fallback (IndexedDB unavailable)' }[storage.info.mode] || 'not yet determined'),
    download
  });
  const loaded = await storage.loadGame();
  app.state = loaded.state;
  app.recovered = loaded.recovered;
  if (loaded.recovered) app.persist();
  app.saveStatus = loaded.state ? 'Loaded from local save' : '';
  app.render();
  return app;
}

if (!globalThis.__TAP_NO_AUTOBOOT__) {
  boot(document.getElementById('root')).catch((e) => {
    document.getElementById('root').innerHTML = '<p class="error" style="padding:1rem">TAP Protocol could not start: ' + String(e.message).replace(/</g, '&lt;') + '</p>';
  });
}
