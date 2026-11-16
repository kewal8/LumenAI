import type { DocNode } from "./reportDoc";
import type { TemplateDraft } from "./templateInput";

/** Study types a template can belong to. */
export const MODALITIES = [
  "US",
  "CT",
  "MRI",
  "XRAY",
  "MG",
  "PT",
  "NM",
  "XA",
  "BMD",
  "Cardiology",
  "Neurology",
  "Procedure",
] as const;

export type Modality = (typeof MODALITIES)[number];

export function parseModality(value: unknown): Modality | null {
  return MODALITIES.find((modality) => modality === value) ?? null;
}

type Block = {
  text: string;
  heading: boolean;
  centered: boolean;
  bold: boolean;
};

const IMPRESSION = /^(impression|conclusion|opinion|summary)$/i;
// Report parts that are often written on one line with their text, as in
// "TECHNIQUE: Axial sections ...". Other "Label: text" lines, such as
// "Liver: normal in size", are findings inside a section.
const PART =
  /^(clinical (details|history|indication)|history|indication|technique|protocol|procedure|comparison|findings|observations?|impression|conclusion|opinion|summary|advice|recommendations?)$/i;
const INLINE = /^([^:.]{2,60}):\s*(.*)$/;

const plain = (node: DocNode): string =>
  node.type === "hardBreak"
    ? "\n"
    : (node.text ?? (node.content ?? []).map(plain).join(""));

/** The inline content between two character positions, keeping its formatting. */
function slice(content: DocNode[], from: number, to = Infinity): DocNode[] {
  const out: DocNode[] = [];
  let at = 0;
  for (const child of content) {
    const length = plain(child).length;
    const start = Math.max(from, at);
    const end = Math.min(to, at + length);
    if (end > start) {
      if (child.type === "text")
        out.push({ ...child, text: child.text!.slice(start - at, end - at) });
      else if (start === at && end === at + length) out.push(child);
    }
    at += length;
  }
  return out;
}

/**
 * Puts every line on a paragraph of its own: a paragraph with line breaks
 * inside (common in text pasted from Word) becomes one paragraph per line,
 * and "TECHNIQUE: Axial sections ..." becomes the heading and its line.
 */
function normalise(node: DocNode): DocNode[] {
  if (node.type !== "paragraph" && node.type !== "heading") {
    return [
      {
        ...node,
        ...(node.content ? { content: node.content.flatMap(normalise) } : {}),
      },
    ];
  }
  const content = node.content ?? [];
  const full = content.map(plain).join("");
  const breaks = [...full.matchAll(/\n/g)].map((match) => match.index!);
  if (breaks.length > 0) {
    const edges = [-1, ...breaks, full.length];
    return edges.slice(1).flatMap((end, index) =>
      normalise({
        ...node,
        content: slice(content, edges[index] + 1, end).filter(
          (child) => child.type !== "hardBreak",
        ),
      }),
    );
  }
  const inline = full.match(INLINE);
  if (inline && inline[2].trim() && PART.test(inline[1].trim())) {
    const restAt = full.length - inline[2].length;
    return [
      { ...node, content: slice(content, 0, inline[1].length + 1) },
      {
        ...node,
        type: "paragraph",
        attrs: { ...node.attrs, level: undefined },
        content: slice(content, restAt),
      },
    ];
  }
  return [node];
}

function blockOf(node: DocNode): Block {
  const texts = (node.content ?? []).filter((child) =>
    (child.text ?? "").trim(),
  );
  return {
    text: (node.content ?? []).map(plain).join("").replace(/\s+/g, " ").trim(),
    heading: node.type === "heading",
    centered: node.attrs?.textAlign === "center",
    bold:
      texts.length > 0 &&
      texts.every((child) =>
        (child.marks ?? []).some((mark) => mark.type === "bold"),
      ),
  };
}

/** "FINDINGS:" on a line of its own, or a short bold line: a heading. */
function headingOf(block: Block): string | null {
  const inline = block.text.match(INLINE);
  if (inline && !inline[2].trim()) {
    const label = inline[1].trim();
    // "FINDINGS:" is a heading; "Right kidney measures:" with its value to be
    // dictated is a line. Report parts, capitals and bold make a heading.
    const capitals = label === label.toUpperCase() && /\p{L}/u.test(label);
    if (PART.test(label) || capitals || block.bold || block.heading)
      return label;
    return null;
  }
  if (
    (block.heading || block.bold) &&
    block.text.length <= 60 &&
    !/[.]$/.test(block.text)
  )
    return block.text;
  return null;
}

// Line details the report editor keeps on paragraphs.
const REPORT_ATTRS = [
  "lineId",
  "sectionId",
  "status",
  "source",
  "warnings",
  "role",
  "impression",
];

/** Every heading and paragraph, in reading order, including those in lists. */
function paragraphs(node: DocNode, found: DocNode[] = []) {
  for (const child of node.content ?? []) {
    if (child.type === "paragraph" || child.type === "heading")
      found.push(child);
    else paragraphs(child, found);
  }
  return found;
}

type Section = { heading: string; lines: string[] };
type Role =
  | { kind: "title" | "gap" }
  | { kind: "heading" | "impression-heading"; section: Section }
  | { kind: "line"; section: Section; index: number };

