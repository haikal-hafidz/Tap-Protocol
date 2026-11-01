// TAP Protocol - interface. Renders HTML strings into one root element and handles events by delegation.
// Every control carries data-action (clicks) or data-form (submits). No emojis anywhere in this project.
import * as D from './data.js';
import * as R from './rules.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Primary navigation: exactly these five, in this order, as a bottom bar at every width. Tracker, Quests, Inventory and
// Settings (with save management) are pages reached through More. Progress is character progression only.
const NAV = [['dashboard', 'Home'], ['world', 'World'], ['journal', 'Journal'], ['character', 'Progress'], ['more', 'More']];
const MORE_PAGES = [
  ['career', 'Career & Jobs', 'Employment, job listings, and career development.'],
  ['education', 'Education & Courses', 'University degrees and vocational certificates.'],
  ['finances', 'Finances & Banking', 'Personal ledger, bank accounts, and savings.'],
  ['properties', 'Property & Business', 'Real estate ownership and business enterprises.'],
  ['competitions', 'Competitions & Contests', 'Athletic races, engineering hackathons, and creative galas.'],
  ['organizations', 'Guilds & Organizations', 'Professional guilds, arts collectives, and civic associations.'],
  ['tracker', 'Tracker', 'Real-life habits and goals.'],
  ['quests', 'Quests', 'Jobs and their deadlines.'],
  ['inventory', 'Inventory', 'What you carry, and the market stall.'],
  ['settings', 'Settings and save data', 'Rewards, export, import, cloud sync and reset.']
];
const HOME_TABS = [['people', 'People', 'Your connections', 'people'], ['family', 'Family', 'Your inner circle', 'family'], ['personal', 'Personal', 'Your real life', 'personal']];
const TITLES = {
  dashboard: 'Home', world: 'World', journal: 'Journal', character: 'Progress', more: 'More',
  career: 'Career', education: 'Education', finances: 'Finances', properties: 'Properties & Business', competitions: 'Competitions', organizations: 'Organizations',
  tracker: 'Tracker', quests: 'Quests', inventory: 'Inventory', settings: 'Settings'
};
// Page heading copy (UX Session 4). Descriptive only; nothing here is game data.
const HEADINGS = {
  dashboard: ['Your dashboard', 'Where you are, how you are, and what is next.'],
  world: ['Discover', 'Explore your modern world and its connections.'],
  journal: ['Records', 'Your entries, activity history, and life chronicle.'],
  character: ['Development', 'Review your character and progression.'],
  more: ['Toolkit', 'Your systems, records, and settings.'],
  career: ['Employment', 'Corporate careers, professional opportunities, and work performance.'],
  education: ['Academics & Skills', 'University programs, vocational credentials, and study.'],
  finances: ['Ledger & Accounts', 'Personal finances, banking transactions, and expense records.'],
  properties: ['Assets & Ventures', 'Residential housing, commercial real estate, and business operations.'],
  competitions: ['Contests & Events', 'Scheduled tournaments, endurance races, and skill challenges.'],
  organizations: ['Guilds & Societies', 'Civic memberships, rank progression, and community projects.'],
  tracker: ['Real life', 'Your real-life habits, goals and one-off tasks.'],
  quests: ['Objectives', 'Jobs, deadlines and rewards.'],
  inventory: ['Belongings', 'What you carry, and the market stall.'],
  settings: ['Preferences', 'Rewards, save management and cloud sync.']
};
// Inline line icons: no emoji, no icon font, no network. They inherit the text colour.
const svg = (d) => `<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const ICON = {
  home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'),
  world: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/>'),
  journal: svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  progress: svg('<path d="M5 17l5-5 3 3 6-7"/><path d="M14 8h5v5"/>'),
  more: svg('<path d="M5 7h14M5 12h14M5 17h14"/>'),
  people: svg('<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-3.8 3.1-5.5 6.5-5.5s5.9 1.7 6.5 5.5"/>'),
  family: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>'),
  personal: svg('<path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>'),
  tracker: svg('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M9 5v14"/>'),
  quests: svg('<path d="M7 20V4"/><path d="M7 5h10l-2 3.5 2 3.5H7"/>'),
  inventory: svg('<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
  messages: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5h4"/>'),
  arrow: svg('<path d="M8 16l8-8M9 8h7v7"/>'),
  career: svg('<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M4 12h16"/>'),
  education: svg('<path d="M12 3l10 5-10 5-10-5z"/><path d="M6 10.5v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5"/><path d="M22 8v6"/>'),
  finances: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h2"/>'),
  properties: svg('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2"/>'),
  competitions: svg('<path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 3h12v7a6 6 0 0 1-12 0V3zM9 21h6M12 16v5"/>'),
  organizations: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>')
};
const NAV_ICON = { dashboard: 'home', world: 'world', journal: 'journal', character: 'progress', more: 'more' };
const navOwner = (view) => MORE_PAGES.some((m) => m[0] === view) ? 'more' : view;
const bgOf = (s) => D.BACKGROUNDS.find((b) => b.id === s.character.background);
const traitOf = (s) => D.TRAITS.find((t) => t.id === s.character.trait);

function bar(v, max, cls = '', label = '') {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="bar ${cls}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}"><span style="width:${pct}%"></span></div>`;
}

