import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { DatabaseNotConfiguredError, db } from "@/lib/db";
import { hashToken, newToken } from "./crypto";

export const SESSION_COOKIE = "lumenai_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type Role = "owner" | "admin" | "radiologist";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  org: { id: string; name: string; kind: "solo" | "centre"; role: Role } | null;
};

export async function createSession(userId: string, userAgent: string | null) {
  const token = newToken();
  await db()`
    insert into sessions (user_id, token_hash, user_agent, expires_at)
    values (${userId}, ${hashToken(token)}, ${userAgent}, now() + interval '30 days')
  `;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db()`delete from sessions where token_hash = ${hashToken(token)}`;
  }
  store.delete(SESSION_COOKIE);
}

/** Hash of this request's session token, to tell it apart from the user's other sessions. */
export async function currentSessionHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** The signed-in user for this request, or null. Looked up once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let rows;
  try {
    rows = await db()`
      select u.id, u.email, u.name, u.is_platform_admin,
             o.id as org_id, o.name as org_name, o.kind as org_kind, m.role
      from sessions s
      join users u on u.id = s.user_id
      left join memberships m on m.user_id = u.id
      left join organizations o on o.id = m.org_id
      where s.token_hash = ${hashToken(token)}
        and s.expires_at > now()
        and u.disabled_at is null
      order by m.created_at
      limit 1
    `;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return null;
    throw error;
  }

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isPlatformAdmin: row.is_platform_admin,
    org: row.org_id
      ? { id: row.org_id, name: row.org_name, kind: row.org_kind, role: row.role }
      : null,
  };
});

/** For pages: sends signed-out visitors to the sign-in screen. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * For admin pages: LumenAI staff only; anyone else sees "not found". Each
 * admin page calls this before it reads any data. The layout's own check does
 * not stop a page's queries from running, and reading the session first keeps
 * the page out of the build, where there is no database.
 */
export async function requireStaff() {
  const user = await requireUser();
  if (!user.isPlatformAdmin) notFound();
  return user;
}
