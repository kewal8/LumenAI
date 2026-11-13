// Creates an invite and prints the link to send to the person.
// Run: npm run invite -- doctor@example.com [--org "Centre name"] [--admin]
//   --org    name for the organisation they will own (default: their own solo practice)
//   --admin  also make them a platform admin (can invite others). Use for yourself.
import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"));
const orgIndex = args.indexOf("--org");
const orgName = orgIndex === -1 ? null : args[orgIndex + 1];
const admin = args.includes("--admin");

if (!email || !email.includes("@")) {
  console.error('Usage: npm run invite -- doctor@example.com [--org "Centre name"] [--admin]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const existing = await sql`select 1 from users where lower(email) = lower(${email})`;
if (existing.length > 0) {
  console.error(`${email} already has an account.`);
  process.exit(1);
}

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
await sql`
  insert into invites (email, org_name, role, is_platform_admin, token_hash, expires_at)
  values (${email}, ${orgName}, 'owner', ${admin}, ${tokenHash}, now() + interval '7 days')
`;

const base = process.env.APP_URL || "http://localhost:3000";
console.log(`Invite for ${email}${admin ? " (platform admin)" : ""}, valid 7 days:`);
console.log(`${base}/accept-invite?token=${token}`);
