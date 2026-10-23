// Basic content filter for public text (BRD FR-8.4): plan titles/descriptions, profile
// names/bios. Deliberately small — it catches obvious abuse; reports + admins handle the rest.

// Common English + romanised Hindi/Marathi profanity (whole words after normalising).
const WORDS = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "cunt",
  "slut",
  "whore",
  "wanker",
  "prick",
  "chutiya",
  "chutiye",
  "madarchod",
  "maderchod",
  "bhenchod",
  "behenchod",
  "bhosdike",
  "bhosdi",
  "gaand",
  "gandu",
  "randi",
  "harami",
  "lund",
  "lavda",
  "lauda",
  "zavadya",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

/** Lower-case, undo leetspeak, collapse letter runs ("fuuuck" → "fuck"), split into words. */
function words(text: string): string[] {
  const normal = text
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1$1");
  return normal.split(/[^a-z]+/).filter(Boolean);
}

const BAD = new Set(WORDS);

export function containsProfanity(text: string): boolean {
  for (const word of words(text)) {
    if (BAD.has(word)) return true;
    // "fuuck" collapses to "fuuck" (runs of 2 kept) → also try single letters.
    if (BAD.has(word.replace(/(.)\1+/g, "$1"))) return true;
  }
  return false;
}

export const PROFANITY_MESSAGE = "Please keep it friendly — that word isn't allowed here.";
