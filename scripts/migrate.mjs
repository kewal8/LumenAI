// Applies db/migrations/*.sql in order, once each.
// Run: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

// Schema changes go over the direct connection: the pooled one (PgBouncer,
// transaction mode) is for the app's query traffic and can break migrations.
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Run `neon env pull` or add it to .env.local first.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const dir = new URL("../db/migrations/", import.meta.url);

try {
  await pool.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await pool.query("select name from _migrations");
  const applied = new Set(rows.map((row) => row.name));

  for (const name of readdirSync(dir).filter((file) => file.endsWith(".sql")).sort()) {
    if (applied.has(name)) {
      console.log(`skip   ${name}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(new URL(name, dir), "utf8"));
      await client.query("insert into _migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`apply  ${name}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  console.log("Database is up to date.");
} finally {
  await pool.end();
}
