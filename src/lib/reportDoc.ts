// The report as a formatted document. The editor works on this shape; the
// plain `Report` (sections and lines) is read back out of it for dictation,
// checks and lists, so both stay in step.
import type { PatchOp, Report, ReportLine, Template } from "./report";
import type { PasteProfile } from "./reportFormat";

/** Sign-off under a report: lines of text and an optional signature image. */
export type Signature = { text: string; image: string | null };

export type DocMark = { type: string; attrs?: Record<string, unknown> };

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
};

function textNodes(text: string, marks?: DocMark[]): DocNode[] {
  return text ? [{ type: "text", text, ...(marks?.length ? { marks } : {}) }] : [];
}

function lineNode(line: ReportLine, sectionId: string): DocNode {
  return {
    type: "paragraph",
    attrs: {
      lineId: line.id,
      sectionId,
      status: line.status,
      source: line.source ?? null,
      warnings: line.warnings,
    },
    content: textNodes(line.text),
  };
}

function inBullets(paragraphs: DocNode[]): DocNode[] {
  return paragraphs.length === 0
    ? []
    : [
        {
          type: "bulletList",
          content: paragraphs.map((paragraph) => ({ type: "listItem", content: [paragraph] })),
        },
      ];
}

/** Lays a report out as a document, following the doctor's paste settings. */
export function reportToDoc(report: Report, profile: PasteProfile): DocNode {
  const headingMarks: DocMark[] =
    profile.headingStyle === "bold + underline" ? [{ type: "underline" }] : [];
  const group = (paragraphs: DocNode[]) =>
    profile.listStyle === "bullets" ? inBullets(paragraphs) : paragraphs;

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, role: "title", textAlign: "center" },
        content: textNodes(report.title, headingMarks),
      },
      ...report.sections.flatMap((section) => [
        {
          type: "heading",
          attrs: { level: 2, role: "section", sectionId: section.id },
          content: textNodes(`${section.heading}:`, headingMarks),
        },
        ...group(section.lines.map((line) => lineNode(line, section.id))),
      ]),
      {
        type: "heading",
        attrs: { level: 2, role: "impression" },
        content: textNodes("IMPRESSION:", headingMarks),
      },
      ...group(
        report.impression.map((text) => ({
          type: "paragraph",
          attrs: { impression: true },
          content: textNodes(text),
        })),
      ),
    ],
  };
}

export function nodeText(node: DocNode): string {
  return node.text ?? (node.content ?? []).map(nodeText).join("");
}

/** Every heading and paragraph in reading order, including those inside lists. */
function blocks(node: DocNode, found: DocNode[] = []) {
  for (const child of node.content ?? []) {
    if (child.type === "heading" || child.type === "paragraph") found.push(child);
    else blocks(child, found);
  }
  return found;
}

/**
 * Reads the plain report back out of the document. `fallback` supplies section
 * headings the doctor may have deleted, and the report's log.
 */
export function docToReport(doc: DocNode, fallback: Report): Report {
  const sections = new Map<string, { heading: string | null; lines: ReportLine[] }>();
  const sectionFor = (id: string) => {
    if (!sections.has(id)) sections.set(id, { heading: null, lines: [] });
    return sections.get(id)!;
  };
  let title = fallback.title;
  const impression: string[] = [];

  for (const block of blocks(doc)) {
    const attrs = block.attrs ?? {};
    const text = nodeText(block);
    if (block.type === "heading" || attrs.role) {
      if (attrs.role === "title") title = text.trim() || fallback.title;
      if (attrs.role === "section" && typeof attrs.sectionId === "string") {
        sectionFor(attrs.sectionId).heading = text.trim().replace(/:$/, "");
      }
      continue;
    }
    if (attrs.impression) {
      if (text.trim()) impression.push(text.trim());
    } else if (typeof attrs.lineId === "string" && typeof attrs.sectionId === "string") {
      sectionFor(attrs.sectionId).lines.push({
        id: attrs.lineId,
        text,
        status: (attrs.status as ReportLine["status"]) ?? "normal",
        ...(attrs.source ? { source: attrs.source as string } : {}),
        warnings: Array.isArray(attrs.warnings) ? (attrs.warnings as string[]) : [],
      });
    }
  }

  return {
    ...fallback,
    title,
    sections: [...sections].map(([id, section]) => ({
      id,
      heading:
        section.heading ||
        fallback.sections.find((candidate) => candidate.id === id)?.heading ||
        "",
      lines: section.lines,
    })),
    impression,
  };
}

