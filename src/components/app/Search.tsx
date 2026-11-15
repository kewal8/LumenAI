"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useRef } from "react";
import { Spinner } from "@/components/Spinner";
import { Tip } from "@/components/Tip";

/** Whether every word typed appears somewhere in `text`. */
export function matchesSearch(text: string, query: string) {
  const haystack = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * The one search box used across the app. The browser's own clear cross is
 * hidden (it sits on the text and looks different in every browser); this
 * one has a round target of its own, with room between it and the words, and
 * shows a spinner there instead while results are loading.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label = placeholder,
  pending = false,
  size = "md",
  onKeyDown,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Read out by screen readers; the placeholder when left out. */
  label?: string;
  /** True while the results for this search are on their way. */
  pending?: boolean;
  size?: "md" | "sm";
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const small = size === "sm";
  return (
    <div className={`relative block w-full ${className}`}>
      <MagnifyingGlass
        weight="bold"
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink ${small ? "left-3.5" : "left-4"}`}
      />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Escape empties the box, as people expect from a search.
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
            return;
          }
          onKeyDown?.(event);
        }}
        aria-label={label}
        placeholder={placeholder}
        className={`w-full rounded-full border border-ink/40 bg-surface font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal ${
          small
            ? "h-10 pl-10 pr-11 text-[0.95rem]"
            : "h-11 pl-11 pr-12 text-[0.95rem]"
        }`}
      />
      <span
        className={`absolute top-1/2 grid -translate-y-1/2 place-items-center ${small ? "right-1" : "right-1.5"}`}
      >
        {pending ? (
          <span className="grid h-8 w-8 place-items-center text-ink-soft">
            <Spinner />
          </span>
        ) : (
          value && (
            <Tip label="Clear search">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  input.current?.focus();
                }}
                aria-label="Clear search"
                className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.08] hover:text-ink"
              >
                <X weight="bold" className="h-3.5 w-3.5" />
              </button>
            </Tip>
          )
        )}
      </span>
    </div>
  );
}
