# PROJECT_STATUS - TAP Protocol Phase 1

## UX Session 4: approved mockup applied to the real app (current)
Scope: look and structure only. Changed `css/style.css`, `js/ui.js` (markup and copy of headings, header, status card, navigation rows; no logic) and `sw.js` (re-stamped). No change to `rules.js`, `data.js`, `storage.js`, `sync.js`, `cloud.js`, `cloud-ui.js`, `main.js`, the save schema, any rule, reward, Tracker behaviour or the palette. The mockup was used as a visual reference only; none of its sample numbers or sample tasks were copied.

Gaps found by comparing the Session 3 build with the mockup (screenshots of both at 1280 and 390px, populated app) and fixed:
- Header: no tagline, no rule, text-only tool buttons. Now brand + tagline, outlined icon buttons (Messages, Notifications with the real badge), rule below. Game time and save status kept.
- Page titles: serif, no context. Now eyebrow ("Pithe / Discover"), large bold sans title, one-line description. Title text unchanged (tests rely on it).
- Home status: thin white strip. Now the dark "Player status" card with Level pill, location, EXP meter and Health / Energy / Satiety / Money tiles, all from the save. Compact status strip stays on every other page.
- Home categories: plain tabs. Now shortcut cards (icon, title, one line). Same buttons, same `aria-pressed`; the line comes from `data-sub` so the button text is still just the label.
- Home Personal: added the mockup's two-column "Tracker goals" (with View all) + "Quick access" (Tracker, Quests, Inventory, real navigation). Everything that was there (goals, quick record, rewards line, "Open the full Tracker", quest, suggestions, travel, actions, recent events) is kept.
- More: rows of buttons. Now list cards with icon tile, description and arrow (Daily life: Tracker, Quests, Inventory; Settings: Settings and save data). Same destinations.
- Progress: character card is now the dark overview card (level, EXP meter, background, trait, EXP, collapses). Attributes, skills and progression unchanged.
- Journal sections: rounded pill tabs. Same two real sections (the mockup's "Life log / RPG events" were not added: they do not exist in the game).
- Bottom bar: inline SVG icon over label, active item is a cream pill. Same five items and order.
- Cards: radius 15 (hero 18), bold sans card headings, soft pill tags, text buttons. Serif kept for story and journal text.
- Icons are inline SVG (no emoji, no icon font, no network); the emoji scan test still passes.
Deliberately not copied from the mockup: "Welcome back", "Day 01", sample missions with checkboxes, STR/INT/VIT/AGI sample tiles, "Alerts" label, World sub-tabs, "Life log / RPG events", placeholder dashes, footer text.

Verification (Node v22.22.0, Chromium via Playwright 1.56.0, dependencies installed this time): `npm test` 52/52, `test:sync` 43/43, `test:rls` 13/13, `test:sync-browser` 13/13, `test:browser` 26/26 (the two axe-core tests now run and pass; they could not run in Session 3). Layout script: 11 screens (3 Home tabs, World, Journal, Progress, More, Tracker, Quests, Inventory, Settings) plus the notifications panel at 300, 390, 768 and 1280px: no horizontal overflow, nothing outside its card, no control under 35px. Screenshots were looked at for Home (1280, 390, 300), Progress (1280), More (390), Journal (390). Other screens were verified by script. The result is close to the mockup in structure, colour and component style, not pixel-identical (no original screenshot was available, and the sandbox uses fallback fonts). Not run against a real Supabase project; Firefox, Safari and real devices not tested.

## UX Session 3: lightweight visual polish
Scope: visual refinement only. Changed `css/style.css` and re-stamped `sw.js`. No change to any `js/` file, game rule, reward, storage, sync, save schema, palette or layout.

- Fonts: no web fonts (offline PWA, nothing to download). Serif stack (headings, story, journal) now lists Iowan Old Style, Charter, Sitka Text, Palatino, Noto Serif, Georgia; UI stays on the system sans. Body 15px on mobile, 16px from 40rem. Story text 1.65 line height, 64ch. Form fields 16px (no iOS focus zoom). Tabular numerals for stats.
- Scale: component paddings, gaps and heights reduced individually (no zoom/transform). Action cards stay a row (text + compact button) down to 22rem. Header fits one row at 390px. Meters 2x2 on mobile. Nav 47px (44px touch target kept). Home page height at 390px 4257 -> 3230px, at 300px 5038 -> 3862px, at 1280px 2582 -> 2313px.
- Corners: scale 6px (controls, chips, tabs), 10px (cards, panels, rows), 14px (dialogs). Bars and the count badge stay fully rounded.

Visual checks (real Chromium): screenshots looked at for Home (1280, 390, 300), Progress (1280, 390), Tracker (390), Journal with a long Indonesian entry (300). A script scanned 54 screens at 1280, 390 and 300px for overflow, clipping, small controls and text under 12px: no problems. Quests, Inventory, Settings and the talk panel were covered by the script only, not by eye. Fonts in screenshots were the sandbox fallbacks, not the named stack fonts.

Tests (Node v22.22.2, Chromium via Playwright 1.56.0), final code: `test:sync` 43/43, `test:sync-browser` 13/13, `test:browser` 24/26. The 2 failures are the axe-core tests, which could not run because axe-core could not be installed (no network); they failed the same way before any change. `npm test` and `test:rls` could not be run (fake-indexeddb, jsdom, pglite not installable offline). Not run against a real Supabase project.

## UX Session 2, Part 2: final QA and release
Scope: verification of Part 1 plus fixes for what the QA found. No redesign. No change to `rules.js`, `data.js`, `storage.js`, `sync.js`, `cloud.js`, the save schema, any game rule or the Session 1 palette and layout (confirmed: those five files are byte-identical to the Part 1 checkpoint).

Test results (Node v22.22.2, Chromium 141.0.7390.37 through Playwright 1.56.0), run on the final code:
- `npm test` 52/52, `test:sync` 43/43, `test:rls` 13/13, `test:sync-browser` 13/13, `test:browser` 26/26. Output: `tests/RESULTS.txt`, `tests/SYNC_RESULTS.txt`, `tests/BROWSER_RESULTS.txt`.
- Baseline (the unmodified Part 1 checkpoint, run first): 52 / 22 / 43 / 13 / 13, matching the Part 1 report. No pre-existing failures. No regressions from the Part 2 changes (the 22 old browser tests still pass; 4 were added).
- Nothing was run against a real Supabase project. All cloud tests use a stand-in server or a simulated PostgreSQL (PGlite).

Defects found by the Part 2 QA and fixed (the first three were missed by Part 1 because its scans used a fresh save, only 390 and 1280px, and never opened Progress at 300px):
- WCAG AA colour contrast failure (3.38:1, needs 4.5:1) on every blocked action card (Home, Inventory): `.action.blocked { opacity: .8 }` faded the muted text. Blocked cards now use a dashed edge at full text strength.
- At 300px the Progress skill rows were wider than their card ("Level" cut off) and a long travel button stuck out of its panel. Cause: grid minimum widths larger than the container (same cause as the Session 1 `.cols` fix). `.skills`, `.cols3`, `.needs`, `.choices` now use `min(Xrem, 100%)`; travel buttons wrap.
- Pressing Dismiss on a result dropped keyboard focus to the page body. It now goes to the page title.
- Every action button was named just "Start". Accessible names are now e.g. "Start: Study" (visible label stays first).
- A result title was an `h3` straight after the page `h1`; now an `h2` styled exactly like the old one.
- Export gave no in-app feedback; it now shows a status note (it cannot confirm the browser finished the download). An empty Import said "not valid JSON"; it now asks for the file contents.
- "Streak: 1 days" is now "1 day". The name button and the Tracker History disclosure are larger touch targets.

Files changed in Part 2: `js/ui.js`, `css/style.css`, `tests/browser.mjs` (+4 tests), `sw.js` (re-stamped), `README.md` and `docs/SUPABASE_SETUP.md` (stale test counts), `tests/RESULTS.txt`, `tests/SYNC_RESULTS.txt`, `tests/BROWSER_RESULTS.txt`, this file. No file was added or removed.

New tests (each of the first, second and fourth fails on the Part 1 code; the third covers behaviour that already worked but had no test):
- axe-core (WCAG 2.0, 2.1, 2.2 A and AA) on a populated save at 300, 390 and 1280px: Home with a blocked card, Tracker with history, Inventory, World with talk panel, Progress, Notifications, import confirmation.
- No element sticks out of its panel at 300 and 390px on the main pages and the talk panel.
- Forced storage failure: the save-failure alert appears, the game stays playable, the alert clears on recovery.
- Unique button names, focus after Dismiss, Export feedback and clearing, empty Import, streak wording, heading level.

Inspected in a real browser: populated saves at 1280, 390 and 300px; every page, both other Home tabs, both header panels, the warning dialog, the import confirmation, the reset refusal, setup and journal/Tracker validation, and the save-failure alert were driven and measured by script (overflow, element containment, control sizes, focus, axe). Screenshots were actually looked at for: Home (1280, 390, 300), Tracker (390), Progress skills (300, before and after the fix), travel panel (300) and a blocked card (390). Other screens were verified by script only, not by eye.
Keyboard (driven with Tab, Enter, Space and Escape in Chromium): tab and nav buttons, activities, Dismiss, journal submit, header panel open and Escape, warning dialog trap and focus return all behave. Automated axe plus this keyboard pass do not establish full accessibility compliance.

Known limitations (not fixed, by scope): a one-off task is stored as a goal with target 1, so it shows the "Goal" tag. App icons still use the dark artwork. No skip link (the page has only two header buttons before the content). A real screen reader, Firefox, Safari, a real installed PWA and real devices were not tested. Contrast was measured by axe on the states listed above, not on every possible state.

## UX Session 2, Part 1: interaction audit and implementation
Scope: interaction clarity only. The Session 1 layout, palette and navigation are unchanged. No game rule, reward, storage, sync or save-schema code changed (`rules.js`, `data.js`, `storage.js`, `sync.js`, `cloud.js` untouched).

Audit (verified in a real browser at 390px before changing anything) and result:
- DEFECTIVE, fixed: an action's result (`.report`) rendered at the top of the page, so pressing "Start" at the bottom of Home showed nothing in view (result was 2700px above). New feedback is now scrolled into view and takes focus (`app.reveal`).
- DEFECTIVE, fixed: a result or Tracker notice stayed on every other page until dismissed. Feedback now clears when you go to a different page.
- DEFECTIVE, fixed: after any action keyboard focus fell to the page body (every render rebuilds the page). Focus is put back on the same control.
- DEFECTIVE, fixed: text typed in the Journal, Tracker or Import forms was wiped by any re-render (opening a panel, cancelling a dialog, a failed submit, visiting another page). Drafts are kept until a successful submit.
- DEFECTIVE, fixed: Import replaced the whole game with no confirmation. It now asks first, naming the file's character and the current one, and Escape or Cancel changes nothing.
- PARTIAL, fixed: a double click on Create or Save re-submitted the emptied form and replaced the success message with an "enter a name" error; that second empty submit is now ignored.
- PARTIAL, fixed: the Tracker form showed cadence and target for every type; now only the one that applies is shown.
- PARTIAL, fixed: form errors were plain text; they are now announced (role alert / status) and brought into view. Reset's refusal says nothing was deleted.
- PARTIAL, fixed: disabled travel buttons on Home hid their reason in a tooltip; the reason is now written out. Buttons have a 40px minimum height (small ones 36px).
- MISSING, added: a failed local save now shows a visible alert (previously only small header text). Not covered by an automated test (no way to force a storage failure in the harness).
- Messages and Notifications panels: open, Close, Escape (also when focus is on plain page content), outside click and navigation all work; focus returns to the opening button. Content stays real: no messages exist, notifications come from the save only.
- Complete and unchanged: warning dialog (focus trap, Escape, focus return), RESET confirmation, Tracker reward feedback, disabled-with-reason action cards, cloud sync dialogs.

Files changed: `js/ui.js`, `css/style.css`, `sw.js` (re-stamped), `tests/browser.mjs` (+1 test, import confirmation), `tests/sync-browser.mjs` (import confirmation), `tests/*RESULTS.txt`, this file.
Tests: `npm test` 52/52, `test:browser` 22/22, `test:sync` 43/43, `test:rls` 13/13, `test:sync-browser` 13/13 (Node v22, Chromium 141). Nothing run against a real Supabase project.
(Part 1 left a populated-save pass and a keyboard pass for Part 2; see the section above this one.)

## UX Session 1 (Parts 1 and 2): final status

Implemented and verified in source and in a real browser:
- PITHE is the only space; no space selector exists. Tracker -> Pithe rewards untouched (new saves on by default, stored true/false kept, 6 EXP + 4 skill EXP, 3 granted per device-local day, capped completions stored as `capped` and never paid later, per-completion `reward` claim, no retroactive pay, one-off `task` type).
- Light editorial palette (cream, forest, olive, terracotta, warm white, muted, divider). Small text uses darker derived tones (#66655C, #5C6B40, #9C4E3D) for WCAG AA; exact palette values are used for surfaces and fills. axe-core reports no violations on all views, both Home tabs, both header panels, and the dialog.
- Shell: header (title, game time, Messages, Notifications), compact status summary on every page, one main scroll flow, bottom navigation at every width in the order Home, World, Journal, Progress, More. No sidebar. Header holds no primary navigation.
- Home: People, Family, Personal tabs (a row; fits at 300px). Personal is the default and shows Tracker goals with quick record. Family says honestly there is no family data in this world.
- Messages: honest "no messages" state (no messaging exists). Notifications: only real conditions from the save (needs warnings, quest deadline under 24h), otherwise an empty state. Panels close by Close, Escape (focus returns to the button), outside click or navigation.
- Progress: attributes, skills, progression only. More: Tracker, Quests, Inventory, Settings and save data (export, import, cloud sync, reset).
- Startup: a real loading state replaced when the save is read; an error screen with Reload when a game file is missing or throws while loading.

Part 1 changed: `css/style.css`, `js/ui.js`, `js/main.js`, `index.html`, `manifest.webmanifest`, `sw.js`, tests. Part 2 changed: `css/style.css` (Home tabs shrink to fit 300px, error box margin), `index.html` (window error and unhandledrejection handlers so a throwing module cannot leave the loading screen up), `README.md`, `docs/SUPABASE_SETUP.md`, `docs/PANDUAN_INDONESIA.md` (Settings path is now More, Settings and save data), `tests/browser.mjs` (+1 test), `tests/*RESULTS.txt` (regenerated), `sw.js` (re-stamped). No change to `rules.js`, `data.js`, `storage.js`, `sync.js`, `cloud.js`, the save schema or any game rule.

Test results (Node v22.22.0, Chromium 141 via Playwright): `npm test` 52/52, `test:browser` 21/21, `test:sync` 43/43, `test:rls` 13/13, `test:sync-browser` 13/13. No pre-existing failures; no regressions found. The Part 1 test edits were needed because the old tests asserted the removed sidebar and Settings on Progress.

Visually inspected (screenshots at 1280, 390 and 300px): loading, setup, Home (Personal, People, Family), Messages and Notifications panels, Tracker, Progress, More, Settings, load-failure and module-throw error screens. Not inspected: every page with a populated save at every width, Firefox and Safari, a real installed PWA, screen readers.

NOT validated: nothing was run against a real Supabase project (all cloud tests use a stand-in server or simulated PostgreSQL). App icons still use the original dark artwork (outside Session 1 scope).

(Sections below this line are the history of earlier rounds. Where they describe the old seven-item or sidebar layout, the section above is current.)

## Tracker rewards default-on round
- New characters start with real-life rewards ON (`createCharacter`: `integration` defaults to true; the setup checkbox is pre-checked; an explicit unchecked box still means off). New Tracker items are linked by default while rewards are on.
- `migrateState` keeps any stored true/false `settings.integration` exactly as saved (legacy fixture stays false). Only a save with no stored value at all gets the default. Old saves cannot tell "explicit off" from "never touched", so every stored false is respected.
- Tracker shows Enable/Disable rewards at all times. Cap unchanged: 3 GRANTED rewards per device-local real calendar day, counted from stored claims; completions past the cap are still recorded, stored as `capped`, never queued or paid later.
- Files: js/rules.js, js/ui.js, tests/run.mjs, tests/sync.mjs, tests/browser.mjs, README.md, sw.js (re-stamp), this file.

## Tracker-to-PITHE round (real-life completions reward the character)

What was found: the Tracker already paid a reward through the normal EXP and skill rules, but the reward amounts were hard-coded in `doTrackerReward`, a completion kept no record of whether it had been paid (the only guards were "one completion per goal per day or week" and a per-day counter), the daily cap could be reset by moving the date, and there was no one-off task type.
Changed:
- `js/data.js`: `TRACKER_REWARD = { exp: 6, skillExp: 4, dailyCap: 3 }` (same numbers as before, now configuration).
- `js/rules.js`: every new completion is judged exactly once by `claimTrackerReward` and the outcome is stored on the completion as `reward: { status: 'granted' | 'capped' | 'not-linked' | 'disabled', exp, skill, skillExp }`. The daily cap is now counted from stored claims (and the old counter), so changing the date back and forth cannot reset it. `addGoal` accepts kind `task` (stored as a goal with target 1).
- `js/ui.js`: Tracker gets a "One-off task" type, an "Enable real-life rewards" button when they are off, accurate reward text, and each history line shows what the completion earned.
- `tests/run.mjs` (+11), `tests/sync.mjs` (+4), `tests/browser.mjs` (+1). `sw.js` re-stamped, README updated.
Save schema: backward compatible. Completions saved earlier have no `reward` field and stay exactly as they were; they are never paid retroactively. No migration step, no change to storage keys, the checksum, export/import format, or the sync engine (sync still moves whole saves).
Not changed: native quests, activities, the world, `storage.js`, `sync.js`, `cloud.js`.
Guarantee and limits: see the final report of this round (the claim lives in the same JSON save that is written to IndexedDB and to the cloud as one unit, so a reward and its proof move together; two devices that complete the same item offline get a conflict, never a second reward; nothing was run against a real Supabase project; two tabs of the same browser still follow last-write-wins).

Status: Phase 1 vertical slice, now an installable offline-first PWA. The earlier audit fixes remain. Phase 2 has not been started and no game mechanics, narrative, data or save schema changed in this round.

Automated results (details and environment under "Test results"): 36 of 36 fast tests pass (`npm test`, revision 0.2.2), 19 of 19 real-browser tests pass (`npm run test:browser`, Chromium 141 through Playwright), including offline play with the server stopped and the browser offline.

## Changes in this round (PWA finalization)

Added:
- manifest.webmanifest: name, short name, start URL "./", scope, standalone display, theme and background colors, three icons (192, 512, 512 maskable). Chromium reports no manifest errors and no installability errors.
- icons/: original icon artwork (a brass T inside the game's double-bordered status window): icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png (180), favicon-32.png, icon.svg. No emoji, no external images. Generated by tools/make-icons.py (dev tool, needs Pillow).
- sw.js: service worker. Precaches the 15 real runtime files (16 entries, counting the start URL) at install (fetched with cache "reload" so a stale HTTP cache cannot leak in), serves them cache-first, falls back to the network for anything else, and to the cached index.html for failed navigations. Never reads or writes saves.
- js/pwa.js: registers the service worker (secure contexts only) and shows an accessible update bar ("Reload to update" / "Later"). A reload happens only after the player asks for it.
- tools/stamp-version.mjs and `npm run stamp`: writes a hash of all precached files into `CACHE_VERSION` in sw.js, so a changed file can never ship under an old cache name. A test fails if the stamp is stale.
- tests/browser.mjs (19 real-browser tests), tests/fixtures/legacy-save.json (a save record written by the ORIGINAL pre-PWA build), tests/BROWSER_RESULTS.txt.

Changed:
- index.html: manifest, theme-color, icon links; loads js/pwa.js. The file:// notice is unchanged.
- css/style.css: (1) Dashboard overflow at 300px: root cause was `.cols` using `minmax(18rem, 1fr)`, a 288px minimum column inside a 268px content box at 300px, so two panels stuck out by 4px. Now `minmax(min(18rem, 100%), 1fr)`; no overflow rule was hidden. (2) Mobile bottom navigation: below 36rem the seven labelled items sit in two rows (4 + 3) at 12.8px with 48px-high targets; from 36rem to the desktop breakpoint they stay in one row at 12.8px. Order, labels and destinations are unchanged. (3) Update bar styles.
- js/ui.js (accessibility only): the warning dialog is now `role="alertdialog"` labelled by its heading and described by its text; focus moves to Cancel (the safe choice) on open; Tab and Shift+Tab stay inside it; Escape cancels; the rest of the page is `inert` while it is open; focus returns to the button that opened it. Progress bars (health, energy, satiety, EXP, attributes, skills, goal progress) now have accessible names (axe reported them as unnamed). The journal "tablist" had plain buttons as children (invalid ARIA); it is now a labelled group with `aria-pressed` buttons. The RESET confirmation and "Proceed anyway" requirement are unchanged.
- package.json: version 0.2.0, new scripts (test:browser, test:all, stamp), dev dependencies playwright and axe-core (dev only, no runtime dependency added).
- tests/run.mjs: four PWA file tests added; the emoji scan now also checks file names, treats PNGs as binary (signature check, no text metadata chunks) and still covers every project file.
- README.md and this file.

Not changed (verified byte-identical to the original archive): js/rules.js, js/data.js, js/storage.js. So the save schema, storage keys, checksum, backup, export/import format and all game rules are exactly as before.

Deleted: nothing.

## Cloud save round (Supabase, optional)
New: `js/config.js`, `js/cloud.js` (fetch client), `js/sync.js` (engine), `js/cloud-ui.js` (panel + conflict dialog), `supabase/schema.sql`, `docs/SUPABASE_SETUP.md`, `tests/sync.mjs`, `tests/sync-browser.mjs`, `tests/rls.mjs`, `tests/sync-mock-server.mjs`.
Edited: `js/main.js` (wiring), `js/ui.js` (panel placement, `applyRemote`), `css/style.css`, `sw.js` (precache list + stamp), `package.json`, README, this file. Untouched: `rules.js`, `data.js`, `storage.js`, `pwa.js`.
Sync bookkeeping lives in its own IndexedDB database `tap-protocol-sync` (session, last-synced revision/hash, conflict backups), so RESET does not erase conflict backups and the save schema is unchanged.
(Superseded by the audit round below: every suite has now been run. Nothing has been run against a real Supabase project.)

## Audit round 0.2.2 (second cloud sync review)
Checked by reading every cloud file and re-running all suites on the uploaded v0.2.1 ZIP (all passed: 36 / 19 / 36 / 12 / 13). The two v0.2.1 fixes (old cloud save never pulled silently; guard against a tap during apply) were confirmed in code AND by their tests. RLS policies, grants and trigger were re-read: own rows only, no delete, owner and revision forced by the database.
Found and fixed (each with a test that fails on v0.2.1):
- Dead end in the conflict dialog: if the cloud changed in the instant between pressing "Keep this device's save" and the write, v0.2.1 stayed in the conflict phase with NO dialog, and "Sync now" was ignored until the page was reloaded. Nothing was ever overwritten, but the player was stuck. Now the engine looks again at once and the dialog returns with the new cloud version. (js/sync.js)
- Small guard: if the save keeps changing through all passes of one sync, the status goes back to "Waiting to sync" and retries instead of staying on "Syncing". (js/sync.js; test is a guard only, it also passes on v0.2.1)
- js/config.js is now served network-first by the service worker (cached copy only when offline). Before, filling in the key without running `npm run stamp` left installed phones on the old EMPTY config, so cloud sync never appeared. (sw.js; browser test fails on v0.2.1)
- docs/PANDUAN_INDONESIA.md told the owner to send the key to Claude in chat. Rewritten: the owner pastes the key into js/config.js alone. config.js ships with the key EMPTY.
- Key helper (added after 0.2.2 review, no game change): `tools/set-key.mjs` and `ISI-KEY.bat` write the owner's Publishable key into `js/config.js` from a hidden prompt or a text file, refuse Secret/service_role keys, never print or store the key elsewhere, and re-stamp `sw.js`. Checked on a temporary copy with FAKE keys (piped input, a text file holding a Publishable plus a Secret key, a real pseudo-terminal with backspace, `--clear`); `npm test` and `npm run test:sync-browser` still pass with a key filled in. No automated test file covers the helper.
- Comparison with the live repository (v0.2.0, read-only clone, nothing pushed): only cloud files are new, and `js/rules.js`, `js/data.js`, `js/storage.js`, `js/pwa.js`, `index.html`, `manifest.webmanifest` are byte-identical. `css/style.css` only gains 9 added lines; `js/ui.js` only gains the cloud panel slot and `applyRemote`. The repository has no workflow file, so GitHub Pages most likely deploys straight from the branch (not verified: the Pages setting itself is not readable from here).

Tests now: npm test 36, test:browser 19, test:sync 38, test:sync-browser 13, test:rls 13 (see tests/*RESULTS.txt). All Supabase calls in these tests go to a stand-in server or a local simulated PostgreSQL. Nothing has been run against the real Supabase project.

## Audit round 0.2.1 (cloud sync review)
Findings, each backed by a test run:
- The 6 failing UI-flow tests in `npm test` were a STALE TEST HARNESS, not a game regression: `js/main.js` (cloud wiring) reads the globals `location` and `history`, and the jsdom harness in `tests/run.mjs` only defined `window`/`document`/`FormData`. `boot()` threw, `app` was never created, and the next five tests failed on that. Fix: two lines in the harness. No gameplay file changed for this.
- `js/config.js` was EMPTY, so cloud sync was off. The Project URL is now set; the Publishable key is added separately by the owner (see docs/PANDUAN_INDONESIA.md).
- Gap closed: a cloud save with LESS game time than this device was still pulled silently when this device had no unsynced change (for example after an old export is imported on another device). It now goes to the conflict screen (`looksOlder`, `reason: 'older-cloud'`), with both versions backed up.
- Gap closed: a tap landing exactly while a cloud save was being applied could be overwritten. `applyRemote(state, guard)` now re-checks that the device is unchanged at the start AND the end of the write; pull, Restore and "Keep the cloud save" all pass a guard.
- Added: pasting a Secret / service_role key into `config.js` makes cloud sync refuse to start (`keyProblem`) instead of sending it.
- Added: "Create account" for an email that already has an account (Supabase sends no email in that case) now says so, and the sign-in form tells the player to use Sign in on the second device. The empty-`identities` signal is documented Supabase behaviour but was NOT confirmed against the real project.
- Tests: tests/run.mjs 36 (harness fix, config.js check, UI-level guard test), tests/sync.mjs 36 (7 new, each shown to fail when its fix is removed).
Still NOT verified (needs the owner): SQL migration run in the real project, sign-up and email delivery, redirect URLs, real token refresh, two real devices. See docs/SUPABASE_SETUP.md step 7.

## Test results

Environment: Linux container, Node v22.22.0, Chromium 141.0.7390.37 (headless, via Playwright 1.56.0), jsdom and fake-indexeddb for the fast suite. Pages were served from http://127.0.0.1 (a secure context). Full outputs: tests/RESULTS.txt and tests/BROWSER_RESULTS.txt.

Baseline before any change: `npm test` 30 passed, 0 failed.

After the changes:
- `npm test`: 34 passed, 0 failed (the 30 original tests plus manifest validity, precache list equals the real files, cache-version stamp is current, no remote URL references; the emoji scan was extended).
- `npm run test:browser`: 19 passed, 0 failed. Every test uses a fresh browser context with its own storage, so no real save was touched.

What the 19 real-browser tests cover:
- Manifest and installability: manifest and all icons load and decode at their declared sizes; Chromium's own checks report no manifest errors and no installability errors.
- Service worker: registers, activates, and the cache holds exactly the precache list, every entry status 200 and non-empty.
- Offline: the server process is stopped AND the context is set offline (a request to the origin is shown to fail). Then: the app launches from its start URL in a new tab, from /index.html too; the existing save loads; all seven sections open; an action and a journal entry update the save; a reload keeps those changes; no console or page errors; no request to any other origin.
- Updates: a new version installs beside the old one, the prompt appears, accepting it switches versions, the old cache is deleted, and the save is deep-equal to before. "Later" dismisses the prompt. A broken release (a precached file missing) fails to install, its partial cache is deleted, the old version keeps working offline, and the save is untouched.
- Existing saves: a save record written by the original pre-PWA build loads unchanged with the service worker active, online and offline.
- Safeguards: export downloads a valid file; invalid imports are rejected and change nothing; a valid import restores the exported state exactly; RESET is refused for "", "reset", "RESET ", "Reset", "DELETE" and only the exact word deletes the save.
- Layout at 300, 320, 360, 390, 600, 768 and 1280 px: no horizontal overflow on the setup screen and all seven views; the navigation has all seven labels in order, none clipped, labels at least 6px apart, touch targets at least 44px, and the fixed bar never covers the end of the page. These tests were also run against the original css and ui.js and fail there (clipped "Dashboard" label at 300px, overflow, unnamed progress bars, invalid tablist), so they do detect the old defects.
- Dialog: keyboard-only operation (focus lands on Cancel, Tab and Shift+Tab stay inside, Escape cancels without changing state, Tab then Enter confirms, focus returns to the opener, background inert, dialog named and described).
- Automated accessibility scan with axe-core (WCAG 2.0 and 2.1, A and AA, which includes color contrast) on the setup screen, all seven views and the open dialog at 390px and 1280px: no violations. This is an automated scan only.
- Quest failure path, played through the real UI: accept The Missing Menu from Dani, write one draft, go home and sleep, nap or rest until the 72 game hours pass. A warning about the deadline was shown before it was missed. Result: status failed, outcome late, finished after the deadline, not delivered, fewer than three drafts, Dani trust down by exactly 10, no money paid, no EXP, no reward item, failure written to the activity log and shown to the player, Quests view shows "Failed" with no countdown, the Journal activity history lists it. The stored save equals the state at failure; after a full page reload the stored save is identical and the views still show the failure; the world stays playable, and Dani no longer offers delivery but offers the aftermath conversation. The intended quest outcome was not changed.

Also run once by hand (not part of the suite): the documented `python3 -m http.server` workflow. Chromium reported no manifest or installability errors, the shell was cached, and a reload with that server killed still started the game.

How the tests are limited: the fast suite uses jsdom and fake-indexeddb. The browser suite uses one engine (Chromium) in headless mode on a Linux container, emulated offline plus a stopped server, not a physical device in airplane mode.

## NOT VERIFIED (and how to check manually)

- Firefox and Safari: not run at all. Check: open the game in each, play, reload, then go offline and reload.
- The browser's actual Install button and dialog, an installed standalone window, and Android or iOS installation: not exercised (only Chromium's installability criteria were checked). Check: README, "Install it", then airplane mode and launch.
- Whether an installed app on a given platform shares storage with the browser tab (iOS Home Screen apps are known not to). Check: export before installing, compare after.
- Maskable icon appearance on real Android launchers: the artwork keeps its content inside the 80 percent safe zone, but no launcher was tested.
- Real HTTPS hosting: only localhost and 127.0.0.1 were used. Check: deploy, open once online, go offline.
- Screen readers (NVDA, VoiceOver, TalkBack): not tested. Only keyboard operation and an automated axe scan were done; do not read this as screen-reader compliance. Check: use the game with a screen reader, especially the warning dialog and the action report that appears after each action.
- Multiple tabs open during an update, and two tabs writing the same save (unchanged limitation).
- Long-session balance (unchanged).

## Files

    index.html               entry page (loads js/main.js and js/pwa.js as ES modules)
    manifest.webmanifest     web app manifest (install name, start URL, display, colors, icons)
    sw.js                    service worker: precache, cache-first serving, safe updates
    css/style.css            all styling, responsive, no external assets
    icons/                   app icons (PNG 32, 180, 192, 512, 512 maskable, and SVG)
    js/data.js               static data: attributes, skills, backgrounds, traits, locations, NPCs, items, activities, quest
    js/rules.js              game rules and state transitions (pure logic, no DOM, no storage)
    js/storage.js            IndexedDB persistence, checksum, rolling backup, localStorage fallback, import/export
    js/ui.js                 rendering and event handling (one root element, event delegation)
    js/main.js               wires storage to the UI
    js/pwa.js                service worker registration and update prompt
    tools/stamp-version.mjs  writes the cache version hash into sw.js (npm run stamp)
    tools/make-icons.py      regenerates icons/*.png (dev only, needs Pillow)
    tests/run.mjs            fast automated tests (rules, storage, jsdom UI flow, PWA files, emoji scan)
    tests/browser.mjs        real-browser tests (Chromium via Playwright): offline, updates, layout, dialog, quest failure
    tests/fixtures/          legacy-save.json: a save record written by the pre-PWA build
    tests/RESULTS.txt        output of the last fast test run
    tests/BROWSER_RESULTS.txt output of the last browser test run
    package.json             scripts and dev-only dependencies
    README.md                how to run, install, use offline, update, troubleshoot
    PROJECT_STATUS.md        this file

## Architecture

- State is one plain JSON object. rules.js mutates it through `execute(state, action)`. The UI never changes game state directly, except for settings toggles.
- Actions are objects: `{kind:'activity'|'travel'|'talk'|'buy'|'sell'|'use'|'journal', ...}`.
- `preview(state, action)` runs the real rules on a deep copy of the state. The preview shown in the UI and the warnings come from the same code that executes the action. Random outcomes (explore, haggle) show "Outcome varies".
- Reports (the list of changes after each action) are computed by diffing a snapshot before and after, so they show actual state changes, not text written by hand.
- Randomness is a seeded generator whose state is stored in the save.
- Persistence: after every mutation the whole state is serialized and written to IndexedDB in one transaction. The previous main record is copied to a backup record first. Each record has a checksum. On load, a main record that fails its checksum or validation is replaced by the backup.
- The world clock starts at Monday 4 March 2030, 07:00 and only advances through actions (15-minute steps internally).

## Rules summary

Needs (hardcore): Health, Energy, Satiety (0-100). Satiety falls 1 per 20 minutes. At 0 satiety, health falls 4 per hour. Health recovers 1 per hour when satiety is at least 40 and energy at least 30. Awake between 00:00 and 05:00 drains energy. Energy below 20 halves EXP and skill gains. Health at 0 causes a collapse: 12 hours pass, you wake at home with Health 25, and lose 25 percent of your money. The save is never deleted.
Diminishing returns: the same activity gives full rewards twice per game day, half rewards for the third and fourth, then nothing. Exploring is limited to two rewarding outings per location per day.
Progression: EXP gives character levels (60 + 40 per level). Skills level from EXP (20 + 10 per level, max 10). Each skill level-up adds 1 training point to its attribute; the attribute rises when training equals its current value (max 10). The quest also gives a direct milestone increase.

## Data model (save object)

    version, createdAt, rng, clock (minutes since start), location
    character: name, age, appearance, background, trait, difficulty, level, exp, attributes{12}, attrProgress{12}, skills{id:{level,exp}}
    needs: energy, satiety, health        acc: internal timers for needs
    money, inventory{itemId:qty}, relations{npcId:trust}, flags{topics{}, heardRegulars, haggleDay}
    daily: {day, counts{}}                (diminishing-returns counters, reset each game day)
    quests.menu: status, offered, drafts, acceptedAt, deadline, finishedAt, outcome, objectives{5 booleans}
    journal[]: id, type (rpg|real), title, text, realDate, realTime, clock, gameTime
    tracker: goals[] (id, name, kind, cadence, target, createdDate, completions[{date,ts,note}], completedDate, rpgLink, linkedSkill), rewardLog
    log[]: activity history (max 400)     settings: integration     stats     nextId

## Implemented in Phase 1

Character creation (name, fictional age, appearance text, 6 backgrounds with attribute distributions, 6 traits, hardcore difficulty, optional real-life integration). Dashboard, Character, Journal, Tracker, World, Quests and Inventory views. 12 attributes (1-10) and 9 skills. 4 locations, 3 NPCs with schedules and dialogue topics, a Saturday market event. 12 activities. One complete quest (The Missing Menu) with a real success outcome (two quality levels) and a real failure outcome (deadline). Journal (in-world and real-life entries, activity history). Tracker (habits and goals, streaks, 14-day strip, history, optional capped RPG rewards). Inventory, money, shop, one-time item rewards. Warnings before costly actions. Export, import and delete-with-confirmation of saves.

## Known limitations and bugs

- Does not work from file:// (verified: browsers block ES modules). A local server is required.
- Service workers and installation need https:// or localhost. A LAN address over http (for example opening the dev server from a phone) can play the game but cannot go offline or install.
- The first visit must be online. The offline copy only exists after one successful load.
- During development, edited files are not picked up until `npm run stamp` and an update (or DevTools "Bypass for network"). A test catches a forgotten stamp.
- An update waits for the player's confirmation or for all tabs to close; it is never forced.
- Full re-render on every action, so text typed into a form is lost if an action fires at the same time. Not an issue in normal use.
- Tracker has no edit, archive or delete for goals. Dates use the browser's local date.
- The localStorage fallback was tested in Chromium with IndexedDB disabled and works.
- Multiple tabs are not coordinated. The last write wins; do not play in two tabs.
- Balance has not been playtested over long sessions. Money and food numbers are first guesses.
- Journal entries grow without bound (the activity log is capped at 400).
- Only one quest exists, so the quest UI shows exactly one.
- Supernatural abilities are not implemented, as required for Phase 1.

Fixed in this round (were listed before): mobile bottom-nav crowding at 390px, Dashboard 4px overflow at 300px, warning dialog not trapping keyboard focus, no PWA or service worker.

## Deferred to Phase 2 (not started)

Open-ended content: more locations, NPCs, quests and a quest generator. Education, careers, properties, organizations, reputation and a wider economy. Relationships and random events. Dungeons and the first supernatural unlock. Achievements. Stress or mood needs. Journal search and tags. Tracker editing and weekly review. Save slots and save-conflict handling across tabs. Screen reader testing and a wider accessibility pass. Firefox, Safari and real-device testing.

## Exact next steps for Phase 2

1. Test on real devices and in Firefox and Safari; fix what appears. Test the install flows and a screen reader.
2. Move quest definitions from hard-coded rules into data (a quest engine with objective types) so new quests need only data.
3. Add a generic event system hooked into `advance()` for world events and random encounters.
4. Add 3 to 5 more locations and NPCs, a second quest, and the first achievements.
5. Add goal editing and archiving in the tracker, and journal search.
6. Add save-slot management and multi-tab detection.