// ---------------------------------------------------------------------------
// Copy for PACS: inline styles only, because PACS editors drop <style> blocks
// and class names on paste.

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeCss(value: unknown) {
  // Values come from the toolbar, but a saved document is still treated as input.
  return typeof value === "string" ? value.replace(/[;"<>{}]/g, "") : "";
}

function inlineHtml(node: DocNode): string {
  if (node.type === "hardBreak") return "<br>";
  if (node.type !== "text") return (node.content ?? []).map(inlineHtml).join("");

  let html = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
    const attrs = mark.attrs ?? {};
    if (mark.type === "bold") html = `<b>${html}</b>`;
    else if (mark.type === "italic") html = `<i>${html}</i>`;
    else if (mark.type === "underline") html = `<u>${html}</u>`;
    else if (mark.type === "highlight") {
      html = `<span style="background-color:${safeCss(attrs.color) || "#fff3a3"};">${html}</span>`;
    } else if (mark.type === "textStyle") {
      const style = [
        attrs.color ? `color:${safeCss(attrs.color)};` : "",
        attrs.fontFamily ? `font-family:${safeCss(attrs.fontFamily)};` : "",
        attrs.fontSize ? `font-size:${safeCss(attrs.fontSize)};` : "",
      ].join("");
      if (style) html = `<span style="${style}">${html}</span>`;
    }
  }
  return html;
}

function align(node: DocNode) {
  const value = safeCss(node.attrs?.textAlign);
  return value && value !== "left" ? `text-align:${value};` : "";
}

function blockHtml(node: DocNode, base: string, heading: string): string {
  const inner = () => (node.content ?? []).map(inlineHtml).join("");
  switch (node.type) {
    case "heading": {
      const title = node.attrs?.role === "title";
      const margin = title ? "0 0 8pt 0" : "8pt 0 0 0";
      // The class is for the printed page only, which lays headings out as the editor does; a paste ignores it.
      return `<p class="${title ? "doc-title" : "doc-heading"}" style="${heading}${align(node)}margin:${margin};">${inner()}</p>`;
    }
    case "paragraph":
      // No space between lines: a blank line in the document is the gap, as written.
      return `<p style="${base}${align(node)}margin:0;">${inner() || "&nbsp;"}</p>`;
    case "bulletList":
    case "orderedList": {
      const tag = node.type === "bulletList" ? "ul" : "ol";
      const items = (node.content ?? [])
        .map((item) => {
          const parts = (item.content ?? []).map((child) =>
            child.type === "paragraph"
              ? (child.content ?? []).map(inlineHtml).join("")
              : blockHtml(child, base, heading),
          );
          const first = (item.content ?? [])[0];
          return `<li style="${base}${first ? align(first) : ""}">${parts.join("<br>")}</li>`;
        })
        .join("");
      return `<${tag} style="margin:0;">${items}</${tag}>`;
    }
    default:
      return (node.content ?? []).map((child) => blockHtml(child, base, heading)).join("");
  }
}

function signatureLines(signature?: Signature) {
  return (signature?.text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The document as HTML that keeps its formatting when pasted into a PACS editor. */
export function docToHtml(doc: DocNode, profile: PasteProfile, signature?: Signature) {
  const base = `font-family:'${profile.font}',sans-serif;font-size:${profile.size}pt;color:#000;`;
  const heading = `${base}font-weight:bold;`;
  const body = (doc.content ?? []).map((node) => blockHtml(node, base, heading)).join("");

  const lines = signatureLines(signature);
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
  return body + signOff;
}

/** The same document as plain text, for editors that refuse formatting. */
export function docToText(doc: DocNode, signature?: Signature) {
  const parts: string[] = [];
  const walk = (node: DocNode, prefix = "") => {
    for (const child of node.content ?? []) {
      if (child.type === "heading") parts.push(`\n${nodeText(child)}`);
      else if (child.type === "paragraph") parts.push(prefix + nodeText(child));
      else if (child.type === "bulletList") walk(child, "- ");
      else if (child.type === "orderedList") {
        (child.content ?? []).forEach((item, index) => walk(item, `${index + 1}. `));
      } else walk(child, prefix);
    }
  };
  walk(doc);
  const lines = signatureLines(signature);
  return [parts.join("\n").trim(), ...(lines.length ? [lines.join("\n")] : [])].join("\n\n");
}

// ---------------------------------------------------------------------------
// Used by the editor to write a dictation into the document.

export type PatchPlan = { template: Template; ops: PatchOp[]; impression: string[] };

export function newLineId(sectionId: string) {
  return `${sectionId}.${crypto.randomUUID().slice(0, 8)}`;
}
