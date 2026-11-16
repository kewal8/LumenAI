"use client";

import { DownloadSimple, SealCheck, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Tip } from "@/components/Tip";
import { toast } from "@/components/Toast";
import type { ListParams } from "@/lib/listQuery";
import type { SavedReportSummary } from "@/lib/reportStore";
import { ageSex } from "@/lib/patient";
import { ListFilter, ListSearch, Pager, SortHeading } from "./ListControls";
import {
  HeadTick,
  ListMenu,
  RowTick,
  Selectable,
  SelectionBar,
} from "./Selection";
import { ConfirmAction } from "./TeamClient";
import { Badge, EmptyState, LIST_HEAD, PANEL, formatDate } from "./ui";

const PATH = "/reports";
// Every row, and the headings above them, share these columns so values line up.
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_11rem] items-center gap-x-4 md:grid-cols-[minmax(0,1fr)_6.5rem_7rem_9rem_11rem]";
const ICON =
  "grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.08]";

/**
 * Saves the report as a PDF: its print page, letterhead included, opens in the
 * browser's print window with "Save as PDF", named after the patient.
 */
function DownloadButton({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    const html = await fetch(`/api/reports/${id}/print`)
      .then((response) => (response.ok ? response.text() : null))
      .catch(() => null);
    if (!html) {
      setBusy(false);
      toast.error("The report could not be prepared. Try again.");
      return;
    }
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.srcdoc = html;
    frame.onload = () => {
      setBusy(false);
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.append(frame);
  }

  return (
    <Tip label="Download PDF">
      <button type="button" onClick={download} disabled={busy} aria-label={`Download ${label} as PDF`} className={ICON}>
        {busy ? <Spinner /> : <DownloadSimple weight="bold" className="h-[1.1rem] w-[1.1rem]" />}
      </button>
    </Tip>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

/**
 * One page of saved reports as a table. Search, filter, sort and paging are in
 * the address and done by the server, so only this page's rows are loaded.
 */
export function ReportList({
  rows,
  total,
  params,
}: {
  rows: SavedReportSummary[];
  total: number;
  params: ListParams;
}) {
  return (
    <Selectable>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-80">
            <ListSearch
              path={PATH}
              params={params}
              placeholder="Search by patient, study or a word from the impression"
            />
          </div>
          <ListFilter
            path={PATH}
            params={params}
            name="status"
            label="Status"
            options={[
              { value: "", text: "All reports" },
              { value: "draft", text: "Drafts" },
              { value: "final", text: "Final" },
            ]}
          />
          {rows.length > 0 && <ListMenu />}
        </div>

        <SelectionBar
          noun="reports"
          deleteBase="/api/reports/"
          warning="Deleted reports cannot be brought back."
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No report matches"
            body="Check the spelling, or clear the filter."
          />
        ) : (
          <div className={`${PANEL} overflow-hidden`}>
            <div className={`${COLUMNS} ${LIST_HEAD} !grid`}>
              <span className="flex items-center gap-3">
                <HeadTick ids={rows.map((report) => report.id)} />
                <SortHeading path={PATH} params={params} by="name">
                  Patient and study
                </SortHeading>
              </span>
              <span className="hidden md:block">Status</span>
              <span className="hidden md:block">Findings</span>
              <span className="hidden md:block">
                <SortHeading
                  path={PATH}
                  params={params}
                  by="updated"
                  first="desc"
                >
                  Saved
                </SortHeading>
              </span>
              <span className="sr-only">Actions</span>
            </div>

            <ul>
              {rows.map((report) => {
                const when = report.finalizedAt ?? report.updatedAt;
                return (
                  <li
                    key={report.id}
                    className={`${COLUMNS} border-t border-line px-6 py-3 transition-colors first:border-t-0 hover:bg-ink/[0.025] has-[:checked]:bg-teal/[0.06]`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <RowTick id={report.id} label={report.templateName} />
                      <span className="min-w-0">
                        <Link
                          href={`/reports/${report.id}`}
                          className="block truncate font-semibold hover:underline"
                        >
                          {report.patient ? report.patient.name : report.templateName}
                          {report.patient && ageSex(report.patient) && (
                            <span className="ml-2 font-medium text-ink-soft">{ageSex(report.patient)}</span>
                          )}
                        </Link>
                        <span className="block truncate text-[0.88rem] text-ink-soft">
                          {/* Older reports, saved before details were asked for, show the template only. */}
                          {report.patient
                            ? [report.patient.study || report.templateName, report.patient.modality, report.impression]
                                .filter(Boolean)
                                .join(" · ")
                            : report.impression}
                        </span>
                        <span className="block text-[0.85rem] text-ink-soft md:hidden">
                          {report.finalizedAt ? "Final" : "Draft"} ·{" "}
                          {formatDate(when)}, {time(when)}
                        </span>
                      </span>
                    </span>
                    <span className="hidden md:block">
                      {report.finalizedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-0.5 text-[0.82rem] font-bold text-white">
                          <SealCheck weight="fill" className="h-4 w-4" />
                          Final
                        </span>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                    </span>
                    <span className="hidden md:block">
                      {report.findings > 0 ? (
                        <Badge tone="amber">
                          {report.findings}{" "}
                          {report.findings === 1 ? "finding" : "findings"}
                        </Badge>
                      ) : (
                        <Badge tone="teal">Normal</Badge>
                      )}
                    </span>
                    <span className="hidden leading-tight md:block">
                      <span className="block text-[0.95rem]">
                        {formatDate(when)}
                      </span>
                      <span className="block text-[0.85rem] tabular-nums text-ink-soft">
                        {time(when)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Link
                        href={`/reports/${report.id}`}
                        className="mr-1 inline-flex h-9 items-center rounded-full border border-ink/30 px-4 text-[0.9rem] font-bold transition-colors hover:border-ink/60 hover:bg-ink/[0.05]"
                      >
                        Open
                      </Link>
                      <DownloadButton id={report.id} label={report.patient?.name ?? report.templateName} />
                      {/* Kept apart from Open and Download, so it is not pressed by mistake. */}
                      <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-ink/15" />
                      <ConfirmAction
                        label={`Delete report ${report.templateName}`}
                        icon={
                          <Trash
                            weight="bold"
                            className="h-[1.1rem] w-[1.1rem]"
                          />
                        }
                        triggerClassName={`${ICON} hover:!bg-flag/10 hover:text-flag`}
                        title="Delete this report?"
                        body={`${report.templateName}, saved ${formatDate(report.updatedAt)} at ${time(report.updatedAt)}. This cannot be undone.`}
                        confirmLabel="Delete report"
                        doneMessage="Report deleted"
                        path={`/api/reports/${report.id}`}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            <Pager path={PATH} params={params} total={total} noun="reports" />
          </div>
        )}
      </div>
    </Selectable>
  );
}
