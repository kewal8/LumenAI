import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { homePath } from "@/lib/auth/rules";
import { getCurrentUser } from "@/lib/auth/session";
import { normaliseCode } from "@/lib/referrals";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

export const metadata = { title: "Create your account · Radmatic" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { ref } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homePath(user.isPlatformAdmin));

  return (
    <AuthShell
      title="Create your account"
      lead="For radiologists. It takes a minute, and we email you a code to confirm it is you."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm referralCode={normaliseCode(Array.isArray(ref) ? ref[0] : ref)} />
    </AuthShell>
  );
}
