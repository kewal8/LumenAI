import Link from "next/link";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Reset password · Radmatic" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lead="Enter your email and we will send a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
