import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { requireUser } from "@/lib/auth/session";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

// Everything in this group needs a signed-in user.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <header className="landing flex-none border-b border-line !bg-surface !bg-none">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/report" className="text-[1.2rem] font-bold tracking-[-0.04em]">
            Lumen<span className="text-teal">AI</span>
          </Link>
          <div className="flex items-center gap-4 text-[0.95rem]">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block font-semibold">{user.name}</span>
              {user.org && <span className="block text-ink-soft">{user.org.name}</span>}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
