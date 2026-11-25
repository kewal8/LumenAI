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
 * A word as it is compared: without the punctuation around it and in lower
 * case. "haemorrhage," and "haemorrhage", or "mastoid" and "Mastoid", are the
 * same word, so a moved comma or a new capital is not counted as new wording.
 */
function sameAs(word: string) {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || word;
}

function words(text: string) {
  const found: { word: string; from: number; to: number }[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    found.push({ word: sameAs(match[0]), from: match.index, to: match.index + match[0].length });
  }
  return found;
}

/**
 * The stretches of a line the AI wrote: the words that are not in the wording
 * the line had before. A line with no earlier wording is new from end to end.
 */
function addedRanges(base: string | null, text: string): [number, number][] {
  const now = words(text);
  if (now.length === 0) return [];
  const before = base ? words(base).map((item) => item.word) : [];
  if (before.length === 0) return [[now[0].from, now[now.length - 1].to]];

  // Longest run of words the two share, in order; the rest of `now` was added.
  const rows = before.length + 1;
  const cols = now.length + 1;
  const table = new Uint16Array(rows * cols);
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = now.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        before[i] === now[j].word
          ? table[(i + 1) * cols + j + 1] + 1
          : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  const kept = new Set<number>();
  for (let i = 0, j = 0; i < before.length && j < now.length; ) {
    if (before[i] === now[j].word) {
      kept.add(j);
      i++;
      j++;
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) i++;
    else j++;
  }

  // Neighbouring added words join into one stretch of bold.
  const ranges: [number, number][] = [];
  now.forEach((item, index) => {
    if (kept.has(index)) return;
    const last = ranges[ranges.length - 1];
    if (last && !kept.has(index - 1)) last[1] = item.to;
    else ranges.push([item.from, item.to]);
  });
  return ranges;
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
          // The wording a dictated line had before the AI rewrote it.
          base: attribute("base", "data-base"),
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
    // Wording this report has held as a normal or dictated line, with how it
    // was marked. A line cut and pasted somewhere else, or typed back to what
    // it said, is that same line again: it keeps its marking and is not shown
    // as changed by hand.
    const known = new Map<string, { status: string; source: string | null }>();
    const remember = (doc: PMNode) => {
      doc.descendants((node) => {
        if (!isLine(node)) return;
        const text = node.textContent.trim();
        const status = node.attrs.status;
        if (text && (status === "normal" || status === "spoken")) {
          known.set(text, { status, source: node.attrs.source ?? null });
        }
      });
    };

    return [
      new Plugin({
        key: new PluginKey("reportLines"),

        // After typing, pasting or pressing Enter: give new paragraphs their own
        // identity and mark lines the doctor changed by hand.
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          // Dictation updates and undo/redo already carry the right details.
          if (transactions.some((tr) => tr.getMeta(PATCH) || tr.getMeta("history$"))) return null;

          // Only the settled document is trusted: a paragraph just split or
          // pasted still carries the marking of the line it came from.
          remember(oldState.doc);
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
              if (changed) {
                const same = known.get(node.textContent.trim());
                if (same) {
                  if (node.attrs.status !== same.status || node.attrs.warnings.length > 0) {
                    set(pos, { ...node.attrs, status: same.status, source: same.source, warnings: [] });
                  }
                } else if (node.attrs.status !== "edited" || node.attrs.warnings.length > 0) {
                  set(pos, { ...node.attrs, status: "edited", warnings: [] });
                }
              }
              return;
            }

            // A paragraph with no identity, or a copy of another line's.
            if (inImpression || !section) {
              set(pos, { ...node.attrs, lineId: null, sectionId: null, impression: true, status: null, source: null, warnings: [] });
            } else {
              const fresh = newLineId(section);
              seen.add(fresh);
              const same = known.get(node.textContent.trim());
              set(pos, {
                ...node.attrs,
                lineId: fresh,
                sectionId: section,
                status: same?.status ?? "edited",
                source: same?.source ?? null,
                warnings: [],
              });
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
  // What the AI writes is made bold, word by word, with the editor's own Bold:
  // part of the report, so it is copied and printed, and the doctor can take
  // it off with the Bold button.
  const bold = schema.marks.bold.create();

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
        { lineId: newLineId(op.sectionId), sectionId: op.sectionId, status: "spoken", source: op.source, base: null, warnings: op.warnings },
        // A new line is the AI's from end to end.
        op.text ? schema.text(op.text, [bold]) : undefined,
      );
      const last =
        findBlock(tr.doc, (node) => isLine(node) && node.attrs.sectionId === op.sectionId) ??
        findBlock(tr.doc, (node) => node.attrs.role === "section" && node.attrs.sectionId === op.sectionId);
      if (last) insertAfter(last.pos, last.node, created);
      continue;
    }

    const line = findBlock(tr.doc, (node) => isLine(node) && node.attrs.lineId === op.lineId);
    if (!line) continue;

    if (op.op === "remove") {
      // Only untouched normal wording is ever removed, never a finding.
      if (line.node.attrs.status === "normal" || !line.node.attrs.status) removeBlock(line.pos, line.node);
      continue;
    }

    if (op.op === "replace") {
      // Kept from the first rewrite, so a second dictation is still compared with the normal wording.
      const base =
        line.node.attrs.status === "spoken" ? (line.node.attrs.base ?? null) : line.node.textContent;
      tr.setNodeMarkup(line.pos, undefined, { ...line.node.attrs, status: "spoken", source: op.source, base, warnings: op.warnings });
      setText(line.pos, line.node, op.text);
      // Only the words that are not in the wording the line had before.
      for (const [from, to] of addedRanges(base, op.text)) {
        tr.addMark(line.pos + 1 + from, line.pos + 1 + to, bold);
      }
      continue;
    }

    // reset: back to the template's normal wording, or gone if the line was added.
    const normal = template.sections
      .find((section) => section.id === line.node.attrs.sectionId)
      ?.lines.find((candidate) => candidate.id === op.lineId);
    if (normal) {
      tr.setNodeMarkup(line.pos, undefined, { ...line.node.attrs, status: "normal", source: null, base: null, warnings: [] });
      setText(line.pos, line.node, normal.text);
    } else {
      removeBlock(line.pos, line.node);
    }
  }

  // Impression: reuse the paragraphs that are there, add or remove the rest.
  const isImpression = (node: PMNode) => node.type.name === "paragraph" && Boolean(node.attrs.impression);
  // An impression line that is not the template's normal wording is the AI's
  // from end to end, so all of it is bold. A line left as it was is not touched.
  const normalImpression = new Set(template.normalImpression.map((line) => line.trim()));
  const marksFor = (text: string) => (normalImpression.has(text.trim()) ? [] : [bold]);
  impression.forEach((text, index) => {
    const existing = findAll(tr.doc, isImpression);
    if (existing[index]) {
      const { pos, node } = existing[index];
      if (node.textContent !== text) {
        setText(pos, node, text);
        if (text) for (const mark of marksFor(text)) tr.addMark(pos + 1, pos + 1 + text.length, mark);
      }
      return;
    }
    const created = paragraph.create({ impression: true }, text ? schema.text(text, marksFor(text)) : undefined);
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

// ---------------------------------------------------------------------------
// Reviewing what the AI changed: a picture of every line before and after a
// dictation, and a way to put chosen lines back exactly as they were.

/** One report line as it stood: its wording, its full node, and the line before it. */
export type LineSnap = { lineId: string; sectionId: string | null; text: string; node: unknown; prev: string | null };
export type ReportSnap = { lines: LineSnap[]; impression: string[] };

const isImpressionLine = (node: PMNode) => node.type.name === "paragraph" && Boolean(node.attrs.impression);

export function snapshotReport(editor: Editor): ReportSnap {
  const lines: LineSnap[] = [];
  let prev: string | null = null;
  editor.state.doc.descendants((node) => {
    if (!isLine(node)) return true;
    lines.push({ lineId: node.attrs.lineId, sectionId: node.attrs.sectionId, text: node.textContent, node: node.toJSON(), prev });
    prev = node.attrs.lineId;
    return false;
  });
  return { lines, impression: findAll(editor.state.doc, isImpressionLine).map(({ node }) => node.textContent) };
}

/**
 * Puts lines into a chosen state: `node` back in place of the line (or the
 * line removed when `node` is null), only when the line still reads `expect`
 * (or is absent when `expect` is null). A line the doctor has edited since is
 * left as it is and counted as skipped, so their own words are never lost.
 */
export function restoreReport(
  editor: Editor,
  lines: { lineId: string; sectionId: string | null; expect: string | null; node: unknown; prev: string | null }[],
  impression?: { expect: string[]; text: string[]; template: PatchPlan["template"] },
) {
  const { schema } = editor.state;
  const tr = editor.state.tr.setMeta(PATCH, true);
  let done = 0;
  let skipped = 0;

  for (const item of lines) {
    const current = findBlock(tr.doc, (node) => isLine(node) && node.attrs.lineId === item.lineId);
    const matches = item.expect === null ? !current : Boolean(current) && current!.node.textContent === item.expect;
    if (!matches) {
      skipped++;
      continue;
    }
    if (current) {
      if (item.node) tr.replaceWith(current.pos, current.pos + current.node.nodeSize, schema.nodeFromJSON(item.node));
      else {
        const resolved = tr.doc.resolve(current.pos);
        if (resolved.parent.type.name === "listItem" && resolved.parent.childCount === 1) tr.delete(resolved.before(), resolved.after());
        else tr.delete(current.pos, current.pos + current.node.nodeSize);
      }
      done++;
      continue;
    }
    if (!item.node) continue;
    // A line that had gone comes back after the line it used to follow, or at the top of its section.
    const after =
      (item.prev && findBlock(tr.doc, (node) => isLine(node) && node.attrs.lineId === item.prev)) ||
      findBlock(tr.doc, (node) => node.attrs.role === "section" && node.attrs.sectionId === item.sectionId);
    if (!after) {
      skipped++;
      continue;
    }
    tr.insert(after.pos + after.node.nodeSize, schema.nodeFromJSON(item.node));
    done++;
  }

  if (tr.docChanged) editor.view.dispatch(tr);

  // The impression is written back the way a dictation writes it, so lists and bold stay right.
  if (impression) {
    const reads = findAll(editor.state.doc, isImpressionLine).map(({ node }) => node.textContent);
    if (reads.length === impression.expect.length && reads.every((text, index) => text === impression.expect[index])) {
      applyPatchToEditor(editor, { template: impression.template, ops: [], impression: impression.text });
      done++;
    } else {
      skipped++;
    }
  }
  return { done, skipped };
}

// ---------------------------------------------------------------------------
// Tidying before a check: lines the doctor or the AI emptied leave a gap.

/**
 * Takes out report and impression lines left empty (cut, cleared or deleted to
 * nothing), so the report closes up. The template's own blank lines stay; where
 * a removed line sat between two of them, one goes too, so the spacing stays
 * as the template has it. One step, so one Undo puts it all back.
 */
export function removeEmptyLines(editor: Editor) {
  const tr = editor.state.tr;
  const empty = (node: PMNode | null | undefined) => Boolean(node && node.isTextblock && !node.textContent.trim());
  const isGap = (node: PMNode | null | undefined) =>
    empty(node) && !node!.attrs.lineId && !node!.attrs.impression && node!.type.name === "paragraph";
  const targets = findAll(
    tr.doc,
    (node) => node.type.name === "paragraph" && Boolean(node.attrs.lineId || node.attrs.impression) && empty(node),
  );
  let removed = 0;
  // From the end, so the places of the ones before do not move.
  for (const { pos, node } of targets.reverse()) {
    const resolved = tr.doc.resolve(pos);
    removed++;
    // A bullet with nothing in it goes whole, and its list with it when it was the last.
    if (resolved.parent.type.name === "listItem" && resolved.parent.childCount === 1) {
      tr.deleteRange(resolved.before(), resolved.after());
      continue;
    }
    tr.delete(pos, pos + node.nodeSize);
    const at = tr.doc.resolve(pos);
    if (at.depth === 0 && isGap(at.nodeBefore) && isGap(at.nodeAfter)) {
      tr.delete(pos, pos + at.nodeAfter!.nodeSize);
    }
  }
  if (removed) editor.view.dispatch(tr);
  return removed;
}
