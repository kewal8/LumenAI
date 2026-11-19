"use client";

import { Trash } from "@phosphor-icons/react";
import { ListSearch, Pager, SortHeading } from "@/components/app/ListControls";
import { HeadTick, ListMenu, RowTick, Selectable, SelectionBar } from "@/components/app/Selection";
import { ConfirmAction } from "@/components/app/TeamClient";
import { Avatar, EmptyState, LIST_HEAD, PANEL, formatDateTime } from "@/components/app/ui";
import type { FeedbackRow } from "@/lib/feedback";
import type { ListParams } from "@/lib/listQuery";

const PATH = "/admin/feedback";
// Rows and the headings above them share these columns so values line up.
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-x-6 lg:grid-cols-[minmax(0,1fr)_15rem_11rem_2.5rem]";

/**
 * One page of feedback for LumenAI staff, newest first. Search, sort and
 * paging are in the address and done by the server.
 */
export function FeedbackList({ rows, total, params }: { rows: FeedbackRow[]; total: number; params: ListParams }) {
  return (
    <Selectable>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-80">
            <ListSearch path={PATH} params={params} placeholder="Search by message, sender or account" />
          </div>
          {rows.length > 0 && <ListMenu />}
        </div>

        <SelectionBar
          noun="messages"
          deleteBase="/api/admin/feedback/"
          warning="Deleted feedback cannot be brought back."
        />

        {rows.length === 0 ? (
          <EmptyState title="Nothing matches" body="Check the spelling, or clear the search." />
        ) : (
          <div className={`${PANEL} overflow-hidden`}>
            <div className={`${COLUMNS} ${LIST_HEAD} lg:!grid`}>
              <span className="flex items-center gap-3">
                <HeadTick ids={rows.map((row) => row.id)} />
                Message
              </span>
              <span>Sender and account</span>
              <span>
                <SortHeading path={PATH} params={params} by="created" first="desc">
                  Sent
                </SortHeading>
              </span>
              <span className="sr-only">Actions</span>
            </div>

            <ul>
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`${COLUMNS} border-t border-line px-6 py-5 first:border-t-0 has-[:checked]:bg-teal/[0.06]`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="empty:hidden pt-0.5">
                      <RowTick id={row.id} label={`feedback from ${row.senderName}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[75ch] whitespace-pre-line break-words text-[0.98rem]">{row.message}</p>
                      {/* On smaller screens the other columns fold in under the message. */}
                      <p className="mt-2 text-[0.88rem] text-ink-soft lg:hidden">
                        {row.senderName} · {row.orgName ?? "No account"} · {formatDateTime(row.createdAt)}
                        {row.page && ` · ${row.page}`}
                      </p>
                    </div>
                  </div>
                  <div className="hidden min-w-0 items-start gap-3 lg:flex">
                    <Avatar name={row.senderName} />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate font-semibold">{row.senderName}</p>
                      <a
                        href={`mailto:${row.senderEmail}`}
                        className="block truncate text-[0.88rem] text-ink-soft hover:underline"
                      >
                        {row.senderEmail}
                      </a>
                      <p className="mt-1 truncate text-[0.88rem] text-ink-soft">{row.orgName ?? "No account"}</p>
                    </div>
                  </div>
                  <div className="hidden leading-tight lg:block">
                    <p className="text-[0.95rem]">{formatDateTime(row.createdAt)}</p>
                    {row.page && <p className="mt-1 truncate text-[0.85rem] text-ink-soft">From {row.page}</p>}
                  </div>
                  <ConfirmAction
                    label={`Delete feedback from ${row.senderName}`}
                    icon={<Trash weight="bold" className="h-[1.1rem] w-[1.1rem]" />}
                    triggerClassName="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-flag/10 hover:text-flag"
                    title="Delete this feedback?"
                    body={`From ${row.senderName}, sent ${formatDateTime(row.createdAt)}. This cannot be undone.`}
                    confirmLabel="Delete feedback"
                    doneMessage="Feedback deleted"
                    path={`/api/admin/feedback/${row.id}`}
                  />
                </li>
              ))}
            </ul>
            <Pager path={PATH} params={params} total={total} noun="messages" />
          </div>
        )}
      </div>
    </Selectable>
  );
}
