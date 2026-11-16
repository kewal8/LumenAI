"use client";

import { CalendarBlank, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { buttonClass } from "@/components/app/ui";

/**
 * Asks the owner to renew before the plan ends, so the editor never locks in
 * the middle of a reporting shift. Shown on the first visit seven days before
 * the end and again one day before; never inside an open report.
 */
export function RenewalReminder({
  firstName,
  planName,
  endsOn,
  daysLeft,
  reports,
  onLater,
  onRenew,
}: {
  firstName: string;
  planName: string;
  /** The plan's last day, already formatted. */
  endsOn: string;
  /** Calendar days until the plan ends: 0 is today, 1 tomorrow. */
  daysLeft: number;
  /** Reports finalised on this plan so far. */
  reports: number;
  onLater?: () => void;
  /** Called as Renew plan is pressed, before going to Plans. */
  onRenew?: () => void;
}) {
  const lastDay = daysLeft <= 1;
  const kept = ["Your templates and macros", "Your letterhead and signature", "Every report you have written"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", visualDuration: 0.45, bounce: 0.15 }}
      className="w-[min(30rem,calc(100vw-2rem))] rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] sm:p-8"
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl ${
          lastDay ? "bg-amber-tint text-amber-deep" : "bg-teal/[0.12] text-teal-deep"
        }`}
      >
        {lastDay ? <WarningCircle weight="fill" className="h-6 w-6" /> : <CalendarBlank weight="fill" className="h-6 w-6" />}
      </span>

      <h2 id="renewal-title" className="mt-5 text-balance text-[1.45rem] font-semibold leading-tight tracking-[-0.025em]">
        {daysLeft <= 0
          ? `${firstName}, your plan ends today`
          : lastDay
            ? `${firstName}, your plan ends tomorrow`
            : `${firstName}, your ${planName} plan ends in ${daysLeft} days`}
      </h2>
      <p className="mt-2 leading-relaxed text-ink-soft">
        {lastDay
          ? `${daysLeft <= 0 ? "Later today" : `On ${endsOn}`} the editor closes until it is renewed. Renew now so your next list is not held up.`
          : `It runs until ${endsOn}. Renew now and nothing changes for you.`}
      </p>

      <div className="mt-5 rounded-2xl bg-ink/[0.04] px-4 py-3.5">
        <p className="text-[0.95rem]">
          {reports > 0 ? (
            <>
              <span className="text-[1.15rem] font-bold">{reports.toLocaleString("en-IN")}</span>
              <span className="text-ink-soft">
                {reports === 1 ? " report" : " reports"} written on this plan. They stay with you, along with:
              </span>
            </>
          ) : (
            <span className="text-ink-soft">Everything you set up stays with you:</span>
          )}
        </p>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {kept.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <CheckCircle weight="fill" className="h-4.5 w-4.5 shrink-0 text-teal" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/plans" onClick={onRenew} className={buttonClass.primary}>
          Renew plan
        </Link>
        <button type="button" onClick={onLater} className={buttonClass.secondary}>
          {lastDay ? "Remind me later" : "Remind me tomorrow"}
        </button>
      </div>
      <p className="mt-4 text-[0.88rem] text-ink-soft">Choose renew and our team calls you to take payment.</p>
    </motion.div>
  );
}
