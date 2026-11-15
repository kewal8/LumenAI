// Plain-code safety checks on a generated line. These catch the errors that
// matter most in a report: wrong side, wrong number, flipped negation. They
// only flag; the radiologist decides.

import { hasCorrection, resolveCorrections, tidySpoken } from "./voiceCommands";

const SIDES: Record<string, RegExp> = {
  left: /\bleft\b|\blt\b/i,
  right: /\bright\b|\brt\b/i,
  bilateral: /\bbilateral(ly)?\b|\bboth\b/i,
};

const NEGATION = /\b(no|not|without|absent|negative|nil|normal|unremarkable)\b/i;

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}

function numbers(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

/**
 * The part of a rewritten line that came from the dictation: sentences whose
 * words were all already in the line before (its template wording, kept as it
 * was or shortened) are left out. Empty when nothing new was written.
 */
function dictatedPart(text: string, original: string) {
  // Words without the full stop that ends a sentence; "2.5" stays whole.
  const wordsOf = (part: string) => part.toLowerCase().match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? [];
  const kept = new Set(wordsOf(original));
  return sentences(text)
    .filter((sentence) => !wordsOf(sentence).every((word) => kept.has(word)))
    .join(" ");
}

// `previous` is the line's earlier dictated wording, if any: a spoken edit such
// as "change the size to 18 mm" legitimately keeps the side and other numbers.
// `original` is the line as it stood before this edit, often the template's
// normal wording, which a rewritten line may keep beside the new finding.
export function validateLine(
  text: string,
  source: string,
  dictation: string,
  previous = "",
  original = "",
): string[] {
  const warnings: string[] = [];

  if (!normalise(dictation).includes(normalise(source))) {
    warnings.push("Could not match this line to the dictation.");
    return warnings;
  }

  const spokenNumbers = numbers(`${dictation} ${previous}`);
  const unspoken = numbers(text).filter((value) => !spokenNumbers.includes(value));
  if (unspoken.length > 0) {
    warnings.push(`Number not in dictation: ${unspoken.join(", ")}.`);
  }

  // "Left kidney, I mean right kidney": the side the doctor corrected away is not expected in the line.
  const meant = hasCorrection(source) ? resolveCorrections(tidySpoken(source)).text : source;
  for (const [side, pattern] of Object.entries(SIDES)) {
    if (pattern.test(text) && !pattern.test(`${source} ${previous}`)) {
      warnings.push(`Side "${side}" is not in the dictated words.`);
    }
    if (pattern.test(meant) && !pattern.test(text)) {
      warnings.push(`Dictated side "${side}" is missing from this line.`);
    }
  }

  // "Liver is normal in size. A 2 cm lesion…": the kept normal wording is not
  // compared with the dictation, only what was written from it. When nothing
  // new was written, the whole line is compared, so a finding that never made
  // it in ("mild hydronephrosis" left as "No hydronephrosis") is still caught.
  const written = dictatedPart(text, original) || text;
  if (NEGATION.test(written) !== NEGATION.test(source)) {
    warnings.push("Check negation against the dictation.");
  }

  return warnings;
}
