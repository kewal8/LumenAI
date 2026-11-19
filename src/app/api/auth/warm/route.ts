import { handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";

/**
 * Wakes the database. It sleeps after a few idle minutes, and its first query
 * then takes about a second. The sign-in page calls this as it opens, so that
 * second is spent while the doctor types a password, not after pressing Sign in.
 * Reads nothing and tells nothing.
 */
export const POST = handle(async () => {
  await db()`select 1`;
  return new Response(null, { status: 204 });
});
