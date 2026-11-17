// Which pieces of a report are words to check, shared by the editor and the server.

/** Letters with any apostrophes inside them; digits are kept so "T2W" stays one piece. */
const WORD = /[\p{L}\d]+(?:['’][\p{L}\d]+)*/gu;

/**
 * Whether a piece of text is checked at all. Left alone, as a word processor
 * does: anything with a digit (T2W, C5), abbreviations in capitals (VUJ, HRCT),
 * mixed-case units (mSv, eGFR) and single letters.
 */
export function isCheckable(word: string) {
  if (word.length < 2 || /\d/.test(word)) return false;
  if (word === word.toUpperCase()) return false;
  if (/\p{Lu}/u.test(word.slice(1))) return false;
  return true;
}

/** Every word in a piece of text with where it starts, apostrophes made plain. */
export function wordsIn(text: string) {
  const found: { word: string; start: number; end: number }[] = [];
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    found.push({ word: match[0].replace(/’/g, "'"), start, end: start + match[0].length });
  }
  return found;
}

/** A word as kept in a personal dictionary, or "" when it is not one word. */
export function normaliseWord(value: unknown) {
  if (typeof value !== "string") return "";
  const word = value.trim().replace(/’/g, "'");
  if (word.length < 2 || word.length > 40) return "";
  return /^[\p{L}\d]+(?:['-][\p{L}\d]+)*$/u.test(word) ? word : "";
}
