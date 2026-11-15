"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Measures how fast screens load and react for real visitors (Core Web
 * Vitals), shown under Speed Insights in Vercel. Only the page's address is
 * sent, and its query is removed first, because a search can hold a patient's
 * name.
 */
export function SpeedMeter() {
  return <SpeedInsights beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
