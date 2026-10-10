// A small in-process stand-in for the parts of Supabase that TAP Protocol uses (auth + the cloud_saves table).
// It is NOT Supabase. It copies the rules the real database enforces so the sync engine can be tested without a
// network: owner-only rows, the revision trigger (revision = old + 1, whatever the client sends), insert conflicts,
// "update ... where revision = N" matching zero rows, and jsonb reordering object keys.
// What it cannot prove: real email delivery, real token formats, real RLS. Those need a real project (see docs).
import http from 'node:http';

function jsonbOrder(v) {   // Postgres jsonb stores object keys sorted by length, then bytewise
  if (Array.isArray(v)) return v.map(jsonbOrder);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))) o[k] = jsonbOrder(v[k]); return o; }
  return v;
}

export function createMock({ confirmEmail = true } = {}) {
  const m = {
    users: new Map(), tokens: new Map(), refresh: new Map(), rows: new Map(), counter: 0,
    confirmEmail, offline: false, failNext: [], log: [], clockSkew: 0, writes: 0,
    delayMs: 0
  };
  const id = () => 'u' + (++m.counter);
  const issue = (u) => {
    const at = 'at' + (++m.counter), rt = 'rt' + (++m.counter);
    m.tokens.set(at, { uid: u.id, exp: Date.now() + 3600e3 }); m.refresh.set(rt, u.id);
    return { access_token: at, refresh_token: rt, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: u.id, email: u.email } };
  };
  m.confirm = (email) => { const u = m.users.get(email); u.confirmed = true; return '#' + new URLSearchParams({ access_token: issue(u).access_token, refresh_token: issue(u).refresh_token, expires_in: '3600', type: 'signup' }).toString(); };
  m.expireAccessTokens = () => { for (const t of m.tokens.values()) t.exp = 0; };
  m.revokeRefreshTokens = () => m.refresh.clear();
  m.row = (email) => m.rows.get(m.users.get(email).id);
  m.setRow = (email, row) => m.rows.set(m.users.get(email).id, row);

  m.handle = async function handle(method, url, headers, bodyText) {
    if (m.offline) throw new TypeError('Failed to fetch');
    if (m.delayMs) await new Promise((r) => setTimeout(r, m.delayMs));
    const u = new URL(url, 'http://mock');
    const p = u.pathname, h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    m.log.push(method + ' ' + p + u.search);
    const f = m.failNext.shift();
    if (f) return { status: f, body: { message: 'injected failure ' + f } };
    if (!h.apikey) return { status: 401, body: { message: 'No API key found in request' } };
    let body = {}; try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return { status: 400, body: { message: 'bad json' } }; }
    const bearer = (h.authorization || '').replace(/^Bearer /, '');
    const tok = m.tokens.get(bearer);
    const who = tok && tok.exp > Date.now() ? tok.uid : null;

    if (p === '/auth/v1/signup' && method === 'POST') {
      if (m.users.has(body.email)) return { status: 422, body: { msg: 'User already registered' } };
      if (String(body.password || '').length < 8) return { status: 422, body: { msg: 'Password should be at least 8 characters.' } };
      const usr = { id: id(), email: body.email, password: body.password, confirmed: !m.confirmEmail };
      m.users.set(body.email, usr);
      return usr.confirmed ? { status: 200, body: issue(usr) } : { status: 200, body: { id: usr.id, email: usr.email } };
    }
    if (p === '/auth/v1/token' && method === 'POST') {
      if (u.searchParams.get('grant_type') === 'password') {
        const usr = m.users.get(body.email);
        if (!usr || usr.password !== body.password) return { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid login credentials' } };
        if (!usr.confirmed) return { status: 400, body: { error: 'invalid_grant', error_description: 'Email not confirmed' } };
        return { status: 200, body: issue(usr) };
      }
      const uid = m.refresh.get(body.refresh_token);
      if (!uid) return { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid Refresh Token' } };
      m.refresh.delete(body.refresh_token);
      return { status: 200, body: issue([...m.users.values()].find((x) => x.id === uid)) };
    }
    if (p === '/auth/v1/user') { if (!who) return { status: 401, body: { msg: 'invalid JWT' } }; const usr = [...m.users.values()].find((x) => x.id === who); return { status: 200, body: { id: usr.id, email: usr.email } }; }
    if (p === '/auth/v1/logout') { m.tokens.delete(bearer); return { status: 204, body: null }; }

    if (p === '/rest/v1/cloud_saves') {
      if (!who) return { status: 401, body: { message: 'JWT expired', code: 'PGRST301' } };   // the anon role has no privileges at all
      const mine = m.rows.get(who);
      if (method === 'GET') return { status: 200, body: mine ? [mine] : [] };                  // RLS: only your own row is visible
      if (method === 'POST') {
        if (mine) return { status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint' } };
        const row = { user_id: who, revision: 1, payload: jsonbOrder(body.payload), schema_version: body.schema_version || 1, device_id: body.device_id || null, device_label: body.device_label || null, updated_at: new Date().toISOString() };
        if (!body.payload || typeof body.payload !== 'object') return { status: 400, body: { message: 'payload must be an object' } };
        m.rows.set(who, row); m.writes++; return { status: 201, body: [row] };
      }
      if (method === 'PATCH') {
        const want = u.searchParams.get('revision');
        if (!mine || want !== 'eq.' + mine.revision) return { status: 200, body: [] };         // WHERE revision = N matched nothing
        const row = { ...mine, payload: jsonbOrder(body.payload), schema_version: body.schema_version || mine.schema_version, device_id: body.device_id ?? mine.device_id, device_label: body.device_label ?? mine.device_label,
          revision: mine.revision + 1,                      // the trigger: forced, whatever the client sent
          user_id: mine.user_id, updated_at: new Date().toISOString() };
        m.rows.set(who, row); m.writes++; return { status: 200, body: [row] };
      }
      if (method === 'DELETE') return { status: 200, body: [] };                                // no delete policy: matches zero rows
    }
    return { status: 404, body: { message: 'not found ' + p } };
  };

  // fetch() look-alike for Node tests
  m.fetch = async (url, init = {}) => {
    const r = await m.handle(init.method || 'GET', String(url), init.headers, init.body);
    const text = r.body === null ? '' : JSON.stringify(r.body);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => text };
  };

  // Real HTTP server (with CORS) for browser tests
  m.listen = () => new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': 'apikey, authorization, content-type, prefer', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-max-age': '0' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
      let data = ''; for await (const c of req) data += c;
      try {
        const r = await m.handle(req.method, req.url, req.headers, data);
        res.writeHead(r.status, { ...cors, 'content-type': 'application/json' }); res.end(r.body === null ? '' : JSON.stringify(r.body));
      } catch { req.socket.destroy(); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise((r) => { server.closeAllConnections && server.closeAllConnections(); server.close(r); }) }));
  });
  return m;
}
