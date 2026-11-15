"use client";

import { PencilSimple, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import type { ListParams } from "@/lib/listQuery";
import { MODALITIES } from "@/lib/templateDoc";
import type { TemplateRow } from "@/lib/templateStore";
import { Tip } from "@/components/Tip";
import { ListFilter, ListSearch, Pager, SortHeading } from "./ListControls";
import {
  HeadTick,
  ListMenu,
  RowTick,
  Selectable,
  SelectionBar,
} from "./Selection";
import { ConfirmAction } from "./TeamClient";
import { EmptyState, LIST_HEAD, PANEL, formatDate, formatDateTime } from "./ui";

// Every row, and the headings above them, share these columns so values line up.
// While selecting, the tick sits inside the first cell, so the columns stay put.
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-4 md:grid-cols-[minmax(0,1fr)_6.5rem_10rem_8.5rem_9.5rem]";
const ICON =
  "grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.08]";
const PATH = "/templates";

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
/** "today", "yesterday", "9 days ago", then a date once it is older than a month. */
function updated(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days < 31 ? ago.format(-days, "day") : formatDate(iso);
}

/** The time of day, in India, such as "3:42 pm". */
function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * One page of templates as a table. Search, filters, sort and paging are in
 * the address and done by the server, so only this page's rows are loaded.
 * Several can be deleted at once in Select mode.
 */
export function TemplateList({
  rows,
  total,
  params,
}: {
  rows: TemplateRow[];
  total: number;
  params: ListParams;
}) {
  const editable = rows
    .filter((template) => template.canEdit)
    .map((template) => template.id);

  return (
    <Selectable>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-80">
            <ListSearch
              path={PATH}
              params={params}
              placeholder="Search by name, modality or printed title"
            />
          </div>
          {/* Always offered, so the page looks the same for everyone. */}
          <ListFilter
            path={PATH}
            params={params}
            name="owner"
            label="Owned by"
            options={[
              { value: "", text: "All templates" },
              { value: "mine", text: "Made by me" },
              { value: "shared", text: "Shared" },
            ]}
          />
          <ListFilter
            path={PATH}
            params={params}
            name="modality"
            label="Modality"
            options={[
              { value: "", text: "All modalities" },
              ...MODALITIES.map((value) => ({ value, text: value })),
            ]}
          />
          {editable.length > 0 && <ListMenu />}
        </div>

        <SelectionBar
          noun="templates"
          deleteBase="/api/templates/"
          warning="Shared ones are removed for everyone in your organisation. Reports already written are not affected."
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No template matches"
            body="Check the spelling, or clear the filters."
          />
        ) : (
          <div className={`${PANEL} overflow-hidden`}>
            <div className={`${COLUMNS} ${LIST_HEAD} !grid`}>
              <span className="flex items-center gap-3">
                <HeadTick ids={editable} />
                <SortHeading path={PATH} params={params} by="name">
                  Template
                </SortHeading>
              </span>
              <span className="hidden md:block">Modality</span>
              <span className="hidden md:block">Owner</span>
              <span className="hidden md:block">
                <SortHeading
                  path={PATH}
                  params={params}
                  by="updated"
                  first="desc"
                >
                  Updated
                </SortHeading>
              </span>
              <span className="sr-only">Actions</span>
            </div>

            <ul>
              {rows.map((template) => (
                <li
                  key={template.id}
                  className={`${COLUMNS} group border-t border-line px-6 py-3 transition-colors first:border-t-0 hover:bg-ink/[0.025] has-[:checked]:bg-teal/[0.06]`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {template.canEdit && (
                      <RowTick id={template.id} label={template.name} />
                    )}
                    <span className="min-w-0">
                      <Link
                        href={
                          template.canEdit
                            ? `/templates/${template.id}`
                            : `/report?template=${template.id}`
                        }
                        className="block truncate font-semibold hover:underline"
                      >
                        {template.name}
                      </Link>
                      {/* Shown only when the printed title says something the name does not. */}
                      {template.title.trim().toLowerCase() !==
                        template.name.trim().toLowerCase() && (
                        <span className="block truncate text-[0.88rem] text-ink-soft">
                          Prints as {template.title}
                        </span>
                      )}
                      <span className="block text-[0.85rem] text-ink-soft md:hidden">
                        {[
                          template.modality,
                          `${updated(template.updatedAt)}, ${timeOf(template.updatedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </span>

                  <span className="hidden md:block">
                    {template.modality ? (
                      <span className="rounded-md bg-teal/[0.12] px-2 py-0.5 text-[0.82rem] font-bold tracking-wide text-teal-deep">
                        {template.modality}
                      </span>
                    ) : (
                      <span className="text-ink-quiet">—</span>
                    )}
                  </span>

                  <span className="hidden min-w-0 text-[0.95rem] md:block">
                    <span className="block truncate">
                      {template.mine ? "You" : template.ownerName}
                    </span>
                    {template.shared && (
                      <span className="block text-[0.82rem] font-semibold text-teal-deep">
                        Shared with team
                      </span>
                    )}
                  </span>

                  <span
                    className="hidden leading-tight md:block"
                    title={formatDateTime(template.updatedAt)}
                  >
                    <span className="block text-[0.95rem] text-ink">
                      {updated(template.updatedAt)}
                    </span>
                    <span className="block text-[0.85rem] tabular-nums text-ink-soft">
                      {timeOf(template.updatedAt)}
                    </span>
                  </span>

                  {/* Use always sits in the same place, whether or not the row can be edited. */}
                  <span className="flex items-center gap-1">
                    <Link
                      href={`/report?template=${template.id}`}
                      className="mr-1 inline-flex h-9 items-center rounded-full border border-ink/30 px-4 text-[0.9rem] font-bold transition-colors hover:border-ink/60 hover:bg-ink/[0.05]"
                    >
                      Use
                    </Link>
                    {template.canEdit && (
                      <>
                        <Tip label="Edit">
                          <Link
                            href={`/templates/${template.id}`}
                            aria-label={`Edit ${template.name}`}
                            className={ICON}
                          >
                            <PencilSimple
                              weight="bold"
                              className="h-[1.1rem] w-[1.1rem]"
                            />
                          </Link>
                        </Tip>
                        <ConfirmAction
                          label={`Delete ${template.name}`}
                          icon={
                            <Trash
                              weight="bold"
                              className="h-[1.1rem] w-[1.1rem]"
                            />
                          }
                          triggerClassName={`${ICON} hover:!bg-flag/10 hover:text-flag`}
                          title={`Delete ${template.name}?`}
                          body={
                            template.shared
                              ? "It is removed for everyone in your organisation. Reports already written are not affected."
                              : "Reports already written with it are not affected."
                          }
                          confirmLabel="Delete template"
                          doneMessage={`${template.name} deleted`}
                          path={`/api/templates/${template.id}`}
                        />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <Pager path={PATH} params={params} total={total} noun="templates" />
          </div>
        )}
      </div>
    </Selectable>
  );
}
