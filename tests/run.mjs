// TAP Protocol - automated tests. Run with: npm test
// Covers rules, storage (fake IndexedDB), the real UI modules driven through jsdom (including a simulated refresh),
// and a scan for emoji characters. It does NOT test real browser rendering or layout.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const failures = [];
function test(name, fn) { return Promise.resolve().then(fn).then(() => { passed++; console.log(`PASS  ${name}`); }).catch((e) => { failed++; failures.push(name); console.log(`FAIL  ${name}\n      ${e.message}`); }); }
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'not equal'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

const R = await import('../js/rules.js');
const D = await import('../js/data.js');
const S = await import('../js/storage.js');

const base = { name: 'Pithe', age: 24, appearance: 'Tall, tired eyes.', background: 'scholar', trait: 'curious', seed: 42 };
const fresh = (o = {}) => R.createCharacter({ ...base, ...o }).state;
const act = (s, kind, extra) => R.execute(s, { kind, ...extra });
const doAct = (s, id) => act(s, 'activity', { id });

// ------------------------------------------------------------------ rules
console.log('\n== Rules ==');
await test('character creation validates input', () => {
  ok(!R.createCharacter({ ...base, name: '' }).ok, 'empty name accepted');
  ok(!R.createCharacter({ ...base, age: 5 }).ok, 'age 5 accepted');
  ok(!R.createCharacter({ ...base, background: 'x' }).ok, 'bad background accepted');
  ok(R.createCharacter(base).ok, 'valid input rejected');
});
await test('background sets attributes (base 3 plus 6 bonus points) and starts hardcore', () => {
  for (const bg of D.BACKGROUNDS) {
    const s = fresh({ background: bg.id });
    const total = Object.values(s.character.attributes).reduce((a, b) => a + b, 0);
    eq(total, 12 * 3 + 6, `${bg.id} attribute total`);
    eq(s.character.difficulty, 'hardcore');
    ok(Object.values(s.character.attributes).every((v) => v >= 1 && v <= 10), 'attribute out of range');
  }
});
await test('12 attributes, skills separate from attributes', () => {
  eq(D.ATTRIBUTES.length, 12);
  ok(D.SKILLS.length >= 6);
  ok(D.SKILLS.every((k) => D.ATTRIBUTES.some((a) => a.id === k.attr)));
});
await test('study advances time, spends energy, gives EXP and skill EXP (preview matches execute)', () => {
  const s = fresh();
  const p = R.preview(s, { kind: 'activity', id: 'study' });
  ok(p.ok, 'preview failed');
  eq(p.minutes, 120);
  const t0 = s.clock, e0 = s.needs.energy;
  const r = doAct(s, 'study');
  ok(r.ok, r.error);
  eq(s.clock - t0, 120, 'time');
  eq(s.needs.energy, e0 - 14, 'energy');
  ok(s.character.exp > 0 && s.character.skills.research.exp > 0, 'no progression');
  ok(r.changes.some((c) => c.startsWith('Research EXP +')), 'report lacks skill change');
  ok(p.changes.some((c) => c.startsWith('Research EXP +')), 'preview lacks skill change');
});
await test('repeating the same action has diminishing returns, then none', () => {
  const s = fresh();
  s.needs.energy = 100;
  const gains = [];
  for (let i = 0; i < 5; i++) {
    const before = s.character.skills.research.level * 100 + s.character.skills.research.exp;
    s.needs.energy = 100; s.needs.satiety = 100;
    const r = doAct(s, 'study');
    ok(r.ok, r.error);
    gains.push(r.changes.find((c) => c.startsWith('Research EXP')) || 'none');
    void before;
  }
  ok(gains[0].includes('+9') || gains[0].includes('+10'), `first gain ${gains[0]} (home study 70 percent of 14)`);
  ok(gains[2] !== gains[0], 'third not reduced');
  eq(gains[4], 'none', 'fifth should give nothing');
});
await test('actions are blocked with reasons (closed library, no energy, no money)', () => {
  const s = fresh();
  s.location = 'library';
  s.clock = 5 * 60; // 12:00 on Monday is clock 300
  s.clock = 300 + 600; // 22:00
  ok(!R.execute(s, { kind: 'activity', id: 'study' }).ok, 'studied in a closed library');
  const t = fresh(); t.needs.energy = 5;
  ok(!R.execute(t, { kind: 'activity', id: 'study' }).ok, 'studied with 5 energy');
  const u = fresh(); u.location = 'cafe'; u.clock = 180; u.money = 3;
  ok(!R.execute(u, { kind: 'activity', id: 'eat_meal' }).ok, 'bought a meal with 3 money');
});
await test('movement advances time and costs energy; NPC schedules follow the clock', () => {
  const s = fresh();
  eq(R.npcLocation('dani', s.clock), null, 'Dani at 07:00');
  eq(R.npcLocation('teo', s.clock), 'market', 'Teo at 07:00');
  const e0 = s.needs.energy;
  const r = act(s, 'travel', { to: 'market' });
  ok(r.ok, r.error);
  eq(s.location, 'market'); eq(s.clock, 15); ok(s.needs.energy < e0);
  eq(R.npcLocation('mira', 9 * 60), 'library', 'Mira at 16:00 is in');
  eq(R.npcLocation('mira', 10 * 60), null, 'Mira at 17:00 is out');
});
await test('shop: buy and sell change money and inventory; prices drop on Lantern Night', () => {
  const s = fresh(); s.location = 'market';
  const m0 = s.money;
  ok(act(s, 'buy', { item: 'notebook' }).ok);
  eq(s.inventory.notebook, 1); eq(s.money, m0 - 15);
  ok(act(s, 'sell', { item: 'notebook' }).ok);
  ok(!s.inventory.notebook); eq(s.money, m0 - 15 + 7);
  s.clock = 5 * 1440 + (18 - 7) * 60; // Saturday 18:00
  ok(R.isLanternNight(s.clock), 'not lantern night');
  ok(R.priceOf(s, 'bread') < D.ITEMS.bread.price || D.ITEMS.bread.price * 0.85 < 3.5, 'no discount');
  eq(R.priceOf(s, 'notebook'), 13);
});
await test('consumables change needs; Bitter Tonic trades satiety for energy', () => {
  const s = fresh({ background: 'drifter' });
  s.needs.satiety = 40; eq(s.inventory.bread, 2);
  ok(act(s, 'use', { item: 'bread' }).ok);
  ok(s.needs.satiety > 40 && s.inventory.bread === 1);
  s.inventory.tonic = 1; s.needs.energy = 30; const sat = s.needs.satiety;
  ok(act(s, 'use', { item: 'tonic' }).ok);
  ok(s.needs.energy >= 59 && s.needs.satiety < sat);
});
await test('hardcore: warnings appear before costly actions', () => {
  const s = fresh(); s.needs.energy = 30;
  const p = R.preview(s, { kind: 'activity', id: 'study' });
  ok(p.ok && p.warnings.some((w) => w.includes('Energy would fall')), 'no energy warning');
  const t = fresh(); t.needs.satiety = 21;
  const q = R.preview(t, { kind: 'activity', id: 'sleep' });
  ok(q.warnings.some((w) => w.includes('Satiety')), 'no satiety warning for long sleep');
  const calm = R.preview(fresh(), { kind: 'activity', id: 'rest' });
  eq(calm.warnings.length, 0, 'unneeded warning');
});
await test('hardcore: exhaustion halves gains; starvation costs health; collapse does not end the game', () => {
  const s = fresh(); s.needs.energy = 20;
  doAct(s, 'write'); // 12 energy cost leaves 8, but reward computed on pre-action energy 20 (not exhausted)
  const t = fresh(); t.needs.energy = 19;
  const r = doAct(t, 'write');
  ok(r.notes.some((n) => n.includes('Exhaustion')), 'no exhaustion note');
  const u = fresh(); u.needs.satiety = 0; u.needs.health = 3;
  const money0 = u.money = 100;
  const c = doAct(u, 'sleep');
  ok(c.ok, c.error);
  eq(u.stats.collapses, 1, 'collapses'); eq(u.location, 'home');
  ok(u.money === money0 - 25, `money after collapse ${u.money}`);
  ok(u.needs.health > 0, 'still dead'); ok(R.isValidState(JSON.parse(JSON.stringify(u))), 'state invalid after collapse');
});
await test('dialogue: NPC topics change state; one-time rewards cannot be farmed', () => {
  const s = fresh(); s.location = 'market';
  ok(act(s, 'talk', { npc: 'teo', topic: 'intro' }).ok);
  eq(s.relations.teo, 5);
  const again = act(s, 'talk', { npc: 'teo', topic: 'intro' });
  ok(!again.ok, 'intro repeatable'); eq(s.relations.teo, 5);
  ok(!act(s, 'talk', { npc: 'mira', topic: 'intro' }).ok, 'talked to absent NPC');
});
await test('QUEST (success path): full flow with real state changes', () => {
  const s = fresh();
  ok(act(s, 'travel', { to: 'market' }).ok);
  ok(act(s, 'buy', { item: 'notebook' }).ok);
  ok(act(s, 'talk', { npc: 'teo', topic: 'regulars' }).ok);
  const q = s.quests.menu;
  ok(q.objectives.notebook && q.objectives.insight && !q.objectives.accept, 'objective flags');
  ok(doAct(s, 'explore').ok); ok(doAct(s, 'explore').ok);
  ok(doAct(s, 'rest').ok); // waits for the cafe to open
  ok(act(s, 'travel', { to: 'cafe' }).ok);
  ok(!act(s, 'talk', { npc: 'dani', topic: 'accept' }).ok, 'accepted before offer');
  ok(act(s, 'talk', { npc: 'dani', topic: 'job' }).ok);
  eq(q.status, 'available'); ok(q.offered);
  ok(act(s, 'talk', { npc: 'dani', topic: 'accept' }).ok);
  eq(q.status, 'active'); ok(q.deadline > s.clock);
  const dd = act(s, 'talk', { npc: 'dani', topic: 'deliver' });
  ok(!dd.ok && dd.error.includes('Not ready'), 'delivered early');
  for (let i = 0; i < 3; i++) { s.needs.energy = Math.max(s.needs.energy, 60); ok(doAct(s, 'write').ok); }
  eq(q.drafts, 3); ok(q.objectives.drafts);
  const money0 = s.money, exp0 = s.character.exp + s.character.level * 1000, mgmt0 = s.character.attributes.management;
  const done = act(s, 'talk', { npc: 'dani', topic: 'deliver' });
  ok(done.ok, done.error);
  eq(q.status, 'completed'); ok(q.objectives.deliver);
  ok(s.money >= money0 + 60, 'no payment');
  ok(s.character.exp + s.character.level * 1000 > exp0, 'no EXP');
  eq(s.character.attributes.management, mgmt0 + 1, 'milestone attribute');
  ok(s.relations.dani >= 15);
  const round = JSON.parse(JSON.stringify(s));
  eq(round.quests.menu.status, 'completed', 'status lost in serialization');
});
await test('QUEST (failure path): missing the deadline fails the quest, world continues', () => {
  const s = fresh(); s.location = 'cafe'; s.clock = 3 * 60;
  ok(act(s, 'talk', { npc: 'dani', topic: 'job' }).ok); ok(act(s, 'talk', { npc: 'dani', topic: 'accept' }).ok);
  const q = s.quests.menu;
  s.clock = q.deadline - 20; // simulate three days passing without delivering
  const w = R.preview(s, { kind: 'activity', id: 'rest' });
  ok(w.warnings.some((x) => x.includes('deadline')), 'no deadline warning');
  ok(doAct(s, 'rest').ok);
  eq(q.status, 'failed'); eq(q.outcome, 'late'); ok(s.relations.dani < 0, 'no consequence');
  ok(!act(s, 'talk', { npc: 'dani', topic: 'deliver' }).ok, 'delivered after failure');
  ok(doAct(s, 'rest').ok, 'world should stay playable after failure');
});
await test('journal: manual entries are dated; in-world reward only once per day; real entries never reward', () => {
  const s = fresh();
  const r = act(s, 'journal', { type: 'rpg', title: 'Day one', text: 'Arrived.', now: new Date(2026, 9, 11, 9, 30) });
  ok(r.ok && s.journal.length === 1); eq(s.journal[0].realDate, '2026-10-11'); ok(s.journal[0].gameTime.includes('2030'));
  const exp1 = s.character.exp; ok(exp1 > 0);
  act(s, 'journal', { type: 'rpg', text: 'More.' }); eq(s.character.exp, exp1, 'second entry rewarded');
  act(s, 'journal', { type: 'real', text: 'Real thoughts.' }); eq(s.character.exp, exp1); eq(s.journal.length, 3);
  ok(!act(s, 'journal', { type: 'rpg', text: '   ' }).ok, 'blank accepted');
});
await test('tracker: creating is not completing; real-life stays separate unless integration is on', () => {
  const s = fresh();
  const g = R.addGoal(s, { name: 'Walk 20 minutes', kind: 'habit', cadence: 'daily', rpgLink: true, linkedSkill: 'fitness' }, '2026-10-11').goal;
  eq(g.completions.length, 0); eq(R.trackerStats(g, '2026-10-11').total, 0);
  const exp0 = s.character.exp;
  const a = R.recordCompletion(s, g.id, '2026-10-11');
  ok(a.ok); eq(g.completions.length, 1); eq(s.character.exp, exp0, 'reward given with integration off');
  ok(!R.recordCompletion(s, g.id, '2026-10-11').ok, 'duplicate completion same day');
  R.recordCompletion(s, g.id, '2026-10-12'); eq(R.trackerStats(g, '2026-10-12').streak, 2);
  s.settings.integration = true;
  const b = R.recordCompletion(s, g.id, '2026-10-13');
  ok(b.ok && b.report && s.character.exp > exp0, 'no reward with integration on and goal linked');
  const unlinked = R.addGoal(s, { name: 'Read', kind: 'habit', cadence: 'daily' }, '2026-10-13').goal;
  const e1 = s.character.exp; R.recordCompletion(s, unlinked.id, '2026-10-13'); eq(s.character.exp, e1, 'unlinked goal rewarded');
  const many = [1, 2, 3, 4].map((i) => R.addGoal(s, { name: 'G' + i, kind: 'habit', cadence: 'daily', rpgLink: true }, '2026-10-20').goal);
  const rewarded = many.map((m) => !!R.recordCompletion(s, m.id, '2026-10-20').report);
  eq(rewarded.filter(Boolean).length, 3, 'daily cap of 3 rewards');
  const fin = R.addGoal(s, { name: 'Ship it', kind: 'goal', target: 2 }, '2026-10-20').goal;
  R.recordCompletion(s, fin.id, '2026-10-20'); const f2 = R.recordCompletion(s, fin.id, '2026-10-21');
  ok(f2.finished && fin.completedDate === '2026-10-21'); ok(!R.recordCompletion(s, fin.id, '2026-10-22').ok);
});
await test('skill level-ups feed attribute training; attributes cap at 10', () => {
  const s = fresh();
  const a0 = s.character.attributes.intelligence;
  for (let i = 0; i < 60; i++) { s.needs.energy = 100; s.needs.satiety = 100; s.daily.counts = {}; s.location = 'library'; s.clock = 1440 * i + 600 - 0; s.clock = 1440 * i + 180; doAct(s, 'study'); }
  ok(s.character.skills.research.level > 1, 'skill did not level');
  ok(s.character.attributes.intelligence > a0, 'attribute did not rise');
  ok(s.character.attributes.intelligence <= 10);
});

