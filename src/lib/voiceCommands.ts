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

export type VoiceCommand = "newLine" | "newParagraph" | "deleteMacro" | "editMacro" | "undo";

export type SpokenPiece = { kind: "text"; text: string } | { kind: "command"; command: VoiceCommand };

/** What each command is called when the screen says it was heard. */
export const COMMAND_LABELS: Record<VoiceCommand, string> = {
  newLine: "Next line",
  newParagraph: "New paragraph",
  deleteMacro: "Delete last macro",
  editMacro: "Change this macro",
  undo: "Undo that",
};

// Deepgram adds its own commas and full stops around spoken commands
// ("normal. Next line."). A comma before a command is swallowed with it; a
// full stop before it ends the sentence and stays.
const LEAD = ",?";
const TRAIL = "[,.;:!?]?";

const COMMANDS: { command: VoiceCommand; pattern: string }[] = [
  { command: "deleteMacro", pattern: "(?:delete|remove|undo) (?:the |this |that )?(?:last )?(?:macro|shortcut)" },
  { command: "editMacro", pattern: "(?:change|edit) (?:the |this |that )?(?:last )?(?:macro|shortcut)" },
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
  `(?:^|\\s)((?:full|question|exclamation|semi|next|new|delete|remove|undo|scratch|change|edit)(?: (?:the|this|that))?(?: last)?|\\d+(?:\\.\\d+)?(?: point)?|${NUMBER_WORDS}(?: point)?)[.,]?\\s*$`,
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

// Words a doctor says when correcting what they just said.
const CORRECTION_CUE = /[,;]?\s*\b(?:no,? sorry|sorry|i mean|i meant|no wait|no,? no|correction|make (?:it|that))\b[,:.]?\s*/i;
const SIDE_WORDS = ["left", "right"];

/** True when the words hold a spoken self-correction, such as "sorry, 15 cm". */
export function hasCorrection(text: string) {
  return CORRECTION_CUE.test(text);
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}.]+/gu) ?? [];
}

/** Replaces the last match of `pattern` in `text` with `replacement`. */
function replaceLast(text: string, pattern: RegExp, replacement: (match: RegExpExecArray) => string) {
  let last: RegExpExecArray | null = null;
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (let match = global.exec(text); match; match = global.exec(text)) last = match;
  if (!last) return null;
  return text.slice(0, last.index) + replacement(last) + text.slice(last.index + last[0].length);
}

/**
 * Applies spoken self-corrections in word-for-word text: "18 cm stone in the
 * gallbladder. Sorry, 15 cm." becomes "15 cm stone in the gallbladder." Only
 * corrections that can be placed with certainty are applied (a size with its
 * unit, a side, or the sentence said again). Anything else is left as said
 * and counted in `unclear`, for the doctor to check.
 */
export function resolveCorrections(text: string) {
  let result = text;
  const changes: string[] = [];
  let unclear = 0;
  // Where to look for the next correction: past any that could not be placed.
  let from = 0;
  for (let cue = CORRECTION_CUE.exec(result.slice(from)); cue; cue = CORRECTION_CUE.exec(result.slice(from))) {
    const at = from + cue.index;
    const before = result.slice(0, at);
    const after = result.slice(at + cue[0].length);
    // The correction runs to the end of its sentence; a decimal point does not end one.
    const end = after.search(/[.!?](?=\s|$)/);
    const phrase = (end >= 0 ? after.slice(0, end) : after).trim();
    const rest = end >= 0 ? after.slice(end + 1) : "";
    if (!phrase) {
      unclear += 1;
      from = at + cue[0].length;
      continue;
    }

    let fixed: string | null = null;
    const phraseWords = words(phrase);
    const lastSentence = before.replace(/[.!?]\s*$/, "").split(/[.!?]\s+/).pop() ?? "";
    const sentenceWords = words(lastSentence);
    const shared = phraseWords.filter((word) => sentenceWords.includes(word)).length;
    const leadingSize = phrase.match(new RegExp(`^(${NUMBER})\\s*(mm|cm|ml|HU)\\b`, "i"));
    const side = SIDE_WORDS.find((word) => word === phraseWords[0]);

    if (side) {
      // A side, maybe with the part it belongs to ("right lobe"), maybe followed by
      // new words ("right lobe, measuring 2 cm"): the side replaces the last
      // opposite side, and the new words carry on after the sentence.
      const other = side === "left" ? "right" : "left";
      const tokens = phrase.split(/\s+/);
      let repeated = 1;
      while (repeated < tokens.length && sentenceWords.includes(words(tokens[repeated])[0] ?? "")) repeated += 1;
      const carryOn = tokens.slice(repeated).join(" ");
      const replaced = replaceLast(before.replace(/[.!?]\s*$/, ""), new RegExp(`\\b${other}\\b`, "i"), (match) =>
        match[0][0] === match[0][0].toUpperCase() ? side[0].toUpperCase() + side.slice(1) : side,
      );
      fixed =
        replaced === null
          ? null
          : carryOn
            ? `${replaced}${/,$/.test(tokens[repeated - 1]) ? "," : ""} ${carryOn}`
            : replaced;
      if (fixed) changes.push(`${other} → ${side}`);
    } else if (phraseWords.length >= 3 && shared / phraseWords.length >= 0.5) {
      // The sentence said again, corrected: it replaces the one before.
      const start = before.lastIndexOf(lastSentence);
      fixed = `${before.slice(0, start)}${phrase[0].toUpperCase()}${phrase.slice(1)}`;
      changes.push(`“${lastSentence.trim()}” → “${phrase}”`);
    } else if (leadingSize) {
      // A size, maybe with words that carry on after it: it replaces the last size in the same unit.
      const [said, value, unit] = leadingSize;
      const sameUnit = new RegExp(`${NUMBER}\\s*${unit}\\b`, "i");
      const old = before.match(new RegExp(sameUnit.source, "gi"))?.pop();
      const replaced = replaceLast(before.replace(/[.!?]\s*$/, ""), sameUnit, () => `${value} ${unit}`);
      fixed = replaced === null ? null : replaced + phrase.slice(said.length);
      if (fixed && old) changes.push(`${old} → ${value} ${unit}`);
    }
    // The correction ended its sentence, so the corrected sentence ends too.
    if (fixed !== null && end >= 0 && !/[.!?]\s*$/.test(fixed)) fixed = `${fixed.trimEnd()}.`;
    if (fixed === null) {
      unclear += 1;
      from = at + cue[0].length;
      continue;
    }
    result = (fixed.trimEnd() + (rest.trim() ? ` ${rest.trim()}` : "")).trim();
    from = fixed.trimEnd().length;
  }
  return { text: result, changes, unclear };
}
