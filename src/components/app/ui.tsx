import { CaretDown } from "@phosphor-icons/react/dist/ssr";

/** Small shared pieces for signed-in screens. Controls are pills, panels are 24px. */

export const PANEL = "rounded-3xl border border-ink/20 bg-surface";

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
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[60ch] text-ink-soft">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Page({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-7 px-5 py-8 sm:px-8 lg:py-10 ${
        narrow ? "max-w-3xl" : "max-w-6xl"
      }`}
    >
      {children}
    </main>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${PANEL} p-6 sm:p-8`}>
      <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{title}</h2>
      {description && <p className="mt-1 max-w-[60ch] text-[0.95rem] text-ink-soft">{description}</p>}
      <div className="mt-6">{children}</div>
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

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-ink/25 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
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
