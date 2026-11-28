import { CaretRight, Heart } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "@/components/brand/Logo";

export const DEMO_URL = "/book-a-demo";

/** Page gutter and width shared by every public page. */
export const SHELL = "mx-auto w-full max-w-[76rem] px-5 sm:px-8";

export function PrimaryButton({
  children,
  href = DEMO_URL,
  size = "lg",
}: {
  children: React.ReactNode;
  href?: string;
  size?: "sm" | "lg";
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center rounded-full bg-btn font-bold text-btn-text transition-[background-color,transform] duration-200 hover:bg-teal-deep active:scale-[0.98] ${
        size === "lg" ? "gap-4 py-1.5 pl-6 pr-1.5 text-base" : "gap-3 py-1 pl-5 pr-1 text-[0.95rem]"
      }`}
    >
      {children}
      <span
        className={`grid place-items-center rounded-full bg-teal text-btn-text ${
          size === "lg" ? "h-10 w-10" : "h-8 w-8"
        }`}
      >
        <CaretRight
          weight="bold"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-ink/60 px-6 py-[0.8rem] text-base font-bold transition-[background-color,color,transform] duration-200 hover:bg-btn hover:text-btn-text active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#limits", label: "Safety" },
  { href: "/#centres", label: "For centres" },
];

/** Floating navigation shown on every public page. */
export function SiteHeader() {
  return (
    <div className={`sticky top-3 z-50 ${SHELL}`}>
      <nav
        aria-label="Main"
        className="flex items-center justify-between gap-4 rounded-full bg-surface py-2 pl-6 pr-2 shadow-[0_8px_30px_-12px_rgb(8_48_45/0.28),0_1px_3px_rgb(8_48_45/0.1)]"
      >
        <Link href="/" className="text-[1.35rem] font-bold tracking-[-0.04em]">
          <Wordmark className="h-7 w-auto" />
        </Link>
        <div className="hidden items-center gap-7 text-[0.98rem] md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-teal">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-[0.98rem] transition-colors hover:text-teal sm:inline"
          >
            Sign in
          </Link>
          <PrimaryButton size="sm">Book a demo</PrimaryButton>
        </div>
      </nav>
    </div>
  );
}

/** The flag of India: saffron, white and green, with the wheel in navy. */
function IndiaFlag() {
  return (
    <svg
      viewBox="0 0 30 20"
      role="img"
      aria-label="Flag of India"
      className="h-[1.05em] w-auto rounded-[3px] ring-1 ring-ink/15"
    >
      <rect width="30" height="20" fill="#ffffff" />
      <rect width="30" height="6.67" fill="#ff9933" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className={`${SHELL} py-14`}>
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[clamp(2.5rem,6vw,4rem)] font-bold leading-none tracking-[-0.05em]">
            <Wordmark className="h-[clamp(2.75rem,6.5vw,4.5rem)] w-auto" />
          </p>
          <p className="mt-3 text-ink-soft">Report writing for radiologists.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-[1.02rem]">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-teal">
              {link.label}
            </Link>
          ))}
          <Link href={DEMO_URL} className="transition-colors hover:text-teal">
            Book a demo
          </Link>
          <Link href="/login" className="transition-colors hover:text-teal">
            Sign in
          </Link>
        </div>
      </div>
      <p className="mt-12 text-sm text-ink-soft">
        Every report is reviewed and signed by the radiologist.
      </p>
      <p className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line pt-8 text-[0.98rem] font-semibold">
        Made with
        <Heart weight="fill" className="h-[1.1em] w-[1.1em] text-flag" aria-label="love" />
        in Bengaluru, India
        <IndiaFlag />
      </p>
    </footer>
  );
}
