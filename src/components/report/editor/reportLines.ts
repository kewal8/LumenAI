import { Extension, type Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { toast } from "@/components/Toast";
import { newLineId, type PatchPlan } from "@/lib/reportDoc";

/** Marks a change made by a dictation, so it is not mistaken for typing. */
const PATCH = "reportPatch";

function attribute(name: string, dataName: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(dataName),
    renderHTML: (attrs: Record<string, unknown>) => (attrs[name] ? { [dataName]: attrs[name] } : {}),
  };
}

function isLine(node: PMNode) {
  return node.type.name === "paragraph" && Boolean(node.attrs.lineId);
}

function lineTexts(doc: PMNode) {
  const texts = new Map<string, string>();
  doc.descendants((node) => {
    if (isLine(node)) texts.set(node.attrs.lineId, node.textContent);
  });
  return texts;
}

/**
 * Small note under a line: what to check before signing. The words the line
 * was written from are shown in the chat only, not here.
 */
function noteFor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
  const warnings: string[] = node.attrs.warnings ?? [];
  const note = document.createElement("div");
  note.className = "report-note";
  note.contentEditable = "false";
  const text = document.createElement("div");
  text.className = "report-note-text";
  for (const warning of warnings) {
    const row = document.createElement("p");
    row.className = "report-note-flag";
    row.textContent = warning;
    text.append(row);
  }
  note.append(text);
  // A finalized report is read only: the warning shows, but cannot be answered.
  if (!view.editable) return note;

  // Accept: the line is right as written. Ignore: the warning is not needed.
  // Either way the doctor has looked at it, so the warning goes.
  const answer = (label: string, className: string, done: string) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    // Keeps the cursor where it was in the report.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      // The widget sits just after its line.
      const after = getPos();
      if (after === undefined) return;
      const pos = after - node.nodeSize;
      const line = view.state.doc.nodeAt(pos);
      if (!line || !isLine(line)) return;
      view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...line.attrs, warnings: [] }));
      toast.success(done);
    });
    return button;
  };
  const actions = document.createElement("div");
  actions.className = "report-note-actions";
  actions.append(
    answer("Accept", "report-note-accept", "Line accepted"),
    answer("Ignore", "report-note-ignore", "Warning ignored"),
  );
  note.append(actions);
  return note;
}

/**
 * Keeps each line of the report identifiable inside the document: which
 * section it belongs to, whether it is still the normal wording, and what was
 * dictated for it.
 */
export const ReportLines = Extension.create({
  name: "reportLines",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineId: attribute("lineId", "data-line-id"),
          sectionId: attribute("sectionId", "data-section-id"),
          status: attribute("status", "data-status"),
          source: attribute("source", "data-source"),
          role: attribute("role", "data-role"),
          impression: {
            default: null,
            parseHTML: (element: HTMLElement) => (element.hasAttribute("data-impression") ? true : null),
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.impression ? { "data-impression": "" } : {},
          },
          warnings: {
            default: [],
            parseHTML: (element: HTMLElement) => {
              try {
                return JSON.parse(element.getAttribute("data-warnings") ?? "[]");
              } catch {
                return [];
              }
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              Array.isArray(attrs.warnings) && attrs.warnings.length > 0
                ? { "data-warnings": JSON.stringify(attrs.warnings) }
                : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("reportLines"),

        // After typing, pasting or pressing Enter: give new paragraphs their own
        // identity and mark lines the doctor changed by hand.
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          // Dictation updates and undo/redo already carry the right details.
          if (transactions.some((tr) => tr.getMeta(PATCH) || tr.getMeta("history$"))) return null;

          const before = lineTexts(oldState.doc);
          const seen = new Set<string>();
          let section: string | null = null;
          let inImpression = false;
          let fix: Transaction | null = null;
          const set = (pos: number, attrs: Record<string, unknown>) => {
            fix = (fix ?? newState.tr).setNodeMarkup(pos, undefined, attrs);
          };

          newState.doc.descendants((node, pos) => {
            // Headings, and a template's own title, heading and blank-line paragraphs.
            if (node.type.name === "heading" || node.attrs.role) {
              if (node.attrs.role === "section") {
                section = node.attrs.sectionId;
                inImpression = false;
              }
              if (node.attrs.role === "impression") inImpression = true;
              return;
            }
            if (node.type.name !== "paragraph") return;
            if (node.attrs.impression) {
              inImpression = true;
              return;
            }

            const id: string | null = node.attrs.lineId;
            if (id && !seen.has(id)) {
              seen.add(id);
              section = node.attrs.sectionId ?? section;
              inImpression = false;
              const changed = before.has(id) && before.get(id) !== node.textContent;
              if (changed && (node.attrs.status !== "edited" || node.attrs.warnings.length > 0)) {
                set(pos, { ...node.attrs, status: "edited", warnings: [] });
              }
              return;
            }

            // A paragraph with no identity, or a copy of another line's.
            if (inImpression || !section) {
              set(pos, { ...node.attrs, lineId: null, sectionId: null, impression: true, status: null, source: null, warnings: [] });
            } else {
              const fresh = newLineId(section);
              seen.add(fresh);
              set(pos, { ...node.attrs, lineId: fresh, sectionId: section, status: "edited", source: null, warnings: [] });
            }
          });
          return fix;
        },

        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!isLine(node)) return;
              const flagged = node.attrs.warnings.length > 0;
              if (flagged) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "report-line-flagged" }));
              }
              if (flagged) {
                decorations.push(
                  Decoration.widget(pos + node.nodeSize, (view, getPos) => noteFor(node, view, getPos), {
                    side: -1,
                    key: `${node.attrs.lineId}|${node.attrs.warnings.join("|")}`,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

function findBlock(doc: PMNode, match: (node: PMNode) => boolean) {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (match(node)) found = { node, pos };
  });
  return found as { node: PMNode; pos: number } | null;
}

function findAll(doc: PMNode, match: (node: PMNode) => boolean) {
  const found: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (match(node)) found.push({ node, pos });
  });
  return found;
}

