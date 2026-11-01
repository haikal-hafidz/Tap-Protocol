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
export function monthKey(clock) { return clockDate(clock).toISOString().slice(0, 7); }
export function yearKey(clock) { return clockDate(clock).toISOString().slice(0, 4); }
export function dateParts(clock) {
  const d = clockDate(clock);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
export function formatDateOnly(clock) {
  const d = clockDate(clock);
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
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
function randInt(state, min, max) { return min + Math.floor(rand(state) * (max - min + 1)); }
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
    // Real-life Tracker rewards are ON for a new save unless the creator explicitly turns them off.
    settings: { integration: o.integration === undefined ? true : !!o.integration },
    stats: { collapses: 0, actions: 0 },
    nextId: 1
  };
  ensureFinances(state);
  ensureCalendar(state);
  ensureCareer(state);
  ensureEducation(state);
  ensureHousing(state);
  ensureBusiness(state);
  ensureRelationships(state);
  ensureFamily(state);
  ensureChronicle(state);
  ensureWorldMemory(state);
  ensurePhase4(state);
  ensurePhase5(state);
  return { ok: true, state, intro: bg.circumstance };
}

export function isValidState(s) {
  return !!(s && typeof s === 'object' && typeof s.version === 'number' && s.character && s.character.attributes &&
    s.character.skills && s.needs && typeof s.clock === 'number' && s.quests && s.quests.menu && s.inventory &&
    Array.isArray(s.journal) && s.tracker && Array.isArray(s.tracker.goals) && Array.isArray(s.log));
}

// Fill in anything an older save may lack. Never discards existing data.
export function migrateState(s) {
  // An existing true/false preference is kept exactly as saved. Only a save with no stored preference at all gets the default (on).
  // Turning rewards on never pays anything recorded earlier: each completion carries its own one-time claim.
  s.settings = s.settings || {};
  if (typeof s.settings.integration !== 'boolean') s.settings.integration = true;
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
  ensureFinances(s);
  ensureCalendar(s);
  ensureCareer(s);
  ensureEducation(s);
  ensureHousing(s);
  ensureBusiness(s);
  ensureRelationships(s);
  ensureFamily(s);
  ensureChronicle(s);
  ensureWorldMemory(s);
  ensurePhase4(s);
  ensurePhase5(s);
  s.version = D.SAVE_VERSION;
  return s;
}

function nextId(state) { return state.nextId++; }

