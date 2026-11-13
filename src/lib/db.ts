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
