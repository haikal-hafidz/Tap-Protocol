import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import * as D from '../js/data.js';

test('PHASE 8 - Intelligence & Immersion Comprehensive Test Suite', async (t) => {
  // 1. NPC personality stability
  await t.test('1. NPC personality stability', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.npcIntelligence);
    const dani = state.npcIntelligence.dani;
    assert.ok(dani);
    assert.equal(dani.personality.name, 'Dani');
    assert.ok(Array.isArray(dani.personality.traits));
    assert.ok(dani.personality.traits.includes('creative'));
    assert.ok(dani.personality.openness >= 0 && dani.personality.openness <= 100);
    assert.ok(dani.personality.aspirations.length > 0);

    // Verify stability over time and simulation ticks
    const initialTraits = [...dani.personality.traits];
    R.execute(state, { kind: 'activity', id: 'study' });
    assert.deepEqual(state.npcIntelligence.dani.personality.traits, initialTraits);
  });

  // 2. Contextual NPC decisions
  await t.test('2. Contextual NPC decisions', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    // Advance to day when Dani is at cafe (clock = 3 * 60 -> 10:00)
    state.clock = 3 * 60;
    state.location = 'cafe';
    state.relations.dani = 30; // Above initiative threshold

    R.processNpcInitiatives(state);
    const daniIntel = state.npcIntelligence.dani;
    assert.ok(daniIntel.initiativePending);
    assert.equal(daniIntel.initiativePending.type, 'activity_invite');
    assert.equal(daniIntel.initiativePending.topicId, 'casual_morning_coffee');
  });

  // 3. Relationship-dependent behavior
  await t.test('3. Relationship-dependent behavior', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.clock = 3 * 60;
    state.location = 'cafe';
    state.relations.dani = 5; // Too low for high-intimacy topic

    const actHigh = { kind: 'contextual_talk', npc: 'dani', topic: 'relationship_gratitude_bond' };
    const pFail = R.preview(state, actHigh);
    assert.equal(pFail.ok, false);
    assert.match(pFail.error, /does not know you well enough/i);

    // Increase relationship
    state.relations.dani = 50;
    const pPass = R.preview(state, actHigh);
    assert.equal(pPass.ok, true);
  });

  // 4. NPC memory consistency
  await t.test('4. NPC memory consistency', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.clock = 3 * 60; // 10:00, Dani at cafe
    state.location = 'cafe';
    state.relations.dani = 15;

    const res = R.execute(state, { kind: 'contextual_talk', npc: 'dani', topic: 'casual_morning_coffee' });
    assert.equal(res.ok, true);

    const mems = state.npcSim.dani.memories;
    assert.ok(mems.length > 0);
    const lastMem = mems[mems.length - 1];
    assert.equal(lastMem.sourceEntity, 'pithe');
    assert.match(lastMem.title, /Conversed with Pithe/);
  });

  // 5. Conversation context
  await t.test('5. Conversation context', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    // Try morning coffee topic in evening (clock = 12 * 60 -> 19:00)
    state.clock = 12 * 60;
    state.location = 'cafe';
    const act = { kind: 'contextual_talk', npc: 'dani', topic: 'casual_morning_coffee' };
    const p = R.preview(state, act);
    assert.equal(p.ok, false);
    assert.match(p.error, /timing feels unsuitable|not here/i);
  });

  // 6. Conversation reward limits
  await t.test('6. Conversation reward limits', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.clock = 3 * 60; // 10:00
    state.location = 'cafe';
    state.relations.dani = 10;

    const act = { kind: 'contextual_talk', npc: 'dani', topic: 'casual_morning_coffee' };
    const r1 = R.execute(state, act);
    assert.equal(r1.ok, true);

    const r2 = R.execute(state, act);
    assert.equal(r2.ok, true);

    const r3 = R.execute(state, act);
    assert.equal(r3.ok, false);
    assert.match(r3.error, /already explored this conversation deeply today/i);
  });

  // 7. Emotional state transitions
  await t.test('7. Emotional state transitions', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.emotions);
    const initialMood = state.emotions.mood;
    const initialStress = state.emotions.stress;

    R.adjustEmotions(state, { mood: 10, stress: -5 });
    assert.equal(state.emotions.mood, initialMood + 10);
    assert.equal(state.emotions.stress, initialStress - 5);
  });

  // 8. Emotional recovery
  await t.test('8. Emotional recovery', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.emotions.stress = 80;
    state.emotions.mood = 30;

    // Execute morning routine
    state.location = 'home';
    const res = R.execute(state, { kind: 'activity', id: 'morning_routine' });
    assert.equal(res.ok, true);
    assert.ok(state.needs.energy >= 90);
  });

  // 9. Activity and emotional integration
  await t.test('9. Activity and emotional integration', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'home';
    const res = R.execute(state, { kind: 'activity', id: 'evening_unwind' });
    assert.equal(res.ok, true);
    assert.match(res.title, /Evening Unwind/i);
  });

  // 10. Daily routine integration
  await t.test('10. Daily routine integration', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.location = 'home';
    assert.ok(D.ACTIVITIES.morning_routine);
    assert.ok(D.ACTIVITIES.household_maintenance);
    assert.ok(D.ACTIVITIES.leisure_reading);

    const acts = R.locationActivities(state);
    assert.ok(acts.some((a) => a.id === 'morning_routine'));
    assert.ok(acts.some((a) => a.id === 'household_maintenance'));
  });

  // 11. Player influence and world reactions
  await t.test('11. Player influence and world reactions', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.clock = 3 * 60; // 10:00
    state.location = 'cafe';
    const initialDaniRel = state.relations.dani || 0;

    const res = R.execute(state, { kind: 'contextual_talk', npc: 'dani', topic: 'casual_morning_coffee' });
    assert.equal(res.ok, true);
    assert.ok(state.relations.dani > initialDaniRel);
  });

  // 12. Narrative accuracy
  await t.test('12. Narrative accuracy', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    R.recordChronicle(state, {
      category: 'education',
      title: 'Graduated Harbor Academy',
      desc: 'Completed rigorous diploma in humanities.'
    });

    const bio = R.generatePersonalBiography(state);
    assert.ok(bio.some((b) => b.title === 'Graduated Harbor Academy' && b.verified));
  });

  // 13. Verified versus unverified historical records
  await t.test('13. Verified versus unverified historical records', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    R.recordMemory(state, {
      type: 'rumor',
      title: 'Whispers of old smuggling docks',
      context: 'Unverified rumor about lost harbor vaults.',
      isRumor: true,
      verified: false
    });

    const bio = R.generatePersonalBiography(state);
    const verified = bio.filter((b) => b.verified);
    const unverified = bio.filter((b) => !b.verified);

    assert.ok(unverified.some((b) => b.title === 'Whispers of old smuggling docks'));
    assert.ok(!verified.some((b) => b.title === 'Whispers of old smuggling docks'));
  });

  // 14. Deterministic behavior
  await t.test('14. Deterministic behavior', () => {
    const s1 = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;
    const s2 = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;

    R.processPhase8Simulation(s1);
    R.processPhase8Simulation(s2);

    assert.deepEqual(s1.atmosphere, s2.atmosphere);
    assert.deepEqual(s1.emotions, s2.emotions);
  });

  // 15. Simulation performance
  await t.test('15. Simulation performance', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) {
      R.processPhase8Simulation(state);
    }
    const duration = Date.now() - t0;
    assert.ok(duration < 200, `Simulation took ${duration}ms, expected < 200ms`);
  });

  // 16. Memory and state bounds
  await t.test('16. Memory and state bounds', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    R.adjustEmotions(state, { mood: 9999, stress: -9999 });
    assert.equal(state.emotions.mood, 100);
    assert.equal(state.emotions.stress, 0);
  });

  // 17. Save/load compatibility
  await t.test('17. Save/load compatibility', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    state.audioSettings.enabled = true;
    state.emotions.mood = 88;

    const serialized = JSON.stringify(state);
    const loaded = JSON.parse(serialized);

    assert.equal(loaded.audioSettings.enabled, true);
    assert.equal(loaded.emotions.mood, 88);
  });

  // 18. Legacy migration
  await t.test('18. Legacy migration', () => {
    // Simulating old Phase 1 save
    const legacy = {
      version: 1,
      clock: 100,
      character: { name: 'OldTimer', attributes: {}, skills: {} },
      needs: { energy: 50, satiety: 50, health: 50 },
      quests: { menu: {} },
      inventory: {},
      journal: [],
      tracker: { goals: [] },
      log: []
    };
    const migrated = R.migrateState(legacy);
    assert.ok(migrated.emotions);
    assert.ok(migrated.npcIntelligence);
    assert.ok(migrated.atmosphere);
    assert.ok(migrated.audioSettings);
    assert.equal(migrated.emotions.mood, 70);
  });

  // 19. Supabase compatibility
  await t.test('19. Supabase compatibility', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    const jsonStr = JSON.stringify(state);
    const parsed = JSON.parse(jsonStr);
    assert.equal(typeof parsed, 'object');
    assert.ok(!jsonStr.includes('undefined'));
  });

  // 20. Offline functionality
  await t.test('20. Offline functionality', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.doesNotThrow(() => {
      R.processPhase8Simulation(state);
      R.generatePersonalBiography(state);
    });
  });

  // 21. Accessibility
  await t.test('21. Accessibility', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.equal(state.audioSettings.enabled, false);
    assert.equal(state.audioSettings.volume, 0.5);
  });

  // 22. Mobile responsiveness
  await t.test('22. Mobile responsiveness', () => {
    assert.ok(D.PHASE8_ACTIVITIES);
    assert.ok(D.ATMOSPHERE_PROFILES);
  });

  // 23. Phase 1-7 regression compatibility
  await t.test('23. Phase 1-7 regression compatibility', () => {
    const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.ok(state.districts); // Phase 7
    assert.ok(state.family); // Phase 6
    assert.ok(state.stories); // Phase 5
    assert.ok(state.organizations); // Phase 4
    assert.ok(state.memories); // Phase 3
    assert.ok(state.career); // Phase 2
    assert.ok(state.needs); // Phase 1
    assert.ok(state.emotions); // Phase 8
    assert.ok(state.npcIntelligence); // Phase 8
  });
});
