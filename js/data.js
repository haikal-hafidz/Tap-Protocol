// TAP Protocol - static game data. No logic that touches the DOM or storage lives here.

export const SAVE_VERSION = 1;
export const START_UTC = Date.UTC(2030, 2, 4, 7, 0, 0); // Monday 4 March 2030, 07:00
export const MAX_LOG = 400;
export const MAX_ATTR = 10;
export const MAX_SKILL = 10;
export const QUEST_ID = 'menu';

// Real-life Tracker rewards. A completion of a Tracker goal that the player linked to the RPG (with real-life rewards
// enabled) pays this much, through the normal EXP and skill rules. dailyCap is the most rewarded completions per real day.
export const TRACKER_REWARD = { exp: 6, skillExp: 4, dailyCap: 3 };

export const ATTR_GROUPS = ['Physical', 'Mental', 'Social', 'Practical'];

export const ATTRIBUTES = [
  { id: 'strength', name: 'Strength', group: 'Physical', desc: 'Raw physical power.' },
  { id: 'agility', name: 'Agility', group: 'Physical', desc: 'Speed, balance and reflexes.' },
  { id: 'endurance', name: 'Endurance', group: 'Physical', desc: 'Stamina and resistance to strain.' },
  { id: 'intelligence', name: 'Intelligence', group: 'Mental', desc: 'Reasoning, memory and capacity to study.' },
  { id: 'perception', name: 'Perception', group: 'Mental', desc: 'Noticing details and reading situations.' },
  { id: 'willpower', name: 'Willpower', group: 'Mental', desc: 'Focus and the ability to keep going.' },
  { id: 'communication', name: 'Communication', group: 'Social', desc: 'Expressing yourself clearly.' },
  { id: 'empathy', name: 'Empathy', group: 'Social', desc: 'Understanding what other people feel.' },
  { id: 'influence', name: 'Influence', group: 'Social', desc: 'Persuading and leading others.' },
  { id: 'creativity', name: 'Creativity', group: 'Practical', desc: 'Making new things and ideas.' },
  { id: 'management', name: 'Management', group: 'Practical', desc: 'Planning, organising and handling resources.' },
  { id: 'adaptability', name: 'Adaptability', group: 'Practical', desc: 'Coping with change and the unfamiliar.' }
];

// Skills are learned abilities. Each one feeds training progress into one attribute.
export const SKILLS = [
  { id: 'writing', name: 'Writing', attr: 'creativity', desc: 'Turning thoughts into clear, readable text.' },
  { id: 'research', name: 'Research', attr: 'intelligence', desc: 'Finding, reading and organising information.' },
  { id: 'programming', name: 'Programming', attr: 'intelligence', desc: 'Writing and reasoning about code.' },
  { id: 'design', name: 'Design', attr: 'creativity', desc: 'Shaping how things look and work.' },
  { id: 'cooking', name: 'Cooking', attr: 'adaptability', desc: 'Turning plain ingredients into meals.' },
  { id: 'negotiation', name: 'Negotiation', attr: 'influence', desc: 'Reaching agreements on better terms.' },
  { id: 'conversation', name: 'Conversation', attr: 'communication', desc: 'Keeping a dialogue going with strangers.' },
  { id: 'observation', name: 'Observation', attr: 'perception', desc: 'Noticing what others walk past.' },
  { id: 'fitness', name: 'Fitness', attr: 'endurance', desc: 'Conditioning the body for effort.' }
];

// Every attribute starts at 3. Backgrounds add 6 points in total, so no background is strictly better.
export const BACKGROUNDS = [
  {
    id: 'scholar', name: 'The Scholar',
    desc: 'Years of reading and note-taking. Quick with ideas, short on cash.',
    attrs: { intelligence: 3, perception: 1, willpower: 2 }, skills: { research: 1 }, money: 40, items: {},
    circumstance: 'You arrive with a bag of borrowed notes and just enough money for a few weeks.'
  },
  {
    id: 'creator', name: 'The Creator',
    desc: 'Drawn to making things. Starts with a notebook already half full.',
    attrs: { creativity: 3, empathy: 1, adaptability: 2 }, skills: { writing: 1 }, money: 35, items: { notebook: 1 },
    circumstance: 'Your pocket notebook is already full of half-finished lines. Money is tight.'
  },
  {
    id: 'professional', name: 'The Professional',
    desc: 'Used to schedules, meetings and getting things delivered.',
    attrs: { management: 3, communication: 2, willpower: 1 }, skills: { negotiation: 1 }, money: 55, items: {},
    circumstance: 'You left a steady job behind. The savings will last a little while.'
  },
  {
    id: 'drifter', name: 'The Drifter',
    desc: 'Has lived in too many places. Tough and adaptable, nearly broke.',
    attrs: { adaptability: 3, agility: 1, endurance: 2 }, skills: { observation: 1 }, money: 20, items: { bread: 2 },
    circumstance: 'Everything you own fits in one bag, along with two bread rolls from the last stop.'
  },
  {
    id: 'entrepreneur', name: 'The Entrepreneur',
    desc: 'Sees opportunity in everything and talks to anyone.',
    attrs: { influence: 2, management: 2, communication: 1, adaptability: 1 }, skills: { conversation: 1 }, money: 50, items: {},
    circumstance: 'A failed venture left you with a little capital and a lot of lessons.'
  },
  {
    id: 'competitor', name: 'The Competitor',
    desc: 'Trained the body hard. Disciplined, less polished socially.',
    attrs: { strength: 2, endurance: 2, agility: 1, willpower: 1 }, skills: { fitness: 1 }, money: 30, items: {},
    circumstance: 'Your old training routine gave you stamina, but not a plan for what comes next.'
  }
];

// Traits shape suggestions and narration. They never lock the player into a behaviour.
export const TRAITS = [
  { id: 'curious', name: 'Curious', desc: 'Pulled toward the unfamiliar.', favored: ['explore', 'study'],
    flavor: { explore: 'Your curiosity picks out small details other people walk past.', study: 'You follow one question into three more, and enjoy it.', talk: 'You ask one question more than politeness requires.' } },
  { id: 'ambitious', name: 'Ambitious', desc: 'Always measuring the next step up.', favored: ['shift', 'write'],
    flavor: { shift: 'You treat the shift as practice for something larger.', write: 'Every line feels like it has to count toward something.', talk: 'You note who here might be useful later.' } },
  { id: 'chaotic', name: 'Chaotic', desc: 'Follows impulse and improvises.', favored: ['explore', 'exercise'],
    flavor: { explore: 'You take the turn you did not plan to take.', exercise: 'You change the route halfway, just because.', talk: 'The conversation wanders, and so do you.' } },
  { id: 'independent', name: 'Independent', desc: 'Prefers to work things out alone.', favored: ['write', 'practice_programming'],
    flavor: { write: 'Alone with the page is exactly where you want to be.', practice_programming: 'You solve it your own way, even if it is slower.', talk: 'You say what you need to, and no more.' } },
  { id: 'social', name: 'Social', desc: 'Energised by other people.', favored: ['talk', 'eat_meal'],
    flavor: { talk: 'Talking comes easily, and people seem to feel it.', eat_meal: 'You look around for a familiar face before you sit down.' } },
  { id: 'analytical', name: 'Analytical', desc: 'Breaks problems into parts.', favored: ['study', 'practice_programming'],
    flavor: { study: 'You build a small outline before you read anything.', practice_programming: 'You break the problem down before typing a line.', talk: 'You listen for what is not being said.' } }
];

export const LOCATIONS = {
  home: {
    id: 'home', name: 'Rented Room',
    desc: 'A narrow room above a laundry. A desk, a camp bed, a kettle, a window over the lane.',
    open: null
  },
  library: {
    id: 'library', name: 'Harbor Public Library',
    desc: 'Tall shelves, green lamps and a reading hall that smells of paper and floor polish.',
    open: { days: [1, 2, 3, 4, 5, 6], from: 9, to: 17, label: 'Mon-Sat 09:00-17:00' }
  },
  market: {
    id: 'market', name: 'Lantern Market',
    desc: 'A covered market of stalls and paper lanterns. Saturday evening is Lantern Night.',
    open: { days: [0, 1, 2, 3, 4, 5, 6], from: 7, to: 22, label: 'Daily 07:00-22:00' }
  },
  cafe: {
    id: 'cafe', name: 'Corner Cafe',
    desc: 'Six tables, a loud espresso machine and a chalkboard where the menu used to be.',
    open: { days: [0, 1, 2, 3, 4, 5, 6], from: 10, to: 20, label: 'Daily 10:00-20:00' }
  }
};

// Walking minutes between locations (symmetric). Each key MUST list the two location ids in alphabetical order,
// because travelMinutes() sorts the pair before looking it up.
export const TRAVEL = {
  'home|library': 20, 'home|market': 15, 'cafe|home': 10,
  'library|market': 25, 'cafe|library': 10, 'cafe|market': 10
};

export function travelMinutes(a, b) {
  if (a === b) return 0;
  return TRAVEL[[a, b].sort().join('|')];
}

export const ITEMS = {
  bread: { name: 'Bread Roll', type: 'food', price: 4, sell: 2, satiety: 25, desc: 'Plain and filling. Eating it restores 25 satiety.' },
  rice_bag: { name: 'Bag of Rice', type: 'ingredient', price: 6, sell: 3, desc: 'Cook it at home for a proper meal (satiety +50). Trains Cooking.' },
  notebook: { name: 'Pocket Notebook', type: 'tool', price: 15, sell: 7, desc: 'While you carry it, Writing sessions train Writing 25 percent faster.' },
  tonic: { name: 'Bitter Tonic', type: 'consumable', price: 14, sell: 6, energy: 30, satiety: -10, desc: 'Restores 30 energy but dulls the appetite (satiety -10).' },
  library_card: { name: 'Library Card', type: 'tool', price: 0, sell: 0, unique: true, desc: 'Study sessions at the library train Research 20 percent faster.' },
  stamp_card: { name: 'Regulars Stamp Card', type: 'tool', price: 0, sell: 0, unique: true, desc: 'Meals at the Corner Cafe cost 3 less.' }
};

export const MARKET_STOCK = ['bread', 'rice_bag', 'notebook', 'tonic'];

// Activities. Rules are explicit: duration, energy cost, rewards, bonuses and limits.
// energy: change applied to the Energy need (negative = cost).
export const ACTIVITIES = {
  study: {
    name: 'Study', where: ['library', 'home'], minutes: 120, energy: -14,
    skill: 'research', skillExp: 14, exp: 10, locMult: { home: 0.7 },
    bonuses: [{ item: 'library_card', mult: 1.2, at: 'library' }],
    desc: 'Read, take notes and test yourself. Less effective at home than in the library.',
    story: { library: 'You settle under a green lamp and work through a stack of books until the words stop sliding.', home: 'You clear the desk and work through your notes by the window.' }
  },
  write: {
    name: 'Write', where: ['home', 'cafe', 'library'], minutes: 90, energy: -12,
    skill: 'writing', skillExp: 14, exp: 9,
    bonuses: [{ item: 'notebook', mult: 1.25 }],
    desc: 'Draft something. Counts toward the cafe commission once you have accepted it.',
    story: { default: 'You fill pages, cross things out and keep what survives.' }
  },
  practice_programming: {
    name: 'Practice programming', where: ['home'], minutes: 90, energy: -12,
    skill: 'programming', skillExp: 12, exp: 8,
    desc: 'Work through small exercises on paper and in your head.',
    story: { default: 'You work through exercises until the logic clicks into place.' }
  },
  practice_design: {
    name: 'Practice design', where: ['home'], minutes: 90, energy: -12,
    skill: 'design', skillExp: 12, exp: 8,
    desc: 'Sketch layouts and study what makes them readable.',
    story: { default: 'You sketch the same page four ways and learn why only one works.' }
  },
  exercise: {
    name: 'Exercise', where: ['home', 'market'], minutes: 45, energy: -16,
    skill: 'fitness', skillExp: 10, exp: 6,
    desc: 'A hard routine. Tiring, but it conditions the body.',
    story: { default: 'You push through a routine until your lungs burn and your head clears.' }
  },
  cook: {
    name: 'Cook a meal', where: ['home'], minutes: 45, energy: -4, satiety: 50, consume: 'rice_bag',
    skill: 'cooking', skillExp: 12, exp: 6,
    desc: 'Uses one Bag of Rice. Restores 50 satiety.',
    story: { default: 'You rinse the rice, watch the pot and eat while it is still too hot.' }
  },
  explore: {
    name: 'Explore', where: ['home', 'library', 'market', 'cafe'], minutes: 60, energy: -8,
    skill: 'observation', skillExp: 10, exp: 6, variable: true,
    desc: 'Look around. Outcomes vary. A place stops yielding anything after two outings per day.',
    story: { default: '' }
  },
  eat_meal: {
    name: 'Order a meal', where: ['cafe'], minutes: 25, energy: 2, satiety: 45, cost: 12,
    desc: 'A hot plate at the counter. Costs 12 money. Restores 45 satiety.',
    story: { default: 'You eat at the counter while the espresso machine screams behind you.' }
  },
  shift: {
    name: 'Work a shift', where: ['cafe'], minutes: 240, energy: -26, pay: 30, dailyLimit: 1, needsNpc: 'dani',
    skill: 'conversation', skillExp: 8, exp: 12, startHours: [10, 16],
    desc: 'Clear tables and take orders for Dani. Pays 30 money. Once per day. Start between 10:00 and 16:00.',
    story: { default: 'You carry plates, wipe tables and learn the names of the regulars.' }
  },
  rest: {
    name: 'Rest', where: ['home', 'library', 'market', 'cafe'], minutes: 30, energy: 7,
    desc: 'Sit quietly for half an hour. Restores 7 energy.',
    story: { default: 'You sit still and let your head empty out.' }
  },
  nap: {
    name: 'Nap', where: ['home'], minutes: 60, energy: 20,
    desc: 'An hour on the camp bed. Restores 20 energy.',
    story: { default: 'You sleep lightly and wake up with a crease on your cheek.' }
  },
  sleep: {
    name: 'Sleep', where: ['home'], minutes: 480, energy: 80,
    desc: 'Eight hours of proper sleep. Restores 80 energy. You wake up hungrier.',
    story: { default: 'You sleep through the sounds of the lane and wake with the light in the window.' }
  }
};

