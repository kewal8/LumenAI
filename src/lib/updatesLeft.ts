"use client";

import { useSyncExternalStore } from "react";

/**
 * AI report updates left today, shared between the report screen (which uses
 * them) and the account menu (which shows them), so the count moves as soon as
 * one is used, without reloading the page. Null on the pilot, which has no limit.
 */
let current: number | null | undefined;
const listeners = new Set<() => void>();

export function setUpdatesLeft(value: number | null) {
  if (value === current) return;
  current = value;
  listeners.forEach((listener) => listener());
}

/** The latest count, or what the server sent with the page until something changes it. */
export function useUpdatesLeft(fromServer: number | null) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (current === undefined ? fromServer : current),
    () => fromServer,
  );
}
