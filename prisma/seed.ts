/**
 * Seed script — run with `npx prisma db seed` (configured in prisma7.config.ts).
 *
 * - Upserts the 18 categories from BRD §2 (safe to re-run; admins may add more later).
 * - Deletes previous seed users (emails ending in @seed.gathr.dev); cascades remove their
 *   activities, join requests, messages and notifications. Then recreates everything.
 * - Uses a seeded PRNG so the data is the same on every run (dates are relative to "now").
 *
 * This is a plain Node script, so it creates its own Prisma client instead of importing
 * src/lib/db.ts (which is `server-only` and only works inside Next.js).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  ActivityStatus,
  JoinMode,
  JoinRequestStatus,
  NotificationType,
  PrismaClient,
  SkillLevel,
  type Prisma,
} from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEED_EMAIL_DOMAIN = "seed.gathr.dev";

// ─── Deterministic randomness ───────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261023);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const shuffle = <T>(items: readonly T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
/** ~±650 m of jitter so pins in the same locality don't stack. */
const jitter = (value: number) => value + (rand() - 0.5) * 0.012;

// ─── Time helpers (activities are planned in IST, stored in UTC) ────────────

const NOW = new Date();
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const IST_OFFSET_MINUTES = 330;

/** A Date for `hour:minute` IST, `dayOffset` days from today (IST). */
function istDate(dayOffset: number, hour: number, minute = 0) {
  const istNow = new Date(NOW.getTime() + IST_OFFSET_MINUTES * MINUTE);
  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + dayOffset,
      hour,
      minute - IST_OFFSET_MINUTES,
    ),
  );
}
const minDate = (a: Date, b: Date) => (a < b ? a : b);

// ─── Categories (BRD §2) ────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "sports-fitness", name: "Sports & Fitness", icon: "Dumbbell" },
  { slug: "music", name: "Music", icon: "Music" },
  { slug: "dance", name: "Dance", icon: "Footprints" },
  { slug: "events-concerts", name: "Events & Concerts", icon: "Ticket" },
  { slug: "workshops", name: "Workshops", icon: "Hammer" },
  { slug: "learning-tuition", name: "Learning & Tuition", icon: "GraduationCap" },
  { slug: "tutorials-tech-talks", name: "Tutorials & Tech Talks", icon: "Laptop" },
  { slug: "podcasts-content", name: "Podcasts & Content", icon: "Mic" },
  { slug: "communication-speaking", name: "Communication & Speaking", icon: "MessagesSquare" },
  { slug: "civic-national-interest", name: "Civic & National Interest", icon: "Landmark" },
  { slug: "helping-hands", name: "Helping Hands", icon: "HandHeart" },
  { slug: "cleanliness-drives", name: "Cleanliness Drives", icon: "Recycle" },
  { slug: "outdoors-travel", name: "Outdoors & Travel", icon: "Mountain" },
  { slug: "games-hobbies", name: "Games & Hobbies", icon: "Puzzle" },
  { slug: "food-social", name: "Food & Social", icon: "UtensilsCrossed" },
  { slug: "pets-animals", name: "Pets & Animals", icon: "PawPrint" },
  { slug: "wellness", name: "Wellness", icon: "Leaf" },
  { slug: "other", name: "Other", icon: "Sparkles" },
] as const;
type CategorySlug = (typeof CATEGORIES)[number]["slug"];

// ─── Places (approximate locality centres) ──────────────────────────────────

type Area = { name: string; lat: number; lng: number };
type City = "Pune" | "Mumbai" | "Sangli";

