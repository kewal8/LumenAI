"use client";

import { Clock, FileText, ListChecks } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import type { StoredTemplate } from "@/lib/templateStore";
import { SearchBar, matchesSearch } from "./Search";
import { ConfirmAction } from "./TeamClient";
import {
  Badge,
  Chip,
  EmptyState,
  IconTile,
  Meta,
  PANEL,
  buttonClass,
  formatDate,
  tidyHeading,
} from "./ui";

function searchText(template: StoredTemplate) {
  return [
    template.name,
    template.modality ?? "",
    template.title,
    template.ownerName,
    ...template.sections.map((section) => section.heading),
  ].join(" ");
}

export function TemplateList({ templates }: { templates: StoredTemplate[] }) {
  const [query, setQuery] = useState("");
  const shown = templates.filter((template) => matchesSearch(searchText(template), query));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onChange={setQuery}
        placeholder="Search templates"
        shown={shown.length}
        total={templates.length}
        noun="templates"
      />

      {shown.length === 0 ? (
        <EmptyState
          title={`No template matches “${query}”`}
          body="Try the study type, such as CT or MRI, or part of the name."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((template) => {
            const lines = template.sections.reduce((total, section) => total + section.lines.length, 0);
            const sameTitle = template.title.trim().toLowerCase() === template.name.trim().toLowerCase();
            return (
              <li key={template.id} className={`${PANEL} flex flex-col`}>
                <div className="flex items-start gap-4 p-6 pb-5">
                  <IconTile>
                    <FileText weight="fill" className="h-5 w-5" />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[1.2rem] font-semibold leading-tight tracking-[-0.02em]">
                      {template.name}
                    </h2>
                    {/* Shown only when the printed title differs from the name. */}
                    <p className="mt-1 flex items-center gap-2 text-[0.9rem] text-ink-soft">
                      {template.modality && (
                        <span className="shrink-0 rounded-md bg-teal/[0.12] px-1.5 py-0.5 text-[0.78rem] font-bold uppercase tracking-wide text-teal-deep">
                          {template.modality}
                        </span>
                      )}
                      <span className="truncate">
                        {sameTitle ? "Report template" : `Prints as “${template.title}”`}
                      </span>
                    </p>
                  </div>
                  {template.shared ? (
                    <Badge tone="teal">Shared</Badge>
                  ) : (
                    template.mine && <Badge>Only you</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 px-6 pb-5">
                  {template.sections.map((section, index) => (
                    <Chip key={index}>{tidyHeading(section.heading)}</Chip>
                  ))}
                  <Chip>Impression</Chip>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line px-6 py-4">
                  <Meta icon={<ListChecks weight="bold" />}>
                    {lines} normal {lines === 1 ? "line" : "lines"}
                  </Meta>
                  <Meta icon={<Clock weight="bold" />}>
                    {template.mine ? `Updated ${formatDate(template.updatedAt)}` : `By ${template.ownerName}`}
                  </Meta>
                  <div className="ml-auto flex items-center gap-2">
                    {template.canEdit && (
                      <ConfirmAction
                        label="Delete"
                        title={`Delete ${template.name}?`}
                        body={
                          template.shared
                            ? "It is removed for everyone in your organisation. Reports already written are not affected."
                            : "Reports already written with it are not affected."
                        }
                        confirmLabel="Delete template"
                        path={`/api/templates/${template.id}`}
                      />
                    )}
                    {template.canEdit && (
                      <Link href={`/templates/${template.id}`} className={buttonClass.secondary}>
                        Edit
                      </Link>
                    )}
                    <Link
                      href={`/report?template=${template.id}`}
                      className={buttonClass.primary}
                    >
                      Use
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
