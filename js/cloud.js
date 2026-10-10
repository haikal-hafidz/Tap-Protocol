// TAP Protocol - minimal Supabase client using plain fetch (auth + one table). No SDK, no dependencies.
// Everything that touches the network goes through createCloud(), which takes its fetch and storage as arguments
// so tests can run it against a stand-in server. It never reads or writes the game save.

const TABLE = 'cloud_saves';
const COLS = 'user_id,revision,payload,schema_version,device_id,device_label,updated_at';

export class CloudError extends Error {
  constructor(kind, message, status) { super(message); this.kind = kind; this.status = status || 0; }
}
// kinds: 'network' (offline, DNS, timeout), 'auth' (bad credentials / expired session), 'conflict', 'server', 'config', 'input'

// Safety net: a Secret / service_role key must never run in a browser. If one is pasted into js/config.js by mistake,
// cloud sync refuses to start (the game itself keeps working) instead of sending it anywhere.
export function keyProblem(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (/^sb_secret_/i.test(k)) return 'secret';
  const parts = k.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload && payload.role === 'service_role') return 'service_role';
    } catch { /* not a readable JWT: treat as an ordinary key */ }
  }
  return '';
}

export function redirectUrl(loc) {
  // GitHub Pages serves the game from a sub-path (/Tap-Protocol/), so build the address from the current page.
  const u = new URL('./', loc.href);
  u.hash = ''; u.search = '';
  return u.href;
}

// After the player clicks the link in the confirmation email, Supabase sends them back to the game with the new
// session in the address fragment (#access_token=...). Read it once, then remove it from the address bar.
export function parseAuthFragment(hash) {
  if (!hash || hash.length < 2) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (p.get('error') || p.get('error_description')) return { error: p.get('error_description') || p.get('error') };
  if (p.get('access_token') && p.get('refresh_token')) {
    const exp = Number(p.get('expires_at')) || (Math.floor(Date.now() / 1000) + (Number(p.get('expires_in')) || 3600));
    return { session: { access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_at: exp }, type: p.get('type') || '' };
  }
  return null;
}

function friendlyAuth(status, body) {
  const m = String((body && (body.msg || body.message || body.error_description || body.error)) || '').toLowerCase();
  if (/email not confirmed/.test(m)) return 'Your email is not confirmed yet. Open the confirmation email from Supabase and click its link, then sign in.';
  if (/invalid login|invalid credentials/.test(m)) return 'Wrong email or password.';
  if (/already registered|already been registered|user already/.test(m)) return 'That email already has an account. Use Sign in instead.';
  if (/password/.test(m) && /(least|short|weak|characters)/.test(m)) return 'That password is too short or too weak. Use at least 8 characters.';
  if (/rate limit|too many|security purposes/.test(m)) return 'Too many attempts. Wait a minute and try again.';
  if (/valid email|invalid email|unable to validate email/.test(m)) return 'That does not look like a valid email address.';
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  return 'Sign-in problem (' + status + '): ' + (m ? m.slice(0, 140) : 'unknown error') + '.';
}

