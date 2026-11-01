import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import * as D from '../js/data.js';

test('PHASE 7 - Living Universe Comprehensive Integration Suite', async (t) => {
  await t.test('1. District structure and initial demographic/environmental models', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.districts);
    const keys = Object.keys(state.districts);
    assert.deepEqual(keys.sort(), [
      'coastal_marina',
      'harbor_quarter',
      'innovation_corridor',
      'lantern_district',
      'metro_core',
      'university_quarter'
    ].sort());

    const harbor = state.districts.harbor_quarter;
    assert.equal(harbor.name, 'Harbor Quarter');
    assert.ok(harbor.population > 0);
    assert.ok(harbor.commercialDev >= 0 && harbor.commercialDev <= 100);
    assert.ok(harbor.civicDev >= 0 && harbor.civicDev <= 100);
    assert.ok(harbor.environmentalQuality >= 0 && harbor.environmentalQuality <= 100);
    assert.ok(harbor.culturalActivity >= 0 && harbor.culturalActivity <= 100);
    assert.ok(harbor.reputation >= 0 && harbor.reputation <= 100);
    assert.ok(Array.isArray(harbor.history));
  });

  await t.test('2. Locations reflect and map to parent districts', () => {
    assert.equal(R.locationDistrict('home'), 'harbor_quarter');
    assert.equal(R.locationDistrict('library'), 'harbor_quarter');
    assert.equal(R.locationDistrict('market'), 'lantern_district');
    assert.equal(R.locationDistrict('cafe'), 'metro_core');
    assert.equal(R.locationDistrict('downtown'), 'metro_core');
    assert.equal(R.locationDistrict('university'), 'university_quarter');
    assert.equal(R.locationDistrict('tech_park'), 'innovation_corridor');
    assert.equal(R.locationDistrict('marina'), 'coastal_marina');
  });

  await t.test('3. Dynamic economy and business lifecycle', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.economy);
    assert.ok(state.economy.businesses.corner_cafe);
    assert.ok(state.economy.businesses.lantern_market_trade);
    assert.ok(state.economy.businesses.harbor_bookbindery);

    const cafe = state.economy.businesses.corner_cafe;
    assert.equal(cafe.ownerNpc, 'dani');
    assert.equal(cafe.sector, 'hospitality');
    assert.ok(cafe.weeklyRevenue > 0);
    assert.ok(['struggling', 'stable', 'thriving', 'expanding'].includes(cafe.status));

    // Force performance change and run economic cycle
    cafe.performance = 90;
    cafe.status = 'stable';
    state.clock += 7 * 24 * 60; // Advance 1 week
    R.processDynamicEconomy(state);

    assert.equal(cafe.status, 'expanding');
    assert.ok(cafe.staffCount >= 3);
  });

  await t.test('4. Price index and market multiplier integration', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const baseBreadPrice = D.ITEMS.bread.price;
    state.economy.priceMultiplier = 1.0;
    state.flags.haggleDay = '';
    assert.equal(R.priceOf(state, 'bread'), baseBreadPrice);

    // Inflated economy
    state.economy.priceMultiplier = 1.25;
    assert.equal(R.priceOf(state, 'bread'), Math.round(baseBreadPrice * 1.25));

    // Deflated economy
    state.economy.priceMultiplier = 0.8;
    assert.equal(R.priceOf(state, 'bread'), Math.round(baseBreadPrice * 0.8));
  });

  await t.test('5. Institutions and autonomous community projects', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.institutions);
    assert.ok(state.institutions.projects.archive_open_access);

    const proj = state.institutions.projects.archive_open_access;
    assert.equal(proj.completed, false);
    assert.equal(proj.progress, 0);

    // Autonomous progress occurs through civic development
    state.districts.harbor_quarter.civicDev = 85;
    R.processAutonomousInstitutions(state);
    assert.ok(proj.progress > 0);
  });

  await t.test('6. Player contribution to community projects', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'library';
    state.money = 200;
    state.needs.energy = 80;

    const res = R.execute(state, { kind: 'project_contribute', projectId: 'archive_open_access' });
    assert.equal(res.ok, true);
    assert.ok(state.institutions.projects.archive_open_access.progress >= 15);
    assert.equal(state.institutions.totalContributions, 1);
    assert.ok(state.character.skills.research.exp > 0);
  });

  await t.test('7. Player district actions (sanitation and cultural patronage)', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'library';
    state.money = 100;
    state.needs.energy = 90;

    const initialEnv = state.districts.harbor_quarter.environmentalQuality;
    const cleanRes = R.execute(state, {
      kind: 'district_action',
      districtId: 'harbor_quarter',
      actionType: 'clean_streets'
    });
    assert.equal(cleanRes.ok, true);
    assert.equal(state.districts.harbor_quarter.environmentalQuality, initialEnv + 5);

    // Cultural patronage
    const initialCult = state.districts.harbor_quarter.culturalActivity;
    const cultRes = R.execute(state, {
      kind: 'district_action',
      districtId: 'harbor_quarter',
      actionType: 'support_culture'
    });
    assert.equal(cultRes.ok, true);
    assert.equal(state.districts.harbor_quarter.culturalActivity, initialCult + 4);
    assert.equal(state.money, 80);
  });

  await t.test('8. District action location restrictions', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'library'; // harbor_quarter

    // Attempting action in lantern_district while at library must fail
    const wrongDistRes = R.execute(state, {
      kind: 'district_action',
      districtId: 'lantern_district',
      actionType: 'clean_streets'
    });
    assert.equal(wrongDistRes.ok, false);
    assert.match(wrongDistRes.error, /must be located within/i);
  });

  await t.test('9. Local business collaboration and NPC trust boost', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'cafe';
    const initPerf = state.economy.businesses.corner_cafe.performance;
    const initRel = state.relations.dani || 0;

    const collabRes = R.execute(state, {
      kind: 'business_collaborate',
      bizId: 'corner_cafe'
    });
    assert.equal(collabRes.ok, true);
    assert.ok(state.economy.businesses.corner_cafe.performance > initPerf);
    assert.ok((state.relations.dani || 0) > initRel);
    assert.ok(state.economy.collaborations.includes('corner_cafe'));
  });

  await t.test('10. Autonomous NPC ecosystem and employment health', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.economy.businesses.lantern_market_trade.status = 'struggling';
    R.processNpcEcosystemAutonomy(state);
    assert.equal(state.npcSim.teo.financialStatus, 'strained');

    state.economy.businesses.lantern_market_trade.status = 'thriving';
    R.processNpcEcosystemAutonomy(state);
    assert.equal(state.npcSim.teo.financialStatus, 'prosperous');
  });

  await t.test('11. Emergent Phase 7 world events triggering and participation', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    // Advance clock to a valid hour for district_cultural_expo (start is 07:00, +7 hours = 14:00)
    state.clock = 7 * 60; // 14:00
    R.processPhase7EmergentEvents(state);

    assert.ok(state.livingUniverseSim.activeEvents.length > 0);
    const ev = state.livingUniverseSim.activeEvents[0];
    assert.ok(ev.id);
    assert.ok(ev.name);
    assert.ok(ev.endClock > state.clock);

    // Move to event location and participate
    state.location = ev.location;
    state.needs.energy = 90;
    const partRes = R.execute(state, {
      kind: 'phase7_event_participate',
      eventId: ev.id
    });
    assert.equal(partRes.ok, true);
    assert.equal(ev.playerParticipated, true);

    // Participating a second time is blocked
    const dupRes = R.execute(state, {
      kind: 'phase7_event_participate',
      eventId: ev.id
    });
    assert.equal(dupRes.ok, false);
    assert.match(dupRes.error, /already participated/i);
  });

  await t.test('12. Autonomous event resolution without player participation', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.clock = 7 * 60; // 14:00
    R.processPhase7EmergentEvents(state);
    const ev = state.livingUniverseSim.activeEvents[0];
    assert.ok(ev);

    // Advance clock past event conclusion
    state.clock = ev.endClock + 60;
    R.processPhase7EmergentEvents(state);

    assert.ok(!state.livingUniverseSim.activeEvents.some((e) => e.id === ev.id));
    assert.ok(state.livingUniverseSim.eventHistory.some((e) => e.id === ev.id));

    // World memory recorded autonomous outcome
    const mems = state.memories.filter((m) => m.type === 'phase7_event_resolution');
    assert.ok(mems.length > 0);
  });

  await t.test('13. Persistent World Memory and Chronicle integration', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'library';
    state.money = 200;
    R.execute(state, { kind: 'district_action', districtId: 'harbor_quarter', actionType: 'clean_streets' });

    const mems = R.queryMemories(state, { type: 'district_cleaning' });
    assert.equal(mems.length, 1);
    assert.equal(mems[0].entities[0], 'pithe');
  });

  await t.test('14. Deterministic simulation behavior', () => {
    const { state: s1 } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const { state: s2 } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });

    for (let i = 0; i < 48; i++) {
      R.execute(s1, { kind: 'activity', id: 'rest' });
      R.execute(s2, { kind: 'activity', id: 'rest' });
    }

    assert.deepEqual(s1.districts, s2.districts);
    assert.deepEqual(s1.economy, s2.economy);
    assert.deepEqual(s1.institutions, s2.institutions);
  });

  await t.test('15. Legacy save migration backward compatibility', () => {
    // Construct legacy save without Phase 7 structures
    const legacy = {
      version: 1,
      createdAt: '2030-03-04T07:00:00.000Z',
      clock: 0,
      location: 'home',
      character: {
        name: 'Legacy Player',
        age: 30,
        background: 'scholar',
        trait: 'curious',
        level: 1,
        exp: 0,
        attributes: { strength: 3 },
        attrProgress: {},
        skills: { research: { level: 1, exp: 0 } }
      },
      needs: { energy: 50, satiety: 50, health: 50 },
      money: 100,
      inventory: {},
      relations: {},
      daily: { day: '2030-03-04', counts: {} },
      quests: { menu: { status: 'available' } },
      journal: [],
      tracker: { goals: [] },
      log: []
    };

    const migrated = R.migrateState(legacy);
    assert.ok(migrated.districts);
    assert.ok(migrated.economy);
    assert.ok(migrated.institutions);
    assert.ok(migrated.livingUniverseSim);
    assert.equal(migrated.districts.harbor_quarter.name, 'Harbor Quarter');
  });

  await t.test('16. Phase 7 achievements unlocking', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'library';
    state.money = 500;
    state.needs.energy = 100;

    // Contribute multiple times to trigger civic architect & community anchor
    for (let i = 0; i < 7; i++) {
      state.needs.energy = 80;
      state.money = 200;
      R.execute(state, { kind: 'project_contribute', projectId: 'archive_open_access' });
    }

    assert.ok(state.achievements.unlocked.civic_architect || state.achievements.unlocked.community_anchor);
  });
});
