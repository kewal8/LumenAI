"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChatCircleText } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Tip } from "@/components/Tip";
import { toast } from "@/components/Toast";
import { BACKDROP, POPUP, buttonClass } from "@/components/app/ui";
import { FormError, RequiredMark, send } from "@/components/auth/fields";
import { FEEDBACK_MAX } from "@/lib/feedback";

/**
 * "Send feedback": a button that opens a short form. The message goes to
 * Radmatic staff, who read it in the admin panel, with who sent it and from
 * which screen.
 */
export function SendFeedback({
  className,
  children,
  tip = "bottom",
}: {
  className: string;
  /** What the button shows. Left out, it is the speech-bubble icon alone. */
  children?: React.ReactNode;
  /** Where the "Send feedback" hint appears on pointing; false when the button already says it. */
  tip?: "bottom" | "right" | false;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      setError("Write a message first.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await send("POST", "/api/feedback", { message: text, page: window.location.pathname });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(`Feedback was not sent. ${result.error}`);
      return;
    }
    setOpen(false);
    setMessage("");
    toast.success("Feedback sent. Thank you.");
  }

  const trigger = (
    <button type="button" onClick={() => setOpen(true)} aria-label="Send feedback" className={className}>
      {children ?? <ChatCircleText weight="bold" className="h-5 w-5" />}
    </button>
  );

  return (
    <>
      {tip ? (
        <Tip label="Send feedback" side={tip}>
          {trigger}
        </Tip>
      ) : (
        trigger
      )}
      {/* What was typed is kept if the form is closed by mistake; it clears once sent. */}
      <Dialog.Root open={open} onOpenChange={(next) => !busy && (setOpen(next), setError(""))}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={`${POPUP} !w-[min(34rem,calc(100vw-2rem))]`}>
            <form onSubmit={submit} noValidate>
              <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Send feedback</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-ink-soft">
                Tell us what works, what does not, or what is missing. The Radmatic team reads every message.
              </Dialog.Description>

              <label className="mt-5 flex flex-col gap-1.5">
                <span className="text-[0.88rem] font-semibold text-ink-soft">
                  Message
                  <RequiredMark />
                </span>
                <textarea
                  value={message}
                  onChange={(event) => (setMessage(event.target.value), setError(""))}
                  maxLength={FEEDBACK_MAX}
                  rows={6}
                  aria-required="true"
                  autoFocus
                  placeholder="Tell us what you think..."
                  className="min-h-[9rem] w-full resize-y rounded-2xl border border-ink/35 bg-surface px-4 py-3 text-[0.98rem] text-ink outline-none transition-colors placeholder:text-ink-quiet hover:border-ink/55 focus:border-teal"
                />
              </label>
              <p className="mt-2 text-[0.85rem] text-ink-soft">Do not include patient names or details.</p>

              <div className="mt-3">
                <FormError message={error} />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close type="button" className={buttonClass.secondary} disabled={busy}>
                  Cancel
                </Dialog.Close>
                <button type="submit" disabled={busy || !message.trim()} className={buttonClass.primary}>
                  {busy && <Spinner />}
                  {busy ? "Sending" : "Send"}
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
