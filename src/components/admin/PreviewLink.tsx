"use client";

import { Spinner } from "@/components/Spinner";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { Select, buttonClass } from "@/components/app/ui";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";
import { PREVIEW_DAYS } from "@/lib/previewLinks";

/** Makes a link to the editor preview for someone without an account. */
export function PreviewLinkButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(PREVIEW_DAYS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setLabel("");
      setDays(PREVIEW_DAYS[0]);
      setError("");
      setLink("");
      setCopied(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ link: string }>("POST", "/api/admin/preview-links", { label, days });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLink(result.data?.link ?? "");
    router.refresh();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={reset}>
      <Dialog.Trigger className={buttonClass.primary}>
        <Plus weight="bold" className="h-4 w-4" />
        New link
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
            {link ? "Link ready" : "New editor preview link"}
          </Dialog.Title>

          {link ? (
            <div className="mt-2 flex flex-col gap-4">
              <Dialog.Description className="text-ink-soft">
                Send this link to {label}. Anyone who has it can open the preview until you turn it
                off. It is shown only now.
              </Dialog.Description>
              <input
                readOnly
                value={link}
                aria-label="Preview link"
                onFocus={(event) => event.target.select()}
                className="h-11 w-full rounded-full border border-ink/35 bg-canvas px-4 text-[0.9rem] text-ink outline-none"
              />
              <FormError message={error} />
              <div className="flex gap-2">
                <button type="button" onClick={copy} className={buttonClass.primary}>
                  {copied ? <Check weight="bold" className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <Dialog.Close className={buttonClass.secondary}>Done</Dialog.Close>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-2 flex flex-col gap-4" noValidate>
              <Dialog.Description className="text-ink-soft">
                They open the new report editor with a sample report. No account is needed and
                nothing is saved.
              </Dialog.Description>
              <Field
                dense
                id="preview-label"
                label="Who is it for"
                value={label}
                onChange={(value) => (setLabel(value), setError(""))}
                autoComplete="off"
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <FieldLabel id="preview-days" label="Works for" />
                <Select id="preview-days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  {PREVIEW_DAYS.map((option) => (
                    <option key={option} value={option}>
                      {option} days
                    </option>
                  ))}
                </Select>
              </div>
              <FormError message={error} />
              <div className="flex gap-2">
                <button type="submit" disabled={busy || !label.trim()} className={buttonClass.primary}>
                  {busy && <Spinner />}
                  {busy ? "Creating" : "Create link"}
                </button>
                <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
