# Cloud save setup (Supabase) - step by step

This adds optional cloud sync so Pithe's save can follow you between your laptop and your phone.
The game still works without it, and your save always stays on each device too.

Written from the Supabase documentation and tested against a stand-in server, **not yet against your real Supabase project**.
Step 7 below is how you check the real thing. If a screen in the dashboard looks different from what is described here,
Supabase may have renamed a menu: look for the item with the same words.

## Before you start (2 minutes, do not skip)

1. In the game, open **Character > Settings and save data > Export save file** and keep the downloaded file somewhere safe.
2. Have your Supabase **Project URL** and **Publishable key** ready (the text file you saved).
   - Project URL looks like `https://abcdxyz.supabase.co`
   - Publishable key starts with `sb_publishable_`
   - These two are meant to be public. It is fine for them to be in the game files on GitHub.
   - **Never** use the *Secret* key (`sb_secret_...`) or a *service_role* key anywhere in this project. If one ever ends up in a file, treat it as leaked and rotate it in the Supabase dashboard.

## 1. Create the table (SQL migration)

1. Open your project at https://supabase.com/dashboard and choose your project.
2. Left menu: **SQL Editor** > **New query**.
3. Open the file `supabase/schema.sql` from this project, copy **everything**, paste it into the editor.
4. Click **Run**. You should see "Success. No rows returned". Running it again later is harmless.

Check it worked: left menu **Table Editor** > a table named `cloud_saves` exists and shows an "RLS enabled" label.
(**Authentication > Policies** lists three policies for `cloud_saves`: select, insert and update, all "own row only".)

You do not need to create any table or column by hand.

## 2. Check the sign-in settings

- **Authentication > Sign In / Providers**: **Email** is enabled and **Confirm email** is on (keep it on).
- **Authentication > URL Configuration**:
  - **Site URL**: `https://haikal-hafidz.github.io/Tap-Protocol/`
  - **Redirect URLs**: add `https://haikal-hafidz.github.io/Tap-Protocol/` and `https://haikal-hafidz.github.io/Tap-Protocol/**`
  - Optional, only if you test on your own computer: `http://localhost:8080/**`

The address must match exactly, including the capital letters and the final `/`. A mismatch is the most common reason the email link does not sign you in.

Supabase's built-in email sender allows only a small number of emails per hour. If the confirmation email does not arrive, wait a little and try again, and look in the spam folder.

## 3. Put the Project URL and Publishable key in the game

Easiest: run `node tools/set-key.mjs` (or drag your key TXT onto `ISI-KEY.bat` on Windows). It asks for the key without showing it, accepts only a Publishable key, and edits only `js/config.js` (plus the cache stamp). Or open `js/config.js` yourself and fill in the two lines:

```js
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YOUR-KEY';
```

Leave the quotes. Do not add any other key.

## 4. Offline cache

Since version 0.2.2 you do NOT need to run `npm run stamp` after editing `js/config.js`: the service worker always fetches that one file from the network first (and uses its cached copy only when offline), so phones that already have the game pick up the key on their next online start. Changes to any OTHER game file still need `npm run stamp` before publishing.

## 5. Publish to GitHub Pages

Upload/commit the whole project folder to your GitHub repository the same way you did before (new files: `js/config.js`, `js/cloud.js`, `js/sync.js`, `js/cloud-ui.js`, `supabase/`, `docs/`, `tests/`). Wait for GitHub Pages to finish (the Actions tab shows a green tick), then open https://haikal-hafidz.github.io/Tap-Protocol/.
On a device that already had the game you will see "A new version is ready": press **Reload to update**. Your save is not affected.

## 6. First use

**Laptop (the device that has your current save):**
1. Character > scroll to **Cloud sync**. Type your email and a password (at least 8 characters). Press **Create account**.
2. Open the email from Supabase and click the link. It brings you back to the game, signed in.
3. The panel shows **Synced at ...**. Your save is now in the cloud.

