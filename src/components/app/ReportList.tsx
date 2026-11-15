"use client";

import { CalendarBlank, FileText, SealCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import type { SavedReportSummary } from "@/lib/reportStore";
import { SearchBar, matchesSearch } from "./Search";
import { ConfirmAction } from "./TeamClient";
import { Badge, EmptyState, IconTile, Meta, PANEL, buttonClass, formatDateTime } from "./ui";

export function ReportList({ reports }: { reports: SavedReportSummary[] }) {
  const [query, setQuery] = useState("");
  const shown = reports.filter((report) =>
    matchesSearch(
      `${report.templateName} ${report.title} ${report.impression} ${formatDateTime(report.updatedAt)}`,
      query,
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onChange={setQuery}
        placeholder="Search by study, finding or date"
        shown={shown.length}
        total={reports.length}
        noun="reports"
      />

      {shown.length === 0 ? (
        <EmptyState
          title={`No report matches “${query}”`}
          body="Try the study type, a word from the impression, or a date such as 14 Nov."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((report) => (
            <li key={report.id} className={`${PANEL} flex flex-wrap items-center gap-x-5 gap-y-4 p-5`}>
              <IconTile tone={report.findings > 0 ? "amber" : "teal"}>
                <FileText weight="fill" className="h-5 w-5" />
              </IconTile>
              <div className="min-w-0 flex-1 basis-72">
                <p className="flex flex-wrap items-center gap-2.5">
                  <span className="truncate text-[1.1rem] font-semibold tracking-[-0.01em]">
                    {report.templateName}
                  </span>
                  {/* Final reports carry a seal; drafts say so plainly. */}
                  {report.finalizedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-0.5 text-[0.85rem] font-bold text-white">
                      <SealCheck weight="fill" className="h-4 w-4" />
                      Final
                    </span>
                  ) : (
                    <Badge>Draft</Badge>
                  )}
                  {report.findings > 0 ? (
                    <Badge tone="amber">
                      {report.findings} {report.findings === 1 ? "finding" : "findings"}
                    </Badge>
                  ) : (
                    <Badge tone="teal">Normal</Badge>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[0.98rem] text-ink-soft">{report.impression}</p>
                <p className="mt-2">
                  <Meta icon={<CalendarBlank weight="bold" />}>
                    {report.finalizedAt
                      ? `Finalized ${formatDateTime(report.finalizedAt)}`
                      : `Saved ${formatDateTime(report.updatedAt)}`}
                  </Meta>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ConfirmAction
                  label="Delete"
                  title="Delete this report?"
                  body={`${report.templateName}, saved ${formatDateTime(report.updatedAt)}. This cannot be undone.`}
                  confirmLabel="Delete report"
                  path={`/api/reports/${report.id}`}
                />
                <Link href={`/reports/${report.id}`} className={buttonClass.primary}>
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