const AREAS: Record<City, Area[]> = {
  Pune: [
    { name: "Kothrud", lat: 18.5074, lng: 73.8077 },
    { name: "Baner", lat: 18.559, lng: 73.7868 },
    { name: "Koregaon Park", lat: 18.5362, lng: 73.894 },
    { name: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
    { name: "Aundh", lat: 18.558, lng: 73.8075 },
    { name: "Hadapsar", lat: 18.5089, lng: 73.926 },
    { name: "Shivajinagar", lat: 18.5308, lng: 73.8475 },
    { name: "Kalyani Nagar", lat: 18.5463, lng: 73.9033 },
  ],
  Mumbai: [
    { name: "Bandra West", lat: 19.0596, lng: 72.8295 },
    { name: "Andheri West", lat: 19.1364, lng: 72.8296 },
    { name: "Powai", lat: 19.1176, lng: 72.906 },
    { name: "Dadar", lat: 19.0178, lng: 72.8478 },
    { name: "Colaba", lat: 18.9067, lng: 72.8147 },
    { name: "Juhu", lat: 19.1075, lng: 72.8263 },
    { name: "Chembur", lat: 19.0522, lng: 72.9005 },
    { name: "Malad West", lat: 19.186, lng: 72.8485 },
  ],
  Sangli: [
    { name: "Sangli City", lat: 16.8524, lng: 74.5815 },
    { name: "Vishrambag", lat: 16.8395, lng: 74.61 },
    { name: "Miraj", lat: 16.8222, lng: 74.645 },
    { name: "Kupwad", lat: 16.882, lng: 74.631 },
  ],
};
const areaLabel = (city: City, area: Area) => `${area.name}, ${city}`;

// ─── Users ──────────────────────────────────────────────────────────────────

type SeedUser = {
  name: string;
  city: City;
  bio: string;
  languages: string[];
  interests: CategorySlug[];
  ageRange?: string;
};

const USERS: SeedUser[] = [
  // Pune
  {
    name: "Aarav Kulkarni",
    city: "Pune",
    bio: "Weekend cricketer, weekday backend dev.",
    languages: ["Marathi", "English", "Hindi"],
    interests: ["sports-fitness", "tutorials-tech-talks"],
    ageRange: "25-34",
  },
  {
    name: "Isha Deshpande",
    city: "Pune",
    bio: "Potter, plant parent, always up for a café meetup.",
    languages: ["Marathi", "English"],
    interests: ["workshops", "food-social", "wellness"],
    ageRange: "25-34",
  },
  {
    name: "Rohan Joshi",
    city: "Pune",
    bio: "Guitar, treks and terrible puns.",
    languages: ["Marathi", "Hindi", "English"],
    interests: ["music", "outdoors-travel"],
    ageRange: "18-24",
  },
  {
    name: "Sneha Patil",
    city: "Pune",
    bio: "Organising clean-ups along the Mula-Mutha.",
    languages: ["Marathi", "English"],
    interests: ["cleanliness-drives", "civic-national-interest", "helping-hands"],
    ageRange: "25-34",
  },
  {
    name: "Kabir Shah",
    city: "Pune",
    bio: "Frontend engineer. I run a small TypeScript meetup.",
    languages: ["English", "Hindi", "Gujarati"],
    interests: ["tutorials-tech-talks", "games-hobbies"],
    ageRange: "25-34",
  },
  {
    name: "Meera Gokhale",
    city: "Pune",
    bio: "Retired teacher. Book club and morning walks.",
    languages: ["Marathi", "English"],
    interests: ["learning-tuition", "games-hobbies", "wellness"],
    ageRange: "55+",
  },
  {
    name: "Arjun Pawar",
    city: "Pune",
    bio: "Football on weeknights, badminton on weekends.",
    languages: ["Marathi", "Hindi"],
    interests: ["sports-fitness"],
    ageRange: "18-24",
  },
  {
    name: "Tanvi Bhosale",
    city: "Pune",
    bio: "Salsa learner and street-food explorer.",
    languages: ["Marathi", "English", "Hindi"],
    interests: ["dance", "food-social"],
    ageRange: "25-34",
  },
  // Mumbai
  {
    name: "Vihaan Mehta",
    city: "Mumbai",
    bio: "Stand-up comedy fan. Will drag you to an open mic.",
    languages: ["Hindi", "English", "Gujarati"],
    interests: ["events-concerts", "music"],
    ageRange: "25-34",
  },
  {
    name: "Ananya Iyer",
    city: "Mumbai",
    bio: "Podcaster (food + cities). Looking for co-hosts.",
    languages: ["English", "Tamil", "Hindi"],
    interests: ["podcasts-content", "food-social"],
    ageRange: "25-34",
  },
  {
    name: "Zoya Khan",
    city: "Mumbai",
    bio: "Dog mom of two indies. Weekend shelter volunteer.",
    languages: ["Hindi", "English", "Urdu"],
    interests: ["pets-animals", "helping-hands"],
    ageRange: "25-34",
  },
  {
    name: "Siddharth Rao",
    city: "Mumbai",
    bio: "Runner. Sub-25 5K, slowly.",
    languages: ["English", "Kannada", "Hindi"],
    interests: ["sports-fitness", "wellness"],
    ageRange: "35-44",
  },
  {
    name: "Priya Nair",
    city: "Mumbai",
    bio: "Debate coach. Toastmasters regular.",
    languages: ["English", "Malayalam", "Hindi"],
    interests: ["communication-speaking", "learning-tuition"],
    ageRange: "35-44",
  },
  {
    name: "Aditya Sawant",
    city: "Mumbai",
    bio: "Photographer. Mumbai streets are my studio.",
    languages: ["Marathi", "Hindi", "English"],
    interests: ["workshops", "outdoors-travel"],
    ageRange: "25-34",
  },
  {
    name: "Neha Gupta",
    city: "Mumbai",
    bio: "Yoga teacher, chai enthusiast.",
    languages: ["Hindi", "English"],
    interests: ["wellness", "dance"],
    ageRange: "25-34",
  },
  {
    name: "Farhan Shaikh",
    city: "Mumbai",
    bio: "Board games and hackathons. Bring snacks.",
    languages: ["Hindi", "English", "Marathi"],
    interests: ["games-hobbies", "tutorials-tech-talks"],
    ageRange: "18-24",
  },
  // Sangli
  {
    name: "Omkar Mane",
    city: "Sangli",
    bio: "Kabaddi and cricket. Born and raised in Sangli.",
    languages: ["Marathi", "Hindi"],
    interests: ["sports-fitness", "civic-national-interest"],
    ageRange: "18-24",
  },
  {
    name: "Pooja Kadam",
    city: "Sangli",
    bio: "Tuition teacher. Science study groups on weekends.",
    languages: ["Marathi", "English"],
    interests: ["learning-tuition", "helping-hands"],
    ageRange: "25-34",
  },
  {
    name: "Swapnil Jadhav",
    city: "Sangli",
    bio: "Tabla player looking for jam partners.",
    languages: ["Marathi", "Hindi"],
    interests: ["music", "events-concerts"],
    ageRange: "25-34",
  },
  {
    name: "Rutuja Shinde",
    city: "Sangli",
    bio: "Volunteer at the Miraj blood bank.",
    languages: ["Marathi", "English"],
    interests: ["helping-hands", "wellness"],
    ageRange: "18-24",
  },
  {
    name: "Ganesh Chavan",
    city: "Sangli",
    bio: "Grape farmer, amateur bird watcher.",
    languages: ["Marathi", "Kannada"],
    interests: ["outdoors-travel", "pets-animals"],
    ageRange: "45-54",
  },
  {
    name: "Aishwarya More",
    city: "Sangli",
    bio: "Learning to code. Organising a small tech circle.",
    languages: ["Marathi", "English", "Hindi"],
    interests: ["tutorials-tech-talks", "communication-speaking"],
    ageRange: "18-24",
  },
];

// ─── Activity templates ({area} is replaced with the locality name) ─────────

type Template = {
  category: CategorySlug;
  title: string;
  description: string;
  venue: string;
  min: number;
  max: number;
  hour: number;
  minute?: number;
  duration: number;
  joinMode: JoinMode;
  skill: SkillLevel;
  tags: string[];
  whatToBring?: string;
  costNote?: string;
  preferenceNote?: string;
};

const TEMPLATES: Template[] = [
  {
    category: "sports-fitness",
    title: "Sunday morning tennis-ball cricket",
    description:
      "Friendly box-cricket style game, 6-over innings. We rotate teams so everyone bats and bowls. All levels welcome.",
    venue: "{area} Municipal Ground",
    min: 8,
    max: 12,
    hour: 7,
    duration: 150,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["cricket", "tennis-ball", "weekend"],
    whatToBring: "Water, cap, sports shoes",
    costNote: "Ball & tape ₹50 each",
  },
  {
    category: "sports-fitness",
    title: "Doubles badminton — intermediate",
    description:
      "Need three more for doubles. We play rallies to 21, switch partners every game. Please be comfortable with smashes and drop shots.",
    venue: "{area} Badminton Court",
    min: 3,
    max: 3,
    hour: 19,
    duration: 90,
    joinMode: "REQUEST",
    skill: "INTERMEDIATE",
    tags: ["badminton", "doubles"],
    whatToBring: "Your own racquet, non-marking shoes",
    costNote: "Court fee ₹120 each",
  },
  {
    category: "sports-fitness",
    title: "5-a-side football under lights",
    description:
      "Casual 5-a-side on artificial turf. Teams balanced on the spot. No slide tackles!",
    venue: "{area} Turf Arena",
    min: 6,
    max: 9,
    hour: 21,
    duration: 60,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["football", "turf"],
    costNote: "Turf booking ₹200 each",
  },
  {
    category: "sports-fitness",
    title: "Easy 5K run, all paces",
    description:
      "Conversational-pace 5K loop followed by stretching. Nobody gets left behind — we regroup every kilometre.",
    venue: "{area} Joggers Park",
    min: 2,
    max: 12,
    hour: 6,
    duration: 60,
    joinMode: "OPEN",
    skill: "BEGINNER",
    tags: ["running", "5k", "morning"],
    whatToBring: "Water bottle",
  },
  {
    category: "music",
    title: "Acoustic jam: Bollywood unplugged",
    description:
      "Guitars, cajón, vocals — let's jam to 90s and 2000s Bollywood. Bring your instrument or just your voice.",
    venue: "The Loft Café, {area}",
    min: 2,
    max: 6,
    hour: 18,
    minute: 30,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["jam", "guitar", "bollywood"],
    whatToBring: "Your instrument (optional)",
  },
  {
    category: "music",
    title: "Open mic night — songs & poetry",
    description:
      "Five-minute slots for songs, poetry or stand-up. Come to perform or just to cheer people on.",
    venue: "Brew Room, {area}",
    min: 4,
    max: 10,
    hour: 19,
    duration: 150,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["open-mic", "poetry", "music"],
    costNote: "Order something at the café",
  },
  {
    category: "dance",
    title: "Salsa basics practice session",
    description:
      "Practice the basic step, cross-body lead and turns. We rotate partners. No partner needed.",
    venue: "Community Hall, {area}",
    min: 4,
    max: 10,
    hour: 19,
    minute: 30,
    duration: 90,
    joinMode: "REQUEST",
    skill: "BEGINNER",
    tags: ["salsa", "latin", "partner-dance"],
    whatToBring: "Comfortable shoes",
    costNote: "Hall rent ₹100 each",
  },
  {
    category: "events-concerts",
    title: "Going to a stand-up show together",
    description:
      "A few of us are going to the weekend stand-up show. Buy your own ticket and we'll sit together and grab food after.",
    venue: "Auditorium near {area}",
    min: 2,
    max: 5,
    hour: 20,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["comedy", "stand-up"],
    costNote: "Tickets ~₹499, buy your own",
  },
  {
    category: "workshops",
    title: "Beginner pottery afternoon",
    description:
      "Hands-on wheel throwing with a studio instructor. You'll make two small bowls to be fired and collected next week.",
    venue: "Clay Studio, {area}",
    min: 3,
    max: 6,
    hour: 15,
    duration: 180,
    joinMode: "REQUEST",
    skill: "BEGINNER",
    tags: ["pottery", "art", "hands-on"],
    whatToBring: "Clothes you don't mind getting muddy",
    costNote: "Material fee ₹600",
  },
  {
    category: "workshops",
    title: "Street photography walk",
    description:
      "Slow walk through the market lanes practising composition and candid shots. Phones are totally fine.",
    venue: "{area} Market — main gate",
    min: 3,
    max: 8,
    hour: 7,
    minute: 30,
    duration: 120,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["photography", "walk"],
    whatToBring: "Camera or phone, charged",
  },
  {
    category: "learning-tuition",
    title: "Class 12 physics study group",
    description:
      "Working through previous years' board papers together — electrostatics and current electricity this week.",
    venue: "{area} Public Library",
    min: 2,
    max: 6,
    hour: 17,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["physics", "boards", "study-group"],
    whatToBring: "Notebook, past papers",
  },
  {
    category: "learning-tuition",
    title: "Marathi ↔ English language exchange",
    description:
      "Half the time in Marathi, half in English. Great for newcomers to Maharashtra and anyone polishing their spoken English.",
    venue: "Chai Point, {area}",
    min: 2,
    max: 6,
    hour: 18,
    duration: 90,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["language-exchange", "marathi", "english"],
  },
  {
    category: "tutorials-tech-talks",
    title: "Next.js & TypeScript meetup",
    description:
      "Two 20-minute talks (Server Actions in practice; typing your API layer) followed by open discussion and pizza.",
    venue: "Co-working space, {area}",
    min: 5,
    max: 12,
    hour: 11,
    duration: 180,
    joinMode: "REQUEST",
    skill: "INTERMEDIATE",
    tags: ["nextjs", "typescript", "web"],
    whatToBring: "Laptop (optional)",
    costNote: "Pizza split ~₹150",
  },
  {
    category: "tutorials-tech-talks",
    title: "Weekend mini-hackathon: civic tech",
    description:
      "Six hours, small teams, one theme: tools that help your neighbourhood. Beginners paired with experienced devs.",
    venue: "Innovation Hub, {area}",
    min: 4,
    max: 12,
    hour: 10,
    duration: 360,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["hackathon", "civic-tech"],
    whatToBring: "Laptop and charger",
  },
  {
    category: "podcasts-content",
    title: "Looking for a co-host: city food podcast",
    description:
      "Recording a pilot episode about the best misal in town. Looking for one co-host who loves food and talking.",
    venue: "Home studio, {area}",
    min: 1,
    max: 2,
    hour: 16,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["podcast", "food", "co-host"],
  },
  {
    category: "communication-speaking",
    title: "English speaking club",
    description:
      "Table topics, short prepared speeches and friendly feedback. Perfect if you get nervous speaking in public.",
    venue: "{area} Community Centre",
    min: 4,
    max: 12,
    hour: 18,
    duration: 90,
    joinMode: "OPEN",
    skill: "BEGINNER",
    tags: ["public-speaking", "english"],
  },
  {
    category: "communication-speaking",
    title: "Debate evening: is remote work here to stay?",
    description:
      "Oxford-style debate, two teams of three plus audience questions. Sides assigned on the day.",
    venue: "Library Hall, {area}",
    min: 6,
    max: 10,
    hour: 18,
    minute: 30,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["debate", "speaking"],
  },
  {
    category: "civic-national-interest",
    title: "Voter registration awareness drive",
    description:
      "Helping first-time voters check their names on the roll and fill Form 6. Short briefing before we start.",
    venue: "{area} Chowk",
    min: 5,
    max: 12,
    hour: 9,
    duration: 180,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["voter-awareness", "civic"],
    whatToBring: "Water, cap",
  },
  {
    category: "civic-national-interest",
    title: "Tree plantation drive",
    description:
      "Planting 100 native saplings with the local ward office. Tools provided; gloves recommended.",
    venue: "Open plot behind {area} garden",
    min: 6,
    max: 12,
    hour: 7,
    duration: 180,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["tree-plantation", "environment"],
    whatToBring: "Gloves, water bottle",
  },
  {
    category: "helping-hands",
    title: "Afternoon at an old-age home",
    description:
      "Spending the afternoon with residents — conversation, carrom and songs. Please be patient and gentle.",
    venue: "Sukh Old Age Home, {area}",
    min: 3,
    max: 8,
    hour: 15,
    duration: 120,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["elder-care", "volunteering"],
    whatToBring: "Board games, fruits (optional)",
  },
  {
    category: "helping-hands",
    title: "Blood donation camp — donors & volunteers",
    description:
      "Donors aged 18–65 and volunteers for registration and refreshments. Eat a good breakfast before you come.",
    venue: "Civil Hospital, {area}",
    min: 5,
    max: 12,
    hour: 10,
    duration: 240,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["blood-donation", "volunteering"],
    whatToBring: "Photo ID",
  },
  {
    category: "cleanliness-drives",
    title: "Park clean-up morning",
    description:
      "Two-hour clean-up of the park and the lane outside it. Gloves and bags provided; segregated waste goes to the ward collection point.",
    venue: "{area} Garden",
    min: 5,
    max: 12,
    hour: 7,
    duration: 120,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["clean-up", "park"],
    whatToBring: "Water bottle, closed shoes",
  },
  {
    category: "cleanliness-drives",
    title: "Lake & riverbank clean-up",
    description:
      "Clearing plastic from the bank. We work in pairs and stay well away from the water's edge.",
    venue: "Riverbank near {area}",
    min: 6,
    max: 12,
    hour: 7,
    minute: 30,
    duration: 150,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["clean-up", "river", "plastic-free"],
    whatToBring: "Gloves, closed shoes",
  },
  {
    category: "outdoors-travel",
    title: "Sunrise fort trek",
    description:
      "Moderate 2-hour climb to catch the sunrise, back by 11. Shared cab from the meeting point.",
    venue: "Meet at {area} bus stop",
    min: 4,
    max: 12,
    hour: 5,
    minute: 30,
    duration: 300,
    joinMode: "REQUEST",
    skill: "INTERMEDIATE",
    tags: ["trek", "fort", "sunrise"],
    whatToBring: "2 L water, snacks, torch",
    costNote: "Cab share ~₹250",
  },
  {
    category: "outdoors-travel",
    title: "Bird-watching morning",
    description:
      "Gentle walk with binoculars. Last time we spotted kingfishers, egrets and a purple sunbird.",
    venue: "{area} lake trail",
    min: 2,
    max: 6,
    hour: 6,
    minute: 30,
    duration: 150,
    joinMode: "OPEN",
    skill: "BEGINNER",
    tags: ["birding", "nature"],
    whatToBring: "Binoculars if you have them",
  },
  {
    category: "games-hobbies",
    title: "Board game night",
    description:
      "Catan, Codenames and Splendor. Games are taught from scratch — no experience needed.",
    venue: "Board Game Café, {area}",
    min: 3,
    max: 8,
    hour: 19,
    duration: 180,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["board-games", "catan"],
    costNote: "Café cover ₹200 each",
  },
  {
    category: "games-hobbies",
    title: "Book club: The God of Small Things",
    description:
      "Monthly book club. This month: Arundhati Roy. Come even if you haven't finished it.",
    venue: "Reading Room, {area}",
    min: 3,
    max: 10,
    hour: 17,
    duration: 120,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["book-club", "reading"],
  },
  {
    category: "food-social",
    title: "Street food walk",
    description:
      "Vada pav, misal, kulfi and whatever else we find. We share plates so you can taste more.",
    venue: "{area} — meet at the main signal",
    min: 3,
    max: 8,
    hour: 18,
    minute: 30,
    duration: 150,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["street-food", "food-walk"],
    costNote: "Pay for what you eat (~₹300)",
  },
  {
    category: "food-social",
    title: "Potluck lunch for newcomers",
    description:
      "New to the city? Bring one homemade dish and meet people who just moved here too.",
    venue: "Clubhouse, {area}",
    min: 4,
    max: 12,
    hour: 13,
    duration: 150,
    joinMode: "REQUEST",
    skill: "ANY",
    tags: ["potluck", "newcomers"],
    whatToBring: "One dish to share",
  },
  {
    category: "pets-animals",
    title: "Sunday dog walk & socialising",
    description:
      "Leashed group walk followed by off-leash play in the fenced area. Vaccinated dogs only, please.",
    venue: "{area} Park",
    min: 2,
    max: 10,
    hour: 7,
    duration: 60,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["dogs", "pets"],
    whatToBring: "Leash, poop bags, water",
  },
  {
    category: "wellness",
    title: "Sunrise yoga in the park",
    description: "Gentle hatha flow and breathing. Suitable for complete beginners.",
    venue: "{area} Garden lawn",
    min: 3,
    max: 12,
    hour: 6,
    minute: 30,
    duration: 60,
    joinMode: "OPEN",
    skill: "ANY",
    tags: ["yoga", "morning"],
    whatToBring: "Yoga mat, water",
    preferenceNote: "Women-led session; everyone welcome",
  },
  {
    category: "other",
    title: "Learn to solve a Rubik's cube",
    description: "Beginner method in one sitting. Cubes available to borrow.",
    venue: "Café Mocha, {area}",
    min: 2,
    max: 6,
    hour: 17,
    duration: 90,
    joinMode: "OPEN",
    skill: "BEGINNER",
    tags: ["rubiks-cube", "puzzles"],
  },
];

const CHAT_LINES = [
  "Hi all! Looking forward to this 🙌",
  "Is there parking near the venue?",
  "I'll be 5 minutes late, start without me.",
  "Can I bring a friend along?",
  "What's the exact meeting point?",
  "Weather looks good for tomorrow 🌤️",
  "Should we make a carpool?",
  "Thanks for organising this!",
  "Reminder: please carry water.",
  "Just reached, I'm near the entrance.",
  "That was so much fun, let's do it again next week!",
  "Sharing the location pin in a bit.",
];

const REQUEST_MESSAGES = [
  "Hey! I've done this a few times before, would love to join.",
  "First time trying this — hope that's okay!",
  "I live close by, happy to help set up.",
  "Can I join? I'm new to the area.",
  null,
  null,
];

// ─── Seed ───────────────────────────────────────────────────────────────────

async function seedCategories() {
  for (const [sortOrder, category] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, sortOrder },
      create: { ...category, sortOrder },
    });
  }
  const rows = await db.category.findMany({ select: { id: true, slug: true } });
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function seedUsers(categoryIds: Map<string, string>) {
  const users = [];
  for (const [i, user] of USERS.entries()) {
    const area = AREAS[user.city][i % AREAS[user.city].length];
    const username = user.name.toLowerCase().replace(/[^a-z]+/g, ".");
    users.push({
      ...(await db.user.create({
        data: {
          name: user.name,
          username,
          email: `${username}@${SEED_EMAIL_DOMAIN}`,
          emailVerified: NOW,
          bio: user.bio,
          ageRange: user.ageRange,
          languages: user.languages,
          homeLatitude: jitter(area.lat),
          homeLongitude: jitter(area.lng),
          homeAreaName: areaLabel(user.city, area),
          createdAt: new Date(NOW.getTime() - randInt(20, 200) * DAY),
          interests: {
            create: user.interests.map((slug) => ({ categoryId: categoryIds.get(slug)! })),
          },
        },
        select: { id: true, name: true },
      })),
      city: user.city,
    });
  }
  return users;
}

