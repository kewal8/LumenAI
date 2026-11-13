// Puts a report on the clipboard in both rich and plain form, so PACS editors
// that accept formatting keep it and the rest fall back to plain text.
export async function copyReport(html: string, text: string) {
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    }),
  ]);
}