// ------------------------------------------------------------------ storage
await test('REGRESSION: every route between every pair of locations has a real travel time and cost (cafe routes were NaN)', () => {
  const ids = Object.keys(D.LOCATIONS);
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    ok(Number.isFinite(D.travelMinutes(a, b)) && D.travelMinutes(a, b) > 0, `no travel time for ${a} to ${b}`);
    eq(D.travelMinutes(a, b), D.travelMinutes(b, a), `asymmetric ${a}/${b}`);
  }
  const s = fresh(); s.clock = 10 * 60; s.needs.energy = 90;
  const t0 = s.clock;
  ok(act(s, 'travel', { to: 'cafe' }).ok);
  eq(s.clock - t0, 10, 'travel to cafe must take 10 minutes');
  eq(s.needs.energy, 89, 'travel to cafe must cost 1 energy');
  ok(Number.isFinite(s.needs.energy) && Number.isFinite(s.clock), 'state contains NaN');
  ok(act(s, 'travel', { to: 'library' }).ok); ok(act(s, 'travel', { to: 'market' }).ok); ok(act(s, 'travel', { to: 'cafe' }).ok);
  ok(Object.values(s.needs).every(Number.isFinite), 'needs contain NaN after several trips');
});
await test('REGRESSION: loading a save damaged by the cafe bug (Energy null) repairs it instead of showing exhaustion', () => {
  const s = JSON.parse(JSON.stringify(fresh()));
  s.needs.energy = null;
  const m = R.migrateState(s);
  ok(Number.isFinite(m.needs.energy), 'energy not repaired');
  eq(m.needs.satiety, 80, 'healthy needs must be left alone');
});

