import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { pathOf, recordError } from "@/lib/monitor";
import { LOCKED_MESSAGE, editorLocked } from "@/lib/subscription";
import { recordClaudeUsage } from "@/lib/usage";
import { updateRefusal } from "@/lib/workspace";

const MODEL = process.env.REPORT_MODEL ?? "claude-opus-5-5";

const client = new Anthropic();

const IssuesSchema = z.object({
  issues: z.array(
    z.object({
      line: z.number().int(),
      kind: z.enum(["spelling", "grammar", "filler"]),
      find: z.string(),
      replace: z.string(),
      reason: z.string(),
    }),
  ),
});

const SYSTEM = `You proofread radiology reports inside a reporting tool, just before the radiologist finalizes them. You suggest fixes; the radiologist accepts or ignores each one, so suggest only what is clearly wrong or clearly unnecessary.

Look for three things:
- spelling: misspelled words, medical terms above all ("hepatomegally", "parenchma"), and correctly spelled words that are wrong in context, which dictation often produces ("plural effusion" for pleural, "ileum" where the ilium bone is meant, "perineal" for peroneal, "callous" for callus).
- grammar: agreement, missing or doubled words, wrong word forms, broken sentences.
- filler: words that add nothing to a finished report: spoken filler ("so", "basically", "um", "okay"), repeated words, dictation leftovers ("full stop", "new line", "next", "sorry"), and empty phrases ("it is seen that", "noted to be", "there is evidence of"). Suggest removing them, or a shorter wording that keeps the meaning.

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

/**
 * Checks the report's spelling, grammar and filler words before it is
 * finalized. Uses one AI update, like a dictation.
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
          content: `<report_lines>\n${JSON.stringify(
            lines.map((text, line) => ({ line, text })).filter((entry) => entry.text.trim()),
            null,
            2,
          )}\n</report_lines>`,
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
        safe(issue.find, issue.replace) &&
        !seen.has(key);
      seen.add(key);
      return ok;
    });

    return Response.json({ issues });
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
