import { unstable_rethrow } from "next/navigation";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { pathOf, recordError } from "@/lib/monitor";
import { getCurrentUser, type CurrentUser } from "./session";

export function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Wraps an auth route so a missing database gives a clear message instead of a crash. */
export function handle<Context = unknown>(
  run: (request: Request, context: Context) => Promise<Response>,
) {
  return async (request: Request, context: Context) => {
    try {
      return await run(request, context);
    } catch (error) {
      // Next.js signals some things by throwing (a route that must run per
      // request, a redirect). Those are its own to handle, not faults.
      unstable_rethrow(error);
      // A body that is missing or not JSON is the caller's mistake, not ours.
      if (error instanceof SyntaxError) return fail(400, "The request could not be read.");
      if (error instanceof DatabaseNotConfiguredError) {
        return fail(503, "The database is not connected yet.");
      }
      console.error(error);
      // Shown on the admin dashboard, so a fault is seen before a doctor reports it.
      await recordError("api", { method: request.method, path: pathOf(request) }, error);
      return fail(500, "Something went wrong on our side. Try again.");
    }
  };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** The signed-in user, or the 401 response to send back. */
export async function apiUser(): Promise<CurrentUser | Response> {
  return (await getCurrentUser()) ?? fail(401, "Signed out. Sign in again.");
}
