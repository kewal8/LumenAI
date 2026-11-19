"use client";

import dynamic from "next/dynamic";

/**
 * The renewal reminder, fetched only when it is due (an owner, in the last
 * week of a plan). Its animation code stays off every other screen.
 */
export const RenewalPromptLazy = dynamic(
  () => import("./RenewalPrompt").then((module) => module.RenewalPrompt),
  { ssr: false },
);
