// TAP Protocol - Modular SVG Avatar Generator.
// Pure vector illustration of human characters with customizable attributes.
// No external images, no fonts, no emojis. High-contrast, clean editorial illustration.

export const AVATAR_OPTIONS = {
  skinTone: [
    { id: 'fair', label: 'Porcelain Fair', hex: '#F9DFD1', shadow: '#E2BCAB' },
    { id: 'warm_beige', label: 'Warm Beige', hex: '#EEC3A2', shadow: '#D0A07E' },
    { id: 'olive', label: 'Golden Olive', hex: '#D7A779', shadow: '#B98555' },
    { id: 'tan', label: 'Warm Honey', hex: '#BA8053', shadow: '#965C31' },
    { id: 'rich_brown', label: 'Rich Chestnut', hex: '#875134', shadow: '#683B22' },
    { id: 'deep_espresso', label: 'Deep Espresso', hex: '#4B2B1B', shadow: '#351C0F' }
  ],
  faceShape: [
    { id: 'oval', label: 'Classic Oval', path: 'M 70 70 C 70 125, 80 145, 100 145 C 120 145, 130 125, 130 70 C 130 45, 70 45, 70 70 Z' },
    { id: 'square', label: 'Defined Square', path: 'M 72 70 C 72 120, 78 142, 100 142 C 122 142, 128 120, 128 70 C 128 45, 72 45, 72 70 Z' },
    { id: 'heart', label: 'Tapered Heart', path: 'M 68 65 C 68 115, 85 146, 100 146 C 115 146, 132 115, 132 65 C 132 45, 68 45, 68 65 Z' },
    { id: 'round', label: 'Soft Round', path: 'M 68 72 C 68 128, 80 144, 100 144 C 120 144, 132 128, 132 72 C 132 45, 68 45, 68 72 Z' }
  ],
  hairstyle: [
    { id: 'short_crop', label: 'Textured Crop' },
    { id: 'side_part', label: 'Editorial Side Part' },
    { id: 'curls', label: 'Natural Curls' },
    { id: 'bob', label: 'Sharp Bob' },
    { id: 'long_waves', label: 'Long Waves' },
    { id: 'bun', label: 'Topknot Bun' },
    { id: 'buzz', label: 'Clean Buzzcut' }
  ],
  hairColor: [
    { id: 'espresso', label: 'Midnight Espresso', hex: '#231B19', highlight: '#3C2E2A' },
    { id: 'chestnut', label: 'Chestnut Brown', hex: '#4E3120', highlight: '#734B33' },
    { id: 'amber', label: 'Warm Amber', hex: '#944D25', highlight: '#BF6C3B' },
    { id: 'honey_blonde', label: 'Honey Wheat', hex: '#CBA05E', highlight: '#E5C082' },
    { id: 'silver', label: 'Architect Silver', hex: '#8C9297', highlight: '#B8BFC4' },
    { id: 'terracotta', label: 'Editorial Terra', hex: '#A34835', highlight: '#CB6750' }
  ],
  eyes: [
    { id: 'focused', label: 'Attentive', path: 'focused' },
    { id: 'almond', label: 'Almond Serene', path: 'almond' },
    { id: 'wide', label: 'Curious Open', path: 'wide' }
  ],
  eyebrows: [
    { id: 'arched', label: 'Natural Arch' },
    { id: 'straight', label: 'Modern Straight' },
    { id: 'bold', label: 'Architect Bold' }
  ],
  nose: [
    { id: 'straight', label: 'Straight Minimal' },
    { id: 'button', label: 'Soft Tip' },
    { id: 'prominent', label: 'Defined Bridge' }
  ],
  mouth: [
    { id: 'neutral', label: 'Calm Neutral' },
    { id: 'smile', label: 'Gentle Smile' },
    { id: 'confident', label: 'Confident Smirk' }
  ],
  clothing: [
    { id: 'turtleneck', label: 'Merino Turtleneck', color: '#354B3B', accent: '#26372B' },
    { id: 'blazer', label: 'Tailored Linen Blazer', color: '#444A54', accent: '#BA6956' },
    { id: 'utility_jacket', label: 'Workwear Utility Overshirt', color: '#738451', accent: '#536237' },
    { id: 'casual_tee', label: 'Organic Cotton Crew', color: '#E3DCCE', accent: '#77766D' },
    { id: 'studio_smock', label: 'Atelier Smock', color: '#BA6956', accent: '#8F4535' }
  ],
  accessories: [
    { id: 'none', label: 'None' },
    { id: 'round_glasses', label: 'Round Wire Frames' },
    { id: 'square_frames', label: 'Acetate Square Frames' },
    { id: 'earrings', label: 'Minimalist Brass Hoops' },
    { id: 'headphones', label: 'Studio Monitor Headphones' }
  ],
  bodyType: [
    { id: 'lean', label: 'Slender Frame', shoulderWidth: 64 },
    { id: 'medium', label: 'Balanced Frame', shoulderWidth: 74 },
    { id: 'broad', label: 'Athletic Frame', shoulderWidth: 84 }
  ]
};

