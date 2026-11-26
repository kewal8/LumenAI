import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { pathOf, recordError } from "@/lib/monitor";
import { LOCKED_MESSAGE, editorLocked } from "@/lib/subscription";
import { styleBlock, styleText } from "@/lib/styleProfile";
import { recordClaudeUsage } from "@/lib/usage";
import { updateRefusal } from "@/lib/workspace";

const MODEL = process.env.REPORT_MODEL ?? "claude-opus-5-5";

const client = new Anthropic();

const IssuesSchema = z.object({
  issues: z.array(
    z.object({
      line: z.number().int(),
      kind: z.enum(["spelling", "grammar", "filler", "continuity"]),
      find: z.string(),
      replace: z.string(),
      reason: z.string(),
    }),
  ),
  impression_issues: z.array(
    z.object({
      kind: z.enum(["unsupported", "missing", "stale", "contradictory", "duplicate"]),
      find: z.string(),
      replace: z.string(),
      reason: z.string(),
    }),
  ),
});

const SYSTEM = `You check radiology reports inside a reporting tool, just before the radiologist finalizes them, always on the report as it stands now, with every edit the radiologist made. You suggest fixes; the radiologist accepts or keeps each one as written, so suggest only what is clearly wrong or clearly unnecessary.

Look for these in report_lines:
- spelling: misspelled words, medical terms above all ("hepatomegally", "parenchma"), and correctly spelled words that are wrong in context, which dictation often produces ("plural effusion" for pleural, "ileum" where the ilium bone is meant, "perineal" for peroneal, "callous" for callus).
- grammar: agreement, missing or doubled words, wrong word forms, broken sentences.
- filler: words that add nothing to a finished report: spoken filler ("so", "basically", "um", "okay"), repeated words, and dictation leftovers ("full stop", "new line", "next", "sorry"). Suggest removing them. Standard report phrasing is never filler: "There is evidence of ...", "Evidence of ... is noted.", "... is noted involving ...", "... is seen in ...", "No obvious evidence of ...", "The visualized portions of ... appear normal." and the like are how radiologists write, and every phrase in radiologist_style is this radiologist's own way of writing. Leave them all alone.
- continuity: a line describing an abnormality in part of a structure, where the template (template_normal) describes the rest of that structure as normal and the report no longer says so anywhere. For example, a fracture of the lateral femoral condyle with no remaining statement that the distal femoral shaft and the rest of the visualized femur appear normal. Suggest putting the remainder back: find is the end of the line (as short as possible, but unique in it), replace is that same text followed by the template's normal wording for the remaining part, said for the remainder ("The remaining visualized portions of the proximal tibia appear normal."). Only when the template has such wording and no line of the report already says it; never invent normal wording, and never on a line about a different structure.

Rules, because a silent change to a signed report is a patient-safety problem:
- Never change a side (left/right), a number, a unit, a measurement, a level or a negation (no, not, without, absent), and never suggest removing them.
- Never add, remove or reinterpret a finding. Filler is only wording; a finding is never filler, even if it seems unimportant.
- Keep the report's own spelling style: British and Indian spellings (oedema, haemorrhage, oesophagus, centre) are correct.
- Do not flag headings, abbreviations in common radiology use (CT, MRI, HU, CBD, IVC), or wording that is merely a matter of taste.

For each issue:
- line: the index of the line, as given.
- find: the exact text to change, copied character for character from that line, as short as possible but long enough to occur only once in the line.
- replace: the corrected text, or "" to remove it.
- reason: a few plain words for the radiologist, such as "Misspelling of pleural" or "Repeated word".

Then check impression against the final findings (findings, the report lines under their headings). The impression must be written from the findings as they stand now, after the radiologist's edits, not from an earlier version. Report as impression_issues:
- unsupported: an item that no finding supports, a diagnosis with no finding behind it.
- stale: an item whose finding was removed or changed since (a size, side, site or level the findings no longer say).
- contradictory: an item that says the opposite of a finding, or the wrong side.
- missing: a significant abnormal finding the impression leaves out. Normal and negative findings do not need to be in the impression.
- duplicate: the same diagnosis said twice.
For each: find is the impression item copied exactly as given (empty for missing); replace is the corrected item, written as a brief diagnosis in the impression's own style and in radiologist_style (empty to remove the item). Keep the finding's side, site, level, size and certainty exactly as the findings say them: never raise or lower certainty, never add a grade or diagnosis the findings do not support. Never touch the clinical-correlation items listed in correlation. When the impression matches the findings, return no impression_issues. If the report has no impression (impression is empty and has_impression is false), return none.

If nothing needs fixing, return no issues.`;

const SIDES = /\b(left|right|bilateral|both)\b/gi;
const NEGATIONS = /\b(no|not|without|absent|negative|nil|none)\b/gi;
const words = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).map((word) => word.toLowerCase()).sort().join(",");
const numbers = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");

