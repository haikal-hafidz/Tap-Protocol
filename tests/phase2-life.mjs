import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import * as D from '../js/data.js';

test('PHASE 2 - Complete Life Simulation Integration Suite', async (t) => {
  await t.test('1. Character creation & default Phase 2 models', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, background: 'creator', trait: 'ambitious' });
    assert.equal(res.ok, true);
    const s = res.state;
    assert.ok(s.finances, 'finances initialized');
    assert.ok(s.calendar, 'calendar initialized');
    assert.ok(s.career, 'career initialized');
    assert.ok(s.education, 'education initialized');
    assert.ok(s.housing, 'housing initialized');
    assert.ok(s.business, 'business initialized');
    assert.ok(s.relationships, 'relationships initialized');
    assert.ok(s.family, 'family initialized');
    assert.ok(Array.isArray(s.chronicle), 'chronicle initialized');
  });

  await t.test('2. Calendar transitions and deterministic periodic processing', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'analytical' });
    const initialAge = state.character.age;

    for (let day = 0; day < 366; day++) {
      state.clock += 1440;
      R.ensureCalendar(state);
      R.execute(state, { kind: 'activity', id: 'rest' });
    }

    assert.equal(state.character.age, initialAge + 1, 'Age must increment after 1 year on birthday');
    assert.ok(state.chronicle.some((c) => c.title.includes('Turned')), 'Birthday milestone recorded in chronicle');
  });

  await t.test('3. Career: apply, work, and promotion lifecycle', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'creator', trait: 'ambitious' });
    const applyRes = R.execute(state, { kind: 'job_apply', id: 'corp_admin_assistant' });
    assert.equal(applyRes.ok, true);
    assert.equal(state.career.currentJob, 'corp_admin_assistant');

    const workRes = R.execute(state, { kind: 'job_work' });
    assert.equal(workRes.ok, true);
    assert.equal(state.career.shiftsWorked, 1);

    state.character.attributes.management = 6;
    state.character.attributes.influence = 5;
    state.character.skills.negotiation = { level: 3, exp: 0 };
    state.career.performance = 85;
    state.career.experienceDays = 15;
    state.education.qualifications.push('cert_management');

    const promoRes = R.execute(state, { kind: 'job_promote' });
    assert.equal(promoRes.ok, true);
    assert.equal(state.career.currentJob, 'corp_operations_manager');
    assert.ok(state.chronicle.some((c) => c.title.includes('Promoted')), 'Promotion recorded in chronicle');
  });

  await t.test('4. Education: enrollment, study hours, and graduation credential', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'creator', trait: 'curious' });
    state.money = 600;
    state.character.attributes.management = 4;

    const enrollRes = R.execute(state, { kind: 'edu_enroll', id: 'cert_management' });
    assert.equal(enrollRes.ok, true);
    assert.equal(state.education.enrolled.length, 1);

    for (let s = 0; s < 15; s++) {
      state.needs.energy = 80;
      const studyRes = R.execute(state, { kind: 'edu_study', id: 'cert_management' });
      assert.equal(studyRes.ok, true);
    }

    assert.equal(state.education.enrolled.length, 0);
    assert.ok(state.education.qualifications.includes('cert_management'), 'Earned cert_management');
    assert.ok(state.chronicle.some((c) => c.title.includes('Graduated')), 'Graduation recorded in chronicle');
  });

  await t.test('5. Real estate and relocation', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'entrepreneur', trait: 'ambitious' });
    state.money = 2000;

    const rentRes = R.execute(state, { kind: 'property_rent', id: 'suburban_apartment' });
    assert.equal(rentRes.ok, true);

    const moveRes = R.execute(state, { kind: 'property_move', id: 'suburban_apartment' });
    assert.equal(moveRes.ok, true);
    assert.equal(state.housing.primaryHome, 'suburban_apartment');
    assert.equal(state.location, 'university');
    assert.ok(state.chronicle.some((c) => c.title.includes('Relocated')), 'Relocation recorded in chronicle');
  });

  await t.test('6. Business founding, hiring, and upgrades', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'entrepreneur', trait: 'ambitious' });
    state.money = 1500;

    const bizRes = R.execute(state, { kind: 'business_found', id: 'coffee_kiosk', name: 'Boardwalk Coffee' });
    assert.equal(bizRes.ok, true);
    const biz = state.business.owned[0];

    const hireRes = R.execute(state, { kind: 'business_manage', id: biz.id, manageType: 'hire' });
    assert.equal(hireRes.ok, true);
    assert.equal(biz.staffCount, 2);

    const upRes = R.execute(state, { kind: 'business_manage', id: biz.id, manageType: 'upgrade' });
    assert.equal(upRes.ok, true);
    assert.equal(biz.upgradeLevel, 1);
  });

  await t.test('7. Social, romance, marriage, and child generational foundation', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'social' });
    state.money = 2000;

    const hRes = R.execute(state, { kind: 'social_interact', npc: 'chloe', interactType: 'hangout' });
    assert.equal(hRes.ok, true);

    const rel = state.relationships.chloe;
    rel.affinity = 70;
    rel.trust = 40;

    const dateRes = R.execute(state, { kind: 'romance_action', npc: 'chloe', romanceType: 'date' });
    assert.equal(dateRes.ok, true);

    const partnerRes = R.execute(state, { kind: 'romance_action', npc: 'chloe', romanceType: 'partner' });
    assert.equal(partnerRes.ok, true);
    assert.equal(rel.romanceStatus, 'partner');

    rel.affinity = 95;
    rel.trust = 70;
    const proposeRes = R.execute(state, { kind: 'romance_action', npc: 'chloe', romanceType: 'propose' });
    assert.equal(proposeRes.ok, true);
    assert.equal(state.family.spouse.npcId, 'chloe');

    state.housing.owned.push('suburban_apartment');
    state.housing.primaryHome = 'suburban_apartment';

    const childRes = R.execute(state, { kind: 'family_action', familyType: 'have_child', childName: 'Maya' });
    assert.equal(childRes.ok, true);
    assert.equal(state.family.children[0].name, 'Maya');

    const parentRes = R.execute(state, { kind: 'family_action', familyType: 'parenting' });
    assert.equal(parentRes.ok, true);

    state.clock += 366 * 1440;
    R.ensureCalendar(state);
    R.execute(state, { kind: 'activity', id: 'rest' });
    assert.ok(state.family.children[0].age >= 1, 'Child age advances with game calendar');
  });
});
