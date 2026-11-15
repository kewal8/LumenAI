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
  Moon,
  NotePencil,
  SignOut,
  Sun,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/landing/ThemeToggle";

export type ShellUser = {
  name: string;
  email: string;
  organisation: string | null;
  isPlatformAdmin: boolean;
};

export type Area = "doctor" | "admin";

type NavItem = { href: string; label: string; icon: Icon; exact?: boolean };

// Doctors write reports. LumenAI staff run the business. The two never share a menu.
const NAV: Record<Area, NavItem[]> = {
  doctor: [
    { href: "/report", label: "New report", icon: NotePencil },
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

function initials(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Wordmark({ area }: { area: Area }) {
  return (
    <Link
      href={NAV[area][0].href}
      className="flex items-center gap-2.5 text-[1.3rem] font-bold tracking-[-0.04em]"
    >
      <span>
        Lumen<span className="text-teal">AI</span>
      </span>
      {area === "admin" && (
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-[0.75rem] font-bold tracking-normal text-surface">
          Admin
        </span>
      )}
    </Link>
  );
}

function NavLinks({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
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
            className={`flex h-11 items-center gap-3 rounded-full px-3 text-[1rem] font-semibold transition-colors ${
              active ? "bg-teal text-white" : "text-ink hover:bg-ink/10"
            }`}
          >
            <item.icon weight={active ? "fill" : "regular"} className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const MENU_ITEM =
  "flex h-10 cursor-default select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10";

function UserMenu({ user, area }: { user: ShellUser; area: Area }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full items-center gap-3 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-ink/10 data-[popup-open]:bg-ink/10">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-[0.85rem] font-bold text-btn-text">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.95rem] font-bold">{user.name}</span>
          <span className="block truncate text-[0.85rem] text-ink-soft">
            {user.organisation ?? user.email}
          </span>
        </span>
        <CaretUpDown weight="bold" className="h-4 w-4 shrink-0 text-ink" />
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
            <Menu.Item className={MENU_ITEM} onClick={signOut}>
              <SignOut className="h-5 w-5" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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

  return (
    <div className="app flex min-h-[100dvh] flex-1">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col justify-between border-r border-line bg-surface p-4 lg:flex">
        <div>
          <div className="px-3 pb-7 pt-2">
            <Wordmark area={area} />
          </div>
          <NavLinks area={area} />
        </div>
        <UserMenu user={user} area={area} />
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
                  <NavLinks area={area} onNavigate={() => setNavOpen(false)} />
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
