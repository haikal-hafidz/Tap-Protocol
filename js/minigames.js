// TAP Protocol - Comprehensive Mini-Game Framework & Library.
// 14 distinct, fully playable mini-games across Daily Life, Creative, Social/Intellectual, and Physical/Exploration.
// Zero emoji, zero external dependencies, accessible via mouse, keyboard, and touch.
// Integrated with player skills, attributes, game time (15m-30m per session), and anti-farm daily caps.

import * as D from './data.js';
import * as R from './rules.js';

export const MINIGAMES = {
  // 1. DAILY LIFE & LIFESTYLE
  culinary_prep: {
    id: 'culinary_prep',
    title: 'Culinary Preparation',
    category: 'Daily Life',
    skill: 'cooking',
    energyCost: 10,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Select the right seasonal ingredients and complete the saute and seasoning sequence.',
    instructions: 'Follow the recipe card: pick the requested ingredients in sequence to create a gourmet meal.'
  },
  home_org: {
    id: 'home_org',
    title: 'Home Organization',
    category: 'Daily Life',
    skill: 'design',
    energyCost: 8,
    durationMinutes: 20,
    dailyCap: 3,
    desc: 'Sort household items into appropriate storage containers to maximize living harmony.',
    instructions: 'Categorize each household item (Books, Tools, Apparel) into its proper storage crate.'
  },
  grocery_shopping: {
    id: 'grocery_shopping',
    title: 'Grocery Shopping',
    category: 'Daily Life',
    skill: 'negotiation',
    energyCost: 10,
    durationMinutes: 25,
    dailyCap: 3,
    desc: 'Purchase all essential provisions from the Lantern Market while staying strictly under budget.',
    instructions: 'Choose 3 essential grocery staples whose combined cost does not exceed your budget allowance.'
  },
  coffee_crafting: {
    id: 'coffee_crafting',
    title: 'Coffee Crafting',
    category: 'Daily Life',
    skill: 'cooking',
    energyCost: 6,
    durationMinutes: 15,
    dailyCap: 3,
    desc: 'Calibrate water temperature, grind size, and extraction pour to brew an artisan roast.',
    instructions: 'Pick the optimal grind, water temperature, and pour rate matching the single-origin bean profile.'
  },

  // 2. CREATIVE & ARTISTIC
  urban_photo: {
    id: 'urban_photo',
    title: 'Urban Photography',
    category: 'Creative',
    skill: 'photography',
    energyCost: 12,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Frame harbor architecture, capture fleeting light angles, and discover street motifs.',
    instructions: 'Adjust the camera framing box onto the high-interest architectural focal point.'
  },
  graphic_design: {
    id: 'graphic_design',
    title: 'Graphic Design',
    category: 'Creative',
    skill: 'design',
    energyCost: 12,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Arrange editorial headlines, color palettes, and margin ratios for a cultural poster.',
    instructions: 'Select harmonious typography and editorial color blocks matching the client brief.'
  },
  creative_writing: {
    id: 'creative_writing',
    title: 'Creative Writing',
    category: 'Creative',
    skill: 'writing',
    energyCost: 12,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Select evocative metaphors and resolve narrative conflicts in a short harbor vignette.',
    instructions: 'Complete the literary vignette by selecting three stylistically coherent prose fragments.'
  },
  music_rhythm: {
    id: 'music_rhythm',
    title: 'Music Rhythm',
    category: 'Creative',
    skill: 'research',
    energyCost: 10,
    durationMinutes: 20,
    dailyCap: 3,
    desc: 'Synchronize rhythmic acoustic pulses to calibrate harmonic synthesizers.',
    instructions: 'Tap the rhythm beat trigger when the sound wave pulse aligns with the acoustic target marker.'
  },

  // 3. SOCIAL & INTELLECTUAL
  civic_debate: {
    id: 'civic_debate',
    title: 'Civic Debate',
    category: 'Social',
    skill: 'negotiation',
    energyCost: 12,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Formulate reasoned counter-arguments against opposing viewpoints at City Hall.',
    instructions: 'Select the most persuasive evidence-backed rebuttal to answer your debate opponent.'
  },
  trivia_challenge: {
    id: 'trivia_challenge',
    title: 'Trivia Challenge',
    category: 'Intellectual',
    skill: 'research',
    energyCost: 8,
    durationMinutes: 20,
    dailyCap: 3,
    desc: 'Answer historical, scientific, and architectural questions regarding the maritime province.',
    instructions: 'Answer 3 consecutive civic trivia questions correctly to test your local scholarship.'
  },
  social_deduction: {
    id: 'social_deduction',
    title: 'Social Deduction',
    category: 'Social',
    skill: 'negotiation',
    energyCost: 10,
    durationMinutes: 25,
    dailyCap: 3,
    desc: 'Examine witness testimonies and identify subtle behavioral inconsistencies.',
    instructions: 'Compare the three witness statements and uncover the contradictory testimony.'
  },
  memory_challenge: {
    id: 'memory_challenge',
    title: 'Memory Challenge',
    category: 'Intellectual',
    skill: 'programming',
    energyCost: 10,
    durationMinutes: 20,
    dailyCap: 3,
    desc: 'Memorize and reproduce algorithmic byte sequences and architectural blueprints.',
    instructions: 'Observe the flashed numerical sequence and reproduce it in exact order.'
  },

  // 4. PHYSICAL & EXPLORATION
  fitness_timing: {
    id: 'fitness_timing',
    title: 'Fitness Timing',
    category: 'Physical',
    skill: 'fitness',
    energyCost: 15,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Maintain pacing and interval sprints along the windy coastal marina boardwalk.',
    instructions: 'Pace your stamina meter within the green target endurance zone across 3 laps.'
  },
  business_negotiation: {
    id: 'business_negotiation',
    title: 'Business Negotiation',
    category: 'Economic',
    skill: 'negotiation',
    energyCost: 12,
    durationMinutes: 30,
    dailyCap: 3,
    desc: 'Structure wholesale terms, contract concessions, and payment escrow for local merchants.',
    instructions: 'Negotiate the supply contract by trading non-critical concessions for higher profit margins.'
  }
};

