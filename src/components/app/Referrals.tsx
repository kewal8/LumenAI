"use client";

import {
  Check,
  Copy,
  Gift,
  Lightning,
  LinkSimple,
  SealCheck,
  ShareNetwork,
  Sparkle,
  UserPlus,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Field, FormError, send } from "@/components/auth/fields";
import { toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { PANEL, buttonClass } from "./ui";

const noChanges = () => () => {};

/** This site's address; empty while rendering on the server. */
function useOrigin() {
  return useSyncExternalStore(noChanges, () => window.location.origin, () => "");
}

/** The sign-up address that fills in this code for the person who opens it. */
function shareLink(code: string, origin: string) {
  return `${origin}/signup?ref=${encodeURIComponent(code)}`;
}

/** What a doctor sends a colleague: short, in their voice, with the link that fills in the code. */
function shareMessage(code: string, origin: string) {
  return `I use Radmatic for my radiology reports. I speak only what is abnormal and the report is ready to paste or print. Sign up with my code ${code}: ${shareLink(code, origin)}`;
}

const number = (value: number) => value.toLocaleString("en-IN");

/** Copies text and says so; one helper for the code, the link and the message. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(what: string, text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      toast.success(done);
      setTimeout(() => setCopied((current) => (current === what ? null : current)), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.");
    }
  }
  return { copied, copy };
}

/**
 * The top of the Referrals page: what a referral earns, the person's own code
 * as a ticket with one-tap copy, ways to send it, and how it works.
 */
export function ReferralShare({
  code,
  rewards,
  bonusDays,
}: {
  code: string;
  /** Bonus AI updates for one paid referral, per plan. */
  rewards: { plan: string; updates: number }[];
  bonusDays: number;
}) {
  const { copied, copy } = useCopy();
  const origin = useOrigin();
  // Only phones and some browsers have a share sheet; elsewhere the button is left out.
  const canShare = useSyncExternalStore(
    noChanges,
    () => typeof navigator.share === "function",
    () => false,
  );
  const most = Math.max(...rewards.map((reward) => reward.updates));
  const each = rewards.map((reward) => `${number(reward.updates)} for ${reward.plan}`).join(", ");

  async function share() {
    try {
      await navigator.share({ title: "Radmatic", text: shareMessage(code, origin), url: shareLink(code, origin) });
    } catch (problem) {
      // Closing the share sheet is not a failure.
      if (problem instanceof DOMException && problem.name === "AbortError") return;
      toast.error("Could not open sharing. Copy the link instead.");
    }
  }

  const steps = [
    { title: "Share your code", body: "On WhatsApp, by email, or just say it." },
    { title: "They sign up and pay", body: "Their first plan, Pro or Max. Signing up alone does not count." },
    {
      title: "You get bonus AI updates",
      body: `${each}. Used after your daily allowance, for ${bonusDays} days.`,
    },
  ];

  return (
    <section
      aria-label="Your referral code"
      className="on-night relative grid gap-8 overflow-hidden rounded-[32px] bg-night p-6 text-on-night sm:p-9 lg:grid-cols-[1.15fr_1fr] lg:gap-12"
    >
      {/* A soft light behind the code, as on the welcome screen. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-teal-glow/20 blur-3xl"
      />

      <div className="relative flex flex-col">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-amber/15 px-3 py-1.5 text-[0.85rem] font-bold text-amber">
          <Gift weight="fill" className="h-4 w-4" />
          Refer a colleague
        </p>
        <h2 className="mt-5 max-w-[22ch] text-balance text-[clamp(1.7rem,3vw,2.35rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-on-night">
          Give a colleague Radmatic. Get up to {number(most)} AI updates.
        </h2>
        <p className="mt-3 max-w-[46ch] leading-relaxed text-on-night-soft">
          When they pay for their first plan, you get half a month of their AI updates.
        </p>

        {/* The code as a ticket: read it out, or copy it in one tap. */}
        <div className="mt-7 flex max-w-[28rem] items-center gap-3 rounded-2xl border border-on-night/20 bg-on-night/[0.07] p-2 pl-5">
          <div className="min-w-0 flex-1">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-on-night-soft">Your code</p>
            <p
              aria-label={`Your referral code ${code}`}
              className="select-all truncate text-[1.9rem] font-bold leading-tight tracking-[0.12em] text-on-night"
            >
              {code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy("code", code, `Code ${code} copied`)}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-teal-glow px-4 font-bold text-[#08302d] transition-[filter,transform] hover:brightness-105 active:scale-[0.98]"
          >
            {copied === "code" ? <Check weight="bold" className="h-5 w-5" /> : <Copy weight="bold" className="h-5 w-5" />}
            {copied === "code" ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMessage(code, origin))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-night px-4.5 font-bold text-night transition-transform active:scale-[0.98]"
          >
            <WhatsappLogo weight="fill" className="h-5 w-5" />
            Send on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => copy("link", shareLink(code, origin), "Sign-up link copied")}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-on-night/30 px-4.5 font-bold text-on-night transition-colors hover:bg-on-night/10"
          >
            {copied === "link" ? <Check weight="bold" className="h-4.5 w-4.5" /> : <LinkSimple weight="bold" className="h-4.5 w-4.5" />}
            {copied === "link" ? "Copied" : "Copy sign-up link"}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={share}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-on-night/30 px-4.5 font-bold text-on-night transition-colors hover:bg-on-night/10"
            >
              <ShareNetwork weight="bold" className="h-4.5 w-4.5" />
              Share
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded-3xl bg-on-night/[0.06] p-6">
        <h3 className="text-[0.85rem] font-bold uppercase tracking-[0.08em] text-on-night-soft">How it works</h3>
        <ol className="mt-5 flex flex-col">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {/* The line joining one step to the next. */}
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="absolute left-[15px] top-9 bottom-1 w-px bg-on-night/20" />
              )}
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.9rem] font-bold ${
                  index === steps.length - 1 ? "bg-amber text-[#3b2503]" : "bg-teal-glow text-[#08302d]"
                }`}
              >
                {index + 1}
              </span>
              <span className="pt-0.5">
                <span className="block font-bold text-on-night">{step.title}</span>
                <span className="mt-0.5 block text-[0.95rem] leading-relaxed text-on-night-soft">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The four numbers of a person's referrals, each with its own colour mark. */
export function ReferralStats({
  joined,
  paid,
  earned,
  bonusLeft,
  bonusNote,
}: {
  joined: number;
  paid: number;
  earned: number;
  bonusLeft: number;
  bonusNote: string;
}) {
  const cells = [
    { icon: UserPlus, tone: "bg-teal/[0.12] text-teal-deep", label: "Signed up", value: number(joined), note: joined === 1 ? "colleague used your code" : "colleagues used your code" },
    {
      icon: SealCheck,
      tone: "bg-teal/[0.12] text-teal-deep",
      label: "Paid",
      value: number(paid),
      note: joined > paid ? `${joined - paid} still to pay` : joined ? "Every one has paid" : "None yet",
    },
    { icon: Sparkle, tone: "bg-amber-tint text-amber-deep", label: "AI updates earned", value: number(earned), note: "From every paid referral" },
    { icon: Lightning, tone: "bg-amber-tint text-amber-deep", label: "Bonus left", value: number(bonusLeft), note: bonusNote },
  ];
  return (
    <section aria-label="Your referrals in numbers" className={`${PANEL} grid sm:grid-cols-2 xl:grid-cols-4`}>
      {cells.map(({ icon: Icon, tone, label, value, note }) => (
        <div
          key={label}
          className="flex items-start gap-4 border-t border-line p-5 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(even)]:border-l xl:border-t-0 xl:border-l xl:first:border-l-0 sm:p-6"
        >
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
            <Icon weight="fill" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.9rem] font-semibold text-ink-soft">{label}</span>
            <span className="mt-0.5 block text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] tabular-nums">{value}</span>
            <span className="block text-[0.88rem] text-ink-soft">{note}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

/** Before anyone has used the code: the message to send, ready to copy. */
export function ReferralEmpty({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  const origin = useOrigin();
  return (
    <section className={`${PANEL} flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8`}>
      <div className="sm:w-[16rem] sm:shrink-0">
        <h2 className="text-[1.15rem] font-semibold">No one has used your code yet</h2>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
          Colleagues who sign up with it appear here, and turn green when they pay.
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[0.85rem] font-semibold text-ink-soft">A message you can send</p>
        <div className="flex flex-col gap-3 rounded-2xl rounded-tl-md bg-teal-tint p-4 sm:flex-row sm:items-end">
          <p className="flex-1 text-[0.98rem] leading-relaxed text-ink">{shareMessage(code, origin)}</p>
          <button
            type="button"
            onClick={() => copy("message", shareMessage(code, origin), "Message copied")}
            className={`${buttonClass.secondary} shrink-0 self-start sm:self-end`}
          >
            {copied === "message" ? <Check weight="bold" className="h-4 w-4" /> : <Copy weight="bold" className="h-4 w-4" />}
            {copied === "message" ? "Copied" : "Copy message"}
          </button>
        </div>
      </div>
    </section>
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
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          applied.code ? "bg-teal/[0.12] text-teal-deep" : "bg-amber-tint text-amber-deep"
        }`}
      >
        <Gift weight="fill" className="h-5 w-5" />
      </span>
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