/** True when a fix keeps every side, number and negation, whatever the model suggested. */
function safe(find: string, replace: string) {
  return (
    numbers(find) === numbers(replace) &&
    words(find, SIDES) === words(replace, SIDES) &&
    words(find, NEGATIONS) === words(replace, NEGATIONS)
  );
}

const has = (pool: string, items: string) => items.split(",").filter(Boolean).every((item) => pool.split(",").includes(item));

/**
 * A continuity fix only adds normal wording after what the line already says:
 * nothing is removed, no side the line does not name, no number the line or
 * the template does not have.
 */
function safeAddition(line: string, find: string, replace: string, template: string) {
  return (
    replace.startsWith(find) &&
    replace.length > find.length &&
    has(words(line, SIDES), words(replace, SIDES)) &&
    has(numbers(`${line} ${template}`), numbers(replace))
  );
}

/** An impression fix may only name sides and numbers that the findings name. */
function safeImpression(replace: string, findings: string) {
  return has(words(findings, SIDES), words(replace, SIDES)) && has(numbers(findings), numbers(replace));
}

const texts = (value: unknown, max: number) =>
  (Array.isArray(value) ? value : []).filter((item): item is string => typeof item === "string").slice(0, max).map((item) => item.slice(0, 2000));

const sectionsOf = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .slice(0, 60)
    .map((section) => ({
      heading: typeof section?.heading === "string" ? section.heading.slice(0, 200) : "",
      lines: texts(section?.lines, 200),
    }));

/**
 * Checks the report before it is finalized: spelling, grammar and filler
 * words, normal findings kept for the rest of each structure, and whether the
 * impression still matches the findings. Uses one AI update, like a dictation.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Signed out. Sign in again." }, { status: 401 });
  if (await editorLocked(user)) return Response.json({ error: LOCKED_MESSAGE }, { status: 402 });
  const refusal = await updateRefusal(user);
  if (refusal) return Response.json({ error: refusal }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const lines: string[] = (Array.isArray(body.lines) ? body.lines : [])
    .slice(0, 400)
    .map((line: unknown) => (typeof line === "string" ? line.slice(0, 2000) : ""));
  if (!lines.some((line) => line.trim())) {
    return Response.json({ error: "The report is empty." }, { status: 400 });
  }
  // The report's parts, for the impression and continuity checks.
  const findings = sectionsOf(body.findings);
  const templateNormal = sectionsOf(body.templateNormal);
  const impression = texts(body.impression, 60);
  const correlation = texts(body.correlation, 10);
  const hasImpression = body.hasImpression !== false;
  const findingsText = findings.flatMap((section) => section.lines).join(" ");
  const templateText = templateNormal.flatMap((section) => section.lines).join(" ");
  // This radiologist's own wording, so the check leaves it alone.
  const style = await styleText(user.id);

  try {
    const started = performance.now();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      // A declined request is re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(IssuesSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `<report_lines>\n${JSON.stringify(
              lines.map((text, line) => ({ line, text })).filter((entry) => entry.text.trim()),
              null,
              2,
            )}\n</report_lines>`,
            `<findings>\n${JSON.stringify(findings, null, 2)}\n</findings>`,
            `<template_normal>\n${JSON.stringify(templateNormal, null, 2)}\n</template_normal>`,
            `<impression has_impression="${hasImpression}">\n${JSON.stringify(impression, null, 2)}\n</impression>`,
            `<correlation>\n${JSON.stringify(correlation)}\n</correlation>`,
            styleBlock(style),
          ].join("\n\n"),
        },
      ],
    });

    await recordClaudeUsage(user, "report", response.model, response.usage, performance.now() - started);

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "The check could not be done. Try again." }, { status: 502 });
    }

    const seen = new Set<string>();
    const issues = response.parsed_output.issues.filter((issue) => {
      const key = `${issue.line}:${issue.find}`;
      const ok =
        issue.find !== issue.replace &&
        issue.find.trim() !== "" &&
        (lines[issue.line] ?? "").includes(issue.find) &&
        (issue.kind === "continuity"
          ? safeAddition(lines[issue.line], issue.find, issue.replace, templateText)
          : safe(issue.find, issue.replace)) &&
        !seen.has(key);
      seen.add(key);
      return ok;
    });

    // Impression suggestions name an item exactly as it stands (or none, to add one),
    // never the correlation line, and never a side or number the findings do not have.
    const seenItems = new Set<string>();
    const impressionIssues = (hasImpression ? response.parsed_output.impression_issues : []).filter((issue) => {
      const find = issue.find.trim();
      const replace = issue.replace.trim();
      const ok =
        (find || replace) &&
        find !== replace &&
        (find === "" || impression.includes(issue.find)) &&
        !correlation.includes(issue.find) &&
        !correlation.includes(issue.replace) &&
        (replace === "" || safeImpression(replace, findingsText)) &&
        !seenItems.has(find || `+${replace}`);
      seenItems.add(find || `+${replace}`);
      return ok;
    });

    return Response.json({ issues, impressionIssues });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      await recordError("ai", { method: "POST", path: pathOf(request) }, error);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited. Wait a moment and try again." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Check service error (${error.status}): ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
