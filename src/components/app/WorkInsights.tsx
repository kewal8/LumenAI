"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Files,
  Scan,
  Timer,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { ENOUGH, type Insights, type Share } from "@/lib/insights";
import { PANEL } from "./ui";

const dayLabel = (day: string, withWeekday = false) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  });

function took(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
}

/** The same time, short enough for a small tile: "3m 42s". */
function short(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`;
}

const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

const NOT_ENOUGH = `Shows once you have finalized ${ENOUGH} reports in 30 days.`;

/** Up or down against the 30 days before, once both have enough reports to compare. */
function Trend({ now, before }: { now: number; before: number }) {
  if (before < ENOUGH || now < ENOUGH) return null;
  const change = Math.round(((now - before) / before) * 100);
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.85rem] font-bold ${
        change >= 0 ? "bg-teal-glow/20 text-teal-glow" : "bg-amber/20 text-amber"
      }`}
    >
      <Icon weight="bold" className="h-3.5 w-3.5" />
      {change === 0 ? "Same as before" : `${Math.abs(change)}% ${change > 0 ? "more" : "fewer"} than the 30 days before`}
    </span>
  );
}

/** The last 30 shift days as bars of light on the teal panel. */
function NightBars({ days }: { days: Insights["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(...days.map((day) => day.reports), 1);
  // Bar heights are shares of the chart, so it can be lower on a phone.
  const at = (value: number) => (value / top) * 100;
  const shown = hover === null ? null : days[hover];

  return (
    <div>
      <div className="relative h-24 lg:h-[132px]" onMouseLeave={() => setHover(null)}>
        {days.every((day) => day.reports === 0) && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[0.95rem] font-semibold text-on-night-soft">
            Your first finalized report starts this chart.
          </p>
        )}
        <div className="absolute inset-0 flex items-end gap-[3px] border-b border-on-night/25">
          {days.map((day, index) => (
            <button
              key={day.day}
              type="button"
              aria-label={`${dayLabel(day.day, true)}: ${day.reports} reports finalized`}
              onMouseEnter={() => setHover(index)}
              onFocus={() => setHover(index)}
              onBlur={() => setHover(null)}
              className="flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
            >
              {day.reports === 0 ? (
                <span className="h-[2px] w-full rounded-full bg-on-night/15" />
              ) : (
                <span
                  className={`w-full rounded-t-[4px] transition-opacity ${index === days.length - 1 ? "bg-amber" : "bg-teal-glow"} ${
                    hover !== null && hover !== index ? "opacity-40" : ""
                  }`}
                  style={{ height: `${at(day.reports)}%` }}
                />
              )}
            </button>
          ))}
        </div>
        {shown && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-on-night px-3 py-2 text-[0.82rem] whitespace-nowrap text-night shadow-[0_8px_24px_-10px_rgb(0_0_0/0.5)]"
            style={{
              left: `clamp(4.5rem, ${((hover + 0.5) / days.length) * 100}%, calc(100% - 4.5rem))`,
              bottom: `min(calc(${at(shown.reports)}% + 10px), calc(100% - 10px))`,
            }}
          >
            <p className="font-bold">{dayLabel(shown.day, true)}</p>
            <p className="opacity-75">
              {shown.reports} report{shown.reports === 1 ? "" : "s"} finalized
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[0.8rem] font-medium text-on-night-soft">
        <span>{dayLabel(days[0].day)}</span>
        <span>{dayLabel(days[14].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** A ranked list with a thin bar for each share. */
function Ranked({ rows, total, tone }: { rows: Share[]; total: number; tone: string }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-[0.95rem]">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">
              {row.reports} · {percent(row.reports, total)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(percent(row.reports, total), 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One of the three panels under the hero, each with its own colour mark. */
function Panel({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Files;
  tone: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${PANEL} flex flex-col gap-4 p-5 sm:gap-5 sm:p-6`}>
      <h3 className="flex items-center gap-3 text-[1.05rem] font-semibold">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone}`}>
          <Icon weight="fill" className="h-5 w-5" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The share of normal studies as a ring. */
function NormalRing({ share }: { share: number }) {
  const size = 132;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-[132px] sm:w-[132px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-amber/25" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - share / 100)}
          className="stroke-teal transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <p className="text-[1.5rem] font-semibold tracking-[-0.04em] sm:text-[2rem]">{share}%</p>
    </div>
  );
}

/**
 * The doctor's own work: reports finalized, how long they take, how many are
 * normal, and what they read. Only their reports, and no patient details.
 */
export function WorkInsights({ insights }: { insights: Insights }) {
  const { days, today, last30, previous30, turnaround, normal, modalities, templates, unusedTemplates } = insights;
  const enough = last30 >= ENOUGH;
  const timed = turnaround.normal.reports + turnaround.abnormal.reports >= ENOUGH;
  const typical = (part: { seconds: number | null; reports: number }) =>
    part.seconds !== null && part.reports > 0 ? short(part.seconds) : "–";

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Your last 30 days"
        className="on-night relative grid gap-6 overflow-hidden rounded-[28px] bg-night p-5 text-on-night sm:gap-8 sm:rounded-[32px] sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12"
      >
        {/* The same soft light as the Referrals and welcome panels. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-teal-glow/20 blur-3xl"
        />

        <div className="relative flex flex-col">
          <p className="text-[0.95rem] font-semibold text-on-night-soft">Reports finalized, last 30 days</p>
          <p className="mt-1 text-[clamp(3.2rem,6vw,4.4rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums text-on-night">
            {last30.toLocaleString("en-IN")}
          </p>
          {/* Keeps its room on a wide screen so both halves line up; a phone closes the gap. */}
          <div className="mt-3 min-h-7 max-lg:empty:hidden">
            <Trend now={last30} before={previous30} />
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-2.5">
            <div className="rounded-2xl bg-on-night/[0.08] p-3 sm:p-3.5">
              <dt className="text-[0.8rem] font-semibold text-on-night-soft">Today</dt>
              <dd className="mt-1 text-[1.3rem] font-semibold leading-tight sm:text-[1.5rem] tabular-nums text-amber">{today}</dd>
            </div>
            <div className="rounded-2xl bg-on-night/[0.08] p-3 sm:p-3.5">
              <dt className="text-[0.8rem] font-semibold text-on-night-soft">Normal<span className="max-sm:hidden"> study</span></dt>
              <dd className="mt-1 whitespace-nowrap text-[1.3rem] font-semibold leading-tight sm:text-[1.5rem] text-on-night">
                {timed ? typical(turnaround.normal) : "–"}
              </dd>
            </div>
            <div className="rounded-2xl bg-on-night/[0.08] p-3 sm:p-3.5">
              <dt className="text-[0.8rem] font-semibold text-on-night-soft">Abnormal</dt>
              <dd className="mt-1 whitespace-nowrap text-[1.3rem] font-semibold leading-tight sm:text-[1.5rem] text-on-night">
                {timed ? typical(turnaround.abnormal) : "–"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 flex items-center gap-2 text-[0.88rem] text-on-night-soft">
            <Timer weight="fill" className="h-4 w-4 shrink-0 text-teal-glow" />
            {timed ? "Typical time from first word to final." : NOT_ENOUGH}
          </p>
        </div>

        <div className="relative flex flex-col justify-end">
          <p className="mb-2 text-[0.95rem] font-semibold text-on-night-soft sm:mb-3">Each day, 6 am to 6 am</p>
          <NightBars days={days} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel icon={CheckCircle} tone="bg-teal/[0.12] text-teal-deep" title="Normal studies">
          {enough && normal.of > 0 ? (
            <div className="flex items-center gap-5">
              <NormalRing share={percent(normal.reports, normal.of)} />
              <p className="text-[0.95rem] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{normal.reports}</span> of {normal.of} reports had nothing
                abnormal
                {turnaround.normal.seconds !== null && turnaround.normal.reports > 0
                  ? `, done in ${took(turnaround.normal.seconds)} each.`
                  : "."}
              </p>
            </div>
          ) : (
            <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>
          )}
        </Panel>

        <Panel icon={Scan} tone="bg-amber-tint text-amber-deep" title="By modality">
          {enough ? (
            <Ranked rows={modalities} total={last30} tone="bg-amber" />
          ) : (
            <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>
          )}
        </Panel>

        <Panel icon={Files} tone="bg-teal/[0.12] text-teal-deep" title="Most used templates">
          {enough ? (
            <Ranked rows={templates} total={last30} tone="bg-teal" />
          ) : (
            <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>
          )}
          {unusedTemplates > 0 && (
            <Link
              href="/templates"
              className="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-amber-tint px-4 py-3 text-[0.92rem] font-semibold text-amber-deep transition-[filter] hover:brightness-[0.97]"
            >
              {unusedTemplates} of your templates unused in 60 days
              <ArrowRight weight="bold" className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </Panel>
      </div>
    </div>
  );
}
