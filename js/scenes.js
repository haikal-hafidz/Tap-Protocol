// TAP Protocol - Illustrated Location Scene Compositor.
// Provides distinctive static vector scene illustrations for key locations.
// Clean editorial aesthetic, architectural vignettes, matching TAP Protocol palette.
// Zero emoji, offline compatible.

export function renderLocationSceneSvg(locationId = 'home', options = {}) {
  let svg = `<svg viewBox="0 0 600 240" class="scene-graphic" role="img" aria-label="Location Illustration">`;

  switch (locationId) {
    case 'home':
      svg += `<rect width="600" height="240" fill="#F4EFE6"/>`;
      svg += `<rect x="40" y="30" width="160" height="150" fill="#E2EBE5" stroke="#77766D" stroke-width="3"/>`;
      svg += `<line x1="120" y1="30" x2="120" y2="180" stroke="#77766D" stroke-width="2"/>`;
      svg += `<line x1="40" y1="105" x2="200" y2="105" stroke="#77766D" stroke-width="2"/>`;
      svg += `<polygon points="60,105 85,80 110,105" fill="#BA6956" opacity="0.6"/>`;
      svg += `<polygon points="120,105 150,75 180,105" fill="#738451" opacity="0.5"/>`;
      svg += `<rect x="20" y="180" width="560" height="60" fill="#C5B69F"/>`;
      svg += `<rect x="240" y="150" width="70" height="30" rx="3" fill="#354B3B"/>`;
      svg += `<rect x="250" y="155" width="50" height="20" fill="#FFFEFC"/>`;
      svg += `<path d="M 380 180 L 400 120 L 425 120 L 405 180 Z" fill="#77766D"/>`;
      svg += `<polygon points="380,120 445,120 425,90 400,90" fill="#BA6956"/>`;
      svg += `<circle cx="412" cy="105" r="12" fill="#FFF2B2" opacity="0.8"/>`;
      break;

    case 'cafe':
      svg += `<rect width="600" height="240" fill="#FAF6EE"/>`;
      svg += `<rect x="0" y="0" width="600" height="100" fill="#ECE4D0"/>`;
      for (let i = 0; i < 12; i++) {
        const left = Math.max(0, (i - 0.2) * 50);
        svg += `<polygon points="${i * 50},100 ${(i + 1) * 50},100 ${(i + 0.8) * 50},140 ${left},140" fill="${i % 2 === 0 ? '#354B3B' : '#FFFEFC'}"/>`;
      }
      svg += `<ellipse cx="300" cy="190" rx="90" ry="24" fill="#E3DCCE"/>`;
      svg += `<rect x="295" y="190" width="10" height="50" fill="#77766D"/>`;
      svg += `<ellipse cx="280" cy="182" rx="14" ry="7" fill="#BA6956"/>`;
      svg += `<ellipse cx="280" cy="180" rx="12" ry="5" fill="#4B2B1B"/>`;
      svg += `<path d="M 280 172 Q 285 160, 280 150" fill="none" stroke="#BA6956" stroke-width="1.5" opacity="0.5"/>`;
      break;

    case 'library':
      svg += `<rect width="600" height="240" fill="#EAE3D2"/>`;
      svg += `<path d="M 220 200 L 220 70 C 220 30, 380 30, 380 70 L 380 200 Z" fill="#DCE5DD" stroke="#354B3B" stroke-width="4"/>`;
      svg += `<line x1="300" y1="35" x2="300" y2="200" stroke="#354B3B" stroke-width="2"/>`;
      svg += `<rect x="20" y="20" width="140" height="220" fill="#4A3B32"/>`;
      for (let y = 50; y < 220; y += 45) {
        svg += `<line x1="20" y1="${y}" x2="160" y2="${y}" stroke="#6E584B" stroke-width="4"/>`;
        for (let x = 30; x < 150; x += 16) {
          svg += `<rect x="${x}" y="${y - 30}" width="12" height="30" fill="${x % 32 === 0 ? '#BA6956' : x % 48 === 0 ? '#738451' : '#E3DCCE'}"/>`;
        }
      }
      svg += `<rect x="440" y="20" width="140" height="220" fill="#4A3B32"/>`;
      for (let y = 50; y < 220; y += 45) {
        svg += `<line x1="440" y1="${y}" x2="580" y2="${y}" stroke="#6E584B" stroke-width="4"/>`;
        for (let x = 450; x < 570; x += 16) {
          svg += `<rect x="${x}" y="${y - 30}" width="12" height="30" fill="${x % 32 === 0 ? '#738451' : x % 48 === 0 ? '#BA6956' : '#FFFEFC'}"/>`;
        }
      }
      break;

    case 'market':
      svg += `<rect width="600" height="240" fill="#F8F3E8"/>`;
      svg += `<line x1="40" y1="120" x2="560" y2="120" stroke="#77766D" stroke-width="3"/>`;
      for (let x = 80; x < 560; x += 80) {
        svg += `<line x1="${x}" y1="40" x2="${x}" y2="80" stroke="#2B2A26" stroke-width="1.5"/>`;
        svg += `<ellipse cx="${x}" cy="95" rx="16" ry="20" fill="#BA6956"/>`;
        svg += `<ellipse cx="${x}" cy="95" rx="12" ry="16" fill="#D9826F"/>`;
        svg += `<rect x="${x - 6}" y="73" width="12" height="4" fill="#2B2A26"/>`;
        svg += `<rect x="${x - 6}" y="113" width="12" height="4" fill="#2B2A26"/>`;
      }
      svg += `<rect x="40" y="160" width="520" height="80" fill="#D0C4AF"/>`;
      break;

    case 'marina':
      svg += `<rect width="600" height="120" fill="#E8EEEC"/>`;
      svg += `<rect x="0" y="120" width="600" height="120" fill="#9FB7A8"/>`;
      svg += `<polygon points="80,120 160,95 240,120" fill="#738451" opacity="0.6"/>`;
      svg += `<polygon points="340,120 420,105 480,120" fill="#738451" opacity="0.5"/>`;
      svg += `<rect x="0" y="170" width="600" height="70" fill="#7E7265"/>`;
      svg += `<rect x="120" y="145" width="22" height="35" rx="4" fill="#354B3B"/>`;
      svg += `<rect x="420" y="145" width="22" height="35" rx="4" fill="#354B3B"/>`;
      svg += `<line x1="280" y1="40" x2="280" y2="150" stroke="#2B2A26" stroke-width="2.5"/>`;
      svg += `<polygon points="280,45 330,120 280,120" fill="#FFFEFC"/>`;
      break;

    default:
      svg += `<rect width="600" height="240" fill="#EDE7DB"/>`;
      svg += `<rect x="60" y="70" width="90" height="170" fill="#C5BDB0"/>`;
      svg += `<rect x="180" y="40" width="110" height="200" fill="#354B3B"/>`;
      svg += `<rect x="320" y="90" width="80" height="150" fill="#738451"/>`;
      svg += `<rect x="430" y="60" width="100" height="180" fill="#BA6956"/>`;
      svg += `<rect x="0" y="210" width="600" height="30" fill="#DDD5C7"/>`;
      break;
  }

  svg += `</svg>`;
  return svg;
}