export const NPCS = {
  mira: {
    id: 'mira', name: 'Mira', role: 'Librarian',
    desc: 'A tall woman with a silver pencil behind one ear. Speaks quietly, misses nothing.',
    schedule: [{ days: [1, 2, 3, 4, 5, 6], from: 9, to: 17, loc: 'library' }],
    topics: [
      { id: 'intro', label: 'Introduce yourself', once: true,
        text: ['"New in the quarter?" Mira studies you over her glasses. "Quiet voices in here. Questions are welcome."'],
        reward: { rel: 5, skill: 'conversation', skillExp: 8, exp: 4 } },
      { id: 'research', label: 'Ask how to research properly', once: true,
        text: ['"Start with what you want to know, not what you want to find," Mira says. "Write the question first. Then go looking."'],
        reward: { rel: 2, skill: 'research', skillExp: 8, exp: 4 } },
      { id: 'card', label: 'Ask about a library card', once: true, needsRel: 5,
        needsRelReason: 'Mira does not know you well enough yet. Introduce yourself first.',
        text: ['Mira slides a card across the desk. "Do not lose it. I will know."'],
        reward: { rel: 3, item: 'library_card', exp: 3 } }
    ]
  },
  teo: {
    id: 'teo', name: 'Teo', role: 'Market vendor',
    desc: 'A broad man with flour on his sleeves who sells almost everything and remembers every price.',
    schedule: [
      { days: [1, 2, 3, 4, 5, 6], from: 7, to: 15, loc: 'market' },
      { days: [6], from: 17, to: 22, loc: 'market' }
    ],
    topics: [
      { id: 'intro', label: 'Say hello', once: true,
        text: ['"Fresh bread, honest weights," Teo says. "Buy or do not buy, the first hello is free."'],
        reward: { rel: 5, skill: 'conversation', skillExp: 6, exp: 3 } },
      { id: 'regulars', label: 'Ask what the cafe regulars like', once: true,
        text: ['Teo laughs. "Short and honest. Nobody reads a paragraph about toast. Say what it is, say what it tastes like, stop. And they all want the cardamom tea."'],
        reward: { rel: 3, skill: 'observation', skillExp: 6, exp: 4, flag: 'heardRegulars' } },
      { id: 'haggle', label: 'Try to haggle', special: 'haggle', daily: true,
        text: ['You lean on the counter and open with a smile.'] }
    ]
  },
  dani: {
    id: 'dani', name: 'Dani', role: 'Cafe owner',
    desc: 'Wiry, tired, always wiping something. Runs the Corner Cafe mostly alone.',
    schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 10, to: 20, loc: 'cafe' }],
    topics: [
      { id: 'intro', label: 'Order something and chat', once: true,
        text: ['"You are new," Dani says without looking up. "Sit anywhere. Everything is two minutes away."'],
        reward: { rel: 5, skill: 'conversation', skillExp: 6, exp: 3 } },
      { id: 'job', label: 'Ask if she needs help', once: true, when: 'quest_available', special: 'offer',
        text: [
          'Dani points at the empty chalkboard. "The printed menus got soaked last week and the printer who made them is gone. I need three short description cards for the new menu. Honest, readable, no poetry."',
          '"Write them in a notebook, bring them to me within three days. Sixty money. I will pay more if they are good."'
        ] },
      { id: 'accept', label: 'Accept the commission', when: 'quest_offered', special: 'accept',
        text: ['"Good. Three days from now, same time. Do not make me regret it."'] },
      { id: 'deliver', label: 'Deliver the menu cards', when: 'quest_active', special: 'deliver', text: [] },
      { id: 'after', label: 'Ask about the menu', when: 'quest_over', special: 'after', text: [] }
    ]
  }
};

// ==============================================================================
// PHASE 6 - LEGACY & GENERATIONS DATA DEFINITIONS
// ==============================================================================

export const MAX_FAMILY_MEMORIES = 60;
export const MAX_ORAL_HISTORIES = 40;
export const MAX_HEIRLOOMS = 20;

export const CHILD_EDUCATION_PATHS = {
  arts_humanities: {
    id: 'arts_humanities',
    name: 'Arts & Humanities Curriculum',
    desc: 'Literature, philosophy, and creative expression.',
    primarySkill: 'writing',
    secondarySkill: 'design',
    costPerTerm: 120
  },
  stem_engineering: {
    id: 'stem_engineering',
    name: 'Science & Technical Foundations',
    desc: 'Mathematics, programming logic, and systems thinking.',
    primarySkill: 'programming',
    secondarySkill: 'research',
    costPerTerm: 150
  },
  civics_commerce: {
    id: 'civics_commerce',
    name: 'Civic Engagement & Enterprise',
    desc: 'Practical economics, communication, and community leadership.',
    primarySkill: 'negotiation',
    secondarySkill: 'conversation',
    costPerTerm: 110
  },
  athletics_wellness: {
    id: 'athletics_wellness',
    name: 'Physical Conditioning & Athletics',
    desc: 'Endurance, athletic discipline, and teamwork.',
    primarySkill: 'fitness',
    secondarySkill: 'observation',
    costPerTerm: 90
  }
};

export const HEIRLOOM_TEMPLATES = {
  pocket_watch: {
    name: 'Engraved Pocket Watch',
    significance: 'Precision timepiece marking decades of devotion and punctuality.',
    baseValue: 250
  },
  first_edition_tome: {
    name: 'Annotated First Edition Tome',
    significance: 'A scholarly work inscribed with generational observations and margins.',
    baseValue: 320
  },
  silver_fountain_pen: {
    name: 'Craftsman Silver Fountain Pen',
    significance: 'Fine writing instrument used to sign pivotal agreements and manuscripts.',
    baseValue: 280
  },
  bronze_compass: {
    name: 'Maritime Brass Compass',
    significance: "Navigational heirloom keeping the family grounded through life's storms.",
    baseValue: 210
  },
  artisan_pendant: {
    name: 'Handcrafted Harbor Stone Pendant',
    significance: 'Local artisan pendant worn on major family wedding and celebration days.',
    baseValue: 240
  }
};

export const INITIAL_ORAL_HISTORIES = [
  {
    id: 'oral_arrival_roots',
    title: 'The Great Arrival in Harbor Quarter',
    category: 'ancestry',
    type: 'verified_event',
    verified: true,
    isRumor: false,
    text: 'The founding generation arrived at Harbor Quarter in March 2030, seeking purposeful life and community.',
    source: 'Family Bible & Registry'
  },
  {
    id: 'oral_hidden_journal',
    title: 'The Legend of the Waterfront Archive',
    category: 'lore',
    type: 'family_rumor',
    verified: false,
    isRumor: true,
    text: 'A whispered rumor that an early ancestor safeguarded an uncataloged handwritten journal within the Metropolitan Library archives.',
    source: 'Neighborhood Oldtimer Rumor'
  }
];

export const NPC_FAMILY_DYNAMICS = {
  mira: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Balance demanding design agency career with warm household life'
  },
  dani: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Build an enduring generational legacy around the artisanal cafe'
  },
  teo: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Keep ancestral merchant traditions alive while supporting his growing kin'
  },
  chloe: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Nurture technical curiosity in younger generation of city engineers'
  },
  elena: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Sustain scholarly excellence across academic generations'
  },
  julian: {
    partnerId: null,
    partnerName: null,
    children: [],
    familyGoal: 'Instill dedication to maritime conservation and athletics in family'
  }
};

export const QUEST = {
  id: 'menu',
  name: 'The Missing Menu',
  giver: 'dani',
  desc: 'Dani lost her printed menus and needs three short description cards written for the new menu. She will pay for them, but only if they arrive on time.',
  deadlineHours: 72,
  draftsNeeded: 3,
  objectives: [
    { id: 'accept', label: 'Accept the commission from Dani at the Corner Cafe' },
    { id: 'notebook', label: 'Own a Pocket Notebook (buy one at Lantern Market)' },
    { id: 'insight', label: 'Ask Teo at the market what the regulars like' },
    { id: 'drafts', label: 'Write three drafts after accepting' },
    { id: 'deliver', label: 'Deliver the cards to Dani before the deadline' }
  ],
  reward: '60 money (75 for excellent work), 90 EXP, Writing training, +1 Management. Excellent work also earns a Regulars Stamp Card.'
};

export const EXPLORE_CLUES = {
  home: ['A loose floorboard under the bed hides nothing but dust and an old receipt.', 'From the window you notice which neighbours leave early and which never seem to.'],
  library: ['Behind the periodicals shelf you find a quiet corner with its own lamp.', 'A bulletin board lists reading groups, lost keys and one handwritten job offer.'],
  market: ['You learn which stalls open first and which prices change after noon.', 'A fruit seller tells you the best day to shop is Saturday, when Lantern Night discounts start.'],
  cafe: ['The chalkboard still shows a ghost of last season\'s menu under the new chalk.', 'You overhear two regulars arguing about whether cardamom belongs in tea.']
};


// ==============================================================================
// PHASE 2 - MODERN LIVING WORLD DATA DEFINITIONS
// ==============================================================================

export const EXTENDED_LOCATIONS = {
  downtown: {
    id: 'downtown', name: 'Downtown Metropolis',
    desc: 'Commercial core with skyscrapers, financial firms, corporate headquarters and shopping avenues.',
    open: { days: [0, 1, 2, 3, 4, 5, 6], from: 6, to: 23, label: 'Daily 06:00-23:00' }
  },
  university: {
    id: 'university', name: 'Metropolitan University',
    desc: 'Historic stone buildings blended with modern science labs, lecture halls and student commons.',
    open: { days: [1, 2, 3, 4, 5, 6], from: 8, to: 21, label: 'Mon-Sat 08:00-21:00' }
  },
  tech_park: {
    id: 'tech_park', name: 'Innovation Hub',
    desc: 'High-tech corporate campus featuring tech startups, incubators, research labs and co-working spaces.',
    open: { days: [1, 2, 3, 4, 5], from: 7, to: 20, label: 'Mon-Fri 07:00-20:00' }
  },
  marina: {
    id: 'marina', name: 'Bayside Marina District',
    desc: 'Scenic waterfront promenade lined with upscale dining, luxury residences, and boardwalk cafes.',
    open: { days: [0, 1, 2, 3, 4, 5, 6], from: 9, to: 23, label: 'Daily 09:00-23:00' }
  }
};

export const EXTENDED_TRAVEL = {
  'cafe|downtown': 20, 'downtown|home': 25, 'downtown|library': 15, 'downtown|market': 20,
  'cafe|university': 25, 'home|university': 30, 'library|university': 20, 'market|university': 25, 'downtown|university': 15,
  'cafe|tech_park': 30, 'home|tech_park': 35, 'library|tech_park': 25, 'market|tech_park': 30, 'downtown|tech_park': 15, 'tech_park|university': 15,
  'cafe|marina': 25, 'home|marina': 30, 'library|marina': 30, 'marina|market': 25, 'downtown|marina': 15, 'marina|university': 25, 'marina|tech_park': 20
};

Object.assign(LOCATIONS, EXTENDED_LOCATIONS);
Object.assign(TRAVEL, EXTENDED_TRAVEL);

export const EXTENDED_NPCS = {
  marcus: {
    id: 'marcus', name: 'Marcus Vance', role: 'Venture Director',
    desc: 'Sharp-suited investor with keen eyes and a decisive demeanor.',
    schedule: [
      { days: [1, 2, 3, 4, 5], from: 8, to: 17, loc: 'downtown' },
      { days: [5], from: 18, to: 22, loc: 'marina' }
    ],
    topics: [
      { id: 'intro', label: 'Introduce yourself', once: true,
        text: ['"Good to meet you," Marcus nods firmly. "Time is the only asset we can never buy back."'],
        reward: { rel: 5, skill: 'negotiation', skillExp: 8, exp: 6 } }
    ]
  },
  elena: {
    id: 'elena', name: 'Dr. Elena Rostova', role: 'University Dean',
    desc: 'Distinguished academic passionate about lifelong learning and analytical rigor.',
    schedule: [
      { days: [1, 2, 3, 4, 5], from: 9, to: 16, loc: 'university' },
      { days: [6], from: 10, to: 14, loc: 'library' }
    ],
    topics: [
      { id: 'intro', label: 'Discuss research and education', once: true,
        text: ['"Knowledge expands exponentially when shared," Dr. Rostova smiles warmly.'],
        reward: { rel: 5, skill: 'research', skillExp: 8, exp: 6 } }
    ]
  },
  chloe: {
    id: 'chloe', name: 'Chloe Chen', role: 'Senior Tech Lead',
    desc: 'Software architect with stylish glasses and developer conference stickers on her laptop.',
    schedule: [
      { days: [1, 2, 3, 4, 5], from: 9, to: 18, loc: 'tech_park' },
      { days: [6, 0], from: 12, to: 18, loc: 'cafe' }
    ],
    topics: [
      { id: 'intro', label: 'Say hi and talk technology', once: true,
        text: ['"Hey there! Working on any exciting systems?" Chloe asks brightly.'],
        reward: { rel: 5, skill: 'programming', skillExp: 8, exp: 6 } }
    ]
  },
  julian: {
    id: 'julian', name: 'Julian Mercer', role: 'Architect & Designer',
    desc: 'Thoughtful creative who designs sustainable residential living and community spaces.',
    schedule: [
      { days: [1, 2, 3, 4], from: 10, to: 17, loc: 'downtown' },
      { days: [5, 6], from: 11, to: 19, loc: 'marina' }
    ],
    topics: [
      { id: 'intro', label: 'Chat about modern architecture', once: true,
        text: ['"The spaces we inhabit shape our daily thoughts," Julian remarks thoughtfully.'],
        reward: { rel: 5, skill: 'design', skillExp: 8, exp: 6 } }
    ]
  }
};

