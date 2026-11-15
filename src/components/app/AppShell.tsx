"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowsLeftRight,
  Buildings,
  CalendarCheck,
  ChartBar,
  CaretUpDown,
  CreditCard,
  Files,
  FolderOpen,
  GearSix,
  LinkSimple,
  List,
  LockSimple,
  Moon,
  NotePencil,
  SidebarSimple,
  SignOut,
  Sun,
  UsersThree,
  X,
  type Icon,
  Sparkle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Spinner } from "@/components/Spinner";
import { Toaster } from "@/components/Toast";
import { useTheme } from "@/components/landing/ThemeToggle";
import { useUpdatesLeft } from "@/lib/updatesLeft";
import { buttonClass } from "./ui";

export type ShellUser = {
  name: string;
  email: string;
  organisation: string | null;
  isPlatformAdmin: boolean;
  /** No active plan yet: the report editor is closed. */
  locked?: boolean;
  /** AI report updates left today (doctors only); null when the plan has no limit. */
  updatesLeft?: number | null;
};

export type Area = "doctor" | "admin";

type NavItem = { href: string; label: string; icon: Icon; exact?: boolean };

// Doctors write reports. LumenAI staff run the business. The two never share a menu.
const NAV: Record<Area, NavItem[]> = {
  doctor: [
    { href: "/report", label: "New report", icon: NotePencil, exact: true },
    { href: "/reports", label: "Reports", icon: FolderOpen },
    { href: "/templates", label: "Templates", icon: Files },
    { href: "/team", label: "Team", icon: UsersThree },
    { href: "/plans", label: "Plans", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: GearSix },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: ChartBar, exact: true },
    { href: "/admin/demo-requests", label: "Demo requests", icon: CalendarCheck },
    { href: "/admin/accounts", label: "Accounts", icon: Buildings },
    { href: "/admin/preview-links", label: "Preview links", icon: LinkSimple },
  ],
};

// Whether the side menu is folded down to icons. A comfort setting, kept on
// this computer only.
const MENU_KEY = "lumenai-menu";
const menuListeners = new Set<() => void>();

function menuIsCompact() {
  try {
    return localStorage.getItem(MENU_KEY) === "compact";
  } catch {
    return false;
  }
}

function setMenuCompact(compact: boolean) {
  try {
    localStorage.setItem(MENU_KEY, compact ? "compact" : "full");
  } catch {
    // Not remembered next time.
  }
  menuListeners.forEach((listener) => listener());
}

function useCompactMenu() {
  return useSyncExternalStore(
    (listener) => {
      menuListeners.add(listener);
      return () => menuListeners.delete(listener);
    },
    menuIsCompact,
    () => false,
  );
}

