"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { ChatCircleSlash, DotsThree, FilePlus } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { buttonClass } from "@/components/app/ui";
import type { DocNode } from "@/lib/reportDoc";
import { MODALITIES } from "@/lib/templateDoc";

const MENU_ITEM =
  "flex h-10 cursor-pointer select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10 data-[disabled]:cursor-default data-[disabled]:text-ink-quiet";
const FIELD =
  "h-11 w-full rounded-full border border-ink/40 bg-surface px-4 text-[0.98rem] font-semibold text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal";

/**
 * The ⋯ menu at the top of the AI Assistant panel: keep the report as it now
 * reads as a template of its own, or clear the conversation beside it.
 */
export function AssistantMenu({
  getDoc,
  suggestedName,
  canClear,
  onClear,
}: {
  /** The report as it now reads. */
  getDoc: () => DocNode | undefined;
  suggestedName: string;
  /** False when there is nothing in the chat to clear. */
  canClear: boolean;
  onClear: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="More actions"
          title="More actions"
          className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.08] data-[popup-open]:bg-ink/[0.1]"
        >
          <DotsThree weight="bold" className="h-5 w-5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="app-layer w-72 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
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
