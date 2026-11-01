import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import * as D from '../js/data.js';

test('PHASE 3 - World Memory & Living Simulation Comprehensive Test Suite', async (t) => {
  await t.test('1. World Memory creation, structure, and deduplication', () => {
    const res = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
    assert.equal(res.ok, true);
    const s = res.state;

    assert.ok(Array.isArray(s.memories), 'state.memories initialized as array');
    assert.ok(s.npcSim, 'state.npcSim initialized');
    assert.ok(s.npcNetwork, 'state.npcNetwork initialized');
    assert.ok(s.worldLocations, 'state.worldLocations initialized');
    assert.ok(s.worldEvents, 'state.worldEvents initialized');

    const m1 = R.recordMemory(s, {
      type: 'quest_interaction',
      title: 'Pithe assisted Dani with the cafe menu',
      entities: ['pithe', 'dani'],
      location: 'cafe',
      importance: D.MEMORY_IMPORTANCE.MAJOR,
      context: 'Wrote and delivered handwritten description cards for seasonal dishes.'
    });

    assert.ok(m1.id > 0);
    assert.equal(m1.title, 'Pithe assisted Dani with the cafe menu');
    assert.equal(m1.importance, D.MEMORY_IMPORTANCE.MAJOR);
    assert.equal(s.memories.length, 1);

    // Deduplication test: identical memory within 24 hours returns existing record
    const m1Dup = R.recordMemory(s, {
      type: 'quest_interaction',
      title: 'Pithe assisted Dani with the cafe menu',
      entities: ['pithe', 'dani'],
      location: 'cafe'
    });
    assert.equal(m1Dup.id, m1.id, 'Duplicate memory within 24h must return existing ID');
    assert.equal(s.memories.length, 1, 'Memories array length must not increase on duplicate');
  });

  await t.test('2. Querying World Memories by entity, location, and importance', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'creator', trait: 'ambitious' }).state;

    R.recordMemory(s, {
      type: 'trade',
      title: 'Teo signed new regional spice contract',
      entities: ['teo'],
      location: 'market',
      importance: D.MEMORY_IMPORTANCE.NOTABLE
    });

    R.recordMemory(s, {
      type: 'research',
      title: 'Dr. Rostova released symposium notes',
      entities: ['elena'],
      location: 'university',
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT
    });

    const teoMems = R.queryMemories(s, { entity: 'teo' });
    assert.equal(teoMems.length, 1);
    assert.equal(teoMems[0].title, 'Teo signed new regional spice contract');

    const univMems = R.queryMemories(s, { location: 'university' });
    assert.equal(univMems.length, 1);

    const sigMems = R.queryMemories(s, { minImportance: D.MEMORY_IMPORTANCE.SIGNIFICANT });
    assert.equal(sigMems.length, 1);
    assert.equal(sigMems[0].entities[0], 'elena');
  });

  await t.test('3. Bounded memory retention and preservation of historical milestones', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'drifter', trait: 'chaotic' }).state;

    // Add a historical memory that must never be pruned
    const historicalMem = R.recordMemory(s, {
      type: 'historical_event',
      title: 'Metropolis Centennial Foundation Day',
      importance: D.MEMORY_IMPORTANCE.HISTORICAL,
      context: 'Centennial foundation monument established in harbor district.'
    });

    // Flood with fleeting memories exceeding MAX_WORLD_MEMORIES
    for (let i = 0; i < D.MAX_WORLD_MEMORIES + 50; i++) {
      s.clock += 30;
      R.recordMemory(s, {
        type: 'fleeting_lore',
        title: `Transient rumor or notice ${i}`,
        importance: D.MEMORY_IMPORTANCE.FLEETING
      });
    }

    assert.ok(s.memories.length <= D.MAX_WORLD_MEMORIES, `Memory count (${s.memories.length}) must not exceed limit (${D.MAX_WORLD_MEMORIES})`);
    const foundHistorical = s.memories.find((m) => m.id === historicalMem.id);
    assert.ok(foundHistorical, 'Historical memories must be permanently retained across pruning');
  });

  await t.test('4. NPC Personal Memory and interaction history', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'social' }).state;

    // Record personal memory for Dani
    const pm = R.recordNpcMemory(s, 'dani', {
      sourceEntity: 'pithe',
      title: 'Pithe gifted roasted cardamom beans',
      context: 'A thoughtful specialty food present for the cafe espresso machine.',
      importance: D.MEMORY_IMPORTANCE.SIGNIFICANT
    });

    assert.ok(pm);
    assert.equal(s.npcSim.dani.memories.length, 1);
    assert.equal(s.npcSim.dani.memories[0].title, 'Pithe gifted roasted cardamom beans');

    // Social hangout also automatically writes to NPC memory
    s.location = 'cafe';
    s.money = 200;
    const hangoutRes = R.execute(s, { kind: 'social_interact', npc: 'dani', interactType: 'hangout' });
    assert.equal(hangoutRes.ok, true);

    const daniMems = s.npcSim.dani.memories;
    assert.ok(daniMems.some((m) => m.title.includes('Spent casual social time with Pithe')), 'Social hangout recorded in NPC memories');
  });

  await t.test('5. NPC Autonomous life progression and milestone achievements', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;

    R.processAutonomousNpcLives(s);
    assert.ok(s.npcSim.teo.lastDayProcessed);

    // Simulate 4 weeks of autonomous NPC simulation
    for (let w = 0; w < 4; w++) {
      s.clock += 7 * 24 * 60;
      R.processAutonomousNpcLives(s);
    }

    assert.ok(s.npcSim.teo.memories.length > 0, 'NPC must record personal milestone memory');
    assert.ok(s.memories.some((m) => m.type === 'npc_milestone'), 'World memory records autonomous NPC milestone');
  });

  await t.test('6. NPC-to-NPC Relationship Network evolution', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;
    const initialAff = s.npcNetwork['dani|teo'].affinity;

    // Advance 4 weeks and let relationships evolve based on shared circle/workplaces
    for (let w = 0; w < 4; w++) {
      s.clock += 7 * 24 * 60;
      R.processNpcRelationships(s);
    }

    const newAff = s.npcNetwork['dani|teo'].affinity;
    assert.ok(newAff > initialAff, `Affinity between Teo and Dani must evolve over time (${newAff} > ${initialAff})`);
    assert.ok(s.npcNetwork['dani|teo'].milestones.length > 0, 'Relationship milestones tracked');
  });

  await t.test('7. Social information propagation and rumor verification', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'creator', trait: 'curious' }).state;

    const rumor = R.createRumor(s, {
      type: 'rumor',
      title: 'Harbor spice delivery delayed due to coastal fog',
      entities: ['teo'],
      location: 'market',
      importance: D.MEMORY_IMPORTANCE.NOTABLE,
      context: 'Traders at the market are discussing stock delays.'
    });

    assert.equal(rumor.isRumor, true);
    assert.equal(rumor.verified, false);

    const vRes = R.verifyRumor(s, rumor.id);
    assert.equal(vRes.ok, true);
    assert.equal(rumor.isRumor, false);
    assert.equal(rumor.verified, true);
    assert.ok(s.npcSim.teo.memories.some((m) => m.title.includes('Pithe verified rumor')), 'Verification logged into NPC memory');
  });

  await t.test('8. Emergent world events scheduling, participation, and autonomous resolution', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;

    // Advance to 11:00 on Monday (clock 240) at library
    s.location = 'library';
    s.clock = 240;
    R.processEmergentWorldEvents(s);

    assert.ok(s.worldEvents.active.length > 0, 'Book fair event scheduled during active hours');
    const ev = s.worldEvents.active[0];
    assert.equal(ev.location, 'library');

    const partRes = R.execute(s, { kind: 'event_participate', id: ev.id });
    assert.equal(partRes.ok, true);
    assert.equal(ev.playerParticipated, true);
    assert.ok(s.memories.some((m) => m.type === 'event_attendance'), 'Attendance recorded in World Memory');

    // Missed event autonomous fallback test
    const s2 = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' }).state;
    s2.location = 'home';
    s2.clock = 240;
    R.processEmergentWorldEvents(s2);
    assert.ok(s2.worldEvents.active.length > 0);

    // Fast-forward past event endClock without participating
    s2.clock += 12 * 60;
    R.processEmergentWorldEvents(s2);
    assert.equal(s2.worldEvents.active.length, 0, 'Event expired from active list');
    assert.ok(s2.memories.some((m) => m.type === 'event_resolution'), 'Autonomous resolution memory recorded when player misses event');
  });

  await t.test('9. Causal triggers and delayed consequences', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'professional', trait: 'ambitious' }).state;

    R.scheduleCausalTrigger(s, {
      delayMinutes: 120,
      action: 'npc_trust',
      data: { npc: 'mira', amount: 10 }
    });

    assert.equal(s.causalTriggers.length, 1);
    const miraTrust0 = s.relations.mira || 0;

    // Advance time past delay
    R.execute(s, { kind: 'activity', id: 'study' }); // takes 120 minutes
    assert.equal(s.causalTriggers.length, 0, 'Causal trigger fired and cleared from queue');
    assert.equal(s.relations.mira, miraTrust0 + 10, 'Delayed trust consequence applied');
  });

  await t.test('10. Idempotent calendar transitions and save migration compatibility', () => {
    const s = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'analytical' }).state;

    // Verify initial migration and double migration are clean and idempotent
    const m1 = R.migrateState(JSON.parse(JSON.stringify(s)));
    const m2 = R.migrateState(JSON.parse(JSON.stringify(m1)));
    assert.equal(JSON.stringify(m1), JSON.stringify(m2), 'Migration must be completely idempotent');
    assert.ok(Array.isArray(m1.memories), 'Memories preserved in migrated save');
    assert.ok(m1.npcSim && m1.npcNetwork && m1.worldLocations, 'World structures preserved in migrated save');
  });
});
