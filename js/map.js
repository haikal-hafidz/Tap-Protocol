// TAP Protocol - 2D Interactive City Map.
// Pure SVG vector rendering of all districts, locations, and real-time player location markers.
// Zero emojis, zero external assets, fully responsive, touch & mouse accessible.

import * as D from './data.js';

export const MAP_NODES = {
  home: { id: 'home', name: 'Rented Room', district: 'harbor_quarter', x: 180, y: 150 },
  library: { id: 'library', name: 'District Library', district: 'harbor_quarter', x: 260, y: 130 },
  market: { id: 'market', name: 'Lantern Market', district: 'lantern_district', x: 380, y: 180 },
  cafe: { id: 'cafe', name: 'Corner Cafe', district: 'harbor_quarter', x: 160, y: 240 },
  downtown: { id: 'downtown', name: 'Downtown Plaza', district: 'metro_core', x: 290, y: 260 },
  university: { id: 'university', name: 'University Campus', district: 'university_quarter', x: 190, y: 350 },
  tech_park: { id: 'tech_park', name: 'Tech Innovation Park', district: 'innovation_corridor', x: 420, y: 320 },
  marina: { id: 'marina', name: 'Coastal Marina', district: 'coastal_marina', x: 320, y: 400 }
};

export function renderCityMapSvg(currentLocationId = 'home', options = {}) {
  const currentLoc = MAP_NODES[currentLocationId] || MAP_NODES.home;

  let svg = `<svg viewBox="0 0 560 480" class="map-svg" role="img" aria-label="Interactive City Map of the Harbor Province">`;

  // Map Background: Water & Coastline Geography
  svg += `<rect width="560" height="480" fill="#EAE5D9"/>`;
  svg += `<path d="M 0 380 C 140 370, 260 420, 560 400 L 560 480 L 0 480 Z" fill="#D3DDD5"/>`;
  svg += `<path d="M 440 0 C 470 120, 500 240, 560 300 L 560 0 Z" fill="#E2DAC9" opacity="0.6"/>`;

  // District Outlines
  svg += `<polygon points="120,80 320,80 300,280 120,280" fill="#FFFEFC" stroke="#E3DCCE" stroke-width="2" opacity="0.8"/>`;
  svg += `<polygon points="320,80 500,80 500,280 300,280" fill="#F8F4EC" stroke="#E3DCCE" stroke-width="2" opacity="0.8"/>`;
  svg += `<polygon points="120,280 320,280 300,440 120,440" fill="#F4F0E6" stroke="#E3DCCE" stroke-width="2" opacity="0.8"/>`;
  svg += `<polygon points="320,280 520,280 520,440 300,440" fill="#EFE9DD" stroke="#E3DCCE" stroke-width="2" opacity="0.8"/>`;

  // District Labels
  svg += `<text x="140" y="105" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#77766D" letter-spacing="0.1em">HARBOR QUARTER</text>`;
  svg += `<text x="340" y="105" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#77766D" letter-spacing="0.1em">LANTERN DISTRICT</text>`;
  svg += `<text x="140" y="425" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#77766D" letter-spacing="0.1em">UNIVERSITY QUARTER</text>`;
  svg += `<text x="340" y="425" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#77766D" letter-spacing="0.1em">INNOVATION & MARINA</text>`;

  // Road Transit Networks
  const routes = [
    ['home', 'library'],
    ['home', 'cafe'],
    ['library', 'downtown'],
    ['cafe', 'downtown'],
    ['library', 'market'],
    ['downtown', 'market'],
    ['downtown', 'university'],
    ['downtown', 'tech_park'],
    ['downtown', 'marina'],
    ['university', 'marina'],
    ['tech_park', 'marina']
  ];

  for (const [from, to] of routes) {
    const p1 = MAP_NODES[from], p2 = MAP_NODES[to];
    if (p1 && p2) {
      svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#D5CBB9" stroke-width="4" stroke-linecap="round"/>`;
      svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#FFFEFC" stroke-width="1.5" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    }
  }

  // Location Nodes
  for (const [id, node] of Object.entries(MAP_NODES)) {
    const isHere = id === currentLocationId;
    const fill = isHere ? '#354B3B' : '#FFFEFC';
    const stroke = isHere ? '#BA6956' : '#738451';
    const radius = isHere ? 12 : 9;

    svg += `<g class="map-node">`;
    if (isHere) {
      svg += `<circle cx="${node.x}" cy="${node.y}" r="20" fill="none" stroke="#BA6956" stroke-width="2" opacity="0.6"/>`;
    }
    svg += `<circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
    svg += `<text x="${node.x}" y="${node.y + 20}" font-family="system-ui, sans-serif" font-size="10" font-weight="${isHere ? '700' : '600'}" fill="${isHere ? '#354B3B' : '#55544D'}" text-anchor="middle">${node.name}</text>`;
    svg += `</g>`;
  }

  // Compass Rose / Scale Marker
  svg += `<g transform="translate(480, 50)">`;
  svg += `<circle cx="0" cy="0" r="18" fill="#FFFEFC" stroke="#E3DCCE" stroke-width="1.5"/>`;
  svg += `<line x1="0" y1="-14" x2="0" y2="14" stroke="#354B3B" stroke-width="2"/>`;
  svg += `<line x1="-14" y1="0" x2="14" y2="0" stroke="#77766D" stroke-width="1.5"/>`;
  svg += `<polygon points="0,-14 -3,-5 0,-8 3,-5" fill="#BA6956"/>`;
  svg += `<text x="0" y="-18" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="#354B3B" text-anchor="middle">N</text>`;
  svg += `</g>`;

  svg += `</svg>`;
  return svg;
}
