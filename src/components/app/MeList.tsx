"use client";

import {
  BookOpenText,
  CaretRight,
  ChartLineUp,
  ClipboardText,
  CreditCard,
  FileText,
  Gift,
  Keyboard,
  Lightning,
  Microphone,
  Moon,
  Signature,
  SignOut,
  Sun,
  UserCircle,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useTheme } from "@/components/landing/ThemeToggle";
import { useSignOut } from "./SignOut";

type Row = { href: string; label: string; icon: Icon; tone: string };

const TEAL = "bg-teal/[0.12] text-teal-deep";
const AMBER = "bg-amber-tint text-amber-deep";
const PLAIN = "bg-ink/[0.07] text-ink";

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Reporting",
    rows: [
      { href: "/settings?tab=signature", label: "Signature", icon: Signature, tone: TEAL },
      { href: "/settings?tab=letterhead", label: "Letterhead", icon: FileText, tone: TEAL },
      { href: "/settings?tab=format", label: "Paste format", icon: ClipboardText, tone: TEAL },
      { href: "/settings?tab=dictation", label: "Dictation", icon: Microphone, tone: TEAL },
      { href: "/settings?tab=macros", label: "Macros", icon: Lightning, tone: AMBER },
      { href: "/settings?tab=dictionary", label: "Dictionary", icon: BookOpenText, tone: AMBER },
      { href: "/settings?tab=shortcuts", label: "Shortcuts", icon: Keyboard, tone: PLAIN },
    ],
  },
  {
    title: "Practice",
    rows: [
      { href: "/insights", label: "Insights", icon: ChartLineUp, tone: TEAL },
      { href: "/team", label: "Team", icon: UsersThree, tone: TEAL },
      { href: "/plans", label: "Plans", icon: CreditCard, tone: TEAL },
      { href: "/referrals", label: "Referrals", icon: Gift, tone: AMBER },
    ],
  },
];

function initials(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** The rows of the Me tab: a phone's Settings app, in LumenAI's colours. */
export function MeList({ name, email, summary }: { name: string; email: string; summary: string }) {
  const { theme, toggle } = useTheme();
  const signOut = useSignOut();
  const row = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-ink/[0.05]";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-10 pt-2">
      {signOut.dialog}
      <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">Me</h1>

      <Link href="/settings" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-ink/[0.04]">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-[1.1rem] font-bold text-btn-text">
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.1rem] font-semibold">{name}</span>
          <span className="block truncate text-[0.9rem] text-ink-soft">{summary}</span>
          <span className="block truncate text-[0.85rem] text-ink-quiet">{email}</span>
        </span>
        <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-ink-quiet" />
      </Link>

      {GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`me-${group.title}`}>
          <h2 id={`me-${group.title}`} className="px-4 pb-2 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-ink-quiet">
            {group.title}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {group.rows.map(({ href, label, icon: RowIcon, tone }) => (
              <li key={href} className="border-b border-line last:border-b-0">
                <Link href={href} className={row}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <RowIcon weight="fill" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 text-[1rem]">{label}</span>
                  <CaretRight weight="bold" className="h-4 w-4 text-ink-quiet" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        <li className="border-b border-line">
          <Link href="/settings" className={row}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${PLAIN}`}>
              <UserCircle weight="fill" className="h-[18px] w-[18px]" />
            </span>
            <span className="flex-1 text-[1rem]">Profile and password</span>
            <CaretRight weight="bold" className="h-4 w-4 text-ink-quiet" />
          </Link>
        </li>
        <li>
          <button type="button" onClick={toggle} className={row}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${PLAIN}`}>
              {theme === "dark" ? <Sun weight="fill" className="h-[18px] w-[18px]" /> : <Moon weight="fill" className="h-[18px] w-[18px]" />}
            </span>
            <span className="flex-1 text-[1rem]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </li>
      </ul>

      <button
        type="button"
        onClick={signOut.ask}
        className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 font-semibold text-flag transition-colors active:bg-flag/[0.06]"
      >
        <SignOut weight="bold" className="h-5 w-5" />
        Sign out
      </button>
    </main>
  );
}
