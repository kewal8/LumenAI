import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { likePattern, offsetOf, type ListParams, type Paged } from "@/lib/listQuery";
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
};

export type SavedReport = {
  id: string;
  template: Template;
  report: Report;
  updatedAt: string;
  finalizedAt: string | null;
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
 * database. The summary is worked out there too, so the reports themselves are
 * not read.
 */
export async function pageReports(user: CurrentUser, params: ListParams): Promise<Paged<SavedReportSummary>> {
  const like = likePattern(params.q);
  const status = params.filter.status ?? "";
  const rows = await db()`
    select id, template_name, title, created_at, updated_at, finalized_at,
           coalesce(content->'impression'->>0, '') as impression,
           (select count(*)::int
              from jsonb_array_elements(content->'sections') as section,
                   jsonb_array_elements(section->'lines') as line
             where line->>'status' <> 'normal') as findings,
           count(*) over () as total
    from reports
    where user_id = ${user.id}
      and (${params.q} = '' or template_name ilike ${like} or title ilike ${like}
           or content->'impression'->>0 ilike ${like})
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
    })),
  };
}

/** Whether this person has saved any report, for the empty screen. */
export async function hasReports(user: CurrentUser) {
  const [row] = await db()`select exists (select 1 from reports where user_id = ${user.id}) as any`;
  return Boolean(row?.any);
}

export async function findReport(user: CurrentUser, id: string): Promise<SavedReport | null> {
  const [row] = await db()`
    select id, template, content, updated_at, finalized_at from reports
    where id::text = ${id} and user_id = ${user.id}
  `;
  return row
    ? {
        id: row.id,
        template: row.template,
        report: row.content,
        updatedAt: row.updated_at.toISOString(),
        finalizedAt: row.finalized_at ? row.finalized_at.toISOString() : null,
      }
    : null;
}
