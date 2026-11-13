/** Small shared pieces for signed-in screens. Controls are pills, panels are 24px. */

export const PANEL = "rounded-3xl border border-ink/[0.1] bg-surface";

const BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[0.92rem] font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";

export const buttonClass = {
  primary: `${BUTTON} bg-btn text-btn-text hover:bg-teal-deep`,
  secondary: `${BUTTON} border border-ink/25 hover:border-ink/50 hover:bg-ink/[0.04]`,
  danger: `${BUTTON} border border-flag/40 text-flag hover:bg-flag/10`,
  quiet: `${BUTTON} px-3 text-ink-soft hover:bg-ink/[0.06] hover:text-ink`,
};

export const selectClass =
  "h-10 rounded-full border border-ink/25 bg-surface pl-4 pr-9 text-[0.92rem] font-semibold text-ink outline-none transition-colors hover:border-ink/45 focus:border-teal disabled:opacity-50";

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
    neutral: "border-ink/15 bg-ink/[0.04] text-ink-soft",
    teal: "border-teal/25 bg-teal/[0.09] text-teal-deep",
    amber: "border-amber/30 bg-amber/[0.14] text-amber-deep",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.8rem] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-ink/20 px-6 py-12 text-center">
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
