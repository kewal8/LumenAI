// Each radiologist's own reporting style, learned from their finalized reports.
// It is a short plain-text profile: the phrases they use for positive and
// negative findings, how they word certainty, how they lay out the impression.
// The doctor can read, edit and reset it in Settings. Every dictation is
// written in it, and the final check leaves its phrases alone.
//
// Only that doctor's own finalized reports are read, never a draft and never
// anyone else's, and only the report wording: no patient details.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recordError } from "@/lib/monitor";
import type { Report } from "@/lib/report";
import { recordClaudeUsage } from "@/lib/usage";

const MODEL = process.env.REPORT_MODEL ?? "claude-opus-5-5";

/** Finalized reports needed before the first profile, and new ones between rebuilds. */
export const REPORTS_PER_BUILD = 3;
/** The most recent finalized reports a build reads. */
const READ_LAST = 20;
export const PROFILE_MAX = 8000;

export type StyleProfile = {
  profile: string;
  builtFrom: number;
  builtAt: string | null;
  editedAt: string | null;
  /** Finalized reports so far, so Settings can say how soon it is first built. */
  finalized: number;
};

export async function getStyleProfile(userId: string): Promise<StyleProfile> {
  const [row] = await db()`
    select p.profile, p.built_from, p.built_at, p.edited_at,
           (select count(*)::int from reports r where r.user_id = ${userId} and r.finalized_at is not null) as finalized
    from (select 1) one
    left join style_profiles p on p.user_id = ${userId}
  `;
  return {
    profile: row?.profile ?? "",
    builtFrom: row?.built_from ?? 0,
    builtAt: row?.built_at ? new Date(row.built_at).toISOString() : null,
    editedAt: row?.edited_at ? new Date(row.edited_at).toISOString() : null,
    finalized: row?.finalized ?? 0,
  };
}

/** The profile text alone, for the prompts; "" when there is none yet. */
export async function styleText(userId: string) {
  try {
    const [row] = await db()`select profile from style_profiles where user_id = ${userId}`;
    return typeof row?.profile === "string" ? row.profile.trim() : "";
  } catch (error) {
    // The style only shapes wording: a report is never blocked because it could not be read.
    console.error("Could not read the style profile:", error);
    return "";
  }
}

/** The doctor's own edit in Settings. */
export async function saveStyleProfile(userId: string, profile: string) {
  await db()`
    insert into style_profiles (user_id, profile, edited_at, updated_at)
    values (${userId}, ${profile}, now(), now())
    on conflict (user_id) do update set profile = excluded.profile, edited_at = now(), updated_at = now()
  `;
}

/** Starts over: the profile is emptied and learned again from the next finalized reports. */
export async function resetStyleProfile(userId: string) {
  await db()`
    insert into style_profiles (user_id, profile, built_from, built_at, edited_at, updated_at)
    values (${userId}, '', 0, null, null, now())
    on conflict (user_id) do update set profile = '', built_from = (
      select count(*)::int from reports r where r.user_id = ${userId} and r.finalized_at is not null
    ), built_at = null, edited_at = null, updated_at = now()
  `;
}

const ProfileSchema = z.object({ profile: z.string() });

const SYSTEM = `You keep a radiologist's reporting-style profile for a radiology dictation tool. The tool writes each report from the radiologist's dictation, and reads this profile so the report sounds like them. You are given their most recent finalized reports (the wording they signed) and their current profile, and you return the updated profile.

The profile is plain text for the radiologist to read and edit, under these headings, each with short bullet points that quote their actual wording:
Positive findings: how they introduce an abnormality ("Evidence of ... is noted.", "... is seen in ...").
Negative findings: how they state normal and negative findings ("No evidence of ...", "The visualized portions of ... appear normal.").
Certainty: the phrases they use for degrees of confidence ("suggestive of", "consistent with", "possibility of ... cannot be excluded"), noted as distinct levels, never merged.
Anatomy and terms: preferred anatomical descriptions, terms and spellings (British or American), abbreviations they use and those they spell out.
Sentences: sentence length and structure, how much descriptive detail they give.
Impression: how they lay it out (order, length of items, opening phrases such as "Imaging features suggestive of ...", how they close it).

Rules:
- Learn only habits that recur across several reports. A one-off phrase is not a preference.
- Record wording only. Never copy a patient's name, age, sex, dates, hospital or ID numbers, and never record a particular patient's findings.
- Never record a diagnostic error or an unsafe habit as a preference, even if it appears in the reports: a confusion of sides, a certainty phrase used for something it does not fit, a dropped negative.
- The profile describes how to word findings. It must never tell the writer to add, drop, merge or change findings, sides, measurements or certainty.
- Keep anything in the current profile that the radiologist wrote or corrected by hand unless the reports clearly contradict it, and refine the rest.
- At most about 350 words. If the reports show no clear habits yet, return the current profile unchanged.`;

const client = new Anthropic();

/** A finalized report's wording, without the patient's details or the editor's layout. */
function wording(content: Report) {
  const sections = (content.sections ?? [])
    .map((section) => `${section.heading}:\n${section.lines.map((line) => line.text).filter((text) => text.trim()).join("\n")}`)
    .join("\n\n");
  const impression = (content.impression ?? []).filter((text) => text.trim());
  return impression.length ? `${sections}\n\nIMPRESSION:\n${impression.join("\n")}` : sections;
}

/**
 * Rebuilds the profile from the doctor's latest finalized reports. With
 * `force` false it runs only once enough new reports have been finalized
 * since the last build. Returns true when the profile changed.
 */
export async function rebuildStyleProfile(user: CurrentUser, { force = false } = {}) {
  const current = await getStyleProfile(user.id);
  if (current.finalized < REPORTS_PER_BUILD) return false;
  if (!force && current.finalized - current.builtFrom < REPORTS_PER_BUILD) return false;

  const rows = await db()`
    select content from reports
    where user_id = ${user.id} and finalized_at is not null
    order by finalized_at desc
    limit ${READ_LAST}
  `;
  const reports = rows.map((row) => wording(row.content as Report)).filter((text) => text.trim());
  if (!reports.length) return false;

  try {
    const started = performance.now();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ProfileSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `<current_profile edited_by_radiologist="${current.editedAt ? "yes" : "no"}">\n${current.profile || "(none yet)"}\n</current_profile>`,
            ...reports.map((text, index) => `<finalized_report n="${index + 1}">\n${text}\n</finalized_report>`),
          ].join("\n\n"),
        },
      ],
    });
    await recordClaudeUsage(user, "style", response.model, response.usage, performance.now() - started);
    const profile = response.parsed_output?.profile.trim().slice(0, PROFILE_MAX);
    if (response.stop_reason === "refusal" || !profile) return false;
    await db()`
      insert into style_profiles (user_id, profile, built_from, built_at, updated_at)
      values (${user.id}, ${profile}, ${current.finalized}, now(), now())
      on conflict (user_id) do update
      set profile = excluded.profile, built_from = excluded.built_from, built_at = now(), updated_at = now()
    `;
    return profile !== current.profile;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      await recordError("ai", { method: "POST", path: "/style-profile" }, error);
    }
    console.error("Could not rebuild the style profile:", error);
    return false;
  }
}

/** How the writer and the final check are told about the style. */
export function styleBlock(profile: string) {
  return profile
    ? `<radiologist_style>\n${profile}\n</radiologist_style>`
    : `<radiologist_style>No profile yet: follow the template's own wording.</radiologist_style>`;
}
