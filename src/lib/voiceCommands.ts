/**
 * What the doctor says can be words for the report or a command about it.
 * Speech recognition returns both as text, so this module tells them apart
 * and tidies the words the way a radiologist would type them.
 *
 * Deepgram's own dictation, numerals and measurements options were tested on
 * nova-3-medical and rejected: they turned "sigmoid colon" into "sigmoid:"
 * and "twelve point five centimeters" into "12 0.5 cm". Everything here is
 * deliberately narrow so a finding is never changed in meaning.
 */

export type VoiceCommand = "newLine" | "newParagraph" | "deleteMacro" | "undo";

export type SpokenPiece = { kind: "text"; text: string } | { kind: "command"; command: VoiceCommand };

/** What each command is called when the screen says it was heard. */
export const COMMAND_LABELS: Record<VoiceCommand, string> = {
  newLine: "Next line",
  newParagraph: "New paragraph",
  deleteMacro: "Delete last macro",
  undo: "Undo that",
};

// Deepgram adds its own commas and full stops around spoken commands
// ("normal. Next line."). A comma before a command is swallowed with it; a
// full stop before it ends the sentence and stays.
const LEAD = ",?";
const TRAIL = "[,.;:!?]?";

const COMMANDS: { command: VoiceCommand; pattern: string }[] = [
  { command: "deleteMacro", pattern: "(?:delete|remove|undo) (?:the )?last (?:macro|shortcut)" },
  { command: "undo", pattern: "(?:undo|scratch|delete) that" },
  { command: "newParagraph", pattern: "(?:new|next) paragraph" },
  { command: "newLine", pattern: "(?:new|next) line" },
];

const COMMAND_PATTERN = new RegExp(
  `${LEAD}\\s*\\b(${COMMANDS.map((item) => item.pattern).join("|")})\\b\\s*${TRAIL}`,
  "gi",
);

/** Splits a stretch of speech into report words and commands, in the order spoken. */
export function parseSpoken(spoken: string): SpokenPiece[] {
  const pieces: SpokenPiece[] = [];
  let from = 0;
  for (const match of spoken.matchAll(COMMAND_PATTERN)) {
    const before = tidySpoken(spoken.slice(from, match.index));
    if (before) pieces.push({ kind: "text", text: before });
    const said = match[1].toLowerCase();
    const found = COMMANDS.find((item) => new RegExp(`^${item.pattern}$`, "i").test(said));
    if (found) pieces.push({ kind: "command", command: found.command });
    from = match.index + match[0].length;
  }
  const rest = tidySpoken(spoken.slice(from));
  if (rest) pieces.push({ kind: "text", text: rest });
  return pieces;
}

// Only marks that cannot be mistaken for anatomy or history. "Colon" is an
// organ and "period" is part of a gynaecology history, so neither is a mark.
const MARKS: [string, string][] = [
  ["comma", ","],
  ["full ?stop", "."],
  ["question mark", "?"],
  ["exclamation (?:mark|point)", "!"],
  ["semicolon", ";"],
];

const SMALL = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const NUMBER_WORD = `(?:${[...SMALL, ...TENS.filter(Boolean)].join("|")})`;
// "five", "forty five", "forty-five". Larger sizes come back from speech recognition as digits.
const NUMBER_WORDS = `${NUMBER_WORD}(?:[\\s-]${NUMBER_WORD})?`;

function wordsToNumber(words: string) {
  let total = 0;
  for (const word of words.toLowerCase().split(/[\s-]+/)) {
    const small = SMALL.indexOf(word);
    const tens = TENS.indexOf(word);
    if (small >= 0) total += small;
    else if (tens >= 0) total += tens * 10;
  }
  return String(total);
}

// Written after a number, as radiologists write them.
const UNITS: [string, string][] = [
  ["millimet(?:er|re)s?|mms?", "mm"],
  ["centimet(?:er|re)s?|cms?", "cm"],
  ["millilit(?:er|re)s?|mls?", "ml"],
  ["hounsfield units?|hu", "HU"],
];
const UNIT_WORDS = UNITS.map(([pattern]) => pattern).join("|");
const NUMBER = "\\d+(?:\\.\\d+)?";

