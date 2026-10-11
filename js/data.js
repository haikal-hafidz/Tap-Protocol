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
