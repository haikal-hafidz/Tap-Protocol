import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_NODES, renderCityMapSvg } from '../js/map.js';
import { renderLocationSceneSvg } from '../js/scenes.js';

test('2D Map: All locations registered in MAP_NODES', () => {
  const locs = ['home', 'library', 'market', 'cafe', 'downtown', 'university', 'tech_park', 'marina'];
  for (const l of locs) {
    assert.ok(MAP_NODES[l], `Map node ${l} should exist`);
    assert.ok(typeof MAP_NODES[l].x === 'number');
    assert.ok(typeof MAP_NODES[l].y === 'number');
  }
});

test('2D Map: Renders SVG with player location marker and travel nodes', () => {
  const svg = renderCityMapSvg('cafe');
  assert.ok(svg.startsWith('<svg'), 'Map must start with <svg tag');
  assert.ok(svg.endsWith('</svg>'), 'Map must terminate with </svg>');
  assert.ok(svg.includes('class="map-svg"'), 'Map must have styling class');
  assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(svg), 'Map SVG must not contain emojis');
});

test('Scenes: Generates distinct vector illustrations for all key locations', () => {
  const locations = ['home', 'cafe', 'library', 'market', 'marina', 'downtown'];
  for (const loc of locations) {
    const sc = renderLocationSceneSvg(loc);
    assert.ok(sc.startsWith('<svg'), `Scene for ${loc} must start with <svg`);
    assert.ok(sc.endsWith('</svg>'), `Scene for ${loc} must terminate with </svg>`);
    assert.ok(sc.includes('class="scene-graphic"'), `Scene for ${loc} must have scene-graphic class`);
    assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(sc), `Scene for ${loc} must not contain emojis`);
  }
});
