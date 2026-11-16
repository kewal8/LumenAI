"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { ENOUGH, type Insights, type Share } from "@/lib/insights";

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

const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-6 sm:py-1 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-[0.85rem] font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-[-0.03em]">{value}</p>
      {children}
    </div>
  );
}

/** Up or down against the 30 days before, once both have enough reports to compare. */
function Trend({ now, before }: { now: number; before: number }) {
  if (before < ENOUGH || now < ENOUGH) return <p className="text-[0.85rem] text-ink-soft">reports finalized</p>;
  const change = Math.round(((now - before) / before) * 100);
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;
  return (
    <p className="flex items-center gap-1 text-[0.85rem] font-semibold text-ink-soft">
      <Icon weight="bold" className="h-3.5 w-3.5" />
      {change === 0 ? "Same as" : `${Math.abs(change)}% ${change > 0 ? "more than" : "fewer than"}`} the 30 days before
    </p>
  );
}

function Bars({ days }: { days: Insights["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(...days.map((day) => day.reports), 1);
  const height = 120;
  const shown = hover === null ? null : days[hover];

  return (
    <div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex items-end gap-[3px] border-b border-ink/20">
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
                <span className="h-[2px] w-full rounded-full bg-ink/10" />
              ) : (
                <span
                  className={`w-full rounded-t-[4px] bg-teal transition-opacity ${hover !== null && hover !== index ? "opacity-45" : ""}`}
                  style={{ height: (day.reports / top) * height }}
                />
              )}
            </button>
          ))}
        </div>
        {shown && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-[0.82rem] whitespace-nowrap text-surface shadow-[0_8px_24px_-10px_rgb(6_17_15/0.5)]"
            style={{
              left: `clamp(4.5rem, ${((hover + 0.5) / days.length) * 100}%, calc(100% - 4.5rem))`,
              bottom: Math.min((shown.reports / top) * height + 10, height - 10),
            }}
          >
            <p className="font-bold text-surface">{dayLabel(shown.day, true)}</p>
            <p className="text-surface/75">
              {shown.reports} report{shown.reports === 1 ? "" : "s"} finalized
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[0.8rem] font-medium text-ink-quiet">
        <span>{dayLabel(days[0].day)}</span>
        <span>{dayLabel(days[14].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** A ranked list with a thin bar for each share. */
function Ranked({ rows, total }: { rows: Share[]; total: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-[0.95rem]">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="shrink-0 text-ink-soft">
              {row.reports} · {percent(row.reports, total)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="h-full rounded-full bg-teal" style={{ width: `${percent(row.reports, total)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line p-5">
      <h3 className="text-[1rem] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

const NOT_ENOUGH = `Shows once you have finalized ${ENOUGH} reports in 30 days.`;

/**
 * The doctor's own work: reports finalized, how long they take, how many are
 * normal, and what they read. Only their reports, and no patient details.
 */
export function WorkInsights({ insights }: { insights: Insights }) {
  const { days, today, last30, previous30, turnaround, normal, modalities, templates, unusedTemplates } = insights;
  const enough = last30 >= ENOUGH;
  const timed = turnaround.normal.reports + turnaround.abnormal.reports >= ENOUGH;
  const typical = (part: { seconds: number | null; reports: number }) =>
    part.seconds !== null && part.reports > 0 ? took(part.seconds) : "–";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid sm:grid-cols-3">
        <Stat label="Finalized today" value={String(today)}>
          <p className="text-[0.85rem] text-ink-soft">A day runs 6 am to 6 am</p>
        </Stat>
        <Stat label="Last 30 days" value={String(last30)}>
          <Trend now={last30} before={previous30} />
        </Stat>
        <Stat label="Typical time, normal study" value={timed ? typical(turnaround.normal) : "–"}>
          <p className="text-[0.85rem] text-ink-soft">
            {timed ? `Abnormal: ${typical(turnaround.abnormal)}. From first word to final.` : NOT_ENOUGH}
          </p>
        </Stat>
      </div>

      <div>
        <p className="mb-3 text-[0.85rem] font-semibold text-ink-soft">Reports finalized each day</p>
        <Bars days={days} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Normal studies">
          {enough && normal.of > 0 ? (
            <div>
              <p className="text-[2.2rem] font-semibold leading-none tracking-[-0.04em]">{percent(normal.reports, normal.of)}%</p>
              <p className="mt-2 text-[0.95rem] text-ink-soft">
                {normal.reports} of {normal.of} reports had nothing abnormal
                {turnaround.normal.seconds !== null && turnaround.normal.reports > 0
                  ? `, done in ${took(turnaround.normal.seconds)} each.`
                  : "."}
              </p>
            </div>
          ) : (
            <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>
          )}
        </Panel>

        <Panel title="By modality">
          {enough ? <Ranked rows={modalities} total={last30} /> : <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>}
        </Panel>

        <Panel title="Most used templates">
          {enough ? <Ranked rows={templates} total={last30} /> : <p className="text-[0.95rem] text-ink-soft">{NOT_ENOUGH}</p>}
          {unusedTemplates > 0 && (
            <Link
              href="/templates"
              className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-[0.9rem] font-semibold transition-colors hover:bg-ink/[0.08]"
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
