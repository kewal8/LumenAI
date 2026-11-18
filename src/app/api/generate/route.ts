import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { LOCKED_MESSAGE, editorLocked } from "@/lib/subscription";
import type { PatchOp, Report, Template } from "@/lib/report";
import { pathOf, recordError } from "@/lib/monitor";
import { recordClaudeUsage } from "@/lib/usage";
import { validateLine } from "@/lib/validate";
import { updateRefusal } from "@/lib/workspace";

const MODEL = process.env.REPORT_MODEL ?? "claude-opus-5-5";

const client = new Anthropic();

const PatchSchema = z.object({
  ops: z.array(
    z.object({
      op: z.enum(["replace", "add", "reset"]),
      sectionId: z.string(),
      lineId: z.string(),
      text: z.string(),
      source: z.string(),
    }),
  ),
  impression: z.array(z.string()),
  said: z.string(),
  revised: z.array(z.object({ id: z.string(), said: z.string() })),
});

const SYSTEM = `You are the report-writing engine inside a radiology dictation tool.

How the tool is used: a radiologist reads the images and dictates only the abnormal findings. Everything they do not mention stays as the normal wording from their template. Each new dictation is sent to you together with the template and the report as it currently stands, and you return the edits that bring the report up to date. The radiologist reviews and signs the result, and then pastes it into the hospital PACS, so it must read as a finished report.

The dictation comes from speech recognition, so radiology terms are sometimes misheard ("squamer" for "squamous", "occpital" for "occipital"). Fix obvious misrecognitions of terminology. Do not "fix" side (left/right), numbers, units or negation: write those exactly as dictated, even if they look unlikely, because the radiologist is the one who saw the images and a silent change there is the most dangerous error this tool can make.

In the report lines, never add a finding, measurement, imaging sign, cause or detail that was not dictated. Organise and word what the radiologist said; do not describe how it looks on a sequence, or add a reassuring negative, unless they said so. An invented finding in a signed report is a patient-safety problem, and the radiologist cannot easily spot a plausible sentence they did not say.

The dictation can also be an instruction about the existing report rather than a new finding, for example "change the size to 16 mm" or "remove the fracture". Apply it.

Radiologists correct themselves mid-sentence, the way people do when speaking: "18 cm stone in the gallbladder. Sorry, 15 cm", "left kidney, I mean right kidney", "4 mm, no wait, 6 mm". The words after the correction ("sorry", "I mean", "no wait", "correction", "make that") replace what they correct, so the corrected value or side is the dictated one: write only that, never both, and never the correction words themselves. The same goes for a correction of something said in an earlier dictation of this report. If it is not clear what a correction replaces, keep the words before it and let the safety checks flag the line rather than guess.

A template can be blank: sections with no lines and no normal impression. The radiologist then dictates only the positive findings, and nothing is assumed normal. Write each finding as its own line with "add" in the section it belongs to (FINDINGS unless another section fits), in finished report language, and base the impression only on those lines. Do not add normal statements that were not dictated.

Return edits as ops:
- "replace": rewrite an existing line, identified by sectionId and lineId. Use this when the dictated finding belongs to the structure a line describes, or makes that line's normal statement untrue. A report must not state a finding and also keep a normal line that contradicts it.
- "add": append a new line to a section when no existing line covers the finding. Set lineId to "".
- "reset": the radiologist withdrew a finding. Give the sectionId and lineId; the tool restores the template wording. Set text and source to "".
Leave untouched lines out of ops entirely.

For each replace or add:
- text: formal report prose in the style and spelling of the template lines. Several related findings about one structure can share a line.
- source: the words from the new dictation that this line is based on, copied exactly as they appear, misrecognitions included. The tool shows these to the radiologist and uses them to check side, numbers and negation, so they must be a verbatim excerpt. When the line comes from a self-correction, the excerpt covers both the first words and the correction, so the radiologist sees what was changed.

said: the new dictation as the radiologist meant it, shown back to them in the conversation beside the report. Apply their self-corrections (keep only the corrected value or side, drop the correction words), and drop false starts, repeated words and filler such as "so", "um" or "this is the test that I'm doing". Keep every finding, number, unit, side and negation exactly as finally dictated, in their order and words; fix only obvious misrecognitions of terminology, as in the report. Never add, explain or summarise. If nothing needs tidying, return the dictation unchanged.

revised: when the new dictation corrects something said in an earlier dictation of this report (listed in earlier_dictations), rewrite that earlier dictation as it should now read, with the correction applied, so the conversation reads as the radiologist finally meant it. Give its id and the full rewritten text, under the same rules as said. Include only earlier dictations whose content changes; usually none.

impression: the complete impression after your edits, as a list where each item is one short diagnosis. If the template has "noImpression": true, its reports have no impression section: return an empty list and never write one. If the report has no abnormal lines, return the template's normal impression unchanged. Otherwise write it the way a senior radiologist does, in three steps.

First, read every abnormal line now in the report and name what each one amounts to. Use the standard diagnostic term when the finding is that diagnosis by definition: a calculus in the common bile duct is choledocholithiasis, calculi in the gallbladder are cholelithiasis, a dilated pelvicalyceal system and ureter is hydroureteronephrosis. This naming is interpretation of what was dictated, which is the purpose of an impression, and it is different from inventing a finding. Where no single term says it more clearly, keep the finding in the radiologist's words with its level and side.

Second, put the items in order of clinical importance, not in template order: the finding that most changes what happens to the patient comes first (obstruction, nerve or cord compression, a mass, anything acute), incidental and minor findings come last. Join findings that belong together into one item, such as a stone with the dilatation upstream of it, a disc bulge with the narrowing and nerve root compression it causes, or a ligament tear with the bone contusions that go with it, so nothing is said twice. A change seen at several levels or sites can close the list as one summary item, such as "Multilevel degenerative disc disease".

Third, write each item briefly: a diagnosis, not a description. Keep the side, level and site. Keep a measurement only when it matters for management, such as the size of a stone or a lesion; leave out measurements of normal-sized organs. Never change the grade or certainty of a finding: mild stays mild, and "suggestive of" does not become a diagnosis. Do not turn an imaging finding into a clinical syndrome: compression of a nerve root is reported as compression, not as radiculopathy, which the images do not show.

A finding with a clear diagnosis needs nothing more: no differentials and no advice. A lesion the images cannot fully characterise is different (a mass, a space-occupying lesion, an indeterminate nodule). Describe it by its imaging character and site, never by a tissue diagnosis the radiologist did not dictate, then in the same item give the two or three standard imaging differentials for that appearance and the one correlation that would settle it, such as "Histopathological correlation is advised." If the radiologist dictated their own differentials or advice, use theirs and add none.

After the positive items, include a dictated negative finding only when it changes management in the light of the positive ones, such as no midline shift or hydrocephalus beside a brain lesion, or no acute infarction. Normal template lines the radiologist did not dictate are not listed.

Two examples of the result.
Findings: CBD is dilated, measuring 10 mm. Tiny calculus measuring 4 mm in the distal CBD. Multiple calculi in the gallbladder.
Impression: ["Choledocholithiasis with upstream CBD dilatation.", "Cholelithiasis."]
Findings: Disc desiccation at L4-L5 and L5-S1. Broad-based posterior disc bulge at L4-L5 causing bilateral lateral recess narrowing with compression of the traversing L5 nerve roots, with mild bilateral neural foraminal narrowing. At L5-S1, diffuse disc bulge with posterior annular fissure causing mild bilateral neural foraminal narrowing.
Impression: ["L4-L5 disc bulge causing bilateral lateral recess narrowing with compression of the traversing L5 nerve roots.", "L5-S1 diffuse disc bulge with posterior annular fissure and mild bilateral neural foraminal narrowing.", "Multilevel degenerative disc disease."]
Findings: Ill-defined T2/FLAIR hyperintense lesion measuring 2.8 x 2.4 cm in the right frontal lobe involving cortical and subcortical white matter, hypointense on T1, with heterogeneous post-contrast enhancement. Surrounding perilesional vasogenic edema causing mild effacement of the adjacent sulci. No significant midline shift. No acute diffusion restriction. Ventricular system normal.
Impression: ["Heterogeneously enhancing right frontal lobe intra-axial space-occupying lesion with surrounding vasogenic edema and mild local mass effect. Imaging differentials include high-grade glioma and solitary metastasis. Histopathological correlation is advised.", "No significant midline shift or hydrocephalus.", "No evidence of acute infarction."]
These show the pattern for three studies; apply the same reasoning to every modality and body part.`;