// ---------------------------------------------------------------- bookkeeping helpers
function ensureDay(state) {
  const k = dayKey(state.clock);
  if (state.daily.day !== k) state.daily = { day: k, counts: {} };
  processCalendarTransitions(state);
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
  processWorldSimulation(state);
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
    recordMemory(state, {
      type: 'quest_failed',
      title: 'The Missing Menu deadline expired',
      entities: ['pithe', 'dani'],
      location: 'cafe',
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
      context: 'Pithe did not deliver the menu cards in time. Dani hired another writer.'
    });
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


// ---------------------------------------------------------------- financial transaction ledger
export function ensureFinances(state) {
  if (!state.finances) {
    state.finances = {
      bank: 0,
      savingsGoal: 0,
      history: []
    };
  }
}

export function transact(state, opts = {}) {
  const amount = Number(opts.amount) || 0;
  const category = opts.category || 'general';
  const desc = opts.desc || 'Transaction';
  const useBank = !!opts.fromBank;

  ensureFinances(state);
  const fin = state.finances;

  if (amount < 0) {
    const cost = Math.abs(amount);
    if (useBank) {
      if (fin.bank < cost) return { ok: false, error: `Insufficient bank balance (need ${cost}, have ${fin.bank}).` };
      fin.bank -= cost;
    } else {
      if (state.money < cost) {
        const deficit = cost - state.money;
        if (fin.bank >= deficit) {
          fin.bank -= deficit;
          state.money = 0;
        } else {
          state.money = Math.max(0, state.money - cost);
        }
      } else {
        state.money -= cost;
      }
    }
  } else if (amount > 0) {
    if (opts.toBank) fin.bank += amount;
    else state.money += amount;
  }

  const entry = {
    id: nextId(state),
    clock: state.clock,
    amount,
    category,
    desc,
    cashAfter: state.money,
    bankAfter: fin.bank
  };
  fin.history.push(entry);
  if (fin.history.length > 100) fin.history.shift();
  return { ok: true, entry };
}

// ---------------------------------------------------------------- deterministic calendar processing
export function ensureCalendar(state) {
  if (!state.calendar) {
    state.calendar = {
      lastDayKey: dayKey(state.clock),
      lastMonthKey: monthKey(state.clock),
      lastYearKey: yearKey(state.clock),
      lastSalaryClock: state.clock,
      lastRentClock: state.clock,
      lastBusinessClock: state.clock,
      birthdayMonth: 3,
      birthdayDay: 4
    };
  }
}

function processCalendarTransitions(state) {
  ensureCalendar(state);
  const curDay = dayKey(state.clock);
  const curMonth = monthKey(state.clock);
  const curYear = yearKey(state.clock);
  const cal = state.calendar;

  if (cal.lastDayKey !== curDay) {
    cal.lastDayKey = curDay;
    if (state.daily.day !== curDay) state.daily = { day: curDay, counts: {} };
    if (state.finances) transact(state, { amount: -2, category: 'living', desc: 'Daily living baseline expenses' });
  }

  if (cal.lastMonthKey !== curMonth) {
    cal.lastMonthKey = curMonth;
    if (state.housing?.rentals) {
      for (const propId of state.housing.rentals) {
        const prop = D.PROPERTIES[propId];
        if (prop?.rentCost) transact(state, { amount: -prop.rentCost * 4, category: 'housing', desc: `Monthly rent for ${prop.name}` });
      }
    }
    if (state.housing?.owned) {
      for (const propId of state.housing.owned) {
        const prop = D.PROPERTIES[propId];
        if (prop?.maintenance) transact(state, { amount: -prop.maintenance * 4, category: 'housing', desc: `Monthly maintenance for ${prop.name}` });
      }
    }
  }

  if (cal.lastYearKey !== curYear) {
    cal.lastYearKey = curYear;
    state.character.age = (state.character.age || 24) + 1;
    const stage = D.getLifeStage(state.character.age);
    NOTES.push(`Happy Birthday! You turned ${state.character.age} years old (${stage.name}).`);
    if (state.chronicle) {
      recordChronicle(state, {
        category: 'milestone',
        title: `Turned ${state.character.age}`,
        desc: `Celebrated birthday in ${curYear}. Current life stage: ${stage.name}.`
      });
    }
    if (state.family?.children) {
      for (const child of state.family.children) {
        child.age = (child.age || 0) + 1;
        NOTES.push(`${child.name} celebrated a birthday and is now ${child.age} years old.`);
      }
    }
  }

  if (state.career?.currentJob) {
    const job = D.JOBS[state.career.currentJob];
    if (job) {
      if (!cal.lastSalaryClock) cal.lastSalaryClock = state.clock;
      const salaryInterval = 7 * 24 * 60;
      while (state.clock - cal.lastSalaryClock >= salaryInterval) {
        cal.lastSalaryClock += salaryInterval;
        transact(state, { amount: job.salary, category: 'salary', desc: `Weekly salary from ${job.company} (${job.title})` });
        NOTES.push(`Received weekly salary: +${job.salary} money from ${job.company}.`);
      }
    }
  }

  if (state.business?.owned) {
    if (!cal.lastBusinessClock) cal.lastBusinessClock = state.clock;
    const bizInterval = 7 * 24 * 60;
    while (state.clock - cal.lastBusinessClock >= bizInterval) {
      cal.lastBusinessClock += bizInterval;
      for (const biz of state.business.owned) {
        const def = D.BUSINESS_TYPES[biz.type];
        if (def) {
          const rev = Math.round(def.baseWeeklyRevenue * (1 + (biz.upgradeLevel || 0) * 0.25) * ((biz.reputation || 50) / 50));
          const exp = Math.round(def.baseWeeklyExpenses * (1 + (biz.staffCount || 0) * 0.4));
          const net = rev - exp;
          biz.totalRevenue = (biz.totalRevenue || 0) + rev;
          biz.totalExpenses = (biz.totalExpenses || 0) + exp;
          transact(state, { amount: net, category: 'business', desc: `Weekly net income from ${biz.name}` });
          NOTES.push(`Business cycle (${biz.name}): Revenue +${rev}, Expenses -${exp}, Net ${net >= 0 ? '+' : ''}${net}.`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- chronicle & milestone helper
export function ensureChronicle(state) {
  if (!state.chronicle) state.chronicle = [];
}
export function recordChronicle(state, milestone) {
  ensureChronicle(state);
  const entry = {
    id: nextId(state),
    clock: state.clock,
    date: formatDateOnly(state.clock),
    year: dateParts(state.clock).year,
    category: milestone.category || 'milestone',
    title: milestone.title,
    desc: milestone.desc
  };
  state.chronicle.push(entry);
  return entry;
}

// ---------------------------------------------------------------- PHASE 3: WORLD MEMORY & LIVING SIMULATION
export function ensureWorldMemory(state) {
  if (!state.memories) state.memories = [];
  if (!state.npcSim) {
    state.npcSim = {};
    for (const [id, prof] of Object.entries(D.NPC_PROFILES)) {
      state.npcSim[id] = {
        id,
        career: prof.career,
        employer: prof.employer,
        workplace: prof.workplace,
        goal: prof.goal,
        financialStatus: 'stable',
        currentActivity: 'routine',
        lastUpdateClock: state.clock,
        memories: []
      };
    }
  }
  if (!state.npcNetwork) {
    state.npcNetwork = {};
    for (const rel of D.INITIAL_NPC_NETWORK) {
      const key = [rel.source, rel.target].sort().join('|');
      state.npcNetwork[key] = {
        a: rel.source,
        b: rel.target,
        status: rel.status,
        affinity: rel.affinity,
        trust: rel.trust,
        role: rel.role,
        lastInteractionClock: state.clock,
        milestones: [`Established bond as ${rel.status.replace('_', ' ')}.`]
      };
    }
  }
  if (!state.worldLocations) {
    state.worldLocations = {};
    for (const [locId, init] of Object.entries(D.INITIAL_LOCATION_STATES)) {
      state.worldLocations[locId] = {
        id: locId,
        activityLevel: init.activityLevel,
        reputation: init.reputation,
        popularity: init.popularity,
        history: [...init.notableHistory],
        lastEventClock: state.clock
      };
    }
  }
  if (!state.worldEvents) {
    state.worldEvents = {
      active: [],
      history: []
    };
  }
  if (!state.socialFeed) {
    state.socialFeed = [];
  }
  if (!state.causalTriggers) {
    state.causalTriggers = [];
  }
}

// Record a persistent structured memory with deduplication and bounds management
export function recordMemory(state, mem) {
  ensureWorldMemory(state);
  const type = mem.type || 'general';
  const entities = Array.isArray(mem.entities) ? [...mem.entities] : [];
  const location = mem.location || state.location || 'home';
  const importance = Number(mem.importance) || D.MEMORY_IMPORTANCE.NOTABLE;
  const visibility = mem.visibility || 'public';
  const context = String(mem.context || '').trim();
  const title = String(mem.title || '').trim();
  const isRumor = !!mem.isRumor || visibility === 'rumor';

  const existing = state.memories.find((m) =>
    m.type === type && m.title === title && Math.abs(m.clock - state.clock) < 1440
  );
  if (existing) return existing;

  const record = {
    id: nextId(state),
    clock: state.clock,
    date: formatDateOnly(state.clock),
    type,
    title,
    entities,
    location,
    importance,
    visibility,
    isRumor,
    verified: !isRumor,
    context,
    relatedMemories: mem.relatedMemories || []
  };

  state.memories.push(record);

  if (state.memories.length > D.MAX_WORLD_MEMORIES) {
    let pruneIndex = -1;
    for (let i = 0; i < state.memories.length; i++) {
      const candidate = state.memories[i];
      if (candidate.importance >= D.MEMORY_IMPORTANCE.HISTORICAL) continue;
      if (pruneIndex === -1) {
        pruneIndex = i;
      } else {
        const curBest = state.memories[pruneIndex];
        if (candidate.importance < curBest.importance ||
           (candidate.importance === curBest.importance && candidate.clock < curBest.clock)) {
          pruneIndex = i;
        }
      }
    }
    if (pruneIndex !== -1) {
      state.memories.splice(pruneIndex, 1);
    }
  }

  for (const ent of entities) {
    if (ent !== 'pithe' && state.npcSim && state.npcSim[ent]) {
      recordNpcMemory(state, ent, {
        sourceEntity: mem.sourceEntity || 'world',
        title,
        context,
        importance,
        clock: state.clock
      });
    }
  }

  if (location && state.worldLocations && state.worldLocations[location] && importance >= D.MEMORY_IMPORTANCE.NOTABLE) {
    const locState = state.worldLocations[location];
    if (!locState.history.includes(title)) {
      locState.history.push(title);
      if (locState.history.length > 25) locState.history.shift();
    }
  }

  if (visibility === 'public' || visibility === 'rumor') {
    state.socialFeed.push({
      id: record.id,
      clock: state.clock,
      title,
      context,
      isRumor,
      verified: !isRumor,
      location,
      importance
    });
    if (state.socialFeed.length > 50) state.socialFeed.shift();
  }

  return record;
}

export function queryMemories(state, filter = {}) {
  ensureWorldMemory(state);
  return state.memories.filter((m) => {
    if (filter.entity && !m.entities.includes(filter.entity)) return false;
    if (filter.location && m.location !== filter.location) return false;
    if (filter.type && m.type !== filter.type) return false;
    if (filter.minImportance && m.importance < filter.minImportance) return false;
    if (filter.visibility && m.visibility !== filter.visibility) return false;
    if (filter.verified !== undefined && m.verified !== filter.verified) return false;
    if (filter.sinceClock !== undefined && m.clock < filter.sinceClock) return false;
    return true;
  });
}

export function recordNpcMemory(state, npcId, mem) {
  ensureWorldMemory(state);
  const sim = state.npcSim[npcId];
  if (!sim) return null;
  if (!sim.memories) sim.memories = [];

  const title = String(mem.title || '').trim();
  const context = String(mem.context || '').trim();
  const importance = Number(mem.importance) || D.MEMORY_IMPORTANCE.NOTABLE;

  const dup = sim.memories.find((m) => m.title === title && Math.abs(m.clock - state.clock) < 1440);
  if (dup) return dup;

  const entry = {
    id: nextId(state),
    clock: mem.clock !== undefined ? mem.clock : state.clock,
    date: formatDateOnly(mem.clock !== undefined ? mem.clock : state.clock),
    sourceEntity: mem.sourceEntity || 'world',
    title,
    context,
    importance
  };

  sim.memories.push(entry);
  if (sim.memories.length > D.MAX_NPC_MEMORIES) {
    let lowestIdx = 0;
    for (let i = 1; i < sim.memories.length; i++) {
      if (sim.memories[i].importance < sim.memories[lowestIdx].importance) lowestIdx = i;
    }
    sim.memories.splice(lowestIdx, 1);
  }
  return entry;
}

export function processWorldSimulation(state) {
  processAutonomousNpcLives(state);
  processNpcRelationships(state);
  processSocialRumorPropagation(state);
  processLocationDevelopment(state);
  processEmergentWorldEvents(state);
  processCausalTriggers(state);
  processEmergentStories(state);
}

export function processLocationDevelopment(state) {
  ensureWorldMemory(state);
  const curDay = dayKey(state.clock);
  if (state.lastLocDay === curDay) return;
  state.lastLocDay = curDay;

  for (const [locId, loc] of Object.entries(state.worldLocations)) {
    if (state.location === locId) {
      loc.popularity = clamp(loc.popularity + 1, 0, 100);
      loc.activityLevel = clamp(loc.activityLevel + 2, 10, 100);
    }
  }
}

export function processEmergentWorldEvents(state) {
  ensureWorldMemory(state);
  const curHour = hourOf(state.clock);
  const wd = weekdayOf(state.clock);

  const remainingActive = [];
  for (const ev of state.worldEvents.active) {
    if (state.clock >= ev.endClock) {
      if (!ev.playerParticipated) {
        const def = D.EMERGENT_EVENT_TYPES[ev.typeId];
        const resText = def?.autonomousOutcome || `${ev.name} concluded.`;
        recordMemory(state, {
          type: 'event_resolution',
          title: `${ev.name} concluded`,
          entities: ev.participants || [],
          location: ev.location,
          importance: D.MEMORY_IMPORTANCE.NOTABLE,
          visibility: 'public',
          context: resText
        });
      }
      state.worldEvents.history.push({ ...ev, resolvedClock: state.clock });
      if (state.worldEvents.history.length > 50) state.worldEvents.history.shift();
    } else {
      remainingActive.push(ev);
    }
  }
  state.worldEvents.active = remainingActive;

  for (const [typeId, def] of Object.entries(D.EMERGENT_EVENT_TYPES)) {
    if (state.worldEvents.active.some((e) => e.typeId === typeId)) continue;
    if (def.activeDays && !def.activeDays.includes(wd)) continue;

    const last = [...state.worldEvents.history].reverse().find((e) => e.typeId === typeId);
    const intervalMinutes = (def.cadenceDays || 14) * 1440;
    if (last && state.clock - last.startClock < intervalMinutes) continue;

    const [startH, endH] = def.activeHours || [10, 18];
    if (curHour >= startH && curHour < endH) {
      const startClock = state.clock - Math.floor((curHour - startH) * 60);
      const endClock = startClock + Math.floor((endH - startH) * 60);

      const newEv = {
        id: nextId(state),
        typeId,
        name: def.name,
        location: def.location,
        startClock,
        endClock,
        participants: def.participants || [],
        desc: def.desc,
        playerOption: def.playerOption,
        playerParticipated: false
      };
      state.worldEvents.active.push(newEv);

      recordMemory(state, {
        type: 'event_spawn',
        title: `${def.name} is taking place at ${D.LOCATIONS[def.location]?.name || def.location}`,
        entities: def.participants || [],
        location: def.location,
        importance: D.MEMORY_IMPORTANCE.NOTABLE,
        visibility: 'public',
        context: def.desc
      });
    }
  }
}

export function scheduleCausalTrigger(state, trigger) {
  ensureWorldMemory(state);
  const entry = {
    id: nextId(state),
    executeClock: state.clock + (Number(trigger.delayMinutes) || 1440),
    title: trigger.title || 'Consequence',
    action: trigger.action || 'memory',
    data: trigger.data || {}
  };
  state.causalTriggers.push(entry);
  return entry;
}

export function processCausalTriggers(state) {
  ensureWorldMemory(state);
  const pending = [];
  const ready = [];
  for (const t of state.causalTriggers) {
    if (state.clock >= t.executeClock) ready.push(t);
    else pending.push(t);
  }
  state.causalTriggers = pending;

  for (const trig of ready) {
    if (trig.action === 'memory') {
      recordMemory(state, trig.data);
    } else if (trig.action === 'npc_trust') {
      if (trig.data.npc && trig.data.amount) {
        addRel(state, trig.data.npc, trig.data.amount);
        NOTES.push(`Consequence: ${D.NPCS[trig.data.npc]?.name || trig.data.npc} trust adjusted (${sign(trig.data.amount)}).`);
      }
    } else if (trig.action === 'rumor') {
      createRumor(state, trig.data);
    } else if (trig.action === 'story_advance') {
      advanceStoryToStage(state, trig.data?.storyId, trig.data?.targetStage, trig.title);
    }
  }
}

function doEventParticipate(state, eventId) {
  ensureWorldMemory(state);
  const ev = state.worldEvents.active.find((e) => e.id === Number(eventId));
  if (!ev) return { error: 'World event not found or has already ended.' };
  if (state.location !== ev.location) return { error: `You must be at ${D.LOCATIONS[ev.location]?.name || ev.location} to participate.` };
  if (ev.playerParticipated) return { error: 'You have already participated in this event.' };

  const opt = ev.playerOption;
  if (!opt) return { error: 'No player action available for this event.' };

  if (opt.cost && state.money < opt.cost) return { error: `Participating costs ${opt.cost} money (you have ${state.money}).` };
  if (opt.energy && opt.energy < 0 && state.needs.energy < -opt.energy) return { error: 'You do not have enough energy.' };

  if (opt.cost) state.money -= opt.cost;
  if (opt.energy) state.needs.energy = clamp(state.needs.energy + opt.energy, 0, 100);
  if (opt.satiety) state.needs.satiety = clamp(state.needs.satiety + opt.satiety, 0, 100);

  if (opt.rewards) {
    if (opt.rewards.skill && opt.rewards.skillExp) grantSkillExp(state, opt.rewards.skill, opt.rewards.skillExp);
    if (opt.rewards.exp) grantExp(state, opt.rewards.exp);
  }

  ev.playerParticipated = true;
  advance(state, opt.minutes || 60);

  recordMemory(state, {
    type: 'event_attendance',
    title: `Pithe attended ${ev.name}`,
    entities: ['pithe', ...(ev.participants || [])],
    location: ev.location,
    importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
    visibility: 'public',
    context: opt.narrative
  });

  for (const npcId of ev.participants || []) {
    addRel(state, npcId, 5);
    recordNpcMemory(state, npcId, {
      sourceEntity: 'pithe',
      title: `Shared experience with Pithe at ${ev.name}`,
      context: opt.narrative,
      importance: D.MEMORY_IMPORTANCE.NOTABLE,
      clock: state.clock
    });
  }

  NOTES.push(`Participated in ${ev.name}!`);
  return {
    title: ev.name,
    narrative: [opt.narrative, `Your presence made a positive impression on community members and participants.`]
  };
}

export function processNpcRelationships(state) {
  ensureWorldMemory(state);
  const curDay = dayKey(state.clock);
  const curWeek = weekStart(curDay);

  if (state.lastNpcRelWeek === curWeek) return;
  state.lastNpcRelWeek = curWeek;

  for (const [key, edge] of Object.entries(state.npcNetwork)) {
    const profA = D.NPC_PROFILES[edge.a];
    const profB = D.NPC_PROFILES[edge.b];
    if (!profA || !profB) continue;

    const sharedInterests = profA.interests.filter((i) => profB.interests.includes(i));
    const inCircle = (profA.circle && profA.circle.includes(edge.b)) || (profB.circle && profB.circle.includes(edge.a));
    const coLocated = profA.workplace === profB.workplace || profA.homeLocation === profB.homeLocation;

    if (coLocated || sharedInterests.length > 0 || inCircle) {
      edge.affinity = clamp(edge.affinity + 2, 0, 100);
      edge.trust = clamp(edge.trust + 1, -100, 100);
      edge.lastInteractionClock = state.clock;

      if (edge.status === 'acquaintances' && edge.affinity >= 50) {
        edge.status = 'friends';
        const msg = `${D.NPCS[edge.a]?.name || edge.a} and ${D.NPCS[edge.b]?.name || edge.b} have become close friends.`;
        edge.milestones.push(msg);
        recordMemory(state, {
          type: 'npc_relationship',
          title: msg,
          entities: [edge.a, edge.b],
          location: profA.workplace,
          importance: D.MEMORY_IMPORTANCE.NOTABLE,
          visibility: 'public',
          context: 'Bond strengthened through ongoing mutual interests and collaboration.'
        });
      } else if (edge.status === 'friends' && edge.affinity >= 80 && edge.trust >= 75) {
        edge.status = 'close_friends';
        const msg = `${D.NPCS[edge.a]?.name || edge.a} and ${D.NPCS[edge.b]?.name || edge.b} are now lifelong confidants.`;
        edge.milestones.push(msg);
      }
    }
  }
}

export function processSocialRumorPropagation(state) {
  ensureWorldMemory(state);
  const curDay = dayKey(state.clock);
  if (state.lastRumorDay === curDay) return;
  state.lastRumorDay = curDay;

  const recentMems = queryMemories(state, { sinceClock: state.clock - 3 * 1440, minImportance: D.MEMORY_IMPORTANCE.NOTABLE });
  for (const mem of recentMems) {
    for (const ent of mem.entities) {
      if (ent === 'pithe') {
        for (const [npcId, rel] of Object.entries(state.relationships || {})) {
          if (rel.affinity >= 25) {
            recordNpcMemory(state, npcId, {
              sourceEntity: 'word_of_mouth',
              title: `Heard about Pithe: ${mem.title}`,
              context: mem.context,
              importance: D.MEMORY_IMPORTANCE.FLEETING,
              clock: state.clock
            });
          }
        }
      } else if (state.npcSim[ent]) {
        const prof = D.NPC_PROFILES[ent];
        if (prof && prof.circle) {
          for (const friendId of prof.circle) {
            recordNpcMemory(state, friendId, {
              sourceEntity: ent,
              title: `Heard from ${D.NPCS[ent]?.name || ent}: ${mem.title}`,
              context: mem.context,
              importance: D.MEMORY_IMPORTANCE.FLEETING,
              clock: state.clock
            });
          }
        }
      }
    }
  }
}

export function createRumor(state, rumorData) {
  return recordMemory(state, {
    ...rumorData,
    visibility: 'rumor',
    isRumor: true
  });
}

export function verifyRumor(state, memoryId) {
  ensureWorldMemory(state);
  const mem = state.memories.find((m) => m.id === Number(memoryId));
  if (!mem) return { ok: false, error: 'Memory record not found.' };
  if (!mem.isRumor && mem.verified) return { ok: true, message: 'This fact is already confirmed and verified.' };

  mem.isRumor = false;
  mem.verified = true;
  NOTES.push(`Rumor verified: "${mem.title}". It is now a confirmed fact.`);

  recordNpcMemory(state, mem.entities[0] || 'dani', {
    sourceEntity: 'pithe',
    title: `Pithe verified rumor: ${mem.title}`,
    context: 'Discussed and confirmed the authenticity of the information.',
    importance: D.MEMORY_IMPORTANCE.NOTABLE,
    clock: state.clock
  });

  return { ok: true, memory: mem };
}

export function processAutonomousNpcLives(state) {
  ensureWorldMemory(state);
  const curDay = dayKey(state.clock);
  const curWeek = weekStart(curDay);

  for (const [npcId, sim] of Object.entries(state.npcSim)) {
    const prof = D.NPC_PROFILES[npcId];
    if (!prof) continue;

    if (sim.lastDayProcessed !== curDay) {
      sim.lastDayProcessed = curDay;
      const wd = weekdayOf(state.clock);
      if (wd === 0 || wd === 6) {
        sim.currentActivity = 'weekend_leisure';
      } else {
        sim.currentActivity = 'professional_duties';
      }
    }

    if (sim.lastWeekProcessed !== curWeek) {
      sim.lastWeekProcessed = curWeek;
      sim.goalProgress = (sim.goalProgress || 0) + 1;
      if (sim.goalProgress >= 4) {
        sim.goalProgress = 0;
        const milestoneMsg = `${D.NPCS[npcId]?.name || npcId} accomplished personal milestone: ${prof.goal}.`;
        recordNpcMemory(state, npcId, {
          sourceEntity: 'self',
          title: 'Personal milestone achieved',
          context: prof.goal,
          importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
          clock: state.clock
        });
        recordMemory(state, {
          type: 'npc_milestone',
          title: milestoneMsg,
          entities: [npcId],
          location: prof.workplace,
          importance: D.MEMORY_IMPORTANCE.NOTABLE,
          visibility: 'public',
          context: `Colleagues and locals noted ${D.NPCS[npcId]?.name || npcId}'s progress.`
        });
      }
    }
  }
}

// ---------------------------------------------------------------- career & employment engine
export function ensureCareer(state) {
  if (!state.career) {
    state.career = {
      currentJob: null,
      performance: 70,
      experienceDays: 0,
      shiftsWorked: 0,
      history: [],
      appliedJobs: []
    };
  }
}

export function checkJobPrerequisites(state, jobId) {
  const job = D.JOBS[jobId];
  if (!job) return { ok: false, error: 'Job not found in database.' };
  const req = job.requirements;
  if (!req) return { ok: true };

  if (req.qualification) {
    state.education = state.education || { enrolled: [], completed: [], qualifications: [] };
    if (!state.education.qualifications.includes(req.qualification)) {
      const prog = D.EDUCATION_PROGRAMS[req.qualification];
      return { ok: false, error: `Requires qualification: ${prog ? prog.name : req.qualification}.` };
    }
  }

  if (req.attributes) {
    for (const [attr, minVal] of Object.entries(req.attributes)) {
      if ((state.character.attributes[attr] || 0) < minVal) {
        return { ok: false, error: `Requires ${attrName(attr)} at level ${minVal} or higher (current: ${state.character.attributes[attr] || 0}).` };
      }
    }
  }

  if (req.skills) {
    for (const [sk, minVal] of Object.entries(req.skills)) {
      const curLv = state.character.skills[sk] ? state.character.skills[sk].level : 0;
      if (curLv < minVal) {
        return { ok: false, error: `Requires ${skillName(sk)} at level ${minVal} or higher (current: ${curLv}).` };
      }
    }
  }

  if (req.expDays && (state.career?.experienceDays || 0) < req.expDays) {
    return { ok: false, error: `Requires at least ${req.expDays} days of career experience (current: ${state.career?.experienceDays || 0}).` };
  }

  return { ok: true };
}

function doJobApply(state, jobId) {
  ensureCareer(state);
  const job = D.JOBS[jobId];
  if (!job) return { error: 'Unknown job vacancy.' };
  if (state.career.currentJob === jobId) return { error: `You are already employed as ${job.title} at ${job.company}.` };

  const check = checkJobPrerequisites(state, jobId);
  if (!check.ok) return { error: check.error };

  state.career.history.push({
    action: 'hired', jobId, title: job.title, company: job.company, clock: state.clock, date: formatDateOnly(state.clock)
  });
  state.career.currentJob = jobId;
  state.career.performance = 75;

  recordChronicle(state, {
    category: 'career',
    title: `Hired as ${job.title}`,
    desc: `Joined ${job.company} as ${job.title} in the ${job.industry} sector with a starting salary of ${job.salary} money/week.`
  });
  NOTES.push(`Congratulations! You were hired as ${job.title} at ${job.company}.`);

  return {
    title: `Employment Offer: ${job.title}`,
    narrative: [
      `Your credentials and portfolio made an immediate impression at ${job.company}.`,
      `You are officially hired as ${job.title}! Weekly salary: ${job.salary} money.`
    ]
  };
}

// ==============================================================================
// PHASE 5 - EMERGENT WORLD & STORYTELLING ENGINE
// ==============================================================================

export function ensurePhase5(state) {
  if (!state.stories) {
    state.stories = {
      active: [],     // Array of active story instances
      history: [],    // Array of resolved/expired story summaries
      discovered: {}  // storyId: true/false whether player learned of it
    };
  }
  if (!Array.isArray(state.stories.active)) state.stories.active = [];
  if (!Array.isArray(state.stories.history)) state.stories.history = [];
  if (!state.stories.discovered) state.stories.discovered = {};
}

export function processEmergentStories(state) {
  ensurePhase5(state);
  ensureWorldMemory(state);

  const curClock = state.clock;
  const remainingActive = [];

  for (const story of state.stories.active) {
    const tmpl = D.STORY_TEMPLATES[story.templateId];
    if (!tmpl) continue;

    const currentStageDef = tmpl.stages.find((s) => s.id === story.stageId);
    if (!currentStageDef) {
      story.resolved = true;
      story.outcomeState = 'expired_unresolved';
      state.stories.history.push({
        id: story.id,
        templateId: story.templateId,
        title: tmpl.title,
        resolvedClock: curClock,
        playerParticipated: story.playerParticipated,
        outcomeState: story.outcomeState,
        summary: 'Story elapsed without external intervention.'
      });
      continue;
    }

    // Check if stage deadline passed
    if (curClock >= story.stageDeadline) {
      if (currentStageDef.resolved) {
        // Story concludes naturally
        story.resolved = true;
        story.outcomeState = story.outcomeState || currentStageDef.outcomeState || 'concluded';
        state.stories.history.push({
          id: story.id,
          templateId: story.templateId,
          title: tmpl.title,
          resolvedClock: curClock,
          playerParticipated: story.playerParticipated,
          outcomeState: story.outcomeState,
          summary: story.resolutionSummary || currentStageDef.summary
        });
        if (state.stories.history.length > (D.MAX_STORY_HISTORY || 40)) {
          state.stories.history.shift();
        }
        continue;
      }

      // Autonomous NPC progression if not resolved by player
      const auto = currentStageDef.autonomousOutcome;
      if (auto) {
        story.autonomousProgressions = (story.autonomousProgressions || 0) + 1;
        if (auto.consequences) {
          if (auto.consequences.relationsMod) {
            for (const [npc, amt] of Object.entries(auto.consequences.relationsMod)) {
              addRel(state, npc, amt);
            }
          }
          if (auto.consequences.memory) {
            recordMemory(state, {
              type: 'story_autonomous',
              title: `${tmpl.title}: autonomous progression`,
              entities: [tmpl.primaryNpc, ...(tmpl.secondaryNpc ? [tmpl.secondaryNpc] : [])],
              location: tmpl.location,
              importance: D.MEMORY_IMPORTANCE.NOTABLE,
              context: auto.consequences.memory
            });
          }
        }

        if (auto.resolved) {
          story.resolved = true;
          story.outcomeState = auto.outcomeState || 'autonomous_resolution';
          story.resolutionSummary = auto.summary;
          state.stories.history.push({
            id: story.id,
            templateId: story.templateId,
            title: tmpl.title,
            resolvedClock: curClock,
            playerParticipated: story.playerParticipated,
            outcomeState: story.outcomeState,
            summary: auto.summary
          });
          if (state.stories.history.length > (D.MAX_STORY_HISTORY || 40)) {
            state.stories.history.shift();
          }
          continue;
        } else if (auto.nextStage) {
          const nextDef = tmpl.stages.find((s) => s.id === auto.nextStage);
          if (nextDef) {
            story.stageId = auto.nextStage;
            story.stageEnteredClock = curClock;
            story.stageDeadline = curClock + (nextDef.durationDays || 3) * 1440;
            story.log.push({
              clock: curClock,
              event: `Progressed autonomously to: ${nextDef.title}`,
              desc: auto.summary
            });
            remainingActive.push(story);
            continue;
          }
        }
      }

      // If no next stage or autonomous definition, mark as concluded
      story.resolved = true;
      story.outcomeState = 'expired_unresolved';
      state.stories.history.push({
        id: story.id,
        templateId: story.templateId,
        title: tmpl.title,
        resolvedClock: curClock,
        playerParticipated: story.playerParticipated,
        outcomeState: story.outcomeState,
        summary: `Story elapsed without external intervention.`
      });
      continue;
    }

    remainingActive.push(story);
  }

  state.stories.active = remainingActive;

  // Potential spawn of new emergent stories
  if (state.stories.active.length < (D.MAX_ACTIVE_STORIES || 6)) {
    for (const [templateId, tmpl] of Object.entries(D.STORY_TEMPLATES)) {
      // Prevent duplicate active story of same template
      if (state.stories.active.some((s) => s.templateId === templateId)) continue;

      // Check cooldown from last resolution
      const last = [...state.stories.history].reverse().find((h) => h.templateId === templateId);
      const cooldownMinutes = (tmpl.cooldownDays || 21) * 1440;
      if (last && (curClock - last.resolvedClock) < cooldownMinutes) continue;

      // Check template trigger condition
      if (typeof tmpl.triggerCondition === 'function') {
        if (!tmpl.triggerCondition(state)) continue;
      }

      // Spawn story
      const initialStage = tmpl.stages[0];
      const storyId = `story_${nextId(state)}`;
      const newStory = {
        id: storyId,
        templateId,
        title: tmpl.title,
        theme: tmpl.theme,
        location: tmpl.location,
        participants: [tmpl.primaryNpc, ...(tmpl.secondaryNpc ? [tmpl.secondaryNpc] : [])],
        stageId: initialStage.id,
        stageEnteredClock: curClock,
        stageDeadline: curClock + (initialStage.durationDays || 3) * 1440,
        playerParticipated: false,
        resolved: false,
        outcomeState: null,
        decisions: [],
        log: [
          {
            clock: curClock,
            event: `Story emerged: ${initialStage.title}`,
            desc: initialStage.summary
          }
        ]
      };

      state.stories.active.push(newStory);

      // Record inciting world memory
      recordMemory(state, {
        type: 'story_inciting',
        title: `${tmpl.title}: ${initialStage.title}`,
        entities: newStory.participants,
        location: tmpl.location,
        importance: D.MEMORY_IMPORTANCE.NOTABLE,
        visibility: 'neighborhood',
        context: initialStage.summary
      });

      // Spread rumor if defined
      if (tmpl.rumor) {
        createRumor(state, {
          title: tmpl.rumor.title,
          context: tmpl.rumor.context,
          location: tmpl.rumor.location || tmpl.location,
          entities: newStory.participants,
          importance: D.MEMORY_IMPORTANCE.FLEETING
        });
      }

      // Check if player reaches max active
      if (state.stories.active.length >= (D.MAX_ACTIVE_STORIES || 6)) break;
    }
  }
}

export function advanceStoryToStage(state, storyId, targetStageId, note = '') {
  ensurePhase5(state);
  const story = state.stories.active.find((s) => s.id === storyId);
  if (!story) return;

  const tmpl = D.STORY_TEMPLATES[story.templateId];
  if (!tmpl) return;

  const targetStage = tmpl.stages.find((s) => s.id === targetStageId);
  if (!targetStage) return;

  story.stageId = targetStageId;
  story.stageEnteredClock = state.clock;
  story.stageDeadline = state.clock + (targetStage.durationDays || 3) * 1440;
  story.log.push({
    clock: state.clock,
    event: `Story progressed to: ${targetStage.title}`,
    desc: note || targetStage.summary
  });

  if (targetStage.resolved) {
    story.resolved = true;
    story.outcomeState = targetStage.outcomeState || 'concluded';
  }
}

export function doStoryDiscover(state, storyId) {
  ensurePhase5(state);
  const story = state.stories.active.find((s) => s.id === storyId);
  if (!story) return { error: 'Story not found or already concluded.' };
  state.stories.discovered[storyId] = true;
  return {
    title: `Discovered: ${story.title}`,
    narrative: [`You learned about developments unfolding regarding "${story.title}".`]
  };
}

export function checkStoryChoiceRequirements(state, choice) {
  if (!choice.requirements) return { ok: true };
  const req = choice.requirements;

  if (req.money && state.money < req.money) {
    return { ok: false, error: `Requires ${req.money} money (you have ${state.money}).` };
  }
  if (req.energy && state.needs.energy < req.energy) {
    return { ok: false, error: `Requires at least ${req.energy} energy.` };
  }
  if (req.skills) {
    for (const [sk, lvl] of Object.entries(req.skills)) {
      if ((state.character.skills[sk]?.level || 0) < lvl) {
        const skName = D.SKILLS.find((s) => s.id === sk)?.name || sk;
        return { ok: false, error: `Requires ${skName} Level ${lvl} or higher.` };
      }
    }
  }
  if (req.attributes) {
    for (const [att, val] of Object.entries(req.attributes)) {
      if ((state.character.attributes[att] || 0) < val) {
        const aName = D.ATTRIBUTES.find((a) => a.id === att)?.name || att;
        return { ok: false, error: `Requires ${aName} ${val} or higher.` };
      }
    }
  }
  if (req.reputation) {
    for (const [dom, minVal] of Object.entries(req.reputation)) {
      if ((state.reputation[dom] || 0) < minVal) {
        const domName = D.REPUTATION_DOMAINS[dom]?.name || dom;
        return { ok: false, error: `Requires at least ${minVal} ${domName} reputation.` };
      }
    }
  }
  return { ok: true };
}

export function doStoryDecision(state, storyId, choiceId) {
  ensurePhase5(state);
  ensurePhase4(state);
  ensureWorldMemory(state);

  const story = state.stories.active.find((s) => s.id === storyId);
  if (!story) return { error: 'Story storyline not found or has concluded.' };

  const tmpl = D.STORY_TEMPLATES[story.templateId];
  if (!tmpl) return { error: 'Story template data missing.' };

  const currentStage = tmpl.stages.find((s) => s.id === story.stageId);
  if (!currentStage) return { error: 'Current story stage not found.' };

  const choice = (currentStage.choices || []).find((c) => c.id === choiceId);
  if (!choice) return { error: 'Invalid story decision choice.' };

  // Context check: Must be at story location or in conversation with an involved NPC
  const atLocation = state.location === tmpl.location || (currentStage.discovery?.location && state.location === currentStage.discovery.location);
  if (!atLocation) {
    const locName = D.LOCATIONS[tmpl.location]?.name || tmpl.location;
    return { error: `Must be at ${locName} to participate in this decision.` };
  }

  // Requirements check
  const reqCheck = checkStoryChoiceRequirements(state, choice);
  if (!reqCheck.ok) return { error: reqCheck.error };

  const csq = choice.consequences || {};

  // Deduct resources
  if (csq.money) {
    transact(state, { amount: csq.money, category: 'story', desc: `${story.title}: ${choice.label}` });
  }
  if (csq.energy) {
    state.needs.energy = clamp(state.needs.energy + csq.energy, 0, 100);
  }
  if (csq.satiety) {
    state.needs.satiety = clamp(state.needs.satiety + csq.satiety, 0, 100);
  }

  // Grant rewards
  if (csq.exp) grantExp(state, csq.exp);
  if (csq.skillExp) {
    for (const [sk, exp] of Object.entries(csq.skillExp)) {
      grantSkillExp(state, sk, exp);
    }
  }
  if (csq.reputation) {
    for (const [dom, amt] of Object.entries(csq.reputation)) {
      adjustReputation(state, dom, amt, `${tmpl.title}`);
    }
  }
  if (csq.relations) {
    for (const [npc, amt] of Object.entries(csq.relations)) {
      addRel(state, npc, amt);
      recordNpcMemory(state, npc, {
        sourceEntity: 'pithe',
        title: `Story choice: ${choice.label}`,
        context: `${csq.memory || choice.desc}`,
        importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
        clock: state.clock
      });
    }
  }

  // Record player involvement
  story.playerParticipated = true;
  state.stories.discovered[storyId] = true;
  story.decisions.push({
    clock: state.clock,
    stageId: currentStage.id,
    choiceId: choice.id,
    label: choice.label,
    desc: choice.desc
  });

  // Advance time
  advance(state, choice.minutes || 45);

  // Record memory
  if (csq.memory) {
    recordMemory(state, {
      type: 'story_decision',
      title: `${tmpl.title}: ${choice.label}`,
      entities: ['pithe', ...story.participants],
      location: tmpl.location,
      importance: D.MEMORY_IMPORTANCE.MAJOR,
      visibility: 'public',
      context: csq.memory
    });
  }

  // Chronicle recording
  recordChronicle(state, {
    category: 'community',
    title: `${tmpl.title}`,
    desc: `${choice.label} - ${csq.memory || choice.desc}`
  });

  // Delayed consequence scheduling
  if (csq.delayed) {
    scheduleCausalTrigger(state, {
      delayMinutes: csq.delayed.delayMinutes,
      title: csq.delayed.title,
      action: csq.delayed.action,
      data: {
        storyId: story.id,
        targetStage: csq.delayed.data?.targetStage,
        ...csq.delayed.data
      }
    });
  }

  // Stage transition or resolution
  let narrativeOutcome = [`You chose: "${choice.label}".`, choice.desc];
  if (csq.memory) narrativeOutcome.push(csq.memory);

  if (csq.resolved || choice.resolved) {
    story.resolved = true;
    story.outcomeState = csq.outcomeState || choice.outcomeState || 'resolved';
    story.resolutionSummary = csq.memory || choice.desc;
    state.stories.history.push({
      id: story.id,
      templateId: story.templateId,
      title: tmpl.title,
      resolvedClock: state.clock,
      playerParticipated: true,
      outcomeState: story.outcomeState,
      summary: story.resolutionSummary
    });
    if (state.stories.history.length > (D.MAX_STORY_HISTORY || 40)) {
      state.stories.history.shift();
    }
    // Remove from active list
    state.stories.active = state.stories.active.filter((s) => s.id !== story.id);
    narrativeOutcome.push(`Storyline Resolved: ${story.outcomeState.replace(/_/g, ' ')}.`);

    // Check achievement for story resolution
    checkStoryAchievements(state);
  } else if (csq.nextStage || choice.nextStage) {
    const nextStId = csq.nextStage || choice.nextStage;
    const nextDef = tmpl.stages.find((s) => s.id === nextStId);
    if (nextDef) {
      story.stageId = nextStId;
      story.stageEnteredClock = state.clock;
      story.stageDeadline = state.clock + (nextDef.durationDays || 3) * 1440;
      story.log.push({
        clock: state.clock,
        event: `Progressed to: ${nextDef.title}`,
        desc: nextDef.summary
      });
      narrativeOutcome.push(`The situation progresses to: "${nextDef.title}".`);
    }
  }

  return {
    title: `${tmpl.title}: Decision`,
    narrative: narrativeOutcome
  };
}

export function checkStoryAchievements(state) {
  ensurePhase4(state);
  ensurePhase5(state);
  const achs = state.achievements;
  const unlock = (id) => {
    if (achs.unlocked[id]) return;
    const def = D.ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;
    achs.unlocked[id] = { clock: state.clock, date: formatDateOnly(state.clock) };
    achs.history.push({ id, clock: state.clock, date: formatDateOnly(state.clock), name: def.name, category: def.category });
    recordChronicle(state, {
      category: 'achievement',
      title: `Achievement: ${def.name}`,
      desc: def.desc
    });
    NOTES.push(`Achievement Unlocked: ${def.name}!`);
  };

  const resolvedCount = (state.stories.history || []).filter((h) => h.playerParticipated).length;
  if (resolvedCount >= 1) unlock('first_story_resolution');
  if (resolvedCount >= 3) unlock('storyteller_legend');
}

export function getDiscoveredStories(state) {
  ensurePhase5(state);
  return (state.stories.active || []).filter((s) => state.stories.discovered[s.id]);
}

export function getStoriesAtLocation(state, locationId) {
  ensurePhase5(state);
  return (state.stories.active || []).filter((s) => s.location === locationId);
}

export function getStoriesForNpc(state, npcId) {
  ensurePhase5(state);
  return (state.stories.active || []).filter((s) => s.participants && s.participants.includes(npcId));
}

function doJobWork(state) {
  ensureCareer(state);
  if (!state.career.currentJob) return { error: 'You are not currently employed. Browse available jobs under Career.' };
  const job = D.JOBS[state.career.currentJob];
  if (!job) return { error: 'Current job definition not found.' };

  if (state.needs.energy < 25) return { error: 'You are too exhausted to complete a full work shift.' };

  state.needs.energy = Math.max(0, state.needs.energy - 24);
  state.needs.satiety = Math.max(0, state.needs.satiety - 12);
  state.career.shiftsWorked = (state.career.shiftsWorked || 0) + 1;
  state.career.experienceDays = (state.career.experienceDays || 0) + 0.5;

  const perfDelta = state.needs.energy >= 40 ? 3 : -2;
  state.career.performance = clamp(state.career.performance + perfDelta, 20, 100);

  grantExp(state, 15);
  if (job.industry === 'Technology') grantSkillExp(state, 'programming', 12);
  else if (job.industry === 'Creative') grantSkillExp(state, 'design', 12);
  else if (job.industry === 'Finance') grantSkillExp(state, 'research', 12);
  else if (job.industry === 'Corporate') grantSkillExp(state, 'negotiation', 12);
  else if (job.industry === 'Hospitality') grantSkillExp(state, 'cooking', 12);
  else grantSkillExp(state, 'conversation', 10);

  advance(state, 240);

  return {
    title: `Work Shift: ${job.title}`,
    narrative: [
      `You completed a dedicated work shift at ${job.company}.`,
      `Job performance is currently rated at ${state.career.performance}/100.`
    ]
  };
}

function doJobPromote(state) {
  ensureCareer(state);
  if (!state.career.currentJob) return { error: 'You are not currently employed.' };
  const current = D.JOBS[state.career.currentJob];
  if (!current?.nextJob) return { error: 'No further promotion path available for this career track.' };
  const next = D.JOBS[current.nextJob];
  if (!next) return { error: 'Promotion tier not found.' };

  if (state.career.performance < 80) return { error: `Promotion requires a performance rating of at least 80/100 (current: ${state.career.performance}).` };
  const check = checkJobPrerequisites(state, next.id);
  if (!check.ok) return { error: `Cannot promote yet: ${check.error}` };

  state.career.currentJob = next.id;
  state.career.performance = 75;
  state.career.history.push({
    action: 'promoted', jobId: next.id, title: next.title, company: next.company, clock: state.clock, date: formatDateOnly(state.clock)
  });

  recordChronicle(state, {
    category: 'career',
    title: `Promoted to ${next.title}`,
    desc: `Earned a major career promotion at ${next.company} to ${next.title}. New salary: ${next.salary} money/week.`
  });
  NOTES.push(`Promotion achieved! You are now ${next.title} at ${next.company}.`);

  return {
    title: `Promotion: ${next.title}`,
    narrative: [
      `Your sustained performance and qualifications earned executive recognition.`,
      `You have been promoted to ${next.title}! New salary: ${next.salary} money/week.`
    ]
  };
}

function doJobResign(state) {
  ensureCareer(state);
  if (!state.career.currentJob) return { error: 'You are not currently employed.' };
  const job = D.JOBS[state.career.currentJob];
  state.career.history.push({
    action: 'resigned', jobId: state.career.currentJob, title: job ? job.title : 'Employed', company: job ? job.company : '', clock: state.clock, date: formatDateOnly(state.clock)
  });
  state.career.currentJob = null;
  state.career.performance = 70;

  NOTES.push(`You resigned from your job at ${job ? job.company : 'the workplace'}.`);
  return {
    title: 'Resignation Submitted',
    narrative: [`You tendered your formal resignation. You are now free to pursue new career paths or independent ventures.`]
  };
}

// ---------------------------------------------------------------- education & professional training engine
export function ensureEducation(state) {
  if (!state.education) {
    state.education = {
      enrolled: [],
      completed: [],
      qualifications: []
    };
  }
}

function doEduEnroll(state, progId) {
  ensureEducation(state);
  const prog = D.EDUCATION_PROGRAMS[progId];
  if (!prog) return { error: 'Education program not found.' };

  if (state.education.qualifications.includes(prog.qualification)) {
    return { error: `You have already earned the qualification from ${prog.name}.` };
  }
  if (state.education.enrolled.some((e) => e.id === progId)) {
    return { error: `You are already enrolled in ${prog.name}.` };
  }

  if (prog.requirements?.attributes) {
    for (const [attr, minVal] of Object.entries(prog.requirements.attributes)) {
      if ((state.character.attributes[attr] || 0) < minVal) {
        return { error: `Enrollment requires ${attrName(attr)} at level ${minVal} or higher.` };
      }
    }
  }

  if (state.money < prog.cost) return { error: `Tuition requires ${prog.cost} money (you have ${state.money}).` };
  transact(state, { amount: -prog.cost, category: 'education', desc: `Tuition for ${prog.name}` });

  state.education.enrolled.push({
    id: progId, hoursCompleted: 0, totalHours: prog.totalHoursNeeded
  });

  NOTES.push(`Enrolled in ${prog.name}. Paid ${prog.cost} money tuition.`);
  return {
    title: `Enrolled: ${prog.name}`,
    narrative: [
      `Your registration at ${prog.institution} is confirmed.`,
      `Commit regular study sessions to complete the curriculum and earn your qualification.`
    ]
  };
}

function doEduStudy(state, progId) {
  ensureEducation(state);
  const enrollment = state.education.enrolled.find((e) => e.id === progId);
  if (!enrollment) return { error: `You are not enrolled in this program.` };
  const prog = D.EDUCATION_PROGRAMS[progId];
  if (!prog) return { error: 'Program definition not found.' };

  if (state.needs.energy < 16) return { error: 'You are too tired to concentrate on academic coursework.' };

  state.needs.energy = Math.max(0, state.needs.energy - 14);
  state.needs.satiety = Math.max(0, state.needs.satiety - 6);
  enrollment.hoursCompleted += 2;

  grantExp(state, 12);
  grantSkillExp(state, 'research', 12);
  advance(state, 120);

  let graduated = false;
  if (enrollment.hoursCompleted >= enrollment.totalHours) {
    graduated = true;
    state.education.enrolled = state.education.enrolled.filter((e) => e.id !== progId);
    state.education.completed.push({ id: progId, date: formatDateOnly(state.clock) });
    if (!state.education.qualifications.includes(prog.qualification)) {
      state.education.qualifications.push(prog.qualification);
    }
    if (prog.rewards) {
      if (prog.rewards.skill && prog.rewards.skillExp) grantSkillExp(state, prog.rewards.skill, prog.rewards.skillExp);
      if (prog.rewards.exp) grantExp(state, prog.rewards.exp);
      if (prog.rewards.attr && prog.rewards.attrBonus) raiseAttribute(state, prog.rewards.attr, prog.rewards.attrBonus);
    }
    recordChronicle(state, {
      category: 'education',
      title: `Graduated: ${prog.name}`,
      desc: `Completed all curriculum requirements at ${prog.institution} and earned the ${prog.qualification} credential.`
    });
    NOTES.push(`Graduation! You earned ${prog.name} from ${prog.institution}!`);
  }

  return {
    title: graduated ? `Graduation: ${prog.name}` : `Study Session: ${prog.name}`,
    narrative: graduated
      ? [`You submitted your final capstone examination with flying colors!`, `You were awarded the official diploma for ${prog.name}.`]
      : [`You completed an intensive 2-hour lecture session.`, `Program progress: ${enrollment.hoursCompleted}/${enrollment.totalHours} hours completed.`]
  };
}

// ---------------------------------------------------------------- housing, property ownership & relocation
export function ensureHousing(state) {
  if (!state.housing) {
    state.housing = {
      primaryHome: 'rented_room',
      rentals: ['rented_room'],
      owned: []
    };
  }
}

function doPropertyRent(state, propId) {
  ensureHousing(state);
  const prop = D.PROPERTIES[propId];
  if (!prop) return { error: 'Property not found.' };
  if (state.housing.rentals.includes(propId)) return { error: `You are already renting ${prop.name}.` };
  if (state.housing.owned.includes(propId)) return { error: 'You already own this property.' };

  const firstMonthRent = prop.rentCost * 4;
  if (state.money < firstMonthRent) return { error: `Renting ${prop.name} requires first month's deposit of ${firstMonthRent} money (you have ${state.money}).` };

  transact(state, { amount: -firstMonthRent, category: 'housing', desc: `First month rental lease for ${prop.name}` });
  state.housing.rentals.push(propId);
  NOTES.push(`Signed rental lease for ${prop.name}. Paid deposit: ${firstMonthRent} money.`);

  return {
    title: `Lease Signed: ${prop.name}`,
    narrative: [
      `You finalized the rental contract for ${prop.name} at ${D.LOCATIONS[prop.location]?.name || prop.location}.`,
      `Weekly rent is ${prop.rentCost} money, billed monthly.`
    ]
  };
}

function doPropertyBuy(state, propId) {
  ensureHousing(state);
  const prop = D.PROPERTIES[propId];
  if (!prop) return { error: 'Property not found.' };
  if (!prop.canBuy) return { error: `${prop.name} cannot be purchased.` };
  if (state.housing.owned.includes(propId)) return { error: 'You already own this property.' };

  if (state.money < prop.buyPrice) return { error: `Purchasing ${prop.name} requires ${prop.buyPrice} money (you have ${state.money}).` };

  transact(state, { amount: -prop.buyPrice, category: 'property_purchase', desc: `Deed purchase of ${prop.name}` });
  state.housing.owned.push(propId);
  state.housing.rentals = state.housing.rentals.filter((id) => id !== propId);

  recordChronicle(state, {
    category: 'property',
    title: `Purchased ${prop.name}`,
    desc: `Acquired full ownership deed of ${prop.name} for ${prop.buyPrice} money.`
  });
  NOTES.push(`Property acquired! You now hold the deed to ${prop.name}.`);

  return {
    title: `Property Deed Acquired: ${prop.name}`,
    narrative: [`The deed and title transfer are finalized. You are the proud owner of ${prop.name}!`]
  };
}

function doPropertyMove(state, propId) {
  ensureHousing(state);
  const prop = D.PROPERTIES[propId];
  if (!prop) return { error: 'Property not found.' };
  if (prop.type !== 'residential') return { error: `${prop.name} is a commercial property and cannot be your primary residence.` };
  if (!state.housing.owned.includes(propId) && !state.housing.rentals.includes(propId)) {
    return { error: `You do not rent or own ${prop.name}. Lease or purchase it first.` };
  }
  if (state.housing.primaryHome === propId) return { error: 'This is already your primary residence.' };

  if (state.money < 20) return { error: 'Moving van and relocation services cost 20 money.' };
  transact(state, { amount: -20, category: 'relocation', desc: `Moving relocation services to ${prop.name}` });

  state.housing.primaryHome = propId;
  state.location = prop.location;

  recordChronicle(state, {
    category: 'relocation',
    title: `Relocated to ${prop.name}`,
    desc: `Moved primary residence to ${prop.name} in ${D.LOCATIONS[prop.location]?.name || prop.location}.`
  });
  NOTES.push(`You unpacked your belongings and settled into your new residence: ${prop.name}.`);
  advance(state, 180);

  return {
    title: `Moved to ${prop.name}`,
    narrative: [`The moving van delivered your boxes to ${prop.name}. Your primary home is now at ${D.LOCATIONS[prop.location]?.name || prop.location}.`]
  };
}

// ---------------------------------------------------------------- business ownership & management
export function ensureBusiness(state) {
  if (!state.business) {
    state.business = { owned: [] };
  }
}

function doBusinessFound(state, typeId, customName) {
  ensureBusiness(state);
  const def = D.BUSINESS_TYPES[typeId];
  if (!def) return { error: 'Business venture type not found.' };

  const name = String(customName || def.name).trim();
  if (state.money < def.startupCost) return { error: `Starting ${name} requires ${def.startupCost} initial capital (you have ${state.money}).` };

  transact(state, { amount: -def.startupCost, category: 'business_startup', desc: `Registration and capital for ${name}` });

  const newBiz = {
    id: nextId(state),
    type: typeId,
    name,
    establishedClock: state.clock,
    upgradeLevel: 0,
    staffCount: 1,
    reputation: 50,
    totalRevenue: 0,
    totalExpenses: 0
  };
  state.business.owned.push(newBiz);

  recordChronicle(state, {
    category: 'business',
    title: `Founded ${name}`,
    desc: `Officially incorporated ${name} in the ${def.industry} industry with ${def.startupCost} capital.`
  });
  NOTES.push(`Enterprise launched! You registered and opened ${name}.`);

  return {
    title: `Enterprise Founded: ${name}`,
    narrative: [`${name} is open for business. Weekly revenue and operating expenses will be processed automatically.`]
  };
}

function doBusinessManage(state, bizId, actionType) {
  ensureBusiness(state);
  const biz = state.business.owned.find((b) => b.id === Number(bizId));
  if (!biz) return { error: 'Business entity not found.' };

  if (actionType === 'hire') {
    const hiringCost = 40;
    if (state.money < hiringCost) return { error: `Recruiting an employee costs ${hiringCost} money.` };
    transact(state, { amount: -hiringCost, category: 'business', desc: `Recruitment fee for ${biz.name}` });
    biz.staffCount = (biz.staffCount || 1) + 1;
    biz.reputation = clamp((biz.reputation || 50) + 5, 0, 100);
    grantSkillExp(state, 'negotiation', 10);
    NOTES.push(`Hired an additional staff member for ${biz.name} (staff: ${biz.staffCount}).`);
    return {
      title: `Staff Recruited: ${biz.name}`,
      narrative: [`You hired an energetic new employee. Operational capacity and service quality improved.`]
    };
  } else if (actionType === 'upgrade') {
    const upgradeCost = 150 * ((biz.upgradeLevel || 0) + 1);
    if (state.money < upgradeCost) return { error: `Upgrading facilities costs ${upgradeCost} money.` };
    transact(state, { amount: -upgradeCost, category: 'business', desc: `Facility expansion for ${biz.name}` });
    biz.upgradeLevel = (biz.upgradeLevel || 0) + 1;
    biz.reputation = clamp((biz.reputation || 50) + 10, 0, 100);
    grantSkillExp(state, 'negotiation', 15);
    grantExp(state, 20);
    NOTES.push(`Facilities upgraded for ${biz.name} (Tier ${biz.upgradeLevel}).`);
    return {
      title: `Facility Upgraded: ${biz.name}`,
      narrative: [`Modern equipment and renovated premises were installed. Revenue potential has increased!`]
    };
  }
  return { error: 'Unknown business management action.' };
}

// ---------------------------------------------------------------- social relationships, romance, marriage & family
export function ensureRelationships(state) {
  if (!state.relationships) {
    state.relationships = {};
  }
  for (const npcId of Object.keys(D.NPCS)) {
    if (!state.relationships[npcId]) {
      const trust = state.relations[npcId] || 0;
      state.relationships[npcId] = {
        affinity: trust >= 10 ? 20 : 0,
        trust: trust,
        status: trust >= 30 ? 'friend' : trust >= 10 ? 'acquaintance' : 'stranger',
        romanceStatus: 'none',
        history: []
      };
    }
  }
}

export function ensureFamily(state) {
  if (!state.family) {
    state.family = {
      spouse: null,
      children: [],
      tree: []
    };
  }
}

function doSocialInteract(state, npcId, type) {
  ensureRelationships(state);
  const npc = D.NPCS[npcId];
  if (!npc) return { error: 'Individual not found.' };
  const rel = state.relationships[npcId];

  if (state.needs.energy < 10) return { error: 'You are too exhausted for social engagement.' };

  state.needs.energy = Math.max(0, state.needs.energy - 8);
  advance(state, 60);

  if (type === 'hangout') {
    rel.affinity = clamp(rel.affinity + 6, 0, 100);
    rel.trust = clamp(rel.trust + 4, -100, 100);
    state.relations[npcId] = rel.trust;
    if (rel.affinity >= 40 && rel.status === 'acquaintance') rel.status = 'friend';
    if (rel.affinity >= 70 && rel.status === 'friend') rel.status = 'close_friend';
    grantSkillExp(state, 'conversation', 10);
    grantExp(state, 8);
    recordNpcMemory(state, npcId, {
      sourceEntity: 'pithe',
      title: `Spent casual social time with Pithe`,
      context: 'Met up for coffee and engaging conversation.',
      importance: D.MEMORY_IMPORTANCE.NOTABLE,
      clock: state.clock
    });
    recordMemory(state, {
      type: 'social',
      title: `Pithe spent time with ${npc.name}`,
      entities: ['pithe', npcId],
      location: state.location,
      importance: D.MEMORY_IMPORTANCE.FLEETING,
      visibility: 'public',
      context: `Pithe and ${npc.name} had a friendly hangout.`
    });
    NOTES.push(`Spent quality time with ${npc.name}. Affinity and trust grew.`);
    return {
      title: `Social Outing with ${npc.name}`,
      narrative: [
        `You and ${npc.name} met up for coffee and an engaging conversation about work and life.`,
        `Relationship status with ${npc.name}: ${rel.status} (Affinity: ${rel.affinity}/100, Trust: ${rel.trust}).`
      ]
    };
  } else if (type === 'gift') {
    const giftCost = 25;
    if (state.money < giftCost) return { error: `Purchasing a thoughtful gift costs ${giftCost} money.` };
    transact(state, { amount: -giftCost, category: 'gift', desc: `Gift for ${npc.name}` });
    rel.affinity = clamp(rel.affinity + 12, 0, 100);
    rel.trust = clamp(rel.trust + 5, -100, 100);
    state.relations[npcId] = rel.trust;
    recordNpcMemory(state, npcId, {
      sourceEntity: 'pithe',
      title: `Received a thoughtful gift from Pithe`,
      context: 'Pithe surprised them with a generous gift.',
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
      clock: state.clock
    });
    recordMemory(state, {
      type: 'gift',
      title: `Pithe gave a thoughtful gift to ${npc.name}`,
      entities: ['pithe', npcId],
      location: state.location,
      importance: D.MEMORY_IMPORTANCE.NOTABLE,
      visibility: 'public',
      context: `${npc.name} warmly appreciated the thoughtful gesture.`
    });
    NOTES.push(`Gave a thoughtful gift to ${npc.name}. They were delighted!`);
    return {
      title: `Gift Presented to ${npc.name}`,
      narrative: [
        `You surprised ${npc.name} with a carefully chosen present.`,
        `They expressed heartfelt appreciation for your generosity.`
      ]
    };
  }
  return { error: 'Unknown social interaction type.' };
}

function doRomanceAction(state, npcId, actionType) {
  ensureRelationships(state);
  ensureFamily(state);
  const npc = D.NPCS[npcId];
  if (!npc) return { error: 'Individual not found.' };
  const rel = state.relationships[npcId];

  if (actionType === 'date') {
    if (rel.affinity < 30) return { error: `${npc.name} does not know you well enough to go on a date (Affinity ${rel.affinity}/100, need 30).` };
    const dateCost = 35;
    if (state.money < dateCost) return { error: `An evening dinner date costs ${dateCost} money.` };
    transact(state, { amount: -dateCost, category: 'entertainment', desc: `Dinner date with ${npc.name}` });
    rel.affinity = clamp(rel.affinity + 10, 0, 100);
    rel.trust = clamp(rel.trust + 6, -100, 100);
    state.relations[npcId] = rel.trust;
    if (rel.romanceStatus === 'none') rel.romanceStatus = 'dating';
    state.needs.energy = Math.max(0, state.needs.energy - 10);
    advance(state, 120);

    NOTES.push(`Romantic date with ${npc.name}. Relationship blossomed.`);
    return {
      title: `Romantic Evening with ${npc.name}`,
      narrative: [
        `You shared a wonderful dinner with ${npc.name} at a candlelit waterfront table.`,
        `Sparks flew over dessert as you discussed shared dreams and personal passions.`
      ]
    };
  } else if (actionType === 'partner') {
    if (rel.affinity < 60) return { error: `Deep romantic partnership requires at least 60 Affinity (currently ${rel.affinity}/100).` };
    if (rel.romanceStatus === 'partner' || rel.romanceStatus === 'spouse') return { error: `You are already official partners with ${npc.name}.` };
    rel.romanceStatus = 'partner';
    rel.affinity = clamp(rel.affinity + 15, 0, 100);
    recordChronicle(state, {
      category: 'romance',
      title: `Official Partnership with ${npc.name}`,
      desc: `Deepened bond with ${npc.name} into an official loving partnership.`
    });
    NOTES.push(`You and ${npc.name} are now officially romantic partners.`);
    return {
      title: `Partnership: ${npc.name}`,
      narrative: [
        `You had an honest, heartfelt talk with ${npc.name} about your mutual feelings.`,
        `Both of you agreed to commit to an official romantic partnership!`
      ]
    };
  } else if (actionType === 'propose') {
    if (state.family.spouse) return { error: `You are already married to ${state.family.spouse.name}.` };
    if (rel.romanceStatus !== 'partner') return { error: `You must be in an established partnership with ${npc.name} before proposing marriage.` };
    if (rel.affinity < 85 || rel.trust < 50) return { error: `A marriage proposal requires at least 85 Affinity and 50 Trust (have Affinity ${rel.affinity}, Trust ${rel.trust}).` };

    const ringCost = 300;
    if (state.money < ringCost) return { error: `An engagement ring costs ${ringCost} money.` };
    transact(state, { amount: -ringCost, category: 'ring', desc: `Engagement ring for ${npc.name}` });

    rel.romanceStatus = 'spouse';
    state.family.spouse = {
      npcId,
      name: npc.name,
      weddingDate: formatDateOnly(state.clock),
      clock: state.clock
    };
    state.family.tree.push({ role: 'Spouse', name: npc.name, since: formatDateOnly(state.clock) });

    recordChronicle(state, {
      category: 'marriage',
      title: `Married ${npc.name}`,
      desc: `Exchanged wedding vows with ${npc.name} in a beautiful ceremony. Began married family life together.`
    });
    NOTES.push(`Wedding bells! You are now happily married to ${npc.name}!`);

    return {
      title: `Wedding: Married to ${npc.name}`,
      narrative: [
        `You proposed with an elegant ring, and ${npc.name} said YES with joyful tears!`,
        `You exchanged vows in a celebratory ceremony witnessed by friends and colleagues.`
      ]
    };
  } else if (actionType === 'breakup') {
    if (rel.romanceStatus === 'none') return { error: `You are not in a romantic relationship with ${npc.name}.` };
    const wasSpouse = rel.romanceStatus === 'spouse';
    rel.romanceStatus = 'ex';
    rel.affinity = clamp(rel.affinity - 40, 0, 100);
    rel.trust = clamp(rel.trust - 25, -100, 100);
    state.relations[npcId] = rel.trust;
    if (wasSpouse && state.family.spouse?.npcId === npcId) {
      state.family.spouse = null;
    }
    NOTES.push(`Romantic relationship with ${npc.name} ended.`);
    return {
      title: `Separation: ${npc.name}`,
      narrative: [`You and ${npc.name} parted ways romantically, leaving behind memories of your time together.`]
    };
  }
  return { error: 'Unknown romance action.' };
}

function doFamilyAction(state, actionType, childName) {
  ensureFamily(state);
  ensureHousing(state);
  if (actionType === 'have_child') {
    if (!state.family.spouse) return { error: 'Starting a family requires a married spouse.' };
    const prop = D.PROPERTIES[state.housing.primaryHome];
    if (prop && prop.maxOccupants <= 1 + state.family.children.length) {
      return { error: `Your current residence (${prop.name}) does not have enough rooms for a child. Move to a larger apartment or house.` };
    }
    const name = String(childName || 'Pithe Jr').trim();
    const newChild = {
      id: nextId(state),
      name,
      birthClock: state.clock,
      birthDate: formatDateOnly(state.clock),
      birthYear: dateParts(state.clock).year,
      age: 0,
      relationshipScore: 80
    };
    state.family.children.push(newChild);
    state.family.tree.push({ role: 'Child', name, birthYear: newChild.birthYear });

    recordChronicle(state, {
      category: 'family',
      title: `Welcomed Child: ${name}`,
      desc: `Celebrated the joyful birth and arrival of your child, ${name}, into the family household.`
    });
    NOTES.push(`Joyful news! Welcomed ${name} into the family!`);

    return {
      title: `Child Welcomed: ${name}`,
      narrative: [
        `A healthy, beautiful baby was born to your family!`,
        `Pithe and ${state.family.spouse.name} welcomed ${name} with overwhelming love and joy.`
      ]
    };
  } else if (actionType === 'parenting') {
    if (!state.family.children.length) return { error: 'You do not have any children to care for.' };
    if (state.needs.energy < 15) return { error: 'You are too tired for active parenting duties right now.' };

    state.needs.energy = Math.max(0, state.needs.energy - 12);
    state.needs.satiety = Math.max(0, state.needs.satiety - 6);
    for (const ch of state.family.children) {
      ch.relationshipScore = clamp((ch.relationshipScore || 80) + 5, 0, 100);
    }
    grantSkillExp(state, 'cooking', 8);
    grantExp(state, 12);
    advance(state, 120);

    NOTES.push('Spent heartwarming family time caring for your children.');
    return {
      title: 'Family Time & Parenting',
      narrative: [
        `You read bedtime stories, cooked nutritious meals, and helped your children with homework.`,
        `The home filled with laughter and mutual affection.`
      ]
    };
  }
  return { error: 'Unknown family action.' };
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
    recordMemory(state, {
      type: 'quest_completed',
      title: 'Pithe delivered the new menu to Dani',
      entities: ['pithe', 'dani'],
      location: 'cafe',
      importance: D.MEMORY_IMPORTANCE.MAJOR,
      context: `Pithe successfully completed Dani's menu commission with ${q.outcome} quality.`
    });
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
  const r = D.TRACKER_REWARD;
  grantExp(state, r.exp);
  if (goal && goal.linkedSkill) grantSkillExp(state, goal.linkedSkill, r.skillExp);
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
    case 'job_apply': res = doJobApply(state, action.id); break;
    case 'job_work': res = doJobWork(state); break;
    case 'job_promote': res = doJobPromote(state); break;
    case 'job_resign': res = doJobResign(state); break;
    case 'edu_enroll': res = doEduEnroll(state, action.id); break;
    case 'edu_study': res = doEduStudy(state, action.id); break;
    case 'property_rent': res = doPropertyRent(state, action.id); break;
    case 'property_buy': res = doPropertyBuy(state, action.id); break;
    case 'property_move': res = doPropertyMove(state, action.id); break;
    case 'business_found': res = doBusinessFound(state, action.id, action.name); break;
    case 'business_manage': res = doBusinessManage(state, action.id, action.manageType); break;
    case 'social_interact': res = doSocialInteract(state, action.npc, action.interactType); break;
    case 'romance_action': res = doRomanceAction(state, action.npc, action.romanceType); break;
    case 'family_action': res = doFamilyAction(state, action.familyType, action.childName); break;
    case 'event_participate': res = doEventParticipate(state, action.id); break;
    case 'verify_rumor': res = verifyRumor(state, action.id); break;
    case 'choose_specialization': res = doChooseSpecialization(state, action.skillId, action.specId); break;
    case 'org_join': res = doOrgJoin(state, action.id); break;
    case 'org_contribute': res = doOrgContribute(state, action.id, action.contribId); break;
    case 'competition_enter': res = doCompetitionEnter(state, action.id, action.strategyId); break;
    case 'career_mentorship': res = doCareerMentorship(state, action.npc); break;
    case 'story_decision': res = doStoryDecision(state, action.storyId, action.choiceId); break;
    case 'story_discover': res = doStoryDiscover(state, action.storyId); break;
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
  // A one-off task is stored as a goal with a target of 1, so it uses the existing completion, history and reward code.
  const oneOff = o.kind === 'task';
  const kind = o.kind === 'goal' || oneOff ? 'goal' : 'habit';
  const cadence = o.cadence === 'weekly' ? 'weekly' : 'daily';
  let target = 0;
  if (oneOff) target = 1;
  else if (kind === 'goal') {
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
  const entry = { date: today, ts: nowIso, note: String(note).trim().slice(0, 200) };
  g.completions.push(entry);
  let finished = false;
  if (g.kind === 'goal' && g.completions.length >= g.target) { g.completedDate = today; finished = true; }

  const claim = claimTrackerReward(state, g, entry, today);
  const rewardMsg = claim.message;
  return { ok: true, finished, message: finished ? `Goal complete. ${rewardMsg}` : rewardMsg, report: claim.report, reward: entry.reward };
}

// Real-life reward, decided exactly once per completion. The decision is written onto the completion record itself
// (completion.reward), in the same state object that is saved as one unit, so the reward and the proof that it was paid
// cannot be separated by a reload, an offline period, a sync, or a conflict. Once a completion carries a `reward`
// record it is never evaluated again: no code path pays it a second time, and completions that already existed
// before this record was introduced (legacy saves) are never rewarded retroactively.
// Only called from recordCompletion, for the completion it has just created.
function claimTrackerReward(state, g, entry, today) {
  if (entry.reward) return { report: null, message: 'Recorded. The reward for this completion was already settled.' };
  const cfg = D.TRACKER_REWARD;
  const settle = (status, message, extra = {}) => { entry.reward = { status, ...extra }; return { report: null, message }; };
  if (!state.settings.integration) return settle('disabled', 'Recorded. No game reward (real-life tracking is separate from the RPG).');
  if (!g.rpgLink) return settle('not-linked', 'Recorded. This goal is not linked to the RPG, so no game reward.');
  const rl = state.tracker.rewardLog;
  if (rl.date !== today) { rl.date = today; rl.n = 0; }
  // The daily count comes from the persisted claims themselves (and the older counter), so changing the device clock back
  // and forth cannot reset it.
  const paidToday = state.tracker.goals.reduce((n, x) => n + x.completions.filter((c) => c.date === today && c.reward && c.reward.status === 'granted').length, 0);
  const used = Math.max(rl.n, paidToday);
  if (used >= cfg.dailyCap) return settle('capped', `Recorded. The daily limit of ${cfg.dailyCap} game rewards from real-life completions has been reached.`);
  rl.n = used + 1;
  entry.reward = { status: 'granted', exp: cfg.exp, skill: g.linkedSkill || '', skillExp: g.linkedSkill ? cfg.skillExp : 0 };
  const report = execute(state, { kind: 'tracker_reward', goalId: g.id });
  const skillPart = g.linkedSkill ? `, +${cfg.skillExp} ${skillName(g.linkedSkill)} skill EXP` : '';
  return { report, message: `Recorded. Game reward granted: +${cfg.exp} EXP${skillPart} (${rl.n} of ${cfg.dailyCap} today).` };
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


// ==============================================================================
// PHASE 4 - RPG EXPANSION (PROGRESSION, MASTERY, COMPETITIONS, ORGS, ACHIEVEMENTS)
// ==============================================================================

export function ensurePhase4(state) {
  state.specializations = state.specializations || {};
  state.reputation = state.reputation || {
    professional: 0,
    academic: 0,
    creative: 0,
    community: 0,
    athletic: 0
  };
  for (const domain of Object.keys(D.REPUTATION_DOMAINS)) {
    if (typeof state.reputation[domain] !== 'number') state.reputation[domain] = 0;
  }
  state.organizations = state.organizations || {
    memberships: {}, // orgId: { rankId, points, joinedClock, contributionsCount }
    history: []
  };
  state.competitions = state.competitions || {
    history: [], // entries: { compId, clock, date, rank, placement, prize, strategy }
    records: {}  // compId: { bestPlacement, goldCount, silverCount, bronzeCount, entriesCount }
  };
  state.achievements = state.achievements || {
    unlocked: {}, // achId: { clock, date }
    history: []
  };
}

export function adjustReputation(state, domain, amount, reason = '') {
  ensurePhase4(state);
  if (!state.reputation[domain] && state.reputation[domain] !== 0) state.reputation[domain] = 0;
  state.reputation[domain] = clamp(state.reputation[domain] + amount, -100, 100);
  if (amount !== 0) {
    const domainDef = D.REPUTATION_DOMAINS[domain];
    const name = domainDef ? domainDef.name : domain;
    NOTES.push(`${amount > 0 ? '+' : ''}${amount} ${name}${reason ? ` (${reason})` : ''}.`);
  }
  checkAchievements(state);
}

export function getSkillMastery(level) {
  const miles = D.MASTERY_MILESTONES;
  let cur = miles[0];
  for (const m of miles) {
    if (level >= m.level) cur = m;
  }
  return cur;
}

export function hasSpecialization(state, specId) {
  ensurePhase4(state);
  return Object.values(state.specializations).includes(specId);
}

export function getSkillSpecialization(state, skillId) {
  ensurePhase4(state);
  const specId = state.specializations[skillId];
  if (!specId) return null;
  const list = D.SKILL_SPECIALIZATIONS[skillId] || [];
  return list.find((s) => s.id === specId) || null;
}

export function checkAchievements(state) {
  ensurePhase4(state);
  const achs = state.achievements;
  const c = state.character;
  const unlock = (id) => {
    if (achs.unlocked[id]) return;
    const def = D.ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;
    achs.unlocked[id] = { clock: state.clock, date: formatDateOnly(state.clock) };
    achs.history.push({ id, clock: state.clock, date: formatDateOnly(state.clock), name: def.name, category: def.category });
    recordChronicle(state, {
      category: 'achievement',
      title: `Achievement: ${def.name}`,
      desc: def.desc
    });
    NOTES.push(`Achievement Unlocked: ${def.name}!`);
  };

  // 1. first_specialization
  if (Object.keys(state.specializations).length > 0) unlock('first_specialization');

  // 2. skill_master
  if (Object.values(c.skills).some((sk) => sk.level >= D.MAX_SKILL)) unlock('skill_master');

  // 3. multi_disciplined
  if (Object.values(c.skills).filter((sk) => sk.level >= 5).length >= 4) unlock('multi_disciplined');

  // 4. first_podium & 5. grand_champion & 6. endurance_triumph
  const chist = state.competitions.history || [];
  if (chist.some((h) => ['gold', 'silver', 'bronze'].includes(h.placement))) unlock('first_podium');
  if (chist.some((h) => h.placement === 'gold')) unlock('grand_champion');
  if (chist.some((h) => h.compId === 'bayside_10k')) unlock('endurance_triumph');

  // 7. guild_initiate & 8. guild_leader & 9. service_record
  const mems = Object.values(state.organizations.memberships || {});
  if (mems.length > 0) unlock('guild_initiate');
  for (const [orgId, m] of Object.entries(state.organizations.memberships || {})) {
    const odef = D.ORGANIZATIONS[orgId];
    if (odef && odef.ranks[odef.ranks.length - 1].id === m.rankId) unlock('guild_leader');
  }
  const totalContribs = mems.reduce((sum, m) => sum + (m.contributionsCount || 0), 0);
  if (totalContribs >= 10) unlock('service_record');

  // 10. executive_promotion
  if (state.career?.currentJob) {
    const jdef = D.JOBS[state.career.currentJob];
    if (jdef && jdef.level >= 2) unlock('executive_promotion');
  }

  // 11. esteemed_reputation
  if (Object.values(state.reputation).some((v) => v >= 50)) unlock('esteemed_reputation');

  // 12. citywide_respect (all 5 positive >= 15)
  if (Object.values(state.reputation).every((v) => v >= 15)) unlock('citywide_respect');

  // 13. social_connector (5+ Friendly)
  const friendlyCount = Object.values(state.relations || {}).filter((v) => v >= 30).length;
  if (friendlyCount >= 5) unlock('social_connector');

  // 14. independent_founder
  if ((state.business?.owned || []).length > 0) unlock('independent_founder');

  // 15. scholar_degree
  if ((state.education?.qualifications || []).some((q) => q.startsWith('deg_'))) unlock('scholar_degree');
}

// ---------------------------------------------------------------- Skill Specialization Selection
export function doChooseSpecialization(state, skillId, specId) {
  ensurePhase4(state);
  const sk = state.character.skills[skillId];
  if (!sk) return { error: 'Unknown skill.' };
  if (sk.level < 5) return { error: 'Specialization requires skill level 5 or higher.' };
  if (state.specializations[skillId]) return { error: 'Specialization already chosen for this skill.' };

  const list = D.SKILL_SPECIALIZATIONS[skillId] || [];
  const spec = list.find((s) => s.id === specId);
  if (!spec) return { error: 'Invalid specialization option.' };

  state.specializations[skillId] = specId;
  const sdef = D.SKILLS.find((s) => s.id === skillId);
  NOTES.push(`Specialized in ${spec.name} for ${sdef.name}.`);
  recordChronicle(state, {
    category: 'mastery',
    title: `Specialization: ${spec.name}`,
    desc: `Dedicated advanced practice toward ${spec.name}. ${spec.desc}`
  });

  checkAchievements(state);
  return {
    title: `Specialization: ${spec.name}`,
    narrative: [
      `You made a conscious commitment to specialize your ${sdef.name} studies.`,
      spec.flavor,
      `Perk activated: ${spec.desc}`
    ]
  };
}

// ---------------------------------------------------------------- Organizations System
export function doOrgJoin(state, orgId) {
  ensurePhase4(state);
  const org = D.ORGANIZATIONS[orgId];
  if (!org) return { error: 'Unknown organization.' };
  if (state.organizations.memberships[orgId]) return { error: 'You are already an active member of this organization.' };
  if (state.location !== org.location) {
    return { error: `Must be at ${D.LOCATIONS[org.location]?.name || org.location} to join.` };
  }
  if (state.money < org.membershipCost) {
    return { error: `Membership dues require ${org.membershipCost} money.` };
  }

  // Requirements check
  if (org.requirements) {
    if (org.requirements.skills) {
      for (const [sk, lvl] of Object.entries(org.requirements.skills)) {
        if ((state.character.skills[sk]?.level || 0) < lvl) {
          const skName = D.SKILLS.find((s) => s.id === sk)?.name || sk;
          return { error: `Requires ${skName} Level ${lvl} or higher.` };
        }
      }
    }
    if (org.requirements.repDomain && org.requirements.minRep) {
      if ((state.reputation[org.requirements.repDomain] || 0) < org.requirements.minRep) {
        const domName = D.REPUTATION_DOMAINS[org.requirements.repDomain]?.name || org.requirements.repDomain;
        return { error: `Requires at least ${org.requirements.minRep} ${domName}.` };
      }
    }
  }

  transact(state, { amount: -org.membershipCost, category: 'dues', desc: `Initiation dues for ${org.name}` });
  const initialRank = org.ranks[0];
  state.organizations.memberships[orgId] = {
    rankId: initialRank.id,
    points: 0,
    joinedClock: state.clock,
    contributionsCount: 0
  };
  state.organizations.history.push({
    orgId, clock: state.clock, date: formatDateOnly(state.clock),
    event: `Joined as ${initialRank.title}`
  });

  recordChronicle(state, {
    category: 'community',
    title: `Inducted: ${org.name}`,
    desc: `Admitted as ${initialRank.title}. ${org.desc}`
  });

  // NPC affinity bonus for members
  for (const npcId of org.npcMembers) {
    addRel(state, npcId, 8);
    recordNpcMemory(state, npcId, {
      title: `Pithe joined ${org.name}`,
      context: `Welcomed Pithe as a fellow member into ${org.name}.`,
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
      emotionalValence: 0.8
    });
  }

  adjustReputation(state, org.requirements?.repDomain || 'community', 5, 'Induction');
  checkAchievements(state);

  return {
    title: `Inducted: ${org.name}`,
    narrative: [
      `You paid the membership dues and signed the charter of ${org.name}.`,
      `You hold the rank of ${initialRank.title}. Perk: ${initialRank.perk}`
    ]
  };
}

export function doOrgContribute(state, orgId, contribId) {
  ensurePhase4(state);
  const mem = state.organizations.memberships[orgId];
  if (!mem) return { error: 'You are not a member of this organization.' };
  const org = D.ORGANIZATIONS[orgId];
  if (!org) return { error: 'Unknown organization.' };
  if (state.location !== org.location) {
    return { error: `Must be at ${D.LOCATIONS[org.location]?.name || org.location} to contribute.` };
  }
  const contrib = org.contributions.find((c) => c.id === contribId);
  if (!contrib) return { error: 'Unknown contribution activity.' };

  if (state.needs.energy < -contrib.energy) {
    return { error: `Not enough energy (need ${-contrib.energy}).` };
  }

  state.needs.energy = Math.max(0, state.needs.energy + contrib.energy);
  state.needs.satiety = Math.max(0, state.needs.satiety - 6);
  advance(state, contrib.minutes);

  mem.points += contrib.contribPoints;
  mem.contributionsCount = (mem.contributionsCount || 0) + 1;

  if (contrib.skill) {
    grantSkillExp(state, contrib.skill, 12);
  }
  grantExp(state, 15);
  adjustReputation(state, contrib.repType, contrib.repVal, `${org.name} service`);

  // Check promotion
  let promoted = null;
  const currentRankIdx = org.ranks.findIndex((r) => r.id === mem.rankId);
  const nextRank = org.ranks[currentRankIdx + 1];
  if (nextRank && mem.points >= nextRank.reqContrib) {
    mem.rankId = nextRank.id;
    promoted = nextRank;
    state.organizations.history.push({
      orgId, clock: state.clock, date: formatDateOnly(state.clock),
      event: `Promoted to ${nextRank.title}`
    });
    recordChronicle(state, {
      category: 'community',
      title: `Promoted: ${nextRank.title}`,
      desc: `Elevated to ${nextRank.title} within ${org.name} after demonstrating exemplary service.`
    });
    NOTES.push(`Promoted to ${nextRank.title} in ${org.name}!`);
    recordMemory(state, {
      type: 'social',
      title: `Pithe elevated to ${nextRank.title} in ${org.name}`,
      location: org.location,
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT,
      context: `The steering board of ${org.name} voted to promote Pithe to ${nextRank.title}.`
    });
  }

  checkAchievements(state);

  return {
    title: `${org.name}: Contribution`,
    narrative: [
      `You completed: ${contrib.name}.`,
      `You earned ${contrib.contribPoints} contribution standing points (Total: ${mem.points} pts).`,
      promoted ? `Congratulations! You were promoted to ${promoted.title}. Perk: ${promoted.perk}` : `Current standing: ${org.ranks.find((r) => r.id === mem.rankId).title}.`
    ]
  };
}

// ---------------------------------------------------------------- Competitions Engine
export function isCompetitionActive(comp, clock) {
  const day = weekdayOf(clock); // 0=Sun, 1=Mon, ..., 6=Sat
  const h = hourOf(clock);
  if (!comp.activeDays.includes(day)) return false;
  if (h < comp.activeHours[0] || h >= comp.activeHours[1]) return false;
  return true;
}

export function doCompetitionEnter(state, compId, strategyId) {
  ensurePhase4(state);
  const comp = D.COMPETITIONS[compId];
  if (!comp) return { error: 'Unknown competition.' };
  if (state.location !== comp.location) {
    return { error: `Must be at ${D.LOCATIONS[comp.location]?.name || comp.location} to enter.` };
  }
  if (!isCompetitionActive(comp, state.clock)) {
    return { error: `${comp.name} is not currently running. Check scheduled days and hours.` };
  }
  const strat = comp.strategies.find((s) => s.id === strategyId);
  if (!strat) return { error: 'Choose a competition strategy.' };
  if (state.money < comp.entryFee) {
    return { error: `Entry registration fee requires ${comp.entryFee} money.` };
  }
  if (state.needs.energy < strat.energyCost) {
    return { error: `Not enough energy for this strategy (need ${strat.energyCost}).` };
  }

  // Deduct entry fee
  transact(state, { amount: -comp.entryFee, category: 'competition', desc: `Registration for ${comp.name}` });
  state.needs.energy = Math.max(0, state.needs.energy - strat.energyCost);
  state.needs.satiety = Math.max(0, state.needs.satiety - 15);
  advance(state, 180); // 3 hours duration

  // Calculate player performance score
  const skLevel = state.character.skills[comp.primarySkill]?.level || 0;
  const attrVal = state.character.attributes[comp.secondaryAttr] || 1;
  const healthMod = state.needs.health >= 70 ? 1.1 : state.needs.health < 40 ? 0.7 : 1.0;

  // Specialization bonus
  let specBonus = 0;
  const spec = getSkillSpecialization(state, comp.primarySkill);
  if (spec && (spec.bonuses.compBonus === comp.primarySkill || spec.bonuses.compBonus === comp.secondaryAttr)) {
    specBonus = 4;
  }

  // Strategy roll
  let stratRoll = 0;
  if (strat.risk === 'low') {
    stratRoll = 10 + (randInt(state, 1, 6));
  } else if (strat.risk === 'medium') {
    stratRoll = 6 + (randInt(state, 1, 12));
  } else if (strat.risk === 'high') {
    stratRoll = (randInt(state, 1, 20));
  }

  const playerScore = Math.round(((skLevel * 4) + (attrVal * 3) + specBonus + stratRoll) * healthMod);

  // Simulate NPC scores
  const npcScores = comp.npcCompetitors.map((npcId) => {
    const prof = D.NPC_PROFILES[npcId];
    const baseScore = 28 + randInt(state, 0, 18);
    return { npcId, name: D.NPCS[npcId]?.name || npcId, score: baseScore };
  });

  const allCompetitors = [
    { isPlayer: true, name: state.character.name, score: playerScore },
    ...npcScores.map((n) => ({ isPlayer: false, name: n.name, score: n.score, npcId: n.npcId }))
  ];
  allCompetitors.sort((a, b) => b.score - a.score);

  const playerRankIdx = allCompetitors.findIndex((c) => c.isPlayer);
  let placement = 'participant';
  let prizeKey = 'participant';
  if (playerRankIdx === 0) { placement = 'gold'; prizeKey = 'gold'; }
  else if (playerRankIdx === 1) { placement = 'silver'; prizeKey = 'silver'; }
  else if (playerRankIdx === 2) { placement = 'bronze'; prizeKey = 'bronze'; }

  const prize = comp.prizes[prizeKey];
  if (prize.cash > 0) {
    transact(state, { amount: prize.cash, category: 'competition_prize', desc: `Prize award from ${comp.name}` });
  }
  if (prize.item) {
    addItem(state, prize.item, 1);
  }
  grantSkillExp(state, comp.primarySkill, 20);
  grantExp(state, prize.exp);
  adjustReputation(state, comp.domain, prize.rep, comp.name);

  // Update records
  state.competitions.history.push({
    compId,
    clock: state.clock,
    date: formatDateOnly(state.clock),
    placement,
    rank: playerRankIdx + 1,
    score: playerScore,
    strategy: strat.label,
    prizeTitle: prize.title
  });

  const rec = state.competitions.records[compId] || { bestPlacement: 'participant', goldCount: 0, silverCount: 0, bronzeCount: 0, entriesCount: 0 };
  rec.entriesCount = (rec.entriesCount || 0) + 1;
  if (placement === 'gold') rec.goldCount = (rec.goldCount || 0) + 1;
  if (placement === 'silver') rec.silverCount = (rec.silverCount || 0) + 1;
  if (placement === 'bronze') rec.bronzeCount = (rec.bronzeCount || 0) + 1;
  if (placement === 'gold' || (placement === 'silver' && rec.bestPlacement !== 'gold') || (placement === 'bronze' && !['gold', 'silver'].includes(rec.bestPlacement))) {
    rec.bestPlacement = placement;
  }
  state.competitions.records[compId] = rec;

  // Record World Memory and NPC memories
  recordChronicle(state, {
    category: 'competition',
    title: `${comp.name}: Rank #${playerRankIdx + 1} (${placement.toUpperCase()})`,
    desc: `Competed in ${comp.name} employing '${strat.label}'. Finished in placement: ${placement.toUpperCase()} with score ${playerScore}.`
  });

  recordMemory(state, {
    type: 'cultural',
    title: `${comp.name} concluded: ${allCompetitors[0].name} takes First Place`,
    location: comp.location,
    importance: placement === 'gold' ? D.MEMORY_IMPORTANCE.MAJOR : D.MEMORY_IMPORTANCE.SIGNIFICANT,
    context: `The ${comp.name} concluded today. ${allCompetitors[0].name} claimed victory, while Pithe finished at Rank #${playerRankIdx + 1}.`
  });

  for (const npc of npcScores) {
    recordNpcMemory(state, npc.npcId, {
      title: `Competed against Pithe in ${comp.name}`,
      context: `Competed against Pithe in ${comp.name}. Pithe placed #${playerRankIdx + 1} with score ${playerScore}.`,
      importance: D.MEMORY_IMPORTANCE.NOTABLE,
      emotionalValence: playerRankIdx < allCompetitors.findIndex((c) => c.npcId === npc.npcId) ? 0.3 : 0.6
    });
  }

  checkAchievements(state);

  const standingSummary = allCompetitors.map((c, i) => `#${i + 1} ${c.name} (${c.score} pts)`).join(', ');

  return {
    title: `${comp.name} Results: ${placement.toUpperCase()}`,
    narrative: [
      `You stepped onto the field using your strategy: ${strat.label}.`,
      `Final Standings: ${standingSummary}.`,
      `You secured Rank #${playerRankIdx + 1} (${prize.title})!`,
      `Rewards awarded: +${prize.exp} Character EXP, +20 ${D.SKILLS.find((s) => s.id === comp.primarySkill)?.name} EXP, ${prize.cash > 0 ? `+${prize.cash} money, ` : ''}+${prize.rep} ${comp.domain} reputation.`
    ]
  };
}

// ---------------------------------------------------------------- Enhanced Career Development & Performance
export function doCareerMentorship(state, npcId) {
  ensurePhase4(state);
  ensureCareer(state);
  if (!state.career.currentJob) return { error: 'You must be currently employed to seek professional mentorship.' };
  if (state.location !== 'downtown' && state.location !== 'tech_park' && state.location !== 'university') {
    return { error: 'Professional mentorship sessions take place at Downtown, Tech Park, or University.' };
  }
  const rel = state.relations[npcId] || 0;
  if (rel < 20) return { error: `${D.NPCS[npcId]?.name || 'This person'} does not know you well enough to provide career mentorship (need Familiar relation).` };
  if (state.needs.energy < 20) return { error: 'Not enough energy for an intensive mentorship session.' };

  state.needs.energy = Math.max(0, state.needs.energy - 18);
  advance(state, 90);

  const boost = 8 + randInt(state, 2, 6);
  state.career.performance = Math.min(100, (state.career.performance || 70) + boost);
  grantExp(state, 20);
  adjustReputation(state, 'professional', 4, 'Executive Mentorship');
  addRel(state, npcId, 6);

  recordNpcMemory(state, npcId, {
    title: `Mentored Pithe on professional career roadmap`,
    context: `Conducted an insightful 1-on-1 career mentorship review with Pithe.`,
    importance: D.MEMORY_IMPORTANCE.NOTABLE,
    emotionalValence: 0.7
  });

  return {
    title: `Mentorship: ${D.NPCS[npcId]?.name || npcId}`,
    narrative: [
      `You sat down with ${D.NPCS[npcId]?.name} to discuss leadership tactics, technical execution, and industry navigation.`,
      `Your work performance rose by +${boost} points (Current Performance: ${state.career.performance}/100).`
    ]
  };
}
