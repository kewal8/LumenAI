"use client";

import { toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  Clock,
  Coins,
  Lightning,
  LockSimple,
  PencilSimpleLine,
  Receipt,
  Sparkle,
  SunHorizon,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/components/auth/fields";
import {
  GST_RATE,
  PLANS,
  YEARLY_DISCOUNT,
  monthlyPrice,
  rupees,
  yearlyPrice,
  yearlySaving,
  type Cycle,
  type Plan,
} from "@/lib/plans";
import type { Subscription } from "@/lib/subscription";
import { IconTile, PANEL, Page, PageHeader, formatDate } from "./ui";

/** The plan shown as the dark card. */
const FEATURED: Plan["id"] = "max";

const PLAN_ICONS: Record<Plan["id"], React.ReactNode> = {
  pro: <Lightning weight="fill" className="h-5 w-5" />,
  max: <Sparkle weight="fill" className="h-5 w-5" />,
};

// The same in every plan: plans differ only in how many credits a day they hold.
const INCLUDED = ["Your own templates", "Every line checked against your words", "Copy for PACS, print and PDF"];

const RULES = [
  {
    icon: <Coins weight="fill" className="h-5 w-5" />,
    title: "One credit, one AI update",
    body: "Each time your dictation updates the report, one credit is used.",
  },
  {
    icon: <PencilSimpleLine weight="fill" className="h-5 w-5" />,
    title: "Editing is always free",
    body: "Typing, speaking into a line, copying and printing never use credits.",
  },
  {
    icon: <SunHorizon weight="fill" className="h-5 w-5" />,
    title: "Fresh credits every day",
    body: "Your daily credits are back in full each morning.",
  },
  {
    icon: <Receipt weight="fill" className="h-5 w-5" />,
    title: "GST invoice every time",
    body: `Prices are before GST. ${Math.round(GST_RATE * 100)}% GST is added on the invoice.`,
  },
];

export function PlansClient({
  subscription,
  canChoose,
}: {
  subscription: Subscription;
  canChoose: boolean;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>(subscription.cycle ?? subscription.requested?.cycle ?? "monthly");
  const [sending, setSending] = useState<Plan["id"] | null>(null);
  const [error, setError] = useState("");

  async function choose(plan: Plan) {
    setSending(plan.id);
    setError("");
    const result = await send("POST", "/api/billing/request", { plan: plan.id, cycle });
    setSending(null);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success(`Request for ${plan.name} sent. We will call you to take payment.`);
      router.refresh();
    }
  }

  const { locked, requested } = subscription;

  return (
    <Page>
      <PageHeader
        title="Plans"
        // The account's status, not an action: it stays under the title on a phone.
        phoneAction="inline"
        description="Pay for what the AI does for you. Editing, copying and printing are always free."
        action={
          // Where the account stands: a status, so it is a chip, not a block.
          <p
            className={`inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full border px-4 py-2 text-[0.95rem] ${
              requested || locked ? "border-amber/60 bg-amber-tint text-ink" : "border-ink/20 bg-surface text-ink"
            }`}
          >
            {requested ? (
              <Clock weight="fill" className="h-5 w-5 shrink-0 text-amber-deep" />
            ) : locked ? (
              <LockSimple weight="fill" className="h-5 w-5 shrink-0 text-amber-deep" />
            ) : (
              <CheckCircle weight="fill" className="h-5 w-5 shrink-0 text-teal" />
            )}
            <span>
              <strong className="font-bold">
                {requested
                  ? `${requested.plan.name} requested`
                  : subscription.plan && !locked
                    ? `${subscription.plan.name}, ${subscription.cycle === "yearly" ? "yearly" : "monthly"}`
                    : locked
                      ? "No plan yet"
                      : "Free pilot"}
              </strong>{" "}
              <span className="text-ink-soft">
                {requested
                  ? "We will contact you for payment."
                  : subscription.plan && !locked && subscription.periodEnd
                    ? `until ${formatDate(subscription.periodEnd)}`
                    : locked
                      ? "Choose one to start reporting"
                      : "while LumenAI is tested with you"}
              </span>
            </span>
          </p>
        }
      />

      {/* A new account lands here: say plainly why the editor is closed and what opens it. */}
      {locked && (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-amber bg-amber-tint/60 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber text-[#3b2503]">
            <LockSimple weight="fill" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-[1.15rem] font-bold tracking-[-0.01em] text-ink">
              {requested ? "Your editor opens once payment is done" : "Choose a plan to open your editor"}
            </h2>
            <p className="mt-1 leading-relaxed text-ink-soft">
              {requested
                ? `You asked for ${requested.plan.name}, paid ${requested.cycle}. We will contact you to take payment, and your editor opens as soon as it is done.`
                : "Pick the plan that fits your day. Online payment is coming soon; for now we contact you to take payment and open your editor straight after."}
            </p>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2.5 rounded-2xl border border-flag/50 bg-flag/10 px-4 py-3 font-semibold text-flag">
          <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
          {error}
        </p>
      )}

      {/* The switch changes the prices on the cards, so it sits right above them. */}
      <div className="flex justify-center pb-3 pt-2">
        <div role="group" aria-label="How to pay" className="inline-flex rounded-full border border-ink/40 bg-surface p-1 shadow-[0_1px_2px_rgb(10_13_12/0.06)]">
          {(["monthly", "yearly"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={cycle === value}
              onClick={() => setCycle(value)}
              className={`h-10 rounded-full px-5 text-[0.95rem] font-bold transition-colors ${
                cycle === value ? "bg-btn text-btn-text" : "text-ink hover:bg-ink/[0.08]"
              }`}
            >
              {value === "monthly" ? "Monthly" : "Yearly"}
              {value === "yearly" && (
                <span className="ml-2 rounded-full bg-amber px-2 py-0.5 text-[0.8rem] font-bold text-[#3b2503]">
                  Save {Math.round(YEARLY_DISCOUNT * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Plans" className="grid items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === FEATURED;
          const current = !locked && subscription.plan?.id === plan.id && subscription.cycle === cycle;
          const isRequested = requested?.plan.id === plan.id && requested.cycle === cycle;
          const price = monthlyPrice(plan, cycle);
          const soft = featured ? "text-on-night-soft" : "text-ink-soft";
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-7 ${
                featured
                  ? "bg-night text-on-night shadow-[0_24px_60px_-24px_rgb(6_17_15/0.7)] lg:-my-3 lg:py-10"
                  : "border border-ink/20 bg-surface"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    featured ? "bg-on-night text-night" : "bg-teal/[0.12] text-teal-deep"
                  }`}
                >
                  {PLAN_ICONS[plan.id]}
                </span>
                {featured && (
                  <span className="ml-auto rounded-full bg-amber px-3 py-1 text-[0.82rem] font-bold text-[#3b2503]">
                    Most popular
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-[1.5rem] font-semibold tracking-[-0.02em]">{plan.name}</h2>
              <p className={soft}>{plan.suits}</p>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums">
                  {rupees(price)}
                </span>
                {cycle === "yearly" && (
                  <span className={`text-[1.4rem] font-semibold tabular-nums line-through ${soft}`}>
                    {rupees(plan.monthly)}
                  </span>
                )}
              </p>
              <p className={`mt-1.5 font-semibold ${soft}`}>
                {cycle === "yearly"
                  ? `a month + GST. ${rupees(yearlyPrice(plan))} a year, you save ${rupees(yearlySaving(plan))}.`
                  : "a month + GST, billed monthly"}
              </p>

              <p
                className={`mt-6 inline-flex items-center gap-2.5 self-start rounded-full px-4 py-2 text-[1.05rem] font-bold ${
                  featured ? "bg-on-night/[0.12]" : "bg-teal/[0.1] text-ink"
                }`}
              >
                <Coins weight="fill" className={`h-5 w-5 ${featured ? "text-teal-glow" : "text-teal"}`} />
                {plan.creditsPerDay} credits a day
              </p>

              <ul className={`mt-6 flex flex-col gap-3 border-t border-dashed pt-5 ${featured ? "border-night-line" : "border-ink/30"}`}>
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle weight="fill" className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-teal-glow" : "text-teal"}`} />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                {current ? (
                  <p className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-current font-bold">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    Your plan
                  </p>
                ) : isRequested ? (
                  <p className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-amber font-bold">
                    <Clock weight="fill" className="h-5 w-5" />
                    Requested
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!canChoose || sending !== null}
                    onClick={() => choose(plan)}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-[1rem] font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                      featured
                        ? "bg-on-night text-night hover:bg-white"
                        : "border-2 border-ink text-ink hover:bg-ink hover:text-surface"
                    }`}
                  >
                    {sending === plan.id && <Spinner />}
                    {sending === plan.id ? "Sending" : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {/* Centres and teams: a price set together, so no number on the card. */}
        <article className="flex flex-col rounded-3xl border border-ink/20 bg-surface p-7">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal/[0.12] text-teal-deep">
            <Buildings weight="fill" className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-[1.5rem] font-semibold tracking-[-0.02em]">Enterprise</h2>
          <p className="text-ink-soft">Diagnostic centres and teams</p>
          <p className="mt-6 text-[2.75rem] font-bold leading-none tracking-[-0.03em]">Talk to us</p>
          <p className="mt-1.5 font-semibold text-ink-soft">Volume and contract pricing</p>
          <p className="mt-6 inline-flex items-center gap-2.5 self-start rounded-full bg-teal/[0.1] px-4 py-2 text-[1.05rem] font-bold text-ink">
            <Coins weight="fill" className="h-5 w-5 text-teal" />
            Credits set for your centre
          </p>
          <ul className="mt-6 flex flex-col gap-3 border-t border-dashed border-ink/30 pt-5">
            {["One shared pool for every doctor", "A daily limit for each doctor", "One GST invoice for the centre"].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            <Link
              href="/book-a-demo"
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink font-bold text-ink transition-colors hover:bg-ink hover:text-surface"
            >
              Talk to us
              <ArrowRight weight="bold" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </article>
      </section>

      <p className="text-center text-[0.98rem] font-semibold text-ink-soft">
        {canChoose
          ? "Choosing a plan sends us your request. We contact you to take payment and start it the same day."
          : "Only the owner or an admin of your organisation can choose a plan."}
      </p>

      {/* The rules behind every plan, all visible at once. Same width as the plans. */}
      <section aria-labelledby="plan-rules" className={`${PANEL} overflow-hidden`}>
        <h2 id="plan-rules" className="sr-only">
          Good to know
        </h2>
        {/* The 1px gaps over a line-coloured ground draw the dividers at every width. */}
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {RULES.map((rule) => (
            <li key={rule.title} className="flex gap-4 bg-surface p-5 sm:flex-col sm:gap-3 sm:p-6">
              <IconTile>{rule.icon}</IconTile>
              <div>
                <h3 className="text-[1.05rem] font-bold leading-snug text-ink">{rule.title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{rule.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
