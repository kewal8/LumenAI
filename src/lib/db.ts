import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set.");
  }
}

let client: NeonQueryFunction<false, false> | undefined;

// Created on first use so the app still builds and serves public pages
// before a database is connected.
export function db() {
  if (!process.env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An id from an address, for comparing with a uuid column: `id = ${asUuid(id)}::uuid`.
 * Comparing as a uuid lets the database use the column's index; comparing as
 * text (`id::text = ...`) reads every row. Anything that is not a uuid becomes
 * null, which matches nothing, so the caller answers "not found" as before.
 */
export function asUuid(value: string) {
  return UUID.test(value) ? value : null;
}
