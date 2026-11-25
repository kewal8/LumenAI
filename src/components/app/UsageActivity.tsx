"use client";

import { CalendarCheck, Lightning, Microphone } from "@phosphor-icons/react";
import { useState } from "react";
import type { UsageActivity as Activity, UsageDay } from "@/lib/usageActivity";

const dayLabel = (day: string, withWeekday = false) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  });

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Today's allowance as a ring: what is left in the middle, used around it. */
function TodayRing({ used, limit }: { used: number; limit: number | null }) {
  const size = 152;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const left = limit === null ? null : Math.max(limit - used, 0);
  const share = limit ? Math.min(used / limit, 1) : 0;
  // Running low is a warning; none left is the stop.
  const tone = left === 0 ? "text-flag" : left !== null && limit && left / limit <= 0.2 ? "text-amber-deep" : "text-teal";

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-[152px] sm:w-[152px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={limit === null ? "stroke-teal/25" : "stroke-amber/20"} />
        {limit !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * share}
            className={`stroke-current ${tone} transition-[stroke-dashoffset] duration-700`}
          />
        )}
      </svg>
      <div className="text-center">
        <p className="text-[1.7rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.4rem]">{left ?? used}</p>
        <p className="mt-1 text-[0.72rem] font-semibold text-ink-soft sm:mt-1.5 sm:text-[0.85rem]">{left === null ? "used today" : "left today"}</p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Lightning;
  tone: string;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    // A phone: three small tiles side by side. Wider: three columns split by lines.
    <div className="min-w-0 rounded-2xl bg-ink/[0.04] p-3 sm:flex sm:items-start sm:gap-3 sm:rounded-none sm:border-l sm:border-line sm:bg-transparent sm:px-5 sm:py-1 sm:first:border-l-0 sm:first:pl-0">
      <span className={`hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid ${tone}`}>
        <Icon weight="fill" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.78rem] font-semibold leading-tight text-ink-soft sm:text-[0.85rem]">{label}</span>
        <span className="mt-1 block text-[1.15rem] font-semibold leading-tight tracking-[-0.02em] sm:mt-0.5 sm:text-[1.35rem]">{value}</span>
        {note && <span className="mt-0.5 block text-[0.78rem] leading-tight text-ink-soft sm:text-[0.85rem]">{note}</span>}
      </span>
    </div>
  );
}

/** The last 30 days as bars, with the plan's daily number as a line across them. */
function DailyBars({ days, limit, team }: { days: UsageDay[]; limit: number | null; team: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(limit ?? 0, ...days.map((day) => day.mine + day.others), 1);
  // Heights are shares of the chart, so it can be lower on a phone.
  const at = (value: number) => (value / top) * 100;
  const shown = hover === null ? null : days[hover];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.85rem] font-semibold text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal" />
          {team ? "You" : "AI updates"}
        </span>
        {team && (
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-teal/30" />
            Rest of your team
          </span>
        )}
        {limit !== null && (
          <span className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed border-ink/40" />
            Daily limit, {limit}
          </span>
        )}
      </div>

      <div className="relative h-28 sm:h-40" onMouseLeave={() => setHover(null)}>
        {limit !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink/25"
            style={{ bottom: `${at(limit)}%` }}
          />
        )}
        <div className="absolute inset-0 flex items-end gap-[3px] border-b border-ink/20">
          {days.map((day, index) => {
            const total = day.mine + day.others;
            return (
              <button
                key={day.day}
                type="button"
                aria-label={`${dayLabel(day.day, true)}: ${total} AI updates${team ? `, ${day.mine} by you` : ""}`}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                // The hit area is the whole column, not only the bar.
                className="group flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
              >
                {total === 0 ? (
                  <span className="h-[2px] w-full rounded-full bg-ink/10" />
                ) : (
                  <span
                    className={`flex h-full w-full flex-col justify-end gap-[2px] transition-opacity ${hover !== null && hover !== index ? "opacity-45" : ""}`}
                  >
                    {day.others > 0 && (
                      <span className="w-full rounded-t-[4px] bg-teal/30" style={{ height: `${at(day.others)}%` }} />
                    )}
                    {day.mine > 0 && (
                      <span
                        className={`w-full bg-teal ${day.others > 0 ? "" : "rounded-t-[4px]"}`}
                        style={{ height: `${at(day.mine)}%` }}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {shown && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-[0.82rem] whitespace-nowrap text-surface shadow-[0_8px_24px_-10px_rgb(6_17_15/0.5)]"
            style={{
              left: `clamp(4.5rem, ${((hover + 0.5) / days.length) * 100}%, calc(100% - 4.5rem))`,
              bottom: `min(calc(${at(shown.mine + shown.others)}% + 10px), calc(100% - 10px))`,
            }}
          >
            <p className="font-bold text-surface">{dayLabel(shown.day, true)}</p>
            <p className="text-surface/75">
              {shown.mine + shown.others} AI update{shown.mine + shown.others === 1 ? "" : "s"}
              {team && ` · ${shown.mine} by you`}
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

/**
 * How AI updates are being spent: what is left today, the last 30 days, and
 * a few totals. One AI update is one change to a report from a dictation, or
 * one Validate.
 */
export function UsageActivity({ activity }: { activity: Activity }) {
  const { credits, days, dictationSeconds } = activity;
  const team = days.some((day) => day.others > 0);
  const total30 = days.reduce((sum, day) => sum + day.mine + day.others, 0);
  const mine30 = days.reduce((sum, day) => sum + day.mine, 0);
  const busiest = days.reduce((best, day) => (day.mine + day.others > best.mine + best.others ? day : best), days[0]);
  const used = credits.used;
  const limit = credits.limit;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        {/* A phone: the ring and what it means side by side; the totals below. */}
        <div className="flex items-center gap-4 sm:contents">
          <TodayRing used={used} limit={limit} />
          <div className="min-w-0 sm:hidden">
            <p className="text-[1.05rem] font-semibold">{limit === null ? "No daily limit" : `${used} of ${limit} used today`}</p>
            <p className="mt-0.5 text-[0.92rem] leading-snug text-ink-soft">
              {limit === null
                ? "Your plan allows as many AI updates as you need."
                : used >= limit
                  ? "All used. They start again at midnight."
                  : `They start again at midnight${team ? ", shared by your team" : ""}.`}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="max-sm:hidden">
            <p className="text-[1.15rem] font-semibold">
              {limit === null ? `${used} used today` : `${used} of ${limit} used today`}
            </p>
            <p className="mt-0.5 text-ink-soft">
              {limit === null
                ? "Your plan has no daily limit."
                : used >= limit
                  ? "All used. They start again at midnight."
                  : `They start again at midnight${team ? ", shared by your team" : ""}.`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-0">
            <Stat
              icon={Lightning}
              tone="bg-amber-tint text-amber-deep"
              label="Last 30 days"
              value={String(team ? mine30 : total30)}
              note={team ? `by you, of ${total30} in your team` : "AI updates"}
            />
            <Stat
              icon={CalendarCheck}
              tone="bg-teal/[0.12] text-teal-deep"
              label="Busiest day"
              value={busiest.mine + busiest.others > 0 ? String(busiest.mine + busiest.others) : "–"}
              note={busiest.mine + busiest.others > 0 ? dayLabel(busiest.day, true) : "No updates yet"}
            />
            <Stat
              icon={Microphone}
              tone="bg-teal/[0.12] text-teal-deep"
              label="Dictated"
              note="this month"
              value={duration(dictationSeconds)}
            />
          </div>
        </div>
      </div>

      <DailyBars days={days} limit={limit} team={team} />
    </div>
  );
}
