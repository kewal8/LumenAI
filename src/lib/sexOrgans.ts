import type { Sex } from "./patient";
import type { PatchOp, Report } from "./report";

/**
 * Organs that only one sex has. Pelvis templates often carry normal lines for
 * both a prostate and a uterus; only one set can belong to a patient.
 *
 * The rules, from the radiologists who use the tool:
 * - A dictated prostate finding makes the report male, a dictated uterine or
 *   ovarian finding makes it female. Failing that, the recorded sex decides.
 * - Untouched normal lines about the other sex's organs are removed.
 * - A dictated finding is never removed. If findings for both sexes are in the
 *   report, or a finding contradicts the recorded sex, nothing is removed and
 *   the radiologist is asked to check: a recorded sex can be wrong, and
 *   anatomy does not always follow it.
 */
export type OrganSex = "male" | "female";

const MALE =
  /\b(prostate|prostatic|seminal vesicles?|testis|testes|testicles?|testicular|scrotum|scrotal|epididym\w*|penis|penile|spermatic cords?)\b/i;
const FEMALE =
  /\b(uterus|uterine|cervix|cervical os|endometri\w+|myometri\w+|ovary|ovaries|ovarian|adnexa\w*|parametri\w+|fallopian|vagina\w*|pouch of douglas)\b/i;

/** Which sex's organs a line talks about, if any. */
export function organSexOf(text: string): OrganSex | "both" | null {
  const male = MALE.test(text);
  const female = FEMALE.test(text);
  if (male && female) return "both";
  return male ? "male" : female ? "female" : null;
}

export function sexFromLabel(sex: Sex | null | undefined): OrganSex | null {
  return sex === "Male" ? "male" : sex === "Female" ? "female" : null;
}

const SPOKEN_SEX =
  /\b(male|female)\s+(?:patient|pt|child|infant|adult)\b|\b(?:patient|pt)\s+is\s+(?:an?\s+)?(?:\w+\s+)?(male|female)\b|\byears?[\s-]+old\s+(male|female)\b/gi;

/**
 * The sex the radiologist stated in a dictation ("male patient", "patient is
 * female", "45 year old male"). The last one said wins, so a self-correction
 * is respected. Null when the dictation does not state it.
 */
export function sexFromDictation(dictation: string): Sex | null {
  let said: string | null = null;
  for (const match of dictation.matchAll(SPOKEN_SEX)) said = (match[1] ?? match[2] ?? match[3]).toLowerCase();
  return said === "male" ? "Male" : said === "female" ? "Female" : null;
}

const NAME: Record<OrganSex, string> = { male: "male", female: "female" };
const ORGANS: Record<OrganSex, string> = { male: "prostate", female: "uterus or ovaries" };

export const BOTH_SEXES_WARNING =
  "This report has findings for both a prostate and a uterus or ovaries. Check the patient's sex and these findings.";

function labelWarning(label: OrganSex, found: OrganSex) {
  return `The patient is recorded as ${NAME[label]}, but this report has a finding about the ${ORGANS[found]}. Check the patient's details and this finding.`;
}

export type OrganPlan = {
  /** The sex the report is written for, once it is clear. */
  sex: OrganSex | null;
  /** Set when the findings disagree with each other or with the recorded sex. Nothing is removed then. */
  conflict: string | null;
  /** Untouched normal lines about the other sex's organs. */
  remove: { sectionId: string; lineId: string; text: string }[];
};

/** Works out what the rules above mean for a report as it stands. */
export function organPlan(report: Pick<Report, "sections">, label: OrganSex | null): OrganPlan {
  const lines = report.sections.flatMap((section) =>
    section.lines.map((line) => ({ sectionId: section.id, line, organ: organSexOf(line.text) })),
  );
  const dictated = (sex: OrganSex) =>
    lines.some(({ line, organ }) => line.status !== "normal" && (organ === sex || organ === "both"));
  const male = dictated("male");
  const female = dictated("female");
  if (male && female) return { sex: null, conflict: BOTH_SEXES_WARNING, remove: [] };

  const found: OrganSex | null = male ? "male" : female ? "female" : null;
  if (label && found && label !== found) return { sex: null, conflict: labelWarning(label, found), remove: [] };

  const sex = found ?? label;
  if (!sex) return { sex: null, conflict: null, remove: [] };
  const other: OrganSex = sex === "male" ? "female" : "male";
  return {
    sex,
    conflict: null,
    remove: lines
      .filter(({ line, organ }) => line.status === "normal" && organ === other)
      .map(({ sectionId, line }) => ({ sectionId, lineId: line.id, text: line.text })),
  };
}

/** The plan's removals as edits. The text is the removed wording, for the report's history. */
export function removalOps(remove: OrganPlan["remove"]): PatchOp[] {
  return remove.map((line) => ({ op: "remove", ...line, source: "", warnings: [] }));
}

/**
 * Lines the AI also asked to remove are accepted only when they are untouched
 * normal wording that directly follows a removed organ line, such as
 * "No focal lesion is seen." after the uterus line. Anything else is kept.
 */
export function continuationRemovals(
  report: Pick<Report, "sections">,
  remove: OrganPlan["remove"],
  asked: { sectionId: string; lineId: string }[],
): OrganPlan["remove"] {
  const gone = new Set(remove.map((line) => line.lineId));
  const wanted = new Set(asked.map((line) => line.lineId));
  const extra: OrganPlan["remove"] = [];
  for (const section of report.sections) {
    let grew = true;
    while (grew) {
      grew = false;
      section.lines.forEach((line, index) => {
        if (gone.has(line.id) || !wanted.has(line.id)) return;
        if (line.status !== "normal" || organSexOf(line.text) !== null) return;
        // Only a line that follows a removed one continues it; the line before never does.
        const before = section.lines[index - 1];
        if (!before || !gone.has(before.id)) return;
        gone.add(line.id);
        extra.push({ sectionId: section.id, lineId: line.id, text: line.text });
        grew = true;
      });
    }
  }
  return extra;
}