/**
 * Writes one dictation into the document as a single step, so one Undo takes
 * the whole dictation back out.
 */
export function applyPatchToEditor(editor: Editor, { template, ops, impression }: PatchPlan) {
  const { schema } = editor.state;
  const tr = editor.state.tr.setMeta(PATCH, true);
  const paragraph = schema.nodes.paragraph;

  const setText = (pos: number, node: PMNode, text: string) => {
    const from = pos + 1;
    const to = pos + node.nodeSize - 1;
    if (text) tr.replaceWith(from, to, schema.text(text));
    else tr.delete(from, to);
  };

  // Where a new paragraph goes after `pos`: after the whole bullet when the
  // paragraph sits in a list, so the new line gets a bullet of its own.
  const insertAfter = (pos: number, node: PMNode, created: PMNode) => {
    const parent = tr.doc.resolve(pos).parent;
    if (parent.type.name === "listItem") {
      tr.insert(tr.doc.resolve(pos).after(), parent.type.create(null, created));
    } else {
      tr.insert(pos + node.nodeSize, created);
    }
  };

  const removeBlock = (pos: number, node: PMNode) => {
    const resolved = tr.doc.resolve(pos);
    if (resolved.parent.type.name === "listItem" && resolved.parent.childCount === 1) {
      tr.delete(resolved.before(), resolved.after());
    } else {
      tr.delete(pos, pos + node.nodeSize);
    }
  };

  for (const op of ops) {
    if (op.op === "add") {
      const created = paragraph.create(
        { lineId: newLineId(op.sectionId), sectionId: op.sectionId, status: "spoken", source: op.source, warnings: op.warnings },
        op.text ? schema.text(op.text) : undefined,
      );
      const last =
        findBlock(tr.doc, (node) => isLine(node) && node.attrs.sectionId === op.sectionId) ??
        findBlock(tr.doc, (node) => node.attrs.role === "section" && node.attrs.sectionId === op.sectionId);
      if (last) insertAfter(last.pos, last.node, created);
      continue;
    }

    const line = findBlock(tr.doc, (node) => isLine(node) && node.attrs.lineId === op.lineId);
    if (!line) continue;

    if (op.op === "replace") {
      tr.setNodeMarkup(line.pos, undefined, { ...line.node.attrs, status: "spoken", source: op.source, warnings: op.warnings });
      setText(line.pos, line.node, op.text);
      continue;
    }

    // reset: back to the template's normal wording, or gone if the line was added.
    const normal = template.sections
      .find((section) => section.id === line.node.attrs.sectionId)
      ?.lines.find((candidate) => candidate.id === op.lineId);
    if (normal) {
      tr.setNodeMarkup(line.pos, undefined, { ...line.node.attrs, status: "normal", source: null, warnings: [] });
      setText(line.pos, line.node, normal.text);
    } else {
      removeBlock(line.pos, line.node);
    }
  }

  // Impression: reuse the paragraphs that are there, add or remove the rest.
  const isImpression = (node: PMNode) => node.type.name === "paragraph" && Boolean(node.attrs.impression);
  impression.forEach((text, index) => {
    const existing = findAll(tr.doc, isImpression);
    if (existing[index]) {
      if (existing[index].node.textContent !== text) setText(existing[index].pos, existing[index].node, text);
      return;
    }
    const created = paragraph.create({ impression: true }, text ? schema.text(text) : undefined);
    const anchor =
      existing[existing.length - 1] ??
      findBlock(tr.doc, (node) => node.attrs.role === "impression");
    if (anchor) insertAfter(anchor.pos, anchor.node, created);
    else tr.insert(tr.doc.content.size, created);
  });
  findAll(tr.doc, isImpression)
    .slice(impression.length)
    .reverse()
    .forEach(({ pos, node }) => removeBlock(pos, node));

  editor.view.dispatch(tr);
}
