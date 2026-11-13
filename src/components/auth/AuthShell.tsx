import { Check } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ThemeToggle } from "@/components/landing/ThemeToggle";

const REASONS = [
  "Speak only the abnormal findings",
  "Every line checked against your words",
  "Pasted into PACS, not retyped",
];

/** Shared frame for sign-in, invite and password screens. */
export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="landing flex min-h-[100dvh] flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[76rem] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-[1.35rem] font-bold tracking-[-0.04em]">
          Lumen<span className="text-teal">AI</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[76rem] flex-1 items-center gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-2 lg:gap-10">
        <div className="mx-auto w-full max-w-[26rem] py-6">
          <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-soft">{lead}</p>
          <div className="mt-9">{children}</div>
          {footer && <p className="mt-8 text-[0.95rem] text-ink-soft">{footer}</p>}
        </div>

        {/* Brand panel: shown beside the form on wide screens only. */}
        <aside className="on-night glow-up hidden min-h-[34rem] flex-col justify-between rounded-[40px] bg-night p-12 text-on-night lg:flex">
          <p className="max-w-[14ch] text-balance text-[2.6rem] font-semibold leading-[1.1] tracking-[-0.03em]">
            Dictate the abnormal. Get the finished report.
          </p>
          <ul className="flex flex-col gap-4 text-[1.05rem]">
            {REASONS.map((reason) => (
              <li key={reason} className="flex items-center gap-3.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-glow text-[#08302d]">
                  <Check weight="bold" className="h-3.5 w-3.5" />
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

export const authLinkClass =
  "font-semibold text-ink underline decoration-teal transition-colors hover:text-teal";
