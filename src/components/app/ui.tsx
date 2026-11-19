import { CaretDown } from "@phosphor-icons/react/dist/ssr";

/** Small shared pieces for signed-in screens. Controls are pills, panels are 24px. */

export const PANEL = "rounded-3xl border border-ink/20 bg-surface";

/** A pop-up and the dimmed screen behind it, the same across the app. */
export const POPUP =
  "app-layer sheet fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none sm:p-8";
export const BACKDROP = "app-backdrop fixed inset-0 z-50 bg-[#0f2624]/40";

const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-bold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export const buttonClass = {
  primary: `${BUTTON} bg-btn text-btn-text hover:bg-teal-deep`,
  secondary: `${BUTTON} border border-ink/40 text-ink hover:border-ink/60 hover:bg-ink/[0.06]`,
  danger: `${BUTTON} border border-flag/50 text-flag hover:bg-flag/10`,
  quiet: `${BUTTON} px-3 text-ink underline decoration-ink/40 underline-offset-4 hover:bg-ink/10 hover:decoration-ink`,
};

/**
 * Dropdown with our own arrow. The browser's built-in arrow differs between
 * Windows and Mac and sits too close to the edge of a pill.
 */
export function Select({ className = "", children, ...rest }: React.ComponentProps<"select">) {
  return (
    <span className="relative inline-flex max-w-full">
      <select
        {...rest}
        className={`h-11 w-full appearance-none rounded-full border border-ink/40 bg-surface pl-4 pr-11 text-[0.95rem] font-semibold text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal disabled:opacity-60 ${className}`}
      >
        {children}
      </select>
      <CaretDown
        weight="bold"
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
      />
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
  phoneAction = "float",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /**
   * On a phone: "float" lifts the main action above the tab bar; "inline" keeps
   * it where it is (for a status, not an action); "hide" when the tab bar
   * already offers the same thing.
   */
  phoneAction?: "float" | "inline" | "hide";
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[60ch] text-ink-soft">{description}</p>}
      </div>
      {/* In the app-style layout on a phone, the main action floats above the tab bar. */}
      {action && (
        <div className={phoneAction === "inline" ? "" : `${phoneAction === "hide" ? "max-lg:hidden" : ""} group-data-[app-style]/app:max-lg:fixed group-data-[app-style]/app:max-lg:right-4 group-data-[app-style]/app:max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom))] group-data-[app-style]/app:max-lg:z-30 group-data-[app-style]/app:max-lg:rounded-full group-data-[app-style]/app:max-lg:shadow-[0_12px_32px_-10px_rgb(6_17_15/0.55)]`}>
          {action}
        </div>
      )}
    </header>
  );
}

/**
 * Screens use the full width of the window, and stop growing on very large
 * displays so lines do not become too long to read.
 */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {children}
    </main>
  );
}

/** A settings block: what it is across the top, then its controls at full width. */
export function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`${PANEL} overflow-hidden`}>
      <header className="flex items-center gap-4 border-b border-line px-6 py-5 sm:px-8">
        {icon && <IconTile tone="neutral">{icon}</IconTile>}
        <div className="min-w-0">
          <h2 className="text-[1.15rem] font-semibold tracking-[-0.01em]">{title}</h2>
          {description && <p className="mt-0.5 text-[0.95rem] text-ink-soft">{description}</p>}
        </div>
      </header>
      <div className="p-6 sm:p-8">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "amber";
}) {
  const tones = {
    neutral: "border-ink/25 bg-ink/[0.06] text-ink",
    teal: "border-teal/30 bg-teal/[0.12] text-teal-deep",
    amber: "border-amber/50 bg-amber/25 text-amber-deep",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.85rem] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink/25 px-6 py-12 text-center">
      {icon && (
        <span className="mb-4">
          <IconTile tone="neutral">{icon}</IconTile>
        </span>
      )}
      <p className="text-[1.05rem] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-[0.95rem] text-ink-soft">{body}</p>
    </div>
  );
}

export function formatDate(value: string | Date | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/** Column headings above the rows of a list. Add the same columns as the rows. */
export const LIST_HEAD =
  "t-label hidden border-b border-line bg-ink/[0.04] px-6 py-3";

/** Square icon badge that anchors a card or a list row. */
export function IconTile({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  /** Neutral by default. Teal only for something that went right, amber for something waiting. */
  tone?: "teal" | "amber" | "neutral";
}) {
  const tones = {
    teal: "bg-teal/[0.14] text-teal-deep",
    amber: "bg-amber/30 text-amber-deep",
    neutral: "bg-ink/[0.08] text-ink",
  };
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Small pill for one item in a set, such as a section of a template. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-ink/[0.07] px-3 text-[0.85rem] font-semibold text-ink">
      {children}
    </span>
  );
}

/** One fact with its icon, for the footer of a card or row. */
export function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-ink-soft">
      <span className="text-ink-quiet [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </span>
  );
}

/** Round badge with a person's initials. */
export function Avatar({ name }: { name: string }) {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal text-[0.9rem] font-bold text-white">
      {initials}
    </span>
  );
}

/** "TECHNIQUE" becomes "Technique"; mixed-case text is left as typed. */
export function tidyHeading(text: string) {
  return text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text;
}
