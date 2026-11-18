"use client";

import { ArrowRight, Buildings, Files, SealCheck, Signature, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Marks the first finalised report: a short well done, how long it took, and
 * the setup that makes the next report theirs. Shown once, at the top of the
 * Reports list, never over the editor.
 */
export function FirstReportCard({
  firstName,
  took,
  onClose,
}: {
  firstName: string;
  /** How long the first report took from start to final, already formatted; null when it was not timed. */
  took: string | null;
  onClose?: () => void;
}) {
  const next = [
    { icon: Buildings, title: "Add your letterhead", body: "Printed reports carry your centre's name.", href: "/settings?tab=letterhead" },
    { icon: Signature, title: "Add your signature", body: "Signed under every final report.", href: "/settings?tab=signature" },
    { icon: Files, title: "Bring your templates", body: "Upload your Word or PDF templates at once.", href: "/templates" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      aria-labelledby="first-report-title"
      className="relative overflow-hidden rounded-3xl border border-ink/20 bg-surface"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink"
      >
        <X weight="bold" className="h-5 w-5" />
      </button>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
        <div className="flex gap-4">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", visualDuration: 0.5, bounce: 0.35, delay: 0.25 }}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-surface"
          >
            <SealCheck weight="fill" className="h-8 w-8" />
          </motion.span>
          <div className="pr-8 lg:pr-0">
            <h2 id="first-report-title" className="text-balance text-[1.45rem] font-semibold leading-tight tracking-[-0.025em]">
              Your first report is done, {firstName}.
            </h2>
            <p className="mt-2 leading-relaxed text-ink-soft">
              {took && (
                <>
                  From the first word to final in <span className="font-bold text-ink">{took}</span>.{" "}
                </>
              )}
              It is saved under the patient and ready to paste.
            </p>
          </div>
        </div>

        <div>
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-ink-quiet">Make the next one yours</p>
          <ul className="mt-2 flex flex-col">
            {next.map(({ icon: Icon, title, body, href }, index) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.45 + index * 0.1 }}
                className="border-t border-ink/15 first:border-t-0"
              >
                <Link href={href} className="group flex items-center gap-3.5 rounded-xl py-3 transition-colors hover:bg-ink/[0.03]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/[0.12] text-teal-deep">
                    <Icon weight="fill" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{title}</span>
                    <span className="block text-[0.92rem] text-ink-soft">{body}</span>
                  </span>
                  <ArrowRight weight="bold" className="mr-1 h-4.5 w-4.5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
