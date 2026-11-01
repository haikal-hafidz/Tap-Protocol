import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import * as R from '../js/rules.js';

test('PHASE 4 - RPG Expansion Comprehensive Test Suite', async (t) => {
  await t.test('1. Character creation & default Phase 4 models', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    assert.equal(res.ok, true);
    const s = res.state;
    assert.ok(s.specializations);
    assert.deepEqual(s.specializations, {});
    assert.ok(s.reputation);
    assert.equal(s.reputation.professional, 0);
    assert.equal(s.reputation.academic, 0);
    assert.equal(s.reputation.creative, 0);
    assert.equal(s.reputation.community, 0);
    assert.equal(s.reputation.athletic, 0);
    assert.ok(s.organizations);
    assert.deepEqual(s.organizations.memberships, {});
    assert.ok(s.competitions);
    assert.deepEqual(s.competitions.history, []);
    assert.deepEqual(s.competitions.records, {});
    assert.ok(s.achievements);
    assert.deepEqual(s.achievements.unlocked, {});
  });

  await t.test('2. Skill specialization unlocks, bonuses and exclusivity', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    // Level < 5 cannot specialize
    s.character.skills.programming.level = 4;
    const failRes = R.execute(s, { kind: 'choose_specialization', skillId: 'programming', specId: 'systems_architect' });
    assert.equal(failRes.ok, false);
    assert.match(failRes.error, /requires skill level 5/i);

    // Level >= 5 can choose specialization
    s.character.skills.programming.level = 5;
    const okRes = R.execute(s, { kind: 'choose_specialization', skillId: 'programming', specId: 'systems_architect' });
    assert.equal(okRes.ok, true);
    assert.equal(s.specializations.programming, 'systems_architect');
    assert.equal(R.hasSpecialization(s, 'systems_architect'), true);
    const specDef = R.getSkillSpecialization(s, 'programming');
    assert.equal(specDef.id, 'systems_architect');
    assert.equal(specDef.bonuses.workPerfMod, 1.25);

    // Duplicate specialization choice on same skill is refused
    const dupRes = R.execute(s, { kind: 'choose_specialization', skillId: 'programming', specId: 'creative_technologist' });
    assert.equal(dupRes.ok, false);
    assert.match(dupRes.error, /already chosen/i);
    assert.equal(s.specializations.programming, 'systems_architect');

    // First specialization unlocks achievement
    assert.ok(s.achievements.unlocked.first_specialization);
  });

  await t.test('3. Mastery milestones calculation', () => {
    assert.equal(R.getSkillMastery(1).title, 'Novice');
    assert.equal(R.getSkillMastery(2).title, 'Novice');
    assert.equal(R.getSkillMastery(3).title, 'Apprentice');
    assert.equal(R.getSkillMastery(5).title, 'Journeyman');
    assert.equal(R.getSkillMastery(8).title, 'Specialist');
    assert.equal(R.getSkillMastery(10).title, 'Master');
  });

  await t.test('4. Context-sensitive reputation adjustments and capping', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    R.adjustReputation(s, 'academic', 25, 'Published paper');
    assert.equal(s.reputation.academic, 25);
    assert.equal(s.reputation.athletic, 0);

    // Clamps to 100
    R.adjustReputation(s, 'academic', 100);
    assert.equal(s.reputation.academic, 100);

    // Negative clamp to -100
    R.adjustReputation(s, 'academic', -250);
    assert.equal(s.reputation.academic, -100);
  });

  await t.test('5. Organization lifecycle: joining, dues, contribution, and rank promotion', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    s.location = 'tech_park';
    s.money = 200;
    s.character.skills.programming.level = 4;
    s.reputation.professional = 15;

    // Join Tech Guild
    const joinRes = R.execute(s, { kind: 'org_join', id: 'tech_guild' });
    assert.equal(joinRes.ok, true);
    assert.equal(s.money, 125); // 200 - 75
    const mem = s.organizations.memberships.tech_guild;
    assert.ok(mem);
    assert.equal(mem.rankId, 'affiliate');
    assert.equal(mem.points, 0);
    assert.ok(s.achievements.unlocked.guild_initiate);

    // Re-joining refused
    const reJoin = R.execute(s, { kind: 'org_join', id: 'tech_guild' });
    assert.equal(reJoin.ok, false);
    assert.match(reJoin.error, /already an active member/i);

    // Contribute to sprint
    const contribRes = R.execute(s, { kind: 'org_contribute', id: 'tech_guild', contribId: 'code_sprint' });
    assert.equal(contribRes.ok, true);
    assert.equal(mem.points, 15);
    assert.equal(mem.contributionsCount, 1);
    assert.ok(s.reputation.professional >= 20);

    // Simulate accumulation of points to promote
    mem.points = 49;
    R.execute(s, { kind: 'org_contribute', id: 'tech_guild', contribId: 'code_sprint' });
    assert.equal(mem.rankId, 'fellow'); // Promoted to fellow engineer at >= 50
  });

  await t.test('6. Competition simulation: schedule checks, strategies, outcomes, and records', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    s.money = 100;
    s.location = 'marina';
    s.character.skills.fitness.level = 6;
    s.character.attributes.endurance = 6;

    // Out of schedule test (Mon 07:00 is clock 0)
    s.clock = 0;
    const closedRes = R.execute(s, { kind: 'competition_enter', id: 'bayside_10k', strategyId: 'steady_pace' });
    assert.equal(closedRes.ok, false);
    assert.match(closedRes.error, /not currently running/i);

    // In schedule: Sunday 10:00 (clock 8820)
    s.clock = 8820;
    const okRes = R.execute(s, { kind: 'competition_enter', id: 'bayside_10k', strategyId: 'steady_pace' });
    assert.equal(okRes.ok, true);
    assert.equal(s.competitions.history.length, 1);
    const entry = s.competitions.history[0];
    assert.ok(['gold', 'silver', 'bronze', 'participant'].includes(entry.placement));
    assert.ok(entry.rank >= 1 && entry.rank <= 3);
    assert.ok(s.competitions.records.bayside_10k.entriesCount >= 1);
    assert.ok(s.achievements.unlocked.first_podium);
  });

  await t.test('7. Career mentorship and professional performance', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    s.location = 'tech_park';
    s.career.currentJob = 'tech_junior_developer';
    s.relations.chloe = 35; // Friendly

    const mentorRes = R.execute(s, { kind: 'career_mentorship', npc: 'chloe' });
    assert.equal(mentorRes.ok, true);
    assert.ok(s.career.performance > 70);
    assert.ok(s.reputation.professional > 0);
  });

  await t.test('8. Achievement unlocking and duplicate prevention', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Focused demeanor', background: 'scholar', trait: 'curious' });
    const s = res.state;
    s.business.owned.push({ id: 1, type: 'tech_studio', name: 'Pithe Tech Labs' });
    R.checkAchievements(s);
    assert.ok(s.achievements.unlocked.independent_founder);
    const firstCount = s.achievements.history.length;

    // Running checkAchievements again does not duplicate achievement
    R.checkAchievements(s);
    assert.equal(s.achievements.history.length, firstCount);
  });

  await t.test('9. Legacy save migration backward compatibility', () => {
    const legacySave = {
      version: 1,
      clock: 500,
      character: {
        name: 'Legacy Pithe',
        attributes: { strength: 3, agility: 3, endurance: 3, intelligence: 3, perception: 3, willpower: 3, communication: 3, empathy: 3, influence: 3, creativity: 3, management: 3, adaptability: 3 },
        skills: { writing: { level: 1, exp: 0 } },
        level: 1,
        exp: 0
      },
      needs: { energy: 50, satiety: 50, health: 50 },
      quests: { menu: { status: 'available' } },
      inventory: {},
      journal: [],
      tracker: { goals: [] },
      log: []
    };

    const migrated = R.migrateState(legacySave);
    assert.ok(migrated.specializations);
    assert.ok(migrated.reputation);
    assert.ok(migrated.organizations);
    assert.ok(migrated.competitions);
    assert.ok(migrated.achievements);
    assert.equal(migrated.reputation.professional, 0);
    assert.deepEqual(migrated.specializations, {});
  });
});