Object.assign(NPCS, EXTENDED_NPCS);

export const JOBS = {
  corp_admin_assistant: {
    id: 'corp_admin_assistant', title: 'Administrative Assistant', company: 'Apex Corporation',
    industry: 'Corporate', level: 1, salary: 140, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: null, attributes: { management: 3, communication: 3 }, skills: { writing: 1 } },
    desc: 'Manage office schedules, communications, and executive documentation.', nextJob: 'corp_operations_manager'
  },
  corp_operations_manager: {
    id: 'corp_operations_manager', title: 'Operations Manager', company: 'Apex Corporation',
    industry: 'Corporate', level: 2, salary: 320, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: 'cert_management', attributes: { management: 5, influence: 4 }, skills: { negotiation: 2 }, expDays: 14 },
    desc: 'Oversee corporate workflow, team allocation, and project timelines.', nextJob: 'corp_executive'
  },
  corp_executive: {
    id: 'corp_executive', title: 'Vice President of Operations', company: 'Apex Corporation',
    industry: 'Corporate', level: 3, salary: 750, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: 'deg_business', attributes: { management: 7, influence: 6, willpower: 5 }, skills: { negotiation: 4 }, expDays: 30 },
    desc: 'Direct strategic corporate growth and executive leadership initiatives.'
  },
  tech_junior_dev: {
    id: 'tech_junior_dev', title: 'Junior Software Engineer', company: 'NovaTech Solutions',
    industry: 'Technology', level: 1, salary: 180, location: 'tech_park', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: null, attributes: { intelligence: 4 }, skills: { programming: 2 } },
    desc: 'Write unit tests, fix application bugs, and build responsive features.', nextJob: 'tech_senior_dev'
  },
  tech_senior_dev: {
    id: 'tech_senior_dev', title: 'Senior Software Architect', company: 'NovaTech Solutions',
    industry: 'Technology', level: 2, salary: 420, location: 'tech_park', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: 'cert_software', attributes: { intelligence: 6, adaptability: 5 }, skills: { programming: 5 }, expDays: 14 },
    desc: 'Design distributed architectures, coordinate code reviews, and lead engineering pods.', nextJob: 'tech_cto'
  },
  tech_cto: {
    id: 'tech_cto', title: 'Chief Technology Officer', company: 'NovaTech Solutions',
    industry: 'Technology', level: 3, salary: 900, location: 'tech_park', workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
    requirements: { qualification: 'deg_compsci', attributes: { intelligence: 8, management: 6, influence: 5 }, skills: { programming: 7, negotiation: 4 }, expDays: 30 },
    desc: 'Direct technical vision, architectural standards, and engineering culture.'
  },
  creative_junior_designer: {
    id: 'creative_junior_designer', title: 'Junior Visual Designer', company: 'Studio Prisma',
    industry: 'Creative', level: 1, salary: 150, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 10, endHour: 18,
    requirements: { qualification: null, attributes: { creativity: 4 }, skills: { design: 2 } },
    desc: 'Craft branding assets, user interfaces, and graphic promotional kits.', nextJob: 'creative_art_director'
  },
  creative_art_director: {
    id: 'creative_art_director', title: 'Art & Design Director', company: 'Studio Prisma',
    industry: 'Creative', level: 2, salary: 350, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 10, endHour: 18,
    requirements: { qualification: 'cert_design', attributes: { creativity: 6, empathy: 5 }, skills: { design: 5, writing: 3 }, expDays: 14 },
    desc: 'Lead creative campaigns, oversee design systems, and manage studio productions.'
  },
  finance_analyst: {
    id: 'finance_analyst', title: 'Financial Analyst', company: 'Sterling Capital Bank',
    industry: 'Finance', level: 1, salary: 190, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 16,
    requirements: { qualification: null, attributes: { intelligence: 5, perception: 4 }, skills: { research: 2 } },
    desc: 'Analyze balance sheets, fiscal portfolios, and macroeconomic indicators.', nextJob: 'finance_portfolio_manager'
  },
  finance_portfolio_manager: {
    id: 'finance_portfolio_manager', title: 'Senior Portfolio Manager', company: 'Sterling Capital Bank',
    industry: 'Finance', level: 2, salary: 450, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 16,
    requirements: { qualification: 'deg_finance', attributes: { intelligence: 7, willpower: 5 }, skills: { negotiation: 4, research: 5 }, expDays: 20 },
    desc: 'Manage investment portfolios, asset allocations, and wealth strategies.'
  },
  health_assistant: {
    id: 'health_assistant', title: 'Medical Clinic Assistant', company: 'Metropolitan Medical',
    industry: 'Healthcare', level: 1, salary: 160, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 16,
    requirements: { qualification: null, attributes: { empathy: 4, endurance: 4 }, skills: { conversation: 2 } },
    desc: 'Support clinical staff, patient intake records, and health consultations.'
  },
  edu_tutor: {
    id: 'edu_tutor', title: 'Academic Tutor', company: 'Metropolitan University',
    industry: 'Education', level: 1, salary: 150, location: 'university', workDays: [1, 2, 3, 4, 5], startHour: 10, endHour: 17,
    requirements: { qualification: null, attributes: { intelligence: 4, communication: 4 }, skills: { research: 2 } },
    desc: 'Guide undergraduate study sessions, review academic drafts, and host recitations.'
  },
  hosp_barista: {
    id: 'hosp_barista', title: 'Artisan Barista & Lead', company: 'Harbor Roasters',
    industry: 'Hospitality', level: 1, salary: 130, location: 'cafe', workDays: [2, 3, 4, 5, 6], startHour: 7, endHour: 15,
    requirements: { qualification: null, attributes: { agility: 3, communication: 3 }, skills: { cooking: 2 } },
    desc: 'Brew specialty coffee blends and manage front counter hospitality.'
  },
  trade_technician: {
    id: 'trade_technician', title: 'Electronics Assembly Technician', company: 'Apex Precision Works',
    industry: 'Manufacturing', level: 1, salary: 160, location: 'market', workDays: [1, 2, 3, 4, 5], startHour: 7, endHour: 15,
    requirements: { qualification: null, attributes: { strength: 4, perception: 4 }, skills: { observation: 2 } },
    desc: 'Assemble precision hardware, test circuit boards, and maintain machinery.'
  },
  pub_coordinator: {
    id: 'pub_coordinator', title: 'Civic Services Coordinator', company: 'Metropolitan Civic Office',
    industry: 'Public services', level: 1, salary: 150, location: 'downtown', workDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 16,
    requirements: { qualification: null, attributes: { empathy: 4, adaptability: 4 }, skills: { conversation: 2 } },
    desc: 'Coordinate public community resources, municipal permits, and neighborhood outreach programs.'
  }
};

export const EDUCATION_PROGRAMS = {
  cert_management: {
    id: 'cert_management', name: 'Professional Management Certificate',
    institution: 'Metropolitan Institute of Management', location: 'downtown',
    category: 'vocational', cost: 180, totalHoursNeeded: 30,
    requirements: { attributes: { management: 3 } },
    qualification: 'cert_management',
    rewards: { skill: 'negotiation', skillExp: 25, exp: 50, attr: 'management', attrBonus: 1 },
    desc: 'Master resource allocation, operational planning, and team leadership.'
  },
  cert_software: {
    id: 'cert_software', name: 'Full-Stack Software Engineering Certificate',
    institution: 'Tech Valley Academy', location: 'tech_park',
    category: 'vocational', cost: 240, totalHoursNeeded: 40,
    requirements: { attributes: { intelligence: 4 }, skills: { programming: 2 } },
    qualification: 'cert_software',
    rewards: { skill: 'programming', skillExp: 35, exp: 60, attr: 'intelligence', attrBonus: 1 },
    desc: 'Intensive engineering curriculum covering modern algorithms, cloud APIs, and architecture.'
  },
  cert_design: {
    id: 'cert_design', name: 'Applied UX & Visual Systems Certificate',
    institution: 'Creative Media Institute', location: 'downtown',
    category: 'vocational', cost: 160, totalHoursNeeded: 30,
    requirements: { attributes: { creativity: 4 }, skills: { design: 1 } },
    qualification: 'cert_design',
    rewards: { skill: 'design', skillExp: 30, exp: 50, attr: 'creativity', attrBonus: 1 },
    desc: 'Typography, responsive user experience design, and modern brand identity systems.'
  },
  cert_hospitality: {
    id: 'cert_hospitality', name: 'Culinary & Hospitality Management Certificate',
    institution: 'Metropolitan Culinary Guild', location: 'marina',
    category: 'vocational', cost: 140, totalHoursNeeded: 24,
    requirements: { attributes: { adaptability: 3 }, skills: { cooking: 1 } },
    qualification: 'cert_hospitality',
    rewards: { skill: 'cooking', skillExp: 30, exp: 40, attr: 'adaptability', attrBonus: 1 },
    desc: 'Kitchen economics, food service standards, and upscale guest management.'
  },
  deg_business: {
    id: 'deg_business', name: 'Bachelor of Business Administration',
    institution: 'Metropolitan University', location: 'university',
    category: 'university', cost: 600, totalHoursNeeded: 80,
    requirements: { attributes: { intelligence: 4, management: 4 } },
    qualification: 'deg_business',
    rewards: { skill: 'negotiation', skillExp: 50, exp: 120, attr: 'management', attrBonus: 2 },
    desc: 'Four-year comprehensive degree program in corporate finance and economics.'
  },
  deg_compsci: {
    id: 'deg_compsci', name: 'Bachelor of Computer Science',
    institution: 'Metropolitan University', location: 'university',
    category: 'university', cost: 650, totalHoursNeeded: 80,
    requirements: { attributes: { intelligence: 5 } },
    qualification: 'deg_compsci',
    rewards: { skill: 'programming', skillExp: 60, exp: 130, attr: 'intelligence', attrBonus: 2 },
    desc: 'Rigorous computational theory, systems programming, and modern software architectures.'
  },
  deg_finance: {
    id: 'deg_finance', name: 'Bachelor of Economics & Financial Markets',
    institution: 'Metropolitan University', location: 'university',
    category: 'university', cost: 620, totalHoursNeeded: 80,
    requirements: { attributes: { intelligence: 5, perception: 4 } },
    qualification: 'deg_finance',
    rewards: { skill: 'research', skillExp: 50, exp: 120, attr: 'willpower', attrBonus: 2 },
    desc: 'Advanced quantitative analysis, asset valuation, and global capital markets.'
  }
};

export const PROPERTIES = {
  rented_room: {
    id: 'rented_room', name: 'Rented Room over Lane', location: 'home',
    type: 'residential', category: 'Rental Room', rentCost: 35,
    buyPrice: 0, maintenance: 0, canBuy: false, maxOccupants: 1,
    desc: 'Modest room above the laundry. Cozy but basic.'
  },
  suburban_apartment: {
    id: 'suburban_apartment', name: 'Modern Studio Apartment', location: 'university',
    type: 'residential', category: 'Apartment', rentCost: 75,
    buyPrice: 1200, maintenance: 15, canBuy: true, maxOccupants: 2,
    desc: 'Sunlit studio apartment near the campus park with high-speed fiber internet and a modern kitchen.'
  },
  downtown_condo: {
    id: 'downtown_condo', name: 'Downtown Skyline Condo', location: 'downtown',
    type: 'residential', category: 'Apartment', rentCost: 160,
    buyPrice: 3200, maintenance: 35, canBuy: true, maxOccupants: 3,
    desc: 'High-rise residence with panoramic city views, fitness amenities, and 24-hour concierge services.'
  },
  marina_townhouse: {
    id: 'marina_townhouse', name: 'Marina Waterfront Townhouse', location: 'marina',
    type: 'residential', category: 'House', rentCost: 280,
    buyPrice: 6500, maintenance: 60, canBuy: true, maxOccupants: 5,
    desc: 'Spacious three-story luxury home on the bayside boardwalk with private terrace and boat slip.'
  },
  commercial_storefront: {
    id: 'commercial_storefront', name: 'Harbor Commercial Storefront', location: 'market',
    type: 'commercial', category: 'Commercial Property', rentCost: 110,
    buyPrice: 2400, maintenance: 25, canBuy: true, maxOccupants: 0,
    desc: 'Prime street-level retail space situated in the bustling marketplace with heavy foot traffic.'
  }
};

