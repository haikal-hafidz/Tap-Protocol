import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/data.js';
import * as R from '../js/rules.js';

test('RPG Expansion: 21 NPCs and Phase 8 intelligence mapping', () => {
  assert.equal(Object.keys(D.NPCS).length, 21, 'Must have 21 named NPCs');
  assert.equal(Object.keys(D.NPC_PERSONALITIES).length, 21, 'Must have 21 NPC personality definitions');
  for (const [id, npc] of Object.entries(D.NPCS)) {
    assert.ok(npc.id, `NPC ${id} must have id`);
    assert.ok(npc.name, `NPC ${id} must have name`);
    assert.ok(npc.role, `NPC ${id} must have role`);
    assert.ok(Array.isArray(npc.schedule), `NPC ${id} must have schedule array`);
  }
});

test('RPG Expansion: Purchasable perks system', () => {
  const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
  state.money = 200;
  state.character.level = 3;

  assert.deepEqual(state.character.perks, []);

  const res1 = R.buyPerk(state, 'quick_learner');
  assert.equal(res1.ok, true);
  assert.equal(state.money, 150);
  assert.ok(state.character.perks.includes('quick_learner'));

  const resDup = R.buyPerk(state, 'quick_learner');
  assert.equal(resDup.ok, false);
  assert.match(resDup.error, /already unlocked/i);

  const resLvl = R.buyPerk(state, 'deep_focus');
  assert.equal(resLvl.ok, false);
  assert.match(resLvl.error, /Requires Character Level 4/i);

  state.money = 5;
  const resMoney = R.buyPerk(state, 'efficient_routine');
  assert.equal(resMoney.ok, false);
  assert.match(resMoney.error, /Requires 75 Money/i);
});

test('RPG Expansion: Equipment inventory system', () => {
  const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
  state.inventory.vintage_camera = 1;
  state.inventory.linen_trench = 1;

  const eqTool = R.equipItem(state, 'vintage_camera');
  assert.equal(eqTool.ok, true);
  assert.equal(state.character.equipment.tool, 'vintage_camera');

  const eqOutfit = R.equipItem(state, 'linen_trench');
  assert.equal(eqOutfit.ok, true);
  assert.equal(state.character.equipment.outfit, 'linen_trench');

  const uneq = R.unequipItem(state, 'tool');
  assert.equal(uneq.ok, true);
  assert.equal(state.character.equipment.tool, null);

  const eqUnowned = R.equipItem(state, 'artisan_skillet');
  assert.equal(eqUnowned.ok, false);
});

test('RPG Expansion: Legacy save migration compatibility', () => {
  const legacy = {
    version: 1,
    clock: 100,
    location: 'home',
    character: {
      name: 'OldPithe',
      age: 30,
      background: 'scholar',
      trait: 'curious',
      level: 2,
      exp: 10,
      attributes: { intellect: 5 },
      attrProgress: {},
      skills: { research: { level: 3, exp: 5 } }
    },
    needs: { energy: 70, satiety: 60, health: 90 },
    money: 120,
    inventory: { bread: 2 },
    journal: [],
    tracker: { goals: [] },
    log: []
  };

  const migrated = R.migrateState(legacy);
  assert.ok(migrated.character.avatar, 'Migrated save must receive default avatar');
  assert.ok(Array.isArray(migrated.character.perks), 'Migrated save must have perks list');
  assert.ok(migrated.character.equipment, 'Migrated save must have equipment slots');
  assert.equal(migrated.character.name, 'OldPithe');
  assert.equal(migrated.money, 120);
});
