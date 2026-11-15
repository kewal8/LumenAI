import { hashToken } from "./crypto";

/** A sign-up code's stored hash. Bound to its sign-up, so a code is useless with any other one. */
export function codeHash(signupId: string, code: string) {
  return hashToken(`${signupId}:${code}`);
}