export const BUSINESS_TYPES = {
  coffee_kiosk: {
    id: 'coffee_kiosk', name: 'Artisan Coffee Kiosk', industry: 'Food and beverage',
    startupCost: 350, location: 'market',
    baseWeeklyRevenue: 180, baseWeeklyExpenses: 80,
    desc: 'Serve specialty coffee and breakfast pastries to morning market shoppers.'
  },
  tech_studio: {
    id: 'tech_studio', name: 'Digital App & Web Consultancy', industry: 'Technology',
    startupCost: 600, location: 'tech_park',
    baseWeeklyRevenue: 340, baseWeeklyExpenses: 120,
    desc: 'Develop bespoke software products, client websites, and digital cloud workflows.'
  },
  creative_agency: {
    id: 'creative_agency', name: 'Brand & Creative Studio', industry: 'Creative services',
    startupCost: 500, location: 'downtown',
    baseWeeklyRevenue: 280, baseWeeklyExpenses: 100,
    desc: 'Deliver visual branding, marketing collateral, and publication layouts.'
  },
  retail_boutique: {
    id: 'retail_boutique', name: 'Bayside Lifestyle Retail Shop', industry: 'Retail',
    startupCost: 900, location: 'marina',
    baseWeeklyRevenue: 480, baseWeeklyExpenses: 210,
    desc: 'Curated apparel, artisanal goods, and nautical home decor.'
  }
};

export const LIFE_STAGES = [
  { id: 'infant', name: 'Infant', minAge: 0, maxAge: 3, isAdult: false, canWork: false, canStudyHigher: false },
  { id: 'child', name: 'Child', minAge: 4, maxAge: 12, isAdult: false, canWork: false, canStudyHigher: false },
  { id: 'teenager', name: 'Teenager', minAge: 13, maxAge: 17, isAdult: false, canWork: false, canStudyHigher: false },
  { id: 'young_adult', name: 'Young Adult', minAge: 18, maxAge: 29, isAdult: true, canWork: true, canStudyHigher: true },
  { id: 'adult', name: 'Adult', minAge: 30, maxAge: 49, isAdult: true, canWork: true, canStudyHigher: true },
  { id: 'older_adult', name: 'Older Adult', minAge: 50, maxAge: 64, isAdult: true, canWork: true, canStudyHigher: true },
  { id: 'senior', name: 'Senior', minAge: 65, maxAge: 999, isAdult: true, canWork: true, canStudyHigher: true }
];

export function getLifeStage(age) {
  const a = Math.max(0, Number(age) || 0);
  return LIFE_STAGES.find((s) => a >= s.minAge && a <= s.maxAge) || LIFE_STAGES[LIFE_STAGES.length - 1];
}

// ==============================================================================
// PHASE 3 - WORLD MEMORY & LIVING SIMULATION DATA
// ==============================================================================

export const MEMORY_IMPORTANCE = {
  FLEETING: 1,
  NOTABLE: 2,
  SIGNIFICANT: 3,
  MAJOR: 4,
  HISTORICAL: 5
};

export const MAX_WORLD_MEMORIES = 250;
export const MAX_NPC_MEMORIES = 40;

// Base NPC autonomous profiles (routines, personal goals, initial circumstances)
export const NPC_PROFILES = {
  mira: {
    id: 'mira',
    career: 'Head Archivist & Librarian',
    employer: 'Harbor Public Library',
    homeLocation: 'home',
    interests: ['historical literature', 'classical calligraphy', 'botany'],
    goal: 'Complete an indexed catalog of rare coastal maritime manuscripts',
    workplace: 'library',
    circle: ['teo', 'elena']
  },
  teo: {
    id: 'teo',
    career: 'Merchant & Stall Proprietor',
    employer: 'Lantern Market Traders Guild',
    homeLocation: 'market',
    interests: ['artisan baking', 'trade routes', 'card games'],
    goal: 'Expand direct grain sourcing contracts with highland organic farms',
    workplace: 'market',
    circle: ['mira', 'dani']
  },
  dani: {
    id: 'dani',
    career: 'Cafe Owner & Culinary Lead',
    employer: 'Corner Cafe',
    homeLocation: 'cafe',
    interests: ['specialty coffee roasting', 'pastry recipes', 'jazz records'],
    goal: 'Restore steady foot traffic and turn the cafe into an evening cultural hub',
    workplace: 'cafe',
    circle: ['teo', 'chloe']
  },
  marcus: {
    id: 'marcus',
    career: 'Venture Director',
    employer: 'Apex Corporation',
    homeLocation: 'downtown',
    interests: ['angel investments', 'macroeconomics', 'sailing'],
    goal: 'Secure seed capital for an ambitious clean-energy tech incubator',
    workplace: 'downtown',
    circle: ['elena', 'julian']
  },
  elena: {
    id: 'elena',
    career: 'Dean of Humanities & Research',
    employer: 'Metropolitan University',
    homeLocation: 'university',
    interests: ['sociology', 'academic philosophy', 'urban development'],
    goal: 'Publish a landmark collaborative monograph on contemporary urban life',
    workplace: 'university',
    circle: ['mira', 'marcus']
  },
  chloe: {
    id: 'chloe',
    career: 'Senior Systems Architect',
    employer: 'NovaTech Solutions',
    homeLocation: 'tech_park',
    interests: ['distributed algorithms', 'open-source software', 'electronic music'],
    goal: 'Deploy a resilient decentralized data platform across metropolitan hubs',
    workplace: 'tech_park',
    circle: ['dani', 'julian']
  },
  julian: {
    id: 'julian',
    career: 'Principal Architectural Designer',
    employer: 'Studio Prisma',
    homeLocation: 'marina',
    interests: ['sustainable urbanism', 'minimalist furniture', 'coastal ecology'],
    goal: 'Win the civic design tender for the Marina promenade revitalization',
    workplace: 'downtown',
    circle: ['marcus', 'chloe']
  }
};

// Starting inter-NPC relationship network (bonds, affinities, trust, status)
export const INITIAL_NPC_NETWORK = [
  { source: 'teo', target: 'dani', status: 'close_friends', affinity: 75, trust: 80, role: 'Long-standing commercial neighbors and breakfast regulars' },
  { source: 'teo', target: 'mira', status: 'friends', affinity: 60, trust: 65, role: 'Frequent lending library patron and weekly market customer' },
  { source: 'mira', target: 'elena', status: 'colleagues', affinity: 65, trust: 70, role: 'Academic advisory peers and archival research collaborators' },
  { source: 'marcus', target: 'elena', status: 'colleagues', affinity: 50, trust: 55, role: 'University venture endowment board members' },
  { source: 'marcus', target: 'julian', status: 'friends', affinity: 55, trust: 50, role: 'Commercial design patrons and weekend marina acquaintances' },
  { source: 'chloe', target: 'dani', status: 'friends', affinity: 65, trust: 60, role: 'Daily morning cafe customer and laptop worker' },
  { source: 'chloe', target: 'julian', status: 'colleagues', affinity: 55, trust: 50, role: 'Collaborating on smart city spatial interface designs' }
];

// Dynamic location baseline properties and ambient environmental state
export const INITIAL_LOCATION_STATES = {
  home: { activityLevel: 25, reputation: 60, popularity: 30, notableHistory: ['Pithe arrived and leased a narrow room above the laundry.'] },
  library: { activityLevel: 45, reputation: 80, popularity: 50, notableHistory: ['Centennial library holding the municipal historical archives.'] },
  market: { activityLevel: 80, reputation: 75, popularity: 85, notableHistory: ['Bustling trade venue home to Saturday Lantern Night traditions.'] },
  cafe: { activityLevel: 65, reputation: 70, popularity: 60, notableHistory: ['Cozy corner spot frequented by artists, writers, and local regulars.'] },
  downtown: { activityLevel: 90, reputation: 85, popularity: 75, notableHistory: ['Financial heartbeat and corporate nexus of the metropolitan core.'] },
  university: { activityLevel: 75, reputation: 90, popularity: 70, notableHistory: ['Renowned center for research, academic debate, and student innovation.'] },
  tech_park: { activityLevel: 70, reputation: 80, popularity: 65, notableHistory: ['Campus of software laboratories, incubators, and startup ventures.'] },
  marina: { activityLevel: 60, reputation: 85, popularity: 80, notableHistory: ['Scenic coastal district famous for open-air promenades and fresh breezes.'] }
};

// Emergent world events catalog
export const EMERGENT_EVENT_TYPES = {
  book_fair: {
    id: 'book_fair',
    name: 'Harbor Book & Archive Fair',
    location: 'library',
    cadenceDays: 14,
    activeHours: [10, 16],
    participants: ['mira', 'elena'],
    desc: 'An exhibition of rare manuscripts, local publications, and guest author readings.',
    playerOption: {
      label: 'Browse the archival exhibition (1h)',
      cost: 0,
      energy: -10,
      minutes: 60,
      rewards: { skill: 'research', skillExp: 14, exp: 12 },
      narrative: 'You browsed historical maps and original trade registers, conversing with local scholars.'
    },
    autonomousOutcome: 'The library archive fair concluded with strong community turnout and new rare additions to the collection.'
  },
  artisan_tasting: {
    id: 'artisan_tasting',
    name: 'Weekend Coffee Cupping & Tasting',
    location: 'cafe',
    cadenceDays: 7,
    activeDays: [0, 6],
    activeHours: [13, 17],
    participants: ['dani', 'chloe'],
    desc: 'Dani hosts an intimate coffee roast tasting featuring single-origin beans and pairing pastries.',
    playerOption: {
      label: 'Participate in the cupping flight ($10)',
      cost: 10,
      energy: 15,
      minutes: 45,
      rewards: { skill: 'cooking', skillExp: 10, exp: 8 },
      narrative: 'You sampled three distinct roasts with Dani, identifying notes of citrus, dark chocolate, and cardamom.'
    },
    autonomousOutcome: 'Dani held an enjoyable weekend tasting; new regulars praised the seasonal single-origin roast.'
  },
  founders_mixer: {
    id: 'founders_mixer',
    name: 'Innovation & Founders Mixer',
    location: 'tech_park',
    cadenceDays: 14,
    activeDays: [4, 5],
    activeHours: [17, 20],
    participants: ['chloe', 'marcus'],
    desc: 'An open networking session connecting software engineers, designers, and startup investors.',
    playerOption: {
      label: 'Network with founders and engineers (2h)',
      cost: 0,
      energy: -16,
      minutes: 120,
      rewards: { skill: 'conversation', skillExp: 16, exp: 16 },
      narrative: 'You joined an animated circle discussing distributed systems, product roadmaps, and venture funding.'
    },
    autonomousOutcome: 'Engineers and venture leaders shared prototype demos and forged new professional collaborations.'
  },
  waterfront_festival: {
    id: 'waterfront_festival',
    name: 'Marina Promenade Crafts & Music Festival',
    location: 'marina',
    cadenceDays: 21,
    activeDays: [5, 6],
    activeHours: [14, 21],
    participants: ['julian', 'teo'],
    desc: 'Bayside live acoustic sets, artisanal design booths, and evening promenade strolls.',
    playerOption: {
      label: 'Enjoy the waterfront festival (2h)',
      cost: 15,
      energy: 10,
      satiety: 20,
      minutes: 120,
      rewards: { skill: 'observation', skillExp: 12, exp: 14 },
      narrative: 'You walked the sunlit boardwalk, listened to melodic acoustic performances, and admired seaside craft stalls.'
    },
    autonomousOutcome: 'The seaside festival brought festive crowds to the promenade and boosted local shop reputations.'
  },
  symposium_lecture: {
    id: 'symposium_lecture',
    name: 'Metropolitan Public Civic Symposium',
    location: 'university',
    cadenceDays: 28,
    activeDays: [2, 3],
    activeHours: [15, 18],
    participants: ['elena', 'marcus'],
    desc: 'An insightful public debate and keynote lecture addressing the future of sustainable urban centers.',
    playerOption: {
      label: 'Attend the symposium lecture (2h)',
      cost: 0,
      energy: -12,
      minutes: 120,
      rewards: { skill: 'research', skillExp: 15, exp: 15 },
      narrative: 'You took detailed notes as Dr. Rostova delivered an eloquent lecture on urban social networks.'
    },
    autonomousOutcome: 'Dr. Rostova addressed an engaged auditorium, sparking vibrant discussion across academic faculty.'
  }
};

// ==============================================================================
// PHASE 4 - ADVANCED PROGRESSION, MASTERY & RPG EXPANSION DATA
// ==============================================================================

// Context-sensitive reputation domains
export const REPUTATION_DOMAINS = {
  professional: { id: 'professional', name: 'Professional Reputation', desc: 'Standing among corporate executives, clients, and industry peers.' },
  academic: { id: 'academic', name: 'Academic Reputation', desc: 'Recognition across university researchers, scholars, and intellectual institutions.' },
  creative: { id: 'creative', name: 'Creative Reputation', desc: 'Prestige among visual artists, designers, authors, and cultural critics.' },
  community: { id: 'community', name: 'Community Reputation', desc: 'Trust, warmth, and goodwill among local neighborhood residents and civic volunteers.' },
  athletic: { id: 'athletic', name: 'Athletic Reputation', desc: 'Acclaim in competitive sports, distance marathons, and conditioning leagues.' }
};

