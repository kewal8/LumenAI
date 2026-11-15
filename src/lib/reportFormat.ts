export type PasteProfile = {
  font: string;
  size: number;
  headingStyle: "bold" | "bold + underline";
  listStyle: "paragraphs" | "bullets";
};

export const PASTE_FONTS = ["Arial", "Calibri", "Times New Roman", "Verdana"];
export const PASTE_SIZES = [10, 11, 12, 14];
export const PASTE_HEADING_STYLES: PasteProfile["headingStyle"][] = ["bold", "bold + underline"];
export const PASTE_LIST_STYLES: PasteProfile["listStyle"][] = ["paragraphs", "bullets"];

// Confirmed to survive pasting into the Medsynapse report editor.
export const DEFAULT_PROFILE: PasteProfile = {
  font: "Arial",
  size: 10,
  headingStyle: "bold",
  listStyle: "paragraphs",
};

export type FormattedReport = {
  title: string;
  sections: { heading: string; lines: string[] }[];
};

/** Sign-off under a report. */
export type Signature = { text: string; image: string | null };

function signatureLines(signature?: Signature) {
  return (signature?.text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildReportHtml(
  report: FormattedReport,
  { font, size, headingStyle, listStyle }: PasteProfile = DEFAULT_PROFILE,
  signature?: Signature,
) {
  // Inline styles only: PACS editors drop <style> blocks and class names on paste.
  const base = `font-family:'${font}',sans-serif;font-size:${size}pt;color:#000;`;
  const heading =
    base +
    "font-weight:bold;" +
    (headingStyle === "bold + underline" ? "text-decoration:underline;" : "");

  const sections = report.sections
    .map(({ heading: label, lines }) => {
      const body =
        listStyle === "bullets"
          ? `<ul style="margin:0 0 8pt 0;">${lines
              .map((line) => `<li style="${base}">${escapeHtml(line)}</li>`)
              .join("")}</ul>`
          : lines
              .map(
                (line) =>
                  `<p style="${base}margin:0 0 4pt 0;">${escapeHtml(line)}</p>`,
              )
              .join("");
      return `<p style="${heading}margin:8pt 0 2pt 0;">${escapeHtml(label)}:</p>${body}`;
    })
    .join("");

  const lines = signatureLines(signature);
  // The first sign-off line is the name, so it is set bold.
  const signOff =
    (signature?.image
      ? `<p style="margin:16pt 0 2pt 0;"><img src="${signature.image}" alt="Signature" height="56" style="height:42pt;width:auto;"></p>`
      : "") +
    lines
      .map(
        (line, index) =>
          `<p style="${index === 0 ? heading : base}margin:${index === 0 && !signature?.image ? "16pt" : "0"} 0 0 0;">${escapeHtml(line)}</p>`,
      )
      .join("");

  return `<p style="${heading}text-align:center;margin:0 0 8pt 0;">${escapeHtml(report.title)}</p>${sections}${signOff}`;
}

/**
 * A whole page for printing or saving as PDF: the report between the
 * letterhead's header and footer, which repeat on every sheet.
 */
export function buildPrintHtml(
  report: FormattedReport,
  profile: PasteProfile,
  signature: Signature | undefined,
  letterhead: { header: string | null; footer: string | null } | null,
) {
  const header = letterhead?.header ? `<img src="${letterhead.header}" alt="">` : "";
  const footer = letterhead?.footer ? `<img src="${letterhead.footer}" alt="">` : "";
  // The table's header and footer groups are what browsers repeat on each sheet.
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:#fff}
table{width:100%;border-collapse:collapse}
td{padding:0}
img{display:block}
thead img,tfoot img{width:100%;height:auto}
.body{padding:${header ? "6mm" : "18mm"} 18mm ${footer ? "6mm" : "18mm"}}
tfoot td{vertical-align:bottom}
</style></head><body><table><thead><tr><td>${header}</td></tr></thead><tfoot><tr><td>${footer}</td></tr></tfoot><tbody><tr><td><div class="body">${buildReportHtml(report, profile, signature)}</div></td></tr></tbody></table></body></html>`;
}

export function buildReportText(
  report: FormattedReport,
  { listStyle }: PasteProfile = DEFAULT_PROFILE,
  signature?: Signature,
) {
  const sections = report.sections.map(({ heading, lines }) => {
    const body = lines.map((line) => (listStyle === "bullets" ? `- ${line}` : line));
    return `${heading}:\n${body.join("\n")}`;
  });
  const lines = signatureLines(signature);
  return [report.title, ...sections, ...(lines.length ? [lines.join("\n")] : [])].join("\n\n");
}

/** A stored or submitted paste profile, with anything unknown replaced by the default. */
export function parsePasteProfile(value: unknown): PasteProfile {
  const input = (value ?? {}) as Partial<PasteProfile>;
  return {
    font: PASTE_FONTS.includes(input.font ?? "") ? input.font! : DEFAULT_PROFILE.font,
    size: PASTE_SIZES.includes(Number(input.size)) ? Number(input.size) : DEFAULT_PROFILE.size,
    headingStyle: PASTE_HEADING_STYLES.find((style) => style === input.headingStyle) ?? DEFAULT_PROFILE.headingStyle,
    listStyle: PASTE_LIST_STYLES.find((style) => style === input.listStyle) ?? DEFAULT_PROFILE.listStyle,
  };
}
