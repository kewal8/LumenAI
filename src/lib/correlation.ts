// The closing line of a template's impression that asks for clinical
// correlation ("Kindly correlate clinically & with other investigations.").
// It is the radiologist's own standing line: whatever impression is written,
// it stays, word for word, at the end.

import type { Template } from "./report";

const same = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** A short line that only asks for correlation, not a finding that mentions it. */
function isCorrelationLine(text: string) {
  return /\bcorrelat/i.test(text) && !/\d/.test(text) && text.trim().split(/\s+/).length <= 12;
}

/** The model's own version of the same request, which the template's line replaces. */
const REWORDED = /^\W*(?:kindly |please )?(?:correlate clinically|clinical correlation|clinico)/i;

export function correlationLines(template: Template): string[] {
  return template.noImpression ? [] : template.normalImpression.filter(isCorrelationLine);
}

/**
 * Puts the template's correlation lines back at the end of an impression, in
 * their original wording, dropping any copy or rewording of them above.
 */
export function keepCorrelation(impression: string[], template: Template): string[] {
  const standing = correlationLines(template);
  if (!standing.length || !impression.length) return impression;
  const known = new Set(standing.map(same));
  const written = impression.filter((item) => !known.has(same(item)) && !(REWORDED.test(item) && isCorrelationLine(item)));
  return [...written, ...standing];
}
