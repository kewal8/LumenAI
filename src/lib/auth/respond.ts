import { DatabaseNotConfiguredError } from "@/lib/db";

export function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Wraps an auth route so a missing database gives a clear message instead of a crash. */
export function handle(run: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await run(request);
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        return fail(503, "The database is not connected yet.");
      }
      console.error(error);
      return fail(500, "Something went wrong on our side. Try again.");
    }
  };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