/**
 * Reads a template written freely in the editor. The first line, if it is a
 * title (centred, bold or a heading) and not a section, is the report title.
 * Lines ending in a colon start sections; what follows is that section's
 * normal wording. The IMPRESSION section is the impression used when
 * everything is normal; a template without one makes reports without one. Findings written before any heading belong to
 * FINDINGS.
 *
 * Also returns the document itself with every line tagged with the same ids
 * the report uses, so a report can start from the template exactly as it was
 * written: its layout, blank lines and formatting.
 */
export function readTemplate(
  source: DocNode,
  name: string,
): { draft: TemplateDraft; reportDoc: DocNode } | string {
  const doc = { ...source, content: (source.content ?? []).flatMap(normalise) };
  const nodes = paragraphs(doc);
  // Headings found to have nothing under them, read again as plain lines.
  const asLine = new Set<DocNode>();
  let roles = new Map<DocNode, Role>();
  let title = "";
  let sections: Section[] = [];

  const read = () => {
    roles = new Map();
    title = "";
    sections = [];
    nodes.forEach((node) => {
      const block = blockOf(node);
      if (!block.text) return roles.set(node, { kind: "gap" });
      const heading = asLine.has(node) ? null : headingOf(block);
      const nothingYet = !title && sections.length === 0;
      if (
        nothingYet &&
        (block.centered || block.heading || block.bold) &&
        !block.text.includes(":")
      ) {
        title = block.text;
        return roles.set(node, { kind: "title" });
      }
      if (heading) {
        const section = {
          heading: heading.toUpperCase(),
          lines: [] as string[],
        };
        sections.push(section);
        return roles.set(node, {
          kind: IMPRESSION.test(heading) ? "impression-heading" : "heading",
          section,
        });
      }
      let current = sections.at(-1);
      if (!current && !title && !block.text.includes(":")) {
        title = block.text;
        return roles.set(node, { kind: "title" });
      }
      if (!current) {
        current = { heading: "FINDINGS", lines: [] };
        sections.push(current);
      }
      current.lines.push(block.text);
      roles.set(node, {
        kind: "line",
        section: current,
        index: current.lines.length - 1,
      });
    });
  };

  read();
  // A heading with no lines under it, such as a bold "Right kidney measures:"
  // followed by another heading, is a line to fill in, not a section.
  for (const [node, role] of roles) {
    if (role.kind === "heading" && role.section.lines.length === 0)
      asLine.add(node);
  }
  if (asLine.size > 0) read();

  if (nodes.every((node) => roles.get(node)?.kind === "gap"))
    return "Write or paste the template first.";
  const impression = sections.find((section) =>
    IMPRESSION.test(section.heading),
  );
  const body = sections.filter((section) => section !== impression);
  if (body.length === 0)
    return "Add at least one section, such as FINDINGS: with its normal lines under it.";
  const empty = body.find((section) => section.lines.length === 0);
  if (empty) return `Add the normal wording under ${empty.heading}:.`;
  // Some reports have no impression at all; their reports never get one.

  // Tag each paragraph. Ids follow toTemplate: s1, s1.l1, in section order.
  const idOf = (section: Section) => `s${body.indexOf(section) + 1}`;
  const tag = (node: DocNode): DocNode => {
    if (node.type !== "paragraph" && node.type !== "heading") {
      return node.content ? { ...node, content: node.content.map(tag) } : node;
    }
    const role = roles.get(node);
    // Start clean: the template editor shares the report editor, which may
    // have stamped its own line details on the paragraphs while typing.
    const attrs: Record<string, unknown> = { ...node.attrs };
    for (const key of REPORT_ATTRS) delete attrs[key];
    if (role?.kind === "title") attrs.role = "title";
    else if (role?.kind === "heading")
      Object.assign(attrs, { role: "section", sectionId: idOf(role.section) });
    else if (role?.kind === "impression-heading") attrs.role = "impression";
    else if (role?.kind === "line" && role.section === impression)
      attrs.impression = true;
    else if (role?.kind === "line") {
      const sectionId = idOf(role.section);
      Object.assign(attrs, {
        lineId: `${sectionId}.l${role.index + 1}`,
        sectionId,
        status: "normal",
        source: null,
        warnings: [],
      });
    } else attrs.role = "gap";
    return { ...node, attrs };
  };

  return {
    draft: {
      name,
      title: title || name.toUpperCase(),
      sections: body,
      normalImpression: impression?.lines ?? [],
      ...(impression ? {} : { noImpression: true }),
    },
    reportDoc: tag(doc),
  };
}

/** The template's sections and lines, read from what was written. */
export function docToDraft(doc: DocNode, name: string): TemplateDraft | string {
  const read = readTemplate(doc, name);
  return typeof read === "string" ? read : read.draft;
}

const text = (value: string, bold = false): DocNode => ({
  type: "text",
  text: value,
  ...(bold ? { marks: [{ type: "bold" }] } : {}),
});

/** A stored template laid out for editing, for templates saved before the open editor. */
export function draftToDoc(draft: TemplateDraft): DocNode {
  const paragraph = (value: string, bold = false, center = false): DocNode => ({
    type: "paragraph",
    ...(center ? { attrs: { textAlign: "center" } } : {}),
    content: [text(value, bold)],
  });
  return {
    type: "doc",
    content: [
      paragraph(draft.title, true, true),
      ...draft.sections.flatMap((section) => [
        paragraph(`${section.heading}:`, true),
        ...section.lines.map((line) => paragraph(line)),
      ]),
      paragraph("IMPRESSION:", true),
      ...draft.normalImpression.map((line) => paragraph(line)),
    ],
  };
}
