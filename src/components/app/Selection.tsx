"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { CheckSquare, DotsThree, Trash, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import { BACKDROP, POPUP } from "./TeamClient";
import { buttonClass } from "./ui";

// Choosing several rows of a list to delete them together. The same on every
// list that can delete: a ⋯ menu offers "Select", tick boxes appear beside the
// rows, and a bar shows how many are chosen with Delete and a close cross.
// Rows can be drawn on the server; they only need a <RowTick> each.

type Selection = {
  selecting: boolean;
  selected: Set<string>;
  start: () => void;
  stop: () => void;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("Selection parts must be inside <Selectable>.");
  return selection;
}

/** Holds which rows are ticked for one list. */
export function Selectable({ children }: { children: React.ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const value: Selection = {
    selecting,
    selected,
    start: () => setSelecting(true),
    stop: () => {
      setSelecting(false);
      setSelected(new Set());
    },
    toggle: (id) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setMany: (ids, on) =>
      setSelected((current) => {
        const next = new Set(current);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
  };
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

const MENU_ITEM =
  "flex h-10 cursor-pointer select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10";

/** The ⋯ menu beside a list's search and filters. Hidden while selecting. */
export function ListMenu({ label = "More actions" }: { label?: string }) {
  const { selecting, start } = useSelection();
  if (selecting) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        title={label}
        className="grid h-11 w-11 place-items-center rounded-full border border-ink/30 text-ink transition-colors hover:border-ink/60 hover:bg-ink/[0.05] data-[popup-open]:bg-ink/[0.08]"
      >
        <DotsThree weight="bold" className="h-5 w-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="app-layer w-56 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
            <Menu.Item className={MENU_ITEM} onClick={start}>
              <CheckSquare className="h-5 w-5" />
              Select
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

const TICK = "h-[1.15rem] w-[1.15rem] shrink-0 cursor-pointer rounded accent-[var(--c-teal)]";

/** A row's tick box, shown only while selecting. Leave it out for rows that cannot be deleted. */
export function RowTick({ id, label }: { id: string; label: string }) {
  const { selecting, selected, toggle } = useSelection();
  if (!selecting) return null;
  return (
    <input
      type="checkbox"
      aria-label={`Select ${label}`}
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      className={TICK}
    />
  );
}

/** The tick in the heading row: every row on this page at once. */
export function HeadTick({ ids }: { ids: string[] }) {
  const { selecting, selected, setMany } = useSelection();
  if (!selecting) return null;
  const all = ids.length > 0 && ids.every((id) => selected.has(id));
  return (
    <input
      type="checkbox"
      aria-label="Select every row on this page"
      checked={all}
      disabled={ids.length === 0}
      onChange={() => setMany(ids, !all)}
      className={TICK}
    />
  );
}

/**
 * The bar shown while selecting: how many are chosen, Delete (which asks
 * first) and a cross to stop. `deleteBase` is the API path each id is added to.
 */
export function SelectionBar({
  noun,
  single = noun.replace(/s$/, ""),
  deleteBase,
  warning,
  onDeleted,
}: {
  noun: string;
  single?: string;
  deleteBase: string;
  /** What deleting means, shown in the question. */
  warning: string;
  /** For lists kept in the browser: the ids that are gone. */
  onDeleted?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const { selecting, selected, stop } = useSelection();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!selecting) return null;

  const ids = [...selected];
  const count = `${ids.length} ${ids.length === 1 ? single : noun}`;

  async function remove() {
    setBusy(true);
    setError("");
    const results = await Promise.all(ids.map((id) => send("DELETE", `${deleteBase}${id}`)));
    setBusy(false);
    const failed = results.filter((result) => result.error);
    if (failed.length > 0) {
      setError(`${failed.length} could not be deleted. ${failed[0].error}`);
      const done = ids.length - failed.length;
      if (done > 0) toast.warning(`${done} deleted, ${failed.length} could not be deleted.`);
      else toast.error(`Nothing was deleted. ${failed[0].error}`);
      router.refresh();
      return;
    }
    setOpen(false);
    toast.success(`${count[0].toUpperCase()}${count.slice(1)} deleted`);
    stop();
    onDeleted?.(ids);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-surface">
      <span className="font-semibold">{ids.length === 0 ? `Tick the ${noun} to delete` : `${count} selected`}</span>
      <Dialog.Root open={open} onOpenChange={(next) => !busy && (setOpen(next), setError(""))}>
        <Dialog.Trigger
          disabled={ids.length === 0}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-flag px-4 text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
        >
          <Trash weight="bold" className="h-4 w-4" />
          Delete
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Delete {count}?</Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">{warning}</Dialog.Description>
            <div className="mt-4">
              <FormError message={error} />
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={remove} disabled={busy} className={buttonClass.danger}>
                {busy && <Spinner />}
                {busy ? "Deleting" : `Delete ${count}`}
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <button
        type="button"
        onClick={stop}
        aria-label="Close select mode"
        title="Close"
        className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-surface/15"
      >
        <X weight="bold" className="h-4 w-4" />
      </button>
    </div>
  );
}
