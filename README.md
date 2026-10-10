# TAP Protocol - Phase 1: The Foundation

A local-first text RPG that doubles as a personal journal and habit tracker. You play Pithe, a fictional version of yourself, in a small living world (the Harbor Quarter). Everything runs in the browser. No server logic, no accounts, no API calls, no analytics, no external fonts or icons.

The game is an installable, offline-first Progressive Web App (PWA). After one successful visit over a secure connection it can be installed and played with no internet connection at all.

This is Phase 1 only: a small, complete, playable vertical slice. See PROJECT_STATUS.md for architecture, data model, test results, limitations and Phase 2 steps.

## Run it (development)

You need a static web server. The game uses ES modules and IndexedDB, and browsers block ES modules on file:// URLs. Opening index.html directly does NOT work (the page shows an explanatory message instead).

    cd tap-protocol
    python3 -m http.server 8080
    # then open http://localhost:8080/

`npm start` runs the same command. Any static server works (for example `npx serve`). Python 3 is the simplest option and needs nothing installed.

Use `http://localhost:8080/` (or `http://127.0.0.1:8080/`). Browsers only allow service workers and installation in a "secure context": https://, or localhost / 127.0.0.1. Opening the dev server from another device by its LAN address (for example http://192.168.1.20:8080/) still lets you play, but is NOT a secure context, so there is no service worker, no offline mode and no install on that device.

### Developing with the service worker

Once the app has been opened, the service worker serves files from its cache. When you edit a file:

1. Run `npm run stamp`. It hashes every precached file into `CACHE_VERSION` in `sw.js`. Without this, browsers that already installed the app keep the old files. A test (`npm test`) fails if the stamp is stale.
2. Reload. A "new version is ready" bar appears at the top; choose "Reload to update". (Or in Chrome DevTools, Application, Service Workers: tick "Update on reload" or "Bypass for network" while developing.)

If you add, rename or delete a runtime file (anything under css/, js/, icons/, or the manifest), also update the `PRECACHE` list in `sw.js`. `npm test` checks that the list matches the real files exactly.

## Install it

Install is a convenience. The game also works offline in an ordinary browser tab once it has been opened once.

Prerequisite for every platform: open the game once over https:// or localhost while online and let it finish loading. That first visit is what downloads the offline copy. A fresh device cannot install or cache the game while offline.

Desktop Chrome or Edge (Chromium-based): open the game, then use the install icon at the right end of the address bar, or the browser menu entry for installing the site as an app (the exact menu wording differs between browser versions). It opens in its own window.

Android Chrome: open the game, then menu (three dots), "Install app" (or "Add to Home screen"). It then launches full screen from the home screen.

Other browsers: Safari and Firefox support service workers, so offline play in a tab should work, but their install flows differ (Safari: Share, "Add to Home Screen"; desktop Firefox does not install web apps). These were not tested. See "What was and was not tested" in PROJECT_STATUS.md.

Saves are stored per browser and per site. Different browsers and different devices do not share a save. On some platforms an installed app may keep its data separate from the browser tab it was installed from (known to be the case for Home Screen apps on iOS). Export your save before installing and check that the installed app shows your game; import the file if it does not.

## Offline use

What must happen first:

1. Open the game once over https:// or localhost with an internet connection.
2. Wait until it has loaded and you can see the game. The service worker downloads and caches every file the game needs during this first visit (about 125 KB in total).
3. Reload once, or install it. From now on it starts without a network.

How to check that offline really works:

- Browser tab: open DevTools, Application, Service Workers: status should read "activated and is running". Under Cache Storage there should be one cache named `tap-protocol-<version>` containing the files listed in `sw.js`.
- Tick "Offline" in DevTools, Network (or turn on airplane mode, or stop the dev server) and reload. The game must still start, show your save and let you play.
- Installed app: switch the device to airplane mode and launch it.

Nothing in the game needs the network. It never makes a request to any other site (a test checks this).

## Cloud sync (optional)
Sign in under Character, Cloud sync to keep one save on all your devices. It is off until `js/config.js` has a Supabase Project URL and Publishable key. Local saves stay the source of truth offline; if two devices diverge the game shows a conflict screen and backs up both versions before anything is overwritten. Setup: `docs/SUPABASE_SETUP.md`. Tests: `npm run test:sync`, `npm run test:sync-browser`, `npm run test:rls`.

## Move a save between devices

Without cloud sync (see above), saves are local to each browser. To move progress by hand:

