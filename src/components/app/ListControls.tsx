"use client";

import {
  ArrowDown,
  ArrowUp,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PAGE_SIZES, listHref, type ListParams } from "@/lib/listQuery";
import { Spinner } from "@/components/Spinner";
import { SearchField } from "./Search";
import { Select } from "./ui";

/** Moves the list to new settings without scrolling, showing that it is loading. */
function useListNavigation(path: string, params: ListParams) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (change: Partial<Record<string, string | number>>) =>
    startTransition(() =>
      router.replace(listHref(path, params, change), { scroll: false }),
    );
  return { go, pending };
}

/**
 * Search for a server-paged list. Typing waits a moment before asking the
 * server, so a search is one request, not one per letter.
 */
export function ListSearch({
  path,
  params,
  placeholder,
}: {
  path: string;
  params: ListParams;
  placeholder: string;
}) {
  const { go, pending } = useListNavigation(path, params);
  const [value, setValue] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div>
      <SearchField
        value={value}
        onChange={(next) => {
          setValue(next);
          clearTimeout(timer.current);
          // Clearing is shown at once; typing waits a moment.
          timer.current = setTimeout(
            () => go({ q: next.trim() }),
            next ? 300 : 0,
          );
        }}
        placeholder={placeholder}
        pending={pending}
        className="max-w-md"
      />
    </div>
  );
}

/** A dropdown filter that is part of the address, such as owner or modality. */
export function ListFilter({
  path,
  params,
  name,
  label,
  options,
}: {
  path: string;
  params: ListParams;
  name: string;
  label: string;
  /** Value and text; the first is usually "all", with an empty value. */
  options: { value: string; text: string }[];
}) {
  const { go } = useListNavigation(path, params);
  const current = params.filter[name] ?? "";
  return (
    <>
      <span className="max-md:hidden">
        <Select aria-label={label} value={current} onChange={(event) => go({ [name]: event.target.value })}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.text}
            </option>
          ))}
        </Select>
      </span>
      {/* A phone: one row of chips, one tap each, instead of a drop-down. */}
      <span role="group" aria-label={label} className="flex min-w-[60%] flex-1 gap-2 overflow-x-auto [scrollbar-width:none] md:hidden">
        {options.map((option) => {
          const on = option.value === current;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => !on && go({ [name]: option.value })}
              className={`h-9 shrink-0 rounded-full px-4 text-[0.92rem] font-semibold transition-colors active:scale-[0.97] ${
                on ? "bg-ink text-canvas" : "bg-ink/[0.06] text-ink"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </span>
    </>
  );
}

/** A column heading that sorts the list; pressed again, it reverses the order. */
export function SortHeading({
  path,
  params,
  by,
  first = "asc",
  children,
}: {
  path: string;
  params: ListParams;
  by: string;
  /** The order used the first time this column is chosen. */
  first?: "asc" | "desc";
  children: React.ReactNode;
}) {
  const active = params.sort === by;
  const dir = active ? (params.dir === "asc" ? "desc" : "asc") : first;
  return (
    <Link
      href={listHref(path, params, { sort: by, dir })}
      scroll={false}
      replace
      className={`inline-flex items-center gap-1 uppercase tracking-[0.04em] hover:text-ink ${active ? "text-ink" : ""}`}
    >
      {children}
      {active &&
        (params.dir === "asc" ? (
          <ArrowUp weight="bold" className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown weight="bold" className="h-3.5 w-3.5" />
        ))}
    </Link>
  );
}

const PAGE_BUTTON =
  "grid h-9 w-9 place-items-center rounded-full border border-ink/25 text-ink transition-colors hover:bg-ink/[0.08]";

/**
 * The list's footer: how many there are and which are shown, and for longer
 * lists rows per page and the previous and next pages. Only the page shown is
 * loaded.
 */
export function Pager({
  path,
  params,
  total,
  noun,
  single = noun.replace(/s$/, ""),
}: {
  path: string;
  params: ListParams;
  total: number;
  /** Plural name of what is listed, such as "templates". */
  noun: string;
  single?: string;
}) {
  const { go, pending } = useListNavigation(path, params);
  if (total <= PAGE_SIZES[0]) {
    return (
      <footer
        role="status"
        className="border-t border-line px-6 py-3 text-right text-[0.92rem] font-semibold text-ink-soft"
      >
        {total} {total === 1 ? single : noun}
      </footer>
    );
  }
  const pages = Math.max(1, Math.ceil(total / params.size));
  const page = Math.min(params.page, pages);
  const from = (page - 1) * params.size + 1;
  const to = Math.min(total, page * params.size);

  return (
    <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-3">
      {pending && <Spinner />}
      <label className="flex items-center gap-2 text-[0.9rem] font-semibold text-ink-soft">
        Rows per page
        <Select
          value={params.size}
          onChange={(event) => go({ size: event.target.value })}
          className="!h-9"
        >
          {PAGE_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>
      <span role="status" className="text-[0.92rem] font-semibold tabular-nums">
        {from}–{to} of {total} {noun}
      </span>
      <span className="flex gap-1">
        {page > 1 ? (
          <Link
            href={listHref(path, params, { page: page - 1 })}
            scroll={false}
            replace
            aria-label="Previous page"
            className={PAGE_BUTTON}
          >
            <CaretLeft weight="bold" className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${PAGE_BUTTON} opacity-35`}>
            <CaretLeft weight="bold" className="h-4 w-4" />
          </span>
        )}
        {page < pages ? (
          <Link
            href={listHref(path, params, { page: page + 1 })}
            scroll={false}
            replace
            aria-label="Next page"
            className={PAGE_BUTTON}
          >
            <CaretRight weight="bold" className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${PAGE_BUTTON} opacity-35`}>
            <CaretRight weight="bold" className="h-4 w-4" />
          </span>
        )}
      </span>
    </footer>
  );
}
