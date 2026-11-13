import Link from "next/link";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { AcceptInviteForm } from "@/components/auth/forms";
import { hashToken } from "@/lib/auth/crypto";
import { DatabaseNotConfiguredError, db } from "@/lib/db";

// Reads the session on every request, so this route is rendered on demand
// rather than prerendered.
export const instant = false;

export const metadata = { title: "Accept invitation · LumenAI" };

async function findInvite(token: string) {
  try {
    const [invite] = await db()`
      select i.email, coalesce(o.name, i.org_name) as org_name
      from invites i left join organizations o on o.id = i.org_id
      where i.token_hash = ${hashToken(token)} and i.accepted_at is null and i.expires_at > now()
    `;
    return invite as { email: string; org_name: string | null } | undefined;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return undefined;
    throw error;
  }
}

export default async function AcceptInvitePage({ searchParams }: PageProps<"/accept-invite">) {
  const { token } = await searchParams;
  const invite = typeof token === "string" ? await findInvite(token) : undefined;

  if (!invite || typeof token !== "string") {
    return (
      <AuthShell
        title="This invitation is no longer valid"
        lead="The link has expired or was already used. Ask the person who invited you for a new one."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className={authLinkClass}>
              Sign in
            </Link>
          </>
        }
      >
        <span />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set up your account"
      lead={
        invite.org_name
          ? `You have been invited to ${invite.org_name} on LumenAI.`
          : "You have been invited to LumenAI."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <AcceptInviteForm token={token} email={invite.email} />
    </AuthShell>
  );
}
