// Copying needs a focused window. While the floating dictation window is in
// use, that is the focused one, so the copy has to go through it.
let floating: Window | null = null;

/** Tells the clipboard which floating window is open, or null when it closes. */
export function setFloatingWindow(win: Window | null) {
  floating = win;
}

function focusedWindow(): Window & typeof globalThis {
  const win = floating && !floating.closed && floating.document.hasFocus() ? floating : window;
  return win as Window & typeof globalThis;
}

type Part = Blob | Promise<Blob>;

/** Writes rich and plain versions to the clipboard. Parts may still be on their way. */
export function writeClipboard(html: Part, text: Part) {
  const win = focusedWindow();
  return win.navigator.clipboard.write([new win.ClipboardItem({ "text/html": html, "text/plain": text })]);
}

// Puts a report on the clipboard in both rich and plain form, so PACS editors
// that accept formatting keep it and the rest fall back to plain text.
export async function copyReport(html: string, text: string) {
  await writeClipboard(new Blob([html], { type: "text/html" }), new Blob([text], { type: "text/plain" }));
}
