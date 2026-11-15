"use client";

import { CheckCircle, Warning, WarningCircle, X } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

// Feedback for every action with an outcome, the same everywhere:
// green when it worked, orange for caution or a partial result, red when it failed.

type Tone = "success" | "warning" | "error";
type Item = { id: number; tone: Tone; message: string };

let items: Item[] = [];
let next = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function show(tone: Tone, message: string) {
  const id = next++;
  // Newest last; at most three at once.
  items = [...items, { id, tone, message }].slice(-3);
  emit();
  // Errors stay a little longer so they can be read.
  setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
}

export const toast = {
  success: (message: string) => show("success", message),
  warning: (message: string) => show("warning", message),
  error: (message: string) => show("error", message),
};

const TONES: Record<Tone, { box: string; icon: React.ReactNode }> = {
  success: { box: "bg-[#0f6b47] text-white", icon: <CheckCircle weight="fill" className="h-5 w-5 shrink-0" /> },
  warning: { box: "bg-[#b4590b] text-white", icon: <Warning weight="fill" className="h-5 w-5 shrink-0" /> },
  error: { box: "bg-[#b42318] text-white", icon: <WarningCircle weight="fill" className="h-5 w-5 shrink-0" /> },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => items;
const empty: Item[] = [];

/** Where toasts appear. Placed once, in the app shell. */
export function Toaster() {
  const shown = useSyncExternalStore(subscribe, snapshot, () => empty);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-5 left-1/2 z-[70] flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0"
    >
      {shown.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-[0_14px_40px_-12px_rgb(6_17_15/0.55)] ${TONES[item.tone].box}`}
        >
          {TONES[item.tone].icon}
          <p className="min-w-0 flex-1 text-[0.95rem] font-semibold leading-snug">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Close message"
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
