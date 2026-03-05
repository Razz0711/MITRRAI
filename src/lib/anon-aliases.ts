// ============================================
// MitrAI - Anonymous Chat Alias Generator
// Creates fun random aliases like "CoolFox#4821"
// ============================================

const ADJECTIVES = [
  'Cool', 'Chill', 'Brave', 'Wise', 'Swift', 'Quiet', 'Bold', 'Wild',
  'Eager', 'Happy', 'Lucky', 'Calm', 'Kind', 'Fair', 'Pure', 'Free',
  'Warm', 'Keen', 'Shy', 'Sly', 'Deep', 'Soft', 'Loud', 'Fast',
  'Zen', 'Hazy', 'Lazy', 'Cozy', 'Funky', 'Goofy', 'Witty', 'Nerdy',
  'Rosy', 'Icy', 'Fizzy', 'Dizzy', 'Fuzzy', 'Sunny', 'Rainy', 'Misty',
  'Lunar', 'Solar', 'Neon', 'Retro', 'Pixel', 'Astro', 'Cyber', 'Ultra',
  'Mega', 'Turbo', 'Hyper', 'Super', 'Cosmic', 'Mystic', 'Shadow', 'Dream',
  'Sonic', 'Magic', 'Royal', 'Noble', 'Ghost', 'Ember', 'Storm', 'Blaze',
  'Frost', 'Spark', 'Flash', 'Drift', 'Stealth', 'Ninja', 'Sigma', 'Alpha',
];

const ANIMALS = [
  'Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Deer', 'Lion', 'Tiger',
  'Eagle', 'Panda', 'Koala', 'Otter', 'Bunny', 'Kitty', 'Puppy', 'Duck',
  'Crow', 'Frog', 'Whale', 'Shark', 'Dolphin', 'Parrot', 'Cobra', 'Phoenix',
  'Dragon', 'Lynx', 'Raven', 'Falcon', 'Jaguar', 'Panther', 'Gecko', 'Mango',
  'Pika', 'Robin', 'Crane', 'Stork', 'Bison', 'Moose', 'Llama', 'Sloth',
  'Hedgehog', 'Penguin', 'Raccoon', 'Badger', 'Turtle', 'Beetle', 'Moth', 'Mantis',
  'Firefly', 'Sparrow', 'Pigeon', 'Octopus', 'Starfish', 'Seahorse', 'Chameleon',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random alias like "CoolFox#4821"
 */
export function generateAlias(): string {
  const adj = randomFrom(ADJECTIVES);
  const animal = randomFrom(ANIMALS);
  const num = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
  return `${adj}${animal}#${num}`;
}

/**
 * Room type display config
 */
export const ROOM_TYPES = [
  { id: 'vent',       label: 'Vent & Support',  emoji: '', description: 'Share what\'s on your mind', color: '#6366f1' },
  { id: 'night_owl',  label: 'Night Owl Chat',  emoji: '', description: 'Late night talks (11PM-4AM)', color: '#8b5cf6' },
  { id: 'confession', label: 'Confession',       emoji: '', description: 'Get it off your chest',     color: '#ec4899' },
  { id: 'career',     label: 'Career Anxiety',   emoji: '', description: 'Placements, internships, future', color: '#f59e0b' },
  { id: 'crush',      label: 'Crush Advice',     emoji: '', description: 'Anonymous love advice',     color: '#ef4444' },
  { id: 'radar',      label: 'Radar Connect',    emoji: '', description: 'Anonymous broadcast chat',   color: '#10b981' },
] as const;

export type AnonRoomType = typeof ROOM_TYPES[number]['id'];

/**
 * Pricing tiers
 */
export const ANON_PRICING = [
  { plan: 'weekly',   label: 'Weekly',   price: 19,  priceLabel: '₹19/week',     durationDays: 7   },
  { plan: 'monthly',  label: 'Monthly',  price: 49,  priceLabel: '₹49/month',    durationDays: 30  },
  { plan: 'semester', label: 'Semester', price: 199, priceLabel: '₹199/semester', durationDays: 180 },
] as const;

/**
 * UPI Payment config — update UPI_ID with your actual UPI address
 */
export const UPI_CONFIG = {
  upiId: '7061001946@ybl',
  merchantName: 'Raj Kumar',
  note: 'MitrAI Anon Chat',
};