// Skill Specializations: Available at Skill Level 5+
export const SKILL_SPECIALIZATIONS = {
  programming: [
    {
      id: 'systems_architect',
      skillId: 'programming',
      name: 'Systems Architect',
      desc: 'Focus on distributed backends, robust architectures, and fault tolerance.',
      reqSkillLevel: 5,
      bonuses: { workPerfMod: 1.25, energyCostMod: 0.85, compBonus: 'programming' },
      flavor: 'You design structural software backbones that withstand heavy throughput.'
    },
    {
      id: 'creative_technologist',
      skillId: 'programming',
      name: 'Creative Technologist',
      desc: 'Merge algorithmic mastery with visual interactivity, game mechanics, and design.',
      reqSkillLevel: 5,
      bonuses: { designSynergy: true, expGainMod: 1.2, compBonus: 'creativity' },
      flavor: 'You transform code into expressive digital artwork and interactive experiences.'
    }
  ],
  writing: [
    {
      id: 'investigative_journalist',
      skillId: 'writing',
      name: 'Investigative Journalist',
      desc: 'Probe deep civic narratives, verify rumors with factual rigor, and publish revelations.',
      reqSkillLevel: 5,
      bonuses: { rumorVerifyBonus: 2, communityRepMod: 1.3, compBonus: 'writing' },
      flavor: 'Your prose uncovers truth beneath polished public statements.'
    },
    {
      id: 'literary_author',
      skillId: 'writing',
      name: 'Literary Author',
      desc: 'Craft profound prose, evocative essays, and memorable longform fiction.',
      reqSkillLevel: 5,
      bonuses: { creativeRepMod: 1.4, journalExpMod: 1.5, compBonus: 'creativity' },
      flavor: 'Your words evoke vivid resonance in the hearts of discerning readers.'
    }
  ],
  design: [
    {
      id: 'design_systems_lead',
      skillId: 'design',
      name: 'Design Systems Lead',
      desc: 'Standardize scalable typography, modular design tokens, and systematic layouts.',
      reqSkillLevel: 5,
      bonuses: { workPerfMod: 1.25, salaryBonus: 0.15, compBonus: 'design' },
      flavor: 'You bring unified geometric elegance and accessible clarity to complex interfaces.'
    },
    {
      id: 'visual_storyteller',
      skillId: 'design',
      name: 'Visual Storyteller',
      desc: 'Craft striking branding narratives, evocative posters, and bespoke artisanal illustrations.',
      reqSkillLevel: 5,
      bonuses: { creativeRepMod: 1.35, clientJoyMod: 1.2, compBonus: 'creativity' },
      flavor: 'Your visual compositions captivate audiences with distinctive emotional weight.'
    }
  ],
  research: [
    {
      id: 'empirical_analyst',
      skillId: 'research',
      name: 'Empirical Data Analyst',
      desc: 'Extract actionable foresight from dense numerical registers, archives, and spreadsheets.',
      reqSkillLevel: 5,
      bonuses: { academicRepMod: 1.3, intelligenceGainMod: 1.25, compBonus: 'research' },
      flavor: 'You identify hidden quantitative patterns where others see only noise.'
    },
    {
      id: 'archival_historian',
      skillId: 'research',
      name: 'Archival Historian',
      desc: 'Specialize in maritime chronicles, institutional histories, and forgotten manuscripts.',
      reqSkillLevel: 5,
      bonuses: { libraryBenefit: true, memoryDiscoveryBonus: 2, compBonus: 'perception' },
      flavor: 'You preserve the forgotten stories of the harbor and city archives.'
    }
  ],
  cooking: [
    {
      id: 'executive_chef',
      skillId: 'cooking',
      name: 'Artisan Executive Chef',
      desc: 'Command professional kitchen timing, complex flavor balance, and banquet pacing.',
      reqSkillLevel: 5,
      bonuses: { satietyEfficiency: 1.35, businessFoodBonus: 1.25, compBonus: 'cooking' },
      flavor: 'You elevate local harbor harvests into sublime culinary creations.'
    },
    {
      id: 'nutritional_scientist',
      skillId: 'cooking',
      name: 'Nutritional Specialist',
      desc: 'Balance macronutrients, recovery botanicals, and sustained endurance recipes.',
      reqSkillLevel: 5,
      bonuses: { healthRegenMod: 1.4, energyDrainMod: 0.85, compBonus: 'fitness' },
      flavor: 'Your balanced meals fuel stamina and rapid physiological recovery.'
    }
  ],
  fitness: [
    {
      id: 'marathon_athlete',
      skillId: 'fitness',
      name: 'Endurance Marathoner',
      desc: 'Hone cardiovascular resilience, lung capacity, and steady pacing across long distances.',
      reqSkillLevel: 5,
      bonuses: { travelEnergyMod: 0.75, athleticRepMod: 1.4, compBonus: 'fitness' },
      flavor: 'You stride across city miles with steady breathing and calm focus.'
    },
    {
      id: 'strength_conditioner',
      skillId: 'fitness',
      name: 'Strength Conditioner',
      desc: 'Master power kinetics, isometric resistance, and physical resilience under strain.',
      reqSkillLevel: 5,
      bonuses: { collapseResist: true, physicalTaskMod: 1.3, compBonus: 'strength' },
      flavor: 'Your hardened physique shrugs off physical fatigue and heavy labor.'
    }
  ],
  negotiation: [
    {
      id: 'venture_dealmaker',
      skillId: 'negotiation',
      name: 'Venture Dealmaker',
      desc: 'Structure high-stakes equity contracts, commercial alliances, and commercial leases.',
      reqSkillLevel: 5,
      bonuses: { businessProfitMod: 1.2, professionalRepMod: 1.3, compBonus: 'negotiation' },
      flavor: 'You negotiate win-win corporate agreements with persuasive composure.'
    },
    {
      id: 'community_mediator',
      skillId: 'negotiation',
      name: 'Community Mediator',
      desc: 'Resolve neighborhood disputes, broker tenant pacts, and build social consensus.',
      reqSkillLevel: 5,
      bonuses: { trustGainMod: 1.35, communityRepMod: 1.4, compBonus: 'communication' },
      flavor: 'You dissolve tensions and foster mutual understanding among conflicting parties.'
    }
  ],
  conversation: [
    {
      id: 'diplomatic_orator',
      skillId: 'conversation',
      name: 'Diplomatic Orator',
      desc: 'Command public stages, articulate shared visions, and inspire community action.',
      reqSkillLevel: 5,
      bonuses: { publicSpeakingBonus: 1.4, influenceGainMod: 1.25, compBonus: 'conversation' },
      flavor: 'Your spoken words carry authority, warmth, and persuasive grace.'
    },
    {
      id: 'confidant_counselor',
      skillId: 'conversation',
      name: 'Empathetic Counselor',
      desc: 'Provide patient counsel, active listening, and sincere emotional sanctuary.',
      reqSkillLevel: 5,
      bonuses: { npcFriendshipBonus: 1.5, empathyGainMod: 1.3, compBonus: 'empathy' },
      flavor: 'People readily open their deepest thoughts and personal ambitions to you.'
    }
  ],
  observation: [
    {
      id: 'forensic_analyst',
      skillId: 'observation',
      name: 'Forensic Analyst',
      desc: 'Detect subtle discrepancies in accounts, contracts, and forensic evidence.',
      reqSkillLevel: 5,
      bonuses: { deceptionDetect: true, perceptionGainMod: 1.3, compBonus: 'observation' },
      flavor: 'Nothing slips past your keen scrutiny and contextual deduction.'
    },
    {
      id: 'environmental_scout',
      skillId: 'observation',
      name: 'Environmental Scout',
      desc: 'Read atmospheric shifts, urban micro-currents, and quiet neighborhood trends.',
      reqSkillLevel: 5,
      bonuses: { exploreLootMod: 1.4, eventDiscoverBonus: 1.3, compBonus: 'perception' },
      flavor: 'You sense the quiet rhythms of the city and its hidden alleyways.'
    }
  ]
};

// Skill Mastery Milestones
export const MASTERY_MILESTONES = [
  { level: 1, title: 'Novice', perk: 'Fundamental familiarity with practice routines.' },
  { level: 3, title: 'Apprentice', perk: 'Energy consumption reduced by 10% for related activities.' },
  { level: 5, title: 'Journeyman', perk: 'Unlocks advanced skill specializations and competition eligibility.' },
  { level: 8, title: 'Specialist', perk: 'Gain +20% bonus EXP and greater prestige in domain competitions.' },
  { level: 10, title: 'Master', perk: 'Legendary proficiency. Mentorship ability and signature mastery perk unlocked.' }
];

// Organizations & Communities Catalog
export const ORGANIZATIONS = {
  tech_guild: {
    id: 'tech_guild',
    name: 'Metropolitan Tech Innovators Guild',
    location: 'tech_park',
    industry: 'Technology',
    desc: 'An influential coalition of software architects, roboticists, and tech entrepreneurs fostering modern engineering standards.',
    membershipCost: 75,
    requirements: { skills: { programming: 3 }, repDomain: 'professional', minRep: 10 },
    ranks: [
      { id: 'affiliate', title: 'Guild Affiliate', perk: 'Access to Tech Park workshops and hardware labs.' },
      { id: 'fellow', title: 'Fellow Engineer', reqContrib: 50, perk: '+15% programming practice EXP and peer mentorship.' },
      { id: 'chair', title: 'Steering Committee Chair', reqContrib: 150, perk: 'Ability to sponsor tech hackathons and direct grant funding.' }
    ],
    npcMembers: ['chloe', 'marcus'],
    contributions: [
      { id: 'code_sprint', name: 'Contribute to Open Core Software Sprint (3h)', minutes: 180, energy: -20, skill: 'programming', contribPoints: 15, repType: 'professional', repVal: 8 },
      { id: 'mentorship', name: 'Mentor Junior Coders (2h)', minutes: 120, energy: -15, skill: 'conversation', contribPoints: 10, repType: 'community', repVal: 6 }
    ]
  },
  arts_collective: {
    id: 'arts_collective',
    name: 'Studio Prisma Arts Collective',
    location: 'downtown',
    industry: 'Creative Arts',
    desc: 'A vibrant collective of graphic designers, authors, and exhibition artists celebrating contemporary metropolitan culture.',
    membershipCost: 50,
    requirements: { skills: { design: 2, writing: 2 }, repDomain: 'creative', minRep: 10 },
    ranks: [
      { id: 'contributor', title: 'Associate Artisan', perk: 'Access to printmaking presses and collective studios.' },
      { id: 'resident', title: 'Resident Artist', reqContrib: 50, perk: 'Opportunity to exhibit original work at Downtown galleries.' },
      { id: 'curator', title: 'Lead Curator', reqContrib: 150, perk: 'Curate city-wide art exhibits and command 20% higher design fees.' }
    ],
    npcMembers: ['julian', 'dani'],
    contributions: [
      { id: 'gallery_install', name: 'Assist Gallery Curation & Installation (3h)', minutes: 180, energy: -18, skill: 'design', contribPoints: 15, repType: 'creative', repVal: 8 },
      { id: 'zine_editorial', name: 'Draft Collective Cultural Zine (2h)', minutes: 120, energy: -14, skill: 'writing', contribPoints: 10, repType: 'creative', repVal: 6 }
    ]
  },
  academic_society: {
    id: 'academic_society',
    name: 'Metropolitan Philosophical & Research Society',
    location: 'university',
    industry: 'Academia',
    desc: 'A prestigious intellectual fraternity dedicated to archival science, sociological critique, and public debate.',
    membershipCost: 60,
    requirements: { skills: { research: 3 }, repDomain: 'academic', minRep: 10 },
    ranks: [
      { id: 'scholar_member', title: 'Corresponding Scholar', perk: 'Full access to restricted university archival vaults.' },
      { id: 'fellow_academic', title: 'Senior Research Fellow', reqContrib: 50, perk: 'Co-publish collaborative monographs with tenured faculty.' },
      { id: 'dean_honorary', title: 'Distinguished Academic Chair', reqContrib: 150, perk: 'Direct academic symposium lectures and advisory boards.' }
    ],
    npcMembers: ['elena', 'mira'],
    contributions: [
      { id: 'manuscript_review', name: 'Peer Review Archival Submissions (3h)', minutes: 180, energy: -20, skill: 'research', contribPoints: 15, repType: 'academic', repVal: 8 },
      { id: 'public_lecture', name: 'Host Public Academic Discussion (2h)', minutes: 120, energy: -15, skill: 'conversation', contribPoints: 10, repType: 'academic', repVal: 6 }
    ]
  },
  merchants_union: {
    id: 'merchants_union',
    name: 'Harbor Merchants & Producers Guild',
    location: 'market',
    industry: 'Commerce',
    desc: 'The historic guild of stallholders, culinary artisans, and coastal exporters coordinating fair trade and festival markets.',
    membershipCost: 40,
    requirements: { skills: { negotiation: 2 }, repDomain: 'community', minRep: 10 },
    ranks: [
      { id: 'apprentice_trader', title: 'Registered Trader', perk: 'Discounted market stall fees and early morning delivery slots.' },
      { id: 'master_merchant', title: 'Master Merchant', reqContrib: 50, perk: '10% wholesale discount on all market purchases.' },
      { id: 'guildmaster', title: 'Guildmaster of Trade', reqContrib: 150, perk: 'Supervise Lantern Night events and arbitrate harbor contracts.' }
    ],
    npcMembers: ['teo', 'dani'],
    contributions: [
      { id: 'market_steward', name: 'Steward Market Logistics & Security (3h)', minutes: 180, energy: -22, skill: 'observation', contribPoints: 15, repType: 'community', repVal: 8 },
      { id: 'supply_negotiate', name: 'Negotiate Bulk Regional Grain Pact (2h)', minutes: 120, energy: -15, skill: 'negotiation', contribPoints: 10, repType: 'professional', repVal: 6 }
    ]
  },
  athletic_league: {
    id: 'athletic_league',
    name: 'Bayside Coastal Athletics & Rowing Club',
    location: 'marina',
    industry: 'Sports & Athletics',
    desc: 'A storied seaside sporting club fostering endurance runners, rowers, and outdoor enthusiasts along the bay.',
    membershipCost: 45,
    requirements: { skills: { fitness: 3 }, repDomain: 'athletic', minRep: 10 },
    ranks: [
      { id: 'club_runner', title: 'Club Athlete', perk: 'Access to bayside gym facilities, recovery baths, and coaching.' },
      { id: 'pace_leader', title: 'Pacemaker & Captain', reqContrib: 50, perk: 'Bonus stamina recovery (+10% Energy efficiency in fitness).' },
      { id: 'club_champion', title: 'President of Coastal Athletics', reqContrib: 150, perk: 'Host official city marathons and lead premier regatta teams.' }
    ],
    npcMembers: ['teo', 'julian'],
    contributions: [
      { id: 'course_marshal', name: 'Marshal Coastal Trail & Safety (3h)', minutes: 180, energy: -25, skill: 'fitness', contribPoints: 15, repType: 'athletic', repVal: 8 },
      { id: 'youth_coaching', name: 'Coach Junior Bayside Runners (2h)', minutes: 120, energy: -18, skill: 'fitness', contribPoints: 10, repType: 'community', repVal: 6 }
    ]
  }
};