1. On the old device: Character, Settings, "Export save file". This downloads `tap-protocol-save-YYYY-MM-DD.json`.
2. Move that file to the other device (email, cloud drive, USB, whatever you trust).
3. On the new device: open the game, create any character if prompted, then Character, Settings, "Import a save". Paste the entire contents of the file and press "Import save". This replaces the game on that device.

Imports are validated. A file that is not a TAP Protocol save is rejected and nothing changes. Deleting a save requires typing RESET exactly.

Export before you clear site data, reinstall the app, or switch browsers: clearing site data erases the save.

## How updates work

- Every release has a cache version (a hash of all precached files, stamped into `sw.js` by `npm run stamp`).
- When you open the game, the browser checks `sw.js`. If it changed, the new version is downloaded into its own new cache. The version you are using keeps working and is not touched meanwhile.
- If every file downloads, a bar appears: "A new version of TAP Protocol is ready. Your save is not affected." Choose "Reload to update" to switch immediately, or "Later". If you ignore it, the new version takes over the next time all tabs or windows of the game have been closed and it is reopened. The old cache is deleted after the switch, so nothing stays stale for good.
- If any file fails to download (server down, a file missing), the update is abandoned and the partial new cache is discarded. The last working version stays installed and playable.
- Updates never touch saves. Saves live in IndexedDB (with a localStorage fallback), which the service worker does not read or write.

Deploying: upload all files together (index.html, sw.js, manifest.webmanifest, css/, js/, icons/). Do not let a host cache `sw.js` for long periods; the app registers it with `updateViaCache: none`, so a normal static host works.

## Troubleshooting

The game shows "Service worker not registered" in the console, or never goes offline: check that the address is https:// or localhost, not a LAN IP over http. In DevTools, Application, Service Workers, look for errors. A failed install usually means one of the files in `PRECACHE` could not be downloaded (404, or the server was down). Fix the file or the list, run `npm run stamp`, reload.

The game shows old content after a deployment: open it once online and accept the update bar, or close every tab and window of the game and reopen it. To force it: DevTools, Application, Service Workers, "Unregister", then Cache Storage, delete the `tap-protocol-*` caches, reload online.

IMPORTANT: do NOT use "Clear site data" or "Clear storage" with "IndexedDB" ticked unless you have exported your save. That deletes the save. Unregistering the service worker and deleting Cache Storage entries do not touch the save.

Nothing happens when opening index.html by double-click: expected, see "Run it".

## Run the tests

The tests are the only part that needs npm packages (dev only: jsdom, fake-indexeddb, playwright, axe-core). The game itself has zero runtime dependencies.

    npm install
    npm test                 # 34 fast tests (rules, storage, jsdom UI flow, PWA files, emoji scan)
    npm run test:browser     # 19 real-browser tests (Chromium via Playwright), including offline play
    npm run test:all         # everything: fast, browser, sync (stand-in server), database rules, sync in browser

The browser tests need a Chromium that Playwright can find. If Playwright has none, run `npx playwright install chromium` once, or set `CHROMIUM_PATH=/path/to/chrome`. Set `TAP_ONLY=offline` (any regular expression) to run only matching tests, and `TAP_SHOTS=/some/dir` to save screenshots of the layout checks.

## How to play (first five minutes)

1. Create Pithe: pick a background and a trait. Difficulty is Hardcore.
2. You start in the Rented Room at 07:00 on Monday 4 March 2030.
3. Use the Dashboard to act. Every action shows its duration and expected changes first. Costly actions show a warning dialog (keyboard: Tab moves between its buttons, Escape cancels).
4. Keep Energy, Satiety and Health up. Eat, rest and sleep.
5. For the quest, talk to Dani at the Corner Cafe (open from 10:00) and ask if she needs help.
6. Use Journal for dated entries and Tracker for real-life habits and goals. The tracker does not affect the game unless you enable it in Character, Settings, and link a goal.

## Save data

Saves live in this browser's IndexedDB (with a checksum and an automatic backup of the previous save). Clearing site data erases them. Use Character, Settings, Export save file to keep a copy. Time in the game only advances when you act.

## Manual checklist

1. Create Pithe and enter the world.
2. Study once: time, energy, satiety, EXP and Research EXP change.
3. Travel to the Corner Cafe: about 10 minutes pass and Energy stays a normal number.
4. Complete The Missing Menu (Teo: regulars; buy a notebook; Dani: ask, accept; write 3 drafts; deliver).
5. Add a journal entry and a tracker goal, then record the goal once.
6. Close the browser fully, reopen the page: everything is still there.
7. Character, Settings: export a save file.
8. Offline: with the game installed or cached, switch to airplane mode, launch it, and confirm the save and every section work.
9. On a phone: the bottom navigation shows all seven labels in two rows, none cut off.