function initials(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Wordmark({ area }: { area: Area }) {
  return (
    <Link
      href={NAV[area][0].href}
      className="flex items-center gap-2 text-[1.2rem] font-bold tracking-[-0.04em]"
    >
      <span>
        Lumen<span className="text-teal">AI</span>
      </span>
      {area === "admin" && (
        <span className="rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-bold tracking-normal text-surface">
          Admin
        </span>
      )}
    </Link>
  );
}

function NavLinks({
  area,
  onNavigate,
  compact = false,
  locked = false,
}: {
  area: Area;
  onNavigate?: () => void;
  /** Icons only, for the folded side menu. */
  compact?: boolean;
  /** Marks the report editor as closed until a plan is active. */
  locked?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={area === "admin" ? "Admin" : "App"} className="flex flex-col gap-1">
      {NAV[area].map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={compact ? item.label : undefined}
            // The current screen is a solid black pill; the others are quieter,
            // so one glance shows where you are. Teal is kept for actions.
            className={`relative flex h-11 items-center gap-3 rounded-full text-[1rem] transition-colors ${
              compact ? "w-11 justify-center" : "px-3"
            } ${
              active
                ? "bg-ink font-bold text-surface"
                : "font-semibold text-ink-soft hover:bg-ink/[0.08] hover:text-ink"
            }`}
          >
            <item.icon weight={active ? "fill" : "regular"} className="h-5 w-5 shrink-0" />
            <span className={compact ? "sr-only" : undefined}>{item.label}</span>
            {locked && item.href === "/report" && (
              <LockSimple
                weight="fill"
                aria-label="Locked until your plan is active"
                className={`h-4 w-4 shrink-0 text-amber-deep ${compact ? "absolute right-0.5 top-0.5 h-3.5 w-3.5" : "ml-auto"}`}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const MENU_ITEM =
  "flex h-10 cursor-pointer select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10";

/** AI report updates left today, kept quiet under the doctor's name. */
function UpdatesLeft({ fromServer }: { fromServer: number | null }) {
  const left = useUpdatesLeft(fromServer);
  // The pilot has no daily limit yet, so a stand-in number shows.
  const shown = left ?? 999;
  return (
    <span
      title={`${shown} AI report updates left today`}
      className={`flex items-center gap-1 truncate text-[0.82rem] font-semibold tabular-nums ${
        left !== null && left <= 10 ? "text-amber-deep" : "text-ink-soft"
      }`}
    >
      <Sparkle weight="fill" className="h-3.5 w-3.5 shrink-0 text-teal" />
      {shown}
    </span>
  );
}

function UserMenu({ user, area, compact = false }: { user: ShellUser; area: Area; compact?: boolean }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  // Signing out ends the session on this device, so it asks first.
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
    <Dialog.Root open={confirmSignOut} onOpenChange={(open) => !signingOut && setConfirmSignOut(open)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#0f2624]/40" />
        <Dialog.Popup className="app-layer fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none sm:p-8">
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Sign out?</Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-soft">
            You will need your email and password to sign in again. A report that is not saved will be lost.
          </Dialog.Description>
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={signOut} disabled={signingOut} className={buttonClass.primary}>
              {signingOut && <Spinner />}
              {signingOut ? "Signing out" : "Sign out"}
            </button>
            <Dialog.Close className={buttonClass.secondary} disabled={signingOut}>
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <Menu.Root>
      <Menu.Trigger
        title={compact ? user.name : undefined}
        className={`flex items-center gap-3 rounded-2xl text-left outline-none transition-colors hover:bg-ink/10 data-[popup-open]:bg-ink/10 ${
          compact ? "p-1" : "w-full p-2"
        }`}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-[0.85rem] font-bold text-btn-text">
          {initials(user.name)}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[0.95rem] font-bold text-ink">{user.name}</span>
              {area === "doctor" ? (
                <UpdatesLeft fromServer={user.updatesLeft ?? null} />
              ) : (
                <span className="t-meta block truncate">{user.organisation ?? user.email}</span>
              )}
            </span>
            <CaretUpDown weight="bold" className="h-4 w-4 shrink-0 text-ink-quiet" />
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="app-layer w-60 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
            <p className="truncate px-3 pb-2 pt-1.5 text-[0.85rem] text-ink-soft">{user.email}</p>
            {area === "doctor" && (
              <Menu.Item className={MENU_ITEM} onClick={() => router.push("/settings")}>
                <GearSix className="h-5 w-5" />
                Settings
              </Menu.Item>
            )}
            {/* Staff can step into the doctor's workspace to try the product, and back. */}
            {user.isPlatformAdmin && (
              <Menu.Item
                className={MENU_ITEM}
                onClick={() => router.push(area === "admin" ? "/report" : "/admin")}
              >
                <ArrowsLeftRight className="h-5 w-5" />
                {area === "admin" ? "Doctor workspace" : "Admin panel"}
              </Menu.Item>
            )}
            <Menu.Item className={MENU_ITEM} closeOnClick={false} onClick={toggle}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Menu.Item>
            <Menu.Separator className="mx-2 my-1.5 h-px bg-line" />
            <Menu.Item className={MENU_ITEM} onClick={() => setConfirmSignOut(true)}>
              <SignOut className="h-5 w-5" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    </>
  );
}

export function AppShell({
  user,
  area,
  children,
}: {
  user: ShellUser;
  area: Area;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const compact = useCompactMenu();

  return (
    <div className="app flex min-h-[100dvh] flex-1">
      <Toaster />
      <aside
        data-app-nav=""
        className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col justify-between border-r border-line bg-surface transition-[width] duration-200 lg:flex ${
          compact ? "w-[4.25rem] items-center px-0 py-4" : "w-[12rem] p-2.5"
        }`}
      >
        <div className={compact ? "flex flex-col items-center" : undefined}>
          <div className={`flex items-center pb-6 pt-1 ${compact ? "justify-center" : "justify-between pl-2"}`}>
            {!compact && <Wordmark area={area} />}
            <button
              type="button"
              onClick={() => setMenuCompact(!compact)}
              aria-label={compact ? "Show the menu" : "Hide the menu"}
              aria-expanded={!compact}
              title={compact ? "Show the menu" : "Hide the menu, for more room"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-quiet transition-colors hover:bg-ink/[0.08] hover:text-ink"
            >
              <SidebarSimple weight={compact ? "fill" : "regular"} className="h-5 w-5" />
            </button>
          </div>
          <NavLinks area={area} compact={compact} locked={user.locked} />
        </div>
        <UserMenu user={user} area={area} compact={compact} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Wordmark area={area} />
          <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
            <Dialog.Trigger
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/10"
            >
              <List className="h-6 w-6" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#0f2624]/40" />
              <Dialog.Popup className="app-layer fixed inset-y-0 right-0 z-50 flex w-[min(20rem,88vw)] flex-col justify-between bg-surface p-4 outline-none">
                <div>
                  <div className="flex items-center justify-between pb-6 pl-3">
                    <Dialog.Title className="text-[1.05rem] font-semibold">Menu</Dialog.Title>
                    <Dialog.Close
                      aria-label="Close menu"
                      className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/10"
                    >
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <NavLinks area={area} onNavigate={() => setNavOpen(false)} locked={user.locked} />
                </div>
                <UserMenu user={user} area={area} />
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        {children}
      </div>
    </div>
  );
}