// Competitions & Challenges Catalog
export const COMPETITIONS = {
  bayside_10k: {
    id: 'bayside_10k',
    name: 'Marina Grand Coastal 10K Marathon',
    location: 'marina',
    cadenceDays: 14,
    activeDays: [0, 6], // Weekend
    activeHours: [8, 14],
    entryFee: 20,
    domain: 'athletic',
    primarySkill: 'fitness',
    secondaryAttr: 'endurance',
    desc: 'An arduous 10-kilometer endurance road race along the windswept coastal cliffs of the Marina Promenade.',
    npcCompetitors: ['teo', 'julian'],
    strategies: [
      { id: 'steady_pace', label: 'Steady Pacing (Balanced: High endurance check)', energyCost: 35, difficulty: 6, risk: 'low' },
      { id: 'aggressive_breakaway', label: 'Aggressive Breakaway (High speed: Requires agility & strength)', energyCost: 55, difficulty: 8, risk: 'high' },
      { id: 'calculated_surge', label: 'Calculated Final Surge (Patience & perception)', energyCost: 45, difficulty: 7, risk: 'medium' }
    ],
    prizes: {
      gold: { cash: 200, exp: 60, rep: 25, item: 'tonic', title: 'Marina Coastal Marathon Gold Medalist' },
      silver: { cash: 100, exp: 40, rep: 15, title: 'Marina Coastal Marathon Runner-Up' },
      bronze: { cash: 50, exp: 25, rep: 10, title: 'Marina Coastal Marathon Bronze Finisher' },
      participant: { cash: 0, exp: 15, rep: 4, title: 'Bayside 10K Finisher' }
    }
  },
  hackathon: {
    id: 'hackathon',
    name: 'Tech Park Metropolitan 24h Hackathon',
    location: 'tech_park',
    cadenceDays: 21,
    activeDays: [5, 6], // Saturday & Sunday
    activeHours: [9, 21],
    entryFee: 25,
    domain: 'professional',
    primarySkill: 'programming',
    secondaryAttr: 'intelligence',
    desc: 'An intense computational engineering hackathon pitting elite developers to build robust open prototypes.',
    npcCompetitors: ['chloe', 'marcus'],
    strategies: [
      { id: 'resilient_architecture', label: 'Fault-Tolerant Distributed Core (Focus on stability)', energyCost: 40, difficulty: 7, risk: 'low' },
      { id: 'cutting_edge_ai', label: 'Novel Algorithmic Innovation (Ambitious prototype)', energyCost: 60, difficulty: 9, risk: 'high' },
      { id: 'slick_product_ux', label: 'Full-Stack Polished MVP (Balanced coding & design)', energyCost: 45, difficulty: 7, risk: 'medium' }
    ],
    prizes: {
      gold: { cash: 350, exp: 80, rep: 30, title: 'Tech Park Hackathon Grand Champion' },
      silver: { cash: 180, exp: 50, rep: 18, title: 'Hackathon Innovation Runner-Up' },
      bronze: { cash: 90, exp: 30, rep: 10, title: 'Hackathon Bronze Laureate' },
      participant: { cash: 0, exp: 20, rep: 5, title: 'Hackathon Project Exhibitor' }
    }
  },
  culinary_cup: {
    id: 'culinary_cup',
    name: 'Corner Cafe Barista & Culinary Championship',
    location: 'cafe',
    cadenceDays: 14,
    activeDays: [0, 6], // Weekend
    activeHours: [11, 18],
    entryFee: 15,
    domain: 'creative',
    primarySkill: 'cooking',
    secondaryAttr: 'adaptability',
    desc: 'An esteemed live tasting duel assessing artisanal coffee extraction, balance, and dessert presentation.',
    npcCompetitors: ['dani', 'teo'],
    strategies: [
      { id: 'classic_perfection', label: 'Artisanal Classic Technique (Pure precision)', energyCost: 30, difficulty: 6, risk: 'low' },
      { id: 'avant_garde_fusion', label: 'Experimental Botanical Infusion (Bold culinary risk)', energyCost: 50, difficulty: 8, risk: 'high' },
      { id: 'balanced_harmony', label: 'Harmonious Flavor Flight (Balanced palate)', energyCost: 40, difficulty: 7, risk: 'medium' }
    ],
    prizes: {
      gold: { cash: 220, exp: 65, rep: 25, item: 'bread', title: 'Culinary Master Cup Winner' },
      silver: { cash: 120, exp: 40, rep: 15, title: 'Culinary Cup Silver Medalist' },
      bronze: { cash: 60, exp: 25, rep: 8, title: 'Culinary Cup Bronze Finisher' },
      participant: { cash: 0, exp: 15, rep: 4, title: 'Culinary Tasting Participant' }
    }
  },
  academic_debate: {
    id: 'academic_debate',
    name: 'Metropolitan University Public Discourse Debate',
    location: 'university',
    cadenceDays: 28,
    activeDays: [2, 3], // Midweek
    activeHours: [14, 20],
    entryFee: 10,
    domain: 'academic',
    primarySkill: 'research',
    secondaryAttr: 'willpower',
    desc: 'A formal parliamentary debate tournament challenging rhetoric, factual synthesis, and cross-examination.',
    npcCompetitors: ['elena', 'mira'],
    strategies: [
      { id: 'empirical_defense', label: 'Empirical Historical Evidence (Unimpeachable citations)', energyCost: 35, difficulty: 7, risk: 'low' },
      { id: 'rhetorical_cross', label: 'Aggressive Cross-Examination (High philosophical rigor)', energyCost: 50, difficulty: 8, risk: 'high' },
      { id: 'socratic_synthesis', label: 'Socratic Dialogue & Empathy (Engaging discourse)', energyCost: 40, difficulty: 7, risk: 'medium' }
    ],
    prizes: {
      gold: { cash: 250, exp: 75, rep: 30, title: 'Dean Discourse Debate Champion' },
      silver: { cash: 140, exp: 45, rep: 18, title: 'Debate Tournament Finalist' },
      bronze: { cash: 70, exp: 25, rep: 10, title: 'Debate Tournament Semifinalist' },
      participant: { cash: 0, exp: 15, rep: 4, title: 'Debate Participant' }
    }
  },
  design_showcase: {
    id: 'design_showcase',
    name: 'Downtown Studio Prisma Annual Design Gala',
    location: 'downtown',
    cadenceDays: 28,
    activeDays: [4, 5], // Fri/Sat
    activeHours: [13, 19],
    entryFee: 20,
    domain: 'creative',
    primarySkill: 'design',
    secondaryAttr: 'creativity',
    desc: 'A showcase of branding portfolios, architectural models, and visual installations juried by studio directors.',
    npcCompetitors: ['julian', 'chloe'],
    strategies: [
      { id: 'minimalist_rigor', label: 'Systematic Structural Modernism (Immaculate craftsmanship)', energyCost: 35, difficulty: 6, risk: 'low' },
      { id: 'provocative_spectacle', label: 'Provocative Multimedia Installation (Radical creativity)', energyCost: 55, difficulty: 9, risk: 'high' },
      { id: 'human_centered', label: 'Emotive Human-Centered Design (Deep user connection)', energyCost: 45, difficulty: 7, risk: 'medium' }
    ],
    prizes: {
      gold: { cash: 300, exp: 75, rep: 30, title: 'Prisma Design Gala Grand Laureate' },
      silver: { cash: 160, exp: 45, rep: 18, title: 'Prisma Design Gala Silver Award' },
      bronze: { cash: 80, exp: 25, rep: 10, title: 'Prisma Design Gala Bronze Award' },
      participant: { cash: 0, exp: 15, rep: 4, title: 'Design Gala Exhibitor' }
    }
  }
};

// Achievements & Life Milestones Catalog
export const ACHIEVEMENTS = [
  // Mastery & Progression
  { id: 'first_specialization', category: 'Mastery', name: 'Chosen Path', desc: 'Unlock and adopt your first skill specialization.', icon: 'progress', hidden: false },
  { id: 'skill_master', category: 'Mastery', name: 'Master of Craft', desc: 'Reach maximum Level 10 in any skill discipline.', icon: 'progress', hidden: false },
  { id: 'multi_disciplined', category: 'Mastery', name: 'Polymath in the Making', desc: 'Reach Level 5 in at least four distinct skills.', icon: 'progress', hidden: false },

  // Competitions & Challenges
  { id: 'first_podium', category: 'Competitions', name: 'Podium Finish', desc: 'Win a Gold, Silver, or Bronze medal in an official city competition.', icon: 'career', hidden: false },
  { id: 'grand_champion', category: 'Competitions', name: 'Grand Champion', desc: 'Earn first place (Gold) in any premier competition.', icon: 'career', hidden: false },
  { id: 'endurance_triumph', category: 'Competitions', name: 'Coastal Strider', desc: 'Complete the Marina Grand Coastal 10K Marathon.', icon: 'career', hidden: false },

  // Organizations & Communities
  { id: 'guild_initiate', category: 'Organizations', name: 'Civic Member', desc: 'Join an established professional guild or community collective.', icon: 'people', hidden: false },
  { id: 'guild_leader', category: 'Organizations', name: 'Pillar of the Community', desc: 'Ascend to the highest leadership tier in an organization.', icon: 'people', hidden: false },
  { id: 'service_record', category: 'Organizations', name: 'Demonstrated Dedication', desc: 'Complete 10 organization contribution projects.', icon: 'people', hidden: false },

  // Professional & Career Mastery
  { id: 'executive_promotion', category: 'Career', name: 'Corporate Elevation', desc: 'Attain a Level 2 or Level 3 executive promotion in your career.', icon: 'career', hidden: false },
  { id: 'esteemed_reputation', category: 'Reputation', name: 'Distinguished Renown', desc: 'Attain 50 or higher reputation in any specialized domain.', icon: 'world', hidden: false },
  { id: 'citywide_respect', category: 'Reputation', name: 'Citywide Eminence', desc: 'Maintain positive reputation across all five social domains simultaneously.', icon: 'world', hidden: true },

  // Emergence & Discovery
  { id: 'social_connector', category: 'Social', name: 'Heart of the Quarter', desc: 'Build Friendly or higher relationships with at least 5 metropolitan residents.', icon: 'people', hidden: false },
  { id: 'independent_founder', category: 'Enterprise', name: 'Self-Made Visionary', desc: 'Found and operate an enterprise generating steady revenue.', icon: 'properties', hidden: false },
  { id: 'scholar_degree', category: 'Academics', name: 'University Graduate', desc: 'Complete a full Bachelor degree curriculum at Metropolitan University.', icon: 'education', hidden: false },

  // Phase 5 Narrative Milestones
  { id: 'first_story_resolution', category: 'Narrative', name: 'Living Chronicle', desc: 'Directly participate in the resolution of an emergent neighborhood storyline.', icon: 'world', hidden: false },
  { id: 'storyteller_legend', category: 'Narrative', name: 'Architect of Destinies', desc: 'Resolve three or more multi-stage emergent storylines across the city.', icon: 'world', hidden: false },

  // Phase 6 Generational & Legacy Milestones
  { id: 'family_foundation', category: 'Family', name: 'Family Foundation', desc: 'Establish an enduring family household through marriage or committed partnership.', icon: 'people', hidden: false },
  { id: 'next_generation', category: 'Family', name: 'Nurtured Horizon', desc: 'Raise a child through their formative years to reach adulthood.', icon: 'people', hidden: false },
  { id: 'family_heirloom', category: 'Legacy', name: 'Keeper of the Mantle', desc: 'Consecrate and preserve a cherished family heirloom with documented provenance.', icon: 'progress', hidden: false },
  { id: 'family_historian', category: 'Legacy', name: 'Keeper of Truths', desc: 'Investigate oral lore and verify a historical family mystery.', icon: 'journal', hidden: false },
  { id: 'torchbearer', category: 'Succession', name: 'Torchbearer', desc: 'Successfully transition the family simulation to an eligible successor generation.', icon: 'progress', hidden: false },
  { id: 'dynasty_builder', category: 'Succession', name: 'Endless Story', desc: 'Sustain your lineage across multiple generations with enduring honor and assets.', icon: 'world', hidden: true }
];

