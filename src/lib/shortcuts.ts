/** Things on the report screen that can be done from the keyboard. */
export const SHORTCUT_ACTIONS = [
  { id: "dictate", label: "Start or stop speaking", fallback: "Alt+S" },
  { id: "copy", label: "Copy report", fallback: "Alt+C" },
  { id: "save", label: "Save report", fallback: "Ctrl+S" },
  { id: "print", label: "Print or PDF", fallback: "Ctrl+P" },
  { id: "new", label: "New report", fallback: "Alt+N" },
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]["id"];
export type Shortcuts = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUTS = Object.fromEntries(
  SHORTCUT_ACTIONS.map((action) => [action.id, action.fallback]),
) as Shortcuts;

// At least one of Ctrl or Alt, so a shortcut can never be a letter typed into the report.
const COMBO = /^(Ctrl\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|F[1-9]|F1[0-2]|Enter)$/;

export function isCombo(value: unknown): value is string {
  return typeof value === "string" && COMBO.test(value) && /Ctrl\+|Alt\+/.test(value);
}

/**
 * The combination a key press stands for, such as "Ctrl+Shift+S", or null
 * while only modifier keys are down or the key cannot be used.
 */
export function comboFromEvent(event: {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}) {
  // By physical key: Alt changes the character a key types on some keyboards.
  const key =
    /^Key[A-Z]$/.test(event.code) ? event.code.slice(3)
    : /^Digit[0-9]$/.test(event.code) ? event.code.slice(5)
    : /^F([1-9]|1[0-2])$/.test(event.code) || event.code === "Enter" ? event.code
    : null;
  if (!key) return null;
  const combo =
    (event.ctrlKey || event.metaKey ? "Ctrl+" : "") +
    (event.altKey ? "Alt+" : "") +
    (event.shiftKey ? "Shift+" : "") +
    key;
  return isCombo(combo) ? combo : null;
}

/** Stored or submitted shortcuts, with anything unusable or repeated replaced by its default. */
export function parseShortcuts(value: unknown): Shortcuts {
  const input = (value ?? {}) as Record<string, unknown>;
  const result = { ...DEFAULT_SHORTCUTS };
  const used = new Set<string>();
  for (const { id } of SHORTCUT_ACTIONS) {
    const combo = input[id];
    if (isCombo(combo) && !used.has(combo)) result[id] = combo;
    used.add(result[id]);
  }
  return result;
}