**Phone:**
1. Open the game. **Do not create a new character.** On the first screen, find **Cloud sync**, enter the same email and password, press **Sign in**.
2. Press **Restore cloud save onto this device**. Pithe appears.

From then on every change is sent automatically a couple of seconds after you play. If you are offline, it waits and sends when you are back.
Opening the game on the other device brings the newest save in, as long as that device has no unsynced changes of its own.

## 7. Check it really works on your project (please do this once)

1. On the laptop, make a small change (for example record a journal entry). Wait for **Synced at**.
2. In the Supabase dashboard open **Table Editor > cloud_saves**: there is one row, `revision` goes up by 1 after each sync.
3. On the phone, reopen the game: the entry appears.
4. Turn on airplane mode on the phone, play a little (status says **Offline**), turn it off: it syncs by itself.
5. Sign out on the phone, confirm the game still has your save. Sign in again.
If something fails, tell me which step and what the panel says.

## If both devices changed (the conflict screen)

If you played on both devices while they could not reach each other, the game shows both saves side by side (character, level, game date, money, journal entries, when and where). **Nothing is overwritten.** Both versions are first backed up inside this browser, and you can press **Download both as files**. Then choose **Keep this device's save** or **Keep the cloud save**. "Decide later" (or Escape) changes nothing.

## Good to know

- **RESET** deletes only the save on this device, as before. The cloud copy stays. After a RESET a brand-new character will meet the old cloud save as a conflict (never silently replace it). To remove the cloud copy for good, delete the row in **Table Editor > cloud_saves** yourself. The game cannot delete cloud data on purpose.
- **Sign out** only signs you out. It never deletes your save.
- **Forgot password:** not built into the game yet. In the dashboard: **Authentication > Users**, open the user, and send a password recovery email, or delete and recreate the account (export your save first).
- The cloud keeps one current save, not a history. The history is the backups the game keeps on each device plus your exported files.
- Free Supabase projects can be paused after a long period of inactivity. Your local saves are unaffected; resume the project in the dashboard.

## Troubleshooting

| What you see | Meaning / fix |
| --- | --- |
| "Cloud sync is not set up in this copy of the game" | `js/config.js` is empty, or you skipped step 4/5. |
| "Your email is not confirmed yet" | Click the link in the confirmation email first. |
| The email link opens the game but you are not signed in | Redirect URLs (step 2) do not match the address exactly. |
| "Wrong email or password" | Check for typos. Passwords are case-sensitive. |
| "Sync problem ... server had a problem" | Supabase or the network had a hiccup. Your save is safe. Press **Retry now**. |
| "last synced with a different account" | This device's save belonged to another account. Press **Upload this device's save to this account** only if that is what you want. |

## What was tested, and what was not

Ran and passed (revision 0.2.2, Node 22, Chromium 141). All of these use a STAND-IN for Supabase, never your real project:
- `npm test`: 36 tests (rules, local storage, the real game UI in jsdom, PWA files, the cloud-apply guard).
- `npm run test:sync`: 38 sync-engine tests against a stand-in server: decisions, conflicts, two devices pushing at once, offline queue, retries, expired sessions, sign-out, different account, hostile data, older-cloud rule, races, refused Secret key.
- `npm run test:rls`: 13 database tests. They run the real `supabase/schema.sql` in a local simulated PostgreSQL (PGlite) with two users. This proves the SQL logic (own rows only, revision set by the database, no delete, no anonymous access). It does NOT prove that your Supabase project has the table, that its Data API exposes it, or that Supabase's own JWT checks behave the same.
- `npm run test:browser` (19) and `npm run test:sync-browser` (13): real Chromium. The second one uses the stand-in server.

NOT verified by anyone yet (this is what step 7 is for): the SQL really run in your project, real sign-up and email delivery, the redirect URLs, real token refresh, and two real devices (laptop and phone).
