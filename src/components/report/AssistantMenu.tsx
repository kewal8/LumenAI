"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Switch } from "@base-ui/react/switch";
import { ChatCircleSlash, DotsThree, FilePlus, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { buttonClass } from "@/components/app/ui";
import { Tip } from "@/components/Tip";
import type { DocNode } from "@/lib/reportDoc";
import type { MacroMode } from "@/lib/macros";
import Link from "next/link";
import { MACRO_MARK } from "./macroMark";
import { MODALITIES } from "@/lib/templateDoc";

const MENU_ITEM =
  "flex h-10 cursor-pointer select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10 data-[disabled]:cursor-default data-[disabled]:text-ink-quiet";
const FIELD =
  "h-11 w-full rounded-full border border-ink/40 bg-surface px-4 text-[0.98rem] font-semibold text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal";

/**
 * The ⋯ menu at the top of the AI Assistant panel: the assistant's options,
 * keep the report as it now reads as a template of its own, or clear the
 * conversation beside it.
 */
export function AssistantMenu({
  getDoc,
  suggestedName,
  canClear,
  onClear,
  floatingBox,
  onFloatingBoxChange,
  macroMode,
  onMacroModeChange,
}: {
  /** The report as it now reads. */
  getDoc: () => DocNode | undefined;
  suggestedName: string;
  /** False when there is nothing in the chat to clear. */
  canClear: boolean;
  onClear: () => void;
  floatingBox: boolean;
  onFloatingBoxChange: (next: boolean) => void;
  macroMode: MacroMode;
  onMacroModeChange: (next: MacroMode) => void;
}) {
  const [options, setOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  return (
    <>
      <Menu.Root>
        <Tip label="More actions">
          <Menu.Trigger
            aria-label="More actions"
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.08] data-[popup-open]:bg-ink/[0.1]"
          >
            <DotsThree weight="bold" className="h-5 w-5" />
          </Menu.Trigger>
        </Tip>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="app-layer w-72 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
              <Menu.Item className={MENU_ITEM} onClick={() => setOptions(true)}>
                <SlidersHorizontal className="h-5 w-5" />
                Options
              </Menu.Item>
              <Menu.Item className={MENU_ITEM} onClick={() => setSaving(true)}>
                <FilePlus className="h-5 w-5" />
                Save this report as a template
              </Menu.Item>
              <Menu.Item className={MENU_ITEM} disabled={!canClear} onClick={() => setClearing(true)}>
                <ChatCircleSlash className="h-5 w-5" />
                Clear chat
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <AssistantOptions
        open={options}
        onOpenChange={setOptions}
        floatingBox={floatingBox}
        onFloatingBoxChange={onFloatingBoxChange}
        macroMode={macroMode}
        onMacroModeChange={onMacroModeChange}
      />

      {saving && (
        <SaveAsTemplate getDoc={getDoc} suggestedName={suggestedName} onClose={() => setSaving(false)} />
      )}

      <Dialog.Root open={clearing} onOpenChange={setClearing}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Clear the chat?</Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              The messages here are removed. Your report stays exactly as it is.
            </Dialog.Description>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setClearing(false);
                  toast.success("Chat cleared");
                }}
                className={buttonClass.danger}
              >
                Clear chat
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/**
 * How the AI Assistant behaves for this doctor. Each choice is saved to their
 * account as soon as it changes, the same setting as in Settings.
 */
function AssistantOptions({
  open,
  onOpenChange,
  floatingBox,
  onFloatingBoxChange,
  macroMode,
  onMacroModeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floatingBox: boolean;
  onFloatingBoxChange: (next: boolean) => void;
  macroMode: MacroMode;
  onMacroModeChange: (next: MacroMode) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  async function setMode(next: MacroMode) {
    if (next === macroMode || savingMode) return;
    const previous = macroMode;
    onMacroModeChange(next);
    setSavingMode(true);
    const result = await send("PATCH", "/api/account", { macroMode: next });
    setSavingMode(false);
    if (result.error) {
      onMacroModeChange(previous);
      toast.error(result.error);
      return;
    }
    toast.success(next === "expand" ? "Macros now show as full text" : "Macros now stay as short forms");
  }

  async function setFloating(next: boolean) {
    onFloatingBoxChange(next);
    setBusy(true);
    const result = await send("PATCH", "/api/account", { floatingBox: next });
    setBusy(false);
    if (result.error) {
      onFloatingBoxChange(!next);
      toast.error(result.error);
      return;
    }
    toast.success(next ? "Floating window turned on" : "Floating window turned off");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Assistant options</Dialog.Title>
              <Dialog.Description className="mt-1 text-ink-soft">Changes are saved straight away.</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink"
            >
              <X weight="bold" className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-ink/25 px-4 py-3.5">
              <span>
                <span className="block font-semibold">Floating window</span>
                <span className="mt-0.5 block text-[0.9rem] leading-snug text-ink-soft">
                  Keeps the assistant on top of PACS when you leave.
                </span>
              </span>
              <Switch.Root
                checked={floatingBox}
                disabled={busy}
                onCheckedChange={setFloating}
                className="flex h-7 w-12 shrink-0 items-center rounded-full bg-ink/30 p-0.5 transition-colors data-[checked]:bg-teal data-[disabled]:opacity-60"
              >
                <Switch.Thumb className="h-6 w-6 rounded-full bg-[#fff] shadow transition-transform data-[checked]:translate-x-5" />
              </Switch.Root>
            </label>

            {/* The same choice as Settings → Macros, here so it can change mid-report. */}
            <div className="rounded-2xl border border-ink/25 px-4 py-3.5">
              <div className="flex items-start justify-between gap-4">
                <span id="macro-mode-label" className="font-semibold">
                  When you say a macro
                </span>
                <Link
                  href="/settings?tab=macros"
                  className="shrink-0 text-[0.88rem] font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink"
                >
                  Manage macros
                </Link>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="macro-mode-label"
                className="mt-2.5 grid grid-cols-2 gap-1 rounded-full bg-ink/[0.06] p-1"
              >
                {(
                  [
                    ["expand", "Full text"],
                    ["keep", "Short form"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={macroMode === value}
                    onClick={() => setMode(value)}
                    disabled={savingMode}
                    className={`h-9 rounded-full text-[0.92rem] font-bold transition-colors disabled:cursor-progress ${
                      macroMode === value ? "bg-surface text-ink shadow-[0_1px_3px_rgb(6_17_15/0.18)]" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[0.9rem] leading-snug text-ink-soft">
                {macroMode === "expand" ? (
                  <>
                    Say <span className={MACRO_MARK.short}>CSV</span> and its full text appears in the box.
                  </>
                ) : (
                  <>
                    <span className={MACRO_MARK.short}>CSV</span> stays as said. Point at it to read or use the full text.
                  </>
                )}
              </p>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Asks for a name and study type, then stores the report's current text as a new template. */
function SaveAsTemplate({
  getDoc,
  suggestedName,
  onClose,
}: {
  getDoc: () => DocNode | undefined;
  suggestedName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(suggestedName);
  const [modality, setModality] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const doc = getDoc();
    if (!doc) {
      setError("The report is not ready yet. Try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await send<{ id: string }>("POST", "/api/templates", {
      name: name.trim(),
      modality: modality || null,
      doc,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(`Template ${name.trim()} created`);
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
            Save this report as a template
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-soft">
            The report as it reads now becomes a new template. This report is not changed.
          </Dialog.Description>
          <form onSubmit={save} noValidate className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.92rem] font-semibold">Template name</span>
              <input
                value={name}
                onChange={(event) => (setName(event.target.value), setError(""))}
                maxLength={120}
                autoFocus
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.92rem] font-semibold">Modality</span>
              <select value={modality} onChange={(event) => setModality(event.target.value)} className={`${FIELD} cursor-pointer`}>
                <option value="">Not set</option>
                {MODALITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <FormError message={error} />
            <div className="mt-1 flex gap-2">
              <button type="submit" disabled={busy || !name.trim()} className={buttonClass.primary}>
                {busy && <Spinner />}
                {busy ? "Saving" : "Create template"}
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
