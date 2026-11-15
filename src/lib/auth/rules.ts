export const MIN_PASSWORD_LENGTH = 10;

export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "Use at most 200 characters.";
  return null;
}

export function normaliseEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

/** An Indian mobile number as 10 digits, from what was typed ("+91 98765 43210"), or null. */
export function normalisePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s()-]/g, "").replace(/^(\+91|0091|0)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Only same-site paths are followed after sign-in, never an outside address. */
export function safeNextPath(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/report";
}

/** Where someone lands after signing in: LumenAI staff in the admin panel, doctors in the workspace. */
export function homePath(isPlatformAdmin: boolean) {
  return isPlatformAdmin ? "/admin" : "/report";
}