console.log('\n== Storage (fake IndexedDB) ==');
await test('save then load round-trips the full state', async () => {
  const s = fresh(); doAct(s, 'study'); act(s, 'journal', { type: 'rpg', text: 'saved' });
  const r = await S.saveGame(s); ok(r.ok, r.error);
  const l = await S.loadGame();
  ok(l.state, 'nothing loaded'); eq(JSON.stringify(l.state), JSON.stringify(R.migrateState(JSON.parse(JSON.stringify(s)))));
  eq(S.info.mode, 'indexeddb');
});
await test('corrupted main save falls back to the previous backup', async () => {
  const a = fresh({ name: 'First' }); await S.saveGame(a);
  const b = fresh({ name: 'Second' }); await S.saveGame(b);
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('tap-protocol', 1);
    req.onsuccess = () => {
      const db = req.result; const tx = db.transaction('saves', 'readwrite'); const st = tx.objectStore('saves');
      const g = st.get('main');
      g.onsuccess = () => { st.put({ ...g.result, payload: g.result.payload.replace('Second', 'Broken') }); };
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    };
  });
  const l = await S.loadGame();
  ok(l.recovered, 'not flagged as recovered'); eq(l.state.character.name, 'First');
});
await test('import rejects invalid saves and accepts exports', () => {
  ok(!S.parseImport('not json').ok); ok(!S.parseImport('{"a":1}').ok);
  const s = fresh(); const r = S.parseImport(S.exportJson(s)); ok(r.ok); eq(r.state.character.name, 'Pithe');
});

