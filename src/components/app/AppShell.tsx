"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowsLeftRight,
  Buildings,
  CalendarCheck,
  ChartBar,
  ChartLineUp,
  CaretUpDown,
  ChatCircleText,
  CreditCard,
  Files,
  FolderOpen,
  GearSix,
  AppWindow,
  Gift,
  LinkSimple,
  LockSimple,
  Plus,
  Moon,
  NotePencil,
  SidebarSimple,
  SignOut,
  Sun,
  UsersThree,
  type Icon,
  Sparkle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Spinner } from "@/components/Spinner";
import { SendFeedback } from "@/components/report/SendFeedback";
import { Tip, TipProvider } from "@/components/Tip";
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
    { href: "/insights", label: "Insights", icon: ChartLineUp },
    { href: "/referrals", label: "Referrals", icon: Gift },
    { href: "/settings", label: "Settings", icon: GearSix },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: ChartBar, exact: true },
    { href: "/admin/demo-requests", label: "Demo requests", icon: CalendarCheck },
    { href: "/admin/accounts", label: "Accounts", icon: Buildings },
    { href: "/admin/referrals", label: "Referrals", icon: Gift },
    { href: "/admin/preview-links", label: "Preview links", icon: LinkSimple },
    { href: "/admin/feedback", label: "Feedback", icon: ChatCircleText },
    { href: "/admin/screens", label: "Screens", icon: AppWindow },
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
      {NAV[area].flatMap((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? item.label : undefined}
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
        // Folded to icons, each link names itself on pointing.
        const entry = compact ? (
          <Tip key={item.href} label={item.label} side="right">
            {link}
          </Tip>
        ) : (
          link
        );
        // Doctors can send feedback from any screen: it sits just above Settings.
        // Not a screen of its own, so it opens a form and is never the current item.
        if (area !== "doctor" || item.href !== "/settings") return [entry];
        return [
          <SendFeedback
            key="send-feedback"
            tip={compact ? "right" : false}
            className={`flex h-11 items-center gap-3 rounded-full text-[1rem] font-semibold text-ink-soft transition-colors hover:bg-ink/[0.08] hover:text-ink ${
              compact ? "w-11 justify-center" : "px-3"
            }`}
          >
            <ChatCircleText className="h-5 w-5 shrink-0" />
            <span className={compact ? "sr-only" : undefined}>Send feedback</span>
          </SendFeedback>,
          entry,
        ];
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

function UserMenu({
  user,
  area,
  compact = false,
  below = false,
}: {
  user: ShellUser;
  area: Area;
  compact?: boolean;
  /** Opens downwards, for the avatar in the phone's top bar. */
  below?: boolean;
}) {
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
        <Dialog.Popup className="app-layer sheet fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none sm:p-8">
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
        aria-label={compact ? `Account: ${user.name}` : undefined}
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
        <Menu.Positioner side={below ? "bottom" : "top"} align={below ? "end" : "start"} sideOffset={8} className="z-50">
          <Menu.Popup className="app-layer w-60 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
            <p className="truncate px-3 pb-2 pt-1.5 text-[0.85rem] text-ink-soft">{user.email}</p>
            {area === "doctor" && (
              <>
                <Menu.Item className={MENU_ITEM} onClick={() => router.push("/settings")}>
                  <GearSix className="h-5 w-5" />
                  Settings
                </Menu.Item>
                {/* On a phone Plans has no tab of its own; it is here. */}
                <Menu.Item className={MENU_ITEM} onClick={() => router.push("/plans")}>
                  <CreditCard className="h-5 w-5" />
                  Plans
                </Menu.Item>
              </>
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

/** The current screen's name, for the phone's top bar. */
function useScreenTitle(area: Area) {
  const pathname = usePathname();
  const item = [...NAV[area]]
    .sort((a, b) => b.href.length - a.href.length)
    .find((nav) => (nav.exact ? pathname === nav.href : pathname === nav.href || pathname.startsWith(`${nav.href}/`)));
  return item?.label ?? "";
}

/**
 * The phone's top bar, as in an app: the brand and the account at rest; once
 * the page's own large title scrolls away, the screen's name takes its place.
 */
function MobileTopBar({ user, area }: { user: ShellUser; area: Area }) {
  const title = useScreenTitle(area);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-3 bg-surface/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[border-color] lg:hidden ${
        scrolled ? "border-b border-line" : "border-b border-transparent"
      }`}
    >
      <span className="relative min-w-0 flex-1">
        <span className={`block transition-opacity duration-200 ${scrolled ? "opacity-0" : "opacity-100"}`}>
          <Wordmark area={area} />
        </span>
        <span
          aria-hidden={!scrolled}
          className={`absolute inset-y-0 left-0 flex items-center truncate text-[1.05rem] font-semibold transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      </span>
      <UserMenu user={user} area={area} compact below />
    </header>
  );
}

/**
 * Writing a report or a template takes the whole screen on a phone, like a
 * compose screen; the tabs step aside there.
 */
function isReportScreen(pathname: string) {
  return (
    pathname === "/report" ||
    pathname.startsWith("/report/") ||
    /^\/reports\/[^/]+/.test(pathname) ||
    /^\/templates\/[^/]+/.test(pathname)
  );
}

// The doctor's tabs on a phone: New report in the middle, raised, as the main
// action; Plans is in the account menu.
const DOCTOR_TABS = ["/reports", "/templates", "/report", "/team", "/settings"];

/**
 * The on-screen keyboard covers the bottom of a phone screen without telling
 * the page. This measures it, as --kb (how far it reaches up) and --vvh (the
 * height still visible), so docked boxes and sheets can sit just above it.
 */
function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      // Small differences are the browser's own bars moving, not a keyboard.
      root.style.setProperty("--kb", `${covered > 80 ? covered : 0}px`);
      root.style.setProperty("--vvh", `${viewport.height}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.style.removeProperty("--vvh");
    };
  }, []);
}

/** The phone's bottom tab bar: every screen one thumb-tap away. */
function BottomTabs({ area, locked }: { area: Area; locked?: boolean }) {
  const pathname = usePathname();
  const items =
    area === "doctor"
      ? DOCTOR_TABS.map((href) => NAV.doctor.find((item) => item.href === href)!).filter(Boolean)
      : NAV[area];
  if (area === "doctor" && isReportScreen(pathname)) return null;
  return (
    <nav
      aria-label={area === "admin" ? "Admin" : "App"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          if (area === "doctor" && item.href === "/report") {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-label="New report"
                  className="-mt-5 flex flex-col items-center gap-1 text-[0.72rem] font-semibold text-ink transition-transform active:scale-95"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-btn text-btn-text shadow-[0_10px_24px_-8px_rgb(6_17_15/0.55)] ring-4 ring-surface">
                    <Plus weight="bold" className="h-6 w-6" />
                  </span>
                  New report
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold transition-transform active:scale-95"
              >
                <span
                  className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    active ? "bg-teal/[0.14] text-teal-deep" : "text-ink-soft"
                  }`}
                >
                  <Icon weight={active ? "fill" : "regular"} className="h-[1.35rem] w-[1.35rem]" />
                  {locked && item.href === "/report" && (
                    <LockSimple weight="fill" className="absolute right-2 top-0.5 h-3 w-3 text-amber-deep" />
                  )}
                </span>
                <span className={`max-w-full truncate px-1 ${active ? "text-ink" : "text-ink-soft"}`}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
  const compact = useCompactMenu();
  // Phones and tablets get app-style navigation: a top bar and tabs at the bottom.
  const pathname = usePathname();
  const tabsShown = !(area === "doctor" && isReportScreen(pathname));
  useKeyboardInset();

  return (
    <div data-app-style="" className="app group/app flex min-h-[100dvh] flex-1">
      <Toaster />
      <TipProvider>
      <aside
        data-app-nav=""
        className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col justify-between border-r border-line bg-surface transition-[width] duration-200 lg:flex ${
          compact ? "w-[4.25rem] items-center px-0 py-4" : "w-[12rem] p-2.5"
        }`}
      >
        <div className={compact ? "flex flex-col items-center" : undefined}>
          <div className={`flex items-center pb-6 pt-1 ${compact ? "justify-center" : "justify-between pl-2"}`}>
            {!compact && <Wordmark area={area} />}
            <Tip label={compact ? "Show the menu" : "Hide the menu"} side={compact ? "right" : "bottom"}>
              <button
                type="button"
                onClick={() => setMenuCompact(!compact)}
                aria-label={compact ? "Show the menu" : "Hide the menu"}
                aria-expanded={!compact}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-quiet transition-colors hover:bg-ink/[0.08] hover:text-ink"
              >
                <SidebarSimple weight={compact ? "fill" : "regular"} className="h-5 w-5" />
              </button>
            </Tip>
          </div>
          <NavLinks area={area} compact={compact} locked={user.locked} />
        </div>
        <UserMenu user={user} area={area} compact={compact} />
      </aside>

      <div
        // No trailing space when the tabs are hidden: a stray space made the
        // server and browser class names differ and broke hydration.
        className={
          tabsShown
            ? "flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
            : "flex min-w-0 flex-1 flex-col"
        }
      >
        <MobileTopBar user={user} area={area} />
        <BottomTabs area={area} locked={user.locked} />

        {children}
      </div>
      </TipProvider>
    </div>
  );
}