export function createApp(root, deps) {
  const app = {
    state: null, view: 'dashboard', report: null, pending: null, talkNpc: null, journalTab: 'entries',
    saveStatus: '', homeTab: 'personal', panel: null, confirmDlg: null, formDrafts: {}, saveError: '', reveal: null, focusNext: null, draft: {}, errors: [], journalError: '', trackerMsg: '', trackerError: '', importError: '', resetError: '', exportMsg: '',
    chain: Promise.resolve(), recovered: false
  };

  const settle = () => app.chain;
  function persist() {
    app.chain = app.chain.then(() => deps.save(app.state)).then((r) => {
      app.saveStatus = r.ok ? 'Saved locally' : `Save failed: ${r.error}`;
      const wasErr = app.saveError; app.saveError = r.ok ? '' : String(r.error || 'unknown error');
      if (wasErr !== app.saveError && app.state) render();   // show or clear the save-failure alert
      const el = root.querySelector('#save-status');
      if (el) { el.textContent = app.saveStatus; el.classList.toggle('bad', !r.ok); }
    });
    return app.chain;
  }

  // ------------------------------------------------------------ shared pieces
  function reportHtml(r) {
    if (!r) return '';
    if (!r.ok) return `<section class="report fail" role="alert"><p><strong>Cannot do that.</strong> ${esc(r.error)}</p><button class="btn small" data-action="dismiss">Dismiss</button></section>`;
    return `<section class="report" aria-live="polite">
      <div class="report-head"><h2 class="report-title">${esc(r.title)}</h2><button class="btn small" data-action="dismiss">Dismiss</button></div>
      ${r.narrative.map((t) => `<p class="story">${esc(t)}</p>`).join('')}
      ${r.notes.length ? `<ul class="notes">${r.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${r.changes.length ? `<ul class="changes">${r.changes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function actionCard(title, desc, action, p, label) {
    const data = Object.entries(action).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    const meta = p.ok ? `<p class="meta"><span class="chip">${R.formatDuration(p.minutes)}</span>${p.variable ? '<span class="chip">Outcome varies</span>' : ''}${p.changes.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}${p.warnings.length ? '<span class="chip warn">Warning</span>' : ''}</p>` : `<p class="why">${esc(p.error)}</p>`;
    return `<li class="action ${p.ok ? '' : 'blocked'}"><div class="action-main"><strong>${esc(title)}</strong>${desc ? `<p>${esc(desc)}</p>` : ''}${meta}</div>
      <button class="btn ${p.ok ? 'primary' : ''}" data-action="do" ${data} aria-label="${esc(label + ': ' + title)}" ${p.ok ? '' : 'disabled'}>${esc(label)}</button></li>`;
  }

  // Navigation row in the mockup's list-card style: icon tile, title, description and an arrow. Same nav action as before.
  function listCard(view, title, desc) {
    return `<div class="list-card"><div class="list-icon">${ICON[view]}</div><div class="text"><h3>${esc(title)}</h3><p>${esc(desc)}</p></div><button class="text-button go" data-action="nav" data-view="${view}" aria-label="Open ${esc(title)}">${ICON.arrow}</button></div>`;
  }

  // Compact status summary shown above every page: who, where, money and the four meters.
  function needTags(s) {
    const n = s.needs, tags = [];
    if (n.energy < 20) tags.push('Exhausted: gains halved');
    if (n.satiety < 20) tags.push(n.satiety === 0 ? 'Starving: losing health' : 'Hungry');
    if (n.health < 40) tags.push('Injured');
    return tags;
  }
  // Home: the status summary is the dark "player status" card from the approved mockup, built from the real save only.
  function heroStatus(s) {
    const c = s.character, n = s.needs, tags = needTags(s), need = R.expNeed(c.level);
    const tile = (label, v, cls) => `<div class="stat"><span>${label}</span><b>${v}</b>${bar(v, 100, cls, label)}</div>`;
    return `<section class="hero statusbar" aria-label="Status summary">
      <div class="hero-top"><div><div class="eyebrow">Player status</div><h2><button class="who" data-action="nav" data-view="character" aria-label="${esc(c.name)}, level ${c.level}. Open Progress">${esc(c.name)}</button></h2><p>${esc(D.LOCATIONS[s.location].name)}</p></div><span class="level">Level ${c.level}</span></div>
      <div class="meter">${bar(c.exp, need, 'exp', 'EXP')}</div><div class="small">${c.exp} / ${need} EXP</div>
      <div class="stats">${tile('Health', n.health, 'health')}${tile('Energy', n.energy, 'energy')}${tile('Satiety', n.satiety, 'satiety')}<div class="stat"><span>Money</span><b>${s.money}</b></div></div>
      ${tags.length ? `<p class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}
    </section>`;
  }
  function statusBar(s) {
    const c = s.character, n = s.needs, tags = needTags(s);
    const m = (label, v, max, cls) => `<div class="st-m"><span>${label} ${v}${max === 100 ? '' : '/' + max}</span>${bar(v, max, cls, label)}</div>`;
    return `<section class="statusbar" aria-label="Status summary">
      <p class="st-id"><button class="who" data-action="nav" data-view="character" aria-label="${esc(c.name)}, level ${c.level}. Open Progress">${esc(c.name)}</button><span>Level ${c.level}</span><span>${esc(D.LOCATIONS[s.location].name)}</span><span>Money <b class="money">${s.money}</b></span></p>
      <div class="st-meters">${m('Health', n.health, 100, 'health')}${m('Energy', n.energy, 100, 'energy')}${m('Satiety', n.satiety, 100, 'satiety')}${m('EXP', c.exp, R.expNeed(c.level), 'exp')}</div>
      ${tags.length ? `<p class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}
    </section>`;
  }
  // Real notifications only: derived from the current save (needs and the quest deadline). Nothing is invented.
  function notificationsList(s) {
    const out = needTags(s).map((t) => ({ title: t, text: 'Check Health, Energy and Satiety on this page.' }));
    const q = R.questView(s);
    if (q.q.status === 'active' && q.minutesLeft <= 24 * 60) out.push({ title: `${D.QUEST.name}: deadline in ${R.formatDuration(q.minutesLeft)}`, text: 'See Quests under More.' });
    return out;
  }

  // ------------------------------------------------------------ setup
  function setupHtml() {
    const d = app.draft;
    const bgs = D.BACKGROUNDS.map((b, i) => {
      const bonus = Object.entries(b.attrs).map(([k, v]) => `${D.ATTRIBUTES.find((a) => a.id === k).name} +${v}`).join(', ');
      const sk = Object.entries(b.skills).map(([k, v]) => `${D.SKILLS.find((a) => a.id === k).name} ${v}`).join(', ');
      const items = Object.keys(b.items).map((k) => D.ITEMS[k].name).join(', ');
      const checked = (d.background || 'scholar') === b.id ? 'checked' : '';
      return `<label class="choice"><input type="radio" name="background" value="${b.id}" ${checked}><span><strong>${esc(b.name)}</strong><em>${esc(b.desc)}</em><small>${esc(bonus)}. Skill: ${esc(sk)}. Money ${b.money}${items ? `. Starts with ${esc(items)}` : ''}.</small></span></label>`;
    }).join('');
    const traits = D.TRAITS.map((t) => {
      const checked = (d.trait || 'curious') === t.id ? 'checked' : '';
      return `<label class="choice slim"><input type="radio" name="trait" value="${t.id}" ${checked}><span><strong>${esc(t.name)}</strong><em>${esc(t.desc)}</em></span></label>`;
    }).join('');
    return `<main class="setup">
      <header class="setup-head"><h1>TAP Protocol</h1><p>A life journal inside an open-ended text RPG. Create Pithe, your fictional counterpart, and step into the Harbor Quarter. Everything is stored in this browser. Nothing is sent anywhere.</p></header>
      ${app.recovered ? '<p class="notice">Your main save was damaged and the previous backup was restored.</p>' : ''}
      ${app.errors.length ? `<ul class="errors" role="alert">${app.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
      ${deps.cloudPanel ? deps.cloudPanel() : ''}
      <form data-form="create" class="stack" novalidate>
        <fieldset class="window"><legend>Identity</legend>
          <label>Character name<input name="name" maxlength="30" value="${esc(d.name ?? 'Pithe')}"></label>
          <label>Fictional age<input name="age" type="number" min="16" max="99" value="${esc(d.age ?? 24)}"></label>
          <label>Appearance (text description)<textarea name="appearance" rows="3" maxlength="400" placeholder="Height, build, clothing, anything you want to picture.">${esc(d.appearance ?? '')}</textarea></label>
        </fieldset>
        <fieldset class="window"><legend>Background</legend><p class="hint">Sets your starting attributes, beginner skill and circumstances. It never limits your future.</p>${bgs}</fieldset>
        <fieldset class="window"><legend>Personality trait</legend><p class="hint">Shapes suggestions and narration. It never forces your choices.</p><div class="choices">${traits}</div></fieldset>
        <fieldset class="window"><legend>Rules</legend>
          <p><strong>Difficulty: Hardcore.</strong> Hunger, energy and health matter. You get a warning before any action that costs you something real. Failure never deletes your save.</p>
          <label class="check"><input type="checkbox" name="integration" ${d.integration === false ? '' : 'checked'}> Let real-life Tracker completions reward Pithe (on by default, changeable later)</label>
        </fieldset>
        <button class="btn primary big" type="submit">Create Pithe and begin</button>
      </form></main>`;
  }

  // ------------------------------------------------------------ views
  function homeGoals(s) {
    const today = R.localDateStr(new Date());
    const open = s.tracker.goals.filter((g) => !g.completedDate && !R.trackerStats(g, today).doneNow);
    open.sort((a, b) => (b.rpgLink ? 1 : 0) - (a.rpgLink ? 1 : 0));
    const rl = s.tracker.rewardLog;
    const used = Math.max(rl.date === today ? rl.n : 0, s.tracker.goals.reduce((n, x) => n + x.completions.filter((c) => c.date === today && c.reward && c.reward.status === 'granted').length, 0));
    const rows = open.slice(0, 4).map((g) => `<li class="goal"><div class="attr-top"><strong>${esc(g.name)}</strong><span class="tag">${g.kind === 'goal' ? (g.target === 1 ? 'One-off task' : 'Goal') : g.cadence === 'weekly' ? 'Weekly habit' : 'Daily habit'}</span></div>
        <form data-form="record" class="row"><input type="hidden" name="goal" value="${g.id}"><button class="btn primary" type="submit">Record completion</button>${g.rpgLink && s.settings.integration ? '<small>Linked to the RPG.</small>' : ''}</form></li>`).join('');
    const rewardLine = s.settings.integration ? `Rewards are on: ${Math.min(used, D.TRACKER_REWARD.dailyCap)} of ${D.TRACKER_REWARD.dailyCap} paid today.` : 'Rewards are off.';
    return `<section class="panel missions"><div class="section-head"><h2>Tracker goals</h2><button class="text-button" data-action="nav" data-view="tracker" aria-label="View all in the Tracker">View all ${ICON.arrow}</button></div>${rows ? `<ul class="goals">${rows}</ul>` : s.tracker.goals.length ? '<p>Everything you track is done for now.</p>' : '<p>You are not tracking anything yet. Add a habit, goal or one-off task in the Tracker.</p>'}
      ${open.length > 4 ? `<p class="hint">${open.length - 4} more in the Tracker.</p>` : ''}<p class="hint">${rewardLine}</p>
      <button class="btn" data-action="nav" data-view="tracker">Open the full Tracker</button></section>`;
  }

  function dashboardView(s) {
    const tabs = `<div class="tabs shortcuts" role="group" aria-label="Home categories">${HOME_TABS.map(([id, label, sub, ic]) => `<button class="tab shortcut ${app.homeTab === id ? 'on' : ''}" data-action="home-tab" data-tab="${id}" data-sub="${esc(sub)}" aria-pressed="${app.homeTab === id}">${ICON[ic]}${label}</button>`).join('')}</div>`;
    if (app.homeTab === 'people') {
      const rels = s.relationships || {};
      const here = R.npcsHere(s).map((id) => {
        const r = rels[id] || { affinity: 0, trust: 0, romanceStatus: 'none', status: 'stranger' };
        return `<li class="action"><div class="action-main"><strong>${esc(D.NPCS[id].name)}</strong> <span class="tag">${esc(R.relationLabel(s.relations[id] || 0))}</span>${r.romanceStatus !== 'none' ? `<span class="tag">${esc(r.romanceStatus)}</span>` : ''}<p>${esc(D.NPCS[id].role)}. Affinity: ${r.affinity}/100, Trust: ${s.relations[id] || 0}</p></div>
          <div class="row"><button class="btn" data-action="open-talk" data-npc="${id}">Talk</button>
          <button class="btn" data-action="do" data-kind="social_interact" data-npc="${id}" data-interact-type="hangout">Hangout</button>
          <button class="btn" data-action="do" data-kind="social_interact" data-npc="${id}" data-interact-type="gift">Gift ($25)</button>
          <button class="btn primary" data-action="do" data-kind="romance_action" data-npc="${id}" data-romance-type="date">Date ($35)</button></div></li>`;
      }).join('');
      const away = Object.keys(D.NPCS).filter((id) => !R.npcsHere(s).includes(id)).map((id) => {
        const at = R.npcLocation(id, s.clock);
        const r = rels[id] || { affinity: 0, trust: 0, romanceStatus: 'none' };
        return `<li><strong>${esc(D.NPCS[id].name)}</strong> (${esc(D.NPCS[id].role)}): ${at ? `now at ${esc(D.LOCATIONS[at].name)}` : 'not around right now'}. Affinity: ${r.affinity}/100.</li>`;
      }).join('');
      return `${tabs}<section class="panel"><h2>People here</h2>${here ? `<ul class="actions">${here}</ul>` : '<p>Nobody you know is here right now.</p>'}</section>
        ${away ? `<section class="panel"><h2>Elsewhere in the Metropolis</h2><ul class="plain">${away}</ul><p class="hint">Open World for travel and locations.</p></section>` : ''}`;
    }
    if (app.homeTab === 'family') {
      const fam = s.family || { spouse: null, children: [], heirlooms: [], generation: 1 };
      const house = s.housing && D.PROPERTIES[s.housing.primaryHome] ? D.PROPERTIES[s.housing.primaryHome] : D.PROPERTIES.rented_room;
      if (!fam.spouse && (!fam.children || !fam.children.length) && (!fam.heirlooms || !fam.heirlooms.length) && (!fam.lineage || !fam.lineage.length)) {
        return `${tabs}<section class="panel"><h2>Family</h2><p>Pithe has no family in the Harbor Quarter yet, and this version of the world has no family members to meet.</p><p class="hint">Where Pithe comes from: ${esc(bgOf(s).circumstance)}</p></section>`;
      }
      const spouseHtml = fam.spouse
        ? `<div class="action-main"><strong>Spouse: ${esc(fam.spouse.name)}</strong><p>Married on ${esc(fam.spouse.weddingDate)}</p></div>
           <div class="row">${house.maxOccupants > 1 + fam.children.length ? `<button class="btn primary" data-action="do" data-kind="family_action" data-family-type="have_child">Have Child</button>` : `<p class="hint">Current home (${esc(house.name)}) is full. Move to a larger residence to grow family.</p>`}</div>`
        : `<p>${esc(s.character.name)} is not currently married. Develop close relationships with romantic partners to propose marriage.</p>`;

      const childrenHtml = fam.children && fam.children.length
        ? `<ul class="plain">${fam.children.map((ch) => `<li><strong>${esc(ch.name)}</strong> (Age ${ch.age}, ${esc(D.getLifeStage(ch.age).name)}) - Born: ${esc(ch.birthDate)}. Affection: ${ch.relationshipScore}/100. ${ch.educationPath ? `Studying: ${esc(D.CHILD_EDUCATION_PATHS[ch.educationPath]?.name || ch.educationPath)}` : ''}</li>`).join('')}</ul>
           <button class="btn primary" data-action="do" data-kind="family_action" data-family-type="parenting">Family Time & Parenting (2h)</button>`
        : `<p>No children in household.</p>`;

      const heirloomsHtml = fam.heirlooms && fam.heirlooms.length
        ? `<ul class="plain">${fam.heirlooms.map((h) => `<li><strong>${esc(h.name)}</strong> (Value: ${h.baseValue})<br><small>${esc(h.significance)} Current keeper: ${esc(h.currentOwner)} (Gen ${h.originGeneration})</small></li>`).join('')}</ul>`
        : `<p>No consecrated family heirlooms yet.</p>`;

      const successors = R.getEligibleSuccessors(s);
      const successionHtml = successors.length
        ? `<p class="hint">Eligible successors ready to continue the family story:</p>
           <ul class="actions">${successors.map((succ) => `<li class="action"><div class="action-main"><strong>${esc(succ.name)}</strong> (${esc(succ.stage)}, ${succ.type})<p>${esc(succ.personality)}. Education: ${esc(succ.educationPath)}</p></div><button class="btn primary" data-action="open-succession" data-id="${succ.id}">Review Succession</button></li>`).join('')}</ul>`
        : `<p class="hint">Succession requires an adult successor (children reaching age 18 or married partner).</p>`;

      return `${tabs}<div class="cols">
        <section class="panel"><h2>Household & Spouse</h2>${spouseHtml}</section>
        <section class="panel"><h2>Children & Family (Gen ${fam.generation})</h2>${childrenHtml}</section>
      </div>
      <div class="cols">
        <section class="panel"><h2>Cherished Heirlooms</h2>${heirloomsHtml}</section>
        <section class="panel"><h2>Generational Succession</h2>${successionHtml}</section>
      </div>
      <section class="panel"><h2>Primary Residence</h2>
        <p><strong>${esc(house.name)}</strong> at ${esc(D.LOCATIONS[house.location]?.name || house.location)}</p>
        <p>${esc(house.desc)} Capacity: ${house.maxOccupants} occupants.</p>
        <button class="btn" data-action="nav" data-view="properties">Manage Housing & Real Estate</button>
      </section>`;
    }
    const acts = R.locationActivities(s).map((a) => actionCard(a.name, a.desc, { kind: 'activity', id: a.id }, R.preview(s, { kind: 'activity', id: a.id }), 'Start')).join('');
    const go = Object.keys(D.LOCATIONS).filter((id) => id !== s.location).map((id) => {
      const p = R.preview(s, { kind: 'travel', to: id });
      return `<button class="btn" data-action="do" data-kind="travel" data-to="${id}" ${p.ok ? '' : 'disabled'} title="${esc(p.ok ? '' : p.error)}">${esc(D.LOCATIONS[id].name)} (${R.formatDuration(D.travelMinutes(s.location, id))})</button>`;
    }).join('');
    const blockedTravel = Object.keys(D.LOCATIONS).filter((id) => id !== s.location).map((id) => ({ id, p: R.preview(s, { kind: 'travel', to: id }) })).filter((x) => !x.p.ok).map((x) => `<li><small>${esc(D.LOCATIONS[x.id].name)}: ${esc(x.p.error)}</small></li>`).join('');
    const q = R.questView(s);
    const questCard = q.q.status === 'active'
      ? `<p><strong>${esc(D.QUEST.name)}</strong>. Deadline in ${R.formatDuration(q.minutesLeft)}.</p><ul class="objectives">${q.objectives.map((o) => `<li class="${o.done ? 'done' : ''}">${o.done ? '[done]' : '[ ]'} ${esc(o.label)}</li>`).join('')}</ul>`
      : q.q.status === 'available' ? '<p>No active quest. Someone at the Corner Cafe may need help.</p>'
        : `<p><strong>${esc(D.QUEST.name)}</strong>: ${q.q.status === 'completed' ? 'completed' : 'failed'}. See Quests for details.</p>`;
    const sug = R.suggestions(s);
    const recent = s.log.slice(-5).reverse();
    const quick = `<section class="panel"><div class="section-head"><h2>Quick access</h2></div>${[['tracker', 'Tracker', 'Your real-life tasks and goals'], ['quests', 'Quests', 'Your current objectives'], ['inventory', 'Inventory', 'Items and collected resources']].map(([id, t, d]) => listCard(id, t, d)).join('')}</section>`;
    return `${tabs}<div class="cols">${homeGoals(s)}${quick}</div>
      <div class="cols">
        <section class="panel"><h2>Active quest</h2>${questCard}</section>
        <section class="panel"><h2>Suggestions</h2>${sug.length ? `<ul class="plain">${sug.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>Nothing pressing.</p>'}</section>
      </div>
      <section class="panel"><h2>Go somewhere</h2><div class="row">${go}</div>${blockedTravel ? `<ul class="plain">${blockedTravel}</ul>` : ''}</section>
      <section class="panel"><h2>Actions at ${esc(D.LOCATIONS[s.location].name)}</h2><ul class="actions">${acts}</ul></section>
      <section class="panel"><h2>Recent events</h2>${recent.length ? `<ul class="history">${recent.map((l) => `<li><span class="when">${esc(R.formatClock(l.clock))}</span> ${esc(l.title)}${l.changes.length ? `<small>${esc(l.changes.filter((c) => !c.startsWith('Time ')).join('; '))}</small>` : ''}</li>`).join('')}</ul>` : '<p>Nothing has happened yet.</p>'}</section>`;
  }

  function characterView(s) {
    const c = s.character, bg = bgOf(s), tr = traitOf(s);
    const attrs = D.ATTR_GROUPS.map((g) => `<div class="attr-group"><h3>${g}</h3>${D.ATTRIBUTES.filter((a) => a.group === g).map((a) => {
      const v = c.attributes[a.id], pr = c.attrProgress[a.id];
      return `<div class="attr"><div class="attr-top"><span>${a.name}</span><b>${v}/10</b></div>${bar(v, 10, '', a.name)}<small>${v >= 10 ? 'Maximum' : `Training ${pr}/${v}`}. ${esc(a.desc)}</small></div>`;
    }).join('')}</div>`).join('');
    const skills = D.SKILLS.map((k) => {
      const sk = c.skills[k.id];
      const need = sk.level >= D.MAX_SKILL ? 0 : R.skillNeed(sk.level);
      const mastery = R.getSkillMastery(sk.level);
      const spec = R.getSkillSpecialization(s, k.id);
      const availableSpecs = D.SKILL_SPECIALIZATIONS[k.id] || [];
      const specButtons = (!spec && sk.level >= 5 && availableSpecs.length)
        ? availableSpecs.map((sp) => `<div class="action-main"><small><strong>${esc(sp.name)}</strong>: ${esc(sp.desc)}</small> <button class="btn small primary" data-action="do" data-kind="choose_specialization" data-skill-id="${k.id}" data-spec-id="${sp.id}">Adopt Path</button></div>`).join('')
        : '';

      return `<li class="skill">
        <div class="attr-top"><span>${k.name}</span><b>Level ${sk.level} (${mastery.title})</b></div>
        ${bar(need ? sk.exp : 1, need || 1, '', k.name + ' skill')}
        <small>${need ? `${sk.exp}/${need} EXP. ` : 'Maximum. '}Trains ${esc(D.ATTRIBUTES.find((a) => a.id === k.attr).name)}. ${esc(k.desc)}</small>
        <p class="meta"><span class="chip">Mastery: ${esc(mastery.perk)}</span></p>
        ${spec ? `<p class="meta"><span class="chip good">Specialization: ${esc(spec.name)} - ${esc(spec.desc)}</span></p>` : specButtons ? `<div class="sub-head"><p class="hint">Level 5 Reached. Choose your specialization path:</p>${specButtons}</div>` : ''}
      </li>`;
    }).join('');

    const repMeters = Object.entries(D.REPUTATION_DOMAINS).map(([dom, def]) => {
      const val = (s.reputation && s.reputation[dom]) || 0;
      return `<div class="stat"><dt>${esc(def.name)}</dt><dd>${val >= 0 ? '+' : ''}${val}/100</dd></div>`;
    }).join('');

    const achs = s.achievements?.history || [];
    const achsHtml = achs.length
      ? `<ul class="history">${achs.map((a) => `<li><div class="attr-top"><strong>${esc(a.name)}</strong> <span class="tag good">${esc(a.category)}</span></div><small>Earned: ${esc(a.date)}</small></li>`).join('')}</ul>`
      : '<p>No achievements earned yet. Explore the world, master skills, and enter competitions to unlock achievements.</p>';
    const recent = s.log.filter((l) => l.changes.some((x) => /EXP|level|training|to \d+$/.test(x))).slice(-6).reverse();
    return `<section class="hero window" aria-label="Character overview"><div class="hero-top"><div><div class="eyebrow">Character overview</div><h2>${esc(c.name)}</h2><p>Age ${c.age}. Hardcore.</p></div><span class="level">Level ${c.level}</span></div>
      <p class="appearance">${esc(c.appearance || 'No appearance description yet.')}</p>
      <div class="meter">${bar(c.exp, R.expNeed(c.level), 'exp', 'EXP')}</div><div class="small">${c.exp} / ${R.expNeed(c.level)} EXP</div>
      <dl class="facts stats"><div class="stat"><dt>Background</dt><dd>${esc(bg.name)}</dd></div><div class="stat"><dt>Trait</dt><dd>${esc(tr.name)}</dd></div><div class="stat"><dt>EXP</dt><dd>${c.exp}/${R.expNeed(c.level)}</dd></div><div class="stat"><dt>Collapses</dt><dd>${s.stats.collapses}</dd></div></dl></section>
      <section class="panel"><h2>Attributes</h2><p class="hint">A skill level-up adds training to its attribute. The attribute rises when training equals its current value.</p><div class="cols3">${attrs}</div></section>
      <section class="panel"><h2>Reputation & Standing</h2><p class="hint">Your standing in the world reflects your professional performance, competition results, and community service.</p><dl class="facts stats">${repMeters}</dl></section>
      <section class="panel"><h2>Skills & Specializations</h2><ul class="skills">${skills}</ul></section>
      <section class="panel"><h2>Earned Achievements</h2>${achsHtml}</section>
      <section class="panel"><h2>Recent progression</h2>${recent.length ? `<ul class="history">${recent.map((l) => `<li><span class="when">${esc(R.formatClock(l.clock))}</span> ${esc(l.title)}<small>${esc(l.changes.filter((x) => !x.startsWith('Time ') && !x.startsWith('Energy') && !x.startsWith('Satiety') && !x.startsWith('Health')).join('; '))}</small></li>`).join('')}</ul>` : '<p>No progression yet.</p>'}</section>
      `;
  }

  function settingsView(s) {
    return `<section class="panel" id="settings"><h2>Settings and save data</h2>
        <p>Real-life tracker rewards: <strong>${s.settings.integration ? 'Enabled' : 'Disabled'}</strong>. When enabled, a recorded real-life completion on a goal you linked to the RPG gives a small reward, up to 3 per real day.</p>
        <button class="btn" data-action="toggle-integration">${s.settings.integration ? 'Disable' : 'Enable'} real-life rewards</button>
        <p class="hint">Storage: ${esc(deps.storageMode())}. Export your save regularly. Clearing browser data erases it.</p>
        <div class="row"><button class="btn" data-action="export">Export save file</button></div>${app.exportMsg ? `<p class="notice" role="status" data-msg-export>${esc(app.exportMsg)}</p>` : ''}
        <form data-form="import" class="stack"><label>Import a save (paste JSON). This replaces the current game.<textarea name="json" rows="3"></textarea></label>${app.importError ? `<p class="error" role="alert" data-msg>${esc(app.importError)}</p>` : ''}<button class="btn" type="submit">Import save</button></form>
        <form data-form="reset" class="stack"><label>Delete this save. Type RESET to confirm.<input name="confirm" autocomplete="off"></label>${app.resetError ? `<p class="error" role="alert" data-msg>${esc(app.resetError)}</p>` : ''}<button class="btn danger" type="submit">Delete save</button></form>
      </section>
      ${deps.cloudPanel ? deps.cloudPanel() : ''}`;
  }

  function journalView(s) {
    const tabs = `<div class="tabs pill-row" role="group" aria-label="Journal sections"><button class="tab ${app.journalTab === 'entries' ? 'on' : ''}" data-action="tab" data-tab="entries" aria-pressed="${app.journalTab === 'entries'}">Entries</button><button class="tab ${app.journalTab === 'stories' ? 'on' : ''}" data-action="tab" data-tab="stories" aria-pressed="${app.journalTab === 'stories'}">Stories</button><button class="tab ${app.journalTab === 'family_history' ? 'on' : ''}" data-action="tab" data-tab="family_history" aria-pressed="${app.journalTab === 'family_history'}">Family Lineage</button><button class="tab ${app.journalTab === 'chronicle' ? 'on' : ''}" data-action="tab" data-tab="chronicle" aria-pressed="${app.journalTab === 'chronicle'}">Life Chronicle</button><button class="tab ${app.journalTab === 'world_memory' ? 'on' : ''}" data-action="tab" data-tab="world_memory" aria-pressed="${app.journalTab === 'world_memory'}">World Lore & Rumors</button><button class="tab ${app.journalTab === 'history' ? 'on' : ''}" data-action="tab" data-tab="history" aria-pressed="${app.journalTab === 'history'}">Activity history</button></div>`;
    if (app.journalTab === 'stories') {
      const activeStories = (s.stories?.active || []).filter((st) => s.stories?.discovered?.[st.id]);
      const historyStories = [...(s.stories?.history || [])].reverse();

      const activeHtml = activeStories.length
        ? activeStories.map((st) => {
            const tmpl = D.STORY_TEMPLATES[st.templateId];
            const currentStage = tmpl?.stages.find((stage) => stage.id === st.stageId);
            const participantsNames = (st.participants || []).map((id) => D.NPCS[id]?.name || id).join(', ');
            return `<li class="action"><div class="action-main"><strong>${esc(st.title)}</strong> <span class="tag good">${esc(currentStage?.title || st.stageId)}</span>
              <p>${esc(currentStage?.summary || tmpl?.desc || '')}</p>
              <p class="meta"><span class="chip">Location: ${esc(D.LOCATIONS[st.location]?.name || st.location)}</span><span class="chip">Involved: ${esc(participantsNames)}</span></p>
              <small>Stage deadline: ${esc(R.formatClock(st.stageDeadline))}</small></div>
              <button class="btn" data-action="nav" data-view="world">Follow Story in World</button></li>`;
          }).join('')
        : '<p>No discovered active storylines right now. Explore the quarter, converse with residents, or investigate rumors to uncover neighborhood stories.</p>';

      const historyHtml = historyStories.length
        ? historyStories.map((h) => {
            const statusLabel = h.playerParticipated ? 'Player Resolved' : 'Autonomous Resolution';
            return `<li><div class="attr-top"><strong>${esc(h.title)}</strong> <span class="tag">${esc(statusLabel)}</span></div>
              <small>${esc(R.formatClock(h.resolvedClock))} | Outcome: ${esc((h.outcomeState || '').replace(/_/g, ' '))}</small>
              <p class="story">${esc(h.summary || '')}</p></li>`;
          }).join('')
        : '<p>No concluded storylines in the historical archive yet.</p>';

      return `${tabs}<section class="panel"><h2>Discovered Active Storylines</h2><ul class="actions">${activeHtml}</ul></section>
        <section class="panel"><h2>Storyline Chronicle & Resolutions</h2><ul class="history">${historyHtml}</ul></section>`;
    }
    if (app.journalTab === 'history') {
      const items = [...s.log].reverse();
      return `${tabs}<section class="panel"><h2>Activity history</h2>${items.length ? `<ul class="history">${items.map((l) => `<li><span class="when">${esc(R.formatClock(l.clock))}</span> <strong>${esc(l.title)}</strong>${l.narrative.map((t) => `<p class="story">${esc(t)}</p>`).join('')}${l.notes.length ? `<small>${esc(l.notes.join(' '))}</small>` : ''}${l.changes.length ? `<small>${esc(l.changes.join('; '))}</small>` : ''}</li>`).join('')}</ul>` : '<p>No activity yet. Things you do in the world are recorded here automatically.</p>'}</section>`;
    }
    if (app.journalTab === 'family_history') {
      const fam = s.family || {};
      const lineage = [...(fam.lineage || [])].reverse();
      const oral = [...(fam.oralHistory || [])];
      const verified = oral.filter((o) => o.verified);
      const lore = oral.filter((o) => !o.verified);
      const ledger = [...(fam.ledger || [])].reverse();

      const lineageHtml = lineage.length
        ? `<ul class="history">${lineage.map((anc) => `<li><div class="attr-top"><strong>${esc(anc.name)}</strong><span class="tag">Generation ${anc.generation}</span></div><small>Retired: ${esc(anc.retiredDate)} at Age ${anc.finalAge}</small><p class="story">${esc(anc.legacySummary)}</p></li>`).join('')}</ul>`
        : '<p>You are the founding generation of this lineage in the Metropolis.</p>';

      const verifiedHtml = verified.length
        ? `<ul class="history">${verified.map((v) => `<li><div class="attr-top"><strong>${esc(v.title)}</strong><span class="tag">${esc(v.category)}</span></div><small>Source: ${esc(v.source)}</small><p class="story">${esc(v.text)}</p></li>`).join('')}</ul>`
        : '<p>No verified family records documented yet.</p>';

      const loreHtml = lore.length
        ? `<ul class="actions">${lore.map((l) => `<li class="action"><div class="action-main"><strong>${esc(l.title)}</strong> <span class="tag warn">Oral Rumor</span><p>${esc(l.text)}</p><small>Source: ${esc(l.source)}</small></div><button class="btn primary" data-action="do" data-kind="family_action" data-family-type="investigate_family_mystery" data-oral-id="${l.id}">Investigate Lore</button></li>`).join('')}</ul>`
        : '<p>No unverified oral mysteries or legends currently circulating.</p>';

      const ledgerHtml = ledger.length
        ? `<ul class="plain">${ledger.map((l) => `<li><strong>Gen ${l.generation} -> Gen ${l.generation + 1}</strong>: ${esc(l.predecessor)} to ${esc(l.successor)} on ${esc(l.date)}.<br><small>Transferred: ${l.netMoney} money, ${l.propertiesTransferred} properties, ${l.businessesTransferred} businesses, ${l.heirloomsTransferred} heirlooms.</small></li>`).join('')}</ul>`
        : '<p>No generational estate transfers recorded yet.</p>';

      return `${tabs}<section class="panel"><h2>Ancestral Lineage & Generations</h2>${lineageHtml}</section>
        <div class="cols">
          <section class="panel"><h2>Verified Family History</h2>${verifiedHtml}</section>
          <section class="panel"><h2>Oral Lore & Unresolved Mysteries</h2>${loreHtml}</section>
        </div>
        <section class="panel"><h2>Generational Inheritance Ledger</h2>${ledgerHtml}</section>`;
    }
    if (app.journalTab === 'chronicle') {
      const chron = [...(s.chronicle || [])].reverse();
      return `${tabs}<section class="panel"><h2>Life Chronicle & Milestones</h2>
        <p class="hint">A persistent record of your major life achievements, career steps, degrees, marriages, family, and ventures.</p>
        ${chron.length ? `<ul class="history">${chron.map((c) => `<li><div class="attr-top"><strong>${esc(c.title)}</strong><span class="tag">${esc(c.category)}</span></div><small>${esc(c.date)} (Year ${esc(c.year)})</small><p class="story">${esc(c.desc)}</p></li>`).join('')}</ul>` : '<p>No milestones recorded yet. Live your life, find work, earn degrees, and make connections to build your chronicle.</p>'}
      </section>`;
    }
    if (app.journalTab === 'world_memory') {
      const mems = [...(s.memories || [])].reverse();
      const rumors = mems.filter((m) => m.isRumor && !m.verified);
      const confirmed = mems.filter((m) => !m.isRumor || m.verified);

      const rumorsHtml = rumors.length
        ? rumors.map((r) => `<li class="action"><div class="action-main"><strong>${esc(r.title)}</strong> <span class="tag warn">Rumor</span>
            <p>${esc(r.context)}</p><small>Origin: ${esc(r.location)} | ${esc(r.date)}</small></div>
            <button class="btn primary" data-action="do" data-kind="verify_rumor" data-id="${r.id}">Investigate & Verify</button></li>`).join('')
        : '<p>No active unverified rumors circulating right now.</p>';

      const confirmedHtml = confirmed.length
        ? confirmed.slice(0, 30).map((m) => `<li><div class="attr-top"><strong>${esc(m.title)}</strong> <span class="tag">${esc(m.type)}</span></div>
            <small>${esc(m.date)} | Location: ${esc(D.LOCATIONS[m.location]?.name || m.location)}</small>
            <p class="story">${esc(m.context)}</p></li>`).join('')
        : '<p>No world historical memories recorded yet.</p>';

      return `${tabs}<section class="panel"><h2>Circulating Rumors</h2><ul class="actions">${rumorsHtml}</ul></section>
        <section class="panel"><h2>Discovered World Memories & History</h2><ul class="history">${confirmedHtml}</ul></section>`;
    }
    const entries = [...s.journal].reverse();
    return `${tabs}<section class="panel"><h2>New entry</h2>
      <form data-form="journal" class="stack">
        <label>Type<select name="type"><option value="rpg">In-world entry (Pithe writes it, takes 10 game minutes)</option><option value="real">Real-life reflection (no game time, no rewards)</option></select></label>
        <label>Title (optional)<input name="title" maxlength="80"></label>
        <label>Entry<textarea name="text" rows="5" maxlength="4000" required></textarea></label>
        ${app.journalError ? `<p class="error" role="alert" data-msg>${esc(app.journalError)}</p>` : ''}
        <button class="btn primary" type="submit">Save entry</button>
      </form><p class="hint">The first in-world entry each game day gives a small EXP reward. Real-life reflections never do.</p></section>
      <section class="panel"><h2>Entries</h2>${entries.length ? `<ul class="entries">${entries.map((e) => `<li><div class="attr-top"><strong>${esc(e.title)}</strong><span class="tag">${e.type === 'real' ? 'Real life' : 'In-world'}</span></div><small>${esc(e.realDate)} ${esc(e.realTime)} | Game time: ${esc(e.gameTime)}</small><p class="story pre">${esc(e.text)}</p></li>`).join('')}</ul>` : '<p>No entries yet. Write the first one above.</p>'}</section>`;
  }

  // What a completion earned, from the persisted reward record. Completions saved before rewards were recorded have none.
  function rewardLabel(c) {
    const r = c.reward;
    if (!r) return 'No reward recorded';
    if (r.status === 'granted') return `+${r.exp} EXP${r.skill ? `, +${r.skillExp} ${D.SKILLS.find((k) => k.id === r.skill)?.name || r.skill}` : ''}`;
    return { capped: 'Daily reward limit reached', 'not-linked': 'Not linked to the RPG', disabled: 'Rewards were off' }[r.status] || 'No reward';
  }

  function trackerView(s) {
    const today = R.localDateStr(new Date());
    const skillOpts = ['<option value="">No linked skill</option>'].concat(D.SKILLS.map((k) => `<option value="${k.id}">${k.name}</option>`)).join('');
    const goals = s.tracker.goals.map((g) => {
      const st = R.trackerStats(g, today);
      const disabled = g.completedDate || st.doneNow;
      const label = g.completedDate ? 'Goal complete' : st.doneNow ? (g.cadence === 'weekly' && g.kind === 'habit' ? 'Done this week' : 'Done today') : 'Record completion';
      const prog = g.kind === 'goal' ? `<div class="attr-top"><span>Progress</span><b>${g.completions.length}/${g.target}</b></div>${bar(g.completions.length, g.target, '', 'Progress: ' + g.name)}` : '';
      return `<li class="goal"><div class="attr-top"><strong>${esc(g.name)}</strong><span class="tag">${g.kind === 'goal' ? 'Goal' : g.cadence === 'weekly' ? 'Weekly habit' : 'Daily habit'}</span></div>
        <small>Created ${esc(g.createdDate)}. Total completions: ${st.total}. Streak: ${st.streak} ${st.streak === 1 ? st.unit.replace(/s$/, '') : st.unit}.${g.rpgLink ? ' Linked to the RPG.' : ''}</small>${prog}
        <div class="strip" aria-label="Last 14 days">${st.last14.map((d) => `<span class="cell ${d.done ? 'on' : ''}" title="${d.date}"></span>`).join('')}</div>
        <form data-form="record" class="row"><input type="hidden" name="goal" value="${g.id}"><input name="note" placeholder="Optional note" aria-label="Optional note for ${esc(g.name)}" maxlength="200"><button class="btn ${disabled ? '' : 'primary'}" type="submit" ${disabled ? 'disabled' : ''}>${label}</button></form>
        ${g.completions.length ? `<details><summary>History (${g.completions.length})</summary><ul class="history">${[...g.completions].reverse().slice(0, 30).map((c) => `<li><span class="when">${esc(c.date)}</span> ${esc(c.note)} <span class="tag">${esc(rewardLabel(c))}</span></li>`).join('')}</ul></details>` : ''}</li>`;
    }).join('');
    return `<section class="panel"><h2>Real-life tracker</h2><p>Track your real habits, goals and one-off tasks here. ${s.settings.integration ? `Rewards are enabled: recording a completion of an item you linked to the RPG gives Pithe ${D.TRACKER_REWARD.exp} EXP and, if you chose a skill, ${D.TRACKER_REWARD.skillExp} skill EXP (each completion pays once; max ${D.TRACKER_REWARD.dailyCap} paid per day).` : 'Rewards are disabled, so nothing here changes Pithe yet.'}</p>
      <p><button class="btn" data-action="toggle-integration">${s.settings.integration ? 'Disable' : 'Enable'} real-life rewards</button></p>
      ${app.trackerMsg ? `<p class="notice" role="status" data-msg>${esc(app.trackerMsg)}</p>` : ''}${app.trackerError ? `<p class="error" role="alert" data-msg>${esc(app.trackerError)}</p>` : ''}
      <form data-form="goal" class="stack">
        <label>Name<input name="name" maxlength="60" required></label>
        <div class="row"><label>Type<select name="kind" aria-describedby="kind-hint"><option value="habit">Habit (repeats)</option><option value="goal">Goal (finishes after N completions)</option><option value="task">One-off task (done after one completion)</option></select><small id="kind-hint">Cadence applies to habits only. Target applies to goals only.</small></label>
        <label data-kinds="habit">Habit cadence<select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        <label data-kinds="goal">Goal target (completions)<input name="target" type="number" min="1" max="365" value="10"></label></div>
        <div class="row"><label class="check"><input type="checkbox" name="rpgLink" ${s.settings.integration ? 'checked' : 'disabled'}> Link to RPG rewards ${s.settings.integration ? '' : '(enable rewards in Settings first)'}</label>
        <label>Skill that gets the reward<select name="linkedSkill">${skillOpts}</select></label></div>
        <button class="btn primary" type="submit">Create</button>
      </form></section>
      <section class="panel"><h2>Your goals and habits</h2>${goals ? `<ul class="goals">${goals}</ul>` : '<p>Nothing tracked yet. Creating one does not count as completing it.</p>'}</section>`;
  }

  function worldView(s) {
    const loc = D.LOCATIONS[s.location];
    const locEnv = (s.worldLocations && s.worldLocations[s.location]) || { activityLevel: 50, reputation: 50, popularity: 50, history: [] };
    const go = Object.keys(D.LOCATIONS).filter((id) => id !== s.location).map((id) => {
      const p = R.preview(s, { kind: 'travel', to: id });
      return actionCard(D.LOCATIONS[id].name, `${D.LOCATIONS[id].desc} Hours: ${D.LOCATIONS[id].open ? D.LOCATIONS[id].open.label : 'always'}.`, { kind: 'travel', to: id }, p, 'Go');
    }).join('');
    const npcs = R.npcsHere(s).map((id) => {
      const sim = s.npcSim && s.npcSim[id];
      const recentMem = sim?.memories?.length ? sim.memories[sim.memories.length - 1].title : null;
      return `<li class="action"><div class="action-main"><strong>${esc(D.NPCS[id].name)}</strong> <span class="tag">${esc(R.relationLabel(s.relations[id] || 0))}</span>
        <p>${esc(D.NPCS[id].role)}. ${esc(D.NPCS[id].desc)}</p>
        ${recentMem ? `<small>Remembers: ${esc(recentMem)}</small>` : ''}</div>
        <button class="btn primary" data-action="open-talk" data-npc="${id}">Talk</button></li>`;
    }).join('');

    // Stories relevant to talked-to NPC
    let storyTalkChoices = '';
    if (app.talkNpc && R.npcLocation(app.talkNpc, s.clock) === s.location) {
      const storiesForPerson = (s.stories?.active || []).filter((st) => st.participants?.includes(app.talkNpc));
      for (const st of storiesForPerson) {
        // Automatically discover when talking to participant
        s.stories.discovered[st.id] = true;
        const tmpl = D.STORY_TEMPLATES[st.templateId];
        const curStage = tmpl?.stages.find((stage) => stage.id === st.stageId);
        if (curStage && curStage.choices && !curStage.ambientOnly) {
          const choiceCards = curStage.choices.map((c) => {
            const reqCheck = R.checkStoryChoiceRequirements(s, c);
            const act = { kind: 'story_decision', storyId: st.id, choiceId: c.id };
            const p = R.preview(s, act);
            return actionCard(`${st.title}: ${c.label}`, c.desc, act, p.ok ? p : { ok: false, error: reqCheck.error || p.error }, 'Decide');
          }).join('');
          storyTalkChoices += `<div class="sub-head"><h3>Storyline: ${esc(st.title)} (${esc(curStage.title)})</h3><p class="hint">${esc(curStage.summary)}</p></div><ul class="actions">${choiceCards}</ul>`;
        }
      }
    }

    let talk = '';
    if (app.talkNpc && R.npcLocation(app.talkNpc, s.clock) === s.location) {
      const n = D.NPCS[app.talkNpc];
      const sim = s.npcSim && s.npcSim[app.talkNpc];
      const mems = sim?.memories ? [...sim.memories].reverse().slice(0, 3) : [];
      talk = `<section class="panel talk"><div class="report-head"><h2>Talking to ${esc(n.name)}</h2><button class="btn small" data-action="close-talk">Leave conversation</button></div>
        ${mems.length ? `<div class="sub-head"><p class="hint">Memories with Pithe & world: ${esc(mems.map((m) => m.title).join('; '))}</p></div>` : ''}
        ${storyTalkChoices}
        <ul class="actions">${R.topicsFor(s, app.talkNpc).map((t) => {
          const act = { kind: 'talk', npc: app.talkNpc, topic: t.id };
          const p = R.preview(s, act);
          return actionCard(t.label, '', act, p.ok ? p : { ok: false, error: t.disabled || p.error }, 'Say it');
        }).join('')}</ul></section>`;
    }

    // Active emergent stories and events at this location
    const activeStoriesHere = (s.stories?.active || []).filter((st) => st.location === s.location);
    const storiesHtml = activeStoriesHere.map((st) => {
      const tmpl = D.STORY_TEMPLATES[st.templateId];
      const curStage = tmpl?.stages.find((stage) => stage.id === st.stageId);
      const isDiscovered = s.stories?.discovered?.[st.id];

      if (!isDiscovered) {
        // Undiscovered story at location can be discovered
        return `<li class="action"><div class="action-main"><strong>Neighborhood Opportunity</strong> <span class="tag warn">Discovery</span>
          <p>You notice unusual activity and conversation regarding local developments.</p>
          <small>Origin: ${esc(D.LOCATIONS[st.location]?.name || st.location)}</small></div>
          <button class="btn primary" data-action="do" data-kind="story_discover" data-story-id="${st.id}">Investigate Situation</button></li>`;
      }

      // Discovered story at location: present choices if not ambient-only
      if (curStage?.choices && !curStage.ambientOnly) {
        const choiceItems = curStage.choices.map((c) => {
          const reqCheck = R.checkStoryChoiceRequirements(s, c);
          const act = { kind: 'story_decision', storyId: st.id, choiceId: c.id };
          const p = R.preview(s, act);
          return actionCard(c.label, c.desc, act, p.ok ? p : { ok: false, error: reqCheck.error || p.error }, 'Decide');
        }).join('');
        return `<li class="action"><div class="action-main"><strong>${esc(st.title)}</strong> <span class="tag good">${esc(curStage.title)}</span>
          <p>${esc(curStage.summary)}</p>
          <small>Deadline: ${esc(R.formatClock(st.stageDeadline))}</small></div></li><ul class="actions">${choiceItems}</ul>`;
      }

      return `<li class="action"><div class="action-main"><strong>${esc(st.title)}</strong> <span class="tag">${esc(curStage?.title || 'Developing')}</span>
        <p>${esc(curStage?.summary || '')}</p>
        <small>In progress. Deadline: ${esc(R.formatClock(st.stageDeadline))}</small></div></li>`;
    }).join('');

    // Active emergent events at this location (Phase 3 & Phase 7)
    const activeEvents = [
      ...(s.worldEvents?.active || []).filter((e) => e.location === s.location),
      ...((s.livingUniverseSim?.activeEvents || []).filter((e) => e.location === s.location).map((e) => ({
        ...e,
        isPhase7: true
      })))
    ];
    const eventsHtml = activeEvents.length
      ? activeEvents.map((ev) => `<li class="action"><div class="action-main"><strong>${esc(ev.name)}</strong> <span class="tag good">Live Event</span>
          <p>${esc(ev.desc)}</p>
          <small>Ends at ${esc(R.formatClock(ev.endClock))}</small></div>
          ${ev.playerParticipated ? '<span class="tag">Attended</span>' : `<button class="btn primary" data-action="do" data-kind="${ev.isPhase7 ? 'phase7_event_participate' : 'event_participate'}" data-id="${ev.id}">${esc(ev.playerOption?.label || 'Participate')}</button>`}</li>`).join('')
      : '';

    // District & Living Universe Conditions
    const distId = R.locationDistrict(s.location);
    const district = s.districts && distId ? s.districts[distId] : null;
    let districtHtml = '';
    if (district) {
      const activeProj = Object.values(s.institutions?.projects || {}).filter((p) => p.location === s.location && !p.completed);
      const activeBiz = Object.values(s.economy?.businesses || {}).filter((b) => b.location === s.location);

      const projsHtml = activeProj.map((p) => {
        const def = D.COMMUNITY_PROJECTS[p.id];
        return `<div class="action"><div class="action-main"><strong>${esc(p.name)}</strong> <span class="tag">${p.progress}/${p.targetProgress}</span>
          <p>${esc(def?.desc || '')}</p></div>
          <button class="btn primary" data-action="do" data-kind="project_contribute" data-project-id="${p.id}">Contribute Effort</button></div>`;
      }).join('');

      const bizHtml = activeBiz.map((b) => {
        return `<div class="action"><div class="action-main"><strong>${esc(b.name)}</strong> <span class="tag ${b.status === 'thriving' || b.status === 'expanding' ? 'good' : b.status === 'struggling' ? 'warn' : ''}">${esc(b.status)}</span>
          <p>${esc(b.desc)} - Weekly Revenue: ${b.weeklyRevenue} money</p></div>
          <button class="btn" data-action="do" data-kind="business_collaborate" data-biz-id="${b.id}">Collaborate</button></div>`;
      }).join('');

      districtHtml = `<section class="panel"><h2>District Context: ${esc(district.name)}</h2>
        <div class="stats">
          <div class="stat"><span>Environment</span><b>${district.environmentalQuality}/100</b></div>
          <div class="stat"><span>Culture</span><b>${district.culturalActivity}/100</b></div>
          <div class="stat"><span>Commerce</span><b>${district.commercialDev}/100</b></div>
          <div class="stat"><span>Civic</span><b>${district.civicDev}/100</b></div>
        </div>
        <div class="row" style="margin-top:0.5rem">
          <button class="btn" data-action="do" data-kind="district_action" data-district-id="${district.id}" data-action-type="clean_streets">Volunteer Sanitation (90m)</button>
          <button class="btn" data-action="do" data-kind="district_action" data-district-id="${district.id}" data-action-type="support_culture">Cultural Patronage ($20)</button>
        </div>
        ${projsHtml ? `<h3>Civic Community Projects</h3><div class="actions">${projsHtml}</div>` : ''}
        ${bizHtml ? `<h3>Local Neighborhood Enterprises</h3><div class="actions">${bizHtml}</div>` : ''}
      </section>`;
    }

    const where = Object.keys(D.NPCS).map((id) => {
      const at = R.npcLocation(id, s.clock);
      return `<li><strong>${esc(D.NPCS[id].name)}</strong> (${esc(D.NPCS[id].role)}): ${at ? `now at ${esc(D.LOCATIONS[at].name)}` : 'not around right now'}.<small>${esc(R.scheduleLabel(id))}</small></li>`;
    }).join('');

    const ev = R.worldEvents(s);
    return `<section class="window"><header><h2>${esc(loc.name)}</h2><p class="sub">${esc(R.formatClock(s.clock))}. ${esc(R.periodOf(s.clock))}.</p></header><p>${esc(loc.desc)}</p>
      <div class="stats"><div class="stat"><span>Activity</span><b>${locEnv.activityLevel}/100</b></div><div class="stat"><span>Reputation</span><b>${locEnv.reputation}/100</b></div><div class="stat"><span>Popularity</span><b>${locEnv.popularity}/100</b></div></div>
      ${ev.length ? `<ul class="notes">${ev.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</section>
      ${talk}
      ${storiesHtml ? `<section class="panel"><h2>Local Developments & Storylines</h2><ul class="actions">${storiesHtml}</ul></section>` : ''}
      ${eventsHtml ? `<section class="panel"><h2>Happening Now at ${esc(loc.name)}</h2><ul class="actions">${eventsHtml}</ul></section>` : ''}
      ${districtHtml}
      <section class="panel"><h2>People here</h2>${npcs ? `<ul class="actions">${npcs}</ul>` : '<p>Nobody you know is here right now.</p>'}</section>
      <section class="panel"><h2>Travel</h2><ul class="actions">${go}</ul></section>
      <section class="panel"><h2>Who is where</h2><ul class="plain">${where}</ul><p class="hint">The world only moves when you act. Time stops when you close the game.</p></section>`;
  }

  function questsView(s) {
    const v = R.questView(s), q = v.q;
    const status = { available: 'Available', active: 'Active', completed: 'Completed', failed: 'Failed' }[q.status];
    let outcome = '';
    if (q.status === 'completed') outcome = `<p class="notice">Completed on ${esc(R.formatClock(q.finishedAt))}. Quality: ${q.outcome}.</p>`;
    if (q.status === 'failed') outcome = `<p class="error">Failed on ${esc(R.formatClock(q.finishedAt))}. You missed the deadline and Dani hired someone else. The world carries on.</p>`;
    return `<section class="window"><header><h2>${esc(D.QUEST.name)}</h2><p class="sub">Status: ${status}. Given by Dani at the Corner Cafe.</p></header>
      <p>${esc(D.QUEST.desc)}</p>
      ${q.status === 'active' ? `<p><strong>Deadline:</strong> ${esc(R.formatClock(q.deadline))} (${R.formatDuration(v.minutesLeft)} left).</p>` : ''}
      ${q.status === 'available' ? `<p>${q.offered ? 'Dani has offered the job. Go back and accept it.' : 'Talk to Dani at the Corner Cafe and ask if she needs help.'}</p>` : ''}
      <h3>Objectives</h3><ul class="objectives">${v.objectives.map((o) => `<li class="${o.done ? 'done' : ''}">${o.done ? '[done]' : '[ ]'} ${esc(o.label)}</li>`).join('')}</ul>
      <p><strong>Reward:</strong> ${esc(D.QUEST.reward)}</p>${outcome}</section>`;
  }

  function inventoryView(s) {
    const owned = Object.entries(s.inventory).map(([id, qty]) => {
      const it = D.ITEMS[id];
      const canUse = it.type === 'food' || it.type === 'consumable';
      const use = canUse ? actionCard(`${it.name} x${qty}`, it.desc, { kind: 'use', item: id }, R.preview(s, { kind: 'use', item: id }), it.type === 'food' ? 'Eat' : 'Use') : `<li class="action"><div class="action-main"><strong>${esc(it.name)} x${qty}</strong><p>${esc(it.desc)}</p><p class="meta"><span class="chip">${it.type === 'tool' ? 'Passive. Works while carried' : 'Ingredient. Use the Cook action at home'}</span></p></div></li>`;
      const sell = it.sell && s.location === 'market' ? actionCard(`Sell ${it.name}`, '', { kind: 'sell', item: id }, R.preview(s, { kind: 'sell', item: id }), `Sell for ${it.sell}`) : '';
      return use + sell;
    }).join('');
    const shop = D.MARKET_STOCK.map((id) => {
      const it = D.ITEMS[id], price = R.priceOf(s, id);
      return actionCard(`${it.name} (${price} money)`, it.desc, { kind: 'buy', item: id }, R.preview(s, { kind: 'buy', item: id }), `Buy for ${price}`);
    }).join('');
    const ev = R.worldEvents(s);
    return `<section class="window"><header><h2>Inventory</h2><p class="sub">Money: <span class="money">${s.money}</span></p></header>${owned ? `<ul class="actions">${owned}</ul>` : '<p>You carry nothing yet.</p>'}</section>
      <section class="panel"><h2>Lantern Market stall</h2>${ev.length ? `<ul class="notes">${ev.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}<p class="hint">Teo trades here 07:00-15:00 (Mon-Sat) and on Saturday 17:00-22:00. You must be at the market. Selling pays about half the price.</p><ul class="actions">${shop}</ul></section>`;
  }

  function careerView(s) {
    const curId = s.career?.currentJob;
    const cur = curId ? D.JOBS[curId] : null;
    const currentCard = cur
      ? `<div class="action-main"><strong>${esc(cur.title)}</strong> <span class="tag">${esc(cur.industry)}</span>
         <p>${esc(cur.company)} - Location: ${esc(D.LOCATIONS[cur.location]?.name || cur.location)}</p>
         <p>Weekly Salary: ${cur.salary} money | Performance: <strong>${s.career.performance}/100</strong></p>
         <p>Experience: ${Math.floor(s.career.experienceDays || 0)} days on the job (${s.career.shiftsWorked || 0} shifts completed).</p></div>
         <div class="row"><button class="btn primary" data-action="do" data-kind="job_work">Work Shift (4h)</button>
         ${cur.nextJob ? `<button class="btn" data-action="do" data-kind="job_promote">Apply for Promotion to ${esc(D.JOBS[cur.nextJob]?.title || 'Next Tier')}</button>` : ''}
         <button class="btn danger" data-action="do" data-kind="job_resign">Resign</button></div>`
      : '<p>You are not currently employed. Select a job vacancy below to apply.</p>';

    const vacancies = Object.values(D.JOBS).filter((j) => j.id !== curId).map((j) => {
      const check = R.checkJobPrerequisites(s, j.id);
      const reqLines = [];
      if (j.requirements?.qualification) reqLines.push(`Qualification: ${D.EDUCATION_PROGRAMS[j.requirements.qualification]?.name || j.requirements.qualification}`);
      if (j.requirements?.attributes) reqLines.push('Attributes: ' + Object.entries(j.requirements.attributes).map(([a, v]) => `${a} ${v}+`).join(', '));
      if (j.requirements?.skills) reqLines.push('Skills: ' + Object.entries(j.requirements.skills).map(([sk, v]) => `${sk} ${v}+`).join(', '));
      if (j.requirements?.expDays) reqLines.push(`Experience: ${j.requirements.expDays} days`);

      return `<li class="action ${check.ok ? '' : 'blocked'}"><div class="action-main"><strong>${esc(j.title)}</strong> <span class="tag">${esc(j.industry)}</span>
        <p>${esc(j.company)} - ${esc(D.LOCATIONS[j.location]?.name || j.location)}</p>
        <p>Salary: ${j.salary} money/week. ${esc(j.desc)}</p>
        <p class="meta">${reqLines.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</p>
        ${check.ok ? '' : `<p class="why">${esc(check.error)}</p>`}</div>
        <button class="btn ${check.ok ? 'primary' : ''}" data-action="do" data-kind="job_apply" data-id="${j.id}" ${check.ok ? '' : 'disabled'}>Apply</button></li>`;
    }).join('');

    return `<section class="panel"><h2>Active Career</h2>${currentCard}</section>
      <section class="panel"><h2>Metropolitan Job Openings</h2><ul class="actions">${vacancies}</ul></section>`;
  }

  function educationView(s) {
    const edu = s.education || { enrolled: [], completed: [], qualifications: [] };
    const enrolledHtml = edu.enrolled.length
      ? edu.enrolled.map((e) => {
          const prog = D.EDUCATION_PROGRAMS[e.id];
          return `<div class="action"><div class="action-main"><strong>${esc(prog.name)}</strong> <span class="tag">${esc(prog.category)}</span>
            <p>${esc(prog.institution)} - Progress: ${e.hoursCompleted}/${e.totalHours} study hours</p>
            ${bar(e.hoursCompleted, e.totalHours, 'exp', 'Course progress')}</div>
            <button class="btn primary" data-action="do" data-kind="edu_study" data-id="${e.id}">Study (2h)</button></div>`;
        }).join('')
      : '<p>You are not currently enrolled in any academic or training course.</p>';

    const catalog = Object.values(D.EDUCATION_PROGRAMS).map((prog) => {
      const isEnrolled = edu.enrolled.some((e) => e.id === prog.id);
      const isDone = edu.qualifications.includes(prog.qualification);
      const canAfford = s.money >= prog.cost;
      return `<li class="action ${isDone || isEnrolled ? '' : canAfford ? '' : 'blocked'}"><div class="action-main"><strong>${esc(prog.name)}</strong> <span class="tag">${esc(prog.category)}</span>
        <p>${esc(prog.institution)} - Tuition: ${prog.cost} money, Duration: ${prog.totalHoursNeeded}h</p>
        <p>${esc(prog.desc)}</p>
        <p class="meta"><span class="chip">Credential: ${esc(prog.qualification)}</span></p></div>
        ${isDone ? '<span class="tag">Graduated</span>' : isEnrolled ? `<button class="btn primary" data-action="do" data-kind="edu_study" data-id="${prog.id}">Study</button>` : `<button class="btn ${canAfford ? 'primary' : ''}" data-action="do" data-kind="edu_enroll" data-id="${prog.id}" ${canAfford ? '' : 'disabled'}>Enroll (${prog.cost} money)</button>`}</li>`;
    }).join('');

    return `<section class="panel"><h2>Current Studies</h2>${enrolledHtml}</section>
      ${edu.qualifications.length ? `<section class="panel"><h2>Earned Credentials</h2><ul class="plain">${edu.qualifications.map((q) => `<li><strong>${esc(q)}</strong></li>`).join('')}</ul></section>` : ''}
      <section class="panel"><h2>Course Catalog</h2><ul class="actions">${catalog}</ul></section>`;
  }

  function financesView(s) {
    const fin = s.finances || { bank: 0, history: [] };
    const hist = [...fin.history].reverse().slice(0, 30);
    return `<div class="cols">
      <section class="panel"><h2>Personal Accounts</h2>
        <div class="stat-row"><p>Cash in Pocket: <strong>${s.money}</strong> money</p>
        <p>Savings Bank Balance: <strong>${fin.bank}</strong> money</p></div>
        <p class="hint">Weekly salaries and business earnings are credited automatically through the transaction ledger. Living expenses ($2/day) and rents/maintenance are deducted deterministically.</p>
      </section></div>
      <section class="panel"><h2>Transaction Ledger (Last 30 Records)</h2>
        ${hist.length ? `<ul class="history">${hist.map((t) => `<li><span class="when">${esc(R.formatClock(t.clock))}</span> <strong>${esc(t.desc)}</strong> <span class="tag">${esc(t.category)}</span> <span class="${t.amount >= 0 ? 'good' : 'warn'}">${t.amount >= 0 ? '+' : ''}${t.amount}</span> (Cash: ${t.cashAfter}, Bank: ${t.bankAfter})</li>`).join('')}</ul>` : '<p>No recorded financial transactions yet.</p>'}
      </section>`;
  }

  function propertiesView(s) {
    const house = s.housing || { primaryHome: 'rented_room', rentals: ['rented_room'], owned: [] };
    const biz = s.business || { owned: [] };

    const propsList = Object.values(D.PROPERTIES).map((prop) => {
      const isPrimary = house.primaryHome === prop.id;
      const isRented = house.rentals.includes(prop.id);
      const isOwned = house.owned.includes(prop.id);

      return `<li class="action"><div class="action-main"><strong>${esc(prop.name)}</strong> <span class="tag">${esc(prop.category)}</span>${isPrimary ? '<span class="tag">Primary Home</span>' : ''}
        <p>${esc(prop.desc)} Location: ${esc(D.LOCATIONS[prop.location]?.name || prop.location)}</p>
        <p>Rent: ${prop.rentCost}/wk ${prop.canBuy ? `| Purchase Deed: ${prop.buyPrice} money (Maint: ${prop.maintenance}/wk)` : ''}</p></div>
        <div class="row">
        ${isOwned ? '<span class="tag">Owned</span>' : isRented ? '<span class="tag">Leased</span>' : `<button class="btn" data-action="do" data-kind="property_rent" data-id="${prop.id}">Lease ($0/mo)</button>`}
        ${!isOwned && prop.canBuy ? `<button class="btn primary" data-action="do" data-kind="property_buy" data-id="${prop.id}">Buy ($0)</button>` : ''}
        ${(isOwned || isRented) && !isPrimary && prop.type === 'residential' ? `<button class="btn" data-action="do" data-kind="property_move" data-id="${prop.id}">Move Here ($20)</button>` : ''}
        </div></li>`;
    }).join('');

    const bizList = biz.owned.length
      ? biz.owned.map((b) => {
          const def = D.BUSINESS_TYPES[b.type];
          return `<div class="action"><div class="action-main"><strong>${esc(b.name)}</strong> <span class="tag">${esc(def.industry)}</span>
            <p>Tier ${b.upgradeLevel} | Staff: ${b.staffCount} | Reputation: ${b.reputation}/100</p>
            <p>Total Revenue: ${b.totalRevenue} | Total Expenses: ${b.totalExpenses}</p></div>
            <div class="row"><button class="btn" data-action="do" data-kind="business_manage" data-id="${b.id}" data-manage-type="hire">Hire Staff ($40)</button>
            <button class="btn primary" data-action="do" data-kind="business_manage" data-id="${b.id}" data-manage-type="upgrade">Upgrade Facility ($150)</button></div></div>`;
        }).join('')
      : '<p>You do not currently own any business ventures.</p>';

    const ventures = Object.values(D.BUSINESS_TYPES).map((v) => {
      const canAfford = s.money >= v.startupCost;
      return `<li class="action ${canAfford ? '' : 'blocked'}"><div class="action-main"><strong>${esc(v.name)}</strong> <span class="tag">${esc(v.industry)}</span>
        <p>${esc(v.desc)} Location: ${esc(D.LOCATIONS[v.location]?.name || v.location)}</p>
        <p>Startup Capital: ${v.startupCost} money | Est. Weekly Net: +${v.baseWeeklyRevenue - v.baseWeeklyExpenses}</p></div>
        <button class="btn ${canAfford ? 'primary' : ''}" data-action="do" data-kind="business_found" data-id="${v.id}" ${canAfford ? '' : 'disabled'}>Found Business ($0)</button></li>`;
    }).join('');

    // Local economy macroeconomic trends
    const eco = s.economy || {};
    const macroHtml = `<section class="panel"><h2>Metropolitan Economic Climate</h2>
      <div class="stats">
        <div class="stat"><span>Prosperity</span><b>${eco.prosperityIndex || 70}/100</b></div>
        <div class="stat"><span>Cost Index</span><b>${((eco.priceMultiplier || 1.0) * 100).toFixed(0)}%</b></div>
        <div class="stat"><span>Sector Demand</span><b>Tech ${eco.sectorDemand?.technology || 70}%</b></div>
        <div class="stat"><span>Retail Demand</span><b>Retail ${eco.sectorDemand?.retail || 70}%</b></div>
      </div>
      <p class="hint">The local macroeconomic climate affects price inflation at Lantern Market, enterprise profitability, and hiring demand across districts.</p>
    </section>`;

    return `<section class="panel"><h2>Real Estate & Residences</h2><ul class="actions">${propsList}</ul></section>
      ${macroHtml}
      <section class="panel"><h2>Your Enterprises</h2>${bizList}</section>
      <section class="panel"><h2>Found a New Business</h2><ul class="actions">${ventures}</ul></section>`;
  }


  function competitionsView(s) {
    R.ensurePhase4(s);
    const comps = Object.values(D.COMPETITIONS);
    const history = [...(s.competitions.history || [])].reverse().slice(0, 15);

    const cards = comps.map((c) => {
      const active = R.isCompetitionActive(c, s.clock);
      const isHere = s.location === c.location;
      const rec = s.competitions.records[c.id] || { bestPlacement: 'none', entriesCount: 0 };
      const canAfford = s.money >= c.entryFee;

      const stratOptions = c.strategies.map((st) => {
        const canEnergy = s.needs.energy >= st.energyCost;
        return `<div class="action"><div class="action-main"><strong>${esc(st.label)}</strong>
          <small>Energy Cost: ${st.energyCost} | Risk: ${st.risk.toUpperCase()}</small></div>
          <button class="btn ${active && isHere && canAfford && canEnergy ? 'primary' : ''}" data-action="do" data-kind="competition_enter" data-id="${c.id}" data-strategy-id="${st.id}" ${active && isHere && canAfford && canEnergy ? '' : 'disabled'}>Enter (${c.entryFee})</button></div>`;
      }).join('');

      return `<section class="panel">
        <div class="attr-top"><strong>${esc(c.name)}</strong> <span class="tag ${active ? 'good' : 'muted'}">${active ? 'Live Now' : 'Scheduled'}</span></div>
        <p>${esc(c.desc)} Location: <strong>${esc(D.LOCATIONS[c.location]?.name || c.location)}</strong></p>
        <p class="meta"><span class="chip">Domain: ${esc(c.domain)}</span> <span class="chip">Primary Skill: ${esc(c.primarySkill)}</span> <span class="chip">Fee: ${c.entryFee} money</span></p>
        <p><small>Your Record: ${rec.bestPlacement.toUpperCase()} (Entries: ${rec.entriesCount}) | Competitors: ${c.npcCompetitors.map((id) => D.NPCS[id]?.name || id).join(', ')}</small></p>
        ${!isHere ? `<p class="why">You must travel to ${esc(D.LOCATIONS[c.location]?.name || c.location)} to participate.</p>` : ''}
        ${isHere && !active ? `<p class="why">Tournament inactive right now. Runs on scheduled days between ${c.activeHours[0]}:00 and ${c.activeHours[1]}:00.</p>` : ''}
        <div class="actions">${stratOptions}</div>
      </section>`;
    }).join('');

    const historyHtml = history.length
      ? `<ul class="history">${history.map((h) => `<li><span class="when">${esc(R.formatClock(h.clock))}</span> <strong>${esc(D.COMPETITIONS[h.compId]?.name || h.compId)}</strong> <span class="tag ${h.placement === 'gold' ? 'good' : h.placement === 'silver' ? 'good' : 'warn'}">${esc(h.placement.toUpperCase())}</span> - Rank #${h.rank} (${esc(h.prizeTitle)})</li>`).join('')}</ul>`
      : '<p>No competition attempts recorded yet.</p>';

    return `<div class="cols">
      <section class="panel"><h2>Metropolitan Tournament Circuit</h2>
        <p class="hint">Test your demonstrated skills against skilled local residents and rivals in official city contests. Pacing and strategy matter.</p>
      </section></div>
      ${cards}
      <section class="panel"><h2>Past Tournament Record</h2>${historyHtml}</section>`;
  }

  function organizationsView(s) {
    R.ensurePhase4(s);
    const orgs = Object.values(D.ORGANIZATIONS);
    const mems = s.organizations.memberships || {};

    const orgCards = orgs.map((org) => {
      const mem = mems[org.id];
      const isHere = s.location === org.location;
      const canAfford = s.money >= org.membershipCost;

      if (mem) {
        const curRank = org.ranks.find((r) => r.id === mem.rankId) || org.ranks[0];
        const curRankIdx = org.ranks.findIndex((r) => r.id === mem.rankId);
        const nextRank = org.ranks[curRankIdx + 1];

        const contribsHtml = org.contributions.map((c) => {
          const canEnergy = s.needs.energy >= -c.energy;
          return `<div class="action"><div class="action-main"><strong>${esc(c.name)}</strong>
            <small>Energy: ${c.energy} | Standing: +${c.contribPoints} pts | Rewards: +${c.repVal} ${c.repType} rep</small></div>
            <button class="btn ${isHere && canEnergy ? 'primary' : ''}" data-action="do" data-kind="org_contribute" data-id="${org.id}" data-contrib-id="${c.id}" ${isHere && canEnergy ? '' : 'disabled'}>Contribute</button></div>`;
        }).join('');

        return `<section class="panel">
          <div class="attr-top"><strong>${esc(org.name)}</strong> <span class="tag good">Member: ${esc(curRank.title)}</span></div>
          <p>${esc(org.desc)} Headquarters: <strong>${esc(D.LOCATIONS[org.location]?.name || org.location)}</strong></p>
          <p>Active Perk: <em>${esc(curRank.perk)}</em></p>
          <p>Standing: <strong>${mem.points}</strong> contribution points ${nextRank ? `(${nextRank.reqContrib - mem.points} pts needed for ${nextRank.title})` : '(Highest Leadership Rank Achieved)'}</p>
          ${!isHere ? `<p class="why">You must be at ${esc(D.LOCATIONS[org.location]?.name || org.location)} to perform group contribution duties.</p>` : ''}
          <h3>Contribution Projects</h3>
          <div class="actions">${contribsHtml}</div>
        </section>`;
      }

      return `<section class="panel">
        <div class="attr-top"><strong>${esc(org.name)}</strong> <span class="tag">Prospect</span></div>
        <p>${esc(org.desc)}</p>
        <p class="meta"><span class="chip">HQ: ${esc(D.LOCATIONS[org.location]?.name || org.location)}</span> <span class="chip">Dues: ${org.membershipCost} money</span></p>
        <p><small>Affiliated Residents: ${org.npcMembers.map((id) => D.NPCS[id]?.name || id).join(', ')}</small></p>
        <div class="row">
          <button class="btn ${isHere && canAfford ? 'primary' : ''}" data-action="do" data-kind="org_join" data-id="${org.id}" ${isHere && canAfford ? '' : 'disabled'}>Join ${esc(org.name)} (${org.membershipCost})</button>
        </div>
        ${!isHere ? `<p class="why">Visit ${esc(D.LOCATIONS[org.location]?.name || org.location)} to submit your membership pledge.</p>` : ''}
      </section>`;
    }).join('');

    // Phase 7 Civic Initiatives & Public Projects overview in Organizations
    const civicProjects = Object.values(s.institutions?.projects || {});
    const civicProjectsHtml = civicProjects.length
      ? `<section class="panel"><h2>Metropolitan Civic Projects & Initiatives</h2>
          <p class="hint">Civic institutions and guilds lead sustainable community public works. Completed: ${s.institutions?.completedProjects?.length || 0}. Total Community Contributions: ${s.institutions?.totalContributions || 0}.</p>
          <ul class="actions">${civicProjects.map((p) => {
            const def = D.COMMUNITY_PROJECTS[p.id];
            const isHere = s.location === p.location;
            const canAfford = !def.costPerContribution || s.money >= def.costPerContribution;
            const canEnergy = s.needs.energy >= def.energyPerContribution;
            return `<li class="action"><div class="action-main"><strong>${esc(p.name)}</strong> <span class="tag ${p.completed ? 'good' : ''}">${p.completed ? 'Completed' : `${p.progress}/${p.targetProgress}`}</span>
              <p>${esc(def?.desc || '')} Location: <strong>${esc(D.LOCATIONS[p.location]?.name || p.location)}</strong></p>
              ${p.completed ? '' : `<small>Cost: ${def.costPerContribution || 0} money | Energy: ${def.energyPerContribution} | Skill: ${def.skill || 'general'}</small>`}</div>
              ${p.completed ? '<span class="tag good">Finished</span>' : `<button class="btn ${isHere && canAfford && canEnergy ? 'primary' : ''}" data-action="do" data-kind="project_contribute" data-project-id="${p.id}" ${isHere && canAfford && canEnergy ? '' : 'disabled'}>Contribute</button>`}</li>`;
          }).join('')}</ul></section>`
      : '';

    return `<div class="cols">
      <section class="panel"><h2>Guilds, Collectives & Societies</h2>
        <p class="hint">Join civic associations and professional guilds to collaborate with like-minded residents, unlock unique privileges, and assume leadership roles.</p>
      </section></div>
      ${civicProjectsHtml}
      ${orgCards}`;
  }


  function moreView() {
    const row = (id) => { const m = MORE_PAGES.find((x) => x[0] === id); return listCard(m[0], m[1], m[2]); };
    return `<div class="cols">
      <section class="panel"><h2>Life & Enterprise</h2>${['career', 'education', 'finances', 'properties', 'competitions', 'organizations'].map(row).join('')}</section>
      <section class="panel"><h2>Daily Life & System</h2>${['tracker', 'quests', 'inventory', 'settings'].map(row).join('')}</section>
    </div>`;
  }

  function headerHtml(s) {
    const back = navOwner(app.view) === 'more' && app.view !== 'more' ? '<button class="btn small back" data-action="nav" data-view="more">Back to More</button>' : '';
    const nCount = notificationsList(s).length;
    const tool = (id, label, icon, extra = '') => `<button class="toolbtn ${app.panel === id ? 'on' : ''}" data-action="panel" data-panel="${id}" aria-expanded="${app.panel === id}" aria-controls="header-panel">${icon}<span class="tl">${label}</span>${extra}</button>`;
    return `<header class="appbar"><div class="appbar-id"><p class="apptitle">TAP Protocol</p><p class="tagline">Your life. Your world. Your protocol.</p></div>
      <div class="appbar-tools">${tool('messages', 'Messages', ICON.messages)}${tool('notifications', 'Notifications', ICON.bell, nCount ? ` <span class="badge" aria-label="${nCount} new">${nCount}</span>` : '')}</div>
      <div class="appbar-sub"><p class="gametime" aria-label="Game time">${esc(R.formatClock(s.clock))}, ${esc(R.periodOf(s.clock).toLowerCase())}</p>${back}<p id="save-status" class="savestat" role="status">${esc(app.saveStatus)}</p></div></header>`;
  }

  function panelHtml(s) {
    if (!app.panel) return '';
    let title, body;
    if (app.panel === 'messages') {
      title = 'Messages';
      body = '<p>No messages. Nobody has written to Pithe, and messaging is not part of this version of the game yet.</p>';
    } else {
      title = 'Notifications';
      const list = notificationsList(s);
      body = list.length ? `<ul class="plain">${list.map((n) => `<li><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small></li>`).join('')}</ul>` : '<p>No notifications. Warnings about your needs and quest deadlines appear here when they matter.</p>';
    }
    return `<section class="popover" id="header-panel" role="region" aria-labelledby="hp-title"><div class="report-head"><h2 id="hp-title">${title}</h2><button class="btn small" data-action="close-panel">Close</button></div>${body}</section>`;
  }

  function modalHtml() {
    if (app.confirmDlg) {
      const d = app.confirmDlg;
      return `<div class="modal-back"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc"><h2 id="modal-title">${esc(d.title)}</h2>
      <div id="modal-desc">${d.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
      <div class="row"><button class="btn danger" data-action="confirm">${esc(d.confirmLabel)}</button><button class="btn" data-action="cancel">Cancel</button></div></div></div>`;
    }
    if (!app.pending) return '';
    const { title, p } = app.pending;
    return `<div class="modal-back"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc"><h2 id="modal-title">Warning: ${esc(title)}</h2>
      <p id="modal-desc">Hardcore difficulty. Consider these consequences before you continue:</p>
      <ul class="notes">${p.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      <div class="row"><button class="btn danger" data-action="confirm">Proceed anyway</button><button class="btn" data-action="cancel">Cancel</button></div></div></div>`;
  }

  // ------------------------------------------------------------ render
  function render() {
    if (!app.state) { root.innerHTML = setupHtml(); return; }
    const s = app.state;
    const viewFns = {
      dashboard: dashboardView, character: characterView, journal: journalView,
      tracker: trackerView, world: worldView, quests: questsView, inventory: inventoryView,
      settings: settingsView, more: moreView, career: careerView, education: educationView,
      finances: financesView, properties: propertiesView, competitions: competitionsView, organizations: organizationsView
    };
    const body = (viewFns[app.view] || dashboardView)(s);
    const here = navOwner(app.view);
    const keep = focusKey();
    captureDrafts();
    const nav = NAV.map(([id, label]) => `<button class="navbtn ${here === id ? 'on' : ''}" data-action="nav" data-view="${id}" ${here === id ? 'aria-current="page"' : ''}>${ICON[NAV_ICON[id]]}${label}</button>`).join('');
    root.innerHTML = `<div class="app"${app.pending || app.confirmDlg ? ' inert aria-hidden="true"' : ''}>
      <main class="main" id="main" tabindex="-1">${headerHtml(s)}${app.saveError ? `<section class="report fail" role="alert"><p><strong>Your last change could not be saved on this device.</strong> ${esc(app.saveError)}</p><p class="hint">Keep this tab open and use More, Settings and save data, Export save file to keep a copy.</p></section>` : ''}${panelHtml(s)}<div class="page-heading"><div><div class="eyebrow">Pithe / ${esc(HEADINGS[app.view][0])}</div><h1 class="viewtitle">${TITLES[app.view]}</h1><p class="lede">${esc(HEADINGS[app.view][1])}</p></div></div>${app.view === 'dashboard' ? heroStatus(s) : statusBar(s)}${reportHtml(app.report)}${body}</main>
      <nav class="nav" aria-label="Main"><div class="navlist">${nav}</div></nav></div>${modalHtml()}`;
    restoreDrafts();
    manageFocus();
    const gf = root.querySelector('form[data-form="goal"]'); if (gf) syncKindFields(gf);
    if (app.reveal) {
      // New feedback (a result, an error, a confirmation) may be far from the button that was pressed: bring it into view and
      // move focus to it so keyboard and screen-reader users land on it.
      const el = root.querySelector(app.reveal); app.reveal = null;
      if (el && !app.pending && !app.confirmDlg) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); if (el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }
    }
    if (app.focusNext) {
      const f = app.focusNext; app.focusNext = null;
      const el = f === 'panel' ? root.querySelector('#header-panel [data-action="close-panel"]') : root.querySelector(`[data-action="panel"][data-panel="${f}"]`);
      if (el) el.focus({ preventScroll: true });
    }
    // Every render rebuilds the page, so keyboard focus would fall back to the top of the document. Put it back on the same control.
    if (keep && (!document.activeElement || document.activeElement === document.body)) { const again = root.querySelector(keep); if (again) again.focus({ preventScroll: true }); }
  }

  // Text typed into the Journal, Tracker and Import forms survives re-renders (opening a panel, cancelling a dialog, a failed
  // submit, visiting another page). It is dropped only when that form is submitted successfully.
  const DRAFT_FORMS = ['journal', 'goal', 'import'];
  function captureDrafts() {
    for (const kind of DRAFT_FORMS) {
      if (skipCapture.delete(kind)) continue;
      const f = root.querySelector(`form[data-form="${kind}"]`); if (!f) continue;
      const d = {};
      f.querySelectorAll('[name]').forEach((el) => { if (el.disabled) return; if (el.type === 'checkbox') d[el.name] = el.checked; else if (el.type !== 'hidden') d[el.name] = el.value; });
      app.formDrafts[kind] = d;
    }
  }
  function restoreDrafts() {
    for (const kind of DRAFT_FORMS) {
      const d = app.formDrafts[kind], f = root.querySelector(`form[data-form="${kind}"]`);
      if (!d || !f) continue;
      f.querySelectorAll('[name]').forEach((el) => { if (!(el.name in d)) return; if (el.type === 'checkbox') { if (!el.disabled) el.checked = d[el.name]; } else if (el.type !== 'hidden') el.value = d[el.name]; });
    }
  }
  const skipCapture = new Set();
  const clearDraft = (kind) => { delete app.formDrafts[kind]; skipCapture.add(kind); };

  // A selector that finds the focused control again after a re-render (controls identified by data attributes or by name in a form).
  function focusKey() {
    const a = document.activeElement;
    if (!a || a === document.body || !root.contains(a) || app.pending || app.confirmDlg) return null;
    if (a.classList && a.classList.contains('navbtn')) return `.navbtn[data-view="${cssEsc(a.dataset.view)}"]`;
    if (a.dataset && a.dataset.action) return selectorFor(a);
    const f = a.closest && a.closest('form[data-form]');
    if (f && a.name && !f.querySelector('input[name="goal"]')) return `form[data-form="${f.dataset.form}"] [name="${cssEsc(a.name)}"]`;
    return null;
  }

  // Focus handling for the warning dialog: move focus in when it opens (onto Cancel, the safe choice) and
  // back to the control that opened it when it closes. The rest of the page is inert while it is open.
  function manageFocus() {
    if (app.pending || app.confirmDlg) {
      app.modalOpen = true;
      const safe = root.querySelector('.modal [data-action="cancel"]');
      if (safe) safe.focus();
    } else if (app.modalOpen) {
      app.modalOpen = false;
      const back = (app.lastTrigger && root.querySelector(app.lastTrigger)) || root.querySelector('#main');
      if (back) back.focus({ preventScroll: true });
    }
  }

  const cssEsc = (v) => String(v).replace(/["\\]/g, '\\$&');
  function selectorFor(el) {
    return '[' + Object.entries(el.dataset).map(([k, v]) => `data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${cssEsc(v)}"`).join('][') + ']';
  }

  function closePanel(returnFocus) {
    const id = app.panel; app.panel = null; app.focusNext = returnFocus ? id : null; render();
  }

  function onKeydown(e) {
    if (!app.pending && !app.confirmDlg) { if (e.key === 'Escape' && app.panel) { e.preventDefault(); closePanel(true); } return; }
    if (e.key === 'Escape') { e.preventDefault(); app.pending = null; app.confirmDlg = null; render(); return; }
    if (e.key !== 'Tab') return;
    const items = [...root.querySelectorAll('.modal button:not(:disabled)')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (!items.includes(at)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }

  // ------------------------------------------------------------ actions
  const titleOf = (a) => a.kind === 'activity' ? D.ACTIVITIES[a.id].name : a.kind === 'travel' ? `Travel to ${D.LOCATIONS[a.to].name}` : a.kind === 'talk' ? 'Conversation' : a.kind === 'buy' ? 'Purchase' : a.kind === 'sell' ? 'Sale' : 'Use item';

  function runAction(action, force = false) {
    const p = R.preview(app.state, action);
    if (!p.ok) { app.report = { ok: false, error: p.error }; app.reveal = '.report'; render(); return; }
    if (p.warnings.length && !force) { app.pending = { action, p, title: titleOf(action) }; render(); return; }
    app.report = R.execute(app.state, action);
    if (app.talkNpc && R.npcLocation(app.talkNpc, app.state.clock) !== app.state.location) app.talkNpc = null;
    app.reveal = '.report';
    render();
    persist();
  }

  function readAction(el) {
    const d = el.dataset;
    const a = { kind: d.kind };
    for (const k of ['id', 'to', 'npc', 'topic', 'item', 'interactType', 'romanceType', 'familyType', 'manageType', 'childName', 'skillId', 'specId', 'strategyId', 'contribId', 'storyId', 'choiceId', 'oralId', 'heirId', 'templateKey', 'districtId', 'actionType', 'projectId', 'bizId', 'collabType', 'eventId']) if (d[k] !== undefined) a[k] = d[k];
    return a;
  }

  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!app.state) return;
    // A click outside an open Messages/Notifications panel (and not on its own buttons) closes it.
    if (app.panel && !e.target.closest('#header-panel') && !(el && el.dataset.action === 'panel')) { app.panel = null; if (!el || el.disabled) render(); }
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    if (a === 'panel') { const id = el.dataset.panel; if (app.panel === id) closePanel(true); else { app.panel = id; app.focusNext = 'panel'; render(); } }
    else if (a === 'close-panel') closePanel(true);
    else if (a === 'home-tab') { app.homeTab = el.dataset.tab; render(); }
    else if (a === 'nav') {
      if (app.view !== el.dataset.view) { app.report = null; app.trackerMsg = ''; app.trackerError = ''; app.journalError = ''; app.importError = ''; app.resetError = ''; app.exportMsg = ''; }
      app.view = el.dataset.view; app.talkNpc = app.view === 'world' ? app.talkNpc : null; render();
      const target = el.dataset.anchor && root.querySelector('#' + el.dataset.anchor);
      if (target && target.scrollIntoView) target.scrollIntoView(); else window.scrollTo && window.scrollTo(0, 0);
    }
    else if (a === 'do') { app.lastTrigger = selectorFor(el); runAction(readAction(el)); }
    else if (a === 'confirm') {
      if (app.confirmDlg) { const run = app.confirmDlg.run; app.confirmDlg = null; run(); }
      else { const act = app.pending.action; app.pending = null; runAction(act, true); }
    }
    else if (a === 'cancel') { app.pending = null; app.confirmDlg = null; render(); }
    else if (a === 'dismiss') { app.report = null; app.reveal = '.viewtitle'; render(); }
    else if (a === 'open-talk') { app.talkNpc = el.dataset.npc; app.view = 'world'; render(); }
    else if (a === 'close-talk') { app.talkNpc = null; render(); }
    else if (a === 'open-succession') {
      const succId = el.dataset.id;
      const prev = R.previewSuccession(app.state, succId);
      if (!prev.ok) {
        app.report = { ok: false, title: 'Succession Unavailable', narrative: [prev.error], notes: [], changes: [] };
        render();
        return;
      }
      app.confirmDlg = {
        title: `Confirm Generational Succession: ${prev.successor.name}`,
        lines: [
          `Passing the torch will conclude ${prev.predecessorName}'s active life chapter and begin Generation ${prev.nextGeneration} as ${prev.successor.name}.`,
          `Transferred assets & heritage:`,
          ...prev.breakdown.transferred.map((t) => `* ${t}`),
          `Independent successor identity:`,
          ...prev.breakdown.notTransferred.map((t) => `* ${t}`)
        ],
        confirmLabel: `Pass the Torch to ${prev.successor.name}`,
        run: () => {
          const res = R.retireAndSucceed(app.state, succId, true);
          if (res.ok) {
            app.report = { ok: true, title: res.title, narrative: res.narrative, notes: [`Now playing ${app.state.character.name} (Generation ${app.state.family.generation}).`], changes: [] };
            app.reveal = '.report';
            render();
            persist();
          } else {
            app.report = { ok: false, title: 'Succession Error', narrative: [res.error], notes: [], changes: [] };
            render();
          }
        }
      };
      render();
    }
    else if (a === 'tab') { app.journalTab = el.dataset.tab; render(); }
    else if (a === 'toggle-integration') { app.state.settings.integration = !app.state.settings.integration; render(); persist(); }
    else if (a === 'export') { const fname = `tap-protocol-save-${R.localDateStr()}.json`; deps.download(fname, deps.exportJson(app.state)); app.exportMsg = `Export started: ${fname}. Your browser saves it to its usual download location. If nothing arrives, check the browser's downloads list or its permission to download files.`; app.reveal = '[data-msg-export]'; render(); }
  }

  // A double click on a submit button re-submits the freshly emptied form a moment after the first (successful) submit.
  // That second, empty submit must not replace the success message with a confusing "enter a name" error.
  const lastOk = {};
  const justDone = (kind) => Date.now() - (lastOk[kind] || 0) < 700;

  function onSubmit(e) {
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fd = new FormData(f);
    const kind = f.dataset.form;
    if (kind === 'create') {
      app.draft = { name: fd.get('name'), age: fd.get('age'), appearance: fd.get('appearance'), background: fd.get('background'), trait: fd.get('trait'), integration: fd.get('integration') === 'on' };
      const res = R.createCharacter(app.draft);
      if (!res.ok) { app.errors = res.errors; app.reveal = '.errors'; render(); return; }
      app.errors = []; app.state = res.state; app.view = 'dashboard'; app.reveal = '.report';
      app.report = { ok: true, title: 'Arrival', narrative: [`You step off the last bus into the Harbor Quarter. It is early on Monday 4 March 2030, and the lane is still wet. ${res.intro}`, 'Find work, find food and find out what this place has for you.'], notes: [], changes: [] };
      render(); persist();
    } else if (kind === 'journal') {
      const r = R.execute(app.state, { kind: 'journal', type: fd.get('type'), title: fd.get('title'), text: fd.get('text'), now: new Date() });
      if (!r.ok) { if (justDone('journal') && !String(fd.get('text') || '').trim()) return; app.journalError = r.error; app.reveal = '[data-msg]'; render(); return; }
      lastOk.journal = Date.now(); clearDraft('journal'); app.journalError = ''; app.report = r; app.reveal = '.report'; render(); persist();
    } else if (kind === 'goal') {
      const r = R.addGoal(app.state, { name: fd.get('name'), kind: fd.get('kind'), cadence: fd.get('cadence'), target: fd.get('target'), rpgLink: fd.get('rpgLink') === 'on', linkedSkill: fd.get('linkedSkill') }, R.localDateStr(new Date()));
      if (!r.ok && justDone('goal') && !String(fd.get('name') || '').trim()) return;
      if (r.ok) { lastOk.goal = Date.now(); clearDraft('goal'); }
      app.trackerError = r.ok ? '' : r.error; app.trackerMsg = r.ok ? `Created "${r.goal.name}". It is not complete until you record it.` : '';
      if (r.ok) app.report = null;
      app.reveal = '[data-msg]'; render(); if (r.ok) persist();
    } else if (kind === 'record') {
      const r = R.recordCompletion(app.state, Number(fd.get('goal')), R.localDateStr(new Date()), fd.get('note') || '');
      app.trackerError = r.ok ? '' : r.error; app.trackerMsg = r.ok ? r.message : '';
      if (r.ok) app.report = r.report || null;
      app.reveal = r.ok && r.report ? '.report' : '[data-msg]'; render(); if (r.ok) persist();
    } else if (kind === 'import') {
      const raw = String(fd.get('json') || '');
      const r = raw.trim() ? deps.parseImport(raw) : { ok: false, error: 'Paste the contents of a save file first.' };
      if (!r.ok) { app.importError = r.error; app.reveal = '[data-msg]'; render(); return; }
      app.importError = '';
      // Importing replaces the whole current game. Say exactly what will be replaced and with what, and ask first.
      const inc = r.state, cur = app.state;
      app.lastTrigger = 'form[data-form="import"] button[type="submit"]';
      app.confirmDlg = {
        title: 'Replace the current game?',
        lines: [`The file contains ${inc.character.name}, level ${inc.character.level}, game time ${R.formatClock(inc.clock)}.`, `This device currently has ${cur.character.name}, level ${cur.character.level}, game time ${R.formatClock(cur.clock)}. It will be replaced and cannot be restored unless you exported it first.`],
        confirmLabel: 'Replace current game',
        run: () => { clearDraft('import'); app.state = inc; app.report = { ok: true, title: 'Save imported', narrative: [], notes: [`Now playing ${inc.character.name}, level ${inc.character.level}.`], changes: [] }; app.reveal = '.report'; render(); persist(); }
      };
      render();
    } else if (kind === 'reset') {
      if (fd.get('confirm') !== 'RESET') { app.resetError = 'Type RESET exactly to confirm. Nothing was deleted.'; app.reveal = '[data-msg]'; render(); return; }
      app.resetError = '';
      app.chain = app.chain.then(() => deps.clear()).then(() => { app.state = null; app.report = null; app.draft = {}; app.view = 'dashboard'; app.panel = null; app.reveal = '.setup-head h1'; render(); });
    }
  }

  // Tracker form: show only the fields that apply to the chosen type (cadence for habits, target for goals).
  function syncKindFields(form) {
    const kind = form.querySelector('select[name="kind"]').value;
    form.querySelectorAll('[data-kinds]').forEach((el) => { el.hidden = el.dataset.kinds !== kind; });
  }
  root.addEventListener('change', (e) => { if (e.target.matches && e.target.matches('form[data-form="goal"] select[name="kind"]')) syncKindFields(e.target.form); });

  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('keydown', onKeydown);
  // Escape closes an open Messages/Notifications panel even when focus is on plain page content.
  root.ownerDocument.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.panel && !app.pending && !app.confirmDlg && !root.contains(e.target)) closePanel(true); });

  // Used by cloud sync only: swap in a save downloaded from the cloud and write it to this device.
  // It saves through saveLocalOnly so the write cannot start another upload.
  // `guard` (optional) must still be true when the write starts AND when it finishes, otherwise the player acted in
  // the meantime and nothing is replaced (their newer change is saved by the normal save already queued behind us).
  const changedMeanwhile = () => { const e = new Error('The game changed while the cloud save was being loaded. Nothing was replaced.'); e.code = 'LOCAL_CHANGED'; return e; };
  app.applyRemote = (state, guard) => {
    const p = app.chain.then(() => { if (guard && !guard()) throw changedMeanwhile(); return (deps.saveLocalOnly || deps.save)(state); }).then((r) => {
      if (!r || !r.ok) throw new Error('Could not save the cloud copy on this device' + (r && r.error ? ': ' + r.error : '') + '.');
      if (guard && !guard()) throw changedMeanwhile();
      app.state = state; app.pending = null; app.talkNpc = null;
      app.report = { ok: true, title: 'Cloud save loaded', narrative: [], notes: ['Your progress from the cloud is now on this device.'], changes: [] };
      app.saveStatus = 'Loaded from the cloud'; render();
    });
    app.chain = p.catch(() => {});   // a failed cloud apply must never stall later local saves
    return p;
  };
  app.render = render; app.settle = settle; app.persist = persist;
  return app;
}
