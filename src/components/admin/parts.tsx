import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { PANEL } from "@/components/app/ui";

export function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function minutes(seconds: number) {
  const total = Math.round(seconds / 60);
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
}

/** A large figure whose less important part (cents, a unit) is set quieter. */
export function Figure({ main, rest, size = "lg" }: { main: string; rest?: string; size?: "lg" | "xl" }) {
  return (
    <p
      className={`font-bold leading-none tracking-[-0.03em] tabular-nums ${
        size === "xl" ? "text-[2.75rem]" : "text-[2.4rem]"
      }`}
    >
      {main}
      {rest && <span className="text-[0.6em] text-ink-quiet">{rest}</span>}
    </p>
  );
}

/** Splits dollars from cents for `Figure`. */
export function dollars(value: number | null): { main: string; rest?: string } {
  if (value === null) return { main: "Not set" };
  const [whole, cents] = value.toFixed(2).split(".");
  return { main: `$${Number(whole).toLocaleString("en-US")}`, rest: `.${cents}` };
}

/** Title row of a tile, with a round arrow link when the tile leads somewhere. */
export function TileHeader({ title, href, children }: { title: string; href?: string; children?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <h2 className="text-[1.08rem] font-semibold tracking-[-0.01em]">{title}</h2>
      {children}
      {href && (
        <Link
          href={href}
          aria-label={`Open ${title}`}
          className="-mr-1 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/[0.07] text-ink transition-colors hover:bg-ink hover:text-surface"
        >
          <ArrowUpRight weight="bold" className="h-4 w-4" />
        </Link>
      )}
    </header>
  );
}

/** One headline number: title, figure, then a ruled line of context. */
export function StatTile({
  title,
  figure,
  detail,
  href,
}: {
  title: string;
  figure: { main: string; rest?: string };
  detail: string;
  href?: string;
}) {
  return (
    <article className={`${PANEL} flex flex-col p-6`}>
      <TileHeader title={title} href={href} />
      <div className="mt-3">
        <Figure {...figure} />
      </div>
      <p className="mt-5 border-t border-line pt-3.5 text-[0.92rem] font-semibold text-ink-soft">{detail}</p>
    </article>
  );
}

/** Label and value on one line. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-[0.95rem] text-ink-soft">{label}</dt>
      <dd className="text-[1.02rem] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

const HATCH =
  "repeating-linear-gradient(135deg, rgb(127 140 138 / 0.28) 0 2px, transparent 2px 7px)";

const shortDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * Daily counts as rounded bars in one hue. The busiest day is solid, the rest
 * are hatched, and a dashed line marks the average. Each bar has a hover label;
 * the same numbers are in a table for screen readers.
 */
export function DailyBars({ data, unit }: { data: { day: string; value: number }[]; unit: string }) {
  const peak = Math.max(...data.map((point) => point.value));
  const max = Math.max(1, peak);
  const average = data.reduce((sum, point) => sum + point.value, 0) / data.length;
  const peakIndex = peak > 0 ? data.findIndex((point) => point.value === peak) : -1;

  return (
    <figure>
      <div aria-hidden="true" className="relative h-52">
        {average > 0 && (
          <div
            className="absolute inset-x-0 z-10 border-t-2 border-dashed border-ink/45"
            style={{ bottom: `${(average / max) * 100}%` }}
          >
            <span className="absolute -top-3 left-0 rounded-full bg-ink px-2.5 py-0.5 text-[0.78rem] font-bold text-surface">
              Avg {average.toFixed(1)}
            </span>
          </div>
        )}
        <div className="flex h-full items-end gap-[6px] border-b border-ink/30">
          {data.map((point, index) => (
            <div key={point.day} className="group relative flex h-full flex-1 items-end">
              <span
                className={`block w-full rounded-t-xl transition-opacity group-hover:opacity-80 ${
                  index === peakIndex ? "bg-teal" : ""
                }`}
                style={{
                  height: point.value === 0 ? "3px" : `${Math.max(6, (point.value / max) * 100)}%`,
                  backgroundImage: index === peakIndex ? undefined : HATCH,
                  backgroundColor: index === peakIndex ? undefined : "rgb(127 140 138 / 0.14)",
                }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[0.82rem] font-semibold text-surface group-hover:block">
                {shortDate(point.day)}: {point.value} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2.5 flex gap-[6px] text-center text-[0.8rem] font-semibold text-ink-soft">
        {data.map((point, index) => (
          <span key={point.day} className="flex-1 truncate">
            {index % 2 === 1 || index === data.length - 1 ? new Date(`${point.day}T00:00:00`).getDate() : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{unit} per day</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <th scope="row">{shortDate(point.day)}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** A share of a whole drawn as a half ring, with the figure in the middle. */
export function Gauge({ part, whole, caption }: { part: number; whole: number; caption: string }) {
  const share = whole > 0 ? Math.min(1, part / whole) : 0;
  const length = Math.PI * 80;
  return (
    <figure className="flex flex-col items-center">
      <div className="relative w-full max-w-[17rem]">
        <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`${Math.round(share * 100)}%: ${caption}`}>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            strokeWidth="20"
            strokeLinecap="round"
            className="stroke-ink/[0.12]"
          />
          {share > 0 && (
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${share * length} ${length}`}
              className="stroke-teal"
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-[2.4rem] font-bold leading-none tracking-[-0.03em] tabular-nums">
            {Math.round(share * 100)}
            <span className="text-[0.6em] text-ink-quiet">%</span>
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[0.92rem] font-semibold text-ink-soft">{caption}</figcaption>
    </figure>
  );
}

/** Filled dots out of a total: how many of a group did something. */
export function DotMatrix({ filled, total }: { filled: number; total: number }) {
  // Past 60 the dots stand for groups, so the grid keeps its shape.
  const scale = total > 60 ? total / 60 : 1;
  const dots = Math.max(1, Math.round(total / scale));
  const on = Math.round(filled / scale);
  return (
    <div aria-hidden="true" className="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1.5">
      {Array.from({ length: dots }, (_, index) => (
        <span
          key={index}
          className={`aspect-square rounded-full ${index < on ? "bg-teal" : "bg-ink/[0.13]"}`}
        />
      ))}
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BLOCKS = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];

/** When work happens: weekday by time of day, darker meaning more. One hue. */
export function WeekHeatmap({ cells }: { cells: { weekday: number; block: number; updates: number }[] }) {
  const max = Math.max(1, ...cells.map((cell) => cell.updates));
  const at = (weekday: number, block: number) =>
    cells.find((cell) => cell.weekday === weekday && cell.block === block)?.updates ?? 0;

  return (
    <table className="w-full border-separate border-spacing-1.5 text-[0.8rem] font-semibold text-ink-soft">
      <caption className="sr-only">Report updates by weekday and time of day</caption>
      <thead>
        <tr>
          <td />
          {BLOCKS.map((block) => (
            <th key={block} scope="col" className="pb-0.5 font-semibold">
              {block}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DAYS.map((day, index) => (
          <tr key={day}>
            <th scope="row" className="pr-1 text-left font-semibold">
              {day}
            </th>
            {BLOCKS.map((block, column) => {
              const value = at(index + 1, column);
              return (
                <td key={block} className="p-0">
                  <span
                    title={`${day} from ${block}: ${value} updates`}
                    className="block h-7 rounded-lg bg-teal"
                    style={value === 0 ? { backgroundColor: "rgb(127 140 138 / 0.14)" } : { opacity: 0.25 + 0.75 * (value / max) }}
                  >
                    <span className="sr-only">{value}</span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
