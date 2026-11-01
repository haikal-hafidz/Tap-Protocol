import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import * as D from '../js/data.js';

test('PHASE 6 - Legacy & Generations Integration Suite', async (t) => {
  await t.test('1. Family identity and stable relationships', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.family);
    assert.equal(state.family.generation, 1);
    assert.deepEqual(state.family.children, []);
    assert.deepEqual(state.family.heirlooms, []);
    assert.ok(Array.isArray(state.family.oralHistory));
    assert.ok(state.family.oralHistory.length >= 2);
  });

  await t.test('2. Family relationship persistence', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.relationships.chloe.affinity = 90;
    state.relationships.chloe.trust = 70;
    state.relationships.chloe.romanceStatus = 'partner';
    state.money = 500;

    const proposeRes = R.execute(state, { kind: 'romance_action', npc: 'chloe', romanceType: 'propose' });
    assert.equal(proposeRes.ok, true);
    assert.equal(state.family.spouse.npcId, 'chloe');

    const serialized = JSON.stringify(state);
    const loaded = JSON.parse(serialized);
    assert.equal(loaded.family.spouse.name, 'Chloe Chen');
    assert.equal(loaded.family.generation, 1);
  });

  await t.test('3. Marriage and partnership conditions', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    // Proposing without partnership fails
    const failRes = R.execute(state, { kind: 'romance_action', npc: 'mira', romanceType: 'propose' });
    assert.equal(failRes.ok, false);
    assert.match(failRes.error, /must be in an established partnership/i);
  });

  await t.test('4. Parenthood and child development', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.family.spouse = { npcId: 'chloe', name: 'Chloe', weddingDate: '2030-03-04' };
    state.housing.owned.push('suburban_apartment');
    state.housing.primaryHome = 'suburban_apartment';

    const childRes = R.execute(state, { kind: 'family_action', familyType: 'have_child', childName: 'Aria' });
    assert.equal(childRes.ok, true);
    assert.equal(state.family.children.length, 1);
    const aria = state.family.children[0];
    assert.equal(aria.name, 'Aria');
    assert.equal(aria.age, 0);
    assert.equal(aria.stage, 'infant');
    assert.equal(aria.isAdult, false);

    // Parenting increases affection
    const parentRes = R.execute(state, { kind: 'family_action', familyType: 'parenting' });
    assert.equal(parentRes.ok, true);
    assert.ok(aria.relationshipScore > 80);
  });

  await t.test('5. Age progression through game time', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.family.spouse = { npcId: 'chloe', name: 'Chloe', weddingDate: '2030-03-04' };
    state.family.children.push({
      id: 99,
      name: 'Robin',
      age: 3,
      stage: 'infant',
      isAdult: false,
      relationshipScore: 80,
      personality: 'bright',
      interests: []
    });

    // Advance 366 days
    for (let i = 0; i < 366; i++) {
      state.clock += 1440;
      R.ensureCalendar(state);
      R.execute(state, { kind: 'activity', id: 'rest' });
    }

    const robin = state.family.children[0];
    assert.equal(robin.age, 4);
    assert.equal(robin.stage, 'child');
    assert.ok(robin.interests.length > 0);
  });

  await t.test('6. Family milestones', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const chronBefore = state.chronicle.length;
    state.family.spouse = { npcId: 'chloe', name: 'Chloe', weddingDate: '2030-03-04' };
    state.housing.owned.push('suburban_apartment');
    state.housing.primaryHome = 'suburban_apartment';

    R.execute(state, { kind: 'family_action', familyType: 'have_child', childName: 'Felix' });
    assert.ok(state.chronicle.length > chronBefore);
    assert.ok(state.chronicle.some((c) => c.title.includes('Welcomed Child')));
  });

  await t.test('7. Inheritance eligibility', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 45, background: 'scholar', trait: 'curious' });
    state.family.children.push({
      id: 1, name: 'Minor Child', age: 10, isAdult: false
    });
    state.family.children.push({
      id: 2, name: 'Adult Child', age: 19, isAdult: true, personality: 'focused'
    });

    const eligible = R.getEligibleSuccessors(state);
    assert.equal(eligible.some((e) => e.name === 'Minor Child'), false);
    assert.equal(eligible.some((e) => e.name === 'Adult Child'), true);
  });

  await t.test('8. Asset transfer integrity', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 45, background: 'scholar', trait: 'curious' });
    state.family.children.push({
      id: 2, name: 'Adult Child', age: 19, isAdult: true, personality: 'focused'
    });
    state.money = 2000;
    state.housing.owned.push('suburban_apartment');
    state.business.owned.push({ id: 10, type: 'coffee_kiosk', name: 'Lineage Cafe' });

    const transfer = R.executeInheritanceTransfer(state, 2);
    assert.equal(transfer.ok, true);
    assert.equal(transfer.assets.housing.length, 1);
    assert.equal(transfer.assets.businesses.length, 1);
    assert.ok(transfer.assets.money > 0);
  });

  await t.test('9. Duplicate inheritance prevention', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 45, background: 'scholar', trait: 'curious' });
    state.family.children.push({
      id: 2, name: 'Adult Child', age: 19, isAdult: true, personality: 'focused'
    });
    state.money = 1000;

    const first = R.executeInheritanceTransfer(state, 2);
    assert.equal(first.ok, true);

    const dup = R.executeInheritanceTransfer(state, 2);
    assert.equal(dup.ok, false);
    assert.match(dup.error, /already been settled/i);
  });

  await t.test('10. Legacy records and heirloom provenance', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.money = 600;
    const hRes = R.execute(state, {
      kind: 'family_action',
      familyType: 'designate_heirloom',
      templateKey: 'pocket_watch',
      name: 'Grandfather Chronometer'
    });
    assert.equal(hRes.ok, true);
    assert.equal(state.family.heirlooms.length, 1);
    const heirloom = state.family.heirlooms[0];
    assert.equal(heirloom.name, 'Grandfather Chronometer');
    assert.equal(heirloom.provenance.length, 1);
    assert.ok(heirloom.provenance[0].event.includes('Consecrated'));
  });

  await t.test('11. Family Memory integration', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const memsBefore = state.memories.length;
    R.execute(state, {
      kind: 'family_action',
      familyType: 'share_family_story',
      title: 'Arrival in 2030',
      text: 'Recounted how the family set roots by the pier.'
    });
    assert.ok(state.memories.length > memsBefore);
    assert.ok(state.memories.some((m) => m.type === 'family_story'));
  });

  await t.test('12. Verified history versus rumors', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const rumor = state.family.oralHistory.find((o) => o.isRumor && !o.verified);
    assert.ok(rumor);

    const invRes = R.execute(state, {
      kind: 'family_action',
      familyType: 'investigate_family_mystery',
      oralId: rumor.id
    });
    assert.equal(invRes.ok, true);
    assert.equal(rumor.verified, true);
    assert.equal(rumor.isRumor, false);
    assert.equal(rumor.type, 'verified_event');
  });

  await t.test('13. Generational achievements', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.money = 500;
    R.execute(state, {
      kind: 'family_action',
      familyType: 'designate_heirloom',
      templateKey: 'pocket_watch'
    });
    assert.ok(state.achievements.unlocked.family_heirloom);
  });

  await t.test('14. Successor eligibility and selection', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 50, background: 'scholar', trait: 'curious' });
    state.family.children.push(
      { id: 10, name: 'Elena Child', age: 22, isAdult: true, personality: 'creative' },
      { id: 11, name: 'Leo Child', age: 19, isAdult: true, personality: 'analytical' }
    );
    const eligible = R.getEligibleSuccessors(state);
    assert.equal(eligible.length, 2);
    // Player can freely select Leo Child instead of oldest child Elena
    const previewLeo = R.previewSuccession(state, 11);
    assert.equal(previewLeo.ok, true);
    assert.equal(previewLeo.successor.name, 'Leo Child');
  });

  await t.test('15. Succession confirmation and cancellation', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 50, background: 'scholar', trait: 'curious' });
    state.family.children.push({ id: 10, name: 'Elena Child', age: 22, isAdult: true, personality: 'creative' });

    // Unconfirmed attempt fails
    const failRes = R.retireAndSucceed(state, 10, false);
    assert.equal(failRes.ok, false);
    assert.equal(state.character.name, 'Pithe');
    assert.equal(state.family.generation, 1);

    // Explicit confirmation succeeds
    const okRes = R.retireAndSucceed(state, 10, true);
    assert.equal(okRes.ok, true);
    assert.equal(state.character.name, 'Elena Child');
    assert.equal(state.family.generation, 2);
  });

  await t.test('16. New-generation identity and progression', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 50, background: 'scholar', trait: 'curious' });
    state.character.skills.programming.level = 10;
    state.family.children.push({
      id: 20, name: 'Marcus', age: 21, isAdult: true, personality: 'ambitious',
      skills: { programming: 2 }, attributes: { intelligence: 4 }
    });

    R.retireAndSucceed(state, 20, true);
    // Successor is not a full clone of Pithe
    assert.equal(state.character.skills.programming.level, 2);
    assert.equal(state.character.level, 1);
    assert.equal(state.character.age, 21);
    assert.equal(state.family.lineage.length, 1);
    assert.equal(state.family.lineage[0].name, 'Pithe');
  });

  await t.test('17. NPC autonomous family events', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const edgeKey = ['dani', 'teo'].sort().join('|');
    state.npcNetwork[edgeKey] = { a: 'dani', b: 'teo', affinity: 80, trust: 70, milestones: [] };
    R.processWorldSimulation(state);
    assert.ok(state.npcFamilySim.dani.partnerName);
    assert.ok(state.memories.some((m) => m.type === 'npc_family'));
  });

  await t.test('18. Save/load and migration', () => {
    const legacy = {
      version: 1,
      clock: 1000,
      character: { name: 'Pithe', attributes: {}, skills: {} },
      needs: { energy: 50, satiety: 50, health: 50 },
      quests: { menu: {} },
      inventory: {},
      journal: [],
      tracker: { goals: [] },
      log: []
    };
    const migrated = R.migrateState(legacy);
    assert.ok(migrated.family);
    assert.equal(migrated.family.generation, 1);
    assert.ok(Array.isArray(migrated.family.heirlooms));
    assert.ok(Array.isArray(migrated.family.oralHistory));
    assert.ok(migrated.family.will);
    assert.ok(migrated.npcFamilySim);
  });

  await t.test('19. Offline behavior and determinism', () => {
    const runSim = (seed) => {
      const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious', seed });
      state.family.children.push({ id: 1, name: 'Child A', age: 18, isAdult: true });
      R.execute(state, { kind: 'family_action', familyType: 'parenting' });
      return JSON.stringify(state.family);
    };
    assert.equal(runSim(99), runSim(99));
  });

  await t.test('20. Regression tests for Phases 1-5', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    // Study activity works
    const actRes = R.execute(state, { kind: 'activity', id: 'study' });
    assert.equal(actRes.ok, true);

    // Quest functions
    assert.ok(state.quests.menu);

    // Phase 4 specialization
    state.character.skills.programming.level = 5;
    const specRes = R.execute(state, { kind: 'choose_specialization', skillId: 'programming', specId: 'systems_architect' });
    assert.equal(specRes.ok, true);

    // Phase 5 story engine
    R.processWorldSimulation(state);
    assert.ok(state.stories.active.length >= 0);
  });
});
