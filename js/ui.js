// TAP Protocol - interface. Renders HTML strings into one root element and handles events by delegation.
// Every control carries data-action (clicks) or data-form (submits). No emojis anywhere in this project.
import * as D from './data.js';
import * as R from './rules.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const VIEWS = [['dashboard', 'Dashboard'], ['character', 'Character'], ['journal', 'Journal'], ['tracker', 'Tracker'], ['world', 'World'], ['quests', 'Quests'], ['inventory', 'Inventory']];
const bgOf = (s) => D.BACKGROUNDS.find((b) => b.id === s.character.background);
const traitOf = (s) => D.TRAITS.find((t) => t.id === s.character.trait);

function bar(v, max, cls = '', label = '') {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="bar ${cls}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}"><span style="width:${pct}%"></span></div>`;
}

export function createApp(root, deps) {
  const app = {
    state: null, view: 'dashboard', report: null, pending: null, talkNpc: null, journalTab: 'entries',
    saveStatus: '', draft: {}, errors: [], journalError: '', trackerMsg: '', trackerError: '', importError: '', resetError: '',
    chain: Promise.resolve(), recovered: false
  };

  const settle = () => app.chain;
  function persist() {
    app.chain = app.chain.then(() => deps.save(app.state)).then((r) => {
      app.saveStatus = r.ok ? 'Saved locally' : `Save failed: ${r.error}`;
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
      <div class="report-head"><h3>${esc(r.title)}</h3><button class="btn small" data-action="dismiss">Dismiss</button></div>
      ${r.narrative.map((t) => `<p class="story">${esc(t)}</p>`).join('')}
      ${r.notes.length ? `<ul class="notes">${r.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${r.changes.length ? `<ul class="changes">${r.changes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function actionCard(title, desc, action, p, label) {
    const data = Object.entries(action).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    const meta = p.ok ? `<p class="meta"><span class="chip">${R.formatDuration(p.minutes)}</span>${p.variable ? '<span class="chip">Outcome varies</span>' : ''}${p.changes.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}${p.warnings.length ? '<span class="chip warn">Warning</span>' : ''}</p>` : `<p class="why">${esc(p.error)}</p>`;
    return `<li class="action ${p.ok ? '' : 'blocked'}"><div class="action-main"><strong>${esc(title)}</strong>${desc ? `<p>${esc(desc)}</p>` : ''}${meta}</div>
      <button class="btn ${p.ok ? 'primary' : ''}" data-action="do" ${data} ${p.ok ? '' : 'disabled'}>${esc(label)}</button></li>`;
  }

  function statusWindow(s) {
    const c = s.character, n = s.needs;
    const tags = [];
    if (n.energy < 20) tags.push('Exhausted: gains halved');
    if (n.satiety < 20) tags.push(n.satiety === 0 ? 'Starving: losing health' : 'Hungry');
    if (n.health < 40) tags.push('Injured');
    return `<section class="window status" aria-label="Status">
      <header><h2>${esc(c.name)}</h2><p class="sub">Level ${c.level}. ${esc(bgOf(s).name)}, ${esc(traitOf(s).name)}. Hardcore.</p></header>
      <div class="needs">
        <div><span>Health ${n.health}/100</span>${bar(n.health, 100, 'health', 'Health')}</div>
        <div><span>Energy ${n.energy}/100</span>${bar(n.energy, 100, 'energy', 'Energy')}</div>
        <div><span>Satiety ${n.satiety}/100</span>${bar(n.satiety, 100, 'satiety', 'Satiety')}</div>
        <div><span>EXP ${c.exp}/${R.expNeed(c.level)}</span>${bar(c.exp, R.expNeed(c.level), 'exp', 'EXP')}</div>
      </div>
      ${tags.length ? `<p class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}
      <dl class="facts">
        <div><dt>Date</dt><dd>${esc(R.formatClock(s.clock))}</dd></div>
        <div><dt>Time of day</dt><dd>${esc(R.periodOf(s.clock))}</dd></div>
        <div><dt>Location</dt><dd>${esc(D.LOCATIONS[s.location].name)}</dd></div>
        <div><dt>Money</dt><dd class="money">${s.money}</dd></div>
      </dl>
    </section>`;
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
          <label class="check"><input type="checkbox" name="integration" ${d.integration ? 'checked' : ''}> Link real-life goals to RPG rewards (optional, off by default, changeable later)</label>
        </fieldset>
        <button class="btn primary big" type="submit">Create Pithe and begin</button>
      </form></main>`;
  }

  // ------------------------------------------------------------ views
  function dashboardView(s) {
    const acts = R.locationActivities(s).map((a) => actionCard(a.name, a.desc, { kind: 'activity', id: a.id }, R.preview(s, { kind: 'activity', id: a.id }), 'Start')).join('');
    const here = R.npcsHere(s).map((id) => `<li class="action"><div class="action-main"><strong>${esc(D.NPCS[id].name)}</strong><p>${esc(D.NPCS[id].role)}. ${esc(D.NPCS[id].desc)}</p></div><button class="btn primary" data-action="open-talk" data-npc="${id}">Talk</button></li>`).join('');
    const go = Object.keys(D.LOCATIONS).filter((id) => id !== s.location).map((id) => {
      const p = R.preview(s, { kind: 'travel', to: id });
      return `<button class="btn" data-action="do" data-kind="travel" data-to="${id}" ${p.ok ? '' : 'disabled'} title="${esc(p.ok ? '' : p.error)}">${esc(D.LOCATIONS[id].name)} (${R.formatDuration(D.travelMinutes(s.location, id))})</button>`;
    }).join('');
    const q = R.questView(s);
    const questCard = q.q.status === 'active'
      ? `<p><strong>${esc(D.QUEST.name)}</strong>. Deadline in ${R.formatDuration(q.minutesLeft)}.</p><ul class="objectives">${q.objectives.map((o) => `<li class="${o.done ? 'done' : ''}">${o.done ? '[done]' : '[ ]'} ${esc(o.label)}</li>`).join('')}</ul>`
      : q.q.status === 'available' ? '<p>No active quest. Someone at the Corner Cafe may need help.</p>'
        : `<p><strong>${esc(D.QUEST.name)}</strong>: ${q.q.status === 'completed' ? 'completed' : 'failed'}. See Quests for details.</p>`;
    const sug = R.suggestions(s);
    const recent = s.log.slice(-5).reverse();
    return `${statusWindow(s)}
      <div class="cols">
        <section class="panel"><h2>Active quest</h2>${questCard}</section>
        <section class="panel"><h2>Suggestions</h2>${sug.length ? `<ul class="plain">${sug.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>Nothing pressing.</p>'}</section>
      </div>
      <section class="panel"><h2>Go somewhere</h2><div class="row">${go}</div></section>
      <section class="panel"><h2>Actions at ${esc(D.LOCATIONS[s.location].name)}</h2><ul class="actions">${acts}</ul></section>
      <section class="panel"><h2>People here</h2>${here ? `<ul class="actions">${here}</ul>` : '<p>Nobody you know is here right now.</p>'}</section>
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
      return `<li class="skill"><div class="attr-top"><span>${k.name}</span><b>Level ${sk.level}</b></div>${bar(need ? sk.exp : 1, need || 1, '', k.name + ' skill')}<small>${need ? `${sk.exp}/${need} EXP. ` : 'Maximum. '}Trains ${esc(D.ATTRIBUTES.find((a) => a.id === k.attr).name)}. ${esc(k.desc)}</small></li>`;
    }).join('');
    const recent = s.log.filter((l) => l.changes.some((x) => /EXP|level|training|to \d+$/.test(x))).slice(-6).reverse();
    return `<section class="window"><header><h2>${esc(c.name)}</h2><p class="sub">Age ${c.age}. Level ${c.level}. Hardcore.</p></header>
      <p>${esc(c.appearance || 'No appearance description yet.')}</p>
      <dl class="facts"><div><dt>Background</dt><dd>${esc(bg.name)}</dd></div><div><dt>Trait</dt><dd>${esc(tr.name)}</dd></div><div><dt>EXP</dt><dd>${c.exp}/${R.expNeed(c.level)}</dd></div><div><dt>Collapses</dt><dd>${s.stats.collapses}</dd></div></dl></section>
      <section class="panel"><h2>Attributes</h2><p class="hint">A skill level-up adds training to its attribute. The attribute rises when training equals its current value.</p><div class="cols3">${attrs}</div></section>
      <section class="panel"><h2>Skills</h2><ul class="skills">${skills}</ul></section>
      <section class="panel"><h2>Recent progression</h2>${recent.length ? `<ul class="history">${recent.map((l) => `<li><span class="when">${esc(R.formatClock(l.clock))}</span> ${esc(l.title)}<small>${esc(l.changes.filter((x) => !x.startsWith('Time ') && !x.startsWith('Energy') && !x.startsWith('Satiety') && !x.startsWith('Health')).join('; '))}</small></li>`).join('')}</ul>` : '<p>No progression yet.</p>'}</section>
      <section class="panel" id="settings"><h2>Settings and save data</h2>
        <p>Real-life tracker rewards: <strong>${s.settings.integration ? 'Enabled' : 'Disabled'}</strong>. When enabled, a recorded real-life completion on a goal you linked to the RPG gives a small reward, up to 3 per real day.</p>
        <button class="btn" data-action="toggle-integration">${s.settings.integration ? 'Disable' : 'Enable'} real-life rewards</button>
        <p class="hint">Storage: ${esc(deps.storageMode())}. Export your save regularly. Clearing browser data erases it.</p>
        <div class="row"><button class="btn" data-action="export">Export save file</button></div>
        <form data-form="import" class="stack"><label>Import a save (paste JSON). This replaces the current game.<textarea name="json" rows="3"></textarea></label>${app.importError ? `<p class="error">${esc(app.importError)}</p>` : ''}<button class="btn" type="submit">Import save</button></form>
        <form data-form="reset" class="stack"><label>Delete this save. Type RESET to confirm.<input name="confirm" autocomplete="off"></label>${app.resetError ? `<p class="error">${esc(app.resetError)}</p>` : ''}<button class="btn danger" type="submit">Delete save</button></form>
      </section>`;
  }

  function journalView(s) {
    const tabs = `<div class="tabs" role="group" aria-label="Journal sections"><button class="tab ${app.journalTab === 'entries' ? 'on' : ''}" data-action="tab" data-tab="entries" aria-pressed="${app.journalTab === 'entries'}">Entries</button><button class="tab ${app.journalTab === 'history' ? 'on' : ''}" data-action="tab" data-tab="history" aria-pressed="${app.journalTab === 'history'}">Activity history</button></div>`;
    if (app.journalTab === 'history') {
      const items = [...s.log].reverse();
      return `${tabs}<section class="panel"><h2>Activity history</h2>${items.length ? `<ul class="history">${items.map((l) => `<li><span class="when">${esc(R.formatClock(l.clock))}</span> <strong>${esc(l.title)}</strong>${l.narrative.map((t) => `<p class="story">${esc(t)}</p>`).join('')}${l.notes.length ? `<small>${esc(l.notes.join(' '))}</small>` : ''}${l.changes.length ? `<small>${esc(l.changes.join('; '))}</small>` : ''}</li>`).join('')}</ul>` : '<p>No activity yet. Things you do in the world are recorded here automatically.</p>'}</section>`;
    }
    const entries = [...s.journal].reverse();
    return `${tabs}<section class="panel"><h2>New entry</h2>
      <form data-form="journal" class="stack">
        <label>Type<select name="type"><option value="rpg">In-world entry (Pithe writes it, takes 10 game minutes)</option><option value="real">Real-life reflection (no game time, no rewards)</option></select></label>
        <label>Title (optional)<input name="title" maxlength="80"></label>
        <label>Entry<textarea name="text" rows="5" maxlength="4000" required></textarea></label>
        ${app.journalError ? `<p class="error">${esc(app.journalError)}</p>` : ''}
        <button class="btn primary" type="submit">Save entry</button>
      </form><p class="hint">The first in-world entry each game day gives a small EXP reward. Real-life reflections never do.</p></section>
      <section class="panel"><h2>Entries</h2>${entries.length ? `<ul class="entries">${entries.map((e) => `<li><div class="attr-top"><strong>${esc(e.title)}</strong><span class="tag">${e.type === 'real' ? 'Real life' : 'In-world'}</span></div><small>${esc(e.realDate)} ${esc(e.realTime)} | Game time: ${esc(e.gameTime)}</small><p class="story pre">${esc(e.text)}</p></li>`).join('')}</ul>` : '<p>No entries yet. Write the first one above.</p>'}</section>`;
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
        <small>Created ${esc(g.createdDate)}. Total completions: ${st.total}. Streak: ${st.streak} ${st.unit}.${g.rpgLink ? ' Linked to the RPG.' : ''}</small>${prog}
        <div class="strip" aria-label="Last 14 days">${st.last14.map((d) => `<span class="cell ${d.done ? 'on' : ''}" title="${d.date}"></span>`).join('')}</div>
        <form data-form="record" class="row"><input type="hidden" name="goal" value="${g.id}"><input name="note" placeholder="Optional note" maxlength="200"><button class="btn ${disabled ? '' : 'primary'}" type="submit" ${disabled ? 'disabled' : ''}>${label}</button></form>
        ${g.completions.length ? `<details><summary>History (${g.completions.length})</summary><ul class="history">${[...g.completions].reverse().slice(0, 30).map((c) => `<li><span class="when">${esc(c.date)}</span> ${esc(c.note)}</li>`).join('')}</ul></details>` : ''}</li>`;
    }).join('');
    return `<section class="panel"><h2>Real-life tracker</h2><p>Track real habits and goals here. This is separate from Pithe's progress. ${s.settings.integration ? 'Rewards are enabled: a goal you link to the RPG gives a small reward when you record a completion (max 3 per day).' : 'Rewards are disabled, so nothing here changes the game. You can enable them in Character, Settings.'}</p>
      ${app.trackerMsg ? `<p class="notice">${esc(app.trackerMsg)}</p>` : ''}${app.trackerError ? `<p class="error">${esc(app.trackerError)}</p>` : ''}
      <form data-form="goal" class="stack">
        <label>Name<input name="name" maxlength="60" required></label>
        <div class="row"><label>Type<select name="kind"><option value="habit">Habit (repeats)</option><option value="goal">Goal (finishes after N completions)</option></select></label>
        <label>Habit cadence<select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        <label>Goal target (completions)<input name="target" type="number" min="1" max="365" value="10"></label></div>
        <div class="row"><label class="check"><input type="checkbox" name="rpgLink" ${s.settings.integration ? '' : 'disabled'}> Link to RPG rewards ${s.settings.integration ? '' : '(enable rewards in Settings first)'}</label>
        <label>Skill that gets the reward<select name="linkedSkill">${skillOpts}</select></label></div>
        <button class="btn primary" type="submit">Create</button>
      </form></section>
      <section class="panel"><h2>Your goals and habits</h2>${goals ? `<ul class="goals">${goals}</ul>` : '<p>Nothing tracked yet. Creating one does not count as completing it.</p>'}</section>`;
  }

  function worldView(s) {
    const loc = D.LOCATIONS[s.location];
    const go = Object.keys(D.LOCATIONS).filter((id) => id !== s.location).map((id) => {
      const p = R.preview(s, { kind: 'travel', to: id });
      return actionCard(D.LOCATIONS[id].name, `${D.LOCATIONS[id].desc} Hours: ${D.LOCATIONS[id].open ? D.LOCATIONS[id].open.label : 'always'}.`, { kind: 'travel', to: id }, p, 'Go');
    }).join('');
    const npcs = R.npcsHere(s).map((id) => `<li class="action"><div class="action-main"><strong>${esc(D.NPCS[id].name)}</strong> <span class="tag">${esc(R.relationLabel(s.relations[id] || 0))}</span><p>${esc(D.NPCS[id].role)}. ${esc(D.NPCS[id].desc)}</p></div><button class="btn primary" data-action="open-talk" data-npc="${id}">Talk</button></li>`).join('');
    let talk = '';
    if (app.talkNpc && R.npcLocation(app.talkNpc, s.clock) === s.location) {
      const n = D.NPCS[app.talkNpc];
      talk = `<section class="panel talk"><div class="report-head"><h2>Talking to ${esc(n.name)}</h2><button class="btn small" data-action="close-talk">Leave conversation</button></div>
        <ul class="actions">${R.topicsFor(s, app.talkNpc).map((t) => {
          const act = { kind: 'talk', npc: app.talkNpc, topic: t.id };
          const p = R.preview(s, act);
          return actionCard(t.label, '', act, p.ok ? p : { ok: false, error: t.disabled || p.error }, 'Say it');
        }).join('')}</ul></section>`;
    }
    const where = Object.keys(D.NPCS).map((id) => {
      const at = R.npcLocation(id, s.clock);
      return `<li><strong>${esc(D.NPCS[id].name)}</strong> (${esc(D.NPCS[id].role)}): ${at ? `now at ${esc(D.LOCATIONS[at].name)}` : 'not around right now'}.<small>${esc(R.scheduleLabel(id))}</small></li>`;
    }).join('');
    const ev = R.worldEvents(s);
    return `<section class="window"><header><h2>${esc(loc.name)}</h2><p class="sub">${esc(R.formatClock(s.clock))}. ${esc(R.periodOf(s.clock))}.</p></header><p>${esc(loc.desc)}</p>${ev.length ? `<ul class="notes">${ev.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</section>
      ${talk}
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

  function modalHtml() {
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
    const body = { dashboard: dashboardView, character: characterView, journal: journalView, tracker: trackerView, world: worldView, quests: questsView, inventory: inventoryView }[app.view](s);
    const nav = VIEWS.map(([id, label]) => `<button class="navbtn ${app.view === id ? 'on' : ''}" data-action="nav" data-view="${id}" ${app.view === id ? 'aria-current="page"' : ''}>${label}</button>`).join('');
    root.innerHTML = `<div class="app"${app.pending ? ' inert aria-hidden="true"' : ''}>
      <nav class="nav" aria-label="Main"><div class="brand">TAP Protocol</div><div class="navlist">${nav}</div><p id="save-status" class="savestat">${esc(app.saveStatus)}</p></nav>
      <main class="main" id="main" tabindex="-1"><h1 class="viewtitle">${VIEWS.find((v) => v[0] === app.view)[1]}</h1>${reportHtml(app.report)}${body}</main></div>${modalHtml()}`;
    manageFocus();
  }

  // Focus handling for the warning dialog: move focus in when it opens (onto Cancel, the safe choice) and
  // back to the control that opened it when it closes. The rest of the page is inert while it is open.
  function manageFocus() {
    if (app.pending) {
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

  function onKeydown(e) {
    if (!app.pending) return;
    if (e.key === 'Escape') { e.preventDefault(); app.pending = null; render(); return; }
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
    if (!p.ok) { app.report = { ok: false, error: p.error }; render(); return; }
    if (p.warnings.length && !force) { app.pending = { action, p, title: titleOf(action) }; render(); return; }
    app.report = R.execute(app.state, action);
    if (app.talkNpc && R.npcLocation(app.talkNpc, app.state.clock) !== app.state.location) app.talkNpc = null;
    render();
    persist();
  }

  function readAction(el) {
    const d = el.dataset;
    const a = { kind: d.kind };
    for (const k of ['id', 'to', 'npc', 'topic', 'item']) if (d[k] !== undefined) a[k] = d[k];
    return a;
  }

  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || !app.state) return;
    const a = el.dataset.action;
    if (a === 'nav') { app.view = el.dataset.view; app.talkNpc = app.view === 'world' ? app.talkNpc : null; render(); window.scrollTo && window.scrollTo(0, 0); }
    else if (a === 'do') { app.lastTrigger = selectorFor(el); runAction(readAction(el)); }
    else if (a === 'confirm') { const act = app.pending.action; app.pending = null; runAction(act, true); }
    else if (a === 'cancel') { app.pending = null; render(); }
    else if (a === 'dismiss') { app.report = null; render(); }
    else if (a === 'open-talk') { app.talkNpc = el.dataset.npc; app.view = 'world'; render(); }
    else if (a === 'close-talk') { app.talkNpc = null; render(); }
    else if (a === 'tab') { app.journalTab = el.dataset.tab; render(); }
    else if (a === 'toggle-integration') { app.state.settings.integration = !app.state.settings.integration; render(); persist(); }
    else if (a === 'export') deps.download(`tap-protocol-save-${R.localDateStr()}.json`, deps.exportJson(app.state));
  }

  function onSubmit(e) {
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fd = new FormData(f);
    const kind = f.dataset.form;
    if (kind === 'create') {
      app.draft = { name: fd.get('name'), age: fd.get('age'), appearance: fd.get('appearance'), background: fd.get('background'), trait: fd.get('trait'), integration: fd.get('integration') === 'on' };
      const res = R.createCharacter(app.draft);
      if (!res.ok) { app.errors = res.errors; render(); return; }
      app.errors = []; app.state = res.state; app.view = 'dashboard';
      app.report = { ok: true, title: 'Arrival', narrative: [`You step off the last bus into the Harbor Quarter. It is early on Monday 4 March 2030, and the lane is still wet. ${res.intro}`, 'Find work, find food and find out what this place has for you.'], notes: [], changes: [] };
      render(); persist();
    } else if (kind === 'journal') {
      const r = R.execute(app.state, { kind: 'journal', type: fd.get('type'), title: fd.get('title'), text: fd.get('text'), now: new Date() });
      if (!r.ok) { app.journalError = r.error; render(); return; }
      app.journalError = ''; app.report = r; render(); persist();
    } else if (kind === 'goal') {
      const r = R.addGoal(app.state, { name: fd.get('name'), kind: fd.get('kind'), cadence: fd.get('cadence'), target: fd.get('target'), rpgLink: fd.get('rpgLink') === 'on', linkedSkill: fd.get('linkedSkill') }, R.localDateStr(new Date()));
      app.trackerError = r.ok ? '' : r.error; app.trackerMsg = r.ok ? `Created "${r.goal.name}". It is not complete until you record it.` : '';
      render(); if (r.ok) persist();
    } else if (kind === 'record') {
      const r = R.recordCompletion(app.state, Number(fd.get('goal')), R.localDateStr(new Date()), fd.get('note') || '');
      app.trackerError = r.ok ? '' : r.error; app.trackerMsg = r.ok ? r.message : '';
      if (r.ok && r.report) app.report = r.report;
      render(); if (r.ok) persist();
    } else if (kind === 'import') {
      const r = deps.parseImport(String(fd.get('json') || ''));
      if (!r.ok) { app.importError = r.error; render(); return; }
      app.importError = ''; app.state = r.state; app.report = { ok: true, title: 'Save imported', narrative: [], notes: [], changes: [] }; render(); persist();
    } else if (kind === 'reset') {
      if (fd.get('confirm') !== 'RESET') { app.resetError = 'Type RESET exactly to confirm.'; render(); return; }
      app.resetError = '';
      app.chain = app.chain.then(() => deps.clear()).then(() => { app.state = null; app.report = null; app.draft = {}; render(); });
    }
  }

  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('keydown', onKeydown);

  app.render = render; app.settle = settle; app.persist = persist;
  return app;
}
