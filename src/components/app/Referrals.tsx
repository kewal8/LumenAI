"use client";

import { Check, Copy, Gift, LinkSimple, ShareNetwork } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Field, FormError, send } from "@/components/auth/fields";
import { toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { IconTile, PANEL, buttonClass } from "./ui";

const noChanges = () => () => {};

/** The sign-up address that fills in this code for the person who opens it. */
function shareLink(code: string) {
  return `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
}

/**
 * A person's own code, large, with buttons to copy it, copy the sign-up link
 * or open the phone's share sheet.
 */
export function ReferralShare({ code, reward }: { code: string; reward: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  // Only phones and some browsers have a share sheet; elsewhere the button is left out.
  const canShare = useSyncExternalStore(
    noChanges,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : shareLink(code));
      setCopied(what);
      toast.success(what === "code" ? `Code ${code} copied` : "Sign-up link copied");
      setTimeout(() => setCopied((current) => (current === what ? null : current)), 2000);
    } catch {
      toast.error("Could not copy. Select the code and copy it by hand.");
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "LumenAI",
        text: `I use LumenAI for my radiology reports. Sign up with my code ${code}.`,
        url: shareLink(code),
      });
    } catch (problem) {
      // Closing the share sheet is not a failure.
      if (problem instanceof DOMException && problem.name === "AbortError") return;
      toast.error("Could not open sharing. Copy the link instead.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <p
          aria-label={`Your referral code ${code}`}
          className="select-all rounded-2xl border-2 border-dashed border-ink/40 px-5 py-3 font-mono text-[1.6rem] font-bold tracking-[0.12em] text-ink"
        >
          {code}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => copy("code")} className={buttonClass.primary}>
            {copied === "code" ? <Check weight="bold" className="h-4 w-4" /> : <Copy weight="bold" className="h-4 w-4" />}
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
          <button type="button" onClick={() => copy("link")} className={buttonClass.secondary}>
            {copied === "link" ? (
              <Check weight="bold" className="h-4 w-4" />
            ) : (
              <LinkSimple weight="bold" className="h-4 w-4" />
            )}
            {copied === "link" ? "Copied" : "Copy sign-up link"}
          </button>
          {canShare && (
            <button type="button" onClick={share} className={buttonClass.secondary}>
              <ShareNetwork weight="bold" className="h-4 w-4" />
              Share
            </button>
          )}
        </div>
      </div>
      <p className="max-w-[62ch] leading-relaxed text-ink-soft">{reward}</p>
    </div>
  );
}

/**
 * On the Plans page: the referral code this account joined with, or a field to
 * add one before the first payment. After payment the code is fixed.
 */
export function ReferralCodeEntry({
  applied,
  canEdit,
}: {
  applied: { code: string | null; referrerName: string | null; canChange: boolean };
  /** Owners and admins may add a code; others only see it. */
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!applied.code);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = applied.canChange && canEdit;
  // Nothing to show: no code, and none can be added any more.
  if (!applied.code && !open) return null;

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ code: string; referrerName: string }>("POST", "/api/referrals", { code });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(`Referral code ${result.data.code} from ${result.data.referrerName} added`);
    setEditing(false);
    setCode("");
    router.refresh();
  }

  return (
    <section aria-labelledby="referral-code" className={`${PANEL} flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6`}>
      <IconTile tone={applied.code ? "teal" : "neutral"}>
        <Gift weight="fill" className="h-5 w-5" />
      </IconTile>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 id="referral-code" className="text-[1.08rem] font-bold tracking-[-0.01em] text-ink">
            Referral code
          </h2>
          <p className="mt-0.5 text-[0.95rem] leading-relaxed text-ink-soft">
            {applied.code
              ? applied.canChange
                ? `You joined with ${applied.referrerName ?? "a colleague"}'s code ${applied.code}. They are thanked once your first payment is done.`
                : `You joined with ${applied.referrerName ?? "a colleague"}'s code ${applied.code}.`
              : "Did a colleague refer you? Add their code before your first payment so they are thanked for it."}
          </p>
        </div>

        {open && editing && (
          <form onSubmit={apply} className="flex max-w-xl flex-col gap-3" noValidate>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <Field
                  id="plans-referral-code"
                  label={applied.code ? "New code" : "Code"}
                  value={code}
                  onChange={(value) => {
                    setCode(value.toUpperCase());
                    setError("");
                  }}
                  autoComplete="off"
                  dense
                />
              </div>
              <button type="submit" disabled={busy || !code.trim()} className={buttonClass.primary}>
                {busy && <Spinner />}
                {busy ? "Checking" : "Add code"}
              </button>
              {applied.code && (
                <button type="button" onClick={() => setEditing(false)} className={buttonClass.quiet}>
                  Keep {applied.code}
                </button>
              )}
            </div>
            <FormError message={error} />
          </form>
        )}

        {open && !editing && applied.code && (
          <div>
            <button type="button" onClick={() => setEditing(true)} className={buttonClass.secondary}>
              Change code
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
