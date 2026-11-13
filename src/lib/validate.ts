// Plain-code safety checks on a generated line. These catch the errors that
// matter most in a report: wrong side, wrong number, flipped negation. They
// only flag; the radiologist decides.

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

// `previous` is the line's earlier dictated wording, if any: a spoken edit such
// as "change the size to 18 mm" legitimately keeps the side and other numbers.
export function validateLine(
  text: string,
  source: string,
  dictation: string,
  previous = "",
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

  for (const [side, pattern] of Object.entries(SIDES)) {
    if (pattern.test(text) && !pattern.test(`${source} ${previous}`)) {
      warnings.push(`Side "${side}" is not in the dictated words.`);
    }
    if (pattern.test(source) && !pattern.test(text)) {
      warnings.push(`Dictated side "${side}" is missing from this line.`);
    }
  }

  if (NEGATION.test(text) !== NEGATION.test(source)) {
    warnings.push("Check negation against the dictation.");
  }

  return warnings;
}
