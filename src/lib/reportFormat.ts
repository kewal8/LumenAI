export type PasteProfile = {
  font: string;
  size: number;
  headingStyle: "bold" | "bold + underline";
  listStyle: "paragraphs" | "bullets";
};

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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildReportHtml(
  report: FormattedReport,
  { font, size, headingStyle, listStyle }: PasteProfile = DEFAULT_PROFILE,
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

  return `<p style="${heading}text-align:center;margin:0 0 8pt 0;">${escapeHtml(report.title)}</p>${sections}`;
}

export function buildReportText(
  report: FormattedReport,
  { listStyle }: PasteProfile = DEFAULT_PROFILE,
) {
  const sections = report.sections.map(({ heading, lines }) => {
    const body = lines.map((line) => (listStyle === "bullets" ? `- ${line}` : line));
    return `${heading}:\n${body.join("\n")}`;
  });
  return [report.title, ...sections].join("\n\n");
}
