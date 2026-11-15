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

  const [row] = await db()`
    insert into reports (org_id, user_id, template_name, title, template, content, finalized_at,
                         patient_name, patient_age, patient_age_unit, patient_sex, study, modality)
    values (${user.org.id}, ${user.id}, ${input.template.name}, ${input.report.title},
            ${JSON.stringify(input.template)}::jsonb, ${JSON.stringify(input.report)}::jsonb,
            ${finalize ? new Date() : null},
            ${patient.name}, ${patient.age}, ${patient.ageUnit}, ${patient.sex}, ${patient.study}, ${patient.modality})
    returning id, finalized_at
  `;
  return Response.json({ ok: true, id: row.id, finalizedAt: row.finalized_at });
});