type PlannedStatus = Exclude<ActivityStatus, "ONGOING" | "COMPLETED"> | "PAST" | "NOW";

/** Which status each of the 50 slots gets — a fixed, readable mix. */
function plannedStatus(i: number): PlannedStatus {
  if (i === 5 || i === 27) return "NOW"; // happening right now → ONGOING
  if (i % 8 === 0) return "PAST"; // 7 completed/cancelled in the past
  if (i === 12 || i === 33) return "DRAFT";
  if (i % 11 === 7) return "CANCELLED";
  if (i % 9 === 4) return "FULL";
  return "OPEN";
}

async function seedActivities(
  categoryIds: Map<string, string>,
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const slots: City[] = [
    ...Array<City>(20).fill("Pune"),
    ...Array<City>(20).fill("Mumbai"),
    ...Array<City>(10).fill("Sangli"),
  ];

  const joinRequests: Prisma.JoinRequestCreateManyInput[] = [];
  const messages: Prisma.MessageCreateManyInput[] = [];
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  for (const [i, city] of slots.entries()) {
    const template = TEMPLATES[(i * 7) % TEMPLATES.length]; // 7 is coprime with 32 → good spread
    const area = AREAS[city][i % AREAS[city].length];
    const locals = users.filter((u) => u.city === city);
    const host = locals[i % locals.length];
    const planned = plannedStatus(i);

    let startsAt: Date;
    if (planned === "NOW") {
      startsAt = new Date(Math.floor((NOW.getTime() - 30 * MINUTE) / (15 * MINUTE)) * 15 * MINUTE);
    } else if (planned === "PAST") {
      startsAt = istDate(-randInt(2, 14), template.hour, template.minute);
    } else {
      startsAt = istDate(randInt(1, 30), template.hour, template.minute);
    }
    const endsAt = new Date(startsAt.getTime() + template.duration * MINUTE);
    const createdAt = minDate(new Date(startsAt.getTime() - randInt(3, 12) * DAY), NOW);

    const status: ActivityStatus =
      planned === "NOW"
        ? "ONGOING"
        : planned === "PAST"
          ? i === 16
            ? "CANCELLED"
            : "COMPLETED"
          : planned;

    const activity = await db.activity.create({
      data: {
        hostId: host.id,
        categoryId: categoryIds.get(template.category)!,
        title: template.title,
        description: template.description,
        startsAt,
        durationMinutes: template.duration,
        minPeople: template.min,
        maxPeople: template.max,
        joinMode: template.joinMode,
        skillLevel: template.skill,
        status,
        preferenceNote: template.preferenceNote,
        whatToBring: template.whatToBring,
        costNote: template.costNote,
        venueName: template.venue.replace("{area}", area.name),
        latitude: jitter(area.lat),
        longitude: jitter(area.lng),
        areaName: areaLabel(city, area),
        showExactVenue: rand() < 0.5,
        createdAt,
        tags: { create: template.tags.map((tag) => ({ tag })) },
      },
      select: { id: true, title: true },
    });

    if (status === "DRAFT") continue;

    // ── Join requests: locals first, then anyone else (excluding the host).
    const candidates = [
      ...shuffle(locals.filter((u) => u.id !== host.id)),
      ...shuffle(users.filter((u) => u.city !== city)),
    ];
    const approvedCount =
      status === "FULL"
        ? template.max
        : status === "COMPLETED" || status === "ONGOING"
          ? randInt(template.min, template.max)
          : status === "CANCELLED"
            ? randInt(0, Math.min(2, template.max))
            : randInt(0, template.max - 1); // OPEN: always at least one spot left
    const canHavePending = status === "OPEN" && template.joinMode === "REQUEST";
    const pendingCount = canHavePending ? randInt(0, 3) : 0;
    const rejectedCount = template.joinMode === "REQUEST" && rand() < 0.3 ? 1 : 0;
    const withdrawnCount = rand() < 0.2 ? 1 : 0;

    const queue = [...candidates];
    const take = (n: number) => queue.splice(0, Math.min(n, queue.length));
    const approved = take(approvedCount);
    const groups: [typeof approved, JoinRequestStatus][] = [
      [approved, "APPROVED"],
      [take(pendingCount), "PENDING"],
      [take(rejectedCount), "REJECTED"],
      [take(withdrawnCount), "WITHDRAWN"],
    ];

    for (const [members, requestStatus] of groups) {
      for (const member of members) {
        const requestedAt = new Date(
          createdAt.getTime() + rand() * (minDate(startsAt, NOW).getTime() - createdAt.getTime()),
        );
        const decided = requestStatus !== "PENDING" && requestStatus !== "WITHDRAWN";
        joinRequests.push({
          activityId: activity.id,
          userId: member.id,
          message: pick(REQUEST_MESSAGES),
          status: requestStatus,
          createdAt: requestedAt,
          decidedAt: decided ? new Date(requestedAt.getTime() + randInt(10, 600) * MINUTE) : null,
        });

        if (requestStatus === "PENDING") {
          notifications.push({
            userId: host.id,
            type: NotificationType.JOIN_REQUEST,
            payload: { activityId: activity.id, title: activity.title, actorName: member.name },
            createdAt: requestedAt,
          });
        } else if (decided) {
          notifications.push({
            userId: member.id,
            type:
              requestStatus === "APPROVED"
                ? NotificationType.REQUEST_APPROVED
                : NotificationType.REQUEST_REJECTED,
            payload: { activityId: activity.id, title: activity.title, actorName: host.name },
            readAt: rand() < 0.6 ? NOW : null,
            createdAt: requestedAt,
          });
        }
      }
    }

    if (status === "CANCELLED") {
      for (const member of approved) {
        notifications.push({
          userId: member.id,
          type: NotificationType.ACTIVITY_CANCELLED,
          payload: { activityId: activity.id, title: activity.title, actorName: host.name },
          createdAt: minDate(new Date(startsAt.getTime() - DAY), NOW),
        });
      }
    }

    // ── Chat: host + approved members, between creation and min(now, end).
    if (approved.length >= 1 && status !== "CANCELLED") {
      const participants = [host, ...approved];
      const chatEnd = minDate(endsAt, NOW).getTime();
      const count = randInt(3, 8);
      for (let m = 0; m < count; m++) {
        messages.push({
          activityId: activity.id,
          senderId: pick(participants).id,
          body: pick(CHAT_LINES),
          createdAt: new Date(
            createdAt.getTime() + ((m + rand()) / count) * (chatEnd - createdAt.getTime()),
          ),
        });
      }
    }
  }

  await db.joinRequest.createMany({ data: joinRequests });
  await db.message.createMany({ data: messages });
  await db.notification.createMany({ data: notifications });
  return {
    joinRequests: joinRequests.length,
    messages: messages.length,
    notifications: notifications.length,
  };
}

async function main() {
  const removed = await db.user.deleteMany({
    where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
  });
  const categoryIds = await seedCategories();
  const users = await seedUsers(categoryIds);
  const counts = await seedActivities(categoryIds, users);

  const byStatus = await db.activity.groupBy({ by: ["status"], _count: true });
  console.log(`Removed ${removed.count} previous seed users.`);
  console.log(`Seeded ${categoryIds.size} categories, ${users.length} users, 50 activities.`);
  console.log(
    `  ${counts.joinRequests} join requests, ${counts.messages} messages, ${counts.notifications} notifications.`,
  );
  console.log(
    `  Activities by status: ${byStatus.map((s) => `${s.status}=${s._count}`).join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
