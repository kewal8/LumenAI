import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { apiUser, fail, handle } from "@/lib/auth/respond";
import { parseTemplateDraft } from "@/lib/templateInput";

const MODEL = process.env.REPORT_MODEL ?? "claude-opus-5-5";
const MAX_CHARACTERS = 20000;

const client = new Anthropic();

const TemplateSchema = z.object({
  name: z.string(),
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), lines: z.array(z.string()) })),
  normalImpression: z.array(z.string()),
});

const SYSTEM = `You convert a radiologist's reporting template, pasted as plain text, into a structured form for a dictation tool.

How the result is used: the tool starts every report from this template with all lines in their normal wording. When the radiologist dictates an abnormal finding, the tool replaces the one line that finding belongs to. So each line should describe one structure or one question (for example the ventricles, the midline, the bones) and be replaceable on its own. A paragraph that covers several structures works badly, because one finding would replace statements about unrelated structures.

Keep the radiologist's own wording, spelling and order exactly. Do not improve the medicine, add structures they did not include, or drop any. Only split and organise.

Return:
- name: a short label for a template list, such as "CT Brain (Plain)". Use the template's own title if it has one.
- title: the heading printed at the top of the report, in the capitalisation the template uses.
- sections: the template's sections in order. heading is the section name without a trailing colon. Do not create a section for the impression; it is returned separately. Leave out patient details, dates, referring doctor, letterhead and signature blocks, which the PACS fills in.
- lines: the section's normal statements, one structure per line. Split a multi-sentence paragraph into separate lines where the sentences cover different structures; keep sentences together when they describe the same structure.
- normalImpression: the impression the template gives when everything is normal, one item per line. If the template has no impression wording, return one line: "No significant abnormality detected."

Placeholders such as blanks, underscores or "[ ]" for measurements stay in the line as written.`;

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;

  const { text } = await request.json();
  if (typeof text !== "string" || text.trim().length < 20) {
    return fail(400, "Paste the template text first.");
  }
  if (text.length > MAX_CHARACTERS) {
    return fail(400, "That is too long for one template. Paste one template at a time.");
  }

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // A declined request is re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(TemplateSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `<template_text>\n${text}\n</template_text>` }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fail(422, "This text could not be converted. Start with a blank template instead.");
    }
    const draft = parseTemplateDraft(response.parsed_output);
    if (typeof draft === "string") {
      return fail(422, "This text could not be converted. Start with a blank template instead.");
    }
    return Response.json({ ok: true, draft });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(500, "ANTHROPIC_API_KEY is missing or invalid.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "Too many requests. Wait a moment and try again.");
    }
    if (error instanceof Anthropic.APIError) {
      return fail(502, "The conversion service had a problem. Try again.");
    }
    throw error;
  }
});