// ------------------------------------------------------------------ UI through jsdom, with a simulated refresh
console.log('\n== UI flow (jsdom, real ui.js and main.js) ==');
globalThis.__TAP_NO_AUTOBOOT__ = true;
await S.clearGame(); // start the UI section from a clean browser profile
function makeDom() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost:8080/', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {};
  globalThis.window = w; globalThis.document = w.document; globalThis.FormData = w.FormData;
  globalThis.location = w.location; globalThis.history = w.history;   // main.js reads location/history (cloud sync redirect + auth fragment)
  return dom;
}
const tick = () => new Promise((r) => setTimeout(r, 5));
let dom, root, app, bootMod = 0;
async function boot() {
  dom = makeDom(); root = document.getElementById('root');
  const mod = await import(`../js/main.js?run=${++bootMod}`);
  app = await mod.boot(root);
  return app;
}
const $ = (sel) => root.querySelector(sel);
const text = () => root.textContent;
async function click(sel) {
  const el = $(sel); ok(el, `missing element ${sel}`); ok(!el.disabled, `disabled element ${sel}`);
  el.dispatchEvent(new dom.window.Event('click', { bubbles: true, cancelable: true }));
  if ($('[data-action="confirm"]')) $('[data-action="confirm"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await app.settle(); await tick();
}
async function submit(formSel, values = {}) {
  const f = $(formSel); ok(f, `missing form ${formSel}`);
  for (const [k, v] of Object.entries(values)) {
    const el = f.querySelector(`[name="${k}"]`);
    if (el.type === 'radio') f.querySelector(`[name="${k}"][value="${v}"]`).checked = true;
    else if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  }
  f.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await app.settle(); await tick();
}
const nav = (v) => click(`[data-action="nav"][data-view="${v}"]`);
const doIt = (sel) => click(`[data-action="do"]${sel}`);
const activity = (id) => doIt(`[data-kind="activity"][data-id="${id}"]`);
const say = (npc, topic) => doIt(`[data-kind="talk"][data-npc="${npc}"][data-topic="${topic}"]`);

await test('first launch shows character creation; invalid input shows errors', async () => {
  await boot();
  ok(text().includes('TAP Protocol') && $('form[data-form="create"]'), 'no setup screen');
  await submit('form[data-form="create"]', { name: '' });
  ok(text().includes('Enter a character name'), 'no validation message');
  ok(app.state === null);
});
await test('create Pithe, enter the world, and every view renders', async () => {
  await submit('form[data-form="create"]', { name: 'Pithe', age: '24', appearance: 'Tall.', background: 'scholar', trait: 'curious' });
  ok(app.state && app.state.character.name === 'Pithe', 'character not created');
  ok(text().includes('Arrival') && text().includes('Rented Room'), 'dashboard missing');
  for (const v of ['character', 'journal', 'tracker', 'world', 'quests', 'inventory', 'dashboard']) { await nav(v); ok($('.viewtitle').textContent.length > 0, `view ${v} empty`); }
});
await test('perform an activity from the UI and see the actual results', async () => {
  const t0 = app.state.clock;
  await activity('study');
  ok(app.state.clock === t0 + 120, 'time did not advance'); ok(text().includes('Research EXP'), 'results not shown');
  ok($('#save-status').textContent.includes('Saved'), 'save status');
});
await test('drive the whole sample quest through the UI', async () => {
  await doIt('[data-kind="travel"][data-to="market"]');
  eq(app.state.location, 'market');
  await nav('inventory'); await click('[data-action="do"][data-kind="buy"][data-item="notebook"]');
  ok(app.state.inventory.notebook === 1, 'notebook not bought');
  await nav('world'); await click('[data-action="open-talk"][data-npc="teo"]');
  await say('teo', 'intro'); await say('teo', 'regulars'); ok(app.state.flags.heardRegulars);
  await nav('dashboard'); await activity('explore'); await activity('explore'); await activity('rest');
  await doIt('[data-kind="travel"][data-to="cafe"]');
  eq(app.state.location, 'cafe'); ok(R.hourOf(app.state.clock) >= 10, 'cafe still closed');
  await nav('world'); await click('[data-action="open-talk"][data-npc="dani"]');
  await say('dani', 'job'); await say('dani', 'accept');
  eq(app.state.quests.menu.status, 'active');
  await nav('dashboard');
  for (let i = 0; i < 3; i++) { app.state.needs.energy = Math.max(app.state.needs.energy, 60); await activity('write'); }
  eq(app.state.quests.menu.drafts, 3);
  await nav('world'); await click('[data-action="open-talk"][data-npc="dani"]'); await say('dani', 'deliver');
  eq(app.state.quests.menu.status, 'completed');
  await nav('quests'); ok(text().includes('Completed'), 'quest page does not show completion');
  ok(app.state.money > 0 && app.state.relations.dani >= 15);
});
await test('hardcore warning modal appears before a costly action and can be cancelled', async () => {
  app.state.needs.energy = 30; app.state.location = 'home'; app.state.clock = 1440 * 3 + 120; app.render();
  await nav('dashboard');
  $('[data-action="do"][data-kind="activity"][data-id="exercise"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  ok($('.modal') && text().includes('Warning'), 'no warning modal');
  const t0 = app.state.clock;
  $('[data-action="cancel"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  ok(!$('.modal') && app.state.clock === t0, 'cancel changed state');
  app.state.needs.energy = 90; app.render();
});
await test('journal entry and tracker goal through the UI', async () => {
  await nav('journal');
  await submit('form[data-form="journal"]', { type: 'real', title: 'Test', text: 'A real reflection.' });
  ok(text().includes('A real reflection.') && app.state.journal.length === 1);
  await submit('form[data-form="journal"]', { type: 'rpg', title: 'Pithe notes', text: 'The cafe is warm.' });
  eq(app.state.journal.length, 2);
  await nav('tracker');
  await submit('form[data-form="goal"]', { name: 'Stretch', kind: 'habit', cadence: 'daily', target: '10' });
  eq(app.state.tracker.goals.length, 1); eq(app.state.tracker.goals[0].completions.length, 0, 'creating counted as completing');
  await submit('form[data-form="record"]', { note: 'did it' });
  eq(app.state.tracker.goals[0].completions.length, 1); ok(text().includes('Done today'));
});
const before = JSON.stringify(app.state);
await test('REFRESH: reload the app and verify everything persisted', async () => {
  await app.settle(); await tick();
  await boot();
  ok(app.state, 'no save found after refresh');
  eq(JSON.stringify(app.state), JSON.stringify(R.migrateState(JSON.parse(before))), 'saved state differs from state before refresh');
  eq(app.state.quests.menu.status, 'completed', 'quest status lost');
  eq(app.state.journal.length, 2, 'journal lost'); eq(app.state.tracker.goals[0].completions.length, 1, 'tracker lost');
  ok(app.state.inventory.notebook === 1, 'inventory lost');
  await nav('quests'); ok(text().includes('Completed'), 'quest not shown completed after refresh');
  await nav('journal'); ok(text().includes('A real reflection.'));
  await nav('tracker'); ok(text().includes('Stretch'));
});

await test('CLOUD APPLY GUARD (real ui.js): a cloud save is not applied if the player acted meanwhile; a clean apply works and is saved locally', async () => {
  await app.settle();
  const mine = app.state, snapshotBefore = JSON.stringify(mine);
  const other = JSON.parse(JSON.stringify(mine)); other.money += 1000; other.character.name = 'FromCloud';
  let err = null; try { await app.applyRemote(other, () => false); } catch (e) { err = e; }
  ok(err && err.code === 'LOCAL_CHANGED', 'guard failure must reject with LOCAL_CHANGED');
  ok(app.state === mine && JSON.stringify(app.state) === snapshotBefore, 'state must be untouched when the guard fails');
  const stored = (await S.loadGame()).state; ok(stored && stored.character.name !== 'FromCloud', 'nothing from the cloud may be written to the local save');
  // guard turns false only AFTER the write started (the player tapped during the write): in-memory state must still be kept
  let calls = 0; err = null; try { await app.applyRemote(other, () => ++calls < 2); } catch (e) { err = e; }
  ok(err && err.code === 'LOCAL_CHANGED' && app.state === mine, 'a tap during the write must not be replaced');
  await app.applyRemote(other, () => true);
  eq(app.state.character.name, 'FromCloud'); eq((await S.loadGame()).state.character.name, 'FromCloud', 'applied save is stored on this device');
  app.state = mine; await app.persist();   // put the test profile back
});

// ------------------------------------------------------------------ PWA (static checks)
console.log('\n== PWA files (static) ==');
const { readPrecache, computeVersion, stampedVersion } = await import('../tools/stamp-version.mjs');
const pngSize = (f) => { const b = fs.readFileSync(f); ok(b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${f} is not a PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
await test('manifest: valid JSON with the required install fields and real icon files of the declared size', () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons']) ok(m[k], `manifest.${k} missing`);
  eq(m.display, 'standalone'); ok(m.short_name.length <= 12, 'short_name too long');
  ok(/^#[0-9a-f]{6}$/i.test(m.theme_color) && /^#[0-9a-f]{6}$/i.test(m.background_color), 'colors must be hex');
  ok(fs.existsSync(path.join(ROOT, m.start_url === './' ? 'index.html' : m.start_url)), 'start_url target missing');
  const purposes = new Set();
  for (const i of m.icons) {
    const f = path.join(ROOT, i.src); ok(fs.existsSync(f), `icon missing: ${i.src}`);
    const [w, h] = pngSize(f); eq(`${w}x${h}`, i.sizes, `${i.src} real size`); purposes.add(i.purpose);
  }
  ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'), 'need 192 and 512 icons');
  ok(purposes.has('maskable') && purposes.has('any'), 'need an any icon and a maskable icon');
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(idx.includes('rel="manifest" href="manifest.webmanifest"'), 'index.html does not link the manifest');
  ok(idx.includes('rel="apple-touch-icon"'), 'no apple-touch-icon');
  eq(pngSize(path.join(ROOT, 'icons/apple-touch-icon.png')).join('x'), '180x180');
});
await test('service worker: precache list matches the real runtime files exactly (nothing invented, nothing missing)', () => {
  const list = readPrecache(ROOT);
  eq(new Set(list).size, list.length, 'duplicate precache entries');
  for (const p of list) ok(fs.existsSync(path.join(ROOT, p === './' ? 'index.html' : p)), `precache entry missing on disk: ${p}`);
  const runtime = ['index.html', 'manifest.webmanifest'];
  for (const d of ['css', 'js', 'icons']) for (const f of fs.readdirSync(path.join(ROOT, d))) runtime.push(`${d}/${f}`);
  const missing = runtime.filter((r) => !list.includes(r));
  ok(!missing.length, `runtime files not precached: ${missing.join(', ')}`);
  ok(list.includes('./'), 'start URL "./" not precached');
  // every local file the page or the modules reference must be in the list
  const refs = new Set();
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of idx.matchAll(/(?:href|src)="([^"#]+)"/g)) refs.add(m[1]);
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) for (const m of fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').matchAll(/from '\.\/([^']+)'/g)) refs.add('js/' + m[1]);
  for (const r of refs) ok(list.includes(r), `referenced file not precached: ${r}`);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  ok(!/https?:\/\//.test(sw.replace(/\/\/.*$/gm, '')), 'service worker must not reference remote URLs');
});
await test('service worker: CACHE_VERSION is current (hash of the precached files), so a changed file cannot ship under an old cache', () => {
  eq(stampedVersion(ROOT), computeVersion(ROOT), 'stale sw.js version; run: npm run stamp');
});
await test('app code makes no remote requests (no quoted or url() http(s) references in html, css, js)', () => {
  const files = ['index.html', 'css/style.css', ...fs.readdirSync(path.join(ROOT, 'js')).map((f) => 'js/' + f)];
  for (const f of files) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\/ .*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (f === 'js/config.js') continue;   // checked separately below: it may hold exactly one Supabase project URL
    ok(!/['"(]https?:\/\//.test(t), `remote URL reference in ${f}`);
  }
});
await test('config.js: only a Supabase project URL and a Publishable key (never a Secret / service_role key)', () => {
  const t = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8').replace(/\/\/ .*$/gm, '');
  const urls = [...t.matchAll(/https?:\/\/[^'"\s]+/g)].map((m) => m[0]);
  ok(urls.length <= 1 && urls.every((u) => /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(u)), 'config.js must contain at most one https://<ref>.supabase.co URL, got ' + JSON.stringify(urls));
  ok(!/sb_secret_|service_role/i.test(t), 'secret key text in config.js');
  const key = (t.match(/SUPABASE_KEY\s*=\s*'([^']*)'/) || [])[1] || '';
  ok(key === '' || /^sb_publishable_[A-Za-z0-9_-]+$/.test(key), 'SUPABASE_KEY must be empty or an sb_publishable_ key');
});

// ------------------------------------------------------------------ emoji scan
console.log('\n== Emoji scan ==');
await test('no emoji characters anywhere in the project (text files, file names, and PNG metadata)', () => {
  const files = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name === '.git') continue;
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p); else if (!/package-lock\.json$/.test(f.name)) files.push(p);
    }
  })(ROOT);
  const emoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f|\u20e3/u;
  const bad = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    if (emoji.test(rel) || /[^\x00-\x7f]/.test(rel)) bad.push(`${rel} (file name)`);
    if (/\.png$/.test(f)) {
      // binary: check the signature and that no text metadata chunk (tEXt, iTXt, zTXt) can carry hidden text
      const b = fs.readFileSync(f); let o = 8;
      if (!b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) bad.push(`${rel} (not a PNG)`);
      while (o + 8 <= b.length) { const len = b.readUInt32BE(o), type = b.toString('latin1', o + 4, o + 8); if (/^[ziz]?TXt$|^tEXt$|^iTXt$|^zTXt$/.test(type)) bad.push(`${rel} (text chunk ${type})`); o += 12 + len; }
      continue;
    }
    const t = fs.readFileSync(f, 'utf8');
    if (emoji.test(t)) bad.push(`${rel} (emoji)`);
    else if (/[^\x00-\x7f]/.test(t)) bad.push(`${rel} (non-ASCII)`);
  }
  ok(!bad.length, bad.join(', '));
  ok(files.length > 20, 'scan found too few files');
});

console.log(`\n${passed} passed, ${failed} failed${failed ? `\nFailed: ${failures.join('; ')}` : ''}`);
process.exit(failed ? 1 : 0);
