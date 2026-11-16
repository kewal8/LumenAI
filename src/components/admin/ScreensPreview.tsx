"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/app/ui";
import { FirstReportCard } from "@/components/welcome/FirstReportCard";
import { PlanActiveScreen } from "@/components/welcome/PlanActiveScreen";
import { RenewalReminder } from "@/components/welcome/RenewalReminder";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { greetingName } from "@/lib/greeting";
import { GST_RATE, PLANS, rupees, yearlyPrice } from "@/lib/plans";

// The sample plan shown on the payment screen: Pro, paid yearly.
const SAMPLE_PLAN = PLANS[0];

const dayFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

type Moment = {
  id: string;
  name: string;
  when: string;
  live: boolean;
  /** How it appears: a whole page, a pop-up over the app, or a card on the Reports page. */
  frame: "page" | "dialog" | "card";
  render: (firstName: string) => React.ReactNode;
};

const MOMENTS: Moment[] = [
  {
    id: "signup",
    name: "Account created",
    when: "Right after the email code is confirmed at sign-up, before a plan is active. Leads to Plans.",
    live: true,
    frame: "page",
    render: (firstName) => <WelcomeScreen firstName={firstName} locked />,
  },
  {
    id: "team",
    name: "Joined a team",
    when: "Right after sign-up, when the account's organisation already has an active plan. Leads to a first report.",
    live: true,
    frame: "page",
    render: (firstName) => <WelcomeScreen firstName={firstName} locked={false} />,
  },
  {
    id: "paid",
    name: "Payment received",
    when: "Meant for the first visit after a plan starts. Online payment is not connected yet, so staff start plans by hand and this screen is not shown.",
    live: false,
    frame: "page",
    render: (firstName) => (
      <PlanActiveScreen
        firstName={firstName}
        planName={SAMPLE_PLAN.name}
        cycle="yearly"
        until={dayFromNow(365)}
        creditsPerDay={SAMPLE_PLAN.creditsPerDay}
        paid={rupees(Math.round(yearlyPrice(SAMPLE_PLAN) * (1 + GST_RATE)))}
      />
    ),
  },
  {
    id: "renew-7",
    name: "Renewal reminder, 7 days",
    when: "To the owner or an admin, on their next page in the last 7 days of a paid plan, unless a renewal is already requested. Never over the report screen. “Remind me tomorrow” brings it back the next day; closing it otherwise means seen.",
    live: true,
    frame: "dialog",
    render: (firstName) => (
      <RenewalReminder firstName={firstName} planName={SAMPLE_PLAN.name} endsOn={dayFromNow(7)} daysLeft={7} reports={412} />
    ),
  },
  {
    id: "renew-1",
    name: "Renewal reminder, last day",
    when: "To the owner or an admin, in the last day of a paid plan, even if the 7-day one was seen, unless a renewal is already requested. “Remind me later” brings it back in 4 hours.",
    live: true,
    frame: "dialog",
    render: (firstName) => (
      <RenewalReminder firstName={firstName} planName={SAMPLE_PLAN.name} endsOn={dayFromNow(1)} daysLeft={1} reports={412} />
    ),
  },
  {
    id: "first-report",
    name: "First report finalised",
    when: "Once, at the top of the Reports list, after a doctor finalises their first report (within 14 days of it). The time shows when the report screen timed it.",
    live: true,
    frame: "card",
    render: (firstName) => <FirstReportCard firstName={firstName} took="2 min 40 s" />,
  },
];

/**
 * Staff pick a moment and see its screen as the customer does, with their
 * own greeting name, and replay its entrance.
 */
export function ScreensPreview() {
  const [selected, setSelected] = useState(MOMENTS[0].id);
  const [name, setName] = useState("Dr. Anita");
  // Changing the key remounts the screen, so its entrance plays again.
  const [play, setPlay] = useState(0);
  const moment = MOMENTS.find((item) => item.id === selected) ?? MOMENTS[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Moment">
        {MOMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === selected}
            onClick={() => (setSelected(item.id), setPlay((count) => count + 1))}
            className={`flex flex-col gap-2 rounded-3xl border p-5 text-left transition-colors ${
              item.id === selected ? "border-ink bg-surface ring-1 ring-ink" : "border-ink/20 bg-surface hover:border-ink/50"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[1.05rem] font-semibold">{item.name}</span>
              <Badge tone={item.live ? "teal" : "amber"}>{item.live ? "Live" : "Not live yet"}</Badge>
            </span>
            <span className="text-[0.92rem] leading-snug text-ink-soft">
              <span className="font-semibold text-ink">Shows when: </span>
              {item.when}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.92rem] font-semibold">Greeting name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            className="h-11 w-64 rounded-full border border-ink/40 bg-surface px-4 font-semibold outline-none transition-colors hover:border-ink/60 focus:border-teal"
          />
        </label>
        <button
          type="button"
          onClick={() => setPlay((count) => count + 1)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/40 px-4 font-semibold transition-colors hover:bg-ink/[0.06]"
        >
          <ArrowCounterClockwise weight="bold" className="h-4.5 w-4.5" />
          Replay
        </button>
      </div>

      {/* The screen as the customer sees it, framed like a browser window. */}
      <div className="overflow-hidden rounded-[28px] border border-ink/20 shadow-[0_22px_60px_-34px_rgb(10_13_12/0.4)]">
        <div className="flex h-10 items-center gap-1.5 border-b border-line bg-ink/[0.04] px-4">
          <span className="h-3 w-3 rounded-full bg-ink/15" />
          <span className="h-3 w-3 rounded-full bg-ink/15" />
          <span className="h-3 w-3 rounded-full bg-ink/15" />
          <span className="ml-3 text-[0.82rem] font-medium text-ink-soft">
            {moment.frame === "page" ? "lumenai / welcome" : "lumenai / reports"}
          </span>
        </div>
        {moment.frame === "page" ? (
          <div key={`${moment.id}-${play}`} className="landing pointer-events-none flex flex-col" inert>
            <header className="mx-auto flex w-full max-w-[76rem] items-center justify-between px-5 py-5 sm:px-8">
              <span className="text-[1.35rem] font-bold tracking-[-0.04em]">
                Lumen<span className="text-teal">AI</span>
              </span>
            </header>
            {moment.render(greetingName(name))}
          </div>
        ) : (
          <div key={`${moment.id}-${play}`} className="pointer-events-none relative bg-canvas" inert>
            <ReportsBehind card={moment.frame === "card" ? moment.render(greetingName(name)) : null} />
            {moment.frame === "dialog" && (
              <div className="absolute inset-0 grid place-items-center bg-[#0f2624]/40 p-4">{moment.render(greetingName(name))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A stand-in for the Reports page, so a pop-up or card is seen where it appears. */
function ReportsBehind({ card }: { card: React.ReactNode }) {
  return (
    <div className="flex min-h-[38rem] flex-col gap-6 p-6 sm:p-10">
      <div>
        <p className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">Reports</p>
        <p className="mt-1.5 text-ink-soft">Every report you have written, newest first.</p>
      </div>
      {card}
      <div className="rounded-3xl border border-ink/20 bg-surface">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-6 border-t border-line px-6 py-4 first:border-t-0">
            <span className="h-3.5 w-40 rounded-full bg-ink/[0.12]" />
            <span className="h-3 w-32 rounded-full bg-ink/[0.08]" />
            <span className="ml-auto h-3 w-20 rounded-full bg-ink/[0.08]" />
          </div>
        ))}
      </div>
    </div>
  );
}
