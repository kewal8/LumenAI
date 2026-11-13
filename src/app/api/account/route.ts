import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";

export const PATCH = handle(async (request) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const body = await request.json();
  const sql = db();

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return fail(400, "Enter your name.");
    if (name.length > 120) return fail(400, "That name is too long.");
    await sql`update users set name = ${name} where id = ${user.id}`;
  }

  if (body.pasteProfile !== undefined) {
    const profile = JSON.stringify(parsePasteProfile(body.pasteProfile));
    await sql`update users set paste_profile = ${profile}::jsonb where id = ${user.id}`;
  }

  if (body.organisationName !== undefined) {
    if (user.org?.role !== "owner") return fail(403, "Only the owner can rename the organisation.");
    const name = typeof body.organisationName === "string" ? body.organisationName.trim() : "";
    if (!name) return fail(400, "Enter the organisation name.");
    if (name.length > 160) return fail(400, "That name is too long.");
    await sql`update organizations set name = ${name} where id = ${user.org.id}`;
  }

  return Response.json({ ok: true });
});
