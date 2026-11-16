import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";

/** Every paragraph and heading with where it starts, in reading order. */
function blocks(doc: PMNode) {
  const found: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    found.push({ node, pos });
    return false;
  });
  return found;
}

/**
 * A block's text with one character per position inside it, so an offset in
 * the text is an offset in the document: a line break counts as "\n".
 */
function textOf(node: PMNode) {
  let text = "";
  node.forEach((child) => {
    text += child.isText ? child.text! : child.type.name === "hardBreak" ? "\n" : "￼".repeat(child.nodeSize);
  });
  return text;
}

/** The report's lines as the checker reads them; index n is the nth paragraph. */
export function readLines(editor: Editor) {
  return blocks(editor.state.doc).map(({ node }) => textOf(node));
}

/**
 * Replaces the first `find` in line `index` with `replace`, keeping the
 * formatting where it starts. A removed word takes one space with it, so no
 * double space is left. False when the text is no longer there.
 */
export function fixText(editor: Editor, index: number, find: string, replace: string) {
  const block = blocks(editor.state.doc)[index];
  if (!block || !find) return false;
  const text = textOf(block.node);
  const at = text.indexOf(find);
  if (at < 0) return false;
  let start = at;
  let end = at + find.length;
  if (!replace) {
    if (text[end] === " " && (start === 0 || text[start - 1] === " ")) end++;
    else if (text[start - 1] === " " && (end === text.length || /[\s.,;:)]/.test(text[end]))) start--;
  }
  const from = block.pos + 1 + start;
  const to = block.pos + 1 + end;
  const { tr } = editor.state;
  if (replace) tr.insertText(replace, from, to);
  else tr.delete(from, to);
  editor.view.dispatch(tr);
  return true;
}
