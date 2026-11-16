"use client";

import { keyText, useIsMac } from "@/lib/keys";

/** A shortcut written in running text, such as "Ctrl+V", named for the reader's keyboard. */
export function KeyCombo({ combo, join }: { combo: string; join?: string }) {
  return <>{keyText(combo, useIsMac(), join)}</>;
}
