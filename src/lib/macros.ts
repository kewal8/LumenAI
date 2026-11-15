/** A doctor's short form and the text it stands for. */
export type Macro = { id: string; shortForm: string; body: string };

export const SHORT_FORM_LIMIT = 30;
export const MACRO_BODY_LIMIT = 1000;

/** The short form as stored, or a message saying what is wrong with it. */
export function checkShortForm(value: unknown): string | { error: string } {
  const shortForm = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (shortForm.length < 2) return { error: "The short form needs at least 2 letters." };
  if (shortForm.length > SHORT_FORM_LIMIT) return { error: "Keep the short form under 30 characters." };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u.test(shortForm)) {
    return { error: "Use letters, numbers, spaces or hyphens in the short form." };
  }
  return shortForm;
}

export function checkBody(value: unknown): string | { error: string } {
  const body = typeof value === "string" ? value.trim() : "";
  if (!body) return { error: "Enter the full text." };
  if (body.length > MACRO_BODY_LIMIT) return { error: "Keep the full text under 1,000 characters." };
  return body;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * How a short form may arrive. Typed, it is the word itself. Spoken, speech
 * recognition may spell a short abbreviation out ("C S V", "c.s.v."), so the
 * letters of each short word may be split by spaces or dots.
 */
function shortFormPattern(shortForm: string) {
  return shortForm
    .split(" ")
    .map((word) =>
      /^\p{L}{2,5}$/u.test(word) ? [...word].map(escape).join("[\\s.]*") : escape(word),
    )
    .join("[\\s-]+");
}

/**
 * Takes out the macro that appears last in the text, as its full text or as
 * its short form, for "delete last macro". Returns the text unchanged and
 * null when there is none.
 */
export function removeLastMacro(text: string, macros: Macro[]) {
  let last: { start: number; end: number; macro: Macro } | null = null;
  for (const macro of macros) {
    const patterns = [
      escape(macro.body),
      `(?<![\\p{L}\\p{N}])${shortFormPattern(macro.shortForm)}(?![\\p{L}\\p{N}])`,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(new RegExp(pattern, "giu"))) {
        const end = match.index + match[0].length;
        if (!last || end > last.end || (end === last.end && match.index < last.start)) {
          last = { start: match.index, end, macro };
        }
      }
    }
  }
  if (!last) return { text, macro: null };
  const before = text.slice(0, last.start).replace(/[ \t]+$/, "");
  const after = text.slice(last.end).replace(/^[ \t]*\.?[ \t]*/, "");
  return { text: before && after ? `${before} ${after}` : before + after, macro: last.macro };
}

/**
 * Replaces every short form in dictated text with its full text, whole words
 * only and in any letter case. Longer short forms go first, so "CSV brain"
 * wins over "CSV".
 */
export function expandMacros(text: string, macros: Macro[]) {
  const ordered = [...macros].sort((a, b) => b.shortForm.length - a.shortForm.length);
  let result = text;
  for (const macro of ordered) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${shortFormPattern(macro.shortForm)}(?![\\p{L}\\p{N}])(\\.)?`,
      "giu",
    );
    // A full stop after the short form ends the sentence the full text already ends.
    const ends = /[.!?]$/.test(macro.body);
    result = result.replace(pattern, (_match, stop?: string) => macro.body + (stop && !ends ? stop : ""));
  }
  return result;
}
