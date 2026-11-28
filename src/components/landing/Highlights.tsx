"use client";

import { Check } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Turn, TurnBars, useTurns } from "./turns";

const EASE = [0.16, 1, 0.3, 1] as const;

type Point = { icon: React.ReactNode; title: string; body: string };

/** A list of points shown one at a time, each sliding in after the last. */
export function Highlights({ points, label }: { points: Point[]; label: string }) {
  const { ref, hold, turns } = useTurns<HTMLDivElement>(points.length);
  return (
    <div ref={ref} role="group" aria-roledescription="carousel" aria-label={label} {...hold}>
      <div className="grid overflow-hidden rounded-3xl bg-surface/75 p-6 sm:p-8">
        {points.map((point, at) => (
          <Turn key={point.title} active={at === turns.index} before={at < turns.index} className="flex items-start gap-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-teal/15 bg-teal-tint text-teal-deep">
              {point.icon}
            </span>
            <div>
              <h3 className="text-[1.35rem] font-semibold leading-snug tracking-[-0.02em]">{point.title}</h3>
              <p className="mt-1.5 max-w-[42ch] leading-relaxed text-ink-soft">{point.body}</p>
            </div>
          </Turn>
        ))}
      </div>
      <TurnBars turns={turns} labels={points.map((point) => point.title)} className="mt-5" />
    </div>
  );
}

/** Old way against new way, one pair at a time: the old line crossed out, the new one beside it. */
export function Compare({ pairs }: { pairs: { old: string; now: string }[] }) {
  const { ref, hold, turns } = useTurns<HTMLDivElement>(pairs.length);
  const line = "text-[clamp(1.3rem,2.3vw,1.75rem)] font-semibold leading-snug tracking-[-0.02em]";
  return (
    <div ref={ref} role="group" aria-roledescription="carousel" aria-label="Reporting today and with Radmatic" {...hold}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-ink/[0.12] bg-surface p-8 sm:p-10">
          <h2 className="font-semibold text-ink-quiet">Reporting today</h2>
          <div className="mt-4 grid">
            {pairs.map((pair, at) => (
              <Turn key={pair.old} active={at === turns.index} before={at < turns.index}>
                <p className={`${line} text-ink-quiet line-through decoration-ink-quiet/70 decoration-2`}>{pair.old}</p>
              </Turn>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-teal-tint p-8 sm:p-10">
          <h2 className="font-semibold text-teal-deep">
            With Radmatic
          </h2>
          <div className="mt-4 grid">
            {pairs.map((pair, at) => (
              <Turn key={pair.now} active={at === turns.index} before={at < turns.index} className="flex gap-3.5">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal text-btn-text">
                  <Check weight="bold" className="h-4 w-4" />
                </span>
                <p className={line}>{pair.now}</p>
              </Turn>
            ))}
          </div>
        </div>
      </div>
      <TurnBars turns={turns} labels={pairs.map((pair) => pair.now)} className="mx-auto mt-6 max-w-sm" />
    </div>
  );
}

/**
 * A feature told in turns: the points on one side, and on the other a
 * mock-up that changes to show the point being made.
 */
export function FeatureTurns({
  intro,
  points,
  flip = false,
}: {
  intro: React.ReactNode;
  points: { icon: React.ReactNode; title: string; body: string; mock: React.ReactNode }[];
  /** Puts the mock-up on the left. */
  flip?: boolean;
}) {
  const { ref, hold, turns } = useTurns<HTMLDivElement>(points.length, 6);
  return (
    <div ref={ref} {...hold} className="grid items-center gap-x-16 gap-y-12 lg:grid-cols-2">
      <div className={flip ? "lg:order-2" : ""}>
        {intro}
        <ul className="mt-8 flex flex-col gap-1.5">
          {points.map((point, at) => {
            const active = at === turns.index;
            return (
              <li key={point.title}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => turns.setIndex(at)}
                  className={`flex w-full cursor-pointer items-center gap-4 rounded-full p-1.5 pr-6 text-left transition-colors duration-300 ${
                    active ? "bg-surface shadow-[0_1px_3px_rgb(6_35_33/0.08)] ring-1 ring-ink/10" : "hover:bg-ink/[0.04]"
                  }`}
                >
                  {point.icon}
                  <span className={`font-semibold leading-snug transition-colors ${active ? "text-ink" : "text-ink-soft"}`}>
                    {point.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 grid pl-2">
          {points.map((point, at) => (
            <Turn key={point.title} active={at === turns.index} slide={false}>
              <p className="max-w-[46ch] leading-relaxed text-ink-soft">{point.body}</p>
            </Turn>
          ))}
        </div>
      </div>
      <div className="glow-up rounded-[40px] border border-line bg-surface/60 p-5 sm:p-8">
        <div className="grid items-center">
          {points.map((point, at) => (
            <Turn key={point.title} active={at === turns.index} before={at < turns.index}>
              {point.mock}
            </Turn>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The steps in a row, lit one at a time, with the joining line filling as far as the lit step. */
export function Steps({ steps }: { steps: { title: string; body: React.ReactNode }[] }) {
  const { ref, hold, turns } = useTurns<HTMLOListElement>(steps.length, 4);
  return (
    <ol ref={ref} {...hold} className="relative mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      <span aria-hidden="true" className="absolute left-5 right-[calc(25%-1.25rem)] top-5 hidden h-px bg-line lg:block" />
      <motion.span
        aria-hidden="true"
        className="absolute left-5 right-[calc(25%-1.25rem)] top-5 hidden h-px bg-teal lg:block"
        style={{ originX: 0 }}
        initial={false}
        animate={{ scaleX: turns.index / (steps.length - 1) }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      {steps.map((step, at) => {
        const active = at === turns.index;
        const reached = at <= turns.index;
        return (
          <li key={step.title} className="relative">
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              aria-label={`Step ${at + 1}: ${step.title}`}
              onClick={() => turns.setIndex(at)}
              className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full text-[0.95rem] font-bold transition-colors duration-500 ${
                reached ? "bg-btn text-btn-text" : "border border-ink/20 bg-canvas text-ink-quiet"
              } ${active ? "ring-4 ring-teal/25" : ""}`}
            >
              {at + 1}
            </button>
            <h3
              className={`mt-5 text-[1.25rem] font-semibold leading-snug tracking-[-0.03em] transition-colors duration-500 ${
                active ? "text-ink" : "text-ink-quiet"
              }`}
            >
              {step.title}
            </h3>
            <p
              className={`mt-1.5 text-[0.98rem] leading-relaxed text-ink-soft transition-opacity duration-500 ${
                active ? "opacity-100" : "opacity-40 lg:opacity-0"
              }`}
            >
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
