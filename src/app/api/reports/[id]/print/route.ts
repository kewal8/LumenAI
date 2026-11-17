import { apiUser, fail, handle } from "@/lib/auth/respond";
import { db } from "@/lib/db";
import { getIdentity } from "@/lib/reportIdentity";
import { docToHtml, type DocNode } from "@/lib/reportDoc";
import { buildPrintHtml, formatReport, parsePasteProfile } from "@/lib/reportFormat";
import { findReport } from "@/lib/reportStore";

type Context = RouteContext<"/api/reports/[id]/print">;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * A saved report as the page that prints, the same as Print on the report
 * screen: letterhead and the doctor's formatting. The Reports list opens it to
 * save as PDF, named after the patient, the study and the date.
 */
export const GET = handle<Context>(async (_request, context) => {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const [saved, identity, [row]] = await Promise.all([
    findReport(user, (await context.params).id),
    getIdentity(user.id),
    db()`select paste_profile from users where id = ${user.id}`,
  ]);
  if (!saved) return fail(404, "That report no longer exists.");

  const profile = parsePasteProfile(row?.paste_profile);
  const { report, patient } = saved;
  const name = [patient?.name, patient?.study || report.title, day(saved.finalizedAt ?? saved.updatedAt)]
    .filter(Boolean)
    .join(" - ");
  const sign = { text: identity.signatureText, image: identity.signatureImage };
  const html = buildPrintHtml(
    formatReport(report),
    profile,
    sign,
    identity.letterheadEnabled ? { header: identity.headerImage, footer: identity.footerImage } : null,
    // The sign-off is printed under the report, as the report screen shows it.
    report.doc ? docToHtml(report.doc as DocNode, profile, sign) : undefined,
    name,
  );
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
});