// Mini-game State Initialization
export function createMinigameSession(gameId, state) {
  const def = MINIGAMES[gameId];
  if (!def) return null;

  switch (gameId) {
    case 'culinary_prep':
      return {
        gameId,
        step: 0,
        recipe: [
          { item: 'olive_oil', name: 'Extra Virgin Olive Oil' },
          { item: 'coastal_garlic', name: 'Fresh Harbor Garlic' },
          { item: 'sea_herbs', name: 'Dried Sea Herbs' }
        ],
        choices: [
          [
            { id: 'olive_oil', name: 'Extra Virgin Olive Oil', correct: true },
            { id: 'salted_butter', name: 'Commercial Butter', correct: false },
            { id: 'tap_water', name: 'Tap Water', correct: false }
          ],
          [
            { id: 'coastal_garlic', name: 'Fresh Harbor Garlic', correct: true },
            { id: 'chili_paste', name: 'Crude Chili Paste', correct: false },
            { id: 'powdered_milk', name: 'Powdered Milk', correct: false }
          ],
          [
            { id: 'sea_herbs', name: 'Dried Sea Herbs', correct: true },
            { id: 'granulated_sugar', name: 'Granulated Sugar', correct: false },
            { id: 'table_salt', name: 'Excess Table Salt', correct: false }
          ]
        ],
        score: 0,
        completed: false
      };

    case 'home_org':
      return {
        gameId,
        round: 0,
        items: [
          { id: 'atlas', name: 'Maritime Cartography Atlas', bin: 'books' },
          { id: 'chisel', name: 'Fine Woodworking Chisel', bin: 'tools' },
          { id: 'wool_sweater', name: 'Knit Wool Cardigan', bin: 'apparel' }
        ],
        score: 0,
        completed: false
      };

    case 'grocery_shopping':
      return {
        gameId,
        budget: 25,
        targetValue: 20,
        selected: [],
        available: [
          { id: 'sourdough', name: 'Artisan Sourdough Loaf', cost: 6, nutrition: 8 },
          { id: 'smoked_mackerel', name: 'Smoked Harbor Mackerel', cost: 10, nutrition: 14 },
          { id: 'green_apples', name: 'Basket of Orchard Apples', cost: 5, nutrition: 7 },
          { id: 'imported_caviar', name: 'Imported Salted Caviar', cost: 22, nutrition: 6 }
        ],
        completed: false
      };

    case 'coffee_crafting':
      return {
        gameId,
        step: 0,
        parameters: [
          { name: 'Grind Size', options: ['Coarse French', 'Medium Drip', 'Extra Fine'], correct: 1 },
          { name: 'Water Temp', options: ['88 C Light', '93 C Optimal', '100 C Boiling'], correct: 1 },
          { name: 'Extraction Time', options: ['1m 30s Rapid', '2m 45s Balanced', '5m 00s Over'], correct: 1 }
        ],
        score: 0,
        completed: false
      };

    case 'urban_photo':
      return {
        gameId,
        round: 0,
        scenes: [
          { subject: 'Clocktower Bell', options: ['Rule of Thirds Alignment', 'Overexposed Direct Sunlight', 'Motion Blurred Panning'], correct: 0 },
          { subject: 'Harbor Fog Fishing Boat', options: ['High Key Silhouette', 'Leading Line Reflection', 'Underexposed Night Shadow'], correct: 1 },
          { subject: 'Old Brick Alleyway', options: ['Dutch Angle Horizon', 'Converging Geometric Lines', 'Flash Glare'], correct: 1 }
        ],
        score: 0,
        completed: false
      };

    case 'graphic_design':
      return {
        gameId,
        step: 0,
        prompts: [
          { question: 'Select typography pairing for a classical architectural retrospective:', choices: ['Geometric Sans with Serif Body', 'Comic Display with Script', 'Neon Monospace only'], correct: 0 },
          { question: 'Select primary color palette representing coastal sustainability:', choices: ['Fluorescent Magenta & Yellow', 'Forest Green, Deep Ocean, Warm White', 'Pure Black & Red'], correct: 1 },
          { question: 'Optimal margin hierarchy for double-page editorial spread:', choices: ['Zero Margin bleed', 'Generous 24pt Outer, 32pt Bottom Margin', 'Uniform 4pt micro-margin'], correct: 1 }
        ],
        score: 0,
        completed: false
      };

    case 'creative_writing':
      return {
        gameId,
        step: 0,
        story: [
          { prompt: 'The morning bell tolled over the harbor breakwater as the mist began to...', choices: ['dissipate like whispered secrets between the dock timbers', 'explode loudly with massive smoke', 'do nothing at all in silence'], correct: 0 },
          { prompt: 'Stepping into the archival stacks, the smell of aged vellum was...', choices: ['a comforting tactile testament to generations past', 'smelling like plastic burned yesterday', 'unnoticeable and completely absent'], correct: 0 },
          { prompt: 'Looking across the lantern-lit plaza, Pithe realized that destiny is...', choices: ['forged through consistent daily intentional choices', 'a lottery ticket found in a drain', 'just an illusion without consequence'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    case 'music_rhythm':
      return {
        gameId,
        step: 0,
        beats: [
          { pattern: 'Syncopated Bayside Waltz', rhythmChoices: ['Beat 1 (Downbeat)', 'Beat 2 (Offbeat)', 'Beat 3 (Upbeat)'], correct: 1 },
          { pattern: 'Metronome Precision Tempo', rhythmChoices: ['Early rush', 'Exact On-Beat Snap', 'Delayed lag'], correct: 1 },
          { pattern: 'Decrescendo Ambient Pulse', rhythmChoices: ['Gentle Tap at Peak Harmonic', 'Loud Slam', 'Ignored pulse'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    case 'civic_debate':
      return {
        gameId,
        round: 0,
        arguments: [
          { opponent: 'Public transit subsidies drain municipal funds without tangible returns.', counterOptions: ['Decentralized ridership data shows every $1 transit subsidy generates $3.40 in local business revenue.', 'You just hate trains and want traffic.', 'We should abolish all roads instead.'], correct: 0 },
          { opponent: 'Preserving historic buildings impedes tech corridor modern housing density.', counterOptions: ['Adaptive reuse allows historic brick facades to integrate modern energy-efficient apartments seamlessly.', 'History does not matter in 2030.', 'Nobody needs modern apartments anyway.'], correct: 0 },
          { opponent: 'Local open markets should be replaced by automated supermarket distribution hubs.', counterOptions: ['Direct farmer markets preserve regional food security, keep wealth circulating locally, and anchor civic community life.', 'Supermarkets are evil corporations.', 'People prefer buying online only.'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    case 'trivia_challenge':
      return {
        gameId,
        round: 0,
        questions: [
          { q: 'In what year was the Harbor Quarter breakwater granite wall constructed?', options: ['1912', '2015', '1888'], correct: 0 },
          { q: 'Which trade guild originally founded the Lantern Night festival?', options: ['The Maritime Cooperatives', 'The University Deans', 'The Tech Incubator'], correct: 0 },
          { q: 'What is the primary export historically handled at Pier 4?', options: ['Fine Linens and Coastal Timber', 'Crude Petroleum', 'Plastic Novelties'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    case 'social_deduction':
      return {
        gameId,
        round: 0,
        scenarios: [
          { prompt: 'Who among the three stallholders gave a contradictory timeline about the missing ledger?', statements: ['Teo: "I locked the stall cashbox at 18:00 before heading to the cafe."', 'Guest: "I saw Teo arguing with someone near the cashbox at 18:30."', 'Dani: "Teo was already sitting in the Corner Cafe drinking tea by 18:15."'], contradictory: 1 }
        ],
        score: 0,
        completed: false
      };

    case 'memory_challenge':
      return {
        gameId,
        sequence: [4, 7, 2, 9, 1],
        input: [],
        step: 0,
        score: 0,
        completed: false
      };

    case 'fitness_timing':
      return {
        gameId,
        lap: 0,
        laps: [
          { windSpeed: 'Brisk Tailwind', choices: ['Maintain Steady Aerobic Cadence', 'Exhaustive Max Sprint', 'Dead Stop Walk'], correct: 0 },
          { windSpeed: 'Heavy Harbor Headwind', choices: ['Lower Center of Gravity & Power Stride', 'Flail Arms Rapidly', 'Turn around'], correct: 0 },
          { windSpeed: 'Boardwalk Final Stretch', choices: ['Controlled Kick Acceleration', 'Collapse on Bench', 'Look at Phone'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    case 'business_negotiation':
      return {
        gameId,
        round: 0,
        offers: [
          { clause: 'Wholesale Payment Terms', options: ['Net 30 Days Escrow with 3% Early Discount', 'Pay Cash Upfront at No Discount', 'Indefinite Credit Line'], correct: 0 },
          { clause: 'Freight Logistics Liability', options: ['Shared FOB Shipping Point Insurance', 'Buyer Absorbs All Loss Risk', 'No Inspection Clause'], correct: 0 },
          { clause: 'Exclusivity Period', options: ['6-Month Renewable Performance Milestone', 'Perpetual Unilateral Monopoly', 'One-Week Void Clause'], correct: 0 }
        ],
        score: 0,
        completed: false
      };

    default:
      return null;
  }
}

// Process player action inside an active mini-game
export function stepMinigame(session, action = {}) {
  if (!session || session.completed) return { ok: false, error: 'Session already completed.' };

  switch (session.gameId) {
    case 'culinary_prep': {
      const idx = action.choiceIndex;
      const choices = session.choices[session.step];
      if (!choices || choices[idx] === undefined) return { ok: false, error: 'Invalid ingredient choice.' };
      if (choices[idx].correct) session.score++;
      session.step++;
      if (session.step >= session.choices.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'home_org': {
      const bin = action.bin;
      const item = session.items[session.round];
      if (item && item.bin === bin) session.score++;
      session.round++;
      if (session.round >= session.items.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'grocery_shopping': {
      const item = session.available[action.itemIndex];
      if (!item) return { ok: false, error: 'Item not found.' };
      if (session.selected.some((s) => s.id === item.id)) return { ok: false, error: 'Already in cart.' };
      session.selected.push(item);
      if (session.selected.length >= 3) {
        const totalCost = session.selected.reduce((sum, i) => sum + i.cost, 0);
        const totalNutr = session.selected.reduce((sum, i) => sum + i.nutrition, 0);
        if (totalCost <= session.budget && totalNutr >= session.targetValue) session.score = 3;
        else if (totalCost <= session.budget) session.score = 2;
        else session.score = 1;
        session.completed = true;
      }
      return { ok: true, session, finished: session.completed };
    }

    case 'coffee_crafting': {
      const param = session.parameters[session.step];
      if (param && action.optionIndex === param.correct) session.score++;
      session.step++;
      if (session.step >= session.parameters.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'urban_photo': {
      const scene = session.scenes[session.round];
      if (scene && action.optionIndex === scene.correct) session.score++;
      session.round++;
      if (session.round >= session.scenes.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'graphic_design': {
      const prompt = session.prompts[session.step];
      if (prompt && action.optionIndex === prompt.correct) session.score++;
      session.step++;
      if (session.step >= session.prompts.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'creative_writing': {
      const prompt = session.story[session.step];
      if (prompt && action.optionIndex === prompt.correct) session.score++;
      session.step++;
      if (session.step >= session.story.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'music_rhythm': {
      const beat = session.beats[session.step];
      if (beat && action.rhythmIndex === beat.correct) session.score++;
      session.step++;
      if (session.step >= session.beats.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'civic_debate': {
      const arg = session.arguments[session.round];
      if (arg && action.optionIndex === arg.correct) session.score++;
      session.round++;
      if (session.round >= session.arguments.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'trivia_challenge': {
      const q = session.questions[session.round];
      if (q && action.optionIndex === q.correct) session.score++;
      session.round++;
      if (session.round >= session.questions.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'social_deduction': {
      const scn = session.scenarios[session.round];
      if (scn && action.contradictoryIndex === scn.contradictory) session.score = 3;
      else session.score = 1;
      session.completed = true;
      return { ok: true, session, finished: true };
    }

    case 'memory_challenge': {
      const val = Number(action.number);
      session.input.push(val);
      if (session.sequence[session.step] === val) session.score++;
      session.step++;
      if (session.step >= session.sequence.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'fitness_timing': {
      const l = session.laps[session.lap];
      if (l && action.choiceIndex === l.correct) session.score++;
      session.lap++;
      if (session.lap >= session.laps.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    case 'business_negotiation': {
      const offer = session.offers[session.round];
      if (offer && action.optionIndex === offer.correct) session.score++;
      session.round++;
      if (session.round >= session.offers.length) session.completed = true;
      return { ok: true, session, finished: session.completed };
    }

    default:
      return { ok: false, error: 'Unknown minigame id' };
  }
}

// Complete mini-game and award rewards while checking daily caps
export function finishMinigame(state, session) {
  const def = MINIGAMES[session.gameId];
  if (!def) return { ok: false, error: 'Unknown minigame.' };

  R.ensureExpansionState(state);
  const today = R.localDateStr(new Date());
  state.minigames.dailyPlays[today] = state.minigames.dailyPlays[today] || {};
  const playedToday = state.minigames.dailyPlays[today][session.gameId] || 0;

  if (state.needs.energy < def.energyCost) {
    return { ok: false, error: `Not enough energy. Need at least ${def.energyCost}.` };
  }

  // Deduct energy & advance game time
  state.needs.energy = Math.max(0, state.needs.energy - def.energyCost);
  state.clock += def.durationMinutes;

  // Check anti-exploit cap
  let expGain = 0;
  let skillExpGain = 0;
  let moneyGain = 0;
  let capped = false;

  if (playedToday < def.dailyCap) {
    const perf = Math.max(1, session.score || 1);
    expGain = perf * 5;
    skillExpGain = perf * 4;
    moneyGain = perf * 3;

    // Apply quick_learner perk bonus if owned
    if (R.hasPerk(state, 'quick_learner')) {
      expGain = Math.round(expGain * 1.15);
      skillExpGain = Math.round(skillExpGain * 1.15);
    }

    state.character.exp += expGain;
    const sk = state.character.skills[def.skill];
    if (sk && sk.level < D.MAX_SKILL) {
      sk.exp += skillExpGain;
    }
    state.money += moneyGain;
    state.minigames.dailyPlays[today][session.gameId] = playedToday + 1;

    // Update records
    state.minigames.records[session.gameId] = Math.max(state.minigames.records[session.gameId] || 0, session.score || 0);
  } else {
    capped = true;
  }

  return {
    ok: true,
    gameId: session.gameId,
    title: def.title,
    score: session.score,
    expGain,
    skillExpGain,
    moneyGain,
    skill: def.skill,
    capped,
    message: capped
      ? `Completed ${def.title}. Daily rewarded plays reached (capped at ${def.dailyCap}/day).`
      : `Mastered ${def.title}! Earned +${expGain} EXP, +${skillExpGain} ${def.skill} EXP, and +${moneyGain} Money.`
  };
}
