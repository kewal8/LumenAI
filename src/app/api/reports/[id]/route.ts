import { apiUser, fail, handle } from "@/lib/auth/respond";
import { asUuid, db } from "@/lib/db";
import { parsePatient } from "@/lib/patient";
import { parseReportInput } from "@/lib/reportStore";

type Context = RouteContext<"/api/reports/[id]">;

export const PATCH = handle<Context>(async (request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = await request.json();
  const input = parseReportInput(body);
  if (typeof input === "string") return fail(400, input);
  // Finalizing stamps the time; an ordinary save keeps the last finalized time.
  const finalize = body?.finalize === true;
  // Details are kept as they were when none are sent.
  const patient = parsePatient(body?.patient);
  if (typeof patient === "string") return fail(400, patient);
  const keep = patient === null;

  const { id } = await context.params;
  // The template copy is stored once and shared; the report keeps its fingerprint.
  const template = JSON.stringify(input.template);
  const updated = await db()`
    with copy as (
      insert into report_templates (hash, body)
      values (encode(sha256(convert_to(${template}::jsonb::text, 'UTF8')), 'hex'), ${template}::jsonb)
      -- Counts as in use again, so the nightly clean-up cannot remove it mid-save.
      on conflict (hash) do update set created_at = now()
    )
    update reports
    set template_name = ${input.template.name}, title = ${input.report.title},
        template_hash = encode(sha256(convert_to(${template}::jsonb::text, 'UTF8')), 'hex'),
        template = null,
        content = ${JSON.stringify(input.report)}::jsonb, updated_at = now(),
        finalized_at = case when ${finalize} then now() else finalized_at end,
        first_finalized_at = case when ${finalize} then coalesce(first_finalized_at, now()) else first_finalized_at end,
        patient_name = case when ${keep} then patient_name else ${patient?.name ?? null} end,
        patient_age = case when ${keep} then patient_age else ${patient?.age ?? null}::int end,
        patient_age_unit = case when ${keep} then patient_age_unit else ${patient?.ageUnit ?? null} end,
        patient_sex = case when ${keep} then patient_sex else ${patient?.sex ?? null} end,
        study = case when ${keep} then study else ${patient?.study ?? null} end,
        modality = case when ${keep} then modality else ${patient?.modality ?? null} end
    where id = ${asUuid(id)}::uuid and user_id = ${user.id}
    returning id, finalized_at
  `;
  if (updated.length === 0) return fail(404, "That report no longer exists.");
  return Response.json({ ok: true, id, finalizedAt: updated[0].finalized_at });
});

export const DELETE = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const removed = await db()`
    delete from reports where id = ${asUuid(id)}::uuid and user_id = ${user.id} returning id
  `;
  if (removed.length === 0) return fail(404, "That report no longer exists.");
  return Response.json({ ok: true });
});