type GenerateRequest = {
  template: Template;
  report: Report;
  dictation: string;
  /** This report's earlier dictations as shown in the conversation, oldest first. */
  earlier?: { id: string; said: string }[];
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Signed out. Sign in again." }, { status: 401 });
  }
  if (await editorLocked(user)) return Response.json({ error: LOCKED_MESSAGE }, { status: 402 });
  const refusal = await updateRefusal(user);
  if (refusal) return Response.json({ error: refusal }, { status: 429 });

  const { template, report, dictation, earlier: sentEarlier }: GenerateRequest = await request.json();
  const earlier = (Array.isArray(sentEarlier) ? sentEarlier : [])
    .filter((entry) => typeof entry?.id === "string" && typeof entry?.said === "string")
    .slice(-30)
    .map((entry) => ({ id: entry.id.slice(0, 80), said: entry.said.slice(0, 4000) }));
  if (!dictation?.trim()) {
    return Response.json({ error: "Nothing was dictated." }, { status: 400 });
  }

  // Send only what the model needs: ids, text and whether a line is still normal.
  const currentReport = report.sections.map((section) => ({
    sectionId: section.id,
    heading: section.heading,
    lines: section.lines.map((line) => ({
      lineId: line.id,
      text: line.text,
      normal: line.status === "normal",
    })),
  }));

  try {
    const started = performance.now();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // A declined request is re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(PatchSchema),
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `<template>\n${JSON.stringify(template, null, 2)}\n</template>`,
            `<current_report>\n${JSON.stringify(currentReport, null, 2)}\n</current_report>`,
            `<current_impression>\n${JSON.stringify(report.impression)}\n</current_impression>`,
            `<earlier_dictations>\n${JSON.stringify(earlier, null, 2)}\n</earlier_dictations>`,
            `<new_dictation>\n${dictation}\n</new_dictation>`,
          ].join("\n\n"),
        },
      ],
    });

    await recordClaudeUsage(user, "report", response.model, response.usage, performance.now() - started);

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "The model declined this dictation. Type the change by hand." },
        { status: 422 },
      );
    }
    if (!response.parsed_output) {
      return Response.json(
        { error: "The model returned an unreadable result. Try again." },
        { status: 502 },
      );
    }

    const dictatedLines = new Map(
      report.sections
        .flatMap((section) => section.lines)
        .filter((line) => line.status !== "normal")
        .map((line) => [line.id, line.text]),
    );
    // Every line as it stands now, so the checks can tell kept wording from new.
    const currentLines = new Map(
      report.sections.flatMap((section) => section.lines).map((line) => [line.id, line.text]),
    );
    const ops: PatchOp[] = response.parsed_output.ops.map((op) => ({
      ...op,
      warnings:
        op.op === "reset"
          ? []
          : validateLine(op.text, op.source, dictation, dictatedLines.get(op.lineId), currentLines.get(op.lineId)),
    }));

    return Response.json({
      ops,
      // A template without an impression section never gets one, whatever the model returned.
      impression: template.noImpression ? [] : response.parsed_output.impression,
      said: response.parsed_output.said.trim(),
      // Only rewrites of dictations that were actually sent.
      revised: response.parsed_output.revised
        .filter((item) => earlier.some((entry) => entry.id === item.id) && item.said.trim())
        .map((item) => ({ id: item.id, said: item.said.trim() })),
    });
  } catch (error) {
    // Every failure of the model, rate limits included, is noted for the admin dashboard.
    if (error instanceof Anthropic.APIError) {
      await recordError("ai", { method: "POST", path: pathOf(request) }, error);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is missing or invalid." },
        { status: 500 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Rate limited. Wait a moment and try again." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `Report service error (${error.status}): ${error.message}` },
        { status: 502 },
      );
    }
    throw error;
  }
}
