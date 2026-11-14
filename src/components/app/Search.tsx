"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { EmptyState } from "./ui";

/** Whether every word typed appears somewhere in `text`. */
export function matchesSearch(text: string, query: string) {
  const haystack = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** The search box used above every list in the app, with a running count. */
export function SearchBar({
  query,
  onChange,
  placeholder,
  shown,
  total,
  noun,
  single = noun.replace(/s$/, ""),
}: {
  query: string;
  onChange: (query: string) => void;
  placeholder: string;
  shown: number;
  total: number;
  /** Plural name of what is listed, such as "templates". */
  noun: string;
  /** Singular form, when it is not the plural without its "s". */
  single?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative block w-full max-w-md">
        <span className="sr-only">{placeholder}</span>
        <MagnifyingGlass
          weight="bold"
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-ink/40 bg-surface pl-11 pr-4 text-[0.95rem] font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal"
        />
      </label>
      <p role="status" className="text-[0.92rem] font-semibold text-ink-soft">
        {query ? `${shown} of ${total}` : `${total} ${total === 1 ? single : noun}`}
      </p>
    </div>
  );
}

/**
 * A searchable list whose rows are rendered elsewhere (on the server).
 * Each item brings the text it should be found by.
 */
export function FilterList({
  items,
  placeholder,
  noun,
  single,
  listClassName,
}: {
  items: { key: string; text: string; node: React.ReactNode }[];
  placeholder: string;
  noun: string;
  single?: string;
  listClassName: string;
}) {
  const [query, setQuery] = useState("");
  const shown = items.filter((item) => matchesSearch(item.text, query));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onChange={setQuery}
        placeholder={placeholder}
        shown={shown.length}
        total={items.length}
        noun={noun}
        single={single}
      />
      {shown.length === 0 ? (
        <EmptyState title={`Nothing matches “${query}”`} body="Check the spelling or try fewer words." />
      ) : (
        <ul className={listClassName}>{shown.map((item) => item.node)}</ul>
      )}
    </div>
  );
}
