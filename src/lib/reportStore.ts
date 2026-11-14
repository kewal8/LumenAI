import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
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
};

export type SavedReport = { id: string; template: Template; report: Report; updatedAt: string };

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

/** A person's own saved reports, newest first. */
export async function listReports(user: CurrentUser): Promise<SavedReportSummary[]> {
  const rows = await db()`
    select id, template_name, title, content, created_at, updated_at
    from reports where user_id = ${user.id}
    order by updated_at desc limit 500
  `;
  return rows.map((row) => {
    const report = row.content as Report;
    return {
      id: row.id,
      templateName: row.template_name,
      title: row.title,
      impression: report.impression[0] ?? "",
      findings: report.sections
        .flatMap((section) => section.lines)
        .filter((line) => line.status !== "normal").length,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  });
}

export async function findReport(user: CurrentUser, id: string): Promise<SavedReport | null> {
  const [row] = await db()`
    select id, template, content, updated_at from reports
    where id::text = ${id} and user_id = ${user.id}
  `;
  return row
    ? { id: row.id, template: row.template, report: row.content, updatedAt: row.updated_at.toISOString() }
    : null;
}
