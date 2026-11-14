"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check } from "@phosphor-icons/react";
import { Select } from "@/components/app/ui";

type Option = { value: string; label: string };

/**
 * Chooses the template for a report. With one template it is a plain
 * dropdown; with several it becomes a box you can type in to find one.
 */
export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (templates.length < 2) {
    return (
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="max-w-[16rem]">
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </Select>
    );
  }

  const items: Option[] = templates.map((template) => ({ value: template.id, label: template.name }));

  return (
    <Combobox.Root
      items={items}
      value={items.find((item) => item.value === value) ?? null}
      onValueChange={(item) => item && onChange(item.value)}
    >
      <Combobox.InputGroup className="relative inline-flex w-[18rem] max-w-full">
        <Combobox.Input
          aria-label="Template"
          placeholder="Search templates"
          onFocus={(event) => event.target.select()}
          className="h-11 w-full rounded-full border border-ink/40 bg-surface pl-4 pr-11 text-[0.95rem] font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal"
        />
        <Combobox.Trigger
          aria-label="Show all templates"
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink hover:bg-ink/10"
        >
          <CaretDown weight="bold" className="h-4 w-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="z-50 outline-none">
          <Combobox.Popup className="app-layer w-[max(var(--anchor-width),18rem)] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)]">
            <Combobox.Empty>
              <p className="px-3 py-3 text-[0.95rem] text-ink-soft">No template with that name.</p>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain outline-none">
              {(item: Option) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex min-h-11 cursor-default select-none items-center gap-2.5 rounded-full px-3 py-2 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center text-teal">
                    <Combobox.ItemIndicator>
                      <Check weight="bold" className="h-4 w-4" />
                    </Combobox.ItemIndicator>
                  </span>
                  {item.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
