import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { homePath } from "@/lib/auth/rules";
import { getCurrentUser } from "@/lib/auth/session";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

export const metadata = { title: "Sign in · LumenAI" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Only an address inside this site is followed; anything else falls back to home.
  const wanted = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const user = await getCurrentUser();
  if (user) redirect(wanted ?? homePath(user.isPlatformAdmin));

  return (
    <AuthShell
      title="Sign in"
      lead="Use the email you signed up or were invited with."
      footer={
        <>
          New to LumenAI?{" "}
          <Link href="/signup" className={authLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={wanted} />
    </AuthShell>
  );
}