/**
 * Spoken punctuation becomes marks, and sizes are written as numbers with
 * short units ("five millimeters" → "5 mm", "12 point 5 cm" → "12.5 cm").
 */
export function tidySpoken(spoken: string) {
  let text = spoken;

  for (const [word, mark] of MARKS) {
    // The mark replaces the comma or full stop speech recognition put around the word.
    text = text.replace(new RegExp(`\\s*[,.]?\\s*\\b${word}\\b[,.]?`, "gi"), mark);
  }
  // "infarct? Question mark" gives "??"; one of each mark is meant.
  text = text.replace(/([,.;!?])\1+/g, "$1");

  // "12 point 5", "twelve point five" → 12.5
  text = text.replace(
    new RegExp(`\\b(\\d+|${NUMBER_WORDS}) point (\\d+|${NUMBER_WORD})\\b`, "gi"),
    (_all, whole: string, part: string) =>
      `${/\d/.test(whole) ? whole : wordsToNumber(whole)}.${/\d/.test(part) ? part : wordsToNumber(part)}`,
  );
  // Number words become digits only right before a unit: "two lesions" stays as said.
  text = text.replace(
    new RegExp(`\\b(${NUMBER_WORDS})(?=\\s*(?:${UNIT_WORDS})\\b)`, "gi"),
    (words: string) => wordsToNumber(words),
  );
  // "3 by 4 cm" → "3 x 4 cm", only between two numbers.
  text = text.replace(new RegExp(`(${NUMBER}) by (?=${NUMBER})`, "gi"), "$1 x ");
  for (const [pattern, unit] of UNITS) {
    text = text.replace(new RegExp(`(${NUMBER})\\s*(?:${pattern})\\b`, "gi"), `$1 ${unit}`);
  }

  return text
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,.;!?])(?=[^\s,.;!?\d])/g, "$1 ")
    // A sentence a mark ended starts with a capital.
    .replace(/([.!?]\s+)(\p{Ll})/gu, (_all, gap: string, letter: string) => gap + letter.toUpperCase())
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Speech recognition sends finished words in pieces, cut wherever the doctor
// paused, so "full stop" or "12.5 centimeters" can arrive split in two. A piece
// that ends on what may be the start of one is held until the next arrives.
const OPEN_END = new RegExp(
  `(?:^|\\s)((?:full|question|exclamation|semi|next|new|delete|remove|undo|scratch)(?: (?:the )?last)?|\\d+(?:\\.\\d+)?(?: point)?|${NUMBER_WORDS}(?: point)?)[.,]?\\s*$`,
  "i",
);
// Words that finish a held start: the full stop speech recognition put before them is not meant.
const CARRIES_ON = new RegExp(
  `^(?:stop|mark|point|line|paragraph|that|last|macro|shortcut|colon|\\d|${NUMBER_WORD}\\b|(?:${UNIT_WORDS})\\b)`,
  "i",
);

/**
 * Reads speech piece by piece and returns what each piece adds, keeping a
 * phrase that was cut between pieces together. Call `flush` when the doctor stops.
 */
export function spokenStream() {
  let held = "";
  return {
    push(piece: string): SpokenPiece[] {
      let text = piece.trim();
      if (held) {
        const carries = CARRIES_ON.test(text);
        text = carries
          ? `${held.replace(/[.,]\s*$/, "")} ${text[0].toLowerCase()}${text.slice(1)}`
          : `${held} ${text}`;
        held = "";
      }
      const open = text.match(OPEN_END);
      if (open && open.index !== undefined) {
        const cut = open.index + (open[0].length - open[0].trimStart().length);
        held = text.slice(cut);
        text = text.slice(0, cut);
      }
      return parseSpoken(text);
    },
    flush(): SpokenPiece[] {
      const text = held;
      held = "";
      return parseSpoken(text);
    },
  };
}

/** Joins dictated words onto text already there, with a space only where one belongs. */
export function appendSpoken(existing: string, words: string) {
  if (!existing || /\s$/.test(existing) || /^[,.;!?]/.test(words)) return existing + words;
  return `${existing} ${words}`;
}
