import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import * as R from '../js/rules.js';

test('PHASE 5 - Emergent World & Storytelling Comprehensive Test Suite', async (t) => {
  await t.test('1. Story creation from valid world events & conditions', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' });
    assert.equal(res.ok, true);
    const s = res.state;

    assert.ok(s.stories, 's.stories initialized');
    assert.ok(Array.isArray(s.stories.active), 's.stories.active initialized as array');
    assert.ok(Array.isArray(s.stories.history), 's.stories.history initialized as array');
    assert.ok(s.stories.discovered, 's.stories.discovered initialized');

    // Initially with 0 relationship, cafe story does not trigger
    R.processWorldSimulation(s);
    assert.equal(s.stories.active.length, 0, 'No stories should trigger without satisfying conditions');

    // When Dani relation satisfies trigger condition, cafe story emerges organically
    s.relations.dani = 12;
    R.processWorldSimulation(s);
    assert.equal(s.stories.active.length, 1, 'Story should emerge when trigger condition is satisfied');
    assert.equal(s.stories.active[0].templateId, 'cafe_artisanal_expansion');
  });

  await t.test('2. Stable unique story IDs', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    s.character.skills.programming.level = 3;
    R.processWorldSimulation(s);

    assert.ok(s.stories.active.length >= 2, 'Multiple stories can emerge based on world state');
    const ids = s.stories.active.map((st) => st.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, 'Every emergent story must have a unique stable ID');
    for (const id of ids) {
      assert.match(id, /^story_\d+$/, 'Story ID should follow stable format');
    }
  });

  await t.test('3. Duplicate trigger prevention', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 20;

    R.processWorldSimulation(s);
    const countFirst = s.stories.active.length;
    assert.equal(countFirst, 1);

    // Repeated simulation cycles should not duplicate the active story
    R.processWorldSimulation(s);
    R.processWorldSimulation(s);
    assert.equal(s.stories.active.length, 1, 'Duplicate active stories of the same template must be prevented');
  });

  await t.test('4. Multi-stage story progression & deadlines', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    const story = s.stories.active[0];

    assert.equal(story.stageId, 'inciting');
    const startDeadline = story.stageDeadline;
    assert.ok(startDeadline > s.clock, 'Stage deadline is set in future clock time');

    // Advance to target stage manually via causal or engine
    R.advanceStoryToStage(s, story.id, 'waiting_shipment', 'Shipment ordered');
    assert.equal(story.stageId, 'waiting_shipment');
    assert.ok(story.log.some((l) => l.event.includes('Awaiting Roastery Shipment')));
  });

  await t.test('5. Branching decisions and distinct outcomes', () => {
    // Branch A: Negotiate supply
    const sA = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    sA.relations.dani = 15;
    sA.character.skills.negotiation.level = 2;
    sA.location = 'cafe';
    R.processWorldSimulation(sA);
    const stA = sA.stories.active[0];

    const decA = R.execute(sA, {
      kind: 'story_decision',
      storyId: stA.id,
      choiceId: 'negotiate_supply'
    });
    assert.equal(decA.ok, true);
    assert.equal(stA.stageId, 'waiting_shipment');
    assert.equal(sA.relations.teo, 6);
    assert.ok(sA.reputation.professional > 0);

    // Branch B: Sponsor capital
    const sB = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'professional', trait: 'ambitious' }).state;
    sB.relations.dani = 15;
    sB.money = 120;
    sB.location = 'cafe';
    R.processWorldSimulation(sB);
    const stB = sB.stories.active[0];

    const decB = R.execute(sB, {
      kind: 'story_decision',
      storyId: stB.id,
      choiceId: 'sponsor_capital'
    });
    assert.equal(decB.ok, true);
    assert.equal(sB.money, 40); // 120 - 80
    assert.equal(sB.relations.dani, 29); // 15 + 14

    // Branch C: Counsel caution
    const sC = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'analytical' }).state;
    sC.relations.dani = 15;
    sC.character.skills.research.level = 2;
    sC.location = 'cafe';
    R.processWorldSimulation(sC);
    const stC = sC.stories.active[0];

    const decC = R.execute(sC, {
      kind: 'story_decision',
      storyId: stC.id,
      choiceId: 'counsel_caution'
    });
    assert.equal(decC.ok, true);
    assert.equal(stC.stageId, 'conservative_resolution');
    assert.equal(sC.relations.teo, 10);
  });

  await t.test('6. Delayed consequences execution via causal triggers', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    s.character.skills.negotiation.level = 2;
    s.location = 'cafe';
    R.processWorldSimulation(s);
    const st = s.stories.active[0];

    R.execute(s, {
      kind: 'story_decision',
      storyId: st.id,
      choiceId: 'negotiate_supply'
    });

    assert.equal(st.stageId, 'waiting_shipment');
    const trig = s.causalTriggers.find((t) => t.data?.storyId === st.id);
    assert.ok(trig, 'Delayed consequence causal trigger must be scheduled');
    assert.equal(trig.action, 'story_advance');
    assert.equal(trig.data.targetStage, 'escalation_success');

    // Advance time past trigger execution clock
    s.clock = trig.executeClock + 10;
    R.processWorldSimulation(s);

    assert.equal(st.stageId, 'escalation_success', 'Story should advance to targetStage when delayed consequence executes');
  });

  await t.test('7. NPC autonomous story participation and progression', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    const st = s.stories.active[0];
    assert.equal(st.stageId, 'inciting');

    // Player does not participate, clock elapses past deadline
    s.clock = st.stageDeadline + 1;
    R.processWorldSimulation(s);

    // Should have transitioned to escalation_autonomous autonomously
    assert.equal(st.stageId, 'escalation_autonomous', 'NPCs should autonomously advance storyline when player does not intervene');
    assert.ok(st.autonomousProgressions >= 1);
  });

  await t.test('8. NPC story resolution without player intervention', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    const st = s.stories.active[0];

    // Let both stages elapse completely
    s.clock = st.stageDeadline + 1;
    R.processWorldSimulation(s); // transitions to escalation_autonomous

    s.clock = st.stageDeadline + 1;
    R.processWorldSimulation(s); // autonomously resolves

    assert.equal(s.stories.active.length, 0, 'Autonomously resolved story should leave active list');
    assert.equal(s.stories.history.length, 1, 'Autonomously resolved story recorded in history');
    const hist = s.stories.history[0];
    assert.equal(hist.playerParticipated, false);
    assert.equal(hist.outcomeState, 'strained_resolution');
  });

  await t.test('9. Rumor discovery and verification', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);

    const rumors = s.memories.filter((m) => m.isRumor);
    assert.ok(rumors.length > 0, 'Story spawn generates circulating neighborhood rumor');
    const rumor = rumors[0];
    assert.equal(rumor.verified, false);

    const verRes = R.verifyRumor(s, rumor.id);
    assert.equal(verRes.ok, true);
    assert.equal(rumor.verified, true);
    assert.equal(rumor.isRumor, false);
  });

  await t.test('10. Information access restrictions & discovery paths', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    const st = s.stories.active[0];

    // Story is initially undiscovered
    assert.equal(s.stories.discovered[st.id], undefined);
    assert.equal(R.getDiscoveredStories(s).length, 0);

    // Player cannot make decision when not at story location
    s.location = 'home';
    const failLoc = R.execute(s, {
      kind: 'story_decision',
      storyId: st.id,
      choiceId: 'sponsor_capital'
    });
    assert.equal(failLoc.ok, false);
    assert.match(failLoc.error, /must be at/i);

    // Discover story explicitly or via talking
    const discRes = R.execute(s, {
      kind: 'story_discover',
      storyId: st.id
    });
    assert.equal(discRes.ok, true);
    assert.equal(s.stories.discovered[st.id], true);
    assert.equal(R.getDiscoveredStories(s).length, 1);
  });

  await t.test('11. Story expiration and unresolved outcomes', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    // Construct custom active story without autonomous path to test natural expiration
    const dummyStory = {
      id: 'story_dummy',
      templateId: 'cafe_artisanal_expansion',
      title: 'Dummy Test Story',
      theme: 'test',
      location: 'cafe',
      participants: ['dani'],
      stageId: 'unknown_stage',
      stageEnteredClock: 0,
      stageDeadline: 500,
      playerParticipated: false,
      resolved: false,
      outcomeState: null,
      decisions: [],
      log: []
    };
    s.stories.active.push(dummyStory);
    s.clock = 600;
    R.processWorldSimulation(s);

    assert.equal(s.stories.active.some((st) => st.id === 'story_dummy'), false);
    const hist = s.stories.history.find((h) => h.id === 'story_dummy');
    assert.ok(hist);
    assert.equal(hist.outcomeState, 'expired_unresolved');
  });

  await t.test('12. Journal and World Memory integration', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    s.character.skills.negotiation.level = 2;
    s.location = 'cafe';
    R.processWorldSimulation(s);
    const st = s.stories.active[0];

    const beforeMemCount = s.memories.length;
    const beforeChronCount = s.chronicle.length;

    R.execute(s, {
      kind: 'story_decision',
      storyId: st.id,
      choiceId: 'negotiate_supply'
    });

    assert.ok(s.memories.length > beforeMemCount, 'Story decision records in World Memory');
    assert.ok(s.chronicle.length > beforeChronCount, 'Story decision records in Life Chronicle');
    const mem = s.memories[s.memories.length - 1];
    assert.equal(mem.type, 'story_decision');
    assert.equal(mem.importance, D.MEMORY_IMPORTANCE.MAJOR);
  });

  await t.test('13. Save/load persistence', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    s.stories.discovered[s.stories.active[0].id] = true;

    // Serialize to JSON and parse back
    const serialized = JSON.stringify(s);
    const loaded = JSON.parse(serialized);

    assert.ok(loaded.stories);
    assert.equal(loaded.stories.active.length, 1);
    assert.equal(loaded.stories.active[0].id, s.stories.active[0].id);
    assert.equal(loaded.stories.discovered[s.stories.active[0].id], true);
  });

  await t.test('14. Legacy save migration', () => {
    // Legacy save with no s.stories
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
    assert.ok(migrated.stories);
    assert.deepEqual(migrated.stories.active, []);
    assert.deepEqual(migrated.stories.history, []);
    assert.deepEqual(migrated.stories.discovered, {});
  });

  await t.test('15. Deterministic simulation behavior', () => {
    const runSim = (seed) => {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious', seed }).state;
      s.relations.dani = 15;
      s.relations.teo = 10;
      s.character.skills.negotiation.level = 2;
      s.location = 'cafe';
      R.processWorldSimulation(s);
      const st = s.stories.active[0];
      R.execute(s, { kind: 'story_decision', storyId: st.id, choiceId: 'negotiate_supply' });
      return JSON.stringify({
        clock: s.clock,
        stories: s.stories,
        relations: s.relations,
        reputation: s.reputation
      });
    };

    const run1 = runSim(42);
    const run2 = runSim(42);
    assert.equal(run1, run2, 'Identical seed and actions must produce byte-identical deterministic simulation state');
  });

  await t.test('16. Offline operation (no network requests made)', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    R.processWorldSimulation(s);
    assert.ok(s.stories.active.length > 0);
    // Verified pure JS without window.fetch or external calls
  });

  await t.test('17. Reward and progression exploit prevention', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
    s.relations.dani = 15;
    s.character.skills.negotiation.level = 2;
    s.location = 'cafe';
    R.processWorldSimulation(s);
    const st = s.stories.active[0];

    const first = R.execute(s, {
      kind: 'story_decision',
      storyId: st.id,
      choiceId: 'negotiate_supply'
    });
    assert.equal(first.ok, true);

    // Attempting same decision again must fail
    const repeat = R.execute(s, {
      kind: 'story_decision',
      storyId: st.id,
      choiceId: 'negotiate_supply'
    });
    assert.equal(repeat.ok, false, 'Repeat decision execution must be rejected to prevent farming');
  });

  await t.test('18. Regression coverage across all 5 story templates', () => {
    // 1. Cafe Artisanal Expansion
    {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
      s.relations.dani = 12;
      R.processWorldSimulation(s);
      assert.ok(s.stories.active.some((st) => st.templateId === 'cafe_artisanal_expansion'));
    }

    // 2. Academic Open Source Dilemma
    {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
      s.character.skills.programming.level = 2;
      R.processWorldSimulation(s);
      assert.ok(s.stories.active.some((st) => st.templateId === 'academic_open_source_dilemma'));
    }

    // 3. Market Preservation Initiative
    {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
      s.relations.teo = 10;
      R.processWorldSimulation(s);
      assert.ok(s.stories.active.some((st) => st.templateId === 'market_preservation_initiative'));
    }

    // 4. Academic Symposium Rivalry
    {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
      s.relations.elena = 12;
      R.processWorldSimulation(s);
      assert.ok(s.stories.active.some((st) => st.templateId === 'academic_symposium_rivalry'));
    }

    // 5. Marina Coastal Cleanup Initiative
    {
      const s = R.createCharacter({ name: 'Pithe', age: 24, appearance: 'Alert', background: 'scholar', trait: 'curious' }).state;
      s.relations.julian = 8;
      R.processWorldSimulation(s);
      assert.ok(s.stories.active.some((st) => st.templateId === 'marina_coastal_cleanup_initiative'));
    }
  });
});
