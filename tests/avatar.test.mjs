import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_OPTIONS, DEFAULT_AVATAR, sanitizeAvatar, getRandomAvatar, renderAvatarSvg } from '../js/avatar.js';

test('Avatar system: options and defaults', () => {
  assert.ok(AVATAR_OPTIONS.skinTone.length >= 5, 'Should have multiple skin tones');
  assert.ok(AVATAR_OPTIONS.faceShape.length >= 3, 'Should have multiple face shapes');
  assert.ok(AVATAR_OPTIONS.hairstyle.length >= 5, 'Should have multiple hairstyles');
  assert.ok(AVATAR_OPTIONS.hairColor.length >= 5, 'Should have multiple hair colors');
  assert.ok(AVATAR_OPTIONS.clothing.length >= 4, 'Should have multiple clothing styles');
  assert.ok(AVATAR_OPTIONS.accessories.length >= 4, 'Should have multiple accessories');
  assert.ok(DEFAULT_AVATAR.skinTone, 'Default avatar must specify skin tone');
});

test('Avatar system: sanitizeAvatar fallback', () => {
  const empty = sanitizeAvatar({});
  assert.deepEqual(empty, DEFAULT_AVATAR, 'Empty input should fallback to DEFAULT_AVATAR');

  const custom = sanitizeAvatar({ skinTone: 'deep_espresso', hairstyle: 'curls', clothing: 'studio_smock' });
  assert.equal(custom.skinTone, 'deep_espresso');
  assert.equal(custom.hairstyle, 'curls');
  assert.equal(custom.clothing, 'studio_smock');
  assert.equal(custom.hairColor, DEFAULT_AVATAR.hairColor);
});

test('Avatar system: randomize and determinism', () => {
  const av1 = getRandomAvatar(12345);
  const av2 = getRandomAvatar(12345);
  assert.deepEqual(av1, av2, 'Same seed must yield deterministic avatar configuration');

  const av3 = getRandomAvatar(98765);
  assert.notDeepEqual(av1, av3, 'Different seeds should generate different avatars');
});

test('Avatar system: SVG generation renders valid scalable SVG', () => {
  const svg = renderAvatarSvg(DEFAULT_AVATAR, 160);
  assert.ok(svg.startsWith('<svg'), 'Output should start with <svg tag');
  assert.ok(svg.endsWith('</svg>'), 'Output should terminate with </svg>');
  assert.ok(svg.includes('viewBox="0 0 200 200"'), 'Should define viewBox');
  assert.ok(svg.includes('width="160"'), 'Should match requested dimensions');
  assert.ok(svg.includes('class="avatar-svg"'), 'Should attach styling class');
  // Check no emojis or unexpected text
  assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(svg), 'SVG must not contain emoji characters');
});
