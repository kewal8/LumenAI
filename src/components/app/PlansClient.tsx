"use client";

import {
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  Clock,
  GraduationCap,
  Lightning,
  Minus,
  Plus,
  PlusCircle,
  Receipt,
  Stack,
  Trophy,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/components/auth/fields";
import {
  CENTRE,
  GST_RATE,
  PLANS,
  RESIDENT,
  TOP_UP,
  TRIAL,
  WORKING_DAYS,
  monthlyPrice,
  perReport,
  planFor,
  rupees,
  yearlySaving,
  type Cycle,
  type Plan,
} from "@/lib/plans";
import type { Subscription } from "@/lib/subscription";
import { IconTile, PANEL, Page, PageHeader, buttonClass, formatDate } from "./ui";

const QUICK_PICKS = [10, 20, 40, 60];
/** The plan shown as the dark card in the middle. */
const FEATURED: Plan["id"] = "pro";

const PLAN_ICONS: Record<Plan["id"], React.ReactNode> = {
  starter: <User weight="fill" className="h-5 w-5" />,
  pro: <Lightning weight="fill" className="h-5 w-5" />,
  max: <Trophy weight="fill" className="h-5 w-5" />,
};

// The same in every plan: plans differ only in how many reports they hold.
const INCLUDED = [
  "Corrections never count",
  "Unused reports carry over",
  "Your own templates",
  "Every line checked against your words",
];

const RULES = [
  {
    icon: <Stack weight="fill" className="h-5 w-5" />,
    title: "One report is one case",
    body: "Dictate, correct and dictate again as often as you need. It still counts once.",
  },
  {
    icon: <ArrowsClockwise weight="bold" className="h-5 w-5" />,
    title: "Unused reports carry over",
    body: "What you do not use this month is added to next month.",
  },
  {
    icon: <PlusCircle weight="fill" className="h-5 w-5" />,
    title: "Ran out? Add more",
    body: `${TOP_UP.reports} extra reports for ${rupees(TOP_UP.price)}, any time.`,
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
  const [cycle, setCycle] = useState<Cycle>(subscription.cycle ?? "monthly");
  const [perDay, setPerDay] = useState(20);
  const [sending, setSending] = useState<Plan["id"] | null>(null);
  const [error, setError] = useState("");

  const monthlyNeed = perDay * WORKING_DAYS;
  const fit = planFor(perDay);

  async function choose(plan: Plan) {
    setSending(plan.id);
    setError("");
    const result = await send("POST", "/api/billing/request", { plan: plan.id, cycle });
    setSending(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <Page>
      <PageHeader
        title="Plans"
        description="You pay for the reports you write. Corrections to a report never cost extra."
        action={
          <div role="group" aria-label="How to pay" className="inline-flex rounded-full border border-ink/40 bg-surface p-1">
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
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />

      {/* Where the account stands today. */}
      <section className={`${PANEL} flex flex-wrap items-center gap-4 p-5 sm:p-6`}>
        <IconTile tone={subscription.requested ? "amber" : "teal"}>
          {subscription.requested ? (
            <Clock weight="fill" className="h-5 w-5" />
          ) : (
            <CheckCircle weight="fill" className="h-5 w-5" />
          )}
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="text-[1.1rem] font-semibold leading-snug">
            {subscription.plan
              ? `You are on ${subscription.plan.name}, paid ${subscription.cycle === "yearly" ? "yearly" : "monthly"}`
              : "You are on the pilot"}
          </p>
          <p className="mt-0.5 text-ink-soft">
            {subscription.plan && subscription.periodEnd
              ? `Runs until ${formatDate(subscription.periodEnd)}.`
              : subscription.plan
                ? "Your plan is active."
                : "Free while LumenAI is being tested with you. Choose a plan when you are ready."}
          </p>
        </div>
        {subscription.requested && (
          <p className="rounded-2xl border border-amber/60 bg-amber/20 px-4 py-2.5 text-[0.95rem] font-semibold text-amber-deep">
            {subscription.requested.plan.name} ({subscription.requested.cycle}) requested on{" "}
            {formatDate(subscription.requested.at)}. We will call you to start it.
          </p>
        )}
      </section>

      {/* Start from the doctor's own day, not from a list of plan names. */}
      <section className={`${PANEL} flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-10`}>
        <div className="flex flex-col gap-3">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">
            How many reports do you write on a working day?
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-ink/40 bg-surface p-1">
              <button
                type="button"
                aria-label="Fewer reports a day"
                disabled={perDay <= 5}
                onClick={() => setPerDay((value) => Math.max(5, value - 5))}
                className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.1] disabled:opacity-35"
              >
                <Minus weight="bold" className="h-5 w-5" />
              </button>
              <output
                aria-live="polite"
                aria-label={`${perDay} reports a day`}
                className="min-w-14 text-center text-[1.4rem] font-bold tabular-nums"
              >
                {perDay}
              </output>
              <button
                type="button"
                aria-label="More reports a day"
                disabled={perDay >= 150}
                onClick={() => setPerDay((value) => Math.min(150, value + 5))}
                className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.1] disabled:opacity-35"
              >
                <Plus weight="bold" className="h-5 w-5" />
              </button>
            </div>
            {QUICK_PICKS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={perDay === value}
                onClick={() => setPerDay(value)}
                className={`h-10 rounded-full border px-4 text-[0.95rem] font-bold transition-colors ${
                  perDay === value
                    ? "border-ink bg-ink text-surface"
                    : "border-ink/40 text-ink hover:border-ink/60 hover:bg-ink/[0.06]"
                }`}
              >
                {value} a day
              </button>
            ))}
          </div>
        </div>

        <p
          aria-live="polite"
          className="flex-1 rounded-2xl border-2 border-teal bg-teal/[0.08] px-5 py-4 text-[1.05rem] leading-relaxed"
        >
          That is about <strong>{monthlyNeed.toLocaleString("en-IN")} reports a month</strong>.{" "}
          {fit ? (
            <>
              <strong>{fit.name}</strong> covers it at{" "}
              <strong>{rupees(monthlyPrice(fit, cycle))} a month</strong>, about{" "}
              <strong>{rupees(Number((monthlyPrice(fit, cycle) / monthlyNeed).toFixed(2)))} for each report</strong>{" "}
              you write.
            </>
          ) : (
            <>
              That is more than our largest plan. <strong>Talk to us</strong> and we will set a price for your
              volume.
            </>
          )}
        </p>
      </section>

      {error && (
        <p role="alert" className="flex items-center gap-2.5 rounded-2xl border border-flag/50 bg-flag/10 px-4 py-3 font-semibold text-flag">
          <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
          {error}
        </p>
      )}

      {/* Three plans side by side; the one most doctors need stands out in deep teal. */}
      <section aria-label="Plans" className="grid items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === FEATURED;
          const recommended = fit?.id === plan.id;
          const current = subscription.plan?.id === plan.id && subscription.cycle === cycle;
          const requested =
            subscription.requested?.plan.id === plan.id && subscription.requested.cycle === cycle;
          const price = monthlyPrice(plan, cycle);
          const soft = featured ? "text-on-night-soft" : "text-ink-soft";
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-7 ${
                featured
                  ? "bg-night text-on-night shadow-[0_24px_60px_-24px_rgb(6_17_15/0.7)] lg:-my-3 lg:py-10"
                  : "border border-ink/20 bg-surface"
              } ${recommended ? "ring-4 ring-amber" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    featured ? "bg-on-night text-night" : "bg-teal/[0.12] text-teal-deep"
                  }`}
                >
                  {PLAN_ICONS[plan.id]}
                </span>
                <span className="ml-auto flex flex-wrap justify-end gap-2">
                  {featured && (
                    <span className="rounded-full bg-amber px-3 py-1 text-[0.82rem] font-bold text-[#3b2503]">
                      Most popular
                    </span>
                  )}
                  {recommended && (
                    <span className="rounded-full border-2 border-amber bg-surface px-3 py-0.5 text-[0.82rem] font-bold text-ink">
                      Fits your day
                    </span>
                  )}
                </span>
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
                  ? `a month + GST. ${rupees(price * 12)} a year, you save ${rupees(yearlySaving(plan))}.`
                  : "a month + GST"}
              </p>

              <div className="mt-6">
                {current ? (
                  <p className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-current font-bold">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    Your plan
                  </p>
                ) : requested ? (
                  <p className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-amber font-bold">
                    <Clock weight="fill" className="h-5 w-5" />
                    Requested
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!canChoose || sending !== null}
                    onClick={() => choose(plan)}
                    className={`h-12 w-full rounded-full text-[1rem] font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                      featured
                        ? "bg-on-night text-night hover:bg-white"
                        : "border-2 border-ink text-ink hover:bg-ink hover:text-surface"
                    }`}
                  >
                    {sending === plan.id ? "Sending" : `Choose ${plan.name}`}
                  </button>
                )}
              </div>

              <p className="mt-6 flex items-center gap-3 text-[1.05rem] font-semibold">
                <Stack weight="fill" className={`h-5 w-5 ${featured ? "text-teal-glow" : "text-teal"}`} />
                {plan.reports.toLocaleString("en-IN")} reports a month
              </p>
              <p className={`ml-8 ${soft}`}>about {Math.floor(plan.reports / WORKING_DAYS)} each working day</p>

              <ul
                className={`mt-5 flex flex-col gap-3 border-t border-dashed pt-5 ${
                  featured ? "border-night-line" : "border-ink/30"
                }`}
              >
                {[
                  `${rupees(Number(perReport(plan, cycle).toFixed(2)))} for each report`,
                  ...INCLUDED,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle
                      weight="fill"
                      className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-teal-glow" : "text-teal"}`}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <p className="text-center text-[0.98rem] font-semibold">
        {canChoose
          ? `Every plan starts with ${TRIAL.days} free days or ${TRIAL.reports} free reports, whichever ends first. Choosing a plan sends us your request; we call you to take payment and start it.`
          : "Only the owner or an admin of your organisation can choose a plan."}
      </p>

      <section className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {RULES.map((rule) => (
          <div key={rule.title} className="flex gap-4">
            <IconTile>{rule.icon}</IconTile>
            <div>
              <h2 className="text-[1.05rem] font-semibold leading-snug">{rule.title}</h2>
              <p className="mt-0.5 max-w-[46ch] text-ink-soft">{rule.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className={`${PANEL} flex flex-col gap-4 p-6`}>
          <div className="flex items-center gap-4">
            <IconTile tone="neutral">
              <Buildings weight="fill" className="h-5 w-5" />
            </IconTile>
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">Diagnostic centres</h2>
          </div>
          <p className="max-w-[60ch] text-ink-soft">
            {rupees(CENTRE.perDoctor)} a month for each doctor, from {CENTRE.minimumDoctors} doctors. Reports are
            shared across the whole centre, so a busy doctor can use what a quieter one did not.
          </p>
          <Link href="/#demo" className={`${buttonClass.secondary} self-start`}>
            Talk to us
          </Link>
        </div>
        <div className={`${PANEL} flex flex-col gap-4 p-6`}>
          <div className="flex items-center gap-4">
            <IconTile tone="neutral">
              <GraduationCap weight="fill" className="h-5 w-5" />
            </IconTile>
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">Residents</h2>
          </div>
          <p className="text-ink-soft">
            {rupees(RESIDENT.monthly)} a month for {RESIDENT.reports} reports while you are in training. Ask your
            department to confirm.
          </p>
        </div>
      </section>
    </Page>
  );
}
