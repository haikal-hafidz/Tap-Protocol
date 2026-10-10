// TAP Protocol - database tests for supabase/schema.sql, run on a REAL Postgres (PGlite = Postgres compiled to WebAssembly).
// It checks Row Level Security with two different users, the anonymous role, the revision trigger and compare-and-set.
// Run with: npm install && npm run test:rls
//
// PGlite has no Supabase in it, so this file creates the three things Supabase provides and schema.sql relies on:
// the roles anon/authenticated, the auth.users table, and auth.uid() (which reads the signed-in user from a setting,
// the way PostgREST passes the verified token's claims). Everything after that is your real schema.sql, unmodified.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQL = fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf8');
let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log('PASS  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message || e).split('\n')[0]); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'not equal') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
async function rejects(p, re, m) { try { await p; } catch (e) { if (re && !re.test(String(e.message))) throw new Error((m || 'wrong error') + ': ' + e.message); return; } throw new Error((m || 'expected an error, got success')); }

const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222';
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant select on auth.users to authenticated;
  grant usage on schema public to anon, authenticated;
  insert into auth.users values ('${U1}'), ('${U2}');
`);
await db.exec(SQL);
await db.exec(SQL);   // running the migration twice must be harmless

async function as(role, uid, fn) {   // run fn(q) as a role / signed-in user, then go back to the owner role
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role ${role};`);
  try { return await fn((sql, params) => db.query(sql, params)); } finally { await db.exec('reset role;'); }
}
const save = (n) => JSON.stringify({ money: n, character: { name: 'Pithe' } });

await test('migration is idempotent (ran twice without error)', async () => ok(true));
await test('RLS is enabled and forced on cloud_saves', async () => { const r = await db.query("select relrowsecurity, relforcerowsecurity from pg_class where relname='cloud_saves'"); eq([r.rows[0].relrowsecurity, r.rows[0].relforcerowsecurity], [true, true]); });
await test('user 1 inserts a save: revision is forced to 1 (even if the client sends 99), owner forced to the caller', async () => {
  const r = await as('authenticated', U1, (q) => q('insert into public.cloud_saves (user_id, revision, payload) values ($1, 99, $2::jsonb) returning user_id, revision', [U2, save(1)]));
  eq([r.rows[0].user_id, Number(r.rows[0].revision)], [U1, 1], 'a client cannot choose the owner or the revision');
});
await test('user 2 cannot see user 1\'s row; user 2 inserts their own', async () => {
  const seen = await as('authenticated', U2, (q) => q('select * from public.cloud_saves')); eq(seen.rows.length, 0);
  await as('authenticated', U2, (q) => q('insert into public.cloud_saves (payload) values ($1::jsonb)', [save(2)]));
  const mine = await as('authenticated', U2, (q) => q('select user_id from public.cloud_saves')); eq(mine.rows.map((x) => x.user_id), [U2]);
});
await test('user 2 cannot update user 1\'s row (0 rows) and cannot read it with a filter', async () => {
  const r = await as('authenticated', U2, (q) => q('update public.cloud_saves set payload = $1::jsonb where user_id = $2 returning *', [save(666), U1])); eq(r.rows.length, 0);
  const s = await as('authenticated', U2, (q) => q('select * from public.cloud_saves where user_id = $1', [U1])); eq(s.rows.length, 0);
  const own = await db.query('select payload from public.cloud_saves where user_id = $1', [U1]); eq(own.rows[0].payload.money, 1, 'user 1 data unchanged');
});
await test('user 2 cannot insert a second row, nor a row claiming to be user 1 (the owner is forced to the caller)', async () => {
  await rejects(as('authenticated', U2, (q) => q('insert into public.cloud_saves (payload) values ($1::jsonb)', [save(3)])), /duplicate key|unique/i, 'second row for the same user');
});
await test('anonymous (signed-out) role: no access at all', async () => {
  await rejects(as('anon', null, (q) => q('select * from public.cloud_saves')), /permission denied/i, 'anon select');
  await rejects(as('anon', null, (q) => q('insert into public.cloud_saves (payload) values ($1::jsonb)', [save(9)])), /permission denied/i, 'anon insert');
});
await test('delete is not allowed for signed-in users (no delete grant, no policy)', async () => {
  await rejects(as('authenticated', U1, (q) => q('delete from public.cloud_saves')), /permission denied/i);
  eq((await db.query('select count(*)::int as n from public.cloud_saves')).rows[0].n, 2);
});
await test('compare-and-set: update where revision = 1 succeeds and the TRIGGER sets revision 2 (client-sent value ignored)', async () => {
  const r = await as('authenticated', U1, (q) => q('update public.cloud_saves set payload = $1::jsonb, revision = 500 where revision = 1 returning revision, payload', [save(10)]));
  eq(r.rows.length, 1); eq(Number(r.rows[0].revision), 2); eq(r.rows[0].payload.money, 10);
});
await test('replay / stale writer: update where revision = 1 again matches ZERO rows (that is the conflict signal)', async () => {
  const r = await as('authenticated', U1, (q) => q('update public.cloud_saves set payload = $1::jsonb where revision = 1 returning *', [save(11)])); eq(r.rows.length, 0);
  eq((await db.query('select payload from public.cloud_saves where user_id = $1', [U1])).rows[0].payload.money, 10, 'stale write did not land');
});
await test('the owner cannot be changed by an update; updated_at moves forward', async () => {
  const before = (await db.query('select updated_at from public.cloud_saves where user_id = $1', [U1])).rows[0].updated_at;
  await sleepMs(20);
  const r = await as('authenticated', U1, (q) => q('update public.cloud_saves set user_id = $1, payload = $2::jsonb where revision = 2 returning user_id, revision, updated_at', [U2, save(12)]));
  eq([r.rows[0].user_id, Number(r.rows[0].revision)], [U1, 3]); ok(new Date(r.rows[0].updated_at) > new Date(before), 'updated_at is set by the server');
});
await test('payload must be a JSON object', async () => {
  await rejects(as('authenticated', U1, (q) => q("update public.cloud_saves set payload = '[1]'::jsonb where revision = 3")), /check constraint|payload_is_object/i);
});
await test('sequential revisions never skip or repeat', async () => {
  for (let n = 3; n < 8; n++) { const r = await as('authenticated', U1, (q) => q('update public.cloud_saves set payload = $1::jsonb where revision = $2 returning revision', [save(n), n])); eq(Number(r.rows[0].revision), n + 1); }
});
function sleepMs(ms) { return new Promise((r) => setTimeout(r, ms)); }

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
