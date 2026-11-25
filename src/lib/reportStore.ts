import type { CurrentUser } from "@/lib/auth/session";
import { asUuid, db } from "@/lib/db";
import { likePattern, offsetOf, type ListParams, type Paged } from "@/lib/listQuery";
import { patientFromRow, type Patient } from "./patient";
import type { Report, Template } from "./report";

export type SavedReportSummary = {
  id: string;
  templateName: string;
  title: string;
  /** First line of the impression, to tell reports apart in a list. */
  impression: string;
  /** Lines that differ from the template's normal wording. */
  findings: number;
  createdAt: string;
  updatedAt: string;
  /** When the doctor finalized it; null for a draft. */
  finalizedAt: string | null;
  /** Who it is for; null for a report saved before details were asked for. */
  patient: Patient | null;
};

export type SavedReport = {
  id: string;
  template: Template;
  report: Report;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  patient: Patient | null;
};

const MAX_BYTES = 300_000;

/** Checks a report sent for saving. Returns the cleaned pair or a message. */
export function parseReportInput(body: unknown): { template: Template; report: Report } | string {
  const input = (body ?? {}) as { template?: Template; report?: Report };
  const { template, report } = input;
  const valid =
    template &&
    report &&
    typeof template.name === "string" &&
    typeof report.title === "string" &&
    Array.isArray(template.sections) &&
    Array.isArray(report.sections) &&
    Array.isArray(report.impression) &&
    report.sections.every((section) => Array.isArray(section?.lines));
  if (!valid) return "This report could not be read.";
  if (JSON.stringify(input).length > MAX_BYTES) return "This report is too large to save.";
  return { template, report };
}

export const REPORT_SORTS = ["updated", "name"];

/**
 * One page of a person's saved reports, searched, filtered and sorted in the
 * database. The impression line and the count of findings are kept in columns
 * of their own (see migration 019), so the reports themselves are not opened.
 */
export async function pageReports(user: CurrentUser, params: ListParams): Promise<Paged<SavedReportSummary>> {
  const like = likePattern(params.q);
  const status = params.filter.status ?? "";
  const rows = await db()`
    select id, template_name, title, created_at, updated_at, finalized_at,
           patient_name, patient_age, patient_age_unit, patient_sex, study, modality,
           impression, findings,
           count(*) over () as total
    from reports
    where user_id = ${user.id}
      and (${params.q} = '' or template_name ilike ${like} or title ilike ${like}
           or patient_name ilike ${like} or study ilike ${like}
           or impression ilike ${like})
      and (${status} = '' or (${status} = 'final') = (finalized_at is not null))
    order by
      case when ${params.sort} = 'name' and ${params.dir} = 'asc' then lower(template_name) end asc,
      case when ${params.sort} = 'name' and ${params.dir} = 'desc' then lower(template_name) end desc,
      case when ${params.sort} = 'updated' and ${params.dir} = 'asc' then updated_at end asc,
      case when ${params.sort} = 'updated' and ${params.dir} = 'desc' then updated_at end desc,
      id
    limit ${params.size} offset ${offsetOf(params)}
  `;
  return {
    total: Number(rows[0]?.total ?? 0),
    rows: rows.map((row) => ({
      id: row.id,
      templateName: row.template_name,
      title: row.title,
      impression: row.impression,
      findings: row.findings,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      finalizedAt: row.finalized_at ? row.finalized_at.toISOString() : null,
      patient: patientFromRow(row),
    })),
  };
}

/** Whether this person has saved any report, for the empty screen. */
export async function hasReports(user: CurrentUser) {
  const [row] = await db()`select exists (select 1 from reports where user_id = ${user.id}) as any`;
  return Boolean(row?.any);
}

export async function findReport(user: CurrentUser, id: string): Promise<SavedReport | null> {
  // The template copy is in the report itself (older reports) or kept once in report_templates.
  const [row] = await db()`
    select r.id, coalesce(r.template, t.body) as template, r.content, r.created_at, r.updated_at, r.finalized_at,
           r.patient_name, r.patient_age, r.patient_age_unit, r.patient_sex, r.study, r.modality
    from reports r left join report_templates t on t.hash = r.template_hash
    where r.id = ${asUuid(id)}::uuid and r.user_id = ${user.id}
  `;
  return row
    ? {
        id: row.id,
        template: row.template,
        report: row.content,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        finalizedAt: row.finalized_at ? row.finalized_at.toISOString() : null,
        patient: patientFromRow(row),
      }
    : null;
}
