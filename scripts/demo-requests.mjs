// Lists the latest demo requests. Run: npm run demo:list
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  select created_at, status, name, email, phone, designation, organisation,
         organisation_type, location, message
  from demo_requests order by created_at desc limit 50
`;

if (rows.length === 0) console.log("No demo requests yet.");
for (const row of rows) {
  console.log(
    [
      `${row.created_at.toISOString().slice(0, 16).replace("T", " ")}  [${row.status}]  ${row.name}`,
      `  ${row.email}  ${row.phone}`,
      `  ${[row.designation, row.organisation, row.organisation_type, row.location].filter(Boolean).join(" · ") || "-"}`,
      row.message ? `  "${row.message}"` : null,
      "",
    ]
      .filter((line) => line !== null)
      .join("\n"),
  );
}
