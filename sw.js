// TAP Protocol - service worker. Offline app shell: every file the game needs is cached at install time.
// This file never reads or writes saves (IndexedDB / localStorage); it only manages the static-file cache.
//
// Updating: CACHE_VERSION is a hash of every precached file. Run `npm run stamp` after changing any of them
// (a test fails if it is stale). A new version installs into its OWN cache while the old one keeps serving.
// If any file fails to download, the install fails and the old version stays active and intact.
// The new version waits until the player accepts the update prompt (or closes all tabs), then old caches are deleted.

const CACHE_VERSION = '05e2962334a1';
const CACHE_PREFIX = 'tap-protocol-';
const CACHE = CACHE_PREFIX + CACHE_VERSION;

// Paths are relative to this file. Keep in sync with the real files (a test checks this against the disk).
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/cloud-ui.js',
  'js/cloud.js',
  'js/config.js',
  'js/data.js',
  'js/main.js',
  'js/pwa.js',
  'js/rules.js',
  'js/storage.js',
  'js/sync.js',
  'js/ui.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg'
];

const abs = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(PRECACHE.map(async (p) => {
        // cache: 'reload' skips the browser HTTP cache so a half-old, half-new file set can never be stored.
        const res = await fetch(new Request(abs(p), { cache: 'reload' }));
        if (!res.ok || res.redirected) throw new Error('Precache failed for ' + p + ' (' + res.status + ')');
        await cache.put(abs(p), res);
      }));
    } catch (err) {
      await caches.delete(CACHE); // drop the partial cache; the previous version is untouched
      throw err;                  // install fails, the old service worker keeps running
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // js/config.js holds the owner's Supabase key. It is served network-first (cache only when offline), so filling in
  // the key never needs a cache re-stamp and a phone cannot keep an old, empty copy of it.
  if (url.origin + url.pathname === abs('js/config.js')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch(new Request(abs('js/config.js'), { cache: 'no-cache', signal: ctl.signal })).finally(() => clearTimeout(timer));
        if (res.ok && !res.redirected) { await cache.put(abs('js/config.js'), res.clone()); return res; }
      } catch (err) { /* offline or slow: use the cached copy below */ }
      const hit = await cache.match(abs('js/config.js'));
      return hit || Response.error();
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') {
        const shell = await caches.match(abs('index.html'), { cacheName: CACHE });
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
