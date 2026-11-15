"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";

type Option = { value: string; label: string };

/**
 * Chooses the template for a report: a button showing the current one, which
 * opens a list with a search box at the top. The search box has the cursor as
 * soon as the list opens, so a template is two or three letters away.
 */
export function TemplatePicker({
  templates,
  value,
  onChange,
  className = "w-[16rem]",
}: {
  templates: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  /** Width of the button. */
  className?: string;
}) {
  const items: Option[] = templates.map((template) => ({ value: template.id, label: template.name }));
  const current = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox.Root items={items} value={current} onValueChange={(item) => item && onChange(item.value)}>
      <Combobox.Trigger
        aria-label={`Template: ${current?.label ?? "none"}. Change template`}
        className={`inline-flex h-11 max-w-full items-center justify-between gap-3 rounded-full border border-ink/40 bg-surface pl-4 pr-3.5 text-[0.95rem] font-semibold text-ink outline-none transition-colors hover:border-ink/60 data-[popup-open]:border-teal ${className}`}
      >
        <span className="truncate">{current?.label ?? "Choose a template"}</span>
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
              <p className="px-5 py-4 text-[0.95rem] text-ink-soft">No template with that name.</p>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(24rem,var(--available-height))] overflow-y-auto overscroll-contain p-2 outline-none">
              {(item: Option) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-3 py-2 text-[0.98rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/[0.08] data-[selected]:text-teal"
                >
                  {item.label}
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
