"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import type { StoredTemplate } from "@/lib/templateStore";
import { Badge, EmptyState, PANEL, buttonClass } from "./ui";

/** Whether every word typed appears somewhere in the template. */
function matches(template: StoredTemplate, query: string) {
  const haystack = [
    template.name,
    template.title,
    template.ownerName,
    ...template.sections.map((section) => section.heading),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function TemplateList({ templates }: { templates: StoredTemplate[] }) {
  const [query, setQuery] = useState("");
  const shown = templates.filter((template) => matches(template, query));

  return (
    <div className="flex flex-col gap-5">
      {/* Search only earns its place once there is more than one to choose from. */}
      {templates.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Search templates</span>
            <MagnifyingGlass
              weight="bold"
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates"
              className="h-11 w-full rounded-full border border-ink/40 bg-surface pl-11 pr-4 text-[0.95rem] font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal"
            />
          </label>
          <p role="status" className="text-[0.92rem] font-semibold text-ink-soft">
            {query ? `${shown.length} of ${templates.length}` : `${templates.length} templates`}
          </p>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={`No template matches “${query}”`}
          body="Try the study type, such as CT or MRI, or part of the name."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((template) => {
            const lines = template.sections.reduce((total, section) => total + section.lines.length, 0);
            return (
              <li key={template.id} className={`${PANEL} flex flex-col gap-4 p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[1.15rem] font-semibold tracking-[-0.02em]">
                      {template.name}
                    </h2>
                    <p className="truncate text-[0.9rem] text-ink-soft">{template.title}</p>
                  </div>
                  {template.shared && <Badge tone="teal">Shared</Badge>}
                </div>
                <p className="text-[0.9rem] text-ink-soft">
                  {template.sections.map((section) => section.heading).join(", ")}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-[0.85rem] text-ink-quiet">
                    {lines} {lines === 1 ? "line" : "lines"}
                    {!template.mine && `, by ${template.ownerName}`}
                  </p>
                  {template.canEdit && (
                    <Link href={`/templates/${template.id}`} className={buttonClass.secondary}>
                      Edit
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
