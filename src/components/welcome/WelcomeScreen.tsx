"use client";

import {
  ArrowRight,
  CheckCircle,
  ClipboardText,
  LockSimple,
  Microphone,
  SealCheck,
  ShieldCheck,
} from "@phosphor-icons/react";
import { MotionConfig, motion, type Variants } from "motion/react";
import Link from "next/link";
import { KeyCombo } from "@/components/KeyCombo";

const EASE = [0.16, 1, 0.3, 1] as const;

const group: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const STEPS = [
  {
    icon: <Microphone weight="fill" className="h-5 w-5" />,
    title: "Speak only what is abnormal",
    body: "Everything you do not mention stays as the normal wording from your template.",
  },
  {
    icon: <ShieldCheck weight="fill" className="h-5 w-5" />,
    title: "Every line is checked",
    body: "Side, size and negation are matched to your words, and anything doubtful is flagged.",
  },
  {
    icon: <ClipboardText weight="fill" className="h-5 w-5" />,
    title: "Paste it, or sign it right here",
    body: (
      <>
        Paste it into your reporting software with <KeyCombo combo="Ctrl+V" />, or finalise it here and print it on your letterhead with your
        signature.
      </>
    ),
  },
];

// The small report in the demo panel. One line changes, as it would from a dictation.
const NORMAL_LINES = [
  "Cerebral parenchyma shows normal attenuation.",
  "Ventricular system and sulci are normal.",
  "No midline shift.",
];

/**
 * The first screen after sign-up: a warm hello, how Radmatic works in three
 * steps, and the next thing to do. A new account is sent to choose a plan;
 * an account that can already report goes to its first report.
 */
export function WelcomeScreen({ firstName, locked }: { firstName: string; locked: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto grid w-full max-w-[76rem] flex-1 items-center gap-10 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <motion.div variants={group} initial="hidden" animate="shown" className="py-4">
          <motion.p
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal-tint px-3.5 py-1.5 text-[0.9rem] font-bold text-teal-deep"
          >
            <CheckCircle weight="fill" className="h-4.5 w-4.5" />
            Your account is ready
          </motion.p>

          <motion.h1
            variants={rise}
            className="mt-6 text-balance text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.035em]"
          >
            Welcome to Radmatic, {firstName}.
          </motion.h1>
          <motion.p variants={rise} className="mt-5 max-w-[46ch] text-[1.15rem] leading-relaxed text-ink-soft">
            From your voice to a signed report, in less than a minute. Here is how every report gets done.
          </motion.p>

          <motion.ol variants={group} className="mt-9 flex flex-col">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                variants={rise}
                className="flex gap-4 border-t border-ink/15 py-4 first:border-t-0 first:pt-0"
              >
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/[0.12] text-teal-deep">
                  {step.icon}
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.7rem] font-bold text-surface">
                    {index + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-[1.08rem] font-bold text-ink">{step.title}</span>
                  <span className="mt-0.5 block leading-relaxed text-ink-soft">{step.body}</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div variants={rise} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={locked ? "/plans" : "/report"}
              className="group inline-flex h-14 items-center justify-between gap-6 rounded-full bg-btn pl-7 pr-2 text-[1.05rem] font-bold text-btn-text transition-[background-color,transform] duration-200 hover:bg-teal-deep active:scale-[0.98]"
            >
              {locked ? "Choose your plan" : "Start your first report"}
              <span className="grid h-10 w-10 place-items-center rounded-full bg-teal">
                <ArrowRight weight="bold" className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
            {locked && (
              <p className="flex max-w-[30ch] items-center gap-2 text-[0.95rem] font-semibold text-ink-soft">
                <LockSimple weight="fill" className="h-4.5 w-4.5 shrink-0 text-amber-deep" />
                Your editor opens as soon as your plan is active.
              </p>
            )}
          </motion.div>
        </motion.div>

        <DemoPanel />
      </main>
    </MotionConfig>
  );
}

/**
 * A short, silent picture of what happens: the doctor speaks one finding, that
 * line of the report changes, and the report is copied. Plays once.
 */
function DemoPanel() {
  const at = (delay: number) => ({ duration: 0.7, ease: EASE, delay });

  return (
    <motion.aside
      aria-label="How a report is written"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(0.25)}
      className="on-night relative flex min-h-[32rem] flex-col justify-center gap-5 overflow-hidden rounded-[40px] bg-night p-7 text-on-night sm:p-10"
    >
      {/* A soft light behind the report, so the card reads as lifted. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-glow/25 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0.8)}
        className="flex items-end gap-3 self-start"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-on-night text-night">
          <Microphone weight="fill" className="h-5 w-5" />
        </span>
        <p className="max-w-[24ch] rounded-[1.1rem_1.1rem_1.1rem_0.3rem] bg-amber-tint px-4 py-3 text-[1.02rem] font-semibold leading-snug text-[#3b2503]">
          “Acute infarct in the left MCA territory.”
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1.3)}
        className="relative rounded-3xl bg-white p-6 text-[#0a0d0c] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]"
      >
        <p className="text-center text-[0.92rem] font-bold tracking-[0.02em]">CT BRAIN (PLAIN)</p>
        <p className="mt-4 text-[0.82rem] font-bold">FINDINGS:</p>
        <ul className="mt-1.5 flex flex-col gap-1 text-[0.9rem] leading-snug">
          <li className="relative rounded-lg px-2 py-1">
            {/* The normal line gives way to the dictated finding. */}
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={at(2.2)}
              className="absolute inset-x-2 top-1 text-[#49524f]"
            >
              No acute infarct.
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={at(2.4)}
              className="block font-bold"
            >
              Acute infarct in the left MCA territory.
            </motion.span>
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={at(2.4)}
              className="absolute inset-0 -z-0 rounded-lg bg-[#0a7c70]/[0.1] ring-1 ring-[#0a7c70]/30"
            />
          </li>
          {NORMAL_LINES.map((line) => (
            <li key={line} className="px-2 py-1 text-[#49524f]">
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.82rem] font-bold">IMPRESSION:</p>
        <p className="px-2 py-1 text-[0.9rem] font-bold">Acute left MCA territory infarct.</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.4, bounce: 0.2, delay: 3.1 }}
        className="inline-flex items-center gap-2 self-end rounded-full bg-teal-glow px-4 py-2 text-[0.95rem] font-bold text-[#08302d]"
      >
        <SealCheck weight="fill" className="h-5 w-5" />
        Copied. Press <KeyCombo combo="Ctrl+V" />
      </motion.p>
    </motion.aside>
  );
}
