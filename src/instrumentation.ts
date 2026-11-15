import type { Instrumentation } from "next";

/**
 * Failures while rendering a screen are noted for the admin dashboard.
 * Failures inside API routes are caught and noted by `handle` in
 * lib/auth/respond, which also answers the caller.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // The database client is loaded only when something has gone wrong.
  const { recordError } = await import("@/lib/monitor");
  await recordError(context.routeType === "route" ? "api" : "page", { method: request.method, path: request.path }, error);
};
