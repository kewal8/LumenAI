"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";

type Option = { value: string; label: string; modality: string | null };

/**
 * Chooses the template for a report: a button showing the current one, which
 * opens a list with a search box at the top. The list is asked of the server:
 * the first few on opening, then those matching what is typed, so a long list
 * of templates is never loaded in one go.
 */
export function TemplatePicker({
  current,
  onPick,
  className = "w-[16rem]",
}: {
  current: { id: string; name: string };
  onPick: (id: string) => void;
  /** Width of the button. */
  className?: string;
}) {
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef("");

  async function load(q: string) {
    latest.current = q;
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/options?${new URLSearchParams({ q })}`);
      const body = await response.json();
      // Only the answer to the newest search is shown.
      if (latest.current !== q) return;
      setItems(
        (body.options ?? []).map((option: { id: string; name: string; modality: string | null }) => ({
          value: option.id,
          label: option.name,
          modality: option.modality,
        })),
      );
    } catch {
      if (latest.current === q) setItems([]);
    } finally {
      if (latest.current === q) setLoading(false);
    }
  }

  const value: Option = { value: current.id, label: current.name, modality: null };
  const [open, setOpen] = useState(false);
  // A pick can arrive twice (the click and the list's own choice); only the first
  // in each opening of the list counts.
  const picked = useRef(false);
  function pick(id: string) {
    if (picked.current) return;
    picked.current = true;
    setOpen(false);
    onPick(id);
  }

  return (
    <Combobox.Root
      items={items}
      value={value}
      // The server has already matched the search; the list shows its answer as it is.
      filter={null}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          picked.current = false;
          load("");
        }
      }}
      onInputValueChange={(q) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => load(q.trim()), 250);
      }}
      onValueChange={(item) => item && pick(item.value)}
    >
      <Combobox.Trigger
        aria-label={`Template: ${current.name}. Change template`}
        className={`inline-flex h-11 max-w-full items-center justify-between gap-3 rounded-full border border-ink/40 bg-surface pl-4 pr-3.5 text-[0.95rem] font-semibold text-ink outline-none transition-colors hover:border-ink/60 data-[popup-open]:border-teal ${className}`}
      >
        <span className="truncate">{current.name}</span>
        <CaretDown weight="bold" className="h-4 w-4 shrink-0" />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="z-50 outline-none">
          <Combobox.Popup className="app-layer w-[max(var(--anchor-width),24rem)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-hidden rounded-3xl border border-ink/20 bg-surface shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)]">
            <label className="flex items-center gap-3 border-b border-line px-5">
              <MagnifyingGlass weight="bold" aria-hidden="true" className="h-4 w-4 shrink-0 text-ink" />
              <Combobox.Input
                aria-label="Search templates"
                placeholder="Search templates"
                // The app-wide focus ring would draw a box inside the dropdown.
                // The blinking caret already shows where typing goes.
                style={{ outline: "none" }}
                className="h-13 w-full bg-transparent text-[1rem] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-quiet"
              />
            </label>
            <Combobox.Empty>
              <p className="flex items-center gap-2 px-5 py-4 text-[0.95rem] text-ink-soft">
                {loading ? (
                  <>
                    <Spinner />
                    Looking for templates
                  </>
                ) : (
                  "No template with that name."
                )}
              </p>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(24rem,var(--available-height))] overflow-y-auto overscroll-contain p-2 outline-none">
              {(item: Option) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  // The list is replaced as the search changes; a click picks the row it was on.
                  onClick={() => pick(item.value)}
                  className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-3 py-2 text-[0.98rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/[0.08] data-[selected]:text-teal"
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  {item.modality && (
                    <span className="ml-auto shrink-0 rounded-md bg-teal/[0.12] px-1.5 py-0.5 text-[0.75rem] font-bold text-teal-deep">
                      {item.modality}
                    </span>
                  )}
                  <Combobox.ItemIndicator className="shrink-0">
                    <Check weight="bold" className="h-4 w-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
