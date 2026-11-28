import Link from "next/link";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/forms";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

export const metadata = { title: "Choose a new password · Radmatic" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) {
    return (
      <AuthShell
        title="This reset link is not valid"
        lead="Ask for a new link and open it from the email."
        footer={
          <Link href="/forgot-password" className={authLinkClass}>
            Send a new reset link
          </Link>
        }
      >
        <span />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" lead="This link works once and expires in one hour.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
