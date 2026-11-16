import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parsePatient } from "@/lib/patient";
import { parseReportInput } from "@/lib/reportStore";

export const POST = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!user.org) return fail(403, "Your account is not part of an organisation.");

  const body = await request.json();
  const input = parseReportInput(body);
  if (typeof input === "string") return fail(400, input);
  const finalize = body?.finalize === true;
  // A report is saved for a patient: the details are asked for before the first save.
  const patient = parsePatient(body?.patient);
  if (typeof patient === "string") return fail(400, patient);
  if (!patient) return fail(400, "Enter the patient's details before saving.");
  // When the doctor first changed this report, from the report screen. Only a
  // time in the last 12 hours is believed; anything else is left unknown.
  const started = typeof body?.startedAt === "string" ? new Date(body.startedAt) : null;
  const startedAt =
    started && !Number.isNaN(started.getTime()) && started.getTime() <= Date.now() && Date.now() - started.getTime() < 12 * 3600_000
      ? started
      : null;

  // The template copy is stored once per distinct template and shared by its
  // reports: the report keeps only its fingerprint (see migration 019).
  const template = JSON.stringify(input.template);
  const [row] = await db()`
    with copy as (
      insert into report_templates (hash, body)
      values (encode(sha256(convert_to(${template}::jsonb::text, 'UTF8')), 'hex'), ${template}::jsonb)
      -- Counts as in use again, so the nightly clean-up cannot remove it mid-save.
      on conflict (hash) do update set created_at = now()
    )
    insert into reports (org_id, user_id, template_name, title, template_hash, content, finalized_at,
                         first_finalized_at, started_at, patient_name, patient_age, patient_age_unit, patient_sex, study, modality)
    values (${user.org.id}, ${user.id}, ${input.template.name}, ${input.report.title},
            encode(sha256(convert_to(${template}::jsonb::text, 'UTF8')), 'hex'), ${JSON.stringify(input.report)}::jsonb,
            ${finalize ? new Date() : null}, ${finalize ? new Date() : null}, ${startedAt},
            ${patient.name}, ${patient.age}, ${patient.ageUnit}, ${patient.sex}, ${patient.study}, ${patient.modality})
    returning id, finalized_at
  `;
  return Response.json({ ok: true, id: row.id, finalizedAt: row.finalized_at });
});
