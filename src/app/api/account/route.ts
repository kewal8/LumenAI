import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import {
  LETTERHEAD_IMAGE_LIMIT,
  SIGNATURE_IMAGE_LIMIT,
  SIGNATURE_TEXT_LIMIT,
  getIdentity,
  parseImage,
  saveIdentity,
} from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";

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

  if (body.shortcuts !== undefined) {
    const shortcuts = JSON.stringify(parseShortcuts(body.shortcuts));
    await sql`update users set shortcuts = ${shortcuts}::jsonb where id = ${user.id}`;
  }

  if (body.signature !== undefined || body.letterhead !== undefined) {
    const identity = { ...(await getIdentity(user.id)) };

    if (body.signature !== undefined) {
      const text = typeof body.signature?.text === "string" ? body.signature.text.trim() : "";
      if (text.length > SIGNATURE_TEXT_LIMIT) return fail(400, "That sign-off text is too long.");
      const image = parseImage(body.signature?.image, SIGNATURE_IMAGE_LIMIT);
      if (image && typeof image === "object") return fail(400, image.error);
      identity.signatureText = text;
      identity.signatureImage = image;
    }

    if (body.letterhead !== undefined) {
      const header = parseImage(body.letterhead?.header, LETTERHEAD_IMAGE_LIMIT);
      if (header && typeof header === "object") return fail(400, header.error);
      const footer = parseImage(body.letterhead?.footer, LETTERHEAD_IMAGE_LIMIT);
      if (footer && typeof footer === "object") return fail(400, footer.error);
      identity.headerImage = header;
      identity.footerImage = footer;
      identity.letterheadEnabled = body.letterhead?.enabled === true && Boolean(header || footer);
    }

    await saveIdentity(user.id, identity);
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
