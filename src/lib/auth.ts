import { createHash, timingSafeEqual } from "node:crypto";

// Shared-password gate for the pilot. Everyone with the password gets the same
// session; replace with real accounts before storing anything per user.
export const SESSION_COOKIE = "lumenai_session";

function sha256(text: string) {
  return createHash("sha256").update(text).digest();
}

function sessionToken() {
  const password = process.env.APP_PASSWORD;
  return password ? sha256(`lumenai-session:${password}`).toString("hex") : null;
}

export function passwordConfigured() {
  return Boolean(process.env.APP_PASSWORD);
}

export function passwordMatches(input: string) {
  const password = process.env.APP_PASSWORD;
  return Boolean(password) && timingSafeEqual(sha256(input), sha256(password!));
}

export function newSessionToken() {
  return sessionToken();
}

export function isAuthorised(cookie: string | undefined) {
  const token = sessionToken();
  // No password set: open on a developer machine, locked everywhere else.
  if (!token) return process.env.NODE_ENV !== "production";
  return Boolean(cookie) && timingSafeEqual(sha256(cookie!), sha256(token));
}