export function createCloud({ url, key, fetchImpl, kv, now = () => Date.now(), timeoutMs = 15000, redirectTo = '' }) {
  const base = String(url || '').replace(/\/+$/, '');
  const unsafeKey = keyProblem(key);
  const configured = !!(base && key) && !unsafeKey;
  const doFetch = (...a) => (fetchImpl || globalThis.fetch).apply(globalThis, a);
  let session = null;
  let refreshing = null;

  async function raw(method, path, { body, token, headers = {} } = {}) {
    if (!configured) throw new CloudError('config', 'Cloud sync is not configured.');
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    let res;
    try {
      res = await doFetch(base + path, {
        method, signal: ctl && ctl.signal,
        headers: { apikey: key, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new CloudError('network', ctl && ctl.signal.aborted ? 'The server took too long to answer.' : 'Could not reach the server. You may be offline.');
    } finally { if (timer) clearTimeout(timer); }
    let data = null;
    const text = await res.text().catch(() => '');
    if (text) { try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; } }
    return { status: res.status, ok: res.ok, data };
  }

  async function persistSession() { if (kv) await kv.set('session', session); }
  function setSession(s) {
    session = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user || (session && session.user) || null } : null;
  }
  async function load() {
    if (!kv) return null;
    const s = await kv.get('session');
    if (s && s.access_token) session = s;
    return session;
  }
  function normalizeTokenResponse(d) {
    return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(now() / 1000) + (d.expires_in || 3600), user: d.user ? { id: d.user.id, email: d.user.email } : null };
  }
  async function userFromToken(token) {
    const r = await raw('GET', '/auth/v1/user', { token });
    if (!r.ok) throw new CloudError('auth', friendlyAuth(r.status, r.data), r.status);
    return { id: r.data.id, email: r.data.email };
  }

  async function signUp(email, password) {
    const q = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : '';
    const r = await raw('POST', '/auth/v1/signup' + q, { body: { email, password } });
    if (!r.ok) throw new CloudError('auth', friendlyAuth(r.status, r.data), r.status);
    // With "Confirm email" on, Supabase answers 200 for an email that already has an account (so it does not reveal which
    // emails exist) but sends NO email and returns a user with an empty identities list. Say so instead of
    // letting the player wait for an email that will never arrive.
    const created = r.data && (r.data.user || r.data);
    if (created && Array.isArray(created.identities) && created.identities.length === 0) throw new CloudError('auth', friendlyAuth(200, { msg: 'User already registered' }), 200);
    if (r.data && r.data.access_token) { setSession(normalizeTokenResponse(r.data)); await persistSession(); return { needsConfirmation: false }; }
    return { needsConfirmation: true };
  }
  async function signIn(email, password) {
    const r = await raw('POST', '/auth/v1/token?grant_type=password', { body: { email, password } });
    if (!r.ok) throw new CloudError('auth', friendlyAuth(r.status, r.data), r.status);
    setSession(normalizeTokenResponse(r.data)); await persistSession();
  }
  async function adoptFragmentSession(s) {
    const user = await userFromToken(s.access_token);
    setSession({ ...s, user }); await persistSession();
  }
  async function signOut() {
    const tok = session && session.access_token;
    setSession(null);
    if (kv) await kv.delete('session');   // the local game save is never touched here
    if (tok) { try { await raw('POST', '/auth/v1/logout', { token: tok }); } catch { /* signing out locally is enough */ } }
  }
  async function refresh() {
    if (!session || !session.refresh_token) throw new CloudError('auth', 'Please sign in again.', 401);
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const r = await raw('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } });
        if (!r.ok) {
          // Only a definite rejection ends the session; a 5xx or a network failure keeps it for later.
          if (r.status >= 400 && r.status < 500) { setSession(null); if (kv) await kv.delete('session'); throw new CloudError('auth', 'Your sign-in expired. Please sign in again.', r.status); }
          throw new CloudError('server', 'The server had a problem (' + r.status + '). Try again later.', r.status);
        }
        setSession(normalizeTokenResponse(r.data)); await persistSession();
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function token() {
    if (!session) throw new CloudError('auth', 'Not signed in.', 401);
    if (session.expires_at && session.expires_at - 60 < now() / 1000) await refresh();
    return session.access_token;
  }
  async function authed(method, path, opts = {}) {
    let r = await raw(method, path, { ...opts, token: await token() });
    if (r.status === 401) { await refresh(); r = await raw(method, path, { ...opts, token: await token() }); }
    return r;
  }
  function serverError(r) {
    if (r.status === 401 || r.status === 403) return new CloudError('auth', 'The cloud refused this request (' + r.status + '). Try signing out and in again.', r.status);
    return new CloudError('server', 'The server had a problem (' + r.status + '). Your local save is safe. Try again later.', r.status);
  }

  async function fetchSave() {
    const r = await authed('GET', `/rest/v1/${TABLE}?select=${COLS}&limit=1`);
    if (!r.ok) throw serverError(r);
    return Array.isArray(r.data) && r.data.length ? r.data[0] : null;
  }
  // First upload. A row already existing (unique violation, 409) means another device got there first.
  async function insertSave({ payload, schema_version, device_id, device_label }) {
    const r = await authed('POST', `/rest/v1/${TABLE}?select=${COLS}`, { body: { payload, schema_version, device_id, device_label }, headers: { prefer: 'return=representation' } });
    if (r.status === 409) throw new CloudError('conflict', 'A cloud save already exists.', 409);
    if (!r.ok) throw serverError(r);
    return Array.isArray(r.data) ? r.data[0] : r.data;
  }
  // Compare-and-set: only changes the row if its revision is still `expectedRevision`. Zero rows = someone else wrote first.
  async function updateSave(expectedRevision, { payload, schema_version, device_id, device_label }) {
    const r = await authed('PATCH', `/rest/v1/${TABLE}?revision=eq.${encodeURIComponent(expectedRevision)}&select=${COLS}`, { body: { payload, schema_version, device_id, device_label }, headers: { prefer: 'return=representation' } });
    if (!r.ok) throw serverError(r);
    if (!Array.isArray(r.data) || r.data.length === 0) throw new CloudError('conflict', 'The cloud save changed on another device.', 409);
    return r.data[0];
  }

  return {
    configured, keyProblem: unsafeKey, load, signUp, signIn, signOut, adoptFragmentSession, fetchSave, insertSave, updateSave,
    get session() { return session; },
    get user() { return session && session.user ? session.user : null; },
    signedIn: () => !!session
  };
}
