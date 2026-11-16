"use client";

import { ArrowRight, CheckCircle, Files, Lightning, NotePencil, SealCheck, Signature, UsersThree } from "@phosphor-icons/react";
import { MotionConfig, motion, type Variants } from "motion/react";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const group: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/**
 * The first screen after payment: thanks, what was bought in plain terms, and
 * straight back to work. Shown once, on the first visit after the plan starts.
 */
export function PlanActiveScreen({
  firstName,
  planName,
  cycle,
  until,
  creditsPerDay,
  paid,
}: {
  firstName: string;
  planName: string;
  cycle: "monthly" | "yearly";
  /** The day the plan runs to, already formatted. */
  until: string;
  creditsPerDay: number;
  /** The amount paid, already formatted. */
  paid: string;
}) {
  const rows = [
    { label: "Plan", value: `${planName}, paid ${cycle}` },
    { label: "Active until", value: until },
    { label: "AI updates", value: `${creditsPerDay} a day` },
    { label: "Paid", value: `${paid} incl. GST` },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto grid w-full max-w-[76rem] flex-1 items-center gap-10 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <motion.div variants={group} initial="hidden" animate="shown" className="py-4">
          <motion.p
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal-tint px-3.5 py-1.5 text-[0.9rem] font-bold text-teal-deep"
          >
            <CheckCircle weight="fill" className="h-4.5 w-4.5" />
            Payment received
          </motion.p>

          <motion.h1
            variants={rise}
            className="mt-6 text-balance text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.035em]"
          >
            You’re all set, {firstName}.
          </motion.h1>
          <motion.p variants={rise} className="mt-5 max-w-[46ch] text-[1.15rem] leading-relaxed text-ink-soft">
            Thank you for choosing Lumen<span className="text-teal">AI</span>. Your editor is open, and everything you set
            up is waiting for you.
          </motion.p>

          <motion.dl variants={rise} className="mt-9 grid max-w-[32rem] grid-cols-2 gap-x-6 border-t border-ink/15">
            {rows.map((row) => (
              <div key={row.label} className="border-b border-ink/15 py-3.5">
                <dt className="text-[0.85rem] font-semibold text-ink-soft">{row.label}</dt>
                <dd className="mt-0.5 text-[1.05rem] font-bold">{row.value}</dd>
              </div>
            ))}
          </motion.dl>

          <motion.div variants={rise} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/report"
              className="group inline-flex whitespace-nowrap h-14 items-center justify-between gap-6 rounded-full bg-btn pl-7 pr-2 text-[1.05rem] font-bold text-btn-text transition-[background-color,transform] duration-200 hover:bg-teal-deep active:scale-[0.98]"
            >
              Start a report
              <span className="grid h-10 w-10 place-items-center rounded-full bg-teal">
                <ArrowRight weight="bold" className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/team"
              className="inline-flex whitespace-nowrap h-12 items-center gap-2 rounded-full px-4 text-[1rem] font-bold text-ink transition-colors hover:bg-ink/[0.06]"
            >
              <UsersThree weight="bold" className="h-5 w-5" />
              Invite your team
            </Link>
          </motion.div>
          <motion.p variants={rise} className="mt-5 text-[0.92rem] text-ink-soft">
            A receipt is on its way to your email.
          </motion.p>
        </motion.div>

        <Unlocked creditsPerDay={creditsPerDay} />
      </main>
    </MotionConfig>
  );
}

/** What the plan opens, ticked in one by one under a seal. Plays once. */
function Unlocked({ creditsPerDay }: { creditsPerDay: number }) {
  const at = (delay: number) => ({ duration: 0.7, ease: EASE, delay });
  const items = [
    { icon: NotePencil, text: "Your report editor" },
    { icon: Lightning, text: `${creditsPerDay} AI updates, every day` },
    { icon: Files, text: "Your templates and macros" },
    { icon: Signature, text: "Your letterhead and signature" },
  ];

  return (
    <motion.aside
      aria-label="What your plan includes"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(0.25)}
      className="on-night relative flex min-h-[32rem] flex-col justify-center gap-7 overflow-hidden rounded-[40px] bg-night p-7 text-on-night sm:p-10"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-glow/25 blur-3xl"
      />

      <motion.span
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.5, bounce: 0.3, delay: 0.7 }}
        className="grid h-16 w-16 place-items-center rounded-full bg-teal-glow text-[#08302d]"
      >
        <SealCheck weight="fill" className="h-9 w-9" />
      </motion.span>

      <ul className="flex flex-col gap-3">
        {items.map(({ icon: Icon, text }, index) => (
          <motion.li
            key={text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={at(1.1 + index * 0.25)}
            className="flex items-center gap-3.5 rounded-2xl bg-on-night/[0.07] px-4 py-3.5"
          >
            <Icon weight="fill" className="h-5 w-5 shrink-0 text-teal-glow" />
            <span className="flex-1 text-[1.02rem] font-semibold">{text}</span>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", visualDuration: 0.35, bounce: 0.35, delay: 1.35 + index * 0.25 }}
            >
              <CheckCircle weight="fill" className="h-5 w-5 text-teal-glow" />
            </motion.span>
          </motion.li>
        ))}
      </ul>
    </motion.aside>
  );
}