export const DEFAULT_AVATAR = {
  skinTone: 'warm_beige',
  faceShape: 'oval',
  hairstyle: 'side_part',
  hairColor: 'espresso',
  eyes: 'focused',
  eyebrows: 'arched',
  nose: 'straight',
  mouth: 'smile',
  clothing: 'turtleneck',
  accessories: 'round_glasses',
  bodyType: 'medium'
};

export function sanitizeAvatar(raw = {}) {
  const av = {};
  for (const key of Object.keys(AVATAR_OPTIONS)) {
    const list = AVATAR_OPTIONS[key];
    const item = list.find((opt) => opt.id === raw[key]);
    av[key] = item ? item.id : DEFAULT_AVATAR[key];
  }
  return av;
}

export function getRandomAvatar(seedNumber = null) {
  const rand = seedNumber !== null
    ? ((s) => () => { s = Math.imul(s ^ (s >>> 15), s | 1); return (((s ^ (s >>> 7)) >>> 0) % 1000) / 1000; })(seedNumber)
    : Math.random;

  const res = {};
  for (const [k, list] of Object.entries(AVATAR_OPTIONS)) {
    const idx = Math.floor(rand() * list.length);
    res[k] = list[idx].id;
  }
  return res;
}

export function renderAvatarSvg(rawOptions = {}, size = 120, viewBox = '0 0 200 200') {
  const opt = sanitizeAvatar(rawOptions);
  const skin = AVATAR_OPTIONS.skinTone.find((s) => s.id === opt.skinTone) || AVATAR_OPTIONS.skinTone[1];
  const face = AVATAR_OPTIONS.faceShape.find((f) => f.id === opt.faceShape) || AVATAR_OPTIONS.faceShape[0];
  const hairC = AVATAR_OPTIONS.hairColor.find((h) => h.id === opt.hairColor) || AVATAR_OPTIONS.hairColor[0];
  const cloth = AVATAR_OPTIONS.clothing.find((c) => c.id === opt.clothing) || AVATAR_OPTIONS.clothing[0];
  const body = AVATAR_OPTIONS.bodyType.find((b) => b.id === opt.bodyType) || AVATAR_OPTIONS.bodyType[1];

  const sw = body.shoulderWidth;

  // Background circle / portrait frame
  let svg = `<svg viewBox="${viewBox}" width="${size}" height="${size}" class="avatar-svg" role="img" aria-label="Character portrait">`;
  svg += `<rect width="200" height="200" rx="24" fill="#F4F0E6"/>`;
  svg += `<circle cx="100" cy="100" r="92" fill="#FFFEFC" stroke="#E3DCCE" stroke-width="2"/>`;

  // Neck and Shoulders (Clothing)
  svg += `<path d="M 88 118 L 88 152 L 112 152 L 112 118 Z" fill="${skin.shadow}"/>`;
  svg += `<path d="M 91 120 L 91 152 L 109 152 L 109 120 Z" fill="${skin.hex}"/>`;

  // Torso / Clothing
  if (opt.clothing === 'turtleneck') {
    svg += `<path d="M ${100 - sw} 200 C ${100 - sw} 165, 84 148, 88 144 L 112 144 C 116 148, ${100 + sw} 165, ${100 + sw} 200 Z" fill="${cloth.color}"/>`;
    svg += `<rect x="86" y="136" width="28" height="15" rx="4" fill="${cloth.accent}"/>`;
    svg += `<line x1="88" y1="141" x2="112" y2="141" stroke="${cloth.color}" stroke-width="1"/>`;
  } else if (opt.clothing === 'blazer') {
    svg += `<path d="M ${100 - sw} 200 C ${100 - sw} 160, 80 152, 85 146 L 115 146 C 120 152, ${100 + sw} 160, ${100 + sw} 200 Z" fill="${cloth.color}"/>`;
    svg += `<polygon points="100,185 86,146 114,146" fill="#FFFEFC"/>`;
    svg += `<polygon points="100,188 93,146 107,146" fill="${cloth.accent}"/>`;
    svg += `<path d="M 85 146 L 96 178 L 82 178 Z" fill="${cloth.accent}"/>`;
    svg += `<path d="M 115 146 L 104 178 L 118 178 Z" fill="${cloth.accent}"/>`;
  } else if (opt.clothing === 'utility_jacket') {
    svg += `<path d="M ${100 - sw} 200 C ${100 - sw} 160, 82 148, 87 145 L 113 145 C 118 148, ${100 + sw} 160, ${100 + sw} 200 Z" fill="${cloth.color}"/>`;
    svg += `<line x1="100" y1="145" x2="100" y2="200" stroke="${cloth.accent}" stroke-width="2.5"/>`;
    svg += `<rect x="${94 - sw * 0.4}" y="165" width="16" height="20" rx="2" fill="${cloth.accent}"/>`;
    svg += `<rect x="${90 + sw * 0.4}" y="165" width="16" height="20" rx="2" fill="${cloth.accent}"/>`;
  } else if (opt.clothing === 'casual_tee') {
    svg += `<path d="M ${100 - sw} 200 C ${100 - sw} 165, 84 150, 88 146 L 112 146 C 116 150, ${100 + sw} 165, ${100 + sw} 200 Z" fill="${cloth.color}"/>`;
    svg += `<path d="M 88 146 C 92 158, 108 158, 112 146 Z" fill="${skin.hex}"/>`;
    svg += `<path d="M 88 146 C 92 158, 108 158, 112 146" fill="none" stroke="${cloth.accent}" stroke-width="2"/>`;
  } else {
    // studio_smock
    svg += `<path d="M ${100 - sw} 200 C ${100 - sw} 160, 80 146, 86 142 L 114 142 C 120 146, ${100 + sw} 160, ${100 + sw} 200 Z" fill="${cloth.color}"/>`;
    svg += `<circle cx="100" cy="170" r="3" fill="${cloth.accent}"/>`;
    svg += `<circle cx="100" cy="185" r="3" fill="${cloth.accent}"/>`;
  }

  // Hair Back Layer (for long hair styles)
  if (opt.hairstyle === 'long_waves') {
    svg += `<path d="M 62 70 C 58 110, 52 145, 62 175 C 68 155, 72 130, 72 90 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 138 70 C 142 110, 148 145, 138 175 C 132 155, 128 130, 128 90 Z" fill="${hairC.hex}"/>`;
  } else if (opt.hairstyle === 'bun') {
    svg += `<circle cx="100" cy="36" r="18" fill="${hairC.hex}"/>`;
    svg += `<circle cx="100" cy="36" r="14" fill="${hairC.highlight}"/>`;
  }

  // Ears
  svg += `<ellipse cx="69" cy="94" rx="6" ry="10" fill="${skin.shadow}"/>`;
  svg += `<ellipse cx="70" cy="94" rx="4" ry="7" fill="${skin.hex}"/>`;
  svg += `<ellipse cx="131" cy="94" rx="6" ry="10" fill="${skin.shadow}"/>`;
  svg += `<ellipse cx="130" cy="94" rx="4" ry="7" fill="${skin.hex}"/>`;

  // Face Base
  svg += `<path d="${face.path}" fill="${skin.hex}"/>`;
  svg += `<path d="M 90 135 C 95 142, 105 142, 110 135 Z" fill="${skin.shadow}" opacity="0.4"/>`;

  // Eyebrows
  if (opt.eyebrows === 'arched') {
    svg += `<path d="M 76 80 Q 86 75, 93 79" fill="none" stroke="${hairC.hex}" stroke-width="2.5" stroke-linecap="round"/>`;
    svg += `<path d="M 107 79 Q 114 75, 124 80" fill="none" stroke="${hairC.hex}" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (opt.eyebrows === 'straight') {
    svg += `<path d="M 76 80 L 93 80" fill="none" stroke="${hairC.hex}" stroke-width="2.5" stroke-linecap="round"/>`;
    svg += `<path d="M 107 80 L 124 80" fill="none" stroke="${hairC.hex}" stroke-width="2.5" stroke-linecap="round"/>`;
  } else {
    // bold
    svg += `<path d="M 75 79 Q 85 74, 93 78" fill="none" stroke="${hairC.hex}" stroke-width="3.8" stroke-linecap="round"/>`;
    svg += `<path d="M 107 78 Q 115 74, 125 79" fill="none" stroke="${hairC.hex}" stroke-width="3.8" stroke-linecap="round"/>`;
  }

  // Eyes
  if (opt.eyes === 'focused') {
    svg += `<ellipse cx="84" cy="89" rx="5" ry="3.5" fill="#2B2A26"/>`;
    svg += `<circle cx="85" cy="88" r="1.2" fill="#FFFFFF"/>`;
    svg += `<path d="M 78 88 Q 84 84, 90 88" fill="none" stroke="#2B2A26" stroke-width="1.8" stroke-linecap="round"/>`;
    svg += `<ellipse cx="116" cy="89" rx="5" ry="3.5" fill="#2B2A26"/>`;
    svg += `<circle cx="117" cy="88" r="1.2" fill="#FFFFFF"/>`;
    svg += `<path d="M 110 88 Q 116 84, 122 88" fill="none" stroke="#2B2A26" stroke-width="1.8" stroke-linecap="round"/>`;
  } else if (opt.eyes === 'almond') {
    svg += `<path d="M 78 90 Q 84 84, 91 89 Q 84 94, 78 90 Z" fill="#2B2A26"/>`;
    svg += `<circle cx="85" cy="89" r="1.2" fill="#FFFFFF"/>`;
    svg += `<path d="M 109 89 Q 116 84, 122 90 Q 116 94, 109 89 Z" fill="#2B2A26"/>`;
    svg += `<circle cx="115" cy="89" r="1.2" fill="#FFFFFF"/>`;
  } else {
    // wide
    svg += `<circle cx="84" cy="89" r="4.5" fill="#2B2A26"/>`;
    svg += `<circle cx="85" cy="87.5" r="1.5" fill="#FFFFFF"/>`;
    svg += `<path d="M 78 87 Q 84 83, 90 87" fill="none" stroke="#2B2A26" stroke-width="1.5"/>`;
    svg += `<circle cx="116" cy="89" r="4.5" fill="#2B2A26"/>`;
    svg += `<circle cx="117" cy="87.5" r="1.5" fill="#FFFFFF"/>`;
    svg += `<path d="M 110 87 Q 116 83, 122 87" fill="none" stroke="#2B2A26" stroke-width="1.5"/>`;
  }

  // Nose
  if (opt.nose === 'straight') {
    svg += `<path d="M 100 84 L 99 104 L 104 104" fill="none" stroke="${skin.shadow}" stroke-width="2" stroke-linecap="round"/>`;
  } else if (opt.nose === 'button') {
    svg += `<circle cx="100" cy="103" r="3" fill="${skin.shadow}"/>`;
  } else {
    // prominent
    svg += `<path d="M 99 82 L 97 103 L 104 105" fill="none" stroke="${skin.shadow}" stroke-width="2.5" stroke-linecap="round"/>`;
    svg += `<circle cx="95" cy="105" r="1.5" fill="${skin.shadow}"/>`;
  }

  // Mouth
  if (opt.mouth === 'smile') {
    svg += `<path d="M 91 119 Q 100 128, 109 119" fill="none" stroke="#9C4E3D" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (opt.mouth === 'confident') {
    svg += `<path d="M 92 121 Q 101 123, 110 117" fill="none" stroke="#9C4E3D" stroke-width="2.5" stroke-linecap="round"/>`;
  } else {
    // neutral
    svg += `<line x1="93" y1="120" x2="107" y2="120" stroke="#9C4E3D" stroke-width="2.2" stroke-linecap="round"/>`;
  }

  // Hairstyle Front Layer
  if (opt.hairstyle === 'short_crop') {
    svg += `<path d="M 68 68 C 68 36, 132 36, 132 68 C 125 50, 105 48, 100 48 C 95 48, 75 50, 68 68 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 72 58 Q 85 46, 100 46 Q 115 46, 128 58" fill="none" stroke="${hairC.highlight}" stroke-width="2.5"/>`;
  } else if (opt.hairstyle === 'side_part') {
    svg += `<path d="M 66 70 C 66 38, 134 38, 134 70 C 130 52, 110 46, 92 46 C 80 46, 70 54, 66 70 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 75 52 C 90 44, 115 46, 130 65 C 122 56, 102 54, 85 54 Z" fill="${hairC.highlight}"/>`;
  } else if (opt.hairstyle === 'curls') {
    svg += `<path d="M 64 74 C 58 55, 68 36, 100 36 C 132 36, 142 55, 136 74 C 130 58, 120 50, 100 50 C 80 50, 70 58, 64 74 Z" fill="${hairC.hex}"/>`;
    svg += `<circle cx="75" cy="48" r="9" fill="${hairC.hex}"/>`;
    svg += `<circle cx="92" cy="40" r="10" fill="${hairC.highlight}"/>`;
    svg += `<circle cx="108" cy="40" r="10" fill="${hairC.hex}"/>`;
    svg += `<circle cx="125" cy="48" r="9" fill="${hairC.highlight}"/>`;
  } else if (opt.hairstyle === 'bob') {
    svg += `<path d="M 64 88 C 60 50, 70 38, 100 38 C 130 38, 140 50, 136 88 C 130 64, 120 54, 100 54 C 80 54, 70 64, 64 88 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 66 65 L 64 102 L 72 90 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 134 65 L 136 102 L 128 90 Z" fill="${hairC.hex}"/>`;
  } else if (opt.hairstyle === 'long_waves') {
    svg += `<path d="M 66 72 C 64 45, 75 40, 100 40 C 125 40, 136 45, 134 72 C 128 55, 115 50, 100 50 C 85 50, 72 55, 66 72 Z" fill="${hairC.hex}"/>`;
    svg += `<path d="M 80 48 Q 95 44, 115 48" fill="none" stroke="${hairC.highlight}" stroke-width="2"/>`;
  } else if (opt.hairstyle === 'bun') {
    svg += `<path d="M 68 70 C 68 45, 132 45, 132 70 C 125 55, 112 50, 100 50 C 88 50, 75 55, 68 70 Z" fill="${hairC.hex}"/>`;
  } else {
    // buzz
    svg += `<path d="M 68 68 C 68 44, 132 44, 132 68 C 128 50, 115 46, 100 46 C 85 46, 72 50, 68 68 Z" fill="${hairC.hex}" opacity="0.6"/>`;
  }

  // Accessories
  if (opt.accessories === 'round_glasses') {
    svg += `<circle cx="84" cy="89" r="11" fill="none" stroke="#2B2A26" stroke-width="2"/>`;
    svg += `<circle cx="116" cy="89" r="11" fill="none" stroke="#2B2A26" stroke-width="2"/>`;
    svg += `<line x1="95" y1="89" x2="105" y2="89" stroke="#2B2A26" stroke-width="2"/>`;
    svg += `<line x1="73" y1="88" x2="69" y2="86" stroke="#2B2A26" stroke-width="1.8"/>`;
    svg += `<line x1="127" y1="88" x2="131" y2="86" stroke="#2B2A26" stroke-width="1.8"/>`;
  } else if (opt.accessories === 'square_frames') {
    svg += `<rect x="73" y="79" width="22" height="19" rx="3" fill="none" stroke="#354B3B" stroke-width="2.5"/>`;
    svg += `<rect x="105" y="79" width="22" height="19" rx="3" fill="none" stroke="#354B3B" stroke-width="2.5"/>`;
    svg += `<line x1="95" y1="87" x2="105" y2="87" stroke="#354B3B" stroke-width="2.5"/>`;
  } else if (opt.accessories === 'earrings') {
    svg += `<circle cx="68" cy="103" r="3.5" fill="none" stroke="#BA6956" stroke-width="1.8"/>`;
    svg += `<circle cx="132" cy="103" r="3.5" fill="none" stroke="#BA6956" stroke-width="1.8"/>`;
  } else if (opt.accessories === 'headphones') {
    svg += `<path d="M 62 90 C 62 45, 138 45, 138 90" fill="none" stroke="#354B3B" stroke-width="4.5" stroke-linecap="round"/>`;
    svg += `<rect x="58" y="86" width="9" height="18" rx="4" fill="#BA6956"/>`;
    svg += `<rect x="133" y="86" width="9" height="18" rx="4" fill="#BA6956"/>`;
  }

  svg += `</svg>`;
  return svg;
}
