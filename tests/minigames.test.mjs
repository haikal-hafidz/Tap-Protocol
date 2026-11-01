import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import { MINIGAMES, createMinigameSession, stepMinigame, finishMinigame } from '../js/minigames.js';

test('Mini-games: 14 distinct mini-games registered', () => {
  const keys = Object.keys(MINIGAMES);
  assert.ok(keys.length >= 14, 'Should have at least 14 mini-games');
  for (const k of keys) {
    const g = MINIGAMES[k];
    assert.ok(g.id, `${k} must have id`);
    assert.ok(g.title, `${k} must have title`);
    assert.ok(g.category, `${k} must have category`);
    assert.ok(g.skill, `${k} must have related skill`);
    assert.ok(g.instructions, `${k} must have instructions`);
    assert.ok(g.dailyCap >= 1, `${k} must define daily cap`);
  }
});

test('Mini-games: Culinary Preparation full play and reward', () => {
  const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
  const initialClock = state.clock;
  const initialEnergy = state.needs.energy;
  const initialMoney = state.money;
  const initialCookingExp = state.character.skills.cooking.exp;

  const session = createMinigameSession('culinary_prep', state);
  assert.equal(session.step, 0);

  const r1 = stepMinigame(session, { choiceIndex: 0 });
  assert.equal(r1.ok, true);
  assert.equal(session.score, 1);

  const r2 = stepMinigame(session, { choiceIndex: 0 });
  assert.equal(r2.ok, true);
  assert.equal(session.score, 2);

  const r3 = stepMinigame(session, { choiceIndex: 0 });
  assert.equal(r3.ok, true);
  assert.equal(r3.finished, true);
  assert.equal(session.score, 3);

  const fin = finishMinigame(state, session);
  assert.equal(fin.ok, true);
  assert.equal(fin.capped, false);
  assert.ok(fin.expGain > 0);
  assert.ok(state.character.skills.cooking.exp > initialCookingExp);
  assert.ok(state.money > initialMoney);
  assert.equal(state.needs.energy, initialEnergy - MINIGAMES.culinary_prep.energyCost);
  assert.equal(state.clock, initialClock + MINIGAMES.culinary_prep.durationMinutes);
});

test('Mini-games: Anti-exploit daily cap enforcement', () => {
  const { state } = R.createCharacter({ name: 'Pithe', age: 24, background: 'scholar', trait: 'curious' });
  state.needs.energy = 100;

  for (let i = 0; i < 3; i++) {
    const s = createMinigameSession('urban_photo', state);
    stepMinigame(s, { optionIndex: 0 });
    stepMinigame(s, { optionIndex: 1 });
    stepMinigame(s, { optionIndex: 1 });
    const fin = finishMinigame(state, s);
    assert.equal(fin.capped, false, `Play ${i + 1} should be rewarded`);
  }

  const s4 = createMinigameSession('urban_photo', state);
  stepMinigame(s4, { optionIndex: 0 });
  stepMinigame(s4, { optionIndex: 1 });
  stepMinigame(s4, { optionIndex: 1 });
  const fin4 = finishMinigame(state, s4);
  assert.equal(fin4.ok, true);
  assert.equal(fin4.capped, true, '4th play must be capped');
  assert.equal(fin4.expGain, 0);
  assert.equal(fin4.moneyGain, 0);
});
