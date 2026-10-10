// TAP Protocol - game rules. Pure logic: no DOM, no storage. State is a plain JSON-safe object.
import * as D from './data.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Per-call scratch values. Reset at the start of each execute().
let NOTES = [];
let PREVIEW = false;

// ---------------------------------------------------------------- progression formulas
export const expNeed = (level) => 60 + 40 * (level - 1);
export const skillNeed = (level) => 20 + 10 * level;
const diminish = (n) => (n < 2 ? 1 : n < 4 ? 0.5 : 0);

// ---------------------------------------------------------------- time
export function clockDate(clock) { return new Date(D.START_UTC + clock * 60000); }
export function dayKey(clock) { return clockDate(clock).toISOString().slice(0, 10); }
export function hourOf(clock) { const d = clockDate(clock); return d.getUTCHours() + d.getUTCMinutes() / 60; }
export function weekdayOf(clock) { return clockDate(clock).getUTCDay(); }
export function formatClock(clock) {
  const d = clockDate(clock);
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function formatTimeOnly(clock) { const d = clockDate(clock); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; }
export function formatDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}h ${pad(m)}m`;
  return h ? `${h}h` : `${m}m`;
}
export function periodOf(clock) {
  const h = hourOf(clock);
  if (h < 5) return 'Deep night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}
export function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const back = (d.getUTCDay() + 6) % 7; // Monday start
  return addDays(dateStr, -back);
}

// ---------------------------------------------------------------- random (seeded, stored in state)
function rand(state) {
  state.rng = (state.rng + 0x6D2B79F5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- state creation and migration
export function createCharacter(o = {}) {
  const errors = [];
  const name = String(o.name ?? '').trim();
  if (!name) errors.push('Enter a character name.');
  else if (name.length > 30) errors.push('The name must be 30 characters or fewer.');
  const age = Number(o.age);
  if (!Number.isInteger(age) || age < 16 || age > 99) errors.push('Age must be a whole number from 16 to 99.');
  const appearance = String(o.appearance ?? '').trim();
  if (appearance.length > 400) errors.push('Appearance must be 400 characters or fewer.');
  const bg = D.BACKGROUNDS.find((b) => b.id === o.background);
  if (!bg) errors.push('Choose a background.');
  const trait = D.TRAITS.find((t) => t.id === o.trait);
  if (!trait) errors.push('Choose a personality trait.');
  if (errors.length) return { ok: false, errors };

  const attributes = {};
  const attrProgress = {};
  for (const a of D.ATTRIBUTES) { attributes[a.id] = 3 + (bg.attrs[a.id] || 0); attrProgress[a.id] = 0; }
  const skills = {};
  for (const s of D.SKILLS) skills[s.id] = { level: bg.skills[s.id] || 0, exp: 0 };

  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 4294967296);
  const state = {
    version: D.SAVE_VERSION,
    createdAt: new Date().toISOString(),
    rng: seed >>> 0,
    clock: 0,
    location: 'home',
    character: {
      name, age, appearance, background: bg.id, trait: trait.id, difficulty: 'hardcore',
      level: 1, exp: 0, attributes, attrProgress, skills
    },
    needs: { energy: 90, satiety: 80, health: 100 },
    acc: { sat: 0, starve: 0, regen: 0, late: 0 },
    money: bg.money,
    inventory: { ...bg.items },
    relations: {},
    flags: { topics: {} },
    daily: { day: dayKey(0), counts: {} },
    quests: {
      menu: {
        status: 'available', offered: false, drafts: 0, acceptedAt: null, deadline: null, finishedAt: null, outcome: null,
        objectives: { accept: false, notebook: false, insight: false, drafts: false, deliver: false }
      }
    },
    journal: [],
    tracker: { goals: [], rewardLog: { date: '', n: 0 } },
    log: [],
    settings: { integration: !!o.integration },
    stats: { collapses: 0, actions: 0 },
    nextId: 1
  };
  return { ok: true, state, intro: bg.circumstance };
}

export function isValidState(s) {
  return !!(s && typeof s === 'object' && typeof s.version === 'number' && s.character && s.character.attributes &&
    s.character.skills && s.needs && typeof s.clock === 'number' && s.quests && s.quests.menu && s.inventory &&
    Array.isArray(s.journal) && s.tracker && Array.isArray(s.tracker.goals) && Array.isArray(s.log));
}

// Fill in anything an older save may lack. Never discards existing data.
export function migrateState(s) {
  s.settings = s.settings || { integration: false };
  s.stats = s.stats || { collapses: 0, actions: 0 };
  s.acc = Object.assign({ sat: 0, starve: 0, regen: 0, late: 0 }, s.acc);
  s.flags = s.flags || { topics: {} };
  s.flags.topics = s.flags.topics || {};
  s.relations = s.relations || {};
  s.daily = s.daily || { day: dayKey(s.clock), counts: {} };
  s.tracker.rewardLog = s.tracker.rewardLog || { date: '', n: 0 };
  s.nextId = s.nextId || (s.journal.length + s.tracker.goals.length + s.log.length + 1);
  // Repair saves written while the cafe travel bug existed: Energy became NaN, which JSON stores as null.
  for (const [k, fallback] of [['energy', 50], ['satiety', 50], ['health', 50]]) {
    if (!Number.isFinite(s.needs[k])) s.needs[k] = fallback;
  }
  s.version = D.SAVE_VERSION;
  return s;
}

function nextId(state) { return state.nextId++; }

// ---------------------------------------------------------------- bookkeeping helpers
function ensureDay(state) {
  const k = dayKey(state.clock);
  if (state.daily.day !== k) state.daily = { day: k, counts: {} };
}
function count(state, key) { return state.daily.day === dayKey(state.clock) ? (state.daily.counts[key] || 0) : 0; }
function bump(state, key) { ensureDay(state); state.daily.counts[key] = (state.daily.counts[key] || 0) + 1; }
function addItem(state, id, n = 1) { state.inventory[id] = (state.inventory[id] || 0) + n; }
function removeItem(state, id, n = 1) {
  state.inventory[id] = (state.inventory[id] || 0) - n;
  if (state.inventory[id] <= 0) delete state.inventory[id];
}
function addRel(state, npc, n) { state.relations[npc] = clamp((state.relations[npc] || 0) + n, -100, 100); }
export function relationLabel(v) { return v >= 30 ? 'Friendly' : v >= 10 ? 'Familiar' : v >= 1 ? 'Acquainted' : v < 0 ? 'Strained' : 'Stranger'; }

// ---------------------------------------------------------------- EXP, skills, attributes
function grantExp(state, n) {
  if (n <= 0) return;
  const c = state.character;
  c.exp += n;
  while (c.exp >= expNeed(c.level)) { c.exp -= expNeed(c.level); c.level++; NOTES.push(`Level up. You are now level ${c.level}.`); }
}
function grantSkillExp(state, id, n) {
  if (n <= 0) return;
  const s = state.character.skills[id];
  const def = D.SKILLS.find((x) => x.id === id);
  if (s.level >= D.MAX_SKILL) return;
  s.exp += n;
  while (s.level < D.MAX_SKILL && s.exp >= skillNeed(s.level)) {
    s.exp -= skillNeed(s.level);
    s.level++;
    NOTES.push(`${def.name} reached level ${s.level}.`);
    trainAttribute(state, def.attr);
  }
  if (s.level >= D.MAX_SKILL) s.exp = 0;
}
// A skill level-up adds 1 training point to its attribute. The attribute rises when points equal its value.
function trainAttribute(state, attrId) {
  const c = state.character;
  if (c.attributes[attrId] >= D.MAX_ATTR) return;
  c.attrProgress[attrId]++;
  if (c.attrProgress[attrId] >= c.attributes[attrId]) {
    c.attrProgress[attrId] = 0;
    c.attributes[attrId]++;
    NOTES.push(`${attrName(attrId)} increased to ${c.attributes[attrId]}.`);
  }
}
function raiseAttribute(state, attrId, n) {
  const c = state.character;
  const before = c.attributes[attrId];
  c.attributes[attrId] = Math.min(D.MAX_ATTR, before + n);
  if (c.attributes[attrId] > before) NOTES.push(`${attrName(attrId)} increased to ${c.attributes[attrId]} (milestone).`);
}
const attrName = (id) => D.ATTRIBUTES.find((a) => a.id === id).name;
const skillName = (id) => D.SKILLS.find((a) => a.id === id).name;

// ---------------------------------------------------------------- snapshot and diff (reports are derived from real state)
function cumChar(c) { let t = c.exp; for (let l = 1; l < c.level; l++) t += expNeed(l); return t; }
function cumSkill(s) { let t = s.exp; for (let l = 0; l < s.level; l++) t += skillNeed(l); return t; }
function snapshot(st) {
  const sk = {};
  for (const s of D.SKILLS) sk[s.id] = { level: st.character.skills[s.id].level, cum: cumSkill(st.character.skills[s.id]) };
  return {
    clock: st.clock, loc: st.location, level: st.character.level, cexp: cumChar(st.character),
    energy: st.needs.energy, satiety: st.needs.satiety, health: st.needs.health, money: st.money,
    skills: sk, attrs: { ...st.character.attributes }, prog: { ...st.character.attrProgress },
    inv: { ...st.inventory }, rel: { ...st.relations }
  };
}
const sign = (n) => (n > 0 ? '+' : '') + n;
function diff(a, b) {
  const out = [];
  if (b.clock !== a.clock) out.push(`Time +${formatDuration(b.clock - a.clock)} (now ${formatClock(b.clock)})`);
  if (b.loc !== a.loc) out.push(`Location: ${D.LOCATIONS[a.loc].name} to ${D.LOCATIONS[b.loc].name}`);
  for (const [k, label] of [['health', 'Health'], ['energy', 'Energy'], ['satiety', 'Satiety']]) {
    if (a[k] !== b[k]) out.push(`${label} ${a[k]} to ${b[k]} (${sign(b[k] - a[k])})`);
  }
  if (a.money !== b.money) out.push(`Money ${a.money} to ${b.money} (${sign(b.money - a.money)})`);
  if (a.cexp !== b.cexp) out.push(`EXP ${sign(b.cexp - a.cexp)}${b.level !== a.level ? `, level ${a.level} to ${b.level}` : ''}`);
  for (const s of D.SKILLS) {
    const x = a.skills[s.id], y = b.skills[s.id];
    if (x.cum !== y.cum) out.push(`${s.name} EXP ${sign(y.cum - x.cum)}${y.level !== x.level ? `, level ${x.level} to ${y.level}` : ` (level ${y.level})`}`);
  }
  for (const at of D.ATTRIBUTES) {
    if (a.attrs[at.id] !== b.attrs[at.id]) out.push(`${at.name} ${a.attrs[at.id]} to ${b.attrs[at.id]}`);
    else if (a.prog[at.id] !== b.prog[at.id]) out.push(`${at.name} training ${b.prog[at.id]}/${b.attrs[at.id]}`);
  }
  const ids = new Set([...Object.keys(a.inv), ...Object.keys(b.inv)]);
  for (const id of ids) {
    const d = (b.inv[id] || 0) - (a.inv[id] || 0);
    if (d) out.push(`${D.ITEMS[id].name} ${sign(d)} (now ${b.inv[id] || 0})`);
  }
  const npcs = new Set([...Object.keys(a.rel), ...Object.keys(b.rel)]);
  for (const n of npcs) {
    const d = (b.rel[n] || 0) - (a.rel[n] || 0);
    if (d) out.push(`${D.NPCS[n].name} trust ${sign(d)}`);
  }
  return out;
}

// ---------------------------------------------------------------- the clock and needs
// Advance in 15-minute steps so hunger, starvation, recovery and late-night drain interact correctly.
function advance(state, minutes, opts = {}) {
  const awake = opts.awake !== false;
  const collapsesBefore = state.stats.collapses;
  let left = minutes;
  while (left > 0) {
    const step = Math.min(15, left);
    left -= step;
    state.clock += step;
    const a = state.acc, n = state.needs;
    a.sat += step;
    while (a.sat >= 20) { a.sat -= 20; n.satiety = Math.max(0, n.satiety - 1); }
    if (n.satiety <= 0) {
      a.starve += step;
      while (a.starve >= 60) { a.starve -= 60; n.health -= 4; }
    } else a.starve = 0;
    if (n.satiety >= 40 && n.energy >= 30 && n.health < 100) {
      a.regen += step;
      while (a.regen >= 60) { a.regen -= 60; n.health = Math.min(100, n.health + 1); }
    } else a.regen = 0;
    if (awake && hourOf(state.clock) < 5) {
      a.late += step;
      while (a.late >= 30) { a.late -= 30; n.energy = Math.max(0, n.energy - 1); }
    }
    if (n.health <= 0) { collapse(state); break; }
  }
  ensureDay(state);
  checkDeadline(state);
  return state.stats.collapses > collapsesBefore;
}

// Hardcore consequence for health reaching zero. Never ends the game and never touches the save.
function collapse(state) {
  const loss = Math.floor(state.money * 0.25);
  state.money -= loss;
  state.clock += 12 * 60;
  state.location = 'home';
  state.needs.health = 25;
  state.needs.satiety = Math.max(state.needs.satiety, 40);
  state.needs.energy = Math.max(state.needs.energy, 30);
  state.acc.starve = 0;
  state.stats.collapses++;
  NOTES.push(`You collapsed and woke up in your room 12 hours later. A neighbour helped; it cost you ${loss} money. Health 25.`);
}

function checkDeadline(state) {
  const q = state.quests.menu;
  if (q.status === 'active' && state.clock > q.deadline) {
    q.status = 'failed'; q.outcome = 'late'; q.finishedAt = state.clock;
    addRel(state, 'dani', -10);
    NOTES.push('Quest failed: The Missing Menu. The deadline passed. Dani hired someone else.');
  }
}

// ---------------------------------------------------------------- world: schedules, events, prices
export function npcLocation(npcId, clock) {
  const wd = weekdayOf(clock), h = hourOf(clock);
  for (const s of D.NPCS[npcId].schedule) {
    if (s.days.includes(wd) && h >= s.from && h < s.to) return s.loc;
  }
  return null;
}
export function npcsHere(state) {
  return Object.keys(D.NPCS).filter((id) => npcLocation(id, state.clock) === state.location);
}
export function scheduleLabel(npcId) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return D.NPCS[npcId].schedule.map((s) => {
    const days = s.days.length === 7 ? 'Daily' : s.days.length === 6 && !s.days.includes(0) ? 'Mon-Sat' : s.days.map((d) => names[d]).join(', ');
    return `${days} ${pad(s.from)}:00-${pad(s.to)}:00 at ${D.LOCATIONS[s.loc].name}`;
  }).join('; ');
}
export function isLanternNight(clock) { return weekdayOf(clock) === 6 && hourOf(clock) >= 17 && hourOf(clock) < 22; }
export function worldEvents(state) {
  const ev = [];
  if (isLanternNight(state.clock)) ev.push('Lantern Night at the market: all stall prices are 15 percent lower until 22:00.');
  if (state.flags.haggleDay === dayKey(state.clock)) ev.push('Teo has agreed to a 10 percent discount for you today.');
  return ev;
}
export function priceOf(state, itemId) {
  let p = D.ITEMS[itemId].price;
  if (isLanternNight(state.clock)) p *= 0.85;
  if (state.flags.haggleDay === dayKey(state.clock)) p *= 0.9;
  return Math.max(1, Math.round(p));
}
function activityCost(state, id) {
  const d = D.ACTIVITIES[id];
  if (!d.cost) return 0;
  return Math.max(0, d.cost - (id === 'eat_meal' && state.inventory.stamp_card ? 3 : 0));
}
function openBlock(state, loc, minutes) {
  if (!loc.open) return null;
  const wd = weekdayOf(state.clock), h = hourOf(state.clock);
  if (!loc.open.days.includes(wd) || h < loc.open.from || h + minutes / 60 > loc.open.to) {
    return `${loc.name} is closed for that (hours: ${loc.open.label}).`;
  }
  return null;
}

// ---------------------------------------------------------------- quest helpers
export function questView(state) {
  const q = state.quests.menu;
  const objectives = D.QUEST.objectives.map((o) => ({ id: o.id, label: o.label, done: !!q.objectives[o.id] }));
  const draftsLabel = objectives.find((o) => o.id === 'drafts');
  if (draftsLabel) draftsLabel.label += ` (${q.drafts}/${D.QUEST.draftsNeeded})`;
  return { def: D.QUEST, q, objectives, minutesLeft: q.status === 'active' ? Math.max(0, q.deadline - state.clock) : null };
}
function updateQuest(state) {
  const q = state.quests.menu;
  if (q.status !== 'available' && q.status !== 'active') return;
  const o = q.objectives;
  const mark = (id, cond) => {
    if (cond && !o[id]) { o[id] = true; NOTES.push(`Objective complete: ${D.QUEST.objectives.find((x) => x.id === id).label}.`); }
  };
  mark('notebook', (state.inventory.notebook || 0) > 0);
  mark('insight', !!state.flags.heardRegulars);
  mark('drafts', q.drafts >= D.QUEST.draftsNeeded);
}

// ---------------------------------------------------------------- activities
function activityBlock(state, id) {
  const d = D.ACTIVITIES[id];
  if (!d.where.includes(state.location)) return `${d.name} is not possible at ${D.LOCATIONS[state.location].name}.`;
  const closed = openBlock(state, D.LOCATIONS[state.location], d.minutes);
  if (closed) return closed;
  if (d.needsNpc && npcLocation(d.needsNpc, state.clock) !== state.location) return `${D.NPCS[d.needsNpc].name} is not here right now.`;
  if (d.startHours) {
    const h = hourOf(state.clock);
    if (h < d.startHours[0] || h > d.startHours[1]) return `Shifts start between ${pad(d.startHours[0])}:00 and ${pad(d.startHours[1])}:00.`;
  }
  if (d.dailyLimit && count(state, 'act:' + id) >= d.dailyLimit) return 'You already did this today.';
  const cost = activityCost(state, id);
  if (cost > state.money) return `Not enough money (need ${cost}).`;
  if (d.consume && !(state.inventory[d.consume] > 0)) return `You need a ${D.ITEMS[d.consume].name}.`;
  if (d.energy < 0 && state.needs.energy < -d.energy) return `Not enough energy (need ${-d.energy}).`;
  return null;
}

function traitFlavor(state, key) {
  const t = D.TRAITS.find((x) => x.id === state.character.trait);
  return t.flavor[key] || null;
}

function doActivity(state, id) {
  const d = D.ACTIVITIES[id];
  if (!d) return { error: 'Unknown activity.' };
  const why = activityBlock(state, id);
  if (why) return { error: why };

  const startLoc = state.location;
  const key = id === 'explore' ? `act:explore:${startLoc}` : `act:${id}`;
  const n = count(state, key);
  const mult = id === 'explore' ? (n < 2 ? 1 : 0) : diminish(n);
  const fatigue = state.needs.energy < 20 ? 0.5 : 1;
  let bonus = 1;
  for (const b of d.bonuses || []) {
    if (state.inventory[b.item] > 0 && (!b.at || b.at === startLoc)) bonus *= b.mult;
  }
  const locMult = (d.locMult && d.locMult[startLoc]) || 1;
  const cost = activityCost(state, id);
  const sleeping = id === 'sleep' || id === 'nap';

  const collapsed = advance(state, d.minutes, { awake: !sleeping });
  const narrative = [];
  const story = d.story[startLoc] ?? d.story.default;
  if (story) narrative.push(story);
  if (collapsed) {
    narrative.push('Your body gave out before you could finish.');
    return { title: `${d.name} (interrupted)`, narrative };
  }
  bump(state, key);

  state.needs.energy = clamp(state.needs.energy + d.energy, 0, 100);
  if (d.satiety) state.needs.satiety = clamp(state.needs.satiety + d.satiety, 0, 100);
  if (cost) state.money -= cost;
  if (d.pay) state.money += d.pay;
  if (d.consume) removeItem(state, d.consume, 1);

  if (id === 'explore') {
    exploreOutcome(state, d, startLoc, mult, fatigue, narrative);
  } else if (d.skill) {
    if (mult === 0) NOTES.push('You have done this too often today. No more training value until tomorrow.');
    else if (mult < 1) NOTES.push('Repeated today: rewards reduced to 50 percent.');
    if (fatigue < 1 && mult > 0) NOTES.push('Exhaustion: EXP and skill gains halved.');
    grantSkillExp(state, d.skill, Math.round(d.skillExp * mult * fatigue * bonus * locMult));
    grantExp(state, Math.round(d.exp * mult * fatigue));
  }

  if (id === 'write') {
    const q = state.quests.menu;
    if (q.status === 'active' && q.drafts < D.QUEST.draftsNeeded && mult > 0) {
      q.drafts++;
      NOTES.push(`Commission progress: draft ${q.drafts} of ${D.QUEST.draftsNeeded} written.`);
    }
  }
  const flavor = traitFlavor(state, id);
  if (flavor) narrative.push(flavor);
  return { title: d.name, narrative };
}

function exploreOutcome(state, d, loc, mult, fatigue, narrative) {
  let outcome = 'nothing';
  if (PREVIEW) outcome = mult > 0 ? 'notice' : 'nothing';
  else if (mult > 0) { const r = rand(state); outcome = r < 0.25 ? 'coin' : r < 0.7 ? 'notice' : 'nothing'; }
  if (mult === 0) {
    narrative.push('You have already combed through this place today. Nothing new turns up.');
    return;
  }
  const f = fatigue;
  if (fatigue < 1) NOTES.push('Exhaustion: EXP and skill gains halved.');
  if (outcome === 'coin') {
    const amount = 3 + Math.floor(rand(state) * 6);
    state.money += amount;
    narrative.push(`Wedged behind a loose edge you find ${amount} money in small coins.`);
    grantSkillExp(state, d.skill, Math.round(6 * f)); grantExp(state, Math.round(4 * f));
  } else if (outcome === 'notice') {
    const list = D.EXPLORE_CLUES[loc];
    const clue = PREVIEW ? list[0] : list[Math.floor(rand(state) * list.length)];
    narrative.push(clue);
    grantSkillExp(state, d.skill, Math.round(10 * f)); grantExp(state, Math.round(6 * f));
  } else {
    narrative.push('You wander and watch, but nothing stands out this time.');
    grantSkillExp(state, d.skill, Math.round(4 * f)); grantExp(state, Math.round(2 * f));
  }
}

// ---------------------------------------------------------------- travel, shop, items
function doTravel(state, to) {
  const dest = D.LOCATIONS[to];
  if (!dest) return { error: 'Unknown location.' };
  if (to === state.location) return { error: 'You are already here.' };
  const min = D.travelMinutes(state.location, to);
  if (!Number.isFinite(min)) return { error: 'There is no route to that location.' };
  const cost = Math.ceil(min / 10);
  if (state.needs.energy < cost) return { error: `Not enough energy to walk there (need ${cost}).` };
  if (advance(state, min)) return { title: 'Interrupted', narrative: ['You never made it to your destination.'] };
  state.needs.energy = clamp(state.needs.energy - cost, 0, 100);
  state.location = to;
  const narrative = [dest.desc];
  if (to === 'market' && isLanternNight(state.clock)) narrative.push('Lanterns are lit over every stall. It is Lantern Night.');
  return { title: `Travel to ${dest.name}`, narrative };
}

function shopBlock(state) {
  if (state.location !== 'market') return 'You can only trade at Lantern Market.';
  if (npcLocation('teo', state.clock) !== 'market') return 'Teo is not at his stall right now.';
  return null;
}
function doBuy(state, itemId) {
  const it = D.ITEMS[itemId];
  if (!it || !D.MARKET_STOCK.includes(itemId)) return { error: 'That is not for sale.' };
  const why = shopBlock(state);
  if (why) return { error: why };
  const price = priceOf(state, itemId);
  if (state.money < price) return { error: `Not enough money (need ${price}).` };
  if (advance(state, 5)) return { title: 'Interrupted', narrative: [] };
  state.money -= price;
  addItem(state, itemId, 1);
  return { title: `Buy ${it.name}`, narrative: [`Teo wraps the ${it.name.toLowerCase()} and names the price before you ask.`] };
}
function doSell(state, itemId) {
  const it = D.ITEMS[itemId];
  if (!it || !(state.inventory[itemId] > 0)) return { error: 'You do not have that item.' };
  if (!it.sell) return { error: 'Nobody will buy that.' };
  const why = shopBlock(state);
  if (why) return { error: why };
  if (advance(state, 5)) return { title: 'Interrupted', narrative: [] };
  removeItem(state, itemId, 1);
  state.money += it.sell;
  return { title: `Sell ${it.name}`, narrative: ['Teo turns it over once and counts out the coins.'] };
}
function doUse(state, itemId) {
  const it = D.ITEMS[itemId];
  if (!it || !(state.inventory[itemId] > 0)) return { error: 'You do not have that item.' };
  if (it.type !== 'food' && it.type !== 'consumable') return { error: `${it.name} cannot be used directly.` };
  if (advance(state, 5)) return { title: 'Interrupted', narrative: [] };
  removeItem(state, itemId, 1);
  if (it.satiety) state.needs.satiety = clamp(state.needs.satiety + it.satiety, 0, 100);
  if (it.energy) state.needs.energy = clamp(state.needs.energy + it.energy, 0, 100);
  return { title: `Use ${it.name}`, narrative: [it.type === 'food' ? 'You eat quickly and carry on.' : 'It tastes terrible and works anyway.'] };
}

// ---------------------------------------------------------------- dialogue
function topicVisible(state, t) {
  const q = state.quests.menu;
  switch (t.when) {
    case undefined: return true;
    case 'quest_available': return q.status === 'available';
    case 'quest_offered': return q.status === 'available' && q.offered;
    case 'quest_active': return q.status === 'active';
    case 'quest_over': return q.status === 'completed' || q.status === 'failed';
    default: return false;
  }
}
function topicBlock(state, npcId, t) {
  if (!topicVisible(state, t)) return 'Not available right now.';
  const key = `${npcId}.${t.id}`;
  if (t.once && (state.flags.topics[key] || 0) > 0) return 'Already discussed.';
  if (t.needsRel && (state.relations[npcId] || 0) < t.needsRel) return t.needsRelReason;
  if (t.daily && count(state, 'topic:' + key) >= 1) return 'You already tried today.';
  if (t.special === 'deliver') {
    const q = state.quests.menu;
    const missing = D.QUEST.objectives.filter((o) => o.id !== 'deliver' && !q.objectives[o.id]).map((o) => o.label);
    if (missing.length) return `Not ready. Still to do: ${missing.join('; ')}.`;
  }
  return null;
}
export function topicsFor(state, npcId) {
  return D.NPCS[npcId].topics.filter((t) => topicVisible(state, t)).map((t) => ({ id: t.id, label: t.label, disabled: topicBlock(state, npcId, t) }));
}

function doTalk(state, npcId, topicId) {
  const npc = D.NPCS[npcId];
  if (!npc) return { error: 'Unknown person.' };
  if (npcLocation(npcId, state.clock) !== state.location) return { error: `${npc.name} is not here right now.` };
  const t = npc.topics.find((x) => x.id === topicId);
  if (!t) return { error: 'Unknown topic.' };
  const why = topicBlock(state, npcId, t);
  if (why) return { error: why };
  const key = `${npcId}.${topicId}`;
  if (advance(state, 20)) return { title: 'Interrupted', narrative: [] };
  state.flags.topics[key] = (state.flags.topics[key] || 0) + 1;
  const q = state.quests.menu;
  let narrative = [...t.text];

  if (t.reward) {
    const r = t.reward;
    if (r.rel) addRel(state, npcId, r.rel);
    if (r.skill) grantSkillExp(state, r.skill, r.skillExp);
    if (r.exp) grantExp(state, r.exp);
    if (r.item) addItem(state, r.item, 1);
    if (r.flag) state.flags[r.flag] = true;
  }

  if (t.special === 'haggle') {
    bump(state, 'topic:' + key);
    const nego = state.character.skills.negotiation.level;
    const inf = state.character.attributes.influence;
    const chance = Math.min(0.85, 0.25 + 0.07 * nego + 0.03 * inf);
    const roll = PREVIEW ? 1 : rand(state);
    if (roll < chance) {
      state.flags.haggleDay = dayKey(state.clock);
      narrative.push('Teo grumbles, then grins. "Ten percent off for the rest of the day. Do not tell the others."');
      grantSkillExp(state, 'negotiation', 10); grantExp(state, 4);
    } else {
      narrative.push('Teo shakes his head. "Prices are prices. Try again tomorrow."');
      grantSkillExp(state, 'negotiation', 4); grantExp(state, 1);
    }
  } else if (t.special === 'offer') {
    q.offered = true;
    NOTES.push('New quest available: The Missing Menu. Accept it from Dani to begin.');
  } else if (t.special === 'accept') {
    q.status = 'active'; q.acceptedAt = state.clock; q.deadline = state.clock + D.QUEST.deadlineHours * 60;
    q.objectives.accept = true;
    NOTES.push(`Quest started: The Missing Menu. Deadline ${formatClock(q.deadline)}.`);
  } else if (t.special === 'deliver') {
    const excellent = state.character.skills.writing.level >= 3;
    q.status = 'completed'; q.objectives.deliver = true; q.finishedAt = state.clock; q.outcome = excellent ? 'excellent' : 'good';
    state.money += excellent ? 75 : 60;
    grantExp(state, 90);
    grantSkillExp(state, 'writing', 20);
    raiseAttribute(state, 'management', 1);
    addRel(state, 'dani', 15);
    if (excellent) { addItem(state, 'stamp_card', 1); }
    narrative = excellent
      ? ['Dani reads each card twice and goes quiet. "These are better than the menu I lost." She pays 75 and presses a stamp card into your hand.']
      : ['Dani reads the cards, nods slowly and pays 60. "Plain and honest. That is what I asked for."'];
    NOTES.push(`Quest complete: The Missing Menu (${q.outcome}).`);
  } else if (t.special === 'after') {
    narrative = q.status === 'completed'
      ? ['"The new menu is up," Dani says. "People read it. Mostly."']
      : ['Dani does not look up. "I found someone else. Maybe next time you will watch the clock."'];
  }
  const flavor = traitFlavor(state, 'talk');
  if (flavor) narrative.push(flavor);
  return { title: `Talk to ${npc.name}`, narrative };
}

// ---------------------------------------------------------------- journal and tracker rewards (run through execute for reports)
function doJournal(state, a) {
  const text = String(a.text ?? '').trim();
  if (!text) return { error: 'Write something first.' };
  if (text.length > 4000) return { error: 'An entry can be at most 4000 characters.' };
  const type = a.type === 'real' ? 'real' : 'rpg';
  const now = a.now || new Date();
  const title = String(a.title ?? '').trim().slice(0, 80) || (type === 'real' ? 'Reflection' : 'Notes from the day');
  let collapsed = false;
  if (type === 'rpg') collapsed = advance(state, 10);
  if (collapsed) return { title: 'Interrupted', narrative: [] };
  state.journal.push({
    id: nextId(state), type, title, text,
    realDate: localDateStr(now), realTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    clock: state.clock, gameTime: formatClock(state.clock)
  });
  if (type === 'rpg') {
    const n = count(state, 'journal');
    bump(state, 'journal');
    if (n < 1) { grantExp(state, 4); grantSkillExp(state, 'writing', 3); }
    else NOTES.push('Only the first in-world journal entry each day earns EXP.');
  }
  return { title: type === 'rpg' ? 'Journal entry (in-world)' : 'Journal entry (real life)', narrative: [], noLog: type === 'real' };
}

function doTrackerReward(state, a) {
  const goal = state.tracker.goals.find((g) => g.id === a.goalId);
  grantExp(state, 6);
  if (goal && goal.linkedSkill) grantSkillExp(state, goal.linkedSkill, 4);
  return { title: `Real-life reward: ${goal ? goal.name : 'goal'}`, narrative: ['A real-life completion was converted into a small in-world reward.'] };
}

// ---------------------------------------------------------------- execute and preview
export function execute(state, action, opts = {}) {
  const before = snapshot(state);
  NOTES = [];
  ensureDay(state);
  let res;
  switch (action.kind) {
    case 'activity': res = doActivity(state, action.id); break;
    case 'travel': res = doTravel(state, action.to); break;
    case 'talk': res = doTalk(state, action.npc, action.topic); break;
    case 'buy': res = doBuy(state, action.item); break;
    case 'sell': res = doSell(state, action.item); break;
    case 'use': res = doUse(state, action.item); break;
    case 'journal': res = doJournal(state, action); break;
    case 'tracker_reward': res = doTrackerReward(state, action); break;
    default: res = { error: 'Unknown action.' };
  }
  if (res.error) return { ok: false, error: res.error };
  updateQuest(state);
  const report = {
    ok: true, title: res.title, narrative: res.narrative || [], notes: NOTES.slice(),
    changes: diff(before, snapshot(state)), clock: state.clock
  };
  if (!opts.preview && !res.noLog) {
    state.stats.actions++;
    state.log.push({ id: nextId(state), clock: state.clock, title: report.title, narrative: report.narrative, notes: report.notes, changes: report.changes });
    if (state.log.length > D.MAX_LOG) state.log.splice(0, state.log.length - D.MAX_LOG);
  }
  return report;
}

// Preview runs the real rules on a copy of the state, so what you see is what the rules will do.
export function preview(state, action) {
  const c = structuredClone(state);
  PREVIEW = true;
  let r;
  try { r = execute(c, action, { preview: true }); } finally { PREVIEW = false; }
  if (!r.ok) return { ok: false, error: r.error };
  const variable = (action.kind === 'activity' && !!D.ACTIVITIES[action.id].variable) || (action.kind === 'talk' && action.topic === 'haggle');
  return {
    ok: true, minutes: c.clock - state.clock, changes: r.changes.filter((x) => !x.startsWith('Time ')),
    notes: r.notes, variable, warnings: warningsFor(state, c, action)
  };
}

function warningsFor(s, c, action) {
  const w = [];
  const b = s.needs, a = c.needs;
  if (c.stats.collapses > s.stats.collapses) w.push('This would push your health to zero and cause a collapse. You would lose 12 hours and a quarter of your money.');
  if (a.energy < 20 && a.energy < b.energy) w.push(`Energy would fall to ${a.energy}. Below 20, EXP and skill gains are halved.`);
  if (a.satiety < 20 && a.satiety < b.satiety) w.push(`Satiety would fall to ${a.satiety}. At 0 you lose health every hour.`);
  if (a.health < b.health) w.push(`Health would drop from ${b.health} to ${a.health}.`);
  if (c.money === 0 && s.money > 0) w.push('This would spend all your money.');
  const qb = s.quests.menu, qa = c.quests.menu;
  if (qb.status === 'active' && qa.status === 'failed') w.push('This would pass the deadline and fail The Missing Menu.');
  else if (qb.status === 'active' && qa.deadline - c.clock < 720 && qb.deadline - s.clock >= 720) w.push('Less than 12 hours would remain on The Missing Menu.');
  if (action.kind === 'activity' && action.id !== 'sleep' && action.id !== 'nap' && hourOf(c.clock) < 5) w.push('You would be awake in the deep night. Staying up drains energy.');
  if (action.kind === 'activity' && action.id === 'sleep' && b.energy > 60) w.push('You are not very tired. Eight hours of sleep will mostly cost time and hunger.');
  if (action.kind === 'activity' && D.ACTIVITIES[action.id].skill && action.id !== 'explore') {
    const n = count(s, `act:${action.id}`);
    if (diminish(n) === 0) w.push('You have done this too often today. It will give no EXP.');
    else if (diminish(n) < 1) w.push('You have done this several times today. Rewards are reduced to 50 percent.');
  }
  if (action.kind === 'use' && action.item === 'bread' && b.satiety > 85) w.push('You are not hungry. Most of this will be wasted.');
  return w;
}

// Every activity defined for the current location (the UI previews each one for availability).
export function locationActivities(state) {
  return Object.entries(D.ACTIVITIES).filter(([, d]) => d.where.includes(state.location)).map(([id, d]) => ({ id, name: d.name, desc: d.desc }));
}

export function suggestions(state) {
  const s = [], n = state.needs, h = hourOf(state.clock);
  const q = state.quests.menu;
  if (n.health < 40) s.push('Your health is low. Eat, rest and avoid hard work until it recovers.');
  if (n.satiety < 30) s.push('You are getting hungry. Eat a bread roll, cook rice at home or order a meal at the Corner Cafe.');
  if (n.energy < 25) s.push('Your energy is low. Rest, nap or sleep before anything demanding.');
  if (h >= 22 || h < 5) s.push('It is late. Staying awake drains energy. Sleeping at home restores the most.');
  if (q.status === 'available') s.push('Dani at the Corner Cafe may have paid work. She is there 10:00-20:00.');
  if (q.status === 'active') {
    const next = D.QUEST.objectives.find((o) => o.id !== 'deliver' && !q.objectives[o.id]);
    s.push(next ? `The Missing Menu: ${next.label}.` : 'The Missing Menu: everything is ready. Deliver the cards to Dani.');
  }
  const t = D.TRAITS.find((x) => x.id === state.character.trait);
  const here = locationActivities(state).filter((a) => t.favored.includes(a.id));
  if (here.length) s.push(`As someone ${t.name.toLowerCase()}, you may enjoy: ${here.map((a) => a.name.toLowerCase()).join(', ')}.`);
  if (t.favored.includes('talk') && npcsHere(state).length) s.push('As someone social, you may enjoy talking to the people here.');
  return s.slice(0, 5);
}

// ---------------------------------------------------------------- real-life tracker (separate from the RPG by default)
export function addGoal(state, o, today) {
  const name = String(o.name ?? '').trim();
  if (!name) return { ok: false, error: 'Give the goal or habit a name.' };
  if (name.length > 60) return { ok: false, error: 'The name must be 60 characters or fewer.' };
  const kind = o.kind === 'goal' ? 'goal' : 'habit';
  const cadence = o.cadence === 'weekly' ? 'weekly' : 'daily';
  let target = 0;
  if (kind === 'goal') {
    target = Number(o.target);
    if (!Number.isInteger(target) || target < 1 || target > 365) return { ok: false, error: 'A goal target must be a whole number from 1 to 365.' };
  }
  const linkedSkill = D.SKILLS.some((s) => s.id === o.linkedSkill) ? o.linkedSkill : '';
  const goal = {
    id: nextId(state), name, kind, cadence: kind === 'habit' ? cadence : 'daily', target,
    createdDate: today, completions: [], completedDate: null,
    rpgLink: !!o.rpgLink, linkedSkill
  };
  state.tracker.goals.push(goal);
  return { ok: true, goal };
}

export function recordCompletion(state, goalId, today, note = '', nowIso = new Date().toISOString()) {
  const g = state.tracker.goals.find((x) => x.id === goalId);
  if (!g) return { ok: false, error: 'That goal does not exist.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return { ok: false, error: 'Invalid date.' };
  if (g.completedDate) return { ok: false, error: 'This goal is already complete.' };
  const dates = new Set(g.completions.map((c) => c.date));
  if (dates.has(today)) return { ok: false, error: 'Already recorded for today.' };
  if (g.kind === 'habit' && g.cadence === 'weekly') {
    const ws = weekStart(today);
    if (g.completions.some((c) => weekStart(c.date) === ws)) return { ok: false, error: 'Already recorded this week.' };
  }
  g.completions.push({ date: today, ts: nowIso, note: String(note).trim().slice(0, 200) });
  let finished = false;
  if (g.kind === 'goal' && g.completions.length >= g.target) { g.completedDate = today; finished = true; }

  let report = null;
  let rewardMsg = 'Recorded. No game reward (real-life tracking is separate from the RPG).';
  if (state.settings.integration && g.rpgLink) {
    const rl = state.tracker.rewardLog;
    if (rl.date !== today) { rl.date = today; rl.n = 0; }
    if (rl.n < 3) {
      rl.n++;
      report = execute(state, { kind: 'tracker_reward', goalId: g.id });
      rewardMsg = `Recorded. Game reward granted (${rl.n} of 3 today).`;
    } else rewardMsg = 'Recorded. The daily limit of 3 game rewards from real-life completions has been reached.';
  } else if (state.settings.integration && !g.rpgLink) {
    rewardMsg = 'Recorded. This goal is not linked to the RPG, so no game reward.';
  }
  return { ok: true, finished, message: finished ? `Goal complete. ${rewardMsg}` : rewardMsg, report };
}

export function trackerStats(g, today) {
  const dates = new Set(g.completions.map((c) => c.date));
  let streak = 0, unit = 'days';
  let doneNow = dates.has(today);
  if (g.kind === 'habit' && g.cadence === 'weekly') {
    unit = 'weeks';
    const weeks = new Set(g.completions.map((c) => weekStart(c.date)));
    let w = weekStart(today);
    doneNow = weeks.has(w);
    if (!weeks.has(w)) w = addDays(w, -7);
    while (weeks.has(w)) { streak++; w = addDays(w, -7); }
  } else {
    let d = today;
    if (!dates.has(d)) d = addDays(d, -1);
    while (dates.has(d)) { streak++; d = addDays(d, -1); }
  }
  const last14 = [];
  for (let i = 13; i >= 0; i--) { const d = addDays(today, -i); last14.push({ date: d, done: dates.has(d) }); }
  return { streak, unit, doneNow, total: g.completions.length, last14 };
}
