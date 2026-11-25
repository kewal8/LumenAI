"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FileDashed, FileText, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { BLANK_TEMPLATE_ID } from "@/lib/templates";

type Option = { id: string; name: string; modality: string | null };

/**
 * The first step of every new report: start blank, or pick one of the
 * doctor's templates. The list comes from the server, the first few on
 * opening and then those matching what is typed, so a long list is never
 * loaded in one go.
 */
export function TemplateChooser({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A template id, or the blank report's id. */
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  // The row the arrow keys are on: 0 is the blank report, then the templates.
  const [active, setActive] = useState(0);
  const latest = useRef("");

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    latest.current = q;
    // Typing waits a moment before asking, so each letter is not a request.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/templates/options?${new URLSearchParams({ q })}`);
        const body = await response.json();
        if (latest.current === q) setItems(body.options ?? []);
      } catch {
        if (latest.current === q) setItems([]);
      } finally {
        if (latest.current === q) setLoading(false);
      }
    }, q ? 200 : 0);
    return () => clearTimeout(timer);
  }, [open, query]);

  const rows = [{ id: BLANK_TEMPLATE_ID, name: "Blank report", modality: null as string | null }, ...items];

  // Closing clears the search, so each opening starts from the top.
  function setOpen(next: boolean) {
    if (!next) {
      setQuery("");
      setActive(0);
    }
    onOpenChange(next);
  }

  function choose(id: string) {
    setOpen(false);
    onPick(id);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#06110f]/50" />
        <Dialog.Popup className="app-layer sheet fixed left-1/2 top-[12vh] z-50 flex max-h-[76vh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-ink/20 bg-surface shadow-[0_24px_70px_-20px_rgb(6_17_15/0.55)] outline-none">
          <div className="flex items-start gap-3 px-6 pt-6 sm:px-7">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[1.35rem] font-semibold tracking-[-0.02em]">Start a new report</Dialog.Title>
              <Dialog.Description className="mt-1 text-ink-soft">
                Start from scratch, or from one of your templates.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink"
            >
              <X weight="bold" className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <label className="mx-6 mt-5 flex h-12 shrink-0 items-center gap-2.5 rounded-full border border-ink/40 px-4 focus-within:border-teal sm:mx-7">
            <MagnifyingGlass weight="bold" className="h-5 w-5 shrink-0 text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((current) => Math.min(current + 1, rows.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(rows[active]?.id ?? BLANK_TEMPLATE_ID);
                }
              }}
              placeholder="Search templates by name or modality"
              aria-label="Search templates"
              className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-ink-quiet"
            />
            {loading && <Spinner />}
          </label>

          <ul role="listbox" aria-label="Templates" className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4">
            {rows.map((row, index) => {
              const blank = row.id === BLANK_TEMPLATE_ID;
              return (
                <li key={row.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onClick={() => choose(row.id)}
                    onMouseEnter={() => setActive(index)}
                    className={`flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors ${
                      index === active ? "bg-ink/[0.06]" : ""
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        blank ? "bg-amber-tint text-amber-deep" : "bg-teal/[0.12] text-teal-deep"
                      }`}
                    >
                      {blank ? <FileDashed weight="bold" className="h-5 w-5" /> : <FileText weight="fill" className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{row.name}</span>
                      <span className="block truncate text-[0.88rem] text-ink-soft">
                        {blank ? "Start from scratch: dictate only your findings" : (row.modality ?? "Template")}
                      </span>
                    </span>
                  </button>
                  {/* The blank report stands apart from the templates. */}
                  {blank && <div aria-hidden="true" className="mx-3 my-1.5 h-px bg-line" />}
                </li>
              );
            })}
            {!loading && items.length === 0 && (
              <li className="px-3 py-4 text-[0.95rem] text-ink-soft">
                {query.trim() ? `No template matches “${query.trim()}”.` : "No templates yet. Start from scratch, or make one in Templates."}
              </li>
            )}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
