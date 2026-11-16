import { useSyncExternalStore } from "react";

/*
 * Shortcuts are stored once, in Windows terms ("Ctrl+Alt+S"), and pressing ⌘
 * on a Mac counts as Ctrl. These helpers only change how a shortcut is named,
 * so each person reads the keys printed on their own keyboard.
 */

const MAC_NAMES: Record<string, string> = { Ctrl: "Cmd", Alt: "Option" };
const MAC_SYMBOLS: Record<string, string> = { Ctrl: "⌘", Alt: "⌥", Shift: "⇧" };

/** True on a Mac, iPad or iPhone, whose keyboards have ⌘ and Option. */
export function isMac() {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const noChange = () => () => {};

/** `isMac()` for rendering: Windows names on the server, then the real ones. */
export function useIsMac() {
  return useSyncExternalStore(noChange, isMac, () => false);
}

/** "Ctrl+V" as it reads on this keyboard: "Cmd+V" on a Mac. `join` sets the gap, such as " + ". */
export function keyText(combo: string, mac: boolean, join = "+") {
  return combo
    .split("+")
    .map((key) => (mac ? (MAC_NAMES[key] ?? key) : key))
    .join(join);
}

/** One label per key for drawn key caps: "⌘ Cmd", "⌥ Option", "⇧ Shift" on a Mac. */
export function keyCaps(combo: string, mac: boolean) {
  return combo.split("+").map((key) => (mac && MAC_SYMBOLS[key] ? `${MAC_SYMBOLS[key]} ${MAC_NAMES[key] ?? key}` : key));
}

/** The modifier keys a custom shortcut must use, in this keyboard's names. */
export function modifierNames(mac: boolean) {
  return mac ? "Cmd or Option" : "Ctrl or Alt";
}