// ==============================================================================
// PHASE 5 - EMERGENT WORLD & STORYTELLING DATA DEFINITIONS
// ==============================================================================

export const MAX_ACTIVE_STORIES = 6;
export const MAX_STORY_HISTORY = 40;

export const STORY_TEMPLATES = {
  // 1. Cafe Artisanal Expansion vs Landlord Pressure
  cafe_artisanal_expansion: {
    id: 'cafe_artisanal_expansion',
    theme: 'commercial_community',
    title: 'The Artisanal Roastery Initiative',
    location: 'cafe',
    primaryNpc: 'dani',
    secondaryNpc: 'teo',
    minClock: 0,
    cooldownDays: 21,
    cadenceDays: 14,
    // Trigger when Dani has positive relation or world memory exists of cafe interaction
    triggerCondition: (state) => {
      const rel = state.relations?.dani || 0;
      return rel >= 10;
    },
    rumor: {
      title: 'Rumors of Corner Cafe expanding with artisanal specialty roasts',
      context: 'Dani is reportedly scouting regional direct-trade bean suppliers, but negotiations with commercial landlords remain tense.',
      location: 'cafe'
    },
    stages: [
      {
        id: 'inciting',
        title: 'Supplier Disagreement',
        summary: 'Dani is seeking high-altitude direct-trade beans for a new signature brew, but Teo warns that maritime freight delays could bankrupt the venture.',
        durationDays: 4,
        discovery: {
          location: 'cafe',
          npc: 'dani',
          hint: 'Visit Corner Cafe to hear about Dani and Teo\'s supplier debate.'
        },
        choices: [
          {
            id: 'negotiate_supply',
            label: 'Mediate a Compromise with Teo',
            desc: 'Use negotiation skills and market standing to draft a phased delivery guarantee.',
            requirements: { skills: { negotiation: 2 }, energy: 20 },
            consequences: {
              energy: -20,
              skillExp: { negotiation: 15 },
              exp: 20,
              reputation: { community: 4, professional: 3 },
              relations: { dani: 8, teo: 6 },
              memory: 'Pithe negotiated a balanced delivery contract between Dani and Teo.',
              delayed: {
                delayMinutes: 2880, // 2 days
                title: 'Roastery Equipment Shipment Arrives',
                action: 'story_advance',
                data: { targetStage: 'escalation_success' }
              }
            },
            nextStage: 'waiting_shipment'
          },
          {
            id: 'sponsor_capital',
            label: 'Invest 80 Money Directly',
            desc: 'Provide immediate bridge financing to guarantee upfront bulk purchase.',
            requirements: { money: 80, energy: 10 },
            consequences: {
              money: -80,
              energy: -10,
              exp: 25,
              reputation: { community: 8 },
              relations: { dani: 14 },
              memory: 'Pithe provided seed capital for the Corner Cafe specialty roastery.',
              delayed: {
                delayMinutes: 2880,
                title: 'Custom Roaster Installed',
                action: 'story_advance',
                data: { targetStage: 'escalation_success' }
              }
            },
            nextStage: 'waiting_shipment'
          },
          {
            id: 'counsel_caution',
            label: 'Advise Against Risky Expansion',
            desc: 'Point out market volatility and advise Dani to keep current low-overhead operations.',
            requirements: { skills: { research: 2 }, energy: 15 },
            consequences: {
              energy: -15,
              skillExp: { research: 12 },
              exp: 15,
              reputation: { professional: 5 },
              relations: { teo: 10, dani: -2 },
              memory: 'Pithe counseled Corner Cafe against over-leveraging on regional imports.',
              nextStage: 'conservative_resolution'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'Without intervention, Dani and Teo had a heated debate; Teo offered a partial wholesale loan on strict margin terms.',
          consequences: {
            relationsMod: { dani: -2 },
            memory: 'Dani accepted restrictive supplier terms from Teo without independent mediation.'
          },
          nextStage: 'escalation_autonomous'
        }
      },
      {
        id: 'waiting_shipment',
        title: 'Awaiting Roastery Shipment',
        summary: 'Logistics are in motion across the Harbor transit docks. Anticipation builds around the cafe.',
        durationDays: 3,
        ambientOnly: true
      },
      {
        id: 'escalation_success',
        title: 'Tasting Night Launch',
        summary: 'The beans have arrived and roast tests are underway. Dani invites the neighborhood for an inaugural cupping session.',
        durationDays: 3,
        discovery: {
          location: 'cafe',
          npc: 'dani',
          hint: 'Dani is hosting a celebratory public tasting session at the Corner Cafe.'
        },
        choices: [
          {
            id: 'host_tasting',
            label: 'Help Host & Present the Cupping Session',
            desc: 'Guide visitors through tasting profiles and handle customer orders.',
            requirements: { energy: 25 },
            consequences: {
              energy: -25,
              skillExp: { conversation: 15, cooking: 10 },
              exp: 30,
              money: 35,
              reputation: { community: 6, creative: 4 },
              relations: { dani: 10, teo: 5 },
              memory: 'The Corner Cafe artisanal launch was a resounding community triumph.',
              resolved: true,
              outcomeState: 'triumph'
            }
          },
          {
            id: 'critique_quietly',
            label: 'Attend as a Quiet Patron',
            desc: 'Enjoy the new roast quietly and provide constructive feedback on notes and aroma.',
            requirements: { energy: 10 },
            consequences: {
              energy: -10,
              satiety: 15,
              exp: 15,
              relations: { dani: 5 },
              memory: 'Pithe attended the successful launch of Corner Cafe\'s artisanal roast.',
              resolved: true,
              outcomeState: 'moderate_success'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The tasting night proceeded smoothly with steady local turnout.',
          consequences: {
            memory: 'Corner Cafe successfully introduced its seasonal roast to harbor regulars.'
          },
          resolved: true,
          outcomeState: 'moderate_success'
        }
      },
      {
        id: 'escalation_autonomous',
        title: 'Margin Squeeze',
        summary: 'Tight wholesale terms have strained Dani\'s budget, forcing a compromise on packaging and staffing.',
        durationDays: 3,
        discovery: {
          location: 'cafe',
          npc: 'dani',
          hint: 'Dani looks exhausted behind the cafe counter.'
        },
        choices: [
          {
            id: 'volunteer_shift',
            label: 'Volunteer an Evening Shift',
            desc: 'Step behind the counter for free to alleviate rush hour pressure.',
            requirements: { energy: 30 },
            consequences: {
              energy: -30,
              skillExp: { conversation: 12 },
              exp: 20,
              relations: { dani: 12 },
              reputation: { community: 5 },
              memory: 'Pithe helped Dani weather a difficult launch evening at Corner Cafe.',
              resolved: true,
              outcomeState: 'hard_won_success'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'Dani scaled back the coffee menu to survive the wholesale costs without external help.',
          consequences: {
            memory: 'Corner Cafe absorbed supplier costs through longer hours and leaner operations.'
          },
          resolved: true,
          outcomeState: 'strained_resolution'
        }
      },
      {
        id: 'conservative_resolution',
        title: 'Prudent Realignment',
        summary: 'Dani decided to focus on home-baked treats and existing menu improvements rather than risky roasting gear.',
        durationDays: 1,
        resolved: true,
        outcomeState: 'stable_caution'
      }
    ]
  },

  // 2. Open-Source Academic IP & Ethics Dilemma
  academic_open_source_dilemma: {
    id: 'academic_open_source_dilemma',
    theme: 'technology_ethics',
    title: 'The Algorithmic Commons',
    location: 'tech_park',
    primaryNpc: 'chloe',
    secondaryNpc: 'marcus',
    minClock: 0,
    cooldownDays: 28,
    cadenceDays: 18,
    triggerCondition: (state) => {
      const prog = state.character.skills?.programming?.level || 0;
      const res = state.character.skills?.research?.level || 0;
      return prog >= 2 || res >= 2;
    },
    rumor: {
      title: 'Debate heating up over Tech Park algorithmic library license',
      context: 'Chloe and corporate sponsors are clashing over whether a breakthrough data pipeline should remain open-source or proprietary.',
      location: 'tech_park'
    },
    stages: [
      {
        id: 'inciting',
        title: 'License Dispute',
        summary: 'Chloe built an efficient decentralized data library, but Marcus Vance wants Apex Corporation to acquire an exclusive commercial license.',
        durationDays: 5,
        discovery: {
          location: 'tech_park',
          npc: 'chloe',
          hint: 'Chloe is reviewing code licensing documents in the Tech Park atrium.'
        },
        choices: [
          {
            id: 'defend_open_source',
            label: 'Help Chloe Draft Permissive Dual-License',
            desc: 'Contribute technical documentation establishing open public access with commercial enterprise clauses.',
            requirements: { skills: { programming: 2 }, energy: 25 },
            consequences: {
              energy: -25,
              skillExp: { programming: 20, writing: 10 },
              exp: 25,
              reputation: { academic: 6, creative: 5, professional: -2 },
              relations: { chloe: 12, marcus: -4 },
              memory: 'Pithe defended open-source commons alongside Chloe at Tech Park.',
              delayed: {
                delayMinutes: 4320, // 3 days
                title: 'Global Developer Community Adopts Framework',
                action: 'story_advance',
                data: { targetStage: 'open_triumph' }
              }
            },
            nextStage: 'waiting_adoption'
          },
          {
            id: 'broker_commercial_deal',
            label: 'Advise Chloe to Accept Marcus\'s Buyout',
            desc: 'Argue that capital injection and corporate resources will yield greater long-term impact and personal wealth.',
            requirements: { skills: { negotiation: 2 }, energy: 20 },
            consequences: {
              energy: -20,
              skillExp: { negotiation: 18 },
              exp: 25,
              reputation: { professional: 8, academic: -3 },
              relations: { marcus: 12, chloe: -2 },
              memory: 'Pithe facilitated a lucrative enterprise acquisition for Chloe\'s software pipeline.',
              delayed: {
                delayMinutes: 4320,
                title: 'Apex Commercial Launch',
                action: 'story_advance',
                data: { targetStage: 'corporate_launch' }
              }
            },
            nextStage: 'waiting_adoption'
          }
        ],
        autonomousOutcome: {
          summary: 'Without Pithe\'s input, Chloe chose a standard MIT license, while Marcus quietly redirected capital to internal engineering.',
          consequences: {
            memory: 'Chloe released the code library under a permissive license independently.'
          },
          nextStage: 'open_triumph'
        }
      },
      {
        id: 'waiting_adoption',
        title: 'Ecosystem Deliberation',
        summary: 'Tech forums and corporate legal teams are reviewing the repository documentation.',
        durationDays: 3,
        ambientOnly: true
      },
      {
        id: 'open_triumph',
        title: 'Global Community Recognition',
        summary: 'The project reached thousands of GitHub stars. Chloe invites contributors to celebrate at the Tech Park cafeteria.',
        durationDays: 3,
        discovery: {
          location: 'tech_park',
          npc: 'chloe',
          hint: 'Tech Park developers are celebrating an open-source milestone.'
        },
        choices: [
          {
            id: 'give_keynote',
            label: 'Deliver a Lightning Architecture Talk',
            desc: 'Share architectural principles of sustainable open software with the assembled developers.',
            requirements: { skills: { communication: 4 }, energy: 20 },
            consequences: {
              energy: -20,
              exp: 35,
              skillExp: { programming: 15, conversation: 15 },
              reputation: { academic: 8, creative: 6 },
              relations: { chloe: 8 },
              memory: 'Pithe delivered a celebrated technical talk on open architectural stewardship.',
              resolved: true,
              outcomeState: 'open_triumph'
            }
          },
          {
            id: 'mingle_developers',
            label: 'Mingle and Exchange Contacts',
            desc: 'Network with local software engineers and data scientists.',
            requirements: { energy: 10 },
            consequences: {
              energy: -10,
              exp: 20,
              reputation: { professional: 4, community: 4 },
              relations: { chloe: 4 },
              memory: 'Pithe networked with software engineers celebrating Chloe\'s project release.',
              resolved: true,
              outcomeState: 'open_triumph'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The release concluded peacefully with solid adoption among university students and engineers.',
          consequences: {
            memory: 'The open-source library established itself as a reliable community standard.'
          },
          resolved: true,
          outcomeState: 'open_triumph'
        }
      },
      {
        id: 'corporate_launch',
        title: 'Commercial Suite Release',
        summary: 'Apex Corporation unveiled the enterprise solution with executive fanfare in Downtown.',
        durationDays: 3,
        discovery: {
          location: 'downtown',
          npc: 'marcus',
          hint: 'Marcus Vance is hosting a corporate briefing downtown.'
        },
        choices: [
          {
            id: 'attend_press_conference',
            label: 'Attend Corporate Executive Briefing',
            desc: 'Stand alongside Marcus as an advisor during the corporate press demonstration.',
            requirements: { energy: 20 },
            consequences: {
              energy: -20,
              money: 100, // Consulting honorarium
              exp: 30,
              reputation: { professional: 10, community: -2 },
              relations: { marcus: 10 },
              memory: 'Pithe stood as executive technology advisor for Apex Corporation\'s software rollout.',
              resolved: true,
              outcomeState: 'corporate_triumph'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The corporate launch met commercial targets with notable enterprise sales.',
          consequences: {
            memory: 'Apex Corporation integrated Chloe\'s architecture into their proprietary stack.'
          },
          resolved: true,
          outcomeState: 'corporate_triumph'
        }
      }
    ]
  },

  // 3. Lantern Market Historical Preservation vs Urban Modernization
  market_preservation_initiative: {
    id: 'market_preservation_initiative',
    theme: 'community_heritage',
    title: 'The Lantern Quarter Legacy',
    location: 'market',
    primaryNpc: 'teo',
    secondaryNpc: 'julian',
    minClock: 0,
    cooldownDays: 28,
    cadenceDays: 21,
    triggerCondition: (state) => {
      const relTeo = state.relations?.teo || 0;
      return relTeo >= 8;
    },
    rumor: {
      title: 'Planning council debating modern glass canopy over historic Lantern Market',
      context: 'Stallholders fear gentrification and eviction, while city planners cite storm-proofing and increased tourism.',
      location: 'market'
    },
    stages: [
      {
        id: 'inciting',
        title: 'Notice of Redevelopment',
        summary: 'A municipal notice proposes replacing the traditional wooden rafters and paper lantern arrays with a prefabricated glass pavilion. Teo is rallying stallholders.',
        durationDays: 5,
        discovery: {
          location: 'market',
          npc: 'teo',
          hint: 'Teo is distributing petition leaflets near his spice stall.'
        },
        choices: [
          {
            id: 'sign_and_organize',
            label: 'Author an Architectural Preservation Brief',
            desc: 'Catalog the historical joinery and communal significance of the market rafters to submit to the civic board.',
            requirements: { skills: { writing: 2, research: 2 }, energy: 25 },
            consequences: {
              energy: -25,
              skillExp: { writing: 18, research: 15 },
              exp: 25,
              reputation: { community: 10, creative: 5 },
              relations: { teo: 14, mira: 6 },
              memory: 'Pithe authored a heritage defense brief protecting Lantern Market\'s historic architecture.',
              delayed: {
                delayMinutes: 4320,
                title: 'Municipal Hearing Convenes',
                action: 'story_advance',
                data: { targetStage: 'civic_hearing' }
              }
            },
            nextStage: 'waiting_hearing'
          },
          {
            id: 'advocate_modern_hybrid',
            label: 'Propose a Hybrid Artisan Pavilion',
            desc: 'Liaise with urban designers like Julian to preserve the timber core while integrating rain water collection and solar lanterns.',
            requirements: { skills: { design: 2 }, energy: 20 },
            consequences: {
              energy: -20,
              skillExp: { design: 18, negotiation: 12 },
              exp: 25,
              reputation: { professional: 6, community: 6 },
              relations: { julian: 10, teo: 6 },
              memory: 'Pithe proposed an award-winning ecological modernization compromise for Lantern Market.',
              delayed: {
                delayMinutes: 4320,
                title: 'Municipal Hearing Convenes',
                action: 'story_advance',
                data: { targetStage: 'civic_hearing' }
              }
            },
            nextStage: 'waiting_hearing'
          }
        ],
        autonomousOutcome: {
          summary: 'Stallholders organized an impromptu demonstration; council delayed the vote to next quarter.',
          consequences: {
            memory: 'Market vendors rallied independently to hold off structural demolition.'
          },
          nextStage: 'civic_hearing'
        }
      },
      {
        id: 'waiting_hearing',
        title: 'Civic Deliberation',
        summary: 'The city planning committee is reviewing community testimonials.',
        durationDays: 3,
        ambientOnly: true
      },
      {
        id: 'civic_hearing',
        title: 'City Council Public Forum',
        summary: 'The municipal auditorium opens for final remarks before the district zoning vote.',
        durationDays: 3,
        discovery: {
          location: 'university',
          npc: 'elena',
          hint: 'The public urban planning hearing is underway at University Hall.'
        },
        choices: [
          {
            id: 'speak_at_podium',
            label: 'Deliver Final Testimonial at the Podium',
            desc: 'Deliver a moving impassioned speech on the cultural lifeblood of neighborhood markets.',
            requirements: { skills: { conversation: 2 }, energy: 25 },
            consequences: {
              energy: -25,
              skillExp: { conversation: 20 },
              exp: 35,
              reputation: { community: 12, academic: 5 },
              relations: { teo: 12, elena: 6 },
              memory: 'Pithe swayed the municipal council to confer protected heritage landmark status on Lantern Market.',
              resolved: true,
              outcomeState: 'landmark_protection'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The council approved a compromise protective easement without further testimony.',
          consequences: {
            memory: 'Lantern Market secured standard municipal heritage safeguards.'
          },
          resolved: true,
          outcomeState: 'standard_protection'
        }
      }
    ]
  },

  // 4. University Academic Debate & Scholarly Rivalry
  academic_symposium_rivalry: {
    id: 'academic_symposium_rivalry',
    theme: 'academic_intellectual',
    title: 'The Epistemic Symposium',
    location: 'university',
    primaryNpc: 'elena',
    secondaryNpc: 'mira',
    minClock: 0,
    cooldownDays: 28,
    cadenceDays: 21,
    triggerCondition: (state) => {
      const res = state.character.skills?.research?.level || 0;
      return res >= 2 || (state.relations?.elena || 0) >= 10;
    },
    rumor: {
      title: 'Controversy erupts over economic history symposium thesis',
      context: 'Dr. Rostova and visiting scholars disagree on quantitative modeling of labor transitions.',
      location: 'university'
    },
    stages: [
      {
        id: 'inciting',
        title: 'Scholarly Impasse',
        summary: 'Dr. Elena Rostova is preparing a keynote thesis defending humanistic socio-economic metrics against purely algorithmic financial forecasting.',
        durationDays: 4,
        discovery: {
          location: 'university',
          npc: 'elena',
          hint: 'Dr. Rostova is cross-referencing archival manuscripts at the University Archive.'
        },
        choices: [
          {
            id: 'conduct_data_synthesis',
            label: 'Compile Longitudinal Historical Data',
            desc: 'Spend hours synthesizing harbor trade archives into an empirical rebuttal supporting Elena\'s thesis.',
            requirements: { skills: { research: 2, writing: 2 }, energy: 30 },
            consequences: {
              energy: -30,
              skillExp: { research: 25, writing: 15 },
              exp: 30,
              reputation: { academic: 12 },
              relations: { elena: 15, mira: 6 },
              memory: 'Pithe co-authored the empirical defense for Dr. Rostova\'s keynote thesis.',
              delayed: {
                delayMinutes: 2880,
                title: 'Symposium Keynote Session',
                action: 'story_advance',
                data: { targetStage: 'symposium_defense' }
              }
            },
            nextStage: 'waiting_symposium'
          },
          {
            id: 'critique_assumptions',
            label: 'Rigorously Critique the Epistemology',
            desc: 'Challenge Elena\'s premises to eliminate vulnerabilities before peer reviewers attack them.',
            requirements: { skills: { research: 3 }, energy: 20 },
            consequences: {
              energy: -20,
              skillExp: { research: 22 },
              exp: 25,
              reputation: { academic: 8 },
              relations: { elena: 10 },
              memory: 'Pithe served as rigorous internal devil\'s advocate for Dr. Rostova.',
              delayed: {
                delayMinutes: 2880,
                title: 'Symposium Keynote Session',
                action: 'story_advance',
                data: { targetStage: 'symposium_defense' }
              }
            },
            nextStage: 'waiting_symposium'
          }
        ],
        autonomousOutcome: {
          summary: 'Dr. Rostova finalized her lecture outline independently late into the night.',
          consequences: {
            memory: 'Dr. Rostova finalized her symposium keynote through solitary research.'
          },
          nextStage: 'symposium_defense'
        }
      },
      {
        id: 'waiting_symposium',
        title: 'Preparation & Peer Review',
        summary: 'Faculty members are reviewing draft preprints throughout the lecture halls.',
        durationDays: 2,
        ambientOnly: true
      },
      {
        id: 'symposium_defense',
        title: 'The Keynote Lecture',
        summary: 'Elena presents her findings before a full auditorium of economists, academics, and civic leaders.',
        durationDays: 3,
        discovery: {
          location: 'university',
          npc: 'elena',
          hint: 'The keynote symposium lecture is underway in the grand amphitheater.'
        },
        choices: [
          {
            id: 'field_qa_inquiries',
            label: 'Field Inquiries from the Floor',
            desc: 'Step up to the microphone during open discussion to clarify key empirical findings.',
            requirements: { skills: { conversation: 2 }, energy: 20 },
            consequences: {
              energy: -20,
              exp: 30,
              skillExp: { conversation: 15, research: 10 },
              reputation: { academic: 10, community: 5 },
              relations: { elena: 8 },
              memory: 'Pithe defended the symposium paper during intense academic Q&A.',
              resolved: true,
              outcomeState: 'academic_acclaim'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The lecture concluded with respectful applause and healthy scholarly discourse.',
          consequences: {
            memory: 'The University symposium concluded successfully.'
          },
          resolved: true,
          outcomeState: 'academic_acclaim'
        }
      }
    ]
  },

  // 5. Marina Coastal Environmental Initiative & Yacht Club Friction
  marina_coastal_cleanup_initiative: {
    id: 'marina_coastal_cleanup_initiative',
    theme: 'community_ecology',
    title: 'Tides of the Marina',
    location: 'marina',
    primaryNpc: 'julian',
    secondaryNpc: 'marcus',
    minClock: 0,
    cooldownDays: 28,
    cadenceDays: 21,
    triggerCondition: (state) => {
      const relJulian = state.relations?.julian || 0;
      const fit = state.character.skills?.fitness?.level || 0;
      return relJulian >= 6 || fit >= 2;
    },
    rumor: {
      title: 'Marina basin clean-up effort clashing with private regatta slipway schedules',
      context: 'Environmental volunteers are demanding slipway closures to dredge plastics, frustrating luxury yacht owners.',
      location: 'marina'
    },
    stages: [
      {
        id: 'inciting',
        title: 'The Debris Accord',
        summary: 'Winter tides have accumulated microplastics along the harbor breakwater. Julian wants to coordinate a neighborhood shoreline restoration, but private berth owners object to heavy equipment access.',
        durationDays: 5,
        discovery: {
          location: 'marina',
          npc: 'julian',
          hint: 'Julian is inspecting tide lines along the Marina boardwalk.'
        },
        choices: [
          {
            id: 'organize_volunteer_drive',
            label: 'Mobilize Civic Volunteers for Low-Impact Dredging',
            desc: 'Rally local residents to clear the shoreline by hand and kayak without blocking private slips.',
            requirements: { skills: { conversation: 2, fitness: 1 }, energy: 30 },
            consequences: {
              energy: -30,
              skillExp: { fitness: 20, conversation: 15 },
              exp: 30,
              reputation: { community: 10, athletic: 6 },
              relations: { julian: 14, marcus: 4 },
              memory: 'Pithe led a successful low-impact citizen cleanup along the Marina shoreline.',
              delayed: {
                delayMinutes: 2880,
                title: 'Clear Waters & Shoreline Celebration',
                action: 'story_advance',
                data: { targetStage: 'marina_triumph' }
              }
            },
            nextStage: 'waiting_cleanup'
          },
          {
            id: 'negotiate_berth_access',
            label: 'Negotiate Corporate Sponsorship from Marcus',
            desc: 'Convince Marcus Vance to fund biodegradable booms and position it as corporate ESG stewardship.',
            requirements: { skills: { negotiation: 2 }, energy: 20 },
            consequences: {
              energy: -20,
              skillExp: { negotiation: 20 },
              exp: 25,
              reputation: { professional: 8, community: 6 },
              relations: { marcus: 10, julian: 8 },
              memory: 'Pithe secured corporate green sponsorship for the Marina basin restoration.',
              delayed: {
                delayMinutes: 2880,
                title: 'Clear Waters & Shoreline Celebration',
                action: 'story_advance',
                data: { targetStage: 'marina_triumph' }
              }
            },
            nextStage: 'waiting_cleanup'
          }
        ],
        autonomousOutcome: {
          summary: 'Julian and marina staff cleared accessible sections at low tide with modest success.',
          consequences: {
            memory: 'Marina boardwalk shoreline was partially cleared by municipal maintenance.'
          },
          nextStage: 'marina_triumph'
        }
      },
      {
        id: 'waiting_cleanup',
        title: 'Restoration Operations',
        summary: 'Silt nets and sorting bins are active across the bayside pier.',
        durationDays: 2,
        ambientOnly: true
      },
      {
        id: 'marina_triumph',
        title: 'Boardwalk Shoreline Regatta',
        summary: 'With clean waters and pristine banks, the bayside boardwalk hosts an open-air celebration.',
        durationDays: 3,
        discovery: {
          location: 'marina',
          npc: 'julian',
          hint: 'The bayside boardwalk is bustling with celebrations and clean water displays.'
        },
        choices: [
          {
            id: 'run_coastal_fun_run',
            label: 'Lead the Sunset Boardwalk 5K Run',
            desc: 'Join Julian and waterfront athletes in a celebratory shoreline run.',
            requirements: { skills: { fitness: 2 }, energy: 25 },
            consequences: {
              energy: -25,
              skillExp: { fitness: 25 },
              exp: 30,
              reputation: { athletic: 10, community: 6 },
              relations: { julian: 8 },
              memory: 'Pithe led the celebratory sunset boardwalk shoreline run.',
              resolved: true,
              outcomeState: 'clean_water_triumph'
            }
          }
        ],
        autonomousOutcome: {
          summary: 'The community gathered along the pier as dusk fell over the sparkling harbor.',
          consequences: {
            memory: 'The marina restoration celebration concluded happily.'
          },
          resolved: true,
          outcomeState: 'clean_water_triumph'
        }
      }
    ]
  }
};
